/**
 * AI Legal Mobile - Case & Workspace Service
 * Interfaces with case briefs, document lists, tasks, schedules, and analytics.
 */

import { apiClient, uploadFileMultipart } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseWorkspace, CaseSummary, CaseTask, CaseHearing, CaseEvidence } from '../types';
import { useRoleStore } from '../store/role';

import { getGlobalActiveWorkspaceId, getGlobalActiveWorkspaceType } from '../providers/workspace.provider';

export class CaseService {
  /**
   * Retrieves all case summaries for active user filtered by active role and workspace.
   */
  static async listCases(role?: string, workspaceId?: string): Promise<ApiResponse<CaseSummary[]>> {
    const activeRole = role || useRoleStore.getState().selectedRole || 'advocate';
    const activeWsType = activeRole === 'law_firm' ? 'law_firm' : activeRole;
    const activeWsId = workspaceId || (getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice');
    const response = await apiClient.get(API_ENDPOINTS.Cases.Base, {
      params: { role: activeRole, workspaceType: activeWsType, workspaceId: activeWsId },
    });
    return response.data;
  }

  /**
   * Fetch complete case workspace by ID.
   */
  static async getCaseDetails(caseId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Details(caseId));
    const raw = response.data;
    if (raw && (raw._id || raw.id) && !raw.data) {
      return { success: true, data: raw as CaseWorkspace };
    }
    return raw;
  }

  /**
   * Create a new case workspace bound to the active workspace.
   */
  static async createCase(caseData: Partial<CaseWorkspace>): Promise<ApiResponse<CaseWorkspace>> {
    const activeRole = useRoleStore.getState().selectedRole || 'advocate';
    const activeWsType = (caseData as any)?.workspaceType || (activeRole === 'law_firm' ? 'law_firm' : activeRole);
    const activeWsId = (caseData as any)?.workspaceId || (getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice');
    const payload = { role: activeRole, workspaceType: activeWsType, workspaceId: activeWsId, isLegalCase: true, ...caseData };
    const response = await apiClient.post(API_ENDPOINTS.Cases.Base, payload);
    return response.data;
  }

  /**
   * Update case workspace parameters.
   */
  static async updateCase(caseId: string, updates: Partial<CaseWorkspace> | Record<string, any>): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.put(API_ENDPOINTS.Cases.Details(caseId), updates);
    return response.data;
  }

