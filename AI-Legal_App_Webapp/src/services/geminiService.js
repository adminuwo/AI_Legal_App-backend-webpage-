import axios from "axios";
import { apis } from "../types";
import { getUserData } from "../userStore/userData";
import { getDeviceFingerprint } from "../utils/fingerprint";

export const generateChatResponse = async (history, currentMessage, systemInstruction, attachments, language, abortSignal = null, mode = null, sessionId = null, projectId = null, userMsgId = null, aiMsgId = null, aspectRatio = null, modelId = null, onChunk = null) => {
    try {
        const userData = getUserData();
        const token = userData?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        const userJurisdiction = userData?.legalJurisdiction?.country || userData?.jurisdiction || userData?.country || 'India';
        const userState = userData?.legalJurisdiction?.state || userData?.state || '';
        const userCountryCode = userData?.legalJurisdiction?.countryCode || userData?.countryCode || 
            (userJurisdiction === 'Nepal' ? 'NP' : 
            (userJurisdiction === 'United States' ? 'US' : 
            (userJurisdiction === 'United Kingdom' ? 'GB' : 
            (userJurisdiction === 'United Arab Emirates' ? 'AE' : 'IN'))));

        const headers = {
            'X-Device-Fingerprint': getDeviceFingerprint(),
            'Content-Type': 'application/json',
            'X-Legal-Jurisdiction': userJurisdiction,
            'X-Legal-State': userState,
            'X-Country-Code': userCountryCode
        };
        if (token && token !== 'undefined' && token !== 'null') {
            headers.Authorization = `Bearer ${token}`;
        }

        const combinedSystemInstruction = (systemInstruction || '').trim();
        let images = [];
        let documents = [];
        let finalMessage = currentMessage;

        if (attachments && Array.isArray(attachments)) {
            attachments.forEach(attachment => {
                if (attachment.url && attachment.url.startsWith('data:')) {
                    const base64Data = attachment.url.split(',')[1];
                    const mimeType = attachment.url.substring(attachment.url.indexOf(':') + 1, attachment.url.indexOf(';'));
                    if (attachment.type === 'image' || mimeType.startsWith('image/')) {
                        images.push({ mimeType, base64Data });
                    } else {
                        documents.push({ mimeType: mimeType || 'application/pdf', base64Data, name: attachment.name });
                    }
                } else if (attachment.url) {
                    const isImage = attachment.type === 'image' || (attachment.name && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(attachment.name)) || (attachment.mimeType && attachment.mimeType.startsWith('image/'));
                    if (isImage) {
                        images.push({ url: attachment.url, name: attachment.name, mimeType: attachment.mimeType });
                    }
                    finalMessage += `\n[Shared File: ${attachment.name || 'Link'} - ${attachment.url}]`;
                }
            });
        }

        const recentHistory = history.length > 50 ? history.slice(-50) : history;
        const payload = {
            content: finalMessage,
            history: recentHistory,
            systemInstruction: combinedSystemInstruction,
            image: images,
            document: documents,
            language: language || 'English',
            jurisdiction: userJurisdiction,
            country: userJurisdiction,
            state: userState,
            countryCode: userCountryCode,
            legalJurisdiction: userData?.legalJurisdiction || {
                country: userJurisdiction,
                countryCode: userCountryCode,
                state: userState
            },
            mode: mode,
            sessionId: sessionId,
            projectId: projectId,
            userMsgId: userMsgId,
            aiMsgId: aiMsgId,
            ...(aspectRatio && { aspectRatio }),
            ...(modelId && { modelId }),
            stream: !!onChunk
        };

        if (onChunk) {
            const timeoutMs = (mode === 'DEEP_SEARCH' || mode === 'web_search' || mode === 'SEARCH') ? 180000 : 60000;
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                const err = new Error('timeout');
                err.code = 'ECONNABORTED';
                timeoutId = setTimeout(() => reject(err), timeoutMs);
            });

            const fetchPromise = fetch(apis.chatAgent, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: abortSignal
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const err = new Error(`HTTP error! status: ${response.status}`);
                err.status = response.status;
                throw err;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            let finalMeta = {};
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.error) {
                                throw new Error(parsed.error);
                            }
                            if (parsed.done) {
                                finalMeta = parsed;
                            } else {
                                const content = parsed.reply || parsed.chunk || "";
                                fullText += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            if (e.message && !e.message.includes("JSON")) {
                                throw e;
                            }
                            console.error("SSE Parse Error", e);
                        }
                    }
                }
            }
            return { reply: fullText, ...finalMeta };
        } else {
            const result = await axios.post(apis.chatAgent, payload, { headers, signal: abortSignal, withCredentials: true, timeout: (mode === 'DEEP_SEARCH' || mode === 'web_search' || mode === 'SEARCH') ? 180000 : 60000 });
            return result.data;
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        if (error.response?.status === 403) {
            const code = error.response?.data?.code;
            if (code === 'OUT_OF_CREDITS') { window.dispatchEvent(new Event('out_of_credits')); throw error; }
            if (code === 'PREMIUM_ONLY') { window.dispatchEvent(new CustomEvent('premium_required', { detail: { toolName: 'this feature' } })); throw error; }
        }
        throw error;
    }
};

