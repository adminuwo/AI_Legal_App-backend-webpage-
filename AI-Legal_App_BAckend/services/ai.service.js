import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import Knowledge from "../models/Knowledge.model.js";
import { Worker } from 'worker_threads';
import path from 'path';
import * as vertexService from './vertex.service.js';
import * as openaiService from './openai.service.js';
import * as webSearchService from './webSearch.service.js';
import * as deepSearchService from './deepSearch.service.js';
import groqService from './groq.service.js';
import memoryService from './memory.service.js';
import QueryLog from '../models/QueryLog.model.js';
import userIntelligenceService from './userIntelligence.service.js';
import * as configService from './configService.js';
import { detectLanguage } from '../utils/languageDetector.js';
import { resolveResponseLanguage } from '../utils/languageResolver.js';
import { classifyIntent } from './intent/intentClassifier.js';
import { getLegalPrompt, LEGAL_DISCLAIMER, GLOBAL_RULES } from '../Tools/AI_Legal/legalPrompts.js';
import { safeParseLLMJson } from '../utils/jsonUtils.js';
import { performGlobalDatabaseSearch } from "../utils/aiMemorySystem.js";


// Real RAG Storage (MongoDB Atlas)
let vectorStore = null;
let embeddings = null;

// Web Search Cache
const searchCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const initializeVectorStore = async () => {
    if (!embeddings) {
        logger.info("Initializing Local Embeddings (Xenova/all-MiniLM-L6-v2) for Chat...");
        embeddings = new HuggingFaceTransformersEmbeddings({
            modelName: "Xenova/all-MiniLM-L6-v2",
        });
    }
    if (!vectorStore) {
        if (mongoose.connection.readyState !== 1) {
            throw new Error("MongoDB not connected yet");
        }
        const collection = mongoose.connection.db.collection("knowledge_vectors");
        vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection,
            indexName: "default",
            textKey: "text",
            embeddingKey: "embedding",
        });
        logger.info("MongoDB Atlas Vector Store initialized.");
    }
};

export const storeDocument = async (text, docId = null) => {
    try {
        await initializeVectorStore();
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([text]);
        logger.info(`[RAG] Split into ${docs.length} chunks.`);
        if (docs.length === 0) {
            logger.warn("[RAG] No chunks to embed.");
            return false;
        }
        const vectors = await embeddings.embedDocuments(docs.map(d => d.pageContent));
        logger.info(`[RAG] Generated ${vectors.length} vectors.`);
        await vectorStore.addVectors(vectors, docs);
        logger.info("[RAG] SUCCESSFULLY called vectorStore.addVectors().");
        return true;
    } catch (error) {
        logger.error(`[RAG UPLOAD ERROR] ${error.message}`);
        return false;
    }
};