  /**
   * Delete case workspace.
   */
  static async deleteCase(caseId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.Details(caseId));
    return response.data;
  }

  /**
   * Parse spoken voice text into structured case creation fields using AI.
   */
  static async parseVoiceCaseDetails(voiceText: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/projects/parse-voice-case', { text: voiceText });
    return response.data;
  }

  /**
   * Triggers AI Case Intelligence Snapshot analysis.
   */
  static async analyzeCaseSnapshot(caseId: string, forceReanalyze = false): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.post(`/projects/${caseId}/analyze-snapshot`, {
      workspaceId: activeWsId,
      forceReanalyze
    });
    return response.data;
  }

  /**
   * Trigger 15-Section Personal AI Case Analysis
   */
  static async triggerPersonalAnalysis(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`/projects/${caseId}/personal-analysis-trigger`);
    return response.data;
  }

  /**
   * Trigger 14-Section Personal AI Case Strategy
   */
  static async triggerPersonalStrategy(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`/projects/${caseId}/personal-strategy-trigger`);
    return response.data;
  }

  /**
   * Fetch latest saved Personal AI Analysis and Strategy for case
   */
  static async getPersonalAnalysisLatest(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/projects/${caseId}/personal-analysis-latest`);
    return response.data;
  }




  /**
   * Fetch case-specific activity feed.
   */
  static async getCaseActivities(caseId: string, category?: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/workspace-activities/cases/${caseId}/activities`, {
      params: { category: category && category !== 'All' ? category : undefined }
    });
    return response.data;
  }

  /**
   * Fetch unread activity count for a case.
   */
  static async getCaseUnreadActivityCount(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/workspace-activities/cases/${caseId}/unread-count`);
    return response.data;
  }

  /**
   * Mark case activities as read for user.
   */
  static async markCaseActivitiesRead(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.patch(`/workspace-activities/cases/${caseId}/mark-read`);
    return response.data;
  }

  /**
   * Add a task to case workspace.
   */
  static async addTask(caseId: string, task: Partial<CaseTask>): Promise<ApiResponse<CaseTask>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Tasks(caseId), task);
    return response.data;
  }

  /**
   * Update task parameters in case.
   */
  static async updateTask(caseId: string, taskId: string, updates: Partial<CaseTask>): Promise<ApiResponse<CaseTask>> {
    const response = await apiClient.put(`${API_ENDPOINTS.Cases.Tasks(caseId)}/${taskId}`, updates);
    return response.data;
  }

  /**
   * Fetch all workspace hearings dynamically.
   */
  static async getWorkspaceHearings(workspaceId?: string, myHearings = false): Promise<ApiResponse<any>> {
    const activeWsId = workspaceId || (getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice');
    const response = await apiClient.get('/projects/workspace-hearings', {
      params: { workspaceId: activeWsId, myHearings }
    });
    return response.data;
  }

  /**
   * Add hearing entry to case calendar.
   */
  static async addHearing(caseId: string, hearing: Partial<CaseHearing>): Promise<ApiResponse<CaseHearing>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings`, {
      workspaceId: activeWsId,
      ...hearing
    });
    return response.data;
  }

  /**
   * Update hearing details.
   */
  static async updateHearing(caseId: string, hearingId: string, updates: any): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.put(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings/${hearingId}`, {
      workspaceId: activeWsId,
      ...updates
    });
    return response.data;
  }

  /**
   * Update hearing preparation checklist persistently.
   */
  static async updateHearingChecklist(caseId: string, hearingId: string, checklist: any): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.put(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings/${hearingId}/checklist`, {
      workspaceId: activeWsId,
      ...checklist
    });
    return response.data;
  }

  /**
   * Record hearing outcome and court directions.
   */
  static async recordHearingOutcome(caseId: string, hearingId: string, outcomeData: any): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings/${hearingId}/outcome`, {
      workspaceId: activeWsId,
      ...outcomeData
    });
    return response.data;
  }

  /**
   * Run AI Hearing Assistant actions.
   */
  static async runAiHearingAssistant(caseId: string, hearingId: string, action: string): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings/${hearingId}/ai-assistant`, {
      workspaceId: activeWsId,
      action
    });
    return response.data;
  }

  /**
   * Delete or cancel a hearing.
   */
  static async deleteHearing(caseId: string, hearingId: string): Promise<ApiResponse<any>> {
    const activeWsId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
    const response = await apiClient.delete(`${API_ENDPOINTS.Cases.Base}/${caseId}/hearings/${hearingId}`, {
      params: { workspaceId: activeWsId }
    });
    return response.data;
  }

  /**
   * Add evidence record to vault.
   */
  static async addEvidence(caseId: string, evidence: Partial<CaseEvidence>): Promise<ApiResponse<CaseEvidence>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.Evidence(caseId), evidence);
    return response.data;
  }

  /**
   * Triggers the AI timeline and case intelligence analysis.
   */
  static async analyzeCase(caseId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Details(caseId)}/analyze`);
    return response.data;
  }

  /**
   * Enrich hearing details using AI (court orders or notes).
   */
  static async enrichHearing(
    caseId: string,
    hearingId: string,
    payload: { notes?: string; documentText?: string; documentName?: string }
  ): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Details(caseId)}/hearings/${hearingId}/enrich`, payload);
    return response.data;
  }

  /**
   * Generate an AI message draft for client connect (WhatsApp or Email)
   */
  static async generateClientConnectDraft(
    caseId: string,
    payload: { channel?: 'WhatsApp' | 'Email' | string; reasons: string[]; description?: string; style?: string; languagePreference?: string }
  ): Promise<{ success: boolean; channel?: string; subject?: string; draft: string }> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.ClientConnectDraft(caseId), payload);
    return response.data;
  }

  /**
   * Log client connect communication event (Call, WhatsApp, Email)
   */
  static async logClientCommunication(
    caseId: string,
    payload: {
      type: string;
      reason?: string;
      mode?: string;
      subject?: string;
      body?: string;
      editedDraft?: string;
      recipientPhone?: string;
      recipientEmail?: string;
      status?: string;
    }
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.Cases.ClientConnectLog(caseId), payload);
    return response.data;
  }

  /**
   * Clear all communication logs for a case
   */
  static async clearClientCommunicationLogs(caseId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.ClientConnectLogs(caseId));
    return response.data;
  }

  /**
   * Delete a specific communication log item
   */
  static async deleteClientCommunicationLog(caseId: string, logId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(API_ENDPOINTS.Cases.ClientConnectLogItem(caseId, logId));
    return response.data;
  }


  /**
   * Get dedicated Case Chat object & team roster
   */
  static async getCaseChat(caseId: string): Promise<{ success: boolean; chat: any; teamCount: number }> {
    const response = await apiClient.get(`/projects/${caseId}/case-chat`);
    return response.data;
  }

  /**
   * Get Case Chat messages
   */
  static async getCaseChatMessages(caseId: string): Promise<{ success: boolean; messages: any[]; chatId: string }> {
    const response = await apiClient.get(`/projects/${caseId}/case-chat/messages`);
    return response.data;
  }

  /**
   * Post message to Case Chat
   */
  static async postCaseChatMessage(
    caseId: string,
    payload: { content?: string; type?: string; attachments?: any[]; voiceNote?: any; replyTo?: string }
  ): Promise<{ success: boolean; message: any; error?: string }> {
    const response = await apiClient.post(`/projects/${caseId}/case-chat/messages`, payload);
    return response.data;
  }

  /**
   * Upload attachment for dedicated Case Chat
   */
  static async uploadCaseChatAttachment(
    caseId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; attachment: any }> {
    const endpoint = `/projects/${caseId}/case-chat/upload`;
    return uploadFileMultipart<{ success: boolean; attachment: any }>(
      endpoint,
      fileUri,
      fileName,
      mimeType,
      {},
      onProgress
    );
  }

  /**
   * Trigger in-chat @AI assistant inside Case Chat
   */
  static async sendCaseChatAiCommand(
    caseId: string,
    commandPrompt: string
  ): Promise<{ success: boolean; message: any }> {
    const response = await apiClient.post(`/projects/${caseId}/case-chat/ai-command`, { commandPrompt });
    return response.data;
  }

  /**
   * Convert Case Chat Message into Task, Hearing, Note, or Calendar Reminder
   */
  static async convertCaseChatMessage(
    caseId: string,
    messageId: string,
    payload: { targetType: 'task' | 'hearing' | 'note' | 'reminder'; title?: string; deadline?: string; priority?: string }
  ): Promise<{ success: boolean; message: any; convertedItem: any; project: any }> {
    const response = await apiClient.post(`/projects/${caseId}/case-chat/messages/${messageId}/convert`, payload);
    return response.data;
  }

  /**
   * Toggle Pin Case Chat message
   */
  static async togglePinCaseChatMessage(caseId: string, messageId: string): Promise<{ success: boolean; pinned: boolean; message: any }> {
    const response = await apiClient.put(`/projects/${caseId}/case-chat/messages/${messageId}/pin`);
    return response.data;
  }

  /**
   * Get courtroom response for dynamic AI Voice Hearing
   */
  static async getCourtroomResponse(payload: {
    caseContext?: any;
    conversationHistory: any[];
    lastUserSpeech: string;
    currentRole: string;
    stage: string;
    courtroomLanguage?: string;
    activeLanguage?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.Respond, payload);
    return response.data;
  }

  /**
   * Translate text in the courtroom bottom sheet transcript
   */
  static async translateCourtroomText(payload: {
    text: string;
    targetLanguage: string;
  }): Promise<ApiResponse<{ translatedText: string }>> {
    const response = await apiClient.post('/projects/mock-courtroom/translate', payload);
    return response.data;
  }

  /**
   * Generate performance report for mock courtroom hearing
   */
  static async getCourtroomReport(payload: {
    conversationHistory: any[];
    caseContext?: any;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.Report, payload);
    return response.data;
  }

  /**
   * Generate coaching report for practice recording
   */
  static async getPracticeReport(payload: {
    transcript: string;
    caseContext?: any;
    speakingTimeSeconds: number;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(API_ENDPOINTS.MockCourtroom.PracticeReport, payload);
    return response.data;
  }

  /**
   * Create a manual court order.
   */
  static async createManualCourtOrder(payload: any): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/court-orders/manual', payload);
    return response.data;
  }

  /**
   * Update a court order by ID.
   */
  static async updateCourtOrder(orderId: string, updates: any): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/court-orders/${orderId}`, updates);
    return response.data;
  }

  /**
   * Delete a court order by ID.
   */
  static async deleteCourtOrder(orderId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(`/court-orders/${orderId}`);
    return response.data;
  }

  /**
   * Duplicate a court order by ID.
   */
  static async duplicateCourtOrder(orderId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`/court-orders/${orderId}/duplicate`);
    return response.data;
  }

  /**
   * Delete a document from case workspace.
   */
  static async deleteDocument(caseId: string, docId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`/projects/${caseId}/documents/${docId}`);
    return response.data;
  }

  /**
   * List all standalone clients.
   */
  static async listClients(): Promise<{ success: boolean; clients: any[] }> {
    const response = await apiClient.get('/clients');
    return response.data;
  }

  /**
   * Create a new standalone client.
   */
  static async createClient(clientData: any): Promise<{ success: boolean; client: any; project: any }> {
    const response = await apiClient.post('/clients', clientData);
    return response.data;
  }

  /**
   * Delete a standalone client.
   */
  static async deleteClient(clientId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/clients/${clientId}`);
    return response.data;
  }

  /**
   * 1. AI Draft Maker Quick Action
   */
  static async generateAiDraftMaker(
    caseId: string,
    payload: {
      draftType: string;
      customInstructions?: string;
      referenceSources?: Record<string, boolean>;
      advancedOptions?: Record<string, any>;
    }
  ): Promise<{ success: boolean; draftType: string; title: string; content: string }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/draft-maker`, payload);
    return response.data;
  }

  /**
   * 2. AI Argument Builder Quick Action
   */
  static async generateAiArgumentBuilder(
    caseId: string,
    payload: {
      argumentType: string;
      FocusPoints?: string;
      referenceSources?: Record<string, boolean>;
      advancedOptions?: Record<string, any>;
    }
  ): Promise<{ success: boolean; argumentType: string; title: string; content: string }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/argument-builder`, payload);
    return response.data;
  }

  /**
   * 3. AI Cross Examination Quick Action
   */
  static async generateAiCrossExamination(
    caseId: string,
    payload: {
      questionType: string;
      witnessName?: string;
      referenceSources?: Record<string, boolean>;
      advancedOptions?: Record<string, any>;
    }
  ): Promise<{ success: boolean; questionType: string; witnessName: string; title: string; content: string }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/cross-examination`, payload);
    return response.data;
  }

  /**
   * 4. Case Progress Report Quick Action
   */
  static async generateCaseProgressReport(
    caseId: string,
    payload?: {
      referenceSources?: Record<string, boolean>;
      advancedOptions?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    title: string;
    author: string;
    createdAt: string;
    content: string;
  }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/progress-report`, payload || {});
    return response.data;
  }

  /**
   * 5. AI Copilot Quick Action
   */
  static async generateAiCopilot(
    caseId: string,
    payload: {
      promptText: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      referenceSources?: Record<string, boolean>;
      advancedOptions?: Record<string, any>;
    }
  ): Promise<{ success: boolean; title: string; content: string }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/copilot`, payload);
    return response.data;
  }

  /**
   * Log timeline activity for AI Quick Actions
   */
  static async logAiQuickActionActivity(
    caseId: string,
    payload: {
      toolName: string;
      outputType?: string;
      summaryText?: string;
      content?: string;
      generatedContent?: string;
      linkedDocumentId?: string;
      version?: string;
    }
  ): Promise<{ success: boolean; log: any }> {
    const response = await apiClient.post(`/projects/${caseId}/ai-quick-action/log-activity`, payload);
    return response.data;
  }
}
