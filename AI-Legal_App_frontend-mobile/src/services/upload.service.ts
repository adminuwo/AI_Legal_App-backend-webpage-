/**
 * AI Legal Mobile - File Upload Service
 * Manages multipart uploads of case documents, evidence briefs, and user profile pictures.
 */

import { uploadFileMultipart } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseDocument, CaseEvidence, CaseContract } from '../types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'application/zip',
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/aac',
  'video/mp4',
  'video/quicktime',
];

export class UploadService {
  /**
   * Uploads case file under active project folder.
   */
  static async uploadCaseDocument(
    caseId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    documentType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other',
    sharingOptions?: {
      visibility?: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
      sharedWith?: string;
      defaultPermissions?: string;
    } | ((progress: number) => void),
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<CaseDocument>> {
    let sharing: any = {};
    let progressCb = onProgress;

    if (typeof sharingOptions === 'function') {
      progressCb = sharingOptions;
    } else if (sharingOptions) {
      sharing = sharingOptions;
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(`File type ${mimeType} is not supported. Supported extensions: PDF, DOC, DOCX, TXT, RTF, JPG, PNG, WEBP, ZIP, Audio, Video.`);
    }

    const endpoint = API_ENDPOINTS.Cases.Documents(caseId);
    return uploadFileMultipart<ApiResponse<CaseDocument>>(
      endpoint,
      fileUri,
      fileName,
      mimeType,
      {
        type: documentType,
        visibility: sharing.visibility || 'TEAM',
        sharedWith: sharing.sharedWith || '[]',
        defaultPermissions: sharing.defaultPermissions || '{}',
      },
      progressCb,
      signal
    );
  }

  /**
   * Uploads case evidence block with optional metadata to the vault.
   */
  static async uploadEvidence(
    caseId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    extraData: { description?: string; notes?: string; tags?: string; type?: string; exhibitNumber?: string; visibility?: string; sharedWith?: string; defaultPermissions?: string } = {},
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<CaseEvidence>> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(`File type ${mimeType} is not supported. Supported extensions: PDF, DOC, DOCX, TXT, RTF, JPG, PNG, WEBP, ZIP, Audio, Video.`);
    }

    const endpoint = API_ENDPOINTS.Cases.Evidence(caseId);
    const dataToSend: Record<string, string> = {};
    Object.keys(extraData).forEach((key) => {
      const val = extraData[key as keyof typeof extraData];
      if (val !== undefined) {
        dataToSend[key] = val;
      }
    });

    return uploadFileMultipart<ApiResponse<CaseEvidence>>(
      endpoint,
      fileUri,
      fileName,
      mimeType,
      dataToSend,
      onProgress,
      signal
    );
  }

  /**
   * Upload user profile avatar photo.
   */
  static async uploadAvatar(
    fileUri: string,
    fileName: string,
    mimeType: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<{ avatar: string }>> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error('Unsupported image format for profile avatar.');
    }

    return uploadFileMultipart<ApiResponse<{ avatar: string }>>(
      API_ENDPOINTS.User.Avatar,
      fileUri,
      fileName,
      mimeType,
      {},
      undefined,
      signal
    );
  }

  /**
   * Uploads a contract document file to the GCS contract pipeline.
   */
  static async uploadContract(
    caseId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<CaseContract>> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(`File type ${mimeType} is not supported. Supported extensions: PDF, DOC, DOCX, TXT, RTF, JPG, PNG, WEBP, ZIP.`);
    }

    const endpoint = API_ENDPOINTS.Cases.Contracts(caseId);
    return uploadFileMultipart<ApiResponse<CaseContract>>(
      endpoint,
      fileUri,
      fileName,
      mimeType,
      {},
      onProgress,
      signal
    );
  }
}
