import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { performWebSearch } from './searchService.js';

dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Authoritative Indian Legal Domains Hierarchy
const TIER_1_DOMAINS = [
    'sci.gov.in',
    'main.sci.gov.in',
    'indiacode.nic.in',
    'egazette.gov.in',
    'lawmin.gov.in',
    'mha.gov.in',
    'delhihighcourt.nic.in',
    'bombayhighcourt.nic.in',
    'allahabadhighcourt.in',
    'hckreg.kar.nic.in',
    'hcmadras.tn.nic.in',
    'calcuttahighcourt.gov.in',
    'e-courts.gov.in',
    'judgments.ecourts.gov.in'
];

const TIER_2_DOMAINS = [
    'indiankanoon.org',
    'livelaw.in',
    'barandbench.com',
    'scconline.com',
    'manupatrafast.com',
    'legalserviceindia.com'
];

/**
 * Categorizes a source URL into authority tiers
 */
export const classifySourceTier = (url = '') => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (TIER_1_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
            return { tier: 1, label: 'OFFICIAL_GOVT_COURT', weight: 1.0 };
        }
        if (TIER_2_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
            return { tier: 2, label: 'AUTHORITATIVE_LEGAL_REPORTER', weight: 0.85 };
        }
        return { tier: 3, label: 'SECONDARY_COMMENTARY', weight: 0.5 };
    } catch {
        return { tier: 3, label: 'SECONDARY_COMMENTARY', weight: 0.5 };
    }
};

export const getDomainTier = (url = '') => classifySourceTier(url).tier;
export const isAuthoritativeLegalSource = (url = '') => classifySourceTier(url).tier <= 2;

/**
 * Performs a targeted live search using Tavily API focused on Indian legal sources.
 * Used for Deep Search, Live Precedents, or as the search retrieval layer for OpenAI fallback.
 * 
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} { summary, sources: [{ title, url, snippet, tier, date }] }
 */
export const executeTargetedLegalSearch = async (query, options = {}) => {
    const startTime = Date.now();
    logger.info(`[LegalSearchOrchestrator] Executing live search for: "${query}"`);

    if (TAVILY_API_KEY) {
        try {
            const currentYear = new Date().getFullYear();
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: TAVILY_API_KEY,
                query: `${query} India ${currentYear}`,
                search_depth: options.depth || 'advanced',
                include_answer: true,
                include_raw_content: false,
                max_results: options.maxResults || 5,
                include_domains: [
                    'sci.gov.in',
                    'indiacode.nic.in',
                    'egazette.gov.in',
                    'indiankanoon.org',
                    'livelaw.in',
                    'barandbench.com',
                    'scconline.com'
                ]
            }, { timeout: 20000 });

            const results = response.data?.results || [];
            const aiAnswer = response.data?.answer || '';

            // Map and classify results by authority tier
            const processedSources = results.map(r => {
                const tierInfo = classifySourceTier(r.url);
                return {
                    title: r.title || 'Legal Source',
                    url: r.url,
                    snippet: r.content ? r.content.substring(0, 400) : '',
                    tier: tierInfo.tier,
                    tierLabel: tierInfo.label,
                    publishedDate: r.published_date || null
                };
            }).sort((a, b) => a.tier - b.tier); // Tier 1 first, then Tier 2

            logger.info(`[LegalSearchOrchestrator] Tavily retrieved ${processedSources.length} sources in ${Date.now() - startTime}ms`);

            return {
                summary: aiAnswer,
                sources: processedSources,
                searchEngine: 'tavily',
                latencyMs: Date.now() - startTime
            };
        } catch (tavilyErr) {
            logger.warn(`[LegalSearchOrchestrator] Tavily search failed: ${tavilyErr.message}. Falling back to secondary search...`);
        }
    }

    // Secondary search fallback (performWebSearch from searchService)
    try {
        const fallbackSearch = await performWebSearch(query, 5);
        if (fallbackSearch && fallbackSearch.results && fallbackSearch.results.length > 0) {
            const mapped = fallbackSearch.results.map(r => {
                const tierInfo = classifySourceTier(r.link);
                return {
                    title: r.title,
                    url: r.link,
                    snippet: r.snippet,
                    tier: tierInfo.tier,
                    tierLabel: tierInfo.label,
                    publishedDate: null
                };
            }).sort((a, b) => a.tier - b.tier);

            return {
                summary: '',
                sources: mapped,
                searchEngine: 'google_custom_or_scraper',
                latencyMs: Date.now() - startTime
            };
        }
    } catch (fallbackErr) {
        logger.error(`[LegalSearchOrchestrator] All search engines failed: ${fallbackErr.message}`);
    }

    return {
        summary: '',
        sources: [],
        searchEngine: 'none',
        latencyMs: Date.now() - startTime
    };
};

