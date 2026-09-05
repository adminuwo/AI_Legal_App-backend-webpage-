import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { selectedRoleState } from '../../userStore/userData';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Pin, Star, Trash2, Edit2, Archive, Copy, 
  Download, Briefcase, ChevronRight, FolderOpen, Calendar,
  MoreVertical, RefreshCw, FileText
} from 'lucide-react';
import { chatStorageService } from '../../services/chatStorageService';
import toast from 'react-hot-toast';

// Color and Icon configurations for AI Tools
const TOOL_CONFIG = {
  legal_my_case: {
    name: 'AI Assistant',
    emoji: '⚖️',
    color: '#a855f7', // Purple
    textClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-900/40'
  },
  legal_draft_maker: {
    name: 'Draft Maker',
    emoji: '📝',
    color: '#6366f1', // Indigo
    textClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderClass: 'border-indigo-200 dark:border-indigo-900/40'
  },
  legal_evidence_checker: {
    name: 'Evidence Analyst',
    emoji: '🔍',
    color: '#10b981', // Emerald
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-900/40'
  },
  legal_contract_analyzer: {
    name: 'Contract Analyzer',
    emoji: '📄',
    color: '#3b82f6', // Blue
    textClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-900/40'
  },
  legal_research: {
    name: 'Legal Research',
    emoji: '📚',
    color: '#f59e0b', // Amber
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-900/40'
  },
  legal_precedents: {
    name: 'Legal Precedents',
    emoji: '📚',
    color: '#f59e0b', // Amber
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-900/40'
  },
  legal_argument_builder: {
    name: 'Argument Builder',
    emoji: '⚔️',
    color: '#ef4444', // Red
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-200 dark:border-rose-900/40'
  },
  legal_case_predictor: {
    name: 'Case Predictor',
    emoji: '📊',
    color: '#06b6d4', // Cyan
    textClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderClass: 'border-cyan-200 dark:border-cyan-900/40'
  },
  legal_strategy_engine: {
    name: 'Strategy Engine',
    emoji: '🎯',
    color: '#8b5cf6', // Violet
    textClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderClass: 'border-violet-200 dark:border-violet-900/40'
  },
  legal_research_assistant: {
    name: 'Research Assistant',
    emoji: '🧠',
    color: '#14b8a6', // Teal
    textClass: 'text-teal-600 dark:text-teal-400',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    borderClass: 'border-teal-200 dark:border-teal-900/40'
  }
};

const DEFAULT_TOOL_CONFIG = {
  name: 'AI Assistant',
  emoji: '⚖️',
  color: '#a855f7',
  textClass: 'text-purple-600 dark:text-purple-400',
  bgClass: 'bg-purple-50 dark:bg-purple-950/30',
  borderClass: 'border-purple-200 dark:border-purple-900/40'
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Chat History' }
];

