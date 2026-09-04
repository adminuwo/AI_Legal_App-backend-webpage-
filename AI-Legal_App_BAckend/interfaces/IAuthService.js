/**
 * Authentication Service Interface Contract Template
 */
export const IAuthService = {
  login: async (credentials) => {},
  register: async (userData) => {},
  verifyEmail: async (email, otp) => {},
  refreshToken: async (token) => {},
  logout: async (userId, token) => {}
};

export default IAuthService;
