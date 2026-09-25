import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Calendar, Clock, CheckCircle2, AlertCircle, 
  X, Send, RefreshCw, ChevronRight, Phone, Video, 
  Users, Trash2, ShieldCheck, ArrowRight, User, Search,
  Check, ArrowLeft, Filter, PhoneCall, VideoIcon, FileText, Lock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import consultationService from '../services/consultationService';

const FILTER_TABS = ['All', 'Pending', 'Active', 'Scheduled', 'Completed', 'Cancelled', 'Expired'];

export default function AdvocateConsultationsPage() {
  const navigate = useNavigate();
  const { id: routeConsultationId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active selected conversation
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all advocate consultation threads
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await consultationService.getAdvocateConversations();
      if (res && res.success) {
        setConversations(res.conversations || []);
        
        // If route has specific ID or nothing selected yet
        if (routeConsultationId && (!selectedConversation || selectedConversation.id !== routeConsultationId)) {
          const match = (res.conversations || []).find(c => c.id === routeConsultationId || c.consultationRequestId === routeConsultationId);
          if (match) setSelectedConversation(match);
        } else if (!selectedConversation && res.conversations && res.conversations.length > 0 && window.innerWidth >= 1024) {
          setSelectedConversation(res.conversations[0]);
        }
      }
    } catch (err) {
      console.warn('[AdvocateConsultationsPage] Error loading conversations:', err);
      toast.error('Could not load consultation conversations.');
    } finally {
      setLoading(false);
    }
  }, [routeConsultationId, selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (requestId, silent = false) => {
    if (!requestId) return;
    try {
      if (!silent) setLoadingMessages(true);
      const res = await consultationService.getMessages(requestId);
      if (res && res.success) {
        setMessages(res.messages || []);
        if (res.request && selectedConversation) {
          setSelectedConversation(prev => ({
            ...prev,
            status: res.request.status || prev.status,
            summary: res.request.legalIssueSummary || prev.summary,
            scheduledDate: res.request.scheduledDate || prev.scheduledDate,
            scheduledTimeSlot: res.request.scheduledTimeSlot || prev.scheduledTimeSlot,
            fee: res.request.fee || prev.fee,
            paymentStatus: res.request.paymentStatus || prev.paymentStatus,
          }));
        }
      }
    } catch (err) {
      console.warn('[AdvocateConsultationsPage] Error fetching messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.consultationRequestId || selectedConversation.id);
      
      // Auto-refresh chat every 5 seconds
      const pollTimer = setInterval(() => {
        fetchMessages(selectedConversation.consultationRequestId || selectedConversation.id, true);
      }, 5000);
      return () => clearInterval(pollTimer);
    }
  }, [selectedConversation?.id]);

  // Handle Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sendingMessage || !selectedConversation) return;

    if ((selectedConversation.paymentStatus || '').toLowerCase() !== 'paid') {
      toast.error('Chat is locked until client completes consultation payment.');
      return;
    }

    const reqId = selectedConversation.consultationRequestId || selectedConversation.id;
    const textToSend = newMessage.trim();
    setNewMessage('');

    // Optimistic message
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      consultationRequestId: reqId,
      senderRole: 'advocate',
      senderName: 'You (Advocate)',
      message: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      setSendingMessage(true);
      const res = await consultationService.sendMessage(reqId, textToSend);
      if (res && res.success) {
        fetchMessages(reqId, true);
      }
    } catch (err) {
      console.error('[AdvocateConsultationsPage] Send message failed:', err);
      toast.error('Failed to deliver message.');
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Status Update (Accept / Decline / Complete)
  const handleUpdateStatus = async (newStatus, notes = '') => {
    if (!selectedConversation || updatingStatus) return;
    const reqId = selectedConversation.consultationRequestId || selectedConversation.id;

    try {
      setUpdatingStatus(true);
      await consultationService.updateConsultationStatus(reqId, { status: newStatus, notes });
      toast.success(`Consultation ${newStatus === 'accepted' ? 'accepted' : newStatus === 'rejected' ? 'declined' : 'updated'}.`);
      setSelectedConversation(prev => ({ ...prev, status: newStatus }));
      fetchConversations();
      fetchMessages(reqId, true);
    } catch (err) {
      console.error('[AdvocateConsultationsPage] Update status error:', err);
      toast.error('Failed to update consultation status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(item => {
    const s = (item.status || 'pending').toLowerCase();
    if (activeFilter === 'Pending' && s !== 'pending') return false;
    if (activeFilter === 'Active' && s !== 'accepted' && s !== 'active') return false;
    if (activeFilter === 'Scheduled' && s !== 'scheduled') return false;
    if (activeFilter === 'Completed' && s !== 'completed') return false;
    if (activeFilter === 'Cancelled' && s !== 'cancelled' && s !== 'rejected') return false;
    if (activeFilter === 'Expired' && s !== 'expired') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.userName || '').toLowerCase().includes(q);
      const matchSub = (item.subject || '').toLowerCase().includes(q);
      const matchReq = (item.requestId || '').toLowerCase().includes(q);
      if (!matchName && !matchSub && !matchReq) return false;
    }

    return true;
  });

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
      case 'active':
        return { text: 'Active Consultation', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'scheduled':
        return { text: 'Scheduled', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'completed':
        return { text: 'Completed', bg: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20' };
      case 'expired':
        return { text: 'Expired', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'rejected':
      case 'cancelled':
        return { text: s.charAt(0).toUpperCase() + s.slice(1), bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      default:
        return { text: 'Pending Request', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    }
  };

  const getModeIcon = (type) => {
    const t = (type || 'chat').toLowerCase();
    if (t === 'audio') return <Phone className="w-3.5 h-3.5" />;
    if (t === 'video') return <Video className="w-3.5 h-3.5" />;
    return <MessageSquare className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] dark:bg-[#0B0F17] overflow-hidden select-none">
      {/* Top Banner / Header */}
      <div className="px-4 sm:px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#B88B2A]/10 flex items-center justify-center text-[#B88B2A] border border-[#B88B2A]/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Client Consultations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
              Advocate Chambers
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Review incoming consultation requests, schedule appointments, and chat live with clients.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchConversations}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/60 shadow-xs cursor-pointer transition-all"
            title="Refresh Consultations"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B88B2A] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Conversation & Request List */}
        <div className={`w-full lg:w-[380px] xl:w-[420px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 overflow-hidden ${
          selectedConversation && window.innerWidth < 1024 ? 'hidden' : 'flex'
        }`}>
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search client, subject or REQ ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-[#B88B2A] transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto scrollbar-none pb-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilter === tab
                      ? 'bg-[#B88B2A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
            {loading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#B88B2A]" />
                <p className="text-xs font-semibold">Loading consultations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#B88B2A]/10 flex items-center justify-center text-[#B88B2A]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">No Consultations Found</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  {searchQuery ? 'No client matches your search filter.' : 'When citizens request legal consultations, they will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = selectedConversation && (selectedConversation.id === conv.id || selectedConversation.consultationRequestId === conv.consultationRequestId);
                const statusBadge = getStatusBadge(conv.status);
                const formattedTime = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : '';

                return (
                  <div
                    key={conv.id || conv.consultationRequestId}
                    onClick={() => {
                      setSelectedConversation(conv);
                    }}
                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative select-none ${
                      isSelected
                        ? 'bg-[#B88B2A]/10 dark:bg-[#B88B2A]/15 border-l-4 border-[#B88B2A]'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 font-black text-sm">
                        {(conv.userName || 'C').charAt(0).toUpperCase()}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#B88B2A] rounded-full ring-2 ring-white dark:ring-zinc-900" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {conv.userName || 'Client'}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formattedTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-[#B88B2A] font-bold">
                          {conv.requestId || 'REQ'}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 truncate">
                          {conv.subject || 'Legal Advice'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 capitalize">
                          {getModeIcon(conv.consultationType)}
                          <span>{conv.consultationType || 'Chat'}</span>
                        </span>
                        {conv.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Paid
                          </span>
                        ) : ['accepted', 'scheduled'].includes((conv.status || '').toLowerCase()) ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Payment Pending
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1.5 font-normal">
                        {conv.lastMessage || conv.summary || 'Consultation request created.'}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#B88B2A] text-white text-[10px] font-black shrink-0 self-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Selected Conversation Chat & Case Review */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-[#0E131F] overflow-hidden ${
          !selectedConversation && window.innerWidth < 1024 ? 'hidden' : 'flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center font-black text-sm shrink-0 border border-[#B88B2A]/30">
                    {(selectedConversation.userName || 'C').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {selectedConversation.userName || 'Client'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedConversation.status).bg}`}>
                        {getStatusBadge(selectedConversation.status).text}
                      </span>
                      {selectedConversation.paymentStatus === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          Fee Paid (₹{selectedConversation.fee || 1500})
                        </span>
                      ) : ['accepted', 'scheduled'].includes((selectedConversation.status || '').toLowerCase()) ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Payment Pending (₹{selectedConversation.fee || 1500})
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                      <span>ID: {selectedConversation.requestId || 'REQ'}</span>
                      <span>•</span>
                      <span>{selectedConversation.subject || 'Consultation'}</span>
                      {selectedConversation.userEmail && (
                        <>
                          <span>•</span>
                          <span className="truncate">{selectedConversation.userEmail}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Advocate Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* If Status is Pending: Accept or Decline */}
                  {(selectedConversation.status || 'pending').toLowerCase() === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('accepted')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('rejected', 'Advocate unavailable for this schedule.')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                      >
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {/* If Status is Accepted/Active: Option to Mark Complete */}
                  {['accepted', 'active', 'scheduled'].includes((selectedConversation.status || '').toLowerCase()) && (
                    <button
                      onClick={() => handleUpdateStatus('completed', 'Consultation successfully concluded.')}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Case Summary Details"
                  >
                    <FileText className="w-4 h-4 text-[#B88B2A]" />
                  </button>
                </div>
              </div>

              {/* Case Summary Drawer/Accordion (Optional Quick View) */}
              <AnimatePresence>
                {showDetailsPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-amber-500/5 dark:bg-zinc-800/80 border-b border-amber-500/20 p-4 text-xs select-text overflow-hidden"
                  >
                    <div className="max-w-3xl mx-auto space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#B88B2A] uppercase tracking-wider text-[10px]">
                          Client Legal Issue Summary
                        </span>
                        <button
                          onClick={() => setShowDetailsPanel(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
                        {selectedConversation.summary || selectedConversation.lastMessage || 'No detailed issue summary provided by client.'}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-500">
                        {selectedConversation.scheduledDate && (
                          <span>📅 Date: <strong>{new Date(selectedConversation.scheduledDate).toLocaleDateString()}</strong></span>
                        )}
                        {selectedConversation.scheduledTimeSlot && (
                          <span>⏰ Slot: <strong>{selectedConversation.scheduledTimeSlot}</strong></span>
                        )}
                        {selectedConversation.fee && (
                          <span>💰 Consultation Fee: <strong>₹{selectedConversation.fee}</strong></span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Messages Flow */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 select-text">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#B88B2A]" />
                    <p className="text-xs font-semibold">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                    {((selectedConversation?.paymentStatus || '').toLowerCase() !== 'paid') && !['completed', 'cancelled', 'rejected', 'expired'].includes((selectedConversation?.status || '').toLowerCase()) ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Lock className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">Chat Locked • Payment Pending</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          The client has not completed the consultation payment (₹{selectedConversation.fee || 1500}) yet. Once the payment is confirmed, chat and calls will be automatically unlocked.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Start the Consultation</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Send a message to introduce yourself or advise your client on their legal matter.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isAdvocate = (msg.senderRole || '').toLowerCase() === 'advocate';
                    const timeString = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${isAdvocate ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                            {isAdvocate ? 'You (Advocate)' : selectedConversation.userName || 'Client'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {timeString}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                            isAdvocate
                              ? 'bg-[#B88B2A] text-white rounded-br-xs font-medium'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-bl-xs border border-slate-200/60 dark:border-zinc-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message || msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Payment Pending Locked Banner */}
              {((selectedConversation?.paymentStatus || '').toLowerCase() !== 'paid') && !['completed', 'cancelled', 'rejected', 'expired'].includes((selectedConversation?.status || '').toLowerCase()) && (
                <div className="px-4 py-2.5 bg-amber-500/10 dark:bg-amber-500/15 border-t border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">Client consultation fee (₹{selectedConversation.fee || 1500}) payment is pending. Chat remains locked until payment is received.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                    🔒 Chat Locked
                  </span>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-zinc-800">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      ['completed', 'cancelled', 'rejected', 'expired'].includes((selectedConversation.status || '').toLowerCase())
                        ? 'This consultation slot has ended. Messaging is closed.'
                        : (selectedConversation.paymentStatus || '').toLowerCase() !== 'paid'
                        ? `Chat is locked until client completes consultation payment (₹${selectedConversation.fee || 1500})...`
                        : 'Type your advice or message to the client...'
                    }
                    disabled={
                      sendingMessage ||
                      ['completed', 'cancelled', 'rejected', 'expired'].includes((selectedConversation.status || '').toLowerCase()) ||
                      (selectedConversation.paymentStatus || '').toLowerCase() !== 'paid'
                    }
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-[#B88B2A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={
                      !newMessage.trim() ||
                      sendingMessage ||
                      (selectedConversation.paymentStatus || '').toLowerCase() !== 'paid'
                    }
                    className="p-2.5 sm:px-4 sm:py-2.5 bg-[#B88B2A] hover:bg-[#a67c24] disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#B88B2A]/10 flex items-center justify-center text-[#B88B2A]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-zinc-200">
                Select a Client Consultation
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose an inquiry from the left panel to review client case summaries, confirm consultation slots, and provide direct counsel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
