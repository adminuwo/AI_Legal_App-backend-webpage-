
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Search, ArrowRight, ArrowLeft, Upload, Sparkles, 
  Copy, Download, Globe, Heart, Bold, Italic, 
  Underline, AlignLeft, AlignCenter, AlignRight, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'All', 'Civil Pleadings', 'Criminal Petitions', 'Commercial Contracts', 
  'Property Agreements', 'Affidavits', 'Notices', 'Miscellaneous'
];

const TEMPLATES = [
  {
    id: 'legal_notice',
    title: 'Legal Notice for Breach of Contract',
    category: 'Notices',
    estTime: '2 Mins',
    difficulty: 'Easy',
    aiReady: true,
    description: 'Formal legal notice demanding performance or damages prior to civil litigation.',
    icon: '📄'
  },
  {
    id: 'demand_notice',
    title: 'Statutory Demand Notice',
    category: 'Notices',
    estTime: '3 Mins',
    difficulty: 'Easy',
    aiReady: true,
    description: 'Notice demanding outstanding payment under insolvency or commercial recovery laws.',
    icon: '💰'
  },
  {
    id: 'cheque_bounce',
    title: 'Cheque Bounce Notice (Sec 138 NI Act)',
    category: 'Notices',
    estTime: '2 Mins',
    difficulty: 'Medium',
    aiReady: true,
    description: '15-day statutory notice for dishonour of cheque under Section 138 Negotiable Instruments Act.',
    icon: '💳'
  },
  {
    id: 'bail_application_439',
    title: 'Regular Bail Application (Sec 439 CrPC / Sec 483 BNS)',
    category: 'Criminal Petitions',
    estTime: '4 Mins',
    difficulty: 'Advanced',
    aiReady: true,
    description: 'Formal petition before Sessions/High Court seeking regular bail during trial.',
    icon: '🛡️'
  },
  {
    id: 'writ_petition_civil',
    title: 'Writ Petition (Civil - Article 226/32)',
    category: 'Civil Pleadings',
    estTime: '5 Mins',
    difficulty: 'Advanced',
    aiReady: true,
    description: 'Constitutional writ petition seeking Mandamus, Certiorari or Prohibition against public authorities.',
    icon: '🏛️'
  },
  {
    id: 'mutual_divorce',
    title: 'Mutual Consent Divorce Petition (Sec 13B)',
    category: 'Family',
    estTime: '4 Mins',
    difficulty: 'Medium',
    aiReady: true,
    description: 'Joint petition under Hindu Marriage Act / Special Marriage Act for mutual dissolution.',
    icon: '❤️‍🩹'
  },
  {
    id: 'general_affidavit',
    title: 'General Sworn Affidavit',
    category: 'Affidavits',
    estTime: '1 Min',
    difficulty: 'Easy',
    aiReady: true,
    description: 'Sworn statement of facts verified before an Oath Commissioner or Notary Public.',
    icon: '📝'
  },
  {
    id: 'rental_agreement',
    title: 'Residential Lease & Rental Agreement',
    category: 'Property Agreements',
    estTime: '3 Mins',
    difficulty: 'Medium',
    aiReady: true,
    description: '11-month residential tenancy deed detailing rent, security deposit & lock-in terms.',
    icon: '🏠'
  },
  {
    id: 'employment_contract',
    title: 'Executive Employment Agreement',
    category: 'Commercial Contracts',
    estTime: '4 Mins',
    difficulty: 'Advanced',
    aiReady: true,
    description: 'Standard employment agreement with non-compete, NDA & termination clauses.',
    icon: '💼'
  },
  {
    id: 'power_of_attorney',
    title: 'General Power of Attorney (GPA)',
    category: 'Property Agreements',
    estTime: '3 Mins',
    difficulty: 'Medium',
    aiReady: true,
    description: 'Authorization deed empowering attorney-in-fact for legal & financial transactions.',
    icon: '⚖️'
  }
];

const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Telugu', 
  'Tamil', 'Bengali', 'Assamese', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia'
];

import { useNavigate } from 'react-router-dom';

