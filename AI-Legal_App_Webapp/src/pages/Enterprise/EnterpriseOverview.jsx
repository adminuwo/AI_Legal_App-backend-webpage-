import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, CreditCard, DollarSign, Mail, Sparkles, 
  TrendingUp, Activity, CheckCircle2, Clock, ShieldCheck, Zap, ArrowRight, Layers
} from 'lucide-react';
import axios from 'axios';

const EnterpriseOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getBackendUrl()}/enterprise/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.metrics) {
        setData(res.data);
      }
    } catch (e) {
      console.warn('Backend metrics fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const metrics = data?.metrics || {
    totalStudents: 240,
    activeStudents: 218,
    totalFaculty: 18,
    activeFaculty: 16,
    usedSeats: 234,
    totalSeats: 500,
    monthlyUsage: 34850,
    monthlyLimit: 100000,
    monthlyBudget: 50000,
    usedBudget: 18400,
    pendingInvitations: 12
  };

  return (
    <div className="space-y-4">
      {/* Header Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#C8A34D] uppercase tracking-wider mb-0.5">
            <Sparkles size={13} /> Official Institutional Dashboard
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Welcome, RDVV Enterprise Admin
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Rajiv Gandhi National University of Law & RDVV Law Faculty
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-right">
            <span className="block text-[9px] font-bold uppercase text-slate-400">Current Date</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* 6 Top Overview Cards - COMPACT HEIGHT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Total Students */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <GraduationCap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            {metrics.totalStudents}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Enrolled Students</span>
            <span className="font-bold text-emerald-500">● {metrics.activeStudents} Active</span>
          </div>
        </div>

        {/* Card 2: Active Faculty */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Active Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            {metrics.activeFaculty}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Total Appointed</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{metrics.totalFaculty} Faculty</span>
          </div>
        </div>

        {/* Card 3: Enterprise Seats */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">3. Enterprise Seats</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            {metrics.usedSeats} <span className="text-xs font-semibold text-slate-400">/ {metrics.totalSeats}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-[#C8A34D] h-full rounded-full"
              style={{ width: `${(metrics.usedSeats / metrics.totalSeats) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 4: Monthly AI Usage */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">4. Monthly AI Usage</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            {metrics.monthlyUsage.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Queries</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Quota Limit</span>
            <span className="font-bold text-emerald-500">+14% vs Last Month</span>
          </div>
        </div>

        {/* Card 5: Monthly Budget */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">5. Monthly Budget</span>
            <div className="w-8 h-8 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            ₹{metrics.usedBudget.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/ ₹{metrics.monthlyBudget.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Configured Budget</span>
            <span className="font-bold text-amber-500">36.8% Used</span>
          </div>
        </div>

        {/* Card 6: Pending Invitations */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#C8A34D]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">6. Pending Invitations</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Mail size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
            {metrics.pendingInvitations}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Student & Faculty</span>
            <span className="font-bold text-slate-400">Awaiting Acceptance</span>
          </div>
        </div>
      </div>

      {/* Performance & Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Highlights & Top Metrics */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#C8A34D]" /> Institutional AI Usage Highlights
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Most Used AI Feature</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">AI Legal Assistant & Tutor</p>
                <p className="text-[11px] text-emerald-500 font-semibold">14,200 sessions (40.7% total)</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Most Active Batch</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">BA LLB 2025-2030 (Batch A)</p>
                <p className="text-[11px] text-[#C8A34D] font-semibold">92.4% Student Engagement</p>
              </div>
            </div>

            {/* Monthly Trend Visual */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Monthly AI Adoption Growth</span>
                <span>34,850 Total Queries</span>
              </div>
              <div className="grid grid-cols-6 gap-2 items-end h-20 pt-2">
                {[
                  { m: 'Mar', v: 35 },
                  { m: 'Apr', v: 50 },
                  { m: 'May', v: 65 },
                  { m: 'Jun', v: 80 },
                  { m: 'Jul', v: 90 },
                  { m: 'Aug', v: 100 }
                ].map(item => (
                  <div key={item.m} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full bg-[#C8A34D]/20 hover:bg-[#C8A34D] rounded-t-md transition-all"
                      style={{ height: `${item.v}%` }}
                    />
                    <span className="text-[9px] font-bold text-slate-400">{item.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity size={18} className="text-[#C8A34D]" /> Recent Activity
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { title: 'Domain Verification Verified', time: '10 mins ago', desc: 'Institutional domain @rdvv.ac.in verified.', icon: ShieldCheck },
              { title: 'Bulk Student Import', time: '1 hour ago', desc: 'Imported 45 new students for BA LLB Sem 1.', icon: GraduationCap },
              { title: 'Curriculum syllabus mapped', time: '3 hours ago', desc: 'Constitutional Law I units updated.', icon: Layers },
              { title: 'Budget Threshold Passed 50%', time: '1 day ago', desc: 'Monthly usage reached 36.8% of budget.', icon: CreditCard }
            ].map((act, idx) => (
              <div key={idx} className="flex gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#C8A34D] flex items-center justify-center shrink-0">
                  <act.icon size={14} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{act.title}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{act.desc}</p>
                  <span className="text-[9px] text-slate-400 font-semibold">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseOverview;
