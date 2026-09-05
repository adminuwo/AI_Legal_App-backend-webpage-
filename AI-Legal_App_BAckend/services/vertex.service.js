import { generativeModel, genAIInstance, modelName, vertexAI, useVertexAI } from '../config/vertex.js';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import * as configService from './configService.js';
import { jurisdictionManager } from './jurisdictionManager.js';
import { langStorage } from '../middleware/langContext.js';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { existsSync } from 'fs';

import { resolveResponseLanguage } from '../utils/languageResolver.js';

export const getGlobalLanguageInstruction = (language, messageText = '') => {
    const resolved = resolveResponseLanguage({
        currentMessage: messageText,
        selectedLanguage: language
    });
    return resolved.systemInstruction;
};

dotenv.config();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// Cached Corpus ID - used to avoid redundant listings
let cachedCorpusId = null;

/**
 * Find the aisa_Knowlege_Base corpus or create it if missing
 */
const findOrCreateCorpus = async () => {
    // Debugging logs to see what's actually in process.env
    const envCorpusId = process.env.VERTEX_RAG_CORPUS_ID;
    const envLocation = process.env.GCP_LOCATION;

    logger.info(`[RAG DEBUG] ENV LOCATION: ${envLocation || 'NOT SET'}`);
    logger.info(`[RAG DEBUG] ENV CORPUS_ID: ${envCorpusId || 'NOT SET'}`);

    // Priority 1: Use .env variable if provided
    if (envCorpusId) {
        cachedCorpusId = envCorpusId;
        return cachedCorpusId;
    }

    // Priority 2: Check cache
    if (cachedCorpusId) return cachedCorpusId;

    try {
        const projectId = process.env.GCP_PROJECT_ID;
        const location = 'us-central1';

        if (!projectId) {
            logger.error("[Vertex RAG] GCP_PROJECT_ID not set in environment.");
            return null;
        }
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const listUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/ragCorpora`;

        logger.info(`[Vertex RAG] Checking corpora in ${location}...`);
        const res = await axios.get(listUrl, {
            headers: { Authorization: `Bearer ${token.token}` }
        });

        const corpora = res.data.ragCorpora || [];
        const existingCorpus = corpora.find(c => c.displayName === 'aisa_knowledge_base');

        if (existingCorpus) {
            cachedCorpusId = existingCorpus.name.split('/').pop();
            logger.info(`[Vertex RAG] Found existing Corpus: ${cachedCorpusId}`);
            return cachedCorpusId;
        }

        // Create if not found
        logger.info(`[Vertex RAG] Creating new Corpus 'aisa_knowledge_base' in ${location}`);
        const createRes = await axios.post(listUrl, { displayName: 'aisa_knowledge_base' }, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });
        cachedCorpusId = createRes.data.name.split('/').pop();
        return cachedCorpusId;
    } catch (err) {
        logger.error(`[Vertex RAG] Corpus management failed: ${err.response?.data?.error?.message || err.message}`);
        return null;
    }
};

/**
 * Retrieve search results from Vertex RAG Corpus
 */
export const retrieveContextFromRag = async (query, topK = 8, category = 'LEGAL', targetWorkspaceId = null) => {
    try {
        const lower = (query || "").toLowerCase().trim();
        const pureFillers = [
            'hi', 'hello', 'hii', 'hey', 'thanks', 'thank you', 'okay', 'ok',
            'great', 'awesome', 'happy to help', 'see you', 'bye', 'goodbye',
            'hope this helps', 'no problem', 'you are welcome', 'got it',
            'sure', 'alright', 'noted', 'understood'
        ];
        if (pureFillers.some(f => lower === f) || lower.length < 3) {
            logger.info(`[Vertex RAG] Skipping retrieval for greeting/short filler query: "${query}"`);
            return null;
        }

        const corpusId = await findOrCreateCorpus();
        if (!corpusId) {
            logger.warn("[Vertex RAG] Retrieval skipped: No Corpus ID.");
            return null;
        }

        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || 'us-central1';

        if (!projectId) {
            logger.error("[Vertex RAG] Retrieval failed: GCP_PROJECT_ID not set in environment.");
            return null;
        }

        // ✅ DIAGNOSTIC: Print exactly what we're querying against
        logger.info(`[RAG-RETRIEVE] ══════════════════════════════════════════`);
        logger.info(`[RAG-RETRIEVE] Project  : ${projectId}`);
        logger.info(`[RAG-RETRIEVE] Location : ${location}`);
        logger.info(`[RAG-RETRIEVE] CorpusID : ${corpusId}`);
        logger.info(`[RAG-RETRIEVE] Query    : "${query}"`);
        logger.info(`[RAG-RETRIEVE] TopK     : ${topK} | Category: ${category} | Workspace: ${targetWorkspaceId || 'GLOBAL'}`);
        logger.info(`[RAG-RETRIEVE] ══════════════════════════════════════════`);

        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // --- V1BETA1 RETRIEVAL ---
        const retrieveUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}:retrieveContexts`;

        const corpusName = `projects/${projectId}/locations/${location}/ragCorpora/${corpusId}`;

        const payload = {
            vertexRagStore: {
                ragCorpora: [corpusName]
            },
            query: {
                text: query,
                similarityTopK: topK
            }
        };

        const response = await axios.post(retrieveUrl, payload, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });

        const contexts = response.data?.contexts?.contexts || [];
        logger.info(`[RAG-RETRIEVE] Vertex returned ${contexts.length} chunk(s) for query: "${query}"`);
        if (contexts.length === 0) {
            logger.warn(`[RAG-RETRIEVE] ⚠️ EMPTY RESULT — Vertex found 0 chunks. Check: corpus location matches GCP_LOCATION, corpus has indexed files, and query is relevant.`);
            return null;
        }

        // Apply Confidence Logic
        const validContexts = contexts.filter(c => {
            console.log(`[RAG DEBUG] Chunk distance: ${c.distance}`);
            if (c.distance === undefined || c.distance === null) return true;
            return c.distance < 0.99; // Relaxed threshold for better coverage
        });

        const Knowledge = (await import('../models/Knowledge.model.js')).default;

        const sources = [];
        const retrievedTexts = [];

        for (const context of validContexts) {
            const gcsUri = context.sourceUri;
            const doc = gcsUri ? await Knowledge.findOne({ gcsUri }) : null;

            console.log(`[RAG DEBUG] Chunk Source: ${gcsUri || 'N/A'} | DB Doc: ${doc ? 'FOUND' : 'NOT_IN_DB'} | DB Category: ${doc?.category || 'NONE'} | Requested: ${category}`);

            // Enforce Workspace Private Document Isolation
            if (doc && doc.visibility === 'WORKSPACE_PRIVATE') {
                if (!targetWorkspaceId || String(doc.workspaceId) !== String(targetWorkspaceId)) {
                    console.log(`[RAG ISOLATION] Skipping chunk from private workspace ${doc.workspaceId} (active workspace: ${targetWorkspaceId || 'NONE'})`);
                    continue;
                }
            }

            // Enforce Scope Restriction/Isolation for PRODUCT_GUIDE
            if (category === 'PRODUCT_GUIDE') {
                if (!doc || doc.category !== 'PRODUCT_GUIDE') {
                    continue;
                }
            } else {
                if (doc && doc.category === 'PRODUCT_GUIDE') {
                    continue;
                }
            }

            if (!context.text || context.text.trim().length === 0) continue;

            // Build source info from doc if found, otherwise use sensible defaults
            let sourceName = doc?.filename || (gcsUri ? gcsUri.split('/').pop() : 'Knowledge Resource');
            let sourceUrl = doc?.sourceUrl || '';

            if (sourceUrl) {
                try {
                    const urlObj = new URL(sourceUrl);
                    sourceName = urlObj.hostname.replace('www.', '');
                } catch (e) {
                    sourceName = doc?.filename || "Knowledge Resource";
                }
            }

            sources.push({
                title: sourceName,
                url: sourceUrl || 'https://uwo24.com/',
                snippet: context.text ? context.text.substring(0, 150) + '...' : '',
                document_title: sourceName,
                source_type: doc ? 'KNOWLEDGE_BASE' : 'RAG_CORPUS',
                chunk_id: `chunk_${Date.now()}_${Math.random()}`
            });

            const citation = sourceUrl ? `[Ref: ${sourceName}]` : `[Knowledge Base]`;
            retrievedTexts.push(`${citation}\n${context.text}`);
        }

        if (retrievedTexts.length === 0) {
            logger.info(`[Vertex RAG] No matching documents found for category: ${category}`);
            return null;
        }

        // Deduplicate sources aggressively by Title (since URLs might be internal GCS paths)
        const uniqueSources = [];
        const seenTitles = new Set();
        for (const source of sources) {
            if (!seenTitles.has(source.title)) {
                uniqueSources.push(source);
                seenTitles.add(source.title);
            }
        }

        if (uniqueSources.length === 0) {
            uniqueSources.push({
                title: "Unified Web Options",
                url: "https://uwo24.com/",
                snippet: "Official information about AISA and UWO services.",
                document_title: "Unified Web Options",
                source_type: "URL",
                chunk_id: `default_${Date.now()}`
            });
        }

        const template = configService.getConfig('RAG_CONTEXT_TEMPLATE', 'Use this context: {retrieved_text}');
        const ragContext = template.replace('{retrieved_text}', retrievedTexts.join('\n\n'));

        logger.info(`[Vertex RAG] Chunks: ${validContexts.length} | Unique Sources: ${uniqueSources.length}`);
        // Return max 3 sources to keep the UI clean as requested by the user
        return { text: ragContext, sources: uniqueSources.slice(0, 3) };

    } catch (error) {
        logger.error(`[Vertex RAG] Retrieval Error: ${error.response?.data?.error?.message || error.message}`);
        return null;
    }
};

