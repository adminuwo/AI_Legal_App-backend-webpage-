import Precedent from '../../../models/Precedent.js';
import * as vertexService from '../../../services/vertex.service.js';
import { performSearch } from '../../../services/webSearch.service.js';
import logger from '../../../utils/logger.js';
import { safeParseLLMJson } from '../../../utils/jsonUtils.js';

// Simple in-memory cache for search queries
const searchCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * findPrecedents
 * Main entry point for finding precedents.
 * Supports Dual Mode: MANUAL if userQuery exists, else CURRENT CASE.
 */
export const findPrecedents = async (userQuery, caseContext = null, language = 'English') => {
    const isManualMode = !!userQuery;
    const modeLabel = isManualMode ? "Manual Search Mode" : "Using Current Case";

    logger.info(`[Precedents] Mode: ${modeLabel}`);

    // Check cache
    const cacheKey = isManualMode ? `manual:${userQuery}:${language}` : `case:${caseContext?._id || 'unknown'}:${language}`;
    if (searchCache.has(cacheKey)) {
        const cached = searchCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            logger.info(`[Precedents] Cache HIT for: ${cacheKey}`);
            return cached.data;
        }
    }

    let searchQuery = userQuery;
    let metadata = {
        caseType: isManualMode ? 'General' : (caseContext?.caseType || 'General'),
        primaryIssues: isManualMode ? [userQuery] : (caseContext?.legalIssues || []),
        legalSections: [],
        keywords: isManualMode ? [userQuery] : []
    };
    let searchQueries = [];

    // Step 1 & 2 & 3: Read Current Case, AI Legal Understanding, and Query Generation
    if (!isManualMode && caseContext) {
        try {
            const analysisResult = await analyzeCaseAndGenerateQueries(caseContext);
            metadata = analysisResult.metadata || metadata;
            searchQueries = analysisResult.searchQueries || [];
            
            logger.info(`[Precedents] Extracted Metadata: ${JSON.stringify(metadata)}`);
            logger.info(`[Precedents] Generated Search Queries: ${JSON.stringify(searchQueries)}`);
        } catch (err) {
            logger.warn(`[Precedents] Case analysis and query generation failed: ${err.message}`);
        }
    }

    // Fallback search query if none generated
    if (searchQueries.length === 0) {
        if (searchQuery) {
            searchQueries = [searchQuery];
        } else if (caseContext) {
            const fallbackQuery = `${caseContext.caseType || ''} ${caseContext.legalIssues?.join(' ') || ''} ${(caseContext.summary || '').split('.')[0]}`.trim();
            searchQueries = [fallbackQuery || "Supreme Court landmark judgments"];
        } else {
            searchQueries = ["Supreme Court landmark judgments"];
        }
    }

    // Step 4: Search internal DB first to avoid heavy web search latency
    const internalResults = await searchInternalDB(searchQueries, metadata);
    let externalResults = [];
    
    // Deduplicate internal results first to see if we have sufficient local data
    let uniqueInternal = deduplicateCandidates(internalResults);
    
    if (uniqueInternal.length < 3) {
        logger.info(`[Precedents] Internal DB returned only ${uniqueInternal.length} candidates. Fetching external live database...`);
        externalResults = await searchExternal(searchQueries);
    } else {
        logger.info(`[Precedents] Internal DB returned sufficient candidates (${uniqueInternal.length}). Skipping external search for fast loading.`);
    }

    const candidates = [...internalResults, ...externalResults];

    // Deduplicate candidates
    let uniqueCandidates = deduplicateCandidates(candidates);

    // Step 6: Empty State Retry Strategy
    if (uniqueCandidates.length === 0) {
        logger.info(`[Precedents] 0 candidates found. Triggering AI expansion and retry...`);
        try {
            const expandedQueries = await generateExpandedQueries(metadata);
            logger.info(`[Precedents] Expanded Retry Queries: ${JSON.stringify(expandedQueries)}`);

            const internalRetry = await searchInternalDB(expandedQueries, metadata);
            let externalRetry = [];
            
            const uniqueInternalRetry = deduplicateCandidates(internalRetry);
            if (uniqueInternalRetry.length < 3) {
                externalRetry = await searchExternal(expandedQueries);
            }

            const retryCandidates = [...internalRetry, ...externalRetry];
            uniqueCandidates = deduplicateCandidates(retryCandidates);

            if (uniqueCandidates.length > 0) {
                logger.info(`[Precedents] Retry succeeded. Found ${uniqueCandidates.length} unique candidates.`);
            }
        } catch (retryErr) {
            logger.error(`[Precedents] Retry strategy failed: ${retryErr.message}`);
        }
    }

    // Step 5: Semantic Ranking (Weighted Scoring)
    const rankedCandidates = rankPrecedents(uniqueCandidates, metadata, isManualMode ? null : caseContext);

    // Process Top 5 with AI for structured data matching Result Card requirements
    const topCandidates = rankedCandidates.slice(0, 5);
    
    let processedPrecedents = [];
    if (topCandidates.length > 0) {
        try {
            processedPrecedents = await processPrecedentsBatchWithAI(topCandidates, isManualMode ? null : caseContext, language);
        } catch (batchErr) {
            logger.warn(`[Precedents] Batch AI processing failed, falling back to individual: ${batchErr.message}`);
            processedPrecedents = await Promise.all(
                topCandidates.map(async (c) => await processPrecedentWithAI(c, isManualMode ? null : caseContext, language))
            );
        }
    }

    const finalPrecedentsList = processedPrecedents.filter(p => p !== null);

    // Sort again by relevance score generated or calculated
    finalPrecedentsList.sort((a, b) => {
        const scoreA = a.similarity?.relevance_score || a.relevance_score || 0;
        const scoreB = b.similarity?.relevance_score || b.relevance_score || 0;
        return scoreB - scoreA;
    });

    const resultPayload = {
        mode: modeLabel,
        precedents: finalPrecedentsList,
        query: searchQueries[0] || searchQuery,
        metadata
    };

    // Cache the result
    searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data: resultPayload
    });

    return resultPayload;
};

