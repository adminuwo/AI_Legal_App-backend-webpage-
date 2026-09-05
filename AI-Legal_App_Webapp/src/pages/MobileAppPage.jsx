import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Smartphone, UserCheck, Briefcase, CreditCard, RefreshCw, 
  CheckCircle2, QrCode, ShieldCheck, ArrowUpRight, Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apis } from '../types';
import { 
  APP_STORE_URL, 
  GOOGLE_PLAY_URL, 
  UNIVERSAL_DOWNLOAD_URL, 
  MOBILE_APP_VERSION, 
  CONNECTED_ECOSYSTEM_BENEFITS,
  isRealStoreUrl
} from '../constants/mobileAppConfig';

// Apple Store Icon Component
const AppleStoreIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 66.2 32.1 113c23.6 33.6 52.5 70.3 88.2 69.2 34.3-1.1 47.5-22.1 88.5-22.1 40.4 0 52.5 22.1 88.5 21 36.6-1.1 63.3-33.3 86.4-66.9 16.7-24.1 23.3-47.2 24.2-49.7-1.1-.6-46.6-17.8-46.7-69.3zM250.7 86.8c15.8-19.4 26.6-46.4 23.6-73.5-22.8 1-50.6 15.3-66.9 34.5-14.4 16.7-27.2 44.2-23.8 70.7 25.5 2 51.3-12.3 67.1-31.7z" />
  </svg>
);

// Google Play Icon Component
const GooglePlayIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 512 512" fill="currentColor">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
  </svg>
);

// Official Apple App Store Download Badge Component
const OfficialAppStoreBadge = ({ className = "h-14 w-auto" }) => (
  <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Download on the App Store">
    <rect width="200" height="60" rx="10" fill="#000000"/>
    <rect x="0.75" y="0.75" width="198.5" height="58.5" rx="9.25" stroke="#A6A6A6" strokeWidth="1.5"/>
    <path d="M42.4 28.5C42.4 24.3 45.8 22.3 46 22.2C44.1 19.4 41.1 19 40 18.9C37.5 18.6 34.9 20.4 33.6 20.4C32.3 20.4 30.2 18.9 28.2 18.9C25.6 18.9 23.2 20.4 21.8 22.8C19 27.7 21.1 35 23.8 38.9C25.1 40.8 26.6 42.9 28.7 42.8C30.7 42.7 31.5 41.5 33.9 41.5C36.3 41.5 37 42.8 39.1 42.8C41.2 42.8 42.5 40.9 43.8 39C45.3 36.8 45.9 34.7 46 34.6C45.9 34.5 42.4 33.2 42.4 28.5Z" fill="white"/>
    <path d="M37.7 16.5C38.8 15.1 39.6 13.2 39.3 11.3C37.7 11.4 35.6 12.4 34.5 13.7C33.5 14.8 32.7 16.8 33 18.7C34.8 18.8 36.7 17.8 37.7 16.5Z" fill="white"/>
    <text x="58" y="24" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="10" fontWeight="500" letterSpacing="0.2">Download on the</text>
    <text x="58" y="44" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="20" fontWeight="600" letterSpacing="-0.4">App Store</text>
  </svg>
);

// Official Google Play Download Badge Component
const OfficialGooglePlayBadge = ({ className = "h-14 w-auto" }) => (
  <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GET IT ON Google Play">
    <rect width="200" height="60" rx="10" fill="#000000"/>
    <rect x="0.75" y="0.75" width="198.5" height="58.5" rx="9.25" stroke="#A6A6A6" strokeWidth="1.5"/>
    <path d="M22.8 13.4C22.3 13.9 22 14.7 22 15.8V44.2C22 45.3 22.3 46.1 22.8 46.6L22.9 46.7L38.1 31.5V31.2L22.9 16L22.8 13.4Z" fill="#00D2FF"/>
    <path d="M43.2 36.6L38.1 31.5V31.2L43.2 26.1L43.3 26.2L49.4 29.7C51.1 30.7 51.1 32.3 49.4 33.3L43.3 36.5L43.2 36.6Z" fill="#FFD500"/>
    <path d="M43.3 36.5L38.1 31.3L22.8 46.6C23.4 47.2 24.4 47.3 25.5 46.7L43.3 36.5Z" fill="#FF3A44"/>
    <path d="M43.3 26.2L25.5 16C24.4 15.4 23.4 15.5 22.8 16.1L38.1 31.4L43.3 26.2Z" fill="#00E676"/>
    <text x="58" y="24" fill="white" fontFamily="Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="9.5" fontWeight="500" letterSpacing="0.8">GET IT ON</text>
    <text x="58" y="44" fill="white" fontFamily="Google Sans, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="19" fontWeight="600" letterSpacing="-0.2">Google Play</text>
  </svg>
);

