import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, History, Trash2, ArrowRight, BookOpen, Scale, Sparkles } from 'lucide-react';
import caseSearchService from '../../services/caseSearchService';

export default function SavedResearchDrawer({
  isOpen,
  onClose,
  onSelectJudgment,
  onSelectSearchQuery
}) {
  const [activeTab, setActiveTab] = useState('bookmarks'); // 'bookmarks' | 'history'
  const savedJudgments = caseSearchService.getSavedJudgments();
  const recentSearches = caseSearchService.getRecentSearches();

  const handleClearHistory = () => {
    caseSearchService.clearRecentSearches();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-white dark:bg-[#111622] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#B88B2A]/15 text-[#B38628] flex items-center justify-center">
              <Bookmark size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Saved Research & History
              </h3>
              <p className="text-[11px] text-slate-500">
                Personal legal precedents library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bookmarks'
                ? 'border-[#B88B2A] text-[#B38628] dark:text-[#E5A93C]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Bookmark size={13} />
            <span>Bookmarked Judgments ({savedJudgments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#B88B2A] text-[#B38628] dark:text-[#E5A93C]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <History size={13} />
            <span>Recent Searches ({recentSearches.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {activeTab === 'bookmarks' ? (
            savedJudgments.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Bookmark size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h4 className="text-xs font-bold text-slate-500">No bookmarked judgments yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click the bookmark icon on any judgment card to save it for offline courtroom reference.
                </p>
              </div>
            ) : (
              savedJudgments.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectJudgment(item);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/50 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-[#B38628] uppercase">{item.court || 'Court'}</span>
                    <span>{item.citation}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#B38628] transition-colors leading-snug">
                    {item.title}
                  </h4>
                  {item.ratioDecidendi && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                      "{item.ratioDecidendi}"
                    </p>
                  )}
                </div>
              ))
            )
          ) : (
            recentSearches.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <History size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h4 className="text-xs font-bold text-slate-500">No recent searches</h4>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear Search History</span>
                  </button>
                </div>

                {recentSearches.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectSearchQuery(q);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:bg-amber-50/50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between group transition-all"
                  >
                    <span className="truncate">{q}</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-[#B38628] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>

      </motion.div>
    </div>
  );
}
