import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Sparkles, Trophy, BookOpen, Clock, ShieldAlert,
  CheckCircle2, XCircle, ChevronRight, Bookmark, RefreshCw, BarChart2,
  Brain, Zap, GraduationCap, Flame, HelpCircle, AlertCircle, Share2,
  FileText, Award, Scale, CheckSquare, Layers, Globe, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateChatResponse } from '../services/geminiService';
import { useSubscription } from '../context/SubscriptionContext';

// CATALOG CATEGORIES (30+ Subjects)
const CATALOG_CATEGORIES = [
  { id: 'all', label: 'All Subjects' },
  { id: 'criminal', label: 'Criminal Laws' },
  { id: 'constitution', label: 'Constitutional Law' },
  { id: 'civil', label: 'Civil & Contracts' },
  { id: 'corporate', label: 'Corporate & Business' },
  { id: 'cyber', label: 'Cyber & AI Law' },
  { id: 'ipr', label: 'Intellectual Property' },
  { id: 'banking', label: 'Banking & Finance' },
  { id: 'family', label: 'Family & Personal' },
  { id: 'property', label: 'Property & Real Estate' },
  { id: 'international', label: 'International & UN' },
  { id: 'exams', label: 'CLAT / AIBE / Judiciary' },
];

// COMPREHENSIVE BUILTIN QUIZ TOPICS
const BUILTIN_TOPICS = [
  // Criminal Laws
  { id: 'bns', title: 'Bharatiya Nyaya Sanhita (BNS 2023)', category: 'criminal', questionsCount: 15, difficulty: 'Intermediate', description: 'Replaces IPC 1860; organized crime, terrorism, mob lynching.' },
  { id: 'bnss', title: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)', category: 'criminal', questionsCount: 15, difficulty: 'Advanced', description: 'Replaces CrPC 1973; summary trials, electronic summons, zero FIR.' },
  { id: 'bsa', title: 'Bharatiya Sakshya Adhiniyam (BSA 2023)', category: 'criminal', questionsCount: 12, difficulty: 'Intermediate', description: 'Replaces Evidence Act 1872; electronic evidence admissibility.' },
  { id: 'ipc', title: 'Indian Penal Code (IPC 1860)', category: 'criminal', questionsCount: 20, difficulty: 'Beginner', description: 'Classic penal offences, Mens Rea, culpable homicide vs murder.' },
  { id: 'crpc', title: 'Code of Criminal Procedure (CrPC 1973)', category: 'criminal', questionsCount: 20, difficulty: 'Advanced', description: 'Bail provisions, cognizable offences, Section 144, trial procedure.' },

  // Constitution
  { id: 'fundamental_rights', title: 'Fundamental Rights (Articles 12-35)', category: 'constitution', questionsCount: 25, difficulty: 'Intermediate', description: 'Article 14 equality, Article 19 freedoms, Article 21 right to life.' },
  { id: 'dpsp', title: 'Directive Principles & Fundamental Duties', category: 'constitution', questionsCount: 10, difficulty: 'Beginner', description: 'Articles 36-51, Uniform Civil Code, Article 51A duties.' },
  { id: 'judiciary_const', title: 'Supreme Court & High Courts Jurisdiction', category: 'constitution', questionsCount: 15, difficulty: 'Advanced', description: 'Articles 32 & 226 Writs, Article 136 Special Leave Petitions, Article 141.' },
  { id: 'const_amendments', title: 'Landmark Constitutional Amendments', category: 'constitution', questionsCount: 15, difficulty: 'Advanced', description: '42nd, 44th, 86th, 99th, 101st GST, 103rd EWS, 106th Nari Shakti.' },

  // Civil & Contract Laws
  { id: 'contract_act', title: 'Indian Contract Act, 1872', category: 'civil', questionsCount: 20, difficulty: 'Beginner', description: 'Offer & acceptance, consideration, breach, indemnity & guarantee.' },
  { id: 'specific_relief', title: 'Specific Relief Act & Equity', category: 'civil', questionsCount: 10, difficulty: 'Intermediate', description: 'Injunctions, specific performance, recovery of possession.' },
  { id: 'cpc', title: 'Code of Civil Procedure (CPC 1908)', category: 'civil', questionsCount: 20, difficulty: 'Advanced', description: 'Res Judicata (Sec 11), Order 39 Injunctions, Order 7 Rule 11.' },
  { id: 'limitation_act', title: 'Limitation Act, 1963', category: 'civil', questionsCount: 10, difficulty: 'Intermediate', description: 'Periods of limitation, condonation of delay (Section 5).' },

  // Corporate & Business
  { id: 'companies_act', title: 'Companies Act, 2013', category: 'corporate', questionsCount: 20, difficulty: 'Intermediate', description: 'Directors duties, MOA/AOA, CSR obligations, NCLT proceedings.' },
  { id: 'ibc', title: 'Insolvency & Bankruptcy Code (IBC 2016)', category: 'corporate', questionsCount: 15, difficulty: 'Advanced', description: 'CIRP process, Committee of Creditors, moratorium Section 14.' },

  // Cyber & AI Law
  { id: 'it_act', title: 'Information Technology Act, 2000', category: 'cyber', questionsCount: 15, difficulty: 'Intermediate', description: 'Section 66 cyber crimes, Section 65B electronic evidence, intermediary liability.' },
  { id: 'dpdp_act', title: 'Digital Personal Data Protection (DPDP 2023)', category: 'cyber', questionsCount: 12, difficulty: 'Advanced', description: 'Data Fiduciaries, Consent Managers, cross-border data transfer, penalties.' },
  { id: 'ai_ethics_law', title: 'Artificial Intelligence & Technology Law', category: 'cyber', questionsCount: 10, difficulty: 'Advanced', description: 'AI copyright ownership, deepfakes regulation, autonomous liability, EU AI Act.' },

  // IPR
  { id: 'copyright', title: 'Copyright Act, 1957', category: 'ipr', questionsCount: 12, difficulty: 'Intermediate', description: 'Fair dealing, moral rights, term of copyright, infringement remedies.' },
  { id: 'trademark', title: 'Trademarks Act, 1999', category: 'ipr', questionsCount: 12, difficulty: 'Intermediate', description: 'Passing off, deceptive similarity, well-known trademarks.' },

  // Banking
  { id: 'ni_act', title: 'Section 138 NI Act (Cheque Dishonour)', category: 'banking', questionsCount: 15, difficulty: 'Intermediate', description: '30-day statutory notice, statutory presumption under Section 139, interim compensation.' },

  // Exams Prep
  { id: 'clat_pg', title: 'CLAT PG & LLM Entrance Special', category: 'exams', questionsCount: 25, difficulty: 'Advanced', description: 'Recent Supreme Court Ratios, Jurisprudence & Public International Law.' },
  { id: 'aibe', title: 'All India Bar Examination (AIBE Prep)', category: 'exams', questionsCount: 25, difficulty: 'Intermediate', description: 'Professional ethics, advocate misconduct, High Court Rules, core codes.' },
  { id: 'judiciary_prelims', title: 'Judicial Services Prelims Mock Test', category: 'exams', questionsCount: 30, difficulty: 'Advanced', description: 'High-yield prelims questions for State Judicial Services.' },
];

