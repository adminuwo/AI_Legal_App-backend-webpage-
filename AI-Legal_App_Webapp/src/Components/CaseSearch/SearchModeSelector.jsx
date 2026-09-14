import React from 'react';
import { Sparkles, BookOpen, Hash, FileText, UserCheck, Gavel } from 'lucide-react';
import { SEARCH_MODES } from '../../data/indianCourtsData';

const MODE_ICONS = {
  AI: Sparkles,
  CASE: BookOpen,
  CITATION: Hash,
  ACT: FileText,
  PARTY: UserCheck,
  JUDGE: Gavel
};

export default function SearchModeSelector({ activeMode, onSelectMode }) {
  return (
    <div className="w-full flex items-center justify-center overflow-x-auto py-0.5 scrollbar-none">
      <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100/90 dark:bg-[#111827]/90 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs max-w-full">
        {SEARCH_MODES.map(mode => {
          const Icon = MODE_ICONS[mode.id] || Sparkles;
          const isActive = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${
                isActive
                  ? 'bg-white dark:bg-[#1E293B] text-[#B38628] dark:text-[#E5A93C] shadow-2xs border border-slate-200/80 dark:border-slate-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
              }`}
              title={mode.hint}
            >
              <Icon size={12} className={isActive ? 'text-[#B38628] dark:text-[#E5A93C]' : 'text-slate-400'} />
              <span>{mode.label}</span>
              {mode.id === 'AI' && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#B88B2A]/20 text-[#B38628] dark:text-[#E5A93C] uppercase tracking-wider">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
