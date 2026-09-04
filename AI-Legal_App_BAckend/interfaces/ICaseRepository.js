/**
 * Case / Project Repository Interface Contract Template
 */
export const ICaseRepository = {
  findUserProjects: async (userId, filters) => {},
  findProjectById: async (projectId) => {},
  createProject: async (projectData) => {},
  updateProjectDetails: async (projectId, updateData) => {},
  deleteProject: async (projectId) => {}
};

export default ICaseRepository;