/**
 * Deduplicates candidate judgments based on ID, Name, and Citation
 */
const deduplicateCandidates = (candidates) => {
    const seenIds = new Set();
    const seenCitations = new Set();
    const seenNames = new Set();
    const unique = [];

    for (const c of candidates) {
        const idStr = c._id ? c._id.toString() : null;
        const nameKey = (c.case_name || '').toLowerCase().trim();
        const citationKey = (c.citation || '').toLowerCase().trim();
        
        const isDuplicate = 
            (idStr && seenIds.has(idStr)) ||
            (citationKey && citationKey !== 'citation unavailable' && seenCitations.has(citationKey)) ||
            (nameKey && seenNames.has(nameKey));
            
        if (!isDuplicate) {
            unique.push(c);
            if (idStr) seenIds.add(idStr);
            if (citationKey && citationKey !== 'citation unavailable') seenCitations.add(citationKey);
            if (nameKey) seenNames.add(nameKey);
        }
    }
    return unique;
};

/**
 * Step 1, 2 & 3: Analyze case context and generate structured metadata + search queries in one call
 */
const analyzeCaseAndGenerateQueries = async (context) => {
    const name = context.name || '';
    const type = context.caseType || '';
    const issues = context.legalIssues && context.legalIssues.length > 0 ? context.legalIssues.join(', ') : '';
    const summary = context.summary || context.caseSummary || '';
    const factsText = context.facts && context.facts.length > 0 
        ? context.facts.map(f => f.description || f.event || '').join(' ') 
        : '';
    const relief = context.reliefGoals || '';

    const prompt = `
    You are an expert Indian Legal Advisor & Research Query Generator.
    Analyze the following case details:
    Case Name: ${name}
    Case Type: ${type}
    Legal Issues: ${issues}
    Relief Sought: ${relief}
    Facts/Summary: ${summary} ${factsText}

    Your goal is to:
    1. Understand what this case is actually about and generate structured metadata.
    2. Generate 5 to 10 optimized, intelligent search queries for retrieving landmark court judgments.
       Instead of names, use specific combinations of Sections, court names, and legal concepts.
       Example: "cheating property dispute Supreme Court IPC 420 dishonest intention"

    Return ONLY a valid JSON object matching this schema (do not wrap in markdown or include extra text):
    {
      "metadata": {
        "caseType": "Criminal or Civil or Family etc.",
        "primaryIssues": ["issue1", "issue2", "issue3"],
        "legalSections": ["IPC 420", "IPC 406", "Section 138 NI Act" etc.],
        "keywords": ["keyword1", "keyword2", "keyword3"]
      },
      "searchQueries": [
        "Supreme Court cheating breach of contract IPC 420 dishonest intention",
        "Section 420 landmark judgments",
        "Criminal breach of trust Supreme Court",
        "IPC 406 420 precedent",
        "Fraudulent inducement landmark case"
      ]
    }
    `;

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            isJson: true,
            modelOverride: 'gemini-2.5-flash',
            temperature: 0.1
        });

        return safeParseLLMJson(response, { metadata: null, searchQueries: [] });
    } catch (err) {
        logger.error(`[Precedents] analyzeCaseAndGenerateQueries failed: ${err.message}`);
        throw err;
    }
};

/**
 * Step 6: Expand queries for retry when 0 results are retrieved
 */
const generateExpandedQueries = async (metadata) => {
    try {
        const prompt = `
        You are a legal research query expansion system.
        Analyze the following case metadata and generate 3 expanded, high-level legal search queries.
        Use synonym legal terms, wider concepts, related acts, and search for major landmark judgments.
        Return ONLY a JSON array of 3 queries. No other text.
        
        METADATA:
        Case Type: ${metadata.caseType}
        Primary Issues: ${(metadata.primaryIssues || []).join(', ')}
        Legal Sections: ${(metadata.legalSections || []).join(', ')}
        Keywords: ${(metadata.keywords || []).join(', ')}
        `;
        
        const response = await vertexService.AskVertexRaw(prompt, {
            isJson: true,
            modelOverride: 'gemini-2.5-flash',
            temperature: 0.3
        });
        
        return safeParseLLMJson(response, ["Supreme Court landmark judgments"]);
    } catch (err) {
        logger.error(`[Precedents] Query expansion failed: ${err.message}`);
        return ["Supreme Court landmark judgments"];
    }
};

/**
 * searchInternalDB
 * Searches local MongoDB precedents database using text indexes and regex fallback
 */