export const chat = async (message, activeDocContent = null, options = {}) => {
    logger.info(`[AI-Service] Chat request received. Mode: ${options.mode || 'NORMAL'}`);
    let finalResponseData = { text: "" };
    try {
        if (!message || typeof message !== 'string') {
            message = String(message || "");
        }

        const { systemInstruction, mode, images, documents, userName, language, conversationId, userId, model, history, toolName, caseContext, onChunk } = options;

        const lowerMsg = message.toLowerCase().trim();
        const companyKeywords = ['uwo', 'aisa', 'ai mall', 'unified web', 'what can you do', 'your features', 'your capabilities', 'who are you', 'how can you help', 'tell me about your services'];
        let hasCompanyKeyword = companyKeywords.some(k => lowerMsg.includes(k));

        // --- CENTRALIZED LANGUAGE RESOLUTION & INTELLIGENCE ---
        const store = vertexService.langStorage?.getStore();
        const selectedLang = language || (store && typeof store === 'object' ? store.language : store);

        const resolvedLang = resolveResponseLanguage({
            currentMessage: message,
            selectedLanguage: selectedLang
        });

        const langContext = resolvedLang.systemInstruction;
        const userLanguage = resolvedLang.language;

        const isLegalMode = mode === 'LEGAL_TOOLKIT' || (toolName && toolName.startsWith('legal_'));

        logger.info(`[AI-Service] Lang Selection: ${resolvedLang.language} (${resolvedLang.style}/${resolvedLang.script}, Source: ${resolvedLang.source}, Option: ${language})`);

        // --- CONVERSATION MEMORY RAG ---
        // Combine history from frontend and retrieved memory from DB if available
        let retrievedHistory = [];
        if (conversationId) {
            logger.info(`[Memory] Retrieving memory for conversation: ${conversationId}`);
            retrievedHistory = await memoryService.retrieveMemory(conversationId, message, 5);
        }

        // Prepare context for models if history is provided
        const combinedHistory = history || []; // history from frontend is prioritized for multi-model consistency
        let historyToSend = combinedHistory;
        let summaryContext = "";

        if (combinedHistory.length > 50) {
            logger.info(`[Memory] History length ${combinedHistory.length} exceeds 50 messages. Creating conversation summary.`);
            try {
                const summaryPrompt = `
You are an expert Legal Case Architect. Analyze the following long conversation history and generate a structured summary.
Return the summary in strict Markdown format with these exact headings:
### PRIOR CONVERSATION HISTORY ARCHIVE SUMMARY:
- Key Facts: (summarize all facts discussed)
- Important Decisions: (list all user decisions approved)
- Open Questions: (questions still unanswered)
- Pending Actions: (list tasks/reminders needed)
- Referenced Documents & Evidence: (evidence/contracts mentioned)
- Next Steps: (what to do next)

CONVERSATION HISTORY:
${combinedHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
`;
                const rawSummary = await vertexService.askVertex(summaryPrompt, null, { modelOverride: 'gemini-2.5-flash' });
                summaryContext = `\n${rawSummary}\n`;
                historyToSend = combinedHistory.slice(-10);
                logger.info(`[Memory] Truncated chat history payload to last 10 messages.`);
            } catch (sumErr) {
                logger.error(`[Memory] Failed to generate conversation summary: ${sumErr.message}`);
                historyToSend = combinedHistory.slice(-20);
            }
        }

        // --- CROSS-APP DATABASE SEARCH ---
        let crossSearchContext = "";
        try {
            crossSearchContext = await performGlobalDatabaseSearch(userId, message, conversationId);
        } catch (searchErr) {
            logger.warn(`[Memory] Global database cross-search failed: ${searchErr.message}`);
        }

        // Save User Message (async)
        if (conversationId) {
            memoryService.saveMessageWithEmbedding(conversationId, userId, 'user', message).catch(err => {
                logger.error(`[Memory] Failed to save user message: ${err.message}`);
            });
        }

        // PRIORITY -1: PERSONA INJECTION & TOOL RESTRICTIONS
        const personaContext = await userIntelligenceService.getPersonaInjection(userId);

        const isActuallyImageMode = mode === 'IMAGE_GEN' || mode === 'IMAGE_EDIT';
        const isActuallyVideoMode = mode === 'VIDEO_GEN' || mode === 'IMAGE_TO_VIDEO';
        const isActuallySearchMode = mode === 'web_search' || mode === 'DEEP_SEARCH';
        const isActuallyCodeMode = mode === 'CODE_WRITER' || mode === 'CODING_HELP';
        const isActuallyConvertMode = mode === 'FILE_CONVERSION' || mode === 'DOCUMENT_CONVERT';

        let toolRestrictions = "";
        if (isActuallyImageMode) {
            toolRestrictions = "\n\n### MODE: IMAGE GENERATION ENABLED. You can generate images using JSON action strictly if explicitly asked. CRITICAL: When creating the JSON action, your 'prompt' MUST preserve the exact main subject requested by the user. Do NOT change, replace, or creatively reimagine the core subject (e.g. if the user says 'panda' or misinterprets it as 'panada', use exactly what they intended or wrote). NEVER substitute the subject with a generic person or other unrelated concepts.";
        } else if (isActuallyVideoMode) {
            toolRestrictions = "\n\n### MODE: VIDEO GENERATION ENABLED. You can generate videos using JSON action strictly if explicitly asked.";
        } else if (isActuallySearchMode) {
            toolRestrictions = "\n\n### MODE: WEB SEARCH ENABLED. Answer based on real-time data.";
        } else if (isActuallyCodeMode) {
            toolRestrictions = `
\n\n### MODE: CODE WRITER ENABLED.
- ROLE: You are an expert Software Architect and Senior Lead Developer. Your goal is to provide highly structured, technical, and complete implementation-ready code.
- FORMATTING OVERRIDE: Ignore general rules about "Using bullet points for lists" when displaying project structures.
- UNIFIED TREE: You MUST display the entire project/folder architecture inside ONE SINGLE markdown code block using a visual tree format (e.g., \`\`\`text).
- FULL FILE CONTENT: After the tree structure, you MUST provide the COMPLETE, FULL code for each and every file listed in the tree. Do not just explain what the file does. Do not provide partial code or just the file name. Provide the actual, runnable code.
- CODE BLOCKS: Wrap ALL code in proper multi-line markdown code blocks with the correct language tag (e.g., \`\`\`javascript, \`\`\`python, \`\`\`html).
- FILE PATHS: Before every code block, clearly write the file path as a bold header (e.g., **src/server.js**). Do NOT place file names inside code blocks unless it's a comment inside the actual code.
- NO INLINE PATHS AS CODE: Never output just the file name or folder name inside a code block. Code blocks are STRICTLY for the directory tree and the actual code.
- EXAMPLE TREE FORMAT (MANDATORY):
\`\`\`text
ProjectRoot/
├── src/
│   ├── controllers/
│   │   ├── AuthController.js
│   │   └── UserController.js
│   ├── models/
│   │   ├── User.js
│   │   └── ChatSession.js
│   └── server.js
└── package.json
\`\`\`
- CLEAN OUTPUT: Provide the unified Directory Tree first, and then sequentially provide the bold file name followed by its complete code block for every file.
`;
        } else if (isActuallyConvertMode) {
            toolRestrictions = `
\n\n### MODE: FILE CONVERSION ENABLED. 
You can convert documents between formats (PDF to DOCX, DOCX to PDF). 
To perform a conversion, you MUST respond with a JSON action strictly in this format:
{
  "action": "file_conversion",
  "source_format": "docx",
  "target_format": "pdf"
}
Maintain any text response outside the JSON block.`;
        } else if (mode === 'LEGAL_TOOLKIT' || mode === 'NORMAL_CHAT' || mode === 'CHAT' || !mode) {
            toolRestrictions = `\n\n### MODE: LEGAL SYSTEM ACTIVE — STRICT DOMAIN LOCK ⚖️
- You are a Senior Legal Assistant specialist EXCLUSIVELY for legal matters.
- 🚨 ABSOLUTE RESTRICTION: You MUST ONLY respond to queries related to: law, legal acts, IPC/CrPC/CPC/BNS/BNSS/BSA sections, court procedures, legal documents, contracts, FIR, rights, legal strategy, affidavits, legal notices, evidence, case analysis, or any legal guidance.
- 🌐 MULTILINGUAL & LANGUAGE COMMAND MANDATE:
  - If the user requests a language or language switch (e.g. "Marathi me smjhao", "Explain in Sanskrit", "Explain in Tamil", "Translate into Gujarati", "कन्नडदल्लि हेळि", "अब से हिंदी में जवाब दो"), you MUST IMMEDIATELY accept and fulfill the request in ${resolvedLang.language}.
  - DO NOT reject or output refusal messages when the user specifies a language preference.
  - If prior conversation history exists, re-explain or summarize the last legal topic in ${resolvedLang.language}.
  - If no prior context exists, greet the user in ${resolvedLang.language} as AI Legal™ Assistant and invite them to ask their legal question.
  - NEVER output "I can only assist in English", "I only support English and Hindi", "I cannot explain in ${resolvedLang.language}", or similar restrictive messages.
- 🚫 STRICT NON-LEGAL DOMAIN REFUSAL: If the user asks ANY question or topic that is NOT related to law or legal matters (e.g. recipes, cooking, entertainment, sports, movies, coding/programming, algorithms, math, weather, non-legal trivia, science, etc.), you MUST IMMEDIATELY politely decline to answer:
  "I am AI Legal™ Assistant, specialized strictly in legal queries, Indian laws, court procedures, and legal guidance. Your question appears to be outside the legal domain. Please ask any legal-related question." (Translate appropriately into user's language if asked in Hindi/other languages).
- 📊 LEGAL COMPARISON & DIFFERENCE MANDATE: Whenever the user asks for a difference, distinction, or comparison between legal terms, concepts, acts, sections, or offences (e.g. "What is the difference between crime and wrong", "IPC vs BNS", "Civil vs Criminal", "Lease vs License"), you MUST present the comparison using a clean, well-structured Markdown Table with proper column headers (| Aspect / Basis | Concept A | Concept B |) and alignment separator (|---|---|---|). 🚨 STRICT RULE: Do NOT use asterisks '*' or double asterisks '**' (such as writing "**Definition**") inside table headers or cell text. Write raw text like "Definition" instead of "**Definition**". Keep all text inside table cells clean and plain text. Provide detailed comparative rows (Definition, Applicable Law, Nature of Injury, Remedy, Burden of Proof, Examples).
- DO NOT include any legal disclaimers, warnings, or professional advice notices in the response. The system appends these automatically.`;

            if (caseContext) {
                toolRestrictions += `\n\n${caseContext}\n
### MANDATORY ACTIVE CASE ASSOCIATE RULES (ZERO REDUNDANCY & STRICT GROUNDING):
1. You are assigned as the dedicated Senior Legal Associate for the active case workspace detailed above.
2. You ALREADY possess the complete case facts, client details, opponent details, timeline, evidence, court, and intelligence.
3. STRICT GROUNDING: You MUST prioritize case information and source knowledge in the exact order:
   (1) Uploaded Documents & Extracted Ingestion Data
   (2) Workspace Memory / Key Facts / Case Intelligence
   (3) Active Case Details (Parties, Court, Judge)
   (4) General Legal Knowledge
   *NEVER reverse this order.*
4. ABSOLUTE PROHIBITION ON HALLUCINATION: You are NOT allowed to invent, extrapolate, or assume:
   - Parties, Names, or Roles
   - Dates, Deadlines, or Timestamps
   - Witnesses or Statements
   - Courts, Judges, or Jurisdictions
   - Sections, Clauses, or Statutes
   - Evidence or Exhibits
5. STRICT MISSING DATA FALLBACK: If the user asks for information, a draft notice/reply, a contract clause analysis, a litigation prediction, or strategies that cannot be grounded on or found in the provided case workspace details or uploaded documents, you MUST respond exactly and only with:
   "This information was not found in the uploaded documents."
6. NEVER ask the user to repeat details that are already present in the workspace context.`;
            }
        } else {

            toolRestrictions = "\n\n### MODE: NORMAL CHAT. Strictly avoid executing magic actions. Answer questions using text only. If the user wants to generate media, tell them to use the AISA Magic Tools menu.";
        }

        // --- INTENT CLASSIFICATION & RAG DETECTION (PARALLELIZED FOR SPEED) ---
        let classification = null;
        let needsRAG = false;
        let rewrittenQuery = message;


        try {
            // Strip [ACTIVE TOOL: ...] prefixes and legal disclaimers from history
            // to prevent prior legal-mode context from poisoning the intent classifier
            const chatSummary = (combinedHistory || []).slice(-3).map(m => {
                let text = m.content || m.text || '';
                // Remove [ACTIVE TOOL: ...] header (bold markdown variant too)
                text = text.replace(/^\*?\*?\[ACTIVE TOOL:[^\]]*\]\*?\*?\s*/i, '');
                // Remove legal disclaimer footer
                text = text.replace(/\*?\*?⚖️\s*\*?\*?Legal Disclaimer:\*?\*?\s*.*$/is, '');
                return `${m.role}: ${text.trim()}`;
            }).join(' | ');

            const isSpecializedMode = mode && mode !== 'NORMAL_CHAT' && mode !== 'CHAT';
            
            // Run independent pre-processing tasks in parallel
            const [intentResult, ragResult] = await Promise.all([
                isSpecializedMode
                    ? Promise.resolve({
                        intent: toolName || (mode === 'LEGAL_TOOLKIT' ? 'legal_free_chat' : mode.toLowerCase()),
                        tools: [toolName || (mode === 'LEGAL_TOOLKIT' ? 'legal_free_chat' : mode.toLowerCase())],
                        confidence: 1.0,
                        classified: false
                      })
                    : classifyIntent(message, images || documents || [], chatSummary).catch(() => null),
                vertexService.analyzeRAGRequirements(message).catch(() => ({ needsRAG: false, rewrittenQuery: message }))
            ]);

            classification = intentResult;
            needsRAG = toolName === 'legal_contract_analyzer' ? false : ragResult.needsRAG;
            rewrittenQuery = ragResult.rewrittenQuery;
            
            logger.info(`[RAG-Pipeline] Query Evaluation Complete:`);
            logger.info(`[RAG-Pipeline] ├─ Original Query : "${message}"`);
            logger.info(`[RAG-Pipeline] ├─ Needs RAG      : ${needsRAG ? '✅ YES' : '❌ NO'}`);
            if (needsRAG) {
                logger.info(`[RAG-Pipeline] └─ Rewritten      : "${rewrittenQuery}"`);
            }
        } catch (preProcessErr) {
            logger.warn(`[AI-Service] Pre-processing failed: ${preProcessErr.message}`);
        }

        let legalInstruction = "";
        // CRITICAL GUARD: Only auto-inject legal prompt if user is explicitly in LEGAL_TOOLKIT mode.
        // Prevents intent classifier from accidentally triggering the legal persona in normal chat.
        if (mode === 'LEGAL_TOOLKIT' && classification && classification.intent && classification.intent.startsWith('legal_')) {
            const isRedundant = toolName === classification?.intent;
            if (!isRedundant) {
                logger.info(`[AI-Service] Legal Intent Detected: ${classification.intent}.`);
                legalInstruction = `\n\n### SPECIALIZED LEGAL TOOL: ${classification.intent}\n${getLegalPrompt(classification.intent)}`;
            }
        }

        // --- INTENT-BASED TOOL ROUTING (STOCKS) ---
        if (classification && (classification.intent === 'stock_researcher' || classification.tools?.includes('stock_researcher'))) {
            logger.info(`[AI-Service] Stock Researcher intent detected.`);
            let symbol = classification.metadata?.stock_symbol || null;
            if (!symbol) {
                const capsMatch = message.match(/\b[A-Z]{2,10}\b/);
                if (capsMatch) symbol = capsMatch[0];
            }
            if (symbol) {
                const { getAiSnapshot } = await import('./stockService.js');
                const snapshot = await getAiSnapshot(symbol);
                if (snapshot) {
                    finalResponseData = {
                        text: `Here is my detailed analysis for **${symbol}**. I've compiled an AI Snapshot with risk analysis, performance metrics, and professional recommendations.`,
                        snapshot: snapshot,
                        type: 'stock_snapshot'
                    };
                }
            }
        }

        // --- GMAIL ASSISTANT ROUTING ---
        if (!finalResponseData.text && classification && (classification.intent === 'gmail_assistant' || classification.tools?.includes('gmail_assistant'))) {
            logger.info(`[AI-Service] Gmail Assistant intent detected. Triggering Gmail Service...`);
            const { handleGmailIntent } = await import('./intent/gmailService.js');
            const gmailResponse = await handleGmailIntent(userId, message);
            if (gmailResponse) {
                finalResponseData = {
                    text: gmailResponse.text,
                    type: 'gmail_assistant_action'
                };
            }
        }

        let activeToolInstruction = "";
        if (isLegalMode && toolName && toolName.startsWith('legal_') && toolName !== 'legal_contract_analyzer') {
            activeToolInstruction = `\n\n### ACTIVE LEGAL TOOL: ${toolName}\n${getLegalPrompt(toolName)}`;
        }

        const lastAssistantMessageObj = [...(combinedHistory || [])].reverse().find(m => (m.role === 'model' || m.role === 'assistant') && (m.content || m.text));
        const lastAssistantContent = lastAssistantMessageObj ? (lastAssistantMessageObj.content || lastAssistantMessageObj.text || '') : null;

        const isTransformationCommand = /\b(explain in|translate|translate into|in hindi|in marathi|in sanskrit|in tamil|in telugu|in kannada|in gujarati|in bengali|in punjabi|in urdu|hindi me|marathi me|sanskrit me|tamil me|kannada me|telugu me|gujarati me|make it shorter|shorter|make it formal|make it simple|simplify|expand|summarize|add more points|add points|add examples|give citations|continue|convert to table|convert into table|convert into points|remove point|advocate-friendly|re-explain|rephrase|and \d+|what about|give grounds|grounds|punishment|meaning|explain this|this|that|it|same|above|previous one|short krdo|formal krdo|simple me|detail me|bnao|krdo|kaise|kya|kyun)\b/i.test(message) || (message.trim().split(/\s+/).length <= 5 && (combinedHistory.length > 0 || !!lastAssistantContent));

        let followUpContext = "";
        if (isTransformationCommand && lastAssistantContent) {
            followUpContext = `
========================
🔄 ACTIVE FOLLOW-UP & TRANSFORMATION MANDATE
========================
You are processing a FOLLOW-UP / TRANSFORMATION instruction from the user ("${message}").
You MUST apply this instruction directly to the LAST ASSISTANT RESPONSE provided below.

LAST ASSISTANT RESPONSE:
"""
${lastAssistantContent.substring(0, 4000)}
"""

STRICT MANDATE FOR THIS TURN:
1. Transform, translate, edit, summarize, expand, or format the LAST ASSISTANT RESPONSE above according to "${message}".
2. ABSOLUTELY DO NOT ask clarification questions such as "Which topic do you want information on?", "What topic do you want?", or "Please provide the text".
3. Fulfill the requested transformation/translation directly in ${userLanguage}.
`;
        }

        const memorySystemRules = `
========================
🧠 PERSISTENT CONVERSATION MEMORY & HUMAN-LANGUAGE UNDERSTANDING RULES (MANDATORY)
========================
1. HUMAN-LANGUAGE & HINGLISH UNDERSTANDING:
   - Seamlessly understand natural, informal human typing across Hinglish, Roman Hindi (e.g., "mujhe bail application bnana h", "thoda simple language me", "grounds strong kro", "ispe precedent btao", "case ka summary btao", "defence ka kya h"), Devanagari Hindi, and casual English.
   - Respond naturally in the user's preferred language/script without forcing the user to retype in formal English.
   - TYPO & ABBREVIATION TOLERANCE: Interpret common typos and shorthand (e.g., "alw" -> law, "argumnt" -> argument, "crpc" -> CrPC, "bns" -> BNS, "ipc" -> IPC, "punishmnt" -> punishment, "sec" -> section, "docmnt" -> document, "oppo party" -> opposing party, "judgmnt" -> judgment, "defendent" -> defendant, "petitoner" -> petitioner).
   - NEVER output strict refusal/interrogation messages like "'alw' is not a legal term" or "Please provide 5 details". Infer intent and context naturally.

2. MULTI-TURN CONVERSATION CONTINUITY & PRONOUN RESOLUTION:
   - Treat every prompt as part of an active conversation thread. Words like "this", "that", "it", "same", "above", "previous one", "the second point", "and 406?", "make it shorter", "now give example", "and punishment?" MUST be bound to the prior user turns and assistant responses.
   - If the user asks "and 406?" after discussing Section 420, understand that 406 refers to Section 406 of the same Penal Code (IPC/BNS). DO NOT ask "406 of what?".
   - Preserve all user-provided facts (Client name, court, opponent, facts, objectives) throughout the entire conversation. Never ask the user to re-provide details already stated in this chat.

3. INTENT-FIRST FULFILLMENT (NO ROBOTIC QUESTIONNAIRES):
   - Immediately fulfill user requests using available conversation context.
   - If optional details are missing for a draft or document, generate the best possible draft and insert clear placeholders (e.g., "[Insert Hearing Date]") rather than delaying with a long questionnaire.

4. ABSOLUTE PROHIBITION ON MEMORY REFUSAL MESSAGES:
   - NEVER output phrases like "I don't have the capability to recall past conversations", "I cannot remember previous conversations", "I don't have access to previous conversations", "I cannot recall", "I don't have memory", or "As an AI, I don't remember past chats".
   - If the user asks what was discussed previously, summarize the past discussion context directly in the active language.

5. DRAFT PRESERVATION & TRANSFORMATION:
   - Generated drafts (Notices, Agreements, Affidavits, FIRs) remain active and editable. Instructions like "make it shorter", "make formal", "translate to Hindi", "add deadline" edit the existing draft rather than starting an unrelated topic.
6. MEMORY RESET: Only reset memory when the user explicitly requests: "Start a new topic", "Forget previous conversation", "Clear context", or "Reset".
`;

        // Construct dynamic instruction with unified multilingual language context and persistent memory rules appended
        const dynamicSystemInstruction = GLOBAL_RULES + "\n\n" + memorySystemRules + followUpContext + ((toolName === 'legal_contract_analyzer'
            ? (systemInstruction || "") + `\n\n${getLegalPrompt('legal_contract_analyzer')}`
            : (systemInstruction || "") + personaContext + toolRestrictions) + summaryContext + crossSearchContext) + `\n\n${langContext}`;

        // Helper to build context-aware prompt
        const buildMemoryPrompt = (query) => {
            if (toolName === 'legal_contract_analyzer') {
                return query;
            }
            if (retrievedHistory.length > 0) {
                return memoryService.buildContext(dynamicSystemInstruction, retrievedHistory, query);
            }
            return query;
        };

        // PRIORITY 0: REAL-TIME WEB SEARCH
        if (message.length > 5 && !images?.length && !documents?.length && !activeDocContent?.length) {
            const cacheKey = message.toLowerCase().trim();
            if (searchCache.has(cacheKey)) {
                const cached = searchCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_TTL) {
                    logger.info(`[WebSearch] Cache HIT for: ${message}`);
                    finalResponseData = { text: cached.result.summary, isRealTime: true, sources: cached.result.sources };
                }
            }

            if (!finalResponseData.text) {
                const isForcedSearch = mode === 'web_search' || mode === 'DEEP_SEARCH' || mode === 'SEARCH';
                // Only perform web search if explicitly requested via mode.
                // This ensures "normal questions" go to Vertex AI without extra resources.
                if (isForcedSearch) {
                    logger.info(`[WebSearch] ROUTING TO LIVE SEARCH (Mode: ${mode}) for: ${message}`);
                    let searchResult;

                    if (mode === 'DEEP_SEARCH') {
                        searchResult = await deepSearchService.performDeepSearch(message, userLanguage);
                    } else {
                        searchResult = await webSearchService.performSearch(message, userLanguage);
                    }

                    if (searchResult && (searchResult.summary || searchResult.text)) {
                        const summary = searchResult.summary || searchResult.text;
                        searchCache.set(cacheKey, { result: { summary, sources: searchResult.sources }, timestamp: Date.now() });
                        finalResponseData = { text: summary, isRealTime: true, sources: searchResult.sources };
                    } else {
                        logger.warn("[WebSearch] Search yielded no results.");
                    }
                }
            }
        }

        if (finalResponseData.text) {
            // Memory save handled at end
        } else if ((activeDocContent && activeDocContent.length > 0) || (images && images.length > 0) || (documents && documents.length > 0)) {
            // PRIORITY 1: Chat-Uploaded Document / Images

            // --- NEW: Legal Context Merging ---
            let combinedContext = null;
            if (mode === 'LEGAL_TOOLKIT' && toolName !== 'legal_contract_analyzer') {
                logger.info(`[LegalToolkit] Merging Case Context and RAG for Priority Rule.`);
                const ragAnalysis = await vertexService.analyzeRAGRequirements(message).catch(() => ({ needsRAG: true, rewrittenQuery: message }));
                const legalRewrittenQuery = ragAnalysis.rewrittenQuery || message;
                const ragContext = await vertexService.retrieveContextFromRag(legalRewrittenQuery, 8, 'LEGAL');

                combinedContext = `📄 CASE CONTEXT (PRIMARY):\n${activeDocContent || "Refer to attached file contents."}\n\n📚 LEGAL KNOWLEDGE (RAG - REFERENCE):\n${ragContext?.text || "No relevant legal references found."}`;
            }

            const promptWithMemory = buildMemoryPrompt(message);
            const vertexResponse = await vertexService.askVertex(promptWithMemory, combinedContext || activeDocContent, {
                systemInstruction: `${dynamicSystemInstruction}\n\n### LANGUAGE INSTRUCTION:\n${langContext}`,
                mode,
                images,
                documents,
                userName,
                isLegalTool: isLegalMode,
                toolName,
                history: historyToSend,
                onChunk,
                userId
            });

            finalResponseData = { text: vertexResponse, isRealTime: false };
        } else {
            // PRIORITY 2: Company Knowledge Base (Vertex RAG)
            let ragContext = null;
            if (needsRAG) {
                const targetCategory = (mode === 'LEGAL_TOOLKIT' || legalInstruction) ? 'LEGAL' : 'GENERAL';
                logger.info(`[RAG-Pipeline] Triggering Vertex AI Retrieval... (Category: ${targetCategory})`);
                ragContext = await vertexService.retrieveContextFromRag(rewrittenQuery, 8, targetCategory);

                if (!ragContext || !ragContext.sources || ragContext.sources.length === 0) {
                    logger.warn(`[RAG-Pipeline] ⚠️ No context found. Allowing fallback handling.`);
                } else {
                    logger.info(`[RAG-Pipeline] ✅ Successfully retrieved context with ${ragContext.sources.length} sources.`);
                }

                // Logging
                try {
                    await QueryLog.create({
                        user_question: message,
                        rewritten_query: rewrittenQuery,
                        retrieved_documents: ragContext?.sources?.map(s => ({
                            document_title: s.document_title,
                            source_type: s.source_type,
                            chunk_id: s.chunk_id,
                            snippet: s.snippet
                        })) || [],
                        userId: userId || 'admin'
                    });
                    logger.info(`[RAG-Pipeline] 💾 Saved QueryLog to database.`);
                } catch (logErr) {
                    logger.error(`[RAG-Pipeline] [QueryLog] Failed: ${logErr.message}`);
                }
            } else {
                logger.info(`[RAG-Pipeline] Skipping retrieval step (Query determined generic).`);
            }

            // Step 4: Final Processing
            // Only proceed with RAG generation if we have actual context from uploaded documents.
            // Otherwise, fall through to Priority 3 (General Vertex AI Chat).
            if (ragContext && ragContext.sources && ragContext.sources.length > 0) {
                const promptWithMemory = buildMemoryPrompt(message);
                // Step 4: Answer Generation (Context + Original Question)
                const ragInstructionWithLink = `${dynamicSystemInstruction}\n\n### WEBSITE CITATION RULE:\nWhenever you provide information about AISA or UWO based on the provided company documents, you MUST mention the official website: https://uwo24.com/`;

                // --- NEW: Unified Context Labeling for RAG-Only ---
                const labeledRagContext = (mode === 'LEGAL_TOOLKIT')
                    ? `📄 CASE CONTEXT: No specific document uploaded. Relying on legal principles.\n\n📚 LEGAL KNOWLEDGE (RAG):\n${ragContext?.text}`
                    : ragContext?.text;

                logger.info(`[RAG-Pipeline] Generating final answer using RAG context...`);
                const ragResponse = await vertexService.askVertex(promptWithMemory, labeledRagContext, {
                    userName,
                    systemInstruction: `${ragInstructionWithLink}\n\n### LANGUAGE RULE: ${langContext}\n\n${activeToolInstruction}\n\n${legalInstruction}`,
                    mode: 'RAG',
                    isLegalTool: isLegalMode,
                    toolName,
                    history: historyToSend,
                    onChunk,
                    userId
                });
                
                logger.info(`[RAG-Pipeline] ✅ RAG Response Generated Successfully (${ragResponse?.length || 0} chars).`);
                
                // Prepend [RAG] indicator to the text so the user knows it's from knowledge base (except in legal toolkit mode)
                const finalRagText = (mode === 'LEGAL_TOOLKIT')
                    ? ragResponse
                    : (ragResponse?.startsWith('[RAG]') ? ragResponse : `[RAG] ${ragResponse}`);
                
                finalResponseData = { 
                    text: finalRagText, 
                    isRealTime: false, 
                    sources: (mode === 'LEGAL_TOOLKIT') ? [] : (ragContext?.sources || []), 
                    mode: 'RAG' 
                };
            } else {
                // PRIORITY 3: Multi-Model or Vertex AI General Chat
                const promptWithMemory = buildMemoryPrompt(message);

                const currentModel = model?.toLowerCase();
                let aiResponse = "";

                if (currentModel && (currentModel.includes('gpt') || currentModel.includes('openai'))) {
                    logger.info(`[AI-Service] Routing to OpenAI (${currentModel})`);
                    // Outer scope langContext is used

                    const finalSystemInstruction = toolName === 'legal_contract_analyzer'
                        ? dynamicSystemInstruction
                        : `${dynamicSystemInstruction}\n\n### LANGUAGE RULE: ${langContext}\n\n${activeToolInstruction}\n\n${legalInstruction}`;
                    aiResponse = await openaiService.askOpenAI(promptWithMemory, null, {
                        systemInstruction: finalSystemInstruction,
                        userName,
                        userId
                    });
                } else if (currentModel && (currentModel.includes('groq') || currentModel.includes('llama'))) {
                    logger.info(`[AI-Service] Routing to Groq (${currentModel})`);
                    
                    // Outer scope langContext is used

                    const finalSystemInstruction = toolName === 'legal_contract_analyzer'
                        ? dynamicSystemInstruction
                        : `${dynamicSystemInstruction}\n\n### LANGUAGE RULE: ${langContext}\n\n${activeToolInstruction}\n\n${legalInstruction}`;
                    
                    aiResponse = await groqService.askGroq(promptWithMemory, null, {
                        systemInstruction: finalSystemInstruction,
                        userName,
                        userId
                    });
                } else {
                    // Default to Vertex AI (Gemini)
                    const lowerMsg = message.toLowerCase().trim();
                    const greetings = ['hi', 'hello', 'hii', 'hey', 'yo', 'namaste', 'greeting'];
                    const isGreeting = greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' '));

                    const basePersona = isGreeting
                        ? configService.getGreetingSystemInstruction(personaContext)
                        : configService.getGeneralSystemInstruction(personaContext);

                    logger.info(`[AI-Service] Executing Chat (Greeting: ${isGreeting}) for: "${message}"`);

                    const finalSystemInstruction = toolName === 'legal_contract_analyzer'
                        ? `${dynamicSystemInstruction}\n\n### LANGUAGE INSTRUCTION:\n${langContext}`
                        : `${basePersona}\n\n${dynamicSystemInstruction}\n\n### LANGUAGE INSTRUCTION:\n${langContext}\n\n${activeToolInstruction}\n\n${legalInstruction}`;


                    try {
                        aiResponse = await vertexService.askVertex(promptWithMemory, null, {
                            userName,
                            systemInstruction: finalSystemInstruction,
                            mode: mode || 'GENERAL',
                            images,
                            documents,
                            isLegalTool: isLegalMode,
                            toolName,
                            history: historyToSend,
                            onChunk,
                            userId
                        });
                    } catch (vertexErr) {
                        logger.warn(`[AI-Service] Vertex AI error (${vertexErr.message}). Falling back to OpenAI...`);
                        if (process.env.OPENAI_API_KEY) {
                            const { askOpenAI } = await import('./openai.service.js');
                            aiResponse = await askOpenAI(promptWithMemory, null, {
                                userName,
                                systemInstruction: finalSystemInstruction,
                                language: userLanguage,
                                userId
                            });
                        } else {
                            throw vertexErr;
                        }
                    }
                }

                finalResponseData = { text: aiResponse, isRealTime: false };
            }
        }

        // --- Post-Processing: Trigger Intelligence Engine (Async) ---
        userIntelligenceService.processInteraction(userId, message, 'user').catch(err => {
            logger.error(`[Intelligence] Processing failed: ${err.message}`);
        });

        // --- Save Assistant Message to Memory ---
        if (conversationId && finalResponseData.text) {
            memoryService.saveMessageWithEmbedding(conversationId, userId, 'assistant', finalResponseData.text).catch(err => {
                logger.error(`[Memory] Failed to save assistant message: ${err.message}`);
            });
        }

        // --- Generate Related Questions ---
        try {
            const suggestions = await generateRelatedQuestions(message, finalResponseData.text, userLanguage, mode);
            if (suggestions && suggestions.length > 0) {
                finalResponseData.suggestions = suggestions;
                logger.info(`[RelatedQuestions] Generated ${suggestions.length} suggestions.`);
            }
        } catch (err) {
            logger.error(`[RelatedQuestions] Task failed: ${err.message}`);
        }

        // --- POST-PROCESSING: Handle Legal Disclaimers & Cleanup ---
        if (finalResponseData.text && (mode === 'LEGAL_TOOLKIT' || legalInstruction)) {
            let cleanText = finalResponseData.text.trim();

            // 1. Strip standard RAG tags if they somehow got prepended
            if (cleanText.startsWith('[RAG]')) {
                cleanText = cleanText.replace(/^\[RAG\]\s*/i, '').trim();
            }

            // 2. Suppress source citations (empty array) so the UI doesn't show source chips
            finalResponseData.sources = [];

            // 3. Strip redundant disclaimers/hallucinated warnings anywhere in text (case-insensitive)
            // This catches "DISCLAIMER:", "NOTE:", "⚠️", etc. at start or end
            const disclaimerKeywords = [
                "professional legal advice",
                "consult a qualified lawyer",
                "not a substitute for legal advice",
                "general legal guidance",
                "legal disclaimer"
            ];

            // If the AI generated its own disclaimer, use that and don't append another
            const hasExistingDisclaimer = disclaimerKeywords.some(key => cleanText.toLowerCase().includes(key));

            // 4. Strip standard hallucinated headers if they appear at the top
            const headerHallucinationRegex = /^(⚠️|🚨)?[ \t]*(IMPORTANT|DISCLAIMER|NOTICE|WARNING):.*?\n+/i;
            cleanText = cleanText.replace(headerHallucinationRegex, '').trim();

            // 5. Append centralized disclaimer ONLY if no disclaimer was found in the text and the tool is not an exception
            const toolLower = String(toolName || '').toLowerCase();
            const isExceptionTool = 
                toolLower.includes('draft') || 
                toolLower.includes('notice') || 
                toolLower.includes('fir') || 
                toolLower.includes('affidavit') || 
                toolLower.includes('precedent') || 
                toolLower.includes('my_case') || 
                toolLower.includes('case_assistant') ||
                toolLower.includes('argument') ||
                toolLower.includes('court_prep') ||
                toolLower.includes('builder');

            if (!hasExistingDisclaimer && LEGAL_DISCLAIMER && !isExceptionTool) {
                // Ensure there's a clean break
                cleanText = cleanText + '\n\n' + LEGAL_DISCLAIMER.trim();
            }

            finalResponseData.text = cleanText;
        }

        return finalResponseData;

    } catch (error) {
        logger.error(`[AI-CHAT-ERROR] Stack Trace: ${error.stack}`);
        logger.error(`[AI-CHAT-ERROR] Message: ${error.message}`);
        const debugInfo = (process.env.NODE_ENV === 'development' || true) ? `\n\n*(Technical Error: ${error.message})*` : '';
        return {
            text: "I'm having trouble connecting to my brain right now. Please try again later." + debugInfo,
            error: true,
            details: error.message
        };
    }
};

