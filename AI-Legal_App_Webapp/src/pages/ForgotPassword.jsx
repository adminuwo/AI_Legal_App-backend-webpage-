import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Loader, Key, CheckCircle, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { AppRoute, apis } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { logo } from '../constants';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';

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
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#FFFFFF]">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-[45%] bg-[#F9FAFB] border-r border-[#E5E7EB] flex-col items-center justify-center p-12">
        <div className="max-w-md text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-[#6D5DFC] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-[#111827] mb-4">AI LEGAL™</h2>
          <p className="text-[#6B7280] text-base leading-relaxed">The premium Legal Operating System designed exclusively for modern Advocates. Automate research, drafting, and analysis.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-12 relative overflow-y-auto custom-scrollbar">
        <Link to="/login" className="absolute top-8 right-8 text-sm font-medium text-[#6B7280] hover:text-[#111827] flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        
        <div className="max-w-sm w-full mx-auto mt-8 md:mt-0">
          <div className="mb-10 text-center md:text-left">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6 shadow-sm border ${step === 1 ? 'bg-[#6D5DFC] border-[#6D5DFC]' : 'bg-[#4F8CFF] border-[#4F8CFF]'}`}>
              {step === 1 ? <ShieldCheck className="w-6 h-6 text-white" /> : <Key className="w-6 h-6 text-white" />}
            </div>
            <h1 className="text-3xl font-bold text-[#111827] tracking-tight mb-2">
              {step === 1 ? 'Reset Password' : 'Verify & Reset'}
            </h1>
            <p className="text-[#6B7280]">
              {step === 1 ? "Enter your email to receive a verification code." : "Enter the verification code sent to your email."}
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
                className="space-y-5"
                autoComplete="off"
              >
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={emailPlaceholder}
                      className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl py-3 pl-12 pr-4 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                className="space-y-5"
                autoComplete="off"
              >
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5 text-center md:text-left">Verification Code</label>
                  <input
                    type="text"
                    name="otp"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-2xl tracking-[0.5em] py-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF] transition-all text-[#111827] font-bold placeholder-[#D1D5DB]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">New Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl py-3 pl-12 pr-12 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#4F8CFF] hover:bg-[#3b78eb] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><span>Reset Password</span> <CheckCircle className="w-4 h-4" /></>
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
                  >
                    Wrong email? Go back
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
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
