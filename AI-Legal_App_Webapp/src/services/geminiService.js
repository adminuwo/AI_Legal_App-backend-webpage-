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
        const systemInstruction = `You are a smart suggestion engine for a legal AI assistant.
Your job is to generate exactly 3 highly relevant, context-aware, and ACTION-ORIENTED follow-up legal questions or next steps.

STRICT RULES:
1. NO GREETINGS OR USER NAMES: Never include "Yes, Aditi", "Sure", "Hello", "Dear", or any person's name in suggestions!
2. NO CONVERSATIONAL FILLER: Never start with "To ensure...", "I can help...", or "Sure, I will...". Suggestions must be direct user questions or legal actions.
3. ACTION-ORIENTED LEGAL QUESTIONS: e.g. ["Draft a Bail Application", "Identify Section 300 IPC grounds", "Request evidence checklist"]
4. LENGTH: 4–8 words max.
5. FORMAT: Return ONLY a JSON array: ["S1", "S2", "S3"]`;

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
            const cleanSuggestion = (str) => {
                return String(str || '')
                    .replace(/^\s*[-*•\d+.]\s*/, '')
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/["'\[\]]/g, '')
                    .replace(/^Hello\s+[^,]+,?\s*/i, '')
                    .replace(/^Hi\s+[^,]+,?\s*/i, '')
                    .trim();
            };

            // Attempt to parse as JSON first
            try {
                const jsonMatch = replyText.match(/\[\s*".*?"\s*\]/s) || replyText.match(/\[.*\]/s);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        return parsed
                            .map(cleanSuggestion)
                            .filter(s => s.length > 2 && !s.toLowerCase().startsWith('hello') && !s.toLowerCase().startsWith('hi '))
                            .slice(0, 3);
                    }
                }
            } catch (e) {
                console.warn("Failed to parse suggestions as JSON, falling back to line splitting.");
            }

            // Fallback: Split by newline or standard bullet patterns (1., -, *, •)
            return replyText
                .split(/\n|(?=\b\d+\.)|(?=\b[-*•]\s)/)
                .map(cleanSuggestion)
                .filter(line => line.length > 3 && line.length < 100 && !line.toLowerCase().startsWith('hello') && !line.toLowerCase().startsWith('hi '))
                .slice(0, 3);
        }
        return [];
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return [];
    }
};

