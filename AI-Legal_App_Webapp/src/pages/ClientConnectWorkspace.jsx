import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Mail, Sparkles, Send, Copy, RefreshCw, Edit3, CheckCircle2,
  AlertCircle, ArrowLeft, ArrowRight, User, Calendar, Clock, ShieldCheck, Search, Filter,
  FileText, Check, ChevronRight, X, ExternalLink, HelpCircle, UserCheck, Scale, Plus,
  Users, Building2, UserPlus, FolderOpen, Briefcase, Phone, PhoneCall, Trash2, Lock, ShieldAlert, Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';
import { generateChatResponse } from '../services/geminiService';

const COMMUNICATION_PURPOSES = [
  'Hearing Reminder',
  'Fee Reminder',
  'Pending Documents',
  'Case Update',
  'Court Order',
  'Meeting Request',
  'Draft Ready',
  'Evidence Required',
  'General Update',
  'Custom Purpose'
];

const COMMUNICATION_STYLES = [
  'Professional',
  'Formal',
  'Friendly',
  'Urgent',
  'Short',
  'Detailed'
];

const LANGUAGES = [
  'English',
  'Hindi',
  'Hinglish',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Bengali',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Punjabi'
];

const CLIENT_ROLES = [
  'Plaintiff / Petitioner',
  'Defendant / Respondent',
  'Complainant',
  'Accused / Applicant',
  'Corporate Client',
  'Consultation Client'
];