/**
 * Combined RAG Detection and Query Rewriting
 * Reduces latency by performing both tasks in a single LLM call.
 */
export const analyzeRAGRequirements = async (query) => {
    try {
        const needsRAG = await detectRAGNeed(query);

        if (!needsRAG) {
            return { needsRAG: false, rewrittenQuery: query };
        }

        const wordsCount = (query || "").trim().split(/\s+/).length;
        if (wordsCount < 5) {
            logger.info(`[RAG-Analyzer] Skipping rewriting for short query: "${query}"`);
            return { needsRAG: true, rewrittenQuery: query };
        }

        const rewriteTemplate = configService.getConfig('QUERY_REWRITE_PROMPT', 'Rewrite the user question for search: {user_question}');
        const rewritePrompt = rewriteTemplate.replace('{user_question}', query);

        const rewriteResult = await AskVertexRaw(rewritePrompt, {
            maxOutputTokens: 200,
            temperature: 0.2,
            modelOverride: 'gemini-2.5-flash'
        });

        const rewrittenQuery = rewriteResult.trim().replace(/^["']|["']$/g, '') || query;
        logger.info(`[RAG-Analyzer] Original: "${query.substring(0, 60)}" -> Rewritten: "${rewrittenQuery.substring(0, 60)}"`);

        return { needsRAG: true, rewrittenQuery };
    } catch (error) {
        logger.error(`[RAG-Analyzer] Error: ${error.message}`);
        return { needsRAG: false, rewrittenQuery: query };
    }
};


/**
 * Detects if the user's query specifically needs company knowledge base information
 */
export const detectRAGNeed = async (query) => {
    try {
        const lower = query.toLowerCase().trim();

        // 1. Fast-path NO: Casual greetings and very short inputs
        const pureFillers = [
            'hi', 'hello', 'hii', 'hey', 'thanks', 'thank you', 'okay', 'ok',
            'great', 'awesome', 'happy to help', 'see you', 'bye', 'goodbye',
            'hope this helps', 'no problem', 'you are welcome', 'got it',
            'sure', 'alright', 'noted', 'understood'
        ];

        if (pureFillers.some(f => lower === f) || query.length < 3) {
            return false;
        }

        // 2. STRICT KEYWORD MATCHING: Only trigger RAG for AISA, AI MALL, UWO, and specific features
        const ragKeywords = ['aisa', 'ai mall', 'uwo', 'feature', 'pricing', 'plan', 'mall', 'refund', 'policy', 'capabilities'];
        const hasRagKeyword = ragKeywords.some(k => lower.includes(k));
        
        if (hasRagKeyword) {
            logger.info(`[RAG-Detector] Keyword match triggered RAG for: "${query}"`);
            return true;
        }

        // 3. DEFAULT: Use Normal Chat for everything else
        return false;
    } catch (error) {
        logger.error(`[RAG-Detector] Error: ${error.message}`);
        return false;
    }
}

/**
 * Internal helper for basic text generation - creates a fresh lightweight model
 * This is used by CashFlow, QueryRewrite, RAG Detector etc.
 */
export const AskVertexRaw = async (prompt, options = {}) => {
    try {
        if (!generativeModel && !genAIInstance && !vertexAI) {
            throw new Error('No AI model initialized. Check GEMINI_API_KEY or GCP_PROJECT_ID in .env');
        }

        const store = langStorage.getStore();
        let targetLanguage = options.language || (store && typeof store === 'object' ? store.language : store) || 'English';

        // 1. Explicit user instructions in prompt/message text (Priority 1)
        const promptLower = (prompt || "").toLowerCase();
        if (promptLower.includes("explain in hindi") || 
            promptLower.includes("hindi mein samjhao") || 
            promptLower.includes("hindi me bataye") || 
            promptLower.includes("hindi me samjhao") ||
            promptLower.includes("hindi mein bataye") ||
            promptLower.includes("hindi please") ||
            promptLower.includes("in hindi")) {
            targetLanguage = 'Hindi';
        } else if (promptLower.includes("explain in english") || 
                   promptLower.includes("english please") || 
                   promptLower.includes("in english")) {
            targetLanguage = 'English';
        } else if (targetLanguage === 'Bilingual' && (promptLower.includes("pure hindi") || promptLower.includes("sirf hindi"))) {
            targetLanguage = 'Hindi';
        }

        const globalLanguageInstruction = getGlobalLanguageInstruction(targetLanguage);
        
        let finalPrompt = prompt;
        if (targetLanguage) {
            finalPrompt = `${globalLanguageInstruction}\n\n${prompt}\n\npreferred_response_language=${targetLanguage}`;
        }

        let model;

        // Map virtual model names to real available Vertex/GenAI models
        const modelMap = {
            'gemini-2.5-flash': 'gemini-2.5-flash',
            'gemini-2.5-flash-image': 'gemini-2.5-flash',
            'gemini-2.5-pro': 'gemini-2.5-pro'
        };

        const rawModelName = options.modelOverride || modelName;
        const selectedModelName = modelMap[rawModelName] || rawModelName;
        logger.info(`[AskVertexRaw] Mapping: ${rawModelName} -> ${selectedModelName}`);

        if (useVertexAI && vertexAI) {
            const { HarmCategory, HarmBlockThreshold } = await import('@google-cloud/vertexai');
            model = vertexAI.getGenerativeModel({
                model: selectedModelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                ],
                generationConfig: {
                    maxOutputTokens: options.maxOutputTokens || 4096,
                    temperature: options.temperature || 0.7,
                    ...(options.isJson && { responseMimeType: "application/json" })
                },
                systemInstruction: globalLanguageInstruction,
                tools: options.useSearch ? [{ googleSearch: {} }] : []
            });
        } else if (genAIInstance) {
            // Use Gemini API (API key mode)
            model = genAIInstance.getGenerativeModel({
                model: selectedModelName,
                generationConfig: {
                    maxOutputTokens: options.maxOutputTokens || 4096,
                    temperature: options.temperature || 0.7,
                    ...(options.isJson && { responseMimeType: "application/json" })
                },
                systemInstruction: globalLanguageInstruction,
                tools: options.useSearch ? [{ googleSearch: {} }] : []
            });
        } else {
            throw new Error('AI model instance not available');
        }

        let result;
        try {
            result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
            });
        } catch (execErr) {
            logger.warn(`[AskVertexRaw] Primary execution failed for ${selectedModelName}: ${execErr.message}. Attempting API Key / OpenAI fallback.`);
            if (process.env.GEMINI_API_KEY) {
                try {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const directGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const fallbackModel = directGenAI.getGenerativeModel({
                        model: 'gemini-2.5-flash',
                        generationConfig: {
                            maxOutputTokens: options.maxOutputTokens || 4096,
                            temperature: options.temperature || 0.7,
                            ...(options.isJson && { responseMimeType: "application/json" })
                        },
                        systemInstruction: globalLanguageInstruction
                    });
                    result = await fallbackModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
                    });
                } catch (gemErr) {
                    if (process.env.OPENAI_API_KEY) {
                        logger.warn(`[AskVertexRaw] Gemini API Key fallback failed. Falling back to OpenAI...`);
                        const { askOpenAI } = await import('./openai.service.js');
                        return await askOpenAI(finalPrompt, null, {
                            systemInstruction: globalLanguageInstruction,
                            isJson: options.isJson
                        });
                    }
                    throw gemErr;
                }
            } else if (process.env.OPENAI_API_KEY) {
                logger.warn(`[AskVertexRaw] Gemini API Key missing. Falling back to OpenAI...`);
                const { askOpenAI } = await import('./openai.service.js');
                return await askOpenAI(finalPrompt, null, {
                    systemInstruction: globalLanguageInstruction,
                    isJson: options.isJson
                });
            } else {
                throw execErr;
            }
        }

        // Handle both @google-cloud/vertexai and @google/generative-ai response formats
        const response = result.response || result;
        const candidate = response.candidates?.[0];

        let text = '';
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (candidate?.content?.parts?.[0]?.text) {
            text = candidate.content.parts[0].text;
        } else if (response?.text && typeof response.text === 'string') {
            text = response.text;
        }

        // Extract Search Grounding Sources if present
        let sources = [];
        if (options.useSearch && candidate?.groundingMetadata) {
            const gm = candidate.groundingMetadata;

            // Format sources from grounded snippets or search entries
            if (gm.searchEntryPoint?.htmlContent) {
                // This is a special part of the response that contains the search UI HTML if requested
            }

            if (gm.groundingChunks || gm.searchEntryMetadata) {
                // Vertex AI usually provides groundingChunks with detailed citations
                const chunks = gm.groundingChunks || [];
                sources = chunks.map(chunk => {
                    if (chunk.web) {
                        return {
                            title: chunk.web.title || "Search Result",
                            url: chunk.web.uri,
                            snippet: "" // Snippets are usually in the text itself via citations
                        };
                    }
                    return null;
                }).filter(Boolean);
            }
        }

        if (options.returnSources) {
            return { text, sources };
        }

        return text;
    } catch (err) {
        // Log full error details for debugging
        logger.error(`[AskVertexRaw] FULL ERROR: ${err.message}`);
        if (err.stack) logger.debug(`[AskVertexRaw] Stack Trace: ${err.stack}`);
        if ((err.message.includes("404") || err.message.includes("NOT_FOUND")) && !options.isFallback) {
            logger.warn(`[AskVertexRaw] Model ${options.modelOverride || modelName} not found in asia-south1. Check model availability.`);
            // Do NOT fallback to gemini-1.5-pro — not available in asia-south1
            throw err;
        }

        throw err;
    }
};