const searchInternalDB = async (queries, metadata) => {
    try {
        const resultsMap = new Map();
        
        // 1. Text search for top queries in parallel
        await Promise.all(queries.slice(0, 3).map(async (q) => {
            try {
                const cases = await Precedent.find(
                    { $text: { $search: q } },
                    { score: { $meta: "textScore" } }
                ).sort({ score: { $meta: "textScore" } }).limit(5);
                
                cases.forEach(c => {
                    resultsMap.set(c._id.toString(), {
                        ...c.toObject(),
                        source: 'Internal'
                    });
                });
            } catch (err) {
                logger.warn(`[Precedents] Internal DB text search failed for query "${q}": ${err.message}`);
            }
        }));
        
        // 2. Fallback / supplementary regex search for legal sections or keywords
        const regexConditions = [];
        if (metadata.legalSections && metadata.legalSections.length > 0) {
            metadata.legalSections.forEach(sec => {
                regexConditions.push({ text: { $regex: sec, $options: 'i' } });
                regexConditions.push({ citation: { $regex: sec, $options: 'i' } });
            });
        }
        if (metadata.primaryIssues && metadata.primaryIssues.length > 0) {
            metadata.primaryIssues.forEach(issue => {
                regexConditions.push({ text: { $regex: issue, $options: 'i' } });
            });
        }
        
        if (regexConditions.length > 0 && resultsMap.size < 10) {
            const regexCases = await Precedent.find({
                $or: regexConditions
            }).limit(10);
            
            regexCases.forEach(c => {
                resultsMap.set(c._id.toString(), {
                    ...c.toObject(),
                    source: 'Internal'
                });
            });
        }
        
        return Array.from(resultsMap.values());
    } catch (error) {
        logger.error(`[Precedents] Internal DB search failed: ${error.message}`);
        return [];
    }
};

/**
 * searchExternal
 * Scrapes/indexes external Indian judgments via Gemini Web Search grounding in parallel
 */
const searchExternal = async (queries) => {
    try {
        logger.info(`[Precedents] Searching external for queries: ${queries.slice(0, 3).join(', ')}`);
        
        const searchResults = await Promise.all(queries.slice(0, 3).map(async (q) => {
            try {
                const res = await performSearch(`Find landmark legal judgements, case laws, and precedents related to: "${q}". Focus on Supreme Court and High Court cases with complete citations (AIR, SCC, etc.) and brief reasoning.`, 'English');
                return res?.summary || '';
            } catch (err) {
                logger.error(`[Precedents] External search failed for query "${q}": ${err.message}`);
                return '';
            }
        }));
        
        const combinedSummary = searchResults.filter(Boolean).join('\n\n');
        if (!combinedSummary.trim()) return [];
        
        // Parse combined external summary into structured candidate objects
        const extractionPrompt = `
        You are a Legal Judgment Extractor.
        Extract a list of 5-10 landmark court cases/judgments from the following text summaries.
        Return ONLY a valid JSON object with a single key "cases" containing the array of judgments.
        Each object in the "cases" array MUST have: case_name, court, year, citation, text (a detailed description of the case facts, issues, and judgment).
        
        TEXT SUMMARIES:
        ${combinedSummary}
        `;
        
        const extractionResponse = await vertexService.AskVertexRaw(extractionPrompt, {
            isJson: true,
            modelOverride: 'gemini-2.5-flash',
            temperature: 0
        });
        
        const parsed = safeParseLLMJson(extractionResponse, { cases: [] });
        const extractedCases = Array.isArray(parsed?.cases) ? parsed.cases : (Array.isArray(parsed) ? parsed : []);
        logger.info(`[Precedents] Extracted ${extractedCases.length} external cases from search summaries.`);
        
        const savedCases = [];
        for (const c of extractedCases) {
            if (!c.case_name) continue;
            try {
                // Check if already exists in DB by citation (case-insensitive) or case name
                let dbCase = null;
                if (c.citation && c.citation !== "Citation unavailable") {
                    dbCase = await Precedent.findOne({
                        citation: { $regex: new RegExp(`^${c.citation.trim()}$`, 'i') }
                    });
                }
                
                if (!dbCase && c.case_name) {
                    dbCase = await Precedent.findOne({
                        case_name: { $regex: new RegExp(`^${c.case_name.trim()}$`, 'i') }
                    });
                }
                
                if (!dbCase) {
                    dbCase = await Precedent.create({
                        case_name: c.case_name,
                        court: c.court || 'Supreme Court',
                        year: parseInt(c.year) || 2025,
                        citation: c.citation || 'Citation unavailable',
                        text: c.text || c.facts || c.reasoning || '',
                        tags: c.area ? [c.area] : []
                    });
                }
                
                savedCases.push({
                    ...dbCase.toObject(),
                    source: 'API'
                });
            } catch (saveErr) {
                logger.error(`[Precedents] Failed to cache external case to DB: ${saveErr.message}`);
                savedCases.push({ ...c, source: 'API' });
            }
        }
        return savedCases;
    } catch (error) {
        logger.error(`[Precedents] External search failed: ${error.message}`);
        return [];
    }
};

