import express from 'express';
import mongoose from 'mongoose';
import Project from '../../models/Project.js';
import { verifyToken } from '../../middleware/authorization.js';
import { creditMiddleware } from '../../middleware/creditSystem.js';
import { generateChatResponse } from '../../services/geminiService.js';
import { getToolByName } from '../../services/intent/toolRegistry.js';
import { getLegalPrompt, LEGAL_DISCLAIMER } from './legalPrompts.js';
import { subscriptionService } from '../../services/subscriptionService.js';
import logger from '../../utils/logger.js';
import * as FeatureAccessManager from '../../services/featureAccessManager.js';

const router = express.Router();

/**
 * Note: getStrictToolPrompt was removed in favor of centralized services/legal/legalPrompts.js
 */

const buildCaseContextString = (caseContext) => {
    if (!caseContext) return '';
    
    let ctx = `=== FULL LIVE CASE WORKSPACE CONTEXT (PERSISTENT MEMORY & SINGLE SOURCE OF TRUTH) ===\n`;
    ctx += `Case ID: ${caseContext._id || caseContext.id || 'N/A'}\n`;
    ctx += `Case Title/Name: ${caseContext.name || caseContext.title || 'N/A'}\n`;
    ctx += `Case Number: ${caseContext.caseNumber || caseContext.cnrNumber || 'N/A'}\n`;
    ctx += `Client Name: ${caseContext.clientName || 'N/A'}\n`;
    ctx += `Opponent Name: ${caseContext.opponentName || 'N/A'}\n`;
    ctx += `Case Type/Category: ${caseContext.caseType || caseContext.category || 'N/A'}\n`;
    ctx += `Presiding Court: ${caseContext.court || caseContext.courtName || 'N/A'}\n`;
    ctx += `Judge / Bench: ${caseContext.judge || caseContext.bench || 'N/A'}\n`;
    ctx += `Jurisdiction: ${caseContext.jurisdiction || 'N/A'}\n`;
    ctx += `Current Stage: ${caseContext.stage || 'N/A'}\n`;
    ctx += `Case Status: ${caseContext.status || 'Active'}\n`;
    ctx += `Priority: ${caseContext.priority || 'Normal'}\n`;
    ctx += `Executive Summary: ${caseContext.summary || caseContext.caseSummary || 'N/A'}\n\n`;

    // 1. PARTIES & PARTICIPANTS
    if (caseContext.parties || caseContext.witnesses || caseContext.opposingCounsel) {
        ctx += `### Parties & Key Contacts:\n`;
        ctx += `- Client: ${caseContext.clientName || 'N/A'} (Contact: ${caseContext.clientContact || 'N/A'})\n`;
        ctx += `- Opponent: ${caseContext.opponentName || 'N/A'} (Address: ${caseContext.opponentAddress || 'N/A'})\n`;
        if (caseContext.opposingCounsel) ctx += `- Opposing Counsel: ${caseContext.opposingCounsel}\n`;
        if (caseContext.witnesses && caseContext.witnesses.length > 0) {
            ctx += `- Witnesses: ${caseContext.witnesses.map(w => `${w.name || w} (${w.role || 'Witness'})`).join(', ')}\n`;
        }
        ctx += `\n`;
    }

    // 2. TIMELINE & FACTS
    if (caseContext.facts && caseContext.facts.length > 0) {
        ctx += `### Timeline & Factual Milestones (${caseContext.facts.length}):\n`;
        caseContext.facts.forEach((f, i) => {
            const dateStr = f.date ? new Date(f.date).toLocaleDateString() : 'Unknown Date';
            ctx += `${i + 1}. [${dateStr}] ${f.event || f.title || ''} - ${f.description || f.details || ''}\n`;
        });
        ctx += `\n`;
    }

    // 3. HEARINGS SCHEDULE
    if (caseContext.hearings && caseContext.hearings.length > 0) {
        ctx += `### Hearings Schedule (${caseContext.hearings.length}):\n`;
        caseContext.hearings.forEach((h, i) => {
            const dateStr = h.date ? new Date(h.date).toLocaleDateString() : 'Unknown Date';
            ctx += `${i + 1}. [${dateStr} ${h.time || ''}] ${h.courtName || h.court || ''} - Stage/Purpose: ${h.purpose || h.stage || ''} - Status: ${h.status || ''} - Outcome: ${h.outcome || h.notes || 'Pending'}\n`;
        });
        ctx += `\n`;
    }

    // 4. COURT ORDERS & DIRECTIVES
    if (caseContext.orders || caseContext.courtOrders) {
        const orderList = caseContext.orders || caseContext.courtOrders || [];
        if (orderList.length > 0) {
            ctx += `### Court Orders & Judicial Directives (${orderList.length}):\n`;
            orderList.forEach((o, i) => {
                const oDate = o.orderDate || o.date ? new Date(o.orderDate || o.date).toLocaleDateString() : 'N/A';
                ctx += `${i + 1}. [${oDate}] ${o.orderTitle || o.title || 'Court Order'} - Bench: ${o.bench || 'N/A'}\n`;
                if (o.executiveSummary) ctx += `   - Summary: ${o.executiveSummary}\n`;
                if (o.keyDirectives && o.keyDirectives.length > 0) ctx += `   - Key Directives: ${o.keyDirectives.join('; ')}\n`;
                if (o.complianceItems && o.complianceItems.length > 0) {
                    ctx += `   - Compliance Actions: ${o.complianceItems.map(c => `[${c.status || 'Pending'}] ${c.title || c.text || c}`).join('; ')}\n`;
                }
            });
            ctx += `\n`;
        }
    }

    // 5. DOCUMENTS & OCR EXTRACTS
    if (caseContext.documents && caseContext.documents.length > 0) {
        ctx += `### Case Documents & Uploaded Files (${caseContext.documents.length}):\n`;
        caseContext.documents.forEach((d, i) => {
            ctx += `${i + 1}. [${d.type || 'Document'}] ${d.name || ''} - Summary/Extracted: ${d.extractedData || d.summary || d.ocrText || 'Uploaded'}\n`;
        });
        ctx += `\n`;
    }

    // 6. EVIDENCE VAULT
    if (caseContext.evidence && caseContext.evidence.length > 0) {
        ctx += `### Evidence Vault (${caseContext.evidence.length}):\n`;
        caseContext.evidence.forEach((ev, i) => {
            ctx += `${i + 1}. [${ev.exhibitNo || `Exhibit-${i + 1}`}] ${ev.name || ''} (${ev.type || 'Evidence'}) - Description: ${ev.description || ''} - Relevance: ${ev.relevance || 'N/A'} - Admissibility: ${ev.admissibility || 'N/A'}\n`;
        });
        ctx += `\n`;
    }

    // 7. ARGUMENTS & REBUTTALS
    if (caseContext.arguments || caseContext.legalArguments) {
        const argList = caseContext.arguments || caseContext.legalArguments || [];
        if (argList.length > 0) {
            ctx += `### Legal Arguments & Strategy Points (${argList.length}):\n`;
            argList.forEach((a, i) => {
                ctx += `${i + 1}. Claim/Point: ${a.title || a.claim || a} - Basis: ${a.basis || a.evidenceLink || 'N/A'}\n`;
            });
            ctx += `\n`;
        }
    }

    // 8. CASE NOTES
    if (caseContext.notes && caseContext.notes.length > 0) {
        ctx += `### Case Notes & Strategy Feed (${caseContext.notes.length}):\n`;
        caseContext.notes.forEach((n, i) => {
            ctx += `${i + 1}. [${n.category || 'Note'}] ${n.title || ''}: ${n.content || n.text || ''}\n`;
        });
        ctx += `\n`;
    }

    // 9. SAVED RESEARCH & LAWS
    if (caseContext.research && caseContext.research.length > 0) {
        ctx += `### Saved Statutory Provisions & Legal Research:\n`;
        caseContext.research.forEach((r, i) => {
            ctx += `${i + 1}. ${r.lawName || ''} Section ${r.section || ''} - Summary: ${r.description || ''}\n`;
        });
        ctx += `\n`;
    }

    // 10. SAVED COURT PRECEDENTS
    if (caseContext.savedPrecedents && caseContext.savedPrecedents.length > 0) {
        ctx += `### Saved Precedents & Case Laws:\n`;
        caseContext.savedPrecedents.forEach((p, i) => {
            ctx += `${i + 1}. ${p.title || ''} (${p.citation || 'Citation N/A'}) - Ratio: ${p.summary || p.ratio || ''}\n`;
        });
        ctx += `\n`;
    }

    // 11. TASKS & ACTION ITEMS
    if (caseContext.tasks && caseContext.tasks.length > 0) {
        ctx += `### Pending & Completed Tasks:\n`;
        caseContext.tasks.forEach((t, i) => {
            const dlStr = t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No Deadline';
            ctx += `${i + 1}. ${t.title || ''} [Status: ${t.status || 'Pending'}] - Deadline: ${dlStr}\n`;
        });
        ctx += `\n`;
    }

    // 12. AI CASE ANALYSIS SUMMARY
    if (caseContext.aiAnalysis) {
        ctx += `### AI Case Analysis Insights:\n`;
        ctx += `- Strengths: ${JSON.stringify(caseContext.aiAnalysis.strengths || [])}\n`;
        ctx += `- Weaknesses: ${JSON.stringify(caseContext.aiAnalysis.weaknesses || [])}\n`;
        ctx += `- Key Risks: ${JSON.stringify(caseContext.aiAnalysis.risks || [])}\n\n`;
    }

    ctx += `=== MANDATORY CASE ASSISTANT OPERATIONAL DIRECTIVES ===\n`;
    ctx += `1. SINGLE SOURCE OF TRUTH: The above Live Case Workspace Context contains verified facts. DO NOT ask the user to provide information that is ALREADY PRESENT above (such as Client Name, Opponent Name, Court, Case Number, Facts, Documents, Orders, or Hearings). Use existing data automatically!\n`;
    ctx += `2. PARTIAL INFORMATION RULE: If 90% of required information exists in the context above, use that 90% and ask ONLY for the missing 10% required to complete the task.\n`;
    ctx += `3. ZERO FABRICATION: Never invent missing facts, addresses, citations, or case details. If an item is missing and required, state specifically what is missing.\n`;
    ctx += `4. AMBIGUITY RESOLUTION: If the context contains conflicting values (e.g. multiple addresses), highlight the exact conflict to the user rather than guessing.\n`;
    ctx += `5. MEMORY HIERARCHY: Case Workspace Data (Highest) > Conversation Context > Documents > Research > General Law.\n`;
    ctx += `=== END OF LIVE CASE WORKSPACE CONTEXT ===\n\n`;
    return ctx;
};

