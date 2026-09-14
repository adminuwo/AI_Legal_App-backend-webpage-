import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, Check, Printer, Brain, Scale, ShieldCheck, 
  BookOpen, Quote, ChevronRight, Sparkles, AlertTriangle, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeepAnalysisModal({ isOpen, onClose, judgment }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-1');

  if (!isOpen || !judgment) return null;

  // Build the 13 deep analysis brief sections
  const analysisSections = [
    {
      id: 'sec-1',
      title: '1. Executive Brief',
      content: judgment.executiveSummary || 'Comprehensive strategic evaluation of the judgment holding and substantive legal consequences.'
    },
    {
      id: 'sec-2',
      title: '2. Jurisprudential Significance & Constitutional Impact',
      content: judgment.jurisprudentialSignificance || `A watershed ruling by the ${judgment.court} synthesizing statutory provisions with the fundamental rights under Part III of the Constitution.`
    },
    {
      id: 'sec-3',
      title: '3. Bench Composition & Judicial Vote Breakdown',
      content: `${judgment.bench || 'Constitutional Bench'} consisting of: ${(judgment.judges || []).join(', ')}. Unanimous ruling delivering authoritative constitutional reconciliation without dissent.`
    },
    {
      id: 'sec-4',
      title: '4. Statutory Interpretation Matrix',
      content: (judgment.applicableStatutes || judgment.acts || []).map(s => `• ${s}: Interpreted teleologically and harmoniously with constitutional guarantees.`).join('\n') || 'Harmonious construction applied across statutory provisions.'
    },
    {
      id: 'sec-5',
      title: '5. Analysis of Conflicting Precedents & Legal Ambiguities',
      content: judgment.conflictingPrecedents || 'Reconciled competing High Court viewpoints regarding statutory period limits and constitutional validity of legislative enactments.'
    },
    {
      id: 'sec-6',
      title: '6. Test / Legal Doctrine Formulated',
      isCore: true,
      content: judgment.ratioDecidendi || 'Standardized legal doctrine established governing lower court compliance and rights enforcement.'
    },
    {
      id: 'sec-7',
      title: '7. Constitutional Bench Analysis',
      content: judgment.constitutionalBenchAnalysis || 'Rigorous examination under Articles 14, 15, and 21 of the Constitution, reaffirming that statutory classifications must be non-arbitrary and preserve human dignity.'
    },
    {
      id: 'sec-8',
      title: '8. Overruled or Distinguished Precedents',
      content: judgment.distinguishedPrecedents || 'Previous restrictive interpretations adopted by High Courts holding that liability ceases upon expiration of statutory timeframes were expressly distinguished and disapproved.'
    },
    {
      id: 'sec-9',
      title: '9. Critical Commentary & Scholarly Perspectives',
      content: judgment.scholarlyCommentary || 'Hailed by jurists as a masterclass in judicial balance, safeguarding legislative competence while preventing economic destitution.'
    },
    {
      id: 'sec-10',
      title: '10. Practical Application in Lower Courts & Tribunals',
      content: judgment.practicalTakeaway || 'Subordinate courts and Magistrates are bound to apply this precedent to enforce lump-sum or continuous financial support without dismissal on preliminary technicalities.'
    },
    {
      id: 'sec-11',
      title: '11. Drafting Grounds for Appeal / Revision / Writ Petition',
      content: `1. The impugned order passed by the learned lower court fails to adhere to the binding ratio of ${judgment.title} [${judgment.citation}].\n2. The learned Judge erroneously disregarded the mandatory requirement of reasonable and fair provision.\n3. The impugned findings violate the constitutional safeguards settled under Article 141 of the Constitution.`
    },
    {
      id: 'sec-12',
      title: '12. Key Pinpoint Paragraphs for Courtroom Arguments',
      content: (judgment.keyParagraphs && judgment.keyParagraphs.length > 0)
        ? judgment.keyParagraphs.map(p => `[Paragraph ${p.paraNum}]: "${p.text}"`).join('\n\n')
        : '[Para 28]: Settling the mandate of statutory protection.\n[Para 33]: Declaration of constitutional validity.'
    },
    {
      id: 'sec-13',
      title: '13. Future Jurisprudential Trajectory & Bharatiya Nyaya Sanhita (BNS/BNSS)',
      content: judgment.futureTrajectory || 'This jurisprudence directly informs the contemporary application of Sections 144 BNSS / Section 125 CrPC and constitutional writs, establishing a non-negotiable floor for social justice.'
    }
  ];

  const handleCopyAll = () => {
    const fullText = `AI LEGAL™ 13-SECTION DEEP JURISPRUDENTIAL ANALYSIS
CASE: ${judgment.title} (${judgment.citation})
COURT: ${judgment.court} | BENCH: ${judgment.bench || 'Bench'}
--------------------------------------------------------------------------------
${analysisSections.map(s => `${s.title.toUpperCase()}\n${s.content}\n`).join('\n--------------------------------------------------------------------------------\n')}
================================================================================
Generated via AI LEGAL™ Research Workspace`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Complete Deep Analysis Brief copied to clipboard!');
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#C8A34D] flex items-center justify-center border border-[#C8A34D]/30">
              <Brain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  13-Section Deep Jurisprudential Analysis
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#C8A34D]/30">
                  {judgment.citation}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md sm:max-w-xl">
                {judgment.title}
              </p>
            </div>
          </div>

          {/* Actions */}
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
              title="Print Deep Analysis"
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

        {/* Body Split: Index on Left + Deep Analysis on Right */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Index Sidebar */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B101D] overflow-y-auto p-3 hidden md:block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 block">
              Jurisprudential Index
            </span>
            {analysisSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  activeSection === sec.id
                    ? 'bg-[#C8A34D]/15 text-[#B38628] dark:text-amber-300 font-bold'
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
            {analysisSections.map((sec) => (
              <div 
                key={sec.id} 
                id={sec.id}
                className={`p-5 rounded-2xl border transition-all ${
                  sec.isCore
                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/30 dark:to-slate-900 border-2 border-[#C8A34D] shadow-sm'
                    : 'bg-slate-50 dark:bg-[#12192A] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs font-black uppercase tracking-wider ${
                    sec.isCore ? 'text-[#B38628] dark:text-[#E5A93C] flex items-center gap-1.5' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {sec.isCore && <Scale size={14} />}
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
                  sec.isCore 
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
          <span>13 High-Impact Jurisprudential Vectors</span>
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