/**
 * Generates context-aware follow-up prompts for a given user query.
 * Useful for "Smart Suggestions" after AI-powered legal research or chat.
 */
export const getContextualLegalSuggestions = (queryText) => {
    const text = String(queryText || '').toLowerCase();
    let storedCountry = '';
    try {
        storedCountry = localStorage.getItem('ai_legal_selected_country') || localStorage.getItem('legal_country') || '';
    } catch (_) {}
    const isNP = storedCountry.toLowerCase().includes('nepal') || 
                 (typeof localStorage !== 'undefined' && localStorage.getItem('legal_country_code') === 'NP') || 
                 /nepal|muluki|adhikar|saza|nkp/i.test(text);

    // 1. Murder / Saza / Serious Crime
    if (/murder|kill|jaan|saza|punishment|homicide|dhara 302|dhara 103|section 177|177|apradh|crime|life imprisonment/i.test(text)) {
        return isNP ? [
            "Exceptions under Section 177 Muluki Code?",
            "Bail provisions for murder in Nepal?",
            "Types of homicide under Nepali law?",
            "Defense strategies under Muluki Criminal Code?"
        ] : [
            "Difference between Section 103 BNS and 302 IPC?",
            "Grounds for Anticipatory Bail in serious offences?",
            "Exceptions to culpable homicide under BNS?",
            "Essential evidence required for defense?"
        ];
    }

    // 2. Bail / Arrest / FIR
    if (/bail|arrest|custody|remand|police|thana|fir|cognizable|warrant/i.test(text)) {
        return isNP ? [
            "Bail application procedure in District Court?",
            "Police remand duration under Nepal law?",
            "How to file Jaheri Darkhast in Nepal?",
            "Remedies against illegal detention in Nepal?"
        ] : [
            "Difference between Regular & Anticipatory Bail?",
            "Section 438 CrPC / BNSS bail provisions?",
            "Legal rights of an arrested person?",
            "Procedure to quash an FIR?"
        ];
    }

    // 3. Cheque / Money / Debt
    if (/cheque|check|bounce|138|ni act|recovery|loan|debt|karz|paisa|dishonour/i.test(text)) {
        return isNP ? [
            "Remedy under Banking Offence Act, 2064?",
            "Negotiable Instruments Act provisions in Nepal?",
            "Notice period for bounced cheque in Nepal?",
            "Court process for money recovery in Nepal?"
        ] : [
            "Notice timeline under Section 138 NI Act?",
            "Criminal vs Summary Suit under Order 37 CPC?",
            "Documents required for cheque bounce complaint?",
            "Mediation options for debt settlement?"
        ];
    }

    // 4. Divorce / Family
    if (/divorce|talaq|vivah|marriage|maintenance|kharcha|custody|bacha|domestic violence|dv|streedhan|498a/i.test(text)) {
        return isNP ? [
            "Divorce grounds under Muluki Civil Code 2074?",
            "Property division and alimony in Nepal?",
            "Child custody guidelines in District Court?",
            "Mutual consent divorce process in Nepal?"
        ] : [
            "Mutual consent divorce timeline?",
            "Interim maintenance under Section 125 / BNSS?",
            "Child custody principles for working parents?",
            "Protection against Section 498A harassment?"
        ];
    }

    // 5. Property / Land / Tenancy
    if (/property|land|jamin|makan|flat|rent|tenant|kiraya|lease|registry|kabza|partition|batwara/i.test(text)) {
        return isNP ? [
            "Partition suit (Angsha Banda) under Muluki Code?",
            "Tenant eviction rules in Nepal?",
            "Land registration and Malpot office procedure?",
            "Remedy for unlawful land possession in Nepal?"
        ] : [
            "Procedure to file a Partition Suit?",
            "Tenant eviction grounds under Tenancy Act?",
            "Documents for ancestral property claim?",
            "Injunction order against illegal possession?"
        ];
    }

    // 6. Contract / Cyber
    if (/contract|agreement|notice|clause|breach|cyber|fraud|scam|online/i.test(text)) {
        return isNP ? [
            "Contract breach remedies under Muluki Civil Code?",
            "Electronic Transactions Act 2063 cybercrime rules?",
            "How to draft a formal legal notice in Nepal?",
            "Arbitration procedure under Nepal law?"
        ] : [
            "Remedies for breach under Indian Contract Act?",
            "Cybercrime reporting under IT Act 2000?",
            "Drafting a Legal Notice for contract breach?",
            "Arbitration and dispute resolution clauses?"
        ];
    }

    return isNP ? [
        "Explain applicable Muluki Code Sections",
        "Research landmark NKP precedents",
        "Suggest courtroom strategy in Nepal",
        "Predict case outcome under Nepal law"
    ] : [
        "Explain applicable BNS / IPC statutory sections",
        "Research Supreme Court & High Court precedents",
        "Suggest strategic litigation steps",
        "Predict likely case outcome & risks"
    ];
};

