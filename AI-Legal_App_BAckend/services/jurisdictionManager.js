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
    AM: 'Armenia',
    US: 'United States',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    AE: 'United Arab Emirates',
    DE: 'Germany',
    FR: 'France',
    SG: 'Singapore',
    MY: 'Malaysia',
    ZA: 'South Africa',
    NZ: 'New Zealand',
    JP: 'Japan',
    KR: 'South Korea',
    BR: 'Brazil',
    RU: 'Russia',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    CH: 'Switzerland',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    IE: 'Ireland',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    KW: 'Kuwait',
    OM: 'Oman',
    BD: 'Bangladesh',
    LK: 'Sri Lanka',
    PK: 'Pakistan',
    BT: 'Bhutan',
    MV: 'Maldives'
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
            const trimmed = jurisdictionData.trim();
            const upper = trimmed.toUpperCase();
            let code = 'GLOBAL';
            if (trimmed.toLowerCase() === 'nepal' || upper === 'NP') code = 'NP';
            else if (trimmed.toLowerCase() === 'india' || upper === 'IN') code = 'IN';
            else if (trimmed.toLowerCase() === 'armenia' || upper === 'AM') code = 'AM';
            else if (COUNTRY_MAP[upper]) code = upper;

            this.temporaryOverrides.set(uId, {
                country: COUNTRY_MAP[upper] || trimmed,
                state: '',
                countryCode: code
            });
        } else if (jurisdictionData && typeof jurisdictionData === 'object') {
            const countryName = jurisdictionData.country || 'India';
            const countryCode = jurisdictionData.countryCode || 
                (countryName.toLowerCase() === 'nepal' ? 'NP' : 
                (countryName.toLowerCase() === 'india' ? 'IN' : 
                (countryName.toLowerCase() === 'armenia' ? 'AM' : 'GLOBAL')));

            this.temporaryOverrides.set(uId, {
                country: countryName,
                state: jurisdictionData.state || '',
                countryCode
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
                const upper = trimmed.toUpperCase();
                const cleanCode = (explicitCode || '').toUpperCase();

                if (trimmed.toLowerCase().includes('nepal') || upper === 'NP') {
                    resolvedCountry = 'Nepal';
                    resolvedCode = 'NP';
                } else if (trimmed.toLowerCase().includes('india') || upper === 'IN') {
                    resolvedCountry = 'India';
                    resolvedCode = 'IN';
                } else if (trimmed.toLowerCase().includes('armenia') || upper === 'AM') {
                    resolvedCountry = 'Armenia';
                    resolvedCode = 'AM';
                } else if (COUNTRY_MAP[upper]) {
                    resolvedCountry = COUNTRY_MAP[upper];
                    resolvedCode = upper;
                } else if (COUNTRY_MAP[cleanCode]) {
                    resolvedCountry = COUNTRY_MAP[cleanCode];
                    resolvedCode = cleanCode;
                } else {
                    resolvedCountry = trimmed;
                    resolvedCode = cleanCode || 'GLOBAL';
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
        const isArmenia = (resolvedCountry.toLowerCase() === 'armenia' || resolvedCode === 'AM');

        if (isNepal) {
            resolvedCountry = 'Nepal';
            resolvedCode = 'NP';
        } else if (isIndia) {
            resolvedCountry = 'India';
            resolvedCode = 'IN';
        } else if (isArmenia) {
            resolvedCountry = 'Armenia';
            resolvedCode = 'AM';
        }

        const stateClean = resolvedState ? String(resolvedState).trim() : '';
        const jurisdictionType = isNepal
            ? (stateClean ? 'province' : 'national')
            : (isIndia ? (stateClean ? 'state' : 'federal') : (stateClean ? 'state' : 'national'));

        const label = stateClean ? `${resolvedCountry} — ${stateClean}` : resolvedCountry;

        let authoritativeSources = [];
        if (isNepal) {
            authoritativeSources = ['Nepal Law Commission (lawcommission.gov.np)', 'Supreme Court of Nepal (supremecourt.gov.np)', 'Ministry of Law, Justice and Parliamentary Affairs (molpa.gov.np)'];
        } else if (isIndia) {
            authoritativeSources = ['India Code (indiacode.nic.in)', 'Supreme Court of India (sci.gov.in)', 'High Courts of India', 'The Gazette of India (egazette.gov.in)'];
        } else if (isArmenia) {
            authoritativeSources = ['ARLIS Legal Information System (arlis.am)', 'Ministry of Justice of Armenia (moj.am)', 'Court of Cassation of Armenia (court.am)', 'Constitutional Court of Armenia (concourt.am)'];
        } else if (resolvedCountry === 'United States' || resolvedCode === 'US') {
            authoritativeSources = ['United States Code (law.cornell.edu/uscode)', 'Supreme Court of the United States (supremecourt.gov)', 'Federal Register (federalregister.gov)'];
        } else if (resolvedCountry === 'United Kingdom' || resolvedCode === 'GB' || resolvedCode === 'UK') {
            authoritativeSources = ['The National Archives Legislation (legislation.gov.uk)', 'Supreme Court of the UK (supremecourt.uk)', 'BAILII (bailii.org)'];
        } else if (resolvedCountry === 'Canada' || resolvedCode === 'CA') {
            authoritativeSources = ['Justice Laws Website (laws-lois.justice.gc.ca)', 'Supreme Court of Canada (scc-csc.ca)', 'CanLII (canlii.org)'];
        } else if (resolvedCountry === 'Australia' || resolvedCode === 'AU') {
            authoritativeSources = ['Federal Register of Legislation (legislation.gov.au)', 'High Court of Australia (hcourt.gov.au)', 'AustLII (austlii.edu.au)'];
        } else if (resolvedCountry === 'United Arab Emirates' || resolvedCode === 'AE') {
            authoritativeSources = ['UAE Federal Legislation (elaws.gov.ae)', 'Ministry of Justice (moj.gov.ae)', 'Dubai Courts (dc.gov.ae)'];
        } else {
            authoritativeSources = [
                `Official Legal Portal & Gazette of ${resolvedCountry}`,
                `Apex Supreme Court / Court of Cassation of ${resolvedCountry}`,
                `Ministry of Justice of ${resolvedCountry}`
            ];
        }

        const contextObj = {
            country: resolvedCountry,
            countryCode: resolvedCode || (isNepal ? 'NP' : (isIndia ? 'IN' : (isArmenia ? 'AM' : 'GLOBAL'))),
            state: stateClean,
            province: isNepal ? stateClean : (isArmenia ? stateClean : ''),
            jurisdictionType,
            legalSystem: isNepal ? 'Nepal Legal System' : (isIndia ? 'Indian Legal System' : `${resolvedCountry} Legal System`),
            isNepal,
            isIndia,
            isArmenia,
            isComparative,
            source: resolutionSource,
            label,
            authoritativeSources,
            profile: this.getJurisdictionProfile({ isNepal, isIndia, isArmenia, country: resolvedCountry, countryCode: resolvedCode })
        };

        logger.info(`[JurisdictionResolver] Target: ${label} | Code: ${contextObj.countryCode} | PrioritySource: ${resolutionSource} | Comparative: ${isComparative}`);
        return contextObj;
    }

    /**
     * Complete statutory and procedural profile for any jurisdiction.
     */
    getJurisdictionProfile(jurisdictionOrContext) {
        const countryStr = typeof jurisdictionOrContext === 'object'
            ? String(jurisdictionOrContext?.country || '').toLowerCase()
            : String(jurisdictionOrContext || '').toLowerCase();
        const countryCode = typeof jurisdictionOrContext === 'object'
            ? String(jurisdictionOrContext?.countryCode || '').toUpperCase()
            : '';

        const isNepal = countryStr === 'nepal' || countryCode === 'NP';
        const isIndia = countryStr === 'india' || countryCode === 'IN';
        const isArmenia = countryStr === 'armenia' || countryCode === 'AM';

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

        if (isArmenia) {
            return {
                country: 'Armenia',
                countryCode: 'AM',
                currency: 'AMD',
                currencySymbol: '֏',
                capitalCity: 'Yerevan',
                constitution: 'Constitution of the Republic of Armenia (1995, as amended 2015)',
                criminalCode: 'Criminal Code of the Republic of Armenia (2021)',
                criminalProcedure: 'Criminal Procedure Code of the Republic of Armenia (2021)',
                civilCode: 'Civil Code of the Republic of Armenia (1998)',
                civilProcedure: 'Civil Procedure Code of the Republic of Armenia (2018)',
                evidenceAct: 'Procedural Evidentiary Standards of the Republic of Armenia',
                electronicTransactionsAct: 'Law of the Republic of Armenia on Electronic Documents and Electronic Digital Signature',
                commercialLaws: 'Law on Joint Stock Companies, Law on Limited Liability Companies, Law on Bankruptcy',
                policeReportName: 'Police Crime Report / Report of Crime (Հաղորդում հանցագործության մասին)',
                courtHierarchy: [
                    'First Instance Court of General Jurisdiction (Առաջին ատյանի դատարան)',
                    'Court of Appeal (Վերաքննիչ դատարան)',
                    'Court of Cassation of the Republic of Armenia (Վճռաբեկ դատարան)',
                    'Constitutional Court of Armenia (Սահմանադրական դատարան)'
                ],
                apexCourt: 'Court of Cassation of the Republic of Armenia',
                citationFormat: 'ARLIS Official Acts / Court of Cassation Decisions (datalex.am)',
                authoritativePortal: 'ARLIS Legal Database (www.arlis.am)'
            };
        }

        if (isIndia) {
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

        // Global Sovereign Country Profile
        const countryNameCap = typeof jurisdictionOrContext === 'object' && jurisdictionOrContext?.country
            ? jurisdictionOrContext.country
            : 'National Jurisdiction';

        return {
            country: countryNameCap,
            countryCode: countryCode || 'GLOBAL',
            currency: 'Local Currency',
            currencySymbol: '¤',
            capitalCity: 'National Capital',
            constitution: `Constitution of ${countryNameCap}`,
            criminalCode: `Criminal / Penal Code of ${countryNameCap}`,
            criminalProcedure: `Code of Criminal Procedure of ${countryNameCap}`,
            civilCode: `Civil Code of ${countryNameCap}`,
            civilProcedure: `Code of Civil Procedure of ${countryNameCap}`,
            evidenceAct: `Law of Evidence of ${countryNameCap}`,
            commercialLaws: `Commercial & Company Laws of ${countryNameCap}`,
            policeReportName: 'Official Police Complaint / Crime Incident Report',
            courtHierarchy: [
                'First Instance Court / District Court',
                'Court of Appeal / High Court',
                'Supreme Court / Apex Judiciary'
            ],
            apexCourt: `Supreme Court of ${countryNameCap}`,
            citationFormat: `Official Gazette / Law Reports of ${countryNameCap}`,
            authoritativePortal: `Ministry of Justice of ${countryNameCap}`
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
