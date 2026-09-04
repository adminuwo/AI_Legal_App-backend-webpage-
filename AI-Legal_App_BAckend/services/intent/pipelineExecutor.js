/**
 * AISA Pipeline Executor
 * Executes a built pipeline stage by stage.
 * Supports parallel (Promise.allSettled) and sequential execution.
 * Passes context (outputs) from one stage to the next.
 * Each tool step is fully logged for observability.
 */

import logger from '../../utils/logger.js';
import { getToolByName } from './toolRegistry.js';
import { nanoid } from 'nanoid';

// ─── Tool Handler Map ──────────────────────────────────────────────────────────
// Maps toolName → the actual async function to call.
// Each handler receives (context) and returns { output, error }.

const loadHandlers = async () => {
    const handlers = {};

    try {
        const chatRoutes = await import('../../routes/chatRoutes.js');
        const voiceController = await import('../../controllers/voiceController.js');

        // Map tool names → handler functions
        handlers['normal_chat'] = (ctx) => delegateToEndpoint('/api/chat', ctx, 'NORMAL_CHAT');
        handlers['text_to_audio'] = (ctx) => delegateToEndpoint('/api/voice/synthesize', ctx, 'AUDIO_TALK');
        handlers['web_search'] = (ctx) => delegateToEndpoint('/api/chat', ctx, 'web_search');
        handlers['deep_search'] = (ctx) => delegateToEndpoint('/api/chat', ctx, 'DEEP_SEARCH');
        handlers['file_analysis'] = (ctx) => delegateToEndpoint('/api/chat', ctx, 'FILE_ANALYSIS');
        handlers['file_conversion'] = (ctx) => delegateToEndpoint('/api/chat', ctx, 'FILE_CONVERSION');
        handlers['knowledge_base'] = (ctx) => delegateToEndpoint('/api/aibase/knowledge', ctx, 'RAG');
    } catch (err) {
        logger.error(`[PipelineExecutor] Handler load error: ${err.message}`);
    }

    return handlers;
};

/**
 * Delegate tool execution to the relevant backend endpoint info.
 * In a full microservice setup this would be an actual HTTP call.
 * In the current monolith, it returns the routing info for the
 * intentRoutes controller to pass to the frontend.
 */
const delegateToEndpoint = async (endpoint, ctx, mode) => {
    return {
        routeTo: endpoint,
        mode,
        payload: {
            message: ctx.currentInput || ctx.originalMessage,
            mode,
            attachments: ctx.attachments,
            history: ctx.history,
            config: ctx.config,
            // Pass outputs from previous stages as context
            previousOutputs: ctx.stageOutputs
        }
    };
};

// ─── Execute a single tool step ───────────────────────────────────────────────

const executeOneTool = async (toolName, context, handlers) => {
    const startedAt = Date.now();
    const stepId = nanoid(8);

    logger.info(`[PipelineExecutor][${stepId}] ▶ Running: ${toolName}`);

    const handler = handlers[toolName];
    if (!handler) {
        logger.error(`[PipelineExecutor][${stepId}] No handler for tool: ${toolName}`);
        return {
            stepId,
            toolName,
            status: 'error',
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            output: null,
            error: `No handler registered for tool: ${toolName}`
        };
    }

    try {
        const output = await handler(context);
        const durationMs = Date.now() - startedAt;

        logger.info(`[PipelineExecutor][${stepId}] ✅ ${toolName} completed in ${durationMs}ms`);

        return {
            stepId,
            toolName,
            status: 'success',
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs,
            output,
            error: null
        };
    } catch (err) {
        const durationMs = Date.now() - startedAt;
        logger.error(`[PipelineExecutor][${stepId}] ❌ ${toolName} failed: ${err.message}`);

        return {
            stepId,
            toolName,
            status: 'error',
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs,
            output: null,
            error: err.message
        };
    }
};

// ─── Main Executor ─────────────────────────────────────────────────────────────