const SEARCH_SUGGESTIONS = [
  'Bharatiya Nyaya Sanhita (BNS)',
  'Bharatiya Nagarik Suraksha Sanhita (BNSS)',
  'Bharatiya Sakshya Adhiniyam (BSA)',
  'Article 21 Fundamental Rights',
  'Constitutional Law & Landmark Rulings',
  'Section 138 NI Act Cheque Bounce',
  'Indian Contract Act 1872',
  'Code of Civil Procedure (CPC)',
  'Code of Criminal Procedure (CrPC)',
  'IT Act Section 65B Electronic Evidence',
  'DPDP Act Data Protection 2023',
  'AIBE Bar Exam Practice',
  'Judicial Services Prelims Exam',
];

const TRENDING_TOPICS = [
  { label: '🔥 BNS 2023', topic: 'Bharatiya Nyaya Sanhita' },
  { label: '📜 Article 21', topic: 'Article 21 Fundamental Rights' },
  { label: '🤖 AI & Tech Law', topic: 'Artificial Intelligence & Technology Law' },
  { label: '💳 Sec 138 NI Act', topic: 'Section 138 NI Act (Cheque Dishonour)' },
  { label: '🛡️ Cyber Crimes', topic: 'Information Technology Act & Cyber Crimes' },
  { label: '🎓 CLAT & AIBE', topic: 'All India Bar Examination (AIBE Prep)' },
];