/**
 * Step 5: Semantic Ranking using custom weights
 * Weights:
 * - Legal Sections -> 30%
 * - Facts Similarity -> 30%
 * - Issue Similarity -> 20%
 * - Court Hierarchy -> 10%
 * - Recency -> 5%
 * - Citation Frequency -> 5%
 */
const rankPrecedents = (precedents, metadata, activeCase) => {
    return precedents.map(p => {
        let score = 0;
        const pText = `${p.case_name} ${p.text || ''} ${p.tags ? p.tags.join(' ') : ''}`.toLowerCase();
        
        // 1. Legal Sections (30%)
        let sectionsScore = 0;
        if (metadata.legalSections && metadata.legalSections.length > 0) {
            let matchedSections = 0;
            metadata.legalSections.forEach(sec => {
                const cleanSec = sec.replace(/[^0-9]/g, ''); // Extract numbers like 420
                if (cleanSec && pText.includes(cleanSec)) {
                    matchedSections++;
                } else if (pText.includes(sec.toLowerCase())) {
                    matchedSections++;
                }
            });
            sectionsScore = (matchedSections / metadata.legalSections.length) * 30;
        }
        score += sectionsScore;

        // 2. Facts Similarity (30%)
        let factsScore = 0;
        const activeFactsText = activeCase ? `${activeCase.summary || ''} ${activeCase.name || ''}`.toLowerCase() : '';
        if (activeFactsText) {
            const stopWords = new Set(['the', 'and', 'a', 'of', 'to', 'in', 'is', 'for', 'on', 'that', 'by', 'this', 'with', 'against']);
            const activeWords = activeFactsText.split(/[^a-zA-Z0-9]/).filter(w => w.length > 3 && !stopWords.has(w));
            let matches = 0;
            const uniqueWords = new Set(activeWords);
            uniqueWords.forEach(word => {
                if (pText.includes(word)) {
                    matches++;
                }
            });
            factsScore = Math.min(30, (matches / Math.max(1, uniqueWords.size)) * 30);
        }
        score += factsScore;

        // 3. Issue Similarity (20%)
        let issueScore = 0;
        if (metadata.primaryIssues && metadata.primaryIssues.length > 0) {
            let matchedIssues = 0;
            metadata.primaryIssues.forEach(issue => {
                if (pText.includes(issue.toLowerCase())) {
                    matchedIssues++;
                }
            });
            issueScore = (matchedIssues / metadata.primaryIssues.length) * 20;
        }
        score += issueScore;

        // 4. Court Hierarchy (10%)
        let courtScore = 3; // District / default
        const courtName = (p.court || '').toLowerCase();
        if (courtName.includes('supreme')) {
            courtScore = 10;
        } else if (courtName.includes('high')) {
            courtScore = 7;
        }
        score += courtScore;

        // 5. Recency (5%)
        let recencyScore = 0;
        const currentYear = new Date().getFullYear();
        if (p.year && p.year > 1950) {
            const ratio = (p.year - 1950) / (currentYear - 1950);
            recencyScore = Math.max(0, Math.min(5, ratio * 5));
        }
        score += recencyScore;

        // 6. Citation Frequency (5%)
        let citationScore = 0;
        const citation = (p.citation || '').toLowerCase();
        const citationIndicators = ['air', 'scc', 'scr', 'scale', 'jt', 'crilj', 'ald', 'bomcr', 'dlc'];
        if (citation && citation !== 'citation unavailable') {
            if (citationIndicators.some(ind => citation.includes(ind))) {
                citationScore = 5;
            } else {
                citationScore = 3;
            }
        }
        score += citationScore;

        const finalScore = Math.round(score);
        return {
            ...p,
            relevance_score: finalScore,
            rankScore: finalScore
        };
    }).sort((a, b) => b.rankScore - a.rankScore);
};

/**
 * processPrecedentWithAI
 * Fallback to process a single precedent using AI
 */
