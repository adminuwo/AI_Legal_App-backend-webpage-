import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Search, 
  MessageCircle, 
  Highlighter, 
  Languages, 
  Share2, 
  Volume2, 
  FileText, 
  FileCode, 
  Download, 
  Sparkles,
  Check,
  X,
  PlusSquare,
  Bookmark,
  Edit3,
  Square,
  ChevronDown,
  ChevronUp,
  MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copyText } from '../../utils/clipboard';

/**
 * ActionButton
 * Focus-safe button that prevents selection loss via onMouseDown preventDefault
 */
const ActionButton = ({ action, isSecondary = false, theme, onRestore }) => (
  <button
    key={action.id}
    onMouseDown={(e) => {
      e.preventDefault(); // Critical: Prevent focus shift
      if (onRestore) onRestore(); // Re-assert selection highlight
    }}
    onTouchEnd={(e) => {
      e.preventDefault(); // Critical: Prevent click emulation/focus shift on mobile
      e.stopPropagation();
      action.onClick(e);
    }}
    onClick={(e) => {
      e.stopPropagation();
      action.onClick(e);
    }}
    className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left group
      ${isSecondary 
        ? (theme === 'dark' ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900')
        : (action.primary 
            ? (theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10')
            : (theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-zinc-900'))
      }
    `}
  >
    <action.icon className={`${isSecondary ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform group-hover:scale-110`} />
    <span className={`${isSecondary ? 'text-[11px] font-medium' : 'text-[12px] font-bold'} uppercase tracking-wider`}>
      {action.label}
    </span>
  </button>
);

const SelectionToolbar = ({ 
  selection, 
  onClose, 
  onAction,
  onRestoreSelection,
  theme = 'dark'
}) => {
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const toolbarRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, arrow: 'bottom' });

  // Update position based on selection rect
  useEffect(() => {
    if (!selection || !selection.range) return;

    const updatePosition = () => {
      const range = selection.range;
      const rect = range.getBoundingClientRect();
      const toolbarWidth = 220;
      
      let top = rect.top + window.scrollY - 10;
      let left = rect.left + window.scrollX + rect.width + 10;
      let arrow = 'left';

      // Smart side-positioning logic
      if (left + toolbarWidth > window.innerWidth - 20) {
        left = rect.left + window.scrollX - toolbarWidth - 10;
        arrow = 'right';
      }

      // Fallback to top/bottom if sides are too cramped
      if (left < 20 || left + toolbarWidth > window.innerWidth - 20) {
        left = rect.left + window.scrollX + rect.width / 2;
        top = rect.top + window.scrollY - 10;
        arrow = 'bottom';
        
        const halfWidth = toolbarWidth / 2;
        if (left < halfWidth + 20) left = halfWidth + 20;
        else if (left > window.innerWidth - halfWidth - 20) left = window.innerWidth - halfWidth - 20;
      }

      // Viewport height safety
      if (top < window.scrollY + 20) {
        top = rect.bottom + window.scrollY + 10;
        if (arrow === 'bottom') arrow = 'top';
      }

      setPosition({ top, left, arrow });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [selection, showMore]);

  // Re-apply highlight periodically if visible to fight off greedy focus-stealers
  useEffect(() => {
    const interval = setInterval(() => {
      if (selection && onRestoreSelection) onRestoreSelection();
    }, 1000);
    return () => clearInterval(interval);
  }, [selection, onRestoreSelection]);

  const handleCopy = useCallback((e) => {
    e.preventDefault();
    copyText(selection.text)
      .then(() => {
        setCopied(true);
        toast.success('Copied to clipboard', { icon: '📋' });
        if (onAction) onAction('copy');
        setTimeout(() => {
          setCopied(false);
          if (onClose) onClose();
        }, 600);
      })
      .catch(() => toast.error('Failed to copy'));
  }, [selection.text, onAction, onClose]);


  const handleSelectAll = useCallback((e) => {
    e.preventDefault();
    const msgElement = document.getElementById(`msg-text-${selection.id}`);
    if (msgElement) {
      const range = document.createRange();
      range.selectNodeContents(msgElement);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (onAction) onAction('select-all');
  }, [selection.id, onAction]);

  const primaryActions = [
    { id: 'copy', icon: copied ? Check : Copy, label: 'Copy', onClick: handleCopy, primary: true },
    { id: 'ask', icon: Sparkles, label: 'Ask AI', onClick: (e) => onAction('ask', selection.text) },
    { id: 'explain', icon: MessageCircle, label: 'Explain', onClick: (e) => onAction('explain', selection.text) },
    { id: 'translate', icon: Languages, label: 'Translate', onClick: (e) => onAction('translate', selection.text) },
    { id: 'search', icon: Search, label: 'Search Web', onClick: (e) => onAction('search', selection.text) },
  ];

  const secondaryActions = [
    { id: 'select-all', icon: Square, label: 'Select All', onClick: handleSelectAll },
    ...(selection.isCode ? [{ id: 'copy-code', icon: FileCode, label: 'Copy Code', onClick: handleCopy }] : []),
    { id: 'highlight', icon: Highlighter, label: 'Highlight', onClick: (e) => onAction('highlight', selection.text) },
    { id: 'speak', icon: Volume2, label: 'Speak', onClick: (e) => onAction('speak', selection.text) },
    { id: 'note', icon: PlusSquare, label: 'Note', onClick: (e) => onAction('note', selection.text) },
    { id: 'share', icon: Share2, label: 'Share', onClick: (e) => onAction('share', selection.text) },
    { id: 'download', icon: Download, label: 'Download TXT', onClick: (e) => onAction('download', selection.text) },
    { id: 'pdf', icon: FileText, label: 'Save PDF', onClick: (e) => onAction('pdf', selection.text) },
    { id: 'summarize', icon: FileCode, label: 'Summarize', onClick: (e) => onAction('summarize', selection.text) },
    { id: 'rewrite', icon: Edit3, label: 'Rewrite', onClick: (e) => onAction('rewrite', selection.text) },
    { id: 'bookmark', icon: Bookmark, label: 'Bookmark', onClick: (e) => onAction('bookmark', selection.text) },
  ];

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="fixed z-[9999] pointer-events-auto selection-toolbar-container"
        onMouseDown={(e) => e.preventDefault()} // Ensure the bar itself doesn't steal focus
        style={{
          top: position.top,
          left: position.left,
          transform: position.arrow === 'bottom' || position.arrow === 'top' ? 'translateX(-50%)' : 'none'
        }}
      >
        <div className={`
          flex flex-col rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-2xl overflow-hidden
          ${theme === 'dark' 
            ? 'bg-zinc-900/80 border-white/10 text-white' 
            : 'bg-white/90 border-zinc-200 text-zinc-900'}
          w-[200px] max-h-[420px] flex flex-col
        `}>
          <div className="flex flex-col p-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <div className="flex flex-col gap-0.5">
              {primaryActions.map((action) => (
                <ActionButton key={action.id} action={action} theme={theme} onRestore={onRestoreSelection} />
              ))}
            </div>

            <div className={`my-1.5 h-px w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-100'}`} />
            
            <button
              onMouseDown={(e) => { e.preventDefault(); if (onRestoreSelection) onRestoreSelection(); }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              onClick={() => setShowMore(!showMore)}
              className={`
                flex items-center justify-between px-3 py-2 rounded-xl transition-all w-full
                ${theme === 'dark' ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900'}
              `}
            >
              <div className="flex items-center gap-3">
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">More</span>
              </div>
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-0.5 pt-1">
                    {secondaryActions.map((action) => (
                      <ActionButton key={action.id} action={action} isSecondary theme={theme} onRestore={onRestoreSelection} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Arrow */}
          <div 
            className={`
              absolute w-3 h-3 rotate-45 border
              ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}
              ${position.arrow === 'left' ? 'top-6 -left-1.5 border-l border-b' : ''}
              ${position.arrow === 'right' ? 'top-6 -right-1.5 border-r border-t' : ''}
              ${position.arrow === 'bottom' ? 'left-1/2 -translate-x-1/2 -bottom-1.5 border-r border-b' : ''}
              ${position.arrow === 'top' ? 'left-1/2 -translate-x-1/2 -top-1.5 border-l border-t' : ''}
            `}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SelectionToolbar;
