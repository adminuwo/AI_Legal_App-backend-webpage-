import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Compass, Search, Upload, Sparkles, Copy, Download, Globe, ShieldAlert, CheckCircle2,
  Shield, FileText, Scale, AlertTriangle, MapPin, Check, ArrowRight, ArrowLeft, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROADMAP_PHASES = [
  { step: 'Phase 1', title: 'Pre-litigation Notice & Demand', desc: 'Dispatch statutory demand notice under Sec 138 NI Act giving 15-day cure period.', status: 'Complete' },
  { step: 'Phase 2', title: 'Plaint / Petition Drafting & Filing', desc: 'File formal criminal complaint in Metropolitan Magistrate Court with verified affidavit.', status: 'Active' },
  { step: 'Phase 3', title: 'Interim Application & Injunction Arguments', desc: 'Seek interim attachment of accused commercial accounts under Sec 143A NI Act (20% deposit).', status: 'Upcoming' },
  { step: 'Phase 4', title: 'Framing of Issues & Evidence Affidavit', desc: 'Submit Complainant CW-1 Evidence Affidavit along with certified bank return memos.', status: 'Upcoming' },
  { step: 'Phase 5', title: 'Cross-Examination of Witness', desc: 'Cross-examine defense witness on lack of notice response and admitted cheque signature.', status: 'Upcoming' },
  { step: 'Phase 6', title: 'Final Oral Submissions & Judgment Enforcement', desc: 'Lead final arguments on mandatory double cheque compensation under Sec 138.', status: 'Upcoming' }
];

