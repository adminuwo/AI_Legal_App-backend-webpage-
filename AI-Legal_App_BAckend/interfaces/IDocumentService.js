/**
 * Document Processing Service Interface Contract Template
 */
export const IDocumentService = {
  processDocumentUpload: async (fileBuffer, mimeType) => {},
  extractDocumentText: async (filePath) => {},
  deleteDocument: async (documentId) => {}
};

export default IDocumentService;
