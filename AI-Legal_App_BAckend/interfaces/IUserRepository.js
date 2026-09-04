/**
 * User Repository Interface Contract Template
 */
export const IUserRepository = {
  findByEmail: async (email) => {},
  findById: async (id) => {},
  createUser: async (userData) => {},
  updateProfile: async (userId, updateData) => {},
  createSession: async (sessionData) => {},
  revokeSession: async (userId, token) => {}
};

export default IUserRepository;
