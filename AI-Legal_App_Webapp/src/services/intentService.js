/**
 * AISA Intent Service (Frontend)
 * Communicates with the backend /api/intent/* endpoints.
 * Handles detection, execution dispatch, and job polling.
 */

import axios from 'axios';
import { apis, API } from '../types.js';

// Base URL for intent endpoints
const INTENT_BASE = `${API}/intent`;

// ─── Detect Intent ─────────────────────────────────────────────────────────────
/**
 * Send a message to the backend classifier and get a routing decision.
 * @param {string} message - User's text message
 * @param {Array} attachments - Array of attachment metadata objects
 * @param {Array} conversationHistory - Last N messages for context
 * @returns {Object} Classification result with intent, tools, pipeline, frontend_mode
 */
export const detectIntent = async (message, attachments = [], conversationHistory = []) => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.post(
            `${INTENT_BASE}/detect`,
            {
                message,
                attachments: attachments.map(a => ({
                    name: a.name || a.fileName || 'file',
                    type: a.type || (a.mimeType?.split('/')[0]) || 'file',
                    mimeType: a.mimeType || a.type || 'application/octet-stream',
                    size: a.size || 0
                })),
                conversationHistory: conversationHistory.slice(-3).map(m => ({
                    role: m.role,
                    content: (m.text || m.content || '').substring(0, 120)
                }))
            },
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 12000 // 12s timeout — classifier should be < 1s, but give headroom
            }
        );

        return response.data;
    } catch (error) {
        console.error('[IntentService] detect error:', error?.response?.data || error.message);
        // Return graceful fallback — normal chat
        return {
            success: true,
            requiresClarification: false,
            intent: 'normal_chat',
            tools: ['normal_chat'],
            frontend_mode: 'NORMAL_CHAT',
            confidence: 0.5,
            estimated_credits: 0,
            fallback: true
        };
    }
};

// ─── Execute Pipeline ──────────────────────────────────────────────────────────
/**
 * Confirm pipeline execution with the backend.
 * Backend creates a job record and returns routing info.
 * Frontend uses `primaryEndpoint` + `primaryMode` to fire the actual tool call.
 *
 * @param {Object} detectionResult - Result from detectIntent()
 * @param {string} message - User message
 * @param {Array} attachments - Attachments
 * @param {Object} config - Tool-specific config (duration, voice, etc.)
 * @returns {Object} Routing plan with primaryEndpoint, primaryMode, jobId
 */
export const executePipeline = async (detectionResult, message, attachments = [], config = {}) => {
    try {
        const token = localStorage.getItem('token');

        const response = await axios.post(
            `${INTENT_BASE}/execute`,
            {
                jobId: detectionResult.jobId,
                tools: detectionResult.tools,
                pipeline: detectionResult.pipeline,
                intent: detectionResult.intent,
                frontend_mode: detectionResult.frontend_mode,
                message,
                attachments,
                config
            },
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 8000
            }
        );

        return response.data;
    } catch (error) {
        console.error('[IntentService] execute error:', error?.response?.data || error.message);
        return {
            success: false,
            error: 'Pipeline execution failed',
            fallback: true,
            primaryEndpoint: apis.chatAgent,
            primaryMode: 'NORMAL_CHAT'
        };
    }
};

// ─── Poll Job Status ───────────────────────────────────────────────────────────
/**
 * Poll an async job for status updates.
 * Use for long-running tools (video gen, deep search).
 * @param {string} jobId
 * @returns {Object} Job status object
 */
export const pollJobStatus = async (jobId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
            `${INTENT_BASE}/job/${jobId}`,
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 5000
            }
        );
        return response.data;
    } catch (error) {
        console.error('[IntentService] pollJobStatus error:', error.message);
        return { success: false, status: 'unknown', error: error.message };
    }
};

// ─── Get Tool Registry ─────────────────────────────────────────────────────────
/**
 * Fetch all available tools from the backend registry.
 * Can be used to render a dynamic tool selection UI.
 */
export const fetchAvailableTools = async () => {
    try {
        const response = await axios.get(`${INTENT_BASE}/tools`, { timeout: 5000 });
        return response.data.tools || [];
    } catch (error) {
        console.error('[IntentService] fetchAvailableTools error:', error.message);
        return [];
    }
};

// ─── Map frontend_mode to active tool state ────────────────────────────────────
/**
 * Maps the backend frontend_mode string to the Chat.jsx tool state keys.
 * Used to auto-activate the correct magic tool card in the UI.
 */
export const mapModeToToolState = (frontendMode) => {
    const modeMap = {
        'IMAGE_GEN': { activeImageGen: true },
        'VIDEO_GEN': { activeVideoGen: true },
        'IMAGE_TO_VIDEO': { activeVideoGen: true, videoMode: 'image_to_video' },
        'IMAGE_EDIT': { activeMagicEdit: true },
        'AUDIO_TALK': { activeAudioTalk: true },
        'web_search': { webSearchMode: true },
        'DEEP_SEARCH': { deepSearchMode: true },
        'CODING_HELP': { activeCodeWriter: true, mode: 'CODING_HELP' },
        'FILE_ANALYSIS': { activeFileAnalysis: true, mode: 'FILE_ANALYSIS' },
        'FILE_CONVERSION': { activeFileAnalysis: true, mode: 'FILE_CONVERSION' },
        'LEGAL_TOOLKIT': { activeLegalToolkit: true, mode: 'LEGAL_TOOLKIT' },
        'NORMAL_CHAT': {}
    };
    return modeMap[frontendMode] || {};
};

// ─── Format confidence as readable label ───────────────────────────────────────
export const formatConfidence = (confidence) => {
    if (confidence >= 0.9) return 'Very confident';
    if (confidence >= 0.75) return 'Confident';
    if (confidence >= 0.5) return 'Somewhat sure';
    return 'Uncertain';
};

// ─── Credit display helper ─────────────────────────────────────────────────────
export const formatCreditCost = (credits) => {
    if (!credits || credits === 0) return 'Free';
    return `${credits} credits`;
};
