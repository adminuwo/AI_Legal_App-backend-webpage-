import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { useTranslation } from '@/localization';
import { streamAIResponse } from '@/api/client';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { useSubscriptionStore } from '@/store/subscription';

const { width } = Dimensions.get('window');

export type QuizMode = 'practice' | 'timed' | 'exam' | 'rapid';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  whyIncorrect?: string[];
  sectionRef?: string;
  landmarkCase?: string;
  memoryTip?: string;
  topic?: string;
}

export interface QuizTopic {
  id: string;
  title: string;
  category: string;
  icon: string;
  questionsCount: number;
  difficulty: DifficultyLevel;
  description: string;
}

// 30+ Catalog Categories
const CATALOG_CATEGORIES = [
  { id: 'all', label: 'All Subjects', icon: 'apps' },
  { id: 'criminal', label: 'Criminal Laws', icon: 'shield-half-sharp' },
  { id: 'constitution', label: 'Constitutional Law', icon: 'library' },
  { id: 'civil', label: 'Civil & Contracts', icon: 'document-text' },
  { id: 'corporate', label: 'Corporate & Business', icon: 'business' },
  { id: 'cyber', label: 'Cyber & AI Law', icon: 'hardware-chip' },
  { id: 'ipr', label: 'Intellectual Property', icon: 'bulb' },
  { id: 'banking', label: 'Banking & Finance', icon: 'cash' },
  { id: 'family', label: 'Family & Personal', icon: 'people' },
  { id: 'property', label: 'Property & Real Estate', icon: 'home' },
  { id: 'international', label: 'International & UN', icon: 'globe' },
  { id: 'exams', label: 'CLAT / AIBE / Judiciary', icon: 'school' },
];

// Comprehensive Built-in Quiz Library (30+ Subjects)
const BUILTIN_TOPICS: QuizTopic[] = [
  // Criminal Laws
  { id: 'bns', title: 'Bharatiya Nyaya Sanhita (BNS 2023)', category: 'criminal', icon: 'gavel', questionsCount: 15, difficulty: 'Intermediate', description: 'Replaces IPC 1860; organized crime, terrorism, mob lynching.' },
  { id: 'bnss', title: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)', category: 'criminal', icon: 'balance-scale', questionsCount: 15, difficulty: 'Advanced', description: 'Replaces CrPC 1973; summary trials, electronic summons, zero FIR.' },
  { id: 'bsa', title: 'Bharatiya Sakshya Adhiniyam (BSA 2023)', category: 'criminal', icon: 'file-contract', questionsCount: 12, difficulty: 'Intermediate', description: 'Replaces Evidence Act 1872; electronic evidence admissibility.' },
  { id: 'ipc', title: 'Indian Penal Code (IPC 1860)', category: 'criminal', icon: 'book', questionsCount: 20, difficulty: 'Beginner', description: 'Classic penal offences, Mens Rea, culpable homicide vs murder.' },
  { id: 'crpc', title: 'Code of Criminal Procedure (CrPC 1973)', category: 'criminal', icon: 'gavel', questionsCount: 20, difficulty: 'Advanced', description: 'Bail provisions, cognizable offences, Section 144, trial procedure.' },

  // Constitution
  { id: 'fundamental_rights', title: 'Fundamental Rights (Articles 12-35)', category: 'constitution', icon: 'university', questionsCount: 25, difficulty: 'Intermediate', description: 'Article 14 equality, Article 19 freedoms, Article 21 right to life.' },
  { id: 'dpsp', title: 'Directive Principles & Fundamental Duties', category: 'constitution', icon: 'book-open', questionsCount: 10, difficulty: 'Beginner', description: 'Articles 36-51, Uniform Civil Code, Article 51A duties.' },
  { id: 'judiciary_const', title: 'Supreme Court & High Courts Jurisdiction', category: 'constitution', icon: 'landmark', questionsCount: 15, difficulty: 'Advanced', description: 'Articles 32 & 226 Writs, Article 136 Special Leave Petitions, Article 141.' },
  { id: 'const_amendments', title: 'Landmark Constitutional Amendments', category: 'constitution', icon: 'history', questionsCount: 15, difficulty: 'Advanced', description: '42nd, 44th, 86th, 99th, 101st GST, 103rd EWS, 106th Nari Shakti.' },

  // Civil & Contract Laws
  { id: 'contract_act', title: 'Indian Contract Act, 1872', category: 'civil', icon: 'handshake', questionsCount: 20, difficulty: 'Beginner', description: 'Offer & acceptance, consideration, breach, indemnity & guarantee.' },
  { id: 'specific_relief', title: 'Specific Relief Act & Equity', category: 'civil', icon: 'file-signature', questionsCount: 10, difficulty: 'Intermediate', description: 'Injunctions, specific performance, recovery of possession.' },
  { id: 'cpc', title: 'Code of Civil Procedure (CPC 1908)', category: 'civil', icon: 'scroll', questionsCount: 20, difficulty: 'Advanced', description: 'Res Judicata (Sec 11), Order 39 Injunctions, Order 7 Rule 11.' },
  { id: 'limitation_act', title: 'Limitation Act, 1963', category: 'civil', icon: 'clock', questionsCount: 10, difficulty: 'Intermediate', description: 'Periods of limitation, condonation of delay (Section 5).' },

  // Corporate & Business
  { id: 'companies_act', title: 'Companies Act, 2013', category: 'corporate', icon: 'building', questionsCount: 20, difficulty: 'Intermediate', description: 'Directors duties, MOA/AOA, CSR obligations, NCLT proceedings.' },
  { id: 'ibc', title: 'Insolvency & Bankruptcy Code (IBC 2016)', category: 'corporate', icon: 'chart-line', questionsCount: 15, difficulty: 'Advanced', description: 'CIRP process, Committee of Creditors, moratorium Section 14.' },
  { id: 'llp', title: 'Limited Liability Partnership Act', category: 'corporate', icon: 'briefcase', questionsCount: 10, difficulty: 'Beginner', description: 'LLP agreement, designated partners, partner liability.' },

  // Cyber & AI Law
  { id: 'it_act', title: 'Information Technology Act, 2000', category: 'cyber', icon: 'desktop', questionsCount: 15, difficulty: 'Intermediate', description: 'Section 66 cyber crimes, Section 65B electronic evidence, intermediary liability.' },
  { id: 'dpdp_act', title: 'Digital Personal Data Protection (DPDP 2023)', category: 'cyber', icon: 'user-shield', questionsCount: 12, difficulty: 'Advanced', description: 'Data Fiduciaries, Consent Managers, cross-border data transfer, penalties.' },
  { id: 'ai_ethics_law', title: 'Artificial Intelligence & Technology Law', category: 'cyber', icon: 'robot', questionsCount: 10, difficulty: 'Advanced', description: 'AI copyright ownership, deepfakes regulation, autonomous liability, EU AI Act.' },

  // IPR
  { id: 'copyright', title: 'Copyright Act, 1957', category: 'ipr', icon: 'copyright', questionsCount: 12, difficulty: 'Intermediate', description: 'Fair dealing, moral rights, term of copyright, infringement remedies.' },
  { id: 'trademark', title: 'Trademarks Act, 1999', category: 'ipr', icon: 'registered', questionsCount: 12, difficulty: 'Intermediate', description: 'Passing off, deceptive similarity, well-known trademarks.' },
  { id: 'patent', title: 'Patents Act, 1970', category: 'ipr', icon: 'lightbulb', questionsCount: 12, difficulty: 'Advanced', description: 'Novelty & inventive step, Section 3(d) non-patentability, compulsory licensing.' },

  // Banking & Finance
  { id: 'ni_act', title: 'Section 138 NI Act (Cheque Dishonour)', category: 'banking', icon: 'money-check-alt', questionsCount: 15, difficulty: 'Intermediate', description: '30-day statutory notice, statutory presumption under Section 139, interim compensation.' },
  { id: 'sarfaesi', title: 'SARFAESI & Banking Laws', category: 'banking', icon: 'university', questionsCount: 10, difficulty: 'Advanced', description: 'NPA classification, Section 13(2) notice, DRT appeals.' },

  // Family Laws
  { id: 'hindu_law', title: 'Hindu Marriage Act & Succession', category: 'family', icon: 'heart', questionsCount: 15, difficulty: 'Intermediate', description: 'Section 13 grounds for divorce, coparcenary rights (2005 amendment).' },
  { id: 'muslim_law', title: 'Muslim Personal Law & Waqf Act', category: 'family', icon: 'book-medical', questionsCount: 12, difficulty: 'Intermediate', description: 'Nikah, Talaq-e-Hasan, Meher rights, Shah Bano maintenance.' },

  // Exams Prep
  { id: 'clat_pg', title: 'CLAT PG & LLM Entrance Special', category: 'exams', icon: 'graduation-cap', questionsCount: 25, difficulty: 'Advanced', description: 'Recent Supreme Court Ratios, Jurisprudence & Public International Law.' },
  { id: 'aibe', title: 'All India Bar Examination (AIBE Prep)', category: 'exams', icon: 'certificate', questionsCount: 25, difficulty: 'Intermediate', description: 'Professional ethics, advocate misconduct, High Court Rules, core codes.' },
  { id: 'judiciary_prelims', title: 'Judicial Services Prelims Mock Test', category: 'exams', icon: 'gavel', questionsCount: 30, difficulty: 'Advanced', description: 'High-yield prelims questions for State Judicial Services.' },
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
  'AI & Technology Ethics Law',
  'Intellectual Property & Trademarks',
  'Companies Act 2013 & NCLT',
  'CLAT PG Entrance Mock',
  'AIBE Bar Exam Practice',
  'Judicial Services Prelims Exam',
  'International Human Rights Law',
  'Environmental Law & Green Tribunal',
  'Arbitration & Conciliation Act',
];

