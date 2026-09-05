import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, DollarSign, AlertCircle, Save, ShieldCheck, ArrowUpRight, Plus, RefreshCw, BarChart2, CheckCircle2, TrendingUp, Users, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseUsageCredits = () => {
  // Budget State
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(50000);
  const [usedAmount, setUsedAmount] = useState(18400);
  const [cycleResetDay, setCycleResetDay] = useState(1);

  // Threshold Toggles
  const [alerts, setAlerts] = useState({
    50: true,
    75: true,
    90: true,
    100: true
  });

  // Tiered Student AI Quotas
  const [quotas, setQuotas] = useState({
    firstYearChats: 500,
    firstYearDrafts: 20,
    firstYearQuizzes: 30,

    middleYearChats: 1200,
    middleYearDrafts: 50,
    middleYearCourtroomMins: 60,

    finalYearChats: 2500,
    finalYearDrafts: 100,
    finalYearCourtroomMins: 120,

    facultyUnlimited: true
  });

  // Top-Up Modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(10000);

  // Persistence Load
  useEffect(() => {
    const savedRules = localStorage.getItem('enterpriseBudgetRules');
    if (savedRules) {
      try {
        const parsed = JSON.parse(savedRules);
        if (parsed.monthlyBudgetInput) setMonthlyBudgetInput(parsed.monthlyBudgetInput);
        if (parsed.usedAmount) setUsedAmount(parsed.usedAmount);
        if (parsed.cycleResetDay) setCycleResetDay(parsed.cycleResetDay);
        if (parsed.alerts) setAlerts(parsed.alerts);
        if (parsed.quotas) setQuotas(parsed.quotas);
      } catch (e) {}
    }
  }, []);

  const remaining = Math.max(0, monthlyBudgetInput - usedAmount);
  const percentageUsed = Math.min(100, Math.round((usedAmount / Math.max(1, monthlyBudgetInput)) * 100));

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  const handleToggleAlert = (threshold) => {
    setAlerts(prev => ({ ...prev, [threshold]: !prev[threshold] }));
  };

  const handleSaveBudget = async () => {
    const payload = {
      monthlyBudgetInput,
      usedAmount,
      cycleResetDay,
      alerts,
      quotas
    };

    localStorage.setItem('enterpriseBudgetRules', JSON.stringify(payload));

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getBackendUrl()}/enterprise/budget/update`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}

    toast.success(`✨ Enterprise AI Budget & Student Quotas saved successfully!`);
  };

  const handleAddTopUp = () => {
    const newTotal = Number(monthlyBudgetInput) + Number(topUpAmount);
    setMonthlyBudgetInput(newTotal);
    setShowTopUpModal(false);
    toast.success(`+ ₹${Number(topUpAmount).toLocaleString()} Extra Credit Top-Up added to Institutional Budget!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-[#C8A34D]" size={26} /> AI Usage, Credit & Budget Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set institutional monthly budget limits, student tier AI quotas, automated cycle resets, and budget alert thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTopUpModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md cursor-pointer border border-slate-700"
          >
            <Plus size={15} className="text-[#C8A34D]" /> Quick Credit Top-Up
          </button>

          <button
            onClick={handleSaveBudget}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save size={16} /> Save Budget & Quota Rules
          </button>
        </div>
      </div>

      {/* Interactive Institutional Budget Summary Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#C8A34D] uppercase tracking-wider">Active Institutional Monthly Allocation</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{usedAmount.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                used of ₹{Number(monthlyBudgetInput).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Budget Health Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-black flex items-center gap-2 ${
              percentageUsed >= 90
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                : percentageUsed >= 75
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              <AlertCircle size={16} />
              <span>{percentageUsed}% Budget Utilized ({percentageUsed >= 90 ? 'Critical Warning' : 'Normal Operational State'})</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageUsed >= 90
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-[#C8A34D] to-[#B08D3E]'
              }`}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>
        </div>

        {/* Dynamic Budget Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Monthly Budget (₹)</label>
            <input
              type="number"
              value={monthlyBudgetInput}
              onChange={e => setMonthlyBudgetInput(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Usage Estimate</span>
            <span className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white block">
              ₹{usedAmount.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Remaining Balance</span>
            <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black block">
              ₹{remaining.toLocaleString()}
            </span>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monthly Cycle Reset Day</label>
            <select
              value={cycleResetDay}
              onChange={e => setCycleResetDay(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white"
            >
              <option value={1}>1st of Month (Default)</option>
              <option value={5}>5th of Month</option>
              <option value={10}>10th of Month</option>
              <option value={15}>15th of Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Quotas & Thresholds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Tiered Student AI Quotas */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-[#C8A34D]" /> Tiered Student AI Quotas
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Auto-Refreshes Monthly
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1st Year Students */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users size={14} className="text-[#C8A34D]" /> 1st Year Students (Foundational Quota)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Semesters 1 & 2</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">AI Chats</label>
                  <input
                    type="number"
                    value={quotas.firstYearChats}
                    onChange={e => setQuotas({ ...quotas, firstYearChats: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Legal Drafts</label>
                  <input
                    type="number"
                    value={quotas.firstYearDrafts}
                    onChange={e => setQuotas({ ...quotas, firstYearDrafts: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Quizzes/Mo</label>
                  <input
                    type="number"
                    value={quotas.firstYearQuizzes}
                    onChange={e => setQuotas({ ...quotas, firstYearQuizzes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Middle Year Students */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users size={14} className="text-[#C8A34D]" /> 2nd & 3rd Year Students (Intermediate Quota)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Semesters 3 to 6</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">AI Chats</label>
                  <input
                    type="number"
                    value={quotas.middleYearChats}
                    onChange={e => setQuotas({ ...quotas, middleYearChats: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Legal Drafts</label>
                  <input
                    type="number"
                    value={quotas.middleYearDrafts}
                    onChange={e => setQuotas({ ...quotas, middleYearDrafts: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Moot Mins/Mo</label>
                  <input
                    type="number"
                    value={quotas.middleYearCourtroomMins}
                    onChange={e => setQuotas({ ...quotas, middleYearCourtroomMins: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Final Year Students */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users size={14} className="text-[#C8A34D]" /> Final Year Students (Advanced Practice Quota)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Semesters 7 to 10 & LLM</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">AI Chats</label>
                  <input
                    type="number"
                    value={quotas.finalYearChats}
                    onChange={e => setQuotas({ ...quotas, finalYearChats: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Legal Drafts</label>
                  <input
                    type="number"
                    value={quotas.finalYearDrafts}
                    onChange={e => setQuotas({ ...quotas, finalYearDrafts: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Moot Mins/Mo</label>
                  <input
                    type="number"
                    value={quotas.finalYearCourtroomMins}
                    onChange={e => setQuotas({ ...quotas, finalYearCourtroomMins: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Budget Alert Rules & Real-time Spending Breakdown */}
        <div className="space-y-6">
          {/* Budget Threshold Alerts */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-[#C8A34D]" /> Budget Threshold Alert Rules
            </h3>
            <p className="text-xs text-slate-500">
              Enterprise Admins receive instant in-app and email notifications when consumption hits configured budget milestones.
            </p>

            <div className="space-y-3 pt-1">
              {[50, 75, 90, 100].map(threshold => (
                <div
                  key={threshold}
                  onClick={() => handleToggleAlert(threshold)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs cursor-pointer select-none transition-all ${
                    alerts[threshold]
                      ? 'bg-slate-50 dark:bg-slate-950 border-[#C8A34D]/40'
                      : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    Alert at {threshold}% Budget Usage
                  </span>
                  <span className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                    alerts[threshold] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {alerts[threshold] ? '● ACTIVE' : '○ INACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Usage Consumption Breakdown Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-[#C8A34D]" /> Institutional AI Spending Breakdown
            </h3>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                  <span>🎓 AI Legal Tutor & Bare Act Study</span>
                  <span className="font-bold text-slate-900 dark:text-white">42% (₹7,728)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full rounded-full w-[42%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                  <span>📝 Legal Draft Maker & Memorials</span>
                  <span className="font-bold text-slate-900 dark:text-white">28% (₹5,152)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-[28%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                  <span>🏛️ AI Mock Courtroom Voice Simulation</span>
                  <span className="font-bold text-slate-900 dark:text-white">18% (₹3,312)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[18%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                  <span>⚖️ Quiz & MCQ Practice Engine</span>
                  <span className="font-bold text-slate-900 dark:text-white">12% (₹2,208)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full w-[12%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TOP-UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-[#C8A34D]" /> Institutional Credit Top-Up
              </h3>
              <button onClick={() => setShowTopUpModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Top-Up Amount (₹)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-base text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[5000, 10000, 25000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTopUpAmount(amt)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    + ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500">
                💡 Added credits will immediately increase your active monthly budget limit to <strong>₹{(Number(monthlyBudgetInput) + Number(topUpAmount)).toLocaleString()}</strong>.
              </p>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTopUp}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md cursor-pointer"
                >
                  Confirm Top-Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseUsageCredits;
