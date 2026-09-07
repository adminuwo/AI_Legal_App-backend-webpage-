import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Clipboard,
  LayoutAnimation,
  UIManager,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthGuard } from '@/navigation/guards';
import { useToastContext, useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useChat } from '@/hooks/use-chat';
import { ChatMessageBubble, TypingIndicator, ThinkingState, ChatComposer, KeyboardSafeChatLayout } from '@/components/ui/chat';
import { ChatMessage, ChatAttachment } from '@/types';
import { useChatStore } from '@/store/chat';
import { Shadows } from '@/theme';
import { PageHeader } from '@/components/ui';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { useWorkspaceStore } from '@/store/workspace';
import { CaseService } from '@/services/case.service';
import { useRoleStore } from '@/store/role';
import { ChatUsageAwarenessBanner } from '@/components/ui/ChatUsageAwarenessBanner';

const { width, height } = Dimensions.get('window');

// Available AI Tools inside general assistant
const AI_TOOLS = [
  { id: 'legal_my_case', label: 'AI Assistant', description: 'General legal conversations', icon: '🧠' },
  { id: 'draftMaker', label: 'Draft Maker', description: 'Generate legal drafts', icon: '📄' },
  { id: 'legalResearch', label: 'Legal Precedent', description: 'Find laws and precedents', icon: '🔍' },
  { id: 'contractAnalyzer', label: 'Contract Analyzer', description: 'Review contracts', icon: '📑' },
  { id: 'evidenceAnalyst', label: 'Evidence Analyst', description: 'Analyze evidence', icon: '📂' },
  { id: 'argumentBuilder', label: 'Argument Builder', description: 'Build legal arguments', icon: '⚖' },
  { id: 'casePredictor', label: 'Case Predictor', description: 'Predict case outcomes', icon: '📈' },
  { id: 'strategyEngine', label: 'Strategy Engine', description: 'Legal strategy planning', icon: '🧠' },
  { id: 'researchAssistant', label: 'Research Assistant', description: 'Advanced legal research', icon: '📚' },
];

const AI_ACTIONS_CATEGORIES = [
  {
    title: 'CASE ANALYSIS',
    actions: [
      { id: 'analyze_case', label: 'Analyze My Case', icon: '⚖️' },
      { id: 'identify_issues', label: 'Identify Legal Issues', icon: '🧠' },
    ],
  },
  {
    title: 'DOCUMENT ACTIONS',
    actions: [
      { id: 'summarize_docs', label: 'Summarize Documents', icon: '📄' },
      { id: 'find_missing_evidence', label: 'Find Missing Evidence', icon: '🔍' },
    ],
  },
  {
    title: 'STRATEGY',
    actions: [
      { id: 'suggest_strategy', label: 'Suggest Legal Strategy', icon: '🎯' },
      { id: 'identify_weak_points', label: 'Identify Weak Points', icon: '⚠️' },
    ],
  },
  {
    title: 'ARGUMENTS',
    actions: [
      { id: 'generate_arguments', label: 'Generate Arguments', icon: '📝' },
      { id: 'generate_counter_arguments', label: 'Generate Counter Arguments', icon: '🛡️' },
    ],
  },
  {
    title: 'RESEARCH',
    actions: [
      { id: 'find_relevant_laws', label: 'Find Relevant Laws', icon: '📚' },
      { id: 'find_similar_judgments', label: 'Find Similar Judgments', icon: '🏛️' },
    ],
  },
  {
    title: 'RISK REVIEW',
    actions: [
      { id: 'risk_assessment', label: 'Legal Risk Assessment', icon: '🚨' },
      { id: 'questions_to_ask_client', label: 'Questions To Ask Client', icon: '❓' },
    ],
  },
  {
    title: 'COURT PREPARATION',
    actions: [
      { id: 'prepare_hearing_notes', label: 'Prepare Hearing Notes', icon: '👨‍⚖️' },
      { id: 'prepare_client_questions', label: 'Prepare Client Questions', icon: '🎤' },
    ],
  },
  {
    title: 'DRAFT HELP',
    actions: [
      { id: 'improve_draft', label: 'Improve Draft', icon: '✍️' },
      { id: 'review_legal_notice', label: 'Review Legal Notice', icon: '📋' },
    ],
  },
];

const getPromptText = (actionId: string, activeCaseName?: string | null) => {
  const caseContext = activeCaseName ? `for the active case "${activeCaseName}"` : "of this case";
  const caseContextStrategy = activeCaseName ? `for the active case "${activeCaseName}"` : "this case";
  const caseContextMatter = activeCaseName ? `relevant to the active case "${activeCaseName}"` : "relevant to this matter";
  const caseContextDoc = activeCaseName ? `documents and evidence for the active case "${activeCaseName}"` : "uploaded documents and evidence";
  
  switch (actionId) {
    case 'analyze_case':
      return `Analyze the facts ${caseContext} and identify key legal issues, risks, strengths and possible remedies.`;
    case 'identify_issues':
      return `Identify the core legal issues and questions of law ${activeCaseName ? `in the active case "${activeCaseName}"` : "that need to be resolved in this matter"}.`;
    case 'summarize_docs':
      return `Provide a clear, structured summary of the ${caseContextDoc}.`;
    case 'find_missing_evidence':
      return `Identify potential gaps in evidence and suggest additional documents that should be procured to strengthen ${activeCaseName ? `the active case "${activeCaseName}"` : "this case"}.`;
    case 'suggest_strategy':
      return `Suggest a comprehensive legal strategy ${caseContextStrategy}, including procedural steps, timing, and negotiation approaches.`;
    case 'identify_weak_points':
      return `Review ${activeCaseName ? `the active case "${activeCaseName}"` : "this case"} and identify weaknesses, missing evidence, legal gaps and possible challenges.`;
    case 'generate_arguments':
      return `Generate strong legal arguments supporting my client's position ${activeCaseName ? `in the active case "${activeCaseName}"` : ""}.`.trim();
    case 'generate_counter_arguments':
      return `Generate likely counter arguments from the opposing party ${activeCaseName ? `in the active case "${activeCaseName}"` : ""}.`.trim();
    case 'find_relevant_laws':
      return `Identify applicable statutes, sections and legal provisions ${caseContextMatter}.`;
    case 'find_similar_judgments':
      return `Find and summarize landmark judgments and similar case precedents ${caseContextMatter}.`;
    case 'risk_assessment':
      return `Conduct a detailed legal risk assessment ${caseContextStrategy}, highlighting civil, criminal, or financial liabilities and procedural pitfalls.`;
    case 'questions_to_ask_client':
      return `Generate a list of critical questions to ask the client to clarify facts and strengthen the case file ${activeCaseName ? `for "${activeCaseName}"` : ""}.`.trim();
    case 'prepare_hearing_notes':
      return `Prepare concise hearing notes for the advocate before court appearance ${activeCaseName ? `for the active case "${activeCaseName}"` : ""}.`.trim();
    case 'prepare_client_questions':
      return `Prepare a list of targeted questions for the client or witnesses during preparation for examination ${activeCaseName ? `in the active case "${activeCaseName}"` : ""}.`.trim();
    case 'improve_draft':
      return `Review the legal draft ${activeCaseName ? `for "${activeCaseName}"` : ""} and suggest improvements for language, clarity, structure, and legal citations.`;
    case 'review_legal_notice':
      return `Review the legal notice ${activeCaseName ? `for "${activeCaseName}"` : ""} and provide suggestions for corrections, stronger claims, and overall legal structure.`;
    default:
      return '';
  }
};


