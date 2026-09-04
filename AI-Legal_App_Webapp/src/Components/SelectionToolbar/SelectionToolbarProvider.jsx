import React, { createContext, useContext, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useTextSelection } from './useTextSelection';
import SelectionToolbar from './SelectionToolbar';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const SelectionContext = createContext(null);

export const useSelection = () => useContext(SelectionContext);

export const SelectionToolbarProvider = ({ children, onAiAction }) => {
  const themeContext = useTheme();
  // Safe theme detection
  const isDark = themeContext?.theme?.toLowerCase() === 'dark' || 
                 (themeContext?.theme?.toLowerCase() === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                 
  const { selection, clearSelection, restoreSelection } = useTextSelection();

  const handleAction = useCallback((action, text) => {
    if (!text) return;
    
    switch (action) {
      case 'copy':
        // Handled in component
        break;
      case 'ask':
      case 'explain':
      case 'summarize':
      case 'rewrite':
        if (onAiAction) {
          onAiAction(action, text);
          clearSelection();
        }
        break;
      case 'search':
        window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
        clearSelection();
        break;
      case 'translate':
        window.open(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(text)}&op=translate`, '_blank');
        clearSelection();
        break;
      case 'speak': {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        toast.success('Speaking text...');
        break;
      }
      case 'download': {
        const element = document.createElement("a");
        const file = new Blob([text], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "selection.txt";
        document.body.appendChild(element);
        element.click();
        toast.success('Downloading TXT...');
        break;
      }
      default:
        clearSelection();
        break;
    }
  }, [onAiAction, clearSelection]);

  const contextValue = useMemo(() => ({ 
    selection, 
    clearSelection, 
    restoreSelection 
  }), [selection, clearSelection, restoreSelection]);

  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
      {selection && typeof document !== 'undefined' && ReactDOM.createPortal(
        <SelectionToolbar
          selection={selection}
          onClose={clearSelection}
          onAction={handleAction}
          onRestoreSelection={restoreSelection}
          theme={isDark ? 'dark' : 'light'}
        />,
        document.body
      )}
    </SelectionContext.Provider>
  );
};
