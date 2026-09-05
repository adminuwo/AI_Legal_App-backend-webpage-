import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, TrendingUp, Search, Upload, Sparkles, Copy, Download, Globe, ShieldAlert, CheckCircle2,
  Trophy, AlertTriangle, GitFork, Scale, BookOpen, Layers, Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const CASE_CATEGORIES = [
  'Sec 138 NI Act Cheque Bounce', 'Civil Suit for Recovery', 
  'Consumer Protection Dispute (COPRA)', 'Bail Application (Sec 439 CrPC / Sec 483 BNS)',
  'Commercial Arbitration Breach', 'Property & Injunction Dispute'
];

const WINNING_FACTORS = [
  { title: 'Signed Agreement & Direct Admissions', desc: 'Execution of commercial contracts shifts burden of proof under Sec 139 NI Act.', confidence: '94%', impact: 'Critical Win Driver' },
  { title: 'Statutory Demand Notice Timely Delivered', desc: 'Postal tracking receipt confirms delivery within strict 30-day statutory window.', confidence: '98%', impact: 'High Impact' },
  { title: 'Supreme Court Binding Precedent Alignment', desc: 'Direct ratio match with Rangappa v. Sri Mohan (2010 SC) on enforceable debt presumption.', confidence: '91%', impact: 'High Impact' }
];

const VULNERABILITIES = [
  { title: 'Limitation Delay of 11 Days', desc: 'Statutory demand notice delivered 11 days late due to postal transit gaps.', penalty: '-15% Success Reduction', mitigation: 'File Condonation Application under Section 142(1)(b) proviso.' },
  { title: 'Secondary Photocopy of Original Invoices', desc: 'Exhibits Ex-3 contain uncertified photocopies which may draw defense objections.', penalty: '-8% Success Reduction', mitigation: 'Produce Bankers Book Evidence Act Certificate.' }
];

const TRIAL_SCENARIOS = [
  { name: 'Scenario A: Defendant Admits Signature Execution', winChance: '84% Win Probability', desc: 'Presumption is activated immediately, narrowing defense strictly to proving debt discharge.' },
  { name: 'Scenario B: Signature Authenticity Disputed', winChance: '58% Win Probability', desc: 'Requires Sec 45 forensic handwriting examination report, extending trial timeline.' },
  { name: 'Scenario C: Primary Witness Branch Manager Unavailable', winChance: '46% Win Probability', desc: 'Failure to summon bank witness leaves return memo uncertified in cross trial.' }
];

const JUDICIAL_INSIGHTS = [
  { topic: 'Judicial Stance on Sec 138 Statutory Notice', detail: 'Magistrate courts strictly enforce statutory notice adherence before allowing oral defense testimony.' },
  { topic: 'Likely Magistrate Question During Trial', detail: 'Did complainant receive stop payment instructions prior to cheque presentation?' }
];

const PRECEDENT_MATCHES = [
  { name: 'Rangappa v. Sri Mohan', citation: '(2010) 11 SCC 441', match: '96% Precedent Alignment', ratio: 'Section 139 presumption includes existence of legally enforceable debt once signature is admitted.' },
  { name: 'Bir Singh v. Mukesh Kumar', citation: '(2019) 4 SCC 197', match: '94% Precedent Alignment', ratio: 'Fiduciary cheque handed over with blank contents still attracts Sec 138 criminal liability.' }
];

