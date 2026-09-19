import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cookie, Settings2, Smartphone, Shield, FileText, ArrowLeft,
  CheckCircle2, Lock, Scale, AlertCircle, Plus, Menu, X, ExternalLink,
  ChevronRight, Database, Server, RefreshCw
} from 'lucide-react';
import { COOKIE_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { apiService } from '../services/apiService';
import { getUserData } from '../userStore/userData';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import OurProductsDropdown from '../Components/OurProductsDropdown';

export default function CookiePolicy() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  const [sections, setSections] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('March 7, 2026');
  const [loading, setLoading] = useState(true);

  const getDynamicIcon = (index) => {
    const icons = [Lock, Settings2, Shield, Database, Server, FileText];
    return icons[index % icons.length] || FileText;
  };

  // Comprehensive AI Legal Specific Cookie & Storage Defaults
  const FALLBACK_COOKIE_SECTIONS = [
    {
      title: '1. Essential Authentication & Security Cookies',
      icon: Lock,
      content: [
        {
          subtitle: 'Account Authentication & Session Protection',
          text: 'These tokens and cookies are strictly required to operate the AI LEGAL™ litigation workspace. They hold encrypted JSON Web Tokens (JWT) and user identifiers to authenticate your account against our secure backend APIs, maintain real-time socket connections, and guard against cross-site request forgery (CSRF) or session hijacking.'
        },
        {
          subtitle: 'Zero Data Retention for Non-Logged-in Exploration',
          text: 'Public case searches and marketing pages do not set persistent identifying tracking cookies. Temporary session identifiers are purged upon closing your browser window.'
        }
      ]
    },
    {
      title: '2. Chamber Personalization & Workspace Preferences',
      icon: Settings2,
      content: [
        {
          subtitle: 'UI Theme & Visual Comfort',
          text: 'We store your preferred theme (Light Mode or High-Contrast Dark Mode) in local storage so your courtroom and late-night drafting sessions remain visually consistent without flickering on reload.'
        },
        {
          subtitle: 'Jurisdiction & Statutory Language Memory',
          text: 'Remembers your selected court jurisdiction (Supreme Court of India, specific High Courts, or statutory tribunals like NCLT/ITAT) and your default legal drafting language (English, Hindi, and regional languages) to accelerate petition generation.'
        }
      ]
    },
    {
      title: '3. Evidentiary Vault & Client Confidentiality Safeguards',
      icon: Shield,
      content: [
        {
          subtitle: 'Absolute Privilege & No Marketing Trackers in Case Vaults',
          text: 'Under our strict Advocate-Client Privilege protocol, no third-party marketing cookies, tracking pixels, or advertising beacons are ever loaded inside active case workspaces, document drafting studios, evidence vaults, or contract analysis suites.'
        },
        {
          subtitle: 'Encrypted Temporary File Buffers',
          text: 'Temporary document uploads (such as FIRs, chargesheets, and judgment PDFs) use secure, short-lived browser cache buffers that are flushed once analysis is finalized or upon manual session termination.'
        }
      ]
    },
    {
      title: '4. Telemetry, Performance & Crash Analytics',
      icon: Database,
      content: [
        {
          subtitle: 'System Health & Latency Optimization',
          text: 'We measure API response latency, judicial search engine speed, and error telemetry to optimize infrastructure load across Indian court databases. This metadata is strictly aggregated and de-identified.'
        },
        {
          subtitle: 'No Sale or Monetization Policy',
          text: 'AI LEGAL™ enforces a zero-data-broker policy. We do not sell, rent, or trade your telemetry or cookie history with advertising networks.'
        }
      ]
    },
    {
      title: '5. How Advocates and Users Can Control Cookie Preferences',
      icon: Server,
      content: [
        {
          subtitle: 'Browser-Level Controls',
          text: 'You have the right to decide whether to accept or reject cookies. You can configure your browser settings (Chrome, Safari, Firefox, or Edge) to reject all non-essential cookies. Note that disabling essential session cookies will prevent login access to your AI Legal™ Dashboard.'
        },
        {
          subtitle: 'Instant Cache & Data Purge',
          text: 'You can clear all stored site data at any time by navigating to your browser settings > Privacy & Security > Clear Browsing Data, or through the "Clear Storage & Cache" button in your AI LEGAL™ Account Settings.'
        }
      ]
    }
  ];

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await apiService.getLegalPage('cookie-policy');
        if (data && data.sections && data.sections.length > 0) {
          const mappedSections = data.sections.map((s, i) => ({
            ...s,
            icon: getDynamicIcon(i)
          }));
          setSections(mappedSections);
          if (data.lastUpdated) {
            setLastUpdated(new Date(data.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        } else {
          setSections(FALLBACK_COOKIE_SECTIONS);
        }
      } catch (err) {
        console.warn('Using fallback AI Legal cookie policy:', err);
        setSections(FALLBACK_COOKIE_SECTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#B88B2A]/25 selection:text-[#111111] transition-colors duration-300">
      
      {/* ─── Top Header Navbar (Matching Landing & Public Pages) ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[#B88B2A]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/logo/logo_transparent.png" 
                alt="AI LEGAL Logo" 
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain relative"
              />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL
              <span className="text-[10px] align-super text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => navigate('/')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/features')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Blog
            </button>
            <button 
              onClick={() => navigate('/pricing')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button 
              onClick={() => navigate('/case-search')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Case Search
            </button>
            <button 
              onClick={() => navigate('/about')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              About
            </button>
            <OurProductsDropdown />
            <button 
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
              className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />

            <button
              onClick={() => navigate('/post-judgment')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#B88B2A]/50 bg-amber-50/50 text-[#B38628] hover:bg-amber-100/60 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300 dark:hover:bg-amber-950/70 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} className="text-[#B38628] stroke-[2.5]" />
              <span>Post your judgement</span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#B88B2A]/30"
              >
                Dashboard →
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#B88B2A]/30"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
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

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-5 py-5 space-y-4 shadow-xl"
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
                <OurProductsDropdown isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/signup'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Dashboard
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/post-judgment'); }}
                  className="w-full py-2.5 rounded-full text-xs font-bold border border-[#B88B2A]/50 bg-amber-50/50 text-[#B38628] dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Post your judgement</span>
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                    className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-center shadow-md shadow-[#B88B2A]/30"
                  >
                    Go to Dashboard →
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                      className="py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold rounded-full text-center text-xs"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                      className="py-2.5 bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-white font-bold rounded-full text-center text-xs shadow-md shadow-[#B88B2A]/30"
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Main Content Container with Subtle Grid Background ─── */}
      <main className="relative overflow-hidden pt-8 pb-20 bg-[#F8FAFC] dark:bg-[#070A12] bg-[radial-gradient(#CBD5E1_1.25px,transparent_1.25px)] dark:bg-[radial-gradient(rgba(184,139,42,0.18)_1.25px,transparent_1.25px)] bg-[size:24px_24px]">
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          
          {/* Breadcrumb Back Link */}
          <div>
            <button
              onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#B88B2A] hover:underline cursor-pointer group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* ─── Hero Title Section ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B88B2A]/10 border border-[#B88B2A]/30 text-[#B88B2A] text-xs font-black uppercase tracking-wider shadow-2xs">
              <Cookie size={14} /> Legal Transparency & Data Protection
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight">
              Cookie & Local Storage Policy
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              How <span className="font-extrabold text-[#0F172A] dark:text-white">AI LEGAL</span><sup className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</sup> utilizes essential session tokens, encrypted local storage, and client privilege safeguards to deliver high-performance courtroom intelligence.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                Last Updated: <strong className="text-slate-700 dark:text-slate-200">{lastUpdated}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> DPDP Act 2023 Compliant
              </span>
            </div>
          </motion.div>

          {/* ─── Executive Summary Banner ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0 border border-[#B88B2A]/30">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                  Our Commitment to Legal Professional Privilege
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Zero invasive tracking inside judicial workspaces, briefs, or client vaults.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              This Cookie Policy describes how AI LEGAL™ ("we", "us", or "platform") utilizes cookies, local storage objects, and session tokens when you access our web application at <span className="font-mono text-[#B88B2A] text-xs">https://ailegal.aisa24.com</span>. We treat advocate-client communications with strict confidentiality and never employ tracking mechanisms that compromise litigation privacy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#161D2E] border border-amber-200/60 dark:border-amber-900/40">
                <div className="text-[11px] font-bold text-[#B88B2A] uppercase">Essential Cookies</div>
                <div className="text-xs font-black text-slate-900 dark:text-white mt-1">Encrypted Sessions</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Required for secure login & socket sync.</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#161D2E] border border-amber-200/60 dark:border-amber-900/40">
                <div className="text-[11px] font-bold text-[#B88B2A] uppercase">Preference Storage</div>
                <div className="text-xs font-black text-slate-900 dark:text-white mt-1">Theme & Jurisdiction</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Saves your preferred court benches & language.</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#161D2E] border border-amber-200/60 dark:border-amber-900/40">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Marketing Cookies</div>
                <div className="text-xs font-black text-slate-900 dark:text-white mt-1">Zero In Case Vaults</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No advertising trackers inside your cases.</div>
              </div>
            </div>
          </motion.div>

          {/* ─── Detailed Policy Sections ─── */}
          <div className="space-y-6">
            {sections.map((section, index) => {
              const IconComp = section.icon || getDynamicIcon(index);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (index + 2) }}
                  className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-[#B88B2A]/60 transition-all space-y-5"
                >
                  <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0 border border-[#B88B2A]/30">
                      <IconComp size={22} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white tracking-tight">
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-4 sm:pl-2">
                    {section.content?.map((item, idx) => (
                      <div key={idx} className="border-l-2 border-[#B88B2A]/60 pl-4 space-y-1">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {item.subtitle}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ─── Contact & Legal Compliance Chamber Box ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl p-7 sm:p-9 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-slate-900/30 border border-[#B88B2A]/30 shadow-md space-y-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#B88B2A]/20 text-[#B88B2A] flex items-center justify-center shrink-0 border border-[#B88B2A]/30">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Questions Regarding Your Data & Cookies?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Our Data Protection Officer and Legal Engineering Team are available to assist.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Official Inquiries</div>
                <a href="mailto:admin@uwo24.com" className="font-bold text-[#B88B2A] hover:underline mt-0.5 block">
                  admin@uwo24.com
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Chamber Helpline</div>
                <a href="tel:+918359890909" className="font-bold text-[#B88B2A] hover:underline mt-0.5 block">
                  +91 83589 90909
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Registered Office</div>
                <span className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5 block">
                  Jabalpur, Madhya Pradesh, India
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* ─── Standard Reusable AI Legal Footer ─── */}
      <PublicFooter />

    </div>
  );
}
