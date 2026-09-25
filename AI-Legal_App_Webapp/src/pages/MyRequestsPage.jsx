import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Calendar, Clock, CheckCircle2, AlertCircle, 
  X, Send, RefreshCw, ChevronRight, Phone, Video, 
  Users, Trash2, ShieldCheck, ArrowRight, User, CreditCard, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { userData } from '../userStore/userData';
import consultationService from '../services/consultationService';
import { getConsultationSlotStatus } from '../utils/consultationExpiry';

const FILTER_TABS = ['All', 'Pending', 'Accepted', 'Scheduled', 'Completed', 'Cancelled', 'Expired'];

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const currentUserData = useRecoilValue(userData);
  const user = currentUserData?.user || {};

  const [activeFilter, setActiveFilter] = useState('All');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState({});

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

  // Payment Confirmation Modal State
  const [requestToPay, setRequestToPay] = useState(null);
  const [paying, setPaying] = useState(false);

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await consultationService.getMyRequests(activeFilter);
      if (res && res.requests) {
        setRequests(res.requests);
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

  // Join Video / Audio Consultation Call
  const handleJoinCall = (request) => {
    if (!request) return;
    const reqSlotStatus = getConsultationSlotStatus(request.scheduledDate, request.scheduledTimeSlot);
    if (reqSlotStatus.isUpcoming) {
      toast(reqSlotStatus.message, { icon: '⏰', duration: 4500 });
      return;
    }
    if (reqSlotStatus.isExpired || ['completed', 'cancelled', 'rejected', 'expired'].includes((request.status || '').toLowerCase())) {
      toast.error('The scheduled consultation time has ended. The call room is no longer accessible.');
      return;
    }
    if (request.paymentStatus !== 'paid') {
      toast.error('Payment of consultation fee is required before joining call room.');
      setRequestToPay(request);
      return;
    }

    // Launch Jitsi Meet call in secure new window
    const cleanId = (request._id || request.id || 'room').replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'SecureCall';
    const roomName = `AILegal_${cleanId}`;
    const isAudioOnly = (request.consultationType || '').toLowerCase() === 'audio';
    const myName = user?.fullName || user?.name || 'Client';
    const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(myName)}"&config.startWithVideoMuted=${isAudioOnly ? 'true' : 'false'}&config.startWithAudioMuted=false&config.prejoinPageEnabled=false`;
    
    window.open(jitsiUrl, '_blank', 'width=1000,height=700,status=no,menubar=no,toolbar=no');
    toast.success(`Opening ${request.consultationType === 'audio' ? 'Audio Call' : 'Video Consultation'} room...`, { icon: '📞' });
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatRequest || sendingMessage) return;

    const chatSlotStatus = getConsultationSlotStatus(activeChatRequest.scheduledDate, activeChatRequest.scheduledTimeSlot);
    if (chatSlotStatus.isUpcoming) {
      toast.error(chatSlotStatus.message, { icon: '⏰' });
      return;
    }
    if (chatSlotStatus.isExpired || ['completed', 'cancelled', 'rejected', 'expired'].includes((activeChatRequest.status || '').toLowerCase())) {
      toast.error('This consultation slot has ended. Messaging is closed.');
      return;
    }

    if (activeChatRequest.paymentStatus !== 'paid') {
      toast.error('Payment of consultation fee is required before sending messages.');
      return;
    }

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
      toast.error(err?.response?.data?.message || 'Failed to send message.');
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

  // Pay Request Fee
  const handleConfirmPay = async () => {
    if (!requestToPay) return;
    const reqId = requestToPay._id || requestToPay.id;

    try {
      setPaying(true);

      // 1. Create Razorpay order from backend
      const orderData = await consultationService.createRazorpayOrder(reqId);

      if (!orderData || !orderData.order) {
        throw new Error('Failed to create payment order.');
      }

      // 2. Open Razorpay modal if checkout script is ready
      if (typeof window.Razorpay === 'function') {
        const options = {
          key: orderData.key,
          amount: orderData.order.amount,
          currency: orderData.order.currency || 'INR',
          name: 'AI Legal',
          description: `Consultation Fee with Adv. ${requestToPay.advocateName}`,
          order_id: orderData.order.id,
          prefill: {
            name: requestToPay.userName || '',
            email: requestToPay.userEmail || '',
          },
          theme: {
            color: '#10B981',
          },
          handler: async function (response) {
            try {
              const res = await consultationService.payConsultation(reqId, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              if (res && res.success) {
                toast.success('Consultation fee paid successfully! Chat and calls are unlocked.');
                setRequestToPay(null);
                if (activeChatRequest && (activeChatRequest._id === reqId || activeChatRequest.id === reqId)) {
                  setActiveChatRequest((prev) => ({ ...prev, paymentStatus: 'paid' }));
                }
                fetchRequests();
              } else {
                toast.error(res?.message || 'Payment could not be confirmed.');
              }
            } catch (vErr) {
              toast.error(vErr?.response?.data?.message || 'Payment confirmation error.');
            } finally {
              setPaying(false);
            }
          },
          modal: {
            ondismiss: function () {
              setPaying(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          toast.error(response.error?.description || 'Payment failed.');
          setPaying(false);
        });
        rzp.open();
      } else {
        // Fallback: Open web-checkout URL in new window
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        window.open(`/api/consultations/web-checkout?requestId=${reqId}&token=${token}`, '_blank');
        toast('Opening Razorpay checkout window...', { icon: '💳' });
        setRequestToPay(null);
        setPaying(false);
      }
    } catch (err) {
      console.error('[MyRequestsPage] Pay error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to initialize payment.');
      setPaying(false);
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
      case 'expired':
        return { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', label: 'Expired' };
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl w-full">
          {requests.map((item) => {
            const reqId = item._id || item.id;
            const advocateName = item.advocateName || (typeof item.advocateId === 'object' ? item.advocateId?.fullName || item.advocateId?.name : 'Advocate');
            const statusCfg = getStatusBadge(item.status);
            const dateStr = item.scheduledDate
              ? new Date(item.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Pending Confirmation';
            const slotStatus = getConsultationSlotStatus(item.scheduledDate, item.scheduledTimeSlot);
            const isExpired = (item.status || '').toLowerCase() === 'expired' || slotStatus.isExpired;
            const isLive = slotStatus.isLive;
            const isUpcoming = slotStatus.isUpcoming && ['accepted', 'scheduled'].includes((item.status || '').toLowerCase());
            const isCanBeCancelled = ['pending', 'accepted'].includes((item.status || '').toLowerCase()) && !isExpired;
            const isFree = item.fee === 0;
            const isPaid = item.paymentStatus === 'paid' || isFree;
            const isAwaitingPayment = !isExpired && ['accepted', 'scheduled'].includes((item.status || '').toLowerCase()) && !isPaid && !isFree;
            const isCallMode = (item.consultationType || '').toLowerCase() === 'video' || (item.consultationType || '').toLowerCase() === 'audio';

            return (
              <motion.div
                key={reqId}
                whileHover={{ y: -3 }}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#B88B2A]/40 transition-all flex flex-col justify-between w-full min-w-0 overflow-hidden box-border"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-400 truncate">
                        {item.requestId || 'REQ'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">
                        • {item.consultationType ? `${item.consultationType}` : 'Consult'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAwaitingPayment ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-[#B88B2A]/15 text-[#B88B2A] border-[#B88B2A]/30">
                          Payment Required
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Advocate Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#B88B2A]/15 border border-[#B88B2A]/30 flex items-center justify-center font-bold text-sm text-[#B88B2A] overflow-hidden shrink-0">
                      {item.advocateAvatar && item.advocateAvatar.startsWith('http') && !avatarErrors[reqId] ? (
                        <img
                          src={item.advocateAvatar}
                          alt=""
                          onError={() => setAvatarErrors(prev => ({ ...prev, [reqId]: true }))}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        advocateName.charAt(0).toUpperCase()
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
                  <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/80 space-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-slate-400 font-medium">Date</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#B88B2A] shrink-0" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[10.5px] text-slate-400 font-medium">Time Slot</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#B88B2A] shrink-0" />
                        <span>{item.scheduledTimeSlot || 'To be scheduled'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Legal Issue Summary */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Query Summary
                    </span>
                    <p className="line-clamp-2 leading-relaxed break-words">
                      {item.legalIssueSummary || 'No summary provided.'}
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Fee:</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {isFree ? '₹0 (Free)' : `₹${item.fee !== undefined ? item.fee : 1500}`}
                      </span>
                      {isPaid && (
                        <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${isFree ? 'text-[#B88B2A] bg-amber-500/10' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}`}>
                          {isFree ? 'FREE' : 'PAID'}
                        </span>
                      )}
                    </div>

                    {isCanBeCancelled && (
                      <button
                        onClick={() => setRequestToCancel(item)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {isAwaitingPayment ? (
                    <button
                      onClick={() => setRequestToPay(item)}
                      className="w-full py-2 px-3 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-w-0 overflow-hidden"
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Pay ₹{item.fee !== undefined ? item.fee : 1500} to Unlock</span>
                    </button>
                  ) : (
                    (() => {
                      const hasCallBtn = isCallMode && !isExpired && (item.status === 'accepted' || item.status === 'scheduled');
                      return (
                        <div className={`grid ${hasCallBtn ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full min-w-0`}>
                          {hasCallBtn && (
                            <button
                              onClick={() => handleJoinCall(item)}
                              title={
                                isUpcoming
                                  ? `Starts at ${item.scheduledTimeSlot || 'scheduled slot'}`
                                  : item.consultationType === 'video'
                                  ? 'Join Video Call'
                                  : 'Join Audio Call'
                              }
                              className={`w-full min-w-0 py-2 px-2 sm:px-2.5 rounded-xl font-bold text-[11px] sm:text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 overflow-hidden ${
                                isLive
                                  ? (item.consultationType === 'video' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-[#B88B2A] hover:bg-[#A37722] text-white')
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isUpcoming ? (
                                <Clock className="w-3.5 h-3.5 text-[#B88B2A] shrink-0" />
                              ) : item.consultationType === 'video' ? (
                                <Video className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="truncate">
                                {isUpcoming
                                  ? `Starts ${item.scheduledTimeSlot?.split('-')[0]?.trim() || 'soon'}`
                                  : item.consultationType === 'video'
                                  ? 'Join Video'
                                  : 'Audio Call'}
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => setActiveChatRequest(item)}
                            title={isExpired ? 'View Chat History' : isUpcoming ? 'Chat (Opens at slot)' : 'Chat with Advocate'}
                            className="w-full min-w-0 py-2 px-2 sm:px-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-[11px] sm:text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 overflow-hidden"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {hasCallBtn
                                ? (isExpired ? 'View Chat' : isUpcoming ? 'Chat' : 'Chat')
                                : (isExpired ? 'View Chat History' : isUpcoming ? 'Chat (Scheduled)' : 'Chat with Advocate')}
                            </span>
                          </button>
                        </div>
                      );
                    })()
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Live Chat Modal */}
      <AnimatePresence>
        {activeChatRequest && (() => {
          const activeChatSlotStatus = getConsultationSlotStatus(activeChatRequest.scheduledDate, activeChatRequest.scheduledTimeSlot);
          const isSlotExpired = activeChatSlotStatus.isExpired || ['completed', 'cancelled', 'rejected', 'expired'].includes((activeChatRequest.status || '').toLowerCase());
          const isSlotUpcoming = activeChatSlotStatus.isUpcoming && !isSlotExpired;

          return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl h-[88vh] max-h-[850px] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white"
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

                <div className="flex items-center gap-2">
                  {(activeChatRequest.consultationType === 'video' || activeChatRequest.consultationType === 'audio') && (
                    <button
                      onClick={() => handleJoinCall(activeChatRequest)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeChatSlotStatus.isLive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSlotUpcoming ? (
                        <Clock className="w-3.5 h-3.5 text-[#B88B2A]" />
                      ) : activeChatRequest.consultationType === 'video' ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <Phone className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSlotUpcoming
                          ? `Starts ${activeChatRequest.scheduledTimeSlot?.split('-')[0]?.trim() || 'at slot'}`
                          : activeChatRequest.consultationType === 'video'
                          ? 'Join Video'
                          : 'Audio Call'}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveChatRequest(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Slot Timing Warning in Chat */}
              {isSlotUpcoming && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{activeChatSlotStatus.message}</span>
                </div>
              )}

              {isSlotExpired && (
                <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>This consultation slot has ended. Calling and messaging are closed.</span>
                </div>
              )}

              {/* Payment Warning in Chat */}
              {!isSlotExpired && activeChatRequest.paymentStatus !== 'paid' && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Consultation fee (₹{activeChatRequest.fee || 1500}) is required to message and call.</span>
                  </div>
                  <button
                    onClick={() => setRequestToPay(activeChatRequest)}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                  >
                    Pay ₹{activeChatRequest.fee || 1500}
                  </button>
                </div>
              )}

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
                    const isAdvocate = (msg.senderRole || '').toLowerCase() === 'advocate';
                    const currentRole = (user?.role || '').toLowerCase();
                    const isSelf = msg.senderId && (user?._id || user?.id)
                      ? String(msg.senderId) === String(user?._id || user?.id)
                      : currentRole === 'advocate' ? isAdvocate : !isAdvocate;
                    const senderLabel = isSelf ? 'You' : msg.senderName || (isAdvocate ? (activeChatRequest.advocateName || 'Advocate') : (activeChatRequest.userName || 'Client'));
                    const msgContent = msg.message || msg.text || msg.content || (typeof msg === 'string' ? msg : '');

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10.5px] text-slate-400 mb-1 px-1 font-semibold">
                          {senderLabel}
                        </span>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isSelf
                              ? 'bg-[#B88B2A] text-white font-medium shadow-sm rounded-br-xs'
                              : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msgContent}</p>
                        </div>
                        <span className="text-[9.5px] text-slate-400 mt-1 px-1">
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
                  placeholder={
                    isSlotExpired
                      ? 'This consultation slot has ended. Messaging is closed.'
                      : isSlotUpcoming
                      ? `Chat opens 10 mins before slot (${activeChatRequest.scheduledTimeSlot || 'slot'})`
                      : activeChatRequest.paymentStatus !== 'paid'
                      ? `Complete payment (₹${activeChatRequest.fee || 1500}) to send messages...`
                      : 'Type a message to the advocate...'
                  }
                  disabled={
                    sendingMessage ||
                    isSlotExpired ||
                    isSlotUpcoming ||
                    activeChatRequest.paymentStatus !== 'paid'
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={
                    !newMessage.trim() ||
                    sendingMessage ||
                    isSlotExpired ||
                    isSlotUpcoming ||
                    activeChatRequest.paymentStatus !== 'paid'
                  }
                  className="p-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
          );
        })()}
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

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {requestToPay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Consultation Fee Payment
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Req ID: {requestToPay.requestId || 'REQ'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRequestToPay(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Advocate</span>
                  <span className="font-bold text-slate-900 dark:text-white">{requestToPay.advocateName || 'Advocate'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Mode</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{requestToPay.consultationType || 'Consultation'}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm">
                  <span className="font-bold text-slate-900 dark:text-white">Total Amount</span>
                  <span className="font-black text-[#B88B2A] text-base">₹{requestToPay.fee || 1500}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant confirmation • Video/Audio call and chat unlock immediately.</span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setRequestToPay(null)}
                  disabled={paying}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPay}
                  disabled={paying}
                  className="px-5 py-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {paying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay ₹{requestToPay.fee || 1500} Now</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
