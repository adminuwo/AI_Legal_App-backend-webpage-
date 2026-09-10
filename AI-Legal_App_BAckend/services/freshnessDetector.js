import logger from '../utils/logger.js';

/**
 * Freshness & Search Decision Engine for AI LEGAL
 * 
 * Determines whether a user query, active legal tool, or legal context requires
 * real-time information from live authoritative sources (Google Grounding / Tavily).
 */

// 1. Explicit Temporal Keywords & Phrases
const TEMPORAL_KEYWORDS = [
    'latest', 'current', 'recently', 'recent', 'new', 'amended', 'amendment',
    'notification', 'circular', 'rule', 'rules', 'regulation', 'regulations',
    '2024', '2025', '2026', 'today', 'this year', 'this month',
    'latest judgment', 'recent judgment', 'latest precedent', 'recent case law',
    'latest ruling', 'recent ruling', 'current law', 'law currently in force',
    'in force', 'enforced', 'applicable today', 'repealed', 'overruled',
    'stayed', 'stay order', 'guidelines issued', 'latest supreme court',
    'recent supreme court', 'latest high court', 'recent high court',
    'status of', 'is still valid', 'is still in force', 'is still applicable',
    'has been changed', 'has it changed', 'new amendment', 'sub-section added',
    'struck down', 'unconstitutional', 'constitution bench', 'limitation period'
];

// 2. Hindi / Hinglish Temporal Equivalents
const HINDI_TEMPORAL_KEYWORDS = [
    'naya', 'naye', 'nayi', 'taaza', 'haaliye', 'haal hi me', 'abhi ka',
    'aaj ka', 'latest', 'badlaav', 'sanshodhan', 'sanshodhit', 'lagu',
    'kya abhi bhi', 'kya abhi lagu hai', 'khatam ho gaya', 'hata diya',
    'supreme court ka faisla', 'high court ka faisla', 'faisla', 'nirnay'
];

// 3. Indian Legal Transition Contexts (Inherently Time-Sensitive)
const TRANSITION_PATTERNS = [
    /\b(bns|bnss|bsa|bharatiya nyaya|bharatiya nagarik|bharatiya sakshya)\b/i,
    /\b(ipc vs bns|crpc vs bnss|evidence act vs bsa)\b/i,
    /\b(is ipc (still|valid|applicable)|is crpc (still|valid|applicable))\b/i,
    /\b(section \d+[a-z]?\s*(bns|bnss|bsa))\b/i
];

// 4. Nepal Legal Transition & Authority Patterns
const NEPAL_LEGAL_PATTERNS = [
    /\b(nepal law commission|lawcommission\.gov\.np|nepal law|nepalese law)\b/i,
    /\b(supreme court of nepal|nepal supreme court|supremecourt\.gov\.np)\b/i,
    /\b(muluki code|muluki ain|muluki aparadh|muluki devani|muluki karyavidhi)\b/i,
    /\b(constitution of nepal 2072|nepal constitution)\b/i,
    /\b(bagmati|koshi|madhesh|gandaki|lumbini|karnali|sudurpashchim)\s+(province|provincial|law|act|amendment)\b/i,
    /\b(latest\s+(nepal\s+)?(amendment|act|ordinance|bill|notification|judgment|gazette))\b/i
];

// 5. In-Force / Applicability Question Patterns
const APPLICABILITY_PATTERNS = [
    /\b(is|are)\s+section\s+\d+.*?\s+(still|currently)?\s*(in force|applicable|valid|active)\b/i,
    /\bhas\s+(section\s+\d+|the\s+act|the\s+bill).*?\s*(been\s+)?(amended|repealed|struck down|notified|brought into force)\b/i,
    /\b(what\s+is\s+the\s+current\s+(status|position|law|rule|procedure|limitation))\b/i,
    /\b(latest|recent)\s+(supreme\s+court|high\s+court|sc|hc)\s+(judgment|judgement|ruling|order|precedent|decision)\b/i,
    /\b(bail\s+jurisprudence|anticipatory\s+bail)\s+under\s+(bnss|482|483|438|439)\b/i,
    /\b(limitation\s+period\s+for|time\s+limit\s+to\s+file)\b/i
];

// 6. Explicit Tool Names that strongly require precedent/statute freshness
const FRESHNESS_HEAVY_TOOLS = [
    'legal_research_assistant',
    'legal_precedents',
    'legal_law_comparator',
    'legal_compliance_checker'
];

/**
 * Analyzes whether a query warrants real-time web search grounding.
 * 
 * @param {string} message - User query text
 * @param {string} mode - Active execution mode (e.g., 'LEGAL_TOOLKIT', 'NORMAL_CHAT')
 * @param {string} toolName - Active tool name (e.g., 'legal_research_assistant')
 * @param {string} activeDocContent - Extracted document content if user uploaded a file
 * @returns {object} Decision result: { isFreshnessRequired, reason, searchType, searchQuery, targetJurisdiction }
 */