export const initializeFromDB = async () => {
    try {
        await initializeVectorStore();
    } catch (error) {
        logger.error(`Failed to initialize Vector Store: ${error.message}`);
    }
};

export const reloadVectorStore = async () => {
    vectorStore = null;
    await initializeFromDB();
};

export const generateRelatedQuestions = async (userMessage, aiResponse, language = 'English', mode = 'GENERAL') => {
    try {
        const lowerMsg = (userMessage || "").toLowerCase().trim();
        const greetings = ['hi', 'hello', 'hii', 'hey', 'yo', 'namaste', 'greeting', 'hola', 'dear'];
        const isGreeting = greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' ')) || lowerMsg.length < 5;

        if (isGreeting) {
            if (mode === 'LEGAL_TOOLKIT') {
                return [
                    "How does AI Legal™ work?",
                    "What documents can you draft?",
                    "Can you analyze a contract?",
                    "How to draft a legal notice?"
                ];
            } else {
                return [
                    "What can you do?",
                    "Show me your features",
                    "Tell me about AISA",
                    "How do I generate an image?"
                ];
            }
        }

        const prompt = `You are an intelligent suggestion engine integrated into a chat system.

Your task is to generate 3 to 5 highly relevant, clickable follow-up suggestions after every AI response.

STRICT RULES:

1. Context Awareness:
- Suggestions MUST be based on the latest user message + AI response.
- Understand intent, tone, and topic before generating suggestions.

2. No Repetition:
- Never repeat the same suggestions across messages.
- Always generate fresh and unique suggestions.

3. Conversation Forwarding:
- Suggestions should help continue the conversation.
- They must guide the user to the next logical step.

4. Action-Oriented:
- Each suggestion must feel clickable and actionable.
- Use short, clear phrases (max 6-8 words).
- If Mode is LEGAL_TOOLKIT, suggest specific legal follow-ups.

5. Variety:
- Mix different types:
  - Clarification (e.g., "Explain in simple words")
  - Expansion (e.g., "Give more examples")
  - Action (e.g., "Create a sample case")
  - Alternative (e.g., "Show another approach")

6. Avoid Generic Suggestions:
❌ "Tell me more"
❌ "Explain again"
❌ "Next"

7. Personalization:
- If input is small (like "hello"), suggest onboarding-style options.
- If input is complex, suggest deep-dive or tools.

8. Language:
- Respond ENTIRELY in ${language}.

9. Format Output STRICTLY:

Return ONLY this JSON format:

{
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3",
    "Suggestion 4"
  ]
}

No extra text.

INPUT CONTEXT:
- User message: "${userMessage}"
- Assistant response: "${aiResponse}"
- Mode: ${mode}`;

        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 200,
            temperature: 0.8,
            modelOverride: 'gemini-2.5-flash'
        });

        const parsed = safeParseLLMJson(response, { suggestions: [] });
        const questions = parsed.suggestions || [];
        return Array.isArray(questions) ? questions.slice(0, 5) : [];
    } catch (error) {
        logger.error(`[RelatedQuestions] Error: ${error.message}`);
        return [];
    }
};

