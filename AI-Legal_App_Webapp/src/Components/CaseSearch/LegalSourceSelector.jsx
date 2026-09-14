import React from 'react';
import { Layers, Landmark, Scale, BookOpen, ChevronDown, Filter } from 'lucide-react';
import { INDIAN_COURTS } from '../../data/indianCourtsData';

export default function LegalSourceSelector({
  activeSource,
  onSelectSource,
  selectedHighCourt,
  onSelectHighCourt,
  isFilterOpen,
  onToggleFilter,
  activeFiltersCount = 0
}) {
  const highCourts = INDIAN_COURTS.filter(c => c.type === 'HIGH_COURT');

  return (
    <div className="w-full flex flex-col gap-2 pt-1">
      {/* Unified One-Row Options: Source tabs + Advanced Filters */}
      <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-2">
        {/* Primary Legal Source Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-0.5">
            Source:
          </span>

          {/* All Sources */}
          <button
            type="button"
            onClick={() => {
              onSelectSource('ALL');
              onSelectHighCourt('all');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSource === 'ALL'
                ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers size={12} />
            <span>All Sources</span>
          </button>

          {/* Supreme Court */}
          <button
            type="button"
            onClick={() => {
              onSelectSource('SC');
              onSelectHighCourt('all');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSource === 'SC'
                ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Landmark size={12} />
            <span>Supreme Court</span>
          </button>

          {/* High Courts */}
          <button
            type="button"
            onClick={() => onSelectSource('HC')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSource === 'HC'
                ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Scale size={12} />
            <span>High Courts (25)</span>
          </button>

          {/* Bare Acts */}
          <button
            type="button"
            onClick={() => onSelectSource('ACTS')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSource === 'ACTS'
                ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen size={12} />
            <span>Bare Acts</span>
          </button>
        </div>

        {/* Advanced Filters Button - Positioned in the same row! */}
        {onToggleFilter && (
          <button
            type="button"
            onClick={onToggleFilter}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              isFilterOpen || activeFiltersCount > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-[#B38628] dark:text-[#E5A93C]'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Filter size={12} />
            <span>Advanced Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-[#B38628] text-white text-[9px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* High Court Dropdown selector (when High Courts is active) */}
      {activeSource === 'HC' && (
        <div className="w-full flex items-center justify-center sm:justify-start gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Select Court:
          </label>
          <div className="relative w-full sm:w-64">
            <select
              value={selectedHighCourt}
              onChange={(e) => onSelectHighCourt(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D] cursor-pointer shadow-xs"
            >
              <option value="all">All 25 High Courts</option>
              {highCourts.map(hc => (
                <option key={hc.id} value={hc.id}>
                  {hc.name} ({hc.city})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
