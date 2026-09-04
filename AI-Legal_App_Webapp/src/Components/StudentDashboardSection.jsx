import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Flame, Sparkles, Search, 
  FileText, Award, CheckCircle2, ArrowRight, Brain, 
  HelpCircle, Compass, Bookmark, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STUDENT_TOOLS = [
  {
    id: 'legal_research',
    title: 'Case Law Summarizer',
    desc: 'Summarize complex Supreme Court & High Court judgments into concise IRAC format.',
    icon: FileText,
    badge: 'Popular',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    query: '?tool=legal_research',
  },
  {
    id: 'legal_precedents',
    title: 'Bare Act & Precedent Tutor',
    desc: 'Deep-dive into IPC, BNS, CrPC & Constitution sections with AI explanation.',
    icon: BookOpen,
    badge: 'Study Tool',
    color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400',
    query: '?tool=legal_precedents',
  },
  {
    id: 'legal_argument_builder',
    title: 'Moot Court Trainer',
    desc: 'Practice oral arguments, counter-pleas, and bench questioning for law competitions.',
    icon: Brain,
    badge: 'Interactive',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    query: '?tool=legal_argument_builder',
  },
  {
    id: 'legal_draft_maker',
    title: 'Legal Essay & Draft Maker',
    desc: 'Draft legal notices, petitions, moot court memorials, and academic papers.',
    icon: GraduationCap,
    badge: 'Academic',
    color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
    query: '?tool=legal_draft_maker',
  },
];

export default function StudentDashboardSection({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const userName = user?.name || 'Law Student';
  
  // Calculate dynamic streak based on join date
  const createdDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  const daysActive = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <div className="space-y-6">
      {/* 1. Header & Motivational Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-purple-950/40 border border-indigo-500/30 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Student AI Workspace & Learning Hub</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {userName}! 🎓
          </h2>
          <p className="text-sm text-slate-300">
            Boost your legal studies with AI precedent analysis, moot court training, and case summarization.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/chat/new?tool=legal_research')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI Tutor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Study Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Study Streak */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Study Streak</span>
            <span className="text-xl">🔥</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{daysActive} Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Keep learning every day!</p>
        </div>

        {/* Learning Goal Progress */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Daily Study Goal</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-300">4 / 5</span>
            <span className="text-xs font-bold text-indigo-400">80%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full w-[80%]" />
          </div>
        </div>

        {/* Saved Research & Summaries */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saved Case Notes</span>
            <Bookmark className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">12 Notes</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for exams & moots</p>
        </div>

        {/* Exams / Competition Prep */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Judiciary / AIBE Prep</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-300">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bare Act & Quiz Practice</p>
        </div>
      </div>

      {/* 3. Student AI Tools Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span>Essential Student AI Tools</span>
          </h3>
          <span className="text-xs text-slate-400">Tailored for law school & judiciary aspirants</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDENT_TOOLS.map((t) => {
            const ToolIcon = t.icon;
            return (
              <div
                key={t.id}
                onClick={() => navigate(`/dashboard/chat/new${t.query}`)}
                className="group relative p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all duration-300 cursor-pointer shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${t.color}`}>
                      <ToolIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {t.title}
                      </h4>
                      <span className="inline-block mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-indigo-500/20">
                        {t.badge}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Study Assistant Prompt Launcher */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Quick Study Prompts</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            'Explain Section 300 IPC vs Culpable Homicide with examples',
            'Summarize Kesavananda Bharati Sripadagalvaru v. State of Kerala',
            'Draft a Moot Court Memorial Argument for Appellant',
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}`)}
              className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-300 hover:text-white transition-all duration-200 line-clamp-2"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