export const generateConversationTitle = async (message) => {
    try {
        const prompt = `Convert the following user message into a very short, clean title (3-5 words max).
        
Rules:
- NO QUOTES.
- NO CONVERSATIONAL FILLER.
- DO NOT answer the user. Just title it.
- Title Case for principal words.
- If it's a greeting, just say "Greeting". 
- ALWAYS try to summarize the topic if it's longer than 2 words.

User Message: "${message}"

Title:`;

        const fullPrompt = prompt;

        // Log the request
        logger.debug(`[AI-TITLE] Prompt: ${fullPrompt}`);

        const title = await vertexService.AskVertexRaw(fullPrompt, {
            maxOutputTokens: 50,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-flash'
        });

        // Log raw response
        logger.debug(`[AI-TITLE] Raw response: "${title}"`);

        // Clean up the potentially generated string (remove surrounding quotes if any)
        const cleanTitle = title.trim().replace(/^["']|["']$/g, '').replace(/\.\.\.$/, '');

        // If it's a safety block or too long, use fallback
        if (cleanTitle.toLowerCase().includes("cannot fulfill") || cleanTitle.length > 60 || !cleanTitle) {
            throw new Error(`Invalid AI title response: "${cleanTitle}"`);
        }

        return cleanTitle;
    } catch (error) {
        logger.error(`[AI-TITLE] Error generateConversationTitle: ${error.message}`);
        // Last resort: substring of the message (ChatGPT-style fallback)
        const words = message.trim().split(/\s+/);
        if (!message.trim()) return "New Chat";
        return words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    }
};

export const ragChat = async (message) => {
    return chat(message);
};
