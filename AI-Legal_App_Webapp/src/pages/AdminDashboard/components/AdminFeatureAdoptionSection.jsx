import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, FileText, Lightbulb, TrendingUp, Edit2, Search, MessageSquare, Scale, 
  Users, Activity, RefreshCw, Sparkles, BarChart3, ChevronDown, Database,
  GraduationCap, Award, Gavel, Mic, BookOpen, BookMarked, Binary, Filter, ArrowUpDown
} from 'lucide-react';
import axios from 'axios';
import { API } from '../../../types.js';

const COHORT_OPTIONS = [
  { id: 'today', label: 'Active Today', desc: 'Logged in today' },
  { id: 'yesterday', label: 'Active Yesterday', desc: 'Logged in yesterday' },
  { id: '7d', label: 'Active Last 7 Days', desc: 'Weekly active cohort' },
  { id: '30d', label: 'Active Last 30 Days', desc: 'Monthly active cohort' },
  { id: 'all', label: 'All Users (Lifetime)', desc: 'Entire registered base' }
];

const WINDOW_OPTIONS = [
  { id: 'cohort', label: 'Matches Cohort Window' },
  { id: 'today', label: 'Activity Today' },
  { id: 'yesterday', label: 'Activity Yesterday' },
  { id: '7d', label: 'Activity Last 7 Days' },
  { id: '30d', label: 'Activity Last 30 Days' },
  { id: 'all', label: 'All-Time Activity' }
];

const CATEGORIES = [
  'All',
  'Practice & Case AI',
  'Litigation & Drafting',
  'Legal Research',
  'Academic & Prep',
  'Courtroom & Trials',
  'Forensics & Audit'
];

const ICON_MAP = {
  my_case_assistant: Scale,
  draft_maker: Edit2,
  ai_chat: MessageSquare,
  cases_managed: Building2,
  legal_precedents: BookOpen,
  knowledge_hub: Database,
  legal_tutor: GraduationCap,
  quiz_practice: Award,
  case_predictor: TrendingUp,
  strategy_engine: Lightbulb,
  contract_analyzer: FileText,
  argument_builder: Gavel,
  mock_courtroom: Mic,
  evidence_analyst: Search,
  student_notes: BookMarked,
  audio_doc_magic: Binary
};

