/**
 * AI Legal Mobile - Profile Service
 * Manages user profile settings, avatars, and application preferences.
 */

import { apiClient, uploadFileMultipart } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, UserProfile } from '../types';

export class ProfileService {
  /**
   * Retrieves active profile profile details.
   */
  static async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.get(API_ENDPOINTS.User.Profile);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Update user settings or preferences.
   */
  static async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.put(API_ENDPOINTS.User.Profile, updates);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Updates custom profile avatar file.
   */
  static async updateAvatar(fileUri: string, fileName: string, mimeType: string): Promise<ApiResponse<{ avatar: string }>> {
    const response = await uploadFileMultipart<{ success: boolean; avatar: string }>(
      API_ENDPOINTS.User.Avatar,
      fileUri,
      fileName,
      mimeType
    );
    return {
      success: true,
      data: { avatar: response.avatar },
    };
  }

  /**
   * Changes the current user password.
   */
  static async changePassword(currentPassword: string, newPassword: string, logoutOthers: boolean): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/security/change-password', {
      currentPassword,
      newPassword,
      logoutOthers,
    });
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Fetches active sessions for the user.
   */
  static async getSessions(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/security/sessions');
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  }

  /**
   * Revokes a specific session by ID.
   */
  static async revokeSession(sessionId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/security/logout-session', { sessionId });
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Revokes all other sessions.
   */
  static async logoutAllOtherSessions(): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/security/logout-all');
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Temporarily deactivates the user account.
   */
  static async deactivateAccount(): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/security/deactivate');
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Resets personalization preferences to defaults.
   */
  static async resetPersonalizations(): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`${API_ENDPOINTS.User.Profile}/personalizations/reset`);
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Permanently deletes user account.
   */
  static async deleteAccount(password: string, verifyText: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete('/security/account', {
      data: { password, verifyText }
    });
    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Fetches real-time backend usage status (cases, storage, feature quotas).
   */
  static async getUsageStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/user/usage-status');
      return {
        success: true,
        data: response.data,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message,
      };
    }
  }
}
