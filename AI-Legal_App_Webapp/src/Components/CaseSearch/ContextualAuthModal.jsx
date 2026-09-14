import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContextualAuthModal({ isOpen, onClose, actionName = 'save this judgment' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    navigate('/login', { state: { returnUrl: window.location.pathname } });
  };

  const handleSignup = () => {
    navigate('/signup', { state: { returnUrl: window.location.pathname } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#C8A34D] flex items-center justify-center border border-[#C8A34D]/30">
            <Lock size={22} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Sign in to Save Research
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Case searching, reading full judgment reports, and AI legal analysis are open to everyone. Sign in to {actionName}, organize precedents into active case briefs, and sync across devices.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-[#C8A34D] hover:bg-[#B38628] text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <LogIn size={14} />
            <span>Sign In to AI LEGAL™</span>
            <ArrowRight size={13} />
          </button>

          <button
            onClick={handleSignup}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Create Free Account</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Enterprise 256-bit encryption & privileged confidentiality</span>
        </div>
      </motion.div>
    </div>
  );
}
