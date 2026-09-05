import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';

const PRACTICE_AREAS = [
  'Civil Litigation',
  'Criminal Defence',
  'Corporate & Commercial',
  'Property & Real Estate',
  'Family Law',
  'Taxation & Banking',
  'Labour & Employment',
  'Arbitration & ADR',
  'IPR & Technology',
  'Consumer Disputes'
];

const LawFirmOnboardingView = ({ onWorkspaceCreated }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState(['Civil Litigation', 'Corporate & Commercial']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingInvites, setIsFetchingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  const fetchPendingInvites = async () => {
    try {
      setIsFetchingInvites(true);
      const res = await apiService.request('/workspaces/invitations/pending');
      const data = res?.data || res;
      if (data && data.success && Array.isArray(data.invitations)) {
        setPendingInvites(data.invitations);
      } else {
        setPendingInvites([]);
      }
    } catch (err) {
      console.warn('[LawFirmOnboarding] Error fetching invitations:', err);
    } finally {
      setIsFetchingInvites(false);
    }
  };

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const handleToggleArea = (area) => {
    if (selectedPracticeAreas.includes(area)) {
      if (selectedPracticeAreas.length > 1) {
        setSelectedPracticeAreas(prev => prev.filter(a => a !== area));
      }
    } else {
      setSelectedPracticeAreas(prev => [...prev, area]);
    }
  };

  const handleCreateFirm = async (e) => {
    e?.preventDefault();
    if (!firmName.trim()) {
      toast.error('Law Firm Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const tid = toast.loading('Creating Enterprise Law Firm Workspace...');
      const res = await apiService.request('/workspaces', {
        method: 'POST',
        data: { 
          name: firmName.trim(),
          practiceAreas: selectedPracticeAreas
        }
      });
      const data = res?.data || res;

      if (data && data.success && data.workspace) {
        const newWs = data.workspace;
        const newWsId = newWs._id || newWs.id;
        localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', newWsId);
        toast.success(`Welcome to ${firmName}! Firm Workspace Created.`, { id: tid });
        setIsCreateModalOpen(false);
        if (onWorkspaceCreated) onWorkspaceCreated(newWs);
      } else {
        toast.error(data?.error || 'Failed to create law firm workspace.', { id: tid });
      }
    } catch (err) {
      console.error('[LawFirmOnboarding] Create error:', err);
      toast.error(err?.response?.data?.error || err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (inviteId, workspaceId) => {
    try {
      const tid = toast.loading('Accepting invitation...');
      const res = await apiService.request(`/workspaces/invitations/${inviteId}/accept`, {
        method: 'POST'
      });
      const data = res?.data || res;

      if (data && data.success) {
        toast.success('Joined Law Firm Workspace successfully!', { id: tid });
        if (workspaceId) {
          localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', workspaceId);
        }
        if (onWorkspaceCreated) onWorkspaceCreated();
      } else {
        toast.error(data?.error || 'Failed to accept invitation.', { id: tid });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error accepting invitation.');
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      const res = await apiService.request(`/workspaces/invitations/${inviteId}/reject`, {
        method: 'POST'
      });
      const data = res?.data || res;

      if (data && data.success) {
        toast.success('Invitation declined.');
        setPendingInvites(prev => prev.filter(i => (i._id || i.id) !== inviteId));
      }
    } catch (err) {
      toast.error('Error declining invitation.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Onboarding Header Banner */}
      <div className="text-center space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-black uppercase tracking-wider">
          <Building2 size={15} /> Law Firm Enterprise Setup
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111111] dark:text-white tracking-tight">
          Setup Your Law Firm Workspace
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Create a centralized enterprise workspace to manage team advocates, multi-user seat permissions, shared client litigation dockets, and firm AI operations.
        </p>
      </div>

      {/* Primary Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* OPTION 1: CREATE NEW LAW FIRM */}
        <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-200 dark:border-slate-800 hover:border-[#C8A34D] dark:hover:border-[#C8A34D] rounded-3xl p-8 shadow-sm transition-all flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Building2 size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[#111111] dark:text-white flex items-center gap-2">
                Create Law Firm Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Initialize a new law firm workspace as Managing Partner. Configure practice areas, add seats, and onboard associate lawyers.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <ShieldCheck size={16} className="text-emerald-500" /> 256-Bit Data Isolation & Workspace Boundary
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Users size={16} className="text-indigo-500" /> Multi-User Team Roster & Seat Management
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Briefcase size={16} className="text-[#C8A34D]" /> Shared Firm Docket & Evidence Repository
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full py-3.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={18} />
            <span>+ Setup Enterprise Firm Workspace</span>
          </button>
        </div>

        {/* OPTION 2: JOIN EXISTING FIRM (PENDING INVITATIONS) */}
        <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-md">
                <Mail size={28} />
              </div>
              <button 
                onClick={fetchPendingInvites}
                disabled={isFetchingInvites}
                className="p-2 text-slate-400 hover:text-[#C8A34D] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh Invitations"
              >
                <RefreshCw size={16} className={isFetchingInvites ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[#111111] dark:text-white flex items-center gap-2">
                Pending Invitations ({pendingInvites.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Join an existing law firm workspace if you received an email invitation from a Managing Partner or Senior Counsel.
              </p>
            </div>

            {/* Pending Invitations List */}
            {pendingInvites.length > 0 ? (
              <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {pendingInvites.map((inv) => {
                  const invId = inv._id || inv.id;
                  const wsName = inv.workspaceId?.name || inv.workspaceName || 'Law Firm Workspace';
                  const wsId = inv.workspaceId?._id || inv.workspaceId?.id || inv.workspaceId;
                  const roleName = inv.role || 'Associate Advocate';

                  return (
                    <div key={invId} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-[#111111] dark:text-white">{wsName}</h4>
                          <span className="text-[10px] font-bold text-[#C8A34D] uppercase">{roleName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Pending Invite
                        </span>
                      </div>

                      {inv.personalMessage && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{inv.personalMessage}"</p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAcceptInvite(invId, wsId)}
                          className="flex-1 py-1.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Accept
                        </button>
                        <button
                          onClick={() => handleRejectInvite(invId)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <XCircle size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <Mail size={24} className="text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  No pending invitations found. Ask your firm administrator to invite you via official email.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CREATE LAW FIRM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[200000] p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 flex items-center justify-center font-black">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111111] dark:text-white">Create Law Firm Workspace</h3>
                  <p className="text-xs text-slate-500 font-medium">Setup your enterprise practice details</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFirm} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                  Law Firm Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lakhera & Associates Law Offices"
                  value={firmName}
                  onChange={e => setFirmName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                  Primary Practice Areas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRACTICE_AREAS.map(area => {
                    const isSelected = selectedPracticeAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleToggleArea(area)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/50 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !firmName.trim()}
                  className="px-6 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs uppercase tracking-wider shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Initialize Firm Workspace'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default LawFirmOnboardingView;
