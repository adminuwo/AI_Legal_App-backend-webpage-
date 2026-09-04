import axios from "axios";
import { apis } from "../types";
import { getUserData } from "../userStore/userData";
import { getDeviceFingerprint } from "../utils/fingerprint";

export const generateChatResponse = async (history, currentMessage, systemInstruction, attachments, language, abortSignal = null, mode = null, sessionId = null, projectId = null, userMsgId = null, aiMsgId = null, aspectRatio = null, modelId = null, onChunk = null) => {
    try {
        const token = getUserData()?.token;
        const headers = {
            'X-Device-Fingerprint': getDeviceFingerprint(),
            'Content-Type': 'application/json'
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
 * @param {string} prompt - The original prompt
 * @param {string} type - 'image', 'video', or 'chat'
 * @returns {Promise<string[]>} List of 3 suggested prompts
 */
export const generateFollowUpPrompts = async (prompt, type = 'image') => {
    try {
        const systemInstruction = `You are a smart suggestion engine for an AI assistant.
Your job is to generate exactly 3 highly relevant, context-aware, and ACTION-ORIENTED follow-up suggestions for ${type} mode.

STRICT RULES:
1. NO GENERIC SUGGESTIONS: Never return "Explain more", "Give examples", or "Summarize".
2. ACTION-ORIENTED: Suggestions must feel like a next step.
3. LENGTH: 5–10 words max.
4. FORMAT: Return ONLY a JSON array: ["S1", "S2", "S3"]`;

        // Use skipSession:true so the backend does NOT create a ghost chat session for this internal call
        const token = getUserData()?.token;
        const headers = { 'X-Device-Fingerprint': getDeviceFingerprint() };
        if (token && token !== 'undefined' && token !== 'null') headers.Authorization = `Bearer ${token}`;
        const raw = await axios.post(apis.chatAgent, {
            content: prompt,
            history: [],
            systemInstruction,
            image: [],
            document: [],
            language: 'English',
            skipSession: true
        }, { headers, withCredentials: true, timeout: 15000 });
        const response = raw.data;

        // Handle both object {reply: "..."} and direct string responses
        const replyText = response?.reply || (typeof response === 'string' ? response : null);

        if (replyText && !replyText.includes('Log In') && !replyText.includes('System Message')) {
            // Attempt to parse as JSON first
            try {
                // Remove markdown code blocks if present
                const jsonMatch = replyText.match(/\[\s*".*?"\s*\]/s) || replyText.match(/\[.*\]/s);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        return parsed.map(s => s.trim()).filter(s => s.length > 2).slice(0, 3);
                    }
                }
            } catch (e) {
                console.warn("Failed to parse suggestions as JSON, falling back to line splitting.");
            }

            // Fallback: Split by newline or standard bullet patterns (1., -, *, •)
            return replyText
                .split(/\n|(?=\b\d+\.)|(?=\b[-*•]\s)/)
                .map(line => line.replace(/^\s*[-*•\d+.]\s*/, '').replace(/["'\[\]]/g, '').trim())
                .filter(line => line.length > 2 && line.length < 100)
                .slice(0, 3);
        }
        return [];
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return [];
    }
};

