import express from 'express';
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
    
    let ctx = `=== CASE WORKSPACE CONTEXT ===\n`;
    ctx += `Case Name: ${caseContext.name || 'N/A'}\n`;
    ctx += `Client: ${caseContext.clientName || 'N/A'}\n`;
    ctx += `Opponent: ${caseContext.opponentName || 'N/A'}\n`;
    ctx += `Case Type: ${caseContext.caseType || 'N/A'}\n`;
    ctx += `Current Stage: ${caseContext.stage || 'N/A'}\n`;
    ctx += `Priority: ${caseContext.priority || 'N/A'}\n`;
    ctx += `Case Summary: ${caseContext.summary || caseContext.caseSummary || 'N/A'}\n\n`;
    
    if (caseContext.facts && caseContext.facts.length > 0) {
        ctx += `### Timeline & Key Facts:\n`;
        caseContext.facts.forEach((f, i) => {
            const dateStr = f.date ? new Date(f.date).toLocaleDateString() : 'Unknown Date';
            ctx += `${i + 1}. [${dateStr}] ${f.event || ''} - ${f.description || ''}\n`;
        });
        ctx += `\n`;
    }
    
    if (caseContext.hearings && caseContext.hearings.length > 0) {
        ctx += `### Hearings Schedule:\n`;
        caseContext.hearings.forEach((h, i) => {
            const dateStr = h.date ? new Date(h.date).toLocaleDateString() : 'Unknown Date';
            ctx += `${i + 1}. [${dateStr} ${h.time || ''}] ${h.courtName || ''} (${h.location || ''}) - Status: ${h.status || ''} - Notes: ${h.notes || ''}\n`;
        });
        ctx += `\n`;
    }
    
    if (caseContext.documents && caseContext.documents.length > 0) {
        ctx += `### Case Documents & Contracts:\n`;
        caseContext.documents.forEach((d, i) => {
            ctx += `${i + 1}. [${d.type || 'Document'}] Name: ${d.name || ''} - URL: ${d.url || ''} - Extracted Data/Summary: ${d.extractedData ? JSON.stringify(d.extractedData) : 'N/A'}\n`;
        });
        ctx += `\n`;
    }
    
    if (caseContext.evidence && caseContext.evidence.length > 0) {
        ctx += `### Evidence Vault:\n`;
        caseContext.evidence.forEach((ev, i) => {
            ctx += `${i + 1}. Name: ${ev.name || ''} - Type: ${ev.type || ''} - Description: ${ev.description || ''} - Admissibility: ${ev.admissibility || ''}\n`;
        });
        ctx += `\n`;
    }
    
    if (caseContext.research && caseContext.research.length > 0) {
        ctx += `### Saved Research & Laws:\n`;
        caseContext.research.forEach((r, i) => {
            ctx += `${i + 1}. Act/Provision: ${r.lawName || ''} Section ${r.section || ''} - Description: ${r.description || ''}\n`;
        });
        ctx += `\n`;
    }

    if (caseContext.savedPrecedents && caseContext.savedPrecedents.length > 0) {
        ctx += `### Key Court Precedents:\n`;
        caseContext.savedPrecedents.forEach((p, i) => {
            ctx += `${i + 1}. Title: ${p.title || ''} - Citation: ${p.citation || ''} - Summary: ${p.summary || ''}\n`;
        });
        ctx += `\n`;
    }
    
    if (caseContext.tasks && caseContext.tasks.length > 0) {
        ctx += `### Tasks & Action Items:\n`;
        caseContext.tasks.forEach((t, i) => {
            const dlStr = t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No Deadline';
            ctx += `${i + 1}. Title: ${t.title || ''} - Status: ${t.status || ''} - Deadline: ${dlStr} - Priority: ${t.priority || ''}\n`;
        });
        ctx += `\n`;
    }
    
    ctx += `=== END OF CASE CONTEXT ===\n\n`;
    return ctx;
};

/**
 * POST /api/legal-toolkit/execute
 */
router.post('/execute', verifyToken, creditMiddleware, async (req, res) => {
    try {
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
            caseContext
        } = req.body;

        const targetLanguage = outputLanguage || language || preferred_response_language || target_language || req.query.preferred_response_language || req.query.language || req.query.outputLanguage || 'English';

        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'toolName is required'
            });
        }

        // Feature access checking
        let normalizedFeatureKey = toolName;
        const featureDraftingTools = ['legal_draft_maker', 'legal_notice_generator', 'legal_fir_generator', 'legal_affidavit_generator'];
        if (featureDraftingTools.includes(toolName)) {
            normalizedFeatureKey = 'draft_maker';
        } else if (toolName === 'legal_argument_builder') {
            normalizedFeatureKey = 'court_prep';
        } else if (toolName === 'legal_precedents' || toolName === 'legal_case_law_research' || toolName === 'legal_research_assistant') {
            normalizedFeatureKey = 'legal_precedent';
        } else if (toolName === 'legal_evidence_checker') {
            normalizedFeatureKey = 'evidence_analysis';
        } else if (toolName === 'legal_contract_analyzer') {
            normalizedFeatureKey = 'contract_review';
        } else if (toolName === 'legal_strategy_engine') {
            normalizedFeatureKey = 'strategy_engine';
        } else if (toolName === 'legal_case_predictor') {
            normalizedFeatureKey = 'case_predictor';
        }

        const bypassFeatures = ['legal_free_chat', 'legal_my_case', 'chat'];
        if (!bypassFeatures.includes(toolName)) {
            const userId = req.user.id || req.user._id;
            const access = await FeatureAccessManager.checkAccess(userId, normalizedFeatureKey);
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
            null, // projectId
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

        const userId = req.user.id || req.user._id;
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