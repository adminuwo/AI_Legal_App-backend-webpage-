import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Monitor, Tablet, Laptop, LogOut, X, ShieldAlert, Clock, Loader, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
  return `${Math.floor(diffSecs / 86400)} days ago`;
};

const getDeviceIcon = (platform, deviceType) => {
  const p = (platform || deviceType || '').toLowerCase();
  if (p.includes('mobile') || p.includes('phone') || p.includes('android') || p.includes('ios') || p.includes('iphone')) {
    return Smartphone;
  }
  if (p.includes('tablet') || p.includes('ipad')) {
    return Tablet;
  }
  if (p.includes('mac') || p.includes('laptop') || p.includes('windows') || p.includes('linux')) {
    return Laptop;
  }
  return Monitor;
};

export default function DeviceLimitModal({ visible, activeSessions = [], email, password, onClose, onSessionRevokedSuccess }) {
  const [revokingId, setRevokingId] = useState(null);
  const [confirmSession, setConfirmSession] = useState(null);

  if (!visible) return null;

  const handleRevoke = async (sessionToRevoke) => {
    setRevokingId(sessionToRevoke.sessionId || sessionToRevoke._id);
    try {
      const baseUrl = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8080/api' : (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8080/api'));

      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr)?.token : null;
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.post(`${baseUrl}/security/logout-session`, {
        sessionId: sessionToRevoke.sessionId || sessionToRevoke._id,
        email,
        password
      }, { headers });

      toast.success(`Logged out ${sessionToRevoke.deviceName || 'device'} successfully.`);
      setConfirmSession(null);
      
      if (onSessionRevokedSuccess) {
        onSessionRevokedSuccess();
      }
    } catch (err) {
      console.error('[DEVICE LIMIT] Failed to revoke session:', err);
      toast.error(err.response?.data?.error || 'Failed to logout device. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B0F19]/70 backdrop-blur-md"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden z-10 flex flex-col transition-colors duration-300"
        >
          {/* Close button in corner */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 rounded-xl text-[#9CA3AF] hover:text-[#111827] dark:hover:text-zinc-100 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#B8860B] dark:text-[#D4AF37] mb-4 shadow-sm">
              <ShieldAlert className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h2 className="text-2xl font-black text-[#111827] dark:text-zinc-100 uppercase tracking-tight mb-2">
              DEVICE LIMIT REACHED
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-zinc-400 max-w-md leading-relaxed font-normal">
              This account is already active on <span className="font-bold text-[#111827] dark:text-zinc-200">3 devices</span>. To continue on this device, log out from one of your active devices below.
            </p>
          </div>

          {/* Active Devices List */}
          <div className="space-y-3 mb-6 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
            <div className="text-xs font-bold text-[#6B7280] dark:text-zinc-500 uppercase tracking-wider px-1">
              ACTIVE SESSIONS ({activeSessions.length}/3)
            </div>

            {activeSessions.map((session, idx) => {
              const Icon = getDeviceIcon(session.platform, session.deviceType);
              const sId = session.sessionId || session._id || idx;
              const isRevoking = revokingId === sId;

              return (
                <div
                  key={sId}
                  className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800/80 rounded-2xl hover:border-[#C5A059]/40 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#1E1F30] border border-[#E5E7EB] dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-[#B8860B] dark:text-[#D4AF37] shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#111827] dark:text-zinc-100 truncate">
                          {session.deviceName || `${session.operatingSystem || 'Unknown OS'} Device`}
                        </p>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#C5A059]/20 text-[#B8860B] dark:text-[#D4AF37] rounded-md uppercase">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] dark:text-zinc-400 truncate mt-0.5">
                        {session.operatingSystem || session.os || 'OS'} • {session.browser || 'Browser'}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] dark:text-zinc-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Last active: {formatTimeAgo(session.lastActiveAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={() => setConfirmSession(session)}
                    className="ml-3 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isRevoking ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Confirmation Alert Sub-Modal */}
          <AnimatePresence>
            {confirmSession && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-left"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase">
                      Sign Out Device?
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      This will immediately invalidate the session on <span className="font-bold">{confirmSession.deviceName}</span>.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleRevoke(confirmSession)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Yes, Sign Out
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSession(null)}
                        className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Action */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-[#E5E7EB] dark:hover:bg-zinc-700 text-[#374151] dark:text-zinc-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
