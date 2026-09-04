// Message Type (JSDoc for IntelliSense)
export const MessageRole = {
  USER: "user",
  MODEL: "model",
};

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {"user" | "model"} role
 * @property {string} content
 * @property {number} timestamp
 */

/**
 * @typedef {Object} ChatSession
 * @property {string} id
 * @property {string} title
 * @property {Message[]} messages
 * @property {string=} agentId
 * @property {number} lastModified
 */

/**
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} avatar
 * @property {"productivity" | "creative" | "coding" | "lifestyle"} category
 * @property {boolean} installed
 * @property {string} instructions
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} avatar
 */

// AppRoute Enum
export const AppRoute = {
  LANDING: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  E_Verification: "/verification",
  DASHBOARD: "/dashboard",
  SETTINGS: "/dashboard/settings",
  PROFILE: "/dashboard/profile",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password/:token",
  PRIVACY_POLICY: "/privacy-policy",
  TERMS_OF_SERVICE: "/terms",
  COOKIE_POLICY: "/cookie-policy",
  ADMIN_DASHBOARD: "/dashboard/admin",
};

const API = window._env_?.VITE_AISA_BACKEND_API || window._env_?.AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "https://ai-legal-app-backend-743928421487.asia-south1.run.app/api";

const apis = {
  resetPassword: `${API}/auth/reset-password-otp`,
  user: `${API}/user`,
  profile: `${API}/user/profile`,
  getPayments: `${API}/user/payments`,
  notifications: `${API}/notifications`,
  agents: `${API}/agents`,
  buyAgent: `${API}/agents/buy`,
  getUserAgents: `${API}/agents/get_my_agents`,
  getMyAgents: `${API}/agents/me`,
  chatAgent: `${API}/chat`,
  shareEmail: (sessionId) => `${API}/chat/${sessionId}/share/email`,
  support: `${API}/support`,
  resetPasswordEmail: `${API}/auth/reset-password-email`,
  feedback: `${API}/feedback`,
  synthesizeVoice: `${API}/voice/synthesize`,
  synthesizeFile: `${API}/voice/synthesize-file`,
  payment: `${API}/payment`,
  createOrder: `${API}/payment/create-order`,
  verifyPayment: `${API}/payment/verify-payment`,
  getPaymentHistory: `${API}/payment/history`,
  logIn: `${API}/auth/login`,
  signUp: `${API}/auth/signup`,
  googleLogin: `${API}/auth/google`,
  appleLogin: `${API}/auth/apple`,
  microsoftLogin: `${API}/auth/microsoft`,
  syncProfile: `${API}/auth/sync-profile`,
  socialLogin: `${API}/auth/social-login`,
  forgotPassword: `${API}/auth/forgot-password`,
  emailVerificationApi: `${API}/auth/verify-email`,
  resendCode: `${API}/auth/resend-code`,
  ssoGenerate: `${API}/auth/sso/generate`,
  ssoHandoff: `${API}/auth/sso/handoff`,
  subscription: {
    status: `${API}/subscription/status`,
    credits: `${API}/subscription/user-credits`,
    history: `${API}/subscription/credit-history`,
    purchase: `${API}/subscription/purchase-plan`,
    verify: `${API}/subscription/verify-payment`,
  },
  aibase: {
    chat: `${API}/aibase/chat`,
    knowledge: `${API}/aibase/knowledge`,
    documents: `${API}/aibase/knowledge/documents`,
    upload: `${API}/aibase/knowledge/upload`,
    download: (id) => `${API}/aibase/knowledge/download/${id}`,
    delete: (id) => `${API}/aibase/knowledge/${id}`,
  },
  uploadAvatar: `${API}/user/avatar`,
  removeAvatar: `${API}/user/avatar`,
  sessions: `${API}/user/sessions`,
  deleteAccount: `${API}/user`,

  imageProxy: `${API}/image/proxy`,
  precedents: `${API}/precedents`,
  baseUrl: API,
};

export { API, apis };
