/**
 * Vector Embedding Provider Interface Contract Template
 */
export const IEmbeddingProvider = {
  embedText: async (text) => {},
  embedBatch: async (texts) => {}
};

export default IEmbeddingProvider;
