/**
 * AI Orchestration Service Interface Contract Template
 */
export const IAIService = {
  generateChatResponse: async (prompt, sessionContext) => {},
  streamAIResponse: async (prompt, socketId) => {},
  embedText: async (text) => {}
};

export default IAIService;