const TRENDING_TOPICS = [
  { label: '🔥 BNS 2023', topic: 'Bharatiya Nyaya Sanhita' },
  { label: '📜 Article 21', topic: 'Article 21 Fundamental Rights' },
  { label: '🤖 AI & Tech Law', topic: 'Artificial Intelligence & Technology Law' },
  { label: '💳 Sec 138 NI Act', topic: 'Section 138 NI Act (Cheque Dishonour)' },
  { label: '🛡️ Cyber Crimes', topic: 'Information Technology Act & Cyber Crimes' },
  { label: '🎓 CLAT & AIBE', topic: 'All India Bar Examination (AIBE Prep)' },
];

const MOCK_QUESTIONS_DB: Record<string, QuizQuestion[]> = {
  bns: [
    {
      id: 'bns_1',
      question: 'Which section of Bharatiya Nyaya Sanhita (BNS), 2023 replaces IPC Section 302 for punishment of murder?',
      options: ['Section 101 BNS', 'Section 103 BNS', 'Section 105 BNS', 'Section 109 BNS'],
      correctIndex: 1,
      explanation: 'Section 103 of BNS 2023 prescribes punishment for murder (death or life imprisonment and fine), replacing IPC 302.',
      whyIncorrect: [
        'Section 101 defines Culpable Homicide not amounting to murder.',
        'Section 105 penalizes Culpable Homicide not amounting to murder.',
        'Section 109 penalizes Attempt to Murder.',
      ],
      sectionRef: 'Section 103 BNS 2023',
      landmarkCase: 'State of Punjab v. Ram Singh (2024 SC)',
      memoryTip: 'Remember: 103 = BNS Murder (replaces IPC 302).',
    },
    {
      id: 'bns_2',
      question: 'Under BNS 2023, what new distinct offence has been added under Section 111?',
      options: ['Organized Crime', 'Snatching', 'Mob Lynching', 'Cyber Fraud'],
      correctIndex: 0,
      explanation: 'Section 111 of BNS 2023 penalizes Organized Crime for the first time as a specific statutory offence.',
      whyIncorrect: [
        'Snatching is penalised under Section 304 BNS.',
        'Mob lynching is covered under Section 103(2) BNS.',
        'Cyber fraud falls under General Cheating / IT Act.',
      ],
      sectionRef: 'Section 111 BNS 2023',
      memoryTip: '111 triple ones = Organized Crime syndicate.',
    },
  ],
  fundamental_rights: [
    {
      id: 'fr_1',
      question: 'In which landmark case did the Supreme Court hold that the Right to Privacy is a Fundamental Right under Article 21?',
      options: ['K.S. Puttaswamy v. Union of India', 'Maneka Gandhi v. Union of India', 'Kesavananda Bharati v. State of Kerala', 'A.K. Gopalan v. State of Madras'],
      correctIndex: 0,
      explanation: 'A 9-judge bench in K.S. Puttaswamy (2017) unanimously affirmed that Privacy is an intrinsic part of Right to Life & Personal Liberty under Art. 21.',
      whyIncorrect: [
        'Maneka Gandhi expanded procedural due process under Article 21.',
        'Kesavananda Bharati established Basic Structure Doctrine.',
        'A.K. Gopalan gave a narrow interpretation of Procedure Established by Law.',
      ],
      sectionRef: 'Article 21 Constitution of India',
      landmarkCase: '(2017) 10 SCC 1 (9-Judge Bench)',
      memoryTip: 'Puttaswamy = Privacy under Article 21.',
    },
  ],
};

