import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, AlertTriangle, Smartphone, ArrowRight, 
  ExternalLink, Download, Copy, Check, Scale, Clock, Lock
} from 'lucide-react';
import { API } from '../types.js';

export default function AdvocateInviteWebFallback() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [copied, setCopied] = useState(false);

  const getBaseApi = () => {
    return API.endsWith('/api') ? API : `${API}/api`;
  };

  useEffect(() => {
    if (!token) {
      setErrorState({
        code: 'INVALID_TOKEN',
        message: 'No invitation token was provided in the URL.'
      });
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${getBaseApi()}/invitations/advocate/${token}`);
        if (res.data && res.data.success) {
          setInvitation(res.data.invitation);
          // Try to trigger deep link automatically if on a mobile browser
          const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isMobileDevice) {
            window.location.href = `ailegal://invite/advocate/${token}`;
          }
        } else {
          setErrorState({
            code: res.data?.code || 'INVALID_LINK',
            message: res.data?.message || 'This invitation link is invalid or expired.'
          });
        }
      } catch (err) {
        const errorData = err.response?.data;
        setErrorState({
          code: errorData?.code || 'ERROR',
          message: errorData?.message || 'We could not validate this invitation. It may have expired or already been accepted.'
        });
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleOpenApp = () => {
    const deepLink = `ailegal://invite/advocate/${token}`;
    window.location.href = deepLink;
  };

  const handleCopyLink = () => {
    const appUrl = `ailegal://invite/advocate/${token}`;
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-[#B88B2A]/30 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#B88B2A] to-[#96701E] flex items-center justify-center text-slate-950 font-black shadow-md shadow-[#B88B2A]/10">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-black tracking-tight text-white flex items-center gap-1">
              AI LEGAL<span className="text-[#B88B2A]">™</span>
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Verified Advocate Network
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Rule 36 BCI Compliant</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle gold decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#B88B2A]/10 rounded-full blur-3xl pointer-events-none" />

          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-[#B88B2A]/30 border-t-[#B88B2A] rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-300">Validating Secure Invitation...</div>
              <p className="text-xs text-slate-500">Checking credentials with the AI Legal verification network.</p>
            </div>
          ) : errorState ? (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {errorState.code}
                </span>
                <h2 className="text-xl font-black text-white">Invitation Unavailable</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {errorState.message}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#B88B2A]" />
                  Need assistance?
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  If you are an advocate expecting this invitation, please ask your AI Legal administrative contact to resend a fresh link, or reach out to our team at support@ailegal.app.
                </p>
              </div>

              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card Header */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#B88B2A]/15 border border-[#B88B2A]/30 flex items-center justify-center text-[#B88B2A] mx-auto shadow-lg shadow-[#B88B2A]/10">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
                    Official Invitation
                  </span>
                  <h1 className="text-2xl font-black text-white pt-1">
                    Welcome, {invitation.invitedName || 'Learned Counsel'}
                  </h1>
                  <p className="text-xs text-slate-400">
                    You have been invited to join the AI Legal™ Verified Advocate Network.
                  </p>
                </div>
              </div>

              {/* Invitation Details Pill */}
              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Invited Account:</span>
                  <span className="text-white font-black">{invitation.invitedEmail}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Validity:</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    7-Day Secure Window
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 leading-relaxed">
                  Please open in the AI Legal mobile app using the account matching <span className="text-slate-200 font-semibold">{invitation.invitedEmail}</span> to complete your verification and Rule 36 directory consent.
                </div>
              </div>

              {/* Primary CTA */}
              <div className="space-y-3">
                <button
                  onClick={handleOpenApp}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#B88B2A] via-[#A67B22] to-[#85631A] hover:from-[#C59732] hover:to-[#96701E] text-white font-black text-sm shadow-lg shadow-[#B88B2A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Accept & Open in AI Legal App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-slate-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Deep Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy App Direct Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* App Store Download Badges */}
              <div className="pt-3 border-t border-slate-800/90 text-center space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Don't have the AI Legal mobile app yet?
                </div>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href="https://play.google.com/store"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#B88B2A]" />
                    <span>Google Play</span>
                  </a>
                  <a
                    href="https://apps.apple.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#B88B2A]" />
                    <span>App Store</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        AI Legal™ Advocate Verification & Public Listing Consent System · Bar Council of India Rule 36 Adherent
      </footer>
    </div>
  );
}
