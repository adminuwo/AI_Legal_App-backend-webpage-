import UserModel from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * GLOBAL JURISDICTION CONTEXT MANAGER & RESOLVER
 * 
 * Centralized service to manage legal jurisdictions, inject system prompt blocks,
 * and enforce strict jurisdiction resolution priority across ALL AI Legal features.
 * 
 * JURISDICTION RESOLUTION PRIORITY:
 * 1. Explicit jurisdiction supplied with current request (in query or body/headers)
 * 2. Saved user jurisdiction (user.legalJurisdiction or admin temporary override)
 * 3. Account/profile jurisdiction (user.country, user.jurisdiction)
 * 4. Feature-specific jurisdiction
 * 5. Default jurisdiction = India (only if no other jurisdiction is available)
 */

// Known country codes and names mapping
const COUNTRY_MAP = {
    IN: 'India',
    NP: 'Nepal',
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    AE: 'United Arab Emirates'
};

const NEPAL_PROVINCES = [
    'Bagmati', 'Koshi', 'Madhesh', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'
];

class JurisdictionManager {
    constructor() {
        this.temporaryOverrides = new Map(); // userId -> { country, state, countryCode, timestamp }
    }

    setTemporaryOverride(userId, jurisdictionData) {
        if (!userId) return;
        const uId = userId.toString();
        if (typeof jurisdictionData === 'string') {
            this.temporaryOverrides.set(uId, {
                country: jurisdictionData,
                state: '',
                countryCode: jurisdictionData.toLowerCase() === 'nepal' ? 'NP' : 'IN'
            });
        } else if (jurisdictionData && typeof jurisdictionData === 'object') {
            this.temporaryOverrides.set(uId, {
                country: jurisdictionData.country || 'India',
                state: jurisdictionData.state || '',
                countryCode: jurisdictionData.countryCode || (jurisdictionData.country === 'Nepal' ? 'NP' : 'IN')
            });
        }
    }

    removeTemporaryOverride(userId) {
        if (!userId) return;
        this.temporaryOverrides.delete(userId.toString());
    }

    getTemporaryOverride(userId) {
        if (!userId) return null;
        const override = this.temporaryOverrides.get(userId.toString());
        return override ? override.country : null;
    }

    getTemporaryOverrideObject(userId) {
        if (!userId) return null;
        return this.temporaryOverrides.get(userId.toString()) || null;
    }

