const generateFallbackNotes = (topic: string, level: string, chip: string, lang: string): string => {
  const isHindi = (lang || '').toLowerCase().includes('hindi') || (lang || '').toLowerCase().includes('hinglish') || (lang || '').toLowerCase().includes('bilingual');
  const isMarathi = (lang || '').toLowerCase().includes('marathi');
  const isGujarati = (lang || '').toLowerCase().includes('gujarati');
  const isBengali = (lang || '').toLowerCase().includes('bengali');
  const isMalayalam = (lang || '').toLowerCase().includes('malayalam');
  const isTamil = (lang || '').toLowerCase().includes('tamil');
  const isTelugu = (lang || '').toLowerCase().includes('telugu');
  const isUrdu = (lang || '').toLowerCase().includes('urdu');

  if (isUrdu) {
    return `# ${topic}
## 1. تعارف اور بنیادی مفہوم
${topic} قانون کا ایک اہم حصہ ہے۔ یہ آئینی حقوق، قانونی دفعات اور عدالتی نظائر کو منظم کرتا ہے۔

## 2. اہم دفعات اور قانونی احکامات
- **متعلقہ دفعات:** ${topic} کے تحت قانونی حقوق اور ذمہ داریاں۔
- **لازمی عناصر:** قانونی شرائط کی سخت پابندی ضروری ہے۔

## 3. سپریم کورٹ کے اہم فیصلے
- **عدالتی نظائر:** سپریم کورٹ کے فیصلے اس شعبے میں رہنمائی فراہم کرتے ہیں۔

## 4. امتحان کے لیے اہم تجاویز
- امتحان میں قانونی دفعات اور بنیادی اصولوں کا واضح حوالہ دیں۔`;
  }

  if (isHindi) {
    return `# ${topic}
## 1. परिचय एवं मुख्य अवधारणाएं
${topic} कानून का एक अनिवार्य हिस्सा है। यह संवैधानिक अधिकारों, वैधानिक प्रावधानों और स्थापित न्यायिक मिसालों को नियंत्रित करता है।

## 2. मुख्य धाराएं और वैधानिक प्रावधान
- **प्रासंगिक प्रावधान:** ${topic} के तहत कानूनी दायित्व और अधिकार परिभाषित हैं।
- **आवश्यक तत्व:** वैधानिक शर्तों का कड़ाई से पालन आवश्यक है।

## 3. प्रमुख सर्वोच्च न्यायालय के निर्णय
- **केस लॉ:** सर्वोच्च न्यायालय के ऐतिहासिक निर्णय इस क्षेत्र में मार्गदर्शक सिद्धांत स्थापित करते हैं।

## 4. परीक्षा की दृष्टि से महत्वपूर्ण टिप्स
- परीक्षा में वैधानिक धाराओं और मुख्य सिद्धांतों को स्पष्ट रूप से उद्धृत करें।`;
  }

  if (isMarathi) {
    return `# ${topic}
## 1. परिचय आणि मुख्य संकल्पना
${topic} हा कायद्याचा महत्त्वाचा भाग आहे. याअंतर्गत वैधानिक तरतुदी आणि न्यायालयीन निकाल यांचा समावेश होतो.

## 2. महत्त्वाच्या कलमे आणि तरतुदी
- **मुख्य तरतुदी:** ${topic} मधील कायदेशीर अधिकार आणि जबाबदाऱ्या.
- **आवश्यक घटक:** कायदेशीर अटींचे तंतोतंत पालन करणे आवश्यक आहे.

## 3. सर्वोच्च न्यायालयाचे महत्त्वाचे निकाल
- **न्यायालयीन निकाल:** सर्वोच्च न्यायालयाचे निकाल या विषयातील मार्गदर्शक तत्त्वे ठरवतात.`;
  }

  if (isBengali) {
    return `# ${topic}
## ১. ভূমিকা ও মূল ধারণা
${topic} আইনের একটি অত্যন্ত গুরুত্বপূর্ণ অংশ। এটি সাংবিধানিক অধিকার ও বিচার বিভাগীয় রায় নিয়ন্ত্রণ করে।

## ২. প্রধান ধারা ও আইনি বিধানাবলী
- **মূল বিধান:** ${topic} এর অধীনে আইনি অধিকার ও দায়বদ্ধতা।
- **আবশ্যিক শর্তাবলী:** আইনি নিয়মাবলীর কঠোর অনুসরণ প্রয়োজন।

## ৩. সুপ্রিম কোর্টের গুরুত্বপূর্ণ রায়
- **আইনি নজির:** সুপ্রিম কোর্টের গুরুত্বপূর্ণ রায়সমূহ এই ক্ষেত্রে পথপ্রদর্শক হিসেবে কাজ করে।`;
  }

  if (isMalayalam) {
    return `# ${topic}
## 1. ആമുഖവും പ്രധാന ആശയങ്ങളും
${topic} നിയമത്തിലെ പ്രധാനപ്പെട്ട ഒരു ഭാഗമാണ്. ഭരണഘടനാ അവകാശങ്ങളും കോടതിവിധികളും ഇതിൽ ഉൾപ്പെടുന്നു.

## 2. പ്രധാന വകുപ്പുകൾ
- **നിയമപരമായ വ്യവസ്ഥകൾ:** ${topic} സംബന്ധിച്ച അവകാശങ്ങളും ഉത്തരവാദിത്തങ്ങളും.
- **പ്രധാന ഘടകങ്ങൾ:** നിയമപരമായ നിബന്ധനകൾ കർശനമായി പാലിക്കേണ്ടതുണ്ട്.

## 3. സുപ്രീം കോടതിയുടെ സുപ്രധാന വിധികൾ
- **കോടതിവിധികൾ:** സുപ്രീം കോടതിയുടെ സുപ്രധാന വിധികൾ ഈ മേഖലയിൽ മാർഗ്ഗനിർദ്ദേശം നൽകുന്നു.`;
  }

  return `# ${topic}
## 1. Executive Summary & Overview
${topic} is a cornerstone of legal jurisprudence under ${level}. It forms an essential component of constitutional safeguards, statutory enactments, and judicial binding precedents.

## 2. Statutory Provisions & Core Ingredients
- **Relevant Sections:** Core statutory framework governing ${topic}.
- **Essential Elements:** Mandatory statutory ingredients required to establish liability or enforce legal remedies.

## 3. Landmark Judicial Precedents
- **Supreme Court Rulings:** Leading authority establishing the ratio decidendi for ${topic}.

## 4. Exam & Practical Application Tips
- **High-Yield Notes:** Always cite relevant statutory sections and landmark ratios during legal examinations.`;
};
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Clipboard,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { useTranslation } from '@/localization';
import { apiClient, streamAIResponse } from '@/api/client';
import { StudentNoteService, StudentNoteItem } from '@/services/student-note.service';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { useSubscriptionStore } from '@/store/subscription';

const { width } = Dimensions.get('window');

type AcademicLevel = 'BA LLB' | 'LLB' | 'LLM' | 'Judiciary Prep' | 'CLAT' | 'AIBE';
type ViewMode = 'notes' | 'flashcards' | 'mindmap' | 'summary' | 'mcq';
type ScreenState = 'home' | 'workspace';
type InputMode = 'ai_topic' | 'user_input';

interface NoteChip {
  id: string;
  label: string;
  desc: string;
}

const NOTE_CHIPS: NoteChip[] = [
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
  'International Human Rights Law',
  'Family Law & Succession',
  'Company Law & Insolvency (IBC)',
  'Intellectual Property Rights (IPR)',
];

const ACADEMIC_LEVELS: AcademicLevel[] = [
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

interface FlashcardItem {
  term: string;
  definition: string;
}

interface MCQItem {
  id: number;
  q: string;
  opts: string[];
  ans: number;
  exp: string;
}

interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  expanded?: boolean;
}

