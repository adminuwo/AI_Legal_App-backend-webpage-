import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Mail, Key, ArrowLeft, AlertCircle, Eye, EyeOff, Zap, Plus,
  Shield, Building2, GraduationCap, Scale, Lock, CheckCircle2, Sparkles, Menu, X
} from 'lucide-react';
import axios from 'axios';
import { API, apis, AppRoute } from '../types';
import { setUserData, userData as userDataAtom, selectedRoleState } from '../userStore/userData';
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

const ACCOUNT_TYPES = [
  {
    id: 'advocate',
    label: 'Advocate',
    icon: Shield,
    subtitle: 'Litigation Workspace',
    placeholder: 'Advocate Email / Bar Council ID',
    desc: 'Access court cause lists, drafting engine & precedent research'
  },
  {
    id: 'law_firm',
    label: 'Law Firm',
    icon: Building2,
    subtitle: 'Firm Workspace',
    placeholder: 'Firm Email / Admin ID',
    desc: 'Manage associates, team dockets, permissions & multi-user CRM'
  },
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    subtitle: 'Academic Hub',
    placeholder: 'Student Email / Roll ID',
    desc: 'Practice MCQs, case brief summaries, interactive notes & AI Tutor'
  },
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const setUserRecoil = useSetRecoilState(userDataAtom);
  const setSelectedRole = useSetRecoilState(selectedRoleState);

  // Default account type (advocate, law_firm, student)
  const [accountType, setAccountType] = useState(() => {
    const saved = localStorage.getItem('user_selected_role');
    return (saved === 'student' || saved === 'law_firm') ? saved : 'advocate';
  });

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

  // Apply selected workspace role & dispatch event
  const applySelectedWorkspace = (roleToApply = accountType) => {
    const targetRole = roleToApply === 'firm' || roleToApply === 'law_firm' ? 'law_firm' : roleToApply;
    setSelectedRole(targetRole);
    localStorage.setItem('user_selected_role', targetRole);

    if (targetRole === 'law_firm') {
      const activeWs = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID');
      if (!activeWs) {
        localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', 'firm_default');
      }
    }

    window.dispatchEvent(new CustomEvent('user_role_changed', { 
      detail: { role: targetRole } 
    }));
  };

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
    const roleParam = params.get('role');
    let userRole = roleParam;
    try {
      if ((!userRole || userRole === 'user') && token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.role) userRole = payload.role;
      }
    } catch (e) {}

    if (isSocialAuth && token && userId) {
      toast.success(`Successfully authenticated as ${userName}!`);

      const userData = {
        id: userId,
        name: userName,
        email: userEmail,
        token: token,
        role: userRole || "user",
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

      applySelectedWorkspace();

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

      applySelectedWorkspace();

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
      let email = '';
      let name = '';
      let picture = '';

      // Retrieve user info using native fetch (clean headers, no CORS preflight conflict)
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          email = info.email || '';
          name = info.name || '';
          picture = info.picture || '';
        }
      } catch (fetchErr) {
        console.warn('[Google Login] Client userinfo fetch skipped/failed, backend will resolve server-side:', fetchErr);
      }

      // Send to our backend (backend verifies token and resolves profile server-side)
      const res = await axios.post(apis.googleLogin, {
        credential: tokenResponse.access_token,
        email,
        name,
        picture,
        deviceOS: 'web',
        platform: 'web',
        signupPlatform: 'web'
      });

      toast.success('Logged in with Google!');
      setUserData(res.data);
      setUserRecoil({ user: res.data });
      localStorage.setItem("userId", res.data.id);
      localStorage.setItem("token", res.data.token);
      autoAcceptCookies();

      applySelectedWorkspace();

      const from = location.state?.from || AppRoute.DASHBOARD;
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
    <div className="min-h-screen w-screen flex flex-col bg-[#F4F6FA] dark:bg-[#070A12] text-[#111827] dark:text-slate-100 font-sans selection:bg-[#C8A34D]/25 selection:text-[#111111] transition-colors duration-300">
      {/* Top Header Navigation Tabs — Matching CLAW Reference */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#C8A34D] to-[#B38628] flex items-center justify-center shadow-md shadow-[#C8A34D]/30 p-1">
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#111827] dark:text-white flex items-center">
                AI Legal<span className="text-[10px] text-[#B38628] dark:text-[#C8A34D] font-extrabold ml-0.5">™</span>
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button onClick={() => navigate('/')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={() => navigate('/features')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Features
            </button>
            <button onClick={() => navigate('/blog')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Blog
            </button>
            <button onClick={() => navigate('/pricing')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Pricing
            </button>
            <button onClick={() => navigate('/case-search')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Case Search
            </button>
            <button onClick={() => navigate('/about')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              About
            </button>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#C8A34D]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs">
              Dashboard
            </span>
          </nav>

          {/* Desktop Right Header Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => navigate('/post-judgment')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#C8A34D]/50 bg-amber-50/50 text-[#B38628] hover:bg-amber-100/60 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300 dark:hover:bg-amber-950/70 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} className="text-[#B38628] stroke-[2.5]" />
              <span>Post your judgement</span>
            </button>

            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#C8A34D]/30"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Header Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-[#111625] border-b border-slate-200 dark:border-zinc-800 px-5 py-5 space-y-4 shadow-xl"
            >
              <div className="flex flex-col space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/features'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Features
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/blog'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Blog
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/pricing'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Pricing
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/case-search'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Case Search
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/about'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  About
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2.5">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/post-judgment'); }}
                  className="w-full py-2.5 rounded-full text-xs font-bold border border-[#C8A34D]/50 bg-amber-50/50 text-[#B38628] dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Post your judgement</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                  className="w-full py-2.5 bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 text-white font-bold rounded-full text-center text-xs shadow-md shadow-[#C8A34D]/30"
                >
                  Create New Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Centered Content Area with 2-Column Card */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl w-full bg-white dark:bg-[#111625] border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 my-auto transition-all duration-300">
        
        {/* Left Column: Photorealistic Advocate Aarohi Legal Chamber */}
        <div className="md:col-span-5 relative hidden md:flex flex-col justify-between overflow-hidden min-h-[460px] p-6 lg:p-7 text-white border-r border-slate-200/20 dark:border-zinc-800 select-none">
          
          {/* Full-Cover Background Image */}
          <img 
            src="/images/aarohi_chamber_banner.jpg" 
            alt="Advocate Aarohi - AI Legal Intelligence" 
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle Bottom & Top Gradient for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/25 to-transparent" />
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

          {/* Top Floating Badge */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B0F19]/80 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-amber-300 shadow-xl">
              <Sparkles className="w-3 h-3 text-[#C8A34D]" />
              <span>Advocate Aarohi • AI Legal Intelligence</span>
            </div>
          </div>

          {/* Bottom Branding Tagline & Floating Metrics */}
          <div className="relative z-10 space-y-2.5">
            {/* Quick Feature Pills */}
            <div className="flex flex-wrap gap-1.5">
              <div className="px-2 py-0.5 rounded-lg bg-[#0B0F19]/80 backdrop-blur-md border border-white/15 text-[9.5px] font-bold text-slate-200 flex items-center gap-1 shadow-md">
                <Scale className="w-2.5 h-2.5 text-[#D4AF37]" />
                <span>3.8 Cr+ Cases Grounded</span>
              </div>
              <div className="px-2 py-0.5 rounded-lg bg-[#0B0F19]/80 backdrop-blur-md border border-white/15 text-[9.5px] font-bold text-slate-200 flex items-center gap-1 shadow-md">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span>BNS & BNSS Ready</span>
              </div>
            </div>

            {/* Vertical Accent Label */}
            <div className="border-l-3 border-[#C8A34D] pl-2.5 py-0.5">
              <h3 className="text-sm font-black tracking-wider text-white uppercase drop-shadow-sm">
                AI LEGAL<span className="text-amber-400 text-[9px] ml-0.5 align-super">TM</span> WORKSPACE
              </h3>
              <p className="text-[11px] text-slate-200 font-medium drop-shadow-sm">
                Next-Gen AI Legal Management & Chambers CRM
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card & Role Selector */}
        <div className="md:col-span-7 p-5 sm:p-6 lg:p-7 flex flex-col justify-center bg-white dark:bg-[#111625] transition-colors">
          
          {/* Header Brand Emblem & Greeting */}
          <div className="flex flex-col items-center text-center mb-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C8A34D]/20 via-amber-500/10 to-[#B38628]/20 border border-[#C8A34D]/35 flex items-center justify-center p-1.5 mb-2 shadow-xs">
              <img 
                src="/logo/logo_transparent.png" 
                alt="AI LEGAL™" 
                className="w-full h-full object-contain drop-shadow-xs" 
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[11px] sm:text-xs text-[#B38628] dark:text-[#D4AF37] font-semibold mt-0.5">
              Continue Your Legal Journey
            </p>
          </div>

          {/* ACCOUNT TYPE Selector */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Account Type
              </span>
              <span className="text-[10px] font-semibold text-[#B38628] dark:text-[#D4AF37]">
                {accountType === 'advocate' ? '⚖️ Litigation Practice' : accountType === 'law_firm' ? '🏛️ Law Firm Team' : '🎓 Academic Hub'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              {ACCOUNT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = accountType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAccountType(type.id)}
                    className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#C8A34D] bg-[#C8A34D]/15 text-[#966d1b] dark:text-[#F1C40F] shadow-xs'
                        : 'border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/40'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isSelected ? 'text-[#B38628] dark:text-[#F1C40F]' : 'text-slate-400'}`} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {accountType === 'advocate' 
                  ? 'Advocate Email / Bar Registration' 
                  : accountType === 'law_firm' 
                    ? 'Firm Email / Admin Username' 
                    : 'Student Email / Roll ID'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    accountType === 'advocate' 
                      ? emailPlaceholder 
                      : accountType === 'law_firm' 
                        ? 'e.g. partner@lexchambers.com' 
                        : 'e.g. student@nlu.ac.in'
                  }
                  className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9.5 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] font-bold text-[#B38628] dark:text-[#D4AF37] hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9.5 pr-10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-[#C8A34D] via-[#D4AF37] to-[#B38628] hover:opacity-95 text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-[#C8A34D]/25 mt-1 cursor-pointer uppercase tracking-wider text-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                `Login to ${accountType === 'advocate' ? 'Advocate' : accountType === 'law_firm' ? 'Law Firm' : 'Student'} Workspace`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
          </div>

          {/* SSO Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* UWO SSO Button */}
            <button
              type="button"
              onClick={() => setShowUwoModal(true)}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#C8A34D]/10 border border-[#C8A34D]/35 hover:bg-[#C8A34D]/20 rounded-xl font-bold text-[#B38628] dark:text-[#D4AF37] transition-all shadow-2xs text-[11px] cursor-pointer"
            >
              <Zap className="w-3 h-3 fill-[#D4AF37]" />
              <span>UWO SSO</span>
            </button>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={() => googleLogin()}
              disabled={googleLoading}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl font-medium text-slate-800 dark:text-zinc-100 transition-all shadow-2xs disabled:opacity-50 text-[11px] cursor-pointer"
            >
              {googleLoading ? (
                <div className="w-3 h-3 border-2 border-slate-200 border-t-[#C8A34D] rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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

            {/* Apple OAuth */}
            <button
              type="button"
              onClick={() => { window.location.href = apis.appleLogin; }}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl font-medium text-slate-800 dark:text-zinc-100 transition-all shadow-2xs text-[11px] cursor-pointer"
            >
              <svg className="w-3 h-3 fill-current text-black dark:text-white" viewBox="0 0 170 170">
                <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-3.5 text-center text-xs text-slate-500 dark:text-zinc-400">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="text-[#B38628] dark:text-[#D4AF37] font-bold hover:underline transition-colors ml-1"
            >
              Create Account
            </Link>
          </div>

          {/* Terms and Privacy */}
          <div className="mt-2 text-center text-[10px] text-slate-400 dark:text-zinc-500">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="hover:underline text-[#B38628] dark:text-[#D4AF37]">Terms</Link>
            {' '}&{' '}
            <Link to="/privacy-policy" className="hover:underline text-[#B38628] dark:text-[#D4AF37]">Privacy Policy</Link>
          </div>
        </div>
      </div>
      </main>

      {/* Social Auth Verifying Overlay */}
      <AnimatePresence>
        {socialVerifying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C8A34D] rounded-full animate-spin mb-4" />
              <p className="text-slate-900 dark:text-white font-medium text-sm">Verifying Secure Login...</p>
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
          setUserRecoil({ user: formattedUser });
          localStorage.setItem('token', formattedUser.token);
          localStorage.setItem('user', JSON.stringify(formattedUser));
          autoAcceptCookies();

          applySelectedWorkspace();

          const from = location.state?.from || AppRoute.DASHBOARD;
          navigate(from, { replace: true });
        }}
      />
    </div>
  );
};

export default Login;
