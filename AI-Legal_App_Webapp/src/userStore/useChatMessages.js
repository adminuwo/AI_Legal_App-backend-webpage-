import { useCallback, useRef, useEffect } from 'react';
import { useGenerationStore } from './useGenerationStore';

const EMPTY_ARRAY = [];

/**
 * Hook that provides a chat-scoped 'messages' state and a 'setMessages' updater.
 * This is the core fix for 'Wrong Chat Message Insertion'.
 */
export const useChatMessages = (chatId) => {
  const messages = useGenerationStore(state => state.messagesByChat[chatId] || EMPTY_ARRAY);
  
  const chatIdRef = useRef(chatId);
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  const setMessages = useCallback((updater, targetChatId) => {
    const id = targetChatId || chatIdRef.current;
    const currentState = useGenerationStore.getState().messagesByChat[id] || EMPTY_ARRAY;
    let nextState;
    
    if (typeof updater === 'function') {
      nextState = updater(currentState);
    } else {
      nextState = updater;
    }
    
    useGenerationStore.getState().setMessagesForChat(id, nextState);
  }, []);

  return [messages, setMessages];
};