export const processPrecedentWithAI = async (caseData, context = null, language = 'English') => {
    if (!context && caseData.ai_analysis) {
        logger.info(`[Precedents] Cache HIT (Individual) for: ${caseData.case_name}`);
        return {
            ...caseData.ai_analysis,
            relevance_score: caseData.relevance_score || 95,
            similarity: { relevance_score: caseData.relevance_score || 95, matching_factors: ["Pre-analyzed landmark case"] }
        };
    }

    const isHindi = language === 'Hindi' || language === 'hi';
    const langRule = isHindi
        ? "\n\n### MANDATORY LANGUAGE RULE:\n- Generate ALL text in HINDI.\n- Use 'Simple Hindi + English term in brackets' for all legal concepts.\n- Maintain professional legal tone."
        : `\n\n### MANDATORY LANGUAGE RULE:\n- Respond entirely in ${language}.`;

    const prompt = `
    You are a Senior Legal Research Intelligence System. 
    Analyze the following case law and provide a complete, structured landmark judgment report.
    ${langRule}
    
    CASE DATA:
    Name: ${caseData.case_name}
    Citation: ${caseData.citation}
    Court: ${caseData.court}
    Year: ${caseData.year}
    Text: ${caseData.text}
    
    ${context ? `CONTEXT OF MY CURRENT CASE:
    Summary: ${context.summary || context.caseSummary}
    Issues: ${context.legalIssues ? context.legalIssues.join(', ') : 'N/A'}` : ''}

    REQUIRED JSON FORMAT (STRICT):
    {
        "case_identity": {
            "case_name": "...",
            "court": "...",
            "year": "...",
            "citation": "...",
            "bench": "...",
            "district": "...",
            "area": "..."
        },
        "case_context": {
            "facts": "Short & clear key facts",
            "legal_issue": "The specific question decided"
        },
        "judgment_outcome": {
            "final_decision": "Who won and what was the result",
            "type": "Allowed / Dismissed / Partially Allowed / etc."
        },
        "judgment_basis": {
            "legal_reasoning": "Detailed logic for the decision",
            "principles_applied": ["e.g., Natural Justice", "Contractual Obligation"],
            "relevant_laws": ["e.g., Article 21", "Section 138 of NI Act"]
        },
        "landmark_value": {
            "importance": "Why this case is a landmark",
            "precedent_status": "Whether it set a new precedent or followed one",
            "impact": "How it affects future cases"
        },
        "similarity": {
            "relevance_score": ${caseData.relevance_score || 80},
            "matching_factors": ["Fact matching", "Law matching", "Issue matching"]
        },
        "one_line_summary": "A concise one-line summary of the judgment.",
        "legal_principle": "The ratio decidendi or primary legal rule established.",
        "applicable_sections": ["IPC 420", "Section 138 NI Act"],
        "key_takeaways": [
            "3-5 bullet insights from the judgment"
        ],
        "tags": ["Tag1", "Tag2"]
    }
    `;

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            modelOverride: 'gemini-2.5-flash',
            temperature: 0.1,
            isJson: true
        });

        const parsed = safeParseLLMJson(response);
        
        // Cache the result back to DB
        if (parsed && caseData._id) {
            const cacheData = { ...parsed };
            delete cacheData.similarity;
            Precedent.findByIdAndUpdate(caseData._id, { $set: { ai_analysis: cacheData } })
                .catch(err => logger.error(`[Precedents] Failed to cache ai_analysis: ${err.message}`));
        }

        return parsed;
    } catch (error) {
        logger.error(`[Precedents] AI processing failed for ${caseData.case_name}: ${error.message}`);
        return null;
    }
};

/**
 * processPrecedentsBatchWithAI
 * Packages all candidate cases into a single Gemini 2.5 Flash request.
 */
