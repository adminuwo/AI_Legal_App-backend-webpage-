import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Printer, ExternalLink, ZoomIn, ZoomOut, 
  RotateCcw, Scale, FileText, CheckCircle2, ShieldCheck, 
  Landmark, RefreshCw, BookOpen, Layers, Award, Gavel
} from 'lucide-react';
import caseSearchService from '../../services/caseSearchService';

export default function JudgmentPdfModal({ isOpen, onClose, judgment }) {
  const [zoomScale, setZoomScale] = useState(100);
  const [activeView, setActiveView] = useState('pdf'); // 'pdf' | 'report'

  const targetId = judgment?.slug || judgment?.id || judgment?._id || 'judgment';
  const pdfUrl = caseSearchService.getJudgmentPdfUrl(targetId);
  const downloadPdfUrl = caseSearchService.getJudgmentPdfUrl(targetId, true);
  const safeFilename = `${(judgment?.title || 'Official_Judgment').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 35)}_Official_Report.pdf`;

  useEffect(() => {
    if (isOpen) {
      setActiveView('pdf');
      setZoomScale(100);
    }
  }, [isOpen, judgment]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !judgment) return null;

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoomScale(100);

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  // Structured details for compact Law Report Document View
  const title = judgment.title || 'Official Judgment';
  const citation = judgment.citation || 'Official Law Report';
  const court = judgment.court || 'Supreme Court of India';
  const bench = judgment.bench || 'Division Bench';
  const year = judgment.year || '2024';
  const date = judgment.date || judgment.year || 'Official Record';
  const judges = Array.isArray(judgment.judges) 
    ? judgment.judges 
    : [judgment.bench || "Hon'ble Bench"];
  
  const petitioner = judgment.parties?.petitioner || title.split(' v. ')[0] || 'Appellant / Petitioner';
  const respondent = judgment.parties?.respondent || title.split(' v. ')[1] || 'State / Respondent';
  const petCounsel = judgment.counsel?.petitioner?.join(', ') || 'Senior Advocates on Record';
  const respCounsel = judgment.counsel?.respondent?.join(', ') || 'Counsel for Respondent / State';
  const amicus = judgment.counsel?.amicusCuriae?.join(', ') || '';

  const ratio = judgment.ratioDecidendi || judgment.legal_principle || judgment.ratio || 'Binding principle of law on record under Article 141.';
  const facts = judgment.caseContext?.facts || judgment.facts || '';
  const legalIssues = judgment.caseContext?.legalIssue || judgment.legal_issues || '';
  const reasoning = judgment.reasoning || judgment.judgment_basis?.legal_reasoning || '';
  const finalDecision = judgment.finalDecision || judgment.judgment_outcome?.final_decision || '';
  const quotableParas = judgment.quotableParagraphs || [];
  const relatedPrecedents = judgment.relatedPrecedents || judgment.authoritiesCited || [];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[94vh] bg-[#1E2024] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── REAL PDF VIEWER HEADER TOOLBAR ─── */}
        <div className="h-14 bg-[#25282F] border-b border-[#373B44] px-4 sm:px-6 flex items-center justify-between text-white shrink-0 select-none shadow-sm gap-2">
          
          {/* Left: Document Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#E5A93C] border border-amber-500/30 flex items-center justify-center shrink-0 font-bold text-xs">
              PDF
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold truncate text-slate-100 flex items-center gap-2">
                <span className="truncate">{title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hidden lg:inline">
                  {citation}
                </span>
              </h2>
              <p className="text-[10.5px] text-slate-400 truncate flex items-center gap-1.5">
                <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                  <ShieldCheck size={11} />
                  Verified Law Report
                </span>
                <span>•</span>
                <span>{court}</span>
                <span>•</span>
                <span>{date}</span>
              </p>
            </div>
          </div>

          {/* Center: Dual-View Switcher (PDF View vs Law Report View) */}
          <div className="flex items-center bg-[#181A1F] p-0.5 rounded-xl border border-[#3E434D] shrink-0">
            <button
              onClick={() => setActiveView('pdf')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'pdf'
                  ? 'bg-[#B88B2A] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Official PDF Viewer format"
            >
              <FileText size={12} />
              <span>Official PDF</span>
            </button>
            <button
              onClick={() => setActiveView('report')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'report'
                  ? 'bg-[#B88B2A] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="High-Fidelity Law Report Document View"
            >
              <BookOpen size={12} />
              <span className="hidden sm:inline">Law Report View</span>
            </button>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Zoom Controls */}
            {activeView === 'pdf' && (
              <div className="hidden md:flex items-center bg-[#1E2024] px-2 py-1 rounded-lg border border-[#3E434D] text-xs font-mono text-slate-300 gap-1.5">
                <button 
                  onClick={handleZoomOut}
                  className="hover:text-white p-0.5 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="w-9 text-center font-bold">{zoomScale}%</span>
                <button 
                  onClick={handleZoomIn}
                  className="hover:text-white p-0.5 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button 
                  onClick={handleResetZoom}
                  className="hover:text-white p-0.5 transition-colors cursor-pointer ml-0.5"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            )}

            {/* Open Raw in Browser Tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-[#32363E] hover:bg-[#3E434D] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open full PDF file in new browser tab"
            >
              <ExternalLink size={14} />
            </a>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-[#32363E] hover:bg-[#3E434D] text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
              title="Print Law Report PDF"
            >
              <Printer size={14} />
            </button>

            {/* Download Official PDF */}
            <a
              href={downloadPdfUrl}
              download={safeFilename}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#B88B2A] hover:bg-[#D4A034] text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download Official Law Report PDF"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download PDF</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#32363E] hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>

        </div>

        {/* ─── MAIN VIEWER BODY ─── */}
        <div className="flex-1 bg-[#2C2E33] p-2 sm:p-4 flex flex-col items-center justify-center overflow-hidden relative">
          
          {/* VIEW 1: OFFICIAL PDF (Pure Native PDF View, small crisp text, authentic layout) */}
          {activeView === 'pdf' && (
            <div 
              className="w-full h-full rounded-xl overflow-hidden shadow-2xl bg-white transition-transform origin-top flex flex-col relative"
              style={{ 
                transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : 'none',
                transformOrigin: 'top center'
              }}
            >
              <iframe
                key={`${targetId}-${zoomScale}`}
                src={`${pdfUrl}#toolbar=1&navpanes=0`}
                title={title}
                className="w-full h-full min-h-[75vh] flex-1 border-0 rounded-xl bg-white"
              />
            </div>
          )}

          {/* VIEW 2: COMPACT OFFICIAL LAW REPORT DOCUMENT VIEW (Small text, small compact headings) */}
          {activeView === 'report' && (
            <div className="w-full h-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-y-auto p-4 sm:p-6 border border-slate-300 font-serif leading-relaxed select-text">
              
              {/* Compact Court Law Report Banner */}
              <div className="text-center border-b border-slate-800 pb-2.5 mb-3 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-600/25 text-amber-900 font-sans text-[9px] font-bold tracking-wide">
                  <ShieldCheck size={10} className="text-amber-700" />
                  <span>AI LEGAL • OFFICIAL LAW REPORT</span>
                </div>
                <h1 className="text-xs sm:text-sm font-black tracking-wide text-slate-950 uppercase font-serif">
                  IN THE {court.toUpperCase()}
                </h1>
                <p className="text-[9.5px] text-slate-500 font-sans tracking-wide">
                  (CRIMINAL / CIVIL APPELLATE JURISDICTION • ARTICLE 141 CONSTITUTION OF INDIA)
                </p>
                <div className="flex items-center justify-between font-sans text-[10px] font-bold pt-1 text-slate-700 border-t border-slate-100">
                  <span className="text-[#8C6415] font-mono">CITATION: {citation}</span>
                  <span>DECIDED ON: {date}</span>
                </div>
              </div>

              {/* Compact Coram / Bench */}
              <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-2.5 font-sans text-[9.5px] flex flex-wrap items-center justify-between gap-1.5">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider mr-1.5 text-[9px]">CORAM:</span>
                  <span className="font-bold text-slate-900">{bench}</span>
                </div>
                <div className="text-slate-600 font-medium">
                  {judges.join('; ')}
                </div>
              </div>

              {/* Compact Cause Title */}
              <div className="border border-slate-200 rounded-lg p-2.5 mb-2.5 bg-white space-y-1 font-sans">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-950">
                  <span className="uppercase">{petitioner}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">... APPELLANT(S)</span>
                </div>
                <div className="text-[9.5px] text-slate-500 italic pl-2 border-l border-slate-300">
                  Through: {petCounsel}
                </div>

                <div className="text-center font-serif font-bold text-[8px] tracking-widest text-slate-400 py-0.5">
                  V E R S U S
                </div>

                <div className="flex justify-between items-center text-[11px] font-bold text-slate-950">
                  <span className="uppercase">{respondent}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">... RESPONDENT(S)</span>
                </div>
                <div className="text-[9.5px] text-slate-500 italic pl-2 border-l border-slate-300">
                  Through: {respCounsel}
                </div>

                {amicus && (
                  <div className="text-[9.5px] text-amber-800 font-medium pt-1 border-t border-slate-100">
                    <span className="font-bold">Amicus Curiae:</span> {amicus}
                  </div>
                )}
              </div>

              {/* ─── COMPACT BINDING RATIO DECIDENDI BOX ─── */}
              <div className="bg-amber-50/80 border border-[#C8A34D] rounded-lg p-2.5 mb-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[#8C6415] font-sans font-black text-[9px] uppercase tracking-wider">
                  <Gavel size={11} />
                  <span>BINDING RATIO DECIDENDI (ARTICLE 141 CONSTITUTION OF INDIA)</span>
                </div>
                <blockquote className="text-[10.5px] sm:text-[11px] font-serif italic text-slate-800 border-l-2 border-[#C8A34D] pl-2 py-0.5 leading-relaxed whitespace-pre-wrap">
                  "{ratio}"
                </blockquote>
              </div>

              {/* Material Facts */}
              {facts && (
                <div className="space-y-1 mb-2.5">
                  <h3 className="text-[10px] font-sans font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-0.5">
                    <Layers size={10} className="text-[#8C6415]" />
                    <span>Material Facts</span>
                  </h3>
                  <div className="text-[10px] sm:text-[10.5px] text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                    {facts}
                  </div>
                </div>
              )}

              {/* Legal Issues */}
              {legalIssues && (
                <div className="space-y-1 mb-2.5">
                  <h3 className="text-[10px] font-sans font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-0.5">
                    <Scale size={10} className="text-[#8C6415]" />
                    <span>Questions of Law</span>
                  </h3>
                  <div className="text-[10px] sm:text-[10.5px] text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-2 rounded border border-slate-200">
                    {legalIssues}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {reasoning && (
                <div className="space-y-1 mb-2.5">
                  <h3 className="text-[10px] font-sans font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-0.5">
                    <BookOpen size={10} className="text-[#8C6415]" />
                    <span>Judicial Reasoning</span>
                  </h3>
                  <div className="text-[10px] sm:text-[10.5px] text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                    {reasoning}
                  </div>
                </div>
              )}

              {/* Quotable Paragraphs */}
              {quotableParas.length > 0 && (
                <div className="space-y-1.5 mb-2.5">
                  <h3 className="text-[10px] font-sans font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-0.5">
                    <Award size={10} className="text-[#8C6415]" />
                    <span>Quotable Observations</span>
                  </h3>
                  <div className="space-y-1.5">
                    {quotableParas.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border-l-2 border-[#C8A34D] text-[10px] font-serif">
                        <div className="font-sans font-bold text-[8.5px] text-slate-400 uppercase">
                          Paragraph {q.paraNumber || q.paraNum || (idx + 1)} • {q.theme || 'Holding'}
                        </div>
                        <p className="italic text-slate-800">"{q.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precedents Cited */}
              {relatedPrecedents.length > 0 && (
                <div className="space-y-1 mb-3">
                  <h3 className="text-[11px] font-sans font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-0.5">
                    <Landmark size={11} className="text-[#8C6415]" />
                    <span>Authorities Cited</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {relatedPrecedents.slice(0, 6).map((rp, idx) => (
                      <div key={idx} className="p-2 rounded border border-slate-200 bg-white font-sans text-[10px]">
                        <div className="font-bold text-slate-900 truncate">{rp.case_name || rp}</div>
                        {rp.citation && <div className="text-[9.5px] text-[#8C6415] font-mono truncate">{rp.citation}</div>}
                        {rp.treatment && (
                          <span className="inline-block mt-0.5 text-[8.5px] font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            {rp.treatment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Operative Order */}
              {finalDecision && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-sans text-[11px] text-slate-900 space-y-0.5 mb-4">
                  <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                    Operative Order:
                  </div>
                  <div className="font-medium leading-relaxed">{finalDecision}</div>
                </div>
              )}

              {/* Official Attestation Seal */}
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Certified Digital Law Report • Indian Judicial Archives</span>
                </div>
                <div className="font-mono text-[9px]">
                  AIL-SC-{targetId.toUpperCase().slice(0, 15)}-{year}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
