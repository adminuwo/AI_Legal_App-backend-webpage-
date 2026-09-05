import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { selectedRoleState } from '../userStore/userData';
import { motion } from 'framer-motion';
import { 
  Zap, FileText, Scale, Binary, FileCheck, 
  Brain, Gavel, GraduationCap, Building2, MessageSquare, 
  BookOpen, Award, ArrowRight, ShieldAlert, CheckCircle2,
  Mic, Users, BookMarked, HelpCircle, FileCheck2, ShieldCheck, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import toast from 'react-hot-toast';

const ALL_TOOLS = [
  // Core Litigation & Drafting
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Architect FIRs, Affidavits, Petitions, Plaints, Bail Applications, Commercial Agreements & Legal Notices under BNS/CPC.',
    highlights: ['FIR & Petitions', 'Order VII CPC', 'PDF/Word Export'],
    icon: FileText,
    badge: 'Core Tool',
    path: '/dashboard/tools/draft-maker',
  },
  {
    id: 'argument-builder',
    title: 'Argument Builder',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Hearing intelligence, 5-point oral submissions, opposition counter-pleas, judge profiling & submission checklist.',
    highlights: ['Oral Submissions', 'Counter-Rebuttals', 'Judge Profiling'],
    icon: Gavel,
    badge: 'Popular',
    path: '/dashboard/tools/argument-builder',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedents',
    category: 'research',
    roleTarget: 'all',
    description: 'Search Supreme Court & High Court landmark judgments with auto-citations, ratio decidendi & SCC/AIR citation format.',
    highlights: ['Supreme Court & HCs', 'Ratio Decidendi', 'AIR/SCC Citations'],
    icon: BookOpen,
    badge: 'Precedents',
    path: '/dashboard/tools/legal-precedents',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analyst',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'OCR exhibit scanning, admissibility score dial (0-100%), witness deposition contradiction table & missing proof alerts.',
    highlights: ['Sec 65B BSA OCR', 'Admissibility Gauge', 'Deposition Contradictions'],
    icon: Binary,
    badge: 'Forensics',
    path: '/dashboard/tools/evidence-analyst',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract Analyzer',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Clause risk audit cards, executive risk rating (Low/Med/High/Critical), redline replacement suggestions & missing indemnity alerts.',
    highlights: ['Clause Audit', 'Redline Suggestions', 'Risk Rating Badge'],
    icon: FileCheck,
    badge: 'Audit',
    path: '/dashboard/tools/contract-analyzer',
  },
  {
    id: 'case-predictor',
    title: 'Case Predictor',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Statistical success probability dial, judicial trend analysis, litigation duration forecast & settlement value range.',
    highlights: ['Win Probability %', 'Judicial Bench Trends', 'Settlement Range'],
    icon: Scale,
    badge: 'Analytics',
    path: '/dashboard/tools/case-predictor',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Custom tactical litigation roadmap under BNS/CrPC/CPC, cross-examination question builder & interim relief timing.',
    highlights: ['Tactical Roadmap', 'Cross-Exam Questions', 'Interim Reliefs'],
    icon: Brain,
    badge: 'AI Engine',
    path: '/dashboard/tools/strategy-engine',
  },
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    category: 'interactive',
    roleTarget: 'advocate',
    description: 'Interactive voice & text courtroom practice with simulated AI Judge, opposing counsel objections & trial scoring.',
    highlights: ['Voice AI Judge', 'Objection Handling', 'Courtroom Score'],
    icon: Mic,
    badge: 'Voice AI',
    path: '/dashboard/tools/mock-courtroom',
  },
  {
    id: 'client-connect',
    title: 'AI Client Connect',
    category: 'firm',
    roleTarget: 'advocate',
    description: 'Automated client WhatsApp/SMS hearing reminders, legal fee follow-up drafter & client communication history.',
    highlights: ['WhatsApp Reminders', 'Client CRM', 'Status Broadcasts'],
    icon: MessageSquare,
    badge: 'Client CRM',
    path: '/dashboard/tools/client-connect',
  },


];

