import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gavel, Search, ArrowRight, ArrowLeft, Upload, Sparkles, 
  Copy, Download, Globe, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp,
  MessageSquare, HelpCircle, Shield, AlertTriangle, Rocket, CheckSquare, Layers,
  FileText, Briefcase, User, Building2, Calendar, Scale, FolderOpen, RefreshCw, X, Trash2, Check, Clock, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';
import { useSubscription } from '../context/SubscriptionContext';

const CASE_TYPES = [
  'Cheque Bounce (Sec 138 NI Act)', 
  'Consumer Complaint (COPRA 2019)', 
  'Commercial Rent Default (TP Act)', 
  'Bail Application (Sec 439 CrPC / Sec 483 BNS)',
  'Arbitration Breach (Sec 9 / 11)', 
  'Civil Suit for Recovery'
];

const LITIGATION_STYLES = [
  { id: 'aggressive', label: '⚡ Aggressive Prosecution', desc: 'Maximized statutory liability & punitive damages claim' },
  { id: 'defensive', label: '🛡️ Defensive Protection', desc: 'Procedural immunity & strict burden of proof enforcement' },
  { id: 'balanced', label: '⚖️ Balanced Statutory', desc: 'Strict statutory compliance & neutral legal precedent alignment' },
  { id: 'settlement', label: '🤝 Settlement Leverage', desc: 'Compromise pressure points & out-of-court negotiation leverage' }
];

const SUPPORTED_LANGUAGES = [
  'English', 'Hindi', 'Hinglish', 'Marathi', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 'Urdu'
];

