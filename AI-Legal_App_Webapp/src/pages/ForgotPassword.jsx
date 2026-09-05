import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Key, CheckCircle, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { AppRoute, apis } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';
import ThemeToggle from '../Components/ThemeToggle';

const INDIAN_EMAILS = [
  'aditi.sharma@gmail.com',
  'rahul.verma@gmail.com',
  'amit.patel@gmail.com',
  'priya.singh@gmail.com',
  'vikram.malhotra@gmail.com'
];

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [emailPlaceholder] = useState(() => {
        const randomEmail = INDIAN_EMAILS[Math.floor(Math.random() * INDIAN_EMAILS.length)];
        return `e.g. ${randomEmail}`;
    });

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [errorDetails, setErrorDetails] = useState(null);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const triggerError = (errObj) => {
        const details = parseAuthError(errObj, 'forgot', navigate, (actionType) => {
            if (actionType === 'focusEmail') {
                document.querySelector("input[type='email']")?.focus();
            } else if (actionType === 'focusPassword') {
                document.querySelector("input[type='password']")?.focus();
            }
        });
        setErrorDetails(details);
        setShowErrorDialog(true);
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(apis.forgotPassword, { email });
            toast.success(response.data.message || "OTP sent successfully!");
            setStep(2);
        } catch (err) {
            triggerError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            triggerError("Please enter a valid 6-digit OTP.");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(apis.resetPassword, {
                email,
                otp,
                newPassword
            });
            toast.success(response.data.message || "Password updated successfully!");
            setTimeout(() => {
                navigate(AppRoute.LOGIN);
            }, 2000);
        } catch (err) {
            triggerError(err);
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0F19] p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <ThemeToggle />
        <Link to="/login" className="text-sm font-medium text-[#6B7280] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-zinc-100 flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>

      {/* Centered Card */}
      <div className="max-w-md w-full bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800/80 shadow-xl rounded-2xl p-8 sm:p-10 my-auto transition-colors duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src="/logo/logo_transparent.png" 
            alt="AI LEGAL™" 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain -mb-2.5 drop-shadow-sm" 
          />
          <span className="text-lg font-black text-[#111827] dark:text-zinc-100 tracking-wider uppercase mb-1">AI LEGAL™</span>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-zinc-100 tracking-tight mb-1">
            {step === 1 ? 'Reset Password' : 'Verify & Reset'}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-zinc-400">
            {step === 1 ? "Enter your email to receive a verification code." : "Enter the 6-digit code sent to your email."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOTP}
              className="space-y-4"
              autoComplete="off"
            >
              <div>
                <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={emailPlaceholder}
                    className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-[#111827] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md mt-2 cursor-pointer uppercase tracking-wider text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#111827]/30 border-t-[#111827] rounded-full animate-spin" />
                ) : (
                  <><span>Send Verification Code</span> <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleResetPassword}
              className="space-y-4"
              autoComplete="off"
            >
              <div>
                <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5 text-center">Verification Code</label>
                <input
                  type="text"
                  name="otp"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-3xl tracking-[0.4em] py-4 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-[#111827] dark:text-zinc-100 font-bold placeholder-[#D1D5DB] dark:placeholder-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">New Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-12 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-zinc-100"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-[#111827] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md mt-2 cursor-pointer uppercase tracking-wider text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#111827]/30 border-t-[#111827] rounded-full animate-spin" />
                ) : (
                  <><span>Update Password</span> <CheckCircle className="w-4 h-4" /></>
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-bold text-[#B8860B] dark:text-[#D4AF37] hover:underline transition-colors cursor-pointer"
                >
                  Wrong email? Go back
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <AuthErrorDialog
        visible={showErrorDialog}
        details={errorDetails}
        onClose={() => setShowErrorDialog(false)}
      />
    </div>
  );
};

export default ForgotPassword;