export const askVertex = async (prompt, context = null, options = {}) => {
    try {
        if (!generativeModel && !genAIInstance && !vertexAI) {
            throw new Error('Google AI services are not initialized: GCP_PROJECT_ID is missing, commented out, or unavailable in the environment configuration.');
        }
        let { systemInstruction, images, documents } = options;

        // --- GLOBAL AI LANGUAGE INTELLIGENCE LAYER ---
        const store = langStorage.getStore();
        let selectedLang = options.language || (store && typeof store === 'object' ? store.language : store);

        const resolvedLang = resolveResponseLanguage({
            currentMessage: prompt,
            selectedLanguage: selectedLang
        });

        let targetLanguage = resolvedLang.language;
        const globalLanguageInstruction = resolvedLang.systemInstruction;

        // Inject Brand Identity if no specific instructions provided
        const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
        const dateContext = `\n### CURRENT DATE & TIME:\nToday is ${currentDate} (India Standard Time). (Aaj ki date aur samay: ${currentDate})\n`;

        if (!systemInstruction) {
            systemInstruction = globalLanguageInstruction + "\n\n" + configService.getFullSystemInstruction() + dateContext;
        } else {
            // Append date context even to custom instructions for reference
            systemInstruction = globalLanguageInstruction + "\n\n" + systemInstruction + dateContext;
        }

        systemInstruction = await jurisdictionManager.injectJurisdictionPrompt(systemInstruction, options.userId);

        // Add User Name context if provided (except for legal toolkit specialized modes to avoid conversational pollution)
        if (options.userName && !options.isLegalTool) {
            systemInstruction += `\n### USER IDENTIFICATION:\nThe user's name is ${options.userName}. You MUST use their name to address them directly and naturally in your responses (e.g., "Yes, Sakshi", or "Here is the information, ${options.userName}"). Make the conversation feel personalized by acknowledging their name.\n`;
        }

        if (options.toolName === 'legal_contract_analyzer') {
            logger.info(`\n\n[CONTRACT-ANALYZER-SYSTEM-PROMPT] systemInstruction reaching LLM:\n${systemInstruction}\n[CONTRACT-ANALYZER-SYSTEM-PROMPT-END]\n\n`);
        }

        const isJsonMode = !!(options.isJson || options.mode === 'JSON' || options.mode === 'FILE_CONVERSION' || (systemInstruction && (systemInstruction.includes("JSON format") || systemInstruction.includes("STRICT JSON") || systemInstruction.includes("JSON object") || systemInstruction.includes("JSON verification object") || systemInstruction.includes("JSON action"))));

        let finalPrompt = prompt;
        if (targetLanguage) {
            finalPrompt = `${prompt}\n\npreferred_response_language=${targetLanguage}`;
        }
        // Combine context with prompt if available (if not using system instruction to carry context)
        if (context) {
            finalPrompt = `CONTEXT:\n${context}\n\nUSER QUESTION:\n${finalPrompt}`;
        }

        let model = generativeModel; // Default model


        // 1. Dynamic Model Creation (if systemInstruction is provided)
        // This is crucial for "File Conversion" mode where specific JSON output instructions are needed.
        const modelMap = {
            'gemini-2.5-flash': 'gemini-2.5-flash',
            'gemini-2.5-flash-image': 'gemini-2.5-flash',
            'gemini-2.5-pro': 'gemini-2.5-pro'
        };

        const rawModelName = options.modelOverride || modelName;
        const selectedModelName = modelMap[rawModelName] || rawModelName;
        
        if (selectedModelName && genAIInstance) {
            logger.info(`[VERTEX] Mapping: ${rawModelName} -> ${selectedModelName} (with System Instruction)`);
            logger.info(`\n\n[VERTEX-PROMPT] systemInstruction reaching LLM:\n${systemInstruction}\n[VERTEX-PROMPT-END]\n\n`);
            model = genAIInstance.getGenerativeModel({
                model: selectedModelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                ],
                generationConfig: {
                    maxOutputTokens: options.maxOutputTokens || (isJsonMode ? 2048 : 4096),
                    temperature: options.temperature !== undefined ? options.temperature : 0.4,
                    responseMimeType: isJsonMode ? "application/json" : "text/plain"
                },
                systemInstruction: systemInstruction,
                tools: options.useSearch ? [{ googleSearch: {} }] : []
            });
        }

        const downloadUrlToBase64 = async (url) => {
            try {
                logger.info(`[VERTEX] Downloading: ${url}`);
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 25000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*'
                    }
                });
                return Buffer.from(response.data).toString('base64');
            } catch (err) {
                logger.error(`[VERTEX] Failed to download attachment from URL: ${url}. Error: ${err.message}`);
                if (url && url.includes('cloudinary.com')) {
                    try {
                        const altUrl = url.replace('/image/upload/', '/raw/upload/');
                        logger.info(`[VERTEX] Retrying Cloudinary download with alt URL: ${altUrl}`);
                        const response = await axios.get(altUrl, {
                            responseType: 'arraybuffer',
                            timeout: 25000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        });
                        return Buffer.from(response.data).toString('base64');
                    } catch (altErr) {
                        logger.error(`[VERTEX] Alt Cloudinary download also failed: ${altErr.message}`);
                    }
                }
                return null;
            }
        };

        // Download and organize attachments safely
        let finalImages = [];
        let finalDocs = [];

        const allAttachments = [
            ...(images || []).map(img => ({ ...img, isImageForce: true })),
            ...(documents || [])
        ];

        if (allAttachments.length > 0) {
            await Promise.all(allAttachments.map(async (att) => {
                if (!att.base64Data && att.url) {
                    const base64 = await downloadUrlToBase64(att.url);
                    if (base64) att.base64Data = base64;
                }
            }));

            // Filter out attachments that don't have base64Data
            const validAttachments = allAttachments.filter(att => att.base64Data && att.base64Data.trim() !== '');

            validAttachments.forEach(att => {
                const isImg = att.isImageForce || att.mimeType?.startsWith('image/') || att.type?.startsWith('image/');
                if (isImg) {
                    finalImages.push(att);
                } else {
                    finalDocs.push(att);
                }
            });

            // Extract text from PDFs if available
            for (const doc of finalDocs) {
                const isPdf = doc.mimeType?.includes('pdf') || doc.name?.endsWith('.pdf');
                if (isPdf && doc.base64Data) {
                    try {
                        const buffer = Buffer.from(doc.base64Data, 'base64');
                        const parsed = await pdf(buffer);
                        if (parsed && parsed.text && parsed.text.trim().length > 50) {
                            logger.info(`[VERTEX] Extracted ${parsed.text.trim().length} chars from PDF: ${doc.name}`);
                            doc.extractedText = parsed.text;
                        }
                    } catch (pdfErr) {
                        logger.warn(`[VERTEX] Failed to extract text from PDF ${doc.name}: ${pdfErr.message}`);
                    }
                }
            }
        }

        const pdfTexts = finalDocs
            .filter(doc => doc.extractedText)
            .map(doc => `[Extracted Text from PDF: ${doc.name}]\n${doc.extractedText}`)
            .join('\n\n');

        if (pdfTexts) {
            finalPrompt = `EXTRACTED DOCUMENT TEXTS:\n${pdfTexts}\n\n${finalPrompt}`;
        }

        logger.info(`[VERTEX] Sending request to Gemini (Context: ${!!context}, Images: ${finalImages.length}, Docs: ${finalDocs.length})...`);

        // 2. Prepare Parts (Text + Images + Documents)
        let parts = [{ text: finalPrompt }];

        if (finalImages.length > 0) {
            const imageParts = finalImages.flatMap(img => [
                { text: `[Attached Image Name: ${img.name || 'image'}]` },
                {
                    inlineData: {
                        data: img.base64Data,
                        mimeType: img.mimeType || 'image/png'
                    }
                }
            ]);
            parts = [...imageParts, ...parts];
        }

        if (finalDocs.length > 0) {
            const nonAudioDocs = finalDocs.filter(doc => 
                !(doc.mimeType?.startsWith('audio/') || doc.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i))
            );
            if (nonAudioDocs.length > 0) {
                const documentParts = nonAudioDocs.flatMap(doc => [
                    { text: `[Attached Document Name: ${doc.name || 'document'}]` },
                    {
                        inlineData: {
                            data: doc.base64Data,
                            mimeType: doc.mimeType || 'application/pdf'
                        }
                    }
                ]);
                parts = [...documentParts, ...parts];
            }
        }

        // 3. Generate Content
        // Format conversation history for Gemini/Vertex AI with strict alternating role enforcer
        let contents = [];
        if (options.history && Array.isArray(options.history) && options.history.length > 0) {
            let lastRole = null;
            options.history
                .filter(msg => msg.content || msg.text)
                .forEach(msg => {
                    const role = (msg.role === 'model' || msg.role === 'assistant') ? 'model' : 'user';
                    if (role === lastRole) {
                        if (contents.length > 0) {
                            contents[contents.length - 1].parts[0].text += "\n" + (msg.content || msg.text);
                        }
                    } else {
                        contents.push({
                            role,
                            parts: [{ text: msg.content || msg.text }]
                        });
                        lastRole = role;
                    }
                });
            
            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
                contents.push({
                    role: 'model',
                    parts: [{ text: "Understood. Please go ahead." }]
                });
            }
        }
        contents.push({ role: 'user', parts });

        let result;
        const { onChunk } = options;
        try {
            if (onChunk) {
                result = await model.generateContentStream({ contents });
            } else {
                result = await model.generateContent({ contents });
            }
        } catch (execErr) {
            const errStr = String(execErr?.message || execErr);
            if (errStr.includes("403") || errStr.includes("PERMISSION_DENIED") || errStr.includes("Forbidden") || errStr.includes("ClientError")) {
                logger.warn(`[VERTEX API 403 FALLBACK] Vertex AI permission denied. Attempting fallback...`);
                if (process.env.GEMINI_API_KEY) {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const fallbackGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const fallbackModel = fallbackGenAI.getGenerativeModel({
                        model: 'gemini-1.5-flash',
                        systemInstruction: systemInstruction,
                    });
                    if (onChunk) {
                        result = await fallbackModel.generateContentStream({ contents });
                    } else {
                        result = await fallbackModel.generateContent({ contents });
                    }
                } else if (process.env.OPENAI_API_KEY) {
                    logger.warn(`[VERTEX API 403 -> OPENAI FALLBACK] Falling back to OpenAI (gpt-4o)...`);
                    const { askOpenAI } = await import('./openai.service.js');
                    const aiText = await askOpenAI(finalPrompt, context, {
                        systemInstruction,
                        userName: options.userName,
                        language: targetLanguage,
                        userId: options.userId,
                        isJson: isJsonMode
                    });
                    if (onChunk) {
                        onChunk(aiText);
                    }
                    return options.returnSources ? { text: aiText, sources: [] } : aiText;
                } else {
                    throw execErr;
                }
            } else if ((errStr.includes("404") || errStr.includes("NOT_FOUND")) && selectedModelName !== 'gemini-2.5-flash') {
                logger.warn(`[VERTEX] Execution failed for ${selectedModelName}. Retrying with gemini-2.5-flash.`);
                const fallbackModel = genAIInstance.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: systemInstruction,
                    generationConfig: { maxOutputTokens: 4096 }
                });
                if (onChunk) {
                    result = await fallbackModel.generateContentStream({ contents });
                } else {
                    result = await fallbackModel.generateContent({ contents });
                }
            } else {
                if (process.env.OPENAI_API_KEY) {
                    logger.warn(`[VERTEX UNHANDLED -> OPENAI FALLBACK] Error: ${errStr}. Falling back to OpenAI...`);
                    const { askOpenAI } = await import('./openai.service.js');
                    const aiText = await askOpenAI(finalPrompt, context, {
                        systemInstruction,
                        userName: options.userName,
                        language: targetLanguage,
                        userId: options.userId,
                        isJson: isJsonMode
                    });
                    if (onChunk) {
                        onChunk(aiText);
                    }
                    return options.returnSources ? { text: aiText, sources: [] } : aiText;
                }
                throw execErr;
            }
        }

        if (onChunk) {
            let fullText = '';
            for await (const chunk of result.stream) {
                let text = '';
                if (typeof chunk.text === 'function') {
                    text = chunk.text();
                } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                    text = chunk.candidates[0].content.parts[0].text;
                } else if (chunk.text && typeof chunk.text === 'string') {
                    text = chunk.text;
                }
                fullText += text;
                onChunk(text);
            }
            
            // 4. JSON Parsing Attempt (If mode expects JSON)
            if (isJsonMode) {
                fullText = fullText.replace(/```json\s*|\s*```/g, '').trim();
            }

            logger.info(`[VERTEX] Streaming completed successfully (${fullText.length} chars).`);
            
            if (options.returnSources) {
                return { text: fullText, sources: [] };
            }
            return fullText;
        }

        const response = await result.response;
        const candidate = response.candidates?.[0];

        let text = '';
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (candidate?.content?.parts?.[0]?.text) {
            text = candidate.content.parts[0].text;
        } else {
            logger.warn(`[VERTEX] Unexpected response format: ${JSON.stringify(response)}`);
            text = "No response generated.";
        }

        // 4. JSON Parsing Attempt (If mode expects JSON)
        if (isJsonMode) {
            text = text.replace(/```json\s*|\s*```/g, '').trim();
        }

        // 5. Extract Search Grounding Sources
        let sources = [];
        if (options.useSearch && candidate?.groundingMetadata) {
            const gm = candidate.groundingMetadata;
            const chunks = gm.groundingChunks || [];
            sources = chunks.map(chunk => {
                if (chunk.web) {
                    return {
                        title: chunk.web.title || "Google Search Source",
                        url: chunk.web.uri
                    };
                }
                return null;
            }).filter(Boolean);
        }

        logger.info(`[VERTEX] Response received successfully (${text.length} chars).`);

        if (options.returnSources) {
            return { text, sources };
        }
        return text;

    } catch (error) {
        logger.error(`[VERTEX] Error: ${error.message}`);
        if (error.stack) logger.debug(`[VERTEX] Stack: ${error.stack}`);

        // Specific error for model not found 
        if ((error.message.includes("404") || error.message.includes("NOT_FOUND")) && !options.isFallback) {
            logger.warn(`[VERTEX] Model ${modelName} NOT_FOUND in asia-south1. Check model availability.`);
            // Do NOT fallback to gemini-1.5-pro — not available in asia-south1
            throw error;
        }

        // Fallback for safety blocks or specific quota issues
        if (error.message.includes("SAFETY")) {
            return "I cannot fulfill this request due to safety guidelines.";
        }
        if (error.message.includes("429") || error.message.includes("Quota")) {
            return "The AI system is currently receiving too many requests. Please wait a moment and try again.";
        }
        throw error;
    }
};

