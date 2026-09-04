import React from 'react';
import { FileText, BarChart, Scale, Shield, ChevronRight, FileSearch, Gavel, Brain, Library, Briefcase } from 'lucide-react';

const ICON_MAP = {
  legal_my_case: Briefcase,
  legal_draft_maker: FileText,
  legal_case_predictor: BarChart,
  legal_argument_builder: Gavel,
  legal_evidence_checker: Shield,
  legal_contract_analyzer: FileSearch,
  legal_strategy_engine: Brain,
  legal_research_assistant: Library,
};

export default function ActionCard({ title, desc, action, link, onClick, isLocked }) {
  const Icon = ICON_MAP[link.replace('action:', '')] || Scale;

  return (
    <div
      className="flex items-center justify-between p-4 my-3 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isLocked ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-0.5">{title}</h3>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{desc}</p>
        </div>
      </div>

      <button className={`text-[11px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${isLocked ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/30'}`}>
        {action}
        <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
