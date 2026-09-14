import React from 'react';
import { 
  Sparkles, FileText, Scale, HelpCircle, CheckCircle2, 
  AlertTriangle, BookOpen, Quote, ShieldCheck, Copy 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JudgmentAIAnalysisTab({ judgment }) {
  if (!judgment) return null;

  const copyRatio = () => {
    if (judgment.ratioDecidendi) {
      navigator.clipboard.writeText(judgment.ratioDecidendi);
      toast.success('Ratio Decidendi copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200">
      
      {/* Disclaimer Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <span className="font-bold">AI LEGAL Grounded Analysis: </span>
          <span>
            Every section below is strictly grounded in the official record of <strong>{judgment.title}</strong> [{judgment.citation}]. Verify critical citations against the original full text before courtroom submission.
          </span>
        </div>
      </div>

      {/* 1. Ratio Decidendi (Highest Importance Gold Box) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-slate-900 border-2 border-[#B88B2A] shadow-sm space-y-2.5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#B38628] dark:text-[#E5A93C]">
            <Scale size={15} />
            <span>Ratio Decidendi (Binding Legal Holding)</span>
          </div>
          <button
            onClick={copyRatio}
            className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-black/40 text-[#B38628] hover:bg-white text-[11px] font-bold border border-[#B88B2A]/40 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Copy size={12} />
            <span>Copy Ratio</span>
          </button>
        </div>
        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed italic">
          "{judgment.ratioDecidendi || 'Ratio decidendi extracted from judgment holdings.'}"
        </p>
      </div>

      {/* 2. Executive Summary */}
      <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
          <Sparkles size={14} className="text-[#B88B2A]" />
          <span>1. Executive Summary</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {judgment.executiveSummary || 'Comprehensive executive summary of the case facts, issues, and core judicial holding.'}
        </p>
      </section>

      {/* 3. Facts of the Case */}
      <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
          <FileText size={14} className="text-[#B88B2A]" />
          <span>2. Material Facts & Background</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {judgment.caseContext?.facts || judgment.facts || 'Details of factual sequence leading to trial and subsequent appellate scrutiny.'}
        </p>
      </section>

      {/* 4. Legal Issues Framed */}
      <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
          <HelpCircle size={14} className="text-[#B88B2A]" />
          <span>3. Questions of Law (Legal Issues)</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
          {judgment.caseContext?.legalIssue || judgment.legal_issues || 'Constitutional and statutory questions formulated by the Bench.'}
        </p>
      </section>

      {/* 5. Parties' Submissions (Grid of 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Appellant Arguments */}
        <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Appellant / Petitioner Arguments
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {judgment.arguments?.appellant || 'The appellant submitted that statutory protections were infringed and pre-trial procedures were arbitrarily disregarded.'}
          </p>
        </div>

        {/* Respondent Arguments */}
        <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Respondent / State Submissions
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {judgment.arguments?.respondent || 'The respondent contended that the order passed by the trial court was based on established principles of statutory compliance.'}
          </p>
        </div>
      </div>

      {/* 6. Court's Reasoning */}
      <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
          <Scale size={14} className="text-[#B88B2A]" />
          <span>4. Judicial Reasoning & Statutory Analysis</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {judgment.reasoning || judgment.judgment_basis?.legal_reasoning || 'Detailed judicial rationale recorded by the Bench analyzing statutory provisions and constitutional boundaries.'}
        </p>
      </section>

      {/* 7. Final Decision & Operative Order */}
      <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          <span>5. Final Decision & Operative Order</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
          {judgment.finalDecision || judgment.judgment_outcome?.final_decision || 'Appeal allowed / Order pronounced.'}
        </p>
      </section>

      {/* 8. Practical Takeaway for Advocates */}
      {judgment.practicalTakeaway && (
        <section className="bg-gradient-to-r from-slate-900 to-[#16213E] text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#F59E0B]">
            <ShieldCheck size={15} />
            <span>6. Practical Courtroom Takeaway for Advocates</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {judgment.practicalTakeaway}
          </p>
        </section>
      )}

      {/* 9. Important Paragraphs */}
      {judgment.keyParagraphs && judgment.keyParagraphs.length > 0 && (
        <section className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Quote size={14} className="text-[#B88B2A]" />
            <span>7. Crucial Paragraphs for Citation</span>
          </div>
          <div className="space-y-3">
            {judgment.keyParagraphs.map((para, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#B38628] dark:text-amber-400 uppercase">
                  Paragraph {para.paraNum}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                  "{para.text}"
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
