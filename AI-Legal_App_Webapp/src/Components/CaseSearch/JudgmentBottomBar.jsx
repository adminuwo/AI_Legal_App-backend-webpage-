import React from 'react';
import { Sparkles, FileText, Brain, MessageSquare, Scale, HelpCircle, ChevronUp } from 'lucide-react';

export default function JudgmentBottomBar({
  onOpenChat,
  onOpenSummary,
  onOpenAnalysis,
  onQuickPrompt
}) {
  const quickPrompts = [
    "What is the core ratio?",
    "Summary of arguments",
    "Statutes interpreted",
    "Dissenting view (if any)"
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0C111C]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Quick Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
            <Sparkles size={12} className="text-[#C8A34D]" />
            <span>AI Quick Prompts:</span>
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onQuickPrompt(prompt)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-[#C8A34D]/15 hover:text-[#B38628] dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 hover:border-[#C8A34D]/40 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Right: Primary 3 AI Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
          
          {/* 1. Chat with AI */}
          <button
            onClick={onOpenChat}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} className="text-[#C8A34D]" />
            <span>Chat with AI</span>
          </button>

          {/* 2. Generate Summary */}
          <button
            onClick={onOpenSummary}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} className="text-[#C8A34D]" />
            <span>Generate Summary</span>
          </button>

          {/* 3. Deep Analysis (Highlighted Gold Button) */}
          <button
            onClick={onOpenAnalysis}
            className="flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:from-[#d5b35c] hover:to-[#c29330] text-slate-950 shadow-md shadow-[#C8A34D]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Brain size={14} className="text-slate-950" />
            <span>Deep Analysis</span>
          </button>

        </div>

      </div>
    </div>
  );
}
