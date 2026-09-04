/**
 * ============================================================
 * useChatGeneration.js  –  Per-Chat Generation Hook
 * ============================================================
 * This hook is the SINGLE interface between Chat.jsx and the
 * global generation store. It:
 *
 *  1. Reads isGenerating / partialResponse / typingMessageId
 *     for the given chatId from the Zustand store
 *  2. Exposes startGeneration / appendToken / complete / fail /
 *     abort helpers
 *  3. Syncs the messages state back into the global store as
 *     tokens arrive so returning to the chat shows live progress
 *
 * Usage inside Chat.jsx:
 *
 *   const gen = useChatGeneration(currentSessionId);
 *   // Replace: setIsLoading(true) → gen.start(...)
 *   // Replace: setIsLoading(false) → gen.complete()
 *   // Replace: abortControllerRef.current → gen.abortController
 *   // Replace: setTypingMessageId → gen.setTypingMessageId
 *   // Read:    gen.isGenerating, gen.loadingText
 * ============================================================
 */
import { useCallback, useEffect, useRef } from 'react';
import { useGenerationStore } from '../userStore/useGenerationStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * @param {string} chatId  The current session/chat ID
 * @returns generation helpers + state selectors
 */
export const useChatGeneration = (chatId) => {
  const store = useGenerationStore;

  // ── Stable snapshot refs to avoid stale closures ──────────────────────────
  const chatIdRef = useRef(chatId);
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);

  // ── State readers (re-render on change) ───────────────────────────────────
  const generation = useGenerationStore(state => state.generations[chatId]);
  const isGenerating = generation?.isGenerating ?? false;
  const partialResponse = generation?.partialResponse ?? '';
  const streamedTokens = generation?.streamedTokens ?? 0;
  const loadingText = generation?.loadingText ?? 'AI LEGAL™ is thinking...';
  const typingMessageId = generation?.typingMessageId ?? null;
  const generationError = generation?.error ?? null;

  // ── Mutations (stable callbacks) ──────────────────────────────────────────
  const start = useCallback((options = {}, id) => {
    const targetId = id || chatIdRef.current;
    return useGenerationStore.getState().startGeneration(targetId, options);
  }, []);

  const appendToken = useCallback((token, msgId, id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().appendToken(targetId, token, msgId);
  }, []);

  const setPartialResponse = useCallback((text, msgId, id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().setPartialResponse(targetId, text, msgId);
  }, []);

  const setLoadingText = useCallback((text, id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().setLoadingText(targetId, text);
  }, []);

  const complete = useCallback((id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().completeGeneration(targetId);
  }, []);

  const fail = useCallback((error, id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().failGeneration(targetId, error);
  }, []);

  const abort = useCallback((id) => {
    const targetId = id || chatIdRef.current;
    useGenerationStore.getState().abortGeneration(targetId);
  }, []);

  const getAbortController = useCallback((id) => {
    const targetId = id || chatIdRef.current;
    return useGenerationStore.getState().getAbortController(targetId) ?? null;
  }, []);

  const getAbortSignal = useCallback((id) => {
    const targetId = id || chatIdRef.current;
    return useGenerationStore.getState().getAbortController(targetId)?.signal ?? null;
  }, []);

  return {
    // State
    isGenerating,
    partialResponse,
    streamedTokens,
    loadingText,
    typingMessageId,
    generationError,

    // Actions
    start,
    appendToken,
    setPartialResponse,
    setLoadingText,
    complete,
    fail,
    abort,
    getAbortController,
    getAbortSignal,
  };
};

export default useChatGeneration;