/**
 * Execute a complete pipeline.
 * Processes stages in order. Within a 'parallel' stage, all tools run concurrently.
 * Context is shared between stages — outputs of stage N become inputs of stage N+1.
 *
 * @param {Object} pipeline - The built pipeline from pipelineBuilder
 * @param {Object} executionContext - { originalMessage, attachments, history, config, userId }
 * @returns {Object} PipelineResult
 */
export const executePipeline = async (pipeline, executionContext = {}) => {
    const jobStartTime = Date.now();
    const traceId = nanoid(16);

    const context = {
        originalMessage: executionContext.message || '',
        currentInput: executionContext.message || '',
        attachments: executionContext.attachments || [],
        history: executionContext.history || [],
        config: executionContext.config || {},
        userId: executionContext.userId,
        stageOutputs: {},
        traceId
    };

    const trace = [];
    const stageOutputs = {};
    let totalCreditsUsed = 0;
    let finalOutput = null;
    let overallStatus = 'success';

    logger.info(`[PipelineExecutor] 🚀 Starting pipeline | traceId=${traceId} | stages=${pipeline.stages.length} | tools=[${pipeline.tools.join(', ')}]`);

    // Load handlers once
    const handlers = await loadHandlers();

    // ── Execute each stage ─────────────────────────────────────────────────────
    for (let stageIndex = 0; stageIndex < pipeline.stages.length; stageIndex++) {
        const stage = pipeline.stages[stageIndex];
        logger.info(`[PipelineExecutor] Stage ${stageIndex + 1}/${pipeline.stages.length}: ${stage.type} | tools=[${stage.tools.join(', ')}]`);

        let stageResults = [];

        if (stage.type === 'parallel') {
            // Run all tools in this stage concurrently
            const promises = stage.tools.map(toolName =>
                executeOneTool(toolName, { ...context }, handlers)
            );
            const settled = await Promise.allSettled(promises);
            stageResults = settled.map(r =>
                r.status === 'fulfilled' ? r.value : {
                    toolName: 'unknown',
                    status: 'error',
                    error: r.reason?.message || 'Promise rejected',
                    output: null
                }
            );
        } else {
            // Run tools sequentially within this stage
            for (const toolName of stage.tools) {
                const result = await executeOneTool(toolName, { ...context }, handlers);
                stageResults.push(result);

                // Update context with this tool's output for the next tool in sequence
                if (result.status === 'success' && result.output) {
                    context.currentInput = result.output;
                    context.stageOutputs[toolName] = result.output;
                    stageOutputs[toolName] = result.output;
                }
            }
        }

        // Collect parallel results into context
        for (const result of stageResults) {
            trace.push({
                stage: stageIndex + 1,
                ...result
            });

            if (result.status === 'success' && result.output) {
                stageOutputs[result.toolName] = result.output;
                context.stageOutputs[result.toolName] = result.output;
                finalOutput = result.output; // Last successful output is the final output
            }

            if (result.status === 'error') {
                // Non-critical tools: log and continue
                // Mark overall as partial if non-critical fails
                const tool = getToolByName(result.toolName);
                if (tool && !tool.isOptional) {
                    // If a core tool fails in the pipeline, mark as partial
                    logger.warn(`[PipelineExecutor] Core tool ${result.toolName} failed. Pipeline partially successful.`);
                    overallStatus = 'partial';
                }
            }

            // Accumulate credits for successful steps only
            const tool = getToolByName(result.toolName);
            if (result.status === 'success' && tool) {
                totalCreditsUsed += tool.creditCost || 0;
            }
        }
    }

    const totalDurationMs = Date.now() - jobStartTime;

    const pipelineResult = {
        success: overallStatus !== 'error',
        status: overallStatus,
        traceId,
        finalOutput,
        stageOutputs,
        trace,
        totalDurationMs,
        creditsUsed: totalCreditsUsed,
        stagesCompleted: pipeline.stages.length
    };

    logger.info(`[PipelineExecutor] ✅ Pipeline complete | traceId=${traceId} | status=${overallStatus} | duration=${totalDurationMs}ms | credits=${totalCreditsUsed}`);

    return pipelineResult;
};
