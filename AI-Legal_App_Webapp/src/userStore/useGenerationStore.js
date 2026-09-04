/**
 * ============================================================
 * useGenerationStore.js  –  Global Parallel Generation State
 * ============================================================
 * Zustand store that tracks every active / completed generation
 * session independently. Each chat gets its own slice so that
 * navigating between chats NEVER interrupts ongoing streams.
 *
 * Shape of one generation entry:
 * {
 *   chatId          : string          – the sessionId
 *   isGenerating    : boolean
 *   partialResponse : string          – tokens received so far
 *   streamedTokens  : number          – word / token count
 *   error           : string | null
 *   abortController : AbortController | null  (NOT serialisable – kept in ref map)
 *   startedAt       : number | null   – Date.now()
 *   completedAt     : number | null
 *   loadingText     : string
 *   typingMessageId : string | null   – the AI message being streamed
 * }
 * ============================================================
 */
import { create } from 'zustand';

// ─── Abort-controller registry (not in zustand, avoids serialisation issues) ───
const _abortControllers = new Map(); // chatId → AbortController

export const useGenerationStore = create((set, get) => ({
  // map of chatId → generation state
  generations: {},

  // map of chatId → message history [ {id, role, content...} ]
  messagesByChat: {},

  // ── Message Mutations ──────────────────────────────────────────────────────

  /** Sets the entire message history for a specific chat */
  setMessagesForChat: (chatId, messages) => {
    set(state => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages,
      },
    }));
  },

  /** Appends one or more messages to a specific chat */
  appendMessagesToChat: (chatId, newMessages) => {
    set(state => {
      const prev = state.messagesByChat[chatId] || [];
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: [...prev, ...(Array.isArray(newMessages) ? newMessages : [newMessages])],
        },
      };
    });
  },

  /** Updates a specific message inside a chat (e.g. for tool results or edits) */
  updateMessageInChat: (chatId, messageId, updater) => {
    set(state => {
      const prev = state.messagesByChat[chatId] || [];
      const next = prev.map(m => {
        if (m.id === messageId) {
          return typeof updater === 'function' ? updater(m) : { ...m, ...updater };
        }
        return m;
      });
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: next,
        },
      };
    });
  },

  /** Clears messages for a specific chat */
  clearMessagesForChat: (chatId) => {
    set(state => {
      const next = { ...state.messagesByChat };
      delete next[chatId];
      return { messagesByChat: next };
    });
  },

  // ── Existing Accessors ─────────────────────────────────────────────────────


  /** Returns the generation state for a specific chat (or a default) */
  getGeneration: (chatId) => {
    return get().generations[chatId] ?? {
      chatId,
      isGenerating: false,
      partialResponse: '',
      streamedTokens: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      loadingText: 'AI LEGAL™ is thinking...',
      typingMessageId: null,
    };
  },

  /** True if ANY chat is currently generating */
  isAnyGenerating: () => {
    return Object.values(get().generations).some(g => g.isGenerating);
  },

  /** List of chatIds that are currently generating */
  generatingChatIds: () => {
    return Object.entries(get().generations)
      .filter(([, g]) => g.isGenerating)
      .map(([id]) => id);
  },

  // ── Mutations ─────────────────────────────────────────────────────────────

  /** Called when we START streaming for a chat */
  startGeneration: (chatId, { loadingText = 'AI LEGAL™ is thinking...', typingMessageId = null } = {}) => {
    if (!chatId) return null;
    // Create a fresh AbortController
    const controller = new AbortController();
    _abortControllers.set(chatId, controller);

    set(state => ({
      generations: {
        ...state.generations,
        [chatId]: {
          chatId,
          isGenerating: true,
          partialResponse: '',
          streamedTokens: 0,
          error: null,
          startedAt: Date.now(),
          completedAt: null,
          loadingText,
          typingMessageId,
        },
      },
    }));

    return controller;
  },

  /** Transitions generation state and messages from one ID to another (e.g. 'new' -> real ID) */
  transitionChatId: (oldId, newId) => {
    if (oldId === newId) return;
    set(state => {
      const gen = state.generations[oldId];
      const msgs = state.messagesByChat[oldId];
      
      const newGenerations = { ...state.generations };
      const newMessagesByChat = { ...state.messagesByChat };

      if (gen) {
        newGenerations[newId] = { ...gen, chatId: newId };
        delete newGenerations[oldId];
      }
      
      if (msgs) {
        newMessagesByChat[newId] = msgs;
        delete newMessagesByChat[oldId];
      }

      // Also move the abort controller
      const controller = _abortControllers.get(oldId);
      if (controller) {
        _abortControllers.set(newId, controller);
        _abortControllers.delete(oldId);
      }

      return { 
        generations: newGenerations,
        messagesByChat: newMessagesByChat
      };
    });
  },

  /** Called for EVERY new token / word streamed */
  appendToken: (chatId, token, typingMessageId) => {
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: {
            ...prev,
            partialResponse: prev.partialResponse + token,
            streamedTokens: prev.streamedTokens + 1,
            typingMessageId: typingMessageId ?? prev.typingMessageId,
          },
        },
      };
    });
  },

  /** Bulk-set the partial response (e.g. to avoid O(n²) in large streams) */
  setPartialResponse: (chatId, text, typingMessageId) => {
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: {
            ...prev,
            partialResponse: text,
            typingMessageId: typingMessageId ?? prev.typingMessageId,
          },
        },
      };
    });
  },

  /** Update loadingText mid-stream (e.g. "Thinking…" → "Generating...") */
  setLoadingText: (chatId, loadingText) => {
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: { ...prev, loadingText },
        },
      };
    });
  },

  /** Called when generation completes successfully */
  completeGeneration: (chatId) => {
    _abortControllers.delete(chatId);
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: {
            ...prev,
            isGenerating: false,
            completedAt: Date.now(),
            typingMessageId: null,
          },
        },
      };
    });
  },

  /** Called when generation fails */
  failGeneration: (chatId, error) => {
    _abortControllers.delete(chatId);
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: {
            ...prev,
            isGenerating: false,
            error: typeof error === 'string' ? error : (error?.message ?? 'Unknown error'),
            completedAt: Date.now(),
            typingMessageId: null,
          },
        },
      };
    });
  },

  /** Abort generation for a specific chat */
  abortGeneration: (chatId) => {
    const controller = _abortControllers.get(chatId);
    if (controller) {
      controller.abort();
      _abortControllers.delete(chatId);
    }
    set(state => {
      const prev = state.generations[chatId];
      if (!prev) return state;
      return {
        generations: {
          ...state.generations,
          [chatId]: {
            ...prev,
            isGenerating: false,
            completedAt: Date.now(),
            typingMessageId: null,
          },
        },
      };
    });
  },

  /** Get the AbortController for a chat (live reference) */
  getAbortController: (chatId) => {
    return _abortControllers.get(chatId) ?? null;
  },

  /** Remove stale completed generation entry to free memory */
  clearGeneration: (chatId) => {
    set(state => {
      const next = { ...state.generations };
      delete next[chatId];
      return { generations: next };
    });
  },
}));

// ── Convenience selectors (stable references via shallow) ──────────────────────
export const selectIsGenerating = (chatId) => (state) =>
  state.generations[chatId]?.isGenerating ?? false;

export const selectGeneratingChatIds = (state) =>
  Object.entries(state.generations)
    .filter(([, g]) => g.isGenerating)
    .map(([id]) => id);

export const selectPartialResponse = (chatId) => (state) =>
  state.generations[chatId]?.partialResponse ?? '';

export const selectLoadingText = (chatId) => (state) =>
  state.generations[chatId]?.loadingText ?? 'AI LEGAL™ is thinking...';

export const selectTypingMessageId = (chatId) => (state) =>
  state.generations[chatId]?.typingMessageId ?? null;
