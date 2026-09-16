import UserModel from "../models/User.js";
import logger from "../utils/logger.js";
import {
    COUNTRIES,
    COUNTRY_MAP,
    COUNTRY_NAME_TO_CODE,
    COUNTRY_CURRENCIES,
    COUNTRY_BY_CODE,
    DEMONYM_MAP,
    getCountryByNameOrCode
} from "../constants/countries.js";

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
            (lowerText.includes('compare') || lowerText.includes('vs') || lowerText.includes('versus') ||
             lowerText.includes('difference between') || lowerText.includes('differences between') ||
             lowerText.includes('comparison') || lowerText.includes('side by side')) &&
            ((lowerText.includes('nepal') && (lowerText.includes('india') || lowerText.includes('bns') || lowerText.includes('ipc') || lowerText.includes('us') || lowerText.includes('uk'))) ||
             (lowerText.includes('india') && (lowerText.includes('us') || lowerText.includes('uk') || lowerText.includes('uae'))) ||
             (lowerText.includes('us') && lowerText.includes('uk')))
        );

        let resolvedCountry = null;
        let resolvedState = null;
        let resolvedCode = null;
        let resolutionSource = 'default';

        // ─────────────────────────────────────────────────────────────
        // PRIORITY 1: Explicit jurisdiction in query text
        // ─────────────────────────────────────────────────────────────
        if (isComparative) {
            resolvedCountry = 'Comparative Law';
            resolvedCode = 'GLOBAL';
            resolutionSource = 'explicit_query';
        } else {
            // Target Law Regex Patterns (Explicit jurisdiction overrides requested by user)
            const targetUsRegex = /\b(?:under\s+(?:us|usa|united\s+states|american|california|new\s+york|texas|delaware|florida)\s+law|laws?\s+of\s+(?:the\s+)?(?:us|usa|united\s+states|california|new\s+york)|in\s+(?:the\s+)?(?:us|usa|united\s+states|california|new\s+york|texas|delaware|florida)|us\s+federal\s+law|american\s+legal\s+system|title\s+18(?:\s+of\s+the)?\s+u\.?s\.?c\.?|california\s+(?:business\s+and\s+professions\s+code|civil\s+code|penal\s+code|labor\s+code)|uniform\s+commercial\s+code|ucc|frcp|frcrp|scotus)\b/i;
            const targetUkRegex = /\b(?:under\s+(?:uk|english|british)\s+law|laws?\s+of\s+(?:the\s+)?(?:uk|united\s+kingdom|england|wales|scotland)|in\s+(?:the\s+)?(?:uk|united\s+kingdom|england|wales|scotland)|english\s+common\s+law|acts?\s+of\s+parliament|bills\s+of\s+exchange\s+act\s+1882|fraud\s+act\s+2006|limitation\s+act\s+1980|bailii|uksc|cpr\s+1998|english\s+legal\s+system)\b/i;
            const targetUaeRegex = /\b(?:under\s+(?:uae|dubai|abu\s+dhabi|emirati)\s+law|laws?\s+of\s+(?:the\s+)?(?:uae|dubai|abu\s+dhabi|united\s+arab\s+emirates)|in\s+(?:the\s+)?(?:uae|dubai|abu\s+dhabi|united\s+arab\s+emirates)|uae\s+federal\s+(?:decree-)?law|federal\s+decree-law(?:\s+no\.)?|federal\s+law\s+no\.|court\s+of\s+execution|difc(?:\s+courts)?|adgm(?:\s+courts)?)\b/i;
            const targetIndiaRegex = /\b(?:under\s+indian?\s+law|laws?\s+of\s+india|indian?\s+law|under\s+india\s+law|bns(?:\s+2023)?|bnss(?:\s+2023)?|bsa(?:\s+2023)?|ipc(?:\s+1860)?|crpc(?:\s+1973)?|supreme\s+court\s+of\s+india|high\s+court\s+of|india\s+code|section\s+138|negotiable\s+instruments\s+act(?:\s+1881)?)\b/i;
            const targetNepalRegex = /\b(?:under\s+nepal(?:ese|i)?\s+law|laws?\s+of\s+nepal|nepal(?:ese|i)?\s+law|nepal\s+legal|nepal\s+supreme\s+court|nepal\s+law\s+commission|muluki\s+code|muluki\s+ain|muluki\s+aparadh|muluki\s+devani|banking\s+offence\s+and\s+punishment\s+act(?:\s+2064)?|negotiable\s+instruments\s+act\s+2034|electronic\s+transactions\s+act\s+2063)\b/i;

            if (targetUsRegex.test(lowerText)) {
                resolvedCountry = 'United States';
                resolvedCode = 'US';
                resolutionSource = 'explicit_query';
                if (lowerText.includes('california')) resolvedState = 'California';
                else if (lowerText.includes('new york')) resolvedState = 'New York';
                else if (lowerText.includes('texas')) resolvedState = 'Texas';
                else if (lowerText.includes('delaware')) resolvedState = 'Delaware';
                else if (lowerText.includes('florida')) resolvedState = 'Florida';
            } else if (targetUkRegex.test(lowerText)) {
                resolvedCountry = 'United Kingdom';
                resolvedCode = 'GB';
                resolutionSource = 'explicit_query';
                if (lowerText.includes('scotland')) resolvedState = 'Scotland';
                else if (lowerText.includes('northern ireland')) resolvedState = 'Northern Ireland';
                else resolvedState = 'England & Wales';
            } else if (targetUaeRegex.test(lowerText)) {
                resolvedCountry = 'United Arab Emirates';
                resolvedCode = 'AE';
                resolutionSource = 'explicit_query';
                if (lowerText.includes('dubai')) resolvedState = 'Dubai';
                else if (lowerText.includes('abu dhabi')) resolvedState = 'Abu Dhabi';
                else if (lowerText.includes('sharjah')) resolvedState = 'Sharjah';
            } else if (targetIndiaRegex.test(lowerText)) {
                resolvedCountry = 'India';
                resolvedCode = 'IN';
                resolutionSource = 'explicit_query';
                if (lowerText.includes('delhi')) resolvedState = 'Delhi (NCT)';
                else if (lowerText.includes('maharashtra') || lowerText.includes('mumbai')) resolvedState = 'Maharashtra';
                else if (lowerText.includes('karnataka') || lowerText.includes('bengaluru') || lowerText.includes('bangalore')) resolvedState = 'Karnataka';
            } else if (targetNepalRegex.test(lowerText) || /नेपाल|काठमाडौं|हेटौंडा|पोखरा|मुलुकी|ऐन|देवानी|फौजदारी|जाहेरी|दरखास्त/.test(combinedText)) {
                resolvedCountry = 'Nepal';
                resolvedCode = 'NP';
                resolutionSource = 'explicit_query';
                for (const p of NEPAL_PROVINCES) {
                    if (lowerText.includes(p.toLowerCase())) {
                        resolvedState = p;
                        break;
                    }
                }
            } else {
                // Check demonyms first across all supported countries (e.g., Canadian, German, Australian, French, Singaporean)
                for (const [demonym, dCountry] of Object.entries(DEMONYM_MAP)) {
                    const dPattern = new RegExp(`\\b(?:under\\s+${demonym}\\s+law|laws?\\s+of\\s+${demonym}|${demonym}\\s+(?:law|legal|act|court|statute|penal|criminal|code|constitution|rights|jurisdiction|precedents?))\\b`, 'i');
                    if (dPattern.test(lowerText)) {
                        const meta = getCountryByNameOrCode(dCountry);
                        if (meta) {
                            resolvedCountry = meta.name;
                            resolvedCode = meta.code;
                            resolutionSource = 'explicit_query';
                            break;
                        }
                    }
                }

                // Check all 195 countries dynamically
                if (!resolvedCountry) {
                    const legalKeywordPattern = /\b(?:laws?|legal|courts?|penal|statutes?|acts?|criminal|civil|theft|murder|contracts?|divorce|propert(?:y|ies)|bail|cheques?|fines?|penalt(?:y|ies)|offences?|crimes?|rights|custody|arrest|codes?|constitution|procedures?|damages?|suits?|jurisdiction|cases?|sentence|jail|prison|leases?|tenants?|landlords?|employment|employees?|employers?|labou?r|inheritance|wills?|probate|rules?|eviction|corporate|tax(?:es)?|trademarks?|patents?|copyrights?|defamation|fraud|compliance)\b/i;

                    for (const c of COUNTRIES) {
                        const cLower = c.name.toLowerCase();
                        // 1. Direct under/of/in legal syntax
                        // Allows up to 2 modifier words e.g. "Singapore employment law", "German commercial code", "laws of Canada"
                        const cPattern = new RegExp(`\\b(?:under\\s+${cLower}\\s+law|laws?\\s+of\\s+${cLower}|${cLower}(?:\\s+[a-z]+){0,2}\\s+(?:laws?|legal(?:\\s+system)?|statutes?|acts?|courts?|codes?|jurisdiction|regulations?))\\b`, 'i');
                        if (cPattern.test(lowerText)) {
                            resolvedCountry = c.name;
                            resolvedCode = c.code;
                            resolutionSource = 'explicit_query';
                            break;
                        }

                        // 2. Check "in <country>" + legal keyword (e.g. "rules in France for lease", "penalty for theft in Canada", "divorce in Japan")
                        const inPattern = new RegExp(`\\bin\\s+${cLower}\\b`, 'i');
                        if (inPattern.test(lowerText)) {
                            if (legalKeywordPattern.test(lowerText)) {
                                resolvedCountry = c.name;
                                resolvedCode = c.code;
                                resolutionSource = 'explicit_query';
                                break;
                            }
                        }
                    }
                }
            }
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

                const meta = getCountryByNameOrCode(trimmed) || getCountryByNameOrCode(cleanCode) || getCountryByNameOrCode(upper);
                if (meta) {
                    resolvedCountry = meta.name;
                    resolvedCode = meta.code;
                } else if (trimmed.toLowerCase().includes('nepal') || upper === 'NP') {
                    resolvedCountry = 'Nepal';
                    resolvedCode = 'NP';
                } else if (trimmed.toLowerCase().includes('india') || upper === 'IN') {
                    resolvedCountry = 'India';
                    resolvedCode = 'IN';
                } else if (trimmed.toLowerCase().includes('armenia') || upper === 'AM') {
                    resolvedCountry = 'Armenia';
                    resolvedCode = 'AM';
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

        // Normalize country name and code using authoritative 195-country directory
        const countryMeta = getCountryByNameOrCode(resolvedCountry) || getCountryByNameOrCode(resolvedCode);
        if (countryMeta) {
            resolvedCountry = countryMeta.name;
            resolvedCode = countryMeta.code;
        }

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
        } else if (resolvedCountry === 'Germany' || resolvedCode === 'DE') {
            authoritativeSources = ['Gesetze im Internet (gesetze-im-internet.de)', 'Bundesverfassungsgericht (bundesverfassungsgericht.de)', 'Bundesgerichtshof (bundesgerichtshof.de)'];
        } else if (resolvedCountry === 'France' || resolvedCode === 'FR') {
            authoritativeSources = ['Légifrance (legifrance.gouv.fr)', 'Cour de cassation (courdecassation.fr)', 'Conseil d\'État (conseil-etat.fr)'];
        } else if (resolvedCountry === 'Singapore' || resolvedCode === 'SG') {
            authoritativeSources = ['Singapore Statutes Online (sso.agc.gov.sg)', 'Supreme Court of Singapore (judiciary.gov.sg)', 'LawNet Singapore'];
        } else if (resolvedCountry === 'Bangladesh' || resolvedCode === 'BD') {
            authoritativeSources = ['Laws of Bangladesh (bdlaws.minlaw.gov.bd)', 'Supreme Court of Bangladesh (supremecourt.gov.bd)'];
        } else if (resolvedCountry === 'Pakistan' || resolvedCode === 'PK') {
            authoritativeSources = ['Pakistan Code (pakistancode.gov.pk)', 'Supreme Court of Pakistan (supremecourt.gov.pk)'];
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

        const isUSA = countryStr === 'united states' || countryStr === 'usa' || countryStr === 'us' || countryCode === 'US';
        if (isUSA) {
            return {
                country: 'United States',
                countryCode: 'US',
                currency: 'USD',
                currencySymbol: '$',
                capitalCity: 'Washington, D.C.',
                constitution: 'Constitution of the United States of America (1787)',
                criminalCode: 'Title 18, United States Code (Crimes and Criminal Procedure) & State Penal Codes (e.g. California Penal Code)',
                criminalProcedure: 'Federal Rules of Criminal Procedure (FRCrP) & State Rules of Criminal Procedure',
                civilCode: 'Uniform Commercial Code (UCC) & State Civil Codes (e.g. California Civil Code)',
                civilProcedure: 'Federal Rules of Civil Procedure (FRCP) & State Codes of Civil Procedure',
                evidenceAct: 'Federal Rules of Evidence (FRE) & State Evidence Codes',
                electronicTransactionsAct: 'Electronic Signatures in Global and National Commerce Act (E-SIGN Act) & UETA',
                commercialLaws: 'Uniform Commercial Code (UCC), Delaware General Corporation Law (DGCL), Securities Act of 1933, Securities Exchange Act of 1934',
                policeReportName: 'Police Incident Report / Criminal Complaint',
                courtHierarchy: [
                    'United States District Courts / State Superior Courts',
                    'United States Courts of Appeals (Circuit Courts) / State Courts of Appeal',
                    'Supreme Court of the United States (SCOTUS) / State Supreme Courts'
                ],
                apexCourt: 'Supreme Court of the United States (SCOTUS)',
                citationFormat: 'U.S. / F.3d / F.Supp.3d / Cal.Rptr.3d',
                authoritativePortal: 'United States Code (law.cornell.edu/uscode) / Supreme Court (supremecourt.gov)'
            };
        }

        const isUK = countryStr === 'united kingdom' || countryStr === 'uk' || countryStr === 'gb' || countryCode === 'GB' || countryCode === 'UK';
        if (isUK) {
            return {
                country: 'United Kingdom',
                countryCode: 'GB',
                currency: 'GBP',
                currencySymbol: '£',
                capitalCity: 'London',
                constitution: 'Unwritten Constitution of the United Kingdom (Constitutional Statutes, Conventions, Common Law)',
                criminalCode: 'English Common Law, Fraud Act 2006, Theft Act 1968, Offences Against the Person Act 1861',
                criminalProcedure: 'Criminal Procedure Rules (CrimPR) & Police and Criminal Evidence Act 1984 (PACE)',
                civilCode: 'English Common Law of Contract & Tort, Sale of Goods Act 1979, Consumer Rights Act 2015',
                civilProcedure: 'Civil Procedure Rules 1998 (CPR)',
                evidenceAct: 'Civil Evidence Act 1995 & Police and Criminal Evidence Act 1984',
                electronicTransactionsAct: 'Electronic Communications Act 2000',
                commercialLaws: 'Companies Act 2006, Bills of Exchange Act 1882, Insolvency Act 1986, Partnership Act 1890',
                policeReportName: 'Crime Incident Report / Police Crime Reference Number (URN)',
                courtHierarchy: [
                    'County Court / Magistrates\' Court',
                    'High Court of Justice (King\'s Bench, Chancery, Family) / Crown Court',
                    'Court of Appeal (Civil & Criminal Divisions)',
                    'Supreme Court of the United Kingdom (UKSC)'
                ],
                apexCourt: 'Supreme Court of the United Kingdom (UKSC)',
                citationFormat: '[Year] UKSC / [Year] EWCA Civ / [Year] EWHC / WLR / AC',
                authoritativePortal: 'The National Archives Legislation (www.legislation.gov.uk) / BAILII (bailii.org)'
            };
        }

        const isUAE = countryStr === 'united arab emirates' || countryStr === 'uae' || countryStr === 'ae' || countryCode === 'AE';
        if (isUAE) {
            return {
                country: 'United Arab Emirates',
                countryCode: 'AE',
                currency: 'AED',
                currencySymbol: 'د.إ',
                capitalCity: 'Abu Dhabi',
                constitution: 'Constitution of the United Arab Emirates (1971)',
                criminalCode: 'Federal Decree-Law No. 31 of 2021 (Crimes and Penalties Law)',
                criminalProcedure: 'Federal Decree-Law No. 38 of 2022 (Criminal Procedure Law)',
                civilCode: 'Federal Law No. 5 of 1985 (Civil Transactions Law)',
                civilProcedure: 'Federal Decree-Law No. 42 of 2022 (Civil Procedure Law)',
                evidenceAct: 'Federal Decree-Law No. 35 of 2022 (Law of Evidence in Civil and Commercial Transactions)',
                electronicTransactionsAct: 'Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services',
                commercialLaws: 'Federal Decree-Law No. 50 of 2022 (Commercial Transactions Law), Federal Decree-Law No. 32 of 2021 (Commercial Companies), Federal Decree-Law No. 14 of 2020 (Decriminalization of Cheques / Direct Execution)',
                policeReportName: 'Police Report / Criminal Complaint (بلاغ شرطة)',
                courtHierarchy: [
                    'Court of First Instance (المحكمة الابتدائية)',
                    'Court of Appeal (محكمة الاستئناف)',
                    'Court of Cassation (Dubai / Abu Dhabi) / Federal Supreme Court (محكمة التمييز / المحكمة الاتحادية العليا)',
                    'DIFC Courts / ADGM Courts (English Common Law financial free zones)'
                ],
                apexCourt: 'Court of Cassation (Dubai / Abu Dhabi) / Federal Supreme Court',
                citationFormat: 'Federal Gazette / Dubai Court of Cassation Judgment Reference',
                authoritativePortal: 'UAE Legislation Portal (uaelegislation.gov.ae / elaws.gov.ae)'
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
     * Generates a strict, jurisdiction-specific system prompt block.
     * Guaranteed to prevent cross-border legal contamination.
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
You are a senior comparative law scholar. The user has explicitly requested a comparative analysis between multiple legal systems.
1. Clearly differentiate between the statutory frameworks of each country.
2. For Nepal: cite the Constitution of Nepal 2072, Muluki Criminal Code 2074, Muluki Civil Code 2074, Banking Offence Act 2064, and Nepal Supreme Court precedents.
3. For India: cite the Bharatiya Nyaya Sanhita 2023 (BNS), BNSS 2023, BSA 2023 / IPC, CrPC, NI Act 1881, and Supreme Court of India precedents.
4. For United States: cite US Code, UCC, FRCP, California/State codes, and SCOTUS precedents.
5. For United Kingdom: cite English Common Law, UK Acts of Parliament, CPR, and UKSC precedents.
6. For UAE: cite UAE Federal Decree-Laws (No. 31/2021, No. 42/2022, No. 50/2022), and Dubai/Federal Cassation rulings.
7. Present differences side-by-side or in clean Markdown comparison tables.
`;
        }

        const countryStr = String(ctx.country || '').toLowerCase();
        const countryCode = String(ctx.countryCode || '').toUpperCase();

        const explicitQueryNote = (ctx.source === 'explicit_query')
            ? `\n🌍 CROSS-BORDER QUERY DIRECTIVE: The user has explicitly queried the legal system of ${ctx.country}${ctx.state ? ` (${ctx.state})` : ''}. Deliver authoritative, comprehensive legal analysis strictly under ${ctx.country} law and procedural codes as requested, irrespective of the user's personal location or account registration.\n`
            : '';

        if (ctx.isNepal || countryStr === 'nepal' || countryCode === 'NP') {
            const provincePart = ctx.state ? `\nProvince: ${ctx.state}` : '';
            return `
=========================================
🇳🇵 ACTIVE LEGAL JURISDICTION: NEPAL${provincePart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Legal Counsel in Nepal, specializing in the Constitution of Nepal 2072, the Muluki Codes of 2074, Parliamentary Acts, Nepal Law Commission authorities, and judgments of the Supreme Court of Nepal.

STRICT NEPAL JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF NEPAL LAW:
   - Apply SOLELY the laws, statutes, acts, regulations, and precedents of NEPAL.
   - Core Statutes: Constitution of Nepal 2072 (2015), Muluki Criminal Code 2074 (National Penal Code), Muluki Criminal Procedure Code 2074, Muluki Civil Code 2074, Muluki Civil Procedure Code 2074, Evidence Act 2031 (1974), Companies Act 2063, Banking Offence and Punishment Act 2064, Negotiable Instruments Act 2034, Electronic Transactions Act 2063.
   - Currency: All monetary damages, bail amounts, and penalties MUST be expressed in Nepalese Rupees (NPR / रू).
   - Police/Complaint terminology: Jaheri Darkhast (जाहेरी दरखास्त) / FIR.
   - Court Hierarchy: District Court (जिल्ला अदालत) -> High Court (उच्च अदालत) -> Supreme Court of Nepal (सर्वोच्च अदालत).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE (ABSOLUTE BAN ON INDIAN STATUTES):
   - You are STRICTLY FORBIDDEN from citing or applying Indian legislation, including Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Bharatiya Sakshya Adhiniyam (BSA), Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), Indian Evidence Act (IEA), Negotiable Instruments Act 1881 Section 138, Civil Procedure Code (CPC), or Indian Supreme Court / High Court decisions.
   - Do NOT assume Indian legal doctrines, section numbers, or limitation periods apply to Nepal.
3. PROVINCIAL / APPLICABLE LEVEL:
   - Nepal is governed under federal, provincial (7 provinces), and local jurisdiction.${ctx.state ? ` The user has selected ${ctx.state} Province.` : ''}
4. AUTHORITATIVE SOURCES:
   - Authoritative sources: Nepal Law Commission (www.lawcommission.gov.np), Supreme Court of Nepal (supremecourt.gov.np), Nepal Gazette (Rajpatra).
5. ANTI-HALLUCINATION & VERIFICATION MANDATE:
   - Never fabricate statute titles, section numbers, amendment years, or case citations.
`;
        }

        if (countryStr === 'united states' || countryStr === 'usa' || countryStr === 'us' || countryCode === 'US') {
            const statePart = ctx.state ? `\nState Jurisdiction: ${ctx.state}` : '';
            return `
=========================================
🇺🇸 ACTIVE LEGAL JURISDICTION: UNITED STATES${statePart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior US Attorney and Legal Specialist, licensed and practicing under United States Federal Law and applicable State Jurisdictions${ctx.state ? ` (${ctx.state})` : ''}.

STRICT US JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF US LAW:
   - Apply SOLELY United States Federal Law (United States Code - U.S.C., Code of Federal Regulations - CFR) and applicable State Law${ctx.state ? ` (${ctx.state} Codes, e.g. Civil Code, Penal Code, Business and Professions Code)` : ''}.
   - Commercial / Contract Law: Uniform Commercial Code (UCC) as adopted by the state, Restatement (Second) of Contracts.
   - Civil Procedure: Federal Rules of Civil Procedure (FRCP) and State Rules of Civil Procedure.
   - Criminal Procedure: Federal Rules of Criminal Procedure (FRCrP), Fourth/Fifth/Sixth Amendment jurisprudence, and State Penal Codes.
   - Currency: All monetary amounts, settlements, contract values, and penalties MUST be expressed in US Dollars (USD / $).
   - Court Hierarchy: US District Courts / State Superior Courts -> US Circuit Courts of Appeals / State Courts of Appeal -> Supreme Court of the United States (SCOTUS) / State Supreme Court.
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (IPC, BNS, CrPC, BNSS, BSA, CPC, NI Act 138), UK Acts, or any non-US foreign codes.
   - Do NOT use foreign legal terminology (e.g. do NOT mention FIR, Jaheri Darkhast, Vakalatnama, or Lok Adalat). Use US legal terms: Complaint, Deposition, Motion to Dismiss, Summary Judgment, Subpoena, Discovery.
3. AUTHORITATIVE SOURCES:
   - United States Code (law.cornell.edu/uscode), Federal Register, Decisions of SCOTUS and US Federal/State appellate courts.
`;
        }

        if (countryStr === 'united kingdom' || countryStr === 'uk' || countryStr === 'gb' || countryCode === 'GB' || countryCode === 'UK') {
            const regionPart = ctx.state ? `\nJurisdiction Area: ${ctx.state}` : '\nJurisdiction: England & Wales';
            return `
=========================================
🇬🇧 ACTIVE LEGAL JURISDICTION: UNITED KINGDOM${regionPart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Barrister / Solicitor in the United Kingdom, specializing in English Common Law, UK Acts of Parliament, and Statutory Instruments.

STRICT UK JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF UK / ENGLISH LAW:
   - Apply SOLELY the laws of England and Wales / United Kingdom Acts of Parliament.
   - Core Statutes: Fraud Act 2006, Theft Act 1968, Bills of Exchange Act 1882, Companies Act 2006, Sale of Goods Act 1979, Consumer Rights Act 2015, Employment Rights Act 1996, Senior Courts Act 1981, Civil Procedure Rules (CPR) 1998, Criminal Procedure Rules (CrimPR).
   - Currency: All monetary damages, fees, and penalties MUST be expressed in British Pounds (GBP / £).
   - Court Hierarchy: County Court / Magistrates' Court -> Crown Court / High Court of Justice (King's Bench, Chancery) -> Court of Appeal -> Supreme Court of the United Kingdom (UKSC).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, BNSS, BSA, IPC, CrPC, CPC), US Codes, or other non-UK laws.
   - Use correct English legal terminology: Claim Form, Particulars of Claim, Barrister, Solicitor, High Court, UKSC.
3. AUTHORITATIVE SOURCES:
   - The National Archives Legislation (www.legislation.gov.uk), British and Irish Legal Information Institute (BAILII), UK Supreme Court decisions.
`;
        }

        if (countryStr === 'united arab emirates' || countryStr === 'uae' || countryStr === 'ae' || countryCode === 'AE') {
            const emiratePart = ctx.state ? `\nEmirate: ${ctx.state}` : '';
            return `
=========================================
🇦🇪 ACTIVE LEGAL JURISDICTION: UNITED ARAB EMIRATES${emiratePart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Legal Consultant in the United Arab Emirates, specializing in UAE Federal Laws, Decree-Laws, and the judicial systems of the UAE${ctx.state ? ` (including ${ctx.state} Courts and local regulations)` : ''}.

STRICT UAE JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF UAE LAW:
   - Apply SOLELY UAE Federal Laws and applicable Emirate laws / Free Zone regulations (DIFC / ADGM where relevant).
   - Core Statutes: Federal Decree-Law No. 31 of 2021 (Crimes and Penalties Law), Federal Decree-Law No. 42 of 2022 (Civil Procedure Law), Federal Decree-Law No. 50 of 2022 (Commercial Transactions Law), Federal Decree-Law No. 14 of 2020 (Decriminalization of Bounced Cheques & Direct Execution by Banks/Courts), Federal Law No. 5 of 1985 (Civil Transactions Law), Federal Decree-Law No. 33 of 2021 (Labour Law).
   - Currency: All monetary amounts, claim values, and penalties MUST be expressed in UAE Dirhams (AED / د.إ).
   - Court Hierarchy: Court of First Instance -> Court of Appeal -> Court of Cassation (Dubai / Abu Dhabi) / Federal Supreme Court. (For Common Law free zones: DIFC Courts / ADGM Courts).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, IPC, CrPC, NI Act 138), US Codes, or foreign enactments.
   - Note specifically on Cheque Bounce: Under UAE Federal Decree-Law No. 14 of 2020 (effective 2022), insufficient funds cheques are largely decriminalized into direct executive deeds executable directly through the Court of Execution, while fraud/bad-faith remains subject to penal penalties under the Penal Code. Never cite Indian NI Act 138.
3. AUTHORITATIVE SOURCES:
   - UAE Federal Legislation Portal (uaelegislation.gov.ae), Ministry of Justice (moj.gov.ae), Dubai Courts (dc.gov.ae).
`;
        }

        if (countryStr === 'canada' || countryCode === 'CA') {
            const provPart = ctx.state ? `\nProvince: ${ctx.state}` : '';
            return `
=========================================
🇨🇦 ACTIVE LEGAL JURISDICTION: CANADA${provPart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Canadian Barrister & Solicitor, specializing in Canadian Federal Legislation, Provincial Law${ctx.state ? ` (${ctx.state})` : ''}, and Supreme Court of Canada jurisprudence.

STRICT CANADA JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF CANADIAN LAW:
   - Apply SOLELY Canadian Federal Statutes and relevant Provincial enactments${ctx.state ? ` (${ctx.state})` : ''}.
   - Core Statutes: Constitution Acts 1867 to 1982, Canadian Charter of Rights and Freedoms, Criminal Code (R.S.C., 1985, c. C-46), Canada Business Corporations Act (CBCA) / Provincial Business Corporations Acts, Personal Information Protection and Electronic Documents Act (PIPEDA), Canada Labour Code / Provincial Employment Standards Acts.
   - For Quebec (if applicable): Civil Code of Quebec (CCQ). For all other provinces/territories: Common Law of contract, tort, and statutory law.
   - Currency: All monetary damages, bail values, fines, and claim limits MUST be expressed in Canadian Dollars (CAD / C$).
   - Court Hierarchy: Provincial/Territorial Courts -> Provincial Superior Courts -> Provincial Courts of Appeal -> Supreme Court of Canada (SCC). (Federal: Federal Court -> Federal Court of Appeal -> SCC).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, BNSS, BSA, IPC, CrPC, CPC, NI Act 138), US Codes, or other foreign laws.
   - Use correct Canadian legal terminology: Indictable Offence, Summary Conviction, Crown Attorney, SCC.
3. AUTHORITATIVE SOURCES:
   - Justice Laws Website (laws-lois.justice.gc.ca), Canadian Legal Information Institute (CanLII), Supreme Court of Canada (scc-csc.ca).
`;
        }

        if (countryStr === 'australia' || countryCode === 'AU') {
            const statePart = ctx.state ? `\nState/Territory: ${ctx.state}` : '';
            return `
=========================================
🇦🇺 ACTIVE LEGAL JURISDICTION: AUSTRALIA${statePart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Australian Barrister & Solicitor, specializing in Commonwealth Legislation, State/Territory Acts${ctx.state ? ` (${ctx.state})` : ''}, and High Court of Australia jurisprudence.

STRICT AUSTRALIA JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF AUSTRALIAN LAW:
   - Apply SOLELY Commonwealth Acts and applicable State/Territory laws${ctx.state ? ` (${ctx.state})` : ''}.
   - Core Statutes: Commonwealth of Australia Constitution Act, Criminal Code Act 1995 (Cth) & State Crimes Acts (e.g. Crimes Act 1900 NSW/VIC), Competition and Consumer Act 2010 (incorporating the Australian Consumer Law - ACL), Corporations Act 2001 (Cth), Fair Work Act 2009 (Cth), Privacy Act 1988 (Cth), Evidence Act 1995 (Cth/NSW).
   - Currency: All monetary penalties, compensation awards, and settlement figures MUST be expressed in Australian Dollars (AUD / A$).
   - Court Hierarchy: Magistrates/Local Courts -> District/County Courts -> State Supreme Courts -> High Court of Australia (HCA). (Federal: Federal Circuit and Family Court -> Federal Court of Australia -> HCA).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, IPC, CrPC, NI Act 138), US Codes, or foreign statutes.
3. AUTHORITATIVE SOURCES:
   - Federal Register of Legislation (legislation.gov.au), Australasian Legal Information Institute (AustLII), High Court of Australia (hcourt.gov.au).
`;
        }

        if (countryStr === 'germany' || countryCode === 'DE') {
            const landPart = ctx.state ? `\nBundesland: ${ctx.state}` : '';
            return `
=========================================
🇩🇪 ACTIVE LEGAL JURISDICTION: GERMANY (DEUTSCHLAND)${landPart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior German Rechtsanwalt / Jurist, specializing in German Federal Law (Bundesrecht) and European Union law as applied in the Federal Republic of Germany${ctx.state ? ` (${ctx.state})` : ''}.

STRICT GERMANY JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF GERMAN LAW:
   - Apply SOLELY German Federal Laws and relevant State statutes (Landesrecht).
   - Core Statutes: Grundgesetz (GG - Basic Law), Bürgerliches Gesetzbuch (BGB - Civil Code), Strafgesetzbuch (StGB - Criminal Code), Zivilprozessordnung (ZPO - Code of Civil Procedure), Strafprozessordnung (StPO - Code of Criminal Procedure), Handelsgesetzbuch (HGB - Commercial Code), Aktiengesetz (AktG) / GmbH-Gesetz (GmbHG).
   - Currency: All monetary claims, fines, and penalties MUST be expressed in Euros (EUR / €).
   - Court Hierarchy: Amtsgericht (AG) -> Landgericht (LG) -> Oberlandesgericht (OLG) -> Bundesgerichtshof (BGH) / Bundesverfassungsgericht (BVerfG).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, IPC, CrPC, CPC), US Codes, or common law concepts not found in German civil law.
3. AUTHORITATIVE SOURCES:
   - Gesetze im Internet (gesetze-im-internet.de), Bundesverfassungsgericht (bundesverfassungsgericht.de), Bundesgerichtshof (bundesgerichtshof.de).
`;
        }

        if (countryStr === 'france' || countryCode === 'FR') {
            return `
=========================================
🇫🇷 ACTIVE LEGAL JURISDICTION: FRANCE
=========================================${explicitQueryNote}
You are a Senior French Avocat / Jurist, specializing in French Civil Law, Codes, and French Judicial Precedents.

STRICT FRANCE JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF FRENCH LAW:
   - Apply SOLELY French Codes and European Union directives as applicable in France.
   - Core Statutes: Code civil (Civil Code), Code pénal (Penal Code), Code de commerce (Commercial Code), Code du travail (Labour Code), Code de procédure civile (CPC), Code de procédure pénale (CPP).
   - Currency: All monetary sums, damage awards, and penalties MUST be expressed in Euros (EUR / €).
   - Court Hierarchy: Tribunal judiciaire -> Cour d'appel -> Cour de cassation (Judicial branch); Tribunal administratif -> Cour administrative d'appel -> Conseil d'État (Administrative branch).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, IPC, CrPC), US Codes, or foreign statutes.
3. AUTHORITATIVE SOURCES:
   - Légifrance (legifrance.gouv.fr), Cour de cassation (courdecassation.fr), Conseil d'État (conseil-etat.fr).
`;
        }

        if (countryStr === 'singapore' || countryCode === 'SG') {
            return `
=========================================
🇸🇬 ACTIVE LEGAL JURISDICTION: SINGAPORE
=========================================${explicitQueryNote}
You are a Senior Singapore Advocate and Solicitor, specializing in Singapore Statutes, Common Law, and Court of Appeal precedents.

STRICT SINGAPORE JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF SINGAPORE LAW:
   - Apply SOLELY Singapore Acts of Parliament and Singapore judicial precedents.
   - Core Statutes: Constitution of the Republic of Singapore, Penal Code 1871 (2020 Rev. Ed.), Criminal Procedure Code 2010, Companies Act 1967, Employment Act 1968, Personal Data Protection Act 2012 (PDPA), State Courts Act 1970, Supreme Court of Judicature Act 1969, Rules of Court 2021.
   - Currency: All monetary claims, fines, statutory thresholds, and penalties MUST be expressed in Singapore Dollars (SGD / S$).
   - Court Hierarchy: State Courts (Magistrates' Courts, District Courts, Small Claims Tribunals) -> General Division of the High Court -> Appellate Division of the High Court -> Court of Appeal of Singapore (Apex Court). (For international commercial disputes: Singapore International Commercial Court - SICC).
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (BNS, BNSS, BSA, IPC, CrPC, CPC, NI Act 138), US Codes, or other foreign enactments.
3. AUTHORITATIVE SOURCES:
   - Singapore Statutes Online (sso.agc.gov.sg), Singapore Courts (judiciary.gov.sg), LawNet Singapore.
`;
        }

        if (countryStr === 'bangladesh' || countryCode === 'BD') {
            return `
=========================================
🇧🇩 ACTIVE LEGAL JURISDICTION: BANGLADESH
=========================================${explicitQueryNote}
You are a Senior Advocate of the Supreme Court of Bangladesh, specializing in the Constitution of Bangladesh and statutory enactments.

STRICT BANGLADESH JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF BANGLADESH LAW:
   - Apply SOLELY Bangladesh Acts, Ordinances, and Supreme Court rulings.
   - Core Statutes: Constitution of the People's Republic of Bangladesh, Penal Code 1860 (Act XLV of 1860), Code of Criminal Procedure 1898 (CrPC), Code of Civil Procedure 1908 (CPC), Evidence Act 1872, Negotiable Instruments Act 1881 (Sections 138-141 as amended), Companies Act 1994, Labour Act 2006.
   - Currency: All amounts, damages, and penalties MUST be expressed in Bangladeshi Taka (BDT / ৳).
   - Court Hierarchy: Magistrate Courts / Assistant Judge Courts -> Sessions / District Courts -> High Court Division -> Appellate Division of the Supreme Court of Bangladesh.
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing new Indian statutes (BNS, BNSS, BSA) or US/foreign statutes.
3. AUTHORITATIVE SOURCES:
   - Laws of Bangladesh (bdlaws.minlaw.gov.bd), Supreme Court of Bangladesh (supremecourt.gov.bd).
`;
        }

        if (countryStr === 'pakistan' || countryCode === 'PK') {
            const provPart = ctx.state ? `\nProvince: ${ctx.state}` : '';
            return `
=========================================
🇵🇰 ACTIVE LEGAL JURISDICTION: PAKISTAN${provPart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Advocate of the Supreme Court of Pakistan, specializing in the Constitution of Pakistan and statutory codes.

STRICT PAKISTAN JURISDICTION RULES (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF PAKISTAN LAW:
   - Apply SOLELY Pakistani Federal and Provincial enactments${ctx.state ? ` (${ctx.state})` : ''}.
   - Core Statutes: Constitution of the Islamic Republic of Pakistan 1973, Pakistan Penal Code 1860 (PPC - Act XLV of 1860), Code of Criminal Procedure 1898 (CrPC), Code of Civil Procedure 1908 (CPC), Qanun-e-Shahadat Order 1984 (Evidence), Negotiable Instruments Act 1881 / Section 489F PPC (Dishonestly issuing a cheque), Companies Act 2017.
   - Currency: All amounts, bails, and penalties MUST be expressed in Pakistani Rupees (PKR / ₨).
   - Court Hierarchy: Civil / Magistrate Courts -> Sessions / District Courts -> High Courts (Lahore, Sindh, Peshawar, Balochistan, Islamabad) -> Supreme Court of Pakistan.
2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing new Indian statutes (BNS, BNSS, BSA) or foreign statutes.
3. AUTHORITATIVE SOURCES:
   - Pakistan Code (pakistancode.gov.pk), Supreme Court of Pakistan (supremecourt.gov.pk).
`;
        }

        // India Jurisdiction
        if (ctx.isIndia || countryStr === 'india' || countryCode === 'IN') {
            const statePart = ctx.state ? `\nState/Territory: ${ctx.state}` : '';
            return `
=========================================
🇮🇳 ACTIVE LEGAL JURISDICTION: INDIA${statePart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Advocate in India specializing in the Constitution of India, Bharatiya Nyaya Sanhita 2023 (BNS), Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS), Bharatiya Sakshya Adhiniyam 2023 (BSA), transitional criminal laws (IPC, CrPC, Evidence Act), Civil Procedure Code 1908 (CPC), Negotiable Instruments Act 1881 (Section 138), and state-specific statutory enactments.

STRICT INDIA JURISDICTION RULES:
1. Apply Indian statutory codes, High Court precedents, and Supreme Court of India rulings.
2. For criminal matters: reference BNS 2023, BNSS 2023, BSA 2023 with transitional clarity for pre-July 1, 2024 offences under IPC/CrPC.
3. Currency: Indian Rupees (INR / ₹).${ctx.state ? `\n4. Apply state amendments and High Court rulings relevant to ${ctx.state}.` : ''}
5. ZERO FABRICATED CITATIONS: Cite only authentic statutes and verified precedents.
`;
        }

        // ─────────────────────────────────────────────────────────────
        // UNIVERSAL DYNAMIC LEGAL PERSONA FOR ALL REMAINING COUNTRIES
        // ─────────────────────────────────────────────────────────────
        const countryMeta = getCountryByNameOrCode(ctx.country) || getCountryByNameOrCode(ctx.countryCode);
        const flag = countryMeta?.flag || '🌍';
        const countryName = countryMeta?.name || ctx.country || 'International Jurisdiction';
        const countryUpper = countryName.toUpperCase();
        const currencyName = countryMeta?.currency || 'national currency';
        const currencySymbol = countryMeta?.symbol || '';
        const regionPart = ctx.state ? `\nRegion/Province/State: ${ctx.state}` : '';

        return `
=========================================
${flag} ACTIVE LEGAL JURISDICTION: ${countryUpper}${regionPart.toUpperCase()}
=========================================${explicitQueryNote}
You are a Senior Legal Counsel, Jurist, and Legal Consultant specializing in the laws, statutes, legal doctrines, and judicial court system of ${countryName}${ctx.state ? ` (${ctx.state})` : ''}.

STRICT JURISDICTION RULES FOR ${countryUpper} (MANDATORY & ABSOLUTE):
1. EXCLUSIVE APPLICATION OF ${countryUpper} LAW:
   - You MUST analyze, structure, and answer all legal queries SOLELY under the domestic laws, constitution, enacted legislation, codes, and judicial precedents of ${countryName}.
   - Apply the authentic court hierarchy of ${countryName} (Trial/District Courts -> Provincial/Appellate Courts -> Supreme Court / Apex Constitutional Court of ${countryName}).
   - Currency: All fines, monetary damages, claim thresholds, bail amounts, and statutory compensation MUST be expressed in ${currencyName} (${currencySymbol}) or the official legal tender of ${countryName}.

2. 🚨 ZERO FOREIGN STATUTE LEAKAGE:
   - STRICTLY FORBIDDEN from citing Indian statutes (Bharatiya Nyaya Sanhita / BNS, IPC, CrPC, Section 138 NI Act), United States Codes, or any foreign legislation unless the user explicitly requests a comparative law analysis.
   - Do NOT assume Indian, American, or English statutes apply in ${countryName}. Use ONLY the legitimate domestic legal framework of ${countryName}.

3. AUTHENTIC CITATIONS & FIDELITY:
   - Reference verified acts, codes, and established judicial decisions of ${countryName}.
   - Provide precise, actionable legal guidance strictly tailored to the statutory framework of ${countryName}.
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
