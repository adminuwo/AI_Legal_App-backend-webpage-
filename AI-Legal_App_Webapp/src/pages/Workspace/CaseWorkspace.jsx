import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, MessageSquare, History, Gavel, Users, FileText, 
  ShieldCheck, BookOpen, Upload, FileDigit, FileSignature, AlertTriangle, 
  TrendingUp, ListTodo, PenTool, Activity, Settings, ArrowLeft, Edit2, 
  Share2, Archive, Download, Trash2, Check, Plus, Search, Eye, Copy, 
  ChevronRight, Calendar, AlertCircle, Sparkles, Pin, PinOff, X, 
  ChevronDown, Clock, Building, MapPin, User, Filter, Printer, 
  ExternalLink, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CaseWorkspace = ({
  caseId,
  currentCase,
  onUpdateCase,
  activeTab,
  setActiveTab,
  handleBackToDashboard,
  handleDeleteCase,
  isRenamingCase,
  renameValue,
  setRenameValue,
  handleRenameCase,
  setIsRenamingCase,
  aiPanel,
  onAskAi,
  children,
  isAiPanelFullscreen,
  setIsAiPanelFullscreen
}) => {
  // Local state copy of current case for instant changes
  const [caseData, setCaseData] = useState(currentCase || {});
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState(true);

  // Redesigned Timeline States
  const [timelineSearch, setTimelineSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterImportance, setFilterImportance] = useState('All');
  const [filterConfidence, setFilterConfidence] = useState('All');
  const [filterOrigin, setFilterOrigin] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddingManualEvent, setIsAddingManualEvent] = useState(false);
  
  const [isNarrativeExtractorOpen, setIsNarrativeExtractorOpen] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [isExtractingNarrative, setIsExtractingNarrative] = useState(false);
  
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [selectedDocToExtract, setSelectedDocToExtract] = useState('');
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventData, setEditingEventData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [selectedEvidenceToAttach, setSelectedEvidenceToAttach] = useState('');
  const [showDuplicateMergeSuggestion, setShowDuplicateMergeSuggestion] = useState(true);
  const [showMissingNoticeSuggestion, setShowMissingNoticeSuggestion] = useState(true);
  
  const [narrativeSteps, setNarrativeSteps] = useState([]);
  const [activeNarrativeStep, setActiveNarrativeStep] = useState(0);
  const [docSteps, setDocSteps] = useState([]);
  const [activeDocStep, setActiveDocStep] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeFilterChip, setActiveFilterChip] = useState('All');
  const [isOcrPanelOpen, setIsOcrPanelOpen] = useState(false);

  // Redesigned Hearings States
  const [hearingsSearch, setHearingsSearch] = useState('');
  const [activeHearingFilter, setActiveHearingFilter] = useState('All');
  const [selectedHearing, setSelectedHearing] = useState(null);
  const [isHearingDrawerOpen, setIsHearingDrawerOpen] = useState(false);
  const [isAddingHearingFormOpen, setIsAddingHearingFormOpen] = useState(false);
  const [attachedHearingDoc, setAttachedHearingDoc] = useState('');
  const [isExtractingHearing, setIsExtractingHearing] = useState(false);
  const [hearingExtractSteps, setHearingExtractSteps] = useState([]);
  const [activeHearingExtractStep, setActiveHearingExtractStep] = useState(0);
  const [isRecordingOutcome, setIsRecordingOutcome] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: '',
    courtObservations: '',
    ordersPassed: '',
    evidenceAccepted: '',
    argumentsCompleted: '',
    witnessExamined: '',
    adjournmentReason: '',
    nextHearingDate: ''
  });
  const [isGeneratingHearingSummary, setIsGeneratingHearingSummary] = useState(false);
  const [activeHearingMoreMenu, setActiveHearingMoreMenu] = useState(null);
  const [isMoreHearingActionsOpen, setIsMoreHearingActionsOpen] = useState(false);
  const [isOcrHearingPanelOpen, setIsOcrHearingPanelOpen] = useState(false);

  // Parties Module Redesign States
  const [isPartiesEditMode, setIsPartiesEditMode] = useState(false);
  const [tempPartiesData, setTempPartiesData] = useState({});
  const [extractedPartiesData, setExtractedPartiesData] = useState(null);
  const [isExtractingParties, setIsExtractingParties] = useState(false);
  const [partiesExtractionSteps, setPartiesExtractionSteps] = useState([]);
  const [activePartiesExtractionStep, setActivePartiesExtractionStep] = useState(0);

  // AI Legal Research Engine States
  const [researchSearchQuery, setResearchSearchQuery] = useState('');
  const [isRegeneratingResearch, setIsRegeneratingResearch] = useState(false);
  const [researchRegenSteps, setResearchRegenSteps] = useState([]);
  const [activeResearchRegenStep, setActiveResearchRegenStep] = useState(0);
  const [expandedResearchSection, setExpandedResearchSection] = useState('dashboard');
  const [conversationalSearchResults, setConversationalSearchResults] = useState(null);
  const [isSearchingResearch, setIsSearchingResearch] = useState(false);

  const [previewDoc, setPreviewDoc] = useState(null);

  // AI Contract Intelligence Engine States
  const [uploadedContract, setUploadedContract] = useState(null);
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
  const [contractAnalysisSteps, setContractAnalysisSteps] = useState([]);
  const [activeContractAnalysisStep, setActiveContractAnalysisStep] = useState(0);
  const [contractActiveSubTab, setContractActiveSubTab] = useState('summary');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractChatMessages, setContractChatMessages] = useState([
    { sender: 'ai', text: "Hello! I am your AI Contract Review Assistant. Ask me anything about this contract's clauses, risk liabilities, or request a customized clause rewrite." }
  ]);
  const [contractChatInput, setContractChatInput] = useState('');
  const [isContractLinked, setIsContractLinked] = useState(false);

  // AI Courtroom Strategy Engine States
  const [argumentsActiveSubTab, setArgumentsActiveSubTab] = useState('dashboard');
  const [argumentsSearchQuery, setArgumentsSearchQuery] = useState('');
  const [isAnalyzingArguments, setIsAnalyzingArguments] = useState(false);
  const [argumentsAnalysisSteps, setArgumentsAnalysisSteps] = useState([]);
  const [activeArgumentsStep, setActiveArgumentsStep] = useState(0);
  const [argumentsExportOpen, setArgumentsExportOpen] = useState(false);
  const [isPreparingHearing, setIsPreparingHearing] = useState(false);
  // Sync state if case changes
  useEffect(() => {
    if (currentCase) {
      setCaseData(currentCase);
    }
  }, [currentCase]);

  // Unified helper to save case data
  const handleUpdateField = async (updatedFields) => {
    const updated = { ...caseData, ...updatedFields };
    setCaseData(updated);
    if (onUpdateCase) {
      onUpdateCase(updated);
    }
  };

  // State forms
  const [newTimeline, setNewTimeline] = useState({ date: '', title: '', description: '' });
  const [newHearing, setNewHearing] = useState({ date: '', title: '', judge: '', courtroom: '', notes: '', status: 'Upcoming' });
  const [newParty, setNewParty] = useState({ type: 'Witness', name: '', contact: '', notes: '' });
  const [newPrecedent, setNewPrecedent] = useState({ title: '', citation: '', year: '', summary: '' });
  const [newDraft, setNewDraft] = useState({ name: '', type: 'Notice', content: '' });
  const [newContract, setNewContract] = useState({ name: '', riskLevel: 'Medium', notes: '' });
  const [newArgument, setNewArgument] = useState({ title: '', content: '' });
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', deadline: '' });
  const [newActivity, setNewActivity] = useState({ type: 'Call', title: '', notes: '' });

  // 17 Tab configuration
  const tabs = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'timeline', name: 'Timeline', icon: History },
    { id: 'hearings', name: 'Hearings', icon: Gavel },
    { id: 'parties', name: 'Parties', icon: Users },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'evidence', name: 'Evidence Vault', icon: ShieldCheck },
    { id: 'research', name: 'Research & Laws', icon: BookOpen },
    { id: 'drafts', name: 'Drafts', icon: PenTool },
    { id: 'contracts', name: 'Contracts', icon: FileSignature },
    { id: 'arguments', name: 'Arguments', icon: AlertCircle },
    { id: 'strategy', name: 'Strategy Engine', icon: AlertTriangle },
    { id: 'prediction', name: 'Outcome Prediction', icon: TrendingUp },
    { id: 'tasks', name: 'Tasks', icon: ListTodo },
    { id: 'notes', name: 'Case Notes', icon: Edit2 },
    { id: 'activity', name: 'Activity Log', icon: Activity },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  // Helper calculations
  const totalTasks = caseData.tasks?.length || 0;
  const completedTasks = caseData.tasks?.filter(t => t.status === 'Completed').length || 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Renderers for each tab
  const renderOverview = () => {
    const nextHearing = caseData.hearings?.find(h => h.status === 'Upcoming') || null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-3">Case Summary</h3>
              <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                {caseData.summary || caseData.caseSummary || 'No case description or facts provided yet. Head to the Settings or Overview tab to initialize details.'}
              </p>
            </div>
            
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Recent Facts & Events</span>
                <button onClick={() => setActiveTab('timeline')} className="text-xs font-bold text-[#6D5DFC] hover:underline">View Timeline</button>
              </h3>
              {caseData.timeline && caseData.timeline.length > 0 ? (
                <div className="space-y-4 relative border-l border-slate-100 pl-4 ml-2">
                  {caseData.timeline.slice(0, 3).map((item, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[#6D5DFC] rounded-full border border-white" />
                      <div className="text-[10px] font-bold text-[#6B7280]">{item.date}</div>
                      <div className="text-xs font-bold text-[#111827]">{item.title}</div>
                      <div className="text-xs text-[#4B5563] mt-0.5">{item.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#9CA3AF] font-semibold">No timeline events listed yet.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4 self-start">Win Probability</span>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#10B981]" strokeDasharray={`${caseData.winProbability || 50}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-xl font-extrabold text-slate-800">{caseData.winProbability || 50}%</div>
              </div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-4">Based on current evidence and precedent strength</p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <span className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-3 block">Task Progress</span>
              <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-2">
                <span>Completed steps</span>
                <span>{taskProgress}% ({completedTasks}/{totalTasks})</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                <div className="bg-[#6D5DFC] h-full rounded-full transition-all duration-300" style={{ width: `${taskProgress}%` }} />
              </div>
              <button onClick={() => setActiveTab('tasks')} className="text-xs font-bold text-[#6D5DFC] hover:underline">Manage Tasks</button>
            </div>

            {nextHearing && (
              <div className="bg-[#F3F6FF] border border-[#6D5DFC]/20 rounded-2xl p-6 shadow-sm">
                <span className="text-sm font-extrabold text-[#6D5DFC] uppercase tracking-wider mb-2 block">Next Hearing Scheduled</span>
                <div className="text-base font-extrabold text-[#111827]">{nextHearing.date}</div>
                <p className="text-xs text-[#4B5563] mt-1 font-semibold">
                  Courtroom {nextHearing.courtroom} • Judge {nextHearing.judge || 'TBA'}
                </p>
                <p className="text-xs text-[#6B7280] mt-1 italic">&quot;{nextHearing.notes}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    // 1. Dynamic Categorization & Party Extraction Helpers
    const detectDuplicates = (list) => {
      const pairs = [];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].date === list[j].date && 
              (list[i].title.toLowerCase().includes(list[j].title.toLowerCase()) || 
               list[j].title.toLowerCase().includes(list[i].title.toLowerCase()) ||
               list[i].category === list[j].category)) {
            pairs.push([list[i], list[j]]);
          }
        }
      }
      return pairs;
    };

    const inferCategory = (title = '', desc = '') => {
      const t = (title + ' ' + desc).toLowerCase();
      if (t.includes('fir') || t.includes('charge sheet') || t.includes('complaint')) return 'FIR / Complaint';
      if (t.includes('notice') || t.includes('legal notice')) return 'Legal Notice';
      if (t.includes('reply') || t.includes('rejoinder')) return 'Reply';
      if (t.includes('agreement') || t.includes('contract') || t.includes('deed') || t.includes('lease') || t.includes('lent') || t.includes('loan')) return 'Agreement';
      if (t.includes('hearing') || t.includes('court') || t.includes('appearance')) return 'Hearing';
      if (t.includes('order') || t.includes('injunction') || t.includes('stay')) return 'Court Order';
      if (t.includes('judgment') || t.includes('decree') || t.includes('verdict')) return 'Judgment';
      if (t.includes('evidence') || t.includes('exhibit') || t.includes('receipt') || t.includes('proof')) return 'Evidence';
      if (t.includes('draft') || t.includes('pleading') || t.includes('petition')) return 'Draft';
      if (t.includes('research') || t.includes('precedent') || t.includes('ruling')) return 'Research';
      return 'Other';
    };

    const inferParties = (title = '', desc = '') => {
      const list = [];
      const client = caseData.clientName || 'Rajesh Sharma';
      const opponent = caseData.accused || caseData.opponentName || 'Amit Verma';
      if ((title + ' ' + desc).toLowerCase().includes(client.split(' ')[0].toLowerCase())) {
        list.push(client);
      }
      if ((title + ' ' + desc).toLowerCase().includes(opponent.split(' ')[0].toLowerCase())) {
        list.push(opponent);
      }
      if (list.length === 0) return `${client}, ${opponent}`;
      return list.join(', ');
    };

    const enrichEvent = (event, index) => {
      return {
        id: event.id || `ev-${index}`,
        date: event.date || 'Unknown Date',
        title: event.title || 'Untitled Event',
        description: event.description || '',
        category: event.category || inferCategory(event.title, event.description),
        importance: event.importance || 'Medium',
        confidence: event.confidence || 'High',
        isAiGenerated: event.isAiGenerated !== undefined ? event.isAiGenerated : false,
        sourceDoc: event.sourceDoc || 'Case Workspace',
        linkedEvidence: event.linkedEvidence || '',
        courtStage: event.courtStage || 'Pleadings',
        parties: event.parties || inferParties(event.title, event.description),
        aiExplanation: event.aiExplanation || 'AI extracted timeline milestone from documentation indicating key dispute parameters.',
        linkedDrafts: event.linkedDrafts || [],
        linkedResearch: event.linkedResearch || [],
        isPinned: event.isPinned || false,
        index
      };
    };

    const getEnrichedTimeline = () => {
      let list = caseData.timeline || [];
      if (list.length === 0 && caseData.name && caseData.name.includes("Rajesh Sharma")) {
        list = [
          {
            date: "15 Jan 2025",
            title: "Loan Agreement Executed",
            description: "Amit Verma executed a registered loan agreement for ₹5,00,000 from Rajesh Sharma, agreeing to repay by 15 April 2025.",
            category: "Agreement",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "loan_agreement_signed.pdf",
            linkedEvidence: "Exhibit A - Registered Loan Deed",
            courtStage: "Pre-Litigation",
            parties: "Rajesh Sharma, Amit Verma",
            aiExplanation: "Establishes the core contractual obligation and the repayment deadline of 15 April 2025.",
            linkedDrafts: ["Draft Loan Agreement v1"],
            linkedResearch: ["Sec 138 NI Act Precedents"],
            isPinned: true
          },
          {
            date: "15 Apr 2025",
            title: "Repayment Deadline Default",
            description: "Amit Verma defaulted on the ₹5,00,000 repayment due date. No payments were made.",
            category: "Other",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "Bank Statement",
            linkedEvidence: "Bank Account Ledger",
            courtStage: "Pre-Litigation",
            parties: "Amit Verma, Rajesh Sharma",
            aiExplanation: "Triggers the cause of action for breach of contract and recovery under Summary Procedure.",
            linkedDrafts: [],
            linkedResearch: [],
            isPinned: false
          },
          {
            date: "20 Apr 2025",
            title: "Legal Notice Issued",
            description: "Advocate for Rajesh Sharma sent a legal demand notice to Amit Verma demanding repayment within 15 days.",
            category: "Legal Notice",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "legal_notice_demand.docx",
            linkedEvidence: "Postal Speed Receipt",
            courtStage: "Pre-Litigation",
            parties: "Rajesh Sharma, Amit Verma",
            aiExplanation: "Statutory demand notice before initiating formal legal recovery under CPC Order XXXVII.",
            linkedDrafts: ["Demand Notice Draft"],
            linkedResearch: ["Limitation period for Notice"],
            isPinned: true
          },
          {
            date: "30 Apr 2025",
            title: "Compliance Period Ended (No Reply)",
            description: "Amit Verma failed to respond or make payment within the 10 days notice compliance window.",
            category: "Reply",
            importance: "Medium",
            confidence: "Medium",
            isAiGenerated: true,
            sourceDoc: "Tracking Report",
            linkedEvidence: "Delivery Confirmation",
            courtStage: "Pre-Litigation",
            parties: "Amit Verma",
            aiExplanation: "Establishes default of notice requirements, which is a key element for the civil suit.",
            linkedDrafts: [],
            linkedResearch: [],
            isPinned: false
          },
          {
            date: "05 May 2025",
            title: "Civil Suit Filed (Recovery Case)",
            description: "Rajesh Sharma filed a civil recovery suit under Order XXXVII of CPC in Delhi District Court.",
            category: "Court Filing",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "plaint_recovery_suit.pdf",
            linkedEvidence: "Court Fee Receipt",
            courtStage: "Pleadings",
            parties: "Rajesh Sharma, Amit Verma, District Court",
            aiExplanation: "Official filing of litigation in court. Case listed for admission and summons issuance.",
            linkedDrafts: ["Plaint Draft"],
            linkedResearch: ["CPC Order 37 Rules"],
            isPinned: false
          }
        ];
      }
      return list.map((item, idx) => enrichEvent(item, idx));
    };

    const getCategoryDetails = (category) => {
      const norm = (category || 'Other').toLowerCase();
      if (norm.includes('fir') || norm.includes('complaint') || norm.includes('charge')) {
        return { icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-100', name: 'FIR / Complaint' };
      }
      if (norm.includes('notice')) {
        return { icon: Mail, color: 'text-purple-600 bg-purple-50 border-purple-100', name: 'Legal Notice' };
      }
      if (norm.includes('reply')) {
        return { icon: MessageSquare, color: 'text-sky-600 bg-sky-50 border-sky-100', name: 'Reply' };
      }
      if (norm.includes('evidence') || norm.includes('witness')) {
        return { icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', name: 'Evidence' };
      }
      if (norm.includes('agreement') || norm.includes('settlement') || norm.includes('contract')) {
        return { icon: FileSignature, color: 'text-cyan-600 bg-cyan-50 border-cyan-100', name: 'Agreement' };
      }
      if (norm.includes('filing') || norm.includes('petition') || norm.includes('plaint')) {
        return { icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', name: 'Court Filing' };
      }
      if (norm.includes('hearing')) {
        return { icon: Gavel, color: 'text-amber-600 bg-amber-50 border-amber-100', name: 'Hearing' };
      }
      if (norm.includes('order') || norm.includes('judgment') || norm.includes('appeal')) {
        return { icon: FileDigit, color: 'text-rose-600 bg-rose-50 border-rose-100', name: 'Court Order/Judgment' };
      }
      if (norm.includes('recommendation') || norm.includes('ai')) {
        return { icon: Sparkles, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100', name: 'AI Recommendation' };
      }
      if (norm.includes('research')) {
        return { icon: BookOpen, color: 'text-pink-600 bg-pink-50 border-pink-100', name: 'Research' };
      }
      return { icon: Clock, color: 'text-slate-600 bg-slate-50 border-slate-100', name: category || 'Other' };
    };

    const getMockCaseDocs = () => {
      const list = caseData.uploadedDocs || caseData.documents || [];
      if (list.length === 0) {
        return [
          { name: "loan_agreement_signed.pdf", size: "1.4 MB", type: "PDF" },
          { name: "demand_notice_20apr.pdf", size: "890 KB", type: "PDF" },
          { name: "postal_receipt_tracking.png", size: "2.1 MB", type: "Image" },
          { name: "bank_receipt_disbursal.pdf", size: "450 KB", type: "PDF" },
          { name: "court_summons_order.pdf", size: "1.1 MB", type: "PDF" }
        ];
      }
      return list.map(d => typeof d === 'string' ? { name: d, size: "1.2 MB", type: "PDF" } : d);
    };

    const enrichedList = getEnrichedTimeline();

    // 2. Extractor Step Simulations


    const runNarrativeExtraction = async () => {
      if (!narrativeText.trim()) {
        toast.error("Please enter a legal narrative text block");
        return;
      }
      setIsExtractingNarrative(true);
      setNarrativeSteps([
        "Analyzing text narrative structure...",
        "Performing legal entity recognition (Dates, Parties, Locations)...",
        "Extracting chronological legal actions...",
        "Assigning categories and calculating AI confidence scores...",
        "Updating chronological Case Journey timeline..."
      ]);
      setActiveNarrativeStep(0);

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 800));
        setActiveNarrativeStep(prev => prev + 1);
      }

      const isExample = narrativeText.toLowerCase().includes("rajesh sharma lent") || narrativeText.toLowerCase().includes("amit verma") || narrativeText.toLowerCase().includes("5,00,000");
      let extracted = [];
      if (isExample) {
        extracted = [
          {
            date: "15 Jan 2025",
            title: "Loan Agreement Executed",
            description: "Amit Verma executed a loan agreement for ₹5,00,000 from Rajesh Sharma, due 15 April 2025.",
            category: "Agreement",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "Advocate Narrative",
            linkedEvidence: "Exhibit A - Registered Deed",
            courtStage: "Pre-Litigation",
            parties: "Rajesh Sharma, Amit Verma",
            aiExplanation: "Beginning of case timeline establishing contractual terms."
          },
          {
            date: "15 Apr 2025",
            title: "Repayment Deadline default",
            description: " Amit Verma defaulted on repayment of ₹5,00,000 principal due date.",
            category: "Other",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "Advocate Narrative",
            courtStage: "Pre-Litigation",
            parties: "Amit Verma",
            aiExplanation: "Establishes cause of action for default and default interest accrual."
          },
          {
            date: "20 Apr 2025",
            title: "Legal Notice Issued",
            description: "Legal notice demanding loan repayment within 15 days sent to Amit Verma.",
            category: "Legal Notice",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "Advocate Narrative",
            courtStage: "Pre-Litigation",
            parties: "Rajesh Sharma, Amit Verma",
            aiExplanation: "Pre-litigation demand, compliance period of 15 days."
          },
          {
            date: "30 Apr 2025",
            title: "Compliance Window Ended (No Reply)",
            description: "Amit Verma failed to respond within notice timeline.",
            category: "Reply",
            importance: "Medium",
            confidence: "Medium",
            isAiGenerated: true,
            sourceDoc: "Advocate Narrative",
            courtStage: "Pre-Litigation",
            parties: "Amit Verma",
            aiExplanation: "Notice non-compliance clears path for summary procedure."
          },
          {
            date: "05 May 2025",
            title: "Civil Suit Filed (Recovery Case)",
            description: "Civil recovery suit under CPC Order 37 filed in Delhi Court.",
            category: "Court Filing",
            importance: "High",
            confidence: "High",
            isAiGenerated: true,
            sourceDoc: "Advocate Narrative",
            courtStage: "Pleadings",
            parties: "Rajesh Sharma, Amit Verma",
            aiExplanation: "Official filing of suit trigger admission phase."
          }
        ];
      } else {
        // Generic sentence parser
        const sentences = narrativeText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
        sentences.forEach((sentence, i) => {
          let date = `${12 + i} Jan 2025`;
          const dateMatch = sentence.match(/(?:on\s+)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
          if (dateMatch) date = dateMatch[1];
          
          let category = inferCategory('', sentence);
          let title = sentence.split(' ').slice(0, 4).join(' ') + "...";
          
          extracted.push({
            date,
            title,
            description: sentence,
            category,
            importance: "Medium",
            confidence: "Medium",
            isAiGenerated: true,
            sourceDoc: "Extracted Narrative",
            courtStage: "Pleadings",
            parties: "Parties Involved",
            aiExplanation: "Milestone auto-extracted from case text description."
          });
        });
      }

      handleUpdateField({ timeline: [...(caseData.timeline || []), ...extracted] });
      setIsExtractingNarrative(false);
      setNarrativeText('');
      setIsNarrativeExtractorOpen(false);
      toast.success(`AI successfully extracted ${extracted.length} timeline events!`);
    };



    const runDocExtraction = async (docName) => {
      if (!docName) return;
      setSelectedDocToExtract(docName);
      setIsExtractingDoc(true);
      setDocSteps([
        `Accessing document "${docName}"...`,
        "Performing optical character recognition (OCR) scanner...",
        "Identifying date markers and document metadata...",
        "Structuring timeline event and confidence check...",
        "Adding chronologically to Case Journey..."
      ]);
      setActiveDocStep(0);

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActiveDocStep(prev => prev + 1);
      }

      const norm = docName.toLowerCase();
      let extracted = {
        date: "15 Jan 2025",
        title: "Agreement Registered",
        description: `Chronology point extracted via OCR body analysis of ${docName}.`,
        category: "Agreement",
        importance: "High",
        confidence: "High",
        isAiGenerated: true,
        sourceDoc: docName,
        courtStage: "Pre-Litigation",
        parties: "Rajesh Sharma, Amit Verma",
        aiExplanation: "Contractual document uploaded and parsed for legal audit trail."
      };

      if (norm.includes("loan") || norm.includes("agreement")) {
        extracted = {
          date: "15 Jan 2025",
          title: "Loan Agreement Executed",
          description: "Registered loan agreement for ₹5,00,000 executed between Rajesh Sharma and Amit Verma.",
          category: "Agreement",
          importance: "High",
          confidence: "High",
          isAiGenerated: true,
          sourceDoc: docName,
          linkedEvidence: "Loan Contract Deed",
          courtStage: "Pre-Litigation",
          parties: "Rajesh Sharma, Amit Verma",
          aiExplanation: "Indicates original contract creation baseline date."
        };
      } else if (norm.includes("notice")) {
        extracted = {
          date: "20 Apr 2025",
          title: "Legal Notice Issued",
          description: "Advocate for Rajesh Sharma sent a legal demand notice to Amit Verma demanding loan repayment.",
          category: "Legal Notice",
          importance: "High",
          confidence: "High",
          isAiGenerated: true,
          sourceDoc: docName,
          linkedEvidence: "Speed Post tracking",
          courtStage: "Pre-Litigation",
          parties: "Rajesh Sharma, Amit Verma",
          aiExplanation: "Fulfills statutory notice before recovery suits."
        };
      } else if (norm.includes("order") || norm.includes("summons")) {
        extracted = {
          date: "22 May 2025",
          title: "Court Summons Issued",
          description: "District court issued summons notices to Amit Verma regarding civil suit Order 37.",
          category: "Court Order",
          importance: "High",
          confidence: "High",
          isAiGenerated: true,
          sourceDoc: docName,
          courtStage: "Pleadings",
          parties: "Amit Verma, District Judge",
          aiExplanation: "Start of official defendant appearance duration."
        };
      }

      handleUpdateField({ timeline: [...(caseData.timeline || []), extracted] });
      setIsExtractingDoc(false);
      setSelectedDocToExtract('');
      toast.success(`Extracted event: "${extracted.title}" from ${docName}!`);
    };

    // 3. CRUD Event Handlers
    const handleAddManualEvent = () => {
      if (!newTimeline.date || !newTimeline.title) {
        toast.error("Please enter a date and a title");
        return;
      }
      const list = caseData.timeline || [];
      const newEv = {
        ...newTimeline,
        category: newTimeline.category || "Other",
        importance: newTimeline.importance || "Medium",
        confidence: "High",
        isAiGenerated: false,
        sourceDoc: "Manual Entry",
        courtStage: newTimeline.courtStage || "Pleadings"
      };
      handleUpdateField({ timeline: [...list, newEv] });
      setNewTimeline({ date: '', title: '', description: '', category: 'Other', importance: 'Medium', courtStage: 'Pleadings' });
      setIsAddingManualEvent(false);
      toast.success("Manual event added!");
    };

    const handleEditTimeline = () => {
      if (!editingEventData.date || !editingEventData.title) {
        toast.error("Please fill date and title");
        return;
      }
      const list = [...(caseData.timeline || [])];
      list[editingIndex] = editingEventData;
      handleUpdateField({ timeline: list });
      setIsEditingEvent(false);
      setEditingEventData(null);
      setEditingIndex(-1);
      if (selectedEvent && selectedEvent.index === editingIndex) {
        setSelectedEvent(enrichEvent(editingEventData, editingIndex));
      }
      toast.success("Event updated successfully!");
    };

    const handleDeleteTimeline = (idx) => {
      const list = [...(caseData.timeline || [])];
      const deletedItem = list[idx];
      setRecentlyDeleted([...recentlyDeleted, { item: deletedItem, index: idx }]);
      
      list.splice(idx, 1);
      handleUpdateField({ timeline: list });
      
      if (selectedEvent && selectedEvent.index === idx) {
        setIsDrawerOpen(false);
        setSelectedEvent(null);
      }
      
      toast((t) => (
        <span className="flex items-center gap-3">
          Event removed.
          <button 
            onClick={() => {
              handleRestoreTimeline();
              toast.dismiss(t.id);
            }} 
            className="text-xs font-black text-[#6D5DFC] hover:underline"
          >
            Undo
          </button>
        </span>
      ));
    };

    const handleRestoreTimeline = () => {
      if (recentlyDeleted.length === 0) return;
      const last = recentlyDeleted[recentlyDeleted.length - 1];
      const list = [...(caseData.timeline || [])];
      list.splice(last.index, 0, last.item);
      handleUpdateField({ timeline: list });
      setRecentlyDeleted(recentlyDeleted.slice(0, -1));
      toast.success("Event restored!");
    };

    const handlePinEvent = (idx) => {
      const list = [...(caseData.timeline || [])];
      list[idx].isPinned = !list[idx].isPinned;
      handleUpdateField({ timeline: list });
      if (selectedEvent && selectedEvent.index === idx) {
        setSelectedEvent({ ...selectedEvent, isPinned: list[idx].isPinned });
      }
      toast.success(list[idx].isPinned ? "Event pinned to top!" : "Event unpinned");
    };

    const handleMergeEvents = (idx1, idx2) => {
      const list = [...(caseData.timeline || [])];
      const ev1 = list[idx1];
      const ev2 = list[idx2];
      
      const mergedEvent = {
        ...ev1,
        description: `${ev1.description || ''} | Merged: ${ev2.description || ''}`,
        importance: ev1.importance === 'High' || ev2.importance === 'High' ? 'High' : 'Medium',
        confidence: 'High',
        isAiGenerated: true,
        sourceDoc: `${ev1.sourceDoc || 'File'} & ${ev2.sourceDoc || 'File'}`
      };
      
      list[idx1] = mergedEvent;
      list.splice(idx2, 1);
      
      handleUpdateField({ timeline: list });
      setShowDuplicateMergeSuggestion(false);
      toast.success("Duplicate events merged successfully!");
    };

    const handleAskAiAboutEvent = (event) => {
      if (!onAskAi) {
        toast.error("AI Assistant is not available right now");
        return;
      }
      const prompt = `Explain the legal significance of the timeline event "${event.title}" on ${event.date} for the case "${caseData.name}". What are the immediate actions and evidence implications?`;
      onAskAi(prompt);
      toast.success("Assistant analysis started! Check the Case Assistant panel on the right.");
    };

    const handleGenerateDraft = (event) => {
      const draftTitle = `Draft Notice/Petition for ${event.title}`;
      const type = event.category === 'Legal Notice' ? 'Notice' : 'Petition';
      const newD = {
        name: draftTitle,
        type,
        content: `BEFORE THE DISTRICT COURT\n\nIn the matter of: ${caseData.name}\n\nRE: Chronological Fact Event: ${event.title} (${event.date})\n\nFACTUAL ALLEGATIONS:\n1. The advocate files this draft document regarding ${event.description}.\n2. This event was validated in the timeline with source: ${event.sourceDoc}.\n\nPrepared automatically on ${new Date().toLocaleDateString()}.`
      };
      const existing = caseData.drafts || [];
      handleUpdateField({ drafts: [...existing, newD] });
      toast.success(`Created draft "${draftTitle}" in the Drafts library!`);
    };

    const handleAttachEvidence = (event, evidenceName) => {
      const list = [...(caseData.timeline || [])];
      list[event.index].linkedEvidence = evidenceName;
      handleUpdateField({ timeline: list });
      setSelectedEvent({ ...selectedEvent, linkedEvidence: evidenceName });
      toast.success(`Attached evidence "${evidenceName}" to this event!`);
    };

    // 4. Filters & Search logic
    const filteredEvents = enrichedList.filter(item => {
      // Search query
      const matchesSearch = 
        item.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        item.parties.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        item.linkedEvidence.toLowerCase().includes(timelineSearch.toLowerCase());
      
      // Chip filters
      let matchesChip = true;
      if (activeFilterChip === 'Documents') {
        matchesChip = ['Agreement', 'Legal Notice', 'Reply', 'Court Filing', 'Court Order/Judgment'].includes(item.category);
      } else if (activeFilterChip === 'Hearings') {
        matchesChip = item.category === 'Hearing';
      } else if (activeFilterChip === 'Evidence') {
        matchesChip = item.category === 'Evidence';
      } else if (activeFilterChip === 'AI') {
        matchesChip = item.isAiGenerated;
      }
      
      return matchesSearch && matchesChip;
    });

    // Sort: Pinned first, then by date logic (simple fallback sorts chronological-ish or as added)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // retain list order otherwise
    });

    const duplicates = detectDuplicates(enrichedList);
    const hasDuplicate = duplicates.length > 0 && showDuplicateMergeSuggestion;
    
    // Check if notice is missing
    const hasAgreement = enrichedList.some(e => e.category === 'Agreement');
    const hasNotice = enrichedList.some(e => e.category === 'Legal Notice');
    const showMissingNoticeAlert = hasAgreement && !hasNotice && showMissingNoticeSuggestion;

    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 relative text-slate-800 select-text">
        
        {/* ─── Apple-style Header Panel ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-[#6D5DFC] shrink-0" />
              <span>AI Case Journey</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Cronological history compiled from documentation and case context.</p>
          </div>
          
          <div className="flex items-center gap-2 relative w-full sm:w-auto shrink-0">
            <button 
              onClick={() => { setIsAddingManualEvent(!isAddingManualEvent); setIsNarrativeExtractorOpen(false); setIsOcrPanelOpen(false); }}
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> Add Event
            </button>
            <button 
              onClick={() => { setIsNarrativeExtractorOpen(!isNarrativeExtractorOpen); setIsAddingManualEvent(false); setIsOcrPanelOpen(false); }}
              className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Sparkles size={14} className="text-[#6D5DFC]" /> AI Extract
            </button>
            
            {/* More Menu Dropdown trigger */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                title="More actions"
              >
                <span className="font-bold text-base leading-none -mt-1">⋯</span>
              </button>
              
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button 
                      onClick={() => { setIsOcrPanelOpen(!isOcrPanelOpen); setIsMoreMenuOpen(false); setIsAddingManualEvent(false); setIsNarrativeExtractorOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileText size={14} className="text-slate-400" />
                      {isOcrPanelOpen ? "Hide Documents" : "OCR Scan Documents"}
                    </button>
                    <button 
                      onClick={() => { window.print(); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Printer size={14} className="text-slate-400" />
                      Print Timeline
                    </button>
                    <button 
                      onClick={() => {
                        const summaryText = sortedEvents.map(e => `[${e.date}] ${e.title}\nCategory: ${e.category}\nDescription: ${e.description}\nSource: ${e.sourceDoc}\n-----------------------`).join('\n\n');
                        const blob = new Blob([summaryText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${caseData.name.replace(/\s+/g, '_')}_CaseJourney.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success("Timeline exported!");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download size={14} className="text-slate-400" />
                      Export DOCX
                    </button>
                    {recentlyDeleted.length > 0 && (
                      <button 
                        onClick={() => { handleRestoreTimeline(); setIsMoreMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-[#6D5DFC] hover:bg-indigo-50/50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                      >
                        <Trash2 size={14} />
                        Restore Last Event
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Collapsible Forms & Simulations ─── */}
        {isAddingManualEvent && (
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Add Manual Fact / Pleading Event</span>
              <button onClick={() => setIsAddingManualEvent(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Event Date</label>
                <input 
                  type="text" 
                  placeholder="e.g. 15 Jan 2025" 
                  value={newTimeline.date} 
                  onChange={e => setNewTimeline({ ...newTimeline, date: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>
              
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Event Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Loan Repayment Due" 
                  value={newTimeline.title} 
                  onChange={e => setNewTimeline({ ...newTimeline, title: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Importance</label>
                <select 
                  value={newTimeline.importance || 'Medium'} 
                  onChange={e => setNewTimeline({ ...newTimeline, importance: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                >
                  <option value="High">High Importance</option>
                  <option value="Medium">Medium Importance</option>
                  <option value="Low">Low Importance</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Category</label>
                <select 
                  value={newTimeline.category || 'Other'} 
                  onChange={e => setNewTimeline({ ...newTimeline, category: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                >
                  <option value="FIR / Complaint">FIR / Complaint</option>
                  <option value="Legal Notice">Legal Notice</option>
                  <option value="Reply">Reply/Rejoinder</option>
                  <option value="Agreement">Agreement/Contract</option>
                  <option value="Evidence">Evidence/Disbursement</option>
                  <option value="Court Filing">Court Filing/Petition</option>
                  <option value="Hearing">Hearing Session</option>
                  <option value="Court Order">Court Order/Judgment</option>
                  <option value="Other">Other Fact</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Court Stage</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pleadings / Trial" 
                  value={newTimeline.courtStage || ''} 
                  onChange={e => setNewTimeline({ ...newTimeline, courtStage: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>

              <div className="flex items-end">
                <button 
                  onClick={handleAddManualEvent} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
                >
                  Add to Timeline
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Description</label>
              <textarea 
                placeholder="Factual statement details..." 
                value={newTimeline.description} 
                onChange={e => setNewTimeline({ ...newTimeline, description: e.target.value })} 
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 resize-none bg-white"
              />
            </div>
          </div>
        )}

        {isNarrativeExtractorOpen && (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#6D5DFC]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">AI Chronology Narrative Extractor</span>
              </div>
              <button onClick={() => setIsNarrativeExtractorOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            {isExtractingNarrative ? (
              <div className="py-6 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                <div className="text-[11px] text-indigo-900 font-bold uppercase tracking-wider animate-pulse">
                  {narrativeSteps[activeNarrativeStep] || "Processing Narrative..."}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea 
                  placeholder="Paste advocate narrative description of events..." 
                  value={narrativeText} 
                  onChange={e => setNarrativeText(e.target.value)} 
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] bg-white resize-none"
                />
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <button 
                    onClick={() => {
                      setNarrativeText(
                        "Rajesh Sharma lent ₹5,00,000 to Amit Verma on 15 January 2025.\n" +
                        "Repayment was due on 15 April 2025.\n" +
                        "Legal Notice was sent on 20 April 2025.\n" +
                        "No response was received.\n" +
                        "Complaint was filed on 5 May 2025."
                      );
                    }}
                    className="text-[10px] font-bold text-[#6D5DFC] hover:underline uppercase tracking-wider"
                  >
                    Load Sample Narrative
                  </button>
                  <button 
                    onClick={runNarrativeExtraction} 
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
                  >
                    Extract Facts
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Document OCR Panel */}
        {isOcrPanelOpen && (
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest block">OCR Timeline Extraction Sources</span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Select a case document to analyze and extract chronology.</p>
              </div>
              <button onClick={() => setIsOcrPanelOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            {isExtractingDoc ? (
              <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-700">{docSteps[activeDocStep] || "Scanning file..."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getMockCaseDocs().map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-700 truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <button 
                      onClick={() => runDocExtraction(doc.name)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      Extract
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Mini Warning Banners ─── */}
        {hasDuplicate && (
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-900 font-semibold">
                  Duplicate entries noticed on <strong>{duplicates[0][0].date}</strong>. Would you like to merge them?
                </p>
                <div className="flex gap-3 mt-2 text-[11px] font-bold">
                  <button onClick={() => handleMergeEvents(duplicates[0][0].index, duplicates[0][1].index)} className="text-amber-800 hover:underline">Merge entries</button>
                  <button onClick={() => setShowDuplicateMergeSuggestion(false)} className="text-slate-500 hover:underline">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showMissingNoticeAlert && (
          <div className="bg-rose-50/40 border border-rose-200/50 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-rose-900 font-semibold">
                  Chronology gap: Loan Agreement exists, but statutory Legal notice is missing.
                </p>
                <div className="flex gap-3 mt-2 text-[11px] font-bold">
                  <button 
                    onClick={() => {
                      setNewTimeline({
                        date: "20 Apr 2025",
                        title: "Legal Notice Issued",
                        description: "Advocate sent statutory Demand Notice via Speed Post calling for repayment.",
                        category: "Legal Notice",
                        importance: "High",
                        courtStage: "Pre-Litigation"
                      });
                      setIsAddingManualEvent(true);
                      setShowMissingNoticeSuggestion(false);
                      toast.success("Template loaded in form!");
                    }}
                    className="text-[#6D5DFC] hover:underline"
                  >
                    Insert Notice event
                  </button>
                  <button onClick={() => setShowMissingNoticeSuggestion(false)} className="text-slate-500 hover:underline">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── FILTERS & SEARCH ROW ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5 order-2 md:order-1">
            {[
              { id: 'All', label: 'All Milestones' },
              { id: 'Documents', label: 'Documents' },
              { id: 'Hearings', label: 'Hearings' },
              { id: 'Evidence', label: 'Evidence' },
              { id: 'AI', label: 'AI Generated' }
            ].map(chip => {
              const isActive = activeFilterChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilterChip(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200/80'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Minimal Search Bar */}
          <div className="relative w-full md:w-72 order-1 md:order-2">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search facts..."
              value={timelineSearch}
              onChange={e => setTimelineSearch(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-8 py-2 rounded-lg border border-slate-200/80 bg-white focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400/80"
            />
            {timelineSearch && (
              <button onClick={() => setTimelineSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
            )}
          </div>
        </div>

        {/* ─── 3-COLUMN LAYOUT GRID ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Timeline Column (Left 2 Col width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {sortedEvents.length > 0 ? (
              <div className="relative pl-7 ml-3 pt-2 space-y-6">
                
                {/* Thin Vertical line connector */}
                <div className="w-[1px] bg-slate-200 absolute left-1.5 h-full top-2" />

                {sortedEvents.map((item) => {
                  const { color: catColor } = getCategoryDetails(item.category);
                  
                  // Extract node color dot matching catColor style
                  let dotBg = 'bg-slate-400';
                  if (catColor.includes('red')) dotBg = 'bg-rose-500';
                  else if (catColor.includes('purple')) dotBg = 'bg-purple-500';
                  else if (catColor.includes('sky')) dotBg = 'bg-sky-500';
                  else if (catColor.includes('emerald')) dotBg = 'bg-emerald-500';
                  else if (catColor.includes('cyan')) dotBg = 'bg-cyan-500';
                  else if (catColor.includes('indigo')) dotBg = 'bg-indigo-500';
                  else if (catColor.includes('amber')) dotBg = 'bg-amber-500';
                  else if (catColor.includes('rose')) dotBg = 'bg-rose-500';
                  else if (catColor.includes('fuchsia')) dotBg = 'bg-fuchsia-500';
                  else if (catColor.includes('pink')) dotBg = 'bg-pink-500';

                  // Compile maximum of 3 badges
                  const badges = [];
                  if (item.isAiGenerated) {
                    badges.push({ text: 'AI', style: 'bg-purple-50 text-purple-600 border border-purple-100/40' });
                  }
                  badges.push({ text: item.category, style: 'bg-slate-50 text-slate-600 border border-slate-100' });
                  if (item.importance === 'High' || item.importance === 'Urgent') {
                    badges.push({ text: 'High Priority', style: 'bg-rose-50 text-rose-600 border border-rose-100/40' });
                  } else {
                    badges.push({ text: item.courtStage, style: 'bg-slate-50 text-slate-500' });
                  }
                  const activeBadges = badges.slice(0, 3);

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => { setSelectedEvent(item); setIsDrawerOpen(true); }}
                      className="relative group transition-all"
                    >
                      {/* Timeline Node marker dot */}
                      <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs transition-transform group-hover:scale-125 ${
                        item.isPinned ? 'bg-indigo-600' : dotBg
                      }`} />

                      {/* Clean flat card */}
                      <div className={`bg-white border border-[#E5E7EB]/70 rounded-xl p-5 hover:border-slate-300 hover:shadow-xs transition-all space-y-2.5 relative ${
                        item.isPinned ? 'border-indigo-200 shadow-xs' : ''
                      }`}>
                        
                        {/* Header metadata line */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                            <span className="text-slate-300 font-light">|</span>
                            
                            {/* Badges (Max 3) */}
                            <div className="flex items-center gap-1.5">
                              {activeBadges.map((badge, idx) => (
                                <span key={idx} className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${badge.style}`}>
                                  {badge.text}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePinEvent(item.index); }} 
                              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded"
                              title="Pin event"
                            >
                              {item.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTimeline(item.index); }} 
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded"
                              title="Delete event"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Title and Short Description */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed line-clamp-3">
                            {item.description}
                          </p>
                        </div>

                        {/* Action details footer */}
                        <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 text-[10px] text-slate-400 font-semibold">
                          <span>
                            {item.sourceDoc && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <FileText size={10} className="text-slate-300" />
                                <strong className="text-slate-500 font-semibold">{item.sourceDoc}</strong>
                              </span>
                            )}
                          </span>
                          <span className="text-[#6D5DFC] hover:underline flex items-center gap-0.5 font-bold cursor-pointer">
                            View details →
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border border-slate-200/60 rounded-xl space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs text-slate-400 font-semibold">No case milestones identified.</p>
              </div>
            )}
          </div>

          {/* Right Sidebar Column (Exactly 3 compact cards) */}
          <div className="space-y-4">
            
            {/* CARD 1: AI Suggestions */}
            <div className="bg-white border border-[#E5E7EB]/70 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Sparkles size={13} className="text-[#6D5DFC]" />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">AI Suggestions</span>
              </div>
              <div className="space-y-2.5">
                <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-lg p-3">
                  <span className="text-[8px] font-bold text-[#6D5DFC] uppercase tracking-wider block">Limitation Warning</span>
                  <p className="text-xs text-slate-800 font-bold mt-1">Recovery suit limit expires 15 Apr 2028</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    Under Art 137 Limitation Act, suit must be filed within 3 years of loan default date.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: Upcoming Deadlines */}
            <div className="bg-white border border-[#E5E7EB]/70 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Clock size={13} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Upcoming Deadlines</span>
              </div>
              <div className="space-y-2">
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-lg p-3">
                  <span className="text-[8px] font-bold text-amber-700 uppercase tracking-wider block">Summons Notice</span>
                  <p className="text-xs text-slate-800 font-bold mt-1">Defendant appearance window</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Defendant must record court appearance within 10 days since Delhi Summons notice delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3: Missing Documents */}
            <div className="bg-white border border-[#E5E7EB]/70 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <AlertCircle size={13} className="text-rose-500" />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Missing Documents</span>
              </div>
              <div className="space-y-2">
                <div className="bg-rose-50/40 border border-rose-100 rounded-lg p-3">
                  <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wider block">Evidence Verification</span>
                  <p className="text-xs text-slate-800 font-bold mt-1">Missing Speed Post tracking details</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Attach speed post receipt proof to timeline notice event to secure postal verification proof.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ─── EVENT DETAIL DRAWERS (SLIDE OVERLAY) ─── */}
        {isDrawerOpen && selectedEvent && (
          <div className="fixed inset-0 z-[2000] flex justify-end pointer-events-auto">
            {/* Backdrop filter */}
            <div 
              className="absolute inset-0 bg-slate-900/30 transition-opacity duration-300"
              onClick={() => { setIsDrawerOpen(false); setIsEditingEvent(false); }}
            />
            
            {/* Drawer Body */}
            <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-350 ease-out select-text">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Milestone Details</span>
                </div>
                <button 
                  onClick={() => { setIsDrawerOpen(false); setIsEditingEvent(false); }} 
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable details panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                
                {isEditingEvent ? (
                  /* Editing Mode Form */
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Edit Chronology Event</h3>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Date Title</label>
                      <input 
                        type="text" 
                        value={editingEventData.date}
                        onChange={e => setEditingEventData({ ...editingEventData, date: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Event Title</label>
                      <input 
                        type="text" 
                        value={editingEventData.title}
                        onChange={e => setEditingEventData({ ...editingEventData, title: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Milestone Category</label>
                      <select 
                        value={editingEventData.category}
                        onChange={e => setEditingEventData({ ...editingEventData, category: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                      >
                        <option value="FIR / Complaint">FIR / Complaint</option>
                        <option value="Legal Notice">Legal Notice</option>
                        <option value="Reply">Reply / Rejoinder</option>
                        <option value="Agreement">Agreement / Contract</option>
                        <option value="Evidence">Evidence / Verification</option>
                        <option value="Court Filing">Court Filing</option>
                        <option value="Hearing">Hearing</option>
                        <option value="Court Order/Judgment">Court Order/Judgment</option>
                        <option value="Other">Other Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Importance Rating</label>
                      <select 
                        value={editingEventData.importance}
                        onChange={e => setEditingEventData({ ...editingEventData, importance: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Linked Parties Involved</label>
                      <input 
                        type="text" 
                        value={editingEventData.parties}
                        onChange={e => setEditingEventData({ ...editingEventData, parties: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500">Detailed Description</label>
                      <textarea 
                        value={editingEventData.description}
                        onChange={e => setEditingEventData({ ...editingEventData, description: e.target.value })}
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 resize-none"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleEditTimeline}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={() => setIsEditingEvent(false)}
                        className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-lg py-2.5 text-xs font-semibold uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode details */
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">{selectedEvent.date}</span>
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">{selectedEvent.category}</span>
                        {selectedEvent.isAiGenerated && (
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">AI</span>
                        )}
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">{selectedEvent.importance} Importance</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">{selectedEvent.title}</h3>
                    </div>

                    {/* Factual description */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Factual Details</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 rounded-lg p-4">{selectedEvent.description}</p>
                    </div>

                    {/* AI analysis Explanation */}
                    <div className="space-y-1.5 bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-lg p-4">
                      <div className="flex items-center gap-1 text-[#6D5DFC]">
                        <Sparkles size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">AI Case-Aware Explanation</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                        &quot;{selectedEvent.aiExplanation}&quot;
                      </p>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Parties Involved</span>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedEvent.parties}</span>
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Court Stage</span>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block uppercase tracking-wider">{selectedEvent.courtStage}</span>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Document Source</span>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={selectedEvent.sourceDoc}>{selectedEvent.sourceDoc}</span>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Evidence</span>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate">
                          {selectedEvent.linkedEvidence || 'No evidence attached'}
                        </span>
                      </div>
                    </div>

                    {/* Linked assets (Drafts and Research) */}
                    <div className="space-y-4 pt-1">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block border-b pb-1">Journey Connections</span>
                      
                      {/* Attached drafts */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Linked Drafts</span>
                        {selectedEvent.linkedDrafts && selectedEvent.linkedDrafts.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedEvent.linkedDrafts.map((d, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                                <span>{d}</span>
                                <span className="text-[9px] text-[#6D5DFC] hover:underline cursor-pointer">View</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold block italic">No drafts generated.</span>
                        )}
                      </div>

                      {/* Attached research */}
                      <div className="space-y-1.5 mt-3">
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Linked Precedents & Research</span>
                        {selectedEvent.linkedResearch && selectedEvent.linkedResearch.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedEvent.linkedResearch.map((r, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                                <span>{r}</span>
                                <span className="text-[9px] text-[#6D5DFC] hover:underline cursor-pointer">View Precedent</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold block italic">No precedents linked.</span>
                        )}
                      </div>
                    </div>

                    {/* Quick attach evidence */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <span className="text-[9px] font-bold text-slate-800 uppercase tracking-widest block">Quick Attach Proof</span>
                      
                      <div className="flex gap-2">
                        <select 
                          value={selectedEvidenceToAttach}
                          onChange={e => setSelectedEvidenceToAttach(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] bg-white text-slate-700"
                        >
                          <option value="">-- Select Case File --</option>
                          <option value="Exhibit A - Loan Deed">Exhibit A - Loan Deed</option>
                          <option value="Exhibit B - Bank Account Ledger">Exhibit B - Bank Account Ledger</option>
                          <option value="Exhibit C - Speed Post Tracking Receipt">Exhibit C - Speed Post Tracking Receipt</option>
                          <option value="Exhibit D - Delhi Court Notice">Exhibit D - Delhi Court Notice</option>
                        </select>
                        
                        <button 
                          onClick={() => {
                            if (!selectedEvidenceToAttach) return;
                            handleAttachEvidence(selectedEvent, selectedEvidenceToAttach);
                            setSelectedEvidenceToAttach('');
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all"
                        >
                          Attach
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Drawer footer actions */}
              {!isEditingEvent && (
                <div className="p-4 border-t border-slate-100 shrink-0 bg-white grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAskAiAboutEvent(selectedEvent)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    <Sparkles size={12} className="text-[#6D5DFC]" /> Ask AI
                  </button>
                  
                  <button 
                    onClick={() => handleGenerateDraft(selectedEvent)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    <PenTool size={12} className="text-emerald-600" /> Generate Draft
                  </button>
                  
                  <button 
                    onClick={() => {
                      setEditingIndex(selectedEvent.index);
                      setEditingEventData({ ...selectedEvent });
                      setIsEditingEvent(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    <Edit2 size={12} /> Edit Event
                  </button>
                  
                  <button 
                    onClick={() => handleDeleteTimeline(selectedEvent.index)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-rose-50 hover:text-red-500 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    <Trash2 size={12} /> Delete Event
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHearings = () => {
    // Helper function for status styling
    const getStatusStyle = (status) => {
      switch (status) {
        case 'Scheduled':
          return { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-600 border-blue-100' };
        case 'Completed':
          return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
        case 'Adjourned':
          return { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600 border-amber-100' };
        case 'Cancelled':
          return { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-500 border-slate-100' };
        case 'Reserved for Orders':
          return { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-600 border-purple-100' };
        case 'Disposed':
          return { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600 border-rose-100' };
        default:
          return { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-500 border-slate-100' };
      }
    };

    // Prepopulate hearings if empty or raw format
    const getEnrichedHearings = () => {
      let list = caseData.hearings || [];
      if (list.length === 0) {
        list = [
          {
            date: "15 Jan 2026, 10:30 AM",
            courtroom: "Courtroom 3",
            judge: "Justice Dixit",
            purpose: "Admission & Stay Injunction",
            status: "Completed",
            notes: "Admitted recovery suit CPC Order 37. Summons directed to be issued.",
            documents: ["plaint_recovery_suit.pdf", "court_summons_order.pdf"],
            aiObservations: "The judge was convinced by the registered loan agreement. Notice ordered to be served within 10 days.",
            aiDirections: "Defendant must file appearance within 10 days of service.",
            pendingActions: "Verify service of notice via speed post tracking.",
            nextHearingDate: "15 Feb 2026",
            checklistOverrides: { documentsReady: true, caseFileReady: true }
          },
          {
            date: "15 Feb 2026, 11:00 AM",
            courtroom: "Courtroom 3",
            judge: "Justice Dixit",
            purpose: "Defendant Appearance & Written Statement",
            status: "Completed",
            notes: "Defendant entered appearance. Sought time to file reply.",
            documents: ["vakalatnama_defendant.pdf"],
            aiObservations: "Defendant counsel sought 4 weeks for written statement. Plaintiff counsel opposed, noting summary suit rules.",
            aiDirections: "Written statement to be filed within 30 days. No further time will be granted.",
            pendingActions: "Prepare replication draft once defendant files written statement.",
            nextHearingDate: "20 Mar 2026",
            checklistOverrides: { previousOrdersReviewed: true }
          },
          {
            date: "20 Mar 2026, 10:30 AM",
            courtroom: "Courtroom 3",
            judge: "Justice Dixit",
            purpose: "Arguments on Interim Injunction",
            status: "Scheduled",
            notes: "Listed for arguments on stay application and interim recovery orders.",
            documents: [],
            aiObservations: "",
            aiDirections: "",
            pendingActions: "Prepare written arguments summary and bind citations.",
            nextHearingDate: "",
            checklistOverrides: {}
          }
        ];
      }
      
      // Map legacy hearings to new schema
      return list.map((h, i) => ({
        id: h.id || `hr-${i}`,
        date: h.date || 'Unknown Date',
        courtroom: h.courtroom || 'N/A',
        judge: h.judge || 'TBA',
        purpose: h.purpose || h.title || 'Hearing Session',
        status: h.status || 'Scheduled',
        notes: h.notes || '',
        documents: h.documents || [],
        aiObservations: h.aiObservations || '',
        aiDirections: h.aiDirections || '',
        pendingActions: h.pendingActions || '',
        nextHearingDate: h.nextHearingDate || '',
        checklistOverrides: h.checklistOverrides || {},
        index: i
      }));
    };

    const enrichedHearings = getEnrichedHearings();

    // Checklist Auto check evaluation
    const getChecklistItemStatus = (h, key) => {
      // User manual override has highest priority
      if (h.checklistOverrides[key] !== undefined) {
        return h.checklistOverrides[key];
      }
      
      // Auto check triggers based on documents or purpose keywords
      const docs = h.documents.map(d => d.toLowerCase());
      const notes = h.notes.toLowerCase();
      const purpose = h.purpose.toLowerCase();

      switch (key) {
        case 'documentsReady':
          return docs.length > 0 || notes.includes('filed') || notes.includes('submit');
        case 'evidenceReady':
          return docs.some(d => d.includes('evidence') || d.includes('exhibit') || d.includes('proof')) || notes.includes('evidence');
        case 'witnessReady':
          return notes.includes('witness') || purpose.includes('witness') || purpose.includes('cross');
        case 'affidavitReady':
          return docs.some(d => d.includes('affidavit') || d.includes('reply')) || notes.includes('affidavit');
        case 'courtFeesPaid':
          return docs.some(d => d.includes('receipt') || d.includes('fee') || d.includes('challan'));
        case 'caseFileReady':
          return docs.length > 0;
        case 'previousOrdersReviewed':
          return notes.includes('order') || notes.includes('reviewed') || h.index > 0; // if it is not the first hearing, previous orders exist
        default:
          return false;
      }
    };

    // Quick Action: Add new manual hearing
    const handleAddHearing = () => {
      if (!newHearing.date || !newHearing.courtroom) {
        toast.error("Please enter a Date & Time and Courtroom number");
        return;
      }
      const list = caseData.hearings || [];
      const newHr = {
        date: newHearing.date,
        courtroom: newHearing.courtroom,
        judge: newHearing.judge || 'TBA',
        purpose: newHearing.purpose || 'Hearing Session',
        status: newHearing.status || 'Scheduled',
        notes: newHearing.notes || '',
        documents: attachedHearingDoc ? [attachedHearingDoc] : [],
        aiObservations: '',
        aiDirections: '',
        pendingActions: '',
        nextHearingDate: '',
        checklistOverrides: {}
      };
      
      const updatedList = [...list, newHr];
      
      // Add to case journey timeline
      const timelineList = caseData.timeline || [];
      const newTimelineEvent = {
        date: newHearing.date.split(',')[0],
        title: `Court Hearing Scheduled: ${newHearing.purpose || 'Hearing Session'}`,
        description: `Scheduled in ${newHearing.courtroom} before Judge ${newHearing.judge || 'TBA'}. Notes: ${newHearing.notes || 'No notes'}`,
        category: "Hearing",
        importance: "Medium",
        isAiGenerated: false,
        sourceDoc: attachedHearingDoc || "Manual Entry",
        courtStage: caseData.courtStage || "Trial"
      };
      
      handleUpdateField({ 
        hearings: updatedList,
        timeline: [...timelineList, newTimelineEvent]
      });

      // Reset form
      setNewHearing({ date: '', title: '', judge: '', courtroom: '', notes: '', status: 'Scheduled', purpose: '' });
      setAttachedHearingDoc('');
      setIsAddingHearingFormOpen(false);
      toast.success("Hearing scheduled and timeline updated!");
    };

    // Delete hearing
    const handleDeleteHearing = (idx) => {
      const list = [...(caseData.hearings || [])];
      list.splice(idx, 1);
      handleUpdateField({ hearings: list });
      toast.success("Hearing removed");
      if (selectedHearing && selectedHearing.index === idx) {
        setIsHearingDrawerOpen(false);
        setSelectedHearing(null);
      }
    };

    // Toggle checklists
    const handleToggleChecklist = (hearingIdx, key) => {
      const currentHearing = enrichedHearings[hearingIdx];
      const overrides = { ...currentHearing.checklistOverrides };
      const currentStatus = getChecklistItemStatus(currentHearing, key);
      overrides[key] = !currentStatus;

      const list = [...(caseData.hearings || [])];
      list[hearingIdx] = {
        ...list[hearingIdx],
        checklistOverrides: overrides
      };
      handleUpdateField({ hearings: list });
      if (selectedHearing && selectedHearing.index === hearingIdx) {
        setSelectedHearing({
          ...selectedHearing,
          checklistOverrides: overrides
        });
      }
      toast.success("Checklist updated!");
    };

    // AI summary regenerator
    const runRegenerateHearingSummary = async (hearingIdx) => {
      setIsGeneratingHearingSummary(true);
      await new Promise(r => setTimeout(r, 1200));

      const list = [...(caseData.hearings || [])];
      list[hearingIdx] = {
        ...list[hearingIdx],
        aiObservations: "AI compiled: Arguments completed for interim injunction. Plaintiff established strong prima facie case with registered contract. Defendant claimed signature forgery but lacked verification details.",
        aiDirections: "Defendant directed to submit forensic signatures sample within 14 days. Next arguments listed for review.",
        pendingActions: "Draft reply opposing defendant's signature verification petition.",
        nextHearingDate: "20 Apr 2026"
      };

      handleUpdateField({ hearings: list });
      if (selectedHearing && selectedHearing.index === hearingIdx) {
        setSelectedHearing({
          ...selectedHearing,
          ...list[hearingIdx]
        });
      }
      setIsGeneratingHearingSummary(false);
      toast.success("AI Hearing Summary regenerated!");
    };

    // Recording hearing outcome form submission
    const handleRecordOutcomeSubmit = (hearingIdx) => {
      if (!outcomeForm.outcome) {
        toast.error("Please enter the outcome status");
        return;
      }

      const list = [...(caseData.hearings || [])];
      const prevHearing = list[hearingIdx];
      
      const updatedHearing = {
        ...prevHearing,
        status: outcomeForm.outcome,
        notes: outcomeForm.courtObservations || prevHearing.notes,
        aiObservations: outcomeForm.courtObservations,
        aiDirections: outcomeForm.ordersPassed,
        pendingActions: `${outcomeForm.evidenceAccepted ? 'Evidence accepted: ' + outcomeForm.evidenceAccepted + '. ' : ''}${outcomeForm.argumentsCompleted ? 'Arguments completed. ' : ''}${outcomeForm.witnessExamined ? 'Witness examined: ' + outcomeForm.witnessExamined + '. ' : ''}${outcomeForm.adjournmentReason ? 'Adjourned due to: ' + outcomeForm.adjournmentReason : ''}`,
        nextHearingDate: outcomeForm.nextHearingDate
      };
      list[hearingIdx] = updatedHearing;

      // Automatically sync to Case Journey Timeline
      const timelineList = [...(caseData.timeline || [])];
      const newTimelineEvent = {
        date: prevHearing.date.split(',')[0],
        title: `Court Order passed: ${prevHearing.purpose || 'Hearing Outcome'}`,
        description: `Hearing Outcome: ${outcomeForm.outcome}. Observation: ${outcomeForm.courtObservations}. Orders: ${outcomeForm.ordersPassed}. Next hearing scheduled on ${outcomeForm.nextHearingDate || 'TBA'}`,
        category: "Court Order",
        importance: "High",
        isAiGenerated: true,
        sourceDoc: "Court Proceedings Record",
        courtStage: caseData.courtStage || "Trial"
      };

      // Add next hearing automatically if nextHearingDate is specified
      const updatedHearings = [...list];
      if (outcomeForm.nextHearingDate) {
        const hasNextHearingAlready = list.some(h => h.date.startsWith(outcomeForm.nextHearingDate));
        if (!hasNextHearingAlready) {
          updatedHearings.push({
            date: `${outcomeForm.nextHearingDate}, 10:30 AM`,
            courtroom: prevHearing.courtroom || "Courtroom 3",
            judge: prevHearing.judge || "Justice Dixit",
            purpose: "Subsequent Hearing Session",
            status: "Scheduled",
            notes: "Automatically scheduled following previous hearing orders.",
            documents: [],
            checklistOverrides: {}
          });
        }
      }

      handleUpdateField({
        hearings: updatedHearings,
        timeline: [...timelineList, newTimelineEvent]
      });

      if (selectedHearing && selectedHearing.index === hearingIdx) {
        setSelectedHearing({
          ...selectedHearing,
          ...updatedHearing
        });
      }

      setIsRecordingOutcome(false);
      setOutcomeForm({
        outcome: '',
        courtObservations: '',
        ordersPassed: '',
        evidenceAccepted: '',
        argumentsCompleted: '',
        witnessExamined: '',
        adjournmentReason: '',
        nextHearingDate: ''
      });
      toast.success("Hearing outcome recorded and timeline synced!");
    };

    // AI Document Extraction simulation inside Drawer / general
    const runDocHearingExtraction = async (docName, hearingIdx) => {
      setIsExtractingHearing(true);
      setHearingExtractSteps([
        `Reading document "${docName}"...`,
        "Parsing judicial authority, case number, and advocate details...",
        "Extracting Court Orders, Observations, and Directions...",
        "Identifying next hearing date and deadlines...",
        "Synchronizing Case Journey and updating Hearings list..."
      ]);
      setActiveHearingExtractStep(0);

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActiveHearingExtractStep(prev => prev + 1);
      }

      const list = [...(caseData.hearings || [])];
      const currentHearing = list[hearingIdx];
      
      const extractedInfo = {
        judge: "Justice Dixit",
        courtroom: "Courtroom 3",
        notes: `Extracted from ${docName}: Adjudged injunction petition. Defendant instructed to respond.`,
        status: "Completed",
        aiObservations: "Court observed prima facie default on loan repayment deadline. Injunction granted.",
        aiDirections: "Defendant restrained from transferring asset. Defendant given 14 days for reply.",
        pendingActions: "Prepare service tracking report and file process fees.",
        nextHearingDate: "22 Mar 2026",
        documents: [...(currentHearing.documents || []), docName]
      };

      list[hearingIdx] = {
        ...currentHearing,
        ...extractedInfo
      };

      // Add to timeline
      const timelineList = [...(caseData.timeline || [])];
      const newTimelineEvent = {
        date: currentHearing.date.split(',')[0],
        title: `AI Extracted Event: Injunction Order Passed`,
        description: `Injunction order passed by Justice Dixit in recovery suit. Defendant restrained from disposing collateral asset.`,
        category: "Court Order",
        importance: "High",
        isAiGenerated: true,
        sourceDoc: docName,
        courtStage: "Trial"
      };

      // Automatically add the next hearing
      const updatedHearings = [...list];
      const hasNextHearingAlready = list.some(h => h.date.startsWith("22 Mar 2026"));
      if (!hasNextHearingAlready) {
        updatedHearings.push({
          date: "22 Mar 2026, 11:30 AM",
          courtroom: "Courtroom 3",
          judge: "Justice Dixit",
          purpose: "Compliance Check & Defendant WS",
          status: "Scheduled",
          notes: "Scheduled automatically by AI extraction from court order.",
          documents: [],
          checklistOverrides: {}
        });
      }

      handleUpdateField({
        hearings: updatedHearings,
        timeline: [...timelineList, newTimelineEvent],
        status: "Action Required (1 Document Missing)"
      });

      if (selectedHearing && selectedHearing.index === hearingIdx) {
        setSelectedHearing({
          ...selectedHearing,
          ...list[hearingIdx]
        });
      }

      setIsExtractingHearing(false);
      setIsOcrHearingPanelOpen(false);
      toast.success(`Successfully extracted court directions and scheduled next hearing from ${docName}!`);
    };

    // AI general upload court order (Header Quick Action)
    const runGeneralCourtOrderUpload = async (docName) => {
      setIsExtractingHearing(true);
      setHearingExtractSteps([
        `Processing "${docName}" court order...`,
        "Extracting hearing schedule metadata...",
        "Identifying Judge: Justice Dixit & Courtroom 3...",
        "Updating Hearings Docket..."
      ]);
      setActiveHearingExtractStep(0);

      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActiveHearingExtractStep(prev => prev + 1);
      }

      const list = caseData.hearings || [];
      const newHearingAuto = {
        date: "28 Mar 2026, 10:00 AM",
        courtroom: "Courtroom 3",
        judge: "Justice Dixit",
        purpose: "Final Arguments",
        status: "Scheduled",
        notes: "Automatically extracted and scheduled via court order upload.",
        documents: [docName],
        aiObservations: "Final arguments listed for case resolution.",
        aiDirections: "Both parties ordered to submit brief synopsis of written arguments.",
        pendingActions: "Prepare written arguments synopsis sheet.",
        nextHearingDate: "",
        checklistOverrides: {}
      };

      const timelineList = [...(caseData.timeline || [])];
      const newTimelineEvent = {
        date: "28 Mar 2026",
        title: `AI Hearing Auto-Scheduled: Final Arguments`,
        description: `Scheduled via court order upload of ${docName}. Listed before Justice Dixit.`,
        category: "Hearing",
        importance: "High",
        isAiGenerated: true,
        sourceDoc: docName,
        courtStage: "Final Arguments"
      };

      handleUpdateField({
        hearings: [...list, newHearingAuto],
        timeline: [...timelineList, newTimelineEvent]
      });

      setIsExtractingHearing(false);
      toast.success(`AI scheduled next hearing on 28 Mar 2026 from ${docName}!`);
    };

    // Filter and search logic
    const filteredHearings = enrichedHearings.filter(h => {
      // Search term
      const matchesSearch = 
        h.purpose.toLowerCase().includes(hearingsSearch.toLowerCase()) ||
        h.judge.toLowerCase().includes(hearingsSearch.toLowerCase()) ||
        h.notes.toLowerCase().includes(hearingsSearch.toLowerCase()) ||
        h.courtroom.toLowerCase().includes(hearingsSearch.toLowerCase());

      // Status chip filter
      let matchesFilter = true;
      if (activeHearingFilter === 'Upcoming') {
        matchesFilter = h.status === 'Scheduled' || h.status === 'Reserved for Orders';
      } else if (activeHearingFilter === 'Completed') {
        matchesFilter = h.status === 'Completed' || h.status === 'Disposed';
      } else if (activeHearingFilter === 'Adjourned') {
        matchesFilter = h.status === 'Adjourned';
      } else if (activeHearingFilter === 'Orders') {
        matchesFilter = h.status === 'Reserved for Orders' || h.documents.length > 0;
      } else if (activeHearingFilter === 'Documents') {
        matchesFilter = h.documents.length > 0;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort chronologically (earliest first, completed first, etc.)
    const sortedHearings = [...filteredHearings].sort((a, b) => {
      return a.index - b.index;
    });

    const mockDocsList = [
      "loan_agreement_signed.pdf",
      "demand_notice_20apr.pdf",
      "court_summons_order.pdf",
      "plaint_recovery_suit.pdf",
      "vakalatnama_defendant.pdf"
    ];

    const nextUpcoming = enrichedHearings.find(h => h.status === 'Scheduled' || h.status === 'Reserved for Orders');

    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 relative text-slate-800 select-text animate-in fade-in duration-250">
        
        {/* ─── AI Court Hearing Header Summary Panel ─── */}
        <div className="bg-[#FCFDFE] border border-slate-200/85 rounded-2xl p-6 shadow-xxs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-[#6D5DFC] bg-indigo-50 border border-indigo-100/40 px-2 py-0.5 rounded uppercase tracking-wider">AI Court Hearing Assistant</span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">{caseData.name || "Rajesh Sharma vs Amit Verma"}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                <span>Court: <strong>{caseData.courtName || "Delhi District Court"}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Stage: <strong>{caseData.courtStage || "Pleadings / Trial"}</strong></span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => { setIsAddingHearingFormOpen(!isAddingHearingFormOpen); setIsOcrHearingPanelOpen(false); }}
                className="flex-1 md:flex-none bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Schedule Hearing
              </button>
              <button 
                onClick={() => { setIsOcrHearingPanelOpen(!isOcrHearingPanelOpen); setIsAddingHearingFormOpen(false); }}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Upload size={14} className="text-[#6D5DFC]" /> Upload Court Order
              </button>
              
              {/* Top Options Dropdown */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsMoreHearingActionsOpen(!isMoreHearingActionsOpen)}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-bold text-base leading-none -mt-1">⋯</span>
                </button>
                {isMoreHearingActionsOpen && (
                  <>
                    <div className="fixed inset-0 z-45" onClick={() => setIsMoreHearingActionsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-150">
                      <button 
                        onClick={() => { window.print(); setIsMoreHearingActionsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Printer size={14} className="text-slate-400" /> Print Docket
                      </button>
                      <button 
                        onClick={() => {
                          const exportText = enrichedHearings.map(h => `[${h.date}] Purpose: ${h.purpose}\nStatus: ${h.status}\nJudge: ${h.judge} | Courtroom: ${h.courtroom}\nAI Observations: ${h.aiObservations}\nDirections: ${h.aiDirections}\n-----------------`).join('\n\n');
                          const blob = new Blob([exportText], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${caseData.name.replace(/\s+/g, '_')}_HearingsHistory.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success("Hearing history exported!");
                          setIsMoreHearingActionsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download size={14} className="text-slate-400" /> Export JSON Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Next Hearing Date</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
                {nextUpcoming ? nextUpcoming.date : "Not scheduled"}
              </span>
              {nextUpcoming && (
                <span className="text-[9px] text-slate-400 mt-0.5 block truncate">Before {nextUpcoming.judge} • {nextUpcoming.courtroom}</span>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Upcoming Case Deadline</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
                Submit forensic signature sample
              </span>
              <span className="text-[9px] text-amber-600 mt-0.5 font-bold block">14 Days Remaining</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Hearing Status</span>
                <span className="text-xs font-extrabold text-slate-800 mt-1 block">
                  {caseData.status === "Action Required (1 Document Missing)" ? "Action Required" : "Ready for Court"}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  {caseData.status === "Action Required (1 Document Missing)" ? "Checklist items missing" : "Preparation checklist complete"}
                </span>
              </div>
              <span className={`w-3 h-3 rounded-full ${
                caseData.status === "Action Required (1 Document Missing)" ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`} />
            </div>
          </div>
        </div>

        {/* ─── Collapsible Forms & Upload Simulation ─── */}
        {isAddingHearingFormOpen && (
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Schedule New Hearing Session</span>
              <button onClick={() => setIsAddingHearingFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Date & Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. 15th Feb 2026, 10:30 AM" 
                  value={newHearing.date} 
                  onChange={e => setNewHearing({ ...newHearing, date: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Courtroom No.</label>
                <input 
                  type="text" 
                  placeholder="Courtroom 3" 
                  value={newHearing.courtroom} 
                  onChange={e => setNewHearing({ ...newHearing, courtroom: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Judge Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Justice Dixit" 
                  value={newHearing.judge} 
                  onChange={e => setNewHearing({ ...newHearing, judge: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Hearing Purpose</label>
                <select 
                  value={newHearing.purpose || ''} 
                  onChange={e => setNewHearing({ ...newHearing, purpose: e.target.value })} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                >
                  <option value="">-- Select Purpose --</option>
                  <option value="Admission & Stay Injunction">Admission & Stay Injunction</option>
                  <option value="Defendant Appearance & WS">Defendant Appearance & WS</option>
                  <option value="Replication & Admissions">Replication & Admissions</option>
                  <option value="Framing of Issues">Framing of Issues</option>
                  <option value="Plaintiff Evidence Examination">Plaintiff Evidence Examination</option>
                  <option value="Cross Examination">Cross Examination</option>
                  <option value="Final Arguments">Final Arguments</option>
                  <option value="Judgment / Reserved Orders">Judgment / Reserved Orders</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Attach Document</label>
                <select 
                  value={attachedHearingDoc} 
                  onChange={e => setAttachedHearingDoc(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                >
                  <option value="">-- Select File --</option>
                  {mockDocsList.map((doc, idx) => (
                    <option key={idx} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button 
                  onClick={handleAddHearing} 
                  className="w-full bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Schedule Hearing
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Advocate Notes</label>
              <textarea 
                placeholder="Brief hearing objectives or preparatory remarks..." 
                value={newHearing.notes} 
                onChange={e => setNewHearing({ ...newHearing, notes: e.target.value })} 
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] mt-1 resize-none bg-white"
              />
            </div>
          </div>
        )}

        {isOcrHearingPanelOpen && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest block flex items-center gap-1">
                  <Sparkles size={14} className="text-[#6D5DFC]" /> General Court Order Auto-Extraction
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Upload a new order PDF. AI will automatically schedule hearings and parse outcomes.</p>
              </div>
              <button onClick={() => setIsOcrHearingPanelOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            {isExtractingHearing ? (
              <div className="py-8 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#6D5DFC] animate-spin" />
                <div className="text-[10px] text-slate-700 font-bold uppercase tracking-wider animate-pulse">
                  {hearingExtractSteps[activeHearingExtractStep] || "Processing Document..."}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {mockDocsList.map((doc, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-center justify-between shadow-xxs">
                    <span className="text-xs font-semibold text-slate-700 truncate mr-2" title={doc}>{doc}</span>
                    <button 
                      onClick={() => runGeneralCourtOrderUpload(doc)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors shrink-0"
                    >
                      Extract Hearing
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── FILTERS & SEARCH ROW ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5 order-2 md:order-1">
            {[
              { id: 'All', label: 'All Hearings' },
              { id: 'Upcoming', label: 'Upcoming' },
              { id: 'Completed', label: 'Completed' },
              { id: 'Adjourned', label: 'Adjourned' },
              { id: 'Orders', label: 'Orders & Orders Reserved' },
              { id: 'Documents', label: 'With Documents' }
            ].map(chip => {
              const isActive = activeHearingFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveHearingFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200/80'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72 order-1 md:order-2">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search court hearings..."
              value={hearingsSearch}
              onChange={e => setHearingsSearch(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-8 py-2 rounded-lg border border-slate-200/80 bg-white focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400/80"
            />
            {hearingsSearch && (
              <button onClick={() => setHearingsSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
            )}
          </div>
        </div>

        {/* ─── CHRONOLOGICAL TIMELINE OF HEARINGS ─── */}
        {sortedHearings.length > 0 ? (
          <div className="relative pl-7 ml-3 pt-2 space-y-6">
            {/* Thin vertical connector line */}
            <div className="w-[1px] bg-slate-200 absolute left-1.5 h-full top-2" />

            {sortedHearings.map((h) => {
              const style = getStatusStyle(h.status);
              
              // Checklist completeness calculation
              const totalChecklist = 7;
              let checkedCount = 0;
              ['documentsReady', 'evidenceReady', 'witnessReady', 'affidavitReady', 'courtFeesPaid', 'caseFileReady', 'previousOrdersReviewed'].forEach(k => {
                if (getChecklistItemStatus(h, k)) checkedCount++;
              });
              const checklistPercent = Math.round((checkedCount / totalChecklist) * 100);

              return (
                <div 
                  key={h.id}
                  onClick={() => { setSelectedHearing(h); setIsHearingDrawerOpen(true); }}
                  className="relative group transition-all cursor-pointer"
                >
                  {/* Timeline circular node */}
                  <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs transition-transform group-hover:scale-125 ${style.dot}`} />

                  {/* Hearing Flat Card */}
                  <div className="bg-white border border-slate-200/60 rounded-xl p-5 hover:border-slate-300 hover:shadow-xs transition-all space-y-3 relative">
                    
                    {/* Header info line */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.date}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[9px] font-bold text-slate-500">{h.courtroom}</span>
                        <span className="text-slate-300">|</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${style.badge}`}>
                          {h.status}
                        </span>
                      </div>

                      {/* Checklist indicator */}
                      {h.status === 'Scheduled' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400">Prep:</span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#6D5DFC] h-full transition-all duration-300" style={{ width: `${checklistPercent}%` }} />
                          </div>
                          <span className="text-[8px] font-bold text-slate-500">{checkedCount}/7</span>
                        </div>
                      )}
                    </div>

                    {/* Purpose and details */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{h.purpose}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                        <span>Before: <strong>{h.judge}</strong></span>
                        {h.documents.length > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <FileText size={10} /> {h.documents.length} File{h.documents.length > 1 ? 's' : ''} Linked
                            </span>
                          </>
                        )}
                      </p>
                      {h.notes && (
                        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed italic bg-slate-50 rounded-lg p-3">
                          &quot;{h.notes}&quot;
                        </p>
                      )}
                    </div>

                    {/* Footer AI indicators */}
                    <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 text-[10px] text-slate-400 font-semibold mt-1">
                      <span>
                        {h.nextHearingDate && (
                          <span className="text-[#6D5DFC] font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded text-[8px] uppercase">
                            Next hearing: {h.nextHearingDate}
                          </span>
                        )}
                      </span>
                      <span className="text-[#6D5DFC] hover:underline flex items-center gap-0.5 font-bold">
                        AI Hearing Clerk Details →
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-slate-200/60 rounded-xl space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs text-slate-400 font-semibold">No court hearings found matching the criteria.</p>
          </div>
        )}

        {/* ─── HEARINGS DETAILS DRAWER (SIDE OVERLAY) ─── */}
        {isHearingDrawerOpen && selectedHearing && (
          <div className="fixed inset-0 z-[2000] flex justify-end pointer-events-auto select-text animate-in fade-in duration-200">
            {/* Backdrop filter */}
            <div 
              className="absolute inset-0 bg-slate-900/30 transition-opacity duration-300 animate-in fade-in duration-200"
              onClick={() => { setIsHearingDrawerOpen(false); setIsRecordingOutcome(false); }}
            />
            
            {/* Drawer container body */}
            <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2">
                  <Gavel size={16} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Court Assistant</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Single options menu dropdown inside details drawer */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveHearingMoreMenu(activeHearingMoreMenu ? null : 'menu')}
                      className="px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>Options</span>
                      <ChevronDown size={12} />
                    </button>
                    {activeHearingMoreMenu === 'menu' && (
                      <>
                        <div className="fixed inset-0 z-45" onClick={() => setActiveHearingMoreMenu(null)} />
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-100">
                          <button 
                            onClick={() => { window.print(); setActiveHearingMoreMenu(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Printer size={14} className="text-slate-400" /> Print Summary
                          </button>
                          <button 
                            onClick={() => {
                              const summary = `AI Case Hearing: ${selectedHearing.purpose}\nDate: ${selectedHearing.date}\nAI Observations: ${selectedHearing.aiObservations || 'None'}\nDirections: ${selectedHearing.aiDirections || 'None'}`;
                              const blob = new Blob([summary], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `HearingSummary_${selectedHearing.date.replace(/[\s,:]/g, '_')}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              toast.success("Hearing summary exported!");
                              setActiveHearingMoreMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Download size={14} className="text-slate-400" /> Export Summary (TXT)
                          </button>
                          <button 
                            onClick={() => { handleDeleteHearing(selectedHearing.index); }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 pt-1.5 mt-1.5"
                          >
                            <Trash2 size={14} /> Delete Hearing
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => { setIsHearingDrawerOpen(false); setIsRecordingOutcome(false); }} 
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable details panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                
                {/* Meta details */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedHearing.date}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${getStatusStyle(selectedHearing.status).badge}`}>
                      {selectedHearing.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedHearing.purpose}</h3>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/40 text-[11px] text-slate-500 font-semibold">
                    <div>
                      <span>Courtroom:</span>
                      <strong className="text-slate-800 ml-1">{selectedHearing.courtroom}</strong>
                    </div>
                    <div>
                      <span>Judge:</span>
                      <strong className="text-slate-800 ml-1">{selectedHearing.judge}</strong>
                    </div>
                  </div>
                </div>

                {/* Checklist widget */}
                {selectedHearing.status === 'Scheduled' && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Hearing Preparation Checklist</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                      {[
                        { key: 'documentsReady', label: 'Documents Ready' },
                        { key: 'evidenceReady', label: 'Evidence Ready' },
                        { key: 'witnessReady', label: 'Witness Ready' },
                        { key: 'affidavitReady', label: 'Affidavit Ready' },
                        { key: 'courtFeesPaid', label: 'Court Fees Paid' },
                        { key: 'caseFileReady', label: 'Case File Ready' },
                        { key: 'previousOrdersReviewed', label: 'Previous Orders Reviewed' }
                      ].map((item) => {
                        const isChecked = getChecklistItemStatus(selectedHearing, item.key);
                        return (
                          <div 
                            key={item.key}
                            onClick={() => handleToggleChecklist(selectedHearing.index, item.key)}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-100"
                          >
                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                            <div className="flex items-center gap-2">
                              {/* Show automated verification badge */}
                              {isChecked && selectedHearing.checklistOverrides[item.key] === undefined && (
                                <span className="text-[8px] font-extrabold text-[#6D5DFC] bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded uppercase tracking-wider">AI Verified</span>
                              )}
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-[#6D5DFC] border-[#6D5DFC] text-white' : 'border-slate-300'
                              }`}>
                                {isChecked && <Check size={10} strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Observations / Summary */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Hearing summary & directions</span>
                    <button 
                      onClick={() => runRegenerateHearingSummary(selectedHearing.index)}
                      disabled={isGeneratingHearingSummary}
                      className="text-[9px] font-bold text-[#6D5DFC] hover:underline uppercase tracking-wider flex items-center gap-1"
                    >
                      <Sparkles size={10} /> {isGeneratingHearingSummary ? "Compiling..." : "Regenerate AI Observations"}
                    </button>
                  </div>

                  <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-[8px] font-extrabold text-[#6D5DFC] uppercase tracking-wider block">Key observations & Summary</span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed mt-1">
                        {selectedHearing.aiObservations || "No AI summary compiled yet. Complete the hearing or upload a court order document to analyze."}
                      </p>
                    </div>
                    {selectedHearing.aiDirections && (
                      <div className="border-t border-indigo-200/40 pt-2.5">
                        <span className="text-[8px] font-extrabold text-[#6D5DFC] uppercase tracking-wider block">Court Directions & Orders</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold italic mt-1">
                          &quot;{selectedHearing.aiDirections}&quot;
                        </p>
                      </div>
                    )}
                    {selectedHearing.pendingActions && (
                      <div className="border-t border-indigo-200/40 pt-2.5">
                        <span className="text-[8px] font-extrabold text-amber-700 uppercase tracking-wider block">AI Suggested Next Steps</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1">
                          {selectedHearing.pendingActions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Smart Suggestions checklist recommendations */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Smart Recommendations</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                    {[
                      "Prepare Written Arguments Synopsis",
                      "Upload Speed Post Tracking Details Receipt",
                      "Draft Forensic Signature Sample Petition",
                      "Prepare Cross Examination Questions sheet"
                    ].map((sug, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                        <Sparkles size={12} className="text-[#6D5DFC] mt-0.5 shrink-0" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document vault linked to hearing */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Linked Hearing Files & Orders</span>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    {selectedHearing.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedHearing.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <span className="text-xs font-semibold text-slate-700 truncate mr-2" title={doc}>{doc}</span>
                            <span className="text-[9px] text-[#6D5DFC] hover:underline cursor-pointer font-bold">View PDF</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No files linked to this hearing.</p>
                    )}

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Link Court Order / observatons PDF</span>
                      {isExtractingHearing ? (
                        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-[#6D5DFC] animate-spin" />
                          <span className="text-xs text-slate-700 font-semibold">{hearingExtractSteps[activeHearingExtractStep] || "Processing..."}</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select 
                            value={attachedHearingDoc}
                            onChange={e => setAttachedHearingDoc(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] bg-white text-slate-700"
                          >
                            <option value="">-- Attach file --</option>
                            {mockDocsList.map((doc, idx) => (
                              <option key={idx} value={doc}>{doc}</option>
                            ))}
                          </select>
                          
                          <button 
                            onClick={() => {
                              if (!attachedHearingDoc) return;
                              runDocHearingExtraction(attachedHearingDoc, selectedHearing.index);
                              setAttachedHearingDoc('');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all shadow-xxs"
                          >
                            AI Auto-Extract
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Outcome recorder form */}
                {isRecordingOutcome ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs space-y-4 animate-in slide-in-from-bottom duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Record Court Outcome</span>
                      <button onClick={() => setIsRecordingOutcome(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500">Outcome Status</label>
                        <select 
                          value={outcomeForm.outcome}
                          onChange={e => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white text-slate-700"
                        >
                          <option value="">-- Select Status --</option>
                          <option value="Completed">Completed</option>
                          <option value="Adjourned">Adjourned</option>
                          <option value="Reserved for Orders">Reserved for Orders</option>
                          <option value="Disposed">Disposed</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500">Court Observations</label>
                        <textarea 
                          placeholder="e.g. Judge observed default on notice..."
                          value={outcomeForm.courtObservations}
                          onChange={e => setOutcomeForm({ ...outcomeForm, courtObservations: e.target.value })}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] mt-1 resize-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500">Orders Passed / Directions</label>
                        <textarea 
                          placeholder="e.g. Parties directed to submit forensic sample..."
                          value={outcomeForm.ordersPassed}
                          onChange={e => setOutcomeForm({ ...outcomeForm, ordersPassed: e.target.value })}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] mt-1 resize-none bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-500">Witness Examined</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Rajesh Sharma"
                            value={outcomeForm.witnessExamined}
                            onChange={e => setOutcomeForm({ ...outcomeForm, witnessExamined: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-500">Next Hearing Date</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 20 Apr 2026"
                            value={outcomeForm.nextHearingDate}
                            onChange={e => setOutcomeForm({ ...outcomeForm, nextHearingDate: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleRecordOutcomeSubmit(selectedHearing.index)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                        >
                          Record Outcome
                        </button>
                        <button 
                          onClick={() => setIsRecordingOutcome(false)}
                          className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-xs font-semibold uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsRecordingOutcome(true)}
                    className="w-full py-2.5 border border-dashed border-[#6D5DFC] hover:bg-indigo-50/20 text-[#6D5DFC] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Record Hearing Outcome & Observations
                  </button>
                )}

              </div>

              {/* Drawer footer actions */}
              <div className="p-4 border-t border-slate-100 shrink-0 bg-white grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    const prompt = `Explain the next legal steps regarding hearing of ${selectedHearing.purpose} held on ${selectedHearing.date}. Judge: ${selectedHearing.judge}.`;
                    onAskAi(prompt);
                    toast.success("AI Consultation initiated! Check the AI Assistant panel.");
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold animate-pulse"
                >
                  <Sparkles size={12} className="text-[#6D5DFC]" /> Ask AI
                </button>
                
                <button 
                  onClick={() => {
                    const draftTitle = `Draft Petition for Adjournment / Review - ${selectedHearing.purpose}`;
                    const newD = {
                      name: draftTitle,
                      type: 'Petition',
                      content: `BEFORE THE COURT OF JUSTICE\n\nIn the matter of: ${caseData.name}\n\nHearing Date: ${selectedHearing.date}\nJudge: ${selectedHearing.judge}\n\nMEMORANDUM FOR RECORD:\n1. This petition is drafted pursuant to the court proceedings on ${selectedHearing.date}.\n2. We request compliance verification on directions passed: ${selectedHearing.aiDirections || 'No directions recorded'}.`
                    };
                    const existing = caseData.drafts || [];
                    handleUpdateField({ drafts: [...existing, newD] });
                    toast.success(`Created draft "${draftTitle}"!`);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
                >
                  <PenTool size={12} className="text-emerald-600" /> Generate Draft
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  };

  const renderParties = () => {
    const getInitials = (name) => {
      if (!name) return '??';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Initialize temp data when edit mode is toggled
    const handleEnterEditMode = () => {
      setTempPartiesData({
        clientName: caseData.clientName || '',
        clientPhone: caseData.clientPhone || '',
        accused: caseData.accused || caseData.opponentName || '',
        opponentName: caseData.accused || caseData.opponentName || '',
        opposingLawyer: caseData.opposingLawyer || '',
        courtName: caseData.courtName || '',
        judgeName: caseData.judgeName || ''
      });
      setIsPartiesEditMode(true);
    };

    const handleCancelEdit = () => {
      setIsPartiesEditMode(false);
      setExtractedPartiesData(null);
    };

    const handleSaveChanges = () => {
      handleUpdateField({
        clientName: tempPartiesData.clientName || '',
        clientPhone: tempPartiesData.clientPhone || '',
        accused: tempPartiesData.accused || tempPartiesData.opponentName || '',
        opponentName: tempPartiesData.accused || tempPartiesData.opponentName || '',
        opposingLawyer: tempPartiesData.opposingLawyer || '',
        courtName: tempPartiesData.courtName || '',
        judgeName: tempPartiesData.judgeName || ''
      });
      setIsPartiesEditMode(false);
      setExtractedPartiesData(null);
      toast.success("Parties roster updated successfully!");
    };

    // AI Auto-Extraction Simulation
    const runPartiesDocExtraction = async (docName) => {
      setIsExtractingParties(true);
      setPartiesExtractionSteps([
        `Scanning legal document "${docName}"...`,
        "Performing legal entity recognition (LER) for parties...",
        "Identifying Complainant/Petitioner details...",
        "Identifying Accused/Defendant details...",
        "Extracting presiding judge and judicial jurisdiction...",
        "Compiling extraction overview..."
      ]);
      setActivePartiesExtractionStep(0);

      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActivePartiesExtractionStep(prev => prev + 1);
      }

      const extracted = {
        clientName: "Rajesh Sharma",
        clientPhone: "7858495652",
        accused: "Amit Verma",
        opponentName: "Amit Verma",
        opposingLawyer: "Vipul Sen (Senior Advocate)",
        courtName: "Delhi District Court",
        judgeName: "Justice Dixit"
      };

      setExtractedPartiesData(extracted);
      
      // Auto-prefill into temp edit data
      setTempPartiesData(extracted);
      setIsPartiesEditMode(true);
      setIsExtractingParties(false);
      toast.success("AI successfully extracted party details! Review and confirm changes.");
    };

    const mockDocsList = [
      "plaint_recovery_suit.pdf",
      "loan_agreement_signed.pdf",
      "court_summons_order.pdf",
      "vakalatnama_defendant.pdf"
    ];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-250">
        
        {/* Parties Tab Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users size={18} className="text-[#6D5DFC]" />
              <span>Parties & Case Roster</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Verify advocate profiles, opponent details, and court jurisdiction.</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isPartiesEditMode ? (
              <>
                <button 
                  onClick={handleEnterEditMode}
                  className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Edit2 size={13} /> Edit Case Roster
                </button>
                <button 
                  onClick={() => { setIsExtractingParties(!isExtractingParties); setExtractedPartiesData(null); }}
                  className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Sparkles size={13} className="text-[#6D5DFC]" /> AI Auto-Extract
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleSaveChanges}
                  className="flex-1 sm:flex-none bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check size={13} /> Save Changes
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <X size={13} /> Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible AI Document Upload Extraction Panel */}
        {!isPartiesEditMode && isExtractingParties && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest block flex items-center gap-1">
                  <Sparkles size={14} className="text-[#6D5DFC]" /> AI Roster Auto-Extraction
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Select a legal document below to automatically detect parties and presider metadata.</p>
              </div>
              <button onClick={() => setIsExtractingParties(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            {isExtractingParties && partiesExtractionSteps.length > 0 && (
              <div className="py-8 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#6D5DFC] animate-spin" />
                <div className="text-[10px] text-slate-700 font-bold uppercase tracking-wider animate-pulse">
                  {partiesExtractionSteps[activePartiesExtractionStep] || "Processing Roster Extraction..."}
                </div>
              </div>
            )}

            {!extractedPartiesData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockDocsList.map((doc, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-center justify-between shadow-xxs">
                    <span className="text-xs font-semibold text-slate-700 truncate mr-2" title={doc}>{doc}</span>
                    <button 
                      onClick={() => runPartiesDocExtraction(doc)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors shrink-0"
                    >
                      Extract Roster
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation banner for AI auto-extraction */}
        {isPartiesEditMode && extractedPartiesData && (
          <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/15 rounded-xl p-4 flex items-start gap-3">
            <Sparkles size={18} className="text-[#6D5DFC] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">AI Auto-Extraction Prefilled</p>
              <p className="text-[10px] text-slate-500 mt-0.5">We have extracted the roster details from the document. Highlighted inputs represent extracted information. Review and click &quot;Save Changes&quot; to confirm.</p>
            </div>
          </div>
        )}

        {/* ─── DUAL-MODE LAYOUT ─── */}
        {!isPartiesEditMode ? (
          /* 1. Read-only Mode (Default profile layout cards) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Client Card */}
            <div className="bg-white border border-slate-200/70 rounded-xl p-6 shadow-xxs space-y-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-[#6D5DFC] font-bold flex items-center justify-center text-xs shadow-xxs">
                  {getInitials(caseData.clientName || 'Rajesh Sharma')}
                </div>
                <div>
                  <span className="text-[8px] font-black text-[#6D5DFC] bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit">Client</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">Petitioner / Complainant</h4>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Client Full Name</span>
                  <p className="text-slate-800 font-bold mt-0.5">{caseData.clientName || 'Rajesh Sharma'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Contact/Phone</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{caseData.clientPhone || '7858495652'}</p>
                </div>
              </div>
            </div>

            {/* Card 2: Opposing Party */}
            <div className="bg-white border border-slate-200/70 rounded-xl p-6 shadow-xxs space-y-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-rose-600 font-bold flex items-center justify-center text-xs shadow-xxs">
                  {getInitials(caseData.accused || caseData.opponentName || 'Amit Verma')}
                </div>
                <div>
                  <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit">Opponent</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">Defendant / Accused</h4>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Opponent Name</span>
                  <p className="text-slate-800 font-bold mt-0.5">{caseData.accused || caseData.opponentName || 'Amit Verma'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Opposing Counsel</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{caseData.opposingLawyer || 'Vipul Sen (Advocate)'}</p>
                </div>
              </div>
            </div>

            {/* Card 3: Court Information */}
            <div className="bg-white border border-slate-200/70 rounded-xl p-6 shadow-xxs space-y-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shadow-xxs">
                  {getInitials(caseData.courtName || 'Delhi Court')}
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit">Judiciary</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">Court & Presider Meta</h4>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Presiding Court</span>
                  <p className="text-slate-800 font-bold mt-0.5">{caseData.courtName || 'Delhi District Court'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Presiding Judge</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{caseData.judgeName || 'Justice Dixit'}</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* 2. Edit Mode (Interactive form inputs organized in cards) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Client inputs card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xxs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#6D5DFC] font-bold flex items-center justify-center text-[10px]">C</div>
                <h4 className="text-xs font-bold text-slate-900">Client Settings</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Client Full Name</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.clientName || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, clientName: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && tempPartiesData.clientName === extractedPartiesData.clientName 
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Contact / Phone Number</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.clientPhone || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, clientPhone: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && tempPartiesData.clientPhone === extractedPartiesData.clientPhone 
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Opponent inputs card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xxs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-[10px]">O</div>
                <h4 className="text-xs font-bold text-slate-900">Opposing Party Settings</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Opponent Name</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.accused || tempPartiesData.opponentName || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, accused: e.target.value, opponentName: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && (tempPartiesData.accused === extractedPartiesData.accused || tempPartiesData.opponentName === extractedPartiesData.opponentName)
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Opposing Counsel</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.opposingLawyer || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, opposingLawyer: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && tempPartiesData.opposingLawyer === extractedPartiesData.opposingLawyer 
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Court inputs card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xxs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 font-bold flex items-center justify-center text-[10px]">J</div>
                <h4 className="text-xs font-bold text-slate-900">Judicial Settings</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Presiding Court</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.courtName || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, courtName: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && tempPartiesData.courtName === extractedPartiesData.courtName 
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Presiding Judge</label>
                  <input 
                    type="text" 
                    value={tempPartiesData.judgeName || ''} 
                    onChange={e => setTempPartiesData({ ...tempPartiesData, judgeName: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] mt-1 bg-white ${
                      extractedPartiesData && tempPartiesData.judgeName === extractedPartiesData.judgeName 
                        ? 'border-[#6D5DFC] bg-indigo-50/10' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    );
  };

  const renderDocuments = () => {
    const handleUpload = (e) => {
      const files = Array.from(e.target.files);
      const docs = caseData.documents || [];
      const newDocs = files.map(f => ({
        name: f.name,
        size: `${Math.round(f.size / 1024)} KB`,
        date: new Date().toLocaleDateString()
      }));
      handleUpdateField({ documents: [...docs, ...newDocs] });
      toast.success(`${files.length} document(s) uploaded successfully!`);
    };

    const handleDeleteDoc = (idx) => {
      const list = [...(caseData.documents || [])];
      list.splice(idx, 1);
      handleUpdateField({ documents: list });
      toast.success("Document deleted");
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm text-center">
          <input type="file" id="doc-uploader" className="hidden" multiple onChange={handleUpload} />
          <div 
            onClick={() => document.getElementById('doc-uploader').click()}
            className="border-2 border-dashed border-[#E5E7EB] hover:border-[#6D5DFC]/50 rounded-xl p-8 cursor-pointer transition-all bg-slate-50/50"
          >
            <Upload size={32} className="mx-auto text-slate-400 mb-2" />
            <h4 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider">Upload Case Filing or Agreement</h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Accepts PDF, DOCX, XLSX up to 10MB</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Case Filings</h3>
          {caseData.documents && caseData.documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {caseData.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl text-[#6B7280]">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#111827]">{doc.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{doc.size} • Uploaded {doc.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="View Document"
                    >
                      <Eye size={14} />
                    </button>
                    <button onClick={() => handleDeleteDoc(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#9CA3AF] font-bold">No documents uploaded. Click above to import filings.</div>
          )}
        </div>
      </div>
    );
  };

  const renderEvidence = () => {
    const handleUploadEvidence = (e) => {
      const files = Array.from(e.target.files);
      const vault = caseData.evidence || [];
      const newDocs = files.map(f => ({
        name: f.name,
        type: f.type.startsWith('image/') ? 'Image Proof' : 'PDF Document',
        uploadDate: new Date().toISOString(),
        status: 'Moderate'
      }));
      handleUpdateField({ evidence: [...vault, ...newDocs] });
      toast.success(`${files.length} item(s) logged into the vault!`);
    };

    const handleDeleteEvidence = (idx) => {
      const list = [...(caseData.evidence || [])];
      list.splice(idx, 1);
      handleUpdateField({ evidence: list });
      toast.success("Evidence removed");
    };

    const handleToggleStatus = (idx, status) => {
      const list = [...(caseData.evidence || [])];
      list[idx].status = status;
      handleUpdateField({ evidence: list });
      toast.success(`Evidence marked as ${status}`);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#6D5DFC]">
            <ShieldCheck size={20} />
            <h4 className="text-xs font-black uppercase tracking-wider">Evidence Locker</h4>
          </div>
          <button 
            onClick={() => document.getElementById('evidence-loader').click()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#6D5DFC] text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <Upload size={14} /> Upload Evidence
          </button>
          <input type="file" id="evidence-loader" className="hidden" multiple onChange={handleUploadEvidence} />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Admissible Facts & Evidence Exhibits</h3>
          {caseData.evidence && caseData.evidence.length > 0 ? (
            <div className="space-y-3">
              {caseData.evidence.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl gap-4 group">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[#6B7280]">
                      <FileDigit size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#111827]">{item.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{item.type} • Verified {new Date(item.uploadDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex gap-1">
                      {['Strong', 'Moderate', 'Weak'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleToggleStatus(i, st)}
                          className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${
                            item.status === st
                              ? st === 'Strong' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                st === 'Weak' ? 'bg-red-50 text-red-600 border-red-100' :
                                'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handleDeleteEvidence(i)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#9CA3AF] font-bold">No evidence files logged. Upload proofs or case photographs.</div>
          )}
        </div>
      </div>
    );
  };

  const renderResearch = () => {
    const baseLegalResearch = {
      caseType: caseData.caseType || "Civil Suit for Recovery of Money",
      domain: caseData.domain || "Commercial Contract Law & Civil Procedure",
      completenessScore: 92,
      confidenceScore: 96,
      issues: [
        "Admissibility of uncertified electronic communications (WhatsApp chats and emails) under Section 65B(4) of the Evidence Act.",
        "Whether a suit for recovery is maintainable within the 3-year limitation period if debt acknowledgment is made digitally.",
        "Calculability of interest rate for commercial loans when not explicitly set under Section 34 of Code of Civil Procedure (CPC)."
      ],
      principles: [
        "Strict compliance with Section 65B(4) certification is a condition precedent to admissibility of electronic records.",
        "Digital written acknowledgments of debt within the three-year period start a fresh period of limitation under Section 18 of the Limitation Act.",
        "Courts hold discretion in commercial transactions to award reasonable market interest rate even if contract terms are silent."
      ],
      laws: [
        {
          act: "Indian Contract Act, 1872",
          section: "Section 73 & Section 74",
          description: "Compensation for loss or damage caused by breach of contract. Governs whether a penalty clause is enforceable without showing actual loss.",
          reason: "Applies directly to determine the validity of the interest charge rate and the default compensation claimed by the petitioner."
        },
        {
          act: "Code of Civil Procedure, 1908",
          section: "Section 34 & Order XXXVII",
          description: "Interest awards during litigation. Order 37 outlines the summary procedure for money recovery under written contracts or promissory notes.",
          reason: "Ensures the case follows summary procedures to expedite settlement and provides the legal basis for claiming interest."
        },
        {
          act: "Limitation Act, 1963",
          section: "Section 18 & Article 113",
          description: "Effect of acknowledgment in writing. Article 113 provides a general three-year limitation period for suits for which no period is prescribed elsewhere.",
          reason: "Crucial for rebutting the defendant's plea of limitation, using the emails and WhatsApp messages as written acknowledgment of debt."
        },
        {
          act: "Indian Evidence Act, 1872",
          section: "Section 65B",
          description: "Admissibility of electronic records. Mandates a written certificate for submitting printouts or digital records from secondary sources.",
          reason: "Applies to WhatsApp logs and email invoice reminders. Essential for getting the primary proof admitted by the judge."
        }
      ],
      judgments: [
        {
          name: "Kailash Nath Associates vs DDA",
          court: "Supreme Court of India",
          citation: "2015 4 SCC 136",
          summary: "Landmark ruling on liquidated damages. Held that penalty clauses under Section 74 can only be enforced if the party has suffered actual damage and estimation is impossible.",
          why: "Determines whether the interest penalties can be claimed without presenting audit sheets showing damage.",
          ratio: "Earnest money or penalty clauses can only be forfeited/enforced if the amount represents a genuine pre-estimate of loss."
        },
        {
          name: "Anvar P.V. vs P.K. Basheer",
          court: "Supreme Court of India",
          citation: "2014 10 SCC 473",
          summary: "Clarified the evidentiary requirements for secondary electronic records, holding that a Section 65B certificate is mandatory.",
          why: "Governs the admissibility of WhatsApp screenshot printouts and ledger copies.",
          ratio: "Electronic evidence is inadmissible in court without the explicit certificate required under Section 65B(4)."
        },
        {
          name: "State of Nagaland vs Lipok AO",
          court: "Supreme Court of India",
          citation: "2005 3 SCC 752",
          summary: "Addressed procedural delay condonation under Section 5. Stressed that technical issues should not override substantive justice.",
          why: "Assists in defending against any limitation technicalities raised by the opposing counsel.",
          ratio: "Courts must adopt a pragmatic, non-pedantic approach to condoning delays where justice warrants a full trial."
        },
        {
          name: "Ambalal Sarabhai Enterprise Ltd. vs K.S. Infraspace LLP",
          court: "Supreme Court of India",
          citation: "2020 15 SCC 585",
          summary: "Examines the scope of commercial court jurisdiction and timelines under the Commercial Courts Act, 2015.",
          why: "Applicable if the opposing party tries to transfer the suit to regular civil courts to delay trials.",
          ratio: "The provisions of the Commercial Courts Act must be strictly interpreted and applied to speed up dispute resolutions."
        }
      ],
      arguments: {
        plaintiff: [
          "The defendant acknowledged the transaction ledger debt through explicit emails and WhatsApp messages, which constitute valid written acknowledgments under Section 18 of the Limitation Act.",
          "Service delivery was completed in full and signed off by the defendant's agent, establishing an absolute contract obligation to clear outstanding dues.",
          "Section 34 of the CPC permits interest at commercial rates since the transaction was mercantile in nature."
        ],
        defendant: [
          "The suit is barred by limitation as it was filed more than three years after the initial invoice date.",
          "Services provided were defective and incomplete, discharging the defendant from performance obligations under the contract.",
          "Ledger logs and electronic chat screenshots are inadmissible under Section 65B due to the absence of the mandatory compliance certificate."
        ],
        counter: [
          "Written acknowledgments within the three-year window reset the limitation clock, making the current filing fully timely.",
          "Defective service complaints were never raised during delivery or in written responses until the recovery proceedings commenced."
        ],
        judicial: [
          "The court will likely order an interlocutory verification of the electronic records admissibility certificates.",
          "Preponderance of evidence strongly supports the plaintiff's claim if delivery receipts are verified by agents."
        ],
        weaknesses: [
          "Lack of a formal Section 65B(4) compliance certificate for the WhatsApp chat database files.",
          "Ambiguity in contract penalty clauses regarding interest percentages for delayed clearing."
        ]
      },
      recommendations: [
        "Acquire a certified Section 65B Evidence Certificate from the IT Administrator for all email exchanges.",
        "File a replication/rejoinder to specifically address and deny the allegations of defective delivery.",
        "Explore commercial arbitration or court-referred mediation under Section 89 of the CPC to bypass court delays.",
        "Rely on Kailash Nath Associates vs DDA to justify reasonable compensation calculations."
      ]
    };

    const processConversationalSearch = (query) => {
      setResearchSearchQuery(query);
      if (!query.trim()) {
        setConversationalSearchResults(null);
        return;
      }
      setIsSearchingResearch(true);
      setTimeout(() => {
        const q = query.toLowerCase();
        let filteredJudgments = baseLegalResearch.judgments;
        let filteredLaws = baseLegalResearch.laws;

        if (q.includes("supreme") || q.includes("sc")) {
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.court.toLowerCase().includes("supreme"));
        } else if (q.includes("whatsapp") || q.includes("electronic") || q.includes("65b") || q.includes("evidence")) {
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.summary.toLowerCase().includes("65b") || j.name.toLowerCase().includes("anvar") || j.ratio.toLowerCase().includes("electronic"));
          filteredLaws = baseLegalResearch.laws.filter(l => l.act.toLowerCase().includes("evidence") || l.section.toLowerCase().includes("65b"));
        } else if (q.includes("limitation") || q.includes("limit") || q.includes("delay")) {
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.summary.toLowerCase().includes("limitation") || j.name.toLowerCase().includes("nagaland") || j.ratio.toLowerCase().includes("delay"));
          filteredLaws = baseLegalResearch.laws.filter(l => l.act.toLowerCase().includes("limitation") || l.section.toLowerCase().includes("18"));
        } else if (q.includes("contract") || q.includes("recovery") || q.includes("kailash")) {
          filteredJudgments = baseLegalResearch.judgments.filter(j => j.summary.toLowerCase().includes("contract") || j.name.toLowerCase().includes("kailash") || j.ratio.toLowerCase().includes("damage"));
          filteredLaws = baseLegalResearch.laws.filter(l => l.act.toLowerCase().includes("contract") || l.section.toLowerCase().includes("73") || l.section.toLowerCase().includes("74"));
        }

        setConversationalSearchResults({
          judgments: filteredJudgments,
          laws: filteredLaws
        });
        setIsSearchingResearch(false);
        toast.success("Found matching precedents and laws!");
      }, 500);
    };

    const runResearchAnalysis = async () => {
      setIsRegeneratingResearch(true);
      setResearchRegenSteps([
        "Connecting to AI Legal™ Co-Counsel Engine...",
        "Scanning case summary and active timeline events...",
        "Extracting keywords: recovery, Limitation Act, Section 65B...",
        "Searching Supreme Court & High Court digital database repositories...",
        "Analyzing defense contentions and procedural vulnerabilities...",
        "Compiling legal issues, relevant acts, and ratio summaries...",
        "Recalculating research completeness index..."
      ]);
      setActiveResearchRegenStep(0);

      for (let i = 0; i < 7; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActiveResearchRegenStep(prev => prev + 1);
      }

      setIsRegeneratingResearch(false);
      setConversationalSearchResults(null);
      setResearchSearchQuery('');
      toast.success("AI Legal™ Research Workspace refreshed successfully!");
    };

    const handleSavePrecedentToBackend = (judgment) => {
      const existing = caseData.research || [];
      if (existing.some(item => item.citation === judgment.citation)) {
        toast.error("This judgment is already saved to your case citations.");
        return;
      }
      handleUpdateField({
        research: [...existing, {
          title: judgment.name,
          citation: judgment.citation,
          summary: `${judgment.summary} (Key Ratio: ${judgment.ratio})`
        }]
      });
      toast.success("Judgment saved to Case Research!");
    };

    const handleDeletePrecedent = (idx) => {
      const list = [...(caseData.research || [])];
      list.splice(idx, 1);
      handleUpdateField({ research: list });
      toast.success("Saved research citation deleted");
    };

    const activeLaws = conversationalSearchResults ? conversationalSearchResults.laws : baseLegalResearch.laws;
    const activeJudgments = conversationalSearchResults ? conversationalSearchResults.judgments : baseLegalResearch.judgments;

    const toggleSection = (sectionName) => {
      setExpandedResearchSection(expandedResearchSection === sectionName ? '' : sectionName);
    };

    const suggestions = [
      "Find judgments supporting recovery suits.",
      "What Supreme Court cases apply?",
      "Admissibility of WhatsApp & electronic evidence",
      "Limitation period condonation precedents"
    ];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-250">
        
        {/* 1. Header / Conversational Search */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xxs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen size={18} className="text-[#6D5DFC]" />
                <span>AI Legal™ Research Engine</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Automatic context-aware legal research synced with active documents.</p>
            </div>
            
            <button 
              onClick={runResearchAnalysis}
              disabled={isRegeneratingResearch}
              className="w-full sm:w-auto bg-[#6D5DFC] hover:bg-[#5b4be8] disabled:bg-[#6D5DFC]/60 text-white rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0"
            >
              <Sparkles size={13} className="animate-pulse" />
              {isRegeneratingResearch ? "Regenerating..." : "Analyze & Refresh"}
            </button>
          </div>

          {/* Conversational Search Input */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Ask the AI research search (e.g. 'What laws are applicable?' or 'Find Supreme Court precedents')..."
              value={researchSearchQuery}
              onChange={e => setResearchSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && processConversationalSearch(researchSearchQuery)}
              className="w-full border border-slate-200 rounded-xl pl-10 pr-24 py-3 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC]/20 shadow-xxs bg-white placeholder-slate-400"
            />
            <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
            
            <button 
              onClick={() => processConversationalSearch(researchSearchQuery)}
              className="absolute right-2 top-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg px-3 py-1.5 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => processConversationalSearch(sug)}
                className="text-[10px] font-semibold text-slate-500 hover:text-[#6D5DFC] bg-slate-50 hover:bg-[#6D5DFC]/5 border border-slate-200/80 rounded-full px-3 py-1 transition-all"
              >
                &quot;{sug}&quot;
              </button>
            ))}
          </div>
        </div>

        {/* 2. Loading Animation for Regeneration */}
        {isRegeneratingResearch && (
          <div className="py-10 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-[#6D5DFC] animate-spin" />
            <div className="text-xs text-slate-700 font-bold uppercase tracking-wider animate-pulse">
              {researchRegenSteps[activeResearchRegenStep] || "Synthesizing Legal Intelligence..."}
            </div>
          </div>
        )}

        {/* Loading Indicator for Search */}
        {isSearchingResearch && (
          <div className="py-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#6D5DFC] animate-spin" />
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Searching Legal Database...</div>
          </div>
        )}

        {/* 3. Research completeness metrics bar */}
        {!isRegeneratingResearch && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
              <div className="w-10 h-10 rounded-lg bg-indigo-50/70 text-[#6D5DFC] flex items-center justify-center font-bold text-sm shrink-0">
                {baseLegalResearch.completenessScore}%
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Completeness</span>
                <span className="text-xs font-bold text-slate-800">Research Coverage</span>
              </div>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50/70 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                {baseLegalResearch.confidenceScore}%
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Confidence</span>
                <span className="text-xs font-bold text-slate-800">Precision Index</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
              <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                CPC
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Primary Code</span>
                <span className="text-xs font-bold text-slate-800">Civil Procedure</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                LMT
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Limitation Risk</span>
                <span className="text-xs font-bold text-slate-800">Medium Risk</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Collapsible Workspace Cards */}
        {!isRegeneratingResearch && (
          <div className="space-y-4">
            
            {/* CARD 1: AI Research Dashboard Overview */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('dashboard')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">AI Research Dashboard Overview</span>
                </div>
                {expandedResearchSection === 'dashboard' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'dashboard' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Identified Case Type</span>
                      <span className="text-slate-800 font-bold mt-1 block">{baseLegalResearch.caseType}</span>
                    </div>
                    <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Core Jurisdiction / Domain</span>
                      <span className="text-slate-800 font-bold mt-1 block">{baseLegalResearch.domain}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Key Legal Issues at Dispute</span>
                    <ol className="space-y-1.5 list-decimal pl-4 font-semibold text-slate-700">
                      {baseLegalResearch.issues.map((issue, idx) => (
                        <li key={idx} className="pl-1 leading-relaxed">{issue}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Relevant Judicial Principles</span>
                    <ul className="space-y-1.5 list-disc pl-4 font-medium text-slate-600">
                      {baseLegalResearch.principles.map((princ, idx) => (
                        <li key={idx} className="pl-1 leading-relaxed">{princ}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Applicable Laws & Provisions */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('laws')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">Applicable Laws & Provisions ({activeLaws.length})</span>
                </div>
                {expandedResearchSection === 'laws' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'laws' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                  {activeLaws.map((law, idx) => (
                    <div key={idx} className="py-4 first:pt-2 last:pb-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-slate-900 bg-slate-50 px-2 py-1 border border-slate-200 rounded">{law.act}</span>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded">{law.section}</span>
                      </div>
                      <p className="text-slate-700 font-semibold leading-relaxed">{law.description}</p>
                      <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-lg p-2.5 mt-1 flex items-start gap-2">
                        <Sparkles size={12} className="text-[#6D5DFC] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-950 font-medium leading-normal">
                          <span className="font-bold text-[#6D5DFC]">AI Applicability explanation:</span> {law.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD 3: Relevant Judgments & Precedents */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('judgments')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Gavel size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">Relevant Judgments & Precedents ({activeJudgments.length})</span>
                </div>
                {expandedResearchSection === 'judgments' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'judgments' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-5 divide-y divide-slate-100 text-xs">
                  {activeJudgments.map((jud, idx) => (
                    <div key={idx} className="pt-4 first:pt-2 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-extrabold text-[#111827] text-xs leading-tight">{jud.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-slate-400">{jud.court}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[9px] font-black text-[#6D5DFC] uppercase tracking-widest">{jud.citation}</span>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleSavePrecedentToBackend(jud)}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-[#6D5DFC] rounded-md px-2.5 py-1 text-[10px] font-bold transition-all"
                            title="Save reference to case citations"
                          >
                            Save to Case
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${jud.name} (${jud.citation})`);
                              toast.success("Citation copied to clipboard!");
                            }}
                            className="p-1 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Citation"
                          >
                            <Copy size={11} />
                          </button>
                          <button 
                            onClick={() => toast.success(`Opening full judgment of ${jud.name} from judicial archives...`)}
                            className="p-1 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Open Full Judgment Text"
                          >
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-700 font-semibold leading-relaxed">{jud.summary}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-slate-50 border border-slate-200/60 rounded-lg p-2.5">
                        <div>
                          <span className="font-black text-slate-500 uppercase tracking-wider">Key Ratio Decidendi</span>
                          <p className="text-slate-700 font-medium mt-0.5 leading-normal">{jud.ratio}</p>
                        </div>
                        <div>
                          <span className="font-black text-[#6D5DFC] uppercase tracking-wider">Why it applies</span>
                          <p className="text-slate-700 font-medium mt-0.5 leading-normal">{jud.why}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD 4: AI Arguments Formulation */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('arguments')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">AI Arguments & Strategy Formulation</span>
                </div>
                {expandedResearchSection === 'arguments' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'arguments' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Petitioner arguments */}
                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block border-b border-indigo-100 pb-1">Arguments for Petitioner</span>
                      <ul className="space-y-2 text-slate-700 font-medium list-disc pl-3">
                        {baseLegalResearch.arguments.plaintiff.map((arg, idx) => (
                          <li key={idx} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Respondent defense */}
                    <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block border-b border-rose-100 pb-1">Anticipated Defendant Objections</span>
                      <ul className="space-y-2 text-slate-700 font-medium list-disc pl-3">
                        {baseLegalResearch.arguments.defendant.map((arg, idx) => (
                          <li key={idx} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Counters */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block border-b border-slate-200 pb-1">Counter-Arguments</span>
                      <ul className="space-y-2 text-slate-700 font-medium list-disc pl-3">
                        {baseLegalResearch.arguments.counter.map((arg, idx) => (
                          <li key={idx} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Judicial Considerations */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest block border-b border-slate-200 pb-1">Likely Judicial Considerations</span>
                      <ul className="space-y-2 text-slate-700 font-medium list-disc pl-3">
                        {baseLegalResearch.arguments.judicial.map((arg, idx) => (
                          <li key={idx} className="leading-relaxed">{arg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Vulnerabilities / Weaknesses */}
                  <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block flex items-center gap-1">
                      <AlertTriangle size={12} className="text-amber-600" />
                      <span>Identified Case Weaknesses & Strategic Risks</span>
                    </span>
                    <ul className="space-y-1.5 text-slate-700 font-medium list-disc pl-3">
                      {baseLegalResearch.arguments.weaknesses.map((arg, idx) => (
                        <li key={idx} className="leading-relaxed">{arg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 5: AI Strategic Recommendations */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('recommendations')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">AI Recommendations & Missing Authorities</span>
                </div>
                {expandedResearchSection === 'recommendations' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'recommendations' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Actionable Legal Next Steps</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-semibold text-slate-700">
                    {baseLegalResearch.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 flex items-start gap-2 shadow-xxs">
                        <Check size={12} className="text-[#6D5DFC] shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 6: Saved Research Citations (Backend Sync) */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xxs overflow-hidden">
              <button 
                onClick={() => toggleSection('saved')}
                className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-[#6D5DFC]" />
                  <span className="text-xs font-bold text-slate-800">Saved Research Citations ({caseData.research?.length || 0})</span>
                </div>
                {expandedResearchSection === 'saved' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>

              {expandedResearchSection === 'saved' && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-xs">
                  {caseData.research && caseData.research.length > 0 ? (
                    <div className="space-y-3 pt-3">
                      {caseData.research.map((item, i) => (
                        <div key={i} className="flex justify-between items-start p-3 bg-slate-50 border border-slate-200 rounded-lg gap-4 shadow-xxs">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-extrabold text-[#111827]">{item.title}</h4>
                              <span className="text-[9px] font-black text-[#6D5DFC] uppercase tracking-widest">{item.citation}</span>
                            </div>
                            {item.summary && <p className="text-xs text-[#4B5563] mt-1 font-semibold leading-relaxed">{item.summary}</p>}
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${item.title} (${item.citation})`);
                                toast.success("Citation copied to clipboard!");
                              }} 
                              className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-[#6D5DFC] shadow-xxs"
                              title="Copy Citation"
                            >
                              <Copy size={11} />
                            </button>
                            <button 
                              onClick={() => handleDeletePrecedent(i)} 
                              className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-rose-500 shadow-xxs"
                              title="Remove Reference"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 font-semibold pt-4">No citations saved to this case roster yet. Click &quot;Save to Case&quot; on relevant precedents above to register reference items.</div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    );
  };

  const renderDrafts = () => {
    const handleAddDraft = () => {
      if (!newDraft.name) return;
      const list = caseData.drafts || [];
      handleUpdateField({ drafts: [...list, { ...newDraft, date: new Date().toLocaleDateString() }] });
      setNewDraft({ name: '', type: 'Notice', content: '' });
      toast.success("Draft created!");
    };

    const handleDeleteDraft = (idx) => {
      const list = [...(caseData.drafts || [])];
      list.splice(idx, 1);
      handleUpdateField({ drafts: list });
      toast.success("Draft deleted");
    };

    const handleDownloadDraft = (draft) => {
      const draftContent = draft.content || `
=========================================
          AI LEGAL™ DRAFTING SUITE
=========================================
DRAFT TYPE: ${draft.type.toUpperCase()}
DRAFT TITLE: ${draft.name}
CASE BOUND: ${caseData.clientName || "Rajesh Sharma"} vs ${caseData.accused || caseData.opponentName || "Amit Verma"}
DATE GENERATED: ${draft.date || new Date().toLocaleDateString()}
STATUS: FINAL REVIEW PENDING
-----------------------------------------

IN THE COURT OF THE DISTRICT JUDGE AT DELHI
CIVIL ORIGINAL JURISDICTION

IN THE MATTER OF:
${caseData.clientName?.toUpperCase() || "RAJESH SHARMA"}        ...PLAINTIFF

VERSUS

${caseData.accused?.toUpperCase() || caseData.opponentName?.toUpperCase() || "AMIT VERMA"}          ...DEFENDANT

SUBJECT: DRAFT PETITION FOR ${draft.type.toUpperCase()}

Sir/Madam,
The plaintiff/petitioner above-named begs to submit as under:

1. That the parties entered into a binding contract agreement details of which are annexed.
2. That the defendant has failed to settle the outstanding dues and has breached transaction terms.
3. The cause of action arose within the jurisdiction of this Hon'ble Court.
4. Hence, this petition is filed praying for an order of recovery/restoration in the interest of justice.

PLAINTIFF/PETITIONER
Through Counsel
`;
      const blob = new Blob([draftContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeFilename = draft.name.replace(/\\s+/g, "_") + ".txt";
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${safeFilename}" successfully!`);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Initialize Manual Draft Folder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Draft Name (e.g. Reply Notice)" 
              value={newDraft.name} 
              onChange={e => setNewDraft({ ...newDraft, name: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            />
            <select 
              value={newDraft.type} 
              onChange={e => setNewDraft({ ...newDraft, type: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="Notice">Legal Notice</option>
              <option value="Reply Notice">Reply Notice</option>
              <option value="FIR">FIR Draft</option>
              <option value="Affidavit">Affidavit</option>
              <option value="Agreement">Agreement</option>
            </select>
            <button 
              onClick={handleAddDraft} 
              className="bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors"
            >
              Create Draft
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Case Drafts Folder</h3>
          {caseData.drafts && caseData.drafts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {caseData.drafts.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-[#6B7280]">
                      <PenTool size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#111827]">{d.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{d.type} • Created {d.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownloadDraft(d)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Download Draft"
                    >
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleDeleteDraft(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#9CA3AF] font-bold">No draft letters found. Use AI Assistant or manually write drafts.</div>
          )}
        </div>
      </div>
    );
  };

  const renderContracts = () => {
    const defaultContractData = {
      name: "loan_agreement_signed.pdf",
      size: "842 KB",
      date: new Date().toLocaleDateString(),
      readingTime: "4 mins",
      riskLevel: "High",
      riskScore: 78,
      parties: "Rajesh Sharma (Lender) vs Amit Verma (Borrower)",
      summary: {
        purpose: "Commercial term loan agreement detailing disbursement, repayment, and default interest clauses for collateral hardware procurement.",
        duration: "12 Months (Execution: 14/06/2025 • Expiry: 14/06/2026)",
        finance: "Principal amount of INR 14,50,000 with a standard rate of 9% p.a.",
        responsibility: "Borrower must clear invoices within 30 days and maintain machinery collateral in good working order.",
        majorRisk: "Ambiguous default interest clauses and missing arbitration provisions force regular civil court litigation in case of breach.",
        renewal: "Requires written notice at least 30 days prior to expiry date."
      },
      risks: [
        {
          id: 1,
          severity: "Critical",
          title: "Ambiguous Default Interest Rate",
          reason: "Section 5 dictates the borrower pays additional charges 'at a rate determined by the lender', violating reasonable commercial caps under Section 74.",
          fix: "Amend default interest rate to a fixed simple interest of 12% per annum."
        },
        {
          id: 2,
          severity: "High",
          title: "Weak Termination Clause",
          reason: "Termination requires a 90-day written notice period even in cases of material repayment breach, severely delaying recovery efforts.",
          fix: "Reduce notice to 15 days upon financial default and add immediate termination remedy clauses."
        },
        {
          id: 3,
          severity: "Medium",
          title: "Missing Arbitration Provision",
          reason: "Contract is completely silent on dispute resolution, leaving civil court litigation as the only default mechanism.",
          fix: "Insert a standard dispute clause delegating unresolved issues to sole arbitration in New Delhi under the Arbitration Act."
        }
      ],
      clauses: [
        {
          title: "Payment Clause (Section 4)",
          status: "Needs Improvement",
          risk: "Medium",
          explanation: "Mentions payment terms of 30 days but lacks interest penalty details for minor invoice delays.",
          rewrite: "“Section 4.1: Payments shall be cleared within 30 days. Delayed payments shall accrue a simple interest of 1% per month until fully paid.”"
        },
        {
          title: "Termination Clause (Section 8)",
          status: "Weak",
          risk: "High",
          explanation: "Specifies a slow 90-day period with no immediate recovery remedies during insolvency or persistent defaults.",
          rewrite: "“Section 8.2: In the event of repayment failure, the lender may terminate this agreement with a 15-day notice, and accelerate the entire principal balance immediately.”"
        },
        {
          title: "Indemnity Clause (Section 12)",
          status: "Strong",
          risk: "Low",
          explanation: "Indemnifies the lender comprehensively from all claims arising from borrower operations.",
          rewrite: "“Section 12.1: The borrower agrees to indemnify, defend, and hold harmless the lender against any damages, losses, or legal claims.”"
        },
        {
          title: "Dispute Resolution (Section 15)",
          status: "Missing",
          risk: "Critical",
          explanation: "No arbitration clause is included in this agreement, creating substantial risk of long trials.",
          rewrite: "“Section 15: All disputes shall be referred to sole arbitration in New Delhi, in accordance with the Arbitration & Conciliation Act.”"
        }
      ],
      originalText: "Section 5: In case of default, the borrower shall be liable to pay additional interest charges at a rate determined by the lender.",
      revisedText: "Section 5: In case of default, the borrower shall pay simple interest at the rate of 12% per annum on the outstanding principal from the default date until full payment."
    };

    const handleUploadContract = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsAnalyzingContract(true);
      setContractAnalysisSteps([
        "Initializing OCR document scanner...",
        "Parsing agreement layout structure...",
        "Identifying signatory parties and witness metadata...",
        "Auditing termination and compound interest liability clauses...",
        "Compiling executive summary report...",
        "Finalizing contract intelligence database..."
      ]);
      setActiveContractAnalysisStep(0);

      // Multi-stage scan loader simulation
      const interval = setInterval(() => {
        setActiveContractAnalysisStep(prev => {
          if (prev >= 5) {
            clearInterval(interval);
            setIsAnalyzingContract(false);
            setUploadedContract(defaultContractData);
            
            // Sync to backend contracts array automatically to preserve compatibility
            const list = caseData.contracts || [];
            handleUpdateField({
              contracts: [...list, {
                name: file.name,
                riskLevel: "High",
                notes: "Analyzed automatically by AI Contract Intelligence"
              }]
            });
            toast.success("AI successfully analyzed contract and detected risks!");
            return 5;
          }
          return prev + 1;
        });
      }, 700);
    };

    const handleSyncWithCaseWorkspace = () => {
      // 1. Sync to timeline events
      const existingTimeline = caseData.timeline || [];
      const hasContractEvents = existingTimeline.some(e => e.title.includes("Contract Execution"));
      
      let updatedTimeline = existingTimeline;
      if (!hasContractEvents) {
        updatedTimeline = [
          ...existingTimeline,
          {
            date: "14/06/2025",
            title: "Execution of Loan Agreement (AI Extracted)",
            description: "Signing and execution of term loan agreement between Rajesh Sharma and Amit Verma."
          },
          {
            date: "14/06/2026",
            title: "Expiry of Loan Agreement (AI Extracted)",
            description: "Term loan expiry date requiring written renewal notice."
          }
        ];
      }

      // 2. Sync to Parties tab
      const updatedCaseData = {
        ...caseData,
        opposingLawyer: "Vipul Sen (Senior Counsel)",
        courtName: "Delhi District Court",
        judgeName: "Justice Dixit",
        timeline: updatedTimeline
      };

      handleUpdateField(updatedCaseData);
      setIsContractLinked(true);
      toast.success("Timeline, Parties, and court data synced successfully!");
    };

    const handleSendContractChatMessage = () => {
      if (!contractChatInput.trim()) return;
      const userMsg = { sender: 'user', text: contractChatInput };
      setContractChatMessages(prev => [...prev, userMsg]);
      setContractChatInput('');

      setTimeout(() => {
        const query = contractChatInput.toLowerCase();
        let reply = "I have analyzed your query. Based on the contract text, there is a substantial liability risk if the default interest terms are left vague. I suggest adding a fixed 12% simple interest clause.";
        
        if (query.includes("safe") || query.includes("risk")) {
          reply = "The contract is currently flagged as High Risk (78/100) due to: 1. Ambiguous payment defaults, 2. No arbitration clause, and 3. A slow 90-day termination notice period. It is not fully safe in its current form.";
        } else if (query.includes("arbitration") || query.includes("dispute")) {
          reply = "I recommend adding the following dispute term: 'All disputes arising out of this agreement shall be settled through sole arbitration under the rules of Delhi International Arbitration Centre.'";
        } else if (query.includes("termination") || query.includes("rewrite")) {
          reply = "Here is a revised termination clause: 'Either party may terminate this agreement immediately upon notice if the other party breaches repayment terms and fails to cure it within 15 days.'";
        }

        setContractChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      }, 650);
    };

    const handleAcceptRedline = () => {
      setContractRedlineState('accepted');
      toast.success("AI revised clause accepted!");
    };

    const handleRejectRedline = () => {
      setContractRedlineState('rejected');
      toast.error("AI changes declined.");
    };

    const handleDeleteContract = (idx) => {
      const list = [...(caseData.contracts || [])];
      list.splice(idx, 1);
      handleUpdateField({ contracts: list });
      setUploadedContract(null);
      setIsContractLinked(false);
      toast.success("Contract removed");
    };

    // Filter clauses based on search query
    const filteredClauses = uploadedContract 
      ? uploadedContract.clauses.filter(c => 
          c.title.toLowerCase().includes(contractSearchQuery.toLowerCase()) || 
          c.explanation.toLowerCase().includes(contractSearchQuery.toLowerCase())
        )
      : [];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-250">
        
        {/* LANDING SCREEN / FILE UPLOADER */}
        {!uploadedContract && !isAnalyzingContract && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm text-center">
            <input 
              type="file" 
              id="contract-uploader" 
              className="hidden" 
              onChange={handleUploadContract} 
            />
            <div 
              onClick={() => document.getElementById('contract-uploader').click()}
              className="border-2 border-dashed border-[#E5E7EB] hover:border-[#6D5DFC]/50 rounded-xl p-12 cursor-pointer transition-all bg-slate-50/50 flex flex-col items-center justify-center space-y-4"
            >
              <Upload size={42} className="text-slate-400" />
              <div>
                <h4 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider">Upload Term Contract or Agreement</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Drag and drop file here, or click to browse local files.</p>
              </div>
              <div className="flex gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                <span>PDF</span>
                <span>•</span>
                <span>DOCX</span>
                <span>•</span>
                <span>Scanned Images</span>
              </div>
            </div>
          </div>
        )}

        {/* AI SCAN LOADER */}
        {isAnalyzingContract && (
          <div className="py-12 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-[#6D5DFC] animate-spin" />
            <div className="text-xs text-slate-700 font-bold uppercase tracking-wider animate-pulse">
              {contractAnalysisSteps[activeContractAnalysisStep] || "Processing Contract Analysis..."}
            </div>
          </div>
        )}

        {/* AI CONTRACT INTELLIGENCE WORKSPACE */}
        {uploadedContract && !isAnalyzingContract && (
          <div className="space-y-6">
            
            {/* Header / Actions Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xxs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-[#6D5DFC] rounded-xl shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{uploadedContract.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">
                    {uploadedContract.size} • Reading Time: {uploadedContract.readingTime}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSyncWithCaseWorkspace}
                  disabled={isContractLinked}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                    isContractLinked 
                      ? 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Sparkles size={13} className="text-[#6D5DFC]" />
                  {isContractLinked ? "Linked to Workspace" : "Sync with Workspace"}
                </button>

                <button 
                  onClick={() => {
                    setUploadedContract(null);
                    setIsContractLinked(false);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  Re-upload
                </button>

                <button 
                  onClick={() => toast.success("Exporting contract analysis report PDF...")}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
                  title="Export Options"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {/* Sub Tabs Navigation */}
            <div className="flex border-b border-slate-100 gap-1 overflow-x-auto hide-scrollbar shrink-0 select-none">
              {[
                { id: 'summary', name: 'Executive Summary', icon: LayoutDashboard },
                { id: 'risks', name: 'Risk Assessment', icon: AlertTriangle },
                { id: 'clauses', name: 'Clause Intelligence', icon: FileText },
                { id: 'comparison', name: 'Redlining & Diff', icon: TrendingUp },
                { id: 'chat', name: 'Negotiation AI Chat', icon: MessageSquare }
              ].map(sub => {
                const isActive = contractActiveSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setContractActiveSubTab(sub.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
                      isActive 
                        ? 'border-[#6D5DFC] text-[#6D5DFC]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <sub.icon size={13} />
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* SUB TAB CONTENT 1: EXECUTIVE SUMMARY */}
            {contractActiveSubTab === 'summary' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xxs space-y-5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-2">AI Summary & Metadata</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contract Purpose</span>
                    <p className="text-slate-800 font-semibold mt-1 leading-relaxed">{uploadedContract.summary.purpose}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Core Signatory Parties</span>
                    <p className="text-slate-800 font-semibold mt-1 leading-relaxed">{uploadedContract.summary.parties}</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs pt-2">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Duration & Validity</span>
                    <p className="text-slate-700 font-semibold mt-0.5 leading-normal">{uploadedContract.summary.duration}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Financial Obligations</span>
                    <p className="text-slate-700 font-semibold mt-0.5 leading-normal">{uploadedContract.summary.finance}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Major Responsibilities</span>
                    <p className="text-slate-700 font-semibold mt-0.5 leading-normal">{uploadedContract.summary.responsibility}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Renewal Protocol</span>
                    <p className="text-slate-700 font-semibold mt-0.5 leading-normal">{uploadedContract.summary.renewal}</p>
                  </div>
                  <div className="bg-red-50/40 border border-red-200/50 p-3 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black text-red-700 uppercase tracking-widest block">Primary Legal Vulnerability</span>
                      <p className="text-slate-800 font-semibold mt-0.5 leading-relaxed">{uploadedContract.summary.majorRisk}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB TAB CONTENT 2: RISK ASSESSMENT */}
            {contractActiveSubTab === 'risks' && (
              <div className="space-y-4">
                
                {/* Score bar */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xxs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-black text-red-600">{uploadedContract.riskScore}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Overall Contract Risk</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">High Risk</span>
                        <span className="text-[10px] text-slate-500 font-bold">Needs manual negotiation before signoff.</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setContractActiveSubTab('redlining')} 
                    className="w-full sm:w-auto bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    View Suggested Fixes & Redline →
                  </button>
                </div>

                {/* Risk Issues list */}
                <div className="space-y-3 text-xs">
                  {uploadedContract.risks.map(risk => (
                    <div key={risk.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xxs space-y-3 hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h4 className="font-extrabold text-slate-900">{risk.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          risk.severity === 'Critical' ? 'bg-red-50 border-red-100 text-red-600' :
                          risk.severity === 'High' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                          'bg-amber-50 border-amber-100 text-amber-600'
                        }`}>
                          {risk.severity} Severity
                        </span>
                      </div>
                      
                      <p className="text-slate-700 font-semibold leading-relaxed">
                        <span className="font-black text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">Audit Findings</span>
                        {risk.reason}
                      </p>

                      <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-lg p-3 flex items-start gap-2">
                        <Sparkles size={12} className="text-[#6D5DFC] shrink-0 mt-0.5" />
                        <div className="text-[10px] text-indigo-950 font-semibold">
                          <span className="font-black text-[#6D5DFC] uppercase tracking-widest block text-[9px] mb-0.5">Recommended Remedy</span>
                          {risk.fix}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB TAB CONTENT 3: CLAUSE INTELLIGENCE */}
            {contractActiveSubTab === 'clauses' && (
              <div className="space-y-4">
                
                {/* Search / Filter box */}
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Filter contract clauses (e.g. 'payment', 'termination', 'indemnity')..."
                    value={contractSearchQuery}
                    onChange={e => setContractSearchQuery(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC] shadow-xxs bg-white placeholder-slate-400"
                  />
                  <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                </div>

                {/* Clauses list */}
                <div className="space-y-3.5 text-xs">
                  {filteredClauses.map((clause, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xxs space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-slate-900">{clause.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            clause.status === 'Strong' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            clause.status === 'Missing' ? 'bg-red-50 border-red-100 text-red-600' :
                            'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                            {clause.status}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 uppercase tracking-wider">
                            {clause.risk} Risk
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-700 font-semibold leading-relaxed">
                        <span className="font-black text-slate-400 uppercase tracking-widest block text-[9px] mb-0.5">AI Analysis</span>
                        {clause.explanation}
                      </p>

                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2">
                        <span className="font-black text-slate-500 uppercase tracking-widest block text-[9px]">AI Drafted Standard Provision</span>
                        <p className="font-mono text-[10px] text-slate-800 leading-relaxed bg-white border border-slate-200/50 p-2.5 rounded-lg">{clause.rewrite}</p>
                      </div>
                    </div>
                  ))}

                  {filteredClauses.length === 0 && (
                    <div className="text-center py-8 text-slate-400 font-semibold bg-white border border-slate-200 rounded-xl shadow-xxs">
                      No clauses found matching your filter criteria.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB TAB CONTENT 4: REDLINING & DIFF COMPARISON */}
            {contractActiveSubTab === 'comparison' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xxs space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">AI Redlining & Term Comparison</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Original clauses vs. AI suggested revisions.</p>
                  </div>

                  {/* Actions */}
                  {contractRedlineState === 'pending' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleAcceptRedline}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors shadow-sm"
                      >
                        Accept Changes
                      </button>
                      <button 
                        onClick={handleRejectRedline}
                        className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors shadow-sm"
                      >
                        Reject Changes
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                      contractRedlineState === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      {contractRedlineState === 'accepted' ? "Accepted by Advocate" : "Declined"}
                    </span>
                  )}
                </div>

                {/* Diff Viewer Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Original Clause */}
                  <div className="border border-slate-200/80 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-1">Original Clause</span>
                    <p className="font-semibold text-slate-700 leading-relaxed bg-rose-50/30 border border-rose-100/50 rounded-lg p-3 text-justify">
                      {uploadedContract.originalText}
                    </p>
                  </div>

                  {/* Revised Clause */}
                  <div className="border border-[#6D5DFC]/20 rounded-xl p-4 space-y-3 bg-white">
                    <span className="text-[9px] font-black text-[#6D5DFC] uppercase tracking-widest block border-b border-[#6D5DFC]/10 pb-1">Revised Clause (AI Redline)</span>
                    <p className="font-semibold text-slate-800 leading-relaxed bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 text-justify">
                      {uploadedContract.revisedText}
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl flex items-start gap-2.5 text-[10px] text-indigo-950 font-medium">
                  <Sparkles size={14} className="text-[#6D5DFC] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>AI Legal™ Note:</strong> Accepting these changes will automatically enforce fixed simple interest terms, neutralizing the compound calculation vulnerability and bringing the draft in line with Supreme Court guidelines in <em>Kailash Nath Associates vs DDA</em>.
                  </p>
                </div>
              </div>
            )}

            {/* SUB TAB CONTENT 5: NEGOTIATION AI CHAT */}
            {contractActiveSubTab === 'chat' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xxs flex flex-col h-[400px]">
                
                {/* Chat Panel Title */}
                <div className="pb-3 border-b border-slate-100 shrink-0">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-[#6D5DFC]" />
                    <span>Contract Negotiation AI Assistant</span>
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Query contract liabilities, request clause modifications, or check safety conditions.</p>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar text-xs">
                  {contractChatMessages.map((msg, idx) => {
                    const isAi = msg.sender === 'ai';
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-2.5 ${isAi ? '' : 'flex-row-reverse'}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                          isAi ? 'bg-indigo-50 text-[#6D5DFC]' : 'bg-slate-900 text-white'
                        }`}>
                          {isAi ? 'AI' : 'R'}
                        </div>
                        <div className={`p-3 rounded-xl max-w-[80%] font-semibold leading-relaxed ${
                          isAi ? 'bg-slate-50 border border-slate-200/50 text-slate-700' : 'bg-[#6D5DFC] text-white shadow-xxs'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input block */}
                <div className="border-t border-slate-100 pt-3 flex gap-2 shrink-0">
                  <input 
                    type="text"
                    placeholder="Ask contract co-counsel (e.g. 'Is this contract safe?' or 'Rewrite the payment clause')..."
                    value={contractChatInput}
                    onChange={e => setContractChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendContractChatMessage()}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
                  />
                  <button 
                    onClick={handleSendContractChatMessage}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    );
  };

  const renderArguments = () => {
    const client = caseData.clientName || 'Client';
    const opponent = caseData.opponentName || caseData.accused || 'Opponent';
    const courtName = caseData.court || caseData.courtName || 'Court';

    const ci = caseData.caseIntelligence || {};
    const petitionerArgs = caseData.arguments?.petitionerArguments?.length > 0
      ? caseData.arguments.petitionerArguments
      : (ci.arguments || []);
    const respondentArgs = caseData.arguments?.respondentArguments?.length > 0
      ? caseData.arguments.respondentArguments
      : (ci.counterArguments || []);
    const predictionsList = ci.counterArguments
      ? ci.counterArguments.map((c, idx) => ({
          id: `pred_${idx}`,
          title: c.title || 'Potential Counter Objection',
          description: c.description || '',
          probability: 75,
          type: c.category || 'Defense Challenge',
          rebuttal: c.refutation || 'Rebuttal based on case facts.'
        }))
      : [];
    const trialSeq = ci.strategy?.trialSequence?.length > 0
      ? ci.strategy.trialSequence
      : [{ step: 1, title: 'Establish Primary Claims', detail: caseData.summary || 'Present submitted facts', status: 'Primary' }];

    const strategyData = {
      strengthScore: ci.caseStrength || caseData.intelligence?.strengthScore || 70,
      completenessScore: 90,
      evidenceLinksCount: (caseData.evidence || []).length,
      activeArgumentsCount: petitionerArgs.length,
      petitionerArguments: petitionerArgs.map((a, idx) => ({
        id: a.id || `p_${idx}`,
        title: a.title || 'Legal Claim',
        description: a.description || '',
        supportingEvidence: a.supportingEvidence || [],
        supportingLaws: a.supportingLaws || [],
        supportingTimelineEvents: a.supportingTimelineEvents || [],
        impact: a.impact || 'High',
        category: a.category || 'Legal Claim'
      })),
      respondentArguments: respondentArgs.map((a, idx) => ({
        id: a.id || `d_${idx}`,
        title: a.title || 'Opponent Objection',
        description: a.description || '',
        refutation: a.refutation || 'Our rebuttal',
        impact: a.impact || 'High',
        category: a.category || 'Defense'
      })),
      predictions: predictionsList,
      trialStrategy: {
        sequence: trialSeq,
        avoidList: ci.strategy?.avoidList || [],
        highImpactSubmissions: ci.recommendations || [],
        judicialConcerns: ci.strategy?.judicialConcerns || []
      },
      prepBinder: {
        openingStatement: ci.strategy?.closingSubmission || `Respected Your Honor, presenting claims for ${client} against ${opponent}.`,
        oralArguments: petitionerArgs.map(a => a.title),
        crossExamination: respondentArgs.map(a => `Regarding ${a.title}: Can you verify these facts?`),
        judgeQuestions: (ci.strategy?.judicialConcerns || []).map(q => ({ question: q, answer: "Supported by facts on record." })),
        closingSubmission: ci.strategy?.closingSubmission || "Praying for decree in favor of client."
      }
    };

    // Filter Logic for search
    const filteredPetitioner = strategyData.petitionerArguments.filter(item => {
      if (!argumentsSearchQuery) return true;
      const q = argumentsSearchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || 
             item.description.toLowerCase().includes(q) ||
             item.category.toLowerCase().includes(q) ||
             item.supportingEvidence.some(ev => ev.toLowerCase().includes(q)) ||
             item.supportingLaws.some(l => l.toLowerCase().includes(q));
    });

    const filteredRespondent = strategyData.respondentArguments.filter(item => {
      if (!argumentsSearchQuery) return true;
      const q = argumentsSearchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || 
             item.description.toLowerCase().includes(q) ||
             item.category.toLowerCase().includes(q) ||
             item.refutation.toLowerCase().includes(q);
    });

    const filteredPredictions = strategyData.predictions.filter(item => {
      if (!argumentsSearchQuery) return true;
      const q = argumentsSearchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || 
             item.description.toLowerCase().includes(q) ||
             item.type.toLowerCase().includes(q) ||
             item.rebuttal.toLowerCase().includes(q);
    });

    // Auto-analysis simulator
    const handleAutoAnalyzeArguments = () => {
      setIsAnalyzingArguments(true);
      setActiveArgumentsStep(0);
      
      const steps = [
        "Scanning case documents, timelines, and contract provisions...",
        "Querying local precedent database and applicable Acts...",
        "Formulating primary Petitioner legal claims...",
        "Predicting Opposing Counsel's defense responses and objections...",
        "Mapping evidence vault attachments to argument checkpoints...",
        "Generating step-by-step trial sequencing strategy...",
        "Compiling final Courtroom Prep Binder and judge Q&As..."
      ];
      setArgumentsAnalysisSteps(steps);

      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step < steps.length) {
          setActiveArgumentsStep(step);
        } else {
          clearInterval(interval);
          setIsAnalyzingArguments(false);
          toast.success("AI Courtroom Strategy Engine updated! 🚀");
          // Sync with parent state fields
          handleUpdateField({
            riskLevel: 'Medium',
            criticalVulnerabilities: 'Sec 65B Certificate missing for bank ledger; Noida signing venue vs Delhi jurisdiction.',
            opponentStrategy: 'Opponent will assert signature forgery and contest Delhi jurisdiction based on Noida signing location.',
            strategyRecommendations: 'Focus on Clause 14 (Exclusive Delhi Jurisdiction) and lead with notary witness testimonies.'
          });
        }
      }, 1200);
    };

    // Download/Export helpers
    const handleExportArguments = (type) => {
      const filename = `${caseData.name || 'Case'}_Courtroom_Strategy.${type === 'json' ? 'json' : 'txt'}`;
      let content = `AI COURTROOM STRATEGY REPORT - ${caseData.name || 'Rajesh Sharma vs Amit Verma'}\n`;
      content += `==================================================\n\n`;
      content += `STRENGTH SCORE: ${strategyData.strengthScore}%\n`;
      content += `RESEARCH COMPLETENESS: ${strategyData.completenessScore}%\n\n`;
      content += `I. PETITIONER ARGUMENTS:\n`;
      strategyData.petitionerArguments.forEach(p => {
        content += `- ${p.title}: ${p.description}\n  Evidence: ${p.supportingEvidence.join(', ')}\n  Laws: ${p.supportingLaws.join(', ')}\n\n`;
      });
      content += `II. OPPONENT DEFENSES & REBUTTALS:\n`;
      strategyData.respondentArguments.forEach(d => {
        content += `- Defense: ${d.title}\n  Rebuttal: ${d.refutation}\n\n`;
      });
      content += `III. OPENING STATEMENT:\n${strategyData.prepBinder.openingStatement}\n\n`;
      content += `IV. CROSS EXAMINATION QUESTIONS:\n`;
      strategyData.prepBinder.crossExamination.forEach((q, idx) => {
        content += `${idx + 1}. ${q}\n`;
      });

      if (type === 'json') {
        content = JSON.stringify(strategyData, null, 2);
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setArgumentsExportOpen(false);
      toast.success(`Exported ${type.toUpperCase()} file successfully!`);
    };

    const triggerPrint = () => {
      toast.success("Preparing strategy binder print layout...");
      setTimeout(() => {
        window.print();
      }, 1000);
      setArgumentsExportOpen(false);
    };

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* B. Running Multi-Step AI Analysis Animation */}
        {isAnalyzingArguments && (
          <div className="py-12 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-3 border-indigo-50 border-t-[#6D5DFC] animate-spin" />
              <Sparkles size={14} className="absolute text-[#6D5DFC] animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-widest animate-pulse">
                {argumentsAnalysisSteps[activeArgumentsStep] || "Processing Courtroom Strategy..."}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">
                Step {activeArgumentsStep + 1} of {argumentsAnalysisSteps.length}
              </div>
            </div>
          </div>
        )}

        {/* C. Primary Workspace content */}
        {!isAnalyzingArguments && (
          <>
            {/* 1. Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center font-black text-xs shrink-0">
                  {strategyData.strengthScore}%
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Argument Strength</span>
                  <span className="text-xs font-black text-slate-800">High Win Probability</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#6D5DFC] flex items-center justify-center font-black text-xs shrink-0">
                  {strategyData.completenessScore}%
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Research Coverage</span>
                  <span className="text-xs font-black text-slate-800">Precedents Synced</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
                <div className="w-10 h-10 rounded-lg bg-indigo-50/50 text-[#6D5DFC] flex items-center justify-center font-black text-xs shrink-0">
                  {strategyData.evidenceLinksCount}
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Evidence Maps</span>
                  <span className="text-xs font-black text-slate-800">Files Connected</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 shadow-xxs">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center font-black text-xs shrink-0">
                  {strategyData.activeArgumentsCount}
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Submissions</span>
                  <span className="text-xs font-black text-slate-800">Auto-Generated</span>
                </div>
              </div>
            </div>

            {/* 2. Strategy Sub-tabs and Global Actions Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap gap-1 bg-slate-100 p-0.5 rounded-lg">
                {[
                  { id: 'dashboard', name: 'Dashboard' },
                  { id: 'petitioner', name: 'Petitioner (Plaintiff)' },
                  { id: 'respondent', name: 'Respondent (Defendant)' },
                  { id: 'opponent', name: 'Opponent Predictions' },
                  { id: 'strategy', name: 'AI Sequencing' },
                  { id: 'preparation', name: 'Prep Binder' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setArgumentsActiveSubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                      argumentsActiveSubTab === tab.id
                        ? 'bg-white text-slate-900 shadow-xxs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 relative">
                <button
                  onClick={handleAutoAnalyzeArguments}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#6D5DFC] border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xxs"
                  title="Regenerate arguments based on updated case parameters"
                >
                  <Sparkles size={11} /> Auto-Analyze & Sync
                </button>
                <button
                  onClick={() => setIsPreparingHearing(true)}
                  className="px-3.5 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Gavel size={11} /> Prepare For Hearing
                </button>
                
                {/* Export Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setArgumentsExportOpen(!argumentsExportOpen)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-xxs"
                  >
                    <Download size={11} /> More <ChevronDown size={11} />
                  </button>
                  {argumentsExportOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <button 
                        onClick={() => handleExportArguments('txt')} 
                        className="w-full text-left px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText size={12} className="text-slate-400" /> Export Text Notes
                      </button>
                      <button 
                        onClick={() => handleExportArguments('json')} 
                        className="w-full text-left px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileDigit size={12} className="text-slate-400" /> Export JSON Profile
                      </button>
                      <button 
                        onClick={triggerPrint} 
                        className="w-full text-left px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Printer size={12} className="text-slate-400" /> Print Strategy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Sub-tab Views */}
            
            {/* SUBTAB: Dashboard Overview */}
            {argumentsActiveSubTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="lg:col-span-2 space-y-6">
                  {/* Card: Strategic Trial Status */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Trial Strategy Position</h3>
                      <span className="px-2.5 py-1 bg-indigo-50 text-[#6D5DFC] rounded-lg text-[9px] font-bold uppercase tracking-wider">Advocate Core Draft</span>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        The primary legal objective is to secure a swift summary decree under CPC Order 37. The case rests on the notarized contract deed and undisputed transaction logs. The defense signature forgery plea is a procedural delaying tactic.
                      </p>
                      <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex gap-3">
                        <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[10px] font-black text-[#D97706] uppercase tracking-wider">Critical Weakness Warning</h4>
                          <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                            {caseData.criticalVulnerabilities || "Section 65B compliance Certificate is missing for HDFC transaction ledgers. Prepare and annex this concurrently to prevent defense objections."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Core Arguments Checklist */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Core Arguments Roster</h3>
                    <div className="space-y-3">
                      {strategyData.petitionerArguments.map((item, idx) => (
                        <div key={idx} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl flex items-start justify-between gap-4 transition-colors">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 bg-indigo-50 text-[#6D5DFC] rounded text-[8px] font-bold uppercase tracking-wide">Arg {idx+1} • {item.category}</span>
                            <h4 className="text-xs font-bold text-slate-800 mt-1">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                            item.impact === 'Critical' ? 'bg-red-100 text-red-700' :
                            item.impact === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-650'
                          }`}>
                            {item.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Card: Evidence Mapping Integrity */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Evidence Mapping Coverage</h3>
                    <div className="space-y-3">
                      {[
                        { title: "Contract Execution Proof", status: "Linked", detail: "Loan Deed Ex. P-1" },
                        { title: "Deficit Proof / Bank statement", status: "Linked", detail: "HDFC Ledger Ex. P-2" },
                        { title: "Legal notice dispatch proof", status: "Linked", detail: "Postal Slip Ex. P-3" },
                        { title: "Notary Public Attestation", status: "Linked", detail: "Witness Suresh Kumar" },
                        { title: "Jurisdiction validation check", status: "Verified", detail: "Contract Clause 14" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{item.title}</span>
                            <span className="block text-[9px] text-slate-400 font-medium">{item.detail}</span>
                          </div>
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wide shrink-0">
                            <Check size={10} /> {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card: Predicted Defenses Probability */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Objections Probability</h3>
                    <div className="space-y-4">
                      {strategyData.predictions.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-800">{item.title}</span>
                            <span className="font-black text-indigo-600">{item.probability}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#6D5DFC] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${item.probability}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => setArgumentsActiveSubTab('opponent')} 
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 transition-colors mt-2"
                      >
                        View Defense Strategy Prediction
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: Petitioner Submissions */}
            {argumentsActiveSubTab === 'petitioner' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs animate-in fade-in duration-200 space-y-6">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Petitioner / Plaintiff Submissions</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Core legal arguments generated automatically from active case documents.</p>
                </div>

                {filteredPetitioner.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold">No arguments match your search criteria.</div>
                ) : (
                  <div className="space-y-6">
                    {filteredPetitioner.map((item, idx) => (
                      <div key={item.id} className="border border-slate-150 rounded-xl p-5 hover:border-slate-300 transition-colors space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-indigo-50 text-[#6D5DFC] rounded text-[8px] font-bold uppercase tracking-wider block w-fit">{item.category}</span>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-2">{item.title}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            item.impact === 'Critical' ? 'bg-red-100 text-red-700' :
                            item.impact === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-650'
                          }`}>
                            {item.impact} Impact
                          </span>
                        </div>

                        <p className="text-xs text-slate-650 font-medium leading-relaxed">{item.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-50 text-[10px]">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Supporting Evidence</span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.supportingEvidence.map((ev, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md font-semibold flex items-center gap-1 shadow-xxs">
                                  <FileText size={10} className="text-slate-450" /> {ev}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Applicable Acts</span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.supportingLaws.map((l, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-md font-semibold flex items-center gap-1">
                                  <BookOpen size={10} className="text-indigo-400" /> {l}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Timeline Milestone</span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.supportingTimelineEvents.map((t, i) => (
                                <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-250/50 text-amber-800 rounded-md font-semibold flex items-center gap-1">
                                  <Clock size={10} className="text-amber-500" /> {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: Respondent Submissions */}
            {argumentsActiveSubTab === 'respondent' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs animate-in fade-in duration-200 space-y-6">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Respondent / Defendant Arguments Mapping</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">AI-predicted defense arguments and our legal counter-strategies.</p>
                </div>

                {filteredRespondent.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold">No items match your search.</div>
                ) : (
                  <div className="space-y-6">
                    {filteredRespondent.map((item, idx) => (
                      <div key={item.id} className="border border-slate-150 rounded-xl p-5 hover:border-slate-300 transition-colors space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-bold uppercase tracking-wider block w-fit">{item.category}</span>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-2">Predicted: {item.title}</h4>
                          </div>
                          <span className="px-2 py-0.5 bg-rose-55 rounded text-[8px] font-bold uppercase text-rose-700 bg-rose-50">
                            {item.impact} Defense
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-medium italic bg-slate-50 border border-slate-100 rounded-lg p-3">
                          &quot;{item.description}&quot;
                        </p>

                        <div className="bg-indigo-50/30 border border-indigo-100/60 rounded-xl p-4">
                          <span className="text-[8px] font-black text-[#6D5DFC] uppercase tracking-widest block mb-2">Our Rebuttal Strategy</span>
                          <p className="text-xs text-indigo-950 font-bold leading-relaxed">{item.refutation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: Opponent Predictions */}
            {argumentsActiveSubTab === 'opponent' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs animate-in fade-in duration-200 space-y-6">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Defense Predictions & Rebuttals</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Pre-emptive counters against procedural, jurisdictional, or merit challenges.</p>
                </div>

                {filteredPredictions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold">No predicted challenges match your query.</div>
                ) : (
                  <div className="space-y-6">
                    {filteredPredictions.map((item, idx) => (
                      <div key={item.id} className="border border-slate-150 rounded-xl p-5 hover:border-slate-350 transition-colors space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] font-bold uppercase tracking-wider">{item.type}</span>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-2">{item.title}</h4>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 block">AI Probability</span>
                            <span className="text-xs font-black text-[#6D5DFC]">{item.probability}% Confidence</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.description}</p>

                        <div className="space-y-3 pt-3 border-t border-slate-50">
                          <div>
                            <span className="text-[8px] font-black text-[#6D5DFC] uppercase tracking-widest block mb-1">Legal Rebuttal Protocol</span>
                            <p className="text-xs text-slate-850 font-bold leading-relaxed">{item.rebuttal}</p>
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Suggested Court Wording</span>
                              <p className="text-xs text-slate-800 font-bold italic leading-relaxed">
                                &quot;Your Honor, the objection raised by the opponent lacks merit as governed under the explicit mandate of the Act...&quot;
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("Your Honor, the objection raised by the opponent lacks merit as governed under the explicit mandate of the Act...");
                                toast.success("Court wording copied!");
                              }}
                              className="p-1.5 bg-white border border-slate-200 text-slate-450 hover:text-[#6D5DFC] hover:border-[#6D5DFC] rounded shadow-xxs transition-all shrink-0"
                              title="Copy Wording"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: AI trial sequencing */}
            {argumentsActiveSubTab === 'strategy' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="lg:col-span-2 space-y-6">
                  {/* Sequence timeline */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Courtroom Sequence Timeline</h3>
                    <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                      {strategyData.trialStrategy.sequence.map((item, idx) => (
                        <div key={idx} className="relative pl-8 flex gap-4">
                          <div className="absolute left-[3px] top-[3.5px] w-[15.5px] h-[15.5px] rounded-full bg-white border-2 border-[#6D5DFC] flex items-center justify-center font-bold text-[8px] text-[#6D5DFC]">
                            {item.step}
                          </div>
                          <div>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-[#6D5DFC] rounded text-[8px] font-bold uppercase tracking-wider">{item.status} Focus</span>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-1">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Avoid arguments */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-1">
                      <AlertTriangle size={12} /> Arguments to Avoid
                    </h3>
                    <ul className="space-y-3">
                      {strategyData.trialStrategy.avoidList.map((item, i) => (
                        <li key={i} className="text-xs text-rose-900 font-medium leading-relaxed flex items-start gap-2">
                          <span className="text-rose-500">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Judicial Queries Predicted */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs">
                    <h3 className="text-xs font-black text-[#6D5DFC] uppercase tracking-widest mb-4">Judicial Concerns Predicted</h3>
                    <div className="space-y-3">
                      {strategyData.trialStrategy.judicialConcerns.map((item, i) => (
                        <div key={i} className="p-3 bg-indigo-50/30 border border-indigo-100/40 rounded-xl text-xs text-indigo-950 font-bold leading-relaxed">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: Prep Binder */}
            {argumentsActiveSubTab === 'preparation' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xxs animate-in fade-in duration-200 space-y-6">
                <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Court Preparation Binder</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">One-click legal documents compiled for oral presentation and trial hearings.</p>
                  </div>
                  <button
                    onClick={() => handleExportArguments('txt')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 shadow-xxs"
                  >
                    <Download size={10} /> Download Dossier
                  </button>
                </div>

                <div className="space-y-6 max-w-4xl font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl p-6 shadow-xxs leading-relaxed">
                  <div className="border-b border-dashed border-slate-200 pb-4 mb-4 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CONFIDENTIAL TRIAL DOSSIER</span>
                    <h2 className="text-xs font-black text-[#6D5DFC] mt-1">AI STRATEGY COURT Preparation BINDER</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <strong className="text-[#6D5DFC] uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1 mb-2">1. Opening Statement Statement</strong>
                      <p className="text-slate-700 bg-white border border-slate-150 rounded-lg p-3 whitespace-pre-line font-sans font-medium text-[11px] leading-relaxed">
                        {strategyData.prepBinder.openingStatement}
                      </p>
                    </div>

                    <div>
                      <strong className="text-[#6D5DFC] uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1 mb-2">2. Oral Argument Outlines</strong>
                      <ul className="list-decimal list-inside space-y-2 pl-2 text-[11px] font-sans font-medium text-slate-700">
                        {strategyData.prepBinder.oralArguments.map((arg, idx) => (
                          <li key={idx} className="leading-relaxed bg-white border border-slate-100 rounded p-2">{arg}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong className="text-[#6D5DFC] uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1 mb-2">3. Cross-Examination of Defending Witness</strong>
                      <ul className="list-decimal list-inside space-y-2 pl-2 text-[11px] font-sans font-medium text-slate-750">
                        {strategyData.prepBinder.crossExamination.map((q, idx) => (
                          <li key={idx} className="leading-relaxed bg-white border border-slate-100 rounded p-2 font-semibold italic text-indigo-950">&quot;{q}&quot;</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong className="text-[#6D5DFC] uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1 mb-2">4. Predicted Court / Judge Queries & Best Answers</strong>
                      <div className="space-y-3 font-sans font-medium">
                        {strategyData.prepBinder.judgeQuestions.map((q, idx) => (
                          <div key={idx} className="bg-white border border-slate-150 rounded-lg p-3.5 space-y-1.5">
                            <span className="block text-[10px] font-bold text-amber-700 uppercase">Q: {q.question}</span>
                            <span className="block text-[11px] text-slate-700 font-semibold leading-relaxed">A: {q.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* D. Full Page Slide Over Prepare for Hearing Drawer */}
        {isPreparingHearing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
            <div className="bg-white border-l border-slate-200 w-full max-w-3xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-[#6D5DFC] rounded-xl">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Advocate Hearing Preparation Workspace</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Strategy Dossier • Live Compiled</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExportArguments('txt')}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xxs"
                    title="Download Dossier"
                  >
                    <Download size={11} /> Download
                  </button>
                  <button 
                    onClick={triggerPrint}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xxs"
                    title="Print Dossier"
                  >
                    <Printer size={11} /> Print
                  </button>
                  <button 
                    onClick={() => setIsPreparingHearing(false)} 
                    className="text-slate-400 hover:text-slate-650 transition-colors p-1"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-8 overflow-y-auto bg-[#FCFDFE] flex-1 custom-scrollbar min-h-0 space-y-6">
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 flex gap-3 shadow-xxs">
                  <Check size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Hearing Preparation Dossier Generated Successfully</h4>
                    <p className="text-xs text-emerald-900 font-semibold mt-0.5 leading-relaxed">
                      All timeline details, evidence tags, research citations, and contract clauses are synchronized. Print or export this compiled brief to bring into the courtroom.
                    </p>
                  </div>
                </div>

                {/* Notion Style Prepared Content */}
                <div className="space-y-6">
                  {/* Section 1: Opening Statement */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ChevronRight size={12} /> Opening Statement Script
                    </h4>
                    <p className="text-xs text-slate-750 font-semibold bg-slate-50/80 border border-slate-150 rounded-xl p-4 leading-relaxed whitespace-pre-line">
                      {strategyData.prepBinder.openingStatement}
                    </p>
                  </div>

                  {/* Section 2: Oral Submission Notes */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ChevronRight size={12} /> Key Oral Submissions (CPC Order 37 Summary procedure)
                    </h4>
                    <div className="space-y-3 pl-2">
                      {strategyData.prepBinder.oralArguments.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="text-indigo-600 font-bold font-mono text-xs">{idx + 1}.</span>
                          <div className="text-xs text-slate-800 font-bold">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Cross Examination Questions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ChevronRight size={12} /> Cross-Examination of Defending Witness
                    </h4>
                    <div className="space-y-3 pl-2">
                      {strategyData.prepBinder.crossExamination.map((q, idx) => (
                        <div key={idx} className="flex gap-3 bg-white border border-slate-100 rounded-lg p-3 shadow-xxs">
                          <span className="text-rose-500 font-bold font-mono text-xs">{idx + 1}.</span>
                          <div className="text-xs text-slate-900 font-bold italic font-mono leading-relaxed">&quot;{q}&quot;</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Predictions of Judge Questions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ChevronRight size={12} /> Predicted Judicial Queries & Response Strategy
                    </h4>
                    <div className="space-y-4">
                      {strategyData.prepBinder.judgeQuestions.map((q, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-2 shadow-xxs">
                          <div className="flex gap-2">
                            <span className="text-amber-600 font-bold uppercase text-[9px] shrink-0">JUDGE:</span>
                            <p className="text-xs text-slate-800 font-black leading-relaxed">{q.question}</p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-slate-200/60 border-dashed">
                            <span className="text-[#6D5DFC] font-bold uppercase text-[9px] shrink-0">REACTION:</span>
                            <p className="text-xs text-slate-650 font-bold leading-relaxed">{q.answer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Closing submissions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#6D5DFC] uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ChevronRight size={12} /> Closing Arguments Brief
                    </h4>
                    <p className="text-xs text-slate-700 font-semibold bg-slate-55 border border-slate-150 rounded-xl p-4 leading-relaxed font-sans">
                      {strategyData.prepBinder.closingSubmission}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStrategy = () => {
    const handleAnalyze = () => {
      const tid = toast.loading("Analyzing case files and precedents...");
      setTimeout(() => {
        handleUpdateField({
          riskLevel: 'Medium',
          criticalVulnerabilities: 'Missing explicit vendor indemnity clause; Gap in contract dates.',
          opponentStrategy: 'Opponent will likely rely on technical delay exceptions under Section 10.',
          strategyRecommendations: 'Draft and submit a motion to expedite the proceedings and cite the Landmark precedence of State vs Patel.'
        });
        toast.success("Case strategy analyzed and updated! ✅", { id: tid });
      }, 2000);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider">Advocate Case Strategy Engine</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">Generate vulnerability and risk mapping based on case assets.</p>
          </div>
          <button 
            onClick={handleAnalyze} 
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
          >
            Auto-Analyze
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Case Risk Profile</span>
            <div className={`text-2xl font-black mt-2 uppercase tracking-wide ${
              caseData.riskLevel === 'High' ? 'text-red-500' :
              caseData.riskLevel === 'Low' ? 'text-emerald-500' :
              'text-amber-500'
            }`}>
              {caseData.riskLevel || 'Medium Risk'}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-2">Win margins fluctuate depending on upcoming evidence admissibility.</p>
          </div>

          <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Critical Weaknesses</span>
              <p className="text-xs text-[#111827] font-bold mt-1 leading-relaxed">
                {caseData.criticalVulnerabilities || 'No vulnerabilities detected yet. Trigger Auto-Analyze to map out case weaknesses.'}
              </p>
            </div>
            
            <div className="border-t border-slate-100 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Predicted Opponent Defense Strategy</span>
              <p className="text-xs text-[#111827] font-bold mt-1 leading-relaxed">
                {caseData.opponentStrategy || 'Opponent strategies remain unmapped.'}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC]">Recommended Action Items</span>
              <p className="text-xs text-indigo-700 font-bold mt-1 leading-relaxed">
                {caseData.strategyRecommendations || 'Compile precedents and facts to get strategic recommendations.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrediction = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-6">Outcome Estimator & Strengths</h3>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Win Probability Estimation</span>
                <span className="text-sm font-black text-[#10B981]">{caseData.winProbability || 50}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={caseData.winProbability || 50} 
                onChange={e => handleUpdateField({ winProbability: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#10B981]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Case Strength Score</span>
                <span className="text-sm font-black text-indigo-600">{caseData.strengthScore || 50}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={caseData.strengthScore || 50} 
                onChange={e => handleUpdateField({ strengthScore: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    const handleAddTask = () => {
      if (!newTask.title) return;
      const list = caseData.tasks || [];
      handleUpdateField({ tasks: [...list, { ...newTask, status: 'Pending' }] });
      setNewTask({ title: '', priority: 'Medium', deadline: '' });
      toast.success("Task created!");
    };

    const handleDeleteTask = (idx) => {
      const list = [...(caseData.tasks || [])];
      list.splice(idx, 1);
      handleUpdateField({ tasks: list });
      toast.success("Task deleted");
    };

    const handleToggleTask = (idx) => {
      const list = [...(caseData.tasks || [])];
      list[idx].status = list[idx].status === 'Completed' ? 'Pending' : 'Completed';
      handleUpdateField({ tasks: list });
      toast.success(`Task marked ${list[idx].status.toLowerCase()}`);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Add Task Step</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Task Title (e.g. Draft written response)" 
              value={newTask.title} 
              onChange={e => setNewTask({ ...newTask, title: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            />
            <select 
              value={newTask.priority} 
              onChange={e => setNewTask({ ...newTask, priority: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Urgent">Urgent Priority</option>
            </select>
            <button 
              onClick={handleAddTask} 
              className="bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors"
            >
              Add Step
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Process Tracker Checklist</h3>
          {caseData.tasks && caseData.tasks.length > 0 ? (
            <div className="space-y-3">
              {caseData.tasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl group">
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      onClick={() => handleToggleTask(i)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        task.status === 'Completed' 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-200 bg-white hover:border-indigo-400'
                      }`}
                    >
                      {task.status === 'Completed' && <Check size={12} />}
                    </button>
                    <div>
                      <p className={`text-xs font-extrabold text-slate-800 ${task.status === 'Completed' ? 'line-through opacity-50' : ''}`}>{task.title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border mt-1 inline-block ${
                        task.priority === 'Urgent' || task.priority === 'High' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTask(i)} className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#9CA3AF] font-bold">No tasks logged. Track deadlines by adding them above.</div>
          )}
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    const handleSaveNotes = () => {
      handleUpdateField({ notes: caseData.notes });
      toast.success("Notes saved!");
    };

    return (
      <div className="max-w-4xl mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider">Rich Text Note-Taking Pad</h3>
          <button 
            onClick={handleSaveNotes}
            className="px-4 py-2 bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Save Notes
          </button>
        </div>
        <textarea
          value={caseData.notes || ''}
          onChange={e => setCaseData({ ...caseData, notes: e.target.value })}
          rows={15}
          placeholder="Jot down argument structures, client facts, meeting minutes or research citations here..."
          className="w-full border border-[#E5E7EB] rounded-xl p-5 text-sm font-medium focus:outline-none focus:border-[#6D5DFC]"
        />
      </div>
    );
  };

  const renderActivity = () => {
    const handleAddActivity = () => {
      if (!newActivity.title) return;
      const list = caseData.activity || [];
      handleUpdateField({ 
        activity: [...list, { ...newActivity, date: new Date().toLocaleDateString() }] 
      });
      setNewActivity({ type: 'Call', title: '', notes: '' });
      toast.success("Activity logged!");
    };

    const handleDeleteActivity = (idx) => {
      const list = [...(caseData.activity || [])];
      list.splice(idx, 1);
      handleUpdateField({ activity: list });
      toast.success("Activity deleted");
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Log Communication Audit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select 
              value={newActivity.type} 
              onChange={e => setNewActivity({ ...newActivity, type: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            >
              <option value="Call">Call Log</option>
              <option value="Email">Email Sent/Received</option>
              <option value="Meeting">Advocate Meeting</option>
              <option value="Court Hearing">Court Attendance</option>
            </select>
            <input 
              type="text" 
              placeholder="Action Summary (e.g. Call with Client)" 
              value={newActivity.title} 
              onChange={e => setNewActivity({ ...newActivity, title: e.target.value })} 
              className="border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#6D5DFC]"
            />
            <button 
              onClick={handleAddActivity} 
              className="bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors"
            >
              Log Log
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider mb-4">Communication Audit Log</h3>
          {caseData.activity && caseData.activity.length > 0 ? (
            <div className="space-y-3">
              {caseData.activity.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-extrabold text-[#111827]">{item.title}</p>
                      <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-100 text-[#6D5DFC]">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Logged {item.date}</p>
                  </div>
                  <button onClick={() => handleDeleteActivity(i)} className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#9CA3AF] font-bold">No activity history logged. Trace client phone calls here.</div>
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#111827] uppercase tracking-wider">Configure Case Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Case ID/No.</label>
              <input 
                type="text" 
                value={caseData.caseNumber || ''} 
                onChange={e => handleUpdateField({ caseNumber: e.target.value })} 
                placeholder="CN-2026-981"
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Status</label>
              <select 
                value={caseData.status || 'Active'} 
                onChange={e => handleUpdateField({ status: e.target.value })} 
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] mt-1"
              >
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Priority</label>
              <select 
                value={caseData.priority || 'Medium'} 
                onChange={e => handleUpdateField({ priority: e.target.value })} 
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] mt-1"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Current Legal Stage</label>
              <input 
                type="text" 
                value={caseData.stage || ''} 
                onChange={e => handleUpdateField({ stage: e.target.value })} 
                placeholder="Pleadings Stage"
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] mt-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-red-600 uppercase tracking-wider">Danger Zone</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold text-slate-800">Archive or Delete Folder</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Archive puts the case in storage, deletion permanently destroys files.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const newStatus = caseData.status === 'Archived' ? 'Active' : 'Archived';
                  handleUpdateField({ status: newStatus });
                  toast.success(`Case marked as ${newStatus}`);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-extrabold hover:bg-slate-50"
              >
                {caseData.status === 'Archived' ? 'Restore Case' : 'Archive Case'}
              </button>
              <button 
                onClick={() => handleDeleteCase(caseData._id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold"
              >
                Delete Case
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Trigger JSON/Text export of Case Metadata Summary
  const handleExportSummary = () => {
    const summaryData = {
      CaseName: caseData.name,
      Client: caseData.clientName,
      Opponent: caseData.accused || caseData.opponentName,
      Court: caseData.courtName || 'N/A',
      Judge: caseData.judgeName || 'N/A',
      CaseNumber: caseData.caseNumber || 'N/A',
      Stage: caseData.stage || 'N/A',
      Status: caseData.status || 'Active',
      Priority: caseData.priority || 'Medium',
      Summary: caseData.summary || caseData.caseSummary || 'No summary',
      TimelineEventsCount: caseData.timeline?.length || 0,
      UpcomingHearingsCount: caseData.hearings?.filter(h => h.status === 'Upcoming').length || 0,
      EvidenceCount: caseData.evidence?.length || 0
    };

    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseData.name.replace(/\s+/g, '_')}_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Case profile exported!");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-hidden select-text">
      {/* ─── Case Workspace Header ─── */}
      <header className="border-b border-[#E5E7EB] bg-white shrink-0 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToDashboard}
              className="p-2.5 hover:bg-[#F9FAFB] rounded-xl text-slate-500 hover:text-slate-800 transition-colors border border-[#E5E7EB] shadow-sm flex items-center justify-center"
              title="Back to Cases"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {caseData.name}
                </h2>
                <div className="flex gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                    caseData.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    caseData.status === 'Closed' ? 'bg-slate-100 text-[#6B7280] border-slate-200' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {caseData.status || 'Active'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                    caseData.priority === 'Urgent' || caseData.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    caseData.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {caseData.priority || 'Medium'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1.5 flex items-center gap-2">
                <span>Client: <strong>{caseData.clientName || 'Private'}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>Opponent: <strong>{caseData.accused || caseData.opponentName || 'Unknown'}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>Court: <strong>{caseData.courtName || 'District Court'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {aiPanel && (
              <button 
                onClick={() => setIsAiPanelExpanded(!isAiPanelExpanded)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm flex items-center gap-1.5 ${
                  isAiPanelExpanded 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/80' 
                    : 'hover:bg-[#F9FAFB] text-slate-700 hover:text-slate-900 border-[#E5E7EB]'
                }`}
              >
                <Sparkles size={13} className={isAiPanelExpanded ? 'text-indigo-600' : 'text-slate-500'} />
                {isAiPanelExpanded ? 'Hide AI' : 'Show AI'}
              </button>
            )}
            <button 
              onClick={handleExportSummary}
              className="px-3.5 py-2 hover:bg-[#F9FAFB] rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors border border-[#E5E7EB] shadow-sm flex items-center gap-1.5"
            >
              <Download size={13} /> Export
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Secure sharing link copied to clipboard!");
              }}
              className="px-3.5 py-2 hover:bg-[#F9FAFB] rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors border border-[#E5E7EB] shadow-sm flex items-center gap-1.5"
            >
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>
      </header>

      {/* ─── Case-Bound Navigation Tabs ─── */}
      <nav className="shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-2 overflow-x-auto hide-scrollbar flex gap-1.5">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 shrink-0 select-none ${
                isActive 
                  ? 'bg-white border border-[#E5E7EB] text-[#6D5DFC] shadow-sm' 
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/30'
              }`}
            >
              <t.icon size={13} className={isActive ? 'text-[#6D5DFC]' : 'text-[#9CA3AF]'} />
              <span>{t.name}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── Active Content Panel and Side AI Panel ─── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <main className="flex-1 p-6 bg-[#FCFDFE] overflow-y-auto custom-scrollbar min-w-0">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'hearings' && renderHearings()}
          {activeTab === 'parties' && renderParties()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'evidence' && renderEvidence()}
          {activeTab === 'research' && renderResearch()}
          {activeTab === 'drafts' && renderDrafts()}
          {activeTab === 'contracts' && renderContracts()}
          {activeTab === 'arguments' && renderArguments()}
          {activeTab === 'strategy' && renderStrategy()}
          {activeTab === 'prediction' && renderPrediction()}
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'notes' && renderNotes()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'settings' && renderSettings()}
        </main>

        {isAiPanelExpanded && aiPanel && (
          <>
            {isAiPanelFullscreen && (
              <div 
                className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-30 transition-opacity duration-300 animate-in fade-in cursor-pointer"
                onClick={() => setIsAiPanelFullscreen(false)}
              />
            )}
            <aside 
              className={`transition-all duration-300 ease-in-out border-l border-[#E5E7EB] bg-white flex flex-col shrink-0 min-h-0 ${
                isAiPanelFullscreen 
                  ? 'fixed inset-0 z-40 w-full shadow-2xl scale-100 opacity-100'
                  : 'w-[380px] z-10 relative'
              }`}
            >
              {aiPanel}
            </aside>
          </>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 text-[#6D5DFC] rounded-lg">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{previewDoc.name}</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{previewDoc.size || '1 KB'} • Uploaded {previewDoc.date || new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(
                      previewDoc.name === "Rajesh_Sharma_vs_Amit_Verma_CaseJourney.txt"
                        ? `CASE JOURNEY REPORT\nClient: Rajesh Sharma\nOpponent: Amit Verma\n\nGenerated on: 6/17/2026\n\n1. Suit for Recovery of Money Filed: 10/12/2025\n2. Summon Issued to Defendant: 15/12/2025\n3. Written Statement Filed by Defendant: 12/01/2026\n4. Issues Framed by the Honorable Court: 05/02/2026\n5. Plaintiff Evidence Filed (Ex. PW-1): 18/03/2026\n6. Cross Examination of Plaintiff Witness: 24/04/2026\n7. Next Hearing Date (Final Arguments): 15/07/2026\n`
                        : `DOCUMENT CONTENT PREVIEW\nFile: ${previewDoc.name}\nState of litigation case folder content.\n`
                    );
                    toast.success("Document text copied to clipboard!");
                  }}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xxs"
                  title="Copy Document Text"
                >
                  <Copy size={11} /> Copy Text
                </button>
                <button 
                  onClick={() => toast.success("Drafting print version of this filing...")}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xxs"
                  title="Print Document"
                >
                  <Printer size={11} /> Print
                </button>
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-[#FCFDFE] flex-1 custom-scrollbar min-h-0 text-xs">
              {previewDoc.name === "Rajesh_Sharma_vs_Amit_Verma_CaseJourney.txt" ? (
                <div className="space-y-4 font-mono text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl p-5 leading-relaxed shadow-xxs">
                  <div className="border-b border-dashed border-slate-200 pb-3 mb-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI LEGAL SYSTEM REPORT</span>
                    <h2 className="text-xs font-black text-[#6D5DFC] mt-1">CASE JOURNEY CHRONOLOGY METADATA</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 pb-3 border-b border-dashed border-slate-200">
                    <div><strong>CLIENT:</strong> Rajesh Sharma</div>
                    <div><strong>OPPONENT:</strong> Amit Verma</div>
                    <div><strong>COURT:</strong> Delhi District Court</div>
                    <div><strong>DATE EXPORTED:</strong> 6/17/2026</div>
                  </div>
                  
                  <div className="space-y-3 pt-3">
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">10/12/2025</span>
                      <div>
                        <strong>[FILING]</strong> Recovery suit initiated by Complainant. Signed agreement annexed.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">15/12/2025</span>
                      <div>
                        <strong>[SUMMONS]</strong> Summons served on defendant Amit Verma. Recipient signed acknowledgment.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">12/01/2026</span>
                      <div>
                        <strong>[STATEMENT]</strong> Written Statement filed by defense raising limitation period objection.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">05/02/2026</span>
                      <div>
                        <strong>[ISSUES]</strong> Issues framed: Maintainability under limitation and admissibility of electronic chats.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">18/03/2026</span>
                      <div>
                        <strong>[EVIDENCE]</strong> Affidavit in Evidence filed by plaintiff Rajesh Sharma as Exhibit PW-1.
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-indigo-600 font-bold shrink-0">24/04/2026</span>
                      <div>
                        <strong>[HEARING]</strong> Cross-examination of PW-1 completed. Reserved for final arguments.
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-200 pt-3 mt-4 text-[10px] text-slate-400 text-center">
                    *** End of Case Chronology Transcript ***
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-serif text-slate-800 bg-white border border-slate-200 rounded-xl p-6 shadow-xxs max-w-lg mx-auto leading-relaxed">
                  <div className="text-center font-bold pb-4 border-b border-slate-200">
                    <h2 className="text-sm">BEFORE THE HON&apos;BLE DISTRICT COURT AT NEW DELHI</h2>
                    <p className="text-[10px] tracking-wide text-slate-500 mt-1">CIVIL ORIGINAL JURISDICTION</p>
                    <p className="text-[10px] mt-2 font-mono text-slate-700">SUIT NO. CS(COMM)/9746 OF 2026</p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold py-2 border-b border-slate-100">
                    <div>RAJESH SHARMA</div>
                    <div className="text-slate-400 font-normal">...PLAINTIFF</div>
                  </div>
                  <div className="text-center text-[10px] font-bold text-slate-400 my-1">VERSUS</div>
                  <div className="flex justify-between items-center text-[10px] font-bold py-2 border-b border-slate-100 pb-3">
                    <div>AMIT VERMA</div>
                    <div className="text-slate-400 font-normal">...DEFENDANT</div>
                  </div>

                  <div className="space-y-3 pt-3 text-[11px]">
                    <h4 className="font-bold text-center underline">PLAINT UNDER ORDER VII RULE 1 CPC FOR DEBT RECOVERY</h4>
                    <p className="indent-8 text-justify">1. The Plaintiff is a registered merchant supplying wholesale hardware supplies. The Defendant is a contractor who engaged the Plaintiff for procurement of building materials.</p>
                    <p className="indent-8 text-justify">2. On 14th June 2025, the Defendant placed a signed Purchase Order for materials worth INR 14,50,000. Invoices were raised with a 30-day clearing window.</p>
                    <p className="indent-8 text-justify">3. Despite delivery confirmation sheets, the Defendant failed to settle the ledger balance. Defendant digitally acknowledged outstanding liability on email dated 15th October 2025.</p>
                    <p className="indent-8 text-justify">4. The cause of action arose within the territorial limits of this Honorable Court, and the suit is well within the limitation period.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button 
                onClick={() => setPreviewDoc(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
