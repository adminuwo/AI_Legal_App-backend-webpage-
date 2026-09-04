import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useTextSelection
 * Advanced hook to track and persist text selection.
 * Designed to keep selection active even during complex UI updates.
 */
export const useTextSelection = () => {
  const [selection, setSelection] = useState(null);
  const savedRangeRef = useRef(null);
  const debounceRef = useRef(null);
  const isInteractingWithToolbar = useRef(false);

  // Helper to restore selection highlight visually
  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current) return;
    
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const currentRange = sel.getRangeAt(0);
      if (currentRange.toString() === savedRangeRef.current.toString()) {
        return; // Already selected
      }
    }
    
    try {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } catch (e) {
      console.warn("Failed to restore selection:", e);
    }
  }, []);

  const processSelection = useCallback((force = false) => {
    // If interacting with toolbar, we must preserve and restore, not reset
    if (isInteractingWithToolbar.current && !force) {
      restoreSelection();
      return;
    }

    const sel = window.getSelection();
    const text = sel.toString().trim();

    if (!text || text.length === 0) {
      // Graceful clear: only clear if we are not interacting with the toolbar
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!isInteractingWithToolbar.current && window.getSelection().toString().trim() === '') {
          setSelection(null);
          savedRangeRef.current = null;
        }
      }, 400); // Increased grace period
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      const element = commonAncestor.nodeType === 1 ? commonAncestor : commonAncestor.parentElement;

      // Restrict to chat messages
      const messageRow = element.closest('.chatgpt-message-row');
      if (!messageRow) return;

      const codeBlock = element.closest('pre') || element.closest('code');

      // Save the range for persistence
      savedRangeRef.current = range.cloneRange();
      
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      setSelection({
        text,
        range: savedRangeRef.current,
        element: messageRow,
        isCode: !!codeBlock,
        id: messageRow.getAttribute('data-message-id') || messageRow.id || Date.now()
      });
    } catch (e) {
      // Ignore transient errors
    }
  }, [restoreSelection]);

  const handleSelectionChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => processSelection(), 100);
  }, [processSelection]);

  const clearSelection = useCallback(() => {
    try {
      window.getSelection().removeAllRanges();
    } catch (e) {}
    setSelection(null);
    savedRangeRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    
    const handleGlobalMouseDown = (e) => {
      // Check if click is on toolbar
      const toolbar = e.target.closest('.selection-toolbar-container');
      if (toolbar) {
        isInteractingWithToolbar.current = true;
        // Re-apply selection on mousedown to ensure highlight stays active
        restoreSelection();
        return;
      }
      isInteractingWithToolbar.current = false;
      
      // If clicking completely outside messages, we might want to clear.
      // But we let selectionchange handle the 'empty' state.
    };

    const handleGlobalMouseUp = (e) => {
      // If we were interacting with toolbar, finalize and keep highlight
      if (isInteractingWithToolbar.current) {
        restoreSelection();
        // Don't set interacting to false immediately to allow click events to finish
        setTimeout(() => { isInteractingWithToolbar.current = false; }, 200);
        return;
      }
      
      // Check for new selection
      setTimeout(() => processSelection(), 50);
    };

    const handleGlobalTouchStart = (e) => {
      const toolbar = e.target.closest('.selection-toolbar-container');
      if (toolbar) {
        isInteractingWithToolbar.current = true;
        restoreSelection();
        return;
      }
      isInteractingWithToolbar.current = false;
    };

    const handleGlobalTouchEnd = (e) => {
      if (isInteractingWithToolbar.current) {
        restoreSelection();
        setTimeout(() => { isInteractingWithToolbar.current = false; }, 200);
        return;
      }
      setTimeout(() => processSelection(), 50);
    };

    // Global listener for focus shifts
    const handleFocus = () => {
      if (selection) restoreSelection();
    };

    document.addEventListener('mousedown', handleGlobalMouseDown, true); // Use capture phase
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('touchstart', handleGlobalTouchStart, true);
    document.addEventListener('touchend', handleGlobalTouchEnd, true);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('touchstart', handleGlobalTouchStart, true);
      document.removeEventListener('touchend', handleGlobalTouchEnd, true);
      window.removeEventListener('focus', handleFocus);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handleSelectionChange, processSelection, restoreSelection, selection]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  return { selection, clearSelection, restoreSelection };
};