    /**
     * Centralized Jurisdiction Resolver.
     * Resolves the authoritative active jurisdiction with the strict 5-tier priority.
     */
    async resolveLegalJurisdiction(params = {}) {
        const {
            userId = null,
            message = '',
            query = '',
            jurisdiction = null,
            explicitJurisdiction = null,
            country = null,
            state = null,
            countryCode = null,
            headers = null,
            req = null,
            user = null,
            userProfile = null
        } = params;

        const effectiveJurisdiction = jurisdiction || explicitJurisdiction || null;

        const combinedText = `${message} ${query}`.trim();
        const lowerText = combinedText.toLowerCase();

        // Check for Comparative Law queries (e.g., "Compare Indian BNS with Nepal criminal law")
        const isComparative = (
            (lowerText.includes('compare') || lowerText.includes('vs') || lowerText.includes('difference between') || lowerText.includes('comparison')) &&
            (lowerText.includes('nepal') && (lowerText.includes('india') || lowerText.includes('bns') || lowerText.includes('ipc') || lowerText.includes('indian')))
        );

        let resolvedCountry = null;
        let resolvedState = null;
        let resolvedCode = null;
        let resolutionSource = 'default';

        // ─────────────────────────────────────────────────────────────
        // PRIORITY 1: Explicit jurisdiction in query text
        // ─────────────────────────────────────────────────────────────
        // Detect explicit mentions of Nepal vs India in user query
        const nepalRegex = /\b(under nepal law|nepal law|nepalese law|in nepal|under nepali law|nepal legal|nepal supreme court|nepal law commission|muluki code|muluki ain|muluki aparadh|muluki devani)\b/i;
        const indiaRegex = /\b(under indian law|indian law|in india|under india law|bns|bnss|bsa|ipc|crpc|supreme court of india|high court of|india code)\b/i;

        const hasExplicitNepalQuery = nepalRegex.test(lowerText);
        const hasExplicitIndiaQuery = indiaRegex.test(lowerText);

        if (hasExplicitNepalQuery && !hasExplicitIndiaQuery && !isComparative) {
            resolvedCountry = 'Nepal';
            resolvedCode = 'NP';
            resolutionSource = 'explicit_query';
            // Detect province if mentioned
            for (const p of NEPAL_PROVINCES) {
                if (lowerText.includes(p.toLowerCase())) {
                    resolvedState = p;
                    break;
                }
            }
        } else if (hasExplicitIndiaQuery && !hasExplicitNepalQuery && !isComparative) {
            resolvedCountry = 'India';
            resolvedCode = 'IN';
            resolutionSource = 'explicit_query';
        } else if (/नेपाल|काठमाडौं|हेटौंडा|पोखरा|मुलुकी|ऐन|देवानी|फौजदारी|जाहेरी|दरखास्त/.test(combinedText) && !isComparative) {
            resolvedCountry = 'Nepal';
            resolvedCode = 'NP';
            resolutionSource = 'explicit_query';
        }

        // Check explicit parameters in request body or headers
        if (!resolvedCountry) {
            const explicitCountry = country ||
                (typeof effectiveJurisdiction === 'string' ? effectiveJurisdiction : effectiveJurisdiction?.country) ||
                headers?.['x-legal-jurisdiction'] || headers?.['X-Legal-Jurisdiction'] ||
                headers?.['x-jurisdiction'] || headers?.['X-Jurisdiction'] ||
                req?.body?.country || (typeof req?.body?.jurisdiction === 'string' ? req?.body?.jurisdiction : req?.body?.jurisdiction?.country);

            const explicitState = state ||
                effectiveJurisdiction?.state ||
                headers?.['x-legal-state'] || headers?.['X-Legal-State'] ||
                req?.body?.state || req?.body?.jurisdiction?.state;

            const explicitCode = countryCode ||
                effectiveJurisdiction?.countryCode ||
                headers?.['x-country-code'] || headers?.['X-Country-Code'] ||
                req?.body?.countryCode;

            if (explicitCountry && typeof explicitCountry === 'string' && explicitCountry.trim()) {
                const trimmed = explicitCountry.trim();
                // Normalize "IN India (IN)" or "NP Nepal (NP)" format if sent
                if (trimmed.includes('Nepal') || trimmed.toUpperCase() === 'NP') {
                    resolvedCountry = 'Nepal';
                    resolvedCode = 'NP';
                } else if (trimmed.includes('India') || trimmed.toUpperCase() === 'IN') {
                    resolvedCountry = 'India';
                    resolvedCode = 'IN';
                } else {
                    resolvedCountry = trimmed;
                    resolvedCode = explicitCode || 'GLOBAL';
                }
                if (explicitState && typeof explicitState === 'string') {
                    resolvedState = explicitState.trim();
                }
                resolutionSource = 'request_param';
            }
        }

        // ─────────────────────────────────────────────────────────────
        // PRIORITY 2: Saved user jurisdiction (or admin temporary override)
        // ─────────────────────────────────────────────────────────────
        const effectiveUserId = userId || req?.user?.id || req?.user?._id;
        let dbUser = user || userProfile;

        if (!resolvedCountry && effectiveUserId) {
            const uIdStr = effectiveUserId.toString();
            // Check in-memory admin QA override first
            if (this.temporaryOverrides.has(uIdStr)) {
                const override = this.temporaryOverrides.get(uIdStr);
                resolvedCountry = override.country;
                resolvedState = override.state || null;
                resolvedCode = override.countryCode || null;
                resolutionSource = 'admin_temporary_override';
            }
        }

        if (!resolvedCountry && dbUser) {
            if (dbUser.legalJurisdiction && dbUser.legalJurisdiction.country) {
                resolvedCountry = dbUser.legalJurisdiction.country;
                resolvedState = dbUser.legalJurisdiction.state || null;
                resolvedCode = dbUser.legalJurisdiction.countryCode || null;
                resolutionSource = 'saved_user_jurisdiction';
            }
        }

        if (!resolvedCountry && effectiveUserId && !dbUser) {
            try {
                dbUser = await UserModel.findById(effectiveUserId).lean();
                if (dbUser && dbUser.legalJurisdiction && dbUser.legalJurisdiction.country) {
                    resolvedCountry = dbUser.legalJurisdiction.country;
                    resolvedState = dbUser.legalJurisdiction.state || null;
                    resolvedCode = dbUser.legalJurisdiction.countryCode || null;
                    resolutionSource = 'saved_user_jurisdiction';
                }
            } catch (dbErr) {
                logger.warn(`[JurisdictionManager] Error reading user ${effectiveUserId} saved jurisdiction: ${dbErr.message}`);
            }
        }

        // ─────────────────────────────────────────────────────────────
        // PRIORITY 3: Account / profile jurisdiction fallback
        // ─────────────────────────────────────────────────────────────
        if (!resolvedCountry && dbUser) {
            resolvedCountry = dbUser.jurisdiction || dbUser.country ||
                dbUser.personalizations?.legal?.defaultJurisdiction ||
                dbUser.personalizations?.general?.country ||
                dbUser.personalizations?.general?.jurisdiction || null;
            resolvedState = dbUser.state || dbUser.personalizations?.general?.state || null;
            resolvedCode = dbUser.countryCode || null;
            if (resolvedCountry) resolutionSource = 'account_profile';
        }

        // ─────────────────────────────────────────────────────────────
        // PRIORITY 4 & 5: Default Fallback = India (IN)
        // ─────────────────────────────────────────────────────────────
        if (!resolvedCountry) {
            resolvedCountry = 'India';
            resolvedCode = 'IN';
            resolutionSource = 'default';
        }

        // Normalize country name and code
        const isNepal = (resolvedCountry.toLowerCase() === 'nepal' || resolvedCode === 'NP');
        const isIndia = (resolvedCountry.toLowerCase() === 'india' || resolvedCode === 'IN');

        if (isNepal) {
            resolvedCountry = 'Nepal';
            resolvedCode = 'NP';
        } else if (isIndia) {
            resolvedCountry = 'India';
            resolvedCode = 'IN';
        }

        const stateClean = resolvedState ? String(resolvedState).trim() : '';
        const jurisdictionType = isNepal
            ? (stateClean ? 'province' : 'national')
            : (stateClean ? 'state' : 'federal');

        const label = stateClean ? `${resolvedCountry} — ${stateClean}` : resolvedCountry;

        const authoritativeSources = isNepal
            ? ['Nepal Law Commission (lawcommission.gov.np)', 'Supreme Court of Nepal (supremecourt.gov.np)', 'Ministry of Law, Justice and Parliamentary Affairs (molpa.gov.np)']
            : ['India Code (indiacode.nic.in)', 'Supreme Court of India (sci.gov.in)', 'High Courts of India', 'The Gazette of India (egazette.gov.in)'];

        const contextObj = {
            country: resolvedCountry,
            countryCode: resolvedCode || (isNepal ? 'NP' : (isIndia ? 'IN' : 'GLOBAL')),
            state: stateClean,
            province: isNepal ? stateClean : '',
            jurisdictionType,
            legalSystem: isNepal ? 'Nepal Legal System' : (isIndia ? 'Indian Legal System' : `${resolvedCountry} Legal System`),
            isNepal,
            isIndia,
            isComparative,
            source: resolutionSource,
            label,
            authoritativeSources,
            profile: this.getJurisdictionProfile({ isNepal, isIndia, country: resolvedCountry, countryCode: resolvedCode })
        };

        logger.info(`[JurisdictionResolver] Target: ${label} | Code: ${contextObj.countryCode} | PrioritySource: ${resolutionSource} | Comparative: ${isComparative}`);
        return contextObj;
    }

