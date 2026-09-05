// Generic API service for Dashboard, Automations, Agents, Admin, and Auth
import axios from "axios";
import { API } from "../types.js";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 180 second timeout for complex AI/multi-doc processing
});

const getLocaleForLanguage = (language) => {
  const mapping = {
    'English': 'en-IN',
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN',
    'Telugu': 'te-IN',
    'Marathi': 'mr-IN',
    'Tamil': 'ta-IN',
    'Gujarati': 'gu-IN',
    'Kannada': 'kn-IN',
    'Malayalam': 'ml-IN',
    'Punjabi': 'pa-IN',
    'Odia': 'or-IN',
    'Assamese': 'as-IN',
    'Urdu': 'ur-IN',
    'Sanskrit': 'sa-IN',
    'Konkani': 'gom-IN',
    'Maithili': 'mai-IN',
    'Dogri': 'doi-IN',
    'Nepali': 'ne-IN',
    'Bodo': 'brx-IN',
    'Santali': 'sat-IN',
    'Manipuri': 'mni-IN',
    'Kashmiri': 'ks-IN',
    'Sindhi': 'sd-IN',
    // Bilingual Modes
    'Bilingual': 'hi-IN', // English + Hindi
    'English + Marathi': 'mr-IN',
    'English + Tamil': 'ta-IN',
    'English + Telugu': 'te-IN',
    'English + Bengali': 'bn-IN',
    'English + Gujarati': 'gu-IN',
    'English + Kannada': 'kn-IN',
    'English + Malayalam': 'ml-IN',
    'English + Punjabi': 'pa-IN'
  };
  return mapping[language] || 'en-IN';
};

// Request interceptor for adding auth token and language parameters
apiClient.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    let userLang = 'English';
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
        }
        userLang = userData.personalizations?.general?.language || localStorage.getItem('ai_legal_lang') || 'English';
      } catch (e) {
        userLang = localStorage.getItem('ai_legal_lang') || 'English';
      }
    } else {
      userLang = localStorage.getItem('ai_legal_lang') || 'English';
    }

    const userLocale = getLocaleForLanguage(userLang);
    const activeRole = localStorage.getItem('user_selected_role') || 'advocate';
    const activeWsId = activeRole === 'law_firm' ? (localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'personal_practice') : 'personal_practice';

    config.baseURL = API;

    const deviceId = localStorage.getItem('aisa_device_id') || 'web_client';
    config.headers['X-User-Role'] = activeRole;
    config.headers['X-Workspace-Type'] = activeRole;
    config.headers['X-Active-Workspace-Id'] = activeWsId;
    config.headers['X-Device-Id'] = deviceId;

    const isGet = (config.method || '').toLowerCase() === 'get';

    if (isGet) {
      config.params = {
        role: activeRole,
        workspaceType: activeRole,
        workspaceId: activeWsId,
        ...(config.params || {}),
      };
    } else if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data.preferred_response_language = userLang;
      config.data.language = userLang;
      config.data.locale = userLocale;
      if (!config.data.role) config.data.role = activeRole;
      if (!config.data.workspaceType) config.data.workspaceType = activeRole;
      if (!config.data.workspaceId) config.data.workspaceId = activeWsId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Apply interceptors to global axios as well
