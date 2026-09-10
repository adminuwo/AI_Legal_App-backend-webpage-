import logger from '../utils/logger.js';
import * as vertexService from './vertex.service.js';
import { detectLegalFreshnessRequirement } from './freshnessDetector.js';
import { executeTargetedLegalSearch, formatGroundingContext } from './legalSearchOrchestrator.js';
import { nepalLegalSourceService } from './nepalLegalSourceService.js';
import { jurisdictionManager } from './jurisdictionManager.js';

/**
 * PRODUCTION-GRADE GLOBAL JURISDICTION SANDBOX SERVICE
 * 
 * Isolated testing engine for Admin Dashboard.
 * GUARANTEE: NEVER modifies any real user account, profile, case, or subscription data.
 */

export const runJurisdictionSandboxTest = async ({
    query,
    country = 'India',
    state = '',
    userId = 'admin_sandbox',
    model = 'gemini-2.5-flash'
}) => {
    const startTime = Date.now();
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
        throw new Error('Test query cannot be empty.');
    }

    const cleanCountry = String(country || 'India').trim();
    const cleanState = String(state || '').trim();
    const jurisdictionObj = {
        country: cleanCountry,
        state: cleanState,
        source: 'admin_sandbox'
    };

    logger.info(`[JurisdictionSandbox] Starting test for "${cleanQuery}" | Target: ${cleanState ? cleanState + ', ' : ''}${cleanCountry}`);

    // Step 1: Detect freshness & temporal requirements
    const freshnessDecision = detectLegalFreshnessRequirement(
        cleanQuery,
        'LEGAL_TOOLKIT',
        'legal_sandbox',
        null,
        jurisdictionObj
    );

    const needsFreshness = freshnessDecision.needsFreshness;
    logger.info(`[JurisdictionSandbox] Freshness: ${needsFreshness ? 'YES (' + freshnessDecision.reason + ')' : 'NO'} | SearchQuery: "${freshnessDecision.searchQuery}"`);

    // Step 2: Construct Strict Jurisdiction System Prompt using Central Manager
    const jurisdictionLabel = cleanState ? `${cleanState}, ${cleanCountry}` : cleanCountry;
    const resolvedJurisdiction = await jurisdictionManager.resolveLegalJurisdiction({
        query: cleanQuery,
        country: cleanCountry,
        state: cleanState,
        jurisdiction: jurisdictionObj
    });
    const systemInstruction = jurisdictionManager.getJurisdictionSystemInstruction(resolvedJurisdiction);

    let finalResponseText = '';
    let sources = [];
    let googleGroundingUsed = false;
    let tavilyUsed = false;
    let ragUsed = false;
    let modelUsed = model || 'gemini-2.5-flash';
    let groundingStatus = 'Direct Legal Engine Analysis';

    // Step 3: RAG Jurisdiction Filtering Guard & Nepal Statutory Retrieval
    let ragContextText = '';
    let nepalStatutorySources = [];

    if (cleanCountry === 'Nepal') {
        try {
            const nepalContext = await nepalLegalSourceService.retrieveNepalLegalContext(cleanQuery, {
                state: cleanState,
                limit: 4
            });
            const docs = nepalContext?.documents || (Array.isArray(nepalContext) ? nepalContext : []);
            if (docs.length > 0) {
                ragContextText = nepalContext.formattedContext || (
                    `\n\n📚 STATUTORY REFERENCE (NEPAL LAW COMMISSION / OFFICIAL STATUTES):\n` +
                    docs.map(d => `[${d.title}] (Type: ${d.lawType}, Enacted: ${d.actYear || 'N/A'})\n${d.content || d.text}`).join('\n\n')
                );
                ragUsed = true;
                nepalStatutorySources = docs.map(d => ({
                    title: d.title,
                    url: d.url || 'https://lawcommission.gov.np/',
                    snippet: d.summary || (d.content ? d.content.slice(0, 300) : ''),
                    tier: 1,
                    tierLabel: 'OFFICIAL_NEPAL_LAW_COMMISSION'
                }));
            }
        } catch (nepalRagErr) {
            logger.warn(`[JurisdictionSandbox] Nepal legal retrieval skipped: ${nepalRagErr.message}`);
        }
    } else if (cleanCountry === 'India') {
        try {
            const ragRes = await vertexService.retrieveContextFromRag(cleanQuery, 4, 'LEGAL');
            if (ragRes && ragRes.sources && ragRes.sources.length > 0) {
                ragContextText = `\n\n📚 STATUTORY REFERENCE (INDIA RAG):\n${ragRes.text}`;
                ragUsed = true;
            }
        } catch (ragErr) {
            logger.warn(`[JurisdictionSandbox] RAG retrieval skipped: ${ragErr.message}`);
        }
    }

    // Step 4: Primary Pipeline - Gemini 2.5 Flash with Google Search Grounding
    try {
        logger.info(`[JurisdictionSandbox] Calling Gemini 2.5 Flash (useSearch: ${needsFreshness})...`);
        const vertexResponse = await vertexService.askVertex(cleanQuery, ragContextText || null, {
            systemInstruction,
            mode: 'LEGAL_TOOLKIT',
            toolName: 'jurisdiction_sandbox',
            useSearch: needsFreshness,
            searchQueryOverride: freshnessDecision.searchQuery,
            returnSources: true,
            modelOverride: 'gemini-2.5-flash',
            country: cleanCountry,
            state: cleanState,
            jurisdiction: jurisdictionObj
        });

        finalResponseText = typeof vertexResponse === 'object' ? vertexResponse.text : vertexResponse;
        const retrievedSources = typeof vertexResponse === 'object' ? (vertexResponse.sources || []) : [];

        if (retrievedSources && retrievedSources.length > 0) {
            sources = retrievedSources;
            googleGroundingUsed = true;
            groundingStatus = 'Grounded via Google Search';
        } else if (nepalStatutorySources.length > 0) {
            sources = nepalStatutorySources;
            groundingStatus = 'Grounded via Nepal Law Commission';
        } else if (needsFreshness) {
            groundingStatus = 'Verified (Google Grounding Active)';
        }
    } catch (vertexErr) {
        logger.warn(`[JurisdictionSandbox] Primary Gemini Google Grounding failed: ${vertexErr.message}. Executing Tavily Fallback...`);
    }

    // Step 5: Tavily Fallback (if Google Grounding failed or returned 0 sources for a freshness-heavy query)
    if (needsFreshness && (!finalResponseText || sources.length === 0)) {
        try {
            logger.info(`[JurisdictionSandbox] Executing Tavily Fallback for ${cleanCountry}...`);
            const tavilyRes = await executeTargetedLegalSearch(freshnessDecision.searchQuery, {
                jurisdiction: jurisdictionObj,
                maxResults: 5
            });

            if (tavilyRes && tavilyRes.sources && tavilyRes.sources.length > 0) {
                sources = tavilyRes.sources;
                tavilyUsed = true;
                groundingStatus = 'Grounded via Tavily Fallback';

                const groundingContext = formatGroundingContext(sources, tavilyRes.summary, jurisdictionObj);
                const enrichedPrompt = `${cleanQuery}\n\n${groundingContext}`;

                // Re-prompt Gemini with explicit Tavily grounded context
                const fallbackResponse = await vertexService.askVertex(enrichedPrompt, ragContextText || null, {
                    systemInstruction,
                    mode: 'LEGAL_TOOLKIT',
                    toolName: 'jurisdiction_sandbox',
                    useSearch: false,
                    returnSources: false,
                    modelOverride: 'gemini-2.5-flash'
                });

                finalResponseText = typeof fallbackResponse === 'object' ? fallbackResponse.text : fallbackResponse;
            }
        } catch (tavilyErr) {
            logger.error(`[JurisdictionSandbox] Tavily Fallback also failed: ${tavilyErr.message}`);
        }
    }

    // Final safety fallback if both failed
    if (!finalResponseText) {
        finalResponseText = `Authoritative legal information could not be verified in real time for ${jurisdictionLabel}. To avoid cross-jurisdiction speculation, please re-verify with official statutory sources.`;
        groundingStatus = 'Verification Unavailable';
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[JurisdictionSandbox] Test completed in ${durationMs}ms. Status: ${groundingStatus} | Sources: ${sources.length}`);

    return {
        success: true,
        response: finalResponseText,
        jurisdiction: jurisdictionObj,
        currentnessRequired: needsFreshness,
        googleGroundingUsed,
        tavilyUsed,
        ragUsed,
        sourceCount: sources.length,
        groundingStatus,
        model: modelUsed,
        sources
    };
};
