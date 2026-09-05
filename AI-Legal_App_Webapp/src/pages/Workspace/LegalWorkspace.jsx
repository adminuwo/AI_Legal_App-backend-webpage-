import React, { useState, useRef, useEffect, Fragment, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, SendHorizontal, Bot, User, Sparkles, Plus, Monitor, ChevronDown, History, Paperclip, X, AlertCircle, FileText, FileCheck, Binary, Library, Image as ImageIcon, Cloud, HardDrive, Edit2, Download, Mic, Wand2, Eye, FileSpreadsheet, Presentation, File as FileIcon, MoreVertical, Trash2, Check, Camera, Video, Copy, ThumbsUp, ThumbsDown, Share, Search, Undo2, Menu as MenuIcon, Volume2, Pause, Headphones, MessageCircle, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Minus, Code, Globe, Sliders, PlayCircle, Brain, ImagePlus, PlaySquare, RefreshCcw, TrendingUp, Zap, Gavel, Navigation, Rocket, Megaphone, Scale, ArrowLeft, ChevronRight, Briefcase, Calendar, Users, FolderOpen, Save, Sun, Moon, LayoutDashboard, Maximize2, Minimize2, ArrowDown, GraduationCap } from 'lucide-react';
import LegalLogo from '../../Tools/AI_Legal/components/LegalLogo';
import { logo } from '../../constants';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import { Menu, Transition, Dialog, Listbox, Portal } from '@headlessui/react';
import { generateChatResponse, generateFollowUpPrompts } from '../../services/geminiService';
import { chatStorageService } from '../../services/chatStorageService';
import { useLanguage } from '../../context/LanguageContext';
import { useRecoilState, useRecoilValue } from 'recoil';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula as highlighterTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Loader from '../../Components/Loader/Loader';
import toast from 'react-hot-toast';
import LiveAI from '../../Components/LiveAI';
import { apiService } from '../../services/apiService';
import { useLegalToolCredits } from '../../hooks/useLegalToolCredits';
import AIHistoryPanel from '../../Components/SideBar/AIHistoryPanel';

import ModelSelector from '../../Components/ModelSelector';
const LegalToolkitCard = React.lazy(() => import('../../Tools/AI_Legal/LegalToolkitCard').catch(() => ({ default: () => null })));
import LegalPrecedents from '../../Tools/AI_Legal/LegalPrecedents';
import { PREMIUM_TOOLS } from '../../Tools/AI_Legal/constants/legalTools';
import axios from 'axios';
import { apis, API } from '../../types';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas-pro';
import { detectMode, getModeName, getModeIcon, getModeColor, MODES } from '../../utils/modeDetection';
import { copyText } from '../../utils/clipboard';
import { userData, getUserData, clearUser, sessionsData, toggleState, memoryData, activeProjectIdData, activeModeData, activeLegalToolData, activeProjectsData, legalViewData, selectedRoleState } from '../../userStore/userData';
import { usePersonalization } from '../../context/PersonalizationContext';
import OnboardingModal from '../../Components/OnboardingModal';
import PremiumUpsellModal from '../../Components/PremiumUpsellModal';
import DeleteConfirmModal from '../../Components/DeleteConfirmModal';
import { getSubscriptionDetails } from '../../services/pricingService';
import IntentSuggestionBanner from '../../Components/IntentSuggestionBanner';
import { detectIntent, mapModeToToolState } from '../../services/intentService';
import LoginRequiredModal from '../../Components/LoginRequiredModal';
import { isSuperAdmin } from '../../utils/isSuperAdmin';

import FuturisticToolCards from '../../landingpage/FuturisticToolCards';
import ModernDashboard from '../../landingpage/ModernDashboard';
import AisaTypingIndicator from '../../Components/AisaTypingIndicator';
import GmailConnectedModal from '../../Components/GmailConnectedModal';
import ShareModal from '../../Components/ShareModal';
import ProfileSettingsDropdown from '../../Components/ProfileSettingsDropdown/ProfileSettingsDropdown.jsx';
import GlobalFloatingNavbar from '../../Components/GlobalFloatingNavbar.jsx';
import { useTheme } from '../../context/ThemeContext';

// AI Legal Modular Components
import ActionCard from '../../Components/ActionCard';
import { useAILegalCRM } from '../../Tools/AI_Legal/hooks/useAILegalCRM';
import useCaseWorkspaceStore from '../../userStore/caseWorkspaceStore';
import { CaseWorkspace } from './CaseWorkspace';
import { SelectionToolbarProvider } from '../../Components/SelectionToolbar/SelectionToolbarProvider';
import useChatGeneration from '../../userStore/useChatGeneration';
import { useChatMessages } from '../../userStore/useChatMessages';
import { useGenerationStore } from '../../userStore/useGenerationStore';


const transformLegalActions = (content) => {
  if (!content) return "";

  let clean = content;

  // 1. Remove [ACTIVE TOOL: ...] tags (case insensitive, including surrounding stars/spaces)
  clean = clean.replace(/\*?\*?\[ACTIVE TOOL:.*?\]\*?\*?/gi, '');

  // 2. Remove any Suggested Actions section completely (from "Suggested Next Actions" or "Suggested Actions" to the end)
  clean = clean.replace(/(?:💡\s*)?Suggested\s+(?:Next\s+)?Actions[\s\S]*$/gi, '');

  // 3. Remove individual action cards/button patterns
  clean = clean.replace(/👉\s*\*\*.*?\*\*[\s\S]*?\(action:.*?\)/gi, '');
  clean = clean.replace(/\[ActionCard\|.*?\]\(action:.*?\)/gi, '');
  clean = clean.replace(/\[?:🔗|🔒\s*Action:.*?\]\(action:.*?\)/gi, '');

  // 4. Remove internal workflow & routing labels
  clean = clean.replace(/(?:Active Tool|Current Tool|Running Tool|Selected Tool|Assistant Engine|Pipeline|Internal AI|Selected Module|Hidden Agent|Workflow)\s*(?::|-)?\s*.*?(?:\n|$)/gi, '');

  return clean.trim();
};

const LEGAL_TOOL_WELCOME_MESSAGES = {
  legal_draft_maker: {
    title: "Draft Maker Activated ✍️",
    desc: "Create professional legal drafts like notices, affidavits, FIRs and agreements."
  },
  legal_evidence_checker: {
    title: "Evidence Analyst Activated 🔍",
    desc: "Analyze case strength, admissibility and risks from evidence."
  },
  legal_argument_builder: {
    title: "Argument Builder Activated ⚖️",
    desc: "Generate strong courtroom-ready arguments and cross-examinations."
  },
  legal_case_predictor: {
    title: "Case Predictor Activated 📊",
    desc: "Estimate case outcome probability and strength."
  },
  legal_contract_analyzer: {
    title: "Contract Analyzer Activated 📄",
    desc: "Scan contracts for risks and improve clauses."
  },
  legal_strategy_engine: {
    title: "Strategy Engine Activated 🧠",
    desc: "Plan legal strategy and case journey timeline."
  },
  legal_research_assistant: {
    title: "Research Assistant Activated 📚",
    desc: "Search and interpret laws, acts and citations."
  },
  legal_general_chat: {
    title: "Legal Chat Activated ⚖️",
    desc: "Professional legal guidance, consultation, and AI-assisted legal discussion."
  }
};

const ToolActivationMessage = ({ title, desc }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: -20 }}
    className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto min-h-[50vh]"
  >
    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20 shadow-sm shadow-primary/5">
      <Scale className="w-10 h-10 text-primary" />
    </div>
    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-4 tracking-tight">
      {title}
    </h2>
    <p className="text-slate-500 text-base sm:text-lg font-medium leading-relaxed max-w-md">
      {desc}
    </p>
    <div className="mt-10 flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
        Waiting for your input...
      </span>
    </div>
  </motion.div>
);

const Skeleton = () => (
  <div className="w-full min-w-[220px] max-w-[320px] space-y-3 animate-pulse py-2 px-1">
    <div className="h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full w-5/6" />
    <div className="h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full w-3/4 animate-pulse [animation-delay:200ms]" />
    <div className="h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full w-1/2 animate-pulse [animation-delay:400ms]" />
  </div>
);



const SendRipple = ({ onComplete }) => {

  useEffect(() => {
    if (messages.length > 0 && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [messages.length]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <motion.div
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 3.5, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onAnimationComplete={onComplete}
        className="absolute inset-0 rounded-full border-2 border-primary/40 bg-primary/5"
      />
      {/* Mini Sparkle Burst for Send */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Sparkles size={10} className="text-primary fill-current" />
          </motion.div>
        );
      })}
    </div>
  );
};






const FEEDBACK_PROMPTS = {
  en: [
    "Was this helpful?",
    "How did I do?",
    "Is this answer detailed enough?",
    "Did I answer your question?",
    "Need anything else?",
    "Is this what you were looking for?",
    "Happy to help!",
    "Let me know if you need more info",
    "Any other questions?",
    "Hope this clears things up!"
  ],
  hi: [
    "क्या यह मददगार था?",
    "मैंने कैसा किया?",
    "क्या यह जवाब पर्याप्त है?",
    "क्या मैंने आपके सवाल का जवाब दिया?",
    "कुछ और चाहिए?",
    "क्या आप यही खोज रहे थे?",
    "मदद करके खुशी हुई!",
    "अगर और जानकारी चाहिए तो बताएं",
    "कोई और सवाल?",
    "उम्मीद है यह समझ आया!"
  ]
};

const TOOL_PRICING = {
  chat: {
    models: [
      { id: 'gemini-flash', name: 'AI LEGAL™ Flash', price: 0, speed: 'Fast', description: 'Free chat model' }
    ]
  },
  image: {
    models: [
      { id: 'gemini-3.1-flash-image-preview', name: 'AI LEGAL™ Gemini 3.1 Flash', price: 45, speed: 'Fast', description: 'Latest preview — fastest Gemini AI-powered legal research' },
      { id: 'gemini-3-pro-image-preview', name: 'AI LEGAL™ Gemini 3 Pro', price: 75, speed: 'Pro', description: 'Pro-grade scene understanding & generation' },
      { id: 'gemini-2.5-flash-image', name: 'AI LEGAL™ Gemini 2.5 Flash', price: 30, speed: 'Stable', description: 'Stable & reliable production AI-powered legal research' }
    ],
    editModels: [
      { id: 'gemini-3.1-flash-image-preview', name: 'AI LEGAL™ Gemini 3.1 Flash', price: 45, speed: 'Fast', description: 'Latest preview model — fastest AI image editing' },
      { id: 'gemini-3-pro-image-preview', name: 'AI LEGAL™ Gemini 3 Pro', price: 75, speed: 'Pro', description: 'Pro-grade image editing with rich scene understanding' },
      { id: 'gemini-2.5-flash-image', name: 'AI LEGAL™ Gemini 2.5 Flash', price: 30, speed: 'Stable', description: 'Stable & reliable — production-ready image edits' }
    ]
  },
  video: {
    models: [
      { id: 'veo-3.1-fast-generate-001', name: 'AI LEGAL™ Video Fast', price: '225/5S', speed: 'Fast', description: 'Quick high-quality video generation' },
      { id: 'veo-3.1-generate-001', name: 'AI LEGAL™ Video Pro', price: '600/5S', speed: 'Cinema', description: 'Next-gen cinematic video synthesis' }
    ]
  },
  document: {
    models: [
      { id: 'gemini-2.5-flash', name: 'AI LEGAL™ Flash', price: 0, speed: 'Fast', description: 'Basic document analysis' },
      { id: 'gemini-pro', name: 'AI LEGAL™ Pro', price: 20, speed: 'Medium', description: 'Advanced document processing' },
      { id: 'gpt4', name: 'AI LEGAL™ Premium', price: 30, speed: 'Medium', description: 'Premium document analysis' }
    ]
  },
  voice: {
    models: [
      { id: 'gemini-flash', name: 'AI LEGAL™ Flash', price: 0, speed: 'Fast', description: 'Standard voice recognition' }
    ]
  }
};


const ImageViewer = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const imgRef = useRef(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(s => Math.min(Math.max(1, s + delta), 5));
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Handlers for Mobile/iOS
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setLastTouchDistance(dist);
    } else if (e.touches.length === 1 && scale > 1) {
      // Drag start
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      // Pinch Zoom
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / lastTouchDistance;
      setScale(s => Math.min(Math.max(1, s * delta), 5));
      setLastTouchDistance(dist);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      e.preventDefault(); // Prevent scroll
      setPosition({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  // Reset position if zoomed out to 1
  useEffect(() => {
    if (scale === 1) setPosition({ x: 0, y: 0 });
  }, [scale]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black/90 select-none">
      {/* Zoom Controls */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/60 rounded-full px-6 py-3 border border-white/10 shadow-sm"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal
      >
        <button onClick={handleZoomOut} className="p-2 hover: rounded-full text-white transition-colors"><Minus className="w-5 h-5" /></button>
        <span className="text-white text-sm font-bold font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="p-2 hover: rounded-full text-white transition-colors"><Plus className="w-5 h-5" /></button>
        <div className="w-px h-6 mx-2"></div>
        <button onClick={handleReset} className="p-2 hover: rounded-full text-white transition-colors" title="Reset"><RotateCcw className="w-4 h-4" /></button>
      </div>

      <div
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          className="max-w-full max-h-full object-contain pointer-events-auto"
          draggable={false}
          onLoad={() => console.log("Viewer image loaded successfully:", src)}
          onError={(e) => {
            console.error("Viewer image load failed:", src);
            if (src && !e.target.dataset.retried) {
              e.target.dataset.retried = "true";
              const isSignedUrl = src?.includes('X-Goog-Signature');
              const retryUrl = isSignedUrl
                ? src
                : src + (src.includes('?') ? '&' : '?') + 'retry=' + Date.now();
              console.log("Retrying viewer image:", retryUrl);
              e.target.src = retryUrl;
            } else {
              e.target.src = `https://placehold.co/800x600/333/eee?text=Image+Loading+Failed%0AClick+to+Retry`;
              e.target.style.cursor = 'pointer';
              e.target.onclick = (event) => {
                event.stopPropagation();
                const isSignedUrl = src?.includes('X-Goog-Signature');
                e.target.src = isSignedUrl ? src : src + (src.includes('?') ? '&' : '?') + 'reload=' + Date.now();
              };
            }
          }}
        />
      </div>
    </div>
  );
};

/* ─── Mode Branding Helper ──────────────────────────────────── */

const getModeInfo = (mode) => {
  switch (mode) {
    case MODES.DEEP_SEARCH:
      return { label: "AI Precedents Search & Citations", icon: Search, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" };
    case MODES.WEB_SEARCH:
      return { label: "AI Web Search", icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
    case MODES.IMAGE_GENERATION:
      return { label: "AI AI-Powered Legal Research", icon: ImagePlus, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" };
    case MODES.VIDEO_GENERATION:
      return { label: "AI Video Generation", icon: Video, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    case MODES.IMAGE_EDIT:
      return { label: "AI Magic Edit", icon: Wand2, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    case MODES.CODING_HELP:
      return { label: "AI Draft Maker", icon: Code, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" };
    case MODES.DOCUMENT_CONVERT:
      return { label: "AI Doc Convert", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    case MODES.FILE_ANALYSIS:
      return { label: "AI File Analysis", icon: Search, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    case MODES.LEGAL_TOOLKIT:
      return { label: "AI Legal™", icon: Scale, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-600/10 dark:bg-indigo-400/10", border: "border-indigo-600/20 dark:border-indigo-400/20" };
    case MODES.CASHFLOW:
      return { label: "AI CashFlow", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    default:
      return null;
  }
};

// ─── Per-chat sending locks (replaces the single isGlobalSending boolean) ───────
// Using a Map lets MULTIPLE chats generate simultaneously without blocking each other.
const _sendingLocks = new Map(); // chatId → { locked: boolean, lastSentTime: number }

const getSessionLock = (chatId) => {
  if (!_sendingLocks.has(chatId)) {
    _sendingLocks.set(chatId, { locked: false, lastSentTime: 0 });
  }
  return _sendingLocks.get(chatId);
};

// legacy shim
let isGlobalSending = false;
let lastMessageSentTime = 0;

const getToolDetails = (toolId, selectedRole = 'advocate') => {
  const tools = {
    legal_draft_maker: {
      title: "Draft Maker",
      emoji: "✍️",
      icon: FileText,
      desc: "Professional legal draft generation workspace for notices, agreements, petitions, and affidavits.",
      placeholder: "Describe the legal draft you want to generate..."
    },
    legal_research: {
      title: "Legal Research",
      emoji: "🔍",
      icon: Search,
      desc: "Advanced legal research tool for searching acts, sections, judgments, and precedents.",
      placeholder: "Ask about any Act, Section or Judgment..."
    },
    legal_contract_analyzer: {
      title: "Contract Analyzer",
      emoji: "📄",
      icon: FileCheck,
      desc: "Intelligent contract review workspace for detecting risks and analyzing clauses.",
      placeholder: "Upload or describe a contract for AI review..."
    },
    legal_evidence_checker: {
      title: "Evidence Analyst",
      emoji: "🕵️",
      icon: Binary,
      desc: "Admissibility checker and case proof validator for electronic and physical evidence.",
      placeholder: "Upload or describe the evidence to analyze..."
    },
    legal_argument_builder: {
      title: "Argument Builder",
      emoji: "🗣️",
      icon: Gavel,
      desc: "Courtroom strategy workspace for generating strong petitioner and respondent submissions.",
      placeholder: "Describe your case to generate courtroom arguments..."
    },
    legal_case_predictor: {
      title: "Case Predictor",
      emoji: "📊",
      icon: Scale,
      desc: "AI-powered outcome estimator for calculating success probabilities and default risk scores.",
      placeholder: "Describe your case to predict possible outcomes..."
    },
    legal_strategy_engine: {
      title: "Strategy Engine",
      emoji: "🧠",
      icon: Brain,
      desc: "Litigation roadmap and timeline planner for strategic case management.",
      placeholder: "Describe your litigation to build a legal strategy..."
    },
    legal_research_assistant: {
      title: "Research Assistant",
      emoji: "📚",
      icon: Library,
      desc: "Statutory interpretation and citation finder for courtroom research.",
      placeholder: "Ask any legal research question..."
    }
  };

  if (!tools[toolId] && ((localStorage.getItem('user_selected_role') || selectedRole) === 'law_firm')) {
    return {
      title: "AI Firm™ Assistant",
      emoji: "🏛️",
      icon: Scale,
      desc: "Your AI-powered enterprise firm assistant for research, drafting, team collaboration, and case intelligence.",
      placeholder: "Ask anything about your firm legal matter..."
    };
  }

  if (!tools[toolId] && selectedRole === 'student') {
    return {
      title: "AI Legal™ Tutor",
      emoji: "🎓",
      icon: GraduationCap,
      desc: "Your AI-powered legal learning companion for concepts, judgments, bare acts, exams, and legal research.",
      placeholder: "Ask your AI Legal Tutor anything about law, exams or case laws..."
    };
  }

  return tools[toolId] || {
    title: "AI Legal™ Assistant",
    emoji: "⚖️",
    icon: Scale,
    desc: "Your AI-powered general legal assistant for research, drafting, and case intelligence.",
    placeholder: "Ask anything about your legal matter..."
  };
};

const ROUTING_KEYWORDS = [
  {
    id: 'legal_draft_maker',
    name: 'Draft Maker',
    keywords: ["draft", "notice", "agreement", "contract", "affidavit", "lease", "rental", "notice draft", "legal notice", "power of attorney", "complaint draft", "will", "deed", "petition"]
  },
  {
    id: 'legal_evidence_checker',
    name: 'Evidence Analyst',
    keywords: ["evidence", "proof", "witness", "document check", "admissibility", "65b", "contradiction", "verify evidence", "weakness in proof", "evidence vault", "exhibit"]
  },
  {
    id: 'legal_contract_analyzer',
    name: 'Contract Analyzer',
    keywords: ["contract", "clause", "agreement terms", "liability", "indemnity", "termination clause", "review clause", "contract risk", "unfair clause", "nda", "sla"]
  },
  {
    id: 'legal_research',
    name: 'Legal Research',
    keywords: ["case law", "judgment", "supreme court", "high court", "precedent", "ruling", "citation", "verdict"]
  },
  {
    id: 'legal_argument_builder',
    name: 'Argument Builder',
    keywords: ["argument", "cross examination", "cross-exam", "rebuttal", "counter-argument", "defense points", "prosecution points", "pleading", "courtroom questions"]
  },
  {
    id: 'legal_case_predictor',
    name: 'Case Predictor',
    keywords: ["predict", "outcome", "chance of winning", "success rate", "probability", "win probability", "verdict prediction"]
  },
  {
    id: 'legal_strategy_engine',
    name: 'Strategy Engine',
    keywords: ["strategy", "roadmap", "timeline", "hearing strategy", "settlement", "litigation plan", "opponent move"]
  },
  {
    id: 'legal_research_assistant',
    name: 'Research Assistant',
    keywords: ["act", "section", "ipc", "bns", "crpc", "cpc", "constitution", "article", "provision", "statute", "legal provision"]
  }
];

const matchRoutingKeywords = (content) => {
  if (!content) return null;
  const lower = content.toLowerCase();
  for (const item of ROUTING_KEYWORDS) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        return item;
      }
    }
  }
  return null;
};

const TOOL_CHIP_DETAILS = {
  legal_my_case: { name: 'Assistant', icon: '⚖️' },
  legal_draft_maker: { name: 'Draft Maker', icon: '📝' },
  legal_contract_analyzer: { name: 'Contract Analyzer', icon: '📄' },
  legal_evidence_checker: { name: 'Evidence Analyst', icon: '🔍' },
  legal_research: { name: 'Research', icon: '📚' },
  legal_argument_builder: { name: 'Arguments', icon: '⚔️' },
  legal_case_predictor: { name: 'Predictor', icon: '📊' },
  legal_strategy_engine: { name: 'Strategy', icon: '🎯' },
  legal_research_assistant: { name: 'Research Assistant', icon: '🧠' }
};

const CASE_ASSISTANT_TOOLS = [
  { id: 'legal_my_case', name: 'AI Legal™ Assistant', icon: '⚖️' },
  { id: 'legal_draft_maker', name: 'Draft Maker', icon: '📝' },
  { id: 'legal_evidence_checker', name: 'Evidence Analyst', icon: '🔍' },
  { id: 'legal_contract_analyzer', name: 'Contract Analyzer', icon: '📄' },
  { id: 'legal_research', name: 'Legal Research', icon: '📚' },
  { id: 'legal_argument_builder', name: 'Argument Builder', icon: '⚔️' },
  { id: 'legal_case_predictor', name: 'Case Predictor', icon: '📊' },
  { id: 'legal_strategy_engine', name: 'Strategy Engine', icon: '🎯' },
  { id: 'legal_research_assistant', name: 'Research Assistant', icon: '🧠' }
];

const getToolTypingMessage = (tool) => {
  const toolKey = String(tool || '').toLowerCase().trim();
  if (toolKey.includes('my_case') || toolKey.includes('case assistant') || toolKey.includes('case_assistant')) {
    return "Analyzing case details...";
  }
  if (toolKey.includes('contract_analyzer') || toolKey.includes('contract analyzer') || toolKey.includes('contract clauses')) {
    return "Reviewing contract clauses...";
  }
  if (toolKey.includes('evidence_checker') || toolKey.includes('evidence analyst') || toolKey.includes('evidence_analyst') || toolKey.includes('evidence')) {
    return "Analyzing evidence...";
  }
  if (toolKey.includes('research_assistant') || toolKey.includes('research assistant') || toolKey.includes('legal authorities')) {
    return "Searching legal authorities...";
  }
  if (toolKey.includes('strategy_engine') || toolKey.includes('strategy engine') || toolKey.includes('legal strategy')) {
    return "Developing legal strategy...";
  }
  if (toolKey.includes('argument_builder') || toolKey.includes('argument builder') || toolKey.includes('legal arguments')) {
    return "Building legal arguments...";
  }
  if (toolKey.includes('case_predictor') || toolKey.includes('case predictor') || toolKey.includes('possible outcomes') || toolKey.includes('possible outcome')) {
    return "Evaluating possible outcomes...";
  }
  if (toolKey.includes('legal_precedent') || toolKey.includes('legal precedent') || toolKey.includes('precedent') || toolKey.includes('legal_research') || toolKey.includes('research') || toolKey.includes('acts & judgments')) {
    if (toolKey.includes('research_assistant') || toolKey.includes('research assistant')) {
      return "Searching legal authorities...";
    }
    return "Searching relevant precedents...";
  }
  if (toolKey.includes('draft_maker') || toolKey.includes('draft maker') || toolKey.includes('legal draft')) {
    return "Preparing legal draft...";
  }
  return "Thinking...";
};

const LARGE_PROMPT_LIBRARY = {
  popular: [
    "Draft Legal Notice",
    "Research IPC/BNS Section",
    "Summarize a Case",
    "Analyze a Contract",
    "How to respond to a breach of contract notice?",
    "Key provisions of the Arbitration and Conciliation Act",
    "What are the grounds for contesting a will?",
    "Explain the concept of quantum meruit",
    "Draft a notice for non-payment of rent",
    "Research landmark judgments on right to privacy",
    "What is the limitation period for filing a civil suit?",
    "How to register a trademark in India?",
    "Explain the difference between cognizable and non-cognizable offences",
    "What is the procedure to file a PIL?",
    "Explain public trust doctrine in environmental law"
  ],
  courtroom: [
    "Prepare Court Arguments",
    "Predict Case Outcome",
    "Build Litigation Strategy",
    "Find Supreme Court Judgments",
    "Draft an opening statement for a property dispute",
    "How to cross-examine a forensic expert witness",
    "Find judgments on Section 34 of Arbitration Act",
    "Strategy for defending a defamation suit",
    "Prepare arguments for anticipatory bail under CrPC/BNSS",
    "Analyze a judge's past rulings on intellectual property cases",
    "Prepare courtroom responses to hearsay objections",
    "Litigation strategy for partition suits",
    "How to argue a revision petition in High Court",
    "Prepare submission for permanent injunction",
    "How to raise preliminary objections in a written statement",
    "Strategy for defending a medical negligence claim",
    "How to prove electronic records under the Evidence Act"
  ],
  documents: [
    "Review Agreement",
    "Analyze Evidence",
    "Summarize Judgment",
    "Draft Petition",
    "Check NDA for one-sided liability clauses",
    "Analyze admissibility of WhatsApp chat evidence",
    "Draft a special leave petition (SLP) summary",
    "Summarize a 200-page merger agreement",
    "Review employment contract non-compete clause",
    "Analyze digital signature validity under IT Act",
    "Draft a written statement in reply to a civil suit",
    "Analyze weaknesses in a lease deed",
    "Review a franchise agreement for hidden royalty fees",
    "Check a master services agreement for IP ownership rights",
    "Analyze a bank guarantee clause for unconditional invocation",
    "Review a joint venture agreement for deadlock resolution mechanisms",
    "Analyze the validity of an unregistered gift deed"
  ],
  research: [
    "Explain IPC Section",
    "Explain BNS Section",
    "Compare Two Judgments",
    "Find Relevant Case Law",
    "Explain IPC 420 definition and punishments",
    "Explain BNS Section 318 changes from IPC 420",
    "Compare Kesavananda Bharati vs State of Kerala with Minerva Mills",
    "Find latest case law on secondary evidence admissibility",
    "Explain the doctrine of basic structure",
    "What is the difference between culpable homicide and murder?",
    "Research case laws on Section 138 of NI Act",
    "Explain the procedure for police custody under BNSS",
    "Research landmark judgments on Section 377",
    "Explain the doctrine of absolute liability",
    "What is the concept of constructive res judicata?",
    "Explain BNS provisions on organized crime",
    "Research case laws on domestic violence protection orders"
  ],
  drafting: [
    "Draft FIR",
    "Draft Bail Application",
    "Draft Affidavit",
    "Draft Appeal",
    "Draft Consumer Complaint",
    "Draft Reply Notice",
    "Draft a partnership deed with profit sharing clauses",
    "Draft a power of attorney for property management",
    "Draft a cease and desist letter for trademark infringement",
    "Draft a promissory note format",
    "Draft a gift deed for ancestral property",
    "Draft a motion for summary judgment",
    "Draft a divorce petition on grounds of mutual consent",
    "Draft a board resolution for executing contracts",
    "Draft a confidentiality agreement for contractors",
    "Draft an application under Section 91 of CrPC/BNSS",
    "Draft a replication to a written statement",
    "Draft a notice of motion for temporary injunction",
    "Draft a legal heir certificate application",
    "Draft a mortgage deed with redemption clauses",
    "Draft an arbitration clause for a commercial contract",
    "Draft a legal opinion on property title verification",
    "Draft a delay condonation application"
  ],
  analysis: [
    "Analyze Contract Risks",
    "Review Court Order",
    "Explain Legal Notice",
    "Analyze FIR",
    "Identify Missing Evidence",
    "Analyze a commercial lease for hidden charges",
    "Analyze a winding-up petition under Companies Act",
    "Identify gaps in prosecution's chain of custody",
    "Analyze a property sale deed for clear title transfer",
    "Review an arbitral award for potential appeal grounds",
    "Analyze a charge sheet filed by police",
    "Review a dynamic software license agreement",
    "Analyze liability limitations in a service level agreement (SLA)",
    "Explain the legal implications of a partition deed",
    "Analyze dynamic force majeure clauses post-COVID",
    "Review a public interest litigation (PIL) petition for locus standi",
    "Analyze the validity of an oral partition agreement",
    "Identify discrepancies in witness deposition statements",
    "Review a show cause notice for tax non-compliance",
    "Analyze a joint development agreement for developer default risk"
  ]
};

const SURPRISE_ME_PROMPTS = [
  "Explain a recent Supreme Court judgment.",
  "Teach me a new legal concept.",
  "Show today's legal drafting tip.",
  "Generate a sample consumer complaint.",
  "Explain an important constitutional article.",
  "Compare IPC vs BNS for a specific offence.",
  "Teach today's legal Latin maxim.",
  "Show today's landmark case.",
  "Explain one important CPC provision.",
  "Explain one CrPC/BNSS procedure.",
  "Show one contract drafting best practice.",
  "Generate a random legal interview question.",
  "Teach one courtroom advocacy technique.",
  "Explain one important Evidence Act principle.",
  "Show today's legal compliance checklist."
];

const LEARNING_PROMPTS = [
  "Learn Something New",
  "Today's Legal Concept",
  "Legal Tip of the Day",
  "Landmark Judgment of the Day",
  "Drafting Best Practice",
  "Advocacy Tip",
  "Courtroom Strategy Tip"
];

const TOOL_SPECIFIC_SUGGESTIONS = {
  legal_research: [
    { label: "Find relevant case law for my issue", prompt: "Find relevant case law for my issue." },
    { label: "Explain IPC/BNS Section", prompt: "Explain the IPC/BNS Section." },
    { label: "Research Supreme Court judgments", prompt: "Research Supreme Court judgments." },
    { label: "Compare two legal provisions", prompt: "Compare two legal provisions." },
    { label: "Find applicable constitutional articles", prompt: "Find applicable constitutional articles." },
    { label: "Summarize recent legal developments", prompt: "Summarize recent legal developments." }
  ],
  legal_draft_maker: [
    { label: "Draft a Legal Notice", prompt: "Draft a Legal Notice." },
    { label: "Draft a Consumer Complaint", prompt: "Draft a Consumer Complaint." },
    { label: "Draft an Affidavit", prompt: "Draft an Affidavit." },
    { label: "Draft a Bail Application", prompt: "Draft a Bail Application." },
    { label: "Draft an FIR", prompt: "Draft an FIR." },
    { label: "Draft a Rental Agreement", prompt: "Draft a Rental Agreement." }
  ],
  legal_contract_analyzer: [
    { label: "Review this Contract", prompt: "Review this Contract." },
    { label: "Identify Risk Clauses", prompt: "Identify Risk Clauses." },
    { label: "Explain Contract Terms", prompt: "Explain Contract Terms." },
    { label: "Suggest Missing Clauses", prompt: "Suggest Missing Clauses." },
    { label: "Summarize this Agreement", prompt: "Summarize this Agreement." },
    { label: "Check Legal Compliance", prompt: "Check Legal Compliance." }
  ],
  legal_evidence_checker: [
    { label: "Analyze Uploaded Evidence", prompt: "Analyze Uploaded Evidence." },
    { label: "Detect Missing Evidence", prompt: "Detect Missing Evidence." },
    { label: "Build Evidence Timeline", prompt: "Build Evidence Timeline." },
    { label: "Find Weak Evidence", prompt: "Find Weak Evidence." },
    { label: "Verify Supporting Documents", prompt: "Verify Supporting Documents." },
    { label: "Suggest Additional Proof", prompt: "Suggest Additional Proof." }
  ],
  legal_argument_builder: [
    { label: "Build Plaintiff Arguments", prompt: "Build Plaintiff Arguments." },
    { label: "Build Defence Arguments", prompt: "Build Defence Arguments." },
    { label: "Generate Counter Arguments", prompt: "Generate Counter Arguments." },
    { label: "Cross Examination Questions", prompt: "Cross Examination Questions." },
    { label: "Final Court Submission", prompt: "Final Court Submission." },
    { label: "Strengthen My Arguments", prompt: "Strengthen My Arguments." }
  ],
  legal_case_predictor: [
    { label: "Predict Case Outcome", prompt: "Predict Case Outcome." },
    { label: "Estimate Success Probability", prompt: "Estimate Success Probability." },
    { label: "Analyze Litigation Risks", prompt: "Analyze Litigation Risks." },
    { label: "Compare Possible Outcomes", prompt: "Compare Possible Outcomes." },
    { label: "Recommend Next Legal Step", prompt: "Recommend Next Legal Step." },
    { label: "Predict Hearing Result", prompt: "Predict Hearing Result." }
  ],
  legal_strategy_engine: [
    { label: "Build Litigation Strategy", prompt: "Build Litigation Strategy." },
    { label: "Settlement Strategy", prompt: "Settlement Strategy." },
    { label: "Hearing Preparation", prompt: "Hearing Preparation." },
    { label: "Evidence Checklist", prompt: "Evidence Checklist." },
    { label: "Next Legal Action", prompt: "Next Legal Action." },
    { label: "Winning Strategy", prompt: "Winning Strategy." }
  ],
  legal_research_assistant: [
    { label: "Explain a Legal Concept", prompt: "Explain a Legal Concept." },
    { label: "Teach Today's Legal Topic", prompt: "Teach Today's Legal Topic." },
    { label: "Landmark Judgment Explained", prompt: "Landmark Judgment Explained." },
    { label: "Legal Quiz", prompt: "Legal Quiz." },
    { label: "Drafting Tip of the Day", prompt: "Drafting Tip of the Day." },
    { label: "Recommend Learning Resources", prompt: "Recommend Learning Resources." }
  ]
};

const chipsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
};

const chipItemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const LegalWorkspace = () => {
  const checkLimitLocally = () => true;
  const refreshSubscription = () => { };

  // Premium access check: fires event for upsell modal if user is on free plan
  const [isPremiumUser, setIsPremiumUser] = React.useState(null);
  const [userPlanName, setUserPlanName] = React.useState('');
  const [isAdminUser, setIsAdminUser] = React.useState(false);

  useEffect(() => {
    const user = getUserData();
    if (!user?.token) {
      setIsPremiumUser(false);
      setIsAdminUser(false);
      return;
    }

    // Admin Access Rule
    if ((user.email && user.email.toLowerCase() === 'admin@uwo24.com') || (user.role === 'admin') || isSuperAdmin(user)) {
      setIsAdminUser(true);
      setIsPremiumUser(true);
      setUserPlanName(isSuperAdmin(user) ? 'AI LEGAL™ Super Admin' : 'AI LEGAL™ Admin');
      return; // Skip server subscription check for admin
    }

    getSubscriptionDetails()
      .then(data => {
        const hasSub = data?.subscription && data.subscription?.planId;
        const hasPaidPlan = hasSub && (data.subscription?.planId?.priceMonthly > 0 || data.subscription?.planId?.priceYearly > 0);
        setIsPremiumUser(hasPaidPlan || data?.founderStatus || false);
        setUserPlanName(data?.subscription?.planId?.planName || '');
      })
      .catch(() => setIsPremiumUser(false));
  }, []);

  const user = getUserData();
  const isAdmin = user?.token && (user?.role === 'admin' || user?.email === 'admin@uwo24.com' || isSuperAdmin(user));

  const checkPremiumTool = (toolName) => {
    if (!user?.token) {
      window.dispatchEvent(new CustomEvent('login_required', { detail: { toolName } }));
      return false;
    }

    // Admin Access Rule: Treat all tools as unlocked
    if (user.email === 'admin@uwo24.com' || isAdminUser || isSuperAdmin(user)) return true;

    if (isPremiumUser === null) return true; // still loading, allow optimistically

    // Lock Video features for Free users
    if (['Generate Video', 'Image to Video', 'Image to Case Prediction'].includes(toolName)) {
      if (!isPremiumUser) {
        window.dispatchEvent(new CustomEvent('premium_required', {
          detail: {
            toolName,
            customMessage: `Video features are locked for free users. Please subscribe to an active plan to unlock Text-to-Video and Image-to-Case Prediction Cards.`
          }
        }));
        return false;
      }

      const plan = (userPlanName || '').toLowerCase();
      if (plan.includes('starter') || plan.includes('founder')) {
        window.dispatchEvent(new CustomEvent('premium_required', {
          detail: {
            toolName,
            customMessage: `Text to Video features are not available on the ${userPlanName || 'current'} plan. Please upgrade to Pro or Business to generate videos.`
          }
        }));
        return false;
      }
    }

    // All other tools (Image, Code, etc.) are available to free users using their 500 complimentary credits!
    return true;
  };

  const handleCopyImage = async (imageUrl) => {
    if (!imageUrl) return;

    // ── Strategy 1: Modern Clipboard API (HTTPS / localhost only) ──────────
    const isSecureContext = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const proxiedUrl = `${apis.imageProxy}?url=${encodeURIComponent(imageUrl)}`;

    if (isSecureContext && navigator.clipboard?.write) {
      const t = toast.loading('Copying image...');
      try {
        const blob = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas blob failed')), 'image/png');
            } catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = proxiedUrl;
        });

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.dismiss(t);
        toast.success('Image copied! ✨');
        return;
      } catch (err) {
        toast.dismiss(t);
        console.warn('[CopyImage] Secure clipboard failed, trying fallback:', err.message);
        // fall through to next strategy
      }
    }

    // ── Strategy 2: HTTP fallback — copy the direct image URL to clipboard ──
    // navigator.clipboard.writeText works on HTTP in some browsers
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(imageUrl);
        toast.success('Image link copied! Open it and right-click → Save/Copy. 🔗', { duration: 4000 });
        return;
      }
    } catch (err) {
      console.warn('[CopyImage] writeText also blocked:', err.message);
    }

    // ── Strategy 3: execCommand fallback (legacy HTTP environments) ──────────
    try {
      const textArea = document.createElement('textarea');
      textArea.value = imageUrl;
      textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (success) {
        toast.success('Image link copied! Open it and right-click → Save/Copy. 🔗', { duration: 4000 });
        return;
      }
    } catch (err) {
      console.warn('[CopyImage] execCommand fallback failed:', err.message);
    }

    // ── Strategy 4: Open image in new tab so user can copy/save manually ────
    toast(
      (toastId) => (
        <span className="flex flex-col gap-1.5">
          <span className="font-bold text-xs">📋 Browser Copy Blocked</span>
          <span className="text-[10px] opacity-80 leading-tight">
            This site runs on HTTP — browser blocks clipboard access. Your image has been opened in a new tab. Please right-click → <strong>Copy Image</strong> or <strong>Save Image As</strong>.
          </span>
        </span>
      ),
      { duration: 5000, icon: '🖼️' }
    );
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };
  const { sessionId: routeSessionId, caseId } = useParams();
  const [currentCaseSessionId, setCurrentCaseSessionId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';

  // Role Isolation Effect — Refetch cases and reset chat state when user switches roles
  useEffect(() => {
    console.log(`[Role Isolation] Active role changed to: ${selectedRole}. Resetting workspace & chat context...`);
    setCurrentCase(null);
    setMessages([]);
    localStorage.removeItem('aisa_current_case');
    localStorage.removeItem('aisa_active_project_id');
    apiService.getProjects().then(projs => {
      if (Array.isArray(projs)) {
        setAllProjects(projs);
        setProjects(projs);
      }
    }).catch(err => console.warn("Failed to refetch projects on role change:", err));
  }, [selectedRole]);
  const querySessionId = new URLSearchParams(location.search).get('sessionId');
  const sessionId = routeSessionId || querySessionId || currentCaseSessionId;
  const rawCaseId = caseId || new URLSearchParams(location.search).get('caseId');
  const activeCaseId = (rawCaseId && typeof rawCaseId === 'string' && rawCaseId.trim().length > 0 && rawCaseId !== 'null' && rawCaseId !== 'undefined' && rawCaseId !== 'new' && rawCaseId !== 'all' && rawCaseId !== 'default')
    ? rawCaseId
    : null;
  const { personalizations, getSystemPromptExtensions, updatePersonalization } = usePersonalization();
  const { language: currentLang, toolkitLanguage, t } = useLanguage();
  const isDarkMode = personalizations?.general?.theme === 'Dark' ||
    (personalizations?.general?.theme !== 'Light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [messages, setMessages] = useChatMessages(sessionId || 'new');
  const [suggestions, setSuggestions] = useState([]);
  const [excelHTML, setExcelHTML] = useState(null);
  const [textPreview, setTextPreview] = useState(null);
  const [sessions, setSessions] = useRecoilState(sessionsData);
  const [inputValue, setInputValue] = useState('');
  const [longTextPreview, setLongTextPreview] = useState(null);
  const [isAutoPreviewDisabled, setIsAutoPreviewDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState((!!sessionId && sessionId !== 'new') || !!caseId);
  const [isAiPanelFullscreen, setIsAiPanelFullscreen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    return localStorage.getItem('aisa_history_panel_open') === 'true';
  });
  const [historyWidth, setHistoryWidth] = useState(() => {
    return parseInt(localStorage.getItem('aisa_history_panel_width') || '360', 10);
  });

  const startResizing = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    const startWidth = historyWidth;
    const startX = mouseDownEvent.clientX;

    const doDrag = (mouseMoveEvent) => {
      const currentWidth = startWidth + (mouseMoveEvent.clientX - startX);
      if (currentWidth >= 320 && currentWidth <= 600) {
        setHistoryWidth(currentWidth);
        localStorage.setItem('aisa_history_panel_width', currentWidth.toString());
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }, [historyWidth]);

  useEffect(() => {
    localStorage.setItem('aisa_history_panel_open', isHistoryOpen ? 'true' : 'false');
  }, [isHistoryOpen]);

  const handleSelectSession = (session) => {
    const caseIdVal = session.projectId?._id || session.projectId;
    let targetUrl;
    if (caseIdVal) {
      targetUrl = `/dashboard/cases/${caseIdVal}?sessionId=${session.sessionId}`;
    } else {
      targetUrl = `/dashboard/chat/${session.sessionId}`;
    }
    setIsHistoryOpen(false);
    navigate(targetUrl);
  };

  const messagesEndRef = useRef(null);
  const activeSessionId = sessionId || 'new';

  // ─── Global Parallel Generation Store ─────────────────────────────────────
  // This enables background generation to continue even if the user navigates
  // to another chat. The sidebar reads `generatingChatIds` to show live icons.
  const gen = useChatGeneration(activeSessionId);

  const { updateWorkspace, getWorkspace } = useCaseWorkspaceStore();
  const handleSendMessageRef = useRef(null);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  useEffect(() => {
    window.handleAisaAction = (text) => {
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current(null, text);
      }
    };
    return () => {
      delete window.handleAisaAction;
    };
  }, []);

  const [tglState, setTglState] = useRecoilState(toggleState);

  useEffect(() => {
    setTglState(prev => ({ ...prev, focusMode: isAiPanelFullscreen }));
    return () => {
      setTglState(prev => ({ ...prev, focusMode: false }));
    };
  }, [isAiPanelFullscreen, setTglState]);
  const [memory, setMemoryRecoil] = useRecoilState(memoryData);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentShareId, setCurrentShareId] = useState(null);

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [pregeneratedPdfs, setPregeneratedPdfs] = useState({}); // Stores { msgId: FileObject }
  // WhatsApp Share Modal State
  const [waShareModal, setWaShareModal] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waPdfUrl, setWaPdfUrl] = useState('');
  const [waUploading, setWaUploading] = useState(false);
  const [waMsgContent, setWaMsgContent] = useState('');
  const [isMagicEditing, setIsMagicEditing] = useState(false);
  const [isMagicImageModalOpen, setIsMagicImageModalOpen] = useState(false);

  // ─── Global Parallel Generation Store Sync ───────────────────────────────
  // Use refs to mirror local state so the effect can read them without needing
  // them in the dependency array (which would cause a re-registration loop).
  const isLoadingRef = useRef(false);
  const typingMessageIdRef = useRef(null);

  useEffect(() => {
    if (gen.isGenerating) {
      if (!isLoadingRef.current) {
        isLoadingRef.current = true;
        setIsLoading(true);
      }
      if (gen.typingMessageId && gen.typingMessageId !== typingMessageIdRef.current) {
        typingMessageIdRef.current = gen.typingMessageId;
        setTypingMessageId(gen.typingMessageId);
      }
      if (gen.partialResponse && gen.typingMessageId) {
        setMessages(prev => {
          const hasMsg = prev.some(m => m.id === gen.typingMessageId);
          if (!hasMsg) {
            // Inject missing message (race condition safety)
            return [...prev, {
              id: gen.typingMessageId,
              role: 'model',
              content: gen.partialResponse,
              timestamp: Date.now()
            }];
          }
          return prev.map(m =>
            m.id === gen.typingMessageId
              ? { ...m, content: gen.partialResponse }
              : m
          );
        });
      }
    } else {
      if (isLoadingRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
      if (typingMessageIdRef.current) {
        typingMessageIdRef.current = null;
        setTypingMessageId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.isGenerating, gen.partialResponse, gen.typingMessageId]);
  const [editRefImage, setEditRefImage] = useState(null);
  const [isMagicVideoModalOpen, setIsMagicVideoModalOpen] = useState(false);
  const [isSocialMediaDashboardOpen, setIsSocialMediaDashboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const [isBrainHovered, setIsBrainHovered] = useState(false);
  const [isMicHovered, setIsMicHovered] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
  const [isAttachHovered, setIsAttachHovered] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isHoveredMenu, setIsHoveredMenu] = useState(false);
  const [isBrainTapped, setIsBrainTapped] = useState(false);
  const [isMicTapped, setIsMicTapped] = useState(false);
  const [isSendTapped, setIsSendTapped] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [ripples, setRipples] = useState([]);
  const { handleToolUsage } = useLegalToolCredits();
  const DISCOVERY_PROMPTS = [
    "Draft a Legal Notice...",
    "Research Section 138 NI Act...",
    "Analyze this Agreement...",
    "Prepare Court Arguments...",
    "Summarize this Judgment...",
    "Predict Case Outcome..."
  ];
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [discoveryIndex, setDiscoveryIndex] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const type = () => {
      const currentPrompt = DISCOVERY_PROMPTS[discoveryIndex];

      if (isDeleting) {
        setTypedPlaceholder(currentPrompt.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setTypedPlaceholder(currentPrompt.substring(0, charIndex + 1));
        charIndex++;
      }

      let typingSpeed = isDeleting ? 30 : 50;

      if (!isDeleting && charIndex === currentPrompt.length) {
        isDeleting = true;
        typingSpeed = 3000; // Pause at end before deleting
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        setDiscoveryIndex((prev) => (prev + 1) % DISCOVERY_PROMPTS.length);
        return; // Hand over to the next effect run
      }

      timeoutId = setTimeout(type, typingSpeed);
    };

    timeoutId = setTimeout(type, 500); // Initial pause before typing starts for this word
    return () => clearTimeout(timeoutId);
  }, [discoveryIndex]);

  const TOOL_PLACEHOLDERS = {
    image: "Describe the image you want to generate in detail...",
    video: "Describe the video scene you want to create...",
    audio: "Paste text to generate natural-sounding audio...",
    code: "Write or paste code...",
    deep_search: "Enter a topic for in-depth AI research and analysis...",
    web_search: "Search for live updates or ask anything to the web...",
    document: "Upload a document and ask me to summarize or analyze it...",
    edit_image: "Describe the changes you want to make to the image...",
    image_to_video: "Describe how you want to animate this image...",
    ai_cashflow: "Enter a stock symbol or ask about financial trends...",
    aiad_agent: "Describe your brand or product for social media content...",
    legal_general_chat: "Ask your legal question...",
    legal: "Describe your legal issue..."
  };

  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [filePreviews, setFilePreviews] = useState([]);
  const [activeAgent, setActiveAgent] = useState({ agentName: 'AI Ads', category: 'General' });
  const [userAgents, setUserAgents] = useState([]);
  const hasLoadedAgentsRef = useRef(false);
  const [toolModels, setToolModels] = useState({
    chat: 'gemini-2.5-flash',
    image: 'gemini-2.5-flash',
    document: 'gemini-2.5-flash',
    voice: 'gemini-2.5-flash'
  });
  const uploadInputRef = useRef(null);
  const driveInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Attachment Menu State
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // Cases (Projects) Feature State
  const [projects, setProjects] = useState([]);
  const [currentCase, setCurrentCase] = useState(() => {
    try {
      const saved = localStorage.getItem('aisa_current_case');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [isCasePanelOpen, setIsCasePanelOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState({}); // { [msgId]: true/false }
  const USER_MSG_COLLAPSE_CHARS = 200; // Collapse threshold

  // --- MY CASE CRM STATES ---
  const [legalView, setLegalView] = useRecoilState(legalViewData); // 'DASHBOARD' | 'CHAT' | 'PRECEDENTS'

  useEffect(() => {
    if (legalView) {
      localStorage.setItem('aisa_legal_view', legalView);
    }
  }, [legalView]);

  useEffect(() => {
    if (currentCase) {
      localStorage.setItem('aisa_current_case', JSON.stringify(currentCase));
    } else {
      localStorage.removeItem('aisa_current_case');
    }
  }, [currentCase]);

  const [allProjects, setAllProjects] = useRecoilState(activeProjectsData);
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('aisa_selected_language') || 'English');
  const [isQuickActionsModalOpen, setIsQuickActionsModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('aisa_selected_language', selectedLanguage);
  }, [selectedLanguage]);

  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningTime, setListeningTime] = useState(0);
  const timerRef = useRef(null);
  const attachBtnRef = useRef(null);
  const menuRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [selectedToolType, setSelectedToolType] = useState(null);
  const [currentMode, setCurrentMode] = useRecoilState(activeModeData);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [isImageGeneration, setIsImageGeneration] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isAudioConvertMode, setIsAudioConvertMode] = useState(false);
  const [isDocumentConvert, setIsDocumentConvert] = useState(false);
  const [isCodeWriter, setIsCodeWriter] = useState(false);
  const [isFileAnalysis, setIsFileAnalysis] = useState(false);
  const [isCashFlowMode, setIsCashFlowMode] = useState(() => localStorage.getItem('aisa_cashflow_mode') === 'true');
  const [isStockModalOpen, setIsStockModalOpen] = useState(() => localStorage.getItem('aisa_stock_modal_open') === 'true');
  const [selectedStock, setSelectedStock] = useState(() => {
    try {
      const saved = localStorage.getItem('aisa_selected_stock');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [stockSearchResults, setStockSearchResults] = useState([]);
  const [isSearchingStocks, setIsSearchingStocks] = useState(false);
  const [isVideoGeneration, setIsVideoGeneration] = useState(false);
  const [activeLegalToolkit, setActiveLegalToolkit] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [caseAiActiveTool, setCaseAiActiveTool] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const caseIdInUrl = params.get('caseId');
    if (caseIdInUrl && caseIdInUrl !== 'null' && caseIdInUrl !== 'undefined' && caseIdInUrl !== 'new' && caseIdInUrl !== 'all' && caseIdInUrl !== 'default') {
      // safe fallback because store may not be ready
      try {
        const saved = localStorage.getItem('aisa_active_project_id');
        const activeProjId = saved || caseIdInUrl;
        const savedTool = localStorage.getItem('aisa_active_legal_tool_data');
        if (savedTool) {
          const parsed = JSON.parse(savedTool);
          if (parsed?.id && parsed.id.startsWith('legal_')) return parsed.id;
        }
      } catch (e) { }
    }
    return 'legal_my_case';
  });
  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
  const [unlockedTools, setUnlockedTools] = useState([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [selectedLegalTool, setSelectedLegalTool] = useRecoilState(activeLegalToolData);
  const excludedFloatingNavTools = ['legal_my_case', 'legal_precedents', 'legal-precedents', 'my-case', 'legal_precedents_search'];
  const showFloatingNavbar = false;

  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoModelId, setVideoModelId] = useState('veo-3.1-fast-generate-001');
  const [editModelId, setEditModelId] = useState('gemini-2.5-flash');
  const [videoResolution, setVideoResolution] = useState('1080p');
  const v = personalizations?.voice || { languageCode: 'en-US', voiceName: 'en-US-Chirp3-HD-Autonoe', pitch: 0, speed: 1.0 };
  const [audioLangCode, setAudioLangCode] = useState(v.languageCode);
  const [audioVoiceName, setAudioVoiceName] = useState(v.voiceName);
  const [audioPitch, setAudioPitch] = useState(v.pitch);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const token = user?.token;
  const [audioSpeed, setAudioSpeed] = useState(v.speed);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const manualToolSelectionRef = useRef(null);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const sampleAudioRef = useRef(null);
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash');
  const [isMagicSettingsOpen, setIsMagicSettingsOpen] = useState(false);
  const abortControllerRef = useRef(null);
  const voiceUsedRef = useRef(false); // Track if voice input was used

  const [showGmailModal, setShowGmailModal] = useState(false);

  // ─── Connector OAuth Callback Handler ───
  // Guard ensures the navigate() call only runs once per connector callback,
  // preventing the URL change from re-triggering this effect.
  const connectorCallbackHandledRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connectorSuccess = params.get('connector_success');
    const connectorError = params.get('connector_error');

    if ((connectorSuccess === 'true' || !!connectorError) && !connectorCallbackHandledRef.current) {
      connectorCallbackHandledRef.current = true;
      if (connectorSuccess === 'true') {
        setShowGmailModal(true);
      } else {
        toast.error('Failed to connect Gmail. Please try again from Settings > Connectors.', { duration: 3000 });
      }
      // Clean the URL — use replaceState directly to avoid triggering location change
      window.history.replaceState({}, '', location.pathname);
    } else if (!connectorSuccess && !connectorError) {
      // Reset guard when there is no connector param (normal navigation)
      connectorCallbackHandledRef.current = false;
    }
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Direct Feature Link Handling & Persistence ───
  // Guard prevents this from re-running when navigate() updates location.pathname
  const lastHandledSearchRef = useRef(null);
  useEffect(() => {
    // Only process each unique search string once to avoid navigate() loops
    if (location.search === lastHandledSearchRef.current) return;

    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode')?.toLowerCase();
    const toolParam = params.get('tool')?.toLowerCase();

    if (toolParam === 'ai_ads') {
      lastHandledSearchRef.current = location.search;
      setIsSocialMediaDashboardOpen(true);
      return; // Do not clear the URL parameter so it persists on refresh
    }

    if (modeParam || (toolParam && !toolParam.startsWith('legal_'))) {
      lastHandledSearchRef.current = location.search;
      // Simply clear other params and land in chat without any popups or auto-activations
      window.history.replaceState({}, '', location.pathname);
    }

    // Redirect non-case AI tool URL parameters to dedicated non-chat tool routes
    const TOOL_ROUTE_MAP = {
      legal_draft_maker: '/dashboard/tools/draft-maker',
      legal_contract_analyzer: '/dashboard/tools/contract-analyzer',
      legal_evidence_checker: '/dashboard/tools/evidence-analyst',
      legal_case_predictor: '/dashboard/tools/case-predictor',
      legal_strategy_engine: '/dashboard/tools/strategy-engine',
      legal_argument_builder: '/dashboard/tools/argument-builder',
      legal_precedents: '/dashboard/tools/legal-precedents',
      legal_research: '/dashboard/tools/knowledge-hub',
    };

    if (!activeCaseId && toolParam && TOOL_ROUTE_MAP[toolParam]) {
      navigate(TOOL_ROUTE_MAP[toolParam], { replace: true });
      return;
    }

    // Auto-activate legal tools from URL if they exist (only inside case assistant)
    if (activeCaseId && toolParam?.startsWith('legal_') && selectedLegalTool?.id !== toolParam) {
      if (manualToolSelectionRef.current === toolParam) {
        manualToolSelectionRef.current = null;
        return;
      }
      lastHandledSearchRef.current = location.search;
      const legalTool = PREMIUM_TOOLS.find(t => t.id === toolParam);
      activateToolWithTypingEffect(toolParam, legalTool?.name, true);
    }

    // Reset to normal chat if on new session with no specific tool/case/state
    // This ensures landing on /dashboard/chat/new always shows the tool grid
    // We only reset if NO tool is currently active to avoid clearing user intent
    if (activeSessionId === 'new' && !params.get('caseId') && !params.get('tool') && !location.state?.fromTool && !activeTool && !activeLegalToolkit) {
      if (currentMode === 'LEGAL_TOOLKIT') {
        console.log("[Route] Resetting Legal Toolkit mode for new session");
        setCurrentMode('NORMAL_CHAT');
        setSelectedLegalTool(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, activeSessionId, location.state?.fromTool]);


  // Sync AI Ads Dashboard state to the URL so it persists on refresh
  useEffect(() => {
    const url = new URL(window.location);
    if (isSocialMediaDashboardOpen) {
      url.searchParams.set('tool', 'ai_ads');
    } else {
      url.searchParams.delete('tool');
    }
    window.history.replaceState({}, '', url);
  }, [isSocialMediaDashboardOpen]);




  const inputRef = useRef(null); // Ref for textarea input
  const welcomeSearchRef = useRef(null); // Ref for welcome screen search bar
  const [welcomeInputValue, setWelcomeInputValue] = useState('');
  const transcriptRef = useRef(''); // Ref for speech transcript
  const isManualStopRef = useRef(false); // Track manual stop to avoid recursive loops
  const isDetectionPausedRef = useRef(false); // Pause detection after explicit dismissal
  const [currentProjectId, setCurrentProjectId] = useRecoilState(activeProjectIdData);

  // ─── Deep Link Case Handling (MASTER PERSISTENCE) ───
  const lastHydratedRef = useRef(null);
  const lastProcessedCaseIdRef = useRef(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const caseIdInUrl = params.get('caseId') || caseId;

    if (caseIdInUrl && caseIdInUrl !== 'null' && caseIdInUrl !== 'undefined' && caseIdInUrl !== 'new' && caseIdInUrl !== 'all' && caseIdInUrl !== 'default') {
      if (lastProcessedCaseIdRef.current !== caseIdInUrl) {
        lastProcessedCaseIdRef.current = caseIdInUrl;

        // 1. Sync Project ID & Case Object
        if (currentProjectId !== caseIdInUrl) {
          console.log(`[DeepLink] Case ID detected: ${caseIdInUrl}`);
          setCurrentProjectId(caseIdInUrl);
          localStorage.setItem('aisa_active_project_id', caseIdInUrl);
        }
        if (!currentCase || (currentCase._id !== caseIdInUrl && currentCase.id !== caseIdInUrl)) {
          const found = (allProjects || []).find(p => p._id === caseIdInUrl || p.id === caseIdInUrl);
          if (found) {
            setCurrentCase(found);
          } else {
            apiService.getProjects().then(projs => {
              if (Array.isArray(projs)) {
                setAllProjects(projs);
                const p = projs.find(x => x._id === caseIdInUrl || x.id === caseIdInUrl);
                if (p) setCurrentCase(p);
              }
            }).catch(err => console.warn("Failed to sync deep link case:", err));
          }
        }

        // 2. Hydrate Workspace Metadata (Tools/Views)
        if (currentMode !== 'LEGAL_TOOLKIT') setCurrentMode('LEGAL_TOOLKIT');

        // AI tools must NOT automatically open when opening a case. Always default to My Case Assistant.
        if (selectedLegalTool?.id !== 'legal_my_case') setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
        if (activeTool !== 'legal') setActiveTool('legal');
        if (caseAiActiveTool !== 'legal_my_case') setCaseAiActiveTool('legal_my_case');

        if (legalView !== 'CHAT') setLegalView('CHAT');
        if (activeLegalToolkit) setActiveLegalToolkit(false);

        // 3. Hydrate Messages & Session Recovery
        if (lastHydratedRef.current !== caseIdInUrl) {
          lastHydratedRef.current = caseIdInUrl;

          const restoreSession = async () => {
            const ws = getWorkspace(caseIdInUrl);
            // Hydrate messages from store first (instant UI)
            if (ws?.messages && ws.messages.length > 0 && messages.length === 0) {
              console.log(`[Persistence] Restoring ${ws.messages.length} messages from workspace store.`);
              setMessages(ws.messages);
            }

            // If no sessionId in URL, find the last one for this case
            if (!routeSessionId && !querySessionId) {
              try {
                const caseSessions = await chatStorageService.getSessions(caseIdInUrl);
                if (Array.isArray(caseSessions) && caseSessions.length > 0) {
                  const lastSid = caseSessions[0].sessionId;
                  console.log(`[Persistence] Resolving last case session ID: ${lastSid}`);
                  setCurrentCaseSessionId(lastSid);
                } else {
                  console.log(`[Persistence] No sessions found for case: ${caseIdInUrl}. Resetting to new.`);
                  setCurrentCaseSessionId(null);
                }
              } catch (err) {
                console.error("[Persistence] Failed to fetch case sessions:", err);
              }
            } else {
              setCurrentCaseSessionId(null);
            }
          };
          restoreSession();
        }
      }
    } else if (!caseIdInUrl && !location.pathname.startsWith('/dashboard/case') && (sessionId === 'new' || !sessionId)) {
      lastHydratedRef.current = null;
      lastProcessedCaseIdRef.current = null;
      // If we are in a general chat route and there's no caseId in URL, 
      // reset the active case context so they return to normal chat mode
      if (currentProjectId && currentProjectId !== 'default' && currentProjectId !== 'all') {
        console.log("[Navigation] Resetting case context since no caseId in route/URL");
        setCurrentProjectId('default');
        localStorage.setItem('aisa_active_project_id', 'default');
        setCurrentCase(null);
        // Only reset mode if it was locked to a case tool
        if (currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case') {
          setCurrentMode('NORMAL_CHAT');
          setSelectedLegalTool(null);
          setActiveTool(null);
        }
      }
    }
  }, [location.search, location.pathname, caseId, sessionId, currentProjectId, setCurrentProjectId, setCurrentMode, setMessages, setLegalView, setActiveLegalToolkit, selectedLegalTool, currentMode]);

  // Listen for 'forceGlobal' navigation state to reset case context
  useEffect(() => {
    if (location.state?.forceGlobal) {
      console.log("[Navigation] Force Global Dashboard requested. Resetting context.");
      setCurrentProjectId('default');
      localStorage.setItem('aisa_active_project_id', 'default');
      setCurrentCase(null);
      setMessages([]);

      const searchParams = new URLSearchParams(location.search);
      const toolParam = searchParams.get('tool');

      if (!toolParam) {
        setCurrentMode('NORMAL_CHAT');
        setSelectedLegalTool(null);
        setActiveTool(null);
        setActiveLegalToolkit(false);
        setLegalView('CHAT');
      }

      // Clear the state so it doesn't re-fire on other renders, preserving tool queries
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, location.search, navigate, setCurrentProjectId, setCurrentMode, setSelectedLegalTool, setMessages, setLegalView, setActiveTool, setActiveLegalToolkit, setCurrentCase]);

  // Auto-send prompt if `prompt` and `autoSend=true` query parameters are present in URL
  const processedPromptRef = useRef(null);
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlPrompt = searchParams.get('prompt');
    const autoSend = searchParams.get('autoSend');

    if (urlPrompt && (autoSend === 'true' || autoSend === '1') && processedPromptRef.current !== urlPrompt) {
      processedPromptRef.current = urlPrompt;

      // Clean up URL query parameters so refreshing doesn't re-trigger
      searchParams.delete('prompt');
      searchParams.delete('autoSend');
      const newQueryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
      navigate(`${location.pathname}${newQueryStr}`, { replace: true });

      // Automatically trigger handleSendMessage after mounting
      setTimeout(() => {
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(null, urlPrompt);
        }
      }, 150);
    }
  }, [location.search, location.pathname, navigate]);


  const [intentSuggestion, setIntentSuggestion] = useState(null);
  const [isIntentLoading, setIsIntentLoading] = useState(false);
  const [dashboardCategory, setDashboardCategory] = useState('create');
  const [expandedMessageIds, setExpandedMessageIds] = useState(new Set());

  const toggleExpandMessage = (id) => {
    setExpandedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };
  const lastDetectedTextRef = useRef('');

  const {
    renderCaseDashboard,
    renderNewCaseModal,
    handleUseInArgument,
    legalCases,
    isRenamingCase,
    renameValue,
    setRenameValue,
    handleRenameCase,
    setIsRenamingCase,
    handleDeleteCase,
    handleBackToDashboard,
    setIsNewCaseModalOpen,
    setEditingCaseId,
    handleLegalPrecedentsBack,
    fetchLegalCases
  } = useAILegalCRM({
    allProjects,
    setAllProjects,
    currentProjectId,
    setCurrentProjectId,
    currentCase,
    setCurrentCase,
    currentMode,
    setCurrentMode,
    selectedLegalTool,
    setSelectedLegalTool,
    setMessages,
    inputRef,
    setInputValue,
    setIsCasePanelOpen,
    setActiveLegalToolkit,
    legalView,
    setLegalView,
    activeTool,
    setActiveTool,
    setDashboardCategory
  });

  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [recentSurpriseMe, setRecentSurpriseMe] = useState([]);
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false);

  const getSuggestionClickCount = (text) => {
    try {
      const saved = localStorage.getItem('aisa_suggestion_click_counts');
      const counts = saved ? JSON.parse(saved) : {};
      return counts[text] || 0;
    } catch (e) {
      return 0;
    }
  };

  const recordSuggestionClick = (text) => {
    try {
      const saved = localStorage.getItem('aisa_suggestion_click_counts');
      const counts = saved ? JSON.parse(saved) : {};
      counts[text] = (counts[text] || 0) + 1;
      localStorage.setItem('aisa_suggestion_click_counts', JSON.stringify(counts));
    } catch (e) { }
  };

  // Generate randomized & prioritized suggestions based on the active tool and workspace role
  const generateSuggestions = () => {
    const activeRole = localStorage.getItem('user_selected_role') || selectedRole || 'advocate';
    const activeToolId = selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool');

    // If it's general AI Legal Assistant or AI Legal Tutor (no tool or unknown tool), use role-scoped quick actions
    const isGeneralCopilot = !activeToolId || !['legal_draft_maker', 'legal_research', 'legal_contract_analyzer', 'legal_evidence_checker', 'legal_argument_builder', 'legal_case_predictor', 'legal_strategy_engine', 'legal_research_assistant'].includes(activeToolId);

    if (isGeneralCopilot) {
      const isStudentRole = activeRole === 'student' || selectedRole === 'student' || location.pathname.includes('/tutor');
      const generalRemaining = isStudentRole ? [
        { label: "📖 Article 21 Rights & Cases", prompt: "Explain Article 21 of Indian Constitution simply with key landmark cases." },
        { label: "⚖️ IPC 300 vs Culpable Homicide", prompt: "Explain Section 300 IPC vs Culpable Homicide with clear examples." },
        { label: "📚 Kesavananda Bharati Ratio", prompt: "Summarize Kesavananda Bharati case law ratio decidendi in IRAC format." },
        { label: "🎯 Judiciary Exam MCQs", prompt: "Generate 5 practice MCQs on Constitutional Law & Fundamental Rights." },
        { label: "🎓 Moot Court Memorial Draft", prompt: "Help me structure a Moot Court Memorial Argument for Appellant." },
        { label: "✍️ Indian Contract Act Sec 10", prompt: "Explain Section 10 of Indian Contract Act 1872 valid contract elements." }
      ] : [
        { label: "📑 Draft Sec 483 BNSS Bail", prompt: "Draft a formal bail application under Section 483 BNSS (CrPC 439) with grounds." },
        { label: "⚖️ Sec 138 NI Act Precedents", prompt: "Search latest Supreme Court precedents on Section 138 Negotiable Instruments Act." },
        { label: "📝 Draft Legal Notice", prompt: "Draft a formal legal notice for breach of contract with damages claim." },
        { label: "🛡️ Cross-Examination Strategy", prompt: "Generate cross-examination questions for witness in court." },
        { label: "📄 Property Partition Suit Plaint", prompt: "Draft a suit for partition of ancestral property under Hindu Succession Act." },
        { label: "💼 Draft NDA Agreement", prompt: "Draft a standard Non-Disclosure Agreement (NDA) under Indian law." },
        { label: "🔍 Contract Risk Analysis", prompt: "Analyze contract clauses for hidden legal risks and liabilities." },
        { label: "🧾 Consumer Court Complaint", prompt: "Draft a consumer court complaint for deficiency of service." }
      ];

      const sortedTemplates = [...generalRemaining].sort((a, b) => {
        const countA = getSuggestionClickCount(a.prompt);
        const countB = getSuggestionClickCount(b.prompt);
        if (countA !== countB) return countB - countA;
        return 0.5 - Math.random();
      });

      return [
        { label: "✨ Surprise Me", prompt: "SURPRISE_ME" },
        ...sortedTemplates.slice(0, 5)
      ];
    }

    const toolPrompts = TOOL_SPECIFIC_SUGGESTIONS[activeToolId] || [];
    if (toolPrompts.length === 0) return [];

    const sortedToolPrompts = [...toolPrompts].sort((a, b) => {
      const countA = getSuggestionClickCount(a.prompt);
      const countB = getSuggestionClickCount(b.prompt);
      if (countA !== countB) return countB - countA;
      return 0.5 - Math.random();
    });

    return sortedToolPrompts;
  };

  // Regeneration trigger on session, role, path, or tool change
  const serializedCases = (legalCases || []).map(c => `${c._id || c.id}-${c.name}-${c.updatedAt}`).join(',');
  useEffect(() => {
    setIsSuggestionsExpanded(false);
    setQuickSuggestions(generateSuggestions());
  }, [activeSessionId, selectedRole, selectedLegalTool, serializedCases, location.pathname]);

  const handleSurpriseMeClick = () => {
    let availablePrompts = SURPRISE_ME_PROMPTS.filter(p => !recentSurpriseMe.includes(p));
    if (availablePrompts.length === 0) {
      availablePrompts = SURPRISE_ME_PROMPTS;
    }
    const randomPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    setRecentSurpriseMe(prev => {
      const next = [...prev, randomPrompt];
      if (next.length > 5) {
        next.shift();
      }
      return next;
    });
    handleSuggestionClick(randomPrompt);
  };

  // ─── Mobile Scroll Reset for Legal Views ──────────────────────────────────
  // Ensure that when a case is opened or the legal view changes, we start from the top
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && currentMode === 'LEGAL_TOOLKIT') {
      if (chatContainerRef.current) {
        // Reset scroll position to top instantly
        chatContainerRef.current.scrollTop = 0;
        // Also ensure any smooth scroll animations are canceled
        chatContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [currentProjectId, legalView, sessionId, location.pathname]);





  // ─── Tool & Dashboard State Persistence (Survive Refresh) ─────────────────

  // SAVE: persist mode states whenever they change
  useEffect(() => {
    if (currentMode) {
      localStorage.setItem('aisa_active_mode', currentMode);
    } else {
      localStorage.removeItem('aisa_active_mode');
    }
  }, [currentMode]);

  useEffect(() => {
    if (selectedLegalTool) {
      localStorage.setItem('aisa_active_legal_tool_data', JSON.stringify(selectedLegalTool));
      if (currentProjectId) updateWorkspace(currentProjectId, { activeTool: selectedLegalTool });
    } else {
      localStorage.removeItem('aisa_active_legal_tool_data');
    }
  }, [selectedLegalTool, currentProjectId]);

  useEffect(() => {
    localStorage.setItem('aisa_cashflow_mode', JSON.stringify(isCashFlowMode));
  }, [isCashFlowMode]);

  useEffect(() => {
    localStorage.setItem('aisa_stock_modal_open', JSON.stringify(isStockModalOpen));
  }, [isStockModalOpen]);


  useEffect(() => {
    if (currentCase) {
      localStorage.setItem('aisa_current_case', JSON.stringify(currentCase));
      if (currentCase._id) updateWorkspace(currentCase._id, { updatedAt: Date.now() });
    } else {
      localStorage.removeItem('aisa_current_case');
    }
  }, [currentCase]);

  useEffect(() => {
    if (selectedStock) {
      localStorage.setItem('aisa_selected_stock', JSON.stringify(selectedStock));
    } else {
      localStorage.removeItem('aisa_selected_stock');
    }
  }, [selectedStock]);

  useEffect(() => {
    if (activeTool) {
      localStorage.setItem('aisa_active_legal_tool', activeTool);
    } else {
      localStorage.removeItem('aisa_active_legal_tool');
    }
  }, [activeTool]);

  useEffect(() => {
    if (currentProjectId && currentProjectId !== 'default') {
      localStorage.setItem('aisa_active_project_id', currentProjectId);
    } else {
      localStorage.removeItem('aisa_active_project_id');
    }
  }, [currentProjectId]); // Main persistence

  useEffect(() => {
    if (legalView) {
      localStorage.setItem('aisa_legal_view', legalView);
    }
  }, [legalView]);

  const [deleteConfig, setDeleteConfig] = useState({
    isOpen: false,
    title: "Delete Message?",
    description: "Are you sure you want to delete this message? This action cannot be undone.",
    onConfirm: () => { }
  });

  const toolsBtnRef = useRef(null);
  const toolsMenuRef = useRef(null);

  useEffect(() => {
    if (isImageGeneration) { setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isImageGeneration]);
  useEffect(() => {
    if (isVideoGeneration) { setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsImageGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isVideoGeneration]);
  useEffect(() => {
    if (isDeepSearch) { setIsImageGeneration(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isDeepSearch]);
  useEffect(() => {
    if (isWebSearch) { setIsImageGeneration(false); setIsDeepSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isWebSearch]);
  useEffect(() => {
    if (isAudioConvertMode) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isAudioConvertMode]);
  useEffect(() => {
    if (isDocumentConvert) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isDocumentConvert]);
  useEffect(() => {
    if (isCodeWriter) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isCodeWriter]);
  useEffect(() => {
    if (isMagicEditing) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isMagicEditing]);
  useEffect(() => {
    if (isFileAnalysis) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isFileAnalysis]);
  useEffect(() => {
    if (isMagicVideoModalOpen) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsCashFlowMode(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isMagicVideoModalOpen]);
  useEffect(() => {
    if (isCashFlowMode) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setActiveLegalToolkit(false); setCurrentMode(null); setSelectedLegalTool(null); }
  }, [isCashFlowMode]);
  useEffect(() => {
    if (activeLegalToolkit) { setIsImageGeneration(false); setIsDeepSearch(false); setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false); setIsCodeWriter(false); setIsVideoGeneration(false); setIsMagicEditing(false); setIsFileAnalysis(false); setIsMagicVideoModalOpen(false); setIsCashFlowMode(false); setIsStockModalOpen(false); }
  }, [activeLegalToolkit]);

  // ─── Intent Detection Logic (Routing System) ──────────────────────────────
  useEffect(() => {
    // Only detect if input is long enough and not already loading/paused
    const text = inputValue.trim();
    if (text.length < 12 || isIntentLoading || isDetectionPausedRef.current) {
      if (text.length < 8) setIntentSuggestion(null); // Clear once they delete text
      return;
    }

    // Check if we've already detected for this EXACT text prefix to avoid spam
    if (text.startsWith(lastDetectedTextRef.current) && lastDetectedTextRef.current.length > 0 && text.length - lastDetectedTextRef.current.length < 5) {
      return;
    }

    // Heuristic: Check for action keywords before calling expensive LLM
    const actionKeywords = ['make', 'create', 'search', 'find', 'convert', 'write', 'draw', 'video', 'music', 'banao', 'dalo', 'edit', 'animate', 'code', 'optimize', 'debug', 'refactor', 'script', 'legal', 'notice', 'draft', 'agreement', 'affidavit', 'case', 'court', 'analyze', 'summarize'];
    const hasKeyword = actionKeywords.some(k => text.toLowerCase().includes(k));
    if (!hasKeyword) return;

    const debounceTimer = setTimeout(async () => {
      setIsIntentLoading(true);
      lastDetectedTextRef.current = text;

      try {
        const result = await detectIntent(text, filePreviews, messages);
        if (result && result.success && result.intent !== 'normal_chat' && result.confidence > 0.6) {
          setIntentSuggestion(result);
        } else {
          setIntentSuggestion(null);
        }
      } catch (err) {
        console.error("Intent detection failed:", err);
      } finally {
        setIsIntentLoading(false);
      }
    }, 700);

    return () => clearTimeout(debounceTimer);
  }, [inputValue, filePreviews.length]);

  const handleAcceptSuggestion = (suggestion, forceOpenToolkit = true) => {
    const user = getUserData();
    if (!user?.token) {
      window.dispatchEvent(new CustomEvent('login_required', { detail: { toolName: suggestion.intent.replace('_', ' ') } }));
      return;
    }
    const toolUpdates = mapModeToToolState(suggestion.frontend_mode);

    // Deactivate all first (safety)
    setIsImageGeneration(false); setIsVideoGeneration(false); setIsDeepSearch(false);
    setIsWebSearch(false); setIsAudioConvertMode(false); setIsDocumentConvert(false);
    setIsCodeWriter(false); setIsMagicEditing(false); setIsFileAnalysis(false);
    setIsCashFlowMode(false);
    setActiveLegalToolkit(false);

    // Dynamic activation based on map
    if (toolUpdates.activeImageGen) { setIsImageGeneration(true); }
    if (toolUpdates.activeVideoGen) {
      if (toolUpdates.videoMode === 'image_to_video') {
        setIsMagicVideoModalOpen(true);
      } else {
        setIsVideoGeneration(true);
      }
    }
    if (toolUpdates.activeMagicEdit) setIsMagicEditing(true);
    if (toolUpdates.activeAudioTalk) setIsAudioConvertMode(true);
    if (toolUpdates.webSearchMode) setIsWebSearch(true);
    if (toolUpdates.deepSearchMode) setIsDeepSearch(true);
    if (toolUpdates.activeFileAnalysis) setIsFileAnalysis(true);
    if (toolUpdates.activeCodeWriter) setIsCodeWriter(true);

    if (toolUpdates.activeLegalToolkit) {
      setActiveLegalToolkit(forceOpenToolkit);
      // Auto-select tool if intent matches a specific legal tool
      if (suggestion.intent && suggestion.intent.startsWith('legal_')) {
        const toolId = suggestion.intent;
        const toolMap = {
          'legal_free_chat': 'Legal Assistant',
          'legal_draft_maker': 'Draft Maker',
          'legal_nda_generator': 'NDA Generator',
          'legal_contract_analyzer': 'Contract Analyzer',
          'legal_case_predictor': 'Case Predictor',
          'legal_evidence_checker': 'Evidence Checker',
          'legal_notice_generator': 'Legal Notice',
          'legal_affidavit_generator': 'Affidavit Gen',
          'legal_clause_scanner': 'Clause Scanner',
          'legal_clause_rewriter': 'Clause Rewriter',
          'legal_strategy_engine': 'Strategy Engine',
          'legal_research': 'Legal Research',
          'legal_research_assistant': 'Research Assistant',
          'legal_timeline_generator': 'Timeline Generator',
          'legal_compliance_checker': 'Compliance Checker',
          'legal_law_comparator': 'Law Comparator'
        };
        const activeToolName = toolMap[toolId] || toolId;
        setSelectedLegalTool({ id: toolId, name: activeToolName });
        setActiveTool(activeToolName);
        setLegalView('CHAT'); // Ensure chat view for legal tool
      }
    }

    if (toolUpdates.mode) setCurrentMode(toolUpdates.mode);

    toast.success(`AI LEGAL™ switched to ${suggestion.intent.replace('legal_', '').replace('_', ' ')}! ✨`);

    setIntentSuggestion(null);
    isDetectionPausedRef.current = true; // Don't re-detect immediately after switch
  };

  const handleSelectLegalSuggestion = (toolId, toolName) => {
    const user = getUserData();
    if (!user?.token) {
      window.dispatchEvent(new CustomEvent('login_required', { detail: { toolName } }));
      return;
    }

    // AI Legal is now available for ALL users (Free Tier)
    const isUnlocked = true; // isAdminUser || unlockedTools.includes(toolId);

    if (!isUnlocked) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: `Use ${toolName}`,
        timestamp: Date.now()
      }, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `**Premium Mode Restricted**\n\nThe **${toolName}** tool is part of our Premium AI Legal archive.\n\n**To access this tool:**\n1. Select "Unlock All" to get full access.\n2. Or upgrade your subscription to the **FOUNDER PLAN**.`,
        isPremiumRestricted: true,
        timestamp: Date.now()
      }]);
      return;
    }

    activateToolWithTypingEffect(toolId, toolName);
  };

  const handleDismissSuggestion = () => {
    setIntentSuggestion(null);
    isDetectionPausedRef.current = true;
    setTimeout(() => { isDetectionPausedRef.current = false; }, 30000); // 30s pause
  };

  // ─── AI CashFlow Search Logic ─────────────────────────────────────────────
  useEffect(() => {
    if (!isCashFlowMode || inputValue.length < 2) {
      setStockSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStocks(true);
      try {
        const user = getUserData();
        const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? "http://localhost:8080/api" : (typeof window !== 'undefined' ? `${window.location.origin}/api` : "http://localhost:8080/api"));
        const response = await axios.get(`${baseURL}/cashflow/search`, {
          params: { keywords: inputValue },
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = response.data;
        setStockSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Stock search failed:", err);
      } finally {
        setIsSearchingStocks(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, isCashFlowMode]);


  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close Attach Menu
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        attachBtnRef.current &&
        !attachBtnRef.current.contains(event.target)
      ) {
        setIsAttachMenuOpen(false);
      }

      // Close Tools Menu
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(event.target) &&
        toolsBtnRef.current &&
        !toolsBtnRef.current.contains(event.target)
      ) {
        setIsToolsMenuOpen(false);
      }
    };

    if (isAttachMenuOpen || isToolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    const handleGlobalPaste = (e) => {
      // Avoid intercepting if user is in an input/textarea other than our chat input
      const target = e.target;
      if (target.tagName === 'INPUT' || (target.tagName === 'TEXTAREA' && target !== inputRef.current)) {
        return;
      }
      handlePaste(e);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('paste', handleGlobalPaste);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isAttachMenuOpen, isToolsMenuOpen, messages.length, isLoading]);

  const processFile = (file) => {
    if (!file) return;

    let fileName = file.name || `file_${Date.now()}`;
    let fileType = file.type;

    // Browser might fail to detect type for some pasted/dragged files
    if (!fileType && fileName.includes('.')) {
      const ext = fileName.split('.').pop().toLowerCase();
      const mimeMap = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      };
      if (mimeMap[ext]) fileType = mimeMap[ext];
    }

    // List of allowed types for the AI to process (extendable)
    const validMimes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];

    const isAllowed = validMimes.some(mime => fileType?.startsWith(mime) || fileType === mime);

    // Even if not in list, let's allow it but maybe warn? 
    // Actually, AI Ads can handle most text/data files.

    const fileWithMetadata = new File([file], fileName, { type: fileType || 'application/octet-stream' });
    setSelectedFiles(prev => [...prev, fileWithMetadata]);

    // Generate Preview using DataURL (more persistent for chat messages)
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreviews(prev => [...prev, {
        url: reader.result,
        name: fileName,
        type: fileType || 'application/octet-stream',
        size: file.size,
        id: Math.random().toString(36).substr(2, 9)
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => processFile(file));
    setIsAttachMenuOpen(false); // Close menu after selection

    // [PROACTIVE FEATURE]: If this is a new chat (no messages), automatically trigger analysis
    if (messages.length === 0 && !isLoading) {
      setTimeout(() => {
        handleSendMessage();
      }, 1000); // 1s delay to ensure FileReader (in processFile) has finished
    }
  };

  const handlePaste = (e) => {
    // Only handle if there are files (blobs) or items in clipboard
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    let handled = false;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            handled = true;
          }
        }
      }
    }

    // Fallback for older browsers or specific mobile behaviors
    if (!handled && files && files.length > 0) {
      Array.from(files).forEach(file => {
        processFile(file);
        handled = true;
      });
    }

    if (handled) {
      e.preventDefault(); // Don't paste the filename as text if we handled the file
      toast.success("File pasted! 📎");
    }
  };

  const handleRemoveFile = (id) => {
    if (id) {
      // Find the file name to remove from selectedFiles
      const previewToRemove = filePreviews.find(p => p.id === id);
      if (previewToRemove) {
        setSelectedFiles(prev => prev.filter(f => f.name !== previewToRemove.name));
        setFilePreviews(prev => prev.filter(p => p.id !== id));
      }
    } else {
      // Clear all
      setSelectedFiles([]);
      setFilePreviews([]);
    }
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (driveInputRef.current) driveInputRef.current.value = '';
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const handleAttachmentSelect = (type) => {
    setIsAttachMenuOpen(false);
    if (type === 'upload') {
      uploadInputRef.current?.click();
    } else if (type === 'photos') {
      photosInputRef.current?.click();
    } else if (type === 'drive') {
      driveInputRef.current?.click();
    } else if (type === 'doc-voice') {
      document.getElementById('doc-voice-upload')?.click();
    }
  };

  const handleDocToVoiceSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!checkLimitLocally('audio')) {
      e.target.value = '';
      return;
    }

    setIsAttachMenuOpen(false);

    // 1. Show User Message immediately with the file
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Content = reader.result; // Full Data URL for display
      const base64Data = base64Content.split(',')[1]; // Raw base64 for backend

      // Use the global activeSessionId (use local let to avoid const reassignment)
      let currentSid = activeSessionId;
      const targetSid = currentSid;
      if (currentSid === 'new') {
        currentSid = await chatStorageService.createSession(currentProjectId);

        isNavigatingRef.current = true;
        if (activeCaseId) {
          setCurrentCaseSessionId(currentSid);
        } else {
          navigate(`/dashboard/chat/${currentSid}`, { replace: true });
        }
      }

      // Add User Message
      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: `Please convert this document to audio: **${file.name}**`,
        timestamp: new Date(),
        projectId: currentProjectId,
        attachments: [{
          url: base64Content,
          name: file.name,
          type: file.type
        }]
      };
      setMessages(prev => [...prev, userMsg]);
      chatStorageService.saveMessage(currentSid, userMsg, `Audio: ${file.name}`, currentProjectId).catch(e => console.error(e));

      // 2. Add Processing Message from AI Ads
      const aiMsgId = (Date.now() + 1).toString();
      const processingMsg = {
        id: aiMsgId,
        role: 'assistant',
        content: `⚡ **EXTRACTING CONTENT...**\nReading text from **${file.name}**...`,
        timestamp: new Date(),
        isProcessing: true
      };
      setMessages(prev => [...prev, processingMsg]);
      scrollToBottom();

      // Update UI slightly after extraction
      setTimeout(() => {
        setMessages(prev => prev.map(msg => msg.id === aiMsgId && msg.isProcessing ? {
          ...msg,
          content: `🎧 **CONVERTING TO VOICE...**\nSynthesizing natural audio for **${file.name}**. This won't take long!`
        } : msg));
      }, 1500);
      scrollToBottom();

      // 3. Start Conversion - Added high timeout for long docs
      try {
        const response = await axios.post(apis.synthesizeFile, {
          fileData: base64Data,
          mimeType: file.type || 'application/pdf',
          languageCode: audioLangCode,
          voiceName: audioVoiceName,
          pitch: audioPitch,
          speakingRate: audioSpeed
        }, {
          responseType: 'arraybuffer',
          timeout: 0,
          headers: { Authorization: `Bearer ${getUserData()?.token}` }
        });

        // 4. Success - Update AI Message with Player and Download
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const reader2 = new FileReader();
        reader2.readAsDataURL(audioBlob);
        reader2.onloadend = () => {
          const mp3Base64 = reader2.result.split(',')[1];
          const rawBytes = response.data.byteLength;
          const charCount = response.headers['x-text-length'] || 0;
          const formattedFileSize = rawBytes > 1024 * 1024
            ? (rawBytes / (1024 * 1024)).toFixed(1) + ' MB'
            : (rawBytes / 1024).toFixed(1) + ' KB';

          const aiResponse = {
            id: aiMsgId,
            role: 'model',
            isProcessing: false,
            content: `✅ I have successfully converted **${file.name}** into a full audio voice.`,
            conversion: {
              file: mp3Base64,
              blobUrl: audioUrl,
              fileName: `${file.name.split('.')[0]}_Audio.mp3`,
              mimeType: 'audio/mpeg',
              fileSize: formattedFileSize,
              rawSize: rawBytes,
              charCount: charCount
            },
            timestamp: new Date(),
            projectId: currentProjectId
          };

          setMessages(prev => prev.map(msg => msg.id === aiMsgId ? aiResponse : msg));
          chatStorageService.saveMessage(currentSid, aiResponse, null, currentProjectId).catch(e => console.error(e));

          toast.success("Conversion complete! 🎶");
          refreshSubscription();
          scrollToBottom();
        };

      } catch (err) {
        console.error('[DocToVoice Error]:', err);
        let errorMsg = "Extraction Failed";
        let errorDetail = err.message;

        if (err.response?.data) {
          try {
            // Buffer result handling
            const errorData = err.response.data instanceof ArrayBuffer
              ? JSON.parse(new TextDecoder().decode(err.response.data))
              : err.response.data;

            errorMsg = errorData.error || errorMsg;
            errorDetail = errorData.details || errorDetail;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
        }

        const serverError = errorMsg + (errorDetail ? `: ${errorDetail}` : "");
        const errorResponse = {
          id: aiMsgId,
          role: 'model',
          isProcessing: false,
          content: `❌ **Conversion Failed**\n${serverError}`,
          timestamp: new Date(),
          projectId: currentProjectId
        };

        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? errorResponse : msg));
        chatStorageService.saveMessage(currentSid, errorResponse, null, currentProjectId).catch(e => console.error(e));

      }
    };
    reader.readAsDataURL(file);

    e.target.value = ''; // Always reset so user can click/upload same file again
  };

  const manualFileToAudioConversion = async (file, activeSessionId) => {
    if (!file) return;

    if (!checkLimitLocally('audio')) {
      return;
    }

    // 1. Show User Message immediately with the file
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Content = reader.result;
      const base64Data = base64Content.split(',')[1];
      console.log(`[DEBUG] manualFileToAudioConversion: file=${file.name}, type=${file.type}, size=${file.size}`);

      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: `Convert this document to audio: **${file.name}**`,
        timestamp: new Date(),
        projectId: currentProjectId,
        attachments: [{ url: base64Content, name: file.name, type: file.type }]
      };
      setMessages(prev => [...prev, userMsg]);
      chatStorageService.saveMessage(activeSessionId, userMsg, `Audio: ${file.name}`, currentProjectId).catch(e => console.error(e));

      const aiMsgId = (Date.now() + 1).toString();
      const processingMsg = {
        id: aiMsgId,
        role: 'assistant',
        content: `⚡ **EXTRACTING CONTENT...**\nReading **${file.name}**...`,
        timestamp: new Date(),
        isProcessing: true
      };
      setMessages(prev => [...prev, processingMsg]);
      scrollToBottom();

      // Second stage update
      setTimeout(() => {
        setMessages(prev => prev.map(msg => msg.id === aiMsgId && msg.isProcessing ? {
          ...msg,
          content: `🎧 **CONVERTING TO VOICE...**\nAlmost there! Preparing your audio for **${file.name}**...`
        } : msg));
      }, 1200);

      try {
        console.log(`[VoiceConversion] Sending request to: ${apis.synthesizeFile}`);
        const response = await axios.post(apis.synthesizeFile, {
          fileData: base64Data,
          mimeType: file.type || 'application/pdf',
          languageCode: audioLangCode,
          voiceName: audioVoiceName,
          pitch: audioPitch,
          speakingRate: audioSpeed
        }, {
          responseType: 'arraybuffer',
          timeout: 300000, // 5 minute timeout for large files on live servers
          headers: { Authorization: `Bearer ${getUserData()?.token}` }
        });

        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const reader2 = new FileReader();
        reader2.readAsDataURL(audioBlob);
        reader2.onloadend = () => {
          const mp3Base64 = reader2.result.split(',')[1];
          const rawBytes = response.data.byteLength;
          const charCount = response.headers['x-text-length'] || 0;
          const formattedSize = rawBytes > 1024 * 1024 ? (rawBytes / (1024 * 1024)).toFixed(1) + ' MB' : (rawBytes / 1024).toFixed(1) + ' KB';

          const aiResponse = {
            id: aiMsgId,
            role: 'model',
            isProcessing: false,
            content: `✅ Audio conversion complete for **${file.name}**.`,
            conversion: {
              file: mp3Base64,
              blobUrl: audioUrl,
              fileName: `${file.name.split('.')[0]}_Audio.mp3`,
              mimeType: 'audio/mpeg',
              fileSize: formattedSize,
              rawSize: rawBytes,
              charCount: charCount
            },
            timestamp: new Date(),
            projectId: currentProjectId
          };

          setMessages(prev => {
            const exists = prev.some(msg => msg.id === aiMsgId);
            if (exists) {
              return prev.map(msg => msg.id === aiMsgId ? aiResponse : msg);
            } else {
              return [...prev, aiResponse];
            }
          });
          chatStorageService.saveMessage(activeSessionId, aiResponse, null, currentProjectId).catch(e => console.error(e));
          toast.success("File converted successfully!");
          refreshSubscription();
          scrollToBottom();
        };
      } catch (err) {
        console.error('[ManualConversion Error]:', err);
        let errorMsg = "Conversion Failed";
        let errorDetail = err.message;

        if (err.response?.data) {
          try {
            // Buffer result handling
            const errorData = err.response.data instanceof ArrayBuffer
              ? JSON.parse(new TextDecoder().decode(err.response.data))
              : err.response.data;

            errorMsg = errorData.error || errorMsg;
            errorDetail = errorData.details || errorDetail || err.message;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
        }
        const serverError = errorMsg + (errorDetail ? `: ${errorDetail}` : "");
        const errorResponse = {
          id: aiMsgId,
          role: 'model',
          isProcessing: false,
          content: `❌ **Conversion Failed**\n${serverError}`,
          timestamp: new Date()
        };
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === aiMsgId);
          if (exists) {
            return prev.map(msg => msg.id === aiMsgId ? errorResponse : msg);
          } else {
            return [...prev, errorResponse];
          }
        });
        chatStorageService.saveMessage(activeSessionId, errorResponse, null, currentProjectId).catch(e => console.error(e));
        toast.error("Conversion failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const manualTextToAudioConversion = async (text, activeSessionId, replaceAssistantMsgId = null) => {
    if (!text || !text.trim()) return;

    if (!checkLimitLocally('audio')) {
      return;
    }

    if (!replaceAssistantMsgId) {
      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: `Convert this text to audio: "${text}"`,
        timestamp: new Date(),
        projectId: currentProjectId
      };
      setMessages(prev => [...prev, userMsg]);
      const talkTitle = text.length > 20 ? text.substring(0, 20) + '...' : text;
      chatStorageService.saveMessage(activeSessionId, userMsg, `Audio Talk: ${talkTitle}`, currentProjectId).catch(e => console.error(e));
    }

    const aiMsgId = replaceAssistantMsgId || (Date.now() + 1).toString();
    const generatingMsg = {
      id: aiMsgId,
      role: 'model',
      content: `🎧 **Generating voice for your text...**`,
      timestamp: new Date(),
      isProcessing: true
    };

    if (replaceAssistantMsgId) {
      setMessages(prev => prev.map(msg => msg.id === aiMsgId ? generatingMsg : msg));
    } else {
      setMessages(prev => [...prev, generatingMsg]);
    }

    scrollToBottom();

    try {
      const response = await axios.post(apis.synthesizeFile, {
        introText: text,
        languageCode: audioLangCode,
        voiceName: audioVoiceName,
        pitch: audioPitch,
        speakingRate: audioSpeed
      }, { responseType: 'arraybuffer', timeout: 0, headers: { Authorization: `Bearer ${getUserData()?.token}` } });

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const reader2 = new FileReader();
      reader2.readAsDataURL(audioBlob);
      reader2.onloadend = () => {
        const mp3Base64 = reader2.result.split(',')[1];
        const rawBytes = response.data.byteLength;
        const charCount = response.headers['x-text-length'] || 0;
        const formattedSize = rawBytes > 1024 * 1024 ? (rawBytes / (1024 * 1024)).toFixed(1) + ' MB' : (rawBytes / 1024).toFixed(1) + ' KB';

        const aiResponse = {
          id: aiMsgId,
          role: 'model',
          isProcessing: false,
          content: `✅ Your text has been converted to voice audio.`,
          conversion: {
            file: mp3Base64,
            blobUrl: audioUrl,
            fileName: `AI LEGAL™_voice_${Date.now()}.mp3`,
            mimeType: 'audio/mpeg',
            fileSize: formattedSize,
            rawSize: rawBytes,
            charCount: charCount
          },
          timestamp: new Date(),
          projectId: currentProjectId
        };

        setMessages(prev => {
          const exists = prev.some(msg => msg.id === aiMsgId);
          if (exists) {
            return prev.map(msg => msg.id === aiMsgId ? aiResponse : msg);
          } else {
            return [...prev, aiResponse];
          }
        });

        if (replaceAssistantMsgId) {
          chatStorageService.updateMessage(activeSessionId, aiResponse, currentProjectId).catch(e => console.error(e));
        } else {
          chatStorageService.saveMessage(activeSessionId, aiResponse, null, currentProjectId).catch(e => console.error(e));
        }

        toast.success("Text converted successfully!");
        refreshSubscription();
        scrollToBottom();
      };
    } catch (err) {
      console.error('[ManualTextConversion Error]:', err);
      let serverError = err.message;
      if (err.response?.data) {
        try {
          const errorData = err.response.data instanceof ArrayBuffer
            ? JSON.parse(new TextDecoder().decode(err.response.data))
            : err.response.data;
          serverError = errorData.details || errorData.error || err.message;
        } catch (e) {
          console.error("Failed to parse", e);
        }
      }
      const errorResponse = {
        id: aiMsgId,
        role: 'model',
        isProcessing: false,
        content: `❌ **Conversion Failed**\n${serverError}`,
        timestamp: new Date()
      };
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === aiMsgId);
        if (exists) {
          return prev.map(msg => msg.id === aiMsgId ? errorResponse : msg);
        } else {
          return [...prev, errorResponse];
        }
      });
      chatStorageService.saveMessage(activeSessionId, errorResponse, null, currentProjectId).catch(e => console.error(e));
      toast.error("Conversion failed");
    }
  };

  const handleGenerateVideo = async (overridePrompt, activeSessionId) => {
    if (!checkLimitLocally('video')) {
      return;
    }
    try {
      if (!inputRef.current?.value.trim() && !overridePrompt && selectedFiles.length === 0) {
        // toast.error('Please enter a prompt or select a file');
        // Let it slide if it's voice input (handled elsewhere)
        if (!voiceUsedRef.current) return;
      }

      const prompt = overridePrompt || inputRef.current?.value || "";
      // const filesToSend = [...selectedFiles]; // Snapshot // This variable is not used

      // Voice Reader Mode Logic
      if (isVoiceMode) {
        try {
          // 1. Add User Message to UI
          const userMsgId = Date.now().toString();
          const newUserMsg = {
            id: userMsgId,
            role: 'user', // Ensure role user
            content: prompt, // Use content
            timestamp: new Date(),
            mode: 'VOICE_ASSISTANT',
            activeTool: 'legal_voice_reader',
            projectId: currentProjectId,
            attachments: filePreviews.map(fp => ({
              url: fp.url,
              name: fp.name,
              type: fp.type
            }))
          };
          setMessages(prev => prev.filter(m => !m.isSystemLog).concat(newUserMsg), activeSessionId);

          // Clear Inputs
          setInputValue('');
          setSelectedFiles([]);
          setFilePreviews([]);
          if (inputRef.current) inputRef.current.style.height = 'auto';

          // Save to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, newUserMsg, null, currentProjectId).catch(err => console.error("Error saving voice message:", err));
          }

          // 2. Trigger Voice Reading Directly
          setIsLoading(true);

          // Show a "Reading..." AI bubble
          const aiMsgId = (Date.now() + 1).toString();
          const readingMsg = {
            id: aiMsgId,
            role: 'model', // Ensure role assistant
            content: "🎧 Reading content aloud...", // Use content
            timestamp: new Date(),
            projectId: currentProjectId
          };
          setMessages(prev => [...prev, readingMsg], activeSessionId);

          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, readingMsg, null, currentProjectId).catch(err => console.error("Error saving reading bubble:", err));
          }

          setTimeout(() => {
            speakResponse(prompt, audioLangCode, aiMsgId, newUserMsg.attachments);
            setIsLoading(false);
          }, 500);

          return; // STOP HERE (Do not call AI API)
        } catch (err) {
          console.error("Voice mode handler failed:", err);
        }
      }

      setLoadingText("Generating Video... 🎥");
      setIsLoading(true);
      // isSendingRef.current = true; // Mark as sending // This variable is not defined in the provided context

      // 1. Add User Message to UI
      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        projectId: currentProjectId,
        attachments: filePreviews.map(fp => ({
          url: fp.url,
          name: fp.name,
          type: fp.type
        })),
        mode: MODES.VIDEO_GENERATION
      };

      // Show a message that video generation is in progress
      const tempId = (Date.now() + 1).toString();
      const newMessage = {
        id: tempId,
        role: 'model',
        isGenerating: true,
        content: `🎬 Generating video from prompt: "${prompt}"\n\nPlease wait, this may take a moment...`, // Use content
        timestamp: new Date(),
        projectId: currentProjectId,
        mode: MODES.VIDEO_GENERATION
      };

      setMessages(prev => prev.filter(m => !m.isSystemLog).concat([userMsg, newMessage]), activeSessionId);
      if (inputRef.current) inputRef.current.value = '';
      setInputValue('');
      handleRemoveFile();

      // Ensure the prompt and loading state are visible
      setTimeout(() => scrollToBottom(true), 50);

      // Save user message to backend — pass interim title so session is not created as "New Chat"
      if (activeSessionId && activeSessionId !== 'new') {
        const titleForSave = pendingMediaTitleRef.current || null;
        chatStorageService.saveMessage(activeSessionId, userMsg, titleForSave, currentProjectId).catch(err => console.error("Error saving video user message:", err));
      }

      try {
        // Use apiService
        const data = await apiService.generateVideo(prompt, 5, 'medium', videoAspectRatio, videoModelId, videoResolution);

        if (data.videoUrl) {
          // Add the generated video to the message
          const videoMessage = {
            id: tempId, // Keep same ID
            role: 'model',
            isGenerating: false,
            content: `🎥 Video generated successfully!`, // Use content
            videoUrl: data.videoUrl,
            timestamp: new Date(),
            projectId: currentProjectId,
            mode: MODES.VIDEO_GENERATION
          };

          setMessages(prev => prev.map(msg => msg.id === tempId ? videoMessage : msg), activeSessionId);
          toast.success('Video generated successfully!');
          refreshSubscription();

          // Save AI response to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, videoMessage, null, currentProjectId).catch(err => console.error("Error saving video results:", err));
          }

        } else if (data.imageUrl) {
          // Add image fallback
          const imageMessage = {
            id: tempId, // Keep same ID
            role: 'model',
            content: `🖼️ ${data.message || 'Case Prediction limit reached. Generated a preview image instead.'}`,
            imageUrl: data.imageUrl,
            timestamp: new Date(),
          };

          setMessages(prev => prev.map(msg => msg.id === tempId ? imageMessage : msg));
          toast.success('Generated preview image');

          // Save AI fallback image to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, imageMessage, null, currentProjectId).catch(err => console.error("Error saving video fallback image:", err));
          }
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to generate video';

        // If we got an image URL even with error (sometimes happens with 200 fallback but let's be safe)
        if (error.response?.data?.imageUrl) {
          const imageMessage = {
            id: tempId,
            role: 'model',
            content: `🖼️ ${error.response.data.message || 'Case Prediction failed. Generated preview.'}`,
            imageUrl: error.response.data.imageUrl,
            timestamp: new Date(),
          };
          setMessages(prev => prev.map(msg => msg.id === tempId ? imageMessage : msg));

          // Save AI error fallback image to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, imageMessage, null, currentProjectId).catch(err => console.error("Error saving video error fallback image:", err));
          }
          return;
        }

        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, isGenerating: false, content: `❌ ${errorMsg}` } : msg));
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Error initiating video generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (overridePrompt, activeSessionId) => {
    if (!checkLimitLocally('image')) {
      return;
    }
    try {
      if (!inputRef.current?.value.trim() && !overridePrompt) {
        toast.error('Please enter a prompt for image generation');
        return;
      }

      const prompt = overridePrompt || inputRef.current.value;
      setLoadingText("Generating Image... 🎨");
      setIsLoading(true);

      // 1. Add User Message to UI
      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        projectId: currentProjectId,
        attachments: filePreviews.map(fp => ({
          url: fp.url,
          name: fp.name,
          type: fp.type.startsWith('image/') ? 'image' :
            fp.type.includes('pdf') ? 'pdf' :
              fp.type.includes('word') || fp.type.includes('document') ? 'docx' : 'file'
        })),
        mode: MODES.IMAGE_GENERATION
      };

      // Show a message that AI-powered legal research is in progress
      const tempId = (Date.now() + 1).toString();
      const newMessage = {
        id: tempId,
        role: 'model',
        isGenerating: true,
        content: `✨ **AI LEGAL™ generating...**\n🎨 Generating high-quality poster from your prompt: "${prompt}"\n\nIntelligently refining text detection, placement, and cinematic styling...`, // Use content
        timestamp: new Date(),
        projectId: currentProjectId,
        mode: MODES.IMAGE_GENERATION
      };

      setMessages(prev => prev.filter(m => !m.isSystemLog).concat([userMsg, newMessage]), activeSessionId);
      if (inputRef.current) inputRef.current.value = '';
      setInputValue('');
      handleRemoveFile();

      // Ensure the prompt and loading state are visible
      setTimeout(() => scrollToBottom(true), 50);

      // Save user message to backend — pass interim title so session is not created as "New Chat"
      if (activeSessionId && activeSessionId !== 'new') {
        const titleForSave = pendingMediaTitleRef.current || null;
        chatStorageService.saveMessage(activeSessionId, userMsg, titleForSave, currentProjectId).catch(err => console.error("Error saving image user message:", err));
      }

      try {
        // Use apiService
        const data = await apiService.generateImage(prompt, imageAspectRatio, imageModelId);

        if (data && (data.imageUrl || data.data)) {
          const finalUrl = data.imageUrl || data.data; // Handle different response structures

          // --- Non-blocking Smart Prompts ---
          const initialSuggestions = data.suggestions || [];
          const imageMessage = {
            id: tempId,
            role: 'model',
            isGenerating: false,
            content: `🖼️ Image generated successfully!`,
            imageUrl: finalUrl,
            suggestions: initialSuggestions,
            timestamp: new Date(),
            projectId: currentProjectId,
            mode: MODES.IMAGE_GENERATION
          };

          // 1. Show the image IMMEDIATELY
          setMessages(prev => prev.map(msg => msg.id === tempId ? imageMessage : msg), activeSessionId);
          scrollToBottom(true);

          // 2. Fetch related prompts in background if not provided by the API
          if (initialSuggestions.length === 0) {
            generateFollowUpPrompts(prompt, 'image').then(smartPrompts => {
              if (smartPrompts && smartPrompts.length > 0) {
                setMessages(prev => prev.map(msg =>
                  msg.id === tempId ? { ...msg, suggestions: smartPrompts } : msg
                ), activeSessionId);
                // Update persistent storage with the new suggestions
                if (activeSessionId && activeSessionId !== 'new') {
                  chatStorageService.saveMessage(activeSessionId, { ...imageMessage, suggestions: smartPrompts }, null, currentProjectId);
                }
              }
            }).catch(e => console.warn("Background suggestion fetch failed:", e));
          }

          toast.success('Image generated successfully!');
          refreshSubscription();

          // Save AI response to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, imageMessage, null, currentProjectId).catch(err => console.error("Error saving AI-powered legal research results:", err));
          }
        }
      } catch (error) {
        console.error("Image Gen Error Details:", error);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to generate image';
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: `❌ ${errorMsg}` } : msg), activeSessionId); // Use content
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Error initiating image generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditImage = async (overridePrompt, activeSessionId) => {
    if (!checkLimitLocally('image')) {
      return;
    }
    try {
      const prompt = overridePrompt || inputRef.current?.value || "";
      if (!prompt) {
        toast.error('Please enter instructions for image editing');
        return;
      }

      // Check for attached image or find the most recent image in chat
      let imageFile = filePreviews.find(f => f.type.startsWith('image/'));

      if (!imageFile) {
        // 1. Check if we have a specific reference set from an "Edit" button click
        if (editRefImage) {
          imageFile = editRefImage;
        }
        // 2. Fallback: find the most recent image message in the session
        else {
          const lastImageMsg = [...messages].reverse().find(msg => msg.imageUrl);
          if (lastImageMsg) {
            imageFile = {
              url: lastImageMsg.imageUrl,
              name: 'Reference Image',
              type: 'image/png'
            };
          }
        }
      }

      if (!imageFile) {
        toast.error('Please upload an image or generate one first to edit');
        return;
      }

      setIsLoading(true);

      // 1. Add User Message to UI
      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        projectId: currentProjectId,
        attachments: imageFile.id ? filePreviews.map(fp => ({
          url: fp.url,
          name: fp.name,
          type: fp.type.startsWith('image/') ? 'image' : 'file'
        })) : [{
          url: imageFile.url,
          name: imageFile.name,
          type: 'image'
        }],
        mode: MODES.IMAGE_EDIT
      };

      // Show a message that image editing is in progress
      const tempId = (Date.now() + 1).toString();
      const newMessage = {
        id: tempId,
        role: 'model',
        isGenerating: true,
        content: `🪄 **Advanced Precision Editor Active**\n🔧 Executing Photoshop-level modifications for: "${prompt}"\n\nPreserving original composition, art style, and character-perfect text rendering...`,
        timestamp: new Date(),
        projectId: currentProjectId,
        mode: MODES.IMAGE_EDIT
      };

      setMessages(prev => prev.filter(m => !m.isSystemLog).concat([userMsg, newMessage]), activeSessionId);
      if (inputRef.current) inputRef.current.value = '';
      setInputValue('');

      // ✅ Clear the attachment immediately when send is pressed
      handleRemoveFile();
      setEditRefImage(null);
      if (inputRef.current) inputRef.current.style.height = 'auto';

      // Ensure the prompt and loading state are visible
      setTimeout(() => scrollToBottom(true), 50);

      // Save user message to backend
      if (activeSessionId && activeSessionId !== 'new') {
        chatStorageService.saveMessage(activeSessionId, userMsg, null, currentProjectId).catch(err => console.error("Error saving image edit user message:", err));
      }

      try {
        console.log("[Image Edit] Starting edit request for:", prompt);

        let rawImageBlob = null;

        try {
          if (imageFile.url.startsWith('data:')) {
            const res = await fetch(imageFile.url);
            rawImageBlob = await res.blob();
          } else {
            const matchedFile = selectedFiles.find(f => f.name === imageFile.name);
            if (matchedFile) {
              rawImageBlob = matchedFile;
            } else if (imageFile.url.startsWith('blob:')) {
              const res = await fetch(imageFile.url);
              rawImageBlob = await res.blob();
            } else {
              // Remote URLs: securely fetch through backend proxy to bypass browser CORS blocks
              const proxiedUrl = `${apis.imageProxy}?url=${encodeURIComponent(imageFile.url)}`;
              const res = await fetch(proxiedUrl);
              rawImageBlob = await res.blob();
            }
          }
        } catch (err) {
          console.error("[Image Edit] Blob conversion failed:", err);
          throw new Error("Failed to process the reference image.");
        }

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', editModelId);
        if (rawImageBlob) {
          formData.append('image', rawImageBlob, 'reference.png');
        }

        const token = JSON.parse(localStorage.getItem('user') || '{}').token;
        const fetchRes = await fetch(`${API}/edit-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!fetchRes.ok) {
          const errorText = await fetchRes.text();
          throw new Error(`Server returned ${fetchRes.status}: ${errorText}`);
        }

        const responseData = await fetchRes.json();

        if (responseData && responseData.data) {
          const finalUrl = responseData.data;

          const initialSuggestions = responseData.suggestions || [];
          const editMessage = {
            id: tempId,
            role: 'model',
            content: `✨ Your image has been edited!`,
            imageUrl: finalUrl,
            suggestions: initialSuggestions,
            timestamp: new Date(),
            projectId: currentProjectId,
            mode: MODES.IMAGE_EDIT
          };

          // 1. Show edited image IMMEDIATELY
          setMessages(prev => prev.map(msg => msg.id === tempId ? editMessage : msg), activeSessionId);
          scrollToBottom(true);

          // 2. Fetch related prompts in background
          if (initialSuggestions.length === 0) {
            generateFollowUpPrompts(prompt, 'image edit').then(smartPrompts => {
              if (smartPrompts && smartPrompts.length > 0) {
                setMessages(prev => prev.map(msg =>
                  msg.id === tempId ? { ...msg, suggestions: smartPrompts } : msg
                ), activeSessionId);
                if (activeSessionId && activeSessionId !== 'new') {
                  chatStorageService.saveMessage(activeSessionId, { ...editMessage, suggestions: smartPrompts }, null, currentProjectId);
                }
              }
            }).catch(e => console.warn("Background suggestion fetch failed for edit:", e));
          }

          toast.success('Image edited successfully!');
          refreshSubscription();


          // Save AI response to backend
          if (activeSessionId && activeSessionId !== 'new') {
            chatStorageService.saveMessage(activeSessionId, editMessage, null, currentProjectId).catch(err => console.error("Error saving edited image results:", err));
          }
        }
      } catch (error) {
        console.error("Image Edit Error:", error);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to edit image';
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, isGenerating: false, content: `❌ ${errorMsg}` } : msg));
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Image editing error:', error);
      toast.error('Error initiating image editing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepSearch = async () => {
    if (!checkLimitLocally('deepSearch')) {
      return;
    }
    try {
      if (!inputRef.current?.value.trim()) {
        toast.error('Please enter a topic for deep search');
        return;
      }

      const query = inputRef.current.value;
      setLoadingText("Writing Code... 💻");
      setIsLoading(true);

      // Show a message that deep search is in progress
      const newMessage = {
        id: Date.now().toString(),
        role: 'model',
        isGenerating: true,
        content: `🔍 Performing deep search for: "${query}"\n\nSearching the web and analyzing results... This may take a moment...`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
      inputRef.current.value = '';

      try {
        // Send message with deep search context
        const responseData = await generateChatResponse(
          messages,
          query,
          "DEEP SEARCH MODE ENABLED: Analyze the web search results comprehensively.",
          [],
          currentLang,
          null,
          MODES.DEEP_SEARCH,
          currentProjectId
        );

        if (responseData && responseData.reply) {
          // Add the deep search result
          const searchMessage = {
            id: Date.now().toString(),
            type: 'ai',
            text: responseData.reply,
            content: responseData.reply,
            timestamp: new Date(),
          };

          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = searchMessage;
            return updated;
          });

          toast.success('Deep search completed!');
          refreshSubscription();
        }
      } catch (error) {
        const errorMsg = error.message || 'Failed to perform deep search';
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...lastMsg,
            isGenerating: false,
            content: `❌ ${errorMsg}`
          };
          return updated;
        });
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Deep search error:', error);
      toast.error('Error initiating deep search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockAnalysis = async (stock, activeSessionId) => {
    try {
      if (!stock) {
        toast.error('Please select a stock first');
        return;
      }

      setIsLoading(true);
      const user = getUserData();

      // 1. Add User Message to UI
      const userMsgId = Date.now().toString();
      const userMsg = {
        id: userMsgId,
        role: 'user',
        content: `Analyze stock performance and potential for: ${stock.name || stock.symbol}`,
        timestamp: new Date(),
        projectId: currentProjectId,
        mode: MODES.CASHFLOW
      };

      // Show a message that analysis is in progress
      const tempId = (Date.now() + 1).toString();
      const readingMsg = {
        id: tempId,
        role: 'model',
        isGenerating: true,
        content: `📉 Fetching real-time market data for **${stock.symbol}**...\n\nAggregating the latest news and historical trends for AI depth analysis...`,
        timestamp: new Date(),
        projectId: currentProjectId
      };

      setMessages(prev => [...prev, userMsg, readingMsg], activeSessionId);
      setInputValue('');
      setStockSearchResults([]);
      setSelectedStock(null);

      // Save user message to backend
      if (activeSessionId && activeSessionId !== 'new') {
        chatStorageService.saveMessage(activeSessionId, userMsg, null, currentProjectId).catch(e => console.error(e));
      }

      try {
        const baseURL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? "http://localhost:8080/api" : (typeof window !== 'undefined' ? `${window.location.origin}/api` : "http://localhost:8080/api"));
        const response = await axios.post(`${baseURL}/cashflow/analyze`, {
          symbol: stock.symbol,
          name: stock.name
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        const { summary, emailSent } = response.data;

        // 2. Add AI full report to UI
        const finalMsg = {
          id: tempId,
          role: 'model',
          isGenerating: false,
          content: summary.fullAnalysis,
          cashflowData: summary,
          timestamp: new Date(),
          projectId: currentProjectId
        };

        setMessages(prev => prev.map(m => m.id === tempId ? finalMsg : m), activeSessionId);
        toast.success(`Research Report for ${summary.symbol} complete!`);

        // Save AI response
        if (activeSessionId && activeSessionId !== 'new') {
          chatStorageService.saveMessage(activeSessionId, finalMsg, null, currentProjectId).catch(e => console.error(e));
        }

        setIsCashFlowMode(false); // Return to normal chat
        refreshSubscription();

      } catch (err) {
        console.error("Stock analysis request failed:", err);
        const errorMsg = err.response?.data?.error || "Failed to complete financial analysis";
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isGenerating: false, content: `❌ ${errorMsg}` } : m), activeSessionId);
        toast.error(errorMsg);
      }

    } catch (err) {
      console.error("handleStockAnalysis error:", err);
      toast.error("Error initiating analysis");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = (modelId) => {
    if (selectedToolType) {
      setToolModels(prev => ({
        ...prev,
        [selectedToolType]: modelId
      }));
      const selectedModel = TOOL_PRICING[selectedToolType].models.find(m => m.id === modelId);
      toast.success(`Switched to ${selectedModel?.name}`);
      setIsModelSelectorOpen(false);
    }
  };

  // Voice Input Handler
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      isManualStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Start New Listening session
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    isManualStopRef.current = false;
    transcriptRef.current = '';

    const langMap = {
      'Hindi': 'hi-IN',
      'English': 'en-IN',
      'Marathi': 'mr-IN',
      'Tamil': 'ta-IN',
      'Telugu': 'te-IN',
      'Bengali': 'bn-IN',
      'Gujarati': 'gu-IN',
      'Kannada': 'kn-IN',
      'Punjabi': 'pa-IN',
      'Malayalam': 'ml-IN',
      'Urdu': 'ur-IN',
      'Hinglish': 'hi-IN',
      'Auto': '',
      'Auto Detect': '',
      'auto': ''
    };
    const activeLang = (currentMode === 'LEGAL_TOOLKIT' && toolkitLanguage) ? toolkitLanguage : currentLang;
    const targetSpeechLang = langMap[activeLang] !== undefined ? langMap[activeLang] : (langMap[currentLang] || '');
    if (targetSpeechLang) {
      recognition.lang = targetSpeechLang;
    }
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInputValue(transcript);
      transcriptRef.current = transcript;
    };

    recognition.onend = () => {
      setIsListening(false);

      const text = transcriptRef.current.trim();
      if (!isManualStopRef.current && text) {
        voiceUsedRef.current = true;
        handleSendMessage(null, text);
      }
      isManualStopRef.current = false;
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      isManualStopRef.current = true;
      if (event.error === 'not-allowed') toast.error('Microphone access denied');
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  };

  // Ensure Chat Mic stops when Live Mode starts
  useEffect(() => {
    if (isLiveMode && isListening && recognitionRef.current) {
      console.log("[Chat] Stopping Mic for Live Mode");
      isManualStopRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isLiveMode, isListening]);

  // Helper to clean markdown for TTS
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);
  const audioCacheRef = useRef({});

  // Helper to clean markdown for TTS — narrative mode with natural pauses for Chirp 3 HD
  const cleanTextForTTS = (text) => {
    if (!text) return "";
    return text
      // ── Emojis out
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0F5}\u{1F200}-\u{1F270}]/gu, '')
      // ── Headers → spoken as a sentence with a pause after (period adds natural pause)
      .replace(/^#{1,2}\s+(.+)$/gm, '$1. ')
      .replace(/^#{3,}\s+(.+)$/gm, '$1. ')
      // ── Bold → keep text, no markup
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // ── Italic
      .replace(/\*(.*?)\*/g, '$1')
      // ── Underline / strikethrough
      .replace(/__(.*?)__/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      // ── Links → just the label
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // ── Images → omit entirely
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // ── Code blocks → brief spoken note with pause
      .replace(/`{3}[\s\S]*?`{3}/g, ' Code snippet. ')
      // ── Inline code → just the text
      .replace(/`(.+?)`/g, '$1')
      // ── Bullet / numbered list items → each becomes a sentence for natural pause
      .replace(/^\s*[-*+]\s+(.+)$/gm, '$1. ')
      .replace(/^\s*\d+\.\s+(.+)$/gm, '$1. ')
      // ── Blockquote → keep content
      .replace(/^\s*>\s+/gm, '')
      // ── Tables → remove
      .replace(/\|.*?\|/g, '')
      // ── Horizontal rules → pause
      .replace(/^---+$/gm, '. ')
      // ── Special chars
      .replace(/™|&trade;/g, ' T M ')
      .replace(/©/g, '')
      .replace(/&amp;/g, 'and')
      .replace(/&lt;/g, '').replace(/&gt;/g, '')
      // ── Abbreviations → spoken form
      .replace(/\btm\b/gi, 'tum')
      .replace(/\bkkrh\b/gi, 'kya kar rahe ho')
      .replace(/\bclg\b/gi, 'college')
      .replace(/\bplz\b/gi, 'please')
      .replace(/\bbtw\b/gi, 'by the way')
      .replace(/\bidk\b/gi, 'I do not know')
      .replace(/\bAI\b/g, 'A I')
      // ── Keep commas, periods, question marks for natural prosody — remove only noise chars
      .replace(/[;:\"\\@\[\]\(\)\|]/g, ' ')
      // ── Multiple punctuation → single
      .replace(/\.{2,}/g, '. ')
      .replace(/!{2,}/g, '! ')
      .replace(/\?{2,}/g, '? ')
      // ── Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Voice Queue Ref
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const currentSpeechResolverRef = useRef(null);

  // Internal function to execute speech
  const executeSpeak = async (text, language, msgId, attachments = []) => {
    return new Promise(async (resolve) => {
      // Store resolve to allow external cancellation
      currentSpeechResolverRef.current = resolve;

      // Reset State Logic used to be here, now handled by queue manager

      try {
        let audioBlob = null;
        let targetLang = 'en-US';

        const readableAttachment = attachments && attachments.length > 0
          ? attachments.find(a =>
          (a.type && (
            a.type.includes('pdf') ||
            a.type.includes('word') ||
            a.type.includes('document') ||
            a.type.includes('text') ||
            a.type.startsWith('image/')
          ))
          ) : null;

        // Check Cache
        if (msgId && audioCacheRef.current[msgId]) {
          console.log(`[VOICE] Using cached audio for: ${msgId}`);
          audioBlob = audioCacheRef.current[msgId];
        } else {
          // Not cached, fetch
          if (readableAttachment) {
            toast.loading("Processing file & text...", { id: 'voice-loading' });
            console.log(`[VOICE] Reading attachment: ${readableAttachment.name}`);

            const fileRes = await fetch(readableAttachment.url);
            const fileBlob = await fileRes.blob();

            const base64Data = await new Promise((res) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result.split(',')[1]);
              reader.readAsDataURL(fileBlob);
            });

            const headerText = text ? cleanTextForTTS(text) : "";

            const response = await axios.post(apis.synthesizeFile, {
              fileData: base64Data,
              mimeType: readableAttachment.type || 'application/pdf',
              languageCode: null,
              gender: 'FEMALE',
              introText: headerText
            }, {
              responseType: 'arraybuffer',
              headers: { Authorization: `Bearer ${getUserData()?.token}` }
            });

            audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            toast.dismiss('voice-loading');

          } else {
            if (!text) {
              resolve();
              return;
            }

            const cleanText = cleanTextForTTS(text);
            if (!cleanText) {
              resolve();
              return;
            }

            // ── Comprehensive Language Auto-Detector ──────────────────────────────
            // PHASE 1: Unicode script block detection (non-Latin scripts)
            // PHASE 2: Romanized language word-frequency scoring (Latin scripts)
            const detectLanguageFromText = (text) => {
              const lowerText = text.toLowerCase();

              // ── PHASE 1: Unicode Script Block Detection ─────────────────────────
              const scriptCounts = {
                devanagari: (text.match(/[\u0900-\u097F]/g) || []).length,
                arabic: (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length,
                urdu: (text.match(/[\uFB50-\uFEFF]/g) || []).length,
                cyrillic: (text.match(/[\u0400-\u04FF]/g) || []).length,
                cjkChinese: (text.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length,
                hiragana: (text.match(/[\u3041-\u3096]/g) || []).length,
                katakana: (text.match(/[\u30A1-\u30FA]/g) || []).length,
                hangul: (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length,
                tamil: (text.match(/[\u0B80-\u0BFF]/g) || []).length,
                telugu: (text.match(/[\u0C00-\u0C7F]/g) || []).length,
                kannada: (text.match(/[\u0C80-\u0CFF]/g) || []).length,
                malayalam: (text.match(/[\u0D00-\u0D7F]/g) || []).length,
                bengali: (text.match(/[\u0980-\u09FF]/g) || []).length,
                gujarati: (text.match(/[\u0A80-\u0AFF]/g) || []).length,
                gurmukhi: (text.match(/[\u0A00-\u0A7F]/g) || []).length,
                thai: (text.match(/[\u0E00-\u0E7F]/g) || []).length,
                greek: (text.match(/[\u0370-\u03FF]/g) || []).length,
                hebrew: (text.match(/[\u05D0-\u05EA]/g) || []).length,
                latin: (text.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]/g) || []).length,
              };

              const totalChars = text.replace(/\s/g, '').length || 1;
              const dominant = Object.entries(scriptCounts).sort((a, b) => b[1] - a[1])[0];
              const [dominantScript, dominantCount] = dominant;
              const dominantRatio = dominantCount / totalChars;

              const scriptToLang = {
                devanagari: 'hi-IN', arabic: 'ar-XA', urdu: 'ur-IN',
                cyrillic: 'ru-RU', hiragana: 'ja-JP', katakana: 'ja-JP',
                hangul: 'ko-KR', tamil: 'ta-IN', telugu: 'te-IN',
                kannada: 'kn-IN', malayalam: 'ml-IN', bengali: 'bn-IN',
                gujarati: 'gu-IN', gurmukhi: 'pa-IN', thai: 'th-TH',
                greek: 'el-GR', hebrew: 'he-IL',
              };

              if (dominantScript !== 'latin' && dominantRatio > 0.05 && scriptToLang[dominantScript]) {
                return scriptToLang[dominantScript];
              }
              if (dominantScript === 'cjkChinese' && dominantRatio > 0.05) {
                return (scriptCounts.hiragana + scriptCounts.katakana) > 3 ? 'ja-JP' : 'cmn-CN';
              }
              if (dominantScript === 'cyrillic' && dominantRatio > 0.05) {
                return (text.match(/[їієґ]/gi) || []).length > 2 ? 'uk-UA' : 'ru-RU';
              }

              // ── PHASE 2: Romanized Language Word-Frequency Scoring ───────────────
              // For Latin-script text, score against curated word lists.
              // This handles Hinglish, romanized Urdu, and other transliterated langs.
              const words = lowerText.match(/\b[a-z]{2,}\b/g) || [];
              if (words.length === 0) return audioLangCode || 'en-US';

              // Word sets for each romanized language — high-frequency, unambiguous words
              const romanizedWordSets = {
                'hi-IN': new Set([
                  // Verbs & conjugations
                  'hai', 'hain', 'tha', 'thi', 'the', 'hoga', 'hogi', 'raha', 'rahi', 'rahe',
                  'karna', 'karo', 'karo', 'kiya', 'ki', 'kar', 'karta', 'karti', 'karte',
                  'hota', 'hoti', 'hote', 'hona', 'jata', 'jati', 'jate', 'jana', 'aana',
                  'aata', 'aati', 'dena', 'deta', 'deti', 'lena', 'leta', 'leti', 'milna',
                  'chahiye', 'chahte', 'chahta', 'chahti', 'sochna', 'bolta', 'bolti',
                  'dekho', 'dekh', 'dekha', 'suno', 'sun', 'sunna', 'batao', 'bata',
                  // Pronouns & particles
                  'mein', 'main', 'hum', 'aap', 'tum', 'woh', 'yeh', 'ye', 'jo', 'wo',
                  'mujhe', 'mujhko', 'tumhe', 'unhe', 'use', 'ise', 'kuch', 'sab', 'koi',
                  // Question words
                  'kya', 'kyun', 'kaise', 'kaun', 'kahan', 'kab', 'kitna', 'kitni', 'kitne',
                  // Common connectors & misc
                  'aur', 'ya', 'lekin', 'par', 'magar', 'toh', 'toh', 'agar', 'jab', 'tab',
                  'phir', 'bhi', 'nahi', 'nhi', 'nahin', 'bilkul', 'bahut', 'bohot', 'thoda',
                  'bahot', 'zyada', 'kam', 'accha', 'achha', 'theek', 'sahi', 'galat',
                  'abhi', 'aaj', 'kal', 'sirf', 'bas', 'matlab', 'matlab', 'yaar', 'bhai',
                  'dost', 'pyaar', 'zindagi', 'duniya', 'waqt', 'time', 'kaam', 'kab',
                  // Responses
                  'haan', 'han', 'nahi', 'okay', 'achha', 'bilkul', 'zaroor', 'shukriya',
                  'dhanyavad', 'namaste', 'alag', 'saath', 'sath', 'pehle', 'baad',
                ]),
                'ur-IN': new Set([
                  'hai', 'hain', 'tha', 'thi', 'aur', 'ya', 'lekin', 'kyun', 'kya', 'kaise',
                  'mein', 'hum', 'aap', 'tum', 'woh', 'yeh', 'nahi', 'bilkul', 'bahut',
                  'agar', 'phir', 'bhi', 'abhi', 'aaj', 'kal', 'theek', 'shukriya',
                  'khuda', 'hafiz', 'inshallah', 'mashallah', 'subhanallah', 'alhamdulillah',
                  'janab', 'sahib', 'baat', 'baten', 'dil', 'ishq', 'mohabbat', 'aman',
                  'zindagi', 'duniya', 'log', 'waqt', 'khayal', 'zaroor', 'mehrbani',
                ]),
                'de-DE': new Set([
                  'ist', 'sind', 'war', 'waren', 'werden', 'wurde', 'haben', 'hat', 'hatte',
                  'ich', 'du', 'er', 'sie', 'wir', 'ihr', 'nicht', 'kein', 'aber', 'oder',
                  'und', 'auch', 'mit', 'von', 'zu', 'bei', 'nach', 'aus', 'als', 'wie',
                  'dass', 'wenn', 'dann', 'noch', 'schon', 'eine', 'einer', 'eines', 'dem',
                  'den', 'des', 'die', 'der', 'das', 'ein', 'auf', 'an', 'im', 'am',
                  'sehr', 'gut', 'mehr', 'sein', 'ihre', 'ihrer', 'unser', 'bitte', 'danke',
                ]),
                'fr-FR': new Set([
                  'est', 'sont', 'était', 'avoir', 'a', 'ont', 'vous', 'nous', 'ils', 'elles',
                  'je', 'tu', 'il', 'elle', 'pas', 'non', 'mais', 'ou', 'et', 'aussi',
                  'avec', 'de', 'du', 'des', 'les', 'une', 'un', 'le', 'la', 'dans',
                  'pour', 'sur', 'par', 'que', 'qui', 'quoi', 'comment', 'pourquoi', 'quand',
                  'très', 'bien', 'plus', 'mon', 'ma', 'mes', 'ton', 'ce', 'cet', 'cette',
                  'merci', 'oui', 'bonjour', 'au', 'aux', 'être', 'faire', 'aller',
                ]),
                'es-ES': new Set([
                  'es', 'son', 'está', 'están', 'era', 'fue', 'ser', 'estar', 'tener', 'tiene',
                  'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'no', 'pero',
                  'que', 'qué', 'cómo', 'cuándo', 'dónde', 'quién', 'porque', 'para',
                  'con', 'sin', 'por', 'del', 'los', 'las', 'una', 'unos', 'unas',
                  'muy', 'más', 'bien', 'gracias', 'hola', 'sí', 'también', 'siempre',
                ]),
                'it-IT': new Set([
                  'è', 'sono', 'era', 'essere', 'avere', 'ha', 'hanno', 'ho', 'hai', 'siamo',
                  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'non', 'ma', 'o', 'e',
                  'che', 'chi', 'come', 'quando', 'dove', 'perché', 'anche', 'con', 'per',
                  'una', 'uno', 'del', 'della', 'dei', 'degli', 'il', 'la', 'le', 'gli',
                  'molto', 'bene', 'grazie', 'ciao', 'sì', 'prego', 'sempre', 'ancora',
                ]),
                'pt-BR': new Set([
                  'é', 'são', 'está', 'estão', 'era', 'ser', 'estar', 'ter', 'tem', 'têm',
                  'eu', 'tu', 'ele', 'ela', 'nós', 'vocês', 'eles', 'não', 'mas', 'ou', 'e',
                  'que', 'quê', 'como', 'quando', 'onde', 'quem', 'porque', 'para', 'com',
                  'uma', 'um', 'dos', 'das', 'do', 'da', 'os', 'as', 'no', 'na',
                  'muito', 'bem', 'obrigado', 'olá', 'sim', 'também', 'sempre', 'ainda',
                ]),
                'tr-TR': new Set([
                  'bir', 'bu', 'da', 'de', 'den', 'dir', 'dır', 'dür', 'dùr', 'için', 'ile',
                  'mi', 'mu', 'mü', 'mı', 'ne', 'nin', 'nın', 'nun', 'nün', 'var', 'yok',
                  'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'ama', 've', 'veya', 'çok',
                  'iyi', 'evet', 'hayır', 'tamam', 'nasıl', 'neden', 'nerede', 'ne zaman',
                  'teşekkür', 'merhaba', 'güzel', 'büyük', 'küçük', 'şimdi', 'zaman',
                ]),
                'vi-VN': new Set([
                  'là', 'có', 'không', 'và', 'của', 'trong', 'với', 'các', 'một', 'những',
                  'được', 'cho', 'người', 'tôi', 'bạn', 'anh', 'chị', 'em', 'họ', 'chúng',
                  'này', 'đó', 'gì', 'nào', 'sao', 'khi', 'vì', 'để', 'đã', 'đang',
                  'rất', 'thì', 'mà', 'nhưng', 'hoặc', 'còn', 'cũng', 'nếu', 'thế', 'cần',
                ]),
                'id-ID': new Set([
                  'adalah', 'ada', 'dan', 'atau', 'tidak', 'bukan', 'dengan', 'untuk', 'dari',
                  'yang', 'ini', 'itu', 'di', 'ke', 'pada', 'oleh', 'akan', 'sudah', 'belum',
                  'saya', 'anda', 'kamu', 'dia', 'kami', 'kita', 'mereka', 'bisa', 'harus',
                  'sangat', 'juga', 'lagi', 'sudah', 'masih', 'pernah', 'selalu', 'kadang',
                  'bagaimana', 'mengapa', 'kapan', 'dimana', 'siapa', 'berapa', 'apa',
                  'terima', 'kasih', 'selamat', 'baik', 'senang', 'maaf', 'tolong',
                ]),
                'ms-MY': new Set([
                  'adalah', 'ada', 'dan', 'atau', 'tidak', 'bukan', 'dengan', 'untuk', 'dari',
                  'yang', 'ini', 'itu', 'di', 'ke', 'pada', 'oleh', 'akan', 'sudah', 'belum',
                  'saya', 'awak', 'kamu', 'dia', 'kami', 'kita', 'mereka', 'boleh', 'perlu',
                  'sangat', 'juga', 'lagi', 'masih', 'pernah', 'selalu', 'kadang',
                  'terima', 'kasih', 'selamat', 'baik', 'bagus', 'maaf', 'tolong', 'lah', 'la',
                ]),
                'fil-PH': new Set([
                  'ang', 'ng', 'mga', 'sa', 'na', 'at', 'ay', 'para', 'si', 'siya',
                  'ko', 'mo', 'niya', 'tayo', 'kami', 'kayo', 'sila', 'hindi', 'oo', 'ito',
                  'iyan', 'iyon', 'dito', 'diyan', 'doon', 'bakit', 'paano', 'sino', 'kailan',
                  'sobra', 'masaya', 'malaki', 'maliit', 'salamat', 'kumusta', 'maganda',
                ]),
                'nl-NL': new Set([
                  'is', 'zijn', 'was', 'waren', 'worden', 'heeft', 'hebben', 'had', 'kunnen',
                  'ik', 'jij', 'hij', 'zij', 'wij', 'jullie', 'niet', 'geen', 'maar', 'of', 'en',
                  'ook', 'met', 'van', 'te', 'bij', 'na', 'uit', 'als', 'hoe', 'wat', 'wie',
                  'dat', 'dit', 'die', 'de', 'het', 'een', 'meer', 'heel', 'goed', 'dank',
                ]),
                'pl-PL': new Set([
                  'jest', 'są', 'był', 'była', 'być', 'mam', 'masz', 'ma', 'mamy', 'mają',
                  'ja', 'ty', 'on', 'ona', 'my', 'wy', 'oni', 'nie', 'ale', 'lub', 'i', 'też',
                  'co', 'jak', 'kiedy', 'gdzie', 'kto', 'dlaczego', 'tu', 'tam', 'już', 'to',
                  'bardzo', 'dobrze', 'dziękuję', 'cześć', 'tak', 'też', 'zawsze', 'jeszcze',
                ]),
                'ko-KR': new Set([
                  // Romanized Korean (konglish / casual roman)
                  'annyeong', 'gamsahamnida', 'nae', 'ne', 'anieyo', 'iseo', 'isseo',
                  'hamnida', 'haeseo', 'gayo', 'wayo', 'juseyo', 'kamsahamnida', 'saranghae',
                  'oppa', 'unni', 'hyung', 'noona', 'aigoo', 'daebak', 'heol', 'mwo',
                ]),
              };

              // Score each language by counting matched words
              const scores = {};
              for (const [langCode, wordSet] of Object.entries(romanizedWordSets)) {
                let score = 0;
                for (const w of words) {
                  if (wordSet.has(w)) score++;
                }
                scores[langCode] = score;
              }

              // Find winner — must have at least 2 word hits and beat runner-up by 1
              const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
              const [topLang, topScore] = sorted[0];
              const runnerScore = sorted[1]?.[1] || 0;

              if (topScore >= 2 && topScore > runnerScore) {
                console.log(`[LANG] Romanized detection → ${topLang} (score:${topScore})`);
                return topLang;
              }

              // ── PHASE 3: User's Voice Settings → then English fallback ──────────
              return audioLangCode || 'en-US';
            };

            targetLang = detectLanguageFromText(cleanText);

            // Show loading with detected language
            const langLabels = {
              'hi-IN': 'Hindi', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
              'en-AU': 'English (AU)', 'en-IN': 'English (IN)', 'ar-XA': 'Arabic',
              'ur-IN': 'Urdu', 'ru-RU': 'Russian', 'uk-UA': 'Ukrainian',
              'cmn-CN': 'Chinese (CN)', 'cmn-TW': 'Chinese (TW)', 'ja-JP': 'Japanese',
              'ko-KR': 'Korean', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
              'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'gu-IN': 'Gujarati',
              'pa-IN': 'Punjabi', 'mr-IN': 'Marathi', 'th-TH': 'Thai',
              'el-GR': 'Greek', 'he-IL': 'Hebrew', 'de-DE': 'German',
              'fr-FR': 'French', 'es-ES': 'Spanish', 'it-IT': 'Italian',
              'pt-BR': 'Portuguese', 'nl-NL': 'Dutch', 'pl-PL': 'Polish',
              'sv-SE': 'Swedish', 'nb-NO': 'Norwegian', 'da-DK': 'Danish',
              'fi-FI': 'Finnish', 'cs-CZ': 'Czech', 'sk-SK': 'Slovak',
              'ro-RO': 'Romanian', 'hu-HU': 'Hungarian', 'tr-TR': 'Turkish',
              'vi-VN': 'Vietnamese', 'id-ID': 'Indonesian', 'ms-MY': 'Malay',
              'fil-PH': 'Filipino', 'yue-HK': 'Cantonese',
            };
            // ── Integrated Voice Engine ──────────────────────────────────────────
            // Use the user's selected persona (e.g., Autonoe, Charon) but adapt to detected language
            const selectedVoicePersona = audioVoiceName.split('-Chirp3-HD-')[1] || 'Autonoe';
            const finalVoice = `${targetLang}-Chirp3-HD-${selectedVoicePersona}`;

            const response = await axios.post(apis.synthesizeFile, {
              introText: cleanText,
              languageCode: targetLang,
              voiceName: finalVoice,
              pitch: audioPitch,
              speakingRate: audioSpeed
            }, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: { Authorization: `Bearer ${getUserData()?.token}` }
            });

            toast.dismiss('voice-loading');
            audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
          }

          // Save to Cache
          if (msgId && audioBlob) {
            audioCacheRef.current[msgId] = audioBlob;
          }
        }

        // Check if user stopped/switched while we were fetching
        if (currentSpeechResolverRef.current && currentSpeechResolverRef.current !== resolve) {
          console.log('[VOICE] Aborted playback - new task started');
          resolve();
          return;
        }

        // DOUBLE CHECK: Stop any existing audio before playing new one
        if (window.currentAudio) {
          window.currentAudio.pause();
          window.currentAudio = null;
        }

        const url = window.URL.createObjectURL(audioBlob);
        const audio = new Audio(url);

        window.currentAudio = audio;
        audioRef.current = audio;

        audio.onended = () => {
          window.URL.revokeObjectURL(url);
          if (window.currentAudio === audio) window.currentAudio = null;
          if (audioRef.current === audio) audioRef.current = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`[VOICE] Audio playback error:`, e);
          if (!readableAttachment) fallbackSpeak(cleanTextForTTS(text), targetLang);
          resolve();
        };

        // Modern browsers require a user gesture. Since synthesis is async,
        // we hope the browser still respects the original click gesture.
        // If it fails, we catch it and fallback.
        try {
          await audio.play();
        } catch (playErr) {
          console.warn('[VOICE] Playback blocked by browser, trying fallback...', playErr);
          if (!readableAttachment) fallbackSpeak(cleanTextForTTS(text), targetLang);
          resolve();
        }

      } catch (err) {
        console.error('[VOICE] Synthesis failed:', err);
        toast.dismiss('voice-loading');

        const isRestricted = err.response?.status === 403 || err.response?.status === 402;
        const details = err.response?.data?.details || err.response?.data?.error || err.message;

        if (!isRestricted) {
          toast.error(`Voice failed: ${details}`, { duration: 3000 });
        } else {
          console.log('[VOICE] AI Voice restricted (Premium feature). Falling back to standard browser voice.');
        }

        // fallback logic...
        if (!attachments || attachments.length === 0) {
          // If restricted, we use standard fallback without making it look like a "failure" to the user
          fallbackSpeak(cleanTextForTTS(text), 'en-US');
        }
        resolve();
      }
    });
  };

  const processSpeechQueue = async () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    isSpeakingRef.current = true;
    const task = speechQueueRef.current[0];

    setSpeakingMessageId(task.msgId);
    setIsPaused(false);

    try {
      await executeSpeak(task.text, task.language, task.msgId, task.attachments);
    } catch (e) {
      console.error(e);
    } finally {
      // Completed (or stopped)
      if (speechQueueRef.current.length > 0 && speechQueueRef.current[0] === task) {
        speechQueueRef.current.shift(); // Remove finished
      }
      isSpeakingRef.current = false;
      currentSpeechResolverRef.current = null;

      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        setSpeakingMessageId(null);
      }
    }
  };

  const stopCurrentSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }
    window.speechSynthesis.cancel();

    // Resolve any pending promise
    if (currentSpeechResolverRef.current) {
      currentSpeechResolverRef.current();
      currentSpeechResolverRef.current = null;
    }
  };

  // Voice Output - Speak AI Response
  const speakResponse = async (text, language, msgId, attachments = [], force = false) => {
    // 1. Handle Toggle on the SAME message (Manual Click)
    // 1. Handle Toggle on the SAME message (Manual Click)
    if (force && speakingMessageId === msgId) {
      const activeAudio = audioRef.current || window.currentAudio;
      if (activeAudio) {
        if (!activeAudio.paused) {
          console.log(`[VOICE] Pausing message: ${msgId}`);
          activeAudio.pause();
          setIsPaused(true);
          return;
        } else {
          console.log(`[VOICE] Resuming message: ${msgId}`);
          await activeAudio.play();
          setIsPaused(false);
          return;
        }
      }
    }

    // 2. Force Mode (Manual Click on DIFFERENT message)
    if (force) {
      console.log(`[VOICE] Force playing new message: ${msgId}`);
      // Stop everything immediately
      stopCurrentSpeech();
      isSpeakingRef.current = false;

      // Clear queue
      speechQueueRef.current = [];

      // Add new task
      speechQueueRef.current.push({ text, language, msgId, attachments });

      // Start processing immediately
      processSpeechQueue();
      return;
    }

    // 3. Normal Enqueue (Auto-play flow)
    speechQueueRef.current.push({ text, language, msgId, attachments });
    if (!isSpeakingRef.current) {
      processSpeechQueue();
    }
  };

  const fallbackSpeak = (text, lang) => {
    console.log(`[VOICE] Using browser fallback for: ${lang}`);
    if (!window.speechSynthesis) {
      console.error('[VOICE] SpeechSynthesis not supported in this browser.');
      return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Find a better voice if possible
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      console.log(`[VOICE] Browser fallback using voice: ${matchedVoice.name}`);
    }

    utterance.onstart = () => console.log('[VOICE] Browser speech started.');
    utterance.onend = () => console.log('[VOICE] Browser speech ended.');
    utterance.onerror = (e) => console.error('[VOICE] Browser speech error:', e);

    window.speechSynthesis.speak(utterance);
  };


  useEffect(() => {
    const loadSessions = async () => {
      const data = await chatStorageService.getSessions(currentProjectId);
      setSessions(data);

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user?.id || user?._id;
        if (userId) {
          if (hasLoadedAgentsRef.current) {
            return;
          }
          const token = getUserData()?.token || localStorage.getItem("token");
          const res = await axios.post(apis.getUserAgents, { userId }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const agents = res.data?.agents || [];
          const processedAgents = [{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }, ...agents];
          setUserAgents(processedAgents);
          hasLoadedAgentsRef.current = true;
        } else {
          setUserAgents([{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }]);
        }
      } catch (err) {
        setUserAgents([{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }]);
      }
    };
    loadSessions();
  }, [setSessions, currentProjectId]);

  const isNavigatingRef = useRef(false);
  const lastLoadedSessionRef = useRef(null);
  const mountedSessionIdRef = useRef(sessionId);
  const pendingMediaTitleRef = useRef(null); // Holds interim title for image/video sessions until AI title is ready

  useEffect(() => {
    mountedSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const initChat = async () => {
      setIsSessionLoading(true);

      // ─── Creation Navigation Guard ───
      // If we just created a 'new' session, we already have its state in local messages.
      // We only skip history loading IF the sessionId matches the one we just created.
      if (isNavigatingRef.current === sessionId) {
        console.log(`[Hydration] Skipping redundant reload for fresh session: ${sessionId}`);
        isNavigatingRef.current = false;
        setIsHydrating(false);
        setIsSessionLoading(false);
        return;
      }
      // Safety reset for stale navigation flags
      isNavigatingRef.current = false;

      const currentSession = sessionId;

      if (currentSession && currentSession !== 'new' && lastLoadedSessionRef.current === currentSession) {
        setIsHydrating(false);
        setIsSessionLoading(false);
        return;
      }

      try {
        if (sessionId && sessionId !== 'new') {
          if (lastLoadedSessionRef.current && lastLoadedSessionRef.current !== sessionId && lastLoadedSessionRef.current !== 'new') {
            setMessages([]);
          }

          const sessionData = await chatStorageService.getHistory(sessionId);
          if (currentSession !== sessionId) return;

          const historyMessages = Array.isArray(sessionData) ? sessionData : (sessionData.messages || []);
          const sessionMeta = Array.isArray(sessionData) ? {} : sessionData;

          // If this session belongs to a case, sync with workspace store
          const projId = sessionMeta.projectId?._id || sessionMeta.projectId?.id || (typeof sessionMeta.projectId === 'string' ? sessionMeta.projectId : null);
          if (projId && projId !== 'null' && projId !== 'undefined' && projId !== 'new' && projId !== 'all' && projId !== 'default') {
            updateWorkspace(projId, { messages: historyMessages });
          }

          // 1. Restore Project Context
          if (projId && projId !== currentProjectId) {
            console.log(`[Hydration] Restoring Project ID: ${projId}`);
            setCurrentProjectId(projId);
          }

          // 2. Restore Mode & Tool Context
          if (sessionMeta.detectedMode) {
            console.log(`[Hydration] Restoring Mode: ${sessionMeta.detectedMode}`);
            setCurrentMode(sessionMeta.detectedMode);

            if (sessionMeta.detectedMode === 'LEGAL_TOOLKIT') {
              setActiveLegalToolkit(false); // DO NOT auto-open on hydration
              // If there's a specific tool saved, restore it
              if (sessionMeta.activeTool) {
                const tool = PREMIUM_TOOLS.find(t => t.id === sessionMeta.activeTool);
                if (tool) {
                  console.log(`[Hydration] Restoring Legal Tool: ${tool.name}`);
                  setSelectedLegalTool(tool);
                  setActiveTool(tool.name);
                } else if (sessionMeta.activeTool === 'legal_my_case') {
                  const copilotTool = { id: 'legal_my_case', name: 'AI Legal Assistant', icon: '⚖️' };
                  setSelectedLegalTool(copilotTool);
                  setActiveTool(copilotTool.name);
                } else {
                  setSelectedLegalTool(null);
                  setActiveTool(null);
                }
              } else {
                setSelectedLegalTool(null);
                setActiveTool(null);
              }
            } else {
              setSelectedLegalTool(null);
              setActiveTool(null);
            }
          } else if (projId && currentCase?.isLegalCase) {
            // Fallback for older sessions without detectedMode
            setCurrentMode('LEGAL_TOOLKIT');
            setActiveLegalToolkit(false); // DO NOT auto-open on hydration fallback
            const copilotTool = { id: 'legal_my_case', name: 'AI Legal Assistant', icon: '⚖️' };
            setSelectedLegalTool(copilotTool);
            setActiveTool(copilotTool.name);
          } else {
            setSelectedLegalTool(null);
            setActiveTool(null);
          }

          const processedHistory = historyMessages.map(msg => {
            if (!msg.id) msg.id = (msg._id || Math.random().toString(36).substr(2, 9)).toString();
            if (msg.conversion && msg.conversion.file && !msg.conversion.blobUrl) {
              try {
                const byteCharacters = atob(msg.conversion.file);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: msg.conversion.mimeType });
                msg.conversion.blobUrl = URL.createObjectURL(blob);
              } catch (e) { console.error("Blob recovery failed:", e); }
            }
            return msg;
          });

          // ─── Live Generation Re-attachment ───
          // Atomically merge history with any ongoing background stream
          let finalMessages = processedHistory;

          // Optimization: If the backend returns empty history (common for brand new sessions)
          // but we already have local messages (user message just sent), don't overwrite with empty.
          const localMessages = useGenerationStore.getState().messagesByChat[sessionId] || [];
          if (finalMessages.length === 0 && localMessages.length > 0) {
            console.log(`[Hydration] Preserving ${localMessages.length} local messages for fresh session: ${sessionId}`);
            finalMessages = localMessages;
          }
          const liveGen = useGenerationStore?.getState?.()?.generations?.[sessionId];

          if (liveGen?.isGenerating && liveGen.typingMessageId) {
            const hasTyping = finalMessages.some(m => m.id === liveGen.typingMessageId);
            if (!hasTyping) {
              finalMessages = [...finalMessages, {
                id: liveGen.typingMessageId,
                role: 'model',
                content: liveGen.partialResponse || '',
                timestamp: Date.now()
              }];
            } else if (liveGen.partialResponse) {
              // Sync content if already in history
              finalMessages = finalMessages.map(m =>
                m.id === liveGen.typingMessageId ? { ...m, content: liveGen.partialResponse } : m
              );
            }
            setIsLoading(true);
            setTypingMessageId(liveGen.typingMessageId);
          }

          setMessages(finalMessages);
          lastLoadedSessionRef.current = sessionId;

          const params = new URLSearchParams(location.search);
          const toolParam = params.get('tool') || activeTool;
          if (toolParam?.startsWith('legal_')) {
            const legalTool = PREMIUM_TOOLS.find(t => t.id === toolParam);
            if (legalTool && selectedLegalTool?.id !== toolParam) {
              activateToolWithTypingEffect(toolParam, legalTool?.name, false);
            }
          } else if (sessionMeta?.detectedMode === 'LEGAL_TOOLKIT') {
            setCurrentMode('LEGAL_TOOLKIT');
            setLegalView('CHAT');
          }
        } else {
          lastLoadedSessionRef.current = 'new';

          // Only clear messages if we are NOT in the middle of a redirect to a case session
          const isCaseRoute = location.pathname.startsWith('/dashboard/case/') || location.pathname.startsWith('/dashboard/cases/');
          if (!isCaseRoute) {
            setMessages([]);
          }

          const params = new URLSearchParams(location.search);
          const toolParam = params.get('tool');

          if (toolParam?.startsWith('legal_')) {
            const legalTool = PREMIUM_TOOLS.find(t => t.id === toolParam);
            if (legalTool) {
              setCurrentMode('LEGAL_TOOLKIT');
              setSelectedLegalTool(legalTool);
              setActiveTool(legalTool.name);
              setLegalView('CHAT');
            }
          } else if (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') {
            setCurrentCase(null);
            if (currentMode !== 'LEGAL_TOOLKIT') {
              setCurrentMode('NORMAL_CHAT');
              setSelectedLegalTool(null);
            }
          } else if (currentCase?.isLegalCase) {
            setCurrentMode('LEGAL_TOOLKIT');
            setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
          }

          const user = getUserData();
          if (user && user.token && !memory) {
            try {
              const res = await axios.get(`${apis.baseUrl}/memory`, {
                headers: { Authorization: `Bearer ${user.token}` }
              });
              const mem = res.data;
              setMemoryRecoil(mem);
              if (mem && mem.isMemoryEnabled) {
                const name = mem.name || user.name || "friend";
                const business = mem.businessType;
                // if (!mem.name && !mem.businessType && sessionId === 'new') setShowOnboarding(true);

                // let greeting = `Hello ${name}! 👋 Welcome back. `;
                // if (business) greeting += `How is everything going with your ${business} work? `;
                // greeting += "I've loaded your context and I'm ready to assist. What can we achieve today?";

                // setMessages([{
                //   id: 'welcome-' + Date.now(),
                //   role: 'model',
                //   content: greeting,
                //   timestamp: new Date()
                // }]);
              }
            } catch (e) { console.warn("Memory load failed", e); }
          }
        }

        // Final sync for case workspace if applicable
        if (caseId) {
          const ws = getWorkspace(caseId);
          if (ws?.activeTool && selectedLegalTool?.id !== ws.activeTool.id) {
            setSelectedLegalTool(ws.activeTool);
            setActiveTool(ws.activeTool.name);
          }
        }
      } catch (err) {
        console.error("Chat initialization failed:", err);
      } finally {
        setIsHydrating(false);
        setIsSessionLoading(false);
        setIsHistoryOpen(false);
      }
    };
    initChat();
  }, [sessionId, currentProjectId, location.search, location.pathname]);

  const chatContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const isStreamingRef = useRef(false); // true while AI is typing word-by-word
  const ticking = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const updateScrollDownButtonVisibility = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const hasOverflow = scrollHeight > clientHeight;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 30;

      const shouldShow = messages.length > 0 && hasOverflow && !isNearBottom;
      setShowScrollDownBtn(shouldShow);
    } else {
      setShowScrollDownBtn(false);
    }
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      updateScrollDownButtonVisibility();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollDownButtonVisibility]);

  useEffect(() => {
    if (messages.length === 0) {
      shouldAutoScrollRef.current = true;
    }
  }, [messages]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

          const isMobile = window.innerWidth < 1024;
          if (isMobile) {
            if (scrollTop > lastScrollTopRef.current && scrollTop > 50) {
              setIsHeaderVisible(false);
            } else if (scrollTop < lastScrollTopRef.current) {
              setIsHeaderVisible(true);
            }
          } else {
            // Desktop: Always stay visible
            setIsHeaderVisible(true);
          }
          lastScrollTopRef.current = scrollTop <= 0 ? 0 : scrollTop;

          // Update workspace scroll position for persistence (Debounced to prevent re-render flickering)
          if (caseId || currentProjectId) {
            const id = caseId || currentProjectId;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
              updateWorkspace(id, { uiState: { scrollPosition: scrollTop } });
            }, 300);
          }

          // Precise threshold (30px) to determine if user is reading or at the bottom
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 30;
          shouldAutoScrollRef.current = isNearBottom;
          updateScrollDownButtonVisibility();
          ticking.current = false;
        });
        ticking.current = true;
      }
    }
  };

  const handleScrollToBottom = () => {
    shouldAutoScrollRef.current = true;
    scrollToBottom(true, 'smooth');
    setShowScrollDownBtn(false);
  };

  const scrollToBottom = (force = false, behavior = 'auto') => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 30;

      if (force) {
        shouldAutoScrollRef.current = true;
      } else {
        shouldAutoScrollRef.current = isNearBottom;
      }

      if (force || isNearBottom) {
        const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
        if (behavior === 'smooth') {
          chatContainerRef.current.scrollTo({ top: maxScrollTop + 100, behavior: 'smooth' });
        } else {
          chatContainerRef.current.scrollTop = maxScrollTop + 500;
        }
      }
    }
  };

  useEffect(() => {
    // If we just loaded a case workspace, restore its scroll position
    if (caseId && chatContainerRef.current) {
      const ws = getWorkspace(caseId);
      if (ws?.uiState?.scrollPosition) {
        chatContainerRef.current.scrollTop = ws.uiState.scrollPosition;
        updateScrollDownButtonVisibility();
        return;
      }
    }

    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
    updateScrollDownButtonVisibility();
  }, [messages, isLoading, caseId, gen.isGenerating]);

  const handleNewChat = async () => {
    // Proactive Guest Limit Check for new session creation
    const token = getUserData()?.token;
    if (!token && sessions.length >= 5) {
      window.dispatchEvent(new CustomEvent('login_required', {
        detail: {
          toolName: 'AI LEGAL™ Unlimited Legal Chat',
          customMessage: "You've reached the guest limit of 5 sessions. Please sign in to create more chat sessions!"
        }
      }));
      return;
    }

    setCurrentProjectId('default');
    setCurrentMode('NORMAL_CHAT');
    setSelectedLegalTool(null);
    setMessages([]); // Clear messages immediately for instant transition
    navigate('/dashboard/chat/new', { state: { forceGlobal: true } });
    setIsHistoryOpen(false);
  };

  const handleDriveClick = () => {
    setIsAttachMenuOpen(false);
    // Simulating Drive Integration via Link
    const link = prompt("Paste your Google Drive File Link:");
    if (link) {
      setFilePreviews(prev => [...prev, {
        url: link,
        name: "Google Drive File",
        type: "application/vnd.google-apps.file",
        size: 0,
        isLink: true,
        id: Math.random().toString(36).substr(2, 9)
      }]);
      setSelectedFiles(prev => [...prev, { name: "Google Drive File", type: "link" }]);
    }
  };

  const isSendingRef = useRef(false);

  const activateToolWithTypingEffect = (toolKey, toolName, shouldToast = true) => {
    // 1. Set Primary Modes
    setCurrentMode('LEGAL_TOOLKIT');
    localStorage.setItem('aisa_active_mode', 'LEGAL_TOOLKIT');
    localStorage.setItem('aisa_legal_view', 'CHAT');
    setActiveLegalToolkit(false); // Close the toolkit modal immediately

    const TOOL_NAMES = {
      legal_my_case: "My Case Assistant",
      legal_general_chat: "GENERAL CHAT",
      legal_free_chat: "General Legal Chat",
      legal_precedents: "Legal Precedents",
      legal_case_law_research: "Legal Precedents",
      legal_draft_maker: "Draft Maker",
      legal_case_predictor: "Case Predictor",
      legal_argument_builder: "Argument Builder",
      legal_evidence_checker: "Evidence Analyst",
      legal_contract_analyzer: "Contract Analyzer",
      legal_strategy_engine: "Strategy Engine",
      legal_compliance_checker: "Compliance Checker"
    };

    const finalToolName = toolName || TOOL_NAMES[toolKey] || toolKey;

    // 2. Set Active Tool Context
    setSelectedLegalTool({ id: toolKey, name: finalToolName });
    setActiveTool(finalToolName);

    // 3. UI View Logic (Switch to specific panels if needed)
    if (toolKey === 'legal_precedents' || toolKey === 'legal_case_law_research') {
      setLegalView('PRECEDENTS');
      fetchLegalCases();
    } else if (toolKey === 'legal_my_case') {
      setLegalView('DASHBOARD');
      fetchLegalCases();
    } else {
      setLegalView('CHAT'); // Default to AI Chat Assistant view
    }

    // 4. Ensure Input Box is clean
    setInputValue('');
    if (inputRef.current) inputRef.current.focus();

    // 5. Professional Activation Feedback (Toast)
    if (shouldToast) {
      toast.dismiss(); // Clear any previous tool activation toasts
      toast.success(
        <div className="flex items-center gap-2.5">
          <Zap size={14} className="text-indigo-600 animate-pulse" fill="currentColor" />
          <span className="font-black text-[12px] uppercase tracking-wide">{finalToolName} Activated</span>
        </div>,
        {
          duration: 1500, // Compact 1.5s duration
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#1E293B',
            borderRadius: '16px',
            padding: '10px 16px',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          }
        }
      );
    }
  };

  const handleSuggestionClick = (text) => {
    // Record click count
    recordSuggestionClick(text);

    // 1. Check for Legal Tool Redirection
    if (currentProjectId && currentProjectId !== 'default') {
      const lowerText = text.toLowerCase();
      // Map suggestion phrases to internal tool IDs
      const toolMap = {
        'draft a legal notice': 'legal_draft_maker',
        'draft a response': 'legal_draft_maker',
        'create a legal notice': 'legal_draft_maker',
        'analyze this document': 'legal_contract_analyzer',
        'analyze a contract': 'legal_contract_analyzer',
        'search relevant case laws': 'legal_precedents',
        'research case laws': 'legal_precedents',
        'identify legal risks': 'legal_compliance_checker',
        'check compliance': 'legal_compliance_checker'
      };

      for (const [phrase, toolId] of Object.entries(toolMap)) {
        if (lowerText.includes(phrase)) {
          console.log(`[LegalRedirect] Redirecting to tool: ${toolId}`);

          const legalTool = PREMIUM_TOOLS.find(t => t.id === toolId);
          activateToolWithTypingEffect(toolId, legalTool?.name);
          return;
        }
      }
    }

    // Default: Fill the input box briefly as requested
    setInputValue(text);
    // Immediately trigger the message send
    handleSendMessage(null, text);
  };

  const handleAcceptRouting = async (msg) => {
    const activeSessionId = sessionId || 'new';

    // 1. Remove/Filter out the offer message from messages state
    setMessages(prev => prev.filter(m => m.id !== msg.id), activeSessionId);
    chatStorageService.deleteMessage(activeSessionId, msg.id, currentProjectId).catch(e => console.error(e));

    // 2. Add visual divider message
    const dividerMsg = {
      id: `divider-${Date.now()}`,
      role: 'system',
      isDivider: true,
      content: `Switched to ${msg.suggestedToolName}`,
      timestamp: new Date(),
      mode: 'LEGAL_TOOLKIT',
      activeTool: msg.suggestedToolId
    };
    setMessages(prev => [...prev, dividerMsg], activeSessionId);
    chatStorageService.saveMessage(activeSessionId, dividerMsg, null, currentProjectId).catch(e => console.error(e));

    // 3. Set the new tool active
    setCaseAiActiveTool(msg.suggestedToolId);
    if (currentProjectId) {
      updateWorkspace(currentProjectId, { activeTool: { id: msg.suggestedToolId, name: msg.suggestedToolName } });
    }

    // 4. Send the message with override
    handleSendMessage(null, msg.originalContent, msg.suggestedToolId);
  };

  const handleDeclineRouting = async (msg) => {
    const activeSessionId = sessionId || 'new';

    // 1. Remove/Filter out the offer message from messages state
    setMessages(prev => prev.filter(m => m.id !== msg.id), activeSessionId);
    chatStorageService.deleteMessage(activeSessionId, msg.id, currentProjectId).catch(e => console.error(e));

    // 2. Send the message with current tool override ('legal_my_case') to bypass routing match
    handleSendMessage(null, msg.originalContent, 'legal_my_case');
  };

  const handleSendMessage = async (e, overrideContent, toolOverride = null) => {
    if (e) e.preventDefault();

    // Prioritize the sessionId from URL params to avoid state-sync race conditions
    let activeSessionId = sessionId || 'new';
    const now = Date.now();
    const chatLock = getSessionLock(activeSessionId);

    // PER-CHAT LOCK & DEBOUNCE
    // Bypass lock for 'new' sessions to avoid cross-chat blocking during creation
    if (activeSessionId !== 'new' && (chatLock.locked || (now - chatLock.lastSentTime < 800))) {
      console.warn(`[AI LEGAL™] Message blocked: chat ${activeSessionId} is already sending.`);
      return;
    }

    // Mark as sending IMMEDIATELY to block any simultaneous calls (form submit + Enter key)
    chatLock.locked = true;

    const contentToSend = typeof overrideContent === 'string' ? overrideContent : (longTextPreview || inputValue.trim());
    if (!contentToSend && filePreviews.length === 0) {
      chatLock.locked = false;
      return;
    }

    // --- CASE WORKSPACE INTELLIGENT ROUTING ---
    const isCaseWorkspaceActive = !!activeCaseId && !!currentCase;
    if (isCaseWorkspaceActive && caseAiActiveTool === 'legal_my_case' && !toolOverride) {
      // In Case Assistant mode, process all suggested tasks/prompts directly within the Case Assistant
      // without creating 'Switched to Tool' banners or changing routes.
      toolOverride = 'legal_my_case';
    }

    if (longTextPreview) setLongTextPreview(null);
    setIsAutoPreviewDisabled(false);

    // --- LEGAL ACTION INTERCEPTORS ---
    if (currentMode === 'LEGAL_TOOLKIT' && currentCase) {
      if (contentToSend === "⚖️ Open Case Intelligence") {
        setIsCasePanelOpen(true);
        chatLock.locked = false;
        return;
      }
      if (contentToSend === "🔍 Auto-Analyze Case") {
        setIsCasePanelOpen(true);
        // We can't easily trigger the button inside the component from here, 
        // but opening the panel is the first step.
        chatLock.locked = false;
        return;
      }
    }

    // LOCK IMMEDIATELY
    chatLock.locked = true;
    chatLock.lastSentTime = now;
    lastMessageSentTime = now;
    setIsLoading(true); // Still used for local UI transitions (Thinking dots)
    // isSendingRef.current = true; // Use chatLock instead

    // --- Proactive Magic Tool Activation Check Removed ---
    // Messages now flow to the backend normally.
    // The backend's adaptive system will handle tool restrictions based on the active mode.

    // --- Subscription Limit Checks ---
    let featureToTrack = 'chat';
    if (isDeepSearch || toolOverride === 'deep_search') featureToTrack = 'deepSearch';
    else if (isWebSearch || toolOverride === 'web_search') featureToTrack = 'webSearch';
    else if (isDocumentConvert || toolOverride === 'file_conversion') featureToTrack = 'document';
    else if (isCodeWriter || toolOverride === 'code_writer') featureToTrack = 'codeWriter';

    if (!checkLimitLocally(featureToTrack)) {
      chatLock.locked = false;
      setIsLoading(false);
      return;
    }

    // ─── Smart Routing Interceptor (Pipeline System) ─────────────────────────
    // If a tool intent was detected with high confidence but not activated,
    // we route it through the pipeline instead of standard chat.
    if (intentSuggestion && !toolOverride && intentSuggestion.confidence > 0.85 && intentSuggestion.intent !== 'normal_chat') {
      // Check if ANY magic tool mode is already active
      const isCurrentModeChat = !isImageGeneration && !isVideoGeneration && !isDeepSearch && !isWebSearch &&
        !isMagicEditing && !isCodeWriter && !isFileAnalysis && !isAudioConvertMode &&
        !isDocumentConvert && !isVoiceMode;

      if (isCurrentModeChat) {
        console.log(`[IntentRouting] High confidence intent (${intentSuggestion.intent}) detected. Routing to pipeline.`);
        const activeSuggestion = intentSuggestion;
        setIntentSuggestion(null); // Clear state immediately

        handleAcceptSuggestion(activeSuggestion, false);
        // After switching mode, we recursively call handleSendMessage with the tool override
        setTimeout(() => {
          chatLock.locked = false;
          setIsLoading(false);
          handleSendMessage(e, contentToSend, activeSuggestion.intent);
        }, 50);
        return;
      }
    }


    // (Removed duplicated routing block that bypassed try-catch locks)


    try {
      if (isAudioConvertMode && !contentToSend && selectedFiles.length === 0) {
        toast.error('Please enter text or upload a file to convert to audio');
        return;
      }

      if (isDocumentConvert && selectedFiles.length === 0) {
        toast.error('Please upload a PDF or DOCX file to convert');
        return;
      }

      // Special case for Audio Convert Mode: Handle files directly if present
      if (isAudioConvertMode && selectedFiles.length > 0) {
        if (activeSessionId === 'new') {
          activeSessionId = await chatStorageService.createSession();

          isNavigatingRef.current = true;
          if (activeCaseId) {
            setCurrentCaseSessionId(activeSessionId);
          } else {
            navigate(`/dashboard/chat/${activeSessionId}`, { replace: true });
          }
        }
        const fileToConvert = selectedFiles[0];
        setInputValue('');
        setSelectedFiles([]);
        setFilePreviews([]);
        await manualFileToAudioConversion(fileToConvert, activeSessionId);
        chatLock.locked = false;
        setIsLoading(false);
        return;
      }

      // Special case for Audio Convert Mode: Handle text conversion
      if (isAudioConvertMode && contentToSend) {
        if (activeSessionId === 'new') {
          activeSessionId = await chatStorageService.createSession();

          isNavigatingRef.current = true;
          if (activeCaseId) {
            setCurrentCaseSessionId(activeSessionId);
          } else {
            navigate(`/dashboard/chat/${activeSessionId}`, { replace: true });
          }
        }
        setInputValue('');
        await manualTextToAudioConversion(contentToSend, activeSessionId);
        chatLock.locked = false;
        setIsLoading(false);
        return;
      }

      // isSendingRef already true
      setInputValue('');
      setSuggestions([]);
      transcriptRef.current = '';

      let isFirstMessage = false;

      // --- GUEST LIMIT PROACTIVE CHECK ---
      const token = getUserData()?.token;
      if (!token) {
        // 1. Session Limit (5 sessions)
        if (activeSessionId === 'new' && sessions.length >= 5) {
          window.dispatchEvent(new CustomEvent('login_required', {
            detail: {
              toolName: 'AI LEGAL™ Unlimited Legal Chat',
              customMessage: "You've reached the guest limit of 5 sessions. Please sign in to create more chat sessions!"
            }
          }));
          setIsLoading(false);
          chatLock.locked = false;
          return;
        }

        // 2. Chat Count Limit (10 user messages per session)
        const userMsgCount = messages.filter(m => m.role === 'user').length;
        if (activeSessionId !== 'new' && userMsgCount >= 10) {
          window.dispatchEvent(new CustomEvent('login_required', {
            detail: {
              toolName: 'AI LEGAL™ Unlimited Legal Chat',
              customMessage: "You've reached the guest limit of 10 chats per session. Please sign in to continue this conversation!"
            }
          }));
          setIsLoading(false);
          chatLock.locked = false;
          return;
        }
      }

      // Stop listening if send is clicked
      if (isListening && recognitionRef.current) {
        isManualStopRef.current = true;
        recognitionRef.current.stop();
        setIsListening(false);
      }

      if (activeSessionId === 'new') {
        try {
          activeSessionId = await chatStorageService.createSession();

          // Transition global generation state from 'new' to real ID
          useGenerationStore.getState().transitionChatId('new', activeSessionId);

          if (activeCaseId) {
            setCurrentCaseSessionId(activeSessionId);
            const searchParams = new URLSearchParams(location.search);
            searchParams.set('sessionId', activeSessionId);
            navigate(`/dashboard/cases/${activeCaseId}?${searchParams.toString()}`, { replace: true });
          }

          isFirstMessage = true;
          isNavigatingRef.current = activeSessionId; // Store the ID we are navigating TO
        } catch (err) {
          console.error("Failed to create session:", err);
          toast.error('Failed to start a new chat session');
          return;
        }
      }

      // Handle AI Legal Mode (Specific Tool Execution)
      const isLegalOverride = toolOverride && toolOverride.startsWith('legal_');
      if ((currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool) || isLegalOverride) {
        let activeToolId = isLegalOverride ? toolOverride : (activeCaseId ? caseAiActiveTool : selectedLegalTool?.id);
        let activeToolName = isLegalOverride ?
          (toolOverride.replace('legal_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) :
          (activeCaseId ? (TOOL_CHIP_DETAILS[caseAiActiveTool]?.name || 'Assistant') : selectedLegalTool?.name);

        // Smart Tool Routing: If in general case assistant but requesting a specific draft/notice
        if (activeToolId === 'legal_my_case' && !activeCaseId) {
          const lowerMsg = contentToSend.toLowerCase();
          if (lowerMsg.includes('notice') || lowerMsg.includes('legal notice')) {
            activeToolId = 'legal_notice_generator';
            activeToolName = 'Legal Notice';
          } else if (lowerMsg.includes('draft') || lowerMsg.includes('agreement') || lowerMsg.includes('affidavit')) {
            activeToolId = 'legal_draft_maker';
            activeToolName = 'Draft Maker';
          }
        }

        setLoadingText(`${activeToolName}... ⚖️`);
        // Start generation tracking so the "AISA is thinking..." indicator shows
        gen.start({ loadingText: `${activeToolName}... ⚖️` }, activeSessionId);
        try {
          const userMsgId = Date.now().toString();
          const newUserMsg = {
            id: userMsgId,
            role: 'user',
            content: (contentToSend === 'legal drafting engine' || contentToSend === 'DRAFT NOTICE')
              ? 'Drafting Legal Notice for the case... 📄⚖️'
              : contentToSend,
            timestamp: new Date(),
            mode: 'LEGAL_TOOLKIT',
            activeTool: activeToolId,
            conversationType: (selectedRole === 'student' && !activeCaseId) ? 'student_tutor' : undefined,
            attachments: filePreviews.map(fp => ({
              url: fp.url,
              name: fp.name,
              type: fp.type.startsWith('image/') ? 'image' :
                fp.type.includes('pdf') ? 'pdf' :
                  fp.type.includes('word') || fp.type.includes('document') ? 'docx' : 'file'
            }))
          };

          setMessages(prev => {
            const next = prev.filter(m => !m.isSystemLog).concat(newUserMsg);
            if (currentProjectId) updateWorkspace(currentProjectId, { messages: next });
            return next;
          }, activeSessionId);

          // ── Save User Message Immediately (Fix for Sidebar History) ──
          // This ensures the session is created on the backend BEFORE the AI response finishes,
          // allowing the sidebar to fetch it correctly during navigation.

          // 1. First, add an optimistic entry to the sidebar so it shows up IMMEDIATELY
          if (isFirstMessage) {
            const isStudentRole = selectedRole === 'student';
            const optimisticSession = {
              sessionId: activeSessionId,
              title: "New Chat",
              lastModified: Date.now(),
              activeTool: isStudentRole ? 'legal_tutor' : activeToolId,
              detectedMode: isStudentRole ? 'STUDENT_TUTOR' : MODES.LEGAL_TOOLKIT,
              conversationType: isStudentRole ? 'student_tutor' : 'global',
              assistantType: isStudentRole ? 'legal_tutor' : 'legal_assistant',
              projectId: currentProjectId
            };
            setSessions(prev => [optimisticSession, ...(Array.isArray(prev) ? prev : [])]);
          }

          const effectiveProjectId = activeCaseId || (currentProjectId !== 'default' && currentProjectId !== 'all' ? currentProjectId : null);

          chatStorageService.saveMessage(activeSessionId, newUserMsg, null, effectiveProjectId).then(() => {
            // 2. Trigger title generation in background if it's the first message
            if (isFirstMessage) {
              chatStorageService.generateSessionTitle(activeSessionId, contentToSend).then(savedTitle => {
                if (savedTitle) {
                  setSessions(prev => {
                    const currentSessions = Array.isArray(prev) ? prev : [];
                    const idx = currentSessions.findIndex(s => s.sessionId === activeSessionId);
                    if (idx !== -1) {
                      const updated = [...currentSessions];
                      updated[idx] = { ...updated[idx], title: savedTitle };
                      return updated;
                    }
                    return currentSessions;
                  });
                }
              });
            }
          });

          // ── Navigate AFTER state is stabilized ──
          if (isFirstMessage) {
            if (activeCaseId) {
              setCurrentCaseSessionId(activeSessionId);
            } else {
              const searchParams = new URLSearchParams(location.search);
              const toolParam = searchParams.get('tool');
              const navigateUrl = `/dashboard/chat/${activeSessionId}${toolParam ? `?tool=${toolParam}` : ''}`;
              navigate(navigateUrl, { replace: true });
            }
          }

          setTimeout(() => scrollToBottom(true, 'smooth'), 50);
          setInputValue('');
          handleRemoveFile();

          // Credit Check & Deduction for AI Legal Tools (Exclude General Chat)
          const premiumLegalTools = [
            'legal_my_case', 'legal_precedents', 'legal_draft_maker',
            'legal_evidence_checker', 'legal_argument_builder', 'legal_case_predictor',
            'legal_contract_analyzer', 'legal_strategy_engine', 'legal_research_assistant',
            'legal_research'
          ];

          if (premiumLegalTools.includes(activeToolId)) {
            const creditSuccess = await handleToolUsage(activeToolName || "AI Legal Tool");
            if (!creditSuccess) {
              gen.complete(activeSessionId);
              setIsLoading(false);
              chatLock.locked = false;
              return;
            }
          }

          let latestCaseContext = currentCase;
          if (activeCaseId && allProjects && allProjects.length > 0) {
            const freshCase = allProjects.find(p => (p._id && p._id === activeCaseId) || (p.id && p.id === activeCaseId));
            if (freshCase) latestCaseContext = freshCase;
          }

          const res = await axios.post(`${API}/legal-toolkit/execute`, {
            message: contentToSend,
            toolName: activeToolId === 'legal_research' ? 'legal_research_assistant' : activeToolId,
            sessionId: activeSessionId,
            attachments: newUserMsg.attachments,
            conversationHistory: messages,
            caseContext: latestCaseContext,
            projectId: effectiveProjectId,
            language: toolkitLanguage || currentLang
          }, {
            headers: { Authorization: `Bearer ${getUserData()?.token}` }
          });

          if (res.data.success) {
            const aiMsgId = (Date.now() + 1).toString();
            const fullReply = res.data.reply;

            const aiMsg = {
              id: aiMsgId,
              role: 'model',
              content: '', // Start empty for typewriter effect
              timestamp: new Date(),
              toolUsed: res.data.toolUsed || activeToolId,
              activeTool: activeToolId,
              mode: MODES.LEGAL_TOOLKIT
            };

            if (res.data.toolUsed) setActiveTool(res.data.toolUsed);
            setMessages(prev => [...prev, aiMsg], activeSessionId);
            setTypingMessageId(aiMsgId);

            // Sync with global store so navigation doesn't kill the typewriter effect
            gen.setPartialResponse('', aiMsgId, activeSessionId);

            // ⚖️ CHUNK-BY-CHUNK STREAMING LOGIC FOR LEGAL TOOLS
            // Split by newlines or sentences to simulate realistic reading/typing flow
            const chunks = fullReply.match(/.*?[.\n!?](?:\s|$)|.+/g) || [fullReply];
            let displayedContent = '';

            isStreamingRef.current = true;

            for (let i = 0; i < chunks.length; i++) {
              if (!chatLock.locked) break;

              displayedContent += chunks[i];
              // Update global store only - the Sync useEffect will handle local UI
              gen.setPartialResponse(displayedContent, aiMsgId, activeSessionId);

              // Delay: simulate real-time typing (NOT instant) per chunk
              // Skip delay if tab is in background to prevent browser throttling from freezing generation
              if (!document.hidden) {
                const delay = Math.min(400, Math.max(80, chunks[i].length * 3));
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }

            isStreamingRef.current = false;
            setTypingMessageId(null);

            if (!chatLock.locked) {
              setIsLoading(false);
              return;
            }

            const finalAiMsg = { ...aiMsg, content: fullReply };
            setMessages(prev => {
              const next = prev.map(m => m.id === aiMsgId ? finalAiMsg : m);
              if (currentProjectId) updateWorkspace(currentProjectId, { messages: next });
              return next;
            }, activeSessionId);

            // Final AI response sync
            await chatStorageService.saveMessage(activeSessionId, finalAiMsg, null, effectiveProjectId);
            refreshSubscription();
          } else {
            throw new Error(res.data.error || 'Execution failed');
          }
          gen.complete(activeSessionId);
          setIsLoading(false);
          chatLock.locked = false;
          return;
        } catch (err) {
          console.error('[LegalToolkit Error]:', err);
          toast.error(err.message || 'Failed to execute legal tool');
          gen.complete(activeSessionId);
          setIsLoading(false);
          chatLock.locked = false;
          return;
        }
      }

      // Navigate to real session before launching tool handlers (so messages are visible)
      if (isFirstMessage) {
        isNavigatingRef.current = activeSessionId;

        // ── Early Optimistic Update for Media Modes ──
        // Since image/video/edit modes return early and skip the main optimistic update below,
        // we must create the session in the sidebar immediately.
        if (isImageGeneration || toolOverride === 'text_to_image' ||
          isVideoGeneration || toolOverride === 'text_to_video' || toolOverride === 'image_to_video' ||
          isMagicEditing || toolOverride === 'image_edit') {

          const earlyMode = (isImageGeneration || toolOverride === 'text_to_image') ? MODES.IMAGE_GENERATION :
            ((isVideoGeneration || toolOverride === 'text_to_video' || toolOverride === 'image_to_video') ? MODES.VIDEO_GENERATION : MODES.IMAGE_EDIT);

          // Use a truncated prompt as the interim title instead of "New Chat"
          // This ensures the sidebar shows something meaningful immediately
          const interimTitle = contentToSend.length > 40
            ? contentToSend.substring(0, 40) + '...'
            : contentToSend;

          // Store interim title so handleGenerateImage/Video can pass it to saveMessage
          pendingMediaTitleRef.current = interimTitle;

          setSessions(prev => {
            const currentSessions = Array.isArray(prev) ? prev : [];
            if (currentSessions.some(s => s.sessionId === activeSessionId)) return currentSessions;
            return [{
              sessionId: activeSessionId,
              title: interimTitle,
              lastModified: Date.now(),
              detectedMode: earlyMode,
              projectId: currentProjectId
            }, ...currentSessions];
          });

          // Generate a polished AI title in the background and update sidebar + backend
          chatStorageService.generateSessionTitle(activeSessionId, contentToSend).then(newTitle => {
            pendingMediaTitleRef.current = null; // Clear interim ref
            if (newTitle) {
              setSessions(prev => {
                const currentSessions = Array.isArray(prev) ? prev : [];
                const idx = currentSessions.findIndex(s => s.sessionId === activeSessionId);
                if (idx !== -1) {
                  const updated = [...currentSessions];
                  updated[idx] = { ...updated[idx], title: newTitle, lastModified: Date.now() };
                  return [...updated].sort((a, b) => b.lastModified - a.lastModified);
                }
                return currentSessions;
              });
            }
          });
        }

        if (activeCaseId) {
          setCurrentCaseSessionId(activeSessionId);
        } else {
          navigate(`/dashboard/chat/${activeSessionId}`, { replace: true });
        }
      }


      // Handle AI-Powered Legal Research Mode
      if (isImageGeneration || toolOverride === 'text_to_image') {
        await handleGenerateImage(contentToSend, activeSessionId);
        return;
      }

      // Handle Video Generation Mode
      if (isVideoGeneration || toolOverride === 'text_to_video' || toolOverride === 'image_to_video') {
        await handleGenerateVideo(contentToSend, activeSessionId);
        return;
      }

      // Handle Image Editing Mode
      if (isMagicEditing || toolOverride === 'image_edit') {
        await handleEditImage(contentToSend, activeSessionId);
        return;
      }


      // Handle AI CashFlow Mode
      if (isCashFlowMode || toolOverride === 'cashflow') {
        if (!selectedStock) {
          toast.error("Please select a stock from the search results first.");
          setIsLoading(false);
          chatLock.locked = false;
          return;
        }
        await handleStockAnalysis(selectedStock, activeSessionId);
        return;
      }

      // Handle Voice Reader Mode - Just read, no AI response
      if (isVoiceMode) {
        try {
          // 1. Add User Message to UI
          const userMsgId = Date.now().toString();
          const newUserMsg = {
            id: userMsgId,
            role: 'user',
            content: contentToSend,
            timestamp: new Date(),
            attachments: filePreviews.map(fp => ({
              url: fp.url,
              name: fp.name,
              type: fp.type.startsWith('image/') ? 'image' :
                fp.type.includes('pdf') ? 'pdf' :
                  fp.type.includes('word') || fp.type.includes('document') ? 'docx' : 'file'
            }))
          };
          setMessages(prev => prev.filter(m => !m.isSystemLog).concat(newUserMsg), activeSessionId);

          // 2. Clear inputs
          setInputValue('');
          handleRemoveFile();
          if (inputRef.current) inputRef.current.style.height = 'auto';

          // 3. Trigger voice reading directly (no AI response)
          setTimeout(() => {
            console.log('[Voice Mode] Reading content with attachments:', newUserMsg.attachments);
            speakResponse(contentToSend, audioLangCode, userMsgId, newUserMsg.attachments);
          }, 300);

          return; // STOP - Don't call AI API
        } catch (err) {
          console.error('[Voice Mode Error]:', err);
          toast.error('Failed to read content');
          return;
        }
      }


      // [SMART FORMATTING]: If input is long code, automatically wrap in backticks for structured display
      let displayContent = contentToSend;
      const hasCodeStructure = (contentToSend?.split('\n').length || 0) >= 6 &&
        (/function\s*\(|const\s+\w+\s*=|class\s+\w+|import\s+.*from|<\w+>|{\s*\w+:|\/\/|\/\*/.test(contentToSend));

      if (hasCodeStructure && contentToSend && !contentToSend.trim().startsWith('```')) {
        let detectedLang = 'javascript'; // Default for web-centric AI Ads
        const low = contentToSend.toLowerCase();
        if (low.includes('def ') || low.includes('import os') || low.includes('np.') || low.includes('pd.')) detectedLang = 'python';
        else if (low.includes('<html>') || low.includes('<!doctype html>')) detectedLang = 'html';
        else if (low.includes('select * from') || low.includes('create table')) detectedLang = 'sql';
        else if (low.includes('public static void main')) detectedLang = 'java';

        displayContent = `\`\`\`${detectedLang}\n${contentToSend.trim()}\n\`\`\``;
      }

      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: displayContent || (filePreviews.length > 0 ? (isDocumentConvert ? "Convert this document" : "Analyze these files") : ""),
        timestamp: Date.now(),
        projectId: currentProjectId,
        conversationType: (selectedRole === 'student' && !currentProjectId) ? 'student_tutor' : undefined,
        attachments: filePreviews.map(p => ({
          url: p.url,
          name: p.name,
          type: p.type.startsWith('image/') ? 'image' :
            p.type.includes('pdf') ? 'pdf' :
              p.type.includes('word') || p.type.includes('document') ? 'docx' :
                p.type.includes('excel') || p.type.includes('spreadsheet') ? 'xlsx' :
                  p.type.includes('powerpoint') || p.type.includes('presentation') ? 'pptx' : 'file'
        })),
        agentName: activeAgent.agentName || activeAgent.name,
        agentCategory: activeAgent.category,
        mode: currentMode,
        activeTool: selectedLegalTool?.id,
      };

      const updatedMessages = messages.filter(m => !m.isSystemLog).concat(userMsg);
      setMessages(updatedMessages, activeSessionId);
      // User sent a new message -> always auto-scroll
      shouldAutoScrollRef.current = true;
      // Double-attempt auto-scroll for user message to ensure it handles layout changes correctly
      setTimeout(() => scrollToBottom(true, 'smooth'), 50);
      setTimeout(() => scrollToBottom(true, 'smooth'), 400);
      setInputValue('');

      // Capture mode states before resetting
      const deepSearchActive = isDeepSearch;
      const documentConvertActive = isDocumentConvert;
      const webSearchActive = isWebSearch;
      const imageGenActive = isImageGeneration;
      const videoGenActive = isVideoGeneration;
      const magicEditActive = isMagicEditing; // New: capture magic edit state
      const codeWriterActive = isCodeWriter; // Added: capture code writer state
      // Note: We don't reset these state immediately anymore so the tag stays visible in input bar while "Thinking..."

      // Detect mode for UI indicator
      const detectedMode = magicEditActive ? MODES.IMAGE_EDIT :
        (imageGenActive ? MODES.IMAGE_GENERATION :
          (videoGenActive ? MODES.VIDEO_GENERATION :
            (isFileAnalysis ? MODES.FILE_ANALYSIS :
              (deepSearchActive ? MODES.DEEP_SEARCH :
                (documentConvertActive ? MODES.DOCUMENT_CONVERT :
                  (webSearchActive ? MODES.WEB_SEARCH :
                    (codeWriterActive ? MODES.CODING_HELP :
                      (currentMode === 'LEGAL_TOOLKIT' ? MODES.LEGAL_TOOLKIT :
                        detectMode(contentToSend, userMsg.attachments)))))))));
      setCurrentMode(detectedMode);


      // Cleanup legal state if we auto-transitioned out of legal mode
      if (detectedMode !== MODES.LEGAL_TOOLKIT && currentMode === 'LEGAL_TOOLKIT') {
        setSelectedLegalTool(null);
        setActiveLegalToolkit(false);
      }

      // Update user message with the detected mode
      userMsg.mode = detectedMode;
      userMsg.projectId = currentProjectId;

      // Determine loading intent for UI feedback
      const newLoadingText = imageGenActive ? "Generating Image... 🎨" :
        magicEditActive ? "Editing Image... ✨" :
          videoGenActive ? "Generating Video... 🎥" :
            documentConvertActive ? "Converting Document... 🔄" :
              isFileAnalysis ? "Analyzing Document... 📄" :
                (deepSearchActive || webSearchActive) ? "Searching the web... 🌐" :
                  codeWriterActive ? "Writing Code... 💻" :
                    "AI LEGAL is thinking...";
      setLoadingText(newLoadingText);

      handleRemoveFile(); // Clear file after sending
      setIsLoading(true);


      // -- CRITICAL: Start generation tracking IMMEDIATELY (before any async work) --
      // This ensures the thinking indicator shows right away and streaming reaches the UI.
      const _genController = gen.start({
        loadingText: newLoadingText,
        typingMessageId: null,
      }, activeSessionId);
      abortControllerRef.current = _genController;

      // -- For new sessions: navigate immediately so URL & Zustand subscription are correct --
      if (isFirstMessage) {
        setSessions(prev => {
          const currentSessions = Array.isArray(prev) ? prev : [];
          const exists = currentSessions.find(s => s.sessionId === activeSessionId);
          if (exists) return currentSessions;
          return [{ sessionId: activeSessionId, title: 'New Chat', lastModified: Date.now(), detectedMode: detectedMode }, ...currentSessions];
        });
        if (activeCaseId) {
          setCurrentCaseSessionId(activeSessionId);
        } else {
          navigate(`/dashboard/chat/${activeSessionId}`, { replace: true });
        }
        // Generate title in background - does NOT block the AI response
        chatStorageService.generateSessionTitle(activeSessionId, userMsg.content).then(newTitle => {
          if (newTitle) setSessions(prev => {
            const s = Array.isArray(prev) ? prev : [];
            const idx = s.findIndex(x => x.sessionId === activeSessionId);
            if (idx !== -1) { const u = [...s]; u[idx] = { ...u[idx], title: newTitle, lastModified: Date.now() }; return u.sort((a, b) => b.lastModified - a.lastModified); }
            return [{ sessionId: activeSessionId, title: newTitle, lastModified: Date.now() }, ...s];
          });
        });
      }

      try {
        // -- Save user message to storage in background (non-blocking, fire-and-forget) --
        // MUST NOT block the AI call.
        chatStorageService.saveMessage(activeSessionId, userMsg, null, currentProjectId).catch(err => {
          console.warn('[Chat] Background user message save failed:', err);
        });

        // Send to AI for response
        const caps = getAgentCapabilities(activeAgent.agentName, activeAgent.category);

        // ---------------------------------------------------------
        //  CONSTRUCT SYSTEM INSTRUCTION BASED ON PROFILE SETTINGS
        // ---------------------------------------------------------
        const pGeneral = personalizations?.general || {};
        const pStyle = personalizations?.personalization || {};
        const pParental = personalizations?.parentalControls || {};

        let PERSONA_INSTRUCTION = "- FORMAT: Always use Markdown tables and structured formatting thoughtfully whenever presenting comparisons, structured data, or lists of items with multiple attributes.\n";

        // 1. STYLE & FONT (Font is UI only, but we can hint at TONE)
        if (pStyle.fontStyle && pStyle.fontStyle !== 'Default') {
          // No direct AI instruction needed for font family, but we can adjust tone if needed
        }

        // 2. CHARACTERISTICS
        if (pStyle.enthusiasm) PERSONA_INSTRUCTION += `- Enthusiasm Level: ${pStyle.enthusiasm}\n`;
        if (pStyle.formality) PERSONA_INSTRUCTION += `- Formality Level: ${pStyle.formality}\n`;
        if (pStyle.creativity) PERSONA_INSTRUCTION += `- Creativity Level: ${pStyle.creativity}\n`;

        // 3. FORMATTING
        if (pStyle.structuredResponses) PERSONA_INSTRUCTION += "- FORMAT: Use clear Headers, Sections, and structured layouts.\n";
        if (pStyle.bulletPoints) PERSONA_INSTRUCTION += "- FORMAT: Prioritize Bullet Points and Lists over paragraphs.\n";

        // 4. EMOJI USAGE
        if (pStyle.emojiUsage) {
          if (pStyle.emojiUsage === 'None') PERSONA_INSTRUCTION += "- EMOJIS: Do NOT use any emojis or icons.\n";
          else if (pStyle.emojiUsage === 'Minimal') PERSONA_INSTRUCTION += "- EMOJIS: Use very few emojis, only where absolutely necessary.\n";
          else if (pStyle.emojiUsage === 'Moderate') PERSONA_INSTRUCTION += "- EMOJIS: Use a moderate amount of relevant emojis.\n";
          else if (pStyle.emojiUsage === 'Expressive') PERSONA_INSTRUCTION += "- EMOJIS: Use emojis frequently to be engaging and expressive.\n";
        }

        // 5. CUSTOM INSTRUCTIONS override
        if (pStyle.customInstructions) {
          PERSONA_INSTRUCTION += `\n### USER CUSTOM INSTRUCTIONS (HIGHEST PRIORITY):\n${pStyle.customInstructions}\n`;
        }

        // 6. PARENTAL / SAFETY
        if (pParental.contentFilter) {
          PERSONA_INSTRUCTION += `\n### SAFETY MODE: STRICT\n- Absolutely NO mature, violent, or explicit content.\n- If user asks for such, politley decline.\n`;
        }
        if (pParental.ageCategory === 'Child') {
          PERSONA_INSTRUCTION += `- SIMPLIFY language for a Child.\n- Be encouraging and safe.\n`;
        }

        // 7. LANGUAGE
        // We already have language detection, but let's reinforce if set strictly
        if (pGeneral.language && pGeneral.language !== 'Auto-Detect') {
          PERSONA_INSTRUCTION += `\n### REQUIRED LANGUAGE:\n- Respond ONLY in ${pGeneral.language}.\n`;
        }

        // 8. TEXT SIZE / ACCESSIBILITY (Frontend only mostly, but hint AI)
        if (pStyle.fontSize === 'Large' || pStyle.fontSize === 'Extra Large' || pGeneral.highContrast) {
          PERSONA_INSTRUCTION += `- FORMAT: Use shorter sentences and very clear structure for readability.\n`;
        }

        // --- MULTILINGUAL TOOLKIT LOGIC ---
        const effectiveLang = (currentMode === 'LEGAL_TOOLKIT') ? toolkitLanguage : currentLang;

        const SYSTEM_INSTRUCTION = `
You are AI LEGAL™, the official AI assistant of the AI LEGAL™ platform. Powered by A-Series.
${selectedRole === 'student' ? `
### STUDENT ROLE MODE (AI LEGAL™ TUTOR):
- You are acting as AI LEGAL™ TUTOR.
- Be an encouraging, expert, and engaging AI Legal Learning Companion for law students, judiciary aspirants, and moot court competitors.
- Explain statutory provisions (IPC, BNS, CrPC, BNSS, BSA, Constitution) in simple, easy-to-understand language.
- Structure case law summaries in concise IRAC format (Issue, Rule, Application, Conclusion).
- When student asks short follow-up questions like "example?", "exam me kaise puch skte hai?", "mcq do", build seamlessly on the previous turn's context.
` : ''}
${activeAgent.category ? `Your specialization is in ${activeAgent.category}.` : ''}

${currentCase ? `
### ACTIVE CASE CONTEXT (MY CASE CRM):
- **Client Name**: ${currentCase?.clientName || 'Not specified'}
- **Case Summary**: ${currentCase.summary || currentCase.caseSummary || 'No summary provided yet.'}
- **Key Issues**: ${currentCase.keyIssue || 'No specific issues identified.'}
${currentCase.importantDates && currentCase.importantDates.length > 0 ? `- **Important Dates**: ${currentCase.importantDates.map(d => `${d.label}: ${new Date(d.date).toLocaleDateString()}`).join(', ')}` : ''}

**YOUR ROLE FOR THIS CASE**:
- You are a dedicated legal assistant for THIS case.
- Maintain separate memory and context for this folder.
- Always respond based on these client details and requirements.
- If the user asks general questions, try to relate them back to this case if relevant.
` : ''}

### CRITICAL BRAND RULE:
Whenever a user mentions "AI LEGAL™", "AI LEGAL™", "AI LEGAL™ app", "your image", "your video", "AI LEGAL™ image", "AI LEGAL™ video", or refers to AI LEGAL™ in third person, you MUST interpret it as referring to THIS platform (AI LEGAL™ brand identity), not a generic artificial intelligence.

### SELF-REFERENCE DETECTION & CONTENT GENERATION:
1. If user says:
   - "Generate AI LEGAL™ image", "Create image of AI LEGAL™", "Make AI LEGAL™ logo", "AI LEGAL™ ka photo banao", "AI LEGAL™ ka video generate karo", "Your intro video banao", "AI LEGAL™ introduction video"
   → You must generate content representing the official AI LEGAL™ brand.

2. AI LEGAL™ Brand Identity:
   - Futuristic AI assistant
   - Glowing blue/purple neural brain logo
   - Modern, premium, intelligent
   - Clean UI dashboard style
   - Advanced AI Super Assistant
   - Indian tech startup vibe (global level) — Note: Always fulfill technical requirements while matching the user's language.

3. If user asks for:
   - Image → Generate/Ask for a brand-based promotional visual
   - Video → Generate/Ask for a cinematic AI intro script for AI LEGAL™
   - Logo → Generate/Ask for a modern AI tech logo concept
   - Poster → Promotional marketing poster content
   - Reel → Social media promotional script

4. Never treat “AI LEGAL™” as a random AI. Always treat it as THIS official platform.

5. If user intent is unclear, ask: "Are you referring to the official AI LEGAL™ platform?"

${PERSONA_INSTRUCTION}

### CRITICAL LANGUAGE RULE:
**MANDATORY: You MUST respond in ${effectiveLang}.**
${effectiveLang === 'Hindi' ?
            (currentMode === 'LEGAL_TOOLKIT' ?
              '- Respond in Hindi using simple and clear legal language.\n- Use English legal terms in brackets where needed like: "अनुबंध (Contract)".' :
              '- You MUST use HINDI (Devanagari script) for the entire response.\n- Include English technical/legal terms in brackets like: "अनुबंध (Contract)".') :
            '- You MUST use ENGLISH for the entire response.'}
- match the user's script and tone within the required language.
- If user mixes languages, prioritize ${effectiveLang}.

### RESPONSE BEHAVIOR:
- Answer the user's question directly without greeting messages
- Do NOT say "Hello... welcome to AI Ads" or similar greetings
- Focus ONLY on providing the answer to what user asked
- Be helpful, clear, and concise

### STREAMING BEHAVIOR:
- Generate responses in smooth, continuous stream
- Use short paragraphs for readability
- If interrupted, stop immediately without completing sentence
- Do NOT add summaries or closing lines after interruption
- Resume ONLY if user explicitly asks again

${filePreviews.length > 0 ? `### MULTI-FILE ANALYSIS MANDATE (STRICT 1:1 RULE):
You have received exactly ${filePreviews.length} file(s).
You MUST provide exactly ${filePreviews.length} distinct analysis blocks.

CRITICAL RULES:
1.  **NO MERGING**: Do NOT combine files into a single "Chapter" or "Section".
2.  **NO SKIPPING**: If 2 files are uploaded, you MUST output 2 analysis blocks.
3.  **SEPARATE ENTITIES**: Treat each file as a completely independent document requiring its own full answer.
4.  **DELIMITER MANDATORY**: Use the delimiter below to separate EACH file's answer.

REQUIRED OUTPUT FORMAT:
[Optional brief greeting]

---SPLIT_RESPONSE---
**Analysis of: {Filename 1}**
[Full detailed answer/analysis for File 1]

---SPLIT_RESPONSE---
**Analysis of: {Filename 2}**
[Full detailed answer/analysis for File 2]

(Repeat strictly for ALL ${filePreviews.length} files)` : ''}

### RESPONSE FORMATTING RULES (STRICT):
1.  **Structure**: ALWAYS use Markdown headers (# for main, ## for sub-sections) for section titles. Do NOT use bullets for these headers.
2.  **SPACING (CRITICAL)**: 
    - Always add a BLANK LINE after every section.
    - Always leave ONE EMPTY LINE between headings and content.
    - Ensure clear spacing between blocks like TO, FROM, DATE, and SUBJECT.
    - Never join sections without spacing; keep the output visually clean with clear gaps for mobile readability.
3.  **Lists**: Use Bullet Points only for actual lists of multiple points. Avoid putting section titles inside a list.
4.  **Highlights**: Bold key terms and important concepts within sentences.
5.  **Summary**: Include a "One-line summary" or "Simple definition" at the start or end where appropriate.
6.  **Emojis**: Use relevant emojis.

### LEGAL NOTICE FORMAT (MANDATORY):
When drafting a Legal Notice, you MUST follow this exact structure:
## LEGAL NOTICE

TO:
- [Recipient Details]

FROM:
- [Sender Details]

DATE:
- [Current Date]

SUBJECT:
- [Concise subject line]

---

### Details
(Leave one blank line here)
1.
- [First point]

2.
- [Second point]

### FINANCIAL & INVOICE ANALYSIS RULES (MANDATORY):
When summarizing or extracting data from Invoices, Receipts, or Financial Documents:
1. **CRITICAL**: You MUST **bold** ALL monetary amounts (e.g., **INR 1,41,954.00**, **$500.00**).
2. **CRITICAL**: You MUST **bold** ALL Entity/Person Names (e.g., **PRAHALAD AHUJA HUF**, **Amazon Inc**).
3. **CRITICAL**: You MUST **bold** ALL Dates, Invoice Numbers, and distinct identifiers (GSTIN/PAN).
4. **Format**: Present extracted data in a clean **Bullet List** or **Table** for immediate readability.

${caps.canUploadImages ? `IMAGE ANALYSIS CAPABILITIES:
- You have the ability to see and analyze images provided by the user.` : ''}

${caps.canUploadDocs ? `DOCUMENT ANALYSIS CAPABILITIES:
- You can process and extract text from PDF, Word (Docx), and Excel files provided as attachments.` : ''}

${activeAgent.instructions ? `SPECIFIC AGENT INSTRUCTIONS:
${activeAgent.instructions}` : ''}

${deepSearchActive ? `### DEEP SEARCH MODE ENABLED (CRITICAL):
- The user has requested an EXHAUSTIVE DEEP SEARCH.
- Your response MUST be extremely long, detailed, and comprehensive.
- Provide in-depth analysis, historical context, current trends, and future implications where applicable.
- YOU MUST perform extensive web searching to gather every relevant detail.
- Do NOT be brief. Expand on every point. Use multiple sections and subsections.
- Clearly structure your findings with professional formatting and cite sources if possible.` : ''}

${documentConvertActive ? `### DOCUMENT CONVERSION MODE ENABLED (CRITICAL):
- The user wants to convert the uploaded document.
- Identify the source file format (PDF/DOCX) and the requested target format.
- IF the user does NOT specify a target format:
  - If source is PDF, suggest converting to DOCX.
  - If source is DOCX, suggest converting to PDF.
- YOU MUST provide the conversion parameters in the following JSON format:
\`\`\`json
{
  "action": "file_conversion",
  "source_format": "pdf",
  "target_format": "docx",
  "file_name": "original_filename.pdf"
}
\`\`\`
- Keep the response text brief, explaining what you are doing.` : ''}
`;
        // Default AI message sending
        // If magic editing is active, ensure the ref image is included in attachments
        let finalAttachments = userMsg.attachments || [];
        if (magicEditActive && editRefImage && !finalAttachments.some(a => a.url === editRefImage.url)) {
          finalAttachments = [...finalAttachments, editRefImage];
        }

        const suggestedAiId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // ── Create the AI bubble immediately with empty content ──
        // Real content will stream in via onChunk → gen.setPartialResponse
        const streamingMsgId = suggestedAiId;
        const streamingMsg = {
          id: streamingMsgId,
          role: 'model',
          content: '',
          mode: detectedMode,
          timestamp: Date.now(),
          projectId: currentProjectId,
        };
        // Check if user is already at the bottom before generation starts
        const container = chatContainerRef.current;
        const isAtBottomBeforeGen = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 15) : true;
        shouldAutoScrollRef.current = isAtBottomBeforeGen;

        setMessages((prev) => [...prev, streamingMsg], activeSessionId);
        setTypingMessageId(streamingMsgId);
        gen.setPartialResponse('', streamingMsgId, activeSessionId);
        setTimeout(() => scrollToBottom(true, 'smooth'), 50);

        // ── Stream chunks from backend ──
        const streamOnChunk = (chunk) => {
          gen.appendToken(chunk, streamingMsgId, activeSessionId);
        };

        const aiResponseData = await generateChatResponse(
          messages,
          userMsg.content,
          SYSTEM_INSTRUCTION + getSystemPromptExtensions(),
          finalAttachments,
          personalizations?.general?.language || 'English',
          // Use global store signal so abort works across navigations
          gen.getAbortSignal() ?? abortControllerRef.current?.signal,
          detectedMode,
          activeSessionId,
          currentProjectId,
          userMsg.id,
          suggestedAiId,
          imageAspectRatio,
          imageModelId,
          streamOnChunk  // ← real streaming callback
        );

        // Store it for usage in the typewriter loop
        const apiResponseId = suggestedAiId;

        // --- REAL-TIME TITLE SYNC ---
        if (aiResponseData && aiResponseData.title) {
          const generatedTitle = aiResponseData.title;

          // 1. Update global recoil state for instant sidebar refresh
          setSessions(prev => {
            const currentSessions = Array.isArray(prev) ? prev : [];
            const exists = currentSessions.findIndex(s => s.sessionId === activeSessionId);

            if (exists !== -1) {
              const updated = [...currentSessions];
              if (updated[exists].title !== generatedTitle) {
                updated[exists] = { ...updated[exists], title: generatedTitle, lastModified: Date.now() };
                return [...updated].sort((a, b) => b.lastModified - a.lastModified);
              }
              return currentSessions;
            } else {
              return [{
                sessionId: activeSessionId,
                title: generatedTitle,
                lastModified: Date.now()
              }, ...currentSessions];
            }
          });

          // 2. Persist to local storage meta
          chatStorageService.updateSessionTitle(activeSessionId, generatedTitle);
        }

        if (aiResponseData && aiResponseData.error === "LIMIT_REACHED") {
          setIsLimitReached(true);
          // Trigger LoginRequiredModal with custom message
          window.dispatchEvent(new CustomEvent('login_required', {
            detail: {
              toolName: 'AI LEGAL™ Unlimited Legal Chat',
              customMessage: "You've reached the guest limit of 5 sessions and 10 chats per session. Sign in to unlock unlimited chat, AI-powered legal research, and more!"
            }
          }));
          setIsLoading(false);
          return;
        }

        // Out of credits — popup already shown by geminiService, just stop gracefully
        if (aiResponseData && (aiResponseData.error === "OUT_OF_CREDITS" || aiResponseData.error === "PREMIUM_ONLY")) {
          setIsLoading(false);
          // Remove the placeholder loading message if added
          setMessages(prev => {
            if (activeSessionId !== mountedSessionIdRef.current && activeSessionId !== 'new') {
              // Allow transition
            }
            return prev.filter(m => !m.isProcessing && !m.isLoading);
          }, activeSessionId);
          return;
        }


        // Handle response - could be string (old format) or object (new format with conversion)
        let aiResponseText = '';
        let conversionData = null;
        let aiVideoUrl = null;
        let aiImageUrl = null;
        let isRealTimeResponse = false;
        let responseSources = [];

        if (typeof aiResponseData === 'string') {
          aiResponseText = aiResponseData;
        } else if (aiResponseData && typeof aiResponseData === 'object') {
          // For streaming mode: reply is empty, actual text is in gen store partialResponse
          const streamedText = useGenerationStore.getState().generations[activeSessionId]?.partialResponse || '';
          // Compatibility with both 'reply' and 'data' properties from backend
          aiResponseText = streamedText || aiResponseData.reply || aiResponseData.data || "No response generated.";
          conversionData = aiResponseData.conversion || null;
          isRealTimeResponse = aiResponseData.isRealTime || false;
          responseSources = aiResponseData.sources || [];
          // Extract media URLs if present
          aiVideoUrl = aiResponseData.videoUrl || null;
          aiImageUrl = aiResponseData.imageUrl || null;
          const aiSnapshotData = aiResponseData.snapshot || null;

          // If backend provided specific error details, show them to help user understand why 'brain' is failing
          if (aiResponseData.error && aiResponseData.details) {
            console.error("[AI Ads Backend Error]", aiResponseData.details);
            // Append a small subtle hint for the developer/user
            aiResponseText += `\n\n*(Debug: ${aiResponseData.details})*`;
          }
        } else {
          aiResponseText = "Sorry, I encountered an issue while generating a response. Please try again.";
        }

        if (aiResponseText === "dbDemoModeMessage") {
          aiResponseText = t('dbDemoModeMessage');
        }

        // Check for multiple file analysis headers to split into separate cards
        // IMPORTANT: Only split when 2+ files are attached to prevent double responses
        // on normal chat when AI accidentally includes the delimiter
        const delimiter = '---SPLIT_RESPONSE---';
        let responseParts = [];

        const hasMultipleFiles = filePreviews.length >= 2;
        if (hasMultipleFiles && aiResponseText && aiResponseText.includes(delimiter)) {
          const rawParts = aiResponseText.split(delimiter).filter(p => p && p.trim().length > 0);
          responseParts = rawParts.length > 0 ? rawParts.map(part => part.trim()) : [aiResponseText];
        } else {
          // Single response — strip the delimiter if AI accidentally included it
          const cleanedText = (aiResponseText || "No response generated.").replace(/---SPLIT_RESPONSE---/g, '').trim();
          responseParts = [cleanedText || "No response generated."];
        }

        // --- DYNAMIC SUGGESTIONS PRE-FETCH ---
        // We start fetching suggestions in the background while the typewriter runs
        let dynamicSuggestionsPromise = null;
        if (!aiResponseData?.suggestions?.length && !currentCase?.isLegalCase) {
          dynamicSuggestionsPromise = generateFollowUpPrompts(userMsg.content, detectedMode || 'chat');
        }

        // Process response parts and finalize messages
        for (let i = 0; i < responseParts.length; i++) {
          const partContent = responseParts[i];
          if (!partContent) continue;

          const msgId = (i === 0 && typeof apiResponseId !== 'undefined') ? apiResponseId : (Date.now() + 1 + i).toString();

          // For i>0: multi-file split response — add new bubbles
          if (i > 0) {
            const extraMsg = {
              id: msgId,
              role: 'model',
              content: partContent,
              mode: detectedMode,
              isRealTime: isRealTimeResponse,
              sources: responseSources,
              timestamp: Date.now() + i * 100,
              projectId: currentProjectId,
              detectedMode: detectedMode
            };
            setMessages((prev) => [...prev, extraMsg], activeSessionId);
          }

          // Streaming done — unlock auto-scroll
          isStreamingRef.current = false;

          if (!chatLock.locked) {
            setTypingMessageId(null);
            return; // Exit function if stopped
          }

          setTypingMessageId(null); // Clear typing status

          // Build final message with all metadata
          const finalModelMsg = {
            id: msgId,
            role: 'model',
            content: partContent,
            mode: detectedMode,
            isRealTime: isRealTimeResponse,
            sources: responseSources,
            error: !!aiResponseData?.error,
            timestamp: Date.now() + i * 100,
            projectId: currentProjectId,
            conversion: conversionData,
            imageUrl: aiImageUrl,
            videoUrl: aiVideoUrl,
            detectedMode: detectedMode
          };
          if (i === 0) {
            if (conversionData) finalModelMsg.conversion = conversionData;
            if (aiVideoUrl) finalModelMsg.videoUrl = aiVideoUrl;
            if (aiImageUrl) finalModelMsg.imageUrl = aiImageUrl;
            finalModelMsg.isRealTime = isRealTimeResponse;
            finalModelMsg.sources = responseSources;
            if (aiResponseData.suggestions) finalModelMsg.suggestions = aiResponseData.suggestions;
            if (aiResponseData.snapshot) finalModelMsg.snapshot = aiResponseData.snapshot;
            finalModelMsg.detectedMode = detectedMode; // ✅ Ensure detectedMode persists to storage
            finalModelMsg.activeTool = selectedLegalTool?.id;
          }

          // Set Smart Suggestions for the last response part
          if (i === responseParts.length - 1) {
            const cleanSuggestionItem = (str) => {
              if (!str) return '';
              let cleaned = String(str || '')
                .replace(/^[.\-*•\d\s]+/, '')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/^Hello\s+[^,]+,?\s*/i, '')
                .replace(/^Hi\s+[^,]+,?\s*/i, '')
                .replace(/^Yes\s*,\s*[^,]+,?\s*/i, '')
                .replace(/^Sure\s*,\s*[^,]+,?\s*/i, '')
                .replace(/^Certainly\s*,\s*[^,]+,?\s*/i, '')
                .replace(/^Dear\s+[^,]+,?\s*/i, '')
                .replace(/^(Yes|Sure|Certainly|Okay|Ok|Hello|Hi)\s*,\s*/i, '')
                .replace(/:\s*$/, '')
                .trim();

              if (/^(Yes|No|Sure|Certainly|Hello|Hi|Thanks|Thank you|To ensure|Name of)/i.test(cleaned) || cleaned.length < 4) {
                return '';
              }
              return cleaned;
            };

            const hasSmartSuggestions = aiResponseData?.suggestions && Array.isArray(aiResponseData.suggestions) && aiResponseData.suggestions.length > 0;
            let rawList = hasSmartSuggestions ? aiResponseData.suggestions : [];
            let cleanedList = rawList.map(cleanSuggestionItem).filter(Boolean);

            if (cleanedList.length === 0) {
              cleanedList = [
                "Research relevant Case Laws",
                "Explain applicable IPC/BNS Sections",
                "Suggest Legal Strategy",
                "Predict Case Outcome"
              ];
            }

            const trimmedSuggestions = cleanedList.slice(0, 4);
            finalModelMsg.suggestions = trimmedSuggestions;
            setSuggestions(trimmedSuggestions);

            // NON-BLOCKING: Fetch dynamic suggestions in background without holding up input box typing
            if (!hasSmartSuggestions && dynamicSuggestionsPromise) {
              dynamicSuggestionsPromise.then(dynamicPrompts => {
                if (dynamicPrompts && Array.isArray(dynamicPrompts) && dynamicPrompts.length > 0) {
                  const cleanedAsync = dynamicPrompts.map(cleanSuggestionItem).filter(Boolean);
                  if (cleanedAsync.length > 0) {
                    const finalAsync = cleanedAsync.slice(0, 4);
                    setSuggestions(finalAsync);
                    chatStorageService.saveMessage(activeSessionId, { ...finalModelMsg, suggestions: finalAsync }, null, currentProjectId).catch(e => console.error(e));
                  }
                }
              }).catch(err => console.error("Async background suggestions failed:", err));
            }
          }

          // After typing is complete, save the full message to history
          await chatStorageService.saveMessage(activeSessionId, finalModelMsg, null, currentProjectId);

          // Refresh usage counts after successful generation
          refreshSubscription();

          // CRITICAL: Update the state with the final message including conversion data
          setMessages((prev) =>
            prev.map(m => m.id === msgId ? finalModelMsg : m),
            activeSessionId
          );
          scrollToBottom(); // Single scroll after full generation

          // Speak the AI response if user used voice input
          if (i === 0 && voiceUsedRef.current) {
            const detectedLang = aiResponseData?.language || currentLang;
            speakResponse(partContent, detectedLang);
            voiceUsedRef.current = false; // Reset flag
          }
        }
      } catch (innerError) {
        console.error("Storage/API Error:", innerError);
      }
    } catch (error) {
      // Handle abort errors silently (user stopped generation)
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Generation stopped by user');
        gen.complete(); // Mark as completed (not error) in global store
        // Keep partial response, don't show error
        return;
      }

      console.error("Chat Error:", error);
      gen.fail(error); // Propagate error to global store
      toast.error(`Error: ${error.message || "Failed to send message"}`);
    } finally {
      setIsLoading(false);

      const chatLock = getSessionLock(activeSessionId);
      chatLock.locked = false;

      abortControllerRef.current = null; // Clean up abort controller
      gen.complete(activeSessionId); // Ensure global store is always cleaned up
    }
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    setDeleteConfig({
      isOpen: true,
      title: "Delete Chat History?",
      description: "Are you sure you want to delete this entire chat history? This action cannot be undone and all messages will be lost.",
      onConfirm: async () => {
        await chatStorageService.deleteSession(id);
        const data = await chatStorageService.getSessions(currentProjectId);
        setSessions(data);
        if (activeSessionId === id) {
          navigate('/dashboard/chat/new');
        }
        toast.success("Chat history deleted");
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentCapabilities = (agentName, category) => {
    const name = (agentName || '').toLowerCase();
    const cat = (category || '').toLowerCase();

    // Default: Everything enabled for AI Ads
    if (name === 'AI Ads' || !name) {
      return {
        canUploadImages: true,
        canUploadDocs: true,
        canVoice: true,
        canVideo: true,
        canCamera: true
      };
    }

    const caps = {
      canUploadImages: true,
      canUploadDocs: true,
      canVoice: true,
      canVideo: true,
      canCamera: true
    };

    // Specific logic per category/name
    if (cat.includes('hr') || cat.includes('finance') || name.includes('doc') || name.includes('legal')) {
      caps.canVideo = false;
      caps.canCamera = false;
      caps.canUploadImages = false;
    } else if (cat.includes('design') || cat.includes('creative') || name.includes('photo')) {
      caps.canVoice = false;
      caps.canVideo = false;
      caps.canUploadDocs = false;
    } else if (name.includes('voice') || name.includes('call') || name.includes('bot')) {
      caps.canUploadImages = false;
      caps.canUploadDocs = false;
      caps.canCamera = false;
      caps.canVideo = false;
    } else if (cat.includes('medical') || cat.includes('health')) {
      caps.canVideo = false;
      caps.canUploadImages = true;
    }

    return caps;
  };

  const handleDownload = async (url, filename) => {
    if (isDownloadingUrl === url) return;
    setIsDownloadingUrl(url);
    const downloadToast = toast.loading("Preparing download...");

    // Use proxy for download as well to avoid "No-CORS" blocks during fetch
    const downloadUrl = `${apis.imageProxy}?url=${encodeURIComponent(url)}`;

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'AI LEGAL™-download.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started!", { id: downloadToast });
    } catch (error) {
      console.error('Download failed even with proxy:', error);
      toast.error("Download failed", { id: downloadToast });
      // Ultimate Fallback: Try opening in new tab
      window.open(url, '_blank');
    } finally {
      setIsDownloadingUrl(null);
    }
  };

  const handleImageAction = (action) => {
    if (selectedFiles.length === 0) return;

    let command = '';
    switch (action) {
      case 'remove-bg':
        command = 'Remove the background and clean up this image.';
        break;
      case 'remix':
        command = 'Create a stunning new image based on this attachment. Here are the details: ';
        break;
      case 'enhance':
        command = 'Analyze the attached image and generate a higher quality version of it.';
        break;
      default:
        break;
    }
    setInputValue(command);

    if (action === 'remix') {
      inputRef.current?.focus();
      toast.success("Describe your changes and hit send!");
    } else {
      toast.success(`${action.replace('-', ' ')} processing...`);
      setLoadingText(`Processing ${action.replace('-', ' ')}... 🖼️`);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };


  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isDraftEditorOpen, setIsDraftEditorOpen] = useState(false);
  const [editorMessage, setEditorMessage] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorTab, setEditorTab] = useState("edit"); // "edit" | "preview"

  // Feedback State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsgId, setFeedbackMsgId] = useState(null);
  const [feedbackCategory, setFeedbackCategory] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const [loadingText, setLoadingText] = useState("AI LEGAL™ is thinking..."); // New state for loading status text
  const [messageFeedback, setMessageFeedback] = useState({}); // { [msgId]: { type: 'up' | 'down', categories: [], details: '' } }
  const [downloadedMessages, setDownloadedMessages] = useState({}); // Tracks which messages have been downloaded
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const toggleFeedback = (msgId, feedbackData) => {
    setMessageFeedback(prev => {
      // If it's the same type and no extra data (categories), toggle it off
      if (prev[msgId]?.type === feedbackData.type && (!feedbackData.categories || feedbackData.categories.length === 0)) {
        const { [msgId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [msgId]: feedbackData
      };
    });
  };

  const handlePdfAction = async (action, msg) => {
    // Instant Share/Copy if PDF is already pre-generated
    if ((action === 'share' || action === 'copy') && pregeneratedPdfs[msg.id]) {
      const file = pregeneratedPdfs[msg.id];

      if (action === 'copy') {
        try {
          if (!window.ClipboardItem) throw new Error("ClipboardItem not supported");

          const cleanText = msg.content
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/### (.*)/g, '$1')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');

          // We try to put both PDF and Text in the clipboard
          // Apps like WhatsApp Desktop might pick the PDF, others will pick the text
          const item = new ClipboardItem({
            ['application/pdf']: Promise.resolve(file),
            ['text/plain']: new Blob([cleanText], { type: 'text/plain' })
          });

          await navigator.clipboard.write([item]);
          toast.success("PDF aur Text copy ho gaya! 📋 Ab aap WhatsApp ya kisi bhi app mein Paste kar sakte hain.");
          return;
        } catch (err) {
          console.warn("Direct PDF copy failed, falling back to text only:", err);
          await copyText(msg.content);
          toast.success("Text copy ho gaya! (PDF copy browser mein limited hai)");
          return;
        }
      }

      // Try native share (works on mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: file.name || 'AI LEGAL™ Document',
            text: 'Converted Document from AI LEGAL™'
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // User cancelled
          // Native share failed for other reason — open in new tab as fallback
        }
      }
      // Desktop / unsupported: open PDF in new tab (NO download)
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, '_blank');
      return;
    }

    const isPregeneration = action === 'pregenerate';
    // If we're already pre-generating, don't start another one
    if (isPregeneration && pdfLoadingId === msg.id) return;
    if (isPregeneration && pregeneratedPdfs[msg.id]) return;

    // Converted File Logic
    if (msg.conversion && msg.conversion.file && msg.conversion.mimeType === 'application/pdf') {
      const shareToastId = !isPregeneration ? toast.loading(`${action === 'share' ? 'Sharing' : 'Preparing'} PDF...`) : null;
      try {
        const byteCharacters = atob(msg.conversion.file);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const filename = msg.conversion.fileName || 'AI LEGAL™ Document.pdf';
        const file = new window.File([blob], filename, { type: 'application/pdf' });

        if (isPregeneration) {
          setPregeneratedPdfs(prev => ({ ...prev, [msg.id]: file }));
          return;
        }

        if (action === 'download') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("PDF Downloaded", { id: shareToastId });
        } else if (action === 'open') {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          toast.dismiss(shareToastId);
        } else if (action === 'copy') {
          if (!window.ClipboardItem) {
            toast.error("Iss browser mein direct file copy supported nahi hai.");
            toast.dismiss(shareToastId);
            return;
          }
          const item = new ClipboardItem({
            [file.type || 'application/pdf']: Promise.resolve(file)
          });
          await navigator.clipboard.write([item]);
          toast.success("PDF file copy ho gayi! 📋", { id: shareToastId });
        } else if (action === 'share') {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'AI LEGAL™ Response',
                text: msg && msg.content ? `${msg.content.substring(0, 150)}...` : 'AI LEGAL™ Document output'
              });
              toast.success("PDF sent to share menu!", { id: shareToastId });
            } catch (shareErr) {
              if (shareErr.name !== 'AbortError') {
                // Share failed — open in new tab instead of downloading
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                toast.dismiss(shareToastId);
              } else {
                toast.dismiss(shareToastId);
              }
            }
          } else {
            // Not supported — open in new tab (NO forced download)
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            toast.dismiss(shareToastId);
          }
        }
        return;
      } catch (err) {
        if (shareToastId) toast.error("Failed to process PDF", { id: shareToastId });
        console.error("Error handling PDF action:", err);
      }
    }

    // Normal AI Response PDF Logic
    const processToastId = !isPregeneration ? toast.loading(`${action === 'share' ? 'Sharing' : 'Generating'} PDF Document...`) : null;
    if (!isPregeneration) setPdfLoadingId(msg.id);

    try {
      const element = document.getElementById(`msg-text-${msg.id}`);
      if (!element) {
        if (processToastId) toast.error("Content not found", { id: processToastId });
        setPdfLoadingId(null);
        return;
      }

      let canvas;
      try {
        // Create an unconstrained wrapper to prevent screen-size clipping
        const tempWrapper = document.createElement('div');
        tempWrapper.style.position = 'absolute';
        tempWrapper.style.left = '-9999px';
        tempWrapper.style.top = '-9999px';
        tempWrapper.style.width = '800px'; // Fixed desktop-like width for consistency
        tempWrapper.style.backgroundColor = '#ffffff';

        // Clone the content
        const clonedContent = element.cloneNode(true);
        clonedContent.id = `temp-pdf-${msg.id}`;

        // 🔥 STRIP "REQUIRED INFORMATION" FROM PDF (DRAFT MAKER FIX)
        const stripRequiredInfo = (node) => {
          const markers = ["🔶 REQUIRED INFORMATION", "REQUIRED INFORMATION", "🔶 REQUIRED INFO", "REQUIRED INFO"];
          const content = node.innerHTML;
          if (content) {
            for (const marker of markers) {
              if (content.includes(marker)) {
                const parts = content.split(marker);
                // Only strip if parts[0] has substantial content, otherwise it might be a false positive
                if (parts[0].trim().length > 50) {
                  node.innerHTML = parts[0];
                }
                break;
              }
            }
          }
        };
        stripRequiredInfo(clonedContent);

        // Add Header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.style.paddingBottom = '10px';
        header.style.borderBottom = '1px solid #eee';
        header.style.fontSize = '12px';
        header.style.color = '#888';
        header.style.fontWeight = 'bold';
        header.innerText = 'AI LEGAL™ RESPONSE';

        tempWrapper.appendChild(header);

        // Ensure all text in clone is black and wrapping properly
        clonedContent.style.padding = '20px';
        clonedContent.style.color = '#000000';
        clonedContent.style.backgroundColor = '#ffffff';
        clonedContent.style.width = '100%';
        clonedContent.style.lineHeight = '1.4';

        const all = clonedContent.querySelectorAll('*');
        Array.from(all).forEach(el => {
          const computedBg = el.style.backgroundColor;
          const isCodeEl = el.closest('pre') || el.closest('code') || el.closest('[class*="group/code"]') ||
            el.tagName === 'PRE' || el.tagName === 'CODE';

          if (isCodeEl) {
            // Force ALL code block elements to be readable in PDF
            el.style.backgroundColor = '#f5f5f5';
            el.style.color = '#1a1a1a';
            el.style.textShadow = 'none';
            el.style.borderColor = '#ddd';
          } else {
            // Force ALL normal text elements (including spans) to be black for PDF readability
            el.style.color = '#000000';
            el.style.opacity = '1';
            el.style.visibility = 'visible';
          }
          if (el.tagName === 'P') el.style.marginBottom = '6px';
          if (el.tagName === 'A') el.style.color = '#0000ff';
        });

        // Force dark wrapper divs of code blocks to be light
        const codeDivs = clonedContent.querySelectorAll('[class*="bg-[#0d0d0d]"], [class*="bg-[#2d2d2d]"], pre, code');
        Array.from(codeDivs).forEach(el => {
          el.style.backgroundColor = '#f5f5f5';
          el.style.color = '#1a1a1a';
        });

        // Expand scrollable areas like code blocks so they don't clip
        const scrollers = clonedContent.querySelectorAll('.overflow-auto, [class*="overflow-"], [class*="max-h-"], pre, code');
        Array.from(scrollers).forEach(el => {
          el.style.maxHeight = 'none';
          el.style.overflow = 'visible';
          el.style.height = 'auto';
        });

        tempWrapper.appendChild(clonedContent);
        document.body.appendChild(tempWrapper);

        // Wait a bit more for styles and fonts to apply
        await new Promise(r => setTimeout(r, 800));

        // Generate canvas from the unconstrained clone using html2canvas (more robust than html-to-image)
        canvas = await html2canvas(tempWrapper, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800,
          windowWidth: 800
        });

        // Cleanup
        document.body.removeChild(tempWrapper);

      } catch (genError) {
        if (processToastId) toast.error(`Canvas Error: ${genError.message}`, { id: processToastId });
        setPdfLoadingId(null);
        return;
      }

      if (!canvas) {
        if (processToastId) toast.error("Failed to capture content", { id: processToastId });
        setPdfLoadingId(null);
        return;
      }

      // ===== SMART PER-PAGE CANVAS SLICING =====
      // Scans for white space near page breaks to avoid cutting text lines
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm
      const printW = pageW - margin * 2;
      const printH = pageH - margin * 2;

      const pxPerMm = canvas.width / printW;
      const pageHeightPx = Math.floor(printH * pxPerMm);
      const mainCtx = canvas.getContext('2d', { willReadFrequently: true });

      let currentY = 0;
      let pageCount = 0;

      while (currentY < canvas.height) {
        if (pageCount > 0) pdf.addPage();

        let targetH = pageHeightPx;
        // If not the last page, try to find a "smart" break point (white space)
        if (currentY + targetH < canvas.height) {
          // Increase scan range to found a better gap (max 200px or 1/3 of page)
          const scanRange = Math.min(200, Math.floor(pageHeightPx / 3));
          try {
            const scanData = mainCtx.getImageData(0, currentY + targetH - scanRange, canvas.width, scanRange).data;
            let foundSafeRow = -1;

            // Search from bottom of the ideal page area upwards
            for (let row = scanRange - 1; row >= 0; row--) {
              let isWhiteRow = true;
              // Sampling check every 5th pixel for better accuracy than every 10th
              for (let col = 0; col < canvas.width; col += 5) {
                const idx = (row * canvas.width + col) * 4;
                // Check if color is near white (AI Ads bg or transparent)
                if (scanData[idx] < 245 || scanData[idx + 1] < 245 || scanData[idx + 2] < 245) {
                  isWhiteRow = false;
                  break;
                }
              }
              if (isWhiteRow) {
                foundSafeRow = row;
                break;
              }
            }

            if (foundSafeRow !== -1) {
              // We found a gap! Slice here.
              targetH = (targetH - scanRange) + foundSafeRow + 4; // 4px extra safety buffer
            } else {
              // If no gap found, we'll have to cut through text, 
              // but let's try to avoid mid-line repetition by being exact
              targetH = pageHeightPx;
            }
          } catch (e) {
            console.warn("Smart break scan failed", e);
            targetH = pageHeightPx;
          }
        } else {
          targetH = canvas.height - currentY;
        }

        // Clip safety: ensure we don't exceed actual canvas height
        if (currentY + targetH > canvas.height) {
          targetH = canvas.height - currentY;
        }

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = targetH;
        const pCtx = pageCanvas.getContext('2d');
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pCtx.drawImage(canvas, 0, currentY, canvas.width, targetH, 0, 0, canvas.width, targetH);

        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95); // JPEG slightly faster/smaller
        const mmH = targetH / pxPerMm;
        pdf.addImage(pageImg, 'JPEG', margin, margin, printW, mmH, undefined, 'FAST');

        currentY += targetH; // Advance by exactly what we took
        pageCount++;
      }
      // ===== END SMART SLICING =====

      const filename = `AI LEGAL™ Document.pdf`;
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf', lastModified: new Date().getTime() });

      if (isPregeneration) {
        setPregeneratedPdfs(prev => ({ ...prev, [msg.id]: file }));
        return;
      }

      if (action === 'download') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadedMessages(prev => ({ ...prev, [msg.id]: true }));
        if (processToastId) toast.success("PDF Downloaded", { id: processToastId });
      } else if (action === 'open') {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        if (processToastId) toast.dismiss(processToastId);
      } else if (action === 'copy') {
        try {
          if (!window.ClipboardItem) throw new Error("ClipboardItem not supported");

          const cleanText = msg.content
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/### (.*)/g, '$1')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');

          const item = new ClipboardItem({
            ['application/pdf']: Promise.resolve(blob),
            ['text/plain']: new Blob([cleanText], { type: 'text/plain' })
          });

          await navigator.clipboard.write([item]);
          if (processToastId) toast.success("PDF aur Text copy ho gaya! 📋", { id: processToastId });
        } catch (err) {
          console.warn("Binary copy failed:", err);
          await copyText(msg.content);
          if (processToastId) toast.success("Text copy ho gaya!", { id: processToastId });
        }
      } else if (action === 'share') {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // On desktop, prioritize in-app WhatsApp share to avoid Windows native share login issues
        if (!isMobile) {
          handleWhatsAppPdfShare(msg);
          if (processToastId) toast.dismiss(processToastId);
          return;
        }

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'AI LEGAL™ Response',
              text: msg && msg.content ? `${msg.content.substring(0, 150)}...` : 'AI LEGAL™ Document output'
            });
            if (processToastId) toast.success("PDF sent to share menu!", { id: processToastId });
          } catch (shareErr) {
            if (shareErr.name !== 'AbortError') {
              // Share failed — open in new tab instead of downloading
              const blobUrl = URL.createObjectURL(blob);
              window.open(blobUrl, '_blank');
              if (processToastId) toast.dismiss(processToastId);
            } else {
              if (processToastId) toast.dismiss(processToastId);
            }
          }
        } else {
          // Fallback or specific Desktop case without navigator.share
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          if (processToastId) toast.dismiss(processToastId);
        }
      }
    } catch (err) {
      console.error(err);
      if (processToastId) toast.error("Failed to generate PDF", { id: processToastId });
    } finally {
      if (!isPregeneration) setPdfLoadingId(null);
    }
  };

  // Auto-resize chat input textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset height to recount
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // ===== AUTO PRE-GENERATE PDF — DISABLED =====
  // PDF generation now only triggers on explicit user action (download/share/copy click).
  // Background pregeneration caused unnecessary processing on every AI response.
  // useEffect(() => {
  //   const lastMsg = messages[messages.length - 1];
  //   if (!lastMsg || lastMsg.role !== 'model' || !lastMsg.content) return;
  //   if (pregeneratedPdfs[lastMsg.id]) return;
  //   if (typingMessageId === lastMsg.id) return;
  //   const timer = setTimeout(() => {
  //     handlePdfAction('pregenerate', lastMsg);
  //   }, 1500);
  //   return () => clearTimeout(timer);
  // }, [messages, typingMessageId, pregeneratedPdfs]);

  const handleThumbsDown = (msgId) => {
    setFeedbackMsgId(msgId);
    setFeedbackOpen(true);
    setFeedbackCategory([]);
    setFeedbackDetails("");
  };

  const handleThumbsUp = async (msgId) => {
    try {
      toggleFeedback(msgId, { type: 'up' });
      await axios.post(apis.feedback, {
        sessionId: sessionId || 'unknown',
        messageId: msgId,
        type: 'thumbs_up'
      });
      toast.success("Thanks for the positive feedback!", {
        icon: '👍',
      });
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Failed to submit feedback");
      // Revert local state on error
      toggleFeedback(msgId, { type: 'up' });
    }
  };

  const handleShare = async (content) => {
    if (!sessionId || sessionId === 'new') {
      toast.error("Please send a message first to share this chat.");
      return;
    }

    const shareToast = toast.loading("Generating share link...");
    try {
      const response = await chatStorageService.shareSession(sessionId);
      if (response && response.success) {
        setCurrentShareId(response.shareId);
        setIsShareModalOpen(true);
        toast.dismiss(shareToast);
      } else {
        throw new Error("Failed to generate share link");
      }
    } catch (err) {
      toast.dismiss(shareToast);
      console.error("[SHARE ERROR]", err);
      // Fallback to simple share if backend fails
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'AI Assistant Response',
            text: content,
          });
        } catch (shareErr) {
          console.log('Error sharing:', shareErr);
        }
      } else {
        handleCopyMessage(content);
        toast.error("Enhanced sharing unavailable. Content copied to clipboard.");
      }
    }
  };

  const handleDownloadCodeProject = async (msg) => {
    const toastId = toast.loading("Generating Project ZIP...");
    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;

      const zip = new JSZip();

      const content = msg.content || "";
      // Updated regex to catch bold filenames followed by codeblocks with possible language tags
      const regex = /\*\*(.+?)\*\*[\s\n]*```(?:[a-zA-Z]*)\n([\s\S]*?)```/g;
      let match;
      let fileCount = 0;

      while ((match = regex.exec(content)) !== null) {
        let filename = match[1].trim();
        let code = match[2];
        if (filename && code) {
          // Ensure filename doesn't have invalid path characters
          filename = filename.replace(/[\/\\]/g, '_');
          zip.file(filename, code);
          fileCount++;
        }
      }

      // Fallback if no specific code files were matched
      if (fileCount === 0) {
        zip.file("code_export.md", content);
      }

      // Generate Blob with explicit DEFLATE compression for better Windows compatibility
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      // Native download approach (bypasses potential file-saver bugs)
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "AI LEGAL™_Code_Project.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Project Downloaded Successfully!", { id: toastId });
    } catch (err) {
      console.error("ZIP Generate error:", err);
      toast.error("Download failed.", { id: toastId });
    }
  };



  // WhatsApp In-App PDF Share — uploads PDF to cloud, then lets user pick contact IN-APP
  const handleWhatsAppPdfShare = async (msg) => {
    const toastId = toast.loading("Preparing PDF for WhatsApp...");
    try {
      // 1. Generate PDF from message
      const element = document.getElementById(`msg-text-${msg.id}`);
      if (!element) { toast.error("Content not found", { id: toastId }); return; }

      // Create an unconstrained wrapper to prevent screen-size clipping
      const tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'absolute';
      tempWrapper.style.left = '-9999px';
      tempWrapper.style.top = '-9999px';
      tempWrapper.style.width = '800px'; // Fixed desktop width
      tempWrapper.style.backgroundColor = '#ffffff';

      // Clone the content
      const clonedContent = element.cloneNode(true);
      clonedContent.id = `temp-wa-pdf-${msg.id}`;

      // Add Header
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.style.paddingBottom = '10px';
      header.style.borderBottom = '1px solid #eee';
      header.style.fontSize = '12px';
      header.style.color = '#888';
      header.style.fontWeight = 'bold';
      header.innerText = 'AI LEGAL™ RESPONSE';

      tempWrapper.appendChild(header);

      clonedContent.style.padding = '20px';
      clonedContent.style.color = '#000000';
      clonedContent.style.backgroundColor = '#ffffff';
      clonedContent.style.width = '100%';
      clonedContent.style.lineHeight = '1.4';

      const all = clonedContent.querySelectorAll('*');
      Array.from(all).forEach(el => {
        el.style.color = '#000000';
        if (el.tagName === 'P') el.style.marginBottom = '6px';
        if (el.tagName === 'A') el.style.color = '#0000ff';

        const isInsideCode = el.closest('.group\\/code') || el.closest('pre') || el.closest('code');
        if (isInsideCode) {
          el.style.backgroundColor = '#f8f9fa';
        }
      });

      tempWrapper.appendChild(clonedContent);
      document.body.appendChild(tempWrapper);

      // Wait a bit more for styles to apply
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(tempWrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        logging: false
      });

      document.body.removeChild(tempWrapper);

      // ===== SMART PER-PAGE SLICING (for WhatsApp) =====
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const printW = pageW - margin * 2;
      const printH = pageH - margin * 2;
      const pxPerMm = canvas.width / printW;
      const pageHeightPx = Math.floor(printH * pxPerMm);
      const mainCtx = canvas.getContext('2d', { willReadFrequently: true });

      let curY = 0;
      let pageIdx = 0;
      while (curY < canvas.height) {
        if (pageIdx > 0) pdf.addPage();
        let targetH = pageHeightPx;
        if (curY + targetH < canvas.height) {
          const scanRange = Math.min(200, Math.floor(pageHeightPx / 3));
          try {
            const scanData = mainCtx.getImageData(0, curY + targetH - scanRange, canvas.width, scanRange).data;
            let bestRow = -1;
            for (let r = scanRange - 1; r >= 0; r--) {
              let isWhite = true;
              for (let c = 0; c < canvas.width; c += 5) {
                const i = (r * canvas.width + c) * 4;
                if (scanData[i] < 245 || scanData[i + 1] < 245 || scanData[i + 2] < 245) {
                  isWhite = false;
                  break;
                }
              }
              if (isWhite) { bestRow = r; break; }
            }
            if (bestRow !== -1) {
              targetH = (targetH - scanRange) + bestRow + 4;
            }
          } catch (e) { }
        } else { targetH = canvas.height - curY; }

        if (curY + targetH > canvas.height) targetH = canvas.height - curY;

        const pCanvas = document.createElement('canvas');
        pCanvas.width = canvas.width;
        pCanvas.height = targetH;
        const pCtx = pCanvas.getContext('2d');
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
        pCtx.drawImage(canvas, 0, curY, canvas.width, targetH, 0, 0, canvas.width, targetH);
        pdf.addImage(pCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, printW, targetH / pxPerMm, undefined, 'FAST');
        curY += targetH;
        pageIdx++;
      }
      // ===== END SMART SLICING =====
      // 2. Upload PDF blob to Cloudinary via backend
      toast.loading("Uploading PDF...", { id: toastId });
      const blob = pdf.output('blob');
      const formData = new FormData();
      formData.append('pdf', blob, 'AI LEGAL™ Document.pdf');

      const { BASE_URL } = await import('../../types');
      const uploadRes = await axios.post(`${BASE_URL}/api/chat/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      const pdfUrl = uploadRes.data?.url;
      if (!pdfUrl) throw new Error("Upload failed");

      toast.dismiss(toastId);

      // 3. Show in-app WhatsApp contact picker modal
      setWaPdfUrl(pdfUrl);
      setWaMsgContent(`🤖 *AI LEGAL™ Response*\n\nYeh dekho meri AI LEGAL™ se baat: ${pdfUrl}`);
      setWaPhone('');
      setWaShareModal(true);

    } catch (err) {
      console.error("WhatsApp PDF Share error:", err);
      toast.error("WhatsApp share failed. Try again.", { id: toastId });
    }
  };

  const sendWhatsAppMessage = () => {
    const cleaned = waPhone.replace(/\D/g, '');
    if (cleaned.length < 7) { toast.error("Valid phone number daalo!"); return; }

    setWaUploading(true);
    const text = encodeURIComponent(waMsgContent);

    // Using api.whatsapp.com directly as it's more reliable for session persistence on desktop
    // Removing noreferrer to ensure cookies/sessions are shared correctly between windows
    const url = `https://api.whatsapp.com/send?phone=${cleaned}&text=${text}`;

    try {
      const win = window.open(url, '_blank', 'noopener');
      if (win) {
        win.focus();
        toast.success("WhatsApp mein message open ho gaya! 📤");
      } else {
        // Fallback for popup blockers
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        toast.success("WhatsApp opening... Check popups!");
      }
    } catch (err) {
      console.error("WhatsApp redirection error:", err);
      toast.error("Naya window nahi khul saka.");
    } finally {
      setWaUploading(false);
      setWaShareModal(false);
    }
  };

  const submitFeedback = async () => {
    if (isSubmittingFeedback) return;
    try {
      setIsSubmittingFeedback(true);
      const msgId = feedbackMsgId;
      const feedbackData = {
        type: 'down',
        categories: [...feedbackCategory],
        details: feedbackDetails
      };

      await axios.post(apis.feedback, {
        sessionId: sessionId || 'unknown',
        messageId: msgId,
        type: 'thumbs_down',
        categories: feedbackData.categories,
        details: feedbackData.details
      });

      toggleFeedback(msgId, feedbackData);
      toast.success("Feedback submitted. Thank you!");
      setFeedbackOpen(false);
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const toggleFeedbackCategory = (cat) => {
    setFeedbackCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCopyMessage = (content) => {
    if (!content) return;
    // Convert markdown to clean plain text for clipboard
    let clean = content;
    // Remove [ACTIVE TOOL: ...] tags
    clean = clean.replace(/\*?\*?\[ACTIVE TOOL:.*?\]\*?\*?/gi, '');
    // Convert markdown headings (##, ###) to plain uppercase text
    clean = clean.replace(/^#{1,6}\s+(.+)$/gm, (_, heading) => heading.trim().toUpperCase());
    // Remove bold/italic markers (**text**, *text*, __text__, _text_)
    clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
    clean = clean.replace(/\*(.+?)\*/g, '$1');
    clean = clean.replace(/__(.+?)__/g, '$1');
    clean = clean.replace(/_(.+?)_/g, '$1');
    // Remove strikethrough (~~text~~)
    clean = clean.replace(/~~(.+?)~~/g, '$1');
    // Remove inline code backticks
    clean = clean.replace(/`([^`]+)`/g, '$1');
    // Remove code block markers (```language ... ```)
    clean = clean.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
    });
    // Clean up horizontal rules (---, ***, ___)
    clean = clean.replace(/^[-*_]{3,}\s*$/gm, '─'.repeat(40));
    // Clean up list markers (- item -> • item, * item -> • item)
    clean = clean.replace(/^\s*[-*]\s+/gm, '• ');
    // Clean ordered list markers (1. item -> 1. item) — keep as-is for readability
    // Remove link syntax [text](url) -> text
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove image syntax ![alt](url) -> alt
    clean = clean.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    // Remove blockquote markers
    clean = clean.replace(/^\s*>\s?/gm, '');
    // Collapse excessive blank lines (3+ newlines -> 2)
    clean = clean.replace(/\n{3,}/g, '\n\n');
    // Trim
    clean = clean.trim();

    copyText(clean);
    toast.success("Copied to clipboard!");
  };

  const handleMessageDelete = (messageId) => {
    setDeleteConfig({
      isOpen: true,
      title: "Delete Message?",
      description: "Are you sure you want to delete this message? This action cannot be undone.",
      onConfirm: async () => {
        // Find the message index
        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;

        const msgsToDelete = [messageId];

        // Check if the NEXT message is an AI response (model), if so, delete it too
        if (msgIndex + 1 < messages.length) {
          const nextMsg = messages[msgIndex + 1];
          if (nextMsg.role === 'model') {
            msgsToDelete.push(nextMsg.id);
          }
        }

        // Optimistic update
        setMessages(prev => prev.filter(m => !msgsToDelete.includes(m.id)));

        // Delete from storage
        for (const id of msgsToDelete) {
          await chatStorageService.deleteMessage(sessionId, id);
        }
        toast.success("Message deleted");
      }
    });
  };

  const startEditing = (msg) => {
    if (msg.role === 'user') {
      setEditingMessageId(msg.id);
      setEditContent(msg.content || msg.text || "");
    } else {
      setEditorMessage(msg);
      setEditorContent(msg.content || msg.text || "");
      const activeToolId = selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool');
      const details = getToolDetails(activeToolId, selectedRole);
      const currentSession = sessions.find(s => s.sessionId === sessionId);
      setEditorTitle(currentSession?.title || details.title || "Legal Draft");
      setIsDraftEditorOpen(true);
      setEditorTab("edit");
    }
  };

  const handleSaveEditorChanges = async () => {
    if (!editorMessage) return;
    const updatedMsg = { ...editorMessage, content: editorContent, text: editorContent, edited: true };
    const editedMsgIndex = messages.findIndex(m => m.id === editorMessage.id);

    if (editedMsgIndex !== -1) {
      const updatedMessages = [...messages];
      updatedMessages[editedMsgIndex] = updatedMsg;
      setMessages(updatedMessages);

      try {
        await chatStorageService.updateMessage(sessionId, updatedMsg);
        toast.success("Draft updated successfully!");
        setIsDraftEditorOpen(false);
      } catch (e) {
        console.error("Save edit error:", e);
        toast.error("Failed to save changes");
      }
    }
  };

  const handleSaveAsNewDraft = async () => {
    if (!editorMessage) return;
    const newMsgId = (Date.now() + 1).toString();
    const newAiMsg = {
      id: newMsgId,
      role: 'model',
      content: editorContent,
      timestamp: new Date(),
      toolUsed: editorMessage.toolUsed || 'Draft Maker',
      activeTool: editorMessage.activeTool || 'legal_draft_maker',
      mode: editorMessage.mode || 'LEGAL_TOOLKIT',
      edited: true
    };

    setMessages(prev => [...prev, newAiMsg]);

    try {
      await chatStorageService.saveMessage(sessionId, newAiMsg, null, currentProjectId);
      toast.success("Saved as new draft version!");
      setIsDraftEditorOpen(false);
    } catch (e) {
      console.error("Save as new draft error:", e);
      toast.error("Failed to save as new draft");
    }
  };

  const handleExportDoc = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${editorTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }
        h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; }
        p { margin-bottom: 12pt; }
      </style>
      </head>
      <body>
        ${editorContent.split('\n').map(line => {
      if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
      if (line.startsWith('- ') || line.startsWith('* ')) return `<li>${line.substring(2)}</li>`;
      if (line.match(/^\d+\.\s/)) return `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
      return `<p>${line}</p>`;
    }).join('\n')}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editorTitle || 'Draft'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Word document downloaded!");
  };

  const saveEdit = async (msg) => {
    if (editContent.trim() === "") return;

    const updatedMsg = { ...msg, content: editContent, text: editContent, edited: true };
    const editedMsgIndex = messages.findIndex(m => m.id === msg.id);

    // 1. Audio Mode Handling
    if (isAudioConvertMode) {
      const updatedMessages = [...messages];
      updatedMessages[editedMsgIndex] = updatedMsg;
      setMessages(updatedMessages);
      setEditingMessageId(null);
      setIsLoading(true);
      try {
        await chatStorageService.updateMessage(sessionId, updatedMsg);
        const nextMsg = messages[editedMsgIndex + 1];
        const replaceAssistantMsgId = (nextMsg && nextMsg.role !== 'user') ? nextMsg.id : null;

        await manualTextToAudioConversion(updatedMsg.content, sessionId, replaceAssistantMsgId);
      } catch (e) {
        console.error("Audio edit error:", e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. AI Message Edit (e.g. Draft Maker)
    if (msg.role !== 'user') {
      const updatedMessages = [...messages];
      updatedMessages[editedMsgIndex] = updatedMsg;
      setMessages(updatedMessages);
      setEditingMessageId(null);
      try {
        await chatStorageService.updateMessage(sessionId, updatedMsg);
        toast.success("Draft updated!");
      } catch (e) {
        console.error("AI edit error:", e);
        toast.error("Failed to save changes");
      }
      return;
    }

    // 3. Normal User Message Edit (Regenerate)
    const messagesUpToEdit = messages.slice(0, editedMsgIndex);
    const updatedMessages = [...messagesUpToEdit, updatedMsg];
    setMessages(updatedMessages);
    setEditingMessageId(null);
    setIsLoading(true);
    try {
      await chatStorageService.updateMessage(sessionId, updatedMsg);
      await chatStorageService.truncateMessagesAfter(sessionId, msg.id);

      const SYSTEM_INSTRUCTION = `
You are AI LEGAL™, an advanced AI assistant.
IMAGE GENERATION CAPABILITIES:
If the user asks for an image (e.g., "generate", "create", "draw", "show me a pic", "image dikhao", "photo bhejo", "pic do"), tell them to use the AI-Powered Legal Research mode via the Magic Tools button. Do NOT attempt to generate images inline.
`;

      const aiResponseData = await generateChatResponse(
        messagesUpToEdit,
        updatedMsg.content,
        SYSTEM_INSTRUCTION + getSystemPromptExtensions(),
        updatedMsg.attachments || (updatedMsg.attachment ? [updatedMsg.attachment] : []),
        personalizations?.general?.language || 'English',
        null, // abortSignal
        currentMode,
        sessionId,
        currentProjectId
      );

      let reply = "";
      let conversion = null;
      let videoUrl = null;
      let imageUrl = null;

      if (typeof aiResponseData === 'string') {
        reply = aiResponseData;
      } else if (aiResponseData && typeof aiResponseData === 'object') {
        reply = aiResponseData.reply || "";
        conversion = aiResponseData.conversion || null;
        videoUrl = aiResponseData.videoUrl || null;
        imageUrl = aiResponseData.imageUrl || null;
      }

      const modelMsg = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
        ...(conversion && { conversion }),
        ...(videoUrl && { videoUrl }),
        ...(imageUrl && { imageUrl })
      };

      setMessages(prev => [...prev, modelMsg]);
      await chatStorageService.saveMessage(sessionId, modelMsg);

      toast.success("Message edited and new response generated!");
    } catch (error) {
      console.error("Error regenerating response:", error);
      toast.error("Failed to regenerate response. Please try again.");
      // Restore original messages on error
      const historyData = await chatStorageService.getHistory(sessionId);
      setMessages(historyData.messages || (Array.isArray(historyData) ? historyData : []));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameFile = async (msg) => {
    if (!msg.attachment) return;

    const oldName = msg.attachment.name;
    const dotIndex = oldName.lastIndexOf('.');
    const extension = dotIndex !== -1 ? oldName.slice(dotIndex) : '';
    const baseName = dotIndex !== -1 ? oldName.slice(0, dotIndex) : oldName;

    const newBaseName = prompt("Enter new filename:", baseName);
    if (!newBaseName || newBaseName === baseName) return;

    const newName = newBaseName + extension;
    const updatedMsg = {
      ...msg,
      attachment: {
        ...msg.attachment,
        name: newName
      }
    };

    setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
    await chatStorageService.updateMessage(sessionId, updatedMsg);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleUndo = async () => {
    if (messages.length <= 1 || isLoading) return;

    // Last message might be AI, second to last is User
    const lastMsg = messages[messages.length - 1];
    const secondLastMsg = messages[messages.length - 2];

    const idsToDelete = [];
    let contentToRestore = "";

    if (lastMsg.role === 'model' && secondLastMsg.role === 'user') {
      idsToDelete.push(lastMsg.id, secondLastMsg.id);
      contentToRestore = secondLastMsg.content || secondLastMsg.text || "";
    } else if (lastMsg.role === 'user') {
      idsToDelete.push(lastMsg.id);
      contentToRestore = lastMsg.content || lastMsg.text || "";
    } else {
      idsToDelete.push(lastMsg.id);
    }

    // Restore content to input field
    if (contentToRestore) {
      setInputValue(contentToRestore);
      // Small delay to ensure state update before focusing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Set cursor at the end
          inputRef.current.selectionStart = contentToRestore.length;
          inputRef.current.selectionEnd = contentToRestore.length;
        }
      }, 50);
    }

    // Optimistic Update
    setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));

    // Delete from storage
    try {
      for (const id of idsToDelete) {
        if (id) {
          await chatStorageService.deleteMessage(activeSessionId, id);
        }
      }
      toast.success("Message restored to input", { icon: '↩️' });
    } catch (error) {
      console.error("Undo error:", error);
    }
  };

  const handleSelectionAiAction = (action, text) => {
    let prompt = "";
    switch (action) {
      case 'explain': prompt = `Explain this in detail: "${text}"`; break;
      case 'summarize': prompt = `Summarize this text: "${text}"`; break;
      case 'rewrite': prompt = `Rewrite this professionally: "${text}"`; break;
      case 'ask': prompt = `I have a question about this: "${text}"\n\n[Your question here]`; break;
      default: prompt = text;
    }

    setInputValue(prompt);

    // Focus and scroll to input
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} action prepared!`, {
      icon: '✨',
      style: {
        borderRadius: '12px',
        background: '#333',
        color: '#fff',
      }
    });
  };


  const handleMessageUndo = async (msg) => {
    const msgIndex = messages.findIndex(m => m.id === msg.id);
    if (msgIndex === -1) return;

    const msgsToDelete = [msg.id];
    // Check if the next message is an AI response (model), if so, delete it too
    if (msgIndex + 1 < messages.length && messages[msgIndex + 1].role === 'model') {
      msgsToDelete.push(messages[msgIndex + 1].id);
    }

    // Restore content to input
    setInputValue(msg.content || msg.text || "");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = (msg.content || msg.text || "").length;
        inputRef.current.selectionEnd = (msg.content || msg.text || "").length;
      }
    }, 50);

    // Optimistic Update
    setMessages(prev => prev.filter(m => !msgsToDelete.includes(m.id)));

    // Delete from storage
    try {
      for (const id of msgsToDelete) {
        if (id) {
          await chatStorageService.deleteMessage(activeSessionId, id);
        }
      }
      toast.success("Resumed from this message", { icon: '↩️' });
    } catch (error) {
      console.error("Quick undo error:", error);
    }
  };

  const [viewingDoc, setViewingDoc] = useState(null);
  const docContainerRef = useRef(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setViewingDoc(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Process Excel documents
  useEffect(() => {
    if (viewingDoc && viewingDoc.name.match(/\.(xls|xlsx|csv)$/i)) {
      setExcelHTML(null); // Reset
      fetch(viewingDoc.url)
        .then(res => res.arrayBuffer())
        .then(ab => {
          const wb = XLSX.read(ab, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(ws, { id: "excel-preview", editable: false });
          setExcelHTML(html);
        })
        .catch(err => {
          console.error("Excel Preview Error:", err);
          setExcelHTML('<div class="text-center p-10 text-red-500">Failed to load Excel preview.</div>');
        });
    }
  }, [viewingDoc]);

  // Process Text/Code documents
  useEffect(() => {
    // Check if handled by other specific viewers
    const isSpecial = viewingDoc?.name.match(/\.(docx|doc|xls|xlsx|csv|pdf|mp4|webm|ogg|mov|mp3|wav|m4a|jpg|jpeg|png|gif|webp|bmp|svg)$/i) || viewingDoc?.url.startsWith('data:image/');

    if (viewingDoc && !isSpecial) {
      setTextPreview(null);
      fetch(viewingDoc.url)
        .then(res => res.text())
        .then(text => {
          if (text.length > 5000000) {
            setTextPreview(text.substring(0, 5000000) + "\n\n... (File truncated due to size)");
          } else {
            setTextPreview(text);
          }
        })
        .catch(err => {
          console.error("Text Preview Error:", err);
          setTextPreview("Failed to load text content.");
        });
    }
  }, [viewingDoc]);

  useEffect(() => {
    if (isAudioConvertMode) {
      setIsVoiceSettingsOpen(true);
    }
  }, [isAudioConvertMode]);

  if (isHydrating) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white ] text-slate-900 transition-all duration-500">
        <Loader />
        <p className="mt-4 text-[10px] font-black opacity-40 uppercase tracking-[0.3em] animate-pulse">Restoring Session</p>
      </div>
    );
  }

  const handleSaveToNotes = async (content) => {
    if (!activeCaseId) {
      toast.error("No active case selected");
      return;
    }
    try {
      const newNote = {
        id: `note_ai_${Date.now()}`,
        title: `AI Assistant Note — ${new Date().toLocaleDateString()}`,
        content: content,
        category: 'AI Notes',
        priority: 'High',
        tags: ['ai-generated', 'case-assistant'],
        createdAt: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...(currentCase?.notes || [])];
      await apiService.updateCase(activeCaseId, { notes: updatedNotes });
      if (typeof handleUpdateCase === 'function') {
        handleUpdateCase({ ...currentCase, notes: updatedNotes });
      }
      toast.success("✨ Saved to Case Notes!");
    } catch (err) {
      toast.error("Failed to save to Case Notes");
    }
  };

  const handleSaveToTimeline = async (content) => {
    if (!activeCaseId) {
      toast.error("No active case selected");
      return;
    }
    try {
      const newEvent = {
        id: `tl_ai_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        category: 'AI Analysis',
        importance: 'Medium',
        title: 'AI Assistant Case Insight',
        description: content.slice(0, 180) + '...',
        sourceDoc: 'Case-Aware AI Assistant',
        isAiGenerated: true
      };
      const updatedTimeline = [...(currentCase?.timeline || []), newEvent];
      await apiService.updateCase(activeCaseId, { timeline: updatedTimeline });
      if (typeof handleUpdateCase === 'function') {
        handleUpdateCase({ ...currentCase, timeline: updatedTimeline });
      }
      toast.success("✨ Saved to Timeline!");
    } catch (err) {
      toast.error("Failed to save to Timeline");
    }
  };

  const handleExportFullscreenChat = (format) => {
    if (messages.length === 0) {
      toast.error("No messages to export");
      return;
    }
    const expToast = toast.loading(`Exporting chat as ${format.toUpperCase()}...`);
    try {
      let fileContent = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      if (format === 'json') {
        fileContent = JSON.stringify({
          caseId: activeCaseId,
          caseName: currentCase?.name,
          activeTool: caseAiActiveTool,
          exportedAt: new Date().toISOString(),
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        fileContent = `AI LEGAL™ Case Assistant Chat Export\n`;
        fileContent += `Case Name: ${currentCase?.name || 'N/A'}\n`;
        fileContent += `Active Tool: ${TOOL_CHIP_DETAILS[caseAiActiveTool]?.name || 'N/A'}\n`;
        fileContent += `Date Exported: ${new Date().toLocaleString()}\n`;
        fileContent += `=========================================\n\n`;

        messages.forEach((msg) => {
          if (msg.isSystemLog || msg.isDivider || msg.isRoutingOffer) return;
          const sender = msg.role === 'user' ? 'Advocate' : 'AI Assistant';
          const time = new Date(msg.timestamp).toLocaleTimeString();
          fileContent += `[${time}] ${sender}:\n${msg.content || ''}\n\n`;
        });
      }

      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aisa_chat_${activeCaseId || 'export'}_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(expToast);
        toast.success("Export downloaded! ✅");
      }, 500);
    } catch (err) {
      toast.dismiss(expToast);
      console.error(err);
      toast.error("Export failed");
    }
  };

  const renderCaseAiPanel = () => {
    return (
      <div className="flex flex-col h-full bg-white select-text">
        {/* Panel Header */}
        {isAiPanelFullscreen ? (
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0 sticky top-0 z-30 flex-wrap gap-4 shadow-xs">
            {/* Left section: Back, Case Name, Active AI Tool Chip */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAiPanelFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft size={12} />
                Back to Case
              </button>
              <div className="h-4 w-px bg-slate-200 hidden xs:block" />
              <span className="text-xs font-black text-slate-900 tracking-wider uppercase truncate max-w-[200px] sm:max-w-none">{currentCase?.name}</span>
            </div>

            {/* Right section: New Chat, History, Collapse */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setCurrentCaseSessionId('new');
                  toast.success("Started a new conversation for this case!");
                }}
                className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#C8A34D] border border-[#C8A34D]/40 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Start New Chat"
              >
                <Plus size={12} /> New Chat
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="px-3 py-1.5 hover:bg-[#F9FAFB] rounded-xl text-[10px] font-bold text-slate-700 hover:text-slate-900 transition-colors border border-[#E5E7EB] shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Conversation History"
              >
                <History size={12} /> History
              </button>

              <div className="h-4 w-px bg-slate-200" />

              <button
                type="button"
                onClick={() => setIsAiPanelFullscreen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Collapse"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#C8A34D]" />
              <span className="text-xs font-black text-slate-900 tracking-wider uppercase">Case Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAiPanelFullscreen(true)}
              className="p-1.5 text-slate-400 hover:text-[#C8A34D] rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
              title="Expand to Fullscreen"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        )}

        {/* Scrollable Message History */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto custom-scrollbar ${isAiPanelFullscreen
              ? 'bg-white py-8 select-text'
              : 'bg-[#FCFDFE] p-5 space-y-6'
            }`}
        >
          {messages.length === 0 ? (
            <div className={`flex flex-col h-full justify-center py-4 ${isAiPanelFullscreen ? 'w-full max-w-full lg:max-w-[1000px] xl:max-w-[1100px] 2xl:max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8' : ''
              }`}>
              <div className="flex flex-col items-center text-center max-w-sm mx-auto px-4">
                <div className="w-12 h-12 rounded-2xl bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 mb-4 shadow-xs flex items-center justify-center">
                  <Brain size={24} />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Case-Aware AI Assistant</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                  This assistant is locked to <strong>{currentCase?.name}</strong>. It has access to all client facts, opponent details, timelines, hearings, and uploaded case files.
                </p>
              </div>

              {/* Suggestions Panel */}
              <div className={`mt-8 px-4 w-full ${isAiPanelFullscreen ? 'max-w-3xl mx-auto' : 'max-w-sm mx-auto'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Suggested Tasks</span>
                <div className={isAiPanelFullscreen ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2'}>
                  {[
                    "Draft a legal notice",
                    "Summarize uploaded evidence",
                    "Find contradictions",
                    "Build arguments",
                    "Predict case outcome",
                    "Generate cross examination questions",
                    "Create written submissions"
                  ].map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(null, sug)}
                      className="w-full text-left px-4 py-2.5 bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-sm active:scale-[0.99] flex items-center justify-between group"
                    >
                      <span>{sug}</span>
                      <ChevronRight size={12} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={isAiPanelFullscreen ? 'w-full max-w-full lg:max-w-[1000px] xl:max-w-[1100px] 2xl:max-w-[1200px] mx-auto space-y-8 px-4 sm:px-6 md:px-8' : 'space-y-5'}>
              {messages.map((msg, idx) => {
                if (msg.isSystemLog) return null;

                if (msg.isDivider) {
                  return (
                    <div key={msg.id || idx} className="flex items-center justify-center my-6">
                      <div className="flex-1 border-t border-dashed border-slate-200" />
                      <span className="mx-4 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-[#FCFDFE] px-3 py-1 border border-slate-200/50 rounded-full">
                        {msg.content}
                      </span>
                      <div className="flex-1 border-t border-dashed border-slate-200" />
                    </div>
                  );
                }

                if (msg.isRoutingOffer) {
                  return (
                    <div key={msg.id || idx} className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl my-4 space-y-3">
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">
                        This request is better handled by <strong className="text-[#6D5DFC]">{msg.suggestedToolName}</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptRouting(msg)}
                          className="px-3 py-1.5 bg-[#6D5DFC] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm active:scale-95"
                        >
                          Switch Automatically
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineRouting(msg)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-[10px] font-bold transition-all shadow-sm active:scale-95"
                        >
                          Continue Here
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="checkbox"
                          id={`auto-switch-pref-${msg.id}`}
                          defaultChecked={localStorage.getItem('aisa_auto_switch_tool') === 'true'}
                          onChange={(e) => {
                            localStorage.setItem('aisa_auto_switch_tool', e.target.checked ? 'true' : 'false');
                          }}
                          className="w-3.5 h-3.5 text-[#6D5DFC] border-slate-300 rounded focus:ring-[#6D5DFC] cursor-pointer"
                        />
                        <label htmlFor={`auto-switch-pref-${msg.id}`} className="text-[10px] text-slate-500 font-medium cursor-pointer select-none">
                          Switch silently in the future
                        </label>
                      </div>
                    </div>
                  );
                }

                const isUser = msg.role === 'user';
                if (isAiPanelFullscreen) {
                  if (isUser) {
                    return (
                      <div
                        key={msg.id || idx}
                        className="flex items-start justify-end gap-3.5 w-full group/usr-msg mb-4"
                      >
                        {/* User Bubble & Actions Column */}
                        <div className="flex flex-col items-end max-w-[500px]">
                          {/* Rounded bubble with soft background */}
                          <div className="bg-[#F4F4F7] text-slate-800 p-4 px-5 rounded-3xl rounded-tr-sm shadow-xs select-text">
                            <p className="whitespace-pre-wrap font-semibold text-sm leading-relaxed text-left">
                              {msg.content}
                            </p>
                          </div>
                          {/* Message actions underneath */}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-bold px-1.5 select-none">
                            <span>
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                copyText(msg.content);
                                toast.success("Copied to clipboard!");
                              }}
                              className="flex items-center gap-1 hover:text-[#6D5DFC] transition-colors cursor-pointer"
                              title="Copy message"
                            >
                              <Copy size={11} />
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>

                        {/* Small User Avatar */}
                        <div className="w-7 h-7 rounded-full bg-slate-200/80 border border-slate-300 flex items-center justify-center shrink-0 shadow-xs select-none">
                          <User size={12} className="text-slate-600" />
                        </div>
                      </div>
                    );
                  } else {
                    // AI Message layout (natural flowing content, no border card container)
                    return (
                      <div
                        key={msg.id || idx}
                        className="flex items-start gap-4 w-full group/ai-msg mb-8"
                      >

                        {/* AI Content Wrapper */}
                        <div className="flex-1 min-w-0 space-y-4">
                          {/* Markdown renderer with custom prose typography style */}
                          {msg.id === typingMessageId && !msg.content ? (
                            <AisaTypingIndicator
                              visible={true}
                              message={getToolTypingMessage(caseAiActiveTool)}
                            />
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              urlTransform={(val) => val}
                              className="prose prose-slate max-w-none text-[14.5px] leading-relaxed text-slate-800 font-normal focus:outline-none"
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-xl font-black text-slate-900 tracking-tight mt-6 mb-3 border-b border-slate-100 pb-1.5" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mt-5 mb-2.5" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-md font-bold text-slate-800 mt-4 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-zinc-300 marker:text-[#C8A34D]" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-700 dark:text-zinc-300 marker:text-[#C8A34D] font-semibold" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1 text-slate-700 dark:text-zinc-300 font-normal" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-extrabold text-slate-900 dark:text-zinc-100" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[#C8A34D] bg-[#C8A34D]/10 dark:bg-[#C8A34D]/15 pl-4 py-2 pr-2 rounded-r-xl my-4 text-slate-800 dark:text-zinc-200 italic" {...props} />,
                                code: ({ node, inline, className, children, ...props }) => {
                                  return (
                                    <code className="bg-[#C8A34D]/10 text-[#C8A34D] dark:text-[#E2C275] px-1.5 py-0.5 rounded-md font-mono text-xs border border-[#C8A34D]/20" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre: ({ node, children, ...props }) => (
                                  <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto my-4 shadow-sm border border-slate-800" {...props}>
                                    {children}
                                  </pre>
                                )
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          )}

                          {/* Message actions underneath */}
                          <div className="flex items-center flex-wrap gap-3.5 pt-1.5 text-[10px] text-slate-400 font-bold select-none opacity-80 hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                copyText(msg.content);
                                toast.success("Copied to clipboard!");
                              }}
                              className="flex items-center gap-1 hover:text-[#C8A34D] transition-colors cursor-pointer"
                              title="Copy response"
                            >
                              <Copy size={11} />
                              <span>Copy</span>
                            </button>
                            <span className="h-3 w-px bg-slate-200" />
                            <button
                              type="button"
                              onClick={() => handleSaveToNotes(msg.content)}
                              className="flex items-center gap-1 hover:text-[#C8A34D] transition-colors cursor-pointer"
                              title="Save to Case Notes"
                            >
                              <FileText size={11} />
                              <span>Save to Case Notes</span>
                            </button>
                            <span className="h-3 w-px bg-slate-200" />
                            <button
                              type="button"
                              onClick={() => handleSaveToTimeline(msg.content)}
                              className="flex items-center gap-1 hover:text-[#C8A34D] transition-colors cursor-pointer"
                              title="Save to Timeline"
                            >
                              <History size={11} />
                              <span>Save to Timeline</span>
                            </button>
                            <span className="h-3 w-px bg-slate-200" />
                            <button
                              type="button"
                              className="hover:text-[#C8A34D] transition-colors cursor-pointer"
                              title="Thumbs up"
                            >
                              <ThumbsUp size={11} />
                            </button>
                            <button
                              type="button"
                              className="hover:text-red-500 transition-colors cursor-pointer"
                              title="Thumbs down"
                            >
                              <ThumbsDown size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                } else {
                  // Standard Minimized Sidebar layout
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1.5">
                        {isUser ? 'Advocate' : 'AI Assistant'}
                      </span>
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${isUser
                          ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tr-none shadow-xs font-semibold'
                          : 'bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm select-text'
                        }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            urlTransform={(val) => val}
                            className="prose prose-xs max-w-none text-slate-800"
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  );
                }
              })}

              {isLoading && !typingMessageId && (
                <div className="flex items-start gap-4 w-full pt-1 mb-8">
                  <div className="flex-1 pt-1.5">
                    <AisaTypingIndicator
                      visible={true}
                      message={getToolTypingMessage(caseAiActiveTool)}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className={`border-t border-[#E5E7EB] bg-white shrink-0 relative overflow-visible ${isAiPanelFullscreen ? 'p-6 pb-8' : 'p-4'}`}>
          <div className={isAiPanelFullscreen ? 'w-full max-w-full lg:max-w-[1000px] xl:max-w-[1100px] 2xl:max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8' : ''}>

            {/* Floating Tool Selector Popup Menu */}
            {isToolSelectorOpen && (
              <>
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 z-[1010]"
                  onClick={() => setIsToolSelectorOpen(false)}
                />
                <div className="absolute bottom-full mb-2 left-4 w-52 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/60 dark:border-zinc-800 shadow-2xl rounded-2xl p-1.5 z-[1011] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800 mb-1">
                    Switch AI Tool
                  </div>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                    {CASE_ASSISTANT_TOOLS.map(tool => {
                      const isActive = caseAiActiveTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            setIsToolSelectorOpen(false);
                            if (caseAiActiveTool !== tool.id) {
                              const dividerMsg = {
                                id: `divider-${Date.now()}`,
                                role: 'system',
                                isDivider: true,
                                content: `Switched to ${tool.name}`,
                                timestamp: new Date(),
                                mode: 'LEGAL_TOOLKIT',
                                activeTool: tool.id
                              };
                              setMessages(prev => [...prev, dividerMsg], sessionId || 'new');
                              chatStorageService.saveMessage(sessionId || 'new', dividerMsg, null, currentProjectId);

                              setCaseAiActiveTool(tool.id);
                              if (currentProjectId) {
                                updateWorkspace(currentProjectId, { activeTool: { id: tool.id, name: tool.name } });
                              }
                            }
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${isActive
                              ? 'bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/40'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{tool.icon}</span>
                            <span className="truncate">{tool.name}</span>
                          </div>
                          {isActive && <span className="text-[10px] text-[#C8A34D]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Previews area */}
            {filePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                {filePreviews.map((preview) => (
                  <div key={preview.id} className="relative group shrink-0 w-12 h-12 bg-white border border-slate-200 rounded-xl overflow-visible">
                    {preview.type.startsWith('image/') ? (
                      <img src={preview.url} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-slate-50/50">
                        <FileText className="w-5 h-5 text-[#C8A34D]" />
                        <span className="text-[6px] font-black uppercase text-[#C8A34D] truncate px-0.5 w-full text-center">
                          {preview.name || 'FILE'}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(preview.id)}
                      className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-white text-rose-500 rounded-full flex items-center justify-center shadow border border-slate-100 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(e);
              }}
              className={`flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-200 ${isAiPanelFullscreen
                  ? 'bg-slate-50 dark:bg-[#111111] hover:bg-slate-100/40 px-4 py-3 focus-within:border-[#C8A34D] focus-within:ring-1 focus-within:ring-[#C8A34D] shadow-sm'
                  : 'bg-slate-50 dark:bg-[#111111] hover:bg-slate-100/60 px-3.5 py-2 focus-within:border-[#C8A34D] focus-within:ring-1 focus-within:ring-[#C8A34D]'
                }`}
            >
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-[#C8A34D] rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Attach File"
              >
                <Paperclip size={14} />
              </button>

              {/* AI Tools Sparkles Button */}
              <button
                type="button"
                onClick={() => setIsToolSelectorOpen(prev => !prev)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${isToolSelectorOpen
                    ? 'text-[#C8A34D] bg-[#111111]'
                    : 'text-slate-400 hover:text-[#C8A34D] hover:bg-slate-200/50'
                  }`}
                title="AI Tools"
              >
                <Sparkles size={14} className={isToolSelectorOpen ? 'animate-pulse' : ''} />
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask AI about this case..."
                className={`flex-1 bg-transparent border-0 outline-none placeholder-slate-400 focus:ring-0 py-1 text-[#111111] dark:text-white ${isAiPanelFullscreen ? 'text-sm' : 'text-xs'
                  }`}
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer ${isListening
                    ? 'text-red-500 bg-red-50 animate-pulse'
                    : 'text-slate-400 hover:text-[#C8A34D] hover:bg-slate-200/50'
                  }`}
                title={isListening ? "Listening... Click to Stop" : "Voice Input"}
              >
                <Mic size={isAiPanelFullscreen ? 14 : 12} />
              </button>
              <button
                type="submit"
                disabled={(!inputValue.trim() && filePreviews.length === 0) || isLoading}
                className={`bg-[#C8A34D] hover:bg-[#b08d3b] disabled:bg-slate-200 text-[#111111] font-black rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:cursor-not-allowed shadow-md cursor-pointer ${isAiPanelFullscreen ? 'p-2.5' : 'p-1.5'
                  }`}
              >
                <Send size={isAiPanelFullscreen ? 14 : 12} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };


  const renderInputForm = () => {
    return (
      <div className="relative w-full">
        <AnimatePresence>
          {showScrollDownBtn && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              onClick={handleScrollToBottom}
              className="absolute left-1/2 -translate-x-1/2 -top-12 z-[1050] w-9 h-9 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-full flex items-center justify-center shadow-lg border border-slate-200/60 dark:border-zinc-700 transition-all hover:scale-105 active:scale-95 pointer-events-auto"
            >
              <ArrowDown size={18} />
            </motion.button>
          )}
        </AnimatePresence>
        <form
          onSubmit={handleSendMessage}
          className="relative w-full flex flex-col transition-all duration-300 p-1 z-[1002] aisa-chat-input-wrapper bg-white ] border border-slate-200/60 rounded-[28px] sm:rounded-[32px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-visible"
        >
          {/* Internal File Preview Area */}
          {(filePreviews.length > 0 || longTextPreview) && (
            <div className="flex flex-wrap gap-4 px-3 py-2 mb-1">
              {filePreviews.map((preview) => (
                <div key={preview.id} className="relative group shrink-0 w-[68px] sm:w-[76px] aspect-square bg-slate-100 rounded-2xl shadow-sm border border-slate-200 overflow-visible">
                  {preview.type.startsWith('image/') ? (
                    <div className="w-full h-full rounded-2xl overflow-hidden">
                      <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                      <FileText className="w-7 h-7 text-primary/60" />
                      <span className="text-[7px] font-black uppercase text-primary/70 mt-1 truncate px-1">{preview.type.split('/')[1]?.split('-')[0] || 'FILE'}</span>
                    </div>
                  )}
                  <div className="absolute -top-1.5 -right-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-[101]">
                    <button type="button" className="w-6 h-6 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 hover:scale-110"><Edit2 size={12} /></button>
                    <button type="button" onClick={() => handleRemoveFile(preview.id)} className="w-6 h-6 bg-white text-red-500 rounded-full flex items-center justify-center shadow-sm border border-slate-100 hover:scale-110"><X size={12} /></button>
                  </div>
                </div>
              ))}

              {longTextPreview && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="max-w-[85%] sm:max-w-[70%] mb-2"
                >
                  <div className="p-2 sm:p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between group shadow-sm">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.1em] mb-0">Text Preview</p>
                        <p className="text-[12px] text-slate-600 truncate font-medium">
                          {longTextPreview.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoPreviewDisabled(true);
                          setInputValue(longTextPreview);
                          setLongTextPreview(null);
                          if (inputRef.current) {
                            setTimeout(() => {
                              inputRef.current.focus();
                              inputRef.current.style.height = 'auto';
                              inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
                            }, 50);
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors uppercase"
                      >
                        Show in field
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLongTextPreview(null); setIsAutoPreviewDisabled(false); }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Reference Image Preview */}
          {isMagicEditing && editRefImage && filePreviews.length === 0 && (
            <div className="flex p-2 mb-1">
              <div className="relative group shrink-0 w-16 h-16 bg-white border border-primary/20 rounded-xl shadow-sm overflow-visible">
                <img src={editRefImage.url} alt="Reference" className="w-full h-full object-cover rounded-xl" />
                <button type="button" onClick={() => setEditRefImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-sm border border-white/20"><X size={12} /></button>
              </div>
            </div>
          )}

          <input id="file-upload" type="file" ref={uploadInputRef} onChange={handleFileSelect} multiple className="hidden" />
          <input id="drive-upload" type="file" ref={driveInputRef} onChange={handleFileSelect} multiple className="hidden" />
          <input id="doc-voice-upload" type="file" onChange={handleDocToVoiceSelect} className="hidden" accept=".pdf,.doc,.docx,.txt" />
          <input id="photos-upload" type="file" ref={photosInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*" />
          <input id="camera-upload" type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

          <div className="flex items-end gap-2 w-full">


            {/* AI CashFlow Search Results Dropdown */}
            {isCashFlowMode && inputValue.trim().length >= 2 && !isSearchingStocks && (
              <div className="absolute bottom-full left-0 right-0 mb-3 px-2 z-[1020] pointer-events-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  {stockSearchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-rose-500">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1.5 opacity-80" />
                      <p className="text-xs font-bold uppercase tracking-wider">This stock is not supported by the selected market.</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Only Indian stocks are currently available.</p>
                    </div>
                  ) : (
                    stockSearchResults.map((stock) => (
                      <button
                        key={stock.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedStock(stock);
                          setInputValue(stock.name);
                          setStockSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-slate-100 last:border-0 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">{stock.symbol}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{stock.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase">{stock.region}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Menu Backdrop Layer */}
            <AnimatePresence>
              {(isAttachMenuOpen || isToolsMenuOpen) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[1010] bg-black/5 ] pointer-events-auto"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    setIsToolsMenuOpen(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Left Actions Group */}
            <AnimatePresence>
              {isAttachMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  ref={menuRef}
                  className={`fixed sm:absolute bottom-[max(80px,calc(env(safe-area-inset-bottom)+80px))] sm:bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 ${(isWebSearch || isDeepSearch || isVoiceMode || isAudioConvertMode || isDocumentConvert || isFileAnalysis) ? 'sm:mb-[68px]' : 'sm:mb-6'} w-[calc(100%-32px)] sm:w-[220px] bg-white/95 dark:bg-[#1c1c1e]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden z-[1020] backdrop-blur-xl ring-1 ring-black/[0.05]`}
                >
                  <div className="p-2.5 space-y-1">
                    {getAgentCapabilities(activeAgent.agentName, activeAgent.category).canCamera && (
                      <button
                        type="button"
                        onClick={() => {
                          cameraInputRef.current?.click();
                          setIsAttachMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 hover:bg-primary/10 rounded-xl transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                          <Camera className="w-4.5 h-4.5 text-slate-500 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-[14px] font-bold text-slate-700 group-hover:text-primary transition-colors">Camera & Scan</span>
                      </button>
                    )}
                    <label
                      htmlFor="file-upload"
                      onClick={() => setIsAttachMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 hover:bg-primary/10 rounded-xl transition-all group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                        <Paperclip className="w-4.5 h-4.5 text-slate-500 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[14px] font-bold text-slate-700 group-hover:text-primary transition-colors">Upload files</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isToolsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  ref={toolsMenuRef}
                  className={`fixed sm:absolute bottom-[max(80px,calc(env(safe-area-inset-bottom)+80px))] sm:bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 ${(isWebSearch || isDeepSearch || isVoiceMode || isAudioConvertMode || isDocumentConvert || isFileAnalysis) ? 'sm:mb-[68px]' : 'sm:mb-6'} w-[calc(100%-24px)] sm:w-[320px] bg-white dark:bg-[#1c1c1e] border border-slate-200/50 dark:border-white/10 rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] overflow-hidden z-[1020] ring-1 ring-black/[0.05] backdrop-blur-xl`}
                  style={{ maxHeight: 'calc(100vh - 180px)' }}
                >
                  <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shadow-inner">
                        <img src={logo} alt="AI LEGAL™" className="w-8 h-5.5 object-cover object-top" />
                      </div>
                      <div>
                        <h3 className="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                          AI LEGAL Tools
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Advanced Suite</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 pb-12 space-y-1.5 overflow-y-auto scrollbar-hide scroll-smooth will-change-transform" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    {/* Tools are rendered below */}

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkPremiumTool('Web Search')) return;
                        setIsToolsMenuOpen(false);
                        setIsWebSearch(!isWebSearch);
                        setIsDeepSearch(false);
                        setIsAudioConvertMode(false);
                        setIsDocumentConvert(false);
                        if (!isWebSearch) {
                          setActiveTool('web_search');
                          toast.success("Real-Time Web Search Active");
                        } else {
                          setActiveTool(null);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 rounded-3xl transition-all group cursor-pointer border-2 ${isWebSearch ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/5 hover:border-primary/30 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 tool-icon-premium ${isWebSearch ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-zinc-800 border-white dark:border-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                        <Globe className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="aisa-badge-small !bg-primary !text-white !font-black !px-2 !rounded-md">AI LEGAL™</span>
                          <span className="text-[14.5px] font-extrabold text-slate-800 dark:text-white leading-none">Web Search</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Fast and accurate web queries.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkPremiumTool('Precedents Search & Citations')) return;
                        setIsToolsMenuOpen(false);
                        setIsDeepSearch(!isDeepSearch);
                        setIsWebSearch(false);
                        setIsAudioConvertMode(false);
                        setIsDocumentConvert(false);
                        if (!isDeepSearch) {
                          setActiveTool('deep_search');
                          toast.success("Precedents Search & Citations Mode Enabled");
                        } else {
                          setActiveTool(null);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 rounded-3xl transition-all group cursor-pointer border-2 ${isDeepSearch ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/5 hover:border-primary/30 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 tool-icon-premium ${isDeepSearch ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-zinc-800 border-white dark:border-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                        <Search className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="aisa-badge-small !bg-primary !text-white !font-black !px-2 !rounded-md">AI LEGAL™</span>
                          <span className="text-[14.5px] font-extrabold text-slate-800 dark:text-white leading-none">Precedents Search & Citations</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">In-depth analysis and data mining.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkPremiumTool('Convert to Audio')) return;
                        setIsToolsMenuOpen(false);
                        setIsAudioConvertMode(!isAudioConvertMode);
                        setIsDeepSearch(false);
                        setIsWebSearch(false);
                        setIsDocumentConvert(false);
                        if (!isAudioConvertMode) {
                          setActiveTool('audio');
                          toast.success("Convert to Audio Mode Active");
                        } else {
                          setActiveTool(null);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 rounded-3xl transition-all group cursor-pointer border-2 ${isAudioConvertMode ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/5 hover:border-primary/30 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 tool-icon-premium ${isAudioConvertMode ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-zinc-800 border-white dark:border-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                        <Headphones className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="aisa-badge-small !bg-primary !text-white !font-black !px-2 !rounded-md">AI LEGAL™</span>
                          <span className="text-[14.5px] font-extrabold text-slate-800 dark:text-white leading-none">Convert to Audio</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Natural-sounding text-to-speech.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkPremiumTool('Document Converter')) return;
                        setIsToolsMenuOpen(false);
                        const nextState = !isDocumentConvert;
                        setIsDocumentConvert(nextState);
                        setIsFileAnalysis(false);
                        setIsDeepSearch(false);
                        setIsWebSearch(false);
                        setIsAudioConvertMode(false);
                        if (nextState) {
                          setActiveTool('document');
                          uploadInputRef.current?.click();
                          toast.success("Document Converter Mode Active");
                        } else {
                          setActiveTool(null);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 rounded-3xl transition-all group cursor-pointer border-2 ${isDocumentConvert ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/5 hover:border-primary/30 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 tool-icon-premium ${isDocumentConvert ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-zinc-800 border-white dark:border-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                        <FileText className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="aisa-badge-small !bg-primary !text-white !font-black !px-2 !rounded-md">AI LEGAL™</span>
                          <span className="text-[14.5px] font-extrabold text-slate-800 dark:text-white leading-none">Convert Documents</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Format conversion and text extraction.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!checkPremiumTool('AI Legal')) return;
                        setIsToolsMenuOpen(false);

                        const newMode = !activeLegalToolkit;

                        // RESET LOGIC: If we are opening the toolkit, clear sub-states
                        if (newMode) {
                          setCurrentMode(MODES.NORMAL_CHAT);
                          setSelectedLegalTool(null);
                          setLegalView('DASHBOARD');
                        }

                        setActiveLegalToolkit(newMode);
                        setIsDeepSearch(false);
                        setIsAudioConvertMode(false);
                        setIsDocumentConvert(false);
                        if (newMode) {
                          setActiveTool('legal');
                          toast.success("AI Legal™ Enabled ⚖️");
                        } else {
                          setActiveTool(null);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3.5 rounded-3xl transition-all group cursor-pointer border-2 ${activeLegalToolkit ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/5 hover:border-primary/30 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md'}`}
                    >
                      <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 tool-icon-premium ${activeLegalToolkit ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-zinc-800 border-white dark:border-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                        <LegalLogo size={32} showText={true} style={{ color: activeLegalToolkit ? '#fff' : undefined }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="aisa-badge-small !bg-primary !text-white !font-black !px-2 !rounded-md">AI LEGAL™</span>
                          <span className="text-[14.5px] font-extrabold text-slate-800 dark:text-white leading-none">AI Legal™</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{t('aiLegalToolsCount')}</p>
                      </div>
                    </button>



                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-3 shrink-0">
              <div className="relative">
                <motion.button
                  type="button"
                  ref={attachBtnRef}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsAttachMenuOpen(!isAttachMenuOpen);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center bg-slate-50 text-slate-500 hover:text-primary transition-all border border-slate-200/50 shadow-sm relative z-[1003]"
                  title="Attachments"
                >
                  <Plus className={`w-5 h-5 transition-transform duration-300 ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 flex items-center min-w-0 bg-transparent border-0 ring-0 focus:ring-0">
              <AnimatePresence>
                {(isWebSearch || isDeepSearch || isImageGeneration || isVideoGeneration || isVoiceMode || isAudioConvertMode || isDocumentConvert || isCodeWriter || isMagicEditing || isFileAnalysis || isCashFlowMode || currentMode === 'LEGAL_TOOLKIT') && (
                  <div className="absolute bottom-full left-0 mb-3.5 flex flex-row items-center justify-start pointer-events-none z-[100] w-full">
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pointer-events-auto px-2 sm:px-3 py-1 max-w-full">
                      {isCashFlowMode && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsStockModalOpen(true)}
                          className="flex flex-row items-center gap-1.5 sm:gap-2 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-transparent whitespace-nowrap shrink-0 cursor-pointer hover:bg-primary/20 transition-all"
                        >
                          <TrendingUp size={12} strokeWidth={3} /> <span className="hidden sm:inline">AI CashFlow</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCashFlowMode(false);
                              setActiveTool(null);
                            }}
                            className="ml-1 hover:text-primary/80 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                      {isWebSearch && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-row items-center gap-3 px-3.5 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/40 whitespace-nowrap shrink-0 transition-all hover:bg-primary/30 group shadow-[0_8px_32px_-4px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ring-1 ring-white/10"
                        >
                          <div className="absolute inset-x-0 top-0 h-px opacity-50" />
                          <div className="flex flex-row items-center gap-2 relative z-10">
                            <div className="w-5 h-5 rounded-lg bg-primary flex flex-row items-center justify-center shadow-sm shadow-primary/40 text-white">
                              <Globe size={14} strokeWidth={3} />
                            </div>
                            <span className="uppercase tracking-widest text-[9px] font-black">Web Search</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setIsWebSearch(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-primary transition-all hover:rotate-90 relative z-10"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isDeepSearch && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-row items-center gap-3 px-3.5 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/40 whitespace-nowrap shrink-0 transition-all hover:bg-primary/30 group shadow-[0_8px_32px_-4px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ring-1 ring-white/10"
                        >
                          <div className="absolute inset-x-0 top-0 h-px opacity-50" />
                          <div className="flex flex-row items-center gap-2 relative z-10">
                            <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/40 text-white">
                              <Search size={14} strokeWidth={3} />
                            </div>
                            <span className="uppercase tracking-widest text-[9px] font-black">Precedents Search & Citations</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setIsDeepSearch(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-primary transition-all hover:rotate-90 relative z-10"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isImageGeneration && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-row items-center gap-3 px-3.5 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/40 whitespace-nowrap shrink-0 transition-all hover:bg-primary/30 group shadow-[0_8px_32px_-4px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ring-1 ring-white/10"
                        >
                          {/* Glossy Reflection Effect */}
                          <div className="absolute inset-x-0 top-0 h-px opacity-50" />

                          <div className="flex flex-row items-center gap-2 relative z-10">
                            <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/40 text-white">
                              <ImageIcon size={14} strokeWidth={3} />
                            </div>
                            <span className="uppercase tracking-widest text-[9px] font-black">Image Gen</span>
                          </div>

                          <div className="w-[1px] h-3 bg-primary/40 mx-0.5 relative z-10" />

                          <button
                            type="button"
                            onClick={() => setIsMagicSettingsOpen(!isMagicSettingsOpen)}
                            className="flex flex-row items-center gap-1.5 hover:text-primary transition-all px-1.5 py-0.5 rounded-md hover: relative z-10"
                          >
                            <span className="text-[10px] font-extrabold opacity-90">{imageAspectRatio}</span>
                            <span className="text-[10px] font-black truncate max-w-[60px] sm:max-w-[100px] tracking-tight">
                              {TOOL_PRICING.image.models.find(m => m.id === imageModelId)?.name.replace('AI LEGAL™ ', '') || 'Model'}

                            </span>
                            <ChevronDown size={11} className={`transition-transform duration-300 ${isMagicSettingsOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => { setIsImageGeneration(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-primary transition-all hover:rotate-90 relative z-10"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isVideoGeneration && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-row items-center gap-3 px-3.5 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/40 whitespace-nowrap shrink-0 transition-all hover:bg-primary/30 group shadow-[0_8px_32px_-4px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ring-1 ring-white/10"
                        >
                          <div className="absolute inset-x-0 top-0 h-px opacity-50" />

                          <div className="flex flex-row items-center gap-2 relative z-10">
                            <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/40 text-white">
                              <Video size={14} strokeWidth={3} />
                            </div>
                            <span className="uppercase tracking-widest text-[9px] font-black">Video Gen</span>
                          </div>

                          <div className="w-[1px] h-3 bg-primary/40 mx-0.5 relative z-10" />

                          <button
                            type="button"
                            onClick={() => setIsMagicSettingsOpen(!isMagicSettingsOpen)}
                            className="flex flex-row items-center gap-1.5 hover:text-primary transition-all px-1.5 py-0.5 rounded-md hover: relative z-10"
                          >
                            <span className="text-[10px] font-extrabold opacity-90">{videoAspectRatio || 'D'}</span>
                            <span className="text-[10px] font-black tracking-tight ml-1">{videoResolution}</span>
                            <ChevronDown size={11} className={`transition-transform duration-300 ${isMagicSettingsOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => { setIsVideoGeneration(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-primary transition-all hover:rotate-90 relative z-10"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isVoiceMode && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex flex-row items-center gap-2.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/30 whitespace-nowrap shrink-0 transition-all hover:bg-primary/15 group shadow-sm shadow-primary/10"
                        >
                          <div className="flex flex-row items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Volume2 size={14} strokeWidth={2.5} />
                            </div>
                            <span className="uppercase tracking-wide text-[10px] font-black">Voice Mode</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setIsVoiceMode(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary transition-all hover:rotate-90"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isAudioConvertMode && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex flex-row items-center gap-2.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/30 whitespace-nowrap shrink-0 transition-all hover:bg-primary/15 group shadow-sm shadow-primary/10"
                        >
                          <div className="flex flex-row items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Headphones size={14} strokeWidth={2.5} />
                            </div>
                            <span className="uppercase tracking-wide text-[10px] font-black">Audio Convert</span>
                          </div>
                          <button type="button" onClick={() => setIsVoiceSettingsOpen(true)} className="ml-1 w-5 h-5 rounded-lg flex items-center justify-center hover:bg-primary/20 text-subtext hover:text-primary transition-colors" title="Voice Settings">
                            <Sliders size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsAudioConvertMode(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary transition-all hover:rotate-90"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isDocumentConvert && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-transparent whitespace-nowrap shrink-0">
                          <FileText size={12} strokeWidth={3} /> <span>Doc Convert</span>
                          <button onClick={() => { setIsDocumentConvert(false); setActiveTool(null); }} className="ml-1 hover:text-primary/80"><X size={12} /></button>
                        </motion.div>
                      )}
                      {isCodeWriter && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-transparent whitespace-nowrap shrink-0">
                          <Code size={12} strokeWidth={3} /> <span>Draft Maker</span>
                          <button onClick={() => { setIsCodeWriter(false); setActiveTool(null); }} className="ml-1 hover:text-primary/80"><X size={12} /></button>
                        </motion.div>
                      )}



                      {currentCase && currentCase.isLegalCase && selectedLegalTool?.id === 'legal_my_case' && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("[Chat] Opening Case Intelligence Panel");
                            setIsCasePanelOpen(true);
                            if (legalView !== 'CHAT') setLegalView('CHAT');
                          }}
                          className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-[9px] sm:text-xs font-bold shadow-lg shadow-primary/30 cursor-pointer hover:scale-105 active:scale-95 transition-all whitespace-nowrap shrink-0 group"
                        >
                          <Briefcase size={12} className="sm:w-[14px] sm:h-[14px] group-hover:rotate-12 transition-transform" />
                          <div className="flex flex-col items-start leading-none gap-0.5">
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-80">ACTIVE CASE</span>
                            <span className="text-[9px] sm:text-[10px] font-bold truncate max-w-[60px] sm:max-w-[100px]">{currentCase?.clientName || 'Untitled Case'}</span>
                          </div>
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400 animate-pulse ml-0.5 sm:ml-1" />
                          <LayoutDashboard size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      )}
                      {isMagicEditing && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-row items-center gap-3 px-3.5 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/40 whitespace-nowrap shrink-0 transition-all hover:bg-primary/30 group shadow-[0_8px_32px_-4px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ring-1 ring-white/10"
                        >
                          <div className="absolute inset-x-0 top-0 h-px opacity-50" />

                          <div className="flex flex-row items-center gap-2 relative z-10">
                            <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/40 text-white">
                              <Wand2 size={14} strokeWidth={3} />
                            </div>
                            <span className="uppercase tracking-widest text-[9px] font-black hidden xs:inline">{t('imageEdit')}</span>
                          </div>

                          <div className="w-[1px] h-3 bg-primary/40 mx-0.5 relative z-10" />

                          <button
                            type="button"
                            onClick={() => setIsMagicSettingsOpen(!isMagicSettingsOpen)}
                            className="flex flex-row items-center gap-1.5 hover:text-primary transition-all px-1.5 py-0.5 rounded-md hover: relative z-10"
                          >
                            <span className="text-[10px] font-extrabold opacity-90">{imageAspectRatio}</span>
                            <span className="text-[10px] font-black truncate max-w-[60px] sm:max-w-[100px] tracking-tight">
                              {TOOL_PRICING.image.models.find(m => m.id === imageModelId)?.name.replace('AI LEGAL™ ', '') || 'Model'}
                            </span>
                            <ChevronDown size={11} className={`transition-transform duration-300 ${isMagicSettingsOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => { setIsMagicEditing(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-primary transition-all hover:rotate-90 relative z-10"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                      {isFileAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex flex-row items-center gap-2.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/30 whitespace-nowrap shrink-0 transition-all hover:bg-primary/15 group shadow-sm shadow-primary/10"
                        >
                          <div className="flex flex-row items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                              <FileText size={14} strokeWidth={2.5} />
                            </div>
                            <span className="uppercase tracking-wide text-[10px] font-black">{t('analyzeDocument')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setIsFileAnalysis(false); setActiveTool(null); }}
                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary transition-all hover:rotate-90"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </AnimatePresence>



              <textarea
                id="chat-input"
                ref={inputRef}
                value={inputValue}
                disabled={gen.isGenerating || isLimitReached}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) setIsAutoPreviewDisabled(false);
                  const lineCount = val.split('\n').length;

                  // Threshold: 400 chars or 9 lines (more than 8)
                  if (!isAutoPreviewDisabled && (lineCount > 8 || val.length > 400)) {
                    setLongTextPreview(val);
                    setInputValue('');
                  } else {
                    setInputValue(val);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  const lineCount = pastedText.split('\n').length;

                  // Threshold: 400 chars or 9 lines (more than 8)
                  if (lineCount > 8 || pastedText.length > 400) {
                    e.preventDefault();
                    setLongTextPreview(pastedText);
                    setInputValue('');
                    setIsAutoPreviewDisabled(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (gen.isGenerating) return;
                    if (inputValue.trim() || selectedFiles.length > 0 || longTextPreview) {
                      handleSendMessage(e);
                    }
                  }
                }}
                placeholder={isLimitReached ? t('limitReached') || "Chat limit reached. Sign in to continue." : (window.innerWidth < 768 ? "Ask anything..." : (() => {
                  const activeToolId = selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool');
                  const details = getToolDetails(activeToolId, selectedRole);
                  return details.placeholder || typedPlaceholder;
                })())}
                rows={1}
                className={`w-full bg-transparent border-0 focus:ring-0 outline-none focus:outline-none px-1 pt-2.5 pb-0 sm:px-3 sm:py-2 text-slate-800 dark:text-zinc-100 text-left placeholder-slate-400 dark:placeholder-zinc-500 resize-none overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] font-normal leading-normal text-[15px] sm:text-[16px] ${isLimitReached ? 'cursor-not-allowed opacity-50' : ''}`}
                style={{ minHeight: '38px', height: '38px', maxHeight: '140px' }}
              />
            </div>

            {/* Right Actions Group */}
            <div className="flex items-center gap-[4px] sm:gap-[6px] pr-[2px] shrink-0">
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20 mr-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-600 uppercase">{t('rec')}</span>
                </div>
              )}

              {!isListening && !inputValue && (
                <>
                  {getAgentCapabilities(activeAgent.agentName, activeAgent.category).canVoice && (
                    <div className="relative">

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          handleVoiceInput();
                        }}
                        className="w-[32px] h-[32px] rounded-full flex items-center justify-center bg-white text-slate-500 hover:text-primary transition-all shadow-sm border border-slate-200 relative overflow-visible z-20"
                        title={t('voiceInput')}
                      >
                        <Mic className={`w-[18px] h-[18px] shrink-0 transition-colors`} />
                      </motion.button>
                    </div>
                  )}
                </>
              )}

              {gen.isGenerating ? (
                <button
                  type="button"
                  onClick={() => {
                    // Abort via global store (handles multi-chat abort safely)
                    gen.abort();
                    if (abortControllerRef.current) abortControllerRef.current.abort();
                    setIsLoading(false);
                    const chatLock = getSessionLock(activeSessionId);
                    chatLock.locked = false;
                  }}
                  className="w-[32px] h-[32px] sm:w-[34px] sm:h-[34px] rounded-full text-[#111111] bg-[#C8A34D] hover:bg-[#b08d3b] flex items-center justify-center shadow-md hover:scale-105 transition-all cursor-pointer shrink-0"
                  title="Stop generating"
                >
                  <div className="w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] bg-[#111111] rounded-xs" />
                </button>
              ) : (
                <div className="flex items-center gap-[6px] relative">
                  <AnimatePresence>
                  </AnimatePresence>
                  <motion.button
                    type="submit"
                    disabled={gen.isGenerating || (!inputValue.trim() && filePreviews.length === 0 && !longTextPreview)}
                    onMouseEnter={() => setIsSendHovered(true)}
                    onMouseLeave={() => setIsSendHovered(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={t('send')}
                    className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition-all shadow-md relative overflow-visible z-20 text-[#111111] bg-[#C8A34D] hover:bg-[#b08d3b] disabled:bg-slate-200 disabled:text-slate-400`}
                  >
                    <AnimatePresence>
                      {ripples.map(id => (
                        <SendRipple key={id} onComplete={() => setRipples(r => r.filter(i => i !== id))} />
                      ))}
                    </AnimatePresence>
                    <motion.div
                      animate={isLaunching ? {
                        y: [0, -120],
                        scale: [1, 2.8, 0],
                        opacity: [1, 0.4, 0],
                        rotate: [0, 720],
                        filter: ["blur(0px)", "blur(30px)"]
                      } : { y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.8, ease: "anticipate" }}
                      className="relative z-10"
                    >
                      <SendHorizontal
                        className="w-[18px] h-[18px] sm:w-5 sm:h-5 transition-all duration-300"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  };

  const showWelcomeScreen = messages.length === 0 && !isSessionLoading && !isHydrating && !activeCaseId && location.pathname !== '/dashboard/cases' && !location.pathname.startsWith('/dashboard/case/') && !location.pathname.startsWith('/dashboard/cases/') && !currentCase && (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') && currentMode !== 'LEGAL_TOOLKIT' && !activeLegalToolkit && !selectedLegalTool && !new URLSearchParams(window.location.search).get('tool');

  return (
    <div className="flex w-full bg-transparent relative overflow-hidden aisa-scalable-text h-full">
      {showFloatingNavbar && <GlobalFloatingNavbar />}
      {/* Redundant background removed to prevent flicker - using global layout background */}


      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfig.isOpen}
        title={deleteConfig.title}
        description={deleteConfig.description}
        onClose={() => setDeleteConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          deleteConfig.onConfirm();
          setDeleteConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-4xl h-full max-h-[80vh] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-border"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-maintext truncate max-w-md">{viewingDoc.name}</h3>
                    <p className="text-xs text-subtext">
                      {viewingDoc.type === 'image' || viewingDoc.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
                        ? 'Image Preview'
                        : 'File Preview'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(viewingDoc.type === 'image' || viewingDoc.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || viewingDoc.url?.startsWith('data:image/')) && (
                    <button
                      onClick={() => handleCopyImage(viewingDoc.url)}
                      className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-subtext"
                      title="Copy Image"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(viewingDoc.url, viewingDoc.name)}
                    className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-subtext"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-subtext"
                    title="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                {viewingDoc.type === 'image' || viewingDoc.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || viewingDoc.url.startsWith('data:image/') ? (
                  <ImageViewer
                    src={viewingDoc.url}
                    alt="Preview"
                  />
                ) : viewingDoc.name.match(/\.(docx|doc)$/i) ? (
                  <div
                    ref={docContainerRef}
                    className="bg-gray-100 w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-8"
                  />
                ) : viewingDoc.name.match(/\.(xls|xlsx|csv)$/i) ? (
                  <div
                    className="bg-white w-full h-full overflow-auto p-4 custom-scrollbar text-black text-sm"
                    dangerouslySetInnerHTML={{ __html: excelHTML || '<div class="flex items-center justify-center h-full"><div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>' }}
                  />
                ) : viewingDoc.name.endsWith('.pdf') || viewingDoc.url.startsWith('data:application/pdf') ? (
                  <iframe
                    src={viewingDoc.url}
                    className="w-full h-full border-0"
                    title="Document Viewer"
                  />
                ) : viewingDoc.name.match(/\.(mp4|webm|ogg|mov)$/i) || viewingDoc.type.startsWith('video/') ? (
                  <video controls className="max-w-full max-h-full rounded-lg shadow-sm" src={viewingDoc.url}>
                    Your browser does not support the video tag.
                  </video>
                ) : viewingDoc.name.match(/\.(mp3|wav|ogg|m4a)$/i) || viewingDoc.type.startsWith('audio/') ? (
                  <div className="p-10 bg-surface rounded-2xl flex flex-col items-center gap-6 shadow-sm border border-border">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse-slow">
                      <div className="w-12 h-12 border-2 border-primary rounded-full flex items-center justify-center">
                        <Mic className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-1">{viewingDoc.name}</h3>
                      <p className="text-xs text-subtext">Audio File Player</p>
                    </div>
                    <audio controls className="w-full min-w-[300px]" src={viewingDoc.url}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#1e1e1e] p-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-transparent shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#cccccc] uppercase tracking-wider">
                          {viewingDoc.name.match(/\.(rar|zip|exe|dll|bin|iso|7z)$/i) ? 'BINARY CONTENT' : 'CODE READER'}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#0e639c] text-white font-mono shadow-sm">
                        {viewingDoc.name.split('.').pop().toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-4">
                      <code className="text-xs font-mono whitespace-pre-wrap text-[#9cdcfe] break-all leading-relaxed tab-4 block">
                        {textPreview || "Reading file stream..."}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        toolType={selectedToolType}
        currentModel={selectedToolType ? toolModels[selectedToolType] : 'gemini-flash'}
        onSelectModel={handleModelSelect}
        pricing={TOOL_PRICING}
      />



      {/* SideBar is managed by NavigationProvider / DashboardLayout */}

      {/* Main Area */}
      {/* Main Area Selection Toolbar (Non-wrapping to prevent re-render selection loss) */}
      <SelectionToolbarProvider onAiAction={handleSelectionAiAction} />

      <div
        className="flex-1 flex flex-col relative bg-transparent w-full min-w-0 pt-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none">
            <Cloud className="w-16 h-16 text-primary mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-primary">Drop to Upload</h3>
          </div>
        )}







        {/* <button className="flex items-center gap-2 text-subtext hover:text-maintext text-sm">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Device</span>
            </button> */}



        {/* Messages */}
        {(() => {
          const renderChatStream = () => (
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className={`relative flex-1 aisa-scalable-text chatgpt-container z-20 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent ${((currentMode === 'LEGAL_TOOLKIT' && !showFloatingNavbar) || location.pathname === '/dashboard/cases') ? 'no-top-padding' : ''} ${(((legalView === 'DASHBOARD' || legalView === 'PRECEDENTS') && currentMode === 'LEGAL_TOOLKIT') || location.pathname === '/dashboard/cases')
                ? 'z-[30] h-full w-full overflow-hidden flex flex-col bg-slate-50 min-h-0'
                : 'overflow-y-auto pt-4 pb-6'
                }`}
              style={{
                overflowY: (((legalView === 'DASHBOARD' || legalView === 'PRECEDENTS') && currentMode === 'LEGAL_TOOLKIT') || location.pathname === '/dashboard/cases') ? 'hidden' : 'auto',
                height: '100%',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                WebkitOverflowScrolling: 'touch',
                minHeight: 0
              }}
            >
              <AnimatePresence mode="wait">
                {legalView === 'PRECEDENTS' && currentMode === 'LEGAL_TOOLKIT' ? (
                  <motion.div
                    key="legal-precedents"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col w-full h-full min-h-0"
                  >
                    <LegalPrecedents
                      projectId={currentCase?._id}
                      onBack={handleLegalPrecedentsBack}
                      cases={legalCases}
                      onSelectCase={(c) => {
                        setCurrentProjectId(c._id);
                        setCurrentCase(c);
                      }}
                      onUpdateCase={(updated) => {
                        setCurrentCase(updated);
                        setAllProjects(prev => prev.map(c => c._id === updated._id ? updated : c));
                      }}
                      onCreateCase={() => setIsNewCaseModalOpen(true)}
                      onUseInArgument={handleUseInArgument}
                    />
                  </motion.div>
                ) : (location.pathname === '/dashboard/cases' || (legalView === 'DASHBOARD' && currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case')) ? (
                  <motion.div
                    key="legal-dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col w-full select-text min-h-0"
                  >
                    {renderCaseDashboard()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="legal-workspace"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col w-full select-text"
                  >
                    {/* 🚀 MINI STICKY CASE BREADCRUMB (Lightweight & Non-obstructive) */}
                    <AnimatePresence>
                      {!isHeaderVisible && currentMode === 'LEGAL_TOOLKIT' && currentCase && (
                        <motion.div
                          initial={{ y: -20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="fixed top-4 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-2 px-4 py-1.5 bg-white/90 border border-slate-200 rounded-full shadow-sm pointer-events-none sm:pointer-events-auto"
                        >
                          <Briefcase size={12} className="text-indigo-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[150px]">
                            {currentCase.name}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                            {activeTool || 'AI Legal'}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {isSessionLoading ? (
                      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Loading Session...</span>
                        </div>
                      </div>
                    ) : messages.length > 0 && (
                      <>
                        {messages.map((msg, idx) => {
                          const isMediaFeature = msg.mode === MODES.IMAGE_GENERATION ||
                            msg.mode === MODES.VIDEO_GENERATION ||
                            msg.mode === MODES.IMAGE_EDIT ||
                            !!msg.imageUrl || !!msg.videoUrl;

                          if (msg.isSystemLog) {
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 px-5 py-2.5 my-6 bg-slate-50 border border-slate-200 rounded-2xl w-fit mx-auto shadow-sm"
                              >
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                  <Zap size={14} className="text-indigo-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                  {msg.content.replace(/\*/g, '')}
                                </span>
                              </motion.div>
                            );
                          }
                          return (
                            <div
                              key={msg.id}
                              data-message-id={msg.id}
                              className={`chatgpt-message-row group ${msg.role === 'user' ? 'user-row mb-0 sm:mb-6' : 'ai-row mb-0 sm:mb-8'} ${idx === 0 ? 'mt-1 lg:mt-2' : ''}`}
                              onClick={(e) => {
                                // Don't toggle if text was selected
                                const selectionText = window.getSelection().toString();
                                if (selectionText && selectionText.length > 0) return;

                                // Prevent toggle if clicking near the toolbar or interacting with it
                                if (e.target.closest('.selection-toolbar-container')) return;

                                setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                              }}
                            >
                              {/* Actions Menu (Always visible for discoverability) */}

                              <div className="chatgpt-message-content select-text">
                                {/* Avatar */}
                                {msg.role === 'user' && (
                                  <div
                                    className="chatgpt-avatar-container w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                  </div>
                                )}

                                <div className="flex-1 min-w-0 chatgpt-text select-text">
                                  {/* Attachment Display */}
                                  {((msg.attachments && msg.attachments.length > 0) || msg.attachment) && (
                                    <div className="flex flex-col gap-3 mb-3 mt-1">
                                      {(msg.attachments || (msg.attachment ? [msg.attachment] : [])).map((att, idx) => (
                                        <div key={idx} className="w-full">
                                          {att.type === 'image' ? (
                                            <div
                                              className="relative group/image overflow-hidden rounded-xl border border-white/20 shadow-sm transition-all hover:scale-[1.01] cursor-pointer max-w-[320px]"
                                              onClick={() => setViewingDoc(att)}
                                            >
                                              <img
                                                src={att.url}
                                                alt="Attachment"
                                                className="w-full h-auto max-h-[400px] object-contain bg-black/5"
                                                loading="lazy"
                                                onError={(e) => {
                                                  console.error("Attachment image load failed:", att.url);
                                                  if (att.url && !e.target.dataset.retried) {
                                                    e.target.dataset.retried = "true";
                                                    const isSignedUrl = att.url?.includes('X-Goog-Signature');
                                                    const retryUrl = isSignedUrl
                                                      ? att.url
                                                      : att.url + (att.url.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                                                    console.log("Retrying attachment image load:", retryUrl);
                                                    e.target.src = retryUrl;
                                                  } else {
                                                    const errorText = att.url ? (att.url.substring(0, 30) + '...') : 'Unknown URL';
                                                    e.target.src = `https://placehold.co/600x400/333/eee?text=Attachment+Unavailable%0A${encodeURIComponent(errorText)}%0AClick+to+Retry`;
                                                    e.target.style.cursor = 'pointer';
                                                    e.target.onclick = (event) => {
                                                      event.stopPropagation();
                                                      const isSignedUrl = att.url?.includes('X-Goog-Signature');
                                                      e.target.src = isSignedUrl ? att.url : att.url + (att.url.includes('?') ? '&' : '?') + 'manual=' + Date.now();
                                                    };
                                                  }
                                                }}
                                              />
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDownload(att.url, att.name);
                                                }}
                                                className="absolute top-2 right-2 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-all hover:bg-black/60 border border-white/10 flex items-center justify-center"
                                                title="Download"
                                              >
                                                <Download className="w-4 h-4" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors backdrop-blur-md ${msg.role === 'user' ? 'bg-transparent border-white/20 hover:bg-white/10 shadow-none' : 'bg-secondary/30 border-border hover:bg-secondary/50'}`}>
                                              <div
                                                className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer p-0.5 rounded-lg"
                                                onClick={() => setViewingDoc(att)}
                                              >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${(() => {
                                                  const name = (att.name || '').toLowerCase();
                                                  if (msg.role === 'user') return 'bg-white shadow-sm';
                                                  if (name.endsWith('.pdf')) return 'bg-red-50 dark:bg-red-900/20';
                                                  if (name.match(/\.(doc|docx)$/)) return 'bg-blue-50 dark:bg-blue-900/20';
                                                  if (name.match(/\.(xls|xlsx|csv)$/)) return 'bg-emerald-50 dark:bg-emerald-900/20';
                                                  if (name.match(/\.(ppt|pptx)$/)) return 'bg-blue-50 dark:bg-blue-900/20';
                                                  return 'bg-secondary';
                                                })()}`}>
                                                  {(() => {
                                                    const name = (att.name || '').toLowerCase();
                                                    const baseClass = "w-6 h-6";
                                                    if (name.match(/\.(xls|xlsx|csv)$/)) return <FileSpreadsheet className={`${baseClass} text-emerald-600`} />;
                                                    if (name.match(/\.(ppt|pptx)$/)) return <Presentation className={`${baseClass} text-blue-600`} />;
                                                    if (name.endsWith('.pdf')) return <FileText className={`${baseClass} text-red-600`} />;
                                                    if (name.match(/\.(doc|docx)$/)) return <FileIcon className={`${baseClass} text-blue-600`} />;
                                                    return <FileIcon className={`${baseClass} text-primary`} />;
                                                  })()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-semibold truncate text-xs mb-0.5">{att.name || 'File'}</p>
                                                  <p className="text-[10px] opacity-70 uppercase tracking-tight font-medium">
                                                    {(() => {
                                                      const name = (att.name || '').toLowerCase();
                                                      if (name.endsWith('.pdf')) return 'PDF • Preview';
                                                      if (name.match(/\.(doc|docx)$/)) return 'WORD • Preview';
                                                      if (name.match(/\.(xls|xlsx|csv)$/)) return 'EXCEL';
                                                      if (name.match(/\.(ppt|pptx)$/)) return 'SLIDES';
                                                      return 'DOCUMENT';
                                                    })()}
                                                  </p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDownload(att.url, att.name);
                                                }}
                                                className={`p-2 rounded-lg transition-colors shrink-0 ${msg.role === 'user' ? 'hover:bg-white/20 text-white' : 'hover:bg-primary/10 text-primary'}`}
                                                title="Download"
                                              >
                                                <Download className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}






                                  {editingMessageId === msg.id ? (
                                    <div className="flex flex-col gap-3 min-w-[200px] w-full mt-2">
                                      <textarea
                                        ref={(el) => {
                                          if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = `${el.scrollHeight}px`;
                                          }
                                        }}
                                        value={editContent}
                                        onChange={(e) => {
                                          setEditContent(e.target.value);
                                          e.target.style.height = 'auto';
                                          e.target.style.height = `${e.target.scrollHeight}px`;
                                        }}
                                        className="w-full bg-slate-50 text-slate-900 rounded-2xl p-4 text-[15px] focus:outline-none border border-slate-200 placeholder-slate-400 min-h-[56px] max-h-[400px] leading-relaxed resize-none shadow-sm transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10 overflow-y-auto scrollbar-thin"
                                        rows={1}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            saveEdit(msg);
                                          }
                                          if (e.key === 'Escape') cancelEdit();
                                        }}
                                      />
                                      <div className="flex gap-3 justify-end items-center">
                                        <button
                                          onClick={cancelEdit}
                                          className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => saveEdit(msg)}
                                          className="bg-primary text-white px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-sm"
                                        >
                                          Update
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    (msg.content || (msg.id === typingMessageId)) && (
                                      <div id={`msg-text-${msg.id}`} className={`chat-bubble-text break-words overflow-wrap-anywhere ${msg.role === 'model' ? 'prose prose-sm max-w-none' : ''}`}>








                                        {/* [READ MORE LOGIC]: For long messages, we show a truncate and read more option */}
                                        <div className="relative group/msg-content">
                                          {msg.id === typingMessageId && !msg.content ? (
                                            <AisaTypingIndicator visible={true} message={getToolTypingMessage(msg.activeTool || selectedLegalTool?.id || loadingText)} />
                                          ) : (
                                            <div className="flex flex-col">
                                              <div className="collapsible-container">
                                                <ReactMarkdown
                                                  className="select-text"
                                                  remarkPlugins={[remarkGfm]}
                                                  urlTransform={(value) => value}
                                                  components={{
                                                    a: ({ href, children }) => {
                                                      const text = children?.toString() || "";
                                                      if (href && href.startsWith('action:')) {
                                                        const isLocked = text.includes('🔒') || text.includes('Unlock');

                                                        if (text.startsWith('ActionCard|')) {
                                                          const parts = text.split('|');
                                                          const title = parts[1] || "";
                                                          const desc = parts[2] || "";
                                                          const actionLabel = (parts[3] || "Open").replace(/^Action:\s*/i, '');

                                                          return (
                                                            <ActionCard
                                                              title={title}
                                                              desc={desc}
                                                              action={actionLabel}
                                                              link={href}
                                                              isLocked={isLocked}
                                                              onClick={(e) => {
                                                                e.preventDefault();
                                                                const toolKey = href.replace('action:', '');
                                                                setCurrentMode('LEGAL_TOOLKIT');

                                                                const TOOL_NAMES = {
                                                                  legal_draft_maker: "Draft Maker",
                                                                  legal_case_predictor: "Case Predictor",
                                                                  legal_argument_builder: "Argument Builder",
                                                                  legal_evidence_checker: "Evidence Analyst",
                                                                  legal_contract_analyzer: "Contract Analyzer",
                                                                  legal_strategy_engine: "Strategy Engine"
                                                                };
                                                                const toolName = TOOL_NAMES[toolKey] || toolKey;

                                                                if (isLocked) {
                                                                  window.dispatchEvent(new CustomEvent('premium_required', { detail: { toolName } }));
                                                                  return;
                                                                }

                                                                activateToolWithTypingEffect(toolKey, toolName);
                                                              }}
                                                            />
                                                          );
                                                        }

                                                        return (
                                                          <button
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              const toolKey = href.replace('action:', '');
                                                              setCurrentMode('LEGAL_TOOLKIT');

                                                              const TOOL_NAMES = {
                                                                legal_draft_maker: "Draft Maker",
                                                                legal_case_predictor: "Case Predictor",
                                                                legal_argument_builder: "Argument Builder",
                                                                legal_evidence_checker: "Evidence Analyst",
                                                                legal_contract_analyzer: "Contract Analyzer",
                                                                legal_strategy_engine: "Strategy Engine"
                                                              };
                                                              const toolName = TOOL_NAMES[toolKey] || toolKey;

                                                              // Open the premium upsell if locked
                                                              if (isLocked) {
                                                                window.dispatchEvent(new CustomEvent('premium_required', { detail: { toolName } }));
                                                                return;
                                                              }

                                                              activateToolWithTypingEffect(toolKey, toolName);
                                                            }}
                                                            className={`inline-flex mt-2 items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${isLocked ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' : 'bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40'}`}
                                                          >
                                                            {children}
                                                            <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
                                                          </button>
                                                        );
                                                      }
                                                      const isInternal = href && href.startsWith('/');
                                                      return (
                                                        <a
                                                          href={href}
                                                          onClick={(e) => {
                                                            if (isInternal) {
                                                              e.preventDefault();
                                                              navigate(href);
                                                            }
                                                          }}
                                                          className="text-primary hover:underline font-bold cursor-pointer"
                                                          target={isInternal ? "_self" : "_blank"}
                                                          rel={isInternal ? "" : "noopener noreferrer"}
                                                        >
                                                          {children}
                                                        </a>
                                                      );
                                                    },
                                                    p: ({ children }) => <p>{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
                                                    li: ({ children }) => <li>{children}</li>,
                                                    h1: ({ children }) => <h1 className="font-bold tracking-tight">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="font-bold tracking-tight">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="font-bold tracking-tight">{children}</h3>,
                                                    strong: ({ children }) => <strong>{children}</strong>,
                                                    table: ({ children }) => (
                                                      <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-sm bg-surface/30">
                                                        <table className="w-full border-collapse text-sm">{children}</table>
                                                      </div>
                                                    ),
                                                    thead: ({ children }) => <thead className="bg-primary/10 border-b border-border/50">{children}</thead>,
                                                    tbody: ({ children }) => <tbody className="divide-y divide-border/30">{children}</tbody>,
                                                    tr: ({ children }) => <tr className="transition-colors hover:bg-white/3">{children}</tr>,
                                                    th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-primary">{children}</th>,
                                                    td: ({ children }) => <td className="px-4 py-3 text-sm text-maintext leading-relaxed">{children}</td>,
                                                    mark: ({ children }) => <mark className="bg-[#5555ff] text-white px-1 py-0.5 rounded-sm">{children}</mark>,
                                                    code: ({ node, inline, className, children, ...props }) => {
                                                      const match = /language-(\w+)/.exec(className || '');
                                                      const lang = match ? match[1] : '';
                                                      const codeValue = String(children).replace(/\n$/, '');
                                                      const isUser = msg.role === 'user';

                                                      if (!inline) {
                                                        return (
                                                          <div className={`rounded-xl overflow-hidden my-3 border ${isUser ? 'border-white/10 bg-[#282a36]/50' : 'border-[#191a21] bg-[#282a36]'} shadow-2xl w-full max-w-full group/code`}>
                                                            {!isUser && (
                                                              <div className="flex items-center justify-between px-4 py-3 bg-[#21222c] border-b border-[#191a21]">
                                                                <div className="flex items-center gap-2">
                                                                  <div className="flex items-center gap-1.5 mr-2">
                                                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                                                  </div>
                                                                  <span className="text-[10px] font-black uppercase tracking-widest text-[#6272a4]">{lang || 'plain text'}</span>
                                                                </div>
                                                                <button
                                                                  onClick={() => {
                                                                    copyText(codeValue);
                                                                    toast.success("Code copied!");
                                                                  }}
                                                                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#6272a4] hover:text-[#f8f8f2] transition-all bg-white/5 hover: px-3 py-1 rounded-lg border border-transparent hover:border-white/10 active:scale-95"
                                                                >
                                                                  <Copy className="w-3.5 h-3.5" />
                                                                  Copy
                                                                </button>
                                                              </div>
                                                            )}
                                                            <div className={`w-full ${isUser ? 'bg-transparent' : 'bg-[#282a36]'}`}>
                                                              <SyntaxHighlighter
                                                                className="custom-scrollbar"
                                                                language={lang || 'text'}
                                                                style={highlighterTheme}
                                                                PreTag="div"
                                                                customStyle={{
                                                                  margin: 0,
                                                                  padding: isUser ? '16px' : '20px',
                                                                  fontSize: isUser ? '13px' : '14px',
                                                                  lineHeight: '1.7',
                                                                  background: 'transparent',
                                                                  borderRadius: 0,
                                                                  border: 'none',
                                                                  color: '#f8f8f2',
                                                                  fontFamily: '"Fira Code", "JetBrains Mono", source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
                                                                  overflowX: 'auto',
                                                                  overflowY: 'auto',
                                                                  maxHeight: isUser ? '500px' : '600px',
                                                                  WebkitOverflowScrolling: 'touch'
                                                                }}
                                                                codeTagProps={{
                                                                  style: {
                                                                    fontFamily: 'inherit',
                                                                    background: 'transparent',
                                                                    color: 'inherit',
                                                                    display: 'block',
                                                                    minWidth: 'max-content'
                                                                  }
                                                                }}
                                                                {...props}
                                                              >
                                                                {codeValue}
                                                              </SyntaxHighlighter>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                      return (
                                                        <code className="px-1.5 py-0.5 rounded-md font-mono text-primary font-bold mx-0.5 text-xs translate-y-[-1px] inline-block" {...props}>
                                                          {children}
                                                        </code>
                                                      );
                                                    },
                                                    img: ({ node, ...props }) => {
                                                      const isDownloading = isDownloadingUrl === props.src;
                                                      return (
                                                        <div className="relative my-4 group/img-container max-w-full">
                                                          <div className="relative group/image overflow-hidden aspect-auto max-w-[500px] cursor-zoom-in w-fit" onClick={() => setViewingDoc({ url: props.src, type: 'image', name: 'AI Image' })}>
                                                            {msg.role === 'model' && (
                                                              <div className="absolute top-0 left-0 right-0 p-3 z-10 flex justify-between items-center opacity-100 sm:opacity-0 sm:group-hover/img-container:opacity-100 transition-opacity duration-500 ease-in-out">
                                                                <div className="flex items-center gap-2">
                                                                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                                                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI LEGAL™ Generated Asset</span>
                                                                </div>
                                                              </div>
                                                            )}
                                                            <ImageViewer
                                                              src={props.src}
                                                              alt={props.alt || "AI Image"}
                                                            />
                                                            <div className="absolute inset-0 opacity-0 group-hover/img-container:opacity-100 transition-opacity duration-500 ease-in-out pointer-events-none" />
                                                          </div>
                                                          <button
                                                            onClick={() => handleDownload(props.src, `AI LEGAL™_gen_${Date.now()}.png`)}
                                                            disabled={isDownloading}
                                                            className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2 hover: rounded-xl border border-white/20 text-white shadow-sm transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50"
                                                          >
                                                            <div className="flex items-center gap-2">
                                                              {isDownloading ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                              ) : (
                                                                <Download className="w-4 h-4" />
                                                              )}
                                                              <span className="text-[10px] font-bold uppercase">
                                                                {isDownloading ? 'Downloading...' : 'Download'}
                                                              </span>
                                                            </div>
                                                          </button>
                                                        </div>
                                                      )
                                                    },
                                                  }}
                                                >
                                                  {transformLegalActions(msg.content || msg.text || "")}
                                                </ReactMarkdown>
                                              </div>


                                            </div>
                                          )}
                                          {msg.cashflowData && (
                                            <React.Suspense fallback={<div className="h-48 w-full bg-surface-hover animate-pulse rounded-xl" />}>

                                            </React.Suspense>
                                          )}
                                        </div>
                                        {/* Sources List (ONLY for Web Search, HIDE for RAG as requested) */}
                                        {msg.role === 'model' && msg.isRealTime && msg.sources && msg.sources.length > 0 && (
                                          <div className="mt-4 pt-4">
                                            <p className="text-[10px] font-bold uppercase text-subtext mb-3 flex items-center gap-2">
                                              <ExternalLink className="w-3 h-3" />
                                              Web Sources
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {msg.sources.map((source, sIdx) => (
                                                <a
                                                  key={sIdx}
                                                  href={source.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 hover:bg-primary/10 border border-border rounded-lg transition-all group/source"
                                                >
                                                  {source.url && source.url.includes('http') ? (
                                                    <Globe className="w-3 h-3 text-subtext group-hover/source:text-primary" />
                                                  ) : (
                                                    <FileText className="w-3 h-3 text-subtext group-hover/source:text-primary" />
                                                  )}
                                                  <span className="text-xs font-medium text-maintext group-hover/source:text-primary truncate max-w-[150px]">
                                                    {source.title}
                                                  </span>
                                                  <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                                                    <ExternalLink className="w-2.5 h-2.5 text-primary" />
                                                  </div>
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {msg.videoUrl && (
                                          <div className="relative mt-4 mb-2 w-fit max-w-full">
                                            <React.Suspense fallback={<div className="w-full aspect-video animate-pulse rounded-xl" />}>

                                            </React.Suspense>
                                          </div>
                                        )}

                                        {/* Dynamic Image Rendering (if not in markdown) */}
                                        {msg.imageUrl && (
                                          <div
                                            className="relative group/generated mt-4 mb-2 overflow-hidden rounded-2xl transition-all duration-500 ease-in-out border border-transparent hover:border-primary/25 hover:shadow-sm hover:shadow-primary/10 cursor-zoom-in w-fit max-w-sm"
                                            onClick={() => {
                                              if (!viewingDoc) setViewingDoc({ url: msg.imageUrl, type: 'image', name: 'Generated Image' });
                                            }}
                                          >

                                            <img
                                              src={msg.imageUrl}
                                              alt="Generated Content"
                                              className="w-full h-auto max-h-[420px] object-contain transition-all duration-500"
                                              loading="eager"
                                              onLoad={() => {
                                                console.log("Image loaded successfully:", msg.imageUrl);
                                                scrollToBottom(true);
                                              }}
                                              onError={(e) => {
                                                console.error("Image load failed for URL:", msg.imageUrl);
                                                if (!e.target.dataset.retried) {
                                                  e.target.dataset.retried = "true";
                                                  setTimeout(() => {
                                                    // ⚠️ Never append extra query params to signed URLs — it breaks the signature
                                                    const isSignedUrl = msg.imageUrl?.includes('X-Goog-Signature');
                                                    const retryUrl = isSignedUrl
                                                      ? msg.imageUrl  // Use exact URL for signed URLs
                                                      : msg.imageUrl + (msg.imageUrl.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                                                    console.log("Retrying image load:", retryUrl);
                                                    e.target.src = retryUrl;
                                                  }, 2000);
                                                } else {
                                                  const finalErrorMsg = msg.imageUrl?.includes('cloudinary') ? 'Cloudinary Error' : 'Image Load Error';
                                                  e.target.src = `https://placehold.co/600x400/222/fff?text=${encodeURIComponent(finalErrorMsg)}%0AClick+to+Retry`;
                                                  e.target.style.cursor = 'pointer';
                                                  e.target.onclick = (event) => {
                                                    event.stopPropagation();
                                                    const isSignedUrl = msg.imageUrl?.includes('X-Goog-Signature');
                                                    e.target.src = isSignedUrl
                                                      ? msg.imageUrl
                                                      : msg.imageUrl + (msg.imageUrl.includes('?') ? '&' : '?') + 'manual=' + Date.now();
                                                  };
                                                }
                                              }}
                                            />
                                            <div className="absolute bottom-5 right-4 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover/generated:opacity-100 transition-all duration-500 ease-in-out scale-100 sm:scale-90 sm:group-hover/generated:scale-100">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsMagicEditing(true);

                                                  setEditRefImage({
                                                    url: msg.imageUrl,
                                                    name: 'Generated Asset',
                                                    type: 'image/png'
                                                  });
                                                  toast.success('Magic Edit mode active! Type your request.');
                                                  inputRef.current?.focus();
                                                }}
                                                className="p-2.5 text-primary rounded-xl hover: shadow-sm border border-white/20 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                                                title="Edit this Image"
                                              >
                                                <Wand2 className="w-4 h-4" />
                                              </button>

                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopyImage(msg.imageUrl);
                                                }}
                                                className="p-2.5 text-primary rounded-xl hover: shadow-sm border border-white/20 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                                                title="Copy Image"
                                              >
                                                <Copy className="w-4 h-4" />
                                              </button>
                                              <button
                                                disabled={isDownloadingUrl === msg.imageUrl}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDownload(msg.imageUrl, 'AI LEGAL™-generated.png');
                                                }}
                                                className={`p-2.5 rounded-xl shadow-lg border border-white/20 flex items-center justify-center transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${isDownloadingUrl === msg.imageUrl ? 'bg-zinc-600 cursor-wait' : 'bg-primary text-white hover:bg-primary/90'}`}
                                                title="Download High-Res"
                                              >
                                                {isDownloadingUrl === msg.imageUrl ? (
                                                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                ) : (
                                                  <Download className="w-4 h-4" />
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {/* Render Actions and Timestamp INSIDE the bubble */}
                                        {msg.role === 'user' ? (
                                          <div className="mt-3 pt-2 border-t border-slate-200/30 flex items-center justify-end gap-3 w-full">
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => handleMessageDelete(msg.id)}
                                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50/10 rounded transition-colors"
                                                  title="Delete"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleMessageUndo(msg)}
                                                  className="p-1 text-slate-400 hover:text-primary hover:bg-black/5 rounded transition-colors"
                                                  title="Undo/Restore to Input"
                                                >
                                                  <Undo2 className="w-3.5 h-3.5" />
                                                </button>
                                                {!msg.attachment && (
                                                  <button
                                                    onClick={() => startEditing(msg)}
                                                    className="p-1 text-slate-400 hover:text-primary hover:bg-black/5 rounded transition-colors"
                                                    title="Edit"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleCopyMessage(msg.content || msg.text)}
                                                  className="p-1 text-slate-400 hover:text-maintext hover:bg-black/5 rounded transition-colors"
                                                  title="Copy"
                                                >
                                                  <Copy className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                              <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            </div>


                                          </div>
                                        ) : (
                                          /* AI Feedback Actions inside bubble - Strictly hide for media and processing */
                                          !msg.isProcessing && !msg.isGenerating && !msg.error &&
                                          typingMessageId !== msg.id && (
                                            <div className="mt-3 pt-2 border-t border-slate-200/20 w-full block">
                                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                                                {(() => {
                                                  // Detect if the AI response contains Hindi (Devanagari script)
                                                  const isHindiContent = /[\u0900-\u097F]/.test(msg.content);
                                                  const prompts = isHindiContent ? FEEDBACK_PROMPTS.hi : FEEDBACK_PROMPTS.en;
                                                  const msgIdentifier = (msg.id || msg._id || Date.now()).toString();
                                                  const promptIndex = (msgIdentifier.charCodeAt(msgIdentifier.length - 1) || 0) % prompts.length;
                                                  return (
                                                    <p className="text-[11px] text-subtext font-medium flex items-center gap-1.5 shrink-0 m-0 leading-none">
                                                      {prompts[promptIndex]}
                                                      <span className="text-xs">😊</span>
                                                    </p>
                                                  );
                                                })()}
                                                <div className="flex flex-col items-end gap-2 self-end sm:self-auto">
                                                  <div className="flex items-center gap-2">

                                                    {!isMediaFeature && (() => {
                                                      const msgIdentifier = (msg.id || msg._id || idx).toString();
                                                      const isSpeaking = speakingMessageId === msgIdentifier;
                                                      return (
                                                        <button
                                                          onClick={() => {
                                                            speakResponse(msg.content, null, msgIdentifier, msg.attachments || [], true);
                                                          }}
                                                          className={`transition-colors p-1 rounded ${isSpeaking
                                                            ? 'text-primary bg-primary/10'
                                                            : 'text-subtext hover:text-primary hover:bg-surface-hover'
                                                            }`}
                                                          title={isSpeaking && !isPaused ? "Pause" : "Speak"}
                                                        >
                                                          {isSpeaking && !isPaused ? (
                                                            <Pause className="w-3.5 h-3.5" />
                                                          ) : (
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                          )}
                                                        </button>
                                                      );
                                                    })()}
                                                    {!isMediaFeature && (
                                                      <button
                                                        onClick={() => handleCopyMessage(msg.content || msg.text)}
                                                        className="p-1 text-subtext hover:text-maintext hover:bg-black/5 rounded transition-colors"
                                                        title="Copy"
                                                      >
                                                        <Copy className="w-3.5 h-3.5" />
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() => handleThumbsUp(msg.id)}
                                                      className={`transition-colors p-1 rounded ${messageFeedback[msg.id]?.type === 'up'
                                                        ? 'text-primary bg-primary/10'
                                                        : 'text-subtext hover:text-primary hover:bg-surface-hover'
                                                        }`}
                                                      title="Helpful"
                                                    >
                                                      <ThumbsUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleThumbsDown(msg.id)}
                                                      className={`transition-colors p-1 rounded ${messageFeedback[msg.id]?.type === 'down'
                                                        ? 'text-red-500 bg-red-50/10'
                                                        : 'text-subtext hover:text-red-500 hover:bg-surface-hover'
                                                        }`}
                                                      title="Not Helpful"
                                                    >
                                                      <ThumbsDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleShare(msg.content)}
                                                      className="text-subtext hover:text-primary transition-colors p-1 hover:bg-surface-hover rounded"
                                                      title="Share Text"
                                                    >
                                                      <Share className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* PDF / ZIP Tools */}
                                                    <div className="flex items-center gap-1 border-l border-zinc-200 ml-1 pl-1">
                                                      {(msg.toolUsed === 'legal_draft_maker' || msg.toolUsed === 'Draft Maker' || (selectedLegalTool?.id === 'legal_draft_maker' && msg.role !== 'user')) && (
                                                        <button
                                                          onClick={() => startEditing(msg)}
                                                          className="text-primary hover:text-primary transition-all p-1 hover:bg-primary/5 rounded flex items-center gap-1 active:scale-95 group/edit"
                                                          title="Edit Draft"
                                                        >
                                                          <Edit2 className="w-3.5 h-3.5 group-hover/edit:scale-110 transition-transform" />
                                                        </button>
                                                      )}

                                                      {(msg.detectedMode === 'CODING_HELP' || msg.detectedMode === 'CODE_WRITER') ? (
                                                        <button
                                                          onClick={() => handleDownloadCodeProject(msg)}
                                                          className="text-primary hover:text-primary-dark transition-all p-1 hover:bg-primary/5 rounded flex items-center gap-1 active:scale-95 group/code"
                                                          title="Download Code Project (ZIP)"
                                                        >
                                                          <FileText className="w-3.5 h-3.5 group-hover/code:scale-110 transition-transform" />
                                                        </button>
                                                      ) : (
                                                        !isMediaFeature && (
                                                          <button
                                                            onClick={() => handlePdfAction('download', msg)}
                                                            className={`transition-all p-1 rounded flex items-center gap-1 active:scale-95 group/pdf ${downloadedMessages[msg.id]
                                                              ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                                              : 'text-subtext hover:text-primary hover:bg-surface-hover'
                                                              }`}
                                                            title="Download Ready-Made PDF Report"
                                                          >
                                                            <FileText className="w-3.5 h-3.5 group-hover/pdf:scale-110 transition-transform" />
                                                          </button>
                                                        )
                                                      )}
                                                    </div>

                                                    <span className="text-[10px] text-subtext/60 font-medium ml-1">
                                                      {new Date(msg.timestamp).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      })}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )
                                  )}

                                  {/* File Conversion Download Button */}
                                  {msg.conversion && msg.conversion.file && (
                                    <div className="mt-4 pt-3 border-t border-border/40 space-y-3" style={{ maxWidth: '260px' }}>

                                      {/* ── Modern Audio Player ── */}
                                      {msg.conversion.mimeType.startsWith('audio/') && (() => {
                                        const audioSrc = msg.conversion.blobUrl || `data:${msg.conversion.mimeType};base64,${msg.conversion.file}`;
                                        const playerId = `player-${msg.id}`;
                                        return (
                                          <div className="rounded-2xl overflow-hidden mb-2" style={{ background: 'linear-gradient(135deg, rgba(20,20,40,0.95) 0%, rgba(30,20,60,0.95) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                            {/* Waveform decorative bars + header */}
                                            <div className="px-3 pt-3 pb-1 flex items-center gap-2.5">
                                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                                <Volume2 className="w-4 h-4 text-white" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{msg.conversion.fileName}</p>
                                                <p className="text-[10px] text-purple-300/60 font-medium">
                                                  {msg.conversion.fileSize || ''}{msg.conversion.charCount ? ` · ${msg.conversion.charCount}c` : ''} · Audio
                                                </p>
                                              </div>
                                              {/* Decorative waveform */}
                                              <div className="flex items-center gap-[2px] shrink-0">
                                                {[2, 4, 6, 4, 7, 5, 4, 6, 4, 3, 5, 4].map((h, i) => (
                                                  <div key={i} className="w-[2px] rounded-full opacity-40" style={{ height: `${h}px`, background: 'linear-gradient(to top, #7c3aed, #818cf8)' }} />
                                                ))}
                                              </div>
                                            </div>

                                            {/* Player controls */}
                                            <div className="px-3 pb-3">
                                              <audio id={playerId} src={audioSrc} preload="metadata" style={{ display: 'none' }} />

                                              {/* Seek bar */}
                                              <div className="mb-2">
                                                <input
                                                  type="range" min="0" max="100" defaultValue="0" step="0.1"
                                                  className="w-full h-1 rounded-full cursor-pointer appearance-none"
                                                  style={{ background: 'rgba(255,255,255,0.08)' }}
                                                  onInput={(e) => {
                                                    const audio = document.getElementById(playerId);
                                                    if (audio && audio.duration) {
                                                      audio.currentTime = (e.target.value / 100) * audio.duration;
                                                    }
                                                    e.target.style.background = `linear-gradient(to right, #7c3aed 0%, #818cf8 ${e.target.value}%, rgba(255,255,255,0.08) ${e.target.value}%, rgba(255,255,255,0.08) 100%)`;
                                                  }}
                                                  ref={(el) => {
                                                    if (!el) return;
                                                    const audio = document.getElementById(playerId);
                                                    if (!audio) return;
                                                    const update = () => {
                                                      if (!audio.duration) return;
                                                      const pct = (audio.currentTime / audio.duration) * 100;
                                                      el.value = pct;
                                                      el.style.background = `linear-gradient(to right, #7c3aed 0%, #818cf8 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
                                                      // update time display
                                                      const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                                                      const timeEl = document.getElementById(`time-${playerId}`);
                                                      const durEl = document.getElementById(`dur-${playerId}`);
                                                      if (timeEl) timeEl.textContent = fmt(audio.currentTime);
                                                      if (durEl && audio.duration) durEl.textContent = fmt(audio.duration);
                                                    };
                                                    audio.addEventListener('timeupdate', update);
                                                    audio.addEventListener('loadedmetadata', update);
                                                  }}
                                                />
                                                <div className="flex justify-between text-[10px] text-white/20 mt-1 font-mono">
                                                  <span id={`time-${playerId}`}>0:00</span>
                                                  <span id={`dur-${playerId}`}>--:--</span>
                                                </div>
                                              </div>

                                              {/* Buttons */}
                                              <div className="flex items-center gap-3">
                                                {/* Play/Pause */}
                                                <button
                                                  onClick={(e) => {
                                                    const audio = document.getElementById(playerId);
                                                    const btn = e.currentTarget;
                                                    if (!audio) return;
                                                    if (audio.paused) {
                                                      // Pause all other players
                                                      document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
                                                      audio.play();
                                                      btn.dataset.playing = 'true';
                                                      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
                                                      audio.addEventListener('ended', () => {
                                                        btn.dataset.playing = '';
                                                        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
                                                      }, { once: true });
                                                    } else {
                                                      audio.pause();
                                                      btn.dataset.playing = '';
                                                      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
                                                    }
                                                  }}
                                                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-primary/30 transition-transform active:scale-90"
                                                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                </button>

                                                {/* Speed pill */}
                                                <button
                                                  onClick={(e) => {
                                                    const audio = document.getElementById(playerId);
                                                    if (!audio) return;
                                                    const speeds = [1, 1.25, 1.5, 1.75, 2];
                                                    const cur = speeds.indexOf(audio.playbackRate);
                                                    const next = speeds[(cur + 1) % speeds.length];
                                                    audio.playbackRate = next;
                                                    e.currentTarget.textContent = `${next}×`;
                                                  }}
                                                  className="px-2.5 py-1 text-[10px] font-bold text-primary-light rounded-lg border border-primary/20 hover:border-primary/50 transition-colors"
                                                  style={{ background: 'var(--color-primary-bg)' }}
                                                >1×</button>

                                                <div className="flex-1" />

                                                {/* Volume */}
                                                <button onClick={(e) => {
                                                  const audio = document.getElementById(playerId);
                                                  if (!audio) return;
                                                  audio.muted = !audio.muted;
                                                  e.currentTarget.style.opacity = audio.muted ? '0.4' : '1';
                                                }} className="text-white/40 hover:text-white/80 transition-colors">
                                                  <Volume2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* File metadata + Download button */}
                                      {!msg.conversion.mimeType.startsWith('audio/') && (
                                        <div className="flex items-center justify-between px-1 py-1">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-maintext truncate">{msg.conversion.fileName}</p>
                                            <p className="text-[9px] text-subtext font-bold uppercase tracking-widest flex items-center gap-1.5">
                                              <span className="px-1 py-0.5 bg-primary/10 text-primary rounded-md border border-transparent">
                                                {msg.conversion.fileSize || "Ready"}
                                              </span>
                                              {msg.conversion.charCount && (
                                                <span className="px-1 py-0.5 bg-secondary/30 text-subtext rounded-md border border-transparent">
                                                  {msg.conversion.charCount}C
                                                </span>
                                              )}
                                              {msg.conversion.mimeType.includes('pdf') ? 'PDF' : 'DOCX'}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            const downloadToast = toast.loading("Starting download...");
                                            try {
                                              const byteCharacters = atob(msg.conversion.file);
                                              const byteNumbers = new Array(byteCharacters.length);
                                              for (let i = 0; i < byteCharacters.length; i++) {
                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                              }
                                              const byteArray = new Uint8Array(byteNumbers);
                                              const blob = new Blob([byteArray], { type: msg.conversion.mimeType });
                                              const url = URL.createObjectURL(blob);
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = msg.conversion.fileName;
                                              document.body.appendChild(a);
                                              a.click();
                                              setTimeout(() => {
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                                toast.dismiss(downloadToast);
                                                toast.success("Download complete!");
                                              }, 500);
                                            } catch (err) {
                                              toast.dismiss(downloadToast);
                                              toast.error("Download failed");
                                            }
                                          }}
                                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-white rounded-lg transition-all shadow-sm font-bold text-[11px] active:scale-95 hover:opacity-90"
                                          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
                                        >
                                          <Download className="w-4 h-4" />
                                          Download
                                        </button>


                                      </div>
                                    </div>
                                  )}



                                  {/* Integrated Smart Suggestions (Only for the latest AI response) */}
                                  {idx === messages.length - 1 && (msg.role === 'model' || msg.role === 'assistant') && !isLoading && !typingMessageId && (() => {
                                    const activeSuggestions = (msg.suggestions && Array.isArray(msg.suggestions) && msg.suggestions.length > 0)
                                      ? msg.suggestions
                                      : ((suggestions && Array.isArray(suggestions) && suggestions.length > 0)
                                        ? suggestions
                                        : [
                                          "⚖️ Explain IPC & BNS Sections",
                                          "📝 Draft Legal Notice",
                                          "📚 Supreme Court Precedents",
                                          "🔍 Cross-Examination Questions"
                                        ]);

                                    return (
                                      <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in duration-300 select-none">
                                        {activeSuggestions.map((item, index) => {
                                          const cleanItem = String(item || '')
                                            .replace(/^[.\-*•\d\s]+/, '')
                                            .replace(/\*\*/g, '')
                                            .replace(/\*/g, '')
                                            .replace(/^Hello\s+[^,]+,?\s*/i, '')
                                            .replace(/^Hi\s+[^,]+,?\s*/i, '')
                                            .trim();

                                          if (!cleanItem || cleanItem.length < 3) return null;

                                          return (
                                            <button
                                              key={index}
                                              type="button"
                                              onClick={() => handleSuggestionClick(cleanItem)}
                                              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 hover:text-[#C8A34D] dark:hover:text-[#C8A34D] hover:bg-[#C8A34D]/10 dark:hover:bg-[#C8A34D]/20 border border-slate-200/80 dark:border-zinc-700/60 hover:border-[#C8A34D]/40 transition-all shadow-2xs cursor-pointer text-left flex items-center gap-2 group/chip"
                                            >
                                              <span className="text-[#C8A34D] font-bold group-hover/chip:scale-110 transition-transform">💡</span>
                                              <span>{cleanItem}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}


                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>

                    )}
                     {((isLoading || gen.isGenerating) && !typingMessageId && !gen.typingMessageId) && (
                      <div className="chatgpt-message-row ai-row group mb-6 sm:mb-8 animate-in fade-in duration-300">
                        <div className="chatgpt-message-content select-text">
                          <div className="chatgpt-text flex items-center">
                            <AisaTypingIndicator
                              visible={true}
                              message={getToolTypingMessage(selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool'))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {messages.length === 0 && !isSessionLoading && !isHydrating && (() => {
                      const activeToolId = selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool');
                      const details = getToolDetails(activeToolId, selectedRole);
                      const IconComponent = details.icon;
                      const isGeneralCopilot = !activeToolId || !['legal_draft_maker', 'legal_research', 'legal_contract_analyzer', 'legal_evidence_checker', 'legal_argument_builder', 'legal_case_predictor', 'legal_strategy_engine', 'legal_research_assistant'].includes(activeToolId);

                      // Define a mapping of tool colors for glow effects (Warm Gold Rolex Theme)
                      const activeColor = 'from-[#C8A34D]/20 to-[#C8A34D]/10 text-[#C8A34D] border-[#C8A34D]/30';

                      return (
                        <>
                          {messages.length === 0 && !isHistoryOpen && !activeCaseId && (
                            <div className="absolute top-4 left-4 z-30 select-none">
                              <button
                                type="button"
                                onClick={() => setIsHistoryOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all shadow-xs border border-slate-200/60 dark:border-zinc-700/40 hover:bg-slate-50 dark:hover:bg-zinc-800/80 cursor-pointer"
                                title="Open AI History"
                              >
                                <History className="w-4 h-4 text-[#C8A34D]" />
                                <span>History</span>
                              </button>
                            </div>
                          )}
                          <motion.div
                            key={activeToolId || 'general'}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="flex-1 flex flex-col items-center justify-center text-center py-6 sm:py-12 px-3 sm:px-6 w-full max-w-2xl mx-auto space-y-5 sm:space-y-8 select-text min-h-[60vh]"
                          >
                            {/* Hero Section */}
                            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                              {isGeneralCopilot ? (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  className="flex items-center justify-center -mb-2"
                                >
                                  <img src="/logo/logo_transparent.png" className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-sm" alt="AI Legal Logo" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  whileHover={{ scale: 1.05, rotate: 2 }}
                                  className="w-14 h-14 sm:w-16 sm:h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-slate-200/90 dark:border-zinc-700 shadow-sm relative overflow-hidden p-2"
                                >
                                  <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-[#C8A34D] relative z-10" strokeWidth={2.2} />
                                </motion.div>
                              )}

                              <div className="text-center space-y-1.5 sm:space-y-2 select-text">
                                <div className="flex items-center justify-center gap-3">
                                  <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] dark:text-zinc-100 tracking-tight">
                                    {details.title}
                                  </h1>
                                </div>
                                <p className="text-xs sm:text-sm text-[#6B7280] dark:text-zinc-400 font-medium max-w-md mx-auto leading-relaxed px-2">
                                  {details.desc}
                                </p>
                              </div>
                            </div>

                            {/* Centered Chat Input Card - Shifted slightly down for better mobile ergonomics */}
                            <div className="w-full pointer-events-auto mt-3 sm:mt-5">
                              {renderInputForm()}
                            </div>

                            {/* Intelligent Suggestion Chips - Clean Mobile Responsive UI */}
                            {activeToolId !== 'legal_precedents' && quickSuggestions.length > 0 && (
                              <motion.div
                                variants={chipsContainerVariants}
                                initial="hidden"
                                animate="visible"
                                className="w-full flex flex-wrap gap-2 sm:gap-2.5 justify-center items-center mt-2.5 sm:mt-4 select-none pointer-events-auto max-w-2xl px-2 sm:px-4"
                              >
                                {(() => {
                                  const visibleChips = isSuggestionsExpanded
                                    ? quickSuggestions
                                    : quickSuggestions.slice(0, 4);

                                  return (
                                    <>
                                      {visibleChips.map((action, idx) => {
                                        const isSurprise = action.prompt === "SURPRISE_ME";
                                        return (
                                          <motion.div key={idx} variants={chipItemVariants} className="max-w-full">
                                            <motion.button
                                              type="button"
                                              whileHover={{ scale: 1.03, y: -0.5 }}
                                              whileTap={{ scale: 0.97 }}
                                              onClick={() => {
                                                if (isSurprise) {
                                                  handleSurpriseMeClick();
                                                } else {
                                                  handleSuggestionClick(action.prompt);
                                                }
                                              }}
                                              className={`min-h-[34px] sm:h-[34px] py-1.5 px-3.5 rounded-full text-[11px] sm:text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer select-none border max-w-full text-center leading-tight ${isSurprise
                                                  ? "bg-[#C8A34D]/15 text-[#C8A34D] border-[#C8A34D]/40 hover:bg-[#C8A34D]/25 font-bold"
                                                  : "bg-white dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-zinc-700 hover:border-[#C8A34D]/50 hover:text-[#C8A34D] hover:bg-[#C8A34D]/5"
                                                }`}
                                            >
                                              <span className="truncate max-w-full">{action.label}</span>
                                            </motion.button>
                                          </motion.div>
                                        );
                                      })}

                                      {quickSuggestions.length > 4 && (
                                        <motion.div variants={chipItemVariants}>
                                          <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.03, y: -0.5 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
                                            className="min-h-[34px] sm:h-[34px] py-1.5 px-3.5 rounded-full text-[11px] sm:text-[13px] font-bold shadow-2xs hover:shadow-xs cursor-pointer select-none border border-[#C8A34D]/40 bg-[#C8A34D]/15 text-[#C8A34D] hover:bg-[#C8A34D]/25 transition-all duration-200 flex items-center justify-center"
                                          >
                                            {isSuggestionsExpanded ? "Less -" : "More +"}
                                          </motion.button>
                                        </motion.div>
                                      )}
                                    </>
                                  );
                                })()}
                              </motion.div>
                            )}
                          </motion.div>
                        </>
                      );
                    })()}



                    <div ref={messagesEndRef} className="h-6" />

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );

          return activeCaseId ? (
            <CaseWorkspace
              caseId={activeCaseId}
              currentCase={currentCase}
              onUpdateCase={(updated) => {
                setCurrentCase(updated);
                setAllProjects(prev => prev.map(c => c._id === updated._id ? updated : c));
              }}
              activeTab={activeWorkspaceTab}
              setActiveTab={setActiveWorkspaceTab}
              handleBackToDashboard={handleBackToDashboard}
              handleDeleteCase={handleDeleteCase}
              isRenamingCase={isRenamingCase}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              handleRenameCase={handleRenameCase}
              setIsRenamingCase={setIsRenamingCase}
              aiPanel={renderCaseAiPanel()}
              onAskAi={(text) => handleSendMessage(null, text)}
              isAiPanelFullscreen={isAiPanelFullscreen}
              setIsAiPanelFullscreen={setIsAiPanelFullscreen}
            />
          ) : (
            <>
              {!activeCaseId && !isSessionLoading && messages.length > 0 &&
                location.pathname !== '/dashboard/cases' &&
                !(legalView === 'DASHBOARD' && currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case') &&
                (() => {
                  const activeToolId = selectedLegalTool?.id || new URLSearchParams(window.location.search).get('tool');
                  const details = getToolDetails(activeToolId, selectedRole);
                  return (
                    <div className="w-full border-b border-slate-200/60 dark:border-zinc-800/60 bg-white dark:bg-[#0d0e16] shrink-0 select-none z-30 shadow-2xs">
                      <div className="flex items-center justify-between px-4 sm:px-6 py-3 w-full gap-3">
                        
                        {/* LEFT: Assistant Title & History */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                            <span className="text-base">{details.emoji}</span>
                            <span>{details.title}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#C8A34D] hover:bg-[#C8A34D]/10 rounded-lg transition-colors border border-[#C8A34D]/30 cursor-pointer"
                            title="Open AI History"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">History</span>
                          </button>
                        </div>

                        {/* RIGHT: New Chat Button */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* New Chat Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setMessages([]);
                              setCurrentCaseSessionId('new');
                              if (!activeCaseId) {
                                navigate('/dashboard/chat/new');
                              } else {
                                toast.success("Started a new conversation for this case!");
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-lg text-xs transition-all shadow-sm cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">New Chat</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })()}
              {renderChatStream()}
            </>
          );
        })()}

        {/* Welcome Screen - Integrated Hub */}
        <AnimatePresence>
          {false && (
            <motion.div
              key="welcome-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-[50] pointer-events-none flex flex-col items-center justify-start sm:justify-start overflow-hidden sm:overflow-y-auto sm:overflow-x-hidden sm:pb-32 md:pb-48 scrollbar-hide pt-20 sm:pt-6 aisa-welcome-screen-overlay"
            >
              <div className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto px-3 sm:px-6 h-max mt-0 sm:mt-0 pointer-events-auto">
                <ModernDashboard
                  userName={user?.name || user?.email?.split('@')[0]}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  handleSendMessage={handleSendMessage}
                  legalCases={legalCases}
                  sessions={sessions}
                  setSessions={setSessions}
                  currentProjectId={currentProjectId}
                  handleDeleteSession={handleDeleteSession}
                  activateTool={activateToolWithTypingEffect}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>        {/* Unified Chat Input Container */}
        {location.pathname !== '/dashboard/cases' && location.pathname !== '/dashboard' && legalView !== 'DASHBOARD' && legalView !== 'PRECEDENTS' && !activeCaseId && messages.length > 0 && (
          <div className={`w-full shrink-0 bg-slate-50 sm:bg-white border-t border-slate-100 px-4 py-4 relative z-[1001] ${(tglState.sidebarOpen && window.innerWidth < 1024) ? 'hidden' : ''}`}>
            <div className="max-w-4xl mx-auto w-full">
              {renderInputForm()}
            </div>
          </div>
        )}
      </div>

      {/* Live AI Modal */}
      <AnimatePresence>
        {isLiveMode && (
          <LiveAI
            onClose={() => setIsLiveMode(false)}
            language={currentLang}
          />
        )}
      </AnimatePresence>

      <LoginRequiredModal />

      {/* Draft Editor Modal */}
      <Transition appear show={isDraftEditorOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[1100]" onClose={() => setIsDraftEditorOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-0 sm:p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full h-full sm:h-[90vh] sm:w-[90vw] sm:max-w-6xl bg-[#f8fafc] dark:bg-[#090b11] text-left align-middle shadow-2xl transition-all flex flex-col overflow-hidden sm:rounded-3xl border border-slate-200/50 dark:border-zinc-800/60">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0d0e16] border-b border-slate-200/60 dark:border-zinc-800/60 shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                      <input
                        type="text"
                        value={editorTitle}
                        onChange={(e) => setEditorTitle(e.target.value)}
                        className="text-lg font-black text-slate-800 dark:text-zinc-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-primary focus:outline-none px-1 py-0.5 truncate flex-1 max-w-md cursor-text"
                        title="Click to rename document"
                        placeholder="Document Title"
                      />
                      <span className="aisa-badge-small shrink-0 !bg-primary/10 !text-primary !border !border-primary/20 !font-extrabold !px-2.5 !py-0.5 !rounded-full">
                        Draft Maker
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Tabs */}
                      <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-slate-200/30 dark:border-zinc-700/30">
                        <button
                          type="button"
                          onClick={() => setEditorTab("edit")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${editorTab === "edit" ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorTab("preview")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${editorTab === "preview" ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-[#10b981]" />
                          <span>Live Preview</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDraftEditorOpen(false)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-50 dark:bg-[#07080d] select-text">
                    <div className="w-full max-w-4xl min-h-full flex flex-col bg-white dark:bg-[#0d0e16] border border-slate-200/50 dark:border-zinc-800/40 shadow-md sm:rounded-2xl overflow-hidden p-6 sm:p-12 md:p-16 select-text">
                      {editorTab === "edit" ? (
                        <textarea
                          value={editorContent}
                          onChange={(e) => setEditorContent(e.target.value)}
                          className="w-full h-full bg-transparent border-0 focus:ring-0 outline-none focus:outline-none text-slate-800 dark:text-zinc-100 font-serif text-[16px] sm:text-[18px] leading-[1.8] resize-none overflow-y-visible placeholder-slate-400 select-text"
                          placeholder="Write your legal draft here..."
                          style={{ minHeight: '100%', height: 'auto' }}
                        />
                      ) : (
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-slate-800 dark:text-zinc-100 select-text leading-[1.8] font-serif">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            urlTransform={(value) => value}
                          >
                            {editorContent || "*No content to preview*"}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-white dark:bg-[#0d0e16] border-t border-slate-200/60 dark:border-zinc-800/60 shrink-0">
                    {/* Left side actions (Export) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Export:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tempMsg = { ...editorMessage, content: editorContent };
                          handlePdfAction('download', tempMsg);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/20 cursor-pointer"
                        title="Download as PDF"
                      >
                        <FileIcon className="w-3.5 h-3.5" />
                        <span>PDF Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportDoc}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-500/10 rounded-xl transition-all border border-blue-500/20 cursor-pointer"
                        title="Download as Microsoft Word"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word (.doc)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([editorContent], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${editorTitle || 'Draft'}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success("Text file downloaded!");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-500/10 rounded-xl transition-all border border-slate-500/20 cursor-pointer"
                        title="Download as Plain Text"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Plain Text</span>
                      </button>
                    </div>

                    {/* Right side actions (Save) */}
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsDraftEditorOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAsNewDraft}
                        className="px-4 py-2 border border-primary/30 text-primary hover:bg-primary/5 rounded-full text-sm font-bold transition-all cursor-pointer"
                      >
                        Save as New Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditorChanges}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-full text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Feedback Modal */}
      <Transition appear show={feedbackOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setFeedbackOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-surface p-6 text-left align-middle shadow-sm transition-all border border-border">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-maintext flex justify-between items-center"
                  >
                    {t('shareFeedback')}
                    <button onClick={() => setFeedbackOpen(false)} className="text-subtext hover:text-maintext">
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Title>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Incorrect or incomplete", "Not what I asked for", "Slow or buggy", "Style or tone", "Safety or legal concern", "Other"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleFeedbackCategory(cat)}
                        className={`text-xs px-3 py-2 rounded-full border transition-colors ${feedbackCategory.includes(cat)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-transparent text-subtext border-border hover:border-maintext'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <textarea
                      className="w-full bg-black/5 rounded-xl p-3 text-sm focus:outline-none border border-transparent focus:border-border text-maintext placeholder-subtext resize-none"
                      rows={3}
                      placeholder="Share details (optional)"
                      value={feedbackDetails}
                      onChange={(e) => setFeedbackDetails(e.target.value)}
                    />
                  </div>

                  <div className="mt-4 text-[10px] text-subtext leading-tight">
                    {t('conversationIncludedFeedback')}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      className={`inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-all ${isSubmittingFeedback ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      onClick={submitFeedback}
                    >
                      {isSubmittingFeedback && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {isSubmittingFeedback ? t('submitting') : t('submit')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Limit Reached handling is now via LoginRequiredModal event */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          // Onboarding finished, just close the modal
          setShowOnboarding(false);
        }}
      />

      {/* ===== WHATSAPP IN-APP SHARE MODAL ===== */}
      {
        waShareModal && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden animate-in slide-in- duration-300">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm">{t('shareOnWhatsApp')}</h3>
                  <p className="text-white/70 text-xs">{t('pdfLinkSendNoApp')}</p>
                </div>
                <button onClick={() => setWaShareModal(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover: transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Phone Input */}
                <div>
                  <label className="text-xs font-semibold text-subtext mb-1.5 block">📱 {t('phoneNumberWithCode')}</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-surface-hover rounded-xl px-3 border border-border/50 text-sm text-maintext font-mono">+</div>
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={e => setWaPhone(e.target.value)}
                      placeholder="91 9876543210"
                      className="flex-1 bg-surface-hover border border-border/50 rounded-xl px-3 py-2.5 text-sm text-maintext placeholder-subtext focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-subtext mt-1">{t('phoneNumberExample')}</p>
                </div>

                {/* Message Preview */}
                <div>
                  <label className="text-xs font-semibold text-subtext mb-1.5 block">💬 {t('messagePreview')}</label>
                  <textarea
                    value={waMsgContent}
                    onChange={e => setWaMsgContent(e.target.value)}
                    rows={3}
                    className="w-full bg-surface-hover border border-border/50 rounded-xl px-3 py-2.5 text-xs text-maintext focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all resize-none"
                  />
                </div>

                {/* PDF Link */}
                {waPdfUrl && (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs text-green-600 font-medium truncate">PDF Ready: {waPdfUrl.split('/').pop()}</span>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={() => setWaShareModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm text-subtext hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendWhatsAppMessage}
                  disabled={waUploading || !waPhone}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  {t('sendOnWhatsApp')}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* ===== VOICE SETTINGS MODAL ===== */}
      <Transition appear show={isVoiceSettingsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[999]" onClose={() => setIsVoiceSettingsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95 translate-y-4" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-3xl shadow-sm border border-black/5 bg-white/95 flex flex-col" style={{ maxHeight: 'calc(100dvh - 48px)' }}>

                  {/* ── Header ── */}
                  <div className="relative px-6 pt-6 pb-4">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.4) 0%, transparent 70%)' }} />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm shadow-indigo-500/30">
                          <Sliders className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-sm font-bold text-maintext leading-none">{t('voiceSettings')}</Dialog.Title>
                          <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">{t('chirp3HD')}</p>
                        </div>
                      </div>
                      <button onClick={() => setIsVoiceSettingsOpen(false)} className="w-7 h-7 rounded-xl bg-black/5 hover: flex items-center justify-center text-subtext hover:text-maintext transition-all border border-black/5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 scrollbar-hide">

                    {/* ── Language Picker ── */}
                    {(() => {
                      const LANGS = [
                        {
                          group: '🇺🇸 English', items: [
                            { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
                            { value: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
                            { value: 'en-AU', label: 'English (Australia)', flag: '🇦🇺' },
                            { value: 'en-IN', label: 'English (India)', flag: '🇮🇳' },
                          ]
                        },
                        {
                          group: '🇮🇳 South Asian', items: [
                            { value: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
                            { value: 'bn-IN', label: 'Bengali', flag: '🇧🇩' },
                            { value: 'gu-IN', label: 'Gujarati', flag: '🇮🇳' },
                            { value: 'kn-IN', label: 'Kannada', flag: '🇮🇳' },
                            { value: 'ml-IN', label: 'Malayalam', flag: '🇮🇳' },
                            { value: 'mr-IN', label: 'Marathi', flag: '🇮🇳' },
                            { value: 'pa-IN', label: 'Punjabi ✨', flag: '🇮🇳' },
                            { value: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
                            { value: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
                            { value: 'ur-IN', label: 'Urdu', flag: '🇮🇳' },
                          ]
                        },
                        {
                          group: '🇪🇺 European', items: [
                            { value: 'cs-CZ', label: 'Czech', flag: '🇨🇿' },
                            { value: 'da-DK', label: 'Danish', flag: '🇩🇰' },
                            { value: 'de-DE', label: 'German', flag: '🇩🇪' },
                            { value: 'el-GR', label: 'Greek', flag: '🇬🇷' },
                            { value: 'es-ES', label: 'Spanish (Spain)', flag: '🇪🇸' },
                            { value: 'es-US', label: 'Spanish (US)', flag: '🇺🇸' },
                            { value: 'fi-FI', label: 'Finnish', flag: '🇫🇮' },
                            { value: 'fr-FR', label: 'French (France)', flag: '🇫🇷' },
                            { value: 'fr-CA', label: 'French (Canada)', flag: '🇨🇦' },
                            { value: 'hu-HU', label: 'Hungarian', flag: '🇭🇺' },
                            { value: 'it-IT', label: 'Italian', flag: '🇮🇹' },
                            { value: 'nb-NO', label: 'Norwegian', flag: '🇳🇴' },
                            { value: 'nl-NL', label: 'Dutch', flag: '🇳🇱' },
                            { value: 'pl-PL', label: 'Polish', flag: '🇵🇱' },
                            { value: 'pt-BR', label: 'Portuguese (Brazil)', flag: '🇧🇷' },
                            { value: 'pt-PT', label: 'Portuguese (Portugal)', flag: '🇵🇹' },
                            { value: 'ro-RO', label: 'Romanian', flag: '🇷🇴' },
                            { value: 'ru-RU', label: 'Russian', flag: '🇷🇺' },
                            { value: 'sk-SK', label: 'Slovak', flag: '🇸🇰' },
                            { value: 'sv-SE', label: 'Swedish', flag: '🇸🇪' },
                            { value: 'tr-TR', label: 'Turkish', flag: '🇹🇷' },
                            { value: 'uk-UA', label: 'Ukrainian', flag: '🇺🇦' },
                          ]
                        },
                        {
                          group: '🌏 East Asian', items: [
                            { value: 'cmn-CN', label: 'Chinese — Mandarin (CN)', flag: '🇨🇳' },
                            { value: 'cmn-TW', label: 'Chinese — Mandarin (TW)', flag: '🇹🇼' },
                            { value: 'yue-HK', label: 'Cantonese (HK) ✨', flag: '🇭🇰' },
                            { value: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
                            { value: 'ko-KR', label: 'Korean', flag: '🇰🇷' },
                          ]
                        },
                        {
                          group: '🌍 Others', items: [
                            { value: 'ar-XA', label: 'Arabic', flag: '🇸🇦' },
                            { value: 'fil-PH', label: 'Filipino', flag: '🇵🇭' },
                            { value: 'he-IL', label: 'Hebrew', flag: '🇮🇱' },
                            { value: 'id-ID', label: 'Indonesian', flag: '🇮🇩' },
                            { value: 'ms-MY', label: 'Malay', flag: '🇲🇾' },
                            { value: 'th-TH', label: 'Thai', flag: '🇹🇭' },
                            { value: 'vi-VN', label: 'Vietnamese', flag: '🇻🇳' },
                          ]
                        },
                      ];
                      const allLangItems = LANGS.flatMap(g => g.items);
                      const selLang = allLangItems.find(l => l.value === audioLangCode) || allLangItems[0];
                      return (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-subtext mb-2">{t('language')}</p>
                          <Listbox value={audioLangCode} onChange={(val) => {
                            setAudioLangCode(val);
                            setAudioVoiceName(`${val}-Chirp3-HD-Autonoe`);
                            // Sync with UI Language context
                            const item = allLangItems.find(l => l.value === val);
                            if (item) {
                              const baseLang = item.label.split(' (')[0].split(' —')[0];
                              setTimeout(() => {
                                setLanguage(baseLang);
                              }, 0);
                            }
                          }}>
                            <div className="relative">
                              <Listbox.Button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-black/5 bg-black/5 hover: hover:border-indigo-500/40 transition-all group text-left">
                                <span className="text-xl leading-none">{selLang.flag}</span>
                                <span className="flex-1 text-sm font-semibold text-maintext">{selLang.label}</span>
                                <ChevronDown className="w-4 h-4 text-subtext group-hover:text-indigo-400 transition-colors shrink-0" />
                              </Listbox.Button>
                              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 -translate-y-1">
                                <Listbox.Options className="absolute z-50 mt-2 w-full rounded-2xl overflow-hidden shadow-sm border border-black/10 outline-none bg-white/95" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                  {LANGS.map((group) => (
                                    <div key={group.group}>
                                      <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-indigo-500 sticky top-0 bg-white/95 z-10">{group.group}</div>
                                      {group.items.map((item) => (
                                        <Listbox.Option key={item.value} value={item.value} className={({ active, selected }) =>
                                          `flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300' : active ? 'bg-black/5 dark:bg-white/5 text-maintext' : 'text-subtext'
                                          }`
                                        }>
                                          {({ selected }) => (
                                            <>
                                              <span className="text-base leading-none">{item.flag}</span>
                                              <span className="flex-1 text-sm font-medium">{item.label}</span>
                                              {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                            </>
                                          )}
                                        </Listbox.Option>
                                      ))}
                                    </div>
                                  ))}
                                </Listbox.Options>
                              </Transition>
                            </div>
                          </Listbox>
                        </div>
                      );
                    })()}

                    {/* ── Voice Picker ── */}
                    {(() => {
                      const VOICES = [
                        {
                          group: '♀ Female Voices', color: 'rose', items: [
                            { name: 'Achernar', style: 'Bright, clear' },
                            { name: 'Achird', style: 'Warm, friendly' },
                            { name: 'Algenib', style: 'Smooth, graceful' },
                            { name: 'Aoede', style: 'Natural, balanced' },
                            { name: 'Autonoe', style: 'Soft, gentle · Default' },
                            { name: 'Callirrhoe', style: 'Rich, elegant' },
                            { name: 'Despina', style: 'Light, airy' },
                            { name: 'Erinome', style: 'Calm, composed' },
                            { name: 'Gacrux', style: 'Strong, confident' },
                            { name: 'Kore', style: 'Pure, melodic' },
                            { name: 'Laomedeia', style: 'Serene, flowing' },
                            { name: 'Leda', style: 'Warm, storytelling' },
                            { name: 'Pulcherrima', style: 'Radiant, vibrant' },
                            { name: 'Sulafat', style: 'Deep, resonant' },
                            { name: 'Vindemiatrix', style: 'Measured, clear' },
                            { name: 'Zephyr', style: 'Breezy, lively' },
                          ]
                        },
                        {
                          group: '♂ Male Voices', color: 'blue', items: [
                            { name: 'Algieba', style: 'Bold, expressive' },
                            { name: 'Alnilam', style: 'Deep, authoritative' },
                            { name: 'Charon', style: 'Dark, dramatic' },
                            { name: 'Enceladus', style: 'Crisp, powerful' },
                            { name: 'Fenrir', style: 'Bold, intense' },
                            { name: 'Iapetus', style: 'Steady, reliable' },
                            { name: 'Orus', style: 'Warm, friendly' },
                            { name: 'Puck', style: 'Playful, energetic' },
                            { name: 'Rasalgethi', style: 'Smooth, velvety' },
                            { name: 'Sadachbia', style: 'Calm, measured' },
                            { name: 'Sadaltager', style: 'Strong, clear' },
                            { name: 'Schedar', style: 'Rich, balanced' },
                            { name: 'Umbriel', style: 'Mysterious, deep' },
                            { name: 'Zubenelgenubi', style: 'Commanding, precise' },
                          ]
                        },
                      ];
                      const voiceKey = audioVoiceName.split('-Chirp3-HD-')[1] || 'Autonoe';
                      const allVoices = VOICES.flatMap(g => g.items.map(v => ({ ...v, group: g.group, color: g.color })));
                      const selVoice = allVoices.find(v => v.name === voiceKey) || allVoices[4];
                      const isFemale = VOICES[0].items.some(v => v.name === voiceKey);
                      return (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-subtext mb-2">{t('voice')}</p>
                          <Listbox value={audioVoiceName} onChange={setAudioVoiceName}>
                            <div className="relative">
                              <Listbox.Button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-black/5 bg-black/5 hover: hover:border-indigo-500/40 transition-all group text-left">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${isFemale ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                                  }`}>
                                  {isFemale ? '♀' : '♂'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-maintext leading-none">{selVoice.name}</p>
                                  <p className="text-[10px] text-subtext mt-0.5 truncate">{selVoice.style}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-subtext group-hover:text-indigo-400 transition-colors shrink-0" />
                              </Listbox.Button>
                              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 -translate-y-1">
                                <Listbox.Options className="absolute z-50 mt-2 w-full rounded-2xl overflow-hidden shadow-sm border border-black/10 outline-none bg-white/95" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                  {VOICES.map((group) => (
                                    <div key={group.group}>
                                      <div className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest sticky top-0 bg-white/95 dark:bg-[#12121a]/95 backdrop-blur-md z-10 ${group.color === 'rose' ? 'text-rose-500 dark:text-rose-400/70' : 'text-blue-500 dark:text-blue-400/70'
                                        }`}>{group.group}</div>
                                      {group.items.map((item) => {
                                        const voiceVal = `${audioLangCode}-Chirp3-HD-${item.name}`;
                                        return (
                                          <Listbox.Option key={item.name} value={voiceVal} className={({ active, selected }) =>
                                            `flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected
                                              ? (group.color === 'rose' ? 'bg-rose-50 dark:bg-rose-600/15 text-rose-600 dark:text-rose-300' : 'bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-300')
                                              : active ? 'bg-black/5 dark:bg-white/5 text-maintext' : 'text-subtext'
                                            }`
                                          }>
                                            {({ selected }) => (
                                              <>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${group.color === 'rose' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                  }`}>{group.color === 'rose' ? '♀' : '♂'}</div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-semibold leading-none">{item.name}</p>
                                                  <p className="text-[9px] text-subtext mt-0.5 truncate">{item.style}</p>
                                                </div>
                                                {selected && <Check className="w-3 h-3 shrink-0" />}
                                              </>
                                            )}
                                          </Listbox.Option>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </Listbox.Options>
                              </Transition>
                            </div>
                          </Listbox>
                        </div>
                      );
                    })()}

                    {/* ── Pitch Slider ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-subtext">{t('pitch')}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-indigo-500">{audioPitch > 0 ? '+' : ''}{audioPitch.toFixed(1)}</span>
                          {audioPitch !== 0 && (
                            <button onClick={() => setAudioPitch(0)} className="text-[9px] text-subtext/50 hover:text-subtext transition-colors">reset</button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <input type="range" min="-10" max="10" step="0.5" value={audioPitch}
                          onChange={(e) => setAudioPitch(parseFloat(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((audioPitch + 10) / 20) * 100}%, rgba(128,128,128,0.2) ${((audioPitch + 10) / 20) * 100}%, rgba(128,128,128,0.2) 100%)` }}
                        />
                        <div className="flex justify-between text-[9px] text-subtext/50 mt-1.5 font-medium">
                          <span>Lower</span><span>Normal</span><span>Higher</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Speed Slider ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-subtext">{t('speed')}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-indigo-500">{audioSpeed.toFixed(2)}×</span>
                          {audioSpeed !== 1.0 && (
                            <button onClick={() => setAudioSpeed(1.0)} className="text-[9px] text-subtext/50 hover:text-subtext transition-colors">reset</button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <input type="range" min="0.25" max="4.0" step="0.25" value={audioSpeed}
                          onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((audioSpeed - 0.25) / 3.75) * 100}%, rgba(128,128,128,0.2) ${((audioSpeed - 0.25) / 3.75) * 100}%, rgba(128,128,128,0.2) 100%)` }}
                        />
                        <div className="relative mt-2 h-3 text-[9px] text-subtext/50 font-medium">
                          <span className="absolute left-0">0.25×</span>
                          <span className="absolute transform -translate-x-1/2" style={{ left: '20%' }}>1× (Normal)</span>
                          <span className="absolute transform -translate-x-1/2" style={{ left: '46.66%' }}>2×</span>
                          <span className="absolute right-0">4×</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Buttons ── */}
                    <div className="flex flex-row gap-2 sm:gap-3 pt-1">
                      <button type="button" disabled={isPlayingSample} onClick={async () => {
                        if (isPlayingSample) return;
                        setIsPlayingSample(true);
                        // Stop any previously playing sample
                        if (sampleAudioRef.current) { sampleAudioRef.current.pause(); sampleAudioRef.current = null; }
                        const t = toast.loading('Generating sample...');
                        try {
                          const langSamples = {
                            'hi-IN': 'नमस्ते! मैं आपकी आवाज़ हूँ। क्या यह अच्छी लगती है?',
                            'bn-IN': 'নমস্কার! আমি আপনার ভয়েস। এটা কেমন শোনাচ্ছে?',
                            'gu-IN': 'નમસ્તે! હું તમારો અવાજ છું. આ કેવું લાગે છે?',
                            'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಧ್ವನಿ. ಇದು ಹೇಗೆ ಕೇಳಿಸುತ್ತದೆ?',
                            'ml-IN': 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ശബ്ദമാണ്. ഇത് എങ്ങനെയുണ്ട്?',
                            'mr-IN': 'नमस्कार! मी तुमचा आवाज आहे. हे कसे वाटते?',
                            'pa-IN': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਆਵਾਜ਼ ਹਾਂ। ਇਹ ਕਿਵੇਂ ਲੱਗਦਾ ਹੈ?',
                            'ta-IN': 'வணக்கம்! நான் உங்கள் குரல். இது எப்படி கேட்கிறது?',
                            'te-IN': 'నమస్కారం! నేను మీ వాయిస్. ఇది ఎలా ఉంది?',
                            'ur-IN': 'ہیلو! میں آپ کی آواز ہوں۔ یہ کیسا لگ رہا ہے؟',
                            'ar-XA': 'مرحباً! أنا صوتك. هل يبدو هذا جيداً؟',
                            'ja-JP': 'こんにちは。私はあなたの声です。どう聞こえますか？',
                            'cmn-CN': '你好！我是您的声音。这听起来好吗？',
                            'ko-KR': '안녕하세요! 저는 당신의 목소리입니다.',
                            'de-DE': 'Hallo! Ich bin Ihre Stimme. Klingt das gut?',
                            'fr-FR': 'Bonjour! Je suis votre voix. Est-ce que ça sonne bien?',
                            'es-ES': '¡Hola! Soy tu voz. ¿Suena bien?',
                          };
                          const txt = langSamples[audioLangCode] || 'Hello! This is a voice sample. How does it sound to you?';
                          const res = await axios.post(apis.synthesizeFile, {
                            introText: txt, languageCode: audioLangCode,
                            voiceName: audioVoiceName, pitch: audioPitch, speakingRate: audioSpeed
                          }, { responseType: 'arraybuffer', timeout: 30000, headers: { Authorization: `Bearer ${getUserData()?.token}` } });
                          const audio = new Audio(URL.createObjectURL(new Blob([res.data], { type: 'audio/mpeg' })));
                          sampleAudioRef.current = audio;
                          audio.onended = () => setIsPlayingSample(false);
                          audio.play();
                          toast.dismiss(t); toast.success('Playing sample ▶');
                        } catch (e) { toast.dismiss(t); toast.error('Sample failed — check voice/language combo.'); setIsPlayingSample(false); }
                      }} className={`flex-1 flex items-center justify-center gap-2 h-10 sm:h-11 rounded-2xl border border-black/5 dark:border-white/10 text-sm font-bold transition-all whitespace-nowrap ${isPlayingSample ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 cursor-not-allowed opacity-70' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-subtext hover:text-maintext'}`}>
                        <PlayCircle className={`w-4 h-4 ${isPlayingSample ? 'animate-pulse' : ''} text-indigo-500 dark:text-indigo-400`} /> {isPlayingSample ? t('playing') : t('playSample')}
                      </button>
                      <button type="button" onClick={() => {
                        updatePersonalization('voice', {
                          languageCode: audioLangCode,
                          voiceName: audioVoiceName,
                          pitch: audioPitch,
                          speed: audioSpeed
                        });
                        setIsVoiceSettingsOpen(false);
                        toast.success(t('settingsPersisted') || 'Voice Settings Applied ✨', { icon: '🎙️' });
                      }}
                        className="flex-[2] h-10 sm:h-11 rounded-2xl text-sm font-bold text-white transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {t('applySettings')}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <React.Suspense fallback={null}>
        <PremiumUpsellModal />
        {renderNewCaseModal()}




        <LegalToolkitCard
          isOpen={activeLegalToolkit}
          onClose={() => {
            setActiveLegalToolkit(false);
            // RESET ALL: Ensure we go back to the main dashboard definitively
            if (!activeCaseId) {
              setCurrentMode(MODES.NORMAL_CHAT);
              setLegalView('CHAT');
              setSelectedLegalTool(null);
              setActiveTool(null);
              localStorage.setItem('aisa_legal_view', 'CHAT');
            }
          }}
          isAdmin={isAdminUser}
          unlockedTools={unlockedTools}
          onSelect={(tool, isUnlocked) => {
            if (tool.id === 'legal_general_chat' || tool.id === 'legal_free_chat') {
              const toolId = 'legal_general_chat';
              manualToolSelectionRef.current = toolId;
              activateToolWithTypingEffect(toolId, tool.name, true);
              navigate(`${location.pathname}?tool=${toolId}`, { replace: true });
              return;
            }
            if (tool.id === 'legal_free_chat_removed_old') {
              setSelectedLegalTool(tool);
              setCurrentMode('LEGAL_TOOLKIT');
              setLegalView('CHAT');
              setActiveLegalToolkit(false);
              if (currentCase) {
                setMessages(prev => prev.filter(m => !m.isSystemLog).concat({
                  id: Date.now().toString(),
                  role: 'model',
                  content: `**Legal Chat Activated** for ${currentCase?.name} ⚖️`,
                  isSystemLog: true,
                  timestamp: Date.now(),
                }));
              }
              toast.success("Legal Chat Activated ⚖️", {
                icon: '⚖️',
                style: {
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  borderRadius: '16px',
                  border: '1px solid #bfdbfe',
                  fontWeight: 'bold'
                }
              });
              if (inputRef.current) inputRef.current.focus();
              return;
            }

            if (!isUnlocked) {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                content: `Use ${tool.name}`,
                timestamp: Date.now()
              }, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `**Premium Mode Restricted**\n\nThe **${tool.name}** tool is part of our Premium AI Legal™ suite.\n\n**To access this tool:**\n1. Select "Unlock All" to get full suite access.\n2. Or upgrade your subscription to the **FOUNDER PLAN**.\n\n*Would you like to see pricing for the AI Legal Archive?*`,
                isPremiumRestricted: true,
                timestamp: Date.now()
              }]);
              setActiveLegalToolkit(false);
              return;
            }

            if (tool.id === 'legal_my_case') {
              setIsCashFlowMode(false);
              setIsStockModalOpen(false);
              setLegalView('DASHBOARD');
              setSelectedLegalTool({ id: tool.id, name: tool.name });
              setCurrentMode('LEGAL_TOOLKIT');
              setActiveLegalToolkit(false);
              fetchLegalCases();
              // Sync URL for route-based navbar visibility
              navigate('/dashboard/cases', { replace: true });
              return;
            }

            // If we are currently inside a specific case (My Case context), stay in that context visually
            // rather than switching to a generic tool card.
            manualToolSelectionRef.current = tool.id;
            activateToolWithTypingEffect(tool.id, tool.name, true);
            // Sync URL for route-based navbar visibility
            navigate(`${location.pathname}?tool=${tool.id}`, { replace: true });

            // If a case is active, append activation message rather than clearing history
            setMessages(prev => prev.filter(m => !m.isSystemLog).concat({
              id: Date.now().toString(),
              role: 'model',
              isSystemLog: true,
              content: currentCase
                ? `**${tool.name} Activated** for ${currentCase?.name} ⚖️`
                : `**${tool.name} Activated** ⚖️`,
              timestamp: Date.now(),
            }));
            setActiveLegalToolkit(false); // Close the toolkit card upon selection
            if (inputRef.current) inputRef.current.focus();
          }}
        />
      </React.Suspense>

      {/* Gmail Connected Feature Showcase Modal */}
      <GmailConnectedModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
        onTryPrompt={(prompt) => {
          setInputValue(prompt);
          setShowGmailModal(false);
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 100);
        }}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareId={currentShareId}
        sessionTitle={messages[0]?.content || "Shared Chat"}
        sessionId={activeSessionId}
      />
      <AIHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        width={historyWidth}
        onStartResize={startResizing}
        currentSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        activeCaseId={activeCaseId}
        scope={activeCaseId ? 'case' : 'global'}
        caseName={currentCase?.name || ''}
      />
    </div>

  );
};

export default LegalWorkspace; 
