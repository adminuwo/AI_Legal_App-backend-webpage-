/**
 * AI Legal Mobile - useChat Custom Hook
 * Handles general copilot messaging flows, streaming response assembly, and session logs history.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useChatStore } from '../store/chat';
import { ChatService } from '../services/chat.service';
import { streamAIResponse, uploadFileMultipart } from '../api/client';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { ChatMessage, ChatSession } from '../types';
import { useUserStore } from '../store/user';
import { useLocalLanguageStore } from '../localization';
import { useNetwork } from './use-network';
import { StorageService } from '../services/storage.service';
import { StorageKeys } from '../constants/app-constants';
import { AppConfig } from '../config';
import { useWorkspaceStore } from '../store/workspace';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { getGlobalActiveWorkspaceId, getGlobalActiveWorkspaceType } from '../providers/workspace.provider';

function parseMobileChatError(err: any, isOffline: boolean): { type: ChatMessage['errorType']; message: string } {
  if (isOffline) {
    return {
      type: 'offline',
      message: 'No Internet Connection\n\nPlease reconnect and try again.',
    };
  }

  const message = err.message || String(err);
  const status = err.status;

  if (message.includes('PREMIUM_ONLY') || message.includes('restricted to AI Legal Pro') || message.includes('premium feature')) {
    return {
      type: 'general',
      message: 'Subscription Required\n\nThis premium feature is restricted to AI Legal Pro users. Contact support to request trial access.',
    };
  }
  if (message.includes('OUT_OF_CREDITS') || message.includes('credits') || message.includes('limit')) {
    return {
      type: 'general',
      message: 'Credits Exhausted\n\nYou have run out of credits. Please upgrade your plan or wait for credit replenishment.',
    };
  }

  if (message.includes('VALIDATION_SESSION_ID_MISSING')) {
    return { type: 'general', message: '⚠️ Session ID is missing. Please restart the conversation.' };
  }
  if (message.includes('VALIDATION_TOKEN_MISSING')) {
    return { type: 'general', message: '⚠️ Authentication token is missing. Please log in again.' };
  }
  if (message.includes('VALIDATION_JURISDICTION_MISSING')) {
    return { type: 'general', message: '⚠️ Jurisdiction context is missing. Please set the case country/jurisdiction.' };
  }
  if (message.includes('VALIDATION_PROMPT_INVALID')) {
    return { type: 'general', message: '⚠️ Prompt payload is invalid. Message cannot be empty.' };
  }
  if (message.includes('VALIDATION_ENDPOINT_INVALID')) {
    return { type: 'general', message: '⚠️ AI endpoint URL is incorrect. Please verify configuration.' };
  }
  if (message.includes('EMPTY_RESPONSE')) {
    return { type: 'general', message: "⚠️ I couldn't process your request right now.\n\nPlease check your internet connection or try again in a moment." };
  }

  if (message.includes('timeout') || message.includes('timed out') || err.code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      message: 'Request Timed Out\n\nThe AI is taking longer than expected. Please try again.',
    };
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return {
      type: 'server',
      message: 'AI Service Temporarily Unavailable\n\nPlease try again in a few moments.',
    };
  }

  return {
    type: 'general',
    message: `Error Processing Prompt\n\n${message}`,
  };
}

export function useChat(activeToolNamespace = 'legal_my_case') {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isConnected } = useNetwork();
  const navigation = useNavigation();

  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const addSession = useChatStore((s) => s.addSession);
  const setSessions = useChatStore((s) => s.setSessions);
  const updateSession = useChatStore((s) => s.updateSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loading = useChatStore((s) => s.loading);
  const setLoading = useChatStore((s) => s.setLoading);

  const setActiveSessionId = useCallback((sessionId: string | null) => {
    useChatStore.getState().setActiveSessionIdForTool(activeToolNamespace, sessionId);
  }, [activeToolNamespace]);

  /**
   * Start a brand new workspace session.
   */
  const startNewSession = useCallback((title = 'New Legal Query', activeTool = activeToolNamespace) => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      sessionId: newSessionId,
      title,
      messages: [],
      lastModified: Date.now(),
      activeTool,
    };
    addSession(newSession);
    setActiveSessionId(newSessionId);
    return newSessionId;
  }, [activeToolNamespace, addSession, setActiveSessionId]);

  // Create a fresh session every time the screen is focused (Part 2: Every assistant opens a fresh chat)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      startNewSession();
    });
    return unsubscribe;
  }, [navigation, startNewSession]);

  // Subscribe to all sessions but filter them by tool namespace (Objective 1)
  const allSessions = useChatStore((s) => s.sessions);
  const sessions = useMemo(() => {
    return allSessions.filter((s) => s.activeTool === activeToolNamespace);
  }, [allSessions, activeToolNamespace]);

  // Subscribe to tool-specific active session ID (Objective 1)
  const activeSessionId = useChatStore((s) => s.activeSessionIdByTool[activeToolNamespace] || null);

  const getActiveSession = useCallback((): ChatSession | null => {
    return sessions.find((s) => s.sessionId === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  /**
   * Loads all previous chat sessions list for the current active user.
   */
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ChatService.listSessions();
      const sessionList = Array.isArray(res) ? res : (res?.data || []);
      setSessions(sessionList as ChatSession[]);
      
      // Auto-resume is disabled as per Master Prompt requirements to keep assistant conversations fresh on launch
    } catch (err: any) {
      console.error('[useChat] listSessions error:', err);
      setError(err.message || 'Failed to retrieve conversation history.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the complete message log detail for a specific session ID.
   */
  const fetchSessionDetails = async (sessionId: string) => {
    const localSession = sessions.find((s) => s.sessionId === sessionId);
    
    // If it's a local-only session that hasn't been saved on the server yet, don't attempt to fetch it
    if (localSession && !localSession._id && !localSession.createdAt) {
      return;
    }

    // If we already have messages in memory, don't fetch them again
    if (localSession && localSession.messages && localSession.messages.length > 0) {
      return;
    }

    setError(null);
    try {
      const res = await ChatService.getSessionDetails(sessionId);
      const detailSession = (res as any).data || res;
      if (detailSession) {
        updateSession(sessionId, {
          messages: detailSession.messages || [],
        });
      }
    } catch (err: any) {
      console.warn('[useChat] getSessionDetails sync warning (ignoring for potential local sessions):', err);
    }
  };



  /**
   * Delete a conversation session permanently.
   */
  const deleteChatSession = async (sessionId: string) => {
    setError(null);
    // Remove locally first so the UI updates instantly
    deleteSession(sessionId);
    try {
      const localSession = sessions.find((s) => s.sessionId === sessionId);
      const isLocalOnly = !localSession || (!localSession._id && !localSession.createdAt);
      if (!isLocalOnly) {
        await ChatService.deleteSession(sessionId);
      }
    } catch (err: any) {
      console.warn('[useChat] deleteSession remote warning:', err);
    }
  };

  /**
   * Rename a conversation session.
   */
  const renameChatSession = async (sessionId: string, newTitle: string) => {
    setError(null);
    try {
      await ChatService.renameSession(sessionId, newTitle);
      updateSession(sessionId, { title: newTitle });
    } catch (err: any) {
      console.error('[useChat] renameSession error:', err);
      setError(err.message || 'Failed to update title.');
    }
  };

  /**
   * Cancel the current streaming session.
   */
  const cancelMessageStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSending(false);

    // Stop processing spinner on the active session's messages immediately
    const currentSessionId = useChatStore.getState().activeSessionId;
    if (currentSessionId) {
      const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
      if (activeSession && activeSession.messages) {
        const updatedMessages = activeSession.messages.map((m) =>
          m.isProcessing ? { ...m, isProcessing: false } : m
        );
        useChatStore.getState().updateSession(currentSessionId, {
          messages: updatedMessages,
        });
      }
    }
  }, []);

  /**
   * Dispatch a new user message query, invoking backend SSE streaming channels.
   */
  const dispatchMessageStream = async (
    content: string, 
    activeTool = activeToolNamespace, 
    attachments: any[] = [], 
    editMessageId?: string,
    projectId?: string,
    outputLanguageParam?: string
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = startNewSession(content.trim().slice(0, 32) || 'New Query', activeTool);
    }

    let userMessageId = `msg_${Date.now()}`;

    if (!isConnected) {
      setSending(false);
      if (!editMessageId) {
        const userMessage: ChatMessage = {
          id: userMessageId,
          role: 'user',
          content,
          timestamp: Date.now(),
          attachments,
        };
        useChatStore.getState().addMessage(currentSessionId, userMessage);
      }

      const placeholderAiMessageId = `msg_ai_${Date.now()}`;
      const placeholderAiMessage: ChatMessage = {
        id: placeholderAiMessageId,
        role: 'model',
        content: 'No Internet Connection\n\nPlease reconnect and try again.',
        error: true,
        errorType: 'offline',
        timestamp: Date.now() + 1,
        isProcessing: false,
      };
      useChatStore.getState().addMessage(currentSessionId, placeholderAiMessage);
      return;
    }
    
    if (editMessageId) {
      const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
      if (activeSession && activeSession.messages) {
        const msgIdx = activeSession.messages.findIndex((m) => m.id === editMessageId);
        if (msgIdx !== -1) {
          const editedMsg = {
            ...activeSession.messages[msgIdx],
            content,
            timestamp: Date.now(),
          };
          const trimmedMessages = [
            ...activeSession.messages.slice(0, msgIdx),
            editedMsg
          ];
          useChatStore.getState().updateSession(currentSessionId, {
            messages: trimmedMessages,
          });
          userMessageId = editMessageId;
        }
      }
    } else {
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments,
      };
      // Add user message to active session
      useChatStore.getState().addMessage(currentSessionId, userMessage);
    }

    const placeholderAiMessageId = `msg_ai_${Date.now()}`;
    const placeholderAiMessage: ChatMessage = {
      id: placeholderAiMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isProcessing: true,
    };

    // Add model processing placeholder
    useChatStore.getState().addMessage(currentSessionId, placeholderAiMessage);
    setSending(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await StorageService.getSecret(StorageKeys.AuthToken);
      const activeCaseId = useWorkspaceStore.getState().activeCaseId;
      const activeCase = activeCaseId ? useWorkspaceStore.getState().workspaces[activeCaseId] as any : null;
      const jurisdiction = activeCase?.jurisdiction || activeCase?.country || useUserStore.getState().profile?.jurisdiction || 'India';

      if (!currentSessionId) {
        throw new Error('VALIDATION_SESSION_ID_MISSING');
      }
      if (!token) {
        throw new Error('VALIDATION_TOKEN_MISSING');
      }
      if (activeToolNamespace === 'legal_my_case' && activeCaseId && !jurisdiction) {
        throw new Error('VALIDATION_JURISDICTION_MISSING');
      }
      if (!content.trim() && attachments.length === 0) {
        throw new Error('VALIDATION_PROMPT_INVALID');
      }
      if (!AppConfig.apiUrl || !AppConfig.apiUrl.startsWith('http')) {
        throw new Error('VALIDATION_ENDPOINT_INVALID');
      }

      // 1. Upload local attachments and update message in store with public GCS URLs
      let uploadedAttachments = [...attachments];
      if (attachments.length > 0 && !editMessageId) {
        const uploadedList = [];
        for (const [idx, attachment] of attachments.entries()) {
          const isLocal = attachment.url.startsWith('file://') || attachment.url.startsWith('content://') || (Platform.OS === 'ios' && attachment.url.startsWith('/'));
          if (isLocal) {
            let uploadedUrl = attachment.url;
            
            // General Chat / Tool Chat upload context
            const response = await uploadFileMultipart<{
              success: boolean;
              data: { url: string; mimetype: string; filename: string; size: number };
            }>(
              '/chat/upload',
              attachment.url,
              attachment.name,
              attachment.type || 'application/octet-stream'
            );
            if (response.success && response.data) {
              uploadedUrl = response.data.url;
            } else {
              throw new Error(`Failed to upload ${attachment.name}`);
            }

            // Optional: Read base64 data for Vertex AI engine prompt inputs
            let base64 = '';
            try {
              base64 = await FileSystem.readAsStringAsync(attachment.url, {
                encoding: 'base64',
              });
            } catch (readErr) {
              console.warn('[useChat] Base64 conversion warning:', readErr);
            }

            const uploadedObj = {
              name: attachment.name,
              type: attachment.type,
              url: uploadedUrl,
              size: attachment.size,
              base64Data: base64,
            };
            uploadedList.push(uploadedObj);

            // Update user message in store to show real public GCS URL
            const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
            if (activeSession && activeSession.messages) {
              const updatedMessages = activeSession.messages.map((m) => {
                if (m.id === userMessageId) {
                  const updatedAttach = (m.attachments || []).map((a) =>
                    a.name === attachment.name ? { ...a, url: uploadedUrl } : a
                  );
                  return { ...m, attachments: updatedAttach };
                }
                return m;
              });
              useChatStore.getState().updateSession(currentSessionId, { messages: updatedMessages });
            }
          } else {
            uploadedList.push(attachment);
          }
        }
        uploadedAttachments = uploadedList;
      }

      // Find the active session using store to get historical turns
      const currentSessions = useChatStore.getState().sessions;
      const activeSession = currentSessions.find((s) => s.sessionId === currentSessionId);
      
      const history = activeSession
        ? (activeSession.messages || [])
            .filter((m) => m.id !== placeholderAiMessageId)
            .map((m) => ({ role: m.role, content: m.content }))
        : [];

      let targetOutputLang = outputLanguageParam;
      if (!targetOutputLang && activeTool) {
        try {
          const hyphenKey = activeTool.replace(/^legal_/, '').replace(/_/g, '-');
          const savedLang = (await AsyncStorage.getItem(`@ai_tool_lang_${activeTool}`)) ||
                            (await AsyncStorage.getItem(`@ai_tool_lang_${hyphenKey}`));
          if (savedLang) targetOutputLang = savedLang;
        } catch (_) {}
      }

      const userLang = targetOutputLang || useUserStore.getState().profile?.personalizations?.general?.language || useLocalLanguageStore.getState().localLanguage || 'English';

      const resolvedProjectId = projectId || (activeSession as any)?.projectId || (activeSession as any)?.caseId;

      const activeWorkspaceId = getGlobalActiveWorkspaceId ? getGlobalActiveWorkspaceId() : 'personal_practice';
      const activeWorkspaceType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : 'personal';

      // Build unified chat query payload
      const payload: Record<string, any> = {
        content,
        sessionId: currentSessionId,
        activeTool,
        stream: true,
        history,
        language: userLang,
        outputLanguage: userLang,
        workspaceId: activeWorkspaceId,
        workspaceType: activeWorkspaceType
      };

      if (resolvedProjectId) {
        payload.projectId = resolvedProjectId;
        payload.caseId = resolvedProjectId;
      }

      if (uploadedAttachments.length > 0) {
        const docAttachments = uploadedAttachments.filter(
          (a) => !a.type?.startsWith('audio/') && !a.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i)
        );
        if (docAttachments.length > 0) {
          payload.document = docAttachments.map((a) => ({
            name: a.name,
            mimeType: a.type,
            base64Data: a.base64Data || '',
            url: a.url,
          }));
        }
      }

      // Stream SSE data chunks in real time
      const stream = streamAIResponse('/chat', payload, controller.signal);
      let accumulatedText = '';
      
      for await (const token of stream) {
        if (controller.signal.aborted) {
          break;
        }
        accumulatedText += token;
        updateMessage(currentSessionId, placeholderAiMessageId, {
          content: accumulatedText,
        });
      }

      if (controller.signal.aborted) {
        updateMessage(currentSessionId, placeholderAiMessageId, {
          isProcessing: false,
        });
        return;
      }

      if (!accumulatedText.trim()) {
        throw new Error('EMPTY_RESPONSE');
      }

      // Stop processing spinner
      updateMessage(currentSessionId, placeholderAiMessageId, {
        isProcessing: false,
      });

      // Refetch subscription status in real-time after successful chat stream
      try {
        const { useSubscriptionStore } = await import('../store/subscription');
        useSubscriptionStore.getState().fetchSubscriptionStatus();
      } catch (_) {}

      // Background-sync metadata fields like generated titles and follow-up prompts
      setTimeout(async () => {
        try {
          if (controller.signal.aborted) {
            return;
          }
          if (currentSessionId) {
            const detailsRes = await ChatService.getSessionDetails(currentSessionId);
            if (controller.signal.aborted) {
              return;
            }
            const detailSession = (detailsRes as any).data || detailsRes;
            if (detailSession) {
              updateSession(currentSessionId, {
                title: detailSession.title,
                messages: detailSession.messages || [],
                _id: detailSession._id,
                createdAt: detailSession.createdAt,
              });
            }
          }
        } catch (e) {
          console.warn('[useChat] Failed to sync post-stream metadata:', e);
        }
      }, 1000);

    } catch (err: any) {
      if (controller.signal.aborted) {
        updateMessage(currentSessionId, placeholderAiMessageId, {
          isProcessing: false,
        });
      } else {
        console.warn('[useChat] dispatchMessageStream catch block:', err);
        setError(err.message || String(err));
        
        // Rollback: Remove the user message and the placeholder from the session
        const activeSession = useChatStore.getState().sessions.find((s) => s.sessionId === currentSessionId);
        if (activeSession && activeSession.messages) {
          const filteredMessages = activeSession.messages.filter(
            (m) => (editMessageId ? m.id !== placeholderAiMessageId : (m.id !== userMessageId && m.id !== placeholderAiMessageId))
          );
          useChatStore.getState().updateSession(currentSessionId, { messages: filteredMessages });
        }
        
        throw err;
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  return {
    sessions,
    activeSessionId,
    activeSession: getActiveSession(),
    sending,
    error,
    loading,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  };
}