const STUDENT_TOOLS_CATALOG = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    category: 'academic',
    roleTarget: 'student',
    description: 'Draft moot court memorials (Appellant/Respondent), academic legal essays, petitions & legal notices under BNS/CPC.',
    highlights: ['Moot Memorial Template', 'Pleadings Layout', 'PDF/Word Export'],
    icon: GraduationCap,
    badge: 'Academic',
    path: '/dashboard/tools/draft-maker',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedent',
    category: 'academic',
    roleTarget: 'student',
    description: 'Explain Constitution, IPC, BNS, CrPC, BNSS & important statutory sections and landmark Supreme Court judgments.',
    highlights: ['BNS vs IPC Comparison', 'Section Breakdown', 'Landmark Precedents'],
    icon: BookOpen,
    badge: 'Study Tool',
    path: '/dashboard/tools/legal-precedents',
  },
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    category: 'interactive',
    roleTarget: 'student',
    description: 'Interactive voice & text moot court practice with simulated AI Judge, opposing counsel objections & trial scoring.',
    highlights: ['Voice AI Judge', 'Objection Handling', 'Courtroom Score'],
    icon: Mic,
    badge: 'Voice AI',
    path: '/dashboard/tools/mock-courtroom',
  },
  {
    id: 'quiz-practice',
    title: 'Quiz & MCQ Practice',
    category: 'exam',
    roleTarget: 'student',
    description: 'Generate interactive MCQs, topic quizzes & prelims practice for Judiciary (PCS-J) & AIBE exams.',
    highlights: ['Judiciary PCS-J MCQs', 'AIBE Exam Practice', 'Instant Explanations'],
    icon: FileCheck2,
    badge: 'Exam Prep',
    path: '/dashboard/tools/quiz-practice',
  },
  {
    id: 'ai-notes-maker',
    title: 'AI Notes Maker',
    category: 'notes',
    roleTarget: 'student',
    description: 'Create, structure, and auto-summarize study notes, judgment takeaways & exam revision outlines.',
    highlights: ['Note Auto-Structure', 'Exam Outlines', 'Judiciary Flashcards'],
    icon: BookMarked,
    badge: 'Notes Workspace',
    path: '/dashboard/tools/notes-maker',
  },
];

const FIRM_TOOLS_CATALOG = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'Architect FIRs, Affidavits, Petitions, Plaints, Bail Applications, Commercial Agreements & Legal Notices under BNS/CPC.',
    highlights: ['FIR & Petitions', 'Order VII CPC', 'PDF/Word Export'],
    icon: FileText,
    badge: 'Enterprise Core',
    path: '/dashboard/tools/draft-maker',
  },
  {
    id: 'argument-builder',
    title: 'Court Prep Workspace',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'Hearing intelligence, 5-point oral submissions, opposition counter-pleas, judge profiling & submission checklist.',
    highlights: ['Oral Submissions', 'Counter-Rebuttals', 'Court Prep Intelligence'],
    icon: Gavel,
    badge: 'Popular',
    path: '/dashboard/tools/argument-builder',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedents',
    category: 'research',
    roleTarget: 'law_firm',
    description: 'Search Supreme Court & High Court landmark judgments with auto-citations, ratio decidendi & SCC/AIR citation format.',
    highlights: ['Supreme Court & HCs', 'Ratio Decidendi', 'AIR/SCC Citations'],
    icon: BookOpen,
    badge: 'Precedents',
    path: '/dashboard/tools/legal-precedents',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analysis',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'OCR exhibit scanning, admissibility score dial (0-100%), witness deposition contradiction table & missing proof alerts.',
    highlights: ['Sec 65B BSA OCR', 'Admissibility Gauge', 'Deposition Contradictions'],
    icon: Binary,
    badge: 'Forensics',
    path: '/dashboard/tools/evidence-analyst',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract Review',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'Clause risk audit cards, executive risk rating (Low/Med/High/Critical), redline replacement suggestions & missing indemnity alerts.',
    highlights: ['Clause Audit', 'Redline Suggestions', 'Risk Rating Badge'],
    icon: FileCheck,
    badge: 'Audit',
    path: '/dashboard/tools/contract-analyzer',
  },
  {
    id: 'case-predictor',
    title: 'Case Predictor',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'Statistical success probability dial, judicial trend analysis, litigation duration forecast & settlement value range.',
    highlights: ['Win Probability %', 'Judicial Bench Trends', 'Settlement Range'],
    icon: Scale,
    badge: 'Analytics',
    path: '/dashboard/tools/case-predictor',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    category: 'litigation',
    roleTarget: 'law_firm',
    description: 'Custom tactical litigation roadmap under BNS/CrPC/CPC, cross-examination question builder & interim relief timing.',
    highlights: ['Tactical Roadmap', 'Cross-Exam Questions', 'Interim Reliefs'],
    icon: Brain,
    badge: 'AI Engine',
    path: '/dashboard/tools/strategy-engine',
  },
  {
    id: 'client-connect',
    title: 'AI Team Communication',
    category: 'firm',
    roleTarget: 'law_firm',
    description: 'Automated team broadcasts, internal associate case updates, WhatsApp hearing reminders & client CRM notes.',
    highlights: ['Team Broadcasts', 'WhatsApp Reminders', 'Status Broadcasts'],
    icon: Users,
    badge: 'Team CRM',
    path: '/dashboard/tools/client-connect',
  },
];