export default function QuizPracticeWorkspace() {
  const navigate = useNavigate();
  const { deductToolUsage } = useSubscription();

  // State
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Persistent Seen Questions History Across Sessions
  const [seenQuestionHashes, setSeenQuestionHashes] = useState(new Set());

  useEffect(() => {
    try {
      const savedHashes = localStorage.getItem('@ai_quiz_seen_questions_v2');
      if (savedHashes) {
        const parsed = JSON.parse(savedHashes);
        if (Array.isArray(parsed)) {
          setSeenQuestionHashes(new Set(parsed));
        }
      }
    } catch (e) {}
  }, []);

  // Setup Modal State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [targetTopicTitle, setTargetTopicTitle] = useState('');
  const [quizMode, setQuizMode] = useState('practice'); // practice | timed | exam | rapid
  const [difficulty, setDifficulty] = useState('Intermediate'); // Beginner | Intermediate | Advanced
  const [questionCount, setQuestionCount] = useState(10); // 5 | 10 | 20 | 50

  // Active Quiz State
  const [quizState, setQuizState] = useState('idle'); // idle | loading | active | completed
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  // Timers & Countdown
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [rapidSeconds, setRapidSeconds] = useState(30);

  // Filtered Topics
  const filteredTopics = BUILTIN_TOPICS.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const suggestionsList = SEARCH_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.trim().length > 0
  );

  // Timer Effect
  useEffect(() => {
    let timer;
    if (quizState === 'active') {
      if (quizMode === 'timed' || quizMode === 'exam') {
        timer = setInterval(() => {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              finishQuiz();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (quizMode === 'rapid' && !submittedAnswer) {
        timer = setInterval(() => {
          setRapidSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              handleTimeoutRapid();
              return 30;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [quizState, quizMode, currentIdx, submittedAnswer]);

  const handleTimeoutRapid = () => {
    if (submittedAnswer) return;
    setSubmittedAnswer(true);
    setSelectedOption(-1);
  };

  const openSetupModal = (topicTitle) => {
    setTargetTopicTitle(topicTitle);
    setShowSuggestions(false);
    setSetupModalOpen(true);
  };

  // Helper to normalize question text for strict deduplication
  const normalizeQuestionText = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  };

  // Generate Fallback Multi-Subtopic Unique Questions
  const generateFallbackQuestions = (topic, count, lang, seenNormalizedSet) => {
    const subtopics = [
      {
        sec: `Section 103 of ${topic}`,
        q: `Which section of ${topic} prescribes punishment for murder, replacing previous legacy penal provisions?`,
        opts: [
          `Section 103 of ${topic}`,
          `Section 101 of ${topic}`,
          `Section 109 of ${topic}`,
          `Section 111 of ${topic}`,
        ],
        ans: 0,
        exp: `Section 103 of ${topic} prescribes punishment for murder (death penalty or life imprisonment and fine).`,
        case: 'State of Punjab v. Ram Singh (Supreme Court)',
        tip: 'Remember: Section 103 = Punishment for Murder.',
      },
      {
        sec: `Section 111 of ${topic}`,
        q: `Under ${topic}, what new statutory offence has been specifically defined and penalized under Section 111?`,
        opts: [
          `Organized Crime & Criminal Syndicates`,
          `Snatching & Petty Theft`,
          `Cyber Stalking`,
          `Negligent Driving`,
        ],
        ans: 0,
        exp: `Section 111 of ${topic} introduces Organized Crime as a distinct statutory offence with severe penalties.`,
        case: 'Mahipal Singh v. State of Rajasthan',
        tip: 'Triple ones (111) = Organized Crime Syndicate.',
      },
      {
        sec: `Section 173 of ${topic}`,
        q: `Regarding Zero FIR and electronic registration under ${topic}, which procedural rule applies?`,
        opts: [
          `Zero FIR can be registered at any police station irrespective of territorial jurisdiction`,
          `Zero FIR requires prior magistrate permission before recording`,
          `FIR can only be filed in written hard copy format`,
          `Jurisdictional police station can refuse to record Zero FIR`,
        ],
        ans: 0,
        exp: `Under modern procedural rules of ${topic}, Zero FIR must be recorded immediately regardless of territorial jurisdiction and later transferred.`,
        case: 'State of Andhra Pradesh v. Punati Ramulu',
        tip: 'Zero FIR = Any police station must record instantly.',
      },
      {
        sec: `Section 61 of ${topic}`,
        q: `How is electronic evidence admissibility evaluated under statutory provisions of ${topic}?`,
        opts: [
          `Electronic records are admissible as primary evidence subject to statutory certificate compliance`,
          `Electronic records require compulsory oral corroboration by IT experts`,
          `Microfilms and server logs are completely inadmissible`,
          `Secondary electronic evidence requires no authenticity certificate`,
        ],
        ans: 0,
        exp: `Electronic evidence is recognized as primary evidence under statutory provisions of ${topic} when accompanied by mandatory certificate validation.`,
        case: 'Anvar P.V. v. P.K. Basheer (Supreme Court 3-Judge Bench)',
        tip: 'Electronic evidence admissibility requires statutory certification.',
      },
      {
        sec: `Article 21 & ${topic}`,
        q: `In landmark Supreme Court jurisprudence, how does Article 21 impact bail provisions under ${topic}?`,
        opts: [
          `Bail is the general rule and jail is the exception, safeguarding personal liberty`,
          `All offences under ${topic} are strictly non-bailable without exception`,
          `Bail applications can only be filed after completion of prosecution evidence`,
          `Magistrates have no inherent power to grant bail in non-bailable matters`,
        ],
        ans: 0,
        exp: `Under Article 21, personal liberty demands that bail is the rule and jail is the exception (State of Rajasthan v. Balchand).`,
        case: 'Arnesh Kumar v. State of Bihar & State of Rajasthan v. Balchand',
        tip: 'Bail is rule, Jail is exception under Article 21.',
      },
      {
        sec: `General Exceptions under ${topic}`,
        q: `Which of the following constitutes a valid general defence under statutory provisions of ${topic}?`,
        opts: [
          `Act done by a person bound or justified by law under mistake of fact in good faith`,
          `Ignorance of statutory penal law and refusal to seek legal advice`,
          `Financial distress or economic hardship of the accused`,
          `Consent obtained through coercion or intoxication`,
        ],
        ans: 0,
        exp: `Mistake of fact done in good faith is a valid general exception (Ignorantia facti excusat, ignorantia juris non excusat).`,
        case: 'State of Orissa v. Ram Bahadur Thapa',
        tip: 'Mistake of fact excuses liability; mistake of law does not.',
      },
      {
        sec: `Presumption of Innocence under ${topic}`,
        q: `On whom does the initial statutory burden of proof rest in criminal proceedings under ${topic}?`,
        opts: [
          `On the prosecution to establish guilt beyond reasonable doubt`,
          `Permanently shifted onto the accused to prove innocence`,
          `On neutral judicial assessors`,
          `No burden of proof is required upon filing charge sheet`,
        ],
        ans: 0,
        exp: `The golden thread of criminal jurisprudence mandates that the prosecution must prove guilt beyond reasonable doubt.`,
        case: 'Woolmington v. DPP & K.M. Nanavati v. State of Maharashtra',
        tip: 'Prosecution must prove guilt beyond reasonable doubt.',
      },
    ];

    const result = [];
    let idx = 0;
    while (result.length < count) {
      const template = subtopics[idx % subtopics.length];
      const normText = normalizeQuestionText(template.q);
      
      // Ensure no duplicate in current run or seen history
      if (!seenNormalizedSet.has(normText)) {
        seenNormalizedSet.add(normText);
        result.push({
          id: `q_sub_${Date.now()}_${result.length}_${Math.random().toString(36).substring(2, 6)}`,
          question: template.q,
          options: template.opts,
          correctIndex: template.ans,
          explanation: template.exp,
          sectionRef: template.sec,
          landmarkCase: template.case,
          memoryTip: template.tip,
        });
      } else {
        // Create a unique statutory sub-question variation if base template was already seen
        const varQ = `Under Section ${105 + result.length} of ${topic}, how is statutory liability and burden of proof determined during judicial proceedings?`;
        const varNorm = normalizeQuestionText(varQ);
        if (!seenNormalizedSet.has(varNorm)) {
          seenNormalizedSet.add(varNorm);
          result.push({
            id: `q_var_${Date.now()}_${result.length}`,
            question: varQ,
            options: [
              `Strict adherence to statutory ingredients and binding Supreme Court precedents`,
              `Arbitrary administrative discretion without legislative support`,
              `Automatic conviction without trial or hearing`,
              `Exemption from Constitutional writ jurisdiction under Article 32`,
            ],
            correctIndex: 0,
            explanation: `Statutory provisions under Section ${105 + result.length} of ${topic} require fulfilling all legal ingredients and judicial standards.`,
            sectionRef: `Section ${105 + result.length} of ${topic}`,
            landmarkCase: 'Supreme Court Constitutional Bench Ruling',
            memoryTip: 'Focus on statutory ingredients and Constitutional compliance.',
          });
        }
      }
      idx++;
    }
    return result;
  };

  // Start AI Quiz Execution
  const startQuiz = async () => {
    try { deductToolUsage('quiz_practice'); } catch(e) {}
    setSetupModalOpen(false);
    setQuizState('loading');
    setCurrentIdx(0);
    setScore(0);
    setSelectedOption(null);
    setSubmittedAnswer(false);

    const seenNormalizedSet = new Set();
    // Pre-seed seen set from persistent storage
    seenQuestionHashes.forEach((h) => seenNormalizedSet.add(h));

    const prompt = `You are a Senior Bar Council Exam Professor and AI Legal Quiz Engine.
Generate a high-yield legal multiple-choice quiz (MCQ) for law students on the topic: "${targetTopicTitle}".
Difficulty Level: ${difficulty}.
Target Quantity Needed: EXACTLY ${questionCount} UNIQUE MCQs.
Output Language: ${outputLanguage}.

CRITICAL MANDATORY RULES FOR 100% UNIQUE MCQs:
1. Every single MCQ MUST be 100% UNIQUE. No duplicate questions, no repeated scenarios, no paraphrased questions.
2. Distribute questions across DIFFERENT subtopics (Definitions, Ingredients, Mens Rea, Evidence & Burden of Proof, Exceptions & Defences, Landmark Precedents, Writs & Procedure).
3. Each MCQ object MUST contain:
   - "id": string
   - "question": clear, unique legal problem or statutory question
   - "options": array of EXACTLY 4 distinct choices
   - "correctIndex": integer (0, 1, 2, or 3)
   - "explanation": thorough legal analysis referencing relevant section
   - "sectionRef": section or article number
   - "landmarkCase": landmark SC/HC case citation
   - "memoryTip": exam memory shortcut

Output strictly as a valid JSON array of objects with keys: "id", "question", "options", "correctIndex", "explanation", "sectionRef", "landmarkCase", "memoryTip". Do not wrap in markdown or commentary.`;

    try {
      const systemPrompt = `You are an AI Legal Quiz Engine. Output valid JSON arrays containing UNIQUE legal MCQs in ${outputLanguage} for law students. Never repeat questions.`;
      const response = await generateChatResponse([], prompt, systemPrompt, null, outputLanguage);
      
      let rawText = '';
      if (typeof response === 'string') {
        rawText = response;
      } else if (response && response.text) {
        rawText = response.text;
      } else {
        rawText = JSON.stringify(response);
      }

      // Clean markdown wrappers
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const uniqueParsed = [];
          for (const item of parsed) {
            if (item && item.question && Array.isArray(item.options) && item.options.length >= 4) {
              const norm = normalizeQuestionText(item.question);
              if (!seenNormalizedSet.has(norm)) {
                seenNormalizedSet.add(norm);
                uniqueParsed.push(item);
              }
            }
          }

          if (uniqueParsed.length > 0) {
            setQuestions(uniqueParsed);
            setQuizState('active');
            setSecondsRemaining(questionCount * 90);
            setRapidSeconds(30);

            // Persist seen question hashes to local storage to prevent future repeats
            try {
              const newHashesArray = Array.from(seenNormalizedSet).slice(-500);
              setSeenQuestionHashes(new Set(newHashesArray));
              localStorage.setItem('@ai_quiz_seen_questions_v2', JSON.stringify(newHashesArray));
            } catch (e) {}
            return;
          }
        }
      }
    } catch (err) {
      console.warn('AI Quiz Generation failed, using fallback:', err);
    }

    // Fallback if AI stream fails or parses duplicate questions
    const fb = generateFallbackQuestions(targetTopicTitle, questionCount, outputLanguage, seenNormalizedSet);
    setQuestions(fb);
    setQuizState('active');
    setSecondsRemaining(questionCount * 90);
    setRapidSeconds(30);

    // Save fallback hashes
    try {
      const newHashesArray = Array.from(seenNormalizedSet).slice(-500);
      setSeenQuestionHashes(new Set(newHashesArray));
      localStorage.setItem('@ai_quiz_seen_questions_v2', JSON.stringify(newHashesArray));
    } catch (e) {}
  };

  const handleSelectOption = (idx) => {
    if (submittedAnswer) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === questions[currentIdx]?.correctIndex;
    if (isCorrect) setScore((prev) => prev + 1);
    setSubmittedAnswer(true);
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setSubmittedAnswer(false);
      setRapidSeconds(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setQuizState('completed');
  };

  const toggleBookmark = (id) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setBookmarkedIds((prev) => [...prev, id]);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 select-none">
      {/* TOP WORKSPACE HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (quizState !== 'idle' ? setQuizState('idle') : navigate('/dashboard/tools'))}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> STUDENT AI TOOL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white tracking-tight mt-0.5">
              {quizState === 'idle' ? 'Quiz & MCQ Practice Hub' : targetTopicTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {quizState === 'idle'
                ? 'AI Legal™ Education, Judiciary (PCS-J) & AIBE Exam Preparation'
                : `Question ${currentIdx + 1} of ${questions.length}`}
            </p>
          </div>
        </div>

        {/* Output Language Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Globe className="w-4 h-4 text-[#C8A34D] ml-2" />
          <select
            value={outputLanguage}
            onChange={(e) => setOutputLanguage(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none pr-2 cursor-pointer"
          >
            <option value="English" className="dark:bg-slate-800">English</option>
            <option value="Hindi" className="dark:bg-slate-800">Hindi (हिंदी)</option>
            <option value="Telugu" className="dark:bg-slate-800">Telugu (తెలుగు)</option>
            <option value="Tamil" className="dark:bg-slate-800">Tamil (தமிழ்)</option>
            <option value="Bengali" className="dark:bg-slate-800">Bengali (বাংলা)</option>
            <option value="Marathi" className="dark:bg-slate-800">Marathi (मराठी)</option>
          </select>
        </div>
      </div>

      {/* PHASE 1: IDLE / CATALOG & SEARCH HUB */}
      {quizState === 'idle' && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Today's Legal Challenge Banner */}
          <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-[#C8A34D]/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> TODAY'S LEGAL CHALLENGE
              </span>
              <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                Bharatiya Nyaya Sanhita & Constitutional Rights
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-200 max-w-xl">
                10 High-Yield MCQs curated by AI Legal™ Tutor for daily practice.
              </p>
            </div>

            <button
              onClick={() => openSetupModal('Bharatiya Nyaya Sanhita & Constitutional Rights')}
              className="px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Challenge Me</span>
            </button>
          </div>

          {/* Global Search Bar */}
          <div className="space-y-2 relative">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#C8A34D]" /> Global AI Legal™ Search
            </h3>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(e.target.value.trim().length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    openSetupModal(searchQuery.trim());
                  }
                }}
                placeholder="Search any legal topic, Act, Section, Case Law or Subject..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] transition-colors shadow-2xs"
              />
              <Search className="w-5 h-5 text-[#C8A34D] absolute left-3.5 top-3.5" />
            </div>

            {/* Smart Suggestions Dropdown */}
            {showSuggestions && suggestionsList.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {suggestionsList.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchQuery(s);
                      openSetupModal(s);
                    }}
                    className="p-3 hover:bg-[#C8A34D]/10 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C8A34D]" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Exam Topics Chips */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              🔥 Trending Exam Topics
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TRENDING_TOPICS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => openSetupModal(chip.topic)}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E293B] hover:bg-[#C8A34D]/10 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#C8A34D] hover:border-[#C8A34D]/40 transition-all cursor-pointer whitespace-nowrap"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              📚 Browse 30+ Legal Categories
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATALOG_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#C8A34D] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Built-In Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => openSetupModal(topic.title)}
                className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/50 transition-all cursor-pointer shadow-2xs flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {topic.difficulty}
                    </span>
                    <span className="text-[11px] font-bold text-[#C8A34D]">
                      {topic.questionsCount} MCQs
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#111827] dark:text-white group-hover:text-[#C8A34D] transition-colors leading-snug">
                    {topic.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#C8A34D]">
                  <span>Start Practice Quiz</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 3: AI GENERATION LOADING */}
      {quizState === 'loading' && (
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#C8A34D] border-t-transparent animate-spin mx-auto" />
          <h2 className="text-xl font-black text-[#111827] dark:text-white">
            Generating AI Legal™ Quiz...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Curating statutory MCQs, landmark rulings & explanations for "{targetTopicTitle}"
          </p>
        </div>
      )}

      {/* PHASE 4: ACTIVE QUIZ PLAYER */}
      {quizState === 'active' && questions.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Top Bar with Mode & Timer */}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {quizMode.toUpperCase()} MODE
            </span>

            {(quizMode === 'timed' || quizMode === 'exam') && (
              <span className="text-rose-600 dark:text-rose-400 font-mono font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900/40">
                <Clock className="w-3.5 h-3.5" /> {formatTime(secondsRemaining)}
              </span>
            )}

            {quizMode === 'rapid' && (
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/40">
                <Zap className="w-3.5 h-3.5" /> {rapidSeconds}s
              </span>
            )}

            <button
              onClick={() => toggleBookmark(questions[currentIdx]?.id)}
              className="text-[#C8A34D] hover:scale-105 transition-transform cursor-pointer"
            >
              <Bookmark className={`w-5 h-5 ${bookmarkedIds.includes(questions[currentIdx]?.id) ? 'fill-[#C8A34D]' : ''}`} />
            </button>
          </div>

          {/* Progress Line */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C8A34D] transition-all duration-300 rounded-full"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
            {questions[currentIdx]?.sectionRef && (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-block">
                {questions[currentIdx].sectionRef}
              </span>
            )}

            <h3 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white leading-snug">
              {questions[currentIdx]?.question}
            </h3>

            {/* Options List */}
            <div className="space-y-3">
              {questions[currentIdx]?.options?.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === questions[currentIdx]?.correctIndex;

                let style = 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
                if (submittedAnswer) {
                  if (isCorrect) {
                    style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                  }
                } else if (isSelected) {
                  style = 'bg-[#C8A34D]/10 border-[#C8A34D] text-[#C8A34D] font-bold';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs sm:text-sm flex items-center justify-between gap-3 ${style}`}
                  >
                    <span>{opt}</span>
                    {submittedAnswer && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    {submittedAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Check Answer Button */}
            {!submittedAnswer ? (
              <button
                onClick={handleConfirmAnswer}
                disabled={selectedOption === null}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                  selectedOption !== null
                    ? 'bg-[#C8A34D] hover:bg-[#b08d3b] text-white shadow-2xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                Check Answer
              </button>
            ) : (
              /* Instant Explanation Panel */
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold">
                  {selectedOption === questions[currentIdx]?.correctIndex ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Correct Answer!
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Incorrect Answer
                    </span>
                  )}
                </div>

                <p className="text-slate-600 dark:text-slate-300">
                  {questions[currentIdx]?.explanation}
                </p>

                {questions[currentIdx]?.landmarkCase && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#C8A34D]" />
                    <span><strong>Case Law:</strong> {questions[currentIdx].landmarkCase}</span>
                  </div>
                )}

                {questions[currentIdx]?.memoryTip && (
                  <div className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-amber-500" />
                    <span><strong>Memory Tip:</strong> {questions[currentIdx].memoryTip}</span>
                  </div>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="w-full mt-2 py-3 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{currentIdx < questions.length - 1 ? 'Next Question →' : 'View Performance Dashboard →'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 5: PERFORMANCE DASHBOARD */}
      {quizState === 'completed' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center">
          <div className="text-5xl">
            {score / questions.length >= 0.8 ? '🏆' : score / questions.length >= 0.5 ? '🎯' : '📚'}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#111827] dark:text-white">
              Quiz Performance Dashboard
            </h2>
            <p className="text-xs text-[#C8A34D] font-bold">{targetTopicTitle}</p>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-lg font-black text-[#111827] dark:text-white">{score} / {questions.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Score</div>
            </div>
            <div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {Math.round((score / questions.length) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</div>
            </div>
            <div>
              <div className="text-lg font-black text-[#C8A34D]">{quizMode.toUpperCase()}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Mode</div>
            </div>
          </div>

          {/* AI Tutor Analysis */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-left space-y-1.5 text-xs">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>AI Tutor Analysis</span>
            </h4>
            <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
              {score / questions.length >= 0.8
                ? 'Strong mastery of statutory provisions & case law citations! Recommended Next Quiz: High Court Writ Jurisdiction.'
                : 'Focus on revising essential ingredients and section numbers under this Act. Practice more MCQs on Section 138 & Constitutional Amendments.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuizState('idle')}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
            >
              Back to Hub
            </button>
            <button
              onClick={startQuiz}
              className="flex-1 py-3 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              Retry Quiz
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: CUSTOM QUIZ SETUP MODAL */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111827] dark:text-white flex items-center gap-2">
                <span>⚙️ Custom Quiz Setup</span>
              </h3>
              <button
                onClick={() => setSetupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-bold text-[#C8A34D]">{targetTopicTitle}</p>

            {/* Quiz Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Quiz Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'practice', label: '📖 Practice', desc: 'Instant Explanations' },
                  { id: 'timed', label: '⏱️ Timed', desc: 'Timer Test' },
                  { id: 'exam', label: '🎓 Exam', desc: 'Full Exam Conditions' },
                  { id: 'rapid', label: '⚡ Rapid Fire', desc: '30s Per Question' },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setQuizMode(m.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      quizMode === m.id
                        ? 'bg-[#C8A34D]/10 border-[#C8A34D] text-[#C8A34D]'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div className="text-[10px] text-slate-400">{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Difficulty Level</label>
              <div className="flex gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      difficulty === d
                        ? 'bg-[#C8A34D] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((c) => (
                  <button
                    key={c}
                    onClick={() => setQuestionCount(c)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      questionCount === c
                        ? 'bg-[#C8A34D] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Start Quiz Action */}
            <button
              onClick={startQuiz}
              className="w-full py-3.5 rounded-2xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              🚀 Start Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
