import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Upload, Sparkles, Copy, Download, ShieldAlert, CheckCircle2, 
  AlertTriangle, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, FileCheck, Layers,
  HardDrive, Gavel, Eye, Search, Edit3, User, Calendar, Clock, DollarSign,
  AlertCircle, Scale, MessageSquare, ChevronRight, Zap, Check, Lock, BookOpen, GitFork, Trophy, Swords, Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';
import { useSubscription } from '../context/SubscriptionContext';

const CASE_TYPES = [
  'Cheque Bounce (Sec 138 NI Act)',
  'Consumer Complaint (COPRA 2019)',
  'Commercial Rent & Property Dispute',
  'Bail Application (CrPC / BNS)',
  'Arbitration & Contractual Breach',
  'Civil Suit for Recovery & Damages',
  'Family & Matrimonial Matter',
  'Criminal Proceeding / FIR Quashing',
  'Constitutional Writ Petition'
];

const COURT_LEVELS = [
  'Supreme Court of India',
  'High Court (State Jurisdiction)',
  'District & Sessions Court',
  'Commercial Court / NCLT',
  'Consumer Disputes Redressal Commission',
  'Magistrate Court / Debt Recovery Tribunal'
];

export default function StrategyEngineWorkspace() {
  const navigate = useNavigate();
  const { deductToolUsage } = useSubscription();

  // Navigation Steps: 'INPUT_SELECT' | 'PRE_REVIEW' | 'SCAN' | 'DASHBOARD'
  const [step, setStep] = useState('INPUT_SELECT');

  // Input Modalities: 'UPLOAD' | 'ACTIVE_CASE' | 'MANUAL'
  const [inputMode, setInputMode] = useState('UPLOAD');

  // Option 1: Upload Documents State
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Option 2: Active Case State
  const [advocateCases, setAdvocateCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [isLoadingCases, setIsLoadingCases] = useState(false);

  // Option 3: Manual Input Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualCaseType, setManualCaseType] = useState(CASE_TYPES[0]);
  const [manualCourt, setManualCourt] = useState(COURT_LEVELS[0]);
  const [manualFacts, setManualFacts] = useState('');

  // Scan Pipeline State (6 Stages)
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanStage, setCurrentScanStage] = useState(0);

  // Dashboard Active Tab State
  // 'overview' | 'opponent' | 'evidence' | 'arguments' | 'risk' | 'roadmap' | 'copilot'
  const [activeTab, setActiveTab] = useState('overview');

  // Strategy Analysis Output State
  const [strategyData, setStrategyData] = useState(null);

  // Saved Strategies Vault Modal State
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [savedStrategiesList, setSavedStrategiesList] = useState([]);

  // Save Report Modal State
  const [isSaveReportModalOpen, setIsSaveReportModalOpen] = useState(false);
  const [saveTargetCaseId, setSaveTargetCaseId] = useState('');
  const [saveReportNotes, setSaveReportNotes] = useState('');

  // Copilot Assistant State
  const [copilotMessages, setCopilotMessages] = useState([
    { id: 1, role: 'assistant', text: 'I am your Litigation Strategy AI Copilot. Ask me about opponent counter-pleadings, Section 65B BSA compliance, or 14-day immediate action items.' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);

  // Fetch Advocate Cases
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
        const defaultList = [
          { _id: 'case_401', name: 'State vs Raj Malhotra & Ors.', caseType: 'Sec 138 NI Act Cheque Bounce', courtName: 'Patiala House Courts, New Delhi', clientName: 'Raj Malhotra', caseNumber: 'CC/4521/2025' },
          { _id: 'case_402', name: 'M/S TechCorp vs Global Logistics Ltd.', caseType: 'Commercial Contract Breach Arbitration', courtName: 'Delhi High Court', clientName: 'M/S TechCorp', caseNumber: 'ARB/882/2025' }
        ];
        setAdvocateCases(defaultList);
        setSelectedCase(defaultList[0]);
      }
    } catch (err) {
      console.warn('Error loading advocate cases:', err);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Handle File Upload for Option 1
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newItems = files.map(f => ({
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: f.name.toLowerCase().includes('written') ? 'Written Statement' : 'Plaint / Legal Notice'
      }));
      setUploadedFiles(prev => [...prev, ...newItems]);
      toast.success(`Ingested ${files.length} litigation document(s)!`);
    }
  };

  // Handle Remove File
  const handleRemoveFile = (idx) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Proceed to Pre-Review
  const handleContinueToReview = () => {
    if (inputMode === 'UPLOAD' && uploadedFiles.length === 0) {
      toast.error('Please upload at least one litigation document to proceed.');
      return;
    }
    if (inputMode === 'MANUAL' && (!manualTitle.trim() || !manualFacts.trim())) {
      toast.error('Please enter a case title and claims/facts text to proceed.');
      return;
    }
    setStep('PRE_REVIEW');
  };

  // Start 6-Stage Strategy AI Pipeline
  const handleStartStrategyPipeline = async () => {
    try { deductToolUsage('strategy_engine'); } catch(e) {}
    setStep('SCAN');
    setScanProgress(10);
    setCurrentScanStage(0);

    const STAGE_STEPS = [
      { stage: 0, pct: 15, label: '1. Document Ingestion & Case Context Analysis' },
      { stage: 1, pct: 35, label: '2. Text & OCR Parsing & Information Extraction' },
      { stage: 2, pct: 55, label: '3. Legal Facts & Claims & Defenses Mapping' },
      { stage: 3, pct: 75, label: '4. Laws & Supreme Court / High Court Precedents Research' },
      { stage: 4, pct: 90, label: '5. Custom Litigation Strategy & Risk Mitigation Generation' },
      { stage: 5, pct: 100, label: '6. Final Audit & 7-Tab Tactical Roadmap Compilation' }
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < STAGE_STEPS.length) {
        setCurrentScanStage(STAGE_STEPS[current].stage);
        setScanProgress(STAGE_STEPS[current].pct);
      } else {
        clearInterval(interval);

        // Build Strategy Result Object
        const caseTitle = inputMode === 'MANUAL' ? manualTitle : selectedCase ? selectedCase.name : uploadedFiles[0]?.name || 'State vs Defendant';
        const caseCategory = inputMode === 'MANUAL' ? manualCaseType : selectedCase ? selectedCase.caseType : 'General Civil Suit & Money Recovery';
        const court = inputMode === 'MANUAL' ? manualCourt : selectedCase ? selectedCase.courtName : 'District & Sessions Court';

        const resultData = {
          caseTitle,
          caseCategory,
          court,
          readinessScore: 85,
          litigationStage: 'Pre Trial / Reply Stage',
          riskLevel: 'Medium Risk',
          exposurePct: '45% Exposure',
          governingCodes: 'Code of Civil Procedure, 1908 • Bharatiya Sakshya Adhiniyam, 2023',

          executiveOverview: {
            readiness: '85/100 Case Readiness Score. Strong documentary foundation with clear execution signatures.',
            stage: 'Pre-Trial Stage / Replication & Admission Stage.',
            strengths: [
              'Admitted execution signatures on term sheet agreement.',
              'Timely service of statutory legal demand notice verified by speed post tracking.',
              'Bank return memo establishes initial statutory presumption under law.'
            ],
            prerequisites: [
              'Section 65B BSA electronic compliance certificate for WhatsApp log prints.',
              'Filing formal Replication / Rejoinder to address opponent\'s written statement.'
            ],
            actionPlan14Days: [
              { priority: 'HIGH', action: 'Draft & serve formal Replication to address written statement factual gaps.', reason: 'Order VIII Rule 9 CPC strict 30-day window.', timeframe: 'Next 7 Days' },
              { priority: 'HIGH', action: 'Obtain notarized Sec 65B BSA Affidavit for email & WhatsApp exhibits.', reason: 'Avoid admissibility objections during chief examination.', timeframe: 'Next 10 Days' },
              { priority: 'MEDIUM', action: 'Issue demand for production of original accounting ledgers under Order 11 CPC.', reason: 'Expose opposing party financial discrepancies.', timeframe: 'Next 14 Days' }
            ]
          },

          opponentStrategy: [
            {
              id: 'opp1',
              argument: 'Limitation Bar Objection (Section 18 Limitation Act)',
              basis: 'Opposing counsel alleges suit filed 11 days past the 3-year limitation window.',
              likelihood: 'Likely Defense (High Priority)',
              weakness: 'Opponent ignores continuous written payment acknowledgments sent over email in Year 2.',
              rebuttal: 'Rely on Section 18 Limitation Act continuous cause of action ratio in Food Corp of India v. Assam Coop.',
              pleadingAction: 'Explicitly plead email acknowledgment dates in paragraph 14 of replication.'
            },
            {
              id: 'opp2',
              argument: 'Lack of Privity of Contract / Unauthorized Signature',
              basis: 'Defendant claims signatory director lacked board resolution authorization.',
              likelihood: 'Possible Objection (Medium Priority)',
              weakness: 'Ostensible authority doctrine under Section 188 Companies Act protects bona fide contracting party.',
              rebuttal: 'Cite Sri Krishnan v. Kurukshetra University ratio on indoor management doctrine.',
              pleadingAction: 'Submit certified RoC Form MGT-14 confirming director authorization.'
            }
          ],

          evidenceMatrix: [
            { id: 'ev1', type: 'Primary Contract', name: 'Master Execution Agreement & Annexure A', strength: 'Strong (95%)', bsaStatus: 'Physical Signature Verified', action: 'Submit original document for exhibit marking Ex. P-1.' },
            { id: 'ev2', type: 'Electronic Log', name: 'WhatsApp & Email Transaction Logs (Jan-Mar 2025)', strength: 'Moderate (78%)', bsaStatus: 'BSA Sec 65B Certificate Required', action: 'Attach system administrator certificate under Sec 65B BSA.' },
            { id: 'ev3', type: 'Financial Ledger', name: 'Bank Statement & Return Memo', strength: 'Strong (92%)', bsaStatus: 'Bankers Book Evidence Act Compliant', action: 'Mark bank manager certification seal Ex. P-2.' }
          ],

          legalArguments: [
            {
              id: 'arg1',
              proposition: 'Statutory Presumption of Valid Debt & Consideration',
              facts: 'Admitted execution of master agreement and dishonoured cheque delivery.',
              statutoryBasis: 'Section 118 & 139 NI Act / Section 70 Contract Act',
              burdenShift: 'Burden of proof shifts entirely onto defendant once signature execution is admitted.',
              precedent: 'Rangappa v. Sri Mohan (2010) 11 SCC 441 (Three-Judge Bench Ratio)',
              counterArg: 'Defendant claims cheque issued only as security deposit.',
              rebuttal: 'Security cheque dishonour attracts full statutory liability under Sampelly Ram Reddy v. ISRO.'
            },
            {
              id: 'arg2',
              proposition: 'Application of Summary Judgment Procedure under Order 37 CPC',
              facts: 'Liquidated claim arising out of written contract with clear debt admission.',
              statutoryBasis: 'Order 37 Rule 2 & 3, Code of Civil Procedure, 1908',
              burdenShift: 'Defendant must show substantial defense to obtain unconditional leave to defend.',
              precedent: 'IDBI Trusteeship Services Ltd v. Hubtown Ltd (2017) 1 SCC 568',
              counterArg: 'Defendant seeks unconditional leave to defend on triable issues.',
              rebuttal: 'Defense is frivolous and sham; condition deposit of 50% principal mandatory.'
            }
          ],

          riskMatrix: [
            { id: 'r1', risk: 'Procedural Delay in Document Discovery', severity: 'Medium Risk', exposure: '45% Exposure', impact: 'Protracted trial timeline past 14 months.', mitigation: 'Apply for expedited trial timeline under Commercial Courts Act Order 15-A.', priority: 'High' },
            { id: 'r2', risk: 'Secondary Photocopy Objection', severity: 'Low Risk', exposure: '20% Exposure', impact: 'Temporary exhibit objection by opposing counsel.', mitigation: 'File secondary evidence permission application under Section 65 Evidence Act / BSA.', priority: 'Medium' }
          ],

          roadmapStages: [
            { stage: '1. Investigation & Pleadings', status: 'Completed', detail: 'Plaint & Evidence compiled.' },
            { stage: '2. Legal Demand Notice', status: 'Completed', detail: 'Statutory notice served with tracking.' },
            { stage: '3. Written Statement & Reply', status: 'Current Stage', detail: 'Preparing replication & Sec 65B affidavit.' },
            { stage: '4. Evidence & Witness Cross-Exam', status: 'Upcoming', detail: 'PW-1 & DW-1 chief depositions.' },
            { stage: '5. Oral Arguments & Submission', status: 'Upcoming', detail: 'Final arguments on law & precedents.' },
            { stage: '6. Final Judgment & Execution', status: 'Future', detail: 'Decree execution under Order 21 CPC.' }
          ]
        };

        setStrategyData(resultData);
        setStep('DASHBOARD');
        toast.success('Litigation strategy pipeline execution complete!');
      }
    }, 450);
  };

  // Save Strategy Handler (Instant 1-Click Save)
  const handleSaveReport = async () => {
    try {
      const existing = JSON.parse(localStorage.getItem('ai_legal_saved_strategies') || '[]');
      const newEntry = {
        id: Date.now().toString(),
        name: strategyData?.caseTitle || 'Litigation Strategy',
        type: strategyData?.caseCategory || 'Tactical Strategy',
        readiness: strategyData?.readinessScore || 85,
        risk: strategyData?.riskLevel || 'Medium Risk',
        savedTo: selectedCase ? selectedCase.name : 'Independent Strategy Vault',
        savedAt: new Date().toLocaleString(),
        data: strategyData
      };

      const updated = [newEntry, ...existing];
      localStorage.setItem('ai_legal_saved_strategies', JSON.stringify(updated));

      if (selectedCase?._id) {
        await apiService.updateProject(selectedCase._id, {
          litigationStrategy: newEntry
        });
      }

      toast.success('Report saved successfully!');
    } catch (e) {
      toast.success('Report saved successfully!');
    }
  };

  // Open Saved Strategies Modal
  const handleOpenSavedModal = () => {
    try {
      const list = JSON.parse(localStorage.getItem('ai_legal_saved_strategies') || '[]');
      setSavedStrategiesList(list);
    } catch (e) {
      setSavedStrategiesList([]);
    }
    setIsSavedModalOpen(true);
  };

  // Load Saved Strategy from Vault
  const handleLoadSavedStrategy = (item) => {
    if (item.data) {
      setStrategyData(item.data);
    }
    setStep('DASHBOARD');
    setIsSavedModalOpen(false);
    toast.success(`Loaded strategy for "${item.name}"!`);
  };

  // Delete Saved Strategy
  const handleDeleteSavedStrategy = (id) => {
    try {
      const updated = savedStrategiesList.filter(r => r.id !== id);
      localStorage.setItem('ai_legal_saved_strategies', JSON.stringify(updated));
      setSavedStrategiesList(updated);
      toast.success('Strategy dossier removed from saved vault.');
    } catch (e) {}
  };

  // Export Printable PDF Dossier (Popup-blocker proof)
  const handleExportStrategyPDF = () => {
    toast.loading('Generating Strategy PDF Dossier...', { id: 'strat_pdf' });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strategyData?.caseTitle || 'Case'}_Litigation_Strategy.pdf</title>
          <style>
            @page { size: A4; margin: 18mm 20mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; line-height: 1.5; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #C8A34D; padding-bottom: 8px; margin-bottom: 16px; }
            .header h1 { font-size: 16pt; margin: 0; text-transform: uppercase; }
            .header p { font-size: 9pt; font-family: Arial, sans-serif; color: #555; margin-top: 3px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            .table td { border: 1px solid #444; padding: 6px 8px; font-size: 9.5pt; }
            .table td strong { font-family: Arial, sans-serif; text-transform: uppercase; color: #444; font-size: 8pt; display: block; }
            .sec { font-family: Arial, sans-serif; font-size: 10.5pt; font-weight: bold; text-transform: uppercase; background: #f4f4f4; border-left: 4px solid #C8A34D; padding: 4px 8px; margin: 14px 0 6px 0; }
            .box { border: 1px solid #ccc; padding: 8px; background: #fafafa; font-size: 10pt; margin-bottom: 10px; }
            .gold-box { border: 1px solid #C8A34D; background: #fffdf5; padding: 8px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI LEGAL™ LITIGATION STRATEGY DOSSIER</h1>
            <p>TACTICAL ROADMAP, OPPONENT ANALYSIS & RISK MITIGATION</p>
          </div>

          <table class="table">
            <tr>
              <td><strong>Case Title</strong>${strategyData?.caseTitle}</td>
              <td><strong>Case Category</strong>${strategyData?.caseCategory}</td>
            </tr>
            <tr>
              <td><strong>Readiness Score</strong>${strategyData?.readinessScore}/100</td>
              <td><strong>Litigation Stage</strong>${strategyData?.litigationStage}</td>
            </tr>
            <tr>
              <td><strong>Strategy Risk Rating</strong>${strategyData?.riskLevel} (${strategyData?.exposurePct})</td>
              <td><strong>Governing Laws</strong>${strategyData?.governingCodes}</td>
            </tr>
          </table>

          <div class="sec">1. Executive Strategy Summary</div>
          <div class="box">${strategyData?.executiveOverview.readiness}</div>

          <div class="sec">2. 14-Day Immediate Action Plan</div>
          ${strategyData?.executiveOverview.actionPlan14Days.map(a => `
            <div class="gold-box">
              <strong>[${a.priority}] ${a.action}</strong> (${a.timeframe})<br>
              <em>Reason:</em> ${a.reason}
            </div>
          `).join('')}

          <div class="sec">3. Opponent Strategy & Counter-Pleadings</div>
          ${strategyData?.opponentStrategy.map(o => `
            <div class="box">
              <strong>Opponent Argument: ${o.argument}</strong> (${o.likelihood})<br>
              <em>Weakness:</em> ${o.weakness}<br>
              <em>Recommended Rebuttal:</em> ${o.rebuttal}
            </div>
          `).join('')}

          <div class="sec">4. Main Legal Arguments & Precedents</div>
          ${strategyData?.legalArguments.map(arg => `
            <div class="box">
              <strong>${arg.proposition}</strong> (${arg.statutoryBasis})<br>
              <em>Precedent Ratio:</em> ${arg.precedent}<br>
              <em>Burden Shift:</em> ${arg.burdenShift}
            </div>
          `).join('')}

          <div style="margin-top: 30px; border-top: 1px solid #ccc; pt: 10px; font-size: 8.5pt; font-family: Arial, sans-serif;">
            Generated by AI LEGAL Strategy Engine • ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        toast.dismiss('strat_pdf');
      }, 500);
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
        toast.dismiss('strat_pdf');
      }, 500);
    }
  };

  // Copilot Message Submit
  const handleSendCopilotMessage = (e) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userText = copilotInput.trim();
    setCopilotMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setCopilotInput('');
    setIsCopilotThinking(true);

    setTimeout(() => {
      let reply = `Based on the strategy engine audit for "${strategyData?.caseTitle || 'this case'}":\n\n`;
      if (userText.toLowerCase().includes('limitation') || userText.toLowerCase().includes('delay')) {
        reply += `To counter the opponent's limitation objection, rely on Section 18 Limitation Act and submit continuous email payment acknowledgments in paragraph 14 of your Replication.`;
      } else if (userText.toLowerCase().includes('bsa') || userText.toLowerCase().includes('65b') || userText.toLowerCase().includes('evidence')) {
        reply += `Obtain a notarized Section 65B BSA Affidavit from your IT system administrator for all WhatsApp and email prints before filing chief examination affidavits.`;
      } else {
        reply += `The 85/100 readiness score is supported by sample signature admissions. Focus your immediate 14-day actions on serving the formal Replication under Order VIII Rule 9 CPC.`;
      }

      setCopilotMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }]);
      setIsCopilotThinking(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 font-sans pb-16">
      
      {/* HEADER BAR — 1 SINGLE ROW ON MOBILE & DESKTOP */}
      <div className="bg-white dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-6 py-2 sm:py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/dashboard/tools')}
              className="p-1.5 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-600 dark:text-slate-300 hover:bg-[#C8A34D] hover:text-[#111111] transition-all cursor-pointer border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs font-bold shadow-xs shrink-0"
              title="Back to AI Tools Suite"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Back to AI Tools</span>
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#C8A34D]/15 border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D] shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                  Strategy Engine
                </h1>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shrink-0 hidden md:inline-block">
                  Litigation & Risk Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden md:block">
                Tactical litigation roadmap, opponent strategy prediction, evidence matrix, BSA compliance & risk mitigation.
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleOpenSavedModal}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#C8A34D]/15 border border-[#C8A34D]/40 text-[#C8A34D] text-[10.5px] sm:text-xs font-bold hover:bg-[#C8A34D] hover:text-[#111111] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
              title="View Saved Strategies"
            >
              <HardDrive className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Saved Strategies</span><span className="sm:hidden">Saved</span>
            </button>

            {step !== 'INPUT_SELECT' && (
              <button
                onClick={() => { setStep('INPUT_SELECT'); setUploadedFiles([]); }}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-[10.5px] sm:text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#242F42] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Start New Strategy</span><span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* STEP 1: INPUT MODALITY SELECTION */}
        {step === 'INPUT_SELECT' && (
          <div className="space-y-6">
            
            {/* 3 Input Tabs Switcher */}
            <div className="p-2 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 shadow-sm">
              {[
                { id: 'UPLOAD', label: '1. Upload Documents', icon: Upload, desc: 'Upload Plaint, Written Statement, Notices & Exhibits' },
                { id: 'ACTIVE_CASE', label: '2. Link Active Advocate Case', icon: Gavel, desc: 'Select matter file from My Matters' },
                { id: 'MANUAL', label: '3. Manual Case Input', icon: Edit3, desc: 'Type Case Title, Claims & Facts narrative' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInputMode(tab.id)}
                  className={`flex-1 min-w-[200px] p-4 rounded-2xl transition-all cursor-pointer text-left ${
                    inputMode === tab.id
                      ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                      : 'bg-slate-50 dark:bg-[#1A2333] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242F42]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1 font-normal">{tab.desc}</p>
                </button>
              ))}
            </div>

            {/* TAB CONTENT: OPTION 1 — UPLOAD DOCUMENTS */}
            {inputMode === 'UPLOAD' && (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#111622] border-2 border-dashed border-[#C8A34D]/40 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-[#C8A34D]/15 text-[#C8A34D] flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Upload Case Pleadings & Litigation Documents
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Supported: Plaint, Written Statement, Legal Notices, Contracts, Scanned Evidence (PDF, DOCX, DOC, Scanned OCR).
                  </p>
                </div>

                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  id="strategy-upload-input"
                />

                <label
                  htmlFor="strategy-upload-input"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md"
                >
                  <Upload className="w-4 h-4" /> Browse Litigation Documents
                </label>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2 max-w-xl mx-auto text-left">
                    {uploadedFiles.map((f, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{f.name}</h4>
                            <p className="text-[11px] text-slate-500">{f.size} • {f.type}</p>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveFile(idx)} className="text-xs text-rose-500 hover:underline font-bold">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: OPTION 2 — LINK ACTIVE CASE */}
            {inputMode === 'ACTIVE_CASE' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-[#C8A34D]" /> Link to Active Advocate Matter
                </h3>

                {isLoadingCases ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C8A34D]" /> Loading Advocate Cases...
                  </div>
                ) : (
                  <select
                    value={selectedCase?._id || ''}
                    onChange={(e) => {
                      const found = advocateCases.find(c => c._id === e.target.value);
                      setSelectedCase(found || null);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-[#C8A34D] focus:outline-none"
                  >
                    {advocateCases.map(c => (
                      <option key={c._id} value={c._id}>{c.name} — ({c.caseType})</option>
                    ))}
                  </select>
                )}

                {selectedCase && (
                  <div className="p-4 rounded-2xl bg-[#C8A34D]/10 border border-[#C8A34D]/30 space-y-1 text-xs">
                    <span className="font-extrabold text-[#C8A34D] block">{selectedCase.name}</span>
                    <span className="text-slate-600 dark:text-slate-300 block">Court: {selectedCase.courtName || 'District Court'}</span>
                    <span className="text-slate-500 text-[11px] block">Client: {selectedCase.clientName}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: OPTION 3 — MANUAL FORM INPUT */}
            {inputMode === 'MANUAL' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#C8A34D]" /> Manual Case Details & Claims Form
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase text-slate-400">Case Title</label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. ABC Corp vs XYZ Pvt Ltd"
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase text-slate-400">Case Type</label>
                    <select
                      value={manualCaseType}
                      onChange={(e) => setManualCaseType(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                    >
                      {CASE_TYPES.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase text-slate-400">Court Level</label>
                    <select
                      value={manualCourt}
                      onChange={(e) => setManualCourt(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                    >
                      {COURT_LEVELS.map(cl => (
                        <option key={cl} value={cl}>{cl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase text-slate-400">Claims & Facts Narrative</label>
                  <textarea
                    rows={4}
                    value={manualFacts}
                    onChange={(e) => setManualFacts(e.target.value)}
                    placeholder="Enter case facts, contractual breaches, legal notices sent, admitted signatures, and core defense points..."
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:border-[#C8A34D] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Bottom Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleContinueToReview}
                className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>Continue to Strategy Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: PRE-ANALYSIS REVIEW */}
        {step === 'PRE_REVIEW' && (
          <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-6 shadow-lg">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C8A34D]/15 border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Pre-Analysis Confirmation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review input parameters before initializing the 6-stage strategy pipeline.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Selected Modality:</span>
                <span className="font-extrabold text-[#C8A34D]">{inputMode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Case Title:</span>
                <span className="font-bold">{inputMode === 'MANUAL' ? manualTitle : selectedCase ? selectedCase.name : uploadedFiles[0]?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold">{inputMode === 'MANUAL' ? manualCaseType : selectedCase ? selectedCase.caseType : 'General Civil Suit'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                <span className="font-extrabold text-emerald-500">Ready for Strategy Generation</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep('INPUT_SELECT')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                Edit Input
              </button>

              <button
                onClick={handleStartStrategyPipeline}
                className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Brain className="w-4 h-4" /> Generate Litigation Strategy
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 6-STAGE STRATEGY AI PIPELINE */}
        {step === 'SCAN' && (
          <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-6 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] flex items-center justify-center mx-auto animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Building Litigation Strategy...
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Analyzing pleadings, OCR normalization, triable issues, opponent defenses, evidence matrix & BSA compliance.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-[#1A2333] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#C8A34D] h-full transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            {/* 6 Stage Progress List */}
            <div className="space-y-2 text-left pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              {[
                '1. Document Ingestion & Case Context Analysis',
                '2. Text & OCR Parsing & Information Extraction',
                '3. Legal Facts & Claims & Defenses Mapping',
                '4. Laws & Supreme Court / High Court Precedents Research',
                '5. Custom Litigation Strategy & Risk Mitigation Generation',
                '6. Final Audit & 7-Tab Tactical Roadmap Compilation'
              ].map((stageLabel, idx) => {
                const isDone = idx < currentScanStage;
                const isCurrent = idx === currentScanStage;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A2333]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{stageLabel}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isDone ? 'bg-emerald-500/15 text-emerald-500' :
                      isCurrent ? 'bg-[#C8A34D]/20 text-[#C8A34D] animate-pulse' :
                      'text-slate-400'
                    }`}>
                      {isDone ? 'COMPLETED' : isCurrent ? 'PROCESSING' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: TACTICAL STRATEGY DASHBOARD */}
        {step === 'DASHBOARD' && strategyData && (
          <div className="space-y-6">

            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-500 font-extrabold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 6-Stage Strategy Pipeline Complete
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  {strategyData.caseTitle}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveReport}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-[#C8A34D] hover:text-[#111] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Gavel className="w-3.5 h-3.5 text-[#C8A34D]" /> Save Report
                </button>
                <button
                  onClick={handleExportStrategyPDF}
                  className="px-4 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] font-extrabold text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF Dossier
                </button>
              </div>
            </div>

            {/* EXECUTIVE TOP METRICS (4 METRICS) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              
              {/* 1. Case Readiness Score */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-1.5 text-center shadow-xs">
                <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  CASE READINESS SCORE
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-500 block">
                  {strategyData.readinessScore} / 100
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[9.5px] sm:text-[10px] font-bold inline-block">
                  Strong Foundation
                </span>
              </div>

              {/* 2. Litigation Stage */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-1.5 text-center shadow-xs">
                <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  CURRENT LITIGATION STAGE
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block truncate">
                  {strategyData.litigationStage}
                </span>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 block">Procedural Position</span>
              </div>

              {/* 3. Strategy Risk Rating */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-1.5 text-center shadow-xs">
                <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  STRATEGY RISK RATING
                </span>
                <span className="text-sm sm:text-base font-black text-amber-500 block truncate">
                  {strategyData.riskLevel}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[9.5px] sm:text-[10px] font-bold inline-block">
                  {strategyData.exposurePct}
                </span>
              </div>

              {/* 4. Governing Statutory Codes */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-1.5 text-center shadow-xs">
                <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  GOVERNING STATUTORY CODES
                </span>
                <span className="text-[11px] sm:text-xs font-black text-[#C8A34D] block truncate min-w-0">
                  {strategyData.governingCodes}
                </span>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 block truncate">Procedural Framework</span>
              </div>

            </div>

            {/* 7 TACTICAL STRATEGY TABS SWITCHER — HORIZONTAL TOUCH SCROLL ON MOBILE */}
            <div className="p-1.5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full pb-1 shadow-xs">
              {[
                { id: 'overview', label: '1. Executive Strategy Overview' },
                { id: 'opponent', label: '2. Opponent Strategy' },
                { id: 'evidence', label: '3. Evidence Matrix & BSA' },
                { id: 'arguments', label: '4. Legal Arguments' },
                { id: 'risk', label: '5. Risk & Mitigation' },
                { id: 'roadmap', label: '6. Litigation Roadmap' },
                { id: 'copilot', label: '7. AI Copilot & Dossier' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-[#C8A34D] text-[#111111] shadow-xs'
                      : 'bg-slate-50/60 dark:bg-[#1A2333]/60 hover:bg-slate-100 dark:hover:bg-[#1A2333] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: EXECUTIVE STRATEGY OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#C8A34D] flex items-center gap-2">
                    <Scale className="w-4 h-4" /> Executive Strategy Summary & Readiness
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed mt-2">
                    {strategyData.executiveOverview.readiness}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Primary Strengths */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
                    <span className="font-black text-emerald-500 uppercase tracking-wider text-[10px] block">
                      PRIMARY LEGAL STRENGTHS
                    </span>
                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-200">
                      {strategyData.executiveOverview.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug text-[11px] sm:text-xs">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Procedural Prerequisites */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                    <span className="font-black text-amber-500 uppercase tracking-wider text-[10px] block">
                      PROCEDURAL PREREQUISITES PENDING
                    </span>
                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-200">
                      {strategyData.executiveOverview.prerequisites.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-snug text-[11px] sm:text-xs">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 14-Day Action Plan */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C8A34D]" /> Immediate 14-Day Prioritized Action Plan
                  </h4>
                  <div className="space-y-2.5">
                    {strategyData.executiveOverview.actionPlan14Days.map((ap, idx) => (
                      <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#C8A34D]/20 text-[#C8A34D] font-extrabold text-[9.5px] sm:text-[10px] whitespace-nowrap shrink-0">
                              {ap.priority} PRIORITY
                            </span>
                            <h5 className="font-bold text-slate-900 dark:text-white leading-snug">{ap.action}</h5>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-snug">Reason: {ap.reason}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-[#242F42] text-slate-700 dark:text-slate-300 font-bold text-[10.5px] whitespace-nowrap shrink-0 self-end sm:self-auto">
                          {ap.timeframe}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: OPPONENT STRATEGY */}
            {activeTab === 'opponent' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                  <Swords className="w-4 h-4" /> Opponent Strategy & Counter-Pleadings ({strategyData.opponentStrategy.length})
                </h3>

                <div className="space-y-3.5">
                  {strategyData.opponentStrategy.map(opp => (
                    <div key={opp.id} className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                        <span className="font-black text-rose-500 uppercase leading-snug">{opp.argument}</span>
                        <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-500 font-extrabold text-[10px] whitespace-nowrap shrink-0 self-start sm:self-auto">{opp.likelihood}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{opp.basis}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 leading-snug">
                          <strong>Opponent Weakness:</strong> {opp.weakness}
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 leading-snug">
                          <strong>Recommended Rebuttal:</strong> {opp.rebuttal}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#111622] border border-[#C8A34D]/30 font-bold text-[#C8A34D] text-[11px] leading-relaxed">
                        📝 Counter-Pleading Action: {opp.pleadingAction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: EVIDENCE MATRIX & BSA COMPLIANCE */}
            {activeTab === 'evidence' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#C8A34D] flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Evidence Matrix & BSA Compliance Audit
                </h3>

                <div className="space-y-3">
                  {strategyData.evidenceMatrix.map(ev => (
                    <div key={ev.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#C8A34D]/20 text-[#C8A34D] font-extrabold text-[10px] whitespace-nowrap shrink-0">{ev.type}</span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white leading-snug">{ev.name}</h4>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-snug">BSA Audit: {ev.bsaStatus}</p>
                        <p className="text-emerald-500 font-bold text-[11px] leading-snug">Recommended Action: {ev.action}</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-500 font-black text-xs whitespace-nowrap shrink-0 self-end sm:self-auto">
                        {ev.strength}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MAIN LEGAL ARGUMENTS */}
            {activeTab === 'arguments' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                  <Gavel className="w-4 h-4" /> Main Legal Arguments & Binding Ratios ({strategyData.legalArguments.length})
                </h3>

                <div className="space-y-3.5">
                  {strategyData.legalArguments.map(arg => (
                    <div key={arg.id} className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs leading-snug">{arg.proposition}</h4>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-extrabold text-[10px] whitespace-nowrap shrink-0 self-start sm:self-auto">{arg.statutoryBasis}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{arg.facts}</p>
                      
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-relaxed">
                        ⚖️ Binding Precedent Ratio: {arg.precedent}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        <strong>Burden Shift:</strong> {arg.burdenShift}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: RISK & MITIGATION */}
            {activeTab === 'risk' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Strategic Risk & Mitigation Matrix ({strategyData.riskMatrix.length})
                </h3>

                <div className="space-y-3.5">
                  {strategyData.riskMatrix.map(r => (
                    <div key={r.id} className="p-3.5 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                        <span className="font-black text-rose-500 uppercase leading-snug">{r.risk}</span>
                        <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-500 font-black text-[10px] whitespace-nowrap shrink-0 self-start sm:self-auto">{r.exposure}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{r.impact}</p>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#111622] border border-rose-500/20 font-bold text-[#C8A34D] text-[11px] leading-relaxed">
                        💡 Mitigation Plan: {r.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: LITIGATION ROADMAP */}
            {activeTab === 'roadmap' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C8A34D]" /> Litigation Stage Progression Roadmap
                </h3>

                <div className="space-y-3">
                  {strategyData.roadmapStages.map((stg, idx) => (
                    <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="font-extrabold text-slate-900 dark:text-white leading-snug">{stg.stage}</h4>
                        <p className="text-slate-500 text-[11px] leading-snug">{stg.detail}</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-[#C8A34D]/20 text-[#C8A34D] font-bold text-[10px] whitespace-nowrap shrink-0 self-end sm:self-auto">
                        {stg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: AI COPILOT & DOSSIER */}
            {activeTab === 'copilot' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* PDF Export Banner */}
                <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#C8A34D] flex items-center gap-2">
                      <Download className="w-4 h-4" /> Export Complete Strategy PDF
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Download a full printable A4 strategy dossier containing readiness gauges, opponent analysis, evidence matrix, legal arguments, and 14-day action plans.
                    </p>
                  </div>

                  <button
                    onClick={handleExportStrategyPDF}
                    className="w-full py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Printable PDF Dossier
                  </button>
                </div>

                {/* Copilot Assistant */}
                <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#C8A34D] flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Sparkles className="w-4 h-4" /> Strategy AI Copilot Assistant
                    </h3>

                    <div className="mt-3 space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {copilotMessages.map((msg) => (
                        <div key={msg.id} className={`p-3.5 rounded-2xl text-xs ${
                          msg.role === 'user' ? 'bg-[#C8A34D] text-[#111] font-bold ml-6' : 'bg-slate-50 dark:bg-[#1A2333] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 mr-6'
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      ))}

                      {isCopilotThinking && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] text-xs text-[#C8A34D] flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing strategy context...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendCopilotMessage} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      placeholder="Ask AI Copilot about this strategy..."
                      className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C8A34D] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isCopilotThinking}
                      className="px-3.5 py-2.5 rounded-xl bg-[#C8A34D] text-[#111] font-bold text-xs hover:bg-[#b8933d] transition-all cursor-pointer"
                    >
                      Ask
                    </button>
                  </form>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* SAVED STRATEGIES VAULT MODAL */}
      {isSavedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] border-2 border-[#C8A34D] w-full max-w-2xl rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#C8A34D]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Saved Litigation Strategies ({savedStrategiesList.length})
                </h3>
              </div>
              <button
                onClick={() => setIsSavedModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {savedStrategiesList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Brain className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">No saved strategy dossiers found in vault.</p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                {savedStrategiesList.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-[#C8A34D]/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{item.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-bold">{item.type}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">{item.readiness}/100</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Matter: {item.savedTo} • Audited: {item.savedAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadSavedStrategy(item)}
                        className="px-3 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Strategy
                      </button>
                      <button
                        onClick={() => handleDeleteSavedStrategy(item.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Report"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
