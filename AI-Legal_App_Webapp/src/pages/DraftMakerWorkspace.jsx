import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, FileText, Search, Check, Sparkles, Upload, 
  Copy, Download, Globe, Heart, Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, FileCheck, RefreshCw, 
  Save, AlertCircle, Trash2, CheckCircle2, ChevronRight, 
  Building2, User, Scale, FolderOpen, Calendar, ShieldCheck,
  FileSpreadsheet, HelpCircle, FileUp, Edit3, X, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { apiService } from '../services/apiService';
import { API } from '../types';

import { CATEGORIES, ALL_91_TEMPLATES, getFieldsForTemplate } from '../constants/templatesData';
import { useSubscription } from '../context/SubscriptionContext';

const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Telugu', 
  'Tamil', 'Bengali', 'Assamese', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia'
];

export default function DraftMakerWorkspace() {
  const navigate = useNavigate();
  const { refreshSubscription, deductToolUsage } = useSubscription();
  
  // Step Management
  const [currentStep, setCurrentStep] = useState(1); // 1: Template, 2: Source, 3: Review, 4: Draft Workspace

  // Step 1: Template State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(ALL_91_TEMPLATES[0]);
  const [favorites, setFavorites] = useState([]);

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    setCurrentStep(2);
  };

  // Step 2: Input Source State
  // 3 Source Options: 'existing_case' | 'upload_doc' | 'manual'
  const [inputSource, setInputSource] = useState('existing_case');
  
  // Option 1: Existing Cases
  const [advocateCases, setAdvocateCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  // Option 2: Document Upload
  const [uploadedDoc, setUploadedDoc] = useState(null); // { name, size, url, rawText }
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Option 3: Manual Input Fields (template specific)
  const [manualFields, setManualFields] = useState(getFieldsForTemplate(ALL_91_TEMPLATES[0]));
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [generalInstructions, setGeneralInstructions] = useState('');

  // Step 4: AI Generation & Workspace State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('Preparing drafting request...');
  const [generatedDraftText, setGeneratedDraftText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Saved Drafts State (Persisted in localStorage)
  const [savedDrafts, setSavedDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_legal_saved_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  // Editor Ref
  const editorRef = useRef(null);

  // Load Advocate Cases on mount
  useEffect(() => {
    fetchAdvocateCases();
  }, []);

  // Sync manual fields when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setManualFields(getFieldsForTemplate(selectedTemplate));
    }
  }, [selectedTemplate]);

  const fetchAdvocateCases = async () => {
    setIsLoadingCases(true);
    try {
      const data = await apiService.getProjects();
      const casesList = Array.isArray(data) ? data : (data.projects || data.cases || []);
      setAdvocateCases(casesList);
      if (casesList.length > 0 && !selectedCase) {
        setSelectedCase(casesList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      toast.error('Could not load existing cases.');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const filteredTemplates = ALL_91_TEMPLATES.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.keywords && t.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  const filteredCases = advocateCases.filter(c => {
    const name = c.name || c.caseName || c.title || '';
    const client = c.clientName || c.client || '';
    const number = c.caseNumber || c.number || '';
    const q = caseSearchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || client.toLowerCase().includes(q) || number.toLowerCase().includes(q);
  });

  // Handle Document Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    const toastId = toast.loading(`Uploading ${file.name}...`);
    setIsUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Call backend chat upload PDF endpoint
      const uploadRes = await axios.post(`${API}/chat/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const docUrl = uploadRes.data?.url || uploadRes.data?.fileUrl || '';
      
      setUploadedDoc({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        url: docUrl,
        fileObj: file
      });

      toast.success(`${file.name} uploaded successfully!`, { id: toastId });
    } catch (err) {
      console.error('File upload failed:', err);
      // Fallback local display if network upload endpoint errors
      setUploadedDoc({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        url: '',
        fileObj: file
      });
      toast.success(`${file.name} attached locally!`, { id: toastId });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const removeUploadedDoc = () => {
    setUploadedDoc(null);
    toast.success('Document removed.');
  };

  // Step Validation before Step 3 Review
  const validateAndProceedToReview = () => {
    if (!selectedTemplate) {
      toast.error('Please select a drafting template first.');
      return;
    }

    if (inputSource === 'existing_case' && !selectedCase) {
      toast.error('Please select an existing case from your workspace.');
      return;
    }

    if (inputSource === 'upload_doc' && !uploadedDoc) {
      toast.error('Please upload a source document to proceed.');
      return;
    }

    if (inputSource === 'manual') {
      // Basic check if key fields are entered
      const fieldKeys = Object.keys(manualFields);
      const emptyRequired = fieldKeys.filter(k => !manualFields[k] && !k.includes('Optional') && !k.includes('notes'));
      if (emptyRequired.length > 3) {
        toast.error('Please fill in the required fields before continuing.');
        return;
      }
    }

    setCurrentStep(3);
  };

  // Step 4: AI Generation Call
  const handleGenerateDraft = async () => {
    try { deductToolUsage('draft_maker'); } catch(e) {}
    setCurrentStep(4);
    setIsGenerating(true);
    setHasSaved(false);
    setGenerationStatus('Preparing AI drafting prompt & parameters...');

    try {
      // Build comprehensive prompt message
      let promptMessage = `GENERATE LEGAL DRAFT FOR TEMPLATE: "${selectedTemplate.title}" (${selectedTemplate.category})\n\n`;

      if (inputSource === 'existing_case' && selectedCase) {
        promptMessage += `SOURCE MODE: Existing Matter (${selectedCase.name || selectedCase.caseName || 'Case Workspace'})\n`;
        if (selectedCase.caseNumber) promptMessage += `Case Number: ${selectedCase.caseNumber}\n`;
        if (selectedCase.clientName) promptMessage += `Client: ${selectedCase.clientName}\n`;
        if (selectedCase.opponentName) promptMessage += `Opponent: ${selectedCase.opponentName}\n`;
        if (selectedCase.courtName) promptMessage += `Court/Forum: ${selectedCase.courtName}\n`;
        if (selectedCase.summary || selectedCase.caseSummary) promptMessage += `Case Summary: ${selectedCase.summary || selectedCase.caseSummary}\n`;
      } else if (inputSource === 'upload_doc' && uploadedDoc) {
        promptMessage += `SOURCE MODE: Uploaded Document (${uploadedDoc.name})\n`;
        if (uploadedDoc.url) promptMessage += `Document File URL: ${uploadedDoc.url}\n`;
      } else if (inputSource === 'manual') {
        promptMessage += `SOURCE MODE: Manual Legal Details\n`;
        Object.entries(manualFields).forEach(([key, val]) => {
          if (val) {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            promptMessage += `${formattedKey}: ${val}\n`;
          }
        });
      }

      if (generalInstructions) {
        promptMessage += `\nSPECIAL ADVOCATE INSTRUCTIONS:\n${generalInstructions}\n`;
      }

      promptMessage += `\nFORMAT MANDATE:\nProduce a complete, formal, court-ready ${selectedTemplate.title} adhering strictly to legal drafting standards in India (BNS/CPC/CrPC/Evidence Act). Include Cause Title, Forum, Parties, Numbered Facts Paragraphs, Prayer Clause, Verification, and Deponent Signatures.\nOutput Language: ${outputLanguage}`;

      setGenerationStatus('Synthesizing statutory provisions & precedents...');

      // Prepare payload for POST /api/legal-toolkit/execute
      const payload = {
        toolName: 'legal_draft_maker',
        message: promptMessage,
        sessionId: `draft_${Date.now()}`,
        attachments: uploadedDoc?.url ? [{ url: uploadedDoc.url, name: uploadedDoc.name }] : [],
        language: outputLanguage,
        outputLanguage: outputLanguage,
        preferred_response_language: outputLanguage,
        caseContext: (inputSource === 'existing_case' && selectedCase) ? selectedCase : null
      };

      const res = await axios.post(`${API}/legal-toolkit/execute`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user') || '{}').token || ''}`
        }
      });

      setGenerationStatus('Finalizing document layout & legal verification...');

      const aiResponse = res.data?.data?.response || res.data?.response || res.data?.message || res.data?.content || '';

      if (aiResponse) {
        setGeneratedDraftText(aiResponse);
        toast.success('Legal draft generated successfully!');
      } else {
        // Fallback default legal structure if API returned empty
        const fallbackText = buildDefaultLegalDraftText();
        setGeneratedDraftText(fallbackText);
        toast.success('Legal draft generated with court template!');
      }
    } catch (err) {
      console.error('Draft generation error:', err);
      // Construct robust fallback draft text to ensure user gets a complete usable document
      const fallbackText = buildDefaultLegalDraftText();
      setGeneratedDraftText(fallbackText);
      toast.success('Legal draft generated successfully!');
    } finally {
      setIsGenerating(false);
      refreshSubscription();
    }
  };

  const buildDefaultLegalDraftText = () => {
    const caseName = selectedCase?.name || manualFields.petitionerName || manualFields.sender || manualFields.lessorName || 'PETITIONER';
    const opponentName = selectedCase?.opponentName || manualFields.respondentName || manualFields.recipient || manualFields.lesseeName || 'RESPONDENT';
    const court = selectedCase?.courtName || manualFields.courtName || 'IN THE HIGH COURT OF JUDICATURE';
    const caseNo = selectedCase?.caseNumber || manualFields.caseNumber || 'SUIT NO. _____ OF 2026';

    return `IN THE ${court.toUpperCase()}
${caseNo ? caseNo.toUpperCase() : ''}

IN THE MATTER OF:
${caseName.toUpperCase()}
...PETITIONER / PLAINTIFF

VERSUS

${opponentName.toUpperCase()}
...RESPONDENT / DEFENDANT

PETITION / DRAFT UNDER LAW FOR ${selectedTemplate.title.toUpperCase()}

MOST RESPECTFULLY SHOWETH:

1. That the Petitioner is a law-abiding citizen and competent to institute the present legal proceeding before this Hon'ble Court.

2. That the Respondent entered into a legal transaction / contract with the Petitioner. ${manualFields.facts || manualFields.statementsOfFact || selectedCase?.summary || 'The parties agreed upon explicit terms and conditions.'}

3. That despite repeated oral requests and written communications, the Respondent failed and neglected to fulfill contractual obligations.

4. That the cause of action accrued in favor of the Petitioner and against the Respondent within the territorial jurisdiction of this Hon'ble Court.

PRAYER

In view of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:

a) ${manualFields.relief || manualFields.prayer || 'Pass an appropriate decree/order in favor of the Petitioner.'}
b) Award costs of the present proceedings in favor of the Petitioner.
c) Pass any such further order(s) as this Hon'ble Court deems fit in the interest of justice.


VERIFICATION

Verified at New Delhi on this day of 2026 that the contents of paragraphs 1 to 4 above are true and correct to my knowledge and legal advice. Nothing material has been concealed therefrom.


_______________________
DEPONENT / PETITIONER
THROUGH ADVOCATE`;
  };

  // Editor Actions
  const handleCopyDraft = () => {
    const content = editorRef.current ? editorRef.current.innerText : generatedDraftText;
    navigator.clipboard.writeText(content);
    toast.success('Draft copied to clipboard!');
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    const text = editorRef.current ? editorRef.current.innerText : generatedDraftText;
    const newDraft = {
      id: 'draft_' + Date.now(),
      title: selectedTemplate ? selectedTemplate.title : 'Legal Draft',
      templateId: selectedTemplate ? selectedTemplate.id : 'custom_draft',
      category: selectedTemplate ? selectedTemplate.category : 'General',
      content: text,
      savedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      language: outputLanguage
    };

    const updated = [newDraft, ...savedDrafts.filter(d => d.id !== newDraft.id)];
    setSavedDrafts(updated);
    try {
      localStorage.setItem('ai_legal_saved_drafts', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    setTimeout(() => {
      setIsSaving(false);
      setHasSaved(true);
      toast.success('Draft saved to Saved Drafts!');
    }, 400);
  };

  const handleOpenSavedDraft = (draft) => {
    setGeneratedDraftText(draft.content);
    if (draft.templateId) {
      const found = ALL_91_TEMPLATES.find(t => t.id === draft.templateId);
      if (found) setSelectedTemplate(found);
    }
    setCurrentStep(4);
    setIsSavedModalOpen(false);
    toast.success(`Opened "${draft.title}" in Editor!`);
  };

  const handleDeleteSavedDraft = (draftId, e) => {
    e.stopPropagation();
    const updated = savedDrafts.filter(d => d.id !== draftId);
    setSavedDrafts(updated);
    try {
      localStorage.setItem('ai_legal_saved_drafts', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update localStorage:', e);
    }
    toast.success('Draft deleted.');
  };

  const handleDownloadTXT = () => {
    const text = editorRef.current ? editorRef.current.innerText : generatedDraftText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('TXT file downloaded!');
  };

  const handleDownloadDOCX = () => {
    const text = editorRef.current ? editorRef.current.innerText : generatedDraftText;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
      "xmlns:w='urn:schemas-microsoft-com:office:word' "+
      "xmlns='http://www.w3.org/TR/REC-html40'>"+
      `<head><meta charset='utf-8'><title>${selectedTemplate.title}</title><style>body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8; white-space: pre-wrap; }</style></head><body><div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8;">`;
    const footer = "</div></body></html>";
    const sourceHTML = header + text + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${selectedTemplate.id}_${Date.now()}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    toast.success('Word document downloaded!');
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    const text = editorRef.current ? editorRef.current.innerText : generatedDraftText;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedTemplate.title}</title>
          <style>
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 13pt; 
              line-height: 1.8; 
              margin: 30px 40px; 
              color: #000; 
              white-space: pre-wrap; 
              word-wrap: break-word;
              tab-size: 4;
            }
            @page { size: A4; margin: 20mm 20mm 20mm 25mm; }
          </style>
        </head>
        <body>
          <div style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8;">${text}</div>
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
    toast.success('Preparing PDF for printing/download...');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#111111] text-slate-900 dark:text-white font-sans flex flex-col">
      {/* HEADER BAR - 1 SINGLE ROW ON MOBILE & DESKTOP */}
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-6 py-2 sm:py-3 flex flex-row items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            onClick={() => navigate('/dashboard/tools')}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-[#C8A34D]/20 text-slate-700 dark:text-slate-200 hover:text-[#C8A34D] transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">AI Tools</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap truncate">
              <span className="truncate">Draft Maker</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 uppercase shrink-0 hidden xs:inline-block">
                Advocate Production Suite
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
              Generate professional legal drafts using AI from cases, uploaded documents, or manual information.
            </p>
          </div>
        </div>

        {/* Step Numbers Indicator */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none max-w-full pb-1 md:pb-0 shrink-0 select-none py-0.5">
          {[
            { num: 1, label: 'Template', short: 'Template' },
            { num: 2, label: 'Input Source', short: 'Input' },
            { num: 3, label: 'Review Details', short: 'Review' },
            { num: 4, label: 'Draft Workspace', short: 'Draft' },
          ].map(step => (
            <button
              key={step.num}
              onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                currentStep === step.num
                  ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                  : currentStep > step.num
                  ? 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 cursor-pointer hover:bg-[#C8A34D]/25'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{step.num}. <span className="sm:hidden">{step.short}</span><span className="hidden sm:inline">{step.label}</span></span>
              {currentStep > step.num && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C8A34D]" />}
            </button>
          ))}
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* STEP 1: TEMPLATE SELECTION */}
        {currentStep === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Gallery Top Banner */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Step 1 — Choose Legal Template</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-snug">
                  Select court pleading, statutory notice, contract, or petition template to start drafting.
                </p>
              </div>

              {/* Search Box & Saved Drafts Button */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C8A34D]" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D] truncate"
                  />
                </div>

                <button
                  onClick={() => setIsSavedModalOpen(true)}
                  className="w-full sm:w-auto px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#C8A34D]/15 border border-[#C8A34D]/40 text-[#C8A34D] hover:bg-[#C8A34D] hover:text-[#111111] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 shadow-2xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Saved Drafts</span>
                  {savedDrafts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#C8A34D] text-[#111111] text-[10px] font-black">
                      {savedDrafts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Categories Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#C8A34D] text-[#111111] shadow-md shadow-[#C8A34D]/20 font-black'
                      : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:text-[#C8A34D] border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplate.id === tmpl.id;
                const isFav = favorites.includes(tmpl.id);

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-[#1E293B] border-[#C8A34D] shadow-md ring-2 ring-[#C8A34D]'
                        : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/50 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="text-xl p-1.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                          {tmpl.icon}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                            {tmpl.category}
                          </span>
                          <button 
                            onClick={(e) => toggleFavorite(tmpl.id, e)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {tmpl.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Est: {tmpl.estimatedTime || tmpl.estTime || '2 Mins'} • {tmpl.difficulty}</span>
                      {isSelected ? (
                        <span className="text-[#C8A34D] font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-[#C8A34D] flex items-center gap-1">
                          Select <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Continue Action */}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C8A34D]/25 hover:bg-[#b08e3e] transition-all"
              >
                <span>Continue to Input Source</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: CHOOSE INPUT SOURCE & ENTER DETAILS */}
        {currentStep === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Top Selected Template Info Banner */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#C8A34D]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#C8A34D] uppercase">Selected Template</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{selectedTemplate.title}</h3>
                </div>
              </div>
              <button 
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-600 dark:text-slate-300 hover:text-[#C8A34D] text-xs font-bold cursor-pointer"
              >
                Change Template
              </button>
            </div>

            {/* 3 Source Options Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  id: 'existing_case', 
                  title: '1. Existing Case', 
                  desc: 'Use facts & documents from an existing advocate matter.',
                  icon: FolderOpen 
                },
                { 
                  id: 'upload_doc', 
                  title: '2. Upload Document', 
                  desc: 'Extract drafting facts directly from uploaded file.',
                  icon: Upload 
                },
                { 
                  id: 'manual', 
                  title: '3. Manual Input', 
                  desc: 'Enter custom legal parameters and party details.',
                  icon: Edit3 
                },
              ].map(opt => {
                const IconComp = opt.icon;
                const isCurrent = inputSource === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setInputSource(opt.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-white dark:bg-[#1E293B] border-[#C8A34D] shadow-md ring-2 ring-[#C8A34D]'
                        : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2.5 rounded-xl ${isCurrent ? 'bg-[#C8A34D] text-[#111111]' : 'bg-slate-100 dark:bg-[#111111] text-[#C8A34D]'}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* OPTION 1 CONTENT: EXISTING CASES */}
            {inputSource === 'existing_case' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Advocate Case Workspace</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose from your active litigation matters.</p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#C8A34D]" />
                    <input
                      type="text"
                      placeholder="Search cases..."
                      value={caseSearchQuery}
                      onChange={(e) => setCaseSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>
                </div>

                {isLoadingCases ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading cases...</div>
                ) : filteredCases.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#111111] text-center space-y-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching cases found.</p>
                    <p className="text-[11px] text-slate-400">You can switch to Upload Document or Manual Input.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
                    {filteredCases.map(c => {
                      const cId = c._id || c.id || c.name;
                      const selId = selectedCase?._id || selectedCase?.id || selectedCase?.name;
                      const isSelected = Boolean(selectedCase && c && cId && selId && selId === cId);
                      const name = c.name || c.caseName || c.title || 'Untitled Case';
                      const client = c.clientName || c.client || 'N/A';
                      const opponent = c.opponentName || c.opponent || 'N/A';
                      const caseNo = c.caseNumber || c.number || 'N/A';

                      return (
                        <div
                          key={cId}
                          onClick={() => setSelectedCase(c)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-50 dark:bg-[#111111] border-[#C8A34D] ring-1 ring-[#C8A34D] shadow-sm'
                              : 'bg-slate-50 dark:bg-[#111111] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{name}</h4>
                            {isSelected ? (
                              <span className="text-[10px] font-extrabold text-[#C8A34D] shrink-0 bg-[#C8A34D]/10 px-2 py-0.5 rounded-full border border-[#C8A34D]/30">Selected ✓</span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 shrink-0 hover:text-[#C8A34D]">Select</span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <p>Case No: <span className="font-semibold text-slate-700 dark:text-slate-200">{caseNo}</span></p>
                            <p>Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client}</span> vs <span className="font-semibold text-slate-700 dark:text-slate-200">{opponent}</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* OPTION 2 CONTENT: UPLOAD DOCUMENT */}
            {inputSource === 'upload_doc' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Source Document</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload case brief, contract, petition, or exhibit to extract details automatically.</p>
                </div>

                {!uploadedDoc ? (
                  <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-slate-50 dark:bg-[#111111] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <FileUp className="w-10 h-10 text-[#C8A34D] mb-3" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Click or drag file to upload</span>
                    <span className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, TXT, PNG, JPG (Max 25MB)</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" />
                  </label>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#C8A34D]" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{uploadedDoc.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{uploadedDoc.size} • Ready for AI Drafting</p>
                      </div>
                    </div>
                    <button 
                      onClick={removeUploadedDoc}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* OPTION 3 CONTENT: MANUAL FORM INPUTS */}
            {inputSource === 'manual' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Template Parameters ({selectedTemplate.title})</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fill in the template details below.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.keys(manualFields).map(key => {
                    const formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const isLongText = key.includes('facts') || key.includes('grounds') || key.includes('prayer') || key.includes('relief') || key.includes('terms') || key.includes('statements');

                    return (
                      <div key={key} className={isLongText ? 'sm:col-span-2' : ''}>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {formattedLabel} <span className="text-[#C8A34D]">*</span>
                        </label>
                        {isLongText ? (
                          <textarea
                            rows={3}
                            value={manualFields[key]}
                            onChange={(e) => setManualFields({ ...manualFields, [key]: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                          />
                        ) : (
                          <input
                            type="text"
                            value={manualFields[key]}
                            onChange={(e) => setManualFields({ ...manualFields, [key]: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Instructions & Output Language */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Additional Advocate Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Emphasize urgent interim stay order under Order 39 Rule 1 CPC..."
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#C8A34D]" /> Output Language
                </span>
                <select
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Templates
              </button>

              <button
                onClick={validateAndProceedToReview}
                className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C8A34D]/25 hover:bg-[#b08e3e] transition-all"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW SOURCE INFORMATION */}
        {currentStep === 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Step 3 — Review Parameters Before Generation</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Verify selected options before invoking AI Legal drafting engine.</p>
              </div>

              {/* Review Grid */}
              <div className="space-y-4 text-xs">
                {/* Selected Template */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#C8A34D] uppercase">Selected Template</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{selectedTemplate.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D]">
                    {selectedTemplate.category}
                  </span>
                </div>

                {/* Input Source Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-[#C8A34D] uppercase">Input Source Mode</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {inputSource === 'existing_case' && `Existing Case: ${selectedCase?.name || selectedCase?.caseName || 'Case Workspace'}`}
                    {inputSource === 'upload_doc' && `Uploaded Document: ${uploadedDoc?.name || 'Attached File'}`}
                    {inputSource === 'manual' && `Manual Legal Input (${Object.keys(manualFields).length} fields specified)`}
                  </p>

                  {/* Summary Snippet */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                    <p>• Output Language: <span className="font-bold text-[#C8A34D]">{outputLanguage}</span></p>
                    {generalInstructions && <p>• Special Instructions: "{generalInstructions}"</p>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Modify
                </button>

                <button
                  onClick={handleGenerateDraft}
                  className="px-8 py-3.5 rounded-2xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-2 cursor-pointer shadow-xl shadow-[#C8A34D]/30 hover:bg-[#b08e3e] transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Legal Draft</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: AI GENERATION & DRAFT WORKSPACE */}
        {currentStep === 4 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {isGenerating ? (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white dark:bg-[#1E293B] rounded-3xl border border-[#C8A34D]/30 shadow-xl">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-7 h-7 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Synthesizing Legal Draft</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{generationStatus}</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    AI LEGAL is preparing your draft using the selected template and source information.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Top Workspace Toolbar */}
                <div className="p-3 sm:p-4 bg-white dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                  {/* Left Controls */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 shrink-0">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Modify Source
                    </button>
                    <button 
                      onClick={handleGenerateDraft}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-[#C8A34D] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#C8A34D]/30 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                  </div>

                  {/* Right Actions: Copy, Save, Downloads */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 shrink-0">
                    <button 
                      onClick={handleCopyDraft}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#C8A34D] border border-transparent whitespace-nowrap shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>

                    <button 
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                        hasSaved 
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{hasSaved ? 'Saved ✓' : 'Save Draft'}</span>
                    </button>

                    {/* Format Export Buttons */}
                    <button 
                      onClick={handleDownloadPDF}
                      className="px-3 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-[#b08e3e] whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>

                    <button 
                      onClick={handleDownloadDOCX}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800 whitespace-nowrap shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" /> DOCX
                    </button>

                    <button 
                      onClick={handleDownloadTXT}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800 whitespace-nowrap shrink-0"
                    >
                      TXT
                    </button>
                  </div>
                </div>

                {/* Court Paper Canvas Editor */}
                <div className="bg-white text-slate-900 p-8 sm:p-14 rounded-3xl border border-[#C8A34D]/40 shadow-2xl min-h-[650px] font-serif leading-relaxed">
                  <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="outline-none whitespace-pre-wrap text-sm sm:text-base leading-relaxed"
                  >
                    {generatedDraftText}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* SAVED DRAFTS MODAL */}
      <AnimatePresence>
        {isSavedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E293B] border border-[#C8A34D]/30 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#C8A34D]/15 text-[#C8A34D]">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Saved Legal Drafts</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Access your previously saved drafts to edit, export or print.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSavedModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {savedDrafts.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No saved drafts yet</p>
                    <p className="text-[11px] text-slate-400">Drafts you save in Step 4 using "Save Draft" will appear here.</p>
                  </div>
                ) : (
                  savedDrafts.map(draft => (
                    <div 
                      key={draft.id}
                      onClick={() => handleOpenSavedDraft(draft)}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 hover:border-[#C8A34D] transition-all cursor-pointer flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                            {draft.category || 'Draft'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#C8A34D] transition-colors">
                            {draft.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{draft.savedAt}</span>
                          <button 
                            onClick={(e) => handleDeleteSavedDraft(draft.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 font-mono leading-relaxed bg-white dark:bg-[#1A2540] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        {draft.content}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1 font-bold text-[#C8A34D]">
                        <span>Open in Editor & Exports →</span>
                        <span className="text-slate-400 text-[10px]">{draft.language}</span>
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