// Real, high-resolution 100% scannable QR Code component for store links
const DownloadQRCode = ({ value, label = "Scan with Camera", platform = "universal", size = 135 }) => {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(value)}&color=000000&bgcolor=ffffff&margin=1`;

  return (
    <div className="p-2 sm:p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center shrink-0 space-y-1.5 sm:space-y-2 group transition-all duration-200 hover:border-[#C8A34D]/50 hover:shadow-md max-w-[145px] sm:max-w-none">
      <div className="p-1.5 sm:p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-center">
        <img
          src={qrApiUrl}
          alt={`Scan to Download AI LEGAL Mobile App (${label})`}
          className="rounded-md object-contain w-[82px] h-[82px] sm:w-[110px] sm:h-[110px]"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(value)}`;
          }}
        />
      </div>
      <span className="text-[9px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 pt-0.5 whitespace-nowrap">
        {platform === 'ios' && <AppleStoreIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C8A34D] shrink-0" />}
        {platform === 'android' && <GooglePlayIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C8A34D] shrink-0" />}
        <span>{label}</span>
      </span>
    </div>
  );
};

export default function MobileAppPage() {
  const [storeConfig, setStoreConfig] = useState({
    appStoreUrl: APP_STORE_URL,
    googlePlayUrl: GOOGLE_PLAY_URL,
    version: MOBILE_APP_VERSION,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAppConfig = async () => {
      try {
        const response = await axios.get(apis.appUpdateConfig || `${apis.baseUrl}/app-update/config`);
        if (isMounted && response.data?.success && response.data?.config) {
          const cfg = response.data.config;
          setStoreConfig({
            appStoreUrl: cfg.ios?.storeUrl || APP_STORE_URL,
            googlePlayUrl: cfg.android?.storeUrl || GOOGLE_PLAY_URL,
            version: cfg.android?.latestVersion || cfg.ios?.latestVersion || MOBILE_APP_VERSION,
            loading: false,
          });
        }
      } catch (err) {
        // Silently fallback to static config
        if (isMounted) {
          setStoreConfig((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchAppConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const getBenefitIcon = (iconName) => {
    switch (iconName) {
      case 'UserCheck':
        return <UserCheck className="w-5 h-5 text-[#C8A34D]" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-[#C8A34D]" />;
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-[#C8A34D]" />;
      case 'RefreshCw':
        return <RefreshCw className="w-5 h-5 text-[#C8A34D]" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[#C8A34D]" />;
    }
  };

  const handleStoreClick = (e, url, storeName) => {
    if (!isRealStoreUrl(url)) {
      e.preventDefault();
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-[#1E293B] shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-[#C8A34D]/40 p-4`}>
          <div className="flex-1 w-0 flex items-center">
            <div className="shrink-0 p-2 bg-[#C8A34D]/15 rounded-xl text-[#C8A34D]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {storeName} • In Review
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                The {storeName} version is currently in internal review. Download the Android app or continue on Web!
              </p>
            </div>
          </div>
        </div>
      ), { duration: 4000 });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#111111] pt-4 md:pt-8 pb-16 px-4 md:px-12 max-w-6xl mx-auto text-[#111111] dark:text-white font-sans space-y-8 select-none">
      
      {/* 1. Page Header */}
      <header className="text-center space-y-4 max-w-3xl mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-[#C8A34D] text-xs font-bold uppercase tracking-wider">
          <Smartphone className="w-3.5 h-3.5" />
          <span>CONNECTED ECOSYSTEM</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] dark:text-white">
          AI LEGAL™ <span className="text-[#C8A34D]">Mobile App</span>
        </h1>
        
        <p className="text-base md:text-xl font-semibold text-slate-700 dark:text-slate-300">
          Your AI Legal workspace, available across Android and iOS.
        </p>

        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Use the same AI LEGAL™ account across Web and Mobile. Your account, subscription, cases and feature usage remain synchronized.
        </p>
      </header>

      {/* 2. App Download Section */}
      <section className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-10 shadow-xs max-w-4xl mx-auto text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111111] dark:text-white tracking-tight">
            Take AI LEGAL™ With You
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            Access your legal workspace, AI tools and account wherever you work.
          </p>
        </div>

        {/* Authentic Store Badges - 1 Row on Mobile & Desktop */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-5 pt-2 max-w-full">
          {/* App Store Badge */}
          <a
            href={isRealStoreUrl(storeConfig.appStoreUrl) ? storeConfig.appStoreUrl : '#'}
            onClick={(e) => handleStoreClick(e, storeConfig.appStoreUrl, 'Apple App Store')}
            target={isRealStoreUrl(storeConfig.appStoreUrl) ? "_blank" : "_self"}
            rel="noopener noreferrer"
            aria-label="Download AI LEGAL™ on the Apple App Store"
            className="inline-block transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <OfficialAppStoreBadge className="h-10 sm:h-14 w-[135px] sm:w-[205px] object-contain drop-shadow-xs" />
          </a>

          {/* Google Play Badge */}
          <a
            href={storeConfig.googlePlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get AI LEGAL™ on Google Play"
            className="inline-block transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <OfficialGooglePlayBadge className="h-10 sm:h-14 w-[135px] sm:w-[205px] object-contain drop-shadow-xs" />
          </a>
        </div>

        {/* 3. Availability & Version */}
        <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Available on:</span>
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#C8A34D]" />
            <span>Android</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#C8A34D]" />
            <span>iOS</span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-[#C8A34D]">
            Latest Version: v{storeConfig.version}
          </div>
        </div>
      </section>

      {/* 4. Connected Account Benefits Grid */}
      <section className="max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-[#111111] dark:text-white">
            One Account. Every Device.
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Seamless multi-platform integration built into your AI LEGAL™ subscription.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONNECTED_ECOSYSTEM_BENEFITS.map((item) => (
            <div 
              key={item.id}
              className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-2xs hover:border-[#C8A34D]/40 transition-colors"
            >
              <div className="p-2.5 rounded-lg bg-[#C8A34D]/10 border border-[#C8A34D]/20 shrink-0 mt-0.5">
                {getBenefitIcon(item.iconName)}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#111111] dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. QR Code Scan Section */}
      <section className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="space-y-2 text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C8A34D]">
            <QrCode className="w-4 h-4" />
            <span>Scan to Download</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-[#111111] dark:text-white">
            Quick Mobile Setup
          </h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
            Scan with your phone camera to open the official app download page directly on iOS or Android.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-4 shrink-0 justify-center max-w-full">
          {/* iOS App Store QR */}
          <DownloadQRCode 
            value={storeConfig.appStoreUrl} 
            label="iOS App Store" 
            platform="ios" 
            size={90} 
          />
          {/* Android Google Play QR */}
          <DownloadQRCode 
            value={storeConfig.googlePlayUrl} 
            label="Google Play" 
            platform="android" 
            size={90} 
          />
        </div>
      </section>

      {/* 6. Web ↔ Mobile Synchronization Information Card */}
      <section className="bg-slate-100 dark:bg-[#1A1A1A] border border-[#C8A34D]/30 rounded-2xl p-5 md:p-6 max-w-4xl mx-auto flex items-start gap-4">
        <div className="p-2 rounded-lg bg-[#C8A34D]/15 text-[#C8A34D] shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-[#111111] dark:text-white">
            Your AI LEGAL™ account works across platforms.
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Sign in with the same account on Web or Mobile. Subscription access, feature usage limits and account data are managed through the shared AI LEGAL™ backend.
          </p>
        </div>
      </section>

    </div>
  );
}
