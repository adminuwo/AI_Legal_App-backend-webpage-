import { apiClient } from '../api/client';
import { ApiResponse } from '../types';

export interface CasePredictionItem {
  _id: string;
  userId: string;
  caseName: string;
  workspaceId?: string | {
    _id: string;
    name: string;
    clientName?: string;
    caseType?: string;
  };
  uploadedDocuments: { name: string; url: string }[];
  ocrResults?: string;
  manualFacts?: {
    title: string;
    caseType?: string;
    courtLevel?: string;
    language?: string;
    facts: string;
  };
  generatedPrediction: string;
  riskAnalysis?: string;
  winProbability: string;
  aiSummary: string;
  version: number;
  versionGroupId: string;
  createdAt: string;
  updatedAt: string;
}

export class CasePredictionHistoryService {
  static async savePrediction(payload: Partial<CasePredictionItem>): Promise<ApiResponse<CasePredictionItem>> {
    const response = await apiClient.post<ApiResponse<CasePredictionItem>>('/case-predictions', payload);
    return response.data;
  }

  static async listPredictions(params: {
    search?: string;
    filter?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<CasePredictionItem[]>> {
    const response = await apiClient.get<ApiResponse<CasePredictionItem[]>>('/case-predictions', { params });
    return response.data;
  }

  static async getPredictionDetails(id: string): Promise<ApiResponse<CasePredictionItem>> {
    const response = await apiClient.get<ApiResponse<CasePredictionItem>>(`/case-predictions/${id}`);
    return response.data;
  }

  static async updatePrediction(id: string, payload: {
    caseName?: string;
    workspaceId?: string | null;
  }): Promise<ApiResponse<CasePredictionItem>> {
    const response = await apiClient.put<ApiResponse<CasePredictionItem>>(`/case-predictions/${id}`, payload);
    return response.data;
  }

  static async deletePrediction(id: string): Promise<ApiResponse<{ deletedCount: number }>> {
    const response = await apiClient.delete<ApiResponse<{ deletedCount: number }>>(`/case-predictions/${id}`);
    return response.data;
  }

  static async duplicatePrediction(id: string): Promise<ApiResponse<CasePredictionItem>> {
    const response = await apiClient.post<ApiResponse<CasePredictionItem>>(`/case-predictions/duplicate/${id}`);
    return response.data;
  }

  static async listVersions(versionGroupId: string): Promise<ApiResponse<CasePredictionItem[]>> {
    const response = await apiClient.get<ApiResponse<CasePredictionItem[]>>(`/case-predictions/versions/${versionGroupId}`);
    return response.data;
  }
}
