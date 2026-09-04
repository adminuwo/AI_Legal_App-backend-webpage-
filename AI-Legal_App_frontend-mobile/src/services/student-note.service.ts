import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '../types';

export interface StudentNoteItem {
  _id?: string;
  id?: string;
  userId?: string;
  title: string;
  originalInput?: string;
  inputSource?: 'ai_topic' | 'typed' | 'voice' | 'mixed';
  academicLevel?: string;
  noteFormat?: string;
  generatedNotes: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class StudentNoteService {
  /**
   * List all saved student notes for logged-in user.
   */
  static async listNotes(): Promise<ApiResponse<StudentNoteItem[]>> {
    const response = await apiClient.get(API_ENDPOINTS.StudentNotes.Base);
    const data = response.data;
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    if (data && Array.isArray(data.notes)) {
      return { success: true, data: data.notes };
    }
    return data;
  }

  /**
   * Save a new student note.
   */
  static async saveNote(payload: {
    title: string;
    originalInput?: string;
    inputSource?: string;
    academicLevel?: string;
    noteFormat?: string;
    generatedNotes: string;
    language?: string;
  }): Promise<ApiResponse<StudentNoteItem>> {
    const response = await apiClient.post(API_ENDPOINTS.StudentNotes.Base, payload);
    const data = response.data;
    if (data && (data._id || data.id || data.note)) {
      return { success: true, data: data.note || data };
    }
    return data;
  }

  /**
   * Update an existing saved note.
   */
  static async updateNote(
    noteId: string,
    updates: {
      title?: string;
      generatedNotes?: string;
      noteFormat?: string;
      academicLevel?: string;
    }
  ): Promise<ApiResponse<StudentNoteItem>> {
    const response = await apiClient.put(API_ENDPOINTS.StudentNotes.Details(noteId), updates);
    const data = response.data;
    if (data && (data._id || data.id || data.note)) {
      return { success: true, data: data.note || data };
    }
    return data;
  }

  /**
   * Delete a saved note.
   */
  static async deleteNote(noteId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(API_ENDPOINTS.StudentNotes.Details(noteId));
    return response.data;
  }
}