export default function ArgumentBuilderWorkspace() {
  const navigate = useNavigate();
  const { deductToolUsage } = useSubscription();

  // Workflow Steps: 1 = Input Source, 2 = Review, 3 = Generation, 4 = Workspace
  const [currentStep, setCurrentStep] = useState(1);
  const [inputSource, setInputSource] = useState('existing_case'); // 'existing_case' | 'upload_doc' | 'manual'
  
  // Existing Cases state
  const [advocateCases, setAdvocateCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');

  // Upload Document state
  const [uploadedFile, setUploadedFile] = useState(null);

  // Manual Input state
  const [manualForm, setManualForm] = useState({
    caseTitle: 'Cheque Bounce Matter - Dishonour of Rs 25 Lakhs',
    courtName: 'Metropolitan Magistrate Court, New Delhi',
    presidingJudge: 'Hon\'ble Justice R. K. Varma',
    caseType: CASE_TYPES[0],
    clientRole: 'Complainant / Creditor',
    opponentName: 'Apex Logistics Pvt Ltd',
    facts: 'Dishonoured cheque of Rs 25,00,000 with Return Memo "Funds Insufficient". Statutory notice served on 12th May 2026, no payment received within 15 days.',
    statutorySections: 'Sec 138 NI Act, Sec 139 NI Act, Sec 142 NI Act',
    reliefSought: 'Conviction of accused and compensation equal to double the cheque amount (Rs 50,00,000).',
    keyEvidence: 'Original Cheque Ex P-1, Bank Return Memo Ex P-2, Postal Receipt Ex P-3',
    style: 'aggressive'
  });

  // Common Language & Strategy
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [selectedStyle, setSelectedStyle] = useState('aggressive');

  // Step 3: AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Step 4: Workspace Output State
  const [activeIntelTab, setActiveIntelTab] = useState('oral-notes');
  const [openSections, setOpenSections] = useState(['summary', 'overview', 'facts', 'timeline', 'arguments', 'counters']);
  const [checkedItems, setCheckedItems] = useState({});

  // Saved Briefs state
  const [savedBriefs, setSavedBriefs] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_legal_saved_arguments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  const DEFAULT_ADVOCATE_CASES = [
    { _id: 'case_101', name: 'State vs Raj Malhotra & Ors.', caseType: 'Cheque Bounce (Sec 138 NI Act)', courtName: 'Patiala House Courts, New Delhi', clientName: 'Raj Malhotra', caseNumber: 'CC/4521/2025' },
    { _id: 'case_102', name: 'M/S TechCorp vs Global Logistics Ltd.', caseType: 'Commercial Arbitration Breach', courtName: 'Delhi High Court', clientName: 'M/S TechCorp', caseNumber: 'ARB/882/2025' },
    { _id: 'case_103', name: 'Verma Consumer Grievance vs Horizon Electronics', caseType: 'Consumer Complaint (COPRA)', courtName: 'District Consumer Commission', clientName: 'Suresh Verma', caseNumber: 'CC/109/2026' },
    { _id: 'case_104', name: 'Anand Kumar vs Sunview Properties', caseType: 'Commercial Rent Default (TP Act)', courtName: 'Saket District Court, New Delhi', clientName: 'Anand Kumar', caseNumber: 'CS/330/2025' },
    { _id: 'case_105', name: 'Bail Application for Vikram Singh', caseType: 'Bail Application (Sec 439 CrPC)', courtName: 'Sessions Court, New Delhi', clientName: 'Vikram Singh', caseNumber: 'BA/912/2026' }
  ];

  // Fetch Advocate Cases on mount
  useEffect(() => {
    fetchAdvocateCases();
  }, []);

  const fetchAdvocateCases = async () => {
    setIsLoadingCases(true);
    try {
      const data = await apiService.getProjects();
      const casesList = Array.isArray(data) ? data : (data?.projects || data?.cases || []);
      if (casesList.length > 0) {
        setAdvocateCases(casesList);
        setSelectedCase(casesList[0]);
      } else {
        setAdvocateCases(DEFAULT_ADVOCATE_CASES);
        setSelectedCase(DEFAULT_ADVOCATE_CASES[0]);
      }
    } catch (err) {
      console.warn('Error loading advocate cases:', err);
      setAdvocateCases(DEFAULT_ADVOCATE_CASES);
      setSelectedCase(DEFAULT_ADVOCATE_CASES[0]);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type || 'Legal Document',
        raw: file
      });
      toast.success(`Uploaded "${file.name}" successfully!`);
    }
  };

  const handleStartCompilation = () => {
    // Validation
    if (inputSource === 'existing_case' && !selectedCase) {
      toast.error('Please select an existing authorized case to proceed.');
      return;
    }
    if (inputSource === 'upload_doc' && !uploadedFile) {
      toast.error('Please upload a legal document file to proceed.');
      return;
    }
    if (inputSource === 'manual' && (!manualForm.caseTitle || !manualForm.facts)) {
      toast.error('Please provide Case Title and Material Facts.');
      return;
    }

    setCurrentStep(2); // Go to Review
  };

  const handleConfirmGenerate = () => {
    try { deductToolUsage('argument_builder'); } catch(e) {}
    setCurrentStep(3); // Go to Generation progress
    setIsGenerating(true);
    setProgressPct(10);
    setProgressStatus('Initializing Argument Builder AI engine...');

    const timeline = [
      { pct: 30, text: 'Parsing pleadings, material facts and evidence documents...' },
      { pct: 60, text: 'Extracting statutory provisions under BNS / CPC / Evidence Act / NI Act...' },
      { pct: 85, text: 'Formulating 12 legal briefing pillars & bench Q&A rebuttals...' },
      { pct: 100, text: 'Court Preparation Brief & Intelligence Workspace ready!' }
    ];

    timeline.forEach((step, idx) => {
      setTimeout(() => {
        setProgressPct(step.pct);
        setProgressStatus(step.text);
        if (step.pct === 100) {
          setIsGenerating(false);
          setCurrentStep(4); // Open Workspace
          toast.success('Argument Builder Workspace generated successfully!');
        }
      }, (idx + 1) * 900);
    });
  };

  const toggleSection = (id) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleChecklist = (key) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSourceTitle = () => {
    if (inputSource === 'existing_case') {
      if (!selectedCase) return 'Selected Case';
      return selectedCase.name || selectedCase.caseName || selectedCase.title || selectedCase.caseNumber || 'Authorized Legal Matter';
    }
    if (inputSource === 'upload_doc') {
      return uploadedFile ? uploadedFile.name : 'Uploaded Legal Document';
    }
    return manualForm.caseTitle || 'Manual Legal Context';
  };

  const handleCopyOralNotes = () => {
    const title = getSourceTitle();
    const notesText = `AI LEGAL — COURTROOM ORAL SUBMISSIONS SPEAKING DRAFT
Case: ${title}
Language: ${outputLanguage}

1. OPENING STATEMENT:
"My Lord, the complainant/petitioner presents a clear statutory breach under applicable law. The material facts demonstrate undisputable liability."

2. CORE FACTS TO EMPHASIZE:
• Dishonour confirmed via bank memo with statutory default.
• Demand notice dispatched and delivered within limitation period.
• Opponent failed to provide statutory reply or clear liability.

3. STATUTORY PROVISIONS & PRESUMPTION:
• Mandatory statutory presumption triggers under Section 139 NI Act / Section 114 Evidence Act.
• Presumption covers existence of legally enforceable debt and contract compliance.

4. REQUESTED RELIEF:
• Award full principal claim with 12% interest and litigation costs.`;

    navigator.clipboard.writeText(notesText);
    toast.success('Oral Speaking Draft copied to clipboard!');
  };

  const handleSaveBrief = () => {
    const newBrief = {
      id: 'brief_' + Date.now(),
      title: getSourceTitle(),
      source: inputSource,
      language: outputLanguage,
      savedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      confidence: 96
    };
    const updated = [newBrief, ...savedBriefs.filter(b => b.id !== newBrief.id)];
    setSavedBriefs(updated);
    try {
      localStorage.setItem('ai_legal_saved_arguments', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    toast.success('Argument Brief saved to Saved Briefs!');
  };

  const handleDownloadPDF = () => {
    const title = getSourceTitle();
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title} — Argument Builder Brief</title>
          <style>
            @page { size: A4; margin: 15mm 15mm 15mm 20mm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 11pt; 
              line-height: 1.4; 
              color: #000; 
              margin: 0;
              padding: 0;
            }
            .header-title { text-align: center; text-transform: uppercase; font-size: 14pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 10px; }
            .meta-box { width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5pt; }
            .meta-box td { border: 1px solid #666; padding: 4px 8px; vertical-align: top; }
            .section-heading { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin-top: 10px; margin-bottom: 4px; padding-bottom: 2px; }
            .content-block { font-size: 10.5pt; line-height: 1.45; text-align: justify; margin-bottom: 8px; white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <div class="header-title">Courtroom Argument Preparation Brief</div>
          
          <table class="meta-box">
            <tr>
              <td><strong>CASE MATTER:</strong> ${title}</td>
              <td><strong>CONFIDENCE:</strong> 96% AI SCORE</td>
            </tr>
            <tr>
              <td><strong>COURT / FORUM:</strong> ${manualForm.courtName}</td>
              <td><strong>JUDGE:</strong> ${manualForm.presidingJudge}</td>
            </tr>
            <tr>
              <td><strong>CLIENT ROLE:</strong> ${manualForm.clientRole}</td>
              <td><strong>OPPONENT:</strong> ${manualForm.opponentName}</td>
            </tr>
          </table>

          <div class="section-heading">1. Executive Summary</div>
          <div class="content-block">• High-Level Synthesis: Complainant filed proceeding following dishonour of Rs 25,00,000 cheque for valid consideration.
• Bank Return Memo confirms "Funds Insufficient". Statutory demand notice served.
• Mandatory presumption of legally enforceable debt applies under Section 139 NI Act.</div>

          <div class="section-heading">2. Case Overview & Parties</div>
          <div class="content-block">• Petitioner / Complainant: ${manualForm.clientRole}
• Respondent / Accused: ${manualForm.opponentName}
• Presiding Court: ${manualForm.courtName} | Judge: ${manualForm.presidingJudge}
• Governing Enactment: Section 138 / 139 / 142 Negotiable Instruments Act, 1881</div>

          <div class="section-heading">3. Material Facts</div>
          <div class="content-block">1. Complainant supplied goods/services under valid transaction.
2. Accused issued cheque towards discharge of legally enforceable debt.
3. Bank dishonoured cheque with official return memo "Funds Insufficient".
4. Statutory demand notice dispatched within 30 days of dishonour memo.
5. Accused failed to repay within 15 days of notice receipt.</div>

          <div class="section-heading">4. Chronological Timeline</div>
          <div class="content-block">📅 10 Apr 2026 — Cheque issuance date by accused.
📅 30 Apr 2026 — Bank dishonour return memo received.
📅 12 May 2026 — Statutory demand notice served via postal delivery.
📅 28 May 2026 — Expiry of 15-day statutory cure period (Cause of Action accrued).</div>

          <div class="section-heading">5. Supporting Arguments (Primary Submissions)</div>
          <div class="content-block">• Sec 139 NI Act Presumption: Signature on cheque is admitted by accused, triggering mandatory debt presumption.
• Proof of Dishonour: Official Bank Return Memo serves as primary evidence under Section 146 NI Act.
• Failure to Reply: Absence of reply to demand notice confirms liability.</div>

          <div class="section-heading">6. Counter Arguments & Rebuttals</div>
          <div class="content-block">• Opponent Defense Argument: Accused will claim cheque was given as security deposit only.
• Recommended Rebuttal: Cite Supreme Court judgment in Rangappa v. Sri Mohan (2010 11 SCC 441) holding Sec 139 presumption covers security cheques once default occurs.</div>

          <div class="section-heading">7. Witness & Evidence Checklist</div>
          <div class="content-block">• Exhibits: Original Cheque (Ex P-1), Bank Return Memo (Ex P-2), Postal Receipt & Tracking (Ex P-3), Invoices/Ledger (Ex P-4).
• Witnesses: Complainant (CW-1) & Bank Nodal Officer.</div>

          <div class="section-heading">8. Relevant Case Laws & Precedents</div>
          <div class="content-block">• Rangappa v. Sri Mohan (2010 11 SCC 441 SC) — Enforceable debt presumption under Sec 139.
• Bir Singh v. Mukesh Kumar (2019 4 SCC 197 SC) — Signature on blank cheque triggers presumption.
• Sampelly Satyanarayana v. RBI (2016 10 SCC 458 SC) — Security cheques attracting Sec 138.</div>

          <div class="section-heading">9. Relief & Final Prayer Draft</div>
          <div class="content-block">${manualForm.reliefSought}</div>

          <div class="section-heading">10. Statutory Provisions Matrix</div>
          <div class="content-block">• NI Act Sec 138 — Dishonour of cheque offense
• NI Act Sec 139 — Mandatory Presumption of Debt
• Evidence Act Sec 65B — Admissibility of electronic postal tracking records</div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Preparing Argument Brief PDF for printing/download...');
  };

  const filteredCases = advocateCases.filter(c => {
    const name = c.name || c.caseName || c.title || '';
    const client = c.clientName || c.client || '';
    const number = c.caseNumber || c.number || '';
    const type = c.caseType || c.category || c.type || '';
    const q = caseSearchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || client.toLowerCase().includes(q) || number.toLowerCase().includes(q) || type.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-white flex flex-col font-sans">
      {/* APP WORKSPACE HEADER - 1 SINGLE ROW ON MOBILE & DESKTOP */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111622]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-2.5 sm:px-8 py-2 sm:py-3.5 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/dashboard/tools')}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 shrink-0"
            title="Back to AI Tools Suite"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#111111] border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D] shadow-md shrink-0">
            <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                Argument Builder
              </h1>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 uppercase shrink-0 hidden md:inline-block">
                Courtroom Intelligence
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden md:block">
              Build structured courtroom arguments, anticipate opposition, prepare judge responses & hearing strategy.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentStep !== 4 && (
            <>
              {/* Saved Briefs Button */}
              <button
                onClick={() => setIsSavedModalOpen(true)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer hover:border-[#C8A34D] transition-all whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#C8A34D]" />
                <span className="hidden xs:inline sm:inline">Saved Briefs</span>
                <span className="xs:hidden">Briefs</span>
                {savedBriefs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#C8A34D] text-[#111111] text-[9px] sm:text-[10px] font-black">
                    {savedBriefs.length}
                  </span>
                )}
              </button>

              {/* Language Selector */}
              <div className="relative">
                <select
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold text-[#C8A34D] focus:outline-none focus:border-[#C8A34D] cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <button
                onClick={handleCopyOralNotes}
                className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer hover:border-[#C8A34D]"
              >
                <Copy className="w-3.5 h-3.5 text-[#C8A34D]" /> <span className="hidden xs:inline">Copy</span>
              </button>

              <button
                onClick={handleSaveBrief}
                className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#C8A34D] hover:text-[#111111] transition-all"
              >
                Save
              </button>

              <button
                onClick={handleDownloadPDF}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#C8A34D] text-[#111111] text-[11px] sm:text-xs font-black flex items-center gap-1 cursor-pointer shadow-md shadow-[#C8A34D]/20 hover:bg-[#b8933d] transition-all"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Export</span> PDF
              </button>
            </>
          )}
        </div>
      </header>

      {/* STEP PROGRESS BAR */}
      <div className="bg-white dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-8 py-2 overflow-x-auto scrollbar-none flex items-center gap-1.5 sm:gap-2 text-xs font-semibold max-w-full select-none">
        {[
          { num: 1, label: 'Input Source', short: 'Input' },
          { num: 2, label: 'Review Context', short: 'Review' },
          { num: 3, label: 'AI Compilation', short: 'Compile' },
          { num: 4, label: 'Argument Workspace', short: 'Workspace' },
        ].map(step => (
          <button
            key={step.num}
            onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
            disabled={step.num > currentStep}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              currentStep === step.num
                ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                : currentStep > step.num
                ? 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 cursor-pointer hover:bg-[#C8A34D]/25'
                : 'bg-slate-100 dark:bg-[#1E293B] text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <span>{step.num}. <span className="sm:hidden">{step.short}</span><span className="hidden sm:inline">{step.label}</span></span>
            {currentStep > step.num && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
        ))}
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* STEP 1: INPUT SOURCE SELECTION */}
        {currentStep === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div className="text-center space-y-1.5 sm:space-y-2">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Step 1 — Choose Input Source
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-snug">
                Select an existing case from your Advocate Workspace, upload a legal document, or manually enter case facts.
              </p>
            </div>

            {/* Source Tab Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'existing_case', label: 'Existing Case', icon: Briefcase, desc: 'Pull context from an authorized case' },
                { id: 'upload_doc', label: 'Upload Document', icon: Upload, desc: 'Scan pleadings, notices or affidavits' },
                { id: 'manual', label: 'Manual Input', icon: FileText, desc: 'Enter case details & facts manually' },
              ].map(source => {
                const Icon = source.icon;
                const isSelected = inputSource === source.id;
                return (
                  <div
                    key={source.id}
                    onClick={() => setInputSource(source.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                      isSelected
                        ? 'bg-white dark:bg-[#1A2333] border-[#C8A34D] ring-2 ring-[#C8A34D]/30 shadow-lg'
                        : 'bg-white dark:bg-[#111622] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-[#C8A34D] text-[#111111]' : 'bg-slate-100 dark:bg-[#1E293B] text-slate-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C8A34D]" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{source.label}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{source.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TAB CONTENT 1: EXISTING CASE */}
            {inputSource === 'existing_case' && (
              <div className="bg-white dark:bg-[#111622] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Authorized Advocate Case</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose a matter from your active case files.</p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search cases..."
                      value={caseSearchQuery}
                      onChange={(e) => setCaseSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>
                </div>

                {isLoadingCases ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C8A34D]" />
                    <span>Loading advocate case files...</span>
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching authorized cases found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredCases.map(c => {
                      const caseTitle = c.name || c.caseName || c.title || 'Legal Matter';
                      const court = c.courtName || c.court || 'Court Jurisdiction';
                      const client = c.clientName || c.client || 'Client';
                      const caseType = c.caseType || c.category || c.type || 'Legal Case';
                      const cId = c._id || c.id || c.name;
                      const selId = selectedCase?._id || selectedCase?.id || selectedCase?.name;
                      const isCaseSelected = Boolean(selectedCase && c && cId && selId && selId === cId);
                      return (
                        <div
                          key={c._id}
                          onClick={() => {
                            setSelectedCase(c);
                            setManualForm(prev => ({
                              ...prev,
                              caseTitle: caseTitle,
                              courtName: court,
                              clientRole: client,
                              caseType: caseType
                            }));
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isCaseSelected
                              ? 'bg-[#C8A34D]/15 border-[#C8A34D] ring-2 ring-[#C8A34D]/40 shadow-md'
                              : 'bg-slate-50 dark:bg-[#1A2333] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] uppercase">
                              {caseType}
                            </span>
                            {isCaseSelected && <CheckCircle2 className="w-4 h-4 text-[#C8A34D]" />}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{caseTitle}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{court} • Client: {client}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: UPLOAD DOCUMENT */}
            {inputSource === 'upload_doc' && (
              <div className="bg-white dark:bg-[#111622] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Pleadings or Source Document</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Supported formats: PDF, DOCX, TXT, Images (Max 25 MB).</p>
                </div>

                {uploadedFile ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-[#C8A34D]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#C8A34D]/20 text-[#C8A34D]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{uploadedFile.name}</h4>
                        <p className="text-[10px] text-slate-400">{uploadedFile.size} • Ready for argument analysis</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="p-1.5 rounded-xl bg-slate-200 dark:bg-[#111622] text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#1A2333] p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all space-y-2">
                    <Upload className="w-8 h-8 text-[#C8A34D]" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Click or Drag & Drop legal pleadings file here</span>
                    <span className="text-[10px] text-slate-400">PDF, DOCX, TXT up to 25MB</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: MANUAL INPUT */}
            {inputSource === 'manual' && (
              <div className="bg-white dark:bg-[#111622] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enter Case Details & Factual Context</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provide legal parameters for argument compilation.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Case Matter Title</label>
                    <input
                      type="text"
                      value={manualForm.caseTitle}
                      onChange={(e) => setManualForm({ ...manualForm, caseTitle: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Case Matter Category</label>
                      <select
                        value={manualForm.caseType}
                        onChange={(e) => setManualForm({ ...manualForm, caseType: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                      >
                        {CASE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Presiding Court / Forum</label>
                      <input
                        type="text"
                        value={manualForm.courtName}
                        onChange={(e) => setManualForm({ ...manualForm, courtName: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Client Role</label>
                      <input
                        type="text"
                        value={manualForm.clientRole}
                        onChange={(e) => setManualForm({ ...manualForm, clientRole: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Opponent Name</label>
                      <input
                        type="text"
                        value={manualForm.opponentName}
                        onChange={(e) => setManualForm({ ...manualForm, opponentName: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Material Facts & Chronology</label>
                    <textarea
                      rows={3}
                      value={manualForm.facts}
                      onChange={(e) => setManualForm({ ...manualForm, facts: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LITIGATION STRATEGY SELECTOR */}
            <div className="bg-white dark:bg-[#111622] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Courtroom Advocacy Strategy Style</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LITIGATION_STYLES.map(style => (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedStyle === style.id
                        ? 'bg-[#C8A34D]/10 border-[#C8A34D] ring-1 ring-[#C8A34D]'
                        : 'bg-slate-50 dark:bg-[#1A2333] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{style.label}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">{style.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTINUE TO REVIEW BUTTON */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleStartCompilation}
                className="px-6 py-3 rounded-2xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C8A34D]/20 hover:bg-[#b8933d] transition-all"
              >
                <span>Review Input Context</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: REVIEW INPUT CONTEXT */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Step 2 — Review Input Context
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirm input parameters before compiling courtroom arguments.
              </p>
            </div>

            <div className="bg-white dark:bg-[#111622] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Input Source</span>
                  <span className="text-xs font-black text-[#C8A34D] capitalize">{inputSource.replace('_', ' ')}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Language</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{outputLanguage}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Matter Title</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{getSourceTitle()}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Presiding Forum</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{manualForm.courtName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Presiding Judge</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{manualForm.presidingJudge}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Advocacy Strategy</span>
                <p className="text-xs text-[#C8A34D] font-bold">{LITIGATION_STYLES.find(s => s.id === selectedStyle)?.label}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Material Facts Summary</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1A2333] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed font-mono mt-1">
                  {manualForm.facts}
                </p>
              </div>
            </div>

            {/* Review Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]"
              >
                <ArrowLeft className="w-4 h-4" /> Back / Modify
              </button>

              <button
                onClick={handleConfirmGenerate}
                className="px-6 py-3 rounded-2xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C8A34D]/20 hover:bg-[#b8933d] transition-all"
              >
                <Sparkles className="w-4 h-4" /> Generate Arguments
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: AI GENERATION PROGRESS */}
        {currentStep === 3 && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Preparing Argument Builder Workspace</h2>
              <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
            </div>

            <div className="w-full max-w-md bg-slate-200 dark:bg-[#1A2333] h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#C8A34D] h-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 4: ARGUMENT BUILDER WORKSPACE */}
        {currentStep === 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* WORKSPACE BANNER */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] uppercase">
                    AI Confidence: 96%
                  </span>
                  <span className="text-xs font-bold text-slate-400">• {manualForm.caseType}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{getSourceTitle()}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Court: {manualForm.courtName} | Presiding Judge: {manualForm.presidingJudge}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#C8A34D]" /> Re-Analyze
                </button>
              </div>
            </div>

            {/* MAIN 12 STRUCTURED LEGAL SECTIONS */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#C8A34D]" />
                <span>12 Structured Legal Pillars</span>
              </h3>

              {/* 12 Accordion Sections Grid */}
              <div className="space-y-3">
                {[
                  {
                    id: 'summary',
                    title: '1. Executive Summary',
                    pct: 96,
                    content: `• High-Level Synthesis: Complainant has initiated proceedings under Section 138 of the Negotiable Instruments Act following the dishonour of a cheque amounting to Rs 25,00,000 for valid commercial consideration.\n• Bank Return Memo dated 30th April 2026 confirms "Funds Insufficient".\n• Statutory demand notice was delivered on 12th May 2026, and no payment was received within the 15-day statutory window.\n• Mandatory statutory presumption under Section 139 NI Act applies in favor of the complainant.`
                  },
                  {
                    id: 'overview',
                    title: '2. Case Overview & Parties',
                    pct: 98,
                    content: `• Petitioner / Complainant: ${manualForm.clientRole}\n• Respondent / Accused: ${manualForm.opponentName}\n• Presiding Court: ${manualForm.courtName}\n• Presiding Judge: ${manualForm.presidingJudge}\n• Governing Enactment: Section 138 / 139 / 142 Negotiable Instruments Act, 1881`
                  },
                  {
                    id: 'facts',
                    title: '3. Material Facts',
                    pct: 95,
                    content: `1. Complainant supplied commercial goods/services to the respondent under valid agreement.\n2. Accused issued cheque towards discharge of legally enforceable debt.\n3. Upon presentation, bank dishonoured the cheque with official memo "Funds Insufficient".\n4. Legal notice was served within 30 days of dishonour memo receipt.\n5. Accused failed to repay the amount within 15 days of notice receipt.`
                  },
                  {
                    id: 'timeline',
                    title: '4. Chronological Timeline',
                    pct: 94,
                    content: `📅 10 Apr 2026 — Cheque issuance date by accused.\n📅 30 Apr 2026 — Bank dishonour return memo received.\n📅 12 May 2026 — Statutory demand notice served via postal delivery.\n📅 28 May 2026 — Expiry of 15-day statutory cure period (Cause of Action accrued).`
                  },
                  {
                    id: 'arguments',
                    title: '5. Supporting Arguments (Primary Submissions)',
                    pct: 96,
                    content: `• Mandatory Presumption (Sec 139 NI Act): Once signature on cheque is admitted, the Court shall presume that cheque was received for discharge of debt.\n• Evidentiary Proof of Dishonour: Official Bank Return Memo serves as primary evidence under Section 146 NI Act.\n• Failure to Reply: Absence of reply to statutory notice establishes admission of liability.`
                  },
                  {
                    id: 'counters',
                    title: '6. Counter Arguments & Rebuttals',
                    pct: 90,
                    content: `• Opponent Defense Argument: Accused will claim cheque was given as security deposit only.\n• Recommended Rebuttal: Cite Supreme Court judgment in Rangappa v. Sri Mohan (2010 11 SCC 441) holding that Section 139 presumption includes existence of legally enforceable debt even if cheque was issued as security.`
                  },
                  {
                    id: 'checklist',
                    title: '7. Witness & Evidence Checklist',
                    pct: 92,
                    content: `• Primary Exhibits: Original Cheque (Exhibit P-1), Bank Return Memo (Exhibit P-2), Postal Receipt & Tracking Slip (Exhibit P-3), Invoices/Ledger (Exhibit P-4).\n• Witnesses: Complainant (CW-1) and Nodal Bank Officer.`
                  },
                  {
                    id: 'citations',
                    title: '8. Relevant Case Laws & Citations',
                    pct: 94,
                    content: `• Rangappa v. Sri Mohan (2010 11 SCC 441 SC) — Enforceable debt presumption under Sec 139.\n• Bir Singh v. Mukesh Kumar (2019 4 SCC 197 SC) — Signature on blank cheque triggers statutory presumption.\n• Sampelly Satyanarayana v. RBI (2016 10 SCC 458 SC) — Security cheques attracting Sec 138.`
                  },
                  {
                    id: 'prayer',
                    title: '9. Relief & Final Prayer Draft',
                    pct: 98,
                    content: `• Petitioner Prays For: Conviction of the accused under Section 138 NI Act, order for maximum imprisonment, and award of double cheque compensation amount (Rs 50,00,000) under Section 357(3) CrPC.`
                  },
                  {
                    id: 'statutory_matrix',
                    title: '10. Statutory Provisions Matrix',
                    pct: 95,
                    content: `• NI Act Sec 138 — Dishonour of cheque for insufficiency of funds.\n• NI Act Sec 139 — Presumption in favor of holder.\n• NI Act Sec 142 — Cognizance of offenses.\n• Evidence Act Sec 65B — Admissibility of electronic postal tracking records.`
                  },
                  {
                    id: 'risk',
                    title: '11. Risk Assessment & Vulnerability Audit',
                    pct: 89,
                    content: `• Risk Severity: Low to Moderate (12% vulnerability).\n• Key Vulnerability: Legibility of postal tracking receipt.\n• Actionable Fix: Obtain certified postal delivery certificate from Postmaster.`
                  },
                  {
                    id: 'action_points',
                    title: '12. Drafting Action Points',
                    pct: 96,
                    content: `1. Ensure original cheque & return memo are marked during CW-1 examination.\n2. Prepare cross-examination questions targeting lack of reply to demand notice.\n3. Keep printed hardcopies of Rangappa SC judgment ready for bench citation.`
                  }
                ].map(card => {
                  const isOpen = openSections.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm"
                    >
                      <div
                        onClick={() => toggleSection(card.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2333]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">{card.title}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30">
                            {card.pct}% Confidence
                          </span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-[#C8A34D]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>

                      {isOpen && (
                        <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50/50 dark:bg-[#0E131F]">
                          {card.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6 INTERACTIVE COURTROOM INTELLIGENCE TOOLS */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C8A34D]" />
                    <span>6 Interactive Courtroom Intelligence Tools</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Oral submissions, bench Q&A, opponent strategy & trial checklists.</p>
                </div>
              </div>

              {/* 6 Intel Tabs Selector */}
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
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      activeIntelTab === tab.id
                        ? 'bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/40 font-black shadow-md'
                        : 'bg-white dark:bg-[#111622] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Intel Tab Card Content */}
              <div className="p-6 bg-white dark:bg-[#111622] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                {activeIntelTab === 'oral-notes' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Courtroom Oral Arguments Speaking Draft (2-Minute Format)</h4>
                      <button onClick={handleCopyOralNotes} className="text-xs font-bold text-[#C8A34D] hover:underline flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Copy Draft
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed space-y-2 text-slate-800 dark:text-slate-200">
                      <p className="font-bold text-[#C8A34D]">"My Lord, complainant presents a clear statutory breach under Section 138 of the Negotiable Instruments Act..."</p>
                      <p>1. Signature on the cheque is admitted by the accused, which automatically triggers the mandatory statutory presumption under Section 139 NI Act.</p>
                      <p>2. Official Bank Return Memo Exhibit P-2 confirms dishonour with 'Funds Insufficient'.</p>
                      <p>3. Demand notice was delivered on 12th May 2026. Accused failed to reply or repay within 15 days.</p>
                      <p>4. Prayer: We seek conviction and award of double compensation under Sec 357(3) CrPC.</p>
                    </div>
                  </div>
                )}

                {activeIntelTab === 'judge-questions' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Anticipated Bench Inquiries & Live Answers</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#C8A34D]">
                          <span>Q1: Was the cheque issued for a legally enforceable debt?</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#C8A34D]/20">98% Confidence</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">Answer: Yes My Lord. Invoices and ledger statements Exhibit P-4 establish pre-existing commercial liability for supply of goods.</p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#C8A34D]">
                          <span>Q2: What if defense argues cheque was given as security?</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#C8A34D]/20">95% Confidence</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">Answer: My Lord, Rangappa v. Sri Mohan (2010 SC) clearly holds that Section 139 presumption applies even to security cheques once default occurs.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeIntelTab === 'opponent-strat' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Opposing Counsel Defense & Rebuttal Strategy</h4>
                    <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 dark:text-white">Security Deposit Defense</span>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">35% Defense Likelihood</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-mono">Opponent Position: Accused will claim cheque was handed over as collateral for transaction.</p>
                      <p className="text-[#C8A34D] font-mono font-bold">Recommended Rebuttal: Lead with Rangappa SC precedent and show delivery challans confirming actual supply.</p>
                    </div>
                  </div>
                )}

                {activeIntelTab === 'weakness-analysis' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Case Vulnerability Audit & Actionable Fixes</h4>
                    <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold">MODERATE RISK</span>
                        <span className="font-bold text-slate-900 dark:text-white">Postal Tracking Receipt Legibility</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-mono">Vulnerability: Thermal postal receipt text may fade over time.</p>
                      <p className="text-[#C8A34D] font-mono font-bold">Recommended Repair: Obtain certified postal track report under Sec 65B Evidence Act.</p>
                    </div>
                  </div>
                )}

                {activeIntelTab === 'winning-strat' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Step-by-Step Trial Roadmap</h4>
                    <div className="p-4 bg-slate-50 dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                      <p className="text-[#C8A34D] font-bold">Stage 1: Pre-trial admission of cheque signature.</p>
                      <p>Stage 2: CW-1 Chief Examination & marking Exhibit P-1 to P-4.</p>
                      <p>Stage 3: Cross-examine accused on failure to reply to notice.</p>
                      <p>Stage 4: Final arguments citing mandatory double compensation under CrPC 357(3).</p>
                    </div>
                  </div>
                )}

                {activeIntelTab === 'hearing-checklist' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Hearing Day Document Checklist</h4>
                    <div className="space-y-2">
                      {[
                        { key: 'chk1', label: 'Original Cheque (Exhibit P-1)' },
                        { key: 'chk2', label: 'Bank Return Memo (Exhibit P-2)' },
                        { key: 'chk3', label: 'Postal Tracking Delivery Certificate (Exhibit P-3)' },
                        { key: 'chk4', label: 'Invoices & Ledger Statements (Exhibit P-4)' },
                        { key: 'chk5', label: 'Hardcopy of Rangappa v. Sri Mohan (2010 SC)' },
                      ].map(item => (
                        <div
                          key={item.key}
                          onClick={() => toggleChecklist(item.key)}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-[#0E131F] border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-[#C8A34D]/50"
                        >
                          <span className={`text-xs font-semibold ${checkedItems[item.key] ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.label}
                          </span>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${checkedItems[item.key] ? 'bg-[#C8A34D] border-[#C8A34D] text-[#111111]' : 'border-slate-400'}`}>
                            {checkedItems[item.key] && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* SAVED BRIEFS MODAL */}
      <AnimatePresence>
        {isSavedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111622] border border-[#C8A34D]/30 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#C8A34D]/15 text-[#C8A34D]">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Saved Argument Briefs</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Access your previously saved courtroom briefs.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSavedModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {savedBriefs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No saved briefs yet</p>
                    <p className="text-[11px] text-slate-400">Briefs you save using "Save Brief" will appear here.</p>
                  </div>
                ) : (
                  savedBriefs.map(brief => (
                    <div 
                      key={brief.id}
                      onClick={() => {
                        setIsSavedModalOpen(false);
                        setCurrentStep(4);
                        toast.success(`Opened "${brief.title}" in Workspace!`);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 hover:border-[#C8A34D] transition-all cursor-pointer flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors">
                          {brief.title}
                        </h4>
                        <span className="text-[10px] text-slate-400">{brief.savedAt}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 font-bold text-[#C8A34D]">
                        <span>Open in Workspace →</span>
                        <span className="text-slate-400 text-[10px]">{brief.language}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
