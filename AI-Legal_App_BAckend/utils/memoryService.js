import UserMemory from '../models/UserMemory.js';
import { AskVertexRaw } from '../services/vertex.service.js';

/**
 * Extracts key user information from a conversation using AI
 */
export const extractUserMemory = async (content, history = []) => {
    try {
        const prompt = `
      Analyze the following conversation and extract user profile information.
      Return ONLY a JSON object with these keys (if not found, keep empty strings or empty arrays):
      {
        "name": "User's name if mentioned",
        "businessType": "User's business or profession",
        "interests": ["list", "of", "interests"],
        "goals": ["list", "of", "goals/objectives"],
        "preferences": {"tone": "tone preference", "language": "language preference"},
        "approvedStrategies": ["strategies user agrees with, requests, or approves"],
        "clientPreferences": ["client-specific handling preferences mentioned"],
        "courtPreferences": ["jurisdiction, judge, or court handling preferences"],
        "referencedLaws": ["frequently cited laws, acts, or sections"],
        "ignoredSuggestions": ["suggestions user explicitly rejects, dislikes, or ignores"],
        "summary": "Short 1-sentence summary of what user was doing/asking"
      }

      CONVERSATION:
      ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
      User: ${content}
    `;

        const text = await AskVertexRaw(prompt);
        if (!text) return null;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.warn('[MEMORY SERVICE] Memory extraction skipped:', error.message || error);
        return null;
    }
};

/**
 * Merges new info into existing memory intelligently
 */
export const updateMemory = async (userId, extractedInfo, lastFeature = 'Chat') => {
    try {
        if (!extractedInfo) return null;

        let memory = await UserMemory.findOne({ userId });

        if (!memory) {
            memory = new UserMemory({ userId });
        }

        if (extractedInfo.name && extractedInfo.name !== 'Unknown') memory.name = extractedInfo.name;
        if (extractedInfo.businessType) memory.businessType = extractedInfo.businessType;

        if (extractedInfo.interests && Array.isArray(extractedInfo.interests)) {
            extractedInfo.interests.forEach(interest => {
                if (interest && !memory.interests.includes(interest)) memory.interests.push(interest);
            });
            if (memory.interests.length > 10) memory.interests = memory.interests.slice(-10);
        }

        if (extractedInfo.goals && Array.isArray(extractedInfo.goals)) {
            extractedInfo.goals.forEach(goal => {
                if (goal && !memory.goals.includes(goal)) memory.goals.push(goal);
            });
            if (memory.goals.length > 10) memory.goals = memory.goals.slice(-10);
        }

        if (extractedInfo.preferences) {
            if (extractedInfo.preferences.tone) memory.preferences.tone = extractedInfo.preferences.tone;
            if (extractedInfo.preferences.language) memory.preferences.language = extractedInfo.preferences.language;
        }

        // Merge legal-specific parameters
        if (extractedInfo.approvedStrategies && Array.isArray(extractedInfo.approvedStrategies)) {
            extractedInfo.approvedStrategies.forEach(s => {
                if (s && !memory.approvedStrategies.includes(s)) memory.approvedStrategies.push(s);
            });
        }
        if (extractedInfo.clientPreferences && Array.isArray(extractedInfo.clientPreferences)) {
            extractedInfo.clientPreferences.forEach(p => {
                if (p && !memory.clientPreferences.includes(p)) memory.clientPreferences.push(p);
            });
        }
        if (extractedInfo.courtPreferences && Array.isArray(extractedInfo.courtPreferences)) {
            extractedInfo.courtPreferences.forEach(c => {
                if (c && !memory.courtPreferences.includes(c)) memory.courtPreferences.push(c);
            });
        }
        if (extractedInfo.referencedLaws && Array.isArray(extractedInfo.referencedLaws)) {
            extractedInfo.referencedLaws.forEach(l => {
                if (l && !memory.referencedLaws.includes(l)) memory.referencedLaws.push(l);
            });
        }
        if (extractedInfo.ignoredSuggestions && Array.isArray(extractedInfo.ignoredSuggestions)) {
            extractedInfo.ignoredSuggestions.forEach(s => {
                if (s && !memory.ignoredSuggestions.includes(s)) memory.ignoredSuggestions.push(s);
            });
        }

        if (extractedInfo.summary) memory.lastSessionSummary = extractedInfo.summary;
        memory.lastActiveFeature = lastFeature;
        memory.updatedAt = Date.now();

        await memory.save();
        return memory;
    } catch (error) {
        console.error('[MEMORY SERVICE] Update error:', error);
        return null;
    }
};

/**
 * Gets memory context for system instruction
 */
export const getMemoryContext = async (userId) => {
    try {
        const memory = await UserMemory.findOne({ userId, isMemoryEnabled: true });
        if (!memory) return "";

        return `
[USER PERSONAL MEMORY]
User Name: ${memory.name || 'Unknown'}
Business/Profession: ${memory.businessType || 'Not specified'}
Interests: ${memory.interests.join(', ') || 'None recorded'}
Goals: ${memory.goals.join(', ') || 'None recorded'}
Last Active Session: ${memory.lastSessionSummary || 'No recent history'}
Last Active Feature: ${memory.lastActiveFeature || 'None'}
Tone Preference: ${memory.preferences.tone || 'Generic'}
Approved Strategies: ${(memory.approvedStrategies || []).join(', ') || 'None'}
Preferred Drafting Style: ${memory.preferredDraftingStyle || 'Standard formal legal writing'}
Client Preferences: ${(memory.clientPreferences || []).join(', ') || 'None'}
Court Preferences: ${(memory.courtPreferences || []).join(', ') || 'None'}
Favorite Templates: ${(memory.favoriteTemplates || []).join(', ') || 'None'}
Ignored Suggestions: ${(memory.ignoredSuggestions || []).join(', ') || 'None'}
Frequently Referenced Laws: ${(memory.referencedLaws || []).join(', ') || 'None'}
Always tailor your responses to match the user's profession, goals, and style preferences provided above.
`;
    } catch (error) {
        return "";
    }
};
