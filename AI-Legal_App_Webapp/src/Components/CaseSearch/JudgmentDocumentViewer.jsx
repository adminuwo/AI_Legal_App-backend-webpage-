import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Search, ArrowUp, ArrowDown, 
  RotateCcw, Printer, Download, Bookmark, Landmark, Scale, 
  FileText, Check, Copy, ExternalLink, ChevronRight, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JudgmentDocumentViewer({ judgment }) {
  const [fontSize, setFontSize] = useState(15); // 13px to 24px
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeSection, setActiveSection] = useState('full-text');
  
  const containerRef = useRef(null);
  const textContentRef = useRef(null);

  if (!judgment) return null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    const header = `================================================================================
${judgment.court || 'SUPREME COURT OF INDIA'}
${judgment.caseType || 'APPELLATE JURISDICTION'} — ${judgment.caseNumber || 'CIVIL/CRIMINAL'}
================================================================================
CASE TITLE: ${judgment.title}
CITATION:   ${judgment.citation}
DECIDED ON: ${judgment.date || judgment.year}
BENCH:      ${judgment.bench || 'Division Bench'}
CORAM:      ${(judgment.judges || []).join(', ')}
${judgment.counsel?.petitioner ? `COUNSEL FOR PETITIONER: ${judgment.counsel.petitioner.join(', ')}` : ''}
${judgment.counsel?.respondent ? `COUNSEL FOR RESPONDENT: ${judgment.counsel.respondent.join(', ')}` : ''}
--------------------------------------------------------------------------------
BINDING RATIO DECIDENDI:
"${judgment.ratioDecidendi || ''}"
--------------------------------------------------------------------------------
JUDGMENT TEXT:
${judgment.fullTextExcerpt || judgment.executiveSummary || ''}
================================================================================
Generated via AI LEGAL™ Research Workspace`;

    const blob = new Blob([header], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(judgment.slug || judgment.title || 'judgment').replace(/[^a-z0-9]/gi, '_')}_Official_Report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Official Law Report downloaded.');
  };

  // Search in text highlighter
  const renderHighlightedContent = (rawText) => {
    if (!rawText) return 'No judgment text available.';
    if (!searchQuery || !searchQuery.trim()) {
      return rawText;
    }

    const regex = new RegExp(`(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = rawText.split(regex);
    let matchCounter = 0;

    return parts.map((part, i) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        matchCounter++;
        const isCurrent = matchCounter === activeMatchIndex + 1;
        return (
          <mark
            key={i}
            id={`match-${matchCounter - 1}`}
            className={`px-0.5 rounded transition-colors ${
              isCurrent 
                ? 'bg-amber-400 text-black font-extrabold ring-2 ring-amber-600' 
                : 'bg-yellow-200 dark:bg-yellow-800/80 text-black dark:text-yellow-100 font-semibold'
            }`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Count search matches
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setTotalMatches(0);
      setActiveMatchIndex(0);
      return;
    }
    const text = judgment.fullTextExcerpt || judgment.executiveSummary || '';
    const regex = new RegExp(searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    setTotalMatches(matches ? matches.length : 0);
    setActiveMatchIndex(0);
  }, [searchQuery, judgment]);

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    const next = (activeMatchIndex + 1) % totalMatches;
    setActiveMatchIndex(next);
    scrollToMatch(next);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    const prev = (activeMatchIndex - 1 + totalMatches) % totalMatches;
    setActiveMatchIndex(prev);
    scrollToMatch(prev);
  };

  const scrollToMatch = (idx) => {
    setTimeout(() => {
      const el = document.getElementById(`match-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-white dark:bg-[#0F1523] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'w-full'
      }`}
    >
      {/* ─── Document Viewer Toolbar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-[#131B2E] border-b border-slate-200 dark:border-slate-800">
        
        {/* Left: In-Document Search & Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 w-48 sm:w-64 focus-within:ring-2 focus-within:ring-[#C8A34D]">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search in judgment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none w-full"
            />
            {searchQuery && (
              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {totalMatches > 0 ? `${activeMatchIndex + 1}/${totalMatches}` : '0'}
              </span>
            )}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs px-0.5"
              >
                ×
              </button>
            )}
          </div>

          {totalMatches > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMatch}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                title="Previous match"
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={handleNextMatch}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                title="Next match"
              >
                <ArrowDown size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Middle: Jump to Section Chips */}
        <div className="hidden xl:flex items-center gap-1 text-[11px]">
          <button 
            onClick={() => scrollToSection('sec-header')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeSection === 'sec-header' ? 'bg-[#C8A34D] text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Header
          </button>
          <button 
            onClick={() => scrollToSection('sec-ratio')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeSection === 'sec-ratio' ? 'bg-[#C8A34D] text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Ratio
          </button>
          <button 
            onClick={() => scrollToSection('sec-coram')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeSection === 'sec-coram' ? 'bg-[#C8A34D] text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Coram
          </button>
          <button 
            onClick={() => scrollToSection('sec-text')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeSection === 'sec-text' ? 'bg-[#C8A34D] text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Judgment Text
          </button>
        </div>

        {/* Right: Zoom, Fullscreen, Print, Download */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1 text-xs">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              className="p-1 rounded text-slate-500 hover:text-black dark:hover:text-white"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-slate-700 dark:text-slate-300">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize(Math.min(22, fontSize + 1))}
              className="p-1 rounded text-slate-500 hover:text-black dark:hover:text-white"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setFontSize(15)}
              className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white ml-0.5"
              title="Reset zoom"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* Download Law Report */}
          <button
            onClick={handleDownloadReport}
            className="p-2 rounded-xl bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Download Law Report (.txt)"
          >
            <Download size={13} />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hidden sm:block"
            title="Print Judgment Dossier"
          >
            <Printer size={13} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>

      </div>

      {/* ─── Reading Canvas (Indian Law Report Styling) ─── */}
      <div 
        ref={textContentRef}
        className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-14 space-y-8 bg-white dark:bg-[#0F1523] text-slate-900 dark:text-slate-100"
      >
        
        {/* 1. Official Court Banner */}
        <div id="sec-header" className="text-center space-y-2 border-b-2 border-slate-900 dark:border-amber-400/40 pb-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D]">
            <Landmark size={24} />
          </div>
          <h2 className="text-base sm:text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white font-serif">
            {judgment.court || 'IN THE SUPREME COURT OF INDIA'}
          </h2>
          <p className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
            {judgment.caseType || 'APPELLATE JURISDICTION'} {judgment.caseNumber ? `• ${judgment.caseNumber}` : ''}
          </p>
        </div>

        {/* 2. Title & Parties */}
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-snug font-serif">
            {judgment.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] dark:text-[#E5A93C] border border-[#C8A34D]/40">
              {judgment.citation}
            </span>
            {judgment.equivalentCitations && judgment.equivalentCitations.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Eq. Cit: {judgment.equivalentCitations.join(' | ')}
              </span>
            )}
            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Decided on: <strong className="font-semibold">{judgment.date || judgment.year}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Disposed
            </span>
          </div>
        </div>

        {/* 3. Coram & Counsel Section */}
        <div id="sec-coram" className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:w-28 shrink-0">
              Bench Composition:
            </span>
            <div className="flex-1 font-semibold text-slate-900 dark:text-white">
              <span className="text-[#B38628] dark:text-amber-400 font-bold mr-2">[{judgment.bench || 'Division Bench'}]</span>
              {(judgment.judges || []).join('; ')}
            </div>
          </div>

          {judgment.counsel?.petitioner && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:w-28 shrink-0">
                For Petitioner:
              </span>
              <div className="flex-1 text-slate-700 dark:text-slate-300">
                {judgment.counsel.petitioner.join(', ')}
              </div>
            </div>
          )}

          {judgment.counsel?.respondent && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:w-28 shrink-0">
                For Respondent:
              </span>
              <div className="flex-1 text-slate-700 dark:text-slate-300">
                {judgment.counsel.respondent.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* 4. Binding Ratio Decidendi (Gold Callout) */}
        <div id="sec-ratio" className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 dark:from-[#1A1608] dark:via-[#111622] dark:to-[#171204] border-2 border-[#C8A34D] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#B38628] dark:text-[#E5A93C]">
              <Scale size={16} />
              <span>Binding Ratio Decidendi (Article 141 Indian Constitution)</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(judgment.ratioDecidendi || '');
                toast.success('Ratio copied to clipboard!');
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#B38628] hover:bg-slate-50 text-[11px] font-bold border border-[#C8A34D]/40 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Copy size={11} />
              <span>Copy Ratio</span>
            </button>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed italic font-serif">
            "{judgment.ratioDecidendi}"
          </p>
        </div>

        {/* 5. Substantial Questions of Law / Issues Framed */}
        {judgment.caseContext?.legalIssue && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black uppercase tracking-wider text-slate-500">
              <FileText size={14} className="text-[#C8A34D]" />
              <span>Questions of Law Determined</span>
            </div>
            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-semibold">
              {judgment.caseContext.legalIssue}
            </p>
          </div>
        )}

        {/* 6. Full Verbatim Text */}
        <div id="sec-text" className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
              JUDGMENT / ORDER TEXT
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Verbatim Indian Law Report
            </span>
          </div>

          <article
            className="font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text selection:bg-[#C8A34D]/30"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.88, letterSpacing: '0.01em' }}
          >
            {renderHighlightedContent(judgment.fullTextExcerpt || judgment.executiveSummary || 'Detailed judgment transcript loading...')}
          </article>
        </div>

      </div>
    </div>
  );
}