/**
 * Generate 3 suggested follow-up prompts based on the context of the user query
 * @param {string} prompt - The original prompt
 * @param {string} type - 'image', 'video', or 'chat'
 * @returns {Promise<string[]>} List of 3 suggested prompts
 */
export const generateFollowUpPrompts = async (prompt, type = 'chat') => {
    try {
        const userData = getUserData();
        let storedCountry = '';
        let storedState = '';
        try {
            storedCountry = localStorage.getItem('ai_legal_selected_country') || localStorage.getItem('legal_country') || '';
            storedState = localStorage.getItem('legal_state') || '';
        } catch (_) {}

        const isNepal = storedCountry.toLowerCase().includes('nepal') || 
                        (typeof localStorage !== 'undefined' && localStorage.getItem('legal_country_code') === 'NP') ||
                        userData?.legalJurisdiction?.country === 'Nepal' ||
                        /nepal|muluki|saza|nkp/i.test(prompt);

        const country = isNepal ? 'Nepal' : (storedCountry || userData?.legalJurisdiction?.country || userData?.country || 'India');
        const state = storedState || userData?.legalJurisdiction?.state || userData?.state || '';
        const countryCode = isNepal ? 'NP' : 
            (country.toLowerCase().includes('united states') || country.toLowerCase().includes('america') ? 'US' :
            (country.toLowerCase().includes('united kingdom') ? 'GB' :
            (country.toLowerCase().includes('emirates') || country.toLowerCase().includes('uae') ? 'AE' : 'IN')));

        const systemInstruction = `You are a smart suggestion engine for a legal AI assistant.
Your job is to generate exactly 3 highly relevant, context-aware, and ACTION-ORIENTED follow-up legal questions or next steps strictly based on the user's inquiry.

JURISDICTION LOCK: ${country}.
${isNepal ? 'STRICT RULE FOR NEPAL: All suggestions must cite or relate to Nepalese law (e.g. Muluki Criminal/Civil Code, Nepal Supreme Court/NKP). NEVER mention Indian laws such as IPC, BNS, CrPC, BNSS, or Indian Constitution.' : 'STRICT RULE: Focus specifically on the legal context asked by the user.'}

STRICT RULES:
1. NO GREETINGS OR USER NAMES: Never include "Yes, Aditi", "Sure", "Hello", "Dear", or any person's name in suggestions!
2. NO CONVERSATIONAL FILLER: Never start with "To ensure...", "I can help...", or "Sure, I will...". Suggestions must be direct user questions or legal actions (3–7 words each).
3. STRICTLY RELEVANT TO USER'S QUERY: Suggestions must directly follow from what the user just asked.
4. FORMAT: Return ONLY a JSON array of strings: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;

        // Use skipSession:true so the backend does NOT create a ghost chat session for this internal call
        const token = userData?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        const headers = { 
            'X-Device-Fingerprint': getDeviceFingerprint(),
            'X-Legal-Jurisdiction': country,
            'X-Legal-State': state,
            'X-Country-Code': countryCode
        };
        if (token && token !== 'undefined' && token !== 'null') headers.Authorization = `Bearer ${token}`;

        const cleanSuggestion = (str) => {
            return String(str || '')
                .replace(/^\s*[-*•\d+.]\s*/, '')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/["'\[\]]/g, '')
                .replace(/^Hello\s+[^,]+,?\s*/i, '')
                .replace(/^Hi\s+[^,]+,?\s*/i, '')
                .trim();
        };

        const raw = await axios.post(apis.chatAgent, {
            content: prompt,
            history: [],
            systemInstruction,
            image: [],
            document: [],
            language: 'English',
            country,
            jurisdiction: country,
            state,
            skipSession: true
        }, { headers, withCredentials: true, timeout: 15000 });
        const response = raw.data;

        // Check if backend already sent suggestions directly
        if (response?.suggestions && Array.isArray(response.suggestions) && response.suggestions.length > 0) {
            const list = response.suggestions.map(cleanSuggestion).filter(Boolean);
            if (list.length > 0) return list.slice(0, 3);
        }

        // Handle both object {reply: "..."} and direct string responses
        const replyText = response?.reply || (typeof response === 'string' ? response : null);

        if (replyText && !replyText.includes('Log In') && !replyText.includes('System Message')) {
            // Attempt to parse as JSON first
            try {
                const jsonMatch = replyText.match(/\[\s*".*?"\s*\]/s) || replyText.match(/\[.*\]/s);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        const list = parsed
                            .map(cleanSuggestion)
                            .filter(s => s.length > 2 && !s.toLowerCase().startsWith('hello') && !s.toLowerCase().startsWith('hi '));
                        if (list.length > 0) return list.slice(0, 3);
                    }
                }
            } catch (e) {
                console.warn("Failed to parse suggestions as JSON, falling back to line splitting.");
            }

            // Fallback: Split by newline or standard bullet patterns (1., -, *, •)
            const splitList = replyText
                .split(/\n|(?=\b\d+\.)|(?=\b[-*•]\s)/)
                .map(cleanSuggestion)
                .filter(line => line.length > 3 && line.length < 100 && !line.toLowerCase().startsWith('hello') && !line.toLowerCase().startsWith('hi '));
            if (splitList.length > 0) return splitList.slice(0, 3);
        }

        return getContextualLegalSuggestions(prompt).slice(0, 3);
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return getContextualLegalSuggestions(prompt).slice(0, 3);
    }
};

