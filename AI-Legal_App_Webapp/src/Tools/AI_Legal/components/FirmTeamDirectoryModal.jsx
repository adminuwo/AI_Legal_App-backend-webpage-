import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, Users, UserCheck, Clock, UserPlus, 
  Search, Mail, Phone, ShieldCheck, Briefcase, Sparkles, RefreshCw, Send, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService';

export const FirmTeamDirectoryModal = ({
  isOpen,
  onClose,
  onOpenInviteModal,
  initialTab = 'all'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'all' | 'active' | 'pending'
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.allSettled([
        apiService.get(`/workspaces/${activeWsId}/members`),
        apiService.get(`/workspaces/${activeWsId}/invitations`)
      ]);

      const membersData = membersRes.status === 'fulfilled' ? (membersRes.value?.data || membersRes.value) : null;
      const invitesData = invitesRes.status === 'fulfilled' ? (invitesRes.value?.data || invitesRes.value) : null;

      if (Array.isArray(membersData?.members)) {
        setMembers(membersData.members);
      } else {
        setMembers([]);
      }

      if (Array.isArray(invitesData?.invitations)) {
        setPendingInvites(invitesData.invitations);
      } else {
        setPendingInvites([]);
      }
    } catch (err) {
      console.error('[FirmTeamDirectoryModal] Error loading directory:', err);
      toast.error('Failed to load team directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchData();
    }
  }, [isOpen, activeWsId, initialTab]);

  if (!isOpen) return null;

  // Filter list based on search and tab
  const activeMembersList = members.filter(m => {
    const isAccepted = m.status === 'Active' || m.status === 'Accepted' || !m.status;
    const hasValidEmailOrOwner = Boolean(m.isOwner || (m.email && m.email.trim().length > 0));
    return isAccepted && hasValidEmailOrOwner;
  });
  const pendingInvitesList = pendingInvites.filter(i => i.status === 'Pending');

  let currentList = [];
  if (activeTab === 'active') {
    currentList = activeMembersList.map(m => ({ ...m, isInvite: false }));
  } else if (activeTab === 'pending') {
    currentList = pendingInvitesList.map(i => ({ ...i, isInvite: true }));
  } else {
    currentList = [
      ...activeMembersList.map(m => ({ ...m, isInvite: false })),
      ...pendingInvitesList.map(i => ({ ...i, isInvite: true }))
    ];
  }

  const filteredList = currentList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.fullName || item.name || '').toLowerCase();
    const email = (item.email || '').toLowerCase();
    const mobile = (item.mobile || item.phone || '').toLowerCase();
    const role = (item.role || '').toLowerCase();
    const dept = (item.department || '').toLowerCase();
    return name.includes(q) || email.includes(q) || mobile.includes(q) || role.includes(q) || dept.includes(q);
  });

  const totalCount = activeMembersList.length + pendingInvitesList.length;

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
          className="w-full max-w-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-white font-sans max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#C8A34D]" />
                  <span>Firm Team Directory</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  View and manage active advocates, firm staff, and pending team invitations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenInviteModal) onOpenInviteModal();
                }}
                className="px-4 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Tabs Toolbar */}
          <div className="py-4 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-[#1E293B] text-[#C8A34D] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All ({totalCount})</span>
                </button>

                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'active'
                      ? 'bg-white dark:bg-[#1E293B] text-emerald-500 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Active ({activeMembersList.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'pending'
                      ? 'bg-white dark:bg-[#1E293B] text-amber-500 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending ({pendingInvitesList.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                title="Refresh Directory"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#C8A34D] transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Content List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-3">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 font-semibold text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A34D]" />
                <p>Loading directory data from server...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-semibold text-xs space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Users className="w-10 h-10 mx-auto opacity-40 text-[#C8A34D]" />
                <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">No members found</p>
                <p className="text-slate-400 max-w-xs mx-auto">
                  {searchQuery ? 'No results matched your search query.' : 'No team members or pending invites found in this category.'}
                </p>
                {activeTab === 'pending' && pendingInvitesList.length === 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenInviteModal) onOpenInviteModal();
                    }}
                    className="mt-2 px-4 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send New Invitation</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredList.map((item, idx) => {
                  let rawName = item.fullName || item.name || '';
                  if (!rawName || rawName === 'Team Member' || rawName === 'TeamMember' || rawName === 'Advocate / Team Member') {
                    if (item.email) {
                      const emailPrefix = item.email.split('@')[0];
                      const formatted = emailPrefix
                        .replace(/[._-]/g, ' ')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');
                      rawName = formatted.toLowerCase().includes('adv') ? formatted : `Adv. ${formatted}`;
                    } else if (item.isOwner) {
                      rawName = 'Adv. Aditi Lakhera';
                    } else {
                      rawName = `Adv. ${item.role || 'Senior Advocate'}`;
                    }
                  }
                  const name = rawName;
                  const email = item.email || '';
                  const phone = item.mobile || item.phone || '';
                  const role = item.role || 'Associate Advocate';
                  const dept = item.department || 'Litigation';
                  const perm = item.permission || 'Standard Member';
                  const isInvite = Boolean(item.isInvite);

                  return (
                    <div 
                      key={item._id || item.id || `dir_${idx}`}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isInvite 
                          ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:border-[#C8A34D]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                          isInvite 
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-[#C8A34D]/20 text-[#C8A34D] border-[#C8A34D]/40'
                        }`}>
                          {name.charAt(0).toUpperCase()}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {name}
                            </span>

                            {item.isOwner && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                                Firm Owner
                              </span>
                            )}

                            {isInvite ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/40 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>Pending Invite</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active Member</span>
                              </span>
                            )}
                          </div>

                          {/* Contact Info (Email & Phone) */}
                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium flex-wrap">
                            {email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-[#C8A34D] shrink-0" />
                                <span className="truncate">{email}</span>
                              </span>
                            )}
                            {phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-[#C8A34D] shrink-0" />
                                <span>{phone}</span>
                              </span>
                            )}
                          </div>

                          {/* Role & Department */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                              <Briefcase className="w-3 h-3 text-[#C8A34D]" />
                              <span>{role}</span>
                            </span>
                            <span>•</span>
                            <span>{dept}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>{perm}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 self-end sm:self-center">
                        {isInvite ? (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" />
                            <span>Invitation Sent</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default FirmTeamDirectoryModal;
