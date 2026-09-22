import { apiClient } from './apiService';

export const consultationService = {
  /**
   * Retrieves verified advocates who have accepted public listing.
   */
  async getVerifiedAdvocates(params = {}) {
    try {
      const response = await apiClient.get('/consultations/advocates', { params });
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getVerifiedAdvocates error:', err);
      return { success: false, total: 0, advocates: [] };
    }
  },

  /**
   * Fetch public advocate profile by ID.
   */
  async getAdvocateProfile(id) {
    try {
      const response = await apiClient.get(`/consultations/advocates/${id}`);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getAdvocateProfile error:', err);
      return { success: false, advocate: null };
    }
  },

  /**
   * Submit a new consultation request.
   */
  async createConsultationRequest(payload) {
    try {
      const response = await apiClient.post('/consultations/request', payload);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] createConsultationRequest error:', err);
      throw err;
    }
  },

  /**
   * Fetch user's consultation requests filtered by status.
   */
  async getMyRequests(status) {
    try {
      const params = status && status.toLowerCase() !== 'all' ? { status: status.toLowerCase() } : {};
      const response = await apiClient.get('/consultations/my-requests', { params });
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getMyRequests error:', err);
      return { success: false, total: 0, requests: [] };
    }
  },

  /**
   * Fetch detailed consultation request by ID.
   */
  async getRequestDetails(id) {
    try {
      const response = await apiClient.get(`/consultations/request/${id}`);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getRequestDetails error:', err);
      return { success: false, request: null };
    }
  },

  /**
   * Cancel an existing consultation request.
   */
  async cancelRequest(id, reason) {
    try {
      const response = await apiClient.patch(`/consultations/request/${id}/cancel`, { reason });
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] cancelRequest error:', err);
      throw err;
    }
  },

  /**
   * Get chat messages for a consultation request.
   */
  async getMessages(requestId) {
    try {
      const response = await apiClient.get(`/consultations/messages/${requestId}`);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getMessages error:', err);
      return { success: false, messages: [] };
    }
  },

  /**
   * Send a chat message for a consultation.
   */
  async sendMessage(requestId, text) {
    try {
      const response = await apiClient.post(`/consultations/messages/${requestId}`, { text });
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] sendMessage error:', err);
      throw err;
    }
  },
};

export default consultationService;
