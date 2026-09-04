/**
 * Knowledge / RAG Repository Interface Contract Template
 */
export const IKnowledgeRepository = {
  findDocumentsByCategory: async (category) => {},
  insertVectorDocuments: async (docs) => {},
  updateDocumentCategory: async (filename, category) => {}
};

export default IKnowledgeRepository;
