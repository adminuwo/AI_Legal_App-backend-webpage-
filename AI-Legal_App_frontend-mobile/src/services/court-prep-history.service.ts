import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';
import { apiClient } from '../api/client';

export interface CourtPrepHistoryItem {
  _id: string;
  userId: string;
  caseTitle: string;
  caseType: string;
  courtLevel?: string;
  petitionerName?: string;
  respondentName?: string;
  sectionsData: any[];
  intelligenceData?: any[];
  refinementMode?: string;
  outputLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = '@ai_legal_court_prep_history_v1';

export class CourtPrepHistoryService {
  private static async loadLocalItems(): Promise<CourtPrepHistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[CourtPrepHistoryService] Error loading local storage items:', e);
      return [];
    }
  }

  private static async saveLocalItem(item: CourtPrepHistoryItem): Promise<void> {
    try {
      const items = await this.loadLocalItems();
      const idx = items.findIndex((i) => i._id === item._id);
      if (idx >= 0) {
        items[idx] = item;
      } else {
        items.unshift(item);
      }
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[CourtPrepHistoryService] Error saving local storage item:', e);
    }
  }

  private static async deleteLocalItem(id: string): Promise<void> {
    try {
      const items = await this.loadLocalItems();
      const filtered = items.filter((i) => i._id !== id);
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[CourtPrepHistoryService] Error deleting local storage item:', e);
    }
  }

  private static async updateLocalItem(
    id: string,
    updates: Partial<CourtPrepHistoryItem>
  ): Promise<CourtPrepHistoryItem | null> {
    try {
      const items = await this.loadLocalItems();
      const target = items.find((i) => i._id === id);
      if (target) {
        Object.assign(target, updates, { updatedAt: new Date().toISOString() });
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
        return target;
      }
      return null;
    } catch (e) {
      console.warn('[CourtPrepHistoryService] Error updating local storage item:', e);
      return null;
    }
  }

  static async saveDossier(payload: Partial<CourtPrepHistoryItem>): Promise<ApiResponse<CourtPrepHistoryItem>> {
    const now = new Date().toISOString();
    const item: CourtPrepHistoryItem = {
      _id: payload._id || `prep_${Date.now()}`,
      userId: payload.userId || 'user_local',
      caseTitle: payload.caseTitle || payload.caseType || 'Court Hearing Preparation',
      caseType: payload.caseType || 'General Litigation',
      courtLevel: payload.courtLevel || 'District Court',
      petitionerName: payload.petitionerName || '',
      respondentName: payload.respondentName || '',
      sectionsData: payload.sectionsData || [],
      intelligenceData: payload.intelligenceData || [],
      refinementMode: payload.refinementMode || 'balanced',
      outputLanguage: payload.outputLanguage || 'English',
      createdAt: payload.createdAt || now,
      updatedAt: now
    };

    await this.saveLocalItem(item);

    try {
      await apiClient.post('/court-prep/history', payload);
    } catch (err: any) {
      console.warn('[CourtPrepHistoryService] Server save failed, saved locally:', err?.message);
    }

    return {
      success: true,
      data: item
    };
  }

  static async getHistory(params?: { search?: string }): Promise<ApiResponse<CourtPrepHistoryItem[]>> {
    const localItems = await this.loadLocalItems();
    let remoteItems: CourtPrepHistoryItem[] = [];

    try {
      const response = await apiClient.get<ApiResponse<CourtPrepHistoryItem[]>>('/court-prep/history');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        remoteItems = response.data.data;
      }
    } catch (err: any) {
      console.warn('[CourtPrepHistoryService] Server getHistory failed, using local:', err?.message);
    }

    const map = new Map<string, CourtPrepHistoryItem>();
    remoteItems.forEach((i) => map.set(i._id, i));
    localItems.forEach((i) => map.set(i._id, i));

    let merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      merged = merged.filter((i) =>
        (i.caseTitle && i.caseTitle.toLowerCase().includes(q)) ||
        (i.caseType && i.caseType.toLowerCase().includes(q))
      );
    }

    return {
      success: true,
      data: merged
    };
  }

  static async updateDossier(id: string, updates: Partial<CourtPrepHistoryItem>): Promise<ApiResponse<CourtPrepHistoryItem>> {
    const updated = await this.updateLocalItem(id, updates);
    try {
      await apiClient.put(`/court-prep/history/${id}`, updates);
    } catch (err: any) {
      console.warn('[CourtPrepHistoryService] Server update failed, updated locally:', err?.message);
    }

    if (updated) {
      return { success: true, data: updated };
    }
    return { success: false, error: 'Failed to update dossier' };
  }

  static async deleteDossier(id: string): Promise<ApiResponse<any>> {
    await this.deleteLocalItem(id);
    try {
      await apiClient.delete(`/court-prep/history/${id}`);
    } catch (err: any) {
      console.warn('[CourtPrepHistoryService] Server delete failed, deleted locally:', err?.message);
    }
    return { success: true, message: 'Dossier deleted successfully' };
  }
}
