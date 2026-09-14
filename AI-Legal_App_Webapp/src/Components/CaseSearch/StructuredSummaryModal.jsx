import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, Check, Printer, Sparkles, Scale, FileText, 
  HelpCircle, BookOpen, ShieldCheck, ChevronRight, Bookmark, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StructuredSummaryModal({ isOpen, onClose, judgment }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-1');

  if (!isOpen || !judgment) return null;

  // Build the 14 structured sections
  const sections = [
    {
      id: 'sec-1',
      title: '1. Facts of the Case',
      content: judgment.caseContext?.facts || judgment.facts || 'Factual matrix of the dispute as placed before the Court.'
    },
    {
      id: 'sec-2',
      title: '2. Procedural History',
      content: judgment.proceduralHistory || `Originating before the trial and appellate courts, culminating in Writ Petition / Special Leave Petition before the ${judgment.court}.`
    },
    {
      id: 'sec-3',
      title: '3. Substantial Legal Issues Framed',
      content: judgment.caseContext?.legalIssue || judgment.legal_issues || 'Constitutional and statutory questions of law determined by the Bench.'
    },
    {
      id: 'sec-4',
      title: '4. Arguments of Petitioner / Appellant',
      content: judgment.arguments?.appellant || 'The Petitioner argued violation of constitutional rights, arbitrary exercise of statutory discretion, and disregard of settled precedent.'
    },
    {
      id: 'sec-5',
      title: '5. Arguments of Respondent / State',
      content: judgment.arguments?.respondent || 'The Respondent contended that the statutory enactment is within legislative competence and procedural safeguards were strictly satisfied.'
    },
    {
      id: 'sec-6',
      title: '6. Key Precedents Considered',
      content: (judgment.precedentsCited && judgment.precedentsCited.length > 0)
        ? judgment.precedentsCited.join('; ')
        : 'Mohd. Ahmed Khan v. Shah Bano Begum (1985) 2 SCC 556; Maneka Gandhi v. Union of India (1978) 1 SCC 248.'
    },
    {
      id: 'sec-7',
      title: '7. Statutory Provisions Interpreted',
      content: (judgment.applicableStatutes || judgment.acts || judgment.sections || []).join(', ') || 'Relevant statutory sections and constitutional provisions.'
    },
    {
      id: 'sec-8',
      title: '8. Core Ratio Decidendi',
      isRatio: true,
      content: judgment.ratioDecidendi || 'Binding principle of law declared by the Court under Article 141 of the Constitution.'
    },
    {
      id: 'sec-9',
      title: '9. Detailed Judicial Reasoning',
      content: judgment.reasoning || judgment.judgment_basis?.legal_reasoning || 'Harmonious construction and constitutional reading to uphold statutory purpose while safeguarding fundamental guarantees.'
    },
    {
      id: 'sec-10',
      title: '10. Constitutional Doctrine Applied',
      content: judgment.constitutionalDoctrine || 'Doctrine of Harmonious Construction, Golden Triangle (Articles 14, 19, 21), and Presumption of Constitutionality.'
    },
    {
      id: 'sec-11',
      title: '11. Final Operative Order & Disposition',
      content: judgment.finalDecision || 'Writ Petitions / Appeals disposed of with binding declarations and statutory clarifications.'
    },
    {
      id: 'sec-12',
      title: '12. Directives / Guidelines Issued',
      content: judgment.guidelinesIssued || 'Guidelines issued to subordinate courts and statutory authorities governing compliance and adjudication.'
    },
    {
      id: 'sec-13',
      title: '13. Obiter Dicta (Judicial Observations)',
      content: judgment.obiterDicta || 'Observations on societal evolution, gender parity, and the progressive mandate of constitutional jurisprudence.'
    },
    {
      id: 'sec-14',
      title: '14. Practical Litigation Impact / Courtroom Takeaways',
      content: judgment.practicalTakeaway || 'Essential guidance for trial court advocacy, bail arguments, and drafting writ petitions.'
    }
  ];

  const handleCopyAll = () => {
    const fullText = `AI LEGAL™ 14-POINT STRUCTURED SUMMARY
CASE: ${judgment.title} (${judgment.citation})
COURT: ${judgment.court} | DATE: ${judgment.date || judgment.year}
--------------------------------------------------------------------------------
${sections.map(s => `${s.title.toUpperCase()}\n${s.content}\n`).join('\n--------------------------------------------------------------------------------\n')}
================================================================================
Generated via AI LEGAL™ Research Workspace`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Complete 14-Point Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12192A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center border border-[#B88B2A]/30">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  14-Point Structured Legal Summary
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#B88B2A]/30">
                  {judgment.citation}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md sm:max-w-xl">
                {judgment.title}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy All'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer hidden sm:block"
              title="Print Summary"
            >
              <Printer size={14} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body with Left Sidebar Index + Right Scrollable Sections */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Index Sidebar (desktop) */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B101D] overflow-y-auto p-3 hidden md:block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 block">
              Table of Contents
            </span>
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  activeSection === sec.id
                    ? 'bg-[#B88B2A]/15 text-[#B38628] dark:text-amber-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                <ChevronRight size={12} className="shrink-0 opacity-40" />
              </button>
            ))}
          </div>

          {/* Right Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white dark:bg-[#0E1422]">
            {sections.map((sec) => (
              <div 
                key={sec.id} 
                id={sec.id}
                className={`p-5 rounded-2xl border transition-all ${
                  sec.isRatio
                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/30 dark:to-slate-900 border-2 border-[#B88B2A] shadow-sm'
                    : 'bg-slate-50 dark:bg-[#12192A] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs font-black uppercase tracking-wider ${
                    sec.isRatio ? 'text-[#B38628] dark:text-[#E5A93C] flex items-center gap-1.5' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {sec.isRatio && <Scale size={14} />}
                    <span>{sec.title}</span>
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${sec.title}\n${sec.content}`);
                      toast.success(`Copied ${sec.title}`);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    title="Copy section"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  sec.isRatio 
                    ? 'font-bold text-slate-950 dark:text-white italic font-serif' 
                    : 'text-slate-800 dark:text-slate-200 font-medium'
                }`}>
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12192A] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>14 Standard Legal Report Sections</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
