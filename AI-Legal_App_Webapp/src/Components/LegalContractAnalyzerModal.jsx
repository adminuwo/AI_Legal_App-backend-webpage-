import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Upload, Sparkles, Copy, Download, ShieldAlert, CheckCircle2, 
  AlertTriangle, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, FileCheck, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const AGREEMENT_TYPES = [
  'Non-Disclosure Agreement (NDA)', 'Master Services Agreement (MSA)', 
  'Commercial Lease & Rental Agreement', 'Employment Contract', 
  'Vendor & Vendor Supply Contract', 'Shareholders Agreement'
];

const CLAUSE_RISKS = [
  {
    id: 'term',
    title: 'Unilateral Termination Without Cause',
    severity: 'HIGH RISK',
    clauseText: '"Clause 12.2: Either party may terminate this agreement at any time by giving 7 days written notice without assigning any reason whatsoever."',
    riskAnalysis: '7-day termination notice creates severe operational risk for Lessee with no compensation cap or relocation window.',
    redline: '"Recommended Replacement: Either party may terminate this agreement for cause with 60 days written notice, provided all outstanding invoices are settled in full."'
  },
  {
    id: 'indemnity',
    title: 'Unlimited Liability & Uncapped Indemnity Burden',
    severity: 'CRITICAL RISK',
    clauseText: '"Clause 15.1: Party B agrees to indemnify and hold harmless Party A from any direct, indirect, consequential or third-party claims arising out of performance."',
    riskAnalysis: 'Party B assumes uncapped financial liability for indirect & consequential damages without any monetary ceiling.',
    redline: '"Recommended Replacement: Party B liability under this Section shall be capped at 100% of the total fees paid under this Agreement in the preceding 12 months, excluding indirect/consequential damages."'
  },
  {
    id: 'jurisdiction',
    title: 'Foreign Forum & Governing Law Jurisdiction',
    severity: 'MEDIUM RISK',
    clauseText: '"Clause 22.1: This Agreement shall be governed by the laws of the State of Delaware, USA, and disputes resolved exclusively in Wilmington courts."',
    riskAnalysis: 'Litigating in Delaware courts imposes prohibitive international litigation expenses for an Indian operating entity.',
    redline: '"Recommended Replacement: This Agreement shall be governed by Indian law, and disputes submitted to binding arbitration in New Delhi under the Arbitration and Conciliation Act, 1996."'
  }
];

