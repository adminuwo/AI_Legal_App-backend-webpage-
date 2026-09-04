/**
 * User Service Interface Contract Template
 */
export const IUserService = {
  getUserProfile: async (userId) => {},
  updateUserProfile: async (userId, updateData) => {},
  exportUserData: async (userId) => {}
};

export default IUserService;
