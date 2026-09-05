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
  MOBILE_APP: "/dashboard/mobile-app",
};

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }
    if (window._env_?.VITE_AISA_BACKEND_API || window._env_?.AISA_BACKEND_API) {
      return window._env_?.VITE_AISA_BACKEND_API || window._env_?.AISA_BACKEND_API;
    }
    if (import.meta.env.VITE_AISA_BACKEND_API) {
      return import.meta.env.VITE_AISA_BACKEND_API;
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:8080/api';
};

export const getUnifiedApiBaseUrl = () => {
  const envUrl = window._env_?.VITE_UNIFIED_BACKEND_API || import.meta.env.VITE_UNIFIED_BACKEND_API;

  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.trim().replace(/\/+$/, '');
      }
      return 'https://unified-dashboard-977864306871.asia-south1.run.app/api';
    }
  }

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:8000/api';
};

const API = getApiUrl();
const UNIFIED_API = getUnifiedApiBaseUrl();

const apis = {
  unifiedAuth: {
    register: `${UNIFIED_API}/auth/register`,
    login: `${UNIFIED_API}/auth/login`,
  },
  uwoLogin: `${API}/auth/sso/uwo-login`,
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
  appUpdateConfig: `${API}/app-update/config`,
  baseUrl: API,
};

export const appendLanguagePromptModifier = (message, language) => {
  if (!language || language === 'English') return message;
  
  if (language === 'Bilingual') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Bilingual style (English + Hindi). Use English for headings, titles, and structural labels. Use Hindi for descriptions, explanations, and subtitles. Where appropriate, write in English with key sentences explained in Hindi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  }
  
  if (language.startsWith('Bilingual (English + ') || language.startsWith('English + ')) {
    const targetLang = language.replace('Bilingual (English + ', '').replace('English + ', '').replace(')', '');
    return `${message}\n\n[INSTRUCTION: Please generate the response in Bilingual style (English + ${targetLang}). Use English for headings, titles, and structural labels. Use ${targetLang} for descriptions, explanations, and subtitles. Where appropriate, write in English with key sentences explained in ${targetLang}. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  }
  
  return `${message}\n\n[INSTRUCTION: Please generate the response in ${language}. All analysis, descriptions, and headings must be in ${language}. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
};

export { API, apis };

