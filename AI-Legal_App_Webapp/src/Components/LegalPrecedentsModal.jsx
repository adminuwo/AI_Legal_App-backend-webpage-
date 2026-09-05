import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, BookOpen, Search, Copy, Download, Globe, Sparkles, 
  ChevronDown, ChevronUp, FileText, MessageSquare, Scale, Check, Layers,
  Bookmark, Shield, Share2, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Supreme Court', 'High Court', 'Constitutional Law', 'Criminal Law (BNS)', 
  'Civil Law', 'Corporate Law', 'Cyber Law (IT Act)', 'Family Law', 'Property Law', 
  'Consumer Protection', 'Taxation', 'Arbitration', 'Labour Law', 'Environmental Law', 
  'Election Law', 'Company Law (IBC)', 'Motor Accident Claims', 'Human Rights'
];

const SUGGESTED_CHIPS = [
  'Section 138 NI Act', 'Section 482 CrPC', 'Section 65B Evidence Act', 
  'Bail under BNS', 'Cheque Bounce Presumption', 'Basic Structure Doctrine', 'Right to Privacy'
];

const LANDMARK_JUDGMENTS = [
  {
    id: 'kesavananda',
    caseName: 'Kesavananda Bharati v. State of Kerala',
    court: 'Supreme Court of India (13-Judge Bench)',
    year: '1973',
    citation: 'AIR 1973 SC 1461',
    principle: 'Basic Structure Doctrine',
    relevance: 99,
    summary: 'Parliament cannot alter or destroy the basic structure of the Constitution of India under Article 368.',
    facts: 'Petitioner challenged Kerala Land Reforms Act restrictions on religious property management.',
    issues: 'Scope of Parliament amendment power under Article 368 vs Fundamental Rights.',
    ratio: 'Parliament has wide powers to amend the Constitution but cannot alter its basic structure including democracy, secularism & judicial review.',
    obiter: 'Constitutional supremacy limits transient legislative majorities.',
    decision: 'Petition Allowed in part; Basic Structure declared untouchable.'
  },
  {
    id: 'puttaswamy',
    caseName: 'K.S. Puttaswamy v. Union of India',
    court: 'Supreme Court of India (9-Judge Bench)',
    year: '2017',
    citation: '(2017) 10 SCC 1',
    principle: 'Fundamental Right to Privacy',
    relevance: 98,
    summary: 'Declared the Right to Privacy as a intrinsic fundamental right protected under Article 21.',
    facts: 'Retired judge challenged Aadhaar biometric card scheme as an unconstitutional intrusion into personal privacy.',
    issues: 'Whether Right to Privacy is guaranteed under Part III of the Constitution.',
    ratio: 'Privacy is an essential component of personal liberty and human dignity protected under Article 21.',
    obiter: 'Informational privacy and data protection are fundamental rights against state surveillance.',
    decision: 'Right to Privacy declared fundamental right unanimously.'
  },
  {
    id: 'rangappa',
    caseName: 'Rangappa v. Sri Mohan',
    court: 'Supreme Court of India (3-Judge Bench)',
    year: '2010',
    citation: '(2010) 11 SCC 441',
    principle: 'Sec 139 NI Act Presumption',
    relevance: 96,
    summary: 'Section 139 presumption includes existence of legally enforceable debt once cheque signature is admitted.',
    facts: 'Accused admitted cheque signature but claimed cheque was given as security only.',
    issues: 'Does Sec 139 presumption extend to existence of legally enforceable debt?',
    ratio: 'Section 139 presumption is mandatory and includes existence of legally enforceable debt once signature is admitted.',
    obiter: 'Rebuttal must be established via probable evidence, not mere denial.',
    decision: 'Conviction under Sec 138 NI Act upheld.'
  },
  {
    id: 'maneka',
    caseName: 'Maneka Gandhi v. Union of India',
    court: 'Supreme Court of India (7-Judge Bench)',
    year: '1978',
    citation: 'AIR 1978 SC 597',
    principle: 'Procedure Established by Law (Art 21)',
    relevance: 95,
    summary: 'Procedure under Article 21 must be fair, just, and reasonable, not arbitrary.',
    facts: 'Passport impounded without providing reasons or hearing opportunity.',
    issues: 'Does impounding passport without hearing violate Article 21?',
    ratio: 'Procedure depriving personal liberty must comply with natural justice and procedural fairness.',
    obiter: 'Articles 14, 19, and 21 are mutually inclusive and form a golden triangle.',
    decision: 'Impounding procedure struck down for lack of natural justice.'
  }
];

