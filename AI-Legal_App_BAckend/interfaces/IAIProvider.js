/**
 * AI Model Provider Interface Contract Template
 */
export const IAIProvider = {
  generateCompletion: async (prompt, options) => {},
  generateJSON: async (prompt, schema, options) => {}
};

export default IAIProvider;
