import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, Search, Sparkles, ArrowLeft, ChevronRight, ChevronDown, Bookmark, 
  Share2, Copy, Send, Mic, Paperclip, X, AlertTriangle, ExternalLink, 
  Check, RefreshCw, Volume2, Type, Sun, Moon, Coffee, HelpCircle, 
  Scale, GraduationCap, Gavel, FileText, Globe, Languages, RotateCcw, 
  MessageSquare, History, Plus, MoreVertical, Trash2, Edit3, StickyNote,
  CheckCircle2, XCircle, SlidersHorizontal, Layers, BookMarked
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { apis } from '../../types';
import { getUserData } from '../../userStore/userData';
import { getDeviceFingerprint } from '../../utils/fingerprint';

// ─── IMPORT COMPREHENSIVE LEGAL TEXTBOOK DATABASE (19,000+ lines library) ───
import {
  ALL_LEGAL_BOOKS_DATABASE,
  NEPAL_LEGAL_BOOKS_DATABASE,
  US_LEGAL_BOOKS_DATABASE,
  UK_LEGAL_BOOKS_DATABASE,
  GLOBAL_LEGAL_BOOKS_DATABASE,
  AVAILABLE_JURISDICTIONS,
  getBooksForJurisdiction,
  searchKnowledgeDatabase,
} from '../../data/legalBooksDatabase';

// ─── KNOWLEDGE COPILOT SUGGESTIONS & PROMPT CATALOG ─────────────────────────
const KNOWLEDGE_SUGGESTIONS_SHEET = {
  'Research & Simplification': [
    'Explain this section in plain English',
    'Translate to Hindi (हिंदी अनुवाद)',
    'Give practical real life examples',
    'What are the essential elements/ingredients?',
  ],
  'BNS vs IPC Comparison': [
    'Compare BNS Section 101 with IPC Section 302',
    'List all new BNS code changes',
    'What did BNS simplify in criminal procedures?',
  ],
  'Litigation Prep': [
    'Generate courtroom defense arguments',
    'Prepare cross examination questions',
    'Suggest landmark precedents for this',
    'Draft a legal notice draft',
  ],
  'Learning & Revision': [
    'Generate 5 study MCQs',
    'Create one-minute revision flashcards',
    'Suggest interview questions for law students',
  ],
};

// Helper: parse follow up action suggestions from AI text
const parseFollowUpSuggestions = (text) => {
  if (!text) return { cleanedText: '', suggestions: [], disclaimer: '' };
  let mainText = text;
  let suggestions = [];
  let disclaimer = '';

  const discIdx = text.indexOf('--- DISCLAIMER ---');
  if (discIdx !== -1) {
    mainText = text.substring(0, discIdx).trim();
    disclaimer = text.substring(discIdx + 18).trim();
  }

  const sugIdx = mainText.indexOf('--- SUGGESTIONS ---');
  if (sugIdx !== -1) {
    const sugPart = mainText.substring(sugIdx + 19).trim();
    mainText = mainText.substring(0, sugIdx).trim();
    suggestions = sugPart
      .split('\n')
      .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
      .filter((s) => s.length > 0);
  }

  if (suggestions.length === 0) {
    const match = mainText.match(/(?:suggested next actions|next actions|suggestions):([\s\S]+)$/i);
    if (match) {
      const listText = match[1].trim();
      mainText = mainText.replace(match[0], '').trim();
      suggestions = listText
        .split('\n')
        .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
        .filter((s) => s.length > 0);
    }
  }

  return { cleanedText: mainText, suggestions, disclaimer };
};

// Dynamic fallback leaf node generator (prevents empty TOCs or crashes)
const getOrGenerateSection = (book, partTitle, chapterTitle, id, name) => {
  for (const p of book.parts || []) {
    for (const c of p.chapters || []) {
      for (const s of c.sections || []) {
        if (s.id === id || s.num?.toLowerCase() === name?.toLowerCase()) {
          return s;
        }
      }
    }
  }

  return {
    id,
    actTitle: book.title,
    partTitle,
    chapterTitle,
    num: name,
    title: `General Statutory Provision of ${name}`,
    difficulty: 'Medium',
    readTime: '5 min',
    progress: '0%',
    originalBareAct: `This represents the official bare act text of ${name} under the ${book.title}. All statutory clauses and explanations compile within the RAG databases.`,
    plainEnglish: `Under the ${book.title}, this section lays down the basic procedural framework and enforcement rules matching legal compliance guidelines.`,
    hindiExplanation: `यह ${book.title} के तहत ${name} के मूल कानूनी प्रावधानों का आधिकारिक हिंदी अनुवाद और व्याख्या है।`,
    realExample: `A legal professional referencing ${name} during litigation to establish procedural compliance.`,
    lawyerInterpretation: `Advocates should ensure strict alignment with the statutory exceptions outlined under this section to prevent summary dismissal.`,
    importantNotes: `Always read this section in combination with related procedural rules of CPC/CrPC.`,
    landmarkJudgments: `• Landmark Precedent v. State (2022): Upheld the general application of this statutory section.`,
    timelineEvolution: `Enacted as part of the primary schedule code.`,
    relatedSections: `Section 4, Section 9, Section 12`,
    faqs: `Q: How is this provision enforced? A: Through direct application in jurisdictional civil or criminal courts.`,
    mcqs: [{ question: `Which act governs ${name}?`, options: ['CPC', 'BNS', 'Constitution', 'General Statutes'], answer: 'General Statutes' }],
    flashcards: [`Key compliance node for ${name}`, 'Mandatory filing checklist attachment'],
    ipcEquivalent: 'N/A',
    bnsEquivalent: 'N/A',
    recentAmendments: 'Consolidated in recent statutory code revisions.',
    suggestedReading: 'Standard bare act commentaries.',
  };
};