import LegalDraftMakerModal from '../Components/LegalDraftMakerModal';
import LegalArgumentBuilderModal from '../Components/LegalArgumentBuilderModal';
import LegalPrecedentsModal from '../Components/LegalPrecedentsModal';
import LegalEvidenceAnalystModal from '../Components/LegalEvidenceAnalystModal';
import LegalContractAnalyzerModal from '../Components/LegalContractAnalyzerModal';
import LegalCasePredictorModal from '../Components/LegalCasePredictorModal';
import LegalStrategyEngineModal from '../Components/LegalStrategyEngineModal';
import LegalMockCourtroomModal from '../Components/LegalMockCourtroomModal';

export default function AiToolsPage() {
  const navigate = useNavigate();
  const { plan, getFeatureUsage, isFeatureLocked, isFeatureLimitReached, triggerUpgradeModal } = useSubscription();
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isArgumentModalOpen, setIsArgumentModalOpen] = useState(false);
  const [isPrecedentsModalOpen, setIsPrecedentsModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isPredictorModalOpen, setIsPredictorModalOpen] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isCourtroomModalOpen, setIsCourtroomModalOpen] = useState(false);

  const activeCatalog = selectedRole === 'law_firm' ? FIRM_TOOLS_CATALOG : selectedRole === 'student' ? STUDENT_TOOLS_CATALOG : ALL_TOOLS;

  const getToolUsageStatus = (toolId) => {
    // 1. Check Institutional Feature Access Policy for Linked Students / Enterprise Accounts
    const enterpriseRulesStr = localStorage.getItem('enterpriseFeatureAccessRules');
    if (enterpriseRulesStr) {
      try {
        const rules = JSON.parse(enterpriseRulesStr);
        const featureKeyMap = {
          'draft-maker': 'draftMaker',
          'argument-builder': 'strategyEngine',
          'legal-precedents': 'legalResearch',
          'evidence-analyst': 'evidenceAnalyst',
          'contract-analyzer': 'contractAnalyzer',
          'case-predictor': 'casePredictor',
          'strategy-engine': 'strategyEngine',
          'mock-courtroom': 'mockCourtroom',
          'quiz-practice': 'quizPractice',
          'notes-maker': 'aiNotes',
          'ai-notes-maker': 'aiNotes'
        };
        const entKey = featureKeyMap[toolId];
        if (entKey && rules[entKey] === false) {
          return {
            status: 'INSTITUTION_DISABLED',
            text: '🔒 Institution Disabled',
            badgeClass: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold border-slate-300 dark:border-slate-700'
          };
        }
      } catch (e) {}
    }

    const keyMap = {
      'draft-maker': 'draft_maker',
      'argument-builder': 'court_prep',
      'legal-precedents': 'legal_precedent',
      'evidence-analyst': 'evidence_analysis',
      'contract-analyzer': 'contract_review',
      'case-predictor': 'case_predictor',
      'strategy-engine': 'strategy_engine',
      'client-connect': 'client_connect',
      'mock-courtroom': 'mock_courtroom',
      'notes-maker': 'notes_maker',
      'quiz-practice': 'quiz_practice'
    };
    const featureKey = keyMap[toolId] || toolId.replace(/-/g, '_');
    const feat = getFeatureUsage(featureKey);
    const locked = isFeatureLocked(featureKey);
    const limitReached = isFeatureLimitReached(featureKey);

    if (plan === 'SUPER_ADMIN' || plan === 'ENTERPRISE' || feat.limit === -1) {
      return { 
        status: 'UNLIMITED', 
        text: plan === 'SUPER_ADMIN' || plan === 'ENTERPRISE' ? 'Enterprise' : '∞ Unlimited', 
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/40' 
      };
    }

    const defaultLimit = ['mock_courtroom', 'client_connect'].includes(featureKey) ? 1 : 2;
    const limit = (feat && typeof feat.limit === 'number' && feat.limit > 0) ? feat.limit : defaultLimit;
    const used = (feat && typeof feat.used === 'number') ? feat.used : 0;
    const remaining = (feat && typeof feat.remaining === 'number') ? Math.max(0, limit - used) : (feat?.remaining !== undefined ? feat.remaining : Math.max(0, limit - used));

    const isExhausted = remaining <= 0 || limitReached;

    if (locked) {
      return { status: 'LOCKED BY PLAN', text: 'LOCKED BY PLAN', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/40 font-bold' };
    }
    if (isExhausted) {
      return { 
        status: 'LIMIT REACHED', 
        text: `0/${limit} UPGRADE NEEDED`, 
        badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-300 dark:bg-rose-950/60 dark:border-rose-800/60 font-black uppercase tracking-wider shadow-2xs' 
      };
    }

    return { 
      status: 'AVAILABLE', 
      text: `${remaining}/${limit} ${plan === 'FREE' ? 'FREE' : 'LEFT'}`, 
      badgeClass: 'bg-[#C8A34D]/15 text-[#C8A34D] border-[#C8A34D]/30 font-extrabold' 
    };
  };

  const handleLaunchTool = (tool) => {
    const usage = getToolUsageStatus(tool.id);
    if (usage.status === 'INSTITUTION_DISABLED') {
      toast.error(`🔒 Access to "${tool.title}" has been disabled by your Law College / University Administrator.`);
      return;
    }
    if (usage.status === 'LOCKED BY PLAN' || usage.status === 'LIMIT REACHED') {
      triggerUpgradeModal({
        title: usage.status === 'LOCKED BY PLAN' ? 'Feature Locked by Plan' : 'Limit Reached',
        message: usage.status === 'LOCKED BY PLAN' 
          ? `The ${tool.title} feature is locked under your current plan.` 
          : `You have reached your usage limit for ${tool.title}.`,
        feature: tool.id
      });
      return;
    }
    if (tool.path) {
      navigate(tool.path);
      return;
    }
    if (tool.id === 'draft-maker') {
      navigate('/dashboard/tools/draft-maker');
    } else if (tool.id === 'argument-builder') {
      navigate('/dashboard/tools/argument-builder');
    } else if (tool.id === 'legal-precedents') {
      navigate('/dashboard/tools/legal-precedents');
    } else if (tool.id === 'evidence-analyst') {
      navigate('/dashboard/tools/evidence-analyst');
    } else if (tool.id === 'contract-analyzer') {
      navigate('/dashboard/tools/contract-analyzer');
    } else if (tool.id === 'case-predictor') {
      navigate('/dashboard/tools/case-predictor');
    } else if (tool.id === 'strategy-engine') {
      navigate('/dashboard/tools/strategy-engine');
    } else if (tool.id === 'mock-courtroom') {
      navigate('/dashboard/tools/mock-courtroom');
    } else if (tool.id === 'client-connect') {
      navigate('/dashboard/tools/client-connect');
    } else {
      navigate(tool.path);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#111111] pt-3 sm:pt-4 md:pt-6 pb-12 px-3 sm:px-6 md:px-12 w-full max-w-7xl mx-auto text-[#111111] dark:text-white font-sans space-y-4 sm:space-y-6 overflow-x-hidden min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 sm:p-6 rounded-xl bg-white dark:bg-[#1E293B] border border-[#C8A34D]/30 shadow-sm w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="inline-flex max-w-full min-w-0 items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-[#C8A34D] text-[9.5px] sm:text-[11px] font-semibold">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C8A34D] shrink-0" />
            <span className="truncate min-w-0">{selectedRole === 'student' ? 'Student AI Learning Suite • Rolex Minimalist Theme' : 'Advocate Enterprise AI Suite • Rolex Minimalist Theme'}</span>
          </div>
          <h1 className="text-lg sm:text-3xl font-black tracking-tight text-[#0F172A] dark:text-white truncate min-w-0">
            {selectedRole === 'student' ? 'Student AI Tools Suite ⚡' : 'Advocate AI Tools Suite ⚡'}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-snug">
            {selectedRole === 'student' 
              ? 'Accelerate your legal education, moot court argument building, IRAC judgment analysis, statutory bare act study, and judicial exam preparation.'
              : 'Empower your litigation, courtroom argument building, evidence forensics, contract risk auditing, case outcome prediction, and legal drafting with Soft Gold enterprise AI tools.'}
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
        {activeCatalog.map((t) => {
          const IconComp = t.icon;
          const usage = getToolUsageStatus(t.id);
          return (
            <motion.div
              key={t.id}
              whileHover={usage.status === 'INSTITUTION_DISABLED' ? {} : { y: -3 }}
              onClick={() => handleLaunchTool(t)}
              className={`group p-3.5 sm:p-5 rounded-xl bg-white dark:bg-[#1E293B] border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between w-full min-w-0 overflow-hidden ${
                usage.status === 'INSTITUTION_DISABLED'
                  ? 'opacity-50 grayscale-[40%] border-slate-300 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2.5 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-[#C8A34D]/10 border border-[#C8A34D]/25 text-[#C8A34D] shrink-0">
                    <IconComp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#C8A34D]" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0 ${usage.badgeClass}`}>
                    {usage.text}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#111111] dark:text-white group-hover:text-[#C8A34D] transition-colors leading-tight truncate">
                  {t.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                  {t.description}
                </p>

                {/* Spec Highlights */}
                {t.highlights && (
                  <div className="flex flex-wrap gap-1 mt-2.5 sm:mt-3 min-w-0">
                    {t.highlights.map((h, i) => (
                      <span key={i} className="text-[9px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 max-w-full truncate">
                        • {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-[#C8A34D]">
                <span>Start</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 6-Step Legal Draft Maker Wizard Modal */}
      <LegalDraftMakerModal 
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
      />

      {/* 4-Step Courtroom Argument Builder Modal */}
      <LegalArgumentBuilderModal
        isOpen={isArgumentModalOpen}
        onClose={() => setIsArgumentModalOpen(false)}
      />

      {/* 4-Step Legal Precedents Search Modal */}
      <LegalPrecedentsModal
        isOpen={isPrecedentsModalOpen}
        onClose={() => setIsPrecedentsModalOpen(false)}
      />

      {/* 4-Step Evidence Analyst & Forensics Modal */}
      <LegalEvidenceAnalystModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
      />

      {/* 4-Step Contract Review & Risk Audit Modal */}
      <LegalContractAnalyzerModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
      />

      {/* 4-Step Case Outcome Predictor Modal */}
      <LegalCasePredictorModal
        isOpen={isPredictorModalOpen}
        onClose={() => setIsPredictorModalOpen(false)}
      />

      {/* 4-Step Legal Strategy Engine Modal */}
      <LegalStrategyEngineModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
      />

      {/* 4-Step AI Mock Courtroom Simulator Modal */}
      <LegalMockCourtroomModal
        isOpen={isCourtroomModalOpen}
        onClose={() => setIsCourtroomModalOpen(false)}
      />
    </div>
  );
}

