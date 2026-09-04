/**
 * AI Utility Helper Functions
 */

export const estimateTokens = (text = '') => {
  if (!text) return 0;
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
};

export const parseAIJSONResponse = (rawResponse = '') => {
  try {
    const cleaned = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
};

export default {
  estimateTokens,
  parseAIJSONResponse
};