interface FollowUpMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface SavedNoteItem {
  id: string;
  topic: string;
  level: AcademicLevel;
  date: string;
  content: string;
  originalInput?: string;
  inputSource?: string;
}

// Clean Markdown Renderer Component
const renderCleanMarkdown = (rawText: string, theme: any, isDark: boolean) => {
  if (!rawText) return null;

  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<View key={`sp_${idx}`} style={{ height: 6 }} />);
      return;
    }

    if (trimmed.startsWith('# ')) {
      const cleanHeading = trimmed.replace(/^#\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <Text key={`h1_${idx}`} style={[styles.cleanH1, { color: theme.textPrimary }]}>
          {cleanHeading}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      const cleanHeading = trimmed.replace(/^##\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <View key={`h2_box_${idx}`} style={[styles.cleanH2Container, { borderBottomColor: theme.border }]}>
          <Text style={[styles.cleanH2, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {cleanHeading}
          </Text>
        </View>
      );
    } else if (trimmed.startsWith('### ')) {
      const cleanHeading = trimmed.replace(/^###\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <Text key={`h3_${idx}`} style={[styles.cleanH3, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
          {cleanHeading}
        </Text>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*+/g, '').trim();
      elements.push(
        <View key={`bullet_${idx}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: '#C8A34D' }]}>•</Text>
          <Text style={[styles.bulletText, { color: theme.textPrimary }]}>
            {cleanBullet}
          </Text>
        </View>
      );
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      elements.push(
        <View key={`div_${idx}`} style={[styles.cleanDivider, { backgroundColor: theme.border }]} />
      );
    } else {
      const cleanText = trimmed.replace(/\*\*\*/g, '').replace(/\*\*/g, '');
      elements.push(
        <Text key={`p_${idx}`} style={[styles.cleanBodyText, { color: theme.textPrimary }]}>
          {cleanText}
        </Text>
      );
    }
  });

  return <View style={{ gap: 4 }}>{elements}</View>;
};

export default function NotesMakerScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { t } = useTranslation();

  // Screen View State
  const [screenState, setScreenState] = useState<ScreenState>('home');

  // Dual Input Modes: 'ai_topic' | 'user_input'
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_notes-maker');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);
  const [inputMode, setInputMode] = useState<InputMode>('ai_topic');

  // Search & Inputs
  const [promptInput, setPromptInput] = useState('');
  const [userTopicInput, setUserTopicInput] = useState('');
  const [userInputContent, setUserInputContent] = useState('');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('BA LLB');
  const [selectedChip, setSelectedChip] = useState<string>('short');


  // AI Generation & Processing States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSavingAsWritten, setIsSavingAsWritten] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Note Type: 'manual' | 'ai_transformed' | 'ai_generated'
  const [activeNoteSource, setActiveNoteSource] = useState<'manual' | 'ai_transformed' | 'ai_generated'>('ai_generated');

  // Master Content & Conversation Session
  const [masterNotesContent, setMasterNotesContent] = useState('');
  const [activeTopicTitle, setActiveTopicTitle] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const notesSessionId = useRef<string>(`notes_session_${Date.now()}`);
  const workspaceScrollRef = useRef<ScrollView>(null);

  // Scroll Position Tracking & Floating Pill Indicator
  const isNearBottomRef = useRef<boolean>(true);
  const [showNewResponsePill, setShowNewResponsePill] = useState(false);

  // Follow-up Thread & Loading State
  const [followUpThread, setFollowUpThread] = useState<FollowUpMessage[]>([]);
  const [isFollowUpGenerating, setIsFollowUpGenerating] = useState(false);

  // View Modes & Tab State
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [tabLoading, setTabLoading] = useState(false);
  const [tabLoadingMsg, setTabLoadingMsg] = useState('');

  // Derived Learning Items
  const [parsedFlashcards, setParsedFlashcards] = useState<FlashcardItem[]>([]);
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  const [mindMapNodes, setMindMapNodes] = useState<MindMapNode[]>([]);
  const [parsedSummary, setParsedSummary] = useState('');

  const [parsedMCQs, setParsedMCQs] = useState<MCQItem[]>([]);
  const [userMCQAnswers, setUserMCQAnswers] = useState<{ [key: number]: number }>({});

  // Follow-up Suggestions
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // Saved Notes & Recent Searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedNotes, setSavedNotes] = useState<SavedNoteItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Edit Note Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingNotesText, setEditingNotesText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Follow-up Custom Prompt Input
  const [followUpInput, setFollowUpInput] = useState('');

  // Track user scrolling position
  const handleWorkspaceScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewResponsePill(false);
    }
  };

  const manualScrollToBottom = () => {
    workspaceScrollRef.current?.scrollToEnd({ animated: true });
    setShowNewResponsePill(false);
  };

  // Voice Dictation Recording Hook (Native + Web + Audio Transcribe Fallback)
  const {
    isRecording: isListening,
    isTranscribing,
    startRecording,
    stopRecording,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText) {
      setUserInputContent((prev) => (prev ? `${prev}\n${transcribedText}` : transcribedText));
    }
  });

  const toggleVoiceListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording('auto');
    }
  };

  // Load Saved Notes & Recent Searches
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const recStr = await AsyncStorage.getItem('@user_notes_recent');
      if (recStr) setRecentSearches(JSON.parse(recStr));

      // Attempt to load from Backend API for strict user isolation
      try {
        const res = await StudentNoteService.listNotes();
        if (res.success && Array.isArray(res.data)) {
          const formatted: SavedNoteItem[] = res.data.map((n) => ({
            id: n._id || n.id || `note_${Date.now()}`,
            topic: n.title,
            level: (n.academicLevel as AcademicLevel) || 'BA LLB',
            date: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            content: n.generatedNotes,
            originalInput: n.originalInput,
            inputSource: n.inputSource || 'ai_generated',
          }));
          setSavedNotes(formatted);
          await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(formatted));
          return;
        }
      } catch (backendErr) {
        console.warn('[STUDENT NOTES BACKEND SYNC FALLBACK]', backendErr);
      }

      const savedStr = await AsyncStorage.getItem('@user_saved_notes');
      if (savedStr) setSavedNotes(JSON.parse(savedStr));
    } catch (err) {
      console.warn('Failed to load local storage:', err);
    }
  };

  const saveRecentSearch = async (query: string) => {
    const updated = [query, ...recentSearches.filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('@user_notes_recent', JSON.stringify(updated));
    } catch (e) {}
  };

  // Step-by-Step Loading Messages Animation
  useEffect(() => {
    let interval: any;
    if ((isGenerating || isTransforming) && !masterNotesContent) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isTransforming, masterNotesContent]);

  // Handle Tab Switching with Micro Loader
  const handleTabSwitch = (targetMode: ViewMode) => {
    if (targetMode === viewMode) return;

    if (targetMode !== 'notes') {
      const msgMap: Record<ViewMode, string> = {
        notes: '📖 Loading Study Notes...',
        flashcards: '🎴 Preparing Flashcards...',
        mindmap: '🧠 Structuring Mind Map Tree...',
        summary: '📄 Extracting 1-Page Summary...',
        mcq: '⚡ Generating Self-Assessment MCQs...',
      };
      setTabLoadingMsg(msgMap[targetMode]);
      setTabLoading(true);

      setTimeout(() => {
        setViewMode(targetMode);
        setTabLoading(false);
      }, 400);
    } else {
      setViewMode('notes');
    }
  };

  // ACTION 1: SAVE AS WRITTEN (EXACT UNALTERED STUDENT CONTENT)
  const handleSaveAsWritten = async () => {
    if (isSavingAsWritten) return;

    if (!userInputContent.trim()) {
      showToast('error', 'Input Required', 'Please type or dictate your study notes first.');
      return;
    }

    const titleToSave = (userTopicInput || 'My Personal Study Note').trim();
    const exactContent = userInputContent;

    setIsSavingAsWritten(true);

    try {
      const payload = {
        title: titleToSave,
        originalInput: exactContent,
        inputSource: 'manual',
        academicLevel: academicLevel,
        noteFormat: 'As Written',
        generatedNotes: exactContent,
        language: 'English',
      };

      const res = await StudentNoteService.saveNote(payload);

      if (res && res.success) {
        const savedNoteObj = (res as any)?.data || (res as any)?.note || res;
        const noteId = savedNoteObj?._id || savedNoteObj?.id || `note_${Date.now()}`;

        const newItem: SavedNoteItem = {
          id: noteId,
          topic: savedNoteObj?.title || titleToSave,
          level: savedNoteObj?.academicLevel || academicLevel,
          date: savedNoteObj?.createdAt ? new Date(savedNoteObj.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          content: savedNoteObj?.generatedNotes || exactContent,
          originalInput: savedNoteObj?.originalInput || exactContent,
          inputSource: 'manual',
        };

        const updated = [newItem, ...savedNotes.filter((n) => n.id !== newItem.id)];
        setSavedNotes(updated);
        await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(updated));

        // Immediate refresh from backend
        await loadLocalData();

        showToast('success', '✓ Note saved successfully', 'Added to My Saved Study Notes');
      } else {
        throw new Error(res?.error || 'Unable to save note');
      }
    } catch (e: any) {
      console.error('[SAVE AS WRITTEN ERROR]', e);
      showToast('error', 'Unable to save note', 'Please try again.');
    } finally {
      setIsSavingAsWritten(false);
    }
  };

  // ACTION 2: TRANSFORM WITH AI (CLEAN & ORGANIZE STUDENT INPUT ONLY)
  const handleTransformWithAI = async () => {
    if (!userInputContent.trim()) {
      showToast('error', 'Input Required', 'Please type or dictate your study notes first.');
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
    setShowNewResponsePill(false);
    setViewMode('notes');
    setUserMCQAnswers({});

    const systemInstruction = `You are an expert Legal Study Assistant for ${academicLevel} law students.
The student has provided their own study points, observations, or lecture notes.
Your job is to transform and organize ONLY their provided content into clean, well-structured study notes with clear headings, bullet points, and highlighted key concepts.

CRITICAL RULES:
1. Base your output strictly on the student's provided text.
2. Clean up grammar, improve readability, and organize logically.
3. DO NOT invent or fabricate any unprovided legal case facts, citations, dates, or judges that are not present in the input.
4. Format cleanly using Markdown with headings.`;

    const userPromptContent = `Title / Topic: "${topicToUse}"
Student Provided Text:
"${userInputContent}"

Transform and clean up these notes into structured Markdown study notes.`;

    const userMessage = {
      role: 'user' as const,
      content: userPromptContent,
    };

    const payload = {
      content: userPromptContent,
      messages: [userMessage],
      history: [],
      systemInstruction,
      systemPrompt: systemInstruction,
      stream: true,
      sessionId: notesSessionId.current,
      activeTool: 'notesMaker',
      skipSession: true,
      outputLanguage: outputLanguage,
      language: outputLanguage,
    };

    try {
      let accumulated = '';
      try {
        for await (const chunk of streamAIResponse('/chat', payload)) {
          accumulated += chunk;
          setMasterNotesContent(accumulated);
        }
      } catch (streamErr) {
        console.warn('[TRANSFORM STREAM FALLBACK]', streamErr);
      }

      if (!accumulated.trim()) {
        const res = await apiClient.post<any>('/chat', { ...payload, stream: false });
        const data = res?.data;
        accumulated = data?.reply || data?.response || data?.content || data?.text || data?.result || data?.message || (typeof data === 'string' ? data : '');
        setMasterNotesContent(accumulated);
      }

      if (!accumulated.trim()) {
        throw new Error('AI engine returned empty response.');
      }

      setConversationHistory([userMessage, { role: 'assistant', content: accumulated }]);
      deriveViewsFromMasterContent(accumulated, topicToUse);
      showToast('success', 'Transformed Notes Ready', 'AI has organized your study points. Preview before saving.');
    } catch (err: any) {
      console.error('[TRANSFORM ERROR]', err);
      setErrorMsg('Unable to transform notes right now. Your original input remains safe.');
    } finally {
      setIsTransforming(false);
    }
  };

  // ACTION 3: GENERATE FULL STRUCTURED STUDY NOTES
  const handleGenerateNotes = async (overrideTopic?: string, isRetry = false) => {
    let topicToUse = '';
    let isUserProvidedText = false;

    if (inputMode === 'ai_topic') {
      topicToUse = (overrideTopic || promptInput).trim();
      if (!topicToUse) {
        showToast('error', 'Topic Required', 'Please enter a legal topic, Act, Section, or question.');
        return;
      }
    } else {
      if (!userInputContent.trim()) {
        showToast('error', 'Input Required', 'Please type or dictate your observations/notes first.');
        return;
      }
      topicToUse = (userTopicInput || 'Personal Legal Study Notes').trim();
      isUserProvidedText = true;
    }

    setScreenState('workspace');
    setActiveTopicTitle(topicToUse);
    setActiveNoteSource('ai_generated');
    saveRecentSearch(topicToUse);
    setErrorMsg(null);
    useSubscriptionStore.getState().recordToolUsage('notes_maker');
    setIsGenerating(true);
    setLoadingStepIdx(0);
    setMasterNotesContent('');
    setFollowUpThread([]);
    setShowNewResponsePill(false);
    setViewMode('notes');
    setUserMCQAnswers({});

    const chipLabel = NOTE_CHIPS.find((c) => c.id === selectedChip)?.label || 'Study Notes';

    let systemInstruction = '';
    let userPromptContent = '';

    if (isUserProvidedText) {
      systemInstruction = `You are an expert Legal Study Assistant and Master Notes Engine for ${academicLevel} law students.
The student has provided their own observations, case facts, lecture points, or rough study notes below.
Your job is to convert, organize, structure, and format these points into comprehensive, highly detailed exam study notes (${chipLabel}).

CRITICAL CONSTRAINTS & ACCURACY RULES:
1. Base your notes primarily on the student's provided text.
2. Clean up grammar, create logical headings, clear bullet points, key legal concepts, and model exam revision structures.
3. DO NOT invent or fabricate unprovided case facts, citations, dates, judges, or holdings that are not supported by the student's input or standard legal principles. If information is missing, state it clearly or omit it intelligently.
4. Format cleanly using Markdown with headings.`;

      userPromptContent = `Topic / Title: "${topicToUse}"
Student Provided Text & Observations:
"${userInputContent}"

Please convert and format these points into ${chipLabel} for a ${academicLevel} law student.`;
    } else {
      systemInstruction = `You are an expert Legal Study Assistant and Master Notes Engine for ${academicLevel} law students.
Generate comprehensive, highly detailed exam study notes of at least 800 words for: "${topicToUse}" (${chipLabel}).
CRITICAL LANGUAGE RULE:
You MUST generate the ENTIRE notes content (all headings, section titles, definitions, bullet points, statutory explanations, case law ratios, exam tips, and Q&As) STRICTLY in ${outputLanguage}.
Do NOT output in English if ${outputLanguage} is not English.

Format using Markdown in ${outputLanguage}:`;

      userPromptContent = `Generate comprehensive ${chipLabel} study notes for ${academicLevel} law student on topic: "${topicToUse}". OUTPUT LANGUAGE: ${outputLanguage}.`;
    }

    const userMessage = {
      role: 'user' as const,
      content: userPromptContent,
    };

    const payload = {
      content: userPromptContent,
      messages: [userMessage],
      history: [],
      systemInstruction,
      systemPrompt: systemInstruction,
      stream: true,
      sessionId: notesSessionId.current,
      activeTool: 'notesMaker',
      skipSession: true,
    };

    try {
      let accumulated = '';
      try {
        for await (const chunk of streamAIResponse('/chat', payload)) {
          accumulated += chunk;
          setMasterNotesContent(accumulated);
        }
      } catch (streamErr) {
        console.warn('[NOTES STREAM FALLBACK]', streamErr);
      }

      if (accumulated.trim().length < 150) {
        const res = await apiClient.post<any>('/chat', { ...payload, stream: false });
        const data = res?.data;
        accumulated = data?.reply || data?.response || data?.content || data?.text || data?.result || data?.message || (typeof data === 'string' ? data : '');
        setMasterNotesContent(accumulated);
      }

      if (accumulated.trim().length < 500 && !isRetry && !isUserProvidedText) {
        await handleGenerateNotes(topicToUse, true);
        return;
      }

      if (!accumulated.trim()) {
        throw new Error('AI engine returned empty notes response.');
      }

      setConversationHistory([userMessage, { role: 'assistant', content: accumulated }]);
      deriveViewsFromMasterContent(accumulated, topicToUse);
      showToast('success', 'Notes Ready', `AI Notes generated for ${topicToUse}.`);
    } catch (err: any) {
      console.error('[NOTES MAKER ERROR]', err);
      setErrorMsg('Unable to generate study notes right now. Please check internet connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Derive All View Formats from Master Response
  const deriveViewsFromMasterContent = (content: string, topic: string) => {
    const introText = extractSectionContent(content, 'Introduction', `Core legal principle and statutory scope of ${topic}.`);
    const defText = extractSectionContent(content, 'Definition', `Statutory definition and legal framework under ${topic}.`);
    const keyText = extractSectionContent(content, 'Key Concepts', `Essential conditions precedent and ingredients.`);
    const caseText = extractSectionContent(content, 'Important Case Laws', `Landmark Supreme Court ratios governing ${topic}.`);
    const tipText = extractSectionContent(content, 'Exam Tips', `State statutory definitions first, then essential ingredients & case laws.`);
    const memoText = extractSectionContent(content, 'Memory Tricks', `Remember key statutory keywords and section numbers for maximum marks.`);

    const cards: FlashcardItem[] = [
      { term: `Meaning of ${topic}`, definition: introText },
      { term: `Statutory Definition & Origin`, definition: defText },
      { term: `Essential Ingredients`, definition: keyText },
      { term: `Landmark Apex Rulings`, definition: caseText },
      { term: `High-Yield Examiner Tip`, definition: tipText },
      { term: `Memory Trick & Mnemonics`, definition: memoText },
    ];
    setParsedFlashcards(cards);
    setCurrentFlashcardIdx(0);
    setShowFlashcardAnswer(false);

    const tree: MindMapNode[] = [
      {
        id: 'node_1',
        label: `📌 ${topic} Overview`,
        expanded: true,
        children: [
          { id: 'node_1_1', label: `📖 Introduction: ${introText.slice(0, 100)}...` },
          { id: 'node_1_2', label: `⚖️ Legal Scope & Enactment` },
        ],
      },
      {
        id: 'node_2',
        label: `🏛️ Statutory Framework & Ingredients`,
        expanded: true,
        children: [
          { id: 'node_2_1', label: `1️⃣ Mandatory Conditions Precedent` },
          { id: 'node_2_2', label: `2️⃣ Essential Elements & Ingredients` },
        ],
      },
      {
        id: 'node_3',
        label: `⚖️ Apex Court Landmark Precedents`,
        expanded: true,
        children: [
          { id: 'node_3_1', label: `📜 Landmark Supreme Court Ratio` },
          { id: 'node_3_2', label: `💡 Binding Legal Principles` },
        ],
      },
      {
        id: 'node_4',
        label: `🎯 Exam Strategy & Revision`,
        expanded: false,
        children: [
          { id: 'node_4_1', label: `📝 Model Answer Structure` },
          { id: 'node_4_2', label: `🧠 Mnemonic Tricks` },
        ],
      },
    ];
    setMindMapNodes(tree);

    const summaryPart = extractSectionContent(content, 'Quick 1-Minute Revision', content.slice(0, 900));
    setParsedSummary(summaryPart);

    const mcqs: MCQItem[] = [
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
      {
        id: 4,
        q: `Which constitutional or statutory remedy is available under ${topic}?`,
        opts: [
          'Writ jurisdiction and statutory appeal',
          'Public censure',
          'Unilateral private compromise',
          'Non-bailable warrant without notice',
        ],
        ans: 0,
        exp: `Aggrieved parties can invoke statutory appeal mechanisms or writ jurisdiction under Article 226/32.`,
      },
      {
        id: 5,
        q: `In landmark Supreme Court judgments regarding ${topic}, what was the primary ratio?`,
        opts: [
          'Procedure established by law must be fair, just, and reasonable',
          'Executive orders override statutory rights',
          'Fundamental rights are temporary',
          'No judicial review allowed',
        ],
        ans: 0,
        exp: `Supreme Court precedents mandate fair procedure and constitutional compliance.`,
      },
    ];
    setParsedMCQs(mcqs);

    setSuggestedTopics([
      `Constitutional Provisions relating to ${topic}`,
      `Landmark Rulings on ${topic}`,
      `Comparative Legal Analysis`,
      `Practice Exam MCQs on ${topic}`,
    ]);
  };

  const extractSectionContent = (text: string, headingKey: string, fallback: string): string => {
    const lines = text.split('\n');
    let capturing = false;
    const captured: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(headingKey.toLowerCase())) {
        capturing = true;
        continue;
      }
      if (capturing) {
        if (line.startsWith('#') || line.startsWith('## ')) break;
        if (line.trim()) captured.push(line.trim());
      }
    }
    return captured.length > 0 ? captured.join(' ').slice(0, 380) : fallback;
  };

  // Follow-up Handler
  const handleFollowUpInstruction = async (customInstruction?: string) => {
    const textToSend = (customInstruction || followUpInput).trim();
    if (!textToSend || isFollowUpGenerating || isGenerating || !masterNotesContent) return;

    setFollowUpInput('');
    setIsFollowUpGenerating(true);

    const userMsgId = `u_${Date.now()}`;
    const aiMsgId = `ai_${Date.now()}`;

    const userMsgItem: FollowUpMessage = { id: userMsgId, role: 'user', text: textToSend };
    const aiMsgItem: FollowUpMessage = { id: aiMsgId, role: 'assistant', text: '' };

    setFollowUpThread((prev) => [...prev, userMsgItem, aiMsgItem]);

    setTimeout(() => {
      workspaceScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    const followUpUserMsg = {
      role: 'user' as const,
      content: textToSend,
    };
    const updatedHistory = [...conversationHistory, followUpUserMsg];

    try {
      const sysInst = `You are an expert Legal Study Assistant for ${academicLevel} law students.
The student is studying topic: "${activeTopicTitle}".
Master Notes Context:
"${masterNotesContent.slice(0, 1500)}"

Respond to the student's follow-up request accurately in the requested language (Hindi, Hinglish, English, Marathi, Tamil, etc.).
Rules:
- Format cleanly using Markdown with headings, bold text, and bullet points.
- Match the exact typography and structure of study notes.
- Do NOT render inside cards or boxes. Generate as a continuous document section.
- If asked for Hindi/Hinglish (e.g. "Explain in Hindi", "Hindi me samjhao"), reply fully in clean Hinglish/Hindi.
- If asked for short summary or MCQs, provide them directly in document format.`;

      const payload = {
        content: textToSend,
        messages: updatedHistory,
        history: conversationHistory,
        systemInstruction: sysInst,
        systemPrompt: sysInst,
        stream: true,
        sessionId: notesSessionId.current,
        activeTool: 'notesMaker',
        skipSession: true,
      };

      let currentReply = '';
      try {
        for await (const chunk of streamAIResponse('/chat', payload)) {
          currentReply += chunk;
          setFollowUpThread((prev) =>
            prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: currentReply } : msg))
          );
          if (!isNearBottomRef.current) {
            setShowNewResponsePill(true);
          }
        }
      } catch (streamErr) {
        console.warn('[FOLLOW-UP STREAM FALLBACK]', streamErr);
      }

      if (!currentReply.trim()) {
        const res = await apiClient.post<any>('/chat', { ...payload, stream: false });
        const data = res?.data;
        currentReply = data?.reply || data?.response || data?.content || data?.text || data?.result || data?.message || (typeof data === 'string' ? data : '');
        setFollowUpThread((prev) =>
          prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: currentReply } : msg))
        );
      }

      setConversationHistory([...updatedHistory, { role: 'assistant', content: currentReply }]);
      showToast('success', 'AI Replied', 'Follow-up response added to study document.');
    } catch (err) {
      console.error('[FOLLOW-UP ERROR]', err);
      setFollowUpThread((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: '⚠️ Unable to process follow-up request right now. Please check connection and try again.' }
            : msg
        )
      );
      showToast('error', 'Request Failed', 'Could not fetch follow-up response.');
    } finally {
      setIsFollowUpGenerating(false);
      if (!isNearBottomRef.current) {
        setShowNewResponsePill(true);
      }
    }
  };

  const toggleMindMapNode = (nodeId: string) => {
    setMindMapNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, expanded: !node.expanded } : node))
    );
  };

  const handleSelectMCQOption = (qId: number, optIdx: number) => {
    setUserMCQAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const getMCQScore = () => {
    let score = 0;
    parsedMCQs.forEach((q) => {
      if (userMCQAnswers[q.id] === q.ans) score++;
    });
    return score;
  };

  // Save Notes (Backend Persistent + Local Fallback)
  const handleSaveNotes = async () => {
    if (!masterNotesContent) return;
    const titleToSave = activeTopicTitle || promptInput || userTopicInput || 'Legal Study Notes';

    try {
      const payload = {
        title: titleToSave,
        originalInput: inputMode === 'user_input' ? userInputContent : promptInput,
        inputSource: activeNoteSource,
        academicLevel: academicLevel,
        noteFormat: NOTE_CHIPS.find((c) => c.id === selectedChip)?.label || 'Short Notes',
        generatedNotes: masterNotesContent,
        language: 'English',
      };

      const res = await StudentNoteService.saveNote(payload);
      const noteId = (res as any)?.data?._id || (res as any)?._id || `note_${Date.now()}`;

      const newItem: SavedNoteItem = {
        id: noteId,
        topic: titleToSave,
        level: academicLevel,
        date: new Date().toLocaleDateString(),
        content: masterNotesContent,
        originalInput: payload.originalInput,
        inputSource: activeNoteSource,
      };

      const updated = [newItem, ...savedNotes.filter((n) => n.id !== newItem.id)];
      setSavedNotes(updated);
      await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(updated));
      showToast('success', 'Saved Notes', 'Notes saved to your persistent study library.');
    } catch (e) {
      console.error('[SAVE NOTE ERROR]', e);
      showToast('error', 'Save Error', 'Failed to save notes.');
    }
  };

  // Open Edit Modal for Current or Saved Note
  const handleOpenEditModal = (note?: SavedNoteItem) => {
    if (note) {
      setEditingNoteId(note.id);
      setEditingTitle(note.topic);
      setEditingNotesText(note.content);
    } else {
      setEditingNoteId(null);
      setEditingTitle(activeTopicTitle);
      setEditingNotesText(masterNotesContent);
    }
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Modal
  const handleSaveEditedNotes = async () => {
    if (!editingNotesText.trim()) return;

    setMasterNotesContent(editingNotesText);
    if (editingTitle) setActiveTopicTitle(editingTitle);

    if (editingNoteId) {
      try {
        await StudentNoteService.updateNote(editingNoteId, {
          title: editingTitle || activeTopicTitle,
          generatedNotes: editingNotesText,
          academicLevel: academicLevel,
        });

        const updated = savedNotes.map((n) =>
          n.id === editingNoteId
            ? { ...n, topic: editingTitle || n.topic, content: editingNotesText }
            : n
        );
        setSavedNotes(updated);
        await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(updated));
        showToast('success', 'Note Updated', 'Your edited notes have been saved.');
      } catch (err) {
        console.warn('[UPDATE NOTE ERROR]', err);
      }
    } else {
      showToast('success', 'Notes Updated', 'Your edits apply to current workspace session.');
    }

    setIsEditModalOpen(false);
  };

  // Delete Saved Note
  const handleDeleteSavedNote = async (idToDelete: string) => {
    try {
      await StudentNoteService.deleteNote(idToDelete);
      const updated = savedNotes.filter((n) => n.id !== idToDelete);
      setSavedNotes(updated);
      await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(updated));
      showToast('success', 'Note Deleted', 'Study note removed from your library.');
    } catch (err) {
      const updated = savedNotes.filter((n) => n.id !== idToDelete);
      setSavedNotes(updated);
      await AsyncStorage.setItem('@user_saved_notes', JSON.stringify(updated));
      showToast('success', 'Note Deleted', 'Study note removed from library.');
    }
  };

  // Open a saved note in full workspace view (PRESENTS EXACT SAVED CONTENT)
  const handleOpenSavedNote = (note: SavedNoteItem) => {
    setHistoryModalVisible(false);
    setActiveTopicTitle(note.topic);
    setMasterNotesContent(note.content);
    setActiveNoteSource((note.inputSource as any) || 'manual');
    setScreenState('workspace');
    setViewMode('notes');
    deriveViewsFromMasterContent(note.content, note.topic);
  };

  // Copy & Share
  const handleCopy = () => {
    if (!masterNotesContent) return;
    Clipboard.setString(masterNotesContent);
    showToast('success', 'Copied', 'Study notes copied to clipboard.');
  };

  const handleShare = async () => {
    if (!masterNotesContent) return;
    try {
      await Share.share({
        message: masterNotesContent,
        title: `AI Study Notes: ${activeTopicTitle}`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {screenState === 'workspace' ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreenState('home')}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {screenState === 'workspace' ? `📒 ${activeTopicTitle || 'AI Notes Workspace'}` : '📒 ' + tTool(outputLanguage, 'notes.title', 'AI Notes Maker 2.0')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {screenState === 'workspace' ? `${academicLevel} Study Companion` : tTool(outputLanguage, 'notes.subtitle', 'Conversational AI Legal™ Study Companion')}
          </Text>
        </View>
        <OutputLanguageSelector
          toolId="notes-maker"
          selectedLanguage={outputLanguage}
          onLanguageChange={setOutputLanguage}
        />
        <TouchableOpacity style={styles.libraryBtn} onPress={() => { loadLocalData(); setHistoryModalVisible(true); }}>
          <Ionicons name="bookmark-outline" size={22} color="#C8A34D" />
        </TouchableOpacity>
      </View>

      {/* SCREEN STATE 1: HOME SEARCH DASHBOARD */}
      {screenState === 'home' && (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Academic Level Selector */}
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'notes.academicLevel', 'Academic Level')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.levelRow}>
              {ACADEMIC_LEVELS.map((lvl) => {
                const isSelected = academicLevel === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.levelBtn,
                      {
                        backgroundColor: isSelected ? '#C8A34D' : theme.card,
                        borderColor: isSelected ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setAcademicLevel(lvl)}
                  >
                    <Text style={[styles.levelBtnText, { color: isSelected ? '#000000' : theme.textPrimary }]}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Mode Switcher */}
          <View style={[styles.modeSwitchWrapper, { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.modeSwitchBtn,
                inputMode === 'ai_topic' && { backgroundColor: '#C8A34D' },
              ]}
              onPress={() => setInputMode('ai_topic')}
            >
              <Text style={[styles.modeSwitchText, { color: inputMode === 'ai_topic' ? '#000000' : theme.textPrimary }]}>
                ✨ Generate with AI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSwitchBtn,
                inputMode === 'user_input' && { backgroundColor: '#C8A34D' },
              ]}
              onPress={() => setInputMode('user_input')}
            >
              <Text style={[styles.modeSwitchText, { color: inputMode === 'user_input' ? '#000000' : theme.textPrimary }]}>
                ✍️ Create from My Input
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode 1: Generate with AI */}
          {inputMode === 'ai_topic' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'notes.askAITitle', 'Ask AI to Generate Notes')}</Text>
              <View style={[styles.largeSearchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.largeSearchInput, { color: theme.textPrimary }]}
                  placeholder={tTool(outputLanguage, 'notes.askAIPlaceholder', 'Ask AI to generate notes on any legal topic, Act, Section, Article, Judgment or Subject...')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={promptInput}
                  onChangeText={setPromptInput}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: isGenerating ? theme.border : '#C8A34D' }]}
                  onPress={() => handleGenerateNotes()}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.sendBtnText}>⚡ Generate Notes</Text>
                      <Ionicons name="sparkles" size={16} color="#000000" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mode 2: Create from My Input */}
          {inputMode === 'user_input' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'notes.inputTopicLabel', 'What are you studying?')}</Text>
              <TextInput
                style={[styles.singleLineInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder={tTool(outputLanguage, 'notes.inputTopicPlaceholder', 'Optional title / case / topic (e.g. Kesavananda Bharati)')}
                placeholderTextColor={theme.textSecondary}
                value={userTopicInput}
                onChangeText={setUserTopicInput}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
                <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginBottom: 0 }]}>{tTool(outputLanguage, 'notes.inputNotesLabel', 'Your Study Points & Rough Notes')}</Text>
                <TouchableOpacity
                  style={[
                    styles.voiceBtn,
                    { backgroundColor: isListening || isTranscribing ? '#EF4444' : '#C8A34D' }
                  ]}
                  onPress={toggleVoiceListening}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name={isListening ? 'square' : 'mic'} size={15} color={isListening ? '#FFFFFF' : '#000000'} />
                  )}
                  <Text style={[styles.voiceBtnText, { color: isListening || isTranscribing ? '#FFFFFF' : '#000000' }]}>
                    {isTranscribing ? 'Transcribing...' : isListening ? 'Stop' : '🎙 Speak'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.largeSearchWrapper, { backgroundColor: theme.card, borderColor: isListening ? '#EF4444' : theme.border }]}>
                <TextInput
                  style={[styles.largeSearchInput, { color: theme.textPrimary, minHeight: 110 }]}
                  placeholder={tTool(outputLanguage, 'notes.inputNotesPlaceholder', 'Type your observations, case facts, lecture points or dictate using the mic...')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={5}
                  value={userInputContent}
                  onChangeText={setUserInputContent}
                />
              </View>
            </View>
          )}

          {/* Mode 2 Actions: 3 Distinct Choice Buttons */}
          {inputMode === 'user_input' && (
            <View style={{ gap: 10, marginTop: 16, marginBottom: 12 }}>
              <TouchableOpacity
                style={[
                  styles.actionRowBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: '#C8A34D',
                    borderWidth: 1.5,
                    opacity: isSavingAsWritten ? 0.7 : 1,
                  },
                ]}
                onPress={handleSaveAsWritten}
                disabled={isSavingAsWritten}
              >
                {isSavingAsWritten ? (
                  <ActivityIndicator size="small" color="#C8A34D" />
                ) : (
                  <Ionicons name="save-outline" size={18} color="#C8A34D" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                    {isSavingAsWritten ? tTool(outputLanguage, 'notes.saving', 'Saving...') : tTool(outputLanguage, 'notes.btnSaveAsWritten', '💾 Save As Written')}
                  </Text>
                  <Text style={[styles.actionRowDesc, { color: theme.textSecondary }]}>
                    {isSavingAsWritten ? tTool(outputLanguage, 'notes.savingDesc', 'Persisting exact note to database...') : tTool(outputLanguage, 'notes.btnSaveAsWrittenDesc', 'Save exact text without any AI modifications')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: '#C8A34D', borderWidth: 1 }]}
                onPress={handleTransformWithAI}
                disabled={isTransforming}
              >
                {isTransforming ? (
                  <ActivityIndicator size="small" color="#C8A34D" />
                ) : (
                  <Ionicons name="sparkles" size={18} color="#C8A34D" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'notes.btnTransformWithAI', '✨ Transform with AI')}</Text>
                  <Text style={[styles.actionRowDesc, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'notes.btnTransformWithAIDesc', 'Clean grammar, structure headings & create bullet points')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: '#C8A34D' }]}
                onPress={() => handleGenerateNotes()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons name="flash" size={18} color="#000000" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionRowTitle, { color: '#000000' }]}>{tTool(outputLanguage, 'notes.btnGenerateNotes', '⚡ Generate Notes')}</Text>
                  <Text style={{ fontSize: 11, color: '#1F2937' }}>{tTool(outputLanguage, 'notes.btnGenerateNotesDesc', 'Combine your input with format & AI to create comprehensive notes')}</Text>
                </View>
              </TouchableOpacity>

              {/* Select Note Format AFTER Generate Notes */}
              <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: 12 }]}>Select Note Format</Text>
              <View style={styles.formatGrid}>
                {NOTE_CHIPS.map((chip) => {
                  const isSelected = selectedChip === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.gridCard,
                        {
                          backgroundColor: isSelected ? (isDark ? '#374151' : '#FEF3C7') : theme.card,
                          borderColor: isSelected ? '#C8A34D' : theme.border,
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setSelectedChip(chip.id)}
                    >
                      <Text style={[styles.gridCardTitle, { color: isSelected ? '#C8A34D' : theme.textPrimary }]}>
                        {tTool(outputLanguage, 'notes.chip' + chip.id.replace('_', '').toLowerCase() + 'Title', chip.label)}
                      </Text>
                      <Text style={[styles.gridCardDesc, { color: theme.textSecondary }]}>
                        {tTool(outputLanguage, 'notes.chip' + chip.id.replace('_', '').toLowerCase() + 'Desc', chip.desc)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quick Format 2x3 Grid for Mode 1: Generate with AI */}
          {inputMode === 'ai_topic' && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: 12 }]}>{tTool(outputLanguage, 'notes.selectFormatTitle', 'Select Note Format')}</Text>
              <View style={styles.formatGrid}>
                {NOTE_CHIPS.map((chip) => {
                  const isSelected = selectedChip === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.gridCard,
                        {
                          backgroundColor: isSelected ? (isDark ? '#374151' : '#FEF3C7') : theme.card,
                          borderColor: isSelected ? '#C8A34D' : theme.border,
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setSelectedChip(chip.id)}
                    >
                      <Text style={[styles.gridCardTitle, { color: isSelected ? '#C8A34D' : theme.textPrimary }]}>
                        {tTool(outputLanguage, 'notes.chip' + chip.id.replace('_', '').toLowerCase() + 'Title', chip.label)}
                      </Text>
                      <Text style={[styles.gridCardDesc, { color: theme.textSecondary }]}>
                        {tTool(outputLanguage, 'notes.chip' + chip.id.replace('_', '').toLowerCase() + 'Desc', chip.desc)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Trending Legal Topics — ONLY visible under "Generate with AI" mode */}
          {inputMode === 'ai_topic' && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: 12 }]}>🔥 {tTool(outputLanguage, 'notes.trendingTopicsTitle', 'Trending Legal Topics')}</Text>
              <View style={styles.wrappingChipsContainer}>
                {TRENDING_TOPICS.map((tTopic, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.trendingWrapChip, { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: theme.border }]}
                    onPress={() => {
                      setPromptInput(tTopic);
                      handleGenerateNotes(tTopic);
                    }}
                  >
                    <Text style={[styles.trendingWrapText, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'topic.' + tTopic.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.title', tTopic)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* SCREEN STATE 2: DEDICATED NOTES WORKSPACE */}
      {screenState === 'workspace' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={workspaceScrollRef}
              contentContainerStyle={styles.workspaceScrollContent}
              keyboardShouldPersistTaps="handled"
              onScroll={handleWorkspaceScroll}
              scrollEventThrottle={16}
            >
              {/* Toolbar Header */}
              <View style={[styles.workspaceToolbar, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.newSearchBtn} onPress={() => setScreenState('home')}>
                  <Ionicons name="search" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                  <Text style={styles.newSearchBtnText}>New Search</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleOpenEditModal()} style={styles.actionIconBtn}>
                    <Ionicons name="create-outline" size={18} color="#C8A34D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveNotes} style={styles.actionIconBtn}>
                    <Ionicons name="bookmark-outline" size={18} color="#C8A34D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCopy} style={styles.actionIconBtn}>
                    <Ionicons name="copy-outline" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleShare} style={styles.actionIconBtn}>
                    <Ionicons name="share-social-outline" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Source Banner Indicator */}
              {activeNoteSource === 'ai_transformed' && (
                <View style={[styles.sourceBanner, { backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: '#C8A34D' }]}>
                  <Text style={[styles.sourceBannerText, { color: theme.textPrimary }]}>
                    ✨ Transformed Preview — Preview of organized notes derived from your input. Tap 🔖 Save Notes to persist.
                  </Text>
                </View>
              )}

              {/* Learning View Mode Chips Bar */}
              <View style={styles.viewModeChipsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { mode: 'notes', label: '📖 ' + tTool(outputLanguage, 'notes.tabNotes', 'Study Notes') },
                    { mode: 'flashcards', label: tTool(outputLanguage, 'notes.tabFlashcards', '🎴 Flashcards') },
                    { mode: 'mindmap', label: tTool(outputLanguage, 'notes.tabMindmap', '🧠 Mind Map') },
                    { mode: 'summary', label: '📄 1-Page Synopsis' },
                    { mode: 'mcq', label: '⚡ ' + tTool(outputLanguage, 'notes.tabMCQ', 'Practice MCQs') },
                  ].map((tab) => {
                    const isActive = viewMode === tab.mode;
                    return (
                      <TouchableOpacity
                        key={tab.mode}
                        style={[
                          styles.tabChip,
                          {
                            backgroundColor: isActive ? '#C8A34D' : theme.card,
                            borderColor: isActive ? '#C8A34D' : theme.border,
                          },
                        ]}
                        onPress={() => handleTabSwitch(tab.mode as ViewMode)}
                      >
                        <Text style={[styles.tabChipText, { color: isActive ? '#000000' : theme.textPrimary }]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Tab Micro Loader */}
              {tabLoading && (
                <View style={styles.tabLoaderBox}>
                  <ActivityIndicator size="small" color="#C8A34D" />
                  <Text style={[styles.tabLoaderText, { color: theme.textSecondary }]}>{tabLoadingMsg}</Text>
                </View>
              )}

              {/* Step-by-Step Initial Loading View */}
              {(isGenerating || isTransforming) && !masterNotesContent && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#C8A34D" />
                  <Text style={[styles.loadingStepText, { color: theme.textPrimary }]}>
                    {LOADING_STEPS[loadingStepIdx]}
                  </Text>
                </View>
              )}

              {/* Error Message view */}
              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => handleGenerateNotes(activeTopicTitle)}>
                    <Text style={styles.retryBtnText}>Retry Generation</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* VIEW 1: MASTER STUDY NOTES */}
              {!tabLoading && viewMode === 'notes' && masterNotesContent ? (
                <View style={styles.documentBody}>
                  {renderCleanMarkdown(masterNotesContent, theme, isDark)}

                  {/* Follow-up Continuous Document Additions */}
                  {followUpThread.map((msg) => (
                    <View key={msg.id} style={{ marginTop: 14 }}>
                      {msg.role === 'user' ? (
                        <View style={[styles.userPromptDocDivider, { borderTopColor: theme.border }]}>
                          <Text style={[styles.userPromptDocHeading, { color: '#C8A34D' }]}>
                            💬 Follow-up Request: {msg.text}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.aiFollowUpDocBlock}>
                          {msg.text ? (
                            renderCleanMarkdown(msg.text, theme, isDark)
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                              <ActivityIndicator size="small" color="#C8A34D" />
                              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Generating follow-up analysis...</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* VIEW 2: FLASHCARDS */}
              {!tabLoading && viewMode === 'flashcards' && (
                <View style={styles.flashcardsContainer}>
                  {parsedFlashcards.length > 0 ? (
                    <View>
                      <Text style={[styles.flashcardProgressText, { color: theme.textSecondary }]}>
                        Card {currentFlashcardIdx + 1} of {parsedFlashcards.length}
                      </Text>
                      <TouchableOpacity
                        style={[styles.flashcardCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        activeOpacity={0.9}
                        onPress={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                      >
                        <Text style={styles.flashcardTag}>
                          {showFlashcardAnswer ? '💡 EXPLANATION / RATIO' : '❓ LEGAL CONCEPT'}
                        </Text>
                        <Text style={[styles.flashcardTitle, { color: theme.textPrimary }]}>
                          {showFlashcardAnswer
                            ? parsedFlashcards[currentFlashcardIdx].definition
                            : parsedFlashcards[currentFlashcardIdx].term}
                        </Text>
                        <Text style={styles.tapToFlipHint}>Tap to flip card 🔄</Text>
                      </TouchableOpacity>

                      <View style={styles.flashcardNavRow}>
                        <TouchableOpacity
                          style={[styles.flashcardNavBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                          disabled={currentFlashcardIdx === 0}
                          onPress={() => {
                            setCurrentFlashcardIdx((prev) => Math.max(0, prev - 1));
                            setShowFlashcardAnswer(false);
                          }}
                        >
                          <Text style={[styles.flashcardNavText, { color: theme.textPrimary }]}>Previous</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.flashcardNavBtn, { backgroundColor: '#C8A34D' }]}
                          disabled={currentFlashcardIdx === parsedFlashcards.length - 1}
                          onPress={() => {
                            setCurrentFlashcardIdx((prev) => Math.min(parsedFlashcards.length - 1, prev + 1));
                            setShowFlashcardAnswer(false);
                          }}
                        >
                          <Text style={[styles.flashcardNavText, { color: '#000000' }]}>Next Card</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ color: theme.textSecondary }}>No flashcards derived.</Text>
                  )}
                </View>
              )}

              {/* VIEW 3: MIND MAP TREE */}
              {!tabLoading && viewMode === 'mindmap' && (
                <View style={styles.mindmapContainer}>
                  {mindMapNodes.map((node) => (
                    <View key={node.id} style={[styles.mindmapBranch, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.mindmapHeader} onPress={() => toggleMindMapNode(node.id)}>
                        <Text style={[styles.mindmapTitle, { color: theme.textPrimary }]}>{node.label}</Text>
                        <Ionicons
                          name={node.expanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>

                      {node.expanded && node.children && (
                        <View style={styles.mindmapChildren}>
                          {node.children.map((child) => (
                            <View key={child.id} style={styles.mindmapLeaf}>
                              <Text style={[styles.mindmapLeafText, { color: theme.textPrimary }]}>• {child.label}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* VIEW 4: 1-PAGE SUMMARY */}
              {!tabLoading && viewMode === 'summary' && (
                <View style={[styles.summaryBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>📑 Quick 1-Page Revision Synopsis</Text>
                  {renderCleanMarkdown(parsedSummary, theme, isDark)}
                </View>
              )}

              {/* VIEW 5: PRACTICE MCQS */}
              {!tabLoading && viewMode === 'mcq' && (
                <View style={styles.mcqContainer}>
                  <View style={[styles.mcqHeaderBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.mcqScoreText, { color: theme.textPrimary }]}>
                      Score: {getMCQScore()} / {parsedMCQs.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Test your conceptual understanding</Text>
                  </View>

                  {parsedMCQs.map((q) => {
                    const selectedOpt = userMCQAnswers[q.id];
                    const isAnswered = selectedOpt !== undefined;

                    return (
                      <View key={q.id} style={[styles.mcqCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.mcqQuestionText, { color: theme.textPrimary }]}>
                          Q{q.id}. {q.q}
                        </Text>
                        <View style={{ gap: 8, marginVertical: 10 }}>
                          {q.opts.map((opt, optIdx) => {
                            let optBg = theme.background;
                            let optBorder = theme.border;
                            if (isAnswered) {
                              if (optIdx === q.ans) {
                                optBg = isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5';
                                optBorder = '#10B981';
                              } else if (selectedOpt === optIdx) {
                                optBg = isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2';
                                optBorder = '#EF4444';
                              }
                            }

                            return (
                              <TouchableOpacity
                                key={optIdx}
                                style={[styles.mcqOptionBtn, { backgroundColor: optBg, borderColor: optBorder }]}
                                onPress={() => handleSelectMCQOption(q.id, optIdx)}
                              >
                                <Text style={[styles.mcqOptionText, { color: theme.textPrimary }]}>{opt}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {isAnswered && (
                          <View style={styles.mcqExpBox}>
                            <Text style={styles.mcqExpText}>💡 {q.exp}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Follow-up Prompt Chip Suggestions */}
              {masterNotesContent && !isGenerating && !isTransforming ? (
                <View style={styles.suggestedSection}>
                  <Text style={[styles.suggestedTitle, { color: theme.textSecondary }]}>Suggested Follow-up Prompts:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {suggestedTopics.map((sTopic, sIdx) => (
                        <TouchableOpacity
                          key={sIdx}
                          style={[styles.suggestedChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                          onPress={() => handleFollowUpInstruction(sTopic)}
                        >
                          <Text style={[styles.suggestedChipText, { color: theme.textPrimary }]}>{sTopic}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}
            </ScrollView>

            {/* Floating New Response Pill */}
            {showNewResponsePill && (
              <TouchableOpacity style={styles.newResponsePill} onPress={manualScrollToBottom}>
                <Ionicons name="arrow-down" size={14} color="#000000" />
                <Text style={styles.newResponsePillText}>New AI Response ↓</Text>
              </TouchableOpacity>
            )}

            {/* Bottom Follow-up Input Bar */}
            <View style={[styles.bottomInputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
              <TextInput
                style={[styles.followUpTextInput, { color: theme.textPrimary, backgroundColor: theme.background }]}
                placeholder="Ask follow-up question, ask to explain in Hindi, or request MCQs..."
                placeholderTextColor={theme.textSecondary}
                value={followUpInput}
                onChangeText={setFollowUpInput}
                onSubmitEditing={() => handleFollowUpInstruction()}
              />
              <TouchableOpacity
                style={[styles.followUpSendBtn, { backgroundColor: isFollowUpGenerating ? theme.border : '#C8A34D' }]}
                onPress={() => handleFollowUpInstruction()}
                disabled={isFollowUpGenerating}
              >
                {isFollowUpGenerating ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons name="send" size={16} color="#000000" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* SAVED NOTES LIBRARY MODAL */}
      <Modal visible={historyModalVisible} animationType="slide" transparent onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>📚 My Saved Study Notes</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
              {savedNotes.length > 0 ? (
                savedNotes.map((note) => (
                  <View key={note.id} style={[styles.historyCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {note.topic}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        <Text style={styles.historyCardLevel}>{note.level}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>• {note.date}</Text>
                        <Text style={[styles.sourceBadge, { backgroundColor: note.inputSource === 'manual' ? '#D1FAE5' : '#FEF3C7', color: note.inputSource === 'manual' ? '#065F46' : '#92400E' }]}>
                          {note.inputSource === 'manual' ? 'As Written' : note.inputSource === 'ai_transformed' ? 'Transformed' : 'AI Generated'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TouchableOpacity style={[styles.openNoteBtn, { backgroundColor: '#C8A34D' }]} onPress={() => handleOpenSavedNote(note)}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>Open</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleOpenEditModal(note)}>
                        <Ionicons name="create-outline" size={18} color="#C8A34D" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteSavedNote(note.id)}>
                        <Ionicons name="trash-outline" size={18} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📒</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>No Saved Notes Yet</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
                    Notes you save will be listed here persistently for your offline study library.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT NOTE MODAL */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent onRequestClose={() => setIsEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>✏️ Edit Study Notes</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 8, gap: 10, flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginBottom: 0 }]}>Note Title</Text>
              <TextInput
                style={[styles.singleLineInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                value={editingTitle}
                onChangeText={setEditingTitle}
                placeholder="Note Title"
              />

              <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginBottom: 0 }]}>Note Content (Markdown)</Text>
              <TextInput
                style={[styles.largeSearchInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary, flex: 1, textAlignVertical: 'top' }]}
                value={editingNotesText}
                onChangeText={setEditingNotesText}
                multiline
                placeholder="Edit your study notes..."
              />

              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#C8A34D', marginTop: 8 }]} onPress={handleSaveEditedNotes}>
                <Text style={[styles.sendBtnText, { color: '#000000' }]}>💾 Save Changes</Text>
              </TouchableOpacity>
            </View>
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
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  libraryBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitchWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  modeSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  singleLineInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  voiceBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  largeSearchWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  largeSearchInput: {
    fontSize: 13.5,
    lineHeight: 20,
    minHeight: 70,
  },
  sendBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  sendBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  gridCard: {
    width: (width - 42) / 2,
    padding: 12,
    borderRadius: 12,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridCardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  actionRowTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  actionRowDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  wrappingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  trendingWrapChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  trendingWrapText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workspaceScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  workspaceToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  newSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newSearchBtnText: {
    color: '#C8A34D',
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionIconBtn: {
    padding: 6,
  },
  sourceBanner: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  viewModeChipsRow: {
    marginBottom: 14,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabLoaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  tabLoaderText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingStepText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DC2626',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  documentBody: {
    paddingVertical: 8,
  },
  cleanH1: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },
  cleanH2Container: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginTop: 14,
    marginBottom: 8,
  },
  cleanH2: {
    fontSize: 16,
    fontWeight: '800',
  },
  cleanH3: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 3,
  },
  bulletDot: {
    fontSize: 14,
    fontWeight: '800',
  },
  bulletText: {
    fontSize: 13.5,
    lineHeight: 20,
    flex: 1,
  },
  cleanDivider: {
    height: 1,
    marginVertical: 12,
  },
  cleanBodyText: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  userPromptDocDivider: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
  userPromptDocHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  aiFollowUpDocBlock: {
    paddingVertical: 6,
  },
  flashcardsContainer: {
    paddingVertical: 12,
  },
  flashcardProgressText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  flashcardCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashcardTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    marginBottom: 12,
  },
  flashcardTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  tapToFlipHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 16,
  },
  flashcardNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  flashcardNavBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  flashcardNavText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mindmapContainer: {
    gap: 10,
    paddingVertical: 12,
  },
  mindmapBranch: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  mindmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mindmapTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mindmapChildren: {
    marginTop: 10,
    paddingLeft: 12,
    gap: 6,
  },
  mindmapLeaf: {
    paddingVertical: 4,
  },
  mindmapLeafText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  summaryBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  mcqContainer: {
    gap: 12,
    paddingVertical: 12,
  },
  mcqHeaderBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  mcqScoreText: {
    fontSize: 16,
    fontWeight: '800',
  },
  mcqCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  mcqQuestionText: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  mcqOptionBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  mcqOptionText: {
    fontSize: 12.5,
  },
  mcqExpBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  mcqExpText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  suggestedSection: {
    marginTop: 20,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  suggestedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestedChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  newResponsePill: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C8A34D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newResponsePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  followUpTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  followUpSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  historyCardLevel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
  },
  sourceBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openNoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