export default function LegalDraftMakerModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isOpen) {
      navigate('/dashboard/tools/draft-maker');
      if (onClose) onClose();
    }
  }, [isOpen, navigate, onClose]);

  if (!isOpen) return null;
  
  // Step 2: Auto Extraction
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedFields] = useState({
    clientName: 'Rajesh Sharma',
    opponentName: 'Apex Logistics Pvt Ltd',
    courtName: 'High Court of Delhi',
    jurisdiction: 'New Delhi',
    incidentDate: '2026-01-14',
    claimAmount: '₹ 25,00,000/-',
  });

  // Step 3: Form Parameters
  const [formData, setFormData] = useState({
    courtName: 'High Court of Delhi, New Delhi',
    caseNumber: 'CS(COMM) 412/2026',
    petitioner: 'Rajesh Sharma, S/o Shri Om Prakash, R/o Sector 12, Dwarka, New Delhi',
    respondent: 'Apex Logistics Pvt Ltd, through its Managing Director, Connaught Place, New Delhi',
    facts: 'The Respondent defaulted on contractual payments amounting to Rs 25,00,000 despite multiple written reminders and invoice deliveries.',
    relief: 'Grant decree of Rs 25,00,000 along with 18% p.a. interest from the due date till actual realization.',
    outputLanguage: 'English',
    includeCitations: true,
  });

  // Step 4: Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Step 5: Canvas Editor Blocks
  const [draftBlocks, setDraftBlocks] = useState([]);

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' }))]);
      toast.success(`OCR Scan completed on ${files.length} document(s)`);
    }
  };

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const startGeneration = () => {
    setCurrentStep(4);
    setIsGenerating(true);
    setGenerationProgress(10);
    setProgressStatus('Preserving party names & territorial jurisdiction...');

    const statuses = [
      { pct: 30, text: 'Extracting statutory clauses under BNS / CPC...' },
      { pct: 60, text: 'Structuring formal legal prayer & verification affidavit...' },
      { pct: 85, text: 'Applying court-ready document layout & margins...' },
      { pct: 100, text: 'Draft compiled successfully!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setGenerationProgress(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsGenerating(false);
          buildDefaultCanvasText();
          setCurrentStep(5);
        }
      }, (idx + 1) * 1200);
    });
  };

  const buildDefaultCanvasText = () => {
    const blocks = [
      { id: 'b1', type: 'title', text: `IN THE ${formData.courtName.toUpperCase()}`, align: 'center', bold: true },
      { id: 'b2', type: 'heading2', text: `${formData.caseNumber ? `SUIT NO. ${formData.caseNumber.toUpperCase()}` : ''}`, align: 'center', bold: true },
      { id: 'b3', type: 'paragraph', text: `IN THE MATTER OF:\n${formData.petitioner.toUpperCase()}\n...PETITIONER / PLAINTIFF\n\nVERSUS\n\n${formData.respondent.toUpperCase()}\n...RESPONDENT / DEFENDANT`, align: 'left', bold: false },
      { id: 'b4', type: 'title', text: `${selectedTemplate.title.toUpperCase()}`, align: 'center', bold: true },
      { id: 'b5', type: 'heading1', text: 'MOST RESPECTFULLY SHOWETH:', align: 'left', bold: true },
      { id: 'b6', type: 'number', text: `1. That the Petitioner is a law-abiding citizen residing at the address mentioned in the cause title and is competent to file the present proceeding.`, align: 'left', bold: false },
      { id: 'b7', type: 'number', text: `2. That the Respondent entered into a commercial transaction with the Petitioner. ${formData.facts}`, align: 'left', bold: false },
      { id: 'b8', type: 'number', text: `3. That despite repeated oral requests and written communications, the Respondent failed and neglected to fulfill contractual obligations.`, align: 'left', bold: false },
      { id: 'b9', type: 'heading1', text: 'PRAYER', align: 'left', bold: true },
      { id: 'b10', type: 'paragraph', text: `In view of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:\n\na) ${formData.relief}\nb) Pass any such further order(s) as this Hon'ble Court deems fit in the interest of justice.`, align: 'left', bold: false },
      { id: 'b11', type: 'heading1', text: 'VERIFICATION', align: 'left', bold: true },
      { id: 'b12', type: 'paragraph', text: `Verified at New Delhi on this day that the contents of paragraphs 1 to 3 are true and correct to my knowledge. Nothing material has been concealed therefrom.`, align: 'left', bold: false },
      { id: 'b13', type: 'paragraph', text: `\n\n_______________________\nDEPONENT / PETITIONER\nTHROUGH ADVOCATE`, align: 'right', bold: true },
    ];
    setDraftBlocks(blocks);
  };

  const handleCopyDraft = () => {
    const fullText = draftBlocks.map(b => b.text).join('\n\n');
    navigator.clipboard.writeText(fullText);
    toast.success('Draft copied to clipboard!');
  };

  const handleExportDoc = (type) => {
    toast.success(`Exporting court-ready ${type.toUpperCase()} document...`);
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
                  <span>Legal Draft Maker</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Rolex Enterprise Engine
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 5 • {currentStep === 1 ? 'Select Template' : currentStep === 2 ? 'Auto-Extraction & Files' : currentStep === 3 ? 'Draft Parameters' : currentStep === 4 ? 'AI Generation' : 'Courtroom Workspace Canvas'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="px-8 py-3 bg-[#181818] border-b border-slate-800 flex items-center justify-between text-xs font-semibold shrink-0 overflow-x-auto">
            {[
              { num: 1, label: '1. Template' },
              { num: 2, label: '2. Auto-Extract' },
              { num: 3, label: '3. Form Inputs' },
              { num: 4, label: '4. AI Progress' },
              { num: 5, label: '5. Draft Workspace' },
            ].map(step => (
              <div 
                key={step.num}
                onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  currentStep === step.num
                    ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                    : currentStep > step.num
                    ? 'text-[#C8A34D]'
                    : 'text-slate-500'
                }`}
              >
                <span>{step.label}</span>
                {currentStep > step.num && <Check className="w-3.5 h-3.5" />}
              </div>
            ))}
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111]">
            {/* STEP 1: TEMPLATE & CATEGORY GALLERY */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Search & Categories */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#C8A34D]" />
                    <input
                      type="text"
                      placeholder="Search legal templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#222222] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-[#C8A34D] text-[#111111]'
                            : 'bg-white dark:bg-[#222222] text-slate-400 hover:text-white border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(tmpl => {
                    const isSelected = selectedTemplate.id === tmpl.id;
                    const isFav = favorites.includes(tmpl.id);

                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-white dark:bg-[#222222] border-[#C8A34D] shadow-lg shadow-[#C8A34D]/10 ring-1 ring-[#C8A34D]'
                            : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <span className="text-2xl">{tmpl.icon}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30">
                                {tmpl.category}
                              </span>
                              <button 
                                onClick={(e) => toggleFavorite(tmpl.id, e)}
                                className="p-1 hover:text-red-500 text-slate-500 transition-colors"
                              >
                                <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tmpl.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{tmpl.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span>Est: {tmpl.estTime} • {tmpl.difficulty}</span>
                          {isSelected && <span className="text-[#C8A34D] font-bold">Selected ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: AUTO EXTRACTION & DOCUMENT UPLOAD */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Smart AI Document Auto-Fill</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload case exhibits (PDF/Word/Images) to auto-populate party names, dates & facts.</p>
                </div>

                {/* Dropzone */}
                <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-white dark:bg-[#181818] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-[#C8A34D] mb-2" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Click to upload exhibits or drag & drop</span>
                  <span className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, PNG, JPG (OCR Text Extraction Active)</span>
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>

                {uploadedFiles.length > 0 && (
                  <div className="p-3 bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D]">
                    Uploaded {uploadedFiles.length} file(s) for OCR extraction.
                  </div>
                )}

                {/* Extracted Fields Confidence Map */}
                <div className="bg-white dark:bg-[#181818] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">AI Field Mapping & Confidence Scores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(extractedFields).map(([key, val]) => (
                      <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{val}</p>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30">
                          95% Match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FORM PARAMETERS & LANGUAGE */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Legal Draft Parameters</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review Court forum, party details and legal prayer statement.</p>
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Case / Suit Number</label>
                      <input 
                        type="text" 
                        value={formData.caseNumber}
                        onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Petitioner / Complainant Details</label>
                    <input 
                      type="text" 
                      value={formData.petitioner}
                      onChange={(e) => setFormData({ ...formData, petitioner: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Respondent / Accused Details</label>
                    <input 
                      type="text" 
                      value={formData.respondent}
                      onChange={(e) => setFormData({ ...formData, respondent: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Statement of Facts</label>
                    <textarea 
                      rows={3}
                      value={formData.facts}
                      onChange={(e) => setFormData({ ...formData, facts: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>

                  {/* Language Selector */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-[#C8A34D]" /> Output Language
                      </span>
                    </div>
                    <select
                      value={formData.outputLanguage}
                      onChange={(e) => setFormData({ ...formData, outputLanguage: e.target.value })}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                    >
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: AI PROGRESS LOADING */}
            {currentStep === 4 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Synthesizing Court-Ready Legal Draft</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                </div>
              </div>
            )}

            {/* STEP 5: WORKSPACE CANVAS & EDITOR */}
            {currentStep === 5 && (
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Toolbar */}
                <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shadow-sm">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><Bold className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><Italic className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><AlignLeft className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><AlignCenter className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111111] text-slate-600 dark:text-slate-300"><AlignRight className="w-4 h-4" /></button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleCopyDraft} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" /> Copy Draft
                    </button>
                    <button onClick={() => handleExportDoc('pdf')} className="px-3 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md">
                      <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Court Paper Canvas */}
                <div className="p-8 sm:p-12 bg-white text-slate-900 rounded-3xl border border-[#C8A34D]/40 shadow-2xl space-y-6 font-serif min-h-[500px]">
                  {draftBlocks.map(block => (
                    <div key={block.id} className={`text-${block.align} ${block.bold ? 'font-bold' : ''}`}>
                      <p className="whitespace-pre-line text-sm leading-relaxed tracking-normal">{block.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep > 1 && currentStep !== 4 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl bg-[#222222] text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {currentStep < 3 && (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button 
                onClick={startGeneration}
                className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Generate Legal Draft
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
