import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, RotateCcw, Check, ChevronDown, Calendar, Gavel, FileText, Scale } from 'lucide-react';
import { INDIAN_COURTS, CASE_TYPES } from '../../data/indianCourtsData';

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  filters,
  onChangeFilter,
  onResetFilters,
  onApplyFilters,
  totalResultsCount
}) {
  const years = ['all', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2010', '2000', '1994', '1978', '1973'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="w-full overflow-hidden"
        >
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-md space-y-4 my-3">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#C8A34D]/15 text-[#B38628] flex items-center justify-center">
                  <Filter size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Advanced Search Filters
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Refine judgments across court, year, statute, judge, and party records
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close Filters"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Filter 1: Court */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Court / Forum
                </label>
                <div className="relative">
                  <select
                    value={filters.court || 'all'}
                    onChange={(e) => onChangeFilter('court', e.target.value)}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                  >
                    <option value="all">All Courts</option>
                    <option value="sc">Supreme Court of India</option>
                    {INDIAN_COURTS.filter(c => c.type === 'HIGH_COURT').map(hc => (
                      <option key={hc.id} value={hc.id}>
                        {hc.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Filter 2: Decision Year */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Decision Year
                </label>
                <div className="relative">
                  <select
                    value={filters.year || 'all'}
                    onChange={(e) => onChangeFilter('year', e.target.value)}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                  >
                    <option value="all">Any Year</option>
                    {years.filter(y => y !== 'all').map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Filter 3: Case Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Case Type
                </label>
                <div className="relative">
                  <select
                    value={filters.caseType || 'All Types'}
                    onChange={(e) => onChangeFilter('caseType', e.target.value)}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                  >
                    {CASE_TYPES.map(ct => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Filter 4: Act / Statute */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Act / Statute
                </label>
                <input
                  type="text"
                  placeholder="e.g. NI Act, CrPC, BNSS..."
                  value={filters.act || ''}
                  onChange={(e) => onChangeFilter('act', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              {/* Filter 5: Section */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section 138, 438..."
                  value={filters.section || ''}
                  onChange={(e) => onChangeFilter('section', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              {/* Filter 6: Judge Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Judge Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chandrachud, Nariman..."
                  value={filters.judge || ''}
                  onChange={(e) => onChangeFilter('judge', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              {/* Filter 7: Citation */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Law Report Citation
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024 INSC 123, (2010) 11 SCC..."
                  value={filters.citation || ''}
                  onChange={(e) => onChangeFilter('citation', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              {/* Filter 8: Party Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Party Name
                </label>
                <input
                  type="text"
                  placeholder="Petitioner or Respondent..."
                  value={filters.party || ''}
                  onChange={(e) => onChangeFilter('party', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onResetFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onApplyFilters}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white text-white dark:text-slate-950 hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