export default function LegalContractAnalyzerModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(AGREEMENT_TYPES[0]);
  const [uploadedContract, setUploadedContract] = useState(null);

  // Step 2: Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Step 3: Audit Results
  const [auditResult, setAuditResult] = useState({
    riskRating: 'HIGH RISK',
    healthScore: 68,
    riskScorePct: 82,
    fileName: 'COMMERCIAL_LEASE_DRAFT_2026.docx',
    fileSize: '1.2 MB',
    missingClauses: [
      'Limitation of Liability Cap missing',
      'Unilateral Termination for Cause missing',
      'Arbitration & Dispute Resolution Forum missing',
      'Intellectual Property Indemnity Cap missing'
    ],
    milestones: [
      { party: 'Party A (Lessor)', duty: 'Deliver possession of premises', timeline: 'By 1st Feb 2026' },
      { party: 'Party B (Lessee)', duty: 'Pay security deposit of Rs 7,50,000', timeline: 'Within 5 days of execution' },
      { party: 'Party B (Lessee)', duty: 'Monthly rent payment of Rs 2,50,000', timeline: 'By 5th of each month' }
    ]
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedContract({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + ' MB' });
      toast.success(`Ingested ${file.name}`);
    }
  };

  const startContractAudit = () => {
    setCurrentStep(2);
    setIsProcessing(true);
    setProgressPct(10);
    setProgressStatus('Validating File Integrity & Format...');

    const statuses = [
      { pct: 25, text: 'Detecting Agreement Type & Governing Law...' },
      { pct: 40, text: 'Extracting Clause Text & Definitions...' },
      { pct: 60, text: 'Checking Contract Structure & Boilerplate Terms...' },
      { pct: 80, text: 'Running AI Risk & Liability Audit...' },
      { pct: 95, text: 'Generating Redlines & Executive Summary...' },
      { pct: 100, text: 'Contract Risk Audit Complete!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setProgressPct(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsProcessing(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 1000);
    });
  };

  const handleExportRedlines = () => {
    toast.success('Generating Redlined Contract (.docx)...');
  };

  const handleExportReport = () => {
    toast.success('Exporting Executive Risk Audit Report (PDF)...');
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
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Contract Review & Risk Audit</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Redline Intelligence Engine
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 3 • {currentStep === 1 ? 'Agreement Ingestion' : currentStep === 2 ? '9-Stage Risk Audit' : 'Executive Risk Dashboard'}
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
              { num: 1, label: '1. Upload Agreement' },
              { num: 2, label: '2. 9-Stage AI Audit' },
              { num: 3, label: '3. Risk Dashboard & Redlines' },
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

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111]">
            {/* STEP 1: INGESTION */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Contract Ingestion & Category Selection</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select agreement type & upload contract file for automated risk rating.</p>
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {/* Category Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Agreement Type Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                    >
                      {AGREEMENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Dropzone */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Upload Agreement File</label>
                    <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#111111] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-8 h-8 text-[#C8A34D] mb-2" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Click to upload agreement or drag & drop</span>
                      <span className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, TXT files (Max 25 MB)</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  {uploadedContract && (
                    <div className="p-3 rounded-2xl bg-[#111111] border border-[#C8A34D]/40 flex items-center justify-between text-xs font-mono text-white">
                      <span>📄 {uploadedContract.name} ({uploadedContract.size})</span>
                      <span className="text-[#C8A34D] font-bold">Ready for Audit</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: PROCESSING TIMELINE */}
            {currentStep === 2 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Executing 9-Stage Contract Audit</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: EXECUTIVE RISK DASHBOARD */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Executive Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Risk Badge */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Assessment</span>
                      <h4 className="text-xl font-black text-rose-500 mt-1">{auditResult.riskRating}</h4>
                      <span className="text-[9px] text-slate-400">High Exposure Clauses</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-rose-500/30 flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Contract Health Index</span>
                      <h4 className="text-2xl font-black text-[#C8A34D] mt-0.5">{auditResult.healthScore} / 100</h4>
                      <span className="text-[9px] text-[#C8A34D] font-semibold">Requires Redlining</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Risk Score Pct */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Rating Score</span>
                      <h4 className="text-2xl font-black text-white mt-0.5">{auditResult.riskScorePct}%</h4>
                      <span className="text-[9px] text-amber-400 font-semibold">3 Redline Suggestions</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-slate-800 flex items-center justify-center text-white">
                      <Layers className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Clause Risk Audit & Redlines */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">High Exposure Clause Audits & AI Redlines</h4>
                  {CLAUSE_RISKS.map(clause => (
                    <div key={clause.id} className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{clause.title}</span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {clause.severity}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-400 italic">
                        {clause.clauseText}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">{clause.riskAnalysis}</p>

                      {/* Redline Card */}
                      <div className="p-4 bg-[#111111] rounded-2xl border border-[#C8A34D]/40 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A34D] block">Recommended AI Redline Replacement</span>
                        <p className="text-xs font-mono text-slate-200 leading-relaxed">{clause.redline}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Missing Clause Checklist */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Missing Protective Clause Checklist</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {auditResult.missingClauses.map((missing, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span>{missing}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Obligations & Milestones Table */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Extracted Financial Obligations & Milestones</h4>
                  <div className="space-y-2">
                    {auditResult.milestones.map((m, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#C8A34D] block">{m.party}</span>
                          <span className="text-slate-300">{m.duty}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#111111] text-slate-400 border border-slate-800">
                          {m.timeline}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep === 1 && (
              <button 
                onClick={startContractAudit}
                className="ml-auto px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Run 9-Stage Contract Audit
              </button>
            )}

            {currentStep === 3 && (
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleExportRedlines}
                  className="px-4 py-2 rounded-xl bg-[#222222] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  📝 Export Redlines (.docx)
                </button>

                <button 
                  onClick={handleExportReport}
                  className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
                >
                  <Download className="w-4 h-4" /> Export Risk Audit Report (PDF)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
