import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Search, Briefcase, Plus, Gavel, Calendar, 
  Clock, AlertTriangle, CheckCircle2, RefreshCw, Edit2, 
  Trash2, Archive, ChevronRight, X, ArrowUpRight, TrendingUp,
  Sparkles, Info, Users, ShieldCheck, BookOpen, User, MoreVertical, Activity,
  Binary, Scale, Bell, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { userData, selectedRoleState } from '../userStore/userData';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

import ExperienceRoleSelector from '../Components/ExperienceRoleSelector';
import StudentDashboardSection from '../Components/StudentDashboardSection';
import LawFirmDashboardSection from '../Components/LawFirmDashboardSection';
import LawFirmOnboardingView from '../Components/LawFirmOnboardingView';
import CreateCaseWizardModal from '../Tools/AI_Legal/components/CreateCaseWizardModal';
import NotificationCenter from '../Components/NotificationBar/NotificationCenter';
import { useSubscription } from '../context/SubscriptionContext';
import { usePersonalization } from '../context/PersonalizationContext';

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { cases: subCases, storage, features, badge, planDisplayName, triggerUpgradeModal } = useSubscription();
  const { notifications, fetchNotifications } = usePersonalization();
  const currentUser = useRecoilValue(userData);
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const userName = currentUser?.user?.name || "Advocate";

  const unreadNotifCount = (notifications || []).filter(n => !n.isRead).length;

  // State Management
  const [cases, setCases] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [firmWorkspaces, setFirmWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkspaces = async () => {
    try {
      const res = await apiService.request('/workspaces');
      if (res && res.success && Array.isArray(res.workspaces)) {
        const firms = res.workspaces.filter(w => w.type === 'law_firm');
        setFirmWorkspaces(firms);
        if (firms.length > 0) {
          const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID');
          if (!activeWsId || !firms.find(f => (f._id || f.id) === activeWsId)) {
            localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', firms[0]._id || firms[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('[HomeDashboard] Failed to fetch workspaces:', err);
    }
  };

  useEffect(() => {
    if (selectedRole === 'law_firm') {
      fetchWorkspaces();
    }
  }, [selectedRole]);

  // Modal States
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [activeMenuCaseId, setActiveMenuCaseId] = useState(null);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isProductGuideOpen, setIsProductGuideOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Form States
  const [newCaseForm, setNewCaseForm] = useState({
    name: '',
    clientName: '',
    opponentName: '',
    caseType: '',
    courtName: '',
    summary: '',
    priority: 'Medium'
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Background Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard data from Backend APIs
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);
    
    try {
      setError(null);
      // Fetch cases (projects)
      const data = await apiService.getProjects();
      setCases(data || []);

      // Fetch AI Notifications via PersonalizationContext
      if (fetchNotifications) fetchNotifications();

      // Fetch Pending Workspace Invitations
      try {
        const userStr = localStorage.getItem('user');
        const token = userStr ? JSON.parse(userStr)?.token : null;
        if (token) {
          const inviteRes = await apiService.get('/workspaces/invitations/pending');
          if (inviteRes?.data?.success && inviteRes?.data?.invitations?.length > 0) {
            setPendingInvite(inviteRes.data.invitations[0]);
          } else {
            setPendingInvite(null);
          }
        }
      } catch (invErr) {
        console.warn("Pending invitation fetch note:", invErr);
      }
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
      setError("Failed to fetch current litigation data from the backend.");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleAcceptInvite = async (inviteId, workspaceId) => {
    const tid = toast.loading("Accepting firm invitation...");
    try {
      const res = await apiService.post(`/workspaces/invitations/${inviteId}/accept`);
      if (res?.data?.success) {
        toast.success("Joined firm workspace successfully!", { id: tid });
        setPendingInvite(null);
        await fetchDashboardData(true);
      } else {
        toast.error(res?.data?.error || "Failed to accept invitation.", { id: tid });
      }
    } catch (err) {
      toast.error(err.message || "Failed to accept invitation.", { id: tid });
    }
  };

  const handleRejectInvite = async (inviteId) => {
    const tid = toast.loading("Rejecting invitation...");
    try {
      const res = await apiService.post(`/workspaces/invitations/${inviteId}/reject`);
      if (res?.data?.success) {
        toast.success("Invitation rejected.", { id: tid });
        setPendingInvite(null);
      } else {
        toast.error(res?.data?.error || "Failed to reject invitation.", { id: tid });
      }
    } catch (err) {
      toast.error(err.message || "Failed to reject invitation.", { id: tid });
    }
  };

  // Run on mount, user/role switch, and establish background synchronization
  useEffect(() => {
    fetchDashboardData();
    const syncInterval = setInterval(() => fetchDashboardData(true), 15000);

    const handleRoleOrWsChange = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('user_role_changed', handleRoleOrWsChange);
    window.addEventListener('workspace_changed', handleRoleOrWsChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('user_role_changed', handleRoleOrWsChange);
      window.removeEventListener('workspace_changed', handleRoleOrWsChange);
    };
  }, [currentUser?.user?._id || currentUser?.user?.id || currentUser?.user?.email, selectedRole]);

  // Format calendar date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  // Create Case Handler
  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newCaseForm.name) {
      toast.error("Case Name is required!");
      return;
    }
    const tid = toast.loading("Initializing case folder...");
    try {
      await apiService.createProject({
        name: newCaseForm.name,
        clientName: newCaseForm.clientName,
        opponentName: newCaseForm.opponentName,
        caseType: newCaseForm.caseType,
        courtName: newCaseForm.courtName,
        summary: newCaseForm.summary,
        priority: newCaseForm.priority || 'Medium',
        status: 'Active',
        timeline: [],
        hearings: [],
        parties: [],
        research: [],
        drafts: [],
        contracts: [],
        evidence: []
      });
      toast.success("Case folder created successfully!", { id: tid });
      setIsNewCaseModalOpen(false);
      setNewCaseForm({
        name: '',
        clientName: '',
        opponentName: '',
        caseType: '',
        courtName: '',
        summary: '',
        priority: 'Medium'
      });
      await fetchDashboardData(true);
    } catch (err) {
      toast.error("Failed to create case folder.", { id: tid });
    }
  };

  // Update Case Handler
  const handleUpdateCase = async (e) => {
    e.preventDefault();
    if (!editingCase.name) {
      toast.error("Case Name is required!");
      return;
    }
    const tid = toast.loading("Updating case details...");
    try {
      await apiService.updateProject(editingCase._id, {
        name: editingCase.name,
        clientName: editingCase.clientName,
        opponentName: editingCase.opponentName,
        caseType: editingCase.caseType,
        courtName: editingCase.courtName,
        summary: editingCase.summary,
        priority: editingCase.priority
      });
      toast.success("Case updated successfully!", { id: tid });
      setEditingCase(null);
      await fetchDashboardData(true);
    } catch (err) {
      toast.error("Failed to update case parameters.", { id: tid });
    }
  };

  // Toggle Archive Status Handler
  const handleToggleArchive = async (e, c) => {
    e.stopPropagation();
    const newStatus = c.status === 'Archived' ? 'Active' : 'Archived';
    const tid = toast.loading(newStatus === 'Archived' ? "Archiving case folder..." : "Restoring case folder...");
    try {
      await apiService.updateProject(c._id, { status: newStatus });
      toast.success(newStatus === 'Archived' ? "Case folder archived!" : "Case folder restored!", { id: tid });
      await fetchDashboardData(true);
    } catch (err) {
      toast.error("Failed to change archive status.", { id: tid });
    }
  };

  // Delete Case Handler
  const handleDeleteCase = async (e, caseId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this case folder? All associated timelines, research, and drafts will be deleted.")) return;
    const tid = toast.loading("Deleting case folder...");
    try {
      await apiService.deleteProject(caseId);
      toast.success("Case folder deleted permanently!", { id: tid });
      await fetchDashboardData(true);
    } catch (err) {
      toast.error("Failed to delete case folder.", { id: tid });
    }
  };

  // Helper date checker for hearings
  const isHearingToday = (dateStr) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayStr) || new Date(dateStr).toDateString() === new Date().toDateString();
  };

  // Computed Real-Time Stats
  const activeCasesList = cases.filter(c => c.status === 'Active' || !c.status);
  const archivedCasesList = cases.filter(c => c.status === 'Archived');
  const completedCasesList = cases.filter(c => c.status === 'Closed' || c.status === 'Completed');
  const highPriorityCasesList = activeCasesList.filter(c => c.priority === 'High');

  // Compute stats counters
  const totalActiveCases = activeCasesList.length;
  
  // Total today's hearings
  const todaysHearingsList = [];
  activeCasesList.forEach(c => {
    if (c.hearings && c.hearings.length > 0) {
      c.hearings.forEach(h => {
        if (isHearingToday(h.date)) {
          todaysHearingsList.push({
            caseId: c._id,
            caseName: c.name,
            court: h.courtroom || c.courtName || 'District Court',
            judge: h.judge || 'Presiding Magistrate',
            time: h.date.includes('T') ? new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            title: h.title,
            priority: c.priority || 'Medium'
          });
        }
      });
    }
  });

  const totalTodaysHearingsCount = todaysHearingsList.length;

  // Total pending drafts count
  let totalPendingDrafts = 0;
  activeCasesList.forEach(c => {
    totalPendingDrafts += (c.drafts?.length || 0);
  });

  // Total pending research count
  let totalPendingResearch = 0;
  activeCasesList.forEach(c => {
    totalPendingResearch += (c.research?.length || 0);
  });

  // Recent cases (sorted by last updated)
  const recentCasesList = [...cases].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  // Continue working case (last updated active case)
  const continueWorkingCase = activeCasesList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];

  // Upcoming deadlines (Hearings & timeline dates in future)
  const upcomingDeadlinesList = [];
  activeCasesList.forEach(c => {
    if (c.hearings) {
      c.hearings.forEach(h => {
        const hDate = new Date(h.date);
        if (hDate > new Date() && !isHearingToday(h.date)) {
          upcomingDeadlinesList.push({
            caseName: c.name,
            title: `Hearing: ${h.title}`,
            date: hDate,
            type: 'hearing'
          });
        }
      });
    }
    if (c.timeline) {
      c.timeline.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate > new Date()) {
          upcomingDeadlinesList.push({
            caseName: c.name,
            title: `Milestone: ${t.title}`,
            date: tDate,
            type: 'milestone'
          });
        }
      });
    }
  });
  const sortedDeadlines = upcomingDeadlinesList.sort((a, b) => a.date - b.date).slice(0, 4);

  // Dynamic Case Analytics (Categories Breakdown & average strength)
  const categoriesMap = {};
  let totalStrengthSum = 0;
  let casesWithStrengthCount = 0;

  activeCasesList.forEach(c => {
    const cat = c.caseType || 'General Civil';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;

    // Check strength score
    const strength = c.strengthScore || c.intelligence?.strengthScore;
    if (strength !== undefined) {
      totalStrengthSum += strength;
      casesWithStrengthCount++;
    }
  });

  const averageStrength = casesWithStrengthCount > 0 ? Math.round(totalStrengthSum / casesWithStrengthCount) : 75;

  const categoryAnalytics = Object.keys(categoriesMap).map(key => ({
    name: key,
    count: categoriesMap[key],
    percentage: Math.round((categoriesMap[key] / totalActiveCases) * 100) || 0
  })).sort((a, b) => b.count - a.count).slice(0, 3);

  // Generate automated AI Insights based on case states
  const aiInsightsList = [];
  activeCasesList.forEach(c => {
    if (c.contracts && c.contracts.length > 0 && !c.isContractLinked) {
      aiInsightsList.push({
        id: `ins-${c._id}-contract`,
        caseName: c.name,
        tip: "Contract uploaded contains unlinked execution dates. Link contract to timeline to verify limitations.",
        type: "warning"
      });
    }
    if (c.hearings && c.hearings.length > 0 && !c.hearings.some(h => h.status === 'Completed')) {
      aiInsightsList.push({
        id: `ins-${c._id}-hearings`,
        caseName: c.name,
        tip: "First hearing is scheduled. Compile case docket binder early to avoid administrative delays.",
        type: "strategy"
      });
    }
  });
  
  // Default insights if none generated
  if (aiInsightsList.length === 0) {
    aiInsightsList.push({
      id: "ins-def-1",
      caseName: "Global Recommendation",
      tip: "AI Strategy recommends checking evidence mappings on commercial recovery filings early.",
      type: "strategy"
    });
  }

  // Automated AI Activity Log simulation
  const recentAiActivities = [];
  recentCasesList.slice(0, 3).forEach((c, idx) => {
    const activities = [
      "AI analyzed contract vulnerabilities & calculated risk score",
      "AI compiled trial docket preparation binder",
      "AI researched matching Supreme Court precedents"
    ];
    recentAiActivities.push({
      caseName: c.name,
      activity: activities[idx % activities.length],
      time: c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
    });
  });

  // Navigate to case helper
  const handleOpenWorkspace = (cId) => {
    navigate(`/dashboard/cases/${cId}`, { replace: true });
  };

  // Loading Skeleton Component
  const renderLoadingSkeletons = () => (
    <div className="space-y-10 animate-pulse">
      <div className="flex justify-between items-center pb-6 border-b border-[#F3F4F6]">
        <div className="space-y-2 w-1/3">
          <div className="h-7 bg-slate-100 rounded-md" />
          <div className="h-4 bg-slate-100 rounded-md w-1/2" />
        </div>
        <div className="h-10 bg-slate-100 rounded-xl w-32" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border border-slate-150 rounded-xl bg-white space-y-4">
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-1/4" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-5 bg-slate-100 rounded w-1/4" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-6 border border-slate-150 rounded-xl bg-white space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-5 bg-slate-100 rounded w-1/3" />
          <div className="p-6 border border-slate-150 rounded-xl bg-white h-48" />
        </div>
      </div>
    </div>
  );

  if (selectedRole === 'student') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto text-[#111827] dark:text-white font-sans transition-colors">
        <StudentDashboardSection user={currentUser?.user} cases={cases} />
      </div>
    );
  }

  if (selectedRole === 'law_firm') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto text-[#111827] dark:text-white font-sans transition-colors">
        <LawFirmDashboardSection user={currentUser?.user} cases={cases} workspaces={[]} onRefresh={fetchDashboardData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto text-[#111827] dark:text-white font-sans transition-colors">
      
      {isLoading ? renderLoadingSkeletons() : (
        <>
          {/* 1. Header Greeting & Primary Action */}
          <div className="flex items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-white truncate">
                  Welcome, Advocate {userName}
                </h1>
                {isSyncing && (
                  <RefreshCw size={14} className="text-[#C8A34D] animate-spin shrink-0" />
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#C8A34D] shrink-0" />
                <span>{formatDate(currentTime)}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsNotifOpen(true)}
                className="relative flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 bg-[#C8A34D]/15 hover:bg-[#C8A34D]/25 border border-[#C8A34D]/40 text-[#B48A35] dark:text-[#C8A34D] font-black rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
                title="View Updates & System Notifications"
              >
                <div className="relative">
                  <Bell className="w-4.5 h-4.5 sm:w-4.5 sm:h-4.5 text-[#C8A34D]" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#0F172A] animate-pulse" />
                  )}
                </div>
                <span className="hidden sm:inline">Updates & Notifications</span>
                {unreadNotifCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

          {/* Pending Workspace Invitation Banner */}
          {pendingInvite && (
            <div className="mb-8 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#C8A34D]/40 text-[#0F172A] dark:text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-bold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#C8A34D]" />
                  <span>Pending Firm Invitation</span>
                </div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Invited to join <strong className="text-[#C8A34D]">{pendingInvite.firmName || pendingInvite.workspaceName || 'Law Firm Workspace'}</strong>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Role Designation: <span className="font-semibold text-[#0F172A] dark:text-white">{pendingInvite.role || 'Associate Advocate'}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => handleAcceptInvite(pendingInvite._id || pendingInvite.id, pendingInvite.workspaceId)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Accept Invitation
                </button>
                <button
                  onClick={() => handleRejectInvite(pendingInvite._id || pendingInvite.id)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs">
              <AlertTriangle className="text-rose-500 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Advocate Litigation Dashboard */}
          {/* 2. Today's Overview Statistics Ribbon */}
          <div className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Today&apos;s Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {[
                { label: "Active Cases", value: totalActiveCases, icon: Briefcase, status: "Active", color: "text-[#C8A34D] bg-[#C8A34D]/10 border border-[#C8A34D]/25" },
                { label: "Today's Hearings", value: totalTodaysHearingsCount, icon: Gavel, status: totalTodaysHearingsCount > 0 ? "TODAY" : "0 Today", color: totalTodaysHearingsCount > 0 ? "text-rose-500 bg-rose-50 border border-rose-200" : "text-slate-400 bg-slate-100 dark:bg-slate-800" },
                { label: "Pending Drafts", value: totalPendingDrafts, icon: FileText, status: "Pending", color: "text-amber-500 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/40" },
                { label: "Pending Research", value: totalPendingResearch, icon: Search, status: "Up to Date", color: "text-emerald-500 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/40" }
              ].map((stat, i) => (
                <div key={i} className="p-3.5 sm:p-6 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] shadow-xs hover:border-[#C8A34D] hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest truncate">{stat.label}</span>
                    <div className={`p-1.5 sm:p-2 rounded-xl ${stat.color} shrink-0`}>
                      <stat.icon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between mt-1 sm:mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#111111] dark:text-white">{stat.value}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {stat.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Main Workspace Content */}
          <div className="w-full space-y-6 lg:space-y-8">

              {/* Continue Working Card */}
              {continueWorkingCase && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Continue Working</h2>
                  <div 
                    onClick={() => handleOpenWorkspace(continueWorkingCase._id)}
                    className="p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] hover:border-[#C8A34D] transition-all shadow-xs cursor-pointer relative group overflow-hidden"
                  >
                    <div className="absolute right-4 top-4 text-slate-400 group-hover:text-[#C8A34D] transition-colors">
                      <ArrowUpRight size={16} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/25 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full">Last Updated Case</span>
                    <h3 className="text-base sm:text-xl font-black text-[#111111] dark:text-white mt-1.5 group-hover:text-[#C8A34D] transition-colors truncate">{continueWorkingCase.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 max-w-md truncate">{continueWorkingCase.summary || 'No summary configured yet.'}</p>
                    
                    <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-semibold overflow-x-auto no-scrollbar">
                      <span className="shrink-0">Hearings: <strong className="text-[#111111] dark:text-white">{continueWorkingCase.hearings?.length || 0}</strong></span>
                      <span className="shrink-0">Evidence: <strong className="text-[#111111] dark:text-white">{continueWorkingCase.evidence?.length || 0}</strong></span>
                      <span className="shrink-0">Contracts: <strong className="text-[#111111] dark:text-white">{continueWorkingCase.contracts?.length || 0}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Entitlements & Usage Summary */}
              <div className="p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Subscription Quotas</span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">{badge}</span>
                  </div>
                  <button
                    onClick={() => triggerUpgradeModal({ title: 'Manage Subscription', message: 'Upgrade your plan to unlock higher limits.' })}
                    className="text-[11px] sm:text-xs font-bold text-[#C8A34D] hover:underline cursor-pointer shrink-0"
                  >
                    Upgrade →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-xs text-slate-400 font-semibold truncate">Active Matters</p>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {subCases?.used || 0} / {subCases?.limit === -1 ? '∞' : (subCases?.limit || 3)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-xs text-slate-400 font-semibold truncate">Cloud Storage</p>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {storage?.usedGB || 0} GB / {storage?.limitGB === -1 ? '∞' : `${storage?.limitGB || 1} GB`}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-xs text-slate-400 font-semibold truncate">AI Queries</p>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {features?.ai_chat ? `${features.ai_chat.used} / ${features.ai_chat.limit === -1 ? '∞' : features.ai_chat.limit}` : '0 / 50'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Quick Actions Row */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setNewCaseForm({ name: '', clientName: '', opponentName: '', caseType: '', courtName: '', summary: '', priority: 'Medium' });
                      setIsNewCaseModalOpen(true);
                    }}
                    className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] hover:border-[#C8A34D] hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/25 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform shrink-0">
                      +
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#111111] dark:text-white group-hover:text-[#C8A34D] transition-colors">New Case</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Initialize litigation folder & AI docket</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigate('/dashboard/guide')}
                    className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] hover:border-[#C8A34D] hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/25 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform shrink-0">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#111111] dark:text-white group-hover:text-[#C8A34D] transition-colors">Product Guide</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Interactive AI feature walkthrough</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 4. AI Legal Knowledge Hub Card */}
              <div className="p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1E293B] shadow-xs space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/25 shrink-0">
                    <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#111111] dark:text-white">AI Legal Knowledge Hub</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Search Indian laws, sections, judgments & legal procedures.</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#C8A34D] absolute left-3.5 top-3.5" />
                  <input 
                    type="text"
                    placeholder="Ask any legal question..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        navigate(`/dashboard/tools/knowledge-hub?q=${encodeURIComponent(e.target.value)}`);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trending Searches:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 whitespace-nowrap">
                    {['IPC 420', 'BNS', 'Divorce', 'GST', 'Consumer Rights', 'Labour Law', 'Property', 'RTI', 'Motor Accident'].map((chip, idx) => (
                      <button 
                        key={idx}
                        onClick={() => navigate(`/dashboard/tools/knowledge-hub?q=${encodeURIComponent(chip)}`)}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-[#0F172A] hover:bg-[#111111] dark:hover:bg-[#333333] border border-slate-200/80 dark:border-slate-800 hover:border-[#C8A34D] text-[#111111] dark:text-white hover:text-[#C8A34D] rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button 
                    onClick={() => navigate('/dashboard/tools/knowledge-hub')}
                    className="text-xs font-bold text-[#C8A34D] hover:text-[#b08d3b] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Knowledge Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5. New User Product Guide Banner (Dismissable) */}
              {isBannerVisible && (
                <div className="p-6 border border-[#C8A34D]/30 rounded-2xl bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white relative shadow-xs">
                  <button 
                    onClick={() => setIsBannerVisible(false)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#C8A34D]" />
                    <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white">New to AI LEGAL?</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mb-3">Meet your AI Product Guide.</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 mb-4 font-medium">
                    <li className="flex items-center gap-2">• Learn every feature step-by-step.</li>
                    <li className="flex items-center gap-2">• Ask questions in Hindi or English.</li>
                    <li className="flex items-center gap-2">• Get instant help while using the app.</li>
                  </ul>
                  <button 
                    onClick={() => navigate('/dashboard/guide')}
                    className="px-4 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Open Product Guide &rarr;
                  </button>
                </div>
              )}



              {/* High Priority Cases List */}
              {highPriorityCasesList.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} /> High Priority Action Required
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {highPriorityCasesList.map(c => (
                      <div 
                        key={c._id}
                        onClick={() => handleOpenWorkspace(c._id)}
                        className="p-5 border border-rose-100 dark:border-rose-900/40 rounded-2xl bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-300 transition-all cursor-pointer space-y-2"
                      >
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{c.name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">Court: {c.courtName || 'Not Set'}</p>
                        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[8px] font-bold uppercase rounded block w-fit">Critical Tracker</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

          </div>

          {/* E. MODAL Dialog: New Case Folder Wizard */}
          <CreateCaseWizardModal 
            isOpen={isNewCaseModalOpen}
            onClose={() => setIsNewCaseModalOpen(false)}
            onSuccess={(created) => {
              if (fetchDashboardCases) {
                fetchDashboardCases();
              }
              if (created && (created._id || created.id)) {
                navigate(`/dashboard/cases/${created._id || created.id}`);
              }
            }}
          />

          {/* F. MODAL Dialog: Edit Case Folder */}
          <AnimatePresence>
            {editingCase && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white dark:bg-[#222222] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 className="text-sm font-black text-[#111111] dark:text-white uppercase tracking-widest">Edit Case Details</h3>
                    <button onClick={() => setEditingCase(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateCase} className="space-y-4 py-4 overflow-y-auto flex-1 custom-scrollbar pr-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Case / Suit Name</label>
                      <input 
                        type="text" 
                        value={editingCase.name}
                        onChange={e => setEditingCase({ ...editingCase, name: e.target.value })}
                        required
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] focus:ring-1 focus:ring-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Client Name</label>
                        <input 
                          type="text" 
                          value={editingCase.clientName || ''}
                          onChange={e => setEditingCase({ ...editingCase, clientName: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Opponent Party</label>
                        <input 
                          type="text" 
                          value={editingCase.opponentName || ''}
                          onChange={e => setEditingCase({ ...editingCase, opponentName: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Legal Domain</label>
                        <input 
                          type="text" 
                          value={editingCase.caseType || ''}
                          onChange={e => setEditingCase({ ...editingCase, caseType: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Presiding Court</label>
                        <input 
                          type="text" 
                          value={editingCase.courtName || ''}
                          onChange={e => setEditingCase({ ...editingCase, courtName: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Priority Status</label>
                      <select 
                        value={editingCase.priority || 'Medium'}
                        onChange={e => setEditingCase({ ...editingCase, priority: e.target.value })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] bg-white dark:bg-[#111111] text-[#111111] dark:text-white"
                      >
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High Priority</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Case Statement Summary</label>
                      <textarea 
                        value={editingCase.summary || ''}
                        onChange={e => setEditingCase({ ...editingCase, summary: e.target.value })}
                        rows={3}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] resize-none text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-colors mt-2 cursor-pointer shadow-md"
                    >
                      Save Changes
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* G. MODAL Dialog: AI Product Guide Walkthrough */}
          <AnimatePresence>
            {isProductGuideOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-purple-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI LEGAL Product Guide</h3>
                    </div>
                    <button onClick={() => setIsProductGuideOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="py-6 space-y-4 text-slate-700 text-xs font-medium overflow-y-auto custom-scrollbar flex-1">
                    <p className="font-semibold text-slate-900 text-sm">Welcome to your AI LEGAL Litigation Practice Workspace!</p>
                    
                    <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
                      <h4 className="font-extrabold text-purple-950 text-xs">1. 📁 Litigation Case Folders</h4>
                      <p className="text-purple-900/80">Manage all client briefs, court hearings, evidence files, and case notes in dedicated case dockets.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                      <h4 className="font-extrabold text-indigo-950 text-xs">2. 🤖 AI Legal Assistant & Tools</h4>
                      <p className="text-indigo-900/80">Automate petition drafting, case law precedent searches, document OCR scanning, and trial argument building.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 space-y-2">
                      <h4 className="font-extrabold text-amber-950 text-xs">3. 🏛️ Workspace Roles</h4>
                      <p className="text-amber-900/80">Switch instantly between Advocate litigation mode, Student exam tutor, and Law Firm team collaboration views.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setIsProductGuideOpen(false)}
                      className="px-5 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Got it! Close Guide
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
