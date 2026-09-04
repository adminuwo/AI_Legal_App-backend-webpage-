import { apiClient } from '../api/client';
import { ApiResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ContractHistoryItem {
  _id: string;
  userId: string;
  caseId?: string | {
    _id: string;
    name: string;
    clientName?: string;
    caseType?: string;
  };
  contractName: string;
  originalFileUrl: string;
  originalFileMime?: string;
  originalFileSize?: number;
  originalFilePages?: number;
  ocrText?: string;
  aiAnalysisResult: any; // Raw response or UI analysis
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  missingClauses: string[];
  suggestedClauses: string[];
  keyObligations: string[];
  partiesDetected: string[];
  datesDetected: string[];
  monetaryValues: string[];
  governingLaw: string;
  aiSummary: string;
  notes: string;
  tags: string[];
  version: number;
  versionGroupId: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = '@ai_legal_contract_history_v2';

export class ContractHistoryService {
  private static async loadLocalItems(): Promise<ContractHistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[ContractHistoryService] Error loading local storage items:', e);
      return [];
    }
  }

  private static async saveLocalItem(item: ContractHistoryItem): Promise<void> {
    try {
      const items = await this.loadLocalItems();
      const idx = items.findIndex((i) => i._id === item._id || (i.versionGroupId && i.versionGroupId === item.versionGroupId && i.version === item.version));
      if (idx >= 0) {
        items[idx] = item;
      } else {
        items.unshift(item);
      }
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[ContractHistoryService] Error saving local storage item:', e);
    }
  }

  private static async deleteLocalItem(id: string): Promise<void> {
    try {
      const items = await this.loadLocalItems();
      const filtered = items.filter((i) => i._id !== id && i.versionGroupId !== id);
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[ContractHistoryService] Error deleting local storage item:', e);
    }
  }

  private static async updateLocalItem(
    id: string,
    data: { contractName?: string; caseId?: string | null; notes?: string; tags?: string[] }
  ): Promise<ContractHistoryItem | null> {
    try {
      const items = await this.loadLocalItems();
      const target = items.find((i) => i._id === id || i.versionGroupId === id);
      if (target) {
        if (data.contractName !== undefined) target.contractName = data.contractName;
        if (data.caseId !== undefined) target.caseId = data.caseId || undefined;
        if (data.notes !== undefined) target.notes = data.notes;
        if (data.tags !== undefined) target.tags = data.tags;
        target.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
        return target;
      }
      return null;
    } catch (e) {
      console.warn('[ContractHistoryService] Error updating local storage item:', e);
      return null;
    }
  }

  static async saveAnalysis(payload: Partial<ContractHistoryItem>): Promise<ApiResponse<ContractHistoryItem>> {
    let resultItem: ContractHistoryItem | null = null;

    try {
      const response = await apiClient.post<ApiResponse<ContractHistoryItem>>('/contract-analysis', payload);
      if (response.data && response.data.success && response.data.data) {
        resultItem = response.data.data;
      }
    } catch (error: any) {
      console.warn('[ContractHistoryService] Remote saveAnalysis error, creating local fallback item:', error?.message);
    }

    if (!resultItem) {
      const now = new Date().toISOString();
      const vgId = payload.versionGroupId || `vg_${Date.now()}`;
      resultItem = {
        _id: payload._id || `cnt_${Date.now()}`,
        userId: payload.userId || 'user_local',
        caseId: payload.caseId,
        contractName: payload.contractName || 'Contract Document',
        originalFileUrl: payload.originalFileUrl || '',
        originalFileMime: payload.originalFileMime,
        originalFileSize: payload.originalFileSize,
        originalFilePages: payload.originalFilePages,
        ocrText: payload.ocrText,
        aiAnalysisResult: payload.aiAnalysisResult || {},
        riskScore: payload.riskScore ?? 75,
        riskLevel: payload.riskLevel || 'Medium',
        missingClauses: payload.missingClauses || [],
        suggestedClauses: payload.suggestedClauses || [],
        keyObligations: payload.keyObligations || [],
        partiesDetected: payload.partiesDetected || [],
        datesDetected: payload.datesDetected || [],
        monetaryValues: payload.monetaryValues || [],
        governingLaw: payload.governingLaw || 'Indian Law',
        aiSummary: payload.aiSummary || 'Contract risk review and clause analysis.',
        notes: payload.notes || '',
        tags: payload.tags || [],
        version: payload.version || 1,
        versionGroupId: vgId,
        createdAt: payload.createdAt || now,
        updatedAt: now
      };
    }

    await this.saveLocalItem(resultItem);

    return {
      success: true,
      data: resultItem
    };
  }

  static async listHistory(params: {
    search?: string;
    filter?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ContractHistoryItem[]>> {
    const localItems = await this.loadLocalItems();
    let remoteItems: ContractHistoryItem[] = [];

    try {
      const response = await apiClient.get<ApiResponse<ContractHistoryItem[]>>('/contract-analysis', { params });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        remoteItems = response.data.data;
      }
    } catch (error: any) {
      console.warn('[ContractHistoryService] Remote listHistory error, using local:', error?.message);
    }

    const map = new Map<string, ContractHistoryItem>();
    remoteItems.forEach((item) => map.set(item._id, item));
    localItems.forEach((item) => map.set(item._id, item));

    let merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      merged = merged.filter((item) =>
        (item.contractName && item.contractName.toLowerCase().includes(q)) ||
        (item.aiSummary && item.aiSummary.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    if (params?.filter && params.filter !== 'all') {
      const f = params.filter.toLowerCase();
      if (f === 'high-risk') {
        merged = merged.filter(i => i.riskLevel === 'High' || i.riskLevel === 'Critical');
      } else if (f === 'low-risk') {
        merged = merged.filter(i => i.riskLevel === 'Low');
      }
    }

    return {
      success: true,
      data: merged
    };
  }

  static async getAnalysisDetails(id: string): Promise<ApiResponse<ContractHistoryItem>> {
    const localItems = await this.loadLocalItems();
    const found = localItems.find(i => i._id === id || i.versionGroupId === id);
    if (found) {
      return { success: true, data: found };
    }

    try {
      const response = await apiClient.get<ApiResponse<ContractHistoryItem>>(`/contract-analysis/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch contract details',
      };
    }
  }

  static async updateAnalysis(id: string, payload: {
    contractName?: string;
    caseId?: string | null;
    notes?: string;
    tags?: string[];
  }): Promise<ApiResponse<ContractHistoryItem>> {
    const updatedLocal = await this.updateLocalItem(id, payload);

    try {
      const response = await apiClient.put<ApiResponse<ContractHistoryItem>>(`/contract-analysis/${id}`, payload);
      if (response.data && response.data.success && response.data.data) {
        await this.saveLocalItem(response.data.data);
        return response.data;
      }
    } catch (error: any) {
      console.warn('[ContractHistoryService] Server update failed, local updated:', error?.message);
    }

    if (updatedLocal) {
      return { success: true, data: updatedLocal };
    }

    return {
      success: false,
      error: 'Failed to update contract metadata'
    };
  }

  static async deleteAnalysis(id: string): Promise<ApiResponse<{ deletedCount: number }>> {
    await this.deleteLocalItem(id);

    try {
      await apiClient.delete<ApiResponse<{ deletedCount: number }>>(`/contract-analysis/${id}`);
    } catch (error: any) {
      console.warn('[ContractHistoryService] Server delete failed, local deleted:', error?.message);
    }

    return {
      success: true,
      data: { deletedCount: 1 }
    };
  }

  static async listVersions(versionGroupId: string): Promise<ApiResponse<ContractHistoryItem[]>> {
    const localItems = await this.loadLocalItems();
    const versions = localItems.filter(i => i.versionGroupId === versionGroupId);

    try {
      const response = await apiClient.get<ApiResponse<ContractHistoryItem[]>>(`/contract-analysis/versions/${versionGroupId}`);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const map = new Map<string, ContractHistoryItem>();
        response.data.data.forEach(v => map.set(v._id, v));
        versions.forEach(v => map.set(v._id, v));
        return { success: true, data: Array.from(map.values()) };
      }
    } catch (error: any) {
      console.warn('[ContractHistoryService] Remote listVersions error, using local:', error?.message);
    }

    return {
      success: true,
      data: versions
    };
  }
}
