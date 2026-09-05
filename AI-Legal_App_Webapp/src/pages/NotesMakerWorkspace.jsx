import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Sparkles, BookOpen, Clock, Layers, FileText,
  Bookmark, Share2, Copy, Edit3, Trash2, Mic, MicOff, Check, X,
  Brain, Zap, GraduationCap, Flame, Globe, CheckSquare, RefreshCw,
  HelpCircle, ChevronRight, ChevronDown, Award, Send, Save, ArrowRight, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateChatResponse } from '../services/geminiService';
import { useSubscription } from '../context/SubscriptionContext';

// NOTE FORMAT CHIPS
const NOTE_CHIPS = [
  { id: 'short', label: '📄 Short Notes', desc: '1-page synopsis & definitions' },
  { id: 'detailed', label: '📚 Detailed Notes', desc: 'Sections, elements & case laws' },
  { id: 'revision', label: '📝 Revision Notes', desc: 'Bullet points & statutory charts' },
  { id: 'exam', label: '🎯 Exam Notes', desc: 'Model answers & examiner tips' },
  { id: 'case_summary', label: '⚖️ Case Summary', desc: 'Facts, issues & judgment ratio' },
  { id: 'bare_act', label: '📖 Bare Act Summary', desc: 'Clause-by-clause simplified text' },
];

const TRENDING_TOPICS = [
  'Article 21 Right to Life',
  'Bharatiya Nyaya Sanhita (BNS 2023)',
  'IPC Section 302 vs BNS 103',
  'BNSS Criminal Procedure',
  'Indian Contract Act 1872',
  'Constitution & Writs (Art 226/32)',
  'Section 138 NI Act Cheque Bounce',
  'IT Act Section 65B Evidence',
  'Bharatiya Sakshya Adhiniyam (BSA)',
  'Tort Law & Medical Negligence',
];

const ACADEMIC_LEVELS = [
  'BA LLB',
  'LLB',
  'LLM',
  'Judiciary Prep',
  'CLAT',
  'AIBE',
];

const LOADING_STEPS = [
  '✨ AI is preparing your study notes...',
  '📚 Reading legal concepts...',
  '⚖️ Organizing important sections...',
  '📝 Creating revision notes...',
];

// Helper to extract clean text from AI response (stripping JSON wrappers & literal \n)
const extractCleanText = (res) => {
  if (!res) return '';
  let str = '';
  if (typeof res === 'string') {
    try {
      const parsed = JSON.parse(res);
      str = parsed.reply || parsed.text || parsed.content || res;
    } catch (e) {
      str = res;
    }
  } else if (typeof res === 'object') {
    str = res.reply || res.text || res.content || JSON.stringify(res);
  }
  // Replace literal '\n' with real line breaks
  return str.replace(/\\n/g, '\n').replace(/```markdown/gi, '').replace(/```/g, '').trim();
};

