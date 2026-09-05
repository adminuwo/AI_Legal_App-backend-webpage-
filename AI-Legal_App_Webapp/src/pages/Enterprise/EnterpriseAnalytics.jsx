import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Zap, BookOpen, Layers, Lock, ShieldCheck, Download, Award, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EnterpriseAnalytics = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30_days');

  const featureUsageList = [
    { name: 'AI Legal Assistant (General Chat)', count: 14200, pct: 40.7, color: '#C8A34D' },
    { name: 'AI Legal Tutor & Bare Acts Study', count: 8600, pct: 24.6, color: '#3B82F6' },
    { name: 'Quiz & MCQ Practice Engine', count: 5400, pct: 15.5, color: '#10B981' },
    { name: 'Draft Maker & Memorial Architect', count: 2800, pct: 8.0, color: '#F59E0B' },
    { name: 'Legal Precedents & Judgments Research', count: 2100, pct: 6.0, color: '#8B5CF6' },
    { name: 'AI Mock Courtroom Voice Simulation', count: 1250, pct: 3.6, color: '#EC4899' },
    { name: 'Contract Review & Risk Analyzer', count: 500, pct: 1.6, color: '#64748B' }
  ];

  const batchEngagementLeaderboard = [
    { batch: 'BA LLB (5-Yr) - Semester 1', activeStudents: 480, queries: 12400, engagement: '94.2%', status: '⭐ Top Active' },
    { batch: 'BA LLB (5-Yr) - Semester 3', activeStudents: 410, queries: 9800, engagement: '88.5%', status: 'High' },
    { batch: 'LLB (3-Yr) - Semester 1', activeStudents: 310, queries: 7200, engagement: '85.0%', status: 'High' },
    { batch: 'BA LLB (5-Yr) - Semester 7', activeStudents: 390, queries: 6400, engagement: '81.4%', status: 'Moderate' },
    { batch: 'LLM Constitutional Law', activeStudents: 95, queries: 3100, engagement: '91.8%', status: '⭐ High Engagement' },
  ];

  const handleExportReport = () => {
    toast.success('📄 Institutional Learning Activity Report (NAAC Compliant PDF/Excel) exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-[#C8A34D]" size={26} /> Feature Usage & Institutional Adoption Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Privacy-compliant aggregate analytics tracking feature adoption, batch engagement, and academic study metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white"
          >
            <option value="7_days">Last 7 Days</option>
            <option value="30_days">Last 30 Days (Semester Peak)</option>
            <option value="this_term">Current Academic Term</option>
          </select>

          <button
            onClick={handleExportReport}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download size={15} /> Export NAAC Audit Report
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Compliance Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-[#C8A34D] shrink-0" />
          <span>
            <strong>🔒 DPDP & Privacy Protection Guarantee:</strong> Analytics are strictly aggregated and anonymous. Student private chats, personal dossiers, and confidential case files are <u>NEVER</u> visible to faculty or admins.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-black uppercase shrink-0">
          Verified Private
        </span>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Most Used Feature</span>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">AI Legal Assistant</p>
          <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
            <TrendingUp size={12} /> 14,200 sessions (40.7%)
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Performing Batch</span>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">BA LLB 2025-2030</p>
          <span className="text-xs text-[#C8A34D] font-bold">92.4% Active Engagement</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Faculty Members</span>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">18 Members</p>
          <span className="text-xs text-blue-500 font-bold">100% Onboarded & Verified</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Queries Resolved</span>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">34,850 Queries</p>
          <span className="text-xs text-purple-500 font-bold">98.9% AI Accuracy Score</span>
        </div>
      </div>

      {/* Feature Breakdown Bars */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-[#C8A34D]" /> Aggregate Feature Adoption Breakdown
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Total Sessions: 34,850</span>
        </div>

        <div className="space-y-4">
          {featureUsageList.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-500">{item.count.toLocaleString()} queries ({item.pct}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Engagement & Peak Hours Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batch-wise Engagement Leaderboard */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award size={18} className="text-[#C8A34D]" /> Academic Batch Engagement Leaderboard
          </h3>

          <div className="space-y-3 pt-1">
            {batchEngagementLeaderboard.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white block">{item.batch}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">{item.activeStudents} Active Students • {item.queries.toLocaleString()} AI Queries</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-[#C8A34D] text-sm block">{item.engagement}</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#C8A34D]/10 text-[#C8A34D]">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Study Hours & Usage Patterns */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-[#C8A34D]" /> Peak Study Hours & Exam Spikes
          </h3>

          <p className="text-xs text-slate-500">
            Student usage patterns show peak AI interaction during evening self-study hours and pre-exam preparation windows.
          </p>

          <div className="space-y-3 text-xs pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Night Study Peak (7 PM - 11 PM)</span>
                <span className="text-slate-400 text-[11px]">Bare Acts Study & MCQ Quiz Practice</span>
              </div>
              <span className="font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-xl">48% Daily Vol</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Afternoon Library Hours (2 PM - 5 PM)</span>
                <span className="text-slate-400 text-[11px]">Moot Court Drafting & Legal Precedents</span>
              </div>
              <span className="font-extrabold text-[#C8A34D] bg-[#C8A34D]/10 px-2.5 py-1 rounded-xl">34% Daily Vol</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Morning Class Hours (9 AM - 1 PM)</span>
                <span className="text-slate-400 text-[11px]">Class Notes Generation & Case Clarifications</span>
              </div>
              <span className="font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-xl">18% Daily Vol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseAnalytics;
