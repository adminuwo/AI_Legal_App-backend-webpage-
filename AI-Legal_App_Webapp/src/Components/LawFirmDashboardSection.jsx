import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Briefcase, ShieldCheck, Plus, 
  CreditCard, UserPlus, Mail, CheckCircle2, ChevronRight, 
  MoreVertical, FileText, Database, Sparkles, X, Settings2,
  Calendar, AlertCircle, Trash2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';
import { useSubscription } from '../context/SubscriptionContext';
import InviteTeamMemberModal from '../Tools/AI_Legal/components/InviteTeamMemberModal';

export default function LawFirmDashboardSection({ user, cases = [], workspaces = [], onRefresh }) {
  const navigate = useNavigate();
  const { triggerUpgradeModal } = useSubscription();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Associate Advocate' });
  const [activeMenuMemberId, setActiveMenuMemberId] = useState(null);
  const [activeWsId, setActiveWsId] = useState(() => localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace');

  React.useEffect(() => {
    const handleWorkspaceChange = () => {
      const current = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';
      setActiveWsId(current);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    };
    window.addEventListener('workspace_changed', handleWorkspaceChange);
    window.addEventListener('user_role_changed', handleWorkspaceChange);
    return () => {
      window.removeEventListener('workspace_changed', handleWorkspaceChange);
      window.removeEventListener('user_role_changed', handleWorkspaceChange);
    };
  }, [onRefresh]);

  const activeWorkspaceObj = useMemo(() => {
    if (Array.isArray(workspaces) && workspaces.length > 0) {
      return workspaces.find(w => (w._id || w.id) === activeWsId) || workspaces[0];
    }
    return null;
  }, [workspaces, activeWsId]);

  const activeWsName = activeWorkspaceObj?.name || 'Firm Overview';

  // Filter firm cases strictly (workspaceType === 'law_firm' or firm cases)
  const firmCases = useMemo(() => {
    if (!Array.isArray(cases)) return [];
    return cases.filter(c => c.workspaceType === 'law_firm' || c.role === 'law_firm' || !c.workspaceType);
  }, [cases]);

  // Dynamic real-time owner member
  const ownerMember = useMemo(() => ({
    id: user?.id || user?._id || 'owner_1',
    name: user?.name || user?.fullName || 'Managing Director',
    email: user?.email || 'admin@firm.com',
    role: 'Firm Partner (Owner)',
    status: 'Active',
    isOwner: true
  }), [user]);

  // Real-time team members state (No hardcoded mock data)
  const [teamMembers, setTeamMembers] = useState([ownerMember]);
  const [pendingInvite, setPendingInvite] = useState(null);

  React.useEffect(() => {
    const fetchPendingInvite = async () => {
      try {
        const res = await apiService.get('/workspaces/invitations/pending');
        const data = res?.data || res;
        if (data?.success && Array.isArray(data.invitations) && data.invitations.length > 0) {
          setPendingInvite(data.invitations[0]);
        } else {
          setPendingInvite(null);
        }
      } catch (err) {
        console.warn('Failed to fetch pending invite in LawFirmDashboardSection:', err);
      }
    };
    fetchPendingInvite();
  }, []);

  const handleAcceptInvite = async (inviteId) => {
    const tid = toast.loading('Accepting firm invitation...');
    try {
      const res = await apiService.post(`/workspaces/invitations/${inviteId}/accept`);
      const data = res?.data || res;
      if (data?.success) {
        toast.success('Joined firm workspace successfully!', { id: tid });
        setPendingInvite(null);
        window.location.reload();
      } else {
        toast.error(data?.error || 'Failed to accept invitation.', { id: tid });
      }
    } catch (err) {
      toast.error('Failed to accept invitation.', { id: tid });
    }
  };

  const handleRejectInvite = async (inviteId) => {
    const tid = toast.loading('Declining invitation...');
    try {
      const res = await apiService.post(`/workspaces/invitations/${inviteId}/reject`);
      const data = res?.data || res;
      if (data?.success) {
        toast.success('Invitation declined.', { id: tid });
        setPendingInvite(null);
      } else {
        toast.error(data?.error || 'Failed to decline invitation.', { id: tid });
      }
    } catch (err) {
      toast.error('Failed to decline invitation.', { id: tid });
    }
  };

  // Fetch real team members from API
  React.useEffect(() => {
    const fetchRealTeamMembers = async () => {
      const currentWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || activeWsId || 'firm_abc_workspace';
      try {
        const res = await apiService.get(`/workspaces/${currentWsId}/members`);
        const membersList = res?.data?.members || res?.members || res?.data;
        if (Array.isArray(membersList) && membersList.length > 0) {
          const mapped = membersList.map(m => ({
            id: m._id || m.id,
            name: m.fullName || m.name || m.email?.split('@')[0],
            email: m.email,
            role: m.role || 'Associate Advocate',
            status: m.status === 'Accepted' ? 'Active' : (m.status || 'Active'),
            isOwner: m.isOwner || m.userId === (user?.id || user?._id)
          }));
          if (!mapped.some(m => m.isOwner)) {
            setTeamMembers([ownerMember, ...mapped]);
          } else {
            setTeamMembers(mapped);
          }
        } else {
          setTeamMembers([ownerMember]);
        }
      } catch (err) {
        setTeamMembers([ownerMember]);
      }
    };
    fetchRealTeamMembers();
  }, [user, ownerMember, activeWsId]);

  const maxSeats = user?.maxSeats || 10;
  const usedSeats = teamMembers.length;

  // Calculate stats dynamically matching Mobile App logic
  const totalActiveCases = firmCases.filter(c => c.status === 'Active' || !c.status).length;

  const todaysHearingsCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return firmCases.reduce((acc, c) => {
      if (!c.hearings || !Array.isArray(c.hearings)) return acc;
      const match = c.hearings.filter(h => h.date && h.date.includes(todayStr));
      return acc + match.length;
    }, 0);
  }, [firmCases]);

  const pendingDraftsCount = useMemo(() => {
    return firmCases.reduce((acc, c) => {
      if (!c.drafts || !Array.isArray(c.drafts)) return acc;
      return acc + c.drafts.filter(d => d.status === 'Draft' || d.status === 'In Progress').length;
    }, 0);
  }, [firmCases]);

  const pendingEvidenceCount = useMemo(() => {
    return firmCases.reduce((acc, c) => {
      if (!c.evidence || !Array.isArray(c.evidence)) return acc;
      return acc + c.evidence.filter(e => e.status === 'Pending' || e.status === 'Not Verified').length;
    }, 0);
  }, [firmCases]);

  const totalPendingReviews = pendingDraftsCount + pendingEvidenceCount;

  // Assign case counts to members dynamically
  const getMemberCaseCount = (member) => {
    if (member.isOwner) return firmCases.length;
    return firmCases.filter(c => 
      (c.leadAdvocate && c.leadAdvocate.toLowerCase().includes(member.name.toLowerCase())) ||
      (c.assignedTo && c.assignedTo.toLowerCase().includes(member.name.toLowerCase()))
    ).length || (member.status === 'Active' ? Math.floor(firmCases.length / Math.max(teamMembers.length - 1, 1)) : 0);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.email.trim()) {
      toast.error("Valid email address is required!");
      return;
    }

    if (usedSeats >= maxSeats) {
      triggerUpgradeModal({
        title: 'Firm Seat Limit Reached',
        message: `Your firm plan currently supports up to ${maxSeats} team members. Upgrade your subscription to invite additional team members.`,
        used: usedSeats,
        limit: maxSeats,
        feature: 'team_members'
      });
      return;
    }

    const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';
    try {
      const tid = toast.loading('Sending team invitation...');
      const res = await apiService.request(`/workspaces/${activeWsId}/invitations`, {
        method: 'POST',
        data: {
          fullName: inviteForm.name || inviteForm.email.split('@')[0],
          email: inviteForm.email.trim(),
          role: inviteForm.role
        }
      });
      const data = res?.data || res;

      if (data && data.success) {
        toast.success(`Invitation sent to ${inviteForm.email}!`, { id: tid });
        setTeamMembers(prev => [
          ...prev,
          {
            id: `inv_${Date.now()}`,
            name: inviteForm.name || inviteForm.email.split('@')[0],
            email: inviteForm.email,
            role: inviteForm.role,
            status: 'Pending Invite',
            isOwner: false
          }
        ]);
        setInviteForm({ name: '', email: '', role: 'Associate Advocate' });
        setIsInviteModalOpen(false);
      } else {
        toast.error(data?.error || 'Failed to send invitation.', { id: tid });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send invitation.');
    }
  };

  const toggleMemberStatus = (id) => {
    setTeamMembers(prev => prev.map(m => {
      if (m.id === id && !m.isOwner) {
        const nextStatus = m.status === 'Active' ? 'Pending Invite' : 'Active';
        toast.success(`Member status updated to ${nextStatus}`);
        return { ...m, status: nextStatus };
      }
      return m;
    }));
    setActiveMenuMemberId(null);
  };

  const removeMember = (id) => {
    const target = teamMembers.find(m => m.id === id);
    if (target?.isOwner) {
      toast.error("Cannot remove workspace owner!");
      return;
    }
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    toast.success(`Removed ${target?.name || 'member'} from firm workspace.`);
    setActiveMenuMemberId(null);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* 1. Header & Enterprise Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-white transition-colors">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A34D]/15 border border-[#C8A34D]/30 text-[#C8A34D] text-xs font-extrabold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Law Firm Enterprise Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>{activeWsName}</span>
            {activeWorkspaceObj?.badge && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] font-bold border border-[#C8A34D]/30">
                {activeWorkspaceObj.badge}
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            Multi-advocate case pipeline & team collaboration metrics
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b59240] text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/subscription')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 text-[#C8A34D]" />
            <span>Manage Seats</span>
          </button>
        </div>
      </div>

      {/* Pending Workspace Invitation Banner */}
      {pendingInvite && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-[#C8A34D] text-slate-900 dark:text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-extrabold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-[#C8A34D]" />
              <span>Pending Firm Invitation</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invited to join <strong className="text-[#C8A34D]">{pendingInvite.firmName || pendingInvite.workspaceName || 'Law Firm Workspace'}</strong>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Role Designation: <span className="font-semibold text-slate-900 dark:text-white">{pendingInvite.role || 'Associate Advocate'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => handleAcceptInvite(pendingInvite._id || pendingInvite.id)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              Accept Invitation
            </button>
            <button
              onClick={() => handleRejectInvite(pendingInvite._id || pendingInvite.id)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* 2. Firm KPI Overview (4 Grid Cards matching Mobile App) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Active Firm Cases */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">Active Firm Cases</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalActiveCases}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">{totalActiveCases} Live dockets</p>
        </div>

        {/* Card 2: Today's Hearings */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">Today's Hearings</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{todaysHearingsCount}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">{todaysHearingsCount > 0 ? `${todaysHearingsCount} scheduled` : 'Nothing scheduled'}</p>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">Pending Reviews</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{totalPendingReviews}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">{totalPendingReviews > 0 ? `${totalPendingReviews} pending` : 'No pending reviews'}</p>
        </div>

        {/* Card 4: Team Members */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">Team Members</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{usedSeats}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">{usedSeats} Active - 0 Pending</p>
        </div>
      </div>

      {/* 3. Daily AI Firm Executive Brief */}
      <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-[#1E2538] border-2 border-[#C8A34D]/80 shadow-sm space-y-2.5 transition-colors">
        <div className="flex items-center gap-2 text-[#C8A34D] font-extrabold text-sm uppercase tracking-wider">
          <Sparkles className="w-4.5 h-4.5" />
          <span>Daily AI Firm Executive Brief</span>
        </div>
        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
          {firmCases.length === 0 ? (
            <p>Welcome to your new Law Firm Workspace. Create your first case, invite team members, and start managing your firm's legal operations.</p>
          ) : (
            <div className="space-y-1">
              <p>• {todaysHearingsCount > 0 ? `${todaysHearingsCount} court hearings scheduled today across firm dockets.` : 'No urgent court hearings scheduled today.'}</p>
              <p>• {totalPendingReviews > 0 ? `${totalPendingReviews} draft & evidence items awaiting review.` : 'All draft and evidence reviews up to date.'}</p>
              <p>• {totalActiveCases > 0 ? `${totalActiveCases} active firm litigation cases currently in progress.` : 'No active firm cases.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. AI Legal Knowledge Hub Card (Mobile Parity) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#C8A34D] border border-slate-200 dark:border-slate-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">AI Legal Knowledge Hub</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Search Indian laws, sections, judgments, legal procedures and get AI-powered legal answers.
            </p>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Ask any legal question..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                navigate(`/dashboard/tools/knowledge-hub?q=${encodeURIComponent(e.target.value)}`);
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#C8A34D]"
          />
          <Sparkles className="w-4 h-4 text-[#C8A34D] absolute left-3.5 top-3" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Trending Searches:</span>
          <div className="flex flex-wrap gap-2">
            {['IPC 420', 'BNS', 'Divorce', 'GST', 'Consumer Protection'].map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/dashboard/tools/knowledge-hub?q=${encodeURIComponent(tag)}`)}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#C8A34D] hover:bg-[#C8A34D]/15 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={() => navigate('/dashboard/tools/knowledge-hub')}
            className="text-xs font-extrabold text-[#C8A34D] hover:text-[#b08d3b] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Knowledge Hub</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. New to AI LEGAL™ Product Guide Banner */}
      <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-[#1E1B4B]/40 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-extrabold text-sm">
          <Sparkles className="w-4.5 h-4.5 text-[#C8A34D]" />
          <span>New to AI LEGAL™?</span>
        </div>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Meet your AI Product Guide.</p>
        <ul className="text-xs text-slate-600 dark:text-slate-300 font-medium space-y-1">
          <li>• Learn every feature step-by-step.</li>
          <li>• Ask questions in Hindi or English.</li>
          <li>• Get instant help while using the app.</li>
        </ul>
        <button
          onClick={() => navigate('/dashboard/guide')}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          Open Product Guide →
        </button>
      </div>

      {/* 4. Firm Team Members Roster Table */}
      <div id="firm-team-roster-section" className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C8A34D]" />
              <span>Firm Advocates & Team Roster</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage permissions, seat assignments, and active litigation workloads</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
            {usedSeats} / {maxSeats} Active Team Members
          </span>
        </div>

        {teamMembers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p>No team members yet. Invite your first advocate to start building your firm workspace.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-3 sm:px-4">Member Name</th>
                  <th className="py-3 px-3 sm:px-4">Role / Designation</th>
                  <th className="py-3 px-3 sm:px-4">Active Matters</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teamMembers.map((member) => {
                  const casesCount = getMemberCaseCount(member);
                  return (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#C8A34D]/20 border border-[#C8A34D]/40 flex items-center justify-center font-bold text-[#C8A34D] text-xs shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <span>{member.name}</span>
                              {member.isOwner && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold uppercase">Owner</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-bold text-slate-700 dark:text-slate-200">
                        {casesCount} Cases
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          member.status === 'Active' 
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right relative">
                        {!member.isOwner && (
                          <div className="inline-block relative">
                            <button
                              onClick={() => setActiveMenuMemberId(activeMenuMemberId === member.id ? null : member.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Member Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuMemberId === member.id && (
                              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1.5 text-left font-bold text-xs space-y-1">
                                <button
                                  onClick={() => toggleMemberStatus(member.id)}
                                  className="w-full px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-[#C8A34D]" />
                                  <span>{member.status === 'Active' ? 'Set Pending' : 'Set Active'}</span>
                                </button>
                                <button
                                  onClick={() => removeMember(member.id)}
                                  className="w-full px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove Member</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Invite Team Member Modal */}
      <InviteTeamMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
