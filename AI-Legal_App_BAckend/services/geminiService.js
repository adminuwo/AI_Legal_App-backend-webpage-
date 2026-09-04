import * as aiService from './ai.service.js';

/**
 * generateChatResponse
 * A wrapper around the unified aiService.chat to maintain compatibility 
 * with the legal toolkit and other routed systems.
 */
export const generateChatResponse = async (
    history,
    message,
    systemInstruction,
    attachments,
    language = 'English',
    abortSignal = null,
    mode = 'GENERAL',
    sessionId = null,
    projectId = null,
    toolName = null
) => {
    // Transform attachments to the format expected by aiService.chat
    const images = [];
    const documents = [];

    if (attachments && Array.isArray(attachments)) {
        attachments.forEach(att => {
            if (att.url && att.url.startsWith('data:')) {
                const base64Data = att.url.split(',')[1];
                const mimeType = att.url.substring(att.url.indexOf(':') + 1, att.url.indexOf(';'));
                
                if (att.type === 'image' || mimeType.startsWith('image/')) {
                    images.push({ mimeType, base64Data, name: att.name });
                } else {
                    documents.push({ mimeType: mimeType || 'application/pdf', base64Data, name: att.name });
                }
            } else if (att.url) {
                // If it's a URL, we treat it as an image if it has an image type/extension
                const isImage = att.type === 'image' || (att.name && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(att.name));
                if (isImage) {
                    images.push({ url: att.url, name: att.name, mimeType: att.mimeType });
                } else {
                    documents.push({ url: att.url, name: att.name, mimeType: att.mimeType });
                }
            }
        });
    }

    // Call the unified chat service
    const result = await aiService.chat(message, null, {
        systemInstruction,
        mode,
        images,
        documents,
        language,
        conversationId: sessionId,
        projectId,
        history,
        toolName
    });


    // Return the response in the expected format (legalToolkitRoutes expects responseData.reply)
    return {
        reply: result.text,
        suggestions: result.suggestions || [],
        sources: result.sources || [],
        isRealTime: result.isRealTime || false,
        ...result
    };
};