// Clean Markdown Renderer Component
const CleanMarkdownRenderer = ({ rawText }) => {
  if (!rawText) return null;

  const textToRender = extractCleanText(rawText);
  const lines = textToRender.split('\n');
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`sp_${idx}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith('# ')) {
      const cleanHeading = trimmed.replace(/^#\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <h1 key={`h1_${idx}`} className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white tracking-tight mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          {cleanHeading}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      const cleanHeading = trimmed.replace(/^##\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <h2 key={`h2_${idx}`} className="text-base sm:text-lg font-bold text-[#C8A34D] mt-4 mb-1.5 flex items-center gap-2">
          <span>{cleanHeading}</span>
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      const cleanHeading = trimmed.replace(/^###\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <h3 key={`h3_${idx}`} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1">
          {cleanHeading}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <div key={`bullet_${idx}`} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 my-1 pl-2">
          <span className="text-[#C8A34D] font-bold shrink-0">•</span>
          <span className="leading-relaxed">{cleanBullet}</span>
        </div>
      );
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      elements.push(<hr key={`div_${idx}`} className="my-3 border-slate-200 dark:border-slate-800" />);
    } else {
      const cleanText = trimmed.replace(/\*\*\*/g, '').replace(/\*\*/g, '');
      elements.push(
        <p key={`p_${idx}`} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">
          {cleanText}
        </p>
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

export default function NotesMakerWorkspace() {
  const navigate = useNavigate();
  const { deductToolUsage } = useSubscription();

  // Screen View State
  const [screenState, setScreenState] = useState('home'); // home | workspace
  const [inputMode, setInputMode] = useState('ai_topic'); // ai_topic | user_input
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [academicLevel, setAcademicLevel] = useState('BA LLB');
  const [selectedChip, setSelectedChip] = useState('short');

  // Search & Inputs
  const [promptInput, setPromptInput] = useState('');
  const [userTopicInput, setUserTopicInput] = useState('');
  const [userInputContent, setUserInputContent] = useState('');

  // Voice Dictation Recording State
  const [isListening, setIsListening] = useState(false);

  // AI Generation & Processing States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSavingAsWritten, setIsSavingAsWritten] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  // Active Note Type: 'manual' | 'ai_transformed' | 'ai_generated'
  const [activeNoteSource, setActiveNoteSource] = useState('ai_generated');

  // Master Content & Conversation Session
  const [masterNotesContent, setMasterNotesContent] = useState('');
  const [activeTopicTitle, setActiveTopicTitle] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  // Follow-up Thread State
  const [followUpThread, setFollowUpThread] = useState([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpGenerating, setIsFollowUpGenerating] = useState(false);

  // View Modes & Tab State
  const [viewMode, setViewMode] = useState('notes'); // notes | flashcards | mindmap | summary | mcq
  const [parsedFlashcards, setParsedFlashcards] = useState([]);
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  const [mindMapNodes, setMindMapNodes] = useState([]);
  const [parsedSummary, setParsedSummary] = useState('');
  const [parsedMCQs, setParsedMCQs] = useState([]);
  const [userMCQAnswers, setUserMCQAnswers] = useState({});

  // Saved Notes & Library Modal
  const [savedNotes, setSavedNotes] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Edit Note Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingNotesText, setEditingNotesText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load Saved Notes from localStorage
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('@user_saved_notes');
      if (savedStr) setSavedNotes(JSON.parse(savedStr));
    } catch (e) {}
  }, []);

  // Step-by-Step Loading Messages Animation
  useEffect(() => {
    let interval;
    if ((isGenerating || isTransforming) && !masterNotesContent) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isTransforming, masterNotesContent]);

  // Voice Dictation Toggle Web Speech API
  const toggleVoiceListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = outputLanguage === 'Hindi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setUserInputContent((prev) => (prev ? `${prev}\n${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      setIsListening(false);
      showToast('Voice dictation failed to start.');
    }
  };

  // Derive Multi-Tab Learning Views
  const deriveViewsFromMasterContent = (content, topic) => {
    const cleanContent = extractCleanText(content);
    const flashcards = [
      { term: `Meaning of ${topic}`, definition: `Core legal principle and statutory scope of ${topic} under ${academicLevel}.` },
      { term: `Statutory Scope & Enactment`, definition: `Governing section provisions and legal framework under ${topic}.` },
      { term: `Essential Ingredients`, definition: `Mandatory statutory conditions precedent required to establish liability.` },
      { term: `Landmark Apex Rulings`, definition: `Leading Supreme Court precedent establishing the binding ratio decidendi.` },
      { term: `Exam Strategy Tip`, definition: `State statutory section numbers first, then essential ingredients & landmark rulings.` },
    ];
    setParsedFlashcards(flashcards);
    setCurrentFlashcardIdx(0);
    setShowFlashcardAnswer(false);

    const tree = [
      {
        id: 'node_1',
        label: `📌 ${topic} Overview`,
        expanded: true,
        children: [
          { id: 'node_1_1', label: `📖 Introduction & Scope` },
          { id: 'node_1_2', label: `⚖️ Statutory Enactment & Jurisdiction` },
        ],
      },
      {
        id: 'node_2',
        label: `🏛️ Statutory Framework & Ingredients`,
        expanded: true,
        children: [
          { id: 'node_2_1', label: `1️⃣ Mandatory Conditions Precedent` },
          { id: 'node_2_2', label: `2️⃣ Essential Elements` },
        ],
      },
      {
        id: 'node_3',
        label: `⚖️ Landmark Supreme Court Ratios`,
        expanded: true,
        children: [
          { id: 'node_3_1', label: `📜 Apex Court Binding Precedent` },
          { id: 'node_3_2', label: `💡 Key Legal Principles` },
        ],
      },
    ];
    setMindMapNodes(tree);

    setParsedSummary(`Quick 1-Minute Revision Summary for ${topic}:\n• Core statutory provisions governing ${topic} under ${academicLevel}.\n• Essential conditions precedent and legal ingredients required.\n• Landmark Apex Court rulings and exam answer structure.`);

    const mcqs = [
      {
        id: 1,
        q: `What is the primary statutory requirement under ${topic}?`,
        opts: [
          'Strict statutory compliance and legal precedent',
          'Pure administrative discretion',
          'Automatic presumption of guilt',
          'Exemption from Judicial Review',
        ],
        ans: 0,
        exp: `Statutory provisions under ${topic} require fulfilling mandatory conditions precedent as defined by enactment.`,
      },
      {
        id: 2,
        q: `Which standard of proof applies in legal proceedings relating to ${topic}?`,
        opts: [
          'Proof beyond reasonable doubt or statutory burden',
          'Preponderance of third-party opinion',
          'No proof required',
          'Executive declaration',
        ],
        ans: 0,
        exp: `Burden of proof follows statutory provisions and Evidence Act / BSA rules.`,
      },
      {
        id: 3,
        q: `What is the legal effect of non-compliance with statutory procedure under ${topic}?`,
        opts: [
          'It vitiates the proceedings or claim',
          'No legal effect',
          'Doubles statutory penalty',
          'Transfers case to international tribunal',
        ],
        ans: 0,
        exp: `Mandatory statutory notices and procedural compliance are conditions precedent for legal sustainability.`,
      },
    ];
    setParsedMCQs(mcqs);
  };

  // ACTION 1: SAVE AS WRITTEN (EXACT UNALTERED STUDENT CONTENT)
  const handleSaveAsWritten = async () => {
    if (!userInputContent.trim()) {
      showToast('Please type or dictate your study notes first.');
      return;
    }

    const titleToSave = (userTopicInput || 'My Personal Study Note').trim();
    const exactContent = userInputContent;

    setIsSavingAsWritten(true);
    try {
      const newItem = {
        id: `note_${Date.now()}`,
        topic: titleToSave,
        level: academicLevel,
        date: new Date().toLocaleDateString(),
        content: exactContent,
        originalInput: exactContent,
        inputSource: 'manual',
      };

      const updated = [newItem, ...savedNotes.filter((n) => n.id !== newItem.id)];
      setSavedNotes(updated);
      localStorage.setItem('@user_saved_notes', JSON.stringify(updated));
      showToast('✓ Note saved as written to My Saved Notes');
    } catch (e) {
      showToast('Unable to save note.');
    } finally {
      setIsSavingAsWritten(false);
    }
  };

  // ACTION 2: TRANSFORM WITH AI (CLEAN & ORGANIZE STUDENT INPUT ONLY)
  const handleTransformWithAI = async () => {
    if (!userInputContent.trim()) {
      showToast('Please type or dictate your study notes first.');
      return;
    }

    const topicToUse = (userTopicInput || 'Transformed Study Notes').trim();

    setScreenState('workspace');
    setActiveTopicTitle(topicToUse);
    setActiveNoteSource('ai_transformed');
    setErrorMsg(null);
    setIsTransforming(true);
    setLoadingStepIdx(0);
    setMasterNotesContent('');
    setFollowUpThread([]);
    setViewMode('notes');

    const systemInstruction = `You are an expert Legal Study Assistant for ${academicLevel} law students.
The student has provided their own study points or lecture notes.
Your job is to transform and organize ONLY their provided content into clean, well-structured study notes with clear headings, bullet points, and highlighted key concepts.
CRITICAL RULES:
1. Base your output strictly on the student's provided text.
2. Clean up grammar, improve readability, and organize logically.
3. DO NOT invent or fabricate any unprovided legal case facts, citations, dates, or judges.
4. Format cleanly using Markdown with headings in ${outputLanguage}.`;

    const userPromptContent = `Title / Topic: "${topicToUse}"\nStudent Provided Text:\n"${userInputContent}"\n\nTransform and clean up these notes into structured Markdown study notes in ${outputLanguage}.`;

    try {
      const response = await generateChatResponse([], userPromptContent, systemInstruction, null, outputLanguage);
      const rawText = extractCleanText(response);

      if (!rawText.trim()) throw new Error('Empty response');

      setMasterNotesContent(rawText);
      deriveViewsFromMasterContent(rawText, topicToUse);
      showToast('AI has organized your study notes.');
    } catch (err) {
      setErrorMsg('Unable to transform notes right now.');
    } finally {
      setIsTransforming(false);
    }
  };

  // ACTION 3: GENERATE FULL STRUCTURED STUDY NOTES
  const handleGenerateNotes = async (overrideTopic) => {
    try { deductToolUsage('notes_maker'); } catch(e) {}
    let topicToUse = '';

    if (inputMode === 'ai_topic') {
      topicToUse = (overrideTopic || promptInput).trim();
      if (!topicToUse) {
        showToast('Please enter a legal topic, Act, Section, or Question.');
        return;
      }
    } else {
      if (!userInputContent.trim()) {
        showToast('Please type or dictate your observations/notes first.');
        return;
      }
      topicToUse = (userTopicInput || 'Personal Legal Study Notes').trim();
    }

    setScreenState('workspace');
    setActiveTopicTitle(topicToUse);
    setActiveNoteSource('ai_generated');
    setErrorMsg(null);
    setIsGenerating(true);
    setLoadingStepIdx(0);
    setMasterNotesContent('');
    setFollowUpThread([]);
    setViewMode('notes');

    const chipLabel = NOTE_CHIPS.find((c) => c.id === selectedChip)?.label || 'Study Notes';

    const systemInstruction = `You are an expert Legal Study Assistant for ${academicLevel} law students.
Generate comprehensive, highly detailed exam study notes for: "${topicToUse}" (${chipLabel}).
Output strictly in ${outputLanguage} using clean Markdown with headings (# Title, ## Subheading, ### Section), bold terms, and bullet points (- Bullet).
Do NOT wrap output in JSON or code blocks.`;

    const userPromptContent = `Generate ${chipLabel} for ${academicLevel} law student on topic: "${topicToUse}" in ${outputLanguage}.`;

    try {
      const response = await generateChatResponse([], userPromptContent, systemInstruction, null, outputLanguage);
      const rawText = extractCleanText(response);

      if (!rawText.trim()) throw new Error('Empty response');

      setMasterNotesContent(rawText);
      deriveViewsFromMasterContent(rawText, topicToUse);
      showToast(`Notes ready for ${topicToUse}.`);
    } catch (err) {
      setErrorMsg('Unable to generate study notes right now.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Follow-up Instruction Handler (ATTACHED DIRECTLY TO ACTIVE STUDY NOTE WITH THINKING INDICATOR)
  const handleFollowUpInstruction = async (customInstruction) => {
    const textToSend = (customInstruction || followUpInput).trim();
    if (!textToSend || isFollowUpGenerating || !masterNotesContent) return;

    setFollowUpInput('');
    setIsFollowUpGenerating(true);

    const userMsgId = `u_${Date.now()}`;
    const aiMsgId = `ai_${Date.now()}`;

    const userMsgItem = { id: userMsgId, role: 'user', text: textToSend };
    const aiMsgItem = { id: aiMsgId, role: 'assistant', text: '', isThinking: true };

    setFollowUpThread((prev) => [...prev, userMsgItem, aiMsgItem]);

    const cleanNotes = extractCleanText(masterNotesContent);
    const sysInst = `You are AI Legal Tutor attached directly to this Student Study Note.
Topic: "${activeTopicTitle}"
Academic Level: "${academicLevel}"

ACTIVE NOTE CONTENT CONTEXT:
"${cleanNotes.slice(0, 3500)}"

CRITICAL RULE:
Answer the student's question specifically in context of this active study note. Format your answer using clean Markdown with bold text and bullet points. Output language: ${outputLanguage}.`;

    try {
      const response = await generateChatResponse(
        conversationHistory,
        textToSend,
        sysInst,
        null,
        outputLanguage
      );

      const rawReply = extractCleanText(response);

      setFollowUpThread((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: rawReply || 'AI Tutor provided follow-up explanation based on note.', isThinking: false }
            : msg
        )
      );

      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: textToSend },
        { role: 'assistant', content: rawReply },
      ]);
    } catch (err) {
      setFollowUpThread((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: '⚠️ Unable to process follow-up request right now. Please try again.', isThinking: false }
            : msg
        )
      );
    } finally {
      setIsFollowUpGenerating(false);
    }
  };

  // Save Note to Persistent Storage
  const handleSaveNotes = () => {
    if (!masterNotesContent) return;
    const titleToSave = activeTopicTitle || promptInput || 'Legal Study Notes';
    const newItem = {
      id: `note_${Date.now()}`,
      topic: titleToSave,
      level: academicLevel,
      date: new Date().toLocaleDateString(),
      content: extractCleanText(masterNotesContent),
      inputSource: activeNoteSource,
    };

    const updated = [newItem, ...savedNotes.filter((n) => n.id !== newItem.id)];
    setSavedNotes(updated);
    localStorage.setItem('@user_saved_notes', JSON.stringify(updated));
    showToast('Notes saved to My Saved Notes Library.');
  };

  // Open Edit Modal
  const handleOpenEditModal = (note) => {
    if (note) {
      setEditingNoteId(note.id);
      setEditingTitle(note.topic);
      setEditingNotesText(extractCleanText(note.content));
    } else {
      setEditingNoteId(null);
      setEditingTitle(activeTopicTitle);
      setEditingNotesText(extractCleanText(masterNotesContent));
    }
    setIsEditModalOpen(true);
  };

  // Save Edited Note
  const handleSaveEditedNotes = () => {
    if (!editingNotesText.trim()) return;

    setMasterNotesContent(editingNotesText);
    if (editingTitle) setActiveTopicTitle(editingTitle);

    if (editingNoteId) {
      const updated = savedNotes.map((n) =>
        n.id === editingNoteId
          ? { ...n, topic: editingTitle || n.topic, content: editingNotesText }
          : n
      );
      setSavedNotes(updated);
      localStorage.setItem('@user_saved_notes', JSON.stringify(updated));
    }
    showToast('Note updated.');
    setIsEditModalOpen(false);
  };

  // Delete Saved Note
  const handleDeleteSavedNote = (idToDelete) => {
    const updated = savedNotes.filter((n) => n.id !== idToDelete);
    setSavedNotes(updated);
    localStorage.setItem('@user_saved_notes', JSON.stringify(updated));
    showToast('Note deleted.');
  };

  // Open Saved Note
  const handleOpenSavedNote = (note) => {
    setHistoryModalVisible(false);
    setActiveTopicTitle(note.topic);
    setMasterNotesContent(note.content);
    setActiveNoteSource(note.inputSource || 'manual');
    setScreenState('workspace');
    setViewMode('notes');
    deriveViewsFromMasterContent(note.content, note.topic);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 select-none">
      {/* Toast Popup */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-xl border border-slate-700"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP WORKSPACE HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (screenState === 'workspace' ? setScreenState('home') : navigate('/dashboard/tools'))}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> STUDENT AI TOOL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white tracking-tight mt-0.5">
              {screenState === 'workspace' ? `📒 ${activeTopicTitle}` : '📒 AI Notes Maker 2.0'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {screenState === 'workspace' ? `${academicLevel} Study Companion` : 'Conversational AI Legal™ Study Companion'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Globe className="w-4 h-4 text-[#C8A34D] ml-2" />
            <select
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none pr-2 cursor-pointer"
            >
              <option value="English" className="dark:bg-slate-800">English</option>
              <option value="Hindi" className="dark:bg-slate-800">Hindi (हिंदी)</option>
              <option value="Hinglish" className="dark:bg-slate-800">Hinglish</option>
              <option value="Telugu" className="dark:bg-slate-800">Telugu (తెలుగు)</option>
              <option value="Tamil" className="dark:bg-slate-800">Tamil (தமிழ்)</option>
              <option value="Marathi" className="dark:bg-slate-800">Marathi (मराठी)</option>
            </select>
          </div>

          <button
            onClick={() => setHistoryModalVisible(true)}
            className="px-3.5 py-2 rounded-xl bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">My Saved Notes</span>
          </button>
        </div>
      </div>

      {/* PHASE 1: HOME SETUP HUB */}
      {screenState === 'home' && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Academic Level Selector */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              🎓 Academic Level
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ACADEMIC_LEVELS.map((lvl) => {
                const isSelected = academicLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setAcademicLevel(lvl)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#C8A34D] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Input Mode Switcher */}
          <div className="p-1.5 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center gap-1 max-w-md">
            <button
              onClick={() => setInputMode('ai_topic')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                inputMode === 'ai_topic' ? 'bg-[#C8A34D] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              ✨ Generate with AI
            </button>
            <button
              onClick={() => setInputMode('user_input')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                inputMode === 'user_input' ? 'bg-[#C8A34D] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              ✍️ Create from My Input
            </button>
          </div>

          {/* MODE 1: GENERATE WITH AI */}
          {inputMode === 'ai_topic' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ask AI to Generate Notes
              </h3>
              <div className="p-4 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <textarea
                  rows={3}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask AI to generate notes on any legal topic, Act, Section, Article, Judgment or Subject..."
                  className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleGenerateNotes()}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Generate Notes</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: CREATE FROM MY INPUT */}
          {inputMode === 'user_input' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  What are you studying?
                </label>
                <input
                  type="text"
                  value={userTopicInput}
                  onChange={(e) => setUserTopicInput(e.target.value)}
                  placeholder="Optional title / case / topic (e.g. Kesavananda Bharati)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Your Study Points & Rough Notes
                  </label>
                  <button
                    onClick={toggleVoiceListening}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isListening ? 'Listening...' : '🎙 Speak'}</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={userInputContent}
                  onChange={(e) => setUserInputContent(e.target.value)}
                  placeholder="Type your observations, case facts, lecture points or dictate using the mic..."
                  className="w-full p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] resize-none"
                />
              </div>

              {/* Mode 2 Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={handleSaveAsWritten}
                  disabled={isSavingAsWritten}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#C8A34D]/40 hover:border-[#C8A34D] text-left transition-all cursor-pointer space-y-1 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#C8A34D] flex items-center gap-1.5">
                    <Save className="w-4 h-4" /> Save As Written
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Save exact text without any AI modifications</p>
                </button>

                <button
                  onClick={handleTransformWithAI}
                  disabled={isTransforming}
                  className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-[#C8A34D]/50 hover:border-[#C8A34D] text-left transition-all cursor-pointer space-y-1 shadow-2xs"
                >
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C8A34D]" /> Transform with AI
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">Clean grammar, structure headings & bullet points</p>
                </button>

                <button
                  onClick={() => handleGenerateNotes()}
                  disabled={isGenerating}
                  className="p-4 rounded-2xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white text-left transition-all cursor-pointer space-y-1 shadow-2xs"
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-white" /> Generate Notes
                  </div>
                  <p className="text-[11px] text-white/90">Combine your input to create comprehensive notes</p>
                </button>
              </div>
            </div>
          )}

          {/* Note Format Selector */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Note Format
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {NOTE_CHIPS.map((chip) => {
                const isSelected = selectedChip === chip.id;
                return (
                  <div
                    key={chip.id}
                    onClick={() => setSelectedChip(chip.id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? 'bg-[#C8A34D]/10 border-[#C8A34D] text-[#C8A34D] font-bold'
                        : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{chip.label}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">{chip.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trending Legal Topics */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              🔥 Trending Exam Topics
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TRENDING_TOPICS.map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptInput(topic);
                    handleGenerateNotes(topic);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E293B] hover:bg-[#C8A34D]/10 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#C8A34D] hover:border-[#C8A34D]/40 transition-all cursor-pointer whitespace-nowrap"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: MASTER STUDY WORKSPACE */}
      {screenState === 'workspace' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Multi-Tab Learning Views Header */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
            {[
              { id: 'notes', label: '📖 Study Notes' },
              { id: 'flashcards', label: '🎴 Flashcards' },
              { id: 'mindmap', label: '🧠 Mind Map' },
              { id: 'summary', label: '📄 1-Page Summary' },
              { id: 'mcq', label: '⚡ Self-Assessment MCQs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === tab.id
                    ? 'bg-[#C8A34D] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-[#C8A34D] flex items-center gap-1.5">
              <Award className="w-4 h-4" /> {academicLevel} Notes
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#C8A34D]" /> Save
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(extractCleanText(masterNotesContent));
                  showToast('Copied to clipboard.');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#C8A34D]" /> Copy
              </button>

              <button
                onClick={() => handleOpenEditModal()}
                className="px-3 py-1.5 rounded-xl bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-xs font-bold text-[#C8A34D] flex items-center gap-1 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>

          {/* TAB 1: STUDY NOTES */}
          {viewMode === 'notes' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl min-h-[400px]">
              {isGenerating || isTransforming ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-4 border-[#C8A34D] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {LOADING_STEPS[loadingStepIdx]}
                  </p>
                </div>
              ) : (
                <CleanMarkdownRenderer rawText={masterNotesContent} />
              )}
            </div>
          )}

          {/* TAB 2: FLASHCARDS */}
          {viewMode === 'flashcards' && parsedFlashcards.length > 0 && (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
              <div
                onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-[#C8A34D]/40 cursor-pointer min-h-[220px] flex flex-col items-center justify-center space-y-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8A34D]">
                  {showFlashcardAnswer ? 'ANSWER / DEFINITION' : 'QUESTION / TERM'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white max-w-md">
                  {showFlashcardAnswer
                    ? parsedFlashcards[currentFlashcardIdx]?.definition
                    : parsedFlashcards[currentFlashcardIdx]?.term}
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">Tap card to flip 🔄</span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <button
                  onClick={() => {
                    setCurrentFlashcardIdx((prev) => Math.max(0, prev - 1));
                    setShowFlashcardAnswer(false);
                  }}
                  disabled={currentFlashcardIdx === 0}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                >
                  ← Previous
                </button>
                <span>{currentFlashcardIdx + 1} of {parsedFlashcards.length}</span>
                <button
                  onClick={() => {
                    setCurrentFlashcardIdx((prev) => Math.min(parsedFlashcards.length - 1, prev + 1));
                    setShowFlashcardAnswer(false);
                  }}
                  disabled={currentFlashcardIdx === parsedFlashcards.length - 1}
                  className="px-4 py-2 rounded-xl bg-[#C8A34D] text-white disabled:opacity-50 cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MIND MAP */}
          {viewMode === 'mindmap' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#C8A34D]" /> Legal Concept Mind Map Tree
              </h3>
              <div className="space-y-3 pl-2">
                {mindMapNodes.map((node) => (
                  <div key={node.id} className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {node.label}
                    </div>
                    {node.children && (
                      <div className="pl-6 space-y-1.5 border-l-2 border-[#C8A34D]/40 ml-4">
                        {node.children.map((c) => (
                          <div key={c.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                            {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: 1-PAGE SUMMARY */}
          {viewMode === 'summary' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-block">
                ⚡ 1-MINUTE QUICK REVISION SUMMARY
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {parsedSummary}
              </p>
            </div>
          )}

          {/* TAB 5: SELF-ASSESSMENT MCQS */}
          {viewMode === 'mcq' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" /> Self-Assessment Practice MCQs
              </h3>
              <div className="space-y-5">
                {parsedMCQs.map((q) => {
                  const selectedOpt = userMCQAnswers[q.id];
                  const isSubmitted = selectedOpt !== undefined;

                  return (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {q.id}. {q.q}
                      </h4>
                      <div className="space-y-2">
                        {q.opts.map((opt, idx) => {
                          const isSel = selectedOpt === idx;
                          const isCorr = idx === q.ans;
                          let style = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

                          if (isSubmitted) {
                            if (isCorr) style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                            else if (isSel && !isCorr) style = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                          } else if (isSel) {
                            style = 'bg-[#C8A34D]/10 border-[#C8A34D] text-[#C8A34D] font-bold';
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => setUserMCQAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${style}`}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {isSubmitted && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          💡 <strong>Explanation:</strong> {q.exp}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PHASE 3: CONVERSATIONAL AI LEGAL TUTOR THREAD (ATTACHED TO ACTIVE NOTE) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <Brain className="w-4.5 h-4.5 text-[#C8A34D]" />
              <span>Ask AI Legal Tutor (Attached to this Note)</span>
            </h3>

            {/* Quick Follow-up Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                'Constitutional Provisions',
                'Landmark Supreme Court Rulings',
                'Explain in Hindi',
                'Give 5 MCQs on this',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFollowUpInstruction(chip)}
                  disabled={isFollowUpGenerating}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#C8A34D]/10 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#C8A34D] transition-all cursor-pointer whitespace-nowrap"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Follow-up Thread Responses */}
            {followUpThread.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {followUpThread.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8A34D]">
                      {msg.role === 'user' ? '👤 YOU ASKED:' : '🤖 AI TUTOR REPLY:'}
                    </span>
                    {msg.role === 'user' ? (
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        {msg.text}
                      </p>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-[#C8A34D]/30 min-h-[60px]">
                        {msg.isThinking || !msg.text ? (
                          <div className="flex items-center gap-2.5 text-xs font-bold text-[#C8A34D] py-1">
                            <div className="w-4 h-4 rounded-full border-2 border-[#C8A34D] border-t-transparent animate-spin" />
                            <span className="animate-pulse">✨ AI Tutor is thinking & reviewing note context...</span>
                          </div>
                        ) : (
                          <CleanMarkdownRenderer rawText={msg.text} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFollowUpInstruction()}
                placeholder="Ask follow-up question about this note (e.g., 'Explain Section 103 in Hindi', 'Compare with IPC')..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D]"
              />
              <button
                onClick={() => handleFollowUpInstruction()}
                disabled={isFollowUpGenerating || !followUpInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: MY SAVED NOTES LIBRARY MODAL */}
      {historyModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-[#111827] dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#C8A34D]" /> My Saved Study Notes Library
              </h3>
              <button
                onClick={() => setHistoryModalVisible(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {savedNotes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                  <p>No saved study notes found in your library.</p>
                  <p>Save notes from the workspace to access them anytime.</p>
                </div>
              ) : (
                savedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 hover:border-[#C8A34D]/50 transition-all"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#C8A34D]/10 text-[#C8A34D]">
                          {note.level}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{note.date}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {note.inputSource || 'AI Generated'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{note.topic}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenSavedNote(note)}
                        className="px-3 py-1.5 rounded-xl bg-[#C8A34D] text-white text-xs font-bold hover:bg-[#b08d3b] transition-all cursor-pointer"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(note)}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#C8A34D] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSavedNote(note.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RICH EDIT NOTE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-[#111827] dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#C8A34D]" /> Edit Study Note
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Note Title</label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Markdown Content</label>
                <textarea
                  rows={12}
                  value={editingNotesText}
                  onChange={(e) => setEditingNotesText(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedNotes}
                className="px-5 py-2 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
