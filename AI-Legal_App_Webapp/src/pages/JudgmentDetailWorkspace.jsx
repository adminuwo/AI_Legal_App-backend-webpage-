import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bookmark, BookmarkCheck, Plus, Share2, Copy, 
  Download, Printer, Sparkles, Brain, FileText, Scale, Landmark,
  ShieldCheck, HelpCircle, Network, Check, ExternalLink, X, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import caseSearchService from '../services/caseSearchService';
import JudgmentDocumentViewer from '../Components/CaseSearch/JudgmentDocumentViewer';
import CaseInfoPanel from '../Components/CaseSearch/CaseInfoPanel';
import JudgmentBottomBar from '../Components/CaseSearch/JudgmentBottomBar';
import StructuredSummaryModal from '../Components/CaseSearch/StructuredSummaryModal';
import DeepAnalysisModal from '../Components/CaseSearch/DeepAnalysisModal';
import JudgmentChatSidebar from '../Components/CaseSearch/JudgmentChatSidebar';
import ContextualAuthModal from '../Components/CaseSearch/ContextualAuthModal';
import AddToCaseModal from '../Components/CaseSearch/AddToCaseModal';

export default function JudgmentDetailWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [judgment, setJudgment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Modals & Drawers state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAddToCaseOpen, setIsAddToCaseOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionName, setAuthActionName] = useState('save this judgment');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [injectedChatPrompt, setInjectedChatPrompt] = useState(null);

  // Check auth
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token && token !== 'null' && token !== 'undefined';

  useEffect(() => {
    async function loadCase() {
      setLoading(true);
      try {
        const data = await caseSearchService.getJudgmentById(id);
        setJudgment(data);
        if (data) {
          setIsBookmarked(caseSearchService.isJudgmentBookmarked(data.id));
        }
      } catch (err) {
        console.error('Failed to load judgment:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [id]);

  const handleBack = () => {
    // Return to search preserving query/filters state
    if (location.state) {
      navigate('/case-search', { state: location.state });
    } else {
      navigate('/case-search');
    }
  };

  const handleToggleBookmark = () => {
    if (!isLoggedIn) {
      setAuthActionName('bookmark this judgment');
      setIsAuthModalOpen(true);
      return;
    }
    if (!judgment) return;
    const res = caseSearchService.toggleBookmark(judgment);
    setIsBookmarked(res.isBookmarked);
    toast.success(res.isBookmarked ? 'Added to Saved Precedents' : 'Removed from Saved Precedents');
  };

  const handleAddToCaseClick = () => {
    if (!isLoggedIn) {
      setAuthActionName('add this judgment to your active case workspace');
      setIsAuthModalOpen(true);
      return;
    }
    setIsAddToCaseOpen(true);
  };

  const handleShare = () => {
    if (!judgment) return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${judgment.title} — AI LEGAL™`,
        text: `${judgment.title} [${judgment.citation}] (${judgment.court})`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Research link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuickPrompt = (prompt) => {
    setInjectedChatPrompt(prompt);
    // If on mobile, open mobile chat drawer
    if (window.innerWidth < 1024) {
      setIsMobileChatOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#080C14] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D] animate-pulse">
          <Scale size={24} />
        </div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
          Loading Official Law Report & Coram...
        </p>
      </div>
    );
  }

  if (!judgment) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#080C14] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <HelpCircle size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          Judgment Record Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-sm">
          The requested judgment identifier does not match any indexed law report or Supreme Court authority.
        </p>
        <button
          onClick={() => navigate('/case-search')}
          className="px-4 py-2 rounded-xl bg-[#C8A34D] text-slate-950 font-bold text-xs hover:bg-[#B38628] transition-colors cursor-pointer"
        >
          ← Return to Case Search
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#080C14] text-slate-900 dark:text-slate-100 flex flex-col pb-24">
      
      {/* ─── Top Header Workspace Bar (NORMAL FLOW - NOT STICKY) ─── */}
      <header className="relative w-full z-10 bg-white dark:bg-[#0F1523] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Back Button & Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Search</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {judgment.title}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#C8A34D]/30 shrink-0">
                  {judgment.citation}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {judgment.court} • {judgment.bench || 'Division Bench'} • {judgment.date || judgment.year}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={handleAddToCaseClick}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#C8A34D] hover:bg-[#B38628] text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              <span>Add to Case</span>
            </button>

            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={isBookmarked ? 'Bookmarked in Saved Precedents' : 'Bookmark Judgment'}
            >
              {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Share Research"
            >
              <Share2 size={14} />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer hidden sm:block"
              title="Print Law Report Dossier"
            >
              <Printer size={14} />
            </button>
          </div>

        </div>
      </header>

      {/* ─── Master Body: Metadata + Central Document Viewer + Desktop AI Assistant ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 sm:px-8 space-y-6">
        
        {/* 1. Case Information & Coram Panel */}
        <CaseInfoPanel judgment={judgment} />

        {/* 2. Workspace Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Central Law Report Document Viewer (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            <JudgmentDocumentViewer judgment={judgment} />

            {/* Citations & Precedents Network Card */}
            {judgment.precedentsCited && judgment.precedentsCited.length > 0 && (
              <div className="bg-white dark:bg-[#0F1523] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#C8A34D] flex items-center justify-center border border-[#C8A34D]/30">
                    <Network size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Connected Citations & Precedents
                    </h3>
                    <p className="text-xs text-slate-500">
                      Authorities cited and examined within this judgment
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {judgment.precedentsCited.map((cite, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {cite}
                      </span>
                      <button
                        onClick={() => {
                          navigate('/case-search', { state: { initialQuery: cite } });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#B38628] dark:text-amber-300 font-bold border border-[#C8A34D]/30 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Search Authority</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right AI Legal Research Assistant (4 cols on desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-6 h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <JudgmentChatSidebar 
              judgment={judgment}
              injectedPrompt={injectedChatPrompt}
            />
          </div>

        </div>

      </main>

      {/* ─── Fixed Bottom AI Action Bar ─── */}
      <JudgmentBottomBar
        onOpenChat={() => {
          if (window.innerWidth < 1024) {
            setIsMobileChatOpen(true);
          } else {
            // Scroll right sidebar into view or highlight
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenSummary={() => setIsSummaryOpen(true)}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onQuickPrompt={handleQuickPrompt}
      />

      {/* ─── 14-Section Structured Legal Summary Modal ─── */}
      <StructuredSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        judgment={judgment}
      />

      {/* ─── 13-Section Deep Jurisprudential Analysis Modal ─── */}
      <DeepAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        judgment={judgment}
      />

      {/* ─── Add To Case Workspace Modal ─── */}
      <AddToCaseModal
        isOpen={isAddToCaseOpen}
        onClose={() => setIsAddToCaseOpen(false)}
        judgment={judgment}
      />

      {/* ─── Contextual Authentication Modal ─── */}
      <ContextualAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        actionName={authActionName}
      />

      {/* ─── Mobile Floating AI Assistant Drawer ─── */}
      <AnimatePresence>
        {isMobileChatOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 lg:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md h-full bg-white dark:bg-[#111622] shadow-2xl flex flex-col"
            >
              <JudgmentChatSidebar
                judgment={judgment}
                injectedPrompt={injectedChatPrompt}
                onClose={() => setIsMobileChatOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