export const processPrecedentsBatchWithAI = async (candidates, context = null, language = 'English') => {
    if (!candidates || candidates.length === 0) return [];

    const isHindi = language === 'Hindi' || language === 'hi';
    const langRule = isHindi
        ? "\n\n### MANDATORY LANGUAGE RULE:\n- Generate ALL text in HINDI.\n- Use 'Simple Hindi + English term in brackets' for all legal concepts.\n- Maintain professional legal tone."
        : `\n\n### MANDATORY LANGUAGE RULE:\n- Respond entirely in ${language}.`;

    const candidatesDataString = candidates.map((c, index) => {
        const candText = c.ai_analysis 
            ? `Facts: ${c.ai_analysis.case_context?.facts || ''}\nReasoning: ${c.ai_analysis.judgment_basis?.legal_reasoning || ''}` 
            : (c.text || c.facts || c.reasoning || '');
            
        return `
    CANDIDATE ${index + 1}:
    ID: ${c._id || index}
    Name: ${c.case_name}
    Citation: ${c.citation}
    Court: ${c.court}
    Year: ${c.year}
    InitialRelevance: ${c.relevance_score || 50}
    Text: ${candText}
    `;
    }).join('\n---\n');

    const prompt = `
    You are a Senior Legal Research Intelligence System. 
    Analyze the following case laws and provide a complete, structured landmark judgment report for each candidate case.
    ${langRule}
    
    CANDIDATE CASES:
    ${candidatesDataString}
    
    ${context ? `CONTEXT OF MY CURRENT CASE:
    Summary: ${context.summary || context.caseSummary}
    Issues: ${context.legalIssues ? context.legalIssues.join(', ') : 'N/A'}` : ''}

    REQUIRED JSON FORMAT (STRICT):
    Return ONLY a JSON array containing objects. Each object MUST correspond to a candidate case and have this exact structure:
    [
      {
        "id": "ID of the candidate case (match the ID from candidate data above)",
        "case_identity": {
            "case_name": "...",
            "court": "...",
            "year": "...",
            "citation": "...",
            "bench": "...",
            "district": "...",
            "area": "..."
        },
        "case_context": {
            "facts": "Short & clear key facts",
            "legal_issue": "The specific question decided"
        },
        "judgment_outcome": {
            "final_decision": "Who won and what was the result",
            "type": "Allowed / Dismissed / Partially Allowed / etc."
        },
        "judgment_basis": {
            "legal_reasoning": "Detailed logic for the decision",
            "principles_applied": ["e.g., Natural Justice", "Contractual Obligation"],
            "relevant_laws": ["e.g., Article 21", "Section 138 of NI Act"]
        },
        "landmark_value": {
            "importance": "Why this case is a landmark",
            "precedent_status": "Whether it set a new precedent or followed one",
            "impact": "How it affects future cases"
        },
        "similarity": {
            "relevance_score": 0-100, // Re-evaluate relevance score based on Facts, Sections, Issues, Court, and Context
            "matching_factors": ["Fact matching", "Law matching", "Issue matching"]
        },
        "one_line_summary": "A concise one-line summary of the judgment.",
        "legal_principle": "The ratio decidendi or primary legal rule established.",
        "applicable_sections": ["IPC 420", "Section 138 NI Act"],
        "key_takeaways": [
            "3-5 bullet insights from the judgment"
        ],
        "tags": ["Tag1", "Tag2"]
      }
    ]

    RULES:
    - Return ONLY the raw JSON array. Do not wrap in markdown or explanation.
    - If my current case context is provided, explain the similarity precisely and refine the relevance_score.
    - DO NOT hallucinate citations.
    `;

    try {
        logger.info(`[Precedents] Starting batch AI processing for ${candidates.length} candidates.`);
        const response = await vertexService.AskVertexRaw(prompt, {
            modelOverride: 'gemini-2.5-flash',
            temperature: 0.1,
            isJson: true,
            maxOutputTokens: 8192
        });

        const results = safeParseLLMJson(response, []);
        
        const processed = candidates.map((cand, idx) => {
            const matchId = cand._id ? cand._id.toString() : idx.toString();
            let matchedObj = results.find(r => r.id && r.id.toString() === matchId);
            if (!matchedObj && results[idx]) {
                matchedObj = results[idx];
            }

            if (!matchedObj) {
                logger.warn(`[Precedents] No batch AI results matched candidate ${cand.case_name}. Fallback to raw candidate info.`);
                matchedObj = cand.ai_analysis || {
                    case_identity: cand.case_identity || {
                        case_name: cand.case_name,
                        court: cand.court,
                        year: cand.year,
                        citation: cand.citation
                    },
                    case_context: cand.case_context || {
                        facts: cand.facts || cand.summary || cand.text?.substring(0, 300) || ''
                    },
                    one_line_summary: cand.one_line_summary || cand.summary || cand.text?.substring(0, 100) || '',
                    legal_principle: cand.legal_principle || cand.ratio_decidendi || 'Refer to full report.',
                    applicable_sections: cand.applicable_sections || cand.tags || []
                };
            }

            const finalObj = {
                ...cand,
                ...matchedObj,
                case_identity: {
                    case_name: cand.case_name || matchedObj.case_identity?.case_name || '',
                    court: cand.court || matchedObj.case_identity?.court || '',
                    year: cand.year || matchedObj.case_identity?.year || '',
                    citation: cand.citation || matchedObj.case_identity?.citation || '',
                    ...matchedObj.case_identity
                },
                _id: cand._id || null,
                relevance_score: matchedObj.similarity?.relevance_score || matchedObj.relevance_score || cand.relevance_score || 50,
                source: cand.source || 'API'
            };

            // Cache the base AI analysis in MongoDB
            if (cand._id) {
                const cacheData = { ...matchedObj };
                delete cacheData.id;
                delete cacheData.similarity;
                
                Precedent.findByIdAndUpdate(cand._id, { $set: { ai_analysis: cacheData } })
                    .catch(err => logger.error(`[Precedents] Failed to cache ai_analysis: ${err.message}`));
            }

            return finalObj;
        }).filter(Boolean);

        return processed;
    } catch (error) {
        logger.error(`[Precedents] Batch AI processing failed: ${error.message}`);
        throw error;
    }
};

/**
 * analyzePrecedent
 * Performs specific AI tasks like Summarization, Comparison, or full Intelligence Report.
 */
