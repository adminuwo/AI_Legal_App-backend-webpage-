import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import ChatSession from "../models/ChatSession.js";
import Project from "../models/Project.js";
import { generativeModel, genAIInstance, modelName as primaryModelName } from "../config/vertex.js";
import userModel from "../models/User.js";
import Guest from "../models/Guest.js";
import { verifyToken, optionalVerifyToken } from "../middleware/authorization.js";
import { checkFeatureSubscription } from "../middleware/subscriptionCheck.middleware.js";
import { identifyGuest } from "../middleware/guestMiddleware.js";
import { upload } from "../services/cloudinary.service.js";
import { uploadToGCS, gcsFilename, getSignedUrl } from "../services/gcs.service.js";
import mammoth from "mammoth";
import { detectMode, getModeSystemInstruction } from "../utils/modeDetection.js";
import { detectIntent, extractReminderDetails, detectLanguage, getVoiceSystemInstruction } from "../utils/voiceAssistant.js";
import Reminder from "../models/Reminder.js";
import { requiresWebSearch, extractSearchQuery, processSearchResults, getWebSearchSystemInstruction, getCachedSearch, setCachedSearch } from "../utils/webSearch.js";
import { performWebSearch } from "../services/searchService.js";
import { convertFile } from "../utils/fileConversion.js";
import officeParser from 'officeparser';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { getMemoryContext, extractUserMemory, updateMemory } from "../utils/memoryService.js";
import { getUnifiedSharedMemoryContext, triggerAiCrossCommunication } from "../utils/aiMemorySystem.js";
import { subscriptionService, checkPremiumAccess } from '../services/subscriptionService.js';
import { retrieveContextFromRag, detectRAGNeed } from "../services/vertex.service.js";
import * as configService from "../services/configService.js";
import Knowledge from "../models/Knowledge.model.js";
import * as webSearchService from "../services/webSearch.service.js";
import * as deepSearchService from "../services/deepSearch.service.js";

const sanitizeProjectId = (pid) => {
  if (!pid || pid === 'default' || pid === 'all' || pid === 'null' || pid === 'undefined') return null;
  if (typeof pid === 'string' && mongoose.Types.ObjectId.isValid(pid)) return pid;
  if (pid instanceof mongoose.Types.ObjectId) return pid;
  return null;
};
import memoryService from "../services/memory.service.js";
import * as aiService from "../services/ai.service.js";
import { uploadAttachment } from "../controllers/chat.controller.js";
import uploadMiddleware from "../middleware/upload.middleware.js";
import AIService from "../services/core/AIService.js";
import CaseAssistantService from "../services/core/CaseAssistantService.js";

const router = express.Router();
const aiServiceCore = new AIService();
const caseAssistantService = new CaseAssistantService();


const checkSessionOwnership = (session, req) => {
  const userId = req.user?.id || req.user?._id;
  const guestId = req.guest?.guestId;
  const sessionOwnerId = session.userId ? session.userId.toString() : null;
  const sessionGuestId = session.guestId;

  if (sessionOwnerId) {
    if (!userId || userId.toString() !== sessionOwnerId) {
      return false;
    }
  } else if (sessionGuestId) {
    if (!guestId || guestId !== sessionGuestId) {
      return false;
    }
  } else {
    if (!userId && !guestId) {
      return false;
    }
  }
  return true;
};

// Helper to check guest limits
const checkGuestLimits = async (req, sessionId) => {
  const guestId = req.guest?.guestId;
  if (!guestId && !req.user) return { allowed: true };

  if (req.user) return { allowed: true };

  const guest = await Guest.findOne({ guestId });
  if (!guest) return { allowed: true };

  // 1. Session Count Limit (Max 5 sessions)
  const sessionCount = await ChatSession.countDocuments({ guestId });
  
  // Check if current session exists
  const sessionExists = await ChatSession.findOne({ sessionId, guestId });
  
  // If we're trying to start a 6th session
  if (!sessionExists && sessionCount >= 5) {
    return { allowed: false, reason: "GUEST_SESSIONS_EXCEEDED" };
  }

  // 2. Chat Count Limit per Session (Max 10 user messages)
  if (sessionExists) {
    const userMessageCount = sessionExists.messages.filter(m => m.role === 'user').length;
    if (userMessageCount >= 10) {
      return { allowed: false, reason: "GUEST_CHATS_EXCEEDED" };
    }
  }

  return { allowed: true };
};

