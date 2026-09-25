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
      const response = await apiClient.post('/consultations/requests', payload);
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
      const response = await apiClient.get(`/consultations/requests/${requestId}/messages`);
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
      const response = await apiClient.post(`/consultations/requests/${requestId}/messages`, {
        message: text,
        text,
      });
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] sendMessage error:', err);
      throw err;
    }
  },

  /**
   * Fetch conversation threads for advocate's consultations.
   */
  async getAdvocateConversations() {
    try {
      const response = await apiClient.get('/consultations/advocate/conversations');
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getAdvocateConversations error:', err);
      return { success: false, total: 0, conversations: [] };
    }
  },

  /**
   * Get advocate's total unread consultation messages count.
   */
  async getAdvocateUnreadCount() {
    try {
      const response = await apiClient.get('/consultations/advocate/unread-count');
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getAdvocateUnreadCount error:', err);
      return { success: false, unreadCount: 0 };
    }
  },

  /**
   * Update consultation request status (accept, decline, complete).
   */
  async updateConsultationStatus(id, payload) {
    try {
      const response = await apiClient.patch(`/consultations/requests/${id}/status`, payload);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] updateConsultationStatus error:', err);
      throw err;
    }
  },

  /**
   * Create Razorpay order for consultation fee.
   */
  async createRazorpayOrder(requestId) {
    try {
      const response = await apiClient.post(`/consultations/requests/${requestId}/create-order`);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] createRazorpayOrder error:', err);
      throw err;
    }
  },

  /**
   * Pay consultation fee to unlock messaging and calls.
   */
  async payConsultation(requestId, paymentDetails = {}) {
    try {
      const response = await apiClient.post(`/consultations/requests/${requestId}/pay`, paymentDetails);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] payConsultation error:', err);
      throw err;
    }
  },

  /**
   * Get current advocate's verification and listing status.
   */
  async getAdvocateStatus() {
    try {
      const response = await apiClient.get('/consultations/advocate/status');
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] getAdvocateStatus error:', err);
      return { success: false, verificationStatus: 'not_registered', listingConsent: 'none' };
    }
  },

  /**
   * Submit advocate registration with credentials and consent.
   */
  async submitAdvocateRegistration(payload) {
    try {
      const response = await apiClient.post('/consultations/advocate/register', payload);
      return response.data;
    } catch (err) {
      console.warn('[ConsultationService] submitAdvocateRegistration error:', err);
      throw err;
    }
  },
};

export default consultationService;
