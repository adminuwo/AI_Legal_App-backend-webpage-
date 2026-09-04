/**
 * Document Repository Interface Contract Template
 */
export const IDocumentRepository = {
  findDocumentsByProject: async (projectId) => {},
  createDocumentAsset: async (assetData) => {},
  deleteDocumentAsset: async (assetId) => {}
};

export default IDocumentRepository;