const QUICK_ACTIONS_DATA: Record<string, string[]> = {
  draftMaker: [
    'FIR',
    'Legal Notice',
    'Affidavit',
    'Rent Agreement',
    'Sale Agreement',
    'Employment Agreement',
    'Consumer Complaint',
    'Power of Attorney',
    'Partnership Deed',
    'Will',
    'Divorce Petition',
    'Bail Application',
    'RTI Application',
    'Legal Reply',
    'Custom Draft',
  ],
  contractAnalyzer: [
    'Analyze Contract',
    'Employment Agreement Review',
    'NDA Review',
    'Lease Agreement Review',
    'Vendor Agreement Review',
    'Risk Assessment',
    'Clause Explanation',
    'Missing Clauses',
    'Compliance Check',
  ],
  legalResearch: [
    'Supreme Court Judgments',
    'High Court Judgments',
    'Bare Acts',
    'IPC / BNS Sections',
    'Constitution Articles',
    'Recent Case Law',
    'Landmark Cases',
    'Legal Concepts',
  ],
  evidenceAnalyst: [
    'Analyze PDF',
    'Analyze Images',
    'OCR Extraction',
    'Timeline Generation',
    'Witness Statement Review',
    'Document Comparison',
    'Metadata Analysis',
  ],
  argumentBuilder: [
    'Generate Arguments',
    'Counter Arguments',
    'Cross Examination Questions',
    'Final Submissions',
    'Legal Strategy',
  ],
  casePredictor: [
    'Predict Outcome',
    'Strength Analysis',
    'Weakness Detection',
    'Success Probability',
    'Risk Factors',
  ],
  strategyEngine: [
    'Litigation Strategy',
    'Settlement Strategy',
    'Evidence Planning',
    'Hearing Preparation',
    'Next Legal Steps',
  ],
  researchAssistant: [
    'Research Topic',
    'Explain Legal Concept',
    'Compare Laws',
    'Summarize Judgment',
    'Find Precedents',
  ],
  legal_my_case: [
    'Explain legal query',
    'Draft a document',
    'Review a contract',
    'Find case laws',
    'Analyze court filings',
    'Litigation advice',
  ],
};

