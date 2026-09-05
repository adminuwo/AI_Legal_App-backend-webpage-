import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Building, Phone, Mail, MapPin, Scale, Gavel, Users, FileText, 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Shield, AlertCircle, Plus, Trash2,
  Mic, MicOff, Edit2, Calendar, Briefcase, Search, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../../services/apiService';

const CATEGORIES = [
  'Civil', 'Criminal', 'Corporate', 'Family', 'Labour', 
  'Property', 'Tax', 'Banking', 'Arbitration', 'Miscellaneous'
];

const CLIENT_TYPES = ['Individual', 'Company', 'Government', 'NGO', 'Startup', 'Partnership'];
const OPPONENT_ROLES = ['Defendant', 'Respondent', 'Opposite Party', 'Accused', 'Appellant', 'Other'];
const ADDITIONAL_PARTY_ROLES = ['Co-Petitioner', 'Co-Plaintiff', 'Co-Respondent', 'Co-Defendant', 'Witness', 'Other'];
const COURT_TYPES = ['District Court', 'High Court', 'Supreme Court', 'Consumer Forum', 'Tribunal', 'Family Court', 'Labour Court', 'Other'];

export const CreateCaseWizardModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice AI Dictation State
  const [isRecording, setIsRecording] = useState(false);

  // STEP 1: Client Information
  const [clientMode, setClientMode] = useState('existing'); // 'existing' | 'new'
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [clientType, setClientType] = useState('Individual');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientPinCode, setClientPinCode] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // STEP 2: Case Information
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('Civil');
  const [caseTypeMode, setCaseTypeMode] = useState('Litigation'); // 'Litigation' | 'Advisory'
  const [priority, setPriority] = useState('High');
  const [status, setStatus] = useState('Active');
  const [caseOverview, setCaseOverview] = useState('');
  const [courtRoomNo, setCourtRoomNo] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  // STEP 3: Assign Team
  const [firmMembers, setFirmMembers] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [leadAdvocate, setLeadAdvocate] = useState('Aditi Lakhera (Firm Owner)');

  // STEP 4: Opponent & Court
  const [oppositeParty, setOppositeParty] = useState('');
  const [opponentRole, setOpponentRole] = useState('Defendant');
  const [opponentMobile, setOpponentMobile] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [opponentAddress, setOpponentAddress] = useState('');
  const [oppositeAdvocate, setOppositeAdvocate] = useState('');
  const [oppositeLawFirm, setOppositeLawFirm] = useState('');
  const [oppositeAdvocateContact, setOppositeAdvocateContact] = useState('');

  // Additional Parties
  const [additionalParties, setAdditionalParties] = useState([]);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRole, setNewPartyRole] = useState('Co-Plaintiff');
  const [newPartyContact, setNewPartyContact] = useState('');

  // Court Details
  const [courtType, setCourtType] = useState('District Court');
  const [courtState, setCourtState] = useState('');
  const [courtDistrict, setCourtDistrict] = useState('');
  const [courtName, setCourtName] = useState('');
  const [cnrNumber, setCnrNumber] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [benchNumber, setBenchNumber] = useState('');
  const [judgeName, setJudgeName] = useState('');

  // Timeline & Brief
  const [incidentDate, setIncidentDate] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [factsSummary, setFactsSummary] = useState('');
  const [reliefSought, setReliefSought] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [firNumber, setFirNumber] = useState('');
  const [firYear, setFirYear] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const [errors, setErrors] = useState({});

  const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';

  // Fetch workspace members for Team Assignment step
  useEffect(() => {
    if (isOpen) {
      const fetchWorkspaceMembers = async () => {
        try {
          const res = await apiService.get(`/workspaces/${activeWsId}/members`);
          const membersList = res?.data?.members || res?.members || res?.data || [];
          if (Array.isArray(membersList)) {
            setFirmMembers(membersList);
          }
        } catch (err) {
          console.warn('[CreateCaseWizardModal] Failed to fetch workspace members:', err);
        }
      };
      fetchWorkspaceMembers();
    }
  }, [isOpen, activeWsId]);

  // Pre-fill existing case details when editing
  useEffect(() => {
    if (isOpen && initialData) {
      setClientType(initialData.clientInfo?.clientType || 'Individual');
      setClientName(initialData.clientName || initialData.clientInfo?.name || '');
      setClientCompany(initialData.clientInfo?.company || '');
      setClientMobile(initialData.clientInfo?.mobile || initialData.clientPhone || '');
      setClientEmail(initialData.clientInfo?.email || initialData.clientEmail || '');
      setClientCity(initialData.clientInfo?.city || initialData.city || '');
      setClientState(initialData.clientInfo?.state || initialData.stateName || '');
      setClientPinCode(initialData.clientInfo?.pinCode || '');
      setClientNotes(initialData.clientInfo?.notes || '');

      setCaseTitle(initialData.name || initialData.title || '');
      setCaseCategory(initialData.caseType || initialData.category || 'Civil');
      setPriority(initialData.priority || 'High');
      setStatus(initialData.status || 'Active');
      setCaseOverview(initialData.summary || initialData.caseSummary || '');

      setOppositeParty(initialData.opponentName || initialData.accused || initialData.oppositeParty || '');
      setOpponentRole(initialData.opponentRole || 'Defendant');
      setOpponentMobile(initialData.opponentPhone || initialData.clientInfo?.opponentMobile || '');
      setOpponentEmail(initialData.opponentEmail || '');
      setOpponentAddress(initialData.opponentAddress || '');
      setOppositeAdvocate(initialData.oppositeAdvocate || '');
      setOppositeLawFirm(initialData.oppositeLawFirm || '');
      setOppositeAdvocateContact(initialData.oppositeAdvocateContact || '');
      setAdditionalParties(initialData.additionalParties || []);

      setCourtType(initialData.courtType || 'District Court');
      setCourtState(initialData.stateName || '');
      setCourtDistrict(initialData.district || '');
      setCourtName(initialData.courtName || '');
      setCnrNumber(initialData.cnrNumber || '');
      setCaseNumber(initialData.caseNumber || '');
      setCourtNumber(initialData.courtNumber || '');
      setBenchNumber(initialData.benchNumber || '');
      setJudgeName(initialData.judgeName || '');

      setIncidentDate(initialData.incidentDate || '');
      setFilingDate(initialData.filingDate || '');
      setNoticeDate(initialData.noticeDate || '');
      setNextHearingDate(initialData.nextHearingDate || '');
      setFactsSummary(initialData.summary || '');
      setReliefSought(initialData.reliefSought || '');
      setPoliceStation(initialData.policeStation || '');
      setFirNumber(initialData.firNumber || '');
      setFirYear(initialData.firYear || '');
      setReferenceNumber(initialData.referenceNumber || '');
    } else if (isOpen && !initialData) {
      resetForm();
    }
  }, [isOpen, initialData]);

  const handleAddParty = () => {
    if (!newPartyName.trim()) return;
    setAdditionalParties(prev => [
      ...prev,
      { id: Date.now().toString(), name: newPartyName.trim(), role: newPartyRole, contact: newPartyContact.trim() }
    ]);
    setNewPartyName('');
    setNewPartyContact('');
  };

  const handleRemoveParty = (id) => {
    setAdditionalParties(prev => prev.filter(p => p.id !== id));
  };

  // Voice AI Intake Dictation
  const handleToggleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        toast.success('🎙️ Listening... Speak case details clearly.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          toast.success('✨ Dictation processed!');
          if (step === 1 && !clientName) {
            setClientName(transcript);
          } else if (step === 2 && !caseTitle) {
            setCaseTitle(transcript);
          } else {
            setCaseOverview(prev => prev ? `${prev}\n${transcript}` : transcript);
          }
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition fail', err);
      setIsRecording(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setErrors({});
    setClientMode('existing');
    setSearchClientQuery('');
    setClientType('Individual');
    setClientName('');
    setClientCompany('');
    setClientMobile('');
    setClientEmail('');
    setClientCity('');
    setClientState('');
    setClientPinCode('');
    setClientNotes('');
    setCaseTitle('');
    setCaseCategory('Civil');
    setCaseTypeMode('Litigation');
    setPriority('High');
    setStatus('Active');
    setCaseOverview('');
    setCourtRoomNo('');
    setIsConfidential(false);
    setOppositeParty('');
    setOpponentRole('Defendant');
    setOpponentMobile('');
    setOpponentEmail('');
    setOpponentAddress('');
    setOppositeAdvocate('');
    setOppositeLawFirm('');
    setOppositeAdvocateContact('');
    setAdditionalParties([]);
    setCourtType('District Court');
    setCourtState('');
    setCourtDistrict('');
    setCourtName('');
    setCnrNumber('');
    setCaseNumber('');
    setCourtNumber('');
    setBenchNumber('');
    setJudgeName('');
    setIncidentDate('');
    setFilingDate('');
    setNoticeDate('');
    setNextHearingDate('');
    setFactsSummary('');
    setReliefSought('');
    setPoliceStation('');
    setFirNumber('');
    setFirYear('');
    setReferenceNumber('');
    setSelectedTeamMembers([]);
  };

  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handleSubmit = async () => {
    const isEditing = Boolean(initialData && (initialData._id || initialData.id));
    const targetId = initialData?._id || initialData?.id;

    const finalClientName = clientName.trim() || 'Client Profile';
    const finalCaseTitle = caseTitle.trim() || (oppositeParty.trim() ? `${finalClientName} vs ${oppositeParty.trim()}` : 'Unspecified Case');

    const activeRole = localStorage.getItem('user_selected_role') || 'advocate';
    const workspaceType = activeRole === 'law_firm' ? 'law_firm' : activeRole === 'student' ? 'student' : 'personal';

    const payload = {
      name: finalCaseTitle,
      clientName: finalClientName,
      role: activeRole,
      workspaceType,
      caseType: caseCategory,
      subType: caseCategory,
      courtName: courtName.trim() || 'District Court',
      courtType,
      stateName: courtState.trim(),
      district: courtDistrict.trim(),
      cnrNumber: cnrNumber.trim(),
      caseNumber: caseNumber.trim(),
      courtNumber: courtRoomNo.trim() || courtNumber.trim(),
      benchNumber: benchNumber.trim(),
      judgeName: judgeName.trim(),
      policeStation: policeStation.trim(),
      firNumber: firNumber.trim(),
      firYear: firYear.trim(),
      referenceNumber: referenceNumber.trim(),
      accused: oppositeParty.trim(),
      opponentName: oppositeParty.trim(),
      opponentRole,
      opponentPhone: opponentMobile.trim(),
      opponentEmail: opponentEmail.trim(),
      opponentAddress: opponentAddress.trim(),
      oppositeAdvocate: oppositeAdvocate.trim(),
      oppositeLawFirm: oppositeLawFirm.trim(),
      oppositeAdvocateContact: oppositeAdvocateContact.trim(),
      additionalParties,
      priority,
      status,
      summary: factsSummary.trim() || caseOverview.trim(),
      reliefSought: reliefSought.trim(),
      incidentDate,
      filingDate,
      noticeDate,
      nextHearingDate,
      isConfidential,
      assignedTeamMembers: selectedTeamMembers,
      isLegalCase: true,
      clientInfo: {
        name: finalClientName,
        mobile: clientMobile.trim(),
        email: clientEmail.trim(),
        company: clientCompany.trim(),
        city: clientCity.trim(),
        state: clientState.trim(),
        pinCode: clientPinCode.trim(),
        address: `${clientCompany ? clientCompany + ', ' : ''}${clientCity} ${clientState} ${clientPinCode}`.trim(),
        clientType,
        notes: clientNotes.trim()
      }
    };

    const tid = toast.loading(isEditing ? 'Updating Case Folder...' : 'Creating Case Workspace...');
    setIsSubmitting(true);

    try {
      let result;
      if (isEditing) {
        result = await apiService.updateProject(targetId, payload);
        toast.success('✨ Case Workspace Updated Successfully!', { id: tid });
      } else {
        result = await apiService.createProject(payload);
        toast.success('✨ Case Workspace Created Successfully!', { id: tid });
      }
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess(result || payload);
      }
    } catch (err) {
      console.error('[Case Wizard] Submit failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to save case workspace.', { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const STEP_TITLES = {
    1: 'Client Info',
    2: 'Case Details',
    3: 'Assign Team',
    4: 'Opponent & Court',
    5: 'Review & Brief'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[200000] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { resetForm(); onClose(); }} 
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <div>
              <h3 className="text-base font-extrabold text-[#111111] dark:text-white flex items-center gap-2">
                <span>
                  {(localStorage.getItem('user_selected_role') || 'advocate') === 'law_firm'
                    ? (initialData ? 'Edit Firm Workspace' : 'Create Firm Workspace')
                    : (initialData ? 'Edit Case Workspace' : 'Create Case Workspace')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Step {step} of 5 — {STEP_TITLES[step]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoiceDictation}
              className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                isRecording 
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                  : 'bg-amber-500/10 text-[#C8A34D] border-[#C8A34D]/40 hover:bg-[#C8A34D]/20'
              }`}
              title="Voice AI Dictation (English/Hindi)"
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{isRecording ? 'Listening...' : 'Voice AI'}</span>
            </button>

            <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 hidden sm:inline-flex items-center gap-1">
              <span>☁️ Draft Auto-saved</span>
            </span>
          </div>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 shrink-0">
          <div 
            className="bg-[#C8A34D] h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* STEP 1: CLIENT INFORMATION */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-[#C8A34D]">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Client Information</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Link an existing firm client or register a new client profile into CRM.
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClientMode('existing')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    clientMode === 'existing'
                      ? 'bg-amber-500/15 text-[#C8A34D] border-2 border-[#C8A34D] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  • Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('new')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    clientMode === 'new'
                      ? 'bg-amber-500/15 text-[#C8A34D] border-2 border-[#C8A34D] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  • New Client
                </button>
              </div>

              {clientMode === 'existing' ? (
                /* TAB 1: EXISTING CLIENT SEARCH & DATABASE */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                      Search Client Database <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Search by name, company, or phone..."
                        value={searchClientQuery}
                        onChange={e => setSearchClientQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>
                  </div>

                  {/* Empty Registered Clients Card */}
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        No Registered Clients Found
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                        Switch to the <span className="text-[#C8A34D] font-bold">'New Client'</span> tab above to add your first client profile!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className="px-5 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register New Client</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: REGISTER NEW CLIENT */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                      Client Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aditi Lakhera / Apex Logistics Pvt Ltd"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={clientMobile}
                        onChange={e => setClientMobile(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="client@email.com"
                        value={clientEmail}
                        onChange={e => setClientEmail(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Company / Entity
                      </label>
                      <input
                        type="text"
                        placeholder="Organization name"
                        value={clientCompany}
                        onChange={e => setClientCompany(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Client Type
                      </label>
                      <div className="flex gap-2">
                        {['Individual', 'Company'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setClientType(type)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              clientType === type
                                ? 'bg-[#C8A34D] text-slate-950 font-black shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                      Registered Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street address / Office premises"
                      value={clientCity}
                      onChange={e => setClientCity(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: CASE INFORMATION */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-[#C8A34D]">
                  <Scale size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Case Information</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter litigation or advisory matter details. AI will suggest titles and Acts.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                  Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra vs Union of India"
                  value={caseTitle}
                  onChange={e => setCaseTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                  Case Category <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCaseCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        caseCategory === cat
                          ? 'bg-[#C8A34D] text-slate-950 font-black shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Case Type
                  </label>
                  <div className="flex gap-2">
                    {['Litigation', 'Advisory'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCaseTypeMode(type)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          caseTypeMode === type
                            ? 'bg-[#C8A34D] text-slate-950 font-black shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          priority === p
                            ? 'bg-[#C8A34D] text-slate-950 font-black shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Court / Forum
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. High Court of Delhi"
                    value={courtName}
                    onChange={e => setCourtName(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Court Room / Hall No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Court Room 14"
                    value={courtRoomNo}
                    onChange={e => setCourtRoomNo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Opposite Party
                  </label>
                  <input
                    type="text"
                    placeholder="Opposite Party Name"
                    value={oppositeParty}
                    onChange={e => setOppositeParty(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                    Opposite Advocate
                  </label>
                  <input
                    type="text"
                    placeholder="Opposing Advocate Name"
                    value={oppositeAdvocate}
                    onChange={e => setOppositeAdvocate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                  Case Summary & Key Facts
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief facts of the dispute, prayer, key legal questions..."
                  value={caseOverview}
                  onChange={e => setCaseOverview(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111] resize-none"
                />
              </div>

              {/* Confidential Case Toggle Switch Box */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-[#C8A34D]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Confidential Case Workspace
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Restrict visibility exclusively to assigned team members and firm owner.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConfidential(!isConfidential)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                    isConfidential ? 'bg-[#C8A34D]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      isConfidential ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ASSIGN CASE TEAM */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-[#C8A34D]">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Assign Case Team</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Firm Owner is automatically designated as Lead Advocate. Assign additional team members below.
                  </p>
                </div>
              </div>

              {/* Lead Advocate Card */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                  Lead Advocate <span className="text-rose-500">*</span>
                </label>

                <div className="p-4 rounded-2xl border-2 border-[#C8A34D] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:bg-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C8A34D]/20 border border-[#C8A34D]/40 flex items-center justify-center font-bold text-[#C8A34D] text-sm shrink-0">
                      AL
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Aditi Lakhera
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-black uppercase">
                          Firm Owner
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Managing Partner • Corporate & Litigation
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#C8A34D]" />
                </div>
              </div>

              {/* Additional Team Members Multi-Select */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                  Additional Team Members (Multi-Select)
                </label>

                {firmMembers.length === 0 ? (
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center font-bold text-sm shrink-0">
                      M
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">Team Member</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Junior Advocate • Civil Litigation</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#C8A34D] rounded cursor-pointer" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {firmMembers.map((member) => {
                      const isSelected = selectedTeamMembers.includes(member.id || member._id);
                      return (
                        <div
                          key={member.id || member._id}
                          onClick={() => {
                            const mId = member.id || member._id;
                            setSelectedTeamMembers(prev =>
                              prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
                            );
                          }}
                          className={`p-3.5 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#C8A34D] bg-amber-500/10'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name?.charAt(0) || 'M'}
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                                {member.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {member.role || 'Associate Advocate'}
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#C8A34D] rounded cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: COURT & JURISDICTION */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Court Type</label>
                  <select
                    value={courtType}
                    onChange={e => setCourtType(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  >
                    {COURT_TYPES.map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">State</label>
                  <input
                    type="text"
                    placeholder="Delhi / Maharashtra"
                    value={courtState}
                    onChange={e => setCourtState(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">District</label>
                  <input
                    type="text"
                    placeholder="New Delhi / Mumbai"
                    value={courtDistrict}
                    onChange={e => setCourtDistrict(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Court Name</label>
                <input
                  type="text"
                  placeholder="e.g. High Court of Delhi / Patiala House District Court"
                  value={courtName}
                  onChange={e => setCourtName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">CNR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DLHC01-004321-2024"
                    value={cnrNumber}
                    onChange={e => setCnrNumber(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Case Number</label>
                  <input
                    type="text"
                    placeholder="e.g. CS(COMM) 142/2024"
                    value={caseNumber}
                    onChange={e => setCaseNumber(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-[#111111] dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: REVIEW & CREATE */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-[#181818] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="text-xs font-black text-[#111111] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#C8A34D]" /> Final Review & Case Workspace Summary
                  </h4>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-[#111111] text-[#C8A34D] uppercase border border-[#C8A34D]/30">
                    {priority} Priority
                  </span>
                </div>

                {/* 1. Client Review Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#C8A34D] tracking-wider">1. Client Information</span>
                    <button onClick={() => setStep(1)} className="text-[11px] font-bold text-slate-500 hover:text-[#C8A34D] flex items-center gap-1 cursor-pointer transition-colors">
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-slate-600 dark:text-slate-300 font-medium">
                    <div>Client Name: <strong className="text-[#111111] dark:text-white font-extrabold">{clientName || 'N/A'}</strong> ({clientType})</div>
                    <div>Mobile / Email: <strong className="text-[#111111] dark:text-white font-extrabold">{clientMobile || 'N/A'}</strong> {clientEmail ? `• ${clientEmail}` : ''}</div>
                  </div>
                </div>

                {/* 2. Case Details Review Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#C8A34D] tracking-wider">2. Case Information</span>
                    <button onClick={() => setStep(2)} className="text-[11px] font-bold text-slate-500 hover:text-[#C8A34D] flex items-center gap-1 cursor-pointer transition-colors">
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-slate-600 dark:text-slate-300 font-medium">
                    <div>Title: <strong className="text-[#111111] dark:text-white font-extrabold">{caseTitle || 'N/A'}</strong></div>
                    <div>Category / Mode: <strong className="text-[#111111] dark:text-white font-extrabold">{caseCategory}</strong> ({caseTypeMode})</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Modal Controls Bar */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#181818]">
          <button
            type="button"
            disabled={step === 1 || isSubmitting}
            onClick={() => setStep(prev => Math.max(prev - 1, 1))}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              step === 1 ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
            }`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-7 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{initialData ? 'Saving Changes...' : 'Creating Workspace...'}</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{initialData ? 'Save Changes' : 'CREATE WORKSPACE'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateCaseWizardModal;
