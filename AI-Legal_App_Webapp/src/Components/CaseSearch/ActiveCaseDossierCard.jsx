import React, { useState } from 'react';
import { 
  Landmark, Calendar, Download, Copy, Check, 
  FileText, Plus, Eye, ArrowRight, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API } from '../../types';

export default function ActiveCaseDossierCard({ activeCase, onAddToCase, onOpenDossier }) {
  const [copiedCnr, setCopiedCnr] = useState(false);

  if (!activeCase) return null;

  const handleCopyCnr = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(activeCase.cnr_number);
    setCopiedCnr(true);
    toast.success('CNR number copied to clipboard!');
    setTimeout(() => setCopiedCnr(false), 2000);
  };

  const orders = activeCase.orders || [];
  const firstOrder = orders[0];
  const orderNum = firstOrder?.order_number || 1;
  const pdfHref = firstOrder?.pdf_url?.startsWith('/api/cases/orders/download/')
    ? `${API}/case-search/orders/download/${activeCase.cnr_number}/${orderNum}`
    : (firstOrder?.pdf_url || '#');

  const petitionerName = activeCase.petitioner || activeCase.parties?.petitioner || 'Petitioner details on record';
  const respondentName = activeCase.respondent || activeCase.parties?.respondent || 'Respondent details on record';
  const stage = activeCase.current_stage || activeCase.stage || 'Arguments / Final Hearing';

  return (
    <div 
      onClick={onOpenDossier}
      className="group bg-white dark:bg-[#111622] rounded-2xl border-2 border-[#B88B2A]/40 dark:border-[#B88B2A]/30 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-[#B88B2A] transition-all duration-200 cursor-pointer space-y-3"
    >
      
      {/* ─── ROW 1: BADGES (CNR, STATUS, NEXT HEARING, STAGE) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* CNR Badge */}
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-[#B38628] dark:text-amber-400 border border-[#B88B2A]/40 flex items-center gap-1.5">
            <span>CNR: {activeCase.cnr_number}</span>
            <button 
              onClick={handleCopyCnr} 
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer p-0.5"
              title="Copy CNR"
            >
              {copiedCnr ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </span>

          {/* Status Badge */}
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {activeCase.status || 'ACTIVE / PENDING'}
          </span>
        </div>

        {/* Next Hearing & Court Hall Badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-[#B38628] dark:text-[#E5A93C] border border-[#B88B2A]/30 flex items-center gap-1.5 shadow-2xs">
            <Calendar size={13} className="text-[#B88B2A]" />
            <span>Next Hearing: <strong>{activeCase.next_hearing_date || 'Awaiting Schedule'}</strong></span>
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {activeCase.court_hall || 'In Session'}
          </span>
        </div>
      </div>

      {/* ─── ROW 2: COURT TITLE & LITIGANTS SUMMARY + CTAs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        
        {/* Left: Court & Parties Info */}
        <div className="space-y-1 min-w-0">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight group-hover:text-[#B38628] dark:group-hover:text-amber-400 transition-colors">
            <Landmark className="text-[#B88B2A] shrink-0" size={18} />
            <span className="truncate">{activeCase.court_name || 'High Court of Delhi, New Delhi'}</span>
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            <span className="font-bold text-slate-800 dark:text-slate-200">{petitionerName}</span>
            <span className="text-[#B88B2A] font-bold mx-1.5">v.</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{respondentName}</span>
            <span className="text-slate-400 mx-1.5">•</span>
            <span>Stage: <strong className="text-slate-700 dark:text-slate-300">{stage}</strong></span>
          </p>
        </div>

        {/* Right: Actions & Read Case CTA */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
          
          {/* Secondary Quick Order PDF */}
          {firstOrder && (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              title="Download latest court order PDF"
            >
              <Download size={13} />
              <span className="hidden md:inline">Order PDF</span>
            </a>
          )}

          {/* Primary CTA: Read Full Case & Order PDF */}
          <button
            onClick={onOpenDossier}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#E5A93C] text-slate-950 font-black text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
          >
            <Eye size={14} />
            <span>Read Case Dossier & PDF</span>
            <ArrowRight size={13} />
          </button>

          {/* Save to Case Button */}
          {onAddToCase && (
            <button
              onClick={() => onAddToCase({
                id: activeCase.cnr_number,
                title: `${activeCase.court_name} (${activeCase.cnr_number})`,
                citation: `CNR: ${activeCase.cnr_number}`,
                court: activeCase.court_name
              })}
              className="p-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Save to Case Workspace"
            >
              <Plus size={14} />
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
