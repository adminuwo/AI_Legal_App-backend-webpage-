/**
 * Case / Project Service Interface Contract Template
 */
export const ICaseService = {
  createCase: async (userId, caseData) => {},
  getCaseDetails: async (caseId) => {},
  listUserCases: async (userId, page, limit) => {},
  updateCase: async (caseId, updateData) => {},
  deleteCase: async (caseId) => {}
};

export default ICaseService;
