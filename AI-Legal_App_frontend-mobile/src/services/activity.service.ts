import { apiClient } from '../api/client';

export interface WorkspaceActivityItem {
  _id: string;
  workspaceId: string;
  caseId?: string;
  caseName?: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorRole?: string;
  activityCategory:
    | 'draft'
    | 'argument'
    | 'cross_exam'
    | 'copilot'
    | 'documents'
    | 'evidence'
    | 'hearings'
    | 'tasks'
    | 'team_chat'
    | 'team_management'
    | 'research'
    | 'reports'
    | 'client_communication'
    | 'case_management';
  action: string;
  module: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  status: 'Completed' | 'Pending' | 'Reviewed' | 'Approved' | 'Rejected' | 'Updated';
  reviewStatus?: 'Pending Review' | 'Approved' | 'Rejected' | 'Changes Requested' | 'None';
  reviewedBy?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewNote?: string;
  generatedContent?: string;
  linkedDocumentId?: string;
  version?: string;
  createdAt: string;
}

export class ActivityService {
  /**
   * Get workspace activity timeline feed
   */
  static async getWorkspaceActivities(
    workspaceId: string,
    params?: {
      page?: number;
      limit?: number;
      caseId?: string;
      category?: string;
      actorId?: string;
      search?: string;
      sortBy?: 'newest' | 'oldest';
    }
  ): Promise<{
    success: boolean;
    activities: WorkspaceActivityItem[];
    isOwner?: boolean;
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const response = await apiClient.get(`/workspace-activities/${workspaceId}/activities`, {
      params,
    });
    return response.data;
  }

  /**
   * Get case-specific activity feed
   */
  static async getCaseActivities(
    caseId: string,
    params?: { page?: number; limit?: number; category?: string; search?: string }
  ): Promise<{
    success: boolean;
    activities: WorkspaceActivityItem[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const response = await apiClient.get(`/workspace-activities/cases/${caseId}/activities`, {
      params,
    });
    return response.data;
  }

  /**
   * Get activity detail
   */
  static async getActivityDetail(
    activityId: string
  ): Promise<{ success: boolean; activity: WorkspaceActivityItem; isOwner?: boolean }> {
    const response = await apiClient.get(`/workspace-activities/detail/${activityId}`);
    return response.data;
  }

  /**
   * Review Activity (Approve / Reject / Request Changes - Owner Only)
   */
  static async reviewActivity(
    activityId: string,
    data: { reviewStatus: string; reviewNote?: string }
  ): Promise<{ success: boolean; activity: WorkspaceActivityItem }> {
    const response = await apiClient.patch(`/workspace-activities/detail/${activityId}/review`, data);
    return response.data;
  }

  /**
   * Delete a single activity item
   */
  static async deleteActivity(activityId: string): Promise<{ success: boolean; message: string; id: string }> {
    const response = await apiClient.delete(`/workspace-activities/detail/${activityId}`);
    return response.data;
  }

  /**
   * Clear all activities for a workspace / case
   */
  static async clearAllActivities(workspaceId: string, caseId?: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const response = await apiClient.delete(`/workspace-activities/${workspaceId}/clear-all`, {
      params: { caseId }
    });
    return response.data;
  }
}

export default ActivityService;