axios.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    let userLang = 'English';
    if (user) {
      try {
        const userData = JSON.parse(user);
        userLang = userData.personalizations?.general?.language || localStorage.getItem('ai_legal_lang') || 'English';
      } catch (e) {
        userLang = localStorage.getItem('ai_legal_lang') || 'English';
      }
    } else {
      userLang = localStorage.getItem('ai_legal_lang') || 'English';
    }

    const userLocale = getLocaleForLanguage(userLang);

    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data.preferred_response_language = userLang;
      config.data.language = userLang;
      config.data.locale = userLocale;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isRevoked = error.response?.data?.code === 'SESSION_REVOKED';
      // Clear user data and redirect to login on unauthorized
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        if (isRevoked) {
          sessionStorage.setItem('aisa_revoked_toast', 'Your session was signed out because the account was logged in from another device.');
        }
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 403 && error.response?.data?.code === 'OUT_OF_CREDITS') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.credits = error.response.data.available || 0;
      localStorage.setItem('user', JSON.stringify(user));

      window.dispatchEvent(new CustomEvent('out_of_credits'));
    }

    if (error.response?.status === 403 && (error.response?.data?.code === 'PREMIUM_ONLY' || error.response?.data?.code === 'PLAN_RESTRICTED' || error.response?.data?.code === 'CALENDAR_LIMIT_REACHED' || error.response?.data?.code === 'UPGRADE_REQUIRED')) {
      const code = error.response?.data?.code;
      const backendMessage = error.response?.data?.message || error.response?.data?.error;
      
      let toolName = 'AI Ads Agent (Visual Render)';
      if (code === 'CALENDAR_LIMIT_REACHED') toolName = 'AI Ads Agent (Unlimited Strategy)';
      else if (code === 'UPGRADE_REQUIRED') toolName = 'AI Ads Agent (Unlimited Scraping)';
      else if (backendMessage?.includes('extraction') || backendMessage?.includes('scrape')) toolName = 'AI Ads Agent (AI Fetch)';

      window.dispatchEvent(new CustomEvent('premium_required', { 
        detail: { 
          toolName,
          customMessage: backendMessage || 'This feature requires a paid plan. Please upgrade to continue.'
        } 
      }));
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // --- AI Tools ---
  async generateImage(prompt, aspectRatio = '1:1', modelId = 'imagen-3.0-generate-001') {
    try {
      console.log("[Frontend] Generating image for prompt:", prompt, "Ratio:", aspectRatio, "Model:", modelId);
      // Increased timeout to 60s for image generation
      const response = await apiClient.post('/image/generate', { prompt, aspectRatio, modelId }, { timeout: 180000 });
      console.log("[Frontend] Image generation success:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to generate image:", error);
      if (error.response) {
        console.error("Error Status:", error.response.status);
        console.error("Error Data:", error.response.data);
      }
      throw error;
    }
  },

  async editImage(prompt, imageFileOrBlob = null) {
    try {
      console.log("[Frontend] Editing image for prompt:", prompt);
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (imageFileOrBlob) {
        // Appending the blob payload to send via FormData
        formData.append('image', imageFileOrBlob);
      }
      const response = await apiClient.post('/edit-image', formData, {
        timeout: 90000 
      });
      console.log("[Frontend] Image editing success:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to edit image:", error);
      throw error;
    }
  },

  // --- AI Social Agent (Phase 1) ---
  async getSocialAgentWorkspace(userId) {
    try {
      const response = await apiClient.get(`/social-agent/workspace/${userId || 'current'}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch social agent workspace:", error);
      return { success: false };
    }
  },

  async getSocialAgentWorkspaces() {
    try {
      const response = await apiClient.get('/social-agent/workspaces/all');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch all workspaces:", error);
      return { success: false, workspaces: [] };
    }
  },

  async generateFromCalendar(workspaceId, calendarRowId) {
    try {
      const response = await apiClient.post(`/social-agent/content/generate/${calendarRowId}`, { workspaceId });
      return response.data;
    } catch (error) {
      console.error("Failed to generate from calendar:", error);
      throw error;
    }
  },

  async createSocialAgentWorkspace(data) {
    try {
      const response = await apiClient.post('/social-agent/workspace', data);
      return response.data;
    } catch (error) {
      console.error("Failed to create social agent workspace:", error);
      throw error;
    }
  },

  async deleteSocialAgentWorkspace(workspaceId) {
    try {
      const response = await apiClient.delete(`/social-agent/workspace/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      throw error;
    }
  },


  async uploadSocialAgentBrand(formData) {
    try {
      const response = await apiClient.post('/social-agent/brand/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to upload brand assets:", error);
      throw error;
    }
  },

  async fetchBrandAssets(url, workspaceId) {
    try {
      const response = await apiClient.post('/brand/fetch', { url, workspaceId });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Brand fetch failed';
      const code = error.response?.data?.code || '';
      const err = new Error(msg);
      err.code = code;
      throw err;
    }
  },

  async quickAnalysis(files, workspaceId = null) {
    try {
      const formData = new FormData();
      // 'files' because backend now uses upload.array('files', 5)
      if (Array.isArray(files)) {
        files.forEach(file => formData.append('files', file));
      } else {
        formData.append('files', files);
      }
      
      if (workspaceId) formData.append('workspaceId', workspaceId);

      const response = await apiClient.post('/brand/quick-analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error("Quick Analysis failed:", error);
      return { success: false };
    }
  },


  async getSocialAgentBrand(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/brand/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch brand profile:", error);
      return { success: false };
    }
  },

  async uploadSocialAgentCalendar(formData) {
    try {
      const response = await apiClient.post('/social-agent/calendar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to upload content calendar:", error);
      throw error;
    }
  },

  async getSocialAgentCalendar(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/calendar/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch calendar entries:", error);
      return { success: false, entries: [] };
    }
  },

  async getSocialAgentUsage(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/usage/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch plan usage:", error);
      return { success: false };
    }
  },

  async getSocialAgentCalendarBrands() {
    try {
      const response = await apiClient.get('/social-agent/calendar/brands');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch calendar brands:", error);
      return { success: false, brands: [] };
    }
  },

  async getSocialAgentPipelines(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/calendar/pipelines/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch pipelines:", error);
      return { success: false, pipelines: [] };
    }
  },

  async getSocialAgentPipelineRows(calendarId) {
    try {
      const response = await apiClient.get(`/social-agent/calendar/pipeline-rows/${calendarId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch pipeline rows:", error);
      return { success: false, rows: [] };
    }
  },

  // --- AI Social Agent (Phase 2 & 3) ---
  async completeSocialOnboarding(data) {
    try {
      const response = await apiClient.patch('/social-agent/finish-onboarding', data);
      return response.data;
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      throw error;
    }
  },

  async syncSocialProfile() {
    try {
      const response = await apiClient.get('/auth/sync-profile');
      return response.data;
    } catch (error) {
      console.error("Failed to sync profile:", error);
      throw error;
    }
  },

  async triggerSocialAgentGeneration(data) {
    try {
      const response = await apiClient.post('/social-agent/generate', data);
      return response.data;
    } catch (error) {
      console.error("Failed to trigger generation:", error);
      throw error;
    }
  },

  async getSocialAgentJobStatus(jobId) {
    try {
      const response = await apiClient.get(`/social-agent/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch job status:", error);
      return { success: false, status: error.response?.status };
    }
  },

  async cancelSocialAgentJob(jobId) {
    try {
      const response = await apiClient.delete(`/social-agent/jobs/${jobId}/cancel`);
      console.log(`[API] Job ${jobId} cancelled on backend:`, response.data);
      return response.data;
    } catch (error) {
      console.warn(`[API] cancelSocialAgentJob failed for ${jobId}:`, error.message);
      return { success: false };
    }
  },

  /**
   * AI Ads Agent — Visual Post Generation Pipeline
   * GPT-4 Prompt Engineering → Vertex AI Imagen 3/4 → GCS → Asset
   * Returns { jobId } immediately; poll getSocialAgentJobStatus for result.
   */
  async generateVisualPost(workspaceId, calendarEntryId, modelId = 'imagen-3.0-generate-001', postFormat = 'single', aspectRatio = '1:1', carouselCount = 3) {
    try {
      const response = await apiClient.post('/social-agent/generate/visual-post', {
        workspaceId,
        calendarEntryId,
        modelId,
        postFormat, // 'single' | 'carousel'
        aspectRatio, // '1:1' | '4:3' | '16:9' | '9:16'
        carouselCount
      }, { timeout: 180000 }); // 3-min timeout — pipeline can take up to 90s
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Visual post generation failed';
      console.error('[API] generateVisualPost failed:', msg);
      throw new Error(msg);
    }
  },

  async getSocialHashtagInsights(workspaceId, topic) {
    try {
      const response = await apiClient.post('/social-agent/hashtag-insights', { workspaceId, topic });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch hashtag insights:", error);
      throw error;
    }
  },

  async getSocialAgentPosts(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/posts/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      return { success: false, posts: [] };
    }
  },

  async getSocialPostDetail(postId) {
    try {
      const response = await apiClient.get(`/social-agent/posts/detail/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch post detail:", error);
      return { success: false };
    }
  },

  async getSocialAgentAssets(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent/assets/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch assets library:", error);
      return { success: false, assets: [] };
    }
  },

  async deleteAllBrandAssets(workspaceId) {
    try {
      const response = await apiClient.delete(`/social-agent/assets/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete all brand assets:", error);
      return { success: false, error: error.message };
    }
  },

  async generateSocialAgentOneOffAsset(data) {
    try {
      const response = await apiClient.post('/social-agent/assets/generate', data);
      return response.data;
    } catch (error) {
      console.error("Failed to generate one-off asset:", error);
      throw error;
    }
  },

  async regenerateSocialAgentPost(data) {
    try {
      const response = await apiClient.post('/social-agent/generate/regenerate', data);
      return response.data;
    } catch (error) {
      console.error("Failed to regenerate post:", error);
      throw error;
    }
  },

  async deleteSocialAgentPost(postId) {
    try {
      const response = await apiClient.delete(`/social-agent/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete post:", error);
      throw error;
    }
  },


  // Phase 3: Review & Schedule
  async submitPostForReview(postId, data) {
    try {
      const response = await apiClient.patch(`/social-agent-review/posts/${postId}/send-for-review`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to submit for review:", error);
      throw error;
    }
  },

  async approveSocialPost(postId, data) {
    try {
      const response = await apiClient.patch(`/social-agent-review/posts/${postId}/approve`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to approve post:", error);
      throw error;
    }
  },

  async rejectSocialPost(postId, data) {
    try {
      const response = await apiClient.patch(`/social-agent-review/posts/${postId}/reject`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to reject post:", error);
      throw error;
    }
  },

  async addSocialPostComment(postId, data) {
    try {
      const response = await apiClient.post(`/social-agent-review/posts/${postId}/comment`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  },

  async getSocialPostHistory(postId) {
    try {
      const response = await apiClient.get(`/social-agent-review/posts/${postId}/history`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch history:", error);
      return { success: false, actions: [], comments: [] };
    }
  },

  async scheduleSocialPost(postId, data) {
    try {
      const response = await apiClient.patch(`/social-agent-review/posts/${postId}/schedule`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to schedule post:", error);
      throw error;
    }
  },

  async getSocialReviewQueue(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent-review/review-queue/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch review queue:", error);
      return { success: false, posts: [] };
    }
  },

  async getSocialSchedule(workspaceId) {
    try {
      const response = await apiClient.get(`/social-agent-review/schedule/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
      return { success: false, items: [] };
    }
  },

  // --- Auth ---
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.warn('Backend login failed, falling back to mock auth for demo:', error.message);

      // Mock fallback for demo purposes
      if (credentials.email && credentials.password) {
        return {
          id: 'demo-user-123',
          name: 'Demo User',
          email: credentials.email,
          avatar: ''
        };
      }
      throw new Error(error.response?.data?.error || error.message || 'Failed to connect to server');
    }
  },

  async signup(userData) {
    try {
      const response = await apiClient.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      console.warn('Backend signup failed, falling back to mock auth for demo:', error.message);

      // Mock fallback for demo purposes
      return {
        id: 'demo-user-' + Date.now(),
        name: userData.name,
        email: userData.email,
        avatar: ''
      };
    }
  },

  // --- Dashboard Stats ---
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      // Mock fallback
      return {
        totalChats: 24,
        activeAgents: 6,
        tokensUsed: 450230,
        savedTime: '18h 45m'
      };
    }
  },

  async getAdminOverviewStats() {
    try {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.warn('Backend admin stats failed, falling back to mock:', error.message);
      const agents = JSON.parse(localStorage.getItem('mock_agents') || '[]');
      return {
        totalUsers: 0,
        activeAgents: agents.length,
        pendingApprovals: 0,
        totalRevenue: 0,
        openComplaints: 0,
        recentActivity: [],
        inventory: agents.map(a => ({
          ...a,
          id: a._id,
          name: a.name || a.agentName,
          pricing: a.pricing || 'Free',
          status: a.status || 'Active'
        }))
      };
    }
  },

  // --- Agents ---
  async getCreatedAgents() {
    try {
      const response = await apiClient.get('/agents/created-by-me');
      return response.data;
    } catch (error) {
      // Mock fallback: Return all local mock agents (assuming I am the owner in demo)
      const stored = localStorage.getItem('mock_agents');
      if (stored) return JSON.parse(stored);
      return [];
    }
  },

  async getAgents() {
    try {
      const response = await apiClient.get('/agents');
      return response.data;
    } catch (error) {
      const stored = localStorage.getItem('mock_agents');
      if (stored) return JSON.parse(stored);

      const defaults = [
        { _id: '683d38ce-1', name: 'AIFLOW', description: 'Streamline your AI workflows.', pricing: 'Free', status: 'Inactive' },
        { _id: '683d38ce-2', name: 'AIMARKET', description: 'AI-driven marketplace insights.', pricing: 'Free', status: 'Inactive' },
        { _id: '683d38ce-3', name: 'AICONNECT', description: 'Connect all your AI tools.', pricing: 'Free', status: 'Inactive' },
        { _id: '693d38ce-4', name: 'AIMUSIC', description: 'AI-powered music generation.', pricing: 'Free', status: 'Inactive' },
        { _id: '693d38ce-5', name: 'AITRANS', description: 'Advanced AI translation services.', pricing: 'Free', status: 'Inactive' },
        { _id: '683d38ce-6', name: 'AISCRIPT', description: 'AI script writing and automation.', pricing: 'Free', status: 'Inactive' }
      ];

      localStorage.setItem('mock_agents', JSON.stringify(defaults));
      return defaults;
    }
  },

  async createAgent(agentData) {
    try {
      const response = await apiClient.post('/agents', agentData);
      return response.data;
    } catch (error) {
      const stored = JSON.parse(localStorage.getItem('mock_agents') || '[]');
      const newAgent = { ...agentData, _id: Date.now().toString() };
      stored.push(newAgent);
      localStorage.setItem('mock_agents', JSON.stringify(stored));
      return newAgent;
    }
  },

  async updateAgent(id, updates) {
    try {
      const response = await apiClient.put(`/agents/${id}`, updates);
      return response.data;
    } catch (error) {
      const stored = JSON.parse(localStorage.getItem('mock_agents') || '[]');
      const index = stored.findIndex(a => a._id === id);

      if (index !== -1) {
        stored[index] = { ...stored[index], ...updates };
        localStorage.setItem('mock_agents', JSON.stringify(stored));
        return stored[index];
      }
      return null;
    }
  },

  async deleteAgent(id) {
    try {
      await apiClient.delete(`/agents/${id}`);
      return true;
    } catch (error) {
      const stored = JSON.parse(localStorage.getItem('mock_agents') || '[]');
      const filtered = stored.filter(a => a._id !== id);
      localStorage.setItem('mock_agents', JSON.stringify(filtered));
      return true;
    }
  },

  // --- Review Workflow ---
  async submitForReview(id) {
    try {
      const response = await apiClient.post(`/agents/submit-review/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to submit review:", error);
      throw error;
    }
  },

  async approveAgent(id, message) {
    try {
      const response = await apiClient.post(`/agents/approve/${id}`, { message });
      return response.data;
    } catch (error) {
      console.error("Failed to approve agent:", error);
      throw error;
    }
  },

  async rejectAgent(id, reason) {
    try {
      const response = await apiClient.post(`/agents/reject/${id}`, { reason });
      return response.data;
    } catch (error) {
      console.error("Failed to reject agent:", error);
      throw error;
    }
  },

  async getVendorRevenue() {
    try {
      const response = await apiClient.get('/revenue/vendor');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch vendor revenue:", error);
      throw error;
    }
  },

  async getAdminRevenueStats() {
    try {
      const response = await apiClient.get('/revenue/admin');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch admin revenue:", error);
      // Fallback or rethrow
      return {
        overview: { totalGross: 0, totalVendorPayouts: 0, totalPlatformNet: 0 },
        appPerformance: []
      };
    }
  },

  async getVendorTransactions() {
    try {
      const response = await apiClient.get('/revenue/transactions');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch vendor transactions:", error);
      throw error;
    }
  },

  async getAdminTransactions() {
    try {
      const response = await apiClient.get('/revenue/admin/transactions');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch admin transactions:", error);
      return []; // Return empty array on error
    }
  },

  async downloadInvoice(transactionId) {
    try {
      const response = await apiClient.get(`/revenue/invoice/${transactionId}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${transactionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Failed to download invoice:", error);
      throw error;
    }
  },

  // --- Notifications ---
  async getNotifications() {
    try {
      const response = await apiClient.get('/notifications');
      return response.data;
    } catch (error) {
      console.warn("Using mock notifications");
      return [];
    }
  },

  async markNotificationRead(id) {
    try {
      const response = await apiClient.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  },

  // --- Automations ---
  async getAutomations() {
    try {
      const response = await apiClient.get('/automations');
      return response.data;
    } catch (error) {
      const stored = localStorage.getItem('mock_automations');
      if (stored) return JSON.parse(stored);

      const defaults = [
        { id: '1', name: 'Daily Digest', description: 'Summarize unread emails at 9 AM', active: true, type: 'Email' },
        { id: '2', name: 'Lead Qualifier', description: 'Score incoming leads from CRM', active: false, type: 'CRM' },
        { id: '3', name: 'Code Reviewer', description: 'Auto-review PRs on GitHub', active: true, type: 'Dev' },
        { id: '4', name: 'Meeting Notes', description: 'Transcribe and summarize Zoom calls', active: true, type: 'Productivity' }
      ];

      localStorage.setItem('mock_automations', JSON.stringify(defaults));
      return defaults;
    }
  },

  async toggleAutomation(id) {
    try {
      const response = await apiClient.post(`/automations/${id}/toggle`);
      return response.data;
    } catch (error) {
      const stored = JSON.parse(localStorage.getItem('mock_automations') || '[]');

      const updated = stored.map(a =>
        a.id === id ? { ...a, active: !a.active } : a
      );

      localStorage.setItem('mock_automations', JSON.stringify(updated));

      return updated.find(a => a.id === id);
    }
  },

  // --- Admin ---
  async getAdminSettings() {
    try {
      const response = await apiClient.get('/admin/settings');
      return response.data;
    } catch (error) {
      const stored = localStorage.getItem('mock_admin_settings');
      if (stored) return JSON.parse(stored);

      return {
        allowPublicSignup: true,
        defaultModel: 'gemini-2.5-flash',
        maxTokensPerUser: 500000,
        organizationName: 'ACME Corp'
      };
    }
  },

  async updateAdminSettings(settings) {
    try {
      const response = await apiClient.post('/admin/settings', settings);
      return response.data;
    } catch (error) {
      localStorage.setItem('mock_admin_settings', JSON.stringify(settings));
      return settings;
    }
  },

  async adjustCredits(payload) {
    try {
      const response = await apiClient.post('/admin/adjust-credits', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to adjust credits:", error);
      throw error;
    }
  },

  async manualPlanUpgrade(payload) {
    try {
      const response = await apiClient.post('/admin/manual-upgrade', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to upgrade plan:", error);
      throw error;
    }
  },

  async getAllUsers() {
    try {
      const response = await apiClient.get('/user/all');
      return response.data;
    } catch (error) {
      console.warn('Backend get users failed, falling back to mock:', error.message);
      // Mock fallback
      return [
        { id: '1', name: 'Mock User 1', email: 'user1@example.com', role: 'user', status: 'Active', agents: [], spent: 120 },
        { id: '2', name: 'Mock User 2', email: 'user2@example.com', role: 'user', status: 'Active', agents: [], spent: 250 }
      ];
    }
  },

  async toggleBlockUser(id, isBlocked) {
    try {
      const response = await apiClient.put(`/user/${id}/block`, { isBlocked });
      return response.data;
    } catch (error) {
      console.error("Failed to block/unblock user:", error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      await apiClient.delete(`/user/${id}`);
      return true;
    } catch (error) {
      console.error("Failed to delete user:", error);
      throw error;
    }
  },

  // --- Reports ---
  async submitReport(reportData) {
    try {
      const response = await apiClient.post('/reports/submit', reportData);
      return response.data;
    } catch (error) {
      console.warn("Backend report submission failed, using mock:", error.message);
      // Mock successful response for demo
      return { success: true, message: "Report submitted successfully (mock)" };
    }
  },

  async getReports() {
    try {
      const response = await apiClient.get('/reports');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      return [];
    }
  },

  // --- Packages ---
  async getPackages() {
    try {
      const response = await apiClient.get('/pricing/packages');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch packages:", error);
      throw error;
    }
  },

  async createPackage(data) {
    try {
      const response = await apiClient.post('/admin/packages', data);
      return response.data;
    } catch (error) {
      console.error("Failed to create package:", error);
      throw error;
    }
  },

  async updatePackage(id, data) {
    try {
      const response = await apiClient.put(`/admin/packages/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update package:", error);
      throw error;
    }
  },

  async deletePackage(id) {
    try {
      const response = await apiClient.delete(`/admin/packages/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete package:", error);
      throw error;
    }
  },

  // --- Plans ---
  async getAdminPlans() {
    try {
      const response = await apiClient.get('/admin/plans');
      return response.data;
    } catch (error) {
      // Fallback to public plans endpoint if admin route fails
      const response = await apiClient.get('/pricing/plans');
      return response.data;
    }
  },

  async getPlans() {
    try {
      const response = await apiClient.get('/pricing/plans');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      throw error;
    }
  },

  async getPublicFeatureCosts() {
    try {
      const response = await apiClient.get('/pricing/feature-costs');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch public feature costs:", error);
      return { success: false, features: [] };
    }
  },

  async createPlan(data) {
    try {
      const response = await apiClient.post('/admin/plans', data);
      return response.data;
    } catch (error) {
      console.error("Failed to create plan:", error);
      throw error;
    }
  },

  async updatePlan(id, data) {
    try {
      const response = await apiClient.put(`/admin/plans/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update plan:", error);
      throw error;
    }
  },

  async deletePlan(id) {
    try {
      const response = await apiClient.delete(`/admin/plans/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete plan:", error);
      throw error;
    }
  },

  // --- Legal ---
  async getLegalPage(pageType) {
    try {
      const response = await apiClient.get(`/legal/${pageType}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch ${pageType}:`, error);
      return null;
    }
  },

  async updateLegalPage(pageType, sections) {
    try {
      const response = await apiClient.put(`/legal/${pageType}`, { sections });
      return response.data;
    } catch (error) {
      console.error(`Failed to update ${pageType}:`, error);
      throw error;
    }
  },

  async parseLegalDoc(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/admin/parse-legal-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to parse document:", error);
      throw error;
    }
  },

  async resolveReport(id, status, resolutionNote) {
    try {
      const response = await apiClient.put(`/reports/${id}/resolve`, { status, resolutionNote });
      return response.data;
    } catch (error) {
      console.error("Failed to resolve report:", error);
      throw error;
    }
  },

  async replyToVendorTicket(ticketId, message) {
    try {
      const response = await apiClient.post(`/reports/${ticketId}/reply`, { message });
      return response.data;
    } catch (error) {
      console.error("Failed to send reply:", error);
      throw error;
    }
  },



  // --- AIBASE & Knowledge ---
  async getKnowledgeDocuments() {
    try {
      const response = await apiClient.get('aibase/knowledge/documents');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch knowledge documents:", error);
      throw error;
    }
  },

  async uploadKnowledgeDocument(formData, onProgress) {
    try {
      const response = await apiClient.post('aibase/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to upload knowledge document:", error);
      throw error;
    }
  },

  async uploadKnowledgeUrl(payload) {
    try {
      const response = await apiClient.post('aibase/knowledge/upload-url', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to upload knowledge URL:", error);
      throw error;
    }
  },

  async getKnowledgeList() {
    try {
      const response = await apiClient.get('aibase/knowledge/list');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch knowledge list:", error);
      throw error;
    }
  },

  async reindexDocument(id) {
    try {
      const response = await apiClient.post(`aibase/knowledge/reindex/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to reindex document:", error);
      throw error;
    }
  },

  // --- Knowledge Source (Website Crawler) Management ---
  async getKnowledgeSources() {
    try {
      const response = await apiClient.get('aibase/knowledge/sources');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch knowledge sources:", error);
      throw error;
    }
  },

  async recrawlSource(payload) {
    try {
      const path = payload.id ? `aibase/knowledge/recrawl/${payload.id}` : 'aibase/knowledge/recrawl';
      const response = await apiClient.post(path, payload);
      return response.data;
    } catch (error) {
      console.error("Failed to recrawl source:", error);
      throw error;
    }
  },

  async updateKnowledgeSource(id, payload) {
    try {
      const response = await apiClient.patch(`aibase/knowledge/sources/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Failed to update knowledge source:", error);
      throw error;
    }
  },

  async deleteKnowledgeSource(id) {
    try {
      const response = await apiClient.delete(`aibase/knowledge/sources/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete knowledge source:", error);
      throw error;
    }
  },

  async deleteKnowledgeDocument(id) {
    try {
      const response = await apiClient.delete(`aibase/knowledge/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete knowledge document:", error);
      throw error;
    }
  },

  async aibaseChat(payload) {
    try {
      const response = await apiClient.post('aibase/chat', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to generate AIBASE chat response:", error);
      throw error;
    }
  },



  // --- Credits & Subscription ---
  async getCreditHistory() {
    try {
      const response = await apiClient.get('/subscription/credit-history');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch credit history:", error);
      throw error;
    }
  },

  async getUserCredits() {
    try {
      const response = await apiClient.get('/subscription/user-credits');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user credits:", error);
      throw error;
    }
  },

  async deductCredits(payload) {
    try {
      const response = await apiClient.post('/subscription/deduct-credits', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to deduct credits:", error);
      throw error;
    }
  },

  // --- Projects ---
  async getProjects() {
    try {
      const response = await apiClient.get('/projects');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      return [];
    }
  },

  async getProject(projectId) {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch project:", error);
      throw error;
    }
  },

  async createProject(data) {
    try {
      const payload = typeof data === 'string' ? { name: data } : data;
      const response = await apiClient.post('/projects', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    }
  },

  async updateProject(projectId, data) {
    try {
      const response = await apiClient.put(`/projects/${projectId}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update project:", error);
      throw error;
    }
  },

  async deleteProject(projectId) {
    try {
      const response = await apiClient.delete(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  },

  async renameProject(id, name) {
    try {
      const response = await apiClient.put(`/projects/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error("Failed to rename project:", error);
      throw error;
    }
  },

  async getFeatureCredits() {
    try {
      const response = await apiClient.get('/admin/feature-credits');
      return response.data;
    } catch (error) {
      console.error("Failed to load feature credits:", error);
      throw error;
    }
  },

  async updateFeatureCredit(id, data) {
    try {
      const response = await apiClient.put(`/admin/feature-credits/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update feature credit:", error);
      throw error;
    }
  },


  async generateSocialAgentCalendar(workspaceId) {
    try {
      const response = await apiClient.post('/social-agent/generate/calendar', { workspaceId }, { timeout: 300000 });
      return response.data;
    } catch (error) {
      console.error("AI Calendar Generation failed:", error);
      throw error;
    }
  },

  async generateSocialAgentHashtags(workspaceId) {
    try {
      const response = await apiClient.post('/social-agent/generate/hashtags', { workspaceId });
      return response.data;
    } catch (error) {
      console.error("AI Hashtag Generation failed:", error);
      throw error;
    }
  },

  async generateSocialAgentImagePrompt(workspaceId, userIdea = "") {
    try {
      const response = await apiClient.post('/social-agent/generate/image-prompt', { workspaceId, userIdea });
      return response.data;
    } catch (error) {
      console.error("AI Image Prompt Generation failed:", error);
      throw error;
    }
  },

  async exportSocialAgentCalendar(workspaceId) {
    try {
      const response = await apiClient.get('/social-agent/export/calendar', {
        params: { workspaceId },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error("Calendar export failed:", error);
      throw new Error("Unable to generate Excel. Make sure you have generated content first.");
    }
  },

  async deleteSocialAgentCalendarEntry(entryId) {
    try {
      const response = await apiClient.delete(`/social-agent/calendar/entry/${entryId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete calendar entry:", error);
      throw error;
    }
  },

  async clearCalendarForWorkspace(workspaceId) {
    try {
      const response = await apiClient.delete(`/social-agent/calendar/clear/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to clear calendar:", error);
      throw error;
    }
  },

  async resetSocialOnboarding() {
    try {
      const response = await apiClient.patch('/social-agent/onboarding/reset');
      return response.data;
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
      throw error;
    }
  },

  async deleteSocialAgentWorkspace(workspaceId) {
    try {
      const response = await apiClient.delete(`/social-agent/workspace/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete brand workspace:", error);
      throw error;
    }
  },


  async searchPrecedents(query, projectId = null, language = 'English') {
    try {
      const response = await apiClient.post('/precedents/search', { query, projectId, language });
      return response.data;
    } catch (error) {
      console.error("Failed to search precedents:", error);
      throw error;
    }
  },

  async analyzePrecedent(actionType, precedentData, projectId = null, language = 'English') {
    try {
      const response = await apiClient.post('/precedents/analyze', { actionType, precedentData, projectId, language });
      return response.data;
    } catch (error) {
      console.error("Failed to analyze precedent:", error);
      throw error;
    }
  },

  async reanalyzePrecedent(precedentData, projectId = null, language = 'English') {
    try {
      const response = await apiClient.post('/precedents/reanalyze', { precedentData, projectId, language });
      return response.data;
    } catch (error) {
      console.error("Failed to re-analyze precedent:", error);
      throw error;
    }
  },

  async generatePrecedentPDF(precedentData) {
    try {
      const response = await apiClient.post('/precedents/generate-pdf', { precedentData }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      throw error;
    }
  },


  async analyzeProject(projectId, rawText = null) {
    try {
      console.log(`[Frontend] Running AI analysis for project: ${projectId}`);
      const response = await apiClient.post(`/projects/${projectId}/analyze`, { rawText });
      console.log(`[Frontend] Analysis complete. Strength: ${response.data?.intelligence?.strengthScore}`);
      return response.data;
    } catch (error) {
      console.error('[Frontend] analyzeProject failed:', error?.response?.data || error.message);
      throw error;
    }
  },

  async autoAnalyzeCase(caseId, rawText = null) {
    try {
      console.log(`[Frontend] POST /api/projects/${caseId}/analyze`);
      const response = await apiClient.post(`/projects/${caseId}/analyze`, { rawText });
      console.log(`[Frontend] Auto-analyze success:`, {
        strength: response.data?.intelligence?.strengthScore,
        win: response.data?.intelligence?.winProbability,
        tasks: response.data?.tasks?.length,
        evidence: response.data?.evidence?.length,
      });
      return response.data;
    } catch (error) {
      console.error('[Frontend] autoAnalyzeCase failed:', error?.response?.data || error.message);
      throw error;
    }
  },

  async postClientConnectDraft(projectId, payload) {
    try {
      const response = await apiClient.post(`/projects/${projectId}/client-connect/draft`, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to generate client connect draft:', error);
      throw error;
    }
  },

  async postClientConnectLog(projectId, payload) {
    try {
      const response = await apiClient.post(`/projects/${projectId}/client-connect/log`, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to log client connect communication:', error);
      throw error;
    }
  },

  async deleteClientConnectLog(projectId, logId) {
    try {
      const endpoint = logId ? `/projects/${projectId}/client-connect/logs/${logId}` : `/projects/${projectId}/client-connect/logs`;
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to delete client connect log:', error);
      throw error;
    }
  },

  async request(urlOrConfig, config) {
    if (typeof urlOrConfig === 'string') {
      return apiClient.get(urlOrConfig, config);
    }
    return apiClient.request(urlOrConfig);
  },
  async get(url, config) {
    return apiClient.get(url, config);
  },
  async post(url, data, config) {
    return apiClient.post(url, data, config);
  },
  async put(url, data, config) {
    return apiClient.put(url, data, config);
  },
  async delete(url, config) {
    return apiClient.delete(url, config);
  },

  async triggerPersonalAnalysis(caseId) {
    try {
      const response = await apiClient.post(`/projects/${caseId}/personal-analysis-trigger`);
      return response.data;
    } catch (error) {
      console.error('Failed to trigger personal case analysis:', error);
      throw error;
    }
  },

  async getPersonalAnalysisLatest(caseId) {
    try {
      const response = await apiClient.get(`/projects/${caseId}/personal-analysis-latest`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch latest personal case analysis:', error);
      throw error;
    }
  },

  // --- Dedicated Case Chat API ---
  async getCaseChat(caseId) {
    try {
      const response = await apiClient.get(`/projects/${caseId}/case-chat`);
      return response.data;
    } catch (error) {
      console.warn("Failed to get case chat:", error);
      return { success: false };
    }
  },

  async getCaseChatMessages(caseId) {
    try {
      const response = await apiClient.get(`/projects/${caseId}/case-chat/messages`);
      return response.data;
    } catch (error) {
      console.warn("Failed to get case chat messages:", error);
      return { success: false, messages: [] };
    }
  },

  async postCaseChatMessage(caseId, payload) {
    try {
      const response = await apiClient.post(`/projects/${caseId}/case-chat/messages`, payload);
      return response.data;
    } catch (error) {
      console.warn("Failed to post case chat message:", error);
      return { success: false };
    }
  },

  // --- Workspace Activities API (Real-time App & Web Sync) ---
  async getCaseWorkspaceActivities(caseId) {
    try {
      const response = await apiClient.get(`/workspace-activities/cases/${caseId}/activities`);
      return response.data;
    } catch (error) {
      console.warn("Failed to fetch case workspace activities:", error);
      return { success: false, activities: [] };
    }
  },

  async deleteWorkspaceActivity(activityId) {
    try {
      const response = await apiClient.delete(`/workspace-activities/detail/${activityId}`);
      return response.data;
    } catch (error) {
      console.warn("Failed to delete workspace activity:", error);
      return { success: false };
    }
  },

  // --- UWO SSO Central Auth Login ---
  async uwoLogin(credentials) {
    try {
      const response = await apiClient.post('/auth/sso/uwo-login', credentials);
      return response.data;
    } catch (error) {
      console.error("UWO Login failed:", error);
      throw error;
    }
  }
};

export default apiService;