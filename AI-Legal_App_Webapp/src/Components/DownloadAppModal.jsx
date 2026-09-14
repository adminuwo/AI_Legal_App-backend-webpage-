import React, { useEffect } from 'react';
import { X, Smartphone, ExternalLink, ShieldCheck, CheckCircle2, Zap, QrCode } from 'lucide-react';
import { GOOGLE_PLAY_URL, APP_STORE_URL } from '../constants/mobileAppConfig';

export default function DownloadAppModal({ isOpen, onClose }) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      {/* Dark backdrop blur */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-all transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#B88B2A]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header Content */}
        <div className="p-6 sm:p-7 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] to-[#1F2937] p-2.5 shadow-lg border border-[#B88B2A]/30 mb-3.5">
            <img src="/logo/logo_transparent.png" alt="AI LEGAL" className="w-full h-full object-contain" />
          </div>

          <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#B88B2A]/10 text-[#B38628] dark:text-[#B88B2A] text-[10px] font-extrabold uppercase tracking-wider mb-1.5 border border-[#B88B2A]/20">
            Official Mobile Application
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Download AI LEGAL<span className="text-[#B88B2A] text-xs align-super ml-0.5">™</span>
          </h3>

          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            Select your mobile platform to install the native chamber companion and take your cases anywhere.
          </p>
        </div>

        {/* Store Selection Cards */}
        <div className="px-6 sm:px-7 space-y-3 pb-5">
          {/* Google Play Store Card */}
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#151E33] hover:bg-amber-500/10 dark:hover:bg-amber-500/10 border-2 border-slate-200 dark:border-slate-700/80 hover:border-[#B88B2A] dark:hover:border-[#B88B2A] transition-all shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              {/* Google Play Icon Badge */}
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0 shadow-md p-2 border border-slate-800">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.6 1.8C3.3 2.1 3.1 2.6 3.1 3.2V20.8C3.1 21.4 3.3 21.9 3.6 22.2L3.7 22.3L13.7 12.3V11.7L3.7 1.7L3.6 1.8Z" fill="#00D2FF"/>
                  <path d="M17 15.6L13.7 12.3V11.7L17 8.4L17.1 8.5L21.1 10.8C22.2 11.4 22.2 12.6 21.1 13.2L17.1 15.5L17 15.6Z" fill="#FFD500"/>
                  <path d="M17.1 15.5L13.7 12.1L3.6 22.2C4 22.6 4.7 22.6 5.5 22.2L17.1 15.5Z" fill="#FF3A44"/>
                  <path d="M17.1 8.5L5.5 1.8C4.7 1.4 4 1.4 3.6 1.8L13.7 11.9L17.1 8.5Z" fill="#00E676"/>
                </svg>
              </div>

              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  GET IT ON
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white leading-tight group-hover:text-[#B38628] dark:group-hover:text-[#B88B2A] transition-colors">
                  Google Play Store
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  For Android smartphones & tablets (v8.0+)
                </div>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-[#B88B2A] group-hover:text-slate-950 flex items-center justify-center shrink-0 transition-all shadow-xs">
              <ExternalLink size={15} />
            </div>
          </a>

          {/* Apple App Store Card */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#151E33] hover:bg-amber-500/10 dark:hover:bg-amber-500/10 border-2 border-slate-200 dark:border-slate-700/80 hover:border-[#B88B2A] dark:hover:border-[#B88B2A] transition-all shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              {/* Apple Icon Badge */}
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0 shadow-md p-2 border border-slate-800 text-white">
                <svg className="w-7 h-7 fill-current" viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.42-6-9.15-10.8-19.38-14.41-30.68-3.61-11.31-5.42-22.18-5.42-32.61 0-14.59 3.8-26.68 11.4-36.27 7.6-9.6 17.2-14.49 28.79-14.67 4.78 0 10.13 1.25 16.04 3.76 5.92 2.51 9.87 3.82 11.87 3.93 1.56-.11 5.73-1.47 12.5-4.09 6.78-2.62 12.63-3.79 17.58-3.51 13.08.65 23.61 5.43 31.57 14.33-11.53 6.96-17.18 16.63-16.96 28.99.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.29 10.55 26.71 11.42-2.17 6.74-4.88 13.26-8.13 19.56zM119.22 31.84c0-7.39 2.67-14.35 8.01-20.87 5.33-6.52 11.8-10.54 19.4-12.07.22 1.3.33 2.5.33 3.59 0 7.39-2.78 14.36-8.34 20.89-5.55 6.53-12.01 10.33-19.4 11.42 0-.98 0-1.96 0-2.96z"/>
                </svg>
              </div>

              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  DOWNLOAD ON THE
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white leading-tight group-hover:text-[#B38628] dark:group-hover:text-[#B88B2A] transition-colors">
                  Apple App Store
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  For iPhone & iPad (iOS 15.0+)
                </div>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-[#B88B2A] group-hover:text-slate-950 flex items-center justify-center shrink-0 transition-all shadow-xs">
              <ExternalLink size={15} />
            </div>
          </a>
        </div>

        {/* Quick QR Code Scanner Row for Desktop Convenience */}
        <div className="px-6 sm:px-7 py-3 bg-slate-50/80 dark:bg-[#080C14] border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Single Sign-On Sync
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Use your web chamber account on mobile
              </div>
            </div>
          </div>

          <span className="text-[10.5px] font-extrabold text-[#B38628] dark:text-[#B88B2A] bg-[#B88B2A]/10 px-2.5 py-1 rounded-full border border-[#B88B2A]/25 shrink-0">
            ★ 4.8 / 5.0 Rating
          </span>
        </div>
      </div>
    </div>
  );
}
