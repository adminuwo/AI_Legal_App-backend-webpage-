/**
 * Mode Detection Utility for AI LEGAL Frontend
 * Mirrors backend mode detection for UI consistency
 */

export const MODES = {
    NORMAL_CHAT: 'NORMAL_CHAT',
    FILE_ANALYSIS: 'FILE_ANALYSIS',
    CONTENT_WRITING: 'CONTENT_WRITING',
    DEEP_SEARCH: 'DEEP_SEARCH',
    DOCUMENT_CONVERT: 'DOCUMENT_CONVERT',
    WEB_SEARCH: 'web_search',
    LEGAL_TOOLKIT: 'LEGAL_TOOLKIT'
};

const WRITING_KEYWORDS = [
    'write', 'article', 'blog', 'essay', 'content', 'draft', 'compose',
    'create a post', 'write about', 'paragraph', 'story', 'letter',
    'email template', 'description', 'summary', 'report', 'document',
    'copywriting', 'marketing copy', 'social media post', 'caption',
    'headline', 'slogan', 'tagline', 'press release'
];

export function detectMode(message = '', attachments = []) {
    const lowerMessage = message.toLowerCase().trim();

    if (attachments && attachments.length > 0) {
        return MODES.FILE_ANALYSIS;
    }

    const hasWritingKeywords = WRITING_KEYWORDS.some(keyword =>
        lowerMessage.includes(keyword)
    );

    if (hasWritingKeywords) {
        return MODES.CONTENT_WRITING;
    }

    return MODES.NORMAL_CHAT;
}

export function getModeName(mode) {
    const names = {
        [MODES.NORMAL_CHAT]: 'AI LEGAL™ Chat',
        [MODES.FILE_ANALYSIS]: 'AI LEGAL™ Analysis',
        [MODES.CONTENT_WRITING]: 'AI LEGAL™ Writer',
        [MODES.DEEP_SEARCH]: 'AI LEGAL™ Precedents Search & Citations',
        [MODES.DOCUMENT_CONVERT]: 'AI LEGAL™ Convert',
        [MODES.LEGAL_TOOLKIT]: 'AI LEGAL™ Legal',
        [MODES.WEB_SEARCH]: 'Web Search'
    };
    return names[mode] || 'Chat';
}

export function getModeIcon(mode) {
    const icons = {
        [MODES.NORMAL_CHAT]: '💬',
        [MODES.FILE_ANALYSIS]: '📄',
        [MODES.CONTENT_WRITING]: '✍️',
        [MODES.DEEP_SEARCH]: '🔍',
        [MODES.DOCUMENT_CONVERT]: '🔄',
        [MODES.LEGAL_TOOLKIT]: '⚖️',
        [MODES.WEB_SEARCH]: '🌐'
    };
    return icons[mode] || '💬';
}

export function getModeColor(mode) {
    const colors = {
        [MODES.NORMAL_CHAT]: '#6366f1',
        [MODES.FILE_ANALYSIS]: '#8b5cf6',
        [MODES.CONTENT_WRITING]: '#ec4899',
        [MODES.DEEP_SEARCH]: '#0ea5e9',
        [MODES.DOCUMENT_CONVERT]: '#10b981',
        [MODES.LEGAL_TOOLKIT]: '#8b5cf6',
        [MODES.WEB_SEARCH]: '#3b82f6'
    };
    return colors[mode] || '#6366f1';
}