    /**
     * Complete statutory and procedural profile for any jurisdiction.
     */
    getJurisdictionProfile(jurisdictionOrContext) {
        const isNepal = typeof jurisdictionOrContext === 'object'
            ? (jurisdictionOrContext?.isNepal || jurisdictionOrContext?.countryCode === 'NP' || String(jurisdictionOrContext?.country || '').toLowerCase() === 'nepal')
            : String(jurisdictionOrContext || '').toLowerCase().includes('nepal');

        if (isNepal) {
            return {
                country: 'Nepal',
                countryCode: 'NP',
                currency: 'NPR',
                currencySymbol: 'रू',
                capitalCity: 'Kathmandu',
                constitution: 'Constitution of Nepal, 2072 (2015)',
                criminalCode: 'Muluki Criminal Code, 2074 (2017) (National Penal Code)',
                criminalProcedure: 'Muluki Criminal Procedure Code, 2074 (2017)',
                civilCode: 'Muluki Civil Code, 2074 (2017)',
                civilProcedure: 'Muluki Civil Procedure Code, 2074 (2017)',
                evidenceAct: 'Evidence Act, 2031 (1974)',
                electronicTransactionsAct: 'Electronic Transactions Act, 2063 (2008)',
                commercialLaws: 'Companies Act 2063, Banking Offence and Punishment Act 2064, Negotiable Instruments Act 2034',
                policeReportName: 'Jaheri Darkhast (जाहेरी दरखास्त) / FIR',
                courtHierarchy: [
                    'District Court (जिल्ला अदालत)',
                    'High Court (उच्च अदालत)',
                    'Supreme Court of Nepal (सर्वोच्च अदालत)'
                ],
                apexCourt: 'Supreme Court of Nepal',
                citationFormat: 'NLR (Nepal Law Report) / SC Decision No.',
                authoritativePortal: 'Nepal Law Commission (www.lawcommission.gov.np)'
            };
        }

        return {
            country: 'India',
            countryCode: 'IN',
            currency: 'INR',
            currencySymbol: '₹',
            capitalCity: 'New Delhi',
            constitution: 'Constitution of India, 1950',
            criminalCode: 'Bharatiya Nyaya Sanhita, 2023 (BNS) [IPC for pre-July 2024]',
            criminalProcedure: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [CrPC for pre-July 2024]',
            civilCode: 'Code of Civil Procedure, 1908 (CPC) & Indian Contract Act, 1872',
            civilProcedure: 'Code of Civil Procedure, 1908 (CPC)',
            evidenceAct: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA) [Indian Evidence Act, 1872]',
            commercialLaws: 'Companies Act 2013, Negotiable Instruments Act 1881, Consumer Protection Act 2019',
            policeReportName: 'First Information Report (FIR)',
            courtHierarchy: [
                'District & Sessions Court',
                'High Court',
                'Supreme Court of India'
            ],
            apexCourt: 'Supreme Court of India',
            citationFormat: 'SCC / AIR / SCR',
            authoritativePortal: 'India Code (www.indiacode.nic.in) / SCI (sci.gov.in)'
        };
    }

    /**
     * Backward-compatible helper that returns formatted jurisdiction string.
     */
    async getActiveJurisdiction(userId, reqOrOptions = null) {
        const resolved = await this.resolveLegalJurisdiction({
            userId,
            ...(typeof reqOrOptions === 'object' ? reqOrOptions : {})
        });
        return resolved.state ? `${resolved.state}, ${resolved.country}` : resolved.country;
    }

    /**
     * Generates a strict, jurisdiction-specific system prompt block.
     * Guaranteed to prevent Indian legal contamination in Nepal and vice-versa.
     */
    getJurisdictionPrompt(jurisdictionContext) {
        const ctx = typeof jurisdictionContext === 'object' && jurisdictionContext !== null
            ? jurisdictionContext
            : {
                country: String(jurisdictionContext || 'India'),
                isNepal: String(jurisdictionContext || '').toLowerCase().includes('nepal'),
                isIndia: String(jurisdictionContext || '').toLowerCase().includes('india') || !jurisdictionContext,
                isComparative: false,
                label: String(jurisdictionContext || 'India')
            };

        if (ctx.isComparative) {
            return `
=========================================
🌐 ACTIVE LEGAL JURISDICTION: COMPARATIVE LAW ANALYSIS (${ctx.label})
=========================================
You are a senior comparative law scholar. The user has explicitly requested a comparative analysis between multiple legal systems (including Nepal and India).
1. Clearly differentiate between the statutory frameworks of each country.
2. For Nepal: cite the Constitution of Nepal 2072, Muluki Criminal Code 2074, Muluki Civil Code 2074, and Nepal Supreme Court precedents.
3. For India: cite the Bharatiya Nyaya Sanhita 2023 (BNS), BNSS 2023, BSA 2023 / IPC, CrPC, and Supreme Court of India precedents.
4. Present differences side-by-side or in clean Markdown comparison tables.
`;
        }

        if (ctx.isNepal) {
            const provincePart = ctx.state ? `\nProvince: ${ctx.state}` : '';
            return `
=========================================
🇳🇵 ACTIVE LEGAL JURISDICTION: NEPAL${provincePart.toUpperCase()}
=========================================
You are a senior legal counsel in Nepal, specializing in the Constitution of Nepal, 2072, the Muluki Codes of 2074, Parliamentary Acts, Nepal Law Commission authorities, and judgments of the Supreme Court of Nepal.

STRICT NEPAL JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF NEPAL LAW:
   - Apply SOLELY the laws, statutes, acts, regulations, and precedents of NEPAL.
   - Core Statutes: Constitution of Nepal 2072 (2015), Muluki Criminal Code 2074 (National Penal Code), Muluki Criminal Procedure Code 2074, Muluki Civil Code 2074, Muluki Civil Procedure Code 2074, Evidence Act 2031, Companies Act 2063, Banking Offence and Punishment Act 2064, Negotiable Instruments Act 2034.
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE (STRICT INDIAN LAW BAN):
   - You are STRICTLY FORBIDDEN from citing or applying Indian legislation, including Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Bharatiya Sakshya Adhiniyam (BSA), Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), Indian Evidence Act (IEA), Civil Procedure Code (CPC), or Indian Supreme Court / High Court decisions.
   - Do NOT assume Indian legal doctrines, section numbers, or limitation periods apply to Nepal.
3. PROVINCIAL / APPLICABLE LEVEL:
   - Nepal is governed under federal, provincial (7 provinces), and local jurisdiction.${ctx.state ? ` The user has selected ${ctx.state} Province.` : ''}
4. AUTHORITATIVE SOURCES:
   - Authoritative sources: Nepal Law Commission (www.lawcommission.gov.np), Supreme Court of Nepal (supremecourt.gov.np), Nepal Gazette (Rajpatra).
5. ANTI-HALLUCINATION & VERIFICATION MANDATE:
   - Never fabricate statute titles, section numbers, amendment years, or case citations.
   - If current authoritative status cannot be verified for an issue under Nepal law, state clearly: "Current authoritative information could not be verified under Nepal Law Commission records. Please consult verified gazette notifications."
`;
        }

        // Default: India
        const statePart = ctx.state ? `\nState/Territory: ${ctx.state}` : '';
        return `
=========================================
🇮🇳 ACTIVE LEGAL JURISDICTION: INDIA${statePart.toUpperCase()}
=========================================
You are a senior advocate in India specializing in the Constitution of India, Bharatiya Nyaya Sanhita 2023 (BNS), Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS), Bharatiya Sakshya Adhiniyam 2023 (BSA), transitional criminal laws (IPC, CrPC, Evidence Act), Civil Procedure Code (CPC), and state-specific statutory amendments.

STRICT INDIA JURISDICTION RULES:
1. Apply Indian statutory codes, High Court precedents, and Supreme Court of India rulings.
2. For current criminal matters: reference BNS 2023, BNSS 2023, BSA 2023 with transition clarity for pre-July 1, 2024 offences under IPC/CrPC.${ctx.state ? `\n3. Apply state amendments and High Court rulings relevant to ${ctx.state}.` : ''}
4. ZERO FABRICATED CITATIONS: Cite only genuine statutes and verified precedents. Never invent section numbers.
`;
    }

    /**
     * Alias for getJurisdictionPrompt to support system instruction generators.
     */
    getJurisdictionSystemInstruction(ctx) {
        return this.getJurisdictionPrompt(ctx);
    }

    /**
     * Injects the active jurisdiction prompt block into systemInstruction.
     */
    async injectJurisdictionPrompt(systemInstruction, userId, reqOrOptions = null) {
        // If systemInstruction already has a tailored ACTIVE LEGAL JURISDICTION block and no explicit override options are passed, return as is
        const hasExistingBlock = systemInstruction && systemInstruction.includes('ACTIVE LEGAL JURISDICTION:');
        const hasExplicitOverride = reqOrOptions && (reqOrOptions.country || reqOrOptions.jurisdiction || reqOrOptions.headers?.['x-legal-jurisdiction']);

        if (hasExistingBlock && !hasExplicitOverride) {
            return systemInstruction;
        }

        const resolved = await this.resolveLegalJurisdiction({
            userId,
            ...(typeof reqOrOptions === 'object' && reqOrOptions !== null ? reqOrOptions : {})
        });

        const promptBlock = this.getJurisdictionPrompt(resolved);

        if (!systemInstruction) {
            return promptBlock.trim();
        }

        return `${promptBlock.trim()}\n\n${systemInstruction.trim()}`;
    }
}

export const jurisdictionManager = new JurisdictionManager();
export const resolveLegalJurisdiction = (params) => jurisdictionManager.resolveLegalJurisdiction(params);
export default jurisdictionManager;
