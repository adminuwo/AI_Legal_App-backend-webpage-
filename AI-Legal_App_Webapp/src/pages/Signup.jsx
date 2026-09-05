import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Key, User, ArrowLeft, AlertCircle, Eye, EyeOff, Globe, MapPin, ChevronDown, Phone, Zap } from 'lucide-react';
import { AppRoute, apis } from '../types';
import axios from 'axios';
import { setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useGoogleLogin } from '@react-oauth/google';
import { logo } from '../constants';
import { COUNTRIES } from '../constants/countries';
import { INDIAN_STATES_LIST } from '../constants/states';
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
  const [selectedState, setSelectedState] = useState('Gujarat');
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
      const payLoad = {
        name,
        fullName: name,
        email,
        password,
        phone: localPhone,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        state: selectedCountry.code === 'IN' ? selectedState : undefined,
        jurisdiction: selectedCountry.code === 'IN' ? `${selectedState}, India` : selectedCountry.name
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
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0F19] p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <ThemeToggle />
      </div>

      {/* Centered Signup Card */}
      <div className="max-w-lg w-full bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800/80 shadow-xl rounded-2xl p-8 sm:p-10 my-auto my-8 transition-colors duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src="/logo/logo_transparent.png" 
            alt="AI LEGAL™" 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain -mb-2.5 drop-shadow-sm" 
          />
          <span className="text-lg font-black text-[#111827] dark:text-zinc-100 tracking-wider uppercase mb-1">AI LEGAL™</span>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-zinc-100 tracking-tight mb-1">Create Account</h1>
          <p className="text-sm text-[#6B7280] dark:text-zinc-400">Join the premium network for modern advocates.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${placeholderExample.name}`}
                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`e.g. ${placeholderExample.email}`}
                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                required
              />
            </div>
          </div>

          {/* Country / Legal Jurisdiction */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Country / Legal Jurisdiction</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400 pointer-events-none" />
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const countryObj = COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES.find(c => c.code === 'IN');
                  setSelectedCountry(countryObj);
                  setLocalPhone('');
                }}
                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-10 text-[#111827] dark:text-zinc-100 appearance-none focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all cursor-pointer text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="dark:bg-[#121321]">
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* State Picker (When Country is India) */}
          {selectedCountry.code === 'IN' && (
            <div>
              <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Select State (App Language Auto-Set)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400 pointer-events-none" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-10 text-[#111827] dark:text-zinc-100 appearance-none focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all cursor-pointer text-sm"
                >
                  {INDIAN_STATES_LIST.map((s) => (
                    <option key={s.name} value={s.name} className="dark:bg-[#121321]">
                      {s.flag} {s.name} ({s.language})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-zinc-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Phone Number</label>
            <div className="flex items-center rounded-xl border border-[#E5E7EB] dark:border-zinc-800 bg-[#FFFFFF] dark:bg-[#121321] focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all overflow-hidden">
              <div className="flex items-center gap-1.5 px-3.5 py-3 bg-[#F9FAFB] dark:bg-[#1A1B2E] border-r border-[#E5E7EB] dark:border-zinc-800 text-[#111827] dark:text-zinc-100 font-bold text-sm select-none shrink-0">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.dialCode}</span>
              </div>
              <input
                type="tel"
                name="phone"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={selectedCountry.code === 'IN' ? 'Enter 10-digit mobile number' : 'Enter phone number'}
                className="w-full bg-transparent py-3 px-4 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-12 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-zinc-100"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms-agree"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#C5A059] rounded border-[#E5E7EB] dark:border-zinc-800 cursor-pointer shrink-0"
            />
            <label htmlFor="terms-agree" className="text-xs text-[#6B7280] dark:text-zinc-400 leading-relaxed cursor-pointer select-none">
              By creating an account, you agree to the{' '}
              <Link to="/terms" className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline">Terms of Service</Link>,{' '}
              <Link to="/privacy-policy" className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline">Privacy Policy</Link>, and{' '}
              <Link to="/cookie-policy" className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline">Cookie Policy</Link>.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-[#111827] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-4 cursor-pointer uppercase tracking-wider text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#111827]/30 border-t-[#111827] rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div>
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-zinc-800" />
            <span className="text-sm text-[#6B7280] dark:text-zinc-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-zinc-800" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
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
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#C5A059]/10 border border-[#C5A059]/30 hover:bg-[#C5A059]/20 rounded-xl font-bold text-[#D4AF37] transition-all shadow-sm text-xs cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-[#D4AF37]" />
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
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 hover:bg-[#F9FAFB] dark:hover:bg-zinc-800/60 rounded-xl font-medium text-[#111827] dark:text-zinc-100 transition-all shadow-sm disabled:opacity-50 text-xs cursor-pointer"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-[#E5E7EB] border-t-[#C5A059] rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 hover:bg-[#F9FAFB] dark:hover:bg-zinc-800/60 rounded-xl font-medium text-[#111827] dark:text-zinc-100 transition-all shadow-sm text-xs cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-black dark:text-white" viewBox="0 0 170 170">
                <path d="m150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.254 2.13-9.49 3.29-12.71 3.48-5.253.39-10.37-1.77-15.35-6.47-3.04-2.79-6.79-7.14-11.24-13.06-4.45-5.91-8.25-12.51-11.41-19.78-3.15-7.26-4.73-14.85-4.73-22.77 0-10.73 2.53-19.89 7.58-27.48 4.09-6.13 9.42-10.66 15.98-13.59 6.57-2.93 13.25-4.4 20.03-4.4 4.04 0 9.06 1.05 15.08 3.14 6.02 2.1 10.15 3.15 12.39 3.15 1.48 0 5.8-1.12 12.96-3.37 7.16-2.25 13.3-3.23 18.42-2.93 13 1.08 23.36 6.3 31.06 15.65-11.52 6.93-17.28 17.06-17.28 30.38 0 10.18 3.03 18.67 9.09 25.44 3.04 3.42 6.78 6.24 11.23 8.48zm-26.65-103.11c0 8.08-3 15.82-8.99 23.23-7.55 9.06-16.14 14-25.75 14.86-.34-8.15 2.68-15.97 9.05-23.47 3.25-3.83 7.37-7.25 12.35-10.27 4.99-3.01 9.42-4.63 13.28-4.87.04.18.06.35.06.52z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-[#6B7280] dark:text-zinc-400">
          Already have an account? <Link to="/login" className="text-[#B8860B] dark:text-[#D4AF37] font-bold hover:underline transition-colors">Sign In</Link>
        </div>
      </div>

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