export const analyzeFreshness = (message = '', mode = '', toolName = '', activeDocContent = null, jurisdiction = null) => {
    const raw = String(message || '').trim();
    const lower = raw.toLowerCase();

    // Fast-path: Greetings and very short filler phrases do not need search
    const shortFillers = [
        'hi', 'hello', 'hii', 'hey', 'namaste', 'ok', 'okay', 'thanks', 'thank you',
        'great', 'bye', 'goodbye', 'action', 'start'
    ];
    if (shortFillers.includes(lower) || raw.length < 4) {
        return {
            isFreshnessRequired: false,
            reason: 'SHORT_GREETING_OR_FILLER',
            searchType: 'NONE',
            searchQuery: '',
            targetJurisdiction: jurisdiction?.country ? `${jurisdiction.state ? jurisdiction.state + ', ' : ''}${jurisdiction.country}` : 'India'
        };
    }

    const resolvedJurisdiction = jurisdiction?.country 
        ? `${jurisdiction.state ? jurisdiction.state + ', ' : ''}${jurisdiction.country}`
        : detectJurisdiction(lower);

    // 1. Check Explicit Temporal Keywords
    const matchedTemporal = TEMPORAL_KEYWORDS.find(k => lower.includes(k));
    if (matchedTemporal) {
        logger.info(`[FreshnessDetector] Matched temporal keyword: "${matchedTemporal}" (Jurisdiction: ${resolvedJurisdiction})`);
        return {
            isFreshnessRequired: true,
            reason: `EXPLICIT_TEMPORAL_KEYWORD (${matchedTemporal})`,
            searchType: detectSearchType(lower),
            searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
            targetJurisdiction: resolvedJurisdiction
        };
    }

    // 2. Check Hindi / Hinglish Temporal Keywords
    const matchedHindi = HINDI_TEMPORAL_KEYWORDS.find(k => lower.includes(k));
    if (matchedHindi) {
        logger.info(`[FreshnessDetector] Matched Hindi temporal keyword: "${matchedHindi}" (Jurisdiction: ${resolvedJurisdiction})`);
        return {
            isFreshnessRequired: true,
            reason: `HINDI_TEMPORAL_KEYWORD (${matchedHindi})`,
            searchType: detectSearchType(lower),
            searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
            targetJurisdiction: resolvedJurisdiction
        };
    }

    // 3. Check Statutory Applicability & In-Force Patterns
    for (const pattern of APPLICABILITY_PATTERNS) {
        if (pattern.test(lower)) {
            logger.info(`[FreshnessDetector] Matched statutory applicability pattern: ${pattern} (Jurisdiction: ${resolvedJurisdiction})`);
            return {
                isFreshnessRequired: true,
                reason: 'STATUTORY_APPLICABILITY_OR_STATUS_QUERY',
                searchType: 'LEGAL_STATUTE',
                searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
                targetJurisdiction: resolvedJurisdiction
            };
        }
    }

    // 4. Check Nepal Legal Patterns & Authorities
    for (const pattern of NEPAL_LEGAL_PATTERNS) {
        if (pattern.test(lower)) {
            logger.info(`[FreshnessDetector] Matched Nepal legal pattern: ${pattern}`);
            return {
                isFreshnessRequired: true,
                reason: 'NEPAL_LEGAL_AUTHORITY_OR_STATUTE_QUERY',
                searchType: 'LEGAL_STATUTE',
                searchQuery: buildOptimizedSearchQuery(raw, jurisdiction || { country: 'Nepal' }),
                targetJurisdiction: resolvedJurisdiction.includes('Nepal') ? resolvedJurisdiction : 'Nepal'
            };
        }
    }

    // 5. Check Transition Patterns (BNS, BNSS, BSA - only if India or unspecified)
    if (!jurisdiction || jurisdiction.country === 'India' || !jurisdiction.country) {
        for (const pattern of TRANSITION_PATTERNS) {
            if (pattern.test(lower)) {
                logger.info(`[FreshnessDetector] Matched legal transition pattern: ${pattern}`);
                return {
                    isFreshnessRequired: true,
                    reason: 'CRITICAL_LEGAL_TRANSITION_QUERY',
                    searchType: 'LEGAL_STATUTE',
                    searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
                    targetJurisdiction: resolvedJurisdiction
                };
            }
        }
    }

    // 6. Check Specialized Freshness-Heavy Tools
    if (toolName && FRESHNESS_HEAVY_TOOLS.includes(toolName)) {
        if (/\b(latest|recent|current|precedent|citation|case|order|judgment|section|amendment)\b/i.test(lower)) {
            return {
                isFreshnessRequired: true,
                reason: `TOOL_MANDATES_FRESHNESS (${toolName})`,
                searchType: detectSearchType(lower),
                searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
                targetJurisdiction: resolvedJurisdiction
            };
        }
    }

    // 6. User Document + Time-Sensitive Legal Question
    if (activeDocContent && /\b(current|amended|today|applicable|limitation|validity)\b/i.test(lower)) {
        return {
            isFreshnessRequired: true,
            reason: 'USER_DOC_WITH_CURRENT_LAW_QUERY',
            searchType: 'LEGAL_STATUTE',
            searchQuery: buildOptimizedSearchQuery(raw, jurisdiction),
            targetJurisdiction: resolvedJurisdiction
        };
    }

    const result = {
        isFreshnessRequired: false,
        needsFreshness: false,
        confidence: 0.9,
        reason: 'STATIC_OR_GENERAL_KNOWLEDGE',
        reasons: ['static_general_knowledge'],
        searchType: 'NONE',
        searchQuery: '',
        targetJurisdiction: resolvedJurisdiction
    };

    return result;
};

