/**
 * AISA Intent Routes
 * Exposes:
 *   POST /api/intent/detect   → Classify user intent (fast, < 1s)
 *   POST /api/intent/execute  → Finalize routing decision + return pipeline config to frontend
 *   GET  /api/intent/job/:jobId → Poll async job status
 *   GET  /api/intent/tools    → Get all available tools (public registry)
 */

import express from 'express';
import { nanoid } from 'nanoid';
import logger from '../utils/logger.js';
import { classifyIntent, CONFIDENCE_THRESHOLD_VALUE } from '../services/intent/intentClassifier.js';
import { buildPipeline } from '../services/intent/pipelineBuilder.js';
import { getPublicTools, getToolByName, totalPipelineCost } from '../services/intent/toolRegistry.js';
import IntentJob from '../models/IntentJob.js';
import { optionalVerifyToken } from '../middleware/authorization.js';

const router = express.Router();

// ─── POST /api/intent/detect ───────────────────────────────────────────────────
/**
 * Fast intent classification endpoint.
 * Takes user message + attachments → returns structured routing decision.
 * Does NOT execute any tool. Just detects and plans.
 */
router.post('/detect', optionalVerifyToken, async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            message,
            attachments = [],
            conversationHistory = [],
            sessionId
        } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'message is required and must be a non-empty string'
            });
        }

        // Build conversation summary (last 3 turns only, to keep prompt short)
        const conversationSummary = Array.isArray(conversationHistory)
            ? conversationHistory
                .slice(-3)
                .map(m => `${m.role}: ${(m.content || '').substring(0, 100)}`)
                .join(' | ')
            : '';

        // ── Run LLM Classifier ──────────────────────────────────────────────────
        const classification = await classifyIntent(message, attachments, conversationSummary);

        // ── Build Pipeline Plan ─────────────────────────────────────────────────
        const pipeline = buildPipeline(classification.tools || ['normal_chat'], attachments);

        // ── Handle uncertain intent ─────────────────────────────────────────────
        if (classification.intent === 'uncertain' || classification.confidence < CONFIDENCE_THRESHOLD_VALUE) {
            logger.info(`[IntentRoute] Low confidence (${classification.confidence}) — returning clarification`);
            return res.json({
                success: true,
                requiresClarification: true,
                intent: 'uncertain',
                clarification_question: classification.clarification_question ||
                    'Could you clarify what you\'d like to do? For example — generate an image, video, audio, or just chat?',
                suggestions: ['text_to_image', 'text_to_video', 'text_to_audio', 'normal_chat'],
                confidence: classification.confidence,
                detected_language: classification.detected_language,
                latencyMs: Date.now() - startTime
            });
        }

        // ── Handle missing required assets ──────────────────────────────────────
        if (!pipeline.assetsValid && pipeline.missingAssets.length > 0) {
            const toolNames = classification.tools;
            const firstTool = getToolByName(toolNames[0]);
            return res.json({
                success: false,
                error: 'MISSING_ASSETS',
                missing_assets: pipeline.missingAssets,
                message: `Please upload ${pipeline.missingAssets.join(' or ')} to use ${firstTool?.name || toolNames[0]}.`,
                intent: classification.intent,
                tools: classification.tools,
                confidence: classification.confidence,
                latencyMs: Date.now() - startTime
            });
        }

        // ── Generate jobId for tracking ─────────────────────────────────────────
        const jobId = `job_${nanoid(12)}`;

        // ── Return full routing decision ────────────────────────────────────────
        const response = {
            success: true,
            requiresClarification: false,
            jobId,
            intent: classification.intent,
            tools: classification.tools,
            pipeline: {
                stages: pipeline.stages,
                pipelineType: pipeline.pipelineType,
                stageCount: pipeline.stageCount,
                totalTools: pipeline.totalTools
            },
            // Frontend needs this to activate the right tool card/mode
            frontend_mode: classification.frontend_mode,
            confidence: classification.confidence,
            input_type: classification.input_type,
            requires_assets: classification.requires_assets,
            estimated_credits: pipeline.estimatedCredits,
            detected_language: classification.detected_language,
            metadata: classification.metadata,
            latencyMs: Date.now() - startTime
        };

        logger.info(`[IntentRoute] Detect complete | intent=${classification.intent} | mode=${classification.frontend_mode} | confidence=${classification.confidence} | ${Date.now() - startTime}ms`);
        return res.json(response);

    } catch (error) {
        logger.error(`[IntentRoute] /detect error: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: 'Intent classification failed',
            details: error.message,
            // Graceful degradation: tell frontend to use normal chat
            fallback: 'normal_chat',
            frontend_mode: 'NORMAL_CHAT'
        });
    }
});

// ─── POST /api/intent/execute ──────────────────────────────────────────────────
/**
 * Pipeline execution confirmation endpoint.
 * Frontend sends back the jobId + user-confirmed pipeline.
 * Backend creates a job record and returns the routing info frontend needs
 * to actually fire the correct API call.
 *
 * This acts as a "dispatch" layer — the actual tool endpoints
 * (video, image, voice) are called by the frontend using the routingPlan returned here.
 */
router.post('/execute', optionalVerifyToken, async (req, res) => {
    try {
        const {
            jobId,
            tools = [],
            pipeline,
            message,
            attachments = [],
            config = {},
            intent,
            frontend_mode
        } = req.body;

        if (!message || !tools.length) {
            return res.status(400).json({
                success: false,
                error: 'message and tools are required'
            });
        }

        const userId = req.user?._id || req.user?.id || null;
        const resolvedJobId = jobId || `job_${nanoid(12)}`;

        // Build routing plan for frontend
        // Maps each tool to the endpoint and params the frontend should call
        const routingPlan = tools.map(toolName => {
            const tool = getToolByName(toolName);
            return {
                toolName,
                toolLabel: tool?.name || toolName,
                emoji: tool?.emoji || '🔧',
                endpoint: tool?.endpoint || '/api/chat',
                mode: tool?.modeKey || frontend_mode || 'NORMAL_CHAT',
                creditCost: tool?.creditCost || 0
            };
        });

        // Determine which endpoint is primary (first non-internal tool)
        const primaryTool = routingPlan[0];

        // Save job to DB for polling support
        const jobPayload = {
            jobId: resolvedJobId,
            userId: userId ? userId : undefined,
            status: 'queued',
            intent: intent || tools[0] || 'normal_chat',
            tools,
            pipeline,
            originalMessage: message,
            attachments,
            config,
            estimatedCredits: totalPipelineCost(tools),
            progress: {
                completed: [],
                running: [tools[0]],
                pending: tools.slice(1)
            }
        };

        // Fire-and-forget DB save
        IntentJob.create(jobPayload).catch(err =>
            logger.warn(`[IntentRoute] Job DB save failed (non-critical): ${err.message}`)
        );

        logger.info(`[IntentRoute] Execute dispatched | jobId=${resolvedJobId} | tools=[${tools.join(', ')}] | mode=${frontend_mode}`);

        return res.json({
            success: true,
            jobId: resolvedJobId,
            status: 'dispatched',
            // Primary routing info — frontend uses this to call the actual tool endpoint
            primaryEndpoint: primaryTool.endpoint,
            primaryMode: primaryTool.mode,
            routingPlan,
            // For multi-tool pipelines, stages tell frontend execution order
            pipeline: pipeline || {},
            estimatedCredits: totalPipelineCost(tools),
            message: `Pipeline dispatched: ${tools.join(' → ')}`
        });

    } catch (error) {
        logger.error(`[IntentRoute] /execute error: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: 'Pipeline execution failed',
            details: error.message
        });
    }
});

// ─── GET /api/intent/job/:jobId ────────────────────────────────────────────────
/**
 * Poll the status of an async pipeline job.
 * Frontend polls this every 3s for long-running jobs.
 */
router.get('/job/:jobId', optionalVerifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await IntentJob.findOne({ jobId }).lean();
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found or expired',
                jobId
            });
        }

        return res.json({
            success: true,
            jobId: job.jobId,
            status: job.status,
            intent: job.intent,
            tools: job.tools,
            progress: job.progress,
            result: job.status === 'completed' ? job.finalOutput : null,
            creditsUsed: job.creditsUsed,
            estimatedCredits: job.estimatedCredits,
            error: job.error || null,
            totalDurationMs: job.totalDurationMs,
            createdAt: job.createdAt,
            completedAt: job.completedAt
        });
    } catch (error) {
        logger.error(`[IntentRoute] /job/:jobId error: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ─── GET /api/intent/tools ─────────────────────────────────────────────────────
/**
 * Returns the public tool registry.
 * Frontend uses this to show "available tools" dynamically.
 */
router.get('/tools', (req, res) => {
    try {
        const tools = getPublicTools();
        return res.json({
            success: true,
            tools,
            total: tools.length
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