/**
 * POST /api/legal-toolkit/execute
 */
router.post('/execute', verifyToken, creditMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        let {
            message,
            toolName,
            sessionId,
            attachments = [],
            conversationHistory = [],
            language,
            outputLanguage,
            preferred_response_language,
            target_language,
            caseContext,
            projectId
        } = req.body;

        // Fetch fresh full case workspace data from DB if projectId or caseContext ID is present
        const effectiveProjectId = projectId || (caseContext && (caseContext._id || caseContext.id));
        if (effectiveProjectId && typeof effectiveProjectId === 'string' && effectiveProjectId !== 'null' && effectiveProjectId !== 'undefined' && effectiveProjectId !== 'default') {
            try {
                if (mongoose.Types.ObjectId.isValid(effectiveProjectId)) {
                    const dbCase = await Project.findById(effectiveProjectId).lean();
                    if (dbCase) {
                        caseContext = { ...dbCase, ...(caseContext || {}) };
                    }
                }
            } catch (err) {
                logger.warn(`[LegalToolkit] Failed to populate case context from DB for ${effectiveProjectId}: ${err.message}`);
            }
        }

        const targetLanguage = outputLanguage || language || preferred_response_language || target_language || req.query.preferred_response_language || req.query.language || req.query.outputLanguage || 'English';

        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'toolName is required'
            });
        }

        // Feature access checking
        let normalizedFeatureKey = FeatureAccessManager.normalizeFeatureKey(toolName);

        const bypassFeatures = ['legal_free_chat', 'legal_my_case', 'chat'];
        if (!bypassFeatures.includes(toolName)) {
            const workspace = req.query.workspace || req.body?.workspace || req.headers['x-workspace-type'] || 'advocate';
            const access = await FeatureAccessManager.checkAccess(userId, normalizedFeatureKey, workspace);
            if (!access.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'LIMIT_EXCEEDED',
                    feature: normalizedFeatureKey,
                    message: `You have reached your usage limit for this feature on the ${access.plan} plan. Upgrade your subscription to continue using AI Legal.`
                });
            }
            await FeatureAccessManager.incrementUsage(userId, normalizedFeatureKey);
        }

        // Normalize frontend general chat tool name to backend registered tool name
        const requestedTool = toolName;
        if (toolName === 'legal_general_chat') {
            toolName = 'legal_free_chat';
        }

        const tool = getToolByName(toolName);
        if (!tool) {
            return res.status(404).json({
                success: false,
                error: `Tool ${toolName} not found`
            });
        }

        // 🔥 STEP 1: Get STRICT TOOL PROMPT from Centralized Service
        let systemPrompt = getLegalPrompt(toolName);
        if (caseContext) {
            systemPrompt = buildCaseContextString(caseContext) + systemPrompt;
        }

        // Add explicit language instruction to system prompt as well
        if (targetLanguage && targetLanguage !== 'English') {
            systemPrompt += `\n\n🌐 MANDATORY OUTPUT LANGUAGE: ${targetLanguage}\nCRITICAL: Respond 100% in ${targetLanguage} script/tongue. Translate all section titles, analysis, clauses, recommendations, and legal text into ${targetLanguage}.`;
        }

        // 🔥 STEP 2: FORCE TOOL MODE (ALIGNED WITH DRAFT-FIRST WORKFLOW AND MULTILINGUAL OUTPUT)
        const draftingTools = ['legal_draft_maker', 'legal_notice_generator', 'legal_fir_generator', 'legal_affidavit_generator', 'legal_free_chat', 'legal_my_case'];
        const isDraftingTool = draftingTools.includes(toolName);
        const isFollowUp = conversationHistory && conversationHistory.length > 0;
        
        const langDirective = (targetLanguage && targetLanguage !== 'English')
            ? `🌐 MANDATORY TARGET OUTPUT LANGUAGE: ${targetLanguage}\nCRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response, analysis, headers, points, recommendations, and text in ${targetLanguage}. Do NOT write in English unless the user requested English.\n\n`
            : '';

        const enforcedMessage = isDraftingTool 
            ? `${langDirective}${isFollowUp ? '📝 FOLLOW-UP DATA AND UPDATES:' : '⚖️ REQUEST:'}\n${message}` 
            : `${langDirective}🚨 TOOL MODE: ${toolName}

### 🎯 TASK:
${message}

### INSTRUCTIONS:
- Follow the vertical report structure defined in your rules.
- Output ALL headers, text, and analysis strictly in ${targetLanguage}.
- Prioritize Uploaded Document (CASE CONTEXT).
- Use Legal Knowledge (RAG) for references.
`;

        logger.info(`[LegalToolkit] Tool: ${toolName} | User: ${req.user?._id}`);

        // 🔥 STEP 3: CALL AI
        const responseData = await generateChatResponse(
            conversationHistory,
            enforcedMessage,
            systemPrompt,
            attachments,
            targetLanguage, 
            null,
            'LEGAL_TOOLKIT',
            sessionId,
            effectiveProjectId,
            toolName
        );


        if (!responseData || !responseData.reply) {
            throw new Error('Empty response from AI');
        }

        // 🔥 STEP 4: FINAL RESPONSE CLEAN + TOOL TAG
        let finalReply = responseData.reply.trim();

        // 💰 Deduct credits on successful execution
        if (req.creditMeta && req.creditMeta.cost > 0) {
            await subscriptionService.deductCreditsFromMeta(req.creditMeta);
        }

        const latestUsageStatus = await FeatureAccessManager.getUsageStatus(userId);

        return res.json({
            success: true,
            reply: finalReply,
            toolUsed: requestedTool,
            creditsUsed: tool.creditCost || 0,
            suggestions: responseData.suggestions || [],
            usageStatus: latestUsageStatus
        });

    } catch (error) {
        logger.error(`[LegalToolkit] Error executing tool ${req.body?.toolName || 'unknown'}: ${error.message}`);
        logger.error(`[LegalToolkit] Stack Trace: ${error.stack}`);

        return res.status(500).json({
            success: false,
            error: 'Legal tool execution failed',
            details: error.message
        });
    }
});

export default router;