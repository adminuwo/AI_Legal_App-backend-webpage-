import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bookmark, BookmarkCheck, Plus, Share2, Copy, Download, 
  Search, ZoomIn, ZoomOut, Printer, Landmark, Scale, Calendar, Users, 
  Brain, FileText, Network, Sparkles, Check, MessageSquare, AlertCircle,
  HelpCircle, ShieldCheck, Tag, ExternalLink, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import JudgmentAIAnalysisTab from './JudgmentAIAnalysisTab';
import JudgmentChatSidebar from './JudgmentChatSidebar';
import caseSearchService from '../../services/caseSearchService';

export default function JudgmentReader({
  judgment,
  onBack,
  onAddToCase,
  isBookmarked,
  onToggleBookmark
}) {
  const [activeTab, setActiveTab] = useState('judgment'); // 'judgment' | 'analysis' | 'citations'
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(14); // 12 to 22 px
  const [isCopiedCitation, setIsCopiedCitation] = useState(false);
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false);

  if (!judgment) return null;

  const handleCopyCitation = () => {
    const text = `${judgment.title}, ${judgment.citation} (${judgment.court})`;
    navigator.clipboard.writeText(text);
    setIsCopiedCitation(true);
    toast.success('Citation copied to clipboard!');
    setTimeout(() => setIsCopiedCitation(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: judgment.title,
        text: `${judgment.title} — ${judgment.citation}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Judgment research link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Search highlighter in text
  const renderHighlightedText = (text) => {
    if (!docSearchQuery || !docSearchQuery.trim()) {
      return text;
    }
    const parts = text.split(new RegExp(`(${docSearchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === docSearchQuery.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-black px-0.5 rounded font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-100 dark:bg-[#080C14]">
      
      {/* ─── Top Header Workspace Bar (NORMAL FLOW - NOT STICKY TO PREVENT OVERLAY) ─── */}
      <div className="relative w-full z-10 bg-white dark:bg-[#0F1523] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Back Button & Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Search</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {judgment.title}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/40 text-[#B38628] border border-[#B88B2A]/30 shrink-0">
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
              onClick={() => onAddToCase(judgment)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#B88B2A] hover:bg-[#B38628] text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              <span>Add to Case</span>
            </button>

            <button
              onClick={() => onToggleBookmark(judgment)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Bookmark Judgment'}
            >
              {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>

            <button
              onClick={handleCopyCitation}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Copy Official Citation"
            >
              {isCopiedCitation ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Share Precedent"
            >
              <Share2 size={14} />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer hidden sm:block"
              title="Print Dossier"
            >
              <Printer size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* ─── Main Split Body: Content on Left (col-span-8), AI Sidebar on Right (col-span-4) ─── */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 sm:px-8">
        
        {/* Left Column: Research Tabs & Judgment Viewer (col-span-8) */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between bg-white dark:bg-[#111622] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('judgment')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'judgment'
                    ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText size={13} />
                <span>Original Judgment</span>
              </button>

              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'analysis'
                    ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Brain size={13} />
                <span>AI Legal Analysis</span>
              </button>

              <button
                onClick={() => setActiveTab('citations')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'citations'
                    ? 'bg-[#111827] text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Network size={13} />
                <span>Citations & Precedents</span>
              </button>
            </div>

            {/* Mobile AI Drawer Toggle Button */}
            <button
              onClick={() => setIsMobileAiOpen(true)}
              className="lg:hidden px-3 py-1.5 rounded-xl bg-amber-500/15 text-[#B38628] text-xs font-bold flex items-center gap-1"
            >
              <Sparkles size={12} />
              <span>Ask AI</span>
            </button>
          </div>

          {/* TAB 1: ORIGINAL JUDGMENT VIEWER */}
          {activeTab === 'judgment' && (
            <div className="bg-white dark:bg-[#111622] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Document Reading Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                {/* Search In Document */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-full sm:w-64">
                  <Search size={13} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find in judgment text..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-full"
                  />
                  {docSearchQuery && (
                    <button onClick={() => setDocSearchQuery('')} className="text-slate-400 hover:text-black">
                      ×
                    </button>
                  )}
                </div>

                {/* Font Scaling Controls */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium px-1">Text size:</span>
                  <button
                    onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                    className="p-1 rounded text-slate-500 hover:text-black dark:hover:text-white"
                    title="Zoom Out Font"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-1.5 text-slate-600 dark:text-slate-300">
                    {fontSize}px
                  </span>
                  <button
                    onClick={() => setFontSize(Math.min(22, fontSize + 1))}
                    className="p-1 rounded text-slate-500 hover:text-black dark:hover:text-white"
                    title="Zoom In Font"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              {/* ─── Structured Court Law Report Header ─── */}
              <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                
                {/* Court Emblem & Name */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center shrink-0 border border-[#B88B2A]/30">
                    <Landmark size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {judgment.court || 'Supreme Court of India'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {judgment.caseType || 'Original Jurisdiction'} • {judgment.caseNumber || 'Writ Petition'}
                    </p>
                  </div>
                </div>

                {/* Title & Official Citations */}
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-snug">
                    {judgment.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#B88B2A]/15 text-[#B38628] dark:text-amber-300 border border-[#B88B2A]/40">
                      {judgment.citation}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Decided on: {judgment.date || judgment.year}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Final Disposal
                    </span>
                  </div>
                </div>

                {/* Detailed Coram / Bench */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-500 shrink-0 w-24">Bench Coram:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {judgment.bench || 'Constitutional Bench'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-500 shrink-0 w-24">Hon'ble Judges:</span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {(judgment.judges || []).map((j, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>

                  {judgment.counsel && (
                    <>
                      {judgment.counsel.petitioner && (
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="font-bold text-slate-500 shrink-0 w-24">For Petitioner:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {judgment.counsel.petitioner.join(', ')}
                          </span>
                        </div>
                      )}
                      {judgment.counsel.respondent && (
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-slate-500 shrink-0 w-24">For Respondent:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {judgment.counsel.respondent.join(', ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Subject Tags */}
                  {judgment.subjectTags && judgment.subjectTags.length > 0 && (
                    <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="font-bold text-slate-500 shrink-0 w-24">Subjects:</span>
                      <div className="flex flex-wrap gap-1">
                        {judgment.subjectTags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] dark:text-amber-300 border border-[#B88B2A]/30">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Binding Ratio Decidendi Golden Callout */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-slate-900 border-2 border-[#B88B2A] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#B38628] dark:text-[#E5A93C]">
                    <Scale size={14} />
                    <span>Binding Ratio Decidendi (Precedent Law)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed italic">
                    "{judgment.ratioDecidendi}"
                  </p>
                </div>

                {/* Substantial Questions of Law / Issues Framed */}
                {judgment.caseContext?.legalIssue && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-slate-500">
                      <HelpCircle size={14} className="text-[#B88B2A]" />
                      <span>Questions of Law Determined</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-semibold">
                      {judgment.caseContext.legalIssue}
                    </p>
                  </div>
                )}

              </div>

              {/* ─── Verbatim Full Judgment Text ─── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Official Judgment Text
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Verbatim Law Report Excerpt
                  </span>
                </div>

                <div 
                  className="font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text selection:bg-[#B88B2A]/30"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                >
                  {renderHighlightedText(judgment.fullTextExcerpt || judgment.facts || 'Full judgment report is being synchronized.')}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AI ANALYSIS REPORT */}
          {activeTab === 'analysis' && (
            <JudgmentAIAnalysisTab judgment={judgment} />
          )}

          {/* TAB 3: CITATIONS & PRECEDENTS NETWORK */}
          {activeTab === 'citations' && (
            <div className="bg-white dark:bg-[#111622] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Citations & Precedents Network
                </h3>
                <p className="text-xs text-slate-500">
                  Judicial lineage, authorities relied upon, and subsequent treatment
                </p>
              </div>

              {/* Section 1: Authorities Relied Upon */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#B38628] dark:text-amber-400">
                  1. Precedents Relied Upon / Cited in this Judgment
                </h4>
                <div className="space-y-2">
                  {(judgment.precedentsCited || ['A.K. Gopalan v. State of Madras (1950) SCR 88', 'I.C. Golak Nath v. State of Punjab (1967) 2 SCR 762']).map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{item}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[#B38628] dark:text-amber-300">
                        Examined
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Subsequent Treatment */}
              {judgment.subsequentTreatment && judgment.subsequentTreatment.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    2. Subsequent Landmark Rulings Following / Applying This Precedent
                  </h4>
                  <div className="space-y-2">
                    {judgment.subsequentTreatment.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>{item}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Followed & Applied
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Statutory Provisions Considered */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  3. Statutes & Provisions Subjected to Interpretation
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(judgment.sections || judgment.applicableStatutes || ['Article 21', 'Article 14']).map((stat, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: AI Legal Research Assistant Sidebar (col-span-4) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6 h-[calc(100vh-80px)] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <JudgmentChatSidebar judgment={judgment} />
        </div>

      </div>

      {/* Mobile Floating AI Assistant Drawer */}
      <AnimatePresence>
        {isMobileAiOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 lg:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-sm h-full bg-white dark:bg-[#111622] shadow-2xl flex flex-col"
            >
              <div className="p-3 flex justify-end border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsMobileAiOpen(false)}
                  className="p-1 text-slate-500 hover:text-black font-bold text-xs"
                >
                  Close AI
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <JudgmentChatSidebar judgment={judgment} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