export const detectLegalFreshnessRequirement = (message, mode, toolName, activeDocContent, jurisdiction = null) => {
    const res = analyzeFreshness(message, mode, toolName, activeDocContent, jurisdiction);
    return {
        ...res,
        needsFreshness: res.isFreshnessRequired,
        confidence: res.isFreshnessRequired ? 0.95 : 0.85,
        reasons: [res.reason.toLowerCase()]
    };
};

/**
 * Categorizes the search query into a specific legal domain type
 */
function detectSearchType(lower) {
    if (/\b(judgment|judgement|ruling|precedent|case law|scc|air|bench|appeal|quash|bail)\b/i.test(lower)) {
        return 'LEGAL_PRECEDENT';
    }
    if (/\b(amendment|act|section|notification|gazette|rule|regulation|in force|repealed|bns|bnss|bsa|code)\b/i.test(lower)) {
        return 'LEGAL_STATUTE';
    }
    return 'GENERAL_LEGAL';
}

/**
 * Detects specific High Court or Supreme Court jurisdiction
 */
function detectJurisdiction(lower) {
    if (lower.includes('nepal') || lower.includes('lawcommission.gov.np') || lower.includes('bagmati') || lower.includes('koshi') || lower.includes('madhesh') || lower.includes('gandaki') || lower.includes('lumbini') || lower.includes('karnali') || lower.includes('sudurpashchim')) {
        return 'Supreme Court of Nepal / Nepal';
    }
    if (lower.includes('delhi high court') || lower.includes('delhi hc')) return 'Delhi High Court';
    if (lower.includes('bombay high court') || lower.includes('bombay hc')) return 'Bombay High Court';
    if (lower.includes('allahabad high court') || lower.includes('allahabad hc')) return 'Allahabad High Court';
    if (lower.includes('madras high court') || lower.includes('madras hc')) return 'Madras High Court';
    if (lower.includes('calcutta high court') || lower.includes('calcutta hc')) return 'Calcutta High Court';
    if (lower.includes('karnataka high court') || lower.includes('karnataka hc')) return 'Karnataka High Court';
    if (lower.includes('high court') || lower.includes('hc')) return 'High Court of India';
    return 'Supreme Court of India / India';
}

/**
 * Builds an optimized Google Search / Tavily query calibrated for the target jurisdiction.
 * Prevents appending 'Indian law' to queries meant for Nepal or other international jurisdictions.
 */
function buildOptimizedSearchQuery(rawQuery, jurisdiction = null) {
    const cleaned = rawQuery
        .replace(/^(please|can you|tell me|explain|what is|kripya|batao|mujhe)\s+/gi, '')
        .replace(/[?.,!]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const currentYear = new Date().getFullYear(); // e.g. 2026

    const hasYear = /\b(202[4-6])\b/.test(cleaned);
    let queryWithContext = cleaned;
    if (!hasYear) {
        queryWithContext += ` ${currentYear}`;
    }

    if (jurisdiction?.country && jurisdiction.country !== 'India') {
        // International Jurisdiction (e.g. Nepal, USA, UK, etc.)
        const countryTerm = jurisdiction.country;
        const stateTerm = jurisdiction.state ? `${jurisdiction.state} ` : '';
        const regexCountry = new RegExp(`\\b${countryTerm}\\b`, 'i');
        if (!regexCountry.test(cleaned)) {
            queryWithContext += ` ${stateTerm}${countryTerm} law`;
        }
        if (countryTerm === 'Nepal' && !/lawcommission|supremecourt/i.test(cleaned)) {
            queryWithContext += ` Nepal legal code lawcommission.gov.np`;
        }
    } else {
        // India Jurisdiction
        const stateTerm = jurisdiction?.state ? `${jurisdiction.state} ` : '';
        const hasAuthority = /\b(supreme court|high court|india code|indian kanoon|gazette|bns|bnss|bsa)\b/i.test(cleaned);
        if (!hasAuthority && !/indian\b/i.test(cleaned)) {
            queryWithContext += ` ${stateTerm}Indian law`;
        }
    }

    return queryWithContext.trim();
}