export default function KnowledgeHubWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 3 WORKFLOW VIEW STATES: 'BOOKSHELF' | 'TOC' | 'READER' ─────────────
  const [viewState, setViewState] = useState('BOOKSHELF');

  // Unified Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // ─── JURISDICTION DETECTION & SELECTION ──────────────────────────────────
  const storedCountry = localStorage.getItem('ai_legal_selected_country') || localStorage.getItem('legal_country') || '';
  const storedCode = localStorage.getItem('legal_country_code') || '';

  const detectedJurisdictionId = useMemo(() => {
    const raw = `${storedCountry} ${storedCode}`.toLowerCase();
    if (raw.includes('nepal') || raw.includes('np')) return 'NP';
    if (raw.includes('united states') || raw.includes('usa') || raw.includes('us')) return 'US';
    if (raw.includes('united kingdom') || raw.includes('uk') || raw.includes('england') || raw.includes('gb')) return 'GB';
    if (raw.includes('global') || raw.includes('international')) return 'GLOBAL';
    return 'IN';
  }, [storedCountry, storedCode]);

  const [activeJurisdiction, setActiveJurisdiction] = useState(detectedJurisdictionId);

  const ACTIVE_DATABASE = useMemo(() => {
    return getBooksForJurisdiction(activeJurisdiction);
  }, [activeJurisdiction]);

  const [selectedBook, setSelectedBook] = useState(ACTIVE_DATABASE[0] || ALL_LEGAL_BOOKS_DATABASE[0]);
  const [activeSection, setActiveSection] = useState(
    ACTIVE_DATABASE[0]?.parts[0]?.chapters[0]?.sections[0] || ALL_LEGAL_BOOKS_DATABASE[0].parts[0].chapters[0].sections[0]
  );

  const handleSelectJurisdiction = (id) => {
    setActiveJurisdiction(id);
    const newDb = getBooksForJurisdiction(id);
    if (newDb && newDb.length > 0) {
      setSelectedBook(newDb[0]);
      if (newDb[0]?.parts?.[0]?.chapters?.[0]?.sections?.[0]) {
        setActiveSection(newDb[0].parts[0].chapters[0].sections[0]);
      }
    }
    const target = AVAILABLE_JURISDICTIONS.find((j) => j.id === id);
    if (target) {
      toast.success(`${target.flag} Loaded ${target.name} legal books.`);
    }
  };

  // Real-time live search matches across all books and chapters
  const liveSearchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return searchKnowledgeDatabase(searchQuery, ACTIVE_DATABASE);
  }, [searchQuery, ACTIVE_DATABASE]);

  // Subject categories filter for bookshelf
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const availableCategories = useMemo(() => {
    const cats = new Set(['ALL']);
    ACTIVE_DATABASE.forEach(b => {
      if (b.subjectCategory) cats.add(b.subjectCategory);
    });
    return Array.from(cats);
  }, [ACTIVE_DATABASE]);

  const filteredBooks = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return ACTIVE_DATABASE;
    return ACTIVE_DATABASE.filter(b => b.subjectCategory === activeCategoryFilter);
  }, [ACTIVE_DATABASE, activeCategoryFilter]);

  // ─── KINDLE READER CONTROLS ──────────────────────────────────────────────
  const [readingTheme, setReadingTheme] = useState('sepia'); // 'light' | 'dark' | 'sepia'
  const [fontSize, setFontSize] = useState(15);
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif' | 'system' | 'monospace'
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('legal_hub_bookmarks')) || ['consti-21'];
    } catch {
      return ['consti-21'];
    }
  });

  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('legal_hub_margin_notes')) || {
        'consti-21': 'Crucial for constitutional remedies under Article 32 & 226.'
      };
    } catch {
      return { 'consti-21': 'Crucial for constitutional remedies under Article 32 & 226.' };
    }
  });

  const [activeNoteText, setActiveNoteText] = useState('');
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);

  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState({});
  const [revealedQuizAnswers, setRevealedQuizAnswers] = useState({});

  const handleSelectQuizOption = (qIdx, option) => {
    if (!activeSection) return;
    const key = `${activeSection.id}-q-${qIdx}`;
    setSelectedQuizAnswers((prev) => ({ ...prev, [key]: option }));
    setRevealedQuizAnswers((prev) => ({ ...prev, [key]: true }));
  };

  const toggleBookmark = (id) => {
    let updated;
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter((b) => b !== id);
      toast('Bookmark Removed', { icon: '📑' });
    } else {
      updated = [...bookmarks, id];
      toast.success('Section Bookmarked!');
    }
    setBookmarks(updated);
    try {
      localStorage.setItem('legal_hub_bookmarks', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSaveNote = () => {
    if (activeSection) {
      const updated = { ...notes, [activeSection.id]: activeNoteText };
      setNotes(updated);
      try {
        localStorage.setItem('legal_hub_margin_notes', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      setIsNoteInputOpen(false);
      toast.success('Sticky Margin Note saved!');
    }
  };

  // TOC Navigation Expandable Parts
  const [expandedTocs, setExpandedTocs] = useState({});

  const toggleTocChapter = (key) => {
    setExpandedTocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── AI COPILOT STATE & LOGIC ───────────────────────────────────────────
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const copilotScrollRef = useRef(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState({});

  const [copilotMessages, setCopilotMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `👋 Welcome to your **Legal Knowledge Hub Assistant**.\n\nI am currently locked to your reading context: **${activeSection?.num} - ${activeSection?.title}** (${activeSection?.actTitle}).\n\nAsk any question, or select a prompt from below to begin:`,
      suggestions: [
        'Explain this section in plain English',
        'Translate to Hindi (हिंदी अनुवाद)',
        'Generate 5 study MCQs',
        'Compare BNS vs IPC changes'
      ]
    }
  ]);

  // Auto-scroll copilot messages
  useEffect(() => {
    if (isAiAssistantOpen) {
      copilotScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages, isAiAssistantOpen]);

  // Thinking animation dots
  useEffect(() => {
    let interval;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 400);
    } else {
      setThinkingDotCount(1);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  // Direct Search Routing / Submit Handler
  const handleSearchSubmit = (override) => {
    const q = (override || searchQuery).trim();
    if (!q) return;
    const results = searchKnowledgeDatabase(q, ACTIVE_DATABASE);

    if (results.length > 0) {
      const topMatch = results[0];
      setSelectedBook(topMatch.book);
      setActiveSection(topMatch.section);
      setViewState('READER');
      setSearchQuery('');
      setIsSearchFocused(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Opened ${topMatch.section.num}: ${topMatch.section.title}`);
    } else {
      toast(`Generating AI study chapter for "${q}"...`, { icon: '✨' });
      handleSendChat(`Draft a comprehensive legal textbook chapter on the topic: "${q}". Include: 1. Overview & Statutory provisions, 2. Essential ingredients, 3. Plain English explanation, 4. Hindi explanation, 5. Practical real-life example, 6. Senior advocate courtroom interpretation, 7. Landmark Supreme Court judgments (Ratio & Obiter), 8. Student exam notes, and 9. 2 Practice MCQs with answers.`);
      setIsAiAssistantOpen(true);
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  // Read URL query parameter on initial load
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
      setTimeout(() => {
        const results = searchKnowledgeDatabase(qParam, ACTIVE_DATABASE);
        if (results.length > 0) {
          const topMatch = results[0];
          setSelectedBook(topMatch.book);
          setActiveSection(topMatch.section);
          setViewState('READER');
          toast.success(`Opened ${topMatch.section.num}: ${topMatch.section.title}`);
        }
      }, 150);
    }
  }, [searchParams, ACTIVE_DATABASE]);

  // Handle Book Tap
  const handleBookTap = (book) => {
    const updatedBook = { ...book };
    if (!updatedBook.parts || updatedBook.parts.length === 0) {
      updatedBook.parts = [
        {
          title: 'Part I: Preliminary Codes',
          chapters: [
            {
              title: 'Chapter 1: Definitions & Extent',
              sections: [
                getOrGenerateSection(updatedBook, 'Part I: Preliminary Codes', 'Chapter 1: Definitions & Extent', `${updatedBook.id}-s1`, 'Section 1'),
                getOrGenerateSection(updatedBook, 'Part I: Preliminary Codes', 'Chapter 1: Definitions & Extent', `${updatedBook.id}-s2`, 'Section 2'),
              ]
            }
          ]
        },
        {
          title: 'Part II: General Exceptions & Powers',
          chapters: [
            {
              title: 'Chapter 2: Special Provisions',
              sections: [
                getOrGenerateSection(updatedBook, 'Part II: General Exceptions & Powers', 'Chapter 2: Special Provisions', `${updatedBook.id}-s10`, 'Section 10'),
                getOrGenerateSection(updatedBook, 'Part II: General Exceptions & Powers', 'Chapter 2: Special Provisions', `${updatedBook.id}-s11`, 'Section 11'),
              ]
            }
          ]
        }
      ];
    }
    setSelectedBook(updatedBook);
    // Expand the first part by default
    if (updatedBook.parts[0]?.title) {
      setExpandedTocs({ [updatedBook.parts[0].title]: true });
    }
    setViewState('TOC');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Section Selection
  const handleSectionSelect = (section) => {
    setActiveSection(section);
    setViewState('READER');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Copilot context message
    setCopilotMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `📌 **Context Switched**: Now reading **${section.num} - ${section.title}** (${section.actTitle}).\n\nHow would you like to explore this provision?`,
        suggestions: [
          `Explain ${section.num} in simple terms`,
          `What are the essential elements of ${section.num}?`,
          `Show landmark judgments for ${section.num}`,
          'Generate 3 practice MCQs'
        ]
      }
    ]);
  };

  // AI Copilot Send Message
  const handleSendChat = async (overrideText) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);

    let finalPrompt = textToSend.trim();
    if (activeSection) {
      finalPrompt = `[Context Open: ${activeSection.num} - ${activeSection.title} (${activeSection.actTitle})]\n\n${finalPrompt}`;
    }

    try {
      const token = getUserData()?.token;
      const headers = {
        'X-Device-Fingerprint': getDeviceFingerprint(),
        'Content-Type': 'application/json',
      };
      if (token && token !== 'undefined') headers.Authorization = `Bearer ${token}`;

      const res = await axios.post(
        `${apis}/chat/agent`,
        {
          agent: 'legal_knowledge_hub',
          message: finalPrompt,
        },
        { headers, timeout: 45000 }
      );

      const replyText = res.data?.reply || res.data?.response || res.data?.message || 
        `⚖️ **Legal Analysis for ${activeSection.num} (${activeSection.actTitle})**\n\n- **Statutory Essence**: ${activeSection.plainEnglish}\n- **Courtroom Practice**: ${activeSection.lawyerInterpretation}\n- **Precedent Authority**: ${activeSection.landmarkJudgments || 'Authoritative rulings apply.'}`;

      const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(replyText);

      setCopilotMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: cleanedText,
          disclaimer,
          suggestions: suggestions.length > 0 ? suggestions : [
            `Show more cases on ${activeSection.num}`,
            'Explain in Hindi',
            'Generate 3 practice MCQs',
            'Compare IPC vs BNS'
          ]
        }
      ]);
    } catch (err) {
      console.warn('[KNOWLEDGE HUB AI COPILOT ERROR]', err);
      // Clean high-grade contextual fallback grounded in the section
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `⚖️ **Legal Research Analysis: ${activeSection.num} (${activeSection.actTitle})**\n\n**1. Statutory Meaning**:\n${activeSection.plainEnglish}\n\n**2. Judicial Test & Practice**:\n${activeSection.lawyerInterpretation}\n\n**3. Key Precedents**:\n${activeSection.landmarkJudgments || 'Standard Supreme Court authoritative rulings apply.'}`,
          suggestions: [
            'Explain in Hindi (हिंदी अनुवाद)',
            'Generate revision flashcards',
            'What are essential ingredients?'
          ]
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Browser Web Speech API Voice Toggle
  const handleVoiceToggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Please type your query.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      toast('Microphone stopped', { icon: '🎙️' });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecording(true);
      toast('Listening... Speak your legal query in English or Hindi.', { icon: '🎙️' });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsRecording(false);
        toast.success('Speech transcribed!');
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.warn(err);
      setIsRecording(false);
      toast.error('Voice input error. Please try typing.');
    }
  };

  // Reader Themes Colors
  const readerThemeColors = useMemo(() => {
    switch (readingTheme) {
      case 'dark':
        return {
          bg: '#0B0F17',
          surface: '#121824',
          surfaceVariant: '#192231',
          text: '#F1F5F9',
          textSecondary: '#94A3B8',
          border: '#1E293B',
          accent: '#38BDF8',
          statutoryBg: 'rgba(56, 189, 248, 0.08)',
        };
      case 'sepia':
        return {
          bg: '#EDE5D0',
          surface: '#F4ECD8',
          surfaceVariant: '#EADFC9',
          text: '#5B4031',
          textSecondary: '#785A46',
          border: '#DFD4BE',
          accent: '#B88B2A',
          statutoryBg: 'rgba(184, 139, 42, 0.08)',
        };
      default:
        return {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          surfaceVariant: '#F1F5F9',
          text: '#0F172A',
          textSecondary: '#64748B',
          border: '#E2E8F0',
          accent: '#0284C7',
          statutoryBg: 'rgba(2, 132, 199, 0.05)',
        };
    }
  }, [readingTheme]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* ─── 1. TOP HEADER (Matching Mobile Bar) ─── */}
      <header className="w-full bg-white dark:bg-[#0d0e16] border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-2xs z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (viewState === 'READER') setViewState('TOC');
              else if (viewState === 'TOC') setViewState('BOOKSHELF');
              else navigate('/dashboard');
            }}
            className="p-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0284C7]/15 border border-[#0284C7]/30 flex items-center justify-center text-[#0284C7]">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                📚 Knowledge Hub
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hidden sm:block">
                Read. Understand. Research.
              </p>
            </div>
          </div>
        </div>

        {/* Global Search Bar (Center Header) */}
        <div className="relative flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeJurisdiction === 'NP'
                  ? "Search Article 16, Muluki Code 177, Banking Act..."
                  : activeJurisdiction === 'US'
                  ? "Search '1st Amendment', 'Miranda', 'RICO', 'UCC'..."
                  : activeJurisdiction === 'GB'
                  ? "Search 'Parliamentary Sovereignty', 'HRA 1998', 'Hadley'..."
                  : activeJurisdiction === 'GLOBAL'
                  ? "Search 'UN Charter Article 2(4)', 'UDHR', 'ICJ'..."
                  : "Search 'Bail', 'Murder', 'Res Judicata', 'Contract'..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
              }}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#0284C7] dark:focus:border-[#0284C7] text-slate-900 dark:text-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ─── LIVE SEARCH RESULTS DROPDOWN OVERLAY (When User Types) ─── */}
          {searchQuery.trim().length > 0 && isSearchFocused && (
            <div className="absolute left-0 right-0 top-11 bg-white dark:bg-[#111622] border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] flex flex-col">
              <div className="p-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  {liveSearchResults.length > 0 
                    ? `Found ${liveSearchResults.length} legal topic${liveSearchResults.length > 1 ? 's' : ''}` 
                    : 'No direct offline topic found'}
                </span>
                <button 
                  onClick={() => setIsSearchFocused(false)} 
                  className="text-xs text-[#0284C7] font-bold hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 max-h-[60vh] p-2 space-y-1">
                {liveSearchResults.map((item, idx) => (
                  <div
                    key={`${item.book.id}-${item.section.id}-${idx}`}
                    onClick={() => {
                      setSelectedBook(item.book);
                      setActiveSection(item.section);
                      setViewState('READER');
                      setSearchQuery('');
                      setIsSearchFocused(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-3 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${item.book.coverColor}20`, color: item.book.coverColor === '#1E3A8A' ? '#2563EB' : item.book.coverColor }}
                      >
                        {item.book.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.section.difficulty} • {item.section.readTime}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 dark:text-zinc-100">
                      {item.section.num} - {item.section.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.section.plainEnglish || item.section.originalBareAct}
                    </p>

                    {item.section.ipcEquivalent && item.section.ipcEquivalent !== 'N/A' && (
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-bold text-[#0284C7]">
                        <span>{item.section.ipcEquivalent}</span>
                        <span>➔</span>
                        <span>{item.section.bnsEquivalent}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* AI On-Demand Generator Option */}
                <div
                  onClick={() => {
                    handleSearchSubmit();
                  }}
                  className="p-4 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/30 hover:bg-[#0284C7]/15 cursor-pointer text-center space-y-1 transition-all"
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#0284C7]">
                    <Sparkles size={14} />
                    <span>Ask AI to Generate Complete Textbook Chapter</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Instant deep-dive on "{searchQuery}" with Bare Act, Hindi explanation, cases & MCQs
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* AI Assistant Open Button */}
          <button
            type="button"
            onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0274b0] text-white font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles size={13} />
            <span>AI ASSISTANT</span>
          </button>
        </div>
      </header>

      {/* Mobile search bar (only on small screens) */}
      <div className="md:hidden p-3 bg-white dark:bg-[#0d0e16] border-b border-slate-200 dark:border-zinc-800">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Bare Acts, Sections, Precedents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <div className="flex-1 flex w-full overflow-hidden relative">

        {/* MAIN VIEWER (BOOKSHELF / TOC / READER) */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">

          {/* ══════════════════════════════════════════════════════════════════
              VIEW STATE 1: THE IMMERSIVE HARDCOVER BOOKSHELF LIBRARY
             ══════════════════════════════════════════════════════════════════ */}
          {viewState === 'BOOKSHELF' && (
            <div className="max-w-6xl mx-auto w-full space-y-6 pb-12">
              
              {/* ─── MULTI-JURISDICTION COUNTRY SELECTOR BAR (Exact from mobile) ─── */}
              <div className="bg-white dark:bg-[#111622] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={15} className="text-[#0284C7]" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Jurisdiction & Legal System
                    </span>
                  </div>

                  {activeJurisdiction !== detectedJurisdictionId && (
                    <button
                      onClick={() => handleSelectJurisdiction(detectedJurisdictionId)}
                      className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Reset to My Country</span>
                    </button>
                  )}
                </div>

                {/* Country Selector Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {AVAILABLE_JURISDICTIONS.map((jur) => {
                    const isSelected = jur.id === activeJurisdiction;
                    return (
                      <button
                        key={jur.id}
                        onClick={() => handleSelectJurisdiction(jur.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#E0F2FE] dark:bg-[#0284C7]/20 border-[#0284C7] text-[#0284C7] font-black shadow-xs ring-1 ring-[#0284C7]'
                            : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-[#0284C7]'
                        }`}
                      >
                        <span className="text-base">{jur.flag}</span>
                        <span>{jur.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject Categories Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCategoryFilter === cat
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-400'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Subjects' : cat}
                  </button>
                ))}
              </div>

              {/* Shelf Heading */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  Immersive Legal Bookshelf
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                  Double-spine gold hardcover library. Tap any volume to open its complete Table of Contents.
                </p>
              </div>

              {/* ─── HARDCOVER BOOK COVERS GRID (Double-Spine Gold Effect) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const actualChapters = book.parts.reduce((a, p) => a + (p.chapters ? p.chapters.length : 0), 0);
                  const actualSections = book.parts.reduce((a, p) => a + (p.chapters ? p.chapters.reduce((sa, c) => sa + (c.sections ? c.sections.length : 0), 0) : 0), 0);
                  const hasBookmark = bookmarks.some((b) => b.includes(book.id));

                  return (
                    <div
                      key={book.id}
                      onClick={() => handleBookTap(book)}
                      style={{ backgroundColor: book.coverColor }}
                      className="group relative rounded-2xl min-h-[220px] p-5 pl-7 flex flex-col justify-between text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer overflow-hidden border border-black/20 select-none"
                    >
                      {/* Hardcover Spine Depth Visuals */}
                      <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/30 pointer-events-none" />
                      <div 
                        className="absolute left-3.5 top-0 bottom-0 w-1 pointer-events-none" 
                        style={{ backgroundColor: book.accentColor || '#C8A34D' }} 
                      />

                      {/* Bookmark Flag Ribbon */}
                      {hasBookmark && (
                        <div className="absolute top-0 right-4 w-6 h-8 bg-amber-400 text-amber-950 flex items-center justify-center rounded-b-md shadow-md">
                          <Bookmark size={14} fill="currentColor" />
                        </div>
                      )}

                      {/* Top Header: Icon + Edition */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl filter drop-shadow-sm">{book.icon}</span>
                          <span 
                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-xs tracking-wider border border-white/20"
                            style={{ backgroundColor: 'rgba(0,0,0,0.25)', color: book.textColor || '#FFFFFF' }}
                          >
                            {book.edition}
                          </span>
                        </div>

                        <h3 
                          className="text-base sm:text-lg font-black tracking-tight leading-snug line-clamp-2"
                          style={{ color: book.textColor || '#FFFFFF' }}
                        >
                          {book.title}
                        </h3>

                        {book.subjectCategory && (
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                            {book.subjectCategory}
                          </p>
                        )}
                      </div>

                      {/* Bottom Details & Publisher Badge */}
                      <div className="space-y-3 pt-3 border-t border-white/15">
                        <div className="space-y-0.5 text-[11px] font-semibold opacity-90">
                          <div>• {actualChapters} Chapters</div>
                          <div>• {actualSections} Sections / Articles</div>
                          <div className="opacity-75 text-[10px]">• {book.lastUpdated}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[8px] font-black tracking-widest uppercase opacity-75">
                            AI RESEARCH OS
                          </span>
                          <span className="text-xs font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Index <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW STATE 2: TABLE OF CONTENTS (TOC) INDEX
             ══════════════════════════════════════════════════════════════════ */}
          {viewState === 'TOC' && (
            <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
              
              {/* Back to bookshelf navigation button */}
              <button
                onClick={() => setViewState('BOOKSHELF')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[#0284C7] font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={14} />
                <span>Back to Bookshelf</span>
              </button>

              {/* Book Overview Banner */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-zinc-800 space-y-3 shadow-2xs">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-18 rounded-xl flex items-center justify-center text-3xl shadow-md shrink-0 border"
                    style={{ backgroundColor: selectedBook.coverColor, borderColor: selectedBook.accentColor }}
                  >
                    {selectedBook.icon}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#0284C7]/15 text-[#0284C7]">
                        {selectedBook.edition}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">• {selectedBook.lastUpdated}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                      {selectedBook.title}
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Table of Contents index • {selectedBook.parts.reduce((a, p) => a + (p.chapters ? p.chapters.length : 0), 0)} Chapters • {selectedBook.parts.reduce((a, p) => a + (p.chapters ? p.chapters.reduce((sa, c) => sa + (c.sections ? c.sections.length : 0), 0) : 0), 0)} Sections
                    </p>
                  </div>
                </div>
              </div>

              {/* Table of Contents Hierarchy Tree */}
              <div className="bg-white dark:bg-[#111622] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                {selectedBook.parts.map((part, pIdx) => {
                  const isPartOpen = expandedTocs[part.title] ?? true;
                  return (
                    <div key={pIdx} className="space-y-2 pb-2">
                      <button
                        onClick={() => toggleTocChapter(part.title)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-[#0284C7]">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isPartOpen ? 'rotate-0' : '-rotate-90'}`} />
                          <span>{part.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {part.chapters.length} Chapter{part.chapters.length > 1 ? 's' : ''}
                        </span>
                      </button>

                      {isPartOpen && (
                        <div className="ml-4 pl-4 border-l-2 border-slate-100 dark:border-zinc-800 space-y-3">
                          {part.chapters.map((chap, cIdx) => (
                            <div key={cIdx} className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 py-1">
                                {chap.title}
                              </h4>

                              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 pl-2">
                                {chap.sections.map((sec) => (
                                  <div
                                    key={sec.id}
                                    onClick={() => handleSectionSelect(sec)}
                                    className="p-3 hover:bg-[#0284C7]/10 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-[#0284C7] bg-[#0284C7]/10 px-2 py-0.5 rounded-md">
                                          {sec.num}
                                        </span>
                                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#0284C7] transition-colors">
                                          {sec.title}
                                        </h5>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                                        {sec.plainEnglish || sec.originalBareAct}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                        {sec.readTime}
                                      </span>
                                      <ChevronRight size={14} className="text-slate-400 group-hover:text-[#0284C7] group-hover:translate-x-1 transition-transform" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW STATE 3: DEDICATED KINDLE-STYLE STATUTORY READER WORKSPACE
             ══════════════════════════════════════════════════════════════════ */}
          {viewState === 'READER' && activeSection && (
            <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
              
              {/* Breadcrumb Navigation Line */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <button onClick={() => setViewState('BOOKSHELF')} className="hover:text-slate-700 dark:hover:text-white cursor-pointer">
                  Bookshelf
                </button>
                <span>&gt;</span>
                <button onClick={() => setViewState('TOC')} className="hover:text-slate-700 dark:hover:text-white cursor-pointer truncate max-w-[200px]">
                  {activeSection.actTitle}
                </button>
                <span>&gt;</span>
                <span className="text-[#0284C7] font-black">{activeSection.num}</span>
              </div>

              {/* ─── READER CONTROLS & CONFIG BOX ─── */}
              <div 
                className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                style={{ backgroundColor: readerThemeColors.surface, borderColor: readerThemeColors.border }}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewState('TOC')}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-black/5 transition-colors cursor-pointer"
                    style={{ borderColor: readerThemeColors.border, color: readerThemeColors.text }}
                  >
                    ← TOC
                  </button>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444]">
                      {activeSection.difficulty}
                    </span>
                    <span className="font-semibold" style={{ color: readerThemeColors.textSecondary }}>
                      {activeSection.readTime}
                    </span>
                  </div>
                </div>

                {/* Theme, Font, and Bookmarks Controls */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Reading Themes Selector */}
                  <div className="flex items-center p-1 rounded-xl gap-1 border" style={{ backgroundColor: readerThemeColors.surfaceVariant, borderColor: readerThemeColors.border }}>
                    <button
                      onClick={() => setReadingTheme('light')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        readingTheme === 'light' ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-300' : 'text-slate-400'
                      }`}
                      title="Light Mode"
                    >
                      LIGHT
                    </button>
                    <button
                      onClick={() => setReadingTheme('sepia')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        readingTheme === 'sepia' ? 'bg-[#F4ECD8] text-[#5B4031] shadow-2xs ring-1 ring-[#DFD4BE]' : 'text-slate-400'
                      }`}
                      title="Kindle Sepia Paper"
                    >
                      SEPIA
                    </button>
                    <button
                      onClick={() => setReadingTheme('dark')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        readingTheme === 'dark' ? 'bg-black text-white shadow-2xs ring-1 ring-zinc-700' : 'text-slate-400'
                      }`}
                      title="Dark Mode"
                    >
                      DARK
                    </button>
                  </div>

                  {/* Font Family Selector */}
                  <div className="flex items-center gap-1 border rounded-xl p-1 text-[11px] font-bold" style={{ backgroundColor: readerThemeColors.surfaceVariant, borderColor: readerThemeColors.border }}>
                    {(['serif', 'system', 'monospace']).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFontFamily(f)}
                        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          fontFamily === f ? 'bg-white dark:bg-zinc-800 text-[#0284C7] shadow-2xs font-black' : 'text-slate-400'
                        }`}
                      >
                        {f === 'serif' ? 'Serif' : f === 'system' ? 'Sans' : 'Mono'}
                      </button>
                    ))}
                  </div>

                  {/* Font Size Adjusters */}
                  <div className="flex items-center gap-1.5 border rounded-xl px-2 py-1 text-xs font-bold" style={{ backgroundColor: readerThemeColors.surfaceVariant, borderColor: readerThemeColors.border }}>
                    <button onClick={() => setFontSize((s) => Math.max(12, s - 1))} className="hover:text-[#0284C7] cursor-pointer">A-</button>
                    <span style={{ color: readerThemeColors.text }}>{fontSize}px</span>
                    <button onClick={() => setFontSize((s) => Math.min(24, s + 1))} className="hover:text-[#0284C7] cursor-pointer">A+</button>
                  </div>

                  {/* Margin Sticky Note Trigger */}
                  <button
                    onClick={() => {
                      setActiveNoteText(notes[activeSection.id] || '');
                      setIsNoteInputOpen(true);
                    }}
                    className="p-1.5 rounded-xl border hover:bg-amber-500/15 text-amber-500 transition-colors cursor-pointer"
                    style={{ borderColor: readerThemeColors.border }}
                    title="Pin Margin Sticky Note"
                  >
                    <Edit3 size={16} />
                  </button>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleBookmark(activeSection.id)}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      bookmarks.includes(activeSection.id)
                        ? 'bg-[#0284C7]/20 border-[#0284C7] text-[#0284C7]'
                        : 'text-slate-400 hover:text-[#0284C7]'
                    }`}
                    style={{ borderColor: bookmarks.includes(activeSection.id) ? '#0284C7' : readerThemeColors.border }}
                    title="Bookmark Section"
                  >
                    <Bookmark size={16} fill={bookmarks.includes(activeSection.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              {/* ─── CLASSIC LEGAL TEXTBOOK CANVAS (14-Layer Flow) ─── */}
              <div 
                className="p-6 sm:p-10 rounded-2xl border shadow-lg space-y-8 transition-colors"
                style={{ 
                  backgroundColor: readerThemeColors.surface, 
                  borderColor: readerThemeColors.border,
                  color: readerThemeColors.text,
                  fontFamily: fontFamily === 'serif' ? "Georgia, Cambria, 'Times New Roman', serif" : fontFamily === 'monospace' ? "ui-monospace, Menlo, Monaco, monospace" : 'system-ui, sans-serif'
                }}
              >
                
                {/* 1. Running Book Header (Classic Law Book Style) */}
                <div 
                  className="flex items-center justify-between pb-3 border-b text-[11px] font-extrabold tracking-wider uppercase opacity-75"
                  style={{ borderColor: readerThemeColors.border }}
                >
                  <span className="truncate max-w-[80%]">
                    {activeSection.actTitle} • {activeSection.chapterTitle || activeSection.partTitle}
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${activeSection.num} - ${activeSection.title} (${activeSection.actTitle})`);
                        toast.success("Citation copied!");
                      }}
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Cite</span>
                    </button>
                  </div>
                </div>

                {/* Section Main Heading Block */}
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                    {activeSection.num} — {activeSection.title}
                  </h1>
                  <p className="text-xs font-semibold" style={{ color: readerThemeColors.textSecondary }}>
                    Complexity: <span className="font-extrabold text-[#EF4444]">{activeSection.difficulty}</span> | Read Time: <span className="font-bold">{activeSection.readTime}</span>
                  </p>
                </div>

                {/* ─── LAYER I: STATUTORY PROVISION (BARE ACT TEXT) ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-[#0284C7] uppercase tracking-wider">
                    <span>I. STATUTORY PROVISION (BARE ACT TEXT)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeSection.originalBareAct);
                        toast.success("Bare Act statutory text copied!");
                      }}
                      className="flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Copy Bare Act</span>
                    </button>
                  </div>

                  <div 
                    className="p-5 rounded-2xl border-l-4 italic font-serif leading-relaxed text-sm whitespace-pre-line"
                    style={{ 
                      backgroundColor: readerThemeColors.statutoryBg,
                      borderLeftColor: '#0284C7',
                      fontSize: `${fontSize}px`,
                      lineHeight: `${fontSize * 1.55}px`
                    }}
                  >
                    "{activeSection.originalBareAct}"
                  </div>
                </div>

                {/* ─── LAYER II: COMMENTARY & LEGAL PRINCIPLE ─── */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                    II. COMMENTARY & LEGAL PRINCIPLE
                  </h3>
                  <p 
                    className="leading-relaxed font-medium"
                    style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.55}px` }}
                  >
                    {activeSection.plainEnglish}
                  </p>
                </div>

                {/* ─── LAYER III: आधिकारिक कानूनी व्याख्या एवं विश्लेषण (HINDI) ─── */}
                {activeSection.hindiExplanation && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      III. आधिकारिक कानूनी व्याख्या एवं विश्लेषण (HINDI)
                    </h3>
                    <div 
                      className="p-4 rounded-xl border leading-relaxed font-medium"
                      style={{ 
                        backgroundColor: readerThemeColors.surfaceVariant,
                        borderColor: readerThemeColors.border,
                        fontSize: `${fontSize}px`,
                        lineHeight: `${fontSize * 1.6}px`
                      }}
                    >
                      {activeSection.hindiExplanation}
                    </div>
                  </div>
                )}

                {/* ─── LAYER IV: PRACTICAL ILLUSTRATION & FACTUAL SCENARIO ─── */}
                {activeSection.realExample && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      IV. PRACTICAL ILLUSTRATION & FACTUAL SCENARIO
                    </h3>
                    <div 
                      className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-950 dark:text-purple-200 leading-relaxed font-medium"
                      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
                    >
                      {activeSection.realExample}
                    </div>
                  </div>
                )}

                {/* ─── LAYER V: ADVOCATE LITIGATION PERSPECTIVE & COURTROOM PRACTICE ─── */}
                {activeSection.lawyerInterpretation && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      V. ADVOCATE LITIGATION PERSPECTIVE & COURTROOM PRACTICE
                    </h3>
                    <p 
                      className="leading-relaxed font-medium"
                      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.55}px` }}
                    >
                      {activeSection.lawyerInterpretation}
                    </p>
                  </div>
                )}

                {/* ─── LAYER VI: EXAMINATION & JUDICIAL SERVICE ESSENTIALS ─── */}
                {activeSection.importantNotes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      VI. EXAMINATION & JUDICIAL SERVICE ESSENTIALS
                    </h3>
                    <div 
                      className="p-4 rounded-xl border-l-4 border-l-amber-500 bg-amber-500/10 leading-relaxed font-medium whitespace-pre-line"
                      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
                    >
                      {activeSection.importantNotes}
                    </div>
                  </div>
                )}

                {/* ─── LAYER VII: LANDMARK PRECEDENTS & JUDICIAL DECISIONS ─── */}
                {activeSection.landmarkJudgments && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                      VII. LANDMARK PRECEDENTS & JUDICIAL DECISIONS
                    </h3>
                    <div 
                      className="p-4 rounded-xl border leading-relaxed font-medium whitespace-pre-line"
                      style={{ 
                        backgroundColor: readerThemeColors.surfaceVariant,
                        borderColor: readerThemeColors.border,
                        fontSize: `${fontSize}px`,
                        lineHeight: `${fontSize * 1.5}px`
                      }}
                    >
                      {activeSection.landmarkJudgments}
                    </div>
                  </div>
                )}

                {/* ─── LAYER VIII: STATUTORY CROSS-REFERENCE (TRANSITION MAPPING) ─── */}
                {(activeSection.ipcEquivalent && activeSection.ipcEquivalent !== 'N/A') || (activeSection.bnsEquivalent && activeSection.bnsEquivalent !== 'N/A') ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                      VIII. STATUTORY CROSS-REFERENCE (TRANSITION MAPPING)
                    </h3>
                    <div 
                      className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-xs font-bold flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>Previous Provision: <strong className="text-rose-600 dark:text-rose-400">{activeSection.ipcEquivalent || 'N/A'}</strong></span>
                      <span>➔</span>
                      <span>Corresponding Modern Sanhita: <strong className="text-emerald-600 dark:text-emerald-400">{activeSection.bnsEquivalent || 'N/A'}</strong></span>
                    </div>
                  </div>
                ) : null}

                {/* ─── LAYER IX: SELF-ASSESSMENT QUESTIONS (EXAM MCQS) ─── */}
                {activeSection.mcqs && activeSection.mcqs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#0284C7] uppercase tracking-wider">
                      IX. SELF-ASSESSMENT QUESTIONS (EXAM MCQS)
                    </h3>

                    <div className="space-y-3">
                      {activeSection.mcqs.map((q, qIdx) => {
                        const quizKey = `${activeSection.id}-q-${qIdx}`;
                        const selected = selectedQuizAnswers[quizKey];
                        const isRevealed = revealedQuizAnswers[quizKey];

                        return (
                          <div 
                            key={qIdx}
                            className="p-4 rounded-xl border space-y-3"
                            style={{ backgroundColor: readerThemeColors.surfaceVariant, borderColor: readerThemeColors.border }}
                          >
                            <p className="text-sm font-black">
                              Q{qIdx + 1}. {q.question}
                            </p>

                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = selected === opt;
                                const isCorrect = opt === q.answer;

                                let btnStyle = "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200";
                                if (isRevealed) {
                                  if (isCorrect) {
                                    btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black";
                                  } else if (isSelected) {
                                    btnStyle = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold";
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleSelectQuizOption(qIdx, opt)}
                                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                                  >
                                    <span>
                                      <strong>({String.fromCharCode(97 + oIdx)})</strong> {opt}
                                    </span>
                                    {isRevealed && isCorrect && <CheckCircle2 size={16} className="text-emerald-600" />}
                                    {isRevealed && isSelected && !isCorrect && <XCircle size={16} className="text-rose-600" />}
                                  </button>
                                );
                              })}
                            </div>

                            {isRevealed && (
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1">
                                ✓ Answer: {q.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── LAYER X: REVISION TAKEAWAYS & KEY PRINCIPLES ─── */}
                {activeSection.flashcards && activeSection.flashcards.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      X. REVISION TAKEAWAYS & KEY PRINCIPLES
                    </h3>
                    <div className="space-y-1.5 pl-2">
                      {activeSection.flashcards.map((fc, fcIdx) => (
                        <div key={fcIdx} className="flex items-start gap-2 text-xs font-bold">
                          <span className="text-emerald-500">•</span>
                          <span>{fc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── USER'S STUDY MARGIN NOTE (PINNED POST-IT) ─── */}
                {notes[activeSection.id] && (
                  <div className="p-4 rounded-xl border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-600">
                      <span>📌 STUDENT MARGIN NOTE</span>
                      <button
                        onClick={() => {
                          setActiveNoteText(notes[activeSection.id]);
                          setIsNoteInputOpen(true);
                        }}
                        className="hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {notes[activeSection.id]}
                    </p>
                  </div>
                )}

                {/* ─── STATUTORY FOOTNOTES & REFERENCES ─── */}
                <div 
                  className="pt-6 border-t space-y-2 text-xs opacity-75"
                  style={{ borderColor: readerThemeColors.border }}
                >
                  <span className="font-extrabold uppercase tracking-wider text-[10px] block">
                    REFERENCES & STATUTORY CITATIONS
                  </span>
                  {activeSection.recentAmendments && <div>1. Amendments: {activeSection.recentAmendments}</div>}
                  {activeSection.suggestedReading && <div>2. Suggested Reading: {activeSection.suggestedReading}</div>}
                  {activeSection.relatedSections && <div>3. Related Sections: {activeSection.relatedSections}</div>}
                </div>

              </div>

              {/* Floating AI Tutor Summon Badge */}
              <button
                onClick={() => setIsAiAssistantOpen(true)}
                className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-[#0284C7] hover:bg-[#0274b0] text-white font-black rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer z-40"
              >
                <Sparkles size={16} />
                <span className="text-xs">AI Tutor</span>
              </button>

            </div>
          )}

        </main>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDING CONTEXTUAL AI COPILOT DRAWER (RIGHT PANEL)
           ══════════════════════════════════════════════════════════════════ */}
        {isAiAssistantOpen && (
          <aside className="w-80 sm:w-96 lg:w-[420px] bg-white dark:bg-[#0d0e16] border-l border-slate-200/80 dark:border-zinc-800/80 flex flex-col h-full shrink-0 z-40 shadow-2xl transition-all">
            
            {/* Copilot Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-black">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    Knowledge Hub Assistant
                  </h3>
                  <p className="text-[10px] font-bold text-[#0284C7] truncate max-w-[220px]">
                    Locked to: {activeSection?.num} - {activeSection?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* New Chat */}
                <button
                  onClick={() => {
                    setCopilotMessages([
                      {
                        id: Date.now().toString(),
                        sender: 'assistant',
                        text: `👋 New conversation started.\n\nLocked to context: **${activeSection?.num} - ${activeSection?.title}**. How can I help?`,
                        suggestions: [
                          'Explain this section in plain English',
                          'Translate to Hindi (हिंदी अनुवाद)',
                          'Generate 5 study MCQs'
                        ]
                      }
                    ]);
                    toast.success("New conversation ready!");
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
                  title="New Session"
                >
                  <Plus size={16} />
                </button>

                {/* Close Drawer */}
                <button 
                  onClick={() => setIsAiAssistantOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
                  title="Close Assistant"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Action Suggested Prompts Accordion */}
            <div className="p-3 border-b border-slate-200/60 dark:border-zinc-800/60 bg-slate-50/40 dark:bg-zinc-900/40 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Quick Action Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Explain Simply',
                  'Explain Like Judge',
                  'Explain in Hindi',
                  'Generate MCQs',
                  'Compare IPC vs BNS',
                  'Show Landmark Cases',
                  'Generate Notes',
                  'Generate Flashcards'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(`Execute prompt: ${chip}`)}
                    disabled={isAiThinking}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-[#0284C7]/15 border border-slate-200 dark:border-zinc-700 hover:border-[#0284C7] text-slate-800 dark:text-zinc-200 hover:text-[#0284C7] text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    💡 {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {copilotMessages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-black shrink-0 text-xs shadow-xs">
                        ✨
                      </div>
                    )}
                    <div className={`space-y-2 max-w-[85%]`}>
                      <div 
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#0284C7] text-white font-medium rounded-tr-xs'
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-tl-xs'
                        }`}
                      >
                        {isUser ? (
                          m.text
                        ) : (
                          <div className="prose prose-xs dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        )}

                        {m.disclaimer && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800 text-[10px] opacity-75 font-semibold">
                            ⚖️ {m.disclaimer}
                          </div>
                        )}
                      </div>

                      {/* Follow-up Suggestions Chips */}
                      {m.suggestions && m.suggestions.length > 0 && !isUser && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            Suggested Next Actions:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {m.suggestions.slice(0, 4).map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSendChat(sug)}
                                disabled={isAiThinking}
                                className="text-left px-2 py-1 bg-white dark:bg-zinc-800 border border-[#0284C7]/40 text-[#0284C7] hover:bg-[#0284C7]/15 text-[10px] font-bold rounded-lg transition-all cursor-pointer truncate max-w-full"
                              >
                                ✓ {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Thinking Indicator */}
              {isAiThinking && (
                <div className="flex gap-2 items-center text-xs font-bold text-[#0284C7]">
                  <div className="w-2 h-2 rounded-full bg-[#0284C7] animate-ping" />
                  <span>⚖️ Formulating legal analysis{'.'.repeat(thinkingDotCount)}</span>
                </div>
              )}

              <div ref={copilotScrollRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0d0e16]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={`Ask AI about ${activeSection?.num || 'this act'}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  className="w-full pl-3 pr-18 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-white"
                />

                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    onClick={handleVoiceToggle}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isRecording ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-[#0284C7]'
                    }`}
                    title="Voice Query"
                  >
                    <Mic size={14} />
                  </button>

                  <button
                    onClick={() => handleSendChat()}
                    disabled={isAiThinking || !chatInput.trim()}
                    className="p-1.5 bg-[#0284C7] hover:bg-[#0274b0] text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>

          </aside>
        )}

      </div>

      {/* ─── MARGIN STICKY NOTE MODAL (Pin margin note on page) ─── */}
      {isNoteInputOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#111622] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-zinc-100">
                  Pin Margin Sticky Note
                </h3>
              </div>
              <button 
                onClick={() => setIsNoteInputOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Write your student margin note or courtroom strategy reminder here..."
              value={activeNoteText}
              onChange={(e) => setActiveNoteText(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-white resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              {notes[activeSection?.id] && (
                <button
                  onClick={() => {
                    const updated = { ...notes };
                    delete updated[activeSection.id];
                    setNotes(updated);
                    localStorage.setItem('legal_hub_margin_notes', JSON.stringify(updated));
                    setIsNoteInputOpen(false);
                    toast.success("Sticky note removed!");
                  }}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Delete Note
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setIsNoteInputOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0274b0] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  Save Sticky Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
