import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Search, ShieldCheck, CheckCircle2, XCircle, FileText, ExternalLink, 
  Clock, RefreshCw, ChevronLeft, ChevronRight, UserCheck, AlertCircle,
  UserPlus, Mail, Send, X, RotateCcw, Ban
} from 'lucide-react';
import axios from 'axios';
import { API } from '../../../types.js';
import { toast } from 'react-hot-toast';

const ITEMS_PER_PAGE = 15;

const AdminAdvocateVerificationsSection = memo(function AdminAdvocateVerificationsSection({ token }) {
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const getBaseApi = () => {
    return API.endsWith('/api') ? API : `${API}/api`;
  };

  const getEndpoint = (path = '') => {
    return `${getBaseApi()}/admin/advocate-verifications${path}`;
  };

  const fetchAdvocates = async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await axios.get(getEndpoint(), {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data && res.data.success) {
        setAdvocates(res.data.advocates || []);
      }
    } catch (err) {
      console.error('Failed to load advocate verifications:', err);
      toast.error('Failed to load advocate verifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdvocates();
  }, [token]);

  const handleUpdateStatus = async (advocateId, status, reason = '') => {
    try {
      setActionLoadingId(advocateId);
      const authToken = token || localStorage.getItem('token');
      const res = await axios.patch(
        getEndpoint(`/${advocateId}/status`),
        { status, reason },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data && res.data.success) {
        toast.success(`Advocate marked as ${status.toUpperCase()}`);
        setAdvocates(prev =>
          prev.map(a =>
            a.id === advocateId
              ? { 
                  ...a, 
                  verificationStatus: status, 
                  verifiedAt: status === 'verified' ? new Date() : null,
                  rejectionReason: status === 'rejected' ? reason : ''
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to update verification status:', err);
      toast.error('Could not update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim()) {
      setInviteError('Please enter an advocate email address.');
      return;
    }
    try {
      setIsSubmittingInvite(true);
      setInviteError('');
      const authToken = token || localStorage.getItem('token');
      const res = await axios.post(
        `${getBaseApi()}/admin/invitations/advocate`,
        { email: inviteEmail.trim(), name: inviteName.trim() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Invitation sent successfully!');
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        fetchAdvocates();
      }
    } catch (err) {
      console.error('Failed to send invitation:', err);
      const msg = err.response?.data?.message || 'Failed to send invitation. Please try again.';
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (invitationId) => {
    try {
      setActionLoadingId(invitationId);
      const authToken = token || localStorage.getItem('token');
      const res = await axios.post(
        `${getBaseApi()}/admin/invitations/advocate/${invitationId}/resend`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Invitation resent successfully!');
        fetchAdvocates();
      }
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      toast.error(err.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeInvite = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation? The advocate will not be able to use the link.')) {
      return;
    }
    try {
      setActionLoadingId(invitationId);
      const authToken = token || localStorage.getItem('token');
      const res = await axios.post(
        `${getBaseApi()}/admin/invitations/advocate/${invitationId}/revoke`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data && res.data.success) {
        toast.success('Invitation revoked successfully');
        setAdvocates(prev => prev.filter(a => (a.invitationId || a.id) !== invitationId));
      }
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      toast.error(err.response?.data?.message || 'Failed to revoke invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status counts for telemetry chips
  const counts = useMemo(() => {
    const res = { all: advocates.length, invited: 0, pending: 0, verified: 0, rejected: 0 };
    advocates.forEach(a => {
      const st = a.verificationStatus;
      if (a.isInvitation || st === 'invited' || st === 'expired') {
        res.invited++;
      } else if (res[st] !== undefined) {
        res[st]++;
      }
    });
    return res;
  }, [advocates]);

  const filteredAdvocates = useMemo(() => {
    return advocates.filter(a => {
      const currentSt = a.verificationStatus;
      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'invited') {
        matchesStatus = a.isInvitation || currentSt === 'invited' || currentSt === 'expired';
      } else {
        matchesStatus = currentSt === statusFilter;
      }

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q) ||
        (a.barCouncil || '').toLowerCase().includes(q) ||
        (a.barEnrollmentNumber || '').toLowerCase().includes(q) ||
        (a.practiceAreas || []).some(p => p.toLowerCase().includes(q)) ||
        (a.courts || []).some(c => c.toLowerCase().includes(c));
      return matchesStatus && matchesSearch;
    });
  }, [advocates, statusFilter, searchTerm]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredAdvocates.length / ITEMS_PER_PAGE) || 1;
  const paginatedAdvocates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdvocates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdvocates, currentPage]);

  return (
    <div className="space-y-4">
      {/* Top Telemetry & Action Banner */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Advocate Verification Queue:
          </span>
          <span className="text-[11px] sm:text-xs font-black text-[#B88B2A] bg-[#B88B2A]/10 px-3 py-1 rounded-full border border-[#B88B2A]/20">
            {counts.all} Total
          </span>
          {counts.invited > 0 && (
            <span className="text-[11px] sm:text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
              ✉ {counts.invited} Invited
            </span>
          )}
          {counts.pending > 0 && (
            <span className="text-[11px] sm:text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">
              ● {counts.pending} Awaiting Review
            </span>
          )}
          <span className="text-[11px] sm:text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            ✓ {counts.verified} Verified
          </span>
        </div>

        {/* Primary CTA + Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => {
              setInviteEmail('');
              setInviteName('');
              setInviteError('');
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#96701E] hover:from-[#A67B22] hover:to-[#85631A] text-white text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Invite Advocate</span>
          </button>

          <div className="flex items-center gap-1 flex-wrap bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
            {[
              { id: 'all', label: `ALL (${counts.all})` },
              { id: 'invited', label: `INVITED (${counts.invited})` },
              { id: 'pending', label: `PENDING (${counts.pending})` },
              { id: 'verified', label: `VERIFIED (${counts.verified})` },
              { id: 'rejected', label: `REJECTED (${counts.rejected})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-zinc-700'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar & Refresh Row */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#B88B2A] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by advocate name, email, bar council, enrollment number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#B88B2A] bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            Showing {filteredAdvocates.length} of {advocates.length}
          </span>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchAdvocates();
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-[#B88B2A] hover:border-[#B88B2A] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#B88B2A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content (Light Theme) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#1E293B] shadow-xs">
        <table className="w-full text-left text-sm text-slate-700 dark:text-zinc-200 whitespace-nowrap">
          <thead className="bg-slate-50/90 dark:bg-zinc-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-extrabold border-b border-slate-200/80 dark:border-zinc-800">
            <tr>
              <th className="px-5 py-3.5">Advocate</th>
              <th className="px-5 py-3.5">Bar Credentials</th>
              <th className="px-5 py-3.5">Practice Areas & Courts</th>
              <th className="px-5 py-3.5">Experience & Fee</th>
              <th className="px-5 py-3.5">Consent</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#B88B2A]" />
                    <span className="font-semibold text-xs">Loading advocate records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedAdvocates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center text-[#B88B2A]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                      No Advocate Records Found
                    </span>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {statusFilter === 'all'
                        ? 'No advocate verification applications or invitations yet. Click "+ Invite Advocate" to invite verified counsel.'
                        : `No records currently matching "${statusFilter.toUpperCase()}".`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedAdvocates.map((adv) => {
                const isInvite = Boolean(adv.isInvitation);
                const currentStatus = adv.verificationStatus || 'not_registered';
                const isPending = currentStatus === 'pending';
                const isVerified = currentStatus === 'verified';
                const isRejected = currentStatus === 'rejected';
                const isExpired = currentStatus === 'expired';
                const isActing = actionLoadingId === adv.id || actionLoadingId === adv.invitationId;

                return (
                  <tr key={adv.id || adv._id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-xs ${
                          isInvite 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' 
                            : 'bg-[#B88B2A]/15 border-[#B88B2A]/30 text-[#B88B2A]'
                        }`}>
                          {adv.name ? adv.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {adv.name}
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            {isInvite && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                Invited
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{adv.email || adv.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {isInvite ? (
                        <div className="text-xs text-slate-400 dark:text-zinc-500 italic">
                          Awaiting registration
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-slate-800 dark:text-zinc-200 text-xs">
                            {adv.barEnrollmentNumber || 'No Bar Number'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {adv.barCouncil || 'State Bar Council'} {adv.enrollmentYear ? `(${adv.enrollmentYear})` : ''}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="px-5 py-3.5 max-w-xs">
                      {isInvite ? (
                        <div className="text-xs text-slate-400 dark:text-zinc-500 italic">
                          Pending profile details
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-slate-800 dark:text-zinc-200 font-medium truncate">
                            {(adv.practiceAreas || []).length > 0
                              ? adv.practiceAreas.slice(0, 2).join(', ') + (adv.practiceAreas.length > 2 ? ` +${adv.practiceAreas.length - 2} more` : '')
                              : 'General Practice'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                            {(adv.courts || []).length > 0 ? adv.courts.join(', ') : (adv.state ? `${adv.state} Courts` : 'District & High Court')}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {isInvite ? (
                        <div className="text-xs text-slate-400 dark:text-zinc-500 italic">
                          To be completed
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-slate-900 dark:text-white font-semibold">
                            {adv.experienceYears ? `${adv.experienceYears} Exp` : '5+ Years'}
                          </div>
                          <div className="text-[11px] text-[#B88B2A] font-bold">
                            ₹{adv.consultationFee || 1500} / Consult
                          </div>
                        </>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {isInvite ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-500" />
                          Pending Acceptance
                        </span>
                      ) : adv.listingConsent === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          None
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {isInvite ? (
                        isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                            <Mail className="w-3 h-3 text-blue-500" />
                            Invited
                          </span>
                        )
                      ) : isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          ✓ Verified
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                          ✕ Rejected
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                          ● Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Not Registered
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isInvite ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={isActing}
                            onClick={() => handleResendInvite(adv.invitationId || adv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                            title="Resend invitation email"
                          >
                            <RotateCcw className={`w-3 h-3 ${isActing ? 'animate-spin' : ''}`} />
                            Resend
                          </button>

                          <button
                            disabled={isActing}
                            onClick={() => handleRevokeInvite(adv.invitationId || adv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 transition-all cursor-pointer disabled:opacity-50"
                            title="Revoke this invitation"
                          >
                            <Ban className="w-3 h-3" />
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {adv.verificationDocument?.uri && (
                            <a
                              href={adv.verificationDocument.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
                              title="View Bar Certificate"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#B88B2A]" />
                            </a>
                          )}

                          <button
                            disabled={isActing || isVerified}
                            onClick={() => handleUpdateStatus(adv.id, 'verified')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                          >
                            {isVerified ? 'Approved' : 'Approve'}
                          </button>

                          <button
                            disabled={isActing || isRejected}
                            onClick={() => handleUpdateStatus(adv.id, 'rejected', 'Verification credentials could not be validated.')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                              isRejected
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 cursor-default border border-rose-200 dark:border-rose-500/30'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                            }`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Advocate Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#B88B2A]/10 border border-[#B88B2A]/20 flex items-center justify-center text-[#B88B2A]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Invite Advocate</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Verified Network Invitation</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              {inviteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-start gap-2 text-rose-700 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Advocate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. advocate.sharma@lawchambers.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#B88B2A] transition-colors"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A secure, single-use link will be sent to this email address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Advocate Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adv. Rajesh Sharma"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#B88B2A] transition-colors"
                />
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-200/60 dark:border-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                <span className="font-bold">Security Note:</span> The invitation link expires in 7 days and enforces strict email matching when the advocate signs in.
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isSubmittingInvite}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#96701E] hover:from-[#A67B22] hover:to-[#85631A] text-white text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmittingInvite ? 'animate-pulse' : ''}`} />
                  <span>{isSubmittingInvite ? 'Sending Invitation...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            Page {currentPage} of {totalPages} ({filteredAdvocates.length} advocates)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                currentPage === 1
                  ? 'border-slate-200 dark:border-zinc-800 text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                currentPage === totalPages
                  ? 'border-slate-200 dark:border-zinc-800 text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default AdminAdvocateVerificationsSection;
