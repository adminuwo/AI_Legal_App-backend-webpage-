import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Gavel, Search, ArrowRight, ArrowLeft, Upload, Sparkles, 
  Copy, Download, Globe, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp,
  MessageSquare, HelpCircle, Shield, AlertTriangle, Rocket, CheckSquare, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const CASE_TYPES = [
  'Cheque Bounce (Sec 138 NI Act)', 'Consumer Complaint (COPRA 2019)', 
  'Commercial Rent Default (TP Act)', 'Bail Application (Sec 439 CrPC / Sec 483 BNS)',
  'Arbitration Breach (Sec 9 / 11)', 'Civil Suit for Recovery'
];

const LITIGATION_STYLES = [
  { id: 'aggressive', label: '⚡ Aggressive Prosecution', desc: 'Maximized statutory liability & punitive damages claim' },
  { id: 'defensive', label: '🛡️ Defensive Protection', desc: 'Procedural immunity & strict burden of proof enforcement' },
  { id: 'balanced', label: '⚖️ Balanced Statutory', desc: 'Strict statutory compliance & neutral legal precedent alignment' },
  { id: 'settlement', label: '🤝 Settlement Leverage', desc: 'Compromise pressure points & out-of-court negotiation leverage' }
];

export default function LegalArgumentBuilderModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCaseType, setSelectedCaseType] = useState(CASE_TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState('aggressive');
  const [activeIntelTab, setActiveIntelTab] = useState('oral-notes');
  const [openAccordion, setOpenAccordion] = useState('summary');

  // Step 1: Upload & Form
  const [uploadedExhibits, setUploadedExhibits] = useState([]);
  const [formData, setFormData] = useState({
    courtName: 'Metropolitan Magistrate Court, New Delhi',
    presidingJudge: 'Hon\'ble Justice R. K. Varma',
    clientRole: 'Complainant / Creditor',
    opponentName: 'Apex Logistics Pvt Ltd',
    facts: 'Dishonoured cheque of Rs 25,00,000 with Return Memo "Funds Insufficient". Statutory notice served on 12th May 2026, no payment received.',
  });

  // Step 2: Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const handleExhibitUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedExhibits(prev => [...prev, ...files.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' }))]);
      toast.success(`Scanned & indexed ${files.length} exhibit document(s)`);
    }
  };

  const startCompilation = () => {
    setCurrentStep(2);
    setIsGenerating(true);
    setGenerationProgress(15);
    setProgressStatus('Reading pleadings and exhibit attachments...');

    const statuses = [
      { pct: 40, text: 'Extracting statutory provisions under BNS / CPC / Evidence Act...' },
      { pct: 70, text: 'Building primary oral submissions and counter-rebuttals...' },
      { pct: 90, text: 'Analyzing judge bench profile and precedent citations...' },
      { pct: 100, text: 'Court Intelligence compiled successfully!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setGenerationProgress(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsGenerating(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 1100);
    });
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(`COURTROOM ORAL SUBMISSIONS\nCourt: ${formData.courtName}\nJudge: ${formData.presidingJudge}\n\n1. OPENING STATEMENT:\n"My Lord, complainant presents a clear case of dishonoured cheque under Sec 138 NI Act..."`);
    toast.success('Oral speaking notes copied to clipboard!');
  };

  const handleExportBrief = () => {
    toast.success('Generating Courtroom Hearing Preparation Brief (PDF)...');
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
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Courtroom Argument Builder</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Hearing Intelligence Engine
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 4 • {currentStep === 1 ? 'Case Context & Exhibits' : currentStep === 2 ? 'AI Analysis' : currentStep === 3 ? '12 Court Briefing Sections' : '6 Court Intelligence Tools'}
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
              { num: 1, label: '1. Context & Exhibits' },
              { num: 2, label: '2. AI Progress' },
              { num: 3, label: '3. 12 Briefing Pillars' },
              { num: 4, label: '4. 6 Intelligence Tools' },
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
            {/* STEP 1: CONTEXT & EXHIBITS */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Case Context & Hearing Parameters</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select domain, upload pleadings & choose litigation strategy.</p>
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {/* Case Domain */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Case Matter Category</label>
                    <select
                      value={selectedCaseType}
                      onChange={(e) => setSelectedCaseType(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                    >
                      {CASE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Presiding Court / Forum</label>
                      <input 
                        type="text" 
                        value={formData.courtName}
                        onChange={(e) => setFormData({ ...formData, courtName: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Presiding Judge Name</label>
                      <input 
                        type="text" 
                        value={formData.presidingJudge}
                        onChange={(e) => setFormData({ ...formData, presidingJudge: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>
                  </div>

                  {/* Litigation Style Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Litigation Advocacy Strategy</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {LITIGATION_STYLES.map(style => (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            selectedStyle === style.id
                              ? 'bg-white dark:bg-[#222222] border-[#C8A34D] ring-1 ring-[#C8A34D]'
                              : 'bg-slate-50 dark:bg-[#111111] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">{style.label}</span>
                          <span className="text-[10px] text-slate-400 mt-1 block">{style.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upload */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Upload Pleadings & Exhibits</label>
                    <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#111111] p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-6 h-6 text-[#C8A34D] mb-1" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Upload pleadings, return memos, notices or affidavits</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">PDF, DOCX, JPG supported</span>
                      <input type="file" multiple onChange={handleExhibitUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: AI COMPILATION */}
            {currentStep === 2 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Building Court Preparation Intelligence</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: 12 COURT PREP BRIEFING PILLARS */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">12 Structured Court Preparation Pillars</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Deep-dive briefing cards generated from pleadings & precedents.</p>
                  </div>
                  <button 
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    Open 6 Intelligence Tools <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 12 Accordion Cards */}
                <div className="space-y-3">
                  {[
                    { id: 'summary', title: '1. Executive Summary', pct: 96, content: 'High-level synthesis: Complainant filed Sec 138 NI Act proceeding following dishonour of Rs 25,00,000 cheque. Return Memo confirms "Funds Insufficient". Statutory notice served.' },
                    { id: 'overview', title: '2. Case Overview & Parties', pct: 98, content: 'Petitioner: Rajesh Sharma (Creditor) | Respondent: Apex Logistics Pvt Ltd (Debtor). Forum: Metropolitan Magistrate Court, Delhi.' },
                    { id: 'facts', title: '3. Material Facts', pct: 95, content: '1. Cheque issued on 10th Apr 2026.\n2. Bank memo received on 30th Apr 2026.\n3. Demand notice delivered on 12th May 2026.' },
                    { id: 'timeline', title: '4. Chronological Timeline', pct: 94, content: '📅 10 Apr 2026: Cheque issuance\n📅 30 Apr 2026: Bank dishonour memo\n📅 12 May 2026: Postal demand notice served\n📅 28 May 2026: Expiry of 15-day notice period' },
                    { id: 'arguments', title: '5. Supporting Arguments (Oral Submissions)', pct: 96, content: '• Sec 139 NI Act Presumption of legally enforceable debt is mandatory once cheque signature is admitted.\n• Return Memo proves statutory dishonour.\n• Failure of accused to reply to notice establishes liability.' },
                    { id: 'counters', title: '6. Counter Arguments & Rebuttals', pct: 90, content: '• Opponent Plea: Will claim cheque was security deposit.\n• Rebuttal: Cite Rangappa v. Sri Mohan (2010 SC) holding Sec 139 presumption applies even to security cheques.' },
                    { id: 'checklist', title: '7. Witness & Evidence Checklist', pct: 92, content: 'Exhibits: Original Cheque (Ex P-1), Bank Memo (Ex P-2), Postal Tracking Slip (Ex P-3).\nWitnesses: Bank Manager & Complainant (CW-1).' },
                    { id: 'citations', title: '8. Relevant Case Laws & Precedents', pct: 94, content: '• Rangappa v. Sri Mohan (2010 11 SCC 441)\n• Bir Singh v. Mukesh Kumar (2019 4 SCC 197)\n• Sampelly Satyanarayana v. RBI (2016 10 SCC 458)' },
                    { id: 'prayer', title: '9. Relief & Final Prayer', pct: 98, content: 'Petitioner prays for conviction of the accused and award of compensation equal to double the cheque amount (Rs 50,00,000).' },
                    { id: 'judge', title: '10. Judge Profiling & Bench Intelligence', pct: 88, content: 'Hon\'ble Justice R. K. Varma prefers strict adherence to statutory timelines and authoritative Supreme Court precedent citations.' },
                    { id: 'advocacy', title: '11. Bench Specific Advocacy Strategy', pct: 91, content: 'Lead arguments directly with Section 139 mandatory presumption, emphasizing the undisputed bank return memo.' },
                    { id: 'submission_order', title: '12. Hearing Submission Order', pct: 95, content: '1. Fact brief (1 min)\n2. Section 139 statutory presumption (2 mins)\n3. Rebutting security cheque defense (2 mins)\n4. Prayer.' }
                  ].map((card) => {
                    const isOpen = openAccordion === card.id;
                    return (
                      <div 
                        key={card.id}
                        className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
                      >
                        <div 
                          onClick={() => setOpenAccordion(isOpen ? null : card.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#111111]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{card.title}</span>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30">
                              {card.pct}% Confidence
                            </span>
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-[#C8A34D]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>

                        {isOpen && (
                          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                            {card.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: 6 SPECIALIZED COURT INTELLIGENCE TOOLS */}
            {currentStep === 4 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">6 Court Intelligence Modules</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Interactive courtroom tools for oral submissions, bench inquiries & strategy.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCopyNotes} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" /> Copy Notes
                    </button>
                    <button onClick={handleExportBrief} className="px-3 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md">
                      <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* 6 Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'oral-notes', label: '🗣️ Oral Arguments', icon: MessageSquare },
                    { id: 'judge-questions', label: '❓ Bench Inquiries', icon: HelpCircle },
                    { id: 'opponent-strat', label: '🛡️ Opponent Strategy', icon: Shield },
                    { id: 'weakness-analysis', label: '⚠️ Vulnerability Audit', icon: AlertTriangle },
                    { id: 'winning-strat', label: '🚀 Trial Roadmap', icon: Rocket },
                    { id: 'hearing-checklist', label: '✅ Hearing Checklist', icon: CheckSquare },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveIntelTab(tab.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        activeIntelTab === tab.id
                          ? 'bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/40 font-black shadow-md'
                          : 'bg-white dark:bg-[#181818] text-slate-400 hover:text-white border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Intel Tab Content Card */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  {activeIntelTab === 'oral-notes' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Courtroom Oral Speaking Draft</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-900 dark:text-slate-200">
                        <p className="font-bold text-[#C8A34D] mb-2">"My Lord, complainant presents a clear statutory breach under Section 138 NI Act..."</p>
                        <p>1. Cheque signature is admitted by accused, triggering mandatory presumption under Sec 139.</p>
                        <p>2. Bank return memo Exhibit P-2 confirms "Funds Insufficient".</p>
                        <p>3. Demand notice was delivered on 12th May 2026 without response.</p>
                      </div>
                    </div>
                  )}

                  {activeIntelTab === 'judge-questions' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Anticipated Bench Inquiries & Live Answers</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-[#C8A34D]">
                          <span>Q1: Was the cheque issued for a legally enforceable debt?</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#C8A34D]/20">98% Confidence</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">Answer: Yes My Lord. Invoices & ledger statement Exhibit P-4 establish ongoing commercial debt.</p>
                      </div>
                    </div>
                  )}

                  {activeIntelTab === 'opponent-strat' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Opposing Counsel Strategy & Counter-Rebuttals</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                        <p className="font-bold text-[#C8A34D]">Opponent Assertion: Security Cheque Defense (Likelihood: 35%)</p>
                        <p>Rebuttal: Cite Rangappa v. Sri Mohan (SC) holding Sec 139 presumption covers security cheques.</p>
                      </div>
                    </div>
                  )}

                  {activeIntelTab === 'weakness-analysis' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Case Vulnerability Audit</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold">MEDIUM RISK</span>
                          <span className="font-bold">Postal Tracking Slip Legibility</span>
                        </div>
                        <p>Advice: File certified copy from Postal Department under Sec 65B Evidence Act.</p>
                      </div>
                    </div>
                  )}

                  {activeIntelTab === 'winning-strat' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Trial Strategy & Execution Roadmap</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <p>Stage 1: Pre-trial admission of cheque signature.</p>
                        <p>Stage 2: Cross-examine defense witness on lack of notice reply.</p>
                        <p>Stage 3: Final arguments on mandatory double compensation.</p>
                      </div>
                    </div>
                  )}

                  {activeIntelTab === 'hearing-checklist' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Tomorrow Hearing Checklist</h4>
                      <div className="p-4 bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                        <p className="flex items-center gap-2 text-emerald-400">✔ Original Cheque (Ex P-1)</p>
                        <p className="flex items-center gap-2 text-emerald-400">✔ Bank Return Memo (Ex P-2)</p>
                        <p className="flex items-center gap-2 text-emerald-400">✔ Hard copies of Rangappa SC Judgment</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep > 1 && currentStep !== 2 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl bg-[#222222] text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {currentStep === 1 && (
              <button 
                onClick={startCompilation}
                className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Compile Court Intelligence
              </button>
            )}

            {currentStep === 3 && (
              <button 
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                Open 6 Intelligence Tools <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