export default function LegalCasePredictorModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(CASE_CATEGORIES[0]);
  const [clientRole, setClientRole] = useState('Complainant / Petitioner');
  const [activeTab, setActiveTab] = useState('winning');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Step 2: Processing state
  const [isPredicting, setIsPredicting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(files.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' })));
      toast.success(`Uploaded ${files.length} pleading document(s)`);
    }
  };

  const startPredictionModel = () => {
    setCurrentStep(2);
    setIsPredicting(true);
    setProgressPct(10);
    setProgressStatus('Reading Pleadings & Exhibits...');

    const statuses = [
      { pct: 25, text: 'OCR Text Extraction & Indexing...' },
      { pct: 40, text: 'Identifying Litigating Parties & Forum...' },
      { pct: 55, text: 'Framing Material Legal Issues & Evidence Logs...' },
      { pct: 70, text: 'Finding Binding Supreme Court Precedents...' },
      { pct: 85, text: 'Running AI Outcome Prediction Model...' },
      { pct: 100, text: 'Prediction Model Analysis Complete!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setProgressPct(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsPredicting(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 1000);
    });
  };

  const handleExportBrief = () => {
    toast.success('Exporting Judicial Outcome Prediction Brief (PDF)...');
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
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Case Outcome Predictor & Analytics</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Judicial AI Prediction Engine
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 3 • {currentStep === 1 ? 'Pleadings & Parameters' : currentStep === 2 ? '10-Step Prediction Engine' : 'Outcome Analytics Dashboard'}
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
              { num: 1, label: '1. Ingest Pleadings' },
              { num: 2, label: '2. 10-Step AI Engine' },
              { num: 3, label: '3. Outcome Dashboard' },
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
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Case Parameters & Pleadings Ingestion</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select matter category, client role & upload court plaints or written statements.</p>
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Case Matter Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                      >
                        {CASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Client Role */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Litigating Client Role</label>
                      <select
                        value={clientRole}
                        onChange={(e) => setClientRole(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Complainant / Petitioner">Complainant / Petitioner</option>
                        <option value="Accused / Respondent">Accused / Respondent</option>
                      </select>
                    </div>
                  </div>

                  {/* Upload */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Upload Pleadings & Exhibits</label>
                    <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#111111] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-8 h-8 text-[#C8A34D] mb-2" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Click to upload plaint, written statement or exhibits</span>
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
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Executing 10-Step Outcome Prediction Engine</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: OUTCOME DASHBOARD */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* 3 Metric Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Win Probability Dial */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Win Probability</span>
                      <h4 className="text-2xl font-black text-[#C8A34D] mt-0.5">84%</h4>
                      <span className="text-[9px] text-emerald-400 font-semibold">High Chance of Decree</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
                      <Trophy className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Settlement Likelihood */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Settlement Likelihood</span>
                      <h4 className="text-2xl font-black text-white mt-0.5">72%</h4>
                      <span className="text-[9px] text-[#C8A34D] font-semibold">Out of Court Leverage</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-slate-800 flex items-center justify-center text-white">
                      <GitFork className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Precedent Match */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Precedent Match</span>
                      <h4 className="text-2xl font-black text-emerald-400 mt-0.5">91%</h4>
                      <span className="text-[9px] text-slate-400">Supreme Court Binding Match</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* 5 Outcome Analysis Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'winning', label: '🏆 Winning Factors' },
                    { id: 'vulnerabilities', label: '⚠️ Case Vulnerabilities' },
                    { id: 'scenarios', label: '🔀 Trial Scenarios' },
                    { id: 'bench', label: '⚖️ Bench Insights' },
                    { id: 'precedents', label: '📚 Precedent Matches' },
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

                {/* Tab Content Card */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {activeTab === 'winning' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Primary Win Drivers & Statutory Presumptions</h4>
                      {WINNING_FACTORS.map((f, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{f.title}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
                            {f.confidence} Confidence
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'vulnerabilities' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Case Vulnerabilities & Mitigations</h4>
                      {VULNERABILITIES.map((v, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{v.title}</span>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              {v.penalty}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{v.desc}</p>
                          <p className="text-xs text-emerald-400 font-semibold">Mitigation Strategy: {v.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'scenarios' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Trial What-If Branching Scenarios</h4>
                      {TRIAL_SCENARIOS.map((s, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{s.name}</span>
                            <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-xl bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
                            {s.winChance}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'bench' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Judicial Bench Stance & Magistrate Inquiries</h4>
                      {JUDICIAL_INSIGHTS.map((j, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white block">{j.topic}</span>
                          <p className="text-slate-400">{j.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'precedents' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Binding Supreme Court Precedent Matches</h4>
                      {PRECEDENT_MATCHES.map((p, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{p.name} ({p.citation})</span>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {p.match}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{p.ratio}</p>
                        </div>
                      ))}
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
                onClick={startPredictionModel}
                className="ml-auto px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Run Outcome Prediction Model
              </button>
            )}

            {currentStep === 3 && (
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#222222] text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
                >
                  Close Analytics
                </button>

                <button 
                  onClick={handleExportBrief}
                  className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
                >
                  <Download className="w-4 h-4" /> Export Prediction Brief (PDF)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
