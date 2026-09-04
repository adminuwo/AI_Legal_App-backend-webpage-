/**
 * AISA Pipeline Builder
 * Converts a flat tool list into a DAG (Directed Acyclic Graph) execution plan.
 * Groups independent tools into parallel stages. Respects dependency ordering.
 */

import logger from '../../utils/logger.js';
import { getToolByName, totalPipelineCost } from './toolRegistry.js';

/**
 * Topological sort of tools based on dependencies.
 * Ensures tools always run after their dependencies.
 * @param {string[]} toolNames
 * @returns {string[]} sorted tool list
 */
const topologicalSort = (toolNames) => {
    const visited = new Set();
    const sorted = [];

    const visit = (toolName) => {
        if (visited.has(toolName)) return;
        visited.add(toolName);

        const tool = getToolByName(toolName);
        if (tool && tool.dependencies && tool.dependencies.length > 0) {
            for (const dep of tool.dependencies) {
                if (!toolNames.includes(dep)) {
                    // Auto-inject missing dependencies
                    logger.info(`[PipelineBuilder] Auto-injecting dependency: ${dep} (required by ${toolName})`);
                    toolNames.push(dep);
                }
                visit(dep);
            }
        }

        sorted.push(toolName);
    };

    for (const toolName of toolNames) {
        visit(toolName);
    }

    return sorted;
};

/**
 * Build execution stages from a sorted tool list.
 * Tools without shared dependencies are grouped into parallel batches.
 * Tools that depend on previously batched tools run in their own sequential stage.
 *
 * @param {string[]} sortedTools - Topologically sorted tool names
 * @returns {Array<{type: string, tools: string[]}>}
 */
const buildStages = (sortedTools) => {
    const stages = [];
    const completed = new Set();

    let i = 0;
    while (i < sortedTools.length) {
        const parallelBatch = [];

        // Collect all tools that can run in parallel at this point
        while (i < sortedTools.length) {
            const toolName = sortedTools[i];
            const tool = getToolByName(toolName);

            // Check if all dependencies of this tool are already completed
            const depsCompleted = !tool?.dependencies?.length ||
                tool.dependencies.every(dep => completed.has(dep));

            if (depsCompleted && !completed.has(toolName)) {
                parallelBatch.push(toolName);
                i++;
            } else {
                break; // Can't run this tool yet, start a new stage
            }
        }

        if (parallelBatch.length > 0) {
            stages.push({
                type: parallelBatch.length > 1 ? 'parallel' : 'sequential',
                tools: parallelBatch
            });
            parallelBatch.forEach(t => completed.add(t));
        } else {
            // Safety: avoid infinite loop in case of circular dependency
            if (i < sortedTools.length) {
                const stuck = sortedTools[i];
                logger.warn(`[PipelineBuilder] Possible circular dependency detected at: ${stuck}. Forcing sequential.`);
                stages.push({ type: 'sequential', tools: [stuck] });
                completed.add(stuck);
                i++;
            }
        }
    }

    return stages;
};

/**
 * Determine overall pipeline type label from stages
 */
const determinePipelineType = (stages) => {
    const hasParallel = stages.some(s => s.type === 'parallel');
    const hasSequential = stages.some(s => s.type === 'sequential');
    if (stages.length === 1 && stages[0].tools.length === 1) return 'single';
    if (hasParallel && hasSequential) return 'hybrid';
    if (hasParallel) return 'parallel';
    return 'sequential';
};

/**
 * Validate that all required assets are present for tools that need them.
 * @param {string[]} toolNames
 * @param {Array} attachments
 * @returns {{ valid: boolean, missingAssets: string[] }}
 */
const validateAssets = (toolNames, attachments = []) => {
    const attachmentTypes = attachments.map(a => a.type || 'file');
    const missing = [];

    for (const toolName of toolNames) {
        const tool = getToolByName(toolName);
        if (!tool || !tool.requiresAssets) continue;

        const required = tool.requiredAssetTypes || [];
        const hasRequired = required.some(reqType =>
            attachmentTypes.some(attType =>
                attType === reqType ||
                attType.startsWith(reqType) ||
                reqType.startsWith(attType)
            )
        );

        if (!hasRequired) {
            missing.push(...required.filter(r => !missing.includes(r)));
        }
    }

    return { valid: missing.length === 0, missingAssets: missing };
};

/**
 * Main pipeline builder function.
 * Takes a list of tool names and returns a full, executable pipeline plan.
 *
 * @param {string[]} tools - Tool names from classifier
 * @param {Array} attachments - User attachments for asset validation
 * @returns {Object} Pipeline execution plan
 */
export const buildPipeline = (tools = [], attachments = []) => {
    if (!tools || tools.length === 0) {
        logger.warn('[PipelineBuilder] No tools provided, defaulting to normal_chat');
        tools = ['normal_chat'];
    }

    // Validate all tools exist in registry
    const validTools = tools.filter(t => {
        const exists = !!getToolByName(t);
        if (!exists) logger.warn(`[PipelineBuilder] Unknown tool "${t}" — skipping`);
        return exists;
    });

    if (validTools.length === 0) {
        validTools.push('normal_chat');
    }

    // Resolve dependency ordering (topological sort)
    const toolsMutable = [...validTools];
    const sortedTools = topologicalSort(toolsMutable);

    // Build parallel/sequential stage groups
    const stages = buildStages(sortedTools);

    // Validate required assets
    const { valid: assetsValid, missingAssets } = validateAssets(sortedTools, attachments);

    // Calculate total estimated credits
    const estimatedCredits = totalPipelineCost(sortedTools);

    // Determine pipeline type
    const pipelineType = determinePipelineType(stages);

    const pipeline = {
        stages,
        pipelineType,
        tools: sortedTools,
        estimatedCredits,
        assetsValid,
        missingAssets,
        stageCount: stages.length,
        totalTools: sortedTools.length
    };

    logger.info(`[PipelineBuilder] Built pipeline: ${pipelineType} | ${stages.length} stage(s) | tools=[${sortedTools.join(' → ')}] | credits=${estimatedCredits}`);

    return pipeline;
};
