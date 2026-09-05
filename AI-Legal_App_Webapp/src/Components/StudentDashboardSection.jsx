import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Flame, Sparkles, Search, 
  FileText, Award, CheckCircle2, ArrowRight, Brain, 
  HelpCircle, Compass, Bookmark, Clock, CheckSquare, Zap, Play,
  BarChart2, Ribbon, ChevronRight, HelpCircle as HelpIcon, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentProductGuideModal from './StudentProductGuideModal';

export default function StudentDashboardSection({ user, cases = [] }) {
  const navigate = useNavigate();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const userName = user?.name || 'Law Student';
  
  // Calculate dynamic metrics based on real user data
  const createdDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  const daysActive = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Dynamic user cases / student matters count (strictly 0 for brand new user)
  const savedMattersCount = Array.isArray(cases) ? cases.length : 0;
  const mattersLimit = 3;

  // Tools completed dynamic tracking from local user activity storage (0 for fresh user)
  const userIdStr = user?._id || user?.id || 'default';
  const completedToolsCount = parseInt(localStorage.getItem(`student_tools_completed_${userIdStr}`) || '0', 10);
  const toolsLimit = 5;

  // Total Study Progress % calculation
  const totalTargetItems = mattersLimit + toolsLimit;
  const totalAchievedItems = Math.min(totalTargetItems, savedMattersCount + completedToolsCount);
  const progressPercent = totalTargetItems > 0 ? Math.round((totalAchievedItems / totalTargetItems) * 100) : 0;

  const studentDashboardData = {
    streak: daysActive,
    toolsCompleted: completedToolsCount,
    toolsLimit: toolsLimit,
    savedMatters: savedMattersCount,
    mattersLimit: mattersLimit,
    progressPercent: progressPercent,
    hoursStudied: (completedToolsCount * 1.5 + (savedMattersCount > 0 ? 1 : 0)).toFixed(1),
  };

  const handleTopicClick = (topicPrompt) => {
    navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(topicPrompt)}&autoSend=true`);
  };

  return (
    <div className="space-y-6 select-none pb-8">
      {/* 1. TODAY'S LEARNING HEADER */}
      <div className="relative p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#C8A34D]" /> Law Student Portal
              </span>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="text-xs text-[#C8A34D] hover:underline font-semibold flex items-center gap-1 bg-[#C8A34D]/5 px-2 py-0.5 rounded-md cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#C8A34D]" /> AI Legal Product Guide
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white tracking-tight">
              Today's Learning
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Your daily AI study hub & exam prep progress
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-[#C8A34D]" />
              <span>Product Guide</span>
            </button>

            <button
              onClick={() => navigate('/dashboard/tools/knowledge-hub')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              <span>Knowledge Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STUDY PROGRESS + STUDY STREAK */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* Card 1 — Study Progress */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/25">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white">Study Progress</span>
            </div>
            <span className="text-xs font-bold text-[#C8A34D]">{studentDashboardData.progressPercent}%</span>
          </div>

          <div className="space-y-1 text-[11px] sm:text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
              <span>Completed Tools:</span>
              <span className="font-bold text-[#111827] dark:text-white">{studentDashboardData.toolsCompleted}/{studentDashboardData.toolsLimit}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
              <span>Saved Matters:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{studentDashboardData.savedMatters}/{studentDashboardData.mattersLimit}</span>
            </div>
          </div>

          <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#C8A34D] rounded-full" style={{ width: `${studentDashboardData.progressPercent}%` }} />
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">Usage Goal: {studentDashboardData.progressPercent}%</p>
        </div>

        {/* Card 2 — Study Streak */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-xl">🔥</span>
              <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white">Study Streak</span>
            </div>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400">
              {studentDashboardData.streak} Days
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Active Member</span>
          </div>

          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1 w-full sm:w-fit">
            <span className="truncate">🔥 Keep learning daily.</span>
          </div>
        </div>
      </div>

      {/* 3. CONTINUE LEARNING */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#C8A34D]/40 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> CONTINUE LEARNING
          </span>
          <h3 className="text-lg font-bold text-[#111827] dark:text-white tracking-tight">
            Bharatiya Nyaya Sanhita (BNS) 2023
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Key differences from IPC & Crimes Against Body • <span className="text-[#C8A34D] font-bold">{progressPercent > 0 ? `${progressPercent}%` : '0%'} Completed</span>
          </p>
          <div className="w-full max-w-md h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#C8A34D] rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard/tools/knowledge-hub')}
          className="px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs transition-all shadow-2xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>{progressPercent > 0 ? 'Resume Study' : 'Start Study'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4. QUICK LEARNING ACTIONS */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white">Quick Learning Actions</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div
            onClick={() => navigate('/dashboard/tools/notes-maker')}
            className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 hover:border-[#C8A34D]/50 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 group"
          >
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#C8A34D]/10 border border-[#C8A34D]/25 text-[#C8A34D] shrink-0">
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white group-hover:text-[#C8A34D] transition-colors">
                AI Notes Workspace
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Structure & summarize notes</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
          </div>

          <div
            onClick={() => navigate('/dashboard/tools/quiz-practice')}
            className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 hover:border-[#C8A34D]/50 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 group"
          >
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Quiz Practice
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">PCS-J & AIBE practice MCQs</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
          </div>
        </div>
      </div>

      {/* 5. TODAY'S CHALLENGE */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white">Today's Challenge</h3>
        <div className="space-y-2.5">
          {[
            {
              tag: 'DAILY QUIZ',
              title: '5 Questions on Constitutional Law & Fundamental Rights',
              path: '/dashboard/tools/quiz-practice',
              icon: CheckCircle2,
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40',
            },
            {
              tag: 'BARE ACT SUMMARY',
              title: 'Section 302 IPC vs Section 103 BNS Murder Rulings',
              path: '/dashboard/tools/knowledge-hub',
              icon: FileText,
              color: 'text-[#C8A34D] bg-[#C8A34D]/10 border-[#C8A34D]/25',
            },
            {
              tag: 'LANDMARK JUDGMENT',
              title: 'Kesavananda Bharati v. State of Kerala (Basic Structure Ratio)',
              path: '/dashboard/tools/legal-precedents',
              icon: Ribbon,
              color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40',
            },
          ].map((ch, idx) => {
            const IconC = ch.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(ch.path)}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 hover:border-[#C8A34D]/40 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3.5 group"
              >
                <div className={`p-2.5 rounded-xl border shrink-0 ${ch.color}`}>
                  <IconC className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    {ch.tag}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white group-hover:text-[#C8A34D] transition-colors">
                    {ch.title}
                  </h4>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. LEARNING ANALYTICS */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white">Learning Analytics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tool Usage Progress</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {studentDashboardData.progressPercent}%
            </div>
            <span className="text-[10px] text-slate-400">Plan Quota Active</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Matters</span>
            <div className="text-xl font-black text-amber-500 dark:text-amber-400 mt-1">
              {studentDashboardData.savedMatters} Saved
            </div>
            <span className="text-[10px] text-slate-400">Limit: {studentDashboardData.mattersLimit}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Precedent Research</span>
            <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1.5">
              {studentDashboardData.researchUsed} / {studentDashboardData.researchLimit} Used
            </div>
            <span className="text-[10px] text-slate-400">AI Legal Research</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hours Studied</span>
            <div className="text-xl font-black text-[#C8A34D] mt-1">
              {studentDashboardData.hoursStudied} hrs
            </div>
            <span className="text-[10px] text-slate-400">Calculated Activity</span>
          </div>
        </div>
      </div>

      {/* 7. AI RECOMMENDED TOPICS TODAY */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
          <Brain className="w-4.5 h-4.5 text-[#C8A34D]" />
          <span>AI Recommended Topics Today</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              title: 'Article 21 (Personal Liberty & Landmark Rulings)',
              prompt: 'Explain Article 21, personal liberty, and important landmark rulings in an exam-oriented manner.',
            },
            {
              title: 'BNS Theft & Extortion Section Changes',
              titleSub: 'Comparison between IPC Section 378/383 & BNS 2023',
              prompt: 'Explain Bharatiya Nyaya Sanhita (BNS) 2023 changes in Theft and Extortion provisions compared to IPC.',
            },
            {
              title: 'Indian Contract Act 1872 Void Agreements',
              prompt: 'Explain void agreements under Indian Contract Act 1872 with key exceptions and exam points.',
            },
            {
              title: 'Basic Structure Doctrine Ratios',
              prompt: 'Summarize Kesavananda Bharati ratio decidendi on Basic Structure Doctrine for law exams.',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleTopicClick(item.prompt)}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-[#C8A34D]/10 border border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-700 dark:text-slate-300 hover:text-[#C8A34D] hover:border-[#C8A34D]/40 transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 group"
            >
              <span className="font-semibold group-hover:text-[#C8A34D] transition-colors">• {item.title}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#C8A34D] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 8. AI LEGAL PRODUCT GUIDE MODAL */}
      <StudentProductGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
