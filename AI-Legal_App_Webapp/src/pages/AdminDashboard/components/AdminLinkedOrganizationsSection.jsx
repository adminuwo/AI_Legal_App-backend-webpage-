import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, GraduationCap, Clock, 
  Sparkles, RefreshCw, Search, 
  Award, Mail, ShieldCheck, 
  UserCheck, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API } from '../../../types.js';

export default function AdminLinkedOrganizationsSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgsList, setOrgsList] = useState([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalStudents: 0,
    activeSubscriptions: 0,
    totalCreditsAllocated: 0,
    totalRegisteredStudents: 0
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Expand/Collapse state per organization slug (by default collapsed)
  const [expandedOrgs, setExpandedOrgs] = useState({});

  const toggleOrgExpand = (slug) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  // Fetch Linked Organizations
  const fetchOrganizations = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const token = localStorage.getItem('token');
      const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const res = await axios.get(`${API}/admin/linked-organizations`, authHeader);

      if (res.data?.success) {
        setOrgsList(res.data.organizations || []);
        setStats(res.data.stats || {
          totalOrganizations: 0,
          totalStudents: 0,
          activeSubscriptions: 0,
          totalCreditsAllocated: 0,
          totalRegisteredStudents: 0
        });

        if (isManual) {
          toast.success('✨ Synced with Convee-Education database!', { id: 'org-sync' });
        }
      }
    } catch (err) {
      console.error('[FETCH LINKED ORGS ERROR]:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch linked organizations', { id: 'org-sync-err' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Seed Sample Convee Organizations for Demo/Verification
  const handleSeedSample = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const res = await axios.post(`${API}/admin/linked-organizations/seed-sample?force=true`, {}, authHeader);

      if (res.data?.success) {
        toast.success(res.data.message || 'Sample institutions seeded successfully');
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('[SEED CONVEE ERROR]:', err);
      toast.error(err.response?.data?.message || 'Failed to seed sample organizations');
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered Organizations
  const filteredOrgs = useMemo(() => {
    return orgsList.filter(org => {
      // Status Filter
      if (statusFilter === 'ACTIVE' && !org.isSubscribed) return false;
      if (statusFilter === 'EXPIRED' && org.isSubscribed) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const orgMatch = 
        org.organizationName?.toLowerCase().includes(q) ||
        org.organizationSlug?.toLowerCase().includes(q) ||
        org.plan?.planName?.toLowerCase().includes(q);

      const studentMatch = org.students?.some(s => 
        s.studentName?.toLowerCase().includes(q) ||
        s.studentEmail?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q)
      );

      return orgMatch || studentMatch;
    });
  }, [orgsList, searchQuery, statusFilter]);

  return (
    <div className="space-y-3.5 sm:space-y-5 animate-fadeIn text-slate-800 dark:text-slate-200">
      {/* Top Header Banner - Phone Responsive Light Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-[#C8A34D] shrink-0 border border-amber-500/20">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Linked Organizations
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/10 dark:bg-amber-500/20 text-[#C8A34D] border border-amber-500/30 shrink-0">
                via Convee-Education
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5 leading-snug">
              Institutional partner universities, subscriptions & student account sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => fetchOrganizations(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-[#C8A34D]' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Sync'}</span>
          </button>

          {orgsList.length === 0 && !loading && (
            <button
              onClick={handleSeedSample}
              disabled={refreshing}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Seed Sample</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Compact Stat Cards (Responsive Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Partner Institutions */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Institutions</p>
            <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">{stats.totalOrganizations}</p>
          </div>
        </div>

        {/* Enrolled Students */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Students</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{stats.totalStudents}</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">({stats.totalRegisteredStudents} active)</span>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Active Subs</p>
            <p className="text-base sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">{stats.activeSubscriptions}</p>
          </div>
        </div>

        {/* Credits Pool */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-[#C8A34D] shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Credits Pool</p>
            <p className="text-base sm:text-xl font-extrabold text-[#C8A34D] leading-tight mt-0.5 truncate">{stats.totalCreditsAllocated.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search & Status Filters Bar (Phone Responsive) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-between items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by institution, student name, email, roll no, or class..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] transition-colors"
          />
        </div>

        {/* Filter Toggle Buttons - Full Width on Phones */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/80 dark:border-zinc-800 w-full sm:w-auto shrink-0">
          {[
            { id: 'ALL', label: 'All', mobileLabel: 'All' },
            { id: 'ACTIVE', label: 'Active Subscriptions', mobileLabel: 'Active' },
            { id: 'EXPIRED', label: 'Expired', mobileLabel: 'Expired' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                statusFilter === f.id
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{f.label}</span>
              <span className="sm:hidden">{f.mobileLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Directory List */}
      {loading ? (
        <div className="p-10 sm:p-12 text-center space-y-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C8A34D] mx-auto" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Loading Linked Organizations...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-10 sm:p-12 text-center space-y-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">No Linked Organizations Found</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              {searchQuery 
                ? 'No organization or student matched your search query.' 
                : 'No organizations synced yet via Convee-Education.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {filteredOrgs.map((org) => {
            const isSubscribed = org.isSubscribed;
            const daysRemaining = org.daysRemaining || 0;
            const isExpanded = Boolean(expandedOrgs[org.organizationSlug] || (searchQuery && searchQuery.trim().length > 1));

            return (
              <div
                key={org.organizationSlug}
                className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              >
                {/* Organization Header Row - Clickable Dropdown Accordion */}
                <div 
                  onClick={() => toggleOrgExpand(org.organizationSlug)}
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-[#1E293B] cursor-pointer hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none group ${
                    isExpanded ? 'border-b border-slate-100 dark:border-zinc-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 text-[#C8A34D] flex items-center justify-center font-black text-xs shrink-0">
                      {org.organizationName.substring(0, 2).toUpperCase()}
                    </div>
                    
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white break-words">
                          {org.organizationName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 shrink-0">
                          #{org.organizationSlug}
                        </span>

                        {isSubscribed ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Subscription
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Subscription Expired
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                          <Award className="w-3.5 h-3.5 text-[#C8A34D] shrink-0" />
                          <span>{org.plan?.planName || 'Convee Institutional Academic Plan'}</span>
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {isSubscribed 
                              ? `Valid until ${new Date(org.expiryDate).toLocaleDateString()} (${daysRemaining}d left)`
                              : `Expired on ${new Date(org.expiryDate).toLocaleDateString()}`}
                          </span>
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span><strong className="text-slate-800 dark:text-white font-bold">{org.studentsCount}</strong> Enrolled Students</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Toggle Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOrgExpand(org.organizationSlug);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isExpanded
                          ? 'bg-amber-500/10 dark:bg-amber-500/20 text-[#C8A34D] border-amber-500/30'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide Students' : `View Students (${org.studentsCount || 0})`}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#C8A34D] transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-bar & Students Table - Only visible when expanded */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 bg-slate-50/40 dark:bg-zinc-900/30 animate-fadeIn">
                    {/* Batches & Quick Stats Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400">Class Batches:</span>
                        {org.classes?.length > 0 ? (
                          org.classes.map((cls, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                              {cls}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-slate-500">General Law Batch</span>
                        )}
                      </div>

                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex flex-wrap items-center gap-2">
                        <span>Credits Allotted: <strong className="text-[#C8A34D]">{org.totalCreditsAllocated.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>Registered on App: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{org.registeredUsersCount} / {org.studentsCount}</strong></span>
                      </div>
                    </div>

                    {/* Swipe indicator for mobile */}
                    <div className="sm:hidden text-[10px] text-slate-400 dark:text-zinc-500 flex items-center justify-between px-1">
                      <span>← Swipe table horizontally</span>
                      <span>7 student columns →</span>
                    </div>

                    {/* Students Table with minimum width for clean mobile scrolling */}
                    {org.students?.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No student details records found in this organization.
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto bg-white dark:bg-[#1E293B]">
                        <table className="w-full text-left text-xs min-w-[640px]">
                          <thead className="bg-slate-50 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-700">
                            <tr>
                              <th className="py-2.5 px-3 font-bold">Student Name</th>
                              <th className="py-2.5 px-3 font-bold">Student Email</th>
                              <th className="py-2.5 px-3 font-bold">Student ID</th>
                              <th className="py-2.5 px-3 font-bold">Class / Semester</th>
                              <th className="py-2.5 px-3 font-bold">AI-Legal Status</th>
                              <th className="py-2.5 px-3 font-bold">Credits</th>
                              <th className="py-2.5 px-3 font-bold">Synced Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {org.students.map((student) => (
                              <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                  <div className="w-6 h-6 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-[#C8A34D] flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {student.studentName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate">{student.studentName}</span>
                                </td>

                                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300 text-[11px] whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{student.studentEmail || 'N/A'}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-zinc-400 text-[11px] whitespace-nowrap">
                                  {student.studentId || 'N/A'}
                                </td>

                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                                  {student.className || 'General'}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {student.isRegisteredInAiLegal ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                      <UserCheck className="w-3 h-3 shrink-0" />
                                      <span>Registered</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-[#C8A34D] border border-amber-500/20 inline-flex items-center gap-1" title="Account will auto-activate on first sign in">
                                      <Clock className="w-3 h-3 shrink-0" />
                                      <span>Pending Sign-in</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-bold text-[#C8A34D] whitespace-nowrap">
                                  {student.credits?.toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3 text-slate-400 dark:text-zinc-500 text-[11px] whitespace-nowrap">
                                  {new Date(student.syncedAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