export default function ClientConnectWorkspace({ initialCaseData = null, onBack = null }) {
  const navigate = useNavigate();

  // Role check for permission guard (e.g. Interns)
  const activeRole = localStorage.getItem('user_selected_role') || 'advocate';
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const userDesignation = userObj?.role || userObj?.designation || '';
  const isIntern = (userDesignation.toLowerCase().includes('intern') || activeRole === 'intern');

  // Navigation Stage: 'ENTRY' | 'SELECT_EXISTING_MATTER' | 'SELECT_EXISTING_CLIENT' | 'CONNECT_NEW' | 'WORKSPACE'
  const [stage, setStage] = useState(initialCaseData ? 'WORKSPACE' : 'ENTRY');

  // Clear History Modal State
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // Case & Client State
  const [cases, setCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [selectedCaseForExisting, setSelectedCaseForExisting] = useState(null);
  const [availableClientsForCase, setAvailableClientsForCase] = useState([]);
  const [selectedClientForExisting, setSelectedClientForExisting] = useState(null);

  // Active Connected Session Context (Matter + Client)
  const [activeMatter, setActiveMatter] = useState(initialCaseData);
  const [activeClient, setActiveClient] = useState(null);

  // Auto-hydrate when initialCaseData is provided directly
  useEffect(() => {
    if (initialCaseData) {
      const clientEmail = initialCaseData.clientEmail || initialCaseData.email || initialCaseData.clientId?.email || 'client@ailegal.in';
      const clientPhone = initialCaseData.clientMobileNumber || initialCaseData.clientPhone || initialCaseData.clientId?.mobileNumber || '+91 98765 43210';
      const clientWhatsApp = initialCaseData.clientWhatsAppNumber || initialCaseData.clientPhone || initialCaseData.clientMobileNumber || clientPhone;
      const clientName = initialCaseData.clientName || 'Primary Client';

      const hydratedClient = {
        id: (initialCaseData._id || 'matter') + '_primary',
        name: clientName,
        phone: clientPhone,
        whatsapp: clientWhatsApp,
        email: clientEmail,
        role: initialCaseData.caseType || 'Primary Client',
        language: initialCaseData.courtroomLanguage || 'English'
      };

      setActiveMatter(initialCaseData);
      setActiveClient(hydratedClient);
      if (initialCaseData.communicationLogs) {
        setLogs(initialCaseData.communicationLogs);
      }
      setStage('WORKSPACE');
    }
  }, [initialCaseData]);

  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientMobile, setNewClientMobile] = useState('');
  const [newClientWhatsApp, setNewClientWhatsApp] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientLanguage, setNewClientLanguage] = useState('English');
  const [newClientRole, setNewClientRole] = useState('Plaintiff / Petitioner');
  const [newClientAssociatedCaseId, setNewClientAssociatedCaseId] = useState('');

  // Active Communication Workspace State
  const [activeChannel, setActiveChannel] = useState('WhatsApp'); // 'WhatsApp' | 'Email' | 'Phone Call'
  const [selectedPurpose, setSelectedPurpose] = useState('Hearing Reminder');
  const [customPurpose, setCustomPurpose] = useState('');
  const [advocateInstructions, setAdvocateInstructions] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Professional');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // AI Draft & Preview State
  const [aiDraftSubject, setAiDraftSubject] = useState('');
  const [aiDraftBody, setAiDraftBody] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [builderStep, setBuilderStep] = useState('BUILDER'); // 'BUILDER' | 'PREVIEW'

  // Communication Timeline & Log State
  const [logs, setLogs] = useState([]);
  const [timelineTab, setTimelineTab] = useState('ALL'); // 'ALL' | 'WhatsApp' | 'Email' | 'Calls'
  const [searchQuery, setSearchQuery] = useState('');

  // Log Detail Modal
  const [selectedLogRecord, setSelectedLogRecord] = useState(null);

  // Fetch Cases from API on Mount
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setIsLoadingCases(true);
    try {
      const data = await apiService.getProjects();
      const rawList = Array.isArray(data) ? data : (data?.projects || data?.cases || []);
      
      // Filter out dummy/unspecified cases to prevent showing "Unspecified Case"
      const validCases = rawList.filter(c => 
        c && c.name && 
        c.name !== 'Unspecified Case' && 
        c.clientName !== 'Client Profile'
      );

      // Strictly set real-time cases fetched from My Matters database ONLY
      setCases(validCases);
    } catch (err) {
      console.warn('Error loading advocate cases:', err);
      setCases([]);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // START SELECT EXISTING CLIENT FLOW
  const handleStartSelectExisting = () => {
    setStage('SELECT_EXISTING_MATTER');
  };

  // REAL-TIME SYNC: CHOOSE MATTER & FETCH FULL CASE DETAILS WITH CLIENT EMAIL
  const handleSelectMatter = async (c) => {
    try {
      setIsLoadingCases(true);
      let fullCase = c;

      // Deep fetch project details from backend if real MongoDB ID
      if (c._id && c._id.length > 10) {
        try {
          const detailRes = await apiService.getProject(c._id);
          if (detailRes) {
            fullCase = detailRes.data || detailRes;
          }
        } catch (err) {
          console.warn('Could not deep fetch case details, using summary object:', err);
        }
      }

      setSelectedCaseForExisting(fullCase);

      // Extract real synced contact fields
      const clientEmail = fullCase.clientEmail || fullCase.email || fullCase.clientId?.email || fullCase.client?.email || 'client@ailegal.in';
      const clientPhone = fullCase.clientMobileNumber || fullCase.clientPhone || fullCase.clientId?.mobileNumber || fullCase.mobileNumber || '+91 98765 43210';
      const clientWhatsApp = fullCase.clientWhatsAppNumber || fullCase.clientPhone || fullCase.clientMobileNumber || clientPhone;
      const clientName = fullCase.clientName || fullCase.client?.name || fullCase.clientId?.name || 'Primary Client';

      let clientList = [];
      if (clientName) {
        clientList.push({
          id: fullCase._id + '_primary',
          name: clientName,
          phone: clientPhone,
          whatsapp: clientWhatsApp,
          email: clientEmail,
          role: fullCase.caseType || 'Primary Client',
          language: fullCase.courtroomLanguage || 'English'
        });
      }

      if (fullCase.clients && Array.isArray(fullCase.clients) && fullCase.clients.length > 0) {
        fullCase.clients.forEach((cl, idx) => {
          clientList.push({
            id: cl._id || `${fullCase._id}_cl_${idx}`,
            name: cl.name || cl.clientName,
            phone: cl.phone || cl.mobileNumber || cl.clientMobileNumber || 'Not Provided',
            whatsapp: cl.whatsAppNumber || cl.phone || 'Not Provided',
            email: cl.email || cl.clientEmail || 'Not Provided',
            role: cl.role || 'Co-Client / Party',
            language: cl.language || 'English'
          });
        });
      }

      if (clientList.length === 1) {
        setSelectedClientForExisting(clientList[0]);
        handleConfirmExistingConnection(fullCase, clientList[0]);
      } else if (clientList.length > 1) {
        setAvailableClientsForCase(clientList);
        setSelectedClientForExisting(clientList[0]);
        setStage('SELECT_EXISTING_CLIENT');
      } else {
        const defaultCl = {
          id: fullCase._id + '_default',
          name: clientName,
          phone: clientPhone,
          whatsapp: clientWhatsApp,
          email: clientEmail,
          role: 'Primary Party',
          language: fullCase.courtroomLanguage || 'English'
        };
        setSelectedClientForExisting(defaultCl);
        handleConfirmExistingConnection(fullCase, defaultCl);
      }
    } catch (err) {
      toast.error('Could not sync case client details.');
    } finally {
      setIsLoadingCases(false);
    }
  };

  // CONFIRM EXISTING CONNECTION
  const handleConfirmExistingConnection = (matterObj, clientObj) => {
    setActiveMatter(matterObj);
    setActiveClient(clientObj);
    if (matterObj && matterObj.communicationLogs) {
      setLogs(matterObj.communicationLogs);
    } else {
      setLogs([]);
    }
    setSelectedLanguage(clientObj.language || matterObj.courtroomLanguage || 'English');
    setStage('WORKSPACE');
    toast.success(`Connected with ${clientObj.name} (${clientObj.email})`);
  };

  // SUBMIT CONNECT NEW CLIENT FORM
  const handleConnectNewClientSubmit = (e) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Please enter a valid client name.');
      return;
    }

    const createdClient = {
      id: 'new_cl_' + Date.now(),
      name: newClientName.trim(),
      phone: newClientMobile.trim() || '+91 98765 43210',
      whatsapp: newClientWhatsApp.trim() || newClientMobile.trim() || '+91 98765 43210',
      email: newClientEmail.trim() || 'client@ailegal.in',
      role: newClientRole,
      language: newClientLanguage
    };

    let associatedMatter = null;
    if (newClientAssociatedCaseId) {
      associatedMatter = cases.find(c => c._id === newClientAssociatedCaseId);
    }

    if (!associatedMatter) {
      associatedMatter = {
        _id: 'matter_new_' + Date.now(),
        name: `Legal Consultation: ${createdClient.name}`,
        caseType: newClientRole,
        courtName: 'Advocate Chamber / Legal Consultation',
        clientName: createdClient.name,
        courtroomLanguage: newClientLanguage,
        communicationLogs: []
      };
    }

    setActiveClient(createdClient);
    setActiveMatter(associatedMatter);
    setSelectedLanguage(newClientLanguage);
    setLogs([]);
    setStage('WORKSPACE');
    toast.success(`Connected new client ${createdClient.name}!`);
  };

  // SWITCH CLIENT / MATTER
  const handleSwitchClientMatter = () => {
    setStage('ENTRY');
  };

  // Refresh Logs
  const refreshLogs = async () => {
    if (!activeMatter?._id) return;
    try {
      const data = await apiService.getProject(activeMatter._id);
      const updatedObj = data?.data || data;
      if (updatedObj && updatedObj.communicationLogs) {
        setLogs(updatedObj.communicationLogs);
      }
    } catch (e) {
      console.warn('Could not refresh logs:', e);
    }
  };

  // Direct Phone Call Launcher (tel: protocol with permission check & audit log)
  const handleDirectPhoneCall = async () => {
    if (isIntern) {
      toast.error('Interns do not have direct call permission.');
      return;
    }
    const targetPhone = activeClient?.phone || activeClient?.whatsapp;
    if (!targetPhone || targetPhone === 'Not Provided') {
      toast.error('No mobile number available for this client.');
      return;
    }
    const cleanPhone = targetPhone.replace(/[^+\d]/g, '');
    const telUrl = `tel:${cleanPhone}`;

    const finalPurpose = selectedPurpose === 'Custom Purpose' ? (customPurpose || 'Direct Phone Call') : selectedPurpose;

    try {
      window.location.href = telUrl;
      toast.success(`Opening phone dialer for ${activeClient?.name}...`);

      const logEntry = {
        id: Date.now().toString(),
        type: 'Phone Call',
        reason: finalPurpose,
        mode: 'Native Dialer',
        body: `Direct phone call initiated to ${activeClient?.name} (${cleanPhone}).`,
        recipientPhone: targetPhone,
        status: 'Dialed',
        timestamp: new Date().toLocaleString(),
        senderName: 'Advocate'
      };

      setLogs(prev => [logEntry, ...prev]);

      if (activeMatter?._id) {
        await apiService.postClientConnectLog(activeMatter._id, logEntry).catch(() => {});
      }
    } catch (err) {
      toast.error('Could not launch phone dialer.');
    }
  };

  // Clear Communication History for current case
  const handleClearCommunicationHistory = async () => {
    if (!activeMatter?._id) {
      setLogs([]);
      setIsClearHistoryModalOpen(false);
      toast.success('Communication logs cleared.');
      return;
    }

    try {
      setIsClearingLogs(true);
      await apiService.deleteClientConnectLog(activeMatter._id);
      setLogs([]);
      setIsClearHistoryModalOpen(false);
      toast.success('Communication history cleared for this case.');
    } catch (err) {
      toast.error('Failed to clear communication history.');
    } finally {
      setIsClearingLogs(false);
    }
  };

  // OPEN BUILDER FOR CHANNEL
  const handleOpenChannelBuilder = (channel) => {
    if (channel === 'Phone Call' && isIntern) {
      toast.error('Interns do not have direct call permission.');
      return;
    }
    setActiveChannel(channel);
    setIsManualMode(false);
    setBuilderStep('BUILDER');
    setAiDraftSubject('');
    setAiDraftBody('');
    setIsEditingDraft(false);
  };

  // GENERATE AI DRAFT
  const handleGenerateAiDraft = async () => {
    const finalPurpose = selectedPurpose === 'Custom Purpose' ? (customPurpose || 'Case Update') : selectedPurpose;
    setIsGeneratingDraft(true);

    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const advocateName = userObj?.fullName || userObj?.name || 'Aditi Lakhera';
    const advocateSignature = `Regards,\n\nAdv. ${advocateName}\nLead Advocate\n${activeMatter?.name || 'Law Firm Workspace'}`;

    try {
      if (activeMatter?._id && activeMatter._id.length > 10) {
        const payload = {
          channel: activeChannel,
          reasons: [finalPurpose],
          description: advocateInstructions,
          languagePreference: selectedLanguage,
          style: selectedStyle
        };
        const res = await apiService.postClientConnectDraft(activeMatter._id, payload);
        if (res && res.draft) {
          const sanitizedDraft = res.draft
            .replace(/SUPER_ADMIN/gi, 'Lead Advocate')
            .replace(/SUPER ADMIN/gi, 'Lead Advocate');
          setAiDraftBody(sanitizedDraft);
          setAiDraftSubject(res.subject || `Case Update: ${activeMatter.name}`);
          setBuilderStep('PREVIEW');
          setIsGeneratingDraft(false);
          toast.success(`AI ${activeChannel} draft generated!`);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend draft call fallback to Gemini AI direct generator:', err);
    }

    // Gemini AI Fallback Generator
    try {
      const isEmail = activeChannel === 'Email';
      const systemInstruction = `You are a legal communications assistant for a senior Advocate. Write a professional ${activeChannel} draft to client "${activeClient?.name || 'Client'}".
Case Matter: ${activeMatter?.name || 'Legal Proceedings'}
Communication Purpose: ${finalPurpose}
Advocate Instructions: ${advocateInstructions || 'None'}
Tone / Style: ${selectedStyle}
Language: ${selectedLanguage}

CRITICAL RULES:
1. ${isEmail ? 'Include a clear Subject line on the very first line formatted as "SUBJECT: [Your Subject Line]".' : 'Write a clean plain text message formatted for WhatsApp.'}
2. State the cause/update clearly and concisely.
3. Append this exact signature at the end:
${advocateSignature}`;

      const aiResponse = await generateChatResponse(
        [],
        `Write ${activeChannel} draft for client ${activeClient?.name || 'Client'} regarding ${finalPurpose}`,
        systemInstruction,
        [],
        selectedLanguage,
        null,
        'TEXT'
      );

      const rawText = typeof aiResponse === 'string'
        ? aiResponse
        : (aiResponse?.reply || aiResponse?.content || aiResponse?.text || '');

      let draftBody = rawText.trim().replace(/SUPER_ADMIN/gi, 'Lead Advocate').replace(/SUPER ADMIN/gi, 'Lead Advocate');
      let draftSubj = `Case Update: ${activeMatter?.name || 'Legal Notice'}`;

      if (isEmail) {
        const matchSubject = draftBody.match(/^SUBJECT:\s*(.*)/i);
        if (matchSubject) {
          draftSubj = matchSubject[1].trim();
          draftBody = draftBody.replace(/^SUBJECT:\s*.*\n*/i, '').trim();
        }
      }

      setAiDraftSubject(draftSubj);
      setAiDraftBody(draftBody);
      setBuilderStep('PREVIEW');
      toast.success(`AI ${activeChannel} draft generated!`);
    } catch (err) {
      toast.error('Could not generate AI message. Please write manually or try again.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // WRITE MANUALLY HANDLER
  const handleWriteManually = () => {
    setIsManualMode(true);
    setBuilderStep('PREVIEW');
    setIsEditingDraft(true);
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const advocateName = userObj?.fullName || userObj?.name || 'Aditi Lakhera';
    setAiDraftSubject(activeChannel === 'Email' ? `Case Update: ${activeMatter?.name || 'Legal Matter'}` : '');
    setAiDraftBody(`Dear ${activeClient?.name || 'Client'},\n\n[Write your message here]\n\nRegards,\nAdv. ${advocateName}\nLead Advocate`);
  };

  // APPROVE & LAUNCH NATIVE DESTINATION
  const handleApproveAndLaunch = async () => {
    if (!aiDraftBody.trim()) {
      toast.error('Message draft is empty.');
      return;
    }

    const finalPurpose = selectedPurpose === 'Custom Purpose' ? (customPurpose || 'Case Update') : selectedPurpose;

    if (activeChannel === 'WhatsApp') {
      const targetPhone = activeClient?.whatsapp || activeClient?.phone;
      if (!targetPhone || targetPhone === 'Not Provided') {
        toast.error('No WhatsApp number available for this client.');
        return;
      }

      const cleanPhone = targetPhone.replace(/[^+\d]/g, '');
      const encodedMsg = encodeURIComponent(aiDraftBody);
      const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedMsg}`;

      try {
        window.open(waUrl, '_blank');
        toast.success('WhatsApp launched in new browser tab!');

        const logEntry = {
          id: Date.now().toString(),
          type: 'WhatsApp',
          reason: finalPurpose,
          mode: isManualMode ? 'Manual Message' : 'AI Draft Approved',
          body: aiDraftBody,
          recipientPhone: targetPhone,
          status: 'Sent via WhatsApp',
          timestamp: new Date().toLocaleString(),
          senderName: 'Advocate'
        };

        setLogs(prev => [logEntry, ...prev]);

        if (activeMatter?._id) {
          await apiService.postClientConnectLog(activeMatter._id, logEntry).catch(() => {});
        }
      } catch (err) {
        toast.error('Could not launch WhatsApp.');
      }
    } else if (activeChannel === 'Email') {
      const targetEmail = activeClient?.email;
      if (!targetEmail || targetEmail === 'Not Provided') {
        toast.error('No email address available for this client.');
        return;
      }

      const encodedSubj = encodeURIComponent(aiDraftSubject || `Case Update: ${activeMatter?.name}`);
      const encodedBody = encodeURIComponent(aiDraftBody);
      const mailtoUrl = `mailto:${targetEmail}?subject=${encodedSubj}&body=${encodedBody}`;

      try {
        window.location.href = mailtoUrl;
        toast.success(`Native email client launched for ${targetEmail}!`);

        const logEntry = {
          id: Date.now().toString(),
          type: 'Email',
          reason: finalPurpose,
          mode: isManualMode ? 'Manual Message' : 'AI Draft Approved',
          subject: aiDraftSubject,
          body: aiDraftBody,
          recipientEmail: targetEmail,
          status: 'Sent via Email',
          timestamp: new Date().toLocaleString(),
          senderName: 'Advocate'
        };

        setLogs(prev => [logEntry, ...prev]);

        if (activeMatter?._id) {
          await apiService.postClientConnectLog(activeMatter._id, logEntry).catch(() => {});
        }
      } catch (err) {
        toast.error('Could not launch email application.');
      }
    }
  };

  // Copy Draft
  const handleCopyDraft = () => {
    const fullText = activeChannel === 'Email'
      ? `Subject: ${aiDraftSubject}\n\n${aiDraftBody}`
      : aiDraftBody;
    navigator.clipboard.writeText(fullText);
    toast.success('Draft copied to clipboard!');
  };

  // Filter Timeline Logs
  const filteredLogs = logs.filter(log => {
    const matchesChannel = timelineTab === 'ALL' || log.type === timelineTab;
    const matchesSearch = !searchQuery.trim() ||
      (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.body && log.body.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.subject && log.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesChannel && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">

      {/* =========================================================================
          STAGE 1: ENTRY SCREEN — DIRECT REGISTERED MATTERS LIST (MATCHING MOBILE APP)
      ========================================================================= */}
      {stage === 'ENTRY' && (
        <div className="max-w-5xl mx-auto space-y-6 py-4">
          {/* TOP HEADER & ACTION BAR — 1 SINGLE ROW ON MOBILE & DESKTOP */}
          <div className="flex flex-row items-center justify-between gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/dashboard/tools')}
                className="p-1.5 sm:p-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-all cursor-pointer shadow-xs shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-xs sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {activeRole === 'law_firm' ? 'AI Team Communication' : 'AI Client Connect'}
                  </h1>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 hidden md:inline-block">
                    {activeRole === 'law_firm' ? 'Firm Suite' : 'Client Suite'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block mt-0.5">
                  {activeRole === 'law_firm'
                    ? 'Select a firm matter or client to start AI WhatsApp & Email communication.'
                    : 'Select a case or register a new client for AI WhatsApp & Email communication.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setStage('CONNECT_NEW')}
              className="px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10.5px] sm:text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>+ Connect New Client</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case name, client name, or forum..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-[#C8A34D] focus:outline-none shadow-xs"
            />
          </div>

          {/* REGISTERED MATTERS DIRECT LIST / GRID */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2">
              <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400 min-w-0">
                Registered Firm Matters & Case Folders ({cases.filter(c => !searchQuery.trim() || c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName?.toLowerCase().includes(searchQuery.toLowerCase())).length})
              </h2>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium min-w-0">
                Click any case to launch AI Communication Workspace
              </span>
            </div>

            {isLoadingCases ? (
              <div className="py-16 text-center text-xs text-slate-400 font-bold space-y-2 bg-white dark:bg-[#111622] rounded-3xl border border-slate-200 dark:border-slate-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A34D]" />
                <p>Loading registered firm matters...</p>
              </div>
            ) : cases.filter(c => !searchQuery.trim() || c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#111622] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl space-y-4">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    No Matching Matters Found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery.trim()
                      ? `No case folders match "${searchQuery}". Try a different keyword.`
                      : 'You currently have no registered court cases. Connect a client manually to begin.'}
                  </p>
                </div>
                <button
                  onClick={() => setStage('CONNECT_NEW')}
                  className="px-6 py-3 rounded-2xl bg-[#C8A34D] text-[#111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Connect New Client</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                {cases.filter(c => !searchQuery.trim() || c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName?.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <div
                    key={c._id || c.id}
                    onClick={() => handleSelectMatter(c)}
                    className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border-2 border-slate-200 dark:border-slate-800 hover:border-[#C8A34D] transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2 group"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 flex items-center justify-center font-black group-hover:scale-105 transition-transform shrink-0">
                          <FolderOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors truncate">
                            {c.name}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            Forum: {c.courtName || c.caseType || 'District Court'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] sm:text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C8A34D] shrink-0" />
                        <span className="font-bold truncate">{c.clientName || 'Primary Client'}</span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-[#C8A34D] group-hover:underline flex items-center gap-1 shrink-0">
                        <span>Launch Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: SELECT EXISTING MATTER
      ========================================================================= */}
      {stage === 'SELECT_EXISTING_MATTER' && (
        <div className="max-w-4xl mx-auto space-y-6 py-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage('ENTRY')}
                className="p-2 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Select Existing Matter
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Choose the matter you wish to communicate about with your client.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStage('CONNECT_NEW')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Connect New Client
            </button>
          </div>

          {isLoadingCases ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C8A34D]" />
              <p>Fetching deep case details & syncing client emails...</p>
            </div>
          ) : cases.length === 0 ? (
            /* NO MATTERS EMPTY STATE */
            <div className="p-12 text-center bg-white dark:bg-[#111622] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl space-y-4">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  No Existing Matters Found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You currently don't have any registered court cases with client records. You can connect a client manually.
                </p>
              </div>
              <button
                onClick={() => setStage('CONNECT_NEW')}
                className="px-6 py-3 rounded-2xl bg-[#C8A34D] text-[#111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Connect New Client
              </button>
            </div>
          ) : (
            /* CASES LIST */
            <div className="grid grid-cols-1 gap-4">
              {cases.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleSelectMatter(c)}
                  className="p-5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-[#C8A34D] transition-all cursor-pointer shadow-sm flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[9px] font-black uppercase">
                        {c.caseType || 'Litigation File'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Court: {c.courtName || 'District Court'}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors">
                      📁 {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                      <span>Client: <strong className="text-slate-700 dark:text-slate-300">{c.clientName || 'Primary Client'}</strong></span>
                      {(c.clientEmail || c.email) && <span className="text-sky-500">• Email: {c.clientEmail || c.email}</span>}
                    </p>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] group-hover:bg-[#C8A34D] group-hover:text-[#111] text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1">
                    <span>Sync & Select Client</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STAGE 3: SELECT MULTIPLE CLIENTS FOR A MATTER
      ========================================================================= */}
      {stage === 'SELECT_EXISTING_CLIENT' && (
        <div className="max-w-4xl mx-auto space-y-6 py-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage('SELECT_EXISTING_MATTER')}
                className="p-2 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Select Client for "{selectedCaseForExisting?.name}"
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Multiple client contacts attached to this matter. Select the target client.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableClientsForCase.map((cl) => (
              <div
                key={cl.id}
                onClick={() => setSelectedClientForExisting(cl)}
                className={`p-5 rounded-2xl bg-white dark:bg-[#111622] border-2 transition-all cursor-pointer shadow-sm space-y-3 ${
                  selectedClientForExisting?.id === cl.id
                    ? 'border-[#C8A34D] bg-[#C8A34D]/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A2333] text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                    {cl.role}
                  </span>
                  {selectedClientForExisting?.id === cl.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#C8A34D]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{cl.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Mobile: {cl.phone}</p>
                  <p className="text-xs text-sky-500 font-medium">Email: {cl.email}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => handleConfirmExistingConnection(selectedCaseForExisting, selectedClientForExisting)}
              className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              <span>Continue with {selectedClientForExisting?.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 4: CONNECT NEW CLIENT FORM
      ========================================================================= */}
      {stage === 'CONNECT_NEW' && (
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setStage('ENTRY')}
                className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Connect New Client
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                  Enter client details to establish communication context.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleConnectNewClientSubmit} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 sm:space-y-4">
            
            {/* Client Name */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                Client Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g. Suresh Kumar"
                className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
              />
            </div>

            {/* Mobile & WhatsApp Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={newClientMobile}
                  onChange={(e) => setNewClientMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={newClientWhatsApp}
                  onChange={(e) => setNewClientWhatsApp(e.target.value)}
                  placeholder="Leave empty if same as Mobile"
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                />
              </div>
            </div>

            {/* Email & Language Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  Preferred Language
                </label>
                <select
                  value={newClientLanguage}
                  onChange={(e) => setNewClientLanguage(e.target.value)}
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client Role & Matter Association */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  Client Type / Role
                </label>
                <select
                  value={newClientRole}
                  onChange={(e) => setNewClientRole(e.target.value)}
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none cursor-pointer"
                >
                  {CLIENT_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-black uppercase text-slate-400 block">
                  Associate Existing Matter (Optional)
                </label>
                <select
                  value={newClientAssociatedCaseId}
                  onChange={(e) => setNewClientAssociatedCaseId(e.target.value)}
                  className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Independent Legal Consultation --</option>
                  {cases.map(c => (
                    <option key={c._id} value={c._id}>📁 {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStage('ENTRY')}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 sm:px-8 py-3 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Connect Client & Launch Workspace</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* =========================================================================
          STAGE 5: FULL AI CLIENT CONNECT WORKSPACE (AFTER CLIENT SELECTION)
      ========================================================================= */}
      {stage === 'WORKSPACE' && activeClient && (
        <div className="space-y-6">

          {/* WORKSPACE HEADER BAR — 1 SINGLE ROW ON MOBILE & DESKTOP */}
          <div className="flex flex-row items-center justify-between gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={handleSwitchClientMatter}
                className="p-1.5 sm:p-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 text-xs font-bold shrink-0"
                title="Switch Client or Matter"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden md:inline">Switch Client</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-xs sm:text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {activeRole === 'law_firm' ? 'AI Team Communication Workspace' : 'AI Client Connect Workspace'}
                  </h1>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 hidden md:inline-block">
                    Connected Session
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block mt-0.5">
                  Active Client: <strong className="text-slate-900 dark:text-white">{activeClient.name}</strong> • Matter: <strong className="text-[#C8A34D]">{activeMatter?.name}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={handleSwitchClientMatter}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] sm:text-xs font-extrabold hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-[#C8A34D]" /> <span className="hidden sm:inline">Change Client / Matter</span><span className="sm:hidden">Change</span>
            </button>
          </div>

          {/* CLIENT PROFILE RECORD CARD */}
          <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#C8A34D]/15 border border-[#C8A34D]/30 flex items-center justify-center font-black text-base sm:text-lg text-[#C8A34D] shrink-0">
                  {activeClient.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span className="truncate">{activeClient.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A2333] text-slate-500 dark:text-slate-400 text-[9.5px] sm:text-[10px] font-bold whitespace-nowrap shrink-0">
                      {activeClient.role || 'Connected Client'}
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    Matter: <strong className="text-[#C8A34D]">{activeMatter?.name}</strong> • Forum: {activeMatter?.courtName || 'Advocate Office'}
                  </p>
                </div>
              </div>

              {/* Quick Communication Actions (WhatsApp & Email) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button
                  onClick={() => handleOpenChannelBuilder('WhatsApp')}
                  className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeChannel === 'WhatsApp'
                      ? 'bg-[#25D366] text-white shadow-md'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-[#25D366] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> WhatsApp Message
                </button>
                <button
                  onClick={() => handleOpenChannelBuilder('Email')}
                  className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeChannel === 'Email'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Email Communication
                </button>
              </div>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Mobile Number</span>
                <span className="font-extrabold text-slate-900 dark:text-white block">{activeClient.phone}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">WhatsApp Number</span>
                <span className="font-extrabold text-emerald-500 block">{activeClient.whatsapp || activeClient.phone}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Email Address (Synced)</span>
                <span className="font-extrabold text-sky-500 block truncate">{activeClient.email}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Preferred Language</span>
                <span className="font-extrabold text-[#C8A34D] block">{selectedLanguage}</span>
              </div>
            </div>
          </div>

          {/* MAIN WORKSPACE 2-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: 3-STEP AI COMMUNICATION BUILDER & PREVIEW (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C8A34D]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {activeChannel} AI Communication Builder
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1A2333] text-slate-500 text-[10px] font-bold">
                    Channel: {activeChannel}
                  </span>
                </div>

                {/* BUILDER FORM */}
                {builderStep === 'BUILDER' ? (
                  <div className="space-y-6">
                    
                    {/* STEP 1: COMMUNICATION PURPOSE */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                        Step 1 — Choose Communication Purpose
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COMMUNICATION_PURPOSES.map((purpose) => (
                          <button
                            key={purpose}
                            onClick={() => setSelectedPurpose(purpose)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              selectedPurpose === purpose
                                ? 'bg-[#C8A34D] text-[#111111] shadow-sm'
                                : 'bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {purpose}
                          </button>
                        ))}
                      </div>

                      {selectedPurpose === 'Custom Purpose' && (
                        <input
                          type="text"
                          value={customPurpose}
                          onChange={(e) => setCustomPurpose(e.target.value)}
                          placeholder="Enter custom communication purpose..."
                          className="w-full mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                        />
                      )}
                    </div>

                    {/* STEP 2: ADVOCATE INSTRUCTIONS */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                        Step 2 — Advocate Specific Instructions (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={advocateInstructions}
                        onChange={(e) => setAdvocateInstructions(e.target.value)}
                        placeholder="e.g. Mention next hearing on 28 July in Delhi High Court. Tell client to carry Aadhaar and signed affidavit..."
                        className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:border-[#C8A34D] focus:outline-none leading-relaxed"
                      />
                    </div>

                    {/* STEP 3: TONE & LANGUAGE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                          Communication Style & Tone
                        </label>
                        <select
                          value={selectedStyle}
                          onChange={(e) => setSelectedStyle(e.target.value)}
                          className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-900 dark:text-white focus:border-[#C8A34D] focus:outline-none cursor-pointer"
                        >
                          {COMMUNICATION_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                          Output Language
                        </label>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-900 dark:text-white focus:border-[#C8A34D] focus:outline-none cursor-pointer"
                        >
                          {LANGUAGES.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* BUILDER ACTION BUTTONS */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleWriteManually}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                      >
                        Write Manually
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingDraft}
                        onClick={handleGenerateAiDraft}
                        className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingDraft ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Generating AI Draft...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate AI {activeChannel} Draft</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  /* DRAFT PREVIEW & EDITING VIEW */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-black uppercase text-[#C8A34D] flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Generated {activeChannel} Preview
                      </span>
                      <button
                        onClick={() => setIsEditingDraft(!isEditingDraft)}
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2333] text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {isEditingDraft ? 'Done Editing' : 'Edit Text'}
                      </button>
                    </div>

                    {activeChannel === 'Email' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 block">Email Subject Line:</label>
                        <input
                          type="text"
                          disabled={!isEditingDraft}
                          value={aiDraftSubject}
                          onChange={(e) => setAiDraftSubject(e.target.value)}
                          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Message Body (With Dynamic Signature):</label>
                      <textarea
                        rows={8}
                        disabled={!isEditingDraft}
                        value={aiDraftBody}
                        onChange={(e) => setAiDraftBody(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:border-[#C8A34D] focus:outline-none leading-relaxed whitespace-pre-wrap"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                        <button
                          onClick={() => setBuilderStep('BUILDER')}
                          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-[11px] sm:text-xs font-bold hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Back to Setup
                        </button>
                        <button
                          onClick={handleCopyDraft}
                          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-[11px] sm:text-xs font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" /> Copy
                        </button>
                        <button
                          onClick={handleGenerateAiDraft}
                          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[11px] sm:text-xs font-extrabold hover:bg-[#C8A34D] hover:text-[#111] cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Regenerate
                        </button>
                      </div>

                      <button
                        onClick={handleApproveAndLaunch}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <Send className="w-4 h-4 shrink-0" /> Approve & Launch {activeChannel}
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN: COMMUNICATION TIMELINE & AUDIT VAULT (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C8A34D]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Communication Timeline ({filteredLogs.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={refreshLogs}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1A2333] text-slate-400 hover:text-slate-900 cursor-pointer"
                      title="Refresh logs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsClearHistoryModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer flex items-center gap-1 text-[10px] font-extrabold"
                      title="Clear communication history for this case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Channel Tabs */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-[#1A2333] p-1 gap-1 text-[11px] font-extrabold">
                  {['ALL', 'WhatsApp', 'Email'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTimelineTab(tab)}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        timelineTab === tab
                          ? 'bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs by keyword..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C8A34D] focus:outline-none"
                  />
                </div>

                {/* Timeline Logs */}
                <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-semibold">No client communications recorded yet.</p>
                      <p className="text-[11px] text-slate-400">Generate your first message using WhatsApp or Email.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.id || log._id}
                        onClick={() => setSelectedLogRecord(log)}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 space-y-2 hover:border-[#C8A34D]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                              log.type === 'WhatsApp' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-sky-500/15 text-sky-500'
                            }`}>
                              {log.type}
                            </span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300">{log.reason || 'Case Update'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{log.timestamp || log.createdAt}</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                          {log.body || log.subject || 'Communication dispatch logged.'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5">
                          <span>Sender: {log.senderName || 'Advocate'}</span>
                          <span className="font-extrabold text-emerald-500">{log.status || 'Sent'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── COMMUNICATION DETAIL AUDIT MODAL ─── */}
      {selectedLogRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] border-2 border-[#C8A34D] w-full max-w-xl rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8A34D]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Communication Audit Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogRecord(null)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-[#1A2333] text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold">Channel & Purpose:</span>
                <span className="font-extrabold text-[#C8A34D]">{selectedLogRecord.type} ({selectedLogRecord.reason})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold">Recipient:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedLogRecord.recipientPhone || selectedLogRecord.recipientEmail || activeClient?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold">Dispatch Timestamp:</span>
                <span className="font-bold">{selectedLogRecord.timestamp || selectedLogRecord.createdAt}</span>
              </div>
              {selectedLogRecord.subject && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-bold">Subject Line:</span>
                  <span className="font-bold text-sky-500">{selectedLogRecord.subject}</span>
                </div>
              )}

              <div className="space-y-1 pt-2">
                <span className="text-slate-400 font-bold block">Dispatched Message Body:</span>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto">
                  {selectedLogRecord.body || 'Communication log entry.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogRecord(null)}
                className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b8933d] transition-all cursor-pointer shadow-sm"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR HISTORY CONFIRMATION MODAL */}
      {isClearHistoryModalOpen && (
        <div className="fixed inset-0 z-[200000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] border-2 border-rose-500/50 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Clear Communication History?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  This will permanently remove communication logs for matter <strong className="text-rose-500">{activeMatter?.name || 'this case'}</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 font-semibold space-y-1">
              <p>⚠️ Warning: Communication history clearing is case-scoped only.</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Other cases and system records will remain unaffected.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={handleClearCommunicationHistory}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isClearingLogs ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