/**
 * Formats retrieved sources into a clean, authoritative markdown grounding block
 * that can be appended directly to prompts for Gemini or OpenAI GPT-4o.
 */
export const formatGroundingContext = (sources = [], summary = '') => {
    if ((!sources || sources.length === 0) && !summary) {
        return '';
    }

    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full'
    });

    let groundingText = `\n\n====================================================
🏛️ VERIFIED REAL-TIME LEGAL SEARCH GROUNDING (LIVE WEB)
Current Date: ${todayStr} (Year: ${currentYear})
====================================================
The following information was retrieved in real-time from authoritative Indian legal databases and official records.
You MUST ground your legal answer on these verified current sources rather than outdated model weights.

### STRICT RULES FOR GROUNDED LEGAL REASONING:
1. STATUTORY STATUS: Distinguish between provisions that are "PASSED" vs "NOTIFIED" vs "OFFICIALLY BROUGHT INTO FORCE". Do not claim a draft or announced bill is in force unless verified.
2. RECENT AMENDMENTS: If these sources indicate that an Act, Section, or rule was amended, struck down, or replaced (e.g. BNS / BNSS / BSA replacing IPC / CrPC / Evidence Act), prioritize this latest position.
3. CONFLICT RESOLUTION: If an older static text or RAG reference conflicts with a verified recent official notification or court judgment from these sources, the RECENT OFFICIAL SOURCE PREVAILS.
4. NO FABRICATION: Do NOT invent case names, judgments, bench names, SCC/AIR citations, or section numbers. If details are not found in these sources, clearly disclose that they are under judicial determination or unverified.
5. VALIDATE STATUTORY SECTION NUMBERS: Do NOT assume placeholder or fictitious section names in user queries (e.g., "Section X", "Section XYZ", or non-existent numbers) are real. BNS sections are numbered 1 to 358. If a query mentions "Section X" or an unassigned section, explicitly clarify that no such section exists under BNS.
6. PROPOSALS & NEWS VS ENACTED LAW: News articles stating the Centre is "likely to amend", "considering amending", or "reports indicate" do NOT constitute an enacted amendment. Always clarify if a change is merely a reported proposal/debate rather than a notified amendment to the BNS.

### LIVE WEB SEARCH SIGNALS (VERIFY AGAINST PRIMARY STATUTES):
${summary ? `Preliminary Web Search Notes: ${summary}\n(Note: Verify all claims against primary statutes. Media speculation or user keywords like 'Section X' are not statutory provisions.)\n` : ''}`;

    if (sources && sources.length > 0) {
        groundingText += `\n### AUTHORITATIVE SOURCES RETRIEVED:\n`;
        sources.forEach((s, idx) => {
            const tierDesc = s.tier === 1 ? 'Tier 1 - Official Govt/Court' : (s.tier === 2 ? 'Tier 2 - Authoritative Legal Reporter' : 'Tier 3 - Secondary Source');
            groundingText += `\n[Source ${idx + 1}] ${s.title} [${tierDesc}]\n`;
            groundingText += `URL: ${s.url}\n`;
            if (s.publishedDate) groundingText += `Date: ${s.publishedDate}\n`;
            if (s.snippet) groundingText += `Content: ${s.snippet}\n`;
        });
    }

    groundingText += `\n====================================================\n`;
    return groundingText;
};