const AIHistoryPanel = ({
  isOpen = false,
  onClose = () => {},
  width = 360,
  onStartResize,
  currentSessionId,
  activeSessionId = null,
  activeCaseId = null,
  scope = 'global',
  caseName = '',
  onSelectSession = () => {}
}) => {
  const navigate = useNavigate();
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const panelRef = useRef(null);
  const filterScrollRef = useRef(null);
  
  // Local states
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const currentScope = (scope === 'case' || activeCaseId) ? 'case' : (selectedRole === 'student' ? 'student_tutor' : 'global');

  // Clear all history handler
  const handleClearAllHistory = async () => {
    const tid = toast.loading("Clearing chat history...");
    try {
      await chatStorageService.clearAllSessions(currentScope, activeCaseId, sessions);
      setSessions([]);
      toast.success("✨ History cleared successfully!", { id: tid });
      setIsConfirmClearOpen(false);
    } catch (err) {
      console.error("Failed to clear history", err);
      toast.error("Failed to clear history", { id: tid });
    }
  };

  // local storage metadata items
  const [pinnedChats, setPinnedChats] = useState(() => {
    return JSON.parse(localStorage.getItem('aisa_pinned_chats') || '[]');
  });
  const [favoriteChats, setFavoriteChats] = useState(() => {
    return JSON.parse(localStorage.getItem('aisa_favorite_chats') || '[]');
  });
  const [archivedChats, setArchivedChats] = useState(() => {
    return JSON.parse(localStorage.getItem('aisa_archived_chats') || '[]');
  });
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load scoped sessions
  const loadSessions = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const data = await chatStorageService.getSessions(currentScope, search, activeCaseId);
      setSessions(data || []);
    } catch (err) {
      console.error("[HISTORY] Load failed:", err);
      toast.error("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  }, [currentScope, activeCaseId]);

  // Reload history when open or when search query changes
  useEffect(() => {
    if (isOpen) {
      loadSessions(debouncedSearch);
    }
  }, [isOpen, debouncedSearch, loadSessions]);

  // Outside click close detection
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicked on history toggle buttons or within the history panel itself
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[title="Open AI History"]') && !e.target.closest('[title="View AI History"]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Horizontal wheel scroll & drag-to-scroll for filters container
  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;

    // 1. Wheel event listener
    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 0.85;
      }
    };

    // 2. Drag-to-scroll listeners
    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
    };

    const handleMouseUp = () => {
      isDown = false;
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Sync metadata helper with localStorage
  const updatePinnedChats = (newPinned) => {
    setPinnedChats(newPinned);
    localStorage.setItem('aisa_pinned_chats', JSON.stringify(newPinned));
  };

  const updateFavoriteChats = (newFavs) => {
    setFavoriteChats(newFavs);
    localStorage.setItem('aisa_favorite_chats', JSON.stringify(newFavs));
  };

  const updateArchivedChats = (newArchived) => {
    setArchivedChats(newArchived);
    localStorage.setItem('aisa_archived_chats', JSON.stringify(newArchived));
  };

  // Actions
  const handlePin = (e, id) => {
    e.stopPropagation();
    const isPinned = pinnedChats.includes(id);
    const updated = isPinned ? pinnedChats.filter(x => x !== id) : [...pinnedChats, id];
    updatePinnedChats(updated);
    toast.success(isPinned ? "Chat unpinned" : "Chat pinned to top");
    setMenuOpenId(null);
  };

  const handleFavorite = (e, id) => {
    e.stopPropagation();
    const isFav = favoriteChats.includes(id);
    const updated = isFav ? favoriteChats.filter(x => x !== id) : [...favoriteChats, id];
    updateFavoriteChats(updated);
    toast.success(isFav ? "Removed from favorites" : "Added to favorites");
    setMenuOpenId(null);
  };

  const handleArchive = (e, id) => {
    e.stopPropagation();
    const isArchived = archivedChats.includes(id);
    const updated = isArchived ? archivedChats.filter(x => x !== id) : [...archivedChats, id];
    updateArchivedChats(updated);
    toast.success(isArchived ? "Chat unarchived" : "Chat archived successfully");
    setMenuOpenId(null);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat permanently? This cannot be undone.")) {
      try {
        await chatStorageService.deleteSession(id);
        setSessions(prev => prev.filter(s => s.sessionId !== id));
        updatePinnedChats(pinnedChats.filter(x => x !== id));
        updateFavoriteChats(favoriteChats.filter(x => x !== id));
        updateArchivedChats(archivedChats.filter(x => x !== id));
        toast.success("Conversation deleted");
        if (currentSessionId === id) {
          navigate('/dashboard/chat/new');
        }
      } catch (err) {
        toast.error("Failed to delete conversation");
      }
    }
    setMenuOpenId(null);
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setRenameSessionId(session.sessionId);
    setRenameValue(session.title);
    setMenuOpenId(null);
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) return;
    try {
      const success = await chatStorageService.updateSessionTitle(id, renameValue.trim());
      if (success) {
        setSessions(prev => prev.map(s => s.sessionId === id ? { ...s, title: renameValue.trim(), lastModified: Date.now() } : s));
        toast.success("Conversation renamed");
      } else {
        toast.error("Failed to rename");
      }
    } catch (err) {
      toast.error("Failed to rename");
    } finally {
      setRenameSessionId(null);
    }
  };

  const handleDuplicate = async (e, session) => {
    e.stopPropagation();
    const dupToast = toast.loading("Duplicating conversation...");
    try {
      const historyData = await chatStorageService.getHistory(session.sessionId);
      const messages = Array.isArray(historyData) ? historyData : (historyData.messages || []);
      const newSessionId = 'dup_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

      // Save each message back to clone it on IndexedDB/API
      const titleCopy = `${session.title} (Copy)`;
      for (const msg of messages) {
        // Prepare attachments
        const formattedMsg = {
          ...msg,
          mode: msg.mode || session.detectedMode || 'NORMAL_CHAT',
          activeTool: msg.activeTool || session.activeTool || null
        };
        await chatStorageService.saveMessage(newSessionId, formattedMsg, titleCopy, session.projectId?._id || session.projectId);
      }

      toast.dismiss(dupToast);
      toast.success("Conversation duplicated");
      loadSessions(debouncedSearch);
    } catch (err) {
      toast.dismiss(dupToast);
      console.error(err);
      toast.error("Duplication failed");
    }
    setMenuOpenId(null);
  };

  const handleExport = async (e, session, format) => {
    e.stopPropagation();
    const expToast = toast.loading(`Exporting chat as ${format.toUpperCase()}...`);
    try {
      const historyData = await chatStorageService.getHistory(session.sessionId);
      const messages = Array.isArray(historyData) ? historyData : (historyData.messages || []);
      
      let fileContent = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      if (format === 'json') {
        fileContent = JSON.stringify(historyData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // Text format
        fileContent = `AI LEGAL™ Conversation Report\n`;
        fileContent += `Title: ${session.title}\n`;
        fileContent += `Date: ${new Date(session.lastModified).toLocaleString()}\n`;
        if (session.projectId?.name) {
          fileContent += `Case: ${session.projectId.name} (Client: ${session.projectId.clientName || 'N/A'})\n`;
        }
        fileContent += `Tool: ${session.activeTool || 'AI Assistant'}\n`;
        fileContent += `=========================================\n\n`;

        messages.forEach((msg) => {
          const sender = msg.role === 'user' ? 'USER' : 'AI LEGAL™';
          const time = new Date(msg.timestamp).toLocaleTimeString();
          fileContent += `[${time}] ${sender}:\n${msg.content || ''}\n\n`;
        });
      }

      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aisa_export_${session.sessionId}_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(expToast);
        toast.success("Export downloaded");
      }, 500);

    } catch (err) {
      toast.dismiss(expToast);
      console.error(err);
      toast.error("Export failed");
    }
    setMenuOpenId(null);
  };

  // Grouping sessions — Only show pure AI Assistant chat history (exclude background tool sessions)
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Archive filter
      const isArchived = archivedChats.includes(s.sessionId);
      if (showArchivedOnly) {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
      }

      // 2. Strict Chat Filter: Must be legal_my_case, legal_tutor, or unassigned tool
      const toolId = s.activeTool || 'legal_my_case';
      if (toolId !== 'legal_my_case' && toolId !== 'legal_tutor' && toolId !== 'chat' && toolId !== 'NORMAL_CHAT' && toolId !== 'none' && toolId !== '') {
        return false;
      }

      // 3. Exclude automated tool titles, advocate submissions, mock courtroom turns, performance reports, etc.
      const titleLower = (s.title || '').toLowerCase();
      const excludedKeywords = [
        'advocate submission',
        'judicial performance',
        'performance report',
        'research the relevant law',
        'write email draft',
        'write whatsapp draft',
        'mock courtroom',
        'courtroom practice',
        'client connect',
        'start ai mock courtroom',
        'evidence analyst',
        'contract analyzer',
        'argument builder',
        'case predictor',
        'strategy engine',
        'turn '
      ];

      if (excludedKeywords.some(kw => titleLower.includes(kw))) {
        return false;
      }

      return true;
    });
  }, [sessions, archivedChats, showArchivedOnly]);

  const groupedSessions = useMemo(() => {
    const groups = {
      pinned: [],
      today: [],
      yesterday: [],
      last7Days: [],
      lastMonth: [],
      older: []
    };

    const startOfToday = new Date().setHours(0,0,0,0);
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOf30DaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;

    filteredSessions.forEach((s) => {
      if (pinnedChats.includes(s.sessionId) && !showArchivedOnly) {
        groups.pinned.push(s);
        return;
      }

      const mod = s.lastModified;
      if (mod >= startOfToday) {
        groups.today.push(s);
      } else if (mod >= startOfYesterday) {
        groups.yesterday.push(s);
      } else if (mod >= startOf7DaysAgo) {
        groups.last7Days.push(s);
      } else if (mod >= startOf30DaysAgo) {
        groups.lastMonth.push(s);
      } else {
        groups.older.push(s);
      }
    });

    return groups;
  }, [filteredSessions, pinnedChats, showArchivedOnly]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 dark:bg-black/40 z-[1049] backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Resize styling */}
      <style>{`
        .custom-history-panel {
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
        .dark .custom-history-panel {
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
          background: #0d0e16 !important;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* History panel container */}
      <div
        ref={panelRef}
        style={{ width: `${width}px` }}
        className={`fixed lg:absolute top-0 bottom-0 left-0 bg-white dark:bg-[#0d0e16] border-r border-slate-200/70 dark:border-zinc-800/80 z-[1050] flex flex-col transition-transform duration-300 custom-history-panel ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Resize drag handle */}
        <div
          onMouseDown={onStartResize}
          className="absolute top-0 bottom-0 right-0 w-[4px] cursor-col-resize hover:bg-[#6D5DFC]/30 active:bg-[#6D5DFC]/50 transition-colors z-[1051] flex items-center justify-center group"
          title="Drag to resize panel"
        >
          <div className="w-[2px] h-10 bg-slate-300 dark:bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Panel Header */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800/60 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 truncate max-w-[230px]">
              {currentScope === 'case' 
                ? `🗂 Case History ${caseName ? `• ${caseName}` : ''}`
                : (selectedRole === 'student' ? '🗂 AI Legal Tutor History' : '🗂 AI Legal Assistant History')
              }
            </span>
            {showArchivedOnly && (
              <span className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full font-bold uppercase tracking-wider shrink-0">Archived</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations, cases, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm bg-slate-50 dark:bg-zinc-900/40 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#6D5DFC] focus:bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Row: Scope Pill + Clear All Button */}
        {!showArchivedOnly && (
          <div className="px-4 pb-2 border-b border-slate-100 dark:border-zinc-800/60 shrink-0 flex items-center justify-between gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold border shrink-0 bg-purple-50 dark:bg-purple-950/30 text-[#6D5DFC] border-purple-200 dark:border-purple-900/40 cursor-default"
            >
              {currentScope === 'case' 
                ? 'Current Case History' 
                : (selectedRole === 'student' ? 'Tutor History' : 'Global Assistant History')
              }
            </span>

            {sessions.length > 0 && (
              <button
                onClick={() => setIsConfirmClearOpen(true)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
                title="Clear All Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {isLoading && sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Retrieving vault...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-zinc-500 font-semibold text-xs">
              No conversations found.
            </div>
          ) : (
            Object.entries(groupedSessions).map(([groupKey, list]) => {
              if (list.length === 0) return null;

              const titleMap = {
                pinned: '📌 Pinned Chats',
                today: '📅 Today',
                yesterday: '🗓 Yesterday',
                last7Days: '📅 Last 7 Days',
                lastMonth: '📅 Last 30 Days',
                older: '🗂 Older'
              };

              return (
                <div key={groupKey} className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-1 py-1">
                    {titleMap[groupKey]}
                  </h4>

                  {list.map((session) => {
                    const active = currentSessionId === session.sessionId;

                    return (
                      <div
                        key={session.sessionId}
                        onClick={() => onSelectSession(session)}
                        className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? `bg-white dark:bg-[#121321] border-[#C8A34D] text-slate-900 dark:text-white shadow-xs`
                            : `bg-slate-50/70 hover:bg-white dark:bg-zinc-900/20 dark:hover:bg-zinc-800/40 border-slate-200/60 dark:border-zinc-800/60`
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          {renameSessionId === session.sessionId ? (
                            <div 
                              className="flex items-center gap-1.5 w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => handleRename(session.sessionId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(session.sessionId);
                                  if (e.key === 'Escape') setRenameSessionId(null);
                                }}
                                className="w-full px-2 py-1 border border-[#C8A34D] rounded-lg text-xs bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 outline-none font-semibold"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRename(session.sessionId)}
                                className="px-2.5 py-1 bg-[#C8A34D] text-[#111] rounded-lg text-xs font-black cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <h5 className="text-xs font-black text-slate-800 dark:text-zinc-100 truncate leading-snug">
                                {session.title || 'Untitled Conversation'}
                              </h5>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                                <span>
                                  {new Date(session.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(session.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {session.projectId?.name && (
                                  <span className="text-[#C8A34D] truncate max-w-[100px]">
                                    • {session.projectId.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Action Icons: Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => startRename(e, session)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Rename Chat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, session.sessionId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete Chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirm Clear All Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[1100] p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                {currentScope === 'case' ? 'Clear all case conversations?' : 'Clear all conversations?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {currentScope === 'case' 
                  ? 'This will permanently delete all Case Assistant conversations for this case.'
                  : 'This will permanently delete all conversations from this assistant.'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIHistoryPanel;
