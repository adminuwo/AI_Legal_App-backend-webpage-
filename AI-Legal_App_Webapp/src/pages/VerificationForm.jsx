import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Pencil, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { AppRoute, apis } from '../types';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';
import ThemeToggle from '../Components/ThemeToggle';
import { getUserData, setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { chatStorageService } from '../services/chatStorageService';

export default function VerificationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const setUserRecoil = useSetRecoilState(userDataAtom);

  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Derive target email safely without kicking user out prematurely
  const user = getUserData();
  const email = location.state?.email || user?.email || localStorage.getItem('pendingVerificationEmail') || "";

  useEffect(() => {
    if (!email) {
      toast.error("User session not found. Please sign up again.");
      navigate(AppRoute.SIGNUP);
    }
  }, [email, navigate]);

  const triggerError = (errObj) => {
    const details = parseAuthError(errObj, 'verification', navigate, (actionType) => {
      if (actionType === 'focusCode') {
        document.querySelector("input[name='otp']")?.focus();
      }
    });
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      triggerError("Please enter a 6-digit code.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(apis.emailVerificationApi, { code: verificationCode, email });
      localStorage.removeItem('pendingVerificationEmail');
      
      // Store token and userId so isAuthenticated() passes cleanly for protected dashboard
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      if (res.data?.id || res.data?._id) {
        localStorage.setItem('userId', res.data.id || res.data._id);
      }

      const finalData = setUserData(res.data);
      setUserRecoil({ user: finalData });
      chatStorageService.mergeGuestChats();

      toast.success("Welcome to AI Legal™! Your account has been verified successfully.", {
        icon: '⚖️',
        style: {
          borderRadius: '16px',
          background: '#1F2937',
          color: '#FFF',
        }
      });

      const destination = location.state?.from || AppRoute.DASHBOARD;
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Verification Error:", err);
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError("");

    try {
      await axios.post(apis.resendCode, { email });
      toast.success("Verification code resent successfully!");
    } catch (err) {
      console.error("Resend Error:", err);
      triggerError(err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0F19] p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <ThemeToggle />
      </div>

      {/* Centered Verification Card */}
      <div className="max-w-md w-full bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800/80 shadow-xl rounded-2xl p-8 sm:p-10 my-auto transition-colors duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src="/logo/logo_transparent.png" 
            alt="AI LEGAL™" 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain -mb-2.5 drop-shadow-sm" 
          />
          <span className="text-lg font-black text-[#111827] dark:text-zinc-100 tracking-wider uppercase mb-1">AI LEGAL™</span>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-zinc-100 tracking-tight mb-1">Verify Your Email</h1>
          <p className="text-sm text-[#6B7280] dark:text-zinc-400">We've sent a 6-digit code to</p>
          
          {email && (
            <div className="flex items-center gap-2 mt-2 bg-[#F9FAFB] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-lg px-3 py-1.5">
              <span className="font-medium text-[#111827] dark:text-zinc-100 text-sm">{email}</span>
              <Link to="/signup" className="text-[#B8860B] dark:text-[#D4AF37] hover:underline transition-colors p-1" title="Change Email">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleVerify} className="space-y-6" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-2 text-center">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              name="otp"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={verificationCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 6) setVerificationCode(val);
              }}
              placeholder="000000"
              className="w-full text-center text-3xl tracking-[0.4em] py-4 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-[#111827] dark:text-zinc-100 font-bold placeholder-[#D1D5DB] dark:placeholder-zinc-600"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full py-3.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-[#111827] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer uppercase tracking-wider text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#111827]/30 border-t-[#111827] rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify & Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#E5E7EB] dark:border-zinc-800 pt-6">
          <p className="text-sm text-[#6B7280] dark:text-zinc-400 mb-2">Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            {resendLoading ? 'Sending...' : 'Request New Code'}
          </button>
        </div>
      </div>

      <AuthErrorDialog
        visible={showErrorDialog}
        details={errorDetails}
        onClose={() => setShowErrorDialog(false)}
      />
    </div>
  );
}