export default function LegalStrategyEngineModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [manualFacts, setManualFacts] = useState('Dishonoured cheque of Rs 25,00,000 issued by Apex Logistics Pvt Ltd. Return Memo confirms "Funds Insufficient". Notice served on 12th May 2026.');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Step 2: Processing State
  const [isCompiling, setIsCompiling] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(files.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' })));
      toast.success(`Ingested ${files.length} pleading document(s)`);
    }
  };

  const startStrategyCompilation = () => {
    setCurrentStep(2);
    setIsCompiling(true);
    setProgressPct(15);
    setProgressStatus('Uploading Document & Ingesting Pleadings...');

    const statuses = [
      { pct: 35, text: 'Extracting Text & OCR Parsing...' },
      { pct: 55, text: 'Analyzing Legal Facts & Material Claims...' },
      { pct: 75, text: 'Finding Applicable Statutory Laws (BNS / CPC)...' },
      { pct: 90, text: 'Generating 6-Phase Litigation Roadmap...' },
      { pct: 100, text: 'Legal Strategy Compilation Complete!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setProgressPct(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsCompiling(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 1000);
    });
  };

  const handleExportBrief = () => {
    toast.success('Exporting Comprehensive Strategy Brief (PDF)...');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-5xl h-[90vh] bg-white dark:bg-[#111111] border border-[#C8A34D]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="px-8 py-5 bg-[#111111] border-b border-[#C8A34D]/30 flex items-center justify-between shrink-0 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Legal Strategy Engine</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Tactical Litigation Suite
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 3 • {currentStep === 1 ? 'Context & Pleadings' : currentStep === 2 ? 'Strategy Compilation' : '6 Strategic Intelligence Pillars'}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="px-8 py-3 bg-[#181818] border-b border-slate-800 flex items-center justify-between text-xs font-semibold shrink-0 overflow-x-auto">
            {[
              { num: 1, label: '1. Ingest Case Brief' },
              { num: 2, label: '2. Compile Strategy' },
              { num: 3, label: '3. 6 Strategic Pillars' },
            ].map(step => (
              <div 
                key={step.num}
                onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl cursor-pointer transition-all ${
                  currentStep === step.num
                    ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                    : currentStep > step.num
                    ? 'text-[#C8A34D]'
                    : 'text-slate-500'
                }`}
              >
                <span>{step.label}</span>
                {currentStep > step.num && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            ))}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111]">
            {/* STEP 1: INGESTION */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Litigation Context & Facts Ingestion</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Describe case summary or upload pleadings to compile tactical roadmap.</p>
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {/* Factual Brief Textarea */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Manual Case Factual Brief</label>
                    <textarea 
                      rows={4}
                      value={manualFacts}
                      onChange={(e) => setManualFacts(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      placeholder="Type case facts, claims, or dispute background..."
                    />
                  </div>

                  {/* Upload */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Upload Court Pleadings & Orders</label>
                    <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#111111] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-8 h-8 text-[#C8A34D] mb-2" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Click to upload plaints, petitions or orders</span>
                      <span className="text-[10px] text-slate-400 mt-1">PDF, DOCX supported</span>
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PROCESSING */}
            {currentStep === 2 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Compiling 6 Strategic Intelligence Pillars</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: 6 STRATEGIC PILLARS */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* 3 Metric Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Readiness Score */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Case Readiness Rating</span>
                      <h4 className="text-2xl font-black text-[#C8A34D] mt-0.5">80% Readiness</h4>
                      <span className="text-[9px] text-emerald-400 font-semibold">Pleadings Verified</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
                      <Compass className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Litigation Stage */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Litigation Stage</span>
                      <h4 className="text-xl font-black text-white mt-1">Pre-Trial Stage</h4>
                      <span className="text-[9px] text-slate-400">Notice Period Expired</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-slate-800 flex items-center justify-center text-white">
                      <Layers className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</span>
                      <h4 className="text-xl font-black text-amber-400 mt-1">Medium Risk</h4>
                      <span className="text-[9px] text-slate-400">Procedural Patch Required</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* 6 Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'overview', label: '📊 Executive Overview' },
                    { id: 'opponent', label: '🛡️ Opponent Strategy' },
                    { id: 'evidence', label: '📑 Evidentiary Audit' },
                    { id: 'arguments', label: '🏛️ Statutory & Case Law' },
                    { id: 'risk', label: '⚠️ Risk Management' },
                    { id: 'roadmap', label: '🗺️ 6-Phase Roadmap' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/40 font-black shadow-md'
                          : 'bg-white dark:bg-[#181818] text-slate-400 hover:text-white border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {activeTab === 'overview' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Executive Strategy Synthesis</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        Complainant has established a strong statutory foundation under Section 138 NI Act following cheque dishonour. Rebuttal strategy focuses on overcoming potential security cheque claims using binding SC precedent.
                      </div>
                    </div>
                  )}

                  {activeTab === 'opponent' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Opposing Counsel Strategy & Counter-Rebuttals</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                        <span className="font-bold text-[#C8A34D] block">Anticipated Opponent Defense: Security Cheque Plea</span>
                        <p className="text-slate-300">Opponent will claim cheque was handed over as an advance security deposit.</p>
                        <p className="text-emerald-400 font-semibold">Counter-Rebuttal: Cite Rangappa v. Sri Mohan (2010 SC) establishing Sec 139 presumption covers security cheques.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'evidence' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Evidentiary Strength & Missing Proof Alerts</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">✔ Original Cheque Ex P-1 (High Evidentiary Value)</span>
                        <span className="font-bold text-amber-400 flex items-center gap-1">⚠️ Missing Section 65B BSA Affidavit for WhatsApp screenshots</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'arguments' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Statutory Provisions & Binding Precedents</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <p className="font-bold text-[#C8A34D]">• Section 138 / Section 139 Negotiable Instruments Act 1881</p>
                        <p className="font-bold text-[#C8A34D]">• Rangappa v. Sri Mohan (2010 11 SCC 441)</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'risk' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Risk Management & Exposure Mitigation Matrix</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <p className="font-bold text-rose-400">Risk: Delay in postal tracking service confirmation</p>
                        <p className="text-slate-300">Mitigation: Obtain certified tracking log report from Postmaster under Sec 114 Evidence Act.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'roadmap' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">6-Phase Tactical Litigation Roadmap</h4>
                      <div className="space-y-2">
                        {ROADMAP_PHASES.map((r, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30">
                                  {r.step}
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg shrink-0 ${
                              r.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400' : r.status === 'Active' ? 'bg-[#C8A34D]/20 text-[#C8A34D]' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep === 1 && (
              <button 
                onClick={startStrategyCompilation}
                className="ml-auto px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Compile Legal Strategy
              </button>
            )}

            {currentStep === 3 && (
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#222222] text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
                >
                  Close Strategy
                </button>

                <button 
                  onClick={handleExportBrief}
                  className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
                >
                  <Download className="w-4 h-4" /> Export Strategy Brief (PDF)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
