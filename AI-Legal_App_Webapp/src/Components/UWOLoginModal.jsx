import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { apis, getUnifiedApiBaseUrl } from '../types';

export const UWOLoginModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialRegister = false,
  appCode = 'ailegal',
  apiKey = 'key_ailegal_live_master_2026',
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(initialRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    setIsRegisterMode(initialRegister);
  }, [initialRegister]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isRegisterMode) {
        // 1. Register new central account
        const regRes = await fetch(apis.unifiedAuth.register, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Application-Key': apiKey,
          },
          body: JSON.stringify({ name, email, password }),
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
          let errorText = 'Registration failed';
          if (typeof regData.detail === 'string') {
            errorText = regData.detail;
          } else if (Array.isArray(regData.detail)) {
            errorText = regData.detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(', ');
          } else if (regData.detail) {
            errorText = typeof regData.detail === 'object' ? JSON.stringify(regData.detail) : String(regData.detail);
          } else if (regData.message) {
            errorText = String(regData.message);
          }

          if (errorText.toLowerCase().includes('already exists')) {
            errorText = 'An account with this email already exists. Switching to Sign In...';
            setTimeout(() => {
              setIsRegisterMode(false);
              setError('');
            }, 1800);
          }
          throw new Error(errorText);
        }

        setSuccessMsg('Account created successfully! Signing in...');
      }

      // 2. Authenticate & Obtain Central UWO Tokens
      const loginRes = await fetch(apis.unifiedAuth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Application-Key': apiKey,
        },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        let loginErr = 'Authentication failed';
        if (typeof loginData.detail === 'string') {
          loginErr = loginData.detail;
        } else if (Array.isArray(loginData.detail)) {
          loginErr = loginData.detail.map((d) => d.msg || d.detail).join(', ');
        } else if (loginData.detail) {
          loginErr = typeof loginData.detail === 'object' ? JSON.stringify(loginData.detail) : String(loginData.detail);
        } else if (loginData.message) {
          loginErr = String(loginData.message);
        }
        throw new Error(loginErr);
      }

      // Fetch user profile from /auth/me
      let uwoUser = { email, name: name || email.split('@')[0] };
      try {
        const unifiedApiBase = getUnifiedApiBaseUrl();
        const meRes = await fetch(`${unifiedApiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${loginData.access_token}` },
        });
        if (meRes.ok) {
          uwoUser = await meRes.json();
        }
      } catch (meErr) {
        console.warn('Failed to fetch /auth/me:', meErr);
      }

      // 3. Create persistent session in AI-Legal Backend
      let finalData = { ...loginData, user: uwoUser };
      try {
        const ssoRes = await fetch(apis.uwoLogin, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: uwoUser.email || email,
            name: uwoUser.name || name || email.split('@')[0],
            uwo_token: loginData.access_token,
          }),
        });

        if (ssoRes.ok) {
          const ssoData = await ssoRes.json();
          finalData = {
            token: ssoData.token,
            access_token: ssoData.token,
            uwo_token: loginData.access_token,
            user: ssoData.user,
          };
        }
      } catch (ssoErr) {
        console.warn('[UWO SSO] AI-Legal Backend session provision fallback:', ssoErr);
      }

      // Store tokens and identity in localStorage
      const sessionToken = finalData.token || finalData.access_token;
      if (sessionToken) {
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('uwo_access_token', loginData.access_token);
        localStorage.setItem('uwo_user', JSON.stringify(finalData.user));
      }

      setLoading(false);
      if (onSuccess) onSuccess(finalData);
      onClose();
    } catch (err) {
      setLoading(false);
      const displayError =
        typeof err === 'string'
          ? err
          : err?.message
          ? typeof err.message === 'string'
            ? err.message
            : JSON.stringify(err.message)
          : 'Authentication error';
      setError(displayError);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md p-7 bg-[#0b0f19] border border-[#C5A059]/30 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(197,160,89,0.25)] overflow-hidden"
        >
          {/* Subtle gold ambient glow */}
          <div className="absolute top-[-25%] right-[-25%] w-48 h-48 bg-[#C5A059]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-25%] left-[-25%] w-48 h-48 bg-[#B8860B]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#C5A059] to-[#D4AF37] p-0.5 shadow-lg shadow-[#C5A059]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center text-[#D4AF37]">
                  <Zap className="w-5 h-5 fill-[#D4AF37]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  {isRegisterMode ? 'Create UWO Account' : 'UWO SSO Sign In'}
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Unified Web Options Identity Platform</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 mt-5 bg-slate-950/70 border border-slate-800/80 rounded-2xl relative z-10">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                !isRegisterMode
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                isRegisterMode
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {isRegisterMode && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adv. Sanskar Sharma"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="advocate@uwo24.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_10px_25px_-5px_rgba(197,160,89,0.3)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  {isRegisterMode ? 'Register & Sign In' : 'Sign In with UWO'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer mode toggle */}
          <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-center text-xs text-slate-400 relative z-10">
            {isRegisterMode ? (
              <span>
                Already have a UWO account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-[#D4AF37] font-bold hover:underline ml-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New to UWO Platform?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-[#D4AF37] font-bold hover:underline ml-1"
                >
                  Create an Account
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UWOLoginModal;