const QUICK_ACTION_PROMPTS: Record<string, string> = {
  'FIR': 'Draft a First Information Report (FIR) for: ',
  'Legal Notice': 'Draft a professional Legal Notice for: ',
  'Affidavit': 'Draft an Affidavit stating: ',
  'Rent Agreement': 'Draft a Rent Agreement between: ',
  'Sale Agreement': 'Draft a Sale Agreement for: ',
  'Employment Agreement': 'Draft an Employment Agreement between: ',
  'Consumer Complaint': 'Draft a Consumer Complaint against: ',
  'Power of Attorney': 'Draft a Power of Attorney authorizing: ',
  'Partnership Deed': 'Draft a Partnership Deed between: ',
  'Will': 'Draft a Last Will and Testament for: ',
  'Divorce Petition': 'Draft a Mutual Divorce Petition on grounds of: ',
  'Bail Application': 'Draft a Bail Application for: ',
  'RTI Application': 'Draft an RTI Application requesting: ',
  'Legal Reply': 'Draft a Legal Reply to: ',
  'Custom Draft': 'Draft a custom legal document: ',

  'Analyze Contract': 'Analyze this contract and summarize the key clauses: ',
  'Employment Agreement Review': 'Review this Employment Agreement for risks and employee rights: ',
  'NDA Review': 'Review this Non-Disclosure Agreement (NDA) for exclusions and duration: ',
  'Lease Agreement Review': 'Review this Lease Agreement for escalation terms and lock-in period: ',
  'Vendor Agreement Review': 'Review this Vendor Agreement for payment terms and SLA breaches: ',
  'Risk Assessment': 'Perform a comprehensive risk assessment on this contract: ',
  'Clause Explanation': 'Explain the following contract clause: ',
  'Missing Clauses': 'Identify any missing or standard boilerplate clauses in this agreement: ',
  'Compliance Check': 'Verify if this agreement is compliant with local laws: ',

  'Supreme Court Judgments': 'Search for Supreme Court judgments related to: ',
  'High Court Judgments': 'Search for High Court judgments on the topic of: ',
  'Bare Acts': 'Provide the text and explanation of Bare Act provisions for: ',
  'IPC / BNS Sections': 'Explain the sections and penalties under IPC/BNS for: ',
  'Constitution Articles': 'Retrieve and explain Constitution Articles relating to: ',
  'Recent Case Law': 'Find recent case laws (last 2 years) regarding: ',
  'Landmark Cases': 'List landmark judicial precedents and ratios for: ',
  'Legal Concepts': 'Explain the legal concept of: ',

  'Analyze PDF': 'Analyze the contents of this PDF evidence file: ',
  'Analyze Images': 'Analyze this image evidence: ',
  'OCR Extraction': 'Perform OCR text extraction on this document: ',
  'Timeline Generation': 'Generate a chronological timeline of events based on this evidence: ',
  'Witness Statement Review': 'Review this witness statement for credibility: ',
  'Document Comparison': 'Compare these two evidence documents: ',
  'Metadata Analysis': 'Extract and analyze metadata of this file: ',

  'Generate Arguments': 'Generate a list of primary arguments supporting the claim: ',
  'Counter Arguments': 'Formulate counter-arguments and rebuttals to: ',
  'Cross Examination Questions': 'Generate cross-examination questions for: ',
  'Final Submissions': 'Draft final submissions and prayer for: ',
  'Legal Strategy': 'Propose a strong legal strategy to refute opposing claims: ',

  'Predict Outcome': 'Predict the outcome of this case based on: ',
  'Strength Analysis': 'List the strongest legal points of our position: ',
  'Weakness Detection': 'Identify the weakest points in our case file: ',
  'Success Probability': 'Calculate the success probability and risk factors: ',
  'Risk Factors': 'What are the high-risk legal liabilities or penalties we might face: ',

  'Litigation Strategy': 'Develop a litigation strategy, timeline, and key steps for: ',
  'Settlement Strategy': 'Propose a settlement draft and target compromises for: ',
  'Evidence Planning': 'Identify what evidence we need to procure or request for: ',
  'Hearing Preparation': 'Generate a checklist to prepare for the upcoming hearing on: ',
  'Next Legal Steps': 'What are the immediate next legal steps for: ',

  'Research Topic': 'Research and summarize all statutory provisions for: ',
  'Explain Legal Concept': 'Provide a detailed explanation and legal theory behind: ',
  'Compare Laws': 'Compare laws and rules across jurisdictions for: ',
  'Summarize Judgment': 'Summarize the facts, issues, and ratio of the following judgment: ',
  'Find Precedents': 'Find relevant binding precedents for: ',

  'Explain legal query': 'Can you explain: ',
  'Draft a document': 'Draft a document for: ',
  'Review a contract': 'Review a contract for: ',
  'Find case laws': 'Find case laws for: ',
  'Analyze court filings': 'Analyze court filings for: ',
  'Litigation advice': 'Give litigation advice for: ',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATIC_HEIGHTS = [8, 14, 18, 12, 6, 16, 22, 28, 20, 10, 14, 24, 18, 8, 12, 22, 16, 10, 14, 8];

function VoiceWaveform({
  isRecording,
  isPlaying,
  playbackPosition = 0,
  duration = 0,
}: {
  isRecording: boolean;
  isPlaying: boolean;
  playbackPosition?: number;
  duration?: number;
}) {
  const { theme } = useThemeContext();
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isRecording && !isPlaying) return;
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, isPlaying]);

  return (
    <View style={styles.waveformBarsRow}>
      {Array.from({ length: 20 }).map((_, i) => {
        let barHeight = 8;
        if (isRecording) {
          barHeight = Math.abs(Math.sin((time + i) * 0.4)) * 20 + 4;
        } else if (isPlaying) {
          barHeight = STATIC_HEIGHTS[i] + Math.abs(Math.sin((time + i) * 0.3)) * 6 - 3;
          barHeight = Math.max(4, Math.min(30, barHeight));
        } else {
          barHeight = STATIC_HEIGHTS[i];
        }

        const progress = duration > 0 ? playbackPosition / duration : 0;
        const barProgress = i / 20;
        const barColor = !isRecording && barProgress <= progress ? theme.primary : '#D1D5DB';

        return (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: barHeight,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function MainChatScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const activeCaseId = useWorkspaceStore((s) => s.activeCaseId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  useEffect(() => {
    if (activeCaseId && !workspaces[activeCaseId]) {
      CaseService.getCaseDetails(activeCaseId)
        .then((res) => {
          if (res.success && res.data) {
            setWorkspace(activeCaseId, res.data);
          }
        })
        .catch((err) => {
          console.warn('Error preloading active case details in assistant chat:', err);
        });
    }
  }, [activeCaseId]);

  const activeCase = activeCaseId ? workspaces[activeCaseId] : null;
  const activeCaseName = activeCase?.name;

  // Focus Mode State
  const isFocusMode = useChatStore((s) => s.isFocusMode);
  const setFocusMode = useChatStore((s) => s.setFocusMode);

  const toggleFocusMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFocusMode(!isFocusMode);
  };

  useEffect(() => {
    return () => {
      useChatStore.getState().setFocusMode(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const {
    sessions,
    activeSessionId,
    activeSession,
    sending,
    error,
    loading,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_my_case');

  const selectedRole = useRoleStore((s) => s.selectedRole);

  // Component UI States
  const [inputVal, setInputVal] = useState('');
  const [activeTool, setActiveTool] = useState('legal_my_case');

  const handleClearAllConfirm = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to permanently delete all chat history? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const currentSessions = [...sessions];
              for (const session of currentSessions) {
                // Delete locally first
                useChatStore.getState().deleteSession(session.sessionId);
                if (session._id || session.createdAt) {
                  const { ChatService } = require('@/services/chat.service');
                  ChatService.deleteSession(session.sessionId).catch(() => {});
                }
              }
              showToast('success', 'History Cleared', 'All conversation logs removed.');
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const renderWelcomeIcon = () => {
    let iconName = 'scale-balance';
    switch (activeTool) {
      case 'legal_my_case':
        iconName = 'scale-balance';
        break;
      case 'legalResearch':
        iconName = 'book-search-outline';
        break;
      case 'contractAnalyzer':
        iconName = 'file-document-check-outline';
        break;
      case 'evidenceAnalyst':
        iconName = 'file-find-outline';
        break;
      case 'argumentBuilder':
        iconName = 'gavel';
        break;
      case 'casePredictor':
        iconName = 'trending-up';
        break;
      case 'strategyEngine':
        iconName = 'chess-knight';
        break;
      case 'researchAssistant':
        iconName = 'library';
        break;
      default:
        iconName = 'scale-balance';
    }

    return (
      <MaterialCommunityIcons
        name={iconName as any}
        size={32}
        color={theme.primary || '#111111'}
      />
    );
  };

  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [viewerAttachment, setViewerAttachment] = useState<ChatAttachment | null>(null);
  const {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  } = useAttachmentHandler();

  const handleAddAttachment = showAttachmentOptions;
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const scrollBtnScale = useRef(new Animated.Value(0.95)).current;
  const hideTimerRef = useRef<any>(null);
  const lastOffsetRef = useRef<number>(0);

  const handleScrollAction = (shouldShow: boolean) => {
    if (shouldShow) {
      if (!showScrollBtn) {
        setShowScrollBtn(true);
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) {
            setShowScrollBtn(false);
          }
        });
      }, 2500);
    } else {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      Animated.parallel([
        Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(scrollBtnScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
      ]).start((result) => {
        if (result.finished) {
          setShowScrollBtn(false);
        }
      });
    }
  };

  useEffect(() => {
    if (inputVal.trim() !== '') {
      handleScrollAction(false);
    }
  }, [inputVal]);

  // Rename Session States
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameTitleVal, setRenameTitleVal] = useState('');

  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isAtBottomRef = useRef(true);

  // Scroll Tracking states
  const shouldAutoScrollRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showFloatingScrollBtn, setShowFloatingScrollBtn] = useState(false);

  // Load chat session list on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Sync active session message list when session changes
  useEffect(() => {
    if (activeSessionId) {
      fetchSessionDetails(activeSessionId);
    }
  }, [activeSessionId]);

  // Chat message logging list
  const messagesList = useMemo(() => {
    return activeSession?.messages || [];
  }, [activeSession]);

  const isEmpty = messagesList.length === 0;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      scrollToBottom(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [messagesList.length]);

  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const userHasScrolledUpRef = useRef(false);

  const scrollToBottom = (force = false) => {
    if (shouldAutoScrollRef.current || force === true) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        shouldAutoScrollRef.current = false;
      }, 50);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 120; // 120px buffer threshold
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    setIsAtBottom(isCloseToBottom);
    isAtBottomRef.current = isCloseToBottom;
    
    if (isCloseToBottom) {
      userHasScrolledUpRef.current = false;
      setUserHasScrolledUp(false);
      setShowFloatingScrollBtn(false);
    }
  };

  const handleScrollBeginDrag = () => {
    if (!isAtBottomRef.current) {
      userHasScrolledUpRef.current = true;
      setUserHasScrolledUp(true);
    }
  };

  const prevMessagesCountRef = useRef(messagesList.length);
  useEffect(() => {
    if (messagesList.length > prevMessagesCountRef.current) {
      const lastMsg = messagesList[messagesList.length - 1];
      if (lastMsg.role === 'assistant' || lastMsg.role === 'system') {
        if (!isAtBottom) {
          setShowFloatingScrollBtn(true);
        }
      }
      prevMessagesCountRef.current = messagesList.length;
    }
  }, [messagesList, isAtBottom]);

  // Unified auto-scroll logic triggered on sends, uploads, completions, retries, etc. (NOT on every streaming token)
  useEffect(() => {
    if (messagesList.length > 0) {
      // Keep viewport pinned to the bottom if the user hasn't explicitly scrolled up
      if (!userHasScrolledUpRef.current) {
        scrollToBottom(true);
      }
    }
  }, [messagesList.length, sending, isUploading]);

  // Focus text input on load if chat is empty
  useEffect(() => {
    if (isEmpty && !loading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, loading]);
  const handleInputChange = (text: string) => {
    const wasEmpty = inputVal.trim() === '' && attachments.length === 0;
    const isEmptyNow = text.trim() === '' && attachments.length === 0;
    if (wasEmpty !== isEmptyNow) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setInputVal(text);
  };

  const getBottomPadding = () => {
    if (isKeyboardVisible) {
      return 12;
    }
    if (isFocusMode) {
      return insets.bottom > 0 ? insets.bottom : 12;
    }
    return 12;
  };

  const handleSelectSuggestedPrompt = (promptText: string) => {
    let prefill = '';
    const norm = promptText.trim().toLowerCase();
    if (norm.includes('summarize my case')) {
      prefill = 'Summarize my case: ';
    } else if (norm.includes('draft legal notice')) {
      prefill = 'Draft a professional Legal Notice for: ';
    } else if (norm.includes('analyze agreement')) {
      prefill = 'Analyze this agreement: ';
    } else if (norm.includes('find precedents')) {
      prefill = 'Find relevant precedents for: ';
    } else if (norm.includes('review evidence')) {
      prefill = 'Analyze this evidence: ';
    } else if (norm.includes('generate arguments')) {
      prefill = 'Generate a list of primary arguments supporting the claim: ';
    } else if (norm.includes('research laws')) {
      prefill = 'Search for statutory provisions and legal citations on: ';
    } else if (norm.includes('explain legal section')) {
      prefill = 'Explain this legal section: ';
    } else {
      prefill = promptText;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInputVal(prefill);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const isDraftDocument = (content?: string): boolean => {
    if (!content) return false;
    const lower = content.toLowerCase();
    
    // Drafts are substantial structured text files, so they must meet a minimum length
    if (content.length < 300) return false;
    
    // Ignore initial query requests or greeting responses that ask for inputs
    const conversationalGreetings = [
      'how can i assist',
      'how can i help',
      'please provide',
      'can you provide',
      'what is the name',
      'would you like me to'
    ];
    if (content.length < 600 && conversationalGreetings.some(kw => lower.includes(kw))) {
      return false;
    }

    // Standard structural keywords and template placeholder markers inside legal drafts
    const draftBoilerplateKeywords = [
      'between',
      'whereas',
      'hereby',
      'undersigned',
      'in witness whereof',
      'solemnly affirm',
      'petition',
      'memorandum',
      'agreement',
      'deed',
      'rent agreement',
      'lease agreement',
      'employment contract',
      'legal notice',
      'affidavit',
      'will and testament',
      'power of attorney',
      'complaint',
      'schedule a',
      'terms and conditions',
      '[name]',
      '[date]',
      '[address]',
      '_____'
    ];

    const matchesCount = draftBoilerplateKeywords.filter(kw => lower.includes(kw)).length;
    const hasStrongPlaceholder = lower.includes('[name]') || lower.includes('[date]') || lower.includes('in witness whereof') || lower.includes('solemnly affirm');

    return matchesCount >= 2 || (matchesCount >= 1 && hasStrongPlaceholder);
  };

  const hasDraftingIntent = (text: string): boolean => {
    const lower = text.toLowerCase();
    
    // Specific draft types mentioned by the user
    const draftKeywords = [
      'bail application',
      'legal notice',
      'affidavit',
      'divorce petition',
      'recovery notice',
      'employment agreement',
      'partnership deed',
      'consumer complaint',
      'rti application',
      'anticipatory bail',
      'writ petition',
      'reply notice',
      'gift deed',
      'employment contract',
      'rent agreement',
      'arbitration notice',
      'court application',
      'complaint'
    ];

    if (draftKeywords.some(keyword => lower.includes(keyword))) {
      return true;
    }

    // Verb + Document noun combination, e.g. "draft a notice", "write an agreement"
    const verbs = ['draft', 'make', 'prepare', 'create', 'generate', 'write', 'need', 'banao', 'bana do'];
    const nouns = ['notice', 'petition', 'application', 'deed', 'contract', 'agreement', 'affidavit', 'draft'];
    
    for (const verb of verbs) {
      if (lower.includes(verb)) {
        for (const noun of nouns) {
          if (lower.includes(noun)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const [isLimitReached, setIsLimitReached] = useState(false);

  // Handle message send
  const handleSend = async (overrideText?: string, unusedToolId?: string, editMessageId?: string) => {
    if (isLimitReached) {
      showToast('error', 'Limit Reached', 'Monthly AI chat limit reached. Please upgrade your plan to continue.');
      return;
    }
    const text = overrideText || inputVal.trim();
    if (!text && attachments.length === 0) return;

    // Save states for potential rollback on failure
    const originalInput = inputVal;
    const originalAttachments = [...attachments];

    let targetTool = activeTool;
    if (activeTool === 'legal_my_case' && hasDraftingIntent(text)) {
      targetTool = 'draftMaker';
      setActiveTool('draftMaker');
      // Show tool change indicator bubble
      if (activeSessionId) {
        const toolChangeMsg: ChatMessage = {
          id: `tool-change-${Date.now()}`,
          role: 'system',
          content: `Switched to Draft Maker Mode`,
          timestamp: Date.now(),
        };
        useChatStore.getState().addMessage(activeSessionId, toolChangeMsg);
      }
    }

    // Optimistic UI updates
    shouldAutoScrollRef.current = true;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!editMessageId) {
      setInputVal('');
      clearAttachments();
    }
    isAtBottomRef.current = true;
    scrollToBottom(true);

    try {
      // Pass the original local attachments to dispatchMessageStream. It will handle the upload internally.
      await dispatchMessageStream(text, targetTool, editMessageId ? [] : originalAttachments, editMessageId);
    } catch (streamErr: any) {
      console.warn('[handleSend] Stream dispatch error caught for rollback:', streamErr);
      // Roll back inputs on failure
      setInputVal(originalInput);
      setAttachments(originalAttachments);
      const errMsg = streamErr?.message || String(streamErr);
      if (errMsg.includes('LIMIT_EXCEEDED') || errMsg.includes('limit') || errMsg.includes('LIMIT') || streamErr?.status === 403) {
        setLimitModalMessage(errMsg.replace(/Error:|\[|\]/g, '').trim());
        setIsUpgradeModalOpen(true);
      } else {
        showToast('error', 'Send Failed', 'Failed to send message. Please try again.');
      }
    }
  };

  // Change specialized AI tools focus
  const handleSelectTool = (toolId: string) => {
    setActiveTool(toolId);
    const selected = AI_TOOLS.find((t) => t.id === toolId);
    const toolName = selected?.label || toolId;

    // Send divider status bubble optimistically
    if (activeSessionId) {
      const toolChangeMsg: ChatMessage = {
        id: `tool-change-${Date.now()}`,
        role: 'system',
        content: `Switched to ${toolName}`,
        timestamp: Date.now(),
      };
      chatStoreStateUpdateMessage(activeSessionId, toolChangeMsg);
    }

    showToast('info', 'Tool Switched', `Active engine updated to ${toolName}`);
  };

  // Helper workaround to inject tool logs
  const chatStoreStateUpdateMessage = (sessId: string, msg: ChatMessage) => {
    useChatStore.getState().addMessage(sessId, msg);
    scrollToBottom(true);
  };



  const handleDismissMessage = (messageId: string) => {
    const updatedMessages = messagesList.filter((m) => m.id !== messageId);
    useChatStore.getState().updateSession(activeSessionId!, { messages: updatedMessages });
  };

  const handleRetryMessage = async (errorMsg: ChatMessage) => {
    const updatedMessages = messagesList.filter((m) => m.id !== errorMsg.id);
    useChatStore.getState().updateSession(activeSessionId!, { messages: updatedMessages });
    const userMsgs = updatedMessages.filter((m) => m.role === 'user');
    if (userMsgs.length > 0) {
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      await handleSend(lastUserMsg.content);
    }
  };

  // Message Actions
  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    showToast('success', 'Copied', 'Message copied to clipboard.');
  };

  const handleShareMessage = (sessId: string) => {
    setSharingSessionId(sessId);
    setIsShareModalOpen(true);
  };

  const executeShareSession = async () => {
    if (!sharingSessionId || !shareEmail.trim()) return;
    setIsSharingLoading(true);
    try {
      const response = await require('../../services/chat.service').ChatService.shareChatViaEmail(sharingSessionId, shareEmail.trim());
      if (response.success) {
        showToast('success', 'Shared Successfully', `Transcript link sent to ${shareEmail}`);
        setIsShareModalOpen(false);
        setShareEmail('');
      } else {
        throw new Error(response.error || 'Request rejected');
      }
    } catch (err: any) {
      showToast('error', 'Sharing Failed', err.message || 'Could not send share email.');
    } finally {
      setIsSharingLoading(false);
    }
  };

  const handleLikeMessage = (msgId: string) => {
    showToast('success', 'Feedback Received', 'Thank you for your rating!');
  };

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (searchHistoryQuery.trim()) {
      list = sessions.filter((s) =>
        s.title.toLowerCase().includes(searchHistoryQuery.toLowerCase())
      );
    }
    return [...list].sort((a, b) => b.lastModified - a.lastModified);
  }, [sessions, searchHistoryQuery]);

  // Rename action handler
  const handleRenameConfirm = (sId: string) => {
    if (renameTitleVal.trim()) {
      renameChatSession(sId, renameTitleVal.trim());
      setEditingSessionId(null);
      setRenameTitleVal('');
      showToast('success', 'Session Renamed', 'Title updated successfully.');
    }
  };

  const tabHeight = 60 + (insets.bottom > 0 ? insets.bottom : 8);

  return (
    <KeyboardSafeChatLayout
      backgroundColor={theme.background}
      hasPageHeader={true}
      isFocusMode={isFocusMode}
      header={
        <PageHeader
          title={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={18} color="#C8A34D" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>
                {selectedRole === 'student' ? 'AI LEGAL TUTOR' : selectedRole === 'law_firm' ? 'AI FIRM ASSISTANT' : t('home.aiLegalAssistant')}
              </Text>
            </View>
          }
          subtitle={selectedRole === 'student' ? 'Interactive Student Legal Tutor & Concept Helper' : selectedRole === 'law_firm' ? 'Enterprise AI Managing Partner & Law Firm OS' : t('assistant.welcome')}
          hideNotifications={true}
          rightActions={[
            <Pressable
              key="new-chat"
              onPress={() => {
                //@ts-ignore
                startNewSession();
                showToast('info', t('assistant.newChat'), 'A new conversation has been created.');
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityLabel="Start New Chat"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={24} color={theme.textPrimary} />
            </Pressable>,
            <Pressable
              key="history"
              onPress={() => setIsHistoryOpen(true)}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityLabel="Open history sidebar"
              accessibilityRole="button"
            >
              <Ionicons name="time-outline" size={24} color={theme.textPrimary} />
            </Pressable>
          ]}
        />
      }
      messages={
        loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('common.loading')}</Text>
          </View>
        ) : isEmpty ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyLogoContainer}>
              <Image 
                source={require('@/assets/icons/logo-transpernt.png.png')} 
                style={{ width: 140, height: 140, marginBottom: -8 }} 
                resizeMode="contain" 
              />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {selectedRole === 'student' ? 'AI LEGAL TUTOR' : selectedRole === 'law_firm' ? 'AI Firm Assistant' : t('home.aiLegalAssistant')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {selectedRole === 'student'
                  ? 'Ask any law concept, exam question, bare act clause or study doubt.'
                  : selectedRole === 'law_firm'
                  ? 'Ask your AI Managing Partner for firm guidance, case reviews, client drafts, workload management & operational intelligence.'
                  : 'Ask any litigation query, precedent search, FIR drafting or court preparation advice.'}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messagesList}
              keyExtractor={(item) => item.id}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
            renderItem={({ item }) => {
              if (item.role === 'system') {
                return (
                  <View style={styles.systemMsgContainer}>
                    <View style={styles.systemMsgPill}>
                      <Text style={styles.systemMsgText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }
              return (
                <View key={item.id}>
                  <ChatMessageBubble
                    message={item}
                    onCopy={() => handleCopyMessage(item.content)}
                    onShare={activeSessionId ? () => handleShareMessage(activeSessionId) : undefined}
                    onRegenerate={() => handleSend(item.content)}
                    onCitationPress={(src) => showToast('info', 'Citation Opened', src.title)}
                    onExport={() => showToast('success', 'Export', 'Transcript exported to PDF successfully.')}
                    onDownload={() => showToast('success', 'Download', 'Document downloaded successfully.')}
                    onEditMessage={(msgId, newText) => handleSend(newText, undefined, msgId)}
                    onRetry={() => handleRetryMessage(item)}
                    onDismiss={() => handleDismissMessage(item.id)}
                    onAttachmentPress={async (attach) => {
                      const isPdf = attach.type?.includes('pdf') || attach.name?.endsWith('.pdf');
                      if (isPdf) {
                        if (attach.url) {
                          const WebBrowser = require('expo-web-browser');
                          await WebBrowser.openBrowserAsync(attach.url);
                        }
                      } else {
                        setViewerAttachment(attach);
                      }
                    }}
                  />
                  {item.role === 'model' && activeTool === 'draftMaker' && isDraftDocument(item.content) ? (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#C8A34D',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        alignSelf: 'flex-start',
                        marginTop: 4,
                        marginBottom: 12,
                        marginLeft: 40,
                        gap: 6
                      }}
                      onPress={async () => {
                        try {
                          await AsyncStorage.setItem('pending_ai_draft', item.content);
                          router.push('/(tabs)/tools/draft-maker');
                          showToast('success', 'Draft Saved', 'Opening Draft Maker...');
                        } catch (e) {
                          console.warn('AsyncStorage error:', e);
                        }
                      }}
                    >
                      <Ionicons name="create-outline" size={14} color="#111111" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Load into Draft Workspace</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }}
            ListFooterComponent={() => null}
            contentContainerStyle={styles.listContent}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScroll={(e) => {
              handleScroll(e);
              const offset = e.nativeEvent.contentOffset.y;
              const contentHeight = e.nativeEvent.contentSize.height;
              const layoutHeight = e.nativeEvent.layoutMeasurement.height;
              const distanceFromBottom = contentHeight - (offset + layoutHeight);
              isAtBottomRef.current = distanceFromBottom <= 50;
              
              const isScrollingUp = offset < lastOffsetRef.current;
              lastOffsetRef.current = offset;

              if (distanceFromBottom <= 50) {
                handleScrollAction(false);
              } else {
                const shouldShow = isScrollingUp && 
                                   distanceFromBottom > 100 && 
                                   messagesList.length > 4 && 
                                   inputVal.trim() === '' && 
                                   !loading;
                handleScrollAction(shouldShow);
              }
            }}
            onContentSizeChange={(contentWidth, contentHeight) => {
              if (isAtBottomRef.current && !userHasScrolledUpRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (isAtBottomRef.current && !userHasScrolledUpRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
          {showFloatingScrollBtn && (
            <Pressable
              style={styles.floatingScrollBtn}
              onPress={() => {
                scrollToBottom(true);
                setShowFloatingScrollBtn(false);
              }}
            >
              <Text style={styles.floatingScrollBtnText}>New Response ↓</Text>
            </Pressable>
          )}
        </View>
      )
      }
      scrollBtn={
        showScrollBtn && (
          <Animated.View
            style={[
              styles.scrollDownBtn,
              {
                opacity: scrollBtnOpacity,
                transform: [{ scale: scrollBtnScale }]
              }
            ]}
          >
            <Pressable
              onPress={() => {
                handleScrollAction(false);
                scrollToBottom(true);
              }}
              style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="arrow-down" size={18} color="#000000" />
            </Pressable>
          </Animated.View>
        )
      }
      attachments={
        attachments.length > 0 && (
          <View style={styles.attachmentBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentScrollContent}>
              {attachments.slice(0, 5).map((a, i) => {
                const isImage = a.type?.startsWith('image/');
                return (
                  <View key={i} style={[styles.attachChip, { backgroundColor: theme.surfaceVariant || '#F3F4F6', borderColor: theme.border || '#E5E7EB' }]}>
                    {isImage ? (
                      <Image source={{ uri: a.url }} style={styles.attachThumbnail} />
                    ) : (
                      <View style={[styles.attachThumbnail, styles.attachPdfIconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="document-text" size={22} color="#EF4444" />
                      </View>
                    )}
                    <View style={styles.attachTextContainer}>
                      <Text style={[styles.attachLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text style={styles.attachSizeLabel} numberOfLines={1}>
                        {a.size ? `${(a.size / (1024 * 1024)).toFixed(1)} MB` : 'File'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.attachRemoveBtn}
                      onPress={() => handleRemoveAttachment(a.name)}
                      accessibilityLabel={`Remove ${a.name}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                );
              })}
              {attachments.length > 5 && (
                <View style={[styles.attachChip, styles.attachMoreChip, { backgroundColor: theme.surfaceVariant || '#F3F4F6', borderColor: '#C8A34D' }]}>
                  <Text style={[styles.attachMoreText, { color: '#C8A34D' }]}>
                    +{attachments.length - 5} more
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )
      }
      composer={
        <View style={{ width: '100%' }}>
          <ChatUsageAwarenessBanner onLimitReachedStateChange={setIsLimitReached} />
          <ChatComposer
            ref={inputRef}
            value={inputVal}
            onChangeText={setInputVal}
            onSend={(text) => handleSend(text)}
            sending={sending || isUploading}
            onCancelStream={cancelMessageStream}
            onAddAttachment={handleAddAttachment}
            onPressSparkles={() => setIsToolPickerOpen(true)}
            placeholder={
              selectedRole === 'student'
                ? 'Ask your AI Legal Tutor...'
                : selectedRole === 'law_firm'
                ? 'Ask AI Firm Assistant...'
                : 'Ask AI Legal Assistant...'
            }
            simulatedVoiceText="What are the legal precedents for easement rights in tenant disputes?"
            isFocusMode={isFocusMode}
            tabHeight={tabHeight}
          />
        </View>
      }
    >

      {/* Sliding Sidebar History modal drawer */}
      <Modal
        visible={isHistoryOpen}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Semi-transparent blur backdrop */}
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />

          {/* Sidebar Drawer container */}
          <View style={styles.drawerContainer}>
            <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 44) : 0, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }}>
              <View style={styles.drawerHeader}>
                <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>{t('assistant.history')}</Text>
                {filteredSessions.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAllConfirm}
                    style={{
                      marginLeft: 'auto',
                      marginRight: 16,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: theme.danger + '15',
                    }}
                  >
                    <Text style={{ color: theme.danger, fontSize: 12, fontWeight: 'bold' }}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </Pressable>
              </View>

              <Pressable
                style={[styles.drawerNewChatBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  startNewSession();
                  setIsHistoryOpen(false);
                  showToast('info', t('assistant.newChat'), 'A new conversation has been created.');
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.drawerNewChatBtnText}>{t('assistant.newChat')}</Text>
              </Pressable>

              <View style={[styles.drawerSearchContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  placeholder={t('common.search')}
                  placeholderTextColor={theme.placeholder}
                  value={searchHistoryQuery}
                  onChangeText={setSearchHistoryQuery}
                  style={[styles.drawerSearchInput, { color: theme.textPrimary }]}
                />
              </View>

              <ScrollView style={styles.drawerList}>
                {filteredSessions.length === 0 ? (
                  <Text style={[styles.drawerEmptyText, { color: theme.textMuted }]}>{t('cases.nothingScheduled')}</Text>
                ) : (
                  filteredSessions.map((item) => (
                    <View
                      key={item.sessionId}
                      style={[
                        styles.drawerItem,
                        { borderBottomColor: theme.divider },
                        activeSessionId === item.sessionId && [styles.drawerItemActive, { backgroundColor: theme.primaryLight }],
                      ]}
                    >
                      <Pressable
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}
                        onPress={() => {
                          setActiveSessionId(item.sessionId);
                          setIsHistoryOpen(false);
                        }}
                      >
                        <Ionicons
                          name="chatbox-ellipses-outline"
                          size={16}
                          color={activeSessionId === item.sessionId ? theme.primary : theme.textSecondary}
                          style={{ marginRight: 10 }}
                        />

                        {editingSessionId === item.sessionId ? (
                          <TextInput
                            style={[styles.drawerRenameInput, { color: theme.textPrimary, borderColor: theme.primary }]}
                            value={renameTitleVal}
                            onChangeText={setRenameTitleVal}
                            autoFocus={true}
                            onBlur={() => handleRenameConfirm(item.sessionId)}
                            onSubmitEditing={() => handleRenameConfirm(item.sessionId)}
                          />
                        ) : (
                          <View style={styles.drawerItemTextContainer}>
                            <Text
                              style={[
                                styles.drawerItemText,
                                { color: theme.textPrimary },
                                activeSessionId === item.sessionId && [styles.drawerItemTextActive, { color: theme.primary }],
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text style={[styles.drawerItemSubtext, { color: theme.textMuted }]}>
                              {new Date(item.lastModified).toLocaleDateString()} at {new Date(item.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 6 }}>
                        <Pressable
                          onPress={() => {
                            setEditingSessionId(item.sessionId);
                            setRenameTitleVal(item.title);
                          }}
                          style={styles.drawerActionIcon}
                        >
                          <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            deleteChatSession(item.sessionId);
                            showToast('success', 'Conversation Deleted', 'Logs removed.');
                          }}
                          style={styles.drawerActionIcon}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share conversation Link Modal */}
      <Modal
        visible={isShareModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsShareModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('assistant.share')}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Send full dialogue logs directly to email address:</Text>

            <TextInput
              placeholder="recipient@example.com"
              placeholderTextColor={theme.placeholder}
              value={shareEmail}
              onChangeText={setShareEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setIsShareModalOpen(false)}
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: theme.surfaceVariant }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                onPress={executeShareSession}
                style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: theme.primary }]}
                disabled={isSharingLoading}
              >
                {isSharingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{t('assistant.send')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ChatGPT-Style Monthly Limit Exceeded Upgrade Modal Sheet */}
      <Modal
        visible={isUpgradeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsUpgradeModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsUpgradeModalOpen(false)}>
          <View style={[styles.bottomSheetOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card, paddingBottom: 36 }, Shadows.modal]}>
                <View style={[styles.bottomSheetDragHandle, { backgroundColor: theme.border }]} />
                
                <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(234, 179, 8, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="sparkles" size={32} color="#EAB308" />
                  </View>
                  
                  <Text style={{ fontSize: 21, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                    Monthly AI Limit Reached
                  </Text>
                  
                  <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24, paddingHorizontal: 8 }}>
                    {limitModalMessage || "You've used all AI Chat Assistant queries included in your plan for this month. Upgrade your plan to get higher limits or unlimited access."}
                  </Text>

                  <TouchableOpacity
                    style={{
                      width: '100%',
                      backgroundColor: '#EAB308',
                      paddingVertical: 15,
                      borderRadius: 14,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                      shadowColor: '#EAB308',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 4
                    }}
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsUpgradeModalOpen(false);
                      router.push('/profile/billing' as any);
                    }}
                  >
                    <Ionicons name="arrow-up-circle" size={20} color="#000000" />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#000000' }}>Upgrade Plan Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ paddingVertical: 10 }}
                    onPress={() => setIsUpgradeModalOpen(false)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted }}>Maybe Later</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* AI Actions Selector Bottom Sheet Modal */}
      <Modal
        visible={isToolPickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsToolPickerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsToolPickerOpen(false)}>
          <View style={[styles.bottomSheetOverlay, { backgroundColor: theme.overlay }]}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }, Shadows.modal]}>
                <View style={[styles.bottomSheetDragHandle, { backgroundColor: theme.border }]} />
                <View style={[styles.bottomSheetHeader, { borderBottomColor: theme.border, alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>AI Actions</Text>
                    <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary, marginTop: 4 }]}>
                      Quick legal actions for the current conversation.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsToolPickerOpen(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                  {AI_ACTIONS_CATEGORIES.map((category, catIdx) => (
                    <View key={catIdx} style={{ marginBottom: 20 }}>
                      <Text style={[styles.categoryHeading, { color: theme.primary }]}>
                        {category.title}
                      </Text>
                      <View style={styles.actionGridContainer}>
                        {category.actions.map((action) => (
                          <TouchableOpacity
                            key={action.id}
                            style={[
                              styles.actionGridItem,
                              {
                                backgroundColor: theme.surfaceVariant || theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              const prompt = getPromptText(action.id, activeCaseName);
                              setIsToolPickerOpen(false);
                              handleSend(prompt);
                            }}
                          >
                            <Text style={styles.actionIcon}>{action.icon}</Text>
                            <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                              {action.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <View style={{ height: 30 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal
        visible={isCameraVisible}
        onClose={hideCamera}
        onConfirm={handleCameraConfirm}
      />

      <Modal
        visible={!!viewerAttachment}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerAttachment(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Top Toolbar */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.15)',
            }}>
              <TouchableOpacity onPress={() => setViewerAttachment(null)} style={{ padding: 6 }}>
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
                {viewerAttachment?.name}
              </Text>

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity 
                  onPress={async () => {
                    if (viewerAttachment?.url) {
                      try {
                        await Sharing.shareAsync(viewerAttachment.url);
                      } catch (e) {
                        showToast('error', 'Error', 'Failed to share image');
                      }
                    }
                  }} 
                  style={{ padding: 6 }}
                >
                  <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={async () => {
                    if (viewerAttachment?.url) {
                      try {
                        showToast('info', 'Downloading...', 'Downloading image attachment...');
                        
                        let localUri = viewerAttachment.url;
                        const isRemote = viewerAttachment.url.startsWith('http');
                        
                        if (isRemote) {
                          const filename = viewerAttachment.name || `image_${Date.now()}.jpg`;
                          const downloadPath = `${FileSystem.cacheDirectory}${filename}`;
                          const result = await FileSystem.downloadAsync(viewerAttachment.url, downloadPath);
                          localUri = result.uri;
                        }

                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(localUri);
                          showToast('success', 'Downloaded', 'Image ready to save or share.');
                        } else {
                          showToast('error', 'Error', 'Sharing not available on this device');
                        }
                      } catch (e) {
                        console.warn('[Viewer] download error:', e);
                        showToast('error', 'Error', 'Failed to download image');
                      }
                    }
                  }} 
                  style={{ padding: 6 }}
                >
                  <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Image Containment area with ScrollView for pinch zoom */}
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              maximumZoomScale={4.0}
              minimumZoomScale={1.0}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              {viewerAttachment?.url && (
                <Image
                  source={{ uri: viewerAttachment.url }}
                  style={{
                    width: Dimensions.get('window').width,
                    height: Dimensions.get('window').height - 120,
                  }}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </KeyboardSafeChatLayout>
  );
}

const styles = StyleSheet.create({
  floatingScrollBtn: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#C8A34D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 9999,
  },
  floatingScrollBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  toolBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
  },
  toolScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  toolChipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  toolLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  toolLabelActive: {
    color: '#FFFFFF',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  scrollDownBtn: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    marginLeft: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  attachmentBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  attachmentScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    width: 180,
    height: 60,
    position: 'relative',
    marginRight: 8,
    borderWidth: 1,
  },
  attachThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  attachPdfIconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachTextContainer: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    paddingRight: 16,
  },
  attachLabel: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  attachSizeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  attachRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  attachMoreChip: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  attachMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  composerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 26,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  leftIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginRight: 2,
  },
  innerOptionBtn: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 140,
  },
  innerActionBtnTouchTarget: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  innerSendCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerStopCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 10,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
    gap: 6,
  },
  drawerNewChatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  drawerList: {
    flex: 1,
  },
  drawerEmptyText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: '#F5F5F5',
  },
  drawerItemTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#5B4EDB',
    fontWeight: '700',
  },
  drawerItemSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  drawerRenameInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    padding: 0,
  },
  drawerActionIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnConfirm: {
    backgroundColor: '#111111',
    minWidth: 90,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  systemMsgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  systemMsgPill: {
    backgroundColor: '#F5F5F5',
    borderColor: '#ECECEC',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  systemMsgText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    width: '100%',
    height: height * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bottomSheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  bottomSheetClose: {
    padding: 4,
  },
  bottomSheetContent: {
    flex: 1,
  },
  toolListContainer: {
    gap: 10,
  },
  toolListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#F9FAFB',
  },
  toolListItemActive: {
    borderColor: '#111111',
    backgroundColor: '#F5F5F5',
  },
  toolListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  toolListIcon: {
    fontSize: 20,
  },
  toolListItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  toolListItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  toolListItemDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingTop: height * 0.08,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emptyLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emptySparkleBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  emptySparkleText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  suggestionsContainer: {
    width: '100%',
    maxWidth: 500,
    marginTop: 10,
  },
  suggestionsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionCardIcon: {
    fontSize: 20,
  },
  suggestionCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  suggestionCardDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickActionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#111111',
  },
  recordingComposerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 26,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 52,
  },
  previewComposerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 26,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 52,
  },
  voiceControlBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    minWidth: 42,
  },
  recordingIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  voiceStopBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStopCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStopSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  voicePlayPauseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  previewDurationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
    minWidth: 42,
  },
  waveformBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 32,
    flex: 1,
    marginHorizontal: 12,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  bottomSheetSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
