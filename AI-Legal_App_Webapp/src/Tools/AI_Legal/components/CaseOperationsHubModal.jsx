import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, UserPlus, Users, ArrowLeft, X, 
  ChevronRight, Briefcase, Sparkles, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';

export const CaseOperationsHubModal = ({
  isOpen,
  onClose,
  onLaunchCreateCase,
  onLaunchInviteTeam,
  onLaunchViewDirectory,
  cases = []
}) => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';

  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // Fetch firm members stats & pending invitations
  useEffect(() => {
    if (isOpen) {
      const fetchMembersAndInvites = async () => {
        setIsLoadingMembers(true);
        try {
          const [membersRes, invitesRes] = await Promise.allSettled([
            apiService.get(`/workspaces/${activeWsId}/members`),
            apiService.get(`/workspaces/${activeWsId}/invitations`)
          ]);

          const membersData = membersRes.status === 'fulfilled' ? (membersRes.value?.data || membersRes.value) : null;
          const invitesData = invitesRes.status === 'fulfilled' ? (invitesRes.value?.data || invitesRes.value) : null;

          const membersList = membersData?.members || [];
          if (Array.isArray(membersList)) {
            setTeamMembers(membersList);
          }

          const invitesList = Array.isArray(invitesData?.invitations) ? invitesData.invitations : [];
          const pendingFromStats = membersData?.stats?.pendingInvitations;
          const count = typeof pendingFromStats === 'number' && pendingFromStats > 0
            ? Math.max(pendingFromStats, invitesList.length)
            : invitesList.length;
          
          setPendingInvitesCount(count);
        } catch (err) {
          console.warn('[CaseOperationsHubModal] Failed to fetch team members & invites:', err);
        } finally {
          setIsLoadingMembers(false);
        }
      };
      fetchMembersAndInvites();
    }
  }, [isOpen, activeWsId]);

  const totalMembers = teamMembers.length + pendingInvitesCount;
  const activeMembers = teamMembers.filter(m => (m.status === 'Active' || m.status === 'Accepted' || !m.status)).length;
  const pendingInvites = pendingInvitesCount;

  const filteredCases = cases.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.clientName?.toLowerCase().includes(q) || c.courtName?.toLowerCase().includes(q);
  }).slice(0, 4);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[99999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-white font-sans max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Case Operations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Choose what you'd like to do with your firm's legal cases.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-5 pr-1">
            {/* Firm Team Members Card */}
            <div className="p-4 rounded-2xl border-2 border-[#C8A34D]/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:bg-amber-500/10 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#C8A34D]/20 text-[#C8A34D]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-base text-slate-900 dark:text-white">
                    Firm Team Members
                  </span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onLaunchViewDirectory) {
                      onLaunchViewDirectory('all');
                    } else if (onLaunchInviteTeam) {
                      onLaunchInviteTeam();
                    }
                  }}
                  className="px-3 py-1 rounded-full bg-[#C8A34D]/15 hover:bg-[#C8A34D]/25 text-[#C8A34D] text-xs font-black transition-all cursor-pointer border border-[#C8A34D]/30"
                >
                  View Directory →
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#C8A34D]/20 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onLaunchViewDirectory) onLaunchViewDirectory('all');
                  }}
                  className="flex-1 hover:bg-[#C8A34D]/10 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {isLoadingMembers ? '...' : totalMembers}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Total Members
                  </div>
                </button>
                <div className="w-[1px] h-7 bg-[#C8A34D]/20" />
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onLaunchViewDirectory) onLaunchViewDirectory('active');
                  }}
                  className="flex-1 hover:bg-emerald-500/10 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xl font-black text-emerald-500">
                    {isLoadingMembers ? '...' : activeMembers}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Active
                  </div>
                </button>
                <div className="w-[1px] h-7 bg-[#C8A34D]/20" />
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onLaunchViewDirectory) onLaunchViewDirectory('pending');
                  }}
                  className="flex-1 hover:bg-amber-500/10 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xl font-black text-amber-500">
                    {isLoadingMembers ? '...' : pendingInvites}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Pending Invites
                  </div>
                </button>
              </div>
            </div>

            {/* Modules Heading */}
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Case Operations Modules
              </h4>

              <div className="space-y-3">
                {/* Module 1: Create New Case */}
                <button
                  onClick={() => {
                    onClose();
                    onLaunchCreateCase();
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-[#C8A34D] transition-all cursor-pointer flex items-center justify-between gap-3.5 shadow-xs group text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FEF3C7] dark:bg-amber-500/20 border border-[#C8A34D]/40 flex items-center justify-center shrink-0 text-[#C8A34D]">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors">
                        Create New Case
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] text-[10px] font-black border border-[#C8A34D]/30 shrink-0">
                        Step Wizard
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Create a new legal case, assign advocates, link clients and initialize the AI workspace.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#C8A34D] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Module 2: Invite Team Member */}
                <button
                  onClick={() => {
                    onClose();
                    onLaunchInviteTeam();
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-[#C8A34D] transition-all cursor-pointer flex items-center justify-between gap-3.5 shadow-xs group text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FEF3C7] dark:bg-amber-500/20 border border-[#C8A34D]/40 flex items-center justify-center shrink-0 text-[#C8A34D]">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors">
                        Invite Team Member
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] text-[10px] font-black border border-[#C8A34D]/30 shrink-0">
                        Firm Roster
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Invite advocates and legal staff to join your firm's AI LEGAL workspace.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#C8A34D] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Recent Firm Cases Section */}
            {cases.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Recent Active Cases ({cases.length})
                </h4>
                <div className="space-y-2">
                  {filteredCases.map(c => (
                    <button
                      key={c._id || c.id}
                      onClick={() => {
                        onClose();
                        navigate(`/dashboard/cases/${c._id || c.id}`);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Briefcase className="w-4 h-4 text-[#C8A34D] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {c.courtName || 'Court'} • Client: {c.clientName || 'Private Client'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default CaseOperationsHubModal;
