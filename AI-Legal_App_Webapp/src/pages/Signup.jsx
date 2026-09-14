import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Mail, Key, User, ArrowLeft, AlertCircle, Eye, EyeOff, Globe, MapPin, 
  ChevronDown, Phone, Zap, Plus, Sparkles, Scale, CheckCircle2 
} from 'lucide-react';
import { AppRoute, apis } from '../types';
import axios from 'axios';
import { setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useGoogleLogin } from '@react-oauth/google';
import { logo } from '../constants';
import { COUNTRIES } from '../constants/countries';
import { INDIAN_STATES_LIST, STATES_BY_COUNTRY } from '../constants/states';
import { chatStorageService } from '../services/chatStorageService';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';
import ThemeToggle from '../Components/ThemeToggle';
import UWOLoginModal from '../Components/UWOLoginModal';

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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(c => c.code === 'IN') || { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' }
  );
  const [selectedState, setSelectedState] = useState(STATES_BY_COUNTRY['IN']?.[0]?.name || 'Gujarat');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showUwoModal, setShowUwoModal] = useState(false);

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
      } else if (actionType === 'focusPhone') {
        document.querySelector("input[name='phone']")?.focus();
      } else if (actionType === 'focusTerms') {
        const checkbox = document.querySelector("#terms-agree");
        if (checkbox) {
          checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          checkbox.focus();
        }
      }
    });
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  const validate = () => {
    if (!name.trim() || !email.trim() || !localPhone.trim() || !password.trim() || !confirmPassword.trim()) {
      triggerError('Please complete all required fields before creating your account.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      triggerError('Please enter a valid email address.');
      return false;
    }

    const code = selectedCountry.code;
    if (code === 'IN' || code === 'US' || code === 'CA') {
      if (localPhone.length !== 10) {
        triggerError('Phone number must be exactly 10 digits.');
        return false;
      }
    } else {
      if (localPhone.length < 6 || localPhone.length > 14) {
        triggerError(`Phone number for ${selectedCountry.name} must be between 6 and 14 digits.`);
        return false;
      }
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      triggerError('weak password');
      return false;
    }

    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return false;
    }

    if (!agreedToTerms) {
      triggerError('You must accept the terms & conditions.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);

    try {
      const stateList = STATES_BY_COUNTRY[selectedCountry.code];
      const hasStates = stateList && stateList.length > 0;
      const resolvedLanguage = hasStates 
        ? (stateList.find(s => s.name === selectedState)?.language || 'English') 
        : (selectedCountry.code === 'NP' ? 'Nepali' : 'English');

      const payLoad = {
        name,
        fullName: name,
        email,
        password,
        phone: localPhone,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        state: hasStates ? selectedState : undefined,
        jurisdiction: hasStates ? `${selectedState}, ${selectedCountry.name}` : selectedCountry.name,
        language: resolvedLanguage,
        personalizations: {
          general: {
            language: resolvedLanguage,
            state: hasStates ? selectedState : selectedCountry.name,
            jurisdiction: hasStates ? `${selectedState}, ${selectedCountry.name}` : selectedCountry.name,
          }
        }
      };

      const res = await axios.post(apis.signUp, payLoad);

      toast.success("Welcome to AI Legal™! Verification code sent to your email.", {
        icon: '⚖️',
        style: {
          borderRadius: '16px',
          background: '#1F2937',
          color: '#FFF',
        }
      });
      
      localStorage.setItem('pendingVerificationEmail', email);

      navigate(AppRoute.E_Verification, { state: { email, from: location.state?.from } });
      console.log("[SIGNUP] Pre-verification signup complete, sent code to email:", email);
    } catch (err) {
      triggerError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    console.log('[Google Signup] Success callback received:', tokenResponse);
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
          console.log('[Google Signup] User info fetched:', email);
        }
      } catch (fetchErr) {
        console.warn('[Google Signup] Client userinfo fetch skipped/failed, backend will resolve server-side:', fetchErr);
      }

      const res = await axios.post(apis.googleLogin, {
        credential: tokenResponse.access_token,
        email,
        name,
        picture,
        deviceOS: 'web',
        platform: 'web',
        signupPlatform: 'web'
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
    <div className="min-h-screen w-screen flex flex-col bg-[#F4F6FA] dark:bg-[#070A12] text-[#111827] dark:text-slate-100 font-sans selection:bg-[#C8A34D]/25 selection:text-[#111111] transition-colors duration-300">
      {/* Top Header Navigation Tabs — Matching CLAW Reference & Login */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
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
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => navigate('/post-judgment')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#C8A34D]/50 bg-amber-50/50 text-[#B38628] hover:bg-amber-100/60 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300 dark:hover:bg-amber-950/70 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} className="text-[#B38628] stroke-[2.5]" />
              <span>Post your judgement</span>
            </button>

            <span className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#C8A34D] to-[#B38628] shadow-md shadow-[#C8A34D]/30">
              Get Started
            </span>
          </div>
        </div>
      </header>

      {/* Main Centered Content Area with 2-Column Card */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl w-full bg-white dark:bg-[#111625] border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 my-auto transition-all duration-300 max-h-[88vh] md:h-[580px]">
        
          {/* Left Column: Photorealistic Advocate Aarohi Legal Chamber (Matching Login) */}
          <div className="md:col-span-5 relative hidden md:flex flex-col justify-between overflow-hidden h-full min-h-[460px] p-6 lg:p-7 text-white border-r border-slate-200/20 dark:border-zinc-800 select-none">
            
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

          {/* Right Column: Scrollable Signup Form with Compact Height */}
          <div className="md:col-span-7 h-full flex flex-col bg-white dark:bg-[#111625] overflow-hidden">
            <div className="overflow-y-auto h-full p-5 sm:p-6 lg:p-7 space-y-3.5 scrollbar-thin scrollbar-thumb-[#C8A34D]/30 scrollbar-track-transparent">
              
              {/* Header Brand Emblem & Greeting */}
              <div className="flex flex-col items-center text-center mb-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C8A34D]/20 via-amber-500/10 to-[#B38628]/20 border border-[#C8A34D]/35 flex items-center justify-center p-1.5 mb-1.5 shadow-xs">
                  <img 
                    src="/logo/logo_transparent.png" 
                    alt="AI LEGAL™" 
                    className="w-full h-full object-contain drop-shadow-xs" 
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Create Account
                </h1>
                <p className="text-[11px] sm:text-xs text-[#B38628] dark:text-[#D4AF37] font-semibold mt-0.5">
                  Join the premium network for modern advocates.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`e.g. ${placeholderExample.name}`}
                      className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`e.g. ${placeholderExample.email}`}
                      className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Country & State in 2-Col Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Country */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Country / Jurisdiction
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const countryCode = e.target.value;
                          const countryObj = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES.find(c => c.code === 'IN');
                          setSelectedCountry(countryObj);
                          setLocalPhone('');
                          const stateList = STATES_BY_COUNTRY[countryCode];
                          if (stateList && stateList.length > 0) {
                            setSelectedState(stateList[0].name);
                          } else {
                            setSelectedState('');
                          }
                        }}
                        className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all cursor-pointer truncate"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code} className="dark:bg-[#121321]">
                            {c.flag} {c.name} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* State */}
                  {STATES_BY_COUNTRY[selectedCountry.code] && STATES_BY_COUNTRY[selectedCountry.code].length > 0 ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                        State / Province
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all cursor-pointer truncate"
                        >
                          {STATES_BY_COUNTRY[selectedCountry.code].map((s) => (
                            <option key={s.name} value={s.name} className="dark:bg-[#121321]">
                              {s.flag} {s.name} ({s.language})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0E121E] focus-within:border-[#C8A34D] focus-within:ring-2 focus-within:ring-[#C8A34D]/20 transition-all overflow-hidden">
                    <div className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 dark:bg-[#1A1B2E] border-r border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-xs select-none shrink-0">
                      <span>{selectedCountry.flag}</span>
                      <span>{selectedCountry.dialCode}</span>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={selectedCountry.code === 'IN' ? 'Enter 10-digit mobile number' : 'Enter phone number'}
                      className="w-full bg-transparent py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Password & Confirm Password in 2-Col Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50/50 dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#C8A34D] focus:ring-2 focus:ring-[#C8A34D]/20 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-agree"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 accent-[#C8A34D] rounded border-slate-300 dark:border-zinc-800 cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms-agree" className="text-[10.5px] text-slate-500 dark:text-zinc-400 leading-snug cursor-pointer select-none">
                    By creating an account, you agree to the{' '}
                    <Link to="/terms" className="text-[#B38628] dark:text-[#D4AF37] font-bold hover:underline">Terms</Link>,{' '}
                    <Link to="/privacy-policy" className="text-[#B38628] dark:text-[#D4AF37] font-bold hover:underline">Privacy Policy</Link>, and{' '}
                    <Link to="/cookie-policy" className="text-[#B38628] dark:text-[#D4AF37] font-bold hover:underline">Cookie Policy</Link>.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#C8A34D] via-[#D4AF37] to-[#B38628] hover:opacity-95 text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#C8A34D]/25 mt-2 cursor-pointer uppercase tracking-wider text-xs"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div>
                <div className="flex items-center gap-3 my-2.5">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* UWO SSO Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!agreedToTerms) {
                        triggerError('You must accept the terms & conditions.');
                        return;
                      }
                      setShowUwoModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#C8A34D]/10 border border-[#C8A34D]/35 hover:bg-[#C8A34D]/20 rounded-xl font-bold text-[#B38628] dark:text-[#D4AF37] transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    <Zap className="w-3 h-3 fill-[#D4AF37]" />
                    <span>UWO SSO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!agreedToTerms) {
                        triggerError('You must accept the terms & conditions.');
                        return;
                      }
                      googleLogin();
                    }}
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

                  <button
                    type="button"
                    onClick={() => {
                      if (!agreedToTerms) {
                        triggerError('You must accept the terms & conditions.');
                        return;
                      }
                      window.location.href = apis.appleLogin;
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-white dark:bg-[#0E121E] border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl font-medium text-slate-800 dark:text-zinc-100 transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    <svg className="w-3 h-3 fill-current text-black dark:text-white" viewBox="0 0 170 170">
                      <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="text-[#B38628] dark:text-[#D4AF37] font-bold hover:underline transition-colors ml-1">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AuthErrorDialog
        visible={showErrorDialog}
        details={errorDetails}
        onClose={() => setShowErrorDialog(false)}
      />

      {/* UWO Central SSO Modal */}
      <UWOLoginModal
        isOpen={showUwoModal}
        initialRegister={true}
        onClose={() => setShowUwoModal(false)}
        appCode="ailegal"
        apiKey="key_ailegal_live_master_2026"
        onSuccess={(data) => {
          toast.success('Account registered with UWO Platform!');
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
          navigate(AppRoute.DASHBOARD, { replace: true });
        }}
      />
    </div>
  );
};

export default Signup;
