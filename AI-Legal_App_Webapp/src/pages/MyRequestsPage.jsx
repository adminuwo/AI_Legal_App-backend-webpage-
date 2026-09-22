import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Calendar, Clock, CheckCircle2, AlertCircle, 
  X, Send, RefreshCw, ChevronRight, Phone, Video, 
  Users, Trash2, ShieldCheck, ArrowRight, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import consultationService from '../services/consultationService';

const FILTER_TABS = ['All', 'Pending', 'Accepted', 'Scheduled', 'Completed', 'Cancelled'];

export default function MyRequestsPage() {
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('All');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Chat Modal State
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  // Cancel Request Confirmation State
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await consultationService.getMyRequests(activeFilter);
      if (res && res.requests) {
        // Consolidate active requests by advocate so contacting the same advocate displays cleanly
        const seenAdvocates = new Set();
        const consolidated = [];

        for (const item of res.requests) {
          const rawAdvId = typeof item.advocateId === 'object' && item.advocateId !== null
            ? (item.advocateId._id || item.advocateId.id || item.advocateName || '')
            : (item.advocateId || item.advocateName || '');
          const advKey = String(rawAdvId).trim().toLowerCase();
          const isActive = ['pending', 'accepted', 'scheduled'].includes((item.status || '').toLowerCase());
          if (isActive) {
            if (seenAdvocates.has(advKey)) {
              continue;
            }
            seenAdvocates.add(advKey);
          }
          consolidated.push(item);
        }

        setRequests(consolidated);
      }
    } catch (err) {
      console.warn('[MyRequestsPage] Error loading requests:', err);
      toast.error('Failed to load consultation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeFilter]);

  // Load chat messages when activeChatRequest changes
  useEffect(() => {
    if (!activeChatRequest) return;
    const reqId = activeChatRequest._id || activeChatRequest.id;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await consultationService.getMessages(reqId);
        if (res && res.messages) {
          setMessages(res.messages);
        }
      } catch (err) {
        console.warn('[MyRequestsPage] Error loading messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    // Auto-poll messages every 5 seconds while chat modal is open
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChatRequest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatRequest || sendingMessage) return;

    const reqId = activeChatRequest._id || activeChatRequest.id;
    const text = newMessage.trim();
    setNewMessage('');

    try {
      setSendingMessage(true);
      const res = await consultationService.sendMessage(reqId, text);
      if (res && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      console.error('[MyRequestsPage] Error sending message:', err);
      toast.error('Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Cancel Request
  const handleConfirmCancel = async () => {
    if (!requestToCancel) return;
    const reqId = requestToCancel._id || requestToCancel.id;

    try {
      setCancelling(true);
      await consultationService.cancelRequest(reqId, 'Cancelled by user from web portal');
      toast.success('Consultation request cancelled.');
      setRequestToCancel(null);
      fetchRequests();
    } catch (err) {
      console.error('[MyRequestsPage] Cancel error:', err);
      toast.error(err?.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Accepted' };
      case 'scheduled':
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Scheduled' };
      case 'completed':
        return { bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Completed' };
      case 'cancelled':
        return { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', label: 'Cancelled' };
      case 'rejected':
        return { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', label: 'Declined' };
      default:
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Pending' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto text-[#111827] dark:text-white font-sans transition-colors pb-16 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Requests
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
              Advocate Consultations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Track advocate consultation requests, schedule status, fee receipts, and message your advocate directly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/advocates')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>New Consultation</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 my-6 overflow-x-auto custom-scrollbar pb-1">
        {FILTER_TABS.map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#B88B2A] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#B88B2A]/40'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-[#B88B2A]" />
          <p className="text-xs font-semibold">Loading your requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#B88B2A]/10 text-[#B88B2A] flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Consultations in "{activeFilter}"
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            You don't have any requests in this filter category. Need legal advice? Browse verified advocates and book a consult.
          </p>
          <button
            onClick={() => navigate('/dashboard/advocates')}
            className="px-5 py-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Find an Advocate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((item) => {
            const reqId = item._id || item.id;
            const advocateName = item.advocateName || (typeof item.advocateId === 'object' ? item.advocateId?.fullName || item.advocateId?.name : 'Advocate');
            const statusCfg = getStatusBadge(item.status);
            const dateStr = item.scheduledDate
              ? new Date(item.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Pending Confirmation';
            const isCanBeCancelled = ['pending', 'accepted'].includes((item.status || '').toLowerCase());

            return (
              <motion.div
                key={reqId}
                className="p-5 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {item.requestId || 'REQ'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {item.consultationType ? `${item.consultationType} consult` : 'Consultation'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Advocate Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#B88B2A]/15 border border-[#B88B2A]/30 flex items-center justify-center font-bold text-sm text-[#B88B2A] shrink-0">
                      {item.advocateAvatar && item.advocateAvatar.startsWith('http') ? (
                        <img src={item.advocateAvatar} alt={advocateName} className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        advocateName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {advocateName}
                      </h3>
                      <p className="text-xs text-[#B88B2A] font-semibold truncate mt-0.5">
                        {item.practiceArea || 'General Legal Consultation'}
                      </p>
                    </div>
                  </div>

                  {/* Schedule Details Card */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Date</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#B88B2A]" />
                        {dateStr}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Time Slot</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#B88B2A]" />
                        {item.scheduledTimeSlot || 'To be scheduled'}
                      </span>
                    </div>
                  </div>

                  {/* Legal Issue Summary */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Query Summary
                    </span>
                    <p className="line-clamp-2 leading-relaxed">
                      {item.legalIssueSummary || 'No summary provided.'}
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-slate-400 font-medium">Fee: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{item.fee || 1500}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCanBeCancelled && (
                      <button
                        onClick={() => setRequestToCancel(item)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => setActiveChatRequest(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat with Advocate</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Live Chat Modal */}
      <AnimatePresence>
        {activeChatRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl h-[85vh] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#B88B2A]/15 border border-[#B88B2A]/30 flex items-center justify-center font-bold text-[#B88B2A] text-sm shrink-0">
                    {(activeChatRequest.advocateName || 'A').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{activeChatRequest.advocateName || 'Advocate'}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#B88B2A]" />
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Request ID: {activeChatRequest.requestId || 'REQ'} • {activeChatRequest.practiceArea || 'Consultation'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveChatRequest(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-[#F8FAFC] dark:bg-[#0F172A]/40">
                {loadingMessages ? (
                  <div className="py-12 flex items-center justify-center text-slate-400 gap-2 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#B88B2A]" />
                    <span>Loading conversation...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p>No messages yet. Send a message to start communicating with your advocate.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isAdvocate = msg.senderRole === 'advocate';
                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${isAdvocate ? 'items-start' : 'items-end'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-1 px-1 font-medium">
                          {isAdvocate ? (activeChatRequest.advocateName || 'Advocate') : 'You'}
                        </span>
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isAdvocate
                              ? 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'bg-[#B88B2A] text-white font-medium shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 px-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-[#1E293B]">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to the advocate..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {requestToCancel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel Consultation?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                Are you sure you want to cancel your consultation request with {requestToCancel.advocateName}?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setRequestToCancel(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Keep Request
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