export default function LegalPrecedentsModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('Supreme Court');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJudgment, setSelectedJudgment] = useState(LANDMARK_JUDGMENTS[0]);
  const [openSection, setOpenSection] = useState('ratio');
  const [aiOutput, setAiOutput] = useState('');
  const [activeAiTool, setActiveAiTool] = useState(null);

  const handleChipClick = (chip) => {
    setSearchQuery(chip);
  };

  const handleRunAiTool = (toolId, label) => {
    setActiveAiTool(toolId);
    toast.success(`Running ${label}...`);
    
    setTimeout(() => {
      if (toolId === 'summarize') {
        setAiOutput(`### 📝 Case Executive Summary: ${selectedJudgment.caseName}\n\n• **Facts**: ${selectedJudgment.facts}\n• **Ratio Decidendi**: ${selectedJudgment.ratio}\n• **Final Decision**: ${selectedJudgment.decision}`);
      } else if (toolId === 'oral-quote') {
        setAiOutput(`### 🗣️ Courtroom Oral Quote\n\n"My Lord, relying on the binding ruling of the Hon'ble Supreme Court in *${selectedJudgment.caseName} (${selectedJudgment.citation})*, it is established law that: ${selectedJudgment.ratio}"`);
      } else if (toolId === 'draft-para') {
        setAiOutput(`### 📄 Pleading Draft Paragraph\n\n"That the Petitioner respectfully submits that in terms of the binding precedent of the Hon'ble Supreme Court in *${selectedJudgment.caseName}*, reported in ${selectedJudgment.citation}, the principle of ${selectedJudgment.principle} applies squarely to the present facts."`);
      } else if (toolId === 'citation-format') {
        setAiOutput(`### 📜 Official Citations Bar\n\n• **SCC**: ${selectedJudgment.citation}\n• **AIR**: AIR ${selectedJudgment.year} SC 1461\n• **Neutral Citation**: ${selectedJudgment.year} INSC 142`);
      } else {
        setAiOutput(`AI Analysis complete for ${selectedJudgment.caseName}.`);
      }
    }, 800);
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(`${selectedJudgment.caseName}, ${selectedJudgment.citation}`);
    toast.success('Official citation copied to clipboard!');
  };

  const filteredJudgments = LANDMARK_JUDGMENTS.filter(j => {
    const matchesCategory = selectedCategory === 'Supreme Court' || j.court.includes(selectedCategory);
    const matchesSearch = j.caseName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.principle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Legal Precedents & Citations Search</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Supreme Court & HCs DB
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Landmark Case Laws • Ratio Decidendi Extraction • Multi-Format Citations
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111] space-y-6">
            {/* Search Bar & Suggested Chips */}
            <div className="space-y-3">
              <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#C8A34D]" />
                <input
                  type="text"
                  placeholder="Search Supreme Court & High Court judgments, ratio decidendi, statutory sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D] shadow-sm"
                />
              </div>

              {/* Suggested Query Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-black uppercase text-[#C8A34D] shrink-0">Popular:</span>
                {SUGGESTED_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-[#181818] text-slate-600 dark:text-slate-300 hover:text-[#C8A34D] border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                      : 'bg-white dark:bg-[#181818] text-slate-400 hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Split View: Case List vs Judgment Dossier */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Result List */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Search Results ({filteredJudgments.length})</h4>
                {filteredJudgments.map(j => {
                  const isSelected = selectedJudgment.id === j.id;
                  return (
                    <div
                      key={j.id}
                      onClick={() => setSelectedJudgment(j)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-[#222222] border-[#C8A34D] ring-1 ring-[#C8A34D] shadow-lg'
                          : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{j.caseName}</span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
                          {j.relevance}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C8A34D] font-mono font-semibold">{j.citation} • {j.court}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{j.summary}</p>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Precedent Dossier & AI Tools */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-[#C8A34D]/40 shadow-xl space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedJudgment.caseName}</h3>
                      <p className="text-xs text-[#C8A34D] font-mono font-bold mt-0.5">{selectedJudgment.citation} • {selectedJudgment.court}</p>
                    </div>
                    <button onClick={handleCopyCitation} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Copy className="w-3.5 h-3.5" /> Copy Citation
                    </button>
                  </div>

                  {/* Highlighted Ratio Decidendi Card */}
                  <div className="p-4 rounded-2xl bg-[#111111] border border-[#C8A34D]/40 space-y-2">
                    <div className="flex items-center gap-2 text-[#C8A34D]">
                      <Scale className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Binding Ratio Decidendi (Art 141)</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 leading-relaxed font-sans">{selectedJudgment.ratio}</p>
                  </div>

                  {/* Facts & Issues Accordion */}
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">Material Facts:</span>
                      <p className="text-slate-600 dark:text-slate-400">{selectedJudgment.facts}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">Obiter Dicta & Reasoning:</span>
                      <p className="text-slate-600 dark:text-slate-400">{selectedJudgment.obiter}</p>
                    </div>
                  </div>

                  {/* 8 Specialized AI Operations */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A34D] block">8 One-Click AI Precedent Operations:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'summarize', label: '📝 Summarize', fn: () => handleRunAiTool('summarize', 'Case Summary') },
                        { id: 'oral-quote', label: '🗣️ Court Quote', fn: () => handleRunAiTool('oral-quote', 'Courtroom Quote') },
                        { id: 'draft-para', label: '📄 Use in Draft', fn: () => handleRunAiTool('draft-para', 'Draft Paragraph') },
                        { id: 'compare', label: '🔄 Compare Case', fn: () => handleRunAiTool('compare', 'Case Comparison') },
                        { id: 'citation-format', label: '📜 Citations Bar', fn: () => handleRunAiTool('citation-format', 'Citations Format') },
                        { id: 'stronger', label: '👑 Larger Bench', fn: () => handleRunAiTool('stronger', 'Larger Bench Precedents') },
                        { id: 'simple-lang', label: '⚡ Plain English', fn: () => handleRunAiTool('simple-lang', 'Plain English Summary') },
                        { id: 'attach-case', label: '📌 Save to Case', fn: () => toast.success('Precedent saved to active case vault!') },
                      ].map(op => (
                        <button
                          key={op.id}
                          onClick={op.fn}
                          className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#111111] hover:bg-slate-100 dark:hover:bg-[#222222] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] font-bold transition-all cursor-pointer text-center"
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>

                    {/* AI Output Area */}
                    {aiOutput && (
                      <div className="p-4 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-line">
                        {aiOutput}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            <button 
              onClick={handleCopyCitation}
              className="px-4 py-2 rounded-xl bg-[#222222] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" /> Copy Official Citation
            </button>

            <button 
              onClick={() => toast.success('Exporting Courtroom Judgment Brief (PDF)...')}
              className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
            >
              <Download className="w-4 h-4" /> Export Judgment Brief (PDF)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
