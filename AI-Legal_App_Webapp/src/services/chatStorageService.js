import axios from "axios";
import { API } from "../types";
import { getUserData } from "../userStore/userData";
import { getDeviceFingerprint } from "../utils/fingerprint";

const API_BASE_URL = API;

// --- IndexedDB for "Unlimited" Storage ---
const DB_NAME = 'AIChatStorage';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

const getDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const idbGet = (key) => new Promise((resolve, reject) => {
  getDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
});

const idbSet = (key, value) => {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
};

const idbDel = (key) => {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
};

const idbGetAllKeys = () => new Promise((resolve, reject) => {
  getDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
});

// Helper for authorized/anonymous requests
const getAuthHeaders = () => {
  const token = getUserData()?.token || localStorage.getItem("token");
  const activeRole = localStorage.getItem("user_selected_role") || "advocate";
  const headers = {
    'X-Device-Fingerprint': getDeviceFingerprint(),
    'X-User-Role': activeRole,
    'X-Workspace-Type': activeRole
  };
  if (token && token !== 'undefined' && token !== 'null') {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// --- Service ---

export const chatStorageService = {

  async getSessions(scope = 'global', queryText = "", caseId = null) {
    try {
      const params = {};
      if (scope === 'global') {
        params.scope = 'global';
      } else if (scope === 'student_tutor') {
        params.scope = 'student_tutor';
      } else if (scope === 'case' || caseId) {
        params.scope = 'case';
        const targetPid = caseId || (scope !== 'case' && scope !== 'all' && scope !== 'global' ? scope : null);
        if (targetPid) params.projectId = targetPid;
      } else if (scope === 'all') {
        params.all = 'true';
      } else if (scope) {
        params.scope = 'case';
        params.projectId = scope;
      }
      if (queryText) params.q = queryText;

      const response = await axios.get(`${API_BASE_URL}/chat`, {
        params,
        headers: getAuthHeaders(),
        withCredentials: true
      });
      const dbSessions = Array.isArray(response.data) ? response.data : [];

      // Requirement: Temporarily combine guestChats + userChats in UI to avoid flicker
      const guestChatsRaw = localStorage.getItem("guestChats");
      if (guestChatsRaw && scope === 'global') {
        try {
          const guestChats = JSON.parse(guestChatsRaw);
          guestChats.forEach(gc => {
            if (!dbSessions.find(s => s.sessionId === gc.sessionId)) {
              dbSessions.push(gc);
            }
          });
        } catch (e) { console.error("[STORAGE] Failed to combine guest chats", e); }
      }

      return dbSessions.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.warn("Backend sessions fetch failed, using local:", error);
      const sessions = [];

      // 1. Check IndexedDB
      const keys = await idbGetAllKeys();
      for (const key of keys) {
        if (key.startsWith("chat_meta_")) {
          const sessionId = key.replace("chat_meta_", "");
          const meta = await idbGet(key) || {};
          sessions.push({
            sessionId,
            title: meta.title || "New Chat",
            lastModified: meta.lastModified || Date.now(),
          });
        }
      }

      // 2. Check localStorage for Guest Chats (Requirement)
      const guestChatsRaw = localStorage.getItem("guestChats");
      if (guestChatsRaw) {
        try {
          const guestChats = JSON.parse(guestChatsRaw);
          guestChats.forEach(gc => {
            // Avoid duplicates with IndexedDB if any
            if (!sessions.find(s => s.sessionId === gc.sessionId)) {
              sessions.push(gc);
            }
          });
        } catch (e) { console.error("Failed to parse guestChats", e); }
      }

      return sessions.sort((a, b) => b.lastModified - a.lastModified);
    }
  },

  async getHistory(sessionId) {
    if (sessionId === "new") return { messages: [] };

    // 1. Try Local First for Instant UI (Requirement: High Performance)
    try {
      const local = await idbGet(`chat_history_${sessionId}`);
      const meta = await idbGet(`chat_meta_${sessionId}`) || {};
      
      // If we have local data, return it immediately to avoid "late load"
      if (local && Array.isArray(local) && local.length > 0) {
        console.log(`[STORAGE] Returning local history for ${sessionId} (Instant Load)`);
        return {
          messages: local,
          projectId: meta.projectId || null,
          title: meta.title || "New Chat",
          detectedMode: meta.detectedMode || 'NORMAL_CHAT',
          activeTool: meta.activeTool || null
        };
      }
    } catch (localErr) {
      console.warn("[STORAGE] Local fetch failed, falling back to network:", localErr);
    }

    // 2. Fallback to Network if no local data
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/${sessionId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      console.log(`[STORAGE] Fetched data for ${sessionId} from network:`, response.data);
      return response.data; // Return full session object
    } catch (error) {
      console.warn("Backend history fetch failed, no local backup either:", error);
      return { messages: [], title: "New Chat", projectId: null, detectedMode: 'NORMAL_CHAT', activeTool: null };
    }
  },

  async saveMessage(sessionId, message, title, projectId = null) {
    // 1. Always save to Local (IndexedDB) for instant UI updates & offline backup
    try {
      const historyKey = `chat_history_${sessionId}`;
      const metaKey = `chat_meta_${sessionId}`;

      const messages = (await idbGet(historyKey)) || [];
      const existingIndex = messages.findIndex(m => m.id === message.id);

      if (existingIndex !== -1) {
        messages[existingIndex] = message; // Update
      } else {
        messages.push(message); // Insert
      }

      await idbSet(historyKey, messages);

      const existingMeta = (await idbGet(metaKey)) || {};
      const meta = {
        title: title || existingMeta.title || "New Chat",
        lastModified: Date.now(),
        projectId: projectId || message.projectId || existingMeta.projectId || null,
        detectedMode: message.mode || existingMeta.detectedMode || 'NORMAL_CHAT',
        activeTool: message.activeTool || existingMeta.activeTool || null
      };
      await idbSet(metaKey, meta);
    } catch (localErr) {
      console.error("Local save failed:", localErr);
    }

    // 2. Sync with Backend
    try {
      const token = getUserData()?.token;
      
      // Requirement: Always maintain a local index of guest chats for merging later
      if (!token) {
        const guestChatsRaw = localStorage.getItem("guestChats") || "[]";
        try {
          let guestChats = JSON.parse(guestChatsRaw);
          const existing = guestChats.find(c => c.sessionId === sessionId);
          if (existing) {
            existing.title = title || existing.title || "New Chat";
            existing.lastModified = Date.now();
          } else {
            guestChats.push({
              sessionId,
              title: title || "New Chat",
              lastModified: Date.now()
            });
          }
          localStorage.setItem("guestChats", JSON.stringify(guestChats));
          console.log("[STORAGE] Guest chat saved to localStorage:", sessionId);
        } catch (e) { console.error("Guest localStorage save failed", e); }
      }

      const activeRole = localStorage.getItem("user_selected_role") || "advocate";
      const finalProjectId = (projectId === 'default' || projectId === 'all') ? null : (projectId || (message.projectId === 'default' ? null : message.projectId));
      const convType = message.conversationType || (activeRole === 'student' ? 'student_tutor' : (finalProjectId ? 'case' : (message.activeTool && message.activeTool !== 'legal_my_case' ? 'tool' : 'global')));
      await axios.post(`${API_BASE_URL}/chat/${sessionId}/message`, { 
        message, 
        title, 
        projectId: finalProjectId,
        conversationType: convType,
        role: activeRole,
        workspaceType: activeRole,
        mode: message.mode,
        activeTool: message.activeTool
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
    } catch (error) {
      console.warn("Backend save failed:", error.response?.data || error.message);
      
      if (error.response?.data?.error === "LIMIT_REACHED") {
        throw error; // Re-throw to handle in UI
      }
    }
  },

  async deleteSession(sessionId) {
    // 1. Remove from local IndexedDB
    try {
      await idbDel(`chat_history_${sessionId}`);
      await idbDel(`chat_meta_${sessionId}`);
    } catch (e) {
      console.warn("IndexedDB delete failed", e);
    }

    // 2. Remove from guestChats in localStorage if guest
    const guestChatsRaw = localStorage.getItem("guestChats");
    if (guestChatsRaw) {
      try {
        let guestChats = JSON.parse(guestChatsRaw);
        guestChats = guestChats.filter(c => c.sessionId !== sessionId);
        localStorage.setItem("guestChats", JSON.stringify(guestChats));
      } catch (e) {
        console.error("Failed to remove deleted chat from guestChats", e);
      }
    }

    // 3. Remove from backend if authenticated
    const token = getUserData()?.token || localStorage.getItem("token");
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        await axios.delete(`${API_BASE_URL}/chat/${sessionId}`, {
          headers: getAuthHeaders(),
          withCredentials: true
        });
      } catch (error) {
        console.error("Backend delete failed", error.message);
      }
    }
  },

  async clearAllSessions(scope = 'global', caseId = null, sessionsList = []) {
    // 1. Remove guestChats from localStorage only if global or all scope
    if (scope === 'global' || scope === 'all') {
      localStorage.removeItem("guestChats");
    }

    // 2. Clear IndexedDB keys for provided sessions in scope
    if (Array.isArray(sessionsList) && sessionsList.length > 0) {
      for (const s of sessionsList) {
        if (s.sessionId) {
          try {
            await idbDel(`chat_history_${s.sessionId}`);
            await idbDel(`chat_meta_${s.sessionId}`);
          } catch (e) {}
        }
      }
    } else if (scope === 'global' || scope === 'all') {
      try {
        const keys = await idbGetAllKeys();
        for (const key of keys) {
          if (key.startsWith("chat_history_") || key.startsWith("chat_meta_")) {
            await idbDel(key);
          }
        }
      } catch (e) {
        console.warn("IndexedDB clear all failed", e);
      }
    }

    // 3. Clear Backend with scope & projectId
    try {
      const activeRole = localStorage.getItem("user_selected_role") || "advocate";
      const params = { role: activeRole };
      if (scope === 'student_tutor' || activeRole === 'student') {
        params.scope = 'student_tutor';
      } else if (scope === 'global') {
        params.scope = 'global';
      } else if (scope === 'case' || caseId) {
        params.scope = 'case';
        const targetPid = caseId || (scope !== 'case' && scope !== 'all' && scope !== 'global' ? scope : null);
        if (targetPid) params.projectId = targetPid;
      }

      await axios.delete(`${API_BASE_URL}/chat/clear-all`, {
        params,
        headers: getAuthHeaders(),
        withCredentials: true
      });
    } catch (error) {
      console.error("Backend clear-all failed, trying session-by-session delete", error.message);
    }

    // Fallback: Delete each session sequentially from API if provided
    if (Array.isArray(sessionsList) && sessionsList.length > 0) {
      for (const s of sessionsList) {
        if (s.sessionId) {
          try {
            await axios.delete(`${API_BASE_URL}/chat/${s.sessionId}`, {
              headers: getAuthHeaders(),
              withCredentials: true
            });
          } catch (e) {}
        }
      }
    }
  },

  async deleteMessage(sessionId, messageId) {
    try {
      await axios.delete(`${API_BASE_URL}/chat/${sessionId}/message/${messageId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
    } catch (e) {
      console.warn("Backend delete failed, converting to local update");
    }

    const historyKey = `chat_history_${sessionId}`;
    const messages = (await idbGet(historyKey)) || [];
    const filtered = messages.filter(m => m.id !== messageId);
    await idbSet(historyKey, filtered);
  },

  async truncateMessagesAfter(sessionId, messageId) {
    // 1. Update Local (IndexedDB)
    try {
      const historyKey = `chat_history_${sessionId}`;
      const messages = (await idbGet(historyKey)) || [];
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        // Keep messages up to the edited one
        const truncated = messages.slice(0, index + 1);
        await idbSet(historyKey, truncated);
      }
    } catch (localErr) {
      console.error("Local truncate failed:", localErr);
    }

    // 2. Sync with Backend
    try {
      await axios.post(`${API_BASE_URL}/chat/${sessionId}/truncate/${messageId}`, {}, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
    } catch (error) {
      console.warn("Backend truncate failed:", error.response?.data || error.message);
    }
  },

  async updateMessage(sessionId, updatedMsg, projectId = null) {
    // 1. Update Local (IndexedDB)
    try {
      const historyKey = `chat_history_${sessionId}`;
      const messages = (await idbGet(historyKey)) || [];
      const index = messages.findIndex(m => m.id === updatedMsg.id);
      if (index !== -1) {
        messages[index] = updatedMsg;
        await idbSet(historyKey, messages);
      }
    } catch (localErr) {
      console.error("Local message update failed:", localErr);
    }

    // 2. Sync with Backend (using the same upsert endpoint)
    try {
      const finalProjectId = (projectId === 'default' || projectId === 'all') ? null : (projectId || (updatedMsg.projectId === 'default' ? null : updatedMsg.projectId));
      await axios.post(`${API_BASE_URL}/chat/${sessionId}/message`, { 
        message: updatedMsg, 
        projectId: finalProjectId,
        mode: updatedMsg.mode,
        activeTool: updatedMsg.activeTool
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
    } catch (error) {
      console.warn("Backend message update failed:", error.response?.data || error.message);
    }
  },

  async createSession() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  async updateSessionTitle(sessionId, title) {
    // 1. Update Local (IndexedDB)
    try {
      const metaKey = `chat_meta_${sessionId}`;
      const existingMeta = (await idbGet(metaKey)) || {};
      const meta = {
        ...existingMeta,
        title: title,
        lastModified: Date.now(),
      };
      await idbSet(metaKey, meta);
    } catch (localErr) {
      console.error("Local title update failed:", localErr);
    }

    // 2. Update Guest Chats in localStorage if not authenticated
    const token = getUserData()?.token || localStorage.getItem("token");
    if (!token || token === 'undefined' || token === 'null') {
      const guestChatsRaw = localStorage.getItem("guestChats") || "[]";
      try {
        let guestChats = JSON.parse(guestChatsRaw);
        const existing = guestChats.find(c => c.sessionId === sessionId);
        if (existing) {
          existing.title = title;
          existing.lastModified = Date.now();
        } else {
          guestChats.push({
            sessionId,
            title,
            lastModified: Date.now()
          });
        }
        localStorage.setItem("guestChats", JSON.stringify(guestChats));
      } catch (e) {
        console.error("Guest localStorage title update failed", e);
      }
      return true;
    }

    // 3. Update Backend for authenticated users
    try {
      await axios.patch(`${API_BASE_URL}/chat/${sessionId}/title`, { title }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      return true;
    } catch (error) {
      console.error("Backend title update failed:", error.response?.data || error.message);
      return false;
    }
  },

  async generateSessionTitle(sessionId, message) {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat/${sessionId}/generate-title`, { message }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      return response.data.title;
    } catch (error) {
       console.error("Concurrent title generation failed:", error);
       return null;
    }
  },

  async shareSession(sessionId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat/${sessionId}/share`, {}, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      return response.data; // { success: true, shareId: '...' }
    } catch (error) {
      console.error("Failed to share session:", error);
      throw error;
    }
  },

  async getSharedSession(shareId) {
    try {
      // Note: Backend is now configured to handle /api/public/share/:shareId
      const response = await axios.get(`${API_BASE_URL}/public/share/${shareId}`);
      return response.data; // { title, messages, lastModified, detectedMode }
    } catch (error) {
      console.error("Failed to fetch shared session:", error);
      throw error;
    }
  },

  async duplicateSharedSession(shareId, userId = null) {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat/duplicate`, { shareId, userId });
      return response.data; // { success, sessionId }
    } catch (error) {
      console.error("Failed to duplicate shared session:", error);
      throw error;
    }
  },

  async mergeGuestChats() {
    console.log("[MERGE-FLOW] Initiating guest-to-user chat merge...");
    const guestChatsRaw = localStorage.getItem("guestChats");
    if (!guestChatsRaw) {
      console.log("[MERGE-FLOW] No guest chats found in localStorage.");
      return;
    }

    try {
      const guestChats = JSON.parse(guestChatsRaw);
      if (guestChats.length === 0) {
        console.log("[MERGE-FLOW] Guest chats array is empty.");
        return;
      }

      const guestChatIds = guestChats.map(c => c.sessionId);
      console.log(`[MERGE-FLOW] Found ${guestChatIds.length} sessions to merge:`, guestChatIds);
      
      const response = await axios.post(`${API_BASE_URL}/chat/merge-chats`, { guestChatIds }, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        console.log(`[MERGE-FLOW] Successfully merged ${response.data.mergedCount} chats on backend.`);
        // Requirement: Clear guestChats from localStorage ONLY after successful merge
        localStorage.removeItem("guestChats");
        console.log("[MERGE-FLOW] guestChats cleared from localStorage.");
        
        // Trigger a global event to notify UI to refetch
        window.dispatchEvent(new Event('chat-merge-complete'));
        return true;
      } else {
        console.warn("[MERGE-FLOW] Backend merge returned success:false", response.data);
      }
    } catch (e) {
      console.error("[MERGE-FLOW] Error during merge process:", e.response?.data || e.message);
    }
    return false;
  }
};