const COLOR_MAP = {
  indigo: {
    bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    bar: 'bg-indigo-500',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
  },
  blue: {
    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    bar: 'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  purple: {
    bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    bar: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  amber: {
    bg: 'bg-[#B88B2A]/10 text-[#B88B2A] border-[#B88B2A]/20',
    bar: 'bg-[#B88B2A]',
    badge: 'bg-[#B88B2A]/10 text-[#B88B2A]'
  },
  emerald: {
    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  cyan: {
    bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    bar: 'bg-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
  },
  rose: {
    bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    bar: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  }
};

export default function AdminFeatureAdoptionSection({ user, fallbackStats = {} }) {
  const [cohort, setCohort] = useState('7d');
  const [activityWindow, setActivityWindow] = useState('cohort');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'funnel'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lifetimeRuns'); // 'lifetimeRuns' | 'adoptionRate' | 'totalRuns'
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchAdoptionData = useCallback(async () => {
    try {
      setLoading(true);
      const token = user?.token || localStorage.getItem('token') || (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}')?.token; } catch { return null; }
      })();

      const res = await axios.get(`${API}/admin/analytics/feature-adoption`, {
        params: { cohort, window: activityWindow },
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        timeout: 15000
      });

      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch feature adoption analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [cohort, activityWindow, user]);

  useEffect(() => {
    fetchAdoptionData();
  }, [fetchAdoptionData]);

  const rawFeatures = useMemo(() => {
    return data?.features || [];
  }, [data]);

  const cohortTotal = data?.cohortTotalUsers ?? 0;
  const totalRegistered = data?.totalRegisteredUsers ?? 0;

  // Filtered & Sorted Features List
  const filteredFeatures = useMemo(() => {
    let list = [...rawFeatures];

    // Category Filter
    if (selectedCategory !== 'All') {
      list = list.filter(f => f.category === selectedCategory);
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f => 
        (f.title && f.title.toLowerCase().includes(q)) || 
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q))
      );
    }

    // Sort Filter
    list.sort((a, b) => {
      if (sortBy === 'lifetimeRuns') {
        return (b.lifetimeRuns || 0) - (a.lifetimeRuns || 0);
      } else if (sortBy === 'adoptionRate') {
        return (b.adoptionRate || 0) - (a.adoptionRate || 0);
      } else if (sortBy === 'totalRuns') {
        return (b.totalRuns || 0) - (a.totalRuns || 0);
      }
      return 0;
    });

    return list;
  }, [rawFeatures, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI LEGAL™ FEATURE ADOPTION & PENETRATION
            </h3>
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All 16 Features Live
            </span>
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">
            Har feature ka <strong className="text-slate-700 dark:text-zinc-200 font-bold">Ab Tak Ka Total Usage</strong> aur <strong className="text-slate-700 dark:text-zinc-200 font-bold">Selected Cohort Adoption</strong> track karein.
          </p>
        </div>

        {/* FILTERS & VIEW CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* User Cohort Dropdown */}
          <div className="relative">
            <select
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl pl-3 pr-8 py-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#B88B2A]/40"
              title="Select which active user cohort to analyze"
            >
              {COHORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  Cohort: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Activity Window Dropdown */}
          <div className="relative">
            <select
              value={activityWindow}
              onChange={(e) => setActivityWindow(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl pl-3 pr-8 py-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#B88B2A]/40"
              title="Activity time window for feature usage"
            >
              {WINDOW_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl pl-3 pr-8 py-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#B88B2A]/40"
              title="Sort features"
            >
              <option value="lifetimeRuns" className="dark:bg-zinc-800">Sort: Top All-Time (Ab Tak)</option>
              <option value="adoptionRate" className="dark:bg-zinc-800">Sort: Top Cohort Adoption %</option>
              <option value="totalRuns" className="dark:bg-zinc-800">Sort: Most Cohort Runs</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('funnel')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'funnel'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Funnel
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAdoptionData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh adoption telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#B88B2A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* SEARCH & CATEGORY PILLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#B88B2A] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feature or tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B88B2A]/40"
          />
        </div>
      </div>

      {/* COHORT SUMMARY METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">REGISTERED USERS</span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalRegistered.toLocaleString()}
          </h4>
          <p className="text-[10px] font-medium text-slate-500 truncate">
            Total non-convee user accounts
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">ACTIVE IN COHORT</span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {cohortTotal.toLocaleString()}
          </h4>
          <p className="text-[10px] font-medium text-slate-500 truncate">
            {COHORT_OPTIONS.find(c => c.id === cohort)?.desc || 'Active users'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">TOP USED ALL-TIME</span>
            <Sparkles className="w-3.5 h-3.5 text-[#B88B2A]" />
          </div>
          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 truncate" title={data?.summary?.topAllTimeFeature}>
            {data?.summary?.topAllTimeFeature || 'My Case Assistant'}
          </h4>
          <p className="text-[10px] font-bold text-[#B88B2A]">
            {(data?.summary?.topAllTimeRuns || 0).toLocaleString()} runs ab tak
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">ACTIVE IN WINDOW</span>
            <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {data?.summary?.activeFeaturesCount ?? 0}
            <span className="text-xs font-bold text-slate-400 font-sans ml-1">/ {rawFeatures.length || 16} features</span>
          </h4>
          <p className="text-[10px] font-medium text-slate-500">Features run in selected window</p>
        </div>
      </div>

      {/* RENDER VIEW: GRID CARDS OR FUNNEL */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredFeatures.map((feat) => {
            const Icon = ICON_MAP[feat.key] || Sparkles;
            const theme = COLOR_MAP[feat.color] || COLOR_MAP.blue;
            const adoption = feat.adoptionRate || 0;
            const dropoff = feat.dropoffRate || (100 - adoption);
            const usedUsers = feat.usedUsersCount || 0;
            const unusedUsers = feat.unusedUsersCount || Math.max(0, cohortTotal - usedUsers);

            return (
              <div 
                key={feat.key} 
                className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-zinc-700 flex flex-col justify-between"
              >
                <div>
                  {/* TOP ROW: ICON + CATEGORY PILL */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 w-fit rounded-xl border ${theme.bg}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                      {feat.badge || feat.category}
                    </span>
                  </div>

                  {/* FEATURE TITLE */}
                  <div className="mt-2.5">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" title={feat.title}>
                      {feat.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5" title={feat.description}>
                      {feat.description}
                    </p>
                  </div>

                  {/* BLOCK 1: AB TAK KA TOTAL (LIFETIME TOTAL STATS) */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">AB TAK KA TOTAL</span>
                      <span className="text-[10px] font-extrabold text-[#B88B2A]">
                        {feat.lifetimeAdoptionRate || 0}% users
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {(feat.lifetimeRuns || 0).toLocaleString()} <span className="text-[10px] font-semibold text-slate-400 font-sans">runs</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                        {(feat.lifetimeUsersCount || 0).toLocaleString()} users
                      </span>
                    </div>
                  </div>

                  {/* BLOCK 2: IS COHORT / WINDOW ME */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-slate-500 uppercase tracking-wider">SELECTED COHORT</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        adoption >= 20 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        adoption >= 5 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        adoption > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                      }`}>
                        {adoption}% adoption
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {(feat.totalRuns || 0).toLocaleString()} <span className="text-[10px] font-semibold text-slate-400 font-sans">runs</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        ~{feat.avgRunsPerUser || 0} runs/user
                      </span>
                    </div>

                    {/* DUAL COLOR PROGRESS BAR (USED vs UNUSED) */}
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-500 ${theme.bar}`}
                          style={{ width: `${Math.min(100, Math.max(0, adoption))}%` }}
                          title={`${usedUsers} users used (${adoption}%)`}
                        />
                        <div 
                          className="h-full bg-slate-200 dark:bg-zinc-700/60 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, dropoff))}%` }}
                          title={`${unusedUsers} users inactive (${dropoff}%)`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {usedUsers} used
                        </span>
                        <span className="text-slate-400 dark:text-zinc-500">
                          {unusedUsers} didn't use
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM FOOTER */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold">{feat.category}</span>
                  <span className="font-medium">Footprint: {usedUsers}/{cohortTotal}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PENETRATION FUNNEL VIEW */
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Feature Penetration Funnel (All 16 AI Legal Tools)
              </h4>
              <p className="text-[11px] text-slate-500">
                Comparing all-time reach and active engagement among {cohortTotal} cohort users.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
              {filteredFeatures.length} FEATURES DISPLAYED
            </span>
          </div>

          <div className="space-y-3">
            {filteredFeatures.map((feat, idx) => {
              const Icon = ICON_MAP[feat.key] || Sparkles;
              const theme = COLOR_MAP[feat.color] || COLOR_MAP.blue;
              const adoption = feat.adoptionRate || 0;
              const usedUsers = feat.usedUsersCount || 0;
              const unusedUsers = feat.unusedUsersCount || Math.max(0, cohortTotal - usedUsers);

              return (
                <div 
                  key={feat.key}
                  className="p-3 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-[260px]">
                    <span className="text-xs font-black text-slate-400 w-5">#{idx + 1}</span>
                    <div className={`p-2 rounded-xl border ${theme.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {feat.title}
                      </h5>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {feat.category} • <span className="text-[#B88B2A] font-bold">{(feat.lifetimeRuns || 0).toLocaleString()} runs ab tak</span>
                      </p>
                    </div>
                  </div>

                  {/* COHORT PROGRESS BAR & STATS */}
                  <div className="flex-1 max-w-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-600 dark:text-zinc-300">
                        {usedUsers} users used in cohort ({adoption}%)
                      </span>
                      <span className="text-slate-400">
                        {unusedUsers} didn't use ({feat.dropoffRate || (100 - adoption)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-zinc-700/60 overflow-hidden flex">
                      <div 
                        className={`h-full ${theme.bar} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, adoption))}%` }}
                      />
                    </div>
                  </div>

                  {/* ALL-TIME & COHORT RUNS */}
                  <div className="flex items-center justify-between md:justify-end gap-6 min-w-[200px] text-right">
                    <div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {(feat.totalRuns || 0).toLocaleString()} cohort runs
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        ~{feat.avgRunsPerUser || 0} runs / user
                      </p>
                    </div>
                    <div className="pl-3 border-l border-slate-200 dark:border-zinc-700">
                      <p className="text-xs sm:text-sm font-black text-[#B88B2A]">
                        {(feat.lifetimeRuns || 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        Ab Tak
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
