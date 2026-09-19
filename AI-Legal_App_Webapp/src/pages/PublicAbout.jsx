import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale, Shield, Lock, CheckCircle2, Award, Users, Database,
  ArrowRight, Sparkles, Building2, Gavel, Cpu, BookOpen, Globe,
  Phone, Mail, MapPin, ExternalLink, Zap, Layers, Landmark,
  Flame, TrendingUp, Check, ShieldCheck, Plus, Menu, X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import OurProductsDropdown from '../Components/OurProductsDropdown';
import { getUserData } from '../userStore/userData';

export default function PublicAbout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  const ecosystemPillars = [
    {
      id: 'aisa',
      badge: 'Unified Command Center',
      name: 'AISA™ | AI Super Assistant',
      tagline: 'The Interface Layer of the UWO™ Ecosystem',
      desc: 'Transforms fragmented enterprise tools into a unified intelligence system with multi-session context memory, multi-modal utility (search, content, code, doc conversion), and intent-based agent routing, reducing operational friction by up to 70%.',
      icon: Cpu,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'ailegal',
      badge: 'Sovereign Vertical OS',
      name: 'AI LEGAL™ | Legal Intelligence',
      tagline: 'Precision Grounding for Indian Jurisprudence',
      desc: 'Built specifically for Indian advocates, law firms, and judiciary researchers. Grounded in 75+ years of Supreme Court, High Court, and Bare Act databases with zero hallucination and Section 65B cryptographic evidence hashing.',
      icon: Scale,
      color: 'from-amber-500 to-[#B88B2A]',
    },
    {
      id: 'aimall',
      badge: 'Discovery & Distribution',
      name: 'AI Mall™ | Tools & Workflow Marketplace',
      tagline: 'Structured Marketplace Connecting Developers to Enterprise',
      desc: 'Eliminates AI adoption confusion for SMBs with curated app catalogs, secure sandbox testing, and ecosystem bundles—reducing custom AI deployment cycles from months to mere minutes.',
      icon: Layers,
      color: 'from-purple-600 to-pink-600',
    },
    {
      id: 'connect',
      badge: 'Enterprise Automation',
      name: 'AISA Connect™ | Omnichannel Infrastructure',
      tagline: 'Connecting Communication Directly into Corporate Conversion',
      desc: 'Natively links WhatsApp, website chat, and emails directly into internal CRMs, ERPs, and secure databases with automated qualification workflows, team approvals, and live task handoffs.',
      icon: Zap,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'efv',
      badge: 'Human Operating System',
      name: 'EFV™ Framework | Energy, Frequency & Vibration',
      tagline: '9-Level Consciousness & Workforce Execution Discipline',
      desc: 'Spiritual self-improvement series authored by Gurumukh P. Ahuja connecting science, spirituality, and AI across 175 countries. Available worldwide across Amazon, Google Play Books, Barnes & Noble, Ingram, and quick-commerce platforms.',
      icon: Flame,
      color: 'from-rose-500 to-amber-600',
    },
    {
      id: 'uwo_os',
      badge: 'Institutional Governance',
      name: 'UWO Institutional OS™',
      tagline: 'Evidence-Driven Governance & SOP Architecture',
      desc: 'Enterprise-grade operational compliance tracking, rigorous role-based access control, complete audit trails, and strict data governance policies designed for institutional durability.',
      icon: ShieldCheck,
      color: 'from-slate-700 to-slate-900',
    },
  ];

  const academicCollaborations = [
    {
      name: 'IIT Ropar - TBIF',
      fullName: 'Technology Business Incubator Foundation, IIT Ropar',
      location: 'Punjab, India',
      badge: 'Incubated Enterprise',
      role: 'DeepTech & Startup Incubation Validation',
      logo: '/assets/company/iit_ropar_seal.png',
      altLogo: '/assets/company/iit_ropar_tbif.png',
    },
    {
      name: 'SIBM Nagpur',
      fullName: 'Symbiosis Institute of Business Management',
      location: 'Nagpur, Maharashtra',
      badge: 'Talent & Research Engagement',
      role: 'Ongoing Management & Business Talent Incubation',
      logo: '/assets/company/sibm_nagpur.png',
    },
    {
      name: 'DNLU Jabalpur',
      fullName: 'Dharmashastra National Law University',
      location: 'Jabalpur, Madhya Pradesh',
      badge: 'National Law University Engagement',
      role: 'Academic Engagement & Judicial Research Collaboration',
      logo: '/assets/company/dnlu_jabalpur.png',
    },
    {
      name: 'Army Institute of Law (AIL)',
      fullName: 'Army Institute of Law',
      location: 'Mohali, Punjab',
      badge: 'Premier Legal Institution',
      role: 'Appreciated for Legal AI Grounding & Research',
      logo: '/assets/company/army_institute_law.png',
    },
    {
      name: 'PIMR Indore',
      fullName: 'Prestige Institute of Management & Research',
      location: 'Indore, Madhya Pradesh',
      badge: 'Autonomous Deemed University',
      role: 'Institutional Validation & Business AI Appreciation',
      logo: '/assets/company/pimr_indore.png',
    },
    {
      name: 'A. P. Narmada Law College',
      fullName: 'A. P. Narmada Law College (ESTD. 1871)',
      location: 'Jabalpur Cantt, Madhya Pradesh',
      badge: 'Historic 150+ Year Legal Heritage',
      role: 'Advocate Training & Moot Court AI Engagements',
      logo: '/assets/company/apn_law_college.png',
    },
    {
      name: 'RDVV Jabalpur',
      fullName: 'Rani Durgavati Vishwavidyalaya',
      location: 'Jabalpur, Madhya Pradesh',
      badge: 'State University Engagement',
      role: 'Academic Research & Technology Seminars',
      logo: '/assets/company/rdvv_jabalpur.png',
    },
    {
      name: 'SGTB Khalsa College',
      fullName: 'Sri Guru Tegh Bahadur Khalsa College',
      location: 'Jabalpur, Madhya Pradesh',
      badge: 'Higher Education Engagement',
      role: 'Institutional Appreciation & Student Workflows',
      logo: '/assets/company/khalsa_college.png',
    },
  ];


  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#B88B2A]/25 selection:text-[#111111]">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none">
            <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-9 h-9 object-contain" />
            <span className="text-lg font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
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
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs">
              About
            </span>
            <OurProductsDropdown />
            <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          {/* Desktop Right Header Actions */}
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
                <span className="text-left px-3.5 py-2 rounded-xl bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 font-bold">
                  About
                </span>
                <OurProductsDropdown isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}
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

      {/* ─── Hero Section: Company Overview (Compact Typography) ─── */}
      <section className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-white to-white dark:from-[#070A12] dark:via-[#0B0F19] dark:to-[#0B0F19] overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#B88B2A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-3.5 relative z-10">
          {/* Institutional Credibility Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-800 text-[10px] font-bold border border-slate-700 shadow-2xs">
              <Building2 size={11} className="text-[#B88B2A]" /> DPIIT Recognized Startup
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#B88B2A]/10 border border-[#B88B2A]/30 text-[#B38628] dark:text-[#B88B2A] text-[10px] font-extrabold shadow-2xs">
              <ShieldCheck size={11} /> DUNS Registered
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold shadow-2xs">
              <Landmark size={11} /> Incubated at IIT Ropar – TBIF
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="inline-block text-[10px] uppercase tracking-widest font-black text-[#B88B2A]">
              Corporate Profile & Heritage
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F172A] dark:text-white tracking-tight leading-snug">
              Unified Web Options & <span className="text-[#B88B2A]">Services Pvt. Ltd.</span>
            </h1>
            <p className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-normal">
              Building an Integrated AI Adoption Infrastructure Stack that transitions organizations from fragmented tools to measurable, AI-powered execution.
            </p>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Founded in 2020 and headquartered in Jabalpur, Madhya Pradesh, UWO™ architects sovereign, enterprise-grade AI systems. 
            Through its unified technology stack combining <strong>AISA™</strong>, <strong>AI LEGAL™</strong>, <strong>AI Mall™</strong>, <strong>AISA Connect™</strong>, and the <strong>EFV™ Framework</strong>, UWO provides end-to-end intelligence, workflow automation, and execution discipline for enterprises and legal chambers worldwide.
          </p>

          {/* Quick Stats Grid (Compact) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-3xl mx-auto pt-2">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">2020</div>
              <div className="text-[10px] font-semibold text-slate-500">Year Founded</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-black text-[#B88B2A]">175+</div>
              <div className="text-[10px] font-semibold text-slate-500">Countries Reached</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">3 / 100+</div>
              <div className="text-[10px] font-semibold text-slate-500">Patents & Trademarks</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
              <div className="text-lg sm:text-xl font-black text-[#B88B2A]">30+</div>
              <div className="text-[10px] font-semibold text-slate-500">Core Team Strength</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs text-center col-span-2 sm:col-span-1">
              <div className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">IIT Ropar</div>
              <div className="text-[10px] font-semibold text-slate-500">TBIF Incubated</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Founder & Ecosystem Leadership Section ─── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Founder Image & Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-xs group">
              {/* Decorative Frame Glow */}
              <div className="absolute -inset-1 bg-gradient-to-tr from-[#D4AF37] via-[#B88B2A] to-amber-200 rounded-2xl opacity-75 blur-md group-hover:opacity-100 transition duration-300" />
              
              <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-[#101726] border-2 border-[#B88B2A]/40 shadow-lg">
                <img
                  src="/assets/company/founder_gurumukh_ahuja.jpg"
                  alt="Gurumukh P. Ahuja - Founder & CEO"
                  className="w-full h-auto aspect-square object-cover object-top filter contrast-105"
                />
                
                {/* Overlay Badge */}
                <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white absolute bottom-0 inset-x-0">
                  <div className="text-base font-black tracking-tight">Gurumukh P. Ahuja</div>
                  <div className="text-[11px] font-semibold text-[#E5A93C] flex items-center gap-1">
                    <Sparkles size={11} /> Founder & Chief Executive Officer
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Unified Web Options & Services Pvt. Ltd. (UWO™)
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Badges below image */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-center">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                20+ Yrs High-Stakes Entrepreneur
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#B38628] dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Rotary Leadership
              </span>
            </div>
          </div>

          {/* Founder Bio & Strategic Vision */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B88B2A]/10 border border-[#B88B2A]/30 text-[#B38628] dark:text-[#B88B2A] text-[10px] font-extrabold uppercase tracking-wider">
                <Shield size={11} /> Founder & Ecosystem Leadership
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Architecting Human & <span className="text-[#B88B2A]">Machine Consciousness</span>
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Leading the convergence of sovereign AI infrastructure, human alignment, and legal workflow automation from India to the world.
              </p>
            </div>

            <div className="space-y-3 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                <strong>Gurumukh P. Ahuja</strong> brings over 20 years of high-stakes entrepreneurship, large-scale infrastructure development, and institutional governance to the helm of UWO™. With deep exposure across public institutions, high-level Rotary leadership, and nationwide commercial ventures, he champions technology that serves tangible, measurable execution rather than speculative hype.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                    <Sparkles size={12} className="text-[#B88B2A]" /> System Architect & Author
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Creator of the proprietary <strong>EFV™ Framework</strong> and the globally published <em>EFV Master Series™</em>, connecting science, spirituality, and workforce readiness across 175 countries.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                    <Cpu size={12} className="text-[#B88B2A]" /> Multi-Agent Ecosystem Builder
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Visionary architect behind UWO’s sovereign AI adoption stack, integrating <strong>AISA™</strong>, <strong>AI LEGAL™</strong>, <strong>AISA Connect™</strong>, and <strong>AI Mall™</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                    <Award size={12} className="text-[#B88B2A]" /> Institutional Credibility
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Backed by high-level Rotary leadership, public institutional engagements, and startup incubation at premier institutions like IIT Ropar – TBIF.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[11px] font-black text-slate-900 dark:text-white flex items-center gap-1">
                    <Users size={12} className="text-[#B88B2A]" /> 30+ Engineering Strength
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Steering a dedicated product and AI engineering workforce headquartered in Jabalpur, proving that world-class deep tech thrives from India's rising hubs.
                  </p>
                </div>
              </div>

              {/* Founder Quote */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#B88B2A]/10 to-transparent border-l-3 border-[#B88B2A] text-slate-800 dark:text-slate-200 italic text-[11px] sm:text-xs font-medium">
                “The future belongs to companies that combine artificial intelligence & automation with consciousness, human understanding, and sovereign execution discipline.”
                <span className="block text-[10px] font-black not-italic text-[#B38628] dark:text-[#B88B2A] mt-0.5">
                  — Gurumukh P. Ahuja, Founder & CEO
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ─── UWO™ Integrated Technology Stack ─── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-b border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="inline-block text-[10px] uppercase tracking-widest font-black text-[#B88B2A]">
            Proprietary Architecture
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            The UWO™ <span className="text-[#B88B2A]">Adoption Stack</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
            A cohesive multi-layer ecosystem connecting interaction, sovereign vertical intelligence, automation, and human readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecosystemPillars.map((pillar) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-[#B88B2A]/50 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#B88B2A] border border-slate-200 dark:border-slate-700">
                      {pillar.badge}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#B88B2A]/20 to-amber-500/10 text-[#B88B2A] flex items-center justify-center shadow-2xs">
                      <IconComponent size={16} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      {pillar.name}
                    </h3>
                    <div className="text-[11px] font-semibold text-[#B38628] dark:text-amber-400 mt-0.5">
                      {pillar.tagline}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                {pillar.id === 'ailegal' && (
                  <div className="pt-1.5">
                    <button
                      onClick={() => navigate('/features')}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#B88B2A]/15 hover:bg-[#B88B2A]/25 text-[#B38628] dark:text-[#B88B2A] text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Explore AI LEGAL™ Features <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Institutional Collaborations & Academic Engagements ─── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-b border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Landmark size={11} /> Institutional Credentials
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Incubations & <span className="text-[#B88B2A]">Academic Engagements</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
            Validated by premier national technology business incubators, leading law universities, and business institutes across India.
          </p>
        </div>

        {/* Highlight Banner: IIT Ropar TBIF & SIBM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:from-[#0B132B] dark:via-[#101726] dark:to-[#101726] border-2 border-blue-500/30 flex items-center gap-4 shadow-2xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-2 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <img src="/assets/company/iit_ropar_seal.png" alt="IIT Ropar Seal" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                Incubated Enterprise
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                IIT Ropar – TBIF
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-normal">
                Technology Business Incubator Foundation, Punjab. Validated under India’s premier DeepTech & Startup incubation frameworks.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-slate-50 dark:from-[#1F190B] dark:via-[#101726] dark:to-[#101726] border-2 border-[#B88B2A]/40 flex items-center gap-4 shadow-2xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-2 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <img src="/assets/company/sibm_nagpur.png" alt="SIBM Nagpur" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#B88B2A] text-[#111111] shadow-2xs">
                Talent & Research
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                SIBM Nagpur
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-normal">
                Symbiosis Institute of Business Management. Ongoing management, marketing intelligence, and corporate strategy talent incubation.
              </p>
            </div>
          </div>
        </div>

        {/* Academic Engagements Appreciated By (Grid of 6 Law & Research Institutes) */}
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              Academic Engagements Appreciated By Premier Law & University Faculties
            </h3>
            <p className="text-[10.5px] text-slate-500">
              Direct faculty interactions, student clinical training, and judicial research symposiums
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {academicCollaborations.slice(2).map((collab, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex items-start gap-3"
              >
                <div className="w-12 h-12 rounded-lg bg-white p-1.5 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <img src={collab.logo} alt={collab.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-[8.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#B88B2A]">
                    {collab.badge}
                  </span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {collab.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {collab.fullName} • {collab.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── Official Corporate Coordinates & Contact ─── */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-block text-[10px] uppercase tracking-widest font-black text-[#B88B2A]">
                Headquarters & Corporate Office
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Unified Web Options & Services Pvt. Ltd.
              </h3>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B88B2A]/10 text-[#B38628] dark:text-[#B88B2A] border border-[#B88B2A]/20">
                  DPIIT Recognized
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  DUNS Registered
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Incubated at IIT Ropar – TBIF
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly with our corporate leadership, institutional partnership division, or AI Legal™ enterprise onboarding desk.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">Corporate Headquarters</div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-tight">
                      4th Floor, SG Square, near PNB Bank, Rampur Chowk, Jabalpur, MP – 482008
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0">
                    <Mail size={14} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">Official Correspondence</div>
                    <a href="mailto:admin@uwo24.com" className="text-[10.5px] text-[#B38628] dark:text-[#B88B2A] hover:underline font-semibold">
                      admin@uwo24.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0">
                    <Phone size={14} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">Corporate Helpdesk</div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">+91 7389999999 / 8871190020</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center shrink-0">
                    <Globe size={14} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">Global Ecosystem Presence</div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-400">Live across 175+ Countries</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Interactive Office Location Map */}
            <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              {/* Map Header */}
              <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#B88B2A]/20 text-[#B88B2A] flex items-center justify-center shrink-0">
                    <MapPin size={13} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Unified Web Options & Services Pvt. Ltd.
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      SG Square, Rampur Chowk, Jabalpur
                    </div>
                  </div>
                </div>

                <a
                  href="https://maps.google.com/?q=SG+Square,+Rampur+Chowk,+Jabalpur,+Madhya+Pradesh+482008"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#B88B2A] dark:hover:text-[#B88B2A] text-[10px] font-bold border border-slate-200 dark:border-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="Open in Google Maps"
                >
                  Directions <ExternalLink size={10} />
                </a>
              </div>

              {/* Google Maps Embed */}
              <div className="relative w-full h-56 sm:h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                <iframe
                  title="UWO Headquarters Location - SG Square, Rampur Chowk, Jabalpur"
                  src="https://maps.google.com/maps?q=SG%20Square,%20Rampur%20Chowk,%20Jabalpur,%20Madhya%20Pradesh%20482008&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0 filter saturate-105 contrast-105"
                  loading="lazy"
                  allowFullScreen
                />
              </div>

              {/* Map Footer Note */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Mon – Sat (9:30 AM – 6:30 PM IST)
                </span>
                <span className="font-bold text-[#B38628] dark:text-[#B88B2A]">
                  MP – 482008
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Reusable Footer ─── */}
      <div className="mt-6">
        <PublicFooter />
      </div>
    </div>
  );
}