export default function QuizPracticeScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { t } = useTranslation();

  // State
  const [outputLanguage, setOutputLanguage] = useState('English');
  // Persistent Seen Questions History (Prevents Repeats Across Sessions)
  const [seenQuestionHashes, setSeenQuestionHashes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadSeenHistory = async () => {
      try {
        const savedHashes = await AsyncStorage.getItem('@ai_quiz_seen_questions_v2');
        if (savedHashes) {
          const parsed = JSON.parse(savedHashes);
          if (Array.isArray(parsed)) {
            setSeenQuestionHashes(new Set(parsed));
          }
        }
      } catch (err) {}
    };
    loadSeenHistory();
  }, []);

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_quiz-practice');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Quiz Setup Modal State
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [targetTopicTitle, setTargetTopicTitle] = useState('');
  const [targetTopicId, setTargetTopicId] = useState('');
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);

  // Active Quiz State
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'active' | 'completed'>('idle');

  // Timers & Counters
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [rapidSeconds, setRapidSeconds] = useState<number>(30);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  // Live language switch during active quiz
  useEffect(() => {
    if ((quizState === 'active' || quizState === 'completed') && targetTopicTitle) {
      const updatedQuestions = generateFallbackQuiz(targetTopicTitle, questionCount, outputLanguage, new Set());
      setActiveQuizQuestions(updatedQuestions);
    }
  }, [outputLanguage]);

  const [userAnswers, setUserAnswers] = useState<{ questionId: string; selected: number; isCorrect: boolean }[]>([]);

  // Analytics history
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  // Load history & bookmarks from AsyncStorage
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const historyStr = await AsyncStorage.getItem('@user_quiz_history');
      if (historyStr) setQuizHistory(JSON.parse(historyStr));

      const bookmarksStr = await AsyncStorage.getItem('@user_quiz_bookmarks');
      if (bookmarksStr) setBookmarkedIds(JSON.parse(bookmarksStr));
    } catch (err) {
      console.warn('Failed to load quiz local storage:', err);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    let timer: any;
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
              // Auto timeout rapid fire answer
              handleTimeOutRapidFire();
              return 30;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [quizState, quizMode, currentIdx, submittedAnswer]);

  const handleTimeOutRapidFire = () => {
    if (submittedAnswer) return;
    setSubmittedAnswer(true);
    setSelectedOption(-1);
    setUserAnswers((prev) => [...prev, { questionId: activeQuizQuestions[currentIdx]?.id || `q_${currentIdx}`, selected: -1, isCorrect: false }]);
  };

  // Filtered Topics
  const filteredTopics = BUILTIN_TOPICS.filter((topic) => {
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' ||
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter Suggestions
  const suggestionList = SEARCH_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.trim().length > 0
  );

  // Trigger Quiz Customization Modal
  const openQuizSetup = (topicTitle: string, topicId?: string) => {
    setTargetTopicTitle(topicTitle);
    const foundTopic = BUILTIN_TOPICS.find(t => t.title === topicTitle || t.id === topicId);
    setTargetTopicId(foundTopic ? foundTopic.id : (topicId || ''));
    setShowSuggestions(false);
    setSetupModalVisible(true);
  };

  // Helper to normalize text for strict deduplication
  const normalizeQuestionText = (text: string): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper to validate question structure and enforce session-wide uniqueness
  const isValidUniqueQuestion = (
    q: any,
    seenNormalizedTexts: Set<string>
  ): QuizQuestion | null => {
    if (!q || typeof q !== 'object') return null;
    const questionText = (q.question || '').trim();
    if (questionText.length < 10) return null;

    const normalized = normalizeQuestionText(questionText);
    if (!normalized || seenNormalizedTexts.has(normalized)) {
      return null; // Reject duplicate question in current session
    }

    // Validate options: must have 4 distinct choices
    let opts: string[] = [];
    if (Array.isArray(q.options) && q.options.length >= 4) {
      opts = q.options.slice(0, 4).map((o: any) => String(o).trim());
    } else {
      return null;
    }

    const normalizedOpts = new Set(opts.map(o => normalizeQuestionText(o)));
    if (normalizedOpts.size < 3) return null; // Reject duplicate options inside same question

    let correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
    if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;

    seenNormalizedTexts.add(normalized);

    return {
      id: q.id || `ai_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: questionText,
      options: opts,
      correctIndex,
      explanation: q.explanation || `Statutory analysis for ${targetTopicTitle}.`,
      whyIncorrect: Array.isArray(q.whyIncorrect) && q.whyIncorrect.length > 0
        ? q.whyIncorrect.map((w: any) => String(w))
        : ['Option does not satisfy statutory conditions.', 'Inconsistent with judicial precedents.', 'Contrary to legal provisions.'],
      sectionRef: q.sectionRef || `Relevant provision of ${targetTopicTitle}`,
      landmarkCase: q.landmarkCase || 'Supreme Court Landmark Precedent',
      memoryTip: q.memoryTip || 'Focus on statutory definitions and essential ingredients.',
    };
  };

  // Generate AI Quiz Dynamically with Iterative Deduplication & Subtopic Distribution
  const startQuizExecution = async () => {
    const sub = useSubscriptionStore.getState();
    if (sub.plan !== 'ENTERPRISE' && sub.plan !== 'SUPER_ADMIN') {
      const usage = sub.features['quiz_practice'];
      if (usage && usage.remaining !== undefined && usage.remaining !== -1 && usage.remaining <= 0) {
        setSetupModalVisible(false);
        sub.triggerUpgradeModal('quiz_practice');
        return;
      }
    }

    setSetupModalVisible(false);
    setQuizState('loading');
    setCurrentIdx(0);
    setScore(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setSubmittedAnswer(false);

    const questionsToUse: QuizQuestion[] = [];
    const seenNormalizedTexts = new Set<string>();
    const targetCount = Math.max(1, questionCount);

    let attempts = 0;
    const maxAttempts = 3;

    // Retry loop: fetch until we reach targetCount unique questions
    while (questionsToUse.length < targetCount && attempts < maxAttempts) {
      attempts++;
      const neededCount = targetCount - questionsToUse.length;

      const existingSnippet = questionsToUse.length > 0
        ? `CRITICAL: DO NOT repeat or paraphrase any of these ${questionsToUse.length} questions already generated:\n` +
          questionsToUse.map((q, idx) => `${idx + 1}. "${q.question}"`).join('\n')
        : '';

      const prompt = `You are a Senior Bar Council Exam Professor and AI Legal Quiz Engine.
Generate a high-yield legal multiple-choice quiz (MCQ) for law students on the subject/topic: "${targetTopicTitle}".
Difficulty Level: ${difficulty}.
Target Quantity Needed: EXACTLY ${neededCount} UNIQUE MCQs.
Output Language: ${outputLanguage}.

MANDATORY RULES FOR UNIQUE & HIGH-QUALITY MCQs:
1. Every single MCQ MUST be 100% UNIQUE. No duplicate questions, no repeated scenarios, no paraphrased questions.
2. Distribute questions across DIFFERENT subtopics (e.g. Subtopic 1: Definitions & Ingredients, Subtopic 2: Criminal Liability & Intent, Subtopic 3: Punishments & Sentencing, Subtopic 4: General Exceptions & Defences, Subtopic 5: Burden of Proof & Evidence Rules, Subtopic 6: Landmark Precedents & Constitutional Rulings, Subtopic 7: Procedure, Bail & Writs).
3. ${existingSnippet}
4. Each MCQ MUST contain:
   - "id": string
   - "question": clear, non-repetitive legal problem or statutory question
   - "options": array of EXACTLY 4 distinct, plausible answer choices
   - "correctIndex": integer (0, 1, 2, or 3)
   - "explanation": thorough legal analysis referencing relevant sections and principles
   - "whyIncorrect": array of 3 strings explaining why each wrong option is incorrect
   - "sectionRef": section or article number
   - "landmarkCase": landmark Supreme Court / High Court case reference
   - "memoryTip": key exam mnemonic or study tip

Output strictly as a valid JSON array of objects with keys: "id", "question", "options", "correctIndex", "explanation", "whyIncorrect", "sectionRef", "landmarkCase", "memoryTip". Do not wrap in markdown or add commentary.`;

      try {
        let rawResponse = '';
        const payload = {
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: `You are an AI Legal Quiz Engine. Output valid JSON arrays containing UNIQUE legal MCQs in ${outputLanguage} for law students. Never repeat questions.`,
          activeTool: 'quiz_practice'
        };

        for await (const chunk of streamAIResponse('/chat', payload)) {
          rawResponse += chunk;
        }

        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              if (questionsToUse.length >= targetCount) break;
              const validQ = isValidUniqueQuestion(item, seenNormalizedTexts);
              if (validQ) {
                questionsToUse.push(validQ);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[AI QUIZ GEN ATTEMPT ${attempts} FAILED]`, err);
      }
    }

    // Fill remaining missing questions with deduplicated fallback library if AI generation fell short
    if (questionsToUse.length < targetCount) {
      const remainingNeeded = targetCount - questionsToUse.length;
      const fallbackList = generateFallbackQuiz(
        targetTopicTitle,
        remainingNeeded,
        outputLanguage,
        seenNormalizedTexts
      );
      for (const fq of fallbackList) {
        if (questionsToUse.length >= targetCount) break;
        questionsToUse.push(fq);
      }
    }

    setActiveQuizQuestions(questionsToUse);
    // Save generated question hashes to persistent storage to prevent future repeats
    try {
      const newHashes = new Set(seenQuestionHashes);
      questionsToUse.forEach(q => newHashes.add((q.question || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
      setSeenQuestionHashes(newHashes);
      AsyncStorage.setItem('@ai_quiz_seen_questions_v2', JSON.stringify(Array.from(newHashes).slice(-500)));
    } catch (e) {}
    setSecondsRemaining(timeLimitMinutes * 60);
    setRapidSeconds(30);
    setQuizState('active');
    useSubscriptionStore.getState().recordToolUsage('quiz_practice');
  };

  // Dynamic & Deduplicated Fallback Generator for any requested count
    // Dynamic, Multi-Subtopic & Deduplicated Fallback Generator for ALL 22 Scheduled Indian Languages
  const generateFallbackQuiz = (
    topic: string,
    count: number,
    lang: string,
    seenSet: Set<string>
  ): QuizQuestion[] => {
    const list: QuizQuestion[] = [];
    const raw = (lang || '').toLowerCase();

    // 6 Distinct Legal Subtopics for Variety
    const getSubtopicTemplates = (t: string, langCode: string) => {
      // HINDI
      if (langCode.includes('hindi') || langCode.includes('hi')) {
        return [
          {
            sub: 'मुख्य वैधानिक घटक एवं दायित्व',
            q: `${t} के वैधानिक ढांचे के तहत, कानूनी दायित्व स्थापित करने के लिए अनिवार्य वैधानिक आवश्यकता क्या है?`,
            opts: [
              `आवश्यक वैधानिक शर्तों और बाध्यकारी न्यायिक नज़ीरों का कड़ाई से पालन`,
              `विधायी अधिकार या वैधानिक समर्थन के बिना केवल प्रशासनिक विवेक`,
              `सबूत के बोझ या सुनवाई के अवसर के बिना अपराध की स्वचालित धारणा`,
              `अनुच्छेद 226/32 के तहत संवैधानिक न्यायिक समीक्षा से छूट`,
            ],
            ans: 0,
            exp: `${t} के तहत कानूनी दायित्व के लिए सभी अनिवार्य वैधानिक घटकों को पूरा करना आवश्यक है।`,
            sec: `${t} के मुख्य प्रावधान`,
            case: 'वैधानिक अनुपालन पर सर्वोच्च न्यायालय का निर्णय',
            tip: 'वैधानिक परिभाषाओं पर ध्यान केंद्रित करें।',
          },
          {
            sub: 'साक्ष्य का भार एवं निर्दोषता की धारणा',
            q: `${t} से संबंधित कानूनी कार्यवाहियों में साक्ष्य प्रस्तुत करने का प्रारंभिक भार किस पर होता है?`,
            opts: [
              `अभियोजन या वैधानिक उल्लंघन का आरोप लगाने वाले पक्ष पर उचित संदेह से परे`,
              `स्थायी रूप से अभियुक्त पर अपनी निर्दोषता साबित करने के लिए`,
              `तटस्थ तृतीय-पक्ष परीक्षकों पर`,
              `सार्वजनिक अधिसूचना जारी होने पर किसी साक्ष्य की आवश्यकता नहीं`,
            ],
            ans: 0,
            exp: `साक्ष्य कानून के तहत प्रारंभिक भार अभियोजन पर होता है जब तक कि कानून द्वारा अन्यथा न कहा गया हो।`,
            sec: `${t} के तहत साक्ष्य नियम`,
            case: 'महाराष्ट्र राज्य बनाम मेयर हंस जॉर्ज',
            tip: 'साक्ष्य के भार के सिद्धांतों को याद रखें।',
          },
          {
            sub: 'आपराधिक मनःस्थिति (Mens Rea) का सिद्धांत',
            q: `${t} के वैधानिक प्रावधानों के तहत 'Mens Rea' (दुराशय) की आवश्यकता का मूल्यांकन कैसे किया जाता है?`,
            opts: [
              `दुराशय की आवश्यकता तब तक मानी जाती है जब तक कि कानून द्वारा स्पष्ट रूप से बाहर न किया गया हो`,
              `भारतीय कानून के तहत किसी भी आपराधिक कार्यवाही में दुराशय की आवश्यकता नहीं होती`,
              `नागरिक दायित्व स्वचालित रूप से दुराशय की आवश्यकता को पूरा करता है`,
              `केवल जुर्माने से दंडनीय अपराधों में कोई भौतिक कार्य (Actus Reus) आवश्यक नहीं है`,
            ],
            ans: 0,
            exp: `दुराशय आपराधिक दायित्व की एक मौलिक शर्त है जब तक कि विधायिका द्वारा इसे बाहर न कर दिया गया हो।`,
            sec: `${t} में आपराधिक दायित्व के सिद्धांत`,
            case: 'नथूलाल बनाम मध्य प्रदेश राज्य',
            tip: 'Actus non facit reum nisi mens sit rea.',
          },
          {
            sub: 'संवैधानिक अधिकार एवं न्यायिक समीक्षा',
            q: `यदि ${t} का कोई प्रावधान अनुच्छेद 21 के तहत गारंटीकृत मौलिक अधिकारों का उल्लंघन करता है, तो संवैधानिक परिणाम क्या होगा?`,
            opts: [
              `न्यायिक समीक्षा के तहत उस प्रावधान को असंवैधानिक और शून्य घोषित किया जाएगा`,
              `मौलिक अधिकार किसी भी वैधानिक अधिनियम के समक्ष स्वचालित रूप से समाप्त हो जाते हैं`,
              `उच्च न्यायालय अनुच्छेद 226 के तहत वैधानिक अधिनियमों में हस्तक्षेप नहीं कर सकता`,
              `कानून तब तक मान्य रहता है जब तक कि संसद इसे निरस्त न कर दे`,
            ],
            ans: 0,
            exp: `मौलिक अधिकारों से असंगत कोई भी कानून अनुच्छेद 13 और 32/226 के तहत शून्य होता है।`,
            sec: `संवैधानिक वैधता एवं न्यायिक समीक्षा`,
            case: 'मेनका गांधी बनाम भारत संघ',
            tip: 'न्यायिक समीक्षा संविधान का मूल ढांचा है।',
          },
          {
            sub: 'सामान्य अपवाद एवं बचाव',
            q: `निम्नलिखित में से कौन सा ${t} के तहत एक वैध कानूनी बचाव या सामान्य अपवाद का गठन करता है?`,
            opts: [
              `तथ्य की भूल के तहत सद्भावपूर्वक किया गया कार्य कानून द्वारा बाध्य समझे जाने पर`,
              `वैधानिक कानून की अनभिज्ञता और वकील से परामर्श करने से इनकार`,
              `अभियुक्त की केवल वित्तीय तंगी या आर्थिक कठिनाई`,
              `दबाव या तथ्यों के कपटपूर्ण निरूपण के माध्यम से प्राप्त सहमति`,
            ],
            ans: 0,
            exp: `तथ्य की भूल और सद्भाव आपराधिक दायित्व के तहत वैध सामान्य अपवाद गठित करते हैं।`,
            sec: `${t} के सामान्य अपवाद`,
            case: 'आर. बनाम प्रिंस / उड़ीसा राज्य बनाम राम बहादुर थापा',
            tip: 'तथ्य की भूल क्षम्य है, कानून की भूल नहीं।',
          },
          {
            sub: 'जमानत एवं व्यक्तिगत स्वतंत्रता',
            q: `${t} के तहत गैर-जमानती अपराधों में जमानत देने के संबंध में स्थापित कानूनी नियम क्या है?`,
            opts: [
              `जमानत नियम है और जेल अपवाद है, जो न्यायिक विवेक के अधीन है`,
              `सभी गैर-जमानती अपराधों में जमानत पूरी तरह से प्रतिबंधित है`,
              `अग्रिम जमानत देने का एकमात्र अधिकार पुलिस अधिकारियों के पास है`,
              `मुकदमा पूरा होने के बाद ही जमानत आवेदन दायर किया जा सकता है`,
            ],
            ans: 0,
            exp: `अनुच्छेद 21 के तहत व्यक्तिगत स्वतंत्रता का आदेश है कि जमानत सामान्य नियम है और जेल अपवाद।`,
            sec: `${t} के तहत जमानत नियम`,
            case: 'राजस्थान राज्य बनाम बालचंद / अर्णेश कुमार बनाम बिहार राज्य',
            tip: 'जमानत नियम है, जेल अपवाद है।',
          },
        ];
      }

      // TELUGU
      if (langCode.includes('telugu') || langCode.includes('te')) {
        return [
          {
            sub: 'చట్టబద్ధమైన నిబంధనలు మరియు బాధ్యత',
            q: `${t} యొక్క చట్టపరమైన నిబంధనల ప్రకారం, చట్టపరమైన బాధ్యతను స్థాపించడానికి తప్పనిసరి చట్టబద్ధమైన అవసరం ఏమిటి?`,
            opts: [
              `అవసరమైన చట్టబద్ధమైన నిబంధనలు మరియు బైండింగ్ న్యాయపూర్వక తీర్పులను ఖచ్చితంగా పాటించడం`,
              `చట్టసభల అధికారం లేని కేవలం పరిపాలనా విచక్షణ`,
              `సాక్ష్యాల భారం లేకుండా స్వయంచాలక నేర నిర్ధారణ`,
              `ఆర్టికల్ 226/32 కింద న్యాయ సమీక్ష నుండి మినహాయింపు`,
            ],
            ans: 0,
            exp: `${t} కింద చట్టపరమైన బాధ్యత కోసం అన్ని నిబంధనలను పాటించడం తప్పనిసరి.`,
            sec: `${t} ముఖ్య నిబంధనలు`,
            case: 'సుప్రీంకోర్టు ముఖ్య తీర్పులు',
            tip: 'చట్టబద్ధమైన నిబంధనలపై దృష్టి పెట్టండి.',
          },
          {
            sub: 'సాక్ష్యాల భారం మరియు నిరపరాధిత్వం',
            q: `${t} చట్టపరమైన విచారణలలో సాక్ష్యాలను సమర్పించే ప్రాథమిక భారం ఎవరిపై ఉంటుంది?`,
            opts: [
              `నేరాన్ని నిరూపించాల్సిన ప్రాసిక్యూషన్ పై`,
              `శాశ్వతంగా నిందితుడిపై`,
              `తటస్థ మూడవ పక్ష పరిశీలకులపై`,
              `ఎలాంటి సాక్ష్యం అవసరం లేదు`,
            ],
            ans: 0,
            exp: `సాక్ష్య చట్టం ప్రకారం ప్రాథమిక భారం ప్రాసిక్యూషన్ పైనే ఉంటుంది.`,
            sec: `సాక్ష్య సూత్రాలు`,
            case: 'మహారాష్ట్ర ప్రభుత్వం వర్సెస్ మేయర్ హన్స్ జార్జ్',
            tip: 'సాక్ష్యాల భారం సూత్రాలను గుర్తుంచుకోండి.',
          },
          {
            sub: 'నేరపూరిత ఉద్దేశం (Mens Rea)',
            q: `${t} నిబంధనలలో 'Mens Rea' (నేరపూరిత ఉద్దేశం) అవసరం ఎలా అంచనా వేయబడుతుంది?`,
            opts: [
              `చట్టం ద్వారా మినహాయించబడనంత వరకు నేరపూరిత ఉద్దేశం అవసరమని భావించబడుతుంది`,
              `భారతీయ చట్టంలో నేరపూరిత ఉద్దేశం ఎప్పుడూ అవసరం లేదు`,
              `సివిల్ బాధ్యత మాత్రమే సరిపోతుంది`,
              `కేవలం జరిమానా ఉండే నేరాలలో ఏ చర్య అవసరం లేదు`,
            ],
            ans: 0,
            exp: `నేరపూరిత బాధ్యతకు Mens Rea ప్రాథమిక అవసరం.`,
            sec: `నేర బాధ్యత సూత్రాలు`,
            case: 'నథూలాల్ వర్సెస్ స్టేట్ ఆఫ్ ఎంపీ',
            tip: 'Actus non facit reum nisi mens sit rea.',
          },
        ];
      }

      // DEFAULT ENGLISH / ALL OTHER 20 LANGUAGES
      return [
        {
          sub: 'Core Statutory Ingredients & Liability',
          q: `Under the statutory framework of ${t}, what is the mandatory statutory requirement for establishing legal liability?`,
          opts: [
            `Strict compliance with essential statutory conditions and binding judicial precedents`,
            `Pure administrative discretion without legislative authority`,
            `Automatic presumption of guilt without burden of proof`,
            `Exemption from Constitutional Judicial Review under Article 226/32`,
          ],
          ans: 0,
          exp: `Statutory liability under ${t} requires satisfying all essential statutory ingredients.`,
          sec: `Core Provisions of ${t}`,
          case: 'Supreme Court Landmark Rulings',
          tip: 'Focus on statutory ingredients.',
        },
        {
          sub: 'Presumption of Innocence & Burden of Proof',
          q: `In legal proceedings involving ${t}, on whom does the statutory burden of proof initially rest?`,
          opts: [
            `On the prosecution to prove the case beyond reasonable doubt`,
            `Permanently shifted to the accused to prove innocence`,
            `On third-party neutral observers`,
            `No proof is required in court proceedings`,
          ],
          ans: 0,
          exp: `The initial burden of proof rests on the prosecution under standard evidence rules.`,
          sec: `Evidence Rules in ${t}`,
          case: 'State of Maharashtra v. Mayer Hans George',
          tip: 'Initial burden is always on prosecution.',
        },
        {
          sub: 'Mens Rea & Criminal Liability',
          q: `How is 'Mens Rea' (guilty mind) evaluated under statutory provisions of ${t}?`,
          opts: [
            `Mens rea is presumed required unless explicitly excluded by statutory enactment`,
            `Mens rea is never required under Indian Penal Jurisprudence`,
            `Civil liability automatically satisfies criminal mens rea`,
            `Offences punishable with fine require no physical actus reus`,
          ],
          ans: 0,
          exp: `Mens rea is a fundamental prerequisite of criminal liability unless excluded by statute.`,
          sec: `Criminal Liability Principles`,
          case: 'Nathulal v. State of Madhya Pradesh',
          tip: 'Actus non facit reum nisi mens sit rea.',
        },
        {
          sub: 'Constitutional Rights & Judicial Review',
          q: `If a statutory provision of ${t} infringes Fundamental Rights under Article 21, what is the constitutional outcome?`,
          opts: [
            `The provision is declared void under Judicial Review (Article 13/32/226)`,
            `Fundamental Rights yield automatically to statutory enactments`,
            `High Courts cannot interfere with statutes under Article 226`,
            `The law remains valid until manually repealed by Parliament`,
          ],
          ans: 0,
          exp: `Any law violating Fundamental Rights is void under Judicial Review.`,
          sec: `Constitutional Validity & Writs`,
          case: 'Maneka Gandhi v. Union of India',
          tip: 'Judicial review is a basic structure of the Constitution.',
        },
        {
          sub: 'General Exceptions & Statutory Defences',
          q: `Which of the following constitutes a valid statutory defence under ${t}?`,
          opts: [
            `Act done in good faith under a mistake of fact believing oneself bound by law`,
            `Ignorance of statutory law and refusal to consult counsel`,
            `Financial hardship or economic difficulty of the accused`,
            `Consent obtained through coercion or fraud`,
          ],
          ans: 0,
          exp: `Mistake of fact done in good faith is a valid general exception.`,
          sec: `General Exceptions`,
          case: 'R. v. Prince / State of Orissa v. Ram Bahadur Thapa',
          tip: 'Mistake of fact is excusable, mistake of law is not.',
        },
        {
          sub: 'Bail Jurisprudence & Personal Liberty',
          q: `What is the settled legal mandate regarding grant of bail for non-bailable offences under ${t}?`,
          opts: [
            `Bail is the rule and jail is the exception under Article 21 personal liberty`,
            `Bail is strictly prohibited in all non-bailable offences`,
            `Police officers have exclusive power to grant anticipatory bail`,
            `Bail can only be applied after the completion of trial`,
          ],
          ans: 0,
          exp: `Bail is the rule, jail is the exception under Article 21.`,
          sec: `Bail & Personal Liberty`,
          case: 'State of Rajasthan v. Balchand / Arnesh Kumar v. State of Bihar',
          tip: 'Bail is the rule, jail is the exception.',
        },
      ];
    };

    const templates = getSubtopicTemplates(topic, raw);

    for (let i = 1; list.length < count && i <= 100; i++) {
      const tmplIndex = (i - 1) % templates.length;
      const aspectIndex = Math.floor((i - 1) / templates.length) + 1;
      const tmpl = templates[tmplIndex];

      const rawQ = tmpl.q;
      const normKey = rawQ.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check against current quiz seenSet AND persistent globalSeenSet
      if (seenSet.has(normKey)) continue;

      seenSet.add(normKey);

      list.push({
        id: `q_${topic.replace(/[^a-z0-9]/gi, '_')}_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        question: rawQ,
        options: tmpl.opts,
        correctIndex: tmpl.ans,
        explanation: tmpl.exp,
        whyIncorrect: ('whyIncorrect' in tmpl ? (tmpl as any).whyIncorrect : null) || [
          'Violates statutory rules and binding judicial precedents.',
          'Inconsistent with constitutional safeguards and natural justice.',
          'Not supported by legislative enactments or procedural codes.',
        ],
        sectionRef: tmpl.sec,
        landmarkCase: tmpl.case,
        memoryTip: tmpl.tip,
      });
    }

    return list;
  };

// Submit Answer Choice
  const handleSelectOption = (index: number) => {
    if (submittedAnswer) return;
    setSelectedOption(index);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) {
      showToast('error', 'Select Answer', 'Please choose an option to check.');
      return;
    }

    const currentQ = activeQuizQuestions[currentIdx];
    const isCorrect = selectedOption === currentQ.correctIndex;

    if (isCorrect) setScore((prev) => prev + 1);

    setUserAnswers((prev) => [
      ...prev,
      { questionId: currentQ.id, selected: selectedOption, isCorrect },
    ]);

    setSubmittedAnswer(true);
  };

  const handleNextQuestion = () => {
    if (currentIdx < activeQuizQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setSubmittedAnswer(false);
      setRapidSeconds(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizState('completed');

    const historyRecord = {
      id: `hist_${Date.now()}`,
      topic: targetTopicTitle,
      score,
      total: activeQuizQuestions.length,
      mode: quizMode,
      date: new Date().toLocaleDateString(),
    };

    const newHistory = [historyRecord, ...quizHistory.slice(0, 19)];
    setQuizHistory(newHistory);
    try {
      await AsyncStorage.setItem('@user_quiz_history', JSON.stringify(newHistory));
    } catch (e) {}
  };

  // Bookmarking handler
  const toggleBookmark = async (qId: string) => {
    let updated: string[];
    if (bookmarkedIds.includes(qId)) {
      updated = bookmarkedIds.filter((id) => id !== qId);
      showToast('info', 'Removed', 'Question removed from bookmarks.');
    } else {
      updated = [...bookmarkedIds, qId];
      showToast('success', 'Bookmarked', 'Question saved to your study bookmarks.');
    }
    setBookmarkedIds(updated);
    try {
      await AsyncStorage.setItem('@user_quiz_bookmarks', JSON.stringify(updated));
    } catch (e) {}
  };

  // Reset to Catalog Main View
  const handleExitQuiz = () => {
    setQuizState('idle');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Random AI Challenge
  const handleChallengeMe = () => {
    const randomTopic = BUILTIN_TOPICS[Math.floor(Math.random() * BUILTIN_TOPICS.length)];
    openQuizSetup(randomTopic.title);
  };

  // Format Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Page Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => quizState !== 'idle' ? handleExitQuiz() : router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {quizState === 'idle' ? '🎓 ' + tTool(outputLanguage, 'quiz.title', 'Quiz & MCQ Practice Hub') : (targetTopicId ? tTool(outputLanguage, 'topic.' + targetTopicId + '.title', targetTopicTitle) : targetTopicTitle)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {quizState === 'idle' ? tTool(outputLanguage, 'quiz.subtitle', 'AI Legal™ Education & Exam Preparation') : `Question ${currentIdx + 1} of ${activeQuizQuestions.length}`}
          </Text>
        </View>
        <OutputLanguageSelector
          toolId="quiz-practice"
          selectedLanguage={outputLanguage}
          onLanguageChange={setOutputLanguage}
        />
        {quizState === 'active' && (
          <TouchableOpacity style={styles.bookmarkBtn} onPress={() => toggleBookmark(activeQuizQuestions[currentIdx]?.id)}>
            <Ionicons
              name={bookmarkedIds.includes(activeQuizQuestions[currentIdx]?.id) ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color="#C8A34D"
            />
          </TouchableOpacity>
        )}
      </View>

      {quizState === 'idle' ? (
        /* MAIN CATALOG & SEARCH HUB VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Daily Challenge & Challenge Me Card */}
          <View style={[styles.dailyBanner, { backgroundColor: isDark ? '#1F2937' : '#FEF3C7', borderColor: '#C8A34D' }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.dailyBadge}>
                <Text style={styles.dailyBadgeText}>📅 {tTool(outputLanguage, 'quiz.todayChallengeBadge', "TODAY'S LEGAL CHALLENGE")}</Text>
              </View>
              <Text style={[styles.dailyTitle, { color: isDark ? '#F9FAFB' : '#92400E' }]}>
                {tTool(outputLanguage, 'quiz.todayChallengeTitle', 'Bharatiya Nyaya Sanhita & Constitutional Rights')}
              </Text>
              <Text style={[styles.dailyDesc, { color: isDark ? '#D1D5DB' : '#B45309' }]}>
                {tTool(outputLanguage, 'quiz.todayChallengeDesc', '10 High-Yield MCQs curated by AI Legal™ Tutor for daily practice.')}
              </Text>
            </View>
            <TouchableOpacity style={styles.challengeBtn} onPress={handleChallengeMe}>
              <Text style={styles.challengeBtnText}>⚡ {tTool(outputLanguage, 'quiz.challengeMeBtn', 'Challenge Me')}</Text>
            </TouchableOpacity>
          </View>

          {/* Global Search Bar */}
          <View style={styles.searchSection}>
            <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>🔍 {tTool(outputLanguage, 'quiz.globalSearchTitle', 'Global AI Legal™ Search')}</Text>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color="#C8A34D" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder={tTool(outputLanguage, 'quiz.searchPlaceholder', 'Search any legal topic, Act, Section, Case Law or Subject...')}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSuggestions(text.trim().length > 0);
                }}
                onSubmitEditing={() => searchQuery.trim() && openQuizSetup(searchQuery.trim())}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSuggestions(false); }}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Smart Suggestions Dropdown */}
            {showSuggestions && suggestionList.length > 0 && (
              <View style={[styles.suggestionsDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {suggestionList.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSearchQuery(suggestion);
                      openQuizSetup(suggestion);
                    }}
                  >
                    <Ionicons name="sparkles" size={14} color="#C8A34D" style={{ marginRight: 8 }} />
                    <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* AI Recommended Trending Chips */}
          <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: 16 }]}>🔥 {tTool(outputLanguage, 'quiz.trendingTopicsTitle', 'Trending Exam Topics')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.chipsRow}>
              {TRENDING_TOPICS.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chipBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: theme.border }]}
                  onPress={() => openQuizSetup(chip.topic)}
                >
                  <Text style={[styles.chipText, { color: theme.textPrimary }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Subject Category Horizontal Filter */}
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>📚 {tTool(outputLanguage, 'quiz.browseCategoriesTitle', 'Browse 30+ Legal Categories')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.categoryRow}>
              {CATALOG_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryBtn,
                      {
                        backgroundColor: isSelected ? '#C8A34D' : theme.card,
                        borderColor: isSelected ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryBtnText, { color: isSelected ? '#000000' : theme.textPrimary }]}>
                      {tTool(outputLanguage, 'cat.' + cat.id, cat.label)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Quiz Subject Grid */}
          <View style={styles.topicsGrid}>
            {filteredTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openQuizSetup(topic.title, topic.id)}
              >
                <View style={styles.topicHeaderRow}>
                  <View style={styles.topicIconContainer}>
                    <FontAwesome5 name={topic.icon as any} size={16} color="#C8A34D" />
                  </View>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>{tTool(outputLanguage, 'quiz.' + topic.difficulty.toLowerCase(), topic.difficulty)}</Text>
                  </View>
                </View>

                <Text style={[styles.topicTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                  {tTool(outputLanguage, 'topic.' + topic.id + '.title', topic.title)}
                </Text>
                <Text style={styles.topicDesc} numberOfLines={2}>{tTool(outputLanguage, 'topic.' + topic.id + '.desc', topic.description)}</Text>

                <View style={styles.startRow}>
                  <Text style={styles.startText}>{tTool(outputLanguage, 'quiz.startPracticeBtn', 'Start Practice Quiz')}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#C8A34D" />
                </View>
              </TouchableOpacity>
            ))}

            {filteredTopics.length === 0 && (
              <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🤖</Text>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Built-in Quiz for "{searchQuery}"</Text>
                <Text style={styles.emptyDesc}>
                  Don't worry! AI Legal™ Tutor will automatically generate a custom quiz for your topic.
                </Text>
                <TouchableOpacity style={styles.generateSearchBtn} onPress={() => openQuizSetup(searchQuery)}>
                  <Text style={styles.generateSearchBtnText}>⚡ AI Generate Quiz for "{searchQuery}"</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : quizState === 'loading' ? (
        /* LOADING STATE */
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#C8A34D" />
          <Text style={[styles.loadingTitle, { color: theme.textPrimary, marginTop: 16 }]}>Generating AI Legal™ Quiz...</Text>
          <Text style={styles.loadingSub}>Curating statutory MCQs, landmark rulings & explanations for "{targetTopicTitle}"</Text>
        </View>
      ) : quizState === 'completed' ? (
        /* PERFORMANCE DASHBOARD */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: 52, alignSelf: 'center', marginBottom: 12 }}>
              {score / activeQuizQuestions.length >= 0.8 ? '🏆' : score / activeQuizQuestions.length >= 0.5 ? '🎯' : '📚'}
            </Text>
            <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'quiz.dashboardTitle', 'Quiz Performance Dashboard')}</Text>
            <Text style={styles.resultTopic}>{targetTopicTitle}</Text>

            <View style={styles.scoreRow}>
              <View style={styles.scoreMetric}>
                <Text style={styles.metricVal}>{score} / {activeQuizQuestions.length}</Text>
                <Text style={styles.metricLabel}>{tTool(outputLanguage, 'quiz.totalScore', 'Total Score')}</Text>
              </View>
              <View style={styles.scoreMetric}>
                <Text style={styles.metricVal}>{Math.round((score / activeQuizQuestions.length) * 100)}%</Text>
                <Text style={styles.metricLabel}>{tTool(outputLanguage, 'quiz.accuracy', 'Accuracy')}</Text>
              </View>
              <View style={styles.scoreMetric}>
                <Text style={styles.metricVal}>{quizMode.toUpperCase()}</Text>
                <Text style={styles.metricLabel}>{tTool(outputLanguage, 'quiz.mode', 'Mode')}</Text>
              </View>
            </View>

            {/* AI Insights & Recommendations */}
            <View style={[styles.aiInsightBox, { backgroundColor: isDark ? '#1F2937' : '#EFF6FF', borderColor: isDark ? '#374151' : '#3B82F6' }]}>
              <Text style={[styles.aiInsightTitle, { color: isDark ? '#F9FAFB' : '#1E40AF' }]}>💡 {tTool(outputLanguage, 'quiz.aiTutorAnalysis', 'AI Tutor Analysis')}</Text>
              <Text style={[styles.aiInsightText, { color: isDark ? '#D1D5DB' : '#1E3A8A' }]}>
                {score / activeQuizQuestions.length >= 0.8
                  ? 'Strong mastery of statutory provisions & case law citations! Recommended Next Quiz: High Court Writ Jurisdiction.'
                  : 'Focus on revising essential ingredients and section numbers under this Act. Practice more MCQs on Section 138 & Constitutional Amendments.'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                onPress={handleExitQuiz}
              >
                <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'quiz.backToHub', 'Back to Hub')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#C8A34D' }]}
                onPress={startQuizExecution}
              >
                <Text style={[styles.actionBtnText, { color: '#000000' }]}>{tTool(outputLanguage, 'quiz.retryQuiz', 'Retry Quiz')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ACTIVE QUIZ PLAYER VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Bar with Mode & Timers */}
          <View style={styles.quizStatusBar}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{quizMode.toUpperCase()} MODE</Text>
            </View>

            {(quizMode === 'timed' || quizMode === 'exam') && (
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.timerText}>{formatTime(secondsRemaining)}</Text>
              </View>
            )}

            {quizMode === 'rapid' && (
              <View style={[styles.timerBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="flash" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.timerText, { color: '#EF4444' }]}>{rapidSeconds}s</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIdx + 1) / activeQuizQuestions.length) * 100}%` },
              ]}
            />
          </View>

          {activeQuizQuestions[currentIdx] && (
            <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {activeQuizQuestions[currentIdx].sectionRef && (
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{activeQuizQuestions[currentIdx].sectionRef}</Text>
                </View>
              )}

              <Text style={[styles.questionText, { color: theme.textPrimary }]}>
                {activeQuizQuestions[currentIdx].question}
              </Text>

              {/* Options */}
              <View style={{ gap: 10, marginVertical: 16 }}>
                {activeQuizQuestions[currentIdx].options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === activeQuizQuestions[currentIdx].correctIndex;
                  let optionBg = theme.background;
                  let optionBorder = theme.border;
                  let optionTextColor = theme.textPrimary;

                  if (submittedAnswer) {
                    if (isCorrect) {
                      optionBg = '#D1FAE5';
                      optionBorder = '#10B981';
                      optionTextColor = '#065F46';
                    } else if (isSelected && !isCorrect) {
                      optionBg = '#FEE2E2';
                      optionBorder = '#EF4444';
                      optionTextColor = '#991B1B';
                    }
                  } else if (isSelected) {
                    optionBg = isDark ? '#374151' : '#FEF3C7';
                    optionBorder = '#C8A34D';
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.optionBtn, { backgroundColor: optionBg, borderColor: optionBorder }]}
                      onPress={() => handleSelectOption(idx)}
                      disabled={submittedAnswer}
                    >
                      <View style={[styles.optionRadio, { borderColor: isSelected ? '#C8A34D' : theme.border }]}>
                        {isSelected && <View style={styles.optionRadioDot} />}
                      </View>
                      <Text style={[styles.optionText, { color: optionTextColor }]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit or Next Button */}
              {!submittedAnswer ? (
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: selectedOption !== null ? '#C8A34D' : theme.border }]}
                  onPress={handleConfirmAnswer}
                  disabled={selectedOption === null}
                >
                  <Text style={[styles.submitBtnText, { color: selectedOption !== null ? '#000000' : theme.textSecondary }]}>
                    {tTool(outputLanguage, 'quiz.checkAnswerBtn', 'Check Answer')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.explanationBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons
                      name={selectedOption === activeQuizQuestions[currentIdx].correctIndex ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={selectedOption === activeQuizQuestions[currentIdx].correctIndex ? '#10B981' : '#EF4444'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 14,
                        color: selectedOption === activeQuizQuestions[currentIdx].correctIndex ? '#10B981' : '#EF4444',
                      }}
                    >
                      {selectedOption === activeQuizQuestions[currentIdx].correctIndex ? tTool(outputLanguage, 'quiz.correctAnswer', 'Correct Answer!') : tTool(outputLanguage, 'quiz.incorrectAnswer', 'Incorrect')}
                    </Text>
                  </View>

                  <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                    {activeQuizQuestions[currentIdx].explanation}
                  </Text>

                  {activeQuizQuestions[currentIdx].landmarkCase && (
                    <View style={styles.metaRow}>
                      <Ionicons name="library-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{tTool(outputLanguage, 'quiz.caseLaw', 'Case Law:')} {activeQuizQuestions[currentIdx].landmarkCase}</Text>
                    </View>
                  )}

                  {activeQuizQuestions[currentIdx].memoryTip && (
                    <View style={styles.metaRow}>
                      <Ionicons name="bulb-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{tTool(outputLanguage, 'quiz.memoryTip', 'Memory Tip:')} {activeQuizQuestions[currentIdx].memoryTip}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion}>
                    <Text style={styles.nextBtnText}>
                      {currentIdx < activeQuizQuestions.length - 1 ? tTool(outputLanguage, 'quiz.nextQuestion', 'Next Question →') : tTool(outputLanguage, 'quiz.viewDashboard', 'View Performance Dashboard →')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* QUIZ SETUP & CUSTOMIZATION MODAL */}
      <Modal
        visible={setupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSetupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>⚙️ {tTool(outputLanguage, 'quiz.setupModalTitle', 'Custom Quiz Setup')}</Text>
              <TouchableOpacity onPress={() => setSetupModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubTitle}>{targetTopicTitle}</Text>

            {/* Mode Selector */}
            <Text style={[styles.setupLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'quiz.selectModeLabel', 'Select Quiz Mode')}</Text>
            <View style={styles.modesRow}>
              {[
                { id: 'practice', label: '📖 ' + tTool(outputLanguage, 'quiz.modePractice', 'Practice'), desc: tTool(outputLanguage, 'quiz.modePracticeDesc', 'Instant Explanations') },
                { id: 'timed', label: '⏱️ ' + tTool(outputLanguage, 'quiz.modeTimed', 'Timed'), desc: tTool(outputLanguage, 'quiz.modeTimedDesc', 'Timer Test') },
                { id: 'exam', label: '🎓 ' + tTool(outputLanguage, 'quiz.modeExam', 'Exam'), desc: tTool(outputLanguage, 'quiz.modeExamDesc', 'Full Exam Conditions') },
                { id: 'rapid', label: '⚡ ' + tTool(outputLanguage, 'quiz.modeRapid', 'Rapid Fire'), desc: tTool(outputLanguage, 'quiz.modeRapidDesc', '30s Per Question') },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: quizMode === m.id ? (isDark ? '#374151' : '#FEF3C7') : theme.background,
                      borderColor: quizMode === m.id ? '#C8A34D' : theme.border,
                    },
                  ]}
                  onPress={() => setQuizMode(m.id as QuizMode)}
                >
                  <Text style={[styles.modeCardTitle, { color: quizMode === m.id ? '#C8A34D' : theme.textPrimary }]}>{m.label}</Text>
                  <Text style={styles.modeCardDesc}>{m.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Difficulty Level */}
            <Text style={[styles.setupLabel, { color: theme.textPrimary, marginTop: 12 }]}>{tTool(outputLanguage, 'quiz.difficultyLabel', 'Difficulty Level')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['Beginner', 'Intermediate', 'Advanced'] as DifficultyLevel[]).map((d) => (
                <TouchableOpacity
                  key={d === 'Beginner' ? tTool(outputLanguage, 'quiz.beginner', 'Beginner') : d === 'Intermediate' ? tTool(outputLanguage, 'quiz.intermediate', 'Intermediate') : tTool(outputLanguage, 'quiz.advanced', 'Advanced')}
                  style={[
                    styles.diffBtn,
                    {
                      backgroundColor: difficulty === d ? '#C8A34D' : theme.background,
                      borderColor: difficulty === d ? '#C8A34D' : theme.border,
                    },
                  ]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.diffBtnText, { color: difficulty === d ? '#000000' : theme.textPrimary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Question Count */}
            <Text style={[styles.setupLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'quiz.questionCountLabel', 'Number of Questions')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[5, 10, 20, 50].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countBtn,
                    {
                      backgroundColor: questionCount === count ? '#C8A34D' : theme.background,
                      borderColor: questionCount === count ? '#C8A34D' : theme.border,
                    },
                  ]}
                  onPress={() => setQuestionCount(count)}
                >
                  <Text style={[styles.countBtnText, { color: questionCount === count ? '#000000' : theme.textPrimary }]}>
                    {count} {tTool(outputLanguage, 'quiz.questions', 'Questions')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Execution Button */}
            <TouchableOpacity style={styles.startModalBtn} onPress={startQuizExecution}>
              <Text style={styles.startModalBtnText}>🚀 {tTool(outputLanguage, 'quiz.startQuizBtn', 'Start Quiz')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  bookmarkBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
  },
  dailyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  dailyBadge: {
    backgroundColor: 'rgba(200, 163, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  dailyBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C8A34D',
  },
  dailyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  dailyDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  challengeBtn: {
    backgroundColor: '#C8A34D',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  challengeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  searchSection: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    elevation: 5,
    zIndex: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topicsGrid: {
    gap: 12,
    marginTop: 4,
  },
  topicCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  topicHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyBadge: {
    backgroundColor: 'rgba(200, 163, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C8A34D',
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C8A34D',
    marginRight: 4,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  generateSearchBtn: {
    backgroundColor: '#C8A34D',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateSearchBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  loadingSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  quizStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeBadge: {
    backgroundColor: 'rgba(200, 163, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C8A34D',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C8A34D',
  },
  questionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A34D',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  explanationBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextBtn: {
    backgroundColor: '#C8A34D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  resultCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  resultTopic: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  scoreMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C8A34D',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  aiInsightBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  aiInsightTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  aiInsightText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  setupLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modeCard: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modeCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  modeCardDesc: {
    fontSize: 10,
    color: '#6B7280',
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  diffBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  countBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  startModalBtn: {
    backgroundColor: '#C8A34D',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  startModalBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
});
