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

// Authoritative Nepal Legal Domains Hierarchy
const NEPAL_TIER_1_DOMAINS = [
    'supremecourt.gov.np',
    'lawcommission.gov.np',
    'nepallawcommission.gov.np',
    'molpa.gov.np',
    'nepal.gov.np',
    'parliament.gov.np'
];

const NEPAL_TIER_2_DOMAINS = [
    'nepallawjournal.org',
    'nepallawyers.com',
    'setopati.com',
    'ekantipur.com',
    'kathmandupost.com',
    'myrepublica.nagariknetwork.com',
    'thehimalayantimes.com'
];

/**
 * Categorizes a source URL into authority tiers based on jurisdiction
 */
export const classifySourceTier = (url = '', country = 'India') => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (country === 'Nepal' || hostname.endsWith('.np')) {
            if (NEPAL_TIER_1_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`)) || hostname.endsWith('.gov.np')) {
                return { tier: 1, label: 'OFFICIAL_NEPAL_GOVT_COURT', weight: 1.0 };
            }
            if (NEPAL_TIER_2_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
                return { tier: 2, label: 'AUTHORITATIVE_NEPAL_REPORTER', weight: 0.85 };
            }
            return { tier: 3, label: 'SECONDARY_COMMENTARY', weight: 0.5 };
        }

        // Default: India
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

export const getDomainTier = (url = '', country = 'India') => classifySourceTier(url, country).tier;
export const isAuthoritativeLegalSource = (url = '', country = 'India') => classifySourceTier(url, country).tier <= 2;

/**
 * Performs a targeted live search using Tavily API focused on jurisdiction-specific legal sources.
 * Used for Deep Search, Live Precedents, or as the search retrieval layer for OpenAI fallback.
 * 
 * @param {string} query - Search query
 * @param {object} options - Search options (including options.jurisdiction)
 * @returns {Promise<object>} { summary, sources: [{ title, url, snippet, tier, date }] }
 */
export const executeTargetedLegalSearch = async (query, options = {}) => {
    const startTime = Date.now();
    const jurisdiction = options.jurisdiction || { country: 'India', state: '' };
    const country = jurisdiction.country || 'India';
    const state = jurisdiction.state || '';
    logger.info(`[LegalSearchOrchestrator] Executing live search for: "${query}" (Jurisdiction: ${state ? state + ', ' : ''}${country})`);

    if (TAVILY_API_KEY) {
        try {
            const currentYear = new Date().getFullYear();
            let searchQueryStr = query;
            let domainsToInclude = [];

            if (country !== 'India') {
                // International (e.g. Nepal)
                searchQueryStr = `${query} ${state ? state + ' ' : ''}${country} ${currentYear}`;
                if (country === 'Nepal') {
                    domainsToInclude = [
                        'supremecourt.gov.np',
                        'lawcommission.gov.np',
                        'nepallawcommission.gov.np',
                        'molpa.gov.np',
                        'nepal.gov.np',
                        'nepallawjournal.org',
                        'kathmandupost.com'
                    ];
                }
            } else {
                // India
                searchQueryStr = `${query} ${state ? state + ' ' : ''}India ${currentYear}`;
                domainsToInclude = [
                    'sci.gov.in',
                    'indiacode.nic.in',
                    'egazette.gov.in',
                    'indiankanoon.org',
                    'livelaw.in',
                    'barandbench.com',
                    'scconline.com'
                ];
            }

            const tavilyPayload = {
                api_key: TAVILY_API_KEY,
                query: searchQueryStr,
                search_depth: options.depth || 'advanced',
                include_answer: true,
                include_raw_content: false,
                max_results: options.maxResults || 5
            };

            // Only pass include_domains if domains were configured
            if (domainsToInclude.length > 0) {
                tavilyPayload.include_domains = domainsToInclude;
            }

            const response = await axios.post('https://api.tavily.com/search', tavilyPayload, { timeout: 20000 });

            const results = response.data?.results || [];
            const aiAnswer = response.data?.answer || '';

            // Map and classify results by authority tier
            const processedSources = results.map(r => {
                const tierInfo = classifySourceTier(r.url, country);
                return {
                    title: r.title || `${country} Legal Source`,
                    url: r.url,
                    snippet: r.content ? r.content.substring(0, 400) : '',
                    tier: tierInfo.tier,
                    tierLabel: tierInfo.label,
                    publishedDate: r.published_date || null
                };
            }).sort((a, b) => a.tier - b.tier); // Tier 1 first, then Tier 2

            logger.info(`[LegalSearchOrchestrator] Tavily retrieved ${processedSources.length} sources for ${country} in ${Date.now() - startTime}ms`);

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
        const fallbackSearch = await performWebSearch(`${query} ${country}`, 5);
        if (fallbackSearch && fallbackSearch.results && fallbackSearch.results.length > 0) {
            const mapped = fallbackSearch.results.map(r => {
                const tierInfo = classifySourceTier(r.link, country);
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
export const formatGroundingContext = (sources = [], summary = '', jurisdiction = null) => {
    if ((!sources || sources.length === 0) && !summary) {
        return '';
    }

    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toLocaleDateString('en-IN', {
        dateStyle: 'full'
    });

    const country = jurisdiction?.country || 'India';
    const state = jurisdiction?.state || '';
    const jurisdictionLabel = state ? `${state}, ${country}` : country;

    let groundingText = `\n\n====================================================
🏛️ VERIFIED REAL-TIME LEGAL SEARCH GROUNDING (LIVE WEB — ${jurisdictionLabel.toUpperCase()})
Current Date: ${todayStr} (Year: ${currentYear})
Active Legal Jurisdiction: ${jurisdictionLabel}
====================================================
The following information was retrieved in real-time from authoritative ${country} legal databases and official records.
You MUST ground your legal answer strictly on these verified current sources rather than outdated model weights.

### STRICT RULES FOR GROUNDED LEGAL REASONING (${country.toUpperCase()}):
1. STATUTORY STATUS: Distinguish between provisions that are "PASSED" vs "NOTIFIED" vs "OFFICIALLY BROUGHT INTO FORCE". Do not claim a draft or announced bill is in force unless verified.
2. JURISDICTION FIDELITY: Ground strictly in the statutes and precedents of ${jurisdictionLabel}. Do NOT cite laws, sections, or codes of other jurisdictions (e.g. do not cite Indian BNS/BNSS/BSA for Nepal, or vice-versa).
3. RECENT AMENDMENTS: If these sources indicate that an Act, Section, or rule was amended, struck down, or replaced, prioritize this latest verified position.
4. CONFLICT RESOLUTION: If an older static text or reference conflicts with a verified recent official notification or court judgment from these sources, the RECENT OFFICIAL SOURCE PREVAILS.
5. NO FABRICATION: Do NOT invent statutes, sections, case names, judgments, citations, or courts. If details are not found in these sources or primary law, explicitly state that they are unverified.

### LIVE WEB SEARCH SIGNALS (VERIFY AGAINST PRIMARY STATUTES):
${summary ? `Preliminary Web Search Notes: ${summary}\n` : ''}`;

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
