import React from 'react';
import { 
  Landmark, Scale, BookOpen, Calendar, Users, Sparkles, Bookmark, 
  BookmarkCheck, Plus, ArrowRight, Brain, FileText, CheckCircle2 
} from 'lucide-react';

export default function SearchResultCard({
  judgment,
  onReadJudgment,
  onToggleBookmark,
  isBookmarked,
  onAddToCase
}) {
  const relevance = judgment.relevanceScore || 92;

  // Determine relevance color bar
  const getRelevanceColor = (score) => {
    if (score >= 90) return 'from-[#E5A93C] to-[#B38628]';
    if (score >= 80) return 'from-amber-500 to-amber-600';
    return 'from-slate-400 to-slate-500';
  };

  return (
    <div className="bg-white dark:bg-[#111622] rounded-2xl border border-slate-200/85 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#B88B2A]/60 dark:hover:border-[#B88B2A]/50 transition-all duration-200 group flex flex-col justify-between">
      
      {/* Top Meta Line: Court Badge & Benchmark Citation */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/70 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 flex items-center gap-1">
              <Landmark size={11} />
              {judgment.court || 'Supreme Court of India'}
            </span>
            <span className="text-[11px] font-mono font-bold text-[#B38628] dark:text-[#E5A93C] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-[#B88B2A]/30">
              {judgment.citation || 'Official Citation'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {judgment.date || judgment.year}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {judgment.bench || 'Division Bench'}
            </span>
          </div>
        </div>

        {/* Case Title */}
        <h3 
          onClick={() => onReadJudgment(judgment)}
          className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#B38628] dark:group-hover:text-amber-400 transition-colors cursor-pointer leading-snug"
        >
          {judgment.title}
        </h3>

        {/* AI Relevance Indicator Bar */}
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-[#B88B2A]/25 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#B38628] dark:text-amber-300 font-extrabold uppercase tracking-wider text-[10px]">
              <Sparkles size={13} className="animate-pulse" />
              <span>AI Legal Relevance</span>
            </div>
            <span className="font-extrabold text-[#B38628] dark:text-amber-300 text-xs">
              {relevance}% Match
            </span>
          </div>

          {/* Relevance progress meter */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getRelevanceColor(relevance)} rounded-full transition-all duration-500`}
              style={{ width: `${relevance}%` }}
            />
          </div>

          {/* Why Relevant Explanation */}
          <p className="text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed pt-0.5">
            {judgment.relevanceReason || judgment.executiveSummary || 'Relevant authority addressing key questions of law raised in your inquiry.'}
          </p>
        </div>

        {/* Core Ratio Decidendi Snippet */}
        {judgment.ratioDecidendi && (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 italic border-l-2 border-[#B88B2A] pl-3 py-0.5 line-clamp-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 not-italic">Ratio: </span>
            "{judgment.ratioDecidendi}"
          </div>
        )}

        {/* Key Provisions / Acts Pills */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
            Provisions:
          </span>
          {(judgment.sections || ['General Law']).slice(0, 4).map((sec, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
            >
              {sec}
            </span>
          ))}
          {(judgment.acts || []).slice(0, 2).map((act, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50/50 dark:bg-amber-950/30 text-[#B38628] dark:text-amber-300 border border-[#B88B2A]/25"
            >
              {act}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Read Judgment & AI Analysis (Unified Primary Action) */}
          <button
            onClick={() => onReadJudgment(judgment)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white text-white dark:text-slate-950 hover:bg-[#B38628] dark:hover:bg-[#E5A93C] dark:hover:text-black transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Brain size={13} className="text-[#B88B2A] dark:text-[#B38628]" />
            <span>Read Judgment & AI Analysis</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Add to Case Workspace Button */}
          <button
            onClick={() => onAddToCase(judgment)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Attach to active Case Workspace"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Add to Case</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => onToggleBookmark(judgment)}
            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
              isBookmarked
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Save Judgment'}
          >
            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
        </div>
      </div>

    </div>
  );
}
