import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Search, FileText, Scale, Binary, FileCheck, 
  Brain, Gavel, GraduationCap, Building2, MessageSquare, 
  BookOpen, Award, Sparkles, ArrowRight, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { selectedRoleState } from '../userStore/userData';

const ALL_TOOLS = [
  // Advocate & Litigation Tools
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Architect FIRs, Affidavits, Petitions & Commercial Agreements.',
    icon: FileText,
    badge: 'Core Tool',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    path: '/dashboard/chat/new?tool=legal_draft_maker',
  },
  {
    id: 'argument-builder',
    title: 'Court Prep & Argument Builder',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Hearing intelligence, oral arguments, counter-pleas & judge profiling.',
    icon: Gavel,
    badge: 'Popular',
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400',
    path: '/dashboard/chat/new?tool=legal_argument_builder',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedent Search',
    category: 'litigation',
    roleTarget: 'all',
    description: 'Supreme Court & High Court searchable judgments with automatic citations.',
    icon: Scale,
    badge: 'Research',
    color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
    path: '/dashboard/chat/new?tool=legal_precedents',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analysis & OCR',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'OCR document scanning, authenticity scoring & evidentiary gap detection.',
    icon: Binary,
    badge: 'Forensics',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
    path: '/dashboard/chat/new?tool=legal_evidence_checker',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract & Clause Review',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'AI clause risk detection, missing indemnity alerts & compliance audit.',
    icon: FileCheck,
    badge: 'Audit',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    path: '/dashboard/chat/new?tool=legal_contract_analyzer',
  },
  {
    id: 'case-predictor',
    title: 'Case Outcome Predictor',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Statistical success probability & litigation risk forecasting.',
    icon: Scale,
    badge: 'Analytics',
    color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30 text-indigo-400',
    path: '/dashboard/chat/new?tool=legal_case_predictor',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    category: 'litigation',
    roleTarget: 'advocate',
    description: 'Custom tactical litigation roadmap & procedural timeline generator.',
    icon: Brain,
    badge: 'AI Engine',
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-400',
    path: '/dashboard/chat/new?tool=legal_strategy_engine',
  },

  // Student & Exam Tools
  {
    id: 'case-summarizer',
    title: 'Case Law Summarizer',
    category: 'student',
    roleTarget: 'student',
    description: 'Summarize lengthy Supreme Court & High Court judgments into IRAC format.',
    icon: BookOpen,
    badge: 'Student Choice',
    color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400',
    path: '/dashboard/chat/new?tool=legal_research',
  },
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    category: 'student',
    roleTarget: 'student',
    description: 'Moot court practice with AI Judge, opposing counsel & live scoring.',
    icon: GraduationCap,
    badge: 'Interactive',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    path: '/dashboard/chat/new?prompt=Start%20AI%20Mock%20Courtroom%20Practice',
  },
  {
    id: 'quiz-practice',
    title: 'Quiz & MCQ Practice',
    category: 'student',
    roleTarget: 'student',
    description: 'Judiciary & AIBE exam prep with topic MCQs and detailed answers.',
    icon: Award,
    badge: 'Exam Prep',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    path: '/dashboard/chat/new?prompt=Generate%20Judiciary%20MCQ%20Quiz%20on%20BNS%20and%20IPC',
  },

  // Law Firm & Enterprise Tools
  {
    id: 'client-connect',
    title: 'AI Client Connect™',
    category: 'firm',
    roleTarget: 'law_firm',
    description: 'Smart WhatsApp & Call draft generator for hearing reminders & billing updates.',
    icon: MessageSquare,
    badge: 'Firm Hub',
    color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400',
    path: '/dashboard/chat/new?prompt=Generate%20Client%20Hearing%20Reminder%20Message',
  },
  {
    id: 'firm-workspace',
    title: 'Firm Member Manager',
    category: 'firm',
    roleTarget: 'law_firm',
    description: 'Seat allocations, team member designations & shared litigation folders.',
    icon: Building2,
    badge: 'Enterprise',
    color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
    path: '/dashboard',
  },
];

export default function AiToolsPage() {
  const navigate = useNavigate();
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTools = ALL_TOOLS.filter((tool) => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#030712] pt-24 pb-16 px-6 md:px-16 max-w-6xl mx-auto text-[#111827] dark:text-white font-sans space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-indigo-950/50 border border-amber-500/20 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>AI Legal Toolkit Library</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Specialized AI Tools & Generators ⚡
          </h1>
          <p className="text-xs text-slate-300">
            Select an AI tool tailored for your {selectedRole.toUpperCase()} litigation and research workflows.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search AI Legal Tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Tools' },
            { id: 'litigation', label: 'Litigation & Drafting' },
            { id: 'student', label: 'Student & Exams' },
            { id: 'firm', label: 'Law Firm & Team' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((t) => {
          const IconComp = t.icon;
          return (
            <motion.div
              key={t.id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(t.path)}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 cursor-pointer shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${t.color}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {t.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-400 transition-colors">
                  {t.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-amber-500">
                <span>Launch Tool</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
