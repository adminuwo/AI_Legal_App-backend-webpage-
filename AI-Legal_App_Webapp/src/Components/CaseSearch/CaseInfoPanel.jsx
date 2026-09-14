import React from 'react';
import { Landmark, Scale, Calendar, Users, FileText, Tag, Award, CheckCircle2 } from 'lucide-react';

export default function CaseInfoPanel({ judgment }) {
  if (!judgment) return null;

  return (
    <div className="bg-white dark:bg-[#0F1523] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#C8A34D] flex items-center justify-center border border-[#C8A34D]/30">
            <Scale size={16} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Case Information & Coram
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#C8A34D]/30">
          Official Record
        </span>
      </div>

      {/* Structured Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        
        {/* Court */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Court Jurisdiction
          </span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {judgment.court || 'Supreme Court of India'}
          </p>
        </div>

        {/* Date of Decision */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Judgment Date
          </span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {judgment.date || judgment.year || 'Date on record'}
          </p>
        </div>

        {/* Case Type & Number */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Case Type / Number
          </span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {judgment.caseType || 'Appellate Jurisdiction'} {judgment.caseNumber ? `• ${judgment.caseNumber}` : ''}
          </p>
        </div>

        {/* Official Citation */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Primary Citation
          </span>
          <p className="font-mono font-bold text-[#B38628] dark:text-[#E5A93C]">
            {judgment.citation}
          </p>
        </div>

      </div>

      {/* Equivalent Citations (Only show if present and non-empty) */}
      {judgment.equivalentCitations && judgment.equivalentCitations.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Equivalent Citations
          </span>
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
            {judgment.equivalentCitations.map((cit, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {cit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bench Composition */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Bench / Coram [{judgment.bench || 'Division Bench'}]
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(judgment.judges || []).map((j, idx) => (
            <span key={idx} className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {j}
            </span>
          ))}
        </div>
      </div>

      {/* Advocates / Counsel (Only show if populated) */}
      {judgment.counsel && (judgment.counsel.petitioner || judgment.counsel.respondent) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {judgment.counsel.petitioner && judgment.counsel.petitioner.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Counsel for Petitioner:
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {judgment.counsel.petitioner.join(', ')}
              </p>
            </div>
          )}
          {judgment.counsel.respondent && judgment.counsel.respondent.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Counsel for Respondent:
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {judgment.counsel.respondent.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subject Tags (Only show if populated) */}
      {judgment.subjectTags && judgment.subjectTags.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Subjects:
          </span>
          {judgment.subjectTags.map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#C8A34D]/30">
              {tag}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