/**
 * Import a file from GCS into the Vertex RAG Corpus
 */
export const importToVertexRag = async (gcsUris, originalName = 'batch_import') => {
    try {
        const corpusId = await findOrCreateCorpus();
        if (!corpusId) {
            logger.warn("[Vertex RAG] Import skipped: No Corpus ID.");
            return null;
        }

        const uris = Array.isArray(gcsUris) ? gcsUris : [gcsUris];
        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || 'us-central1';

        if (!projectId) {
            throw new Error("GCP_PROJECT_ID not set in environment.");
        }
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const importUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/ragCorpora/${corpusId}/ragFiles:import`;

        const payload = {
            importRagFilesConfig: {
                gcsSource: {
                    uris: uris
                }
            }
        };

        logger.info(`[Vertex RAG] Triggering import for ${uris.length} files into corpus ${corpusId}`);
        const response = await axios.post(importUrl, payload, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });

        logger.info(`[Vertex RAG] Import triggered successfully for ${originalName}. Operation: ${response.data.name || 'Started'}`);
        return response.data;
    } catch (error) {
        logger.error(`[Vertex RAG] Import Error: ${error.response?.data?.error?.message || error.message}`);
        throw error;
    }
};

/**
 * Delete a file from the Vertex RAG Corpus
 */
export const deleteFromVertexRag = async (gcsUri, originalName) => {
    try {
        const corpusId = await findOrCreateCorpus();
        if (!corpusId) return;

        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || 'us-central1';

        if (!projectId) return;
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 1. List files to find the one matching GCS URI
        const listUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/ragCorpora/${corpusId}/ragFiles`;

        const res = await axios.get(listUrl, {
            headers: { Authorization: `Bearer ${token.token}` }
        });

        const files = res.data.ragFiles || [];
        const gcsFileName = gcsUri.split('/').pop();

        // Find by source URI or display name
        const fileToDelete = files.find(f =>
            f.ragFileConfig?.gcsSource?.uris?.includes(gcsUri) ||
            f.displayName === gcsFileName ||
            f.displayName === originalName
        );

        if (fileToDelete) {
            logger.info(`[Vertex RAG] Deleting file ${fileToDelete.name} from corpus...`);
            const deleteUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/${fileToDelete.name}`;
            await axios.delete(deleteUrl, {
                headers: { Authorization: `Bearer ${token.token}` }
            });
            logger.info(`[Vertex RAG] File deleted successfully: ${originalName}`);
        } else {
            logger.info(`[Vertex RAG] File not found in corpus for deletion: ${originalName}`);
        }
    } catch (error) {
        logger.error(`[Vertex RAG] Delete Error: ${error.response?.data?.error?.message || error.message}`);
        // Non-fatal, don't throw
    }
};