// --- CORE CHAT ENDPOINT ---
router.post("/", optionalVerifyToken, identifyGuest, async (req, res) => {
  const { content, history, systemInstruction, image, video, document, language, model, mode: reqMode, sessionId, userMsgId, aiMsgId, aspectRatio, modelId: reqModelId, skipSession } = req.body;

  let mode = reqMode;
  let resolvedToolName = req.body.activeTool || req.body.toolName;

  const toolMapping = {
    'contractAnalyzer': 'legal_contract_analyzer',
    'strategyEngine': 'legal_strategy_engine',
    'argumentBuilder': 'legal_argument_builder',
    'draftMaker': 'legal_draft_maker',
    'casePredictor': 'legal_case_predictor',
    'evidenceAnalyst': 'legal_evidence_checker',
    'researchAssistant': 'legal_research_assistant',
    'legalResearch': 'legal_research',
    'legal_contract_analyzer': 'legal_contract_analyzer',
    'legal_strategy_engine': 'legal_strategy_engine',
    'legal_argument_builder': 'legal_argument_builder',
    'legal_draft_maker': 'legal_draft_maker',
    'legal_case_predictor': 'legal_case_predictor',
    'legal_evidence_checker': 'legal_evidence_checker',
    'legal_research_assistant': 'legal_research_assistant',
    'legal_knowledge_hub': 'legal_knowledge_hub',
    'knowledgeHub': 'legal_knowledge_hub',
    'knowledge_hub': 'legal_knowledge_hub',
    'legal_my_case': 'legal_my_case',
    'caseAssistant': 'legal_my_case'
  };

  if (req.body.activeTool && toolMapping[req.body.activeTool]) {
    resolvedToolName = toolMapping[req.body.activeTool];
  }

  if (resolvedToolName && resolvedToolName.startsWith('legal_')) {
    mode = 'LEGAL_TOOLKIT';
  }

  try {
    // 1. LIMIT & CREDIT CHECKS
    const limitCheck = await checkGuestLimits(req, sessionId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: "LIMIT_REACHED", reason: limitCheck.reason });
    }

    let toolsRequested = [];
    if (mode === 'DEEP_SEARCH' || mode === 'web_search') {
      toolsRequested.push(mode);
    } else if (mode === 'CODE_WRITER' || mode === 'CODING_HELP') {
      toolsRequested.push('code_writer');
    } else if (mode === 'LEGAL_TOOLKIT') {
      toolsRequested.push('legal_toolkit');
    } else {
      toolsRequested.push('chat');
    }
    if (document && (Array.isArray(document) ? document.length > 0 : document.base64Data)) toolsRequested.push('convert_document');

    if (req.user) {
      // Early Admin Bypass
      if (req.user.email && req.user.email.toLowerCase() === 'admin@uwo24.com') {
        console.log(`[Admin-Bypass] Granting immediate access to admin@uwo24.com`);
      } else {
        const userId = req.user.id || req.user._id;
        const targetTool = req.body.activeTool || req.body.toolName || req.body.tool || 'ai_chat';
        try {
          const FeatureAccessManager = await import('../services/featureAccessManager.js');
          const accessCheck = await FeatureAccessManager.checkAccess(userId, targetTool);
          if (accessCheck && !accessCheck.allowed) {
            return res.status(200).json({
              success: false,
              code: 'LIMIT_EXCEEDED',
              error: 'LIMIT_EXCEEDED',
              feature: targetTool,
              message: `You have reached your monthly limit of ${accessCheck.limit} ${targetTool === 'ai_chat' ? 'AI chats' : targetTool}. Please upgrade your plan to continue.`
            });
          }
        } catch (accErr) {
          console.warn('[FeatureAccessCheck Error]', accErr.message);
        }

        // Verify activeTool subscription access & trial limits
        if (req.body.activeTool) {
          const userRec = await userModel.findById(userId);
          if (userRec) {
            const subCheck = await checkFeatureSubscription(userRec, req.body.activeTool);
            if (!subCheck.success) {
              return res.status(200).json(subCheck);
            }
          }
        }
        try {
          await subscriptionService.checkCredits(userId, toolsRequested, req.body);
        } catch (subError) {
          return res.status(403).json({ success: false, code: subError.message === "PREMIUM_RESTRICTED" ? "PREMIUM_ONLY" : "OUT_OF_CREDITS", message: subError.message });
        }
      }
    }

    // 2. PRE-PROCESSING: Extract text from DOCX files (Gemini/Vertex AI does not support .docx natively)
    let activeDocContent = null;
    let filteredDocuments = document;
    
    if (document && Array.isArray(document) && document.length > 0) {
      const docTexts = [];
      const validDocs = [];
      
      for (const doc of document) {
        if (doc.mimeType?.startsWith('audio/') || doc.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i)) {
          continue;
        }
        const isPdf = doc.mimeType?.includes('pdf') || doc.name?.match(/\.pdf$/i);
        const isWord = doc.mimeType?.includes('word') || doc.name?.match(/\.(docx|doc)$/i);
        const isRtf = doc.mimeType?.includes('rtf') || doc.name?.match(/\.rtf$/i);
        
        if ((isPdf || isWord || isRtf) && doc.base64Data) {
          try {
            const buffer = Buffer.from(doc.base64Data, 'base64');
            let extractedText = "";
            
            if (isPdf) {
              try {
                const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse?.default || pdfParse);
                if (typeof parseFn === 'function') {
                  const pdfData = await parseFn(buffer);
                  extractedText = pdfData?.text || "";
                }
              } catch (pdfErr) {
                console.warn("[PDF Text Extraction Error]", pdfErr.message);
              }
            } else if (isWord) {
              const parser = (officeParser && officeParser.parseOfficeAsync) ? officeParser : (officeParser?.default || officeParser);
              try {
                if (parser && typeof parser.parseOfficeAsync === 'function') {
                  extractedText = await parser.parseOfficeAsync(buffer);
                } else {
                  throw new Error("officeParser not properly loaded");
                }
              } catch (officeErr) {
                console.warn("[Mammoth Fallback] officeparser failed or not loaded:", officeErr.message);
                const result = await mammoth.extractRawText({ buffer });
                extractedText = result.value;
              }
            } else if (isRtf) {
               // Basic RTF to Text Regex extraction
               const rtfContent = buffer.toString('utf-8');
               extractedText = rtfContent
                 .replace(/\\([a-z]{1,32})(-?\d+)? ?/g, '') // Strip RTF keywords
                 .replace(/\{[^}]+\}/g, '') // Strip RTF groups
                 .replace(/\r?\n/g, ' ') // Flatten newlines
                 .trim();
            }
            
            if (extractedText && extractedText.trim().length > 30) {
              let cleanText = extractedText.trim();
              // Cap extremely large documents (e.g. 500 pages) at 120,000 chars (~25,000 words) for instant AI processing
              if (cleanText.length > 120000) {
                cleanText = cleanText.substring(0, 120000) + "\n\n... [Document truncated at 120,000 characters for optimal AI performance]";
              }
              docTexts.push(`[${isPdf ? 'PDF' : isRtf ? 'RTF' : 'Word'} Document Content: ${doc.name || 'Untitled'}]\n${cleanText}`);
            } else {
              // Scanned PDF or document with no digital text layer — pass to validDocs so Gemini Multimodal Vision receives the raw document base64
              validDocs.push(doc);
            }
          } catch (mErr) {
            console.error("[Document Extraction Error]", mErr);
            validDocs.push(doc);
          }
        } else {
          validDocs.push(doc);
        }
      }

      if (docTexts.length > 0) {
        activeDocContent = docTexts.join('\n\n---\n\n');
      }
      filteredDocuments = validDocs;
    }

    // ── AUTO-HYDRATE HISTORY, LANGUAGE LOCK & RESET HANDLING ──
    let effectiveHistory = history;
    let effectiveLanguage = language || req.body.outputLanguage || req.body.preferred_response_language;
    let existingSession = null;

    if (sessionId) {
      existingSession = await ChatSession.findOne({ sessionId });
      if (existingSession) {
        if (!effectiveLanguage && existingSession.preferredLanguage) {
          effectiveLanguage = existingSession.preferredLanguage;
        }
        if ((!effectiveHistory || !Array.isArray(effectiveHistory) || effectiveHistory.length === 0) && existingSession.messages && existingSession.messages.length > 0) {
          effectiveHistory = existingSession.messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
          }));
        }
      }
    }

    const isResetCommand = /\b(start a new topic|forget previous conversation|clear context|reset chat|clear memory|forget history)\b/i.test(content || '');
    if (isResetCommand) {
      if (existingSession) {
        existingSession.messages = [];
        existingSession.preferredLanguage = null;
        await existingSession.save();
      }
      const resetMsg = "Context cleared. Starting a fresh legal conversation! How can I help you?";
      if (req.body.stream === true) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ chunk: resetMsg })}\n\n`);
        return res.end();
      } else {
        return res.json({ reply: resetMsg, detectedMode: 'NORMAL_CHAT', isRealTime: false, sources: [] });
      }
    }

    // ── MASTER CASE CONTEXT EXTRACTION (SSOT - UNIFIED ENTERPRISE MEMORY) ──
    const workspaceId = req.body.workspaceId || req.headers['x-workspace-id'] || req.headers['x-active-workspace-id'] || req.query?.workspaceId || 'personal_practice';
    const workspaceType = req.body.workspaceType || req.headers['x-workspace-type'] || req.query?.workspaceType || 'personal';

    let activeProjectId = req.body.caseId || req.body.projectId || req.query?.caseId || req.query?.projectId;
    if (!activeProjectId && sessionId) {
      try {
        const s = await ChatSession.findOne({ sessionId }).select('projectId').lean();
        if (s && s.projectId) activeProjectId = s.projectId;
      } catch (sErr) {}
    }

    let masterCaseContext = '';
    if (req.user) {
      const finalUserId = req.user.id || req.user._id;
      console.log(`[CHAT ROUTE DIAGNOSTIC] authenticatedUserId: ${finalUserId} | reqWorkspaceId: ${req.body.workspaceId || req.headers['x-workspace-id'] || req.headers['x-active-workspace-id']} | resolvedWorkspaceId: ${workspaceId} | workspaceType: ${workspaceType}`);
      masterCaseContext = await getUnifiedSharedMemoryContext(
        finalUserId,
        activeProjectId,
        resolvedToolName,
        workspaceId,
        workspaceType,
        content
      );
    }

    // ── SSE Streaming Mode ───────────────────────────────────────────────────
    if (req.body.stream === true) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      let fullText = '';
      let session = null;
      const streamOnChunk = (chunk) => {
        if (chunk && res.writable) {
          fullText += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          if (typeof res.flush === 'function') res.flush();
        }
      };

      try {
        const chatResponse = await aiService.chat(content, activeDocContent, {
          systemInstruction,
          mode,
          images: image,
          documents: filteredDocuments,
          userName: req.user?.name ? req.user.name.split(' ')[0] : undefined,
          language: effectiveLanguage,
          conversationId: sessionId,
          userId: req.user?.id || req.user?._id,
          model,
          history: effectiveHistory,
          toolName: resolvedToolName,
          caseContext: masterCaseContext,
          onChunk: streamOnChunk
        });

        // If the service returned text directly (e.g. search/image mode fallback), emit remainder
        const finalReply = chatResponse.text || fullText || '';
        if (finalReply && finalReply !== fullText) {
          const remainder = finalReply.slice(fullText.length);
          if (remainder) {
            res.write(`data: ${JSON.stringify({ chunk: remainder })}\n\n`);
            if (typeof res.flush === 'function') res.flush();
            fullText = finalReply;
          }
        }

        const isWebSearchResponse = chatResponse.isRealTime || false;
        const searchSources = chatResponse.sources || [];
        const detectedMode = chatResponse.mode || mode || 'CHAT';

        // Session persistence (same as non-stream path)
        if (!skipSession) {
          session = await ChatSession.findOne({ sessionId });
          const userId = req.user ? req.user.id : null;
          const isGenericTitle = !session || session.title === 'New Chat' || session.title === 'Greeting' || session.title === 'General Chat' || (session.title && session.title.includes('...'));

          if (!session) {
            const words = (content || '').trim().split(/\s+/);
            const aiTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '') || 'New Chat';
            const reqPid = sanitizeProjectId(req.body.projectId || req.body.caseId);
            const reqTool = req.body.activeTool || null;
            const autoConvType = req.body.conversationType || (reqPid ? 'case' : (reqTool && reqTool !== 'legal_my_case' && reqTool !== 'none' ? 'tool' : 'global'));

            session = new ChatSession({
              sessionId: sessionId || `temp_${Date.now()}`,
              userId: userId || null,
              guestId: req.guest?.guestId || null,
              projectId: reqPid,
              conversationType: autoConvType,
              title: aiTitle || 'New Chat',
              detectedMode: detectedMode || 'NORMAL_CHAT',
              activeTool: reqTool,
              messages: []
            });
            if (userId) await userModel.findByIdAndUpdate(userId, { $addToSet: { chatSessions: session._id } });
          } else if (isGenericTitle) {
            const words = (content || '').trim().split(/\s+/);
            const aiTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '') || 'New Chat';
            if (aiTitle) session.title = aiTitle;
          }

          if (detectedMode) session.detectedMode = detectedMode;
          if (req.body.activeTool) session.activeTool = req.body.activeTool;
          if (req.body.conversationType) session.conversationType = req.body.conversationType;
          else if (session.projectId) session.conversationType = 'case';

          const hasUserMsg = session.messages.some(m => m.id === userMsgId || (m.role === 'user' && m.content === content));
          if (!hasUserMsg) {
            session.messages.push({ id: userMsgId || `be_${Date.now()}`, role: 'user', content: content || (image ? 'Image interaction' : 'Action'), timestamp: Date.now() });
          }
          session.messages.push({
            id: aiMsgId || `be_ai_${Date.now() + 1}`,
            role: 'model',
            content: fullText || 'Thinking...',
            timestamp: Date.now() + 1,
            isRealTime: isWebSearchResponse,
            sources: searchSources,
            suggestions: chatResponse.suggestions || []
          });

          session.lastModified = Date.now();
          await session.save();

          const finalUserId = req.user?.id || req.user?._id;
          if (finalUserId) {
            triggerAiCrossCommunication(finalUserId, activeProjectId, content, fullText).catch(() => {});
            await subscriptionService.deductCredits(finalUserId, toolsRequested, sessionId, req.body).catch(() => {});
            
            // Asynchronously extract and update user memory profile
            (async () => {
              try {
                const fs = await import('fs');
                fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Started memory extraction for user: ${finalUserId}\n`);
                const historySlice = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
                const extractedInfo = await extractUserMemory(content, historySlice);
                fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Extracted info: ${JSON.stringify(extractedInfo)}\n`);
                if (extractedInfo) {
                  const result = await updateMemory(finalUserId, extractedInfo, resolvedToolName || 'General Chat');
                  fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Saved memory successfully: ${JSON.stringify(result)}\n`);
                }
              } catch (e) {
                try {
                  const fs = await import('fs');
                  fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] [Memory extraction error]: ${e.message}\n${e.stack}\n`);
                } catch (fsErr) {}
                console.warn('[Memory extraction error]:', e.message);
              }
            })();
          }
        }

        const finalUserId = req.user?.id || req.user?._id;
        const activeToolStream = req.body.activeTool || req.body.toolName || req.body.tool || req.body.featureKey || req.body.feature || (req.body.mode && req.body.mode !== 'CHAT' && req.body.mode !== 'NORMAL_CHAT' ? req.body.mode : 'ai_chat');
        let streamUsageStatus = null;
        if (finalUserId) {
          try {
            const FeatureAccessManager = await import('../services/featureAccessManager.js');
            const normTool = FeatureAccessManager.normalizeFeatureKey(activeToolStream);
            await FeatureAccessManager.incrementUsage(finalUserId, normTool);
            streamUsageStatus = await FeatureAccessManager.getUsageStatus(finalUserId);
          } catch (uErr) {
            console.error('[CHAT STREAM FEATURE USAGE DEDUCTION ERROR]', uErr);
          }
        }

        if (!skipSession) {
          // Send final metadata
          res.write(`data: ${JSON.stringify({ done: true, title: session?.title, sessionId: session?.sessionId, sources: searchSources, suggestions: chatResponse.suggestions || [], isRealTime: isWebSearchResponse, usageStatus: streamUsageStatus })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ done: true, sources: searchSources, suggestions: chatResponse.suggestions || [], isRealTime: isWebSearchResponse, usageStatus: streamUsageStatus })}\n\n`);
        }

        if (res.writable) res.end();
      } catch (streamErr) {
        console.error('[Stream] Error:', streamErr.message);
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
          res.end();
        }
      }
      return;
    }

    // ── Standard (Non-Streaming) Mode ────────────────────────────────────────
    // 3. UNIFIED AI SERVICE CALL
    const chatResponse = await aiService.chat(content, activeDocContent, {
      systemInstruction,
      mode,
      images: image,
      documents: filteredDocuments,
      userName: req.user?.name ? req.user.name.split(' ')[0] : undefined,
      language: effectiveLanguage,
      conversationId: sessionId,
      userId: req.user?.id || req.user?._id,
      model,
      history: effectiveHistory,
      toolName: resolvedToolName,
      caseContext: masterCaseContext
    });

    let reply = chatResponse.text || "";
    let isWebSearchResponse = chatResponse.isRealTime || false;
    let searchSources = chatResponse.sources || [];
    let detectedMode = chatResponse.mode || mode || 'CHAT';

    // 3. POST-PROCESSING: MAGIC TOOLS EXECUTION
    const finalResponse = {
      reply,
      detectedMode,
      isRealTime: isWebSearchResponse,
      sources: searchSources,
      language: language || 'English',
      suggestions: chatResponse.suggestions || []
    };

    try {
      let data = { action: 'chat', reply: reply };
      const jsonMatch = reply.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
          reply = (reply.replace(jsonMatch[0], '').trim()) || "Action processed.";
        } catch (e) { /* ignore parse error */ }
      }

      if (data.action === 'file_conversion' && (image || document)) {
        try {
          const docToConvert = (Array.isArray(document) ? document[0] : document) || (Array.isArray(image) ? image[0] : image);
          
          if (docToConvert && docToConvert.base64Data) {
            const buffer = Buffer.from(docToConvert.base64Data, 'base64');
            const sourceFormat = data.source_format || (docToConvert.mimeType?.includes('pdf') ? 'pdf' : 'docx');
            const targetFormat = data.target_format || (sourceFormat === 'pdf' ? 'docx' : 'pdf');
            
            const convertedBuffer = await convertFile(buffer, sourceFormat, targetFormat);
            
            if (convertedBuffer) {
              finalResponse.conversion = {
                file: convertedBuffer.toString('base64'),
                fileName: `aisa_converted_${Date.now()}.${targetFormat}`,
                mimeType: targetFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              };
              finalResponse.reply = `I have successfully converted **${docToConvert.name || 'your file'}** to **${targetFormat.toUpperCase()}** format. 📄 You can download it using the icon above.`;
            }
          }
        } catch (convErr) {
          console.error("[FILE CONVERSION ERROR]", convErr);
          finalResponse.reply = reply + `\n\n*(Error: Conversion failed - ${convErr.message})*`;
        }
      }
    } catch (e) {
      console.warn("[MediaGen] Setup failed", e);
    }

    finalResponse.reply = finalResponse.reply || reply;

    // 4. SESSION MANAGEMENT
    // skipSession=true means this is an internal call (e.g. follow-up suggestions) — never persist to DB
    if (skipSession) {
      return res.status(200).json(finalResponse);
    }

    console.log(`[BACKEND-CHAT] Session ID: ${sessionId} | Content Len: ${content?.length}`);
    let session = await ChatSession.findOne({ sessionId });
    const isGenericTitle = !session ||
      session.title === "New Chat" ||
      session.title === "Greeting" ||
      session.title === "General Chat" ||
      (session.title && session.title.includes('...'));
      
    console.log(`[BACKEND-CHAT] Session found: ${!!session} | Generic Title: ${isGenericTitle} | Title: ${session?.title}`);
    const userId = req.user ? req.user.id : null;

    if (!session) {
      const reqUserRole = (req.body.role || req.headers['x-user-role'] || req.body.workspaceType || req.headers['x-workspace-type'] || 'advocate').toLowerCase();
      const isStudent = reqUserRole === 'student' || req.body.conversationType === 'student_tutor';

      const words = (content || "").trim().split(/\s+/);
      const aiTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '') || "New Chat";
      const cleanPid = sanitizeProjectId(req.body.projectId || req.body.caseId);
      const reqTool = req.body.activeTool || null;
      let autoConvType = req.body.conversationType;
      let autoAssistantType = isStudent ? 'legal_tutor' : 'legal_assistant';

      if (isStudent) {
        autoConvType = 'student_tutor';
        autoAssistantType = 'legal_tutor';
      } else if (!autoConvType) {
        autoConvType = cleanPid ? 'case' : (reqTool && reqTool !== 'legal_my_case' && reqTool !== 'none' ? 'tool' : 'global');
      }

      session = new ChatSession({
        sessionId: sessionId || `temp_${Date.now()}`,
        userId: userId || null,
        guestId: req.guest?.guestId || null,
        workspaceId: isStudent ? 'student' : (req.body.workspaceId || 'personal_practice'),
        workspaceType: isStudent ? 'student' : 'advocate',
        assistantType: autoAssistantType,
        projectId: cleanPid,
        conversationType: autoConvType,
        title: aiTitle || "New Chat",
        detectedMode: detectedMode || (isStudent ? 'STUDENT_TUTOR' : 'NORMAL_CHAT'),
        activeTool: isStudent ? 'legal_tutor' : reqTool,
        messages: []
      });
      if (userId) await userModel.findByIdAndUpdate(userId, { $addToSet: { chatSessions: session._id } });
    } else if (session) {
      if (isGenericTitle) {
        const words = (content || "").trim().split(/\s+/);
        const aiTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '') || "New Chat";
        if (aiTitle) session.title = aiTitle;
      }
      
      const reqUserRole = (req.body.role || req.headers['x-user-role'] || req.body.workspaceType || req.headers['x-workspace-type'] || 'advocate').toLowerCase();
      const isStudent = reqUserRole === 'student' || req.body.conversationType === 'student_tutor';

      if (isStudent) {
        session.workspaceType = 'student';
        session.assistantType = 'legal_tutor';
        session.conversationType = 'student_tutor';
      }

      // Update mode, tool, and projectId if provided
      if (detectedMode) session.detectedMode = detectedMode;
      if (req.body.activeTool) session.activeTool = req.body.activeTool;
      const cleanPid = sanitizeProjectId(req.body.projectId || req.body.caseId);
      if (cleanPid) {
        session.projectId = cleanPid;
        session.conversationType = 'case';
      } else if (req.body.conversationType) {
        session.conversationType = req.body.conversationType;
      }
      
      session.lastModified = Date.now();
      await session.save();
      finalResponse.title = session.title;
      finalResponse.sessionId = session.sessionId;
    }

    // 5. ATOMIC DB SYNC (Critical Fallback for Chat Persistence)
    // Check if user message already pushed by frontend sync endpoint to prevent duplicates
    const hasUserMsg = session.messages.some(m => m.id === userMsgId || (m.role === 'user' && m.content === content));
    if (!hasUserMsg) {
      session.messages.push({
        id: userMsgId || `be_${Date.now()}`,
        role: 'user',
        content: content || (image ? "Image interaction" : "Action"),
        timestamp: Date.now()
      });
    }

    // Always push the AI response generated in this turn
    session.messages.push({
      id: aiMsgId || `be_ai_${Date.now() + 1}`,
      role: 'model',
      content: finalResponse.reply || "Thinking...",
      timestamp: Date.now() + 1,
      isRealTime: finalResponse.isRealTime,
      sources: finalResponse.sources,
      imageUrl: finalResponse.imageUrl,
      videoUrl: finalResponse.videoUrl,
      conversion: finalResponse.conversion,
      suggestions: finalResponse.suggestions
    });

    session.lastModified = Date.now();
    await session.save();
    finalResponse.title = session.title;
    finalResponse.sessionId = session.sessionId;

    const finalUserId = req.user?.id || req.user?._id;
    if (finalUserId) {
        triggerAiCrossCommunication(finalUserId, activeProjectId, content, finalResponse.reply).catch(() => {});
        await subscriptionService.deductCredits(finalUserId, toolsRequested, sessionId, req.body);

        // Asynchronously extract and update user memory profile
        (async () => {
          try {
            const fs = await import('fs');
            fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Started memory extraction for user: ${finalUserId}\n`);
            const historySlice = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            const extractedInfo = await extractUserMemory(content, historySlice);
            fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Extracted info: ${JSON.stringify(extractedInfo)}\n`);
            if (extractedInfo) {
              const result = await updateMemory(finalUserId, extractedInfo, resolvedToolName || 'General Chat');
              fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] Saved memory successfully: ${JSON.stringify(result)}\n`);
            }
          } catch (e) {
            try {
              const fs = await import('fs');
              fs.appendFileSync('memory_debug.log', `[${new Date().toISOString()}] [Memory extraction error]: ${e.message}\n${e.stack}\n`);
            } catch (fsErr) {}
            console.warn('[Memory extraction error]:', e.message);
          }
        })();

        const activeTool = req.body.activeTool || req.body.toolName || req.body.tool || req.body.featureKey || req.body.feature || (req.body.mode && req.body.mode !== 'CHAT' && req.body.mode !== 'NORMAL_CHAT' ? req.body.mode : 'ai_chat');

        if (finalUserId) {
            try {
                const FeatureAccessManager = await import('../services/featureAccessManager.js');
                const normTool = FeatureAccessManager.normalizeFeatureKey(activeTool);
                await FeatureAccessManager.incrementUsage(finalUserId, normTool);
                finalResponse.usageStatus = await FeatureAccessManager.getUsageStatus(finalUserId);
            } catch (uErr) {
                console.error('[CHAT FEATURE USAGE DEDUCTION ERROR]', uErr);
            }
        }
    }

    return res.status(200).json(finalResponse);

  } catch (err) {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ reply: "dbDemoModeMessage", detectedMode: 'NORMAL_CHAT' });
    }
    console.error("Interaction failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- SESSION LIST ---
router.get('/', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    if (!userId && !guestId) return res.json([]);
    if (mongoose.connection.readyState !== 1) return res.json([]);

    let sessions = [];
    const projectId = req.query.projectId;
    const reqScope = req.query.scope || req.query.type || req.query.conversationType;

    const query = {};
    const reqWorkspaceId = req.query.workspaceId || req.headers['x-workspace-id'];

    if (userId) {
      const uIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
      const userQueries = [userId, String(userId)];
      if (uIdObj) userQueries.push(uIdObj);
      query.userId = { $in: userQueries };

      const userRole = (req.query.role || req.headers['x-user-role'] || 'advocate').toLowerCase();
      const resolvedScope = reqScope || (userRole === 'student' ? 'student_tutor' : 'global');

      if (reqWorkspaceId) {
        if (reqWorkspaceId === 'personal_practice') {
          query.$or = [
            { workspaceId: 'personal_practice' },
            { workspaceId: { $exists: false } },
            { workspaceId: null },
            { workspaceId: '' }
          ];
        } else {
          query.workspaceId = reqWorkspaceId;
        }
      }

      // Explicit Assistant Scope Isolation
      if (resolvedScope === 'student_tutor' || userRole === 'student') {
        query.projectId = { $in: [null, undefined] };
        query.$or = [
          { conversationType: 'student_tutor' },
          { assistantType: 'legal_tutor' },
          { workspaceType: 'student' },
          { role: 'student' },
          { detectedMode: 'STUDENT_TUTOR' }
        ];
      } else if (resolvedScope === 'case' || (projectId && projectId !== 'all' && projectId !== 'default')) {
        const cleanPid = sanitizeProjectId(projectId);
        if (cleanPid) {
          const pIdObj = mongoose.Types.ObjectId.isValid(cleanPid) ? new mongoose.Types.ObjectId(cleanPid) : null;
          const pQueries = [cleanPid, String(cleanPid)];
          if (pIdObj) pQueries.push(pIdObj);
          query.projectId = { $in: pQueries };
        }
        query.conversationType = { $ne: 'global' };
      } else if (resolvedScope === 'tool') {
        query.conversationType = 'tool';
        query.activeTool = { $ne: null, $nin: ['legal_my_case', ''] };
      } else if (req.query.all === 'true' || projectId === 'all') {
        // Skip scope filter to return all chats
      } else {
        // Advocate AI Legal Assistant Global Scope
        query.conversationType = { $in: ['global', null] };
        query.projectId = { $in: [null, undefined] };
        query.assistantType = { $ne: 'legal_tutor' };
        query.workspaceType = { $ne: 'student' };
      }
    } else if (guestId) {
      query.guestId = guestId;
    }

    // Support search query parameter
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      let matchingProjectIds = [];
      try {
        const matchingProjects = await Project.find({
          $or: [
            { name: searchRegex },
            { clientName: searchRegex }
          ]
        }).select('_id');
        matchingProjectIds = matchingProjects.map(p => p._id);
      } catch (err) {
        console.warn("Failed to search projects:", err);
      }

      query.$or = [
        { title: searchRegex },
        { 'messages.content': searchRegex },
        { projectId: { $in: matchingProjectIds } }
      ];
    }

    sessions = await ChatSession.find(query)
      .select('sessionId title lastModified userId projectId activeTool detectedMode messages')
      .populate('projectId', 'name clientName')
      .sort({ lastModified: -1 });

    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// --- SESSION HISTORY ---
router.get('/:sessionId', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    if (mongoose.connection.readyState !== 1) return res.json({ sessionId, messages: [] });

    let session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    // Auto-claim unowned sessions if logged in
    if (userId && !session.userId) {
      const currentUserId = userId.toString();
      console.log(`[AUTH] User ${currentUserId} claiming unowned guest session ${sessionId}`);
      session.userId = userId;
      await session.save();
      await userModel.findByIdAndUpdate(userId, { $addToSet: { chatSessions: session._id } });
    }

    if (session) {
      // 🔄 Dynamic Re-signing of expired media URLs
      // This ensures that images/videos stored with ephemeral 6-hour URLs are refreshed on load
      let needsSave = false;
      const bucketName = 'aisa_objects';

      for (let msg of session.messages) {
        // Refreash Image URLs
        if (msg.imageUrl && msg.imageUrl.includes(bucketName)) {
           // Extract path: everything between 'aisa_objects/' and the '?' (if present) or end of string
           const pathPart = msg.imageUrl.split(`${bucketName}/`)[1]?.split('?')[0];
           if (pathPart) {
             const newUrl = await getSignedUrl(decodeURIComponent(pathPart));
             if (newUrl !== msg.imageUrl) {
               msg.imageUrl = newUrl;
               needsSave = true;
             }
           }
        }
        // Refresh Video URLs
        if (msg.videoUrl && msg.videoUrl.includes(bucketName)) {
           const pathPart = msg.videoUrl.split(`${bucketName}/`)[1]?.split('?')[0];
           if (pathPart) {
             const newUrl = await getSignedUrl(decodeURIComponent(pathPart));
             if (newUrl !== msg.videoUrl) {
               msg.videoUrl = newUrl;
               needsSave = true;
             }
           }
        }
      }

      if (needsSave) {
        await session.save();
      }
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// --- GENERATE CONVERSATION TITLE ---
router.post('/:sessionId/generate-title', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    const title = await aiService.generateConversationTitle(message);
    if (!title) return res.status(500).json({ error: 'Failed to generate title' });

    const session = await ChatSession.findOne({ sessionId });
    if (session) {
      session.title = title;
      session.lastModified = Date.now();
      await session.save();
    }

    res.json({ title });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

// --- ADD MESSAGE MANUALLY (SYNC FROM FRONTEND) ---
router.post('/:sessionId/message', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, title } = req.body;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    // 1. LIMIT & CREDIT CHECKS FOR GUESTS
    const limitCheck = await checkGuestLimits(req, sessionId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: "LIMIT_REACHED", reason: limitCheck.reason });
    }

    const reqUserRole = (req.body.role || req.headers['x-user-role'] || req.body.workspaceType || req.headers['x-workspace-type'] || 'advocate').toLowerCase();
    const isStudent = reqUserRole === 'student' || req.body.conversationType === 'student_tutor';
    const reqWorkspaceType = isStudent ? 'student' : (req.body.workspaceType || req.headers['x-workspace-type'] || 'personal');
    const reqWorkspaceId = req.body.workspaceId || req.headers['x-workspace-id'] || 'personal_practice';

    let session = await ChatSession.findOne({ sessionId });

    if (!session) {
      // Create new session if it doesn't exist
      const cleanPid = sanitizeProjectId(req.body.projectId || req.body.caseId);
      const reqTool = req.body.activeTool || null;
      let autoConvType = req.body.conversationType;
      let autoAssistantType = isStudent ? 'legal_tutor' : 'legal_assistant';

      if (isStudent) {
        autoConvType = 'student_tutor';
        autoAssistantType = 'legal_tutor';
      } else if (!autoConvType) {
        autoConvType = cleanPid ? 'case' : (reqTool && reqTool !== 'legal_my_case' && reqTool !== 'none' ? 'tool' : 'global');
      }

      session = new ChatSession({
        sessionId,
        userId: userId || null,
        guestId: guestId || null,
        workspaceId: reqWorkspaceId,
        workspaceType: isStudent ? 'student' : reqWorkspaceType,
        assistantType: autoAssistantType,
        projectId: cleanPid,
        conversationType: autoConvType,
        title: title || "New Chat",
        detectedMode: req.body.mode || 'NORMAL_CHAT',
        activeTool: reqTool,
        messages: []
      });
      if (userId) await userModel.findByIdAndUpdate(userId, { $addToSet: { chatSessions: session._id } });
    } else {
      // Ownership check for existing session
      if (userId) {
        const currentUserId = userId.toString();
        if (session.userId && session.userId.toString() !== currentUserId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else if (guestId) {
        if (session.guestId && session.guestId !== guestId) return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update metadata on existing session if provided
      if (req.body.mode) session.detectedMode = req.body.mode;
      if (req.body.activeTool) session.activeTool = req.body.activeTool;
      const cleanPid = sanitizeProjectId(req.body.projectId || req.body.caseId);
      if (cleanPid) {
        session.projectId = cleanPid;
        session.conversationType = 'case';
      } else if (req.body.conversationType) {
        session.conversationType = req.body.conversationType;
      }
    }

    // Upsert message
    const existingIndex = session.messages.findIndex(m => m.id === message.id || (m._id && m._id.toString() === message.id));
    if (existingIndex !== -1) {
      session.messages[existingIndex] = { ...session.messages[existingIndex].toObject(), ...message, timestamp: message.timestamp || Date.now() };
    } else {
      session.messages.push({ ...message, timestamp: message.timestamp || Date.now() });
    }

    if (title && title !== "New Chat" && session.title === "New Chat") {
      session.title = title;
    }

    session.lastModified = Date.now();
    await session.save();

    res.json({ success: true, message: 'Message synced successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync message' });
  }
});

// --- DELETE MESSAGE ---
router.delete('/:sessionId/message/:messageId', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    await ChatSession.findOneAndUpdate(
      { sessionId },
      { $pull: { messages: { _id: messageId } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// --- UPDATE/EDIT MESSAGE ---
router.put('/:sessionId/message/:messageId', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    const msg = session.messages.find(m => m.id === messageId || (m._id && m._id.toString() === messageId));
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const oldContent = msg.content;
    msg.content = content;
    session.lastModified = Date.now();
    await session.save();

    // AI learning: Learn writing style corrections from the user
    if (userId && (msg.role === 'model' || msg.role === 'assistant')) {
      try {
        const learnPrompt = `
You are the AI Style Adaptation Engine. Compare the original AI generated response with the User's edited/corrected version.
Extract the key stylistic differences, preferred phrasing, tone corrections, or formatting changes.
Provide a concise, direct description of the user's style preferences (e.g. "Prefers bullet points, formal tone, and bold references").

Original AI Response:
${oldContent}

User Corrected Response:
${content}
`;
        const stylePreference = await vertexService.askVertex(learnPrompt, null, { modelOverride: 'gemini-2.5-flash' });
        if (stylePreference) {
          await UserMemory.findOneAndUpdate(
            { userId },
            { $set: { preferredDraftingStyle: stylePreference.trim(), updatedAt: Date.now() } },
            { upsert: true }
          );
        }
      } catch (learnErr) {
        console.warn("[Memory System] Failed to extract style adaptation:", learnErr.message);
      }
    }

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// --- RENAME SESSION ---
router.patch('/:sessionId/title', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    session.title = title;
    session.lastModified = Date.now();
    await session.save();

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to rename session' });
  }
});

// --- CLEAR ALL SESSIONS ---
router.delete('/clear-all', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;
    const fingerprint = req.headers['x-device-fingerprint'];
    const userRole = (req.query.role || req.headers['x-user-role'] || 'advocate').toLowerCase();
    const reqScope = req.query.scope || req.query.type || (userRole === 'student' ? 'student_tutor' : 'global');
    const projectId = req.query.projectId;

    if (userId) {
      const uIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
      const userQueries = [userId, String(userId)];
      if (uIdObj) userQueries.push(uIdObj);

      const deleteFilter = { userId: { $in: userQueries } };

      if (reqScope === 'student_tutor' || userRole === 'student') {
        deleteFilter.projectId = { $in: [null, undefined] };
        deleteFilter.$or = [
          { conversationType: 'student_tutor' },
          { assistantType: 'legal_tutor' },
          { workspaceType: 'student' }
        ];
      } else if (reqScope === 'case' || projectId) {
        const cleanPid = sanitizeProjectId(projectId);
        if (cleanPid) {
          const pIdObj = mongoose.Types.ObjectId.isValid(cleanPid) ? new mongoose.Types.ObjectId(cleanPid) : null;
          deleteFilter.projectId = { $in: [cleanPid, String(cleanPid), ...(pIdObj ? [pIdObj] : [])] };
        }
      } else {
        // Global Advocate Legal Assistant
        deleteFilter.projectId = { $in: [null, undefined] };
        deleteFilter.conversationType = { $in: ['global', null] };
        deleteFilter.assistantType = { $ne: 'legal_tutor' };
        deleteFilter.workspaceType = { $ne: 'student' };
      }

      await ChatSession.deleteMany(deleteFilter);
      await userModel.findByIdAndUpdate(userId, { chatSessions: [] });
    }
    
    if (guestId) {
      await ChatSession.deleteMany({ guestId });
    }

    if (fingerprint && !userId && !guestId) {
      await ChatSession.deleteMany({ deviceFingerprint: fingerprint });
    }

    res.json({ message: 'All chat history cleared successfully' });
  } catch (err) {
    console.error('[CLEAR ALL CHATS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE SESSION ---
router.delete('/:sessionId', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    await ChatSession.deleteOne({ sessionId });
    if (userId) {
      await userModel.findByIdAndUpdate(userId, { $pull: { chatSessions: session._id } });
    }
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// --- SHARE SESSION ---
router.post('/:sessionId/share', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;
 
    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
 
    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }
     
    // Auto-claim session if unowned
    if (userId && !session.userId) {
      const currentUserId = userId.toString();
      console.log(`[SHARE] User ${currentUserId} claiming unowned session ${sessionId} during share`);
      session.userId = userId;
      session.guestId = null; // Clean up guest ref
    }
 
    if (!session.shareId) {
      session.shareId = uuidv4();
    }
    session.isShared = true;
    await session.save();
 
    res.json({ success: true, shareId: session.shareId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share session' });
  }
});

// --- SHARE SESSION VIA EMAIL (INTEGRATED) ---
router.post('/:sessionId/share/email', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { targetEmail, shareLink, title } = req.body;
    const userId = req.user?.id || req.user?._id;
    const guestId = req.guest?.guestId;

    if (!targetEmail || !shareLink) {
      return res.status(400).json({ error: 'Target email and share link are required' });
    }

    const session = await ChatSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Ownership check
    if (!checkSessionOwnership(session, req)) {
      return res.status(403).json({ error: "Access denied", code: "UNAUTHORIZED" });
    }

    const { sendShareLinkEmail } = await import('../services/emailService.js');
    const senderName = req.user?.name || "A user";
    
    const result = await sendShareLinkEmail(targetEmail, shareLink, title || session.title, senderName);
    
    if (result.success) {
      res.json({ success: true, message: 'Share link sent successfully via email' });
    } else {
      res.status(500).json({ error: 'Failed to send email', details: result.error });
    }
  } catch (err) {
    console.error('[EMAIL SHARE ERROR]', err);
    res.status(500).json({ error: 'Shared email failed' });
  }
});

 
// --- DUPLICATE SHARED SESSION ---
router.post('/duplicate', optionalVerifyToken, identifyGuest, async (req, res) => {
  try {
    const { shareId } = req.body;
    const userId = req.user?.id || req.user?._id; // Scoped strictly from req.user (JWT) for security
    const guestId = req.guest?.guestId;

    console.log(`[DUPLICATE REQUEST] shareId: ${shareId}, userId: ${userId}`);

    if (!shareId) return res.status(400).json({ error: 'shareId is required' });

    // Find the source session
    const sourceSession = await ChatSession.findOne({ shareId, isShared: true });
    if (!sourceSession) {
      console.warn(`[DUPLICATE] Source chat not found for shareId: ${shareId}`);
      return res.status(404).json({ error: 'Source chat not found' });
    }

    // Create a new session for the current user/guest
    const newSessionId = uuidv4();
    
    // Safety check for messages
    const messagesToClone = Array.isArray(sourceSession.messages) ? sourceSession.messages : [];
    
    // Copy and transform messages
    const clonedMessages = messagesToClone.map(m => ({
      id: uuidv4(),
      role: m.role || 'assistant',
      content: m.content || m.text || " ", // Ensure non-empty string for required field
      timestamp: Date.now(),
      mode: m.mode,
      isRealTime: m.isRealTime || false,
      sources: m.sources || [],
      attachments: m.attachments || []
    }));

    const newSession = new ChatSession({
      sessionId: newSessionId,
      userId: userId || null,
      guestId: userId ? null : (guestId || uuidv4()),
      title: sourceSession.title || 'New Chat',
      projectId: sourceSession.projectId || null,
      messages: clonedMessages,
      detectedMode: sourceSession.detectedMode || 'NORMAL_CHAT',
      lastModified: Date.now()
    });

    await newSession.save();

    // If user is logged in, link to their profile
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await userModel.findByIdAndUpdate(userId, { $push: { chatSessions: newSession._id } });
    }

    console.log(`[DUPLICATE] Success: ${shareId} -> ${newSessionId} (${clonedMessages.length} messages)`);
    res.json({ success: true, sessionId: newSessionId });
  } catch (err) {
    console.error("[DUPLICATE ERROR]", err);
    res.status(500).json({ error: 'Failed to duplicate chat', details: err.message });
  }
});

// --- MERGE GUEST CHATS ---
router.post('/merge-chats', verifyToken, async (req, res) => {
  try {
    const { guestChatIds } = req.body;
    const userId = req.user.id || req.user._id;

    console.log(`[MERGE-DEBUG] Incoming request for user: ${userId}`);
    console.log(`[MERGE-DEBUG] guestChatIds:`, guestChatIds);

    if (!Array.isArray(guestChatIds) || guestChatIds.length === 0) {
      console.log(`[MERGE-DEBUG] No chats to merge.`);
      return res.status(200).json({ success: true, message: 'No chats to merge' });
    }

    // 1. Update sessions in DB
    const result = await ChatSession.updateMany(
      { 
        sessionId: { $in: guestChatIds },
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      },
      { 
        $set: { userId: userId, guestId: null } 
      }
    );

    console.log(`[MERGE-DEBUG] Modified ${result.modifiedCount} sessions in DB.`);

    // 2. Link sessions to user model
    const sessions = await ChatSession.find({ sessionId: { $in: guestChatIds }, userId: userId });
    const sessionObjectIds = sessions.map(s => s._id);
    
    if (sessionObjectIds.length > 0) {
      await userModel.findByIdAndUpdate(userId, { 
        $addToSet: { chatSessions: { $each: sessionObjectIds } } 
      });
      console.log(`[MERGE-DEBUG] Linked ${sessionObjectIds.length} sessions to user profile.`);
    }

    res.json({ 
      success: true, 
      mergedCount: result.modifiedCount,
      message: `${result.modifiedCount} chats merged successfully`
    });
  } catch (err) {
    console.error('[MERGE-ERROR]', err);
    res.status(500).json({ error: 'Failed to merge chats', details: err.message });
  }
});

// --- GET SHARED SESSION (PUBLIC) ---
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    console.log(`[SHARE] Accessing shared chat: ${shareId}`);
 
    const session = await ChatSession.findOne({ shareId });
    if (!session || !session.isShared) {
      return res.status(404).json({ error: 'Shared chat not found' });
    }
 
    // Return only necessary fields for public view
    const publicSession = {
      title: session.title,
      messages: session.messages,
      lastModified: session.lastModified,
      detectedMode: session.detectedMode
    };
 
    res.json(publicSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shared chat' });
  }
});

// --- PDF UPLOAD ---
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF provided' });
    const result = await uploadToGCS(req.file.buffer, {
      folder: 'aisa_pdfs',
      filename: gcsFilename('aisa_pdf', 'pdf'),
      mimeType: 'application/pdf',
    });
    return res.status(200).json({ url: result.publicUrl });
  } catch (err) {
    console.error('[PDF UPLOAD ERROR]', err);
    return res.status(500).json({ error: 'PDF upload failed' });
  }
});

// --- GENERAL UPLOAD ---
router.post('/upload', uploadMiddleware, uploadAttachment);

export default router;
