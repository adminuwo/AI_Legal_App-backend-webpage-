/**
 * AI Legal Mobile - Workspace Service
 * Coordinates the active case workspace context and environment states.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseWorkspace } from '../types';

export class WorkspaceService {
  private static activeWorkspaceId: string | null = null;

  /**
   * Sets the globally active case workspace context.
   */
  static setActiveWorkspace(workspaceId: string | null): void {
    this.activeWorkspaceId = workspaceId;
  }

  /**
   * Get the globally active case workspace context ID.
   */
  static getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  /**
   * Triggers background analysis run for active workspace details.
   */
  static async triggerAutoAnalysis(workspaceId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${workspaceId}/auto-analyze`);
    return response.data;
  }

  /**
   * Syncs custom documents array for workspace.
   */
  static async getWorkspaceDocuments(workspaceId: string): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Documents(workspaceId));
    return response.data;
  }

  /**
   * Triggers comprehensive AI legal analysis workflow.
   */
  static async triggerCompleteAnalysis(workspaceId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${workspaceId}/analysis-trigger`);
    return response.data;
  }

  /**
   * Fetches the latest case analysis report.
   */
  static async getLatestAnalysis(workspaceId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`${API_ENDPOINTS.Cases.Base}/${workspaceId}/analysis/latest`);
    return response.data;
  }

  /**
   * Fetches the entire analysis run history for comparison.
   */
  static async getAnalysisHistory(workspaceId: string): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(`${API_ENDPOINTS.Cases.Base}/${workspaceId}/analysis/history`);
    return response.data;
  }

  /**
   * Fetches the dynamic list of active members and team stats for a Law Firm Workspace.
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<{ success: boolean; members: any[]; stats: any }> {
    try {
      const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
      return response.data;
    } catch (err: any) {
      console.warn('[WorkspaceService] Failed to fetch members:', err);
      return {
        success: false,
        members: [],
        stats: { totalMembers: 0, activeMembers: 0, pendingInvitations: 0, departmentsCount: 0, departments: [] }
      };
    }
  }

  /**
   * Updates a firm team member's role, department, permissions, or modules.
   */
  static async updateMemberRoleAndPermissions(
    workspaceId: string,
    memberId: string,
    data: { role?: string; department?: string; permission?: string; modules?: string[] }
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.put(`/workspaces/${workspaceId}/members/${memberId}/role`, data);
    return response.data;
  }

  /**
   * Toggles a firm team member's status (Active vs Suspended).
   */
  static async toggleMemberStatus(
    workspaceId: string,
    memberId: string,
    status?: 'Active' | 'Suspended'
  ): Promise<{ success: boolean; status: string; message?: string }> {
    const response = await apiClient.put(`/workspaces/${workspaceId}/members/${memberId}/status`, { status });
    return response.data;
  }

  /**
   * Removes a member from the law firm workspace with optional work reassignment.
   */
  static async removeWorkspaceMember(
    workspaceId: string,
    memberId: string,
    transferToUserId?: string
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post(`/workspaces/${workspaceId}/members/${memberId}/remove`, { transferToUserId });
    return response.data;
  }
}
