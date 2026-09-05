import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Key, ArrowLeft, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import axios from 'axios';
import { API, apis, AppRoute } from '../types';
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
import ThemeToggle from '../Components/ThemeToggle';
import DeviceLimitModal from '../Components/DeviceLimitModal';
import UWOLoginModal from '../Components/UWOLoginModal';

import loginBg from './login_bg.gif';

const getDeviceId = () => {
  let id = localStorage.getItem('aisa_device_id');
  if (!id) {
    id = 'web_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('aisa_device_id', id);
  }
  return id;
};

const INDIAN_EMAILS = [
  'aditi.sharma@gmail.com',
  'rahul.verma@gmail.com',
  'amit.patel@gmail.com',
  'priya.singh@gmail.com',
  'vikram.malhotra@gmail.com'
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const setUserRecoil = useSetRecoilState(userDataAtom);

  const [emailPlaceholder] = useState(() => {
    const randomEmail = INDIAN_EMAILS[Math.floor(Math.random() * INDIAN_EMAILS.length)];
    return `e.g. ${randomEmail}`;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [socialVerifying, setSocialVerifying] = useState(null);
  const [showUwoModal, setShowUwoModal] = useState(false);

  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const [deviceLimitSessions, setDeviceLimitSessions] = useState(null);
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);

  const triggerError = (errObj) => {
    if (errObj?.response?.data?.code === 'DEVICE_LIMIT_REACHED') {
      setDeviceLimitSessions(errObj.response.data.activeSessions || []);
      setShowDeviceLimitModal(true);
      return;
    }
    const details = parseAuthError(errObj, 'login', navigate, (actionType) => {
      if (actionType === 'focusEmail') {
        document.querySelector("input[type='email']")?.focus();
      } else if (actionType === 'focusPassword') {
        document.querySelector("input[type='password']")?.focus();
      }
    });
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  // Auto-accept cookies on login — user has agreed to platform use by signing in
  const autoAcceptCookies = () => {
    if (!localStorage.getItem('aisa_cookie_consent')) {
      localStorage.setItem('aisa_cookie_consent', JSON.stringify({
        accepted: true,
        analytics: true,
        preferences: true,
        functional: true,
        essential: true,
        timestamp: new Date().toISOString()
      }));
    }
  };

  React.useEffect(() => {
    const revokedMsg = sessionStorage.getItem('aisa_revoked_toast');
    if (revokedMsg) {
      toast.error(revokedMsg, { duration: 5000 });
      sessionStorage.removeItem('aisa_revoked_toast');
    }
  }, []);

  // Handle Social Auth Callback from Backend
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isSocialAuth = params.get('social_auth');
    const token = params.get('token');
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('userEmail');
    const provider = params.get('provider');
    const picture = params.get('picture');

    // sso_token is now handled globally in Navigation.Provider.jsx via SSOInterceptor

    if (isSocialAuth && token && userId) {
      toast.success(`Successfully authenticated as ${userName}!`);

      const userData = {
        id: userId,
        name: userName,
        email: userEmail,
        token: token,
        role: "user",
        plan: "Basic",
        provider: provider || "local",
        avatar: picture || ""
      };

      // Real state update & storage
      setUserData(userData);
      setUserRecoil({ user: userData });
      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);
      localStorage.setItem("provider", provider || "local");
      autoAcceptCookies();

      const from = location.state?.from || AppRoute.DASHBOARD;
      navigate(from, { replace: true });
      console.log("[LOGIN] Social auth success, initiating merge...");
      chatStorageService.mergeGuestChats();
    }
  }, [location, navigate, setUserRecoil]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setLoading(false);
      triggerError("incomplete information");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoading(false);
      triggerError("invalid email address");
      return;
    }

    try {
      const payload = { email, password };
      const res = await axios.post(apis.logIn, payload, {
        headers: {
          'x-device-id': getDeviceId(),
          'x-device-name': 'Chrome Web Browser',
          'x-device-platform': 'web'
        }
      });

      toast.success("Welcome Back! You have successfully signed in.", {
        icon: '👋',
        style: {
          borderRadius: '16px',
          background: '#1F2937',
          color: '#FFF',
        }
      });
      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);
      autoAcceptCookies();

      const from = location.state?.from || AppRoute.DASHBOARD;
      navigate(from, { replace: true });
      console.log("[LOGIN] Standard login success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true);

    try {
      // Get user info from Google using the access token
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });

      const { email, name, picture } = userInfoRes.data;

      // Send to our backend
      const res = await axios.post(apis.googleLogin, {
        credential: tokenResponse.access_token,
        email,
        name,
        picture
      });

      toast.success('Logged in with Google!');
      const from = location.state?.from || AppRoute.DASHBOARD;

      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);
      autoAcceptCookies();

      navigate(from, { replace: true });
      console.log("[LOGIN] Google login success, initiating merge...");
      chatStorageService.mergeGuestChats();
    } catch (err) {
      triggerError(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      triggerError('Google login was cancelled or failed');
    },
  });


  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0F19] p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <ThemeToggle />
      </div>

      {/* Centered Login Card */}
      <div className="max-w-md w-full bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800/80 shadow-xl rounded-2xl p-8 sm:p-10 my-auto transition-colors duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src="/logo/logo_transparent.png" 
            alt="AI LEGAL™" 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain -mb-2.5 drop-shadow-sm" 
          />
          <span className="text-lg font-black text-[#111827] dark:text-zinc-100 tracking-wider uppercase mb-1">AI LEGAL™</span>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-zinc-100 tracking-tight mb-1">Welcome Back</h1>
          <p className="text-sm text-[#6B7280] dark:text-zinc-400">Enter credentials to access your secure workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200">Password</label>
              <Link to="/forgot-password" className="text-sm font-bold text-[#B8860B] dark:text-[#D4AF37] hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              "Sign In"
            )}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-zinc-800" />
          <span className="text-xs text-[#6B7280] dark:text-zinc-400 font-medium uppercase tracking-wider">or continue with</span>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-zinc-800" />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* UWO SSO Button */}
          <button
            type="button"
            onClick={() => setShowUwoModal(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#C5A059]/10 border border-[#C5A059]/30 hover:bg-[#C5A059]/20 rounded-xl font-bold text-[#D4AF37] transition-all shadow-sm text-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-[#D4AF37]" />
            <span>UWO SSO</span>
          </button>

          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={googleLoading}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 hover:bg-[#F9FAFB] dark:hover:bg-zinc-800/60 rounded-xl font-medium text-[#111827] dark:text-zinc-100 transition-all shadow-sm disabled:opacity-50 text-xs cursor-pointer"
          >
            {googleLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-[#E5E7EB] border-t-[#C5A059] rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Google</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = apis.appleLogin; }}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 hover:bg-[#F9FAFB] dark:hover:bg-zinc-800/60 rounded-xl font-medium text-[#111827] dark:text-zinc-100 transition-all shadow-sm text-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current text-black dark:text-white" viewBox="0 0 170 170">
              <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-[#6B7280] dark:text-zinc-400">
          Don't have an account? <Link to="/signup" className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline transition-colors">Create Account</Link>
        </div>

        <div className="mt-4 text-center text-xs text-[#9CA3AF] dark:text-zinc-500">
          By signing in, you agree to our <Link to="/terms-of-service" className="hover:underline text-[#B8860B]">Terms</Link> & <Link to="/privacy-policy" className="hover:underline text-[#B8860B]">Privacy Policy</Link>
        </div>
      </div>

      {/* Social Auth Verifying Overlay */}
      <AnimatePresence>
        {socialVerifying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FFFFFF]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#6D5DFC] rounded-full animate-spin mb-4" />
              <p className="text-[#111827] font-medium">Verifying Secure Login...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthErrorDialog
        visible={showErrorDialog}
        details={errorDetails}
        onClose={() => setShowErrorDialog(false)}
      />

      <DeviceLimitModal
        visible={showDeviceLimitModal}
        activeSessions={deviceLimitSessions}
        email={email}
        password={password}
        onClose={() => setShowDeviceLimitModal(false)}
        onSessionRevokedSuccess={() => {
          setShowDeviceLimitModal(false);
          const fakeEvent = { preventDefault: () => {} };
          handleSubmit(fakeEvent);
        }}
      />

      {/* UWO Central SSO Modal */}
      <UWOLoginModal
        isOpen={showUwoModal}
        onClose={() => setShowUwoModal(false)}
        appCode="ailegal"
        apiKey="key_ailegal_live_master_2026"
        onSuccess={(data) => {
          toast.success('Authenticated with UWO Platform!');
          const uUser = data.user || {};
          const formattedUser = {
            id: uUser.id || uUser._id,
            _id: uUser.id || uUser._id,
            name: uUser.name || uUser.email?.split('@')[0] || 'User',
            email: uUser.email,
            role: uUser.role || 'user',
            plan: uUser.plan || 'Basic',
            avatar: uUser.avatar || null,
            token: data.token || data.access_token,
          };
          setUserData(formattedUser);
          setUserRecoil(formattedUser);
          localStorage.setItem('token', formattedUser.token);
          localStorage.setItem('user', JSON.stringify(formattedUser));
          autoAcceptCookies();
          const from = location.state?.from || AppRoute.DASHBOARD;
          navigate(from, { replace: true });
        }}
      />
    </div>
  );
};

export default Login;