export const analyzePrecedent = async (actionType, precedentData, activeCaseData = null, language = 'English') => {
    const isHindi = language === 'Hindi' || language === 'hi';
    const langRule = isHindi
        ? "\n\n### MANDATORY LANGUAGE RULE:\n- Generate ALL text in HINDI.\n- Use professional legal Hindi terminology.\n- Maintain high formal tone."
        : `\n\n### MANDATORY LANGUAGE RULE:\n- Respond entirely in ${language}.`;

    let prompt = "";

    if (actionType === 'intelligence_report') {
        prompt = `
        You are a Senior Legal Analyst and Supreme Court Advocate.
        Generate a comprehensive, professional, and detailed Intelligence Report for the following landmark precedent judgment.
        ${langRule}

        PRECEDENT DATA:
        Case Name: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Court: ${precedentData.case_identity?.court || precedentData.court}
        Year: ${precedentData.case_identity?.year || precedentData.year}
        Citation: ${precedentData.case_identity?.citation || precedentData.citation}
        Facts: ${precedentData.case_context?.facts || precedentData.facts || precedentData.text}
        Reasoning: ${precedentData.judgment_basis?.legal_reasoning || precedentData.reasoning}
        Outcome: ${precedentData.judgment_outcome?.final_decision || precedentData.decision}
        
        ${activeCaseData ? `ACTIVE CASE CONTEXT:
        Summary/Facts: ${activeCaseData.summary || activeCaseData.caseSummary || ''}
        Issues: ${(activeCaseData.legalIssues || []).join(', ')}` : ''}

        FORMAT YOUR RESPONSE WITH THE FOLLOWING 13 MANDATORY MARKDOWN SECTIONS:
        
        ### 📄 1. Case Facts
        (Detailed facts of the precedent)

        ### 🎯 2. Core Legal Issue
        (The primary legal questions/controversies decided by the court)

        ### 🏛️ 3. Court Reasoning
        (Detailed analysis of the court's intellectual logic and statutory interpretation)

        ### ⚖️ 4. Ratio Decidendi
        (The core legal principle and binding rule established by this judgment)

        ### 💡 5. Strategic Takeaways
        (Key strategic takeaways for a lawyer handling similar cases)

        ### 📖 6. Landmark Principle
        (What makes this case a landmark decision in Indian jurisprudence)

        ### 📜 7. Relevant Sections
        (All relevant statutory sections, e.g., IPC, NI Act, CrPC, applied in the case)

        ### 🤝 8. Similarity with Current Case
        (Detailed similarity analysis comparing facts, issues, and sections. If no active case is provided, analyze typical similarities with similar disputes.)

        ### 🌟 9. Why This Judgment Matters
        (Why this judgment is crucial and its significance)

        ### 📅 10. When to Use This Judgment
        (Specific legal scenarios and conditions under which a lawyer should cite this case)

        ### 📝 11. Practical Lawyer Notes
        (Insider courtroom tips, draft suggestions, and advocacy insights)

        ### 💬 12. Important Quotations
        (Direct quotations from the judges that are highly persuasive in court)

        ### 🏷️ 13. Citation
        (Full official citation and bench size details)
        `;
    } else if (actionType === 'compare') {
        prompt = `
        You are a Senior Legal Strategy Expert. Compare the "Landmark Precedent" with my "Active Case" to evaluate match strength and courtroom arguments.
        ${langRule}

        LANDMARK PRECEDENT:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Facts: ${precedentData.case_context?.facts || precedentData.facts}
        Decision: ${precedentData.judgment_outcome?.final_decision || precedentData.decision}
        Ratio/Principle: ${precedentData.judgment_basis?.principles_applied?.join(', ') || precedentData.ratio_decidendi}

        MY ACTIVE CASE:
        Type: ${activeCaseData?.caseType || 'N/A'}
        Facts: ${activeCaseData?.summary || activeCaseData?.caseSummary || activeCaseData?.facts || 'N/A'}
        Issues: ${activeCaseData?.legalIssues?.join(', ') || 'N/A'}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN with clear subheadings):
        ### 🤝 Common Facts
        - Detail all facts and circumstances that match.

        ### 🔄 Different Facts
        - Detail facts and circumstances that differ.

        ### 📖 Applicable Principles
        - Show which legal principles from the precedent apply to our active case.

        ### ⚡ Strength of Match
        - Explain the strength of match as a percentage (e.g. 85%) and why.

        ### 📣 Possible Arguments
        - Compelling arguments we can construct using this case.

        ### ⚠️ Possible Weaknesses
        - Weaknesses or distinction points the other side could raise.

        ### ⚖️ Party Support
        - Conclude if this precedent supports: Plaintiff, Defendant, Both, or Neither, and state the reasoning.
        `;
    } else if (actionType === 'summarize') {
        prompt = `
        You are a Senior Legal Counsel. Provide a "Master Summary" of the following legal judgment.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Reasoning: ${precedentData.judgment_basis?.legal_reasoning || precedentData.reasoning}
        Outcome: ${precedentData.judgment_outcome?.final_decision || precedentData.decision}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### ⚖️ Judgment Overview
        (Provide a 2-sentence high-level overview)

        ### 🔍 Critical Findings
        - Bullet points of the most important findings of the court.
        
        ### 📖 Legal Principle (Ratio Decidendi)
        - Clear statement of the law established.

        ### 🏛️ Conclusion & Impact
        - Final result and why it matters to the legal field.
        `;
    } else if (actionType === 'explain') {
        prompt = `
        You are a Legal educator. Explain the following legal judgment in simple, clear, and comprehensive terms.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Facts: ${precedentData.case_context?.facts || precedentData.facts}
        Reasoning: ${precedentData.judgment_basis?.legal_reasoning || precedentData.reasoning}
        Outcome: ${precedentData.judgment_outcome?.final_decision || precedentData.decision}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### ⚖️ Simple Explanation
        - Explain in plain terms what this case is about and what was decided.
        
        ### 🔍 Why it Matters
        - Break down the core legal reasoning in everyday language.
        
        ### 📖 Key Takeaways
        - Plain-language summary of what we can learn from this judgment.
        `;
    } else if (actionType === 'arguments') {
        prompt = `
        You are a Trial Advocate. Generate compelling legal arguments for court based on the following precedent, considering my active case context if available.
        ${langRule}

        LANDMARK PRECEDENT:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Citation: ${precedentData.case_identity?.citation || precedentData.citation}
        Principle: ${precedentData.judgment_basis?.principles_applied?.join(', ') || precedentData.ratio_decidendi}
        Reasoning: ${precedentData.judgment_basis?.legal_reasoning || precedentData.reasoning}

        MY ACTIVE CASE (IF AVAILABLE):
        Type: ${activeCaseData?.caseType || 'N/A'}
        Facts: ${activeCaseData?.summary || activeCaseData?.caseSummary || activeCaseData?.facts || 'N/A'}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### 📣 Primary Argument Point
        - State the main argument point citing this precedent.
        
        ### 🏛️ Courtroom Presentation / Script
        - Write a professional courtroom statement quoting the precedent.
        
        ### 🛡️ Anticipated Rebuttal
        - Prepare for how the other side might respond and how to counter it.
        `;
    } else if (actionType === 'court_notes') {
        prompt = `
        You are a Court Clerk and Legal Advisor. Generate a structured set of "Courtroom Briefing Notes" based on this precedent.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Citation: ${precedentData.case_identity?.citation || precedentData.citation}
        Court & Bench: ${precedentData.case_identity?.court || precedentData.court} (Bench: ${precedentData.case_identity?.bench || 'N/A'})
        Core Issues: ${precedentData.case_context?.legal_issue || precedentData.issue}
        Ratio Decidendi: ${precedentData.judgment_basis?.principles_applied?.join(', ') || precedentData.ratio_decidendi}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### 📝 Quick Citation Reference
        - Official Citation, Court, Year, and Bench composition.
        
        ### 🎯 Core Legal Question Decided
        - The absolute crux of the law addressed.
        
        ### 📌 Key Citations/Quotations to Read Out
        - Specific quotes or observations suitable for reading aloud in front of the judge.
        `;
    } else if (actionType === 'extract_sections') {
        prompt = `
        You are a Statutory Analyst. Analyze the following precedent and extract all applicable sections, acts, and statutory rules.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Relevant Laws mentioned: ${precedentData.judgment_basis?.relevant_laws?.join(', ') || ''}
        Text: ${precedentData.text || ''}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### 📜 Extracted Statutes & Acts
        - Bullet list of Acts referenced (e.g. Indian Penal Code, Contract Act).
        
        ### 📑 Specific Sections & Rules
        - Detailed explanation of how each section was interpreted or applied in this judgment.
        `;
    } else if (actionType === 'find_stronger') {
        prompt = `
        You are a Senior Legal Research Specialist.
        Analyze the following precedent and find 2 to 3 stronger binding authorities or higher bench judgments on this topic in Indian Jurisprudence.
        Explain why each is stronger (e.g., larger bench size, Supreme Court vs High Court status, or more recent clarification).
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Court: ${precedentData.case_identity?.court || precedentData.court}
        Bench: ${precedentData.case_identity?.bench || 'N/A'}
        Citation: ${precedentData.case_identity?.citation || precedentData.citation}
        Ratio/Principle: ${precedentData.legal_principle || precedentData.ratio_decidendi}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### 👑 1. Primary Stronger Authority
        - **Case Name & Citation**: [Provide Case Name and Citation, e.g. Bir Singh v. Mukesh Kumar (2019) 4 SCC 197]
        - **Bench & Court**: [e.g. 2-Judge Bench, Supreme Court of India]
        - **Why it is Stronger**: [Why it binds higher or clarifies the point better]

        ### 👑 2. Secondary Clarification
        - **Case Name & Citation**: [Provide Case Name and Citation]
        - **Bench & Court**: [Bench details]
        - **Why it is Stronger**: [Detailed reasons]
        `;
    } else if (actionType === 'find_opposite') {
        prompt = `
        You are a Senior Legal Counsel.
        Analyze the following precedent and identify 2 contrary, conflicting, or distinguishing judgments that the opposing counsel might cite.
        Provide strategies on how to distinguish them or defend our position.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Ratio/Principle: ${precedentData.legal_principle || precedentData.ratio_decidendi}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        ### 🔄 1. Distinguishing Precedent
        - **Case Name & Citation**: [Conflicting Case Name and Citation]
        - **Key Difference/Contrary View**: [Why it contradicts or distinguishes the ratio]
        - **Advocate Defense Strategy**: [How to defend or show it doesn't apply to our facts]

        ### 🔄 2. Conflicting Ruling
        - **Case Name & Citation**: [Conflicting Case Name and Citation]
        - **Key Difference/Contrary View**: [The conflict details]
        - **Advocate Defense Strategy**: [How to defend]
        `;
    } else if (actionType === 'generate_citations') {
        prompt = `
        You are a Legal Citation Expert.
        Generate citations for the following judgment under different standard formats.
        ${langRule}

        PRECEDENT DATA:
        Case: ${precedentData.case_identity?.case_name || precedentData.case_name}
        Court: ${precedentData.case_identity?.court || precedentData.court}
        Year: ${precedentData.case_identity?.year || precedentData.year}
        Citation: ${precedentData.case_identity?.citation || precedentData.citation}

        STRUCTURE YOUR RESPONSE (SCANNABLE MARKDOWN):
        - **SCC**: [SCC Citation format, e.g. (2010) 11 SCC 441]
        - **AIR**: [AIR Citation format, e.g. AIR 2010 SC 1898]
        - **SCR**: [SCR Citation format]
        - **CrLJ**: [Criminal Law Journal format, if criminal case, else state N/A]
        - **Neutral Citation**: [Neutral court citation, e.g. 2010 INSC 321]
        - **Bluebook (21st ed)**: [Standard Bluebook citation]
        - **OSCOLA**: [OSCOLA citation format]
        - **APA (7th ed)**: [APA citation format]
        - **MLA (9th ed)**: [MLA citation format]
        `;
    }

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            modelOverride: 'gemini-2.5-flash',
            temperature: 0.2
        });

        return response;
    } catch (error) {
        logger.error(`[Precedents] AI Analysis failed for ${actionType}: ${error.message}`);
        throw error;
    }
};
