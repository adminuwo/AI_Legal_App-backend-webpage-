import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Key, User, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AppRoute, apis } from '../types';
import axios from 'axios';
import { setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { logo } from '../constants';
import { chatStorageService } from '../services/chatStorageService';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';

const INDIAN_EXAMPLES = [
  { name: 'Aditi Sharma', email: 'aditi.sharma@gmail.com' },
  { name: 'Rahul Verma', email: 'rahul.verma@gmail.com' },
  { name: 'Amit Patel', email: 'amit.patel@gmail.com' },
  { name: 'Priya Singh', email: 'priya.singh@gmail.com' },
  { name: 'Vikram Malhotra', email: 'vikram.malhotra@gmail.com' }
];

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const setUserRecoil = useSetRecoilState(userDataAtom);

  const [placeholderExample] = useState(() => {
    return INDIAN_EXAMPLES[Math.floor(Math.random() * INDIAN_EXAMPLES.length)];
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const triggerError = (errObj) => {
    const details = parseAuthError(errObj, 'signup', navigate, (actionType) => {
      if (actionType === 'focusEmail') {
        document.querySelector("input[name='email']")?.focus();
      } else if (actionType === 'focusPassword') {
        document.querySelector("input[name='password']")?.focus();
      } else if (actionType === 'focusName') {
        document.querySelector("input[name='name']")?.focus();
      }
    });
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setIsLoading(false);
      triggerError("incomplete information");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setIsLoading(false);
      triggerError("invalid email address");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setIsLoading(false);
      triggerError("weak password");
      return;
    }

    try {
      const payLoad = { name, email, password };
      const res = await axios.post(apis.signUp, payLoad);

      toast.success("Welcome to AI Legal™! Your account has been created successfully.", {
        icon: '⚖️',
        style: {
          borderRadius: '16px',
          background: '#1F2937',
          color: '#FFF',
        }
      });
      setUserData(res.data);
      setUserRecoil({ user: res.data });

      navigate(AppRoute.E_Verification, { state: location.state });
      console.log("[SIGNUP] Standard signup success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      triggerError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    console.log('[Google Signup] Success callback received:', tokenResponse);
    setGoogleLoading(true);
    setError(null);
    setPasswordError(null);

    try {
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });

      console.log('[Google Signup] User info:', userInfoRes.data);
      const { email, name, picture } = userInfoRes.data;

      const res = await axios.post(apis.googleLogin, {
        credential: tokenResponse.access_token,
        email,
        name,
        picture
      });

      console.log('[Google Signup] Backend response:', res.data);
      toast.success('Signed up with Google!');
      const from = location.state?.from || AppRoute.DASHBOARD;

      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);

      navigate(from, { replace: true });
      console.log("[SIGNUP] Google signup success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      console.error('[Google Signup] Error:', err);
      triggerError(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.error('[Google Signup] Google OAuth Error:', err);
      triggerError('Google signup was cancelled or failed');
    },
  });

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
        <Link to="/" className="absolute top-8 right-8 text-sm font-medium text-[#6B7280] hover:text-[#111827] flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="max-w-sm w-full mx-auto mt-8 md:mt-0">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-bold text-[#111827] tracking-tight mb-2">Create Account</h1>
            <p className="text-[#6B7280]">Join the premium network for modern advocates.</p>
          </div>

          {/* Error messages are handled by AuthErrorDialog modal */}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g. ${placeholderExample.name}`}
                  className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl py-3 pl-12 pr-4 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. ${placeholderExample.email}`}
                  className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl py-3 pl-12 pr-4 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl py-3 pl-12 pr-12 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all"
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

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms-agree"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#6D5DFC] rounded border-[#E5E7EB] cursor-pointer shrink-0"
              />
              <label htmlFor="terms-agree" className="text-xs text-[#6B7280] leading-relaxed cursor-pointer select-none">
                I agree to the{' '}
                <Link to="/terms" className="text-[#6D5DFC] hover:underline font-medium">Terms of Service</Link>,{' '}
                <Link to="/privacy-policy" className="text-[#6D5DFC] hover:underline font-medium">Privacy Policy</Link>, and{' '}
                <Link to="/cookie-policy" className="text-[#6D5DFC] hover:underline font-medium">Cookie Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full py-3.5 bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className={`transition-opacity ${!agreedToTerms ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-sm text-[#6B7280] font-medium">or continue with</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={googleLoading}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#FFFFFF] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-xl font-medium text-[#111827] transition-all shadow-sm disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#E5E7EB] border-t-[#6D5DFC] rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                    Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = apis.appleLogin; }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#FFFFFF] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-xl font-medium text-[#111827] transition-all shadow-sm"
              >
                <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 170 170">
                  <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
                </svg>
                Apple
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-[#6B7280]">
            Already have an account? <Link to="/login" className="text-[#6D5DFC] font-semibold hover:text-[#5b4be8] transition-colors">Sign In</Link>
          </div>
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

export default Signup;
