import { atom } from "recoil"

const getAvatarUrl = (user) => {
  if (!user || !user.email) return "";
  let baseUrl = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? "http://localhost:8080/api" : (typeof window !== 'undefined' ? `${window.location.origin}/api` : "http://localhost:8080/api"));
  // Remove /api suffix to get the base host for the proxy avatar URL
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }
  const name = user.name || user.email.split('@')[0];
  return `${baseUrl}/api/auth/proxy-avatar?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(name)}`;
};

const processUser = (user) => {
  if (user) {
    // Fallback if no avatar exists or it's the default placeholder
    if (!user.avatar || user.avatar === '/User.jpeg' || user.avatar === '') {
      return { ...user, avatar: getAvatarUrl(user) };
    }
  }
  return user;
};

export const setUserData = (data) => {
  const existing = JSON.parse(localStorage.getItem('user') || '{}');
  const token = data.token || existing.token;

  // Preserve local name if backend returns default "Demo User" (Offline/Fallback mode)
  if (data.name === "Demo User" && existing.name && existing.name !== "Demo User") {
    data.name = existing.name;
  }

  const processedData = processUser(data);
  const finalData = { ...processedData, token };

  // Update primary user
  localStorage.setItem("user", JSON.stringify(finalData));

  // Update account list
  const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
  const existingIndex = accounts.findIndex(a => a.email === finalData.email);
  if (existingIndex > -1) {
    accounts[existingIndex] = finalData;
  } else {
    accounts.push(finalData);
  }
  localStorage.setItem('accounts', JSON.stringify(accounts));
  return finalData;
}
export const getUserData = () => {
  try {
    const item = localStorage.getItem('user');
    if (!item || item === "undefined" || item === "null") return null;
    const data = JSON.parse(item);
    return processUser(data);
  } catch (e) {
    return null;
  }
}
export const getAccounts = () => {
  try {
    const item = localStorage.getItem('accounts');
    if (!item || item === "undefined" || item === "null") return [];
    const data = JSON.parse(item);
    return data.map(processUser);
  } catch (e) {
    return [];
  }
}
export const removeAccount = (email) => {
  const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
  const filtered = accounts.filter(a => a.email !== email);
  localStorage.setItem('accounts', JSON.stringify(filtered));

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (currentUser.email === email) {
    localStorage.removeItem('user');
    if (filtered.length > 0) {
      localStorage.setItem('user', JSON.stringify(filtered[0]));
    }
  }
}
export const clearUser = () => {
  const cookieConsent = localStorage.getItem('aisa_cookie_consent');
  const appTheme = localStorage.getItem('app_theme');
  const appAccent = localStorage.getItem('app_accent');
  const onboardingDone = localStorage.getItem('ai_legal_onboarding_completed');
  
  localStorage.clear();
  
  if (cookieConsent) localStorage.setItem('aisa_cookie_consent', cookieConsent);
  if (appTheme) localStorage.setItem('app_theme', appTheme);
  if (appAccent) localStorage.setItem('app_accent', appAccent);
  if (onboardingDone) localStorage.setItem('ai_legal_onboarding_completed', onboardingDone);
}
export const updateUser = (updates) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const updatedUser = { ...user, ...updates };
  localStorage.setItem('user', JSON.stringify(updatedUser));

  // Also update in accounts list
  const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
  const index = accounts.findIndex(a => a.email === user.email);
  if (index > -1) {
    accounts[index] = { ...accounts[index], ...updates };
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }
  return updatedUser;
}
const getUser = () => {
  try {
    const item = localStorage.getItem('user');
    if (!item || item === "undefined" || item === "null") return null;
    const user = JSON.parse(item);
    if (user) {
      return processUser(user)
    }
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
    localStorage.removeItem('user'); // Clear corrupted data
  }
  return null
}
export const toggleState = atom({
  key: "toggle",
  default: { subscripPgTgl: false, notify: false, sidebarOpen: false, platformSubTgl: false, focusMode: false }
})

export const userData = atom({
  key: 'userData',
  default: { user: getUser() }
})

export const sessionsData = atom({
  key: 'sessionsData',
  default: []
})

export const memoryData = atom({
  key: 'memoryData',
  default: null
})

export const activeProjectIdData = atom({
  key: 'activeProjectIdData',
  default: localStorage.getItem('aisa_active_project_id') || null
})

export const activeModeData = atom({
  key: 'activeModeData',
  default: localStorage.getItem('aisa_active_mode') || 'NORMAL_CHAT'
})

export const activeLegalToolData = atom({
  key: 'activeLegalToolData',
  default: (() => {
    try {
      const saved = localStorage.getItem('aisa_active_legal_tool_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })()
})

export const activeProjectsData = atom({
  key: 'activeProjectsData',
  default: []
})

export const legalViewData = atom({
  key: 'legalViewData',
  default: localStorage.getItem('aisa_legal_view') || 'CHAT'
})

export const selectedRoleState = atom({
  key: 'selectedRoleState',
  default: localStorage.getItem('user_selected_role') || 'advocate',
})

