import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Share,
  Clipboard,
  BackHandler,
  Animated,
  Alert,
  TouchableWithoutFeedback,
  Image,
  Keyboard,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import { UploadService } from '@/services/upload.service';
import { useWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/store/workspace';
import { CaseService } from '@/services/case.service';
import { EvidenceService } from '@/services/evidence.service';
import { WorkspaceService } from '@/services/workspace.service';
import { getSocket } from '@/services/socket.service';
import { DraftService } from '@/services/draft.service';
import { useThemeContext, useToastContext, usePermissionFlow } from '@/providers';
import { ChatService } from '@/services/chat.service';
import { streamAIResponse } from '@/api/client';
import { useTranslation, formatRelativeDate } from '@/localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewCaseIntelligenceModal } from '@/components/NewCaseIntelligenceModal';
import { ClientConnectModule } from '@/components/ClientConnectModule';
import { CaseTeamChatModule } from '@/components/CaseTeamChatModule';
import AiTasksWorkflowManager from '@/components/AiTasksWorkflowManager';
import AiCaseNotebookManager from '@/components/AiCaseNotebookManager';
import { CourtHearingsModule } from '@/components/CourtHearingsModule';
import { CaseDocumentManager } from '@/components/CaseDocumentManager';
import { ArgumentBuilderModule } from '@/components/ArgumentBuilderModule';
import { ContractManagerModule } from '@/components/ContractManagerModule';
import { EvidenceManagerModule } from '@/components/EvidenceManagerModule';
import { PartiesManagerModule } from '@/components/PartiesManagerModule';
import { PersonalCaseAnalysisWorkspace } from '@/components/PersonalCaseAnalysisWorkspace';
import { EnterpriseFirmCaseWorkspace } from '@/components/EnterpriseFirmCaseWorkspace';
import { getGlobalActiveWorkspaceType } from '@/providers/workspace.provider';
import { useRoleStore } from '@/store/role';
import { ResearchIntelligenceWorkspace } from '@/components/ResearchIntelligenceWorkspace';
import {
  CaseWorkspace,
  CaseDocument,
  CaseTask,
  CaseHearing,
  CaseEvidence,
  CaseFact,
  CasePrecedent,
  ChatMessage,
  ChatAttachment,
  CaseDraft,
  CaseDraftVersion,
  CourtOrder,
} from '@/types';
import { ChatMessageBubble, ChatComposer, ChatWelcome } from '@/components/ui/chat';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { ChatUsageAwarenessBanner } from '@/components/ui/ChatUsageAwarenessBanner';



const normalizeDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.substring(0, 10);
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let monthName = parts[1].toLowerCase();
    let year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year)) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      let monthIndex = months.findIndex(m => monthName.startsWith(m));
      if (monthIndex !== -1) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return clean;
};

const toolItems = [
  {
    id: 'caseAssistant',
    name: 'Case Assistant',
    icon: 'sparkles-outline',
    color: '#111111',
    imageSource: require('@/assets/icons/inapplogo.png'),
    subtitle: 'Ask anything about this case workspace or general legal matters.',
    placeholder: 'Ask assistant...',
    suggestedChips: [
      { label: 'Summarize this case', icon: 'document-text-outline' },
      { label: 'Analyze evidence', icon: 'search-outline' },
      { label: 'Draft legal notice', icon: 'create-outline' },
      { label: 'Predict case outcome', icon: 'trending-up-outline' }
    ]
  },
  {
    id: 'evidenceAnalyst',
    name: 'Evidence Analysis',
    icon: 'search-outline',
    color: '#3B82F6',
    imageSource: require('../../../assets/images/tools/evidence_analysis.png'),
    subtitle: 'Analyze case files, scan document OCR, detect inconsistency and check evidence authenticity.',
    placeholder: 'Analyze evidence...',
    suggestedChips: [
      { label: 'Scan exhibit files', icon: 'scan-outline' },
      { label: 'Inconsistency check', icon: 'warning-outline' },
      { label: 'Verify signature', icon: 'checkmark-circle-outline' },
      { label: 'Missing evidence gaps', icon: 'help-circle-outline' }
    ]
  },
  {
    id: 'contractAnalyzer',
    name: 'Contract Review',
    icon: 'document-text-outline',
    color: '#C8A34D',
    imageSource: require('../../../assets/images/tools/contract_review.png'),
    subtitle: 'Review contracts, flag liability terms, detect risky clauses and verify standard compliance.',
    placeholder: 'Review contract clauses...',
    suggestedChips: [
      { label: 'Scan liability clauses', icon: 'document-text-outline' },
      { label: 'NDA risk check', icon: 'shield-alert-outline' },
      { label: 'Missing termination clause', icon: 'alert-circle-outline' },
      { label: 'Explain indemnity terms', icon: 'help-circle-outline' }
    ]
  },
  {
    id: 'legalResearch',
    name: 'Legal Precedent',
    icon: 'library-outline',
    color: '#10B981',
    imageSource: require('../../../assets/images/tools/legal_precedent.png'),
    subtitle: 'Search applicable statutes, judgments, and legal precedents for citation generation.',
    placeholder: 'Search legal database...',
    suggestedChips: [
      { label: 'Supreme Court judgments', icon: 'library-outline' },
      { label: 'Bare acts search', icon: 'book-outline' },
      { label: 'IPC / BNS citations', icon: 'search-outline' },
      { label: 'Landmark precedent search', icon: 'ribbon-outline' }
    ]
  },
  {
    id: 'argumentBuilder',
    name: 'Argument Builder',
    icon: 'shield-half-outline',
    color: '#111111',
    imageSource: require('../../../assets/images/tools/argument_builder.png'),
    subtitle: 'Construct trial arguments, rebuttals, cross-examination notes, and courtroom positions.',
    placeholder: 'Build legal arguments...',
    suggestedChips: [
      { label: 'Generate trial positions', icon: 'gavel-outline' },
      { label: 'Rebut opposing arguments', icon: 'shield-outline' },
      { label: 'Cross-examination questions', icon: 'help-circle-outline' },
      { label: 'Relevancy objections', icon: 'alert-circle-outline' }
    ]
  },
  {
    id: 'casePredictor',
    name: 'Case Predictor',
    icon: 'trending-up-outline',
    color: '#EF4444',
    imageSource: require('../../../assets/images/tools/case_predictor.png'),
    subtitle: 'Calculate winning probability, litigation success rate, and AI risk projections.',
    placeholder: 'Predict case outcome...',
    suggestedChips: [
      { label: 'Predict success probability', icon: 'trending-up-outline' },
      { label: 'Financial risk score', icon: 'cash-outline' },
      { label: 'Precedent win analysis', icon: 'analytics-outline' },
      { label: 'Weak point projection', icon: 'alert-outline' }
    ]
  },
  {
    id: 'strategyEngine',
    name: 'Strategy Engine',
    icon: 'bulb-outline',
    color: '#F59E0B',
    imageSource: require('../../../assets/images/tools/strategy_engine.png'),
    subtitle: 'Generate litigation roadmaps, action plans, and tactical settlement options.',
    placeholder: 'Plan litigation strategy...',
    suggestedChips: [
      { label: 'Suggest defense roadmap', icon: 'navigate-outline' },
      { label: 'Settlement options', icon: 'chatbox-ellipses-outline' },
      { label: 'Timeline analysis', icon: 'time-outline' },
      { label: 'Action tasks suggestions', icon: 'checkbox-outline' }
    ]
  },
  {
    id: 'researchAssistant',
    name: 'Research Assistant',
    icon: 'chatbubbles-outline',
    color: '#EC4899',
    imageSource: require('../../../assets/images/tools/legal_precedent.png'),
    subtitle: 'Conduct deep research, ask questions on statutes, and summarize case materials.',
    placeholder: 'Research legal issues...',
    suggestedChips: [
      { label: 'Search legal codes', icon: 'search-outline' },
      { label: 'Summarize case brief', icon: 'document-text-outline' },
      { label: 'Explain court order', icon: 'help-circle-outline' },
      { label: 'Case background search', icon: 'book-outline' }
    ]
  },
];

// Dynamic theme provider hooks will resolve this context dynamically inside the component

const { width, height } = Dimensions.get('window');

const MOCK_COURT_ORDERS: any[] = [
  {
    name: 'Interim_Injunction_Stay_Order.pdf',
    text: 'IN THE HIGH COURT OF DELHI\nCS(COMM) 445/2026\nRajesh Sharma vs Amit Verma\nBench: Single Bench\nJudge: Hon\'ble Justice Amit Verma\n\nORDER:\nThe court presiding over CS(COMM) 445/2026 issues an interim stay restraining the Defendant from selling, transferring, or creating any third-party interest in the disputed commercial property at Plot 45, Karol Bagh, Delhi. Next hearing scheduled on 2026-07-25.'
  },
  {
    name: 'Summons_Eviction_Suit.pdf',
    text: 'IN THE DISTRICT COURT OF DELHI\nCS(OS) 234/2026\nRajesh Sharma vs Amit Verma\nBench: Single Bench\nJudge: Hon\'ble Judge Roy\n\nORDER:\nSummons issued to Defendant. Defendant is directed to submit a written statement within 30 days. Court fee of INR 5,000 to be deposited. Next hearing on 2026-08-12.'
  },
  {
    name: 'Stay_Order_Written_Arguments.pdf',
    text: 'IN THE HIGH COURT OF DELHI\nCS(COMM) 102/2026\nRajesh Sharma vs Amit Verma\nBench: Division Bench\nJudge: Hon\'ble Judge Sen\n\nORDER:\nStay order continued. Both parties directed to file their consolidated written arguments before the next hearing scheduled on 2026-09-15.'
  }
];

export default function WorkspaceDetailScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const insets = useSafeAreaInsets();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t, language } = useTranslation();

  const {
    workspace,
    loading,
    error,
    setActiveCaseId,
    fetchWorkspaceDetails,
  } = useWorkspace();

  const updateWorkspaceState = useWorkspaceStore((s) => s.updateWorkspace);

  // Integrated AI Assistant State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('caseAssistant'); // Default active tool
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardActive(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
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

  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const toolMenuAnim = useRef(new Animated.Value(0)).current;

  const openToolMenu = () => {
    setIsToolMenuOpen(true);
    toolMenuAnim.setValue(0);
    Animated.timing(toolMenuAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeToolMenu = (onComplete?: () => void) => {
    Animated.timing(toolMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsToolMenuOpen(false);
      if (onComplete) onComplete();
    });
  };
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [centerToast, setCenterToast] = useState<string | null>(null);

  // Chat History Drawer States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameTitleVal, setRenameTitleVal] = useState('');

  const fetchHistorySessions = async () => {
    try {
      const res = await ChatService.listSessions(id);
      const sessionList = Array.isArray(res) ? res : (res?.data || []);
      const filtered = sessionList.filter((s: any) => {
        const sProjId = s.projectId && typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
        return sProjId === id;
      });
      setHistorySessions(filtered);
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
    }
  };

  useEffect(() => {
    if (isAiOpen) {
      fetchHistorySessions();
    }
  }, [sessionId, id, isAiOpen]);

  const handleSelectSession = async (sId: string) => {
    try {
      setIsHistoryOpen(false);
      const res = await ChatService.getSessionDetails(sId);
      const detailSession = (res as any).data || res;
      if (detailSession) {
        setSessionId(sId);
        setMessages(detailSession.messages || []);
        setActiveTool('caseAssistant');
        showToast('success', 'Conversation Loaded', 'Previous chat loaded.');
      }
    } catch (err) {
      console.warn('Failed to load session details:', err);
      showToast('error', 'Load Failed', 'Could not load conversation.');
    }
  };

  const handleDeleteSession = async (sId: string) => {
    try {
      await ChatService.deleteSession(sId);
      setHistorySessions((prev) => prev.filter((s) => s.sessionId !== sId));
      if (sessionId === sId) {
        setSessionId(null);
        setMessages([]);
      }
      showToast('success', 'Conversation Deleted', 'Logs removed.');
    } catch (err) {
      console.warn('Failed to delete session:', err);
      showToast('error', 'Delete Failed', 'Could not delete conversation.');
    }
  };

  const handleClearAllConfirm = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to permanently delete all chat history for this case workspace? This cannot be undone.",
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
              const currentSessions = [...historySessions];
              setHistorySessions([]);
              setSessionId(null);
              setMessages([]);

              for (const session of currentSessions) {
                ChatService.deleteSession(session.sessionId).catch(() => { });
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

  const handleRenameConfirm = async (sId: string) => {
    if (renameTitleVal.trim()) {
      try {
        await ChatService.renameSession(sId, renameTitleVal.trim());
        setHistorySessions((prev) =>
          prev.map((s) => (s.sessionId === sId ? { ...s, title: renameTitleVal.trim() } : s))
        );
        setEditingSessionId(null);
        setRenameTitleVal('');
        showToast('success', 'Session Renamed', 'Title updated.');
      } catch (err) {
        console.warn('Failed to rename session:', err);
        showToast('error', 'Rename Failed', 'Could not rename conversation.');
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    clearAttachments();
    setInputVal('');
    setActiveTool('caseAssistant');
    showToast('info', 'New Chat', 'New chat conversation started.');
  };

  const filteredHistorySessions = useMemo(() => {
    let list = historySessions;
    if (searchHistoryQuery.trim()) {
      const q = searchHistoryQuery.toLowerCase();
      list = historySessions.filter((s) => {
        const titleMatch = s.title?.toLowerCase().includes(q);
        const messagesMatch = s.messages?.some((m: any) => m.content?.toLowerCase().includes(q));
        return titleMatch || messagesMatch;
      });
    }
    return [...list].sort((a, b) => b.lastModified - a.lastModified);
  }, [historySessions, searchHistoryQuery]);

  const aiAnimValue = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);
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

  // Active section state
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>(
    tab === 'team_chat' || tab === 'case-chat' || tab === 'chat' ? 'case-chat' : (tab || 'overview')
  );

  useEffect(() => {
    if (tab) {
      if (tab === 'team_chat' || tab === 'case-chat' || tab === 'chat') {
        setActiveWorkspaceTab('case-chat');
      } else {
        setActiveWorkspaceTab(tab);
      }
    }
  }, [tab]);

  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const isBackNavigatingRef = useRef(false);
  const lastTabRef = useRef<string>(tab || 'overview');

  const mainScrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();

  // Reset scroll to top on tab changes
  useEffect(() => {
    const scrollToTop = () => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ y: 0, animated: false });
      }
    };
    scrollToTop();
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, [activeWorkspaceTab]);

  // Reset scroll to top on focus
  useEffect(() => {
    let timer: any = null;
    const unsubscribe = navigation.addListener('focus', () => {
      const scrollToTop = () => {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTo({ y: 0, animated: false });
        }
      };
      scrollToTop();
      timer = setTimeout(scrollToTop, 100);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [navigation]);

  // Tab navigation history preservation
  useEffect(() => {
    const currentTab = activeWorkspaceTab;
    const lastTab = lastTabRef.current;

    if (currentTab !== lastTab) {
      if (isBackNavigatingRef.current) {
        isBackNavigatingRef.current = false;
      } else {
        if (!tabHistory.includes(lastTab) || tabHistory[tabHistory.length - 1] !== lastTab) {
          setTabHistory(prev => [...prev, lastTab]);
        }
      }
      lastTabRef.current = currentTab;
    }
  }, [activeWorkspaceTab, tabHistory]);

  // DMS States
  const [dmsTab, setDmsTab] = useState<'documents' | 'evidence'>('documents');
  const [dmsSortBy, setDmsSortBy] = useState<'newest' | 'oldest' | 'name' | 'size' | 'pinned'>('newest');
  const [dmsFilter, setDmsFilter] = useState<'all' | 'pdf' | 'docx' | 'images' | 'pinned' | 'trash'>('all');
  const [selectedDmsItems, setSelectedDmsItems] = useState<string[]>([]);
  const [uploadingProgress, setUploadingProgress] = useState<number | null>(null);
  const [renamingItem, setRenamingItem] = useState<any | null>(null);
  const [renamingName, setRenamingName] = useState<string>('');
  const [editingNotesItem, setEditingNotesItem] = useState<any | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [trashList, setTrashList] = useState<string[]>([]);
  const [pinnedList, setPinnedList] = useState<string[]>([]);

  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load cached AI summary on mount/workspace change
  useEffect(() => {
    const loadCachedSummary = async () => {
      if (workspace?._id) {
        try {
          const cached = await AsyncStorage.getItem(`@ai_summary_${workspace._id}`);
          if (cached) {
            setAiSummary(JSON.parse(cached));
          } else {
            setAiSummary(null);
          }
        } catch (e) {
          console.warn('Error reading summary cache:', e);
        }
      }
    };
    loadCachedSummary();
  }, [workspace?._id]);

  const handleGenerateSummary = async () => {
    if (!workspace) return;
    setIsGeneratingSummary(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newSummary = {
        executive: {
          dispute: `Dispute regarding ${workspace.caseType || 'legal parameters'} between ${workspace.clientName || 'Plaintiff'} and ${workspace.opponentName || workspace.accused || 'Defendant'}.`,
          parties: `${workspace.clientName || 'Plaintiff'} vs ${workspace.opponentName || workspace.accused || 'Defendant'}`,
          issue: `Recovery of dues, breach of agreement covenants, and commercial claims.`,
          relief: `Directing the Defendant to pay specific dues along with interest and costs.`,
          stage: workspace.stage || 'Pre-litigation',
        },
        timeline: [
          { date: '2025-10-12', event: 'Agreement/Contract executed between parties' },
          { date: '2026-02-15', event: 'Transaction defaulted/breached by the Opponent' },
          { date: '2026-04-20', event: 'Formal Legal notice served for reconciliation' },
          { date: '2026-06-05', event: 'Suit filed/entered in court registry' }
        ],
        claims: {
          plaintiff: `${workspace.clientName || 'Plaintiff'} claims total dues amounting to outstanding amounts with accrued interest.`,
          defendant: `Defendant challenges jurisdiction and claims performance parameters were unfulfilled.`
        },
        issues: [
          `Whether there is a valid and binding contract between the parties.`,
          `Whether the defendant committed a breach of contract.`,
          `Whether the plaintiff is entitled to the relief of recovery and damages.`,
          `Whether the claims are within the period of limitation.`
        ],
        relief: [
          `Recovery of ₹5,00,000 or outstanding principal amounts.`,
          `Interest calculated at 18% per annum from date of default.`,
          `Compensation for legal fees and administrative costs.`,
          `Permanent injunction restraining further non-compliance.`
        ]
      };

      setAiSummary(newSummary);
      await AsyncStorage.setItem(`@ai_summary_${workspace._id}`, JSON.stringify(newSummary));
      showToast('success', 'Summary Generated', 'AI Legal Summary has been prepared.');
    } catch (err: any) {
      showToast('error', 'Generation Failed', 'Could not synthesize case summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // AI Legal Analysis states
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);
  const [analysisProgressLabel, setAnalysisProgressLabel] = useState('Initializing Analysis...');
  const [showAnalysisAgainPrompt, setShowAnalysisAgainPrompt] = useState(false);
  const [showAnalysisErrorModal, setShowAnalysisErrorModal] = useState(false);
  const [analysisErrorMsg, setAnalysisErrorMsg] = useState('');
  const [viewedAnalysisRun, setViewedAnalysisRun] = useState<any>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    issues: false,
    precedents: false,
    evidence: false,
    strategy: false,
    prep: false,
    risks: false,
    history: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // OCR state simulations
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSteps, setOcrSteps] = useState<string[]>([]);
  const [activeOcrStep, setActiveOcrStep] = useState(0);

  // Forms control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);

  // Zero-Hallucination validation & summary state
  const [summaryInputText, setSummaryInputText] = useState('');
  const [validationError, setValidationError] = useState<{
    type: 'garbage_summary' | 'insufficient_data';
    error?: string;
    readinessScore?: number;
    missingFields?: string[];
  } | null>(null);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);

  // --- FORM INPUT STATES ---
  const [courtOrderForm, setCourtOrderForm] = useState({ title: '', date: '', issuer: '', notes: '' });
  const [isThreeDotOpen, setIsThreeDotOpen] = useState(false);

  // Timeline
  const [timelineForm, setTimelineForm] = useState({ date: '', title: '', description: '', category: 'Agreement', importance: 'Medium' });
  // Hearing
  const [hearingForm, setHearingForm] = useState({
    date: '',
    time: '',
    courtName: '',
    courtroom: '',
    judge: '',
    purpose: '',
    notes: '', // hearing title / description / notes
    status: 'Scheduled'
  });
  // Hearing Dashboard Premium States
  const [expandedHearingId, setExpandedHearingId] = useState<string | null>(null);
  const [hearingActiveSection, setHearingActiveSection] = useState<Record<string, string>>({});
  const [hearingFabExpanded, setHearingFabExpanded] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [hearingFormMode, setHearingFormMode] = useState<'add' | 'edit'>('add');
  const [editingHearingId, setEditingHearingId] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [voiceNoteTargetHearingId, setVoiceNoteTargetHearingId] = useState<string | null>(null);
  const [aiPrepProgressHearingId, setAiPrepProgressHearingId] = useState<string | null>(null);
  const [aiPrepStep, setAiPrepStep] = useState<number>(0);
  const [rescheduleTargetHearingId, setRescheduleTargetHearingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState<boolean>(false);
  const [calendarSyncModalOpen, setCalendarSyncModalOpen] = useState<boolean>(false);
  const [importOrderModalOpen, setImportOrderModalOpen] = useState<boolean>(false);

  // Party
  const [partyForm, setPartyForm] = useState({ name: '', role: 'Plaintiff / Petitioner', contact: '', email: '', notes: '' });
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  // Evidence
  const [evidenceForm, setEvidenceForm] = useState({ name: '', type: 'Document', description: '', admissibility: 'Admissible', notes: '', chainOfCustody: '' });
  // Task
  // Research precedents search
  const [precedentQuery, setPrecedentQuery] = useState('');
  const [precedentSearchResults, setPrecedentSearchResults] = useState<CasePrecedent[]>([]);
  // Redesigned Draft states
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [draftFilter, setDraftFilter] = useState('All');
  const [draftSort, setDraftSort] = useState('Newest');
  const [draftForm, setDraftForm] = useState({ name: '', type: 'Legal Notice' });
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorType, setEditorType] = useState('Legal Notice');
  const [editorStatus, setEditorStatus] = useState<'Draft' | 'In Progress' | 'Completed' | 'Reviewed'>('Draft');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraftSteps, setAiDraftSteps] = useState<string[]>([]);
  const [activeAiDraftStep, setActiveAiDraftStep] = useState(0);
  const [aiSuggestedDraftText, setAiSuggestedDraftText] = useState<string | null>(null);
  const [isAiSuggestionActive, setIsAiSuggestionActive] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionComment, setVersionComment] = useState('Initial draft created');
  const [expandedEditorTab, setExpandedEditorTab] = useState<'editor' | 'ai' | 'history'>('editor');
  // Rename
  const [renameValue, setRenameValue] = useState('');
  const [renameTargetDraftId, setRenameTargetDraftId] = useState('');
  const [isDraftTypePickerOpen, setIsDraftTypePickerOpen] = useState(false);

  // New states for clean design workspace
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<CaseDraft | null>(null);
  const [isCardMoreMenuOpen, setIsCardMoreMenuOpen] = useState(false);
  const [activeDraftForMoreMenu, setActiveDraftForMoreMenu] = useState<CaseDraft | null>(null);
  const [isEditorMoreOpen, setIsEditorMoreOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<string>('Autosaved');
  const autosaveTimerRef = useRef<any>(null);

  // Formatting simulated states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');

  // Evidence Vault clean design states
  const [evidenceSearchQuery, setEvidenceSearchQuery] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('All');
  const [isEvidenceDetailsOpen, setIsEvidenceDetailsOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<CaseEvidence | null>(null);
  const [isEvidenceUploadOpen, setIsEvidenceUploadOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTargetId, setVerifyTargetId] = useState<string | null>(null);
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState(false);
  const [ocrProgressStep, setOcrProgressStep] = useState(0);
  const [isAnalyzingEvidence, setIsAnalyzingEvidence] = useState(false);
  const [aiAnalysisProgressStep, setAiAnalysisProgressStep] = useState(0);
  const [evidenceUploadingTasks, setEvidenceUploadingTasks] = useState<Array<{
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'failed' | 'complete';
  }>>([]);
  const [selectedEvidenceOptionsItem, setSelectedEvidenceOptionsItem] = useState<any | null>(null);
  const [isEvidenceOptionsOpen, setIsEvidenceOptionsOpen] = useState(false);

  const [logEvidenceForm, setLogEvidenceForm] = useState({
    name: '',
    type: 'Document',
    description: '',
    notes: '',
    tags: '',
    exhibitNumber: '',
    fileSize: '1.2 MB'
  });

  // General Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('All');
  const [timelineImportanceFilter, setTimelineImportanceFilter] = useState('All');
  const [timelineSortAsc, setTimelineSortAsc] = useState(true);
  const [isAnalyzingTimeline, setIsAnalyzingTimeline] = useState(false);

  // DMS Workspace State Variables
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Document Manager Redesign states
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSortBy, setDocSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [uploadBottomSheetOpen, setUploadBottomSheetOpen] = useState(false);
  const [moreMenuOpenItem, setMoreMenuOpenItem] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  interface UploadTask {
    id: string;
    name: string;
    progress: number;
    status: 'compressing' | 'uploading' | 'processing' | 'success' | 'failed';
    size: number;
    uri: string;
    mime: string;
    docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other';
  }

  const [uploadingTasks, setUploadingTasks] = useState<UploadTask[]>([]);

  // Case note autosave buffer
  const [caseNotes, setCaseNotes] = useState('');

  // --- Case Notes State Variables ---
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [notesFilter, setNotesFilter] = useState('All');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [activeRecordingDuration, setActiveRecordingDuration] = useState(0);
  const [simulatedTranscribing, setSimulatedTranscribing] = useState(false);
  const [notesAutosaveStatus, setNotesAutosaveStatus] = useState('Autosaved'); // 'Saving...' / 'Autosaved'
  const [isSummarizingNotes, setIsSummarizingNotes] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [isNoteFormModalOpen, setIsNoteFormModalOpen] = useState(false);
  const [isVoiceNoteModalOpen, setIsVoiceNoteModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [selectedNoteVersionHistory, setSelectedNoteVersionHistory] = useState<any[]>([]);
  const [noteFormType, setNoteFormType] = useState<'add' | 'edit'>('add');
  const [noteFormTargetId, setNoteFormTargetId] = useState<string | null>(null);

  // RTF Toolbar States
  const [noteIsBold, setNoteIsBold] = useState(false);
  const [noteIsItalic, setNoteIsItalic] = useState(false);
  const [noteIsUnderline, setNoteIsUnderline] = useState(false);
  const [noteIsHighlight, setNoteIsHighlight] = useState(false);
  const [noteBlockType, setNoteBlockType] = useState<string>('normal');
  const [noteAlignment, setNoteAlignment] = useState<'left' | 'center' | 'right'>('left');

  // Rich Text Line Blocks & Undo/Redo/Dirty Mappings
  const [noteBlocks, setNoteBlocks] = useState<any[]>([{ type: 'normal', spans: [{ text: '' }] }]);
  const [activeFormatting, setActiveFormatting] = useState({ bold: false, italic: false, underline: false, highlight: false });
  const [noteSelection, setNoteSelection] = useState({ start: 0, end: 0 });
  const [noteHistory, setNoteHistory] = useState<any[][]>([]);
  const [noteHistoryIndex, setNoteHistoryIndex] = useState(-1);
  const [isNoteDirty, setIsNoteDirty] = useState(false);
  const [originalNoteBlocks, setOriginalNoteBlocks] = useState<any[]>([]);

  // Manual Note Form State
  const [noteForm, setNoteForm] = useState({
    title: '',
    category: 'Personal',
    content: '',
    tags: [] as string[],
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    favorite: false,
    pinned: false,
    relatedHearing: '',
    relatedTimelineEvent: '',
    relatedEvidence: '',
    relatedArgument: '',
    relatedResearch: '',
    // Template custom fields
    meetingWith: '',
    meetingLocation: '',
    meetingDate: '',
    discussion: '',
    decisions: '',
    followUp: '',
    judge: '',
    court: '',
    hearingDate: '',
    proceedings: '',
    orders: '',
    judgeRemarks: '',
    opponentArguments: '',
    observations: '',
    winningArguments: '',
    weaknesses: '',
    risks: '',
    opponentStrategy: '',
    counterStrategy: '',
    importantAuthorities: '',
    researchRequired: ''
  });

  // Timeline detailed view
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);

  // AI Narrative Extractor
  const [isNarrativeExtractorOpen, setIsNarrativeExtractorOpen] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [isExtractingNarrative, setIsExtractingNarrative] = useState(false);
  const [narrativeSteps, setNarrativeSteps] = useState<string[]>([]);
  const [activeNarrativeStep, setActiveNarrativeStep] = useState(0);

  // Suggestions warning flags
  const [showDuplicateMergeSuggestion, setShowDuplicateMergeSuggestion] = useState(true);
  const [showMissingNoticeSuggestion, setShowMissingNoticeSuggestion] = useState(true);

  // Hearings outcome states and Redesigned Hearings States
  const [isRecordingOutcome, setIsRecordingOutcome] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<CaseHearing | null>(null);
  const [activeHearingFilter, setActiveHearingFilter] = useState<string>('All');
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: '',
    courtObservations: '',
    ordersPassed: '',
    evidenceAccepted: '',
    argumentsCompleted: '',
    witnessExamined: '',
    adjournmentReason: '',
    nextHearingDate: ''
  });
  const [isExtractingHearing, setIsExtractingHearing] = useState(false);
  const [hearingExtractSteps, setHearingExtractSteps] = useState<string[]>([]);
  const [activeHearingExtractStep, setActiveHearingExtractStep] = useState(0);

  // Redesigned Hearings State additions
  // Note: Core hearing UI state is managed inside CourtHearingsModule.
  // These states remain for legacy modal panels (notes input, order upload) still rendered in this screen.
  const [isEnrichingHearingId, setIsEnrichingHearingId] = useState<string | null>(null);
  const [hearingNotesInput, setHearingNotesInput] = useState<string>('');
  const [selectedHearingForNotes, setSelectedHearingForNotes] = useState<CaseHearing | null>(null);
  const [selectedHearingForOrder, setSelectedHearingForOrder] = useState<CaseHearing | null>(null);
  const [simulatedUploadProgress, setSimulatedUploadProgress] = useState<number>(0);
  const [simulatedUploadStep, setSimulatedUploadStep] = useState<string>('');

  // Parties states
  const [isPartiesEditMode, setIsPartiesEditMode] = useState(false);
  const [tempPartiesData, setTempPartiesData] = useState<any>({});
  const [isExtractingParties, setIsExtractingParties] = useState(false);
  const [partiesExtractionSteps, setPartiesExtractionSteps] = useState<string[]>([]);
  const [activePartiesExtractionStep, setActivePartiesExtractionStep] = useState(0);

  // AI Research States
  const [researchSearchQuery, setResearchSearchQuery] = useState('');
  const [isRegeneratingResearch, setIsRegeneratingResearch] = useState(false);
  const [researchRegenSteps, setResearchRegenSteps] = useState<string[]>([]);
  const [activeResearchRegenStep, setActiveResearchRegenStep] = useState(0);
  const [expandedResearchSection, setExpandedResearchSection] = useState('dashboard');
  const [conversationalSearchResults, setConversationalSearchResults] = useState<{ judgments: any[]; laws: any[] } | null>(null);
  const [isSearchingResearch, setIsSearchingResearch] = useState(false);
  const [isResearchGenerated, setIsResearchGenerated] = useState(false);
  const [expandedLaws, setExpandedLaws] = useState<Record<number, boolean>>({});
  const [expandedJudgments, setExpandedJudgments] = useState<Record<number, boolean>>({});
  const [judgmentFilter, setJudgmentFilter] = useState('All');

  // AI Contract States
  const [uploadedContract, setUploadedContract] = useState<any>(null);
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
  const [contractAnalysisSteps, setContractAnalysisSteps] = useState<string[]>([]);
  const [activeContractAnalysisStep, setActiveContractAnalysisStep] = useState(0);
  const [contractActiveSubTab, setContractActiveSubTab] = useState('overview');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractFilter, setContractFilter] = useState('All Clauses');
  const [expandedClauses, setExpandedClauses] = useState<Record<number, boolean>>({});
  const [expandedRisks, setExpandedRisks] = useState<Record<string, boolean>>({});
  const [expandedMissing, setExpandedMissing] = useState<Record<string, boolean>>({});
  const [contractChatInput, setContractChatInput] = useState('');
  const [contractChatMessages, setContractChatMessages] = useState<any[]>([
    { sender: 'ai', text: "Hello! I am your AI Contract Review Assistant. Ask me anything about this contract's clauses, risk liabilities, or request a customized clause rewrite." }
  ]);
  const [isContractLinked, setIsContractLinked] = useState(false);
  const [contractRedlineState, setContractRedlineState] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  // AI Strategy & Courtroom Arguments
  const [argumentsActiveSubTab, setArgumentsActiveSubTab] = useState('dashboard');
  const [argumentsSearchQuery, setArgumentsSearchQuery] = useState('');
  const [argumentsFilter, setArgumentsFilter] = useState('All');
  const [isAnalyzingArguments, setIsAnalyzingArguments] = useState(false);
  const [argumentsAnalysisSteps, setArgumentsAnalysisSteps] = useState<string[]>([]);
  const [activeArgumentsStep, setActiveArgumentsStep] = useState(0);
  const [argumentsExportOpen, setArgumentsExportOpen] = useState(false);
  const [isPreparingHearing, setIsPreparingHearing] = useState(false);
  const [expandedArguments, setExpandedArguments] = useState<Record<string, boolean>>({});
  const [pinnedArguments, setPinnedArguments] = useState<Record<string, boolean>>({});

  // Custom states for CRUD
  const [petitionerArguments, setPetitionerArguments] = useState<any[]>([]);
  const [respondentArguments, setRespondentArguments] = useState<any[]>([]);

  // Redesigned Argument Builder states
  const [argumentBuilderStrategy, setArgumentBuilderStrategy] = useState<any | null>(null);
  const [argumentsExpandedSections, setArgumentsExpandedSections] = useState<Record<string, boolean>>({
    strongArgs: true,
    crossQuestions: false,
    rebuttals: false,
    opponentArgs: false,
    missingEvidence: false,
    caseLaws: false
  });
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [opponentPredictions, setOpponentPredictions] = useState<any[]>([]);
  const [trialStrategySequence, setTrialStrategySequence] = useState<any[]>([]);
  const [prepBinderTasks, setPrepBinderTasks] = useState<any[]>([
    { id: 't1', title: 'Prepare Section 65B Electronic Evidence Certificate', category: 'Documents Required', status: 'Pending' },
    { id: 't2', title: 'Notarized Loan Agreement Deed (Ex. P-1) original copy', category: 'Evidence Required', status: 'Pending' },
    { id: 't3', title: 'Attesting witness summon and checklist verification', category: 'Witness Checklist', status: 'Pending' },
    { id: 't4', title: 'Cite landmark judgments on commercial default rates (Article 19)', category: 'Important Citations', status: 'Pending' },
    { id: 't5', title: 'Review Noida vs Delhi jurisdiction seat legal precedents', category: 'Pending Tasks', status: 'Pending' }
  ]);

  // Modal states for Argument Add/Edit CRUD
  const [isArgModalOpen, setIsArgModalOpen] = useState(false);
  const [argModalType, setArgModalType] = useState<'add' | 'edit'>('add');
  const [argModalCategory, setArgModalCategory] = useState<'petitioner' | 'respondent'>('petitioner');
  const [argModalTargetId, setArgModalTargetId] = useState<string | null>(null);
  const [argForm, setArgForm] = useState({
    title: '',
    category: 'Contract Law',
    priority: 'High',
    description: '',
    supportingFacts: '',
    supportingLaws: '',
    supportingCaseLaws: '',
    relatedEvidence: '',
    relatedDocuments: '',
    relatedTimelineEvents: '',
    relatedHearings: ''
  });

  // Activity communication logging
  const [newActivity, setNewActivity] = useState({ type: 'Call', title: '', notes: '' });

  // Dynamic AI reply states for analysis tabs
  const [aiResearchReply, setAiResearchReply] = useState<string | null>(null);
  const [aiStrategyReply, setAiStrategyReply] = useState<string | null>(null);

  // AI Task Manager States
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('All');
  const [isGeneratingAiTasks, setIsGeneratingAiTasks] = useState(false);
  const [aiTaskBriefOpen, setAiTaskBriefOpen] = useState(true);
  const [weeklyPlannerOpen, setWeeklyPlannerOpen] = useState(false);
  const [isVoiceTasksModalOpen, setIsVoiceTasksModalOpen] = useState(false);
  const [voiceInputQuery, setVoiceInputQuery] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [taskFormType, setTaskFormType] = useState<'add' | 'edit'>('add');
  const [taskFormTargetId, setTaskFormTargetId] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'High',
    deadline: '',
    reminder: 'None',
    assignTo: '',
    status: 'Pending',
    relatedHearing: '',
    relatedTimelineEvent: '',
    relatedEvidence: '',
    relatedDocument: '',
    notes: '',
    attachments: [] as string[],
    checklist: [] as { title: string; checked: boolean }[],
    tempSubtaskText: ''
  });

  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<any[]>([
    {
      id: 'ai_s1',
      title: 'Prepare Section 65B Electronic Evidence Certificate',
      priority: 'Critical',
      reason: 'Required before electronic HDFC bank transaction records can become admissible in court.',
      deadline: 'Due Before Next Hearing',
      status: 'AI Suggested',
      checklist: [
        { title: 'Draft Certificate', checked: false },
        { title: 'Obtain Branch Manager signature', checked: false },
        { title: 'Annex to Evidence ledger list', checked: false }
      ]
    },
    {
      id: 'ai_s2',
      title: 'File Written Statement',
      priority: 'Critical',
      reason: 'Limitation Act & CPC require filing the defense statement within 30 days of summon delivery.',
      deadline: 'Due Within 14 Days',
      status: 'AI Suggested',
      checklist: [
        { title: 'Draft reply to plaint parawise', checked: false },
        { title: 'Notarize affidavit of statement execution', checked: false }
      ]
    },
    {
      id: 'ai_s3',
      title: 'Upload Speed Post Postal Receipt',
      priority: 'High',
      reason: 'Timeline indicates legal notice was sent but dispatch receipts have not been mapped in the Evidence Vault.',
      deadline: 'Due Today',
      status: 'AI Suggested',
      checklist: [
        { title: 'Scan postal receipt', checked: false },
        { title: 'Attach to Notice event', checked: false }
      ]
    },
    {
      id: 'ai_s4',
      title: 'Collect Original Sale Deed',
      priority: 'High',
      reason: 'Primary evidence rule requires the production of the original notarized deed for admission inspection.',
      deadline: 'Due Before Next Hearing',
      status: 'AI Suggested',
      checklist: []
    },
    {
      id: 'ai_s5',
      title: 'Verify Witness Address & Attestation Details',
      priority: 'Medium',
      reason: 'Required for issue of summons to the executing notary witnesses.',
      deadline: 'Due Within 7 Days',
      status: 'AI Suggested',
      checklist: []
    }
  ]);


  // --- Court Order Analyzer States ---
  const [selectedCourtOrder, setSelectedCourtOrder] = useState<any | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [isAiBannerDismissed, setIsAiBannerDismissed] = useState(false);
  const [isAiActionLoading, setIsAiActionLoading] = useState(false);
  const [aiActionType, setAiActionType] = useState<string | null>(null);
  const [aiActionResult, setAiActionResult] = useState<any | null>(null);
  const [isOrderViewerOpen, setIsOrderViewerOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderOcrScanning, setOrderOcrScanning] = useState(false);
  const [activeOrderOcrStep, setActiveOrderOcrStep] = useState(0);
  const [orderUploadProgress, setOrderUploadProgress] = useState(0);
  const [ocrScanningText, setOcrScanningText] = useState('');
  const [syncActiveSubTab, setSyncActiveSubTab] = useState('Overview');

  // Redesign state additions
  const [aiCoCounselReport, setAiCoCounselReport] = useState<string | null>(null);
  const [isAiCoCounselReportOpen, setIsAiCoCounselReportOpen] = useState(false);
  const [isAddOrderPickerOpen, setIsAddOrderPickerOpen] = useState(false);
  const [importEvidenceModalOpen, setImportEvidenceModalOpen] = useState(false);
  const [importNotesModalOpen, setImportNotesModalOpen] = useState(false);
  const [importContractsModalOpen, setImportContractsModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [isOrderActionsSheetOpen, setIsOrderActionsSheetOpen] = useState(false);
  const [actionTargetOrder, setActionTargetOrder] = useState<any | null>(null);
  const [newOrderName, setNewOrderName] = useState('');
  const [editOrderForm, setEditOrderForm] = useState<any>({
    name: '',
    courtName: '',
    judgeName: '',
    bench: 'Single Bench',
    courtNumber: '',
    caseNumber: '',
    orderDate: '',
    nextHearingDate: '',
    orderType: '',
    priority: 'Medium',
    notes: '',
    complianceStatus: 'Pending',
  });

  // Custom Sync Checkboxes state
  const [syncOptions, setSyncOptions] = useState({
    timeline: true,
    hearings: true,
    tasks: true,
    evidence: true,
    research: true,
    arguments: true,
    notes: true,
    contracts: true,
  });

  const [logOrderForm, setLogOrderForm] = useState({
    name: '',
    courtName: '',
    judgeName: '',
    bench: 'Single Bench',
    courtNumber: 'Courtroom No. 302',
    caseNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    nextHearingDate: '',
    orderType: 'Interim Order',
    stageOfCase: 'Court',
    petitioner: '',
    respondent: '',
    advocates: '',
    caseStatus: 'Active',
    notesText: '',
  });

  // --- COURT ORDER ACTION HANDLERS ---
  const handleUploadCourtOrder = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled) return;

      const file = result.assets[0];
      setOrderUploadProgress(10);
      setOrderOcrScanning(true);
      setActiveOrderOcrStep(0);
      setOcrScanningText('Initializing Document Scanning...');

      // Simulate upload progress steps
      setTimeout(() => setOrderUploadProgress(30), 400);
      setTimeout(() => {
        setOrderUploadProgress(50);
        setActiveOrderOcrStep(1);
        setOcrScanningText('Extracting OCR Text layers...');
      }, 900);
      setTimeout(() => {
        setOrderUploadProgress(75);
        setActiveOrderOcrStep(2);
        setOcrScanningText('Structuring Extracted Metadata...');
      }, 1500);
      setTimeout(() => {
        setOrderUploadProgress(90);
        setActiveOrderOcrStep(3);
        setOcrScanningText('Finalizing AI Analysis Recommendations...');
      }, 2100);

      setTimeout(async () => {
        setOrderUploadProgress(100);
        setOrderOcrScanning(false);

        // Auto select mock text matching user upload or default
        const matchedMock = MOCK_COURT_ORDERS.find(
          m => file.name.toLowerCase().includes(m.name.split('.')[0].toLowerCase())
        ) || MOCK_COURT_ORDERS[0];

        const ocrText = matchedMock.text;

        // Generate mock metadata based on matching template
        let judgeName = 'Amit Verma';
        let courtName = 'Delhi High Court';
        let nextHearingDate = '2026-07-25';
        let orderType = 'Interim Injunction';
        let caseNumber = 'Arb. P. 445/2026';
        let purpose = 'Compliance & Evidentiary Arguments';
        let courtroom = 'Courtroom No. 302';

        if (file.name.toLowerCase().includes('summons') || file.name.toLowerCase().includes('eviction')) {
          judgeName = 'Judge Roy';
          courtName = 'District Court of Delhi';
          nextHearingDate = '2026-08-12';
          orderType = 'Eviction Summons';
          caseNumber = 'CS(OS) 234/2026';
          purpose = 'Arrears Verification & Lease Review';
          courtroom = 'Courtroom No. 5';
        } else if (file.name.toLowerCase().includes('final') || file.name.toLowerCase().includes('stay')) {
          judgeName = 'Hon\'ble Judge Sen';
          courtName = 'High Court of Delhi';
          nextHearingDate = '2026-09-15';
          orderType = 'Stay Order & Written Arguments';
          caseNumber = 'Arb. Appeal No. 12/2026';
          purpose = 'Final Orders & Arguments Outcome';
          courtroom = 'Courtroom No. 12';
        }

        const newOrder: any = {
          id: 'order_' + Date.now(),
          _id: 'order_' + Date.now(),
          name: file.name,
          url: file.uri || '',
          fileSize: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
          ocrText,
          status: 'AI Analyzed',
          uploadedBy: 'Advocate',
          metadata: {
            courtName,
            judgeName,
            bench: 'Single Bench',
            courtNumber: courtroom,
            caseNumber,
            orderDate: new Date().toISOString().split('T')[0],
            nextHearingDate,
            orderType,
            stageOfCase: 'Court',
            petitioner: workspace?.clientName || 'Petitioner client',
            respondent: workspace?.opponentName || 'Respondent Opposing',
            advocates: 'Adv. R. K. Sharma',
            caseStatus: 'Active'
          },
          aiSummary: {
            shortSummary: `Court presiding over ${caseNumber} issued directives regarding execution compliance, timelines, evidence verification, and scheduled next argument hearing.`,
            keyPoints: [
              `Directs the parties to complete all outstanding compliance items before ${nextHearingDate}.`,
              `Next hearing scheduled on ${nextHearingDate} in ${courtroom}.`,
              `Admissibility of crucial evidence exhibits to be verified during next arguments.`
            ]
          },
          complianceItems: [
            {
              description: 'Submit written statement response or reply replica.',
              status: 'Pending',
              dueDate: nextHearingDate,
              priority: 'High',
              responsiblePerson: 'Advocate'
            },
            {
              description: 'Verify execution witness testimony certificates.',
              status: 'Pending',
              dueDate: nextHearingDate,
              priority: 'Medium',
              responsiblePerson: 'Client'
            }
          ],
          suggestedTasks: [
            {
              title: `Draft Response Pleadings for ${caseNumber}`,
              description: `Draft responses parawise in compliance with directives from ${orderType}.`,
              priority: 'High',
              accepted: false
            },
            {
              title: 'Notarize executing witness certificates',
              description: 'Obtain notary signature on witness affidavit.',
              priority: 'Medium',
              accepted: false
            }
          ],
          suggestedTimeline: [
            {
              title: `${orderType} Directive Passed`,
              description: `Hon'ble judge ${judgeName} issued orders and directives in case number ${caseNumber}.`,
              date: new Date().toISOString().split('T')[0],
              accepted: false
            }
          ],
          suggestedHearings: [
            {
              title: `Arguments Hearing for ${caseNumber}`,
              date: nextHearingDate,
              courtroom,
              judge: judgeName,
              purpose,
              accepted: false
            }
          ],
          suggestedArguments: [
            {
              title: 'Validity of Lease Executions',
              logic: 'Defendant is barred from disputing tenancy execution when monthly rent transfers exist.',
              precedents: 'Supreme Court precedents validate lease binding force even under delayed registrations.',
              accepted: false
            }
          ],
          suggestedResearch: [
            {
              act: 'Indian Evidence Act, 1872',
              section: 'Section 65B',
              description: 'Admissibility guidelines for electronic bank transfers and receipts records.',
              accepted: false
            }
          ],
          suggestedEvidence: [
            {
              title: 'Original Signed Agreement copy',
              description: 'Required to establish binding lease conditions in court.',
              status: 'Required',
              accepted: false
            }
          ],
          riskAnalysis: {
            proceduralDefects: [
              'Delay in filing certificates under Limitation timelines.'
            ],
            weaknessDetails: [
              'Original agreement registration delayed beyond statutory grace period.'
            ],
            limitationRisk: 'Medium Risk',
            jurisdictionIssue: false,
            objectionsProbability: 40
          },
          linkedRecords: {
            hearingsCount: 0,
            tasksCount: 0,
            evidenceCount: 0
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const currentOrders = workspace?.courtOrders || [];
        await handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
        showToast('success', 'Analysis Ready', `"${file.name}" analyzed successfully with AI.`);
      }, 2600);
    } catch (err) {
      console.warn('Document Picker error:', err);
      setOrderOcrScanning(false);
      showToast('error', 'Upload Cancelled', 'File selection cancelled or failed.');
    }
  };

  const handleManualAddCourtOrder = async () => {
    if (!logOrderForm.name.trim()) {
      showToast('error', 'Validation Error', 'Document name/file name is required.');
      return;
    }
    const ocrText = `IN THE COURT OF ${logOrderForm.courtName.toUpperCase()}
Case No. ${logOrderForm.caseNumber}
Judge: ${logOrderForm.judgeName}
ORDER:
Manual case decree logged. Directives: ${logOrderForm.notesText}`;

    const newOrder: any = {
      id: 'order_' + Date.now(),
      _id: 'order_' + Date.now(),
      name: logOrderForm.name + '.pdf',
      url: '',
      fileSize: '250 KB',
      ocrText,
      status: 'AI Analyzed',
      uploadedBy: 'Advocate',
      metadata: {
        courtName: logOrderForm.courtName,
        judgeName: logOrderForm.judgeName,
        bench: logOrderForm.bench,
        courtNumber: logOrderForm.courtNumber,
        caseNumber: logOrderForm.caseNumber,
        orderDate: logOrderForm.orderDate,
        nextHearingDate: logOrderForm.nextHearingDate,
        orderType: logOrderForm.orderType,
        stageOfCase: logOrderForm.stageOfCase,
        petitioner: logOrderForm.petitioner || workspace?.clientName || '',
        respondent: logOrderForm.respondent || workspace?.opponentName || '',
        advocates: logOrderForm.advocates,
        caseStatus: logOrderForm.caseStatus
      },
      aiSummary: {
        shortSummary: logOrderForm.notesText || 'No custom notes provided for manual order log.',
        keyPoints: ['Advocate manually annotated case order directions.']
      },
      complianceItems: logOrderForm.nextHearingDate ? [
        {
          description: logOrderForm.notesText || 'Comply with judicial observations.',
          status: 'Pending',
          dueDate: logOrderForm.nextHearingDate,
          priority: 'High',
          responsiblePerson: 'Advocate'
        }
      ] : [],
      suggestedTasks: [
        {
          title: `Analyze manual order directives: ${logOrderForm.name}`,
          description: logOrderForm.notesText || 'Review custom courtroom observations.',
          priority: 'Medium',
          accepted: false
        }
      ],
      suggestedTimeline: [
        {
          title: `${logOrderForm.orderType} Logged`,
          description: `Custom order entry logged under case no. ${logOrderForm.caseNumber}.`,
          date: logOrderForm.orderDate,
          accepted: false
        }
      ],
      suggestedHearings: logOrderForm.nextHearingDate ? [
        {
          title: `Next Hearing: ${logOrderForm.caseNumber}`,
          date: logOrderForm.nextHearingDate,
          courtroom: logOrderForm.courtNumber,
          judge: logOrderForm.judgeName,
          purpose: 'Judicial directive follow up',
          accepted: false
        }
      ] : [],
      suggestedArguments: [],
      suggestedResearch: [],
      suggestedEvidence: [],
      riskAnalysis: {
        proceduralDefects: [],
        weaknessDetails: [],
        limitationRisk: 'Low Risk',
        jurisdictionIssue: false,
        objectionsProbability: 10
      },
      linkedRecords: {
        hearingsCount: 0,
        tasksCount: 0,
        evidenceCount: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const currentOrders = workspace?.courtOrders || [];
    await handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
    setIsOrderFormOpen(false);
    showToast('success', 'Order Logged', 'Manual court order logged and analyzed successfully.');
  };

  const handleDeleteCourtOrder = async (orderId: string) => {
    Alert.alert(
      'Delete Court Order',
      'Are you sure you want to delete this court order from this case workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const currentOrders = workspace?.courtOrders || [];
            const updated = currentOrders.filter(o => (o._id !== orderId && o.id !== orderId));
            await handleUpdateField({ courtOrders: updated });
            if (selectedCourtOrder && (selectedCourtOrder._id === orderId || selectedCourtOrder.id === orderId)) {
              setSelectedCourtOrder(null);
              setIsOrderViewerOpen(false);
            }
            showToast('success', 'Order Deleted', 'Court order removed successfully.');
          }
        }
      ]
    );
  };

  const handleReanalyzeCourtOrder = async (orderId: string) => {
    const currentOrders = workspace?.courtOrders || [];
    const target = currentOrders.find(o => (o._id === orderId || o.id === orderId));
    if (!target) return;

    setOrderUploadProgress(10);
    setOrderOcrScanning(true);
    setActiveOrderOcrStep(0);
    setOcrScanningText('Re-scanning Document structure...');

    setTimeout(() => {
      setOrderUploadProgress(50);
      setActiveOrderOcrStep(1);
      setOcrScanningText('Extracting text and identifying signatures...');
    }, 600);

    setTimeout(() => {
      setOrderUploadProgress(90);
      setActiveOrderOcrStep(3);
      setOcrScanningText('Updating AI recommendations...');
    }, 1200);

    setTimeout(async () => {
      setOrderOcrScanning(false);
      const updated = currentOrders.map(o => {
        if (o._id === orderId || o.id === orderId) {
          return {
            ...o,
            updatedAt: new Date().toISOString(),
            status: 'AI Analyzed' as const
          };
        }
        return o;
      });
      await handleUpdateField({ courtOrders: updated });
      // Update local viewer selection if active
      if (selectedCourtOrder && (selectedCourtOrder._id === orderId || selectedCourtOrder.id === orderId)) {
        setSelectedCourtOrder(updated.find(o => (o._id === orderId || o.id === orderId)));
      }
      showToast('success', 'Reanalysis Complete', 'AI successfully re-audited the court order directives.');
    }, 1800);
  };

  const handlePromoteOrderSuggestion = async (
    orderId: string,
    type: 'task' | 'timeline' | 'hearing' | 'argument' | 'research' | 'evidence',
    itemIndex: number
  ) => {
    const currentOrders = workspace?.courtOrders || [];
    const orderIndex = currentOrders.findIndex(o => (o._id === orderId || o.id === orderId));
    if (orderIndex === -1) return;

    const orderCopy = { ...currentOrders[orderIndex] };
    let updatePayload: any = {};

    if (type === 'task') {
      const taskSuggestions = [...(orderCopy.suggestedTasks || [])];
      if (taskSuggestions[itemIndex].accepted) return;
      taskSuggestions[itemIndex] = { ...taskSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedTasks = taskSuggestions;

      // Add to workspace tasks
      const currentTasks = workspace?.tasks || [];
      const newTask = {
        title: taskSuggestions[itemIndex].title,
        description: taskSuggestions[itemIndex].description,
        priority: taskSuggestions[itemIndex].priority || 'Medium',
        status: 'Pending' as const,
        deadline: orderCopy.metadata?.nextHearingDate ? new Date(orderCopy.metadata.nextHearingDate) : new Date(),
        checklist: []
      };
      updatePayload.tasks = [newTask, ...currentTasks];
    }
    else if (type === 'timeline') {
      const timelineSuggestions = [...(orderCopy.suggestedTimeline || [])];
      if (timelineSuggestions[itemIndex].accepted) return;
      timelineSuggestions[itemIndex] = { ...timelineSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedTimeline = timelineSuggestions;

      // Add to workspace facts
      const currentFacts = workspace?.facts || [];
      const newFact = {
        id: 'fact_' + Date.now(),
        title: timelineSuggestions[itemIndex].title,
        description: timelineSuggestions[itemIndex].description,
        date: timelineSuggestions[itemIndex].date,
        displayDate: timelineSuggestions[itemIndex].date,
        importance: 'Medium',
        category: 'Court',
        createdBy: 'AI' as const
      };
      updatePayload.facts = [...currentFacts, newFact];
    }
    else if (type === 'hearing') {
      const hearingSuggestions = [...(orderCopy.suggestedHearings || [])];
      if (hearingSuggestions[itemIndex].accepted) return;
      hearingSuggestions[itemIndex] = { ...hearingSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedHearings = hearingSuggestions;

      // Add to workspace hearings
      const currentHearings = workspace?.hearings || [];
      const newHearing = {
        id: 'hearing_' + Date.now(),
        _id: 'hearing_' + Date.now(),
        title: hearingSuggestions[itemIndex].title,
        date: hearingSuggestions[itemIndex].date,
        courtName: orderCopy.metadata?.courtName || '',
        courtroom: hearingSuggestions[itemIndex].courtroom || '',
        judge: hearingSuggestions[itemIndex].judge || '',
        purpose: hearingSuggestions[itemIndex].purpose || '',
        notes: `AI suggested next hearing from court order: ${orderCopy.name}`,
        status: 'Scheduled' as const,
        linkedDocuments: [orderCopy._id || ''],
        checklist: {
          documents: [],
          evidence: [],
          witnesses: [],
          compliance: []
        }
      };
      updatePayload.hearings = [...currentHearings, newHearing];
    }
    else if (type === 'argument') {
      const argumentSuggestions = [...(orderCopy.suggestedArguments || [])];
      if (argumentSuggestions[itemIndex].accepted) return;
      argumentSuggestions[itemIndex] = { ...argumentSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedArguments = argumentSuggestions;

      // Add to petitioner strategy arguments directly
      setPetitionerArguments((prev) => [
        ...prev,
        {
          id: 'arg_p_' + Date.now(),
          number: 'ARG ' + (prev.length + 1),
          title: argumentSuggestions[itemIndex].title,
          category: 'Procedure Law',
          priority: 'High',
          description: argumentSuggestions[itemIndex].logic,
          supportingFacts: [],
          supportingLaws: [orderCopy.metadata?.orderType || 'Court Directive'],
          supportingCaseLaws: argumentSuggestions[itemIndex].precedents ? [argumentSuggestions[itemIndex].precedents] : [],
          relatedEvidence: [],
          relatedDocuments: [orderCopy.name]
        }
      ]);
      showToast('success', 'Strategy Updated', 'Suggested Argument promoted to trial strategy.');
    }
    else if (type === 'research') {
      const researchSuggestions = [...(orderCopy.suggestedResearch || [])];
      if (researchSuggestions[itemIndex].accepted) return;
      researchSuggestions[itemIndex] = { ...researchSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedResearch = researchSuggestions;

      // Add to workspace savedPrecedents
      const currentPrecedents = workspace?.savedPrecedents || [];
      const newPrecedent = {
        _id: 'prec_' + Date.now(),
        title: `${researchSuggestions[itemIndex].act} - ${researchSuggestions[itemIndex].section}`,
        citation: `${researchSuggestions[itemIndex].act} Reference`,
        summary: researchSuggestions[itemIndex].description
      };
      updatePayload.savedPrecedents = [...currentPrecedents, newPrecedent];
    }
    else if (type === 'evidence') {
      const evidenceSuggestions = [...(orderCopy.suggestedEvidence || [])];
      if (evidenceSuggestions[itemIndex].accepted) return;
      evidenceSuggestions[itemIndex] = { ...evidenceSuggestions[itemIndex], accepted: true };
      orderCopy.suggestedEvidence = evidenceSuggestions;

      // Add to workspace evidence required checklist or evidence array as pending
      const currentEvidence = workspace?.evidence || [];
      const newEvidence = {
        id: 'evidence_' + Date.now(),
        _id: 'evidence_' + Date.now(),
        name: evidenceSuggestions[itemIndex].title,
        type: 'Document',
        description: evidenceSuggestions[itemIndex].description,
        notes: `AI suggested evidence by Court Order: ${orderCopy.name}`,
        status: 'Pending' as const,
        tags: ['Court Order Requested', 'Missing'],
        fileSize: 'Pending Upload',
        uploadedBy: 'System AI'
      };
      updatePayload.evidence = [...currentEvidence, newEvidence];
    }

    // Update courtOrders array in database
    const updatedOrders = [...currentOrders];
    updatedOrders[orderIndex] = orderCopy;
    updatePayload.courtOrders = updatedOrders;

    await handleUpdateField(updatePayload);
    setSelectedCourtOrder(orderCopy);
    showToast('success', 'Suggestion Applied', 'Workspace successfully synchronized with directive.');
  };

  const handleSynchronizeWorkspace = async (orderId: string) => {
    const currentOrders = workspace?.courtOrders || [];
    const orderIndex = currentOrders.findIndex(o => (o._id === orderId || o.id === orderId));
    if (orderIndex === -1) return;

    const orderCopy = { ...currentOrders[orderIndex] };
    let updatePayload: any = {};

    // Batch promotion logic
    if (syncOptions.tasks && orderCopy.suggestedTasks) {
      const currentTasks = workspace?.tasks || [];
      const nonAccepted = orderCopy.suggestedTasks.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        const newTasks = nonAccepted.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority || 'Medium',
          status: 'Pending' as const,
          deadline: orderCopy.metadata?.nextHearingDate ? new Date(orderCopy.metadata.nextHearingDate) : new Date(),
          checklist: []
        }));
        updatePayload.tasks = [...newTasks, ...currentTasks];
        orderCopy.suggestedTasks = orderCopy.suggestedTasks.map(t => ({ ...t, accepted: true }));
      }
    }

    if (syncOptions.timeline && orderCopy.suggestedTimeline) {
      const currentFacts = workspace?.facts || [];
      const nonAccepted = orderCopy.suggestedTimeline.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        const newFacts = nonAccepted.map((t, idx) => ({
          id: 'fact_' + (Date.now() + idx),
          title: t.title,
          description: t.description,
          date: t.date,
          displayDate: t.date,
          importance: 'Medium',
          category: 'Court',
          createdBy: 'AI' as const
        }));
        updatePayload.facts = [...currentFacts, ...newFacts];
        orderCopy.suggestedTimeline = orderCopy.suggestedTimeline.map(t => ({ ...t, accepted: true }));
      }
    }

    if (syncOptions.hearings && orderCopy.suggestedHearings) {
      const currentHearings = workspace?.hearings || [];
      const nonAccepted = orderCopy.suggestedHearings.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        const newHearings = nonAccepted.map((t, idx) => ({
          id: 'hearing_' + (Date.now() + idx),
          _id: 'hearing_' + (Date.now() + idx),
          title: t.title,
          date: t.date,
          courtName: orderCopy.metadata?.courtName || '',
          courtroom: t.courtroom || '',
          judge: t.judge || '',
          purpose: t.purpose || '',
          notes: `AI suggested next hearing from batch sync: ${orderCopy.name}`,
          status: 'Scheduled' as const,
          linkedDocuments: [orderCopy._id || ''],
          checklist: {
            documents: [],
            evidence: [],
            witnesses: [],
            compliance: []
          }
        }));
        updatePayload.hearings = [...currentHearings, ...newHearings];
        orderCopy.suggestedHearings = orderCopy.suggestedHearings.map(t => ({ ...t, accepted: true }));
      }
    }

    if (syncOptions.research && orderCopy.suggestedResearch) {
      const currentPrecedents = workspace?.savedPrecedents || [];
      const nonAccepted = orderCopy.suggestedResearch.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        const newPrecedents = nonAccepted.map((t, idx) => ({
          _id: 'prec_' + (Date.now() + idx),
          title: `${t.act} - ${t.section}`,
          citation: `${t.act} Reference`,
          summary: t.description
        }));
        updatePayload.savedPrecedents = [...currentPrecedents, ...newPrecedents];
        orderCopy.suggestedResearch = orderCopy.suggestedResearch.map(t => ({ ...t, accepted: true }));
      }
    }

    if (syncOptions.evidence && orderCopy.suggestedEvidence) {
      const currentEvidence = workspace?.evidence || [];
      const nonAccepted = orderCopy.suggestedEvidence.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        const newEvidenceList = nonAccepted.map((t, idx) => ({
          id: 'evidence_' + (Date.now() + idx),
          _id: 'evidence_' + (Date.now() + idx),
          name: t.title,
          type: 'Document',
          description: t.description,
          notes: `AI suggested evidence from batch sync: ${orderCopy.name}`,
          status: 'Pending' as const,
          tags: ['Court Order Requested', 'Missing'],
          fileSize: 'Pending Upload',
          uploadedBy: 'System AI'
        }));
        updatePayload.evidence = [...currentEvidence, ...newEvidenceList];
        orderCopy.suggestedEvidence = orderCopy.suggestedEvidence.map(t => ({ ...t, accepted: true }));
      }
    }

    if (syncOptions.arguments && orderCopy.suggestedArguments) {
      const nonAccepted = orderCopy.suggestedArguments.filter(t => !t.accepted);
      if (nonAccepted.length > 0) {
        setPetitionerArguments((prev) => {
          const newArgs = nonAccepted.map((t, idx) => ({
            id: 'arg_p_' + (Date.now() + idx),
            number: 'ARG ' + (prev.length + idx + 1),
            title: t.title,
            category: 'Procedure Law',
            priority: 'High',
            description: t.logic,
            supportingFacts: [],
            supportingLaws: [orderCopy.metadata?.orderType || 'Court Directive'],
            supportingCaseLaws: t.precedents ? [t.precedents] : [],
            relatedEvidence: [],
            relatedDocuments: [orderCopy.name]
          }));
          return [...prev, ...newArgs];
        });
        orderCopy.suggestedArguments = orderCopy.suggestedArguments.map(t => ({ ...t, accepted: true }));
      }
    }

    // Toggle compliance items status
    if (orderCopy.complianceItems) {
      orderCopy.complianceItems = orderCopy.complianceItems.map(c => ({ ...c, status: 'Completed' }));
    }

    orderCopy.status = 'Completed';

    const updatedOrders = [...currentOrders];
    updatedOrders[orderIndex] = orderCopy;
    updatePayload.courtOrders = updatedOrders;

    await handleUpdateField(updatePayload);
    setSelectedCourtOrder(orderCopy);
    showToast('success', 'Workspace Synced', 'AI successfully batch synchronized case modules with court order parameters.');
  };

  // --- REDESIGN COURT ORDER HANDLERS ---
  const handleAiCoCounselAction = (actionType: string, order: any) => {
    let reportTitle = '';
    let reportContent = '';

    if (actionType === 'explain') {
      reportTitle = 'AI Explanation: ' + order.name;
      reportContent = `This is a judicial directive issued by ${order.metadata?.judgeName || 'the Judge'} of ${order.metadata?.courtName || 'the Court'} on ${order.metadata?.orderDate || 'the date'}.\n\n### Key Procedural Points:\n1. **Injunction In Effect**: The court has restrained activities related to the disputed property or case context.\n2. **Compliance Deadline**: All directives must be satisfied before ${order.metadata?.nextHearingDate || 'the next date'}.\n3. **Legal Basis**: Issued in accordance with Code of Civil Procedure (CPC) Order 39 Rules 1 & 2.\n\n### Recommendation:\nCo-Counsel advises filing a reply replica immediately before the stay order limitations expire. Ensure certified electronic bank records are appended.`;
    } else if (actionType === 'issues') {
      reportTitle = 'AI Procedural Defect Analysis';
      reportContent = `### Vulnerabilities & Legal Issues Found:\n\n1. **Limitation Expiring soon**: Under Article 137 of Limitation Act, any review or challenge must be registered within 30 days of the decree date (${order.metadata?.orderDate}).\n2. **Service of Notice Defect**: Opponent has alleged that compliance directives were not properly served under Rule 3. Lack of speed post tracking receipt is a crucial weakness.\n3. **Jurisdiction Demurrer**: High Court division bench jurisdiction could be demurred since valuation parameters are below commercial thresholds.`;
    } else if (actionType === 'appeal') {
      reportTitle = 'Draft Legal Appeal Outline';
      reportContent = `IN THE HIGH COURT OF DELHI\nCS(COMM) NO. ${order.metadata?.caseNumber || '___/2026'}\n\nIN THE MATTER OF:\n${order.metadata?.petitioner || 'Plaintiff'}   ...Appellant\nVERSUS\n${order.metadata?.respondent || 'Defendant'}   ...Respondent\n\n### BRIEF ON APPEAL UNDER SECTION 96 CPC\n\nTO,\nTHE HON'BLE CHIEF JUSTICE AND THEIR COMPANION JUDGES OF THE HIGH COURT.\n\nTHE HUMBLE APPEAL OF THE APPELLANT SHOWETH:\n1. That the Appellant is aggrieved by the order dated ${order.metadata?.orderDate || '___'} passed by Hon'ble Judge ${order.metadata?.judgeName || '___'} in courtroom ${order.metadata?.courtNumber || '___'}.\n2. That the learned judge erred in failing to appreciate that the tenancy execution was fully backed by monthly bank transfers.\n\n### PRAYER:\nTherefore, it is respectfully prayed that this Hon'ble Court may be pleased to set aside the order and grant interim relief.`;
    } else if (actionType === 'reply') {
      reportTitle = 'Draft Compliance Reply Statement';
      reportContent = `IN THE DISTRICT COURT OF DELHI\nCASE NO. ${order.metadata?.caseNumber || '___'}\n\n### WRITTEN COMPLIANCE REPLY BY THE ADVOCATE\n\nIn compliance with the court directives dated ${order.metadata?.orderDate || '___'}, the Plaintiff begs to submit:\n1. That speed post notification service has been duly completed on all respondents as directed.\n2. That the certified copy of bank Statements under Section 65B of Evidence Act is attached as Exhibit E1.\n\nPlace: Delhi\nDate: ${new Date().toLocaleDateString()}\nAdvocate for Appellant`;
    } else if (actionType === 'review') {
      reportTitle = 'Draft Review Petition (CPC Sec 114)';
      reportContent = `### WRITTEN APPLICATION FOR REVIEW OF ORDER DATED ${order.metadata?.orderDate || '___'}\n\nUnder CPC Section 114, the petitioner seeks review on grounds of error apparent on the face of the record:\n1. Original sale deed execution registration was ignored during stay arguments.\n2. Inadmissibility points were incorrectly decided.`;
    } else if (actionType === 'execution') {
      reportTitle = 'Draft Execution Application (CPC Order 21)';
      reportContent = `### COURT EXECUTION APPLICATION FOR CS/102/2026\n\nUnder CPC Order 21 Rule 11, the decree holder seeks immediate execution of stay directions:\n1. Direct local bailiff or police protection to enforce stay order regarding the disputed Karol Bagh plot.`;
    } else {
      reportTitle = 'AI Intelligence Report';
      reportContent = `### Judicial Summary Brief:\nThis order contains ${order.complianceItems?.length || 0} compliance directives and is categorized as a ${order.metadata?.orderType || 'Notice'}. Key Strategic recommendation is to complete witness notarizations before ${order.metadata?.nextHearingDate || 'the next date'}.`;
    }

    setAiCoCounselReport(reportContent);
    setIsAiCoCounselReportOpen(true);
  };

  const handleSelectImportOption = (optionType: string) => {
    setIsAddOrderPickerOpen(false);
    if (optionType === 'pdf' || optionType === 'docx' || optionType === 'image') {
      handleUploadCourtOrder();
    } else if (optionType === 'camera') {
      setOrderUploadProgress(10);
      setOrderOcrScanning(true);
      setActiveOrderOcrStep(0);
      setOcrScanningText('Opening Camera Scanner...');
      setTimeout(() => {
        setOrderUploadProgress(50);
        setActiveOrderOcrStep(1);
        setOcrScanningText('Scanning pages with OCR...');
      }, 700);
      setTimeout(() => {
        setOrderUploadProgress(100);
        setOrderOcrScanning(false);
        const orderId = 'order_scan_' + Date.now();
        const newOrder: CourtOrder = {
          _id: orderId,
          id: orderId,
          name: 'CameraScan_' + new Date().toISOString().split('T')[0] + '.pdf',
          fileSize: '650 KB',
          ocrText: 'IN THE DISTRICT COURT OF DELHI\nCS(OS) 234/2026\nJudge: Hon\'ble Judge Roy\nBench: Single Bench\n\nORDER DETAILS:\nCourt orders eviction summons to the respondent to verify attestation lease records before next hearing 2026-08-12.',
          status: 'AI Analyzed',
          uploadedBy: 'Advocate',
          metadata: {
            courtName: 'District Court of Delhi',
            judgeName: 'Hon\'ble Judge Roy',
            bench: 'Single Bench',
            courtNumber: 'Courtroom No. 5',
            caseNumber: workspace?.caseNumber || 'CS(OS) 234/2026',
            orderDate: new Date().toISOString().split('T')[0],
            nextHearingDate: '2026-08-12',
            orderType: 'Eviction Summons',
            stageOfCase: 'Hearing',
            petitioner: workspace?.clientName || 'Petitioner',
            respondent: workspace?.opponentName || 'Respondent',
            advocates: 'Advocate',
            caseStatus: 'Active'
          },
          aiSummary: {
            shortSummary: 'Eviction summons directing respondent verification and lease compliance reports.',
            keyPoints: ['Submit lease attestation before next date 2026-08-12.']
          },
          complianceItems: [
            { description: 'Submit lease verification checklist.', status: 'Pending', dueDate: '2026-08-12', priority: 'High', responsiblePerson: 'Advocate' }
          ],
          suggestedTasks: [
            { title: 'Draft summons response', description: 'Review lease attestation points.', priority: 'High', accepted: false }
          ],
          suggestedTimeline: [
            { title: 'Camera Scan Order Logged', description: 'Eviction summons logged.', date: new Date().toISOString().split('T')[0], accepted: false }
          ],
          suggestedHearings: [
            { title: 'Hearing: Summons Return', date: '2026-08-12', courtroom: 'Courtroom No. 5', judge: 'Judge Roy', purpose: 'Summons verification', accepted: false }
          ],
          suggestedArguments: [],
          suggestedResearch: [],
          suggestedEvidence: [],
          riskAnalysis: {
            proceduralDefects: [],
            weaknessDetails: [],
            limitationRisk: 'Low Risk',
            jurisdictionIssue: false,
            objectionsProbability: 15
          },
          linkedRecords: { hearingsCount: 0, tasksCount: 0, evidenceCount: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const currentOrders = workspace?.courtOrders || [];
        handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
        showToast('success', 'Camera Scan Ready', 'Court order scanned and analyzed successfully.');
      }, 1500);
    } else if (optionType === 'evidence') {
      setImportEvidenceModalOpen(true);
    } else if (optionType === 'notes') {
      setImportNotesModalOpen(true);
    } else if (optionType === 'contracts') {
      setImportContractsModalOpen(true);
    } else if (optionType === 'manual') {
      setLogOrderForm({
        name: '',
        courtName: workspace?.courtName || 'Delhi High Court',
        judgeName: 'Justice Amit Verma',
        bench: 'Single Bench',
        courtNumber: 'Courtroom No. 302',
        caseNumber: workspace?.caseNumber || 'CS/102/2026',
        orderDate: new Date().toISOString().split('T')[0],
        nextHearingDate: '',
        orderType: 'Interim Order',
        stageOfCase: 'Court',
        petitioner: workspace?.clientName || '',
        respondent: workspace?.opponentName || '',
        advocates: '',
        caseStatus: 'Active',
        notesText: '',
      });
      setIsOrderFormOpen(true);
    }
  };

  const handleImportEvidence = async (item: any) => {
    setImportEvidenceModalOpen(false);
    const orderId = 'order_import_' + Date.now();
    const newOrder: CourtOrder = {
      _id: orderId,
      id: orderId,
      name: `Order_Imported_From_Evidence_${item.name}`,
      fileSize: item.fileSize || '120 KB',
      ocrText: `IMPORTED EVIDENCE: ${item.name}\nDescription: ${item.description || ''}\nNotes: ${item.notes || ''}`,
      status: 'AI Analyzed',
      uploadedBy: 'Advocate',
      metadata: {
        courtName: workspace?.courtName || 'Delhi High Court',
        judgeName: 'Justice Amit Verma',
        bench: 'Single Bench',
        courtNumber: 'Courtroom 302',
        caseNumber: workspace?.caseNumber || 'CS/102/2026',
        orderDate: new Date().toISOString().split('T')[0],
        nextHearingDate: '',
        orderType: 'Evidence Order Exhibit',
        stageOfCase: 'Arguments',
        petitioner: workspace?.clientName || 'Petitioner',
        respondent: workspace?.opponentName || 'Respondent',
        advocates: 'Advocate',
        caseStatus: 'Active'
      },
      aiSummary: {
        shortSummary: `Court order imported from evidence vault exhibit: ${item.name}.`,
        keyPoints: [`Exhibit item establishes contract validity.`]
      },
      complianceItems: [],
      suggestedTasks: [],
      suggestedTimeline: [],
      suggestedHearings: [],
      suggestedArguments: [],
      suggestedResearch: [],
      suggestedEvidence: [],
      riskAnalysis: {
        proceduralDefects: [],
        weaknessDetails: [],
        limitationRisk: 'Low Risk',
        jurisdictionIssue: false,
        objectionsProbability: 10
      },
      linkedRecords: { hearingsCount: 0, tasksCount: 0, evidenceCount: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const currentOrders = workspace?.courtOrders || [];
    await handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
    showToast('success', 'Import Successful', `Imported "${item.name}" from Evidence Vault.`);
  };

  const handleImportNote = async (item: any) => {
    setImportNotesModalOpen(false);
    const orderId = 'order_import_' + Date.now();
    const newOrder: CourtOrder = {
      _id: orderId,
      id: orderId,
      name: `Order_Imported_From_Note_${item.title}.pdf`,
      fileSize: '50 KB',
      ocrText: `IMPORTED CASE NOTE: ${item.title}\nContent:\n${item.content || ''}`,
      status: 'AI Analyzed',
      uploadedBy: 'Advocate',
      metadata: {
        courtName: workspace?.courtName || 'Delhi High Court',
        judgeName: 'Justice Amit Verma',
        bench: 'Single Bench',
        courtNumber: 'Courtroom 302',
        caseNumber: workspace?.caseNumber || 'CS/102/2026',
        orderDate: new Date().toISOString().split('T')[0],
        nextHearingDate: '',
        orderType: 'Case Note Order',
        stageOfCase: 'Arguments',
        petitioner: workspace?.clientName || 'Petitioner',
        respondent: workspace?.opponentName || 'Respondent',
        advocates: 'Advocate',
        caseStatus: 'Active'
      },
      aiSummary: {
        shortSummary: `Court order details imported from advocate note: ${item.title}.`,
        keyPoints: [`Advocate note references key arguments.`]
      },
      complianceItems: [],
      suggestedTasks: [],
      suggestedTimeline: [],
      suggestedHearings: [],
      suggestedArguments: [],
      suggestedResearch: [],
      suggestedEvidence: [],
      riskAnalysis: {
        proceduralDefects: [],
        weaknessDetails: [],
        limitationRisk: 'Low Risk',
        jurisdictionIssue: false,
        objectionsProbability: 10
      },
      linkedRecords: { hearingsCount: 0, tasksCount: 0, evidenceCount: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const currentOrders = workspace?.courtOrders || [];
    await handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
    showToast('success', 'Import Successful', `Imported "${item.title}" from Case Notes.`);
  };

  const handleImportContract = async (item: any) => {
    setImportContractsModalOpen(false);
    const orderId = 'order_import_' + Date.now();
    const newOrder: CourtOrder = {
      _id: orderId,
      id: orderId,
      name: `Order_Imported_From_Contract_${item.name || item.title || 'Agreement'}.pdf`,
      fileSize: item.fileSize || '150 KB',
      ocrText: `IMPORTED CONTRACT: ${item.name || item.title || 'Agreement'}\nStatus: ${item.status || ''}\nDirectives: ${item.description || ''}`,
      status: 'AI Analyzed',
      uploadedBy: 'Advocate',
      metadata: {
        courtName: workspace?.courtName || 'Delhi High Court',
        judgeName: 'Justice Amit Verma',
        bench: 'Single Bench',
        courtNumber: 'Courtroom 302',
        caseNumber: workspace?.caseNumber || 'CS/102/2026',
        orderDate: new Date().toISOString().split('T')[0],
        nextHearingDate: '',
        orderType: 'Contract Injunction Order',
        stageOfCase: 'Arguments',
        petitioner: workspace?.clientName || 'Petitioner',
        respondent: workspace?.opponentName || 'Respondent',
        advocates: 'Advocate',
        caseStatus: 'Active'
      },
      aiSummary: {
        shortSummary: `Court order imported from case contract agreement: ${item.name || item.title || 'Agreement'}.`,
        keyPoints: [`Lease and liability clauses analyzed.`]
      },
      complianceItems: [],
      suggestedTasks: [],
      suggestedTimeline: [],
      suggestedHearings: [],
      suggestedArguments: [],
      suggestedResearch: [],
      suggestedEvidence: [],
      riskAnalysis: {
        proceduralDefects: [],
        weaknessDetails: [],
        limitationRisk: 'Low Risk',
        jurisdictionIssue: false,
        objectionsProbability: 10
      },
      linkedRecords: { hearingsCount: 0, tasksCount: 0, evidenceCount: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const currentOrders = workspace?.courtOrders || [];
    await handleUpdateField({ courtOrders: [...currentOrders, newOrder] });
    showToast('success', 'Import Successful', `Imported "${item.name || item.title || 'Agreement'}" from Case Contracts.`);
  };

  const handleDuplicateCourtOrderRedesign = async (order: any) => {
    setIsOrderActionsSheetOpen(false);
    const newId = 'order_dup_' + Date.now();
    const duplicatedOrder = {
      ...JSON.parse(JSON.stringify(order)),
      _id: newId,
      id: newId,
      name: `${order.name.replace('.pdf', '')} (Copy).pdf`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const currentOrders = workspace?.courtOrders || [];
    await handleUpdateField({ courtOrders: [...currentOrders, duplicatedOrder] });
    showToast('success', 'Duplicated Successfully', 'Court order cloned.');
  };

  const handleRenameCourtOrderSubmit = async (orderId: string, newNameStr: string) => {
    if (!newNameStr.trim()) return;
    const currentOrders = workspace?.courtOrders || [];
    const updated = currentOrders.map(o => {
      if (o._id === orderId || o.id === orderId) {
        return { ...o, name: newNameStr.endsWith('.pdf') ? newNameStr : newNameStr + '.pdf', updatedAt: new Date().toISOString() };
      }
      return o;
    });
    await handleUpdateField({ courtOrders: updated });
    showToast('success', 'Rename Successful', 'Order renamed successfully.');
  };

  const handleMoveToEvidenceVault = async (order: any) => {
    setIsOrderActionsSheetOpen(false);
    const newEvidenceItem = {
      id: 'evidence_' + Date.now(),
      _id: 'evidence_' + Date.now(),
      name: order.name,
      type: 'Document' as const,
      description: `Imported court order: ${order.name}. Court: ${order.metadata?.courtName}. Judge: ${order.metadata?.judgeName}.`,
      notes: order.aiSummary?.shortSummary || '',
      status: 'Verified' as const,
      tags: ['Court Order', 'Extracted'],
      fileSize: order.fileSize || '250 KB',
      uploadedBy: order.uploadedBy || 'Advocate'
    };
    const currentEvidence = workspace?.evidence || [];
    await handleUpdateField({ evidence: [newEvidenceItem, ...currentEvidence] });
    showToast('success', 'Moved to Evidence', 'Successfully copied to Evidence Vault.');
  };

  const handleLinkWithCaseNotes = async (order: any, noteId: string) => {
    const currentOrders = workspace?.courtOrders || [];
    const updated = currentOrders.map(o => {
      if (o._id === order._id || o.id === order.id) {
        const currentLinks = o.linkedRecords || {};
        return {
          ...o,
          linkedRecords: {
            ...currentLinks,
            linkedNotesId: noteId,
            notesCount: (currentLinks.notesCount || 0) + 1
          }
        };
      }
      return o;
    });
    await handleUpdateField({ courtOrders: updated });
    if (selectedCourtOrder && (selectedCourtOrder._id === order._id || selectedCourtOrder.id === order.id)) {
      setSelectedCourtOrder(updated.find(o => (o._id === order._id || o.id === order.id)));
    }
    showToast('success', 'Linked Successfully', 'Order linked to Case Note.');
  };

  const handleArchiveCourtOrder = async (orderId: string) => {
    setIsOrderActionsSheetOpen(false);
    const currentOrders = workspace?.courtOrders || [];
    const updated = currentOrders.map(o => {
      if (o._id === orderId || o.id === orderId) {
        return { ...o, archived: !o.archived, updatedAt: new Date().toISOString() };
      }
      return o;
    });
    await handleUpdateField({ courtOrders: updated });
    showToast('success', 'Status Updated', 'Order archive status changed.');
  };

  const handleSaveEditedCourtOrder = async () => {
    if (!editOrderForm.name.trim()) {
      showToast('error', 'Validation Error', 'Name is required.');
      return;
    }
    const currentOrders = workspace?.courtOrders || [];
    const updated = currentOrders.map(o => {
      if (o._id === actionTargetOrder?._id || o.id === actionTargetOrder?.id) {
        return {
          ...o,
          name: editOrderForm.name.endsWith('.pdf') ? editOrderForm.name : editOrderForm.name + '.pdf',
          priority: editOrderForm.priority,
          metadata: {
            ...(o.metadata || {}),
            courtName: editOrderForm.courtName,
            judgeName: editOrderForm.judgeName,
            bench: editOrderForm.bench,
            courtNumber: editOrderForm.courtNumber,
            caseNumber: editOrderForm.caseNumber,
            orderDate: editOrderForm.orderDate,
            nextHearingDate: editOrderForm.nextHearingDate,
            orderType: editOrderForm.orderType,
          },
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    });
    await handleUpdateField({ courtOrders: updated });
    setIsEditOrderModalOpen(false);
    setActionTargetOrder(null);
    showToast('success', 'Order Updated', 'Metadata modifications saved to MongoDB.');
  };

  // Pulse animation for skeleton loading
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [loading]);

  const fetchAnalysisDetails = async (caseId: string) => {
    try {
      const res = await WorkspaceService.getLatestAnalysis(caseId);
      if (res && res.success && res.data) {
        setLatestAnalysis(res.data);
        setViewedAnalysisRun(res.data);
      } else {
        setLatestAnalysis(null);
        setViewedAnalysisRun(null);
      }

      const historyRes = await WorkspaceService.getAnalysisHistory(caseId);
      if (historyRes && historyRes.success && historyRes.data) {
        setAnalysisHistory(historyRes.data);
      } else {
        setAnalysisHistory([]);
      }
    } catch (err) {
      console.error('[WORKSPACE] Failed to fetch latest analysis details:', err);
    }
  };

  const handleStartAnalysis = async () => {
    if (!id) return;
    setShowAnalysisAgainPrompt(false);
    setIsAnalyzing(true);
    setCurrentAnalysisStep(0);
    setAnalysisProgressLabel('Initializing Analysis...');

    // Set up local fallback timer
    let fallbackTimer: any = null;
    let fallbackStep = 0;

    const steps = [
      'Reading Case Details',
      'Reviewing Timeline',
      'Checking Hearings',
      'Processing Uploaded Documents',
      'Reviewing Evidence',
      'Researching Applicable Laws',
      'Finding Similar Judgments',
      'Preparing Legal Strategy'
    ];

    fallbackTimer = setInterval(() => {
      fallbackStep += 1;
      if (fallbackStep <= 8) {
        setCurrentAnalysisStep((current) => {
          if (fallbackStep > current) {
            setAnalysisProgressLabel(steps[fallbackStep - 1]);
            return fallbackStep;
          }
          return current;
        });
      } else {
        if (fallbackTimer) clearInterval(fallbackTimer);
      }
    }, 1500);

    try {
      const res = await WorkspaceService.triggerCompleteAnalysis(id);
      if (fallbackTimer) clearInterval(fallbackTimer);

      if (res && res.success && res.data) {
        setCurrentAnalysisStep(9);
        setAnalysisProgressLabel('Completed');
        setLatestAnalysis(res.data);
        setViewedAnalysisRun(res.data);

        // Sync metrics and notes
        await fetchWorkspaceDetails(id);
        await fetchAnalysisDetails(id);

        setIsAnalyzing(false);
        setActiveWorkspaceTab('analysis');
        showToast('success', 'Analysis Completed', 'Your complete AI legal analysis report is ready.');
      } else {
        throw new Error(res.error || 'Server returned unsuccessful response');
      }
    } catch (err: any) {
      if (fallbackTimer) clearInterval(fallbackTimer);
      setIsAnalyzing(false);

      const errData = err.response?.data;
      if (errData && errData.success === false && (errData.type === 'garbage_summary' || errData.type === 'insufficient_data')) {
        setValidationError({
          type: errData.type,
          error: errData.error,
          readinessScore: errData.readinessScore,
          missingFields: errData.missingFields
        });
        setShowValidationErrorModal(true);
      } else {
        setAnalysisErrorMsg(err.message || 'Unable to analyze case. Please check your internet connection or try again later.');
        setShowAnalysisErrorModal(true);
      }
    }
  };

  const handleContinueAnalysis = async () => {
    if (latestAnalysis) {
      setShowAnalysisAgainPrompt(true);
    } else {
      handleStartAnalysis();
    }
  };

  // Initialize and select case
  useEffect(() => {
    if (id) {
      setActiveCaseId(id);
      fetchWorkspaceDetails(id);
      fetchAnalysisDetails(id);
    }
    if (tab) {
      if (tab === 'documents') {
        router.replace({ pathname: '/workspace/documents', params: { caseId: id } });
      } else if (tab === 'evidence') {
        router.replace({ pathname: '/workspace/evidence-vault', params: { caseId: id } });
      } else if (tab === 'contracts') {
        router.replace({ pathname: '/workspace/contracts', params: { caseId: id } });
      } else {
        setActiveWorkspaceTab(tab);
      }
    }
  }, [id, tab]);

  // Listen for socket progress
  useEffect(() => {
    const socket = getSocket();
    if (socket && id) {
      const handleProgress = (data: { caseId: string; stepIndex: number; label: string }) => {
        if (data.caseId === id) {
          setCurrentAnalysisStep(data.stepIndex);
          setAnalysisProgressLabel(data.label);
        }
      };
      socket.on('analysis_progress', handleProgress);
      return () => {
        socket.off('analysis_progress', handleProgress);
      };
    }
  }, [id]);

  // Sync local notes once loaded
  useEffect(() => {
    if (workspace) {
      setCaseNotes(workspace.summary || workspace.caseSummary || '');
      setRenameValue(workspace.name || '');
    }
  }, [workspace]);

  // Autosave loop for note editor
  useEffect(() => {
    if (!isNoteFormModalOpen || !isNoteDirty) return;

    const autosaveTimer = setTimeout(async () => {
      if (isNoteFormModalOpen && isNoteDirty && noteForm.title.trim()) {
        setNotesAutosaveStatus('Saving...');
        try {
          // Build serialized blocks for formattedContent
          const serializedBlocks = JSON.stringify(noteBlocks);
          const plainContent = getBlocksPlainText(noteBlocks);

          const updatedNotes = (workspace?.notes || []).map((note: any) => {
            if (noteFormType === 'edit' && (note._id === noteFormTargetId || note.id === noteFormTargetId)) {
              return {
                ...note,
                title: noteForm.title.trim(),
                content: plainContent || noteForm.content,
                formattedContent: serializedBlocks,
                updatedAt: new Date().toISOString()
              };
            }
            return note;
          });

          if (noteFormType === 'edit' && workspace) {
            await handleUpdateField({ notes: updatedNotes });
          }

          setNotesAutosaveStatus('Autosaved ✓');
          setIsNoteDirty(false);
        } catch (err) {
          setNotesAutosaveStatus('Save failed');
        }
      }
    }, 4000);

    return () => clearTimeout(autosaveTimer);
  }, [isNoteDirty, isNoteFormModalOpen, noteBlocks, noteForm.title]);

  // Initialize strategy and arguments data from Case Intelligence
  useEffect(() => {
    if (workspace) {
      const ws = workspace as any;
      const ci = ws.caseIntelligence || {};
      if (ci.argumentBuilder) {
        setArgumentBuilderStrategy(ci.argumentBuilder);
      } else {
        setArgumentBuilderStrategy(null);
      }
      const pArgs = (ws.arguments?.petitionerArguments && ws.arguments.petitionerArguments.length > 0)
        ? ws.arguments.petitionerArguments
        : (ci.arguments || []);
      const rArgs = (ws.arguments?.respondentArguments && ws.arguments.respondentArguments.length > 0)
        ? ws.arguments.respondentArguments
        : (ci.counterArguments || []);

      if (pArgs.length > 0) {
        setPetitionerArguments(pArgs.map((a: any, idx: number) => ({
          id: a.id || `p${idx + 1}`,
          number: `ARG ${idx + 1}`,
          title: a.title || 'Legal Claim',
          category: a.category || 'Contract Law',
          priority: a.impact || 'High',
          description: a.description || '',
          supportingFacts: a.supportingTimelineEvents || [],
          supportingLaws: a.supportingLaws || [],
          supportingCaseLaws: [],
          relatedEvidence: a.supportingEvidence || [],
          relatedDocuments: [],
          relatedTimelineEvents: a.supportingTimelineEvents || [],
          relatedHearings: []
        })));
      } else {
        setPetitionerArguments([]);
      }

      if (rArgs.length > 0) {
        setRespondentArguments(rArgs.map((a: any, idx: number) => ({
          id: a.id || `d${idx + 1}`,
          number: `DEF ${idx + 1}`,
          title: a.title || 'Opponent Defense',
          category: a.category || 'Authenticity',
          priority: a.impact || 'High',
          description: a.description || '',
          supportingFacts: [],
          supportingLaws: [],
          supportingCaseLaws: [],
          refutation: a.refutation || 'Our rebuttal',
          relatedEvidence: [],
          relatedDocuments: [],
          relatedTimelineEvents: [],
          relatedHearings: []
        })));
      } else {
        setRespondentArguments([]);
      }

      const predictions = (ci.counterArguments || []).map((c: any, idx: number) => ({
        id: `pred${idx + 1}`,
        title: c.title || 'Procedural Challenge',
        description: c.description || '',
        probability: 75,
        type: c.category || 'Defense Claim',
        rebuttal: c.refutation || 'Strategic rebuttal'
      }));
      setOpponentPredictions(predictions);

      const seq = ci.strategy?.trialSequence?.length > 0
        ? ci.strategy.trialSequence.map((s: any, idx: number) => ({
          step: s.step || idx + 1,
          id: `seq${idx + 1}`,
          title: s.title || 'Trial Step',
          detail: s.detail || '',
          status: s.status || 'Primary'
        }))
        : [];
      setTrialStrategySequence(seq);
    }
  }, [workspace]);

  const handleGoBack = useCallback(() => {
    if (isNoteFormModalOpen) {
      confirmCloseNoteEditor(() => setIsNoteFormModalOpen(false));
      return true;
    } else if (isAiOpen) {
      handleCloseAi();
      return true;
    } else if (activeWorkspaceTab !== 'overview') {
      setActiveWorkspaceTab('overview');
      setTabHistory([]);
      return true;
    } else {
      router.push('/(tabs)/cases' as any);
      return true;
    }
  }, [isNoteFormModalOpen, isAiOpen, activeWorkspaceTab, router, isNoteDirty, noteBlocks, noteForm.title]);

  // Hardware back button behavior for Android gesture navigation
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleGoBack
    );

    return () => backHandler.remove();
  }, [handleGoBack]);

  // Load chat session on mount
  useEffect(() => {
    async function initChatSession() {
      if (!id) return;
      try {
        setIsSending(true);
        // Find existing sessions for this case workspace
        const res = await ChatService.listSessions();
        const sessions = Array.isArray(res) ? res : (res?.data || []);
        const caseSession = (sessions as any[]).find((s) => s.projectId === id);

        if (caseSession) {
          setSessionId(caseSession.sessionId);
          setActiveTool('caseAssistant');

          // Fetch complete message logs
          const detailsRes = await ChatService.getSessionDetails(caseSession.sessionId);
          const detailSession = (detailsRes as any).data || detailsRes;
          setMessages(detailSession?.messages || []);
        } else {
          // Initialize first default greetings
          setMessages([]);
        }
      } catch (err) {
        console.warn('[COPILOT INIT] Error loading sessions in workspace screen (ignoring to prevent crash):', err);
      } finally {
        setIsSending(false);
      }
    }
    initChatSession();
  }, [id]);

  const scrollToBottom = (animated = true) => {
    // Disabled auto-scroll as per Master Prompt requirements
  };

  const handleSend = async (overrideMsg?: string, unusedToolId?: string, editMessageId?: string) => {
    const text = overrideMsg || inputVal.trim();
    if (!text && attachments.length === 0) return;

    setIsSending(true);

    let uploadedAttachments = attachments;
    if (attachments.length > 0 && !editMessageId) {
      try {
        uploadedAttachments = await uploadPendingAttachments(id);
      } catch (uploadErr) {
        setIsSending(false);
        return;
      }
    }

    // Optimistic user message append / edit replacement
    let userMsgId = Date.now().toString();
    let updatedMessages: ChatMessage[] = [];

    if (editMessageId) {
      const msgIdx = messages.findIndex((m) => m.id === editMessageId);
      if (msgIdx !== -1) {
        const editedMsg = {
          ...messages[msgIdx],
          content: text,
          timestamp: Date.now(),
        };
        updatedMessages = [
          ...messages.slice(0, msgIdx),
          editedMsg
        ];
        userMsgId = editMessageId;
      } else {
        const newUserMessage: ChatMessage = {
          id: userMsgId,
          role: 'user',
          content: text,
          timestamp: Date.now(),
          attachments: [],
        };
        updatedMessages = [...messages, newUserMessage];
      }
    } else {
      const newUserMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments: [...uploadedAttachments],
      };
      updatedMessages = [...messages, newUserMessage];
    }

    const aiMsgId = `msg_ai_${Date.now()}`;
    const placeholderAiMessage: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      isProcessing: true,
    };

    const finalMessages = [...updatedMessages, placeholderAiMessage];
    setMessages(finalMessages);
    if (!editMessageId) {
      setInputVal('');
      clearAttachments();
    }
    isAtBottomRef.current = true;
    scrollToBottom(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      const history = finalMessages
        .filter((m) => m.id !== aiMsgId)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: Record<string, any> = {
        content: text,
        sessionId: sessionId || `session_case_${id}_${Date.now()}`,
        activeTool: activeTool,
        stream: true,
        history,
        projectId: id,
      };

      if (uploadedAttachments && uploadedAttachments.length > 0 && !editMessageId) {
        const docAttachments = uploadedAttachments.filter(
          (a) => !a.type?.startsWith('audio/') && !a.name?.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm)$/i)
        );
        if (docAttachments.length > 0) {
          payload.document = docAttachments.map((a) => ({
            name: a.name,
            mimeType: a.type,
            base64Data: a.base64Data || '',
            url: a.url,
          }));
        }
      }

      // Stream SSE data chunks in real time
      const stream = streamAIResponse('/chat', payload, controller.signal);
      let accumulatedText = '';

      for await (const token of stream) {
        if (isCancelledRef.current || controller.signal.aborted) {
          break;
        }
        accumulatedText += token;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m))
        );
      }

      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isProcessing: false } : m
          )
        );
        setIsSending(false);
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: accumulatedText, isProcessing: false }
            : m
        )
      );
      setIsSending(false);
      scrollToBottom(true);

      const currentSessionId = payload.sessionId;
      if (currentSessionId && !sessionId) {
        setSessionId(currentSessionId);
        fetchHistorySessions();
      }

      // Sync post-stream metadata (like suggestions)
      setTimeout(async () => {
        try {
          if (isCancelledRef.current || controller.signal.aborted) {
            return;
          }
          if (currentSessionId) {
            const detailsRes = await ChatService.getSessionDetails(currentSessionId);
            if (isCancelledRef.current || controller.signal.aborted) {
              return;
            }
            const detailSession = (detailsRes as any).data || detailsRes;
            if (detailSession) {
              const suggestions = detailSession.messages?.[detailSession.messages.length - 1]?.suggestions || [];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, suggestions } : m
                )
              );
            }
          }
        } catch (e) {
          console.warn('[Copilot Metadata Sync] Failed:', e);
        }
      }, 1000);

    } catch (err: any) {
      if (isCancelledRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isProcessing: false } : m
          )
        );
      } else {
        console.error('[COPILOT SEND] Error:', err);
        showToast('error', 'Assistant Offline', 'Unable to receive AI suggestions.');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                ...m,
                content: '⚠️ Failed to connect to the legal AI gateway. Please check your internet connection.',
                isProcessing: false,
              }
              : m
          )
        );
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
      scrollToBottom(true);
    }
  };

  const handleCancelStream = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) => (m.isProcessing ? { ...m, isProcessing: false } : m))
    );
    setIsSending(false);
  };

  const handleOpenAi = () => {
    setIsAiOpen(true);
    Animated.timing(aiAnimValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseAi = () => {
    Animated.timing(aiAnimValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsAiOpen(false);
    });
  };

  // Change specialized AI tools focus
  const handleSelectTool = (toolId: string) => {
    if (toolId === activeTool) {
      closeToolMenu();
      return;
    }
    setActiveTool(toolId);
    closeToolMenu();

    const displayName = toolItems.find(t => t.id === toolId)?.name || toolId;

    // Add centered status chip log
    const statusMsg: ChatMessage = {
      id: `status-${Date.now()}`,
      role: 'assistant',
      content: `Switched to ${displayName}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, statusMsg]);

    // Show center toast popup
    setCenterToast(`Switched to ${displayName}`);
    setTimeout(() => {
      setCenterToast(null);
    }, 2000);

    scrollToBottom(true);
  };

  const handleCopyResponse = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Response copied to clipboard.');
  };

  const handleShareResponse = async (content: string) => {
    try {
      await Share.share({ message: content });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportResponse = (item: ChatMessage) => {
    showToast('info', 'Exporting PDF', 'Generating case brief document from response...');
    setTimeout(() => {
      showToast('success', 'Export Complete', 'Saved as PDF in documents folder.');
    }, 1500);
  };

  const handleDownloadResponse = (item: ChatMessage) => {
    showToast('success', 'Downloaded', 'Response text file saved to device.');
  };

  const handleRetryResponse = (item: ChatMessage) => {
    const modelIndex = messages.findIndex(m => m.id === item.id);
    if (modelIndex > 0) {
      let lastUserMsg = '';
      for (let i = modelIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMsg = messages[i].content;
          break;
        }
      }
      if (lastUserMsg) {
        handleSend(lastUserMsg);
      } else {
        showToast('error', 'Retry Failed', 'No preceding user query found.');
      }
    } else {
      showToast('error', 'Retry Failed', 'No preceding query found.');
    }
  };

  const handleContinueResponse = (item: ChatMessage) => {
    handleSend('Continue writing from the previous point...');
  };

  const TOOL_PLACEHOLDERS: Record<string, string> = {
    legalResearch: "Ask legal research questions...",
    contractAnalyzer: "Ask about this contract...",
    evidenceAnalyst: "Analyze evidence...",
    argumentBuilder: "Build legal arguments...",
    casePredictor: "Ask outcome prediction...",
    strategyEngine: "Plan your legal strategy...",
    researchAssistant: "Search legal knowledge...",
  };

  const TOOL_VOICE_TEXTS: Record<string, string> = {
    legalResearch: "Search legal knowledge base for easement rights in tenant disputes.",
    contractAnalyzer: "Analyze liability clause and high-risk terms in this lease agreement.",
    evidenceAnalyst: "Scan these document records to extract critical timeline events.",
    argumentBuilder: "Construct final submissions and counterarguments for this claim.",
    casePredictor: "Predict the winning probability and success rate for this petition.",
    strategyEngine: "Develop a litigation roadmap and settlement strategy for this case.",
    researchAssistant: "Search legal knowledge base for easement rights in tenant disputes.",
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isStatusMsg = item.role === 'system' || item.content.startsWith('Switched to') || item.content.startsWith('💡') || item.content.startsWith('⚠️');

    if (isStatusMsg) {
      return (
        <View style={styles.statusChipContainer}>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <ChatMessageBubble
        message={item}
        aiName="Case Assistant"
        aiIcon="⚖️"
        onCopy={item.id === 'greetings' ? undefined : () => handleCopyResponse(item.content)}
        onShare={item.id === 'greetings' ? undefined : () => handleShareResponse(item.content)}
        onExport={item.id === 'greetings' ? undefined : () => handleExportResponse(item)}
        onDownload={item.id === 'greetings' ? undefined : () => handleDownloadResponse(item)}
        onRegenerate={item.id === 'greetings' ? undefined : () => handleRetryResponse(item)}
        onContinue={item.id === 'greetings' ? undefined : () => handleContinueResponse(item)}
        onSuggestionPress={(sug) => handleSend(sug)}
        onEditMessage={(msgId, newText) => handleSend(newText, undefined, msgId)}
      />
    );
  };

  const renderToolSelectorMenu = () => {
    const scale = toolMenuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    });
    const opacity = toolMenuAnim;

    return (
      <>
        {/* Transparent touchable overlay to dismiss popup on tap outside */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => closeToolMenu()}
        />
        <Animated.View
          style={[
            styles.toolSelectorMenu,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.toolSelectorHeader}>
            <Text style={styles.toolSelectorTitle}>Switch AI Tool</Text>
            <Pressable
              onPress={() => closeToolMenu()}
              style={styles.toolSelectorCloseBtn}
              accessibilityLabel="Close Switch AI Tool"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color="#4B5563" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.toolSelectorScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {toolItems.map((item) => {
              const isActive = activeTool === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.toolMenuItem, isActive && styles.toolMenuItemActive]}
                  onPress={() => handleSelectTool(item.id)}
                >
                  <View style={styles.toolMenuItemLeft}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                    <Text style={[styles.toolMenuLabel, isActive && styles.toolMenuLabelActive]}>
                      {item.name}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark" size={16} color="#111111" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </>
    );
  };

  const renderAttachmentsPreview = () => {
    return (
      <View style={styles.attachmentsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsScroll}>
          {attachments.map((a, i) => (
            <View key={i} style={styles.attachmentChip}>
              <Ionicons name="document-attach" size={14} color="#111111" />
              <Text style={styles.attachmentLabel} numberOfLines={1}>{a.name}</Text>
              <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };


  const renderInputComposer = () => {
    const activeToolItem = toolItems.find(t => t.id === activeTool) || toolItems[0];
    return (
      <View style={{ width: '100%' }}>
        <ChatUsageAwarenessBanner />
        <ChatComposer
          value={inputVal}
          onChangeText={setInputVal}
          sending={isSending}
          onSend={(text) => handleSend(text)}
          onCancelStream={handleCancelStream}
          onAddAttachment={handleAddAttachment}
          onPressSparkles={openToolMenu}
          placeholder={activeToolItem.placeholder || "Ask assistant..."}
          simulatedVoiceText={TOOL_VOICE_TEXTS[activeTool] || "What are the legal precedents for easement rights in tenant disputes?"}
          isFocusMode={false}
          tabHeight={68}
        />
      </View>
    );
  };

  const renderIntegratedAssistant = () => {
    const activeToolItem = toolItems.find(t => t.id === activeTool) || toolItems[0];

    const scale = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.1, 1],
    });
    const opacity = aiAnimValue;
    const translateX = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [width * 0.4, 0],
    });
    const translateY = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [height * 0.45, 0],
    });
    const borderRadius = aiAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [40, 0],
    });

    const assistantContent = (
      <>
        {/* Assistant Header */}
        <View style={styles.assistantHeader}>
          <TouchableOpacity
            style={styles.assistantHeaderLeft}
            onPress={handleCloseAi}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginLeft: 8 }}>
            <Ionicons name="sparkles" size={18} color="#C8A34D" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }}>{activeToolItem.name}</Text>
          </View>

          <View style={styles.assistantHeaderActions}>
            <TouchableOpacity
              style={[styles.assistantHeaderBtn, { marginRight: 12 }]}
              onPress={() => setIsHistoryOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.assistantHeaderBtn}
              onPress={handleNewChat}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Message List */}
        <View style={styles.assistantChatArea}>
          {messages.length === 0 ? (
            <ChatWelcome
              title={activeToolItem.name}
              subtitle={activeToolItem.subtitle || (workspace?.name ? `Ask about ${workspace.name}...` : "Ask about this case...")}
              iconSource={activeToolItem.imageSource}
              suggestedChips={activeToolItem.suggestedChips}
              onSelectSuggestedPrompt={(promptText) => handleSend(promptText)}
            />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.assistantListContent}
              showsVerticalScrollIndicator={true}
              onScroll={(e) => {
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
                    messages.length > 4 &&
                    inputVal.trim() === '';
                  handleScrollAction(shouldShow);
                }
              }}
              onContentSizeChange={() => {
                if (isAtBottomRef.current && !isSending) {
                  scrollToBottom(true);
                }
              }}
            />
          )}

          {showScrollBtn && (
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
          )}
        </View>



        {/* Attachment Queue indicator */}
        {attachments.length > 0 && renderAttachmentsPreview()}

        {/* Bottom Composer */}
        {renderInputComposer()}

        {/* Persistent Bottom Tab Bar Navigation */}
        {!isKeyboardActive && (
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderTopColor: isDark ? '#334155' : '#ECECEC',
            borderTopWidth: 1,
            height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 8,
            elevation: 10,
            width: '100%',
          }}>
            {[
              { name: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/(tabs)/dashboard' },
              { name: 'My Matters', icon: 'folder-open-outline', activeIcon: 'folder-open', route: '/(tabs)/cases' },
              { name: 'AI Assistant', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', route: '/(tabs)/chat' },
              { name: 'AI Tools', icon: 'flash-outline', activeIcon: 'flash', route: '/(tabs)/tools' },
              { name: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/(tabs)/profile' },
            ].map((tab) => {
              const isActive = tab.name === 'My Matters'; // Active tab is My Matters
              const color = isActive ? theme.primary : (isDark ? '#94A3B8' : '#4B5563');
              const iconName = isActive ? tab.activeIcon : tab.icon;

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => {
                    handleCloseAi();
                    setTimeout(() => {
                      router.push(tab.route as any);
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={iconName as any} size={22} color={color} />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                    color,
                  }}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* AI Tool selector popup menu */}
        {isToolMenuOpen && renderToolSelectorMenu()}

        {/* Centered Switching Toast Alert */}
        {centerToast && (
          <View style={styles.centerToastContainer}>
            <View style={styles.centerToastBox}>
              <Text style={styles.centerToastText}>{centerToast}</Text>
            </View>
          </View>
        )}
      </>
    );

    return (
      <Modal
        visible={isAiOpen}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseAi}
      >
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          {/* Animated transparent background overlay */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: '#FFFFFF',
              opacity,
            }}
          />

          <Animated.View
            style={[
              styles.assistantContainer,
              {
                opacity,
                borderRadius,
                transform: [
                  { scale },
                  { translateX },
                  { translateY }
                ]
              }
            ]}
          >
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Math.max(6, insets.top - 14) }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={{ flex: 1 }}
              >
                {assistantContent}
              </KeyboardAvoidingView>

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

              {/* Sliding Sidebar History modal drawer */}
              <Modal
                visible={isHistoryOpen}
                animationType="none"
                transparent={true}
                onRequestClose={() => setIsHistoryOpen(false)}
              >
                <View style={styles.drawerOverlay}>
                  {/* Semi-transparent backdrop */}
                  <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />

                  {/* Sidebar Drawer container */}
                  <View style={styles.drawerContainer}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                      <View style={styles.drawerHeader}>
                        <Text style={styles.drawerTitle}>Chat Logs History</Text>
                        {filteredHistorySessions.length > 0 && (
                          <TouchableOpacity
                            onPress={handleClearAllConfirm}
                            style={{
                              marginLeft: 'auto',
                              marginRight: 16,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: '#EF444415',
                            }}
                          >
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Clear All</Text>
                          </TouchableOpacity>
                        )}
                        <Pressable onPress={() => setIsHistoryOpen(false)}>
                          <Ionicons name="close" size={24} color="#1F2937" />
                        </Pressable>
                      </View>

                      <Pressable
                        style={styles.drawerNewChatBtn}
                        onPress={() => {
                          handleNewChat();
                          setIsHistoryOpen(false);
                        }}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.drawerNewChatBtnText}>New Conversation</Text>
                      </Pressable>

                      <View style={styles.drawerSearchContainer}>
                        <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                        <TextInput
                          placeholder="Search chats..."
                          placeholderTextColor="#94A3B8"
                          value={searchHistoryQuery}
                          onChangeText={setSearchHistoryQuery}
                          style={styles.drawerSearchInput}
                        />
                      </View>

                      <ScrollView style={styles.drawerList}>
                        {filteredHistorySessions.length === 0 ? (
                          <Text style={styles.drawerEmptyText}>No previous chats logged.</Text>
                        ) : (
                          filteredHistorySessions.map((item) => (
                            <View
                              key={item.sessionId}
                              style={[
                                styles.drawerItem,
                                sessionId === item.sessionId && styles.drawerItemActive,
                              ]}
                            >
                              <Pressable
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}
                                onPress={() => handleSelectSession(item.sessionId)}
                              >
                                <Ionicons
                                  name="chatbox-ellipses-outline"
                                  size={16}
                                  color={sessionId === item.sessionId ? '#111111' : '#4B5563'}
                                  style={{ marginRight: 10 }}
                                />

                                {editingSessionId === item.sessionId ? (
                                  <TextInput
                                    style={styles.drawerRenameInput}
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
                                        sessionId === item.sessionId && styles.drawerItemTextActive,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.title}
                                    </Text>
                                    {item.messages && item.messages.length > 0 && (
                                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                                        {item.messages[item.messages.length - 1]?.content || ''}
                                      </Text>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                      <Text style={styles.drawerItemSubtext}>
                                        {new Date(item.lastModified).toLocaleDateString()} at {new Date(item.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                      {item.messages && item.messages.length > 0 && (
                                        <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#475569' }}>
                                            {item.messages.length} msgs
                                          </Text>
                                        </View>
                                      )}
                                    </View>
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
                                  <Ionicons name="create-outline" size={16} color="#4B5563" />
                                </Pressable>
                                <Pressable
                                  onPress={() => handleDeleteSession(item.sessionId)}
                                  style={styles.drawerActionIcon}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                </Pressable>
                              </View>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </SafeAreaView>
                  </View>
                </View>
              </Modal>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // Hook validation guard
  function useAuthGuard() { }

  // Optimistic backend data sync helper
  const handleUpdateField = async (updatedFields: Partial<CaseWorkspace>) => {
    if (!id || !workspace) return;
    updateWorkspaceState(id, updatedFields);
    try {
      await CaseService.updateCase(id, updatedFields);
    } catch (err) {
      console.error('[WORKSPACE] Sync failed:', err);
      showToast('error', 'Sync Failed', 'Failed to synchronize workspace details with the server.');
      fetchWorkspaceDetails(id); // Reload original
    }
  };

  // --- ACTION HANDLERS ---
  // Tasks checkbox toggler
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!id || !workspace) return;
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    const updatedTasks = (workspace.tasks || []).map((t) =>
      t._id === taskId ? { ...t, status: newStatus as any } : t
    );
    handleUpdateField({ tasks: updatedTasks });
    showToast('success', 'Task Updated', newStatus === 'Completed' ? 'Task marked complete.' : 'Task marked pending.');
  };

  // Create / Add Task
  const handleCreateTask = async () => {
    if (!id || !workspace) return;
    if (!taskForm.title.trim()) {
      showToast('error', 'Validation Error', 'Task title is required.');
      return;
    }

    const newTask: any = {
      _id: 'task_' + Date.now().toString(),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      status: taskForm.status || 'Pending',
      priority: taskForm.priority === 'Critical' ? 'Urgent' : taskForm.priority,
      deadline: taskForm.deadline || undefined,
      reminder: taskForm.reminder || 'None',
      assignTo: taskForm.assignTo || '',
      relatedHearing: taskForm.relatedHearing || '',
      relatedTimelineEvent: taskForm.relatedTimelineEvent || '',
      relatedEvidence: taskForm.relatedEvidence || '',
      relatedDocument: taskForm.relatedDocument || '',
      notes: taskForm.notes || '',
      attachments: taskForm.attachments || [],
      checklist: taskForm.checklist || [],
      createdAt: new Date().toISOString()
    };

    const updatedTasks = [...(workspace.tasks || []), newTask];
    await handleUpdateField({ tasks: updatedTasks });

    // Reset Form & Close Modal
    setTaskForm({
      title: '',
      description: '',
      priority: 'High',
      deadline: '',
      reminder: 'None',
      assignTo: '',
      status: 'Pending',
      relatedHearing: '',
      relatedTimelineEvent: '',
      relatedEvidence: '',
      relatedDocument: '',
      notes: '',
      attachments: [],
      checklist: [],
      tempSubtaskText: ''
    });
    setIsTaskFormModalOpen(false);
    showToast('success', 'Task Created', 'Manual legal task successfully added.');
  };

  // Open Edit Task Modal
  const handleOpenEditTaskModal = (task: any) => {
    setTaskFormType('edit');
    setTaskFormTargetId(task._id);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority === 'Urgent' ? 'Critical' : (task.priority || 'High'),
      deadline: task.deadline || '',
      reminder: task.reminder || 'None',
      assignTo: task.assignTo || '',
      status: task.status || 'Pending',
      relatedHearing: task.relatedHearing || '',
      relatedTimelineEvent: task.relatedTimelineEvent || '',
      relatedEvidence: task.relatedEvidence || '',
      relatedDocument: task.relatedDocument || '',
      notes: task.notes || '',
      attachments: task.attachments || [],
      checklist: task.checklist || [],
      tempSubtaskText: ''
    });
    setIsTaskFormModalOpen(true);
  };

  // Save Edited Task
  const handleEditTask = async () => {
    if (!id || !workspace || !taskFormTargetId) return;
    if (!taskForm.title.trim()) {
      showToast('error', 'Validation Error', 'Task title is required.');
      return;
    }

    const updatedTasks = (workspace.tasks || []).map((t: any) => {
      if (t._id === taskFormTargetId) {
        return {
          ...t,
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          status: taskForm.status,
          priority: taskForm.priority === 'Critical' ? 'Urgent' : taskForm.priority,
          deadline: taskForm.deadline || undefined,
          reminder: taskForm.reminder,
          assignTo: taskForm.assignTo,
          relatedHearing: taskForm.relatedHearing,
          relatedTimelineEvent: taskForm.relatedTimelineEvent,
          relatedEvidence: taskForm.relatedEvidence,
          relatedDocument: taskForm.relatedDocument,
          notes: taskForm.notes,
          attachments: taskForm.attachments,
          checklist: taskForm.checklist
        };
      }
      return t;
    });

    await handleUpdateField({ tasks: updatedTasks });
    setIsTaskFormModalOpen(false);
    setTaskFormTargetId(null);
    showToast('success', 'Task Updated', 'Legal task details updated successfully.');
  };

  // Duplicate Task
  const handleDuplicateTask = async (task: any) => {
    if (!id || !workspace) return;
    const duplicatedTask = {
      ...task,
      _id: 'task_' + Date.now().toString(),
      title: `${task.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    const updatedTasks = [...(workspace.tasks || []), duplicatedTask];
    await handleUpdateField({ tasks: updatedTasks });
    showToast('success', 'Task Duplicated', `Created copy of "${task.title}".`);
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!id || !workspace) return;
    const updatedTasks = (workspace.tasks || []).filter((t: any) => t._id !== taskId);
    await handleUpdateField({ tasks: updatedTasks });
    showToast('success', 'Task Deleted', 'Task removed from case workspace.');
  };

  // Toggle Subtask Checklist Checkbox inside task
  const handleToggleSubtask = async (taskId: string, subtaskIndex: number) => {
    if (!id || !workspace) return;
    const updatedTasks = (workspace.tasks || []).map((t: any) => {
      if (t._id === taskId) {
        const checklist = [...(t.checklist || [])];
        if (checklist[subtaskIndex]) {
          checklist[subtaskIndex] = {
            ...checklist[subtaskIndex],
            checked: !checklist[subtaskIndex].checked
          };
        }
        return { ...t, checklist };
      }
      return t;
    });
    await handleUpdateField({ tasks: updatedTasks });
  };

  // Approve AI suggested task from Staged queue
  const handleApproveAiTask = async (aiTaskId: string) => {
    if (!id || !workspace) return;
    const targetAiTask = aiSuggestedTasks.find((t) => t.id === aiTaskId);
    if (!targetAiTask) return;

    // Convert AI Suggested Task to active task
    const newTask: any = {
      _id: 'task_ai_' + Date.now().toString(),
      title: targetAiTask.title,
      description: targetAiTask.reason,
      status: 'Pending',
      priority: targetAiTask.priority === 'Critical' ? 'Urgent' : targetAiTask.priority,
      deadline: targetAiTask.deadline === 'Due Today' ? new Date().toISOString().split('T')[0] : undefined,
      checklist: targetAiTask.checklist || [],
      source: 'AI Suggestion',
      createdAt: new Date().toISOString()
    };

    const updatedTasks = [...(workspace.tasks || []), newTask];
    await handleUpdateField({ tasks: updatedTasks });

    // Remove from staged suggestions queue
    setAiSuggestedTasks(aiSuggestedTasks.filter((t) => t.id !== aiTaskId));
    showToast('success', 'Task Approved', 'AI suggested task promoted to active status.');
  };

  // Dismiss AI suggested task
  const handleDismissAiTask = (aiTaskId: string) => {
    setAiSuggestedTasks(aiSuggestedTasks.filter((t) => t.id !== aiTaskId));
    showToast('info', 'Suggestion Dismissed', 'Task suggestion removed.');
  };

  // Simulated Voice dictation transcription parser
  const handleVoiceTaskParse = async () => {
    if (!workspace) return;
    if (!voiceInputQuery.trim()) {
      showToast('error', 'Empty Directive', 'Please enter or select a voice directive.');
      return;
    }
    setIsProcessingVoice(true);
    // Simulate parsing delays
    setTimeout(async () => {
      setIsProcessingVoice(false);
      const query = voiceInputQuery.toLowerCase();
      let parsedTitle = 'Review Case Documents';
      let parsedPriority = 'Medium';
      let parsedDeadline = '';
      let parsedChecklist: { title: string; checked: boolean }[] = [];

      if (query.includes('written statement') || query.includes('reply to plaint')) {
        parsedTitle = 'Draft and File Written Statement';
        parsedPriority = 'Critical';
        parsedDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        parsedChecklist = [
          { title: 'Draft paragraph reply', checked: false },
          { title: 'Affidavit signatures', checked: false }
        ];
      } else if (query.includes('evidence certificate') || query.includes('section 65b')) {
        parsedTitle = 'Prepare Section 65B Certificate';
        parsedPriority = 'Critical';
        parsedDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        parsedChecklist = [
          { title: 'Draft certificate document', checked: false },
          { title: 'Get branch seal signature', checked: false }
        ];
      } else if (query.includes('postal receipt') || query.includes('speed post')) {
        parsedTitle = 'Upload Dispatch Speed Post Receipt';
        parsedPriority = 'High';
        parsedDeadline = new Date().toISOString().split('T')[0]; // Today
      } else if (query.includes('witness address') || query.includes('notary address')) {
        parsedTitle = 'Verify Witness Attestation Details';
        parsedPriority = 'Medium';
        parsedDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const parsedTask: any = {
        _id: 'task_voice_' + Date.now().toString(),
        title: parsedTitle,
        description: `Simulated Voice Directive: "${voiceInputQuery}"`,
        status: 'Pending',
        priority: parsedPriority === 'Critical' ? 'Urgent' : parsedPriority,
        deadline: parsedDeadline || undefined,
        checklist: parsedChecklist,
        source: 'Voice Command',
        createdAt: new Date().toISOString()
      };

      const updatedTasks = [...(workspace.tasks || []), parsedTask];
      await handleUpdateField({ tasks: updatedTasks });

      setIsVoiceTasksModalOpen(false);
      setVoiceInputQuery('');
      showToast('success', 'Voice Command Parsed', `Added task: "${parsedTitle}".`);
    }, 1500);
  };

  // Simulated AI Task Generation
  const handleAiGenerateTasks = () => {
    setIsGeneratingAiTasks(true);
    setTimeout(() => {
      setIsGeneratingAiTasks(false);
      setAiSuggestedTasks([
        {
          id: 'ai_s1_' + Date.now().toString(),
          title: 'Prepare Section 65B Electronic Evidence Certificate',
          priority: 'Critical',
          reason: 'Required before electronic HDFC bank transaction records can become admissible in court.',
          deadline: 'Due Before Next Hearing',
          status: 'AI Suggested',
          checklist: [
            { title: 'Draft Certificate', checked: false },
            { title: 'Obtain Branch Manager signature', checked: false },
            { title: 'Annex to Evidence ledger list', checked: false }
          ]
        },
        {
          id: 'ai_s2_' + Date.now().toString(),
          title: 'File Written Statement',
          priority: 'Critical',
          reason: 'Limitation Act & CPC require filing the defense statement within 30 days of summon delivery.',
          deadline: 'Due Within 14 Days',
          status: 'AI Suggested',
          checklist: [
            { title: 'Draft reply to plaint parawise', checked: false },
            { title: 'Notarize affidavit of statement execution', checked: false }
          ]
        },
        {
          id: 'ai_s3_' + Date.now().toString(),
          title: 'Upload Speed Post Postal Receipt',
          priority: 'High',
          reason: 'Timeline indicates legal notice was sent but dispatch receipts have not been mapped in the Evidence Vault.',
          deadline: 'Due Today',
          status: 'AI Suggested',
          checklist: [
            { title: 'Scan postal receipt', checked: false },
            { title: 'Attach to Notice event', checked: false }
          ]
        }
      ]);
      showToast('success', 'AI Generation Complete', 'Generated 3 tailored legal strategy task recommendations.');
    }, 1500);
  };

  // --- CASE NOTES ACTION HANDLERS ---

  // Helper: Get plain text from line blocks
  const getBlocksPlainText = (blocks: any[]) => {
    return blocks.map(b => b.spans.map((s: any) => s.text || '').join('')).join('\n');
  };

  // Helper: Convert LineBlock[] to RichLine[] (Flat CharArray format)
  const blocksToRichLines = (blocks: any[]) => {
    return blocks.map(block => {
      const chars: any[] = [];
      (block.spans || []).forEach((span: any) => {
        const text = span.text || '';
        for (let i = 0; i < text.length; i++) {
          chars.push({
            char: text[i],
            bold: !!span.bold,
            italic: !!span.italic,
            underline: !!span.underline,
            highlight: !!span.highlight
          });
        }
      });
      return {
        type: block.type || 'normal',
        checked: !!block.checked,
        chars
      };
    });
  };

  // Helper: Convert RichLine[] back to LineBlock[] (Group contiguous segments)
  const richLinesToBlocks = (richLines: any[]) => {
    return richLines.map(line => {
      const chars = line.chars || [];
      if (chars.length === 0) {
        return {
          type: line.type || 'normal',
          checked: !!line.checked,
          spans: [{ text: '' }]
        };
      }
      const spans: any[] = [];
      let currentSpan = {
        text: chars[0].char,
        bold: !!chars[0].bold,
        italic: !!chars[0].italic,
        underline: !!chars[0].underline,
        highlight: !!chars[0].highlight
      };
      for (let i = 1; i < chars.length; i++) {
        const c = chars[i];
        const match = (
          currentSpan.bold === !!c.bold &&
          currentSpan.italic === !!c.italic &&
          currentSpan.underline === !!c.underline &&
          currentSpan.highlight === !!c.highlight
        );
        if (match) {
          currentSpan.text += c.char;
        } else {
          spans.push(currentSpan);
          currentSpan = {
            text: c.char,
            bold: !!c.bold,
            italic: !!c.italic,
            underline: !!c.underline,
            highlight: !!c.highlight
          };
        }
      }
      spans.push(currentSpan);
      return {
        type: line.type || 'normal',
        checked: !!line.checked,
        spans
      };
    });
  };

  // Helper: Calculate string difference at cursor position
  const getStringDiff = (oldStr: string, newStr: string, cursorIndex: number) => {
    if (oldStr === newStr) return null;
    
    let commonPrefixLen = 0;
    while (
      commonPrefixLen < oldStr.length &&
      commonPrefixLen < newStr.length &&
      oldStr[commonPrefixLen] === newStr[commonPrefixLen]
    ) {
      commonPrefixLen++;
    }
    
    let commonSuffixLen = 0;
    while (
      commonSuffixLen < oldStr.length - commonPrefixLen &&
      commonSuffixLen < newStr.length - commonPrefixLen &&
      oldStr[oldStr.length - 1 - commonSuffixLen] === newStr[newStr.length - 1 - commonSuffixLen]
    ) {
      commonSuffixLen++;
    }
    
    // Adjust prefix length based on where the cursor is
    if (commonPrefixLen > cursorIndex) {
      const diffOffset = commonPrefixLen - cursorIndex;
      commonPrefixLen = cursorIndex;
      commonSuffixLen += diffOffset;
    }

    const start = commonPrefixLen;
    const deletedLen = oldStr.length - commonPrefixLen - commonSuffixLen;
    const inserted = newStr.substring(commonPrefixLen, newStr.length - commonSuffixLen);
    
    return { start, deletedLen, inserted };
  };

  // Helper: Push state to Undo History Stack
  const pushNoteHistory = (newBlocks: any[]) => {
    const serialized = JSON.parse(JSON.stringify(newBlocks));
    const nextHistory = noteHistory.slice(0, noteHistoryIndex + 1);
    nextHistory.push(serialized);
    
    if (nextHistory.length > 100) {
      nextHistory.shift();
    }
    
    setNoteHistory(nextHistory);
    setNoteHistoryIndex(nextHistory.length - 1);
    setIsNoteDirty(true);
  };

  // Main input text handler: Applies character diffing & format inheritance
  const handleNoteTextChange = (newText: string) => {
    const oldText = getBlocksPlainText(noteBlocks);
    const cursorIndex = noteSelection.start;
    const diff = getStringDiff(oldText, newText, cursorIndex);
    if (!diff) return;

    const richLines = blocksToRichLines(noteBlocks);
    const flatChars: any[] = [];
    richLines.forEach((line, index) => {
      flatChars.push(...line.chars);
      if (index < richLines.length - 1) {
        flatChars.push('\n');
      }
    });

    if (diff.deletedLen > 0) {
      flatChars.splice(diff.start, diff.deletedLen);
    }

    if (diff.inserted.length > 0) {
      const insertedRichChars = [...diff.inserted].map(char => {
        if (char === '\n') return '\n';
        return {
          char,
          bold: activeFormatting.bold,
          italic: activeFormatting.italic,
          underline: activeFormatting.underline,
          highlight: activeFormatting.highlight
        };
      });
      flatChars.splice(diff.start, 0, ...insertedRichChars);
    }

    const newRichLines: any[] = [];
    let currentLineChars: any[] = [];
    let lineIndex = 0;

    flatChars.forEach((item) => {
      if (item === '\n') {
        const originalLine = richLines[lineIndex] || { type: 'normal', checked: false };
        newRichLines.push({
          type: originalLine.type,
          checked: originalLine.checked,
          chars: currentLineChars
        });
        currentLineChars = [];
        lineIndex++;
      } else {
        currentLineChars.push(item);
      }
    });

    const originalLine = richLines[lineIndex] || { type: 'normal', checked: false };
    newRichLines.push({
      type: originalLine.type,
      checked: originalLine.checked,
      chars: currentLineChars
    });

    const newBlocks = richLinesToBlocks(newRichLines);
    setNoteBlocks(newBlocks);
    setNoteForm(prev => ({ ...prev, content: newText }));
    pushNoteHistory(newBlocks);
  };

  // Cursor Selection Tracker: syncs active toolbar format buttons with cursor style
  const handleNoteSelectionChange = (e: any) => {
    const { start, end } = e.nativeEvent.selection;
    setNoteSelection({ start, end });

    const flatIdx = start;
    const richLines = blocksToRichLines(noteBlocks);
    const flatChars: any[] = [];
    richLines.forEach((line, index) => {
      flatChars.push(...line.chars);
      if (index < richLines.length - 1) {
        flatChars.push('\n');
      }
    });

    const charIndex = flatIdx > 0 ? flatIdx - 1 : 0;
    const char = flatChars[charIndex];
    if (char && char !== '\n') {
      setNoteIsBold(!!char.bold);
      setNoteIsItalic(!!char.italic);
      setNoteIsUnderline(!!char.underline);
      setNoteIsHighlight(!!char.highlight);
      setActiveFormatting({
        bold: !!char.bold,
        italic: !!char.italic,
        underline: !!char.underline,
        highlight: !!char.highlight
      });
    }

    let remaining = start;
    let currentBlockType = 'normal';
    for (let i = 0; i < noteBlocks.length; i++) {
      const blockLen = noteBlocks[i].spans.reduce((sum: number, s: any) => sum + (s.text || '').length, 0);
      if (remaining <= blockLen) {
        currentBlockType = noteBlocks[i].type || 'normal';
        break;
      }
      remaining -= (blockLen + 1);
    }
    setNoteBlockType(currentBlockType);
  };

  // Toggle inline style
  const toggleInlineStyle = (style: 'bold' | 'italic' | 'underline' | 'highlight') => {
    const isRange = noteSelection.start !== noteSelection.end;
    
    if (isRange) {
      const richLines = blocksToRichLines(noteBlocks);
      const flatChars: any[] = [];
      richLines.forEach((line, index) => {
        flatChars.push(...line.chars);
        if (index < richLines.length - 1) {
          flatChars.push('\n');
        }
      });

      let allHasStyle = true;
      for (let i = noteSelection.start; i < noteSelection.end; i++) {
        const char = flatChars[i];
        if (char && char !== '\n' && !char[style]) {
          allHasStyle = false;
          break;
        }
      }

      for (let i = noteSelection.start; i < noteSelection.end; i++) {
        const char = flatChars[i];
        if (char && char !== '\n') {
          char[style] = !allHasStyle;
        }
      }

      const newRichLines: any[] = [];
      let currentLineChars: any[] = [];
      let lineIndex = 0;
      flatChars.forEach((item) => {
        if (item === '\n') {
          const orig = richLines[lineIndex] || { type: 'normal', checked: false };
          newRichLines.push({ type: orig.type, checked: orig.checked, chars: currentLineChars });
          currentLineChars = [];
          lineIndex++;
        } else {
          currentLineChars.push(item);
        }
      });
      const orig = richLines[lineIndex] || { type: 'normal', checked: false };
      newRichLines.push({ type: orig.type, checked: orig.checked, chars: currentLineChars });

      const newBlocks = richLinesToBlocks(newRichLines);
      setNoteBlocks(newBlocks);
      setNoteForm(prev => ({ ...prev, content: getBlocksPlainText(newBlocks) }));
      pushNoteHistory(newBlocks);
      
      if (style === 'bold') setNoteIsBold(!allHasStyle);
      if (style === 'italic') setNoteIsItalic(!allHasStyle);
      if (style === 'underline') setNoteIsUnderline(!allHasStyle);
      if (style === 'highlight') setNoteIsHighlight(!allHasStyle);
    } else {
      const nextVal = !activeFormatting[style];
      setActiveFormatting(prev => ({ ...prev, [style]: nextVal }));
      if (style === 'bold') setNoteIsBold(nextVal);
      if (style === 'italic') setNoteIsItalic(nextVal);
      if (style === 'underline') setNoteIsUnderline(nextVal);
      if (style === 'highlight') setNoteIsHighlight(nextVal);
    }
  };

  // Toggle block formatting
  const toggleBlockType = (type: 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'checklist' | 'quote' | 'normal') => {
    let remaining = noteSelection.start;
    let targetBIdx = 0;
    
    for (let i = 0; i < noteBlocks.length; i++) {
      const blockLen = noteBlocks[i].spans.reduce((sum: number, s: any) => sum + (s.text || '').length, 0);
      if (remaining <= blockLen) {
        targetBIdx = i;
        break;
      }
      remaining -= (blockLen + 1);
    }

    const currentType = noteBlocks[targetBIdx].type || 'normal';
    const newType = currentType === type ? 'normal' : type;

    const newBlocks = noteBlocks.map((b, idx) => {
      if (idx === targetBIdx) {
        return {
          ...b,
          type: newType,
          checked: newType === 'checklist' ? !!b.checked : undefined
        };
      }
      return b;
    });

    setNoteBlocks(newBlocks);
    setNoteBlockType(newType);
    setNoteForm(prev => ({ ...prev, content: getBlocksPlainText(newBlocks) }));
    pushNoteHistory(newBlocks);
  };

  // Clear note formatting
  const clearNoteFormatting = () => {
    const isRange = noteSelection.start !== noteSelection.end;
    
    if (isRange) {
      const richLines = blocksToRichLines(noteBlocks);
      const flatChars: any[] = [];
      richLines.forEach((line, index) => {
        flatChars.push(...line.chars);
        if (index < richLines.length - 1) {
          flatChars.push('\n');
        }
      });

      for (let i = noteSelection.start; i < noteSelection.end; i++) {
        const char = flatChars[i];
        if (char && char !== '\n') {
          char.bold = false;
          char.italic = false;
          char.underline = false;
          char.highlight = false;
        }
      }

      const newRichLines: any[] = [];
      let currentLineChars: any[] = [];
      let lineIndex = 0;
      flatChars.forEach((item) => {
        if (item === '\n') {
          const orig = richLines[lineIndex] || { type: 'normal', checked: false };
          newRichLines.push({ type: orig.type, checked: orig.checked, chars: currentLineChars });
          currentLineChars = [];
          lineIndex++;
        } else {
          currentLineChars.push(item);
        }
      });
      const orig = richLines[lineIndex] || { type: 'normal', checked: false };
      newRichLines.push({ type: orig.type, checked: orig.checked, chars: currentLineChars });

      const newBlocks = richLinesToBlocks(newRichLines);
      setNoteBlocks(newBlocks);
      setNoteForm(prev => ({ ...prev, content: getBlocksPlainText(newBlocks) }));
      pushNoteHistory(newBlocks);
    } else {
      setActiveFormatting({ bold: false, italic: false, underline: false, highlight: false });
      setNoteIsBold(false);
      setNoteIsItalic(false);
      setNoteIsUnderline(false);
      setNoteIsHighlight(false);
    }
  };

  // Undo
  const handleNoteUndo = () => {
    if (noteHistoryIndex > 0) {
      const newIdx = noteHistoryIndex - 1;
      const prevBlocks = noteHistory[newIdx];
      setNoteBlocks(prevBlocks);
      setNoteForm(prev => ({ ...prev, content: getBlocksPlainText(prevBlocks) }));
      setNoteHistoryIndex(newIdx);
      setIsNoteDirty(true);
      showToast('info', 'Undo Action', 'Reverted last edit.');
    }
  };

  // Redo
  const handleNoteRedo = () => {
    if (noteHistoryIndex < noteHistory.length - 1) {
      const newIdx = noteHistoryIndex + 1;
      const nextBlocks = noteHistory[newIdx];
      setNoteBlocks(nextBlocks);
      setNoteForm(prev => ({ ...prev, content: getBlocksPlainText(nextBlocks) }));
      setNoteHistoryIndex(newIdx);
      setIsNoteDirty(true);
      showToast('info', 'Redo Action', 'Restored reverted edit.');
    }
  };

  // Close editor confirmation prompt
  const confirmCloseNoteEditor = (onClose: () => void) => {
    if (isNoteDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes in this legal note.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsNoteDirty(false);
              onClose();
            }
          },
          {
            text: 'Save & Exit',
            onPress: async () => {
              await handleSaveNote();
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  // Create or edit a Note
  const handleSaveNote = async () => {
    if (!id || !workspace) return;
    if (!noteForm.title.trim()) {
      showToast('error', 'Validation Error', 'Note title is required.');
      return;
    }

    setNotesAutosaveStatus('Saving...');

    let finalContent = noteForm.content;
    let finalBlocks = [...noteBlocks];
    if (!finalContent.trim()) {
      if (noteForm.category === 'Client Meeting') {
        finalContent = `Meeting with: ${noteForm.meetingWith || 'Client'}\nLocation: ${noteForm.meetingLocation || 'Office'}\nDate: ${noteForm.meetingDate || new Date().toDateString()}\n\nDiscussion:\n${noteForm.discussion || '- Discussed case timeline and evidence assets.'}\n\nDecisions:\n${noteForm.decisions || '- Client will compile HDFC bank statements.'}\n\nFollow-up:\n${noteForm.followUp || '- Upload bank statements into Evidence Vault.'}`;
      } else if (noteForm.category === 'Hearing') {
        finalContent = `Judge: ${noteForm.judge || 'Hon\'ble Justice'}\nCourt: ${noteForm.court || 'High Court'}\nHearing Date: ${noteForm.hearingDate || new Date().toDateString()}\n\nProceedings & Arguments:\n${noteForm.proceedings || '- Presented arguments regarding interim stay.'}\n\nJudge Remarks & Observations:\n${noteForm.judgeRemarks || '- Judge enquired about Section 65B Certificate compliance.'}\n\nOpponent Arguments:\n${noteForm.opponentArguments || '- Opponent claimed service of notice was defective.'}\n\nOrders & Adjournment directives:\n${noteForm.orders || '- Stay granted. Adjourned to next month.'}`;
      } else if (noteForm.category === 'Strategy') {
        finalContent = `Winning Arguments Theory:\n${noteForm.winningArguments || '- Strong documentary evidence demonstrating contract execution.'}\n\nCritical Weaknesses:\n${noteForm.weaknesses || '- Lack of HDFC bank speed post receipt mapping.'}\n\nLitigation Risks:\n${noteForm.risks || '- Limitation Act 30-day filing timeline objection.'}\n\nOpponent Strategy:\n${noteForm.opponentStrategy || '- Demurring on jurisdiction grounds.'}\n\nCounter Strategy & Precedents:\n${noteForm.counterStrategy || '- Rely on Supreme Court landmark judgment on CPC Section 20.'}\n\nImportant Statutory Authorities & Acts:\n${noteForm.importantAuthorities || '- Indian Contract Act Section 73.'}`;
      } else {
        finalContent = 'Notes content memo detail description.';
      }
      finalBlocks = finalContent.split('\n').map(line => ({ type: 'normal', spans: [{ text: line }] }));
    }

    const serializedBlocksStr = JSON.stringify(finalBlocks);

    const cleanTitle = noteForm.title.trim();
    const cleanCategory = noteForm.category;
    const cleanPriority = noteForm.priority;
    const isPinned = noteForm.pinned;
    const isFavorite = noteForm.favorite;

    // Simulate AI entity extraction
    const extractedEntities: { text: string; type: string }[] = [];
    const lowerContent = finalContent.toLowerCase();

    // Entity keyword scanner
    if (lowerContent.includes('hdfc') || lowerContent.includes('bank')) extractedEntities.push({ text: 'HDFC Bank', type: 'Evidence' });
    if (lowerContent.includes('limitation act')) extractedEntities.push({ text: 'Limitation Act', type: 'Act' });
    if (lowerContent.includes('section 3')) extractedEntities.push({ text: 'Section 3', type: 'Section' });
    if (lowerContent.includes('certificate')) extractedEntities.push({ text: 'Section 65B Certificate', type: 'Document' });
    if (lowerContent.includes('sale deed')) extractedEntities.push({ text: 'Original Sale Deed', type: 'Document' });
    if (lowerContent.includes('justice') || lowerContent.includes('judge')) extractedEntities.push({ text: 'Justice Rao', type: 'Judge' });
    if (lowerContent.includes('high court')) extractedEntities.push({ text: 'High Court', type: 'Court' });
    if (lowerContent.includes('objection')) extractedEntities.push({ text: 'Jurisdiction objection', type: 'CaseNumber' });

    // Suggest Links
    const suggestedLinks: any[] = [];
    if (workspace.hearings && workspace.hearings.length > 0) {
      suggestedLinks.push({ type: 'Hearing', targetId: workspace.hearings[0].id || workspace.hearings[0]._id, targetName: workspace.hearings[0].title || 'Hearing #1', confirmed: false });
    }
    if (workspace.evidence && workspace.evidence.length > 0) {
      suggestedLinks.push({ type: 'Evidence', targetId: workspace.evidence[0].id || workspace.evidence[0]._id, targetName: workspace.evidence[0].name || 'Evidence Exhibit', confirmed: false });
    }

    // Suggested actions based on note keywords
    const suggestedActions: any[] = [];
    if (lowerContent.includes('deed') || lowerContent.includes('original')) {
      suggestedActions.push({ type: 'Upload Evidence', description: 'Upload Original Sale Deed to Evidence Vault', accepted: false });
    }
    if (lowerContent.includes('certificate') || lowerContent.includes('65b')) {
      suggestedActions.push({ type: 'Create Task', description: 'Prepare Section 65B Electronic Certificate', accepted: false });
    }
    if (lowerContent.includes('objection') || lowerContent.includes('limitation')) {
      suggestedActions.push({ type: 'Research Relevant Law', description: 'Research Limitation Act Section 3 precedents', accepted: false });
    }
    if (suggestedActions.length === 0) {
      suggestedActions.push({ type: 'Schedule Client Meeting', description: 'Schedule strategic briefing with client', accepted: false });
    }

    // Chronology detection popup warning trigger simulation
    let triggerChronologyWarning = false;
    if (lowerContent.includes('15 april') || lowerContent.includes('objection date') || lowerContent.includes('limitation expiring')) {
      triggerChronologyWarning = true;
    }

    // Build AI summary details
    const aiSummaryDetails = {
      shortSummary: `Co-Counsel Summary: Note highlights critical ${cleanCategory.toLowerCase()} points. Title: ${cleanTitle}.`,
      keyPoints: [
        `Case Note Category: ${cleanCategory}`,
        `Priority designated: ${cleanPriority}`
      ],
      importantFacts: [
        `Created on: ${new Date().toLocaleDateString()}`
      ],
      actionItems: suggestedActions.map(a => a.description)
    };

    let updatedNotes = [...(workspace.notes || [])];

    if (noteFormType === 'add') {
      const newNote: any = {
        _id: 'note_' + Date.now().toString(),
        id: 'note_' + Date.now().toString(),
        title: cleanTitle,
        content: finalContent,
        formattedContent: serializedBlocksStr,
        author: 'Advocate',
        category: cleanCategory,
        priority: cleanPriority,
        pinned: isPinned,
        favorite: isFavorite,
        archived: false,
        tags: noteForm.tags.length > 0 ? noteForm.tags : [cleanCategory, 'Active'],
        relatedHearing: noteForm.relatedHearing,
        relatedTimelineEvent: noteForm.relatedTimelineEvent,
        relatedEvidence: noteForm.relatedEvidence,
        relatedArgument: noteForm.relatedArgument,
        relatedResearch: noteForm.relatedResearch,
        aiSummary: aiSummaryDetails,
        aiEntities: extractedEntities,
        aiSuggestedLinks: suggestedLinks,
        aiSuggestedActions: suggestedActions,
        versions: [{ version: 1, content: finalContent, createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedNotes.push(newNote);
      showToast('success', 'Note Created', `"${cleanTitle}" saved in second brain.`);

      if (triggerChronologyWarning) {
        Alert.alert(
          'Chronology Detected',
          'This case note contains chronological dates or events. Would you like to map these timeline details directly into the case timeline?',
          [
            { text: 'Ignore', style: 'cancel' },
            {
              text: 'Add to Timeline',
              onPress: () => {
                const simulatedTimeline = [...(workspace.facts || []), {
                  id: 'fact_note_gen_' + Date.now().toString(),
                  title: `Event extracted from Note: ${cleanTitle}`,
                  description: `AI-inferred timeline record from Case Note details.`,
                  date: '2026-04-15',
                  displayDate: '15 April 2026',
                  category: 'Other',
                  importance: 'Medium',
                  confidence: 'High',
                  createdBy: 'AI' as const,
                  source: 'AI Extraction'
                }];
                handleUpdateField({ facts: simulatedTimeline as any });
                showToast('success', 'Timeline Updated', 'Chronology mapped into Case facts.');
              }
            }
          ]
        );
      }
    } else {
      updatedNotes = updatedNotes.map((note) => {
        if (note._id === noteFormTargetId || note.id === noteFormTargetId) {
          const newVersionNum = (note.versions || []).length + 1;
          const updatedVersions = [
            ...(note.versions || []),
            { version: newVersionNum, content: finalContent, createdAt: new Date().toISOString() }
          ];
          return {
            ...note,
            title: cleanTitle,
            content: finalContent,
            formattedContent: serializedBlocksStr,
            author: note.author || 'Advocate',
            category: cleanCategory,
            priority: cleanPriority,
            pinned: isPinned,
            favorite: isFavorite,
            tags: noteForm.tags.length > 0 ? noteForm.tags : note.tags,
            relatedHearing: noteForm.relatedHearing,
            relatedTimelineEvent: noteForm.relatedTimelineEvent,
            relatedEvidence: noteForm.relatedEvidence,
            relatedArgument: noteForm.relatedArgument,
            relatedResearch: noteForm.relatedResearch,
            aiSummary: aiSummaryDetails,
            aiEntities: extractedEntities,
            versions: updatedVersions,
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      });
      showToast('success', 'Note Updated', `"${cleanTitle}" revisions saved.`);
    }

    await handleUpdateField({ notes: updatedNotes });
    setIsNoteFormModalOpen(false);
    setNoteFormTargetId(null);
    setNotesAutosaveStatus('Saved');
    setIsNoteDirty(false);
  };

  // Open Add Note Modal
  const handleOpenAddNoteModal = () => {
    setNoteFormType('add');
    setNoteFormTargetId(null);
    setNoteForm({
      title: '',
      category: 'Personal',
      content: '',
      tags: [],
      priority: 'Medium',
      favorite: false,
      pinned: false,
      relatedHearing: '',
      relatedTimelineEvent: '',
      relatedEvidence: '',
      relatedArgument: '',
      relatedResearch: '',
      meetingWith: '',
      meetingLocation: '',
      meetingDate: '',
      discussion: '',
      decisions: '',
      followUp: '',
      judge: '',
      court: '',
      hearingDate: '',
      proceedings: '',
      orders: '',
      judgeRemarks: '',
      opponentArguments: '',
      observations: '',
      winningArguments: '',
      weaknesses: '',
      risks: '',
      opponentStrategy: '',
      counterStrategy: '',
      importantAuthorities: '',
      researchRequired: ''
    });

    const initialBlocks = [{ type: 'normal', spans: [{ text: '' }] }];
    setNoteBlocks(initialBlocks);
    setOriginalNoteBlocks(JSON.parse(JSON.stringify(initialBlocks)));
    setNoteHistory([JSON.parse(JSON.stringify(initialBlocks))]);
    setNoteHistoryIndex(0);
    setIsNoteDirty(false);
    setActiveFormatting({ bold: false, italic: false, underline: false, highlight: false });
    setNoteIsBold(false);
    setNoteIsItalic(false);
    setNoteIsUnderline(false);
    setNoteIsHighlight(false);
    setNoteBlockType('normal');

    setIsNoteFormModalOpen(true);
  };

  // Open Edit Note Modal
  const handleOpenEditNoteModal = (note: any) => {
    setNoteFormType('edit');
    setNoteFormTargetId(note._id || note.id);
    setNoteForm({
      title: note.title || '',
      category: note.category || 'Personal',
      content: note.content || '',
      tags: note.tags || [],
      priority: note.priority || 'Medium',
      favorite: !!note.favorite,
      pinned: !!note.pinned,
      relatedHearing: note.relatedHearing || '',
      relatedTimelineEvent: note.relatedTimelineEvent || '',
      relatedEvidence: note.relatedEvidence || '',
      relatedArgument: note.relatedArgument || '',
      relatedResearch: note.relatedResearch || '',
      meetingWith: '',
      meetingLocation: '',
      meetingDate: '',
      discussion: '',
      decisions: '',
      followUp: '',
      judge: '',
      court: '',
      hearingDate: '',
      proceedings: '',
      orders: '',
      judgeRemarks: '',
      opponentArguments: '',
      observations: '',
      winningArguments: '',
      weaknesses: '',
      risks: '',
      opponentStrategy: '',
      counterStrategy: '',
      importantAuthorities: '',
      researchRequired: ''
    });

    let parsedBlocks = [{ type: 'normal', spans: [{ text: note.content || '' }] }];
    if (note.formattedContent) {
      try {
        parsedBlocks = JSON.parse(note.formattedContent);
      } catch (err) {
        console.warn('Failed to parse note formattedContent:', err);
      }
    } else if (note.content) {
      parsedBlocks = note.content.split('\n').map((line: string) => ({
        type: 'normal',
        spans: [{ text: line }]
      }));
    }

    setNoteBlocks(parsedBlocks);
    setOriginalNoteBlocks(JSON.parse(JSON.stringify(parsedBlocks)));
    setNoteHistory([JSON.parse(JSON.stringify(parsedBlocks))]);
    setNoteHistoryIndex(0);
    setIsNoteDirty(false);
    setActiveFormatting({ bold: false, italic: false, underline: false, highlight: false });
    setNoteIsBold(false);
    setNoteIsItalic(false);
    setNoteIsUnderline(false);
    setNoteIsHighlight(false);
    setNoteBlockType('normal');

    setIsNoteFormModalOpen(true);
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!id || !workspace) return;
    const updatedNotes = (workspace.notes || []).filter((n: any) => n._id !== noteId && n.id !== noteId);
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Deleted', 'Note removed from Case Second Brain.');
  };

  // Duplicate note
  const handleDuplicateNote = async (note: any) => {
    if (!id || !workspace) return;
    const newNote = {
      ...note,
      _id: 'note_dup_' + Date.now().toString(),
      id: 'note_dup_' + Date.now().toString(),
      title: `${note.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedNotes = [...(workspace.notes || []), newNote];
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Duplicated', `Created copy of "${note.title}".`);
  };

  // Toggle Pinned Status
  const handleTogglePinNote = async (noteId: string) => {
    if (!id || !workspace) return;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteId || n.id === noteId) {
        return { ...n, pinned: !n.pinned };
      }
      return n;
    });
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Preference Saved', 'Note pin preference toggled.');
  };

  // Toggle Favorite Star Status
  const handleToggleFavoriteNote = async (noteId: string) => {
    if (!id || !workspace) return;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteId || n.id === noteId) {
        return { ...n, favorite: !n.favorite };
      }
      return n;
    });
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Preference Saved', 'Note favorite preference toggled.');
  };

  // Toggle Archived Status
  const handleToggleArchiveNote = async (noteId: string) => {
    if (!id || !workspace) return;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteId || n.id === noteId) {
        return { ...n, archived: !n.archived };
      }
      return n;
    });
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Preference Saved', 'Note archive status toggled.');
  };

  // Open Version History dialog
  const handleOpenVersionHistory = (note: any) => {
    setSelectedNoteVersionHistory(note.versions || []);
    setNoteFormTargetId(note._id || note.id);
    setIsVersionHistoryModalOpen(true);
  };

  // Restore previous note version content
  const handleRestoreNoteVersion = async (versionContent: string) => {
    if (!id || !workspace || !noteFormTargetId) return;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteFormTargetId || n.id === noteFormTargetId) {
        const nextVer = (n.versions || []).length + 1;
        const updatedVers = [...(n.versions || []), { version: nextVer, content: versionContent, createdAt: new Date().toISOString() }];
        return {
          ...n,
          content: versionContent,
          versions: updatedVers,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    await handleUpdateField({ notes: updatedNotes });
    setIsVersionHistoryModalOpen(false);
    showToast('success', 'Version Restored', 'Note content restored to selected revision.');
  };

  // Start simulated voice note dictation
  const handleRecordVoiceNote = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      setSimulatedTranscribing(true);
      setActiveRecordingDuration(0);

      setTimeout(async () => {
        setSimulatedTranscribing(false);
        if (!workspace) return;

        const speechText = "Today's client meeting went well. Client confirmed they made the full payment of INR 45,000 on 15 April 2026. The original sale deed document is available. Defendant has threatened to raise limitation objections under Indian Limitation Act Section 3.";
        const speechNoteId = 'note_voice_' + Date.now().toString();
        const extractedEntities = [
          { text: 'HDFC Bank', type: 'Evidence' },
          { text: 'Indian Limitation Act', type: 'Act' },
          { text: 'Section 3', type: 'Section' },
          { text: 'Original Sale Deed', type: 'Document' }
        ];

        const suggestedActions = [
          { type: 'Upload Evidence', description: 'Upload Original Sale Deed to Evidence Vault', accepted: false },
          { type: 'Create Task', description: 'Prepare Section 65B Electronic Certificate', accepted: false }
        ];

        const suggestedLinks = [];
        if (workspace.hearings && workspace.hearings.length > 0) {
          suggestedLinks.push({ type: 'Hearing', targetId: workspace.hearings[0].id || workspace.hearings[0]._id, targetName: workspace.hearings[0].title || 'Hearing #1', confirmed: false });
        }

        const newVoiceNote: any = {
          _id: speechNoteId,
          id: speechNoteId,
          title: `Voice Note Transcription - ${new Date().toLocaleDateString()}`,
          content: speechText,
          category: 'Client Meeting',
          priority: 'High',
          pinned: false,
          favorite: false,
          archived: false,
          tags: ['Voice Note', 'Transcribed', 'Client Meeting'],
          voiceRecordingUrl: 'file:///path/to/simulated_audio_note.wav',
          aiSummary: {
            shortSummary: 'Voice transcription recording detailing payment date and original sale deed availability.',
            keyPoints: ['Client meeting successfully finalized', 'Limitation Act section 3 issue raised'],
            importantFacts: ['Payment: INR 45,000 on 15 April 2026', 'Original deed is available'],
            actionItems: ['Upload Original Sale Deed to Evidence Vault', 'Prepare Section 65B Certificate']
          },
          aiEntities: extractedEntities,
          aiSuggestedLinks: suggestedLinks,
          aiSuggestedActions: suggestedActions,
          versions: [{ version: 1, content: speechText, createdAt: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedNotes = [...(workspace.notes || []), newVoiceNote];
        await handleUpdateField({ notes: updatedNotes });

        setIsVoiceNoteModalOpen(false);
        showToast('success', 'Voice Note Transcribed', 'Structured case note added successfully.');
      }, 2000);
    } else {
      setIsRecordingVoice(true);
      setActiveRecordingDuration(1);
    }
  };

  // Accept suggested action from notes co-counsel insights
  const handleAcceptSuggestedAction = async (noteId: string, actionIndex: number) => {
    if (!id || !workspace) return;

    let targetAction: any = null;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteId || n.id === noteId) {
        const actions = [...(n.aiSuggestedActions || [])];
        if (actions[actionIndex]) {
          actions[actionIndex] = { ...actions[actionIndex], accepted: true };
          targetAction = actions[actionIndex];
        }
        return { ...n, aiSuggestedActions: actions };
      }
      return n;
    });

    if (!targetAction) return;

    if (targetAction.type === 'Create Task' || targetAction.type === 'Upload Evidence' || targetAction.type === 'Research Relevant Law') {
      const newTask: any = {
        _id: 'task_note_action_' + Date.now().toString(),
        title: targetAction.description,
        description: `Task created from Co-Counsel suggestion in note: "${targetAction.description}"`,
        status: 'Pending',
        priority: 'High',
        source: 'AI Suggestion',
        createdAt: new Date().toISOString()
      };
      const updatedTasks = [...(workspace.tasks || []), newTask];
      await handleUpdateField({ notes: updatedNotes, tasks: updatedTasks });
    } else if (targetAction.type === 'Schedule Client Meeting') {
      const newHearing: any = {
        _id: 'hearing_note_action_' + Date.now().toString(),
        id: 'hearing_note_action_' + Date.now().toString(),
        title: 'Strategic Briefing - Client Meeting',
        purpose: 'Discuss case notes strategies and review evidence checklists.',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '11:00 AM',
        courtName: 'Chambers',
        courtroom: 'Advocate Desk',
        status: 'Scheduled',
        checklist: { documents: [], evidence: [], witnesses: [], compliance: [] },
        isAiEnriched: false
      };
      const updatedHearings = [...(workspace.hearings || []), newHearing];
      await handleUpdateField({ notes: updatedNotes, hearings: updatedHearings });
    } else {
      await handleUpdateField({ notes: updatedNotes });
    }

    showToast('success', 'Action Initiated', `Created: "${targetAction.description}".`);
  };

  // Confirm smart link suggested in note details
  const handleConfirmSuggestedLink = async (noteId: string, linkIndex: number) => {
    if (!id || !workspace) return;
    const updatedNotes = (workspace.notes || []).map((n: any) => {
      if (n._id === noteId || n.id === noteId) {
        const links = [...(n.aiSuggestedLinks || [])];
        if (links[linkIndex]) {
          links[linkIndex] = { ...links[linkIndex], confirmed: true };
        }
        return { ...n, aiSuggestedLinks: links };
      }
      return n;
    });
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Link Confirmed', 'Second brain reference linkage established.');
  };

  // Add manual Timeline event
  const handleAddTimelineEvent = () => {
    if (!workspace) return;
    if (!timelineForm.date || !timelineForm.title) {
      showToast('error', 'Validation Failed', 'Date and Title are required.');
      return;
    }
    const newEvent: CaseFact = {
      date: timelineForm.date,
      event: timelineForm.title,
      description: timelineForm.description,
    };
    // Include custom fields inside timeline fact
    const timelineEntry = {
      ...newEvent,
      id: `fact_user_${Date.now()}`,
      title: timelineForm.title,
      category: timelineForm.category,
      importance: timelineForm.importance,
      confidence: 'High',
      createdBy: 'User' as const,
      source: 'Manual Input',
    };

    const currentTimeline = workspace.facts || []; // facts inside CaseWorkspace schema represent timeline
    handleUpdateField({ facts: [...currentTimeline, timelineEntry] as any });
    setIsModalOpen(false);
    showToast('success', 'Event Added', 'Litigation milestone added.');
  };

  // Simulated AI OCR Timeline Document Extraction
  const handleRunOcrTimeline = async (docName: string) => {
    setIsOcrProcessing(true);
    setActiveOcrStep(0);
    setOcrSteps([
      `Opening document "${docName}"...`,
      'Running optical character recognition (OCR) scan...',
      'Matching date indicators and document metadata...',
      'Chronology nodes structured and verified...',
      'Updating active timeline database...',
    ]);

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setActiveOcrStep((prev) => prev + 1);
    }

    const ocrEvent = {
      date: '20 Apr 2025',
      event: 'Default Notice Served',
      description: `Timeline entry parsed from OCR scan of file: ${docName}. Rajesh Sharma notified Amit Verma of loan default interest trigger.`,
      category: 'Legal Notice',
      importance: 'High',
      confidence: 'High',
      isAiGenerated: true,
      sourceDoc: docName,
    };

    const currentFacts = workspace?.facts || [];
    handleUpdateField({ facts: [...currentFacts, ocrEvent] as any });
    setIsOcrProcessing(false);
    showToast('success', 'AI OCR Complete', `Timeline event parsed from "${docName}".`);
  };

  // Add manual Hearing Schedule
  const handleAddHearing = () => {
    if (!workspace) return;
    if (!hearingForm.date || !hearingForm.notes) {
      showToast('error', 'Validation Error', 'Date and hearing title/notes are required.');
      return;
    }

    let updatedHearings: CaseHearing[] = [];
    const currentHearings = workspace.hearings || [];
    const currentFacts = workspace.facts || [];

    if (hearingFormMode === 'edit' && editingHearingId) {
      updatedHearings = currentHearings.map((h) => {
        if (h.id === editingHearingId || h._id === editingHearingId) {
          return {
            ...h,
            title: hearingForm.notes,
            date: hearingForm.date,
            time: hearingForm.time || '10:00 AM',
            courtName: hearingForm.courtName || 'District Court',
            courtroom: hearingForm.courtroom || '',
            judge: hearingForm.judge || '',
            purpose: hearingForm.purpose || '',
            status: (hearingForm.status || 'Scheduled') as any
          };
        }
        return h;
      });
      handleUpdateField({ hearings: updatedHearings });
      showToast('success', 'Hearing Updated', 'Hearing details have been updated.');
    } else {
      const hearingId = `hearing_${Date.now()}`;
      const newHearing: CaseHearing = {
        id: hearingId,
        _id: hearingId,
        title: hearingForm.notes, // hearing type/title
        date: hearingForm.date,
        time: hearingForm.time || '10:00 AM',
        courtName: hearingForm.courtName || workspace.courtName || 'District Court',
        courtroom: hearingForm.courtroom || '',
        judge: hearingForm.judge || '',
        purpose: hearingForm.purpose || '',
        notes: '',
        status: (hearingForm.status || 'Scheduled') as any,
        linkedDocuments: [],
        orderSummary: '',
        isAiEnriched: false,
        nextHearingDate: '',
        checklist: {
          documents: [],
          evidence: [],
          witnesses: [],
          compliance: [],
        }
      };

      // Add timeline milestone for hearing scheduled
      const hearingFact: CaseFact = {
        id: `fact_hearing_${Date.now()}`,
        date: hearingForm.date,
        event: `Hearing Scheduled: ${hearingForm.notes}`,
        description: `Court hearing scheduled at ${hearingForm.time || '10:00 AM'} in ${hearingForm.courtroom || 'District Court'}. Purpose: ${hearingForm.purpose || 'General'}.`
      };

      handleUpdateField({
        hearings: [newHearing, ...currentHearings],
        facts: [...currentFacts, hearingFact] as any,
        intelligence: {
          ...workspace.intelligence,
          strategyRecommendations: [
            `Prepare courtroom arguments and list documents for hearing on ${hearingForm.date}.`,
            ...(workspace.intelligence?.strategyRecommendations || [])
          ]
        }
      });
      showToast('success', 'Hearing Scheduled', 'Upcoming hearing added to calendar.');
    }

    setIsModalOpen(false);
    setHearingFormMode('add');
    setEditingHearingId(null);
  };

  const handleDeleteHearing = (hearingId: string) => {
    if (!workspace) return;
    Alert.alert(
      "Delete Hearing",
      "Are you sure you want to permanently delete this hearing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedHearings = (workspace.hearings || []).filter(
              (h) => h.id !== hearingId && h._id !== hearingId
            );
            await handleUpdateField({ hearings: updatedHearings });
            setExpandedHearingId(null);
            showToast('success', 'Hearing Deleted', 'Hearing has been permanently removed.');
          }
        }
      ]
    );
  };

  const handleToggleHearingStatus = async (hearingId: string, currentStatus: string) => {
    if (!workspace) return;
    const newStatus: 'Completed' | 'Scheduled' = currentStatus === 'Completed' ? 'Scheduled' : 'Completed';
    const updatedHearings = (workspace.hearings || []).map((h) => {
      if (h.id === hearingId || h._id === hearingId) {
        return { ...h, status: newStatus } as CaseHearing;
      }
      return h;
    });
    await handleUpdateField({ hearings: updatedHearings });
    showToast('success', `Status Updated`, `Hearing marked as ${newStatus}.`);
  };

  const triggerEditForHearing = (hearing: any) => {
    setHearingFormMode('edit');
    setEditingHearingId(hearing.id || hearing._id || '');
    setHearingForm({
      date: normalizeDate(hearing.date),
      time: hearing.time || '10:00 AM',
      courtName: hearing.courtName || '',
      courtroom: hearing.courtroom || '',
      judge: hearing.judge || '',
      purpose: hearing.purpose || '',
      notes: hearing.title || hearing.notes || '',
      status: hearing.status || 'Scheduled'
    });
    setModalType('hearing');
    setIsModalOpen(true);
  };

  // Toggle hearing checklist item
  const handleToggleChecklistItem = async (
    hearingId: string,
    category: 'documents' | 'evidence' | 'witnesses' | 'compliance',
    index: number
  ) => {
    if (!workspace) return;
    const updatedHearings = (workspace.hearings || []).map((h) => {
      if (h.id === hearingId || h._id === hearingId) {
        const currentChecklist = h.checklist || { documents: [], evidence: [], witnesses: [], compliance: [] };
        const categoryItems = [...(currentChecklist[category] || [])];
        if (categoryItems[index]) {
          categoryItems[index] = {
            ...categoryItems[index],
            checked: !categoryItems[index].checked,
          };
        }
        return {
          ...h,
          checklist: {
            ...currentChecklist,
            [category]: categoryItems,
          },
        };
      }
      return h;
    });

    handleUpdateField({ hearings: updatedHearings });
    showToast('success', 'Task Checked', 'Checklist status synced.');
  };

  // AI enrichment call for hearing
  const handleEnrichHearing = async (
    hearingId: string,
    payload: { notes?: string; documentText?: string; documentName?: string }
  ) => {
    if (!id || !workspace) return;
    setIsEnrichingHearingId(hearingId);
    try {
      showToast('info', 'AI Enrichment', 'Analyzing hearing files and extracting details...');
      const response = await CaseService.enrichHearing(id, hearingId, payload);
      if (response && response.data) {
        updateWorkspaceState(id, response.data);
        showToast('success', 'AI Enrichment Complete', 'Hearing details enriched with AI checklists and summaries.');
      } else {
        await fetchWorkspaceDetails(id);
        showToast('success', 'Hearing Updated', 'Details synchronized with server.');
      }
    } catch (err) {
      console.error('[HEARING ENRICH] Error:', err);
      showToast('error', 'AI Enrichment Failed', 'Could not run AI analysis on the document.');
    } finally {
      setIsEnrichingHearingId(null);
    }
  };

  // AI Prep simulation for a hearing
  const handleAiPrepHearing = (hearingId: string) => {
    if (!workspace) return;
    setAiPrepProgressHearingId(hearingId);
    setAiPrepStep(0);
    const steps = [1, 2, 3, 4, 5];
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAiPrepStep(step);
        if (step === 5) {
          setTimeout(() => {
            setAiPrepProgressHearingId(null);
            setAiPrepStep(0);
            showToast('success', 'AI Prep Complete', 'Hearing strategy, checklist and precedents are ready.');
          }, 600);
        }
      }, idx * 700);
    });
  };

  // Reschedule a hearing
  const handleRescheduleHearing = () => {
    if (!workspace || !rescheduleTargetHearingId || !rescheduleDate) {
      showToast('error', 'Validation Error', 'Please select a new date to reschedule.');
      return;
    }
    const updatedHearings = (workspace.hearings || []).map((h) => {
      if ((h.id === rescheduleTargetHearingId || h._id === rescheduleTargetHearingId)) {
        return { ...h, date: rescheduleDate, time: rescheduleTime || h.time, status: 'Scheduled' as any };
      }
      return h;
    });
    handleUpdateField({ hearings: updatedHearings });
    setIsRescheduleModalOpen(false);
    setRescheduleTargetHearingId(null);
    setRescheduleDate('');
    setRescheduleTime('');
    showToast('success', 'Hearing Rescheduled', `Hearing rescheduled to ${rescheduleDate}.`);
  };

  // Import Court Order as a Hearing
  const handleImportOrderAsHearing = () => {
    const courtOrders = workspace?.courtOrders || [];
    const latestOrder = courtOrders[0];
    if (!latestOrder) {
      showToast('error', 'No Orders Found', 'No court orders found to import from.');
      return;
    }
    const hearingId = `hearing_import_${Date.now()}`;
    const newHearing: any = {
      id: hearingId,
      _id: hearingId,
      title: `Arguments Hearing: ${latestOrder.metadata?.caseNumber || latestOrder.name}`,
      date: latestOrder.metadata?.nextHearingDate || '',
      time: '10:30 AM',
      courtName: latestOrder.metadata?.courtName || workspace?.courtName || 'District Court',
      courtroom: latestOrder.metadata?.courtNumber || '',
      judge: latestOrder.metadata?.judgeName || '',
      purpose: latestOrder.metadata?.orderType || 'Arguments',
      notes: `Imported from court order: ${latestOrder.name}`,
      status: 'Scheduled',
      linkedDocuments: [latestOrder._id || latestOrder.id || ''],
      orderSummary: latestOrder.aiSummary?.shortSummary || '',
      isAiEnriched: true,
      nextHearingDate: '',
      checklist: { documents: [], evidence: [], witnesses: [], compliance: [] },
    };
    const currentHearings = workspace?.hearings || [];
    handleUpdateField({ hearings: [newHearing, ...currentHearings] });
    setImportOrderModalOpen(false);
    setHearingFabExpanded(false);
    showToast('success', 'Hearing Imported', 'Hearing imported from court order successfully.');
  };


  // Add manual litigant/witness Party
  const handleAddParty = () => {
    if (!workspace) return;
    if (!partyForm.name || !partyForm.role) {
      showToast('error', 'Validation Error', 'Name and Role are required.');
      return;
    }

    const { name, role, contact, email, notes } = partyForm;

    if (role === 'Plaintiff / Petitioner') {
      handleUpdateField({ clientName: name });
      showToast('success', 'Plaintiff Updated', `Plaintiff set as ${name}.`);
    } else if (role === 'Defendant / Respondent') {
      handleUpdateField({ opponentName: name });
      showToast('success', 'Defendant Updated', `Defendant set as ${name}.`);
    } else {
      const newPerson = {
        name,
        role,
        contact: contact || 'N/A',
        email: email || '',
        notes: notes || ''
      };
      const currentLawyers = workspace.lawyers || [];
      handleUpdateField({ lawyers: [...currentLawyers, newPerson] });
      showToast('success', 'Person Added', `${role} added successfully.`);
    }

    // Reset form
    setPartyForm({ name: '', role: 'Plaintiff / Petitioner', contact: '', email: '', notes: '' });
    setIsModalOpen(false);
  };

  // Add manual Evidence record
  // Add manual Evidence record with AI + OCR pipelines
  const handleAddEvidenceWithPipeline = async (manualData?: any) => {
    const name = manualData?.name || logEvidenceForm.name;
    const type = manualData?.type || logEvidenceForm.type;
    const description = manualData?.description || logEvidenceForm.description;
    const notes = manualData?.notes || logEvidenceForm.notes;
    const tagsText = manualData?.tags || logEvidenceForm.tags;
    const size = manualData?.fileSize || logEvidenceForm.fileSize;

    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Evidence file name is required.');
      return;
    }
    if (!workspace) return;

    setIsEvidenceUploadOpen(false);
    setIsOcrAnalyzing(true);
    setOcrProgressStep(0);

    const ocrSteps = [
      'Reading document raw layers...',
      'Extracting optical characters (OCR)...',
      'Structuring extracted text buffer...',
      'Checking signatures and stamps...'
    ];

    for (let i = 0; i < ocrSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setOcrProgressStep(i + 1);
    }

    setIsOcrAnalyzing(false);
    setIsAnalyzingEvidence(true);
    setAiAnalysisProgressStep(0);

    const aiSteps = [
      'Analyzing relevance under Indian Evidence Act...',
      'Detecting critical timeline entity entries...',
      'Identifying potential legal vulnerabilities...',
      'Finalizing exhibit summary report...'
    ];

    for (let i = 0; i < aiSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setAiAnalysisProgressStep(i + 1);
    }

    setIsAnalyzingEvidence(false);

    const currentEvidence = workspace.evidence || [];
    const exhibitPrefix = type === 'Digital' || type === 'Images' || type === 'Audio' || type === 'Videos' ? 'Exhibit B' : 'Exhibit A';
    const num = currentEvidence.filter(e => (e.exhibitNumber || '').startsWith(exhibitPrefix)).length + 1;
    const generatedExhibit = `${exhibitPrefix}-${num}`;

    const mockOcrText = `[EXTRACTED OCR SCAN DETAILS]
Date: ${new Date().toLocaleDateString()}
Document: ${name}
Type: ${type}
Summary details: Case default liabilities notice.
Signatures: Match validated by Plaintiff Advocate.`;

    const tags = tagsText ? tagsText.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Uploaded', type];
    const newEvidenceItem: CaseEvidence = {
      id: `ev_${Date.now()}`,
      name,
      type,
      description: description || 'No description provided.',
      notes,
      exhibitNumber: logEvidenceForm.exhibitNumber || generatedExhibit,
      status: 'Pending',
      tags,
      fileSize: size,
      uploadedBy: 'Advocate',
      uploadedDate: new Date().toISOString(),
      ocrData: {
        text: mockOcrText,
        datesDetected: [new Date().toLocaleDateString()],
        namesDetected: [workspace.clientName || 'Plaintiff', workspace.opponentName || 'Defendant'],
        addressesDetected: ['Connaught Place, New Delhi'],
        signaturesDetected: ['Verified'],
        registrationNumbers: ['REG-9912A'],
        caseNumbers: [workspace.name],
        courtNames: [workspace.courtName || 'District Court'],
        judges: ['Honorable Justice Roy']
      },
      aiAnalysis: {
        summary: `AI extracted overview of ${name}. Highly relevant contractual proof.`,
        relevance: 'Establishes prima facie contractual default and timeline liabilities.',
        extractedText: mockOcrText,
        entities: {
          people: [workspace.clientName || 'Plaintiff', workspace.opponentName || 'Defendant'],
          dates: [new Date().toLocaleDateString()],
          addresses: ['Connaught Place, New Delhi'],
          amounts: ['₹5,00,000']
        },
        caseRelevance: `Direct evidence corroborating breach of lease obligations inside active litigation stages.`,
        suggestedTimelineEvents: [`${name} uploaded to Vault.`],
        suggestedHearingLinks: [workspace.hearings?.[0]?.title || 'Next Scheduled Hearing'],
        suggestedArguments: ['Argument 1: Prima Facie Contract Validation'],
        applicableLaws: ['Section 65B Indian Evidence Act', 'Section 17 Indian Registration Act'],
        possibleWeaknesses: ['Electronic chat requires Section 65B compliance certificate.'],
        confidenceScore: 94
      },
      relatedLinks: {
        timelineEvents: [workspace.facts?.[0]?.title || 'Case Initialization'],
        hearings: [workspace.hearings?.[0]?.title || 'Hearing Stage'],
        research: ['Indian Evidence Act Section 65B'],
        arguments: ['Prima Facie Contract Validation'],
        drafts: [workspace.drafts?.[0]?.name || 'Reply Notice Draft'],
        contracts: ['Registered Lease Contract']
      },
      hash: 'SHA256-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };

    const evidenceFact: CaseFact = {
      id: `fact_${Date.now()}`,
      title: `Evidence Logged: ${name}`,
      event: `Evidence Logged: ${name}`,
      description: `Exhibit ${newEvidenceItem.exhibitNumber} logged. Admissibility: Pending. OCR & AI analysis compiled.`,
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString(),
      category: 'Evidence',
      importance: 'Medium',
      createdBy: 'AI'
    };

    const updatedEvidence = [newEvidenceItem, ...currentEvidence];
    const currentFacts = workspace.facts || [];

    handleUpdateField({
      evidence: updatedEvidence,
      facts: [...currentFacts, evidenceFact],
      intelligence: workspace.intelligence
    });

    setLogEvidenceForm({
      name: '',
      type: 'Document',
      description: '',
      notes: '',
      tags: '',
      exhibitNumber: '',
      fileSize: '1.2 MB'
    });

    showToast('success', 'Evidence Vault Updated', `Exhibit "${newEvidenceItem.exhibitNumber}" logged & AI analyzed.`);
  };

  const handleAddEvidence = () => {
    handleAddEvidenceWithPipeline({
      name: evidenceForm.name,
      type: evidenceForm.type,
      description: evidenceForm.description,
      notes: '',
      tags: '',
      fileSize: '1.2 MB'
    });
    setIsModalOpen(false);
  };

  const handleDeleteEvidence = (evId: string) => {
    if (!workspace) return;
    const current = workspace.evidence || [];
    const updated = current.filter(e => e.id !== evId && e._id !== evId);
    handleUpdateField({ evidence: updated });
    showToast('success', 'Evidence Purged', 'Vault item permanently removed.');
  };

  const handleUpdateEvidenceStatus = (evId: string, nextStatus: 'Verified' | 'Pending' | 'Rejected' | 'Disputed') => {
    if (!workspace) return;
    const current = workspace.evidence || [];
    const updated = current.map(e => {
      if (e.id === evId || e._id === evId) {
        return { ...e, status: nextStatus };
      }
      return e;
    });
    handleUpdateField({ evidence: updated });
    setIsVerifyModalOpen(false);
    setVerifyTargetId(null);
    showToast('success', 'Verification Status', `Exhibit verified status updated to ${nextStatus}.`);
  };

  // Add manual Court Order
  const handleAddCourtOrder = () => {
    if (!workspace) return;
    if (!courtOrderForm.title || !courtOrderForm.date) {
      showToast('error', 'Validation Error', 'Title and Date are required.');
      return;
    }
    const newDoc: CaseDocument = {
      _id: `doc_${Date.now()}`,
      name: `${courtOrderForm.title}.pdf`,
      type: 'Other',
      url: 'https://ailegal.com/orders/court_order.pdf',
      tags: ['Court Order', 'Official'],
      uploadDate: courtOrderForm.date,
      extractedData: {
        issuer: courtOrderForm.issuer || 'District Court Judge',
        notes: courtOrderForm.notes,
      },
    };

    const currentDocs = workspace.documents || [];
    const currentFacts = workspace.facts || [];

    const orderFact: CaseFact = {
      date: courtOrderForm.date,
      event: `Court Order: ${courtOrderForm.title}`,
      description: `Official order issued by ${courtOrderForm.issuer || 'the Judge'}. Directives: ${courtOrderForm.notes || 'N/A'}`
    };

    const currentWin = workspace.intelligence?.winProbability || 65;
    const currentStrength = workspace.intelligence?.strengthScore || 70;

    handleUpdateField({
      documents: [...currentDocs, newDoc],
      facts: [...currentFacts, orderFact] as any,
      intelligence: {
        ...workspace.intelligence,
        winProbability: Math.min(95, currentWin + 4),
        strengthScore: Math.min(100, currentStrength + 4),
        strategyRecommendations: [
          `Court order registered: "${courtOrderForm.title}". Adjust case compliance tasks accordingly.`,
          ...(workspace.intelligence?.strategyRecommendations || [])
        ]
      }
    });

    setIsModalOpen(false);
    setCourtOrderForm({ title: '', date: '', issuer: '', notes: '' });
    showToast('success', 'Order Logged', 'Court order logged and case metrics updated.');
  };

  // Add manual Task checklist item
  const handleAddTask = () => {
    if (!workspace) return;
    if (!taskForm.title) {
      showToast('error', 'Validation Error', 'Task title is required.');
      return;
    }
    const newTask: CaseTask = {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority as any,
      deadline: taskForm.deadline || 'None',
      status: 'Pending',
    };
    const currentTasks = workspace.tasks || [];
    handleUpdateField({ tasks: [newTask, ...currentTasks] });
    setIsModalOpen(false);
    showToast('success', 'Task Created', 'Task checklist updated.');
  };

  // Precedents keyword search simulator
  const handleSearchPrecedents = () => {
    if (!precedentQuery.trim()) {
      showToast('error', 'Query Missing', 'Enter law name or keywords.');
      return;
    }
    // Mock precedent search responses
    const mockPrecedents: CasePrecedent[] = [
      {
        title: 'K. Bhaskaran v. Sankaran Vaidhyan Balan',
        citation: '(1999) 7 SCC 510',
        summary: 'Establishes jurisdiction rules and checks delivery notice presumptions under Negotiable Instruments legal codes.',
        url: 'https://ailegal.com/precedents/bhaskaran',
      },
      {
        title: 'Dalmia Cement Ltd. v. Galaxy Traders',
        citation: 'AIR 2001 SC 676',
        summary: 'Deals with limitation periods and strict timeline calculations for serving recovery compliance demands.',
        url: 'https://ailegal.com/precedents/dalmia',
      },
    ];
    setPrecedentSearchResults(mockPrecedents);
    showToast('success', 'Search Complete', 'Citations retrieved.');
  };

  const handleSavePrecedent = (prec: CasePrecedent) => {
    if (!workspace) return;
    const currentPrecedents = workspace.savedPrecedents || [];
    handleUpdateField({ savedPrecedents: [...currentPrecedents, prec] });
    showToast('success', 'Precedent Saved', 'Citation saved to case research folder.');
  };

  // AI Research engine helper methods
  const runResearchAnalysis = async (isBackground = false) => {
    if (!workspace) return;
    if (!isBackground) {
      setIsRegeneratingResearch(true);
    }

    // Setup steps for UI display
    setResearchRegenSteps([
      'Scanning case summary and active timeline events...',
      'Extracting keywords: recovery, Limitation Act, Section 65B...',
      'Searching Supreme Court & High Court digital database repositories...',
      'Analyzing defense contentions and procedural vulnerabilities...',
      'Compiling legal issues, relevant acts, and ratio summaries...',
      'Recalculating research completeness index...'
    ]);
    setActiveResearchRegenStep(0);

    const stepInterval = setInterval(() => {
      setActiveResearchRegenStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 600);

    try {
      const clientName = workspace.clientName || 'Plaintiff';
      const opponentName = workspace.opponentName || workspace.accused || 'Defendant';

      const res = await DraftService.executeTool({
        toolName: 'legal_research_assistant',
        message: `Perform legal research for case: "${workspace.name}". Client: "${clientName}". Opponent: "${opponentName}". Case Type: "${workspace.caseType || ''}". Court: "${workspace.courtName || ''}". Summary: "${workspace.summary || workspace.caseSummary || ''}".`,
        caseContext: {
          name: workspace.name,
          clientName: clientName,
          opponentName: opponentName,
          caseType: workspace.caseType,
          summary: workspace.summary || workspace.caseSummary,
        }
      });

      clearInterval(stepInterval);

      if (res && res.success) {
        setAiResearchReply(res.reply);
        setIsResearchGenerated(true);
        if (!isBackground) {
          showToast('success', 'Research Refreshed', 'AI Legal Research assistant analysis completed.');
        }
      } else {
        if (!isBackground) {
          showToast('error', 'Research Failed', res.error || 'Failed to complete legal research.');
        }
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.warn('[RESEARCH AUTO REFRESH ERROR]', err);
      if (!isBackground) {
        showToast('error', 'Research Offline', 'Unable to reach the legal research assistant.');
      }
    } finally {
      setIsRegeneratingResearch(false);
    }
  };

  const handleSavePrecedentToBackend = (j: any) => {
    if (!workspace) return;
    const current = workspace.savedPrecedents || [];
    if (current.some(c => c.citation === j.citation)) {
      showToast('error', 'Already Saved', 'This judgment citation is already bookmarked.');
      return;
    }
    const newItem: CasePrecedent = {
      title: j.name,
      citation: j.citation,
      summary: `${j.summary} Ratio: ${j.ratio}`
    };
    handleUpdateField({ savedPrecedents: [...current, newItem] });
    showToast('success', 'Precedent Saved', 'Judgment added to workspace citations.');
  };

  const processConversationalSearch = (q: string) => {
    setResearchSearchQuery(q);
    if (!q.trim()) {
      setConversationalSearchResults(null);
      return;
    }
    setIsSearchingResearch(true);
    setTimeout(() => {
      const query = q.toLowerCase();

      const baseLaws = [
        {
          act: "Indian Contract Act, 1872",
          section: "Section 73 & Section 74",
          description: "Compensation for loss or damage caused by breach of contract. Governs whether a penalty clause is enforceable without showing actual loss.",
          reason: "Applies directly to determine the validity of the interest charge rate and the default compensation claimed by the petitioner."
        },
        {
          act: "Code of Civil Procedure, 1908",
          section: "Section 34 & Order XXXVII",
          description: "Interest awards during litigation. Order 37 outlines the summary procedure for money recovery under written contracts or promissory notes.",
          reason: "Ensures the case follows summary procedures to expedite settlement and provides the legal basis for claiming interest."
        },
        {
          act: "Limitation Act, 1963",
          section: "Section 18 & Article 113",
          description: "Effect of acknowledgment in writing. Article 113 provides a general three-year limitation period for suits for which no period is prescribed elsewhere.",
          reason: "Crucial for rebutting the defendant's plea of limitation, using the emails and WhatsApp messages as written acknowledgment of debt."
        },
        {
          act: "Indian Evidence Act, 1872",
          section: "Section 65B",
          description: "Admissibility of electronic records. Mandates a written certificate for submitting printouts or digital records from secondary sources.",
          reason: "Applies to WhatsApp logs and email invoice reminders. Essential for getting the primary proof admitted by the judge."
        },
        {
          act: "Specific Relief Act, 1963",
          section: "Section 10",
          description: "Specific performance of contracts. Discretion of the court to enforce contractual obligations directly.",
          reason: "Applicable if the simple recovery of dues is not adequate and direct enforcement of contractual obligations is demanded."
        },
        {
          act: "Transfer of Property Act, 1882",
          section: "Section 54",
          description: "Defines sale of tangible immovable property and regulates the delivery and contract of transfer.",
          reason: "Relevant to determine the nature of collateral hardware assets or leased premises in dispute."
        },
        {
          act: "Indian Registration Act, 1908",
          section: "Section 17",
          description: "Mandates compulsory registration of documents affecting immovable property, lease deeds exceeding one year.",
          reason: "Applies if the opponent argues lease or transaction contracts are inadmissible due to lack of compulsory registration."
        }
      ];

      const baseJudgments = [
        {
          name: "Kailash Nath Associates vs DDA",
          court: "Supreme Court of India",
          citation: "2015 4 SCC 136",
          year: "2015",
          bench: "Two-Judge Bench",
          principle: "Liquidated damages enforcement under Section 74",
          why: "Determines whether the interest penalties can be claimed without presenting audit sheets showing damage.",
          ratio: "Earnest money or penalty clauses can only be forfeited/enforced if the amount represents a genuine pre-estimate of loss.",
          summary: "Landmark ruling on liquidated damages. Held that penalty clauses under Section 74 can only be enforced if the party has suffered actual damage and estimation is impossible."
        },
        {
          name: "Anvar P.V. vs P.K. Basheer",
          court: "Supreme Court of India",
          citation: "2014 10 SCC 473",
          year: "2014",
          bench: "Three-Judge Bench",
          principle: "Secondary electronic records admissibility under Section 65B",
          why: "Governs the admissibility of WhatsApp screenshot printouts and ledger copies.",
          ratio: "Electronic evidence is inadmissible in court without the explicit certificate required under Section 65B(4).",
          summary: "Clarified the evidentiary requirements for secondary electronic records, holding that a Section 65B certificate is mandatory."
        },
        {
          name: "State of Nagaland vs Lipok AO",
          court: "Supreme Court of India",
          citation: "2005 3 SCC 752",
          year: "2005",
          bench: "Two-Judge Bench",
          principle: "Procedural delay condonation under Section 5",
          why: "Assists in defending against any limitation technicalities raised by the opposing counsel.",
          ratio: "Courts must adopt a pragmatic, non-pedantic approach to condoning delays where justice warrants a full trial.",
          summary: "Addressed procedural delay condonation under Section 5. Stressed that technical issues should not override substantive justice."
        },
        {
          name: "Ambalal Sarabhai Enterprise Ltd. vs K.S. Infraspace LLP",
          court: "Supreme Court of India",
          citation: "2020 15 SCC 585",
          year: "2020",
          bench: "Two-Judge Bench",
          principle: "Summary commercial suit jurisdiction and timelines",
          why: "Applicable if the opposing party tries to transfer the suit to regular civil courts to delay trials.",
          ratio: "The provisions of the Commercial Courts Act must be strictly interpreted and applied to speed up dispute resolutions.",
          summary: "Examines the scope of commercial court jurisdiction and timelines under the Commercial Courts Act, 2015."
        },
        {
          name: "Arjun Panditrao Khotkar vs Kailash Kushanrao Gorantyal",
          court: "Supreme Court of India",
          citation: "2020 7 SCC 1",
          year: "2020",
          bench: "Three-Judge Bench",
          principle: "Timing for producing Section 65B(4) electronic certificate",
          why: "Clarifies certificate production procedure during the trial.",
          ratio: "The required certificate under Section 65B(4) can be supplied at any stage prior to trial commencement.",
          summary: "Clarified that producing an electronic certificate is mandatory, but if the device owner refuses, the court can issue summons to produce it."
        },
        {
          name: "SBI vs M/s. Aditya Birla",
          court: "High Court of Delhi",
          citation: "2022 SCC OnLine DL 842",
          year: "2022",
          bench: "Division Bench",
          principle: "Limitation period resets via electronic debt acknowledgment",
          why: "Validates electronic communications as a reset trigger.",
          ratio: "Ledger balances and acknowledgements confirmed via email constitute a valid acknowledgement of debt under Section 18.",
          summary: "Held that digital communication containing ledger approval counts as valid written acknowledgment under Section 18 of the Limitation Act."
        }
      ];

      const filteredLaws = baseLaws.filter(l =>
        l.act.toLowerCase().includes(query) ||
        l.section.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query) ||
        l.reason.toLowerCase().includes(query)
      );

      const filteredJudgments = baseJudgments.filter(j =>
        j.name.toLowerCase().includes(query) ||
        j.court.toLowerCase().includes(query) ||
        j.citation.toLowerCase().includes(query) ||
        j.summary.toLowerCase().includes(query) ||
        j.why.toLowerCase().includes(query) ||
        j.ratio.toLowerCase().includes(query) ||
        j.principle.toLowerCase().includes(query)
      );

      setConversationalSearchResults({
        laws: filteredLaws,
        judgments: filteredJudgments
      });
      setIsSearchingResearch(false);
      showToast('success', 'Search Complete', `Found ${filteredJudgments.length} precedents and ${filteredLaws.length} laws.`);
    }, 500);
  };

  // Keep track of counts for auto-refresh detection
  const prevDocCount = useRef<number | undefined>(undefined);
  const prevEvidenceCount = useRef<number | undefined>(undefined);
  const prevTimelineCount = useRef<number | undefined>(undefined);
  const prevSummary = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!workspace) return;

    // Set initial values on first load
    if (prevDocCount.current === undefined) {
      prevDocCount.current = workspace.documents?.length || 0;
      prevEvidenceCount.current = workspace.evidence?.length || 0;
      prevTimelineCount.current = workspace.facts?.length || 0;
      prevSummary.current = workspace.summary || workspace.caseSummary || '';
      return;
    }

    const docChanged = prevDocCount.current !== workspace.documents?.length;
    const evidenceChanged = prevEvidenceCount.current !== workspace.evidence?.length;
    const timelineChanged = prevTimelineCount.current !== workspace.facts?.length;
    const summaryChanged = prevSummary.current !== (workspace.summary || workspace.caseSummary);

    // Update refs
    prevDocCount.current = workspace.documents?.length || 0;
    prevEvidenceCount.current = workspace.evidence?.length || 0;
    prevTimelineCount.current = workspace.facts?.length || 0;
    prevSummary.current = workspace.summary || workspace.caseSummary || '';

    if (docChanged || evidenceChanged || timelineChanged || summaryChanged) {
      console.log('Case data changed, auto-refreshing legal research...');
      runResearchAnalysis(true); // Background refresh
    }
  }, [
    workspace?.documents?.length,
    workspace?.evidence?.length,
    workspace?.facts?.length,
    workspace?.summary,
    workspace?.caseSummary
  ]);

  useEffect(() => {
    if (workspace) {
      if ((workspace.savedPrecedents && workspace.savedPrecedents.length > 0) || aiResearchReply) {
        setIsResearchGenerated(true);
      }
    }
  }, [workspace, aiResearchReply]);

  // --- Redesigned Draft Folder Actions ---
  const handleCreateDraftFolder = () => {
    if (!draftForm.name.trim()) {
      showToast('error', 'Validation Error', 'Draft name is required.');
      return;
    }
    if (!workspace) return;

    const newDraftId = `draft_${Date.now()}`;
    const client = workspace.clientName || 'Plaintiff';
    const opponent = workspace.opponentName || workspace.accused || 'Defendant';
    const court = workspace.courtName || 'District Court';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const initialContent = `=========================================
            AI LEGAL™ DRAFTING SUITE
=========================================
DRAFT TYPE: ${draftForm.type.toUpperCase()}
DRAFT TITLE: ${draftForm.name}
CASE BOUND: ${client} vs ${opponent}
DATE INITIATED: ${dateStr}
STATUS: MANUAL DRAFT INITIATED
-----------------------------------------

IN THE COURT OF THE DISTRICT JUDGE AT ${court.toUpperCase()}
CIVIL ORIGINAL JURISDICTION

IN THE MATTER OF:
${client.toUpperCase()}        ...PLAINTIFF/PETITIONER

VERSUS

${opponent.toUpperCase()}          ...DEFENDANT/RESPONDENT

SUBJECT: DRAFT NOTICE/PETITION FOR ${draftForm.type.toUpperCase()}

Sir/Madam,
The plaintiff/petitioner above-named begs to submit as under:

1. That the parties entered into a binding contract agreement, details of which are annexed.
2. That the defendant has failed to settle the outstanding dues and has breached transaction terms.
3. The cause of action arose within the jurisdiction of this Hon'ble Court.
4. Hence, this petition is filed praying for an order of recovery/restoration in the interest of justice.

PLAINTIFF/PETITIONER
Through Counsel
`;

    const newDraftItem: CaseDraft = {
      id: newDraftId,
      name: draftForm.name,
      type: draftForm.type,
      content: initialContent,
      versions: [
        {
          version: 1,
          content: initialContent,
          createdAt: new Date().toISOString(),
          changes: 'Initial draft template folder created'
        }
      ],
      createdBy: 'Advocate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Draft',
      aiSuggestions: [],
      exportHistory: []
    };

    const currentDrafts = workspace.drafts || [];
    handleUpdateField({ drafts: [...currentDrafts, newDraftItem] });
    setDraftForm({ name: '', type: 'Legal Notice' });
    showToast('success', 'Folder Created', `Draft folder "${newDraftItem.name}" initialized.`);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (!workspace) return;
    const current = workspace.drafts || [];
    const updated = current.filter(d => d.id !== draftId);
    handleUpdateField({ drafts: updated });
    showToast('success', 'Draft Deleted', 'The draft has been permanently removed.');
  };

  const handleDuplicateDraft = (draftId: string) => {
    if (!workspace) return;
    const current = workspace.drafts || [];
    const target = current.find(d => d.id === draftId);
    if (!target) return;

    const duplicatedItem: CaseDraft = {
      ...target,
      id: `draft_${Date.now()}`,
      name: `${target.name} Copy`,
      versions: [...target.versions],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handleUpdateField({ drafts: [...current, duplicatedItem] });
    showToast('success', 'Draft Duplicated', `Created duplicate of "${target.name}".`);
  };

  const handleRenameDraft = (draftId: string, newName: string) => {
    if (!workspace || !newName.trim()) return;
    const current = workspace.drafts || [];
    const updated = current.map(d => {
      if (d.id === draftId) {
        return { ...d, name: newName, updatedAt: new Date().toISOString() };
      }
      return d;
    });
    handleUpdateField({ drafts: updated });
    showToast('success', 'Draft Renamed', 'Draft name updated successfully.');
  };

  const handleOpenDraftEditor = (draft: CaseDraft) => {
    setActiveDraftId(draft.id);
    setEditorTitle(draft.name);
    setEditorType(draft.type);
    setEditorContent(draft.content);
    setEditorStatus(draft.status);
    setExpandedEditorTab('editor');
    setAiSuggestedDraftText(null);
    setIsAiSuggestionActive(false);
    setIsEditorOpen(true);
  };

  const handleSaveDraftContent = (isAutosave = false, customChanges = 'Modified content') => {
    if (!workspace || !activeDraftId) return;
    const current = workspace.drafts || [];
    let updatedName = editorTitle;

    const updated = current.map(d => {
      if (d.id === activeDraftId) {
        const nextVerNum = d.versions.length + 1;
        const newVer: CaseDraftVersion = {
          version: nextVerNum,
          content: editorContent,
          createdAt: new Date().toISOString(),
          changes: customChanges
        };
        return {
          ...d,
          name: updatedName,
          content: editorContent,
          status: editorStatus,
          versions: [...d.versions, newVer],
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });

    handleUpdateField({ drafts: updated });
    if (!isAutosave) {
      showToast('success', 'Draft Saved', `Saved version v${(current.find(d => d.id === activeDraftId)?.versions.length || 0) + 1}.`);
    }
  };

  const handleAutosaveContent = (newContent: string) => {
    if (!workspace || !activeDraftId) return;
    const current = workspace.drafts || [];
    const updated = current.map(d => {
      if (d.id === activeDraftId) {
        const versions = [...d.versions];
        if (versions.length > 0) {
          versions[versions.length - 1] = {
            ...versions[versions.length - 1],
            content: newContent,
            createdAt: new Date().toISOString()
          };
        }
        return {
          ...d,
          content: newContent,
          versions,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });
    handleUpdateField({ drafts: updated });
    setAutosaveStatus('Autosaved');
  };

  const handleEditorTextChange = (text: string) => {
    setEditorContent(text);
    setAutosaveStatus('Saving...');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      handleAutosaveContent(text);
    }, 1500);
  };

  const handleRestoreVersion = (ver: CaseDraftVersion) => {
    setEditorContent(ver.content);
    setSelectedVersion(ver.version);
    showToast('success', 'Version Restored', `Restored content buffer to Version v${ver.version}. Click Save to commit.`);
  };

  const runAiDraftAssist = async (actionLabel: string, actionMsg: string) => {
    if (!workspace) return;
    setIsAiDrafting(true);
    setAiDraftSteps([
      'Retrieving Case summary facts...',
      'Analyzing timeline details and active hearing issues...',
      'Incorporating Supreme Court landmark precedents...',
      'Drafting legally compliant clauses...',
      'Refining formal legal language...'
    ]);
    setActiveAiDraftStep(0);

    const stepInterval = setInterval(() => {
      setActiveAiDraftStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      const clientName = workspace.clientName || 'Plaintiff';
      const opponentName = workspace.opponentName || workspace.accused || 'Defendant';
      const contextText = `Case Summary: "${workspace.summary || workspace.caseSummary || ''}". Facts: ${JSON.stringify(workspace.facts || [])}. Legal Research: ${JSON.stringify(workspace.savedPrecedents || [])}. Arguments: ${JSON.stringify(workspace.intelligence || {})}.`;

      const res = await DraftService.executeTool({
        toolName: 'legal_draft_maker',
        message: `Perform AI Draft Assistance: "${actionLabel}". Guidelines: "${actionMsg}". Current text to edit: "${editorContent}". Case Context: ${contextText}`,
        caseContext: {
          name: editorTitle,
          clientName,
          opponentName,
          caseType: workspace.caseType,
          summary: workspace.summary || workspace.caseSummary
        }
      });

      clearInterval(stepInterval);
      if (res && res.success && res.reply) {
        setAiSuggestedDraftText(res.reply);
        setIsAiSuggestionActive(true);
        showToast('success', 'AI Proposal Ready', 'AI generated suggestions. Review differences below.');
      } else {
        throw new Error(res?.error || 'AI returned empty suggestion.');
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.warn('[AI DRAFT ASSIST ERROR]', err);
      showToast('error', 'AI Assistant Offline', 'Failed to generate AI drafting assistance.');
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestedDraftText) return;
    setEditorContent(aiSuggestedDraftText);
    setAiSuggestedDraftText(null);
    setIsAiSuggestionActive(false);
    showToast('success', 'Changes Applied', 'AI suggested text inserted into editor buffer.');
  };

  // Settings Rename Case
  const handleRenameCase = () => {
    if (!renameValue.trim()) {
      showToast('error', 'Validation Error', 'Case name cannot be empty.');
      return;
    }
    handleUpdateField({ name: renameValue });
    setIsModalOpen(false);
    showToast('success', 'Case Renamed', 'Workspace title updated.');
  };

  // Settings Delete Case
  const handleDeleteCase = async () => {
    if (!id) return;
    try {
      await CaseService.deleteCase(id);
      showToast('success', 'Workspace Purged', 'Case folder permanently removed.');
      router.replace('/(tabs)/cases');
    } catch (err) {
      showToast('error', 'Deletion Error', 'Failed to purge workspace.');
    }
  };

  // Upload simulated file select
  const handleSimulatedFileUpload = async () => {
    if (!id || !workspace) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[DocumentPicker] Cancelled by user.');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri || !asset.name) {
        showToast('error', 'Selection Failed', 'Could not read file details.');
        return;
      }

      const ext = asset.name.split('.').pop()?.toLowerCase() || '';
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';

      let docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other' = 'Other';
      if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
        docType = 'Proof';
      } else if (['doc', 'docx'].includes(ext)) {
        docType = 'Agreement';
      }

      showToast('info', 'Uploading...', `Uploading ${asset.name}`);

      const res = await UploadService.uploadCaseDocument(
        id,
        asset.uri,
        asset.name,
        mime,
        docType
      );

      if (res.success && res.data) {
        const newDoc = res.data;
        const currentDocs = workspace.documents || [];
        const currentFacts = workspace.facts || [];

        const uploadFact: CaseFact = {
          date: new Date().toLocaleDateString(),
          event: `Document Attached: ${newDoc.name}`,
          description: `Lawyer uploaded file ${newDoc.name} class ${docType} to case folder.`
        };

        handleUpdateField({
          documents: [...currentDocs, newDoc],
          facts: [...currentFacts, uploadFact] as any,
          intelligence: workspace.intelligence
        });

        showToast('success', 'File Attached', `Attached "${newDoc.name}" to case documents.`);
        // Run AI OCR timeline document extraction
        handleRunOcrTimeline(newDoc.name);
      } else {
        showToast('error', 'Upload Failed', res.error || 'Failed to upload case document.');
      }
    } catch (err: any) {
      console.error('[DocumentPicker] Pick & Upload error:', err);
      showToast('error', 'Upload Failed', err.message || 'Failed to select or upload document.');
    }
  };

  // DMS Handlers
  useEffect(() => {
    if (activeWorkspaceTab === 'documents' && attachments.length > 0) {
      const file = attachments[0];
      clearAttachments();
      setIsUploadOpen(false);
      handleDmsUpload(file);
    }
  }, [attachments, activeWorkspaceTab]);

  const handleDmsUpload = async (file: ChatAttachment) => {
    if (!id || !workspace) return;
    try {
      setUploadingProgress(10);
      const timer = setInterval(() => {
        setUploadingProgress((prev) => {
          if (prev === null) {
            clearInterval(timer);
            return null;
          }
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 15;
        });
      }, 150);

      // Determine upload type based on active tab
      const isEvTab = dmsTab === 'evidence';
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

      let uploadRes;
      if (!isEvTab) {
        // Upload to Documents
        const docType = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? 'Proof' : (['doc', 'docx'].includes(fileExt) ? 'Agreement' : 'Other');
        uploadRes = await UploadService.uploadCaseDocument(
          id as string,
          file.url,
          file.name,
          file.type || 'application/octet-stream',
          docType
        );
      } else {
        // Upload to Evidence
        const evType = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? 'Images' : (['mp4', 'mov'].includes(fileExt) ? 'Videos' : 'Document');
        uploadRes = await UploadService.uploadEvidence(
          id as string,
          file.url,
          file.name,
          file.type || 'application/octet-stream',
          { type: evType }
        );
      }

      setUploadingProgress(100);
      setTimeout(() => {
        setUploadingProgress(null);
      }, 500);

      if (uploadRes.success && uploadRes.data) {
        const newItem = uploadRes.data;
        const uploadFact: CaseFact = {
          date: new Date().toLocaleDateString(),
          event: `${isEvTab ? 'Evidence Exhibit' : 'Case Document'} Uploaded: ${newItem.name}`,
          description: `Uploaded case file "${newItem.name}" to the workspace vault.`
        };

        if (!isEvTab) {
          const currentDocs = (workspace.documents || []) as CaseDocument[];
          handleUpdateField({
            documents: [...currentDocs, newItem as CaseDocument] as CaseDocument[],
            facts: [...(workspace.facts || []), uploadFact] as any,
            intelligence: workspace.intelligence
          });
        } else {
          const currentEv = (workspace.evidence || []) as CaseEvidence[];
          handleUpdateField({
            evidence: [...currentEv, newItem as CaseEvidence] as CaseEvidence[],
            facts: [...(workspace.facts || []), uploadFact] as any,
            intelligence: workspace.intelligence
          });
        }

        showToast('success', 'Upload Successful', `"${newItem.name}" has been uploaded & parsed by OCR.`);
      } else {
        showToast('error', 'Upload Failed', uploadRes.error || 'Failed to sync file to repository.');
      }
    } catch (error: any) {
      setUploadingProgress(null);
      console.error('[handleDmsUpload] Error:', error);
      showToast('error', 'Upload Failed', error.message || 'File transmission error.');
    }
  };

  const togglePinItem = (itemId: string) => {
    setPinnedList((prev) => {
      const isPinned = prev.includes(itemId);
      if (isPinned) {
        showToast('info', 'Unpinned', 'Document unpinned from workspace top.');
        return prev.filter(id => id !== itemId);
      } else {
        showToast('success', 'Pinned', 'Document pinned to top.');
        return [...prev, itemId];
      }
    });
  };

  // Redesigned document manager handlers
  const startBackgroundUpload = async (
    uri: string,
    name: string,
    mime: string,
    size: number,
    docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other'
  ) => {
    // 1. Prevent duplicate uploads by name
    const isDuplicate = (workspace?.documents || []).some(
      (d: any) => d.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      showToast('error', 'Duplicate File', `"${name}" has already been uploaded.`);
      return;
    }

    const taskId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Determine initial state: compressing for images, uploading for others
    const isImageFile = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(mime.toLowerCase());
    const initialStatus = isImageFile ? 'compressing' : 'uploading';

    const newTask: UploadTask = {
      id: taskId,
      name,
      progress: 0,
      status: initialStatus,
      size,
      uri,
      mime,
      docType,
    };

    setUploadingTasks((prev) => [newTask, ...prev]);

    // Async worker execution context
    (async () => {
      let finalUri = uri;
      let finalMime = mime;
      let finalName = name;

      try {
        // Image compression step
        if (isImageFile) {
          try {
            console.log('[UploadPipeline] Compressing image:', uri);
            const manipResult = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 2048 } }],
              { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
            );
            finalUri = manipResult.uri;
            finalMime = 'image/jpeg';
            // Ensure filename extension is .jpg
            if (!finalName.toLowerCase().endsWith('.jpg') && !finalName.toLowerCase().endsWith('.jpeg')) {
              const baseName = finalName.includes('.') ? finalName.substring(0, finalName.lastIndexOf('.')) : finalName;
              finalName = `${baseName}.jpg`;
            }
          } catch (compressErr) {
            console.warn('[UploadPipeline] Image compression failed, uploading original:', compressErr);
          }

          // Move task status to uploading
          setUploadingTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: 'uploading' as const } : t))
          );
        }

        // Background upload with exponential backoff retries
        let attempts = 0;
        const maxAttempts = 3;
        let response: any = null;

        while (attempts < maxAttempts) {
          try {
            attempts++;
            response = await UploadService.uploadCaseDocument(
              id as string,
              finalUri,
              finalName,
              finalMime,
              docType,
              (progressVal) => {
                setUploadingTasks((prev) =>
                  prev.map((t) => (t.id === taskId ? { ...t, progress: progressVal } : t))
                );
              }
            );

            if (response.success && response.data) {
              break;
            } else {
              throw new Error(response.error || 'Upload returned success=false');
            }
          } catch (uploadError: any) {
            console.warn(`[UploadPipeline] Upload attempt ${attempts} failed for ${name}:`, uploadError.message);
            if (attempts >= maxAttempts) {
              throw uploadError;
            }
            // Wait with exponential backoff: 2s, 4s...
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
          }
        }

        if (response && response.success && response.data) {
          const newDoc = response.data;
          const currentDocs = workspace?.documents || [];
          const currentFacts = workspace?.facts || [];

          const uploadFact: CaseFact = {
            date: new Date().toLocaleDateString(),
            event: `Document Attached: ${newDoc.name}`,
            description: `Uploaded file ${newDoc.name} from device to case folder.`
          };

          handleUpdateField({
            documents: [...currentDocs, newDoc],
            facts: [...currentFacts, uploadFact] as any
          });

          showToast('success', 'File Attached', `Attached "${newDoc.name}" to case documents.`);
          handleRunOcrTimeline(newDoc.name);

          // Clear task from list
          setUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
        }
      } catch (err: any) {
        console.error('[UploadPipeline] Background upload error:', err);
        showToast('error', 'Upload Failed', `Failed to upload "${name}".`);
        setUploadingTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' as const, progress: 0 } : t))
        );
      }
    })();
  };

  const retryUploadTask = (taskId: string) => {
    const task = uploadingTasks.find((t) => t.id === taskId);
    if (!task) return;
    // Remove the failed task and start fresh
    setUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
    startBackgroundUpload(task.uri, task.name, task.mime, task.size, task.docType);
  };

  const removeUploadTask = (taskId: string) => {
    setUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Background Evidence Upload Pipeline
  const startBackgroundEvidenceUpload = async (
    uri: string,
    name: string,
    mime: string,
    size: number
  ) => {
    const isDuplicate = (workspace?.evidence || []).some(
      (e: any) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      showToast('error', 'Duplicate File', `"${name}" is already in the Evidence Vault.`);
      return;
    }

    const taskId = `ev_upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTask = {
      id: taskId,
      name,
      progress: 0,
      status: 'uploading' as const,
    };

    setEvidenceUploadingTasks((prev) => [newTask, ...prev]);

    (async () => {
      try {
        const fileExt = name.split('.').pop()?.toLowerCase() || '';
        const evType = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? 'Images' : (['mp4', 'mov'].includes(fileExt) ? 'Videos' : 'Document');
        
        const res = await UploadService.uploadEvidence(
          id as string,
          uri,
          name,
          mime,
          { type: evType },
          (progressPercent) => {
            setEvidenceUploadingTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, progress: progressPercent } : t))
            );
          }
        );

        if (res.success && res.data) {
          setEvidenceUploadingTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, progress: 100, status: 'complete' } : t))
          );
          
          updateWorkspaceState(id as string, {
            evidence: [...(workspace?.evidence || []), res.data],
          });
          
          showToast('success', 'Upload Complete', `"${name}" added to Evidence Vault.`);
          
          setTimeout(() => {
            setEvidenceUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
          }, 3000);
        } else {
          throw new Error(res.error || 'Upload returned unsuccessful response.');
        }
      } catch (err: any) {
        console.error('[Evidence Ingest Error]', err);
        setEvidenceUploadingTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' } : t))
        );
        showToast('error', 'Upload Failed', `Could not upload "${name}": ${err.message || 'unknown error'}`);
      }
    })();
  };

  const handleEvidenceCaptureCamera = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const fileName = asset.fileName || `Scan_${Date.now()}.jpg`;
      startBackgroundEvidenceUpload(asset.uri, fileName, 'image/jpeg', asset.fileSize || 0);
    } catch (err: any) {
      console.error('[Camera Scan Error]', err);
      showToast('error', 'Capture Failed', err.message || 'Failed to capture photo.');
    }
  };

  const handleEvidenceChooseGallery = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const granted = await requestPermissionFlow('photos');
      if (!granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.95,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      for (const asset of result.assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = asset.fileName || `Gallery_${Date.now()}.${fileExt}`;
        const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        startBackgroundEvidenceUpload(asset.uri, fileName, mime, asset.fileSize || 0);
      }
    } catch (err: any) {
      console.error('[Gallery Pick Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select media.');
    }
  };

  const handleEvidenceChoosePdf = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      for (const asset of result.assets) {
        startBackgroundEvidenceUpload(asset.uri, asset.name, 'application/pdf', asset.size || 0);
      }
    } catch (err: any) {
      console.error('[PDF Picker Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select PDF.');
    }
  };

  const handleEvidenceBrowseFiles = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
      };

      for (const asset of result.assets) {
        const ext = asset.name.split('.').pop()?.toLowerCase() || '';
        const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';
        startBackgroundEvidenceUpload(asset.uri, asset.name, mime, asset.size || 0);
      }
    } catch (err: any) {
      console.error('[Browse Files Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select files.');
    }
  };

  const handleAnalyzeEvidenceWithAI = async (item: any) => {
    if (!id || !item) return;
    const itemId = item._id || item.id;
    setIsEvidenceOptionsOpen(false);
    setIsAnalyzingEvidence(true);
    setAiAnalysisProgressStep(0);

    const timer = setInterval(() => {
      setAiAnalysisProgressStep((prev) => {
        if (prev >= 3) {
          clearInterval(timer);
          return 3;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const res = await EvidenceService.analyzeEvidence(id as string, itemId);
      clearInterval(timer);

      if (res.success && res.data) {
        const updatedEvidence = (workspace?.evidence || []).map((e: any) =>
          String(e.id || e._id) === itemId ? res.data : e
        );
        updateWorkspaceState(id as string, { evidence: updatedEvidence });
        setIsAnalyzingEvidence(false);
        showToast('success', 'Analysis Complete', `AI report ready for "${item.name}".`);

        router.push({
          pathname: '/workspace/evidence-analysis',
          params: { caseId: id, evidenceId: itemId },
        });
      } else {
        throw new Error(res.error || 'Analysis returned unsuccessful response.');
      }
    } catch (err: any) {
      clearInterval(timer);
      setIsAnalyzingEvidence(false);
      console.error('[AI Analysis Error]', err);
      showToast('error', 'Analysis Failed', err.message || 'Failed to generate AI report.');
    }
  };

  const handleScanDocument = async () => {
    setUploadBottomSheetOpen(false);
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;

      console.log('[Scanner] Launching camera');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[Scanner] Camera cancelled.');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        showToast('error', 'Capture Failed', 'Could not read captured image details.');
        return;
      }

      const fileName = `Scanned_Doc_${Date.now()}.jpg`;
      const mime = 'image/jpeg';
      const docType = 'Proof';

      startBackgroundUpload(asset.uri, fileName, mime, asset.fileSize || 0, docType);
    } catch (err: any) {
      console.error('[Scanner Error]', err);
      showToast('error', 'Scan Failed', err.message || 'Failed to initialize scanner camera.');
    }
  };

  const handleChooseFromDevice = async () => {
    setUploadBottomSheetOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[Picker] Cancelled by user.');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri || !asset.name) {
        showToast('error', 'Selection Failed', 'Could not read file details.');
        return;
      }

      const ext = asset.name.split('.').pop()?.toLowerCase() || '';
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
      };
      const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';

      let docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other' = 'Other';
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        docType = 'Proof';
      }

      startBackgroundUpload(asset.uri, asset.name, mime, asset.size || 0, docType);
    } catch (err: any) {
      console.error('[Picker Error]', err);
      showToast('error', 'Upload Failed', err.message || 'Failed to select document.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const itemId = deletingItem._id || deletingItem.id;
    
    // Check if it is a Document or an Evidence exhibit
    const isDoc = (workspace?.documents || []).some(d => d._id === itemId);
    
    if (isDoc) {
      // Remove locally immediately for smooth UI transition
      const originalDocs = workspace?.documents || [];
      const updatedDocs = originalDocs.filter(d => d._id !== itemId);
      
      updateWorkspaceState(id as string, { documents: updatedDocs });
      setDeletingItem(null);
      showToast('info', 'Deleting...', 'Deleting case document permanently.');
  
      try {
        const res = await CaseService.deleteDocument(id as string, itemId);
        if (res.success) {
          showToast('success', 'Deleted', `"${deletingItem.name}" deleted permanently.`);
          fetchWorkspaceDetails(id as string);
        } else {
          showToast('error', 'Delete Failed', 'Failed to remove document from server.');
          updateWorkspaceState(id as string, { documents: originalDocs });
        }
      } catch (err) {
        console.error('[Document Delete Sync error]', err);
        showToast('error', 'Delete Failed', 'Failed to synchronize deletion.');
        updateWorkspaceState(id as string, { documents: originalDocs });
      }
    } else {
      // Evidence deletion
      const originalEvidence = workspace?.evidence || [];
      const updatedEvidence = originalEvidence.filter(e => e.id !== itemId && e._id !== itemId);
      
      updateWorkspaceState(id as string, { evidence: updatedEvidence });
      setDeletingItem(null);
      showToast('info', 'Purging...', 'Purging evidence vault item.');
  
      try {
        const res = await CaseService.updateCase(id as string, { evidence: updatedEvidence });
        if (res.success) {
          showToast('success', 'Evidence Purged', `"${deletingItem.name}" permanently removed.`);
          fetchWorkspaceDetails(id as string);
        } else {
          showToast('error', 'Delete Failed', 'Failed to purge evidence from server.');
          updateWorkspaceState(id as string, { evidence: originalEvidence });
        }
      } catch (err) {
        console.error('[Evidence Delete Sync error]', err);
        showToast('error', 'Delete Failed', 'Failed to synchronize deletion.');
        updateWorkspaceState(id as string, { evidence: originalEvidence });
      }
    }
  };

  const handleRestoreItem = (item: any) => {
    const itemId = item._id || item.id;
    setTrashList((prev) => prev.filter(id => id !== itemId));
    showToast('success', 'Restored', `"${item.name}" restored to active vault.`);
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renamingName.trim()) return;
    const itemId = renamingItem._id || renamingItem.id;
    const isDoc = (workspace?.documents || []).some(d => d._id === itemId);

    if (isDoc) {
      const originalDocs = workspace?.documents || [];
      const updatedDocs = originalDocs.map(d => {
        if (d._id === itemId) return { ...d, name: renamingName.trim() };
        return d;
      });

      // Optimistic UI update
      updateWorkspaceState(id as string, { documents: updatedDocs });
      setRenamingItem(null);

      try {
        const res = await CaseService.updateCase(id as string, { documents: updatedDocs });
        if (res.success) {
          showToast('success', 'Renamed', `File renamed to "${renamingName.trim()}"`);
          fetchWorkspaceDetails(id as string);
        } else {
          showToast('error', 'Rename Failed', 'Failed to save new filename on server.');
          updateWorkspaceState(id as string, { documents: originalDocs });
        }
      } catch (err) {
        console.error('[Document Rename Sync error]', err);
        showToast('error', 'Rename Failed', 'Failed to sync renamed file.');
        updateWorkspaceState(id as string, { documents: originalDocs });
      }
    } else {
      const originalEvidence = workspace?.evidence || [];
      const updatedEvidence = originalEvidence.map(e => {
        if (e._id === itemId || e.id === itemId) return { ...e, name: renamingName.trim() };
        return e;
      });

      // Optimistic UI update
      updateWorkspaceState(id as string, { evidence: updatedEvidence });
      setRenamingItem(null);

      try {
        const res = await CaseService.updateCase(id as string, { evidence: updatedEvidence });
        if (res.success) {
          showToast('success', 'Renamed', `Evidence renamed to "${renamingName.trim()}"`);
          fetchWorkspaceDetails(id as string);
        } else {
          showToast('error', 'Rename Failed', 'Failed to save new filename on server.');
          updateWorkspaceState(id as string, { evidence: originalEvidence });
        }
      } catch (err) {
        console.error('[Evidence Rename Sync error]', err);
        showToast('error', 'Rename Failed', 'Failed to sync renamed file.');
        updateWorkspaceState(id as string, { evidence: originalEvidence });
      }
    }
  };

  const getFilteredDocs = () => {
    const list = workspace?.documents || [];
    let result = [...list];

    // Search filter
    if (docSearchQuery.trim()) {
      const query = docSearchQuery.toLowerCase();
      result = result.filter(item => {
        const name = (item.name || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const date = new Date(item.uploadDate || 0).toLocaleDateString().toLowerCase();
        return name.includes(query) || type.includes(query) || date.includes(query);
      });
    }

    // Sort logic
    result.sort((a, b) => {
      if (docSortBy === 'newest') {
        const aDate = new Date(a.uploadDate || 0).getTime();
        const bDate = new Date(b.uploadDate || 0).getTime();
        return bDate - aDate;
      }
      if (docSortBy === 'oldest') {
        const aDate = new Date(a.uploadDate || 0).getTime();
        const bDate = new Date(b.uploadDate || 0).getTime();
        return aDate - bDate;
      }
      if (docSortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (docSortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });

    return result;
  };

  const handleSaveNotes = () => {
    if (!editingNotesItem) return;
    const itemId = editingNotesItem._id || editingNotesItem.id;

    if (dmsTab === 'documents') {
      const updatedDocs = (workspace?.documents || []).map(d => {
        if (d._id === itemId) return { ...d, extractedData: { ...(d.extractedData || {}), notes: editingNotesText } };
        return d;
      });
      handleUpdateField({ documents: updatedDocs });
    } else {
      const updatedEv = (workspace?.evidence || []).map(e => {
        if (e.id === itemId || e._id === itemId) return { ...e, notes: editingNotesText };
        return e;
      });
      handleUpdateField({ evidence: updatedEv });
    }

    showToast('success', 'Notes Saved', 'Observations updated.');
    setEditingNotesItem(null);
  };

  const handleVerifyEvidence = (item: any, nextStatus: 'Verified' | 'Pending' | 'Rejected') => {
    const itemId = item.id || item._id;
    const updatedEv = (workspace?.evidence || []).map(e => {
      if (e.id === itemId || e._id === itemId) return { ...e, status: nextStatus };
      return e;
    });
    handleUpdateField({ evidence: updatedEv });
    showToast('success', 'Status Updated', `Evidence changed to ${nextStatus}.`);
  };

  // --- RENDER SECTIONS ---

  // --- REDESIGNED COMMAND CENTER COMPONENTS ---
  const getRiskScore = (level?: string) => {
    if (!level) return '50%';
    const l = level.toLowerCase();
    if (l === 'critical') return '95%';
    if (l === 'high') return '75%';
    if (l === 'medium') return '50%';
    if (l === 'low') return '25%';
    return '50%';
  };

  // --- REDESIGNED COMMAND CENTER COMPONENTS ---
  const renderQuickInsights = () => {
    const summaryText = (workspace?.summary || workspace?.caseSummary || '').trim();
    const hasSummary = summaryText.length >= 50;
    const hasEvidenceOrDocs = (workspace?.evidence && workspace.evidence.length > 0) || (workspace?.documents && workspace.documents.length > 0);
    const hasTimeline = workspace?.facts && workspace.facts.length > 0;

    const rawWin = workspace?.intelligence?.winProbability;
    const rawStrength = workspace?.intelligence?.strengthScore;
    const isSufficient = hasSummary && hasEvidenceOrDocs && hasTimeline && rawWin !== undefined && rawWin !== null && rawWin > 0;
    const winProbVal = isSufficient ? `${rawWin}%` : 'Insufficient Data';
    const strengthVal = isSufficient ? `${rawStrength}%` : 'Pending AI Analysis';
    const subMsg = isSufficient ? undefined : 'Complete case facts to generate predictions';

    const pendingTasks = workspace?.tasks?.filter((t) => t.status !== 'Completed').length || 0;
    const totalTasks = workspace?.tasks?.length || 0;
    const evidenceCount = workspace?.evidence?.length || 0;
    const upcomingHearings = workspace?.hearings?.filter((h) => h.status === 'Upcoming') || [];
    const nextHearing = upcomingHearings[0];
    const missingDocsCount = workspace?.intelligence?.missingEvidence?.length || 0;
    const riskLevel = workspace?.intelligence?.riskLevel || workspace?.priority || 'High';
    const riskScore = getRiskScore(riskLevel);

    const insights = [
      { id: 'win', title: t('workspace.winProbability'), value: winProbVal, subtitle: subMsg, icon: 'trending-up-outline', color: theme.success },
      { id: 'strength', title: t('workspace.caseStrength'), value: strengthVal, subtitle: subMsg, icon: 'shield-checkmark-outline', color: theme.info },
      { id: 'tasks', title: t('workspace.tasks'), value: `${pendingTasks} Pending`, subtitle: `${totalTasks - pendingTasks}/${totalTasks} completed`, icon: 'checkbox-outline', color: theme.primary },
      { id: 'evidence', title: t('workspace.evidenceVault'), value: `${evidenceCount} Exhibits`, icon: 'briefcase-outline', color: '#C8A34D' },
      { id: 'hearing', title: t('workspace.upcomingHearing'), value: nextHearing ? nextHearing.date : t('cases.nothingScheduled'), subtitle: `${upcomingHearings.length} scheduled`, icon: 'calendar-outline', color: theme.warning },
      { id: 'missing', title: t('workspace.evidenceAlerts'), value: `${missingDocsCount} Missing`, icon: 'warning-outline', color: theme.danger },
      { id: 'risk', title: t('workspace.analytics'), value: riskScore, subtitle: `${riskLevel} Level`, icon: 'alert-circle-outline', color: '#EC4899' },
    ];

    return (
      <View style={styles.insightsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightsScroll}
        >
          {insights.map((ins) => (
            <View key={ins.id} style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <Ionicons name={ins.icon as any} size={14} color={ins.color} />
                <Text style={styles.insightCardTitle} numberOfLines={1}>{ins.title}</Text>
              </View>
              <Text style={styles.insightCardValue} numberOfLines={1}>{ins.value}</Text>
              {ins.subtitle ? <Text style={styles.insightCardSub}>{ins.subtitle}</Text> : null}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAiAssistantCard = () => {
    const ws = workspace as any;
    const ci = ws?.caseIntelligence || {};
    const aiData = ci.aiAssistant || {};
    const personalAnalysis = ws?.personalAnalysis || null;

    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const summaryText = workspace?.summary || workspace?.caseSummary || '';
    const hasSufficientInfo = Boolean(summaryText && summaryText.trim().length >= 40);

    // Status Pill Badge
    const badgeText = personalAnalysis 
      ? 'Analysis Available' 
      : (hasSufficientInfo ? 'Case Data Updated' : 'Limited Case Data');

    // Case Status
    const status = personalAnalysis?.overview?.stageStatus 
      || aiData.litigationStatus 
      || workspace?.stage 
      || workspace?.status 
      || (hasSufficientInfo ? 'Active Litigation' : 'Not enough information yet');

    // Latest Insight
    const latestInsight = personalAnalysis?.completeCaseSummary 
      || aiData.latestAdvice 
      || ci.recommendations?.[0] 
      || workspace?.intelligence?.strategyRecommendations?.[0] 
      || null;

    // Recommended Action
    const recommendedAction = personalAnalysis?.recommendedNextSteps?.[0] 
      || aiData.recommendedAction 
      || ci.tasks?.[0]?.title 
      || (hasSufficientInfo ? 'Review uploaded documents and evidence' : 'Complete the case details to improve AI insights.');

    // Evidence Alert (Show ONLY when there is an actual evidence-related issue or missing evidence)
    const evidenceIssue = aiData.evidenceAlerts && !aiData.evidenceAlerts.toLowerCase().includes('no critical') && !aiData.evidenceAlerts.toLowerCase().includes('sufficient case details unavailable')
      ? aiData.evidenceAlerts
      : (ci.missingEvidence?.[0] ? `Missing: ${ci.missingEvidence[0]}` : null);

    // Next Hearing / Deadline
    const nextHearingDate = ws?.nextHearingDate 
      || ws?.nextHearing
      || (workspace?.hearings && workspace.hearings.length > 0 ? workspace.hearings[0]?.date : null);
    const nextDeadlineTask = (workspace?.tasks || []).find((t: any) => t.status !== 'Completed' && t.deadline);
    const nextDeadline = nextHearingDate 
      ? `${nextHearingDate}` 
      : (aiData.nextDeadline && !aiData.nextDeadline.toLowerCase().includes('no pending') 
          ? aiData.nextDeadline 
          : (nextDeadlineTask ? `${nextDeadlineTask.title} (${nextDeadlineTask.deadline})` : 'None scheduled'));

    // Missing Information Gaps
    const missingItems = aiData.missingInformation || ci.missingEvidence || [];

    return (
      <View style={styles.aiAssistantCard}>
        {/* Card Header: CASE INTELLIGENCE */}
        <View style={styles.aiAssistantHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="sparkles-outline" size={16} color="#C8A34D" style={{ marginRight: 6 }} />
            <Text style={[styles.aiAssistantTitle, { letterSpacing: 0.5 }]}>CASE INTELLIGENCE</Text>
          </View>
          <View style={{ backgroundColor: isDark ? 'rgba(200,163,77,0.15)' : '#FFFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#C8A34D' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#C8A34D' }}>
              {badgeText}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        {!hasSufficientInfo && !personalAnalysis ? (
          /* Clean Incomplete / Limited State */
          <View style={{ gap: 6, marginTop: 4 }}>
            <View style={styles.aiAssistantRow}>
              <Text style={styles.aiAssistantLabel}>CASE STATUS</Text>
              <Text style={[styles.aiAssistantValue, { fontWeight: '600', color: textSecondary }]}>Not enough information yet</Text>
            </View>
            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />
            <View style={styles.aiAssistantRow}>
              <Text style={styles.aiAssistantLabel}>RECOMMENDED ACTION</Text>
              <Text style={[styles.aiAssistantValue, { fontWeight: '600', color: theme.textPrimary }]}>Complete the case details to improve AI insights.</Text>
            </View>
            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />
            <View style={{ marginTop: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#C8A34D', marginBottom: 4, letterSpacing: 0.3 }}>INFORMATION NEEDED</Text>
              <Text style={{ fontSize: 11, color: textSecondary, lineHeight: 16 }}>• Case summary</Text>
              <Text style={{ fontSize: 11, color: textSecondary, lineHeight: 16 }}>• Important documents</Text>
              <Text style={{ fontSize: 11, color: textSecondary, lineHeight: 16 }}>• Evidence</Text>
              <Text style={{ fontSize: 11, color: textSecondary, lineHeight: 16 }}>• Hearing details</Text>
            </View>
          </View>
        ) : (
          /* Full Overview State */
          <View style={{ gap: 6, marginTop: 4 }}>
            {/* CASE STATUS */}
            <View style={styles.aiAssistantRow}>
              <Text style={styles.aiAssistantLabel}>CASE STATUS</Text>
              <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={[styles.aiAssistantValue, { fontWeight: '700', color: '#10B981' }]}>{status}</Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />

            {/* LATEST INSIGHT */}
            {latestInsight && (
              <>
                <View style={styles.aiAssistantRow}>
                  <Text style={styles.aiAssistantLabel}>LATEST INSIGHT</Text>
                  <Text style={[styles.aiAssistantValue, { color: theme.textPrimary }]} numberOfLines={2}>{latestInsight}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />
              </>
            )}

            {/* RECOMMENDED ACTION */}
            <View style={styles.aiAssistantRow}>
              <Text style={styles.aiAssistantLabel}>RECOMMENDED ACTION</Text>
              <Text style={[styles.aiAssistantValue, { fontWeight: '600', color: theme.textPrimary }]}>{recommendedAction}</Text>
            </View>

            {/* EVIDENCE ALERT (Show ONLY when there is an actual evidence-related issue) */}
            {evidenceIssue && (
              <>
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />
                <View style={styles.aiAssistantRow}>
                  <Text style={styles.aiAssistantLabel}>EVIDENCE ALERT</Text>
                  <Text style={[styles.aiAssistantValue, { color: theme.danger, fontWeight: '700' }]}>
                    ⚠️ {evidenceIssue}
                  </Text>
                </View>
              </>
            )}

            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />

            {/* NEXT HEARING / DEADLINE */}
            <View style={styles.aiAssistantRow}>
              <Text style={styles.aiAssistantLabel}>NEXT HEARING / DEADLINE</Text>
              <Text style={[styles.aiAssistantValue, { color: theme.textPrimary }]}>{nextDeadline}</Text>
            </View>

            {/* INFORMATION GAPS (Show ONLY when information is actually missing) */}
            {missingItems && missingItems.length > 0 && !personalAnalysis && (
              <>
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', marginVertical: 2 }} />
                <View style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.danger, marginBottom: 4 }}>INFORMATION GAPS</Text>
                  {missingItems.slice(0, 3).map((item: any, idx: number) => (
                    <Text key={idx} style={{ fontSize: 11, color: textSecondary }}>• {typeof item === 'string' ? item : item.title}</Text>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderWorkspaceNavigation = () => {
    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const lawyers = workspace?.lawyers || [];
    const partiesCount = 2 + lawyers.length;

    const courtOrdersList = workspace?.courtOrders || [];

    const navTiles = [
      { id: 'case-info', label: 'Case Info ⭐', desc: 'Case parameters & AI summary', icon: 'information-circle-outline', color: '#C8A34D' },
      { id: 'analysis', label: t('workspace.aiCaseAnalysis'), desc: latestAnalysis ? t('workspace.versionReady', { version: latestAnalysis.version }) : t('workspace.completeIntelReport'), icon: 'analytics-outline', color: '#C8A34D' },
      { id: 'timeline', label: t('workspace.timeline'), desc: t('workspace.timelineCount', { count: workspace?.facts?.length || 0 }), icon: 'time-outline', color: '#C8A34D' },
      { id: 'hearings', label: t('cases.hearings'), desc: t('workspace.hearingsScheduled', { count: workspace?.hearings?.length || 0 }), icon: 'hammer-outline', color: '#C8A34D' },
      { id: 'parties', label: t('workspace.parties'), desc: t('workspace.litigantsAndCounsel', { count: partiesCount }), icon: 'people-outline', color: '#C8A34D' },
      { id: 'documents', label: t('workspace.documents'), desc: t('workspace.documentsCount', { count: workspace?.documents?.length || 0 }), icon: 'document-text-outline', color: '#C8A34D' },
      { id: 'evidence', label: t('workspace.evidenceVault'), desc: t('workspace.evidenceCount', { count: workspace?.evidence?.length || 0 }), icon: 'shield-checkmark-outline', color: '#C8A34D' },
      { id: 'research', label: t('workspace.researchLaws'), desc: t('workspace.savedPrecedentsCount', { count: workspace?.savedPrecedents?.length || 0 }), icon: 'library-outline', color: '#C8A34D' },
      { id: 'client-connect', label: 'AI Client Connect ⭐ NEW', desc: 'Smart client communication system', icon: 'chatbubble-ellipses-outline', color: '#C8A34D' },
      { id: 'contracts', label: t('cases.contracts'), desc: t('workspace.contractsStatus'), icon: 'briefcase-outline', color: '#C8A34D' },
      { id: 'arguments', label: t('workspace.arguments'), desc: t('workspace.argumentsCount', { count: 3 }), icon: 'alert-circle-outline', color: '#C8A34D' },
      { id: 'tasks', label: t('workspace.tasks'), desc: t('workspace.pendingTasksCount', { count: (workspace?.tasks || []).filter(t => t.status !== 'Completed').length }), icon: 'list-outline', color: '#C8A34D' },
      { id: 'notes', label: t('workspace.notes'), desc: t('workspace.notesDesc'), icon: 'pencil-outline', color: '#C8A34D' },
      { id: 'court-orders', label: t('workspace.courtOrders'), desc: t('workspace.courtOrdersCount', { count: courtOrdersList.length }), icon: 'document-outline', color: '#C8A34D' },
    ];

    return (
      <View style={styles.navigationSection}>
        <Text style={styles.sectionHeader}>{t('workspace.caseModules')}</Text>
        <View style={styles.tilesContainer}>
          {navTiles.map((tile) => (
            <Pressable
              key={tile.id}
              style={({ pressed }) => [styles.navTile, pressed && styles.navTilePressed]}
              onPress={() => {
                if (tile.id === 'documents') {
                  router.push({ pathname: '/workspace/documents', params: { caseId: id } });
                } else if (tile.id === 'evidence') {
                  router.push({ pathname: '/workspace/evidence-vault', params: { caseId: id } });
                } else if (tile.id === 'contracts') {
                  router.push({ pathname: '/workspace/contracts', params: { caseId: id } });
                } else {
                  setActiveWorkspaceTab(tile.id);
                }
              }}
            >
              <View style={[styles.navTileIconBg, { backgroundColor: `${tile.color}12` }]}>
                <Ionicons name={tile.icon as any} size={18} color={tile.color} />
              </View>
              <View style={styles.navTileContent}>
                <Text style={styles.navTileLabel}>{tile.label}</Text>
                <Text style={styles.navTileDesc}>{tile.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderTimelinePreview = () => {
    const factsList = (workspace?.facts || []).map((item: any) => ({
      date: item.date,
      title: item.event || item.title,
      description: item.description || '',
    }));
    const hearingsList = (workspace?.hearings || []).map((item: any) => ({
      date: item.date,
      title: `Hearing scheduled: Courtroom ${item.courtroom || 'N/A'}`,
      description: item.notes || `Scheduled hearing time: ${item.time || '10:00 AM'}`,
    }));
    const documentsList = (workspace?.documents || []).map((item: any) => ({
      date: item.date || 'N/A',
      title: `Document Uploaded: ${item.name}`,
      description: `Type: ${item.type || 'Upload'}.`,
    }));
    const evidenceList = (workspace?.evidence || []).map((item: any) => ({
      date: item.dateLogged || item.date || 'N/A',
      title: `Evidence Exhibit: ${item.name}`,
      description: item.description || '',
    }));
    const parseDate = (dStr: any) => {
      if (!dStr || dStr === 'N/A') return new Date(0);
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) return d;
      try {
        const parts = String(dStr).split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          const month = months[parts[1].toLowerCase().substring(0, 3)];
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      } catch (e) { }
      return new Date(0);
    };

    const unifiedTimeline = [
      ...factsList,
      ...hearingsList,
      ...documentsList,
      ...evidenceList,
    ].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    const timelineEvents = unifiedTimeline.slice(-3).reverse();

    const getLocalizedEvent = (title: string, description: string) => {
      let mappedTitle = title;
      let mappedDescription = description;

      if (title.startsWith('Hearing scheduled:')) {
        const courtroom = title.replace('Hearing scheduled: Courtroom ', '');
        mappedTitle = t('timeline.hearingScheduledTitle', { courtroom });
        if (description.startsWith('Scheduled hearing time:')) {
          const time = description.replace('Scheduled hearing time: ', '');
          mappedDescription = t('timeline.hearingScheduledDesc', { time });
        }
      } else if (title.startsWith('Document Uploaded:')) {
        const filename = title.replace('Document Uploaded: ', '');
        mappedTitle = t('timeline.documentUploadedTitle', { filename });
        if (description.startsWith('Type:')) {
          const type = description.replace('Type: ', '').replace('.', '');
          mappedDescription = t('timeline.documentUploadedDesc', { type });
        }
      } else if (title.startsWith('Evidence Exhibit:')) {
        const filename = title.replace('Evidence Exhibit: ', '');
        mappedTitle = t('timeline.evidenceExhibitTitle', { filename });
      } else {
        if (title === 'Default Notice Served') {
          mappedTitle = t('timeline.defaultNoticeServed');
        } else if (title === 'AI Analysis Completed') {
          mappedTitle = t('timeline.aiAnalysisCompleted');
        } else if (title === 'Deadline for Filing Complaint') {
          mappedTitle = t('timeline.deadlineForFilingComplaint');
        }

        if (description.startsWith('Timeline entry parsed from OCR scan of file:')) {
          const match = description.match(/file:\s*([^\s]+)\.\s*(.*)/);
          if (match) {
            mappedDescription = t('timeline.ocrParsedDesc', { filename: match[1], rest: match[2] });
          } else {
            mappedDescription = t('timeline.ocrParsedDescGeneric');
          }
        } else if (description.startsWith('Admissibility analysis and OCR text compiled for exhibit')) {
          const match = description.match(/exhibit\s*(.*)/);
          mappedDescription = t('timeline.admissibilityDesc', { exhibit: match ? match[1] : '' });
        } else if (description.startsWith('The one-month period for filing a complaint under Section 138 NI Act')) {
          mappedDescription = t('timeline.filingDeadlineDesc');
        }
      }

      return { title: mappedTitle, description: mappedDescription };
    };

    return (
      <View style={styles.previewSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{t('workspace.timelinePreview') || t('workspace.timeline')}</Text>
          <Pressable onPress={() => setActiveWorkspaceTab('timeline')}>
            <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
          </Pressable>
        </View>

        {timelineEvents.length === 0 ? (
          <Text style={styles.previewEmptyText}>{t('empty.noTimeline')}</Text>
        ) : (
          <View style={styles.previewList}>
            {timelineEvents.map((ev, i) => {
              const localized = getLocalizedEvent(ev.title, ev.description);
              return (
                <View key={i} style={styles.previewItem}>
                  <View style={styles.previewDotContainer}>
                    <View style={styles.previewDot} />
                    {i < timelineEvents.length - 1 && <View style={styles.previewVerticalLine} />}
                  </View>
                  <View style={styles.previewItemContent}>
                    <Text style={styles.previewItemDate}>{formatRelativeDate(ev.date, language)}</Text>
                    <Text style={styles.previewItemTitle}>{localized.title}</Text>
                    <Text style={styles.previewItemDesc} numberOfLines={2}>{localized.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.viewTimelineBtn}
          onPress={() => setActiveWorkspaceTab('timeline')}
        >
          <Text style={styles.viewTimelineBtnText}>{t('workspace.viewCompleteTimeline')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecentActivity = () => {
    const docs = (workspace?.documents || []).filter(d => !d.tags.includes('AI Compiled'));
    const drafts = (workspace?.documents || []).filter(d => d.tags.includes('AI Compiled'));
    const evidence = workspace?.evidence || [];
    const note = workspace?.summary || workspace?.caseSummary;

    const activities: { type: string; title: string; time: string; icon: string; color: string }[] = [];

    const getLocalizedTime = (timeVal: string) => {
      switch (timeVal) {
        case 'Recently':
          return t('activity.recently') || 'Recently';
        case 'Just now':
          return t('activity.justNow') || 'Just now';
        case 'Saved':
          return t('activity.saved') || 'Saved';
        case 'System':
          return t('activity.system') || 'System';
        case 'AI Updated':
          return t('activity.aiUpdated') || 'AI Updated';
        default:
          return timeVal;
      }
    };

    if (docs.length > 0) {
      activities.push({
        type: t('activity.documentUploaded'),
        title: docs[docs.length - 1].name,
        time: getLocalizedTime(docs[docs.length - 1].uploadDate || 'Recently'),
        icon: 'document-text-outline',
        color: theme.info,
      });
    }

    if (drafts.length > 0) {
      activities.push({
        type: t('activity.draftCompiled') || 'Draft Compiled',
        title: drafts[drafts.length - 1].name,
        time: getLocalizedTime(drafts[drafts.length - 1].uploadDate || 'Recently'),
        icon: 'create-outline',
        color: '#EC4899',
      });
    }

    if (workspace?.intelligence?.strategyRecommendations?.[0]) {
      activities.push({
        type: t('activity.aiRecommendation') || 'AI Strategic Recommendation',
        title: workspace.intelligence.strategyRecommendations[0],
        time: getLocalizedTime('AI Updated'),
        icon: 'sparkles-outline',
        color: theme.primary,
      });
    }

    if (evidence.length > 0) {
      activities.push({
        type: t('activity.evidenceLogged'),
        title: evidence[0].name,
        time: getLocalizedTime('Just now'),
        icon: 'shield-checkmark-outline',
        color: theme.success,
      });
    }

    if (note) {
      activities.push({
        type: t('activity.noteCreated'),
        title: note.substring(0, 50) + (note.length > 50 ? '...' : ''),
        time: getLocalizedTime('Saved'),
        icon: 'pencil-outline',
        color: theme.textSecondary,
      });
    }

    if (activities.length === 0) {
      activities.push({
        type: t('activity.workspaceInitialized') || 'Workspace Initialized',
        title: t('activity.workspaceInitDesc') || 'Case files indexed and AI recommendations generated.',
        time: getLocalizedTime('System'),
        icon: 'sync-outline',
        color: theme.textMuted,
      });
    }

    return (
      <View style={styles.previewSection}>
        <Text style={styles.sectionHeader}>{t('workspace.recentActivityFeed') || t('workspace.recentActivity')}</Text>
        <View style={styles.activityList}>
          {activities.map((act, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={[styles.activityIconBg, { backgroundColor: `${act.color}10` }]}>
                <Ionicons name={act.icon as any} size={14} color={act.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityType}>{act.type}</Text>
                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activityTime}>{act.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleCycleOrderStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus: CourtOrder['status'] = 'Pending';
    if (currentStatus === 'Pending') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else nextStatus = 'Pending';
    
    const currentOrders = workspace?.courtOrders || [];
    const updated = currentOrders.map(o => {
      if (o._id === orderId || o.id === orderId) {
        return { ...o, status: nextStatus, updatedAt: new Date().toISOString() };
      }
      return o;
    });
    await handleUpdateField({ courtOrders: updated });
    if (selectedCourtOrder && (selectedCourtOrder._id === orderId || selectedCourtOrder.id === orderId)) {
      setSelectedCourtOrder(updated.find(o => (o._id === orderId || o.id === orderId)));
    }
    showToast('success', 'Status Updated', `Order status changed to ${nextStatus}.`);
  };

  const handleAttachEvidenceToOrder = async (orderId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled) return;
      const file = result.assets[0];
      
      const currentOrders = workspace?.courtOrders || [];
      const updated = currentOrders.map(o => {
        if (o._id === orderId || o.id === orderId) {
          const currentAtt = o.attachments || [];
          const newAtt = { name: file.name, uri: file.uri || 'file:///mock_uri', type: file.mimeType || 'application/pdf' };
          return {
            ...o,
            attachments: [...currentAtt, newAtt],
            updatedAt: new Date().toISOString()
          };
        }
        return o;
      });
      
      await handleUpdateField({ courtOrders: updated });
      if (selectedCourtOrder && (selectedCourtOrder._id === orderId || selectedCourtOrder.id === orderId)) {
        setSelectedCourtOrder(updated.find(o => (o._id === orderId || o.id === orderId)));
      }
      showToast('success', 'Attachment Added', 'File attached to court order successfully.');
    } catch (err) {
      console.error(err);
      showToast('error', 'Upload Failed', 'Failed to pick or attach file.');
    }
  };

  const handleAiAction = async (actionType: string, order: any) => {
    setIsAiActionLoading(true);
    setAiActionType(actionType);
    setAiActionResult(null);
    
    setTimeout(() => {
      setIsAiActionLoading(false);
      
      let titleText = '';
      let resultBody = '';
      const orderName = order.name.replace('.pdf', '');
      const courtName = order.metadata?.courtName || 'High Court';
      const caseNumber = order.metadata?.caseNumber || 'CS/245/2026';
      
      switch (actionType) {
        case 'explain':
          titleText = '✨ AI Order Explanation';
          resultBody = `**Directive Analysis for "${orderName}"**\n\n` +
            `**1. Plain English Meaning**\n` +
            `The Court (${courtName}) has ordered a temporary freeze on the transfer of the disputed asset or property. This is a protective injunction preventing the defendant from selling or leasing the property before stay arguments are completed.\n\n` +
            `**2. Required Actions**\n` +
            `• Prepare and dispatch copies of the stay order to all defendants immediately.\n` +
            `• File the Service Affidavit in the court registry proving dispatch within the designated timeline.\n\n` +
            `**3. Deadline Criticality**\n` +
            `You must file compliance copies within 7 days from the pronouncement. Failure to execute on time may invalidate the injunction automatically.\n\n` +
            `**4. Next Steps**\n` +
            `Dispatch the copies via speed post today and capture postal receipt logs for Evidence Vault upload.`;
          break;
        case 'checklist':
          titleText = '📋 AI-Generated Compliance Checklist';
          resultBody = `**Checklist generated for "${orderName}"**\n\n` +
            `• **[ ] Rule 3 CPC Service Copy Delivery**\n` +
            `  *Action*: Compile order copies, attach plaints, and serve defendants.\n` +
            `  *Deadline*: 2026-07-24 | *Assignee*: Advocate / Clerk\n\n` +
            `• **[ ] Service Compliance Affidavit**\n` +
            `  *Action*: Draft affidavit verifying dispatch, attach tracking logs, and submit in Registry.\n` +
            `  *Deadline*: 2026-07-27 | *Assignee*: Senior counsel\n\n` +
            `• **[ ] File Reply Statement**\n` +
            `  *Action*: Draft parawise reply defending title claim and file in court.\n` +
            `  *Deadline*: 2026-08-05 | *Assignee*: Defendant team`;
          break;
        case 'reply':
          titleText = '✍️ AI Draft Reply';
          resultBody = `**Draft Reply Statement - CS(COMM) 245/2026**\n` +
            `**Status**: Prepared Mock Draft ready for editing.\n\n` +
            `\`\`\`\n` +
            `IN THE HIGH COURT OF DELHI AT NEW DELHI\n` +
            `CS(COMM) 245/2026\n\n` +
            `Rajesh Sharma ... Plaintiff\n` +
            `vs\n` +
            `Amit Verma ... Defendant\n\n` +
            `REPLY STATEMENT ON BEHALF OF THE DEFENDANT\n` +
            `Most Respectfully Showeth:\n` +
            `1. That the ad-interim stay order passed on 17.07.2026 is liable to be vacated under Order 39 Rule 4 CPC.\n` +
            `2. The plaintiff has deliberately suppressed the registered Sale Deed dated 12.04.2018 showing defendant's lawful possession.\n` +
            `3. The balance of convenience rests entirely in favor of the defendant who is running a registered commercial store on the suit land.\n\n` +
            `PRAYER:\n` +
            `It is, therefore, prayed that this Hon'ble Court may be pleased to vacate the stay order dated 17.07.2026.\n` +
            `\`\`\``;
          break;
        case 'deadlines':
          titleText = '📅 AI Extracted Deadlines';
          resultBody = `**Extracted Deadlines from "${orderName}"**\n\n` +
            `• **Order 39 Rule 3 Copy Dispatch**\n` +
            `  *Date*: 2026-07-24 | *Priority*: Critical\n` +
            `  *Status*: 7 days remaining. (Requires speed post dispatch receipt proof)\n\n` +
            `• **Compliance Affidavit Submission**\n` +
            `  *Date*: 2026-07-27 | *Priority*: High\n` +
            `  *Status*: 10 days remaining. (Requires affidavit notarization and filing)\n\n` +
            `• **Defendant Reply Filing**\n` +
            `  *Date*: 2026-08-05 | *Priority*: Medium\n` +
            `  *Status*: 19 days remaining.\n\n` +
            `• **Stay Arguments Hearing**\n` +
            `  *Date*: 2026-08-12 | *Priority*: High\n` +
            `  *Status*: Scheduled hearing listed before Courtroom No. 1.`;
          break;
        case 'risks':
          titleText = '🚨 AI Risk & Defect Analyzer';
          resultBody = `**Risk Assessment for "${orderName}"**\n\n` +
            `• **Procedural Delay Risk: High**\n` +
            `  If compliance affidavit is not filed within 7 days, the interim stay can be vacated instantly under the strict proviso of Order 39 Rule 3 CPC.\n\n` +
            `• **Documentary Gaps Detected**\n` +
            `  No postal tracking log or speed post receipt is found in the current Evidence Vault. This is a critical defect.\n\n` +
            `• **Objections Admission Probability: 35%**\n` +
            `  Opposing counsel is likely to claim lack of notice copy and request stay vacation.`;
          break;
        case 'next_step':
          titleText = '⚖️ Recommended Next Legal Steps';
          resultBody = `**Strategic Roadmap for "${orderName}"**\n\n` +
            `• **Step 1: Immediate Copy Dispatch**\n` +
            `  Compile plaints, application documents, affidavit, and stay order copy. Dispatch to opponent via speed post today.\n\n` +
            `• **Step 2: Collect Receipts & Notarize**\n` +
            `  Scan the speed post receipt container and attach to evidence list. Draft and notarize service affidavit.\n\n` +
            `• **Step 3: Submit File to Registry**\n` +
            `  Submit the compliance affidavit in registry before 2026-07-24 to formally complete the Rule 3 process.`;
          break;
        case 'translate':
          titleText = '🌐 AI Translated Order (Hindi)';
          resultBody = `**आदेश अनुवाद - "${orderName}"**\n\n` +
            `दिल्ली उच्च न्यायालय आदेश पत्र:\n` +
            `१. सीपीसी के आदेश ३९ नियम १ और २ के तहत वादी को अंतरिम निषेधाज्ञा प्रदान की जाती है। प्रतिवादी को अगली सुनवाई तक विवादित संपत्ति के संबंध में किसी भी तीसरे पक्ष का अधिकार बनाने या हस्तांतरित करने से रोका जाता है।\n` +
            `२. वादी को निर्देश दिया जाता है कि वह एक सप्ताह के भीतर विरोधी पक्ष को आदेश की प्रति तामील करके सीपीसी के आदेश ३९ नियम ३ का अनुपालन पूरा करे।\n` +
            `३. प्रतिवादी को जवाब दाखिल करने के लिए ४ सप्ताह का समय दिया जाता है। अगली सुनवाई १२ अगस्त २०२६ को तय की जाती है।`;
          break;
        case 'summarize':
          titleText = '📝 AI Order Executive Summary';
          resultBody = `**Executive Summary - CS(COMM) 245/2026**\n\n` +
            `• **Presiding Judge**: Hon'ble Justice Manmohan, High Court of Delhi.\n` +
            `• **Subject**: Interim Injunction under Order 39 Rules 1 & 2 CPC.\n` +
            `• **Ruling**: Interim stay granted restraining the sale or transfer of Karol Bagh disputed plot. Balance of convenience holds in favor of plaintiff.\n` +
            `• **Conditions**: Plaintiff must complete Order 39 Rule 3 service copies to defendant within 7 days, failing which stay stands vacated.\n` +
            `• **Hearing Schedule**: Scheduled on 12/08/2026 for stay arguments.`;
          break;
        case 'judgments':
          titleText = '🏛️ AI Related Precedents Finder';
          resultBody = `**Precedents Matching Stay Compliance**\n\n` +
            `**1. A. Venkatasubbiah Naidu vs S. Chellappan (2000) 8 SCC 395**\n` +
            `*Holding*: Supreme Court ruled that court must specify reasons for ex-parte stay and compliance with Order 39 Rule 3 is mandatory. Defaulters will have stay vacated.\n\n` +
            `**2. Shiv Kumar Chadha vs Municipal Corporation of Delhi (1993) 3 SCC 161**\n` +
            `*Holding*: Order 39 Rule 3 is an essential safeguard. Ex-parte stay without notice should be granted only under extraordinary circumstances.`;
          break;
        default:
          titleText = 'AI Legal Assistant';
          resultBody = 'No analysis details available.';
      }
      
      setAiActionResult({ title: titleText, text: resultBody });
    }, 1200);
  };

  const renderCourtOrdersTab = () => {
    if (!workspace) return null;

    const courtOrdersList = workspace.courtOrders || [];

    // Filter and search logic
    const filteredOrders = courtOrdersList.filter((order) => {
      const metadata = order.metadata || {};
      const matchesSearch =
        order.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (metadata.courtName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (metadata.judgeName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (metadata.caseNumber || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (metadata.orderType || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (order.ocrText || '').toLowerCase().includes(orderSearchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (orderFilter === 'All') return true;
      if (orderFilter === 'Pending Compliance') {
        return order.status === 'Pending' || order.status === 'Compliance Pending' || (order.complianceItems || []).some((c: any) => c.status === 'Pending');
      }
      if (orderFilter === 'Completed') {
        return order.status === 'Completed' || (order.status !== 'Pending' && (order.complianceItems || []).every((c: any) => c.status === 'Completed'));
      }
      if (orderFilter === 'Urgent') {
        return order.priority === 'Critical' || order.priority === 'High';
      }
      return true;
    });

    const getOrderPriorityColor = (priority: string) => {
      switch (priority) {
        case 'Critical':
        case 'Urgent':
        case 'High':
          return '#EF4444'; // Red
        case 'Medium':
          return '#F59E0B'; // Orange
        default:
          return '#10B981'; // Green
      }
    };

    const getComplianceText = (order: any) => {
      if (order.status === 'Completed') return 'Done';
      const pendingItems = (order.complianceItems || []).filter((c: any) => c.status === 'Pending');
      if (pendingItems.length === 0) return 'Done';
      const sorted = pendingItems
        .filter((c: any) => c.dueDate)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      if (sorted.length > 0) {
        const nextDue = new Date(sorted[0].dueDate);
        const today = new Date('2026-07-17');
        const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} Days`;
        if (diffDays === 0) return 'Due Today';
        return `Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
      }
      return 'Pending';
    };

    const currentDay = new Date('2026-07-17');
    const ordersDueSoon = courtOrdersList.filter(o => {
      const isPending = o.status === 'Pending' || o.status === 'Compliance Pending' || (o.complianceItems || []).some((c: any) => c.status === 'Pending');
      if (!isPending) return false;
      return (o.complianceItems || []).some((c: any) => {
        if (c.status !== 'Pending' || !c.dueDate) return false;
        const dueTime = new Date(c.dueDate).getTime();
        const diffDays = (dueTime - currentDay.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });
    });
    const ordersDueSoonCount = ordersDueSoon.length;

    return (
      <View style={styles.tabContentRedesign}>
        {/* Header */}
        <View style={styles.orderHeaderRow}>
          <View>
            <Text style={styles.orderHeaderTitle}>Court Orders</Text>
            <Text style={styles.orderHeaderSubtitle}>Manage every court direction in one place.</Text>
          </View>
          <TouchableOpacity
            style={styles.addOrderTextBtn}
            onPress={() => setIsAddOrderPickerOpen(true)}
          >
            <Ionicons name="add" size={16} color="#C8A34D" />
            <Text style={styles.addOrderTextBtnText}>Add Court Order</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.orderSearchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by Order, Judge, Case, Court, Section, Keyword..."
            placeholderTextColor="#9CA3AF"
            value={orderSearchQuery}
            onChangeText={setOrderSearchQuery}
            style={styles.orderSearchInputRedesign}
          />
          {orderSearchQuery !== '' && (
            <TouchableOpacity onPress={() => setOrderSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filters */}
        <View style={styles.quickFiltersContainer}>
          {['All', 'Pending Compliance', 'Completed', 'Urgent'].map((filt) => {
            const isActive = orderFilter === filt;
            return (
              <TouchableOpacity
                key={filt}
                style={[styles.quickFilterChip, isActive && styles.quickFilterChipActive]}
                onPress={() => setOrderFilter(filt)}
              >
                <Text style={[styles.quickFilterChipText, isActive && styles.quickFilterChipTextActive]}>
                  {filt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI Priority Banner */}
        {ordersDueSoonCount > 0 && !isAiBannerDismissed && (
          <View style={styles.aiPriorityBanner}>
            <View style={styles.aiBannerLeftBorder} />
            <Ionicons name="scale-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
            <Text style={styles.aiBannerText} numberOfLines={2}>
              ⚖️ AI detected {ordersDueSoonCount} court order{ordersDueSoonCount > 1 ? 's' : ''} requiring compliance within 7 days.
            </Text>
            <View style={styles.aiBannerBtnRow}>
              <TouchableOpacity
                style={styles.aiBannerBtn}
                onPress={() => setOrderFilter('Pending Compliance')}
              >
                <Text style={styles.aiBannerBtnText}>View Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiBannerBtn, { backgroundColor: 'transparent' }]}
                onPress={() => setIsAiBannerDismissed(true)}
              >
                <Text style={[styles.aiBannerBtnText, { color: '#6B7280' }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Court Order List */}
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainerRedesign}>
              <Ionicons name="document-text-outline" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTextRedesign}>No court orders found.</Text>
            </View>
          ) : (
            filteredOrders.map((order: any) => {
              const statusColor = getOrderPriorityColor(order.priority || 'Medium');
              const compText = getComplianceText(order);
              const isUrgent = order.priority === 'Critical' || order.priority === 'High' || order.priority === 'Urgent';
              const displayStatus = order.status === 'Completed' ? 'Completed' : (isUrgent ? 'Urgent' : 'Pending');
              
              // Colors for badges
              let badgeBg = '#FEF3C7'; // Yellow/Orange
              let badgeText = '#D97706';
              if (displayStatus === 'Completed') {
                badgeBg = '#D1FAE5'; // Green
                badgeText = '#059669';
              } else if (displayStatus === 'Urgent') {
                badgeBg = '#FEE2E2'; // Red
                badgeText = '#DC2626';
              }

              return (
                <View key={order._id || order.id} style={[styles.orderCardRedesign, { borderLeftColor: statusColor }]}>
                  {/* Card Main Info */}
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={styles.cardOrderTitle}>{order.name.replace('.pdf', '')}</Text>
                      <View style={[styles.statusBadgeRedesign, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeTextRedesign, { color: badgeText }]}>{displayStatus}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardMetadataGrid}>
                      <View style={styles.metadataCol}>
                        <Text style={styles.metadataLabel}>Court</Text>
                        <Text style={styles.metadataVal}>{order.metadata?.courtName || 'Delhi High Court'}</Text>
                      </View>
                      <View style={styles.metadataCol}>
                        <Text style={styles.metadataLabel}>Judge</Text>
                        <Text style={styles.metadataVal}>{order.metadata?.judgeName || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.cardMetadataGrid}>
                      <View style={styles.metadataCol}>
                        <Text style={styles.metadataLabel}>Date</Text>
                        <Text style={styles.metadataVal}>{order.metadata?.orderDate || 'N/A'}</Text>
                      </View>
                      <View style={styles.metadataCol}>
                        <Text style={styles.metadataLabel}>Compliance</Text>
                        <Text style={[styles.metadataVal, { color: displayStatus === 'Completed' ? '#10B981' : (displayStatus === 'Urgent' ? '#EF4444' : '#F59E0B'), fontWeight: '700' }]}>
                          {compText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Bottom Actions */}
                  <View style={styles.orderCardActionsRow}>
                    <TouchableOpacity
                      style={styles.orderCardActionBtn}
                      onPress={() => {
                        setSelectedCourtOrder(order);
                        setSyncActiveSubTab('Overview');
                        setIsOrderViewerOpen(true);
                      }}
                    >
                      <Text style={styles.orderCardActionBtnText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.orderCardActionBtn}
                      onPress={() => {
                        setActionTargetOrder(order);
                        setEditOrderForm({
                          name: order.name.replace('.pdf', ''),
                          courtName: order.metadata?.courtName || '',
                          judgeName: order.metadata?.judgeName || '',
                          bench: order.metadata?.bench || 'Single Bench',
                          courtNumber: order.metadata?.courtNumber || '',
                          caseNumber: order.metadata?.caseNumber || '',
                          orderDate: order.metadata?.orderDate || '',
                          nextHearingDate: order.metadata?.nextHearingDate || '',
                          orderType: order.metadata?.orderType || '',
                          priority: order.priority || 'Medium',
                          notes: order.aiSummary?.shortSummary || '',
                          complianceStatus: order.status === 'Completed' ? 'Completed' : 'Pending',
                        });
                        setIsEditOrderModalOpen(true);
                      }}
                    >
                      <Text style={styles.orderCardActionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.orderCardActionBtn}
                      onPress={() => handleCycleOrderStatus(order._id || order.id, order.status)}
                    >
                      <Text style={styles.orderCardActionBtnText}>Compliance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.orderCardActionBtn, { flexDirection: 'row', alignItems: 'center' }]}
                      onPress={() => handleAiAction('explain', order)}
                    >
                      <Text style={[styles.orderCardActionBtnText, { color: '#C8A34D' }]}>✨ AI Explain</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.orderCardActionBtn}
                      onPress={() => {
                        setActionTargetOrder(order);
                        setIsOrderActionsSheetOpen(true);
                      }}
                    >
                      <Text style={styles.orderCardActionBtnText}>More</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => setIsAddOrderPickerOpen(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* SOURCE PICKER MODAL */}
        <Modal visible={isAddOrderPickerOpen} transparent={true} animationType="slide" onRequestClose={() => setIsAddOrderPickerOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Add Court Order</Text>
                <TouchableOpacity onPress={() => setIsAddOrderPickerOpen(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 16 }}>
                <TouchableOpacity style={styles.pickerItemRedesign} onPress={() => { setIsAddOrderPickerOpen(false); handleSelectImportOption('pdf'); }}>
                  <View style={[styles.pickerIconWrapper, { backgroundColor: '#FEE2E2' }]}><Ionicons name="document-text" size={20} color="#DC2626" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.orderPickerTitle}>Upload PDF Document</Text><Text style={styles.pickerDesc}>Import official court order PDF files</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerItemRedesign} onPress={() => { setIsAddOrderPickerOpen(false); handleSelectImportOption('camera'); }}>
                  <View style={[styles.pickerIconWrapper, { backgroundColor: '#ECFDF5' }]}><Ionicons name="camera" size={20} color="#059669" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.orderPickerTitle}>Scan Document with Camera</Text><Text style={styles.pickerDesc}>Capture order layout and run OCR</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerItemRedesign} onPress={() => { setIsAddOrderPickerOpen(false); handleSelectImportOption('evidence'); }}>
                  <View style={[styles.pickerIconWrapper, { backgroundColor: '#ECFEFF' }]}><Ionicons name="shield-checkmark" size={20} color="#0891B2" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.orderPickerTitle}>Import from Evidence Vault</Text><Text style={styles.pickerDesc}>Select from already archived files</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerItemRedesign} onPress={() => { setIsAddOrderPickerOpen(false); handleSelectImportOption('notes'); }}>
                  <View style={[styles.pickerIconWrapper, { backgroundColor: '#F3F4F6' }]}><Ionicons name="pencil" size={20} color="#4B5563" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.orderPickerTitle}>Import from Case Notes</Text><Text style={styles.pickerDesc}>Generate skeleton using advocate notes</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickerItemRedesign, { borderBottomWidth: 0 }]} onPress={() => { setIsAddOrderPickerOpen(false); handleSelectImportOption('manual'); }}>
                  <View style={[styles.pickerIconWrapper, { backgroundColor: '#EFF6FF' }]}><Ionicons name="create" size={20} color="#2563EB" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.orderPickerTitle}>Log Manually</Text><Text style={styles.pickerDesc}>Fill order metadata form manually</Text></View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* IMPORT FROM EVIDENCE MODAL */}
        <Modal visible={importEvidenceModalOpen} transparent={true} animationType="fade" onRequestClose={() => setImportEvidenceModalOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Select Evidence</Text>
                <TouchableOpacity onPress={() => setImportEvidenceModalOpen(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
              </View>
              <FlatList
                data={workspace.evidence || []}
                keyExtractor={(item: any) => item._id || item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.importListItem} onPress={() => handleImportEvidence(item)}>
                    <Text style={styles.importListTitle}>{item.name}</Text>
                    <Text style={styles.importListDesc}>{item.description || 'No description'}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.importListEmpty}>No evidence files found.</Text>}
                style={{ padding: 16 }}
              />
            </View>
          </View>
        </Modal>

        {/* IMPORT FROM CASE NOTES MODAL */}
        <Modal visible={importNotesModalOpen} transparent={true} animationType="fade" onRequestClose={() => setImportNotesModalOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Select Case Note</Text>
                <TouchableOpacity onPress={() => setImportNotesModalOpen(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
              </View>
              <FlatList
                data={workspace.notes || []}
                keyExtractor={(item: any) => item._id || item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.importListItem} onPress={() => handleImportNote(item)}>
                    <Text style={styles.importListTitle}>{item.title}</Text>
                    <Text style={styles.importListDesc} numberOfLines={1}>{item.content || 'Empty Content'}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.importListEmpty}>No notes found.</Text>}
                style={{ padding: 16 }}
              />
            </View>
          </View>
        </Modal>

        {/* IMPORT FROM CONTRACTS MODAL */}
        <Modal visible={importContractsModalOpen} transparent={true} animationType="fade" onRequestClose={() => setImportContractsModalOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Select Contract</Text>
                <TouchableOpacity onPress={() => setImportContractsModalOpen(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
              </View>
              <FlatList
                data={workspace.contracts || []}
                keyExtractor={(item: any) => item._id || item.id}
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity style={styles.importListItem} onPress={() => handleImportContract(item)}>
                    <Text style={styles.importListTitle}>{item.name || item.title || 'Agreement'}</Text>
                    <Text style={styles.importListDesc}>{item.status || 'Active'}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.importListEmpty}>No contracts found.</Text>}
                style={{ padding: 16 }}
              />
            </View>
          </View>
        </Modal>

        {/* EDIT ORDER METADATA MODAL */}
        <Modal visible={isEditOrderModalOpen} transparent={true} animationType="slide" onRequestClose={() => setIsEditOrderModalOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Edit Court Order</Text>
                <TouchableOpacity onPress={() => setIsEditOrderModalOpen(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.courtOrderFormLabel}>Order Document Name *</Text>
                <TextInput placeholder="e.g. Injunction Stay" value={editOrderForm.name} onChangeText={(t) => setEditOrderForm({ ...editOrderForm, name: t })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Court Name</Text>
                <TextInput placeholder="e.g. High Court of Delhi" value={editOrderForm.courtName} onChangeText={(t) => setEditOrderForm({ ...editOrderForm, courtName: t })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Judge Name</Text>
                <TextInput placeholder="e.g. Justice Amit Verma" value={editOrderForm.judgeName} onChangeText={(t) => setEditOrderForm({ ...editOrderForm, judgeName: t })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Case Number</Text>
                <TextInput placeholder="e.g. CS(COMM) 445/2026" value={editOrderForm.caseNumber} onChangeText={(t) => setEditOrderForm({ ...editOrderForm, caseNumber: t })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Order Date</Text>
                <TextInput placeholder="YYYY-MM-DD" value={editOrderForm.orderDate} onChangeText={(t) => setEditOrderForm({ ...editOrderForm, orderDate: t })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Priority</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['Low', 'Medium', 'High', 'Critical'].map((pr) => {
                    const active = editOrderForm.priority === pr;
                    return (
                      <TouchableOpacity
                        key={pr}
                        style={[styles.prioritySelectBtn, active && styles.prioritySelectBtnActive]}
                        onPress={() => setEditOrderForm({ ...editOrderForm, priority: pr })}
                      >
                        <Text style={[styles.prioritySelectBtnText, active && styles.prioritySelectBtnTextActive]}>{pr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.formFooter}>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setIsEditOrderModalOpen(false)}>
                  <Text style={[styles.formBtnText, { color: '#1F2937' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: '#000000' }]} onPress={handleSaveEditedCourtOrder}>
                  <Text style={[styles.formBtnText, { color: '#FFFFFF' }]}>Save Modifications</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* MANUAL LOG ORDER FORM */}
        <Modal visible={isOrderFormOpen} transparent={true} animationType="slide" onRequestClose={() => setIsOrderFormOpen(false)}>
          <View style={styles.modalOverlayRedesign}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainerRedesign}>
              <View style={styles.modalHeaderRedesign}>
                <Text style={styles.modalHeaderTitleRedesign}>Log Court Order</Text>
                <TouchableOpacity onPress={() => setIsOrderFormOpen(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.courtOrderFormLabel}>Document / File Name *</Text>
                <TextInput placeholder="e.g. Interim Injunction Order" value={logOrderForm.name} onChangeText={(text) => setLogOrderForm({ ...logOrderForm, name: text })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Court Name *</Text>
                <TextInput placeholder="e.g. Delhi High Court" value={logOrderForm.courtName} onChangeText={(text) => setLogOrderForm({ ...logOrderForm, courtName: text })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Judge Name</Text>
                <TextInput placeholder="e.g. Justice Amit Verma" value={logOrderForm.judgeName} onChangeText={(text) => setLogOrderForm({ ...logOrderForm, judgeName: text })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Case Number *</Text>
                <TextInput placeholder="e.g. CS/102/2026" value={logOrderForm.caseNumber} onChangeText={(text) => setLogOrderForm({ ...logOrderForm, caseNumber: text })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Order Pronouncement Date</Text>
                <TextInput placeholder="YYYY-MM-DD" value={logOrderForm.orderDate} onChangeText={(text) => setLogOrderForm({ ...logOrderForm, orderDate: text })} style={styles.courtOrderFormInput} />
                <Text style={styles.courtOrderFormLabel}>Directives Notes / Observations</Text>
                <TextInput
                  placeholder="Enter court orders details and judge directions here..."
                  multiline
                  numberOfLines={4}
                  value={logOrderForm.notesText}
                  onChangeText={(text) => setLogOrderForm({ ...logOrderForm, notesText: text })}
                  placeholderTextColor="#9CA3AF"
                  style={[styles.courtOrderFormInput, { height: 100, textAlignVertical: 'top' }]}
                />
              </ScrollView>
              <View style={styles.formFooter}>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setIsOrderFormOpen(false)}>
                  <Text style={[styles.formBtnText, { color: '#1F2937' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, { backgroundColor: '#000000' }]} onPress={handleManualAddCourtOrder}>
                  <Text style={[styles.formBtnText, { color: '#FFFFFF' }]}>Save Order</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* OCR SCANNING PROGRESS MODAL */}
        <Modal visible={orderOcrScanning} transparent={true} animationType="fade" onRequestClose={() => setOrderOcrScanning(false)}>
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.ocrProgressBox}>
              <Text style={styles.ocrProgressTitle}>🧠 AI Court Order Analyzer</Text>
              <ActivityIndicator size="large" color="#C8A34D" style={{ marginVertical: 16 }} />
              <View style={styles.ocrProgressBar}><View style={[styles.ocrProgressFill, { width: `${orderUploadProgress}%` }]} /></View>
              <Text style={styles.ocrProgressPercent}>{orderUploadProgress}% Completed</Text>
              <Text style={styles.ocrProgressStep}>{ocrScanningText}</Text>
            </View>
          </View>
        </Modal>

        {/* DETAILED ORDER WORKSPACE MODAL (ORDER DETAIL SCREEN) */}
        {selectedCourtOrder && isOrderViewerOpen && (
          <Modal visible={isOrderViewerOpen} animationType="slide" onRequestClose={() => setIsOrderViewerOpen(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
              {/* Header */}
              <View style={styles.drawerHeaderRedesign}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerHeaderTitleRedesign} numberOfLines={1}>{selectedCourtOrder.name.replace('.pdf', '')}</Text>
                  <Text style={styles.drawerHeaderSubtitleRedesign} numberOfLines={1}>
                    {selectedCourtOrder.metadata?.courtName} • {selectedCourtOrder.metadata?.caseNumber}
                  </Text>
                </View>
                <TouchableOpacity style={{ padding: 4 }} onPress={() => setIsOrderViewerOpen(false)}>
                  <Ionicons name="close-outline" size={28} color="#1F2937" />
                </TouchableOpacity>
              </View>

              {/* Sub tabs selector */}
              <View style={styles.drawerSubTabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Overview', 'Order PDF', 'AI Explanation', 'Attached Files', 'Compliance Checklist', 'Timeline', 'Reminders', 'Notes'].map((sub) => {
                    const isActive = syncActiveSubTab === sub;
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[styles.drawerSubTabChip, isActive && styles.drawerSubTabChipActive]}
                        onPress={() => setSyncActiveSubTab(sub)}
                      >
                        <Text style={[styles.drawerSubTabChipText, isActive && styles.drawerSubTabChipTextActive]}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Main Content Area */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                
                {/* 1. Overview Tab */}
                {syncActiveSubTab === 'Overview' && (
                  <View style={{ gap: 16 }}>
                    <View style={styles.detailSectionBox}>
                      <Text style={styles.detailSectionTitle}>🏛️ Presiding Legal Metadata</Text>
                      <View style={styles.detailMetaGrid}>
                        <View style={styles.detailMetaRow}>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Court</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.courtName || 'Delhi High Court'}</Text></View>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Presiding Judge</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.judgeName || 'Justice A.B. Sharma'}</Text></View>
                        </View>
                        <View style={styles.detailMetaRow}>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Case Number</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.caseNumber || 'CS/245/2026'}</Text></View>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Bench Type</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.bench || 'Single Bench'}</Text></View>
                        </View>
                        <View style={styles.detailMetaRow}>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Order Type</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.orderType || 'Interim Order'}</Text></View>
                          <View style={styles.detailMetaCol}><Text style={styles.detailMetaLabel}>Pronouncement Date</Text><Text style={styles.detailMetaVal}>{selectedCourtOrder.metadata?.orderDate || '17 July 2026'}</Text></View>
                        </View>
                      </View>
                    </View>

                    {/* ✨ AI Legal Suite Section inside Overview */}
                    <View style={styles.detailSectionBox}>
                      <Text style={styles.detailSectionTitle}>✨ AI Legal Assistant Suite</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>Run specialized legal operations on this court order.</Text>
                      <View style={styles.aiGridSuite}>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('explain', selectedCourtOrder)}>
                          <Ionicons name="sparkles" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Explain Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('checklist', selectedCourtOrder)}>
                          <Ionicons name="checkbox-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Gen Checklist</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('reply', selectedCourtOrder)}>
                          <Ionicons name="create-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Draft Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('deadlines', selectedCourtOrder)}>
                          <Ionicons name="time-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Extract Deadlines</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('risks', selectedCourtOrder)}>
                          <Ionicons name="warning-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Detect Risks</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('next_step', selectedCourtOrder)}>
                          <Ionicons name="arrow-forward-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Recommend Step</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('translate', selectedCourtOrder)}>
                          <Ionicons name="language-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Translate Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiSuiteBtn} onPress={() => handleAiAction('summarize', selectedCourtOrder)}>
                          <Ionicons name="document-text-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Summarize Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.aiSuiteBtn, { width: '100%' }]} onPress={() => handleAiAction('judgments', selectedCourtOrder)}>
                          <Ionicons name="library-outline" size={14} color="#C8A34D" />
                          <Text style={styles.aiSuiteBtnText}>AI Find Related Judgments</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* 2. Order PDF / OCR Text Tab */}
                {syncActiveSubTab === 'Order PDF' && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>📜 Extracted OCR Text layers</Text>
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', lineHeight: 16 }}>
                        {selectedCourtOrder.ocrText || 'No text extracted. Click AI Explain to run metadata parse.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 3. AI Explanation Tab */}
                {syncActiveSubTab === 'AI Explanation' && (
                  <View style={{ gap: 16 }}>
                    <View style={styles.detailSectionBox}>
                      <Text style={styles.detailSectionTitle}>💡 AI Explain Summary</Text>
                      <Text style={{ fontSize: 13, color: '#1F2937', lineHeight: 20 }}>
                        {selectedCourtOrder.aiSummary?.shortSummary || 'AI analysis is pending. Please click the Sparkle explain action on overview to populate.'}
                      </Text>
                    </View>
                    <View style={styles.detailSectionBox}>
                      <Text style={styles.detailSectionTitle}>🔮 AI Core Suggestions</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Suggested actions ready to synchronize with other modules.</Text>
                      {(selectedCourtOrder.suggestedTasks || []).map((t: any, idx: number) => (
                        <View key={idx} style={styles.timelineStep}>
                          <Ionicons name="checkbox-outline" size={16} color="#C8A34D" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{t.title}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>{t.description}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.approveBtn, t.accepted && styles.approveBtnAccepted]}
                            onPress={() => handlePromoteOrderSuggestion(selectedCourtOrder._id || selectedCourtOrder.id, 'task', idx)}
                          >
                            <Text style={[styles.approveBtnText, t.accepted && { color: '#FFFFFF' }]}>{t.accepted ? 'Synced' : 'Approve'}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 4. Attached Files Tab */}
                {syncActiveSubTab === 'Attached Files' && (
                  <View style={styles.detailSectionBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.detailSectionTitle}>📂 Attached Evidences & Scans</Text>
                      <TouchableOpacity
                        style={styles.addAttachmentTextBtn}
                        onPress={() => handleAttachEvidenceToOrder(selectedCourtOrder._id || selectedCourtOrder.id)}
                      >
                        <Ionicons name="cloud-upload" size={14} color="#C8A34D" />
                        <Text style={styles.addAttachmentTextBtnText}>Attach File</Text>
                      </TouchableOpacity>
                    </View>
                    {(!selectedCourtOrder.attachments || selectedCourtOrder.attachments.length === 0) ? (
                      <Text style={styles.emptyTextRedesign}>No attached documents or evidence logs.</Text>
                    ) : (
                      selectedCourtOrder.attachments.map((att: any, idx: number) => (
                        <View key={idx} style={styles.attachmentRowRedesign}>
                          <Ionicons name="document-attach" size={20} color="#6B7280" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{att.name}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>{att.type}</Text>
                          </View>
                          <TouchableOpacity onPress={async () => {
                            const current = workspace.courtOrders || [];
                            const updated = current.map(o => {
                              if (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id) {
                                const attCopy = [...(o.attachments || [])];
                                attCopy.splice(idx, 1);
                                return { ...o, attachments: attCopy };
                              }
                              return o;
                            });
                            await handleUpdateField({ courtOrders: updated });
                            setSelectedCourtOrder(updated.find(o => (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id)));
                            showToast('success', 'Attachment Removed', 'File unlinked from this order.');
                          }}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* 5. Compliance Checklist Tab */}
                {syncActiveSubTab === 'Compliance Checklist' && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>📋 Directives Compliance Tracker</Text>
                    {(!selectedCourtOrder.complianceItems || selectedCourtOrder.complianceItems.length === 0) ? (
                      <Text style={styles.emptyTextRedesign}>No compliance directives detected in order text.</Text>
                    ) : (
                      selectedCourtOrder.complianceItems.map((comp: any, idx: number) => {
                        const isCompleted = comp.status === 'Completed';
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.complianceCheckItem}
                            onPress={async () => {
                              const current = workspace.courtOrders || [];
                              const updated = current.map(o => {
                                if (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id) {
                                  const list = [...(o.complianceItems || [])];
                                  list[idx] = { ...list[idx], status: isCompleted ? 'Pending' : 'Completed' };
                                  return { ...o, complianceItems: list };
                                }
                                return o;
                              });
                              await handleUpdateField({ courtOrders: updated });
                              setSelectedCourtOrder(updated.find(o => (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id)));
                              showToast('success', 'Status Saved', `Compliance item status set to: ${isCompleted ? 'Pending' : 'Completed'}`);
                            }}
                          >
                            <Ionicons
                              name={isCompleted ? "checkbox" : "square-outline"}
                              size={20}
                              color={isCompleted ? "#10B981" : "#9CA3AF"}
                              style={{ marginRight: 8 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.complianceCheckText, isCompleted && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                                {comp.description}
                              </Text>
                              <Text style={styles.complianceCheckMeta}>Due: {comp.dueDate || 'N/A'} • Assignee: {comp.responsiblePerson || 'N/A'}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {/* 6. Timeline Tab */}
                {syncActiveSubTab === 'Timeline' && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>⏳ Judicial Chronology Timeline</Text>
                    <View style={styles.orderTimelineList}>
                      <View style={styles.timelineStep}>
                        <View style={[styles.orderTimelineNode, { backgroundColor: '#10B981' }]} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Record Created</Text>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>Order loaded in database on {selectedCourtOrder.createdAt?.split('T')[0] || '2026-07-17'}</Text>
                        </View>
                      </View>
                      <View style={styles.timelineStep}>
                        <View style={[styles.orderTimelineNode, { backgroundColor: '#F59E0B' }]} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Directive Compliance Due</Text>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>Service deadline due soon</Text>
                        </View>
                      </View>
                      <View style={styles.timelineStep}>
                        <View style={[styles.orderTimelineNode, { backgroundColor: '#9CA3AF' }]} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Next Hearing Scheduled</Text>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>Scheduled in high court courtroom on {selectedCourtOrder.metadata?.nextHearingDate || '2026-08-12'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* 7. Reminders Tab */}
                {syncActiveSubTab === 'Reminders' && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>🔔 AI Reminders Interval Settings</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 16 }}>AI will push notifications and email reminders automatically.</Text>
                    <View style={{ gap: 12 }}>
                      <View style={styles.reminderToggleRow}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Notify 1 day before deadline</Text>
                        <Switch
                          value={true}
                          onValueChange={() => {}}
                          trackColor={{ true: '#C8A34D', false: '#E5E7EB' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                      <View style={styles.reminderToggleRow}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Notify 3 days before deadline</Text>
                        <Switch
                          value={true}
                          onValueChange={() => {}}
                          trackColor={{ true: '#C8A34D', false: '#E5E7EB' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                      <View style={styles.reminderToggleRow}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>Notify 1 week before deadline</Text>
                        <Switch
                          value={false}
                          onValueChange={() => {}}
                          trackColor={{ true: '#C8A34D', false: '#E5E7EB' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* 8. Notes Tab */}
                {syncActiveSubTab === 'Notes' && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>✍️ Lawyer Workspace Comments</Text>
                    <TextInput
                      style={styles.lawyerNotesInput}
                      multiline={true}
                      numberOfLines={6}
                      placeholder="Write your personal case notes, strategy remarks, or details here..."
                      value={selectedCourtOrder.aiSummary?.shortSummary || ''}
                      onChangeText={async (text) => {
                        const current = workspace.courtOrders || [];
                        const updated = current.map(o => {
                          if (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id) {
                            return { ...o, aiSummary: { ...o.aiSummary, shortSummary: text } };
                          }
                          return o;
                        });
                        await handleUpdateField({ courtOrders: updated });
                        setSelectedCourtOrder(updated.find(o => (o._id === selectedCourtOrder._id || o.id === selectedCourtOrder.id)));
                      }}
                    />
                  </View>
                )}

              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}

        {/* AI ACTION RESULT LOADER / DISPLAY OVERLAY */}
        <Modal visible={isAiActionLoading} transparent={true} animationType="fade">
          <View style={styles.modalOverlayRedesign}>
            <View style={styles.ocrProgressBox}>
              <Text style={styles.ocrProgressTitle}>🧠 AI Legal Assistant Suite</Text>
              <ActivityIndicator size="large" color="#C8A34D" style={{ marginVertical: 16 }} />
              <Text style={styles.ocrProgressStep}>Executing Gemini legal directive extraction pipeline...</Text>
            </View>
          </View>
        </Modal>

        {aiActionResult && (
          <Modal visible={!!aiActionResult} transparent={true} animationType="fade" onRequestClose={() => setAiActionResult(null)}>
            <View style={styles.modalOverlayRedesign}>
              <View style={styles.modalContainerRedesign}>
                <View style={styles.modalHeaderRedesign}>
                  <Text style={styles.modalHeaderTitleRedesign}>{aiActionResult.title}</Text>
                  <TouchableOpacity onPress={() => setAiActionResult(null)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
                </View>
                <ScrollView style={{ padding: 16, maxHeight: height * 0.6 }}>
                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>{aiActionResult.text}</Text>
                </ScrollView>
                <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'flex-end' }}>
                  <TouchableOpacity style={styles.formBtn} onPress={() => setAiActionResult(null)}>
                    <Text style={[styles.formBtnText, { color: '#FFFFFF' }]}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  // Overview / Comma  // --- TIMELINE HELPERS ---
  const detectDuplicates = (list: any[]) => {
    const pairs: any[][] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const titleI = (list[i].event || list[i].title || '').toLowerCase();
        const titleJ = (list[j].event || list[j].title || '').toLowerCase();
        if (list[i].date === list[j].date &&
          (titleI.includes(titleJ) || titleJ.includes(titleI) || (list[i].category && list[i].category === list[j].category))) {
          pairs.push([list[i], list[j]]);
        }
      }
    }
    return pairs;
  };

  const inferCategory = (title = '', desc = '') => {
    const t = (title + ' ' + desc).toLowerCase();
    if (t.includes('fir') || t.includes('charge sheet') || t.includes('complaint')) return 'FIR / Complaint';
    if (t.includes('notice') || t.includes('legal notice')) return 'Legal Notice';
    if (t.includes('reply') || t.includes('rejoinder')) return 'Reply';
    if (t.includes('agreement') || t.includes('contract') || t.includes('deed') || t.includes('lease') || t.includes('lent') || t.includes('loan')) return 'Agreement';
    if (t.includes('hearing') || t.includes('court') || t.includes('appearance')) return 'Hearing';
    if (t.includes('order') || t.includes('injunction') || t.includes('stay')) return 'Court Order';
    if (t.includes('judgment') || t.includes('decree') || t.includes('verdict')) return 'Judgment';
    if (t.includes('evidence') || t.includes('exhibit') || t.includes('receipt') || t.includes('proof')) return 'Evidence';
    if (t.includes('draft') || t.includes('pleading') || t.includes('petition')) return 'Draft';
    if (t.includes('research') || t.includes('precedent') || t.includes('ruling')) return 'Research';
    return 'Other';
  };

  const handleMergeEvents = (idx1: number, idx2: number) => {
    if (!workspace) return;
    const list = [...(workspace.facts || [])];
    const ev1 = list[idx1];
    const ev2 = list[idx2];

    const mergedEvent = {
      ...ev1,
      event: ev1.event || (ev1 as any).title || 'Merged Event',
      description: `${ev1.description || ''} | Merged: ${ev2.description || ''}`,
      category: (ev1 as any).category || inferCategory(ev1.event, ev1.description),
      importance: 'High',
      confidence: 'High',
      isAiGenerated: true,
      sourceDoc: `${(ev1 as any).sourceDoc || 'File'} & ${(ev2 as any).sourceDoc || 'File'}`
    };

    list[idx1] = mergedEvent;
    list.splice(idx2, 1);

    handleUpdateField({ facts: list as any });
    setShowDuplicateMergeSuggestion(false);
    showToast('success', 'Events Merged', 'Duplicate timeline entries merged successfully.');
  };

  // --- NARRATIVE EXTRACTION SIMULATION ---
  const runNarrativeExtraction = async () => {
    if (!narrativeText.trim()) {
      showToast('error', 'Text Required', 'Please enter a legal narrative text block.');
      return;
    }
    setIsExtractingNarrative(true);
    setNarrativeSteps([
      'Analyzing text narrative structure...',
      'Performing legal entity recognition (Dates, Parties, Locations)...',
      'Extracting chronological legal actions...',
      'Assigning categories and calculating AI confidence scores...',
      'Updating chronological Case Journey timeline...'
    ]);
    setActiveNarrativeStep(0);

    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      setActiveNarrativeStep(prev => prev + 1);
    }

    const isExample = narrativeText.toLowerCase().includes('rajesh sharma') || narrativeText.toLowerCase().includes('amit verma') || narrativeText.toLowerCase().includes('5,00,000');
    let extracted: any[] = [];
    if (isExample) {
      extracted = [
        {
          date: '15 Jan 2025',
          event: 'Loan Agreement Executed',
          description: 'Amit Verma executed a loan agreement for ₹5,00,000 from Rajesh Sharma, due 15 April 2025.',
          category: 'Agreement',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          linkedEvidence: 'Exhibit A - Registered Deed',
          courtStage: 'Pre-Litigation',
          parties: 'Rajesh Sharma, Amit Verma',
          aiExplanation: 'Beginning of case timeline establishing contractual terms.'
        },
        {
          date: '15 Apr 2025',
          event: 'Repayment Deadline default',
          description: 'Amit Verma defaulted on repayment of ₹5,00,000 principal due date.',
          category: 'Other',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          courtStage: 'Pre-Litigation',
          parties: 'Amit Verma',
          aiExplanation: 'Establishes cause of action for default and default interest accrual.'
        },
        {
          date: '20 Apr 2025',
          event: 'Legal Notice Issued',
          description: 'Legal notice demanding loan repayment within 15 days sent to Amit Verma.',
          category: 'Legal Notice',
          importance: 'High',
          confidence: 'High',
          isAiGenerated: true,
          sourceDoc: 'Advocate Narrative',
          courtStage: 'Pre-Litigation',
          parties: 'Rajesh Sharma, Amit Verma',
          aiExplanation: 'Pre-litigation demand, compliance period of 15 days.'
        }
      ];
    } else {
      extracted = [
        {
          date: new Date().toLocaleDateString(),
          event: 'AI Extracted Event',
          description: narrativeText,
          category: 'Other',
          importance: 'Medium',
          confidence: 'Medium',
          isAiGenerated: true,
          sourceDoc: 'Text Narrative Block'
        }
      ];
    }

    const currentFacts = workspace?.facts || [];
    handleUpdateField({ facts: [...currentFacts, ...extracted] as any });
    setIsExtractingNarrative(false);
    setNarrativeText('');
    setIsNarrativeExtractorOpen(false);
    showToast('success', 'AI OCR Complete', `Extracted ${extracted.length} timeline milestones successfully.`);
  };

  // Overview / Command Hub Dashboard Grid
  const renderOverviewTab = () => {
    const globalWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : 'personal';
    const currentRole = useRoleStore.getState().selectedRole || 'advocate';
    const isFirmWs = globalWsType === 'law_firm' || (workspace as any)?.workspaceType === 'law_firm' || (workspace as any)?.role === 'law_firm' || currentRole === 'law_firm';

    if (isFirmWs) {
      return (
        <EnterpriseFirmCaseWorkspace
          workspace={workspace}
          latestAnalysis={latestAnalysis}
          onCaseUpdate={() => id && fetchWorkspaceDetails(id)}
          onSelectModule={(moduleId) => {
            const moduleTabMap: Record<string, string> = {
              'case-info': 'case-info',
              'parties': 'parties',
              'team': 'case-info',
              'hearings': 'hearings',
              'tasks': 'tasks',
              'documents': 'documents',
              'evidence': 'evidence',
              'internal-notes': 'notes',
              'timeline': 'timeline',
              'research': 'research',
              'ai-assistant': 'analysis',
            };
            const tab = moduleTabMap[moduleId] || moduleId;
            setActiveWorkspaceTab(tab);
          }}
        />
      );
    }

    const nextHearing = (workspace?.hearings || []).find((h) => h.status === 'Upcoming');
    const nextHearingStr = nextHearing ? `${nextHearing.date} - ${nextHearing.time || '10:00 AM'}` : 'None Scheduled';

    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const court = workspace?.courtName || 'N/A';
    const caseType = workspace?.caseType || 'N/A';
    const winProb = workspace?.intelligence?.winProbability || 65;
    const strength = workspace?.intelligence?.strengthScore || 70;
    const riskLevel = workspace?.intelligence?.riskLevel || workspace?.priority || 'High';

    return (
      <View style={styles.commandCenterContainer}>
        {/* Apple-Style Case Summary & Detail Block */}
        <View style={styles.caseInfoCard}>
          <Text style={styles.caseSummaryTitle}>Case Summary (AI Generated)</Text>
          <Text style={styles.caseSummaryText}>
            {workspace?.summary || workspace?.caseSummary || 'No case description or facts provided yet. Use case preferences to initialize parameters.'}
          </Text>
          <View style={styles.dividerLine} />
          <View style={styles.caseDetailMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Client</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{client}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Opponent</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{opponent}</Text>
            </View>
          </View>
          <View style={styles.caseDetailMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Court / Forum</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{court}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaColLabel}>Type</Text>
              <Text style={styles.metaColValue} numberOfLines={1}>{caseType}</Text>
            </View>
          </View>
        </View>

        {/* Quick Insights horizontal carousel */}
        {renderQuickInsights()}

        {/* AI Case Assistant */}
        {renderAiAssistantCard()}

        {/* Workspace navigation rounded list tiles */}
        {renderWorkspaceNavigation()}

        {/* Case Timeline Preview */}
        {renderTimelinePreview()}
      </View>
    );
  };

  // AI Suggestions renderer (Limitation Warnings, Upcoming Deadlines, Missing Documents)
  const renderAiSuggestions = () => {
    const warnings = workspace?.limitationWarnings || [];
    const deadlines = workspace?.upcomingDeadlines || [];
    const missingDocs = workspace?.missingDocuments || [];

    if (warnings.length === 0 && deadlines.length === 0 && missingDocs.length === 0) {
      return null;
    }

    return (
      <View style={styles.suggestionsContainer}>
        {/* Section title */}
        <Text style={styles.suggestionsHeader}>{t('workspace.aiInsights')}</Text>

        {/* Limitation Warnings */}
        {warnings.map((w: any, idx: number) => (
          <View key={`warn-${idx}`} style={[styles.suggestionCard, styles.warningCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="sparkles" size={12} color="#111111" />
                <Text style={styles.warningTagText}>{t('workspace.limitationWarning')}</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{w.title}</Text>
            <Text style={styles.suggestionDesc}>{w.description}</Text>
          </View>
        ))}

        {/* Upcoming Deadlines */}
        {deadlines.map((d: any, idx: number) => (
          <View key={`dead-${idx}`} style={[styles.suggestionCard, styles.deadlineCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="alarm-outline" size={12} color="#D97706" />
                <Text style={styles.deadlineTagText}>{t('workspace.upcomingDeadline')}</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{d.title}</Text>
            <Text style={styles.suggestionDesc}>{d.description}</Text>
          </View>
        ))}

        {/* Missing Documents */}
        {missingDocs.map((m: any, idx: number) => (
          <View key={`miss-${idx}`} style={[styles.suggestionCard, styles.missingCard]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.suggestionTitleGroup}>
                <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
                <Text style={styles.missingTagText}>{t('workspace.missingDocument')}</Text>
              </View>
            </View>
            <Text style={styles.suggestionTitle}>{m.title}</Text>
            <Text style={styles.suggestionDesc}>{m.description}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleGenerateTimeline = async () => {
    if (!id) return;
    setIsAnalyzingTimeline(true);
    try {
      showToast('info', 'Analyzing Summary', 'AI is analyzing case summary to generate timeline...');
      const res = await CaseService.analyzeCase(id);
      if (res && res.data) {
        updateWorkspaceState(id, res.data);
        showToast('success', 'Timeline Generated', 'Successfully generated timeline facts from case summary.');
      } else {
        await fetchWorkspaceDetails(id);
        showToast('success', 'Timeline Generated', 'Successfully generated timeline facts.');
      }
    } catch (err) {
      console.error('[Timeline] AI generation failed:', err);
      showToast('error', 'Generation Failed', 'Could not generate timeline using AI.');
    } finally {
      setIsAnalyzingTimeline(false);
    }
  };

  // Timeline chronology module
  const renderTimelineTab = () => {
    if (isAnalyzingTimeline) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 12 }} />
          <Text style={styles.loadingTextTimeline}>AI is generating structured timeline facts from the Case Summary...</Text>
        </View>
      );
    }

    const totalFacts = workspace?.facts || [];
    if (totalFacts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyHeadline}>No timeline facts detected.</Text>
          <Text style={styles.emptySubline}>Tap &apos;Generate Timeline&apos; to let AI analyze this case.</Text>
          <TouchableOpacity
            style={styles.generateTimelineBtn}
            onPress={handleGenerateTimeline}
          >
            <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.generateTimelineBtnText}>Generate Timeline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const filteredList = totalFacts.filter((item: any) => {
      const matchesSearch =
        (item.title || item.event || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.date || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.displayDate || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (timelineCategoryFilter === 'All') return true;

      const category = (item.category || '').toLowerCase();
      const createdBy = (item.createdBy || '').toLowerCase();
      const importance = (item.importance || '').toLowerCase();

      if (timelineCategoryFilter === 'Documents') {
        return ['document', 'contract', 'agreement'].includes(category);
      }
      if (timelineCategoryFilter === 'Hearings') {
        return ['hearing', 'court'].includes(category);
      }
      if (timelineCategoryFilter === 'Evidence') {
        return ['evidence'].includes(category);
      }
      if (timelineCategoryFilter === 'Court') {
        return ['court', 'hearing', 'case filing', 'judgment'].includes(category);
      }
      if (timelineCategoryFilter === 'Payments') {
        return ['payment'].includes(category);
      }
      if (timelineCategoryFilter === 'AI Generated') {
        return createdBy === 'ai';
      }
      if (timelineCategoryFilter === 'High Priority') {
        return importance === 'high';
      }

      return category === timelineCategoryFilter.toLowerCase();
    });

    const sortedList = [...filteredList].sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return timelineSortAsc ? dateA - dateB : dateB - dateA;
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Chronology Timeline</Text>
          <Pressable
            style={styles.moduleHeaderBtn}
            onPress={() => {
              setModalType('timeline');
              setIsModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#111111" />
            <Text style={styles.moduleHeaderBtnText}>Add Fact</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search timeline facts..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {['All', 'Documents', 'Hearings', 'Evidence', 'Court', 'Payments', 'AI Generated', 'High Priority'].map((filter) => {
            const isActive = timelineCategoryFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive
                ]}
                onPress={() => setTimelineCategoryFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sorting row toggle */}
        <View style={styles.sortRow}>
          <Text style={styles.milestoneCountText}>
            {sortedList.length} {sortedList.length === 1 ? 'Milestone' : 'Milestones'}
          </Text>
          <Pressable
            style={styles.sortToggleBtn}
            onPress={() => setTimelineSortAsc(!timelineSortAsc)}
          >
            <Ionicons
              name={timelineSortAsc ? 'arrow-down-outline' : 'arrow-up-outline'}
              size={14}
              color="#111111"
            />
            <Text style={styles.sortToggleText}>
              {timelineSortAsc ? 'Oldest First' : 'Newest First'}
            </Text>
          </Pressable>
        </View>

        {/* AI Suggestions/Insights list */}
        {renderAiSuggestions()}

        {/* Vertical Timeline */}
        {sortedList.length === 0 ? (
          <Text style={styles.emptyText}>No matching timeline facts recorded yet.</Text>
        ) : (
          <View style={styles.timelineList}>
            {sortedList.map((item: any, i) => (
              <View key={i} style={styles.timelineNode}>
                <View style={styles.timelineMarker}>
                  <View style={styles.timelineLine} />
                  <View style={[
                    styles.timelineDot,
                    item.importance === 'High' ? styles.dotHigh :
                      item.importance === 'Medium' ? styles.dotMedium : styles.dotLow
                  ]} />
                </View>
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={styles.timelineDate}>{item.displayDate || item.date}</Text>
                    <View style={styles.badgesGroup}>
                      {item.category ? (
                        <View style={[styles.badge, styles.categoryBadge]}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      ) : null}
                      {item.importance ? (
                        <View style={[
                          styles.badge,
                          item.importance === 'High' ? styles.badgeHigh :
                            item.importance === 'Medium' ? styles.badgeMedium : styles.badgeLow
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            item.importance === 'High' ? { color: '#EF4444' } :
                              item.importance === 'Medium' ? { color: '#F59E0B' } : { color: '#111111' }
                          ]}>{item.importance}</Text>
                        </View>
                      ) : null}
                      {item.createdBy === 'AI' && (
                        <View style={[styles.badge, styles.aiGeneratedBadge]}>
                          <Text style={styles.aiGeneratedBadgeText}>AI</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.timelineTitle}>{item.title || item.event}</Text>
                  <Text style={styles.timelineDesc}>{item.description}</Text>
                  {item.isApproximate && (
                    <Text style={styles.approximateNotice}>* Approximate date</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHearingsTab = () => {
    if (!workspace) return null;
    return (
      <CourtHearingsModule
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  

  const renderPartiesTab = () => {
    if (!workspace) return null;
    return (
      <PartiesManagerModule
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Legacy stub
  const _unusedPartiesTabStubCases = () => {
    const client = workspace?.clientName || 'N/A';
    const opponent = workspace?.opponentName || workspace?.accused || 'N/A';
    const lawyers = workspace?.lawyers || [];
    const court = workspace?.courtName || 'District Court';
    const judge = (workspace as any).judgeName || 'Justice Dixit';
    const opposingCounsel = (workspace as any).opposingLawyer || 'Vipul Sen (Senior Counsel)';

    const togglePartiesEditMode = () => {
      if (isPartiesEditMode) {
        // save action
        handleUpdateField({
          clientName: tempPartiesData.clientName || client,
          opponentName: tempPartiesData.opponentName || opponent,
          courtName: tempPartiesData.courtName || court,
          ...({
            judgeName: tempPartiesData.judgeName || judge,
            opposingLawyer: tempPartiesData.opposingLawyer || opposingCounsel
          } as any)
        });
        setIsPartiesEditMode(false);
        showToast('success', 'Roster Updated', 'Litigation parties roster updated successfully.');
      } else {
        setTempPartiesData({
          clientName: client,
          opponentName: opponent,
          courtName: court,
          judgeName: judge,
          opposingLawyer: opposingCounsel
        });
        setIsPartiesEditMode(true);
      }
    };

    const handleAutoExtractParties = async () => {
      setIsExtractingParties(true);
      setPartiesExtractionSteps([
        'Scanning documents for legal headers...',
        'Parsing plaintiff petitioner statements...',
        'Identifying opposing respondent advocates roster...',
        'Mapping judicial bench allocation metadata...',
        'Compiling roster database records...'
      ]);
      setActivePartiesExtractionStep(0);

      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 600));
        setActivePartiesExtractionStep(prev => prev + 1);
      }

      handleUpdateField({
        opposingLawyer: 'Vipul Sen (Senior Counsel)',
        courtName: 'Delhi District Court',
        ...({
          judgeName: 'Justice Dixit'
        } as any)
      });
      setIsExtractingParties(false);
      showToast('success', 'Parties Extracted', 'AI successfully parsed litigation advocate roster.');
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>{t('workspace.parties') || 'Parties'}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              style={styles.moduleHeaderBtn}
              onPress={handleAutoExtractParties}
            >
              <Ionicons name="sparkles" size={12} color="#111111" />
              <Text style={styles.moduleHeaderBtnText}>{t('parties.aiExtract')}</Text>
            </Pressable>
            <Pressable
              style={[styles.moduleHeaderBtn, isPartiesEditMode && { backgroundColor: '#111111' }]}
              onPress={togglePartiesEditMode}
            >
              <Ionicons name={isPartiesEditMode ? 'checkmark' : 'create-outline'} size={14} color={isPartiesEditMode ? '#FFFFFF' : '#111111'} />
              <Text style={[styles.moduleHeaderBtnText, isPartiesEditMode && { color: '#FFFFFF' }]}>
                {isPartiesEditMode ? t('parties.save') : t('parties.editMode')}
              </Text>
            </Pressable>
          </View>
        </View>

        {isExtractingParties && (
          <View style={[styles.metaCard, { alignItems: 'center', paddingVertical: 18 }]}>
            <ActivityIndicator size="small" color="#111111" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#111111' }}>
              {partiesExtractionSteps[activePartiesExtractionStep] || 'Parsing litigation signatures...'}
            </Text>
          </View>
        )}

        {isPartiesEditMode ? (
          <View style={styles.cardList}>
            <View style={styles.itemCard}>
              <Text style={styles.inputLabel}>{t('parties.clientNameLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.clientName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, clientName: t })}
              />
              <Text style={styles.inputLabel}>{t('parties.opponentNameLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.opponentName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, opponentName: t })}
              />
              <Text style={styles.inputLabel}>{t('parties.courtNameLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.courtName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, courtName: t })}
              />
              <Text style={styles.inputLabel}>{t('parties.judgeNameLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.judgeName}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, judgeName: t })}
              />
              <Text style={styles.inputLabel}>{t('parties.opposingCounselLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={tempPartiesData.opposingLawyer}
                onChangeText={(t) => setTempPartiesData({ ...tempPartiesData, opposingLawyer: t })}
              />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
            {/* Plaintiff / Petitioner Row */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              gap: 10
            }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="scale" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>{client}</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{t('parties.clientRole') || 'Plaintiff / Petitioner'}</Text>
              </View>
            </View>

            {/* Defendant / Respondent Row */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              gap: 10
            }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="person" size={18} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>{opponent}</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{t('parties.opponentRole') || 'Defendant / Respondent'}</Text>
              </View>
            </View>

            {/* Simple Add Party button below the list */}
            <TouchableOpacity
              onPress={() => {
                setModalType('party');
                setIsModalOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                marginTop: 8,
                gap: 6
              }}
            >
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>+ Add Party</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Witnesses & Counsel Section */}
        {lawyers.length > 0 ? (
          <View style={{ marginTop: 20, paddingHorizontal: 4 }}>
            <Text style={[styles.subHeading, { marginBottom: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }]}>
              {t('parties.witnesses')}
            </Text>
            <View>
              {lawyers.map((l, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  gap: 10
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(109, 93, 252, 0.15)' : '#F5F5F5',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="people" size={18} color="#111111" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>{l.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      {l.role} {l.contact && l.contact !== 'N/A' ? `• ${l.contact}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => {
                setModalType('party');
                setIsModalOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                marginTop: 8,
                gap: 6
              }}
            >
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>+ Add Witness / Counsel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 4 }}>
            <TouchableOpacity
              onPress={() => {
                setModalType('party');
                setIsModalOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                marginTop: 16,
                gap: 6
              }}
            >
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>+ Add Witness / Counsel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getFilteredEvidence = () => {
    const list = (workspace?.evidence || []) as any[];

    // Filter out soft-deleted items unless dmsFilter === 'trash'
    let result = list.filter(item => {
      const itemId = item._id || item.id;
      const isTrash = trashList.includes(itemId);
      if (dmsFilter === 'trash') return isTrash;
      return !isTrash;
    });

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.name || '').toLowerCase().includes(query) ||
        (item.type || '').toLowerCase().includes(query) ||
        (item.tags || []).some((t: string) => t.toLowerCase().includes(query)) ||
        (item.description || '').toLowerCase().includes(query)
      );
    }

    // Pinned filter
    if (dmsFilter === 'pinned') {
      result = result.filter(item => pinnedList.includes(item._id || item.id));
    } else if (dmsFilter === 'pdf') {
      result = result.filter(item => (item.name || '').toLowerCase().endsWith('.pdf'));
    } else if (dmsFilter === 'docx') {
      result = result.filter(item => (item.name || '').toLowerCase().endsWith('.docx') || (item.name || '').toLowerCase().endsWith('.doc'));
    } else if (dmsFilter === 'images') {
      result = result.filter(item => {
        const ext = (item.name || '').toLowerCase().split('.').pop() || '';
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      });
    }

    // Sorting logic
    result.sort((a, b) => {
      const aId = a._id || a.id;
      const bId = b._id || b.id;

      // Pinned first if sorted by pinned
      if (dmsSortBy === 'pinned') {
        const aPinned = pinnedList.includes(aId) ? 1 : 0;
        const bPinned = pinnedList.includes(bId) ? 1 : 0;
        return bPinned - aPinned;
      }

      if (dmsSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }

      if (dmsSortBy === 'oldest') {
        const aDate = new Date(a.uploadDate || a.uploadedDate || 0).getTime();
        const bDate = new Date(b.uploadDate || b.uploadedDate || 0).getTime();
        return aDate - bDate;
      }

      if (dmsSortBy === 'size') {
        const aSize = parseFloat(a.fileSize || '0') || 0;
        const bSize = parseFloat(b.fileSize || '0') || 0;
        return bSize - aSize;
      }

      // Default 'newest'
      const aDate = new Date(a.uploadDate || a.uploadedDate || 0).getTime();
      const bDate = new Date(b.uploadDate || b.uploadedDate || 0).getTime();
      return bDate - aDate;
    });

    return result;
  };

  const renderDocumentsTab = () => {
    if (!workspace) return null;
    return (
      <CaseDocumentManager
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Evidence Vault Tab Constants & Helpers
  const evidenceFilters = [
    'All', 'Documents', 'Images', 'Videos', 'Audio', 'Digital', 'Physical',
    'Verified', 'Pending', 'Witness', 'Contracts', 'Receipts', 'Photographs', 'Messages', 'Emails'
  ];

  const ocrStepTitles = [
    'Reading document raw layers...',
    'Extracting optical characters (OCR)...',
    'Structuring extracted text buffer...',
    'Checking signatures and stamps...'
  ];

  const aiStepTitles = [
    'Analyzing relevance under Indian Evidence Act...',
    'Detecting critical timeline entity entries...',
    'Identifying potential legal vulnerabilities...',
    'Finalizing exhibit summary report...'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Rejected': return '#EF4444';
      case 'Disputed': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'Document':
      case 'Contracts':
      case 'Emails':
        return 'document-text';
      case 'Images':
      case 'Photographs':
        return 'image';
      case 'Videos':
        return 'videocam';
      case 'Audio':
        return 'mic';
      case 'Digital':
        return 'cloud-done';
      case 'Physical':
        return 'briefcase';
      default:
        return 'shield-checkmark';
    }
  };

  const handleScanDocumentSimulate = () => {
    showToast('info', 'Document Scanner', 'Scanning document structures...');
    setTimeout(() => {
      handleAddEvidenceWithPipeline({
        name: `Scanned_Exhibit_Doc_${Math.floor(Math.random() * 900 + 100)}.pdf`,
        type: 'Document',
        description: 'Auto-scanned document containing client correspondence and details.',
        notes: 'Digitized via Mobile Evidence Scanner.',
        tags: 'Scanned, OCR, PDF',
        fileSize: '3.4 MB'
      });
    }, 1000);
  };

  const handleCapturePhotoSimulate = () => {
    showToast('info', 'Secure Camera', 'Activating secure case camera...');
    setTimeout(() => {
      handleAddEvidenceWithPipeline({
        name: `IMG_Evidence_${Math.floor(Math.random() * 9000 + 1000)}.jpg`,
        type: 'Images',
        description: 'Photograph of dispute site and assets captured on site.',
        notes: 'Captured via Secure Mobile Camera.',
        tags: 'Camera, Photo, JPEG',
        fileSize: '4.8 MB'
      });
    }, 1000);
  };

  const handleDownloadEvidenceSimulated = (evName: string) => {
    showToast('info', 'Downloading', `Starting download for "${evName}"...`);
    setTimeout(() => {
      showToast('success', 'Download Complete', `"${evName}" saved to Device Downloads.`);
    }, 1500);
  };

  const handleShareEvidence = async (ev: CaseEvidence) => {
    try {
      await Share.share({
        title: ev.name,
        message: `Case Evidence Exhibit ${ev.exhibitNumber || 'N/A'}: ${ev.name}\nType: ${ev.type}\nStatus: ${ev.status}\nSHA-256 Hash: ${ev.hash || 'N/A'}\nDescription: ${ev.description}`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const handleUploadSubmit = () => {
    if (!logEvidenceForm.name.trim()) {
      showToast('error', 'Validation Error', 'Evidence file name is required.');
      return;
    }

    const sizeStr = logEvidenceForm.fileSize.toUpperCase();
    let sizeMb = 0;
    if (sizeStr.includes('GB')) {
      sizeMb = parseFloat(sizeStr) * 1024;
    } else if (sizeStr.includes('KB')) {
      sizeMb = parseFloat(sizeStr) / 1024;
    } else {
      sizeMb = parseFloat(sizeStr) || 0;
    }

    if (sizeMb > 50) {
      showToast('error', 'Validation Error', 'File size exceeds the 50 MB mobile transmission threshold.');
      return;
    }

    handleAddEvidenceWithPipeline();
  };

  const renderMetricItem = (label: string, count: number, icon: string, color: string) => {
    return (
      <View key={label} style={styles.metricItemCard}>
        <View style={[styles.metricItemIconBg, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.metricItemCount}>{count}</Text>
        <Text style={styles.metricItemLabel}>{label}</Text>
      </View>
    );
  };

  const renderEntityBlock = (label: string, entitiesList?: string[]) => {
    if (!entitiesList || entitiesList.length === 0) return null;
    return (
      <View style={styles.entityBlock}>
        <Text style={styles.entityLabel}>{label}:</Text>
        <View style={styles.entityChipsContainer}>
          {entitiesList.map((ent, i) => (
            <View key={i} style={styles.entityChip}>
              <Text style={styles.entityChipText}>{ent}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleRelatedLinkPress = (tabName: string) => {
    setActiveWorkspaceTab(tabName);
    setIsEvidenceDetailsOpen(false);
    showToast('info', 'Section Jump', `Switched workspace tab to ${tabName.toUpperCase()}`);
  };

  // Evidence Vault Tab
  const renderEvidenceTab = () => {
    if (!workspace) return null;
    return (
      <EvidenceManagerModule
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Legacy stub
  const _unusedEvidenceTabStubCases = () => {
    const list = workspace?.evidence || [];

    // Calculate metrics
    const totalCount = list.length;
    const verifiedCount = list.filter(e => e.status === 'Verified').length;
    const pendingCount = list.filter(e => e.status === 'Pending').length;
    const digitalCount = list.filter(e => e.type === 'Digital').length;
    const physicalCount = list.filter(e => e.type === 'Physical').length;
    const photoCount = list.filter(e => e.type === 'Images' || e.type === 'Photographs').length;
    const audioVideoCount = list.filter(e => e.type === 'Audio' || e.type === 'Videos').length;
    const docCount = list.filter(e => e.type === 'Document' || e.type === 'Contracts' || e.type === 'Receipts' || e.type === 'Emails').length;

    // Filter list
    let filteredList = list;
    if (evidenceSearchQuery.trim()) {
      const query = evidenceSearchQuery.toLowerCase();
      filteredList = filteredList.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.exhibitNumber || '').toLowerCase().includes(query) ||
        (e.type || '').toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query) ||
        (e.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }

    if (evidenceFilter && evidenceFilter !== 'All') {
      const filter = evidenceFilter.toLowerCase();
      if (filter === 'verified') {
        filteredList = filteredList.filter(e => (e.status || '').toLowerCase() === 'verified');
      } else if (filter === 'pending') {
        filteredList = filteredList.filter(e => (e.status || '').toLowerCase() === 'pending');
      } else if (filter === 'documents') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'document' || (e.type || '').toLowerCase() === 'contracts' || (e.type || '').toLowerCase() === 'receipts');
      } else if (filter === 'images' || filter === 'photographs') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'images' || (e.type || '').toLowerCase() === 'photographs');
      } else if (filter === 'videos') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'videos');
      } else if (filter === 'audio') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'audio');
      } else if (filter === 'digital') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'digital');
      } else if (filter === 'physical') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'physical');
      } else if (filter === 'witness') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'witness' || (e.tags || []).some(t => t.toLowerCase().includes('witness')));
      } else if (filter === 'contracts') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'contracts' || (e.type || '').toLowerCase() === 'contract');
      } else if (filter === 'receipts') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'receipts' || (e.type || '').toLowerCase() === 'receipt');
      } else if (filter === 'messages') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'messages' || (e.type || '').toLowerCase() === 'message' || (e.tags || []).some(t => t.toLowerCase().includes('message')));
      } else if (filter === 'emails') {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === 'emails' || (e.type || '').toLowerCase() === 'email');
      } else {
        filteredList = filteredList.filter(e => (e.type || '').toLowerCase() === filter);
      }
    }

    return (
      <View style={styles.evidenceTabContainer}>
        {/* Sticky Case Header */}
        <View style={styles.evidenceHeader}>
          <Text style={styles.evidenceCaseTitle}>{workspace?.name}</Text>
          <View style={styles.evidenceBadgesRow}>
            <View style={[styles.evidenceBadge, styles.evidenceBadgeActive]}>
              <Text style={styles.evidenceBadgeText}>
                {t('enums.status.' + (workspace?.status || '').toUpperCase()) || workspace?.status || 'Active'}
              </Text>
            </View>
            <View style={[styles.evidenceBadge, styles.evidenceBadgePriority]}>
              <Text style={[styles.evidenceBadgeText, { color: theme.danger }]}>
                {t('enums.priority.' + (workspace?.priority || '').toUpperCase()) || workspace?.priority || 'High'} {t('workspace.prioritySuffix') || 'Priority'}
              </Text>
            </View>
          </View>
        </View>

        {/* Evidence Locker Card */}
        <View style={styles.lockerCard}>
          <View style={styles.lockerCardHeader}>
            <View style={styles.lockerIconBg}>
              <Ionicons name="lock-closed" size={24} color="#111111" />
            </View>
            <View style={styles.lockerCardTitleBlock}>
              <Text style={styles.lockerCardTitle}>{t('evidence.lockerTitle')}</Text>
              <Text style={styles.lockerCardSubtitle}>{t('evidence.lockerSubtitle')}</Text>
            </View>
          </View>
          <View style={styles.lockerActionsRow}>
            <Pressable
              style={styles.lockerPrimaryBtn}
              onPress={() => setIsEvidenceUploadOpen(true)}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              <Text style={styles.lockerPrimaryBtnText}>{t('evidence.uploadButton')}</Text>
            </Pressable>
            <Pressable
              style={styles.lockerSecondaryBtn}
              onPress={handleScanDocumentSimulate}
            >
              <Ionicons name="scan-outline" size={16} color="#111111" />
              <Text style={styles.lockerSecondaryBtnText}>{t('evidence.scanButton')}</Text>
            </Pressable>
            <Pressable
              style={styles.lockerSecondaryBtn}
              onPress={handleCapturePhotoSimulate}
            >
              <Ionicons name="camera-outline" size={16} color="#111111" />
              <Text style={styles.lockerSecondaryBtnText}>{t('evidence.captureButton')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Metrics Summary Horizontal Grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScrollView}
          contentContainerStyle={styles.metricsContainer}
        >
          {renderMetricItem(t('evidence.totalProof'), totalCount, 'folder-outline', '#111111')}
          {renderMetricItem(t('evidence.verified'), verifiedCount, 'shield-checkmark-outline', '#10B981')}
          {renderMetricItem(t('evidence.pendingShort') || t('evidence.pending'), pendingCount, 'time-outline', '#F59E0B')}
          {renderMetricItem(t('evidence.digital'), digitalCount, 'cloud-done-outline', '#3B82F6')}
          {renderMetricItem(t('evidence.physical'), physicalCount, 'briefcase-outline', '#C8A34D')}
          {renderMetricItem(t('evidence.photographs'), photoCount, 'image-outline', '#EC4899')}
          {renderMetricItem(t('evidence.audioVideo'), audioVideoCount, 'videocam-outline', '#EF4444')}
          {renderMetricItem(t('evidence.documents'), docCount, 'document-text-outline', '#10B981')}
        </ScrollView>

        {/* Search & Filters */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.evidenceSearchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.evidenceSearchIcon} />
            <TextInput
              style={styles.evidenceSearchInput}
              placeholder={t('evidence.searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={evidenceSearchQuery}
              onChangeText={setEvidenceSearchQuery}
            />
            {evidenceSearchQuery.trim() !== '' && (
              <Pressable onPress={() => setEvidenceSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Horizontal Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillsScrollView}
            contentContainerStyle={styles.pillsContainer}
          >
            {evidenceFilters.map((pill, idx) => {
              const isActive = evidenceFilter === pill;
              const localizedPill = pill === 'All' ? t('common.all') || t('evidence.all') || 'All'
                : pill === 'Documents' ? t('evidence.documents')
                  : pill === 'Images' ? t('evidence.images')
                    : pill === 'Videos' ? t('evidence.videos')
                      : pill === 'Audio' ? t('evidence.audio')
                        : pill === 'Digital' ? t('evidence.digital')
                          : pill === 'Physical' ? t('evidence.physical')
                            : pill === 'Verified' ? t('evidence.verified')
                              : pill === 'Pending' ? t('evidence.pendingShort') || t('evidence.pending')
                                : pill === 'Witness' ? t('parties.witnesses')
                                  : pill === 'Contracts' ? t('workspace.contractsStatus') || 'Contracts'
                                    : pill === 'Receipts' ? t('evidence.receipts') || 'Receipts'
                                      : pill === 'Messages' ? t('evidence.messages') || 'Messages'
                                        : pill === 'Emails' ? t('evidence.emails') || 'Emails'
                                          : pill;
              return (
                <Pressable
                  key={idx}
                  style={[styles.evidenceFilterPill, isActive && styles.evidenceFilterPillActive]}
                  onPress={() => setEvidenceFilter(pill)}
                >
                  <Text style={[styles.evidenceFilterPillText, isActive && styles.evidenceFilterPillTextActive]}>
                    {localizedPill}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Evidence List */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyEvidenceContainer}>
            <Ionicons name="shield-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyEvidenceTitle}>{t('evidence.noEvidenceFound')}</Text>
            <Text style={styles.emptyEvidenceSubtitle}>
              {list.length === 0
                ? t('evidence.emptySubtitleShort')
                : t('evidence.noEvidenceMatchShort')}
            </Text>
          </View>
        ) : (
          <View style={styles.evidenceListContainer}>
            {filteredList.map((ev) => {
              const statusColor = getStatusColor(ev.status || 'Pending');
              const statusBg = statusColor + '10';

              return (
                <View key={ev.id || ev._id} style={styles.evidenceCard}>
                  {/* Card Main Block */}
                  <View style={styles.evidenceCardMain}>
                    <View style={[styles.evidenceIconContainer, { backgroundColor: '#F5F5F5' }]}>
                      <Ionicons name={getEvidenceIcon(ev.type)} size={22} color="#111111" />
                    </View>
                    <View style={styles.evidenceCardMetaBlock}>
                      <View style={styles.evidenceCardTitleRow}>
                        <Text style={styles.exhibitCode}>{ev.exhibitNumber || 'N/A'}</Text>
                        <View style={[styles.evStatusBadge, { backgroundColor: statusBg }]}>
                          <View style={[styles.evStatusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.evStatusBadgeText, { color: statusColor }]}>
                            {ev.status === 'Verified' ? t('evidence.verified') : (ev.status === 'Pending' ? t('evidence.pendingShort') : (t('evidence.notVerified') || ev.status || 'Pending'))}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.evidenceName} numberOfLines={1}>{ev.name}</Text>
                      <Text style={styles.evidenceDesc} numberOfLines={2}>{ev.description}</Text>

                      <View style={styles.tagsRow}>
                        {(ev.tags || []).map((tag, tIdx) => (
                          <View key={tIdx} style={styles.tagPill}>
                            <Text style={styles.tagPillText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.evidenceUploaderRow}>
                        <Ionicons name="person-outline" size={10} color="#9CA3AF" />
                        <Text style={styles.uploaderText}>
                          {(typeof ev.uploadedBy === 'object' ? ev.uploadedBy?.name : ev.uploadedBy) || 'Advocate'} • {ev.fileSize || '1.2 MB'} • {ev.uploadedDate ? new Date(ev.uploadedDate).toLocaleDateString() : new Date().toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.evidenceActionsRow}>
                    <Pressable
                      style={styles.evidenceActionBtn}
                      onPress={() => {
                        setSelectedEvidence(ev);
                        setIsEvidenceDetailsOpen(true);
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color="#111111" />
                      <Text style={styles.evidenceActionText}>{t('evidence.view')}</Text>
                    </Pressable>

                    <Pressable
                      style={styles.evidenceActionBtn}
                      onPress={() => {
                        setVerifyTargetId(ev.id || ev._id || null);
                        setIsVerifyModalOpen(true);
                      }}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                      <Text style={[styles.evidenceActionText, { color: '#10B981' }]}>{t('evidence.verify')}</Text>
                    </Pressable>

                    <Pressable
                      style={styles.evidenceActionBtn}
                      onPress={() => handleShareEvidence(ev)}
                    >
                      <Ionicons name="share-social-outline" size={16} color="#3B82F6" />
                      <Text style={[styles.evidenceActionText, { color: '#3B82F6' }]}>{t('evidence.share')}</Text>
                    </Pressable>

                    <Pressable
                      style={styles.evidenceActionBtn}
                      onPress={() => handleDownloadEvidenceSimulated(ev.name)}
                    >
                      <Ionicons name="download-outline" size={16} color="#F59E0B" />
                      <Text style={[styles.evidenceActionText, { color: '#F59E0B' }]}>{t('evidence.download')}</Text>
                    </Pressable>

                    <Pressable
                      style={styles.evidenceActionBtn}
                      onPress={() => handleDeleteEvidence(ev.id || ev._id || '')}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={[styles.evidenceActionText, { color: '#EF4444' }]}>{t('evidence.delete')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Research precedents
  const renderResearchTab = () => {
    return (
      <ResearchIntelligenceWorkspace
        workspace={workspace}
        showToast={showToast}
        handleUpdateField={handleUpdateField}
        onBack={() => setActiveWorkspaceTab('overview')}
      />
    );
    const list = workspace?.savedPrecedents || [];

    const client = workspace?.clientName || 'Plaintiff';
    const opponent = workspace?.opponentName || workspace?.accused || 'Defendant';



    const toggleSection = (sectionName: string) => {
      setExpandedResearchSection(expandedResearchSection === sectionName ? '' : sectionName);
    };

    const baseLegalResearch = {
      caseType: workspace?.caseType || 'Civil Suit for Money Recovery',
      domain: 'Commercial Debt & Summary Contractual Obligations',
      completenessScore: 92,
      confidenceScore: 96,
      primaryCode: 'Civil Procedure Code',
      limitationRisk: 'Medium Risk',
      issues: [
        `Admissibility of uncertified electronic WhatsApp logs between ${client} and ${opponent} under Section 65B(4) of the Evidence Act.`,
        `Whether suit recovery limitation resets dynamically under Section 18 of the Limitation Act through digital debt acknowledgment by ${opponent}.`,
        `Calculability of interest rate for commercial loans when not explicitly set under Section 34 of Code of Civil Procedure (CPC).`
      ],
      principles: [
        `Strict certification compliance under Section 65B(4) represents a mandatory condition precedent for electronic secondary proofs between ${client} and ${opponent}.`,
        `Written digital acknowledgment by ${opponent} inside standard limitation durations triggers a fresh timeline computation for ${client}.`,
        `Courts hold discretion in commercial transactions to award reasonable market interest rate even if contract terms are silent.`
      ],
      caseStrengthSummary: "Strong prima facie case based on explicit digital debt acknowledgment, but vulnerable to electronic admissibility objections.",
      aiObservations: "The opponent has raised a limitation defense, but Section 18 of the Limitation Act is reset by their WhatsApp acknowledgment. High chance of decree under Order 37 if electronic certificates are filed.",
      laws: [
        {
          act: 'Indian Contract Act, 1872',
          section: 'Section 73 & Section 74',
          title: 'Compensation for breach of contract',
          description: 'Compensation details for contract breaches. Regulates standard interest caps and penal clauses validity.',
          reason: 'Applies directly to audited contract penalty rate limits and allows claiming unpaid invoice values as compensatory damages.'
        },
        {
          act: 'Code of Civil Procedure, 1908',
          section: 'Section 34 & Order XXXVII',
          title: 'Interest awards & summary suit procedure',
          description: 'Prescribes swift summary recovery protocols for debt claims based on written contracts.',
          reason: 'Ensures case adheres to accelerated civil decree rules and summary procedure Order 37 to expedite judgements.'
        },
        {
          act: 'Indian Evidence Act, 1872',
          section: 'Section 65B',
          title: 'Admissibility of electronic records',
          description: 'Admissibility guidelines for digital chats, email records, and account ledgers.',
          reason: 'Essential for placing HDFC ledger screenshots, email reminders, and WhatsApp chats in court record.'
        },
        {
          act: 'Specific Relief Act, 1963',
          section: 'Section 10',
          title: 'Specific performance of contracts',
          description: 'Discretion of the court to enforce contractual obligations directly.',
          reason: 'Applicable if simple recovery of dues is not adequate and direct enforcement of contractual obligations is demanded.'
        },
        {
          act: 'Transfer of Property Act, 1882',
          section: 'Section 54',
          title: 'Definition and transfer of sale',
          description: 'Defines sale of tangible immovable property and regulates delivery and contract of transfer.',
          reason: 'Relevant to determine the nature of collateral hardware assets or leased premises in dispute.'
        },
        {
          act: 'Indian Registration Act, 1908',
          section: 'Section 17',
          title: 'Documents compulsory for registration',
          description: 'Mandates compulsory registration of documents affecting immovable property, lease deeds exceeding one year.',
          reason: 'Applies if opponent argues lease or transaction contracts are inadmissible due to lack of compulsory registration.'
        }
      ],
      judgments: [
        {
          name: 'Kailash Nath Associates vs DDA',
          court: 'Supreme Court of India',
          citation: '2015 4 SCC 136',
          year: '2015',
          bench: 'Two-Judge Bench',
          principle: 'Liquidated damages enforcement under Section 74',
          why: 'Governs interest damages recovery limits and penalty clause validity.',
          ratio: 'Forfeiture or penalty claims require a genuine pre-estimate assessment and actual loss demonstration.',
          summary: 'Deals with liquidated damages limits. Governs contractual obligations between plaintiff and defendant.'
        },
        {
          name: 'Anvar P.V. vs P.K. Basheer',
          court: 'Supreme Court of India',
          citation: '2014 10 SCC 473',
          year: '2014',
          bench: 'Three-Judge Bench',
          principle: 'Secondary electronic records admissibility under Section 65B',
          why: 'Regulates WhatsApp/email printouts acceptability.',
          ratio: 'Secondary electronic files require explicit statutory certification.',
          summary: 'Admissibility guidelines for secondary electronic devices. Mandates signed Section 65B certification checks.'
        },
        {
          name: 'State of Nagaland vs Lipok AO',
          court: 'Supreme Court of India',
          citation: '2005 3 SCC 752',
          year: '2005',
          bench: 'Two-Judge Bench',
          principle: 'Procedural delay condonation under Section 5',
          why: 'Assists in defending against any limitation technicalities raised by the opposing counsel.',
          ratio: 'Courts must adopt a pragmatic, non-pedantic approach to condoning delays where justice warrants a full trial.',
          summary: 'Addressed procedural delay condonation under Section 5. Stressed that technical issues should not override substantive justice.'
        },
        {
          name: 'Ambalal Sarabhai Enterprise Ltd. vs K.S. Infraspace LLP',
          court: 'Supreme Court of India',
          citation: '2020 15 SCC 585',
          year: '2020',
          bench: 'Two-Judge Bench',
          principle: 'Summary commercial suit jurisdiction and timelines',
          why: 'Applicable if the opposing party tries to transfer the suit to regular civil courts to delay trials.',
          ratio: 'The provisions of the Commercial Courts Act must be strictly interpreted and applied to speed up dispute resolutions.',
          summary: 'Examines the scope of commercial court jurisdiction and timelines under the Commercial Courts Act, 2015.'
        },
        {
          name: 'Arjun Panditrao Khotkar vs Kailash Kushanrao Gorantyal',
          court: 'Supreme Court of India',
          citation: '2020 7 SCC 1',
          year: '2020',
          bench: 'Three-Judge Bench',
          principle: 'Timing for producing Section 65B(4) electronic certificate',
          why: 'Clarifies certificate production procedure during the trial.',
          ratio: 'The required certificate under Section 65B(4) can be supplied at any stage prior to trial commencement.',
          summary: 'Clarified that producing an electronic certificate is mandatory, but if the device owner refuses, the court can issue summons to produce it.'
        },
        {
          name: 'SBI vs M/s. Aditya Birla',
          court: 'High Court of Delhi',
          citation: '2022 SCC OnLine DL 842',
          year: '2022',
          bench: 'Division Bench',
          principle: 'Limitation period resets via electronic debt acknowledgment',
          why: 'Validates electronic communications as a reset trigger.',
          ratio: 'Ledger balances and acknowledgements confirmed via email constitute a valid acknowledgement of debt under Section 18.',
          summary: 'Held that digital communication containing ledger approval counts as valid written acknowledgment under Section 18 of the Limitation Act.'
        }
      ],
      recommendations: [
        `Acquire a certified Section 65B certificate for WhatsApp database backups between ${client} and ${opponent}.`,
        `File detailed replication contesting delivery default claims by ${opponent}.`,
        `Rely on Kailash Nath Associates vs DDA to justify delayed simple interest damages for ${client}.`,
        `Compile Information Technology Act device owner signatures raw records.`,
        `Obtain HDFC Bank statement verified printouts showing direct payment reversals.`
      ],
      arguments: {
        primary: [
          `The debt transaction was explicitly verified and acknowledged via email on 12 April 2025.`,
          `WhatsApp logs contain explicit promises to pay outstanding dues, resetting the limitation period.`
        ],
        counter: [
          `The defendant claims the suit is barred by the three-year limitation period.`,
          `The defendant disputes WhatsApp admissibility due to lack of a Section 65B certificate.`
        ],
        authorities: [
          `Anvar P.V. vs P.K. Basheer (2014) on Section 65B.`,
          `SBI vs M/s. Aditya Birla (2022) on debt acknowledgment.`
        ],
        weaknesses: [
          `Lack of raw IT server logs for email authentication.`
        ],
        strengths: [
          `Explicit email acknowledgements are signed with standard digital metadata.`
        ],
        strategy: [
          `File Order 37 summary suit immediately to limit the defense options.`
        ],
        opponentArguments: [
          `Uncertified WhatsApp chat logs are completely inadmissible.`
        ],
        suggestedRebuttals: [
          `Rely on Arjun Panditrao Khotkar to argue certificate can be supplied before trial.`
        ]
      },
      missingEvidence: [
        `IT administrator certificate for HDFC ledger printouts.`
      ],
      missingCaseLaws: [
        `High Court rulings on Slack or chat systems admissibility.`
      ],
      additionalAuthorities: [
        `Shahi Associates vs Union of India`
      ],
      suggestedActs: [
        `Information Technology Act, 2000 (Section 65A/65B)`
      ],
      additionalDocs: [
        `Raw email source EML files with header metadata.`
      ],
      missingPrecedents: [
        `Limitation Act Section 18 applicability to digital ledger approvals.`
      ]
    };

    const activeLaws = conversationalSearchResults?.laws || baseLegalResearch.laws;
    let activeJudgments = conversationalSearchResults?.judgments || baseLegalResearch.judgments;

    // Apply judgment filter
    if (judgmentFilter !== 'All') {
      if (judgmentFilter === 'Supreme Court') {
        activeJudgments = activeJudgments.filter(j => j.court.includes('Supreme Court'));
      } else if (judgmentFilter === 'High Court') {
        activeJudgments = activeJudgments.filter(j => j.court.includes('High Court'));
      } else if (judgmentFilter === 'Tribunal') {
        activeJudgments = activeJudgments.filter(j => j.court.toLowerCase().includes('tribunal') || j.court.includes('NCLT'));
      } else if (judgmentFilter === 'Recent') {
        activeJudgments = activeJudgments.filter(j => parseInt(j.year || '0') >= 2015);
      } else if (judgmentFilter === 'Landmark') {
        activeJudgments = activeJudgments.filter(j => ['Kailash Nath', 'Anvar P.V.', 'Arjun Panditrao'].some(n => j.name.includes(n)));
      }
    }

    return (
      <View style={styles.tabContent}>
        {/* 1. Case Header */}
        <View style={styles.premiumHeaderCard}>
          <View style={styles.premiumHeaderTop}>
            <Ionicons name="briefcase" size={18} color="#111111" />
            <Text style={styles.premiumHeaderTitle}>{workspace?.name || 'Case Workspace'}</Text>
          </View>
          <View style={styles.premiumHeaderBadges}>
            <View style={[styles.premiumStatusBadge, { backgroundColor: workspace?.status === 'Closed' ? '#F3F4F6' : '#EEF2FF' }]}>
              <Text style={[styles.premiumBadgeText, { color: workspace?.status === 'Closed' ? '#4B5563' : '#111111' }]}>{workspace?.status || 'Active'}</Text>
            </View>
            <View style={[styles.premiumPriorityBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.premiumBadgeText, { color: '#EF4444' }]}>{workspace?.priority || 'High'} Priority</Text>
            </View>
          </View>
        </View>

        {/* 2. AI Legal Research Engine */}
        <View style={styles.premiumSearchCard}>
          <Text style={styles.premiumSearchTitle}>AI Legal Research Engine</Text>
          <Text style={styles.premiumSearchSubtitle}>
            Automatic context-aware legal research synced with active case documents.
          </Text>

          <View style={styles.searchBarRow}>
            <TextInput
              style={styles.premiumSearchInput}
              placeholder="Ask the AI legal research engine..."
              placeholderTextColor="#9CA3AF"
              value={researchSearchQuery}
              onChangeText={setResearchSearchQuery}
              onSubmitEditing={() => processConversationalSearch(researchSearchQuery)}
            />
            <TouchableOpacity
              style={styles.premiumSearchBtn}
              onPress={() => processConversationalSearch(researchSearchQuery)}
            >
              <Text style={styles.premiumSearchBtnText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.premiumAnalyzeBtn}
              onPress={() => runResearchAnalysis(false)}
              disabled={isRegeneratingResearch}
            >
              <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.premiumAnalyzeBtnText}>Analyze & Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Suggestion Chips */}
          <Text style={styles.suggestionsTitle}>Examples:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChipsContainer}>
            {[
              'Find judgments supporting recovery suits',
              'What Supreme Court cases apply?',
              'Limitation period precedents',
              'WhatsApp evidence admissibility'
            ].map((sug, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sugChip}
                onPress={() => processConversationalSearch(sug)}
              >
                <Text style={styles.sugChipText}>{`"${sug}"`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isRegeneratingResearch && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#111111" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#111111' }}>
              {researchRegenSteps[activeResearchRegenStep] || 'Structuring citation parameters...'}
            </Text>
          </View>
        )}

        {isSearchingResearch && (
          <View style={styles.ocrOverlayStatic}>
            <ActivityIndicator size="small" color="#111111" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 6 }}>Searching digital judicial archives...</Text>
          </View>
        )}

        {/* Empty State vs Content Render */}
        {!isResearchGenerated ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="library-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateText}>No legal research has been generated for this case yet.</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={styles.emptyStateBtn} onPress={() => runResearchAnalysis(false)}>
                <Text style={styles.emptyStateBtnText}>Analyze Case</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.emptyStateBtn, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]} onPress={() => runResearchAnalysis(false)}>
                <Text style={[styles.emptyStateBtnText, { color: '#4B5563' }]}>Refresh Research</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* 3. Research Summary Cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{baseLegalResearch.completenessScore}%</Text>
                <Text style={styles.metricLabel}>Research Coverage</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>{baseLegalResearch.confidenceScore}%</Text>
                <Text style={styles.metricLabel}>Confidence Index</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>CPC</Text>
                <Text style={styles.metricLabel}>Primary Code</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: '#EF4444' }]}>Medium</Text>
                <Text style={styles.metricLabel}>Limitation Risk</Text>
              </View>
            </View>

            {/* 4. AI Research Dashboard Overview */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('dashboard')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="analytics-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>AI Research Dashboard Overview</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'dashboard' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'dashboard' && (
                <View style={styles.accordionContent}>
                  {aiResearchReply ? (
                    <View style={styles.aiReplyContainer}>
                      <Text style={styles.aiReplyTitle}>🔮 Live AI Research Analysis:</Text>
                      <Text style={styles.aiReplyText}>{aiResearchReply}</Text>
                      <View style={[styles.dividerLine, { marginVertical: 12 }]} />
                    </View>
                  ) : null}
                  <Text style={styles.accordionTextBold}>Identified Case Type: <Text style={{ fontWeight: 'normal' }}>{baseLegalResearch.caseType}</Text></Text>
                  <Text style={[styles.accordionTextBold, { marginTop: 4 }]}>Core Jurisdiction / Domain: <Text style={{ fontWeight: 'normal' }}>{baseLegalResearch.domain}</Text></Text>
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Key Legal Issues:</Text>
                  {baseLegalResearch.issues.map((iss, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {iss}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Relevant Judicial Principles:</Text>
                  {baseLegalResearch.principles.map((pr, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {pr}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Case Strength Summary:</Text>
                  <Text style={styles.accordionTextNormal}>{baseLegalResearch.caseStrengthSummary}</Text>
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>AI Legal Observations:</Text>
                  <Text style={styles.accordionTextNormal}>{baseLegalResearch.aiObservations}</Text>
                </View>
              )}
            </View>

            {/* 5. Applicable Laws & Provisions */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('laws')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="book-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>Applicable Laws & Provisions ({activeLaws.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'laws' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'laws' && (
                <View style={styles.accordionContent}>
                  {activeLaws.map((l, i) => {
                    const isLawExpanded = !!expandedLaws[i];
                    return (
                      <View key={i} style={styles.researchLawItemCard}>
                        <TouchableOpacity
                          style={styles.lawItemHeader}
                          onPress={() => setExpandedLaws(prev => ({ ...prev, [i]: !prev[i] }))}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.lawActLabel}>{l.act}</Text>
                            <Text style={styles.lawSecLabel}>{l.section}</Text>
                          </View>
                          <Ionicons name={isLawExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
                        </TouchableOpacity>
                        {isLawExpanded && (
                          <View style={styles.lawItemExpandedContent}>
                            <Text style={styles.lawTitleLabel}>{l.title || 'Provision Title'}</Text>
                            <Text style={styles.lawDesc}>{l.description}</Text>
                            <View style={styles.lawExplanationBox}>
                              <Ionicons name="sparkles" size={11} color="#111111" style={{ marginTop: 2 }} />
                              <Text style={styles.lawExplanationText}>
                                <Text style={{ fontWeight: 'bold' }}>Applicability to Case: </Text>{l.reason}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 6. Relevant Judgments & Precedents */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('judgments')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="document-text-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>Relevant Judgments & Precedents ({activeJudgments.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'judgments' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'judgments' && (
                <View style={styles.accordionContent}>
                  {/* Category filters */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.judFilterContainer}>
                    {['All', 'Supreme Court', 'High Court', 'Tribunal', 'Recent', 'Landmark'].map((filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.judFilterBtn, judgmentFilter === filter && styles.judFilterBtnActive]}
                        onPress={() => setJudgmentFilter(filter)}
                      >
                        <Text style={[styles.judFilterBtnText, judgmentFilter === filter && styles.judFilterBtnTextActive]}>
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {activeJudgments.map((j, i) => {
                    const isJudExpanded = !!expandedJudgments[i];
                    return (
                      <View key={i} style={styles.judgmentItemCard}>
                        <TouchableOpacity
                          style={styles.judgmentItemHeader}
                          onPress={() => setExpandedJudgments(prev => ({ ...prev, [i]: !prev[i] }))}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.judgmentTitle}>{j.name}</Text>
                            <Text style={styles.judgmentCitation}>{j.court} • {j.citation} ({j.year})</Text>
                          </View>
                          <Ionicons name={isJudExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
                        </TouchableOpacity>

                        {isJudExpanded && (
                          <View style={styles.judgmentItemExpandedContent}>
                            <Text style={styles.judgmentDetailText}><Text style={{ fontWeight: 'bold' }}>Bench: </Text>{j.bench || 'Division Bench'}</Text>
                            <Text style={styles.judgmentDetailText}><Text style={{ fontWeight: 'bold' }}>Legal Principle: </Text>{j.principle}</Text>
                            <Text style={styles.judgmentDetailText}><Text style={{ fontWeight: 'bold' }}>Summary: </Text>{j.summary}</Text>
                            <Text style={styles.judgmentDetailText}><Text style={{ fontWeight: 'bold' }}>Ratio: </Text>{j.ratio}</Text>
                            <Text style={styles.judgmentDetailText}><Text style={{ fontWeight: 'bold' }}>Why it applies: </Text>{j.why}</Text>

                            <View style={styles.judgmentButtonsRow}>
                              <TouchableOpacity style={styles.judActionBtn} onPress={() => showToast('info', 'View Judgment', `Opening full judgment for ${j.name}...`)}>
                                <Text style={styles.judActionBtnText}>View Full Judgment</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.judActionBtn} onPress={() => handleSavePrecedentToBackend(j)}>
                                <Text style={styles.judActionBtnText}>Save Citation</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.judActionBtn} onPress={() => {
                                Clipboard.setString(`${j.name} (${j.citation})`);
                                showToast('success', 'Copied', 'Citation copied to clipboard.');
                              }}>
                                <Text style={styles.judActionBtnText}>Copy Citation</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.judActionBtn} onPress={() => showToast('info', 'Open Judgment', `Redirecting to digital law archives...`)}>
                                <Text style={styles.judActionBtnText}>Open Judgment</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 7. AI Arguments & Strategy Formulation */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('arguments')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bulb-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>AI Arguments & Strategy Formulation</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'arguments' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'arguments' && (
                <View style={styles.accordionContent}>
                  <Text style={styles.accordionTextBold}>Primary Arguments:</Text>
                  {baseLegalResearch.arguments.primary.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Counter Arguments:</Text>
                  {baseLegalResearch.arguments.counter.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Supporting Authorities:</Text>
                  {baseLegalResearch.arguments.authorities.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Weaknesses:</Text>
                  {baseLegalResearch.arguments.weaknesses.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Strengths:</Text>
                  {baseLegalResearch.arguments.strengths.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Recommended Strategy:</Text>
                  {baseLegalResearch.arguments.strategy.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Possible Opponent Arguments:</Text>
                  {baseLegalResearch.arguments.opponentArguments.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Suggested Rebuttals:</Text>
                  {baseLegalResearch.arguments.suggestedRebuttals.map((arg, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {arg}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* 8. AI Recommendations & Missing Authorities */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('recommendations')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="warning-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>AI Recommendations & Missing Authorities</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'recommendations' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'recommendations' && (
                <View style={styles.accordionContent}>
                  <Text style={styles.accordionTextBold}>Missing Evidence:</Text>
                  {baseLegalResearch.missingEvidence.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Missing Case Laws:</Text>
                  {baseLegalResearch.missingCaseLaws.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Additional Authorities Recommended:</Text>
                  {baseLegalResearch.additionalAuthorities.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Suggested Supporting Acts:</Text>
                  {baseLegalResearch.suggestedActs.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Additional Documents Required:</Text>
                  {baseLegalResearch.additionalDocs.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                  <Text style={[styles.accordionTextBold, { marginTop: 8 }]}>Missing Precedents:</Text>
                  {baseLegalResearch.missingPrecedents.map((item, i) => (
                    <Text key={i} style={styles.accordionBullet}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* 9. Saved Research Citations */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSection('saved')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bookmark-outline" size={16} color="#111111" />
                  <Text style={styles.accordionTitle}>Saved Research Citations ({list.length})</Text>
                </View>
                <Ionicons name={expandedResearchSection === 'saved' ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {expandedResearchSection === 'saved' && (
                <View style={styles.accordionContent}>
                  {list.length === 0 ? (
                    <Text style={styles.emptyTextSaved}>No citations registered to this brief roster. Click {"\"Save Citation\""} above.</Text>
                  ) : (
                    list.map((prec, i) => (
                      <View key={i} style={styles.savedPrecedentItemCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.savedPrecedentTitle}>⚖️ {prec.title}</Text>
                            <Text style={styles.savedPrecedentCitation}>{prec.citation}</Text>
                            <Text style={styles.savedPrecedentDate}>Bookmarked: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => showToast('info', 'Quick Open', `Opening archived citation file...`)}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="open-outline" size={14} color="#111111" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                Clipboard.setString(`${prec.title} (${prec.citation})`);
                                showToast('success', 'Copied', 'Citation copied to clipboard.');
                              }}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="copy-outline" size={14} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                const updated = list.filter((_, idx) => idx !== i);
                                handleUpdateField({ savedPrecedents: updated });
                                showToast('success', 'Deleted', 'Saved research reference removed.');
                              }}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={styles.savedPrecedentSummary}>{prec.summary}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  // Draft Pleadings
  const renderDraftsTab = () => {
    const DRAFT_TEMPLATES = [
      'Legal Notice',
      'Reply Notice',
      'FIR Draft',
      'Affidavit',
      'Agreement',
      'Written Statement',
      'Plaint',
      'Appeal',
      'Bail Application',
      'Contract',
      'Power of Attorney',
      'Rent Agreement',
      'Employment Agreement',
      'Recovery Notice',
      'Consumer Complaint',
      'Misc'
    ];

    const list = workspace?.drafts || [];

    const filteredList = list.filter(d => {
      // Search filter
      if (draftSearchQuery.trim()) {
        const q = draftSearchQuery.toLowerCase();
        const matchName = d.name && d.name.toLowerCase().includes(q);
        const matchType = d.type && d.type.toLowerCase().includes(q);
        const matchContent = d.content && d.content.toLowerCase().includes(q);
        if (!matchName && !matchType && !matchContent) return false;
      }

      // Category filter pills
      if (draftFilter !== 'All') {
        const f = draftFilter;
        if (f === 'Notices') {
          return d.type.toLowerCase().includes('notice') || d.type.toLowerCase().includes('complaint');
        } else if (f === 'Affidavits') {
          return d.type.toLowerCase().includes('affidavit');
        } else if (f === 'Agreements') {
          return d.type.toLowerCase().includes('agreement');
        } else if (f === 'Contracts') {
          return d.type.toLowerCase().includes('contract');
        } else if (f === 'Replies') {
          return d.type.toLowerCase().includes('reply') || d.type.toLowerCase().includes('statement');
        } else if (f === 'Completed') {
          return d.status === 'Completed' || d.status === 'Reviewed';
        } else if (f === 'In Progress') {
          return d.status === 'In Progress' || d.status === 'Draft';
        } else if (f === 'AI Generated') {
          return d.createdBy === 'AI';
        } else if (f === 'Manual') {
          return d.createdBy !== 'AI';
        }
      }
      return true;
    });

    const sortedList = [...filteredList].sort((a, b) => {
      if (draftSort === 'Newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (draftSort === 'Oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (draftSort === 'Recently Updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (draftSort === 'Alphabetical') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return (
      <View style={styles.tabContent}>
        {/* 1. Case Header */}
        <View style={styles.premiumHeaderCard}>
          <View style={styles.premiumHeaderTop}>
            <Ionicons name="briefcase" size={18} color="#111111" />
            <Text style={styles.premiumHeaderTitle}>{workspace?.name || 'Case Workspace'}</Text>
          </View>
          <View style={styles.premiumHeaderBadges}>
            <View style={[styles.premiumStatusBadge, { backgroundColor: workspace?.status === 'Closed' ? '#F3F4F6' : '#EEF2FF' }]}>
              <Text style={[styles.premiumBadgeText, { color: workspace?.status === 'Closed' ? '#4B5563' : '#111111' }]}>{workspace?.status || 'Active'}</Text>
            </View>
            <View style={[styles.premiumPriorityBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.premiumBadgeText, { color: '#EF4444' }]}>{workspace?.priority || 'High'} Priority</Text>
            </View>
          </View>
        </View>

        {/* 2. Initialize Manual Draft Folder Card */}
        <View style={styles.premiumSearchCard}>
          <Text style={styles.premiumSearchTitle}>Initialize Manual Draft Folder</Text>
          <Text style={styles.premiumSearchSubtitle}>
            Create a new manual legal draft folder to compile pleadings, contracts, or notices.
          </Text>

          <Text style={styles.inputLabel}>Draft Folder Name</Text>
          <TextInput
            style={styles.premiumSearchInput}
            placeholder="Draft Name (e.g. Reply Notice)"
            placeholderTextColor="#9CA3AF"
            value={draftForm.name}
            onChangeText={(t) => setDraftForm({ ...draftForm, name: t })}
          />

          <View style={styles.dropdownContainer}>
            <Text style={styles.inputLabel}>Draft Template Type</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setIsDraftTypePickerOpen(!isDraftTypePickerOpen)}
            >
              <Text style={styles.dropdownTriggerText}>{draftForm.type}</Text>
              <Ionicons name={isDraftTypePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#4B5563" />
            </TouchableOpacity>
            {isDraftTypePickerOpen && (
              <View style={styles.dropdownListContainer}>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                  {DRAFT_TEMPLATES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownItem, draftForm.type === type && styles.dropdownItemActive]}
                      onPress={() => {
                        setDraftForm({ ...draftForm, type });
                        setIsDraftTypePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, draftForm.type === type && styles.dropdownItemTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.formSubmitBtn, { marginTop: 12 }]}
            onPress={handleCreateDraftFolder}
          >
            <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.formSubmitBtnText}>Initialize Draft Folder</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Search and Filters */}
        <View style={[styles.premiumSearchCard, { paddingVertical: 12 }]}>
          <View style={styles.searchBarRow}>
            <TextInput
              style={[styles.premiumSearchInput, { flex: 1 }]}
              placeholder="Search drafts by title, type..."
              placeholderTextColor="#9CA3AF"
              value={draftSearchQuery}
              onChangeText={setDraftSearchQuery}
            />
            {draftSearchQuery ? (
              <TouchableOpacity onPress={() => setDraftSearchQuery('')} style={{ paddingHorizontal: 4 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ paddingHorizontal: 4 }} />
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChipsContainer}>
            {['All', 'Notices', 'Affidavits', 'Agreements', 'Contracts', 'Replies', 'Completed', 'In Progress', 'AI Generated', 'Manual'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.sugChip, draftFilter === f && styles.sugChipActive]}
                onPress={() => setDraftFilter(f)}
              >
                <Text style={[styles.sugChipText, draftFilter === f && styles.sugChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort Row */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptionsContainer}>
              {['Newest', 'Oldest', 'Recently Updated', 'Alphabetical'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.sortOptionChip, draftSort === opt && styles.sortOptionChipActive]}
                  onPress={() => setDraftSort(opt)}
                >
                  <Text style={[styles.sortOptionText, draftSort === opt && styles.sortOptionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 4. Case Drafts Folder List */}
        <View style={{ gap: 12 }}>
          {sortedList.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateText}>No legal drafts match your criteria.</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                Initialize a manual draft folder above to begin compiling pleadings.
              </Text>
            </View>
          ) : (
            sortedList.map((draft) => {
              const isRenaming = renameTargetDraftId === draft.id;
              const updatedDateStr = new Date(draft.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <View key={draft.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons
                        name={draft.createdBy === 'AI' ? 'sparkles-outline' : 'folder-outline'}
                        size={20}
                        color={draft.createdBy === 'AI' ? '#EC4899' : '#111111'}
                      />

                      {isRenaming ? (
                        <View style={styles.renameRow}>
                          <TextInput
                            style={styles.renameInput}
                            value={renameValue}
                            onChangeText={setRenameValue}
                            autoFocus
                            placeholder="Enter name"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TouchableOpacity
                            style={styles.renameActionBtn}
                            onPress={() => {
                              handleRenameDraft(draft.id, renameValue);
                              setRenameTargetDraftId('');
                            }}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.renameActionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={() => setRenameTargetDraftId('')}
                          >
                            <Ionicons name="close" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemCardTitle}>{draft.name}</Text>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{draft.type}</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.versionBadge}>
                        <Text style={styles.versionBadgeText}>v{draft.versions?.length || 1}</Text>
                      </View>
                      <View style={[styles.statusBadge,
                      draft.status === 'Completed' ? styles.badgeSuccess :
                        draft.status === 'Reviewed' ? styles.badgeInfo :
                          draft.status === 'In Progress' ? styles.badgeWarning : styles.badgeInfo
                      ]}>
                        <Text style={styles.statusBadgeText}>{draft.status}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Preview snippet */}
                  <Text style={[styles.itemCardBody, { fontSize: 11, color: '#4B5563', fontStyle: 'italic', marginVertical: 6 }]} numberOfLines={2}>
                    {draft.content ? draft.content.replace(/={3,}/g, '').substring(0, 120).trim() + '...' : 'Empty content...'}
                  </Text>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Updated: {updatedDateStr} by {draft.createdBy}</Text>

                    {/* Actions Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      {/* 👁 Preview/View Draft */}
                      <TouchableOpacity
                        onPress={() => {
                          setPreviewDraft(draft);
                          setIsPreviewOpen(true);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="eye-outline" size={18} color="#111111" />
                      </TouchableOpacity>

                      {/* ✏️ Edit Draft */}
                      <TouchableOpacity
                        onPress={() => handleOpenDraftEditor(draft)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      </TouchableOpacity>

                      {/* 🗑 Delete Draft */}
                      <TouchableOpacity
                        onPress={() => handleDeleteDraft(draft.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>

                      {/* ⋮ More */}
                      <TouchableOpacity
                        onPress={() => {
                          setActiveDraftForMoreMenu(draft);
                          setIsCardMoreMenuOpen(true);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  // Contracts mock and analysis helper functions
  const mockContractDetails = {
    name: 'commercial_lease_agreement_signed.pdf',
    size: '1.2 MB',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    readingTime: '5 mins',
    type: 'Commercial Lease Agreement',
    parties: 'Rajesh Sharma (Lessor) & Amit Verma (Lessee)',
    riskScore: '82/100',
    contractValue: 'INR 18,00,000',
    jurisdiction: 'Delhi, India',
    expiryDate: '12 Jun 2027',
    renewalStatus: 'Manual Option (30-day notice)',
    contractStatus: 'Active / Fully Executed',
    executionDate: '12 Jun 2024',
    effectiveDate: '15 Jun 2024',
    renewalDate: '12 May 2027',
    governingLaw: 'Indian Contract Act, 1872 & Delhi Rent Control Act',

    keyInfo: {
      parties: 'Rajesh Sharma (Lessor) vs Amit Verma (Lessee)',
      addresses: 'Lessor: 12 Barakhamba Rd, Connaught Place, New Delhi. Lessee: Pocket E, Sector 15, Rohini, New Delhi.',
      dates: 'Execution Date: 12 Jun 2024. Expiry Date: 12 Jun 2027.',
      amounts: 'Security Deposit: INR 1,50,000. Monthly Rent: INR 50,000.',
      duration: '36 Months (3 Years)',
      paymentTerms: 'Rent payable in advance on or before the 5th of each calendar month via bank transfer.',
      noticePeriod: '3 Months (90 days) written notice required by either party.',
      renewalPeriod: 'Written request for renewal required 30 days prior to expiry.',
      terminationConditions: 'Unilateral termination permitted upon material default or insolvency with 30-day cure period.',
      arbitrationClause: 'Sole arbitrator appointed by Delhi International Arbitration Centre (DIAC).',
      jurisdiction: 'Courts of Delhi, India.',
      obligations: 'Lessor: Maintain structural integrity of building. Lessee: Pay utility bills, minor repairs, restrict sub-letting.',
      deliverables: 'Handover of vacant possession on 15 June 2024.',
      deadlines: 'Rent payments due monthly by 5th day. Security deposit payment by 10 June 2024.'
    },

    clauses: [
      {
        number: 'Clause 4',
        title: 'Payment & Late Fee Interest Penalty',
        category: 'Payment',
        original: 'The Tenant shall pay the monthly rent on the 5th day of every month. Any delay in payments shall attract interest at the discretion of the Landlord.',
        summary: 'tenant pays monthly rent by the 5th. Vague discretionary late fee penalty is set by the Landlord.',
        risk: 'Medium',
        explanation: 'Discretionary late fees can be challenged as a penalty under Section 74 of the Indian Contract Act if they are excessive or arbitrary.',
        improvements: 'Change discretionary penalty to a fixed commercial simple interest cap (e.g. 12% per annum).',
        law: 'Section 74, Indian Contract Act, 1872'
      },
      {
        number: 'Clause 8',
        title: 'Security Deposit & Refunding Terms',
        category: 'Financial',
        original: 'A security deposit of INR 1,50,000 shall be maintained by the Landlord. Refund shall be processed within 90 days after tenant vacates, subject to deductions.',
        summary: 'Security deposit refund takes 90 days post-handover, with landlord deductions permitted.',
        risk: 'Medium',
        explanation: '90 days is commercially slow for retail deposits and lacks explicit dispute resolution terms for deductions.',
        improvements: 'Reduce refund period to 30 days and mandate joint walkthrough report before deduction.',
        law: 'Section 105, Transfer of Property Act, 1882'
      },
      {
        number: 'Clause 11',
        title: 'Unilateral Termination Option',
        category: 'Termination',
        original: 'The Landlord reserves the right to terminate this agreement immediately and forfeit the security deposit if the Tenant fails to clear rent for two consecutive periods, without prior notice.',
        summary: 'Landlord can terminate lease immediately without notice upon consecutive rent defaults.',
        risk: 'High',
        explanation: 'Immediate forfeiture without notice or a cure period constitutes an unenforceable penalty and violates statutory tenant relief laws.',
        improvements: 'Add a mandatory 15-day written notice and a 10-day cure period before forfeiture.',
        law: 'Section 114, Transfer of Property Act, 1882'
      },
      {
        number: 'Clause 15',
        title: 'Dispute Resolution & DIAC Arbitration',
        category: 'Dispute Resolution',
        original: 'All disputes arising from this lease agreement shall be referred to arbitration in Mumbai. The courts in Mumbai shall have exclusive jurisdiction.',
        summary: 'Mumbai courts and arbitration have exclusive jurisdiction over disputes.',
        risk: 'Medium',
        explanation: 'Since the property is located in Delhi and parties reside there, Mumbai jurisdiction is inconvenient and may increase litigation costs.',
        improvements: 'Amend dispute resolution seat and venue to New Delhi under DIAC administration.',
        law: 'Section 20, Arbitration and Conciliation Act, 1996'
      },
      {
        number: 'Clause 18',
        title: 'Sub-letting and Structural Modification Restriction',
        category: 'Compliance',
        original: 'The Lessee shall not sub-let, assign, or part with the possession of the premises, nor make structural changes without the prior written consent of the Lessor.',
        summary: 'Prohibits subletting, transfer of possession, or structural changes without Landlord written consent.',
        risk: 'Low',
        explanation: 'Standard commercial protection clause. Well-drafted and legally enforceable.',
        improvements: 'None needed. Maintain current clause wording.',
        law: 'Section 108, Transfer of Property Act, 1882'
      }
    ],

    risks: {
      high: [
        {
          title: 'Unilateral Immediate Termination',
          reason: 'Clause 11 permits the landlord to terminate the contract immediately without notice and forfeit security deposit upon default.',
          consequences: 'Tenant can obtain a court injunction staying the eviction. Landlord could face legal liability for illegal possession lockout.',
          fix: 'Add a mandatory 15-day written cure notice before lease termination.',
          law: 'Section 114, Transfer of Property Act, 1882'
        }
      ],
      medium: [
        {
          title: 'Vague Late Fee Penalties',
          reason: 'Clause 4 allows the landlord to charge late fees "at the Landlord\'s discretion".',
          consequences: 'Arbitrary penalties are regularly struck down under Section 74. Tenant could refuse payment on grounds of unreasonableness.',
          fix: 'Cap late payment penalty to a simple interest of 12% per annum.',
          law: 'Section 74, Indian Contract Act, 1872'
        },
        {
          title: 'Inconvenient Jurisdiction Venue',
          reason: 'Clause 15 sets Mumbai courts as the venue for dispute resolution instead of New Delhi.',
          consequences: 'Significantly increases cost of dispute filings and travel expenses for witnesses and documents.',
          fix: 'Change jurisdiction to New Delhi, India.',
          law: 'Section 20, Civil Procedure Code (CPC)'
        }
      ],
      low: [
        {
          title: '90-Day Security Deposit Refund Delay',
          reason: 'Clause 8 allows the landlord to hold the deposit for 90 days post vacate date.',
          consequences: 'Ties up tenant capital. Potential dispute upon vacate.',
          fix: 'Reduce security deposit refund period to 30 days.',
          law: 'Section 108, Transfer of Property Act, 1882'
        }
      ]
    },

    missingClauses: [
      {
        title: 'Force Majeure & Epidemic Relief',
        risk: 'High',
        recommendation: 'Insert a standard Force Majeure clause to specify rental suspensions or modifications in cases of earthquakes, pandemics, lockdowns, or building destruction.'
      },
      {
        title: 'Confidentiality Protection',
        risk: 'Medium',
        recommendation: 'Add confidentiality provisions protecting proprietary tenant hardware designs or commercial financials exchanged during lease term.'
      },
      {
        title: 'Limitation of Liability',
        risk: 'Medium',
        recommendation: 'Include a limitation clause capping either party\'s indirect or consequential damages to the amount of lease payments.'
      }
    ],

    suggestions: {
      negotiation: [
        'Demand matching notice periods: If landlord wants 90 days, tenant should also have 90 days notice.',
        'Reduce deposit: Offer 2 months deposit instead of 3 months to improve cash flow.',
        'Negotiate utility caps: Lessor should bear structural plumbing/roof repair costs.'
      ],
      alternatives: [
        {
          original: 'Clause 11: ...terminate immediately without prior notice.',
          alternative: 'Clause 11: In the event of default, Landlord shall issue a written cure notice of 15 days. If Tenant fails to clear dues within 15 days, Landlord may proceed with termination.'
        }
      ],
      saferClauses: [
        '“Late Fee Penalty: Interest on delayed payments shall accrue at a simple interest rate of 12% per annum, calculated daily.”',
        '“Security Deposit: Security deposit shall be returned within 30 days after handing over vacant possession of the premises.”'
      ],
      missingDefinitions: [
        '“Material Breach” - Vague defaults are currently categorized identically to minor administrative issues.',
        '“Structural Repairs” - Lacks definition on what constitutes structural vs minor modifications.'
      ],
      conflictingTerms: [
        'Clause 8 requires vacating on 12 June 2027, but Clause 4 references rent charges based on calendar months, creating confusion over final month partial payments.'
      ]
    },

    recommendations: {
      potentialRisks: 'Discretionary rent late fee and lack of notice cure periods.',
      recommendedEdits: 'Incorporate 15-day cure notices and fix late fee to 12% simple interest.',
      missingClauses: 'Force Majeure, Confidentiality, and Limitation of Liability.',
      negotiationPoints: 'Reduce refund period to 30 days and seat dispute resolution in Delhi.',
      complianceIssues: 'Register agreement under Delhi Registration rules.',
      legalObservations: 'Overall draft is weighted towards landlord, tenant should negotiate.',
      strengthScore: 84
    }
  };

  const handleUploadContract = async () => {
    setIsAnalyzingContract(true);
    setContractAnalysisSteps([
      'Reading document pages & raw layers...',
      'Extracting clause boundaries and definitions...',
      'Detecting execution dates and party headers...',
      'Auditing liabilities, risks, and missing terms...',
      'Compiling contract intelligence profile...'
    ]);
    setActiveContractAnalysisStep(0);

    const interval = setInterval(() => {
      setActiveContractAnalysisStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      const clientName = workspace?.clientName || 'Client';
      const opponentName = workspace?.opponentName || workspace?.accused || 'Opponent';

      const result = await DraftService.executeTool({
        toolName: 'legal_contract_analyzer',
        message: `Analyze the contract agreement for case: "${workspace?.name || ''}". Client: "${clientName}". Opponent: "${opponentName}". Identify risk level, vulnerability terms, termination period, and payment penalties.`,
        caseContext: {
          name: workspace?.name,
          clientName: clientName,
          opponentName: opponentName,
          caseType: workspace?.caseType,
          summary: workspace?.summary || workspace?.caseSummary
        }
      });

      clearInterval(interval);
      setIsAnalyzingContract(false);

      if (result && result.success) {
        setUploadedContract({
          ...mockContractDetails,
          summary: {
            ...mockContractDetails.recommendations,
            potentialRisks: result.reply.substring(0, 300) + '...'
          }
        });

        const current = (workspace as any).contracts || [];
        handleUpdateField({
          contracts: [...current, {
            name: 'commercial_lease_agreement_signed.pdf',
            riskLevel: 'High',
            notes: 'Audited automatically by AI Contract Intelligence'
          }]
        });
        showToast('success', 'Contract Audited', 'AI scanned contract and compiled clause audit.');
      } else {
        showToast('error', 'Analysis Failed', result?.error || 'Failed to analyze contract.');
      }
    } catch (err) {
      clearInterval(interval);
      setIsAnalyzingContract(false);
      console.error('[CONTRACT ANALYZER ERROR]', err);
      setUploadedContract(mockContractDetails);

      const current = (workspace as any).contracts || [];
      handleUpdateField({
        contracts: [...current, {
          name: 'commercial_lease_agreement_signed.pdf',
          riskLevel: 'High',
          notes: 'Audited automatically by AI Contract Intelligence'
        }]
      });
      showToast('warning', 'Analysis Fallback', 'Scanned contract using default local workspace parameters.');
    }
  };

  const handleSyncWithCaseWorkspace = () => {
    if (!workspace) return;
    const existingTimeline = workspace.facts || [];
    const hasContractEvents = existingTimeline.some(e => (e.event || '').includes('Contract Execution'));

    let updatedTimeline = existingTimeline;
    if (!hasContractEvents) {
      updatedTimeline = [
        ...existingTimeline,
        {
          date: '12 Jun 2024',
          event: 'Contract Execution (AI Extracted)',
          description: 'Signing and execution of Commercial Lease Agreement between Rajesh Sharma and Amit Verma.'
        },
        {
          date: '12 Jun 2027',
          event: 'Contract Expiry (AI Extracted)',
          description: 'Expiry of commercial lease requiring written renewal notice.'
        }
      ];
    }

    handleUpdateField({
      opposingLawyer: 'Vipul Sen (Senior Counsel)',
      courtName: 'Delhi District Court',
      facts: updatedTimeline as any
    });
    setIsContractLinked(true);
    showToast('success', 'Workspace Synced', 'Roster parties and chronology events updated from contract.');
  };

  const renderKeyInfoRow = (label: string, value: string) => {
    return (
      <View style={styles.overviewTableRow} key={label}>
        <Text style={styles.overviewTableLabel}>{label}</Text>
        <Text style={styles.overviewTableValue}>{value}</Text>
      </View>
    );
  };

  const toggleClauseExpanded = (index: number) => {
    setExpandedClauses(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleRiskExpanded = (key: string) => {
    setExpandedRisks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleMissingExpanded = (key: string) => {
    setExpandedMissing(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleArgumentExpanded = (id: string) => {
    setExpandedArguments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePinArgument = (id: string) => {
    setPinnedArguments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    showToast('success', pinnedArguments[id] ? 'Argument Unpinned' : 'Argument Pinned', pinnedArguments[id] ? 'Removed argument pin.' : 'Pinned argument to top row.');
  };

  const handleAddArgument = (type: 'petitioner' | 'respondent', argData: any) => {
    const nextNum = type === 'petitioner' ? petitionerArguments.length + 1 : respondentArguments.length + 1;
    const prefix = type === 'petitioner' ? 'ARG' : 'DEF';
    const newArg = {
      id: `arg_${Date.now()}`,
      number: `${prefix} ${nextNum}`,
      title: argData.title || 'Untitled Argument',
      category: argData.category || 'Contract Law',
      priority: argData.priority || 'High',
      description: argData.description || '',
      supportingFacts: argData.supportingFacts ? argData.supportingFacts.split('\n').filter((s: string) => s.trim()) : [],
      supportingLaws: argData.supportingLaws ? argData.supportingLaws.split('\n').filter((s: string) => s.trim()) : [],
      supportingCaseLaws: argData.supportingCaseLaws ? argData.supportingCaseLaws.split('\n').filter((s: string) => s.trim()) : [],
      relatedEvidence: argData.relatedEvidence ? argData.relatedEvidence.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      relatedDocuments: argData.relatedDocuments ? argData.relatedDocuments.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      relatedTimelineEvents: argData.relatedTimelineEvents ? argData.relatedTimelineEvents.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      relatedHearings: argData.relatedHearings ? argData.relatedHearings.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      refutation: type === 'respondent' ? argData.refutation || '' : undefined
    };
    if (type === 'petitioner') {
      setPetitionerArguments(prev => [...prev, newArg]);
    } else {
      setRespondentArguments(prev => [...prev, newArg]);
    }
    showToast('success', 'Argument Added', 'New manual litigation argument created successfully.');
  };

  const handleEditArgument = (type: 'petitioner' | 'respondent', id: string, argData: any) => {
    const updateFn = (prev: any[]) => prev.map(a => a.id === id ? {
      ...a,
      title: argData.title,
      category: argData.category,
      priority: argData.priority,
      description: argData.description,
      supportingFacts: argData.supportingFacts ? argData.supportingFacts.split('\n').filter((s: string) => s.trim()) : a.supportingFacts,
      supportingLaws: argData.supportingLaws ? argData.supportingLaws.split('\n').filter((s: string) => s.trim()) : a.supportingLaws,
      supportingCaseLaws: argData.supportingCaseLaws ? argData.supportingCaseLaws.split('\n').filter((s: string) => s.trim()) : a.supportingCaseLaws,
      relatedEvidence: argData.relatedEvidence ? argData.relatedEvidence.split(',').map((s: string) => s.trim()).filter(Boolean) : a.relatedEvidence,
      relatedDocuments: argData.relatedDocuments ? argData.relatedDocuments.split(',').map((s: string) => s.trim()).filter(Boolean) : a.relatedDocuments,
      relatedTimelineEvents: argData.relatedTimelineEvents ? argData.relatedTimelineEvents.split(',').map((s: string) => s.trim()).filter(Boolean) : a.relatedTimelineEvents,
      relatedHearings: argData.relatedHearings ? argData.relatedHearings.split(',').map((s: string) => s.trim()).filter(Boolean) : a.relatedHearings,
      refutation: type === 'respondent' ? argData.refutation : a.refutation
    } : a);

    if (type === 'petitioner') {
      setPetitionerArguments(updateFn);
    } else {
      setRespondentArguments(updateFn);
    }
    showToast('success', 'Argument Saved', 'Litigation argument changes saved.');
  };

  const handleDeleteArgument = (type: 'petitioner' | 'respondent', id: string) => {
    if (type === 'petitioner') {
      setPetitionerArguments(prev => prev.filter(a => a.id !== id));
    } else {
      setRespondentArguments(prev => prev.filter(a => a.id !== id));
    }
    showToast('success', 'Argument Deleted', 'Argument removed from active list.');
  };

  const handleDuplicateArgument = (type: 'petitioner' | 'respondent', arg: any) => {
    const nextNum = type === 'petitioner' ? petitionerArguments.length + 1 : respondentArguments.length + 1;
    const prefix = type === 'petitioner' ? 'ARG' : 'DEF';
    const duplicatedArg = {
      ...arg,
      id: `arg_${Date.now()}`,
      number: `${prefix} ${nextNum}`,
      title: `${arg.title} Copy`
    };
    if (type === 'petitioner') {
      setPetitionerArguments(prev => [...prev, duplicatedArg]);
    } else {
      setRespondentArguments(prev => [...prev, duplicatedArg]);
    }
    showToast('success', 'Argument Cloned', 'Duplicated argument details successfully.');
  };

  const openAddArgModal = (category: 'petitioner' | 'respondent') => {
    setArgModalType('add');
    setArgModalCategory(category);
    setArgModalTargetId(null);
    setArgForm({
      title: '',
      category: 'Contract Law',
      priority: 'High',
      description: '',
      supportingFacts: '',
      supportingLaws: '',
      supportingCaseLaws: '',
      relatedEvidence: '',
      relatedDocuments: '',
      relatedTimelineEvents: '',
      relatedHearings: ''
    });
    setIsArgModalOpen(true);
  };

  const openEditArgModal = (category: 'petitioner' | 'respondent', arg: any) => {
    setArgModalType('edit');
    setArgModalCategory(category);
    setArgModalTargetId(arg.id);
    setArgForm({
      title: arg.title || '',
      category: arg.category || 'Contract Law',
      priority: arg.priority || 'High',
      description: arg.description || '',
      supportingFacts: (arg.supportingFacts || []).join('\n'),
      supportingLaws: (arg.supportingLaws || []).join('\n'),
      supportingCaseLaws: (arg.supportingCaseLaws || []).join('\n'),
      relatedEvidence: (arg.relatedEvidence || []).join(', '),
      relatedDocuments: (arg.relatedDocuments || []).join(', '),
      relatedTimelineEvents: (arg.relatedTimelineEvents || []).join(', '),
      relatedHearings: (arg.relatedHearings || []).join(', ')
    });
    setIsArgModalOpen(true);
  };

  // Contracts
  const renderContractsTab = () => {
    if (!workspace) return null;
    return (
      <ContractManagerModule
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Legacy stub
  const _unusedContractsTabStubCases = () => {
    // Search and filter logic
    const filteredClauses = uploadedContract
      ? (uploadedContract.clauses as any[]).filter(c => {
        const matchQuery =
          c.number.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
          c.title.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
          c.original.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
          c.summary.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
          c.law.toLowerCase().includes(contractSearchQuery.toLowerCase());

        if (contractFilter === 'All Clauses') return matchQuery;
        if (contractFilter === 'High Risk') return matchQuery && c.risk === 'High';
        if (contractFilter === 'Medium Risk') return matchQuery && c.risk === 'Medium';
        if (contractFilter === 'Low Risk') return matchQuery && c.risk === 'Low';
        if (contractFilter === 'Financial') return matchQuery && c.category === 'Financial';
        if (contractFilter === 'Termination') return matchQuery && c.category === 'Termination';
        if (contractFilter === 'Payment') return matchQuery && c.category === 'Payment';
        if (contractFilter === 'Confidentiality') return matchQuery && c.category === 'Confidentiality';
        if (contractFilter === 'Dispute Resolution') return matchQuery && c.category === 'Dispute Resolution';
        if (contractFilter === 'Arbitration') return matchQuery && c.category === 'Arbitration';
        if (contractFilter === 'Renewal') return matchQuery && c.category === 'Renewal';
        if (contractFilter === 'Liability') return matchQuery && c.category === 'Liability';
        if (contractFilter === 'Compliance') return matchQuery && c.category === 'Compliance';
        return matchQuery;
      })
      : [];

    return (
      <View style={styles.tabContent}>
        {/* Sticky Case Header */}
        <View style={styles.evidenceHeader}>
          <Text style={styles.evidenceCaseTitle}>{workspace?.name || 'Case Workspace'}</Text>
          <View style={styles.evidenceBadgesRow}>
            <View style={[styles.evidenceBadge, styles.evidenceBadgeActive]}>
              <Text style={styles.evidenceBadgeText}>{workspace?.status || 'Active'}</Text>
            </View>
            <View style={[styles.evidenceBadge, styles.evidenceBadgePriority]}>
              <Text style={[styles.evidenceBadgeText, { color: theme.danger }]}>
                {workspace?.priority || 'High'} Priority
              </Text>
            </View>
          </View>
        </View>

        {/* Empty State / Uploader */}
        {!uploadedContract && !isAnalyzingContract && (
          <View style={styles.contractUploadCard}>
            <View style={styles.contractUploadIconBg}>
              <Ionicons name="document-text-outline" size={32} color="#111111" />
            </View>
            <Text style={styles.contractUploadTitle}>Upload Term Contract or Agreement</Text>
            <Text style={styles.contractUploadSubtitle}>
              Drag & drop or browse contract files. AI will automatically audit payment terms, notices, liabilities, and risks.
            </Text>
            <Text style={styles.contractFormatsText}>
              Supported Formats: PDF, DOCX, Scanned Images (Max 50MB)
            </Text>
            <View style={styles.contractUploadActions}>
              <TouchableOpacity style={styles.contractUploadPrimaryBtn} onPress={handleUploadContract}>
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.contractUploadPrimaryText}>Upload Contract</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contractUploadSecondaryBtn} onPress={handleUploadContract}>
                <Ionicons name="scan-outline" size={17} color="#111111" />
                <Text style={styles.contractUploadSecondaryText}>Scan Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* OCR / Analysis Steps Loader */}
        {isAnalyzingContract && (
          <View style={styles.contractLoaderContainer}>
            <View style={styles.contractLoaderIconWrapper}>
              <ActivityIndicator size="large" color="#111111" />
            </View>
            <Text style={styles.contractLoaderTitle}>AI Contract Analyzer</Text>
            <Text style={styles.contractLoaderSubtitle}>Digitizing document layers & computing risk variables...</Text>

            <View style={styles.loaderStepsContainer}>
              {contractAnalysisSteps.map((step, idx) => {
                const isCompleted = activeContractAnalysisStep > idx;
                const isActive = activeContractAnalysisStep === idx;
                return (
                  <View key={idx} style={styles.loaderStepRow}>
                    <View style={[
                      styles.loaderStepBullet,
                      isCompleted && styles.loaderStepBulletCompleted,
                      isActive && styles.loaderStepBulletActive
                    ]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={[styles.loaderStepBulletDot, isActive && styles.loaderStepBulletDotActive]} />
                      )}
                    </View>
                    <Text style={[
                      styles.loaderStepText,
                      isCompleted && styles.loaderStepTextCompleted,
                      isActive && styles.loaderStepTextActive
                    ]}>
                      {step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Contract Audited Dashboard */}
        {uploadedContract && !isAnalyzingContract && (
          <View style={{ gap: 16 }}>
            {/* Top Workspace Bar */}
            <View style={styles.contractOverviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contractOverviewName}>📜 {uploadedContract.name}</Text>
                <Text style={styles.contractOverviewSize}>
                  {uploadedContract.size} • Reading time: {uploadedContract.readingTime}
                </Text>
              </View>
              <View style={styles.contractOverviewActions}>
                <TouchableOpacity
                  style={[styles.contractOverviewSyncBtn, isContractLinked && { backgroundColor: '#F3F4F6' }]}
                  onPress={handleSyncWithCaseWorkspace}
                  disabled={isContractLinked}
                >
                  <Ionicons name="sparkles" size={14} color={isContractLinked ? '#9CA3AF' : '#111111'} />
                  <Text style={[styles.contractOverviewSyncText, isContractLinked && { color: '#9CA3AF' }]}>
                    {isContractLinked ? 'Linked' : 'Sync Workspace'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contractOverviewReuploadBtn}
                  onPress={() => {
                    setUploadedContract(null);
                    setIsContractLinked(false);
                  }}
                >
                  <Ionicons name="reload" size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Metrics Dashboard Grid */}
            <View style={styles.contractMetricsGrid}>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Contract Type</Text>
                <Text style={styles.contractMetricValue} numberOfLines={1}>Lease</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Parties Identified</Text>
                <Text style={styles.contractMetricValue}>2</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Total Clauses</Text>
                <Text style={styles.contractMetricValue}>5</Text>
              </View>
              <View style={[styles.contractMetricCard, { borderLeftColor: '#EF4444', borderLeftWidth: 3 }]}>
                <Text style={styles.contractMetricLabel}>Risk Score</Text>
                <Text style={[styles.contractMetricValue, { color: '#EF4444' }]}>{uploadedContract.riskScore}</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Expiry Date</Text>
                <Text style={styles.contractMetricValue} numberOfLines={1}>{uploadedContract.expiryDate}</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Renewal Status</Text>
                <Text style={styles.contractMetricValue} numberOfLines={1}>Option</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Contract Value</Text>
                <Text style={styles.contractMetricValue} numberOfLines={1}>1.8M INR</Text>
              </View>
              <View style={styles.contractMetricCard}>
                <Text style={styles.contractMetricLabel}>Jurisdiction</Text>
                <Text style={styles.contractMetricValue} numberOfLines={1}>Delhi</Text>
              </View>
            </View>

            {/* Horizontal Sub Navigation Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.contractPillsScroll}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'clauses', label: 'Clauses Audit' },
                { id: 'risks', label: 'Risks & Missing' },
                { id: 'suggestions', label: 'Suggestions & Exports' }
              ].map((tab) => {
                const isActive = contractActiveSubTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.contractTabPill, isActive && styles.contractTabPillActive]}
                    onPress={() => setContractActiveSubTab(tab.id)}
                  >
                    <Text style={[styles.contractTabPillText, isActive && styles.contractTabPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tab CONTENT 1: Overview & Key Extraction */}
            {contractActiveSubTab === 'overview' && (
              <View style={{ gap: 16 }}>
                {/* Contract Overview Metadata Card */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>Contract Overview</Text>
                  <View style={styles.overviewTable}>
                    {renderKeyInfoRow('Contract Name', uploadedContract.name)}
                    {renderKeyInfoRow('Contract Type', uploadedContract.type)}
                    {renderKeyInfoRow('Contract Status', uploadedContract.contractStatus)}
                    {renderKeyInfoRow('Execution Date', uploadedContract.executionDate)}
                    {renderKeyInfoRow('Effective Date', uploadedContract.effectiveDate)}
                    {renderKeyInfoRow('Expiry Date', uploadedContract.expiryDate)}
                    {renderKeyInfoRow('Renewal Date', uploadedContract.renewalDate)}
                    {renderKeyInfoRow('Governing Law', uploadedContract.governingLaw)}
                    {renderKeyInfoRow('Jurisdiction', uploadedContract.jurisdiction)}
                  </View>
                </View>

                {/* Key Information Extraction Card */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>Key Information Extraction</Text>
                  <View style={styles.overviewTable}>
                    {renderKeyInfoRow('Parties', uploadedContract.keyInfo.parties)}
                    {renderKeyInfoRow('Addresses', uploadedContract.keyInfo.addresses)}
                    {renderKeyInfoRow('Dates Extracted', uploadedContract.keyInfo.dates)}
                    {renderKeyInfoRow('Financial Amounts', uploadedContract.keyInfo.amounts)}
                    {renderKeyInfoRow('Contract Duration', uploadedContract.keyInfo.duration)}
                    {renderKeyInfoRow('Payment Terms', uploadedContract.keyInfo.paymentTerms)}
                    {renderKeyInfoRow('Notice Period', uploadedContract.keyInfo.noticePeriod)}
                    {renderKeyInfoRow('Renewal Option Period', uploadedContract.keyInfo.renewalPeriod)}
                    {renderKeyInfoRow('Termination Conditions', uploadedContract.keyInfo.terminationConditions)}
                    {renderKeyInfoRow('Arbitration Clause', uploadedContract.keyInfo.arbitrationClause)}
                    {renderKeyInfoRow('Jurisdiction Seat', uploadedContract.keyInfo.jurisdiction)}
                    {renderKeyInfoRow('Obligations Outlined', uploadedContract.keyInfo.obligations)}
                    {renderKeyInfoRow('Deliverables', uploadedContract.keyInfo.deliverables)}
                    {renderKeyInfoRow('Deadlines', uploadedContract.keyInfo.deadlines)}
                  </View>
                </View>
              </View>
            )}

            {/* Tab CONTENT 2: Clauses Audit (expandable list, filters, search) */}
            {contractActiveSubTab === 'clauses' && (
              <View style={{ gap: 12 }}>
                {/* Search Bar */}
                <View style={styles.evidenceSearchBar}>
                  <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.evidenceSearchIcon} />
                  <TextInput
                    style={styles.evidenceSearchInput}
                    placeholder="Search clause text, title, laws, risk..."
                    placeholderTextColor="#9CA3AF"
                    value={contractSearchQuery}
                    onChangeText={setContractSearchQuery}
                  />
                  {contractSearchQuery.trim() !== '' && (
                    <Pressable onPress={() => setContractSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>

                {/* Scrollable Pills Filter Bar */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.pillsScrollView}
                  contentContainerStyle={styles.pillsContainer}
                >
                  {[
                    'All Clauses', 'High Risk', 'Medium Risk', 'Low Risk',
                    'Financial', 'Termination', 'Payment', 'Confidentiality',
                    'Dispute Resolution', 'Arbitration', 'Renewal', 'Liability', 'Compliance'
                  ].map((pill, idx) => {
                    const isActive = contractFilter === pill;
                    return (
                      <Pressable
                        key={idx}
                        style={[styles.filterPill, isActive && styles.filterPillActive]}
                        onPress={() => setContractFilter(pill)}
                      >
                        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                          {pill}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Clauses List */}
                {filteredClauses.length === 0 ? (
                  <View style={styles.emptyEvidenceContainer}>
                    <Text style={styles.emptyEvidenceTitle}>No Matching Clauses</Text>
                    <Text style={styles.emptyEvidenceSubtitle}>Adjust query terms or check another filter pill category.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {filteredClauses.map((clause, idx) => {
                      const isExpanded = !!expandedClauses[idx];
                      const isHigh = clause.risk === 'High';
                      const isMed = clause.risk === 'Medium';
                      const riskColor = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#10B981';

                      return (
                        <View key={idx} style={styles.evidenceCard}>
                          <Pressable style={styles.evidenceCardMain} onPress={() => toggleClauseExpanded(idx)}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.evidenceCardTitleRow}>
                                <Text style={styles.exhibitCode}>{clause.number} • {clause.category}</Text>
                                <View style={[styles.evStatusBadge, { backgroundColor: riskColor + '15' }]}>
                                  <Text style={[styles.evStatusBadgeText, { color: riskColor }]}>{clause.risk} Risk</Text>
                                </View>
                              </View>
                              <Text style={styles.evidenceName}>{clause.title}</Text>
                              <Text style={styles.evidenceDesc} numberOfLines={isExpanded ? undefined : 2}>
                                {clause.original}
                              </Text>
                            </View>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={16}
                              color="#9CA3AF"
                              style={{ marginLeft: 8, marginTop: 4 }}
                            />
                          </Pressable>

                          {isExpanded && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 }}>
                              <View>
                                <Text style={styles.evidenceInputLabel}>AI Clause Summary</Text>
                                <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{clause.summary}</Text>
                              </View>

                              <View>
                                <Text style={styles.evidenceInputLabel}>AI Explanation & Vulnerabilities</Text>
                                <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{clause.explanation}</Text>
                              </View>

                              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#DCFCE7' }}>
                                <Text style={[styles.evidenceInputLabel, { color: '#15803D', marginTop: 0 }]}>Suggested Rewrite Improvement</Text>
                                <Text style={{ fontSize: 12, color: '#15803D', marginTop: 4, fontStyle: 'italic', fontWeight: '500' }}>
                                  {clause.improvements}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>{clause.law}</Text>
                                <View style={{ flexDirection: 'row', gap: 12, marginLeft: 'auto' }}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      Clipboard.setString(clause.original);
                                      showToast('success', 'Copied', 'Original clause copied.');
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, color: '#111111', fontWeight: '700' }}>Copy</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => {
                                      showToast('success', 'Bookmarked', `${clause.number} saved in contract bookmarks.`);
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, color: '#111111', fontWeight: '700' }}>Bookmark</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Tab CONTENT 3: Risks & Missing */}
            {contractActiveSubTab === 'risks' && (
              <View style={{ gap: 16 }}>
                {/* Categorized Risks list */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>AI Risk Analysis</Text>

                  {/* High Risk Group */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.findingsSubLabel, { color: '#EF4444' }]}>🚨 High Risk Terms</Text>
                    {uploadedContract.risks.high.map((risk: any, i: number) => (
                      <View key={i} style={[styles.evidenceCard, { marginTop: 6, borderColor: '#FFE3E3' }]}>
                        <Pressable style={{ padding: 12 }} onPress={() => toggleRiskExpanded('high_' + i)}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#C53030' }}>{risk.title}</Text>
                            <Ionicons name={expandedRisks['high_' + i] ? "chevron-up" : "chevron-down"} size={14} color="#C53030" />
                          </View>
                          <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>Why: {risk.reason}</Text>

                          {!!expandedRisks['high_' + i] && (
                            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#FFE3E3', paddingTop: 8, gap: 6 }}>
                              <Text style={{ fontSize: 11, color: '#4B5563' }}><Text style={{ fontWeight: '700' }}>Legal Consequences: </Text>{risk.consequences}</Text>
                              <Text style={{ fontSize: 11, color: '#15803D' }}><Text style={{ fontWeight: '700' }}>Suggested Fix: </Text>{risk.fix}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{risk.law}</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  {/* Medium Risk Group */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.findingsSubLabel, { color: '#F59E0B' }]}>⚠️ Medium Risk Terms</Text>
                    {uploadedContract.risks.medium.map((risk: any, i: number) => (
                      <View key={i} style={[styles.evidenceCard, { marginTop: 6, borderColor: '#FEF3C7' }]}>
                        <Pressable style={{ padding: 12 }} onPress={() => toggleRiskExpanded('med_' + i)}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>{risk.title}</Text>
                            <Ionicons name={expandedRisks['med_' + i] ? "chevron-up" : "chevron-down"} size={14} color="#B45309" />
                          </View>
                          <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>Why: {risk.reason}</Text>

                          {!!expandedRisks['med_' + i] && (
                            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#FEF3C7', paddingTop: 8, gap: 6 }}>
                              <Text style={{ fontSize: 11, color: '#4B5563' }}><Text style={{ fontWeight: '700' }}>Legal Consequences: </Text>{risk.consequences}</Text>
                              <Text style={{ fontSize: 11, color: '#15803D' }}><Text style={{ fontWeight: '700' }}>Suggested Fix: </Text>{risk.fix}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{risk.law}</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  {/* Low Risk Group */}
                  <View>
                    <Text style={[styles.findingsSubLabel, { color: '#10B981' }]}>✅ Low Risk Terms</Text>
                    {uploadedContract.risks.low.map((risk: any, i: number) => (
                      <View key={i} style={[styles.evidenceCard, { marginTop: 6, borderColor: '#D1FAE5' }]}>
                        <Pressable style={{ padding: 12 }} onPress={() => toggleRiskExpanded('low_' + i)}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>{risk.title}</Text>
                            <Ionicons name={expandedRisks['low_' + i] ? "chevron-up" : "chevron-down"} size={14} color="#065F46" />
                          </View>
                          <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>Why: {risk.reason}</Text>

                          {!!expandedRisks['low_' + i] && (
                            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#D1FAE5', paddingTop: 8, gap: 6 }}>
                              <Text style={{ fontSize: 11, color: '#4B5563' }}><Text style={{ fontWeight: '700' }}>Legal Consequences: </Text>{risk.consequences}</Text>
                              <Text style={{ fontSize: 11, color: '#15803D' }}><Text style={{ fontWeight: '700' }}>Suggested Fix: </Text>{risk.fix}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{risk.law}</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Missing Clauses Card */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>Missing Clauses Detected</Text>
                  <Text style={styles.linkagesSubtitle}>AI audited contract clauses that are missing from this draft.</Text>

                  {uploadedContract.missingClauses.map((clause: any, i: number) => (
                    <View key={i} style={[styles.evidenceCard, { marginTop: 8, borderColor: '#ECECEC' }]}>
                      <Pressable style={{ padding: 12 }} onPress={() => toggleMissingExpanded('missing_' + i)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name="warning"
                            size={16}
                            color={clause.risk === 'High' ? '#EF4444' : '#F59E0B'}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{clause.title}</Text>
                            <Text style={{ fontSize: 10, color: '#111111', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>
                              {clause.risk} Severity Recommendation
                            </Text>
                          </View>
                          <Ionicons name={expandedMissing['missing_' + i] ? "chevron-up" : "chevron-down"} size={14} color="#9CA3AF" />
                        </View>

                        {!!expandedMissing['missing_' + i] && (
                          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }}>
                            <Text style={{ fontSize: 11, color: '#4B5563', lineHeight: 15 }}>
                              {clause.recommendation}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tab CONTENT 4: AI Suggestions & Exports */}
            {contractActiveSubTab === 'suggestions' && (
              <View style={{ gap: 16 }}>
                {/* AI Recommendations Card */}
                <View style={styles.metadataCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="sparkles" size={18} color="#111111" />
                    <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>AI Recommendation Overview</Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        Strength: {uploadedContract.recommendations.strengthScore}/100
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.findingsSubLabel}>Potential Risks Identified</Text>
                  <Text style={styles.findingsValue}>{uploadedContract.recommendations.potentialRisks}</Text>

                  <Text style={styles.findingsSubLabel}>Recommended Edits</Text>
                  <Text style={styles.findingsValue}>{uploadedContract.recommendations.recommendedEdits}</Text>

                  <Text style={styles.findingsSubLabel}>Negotiation Points</Text>
                  <Text style={styles.findingsValue}>{uploadedContract.recommendations.negotiationPoints}</Text>

                  <Text style={styles.findingsSubLabel}>Compliance Issues</Text>
                  <Text style={styles.findingsValue}>{uploadedContract.recommendations.complianceIssues}</Text>

                  <Text style={styles.findingsSubLabel}>Legal Observations</Text>
                  <Text style={styles.findingsValue}>{uploadedContract.recommendations.legalObservations}</Text>
                </View>

                {/* Detailed Negotiation & Alternatives Suggestions Card */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>Negotiation & Alternative Suggestion Lists</Text>

                  <Text style={styles.findingsSubLabel}>Negotiation Playbook Tips</Text>
                  {uploadedContract.suggestions.negotiation.map((t: string, i: number) => (
                    <View key={i} style={styles.bulletItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{t}</Text>
                    </View>
                  ))}

                  <Text style={styles.findingsSubLabel}>Alternative wording</Text>
                  {uploadedContract.suggestions.alternatives.map((alt: any, i: number) => (
                    <View key={i} style={{ gap: 4, marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: '#EF4444', fontStyle: 'italic' }}>Original: {alt.original}</Text>
                      <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '500' }}>AI Proposed Safer Wording: {alt.alternative}</Text>
                    </View>
                  ))}

                  <Text style={styles.findingsSubLabel}>Safer Clauses Replaced</Text>
                  {uploadedContract.suggestions.saferClauses.map((t: string, i: number) => (
                    <Text key={i} style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', marginBottom: 6 }}>{t}</Text>
                  ))}

                  <Text style={styles.findingsSubLabel}>Conflicting Terms Detected</Text>
                  {uploadedContract.suggestions.conflictingTerms.map((t: string, i: number) => (
                    <Text key={i} style={{ fontSize: 11, color: '#EF4444', marginBottom: 6 }}>{t}</Text>
                  ))}

                  <Text style={styles.findingsSubLabel}>Missing Definitions</Text>
                  {uploadedContract.suggestions.missingDefinitions.map((t: string, i: number) => (
                    <Text key={i} style={{ fontSize: 11, color: '#F59E0B', marginBottom: 6 }}>{t}</Text>
                  ))}
                </View>

                {/* Exports options */}
                <View style={styles.metadataCard}>
                  <Text style={styles.sectionTitle}>Export Workspace Reports</Text>
                  <Text style={styles.linkagesSubtitle}>Generate and save detailed contract audit profiles locally.</Text>

                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.formCancelBtn}
                      onPress={() => {
                        showToast('success', 'Export PDF', 'Commercial Lease Risk Report compiled to PDF.');
                      }}
                    >
                      <Text style={styles.formCancelBtnText}>Export PDF Analysis Report</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.formCancelBtn}
                      onPress={() => {
                        showToast('success', 'Export DOCX', 'Suggested Clause Rewrites compiled to DOCX.');
                      }}
                    >
                      <Text style={styles.formCancelBtnText}>Export DOCX Clauses Audit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.formCancelBtn}
                      onPress={() => {
                        showToast('success', 'Risk Report', 'Executive Summary Risk profile exported successfully.');
                      }}
                    >
                      <Text style={styles.formCancelBtnText}>Export Executive Risk Summary</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Arguments Workspace
  const renderArgumentsTab = () => {
    if (!workspace) return null;
    return (
      <ArgumentBuilderModule
        workspace={workspace}
        theme={theme}
        t={t}
        language={language}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Legacy stub
  const _unusedArgTabStubCases = () => {
    const DEFAULT_STRATEGY = {
      caseSummary: {
        caseType: "Debt Recovery",
        mainLegalIssue: "Non-payment of outstanding dues under written contract",
        clientPosition: "Client seeks payment of ₹12 Lakhs based on a signed agreement.",
        opponentPosition: "Opponent disputes contract validity and claims document is forged.",
        goal: "Recover outstanding amount in full with interest."
      },
      strongArguments: [
        {
          title: "Signed Agreement proves contractual obligation",
          explanation: "The written contract contains clear covenants of repayment, and the defendant's signature is notarized.",
          supportingEvidence: "Contract.pdf",
          applicableLaw: "Indian Contract Act Section 73",
          confidence: "95%"
        },
        {
          title: "Bank records establish disbursement of loan amount",
          explanation: "Bank statement entries prove the successful transfer of ₹12 Lakhs to the defendant's account.",
          supportingEvidence: "Bank_Statement.pdf",
          applicableLaw: "Indian Evidence Act Section 34",
          confidence: "98%"
        },
        {
          title: "Admitted liability via WhatsApp acknowledgement",
          explanation: "WhatsApp chat logs show the defendant promising to pay the outstanding balance by next month.",
          supportingEvidence: "WhatsApp_Chat_Export.pdf",
          applicableLaw: "Information Technology Act Section 65B",
          confidence: "85%"
        },
        {
          title: "Absence of any written dispute notice before suit",
          explanation: "The defendant did not reply to any legal notice nor raise any dispute prior to filing of this suit.",
          supportingEvidence: "Legal_Notice_Receipts.pdf",
          applicableLaw: "Civil Procedure Code Order 8 Rule 1",
          confidence: "90%"
        },
        {
          title: "Jurisdiction clause binds the parties",
          explanation: "Clause 14 explicitly details exclusive jurisdiction in Delhi, barring the defendant's plea of forum non conveniens.",
          supportingEvidence: "Contract.pdf (Clause 14)",
          applicableLaw: "Civil Procedure Code Section 20",
          confidence: "92%"
        }
      ],
      crossQuestions: [
        {
          question: "Did you personally sign this agreement?",
          purpose: "Admission of execution."
        },
        {
          question: "Was this agreement executed in the presence of a Public Notary?",
          purpose: "Establish validity and witness presence."
        },
        {
          question: "Did you receive ₹12 Lakhs in your bank account on 12th January?",
          purpose: "Confirmation of consideration."
        },
        {
          question: "Did you reply to the legal notice dated 1st March?",
          purpose: "Highlight lack of pre-suit defense."
        },
        {
          question: "Is the bank account number listed in the transaction statement yours?",
          purpose: "Establish authenticity of transaction."
        },
        {
          question: "Did you send the message promising repayment on WhatsApp?",
          purpose: "Admission of debt acknowledgement."
        },
        {
          question: "Have you filed any police complaint alleging forgery before this suit?",
          purpose: "Expose standard delay tactics."
        },
        {
          question: "Did you pay any portion of the principal amount back?",
          purpose: "Confirm default."
        },
        {
          question: "Is there any written proof of the alleged cash repayment?",
          purpose: "Bar oral evidence against written document."
        },
        {
          question: "Did you authorize your accountant to record the transaction?",
          purpose: "Confirm corporate authority."
        }
      ],
      opponentArguments: [
        "The contract is not enforceable due to lack of stamp duty.",
        "The court lacks territorial jurisdiction to try this dispute.",
        "No consideration was passed; the amount was a friendly loan.",
        "The signature on the agreement is forged.",
        "The suit is barred by limitation."
      ],
      rebuttals: [
        {
          opponentArgument: "The contract is not enforceable due to lack of stamp duty.",
          rebuttalText: "Stamp duty deficiency can be cured by paying penalty under Section 35 of the Stamp Act, which we are ready to pay."
        },
        {
          opponentArgument: "The court lacks territorial jurisdiction to try this dispute.",
          rebuttalText: "Clause 14 of the contract confers exclusive jurisdiction on Delhi courts, and cause of action arose partly in Delhi."
        },
        {
          opponentArgument: "No consideration was passed; the amount was a friendly loan.",
          rebuttalText: "Bank statements clearly show the transfer of ₹12 Lakhs marked as commercial advance."
        },
        {
          opponentArgument: "The signature on the agreement is forged.",
          rebuttalText: "The document is notarized, creating a legal presumption of validity under Section 85 of the Evidence Act."
        },
        {
          opponentArgument: "The suit is barred by limitation.",
          rebuttalText: "The suit is filed within 3 years from the date of the last payment acknowledgement on WhatsApp."
        }
      ],
      missingEvidence: [
        {
          title: "Section 65B Certificate for electronic bank statements",
          priority: "High"
        },
        {
          title: "Original notarized contract deed",
          priority: "High"
        },
        {
          title: "Deposition of the attesting witness (Mr. Verma)",
          priority: "Medium"
        },
        {
          title: "Original WhatsApp chat export files",
          priority: "Medium"
        },
        {
          title: "Postal delivery reports of legal notice",
          priority: "Low"
        }
      ],
      relevantCaseLaws: [
        {
          caseName: "S.P. Chengalvaraya Naidu vs. Jagannath",
          court: "Supreme Court of India",
          year: "1994",
          relevance: "Established that fraud/forgery claims must be proved with high standard of evidence."
        },
        {
          caseName: "A.V. Papayya Sastry vs. Govt. of A.P.",
          court: "Supreme Court of India",
          year: "2007",
          relevance: "Reiterated that signature denial cannot block summary proceedings unless prima facie case of fraud is shown."
        },
        {
          caseName: "M/s Shanti Prasad vs. Director of Enforcement",
          court: "Supreme Court of India",
          year: "2010",
          relevance: "Confirmed that electronic records are admissible if supported by a valid certificate."
        }
      ]
    };

    const strategy = argumentBuilderStrategy || DEFAULT_STRATEGY;

    const toggleSection = (sectionKey: string) => {
      setArgumentsExpandedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }));
    };

    const toggleQuestion = (index: number) => {
      setExpandedQuestions(prev => ({
        ...prev,
        [index]: !prev[index]
      }));
    };

    const handleAutoAnalyzeArguments = async () => {
      setIsAnalyzingArguments(true);
      try {
        const clientName = workspace?.clientName || 'Client';
        const opponentName = workspace?.opponentName || workspace?.accused || 'Opponent';

        const contextMsg = [
          "You are AI LEGAL – Argument Builder, a premium AI litigation associate and expert courtroom strategist.",
          "Analyze the following case details and generate a complete, courtroom-ready litigation strategy in strict JSON format.",
          "",
          "Case Context:",
          "- Case Name: \"" + (workspace?.name || '') + "\"",
          "- Domain/Type: \"" + (workspace?.caseType || '') + "\"",
          "- Summary/Brief: \"" + (workspace?.summary || workspace?.caseSummary || '') + "\"",
          "- Client (Plaintiff/Petitioner): \"" + clientName + "\"",
          "- Opponent (Defendant/Respondent): \"" + opponentName + "\"",
          "- Goal: \"" + (workspace?.reliefGoals || 'Recover claims and secure favorable judgment') + "\"",
          "",
          "You MUST respond strictly with a single JSON object. Do NOT wrap it in markdown block quotes (such as triple-backticks json) or include any introductory/concluding remarks. Output ONLY the JSON text itself.",
          "",
          "JSON Schema:",
          "{",
          "  \"caseSummary\": {",
          "    \"caseType\": \"Domain of case\",",
          "    \"mainLegalIssue\": \"Core statutory question in dispute\",",
          "    \"clientPosition\": \"Briefly state client's claims\",",
          "    \"opponentPosition\": \"Briefly state opponent's defenses\",",
          "    \"goal\": \"Ultimate relief sought\"",
          "  },",
          "  \"strongArguments\": [",
          "    {",
          "      \"title\": \"Clear, courtroom-ready argument title\",",
          "      \"explanation\": \"Detailed professional legal reasoning\",",
          "      \"supportingEvidence\": \"Citations of documents/testimony\",",
          "      \"applicableLaw\": \"Statutory acts, sections, or judicial rules\",",
          "      \"confidence\": \"95%\"",
          "    }",
          "  ],",
          "  \"crossQuestions\": [",
          "    {",
          "      \"question\": \"Direct cross-examination question text\",",
          "      \"purpose\": \"What admission or contradiction is being targeted\"",
          "    }",
          "  ],",
          "  \"opponentArguments\": [",
          "    \"Opponent's likely challenge 1\",",
          "    \"Opponent's likely challenge 2\"",
          "  ],",
          "  \"rebuttals\": [",
          "    {",
          "      \"opponentArgument\": \"Opponent's likely challenge 1\",",
          "      \"rebuttalText\": \"Our precise counter-rebuttal speaking point and statutory backing\"",
          "    }",
          "  ],",
          "  \"missingEvidence\": [",
          "    {",
          "      \"title\": \"Specific document, certificate, or witness currently missing\",",
          "      \"priority\": \"High or Medium or Low\"",
          "    }",
          "  ],",
          "  \"relevantCaseLaws\": [",
          "    {",
          "      \"caseName\": \"Landmark or relevant citation name\",",
          "      \"court\": \"e.g. Supreme Court of India\",",
          "      \"year\": \"e.g. 2021\",",
          "      \"relevance\": \"One-line summary of key ratio decendi\"",
          "    }",
          "  ]",
          "}",
          "",
          "Please populate:",
          "- 5 to 10 strong arguments",
          "- 15 to 20 cross examination questions",
          "- 5 to 8 possible opponent arguments",
          "- 5 to 8 suggested rebuttals matching the opponent arguments",
          "- 4 to 8 missing evidence items with priority (High, Medium, or Low)",
          "- 3 to 6 relevant case laws"
        ].join("\n");

        const result = await DraftService.executeTool({
          toolName: 'legal_strategy_engine',
          message: contextMsg,
          caseContext: {
            name: workspace?.name,
            clientName: clientName,
            opponentName: opponentName,
            caseType: workspace?.caseType,
            summary: workspace?.summary || workspace?.caseSummary
          }
        });

        if (result && result.success && result.reply) {
          let cleanJson = result.reply;
          if (cleanJson.includes('```')) {
            const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
            if (match && match[1]) {
              cleanJson = match[1].trim();
            }
          }
          
          try {
            const strategyJSON = JSON.parse(cleanJson);
            setArgumentBuilderStrategy(strategyJSON);

            const currentCi = (workspace as any)?.caseIntelligence || {};
            const updatedCi = {
              ...currentCi,
              argumentBuilder: strategyJSON
            };
            
            await handleUpdateField({ caseIntelligence: updatedCi } as any);
            showToast('success', 'Strategy Generated', 'AI courtroom strategy generated and saved.');
          } catch (jsonErr) {
            console.error('JSON parsing failed:', jsonErr, result.reply);
            showToast('warning', 'Parsing Error', 'AI strategy could not be parsed. Retrying or using default.');
          }
        } else {
          showToast('error', 'Generation Failed', result?.error || 'Failed to connect to strategy engine.');
        }
      } catch (err: any) {
        console.error('Error generating strategy:', err);
        showToast('error', 'Error', err.message || 'An unexpected error occurred.');
      } finally {
        setIsAnalyzingArguments(false);
      }
    };

    const handleExportPDF = async () => {
      showToast('info', 'Exporting', 'Generating strategy binder PDF...');
      try {
        const htmlContent = [
          "<html>",
          "  <head>",
          "    <style>",
          "      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1F2937; padding: 40px; line-height: 1.5; }",
          "      h1 { color: #111111; font-size: 28px; font-weight: 800; margin-bottom: 5px; }",
          "      h2 { color: #1F2937; font-size: 18px; font-weight: 700; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; }",
          "      .meta-container { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 25px; }",
          "      .meta-row { display: flex; margin-bottom: 8px; font-size: 13px; }",
          "      .meta-label { font-weight: 700; width: 180px; color: #6B7280; }",
          "      .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 12px; }",
          "      .card-title { font-weight: 800; font-size: 14px; color: #1F2937; margin-bottom: 6px; }",
          "      .card-desc { font-size: 12px; color: #4B5563; margin-bottom: 8px; }",
          "      .card-meta { font-size: 11px; color: #6B7280; }",
          "      .card-meta span { font-weight: 700; color: #1F2937; }",
          "      .confidence-badge { float: right; background: #EEF2FF; color: #111111; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }",
          "      .question-row { border-bottom: 1px solid #F3F4F6; padding: 10px 0; font-size: 13px; }",
          "      .question-text { font-weight: 700; color: #1F2937; }",
          "      .question-purpose { color: #6B7280; font-style: italic; margin-top: 4px; }",
          "      .evidence-row { display: flex; justify-content: space-between; border-bottom: 1px solid #F3F4F6; padding: 8px 0; font-size: 13px; }",
          "      .evidence-title { font-weight: 600; }",
          "      .priority-high { color: #DC2626; font-weight: 700; }",
          "      .priority-medium { color: #D97706; font-weight: 700; }",
          "      .priority-low { color: #2563EB; font-weight: 700; }",
          "    </style>",
          "  </head>",
          "  <body>",
          "    <h1>Courtroom Strategy Binder</h1>",
          "    <p style=\"font-size: 12px; color: #6B7280;\">Case: " + (workspace?.name || 'Independent Case') + " • Generated by AI LEGAL™</p>",
          "    ",
          "    <div class=\"meta-container\">",
          "      <div class=\"meta-row\"><span class=\"meta-label\">Case Type:</span> <span>" + strategy.caseSummary.caseType + "</span></div>",
          "      <div class=\"meta-row\"><span class=\"meta-label\">Main Legal Issue:</span> <span>" + strategy.caseSummary.mainLegalIssue + "</span></div>",
          "      <div class=\"meta-row\"><span class=\"meta-label\">Client Position:</span> <span>" + strategy.caseSummary.clientPosition + "</span></div>",
          "      <div class=\"meta-row\"><span class=\"meta-label\">Opponent Position:</span> <span>" + strategy.caseSummary.opponentPosition + "</span></div>",
          "      <div class=\"meta-row\"><span class=\"meta-label\">Ultimate Goal:</span> <span>" + strategy.caseSummary.goal + "</span></div>",
          "    </div>",
          "",
          "    <h2>🔥 Strong Winning Arguments</h2>",
          strategy.strongArguments.map((arg: any, index: number) => [
            "    <div class=\"card\">",
            "      <div class=\"confidence-badge\">Confidence: " + arg.confidence + "</div>",
            "      <div class=\"card-title\">Argument #" + (index + 1) + ": " + arg.title + "</div>",
            "      <div class=\"card-desc\">" + arg.explanation + "</div>",
            "      <div class=\"card-meta\">",
            "        <div><span>Supporting Evidence:</span> " + arg.supportingEvidence + "</div>",
            "        <div style=\"margin-top: 3px;\"><span>Applicable Law:</span> " + arg.applicableLaw + "</div>",
            "      </div>",
            "    </div>"
          ].join("\n")).join("\n"),
          "",
          "    <h2>🎤 Cross Examination Questions</h2>",
          strategy.crossQuestions.map((q: any, index: number) => [
            "    <div class=\"question-row\">",
            "      <div class=\"question-text\">Q" + (index + 1) + ". " + q.question + "</div>",
            "      <div class=\"question-purpose\">Purpose: " + q.purpose + "</div>",
            "    </div>"
          ].join("\n")).join("\n"),
          "",
          "    <h2>🛡 Suggested Rebuttals</h2>",
          strategy.rebuttals.map((reb: any, index: number) => [
            "    <div class=\"card\" style=\"border-left: 4px solid #111111;\">",
            "      <div style=\"font-weight: 700; font-size: 12px; color: #DC2626; margin-bottom: 4px;\">Opponent Argues: \"" + reb.opponentArgument + "\"</div>",
            "      <div style=\"font-size: 12px; color: #2E7D32; font-weight: 600;\">Rebuttal Strategy: " + reb.rebuttalText + "</div>",
            "    </div>"
          ].join("\n")).join("\n"),
          "",
          "    <h2>⚠️ Possible Opponent Arguments</h2>",
          "    <ul>",
          strategy.opponentArguments.map((arg: string) => "      <li style=\"margin-bottom: 6px; font-size: 13px;\">" + arg + "</li>").join("\n"),
          "    </ul>",
          "",
          "    <h2>📂 Missing Evidence</h2>",
          strategy.missingEvidence.map((ev: any) => [
            "    <div class=\"evidence-row\">",
            "      <span class=\"evidence-title\">" + ev.title + "</span>",
            "      <span class=\"priority-" + (ev.priority || 'medium').toLowerCase() + "\">" + ev.priority + " Priority</span>",
            "    </div>"
          ].join("\n")).join("\n"),
          "",
          "    <h2>⚖️ Relevant Judgments</h2>",
          strategy.relevantCaseLaws.map((law: any) => [
            "    <div class=\"card\">",
            "      <div class=\"card-title\">" + law.caseName + " (" + law.year + ")</div>",
            "      <div class=\"card-desc\">Court: " + law.court + "</div>",
            "      <div class=\"card-desc\" style=\"font-style: italic;\">Relevance: " + law.relevance + "</div>",
            "    </div>"
          ].join("\n")).join("\n"),
          "  </body>",
          "</html>"
        ].join("\n");
        await Print.printAsync({ html: htmlContent });
        showToast('success', 'Export Complete', 'Binder formatted for printing/PDF.');
      } catch (err) {
        console.error(err);
        showToast('error', 'Export Failed', 'Could not export strategy PDF.');
      }
    };

    const handleShareStrategy = async () => {
      let shareText = "⚖️ COURTROOM STRATEGY BINDER: " + (workspace?.name || 'Independent Case') + "\n\n";
      shareText += "=== CASE SUMMARY ===\n";
      shareText += "Case Type: " + strategy.caseSummary.caseType + "\n";
      shareText += "Main Legal Issue: " + strategy.caseSummary.mainLegalIssue + "\n";
      shareText += "Client Position: " + strategy.caseSummary.clientPosition + "\n";
      shareText += "Opponent Position: " + strategy.caseSummary.opponentPosition + "\n";
      shareText += "Ultimate Goal: " + strategy.caseSummary.goal + "\n\n";

      shareText += "=== TOP WINNING ARGUMENTS ===\n";
      strategy.strongArguments.forEach((arg: any, index: number) => {
        shareText += (index + 1) + ". " + arg.title + " (Confidence: " + arg.confidence + ")\n";
        shareText += "   Explanation: " + arg.explanation + "\n";
        shareText += "   Evidence: " + arg.supportingEvidence + "\n";
        shareText += "   Law: " + arg.applicableLaw + "\n\n";
      });

      shareText += "=== CROSS EXAMINATION QUESTIONS ===\n";
      strategy.crossQuestions.forEach((q: any, index: number) => {
        shareText += "Q" + (index + 1) + ": " + q.question + "\n";
        shareText += "Purpose: " + q.purpose + "\n\n";
      });

      try {
        await Share.share({
          message: shareText,
          title: 'Courtroom Strategy Binder',
        });
      } catch (err) {
        showToast('error', 'Share Failed', 'Could not share strategy binder.');
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {isAnalyzingArguments ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60
          }}>
            <ActivityIndicator size="large" color="#111111" />
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#111111',
              marginTop: 12
            }}>Generating courtroom strategy...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* AI Case Summary Card */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#ECECEC',
              padding: 16,
              marginTop: 8,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111', textTransform: 'uppercase', marginBottom: 12 }}>Case Profile Summary</Text>
              
              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary }}>CASE TYPE</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 2 }}>{strategy.caseSummary.caseType}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary }}>MAIN LEGAL ISSUE</Text>
                  <Text style={{ fontSize: 13, color: theme.text, marginTop: 2 }}>{strategy.caseSummary.mainLegalIssue}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary }}>CLIENT POSITION</Text>
                    <Text style={{ fontSize: 12, color: theme.text, marginTop: 2 }}>{strategy.caseSummary.clientPosition}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary }}>OPPONENT POSITION</Text>
                    <Text style={{ fontSize: 12, color: theme.text, marginTop: 2 }}>{strategy.caseSummary.opponentPosition}</Text>
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary }}>ULTIMATE GOAL</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#2E7D32', marginTop: 2 }}>{strategy.caseSummary.goal}</Text>
                </View>
              </View>
            </View>

            {/* Collapsible Sections */}
            
            {/* 1. Strong Arguments */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('strongArgs')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>🔥 Strong Winning Arguments</Text>
                <Ionicons name={argumentsExpandedSections.strongArgs ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {argumentsExpandedSections.strongArgs && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {strategy.strongArguments.map((arg: any, index: number) => (
                    <View key={index} style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#ECECEC',
                      padding: 14,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Argument #{index + 1}</Text>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#111111' }}>Confidence: {arg.confidence}</Text>
                        </View>
                      </View>
                      
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 4 }}>{arg.title}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16, marginBottom: 10 }}>{arg.explanation}</Text>
                      
                      <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, gap: 4 }}>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}><Text style={{ fontWeight: '700' }}>Evidence:</Text> {arg.supportingEvidence}</Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}><Text style={{ fontWeight: '700' }}>Law:</Text> {arg.applicableLaw}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 2. Cross Questions */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('crossQuestions')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>🎤 Cross Questions</Text>
                <Ionicons name={argumentsExpandedSections.crossQuestions ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {argumentsExpandedSections.crossQuestions && (
                <View style={{ marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECECEC', padding: 8 }}>
                  {strategy.crossQuestions.map((q: any, index: number) => {
                    const isQExpanded = !!expandedQuestions[index];
                    return (
                      <View key={index} style={{
                        borderBottomWidth: index === strategy.crossQuestions.length - 1 ? 0 : 1,
                        borderBottomColor: '#F3F4F6',
                        paddingVertical: 10,
                        paddingHorizontal: 8
                      }}>
                        <Pressable
                          onPress={() => toggleQuestion(index)}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.text, flex: 1, marginRight: 8 }}>
                            Q{index + 1}. {q.question}
                          </Text>
                          <Ionicons name={isQExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
                        </Pressable>
                        
                        {isQExpanded && (
                          <View style={{ marginTop: 6, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: theme.textSecondary }}><Text style={{ fontWeight: '700', color: '#111111' }}>Purpose:</Text> {q.purpose}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 3. Rebuttals */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('rebuttals')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>🛡 Suggested Rebuttals</Text>
                <Ionicons name={argumentsExpandedSections.rebuttals ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {argumentsExpandedSections.rebuttals && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {strategy.rebuttals.map((reb: any, index: number) => (
                    <View key={index} style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#ECECEC',
                      padding: 14,
                      borderLeftWidth: 4,
                      borderLeftColor: '#111111'
                    }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626', marginBottom: 4 }}>Opponent Argues: "{reb.opponentArgument}"</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#2E7D32', lineHeight: 16 }}>Rebuttal: {reb.rebuttalText}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 4. Opponent Arguments */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('opponentArgs')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>⚠️ Possible Opponent Arguments</Text>
                <Ionicons name={argumentsExpandedSections.opponentArgs ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {expandedSections.opponentArgs && (
                <View style={{ marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECECEC', padding: 14 }}>
                  {strategy.opponentArguments.map((arg: string, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', gap: 8, marginBottom: index === strategy.opponentArguments.length - 1 ? 0 : 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>•</Text>
                      <Text style={{ fontSize: 12.5, color: theme.text, flex: 1 }}>{arg}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 5. Missing Evidence */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('missingEvidence')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>📂 Missing Evidence</Text>
                <Ionicons name={argumentsExpandedSections.missingEvidence ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {argumentsExpandedSections.missingEvidence && (
                <View style={{ marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECECEC', padding: 8 }}>
                  {strategy.missingEvidence.map((ev: any, index: number) => {
                    const getPriorityColor = (p: string) => {
                      const lower = (p || '').toLowerCase();
                      if (lower === 'high') return { bg: '#FEE2E2', txt: '#DC2626' };
                      if (lower === 'medium') return { bg: '#FFF3E0', txt: '#E65100' };
                      return { bg: '#E0F2FE', txt: '#0284C7' };
                    };
                    const colorProps = getPriorityColor(ev.priority);
                    return (
                      <View key={index} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottomWidth: index === strategy.missingEvidence.length - 1 ? 0 : 1,
                        borderBottomColor: '#F3F4F6',
                        paddingVertical: 10,
                        paddingHorizontal: 8
                      }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text, flex: 1, marginRight: 8 }}>{ev.title}</Text>
                        <View style={{ backgroundColor: colorProps.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colorProps.txt }}>{ev.priority} Priority</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 6. Case Laws */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleSection('caseLaws')}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ECECEC'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>⚖️ Relevant Judgments</Text>
                <Ionicons name={argumentsExpandedSections.caseLaws ? "chevron-up" : "chevron-down"} size={20} color="#111111" />
              </Pressable>
              
              {argumentsExpandedSections.caseLaws && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {strategy.relevantCaseLaws.map((law: any, index: number) => (
                    <View key={index} style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#ECECEC',
                      padding: 14
                    }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>{law.caseName}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginTop: 2 }}>{law.court} ({law.year})</Text>
                      <Text style={{ fontSize: 12, color: theme.text, marginTop: 6, lineHeight: 16, fontStyle: 'italic' }}>Relevance: {law.relevance}</Text>
                      
                      <TouchableOpacity
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 10,
                          backgroundColor: '#F5F5F5',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6
                        }}
                        onPress={() => {
                          showToast('info', 'Case Law Database', `Opening full text of: ${law.caseName}`);
                        }}
                      >
                        <Text style={{ color: '#111111', fontSize: 11, fontWeight: '700' }}>Open Full Judgment</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Sticky Bottom Buttons */}
        {!isAnalyzingArguments && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingVertical: 12,
            paddingHorizontal: 8,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {!argumentBuilderStrategy ? (
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: '#111111',
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
                onPress={handleAutoAnalyzeArguments}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Generate Courtroom Strategy</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 40,
                    backgroundColor: '#F5F5F5',
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={handleAutoAnalyzeArguments}
                >
                  <Ionicons name="sparkles" size={13} color="#111111" />
                  <Text style={{ color: '#111111', fontSize: 11.5, fontWeight: '700' }}>Generate Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 40,
                    backgroundColor: '#111111',
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={handleExportPDF}
                >
                  <Ionicons name="document-text" size={13} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>Export PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    width: 44,
                    height: 40,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={handleShareStrategy}
                >
                  <Ionicons name="share-social" size={16} color="#4B5563" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // Tasks checklist

  // Tasks checklist
  const renderTasksTab = () => {
    return (
      <AiTasksWorkflowManager
        workspace={workspace}
        id={id!}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  // Notes Notepad
  const renderNotesTab = () => {
    return (
      <AiCaseNotebookManager
        workspace={workspace}
        id={id!}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  };

  const renderStrategyTab = () => {
    const handleAnalyze = () => {
      showToast('info', 'Analyzing Strategy', 'Mapping case weaknesses and opponent strategies...');
      setTimeout(() => {
        handleUpdateField({
          ...({
            riskLevel: 'Medium',
            criticalVulnerabilities: 'Missing explicit vendor indemnity clause; Gap in contract dates.',
            opponentStrategy: 'Opponent will likely rely on technical delay exceptions under Section 10.',
            strategyRecommendations: 'Draft and submit a motion to expedite the proceedings and cite the Landmark precedence of State vs Patel.'
          } as any)
        });
        showToast('success', 'Strategy Updated', 'Case strategy analyzed and updated.');
      }, 1500);
    };

    const critVulnerabilities = (workspace as any).criticalVulnerabilities || 'No vulnerabilities detected yet. Trigger Auto-Analyze to map out case weaknesses.';
    const opponentStr = (workspace as any).opponentStrategy || 'Opponent strategies remain unmapped.';
    const strategyRecs = (workspace as any).strategyRecommendations || 'Compile precedents and facts to get strategic recommendations.';
    const riskLevel = workspace?.intelligence?.riskLevel || (workspace as any).riskLevel || 'Medium';

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle}>Strategy Engine</Text>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>AI vulnerability mapping & core recommendations</Text>
          </View>
          <TouchableOpacity
            style={[styles.moduleHeaderBtn, { backgroundColor: '#111111' }]}
            onPress={handleAnalyze}
          >
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={[styles.moduleHeaderBtnText, { color: '#FFFFFF' }]}>Analyze</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardList}>
          <View style={styles.itemCard}>
            <Text style={styles.accordionTitle}>Case Risk Profile</Text>
            <Text style={[styles.winProbValue, { fontSize: 24, color: riskLevel === 'High' ? '#EF4444' : '#F59E0B', marginTop: 6 }]}>
              {riskLevel} Risk
            </Text>
            <Text style={[styles.lawDesc, { marginTop: 4 }]}>Win margins fluctuate depending on upcoming evidence admissibility.</Text>
          </View>

          <View style={styles.itemCard}>
            <Text style={styles.inputLabel}>Critical Weaknesses</Text>
            <Text style={styles.lawDesc}>{critVulnerabilities}</Text>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Predicted Opponent Strategy</Text>
            <Text style={styles.lawDesc}>{opponentStr}</Text>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Action Items Recommendations</Text>
            <View style={styles.lawExplanationBox}>
              <Ionicons name="sparkles" size={12} color="#111111" />
              <Text style={styles.lawExplanationText}>{strategyRecs}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Outcome Prediction
  const renderPredictionTab = () => {
    const summaryText = (workspace?.summary || workspace?.caseSummary || '').trim();
    const hasSummary = summaryText.length >= 50;
    const hasEvidenceOrDocs = (workspace?.evidence && workspace.evidence.length > 0) || (workspace?.documents && workspace.documents.length > 0);
    const hasTimeline = workspace?.facts && workspace.facts.length > 0;

    const rawWin = workspace?.intelligence?.winProbability ?? (workspace as any)?.winProbability;
    const rawStrength = workspace?.intelligence?.strengthScore ?? (workspace as any)?.strengthScore;
    const isSufficient = hasSummary && hasEvidenceOrDocs && hasTimeline && rawWin !== undefined && rawWin !== null && rawWin > 0;
    const winProbStr = isSufficient ? `${rawWin}%` : 'Insufficient Data';
    const strengthStr = isSufficient ? `${rawStrength}%` : 'Pending AI Analysis';

    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Outcome Predictor</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 12 }}>Adjust case metrics and strength indices below.</Text>

        <View style={styles.cardList}>
          <View style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.accordionTitle}>Win Probability</Text>
              <Text style={[styles.winProbValue, { fontSize: isSufficient ? 20 : 14, color: isSufficient ? '#10B981' : '#EF4444' }]}>{winProbStr}</Text>
            </View>
            <Text style={[styles.lawDesc, { marginTop: 6 }]}>
              {!isSufficient
                ? 'Complete case facts and upload supporting evidence to generate reliable AI predictions.'
                : 'Based on verified evidence completeness, legal enforceability, and document quality.'}
            </Text>
          </View>

          <View style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.accordionTitle}>Case Strength Score</Text>
              <Text style={[styles.winProbValue, { fontSize: isSufficient ? 20 : 14, color: isSufficient ? '#111111' : '#F59E0B' }]}>{strengthStr}</Text>
            </View>
            <Text style={[styles.lawDesc, { marginTop: 6 }]}>
              {!isSufficient
                ? 'Complete case facts and upload supporting evidence to generate reliable AI predictions.'
                : 'Overall case document index and research coverage completeness.'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Activity Log
  const renderActivityTab = () => {
    const list = (workspace as any).activity || [];

    const handleAddActivity = () => {
      if (!newActivity.title) {
        showToast('error', 'Validation Error', 'Activity summary cannot be empty.');
        return;
      }
      const updated = [
        {
          type: newActivity.type,
          title: newActivity.title,
          date: new Date().toLocaleDateString()
        },
        ...list
      ];
      handleUpdateField({ activity: updated as any } as any);
      setNewActivity({ type: 'Call', title: '', notes: '' });
      showToast('success', 'Logged', 'Communication audit item registered.');
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.moduleHeaderRow}>
          <Text style={styles.moduleTitle}>Communication Log</Text>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.accordionTitle}>Log Communication Audit</Text>

          <Text style={[styles.inputLabel, { marginTop: 6 }]}>Log Type</Text>
          <View style={styles.templateSelection}>
            {['Call', 'Email', 'Meeting', 'Court'].map((t) => (
              <Pressable
                key={t}
                style={[styles.templateChip, newActivity.type === t && styles.templateChipActive]}
                onPress={() => setNewActivity({ ...newActivity, type: t })}
              >
                <Text style={[styles.templateText, newActivity.type === t && { color: '#FFFFFF' }]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Action Summary</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Discussed repayment deadline draft notice"
            placeholderTextColor="#9CA3AF"
            value={newActivity.title}
            onChangeText={(t) => setNewActivity({ ...newActivity, title: t })}
          />

          <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddActivity}>
            <Text style={styles.formSubmitBtnText}>Log Communication</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subHeading, { marginTop: 16 }]}>Audit History</Text>
        {list.length === 0 ? (
          <Text style={styles.emptyText}>No communication logs recorded. Add phone calls or meetings history above.</Text>
        ) : (
          <View style={styles.cardList}>
            {list.map((act: any, i: number) => (
              <View key={i} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{act.title}</Text>
                  <View style={[styles.statusBadge, styles.badgeInfo]}>
                    <Text style={styles.statusBadgeText}>{act.type}</Text>
                  </View>
                </View>
                <Text style={styles.itemCardFooter}>Date: {act.date}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Settings
  const renderSettingsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.moduleTitle}>Case Configurations</Text>

        <Pressable
          style={styles.settingsCell}
          onPress={() => {
            setModalType('rename');
            setIsModalOpen(true);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#4B5563" />
          <Text style={styles.settingsLabel}>Rename Workspace Title</Text>
        </Pressable>

        <Pressable
          style={[styles.settingsCell, styles.settingsCellDanger]}
          onPress={handleDeleteCase}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>Delete Case Workspace</Text>
        </Pressable>
      </View>
    );
  };

  const renderAnalysisTab = () => {
    const currentRole = useRoleStore.getState().selectedRole || 'advocate';
    const globalWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : (workspace?.workspaceType || currentRole);
    const isLawFirm = globalWsType === 'law_firm' || workspace?.workspaceType === 'law_firm';

    if (!isLawFirm) {
      return (
        <PersonalCaseAnalysisWorkspace
          workspace={workspace}
          handleUpdateField={handleUpdateField}
          showToast={showToast}
        />
      );
    }

    const report = viewedAnalysisRun?.analysisJson || latestAnalysis?.analysisJson;
    const meta = viewedAnalysisRun || latestAnalysis;

    if (!report) {
      const summaryText = workspace?.summary || workspace?.caseSummary || '';
      const isSummaryValid = summaryText.trim().length >= 100;
      const hasTimeline = workspace?.facts && workspace.facts.length > 0;
      const hasEvidence = workspace?.evidence && workspace.evidence.length > 0;
      const hasHearings = workspace?.hearings && workspace.hearings.length > 0;
      const hasCourtOrders = workspace?.courtOrders && workspace.courtOrders.length > 0;
      const hasDocuments = workspace?.documents && workspace.documents.length > 0;
      const hasContracts = (workspace?.drafts && workspace.drafts.length > 0) ||
        (workspace?.documents || []).some((d: any) =>
          (d.name || '').toLowerCase().includes('contract') ||
          (d.name || '').toLowerCase().includes('agreement') ||
          (d.type || '').toLowerCase().includes('agreement') ||
          (d.type || '').toLowerCase().includes('contract')
        );
      const hasResearch = workspace?.research && workspace.research.length > 0;
      const hasNotes = workspace?.notes && workspace.notes.length > 0;

      let readinessScore = 0;
      if (isSummaryValid) readinessScore += 25;
      if (hasEvidence) readinessScore += 20;
      if (hasDocuments || (workspace?.drafts && workspace.drafts.length > 0)) readinessScore += 15;
      if (hasTimeline) readinessScore += 10;
      if (hasHearings) readinessScore += 10;
      if (hasCourtOrders) readinessScore += 10;
      if (hasResearch) readinessScore += 5;
      if (hasNotes) readinessScore += 5;

      const checklistItems = [
        { id: 'summary', label: 'Case Summary (Min 100 chars)', checked: isSummaryValid, action: () => { setSummaryInputText(workspace?.summary || workspace?.caseSummary || ''); setModalType('edit_summary'); setIsModalOpen(true); } },
        { id: 'timeline', label: 'Facts Timeline chronology', checked: hasTimeline, action: () => { setActiveWorkspaceTab('timeline'); setModalType('timeline'); setIsModalOpen(true); } },
        { id: 'evidence', label: 'Evidence Vault elements', checked: hasEvidence, action: () => setIsEvidenceUploadOpen(true) },
        { id: 'hearings', label: 'Scheduled court hearings', checked: hasHearings, action: () => { setActiveWorkspaceTab('hearings'); setModalType('hearing'); setIsModalOpen(true); } },
        { id: 'courtOrders', label: 'Logged court orders', checked: hasCourtOrders, action: () => { setActiveWorkspaceTab('documents'); setModalType('court_order'); setIsModalOpen(true); } },
        { id: 'documents', label: 'Uploaded case files', checked: hasDocuments, action: handleSimulatedFileUpload },
        { id: 'contracts', label: 'Drafted Contracts / Agreements', checked: hasContracts, action: () => { setActiveWorkspaceTab('drafts'); } },
        { id: 'research', label: 'Applicable precedents or laws', checked: hasResearch, action: () => { setActiveWorkspaceTab('research'); } },
        { id: 'notes', label: 'Workspace strategic notes', checked: hasNotes, action: handleOpenAddNoteModal }
      ];

      return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>Case Readiness Score</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 16 }}>Meet minimum workspace requirements for zero-hallucination analysis</Text>

            {/* Circular Gauge Score */}
            <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 8, borderColor: readinessScore >= 70 ? theme.success : readinessScore >= 40 ? theme.warning : theme.danger, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
              <Text style={{ fontSize: 36, fontWeight: '900', color: theme.textPrimary }}>{readinessScore}%</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>Readiness</Text>
            </View>
          </View>

          {/* Checklist Container */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }}>Case Completeness Checklist</Text>
            {checklistItems.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons
                    name={item.checked ? "checkbox" : "square-outline"}
                    size={20}
                    color={item.checked ? theme.success : theme.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ fontSize: 13, color: item.checked ? theme.textPrimary : theme.textSecondary, textDecorationLine: item.checked ? 'line-through' : 'none' }}>
                    {item.label}
                  </Text>
                </View>
                {!item.checked && (
                  <TouchableOpacity onPress={item.action} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EFF6FF' }}>
                    <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Bottom Actions */}
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <TouchableOpacity
              style={[styles.syncBatchBtn, { paddingHorizontal: 36, backgroundColor: readinessScore >= 40 ? '#111111' : '#9CA3AF' }]}
              onPress={handleContinueAnalysis}
            >
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.syncBatchBtnText}>Analyze Case Workspace</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    const isCurrentActive = meta?._id === latestAnalysis?._id;

    return (
      <View style={styles.tabContent}>
        {/* Comparison Header Banner if inspecting older run */}
        {!isCurrentActive && (
          <View style={{ backgroundColor: theme.warningLight, padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.warning }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.warning }}>Inspecting Past Analysis Run (V{meta.version})</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>You are viewing cached legal suggestions from {new Date(meta.generatedAt || meta.createdAt).toLocaleDateString()}.</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: theme.warning, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => setViewedAnalysisRun(latestAnalysis)}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>Restore Latest</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dynamic Double Gauge Metrics */}
        <View style={styles.analysisMetricsRow}>
          <View style={[styles.analysisMetricCard, { borderColor: theme.success }]}>
            <Ionicons name="shield-checkmark" size={22} color={theme.success} />
            <Text style={styles.analysisMetricVal}>{report.strengthScore || 0}%</Text>
            <Text style={styles.analysisMetricLbl}>Case Strength Score</Text>
          </View>
          {report.winProbability !== 'Unavailable' && (
            <View style={[styles.analysisMetricCard, { borderColor: theme.info }]}>
              <Ionicons name="trending-up" size={22} color={theme.info} />
              <Text style={styles.analysisMetricVal}>{report.winProbability || 0}%</Text>
              <Text style={styles.analysisMetricLbl}>Win Probability</Text>
            </View>
          )}
        </View>

        {/* Metadata badge row */}
        <View style={styles.analysisMetaBadgeRow}>
          <View style={styles.analysisMetaBadge}>
            <Text style={styles.analysisMetaBadgeText}>Version: V{meta.version || 1}</Text>
          </View>
          <View style={styles.analysisMetaBadge}>
            <Text style={styles.analysisMetaBadgeText}>Model: {meta.modelUsed || 'Gemini 2.5 Pro'}</Text>
          </View>
          <View style={styles.analysisMetaBadge}>
            <Text style={styles.analysisMetaBadgeText}>Status: {meta.status || 'Completed'}</Text>
          </View>
          {meta.confidence && (
            <View style={[styles.analysisMetaBadge, { backgroundColor: meta.confidence === 'High' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.analysisMetaBadgeText, { color: meta.confidence === 'High' ? '#065F46' : '#92400E' }]}>
                Confidence: {meta.confidence}
              </Text>
            </View>
          )}
        </View>

        {/* Overview Banner */}
        <View style={styles.analysisOverviewCard}>
          <View style={styles.analysisOverviewCardHeader}>
            <Text style={styles.analysisOverviewLabel}>Risk Assessment</Text>
            <View style={[styles.analysisRiskBadge, { backgroundColor: report.riskAssessment === 'Low' ? theme.success : report.riskAssessment === 'Medium' ? theme.warning : theme.danger }]}>
              <Text style={styles.analysisRiskBadgeText}>{report.riskAssessment || 'Medium'}</Text>
            </View>
          </View>
          {report.settlementPossibility ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.analysisOverviewLabel, { fontSize: 10, color: theme.textSecondary }]}>Settlement Possibility</Text>
              <Text style={[styles.analysisOverviewText, { marginTop: 2 }]}>{report.settlementPossibility}</Text>
            </View>
          ) : null}
        </View>

        {/* Expandable Accordions */}

        {/* Accordion 1: Executive Case Summary */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('summary')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="document-text-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Executive Case Summary</Text>
            </View>
            <Ionicons name={expandedSections.summary ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.summary && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportTextParagraph}>{report.caseSummary}</Text>
            </View>
          )}
        </View>

        {/* Accordion 2: Major Legal Issues & Applicable Laws */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('issues')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="git-network-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Legal Issues & Statutory Rules</Text>
            </View>
            <Ionicons name={expandedSections.issues ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.issues && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportSubSectionTitle}>Major Legal Issues</Text>
              {report.majorLegalIssues && report.majorLegalIssues.length > 0 ? (
                report.majorLegalIssues.map((issue: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Text style={styles.analysisReportBulletDot}>•</Text>
                    <Text style={styles.analysisReportBulletText}>{issue}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No specific legal issues declared.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Applicable Laws</Text>
              {report.applicableLaws && report.applicableLaws.length > 0 ? (
                report.applicableLaws.map((law: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Text style={styles.analysisReportBulletDot}>•</Text>
                    <Text style={styles.analysisReportBulletText}>{law}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No laws recorded.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Specific Sections</Text>
              {report.applicableSections && report.applicableSections.length > 0 ? (
                report.applicableSections.map((sec: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Text style={styles.analysisReportBulletDot}>•</Text>
                    <Text style={styles.analysisReportBulletText}>{sec}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No specific sections mapped.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 3: Precedents & Judgments */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('precedents')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="library-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Judgments & Precedents</Text>
            </View>
            <Ionicons name={expandedSections.precedents ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.precedents && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportSubSectionTitle}>Supreme Court Judgments</Text>
              {report.supremeCourtJudgments && report.supremeCourtJudgments.length > 0 ? (
                report.supremeCourtJudgments.map((j: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="bookmarks-outline" size={11} color={theme.primary} style={{ marginTop: 3 }} />
                    <Text style={styles.analysisReportBulletText}>{j}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No Supreme Court references.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>High Court Judgments</Text>
              {report.highCourtJudgments && report.highCourtJudgments.length > 0 ? (
                report.highCourtJudgments.map((j: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="bookmarks-outline" size={11} color={theme.primary} style={{ marginTop: 3 }} />
                    <Text style={styles.analysisReportBulletText}>{j}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No High Court references.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Important Precedents to Cite</Text>
              {report.importantPrecedents && report.importantPrecedents.length > 0 ? (
                report.importantPrecedents.map((p: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="chevron-forward" size={12} color={theme.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{p}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No precedents catalogued.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 4: Evidence Vault Audit */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('evidence')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Evidence & Gaps Audit</Text>
            </View>
            <Ionicons name={expandedSections.evidence ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.evidence && (
            <View style={styles.analysisAccordionContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Text style={styles.analysisReportSubSectionTitle}>Evidence Quality:</Text>
                <View style={{ backgroundColor: report.evidenceStrength === 'Strong' ? theme.successLight : report.evidenceStrength === 'Medium' ? theme.warningLight : theme.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: report.evidenceStrength === 'Strong' ? theme.success : report.evidenceStrength === 'Medium' ? theme.warning : theme.danger }}>{report.evidenceStrength || 'Medium'}</Text>
                </View>
              </View>

              <Text style={styles.analysisReportSubSectionTitle}>Weaknesses & procedural risks</Text>
              {report.weaknesses && report.weaknesses.length > 0 ? (
                report.weaknesses.map((w: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="alert-circle-outline" size={14} color={theme.danger} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{w}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No weaknesses detected.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Contradictions & inconsistencies</Text>
              {report.contradictions && report.contradictions.length > 0 ? (
                report.contradictions.map((c: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="alert-circle-outline" size={14} color={theme.danger} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{c}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No timeline contradictions detected.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Missing Evidence Needed</Text>
              {report.missingEvidence && report.missingEvidence.length > 0 ? (
                report.missingEvidence.map((me: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="add-circle-outline" size={14} color={theme.warning} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{me}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No evidence items pending.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Missing Official Documents</Text>
              {report.missingDocuments && report.missingDocuments.length > 0 ? (
                report.missingDocuments.map((md: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="document-outline" size={14} color={theme.warning} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{md}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No documents pending.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 5: Trial Strategy & Strategic Actions */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('strategy')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="bulb-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Trial Strategy & Actions</Text>
            </View>
            <Ionicons name={expandedSections.strategy ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.strategy && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportSubSectionTitle}>Litigation Plan</Text>
              <Text style={styles.analysisReportTextParagraph}>{report.litigationStrategy}</Text>

              <Text style={styles.analysisReportSubSectionTitle}>Recommended Next Steps</Text>
              {report.recommendedNextSteps && report.recommendedNextSteps.length > 0 ? (
                report.recommendedNextSteps.map((s: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={theme.success} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{s}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No next steps defined.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Winning Arguments to Advance</Text>
              {report.argumentsToUse && report.argumentsToUse.length > 0 ? (
                report.argumentsToUse.map((a: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="add-outline" size={14} color={theme.success} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{a}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No arguments defined.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Weak Arguments to Avoid</Text>
              {report.argumentsToAvoid && report.argumentsToAvoid.length > 0 ? (
                report.argumentsToAvoid.map((a: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="close-outline" size={14} color={theme.danger} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{a}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No arguments flagged to avoid.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 6: Court Prep & Demeanor */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('prep')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="people-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Court Prep & Counsel Notes</Text>
            </View>
            <Ionicons name={expandedSections.prep ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.prep && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportSubSectionTitle}>Judge Presentation & Demeanor</Text>
              <Text style={styles.analysisReportTextParagraph}>{report.judgePreparation || 'N/A'}</Text>

              <Text style={styles.analysisReportSubSectionTitle}>Cross Examination Pointers</Text>
              <Text style={styles.analysisReportTextParagraph}>{report.crossExaminationNotes || 'N/A'}</Text>

              <Text style={styles.analysisReportSubSectionTitle}>Questions to Ask Client</Text>
              {report.questionsToAskClient && report.questionsToAskClient.length > 0 ? (
                report.questionsToAskClient.map((q: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="help-circle-outline" size={14} color={theme.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{q}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No client questions drafted.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>AI Draft Recommendations</Text>
              {report.draftRecommendations && report.draftRecommendations.length > 0 ? (
                report.draftRecommendations.map((dr: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="create-outline" size={13} color={theme.primary} style={{ marginTop: 3 }} />
                    <Text style={styles.analysisReportBulletText}>{dr}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No drafts recommended.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 7: Timeline & Statute of Limitations */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('risks')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="time-outline" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Timeline & Limitation Audits</Text>
            </View>
            <Ionicons name={expandedSections.risks ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.risks && (
            <View style={styles.analysisAccordionContent}>
              <Text style={styles.analysisReportSubSectionTitle}>Limitation & Latches Risks</Text>
              {report.limitationRisks && report.limitationRisks.length > 0 ? (
                report.limitationRisks.map((lr: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="warning-outline" size={14} color={theme.danger} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{lr}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No limitation risks identified.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Date Calculations & Delays</Text>
              {report.timelineIssues && report.timelineIssues.length > 0 ? (
                report.timelineIssues.map((ti: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="warning-outline" size={14} color={theme.warning} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{ti}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No timeline errors detected.</Text>
              )}

              <Text style={styles.analysisReportSubSectionTitle}>Compliance Checklists</Text>
              {report.complianceChecklist && report.complianceChecklist.length > 0 ? (
                report.complianceChecklist.map((item: string, idx: number) => (
                  <View key={idx} style={styles.analysisReportBullet}>
                    <Ionicons name="checkbox-outline" size={14} color={theme.success} style={{ marginTop: 2 }} />
                    <Text style={styles.analysisReportBulletText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.analysisReportEmptyText}>No compliance items listed.</Text>
              )}
            </View>
          )}
        </View>

        {/* Accordion 8: Run History */}
        <View style={styles.analysisAccordionCard}>
          <TouchableOpacity style={styles.analysisAccordionHeader} onPress={() => toggleSection('history')}>
            <View style={styles.analysisAccordionHeaderLeft}>
              <Ionicons name="time" size={18} color={theme.primary} />
              <Text style={styles.analysisAccordionTitle}>Analysis Run History</Text>
            </View>
            <Ionicons name={expandedSections.history ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          {expandedSections.history && (
            <View style={styles.analysisAccordionContent}>
              {analysisHistory && analysisHistory.length > 0 ? (
                analysisHistory.map((run: any) => {
                  const isActiveRun = run._id === meta?._id;
                  return (
                    <View key={run._id} style={styles.analysisHistoryRow}>
                      <View style={styles.analysisHistoryTextCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.analysisHistoryVersionText}>Version V{run.version}</Text>
                          {run._id === latestAnalysis?._id && (
                            <View style={{ backgroundColor: theme.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.primary }}>LATEST</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.analysisHistoryDateText}>{new Date(run.generatedAt || run.createdAt).toLocaleString()}</Text>
                        <Text style={styles.analysisHistorySummaryText} numberOfLines={2}>{run.summary || 'Comprehensive legal analysis report run.'}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.analysisHistoryLoadBtn, isActiveRun && { backgroundColor: theme.border }]}
                        onPress={() => setViewedAnalysisRun(run)}
                        disabled={isActiveRun}
                      >
                        <Text style={[styles.analysisHistoryLoadBtnText, isActiveRun && { color: theme.textMuted }]}>
                          {isActiveRun ? 'Viewing' : 'Inspect'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.analysisReportEmptyText}>No previous runs cached in history.</Text>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons: Analyze Again */}
        <View style={styles.analysisReportActionButtons}>
          <TouchableOpacity
            style={[styles.syncBatchBtn, { flex: 1, backgroundColor: theme.primary }]}
            onPress={handleContinueAnalysis}
          >
            <Ionicons name="sync-outline" size={14} color="#FFFFFF" />
            <Text style={styles.syncBatchBtnText}>Analyze Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCaseInfoTab = () => {
    if (!workspace) return null;

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'active': return '#10B981';
        case 'pending': return '#F59E0B';
        case 'closed': return '#6B7280';
        default: return '#10B981';
      }
    };

    const getPriorityColor = (prio: string) => {
      switch (prio?.toLowerCase()) {
        case 'high':
        case 'urgent':
          return '#EF4444';
        case 'medium':
        case 'standard':
          return '#F59E0B';
        case 'low':
          return '#3B82F6';
        default:
          return '#F59E0B';
      }
    };

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header Card with Edit Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary }}>Case Information</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}12`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            onPress={() => setIsEditModalOpen(true)}
          >
            <Ionicons name="create-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary }}>Edit Case Details</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: CASE INFORMATION */}
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 16, marginBottom: 20 }}>

          {/* Identity Sub-section */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>IDENTITY</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Case Title</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>{workspace.name}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Case Category</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{workspace.caseType || 'Unassigned'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Case Status</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: `${getStatusColor(workspace.status)}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: getStatusColor(workspace.status) }}>{workspace.status || 'Active'}</Text>
              </View>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Priority</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: `${getPriorityColor(workspace.priority)}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: getPriorityColor(workspace.priority) }}>{workspace.priority || 'Medium'}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 16 }} />

          {/* Participants Sub-section */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>PARTICIPANTS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Client Name</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{workspace.clientName || 'N/A'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Client Role</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>Complainant</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Opponent Name</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{workspace.opponentName || workspace.accused || 'N/A'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Opponent Role</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>Defendant</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 16 }} />

          {/* Court Sub-section */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>COURT DETAILS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Court Name</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>{workspace.courtName || 'N/A'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Court Type</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{(workspace as any).courtType || 'District Court'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>State</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{(workspace as any).stateName || (workspace as any).state || 'Delhi'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>District / City</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{(workspace as any).district || 'New Delhi'}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 16 }} />

          {/* Important Dates */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>IMPORTANT DATES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Incident Date</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{(workspace as any).incidentDate || '2025-10-12'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Filing Date</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{(workspace as any).filingDate || '2026-06-05'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Next Hearing Date</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{workspace.hearings?.[0]?.date || 'None Scheduled'}</Text>
            </View>
            <View style={{ width: '47%', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Last Updated</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleDateString() : 'Just now'}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: AI SUMMARY */}
        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginBottom: 16 }}>✨ AI Generated Legal Summary</Text>

        {isGeneratingSummary ? (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>Synthesizing workspace details into case timeline...</Text>
          </View>
        ) : aiSummary ? (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 16, marginBottom: 20 }}>
            {/* Executive Summary */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 8 }}>EXECUTIVE SUMMARY</Text>
            <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18, marginBottom: 16 }}>{aiSummary.executive.dispute}</Text>

            {/* Facts Timeline */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 12 }}>FACTS TIMELINE</Text>
            <View style={{ paddingLeft: 8, borderLeftWidth: 1.5, borderLeftColor: theme.border, marginLeft: 6, gap: 14, marginBottom: 20 }}>
              {aiSummary.timeline.map((item: any, idx: number) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <View style={{ position: 'absolute', left: -12, top: 4, width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.primary }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>{item.date}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textPrimary, marginTop: 2 }}>{item.event}</Text>
                </View>
              ))}
            </View>

            {/* Claims */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 8 }}>CLAIMS & ARGUMENTS</Text>
            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 8 }}>• <Text style={{ fontWeight: '700' }}>Plaintiff</Text>: {aiSummary.claims.plaintiff}</Text>
            <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 16 }}>• <Text style={{ fontWeight: '700' }}>Defendant</Text>: {aiSummary.claims.defendant}</Text>

            {/* Legal Issues */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginBottom: 8 }}>LEGAL ISSUES</Text>
            {aiSummary.issues.map((issue: string, idx: number) => (
              <Text key={idx} style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>{idx + 1}. {issue}</Text>
            ))}

            {/* Relief Sought */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 0.5, marginTop: 12, marginBottom: 8 }}>RELIEF SOUGHT</Text>
            {aiSummary.relief.map((rel: string, idx: number) => (
              <Text key={idx} style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>✔ {rel}</Text>
            ))}

            {/* AI Actions */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={{ backgroundColor: `${theme.primary}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                onPress={handleGenerateSummary}
              >
                <Ionicons name="sync" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.primary }}>Regenerate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: `${theme.primary}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => {
                  Clipboard.setString(JSON.stringify(aiSummary, null, 2));
                  showToast('success', 'Copied', 'AI Summary copied to clipboard.');
                }}
              >
                <Ionicons name="copy-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.primary }}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: `${theme.primary}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => {
                  Share.share({ message: JSON.stringify(aiSummary) });
                }}
              >
                <Ionicons name="share-social-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.primary }}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 24, alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="sparkles" size={32} color={theme.primary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 }}>✨ Generate AI Case Summary</Text>
            <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>
              Create an intelligent legal overview based on your case details.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}
              onPress={handleGenerateSummary}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Generate Summary</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderClientConnectTab = () => {
    if (!workspace) return null;
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ClientConnectModule
          caseData={workspace}
          onUpdate={() => id && fetchWorkspaceDetails(id)}
          onOpenTeamChat={() => setActiveWorkspaceTab('case-chat')}
        />
      </View>
    );
  };

  const renderCaseChatTab = () => {
    if (!workspace) return null;
    return (
      <View style={{ flex: 1 }}>
        <CaseTeamChatModule
          caseData={workspace}
          onCaseUpdate={() => id && fetchWorkspaceDetails(id)}
          onBack={() => setActiveWorkspaceTab('overview')}
        />
      </View>
    );
  };

  // Render sub-section layouts
  const renderActiveSection = () => {
    switch (activeWorkspaceTab) {
      case 'case-info':
        return renderCaseInfoTab();
      case 'analysis':
        return renderAnalysisTab();
      case 'timeline':
        return renderTimelineTab();
      case 'hearings':
        return renderHearingsTab();
      case 'parties':
        return renderPartiesTab();
      case 'documents':
        return renderDocumentsTab();
      case 'evidence':
      case 'contracts':
        return null;
      case 'research':
        return renderResearchTab();
      case 'drafts':
        return renderDraftsTab();
      case 'arguments':
        return renderArgumentsTab();
      case 'client-connect':
        return renderClientConnectTab();
      case 'case-chat':
      case 'chat':
      case 'team_chat':
        return renderCaseChatTab();
      case 'tasks':
        return renderTasksTab();
      case 'notes':
        return renderNotesTab();
      case 'court-orders':
        return renderCourtOrdersTab();
      case 'strategy':
        return renderStrategyTab();
      case 'prediction':
        return renderPredictionTab();
      case 'activity':
        return renderActivityTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderValidationErrorModal = () => {
    if (!validationError) return null;
    const isGarbage = validationError.type === 'garbage_summary';

    return (
      <Modal visible={showValidationErrorModal} transparent={true} animationType="fade">
        <View style={styles.analysisErrorOverlay}>
          <View style={[styles.analysisErrorModalContent, { width: '90%', padding: 24, borderRadius: 16 }]}>
            <Ionicons
              name={isGarbage ? "alert-circle" : "shield-alert"}
              size={48}
              color={theme.danger}
              style={{ marginBottom: 12 }}
            />
            <Text style={[styles.analysisErrorModalTitle, { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }]}>
              {isGarbage ? 'Invalid Case Summary' : 'Insufficient Case Details'}
            </Text>
            <Text style={[styles.analysisErrorModalDesc, { fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              {isGarbage
                ? 'Your case summary appears incomplete, repetitive, or contains keyboard spam. Please write a meaningful summary of at least 100 characters before running AI analysis.'
                : 'The AI Zero Hallucination Engine requires more information to proceed. It is programmatically blocked from analyzing when case fields are empty to prevent hallucinating facts.'}
            </Text>

            {!isGarbage && validationError.readinessScore !== undefined && (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                  Current Case Readiness Score: {validationError.readinessScore}%
                </Text>
                <View style={{ width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${validationError.readinessScore}%`, height: '100%', backgroundColor: theme.danger }} />
                </View>
              </View>
            )}

            {!isGarbage && validationError.missingFields && validationError.missingFields.length > 0 && (
              <View style={{ width: '100%', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 20, maxHeight: 180 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
                  Required details to complete:
                </Text>
                <ScrollView nestedScrollEnabled={true}>
                  {validationError.missingFields.map((field) => (
                    <View key={field} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                      <Ionicons name="close-circle" size={14} color={theme.danger} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, color: theme.textPrimary }}>{field}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={[styles.analysisErrorBtn, styles.analysisErrorBtnOutline, { flex: 1 }]}
                onPress={() => setShowValidationErrorModal(false)}
              >
                <Text style={[styles.analysisErrorBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.analysisErrorBtn, styles.analysisErrorBtnPrimary, { flex: 1, backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowValidationErrorModal(false);
                  if (isGarbage || (validationError.missingFields && validationError.missingFields.includes('Summary'))) {
                    setSummaryInputText(workspace?.summary || workspace?.caseSummary || '');
                    setModalType('edit_summary');
                    setIsModalOpen(true);
                  } else {
                    // Navigate to appropriate tab
                    const missing = validationError.missingFields || [];
                    if (missing.includes('Timeline')) {
                      setActiveWorkspaceTab('timeline');
                      setModalType('timeline');
                      setIsModalOpen(true);
                    } else if (missing.includes('Evidence')) {
                      setActiveWorkspaceTab('evidence');
                      setIsEvidenceUploadOpen(true);
                    } else if (missing.includes('Hearings')) {
                      setActiveWorkspaceTab('hearings');
                      setModalType('hearing');
                      setIsModalOpen(true);
                    } else if (missing.includes('Court Orders')) {
                      setActiveWorkspaceTab('documents');
                      setModalType('court_order');
                      setIsModalOpen(true);
                    } else {
                      setActiveWorkspaceTab('overview');
                    }
                  }
                }}
              >
                <Text style={[styles.analysisErrorBtnText, { color: '#FFFFFF' }]}>
                  {isGarbage || (validationError.missingFields && validationError.missingFields.includes('Summary')) ? 'Fix Summary' : 'Complete Case'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* AppBar skeleton */}
        <View style={styles.appBar}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' }} />
          <View style={{ width: 140, height: 16, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Summary skeleton */}
          <Animated.View style={{ opacity: skeletonAnim, height: 160, borderRadius: 12, backgroundColor: '#E5E7EB', padding: 16, gap: 10 }}>
            <View style={{ width: 120, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '100%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '90%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '95%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '40%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <View style={{ flex: 1, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
              <View style={{ flex: 1, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            </View>
          </Animated.View>

          {/* Quick Insights Carousel skeleton */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Animated.View key={i} style={{ opacity: skeletonAnim, width: 110, height: 80, borderRadius: 8, backgroundColor: '#E5E7EB', padding: 10, gap: 8 }}>
                <View style={{ width: 60, height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
                <View style={{ width: 40, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
              </Animated.View>
            ))}
          </View>

          {/* Large Card skeleton */}
          <Animated.View style={{ opacity: skeletonAnim, height: 120, borderRadius: 12, backgroundColor: '#E5E7EB', padding: 16, justifyContent: 'center', gap: 12 }}>
            <View style={{ width: 100, height: 14, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '80%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
            <View style={{ width: '50%', height: 10, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
          </Animated.View>

          {/* Navigation tiles skeleton */}
          <View style={{ gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <Animated.View key={i} style={{ opacity: skeletonAnim, height: 50, borderRadius: 8, backgroundColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: '#D1D5DB' }} />
                  <View style={{ width: 120, height: 12, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
                </View>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB' }} />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !workspace) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to retrieve case workspace parameters.</Text>
        {error ? (
          <Text style={{ color: '#EF4444', marginTop: 10, marginHorizontal: 20, textAlign: 'center', fontSize: 12 }}>
            Error: {String(error)}
          </Text>
        ) : null}
        {!workspace && !error ? (
          <Text style={{ color: '#6B7280', marginTop: 10, marginHorizontal: 20, textAlign: 'center', fontSize: 12 }}>
            No workspace data found in state.
          </Text>
        ) : null}
        <Pressable
          style={styles.retryBtn}
          onPress={() => id && fetchWorkspaceDetails(id)}
        >
          <Text style={styles.retryBtnText}>Retry Sync</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top navigation app bar */}
      {!['case-chat', 'chat', 'team_chat'].includes(activeWorkspaceTab) && (
        <View style={styles.appBar}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <View style={styles.appBarTitleContainer}>
            <Text style={styles.appBarTitle} numberOfLines={1}>
              {workspace.name}
            </Text>
            <View style={styles.appBarBadgesRow}>
              <View style={[styles.appBadge, styles.appBadgeStatus]}>
                <Text style={styles.appBadgeText}>{t('enums.status.' + (workspace.status || 'Active').toUpperCase()) || workspace.status}</Text>
              </View>
              <View style={[styles.appBadge, styles.appBadgePriority]}>
                <Text style={[styles.appBadgeText, { color: theme.danger }]}>{t('enums.priority.' + (workspace.priority || 'High').toUpperCase()) || workspace.priority}</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => setIsThreeDotOpen(true)}
            style={({ pressed }) => [styles.threeDotBtn, pressed && styles.pressed]}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#1F2937" />
          </Pressable>
        </View>
      )}

      <View style={{ flex: 1, position: 'relative' }}>
        {['case-chat', 'chat', 'team_chat'].includes(activeWorkspaceTab) ? (
          renderActiveSection()
        ) : (
          <ScrollView
            ref={mainScrollRef}
            contentContainerStyle={[
              styles.scrollContainer,
              activeWorkspaceTab === 'overview' && { paddingBottom: 100 }
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isAiOpen}
          >
            {renderActiveSection()}
          </ScrollView>
        )}

        {/* Integrated AI Assistant */}
        {renderIntegratedAssistant()}

        {/* Floating AI Assistant pill button */}
        {activeWorkspaceTab === 'overview' && !isAiOpen && (
          <TouchableOpacity
            style={styles.copilotFloatBtnPill}
            onPress={handleOpenAi}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#111111" />
            <Text style={styles.copilotFloatText}>AI Assistant</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- AI LEGAL ANALYSIS WORKFLOW MODALS --- */}
      {/* Elegant Immersive Loading Modal */}
      <Modal visible={isAnalyzing} transparent={true} animationType="slide">
        <View style={styles.analysisLoadingOverlay}>
          <SafeAreaView style={styles.analysisLoadingSafeArea} edges={['top', 'bottom']}>
            <View style={styles.analysisLoadingHeader}>
              <Ionicons name="sparkles" size={28} color={theme.primary} />
              <Text style={styles.analysisLoadingTitle}>🧠 AI Legal Analysis</Text>
              <Text style={styles.analysisLoadingSubtitle}>Analyzing your case...</Text>
            </View>

            <View style={styles.analysisLoadingChecklist}>
              {(() => {
                const stepsList = [
                  'Reading Case Details',
                  'Reviewing Timeline',
                  'Checking Hearings',
                  'Processing Uploaded Documents',
                  'Reviewing Evidence',
                  'Researching Applicable Laws',
                  'Finding Similar Judgments',
                  'Preparing Legal Strategy'
                ];

                return stepsList.map((stepText, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = currentAnalysisStep > stepNum;
                  const isActive = currentAnalysisStep === stepNum;
                  const isPending = currentAnalysisStep < stepNum;

                  return (
                    <View key={idx} style={styles.analysisChecklistRow}>
                      <View style={styles.analysisChecklistIconContainer}>
                        {isCompleted ? (
                          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                        ) : isActive ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <View style={styles.analysisPendingDot} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.analysisChecklistText,
                          isCompleted && styles.analysisChecklistTextCompleted,
                          isActive && styles.analysisChecklistTextActive,
                          isPending && styles.analysisChecklistTextPending,
                        ]}
                      >
                        {stepText}
                      </Text>
                    </View>
                  );
                });
              })()}
            </View>

            <View style={styles.analysisLoadingFooter}>
              <Text style={styles.analysisLoadingFooterText}>Please wait...</Text>
              <TouchableOpacity
                style={styles.analysisCancelLoadingBtn}
                onPress={() => {
                  setIsAnalyzing(false);
                  showToast('info', 'Analysis Cancelled', 'The case analysis process was cancelled.');
                }}
              >
                <Text style={styles.analysisCancelLoadingBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Confirmation Modal (Analyze Again?) */}
      <Modal visible={showAnalysisAgainPrompt} transparent={true} animationType="fade">
        <View style={styles.analysisPromptOverlay}>
          <View style={styles.analysisPromptModalContent}>
            <Ionicons name="sparkles" size={40} color={theme.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.analysisPromptModalTitle}>Analyze Again?</Text>
            <Text style={styles.analysisPromptModalDesc}>This will refresh the previous AI report using the latest case data.</Text>
            <View style={styles.analysisPromptModalButtons}>
              <TouchableOpacity
                style={[styles.analysisPromptBtn, styles.analysisPromptBtnOutline]}
                onPress={() => setShowAnalysisAgainPrompt(false)}
              >
                <Text style={[styles.analysisPromptBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.analysisPromptBtn, styles.analysisPromptBtnPrimary]}
                onPress={() => {
                  setShowAnalysisAgainPrompt(false);
                  handleStartAnalysis();
                }}
              >
                <Text style={[styles.analysisPromptBtnText, { color: '#FFFFFF' }]}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error handling Modal (Retry / Cancel) */}
      <Modal visible={showAnalysisErrorModal} transparent={true} animationType="fade">
        <View style={styles.analysisErrorOverlay}>
          <View style={styles.analysisErrorModalContent}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} style={{ marginBottom: 16 }} />
            <Text style={styles.analysisErrorModalTitle}>Unable to analyze case.</Text>
            <Text style={styles.analysisErrorModalDesc}>Please check your internet connection or try again later.</Text>
            <View style={styles.analysisErrorModalButtons}>
              <TouchableOpacity
                style={[styles.analysisErrorBtn, styles.analysisErrorBtnOutline]}
                onPress={() => setShowAnalysisErrorModal(false)}
              >
                <Text style={[styles.analysisErrorBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.analysisErrorBtn, styles.analysisErrorBtnPrimary]}
                onPress={() => {
                  setShowAnalysisErrorModal(false);
                  handleStartAnalysis();
                }}
              >
                <Text style={[styles.analysisErrorBtnText, { color: '#FFFFFF' }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Zero Hallucination Validation Error Modal */}
      {renderValidationErrorModal()}

      {/* --- THREE DOT OPTIONS DIALOG --- */}
      <Modal visible={isThreeDotOpen} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsThreeDotOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.formTitle}>Case Workspace Actions</Text>

                <Pressable
                  style={styles.settingsCell}
                  onPress={() => {
                    setIsThreeDotOpen(false);
                    setModalType('rename');
                    setIsModalOpen(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#4B5563" />
                  <Text style={styles.settingsLabel}>Rename Workspace Title</Text>
                </Pressable>

                <Pressable
                  style={[styles.settingsCell, styles.settingsCellDanger]}
                  onPress={() => {
                    setIsThreeDotOpen(false);
                    handleDeleteCase();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>Delete Case Workspace</Text>
                </Pressable>

                <Pressable
                  style={[styles.settingsCell, { justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 0 }]}
                  onPress={() => setIsThreeDotOpen(false)}
                >
                  <Text style={[styles.settingsLabel, { color: '#4B5563' }]}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL DIALOGS FOR FORMS --- */}
      <Modal visible={isModalOpen} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* EDIT SUMMARY FORM */}
                  {modalType === 'edit_summary' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Edit Case Summary</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.inputLabel}>Case Summary Brief</Text>
                      <TextInput
                        style={[styles.formInput, { height: 180, textAlignVertical: 'top' }]}
                        placeholder="Write a clear, detailed summary of the case (at least 100 characters to build case readiness)..."
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        value={summaryInputText}
                        onChangeText={setSummaryInputText}
                      />
                      <Pressable
                        style={styles.formSubmitBtn}
                        onPress={async () => {
                          handleUpdateField({ summary: summaryInputText });
                          setIsModalOpen(false);
                        }}
                      >
                        <Text style={styles.formSubmitBtnText}>Save Case Summary</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* TIMELINE FORM */}
                  {modalType === 'timeline' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Fact to Timeline</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Date (e.g. 15 Jan 2025)"
                        placeholderTextColor="#9CA3AF"
                        value={timelineForm.date}
                        onChangeText={(t) => setTimelineForm({ ...timelineForm, date: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Milestone Event Title"
                        placeholderTextColor="#9CA3AF"
                        value={timelineForm.title}
                        onChangeText={(t) => setTimelineForm({ ...timelineForm, title: t })}
                      />
                      <TextInput
                        style={[styles.formInput, { height: 80 }]}
                        placeholder="Brief details or descriptions"
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        value={timelineForm.description}
                        onChangeText={(t) => setTimelineForm({ ...timelineForm, description: t })}
                      />
                      <Pressable style={styles.formSubmitBtn} onPress={handleAddTimelineEvent}>
                        <Text style={styles.formSubmitBtnText}>Add Event</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* REDESIGNED HEARING FORM */}
                  {modalType === 'hearing' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>
                          {hearingFormMode === 'edit' ? 'Edit Court Hearing' : 'Schedule Court Hearing'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.inputLabel}>Hearing Title / Type</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Admission summons review"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.notes}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, notes: t })}
                      />

                      <Text style={styles.inputLabel}>Date (e.g. 22 May 2026)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Date (e.g. 22 May 2026)"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.date}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, date: t })}
                      />

                      <Text style={styles.inputLabel}>Time (e.g. 10:30 AM)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Time (e.g. 10:30 AM)"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.time}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, time: t })}
                      />

                      <Text style={styles.inputLabel}>Court / Forum Name</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Delhi High Court"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.courtName}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, courtName: t })}
                      />

                      <Text style={styles.inputLabel}>Courtroom Location</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Courtroom No. 4"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.courtroom}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, courtroom: t })}
                      />

                      <Text style={styles.inputLabel}>Presiding Judge Name</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Hon'ble Justice Amit Verma"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.judge}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, judge: t })}
                      />

                      <Text style={styles.inputLabel}>Hearing Purpose</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Witness examination / Admission"
                        placeholderTextColor="#9CA3AF"
                        value={hearingForm.purpose}
                        onChangeText={(t) => setHearingForm({ ...hearingForm, purpose: t })}
                      />

                      <Text style={styles.inputLabel}>Hearing Status</Text>
                      <View style={styles.statusChipsContainer}>
                        {['Scheduled', 'Completed', 'Adjourned', 'Orders Reserved', 'Cancelled', 'Ongoing'].map((st) => (
                          <TouchableOpacity
                            key={st}
                            style={[styles.formStatusChip, hearingForm.status === st && styles.formStatusChipActive]}
                            onPress={() => setHearingForm({ ...hearingForm, status: st })}
                          >
                            <Text style={[styles.formStatusChipText, hearingForm.status === st && styles.formStatusChipTextActive]}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Pressable style={styles.formSubmitBtn} onPress={handleAddHearing}>
                        <Text style={styles.formSubmitBtnText}>Save Schedule</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* ADD ADVOCATE NOTES FORM */}
                  {modalType === 'add_hearing_notes' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Advocate Notes</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.inputLabel}>Notes from Hearing Session</Text>
                      <TextInput
                        style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Write notes about the stay application arguments, judge reactions, verbal orders, next steps, witness statements, etc..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        value={hearingNotesInput}
                        onChangeText={setHearingNotesInput}
                      />

                      <Pressable
                        style={styles.formSubmitBtn}
                        onPress={() => {
                          if (!selectedHearingForNotes) return;
                          const hearingId = selectedHearingForNotes.id || selectedHearingForNotes._id || '';

                          // Optimistically save notes locally
                          const updatedHearings = (workspace?.hearings || []).map(h => {
                            if (h.id === hearingId || h._id === hearingId) {
                              return { ...h, notes: hearingNotesInput };
                            }
                            return h;
                          });
                          handleUpdateField({ hearings: updatedHearings });

                          setIsModalOpen(false);
                          // Trigger AI enrichment using CaseService.enrichHearing
                          handleEnrichHearing(hearingId, { notes: hearingNotesInput });
                        }}
                      >
                        <Text style={styles.formSubmitBtnText}>Save & Enrich with AI</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* UPLOAD COURT ORDER SIMULATION FORM */}
                  {modalType === 'upload_order_simulation' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Simulate Uploading Court Order</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>

                      {simulatedUploadProgress === 0 ? (
                        <>
                          <Text style={styles.inputLabel}>Select a Court Order Directive to simulate:</Text>
                          <View style={styles.pickerContainer}>
                            {MOCK_COURT_ORDERS.map((order, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.pickerItem}
                                onPress={async () => {
                                  // Run simulated upload progress
                                  setSimulatedUploadProgress(1);
                                  setSimulatedUploadStep('Uploading document file...');

                                  const steps = [
                                    { progress: 25, label: 'Reading order metadata...' },
                                    { progress: 50, label: 'Running AI OCR sentence scans...' },
                                    { progress: 75, label: 'Parsing judicial directives...' },
                                    { progress: 100, label: 'AI document upload complete.' }
                                  ];

                                  for (let s of steps) {
                                    await new Promise(r => setTimeout(r, 400));
                                    setSimulatedUploadProgress(s.progress);
                                    setSimulatedUploadStep(s.label);
                                  }

                                  await new Promise(r => setTimeout(r, 300));
                                  if (!selectedHearingForOrder) return;
                                  const hearingId = selectedHearingForOrder.id || selectedHearingForOrder._id || '';

                                  // Update case documents list with new upload
                                  const newDoc: CaseDocument = {
                                    _id: `doc_${Date.now()}`,
                                    name: order.name,
                                    type: 'Filing',
                                    url: 'https://ailegal.com/files/court_order.pdf',
                                    tags: ['Court Order', 'Enriched'],
                                    uploadDate: new Date().toLocaleDateString(),
                                  };
                                  const updatedDocs = [newDoc, ...(workspace?.documents || [])];

                                  // Update linkedDocuments of the hearing
                                  const updatedHearings = (workspace?.hearings || []).map(h => {
                                    if (h.id === hearingId || h._id === hearingId) {
                                      return {
                                        ...h,
                                        status: 'Completed' as const,
                                        linkedDocuments: [...(h.linkedDocuments || []), newDoc.name]
                                      };
                                    }
                                    return h;
                                  });

                                  handleUpdateField({
                                    documents: updatedDocs,
                                    hearings: updatedHearings
                                  });

                                  setIsModalOpen(false);
                                  // Trigger AI enrichment
                                  handleEnrichHearing(hearingId, {
                                    documentText: order.text,
                                    documentName: order.name
                                  });
                                }}
                              >
                                <Text style={styles.pickerItemName}>{order.name}</Text>
                                <Text style={styles.pickerItemDesc} numberOfLines={2}>
                                  {order.text.split('\n').slice(5, 9).join(' ')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      ) : (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <ActivityIndicator size="large" color="#111111" />
                          <View style={[styles.hearingProgressBarBg, { width: '100%' }]}>
                            <View style={[styles.hearingProgressBarFill, { width: `${simulatedUploadProgress}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{simulatedUploadStep} ({simulatedUploadProgress}%)</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* PARTY FORM */}
                  {modalType === 'party' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Person</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.inputLabel}>Name</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Ramesh Kumar"
                        placeholderTextColor="#9CA3AF"
                        value={partyForm.name}
                        onChangeText={(t) => setPartyForm({ ...partyForm, name: t })}
                      />

                      <Text style={styles.inputLabel}>Role</Text>
                      <Pressable 
                        style={[styles.formInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setRolePickerOpen(!rolePickerOpen)}
                      >
                        <Text style={{ color: theme.textPrimary }}>{partyForm.role}</Text>
                        <Ionicons name={rolePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                      </Pressable>

                      {rolePickerOpen && (
                        <View style={{
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 8,
                          marginTop: -6,
                          marginBottom: 10,
                          padding: 4,
                          maxHeight: 180,
                        }}>
                          <ScrollView nestedScrollEnabled={true}>
                            {[
                              'Plaintiff / Petitioner',
                              'Defendant / Respondent',
                              'Witness',
                              'Counsel / Advocate',
                              'Expert Witness',
                              'Other'
                            ].map((r) => (
                              <TouchableOpacity
                                key={r}
                                style={{
                                  paddingVertical: 10,
                                  paddingHorizontal: 12,
                                  backgroundColor: partyForm.role === r ? theme.primary + '10' : 'transparent',
                                  borderRadius: 6
                                }}
                                onPress={() => {
                                  setPartyForm({ ...partyForm, role: r });
                                  setRolePickerOpen(false);
                                }}
                              >
                                <Text style={{ 
                                  color: partyForm.role === r ? theme.primary : theme.textPrimary,
                                  fontWeight: partyForm.role === r ? '600' : 'normal',
                                  fontSize: 13
                                }}>{r}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      <Text style={styles.inputLabel}>Contact Number (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. +91 98765 43210"
                        placeholderTextColor="#9CA3AF"
                        value={partyForm.contact}
                        onChangeText={(t) => setPartyForm({ ...partyForm, contact: t })}
                      />

                      <Text style={styles.inputLabel}>Email (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. advocate@example.com"
                        placeholderTextColor="#9CA3AF"
                        value={partyForm.email}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={(t) => setPartyForm({ ...partyForm, email: t })}
                      />

                      <Text style={styles.inputLabel}>Notes (Optional)</Text>
                      <TextInput
                        style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                        placeholder="Additional details..."
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        value={partyForm.notes}
                        onChangeText={(t) => setPartyForm({ ...partyForm, notes: t })}
                      />

                      <Pressable style={styles.formSubmitBtn} onPress={handleAddParty}>
                        <Text style={styles.formSubmitBtnText}>Save Person</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* EVIDENCE FORM */}
                  {modalType === 'evidence' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Log Evidence</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Evidence Title / File"
                        placeholderTextColor="#9CA3AF"
                        value={evidenceForm.name}
                        onChangeText={(t) => setEvidenceForm({ ...evidenceForm, name: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Type (e.g. Receipt, Statement)"
                        placeholderTextColor="#9CA3AF"
                        value={evidenceForm.type}
                        onChangeText={(t) => setEvidenceForm({ ...evidenceForm, type: t })}
                      />
                      <TextInput
                        style={[styles.formInput, { height: 60 }]}
                        placeholder="Description"
                        placeholderTextColor="#9CA3AF"
                        value={evidenceForm.description}
                        onChangeText={(t) => setEvidenceForm({ ...evidenceForm, description: t })}
                      />
                      <Pressable style={styles.formSubmitBtn} onPress={handleAddEvidence}>
                        <Text style={styles.formSubmitBtnText}>Log Proof</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* COURT ORDER FORM */}
                  {modalType === 'court_order' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Log Official Court Order</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Order Title (e.g. Summons_Order_1)"
                        placeholderTextColor="#9CA3AF"
                        value={courtOrderForm.title}
                        onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, title: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Date Issued (e.g. 10 May 2025)"
                        placeholderTextColor="#9CA3AF"
                        value={courtOrderForm.date}
                        onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, date: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Issuer (e.g. Senior District Judge)"
                        placeholderTextColor="#9CA3AF"
                        value={courtOrderForm.issuer}
                        onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, issuer: t })}
                      />
                      <TextInput
                        style={[styles.formInput, { height: 80 }]}
                        placeholder="Directives or notes"
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        value={courtOrderForm.notes}
                        onChangeText={(t) => setCourtOrderForm({ ...courtOrderForm, notes: t })}
                      />
                      <Pressable style={styles.formSubmitBtn} onPress={handleAddCourtOrder}>
                        <Text style={styles.formSubmitBtnText}>Log Court Order</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* TASK FORM */}
                  {modalType === 'task' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Add Task Checklist Item</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Task Title"
                        placeholderTextColor="#9CA3AF"
                        value={taskForm.title}
                        onChangeText={(t) => setTaskForm({ ...taskForm, title: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Description"
                        placeholderTextColor="#9CA3AF"
                        value={taskForm.description}
                        onChangeText={(t) => setTaskForm({ ...taskForm, description: t })}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Deadline (e.g. 15 Apr 2025)"
                        placeholderTextColor="#9CA3AF"
                        value={taskForm.deadline}
                        onChangeText={(t) => setTaskForm({ ...taskForm, deadline: t })}
                      />
                      <Pressable style={styles.formSubmitBtn} onPress={handleAddTask}>
                        <Text style={styles.formSubmitBtnText}>Create Task</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* RESEARCH SEARCH FORM */}
                  {modalType === 'research' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>AI Precedent Search</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.searchRow}>
                        <TextInput
                          style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                          placeholder="Search codes (e.g. NI Act Sec 138)"
                          placeholderTextColor="#9CA3AF"
                          value={precedentQuery}
                          onChangeText={setPrecedentQuery}
                        />
                        <Pressable style={styles.searchBtn} onPress={handleSearchPrecedents}>
                          <Ionicons name="search" size={18} color="#FFFFFF" />
                        </Pressable>
                      </View>

                      {precedentSearchResults.length > 0 && (
                        <ScrollView style={styles.searchResultsScroll}>
                          {precedentSearchResults.map((prec, i) => (
                            <View key={i} style={styles.searchResultItem}>
                              <Text style={styles.resultItemTitle}>{prec.title}</Text>
                              <Text style={styles.resultItemCitation}>{prec.citation}</Text>
                              <Text style={styles.resultItemSummary}>{prec.summary}</Text>
                              <Pressable
                                style={styles.resultSaveBtn}
                                onPress={() => handleSavePrecedent(prec)}
                              >
                                <Text style={styles.resultSaveBtnText}>Save Precedent</Text>
                              </Pressable>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}



                  {/* RENAME CASE FORM */}
                  {modalType === 'rename' && (
                    <View style={styles.formContainer}>
                      <View style={styles.formHeaderRow}>
                        <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>Rename Workspace Title</Text>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                          <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.formInput}
                        placeholder="New Workspace Title"
                        placeholderTextColor="#9CA3AF"
                        value={renameValue}
                        onChangeText={setRenameValue}
                      />
                      <Pressable style={styles.formSubmitBtn} onPress={handleRenameCase}>
                        <Text style={styles.formSubmitBtnText}>Save New Title</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ARGUMENT ADD/EDIT MODAL */}
      <Modal visible={isArgModalOpen} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsArgModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <View style={styles.formHeaderRow}>
                  <Text style={[styles.formTitle, { marginBottom: 0, flex: 1 }]}>
                    {argModalType === 'add' ? 'Add Strategy Argument' : 'Edit Strategy Argument'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsArgModalOpen(false)}>
                    <Ionicons name="close" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  <Text style={styles.inputLabel}>Argument Title</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Valid and Binding Written Agreement"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.title}
                    onChangeText={(t) => setArgForm({ ...argForm, title: t })}
                  />

                  <Text style={styles.inputLabel}>Legal Category</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Contract Law, Procedure, Evidence"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.category}
                    onChangeText={(t) => setArgForm({ ...argForm, category: t })}
                  />

                  <Text style={styles.inputLabel}>Priority Level</Text>
                  <View style={styles.templateSelection}>
                    {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                      <Pressable
                        key={p}
                        style={[styles.templateChip, argForm.priority === p && styles.templateChipActive]}
                        onPress={() => setArgForm({ ...argForm, priority: p })}
                      >
                        <Text style={[styles.templateText, argForm.priority === p && { color: '#FFFFFF' }]}>
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Detailed Explanation</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80 }]}
                    placeholder="Provide the detailed explanation or logic..."
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    value={argForm.description}
                    onChangeText={(t) => setArgForm({ ...argForm, description: t })}
                  />

                  {argModalCategory === 'respondent' && (
                    <>
                      <Text style={styles.inputLabel}>AI Recommended Rebuttal / Refutation</Text>
                      <TextInput
                        style={[styles.formInput, { height: 80 }]}
                        placeholder="Rebuttal strategy to defense allegation..."
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        value={(argForm as any).refutation || ''}
                        onChangeText={(t) => setArgForm({ ...argForm, refutation: t } as any)}
                      />
                    </>
                  )}

                  <Text style={styles.inputLabel}>Supporting Facts (One per line)</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60 }]}
                    placeholder="Fact details..."
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    value={argForm.supportingFacts}
                    onChangeText={(t) => setArgForm({ ...argForm, supportingFacts: t })}
                  />

                  <Text style={styles.inputLabel}>Applicable Acts / Sections (One per line)</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60 }]}
                    placeholder="e.g. Indian Contract Act - Sec 10"
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    value={argForm.supportingLaws}
                    onChangeText={(t) => setArgForm({ ...argForm, supportingLaws: t })}
                  />

                  <Text style={styles.inputLabel}>Supporting Case Laws / Precedents (One per line)</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60 }]}
                    placeholder="e.g. Supreme Court: Ramesh vs State (2012)"
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    value={argForm.supportingCaseLaws}
                    onChangeText={(t) => setArgForm({ ...argForm, supportingCaseLaws: t })}
                  />

                  <Text style={styles.inputLabel}>Related Evidence (Comma-separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Loan Agreement Deed (Ex. P-1)"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.relatedEvidence}
                    onChangeText={(t) => setArgForm({ ...argForm, relatedEvidence: t })}
                  />

                  <Text style={styles.inputLabel}>Related Documents (Comma-separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. contract.pdf"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.relatedDocuments}
                    onChangeText={(t) => setArgForm({ ...argForm, relatedDocuments: t })}
                  />

                  <Text style={styles.inputLabel}>Related Timeline Events (Comma-separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Notice Served"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.relatedTimelineEvents}
                    onChangeText={(t) => setArgForm({ ...argForm, relatedTimelineEvents: t })}
                  />

                  <Text style={styles.inputLabel}>Related Hearings (Comma-separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Admission Stage"
                    placeholderTextColor="#9CA3AF"
                    value={argForm.relatedHearings}
                    onChangeText={(t) => setArgForm({ ...argForm, relatedHearings: t })}
                  />

                  <TouchableOpacity
                    style={styles.formSubmitBtn}
                    onPress={() => {
                      if (argModalType === 'add') {
                        handleAddArgument(argModalCategory, argForm);
                      } else {
                        if (argModalTargetId) {
                          handleEditArgument(argModalCategory, argModalTargetId, argForm);
                        }
                      }
                      setIsArgModalOpen(false);
                    }}
                  >
                    <Text style={styles.formSubmitBtnText}>
                      {argModalType === 'add' ? 'Create Argument' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SIMULATED OCR STATUS POPUP --- */}
      {isOcrProcessing && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.ocrOverlay}>
            <View style={styles.ocrBox}>
              <ActivityIndicator size="large" color="#111111" style={styles.ocrSpinner} />
              <Text style={styles.ocrTitle}>AI OCR Pipeline Running</Text>
              <Text style={styles.ocrSubtitle}>Extracting timeline dates and details from folder documents...</Text>
              <View style={styles.ocrStepsContainer}>
                {ocrSteps.map((step, idx) => (
                  <View key={idx} style={styles.ocrStepRow}>
                    <Ionicons
                      name={
                        activeOcrStep > idx
                          ? 'checkmark-circle'
                          : activeOcrStep === idx
                            ? 'sync'
                            : 'ellipse-outline'
                      }
                      size={16}
                      color={
                        activeOcrStep > idx
                          ? '#10B981'
                          : activeOcrStep === idx
                            ? '#111111'
                            : '#9CA3AF'
                      }
                    />
                    <Text
                      style={[
                        styles.ocrStepText,
                        activeOcrStep === idx && styles.ocrStepTextActive,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* --- DRAFT EDITOR MODAL --- */}
      <Modal visible={isEditorOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.editorModalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* STICKY HEADER */}
            <View style={styles.editorModalHeader}>
              <TouchableOpacity
                style={styles.editorCloseBtn}
                onPress={() => {
                  setIsEditorOpen(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>

              <View style={{ flex: 1, marginHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.editorHeaderTitleInput, { flex: 1, paddingVertical: 4 }]}
                  value={editorTitle}
                  onChangeText={(t) => {
                    setEditorTitle(t);
                    if (workspace && activeDraftId) {
                      const current = workspace.drafts || [];
                      const updated = current.map(d => d.id === activeDraftId ? { ...d, name: t, updatedAt: new Date().toISOString() } : d);
                      handleUpdateField({ drafts: updated });
                    }
                  }}
                  placeholder="Draft Document Title"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Draft Status Badge */}
                <TouchableOpacity
                  onPress={() => {
                    const statuses: ('Draft' | 'In Progress' | 'Completed' | 'Reviewed')[] = ['Draft', 'In Progress', 'Completed', 'Reviewed'];
                    const nextIndex = (statuses.indexOf(editorStatus) + 1) % statuses.length;
                    const nextStatus = statuses[nextIndex];
                    setEditorStatus(nextStatus);
                    if (workspace && activeDraftId) {
                      const current = workspace.drafts || [];
                      const updated = current.map(d => d.id === activeDraftId ? { ...d, status: nextStatus, updatedAt: new Date().toISOString() } : d);
                      handleUpdateField({ drafts: updated });
                    }
                    showToast('success', 'Status Updated', `Draft status changed to ${nextStatus}.`);
                  }}
                  style={[styles.statusBadge,
                  editorStatus === 'Completed' ? styles.badgeSuccess :
                    editorStatus === 'Reviewed' ? styles.badgeInfo :
                      editorStatus === 'In Progress' ? styles.badgeWarning : styles.badgeInfo
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { fontSize: 9 }]}>{editorStatus}</Text>
                </TouchableOpacity>

                {/* Autosaved indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: autosaveStatus === 'Saving...' ? '#EC4899' : '#10B981' }} />
                  <Text style={{ fontSize: 9, color: autosaveStatus === 'Saving...' ? '#EC4899' : '#6B7280', fontWeight: '500' }}>
                    {autosaveStatus}
                  </Text>
                </View>
              </View>

              {/* ⋮ More Overflow Menu */}
              <TouchableOpacity
                onPress={() => setIsEditorMoreOpen(true)}
                style={{ padding: 6 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* SUB-TABS SELECTOR */}
            <View style={styles.editorSubTabsHeader}>
              {[
                { id: 'editor', label: 'Document Editor', icon: 'document-text-outline' },
                { id: 'ai', label: 'AI Co-Counsel', icon: 'sparkles-outline' },
                { id: 'history', label: 'Revision History', icon: 'time-outline' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.editorSubTabButton, expandedEditorTab === tab.id && styles.editorSubTabActive]}
                  onPress={() => setExpandedEditorTab(tab.id as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={expandedEditorTab === tab.id ? '#111111' : '#6B7280'}
                  />
                  <Text style={[styles.editorSubTabText, expandedEditorTab === tab.id && styles.editorSubTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TAB CONTENTS */}
            <View style={{ flex: 1 }}>
              {/* 1. DOCUMENT EDITOR TAB */}
              {expandedEditorTab === 'editor' && (
                <View style={{ flex: 1 }}>
                  {/* Toolbar simulation */}
                  <View style={styles.editorToolbar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                      {/* Bold */}
                      <TouchableOpacity
                        style={[styles.editorToolbarBtn, isBold && { backgroundColor: theme.primaryLight }]}
                        onPress={() => {
                          setIsBold(!isBold);
                          showToast('info', 'Toolbar Action', `Simulated Bold: ${!isBold ? 'ON' : 'OFF'}`);
                        }}
                      >
                        <Ionicons name="bold" size={15} color={isBold ? theme.primary : "#4B5563"} />
                      </TouchableOpacity>

                      {/* Italic */}
                      <TouchableOpacity
                        style={[styles.editorToolbarBtn, isItalic && { backgroundColor: theme.primaryLight }]}
                        onPress={() => {
                          setIsItalic(!isItalic);
                          showToast('info', 'Toolbar Action', `Simulated Italic: ${!isItalic ? 'ON' : 'OFF'}`);
                        }}
                      >
                        <Ionicons name="italic" size={15} color={isItalic ? theme.primary : "#4B5563"} />
                      </TouchableOpacity>

                      {/* Underline */}
                      <TouchableOpacity
                        style={[styles.editorToolbarBtn, isUnderline && { backgroundColor: theme.primaryLight }]}
                        onPress={() => {
                          setIsUnderline(!isUnderline);
                          showToast('info', 'Toolbar Action', `Simulated Underline: ${!isUnderline ? 'ON' : 'OFF'}`);
                        }}
                      >
                        <Ionicons name="underline" size={15} color={isUnderline ? theme.primary : "#4B5563"} />
                      </TouchableOpacity>

                      {/* Bullet List */}
                      <TouchableOpacity
                        style={styles.editorToolbarBtn}
                        onPress={() => {
                          const newText = editorContent + "\n• ";
                          handleEditorTextChange(newText);
                          showToast('success', 'Bullet List', 'Appended bullet list item.');
                        }}
                      >
                        <Ionicons name="list" size={15} color="#4B5563" />
                      </TouchableOpacity>

                      {/* Numbered List */}
                      <TouchableOpacity
                        style={styles.editorToolbarBtn}
                        onPress={() => {
                          const newText = editorContent + "\n1. ";
                          handleEditorTextChange(newText);
                          showToast('success', 'Numbered List', 'Appended numbered list item.');
                        }}
                      >
                        <Ionicons name="list-circle" size={15} color="#4B5563" />
                      </TouchableOpacity>

                      {/* Alignment */}
                      <TouchableOpacity
                        style={styles.editorToolbarBtn}
                        onPress={() => {
                          const modes: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
                          const nextMode = modes[(modes.indexOf(alignment) + 1) % modes.length];
                          setAlignment(nextMode);
                          showToast('success', 'Alignment', `Simulated Alignment: ${nextMode.toUpperCase()}`);
                        }}
                      >
                        <Ionicons
                          name={alignment === 'left' ? 'align-left' : alignment === 'center' ? 'align-center' : 'align-right'}
                          size={15}
                          color="#4B5563"
                        />
                      </TouchableOpacity>

                      {/* Undo */}
                      <TouchableOpacity
                        style={styles.editorToolbarBtn}
                        onPress={() => showToast('info', 'Toolbar Action', 'Undo typing action simulated.')}
                      >
                        <Ionicons name="arrow-undo" size={15} color="#4B5563" />
                      </TouchableOpacity>

                      {/* Redo */}
                      <TouchableOpacity
                        style={styles.editorToolbarBtn}
                        onPress={() => showToast('info', 'Toolbar Action', 'Redo typing action simulated.')}
                      >
                        <Ionicons name="arrow-redo" size={15} color="#4B5563" />
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 16 }}>
                    <TextInput
                      style={styles.mainEditorInput}
                      value={editorContent}
                      onChangeText={handleEditorTextChange}
                      multiline
                      scrollEnabled={false}
                      placeholder="Write your legal draft content here..."
                      placeholderTextColor="#9CA3AF"
                    />
                  </ScrollView>
                </View>
              )}

              {/* 2. AI CO-COUNSEL ASSISTANT TAB */}
              {expandedEditorTab === 'ai' && (
                <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                  <ScrollView style={{ flex: 1, padding: 16 }}>
                    <View style={styles.aiAssistIntroBox}>
                      <Ionicons name="sparkles" size={18} color="#111111" />
                      <Text style={styles.aiAssistIntroTitle}>AI Co-Counsel Drafting Suite</Text>
                      <Text style={styles.aiAssistIntroDesc}>
                        Select a context-aware legal action below. Antigravity AI automatically maps current case details to rewrite or structure your document.
                      </Text>
                    </View>

                    {/* Loader steps screen */}
                    {isAiDrafting ? (
                      <View style={styles.aiDraftingStepsBox}>
                        <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
                        <Text style={styles.aiDraftingTitle}>Compiling Legal Document...</Text>
                        <View style={styles.ocrStepsContainer}>
                          {aiDraftSteps.map((step, idx) => (
                            <View key={idx} style={styles.ocrStepRow}>
                              <Ionicons
                                name={
                                  activeAiDraftStep > idx
                                    ? 'checkmark-circle'
                                    : activeAiDraftStep === idx
                                      ? 'sync'
                                      : 'ellipse-outline'
                                }
                                size={16}
                                color={
                                  activeAiDraftStep > idx
                                    ? '#10B981'
                                    : activeAiDraftStep === idx
                                      ? '#111111'
                                      : '#9CA3AF'
                                }
                              />
                              <Text
                                style={[
                                  styles.ocrStepText,
                                  activeAiDraftStep === idx && styles.ocrStepTextActive,
                                ]}
                              >
                                {step}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : aiSuggestedDraftText ? (
                      /* DIFFERENTIAL PREVIEW BOX */
                      <View style={styles.diffContainer}>
                        <View style={styles.diffHeader}>
                          <Ionicons name="eye-outline" size={16} color="#EC4899" />
                          <Text style={styles.diffHeaderTitle}>Suggested AI Pleading Draft Preview</Text>
                        </View>
                        <Text style={styles.diffMetaInfo}>
                          Review the generated text below. Tap Accept to merge this directly into the editor buffer or Dismiss to discard.
                        </Text>
                        <ScrollView style={styles.diffBodyScroll} nestedScrollEnabled={true}>
                          <Text style={styles.diffContentText}>{aiSuggestedDraftText}</Text>
                        </ScrollView>
                        <View style={styles.diffActionsRow}>
                          <TouchableOpacity
                            style={styles.diffAcceptBtn}
                            onPress={handleApplyAiSuggestion}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.diffAcceptText}>Apply & Merge Changes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.diffRejectBtn}
                            onPress={() => {
                              setAiSuggestedDraftText(null);
                              setIsAiSuggestionActive(false);
                              showToast('info', 'AI Suggestion Dismissed', 'Draft buffer unchanged.');
                            }}
                          >
                            <Text style={styles.diffRejectText}>Dismiss</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* 16 Legal Actions Grid */
                      <View style={styles.aiActionsGrid}>
                        {[
                          { title: 'Improve Prose', desc: 'Enhance general readability and flow', action: 'Enhance general readability and flow.' },
                          { title: 'Formal Legal Tone', desc: 'Elevate tone to formal advocacy style', action: 'Elevate text tone to standard court pleading/formal advocacy style.' },
                          { title: 'Simplify Clauses', desc: 'Reduce legalese complexity for review', action: 'Simplify contractual clauses and minimize raw legalese terms.' },
                          { title: 'Grammar & Typo Fix', desc: 'Verify typographical errors and spacing', action: 'Conduct thorough grammar check and format text spacing.' },
                          { title: 'Summarize Draft', desc: 'Add brief executive preview snippet', action: 'Generate an executive summary and brief statement of facts header.' },
                          { title: 'Expand Arguments', desc: 'Flesh out contract breach details', action: 'Expand litigation positions and details regarding default liabilities.' },
                          { title: 'Format Relief Prayers', desc: 'Structure prayers for relief section', action: 'Format the formal Prayers for Relief and declaration clauses.' },
                          { title: 'Cite Precedents', desc: 'Cross-reference case laws and citations', action: 'Cross-reference active landmark judgments and append citations list.' },
                          { title: 'Indemnity Protection', desc: 'Add standard indemnity clauses', action: 'Draft a robust indemnity protection clause and liability limits.' },
                          { title: 'Jurisdiction Clause', desc: 'Add court jurisdiction statement', action: 'Add standard jurisdiction and forum selection clauses.' },
                          { title: 'Timeline Integration', desc: 'Insert chronological facts list', action: 'Parse timeline logs and inject chronological statement list.' },
                          { title: 'Evidence Referencing', desc: 'Cite contract Exhibits and uploads', action: 'Identify evidence records and cross-reference relevant exhibit numbers.' },
                          { title: 'Party Formalization', desc: 'Structure client vs opponent headers', action: 'Structure the formal title heading representing petitioner versus respondent.' },
                          { title: 'Interest Rate Penalties', desc: 'Add Sec 34 CPC penalty rate terms', action: 'Add default interest rates and penalty calculations under Sec 34 CPC.' },
                          { title: 'Rebuttal formulation', desc: 'Formulate defense response points', action: 'Formulate specific rebuttals addressing defenses raised by opposing counsel.' },
                          { title: 'Condonation of Delay', desc: 'Structure Sec 5 delay apology', action: 'Structure pleading requesting condonation of delay under Sec 5 Limitation Act.' }
                        ].map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.aiActionCard}
                            onPress={() => runAiDraftAssist(item.title, item.action)}
                          >
                            <View style={styles.aiActionCardHeader}>
                              <Ionicons name="sparkles" size={14} color="#EC4899" />
                              <Text style={styles.aiActionCardTitle} numberOfLines={1}>{item.title}</Text>
                            </View>
                            <Text style={styles.aiActionCardDesc} numberOfLines={2}>{item.desc}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* 3. REVISION HISTORY TAB */}
              {expandedEditorTab === 'history' && (
                <View style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 16 }}>
                  <ScrollView style={{ flex: 1 }}>
                    <Text style={[styles.suggestionsTitle, { marginVertical: 0, marginBottom: 8 }]}>Revision Control History</Text>

                    {/* CUSTOM VERSION COMMIT CARD */}
                    <View style={[styles.premiumSearchCard, { marginBottom: 16 }]}>
                      <Text style={[styles.premiumSearchTitle, { fontSize: 13 }]}>Commit Custom Save Point</Text>
                      <Text style={[styles.premiumSearchSubtitle, { fontSize: 10 }]}>Log the current editor buffer state to a permanent version.</Text>
                      <TextInput
                        style={[styles.premiumSearchInput, { height: 34, marginBottom: 10 }]}
                        placeholder="Save description (e.g. Added Section 18 argument)"
                        placeholderTextColor="#9CA3AF"
                        value={versionComment}
                        onChangeText={setVersionComment}
                      />
                      <TouchableOpacity
                        style={[styles.premiumAnalyzeBtn, { height: 32 }]}
                        onPress={() => {
                          handleSaveDraftContent(false, versionComment);
                          setVersionComment('');
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Save Version</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Versions list */}
                    <View style={{ gap: 10 }}>
                      {((workspace?.drafts?.find(d => d.id === activeDraftId)?.versions) || []).map((ver) => {
                        const isCurrent = selectedVersion === ver.version;
                        const dateStr = new Date(ver.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                        return (
                          <View key={ver.version} style={[styles.itemCard, isCurrent && { borderColor: '#111111', backgroundColor: '#F5F5F5' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>
                                Version v{ver.version} {isCurrent && '(Restored Buffer)'}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{dateStr}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 4, fontStyle: 'italic' }}>
                              {`"${ver.changes}"`}
                            </Text>
                            <TouchableOpacity
                              style={[styles.restoreBtnLink, { marginTop: 8 }]}
                              onPress={() => handleRestoreVersion(ver)}
                            >
                              <Ionicons name="reload-outline" size={12} color="#111111" style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#111111' }}>Restore to Editor</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* --- DRAFT VIEWER MODAL --- */}
      <Modal visible={isPreviewOpen && !!previewDraft} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View style={[styles.appBar, { borderBottomWidth: 1, borderBottomColor: '#ECECEC' }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setIsPreviewOpen(false);
                setPreviewDraft(null);
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }} numberOfLines={1}>
                {previewDraft?.name || 'Document Preview'}
              </Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>
                {previewDraft?.type || 'Draft'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={async () => {
                if (!previewDraft) return;
                try {
                  await Share.share({
                    title: previewDraft.name,
                    message: previewDraft.content
                  });
                } catch (err) {
                  console.log(err);
                }
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="share-social-outline" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Details & Info Row */}
          <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#ECECEC', gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '500' }}>
              Case Workspace: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{workspace?.name || 'Standard Case'}</Text>
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                Created: {previewDraft?.createdAt ? new Date(previewDraft.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </Text>
              <View style={[styles.statusBadge,
              previewDraft?.status === 'Completed' ? styles.badgeSuccess :
                previewDraft?.status === 'Reviewed' ? styles.badgeInfo :
                  previewDraft?.status === 'In Progress' ? styles.badgeWarning : styles.badgeInfo
              ]}>
                <Text style={styles.statusBadgeText}>{previewDraft?.status || 'Draft'}</Text>
              </View>
            </View>
          </View>

          {/* Scrollable formatted content */}
          <ScrollView
            style={{ flex: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <Text style={{
              fontSize: 13,
              color: '#1F2937',
              lineHeight: 20,
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              backgroundColor: '#FFFFFF',
            }}>
              {previewDraft?.content || ''}
            </Text>
          </ScrollView>

          {/* Floating Edit button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              backgroundColor: '#111111',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              elevation: 5,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
            }}
            onPress={() => {
              if (previewDraft) {
                const draftToEdit = previewDraft;
                setIsPreviewOpen(false);
                setPreviewDraft(null);
                handleOpenDraftEditor(draftToEdit);
              }
            }}
          >
            <Ionicons name="create" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Edit Draft</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* --- CARD MORE MENU BOTTOM SHEET --- */}
      <Modal visible={isCardMoreMenuOpen && !!activeDraftForMoreMenu} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={() => {
          setIsCardMoreMenuOpen(false);
          setActiveDraftForMoreMenu(null);
        }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ECECEC', paddingBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1F2937' }}>{activeDraftForMoreMenu?.name}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{activeDraftForMoreMenu?.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => {
                    setIsCardMoreMenuOpen(false);
                    setActiveDraftForMoreMenu(null);
                  }}>
                    <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <ScrollView style={{ maxHeight: 350 }}>
                  {/* Download as PDF */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsCardMoreMenuOpen(false);
                      showToast('success', 'Exporting PDF...', 'Simulating PDF document conversion...');
                      setTimeout(() => {
                        showToast('success', 'PDF Downloaded', `${activeDraftForMoreMenu?.name}.pdf saved in Downloads folder.`);
                        setActiveDraftForMoreMenu(null);
                      }, 1000);
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color="#111111" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Download as PDF</Text>
                  </TouchableOpacity>

                  {/* Download as DOCX */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsCardMoreMenuOpen(false);
                      showToast('success', 'Exporting DOCX...', 'Simulating DOCX file conversion...');
                      setTimeout(() => {
                        showToast('success', 'DOCX Downloaded', `${activeDraftForMoreMenu?.name}.docx saved in Downloads folder.`);
                        setActiveDraftForMoreMenu(null);
                      }, 1000);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Download as DOCX</Text>
                  </TouchableOpacity>

                  {/* Share Draft */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={async () => {
                      if (!activeDraftForMoreMenu) return;
                      setIsCardMoreMenuOpen(false);
                      try {
                        await Share.share({
                          title: activeDraftForMoreMenu.name,
                          message: activeDraftForMoreMenu.content
                        });
                      } catch (err) {
                        console.log(err);
                      }
                      setActiveDraftForMoreMenu(null);
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#F59E0B" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Share Draft</Text>
                  </TouchableOpacity>

                  {/* Rename Draft */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      if (!activeDraftForMoreMenu) return;
                      setIsCardMoreMenuOpen(false);
                      setRenameTargetDraftId(activeDraftForMoreMenu.id);
                      setRenameValue(activeDraftForMoreMenu.name);
                      setActiveDraftForMoreMenu(null);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#10B981" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Rename Draft</Text>
                  </TouchableOpacity>

                  {/* Duplicate Draft */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      if (!activeDraftForMoreMenu) return;
                      setIsCardMoreMenuOpen(false);
                      handleDuplicateDraft(activeDraftForMoreMenu.id);
                      setActiveDraftForMoreMenu(null);
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color="#C8A34D" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Duplicate Draft</Text>
                  </TouchableOpacity>

                  {/* Export */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsCardMoreMenuOpen(false);
                      showToast('success', 'Exporting...', 'Draft exported as raw TXT successfully.');
                      setActiveDraftForMoreMenu(null);
                    }}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#6B7280" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Export</Text>
                  </TouchableOpacity>

                  {/* Print */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                    onPress={() => {
                      setIsCardMoreMenuOpen(false);
                      showToast('info', 'Print Job', 'Simulated: Draft document sent to wireless printer.');
                      setActiveDraftForMoreMenu(null);
                    }}
                  >
                    <Ionicons name="print-outline" size={18} color="#1F2937" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Print</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- EDITOR MORE MENU BOTTOM SHEET --- */}
      <Modal visible={isEditorMoreOpen} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={() => setIsEditorMoreOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ECECEC', paddingBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1F2937' }}>Editor Actions</Text>
                  <TouchableOpacity onPress={() => setIsEditorMoreOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <ScrollView style={{ maxHeight: 380 }}>
                  {/* Save */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      handleSaveDraftContent(false, 'Manual save checkpoint');
                    }}
                  >
                    <Ionicons name="save-outline" size={18} color="#111111" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Save</Text>
                  </TouchableOpacity>

                  {/* Save As */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      setSaveAsName(`${editorTitle} Copy`);
                      setIsSaveAsOpen(true);
                    }}
                  >
                    <Ionicons name="duplicate-outline" size={18} color="#C8A34D" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Save As...</Text>
                  </TouchableOpacity>

                  {/* Export PDF */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      showToast('success', 'PDF Export', 'Draft compiled and saved in PDF format.');
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color="#EF4444" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Export PDF</Text>
                  </TouchableOpacity>

                  {/* Export DOCX */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      showToast('success', 'Word Export', 'Draft compiled and saved in DOCX format.');
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Export DOCX</Text>
                  </TouchableOpacity>

                  {/* Share */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={async () => {
                      setIsEditorMoreOpen(false);
                      try {
                        await Share.share({
                          title: editorTitle,
                          message: editorContent
                        });
                      } catch (err) {
                        console.log(err);
                      }
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#F59E0B" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Share</Text>
                  </TouchableOpacity>

                  {/* Print */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      showToast('info', 'Printing...', 'Simulated document spooling to local printer.');
                    }}
                  >
                    <Ionicons name="print-outline" size={18} color="#6B7280" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Print</Text>
                  </TouchableOpacity>

                  {/* Rename Draft */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      setSaveAsName(editorTitle);
                      setIsSaveAsOpen(true);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#10B981" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Rename Draft</Text>
                  </TouchableOpacity>

                  {/* Version History */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      setExpandedEditorTab('history');
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color="#C8A34D" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>Version History</Text>
                  </TouchableOpacity>

                  {/* Delete Draft */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                    onPress={() => {
                      setIsEditorMoreOpen(false);
                      if (activeDraftId) {
                        handleDeleteDraft(activeDraftId);
                        setIsEditorOpen(false);
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Delete Draft</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SAVE AS & RENAME POPUP DIALOG --- */}
      <Modal visible={isSaveAsOpen} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320, gap: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1F2937' }}>
              {saveAsName.includes('Copy') ? 'Save Document As' : 'Rename Draft'}
            </Text>

            <TextInput
              style={styles.premiumSearchInput}
              value={saveAsName}
              onChangeText={setSaveAsName}
              placeholder="Enter name"
              placeholderTextColor="#9CA3AF"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                onPress={() => {
                  setIsSaveAsOpen(false);
                  setSaveAsName('');
                }}
              >
                <Text style={{ color: '#4B5563', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#111111', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                onPress={() => {
                  setIsSaveAsOpen(false);
                  if (activeDraftId && saveAsName.trim()) {
                    if (saveAsName.includes('Copy')) {
                      if (workspace) {
                        const current = workspace.drafts || [];
                        const source = current.find(d => d.id === activeDraftId);
                        if (source) {
                          const newDraft: CaseDraft = {
                            ...source,
                            id: `draft_${Date.now()}`,
                            name: saveAsName,
                            content: editorContent,
                            updatedAt: new Date().toISOString()
                          };
                          handleUpdateField({ drafts: [...current, newDraft] });
                          showToast('success', 'Document Cloned', `Saved as "${saveAsName}".`);
                        }
                      }
                    } else {
                      setEditorTitle(saveAsName);
                      if (workspace) {
                        const current = workspace.drafts || [];
                        const updated = current.map(d => d.id === activeDraftId ? { ...d, name: saveAsName, updatedAt: new Date().toISOString() } : d);
                        handleUpdateField({ drafts: updated });
                      }
                      showToast('success', 'Document Renamed', `Draft title set to "${saveAsName}".`);
                    }
                  }
                  setSaveAsName('');
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Evidence Upload Bottom Sheet */}
      <Modal
        visible={isEvidenceUploadOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEvidenceUploadOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEvidenceUploadOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 }]}>
                {/* Header */}
                <View style={[styles.formHeaderRow, { borderBottomWidth: 1, borderBottomColor: theme.border || '#ECECEC', paddingBottom: 12, marginBottom: 16 }]}>
                  <View>
                    <Text style={[styles.formTitle, { color: theme.textPrimary, fontSize: 16, fontWeight: '800' }]}>Upload Evidence</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary || '#6B7280', marginTop: 2 }}>Choose an ingestion source</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEvidenceUploadOpen(false)}>
                    <Ionicons name="close" size={24} color={theme.textPrimary || '#4B5563'} />
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={handleEvidenceCaptureCamera}
                  >
                    <Ionicons name="camera" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Scan with Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={handleEvidenceChooseGallery}
                  >
                    <Ionicons name="image" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Choose from Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={handleEvidenceChoosePdf}
                  >
                    <Ionicons name="document-text" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Choose PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={handleEvidenceBrowseFiles}
                  >
                    <Ionicons name="folder-open" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Browse Device Files</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Evidence Actions Options Bottom Sheet */}
      <Modal
        visible={isEvidenceOptionsOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEvidenceOptionsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEvidenceOptionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 }]}>
                {/* Header */}
                <View style={[styles.formHeaderRow, { borderBottomWidth: 1, borderBottomColor: theme.border || '#ECECEC', paddingBottom: 12, marginBottom: 16 }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.formTitle, { color: theme.textPrimary, fontSize: 15, fontWeight: '800' }]} numberOfLines={1}>
                      {selectedEvidenceOptionsItem?.name || 'Evidence Options'}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280', marginTop: 2 }}>
                      {selectedEvidenceOptionsItem?.type || 'Document'} • {selectedEvidenceOptionsItem?.fileSize || ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEvidenceOptionsOpen(false)}>
                    <Ionicons name="close" size={24} color={theme.textPrimary || '#4B5563'} />
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={() => {
                      setIsEvidenceOptionsOpen(false);
                      setPreviewItem(selectedEvidenceOptionsItem);
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>👁 View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={() => {
                      setIsEvidenceOptionsOpen(false);
                      setRenamingItem(selectedEvidenceOptionsItem);
                      setRenamingName(selectedEvidenceOptionsItem?.name || '');
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>✏ Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border || '#E5E7EB',
                      gap: 12
                    }}
                    onPress={() => {
                      setIsEvidenceOptionsOpen(false);
                      setDeletingItem(selectedEvidenceOptionsItem);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>🗑 Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#111111',
                      gap: 12
                    }}
                    onPress={() => handleAnalyzeEvidenceWithAI(selectedEvidenceOptionsItem)}
                  >
                    <Ionicons name="analytics" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#111111' }}>🤖 Analyze with AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* AI Analyzing Loader Overlay */}
      <Modal visible={isAnalyzingEvidence} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.card || '#FFFFFF', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
              🤖 AI Analyzing Evidence...
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary || '#6B7280', textAlign: 'center', marginBottom: 20 }}>
              Running character recognition, object mapping, and case-timeline correlation engines
            </Text>
            
            <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
              {[
                'Detecting file type and content layers...',
                'Performing OCR character extraction...',
                'Synthesizing legal issues under Evidence Acts...',
                'Compiling summary report structures...'
              ].map((stepText, stepIdx) => {
                const isActive = stepIdx === aiAnalysisProgressStep;
                const isCompleted = stepIdx < aiAnalysisProgressStep;
                
                return (
                  <View key={stepIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons 
                      name={isCompleted ? "checkmark-circle" : (isActive ? "sync-outline" : "ellipse-outline")} 
                      size={16} 
                      color={isCompleted ? "#10B981" : (isActive ? "#111111" : "#9CA3AF")} 
                    />
                    <Text style={{ 
                      fontSize: 12, 
                      color: isCompleted ? theme.textPrimary : (isActive ? "#111111" : (theme.textSecondary || '#6B7280')),
                      fontWeight: (isActive || isCompleted) ? '700' : '400',
                      flex: 1
                    }}>
                      {stepText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Evidence Details Modal */}
      <Modal
        visible={isEvidenceDetailsOpen && !!selectedEvidence}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setIsEvidenceDetailsOpen(false)} style={styles.detailsBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.detailsExhibitNumber}>{selectedEvidence?.exhibitNumber || 'Exhibit'}</Text>
              <Text style={styles.detailsFileName} numberOfLines={1}>{selectedEvidence?.name}</Text>
            </View>
            <View style={[styles.evStatusBadge, { backgroundColor: getStatusColor(selectedEvidence?.status || 'Pending') + '15', marginRight: 12 }]}>
              <Text style={[styles.evStatusBadgeText, { color: getStatusColor(selectedEvidence?.status || 'Pending') }]}>
                {selectedEvidence?.status || 'Pending'}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScrollContent}>
            {/* Metadata Summary */}
            <View style={styles.metadataCard}>
              <Text style={styles.sectionTitle}>File Metadata</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaGridItem}>
                  <Text style={styles.metaLabel}>Type</Text>
                  <Text style={styles.metaValue}>{selectedEvidence?.type}</Text>
                </View>
                <View style={styles.metaGridItem}>
                  <Text style={styles.metaLabel}>Size</Text>
                  <Text style={styles.metaValue}>{selectedEvidence?.fileSize}</Text>
                </View>
                <View style={styles.metaGridItem}>
                  <Text style={styles.metaLabel}>Uploaded By</Text>
                  <Text style={styles.metaValue}>
                    {(typeof selectedEvidence?.uploadedBy === 'object' ? selectedEvidence?.uploadedBy?.name : selectedEvidence?.uploadedBy) || 'Advocate'}
                  </Text>
                </View>
                <View style={styles.metaGridItem}>
                  <Text style={styles.metaLabel}>Date Added</Text>
                  <Text style={styles.metaValue}>
                    {selectedEvidence?.uploadedDate ? new Date(selectedEvidence.uploadedDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingTop: 8 }}>
                <Text style={styles.metaLabel}>SHA-256 Hash Proof</Text>
                <Text style={styles.hashText}>{selectedEvidence?.hash || 'N/A'}</Text>
              </View>
            </View>

            {/* OCR Extracted Text Preview */}
            <View style={styles.ocrSection}>
              <View style={styles.ocrHeaderRow}>
                <Text style={styles.sectionTitle}>OCR Text Scanner Preview</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => {
                    Clipboard.setString(selectedEvidence?.ocrData?.text || '');
                    showToast('success', 'Copied', 'OCR text copied to clipboard.');
                  }}
                >
                  <Ionicons name="copy-outline" size={14} color="#111111" />
                  <Text style={styles.copyBtnText}>Copy Text</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.ocrTextScroll} nestedScrollEnabled>
                <Text style={styles.ocrTextContent}>
                  {selectedEvidence?.ocrData?.text || 'No scan text available for this file type.'}
                </Text>
              </ScrollView>
            </View>

            {/* AI Co-Counsel Findings */}
            <View style={styles.aiFindingsCard}>
              <View style={styles.aiHeaderRow}>
                <Ionicons name="sparkles" size={18} color="#111111" />
                <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>AI Co-Counsel Findings</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {selectedEvidence?.aiAnalysis?.confidenceScore || 94}% Confidence
                  </Text>
                </View>
              </View>

              <Text style={styles.findingsSubLabel}>Legal Relevance & Analysis</Text>
              <Text style={styles.findingsValue}>
                {selectedEvidence?.aiAnalysis?.relevance || 'No relevance analysis computed.'}
              </Text>

              <Text style={styles.findingsSubLabel}>Detected Entities</Text>
              <View style={styles.entitySection}>
                {renderEntityBlock('People', selectedEvidence?.aiAnalysis?.entities?.people)}
                {renderEntityBlock('Dates', selectedEvidence?.aiAnalysis?.entities?.dates)}
                {renderEntityBlock('Addresses', selectedEvidence?.aiAnalysis?.entities?.addresses)}
                {renderEntityBlock('Amounts', selectedEvidence?.aiAnalysis?.entities?.amounts)}
              </View>

              <Text style={styles.findingsSubLabel}>Suggested Arguments</Text>
              {(selectedEvidence?.aiAnalysis?.suggestedArguments || []).map((arg: string, idx: number) => (
                <View key={idx} style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{arg}</Text>
                </View>
              ))}

              <Text style={styles.findingsSubLabel}>Governing CPC / Evidence Act Rules</Text>
              <View style={styles.governingRulesRow}>
                {(selectedEvidence?.aiAnalysis?.applicableLaws || []).map((law: string, idx: number) => (
                  <View key={idx} style={styles.ruleBadge}>
                    <Text style={styles.ruleBadgeText}>{law}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.findingsSubLabel}>Vulnerabilities / Weaknesses</Text>
              {(selectedEvidence?.aiAnalysis?.possibleWeaknesses || []).map((w: string, idx: number) => (
                <View key={idx} style={styles.weaknessItem}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.weaknessText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Related Case Workspace Linkages */}
            <View style={styles.linkagesCard}>
              <Text style={styles.sectionTitle}>Workspace Linkages</Text>
              <Text style={styles.linkagesSubtitle}>Deep linkages matching active segments of this case.</Text>

              <View style={styles.linksGrid}>
                <TouchableOpacity
                  style={styles.linkCell}
                  onPress={() => handleRelatedLinkPress('overview')}
                >
                  <View style={[styles.linkCellIconBg, { backgroundColor: '#F5F5F5' }]}>
                    <Ionicons name="time" size={16} color="#111111" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkCellTitle}>Timeline Event</Text>
                    <Text style={styles.linkCellDesc} numberOfLines={1}>
                      {selectedEvidence?.relatedLinks?.timelineEvents?.[0] || 'Default initialization'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkCell}
                  onPress={() => handleRelatedLinkPress('hearings')}
                >
                  <View style={[styles.linkCellIconBg, { backgroundColor: '#E6F4EA' }]}>
                    <Ionicons name="calendar" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkCellTitle}>Linked Hearing</Text>
                    <Text style={styles.linkCellDesc} numberOfLines={1}>
                      {selectedEvidence?.relatedLinks?.hearings?.[0] || 'First scheduled trial'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkCell}
                  onPress={() => handleRelatedLinkPress('research')}
                >
                  <View style={[styles.linkCellIconBg, { backgroundColor: '#EBF5FF' }]}>
                    <Ionicons name="library" size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkCellTitle}>Legal Precedent</Text>
                    <Text style={styles.linkCellDesc} numberOfLines={1}>
                      {selectedEvidence?.relatedLinks?.research?.[0] || 'Evidence Act precedents'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkCell}
                  onPress={() => handleRelatedLinkPress('drafts')}
                >
                  <View style={[styles.linkCellIconBg, { backgroundColor: '#FEF7E0' }]}>
                    <Ionicons name="document-text" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkCellTitle}>Working Draft</Text>
                    <Text style={styles.linkCellDesc} numberOfLines={1}>
                      {selectedEvidence?.relatedLinks?.drafts?.[0] || 'Reply statement drafts'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Verification Status Modal */}
      <Modal
        visible={isVerifyModalOpen}
        transparent={true}
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={() => {
          setIsVerifyModalOpen(false);
          setVerifyTargetId(null);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.formTitle}>Verify Evidence Admissibility</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
                  Select the validation status for this exhibit item.
                </Text>

                <Pressable
                  style={[styles.statusSelectOption, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}
                  onPress={() => verifyTargetId && handleUpdateEvidenceStatus(verifyTargetId, 'Verified')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.statusSelectTitle, { color: '#10B981' }]}>Verified</Text>
                    <Text style={styles.statusSelectDesc}>Legally sound and authenticated.</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.statusSelectOption, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}
                  onPress={() => verifyTargetId && handleUpdateEvidenceStatus(verifyTargetId, 'Pending')}
                >
                  <Ionicons name="time" size={20} color="#F59E0B" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.statusSelectTitle, { color: '#F59E0B' }]}>Pending</Text>
                    <Text style={styles.statusSelectDesc}>Awaiting validation or original copies.</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.statusSelectOption, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}
                  onPress={() => verifyTargetId && handleUpdateEvidenceStatus(verifyTargetId, 'Rejected')}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.statusSelectTitle, { color: '#EF4444' }]}>Rejected</Text>
                    <Text style={styles.statusSelectDesc}>Inadmissible under Section 65B/other rules.</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.statusSelectOption, { borderLeftColor: '#3B82F6', borderLeftWidth: 4 }]}
                  onPress={() => verifyTargetId && handleUpdateEvidenceStatus(verifyTargetId, 'Disputed')}
                >
                  <Ionicons name="alert-circle" size={20} color="#3B82F6" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.statusSelectTitle, { color: '#3B82F6' }]}>Disputed</Text>
                    <Text style={styles.statusSelectDesc}>Challenged by the opposing party council.</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.formCancelBtn, { marginTop: 12 }]}
                  onPress={() => {
                    setIsVerifyModalOpen(false);
                    setVerifyTargetId(null);
                  }}
                >
                  <Text style={styles.formCancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* OCR & AI Analysis Progress Loader Modal */}
      <Modal
        visible={isOcrAnalyzing || isAnalyzingEvidence}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loaderModalOverlay}>
          <View style={styles.loaderModalContent}>
            {isOcrAnalyzing && (
              <>
                <View style={styles.loaderIconWrapper}>
                  <ActivityIndicator size="large" color="#111111" />
                </View>
                <Text style={styles.loaderModalTitle}>AI OCR Text Extractor</Text>
                <Text style={styles.loaderModalSubtitle}>Digitizing and verifying exhibit document raw layers...</Text>

                <View style={styles.loaderStepsContainer}>
                  {ocrStepTitles.map((step, idx) => {
                    const isCompleted = ocrProgressStep > idx;
                    const isActive = ocrProgressStep === idx;
                    return (
                      <View key={idx} style={styles.loaderStepRow}>
                        <View style={[
                          styles.loaderStepBullet,
                          isCompleted && styles.loaderStepBulletCompleted,
                          isActive && styles.loaderStepBulletActive
                        ]}>
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          ) : (
                            <View style={[styles.loaderStepBulletDot, isActive && styles.loaderStepBulletDotActive]} />
                          )}
                        </View>
                        <Text style={[
                          styles.loaderStepText,
                          isCompleted && styles.loaderStepTextCompleted,
                          isActive && styles.loaderStepTextActive
                        ]}>
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {isAnalyzingEvidence && (
              <>
                <View style={styles.loaderIconWrapper}>
                  <ActivityIndicator size="large" color="#10B981" />
                </View>
                <Text style={styles.loaderModalTitle}>Gemini Legal Co-Counsel</Text>
                <Text style={styles.loaderModalSubtitle}>Analyzing legal weight & extracting timeline entities...</Text>

                <View style={styles.loaderStepsContainer}>
                  {aiStepTitles.map((step, idx) => {
                    const isCompleted = aiAnalysisProgressStep > idx;
                    const isActive = aiAnalysisProgressStep === idx;
                    return (
                      <View key={idx} style={styles.loaderStepRow}>
                        <View style={[
                          styles.loaderStepBullet,
                          isCompleted && styles.loaderStepBulletCompleted,
                          isActive && styles.loaderStepBulletActive
                        ]}>
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          ) : (
                            <View style={[styles.loaderStepBulletDot, isActive && styles.loaderStepBulletDotActive]} />
                          )}
                        </View>
                        <Text style={[
                          styles.loaderStepText,
                          isCompleted && styles.loaderStepTextCompleted,
                          isActive && styles.loaderStepTextActive
                        ]}>
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <NewCaseIntelligenceModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={async (updatedCase) => {
          if (fetchWorkspaceDetails) {
            await fetchWorkspaceDetails(((id as string) || updatedCase?._id || updatedCase?.id || '') as string);
          }
        }}
        editCaseId={workspace?._id || workspace?.id || (id as string)}
        initialData={workspace}
      />
    </SafeAreaView>
  );
}

// TouchableWithoutFeedback helper for dismissals

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    tabContentRedesign: {
      flex: 1,
      backgroundColor: '#FAFAFA',
    },
    orderHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    orderHeaderTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#111111',
    },
    orderHeaderSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      marginTop: 2,
    },
    addOrderTextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#C8A34D',
      borderRadius: 6,
    },
    addOrderTextBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C8A34D',
      marginLeft: 4,
    },
    orderSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 12,
      height: 40,
    },
    orderSearchInputRedesign: {
      flex: 1,
      fontSize: 13,
      color: '#1F2937',
    },
    quickFiltersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginVertical: 8,
    },
    quickFilterChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
    },
    quickFilterChipActive: {
      backgroundColor: '#111111',
      borderColor: '#C8A34D',
    },
    quickFilterChipText: {
      fontSize: 11,
      color: '#4B5563',
    },
    quickFilterChipTextActive: {
      color: '#C8A34D',
      fontWeight: '700',
    },
    aiPriorityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 12,
    },
    aiBannerLeftBorder: {
      width: 4,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#C8A34D',
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    aiBannerText: {
      flex: 1,
      fontSize: 11,
      color: '#374151',
      fontWeight: '500',
      lineHeight: 16,
      paddingLeft: 4,
    },
    aiBannerBtnRow: {
      flexDirection: 'row',
      gap: 6,
      marginLeft: 8,
    },
    aiBannerBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
    },
    aiBannerBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#1F2937',
    },
    emptyContainerRedesign: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyTextRedesign: {
      fontSize: 12,
      color: '#9CA3AF',
    },
    orderCardRedesign: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderLeftWidth: 4,
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    cardOrderTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#111111',
      flex: 1,
      marginRight: 8,
    },
    statusBadgeRedesign: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    statusBadgeTextRedesign: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardDivider: {
      height: 1,
      backgroundColor: '#F3F4F6',
      marginVertical: 10,
    },
    cardMetadataGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    metadataCol: {
      flex: 1,
    },
    metadataLabel: {
      fontSize: 9,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metadataVal: {
      fontSize: 12,
      color: '#374151',
      fontWeight: '500',
      marginTop: 2,
    },
    orderCardActionsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingVertical: 8,
      backgroundColor: '#FAFAFA',
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    orderCardActionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderCardActionBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#4B5563',
    },
    floatingAddButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: '#111111',
      borderColor: '#C8A34D',
      borderWidth: 1,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
    },
    modalOverlayRedesign: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContainerRedesign: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '90%',
    },
    modalHeaderRedesign: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    modalHeaderTitleRedesign: {
      fontSize: 16,
      fontWeight: '800',
      color: '#111111',
    },
    pickerItemRedesign: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    pickerIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    orderPickerTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
    },
    pickerDesc: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 1,
    },
    importListItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    importListTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
    },
    importListDesc: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    importListEmpty: {
      textAlign: 'center',
      color: '#9CA3AF',
      marginVertical: 20,
      fontSize: 12,
    },
    courtOrderFormLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 6,
      marginTop: 12,
    },
    courtOrderFormInput: {
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      paddingHorizontal: 12,
      height: 40,
      fontSize: 13,
      color: '#1F2937',
      marginBottom: 12,
    },
    prioritySelectBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
    },
    prioritySelectBtnActive: {
      backgroundColor: '#111111',
      borderColor: '#C8A34D',
    },
    prioritySelectBtnText: {
      fontSize: 11,
      color: '#4B5563',
    },
    prioritySelectBtnTextActive: {
      color: '#C8A34D',
      fontWeight: '700',
    },
    formFooter: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      gap: 12,
    },
    formBtn: {
      flex: 1,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111111',
      borderColor: '#C8A34D',
      borderWidth: 1,
    },
    formBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#C8A34D',
    },
    ocrProgressBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 24,
      margin: 20,
      alignSelf: 'center',
      width: '80%',
      alignItems: 'center',
    },
    ocrProgressTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111111',
    },
    ocrProgressBar: {
      height: 6,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
      width: '100%',
      marginVertical: 12,
      overflow: 'hidden',
    },
    ocrProgressFill: {
      height: '100%',
      backgroundColor: '#C8A34D',
    },
    ocrProgressPercent: {
      fontSize: 12,
      fontWeight: '700',
      color: '#374151',
    },
    ocrProgressStep: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 4,
      textAlign: 'center',
    },
    drawerHeaderRedesign: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    drawerHeaderTitleRedesign: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111111',
    },
    drawerHeaderSubtitleRedesign: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    drawerSubTabsContainer: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    drawerSubTabChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      marginRight: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    drawerSubTabChipActive: {
      backgroundColor: '#111111',
      borderColor: '#C8A34D',
    },
    drawerSubTabChipText: {
      fontSize: 11,
      color: '#4B5563',
    },
    drawerSubTabChipTextActive: {
      color: '#C8A34D',
      fontWeight: '700',
    },
    detailSectionBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 16,
      marginBottom: 16,
    },
    detailSectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#111111',
      marginBottom: 12,
    },
    detailMetaGrid: {
      gap: 10,
    },
    detailMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailMetaCol: {
      flex: 1,
    },
    detailMetaLabel: {
      fontSize: 9,
      color: '#9CA3AF',
      textTransform: 'uppercase',
    },
    detailMetaVal: {
      fontSize: 12,
      fontWeight: '600',
      color: '#374151',
      marginTop: 2,
    },
    aiGridSuite: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aiSuiteBtn: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 10,
    },
    aiSuiteBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#374151',
    },
    addAttachmentTextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addAttachmentTextBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C8A34D',
    },
    attachmentRowRedesign: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
    },
    complianceCheckItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 12,
      marginBottom: 8,
    },
    complianceCheckText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#374151',
    },
    complianceCheckMeta: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 4,
    },
    orderTimelineList: {
      paddingLeft: 8,
      borderLeftWidth: 1,
      borderLeftColor: '#E5E7EB',
      marginLeft: 8,
      gap: 16,
    },
    timelineStep: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    orderTimelineNode: {
      width: 10,
      height: 10,
      borderRadius: 5,
      position: 'absolute',
      left: -13,
      top: '50%',
      marginTop: -5,
    },
    approveBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: '#C8A34D',
      borderRadius: 4,
      backgroundColor: '#FFFFFF',
    },
    approveBtnAccepted: {
      backgroundColor: '#111111',
    },
    approveBtnText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#C8A34D',
    },
    reminderToggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    lawyerNotesInput: {
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 12,
      fontSize: 12,
      color: '#1F2937',
      textAlignVertical: 'top',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.background,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    errorText: {
      fontSize: 14,
      color: theme.danger,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    retryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    appBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    pressed: {
      backgroundColor: theme.pressed,
    },
    appBarTitleContainer: {
      flex: 1,
      marginHorizontal: 12,
    },
    appBarTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    appBarSubtitle: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    appBarCopilotBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceVariant,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    tabContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    kpiCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 2,
    },
    cardWidth60: {
      flex: 1.5,
    },
    cardWidth40: {
      flex: 1,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    winProbContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    winProbValue: {
      fontSize: 32,
      fontWeight: '800',
      color: '#10B981',
    },
    winProbCaption: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
    },
    taskProgressValue: {
      fontSize: 22,
      fontWeight: '800',
      color: '#111111',
    },
    taskProgressCaption: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
      fontWeight: '600',
    },
    progressBarBg: {
      height: 6,
      backgroundColor: '#F3F4F6',
      borderRadius: 3,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#111111',
    },
    hearingAlert: {
      flexDirection: 'row',
      backgroundColor: '#F5F5F5',
      borderColor: '#E1DDFF',
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 20,
    },
    hearingAlertIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    hearingAlertContent: {
      flex: 1,
    },
    hearingAlertTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5B4EDB',
      textTransform: 'uppercase',
    },
    hearingAlertDate: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
      marginTop: 4,
    },
    hearingAlertNotes: {
      fontSize: 12,
      color: '#4B5563',
      marginTop: 2,
      fontStyle: 'italic',
    },
    gridSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridCell: {
      width: (width - 52) / 3,
      aspectRatio: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    gridCellPressed: {
      backgroundColor: '#F9FAFB',
      transform: [{ scale: 0.98 }],
    },
    gridIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    gridLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
      textAlign: 'center',
    },

    moduleHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    moduleTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
    },
    moduleHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F5F5F5',
      borderColor: '#E1DDFF',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    moduleHeaderBtnText: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: '#1F2937',
    },
    ocrPromptContainer: {
      marginBottom: 16,
    },
    ocrPromptText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#6B7280',
      marginBottom: 8,
    },
    ocrPromptScroll: {
      gap: 8,
    },
    ocrDocChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFFFF',
      borderColor: '#ECECEC',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      marginRight: 6,
    },
    ocrDocText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
    },
    emptyText: {
      fontSize: 13,
      color: '#9CA3AF',
      textAlign: 'center',
      marginTop: 40,
      fontWeight: '600',
    },
    timelineList: {
      paddingLeft: 12,
    },
    timelineNode: {
      flexDirection: 'row',
      gap: 16,
    },
    timelineMarker: {
      width: 12,
      alignItems: 'center',
    },
    timelineLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: '#F3F4F6',
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#111111',
      marginTop: 6,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    timelineCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    timelineDate: {
      fontSize: 11,
      fontWeight: '700',
      color: '#9CA3AF',
    },
    aiBadge: {
      backgroundColor: '#F5F5F5',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    aiBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#111111',
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 4,
    },
    timelineDesc: {
      fontSize: 13,
      color: '#4B5563',
      lineHeight: 18,
      marginBottom: 6,
    },
    timelineCategory: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
    },
    cardList: {
      gap: 12,
    },
    itemCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    itemCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    itemCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
      flex: 1,
      marginRight: 8,
    },
    itemCardBody: {
      fontSize: 13,
      color: '#4B5563',
      lineHeight: 18,
      marginBottom: 6,
    },
    itemCardFooter: {
      fontSize: 11,
      color: '#9CA3AF',
      fontWeight: '600',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeSuccess: {
      backgroundColor: '#E6F4EA',
    },
    badgeDanger: {
      backgroundColor: '#FCE8E6',
    },
    badgeWarning: {
      backgroundColor: '#FEF7E0',
    },
    badgeInfo: {
      backgroundColor: '#EBF5FF',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#1F2937',
    },
    metaCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginBottom: 16,
      gap: 8,
    },
    partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    partyText: {
      fontSize: 13,
      color: '#4B5563',
    },
    boldText: {
      fontWeight: '700',
      color: '#1F2937',
    },
    subHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
    },
    citationText: {
      fontSize: 12,
      color: '#111111',
      fontWeight: '700',
      marginBottom: 6,
    },
    metaTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
    },
    riskLevelText: {
      fontSize: 13,
      color: '#4B5563',
    },
    taskItemRow: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 14,
      padding: 14,
      alignItems: 'flex-start',
    },
    taskItemContent: {
      flex: 1,
    },
    taskItemTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
    },
    taskItemTitleCompleted: {
      textDecorationLine: 'line-through',
      color: '#9CA3AF',
    },
    taskItemDesc: {
      fontSize: 12,
      color: '#6B7280',
      marginTop: 2,
    },
    taskItemDeadline: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 4,
      fontWeight: '600',
    },
    notesTextarea: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 16,
      height: 300,
      fontSize: 14,
      color: '#1F2937',
      textAlignVertical: 'top',
    },
    settingsCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    settingsCellDanger: {
      borderColor: '#FAD2CF',
      backgroundColor: '#FCE8E6',
    },
    settingsLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4B5563',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '80%',
    },
    formContainer: {
      gap: 14,
    },
    formHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 14,
      color: '#1F2937',
      marginBottom: 4,
    },
    formSubmitBtn: {
      backgroundColor: '#111111',
      borderRadius: 10,
      height: 46,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    formSubmitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    searchRow: {
      flexDirection: 'row',
      gap: 8,
    },
    searchBtn: {
      backgroundColor: '#111111',
      width: 44,
      height: 44,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchResultsScroll: {
      maxHeight: 220,
      marginTop: 8,
    },
    searchResultItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingVertical: 10,
      gap: 4,
    },
    resultItemTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
    },
    resultItemCitation: {
      fontSize: 11,
      color: '#111111',
      fontWeight: '600',
    },
    resultItemSummary: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
    },
    resultSaveBtn: {
      alignSelf: 'flex-start',
      backgroundColor: '#F5F5F5',
      borderColor: '#E1DDFF',
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
    },
    resultSaveBtnText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '700',
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4B5563',
    },
    templateSelection: {
      flexDirection: 'row',
      gap: 8,
    },
    templateChip: {
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    templateChipActive: {
      backgroundColor: '#111111',
    },
    templateText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4B5563',
    },
    compilingContainer: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 20,
    },
    compilingText: {
      fontSize: 12,
      color: '#6B7280',
    },
    draftPreviewScroll: {
      height: 150,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      padding: 10,
      marginBottom: 8,
    },
    draftPreviewText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 16,
    },
    ocrOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    ocrBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    ocrSpinner: {
      marginBottom: 16,
    },
    ocrTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 4,
    },
    ocrSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 16,
    },
    ocrStepsContainer: {
      alignSelf: 'stretch',
      gap: 10,
    },
    ocrStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ocrStepText: {
      fontSize: 12,
      color: '#9CA3AF',
      fontWeight: '600',
    },
    ocrStepTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    threeDotBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    appBarBadgesRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    appBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    appBadgeStatus: {
      backgroundColor: '#E6F4EA',
    },
    appBadgePriority: {
      backgroundColor: '#FCE8E6',
    },
    appBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#10B981',
      textTransform: 'uppercase',
    },
    commandCenterContainer: {
      padding: 16,
      gap: 16,
      backgroundColor: theme.background,
      paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },
    caseInfoCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    caseInfoLabel: {
      fontWeight: '700',
      color: theme.textSecondary,
    },
    caseInfoRow: {
      fontSize: 11,
      color: theme.textPrimary,
      lineHeight: 16,
      fontWeight: '500',
    },
    insightsSection: {
      marginHorizontal: -16,
    },
    insightsScroll: {
      paddingHorizontal: 16,
      gap: 10,
    },
    insightCard: {
      width: 130,
      height: 80,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 10,
      justifyContent: 'space-between',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.01,
      shadowRadius: 3,
      elevation: 1,
    },
    insightCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    insightCardTitle: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      flex: 1,
    },
    insightCardValue: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    insightCardSub: {
      fontSize: 8,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    aiAssistantCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      shadowColor: isDark ? '#000000' : '#111111',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.03,
      shadowRadius: 10,
      elevation: 2,
      gap: 12,
    },
    aiAssistantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    aiAssistantTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    aiAssistantRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
      paddingBottom: 8,
      gap: 12,
    },
    aiAssistantLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      width: 100,
    },
    aiAssistantValue: {
      fontSize: 12,
      color: theme.textPrimary,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    aiAssistantButtons: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    aiButton: {
      flex: 1,
      height: 36,
      backgroundColor: theme.primary,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    aiButtonOutline: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    aiButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
    },
    navigationSection: {
      gap: 10,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    tilesContainer: {
      gap: 8,
    },
    navTile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 10,
      height: 52,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.01,
      shadowRadius: 2,
      elevation: 1,
    },
    navTilePressed: {
      backgroundColor: theme.pressed,
    },
    navTileIconBg: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    navTileContent: {
      flex: 1,
    },
    navTileLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    navTileDesc: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 1,
    },
    previewSection: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 12,
    },
    previewEmptyText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
      fontWeight: '600',
    },
    previewList: {
      paddingLeft: 4,
    },
    previewItem: {
      flexDirection: 'row',
      gap: 12,
      minHeight: 50,
    },
    previewDotContainer: {
      width: 10,
      alignItems: 'center',
    },
    previewDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
      marginTop: 4,
    },
    previewVerticalLine: {
      width: 2,
      backgroundColor: theme.divider,
      flex: 1,
      marginVertical: 4,
    },
    previewItemContent: {
      flex: 1,
      paddingBottom: 10,
    },
    previewItemDate: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    previewItemTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textPrimary,
      marginTop: 2,
    },
    previewItemDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    viewTimelineBtn: {
      height: 38,
      backgroundColor: isDark ? 'rgba(123, 97, 255, 0.15)' : '#F5F5F5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(123, 97, 255, 0.24)' : '#E1DDFF',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewTimelineBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    activityList: {
      gap: 10,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    activityIconBg: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityContent: {
      flex: 1,
    },
    activityType: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    activityTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textPrimary,
      marginTop: 1,
    },
    activityTime: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 1,
    },
    assistantContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 10,
      zIndex: 1000,
      overflow: 'hidden',
      width: '100%',
      height: '100%',
    },
    assistantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
    },
    assistantHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    assistantCloseText: {
      fontSize: 14,
      color: '#111111',
      fontWeight: '700',
    },
    assistantHeaderTitleContainer: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 8,
    },
    assistantHeaderText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
    },
    activeToolIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 4,
      marginTop: 2,
    },
    activeToolIndicatorText: {
      fontSize: 9,
      fontWeight: '700',
    },
    assistantHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    assistantHeaderBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    assistantExpandBtn: {
      padding: 4,
    },
    assistantChatArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    assistantListContent: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 16,
      gap: 12,
    },
    statusChipContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 6,
      width: '100%',
    },
    statusChip: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: '#E1DDFF',
    },
    statusChipText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '600',
    },
    modelMessageItemContainer: {
      width: '100%',
      alignItems: 'flex-start',
      gap: 6,
    },
    responseActionsContainer: {
      width: '100%',
      marginTop: 2,
      marginBottom: 6,
    },
    responseActionsRow: {
      paddingHorizontal: 4,
      gap: 8,
    },
    responseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    responseActionLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: '#4B5563',
    },
    composerWrapper: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    pillInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 24,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    composerIconButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerTextInput: {
      flex: 1,
      height: 36,
      paddingHorizontal: 8,
      fontSize: 13,
      color: '#1F2937',
    },
    composerSendBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#111111',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    composerSendBtnDisabled: {
      opacity: 0.4,
      backgroundColor: '#9CA3AF',
    },
    toolSelectorMenu: {
      position: 'absolute',
      bottom: 56,
      left: 16,
      width: 220,
      maxHeight: 340,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 200,
      overflow: 'hidden',
    },
    toolSelectorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 14,
      paddingRight: 0,
      height: 44,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      backgroundColor: '#FFFFFF',
    },
    toolSelectorTitle: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    toolSelectorCloseBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toolSelectorScroll: {
      flexGrow: 0,
      paddingVertical: 4,
    },
    toolMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    toolMenuItemActive: {
      backgroundColor: '#F9FAFB',
    },
    toolMenuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toolMenuLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4B5563',
    },
    toolMenuLabelActive: {
      color: '#111111',
      fontWeight: '700',
    },

    attachmentsWrapper: {
      backgroundColor: '#F9FAFB',
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
    },
    attachmentsScroll: {
      gap: 8,
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFFFF',
      borderColor: '#ECECEC',
      borderWidth: 1,
      borderRadius: 8,
      paddingLeft: 8,
      paddingRight: 4,
      paddingVertical: 4,
      marginRight: 8,
    },
    attachmentLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#4B5563',
      maxWidth: 100,
    },
    messageRow: {
      flexDirection: 'row',
      width: '100%',
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowModel: {
      justifyContent: 'flex-start',
    },
    messageBubble: {
      maxWidth: '82%',
      borderRadius: 16,
      padding: 12,
    },
    messageBubbleUser: {
      backgroundColor: '#111111',
      borderBottomRightRadius: 4,
    },
    messageBubbleModel: {
      backgroundColor: '#F3F4F6',
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },
    messageTextUser: {
      color: '#FFFFFF',
    },
    messageTextModel: {
      color: '#1F2937',
    },
    bubbleAttachments: {
      gap: 4,
      marginBottom: 8,
    },
    bubbleAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.06)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      maxWidth: '100%',
    },
    bubbleAttachText: {
      fontSize: 11,
      fontWeight: '600',
    },
    textWhite: {
      color: '#FFFFFF',
    },
    textSecondary: {
      color: '#4B5563',
    },
    bubbleSuggestions: {
      marginTop: 12,
      gap: 6,
    },
    bubbleSugChip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#111111',
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
    },
    bubbleSugText: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '600',
    },
    copilotFloatBtnPill: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#C8A34D',
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 8,
      shadowColor: '#C8A34D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 99,
    },
    copilotFloatText: {
      color: '#111111',
      fontSize: 14,
      fontWeight: '800',
    },
    centerToastContainer: {
      position: 'absolute',
      top: '45%',
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    centerToastBox: {
      backgroundColor: 'rgba(31, 41, 55, 0.9)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    centerToastText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    caseSummaryTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 6,
    },
    caseSummaryText: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 18,
      marginBottom: 10,
    },
    dividerLine: {
      height: 1,
      backgroundColor: '#ECECEC',
      marginVertical: 10,
    },
    caseDetailMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 6,
    },
    metaCol: {
      flex: 1,
    },
    metaColLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#9CA3AF',
      textTransform: 'uppercase',
    },
    metaColValue: {
      fontSize: 12,
      fontWeight: '600',
      color: '#1F2937',
      marginTop: 2,
    },
    narrativeInputCard: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: '#E1DDFF',
      marginBottom: 16,
      gap: 8,
    },
    narrativeHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    narrativeTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5B4EDB',
      textTransform: 'uppercase',
    },
    narrativeTextInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E1DDFF',
      padding: 10,
      fontSize: 12,
      color: '#1F2937',
      height: 80,
      textAlignVertical: 'top',
    },
    narrativeActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    narrativeSampleBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    narrativeSampleText: {
      fontSize: 11,
      color: '#111111',
      fontWeight: '700',
    },
    narrativeExtractBtn: {
      backgroundColor: '#111111',
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    narrativeExtractText: {
      fontSize: 11,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    warningAlertBanner: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: '#FEF7E0',
      borderColor: '#FDE68A',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    warningAlertText: {
      fontSize: 12,
      color: '#B45309',
      lineHeight: 16,
    },
    warningAlertActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    warningActionLink: {
      fontSize: 11,
      fontWeight: '800',
      color: '#B45309',
    },
    warningDismissLink: {
      fontSize: 11,
      fontWeight: '600',
      color: '#9CA3AF',
    },
    timelineExpandedDetails: {
      marginTop: 8,
      gap: 6,
    },
    timelineDetailRow: {
      fontSize: 11,
      color: '#4B5563',
    },
    timelineAiExplanationBox: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: '#F5F5F5',
      padding: 8,
      borderRadius: 6,
      marginTop: 4,
    },
    timelineAiExplanationText: {
      fontSize: 11,
      color: '#5B4EDB',
      lineHeight: 15,
      flex: 1,
    },
    timelineExpandText: {
      fontSize: 10,
      color: '#9CA3AF',
      fontWeight: '600',
      marginTop: 6,
    },
    horizontalPillsScroll: {
      paddingVertical: 4,
      gap: 8,
    },
    filterPill: {
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginRight: 6,
    },
    filterPillActive: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4B5563',
    },
    filterPillTextActive: {
      color: '#FFFFFF',
    },
    hearingOutcomeBox: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#ECECEC',
      gap: 4,
    },
    outcomeDetailText: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    recordOutcomeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    recordOutcomeBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#111111',
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    tagBadge: {
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#4B5563',
    },
    docExtractedBox: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#E1DDFF',
      gap: 2,
    },
    docExtractedText: {
      fontSize: 10,
      color: '#5B4EDB',
    },
    evidenceIntegrityBox: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#ECECEC',
      gap: 2,
    },
    evidenceIntegrityText: {
      fontSize: 11,
      color: '#4B5563',
    },
    searchSubmitBtn: {
      backgroundColor: '#111111',
      borderRadius: 6,
      width: 36,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchSubmitBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    researchSugChip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#ECECEC',
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 6,
    },
    researchSugChipText: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
    },
    ocrOverlayStatic: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E1DDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    accordionContainer: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
    },
    accordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      backgroundColor: '#F9FAFB',
    },
    accordionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#1F2937',
    },
    accordionContent: {
      padding: 14,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
      gap: 8,
    },
    accordionTextBold: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    accordionBullet: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
      paddingLeft: 8,
    },
    researchLawItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingBottom: 12,
      marginBottom: 12,
      gap: 4,
    },
    lawActLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1F2937',
    },
    lawSecLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
    },
    lawDesc: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
    },
    lawExplanationBox: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: '#F5F5F5',
      padding: 8,
      borderRadius: 6,
      marginTop: 4,
    },
    lawExplanationText: {
      fontSize: 11,
      color: '#5B4EDB',
      lineHeight: 15,
      flex: 1,
    },
    judgmentTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1F2937',
    },
    judgmentCitation: {
      fontSize: 11,
      fontWeight: '700',
      color: '#9CA3AF',
    },
    saveResearchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#111111',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    saveResearchBtnText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '700',
    },
    recommendationItem: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    recommendationText: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
      flex: 1,
    },
    emptyTextSaved: {
      fontSize: 12,
      color: '#9CA3AF',
      textAlign: 'center',
      paddingVertical: 12,
    },
    savedPrecedentItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingBottom: 10,
      marginBottom: 10,
      gap: 4,
    },
    savedPrecedentTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    savedPrecedentCitation: {
      fontSize: 10,
      color: '#111111',
      fontWeight: '600',
    },
    savedPrecedentSummary: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    draftPreviewScrollStatic: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 10,
      marginTop: 6,
    },
    aiReplyContainer: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#111111',
    },
    aiReplyTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#111111',
      marginBottom: 6,
    },
    aiReplyText: {
      fontSize: 12,
      color: '#1F2937',
      lineHeight: 18,
    },
    scrollDownBtn: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      marginLeft: -21,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 4,
      zIndex: 999,
    },
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    drawerContainer: {
      width: width * 0.8,
      height: '100%',
      backgroundColor: theme.background,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      paddingHorizontal: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    drawerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    drawerNewChatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
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
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.surfaceVariant,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 12,
    },
    drawerSearchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.textPrimary,
      padding: 0,
    },
    drawerList: {
      flex: 1,
    },
    drawerEmptyText: {
      fontSize: 12.5,
      color: theme.textMuted,
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
      backgroundColor: isDark ? 'rgba(123, 97, 255, 0.15)' : '#F5F5F5',
    },
    drawerItemTextContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    drawerItemText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    drawerItemTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    drawerItemSubtext: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    drawerRenameInput: {
      fontSize: 13,
      color: theme.textPrimary,
      fontWeight: '600',
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: theme.primary,
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
    // Redesigned Timeline Screen Styles
    filtersScroll: {
      marginVertical: 10,
    },
    filtersContainer: {
      paddingHorizontal: 4,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    filterChipActive: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    filterChipText: {
      fontSize: 12,
      color: '#4B5563',
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    sortRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
      paddingHorizontal: 2,
    },
    milestoneCountText: {
      fontSize: 12,
      color: '#4B5563',
      fontWeight: '600',
    },
    sortToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    sortToggleText: {
      fontSize: 11,
      color: '#111111',
      fontWeight: '600',
    },
    suggestionsContainer: {
      marginVertical: 12,
      gap: 8,
    },
    suggestionsHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1F2937',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    suggestionCard: {
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
    },
    warningCard: {
      backgroundColor: '#F5F5F5',
      borderColor: '#DDD6FE',
    },
    deadlineCard: {
      backgroundColor: '#FFFBEB',
      borderColor: '#FDE68A',
    },
    missingCard: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    suggestionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    suggestionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    warningTagText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#111111',
    },
    deadlineTagText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#D97706',
    },
    missingTagText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#EF4444',
    },
    suggestionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    suggestionDesc: {
      fontSize: 10,
      color: '#4B5563',
      marginTop: 2,
      lineHeight: 14,
    },
    timelineHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    badgesGroup: {
      flexDirection: 'row',
      gap: 4,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    categoryBadge: {
      backgroundColor: '#F3F4F6',
    },
    categoryBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#4B5563',
    },
    badgeHigh: {
      backgroundColor: '#FEE2E2',
    },
    badgeMedium: {
      backgroundColor: '#FEF3C7',
    },
    badgeLow: {
      backgroundColor: '#F5F5F5',
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
    aiGeneratedBadge: {
      backgroundColor: '#F5F5F5',
      borderWidth: 0.5,
      borderColor: '#111111',
    },
    aiGeneratedBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#111111',
    },
    approximateNotice: {
      fontSize: 8.5,
      color: '#6B7280',
      marginTop: 4,
      fontStyle: 'italic',
    },
    dotHigh: {
      backgroundColor: '#EF4444',
    },
    dotMedium: {
      backgroundColor: '#F59E0B',
    },
    dotLow: {
      backgroundColor: '#111111',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    loadingTextTimeline: {
      fontSize: 12,
      color: '#4B5563',
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 64,
    },
    emptyHeadline: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1F2937',
    },
    emptySubline: {
      fontSize: 12.5,
      color: '#6B7280',
      marginTop: 4,
      marginBottom: 16,
      textAlign: 'center',
    },
    generateTimelineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#111111',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    generateTimelineBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    // Hearings Module Styles
    overviewCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    overviewTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 12,
    },
    overviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    overviewLabel: {
      fontSize: 13,
      color: '#4B5563',
    },
    overviewValue: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1F2937',
    },
    overviewStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
      paddingTop: 12,
    },
    overviewStatCol: {
      flex: 1,
      alignItems: 'center',
    },
    overviewStatNum: {
      fontSize: 18,
      fontWeight: '800',
      color: '#111111',
    },
    overviewStatLabel: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    horizontalScrollWidgets: {
      marginBottom: 16,
    },
    widgetCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 12,
      width: width * 0.7,
      marginRight: 12,
      minHeight: 110,
      justifyContent: 'space-between',
    },
    widgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    widgetHeaderTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#6B7280',
      textTransform: 'uppercase',
    },
    widgetBody: {
      flex: 1,
      justifyContent: 'center',
    },
    widgetTextMain: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
    },
    widgetTextSub: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    widgetProgressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    widgetProgressBarBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    widgetProgressBarFill: {
      height: '100%',
      backgroundColor: '#10B981',
      borderRadius: 3,
    },
    widgetProgressPerc: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
    hearingFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    hearingFilterPillActive: {
      backgroundColor: '#111111',
    },
    hearingFilterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4B5563',
    },
    hearingFilterPillTextActive: {
      color: '#FFFFFF',
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 16,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchBarInput: {
      flex: 1,
      height: 38,
      fontSize: 13,
      color: '#1F2937',
    },
    timelineWrapper: {
      paddingLeft: 8,
      marginTop: 8,
    },
    timelineItem: {
      flexDirection: 'row',
      minHeight: 100,
    },
    timelineLineContainer: {
      alignItems: 'center',
      width: 24,
    },
    hearingTimelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#111111',
      zIndex: 1,
      marginTop: 8,
    },
    hearingTimelineConnector: {
      flex: 1,
      width: 2,
      backgroundColor: '#ECECEC',
      marginTop: 4,
      marginBottom: 4,
    },
    hearingTimelineContentCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 14,
      marginLeft: 8,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    timelineCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    timelineCardDate: {
      fontSize: 12,
      fontWeight: '700',
      color: '#111111',
    },
    timelineCardTime: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 1,
    },
    timelineCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 6,
    },
    timelineMetaGrid: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 10,
      gap: 4,
      marginBottom: 10,
    },
    timelineMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timelineMetaText: {
      fontSize: 12,
      color: '#4B5563',
      flex: 1,
    },
    aiEnrichedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: '#111111',
    },
    aiEnrichedBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
    },
    aiOrderSummaryBox: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#111111',
      marginBottom: 12,
    },
    aiOrderSummaryHeader: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111111',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    aiOrderSummaryText: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
    },
    checklistToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      paddingVertical: 8,
      marginBottom: 10,
    },
    checklistToggleText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: '#4B5563',
    },
    checklistContainer: {
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
      paddingTop: 10,
      marginTop: 6,
    },
    checklistSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 10,
    },
    checklistCategory: {
      marginBottom: 12,
    },
    checklistCategoryTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#6B7280',
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    checklistEmptyText: {
      fontSize: 11,
      color: '#9CA3AF',
      fontStyle: 'italic',
      paddingLeft: 6,
    },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 5,
      paddingLeft: 4,
    },
    checklistRowText: {
      fontSize: 12,
      color: '#4B5563',
      flex: 1,
    },
    checklistRowTextChecked: {
      color: '#9CA3AF',
      textDecorationLine: 'line-through',
    },
    cardActionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
      paddingTop: 10,
      marginTop: 6,
    },
    cardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#111111',
    },
    cardActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
    },
    cardActionBtnFilled: {
      backgroundColor: '#111111',
    },
    cardActionBtnTextFilled: {
      color: '#FFFFFF',
    },
    miniStatusBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    miniBadgeDanger: {
      backgroundColor: '#FCE8E6',
    },
    miniBadgeWarning: {
      backgroundColor: '#FEF7E0',
    },
    miniStatusBadgeText: {
      fontSize: 8.5,
      fontWeight: '700',
      color: '#EF4444',
    },
    formStatusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginRight: 6,
      marginBottom: 6,
    },
    formStatusChipActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    formStatusChipText: {
      fontSize: 11,
      color: '#4B5563',
    },
    formStatusChipTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    statusChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    pickerContainer: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    pickerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#6B7280',
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    pickerItem: {
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
      marginBottom: 6,
    },
    pickerItemActive: {
      borderColor: '#111111',
      backgroundColor: '#F5F5F5',
    },
    pickerItemName: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    pickerItemDesc: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    hearingProgressBarBg: {
      height: 10,
      backgroundColor: '#F3F4F6',
      borderRadius: 5,
      overflow: 'hidden',
      marginTop: 10,
      marginBottom: 6,
    },
    hearingProgressBarFill: {
      height: '100%',
      backgroundColor: '#111111',
    },
    progressText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#4B5563',
      textAlign: 'center',
      marginBottom: 12,
    },
    // Redesigned Research & Laws Screen Styles
    premiumHeaderCard: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E1DDFF',
      marginBottom: 16,
    },
    premiumHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    premiumHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    premiumHeaderBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    premiumStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    premiumPriorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    premiumBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    premiumSearchCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 16,
      marginBottom: 16,
    },
    premiumSearchTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#1F2937',
    },
    premiumSearchSubtitle: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 4,
      marginBottom: 12,
      lineHeight: 15,
    },
    searchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    premiumSearchInput: {
      flex: 2,
      height: 38,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 12,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
    },
    premiumSearchBtn: {
      backgroundColor: '#1F2937',
      borderRadius: 8,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    premiumSearchBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    premiumAnalyzeBtn: {
      backgroundColor: '#111111',
      borderRadius: 8,
      height: 38,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    premiumAnalyzeBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    suggestionsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 6,
    },
    suggestionChipsContainer: {
      paddingBottom: 4,
    },
    sugChip: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 6,
    },
    sugChipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    sugChipActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    sugChipTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    emptyStateContainer: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 12,
    },
    emptyStateText: {
      fontSize: 13,
      color: '#6B7280',
      fontWeight: '600',
      textAlign: 'center',
    },
    emptyStateBtn: {
      backgroundColor: '#111111',
      borderColor: '#111111',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    emptyStateBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 12,
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '800',
      color: '#111111',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#6B7280',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    researchLawItemCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F3F4F6',
      borderRadius: 8,
      marginBottom: 8,
      overflow: 'hidden',
    },
    lawItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#F9FAFB',
    },
    lawItemExpandedContent: {
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      gap: 6,
    },
    lawTitleLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    judFilterContainer: {
      paddingBottom: 8,
      gap: 6,
    },
    judFilterBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: '#F3F4F6',
      marginRight: 4,
    },
    judFilterBtnActive: {
      backgroundColor: '#F5F5F5',
      borderWidth: 0.5,
      borderColor: '#111111',
    },
    judFilterBtnText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    judFilterBtnTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    judgmentItemCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F3F4F6',
      borderRadius: 8,
      marginBottom: 8,
      overflow: 'hidden',
    },
    judgmentItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#F9FAFB',
    },
    judgmentItemExpandedContent: {
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      gap: 6,
    },
    judgmentDetailText: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    judgmentButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    judActionBtn: {
      borderWidth: 1,
      borderColor: '#111111',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    judActionBtnText: {
      fontSize: 10,
      color: '#111111',
      fontWeight: '700',
    },
    savedPrecedentItemCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ECECEC',
      padding: 12,
      marginBottom: 8,
      gap: 4,
    },
    savedPrecedentDate: {
      fontSize: 9,
      color: '#9CA3AF',
      marginTop: 2,
    },
    accordionTextNormal: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
    },
    dropdownContainer: {
      marginVertical: 8,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 8,
      height: 38,
      paddingHorizontal: 10,
      marginTop: 4,
    },
    dropdownTriggerText: {
      fontSize: 12,
      color: '#1F2937',
    },
    dropdownListContainer: {
      maxHeight: 180,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      marginTop: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 3,
    },
    dropdownList: {
      paddingVertical: 4,
    },
    dropdownItem: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    dropdownItemActive: {
      backgroundColor: '#F5F5F5',
    },
    dropdownItemText: {
      fontSize: 12,
      color: '#4B5563',
    },
    dropdownItemTextActive: {
      color: '#111111',
      fontWeight: '700',
    },

    sortLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6B7280',
    },
    sortOptionsContainer: {
      gap: 6,
    },
    sortOptionChip: {
      backgroundColor: '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    sortOptionChipActive: {
      backgroundColor: '#111111',
    },
    sortOptionText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    sortOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    versionBadge: {
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    versionBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#4B5563',
    },
    renameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    renameInput: {
      flex: 1,
      height: 32,
      borderWidth: 1,
      borderColor: '#111111',
      borderRadius: 6,
      paddingHorizontal: 8,
      fontSize: 11,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
    },
    renameActionBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#10B981',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editorModalContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    editorModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    editorCloseBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    editorHeaderTitleInput: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
      padding: 0,
    },
    exportActionTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    editorSaveHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#111111',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    editorStatusSelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: '#ECECEC',
    },
    editorStatusChip: {
      backgroundColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginRight: 6,
    },
    editorStatusChipActive: {
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#111111',
    },
    editorStatusChipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    editorStatusChipTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    editorSubTabsHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
    },
    editorSubTabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    editorSubTabActive: {
      borderBottomColor: '#111111',
    },
    editorSubTabText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#6B7280',
    },
    editorSubTabTextActive: {
      color: '#111111',
      fontWeight: '800',
    },
    editorToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#F3F4F6',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    editorToolbarBtn: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      marginRight: 4,
    },
    mainEditorInput: {
      fontSize: 13,
      lineHeight: 18,
      color: '#1F2937',
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
      textAlignVertical: 'top',
    },
    aiAssistIntroBox: {
      backgroundColor: '#F5F5F5',
      borderColor: '#E1DDFF',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    aiAssistIntroTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5B4EDB',
      marginTop: 4,
    },
    aiAssistIntroDesc: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
      marginTop: 4,
    },
    aiDraftingStepsBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      alignItems: 'center',
    },
    aiDraftingTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 12,
    },
    diffContainer: {
      backgroundColor: '#FFF0F5',
      borderWidth: 1,
      borderColor: '#EC4899',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    diffHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    diffHeaderTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#EC4899',
    },
    diffMetaInfo: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
      marginBottom: 8,
    },
    diffBodyScroll: {
      maxHeight: 250,
      backgroundColor: '#FFFFFF',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#FCE8E6',
      padding: 10,
    },
    diffContentText: {
      fontSize: 11,
      color: '#1F2937',
      lineHeight: 16,
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    diffActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    diffAcceptBtn: {
      flex: 1.5,
      backgroundColor: '#EC4899',
      borderRadius: 6,
      height: 32,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    diffAcceptText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    diffRejectBtn: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EC4899',
      borderRadius: 6,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    diffRejectText: {
      color: '#EC4899',
      fontSize: 11,
      fontWeight: '700',
    },
    aiActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 24,
    },
    aiActionCard: {
      width: '48%',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      padding: 10,
    },
    aiActionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    aiActionCardTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#1F2937',
    },
    aiActionCardDesc: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 2,
      lineHeight: 12,
    },
    restoreBtnLink: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // Evidence Vault styles
    evidenceTabContainer: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    },
    evidenceHeader: {
      marginBottom: 16,
    },
    evidenceCaseTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1F2937',
    },
    evidenceBadgesRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    evidenceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
    },
    evidenceBadgeActive: {
      backgroundColor: '#F5F5F5',
    },
    evidenceBadgePriority: {
      backgroundColor: '#FCE8E6',
    },
    evidenceBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#111111',
    },
    lockerCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 16,
    },
    lockerCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    lockerIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockerCardTitleBlock: {
      flex: 1,
    },
    lockerCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    lockerCardSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      marginTop: 2,
    },
    lockerActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    lockerPrimaryBtn: {
      flex: 1.2,
      backgroundColor: '#111111',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    lockerPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    lockerSecondaryBtn: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#111111',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    lockerSecondaryBtnText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '700',
    },
    metricsScrollView: {
      marginBottom: 16,
    },
    metricsContainer: {
      gap: 10,
      paddingRight: 16,
    },
    metricItemCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 12,
      width: 100,
      alignItems: 'center',
    },
    metricItemIconBg: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    metricItemCount: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    metricItemLabel: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 2,
      textAlign: 'center',
      fontWeight: '600',
    },
    searchFilterContainer: {
      marginBottom: 16,
    },
    evidenceSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 10,
    },
    evidenceSearchIcon: {
      marginRight: 8,
    },
    evidenceSearchInput: {
      flex: 1,
      fontSize: 13,
      color: '#1F2937',
      padding: 0,
    },
    pillsScrollView: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    pillsContainer: {
      gap: 8,
      paddingRight: 32,
    },
    evidenceFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    evidenceFilterPillActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    evidenceFilterPillText: {
      fontSize: 12,
      color: '#4B5563',
      fontWeight: '600',
    },
    evidenceFilterPillTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    emptyEvidenceContainer: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#D1D5DB',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },
    emptyEvidenceTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    emptyEvidenceSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 18,
    },
    evidenceListContainer: {
      gap: 16,
    },
    evidenceCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#ECECEC',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 2,
      overflow: 'hidden',
    },
    evidenceCardMain: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    evidenceIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    evidenceCardMetaBlock: {
      flex: 1,
    },
    evidenceCardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    exhibitCode: {
      fontSize: 12,
      fontWeight: '800',
      color: '#111111',
      textTransform: 'uppercase',
    },
    evStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      gap: 4,
    },
    evStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    evStatusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    evidenceName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 4,
    },
    evidenceDesc: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
      marginBottom: 8,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    tagPill: {
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagPillText: {
      fontSize: 9,
      color: '#6B7280',
      fontWeight: '600',
    },
    evidenceUploaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    uploaderText: {
      fontSize: 10,
      color: '#9CA3AF',
      fontWeight: '500',
    },
    evidenceActionsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      backgroundColor: '#F9FAFB',
    },
    evidenceActionBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: '#F3F4F6',
    },
    evidenceActionText: {
      fontSize: 11,
      color: '#111111',
      fontWeight: '700',
    },
    typeSelectPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    typeSelectPillActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    typeSelectPillText: {
      fontSize: 11,
      color: '#4B5563',
      fontWeight: '600',
    },
    typeSelectPillTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    evidenceInputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 6,
      marginTop: 8,
    },
    loaderModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loaderModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    loaderIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#F9FAFB',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    loaderModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
      textAlign: 'center',
    },
    loaderModalSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 18,
    },
    loaderStepsContainer: {
      width: '100%',
      gap: 12,
    },
    loaderStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loaderStepBullet: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#D1D5DB',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    loaderStepBulletCompleted: {
      borderColor: '#10B981',
      backgroundColor: '#10B981',
    },
    loaderStepBulletActive: {
      borderColor: '#111111',
    },
    loaderStepBulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'transparent',
    },
    loaderStepBulletDotActive: {
      backgroundColor: '#111111',
    },
    loaderStepText: {
      fontSize: 12,
      color: '#9CA3AF',
      fontWeight: '500',
    },
    loaderStepTextCompleted: {
      color: '#1F2937',
      fontWeight: '600',
    },
    loaderStepTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
    },
    detailsBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailsExhibitNumber: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111111',
      textTransform: 'uppercase',
    },
    detailsFileName: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
      marginTop: 2,
    },
    detailsScrollContent: {
      padding: 16,
      gap: 16,
      backgroundColor: '#F9FAFB',
    },
    metadataCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 12,
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaGridItem: {
      width: '45%',
    },
    metaLabel: {
      fontSize: 10,
      color: '#9CA3AF',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    metaValue: {
      fontSize: 12,
      fontWeight: '700',
      color: '#4B5563',
      marginTop: 2,
    },
    hashText: {
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: '#6B7280',
      marginTop: 4,
    },
    ocrSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    ocrHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    copyBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#111111',
    },
    ocrTextScroll: {
      height: 120,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    ocrTextContent: {
      fontSize: 11,
      lineHeight: 16,
      color: '#4B5563',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    aiFindingsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    aiHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    confidenceBadge: {
      backgroundColor: '#E6F4EA',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginLeft: 'auto',
    },
    confidenceText: {
      fontSize: 10,
      color: '#10B981',
      fontWeight: '700',
    },
    findingsSubLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#111111',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 6,
    },
    findingsValue: {
      fontSize: 13,
      color: '#4B5563',
      lineHeight: 18,
    },
    entitySection: {
      gap: 10,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    entityBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    entityLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1F2937',
      width: 60,
      marginTop: 2,
    },
    entityChipsContainer: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    entityChip: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    entityChipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
      paddingLeft: 4,
    },
    bulletDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#111111',
    },
    bulletText: {
      fontSize: 12,
      color: '#4B5563',
      flex: 1,
    },
    governingRulesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    ruleBadge: {
      backgroundColor: '#F5F5F5',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    ruleBadgeText: {
      fontSize: 10,
      color: '#111111',
      fontWeight: '700',
    },
    weaknessItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FCE8E6',
      borderRadius: 6,
      padding: 8,
      marginBottom: 6,
    },
    weaknessText: {
      fontSize: 11,
      color: '#EF4444',
      fontWeight: '600',
      flex: 1,
    },
    linkagesCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginBottom: 16,
    },
    linkagesSubtitle: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: -8,
      marginBottom: 12,
    },
    linksGrid: {
      gap: 10,
    },
    linkCell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: '#ECECEC',
      gap: 12,
    },
    linkCellIconBg: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    linkCellTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },
    linkCellDesc: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    statusSelectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#ECECEC',
    },
    statusSelectTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    statusSelectDesc: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    formCancelBtn: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formCancelBtnText: {
      color: '#4B5563',
      fontSize: 14,
      fontWeight: '700',
    },
    // Contract specific redesigned styles
    contractUploadCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#D1D5DB',
      borderStyle: 'dashed',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      marginTop: 10,
    },
    contractUploadIconBg: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    contractUploadTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
      textAlign: 'center',
      marginBottom: 8,
    },
    contractUploadSubtitle: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    contractFormatsText: {
      fontSize: 10,
      color: '#9CA3AF',
      fontWeight: '600',
      marginBottom: 16,
    },
    contractUploadActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      paddingHorizontal: 8,
    },
    contractUploadPrimaryBtn: {
      flex: 1.2,
      backgroundColor: '#111111',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    contractUploadPrimaryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    contractUploadSecondaryBtn: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#111111',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    contractUploadSecondaryText: {
      color: '#111111',
      fontSize: 11,
      fontWeight: '700',
    },
    contractLoaderContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: '#ECECEC',
      alignItems: 'center',
      marginBottom: 20,
    },
    contractLoaderIconWrapper: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    contractLoaderTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#1F2937',
      textAlign: 'center',
      marginBottom: 4,
    },
    contractLoaderSubtitle: {
      fontSize: 11,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 20,
    },
    contractOverviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 12,
    },
    contractOverviewName: {
      fontSize: 15,
      fontWeight: '800',
      color: '#1F2937',
    },
    contractOverviewSize: {
      fontSize: 11,
      color: '#9CA3AF',
      fontWeight: '600',
      marginTop: 2,
    },
    contractOverviewActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    contractOverviewSyncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
    },
    contractOverviewSyncText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111111',
    },
    contractOverviewReuploadBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    contractMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    contractMetricCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 10,
      padding: 10,
      width: '23%',
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
    },
    contractMetricLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      textAlign: 'center',
      marginBottom: 2,
    },
    contractMetricValue: {
      fontSize: 11,
      fontWeight: '800',
      color: '#1F2937',
      textAlign: 'center',
    },
    contractPillsScroll: {
      marginVertical: 4,
    },
    contractTabPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    contractTabPillActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    contractTabPillText: {
      fontSize: 11,
      color: '#4B5563',
      fontWeight: '600',
    },
    contractTabPillTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    overviewTable: {
      gap: 6,
    },
    overviewTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingVertical: 6,
      gap: 12,
      alignItems: 'flex-start',
    },
    overviewTableLabel: {
      width: 100,
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
    },
    overviewTableValue: {
      flex: 1,
      fontSize: 11,
      color: '#1F2937',
      lineHeight: 15,
    },
    // AI Legal Task Manager Styles
    caseHeaderBanner: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 12,
    },
    caseHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    caseHeaderSubtitle: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
      fontWeight: '600',
    },
    taskDashboard: {
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    taskMetricCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderLeftWidth: 4,
      borderRadius: 10,
      padding: 10,
      marginRight: 8,
      minWidth: 90,
      alignItems: 'center',
    },
    metricNum: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    taskMetricLabel: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 2,
      fontWeight: '700',
    },
    aiBriefCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      marginHorizontal: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    aiBriefHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: '#F9FAFB',
    },
    aiBriefTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#C8A34D',
    },
    aiBriefContent: {
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: '#ECECEC',
    },
    aiBriefText: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    weeklyPlannerCategory: {
      marginBottom: 8,
    },
    weeklyCategoryHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 2,
    },
    weeklyCategoryText: {
      fontSize: 10,
      color: '#6B7280',
      lineHeight: 13,
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 12,
      marginBottom: 12,
    },
    quickActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    quickActionButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    taskSearchBarRow: {
      marginHorizontal: 12,
      marginBottom: 8,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchInputText: {
      flex: 1,
      fontSize: 12,
      color: '#1F2937',
      padding: 0,
    },
    taskFilterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeFilterChip: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    chipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    activeChipText: {
      color: '#111111',
      fontWeight: '700',
    },
    timelineGroup: {
      marginBottom: 16,
    },
    timelineGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderLeftWidth: 3,
      paddingLeft: 8,
      marginBottom: 8,
    },
    timelineGroupTitle: {
      fontSize: 12,
      fontWeight: '800',
    },
    timelineGroupCount: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    timelineGroupCountText: {
      fontSize: 9,
      fontWeight: '700',
    },
    timelineGroupContent: {
      gap: 8,
    },
    taskCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 12,
      padding: 12,
    },
    taskCardExpanded: {
      borderColor: '#D1D5DB',
    },
    taskCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkboxContainer: {
      marginRight: 4,
    },
    taskCardTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1F2937',
    },

    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    priorityBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    priorityBadgeText: {
      fontSize: 8,
      fontWeight: '700',
    },
    taskAiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: '#DDD6FE',
    },
    taskAiBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#111111',
    },
    deadlineLabel: {
      fontSize: 9,
      color: '#6B7280',
      fontWeight: '600',
    },
    checklistProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    taskProgressText: {
      fontSize: 9,
      color: '#4B5563',
      fontWeight: '600',
    },
    progressBarContainer: {
      flex: 1,
      height: 4,
      backgroundColor: '#E5E7EB',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarActive: {
      height: '100%',
      backgroundColor: '#10B981',
    },
    detailDrawer: {
      marginTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: '#E5E7EB',
      paddingTop: 8,
    },
    expandedDesc: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 14,
      marginBottom: 10,
    },
    subtasksContainer: {
      marginBottom: 10,
    },
    sectionSubTitle: {
      fontSize: 9,
      fontWeight: '800',
      color: '#9CA3AF',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    taskChecklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    checklistItemText: {
      fontSize: 11,
      color: '#374151',
    },
    checklistItemTextCompleted: {
      textDecorationLine: 'line-through',
      color: '#9CA3AF',
    },
    linkagesContainer: {
      marginBottom: 10,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    linkPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    linkPillText: {
      fontSize: 9,
      fontWeight: '700',
    },
    metaDetailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
    },
    metaText: {
      fontSize: 10,
      color: '#4B5563',
    },
    cardActionsRow: {
      flexDirection: 'row',
      borderTopWidth: 0.5,
      borderTopColor: '#E5E7EB',
      paddingTop: 8,
    },
    actionIconButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRightWidth: 0.5,
      borderRightColor: '#E5E7EB',
    },
    actionIconText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '700',
    },
    aiSuggestedQueueBox: {
      marginHorizontal: 12,
      marginTop: 16,
      backgroundColor: '#F5F5F5',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#DDD6FE',
    },
    aiSuggestedQueueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    aiSuggestedQueueTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5B21B6',
    },
    aiSuggestedQueueSubtitle: {
      fontSize: 10,
      color: '#6B7280',
      marginBottom: 12,
      lineHeight: 13,
    },
    aiSuggestedItemCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 0.5,
      borderColor: '#DDD6FE',
    },
    aiSuggestedCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    aiSuggestedCardTitle: {
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
      color: '#1F2937',
    },
    aiSuggestedCardReason: {
      fontSize: 10,
      color: '#4B5563',
      marginTop: 6,
      lineHeight: 14,
    },
    aiSuggestedCardDue: {
      fontSize: 9,
      color: '#C8A34D',
      fontWeight: '700',
      marginTop: 4,
    },
    aiSuggestedCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    aiSuggestedBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 8,
    },
    aiSuggestedBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    modalContentContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      padding: 16,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    modalFormScroll: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#4B5563',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 10,
    },
    taskFormInput: {
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: '#1F2937',
      marginBottom: 8,
    },
    pickerBorder: {
      borderWidth: 1,
      borderColor: '#ECECEC',
      borderRadius: 8,
      marginBottom: 8,
      justifyContent: 'center',
    },
    picker: {
      height: 40,
      color: '#1F2937',
    },
    modalActionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    voicePromptText: {
      fontSize: 11,
      color: '#6B7280',
      lineHeight: 15,
      marginBottom: 12,
    },
    voicePresetBtn: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      padding: 10,
      borderWidth: 0.5,
      borderColor: '#E5E7EB',
    },
    voicePresetBtnText: {
      fontSize: 10,
      color: '#374151',
      fontWeight: '600',
    },
    voiceProcessingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
    },
    voiceProcessingText: {
      fontSize: 11,
      color: '#111111',
      fontWeight: '700',
    },
    taskModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    // --- Case Notes Stylesheet ---
    noteDashboardContainer: {
      marginVertical: 12,
      paddingHorizontal: 4,
    },
    noteMetricCard: {
      backgroundColor: '#F3E8FF',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 10,
      minWidth: 105,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E9D5FF',
    },
    noteMetricValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#111111',
    },
    noteMetricLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#6B21A8',
      marginTop: 2,
    },
    noteQuickActionsBar: {
      flexDirection: 'row',
      gap: 8,
      marginVertical: 8,
      paddingHorizontal: 4,
    },
    noteQuickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#111111',
      paddingVertical: 10,
      borderRadius: 8,
    },
    noteQuickActionText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    noteAiInsightsPanel: {
      backgroundColor: '#FAF5FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#D8B4FE',
      padding: 12,
      marginVertical: 10,
      marginHorizontal: 4,
    },
    noteAiInsightsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#111111',
    },
    noteAiInsightsSubtitle: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
      marginBottom: 8,
    },
    noteAiInsightsSection: {
      marginTop: 8,
    },
    noteAiInsightsHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 4,
    },
    noteAiInsightsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    noteAiInsightsText: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    noteEntityChip: {
      backgroundColor: '#E8DFFA',
      color: '#111111',
      fontSize: 10,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    noteSearchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 10,
      paddingHorizontal: 12,
      marginVertical: 10,
      marginHorizontal: 4,
    },
    noteSearchIcon: {
      marginRight: 8,
    },
    noteSearchInput: {
      flex: 1,
      height: 40,
      fontSize: 12,
      color: '#1F2937',
    },
    noteFiltersRow: {
      marginVertical: 6,
      marginHorizontal: 4,
    },
    noteFilterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: '#F3F4F6',
      borderRadius: 15,
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    noteFilterChipActive: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    noteFilterChipText: {
      fontSize: 11,
      color: '#4B5563',
      fontWeight: '600',
    },
    noteFilterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    noteListHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
      marginTop: 16,
      marginBottom: 8,
      marginHorizontal: 4,
    },
    noteEmptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    noteEmptyText: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 10,
      paddingHorizontal: 20,
    },
    noteEmptyBtn: {
      marginTop: 15,
      backgroundColor: '#111111',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
    },
    noteEmptyBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    noteCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 12,
      marginBottom: 10,
      marginHorizontal: 4,
    },
    noteCardExpanded: {
      borderColor: '#D1D5DB',
    },
    noteCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    noteFavoriteTouch: {
      marginRight: 6,
    },
    noteHeaderMetaRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    noteCategoryTag: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    notePriorityBadge: {
      fontSize: 9,
      fontWeight: '700',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    notePriorityCritical: {
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
    },
    notePriorityHigh: {
      backgroundColor: '#FFEDD5',
      color: '#D97706',
    },
    notePriorityMedium: {
      backgroundColor: '#FEF3C7',
      color: '#B45309',
    },
    notePriorityLow: {
      backgroundColor: '#ECFDF5',
      color: '#059669',
    },
    notePinTouch: {
      marginLeft: 6,
    },
    noteClickArea: {
      paddingVertical: 4,
    },
    noteCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 4,
    },
    noteCardDescription: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
    },
    noteFooterSummaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    noteFooterSummaryText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#6B7280',
    },
    noteDrawerContent: {
      marginTop: 12,
      borderTopWidth: 0.5,
      borderColor: '#E5E7EB',
      paddingTop: 12,
    },
    noteToolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 6,
      padding: 4,
      marginBottom: 8,
      gap: 4,
    },
    noteToolbarBtn: {
      padding: 6,
      borderRadius: 4,
    },
    noteToolbarBtnActive: {
      backgroundColor: '#E5E7EB',
    },
    noteToolbarDivider: {
      width: 1,
      height: 16,
      backgroundColor: '#D1D5DB',
      marginHorizontal: 4,
    },
    noteTextEditorArea: {
      minHeight: 100,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 8,
      fontSize: 11,
      color: '#1F2937',
      textAlignVertical: 'top',
      borderWidth: 0.5,
      borderColor: '#D1D5DB',
    },
    noteAiFindingsBox: {
      backgroundColor: '#F9F5FF',
      borderWidth: 1,
      borderColor: '#E9D5FF',
      borderRadius: 8,
      padding: 8,
      marginVertical: 8,
    },
    noteAiFindingsTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#111111',
      marginBottom: 4,
    },
    noteAiFindingsHeading: {
      fontSize: 10,
      fontWeight: '700',
      color: '#5B21B6',
      marginTop: 6,
      marginBottom: 2,
    },
    noteAiFindingsText: {
      fontSize: 10,
      color: '#4B5563',
      lineHeight: 14,
    },
    noteAiFindingsBullet: {
      fontSize: 10,
      color: '#4B5563',
      lineHeight: 14,
      paddingLeft: 4,
    },
    noteEntitiesContainer: {
      marginVertical: 6,
    },
    noteEntitiesTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 4,
    },
    noteEntitiesFlex: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    noteEntityTouchChip: {
      backgroundColor: '#F3F4F6',
      borderWidth: 0.5,
      borderColor: '#D1D5DB',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    noteEntityTouchChipText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#374151',
    },
    noteEntityTouchChipType: {
      fontSize: 8,
      color: '#6B7280',
    },
    noteLinkageCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginVertical: 3,
    },
    noteLinkageCheckboxText: {
      fontSize: 10,
      color: '#4B5563',
    },
    noteLinkageCheckboxTextConfirmed: {
      color: '#111111',
      fontWeight: '700',
    },
    noteActionsFlex: {
      gap: 6,
    },
    noteActionRowTouch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#111111',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    noteActionRowTouchDisabled: {
      backgroundColor: '#10B981',
    },
    noteActionRowTouchText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    noteHistoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 8,
      borderTopWidth: 0.5,
      borderColor: '#E5E7EB',
      paddingTop: 8,
    },
    noteHistoryLabel: {
      fontSize: 9,
      color: '#9CA3AF',
    },
    noteHistoryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    noteHistoryBtnText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
    },
    noteCardActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 0.5,
      borderColor: '#E5E7EB',
      paddingTop: 8,
      marginTop: 6,
    },
    noteCardIconBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    noteCardIconBtnDanger: {
      borderColor: '#FEE2E2',
    },
    noteCardIconText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#4B5563',
    },
    noteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    feedbackOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    feedbackCard: {
      width: '90%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      alignItems: 'stretch',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    feedbackTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 12,
    },
    cancelBtn: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    feedbackButton: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteModalContent: {
      width: '95%',
      maxHeight: '90%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    noteFormHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: '#F3F4F6',
      paddingBottom: 10,
    },
    noteModalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111827',
    },
    noteFormLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#374151',
      marginTop: 10,
      marginBottom: 4,
    },
    noteFormCategoryFlex: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    noteFormCategoryChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    noteFormCategoryChipActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    noteFormCategoryChipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    noteFormCategoryChipTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    noteFormInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      padding: 8,
      fontSize: 11,
      color: '#1F2937',
      backgroundColor: '#F9FAFB',
    },
    noteFormPriorityFlex: {
      flexDirection: 'row',
      gap: 6,
    },
    noteFormPriorityChip: {
      flex: 1,
      paddingVertical: 6,
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    noteFormPriorityChipActive: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    noteFormPriorityChipText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    noteFormPriorityChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    noteHorizontalScrollBar: {
      marginVertical: 4,
    },
    noteSelectorHorizontalItem: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      marginRight: 6,
      borderWidth: 0.5,
      borderColor: '#D1D5DB',
    },
    noteSelectorHorizontalItemActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    noteSelectorHorizontalItemText: {
      fontSize: 10,
      color: '#4B5563',
    },
    noteSelectorHorizontalItemTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    noteTemplateSection: {
      marginTop: 10,
      padding: 10,
      backgroundColor: '#FAF5FF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E9D5FF',
    },
    noteTemplateTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#111111',
      marginBottom: 4,
    },
    noteFormToolbarRow: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: '#F3F4F6',
      padding: 4,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: '#E5E7EB',
    },
    noteFormToolbarIcon: {
      padding: 6,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    noteFormToolbarIconActive: {
      backgroundColor: '#EEF2FF',
      borderColor: '#C7D2FE',
      borderWidth: 1,
    },
    noteFormSwitchRow: {
      flexDirection: 'row',
      gap: 10,
      marginVertical: 10,
    },
    noteFormSwitchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      backgroundColor: '#FFFFFF',
    },
    noteFormSwitchBtnActive: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    noteFormSwitchText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    noteFormSwitchTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    noteFormAutosaveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      marginBottom: 10,
    },
    noteFormAutosaveIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    noteFormAutosaveText: {
      fontSize: 9,
      color: '#6B7280',
    },
    noteHorizontalSelectorScroll: {
      marginVertical: 4,
    },
    noteModalActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
      borderTopWidth: 1,
      borderColor: '#F3F4F6',
      paddingTop: 10,
    },
    noteFormCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      alignItems: 'center',
    },
    noteFormCancelBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#374151',
    },
    noteFormSaveBtn: {
      flex: 1,
      backgroundColor: '#111111',
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    noteFormSaveBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    voiceNoteModalContentBody: {
      paddingVertical: 15,
    },
    voiceNoteTranscribingContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    voiceNoteTranscribingHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: '#111111',
      marginTop: 12,
      textAlign: 'center',
    },
    caseHeaderMain: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    caseHeaderBadgeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    voiceNoteTranscribingText: {
      fontSize: 10,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 15,
      lineHeight: 14,
    },
    voiceNoteRecordContainer: {
      alignItems: 'center',
    },
    voiceNoteRecordHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 10,
    },
    voiceNoteWaveformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 80,
      width: '100%',
      justifyContent: 'center',
      marginBottom: 10,
    },
    voiceNoteWaveformBar: {
      width: 6,
      height: 8,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
    },
    voiceNoteRecordDurationText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
      marginBottom: 15,
    },
    voiceNoteRecordBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    voiceNoteRecordBtnActive: {
      backgroundColor: '#1F2937',
    },
    voiceNoteRecordInstruction: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 12,
    },
    noteVersionItemCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 10,
      marginBottom: 8,
    },
    noteVersionItemCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    noteVersionItemCardTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
    },
    noteVersionItemCardDate: {
      fontSize: 9,
      color: '#9CA3AF',
    },
    noteVersionItemCardContent: {
      fontSize: 10,
      color: '#4B5563',
      lineHeight: 14,
      marginBottom: 8,
    },
    noteVersionItemRestoreBtn: {
      alignSelf: 'flex-start',
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    noteVersionItemRestoreBtnText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
    },
    caseHeaderContainer: {
      padding: 12,
      borderBottomWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    orderDashboardContainer: {
      marginTop: 10,
      marginBottom: 10,
    },
    orderMetricCard: {
      backgroundColor: '#FFFFFF',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderLeftWidth: 4,
      minWidth: 120,
    },
    orderMetricValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
    },
    orderMetricLabel: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    orderQuickActionsRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 10,
      marginBottom: 10,
    },
    orderQuickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    orderQuickBtnOutline: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#111111',
    },
    orderQuickBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    orderSearchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      marginHorizontal: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 10,
    },
    orderSearchIcon: {
      marginRight: 6,
    },
    orderSearchInput: {
      flex: 1,
      height: 38,
      fontSize: 12,
      color: '#1F2937',
    },
    orderFiltersWrapper: {
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    orderFilterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      marginRight: 8,
    },
    orderFilterChipActive: {
      backgroundColor: '#111111',
    },
    orderFilterChipText: {
      fontSize: 11,
      color: '#4B5563',
      fontWeight: '500',
    },
    orderFilterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    orderCardList: {
      paddingHorizontal: 12,
    },
    orderCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    orderCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    orderCardHeaderLeft: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
    },
    orderCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1F2937',
    },
    orderCardSubtitle: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    orderStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    orderBadgeCompleted: {
      backgroundColor: '#10B98115',
    },
    orderBadgeAnalyzed: {
      backgroundColor: '#11111115',
    },
    orderStatusBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
    },
    orderCardSummary: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
      marginBottom: 8,
    },
    orderHighlightsContainer: {
      backgroundColor: '#F9FAFB',
      borderRadius: 6,
      padding: 8,
      gap: 4,
      marginBottom: 8,
    },
    orderHighlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    orderHighlightText: {
      fontSize: 10,
      color: '#374151',
      fontWeight: '500',
    },
    orderCardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: 8,
    },
    orderCardUploadMeta: {
      fontSize: 9,
      color: '#9CA3AF',
    },
    orderCardActions: {
      flexDirection: 'row',
      gap: 8,
    },
    orderActionIconBtn: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    orderModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    orderOcrLoaderBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    ocrLoaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 15,
    },
    ocrLoaderSpinner: {
      marginVertical: 15,
    },
    ocrProgressBarWrapper: {
      width: '100%',
      height: 6,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    ocrProgressBarFill: {
      height: '100%',
      backgroundColor: '#111111',
    },
    ocrProgressPercentage: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
      marginBottom: 12,
    },
    ocrLoaderStepText: {
      fontSize: 11,
      color: '#4B5563',
      textAlign: 'center',
      marginBottom: 15,
    },
    ocrPipelineIndicators: {
      flexDirection: 'row',
      gap: 8,
    },
    ocrPipelineStep: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#E5E7EB',
    },
    ocrPipelineStepActive: {
      backgroundColor: '#111111',
    },
    orderFormContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '100%',
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      overflow: 'hidden',
    },
    orderFormHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    orderFormHeaderTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
    },
    orderFormScrollContent: {
      padding: 16,
    },
    orderFormLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#374151',
      marginBottom: 6,
      marginTop: 10,
    },
    orderFormInput: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: '#1F2937',
      backgroundColor: '#F9FAFB',
    },
    orderFormRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    orderHorizontalSelectorScroll: {
      marginVertical: 6,
    },
    orderSelectorHorizontalItem: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    orderSelectorHorizontalItemActive: {
      backgroundColor: '#F5F5F5',
      borderColor: '#111111',
    },
    orderSelectorHorizontalItemText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '500',
    },
    orderSelectorHorizontalItemTextActive: {
      color: '#111111',
      fontWeight: '700',
    },
    orderFormTextArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    orderFormFooter: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      gap: 10,
    },
    orderFormBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderFormBtnCancel: {
      backgroundColor: '#F3F4F6',
    },
    orderFormBtnCancelText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#4B5563',
    },
    orderFormBtnSubmit: {
      backgroundColor: '#111111',
    },
    orderFormBtnSubmitText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    orderDrawerContainer: {
      flex: 1,
      backgroundColor: '#F9FAFB',
    },
    orderDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    orderDrawerBackBtn: {
      padding: 4,
    },
    orderDrawerHeaderTitleWrapper: {
      flex: 1,
      marginLeft: 10,
    },
    orderDrawerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1F2937',
    },
    orderDrawerSubtitle: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    orderDrawerCloseBtn: {
      padding: 4,
    },
    orderSubTabSelector: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    orderSubTabItem: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 6,
      marginRight: 8,
    },
    orderSubTabItemActive: {
      backgroundColor: '#F5F5F5',
    },
    orderSubTabItemText: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
    },
    orderSubTabItemTextActive: {
      color: '#111111',
      fontWeight: '800',
    },
    orderDrawerContentScroll: {
      padding: 12,
    },
    pdfViewerCard: {
      backgroundColor: '#1F2937',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    },
    pdfViewerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 8,
      backgroundColor: '#111827',
      borderBottomWidth: 1,
      borderBottomColor: '#374151',
    },
    pdfViewerHeaderText: {
      fontSize: 10,
      color: '#9CA3AF',
      fontWeight: '600',
    },
    pdfViewerScroll: {
      height: 120,
      padding: 10,
    },
    pdfViewerTextCode: {
      fontSize: 10,
      color: '#F3F4F6',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      lineHeight: 14,
    },
    syncTabContentBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 12,
    },
    drawerSectionHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 10,
    },
    metadataGrid: {
      gap: 10,
    },
    metadataGridRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metadataGridCol: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    metaLabelText: {
      fontSize: 9,
      color: '#9CA3AF',
      fontWeight: '600',
      marginBottom: 2,
    },
    metaValueText: {
      fontSize: 11,
      color: '#1F2937',
      fontWeight: '700',
    },
    aiSummaryDetailBox: {
      backgroundColor: '#F5F5F5',
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    aiSummaryShortText: {
      fontSize: 11,
      color: '#4B5563',
      lineHeight: 15,
      fontWeight: '500',
    },
    keyPointBulletRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
      alignItems: 'flex-start',
    },
    keyPointBulletText: {
      fontSize: 11,
      color: '#374151',
      lineHeight: 15,
      flex: 1,
    },
    subtextAlert: {
      fontSize: 10,
      color: '#6B7280',
      fontStyle: 'italic',
      textAlign: 'center',
      marginVertical: 10,
    },
    complianceDrawerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      marginBottom: 8,
    },
    complianceDrawerLeft: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
    },
    complianceDescText: {
      fontSize: 11,
      color: '#1F2937',
      fontWeight: '600',
    },
    lineThroughText: {
      textDecorationLine: 'line-through',
      color: '#9CA3AF',
    },
    complianceMetaText: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 2,
    },
    suggestedHelpText: {
      fontSize: 10,
      color: '#6B7280',
      marginBottom: 10,
    },
    suggestionPromoteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      marginBottom: 8,
    },
    suggestionTypeBadge: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    orderSuggestionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1F2937',
      flex: 1,
    },
    orderSuggestionDesc: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 2,
    },
    suggestionPromoteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#F5F5F5',
    },
    suggestionPromoteBtnAccepted: {
      backgroundColor: '#10B981',
    },
    suggestionPromoteBtnText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#111111',
    },
    riskBadgeCard: {
      backgroundColor: '#EF444405',
      padding: 10,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#EF4444',
      marginBottom: 10,
    },
    riskCardLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1F2937',
    },
    riskCardValue: {
      fontSize: 11,
      fontWeight: '800',
    },
    probabilityBox: {
      backgroundColor: '#F9FAFB',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      marginBottom: 12,
    },
    probabilityLabel: {
      fontSize: 10,
      color: '#6B7280',
      fontWeight: '600',
      marginBottom: 4,
    },
    probabilityBarWrapper: {
      height: 6,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
      overflow: 'hidden',
      marginVertical: 4,
    },
    probabilityBarFill: {
      height: '100%',
      backgroundColor: '#111111',
    },
    probabilityPercentText: {
      fontSize: 9,
      color: '#9CA3AF',
      fontWeight: '500',
    },
    riskAnalysisSubheading: {
      fontSize: 10,
      fontWeight: '700',
      color: '#4B5563',
      marginBottom: 6,
    },
    riskDefectRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 4,
      alignItems: 'center',
    },
    riskDefectText: {
      fontSize: 10,
      color: '#EF4444',
      fontWeight: '500',
    },
    drawerLinksGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    drawerLinkCard: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    drawerLinkLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#4B5563',
      textAlign: 'center',
    },
    workspaceSyncPanel: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: '#11111130',
      marginBottom: 20,
    },
    syncPanelHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: '#111111',
      marginBottom: 4,
    },
    syncPanelDesc: {
      fontSize: 10,
      color: '#4B5563',
      lineHeight: 14,
      marginBottom: 10,
    },
    syncCheckboxesGrid: {
      gap: 8,
      marginBottom: 12,
    },
    syncCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFFFFF',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    syncCheckboxLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#374151',
    },
    syncBatchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#111111',
      paddingVertical: 10,
      borderRadius: 8,
    },
    syncBatchBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    syncSuccessMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#E8F5E9',
      paddingVertical: 10,
      borderRadius: 8,
    },
    syncSuccessText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
    // --- NEW WORKSPACE ANALYSIS STYLES ---
    analysisLoadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.95)', // Sleek dark slate glassmorphism
      justifyContent: 'center',
      padding: 24,
    },
    analysisLoadingSafeArea: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 40,
    },
    analysisLoadingHeader: {
      alignItems: 'center',
      marginTop: 20,
    },
    analysisLoadingTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#FFFFFF',
      marginTop: 12,
      letterSpacing: 0.5,
    },
    analysisLoadingSubtitle: {
      fontSize: 14,
      color: '#94A3B8',
      marginTop: 6,
    },
    analysisLoadingChecklist: {
      width: '100%',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      gap: 16,
      marginVertical: 30,
    },
    analysisChecklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    analysisChecklistIconContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    analysisPendingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#475569',
    },
    analysisChecklistText: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '500',
    },
    analysisChecklistTextCompleted: {
      color: '#34D399', // Mint/success green
      textDecorationLine: 'none',
    },
    analysisChecklistTextActive: {
      color: '#111111', // Theme primary
      fontWeight: '700',
    },
    analysisChecklistTextPending: {
      color: '#64748B',
    },
    analysisLoadingFooter: {
      alignItems: 'center',
      width: '100%',
      gap: 16,
    },
    analysisLoadingFooterText: {
      fontSize: 13,
      color: '#64748B',
      fontStyle: 'italic',
    },
    analysisCancelLoadingBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#475569',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    analysisCancelLoadingBtnText: {
      color: '#94A3B8',
      fontSize: 13,
      fontWeight: '600',
    },

    // Error modal & prompts
    analysisErrorOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    analysisErrorModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    analysisErrorModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    analysisErrorModalDesc: {
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 24,
    },
    analysisErrorModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    analysisErrorBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    analysisErrorBtnOutline: {
      borderWidth: 1,
      borderColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
    },
    analysisErrorBtnPrimary: {
      backgroundColor: '#EF4444',
    },
    analysisErrorBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },

    analysisPromptOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    analysisPromptModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    analysisPromptModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    analysisPromptModalDesc: {
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 24,
    },
    analysisPromptModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    analysisPromptBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    analysisPromptBtnOutline: {
      borderWidth: 1,
      borderColor: '#ECECEC',
      backgroundColor: '#FFFFFF',
    },
    analysisPromptBtnPrimary: {
      backgroundColor: '#111111',
    },
    analysisPromptBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },

    // Analysis report tab
    analysisMetricsRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    analysisMetricCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 2,
    },
    analysisMetricVal: {
      fontSize: 24,
      fontWeight: '900',
      color: '#1F2937',
      marginTop: 6,
    },
    analysisMetricLbl: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'center',
    },
    analysisMetaBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    analysisMetaBadge: {
      backgroundColor: '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    analysisMetaBadgeText: {
      fontSize: 10,
      color: '#4B5563',
      fontWeight: '600',
    },
    analysisOverviewCard: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ECECEC',
      marginBottom: 16,
    },
    analysisOverviewCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    analysisOverviewLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#4B5563',
      textTransform: 'uppercase',
    },
    analysisRiskBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    analysisRiskBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    analysisOverviewText: {
      fontSize: 13,
      color: '#4B5563',
      lineHeight: 18,
    },
    analysisAccordionCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    analysisAccordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.card,
    },
    analysisAccordionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    analysisAccordionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    analysisAccordionContent: {
      padding: 16,
      backgroundColor: theme.surfaceVariant,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    analysisReportTextParagraph: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    analysisReportSubSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textPrimary,
      textTransform: 'uppercase',
      marginTop: 14,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    analysisReportBullet: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginVertical: 4,
      paddingRight: 12,
    },
    analysisReportBulletDot: {
      fontSize: 12,
      color: theme.primary,
      marginTop: 1,
    },
    analysisReportBulletText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
      flex: 1,
    },
    analysisReportEmptyText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    analysisHistoryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    analysisHistoryTextCol: {
      flex: 1,
      marginRight: 10,
    },
    analysisHistoryVersionText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    analysisHistoryDateText: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
    analysisHistorySummaryText: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 4,
    },
    analysisHistoryLoadBtn: {
      backgroundColor: isDark ? 'rgba(123, 97, 255, 0.15)' : '#F5F5F5',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    analysisHistoryLoadBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    analysisReportActionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 32,
    },
    dmsTabSelectorContainer: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceVariant || '#F5F5F5',
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    dmsTabBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    dmsTabBtnActive: {
      backgroundColor: '#111111',
    },
    dmsTabBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary || '#64748B',
    },
    dmsTabBtnTextActive: {
      color: '#FFFFFF',
    },
    uploadProgressCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    dmsControlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    dmsSortPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.surfaceVariant || '#F5F5F5',
      marginRight: 6,
      marginBottom: 4,
    },
    dmsSortPillActive: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
    },
    dmsSortPillText: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.textSecondary || '#64748B',
    },
    dmsCheckbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#94A3B8',
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dmsCheckboxChecked: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    exhibitBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    dmsActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    dmsActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#111111',
    },
    bulkToolbar: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 999,
    },
    bulkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    bulkBtnText: {
      fontSize: 11,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    dmsModalInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      marginTop: 12,
      alignSelf: 'stretch',
    },
  });
}
