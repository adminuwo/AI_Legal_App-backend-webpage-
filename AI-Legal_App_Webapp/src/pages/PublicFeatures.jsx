import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, FileSignature, Library, Gavel, FileText, ShieldCheck,
  Cpu, ArrowRight, CheckCircle2, Sparkles, BookOpen,
  Binary, FileCheck, Brain, Mic, MessageSquare, Plus,
  Calendar, Clock, CreditCard, Bell, ChevronRight, Zap,
  Key, Briefcase, Search, Check, Play, Pause, Radio, RotateCcw,
  Menu, X
} from 'lucide-react';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter, { OfficialAppStoreBadge, OfficialGooglePlayBadge } from '../Components/PublicFooter';
import { getUserData } from '../userStore/userData';

export default function PublicFeatures() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [latency, setLatency] = useState(318);
  const [actionFeedback, setActionFeedback] = useState(null);

  const DEMO_DURATION = 4200; // 4.2 seconds per feature
  const TICK_INTERVAL = 50;   // updates progress every 50ms

  const products = [
    {
      id: 'platform',
      num: '01',
      name: 'AI Legal Platform',
      shortDesc: 'The all-in-one practice portal — case management, cause list tracking, live court alerts & client billing',
      kicker: '01 • THE FLAGSHIP',
      mainHeading: 'Your whole practice, in one workspace',
      longDesc: 'The all-in-one portal AI LEGAL is known for — where legal intelligence, live cause list tracking, client management, WhatsApp dockets and billing all run together, and keep running while you work the case.',
      route: '/dashboard',
      terminalTitle: 'ai-legal · platform',
      categoryName: 'PRACTICE AUTOMATION 04',
      badge: null,
      features: [
        {
          id: 'court-alert',
          label: 'Live Court & Board Alerts',
          tag: 'Yellow alert • hearing soon',
          tagColor: 'yellow',
          title: "Item 14 nearing board — Court 3, High Court",
          detail: "Your matter is 3 items away. Estimated call time in ~20 minutes. Senior Advocate brief notified.",
          subtext: "Auto-synced with High Court digital display board.",
          actionText: "View Board Status"
        },
        {
          id: 'billing-reminder',
          label: 'Automated Client WhatsApp Reminders',
          tag: 'Payment reminder sent',
          tagColor: 'green',
          title: "Adv. Rajesh Mehra • ₹42,000 due",
          detail: "Retainership fee reminder dispatched via WhatsApp & official email with instant UPI payment link.",
          subtext: "Delivered & Read • Payment status auto-reconciled.",
          actionText: "Track Dispatch"
        },
        {
          id: 'cause-list',
          label: 'Daily Cause List Scanner',
          tag: 'Cause List Synchronized',
          tagColor: 'blue',
          title: "4 Matters Listed for Tomorrow",
          detail: "Court 7 (Item 12), Court 14 (Item 28), Patiala House Court (Item 05), NCLT Principal Bench (Item 09).",
          subtext: "All case dockets and synopsis notes auto-attached.",
          actionText: "Open Cause List"
        },
        {
          id: 'client-crm',
          label: 'Client Case Tracking Portal',
          tag: 'Client Connect Live',
          tagColor: 'purple',
          title: "Case Status Push Update",
          detail: "Hearing outcome sent to client with next adjourned date (24th Oct) and certified copy filing status.",
          subtext: "Zero manual phone calls required.",
          actionText: "View Client Thread"
        }
      ]
    },
    {
      id: 'draft-maker',
      num: '02',
      name: 'Legal Drafting Suite',
      shortDesc: 'Court-ready petitions, bail applications, BNSS 482 notices & affidavits in minutes',
      kicker: '02 • LEGAL DRAFTING',
      mainHeading: 'Court-ready pleadings, grounded in BNS & BNSS',
      longDesc: 'Generate jurisdiction-specific legal notices, anticipatory bail applications under Section 482 BNSS, commercial suits under Order VII CPC, and writ petitions formatted strictly per Supreme Court and High Court rules.',
      route: '/dashboard/tools/draft-maker',
      terminalTitle: 'ai-legal · draft-maker',
      categoryName: 'DRAFTING ENGINES 04',
      badge: 'BNS Ready',
      features: [
        {
          id: 'bail-draft',
          label: 'Anticipatory Bail (Sec 482 BNSS)',
          tag: 'Pleading Generated • Bail Sec 482 BNSS',
          tagColor: 'green',
          title: "State of NCT of Delhi v. Ramesh Gupta",
          detail: "Grounds drafted under Section 482 BNSS with Satender Kumar Antil compliance and absence of custodial requirement.",
          subtext: "Includes Memo of Parties, Synopsis, List of Dates & Vakalatnama.",
          actionText: "Export .DOCX"
        },
        {
          id: 'sec-138-notice',
          label: 'Cheque Bounce Notice (Sec 138 NI Act)',
          tag: 'Statutory Demand Notice',
          tagColor: 'yellow',
          title: "15-Day Statutory Notice under Sec 138 NI Act",
          detail: "Dispatched with bank return memo, cheque details, ledger trail, and formal demand for ₹18,50,000 within 15 days.",
          subtext: "Includes postal tracking annexure and proof of service draft.",
          actionText: "View Notice Draft"
        },
        {
          id: 'commercial-plaint',
          label: 'Commercial Plaint (Order VII CPC)',
          tag: 'Commercial Suit Draft Ready',
          tagColor: 'blue',
          title: "Recovery Suit with Statement of Truth",
          detail: "Strictly aligned with Commercial Courts Act 2015, Order VI Rule 15A verification, and pre-institution mediation certificate.",
          subtext: "Export ready in courtroom-formatted Word (.docx) & PDF.",
          actionText: "Download Plaint"
        },
        {
          id: 'writ-petition',
          label: 'High Court Index & Memo Formatter',
          tag: 'High Court Registry Compliant',
          tagColor: 'purple',
          title: "Registry Index & Court Master Synopsis",
          detail: "Automatic index numbering, court fee calculation, and advocate sign-off blocks formatted to High Court filing rules.",
          subtext: "100% compliant with e-filing registry requirements.",
          actionText: "Verify Index"
        }
      ]
    },
    {
      id: 'precedents',
      num: '03',
      name: 'Precedents & Shepardizing',
      shortDesc: 'Deep statutory search across 3.8 Cr+ SC & HC judgments with ratio decidendi extraction & overruled alerts',
      kicker: '03 • CASE LAW INTELLIGENCE',
      mainHeading: 'Never cite an overruled precedent again',
      longDesc: 'Deep semantic search across Supreme Court and 25 High Courts from 1950 to 2026. Automatically flags overruled authorities, distinguishes obiter dicta from ratio decidendi, and extracts binding proposition paragraphs in seconds.',
      route: '/dashboard/tools/legal-precedents',
      terminalTitle: 'ai-legal · precedents',
      categoryName: 'LEGAL INTELLIGENCE 04',
      badge: '3.8 Cr+ Database',
      features: [
        {
          id: 'overruled-alert',
          label: 'Overruled Authority Shepardizer',
          tag: 'Shepardize Status • Good Law (Binding)',
          tagColor: 'green',
          title: "Satender Kumar Antil v. CBI (2022) 10 SCC 51",
          detail: "STATUS: Good Law (Affirmed). 2-Judge Bench binding precedent. Strict compliance mandatory for arrest under offenses punishable up to 7 years.",
          subtext: "Zero conflicting or overruling decisions across all High Courts.",
          actionText: "Copy Citation"
        },
        {
          id: 'ratio-extraction',
          label: 'Ratio Decidendi Extractor',
          tag: 'Ratio Decidendi Extracted',
          tagColor: 'blue',
          title: "Paragraph 43 • Core Proposition of Law",
          detail: "\"The investigating agency cannot effectuate mechanical arrest merely because it is lawful to do so. Reasoned necessity must be recorded under Section 41 CrPC / Section 35 BNSS.\"",
          subtext: "Distinguished from obiter dicta • Ready to paste into brief.",
          actionText: "Copy Ratio"
        },
        {
          id: 'bench-strength',
          label: 'Bench Strength Classifier',
          tag: 'Bench Strength Hierarchy Verified',
          tagColor: 'purple',
          title: "Constitution Bench (5-Judge) Supremacy",
          detail: "Identified precedent hierarchy: 5-Judge Constitution Bench ruling supersedes later 2-Judge division bench contrary observations.",
          subtext: "Prevents judicial bench objections during oral arguments.",
          actionText: "View Hierarchy"
        },
        {
          id: 'dual-citation',
          label: 'AIR / SCC / SCR Citation Resolver',
          tag: 'Dual Citation Match Found',
          tagColor: 'yellow',
          title: "AIR 2024 SC 1210 = (2024) 3 SCC 419",
          detail: "Cross-referenced equivalent citations across SCR, DLT, BomCR, and neutral citation registers.",
          subtext: "Automatic footnote citation formatting generated.",
          actionText: "Format Footnote"
        }
      ]
    },
    {
      id: 'evidence-analyst',
      num: '04',
      name: 'Evidence Analyst & BSA Vault',
      shortDesc: 'Section 63 BSA / 65B forensic verification, WhatsApp audit, and SHA-256 hash custody',
      kicker: '04 • DIGITAL FORENSICS',
      mainHeading: 'Courtroom-admissible electronic evidence at scale',
      longDesc: 'Audit electronic evidence under Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B IEA). Inspects WhatsApp exports, emails, and CCTV footage for hash integrity, tampering, and generates court-ready compliance certificates.',
      route: '/dashboard/tools/evidence-analyst',
      terminalTitle: 'ai-legal · evidence-vault',
      categoryName: 'FORENSIC CAPABILITIES 04',
      badge: 'BSA 63 Ready',
      features: [
        {
          id: 'bsa-cert',
          label: 'Section 63 BSA Compliance Certificate',
          tag: 'Sec 63 BSA / 65B Certificate Valid',
          tagColor: 'green',
          title: "Forensic Certificate for Electronic Record",
          detail: "SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. Device identifier, IMEI, and continuous hash sequence validated.",
          subtext: "Court-ready Section 63 BSA Affidavit generated with notary block.",
          actionText: "Download Affidavit"
        },
        {
          id: 'whatsapp-audit',
          label: 'WhatsApp Chat Export Tamper Audit',
          tag: 'Chat Log Audit Complete',
          tagColor: 'blue',
          title: "1,420 WhatsApp Messages Verified",
          detail: "Chronological integrity verified. Zero deleted gaps detected. Financial admissions highlighted with timestamp proof.",
          subtext: "Admissible in commercial recovery and criminal proceedings.",
          actionText: "View Audit Log"
        },
        {
          id: 'contradiction-matrix',
          label: 'Deposition Contradiction Matrix',
          tag: 'Witness Contradiction Flagged',
          tagColor: 'yellow',
          title: "PW-1 Deposition v. 161 Statement",
          detail: "In deposition (Para 14), witness claims seeing accused at 9:30 PM, contradicting Section 161 statement where witness claimed arriving at 11:00 PM.",
          subtext: "Cross-examination impeachment question auto-suggested.",
          actionText: "Get Counter-Q"
        },
        {
          id: 'admissibility-gauge',
          label: 'Admissibility Score & Chain of Custody',
          tag: 'Admissibility Score: 94%',
          tagColor: 'purple',
          title: "High Court Admissibility Rating: High",
          detail: "Chain of custody unbroken from device extraction to court production. Secondary evidence prerequisites satisfied.",
          subtext: "Zero foundational objections expected from opposing counsel.",
          actionText: "View Custody Log"
        }
      ]
    },
    {
      id: 'contract-analyzer',
      num: '05',
      name: 'Contract Risk Analyzer',
      shortDesc: 'Autonomous risk scoring, clause audits, and Indian Contract Act 1872 redlining',
      kicker: '05 • CONTRACT INTELLIGENCE',
      mainHeading: 'Identify lethal liabilities before signing or filing',
      longDesc: 'Analyzes commercial agreements, NDAs, concession agreements, and vendor scopes. Detects uncapped indemnities, void non-compete clauses under Section 27 ICA, and generates attorney-grade redline recommendations.',
      route: '/dashboard/tools/contract-analyzer',
      terminalTitle: 'ai-legal · contract-analyzer',
      categoryName: 'CONTRACT AUDIT 04',
      badge: 'Risk Scoring',
      features: [
        {
          id: 'uncapped-indemnity',
          label: 'Uncapped Indemnity Detection',
          tag: 'Critical Risk • Clause 14.2',
          tagColor: 'yellow',
          title: "Uncapped Consequential Indemnity Flagged",
          detail: "Clause 14.2 exposes client to unlimited indirect losses. Conflicts with Section 73 Indian Contract Act mitigation principles.",
          subtext: "Suggested Redline: Aggregate liability capped at 100% of annual fees.",
          actionText: "Apply Redline"
        },
        {
          id: 'redline-revisions',
          label: 'Redline Replacement Clause Generator',
          tag: 'Redline Clause Inserted',
          tagColor: 'green',
          title: "Mutual Limitation of Liability Clause",
          detail: "\"Neither party shall be liable for indirect, special or consequential damages. Maximum liability shall not exceed the total fees paid in preceding 12 months.\"",
          subtext: "Exportable side-by-side comparison with redline markup.",
          actionText: "Compare Redlines"
        },
        {
          id: 'dispute-seat',
          label: 'Arbitration Seat & Jurisdiction Check',
          tag: 'Jurisdiction Conflict Resolved',
          tagColor: 'blue',
          title: "Seat v. Venue Conflict Flagged",
          detail: "Contract specifies arbitration seat in Mumbai but confers exclusive jurisdiction to Delhi High Court. Harmonized per BALCO principles.",
          subtext: "Neutral arbitration clause drafted under A&C Act 1996.",
          actionText: "View Clause Fix"
        },
        {
          id: 'void-agreements',
          label: 'Void Clause Audit (Sec 23 & 27 ICA)',
          tag: 'Statutory Void Clause Warning',
          tagColor: 'purple',
          title: "Post-Termination Non-Compete Invalid",
          detail: "Clause 9.3 imposes a 2-year post-termination non-compete. Void under Section 27 Indian Contract Act as established in Percept D'Mark.",
          subtext: "Replaced with enforceable non-solicitation & IP safeguard.",
          actionText: "View Statutory Citations"
        }
      ]
    },
    {
      id: 'mock-courtroom',
      num: '06',
      name: 'AI Mock Courtroom',
      shortDesc: 'Simulate hostile judicial benches, live procedural interruptions & trial advocacy',
      kicker: '06 • TRIAL ADVOCACY',
      mainHeading: 'Pressure-test your submissions before court',
      longDesc: 'Train oral advocacy against simulated Supreme Court and High Court benches. Experience real-time procedural interruptions, locus standi objections, and aggressive judicial questioning before stepping into the courtroom.',
      route: '/dashboard/tools/mock-courtroom',
      terminalTitle: 'ai-legal · mock-courtroom',
      categoryName: 'SIMULATION MODES 04',
      badge: 'Voice AI',
      features: [
        {
          id: 'hostile-bench',
          label: 'Hostile Bench Interlocutory Rehearsal',
          tag: 'Justice R.K. Varma (Presiding Bench)',
          tagColor: 'yellow',
          title: "Bench Interlocutory Question Raised",
          detail: "\"Counsel, how do you cross the hurdle of Section 142 NI Act when your statutory notice was dispatched on the 16th day? Convince this court on condonation.\"",
          subtext: "AI Rebuttal loaded: Refer to Section 142(1)(b) proviso and postal receipt.",
          actionText: "Hear Audio Bench"
        },
        {
          id: 'voice-debate',
          label: 'Real-Time Voice Advocacy Debate',
          tag: 'Voice AI Debate Mode Active',
          tagColor: 'green',
          title: "Live Audio Oral Submissions",
          detail: "Simulates actual courtroom acoustics and judicial speech cadence. Bench cuts in when argument wanders from core question of law.",
          subtext: "Microphone active • Low-latency voice streaming.",
          actionText: "Start Voice Test"
        },
        {
          id: 'objection-practice',
          label: 'Opposing Counsel Objection Handling',
          tag: 'Opposing Counsel Objection',
          tagColor: 'blue',
          title: "\"Objection, Milord! Leading Question under BSA\"",
          detail: "Opposing counsel objects under Section 142 BSA 2023. Immediate judicial ruling simulated with suggested counsel rebuttal.",
          subtext: "Cross-examination defense playbook updated.",
          actionText: "Simulate Counter"
        },
        {
          id: 'trial-scoring',
          label: 'Trial Readiness & Courtroom Score',
          tag: 'Advocacy Readiness: 88/100',
          tagColor: 'purple',
          title: "Plea Strength & Poise Analysis",
          detail: "Legal authority grounding: 95% | Conciseness of opening submission: 85% | Rebuttal effectiveness: 84%.",
          subtext: "Full debrief report with transcript ready for download.",
          actionText: "View Scorecard"
        }
      ]
    }
  ];

  const currentProduct = products[activeProductIndex];
  const currentFeature = currentProduct.features[activeFeatureIndex] || currentProduct.features[0];

  // Auto-playing demo timer with animated progress
  useEffect(() => {
    if (!isAutoPlaying || isHovered) return;

    const step = (TICK_INTERVAL / DEMO_DURATION) * 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          // Advance to next feature
          setActiveFeatureIndex((curF) => {
            if (curF + 1 < currentProduct.features.length) {
              return curF + 1;
            } else {
              // Move to next product and reset feature to 0
              setActiveProductIndex((curP) => (curP + 1) % products.length);
              return 0;
            }
          });
          // Small realistic latency flicker
          setLatency(Math.floor(305 + Math.random() * 25));
          return 0;
        }
        return prev + step;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovered, activeProductIndex, currentProduct.features.length]);

  const handleProductSelect = (index) => {
    setActiveProductIndex(index);
    setActiveFeatureIndex(0);
    setProgress(0);
    setLatency(Math.floor(305 + Math.random() * 25));
  };

  const handleFeatureSelect = (index) => {
    setActiveFeatureIndex(index);
    setProgress(0);
    setLatency(Math.floor(305 + Math.random() * 25));
  };

  const handleSimulatedAction = (text) => {
    setActionFeedback(`⚡ Simulated: ${text}`);
    setTimeout(() => setActionFeedback(null), 2200);
  };

  const handleCta = (route) => {
    if (isAuthenticated) {
      navigate(route);
    } else {
      navigate('/login', { state: { from: route } });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#070A12] text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#B88B2A]/25 selection:text-[#111111]">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[#B88B2A]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain relative" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button onClick={() => navigate('/')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Home
            </button>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs">
              Features
            </span>
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
                <span className="text-left px-3.5 py-2 rounded-xl bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 font-bold">
                  Features
                </span>
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

      {/* Hero Section */}
      <section className="pt-16 pb-12 sm:pt-20 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[550px] h-[300px] bg-[#E5A93C]/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl space-y-6 relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-[#E5A93C] dark:text-[#B88B2A]">
            <span className="w-4 h-[2px] bg-[#E5A93C] dark:bg-[#B88B2A] inline-block" />
            THE AI LEGAL™ LITIGATION SUITE
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#0F172A] dark:text-white tracking-tight leading-[1.12]">
            All Your Legal Work,<br />
            <span className="text-[#E5A93C] dark:text-[#F59E0B]">In One Intelligent Platform.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            From case research and judgment analysis to court drafting and argument practice — everything Indian advocates need in one seamless workspace. Explore each feature below with interactive live demos.
          </p>

          {/* Stats Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#0B1120] border border-amber-200/70 dark:border-amber-900/40 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              6 products, one place
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#0B1120] border border-amber-200/70 dark:border-amber-900/40 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              Every feature, a <span className="text-[#E5A93C] dark:text-[#F59E0B] font-bold">live demo</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#0B1120] border border-amber-200/70 dark:border-amber-900/40 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              SC • 25 HCs • 30+ tribunals
            </div>
          </div>

          {/* Hero CTA Button */}
          <div className="pt-2">
            <button
              onClick={() => handleCta('/signup')}
              className="px-7 py-3.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] transition-all cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95"
            >
              Start your free trial
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ANIMATED "EXPLORE THE SUITE" SECTION (DYNAMIC LIVE DEMO ROTATION)
      ========================================================================= */}
      <section 
        className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5A93C] inline-block animate-pulse" />
              <span>Explore the suite</span>
            </div>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Pick a product. Every feature plays a live demo of exactly how AI LEGAL does it — click any feature to watch it work.
            </p>
          </div>

          {/* Interactive Play / Pause Demo Control */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0B1120] border border-amber-200/80 dark:border-amber-900/50 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:border-[#E5A93C] transition-all cursor-pointer shadow-2xs"
            >
              {isAutoPlaying ? (
                <>
                  <Pause size={12} className="text-[#E5A93C] fill-[#E5A93C]" />
                  <span>Auto Demo: Playing</span>
                </>
              ) : (
                <>
                  <Play size={12} className="text-[#E5A93C] fill-[#E5A93C]" />
                  <span>Auto Demo: Paused</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline-block">
              {isHovered ? '(Paused on hover)' : '(Cycle: 4s)'}
            </span>
          </div>
        </div>

        {/* 2-Column Suite Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 6 Product Cards with Animated Selection */}
          <div className="lg:col-span-4 space-y-2.5">
            {products.map((prod, idx) => {
              const isActive = activeProductIndex === idx;
              return (
                <motion.button
                  key={prod.id}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleProductSelect(idx)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-1.5 relative overflow-hidden ${
                    isActive
                      ? 'border-[#E5A93C] dark:border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#E5A93C]/10 shadow-md ring-1 ring-[#E5A93C]/40'
                      : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1120] hover:border-[#E5A93C]/40 hover:bg-[#FFFDF7] dark:hover:bg-[#0F172A]'
                  }`}
                >
                  {/* Subtle active glow bar on the left edge */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCardGlow"
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#FBBF24] via-[#F59E0B] to-[#D97706]"
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#E5A93C] dark:text-[#F59E0B]' : 'text-slate-400'}`}>
                        {prod.num}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {prod.name}
                      </span>
                    </div>
                    {prod.badge && (
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                        isActive
                          ? 'border-[#E5A93C]/50 bg-[#E5A93C]/15 text-[#B87A14] dark:text-[#F59E0B] font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}>
                        {prod.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-6.5">
                    {prod.shortDesc}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Right Column: Animated Live Interactive Mockup Window */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1120] overflow-hidden shadow-xl relative">
              
              {/* Window Header */}
              <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80 inline-block" />
                </div>

                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="text-[#E5A93C]">●</span> {currentProduct.terminalTitle}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFFBEB] dark:bg-[#E5A93C]/15 border border-[#E5A93C]/40 text-[10px] font-mono font-bold text-[#B87A14] dark:text-[#F59E0B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-ping inline-block" />
                    LIVE DEMO
                  </div>
                </div>
              </div>

              {/* Window Body Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
                
                {/* Visual Canvas Area (Animated Mockup Screen) */}
                <div className="md:col-span-6 bg-[#FFFDF7]/90 dark:bg-[#070A12] p-6 sm:p-8 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  
                  {/* Animated Background Scanning Beam */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-[#E5A93C]/15 to-transparent"
                    animate={{ y: ['-100%', '100%'] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                  />

                  {/* Subtle Background Outline / Skeleton */}
                  <div className="space-y-3 opacity-60 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        RECENT ACTIVITY — AUTO-UPDATED
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-mono text-[#E5A93C]">
                        <Radio size={10} className="animate-pulse" /> LIVE STREAM
                      </div>
                    </div>
                    <div className="h-2 w-36 bg-amber-200/40 dark:bg-slate-700/60 rounded" />
                    <div className="h-2 w-24 bg-amber-200/30 dark:bg-slate-700/40 rounded" />
                  </div>

                  {/* Centered Dynamic Animated Card with Floating Motion */}
                  <div className="my-6 relative z-10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${currentProduct.id}-${currentFeature.id}`}
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.96 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white dark:bg-[#0B1120] rounded-2xl p-5 shadow-2xl border border-amber-200/70 dark:border-amber-900/40 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {currentFeature.tagColor === 'yellow' && (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#E5A93C] inline-block shadow-xs shadow-amber-500/50" />
                            )}
                            {currentFeature.tagColor === 'green' && (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
                            )}
                            {currentFeature.tagColor === 'blue' && (
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs shadow-blue-500/50" />
                            )}
                            {currentFeature.tagColor === 'purple' && (
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-xs shadow-purple-500/50" />
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {currentFeature.tag}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Verified
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {currentFeature.title}
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {currentFeature.detail}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          <span className="truncate max-w-[210px]">{currentFeature.subtext}</span>
                          
                          {/* Mini Interactive Action Button inside the card */}
                          <button
                            onClick={() => handleSimulatedAction(currentFeature.actionText || 'Action Executed')}
                            className="text-[10px] font-mono font-bold text-[#E5A93C] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <span>{currentFeature.actionText || 'Simulate'}</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Temporary Simulated Action Feedback Banner */}
                    <AnimatePresence>
                      {actionFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/90 text-white text-[10px] font-mono font-bold border border-[#E5A93C]/60 shadow-lg whitespace-nowrap z-20"
                        >
                          {actionFeedback}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom Verification Footer with fluctuating latency */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 relative z-10 pt-2">
                    <span>Latency: ~{latency}ms</span>
                    <span className="text-[#E5A93C] dark:text-[#F59E0B] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      High Court Sync Active
                    </span>
                  </div>
                </div>

                {/* Right Specification & Clickable Feature Tags */}
                <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white dark:bg-[#0B1120]">
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentProduct.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3"
                      >
                        <div className="text-[11px] font-mono font-bold text-[#E5A93C] dark:text-[#F59E0B] tracking-wider">
                          {currentProduct.kicker}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                          {currentProduct.mainHeading}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {currentProduct.longDesc}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono mb-2">
                        <span>• Tap any feature to watch it work</span>
                        <span className="text-[10px] text-[#E5A93C] font-semibold">Auto-cycling</span>
                      </div>

                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E5A93C] dark:text-[#F59E0B] mb-2.5">
                        {currentProduct.categoryName}
                      </div>

                      {/* Interactive Feature Pills with Animated Progress Track */}
                      <div className="space-y-2">
                        {currentProduct.features.map((feat, fIdx) => {
                          const isFActive = activeFeatureIndex === fIdx;
                          return (
                            <button
                              key={feat.id}
                              onClick={() => handleFeatureSelect(fIdx)}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 relative overflow-hidden ${
                                isFActive
                                  ? 'bg-[#FFFBEB] dark:bg-[#E5A93C]/15 text-[#B87A14] dark:text-[#F59E0B] font-bold border border-[#E5A93C]/60 shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-amber-50/50 dark:hover:bg-slate-800/60 font-medium'
                              }`}
                            >
                              {/* Bottom Animated Progress Bar inside the Active Pill */}
                              {isFActive && isAutoPlaying && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E5A93C]/20 rounded-b-xl overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#FBBF24] to-[#D97706] transition-all"
                                    style={{ width: `${progress}%`, transitionDuration: `${TICK_INTERVAL}ms` }}
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2.5 truncate">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isFActive ? 'bg-[#E5A93C] shadow-xs shadow-amber-500/80' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                <span className="truncate">{feat.label}</span>
                              </div>

                              {isFActive && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E5A93C]/20 text-[#B87A14] dark:text-[#F59E0B] uppercase shrink-0">
                                  Active Demo
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FFFDF7] dark:bg-[#070A12] border-t border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#E5A93C]/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-[#E5A93C] dark:text-[#B88B2A] block">
            CHAMBER SCALING
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Transform Your Legal Practice Today
          </h2>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join the legal professionals who are streamlining their practice, saving hours, and focusing on winning cases.
          </p>

          <div className="pt-2">
            <button
              onClick={() => handleCta('/signup')}
              className="px-8 py-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] transition-all cursor-pointer shadow-lg shadow-amber-500/30 hover:shadow-xl active:scale-95"
            >
              Start Your Free Trial Today
            </button>
          </div>

          {/* App Store & Google Play Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.uwo.ailegal"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GET IT ON Google Play"
              className="transition-transform duration-200 hover:scale-105 active:scale-95 inline-block shadow-md cursor-pointer"
            >
              <OfficialGooglePlayBadge className="h-11 w-auto rounded-lg" />
            </a>

            <a
              href="https://apps.apple.com/in/app/ai-legal/id6797449251"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download on the App Store"
              className="transition-transform duration-200 hover:scale-105 active:scale-95 inline-block shadow-md cursor-pointer"
            >
              <OfficialAppStoreBadge className="h-11 w-auto rounded-lg" />
            </a>
          </div>
        </div>
      </section>

      {/* Reusable Public Footer Matching Reference */}
      <PublicFooter />
    </div>
  );
}
