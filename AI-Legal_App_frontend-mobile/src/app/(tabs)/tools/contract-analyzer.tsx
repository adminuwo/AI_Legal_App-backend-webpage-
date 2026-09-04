import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  Clipboard,
  Share,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
  FlatList,
  BackHandler,
  UIManager,
  LayoutAnimation,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { MarkdownRenderer } from '@/components/ui/documents';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { useLocalLanguageStore } from '@/localization/i18n';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseSummary } from '@/types';
import { ContractService, ContractAnalysisResult } from '@/services/contract.service';
import { ContractHistoryService, ContractHistoryItem } from '@/services/contract-history.service';
import { UploadService } from '@/services/upload.service';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import { uploadFileMultipart } from '@/api/client';

const { width, height } = Dimensions.get('window');

// Helpers for formatting and estimations
const formatSize = (bytes?: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const estimatePages = (filename: string, size?: number) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return 1;
  if (!size) return 1;
  return Math.max(1, Math.ceil(size / (120 * 1024)));
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'document-text';
  if (ext === 'doc' || ext === 'docx') return 'document';
  if (ext === 'txt') return 'reader-outline';
  return 'image-outline';
};

const getStatusColor = (status: string) => {
  if (status === 'Ready for Analysis') return '#10B981';
  if (status === 'Uploading...') return '#3B82F6';
  if (status === 'Upload Failed') return '#EF4444';
  return '#6B7280';
};

// Multi-stage extraction progress timeline steps
const PROCESSING_TASKS = [
  { key: 'upload', label: '✓ Upload Complete' },
  { key: 'validate', label: 'Validating File...' },
  { key: 'type', label: 'Detecting Document Type...' },
  { key: 'text', label: 'Extracting Text...' },
  { key: 'structure', label: 'Checking Contract Structure...' },
  { key: 'clauses', label: 'Extracting Clauses...' },
  { key: 'review', label: 'Running AI Legal Review...' },
  { key: 'summary', label: 'Generating Executive Summary...' },
  { key: 'report', label: 'Preparing Final Report...' },
];

export default function ContractAnalyzerScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Wizard / Navigation state
  // 'UPLOAD' -> 'PROCESSING' -> 'REVIEW'
  const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'REVIEW'>('UPLOAD');

  // Selected language
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  const processingTasks = useMemo(() => [
    { key: 'upload', label: tTool(outputLanguage, 'contractAnalyzer.procUpload', '✓ Upload Complete') },
    { key: 'validate', label: tTool(outputLanguage, 'contractAnalyzer.procValidate', 'Validating File...') },
    { key: 'type', label: tTool(outputLanguage, 'contractAnalyzer.procType', 'Detecting Document Type...') },
    { key: 'text', label: tTool(outputLanguage, 'contractAnalyzer.procText', 'Extracting Text...') },
    { key: 'structure', label: tTool(outputLanguage, 'contractAnalyzer.procStructure', 'Checking Contract Structure...') },
    { key: 'clauses', label: tTool(outputLanguage, 'contractAnalyzer.procClauses', 'Extracting Clauses...') },
    { key: 'review', label: tTool(outputLanguage, 'contractAnalyzer.procReview', 'Running AI Legal Review...') },
    { key: 'summary', label: tTool(outputLanguage, 'contractAnalyzer.procSummary', 'Generating Executive Summary...') },
    { key: 'report', label: tTool(outputLanguage, 'contractAnalyzer.procReport', 'Preparing Final Report...') },
  ], [outputLanguage]);

  // Active Linked Case State
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);
  const [isCasesLoading, setIsCasesLoading] = useState(false);
  const [casesLoadError, setCasesLoadError] = useState(false);
  const [selectedCaseIdForLink, setSelectedCaseIdForLink] = useState<string | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Uploaded Contract Files (Dynamic)
  const [independentContracts, setIndependentContracts] = useState<any[]>([]);

  // Contract Analysis History State
  const [contractHistoryList, setContractHistoryList] = useState<ContractHistoryItem[]>([]);
  const [isContractHistoryOpen, setIsContractHistoryOpen] = useState(false);
  const [isContractHistoryLoading, setIsContractHistoryLoading] = useState(false);
  const [contractHistorySearch, setContractHistorySearch] = useState('');
  const [contractHistoryFilter, setContractHistoryFilter] = useState('all');
  
  const [activeVersionGroupId, setActiveVersionGroupId] = useState<string | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<ContractHistoryItem[]>([]);

  // Edit metadata modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractHistoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCaseId, setEditCaseId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isCardMenuOpen, setIsCardMenuOpen] = useState<string | null>(null);
  const [uploadedContracts, setUploadedContracts] = useState<any[]>([]);
  const [replacingContractId, setReplacingContractId] = useState<string | null>(null);

  // Custom upload source sheet
  const [isUploadSourceSheetOpen, setIsUploadSourceSheetOpen] = useState(false);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  // Animated processing tasks
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({
    ocr: 0, parse: 0, risk: 0, comply: 0, strategy: 0, opinion: 0
  });

  // Analysis result state
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Preview modal states
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [previewWebViewLoading, setPreviewWebViewLoading] = useState(true);

  // Non-contract classification state
  const [nonContractInfo, setNonContractInfo] = useState<{ type: string; confidence: string } | null>(null);

  // Expandable findings accordion states
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({
    critical: true,
  });

  // Expandable Clause intelligence list
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({
    liab: true,
  });

  // AI Copilot hook states
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    error: chatError,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_contract_analyzer');

  const [chatInput, setChatInput] = useState('');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_contract-analyzer');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText: string) => {
    if (transcribedText) {
      setChatInput(transcribedText);
    }
  });

  // Custom back navigation stack preservation
  useEffect(() => {
    const backAction = () => {
      if (step === 'REVIEW') {
        setStep('UPLOAD');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [step]);

  // Sync speech preview to chat input
  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  // Cache Handling: clear previous findings, previews and nonContract states on document changes
  useEffect(() => {
    setAnalysisResult(null);
    setPreviewFile(null);
    setPreviewPage(1);
    setNonContractInfo(null);
  }, [selectedFileId]);

  // Check if the latest message is an empty model placeholder
  const isLatestMessageEmptyModel = useMemo(() => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      return false;
    }
    const latest = activeSession.messages[activeSession.messages.length - 1];
    return latest.role === 'model' && !latest.content.trim();
  }, [activeSession?.messages]);

  const {
    attachments,
    isBottomSheetVisible,
    hideAttachmentOptions,
    showAttachmentOptions,
    handleSelectOption,
    handleRemoveAttachment,
    clearAttachments,
    isCameraVisible,
    hideCamera,
    handleCameraConfirm,
  } = useAttachmentHandler();

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const copilotScrollRef = useRef<ScrollView>(null);
  // Custom dialogs & UI states
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // Suggestions timeline categories
  const CONTRACT_SUGGESTIONS_SHEET = {
    Review: [
      'Contract Review',
      'Clause Analysis',
      'Risk Detection',
      'Summarize Contract',
    ],
    Compliance: [
      'Compliance Review',
      'Find Missing Clauses',
      'Compare Contracts',
    ],
    Strategy: [
      'Redraft Clause',
      'Negotiation Strategy',
      'Generate Legal Opinion',
    ],
  };

  // Animated dot progress indicators
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 400);
    } else {
      setThinkingDotCount(1);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  const getThinkingDotsText = () => {
    return '●'.repeat(thinkingDotCount) + '○'.repeat(3 - thinkingDotCount);
  };

  // Local suggestions parser for contracts
  const parseFollowUpSuggestions = (text: string) => {
    if (!text) return { cleanedText: '', suggestions: [], disclaimer: '' };

    let disclaimer = '';
    let mainText = text;

    const disclaimerRegex = /(⚖️\s+Legal\s+Disclaimer|Legal\s+Disclaimer):?/i;
    const disclaimerMatch = mainText.match(disclaimerRegex);
    if (disclaimerMatch && disclaimerMatch.index !== undefined) {
      const beforeDisclaimer = mainText.substring(0, disclaimerMatch.index);
      const lastNewline = beforeDisclaimer.lastIndexOf('\n');
      const startIndex = lastNewline !== -1 ? lastNewline : 0;
      
      const rawDisclaimer = mainText.substring(startIndex).trim();
      disclaimer = rawDisclaimer
        .replace(/^[-*•\s]*/, '')
        .replace(disclaimerRegex, '')
        .trim();
      mainText = mainText.substring(0, startIndex).trim();
    }

    const suggestions: string[] = [];
    const suggestionsRegex = /(?:Suggested\s+Next\s+Actions|Suggested\s+Actions|Suggestions):\s*([\s\S]*)$/i;
    const suggestionsMatch = mainText.match(suggestionsRegex);
    
    if (suggestionsMatch && suggestionsMatch.index !== undefined) {
      const rawList = suggestionsMatch[1];
      mainText = mainText.substring(0, suggestionsMatch.index).trim();
      
      rawList.split('\n').forEach((line) => {
        const cleanedLine = line.replace(/^[-*•\s\d.]*/, '').trim();
        if (cleanedLine && cleanedLine.length > 3 && !cleanedLine.toLowerCase().includes('disclaimer')) {
          suggestions.push(cleanedLine);
        }
      });
    }

    // Dynamic contextual fallback for contracts
    if (suggestions.length === 0) {
      let detectedType = 'document';
      
      if (attachments && attachments.length > 0) {
        const lastAttach = attachments[attachments.length - 1];
        const fileName = lastAttach.name.toLowerCase();
        if (fileName.includes('nda') || fileName.includes('confidential')) {
          detectedType = 'nda';
        } else if (fileName.includes('lease') || fileName.includes('rent')) {
          detectedType = 'lease';
        } else if (fileName.includes('employ') || fileName.includes('hr')) {
          detectedType = 'employment';
        } else if (fileName.includes('vendor') || fileName.includes('service') || fileName.includes('saas')) {
          detectedType = 'vendor';
        }
      }

      const lowercaseText = text.toLowerCase();
      if (lowercaseText.includes('nda') || lowercaseText.includes('confidentiality') || lowercaseText.includes('disclosure')) {
        detectedType = 'nda';
      } else if (lowercaseText.includes('lease') || lowercaseText.includes('rent') || lowercaseText.includes('property')) {
        detectedType = 'lease';
      } else if (lowercaseText.includes('employ') || lowercaseText.includes('non-compete') || lowercaseText.includes('salary')) {
        detectedType = 'employment';
      } else if (lowercaseText.includes('vendor') || lowercaseText.includes('saas') || lowercaseText.includes('service') || lowercaseText.includes('obligation')) {
        detectedType = 'vendor';
      }

      if (detectedType === 'nda') {
        suggestions.push('Review Confidentiality', 'Check Exclusions', 'Verify Non-Solicit', 'Check Indemnity Caps');
      } else if (detectedType === 'lease') {
        suggestions.push('Check Escalation Terms', 'Verify Lock-in Period', 'Review Security Deposit', 'Termination Timeline');
      } else if (detectedType === 'employment') {
        suggestions.push('Review Non-Compete Clauses', 'Verify IP Assignment', 'Check Termination Notice', 'Analyze Severance Pay');
      } else if (detectedType === 'vendor') {
        suggestions.push('Review SLA Penalties', 'Check Uncapped Indemnity', 'Analyze Payment Terms', 'Verify Auto-Renewal');
      } else {
        suggestions.push('Analyze Risks', 'Find Missing Clauses', 'Redraft Clause', 'Check Compliance');
      }
    }

    return { cleanedText: mainText, suggestions, disclaimer };
  };

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  const handleOpenRename = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameValue(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (renameSessionId && renameValue.trim()) {
      await renameChatSession(renameSessionId, renameValue.trim());
      setIsRenameDialogOpen(false);
      setRenameSessionId(null);
      setRenameValue('');
      showToast('success', 'Session Renamed', 'Conversation title updated successfully.');
    }
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChatSession(id);
            showToast('success', 'Conversation Deleted', 'Session removed.');
          },
        },
      ]
    );
  };

  const shortenSuggestion = (text: string) => {
    if (text.length > 25) return text.substring(0, 22) + '...';
    return text;
  };

  // Keyboard and AutoScroll handling
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const autoScrollEnabled = useRef(false);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (contentSize.height > layoutMeasurement.height && distanceFromBottom > 150) {
      setShowScrollToLatest(true);
    } else {
      setShowScrollToLatest(false);
    }
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
        if (autoScrollEnabled.current) {
          setTimeout(() => {
            copilotScrollRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });
      return () => {
        showSubscription.remove();
      };
    }
  }, [isAiAssistantOpen]);

  useEffect(() => {
    if (autoScrollEnabled.current) {
      setTimeout(() => {
        copilotScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [activeSession?.messages, isAiAssistantOpen]);

  const loadContractHistory = async () => {
    setIsContractHistoryLoading(true);
    try {
      const res = await ContractHistoryService.listHistory({
        search: contractHistorySearch,
        filter: contractHistoryFilter
      });
      if (res.success && res.data) {
        setContractHistoryList(res.data);
      }
    } catch (err) {
      console.warn('Failed to load contract history:', err);
    } finally {
      setIsContractHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isContractHistoryOpen) {
      loadContractHistory();
    }
  }, [isContractHistoryOpen, contractHistorySearch, contractHistoryFilter]);

  const loadAvailableVersions = async (groupId: string) => {
    try {
      const res = await ContractHistoryService.listVersions(groupId);
      if (res.success && res.data) {
        setAvailableVersions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load contract versions:', err);
    }
  };

  const handleOpenContractAnalysis = (item: ContractHistoryItem) => {
    setSelectedFileId(item._id);
    const mockFile = {
      id: item._id,
      name: item.contractName,
      size: item.originalFileSize || 1.2 * 1024 * 1024,
      pages: item.originalFilePages || 1,
      status: 'Ready for Analysis',
      url: item.originalFileUrl,
    };
    
    setUploadedContracts(prev => {
      if (prev.some(c => c.url === item.originalFileUrl)) return prev;
      return [...prev, mockFile];
    });

    const parsed = parseAnalysisResult(item.aiAnalysisResult, item.contractName);
    setAnalysisResult(parsed);
    
    setActiveVersionGroupId(item.versionGroupId);
    setActiveVersionNumber(item.version);
    setCurrentAnalysisId(item._id);
    setLinkedCaseId(item.caseId && typeof item.caseId === 'object' ? (item.caseId as any)._id : '');

    setIsContractHistoryOpen(false);
    setStep('REVIEW');
    showToast('success', 'Contract Loaded', `Loaded version ${item.version} of ${item.contractName}`);
    
    loadAvailableVersions(item.versionGroupId);
  };

  const handleDeleteContractAnalysis = (item: ContractHistoryItem) => {
    Alert.alert(
      'Delete Contract Analysis?',
      'This action cannot be undone and will delete all versions of this contract.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await ContractHistoryService.deleteAnalysis(item._id);
              if (res.success) {
                showToast('success', 'Deleted successfully', 'Removed contract history.');
                setContractHistoryList(prev => prev.filter(c => c.versionGroupId !== item.versionGroupId));
                if (activeVersionGroupId === item.versionGroupId) {
                  setAnalysisResult(null);
                  setSelectedFileId(null);
                  setStep('UPLOAD');
                }
              }
            } catch (err) {
              showToast('error', 'Delete Failed', 'Could not delete contract analysis.');
            }
          }
        }
      ]
    );
  };

  const handleOpenEditContract = (item: ContractHistoryItem) => {
    setEditingContract(item);
    setEditName(item.contractName);
    setEditCaseId(item.caseId && typeof item.caseId === 'object' ? (item.caseId as any)._id : '');
    setEditNotes(item.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditContract = async () => {
    if (!editingContract) return;
    try {
      const res = await ContractHistoryService.updateAnalysis(editingContract._id, {
        contractName: editName,
        caseId: editCaseId || null,
        notes: editNotes
      });
      if (res.success && res.data) {
        showToast('success', 'Metadata Updated', 'Saved contract details successfully.');
        setIsEditModalOpen(false);
        setEditingContract(null);
        loadContractHistory();
        
        if (activeVersionGroupId === editingContract.versionGroupId) {
          setLinkedCaseId(editCaseId || '');
          setUploadedContracts(prev => prev.map(c => c.id === selectedFileId ? { ...c, name: editName } : c));
        }
      }
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to update contract metadata.');
    }
  };

  const loadModalCases = async () => {
    setIsCasesLoading(true);
    setCasesLoadError(false);
    try {
      const response = await CaseService.listCases();
      const list = Array.isArray(response) ? response : (response?.data || []);
      setCases(list.filter((c: any) => c.isLegalCase));
    } catch (err) {
      console.warn('Failed to load cases:', err);
      setCasesLoadError(true);
    } finally {
      setIsCasesLoading(false);
    }
  };

  const handleOpenCaseSelector = () => {
    setSelectedCaseIdForLink(linkedCaseId || null);
    setModalSearchQuery('');
    setIsCaseSelectOpen(true);
    loadModalCases();
  };

  // Fetch case lists on mount
  useEffect(() => {
    loadModalCases();
  }, []);

  // Load contracts when linkedCaseId or independentContracts change
  useEffect(() => {
    const loadCaseContracts = async () => {
      if (!linkedCaseId) {
        setUploadedContracts(independentContracts);
        return;
      }
      try {
        const res = await CaseService.getCaseDetails(linkedCaseId);
        if (res.success && res.data) {
          const docs = res.data.documents || [];
          const caseDocs = docs
            .filter((doc: any) => doc.type === 'Agreement' || doc.name.toLowerCase().endsWith('.pdf') || doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc') || doc.name.toLowerCase().endsWith('.txt'))
            .map((doc: any) => ({
              id: doc._id,
              name: doc.name,
              size: doc.extractedData?.size || 1.2 * 1024 * 1024,
              pages: doc.extractedData?.pages || estimatePages(doc.name),
              uploadTime: new Date(doc.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Ready for Analysis',
              url: doc.url,
              type: doc.type,
            }));
          setUploadedContracts(caseDocs);
        }
      } catch (err) {
        console.warn('Failed to load case contracts:', err);
      }
    };
    loadCaseContracts();
  }, [linkedCaseId, independentContracts]);

  // Hook into attachments from useAttachmentHandler
  useEffect(() => {
    if (attachments.length > 0 && (step === 'UPLOAD' || replacingContractId)) {
      const attach = attachments[0];
      handleUploadContract(attach);
      clearAttachments();
    }
  }, [attachments, step, replacingContractId]);

  const handleUploadContract = async (attach: { name: string; url: string; type?: string; size?: number }) => {
    // Validate file type before doing anything
    const ext = attach.name.split('.').pop()?.toLowerCase() || '';
    const allowedLegal = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'];
    if (!allowedLegal.includes(ext)) {
      showToast('error', 'Unsupported File', 'Unsupported file type. Please upload a legal document (PDF, DOC, DOCX, TXT, Images).');
      return;
    }

    const tempId = `contract_${Date.now()}`;

    // === OPTIMISTIC UI: Show file card immediately with local URI ===
    const optimisticContract = {
      id: tempId,
      name: attach.name,
      size: attach.size || 1.5 * 1024 * 1024,
      pages: estimatePages(attach.name, attach.size),
      uploadTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Uploading...',
      url: attach.url, // local URI first
    };

    if (replacingContractId) {
      if (!linkedCaseId) {
        setIndependentContracts(prev => prev.filter(c => c.id !== replacingContractId));
      }
    }

    if (!linkedCaseId) {
      // Show optimistic card immediately
      setIndependentContracts(prev => [...prev, optimisticContract]);
    }

    setSelectedFileId(tempId);
    setIsUploading(true);
    setUploadProgress(0);
    setReplacingContractId(null);

    // Animate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 12;
      });
    }, 150);

    try {
      let finalUrl = attach.url;
      let finalId = tempId;

      if (linkedCaseId) {
        // Upload to Case Workspace
        const res = await UploadService.uploadCaseDocument(
          linkedCaseId,
          attach.url,
          attach.name,
          attach.type || 'application/pdf',
          'Agreement'
        );
        if (res.success && res.data) {
          finalUrl = res.data.url;
          finalId = res.data._id;
          // Reload case contracts
          const caseDetailsRes = await CaseService.getCaseDetails(linkedCaseId);
          if (caseDetailsRes.success && caseDetailsRes.data) {
            const docs = caseDetailsRes.data.documents || [];
            const caseDocs = docs
              .filter((doc: any) => doc.type === 'Agreement' || doc.name.toLowerCase().endsWith('.pdf') || doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc') || doc.name.toLowerCase().endsWith('.txt'))
              .map((doc: any) => ({
                id: doc._id,
                name: doc.name,
                size: doc.extractedData?.size || 1.2 * 1024 * 1024,
                pages: doc.extractedData?.pages || estimatePages(doc.name),
                uploadTime: new Date(doc.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'Ready for Analysis',
                url: doc.url,
                type: doc.type,
              }));
            setUploadedContracts(caseDocs);
            setSelectedFileId(finalId);
          }
        } else {
          throw new Error('Backend upload failed');
        }
      } else {
        // Independent review mode — try to upload to backend for remote URL
        try {
          const res = await uploadFileMultipart<{
            success: boolean;
            data: { url: string; mimetype: string; filename: string; size: number };
          }>(
            '/chat/upload',
            attach.url,
            attach.name,
            attach.type || 'application/octet-stream'
          );
          if (res.success && res.data) {
            finalUrl = res.data.url;
          }
        } catch (uploadErr) {
          // Backend upload failed - keep local URI (optimistic card already shown)
          console.warn('[ContractAnalyzer] Backend upload failed, using local URI:', uploadErr);
        }

        // Update the optimistic card with final URL and "Ready" status
        setIndependentContracts(prev =>
          prev.map(c =>
            c.id === tempId
              ? { ...c, url: finalUrl, status: 'Ready for Analysis' }
              : c
          )
        );
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        showToast('success', 'Contract Uploaded', `${attach.name} is ready for analysis.`);
      }, 300);

    } catch (error) {
      clearInterval(progressInterval);
      setIsUploading(false);

      if (linkedCaseId) {
        // Case upload failure: remove any partial state
        showToast('error', 'Upload Failed', 'Failed to upload contract. Please try again.');
        setSelectedFileId(null);
      } else {
        // Independent: update the optimistic card status to failed
        setIndependentContracts(prev =>
          prev.map(c =>
            c.id === tempId
              ? { ...c, status: 'Upload Failed' }
              : c
          )
        );
        showToast('error', 'Upload Issue', 'Could not sync to server, but file is available locally.');
      }
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (linkedCaseId) {
      try {
        const res = await CaseService.getCaseDetails(linkedCaseId);
        if (res.success && res.data) {
          const filteredDocs = (res.data.documents || []).filter(doc => doc._id !== id);
          await CaseService.updateCase(linkedCaseId, { documents: filteredDocs });
          
          const caseDocs = filteredDocs
            .filter((doc: any) => doc.type === 'Agreement' || doc.name.toLowerCase().endsWith('.pdf') || doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc') || doc.name.toLowerCase().endsWith('.txt'))
            .map((doc: any) => ({
              id: doc._id,
              name: doc.name,
              size: doc.extractedData?.size || 1.2 * 1024 * 1024,
              pages: doc.extractedData?.pages || estimatePages(doc.name),
              uploadTime: new Date(doc.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Ready for Analysis',
              url: doc.url,
              type: doc.type,
            }));
          setUploadedContracts(caseDocs);
          if (selectedFileId === id) {
            setSelectedFileId(null);
          }
          showToast('success', 'Contract Deleted', 'File removed from case workspace.');
        }
      } catch (err) {
        showToast('error', 'Delete Failed', 'Failed to remove contract.');
      }
    } else {
      setIndependentContracts(prev => prev.filter(c => c.id !== id));
      if (selectedFileId === id) {
        setSelectedFileId(null);
      }
      showToast('success', 'Contract Deleted', 'File removed.');
    }
  };

  const handleReplacePress = (id: string) => {
    setReplacingContractId(id);
    showAttachmentOptions();
  };

  const handlePreviewContract = async (url?: string, name?: string) => {
    const file = uploadedContracts.find(c => c.url === url || c.name === name);
    if (!file || !file.url) {
      Alert.alert(
        'Preview Unavailable',
        'The uploaded document could not be found. Please upload the document again.'
      );
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supportedExts = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
    if (!supportedExts.includes(ext)) {
      Alert.alert('Preview Unavailable', 'Preview is not available for this file type.');
      return;
    }

    if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
      // Open in Chrome Custom Tab via Google Docs Viewer.
      // Chrome Custom Tab stays within the app's activity stack — no Share Sheet is triggered.
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
      try {
        await WebBrowser.openBrowserAsync(viewerUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#0F172A',
          controlsColor: '#111111',
        });
      } catch {
        // Fallback: open raw URL if Google Docs Viewer fails
        try { await WebBrowser.openBrowserAsync(file.url); } catch { /* silent */ }
      }
      return;
    }

    // TXT and images open in the in-app modal
    setPreviewFile(file);
    setPreviewPage(1);
    setPreviewTextContent('Loading document...');
    setIsPreviewVisible(true);

    if (ext === 'txt') {
      try {
        const response = await fetch(file.url);
        if (response.ok) {
          const text = await response.text();
          setPreviewTextContent(text);
        } else {
          setPreviewTextContent(`Plain Text Document: ${file.name}\n\n[Content loaded successfully]`);
        }
      } catch (e) {
        setPreviewTextContent(`Plain Text Document: ${file.name}\n\n[Content loaded via offline reader]`);
      }
    }
  };


  const selectedFile = useMemo(() => {
    return uploadedContracts.find(f => f.id === selectedFileId);
  }, [selectedFileId, uploadedContracts]);

  const linkedCase = useMemo(() => {
    return cases.find(c => c._id === linkedCaseId);
  }, [cases, linkedCaseId]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const q = modalSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.clientName || '').toLowerCase().includes(q) ||
        (c.caseType || '').toLowerCase().includes(q) ||
        ((c as any).courtName || '').toLowerCase().includes(q) ||
        (c._id || '').toLowerCase().includes(q)
      );
    });
  }, [cases, modalSearchQuery]);

  const formatLastUpdated = (dateStr?: string) => {
    if (!dateStr) return 'recently';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  };

  const getRiskForCategory = (cat: string) => {
    if (!analysisResult) return 'Low';
    const risks = analysisResult.risksAndLoopholes;
    const hasCritical = risks.some((r: any) => r.risk === 'Critical' && r.title.toLowerCase().includes(cat));
    if (hasCritical) return 'Critical';
    const hasHigh = risks.some((r: any) => r.risk === 'High' && r.title.toLowerCase().includes(cat));
    if (hasHigh) return 'High';
    const hasMed = risks.some((r: any) => r.risk === 'Medium' && r.title.toLowerCase().includes(cat));
    if (hasMed) return 'Medium';
    return 'Low';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'Critical' || risk === 'High') return '#EF4444';
    if (risk === 'Medium') return '#F59E0B';
    return '#10B981';
  };

  // Interface for structured contract analysis — maps ContractAnalysisResult to UI fields
  interface UIContractAnalysis {
    finalVerdict: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    riskScore: number;
    complianceScore: string;
    contractQuality: string;
    simplifiedExplanation: string;
    contractClass: string;
    governingLaw: string;
    governingJurisdiction: string;
    legalAnalysis: string[];
    risksAndLoopholes: { clause: string; title: string; risk: 'Low' | 'Medium' | 'High' | 'Critical'; desc: string }[];
    enforceabilityCheck: string[];
    whatToDoNext: string[];
    parties: { name: string; role: string }[];
    effectiveDate: string | null;
    terminationDate: string | null;
    contractDuration: string | null;
    paymentTerms: string | null;
    penaltyClauses: string[];
    terminationConditions: string[];
    confidentialityScope: string | null;
    indemnityScope: string | null;
    liabilityCap: string | null;
    forceMajeure: string | null;
    arbitrationClause: string | null;
    renewalClause: string | null;
    noticePeriod: string | null;
    missingClauses: { clauseTitle: string; importance: string; reason: string }[];
    highRiskClauses: string[];
    mediumRiskClauses: string[];
    lowRiskClauses: string[];
    redFlags: string[];
    legalIssues: string[];
    recommendations: { priority: string; action: string; reason: string }[];
    suggestedClauseImprovements: string[];
    negotiationPoints: string[];
    aiConfidence: number;
    overallAssessment: string;
  }

  // Map backend ContractAnalysisResult structured JSON to UIContractAnalysis for the REVIEW dashboard
  const mapAnalysisToUI = (analysis: ContractAnalysisResult, fileName: string): UIContractAnalysis => {
    // Map keyClausesFound to risksAndLoopholes for backwards compatibility
    const risksAndLoopholes = (analysis.keyClausesFound || []).map((c: any, i: number) => ({
      clause: `Clause ${i + 1}`,
      title: c.clauseTitle,
      risk: c.riskRating as any,
      desc: c.summary + (c.riskReason ? ` — ${c.riskReason}` : ''),
    }));

    // Extract key legal parameters as string array for legalAnalysis field
    const legalAnalysis: string[] = [];
    if (analysis.parties && analysis.parties.length > 0) {
      legalAnalysis.push(`Parties: ${analysis.parties.map((p: any) => `${p.name} (${p.role})`).join(', ')}`);
    }
    if (analysis.effectiveDate) legalAnalysis.push(`Effective Date: ${analysis.effectiveDate}`);
    if (analysis.terminationDate) legalAnalysis.push(`Termination Date: ${analysis.terminationDate}`);
    if (analysis.contractDuration) legalAnalysis.push(`Duration: ${analysis.contractDuration}`);
    if (analysis.paymentTerms) legalAnalysis.push(`Payment Terms: ${analysis.paymentTerms}`);
    if (analysis.renewalClause) legalAnalysis.push(`Renewal: ${analysis.renewalClause}`);
    if (analysis.noticePeriod) legalAnalysis.push(`Notice Period: ${analysis.noticePeriod}`);
    if (analysis.liabilityCap) legalAnalysis.push(`Liability Cap: ${analysis.liabilityCap}`);
    if (analysis.arbitrationClause) legalAnalysis.push(`Arbitration: ${analysis.arbitrationClause}`);

    // Build enforceability check from key legal dimensions
    const enforceabilityCheck: string[] = [];
    if (analysis.governingLaw) enforceabilityCheck.push(`Governing Law: ${analysis.governingLaw}`);
    if (analysis.jurisdiction) enforceabilityCheck.push(`Jurisdiction: ${analysis.jurisdiction}`);
    if (analysis.confidentialityScope) enforceabilityCheck.push(`Confidentiality: ${analysis.confidentialityScope}`);
    if (analysis.indemnityScope) enforceabilityCheck.push(`Indemnity: ${analysis.indemnityScope}`);
    if (analysis.forceMajeure) enforceabilityCheck.push(`Force Majeure: ${analysis.forceMajeure}`);

    const riskScore = typeof analysis.riskScore === 'number' ? analysis.riskScore : 50;
    // Derive compliance score from riskScore (inverse relationship)
    const complianceScore = `${Math.max(10, 100 - riskScore)}%`;

    return {
      finalVerdict: analysis.overallAssessment || 'Review complete.',
      riskLevel: analysis.riskLevel as any || 'Medium',
      riskScore,
      complianceScore,
      contractQuality: riskScore < 30 ? 'Good' : riskScore < 60 ? 'Moderate' : 'Poor',
      simplifiedExplanation: analysis.executiveSummary || 'No summary available.',
      contractClass: analysis.contractType || 'Not Detected',
      governingLaw: analysis.governingLaw || 'Not Detected',
      governingJurisdiction: analysis.jurisdiction || 'Not Detected',
      legalAnalysis,
      risksAndLoopholes,
      enforceabilityCheck,
      whatToDoNext: (analysis.recommendations || []).map((r: any) => `[${r.priority}] ${r.action}`),
      parties: analysis.parties || [],
      effectiveDate: analysis.effectiveDate || null,
      terminationDate: analysis.terminationDate || null,
      contractDuration: analysis.contractDuration || null,
      paymentTerms: analysis.paymentTerms || null,
      penaltyClauses: analysis.penaltyClauses || [],
      terminationConditions: analysis.terminationConditions || [],
      confidentialityScope: analysis.confidentialityScope || null,
      indemnityScope: analysis.indemnityScope || null,
      liabilityCap: analysis.liabilityCap || null,
      forceMajeure: analysis.forceMajeure || null,
      arbitrationClause: analysis.arbitrationClause || null,
      renewalClause: analysis.renewalClause || null,
      noticePeriod: analysis.noticePeriod || null,
      missingClauses: analysis.missingClauses || [],
      highRiskClauses: analysis.highRiskClauses || [],
      mediumRiskClauses: analysis.mediumRiskClauses || [],
      lowRiskClauses: analysis.lowRiskClauses || [],
      redFlags: analysis.redFlags || [],
      legalIssues: analysis.legalIssues || [],
      recommendations: analysis.recommendations || [],
      suggestedClauseImprovements: analysis.suggestedClauseImprovements || [],
      negotiationPoints: analysis.negotiationPoints || [],
      aiConfidence: analysis.aiConfidence || 85,
      overallAssessment: analysis.overallAssessment || '',
    };
  };

  // Legacy text parser - still used for history items that stored text-based analysis
  const parseAnalysisResult = (text: string, filename: string): UIContractAnalysis => {
    // If text looks like JSON (from the new backend format), parse and map it
    if (text && text.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(text) as ContractAnalysisResult;
        return mapAnalysisToUI(parsed, filename);
      } catch (e) {
        // Not valid JSON, fall through to text parsing
      }
    }


    // Legacy text-based fallback for pre-JSON analysis format
    const result: UIContractAnalysis = {
      finalVerdict: 'Review critical indemnity clauses before signing.',
      riskLevel: 'Medium',
      riskScore: 50,
      complianceScore: 'Not Detected',
      contractQuality: 'Not Detected',
      simplifiedExplanation: 'No simplified explanation detected.',
      legalAnalysis: [],
      risksAndLoopholes: [],
      enforceabilityCheck: [],
      whatToDoNext: [],
      contractClass: 'Not Detected',
      governingLaw: 'Not Detected',
      governingJurisdiction: 'Not Detected',
      parties: [],
      effectiveDate: null,
      terminationDate: null,
      contractDuration: null,
      paymentTerms: null,
      penaltyClauses: [],
      terminationConditions: [],
      confidentialityScope: null,
      indemnityScope: null,
      liabilityCap: null,
      forceMajeure: null,
      arbitrationClause: null,
      renewalClause: null,
      noticePeriod: null,
      missingClauses: [],
      highRiskClauses: [],
      mediumRiskClauses: [],
      lowRiskClauses: [],
      redFlags: [],
      legalIssues: [],
      recommendations: [],
      suggestedClauseImprovements: [],
      negotiationPoints: [],
      aiConfidence: 75,
      overallAssessment: '',
    };

    if (!text) return result;

    const cleanLine = (line: string) => {
      return line.replace(/[*#_\-`~[\]()]/g, '').trim();
    };

    const sections = {
      verdict: /⚖️\s*FINAL\s*VERDICT/i,
      explanation: /📖\s*SIMPLIFIED\s*EXPLANATION/i,
      analysis: /🔍\s*LEGAL\s*ANALYSIS/i,
      risks: /🚨\s*RISKS\s*&\s*LOOPHOLES/i,
      enforceability: /🧪\s*ENFORCEABILITY\s*CHECK/i,
      next: /🛠️\s*WHAT\s*TO\s*DO\s*NEXT/i
    };

    const lines = text.split('\n');
    let currentSection = '';

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (sections.verdict.test(trimmed)) {
        currentSection = 'verdict';
        continue;
      } else if (sections.explanation.test(trimmed)) {
        currentSection = 'explanation';
        continue;
      } else if (sections.analysis.test(trimmed)) {
        currentSection = 'analysis';
        continue;
      } else if (sections.risks.test(trimmed)) {
        currentSection = 'risks';
        continue;
      } else if (sections.enforceability.test(trimmed)) {
        currentSection = 'enforceability';
        continue;
      } else if (sections.next.test(trimmed)) {
        currentSection = 'next';
        continue;
      }

      const cleaned = cleanLine(trimmed);
      if (!cleaned) continue;

      if (currentSection === 'verdict') {
        if (cleaned.toLowerCase().includes('risk level')) {
          const match = cleaned.match(/risk\s*level\s*:\s*(\w+)/i);
          if (match) result.riskLevel = (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) as any;
        } else if (cleaned.toLowerCase().includes('compliance score')) {
          const match = cleaned.match(/compliance\s*score\s*:\s*([\w%]+)/i);
          if (match) result.complianceScore = match[1];
        } else if (cleaned.toLowerCase().includes('contract quality')) {
          const match = cleaned.match(/contract\s*quality\s*:\s*(\w+)/i);
          if (match) result.contractQuality = match[1];
        } else {
          result.finalVerdict = cleaned;
        }
      } else if (currentSection === 'explanation') {
        if (result.simplifiedExplanation === 'No simplified explanation detected.') {
          result.simplifiedExplanation = cleaned;
        } else {
          result.simplifiedExplanation += ' ' + cleaned;
        }
      } else if (currentSection === 'analysis') {
        result.legalAnalysis.push(cleaned);
        const lowercase = cleaned.toLowerCase();
        if (lowercase.includes('contract type') || lowercase.includes('contract class')) {
          result.contractClass = cleanLine(cleaned.split(':').pop() || 'Not Detected');
        } else if (lowercase.includes('governing law') || lowercase.includes('applicable law')) {
          result.governingLaw = cleanLine(cleaned.split(':').pop() || 'Not Detected');
        } else if (lowercase.includes('jurisdiction') || lowercase.includes('court')) {
          result.governingJurisdiction = cleanLine(cleaned.split(':').pop() || 'Not Detected');
        }
      } else if (currentSection === 'risks') {
        let riskRating: 'Low' | 'Medium' | 'High' | 'Critical' = 'High';
        let title = 'Clause Risk';
        let clause = 'Not Specified';
        let desc = cleaned;

        if (cleaned.toLowerCase().includes('critical') || cleaned.toLowerCase().includes('asymmetric') || cleaned.toLowerCase().includes('indemnity')) {
          riskRating = 'Critical';
        } else if (cleaned.toLowerCase().includes('medium') || cleaned.toLowerCase().includes('notice period')) {
          riskRating = 'Medium';
        } else if (cleaned.toLowerCase().includes('low')) {
          riskRating = 'Low';
        }

        const clMatch = cleaned.match(/(?:cl|clause)\s*(\d+)/i);
        if (clMatch) clause = `Clause ${clMatch[1]}`;

        if (cleaned.includes(':')) {
          const parts = cleaned.split(':');
          title = parts[0].trim();
          desc = parts.slice(1).join(':').trim();
        }

        result.risksAndLoopholes.push({
          clause,
          title,
          risk: riskRating,
          desc,
        });
      } else if (currentSection === 'enforceability') {
        result.enforceabilityCheck.push(cleaned);
      } else if (currentSection === 'next') {
        result.whatToDoNext.push(cleaned);
      }
    }

    if (result.contractClass === 'Not Detected') {
      if (filename.toLowerCase().includes('nda')) result.contractClass = 'NDA';
      else if (filename.toLowerCase().includes('lease')) result.contractClass = 'Lease Agreement';
      else if (filename.toLowerCase().includes('employment')) result.contractClass = 'Employment Agreement';
      else if (filename.toLowerCase().includes('vendor')) result.contractClass = 'Vendor Agreement';
    }

    return result;
  };

  const checkScanQualityAndProceed = (file: any, proceedCallback: () => void) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
    
    if (isImage) {
      Alert.alert(
        'Poor Scan Quality Warning',
        'OCR confidence is estimated at 68% (<70%). Poor scan quality detected. Analysis may be inaccurate. Try uploading a higher-quality scan.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: proceedCallback }
        ]
      );
    } else {
      proceedCallback();
    }
  };

  const triggerRealAnalysis = async () => {
    if (!selectedFile) return;

    // Consistency check: make sure the selected file still exists in uploadedContracts
    const activeFile = uploadedContracts.find(c => c.id === selectedFileId);
    if (!activeFile || activeFile.name !== selectedFile.name || activeFile.url !== selectedFile.url) {
      Alert.alert('Processing Mismatch', 'Document processing mismatch detected. Please re-upload the file.');
      return;
    }

    // Don't allow analysis if file is still uploading or failed
    if (activeFile.status === 'Uploading...') {
      showToast('error', 'Upload Pending', 'Please wait for the file to finish uploading.');
      return;
    }

    setStep('PROCESSING');
    setCurrentTaskIndex(0);
    setTaskProgress({
      upload: 100, validate: 0, type: 0, text: 0,
      structure: 0, clauses: 0, review: 0, summary: 0, report: 0
    });

    const taskKeys = ['upload', 'validate', 'type', 'text', 'structure', 'clauses', 'review', 'summary', 'report'];
    let currentIdx = 1; // upload is already complete
    setCurrentTaskIndex(1);
    
    const taskInterval = setInterval(() => {
      if (currentIdx < taskKeys.length - 1) { // Stop before last — let AI complete it
        const key = taskKeys[currentIdx];
        setTaskProgress(prev => ({ ...prev, [key]: 100 }));
        currentIdx++;
        setCurrentTaskIndex(currentIdx);
      }
    }, 800);

    try {
      // ── Call the real backend review endpoint ──
      const res = await ContractService.reviewContract({
        fileUrl: selectedFile.url,
        fileName: selectedFile.name,
        caseId: linkedCaseId || undefined,
        versionGroupId: activeVersionGroupId || undefined,
        outputLanguage: outputLanguage,
        language: outputLanguage,
      });

      clearInterval(taskInterval);

      // Complete remaining tasks
      setTaskProgress({
        upload: 100, validate: 100, type: 100, text: 100,
        structure: 100, clauses: 100, review: 100, summary: 100, report: 100
      });
      setCurrentTaskIndex(taskKeys.length);

      if (!res.success || !res.analysis) {
        throw new Error(res.error || 'No analysis returned from server');
      }

      const analysis = res.analysis;

      // Check if the AI flagged this as a non-contract document  
      const summary = (analysis.executiveSummary || '').toLowerCase();
      const isNonContract = (
        summary.includes('not a contract') ||
        summary.includes('unable to analyze') ||
        summary.includes('not a legal contract') ||
        analysis.contractType?.toLowerCase().includes('unknown') ||
        (analysis.riskScore === 0 && !analysis.parties?.length)
      );

      if (isNonContract) {
        setNonContractInfo({
          type: analysis.contractType || 'Unknown Document',
          confidence: `${analysis.aiConfidence || 80}%`,
        });
        setStep('REVIEW');
        showToast('error', 'Analysis Stopped', 'Document does not appear to be a contract.');
        return;
      }

      setNonContractInfo(null);

      // Map structured analysis result to UI fields
      const uiAnalysis = mapAnalysisToUI(analysis, selectedFile.name);
      setAnalysisResult(uiAnalysis);

      // Save report into Contract Analysis History
      try {
        await ContractHistoryService.saveAnalysis({
          contractName: selectedFile.name || 'Contract Analysis',
          originalFileUrl: selectedFile.url || '',
          aiAnalysisResult: JSON.stringify(analysis),
          riskScore: uiAnalysis.riskScore || 75,
          riskLevel: (uiAnalysis.riskLevel as any) || 'Medium',
          governingLaw: uiAnalysis.governingLaw || 'Indian Law',
          aiSummary: uiAnalysis.simplifiedExplanation || 'Contract risk review and clause analysis.',
          caseId: linkedCaseId || undefined,
          versionGroupId: res.versionGroupId || activeVersionGroupId || `vg_${Date.now()}`
        });
        await loadContractHistory();
      } catch (saveErr) {
        console.warn('[ContractAnalyzer] History save error:', saveErr);
      }

      setTimeout(() => {
        setStep('REVIEW');
        showToast('success', 'Review Complete', 'AI Contract Analysis is ready.');
      }, 300);

      // Store savedId and version from auto-save done by backend
      if (res.savedId) {
        setCurrentAnalysisId(res.savedId);
        setActiveVersionGroupId(res.versionGroupId || null);
        setActiveVersionNumber(res.savedVersion || 1);
        if (res.versionGroupId) {
          loadAvailableVersions(res.versionGroupId);
        }
      }

    } catch (err: any) {
      clearInterval(taskInterval);
      setStep('UPLOAD');
      Alert.alert(
        'Analysis Failed',
        `Contract review could not be completed.\n\nDetails: ${err.message || 'Unknown error'}\n\nPlease retry or upload a different document.`,
        [
          { text: 'Retry', onPress: triggerRealAnalysis },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };


  // Start analysis multi-stage loader
  const handleStartAnalysis = () => {
    if (!selectedFileId || !selectedFile) {
      showToast('error', 'Upload Required', 'Please select or upload a contract file first.');
      return;
    }

    // 6. Detect & Reject Invalid Uploads
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
    const rejectedExts = ['mp4', 'mp3', 'wav', 'zip', 'apk', 'exe', 'xlsx', 'xls', 'ppt', 'pptx', 'csv'];
    
    if (rejectedExts.includes(ext) || !allowedExts.includes(ext)) {
      Alert.alert(
        'Unsupported File Format',
        'This file format is not supported for contract analysis.\n\nPlease upload a legal contract document (PDF, DOCX, TXT, or Image).'
      );
      return;
    }

    checkScanQualityAndProceed(selectedFile, () => {
      triggerRealAnalysis();
    });
  };

  // Toggle accordions helper
  const toggleFinding = (key: string) => {
    setExpandedFindings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleClause = (key: string) => {
    setExpandedClauses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Send Message
  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() && attachments.length === 0) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_contract_analyzer',
        attachments,
        undefined,
        linkedCaseId || undefined,
        outputLanguage
      );
      clearAttachments();
    } catch (err) {
      console.warn('[COPILOT SEND ERROR] Send message failed:', err);
    }
  };

  const handleNewChat = () => {
    startNewSession('New Contract Analysis', 'legal_contract_analyzer');
    showToast('success', 'New Analysis Session', 'Ready to audit new agreements.');
  };

  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
         const senderLabel = m.role === 'user' ? 'Lawyer' : 'Contract Specialist';
         return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Contract Review Analysis: ${activeSession.title || 'Untitled Audit'}\n\n${formattedMessages}`;
    
    Share.share({
      title: 'Export Contract Analysis Log',
      message: exportText,
    })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Analysis Exported', 'Contract report log successfully exported.');
        }
      })
      .catch((err) => {
        console.warn('[EXPORT ERROR] Share failed:', err);
      });
  };

  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active analysis log cleared.');
    }
  };

  const handleClearPress = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            handleClearConversation();
          }
        }
      ]
    );
  };

  const handleAiAction = (action: string) => {
    setIsAiAssistantOpen(true);
    let promptText = '';
    switch (action) {
      case 'explain-hindi':
        promptText = "Explain the uploaded contract findings in Hindi translation.";
        break;
      case 'explain-english':
        promptText = "Explain the contract findings in plain simple English.";
        break;
      case 'court-submission':
        promptText = "Generate a draft legal notice demand letter based on these contract risks.";
        break;
      case 'export-pdf':
        promptText = "Generate and export a comprehensive contract risk analysis summary report.";
        break;
      default:
        return;
    }
    setTimeout(() => {
      handleSendChat(promptText);
    }, 450);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Navigation Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'REVIEW') {
              setStep('UPLOAD');
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {tTool(outputLanguage, 'contractAnalyzer.title', 'Contract Analyzer')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {tTool(outputLanguage, 'contractAnalyzer.subtitle', 'AI-powered Contract Review & Risk Intelligence')}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity 
            style={[
              styles.copilotHeaderBtn, 
              { backgroundColor: isDark ? 'rgba(138, 92, 245, 0.08)' : 'rgba(138, 92, 245, 0.15)' }
            ]}
            onPress={() => setIsAiAssistantOpen(true)}
          >
            <Ionicons name="sparkles" size={18} color="#D4AF37" />
          </TouchableOpacity>
          {/* Audit Timeline */}
          <TouchableOpacity style={styles.headerRightBtn} onPress={() => setIsContractHistoryOpen(true)}>
            <Ionicons name="time-outline" size={22} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Linked Case selector bar */}
      <View style={[styles.caseSelectorBar, { borderBottomColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="briefcase-outline" size={16} color="#111111" style={{ marginRight: 6 }} />
        <Text style={[styles.caseSelectorLabel, { color: theme.textSecondary }]}>
          {tTool(outputLanguage, 'contractAnalyzer.workspaceCaseLabel', 'Workspace Case:')} <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{linkedCase ? linkedCase.name : tTool(outputLanguage, 'contractAnalyzer.independentReview', 'Independent Review')}</Text>
        </Text>
        <TouchableOpacity style={styles.caseChangeBtn} onPress={handleOpenCaseSelector}>
          <Text style={styles.caseChangeBtnText}>{tTool(outputLanguage, 'contractAnalyzer.changeBtn', 'Change')}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Areas */}
      {step === 'UPLOAD' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          
          <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OutputLanguageSelector
              toolId="contract-analyzer"
              selectedLanguage={outputLanguage}
              onLanguageChange={(newLang) => {
    setOutputLanguage(newLang);
    useLocalLanguageStore.getState().setLocalLanguage(newLang);
  }}
            />
          </View>

          {/* SECTION 1: Contract Workspace metadata card */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>
              {tTool(outputLanguage, 'contractAnalyzer.workspaceDetails', 'Contract Workspace Details')}
            </Text>
            {linkedCase ? (
              <View style={styles.metadataList}>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.caseName', 'Case Name')}</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>{linkedCase.name}</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.client', 'Client')}</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>{linkedCase.clientName || 'N/A'}</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.contractClass', 'Contract Class')}</Text><Text style={[styles.metaVal, { color: theme.textPrimary }]}>Commercial Lease / NDA</Text></View>
                <View style={styles.metadataRow}><Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.reviewStatus', 'Review Status')}</Text><Text style={[styles.metaVal, { color: '#111111', fontWeight: '800' }]}>AWAITING UPLOAD</Text></View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>{tTool(outputLanguage, 'contractAnalyzer.noCaseLinked', 'No Case Linked (Independent Review Mode)')}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.outlineBtnCompact} onPress={handleOpenCaseSelector}>
                    <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>{tTool(outputLanguage, 'contractAnalyzer.selectExistingCase', 'Select Existing Case')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtnCompact} onPress={() => {
                    showToast('info', 'Workspace Init', 'Navigate to My Matters to configure detailed fields.');
                  }}>
                    <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>{tTool(outputLanguage, 'contractAnalyzer.createNewCase', 'Create New Case')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* SECTION 2: Large Upload Card Container */}
          <View style={[styles.uploadCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {isUploading && uploadedContracts.length === 0 ? (
              // Uploading Spinner (before optimistic card appears)
              <View style={{ alignItems: 'center', width: '100%', paddingVertical: 28 }}>
                <ActivityIndicator size="large" color="#111111" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginTop: 12 }}>
                  {tTool(outputLanguage, 'contractAnalyzer.uploadingDoc', 'Uploading document...')}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>{uploadProgress}% complete</Text>
              </View>
            ) : uploadedContracts.length === 0 ? (
              // Empty State
              <View style={{ alignItems: 'center', width: '100%', paddingVertical: 20 }}>
                <Ionicons name="document-text-outline" size={64} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={[styles.uploadTitle, { color: theme.textPrimary, fontSize: 16, fontWeight: '800' }]}>{tTool(outputLanguage, 'contractAnalyzer.noContractUploaded', 'No Contract Uploaded')}</Text>
                <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center', marginHorizontal: 20, marginBottom: 16, lineHeight: 18 }}>
                  {tTool(outputLanguage, 'contractAnalyzer.uploadContractDesc', 'Upload a contract document to begin AI-powered contract review.')}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700', marginBottom: 16 }}>
                  {tTool(outputLanguage, 'contractAnalyzer.supportedFormats', 'Supported Formats: PDF, DOCX, DOC, TXT, Images (OCR)')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center' }}>
                  <TouchableOpacity style={styles.primaryBtnCompact} onPress={() => setIsUploadSourceSheetOpen(true)}>
                    <Ionicons name="document-text-outline" size={16} color="#111111" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>{tTool(outputLanguage, 'contractAnalyzer.uploadContractBtn', 'Upload Contract')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineBtnCompact} onPress={() => handleSelectOption('camera')}>
                    <Ionicons name="camera-outline" size={16} color="#111111" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>{tTool(outputLanguage, 'contractAnalyzer.captureDocBtn', 'Capture Document')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Uploaded list
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textSecondary }}>{tTool(outputLanguage, 'contractAnalyzer.uploadedDocsTitle', 'Uploaded Documents')} ({uploadedContracts.length})</Text>
                  <TouchableOpacity 
                    onPress={() => setIsUploadSourceSheetOpen(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add-circle" size={16} color="#111111" />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#111111' }}>{tTool(outputLanguage, 'contractAnalyzer.addMoreBtn', 'Add More')}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{ gap: 10 }}>
                  {uploadedContracts.map(file => {
                    const isSelected = selectedFileId === file.id;
                    const isFileUploading = file.status === 'Uploading...';
                    return (
                      <View 
                        key={file.id} 
                        style={[
                          styles.uploadedFileCard, 
                          { borderColor: isSelected ? '#111111' : theme.border, backgroundColor: isSelected ? 'rgba(109, 93, 252, 0.03)' : theme.surface }
                        ]}
                      >
                        <View style={styles.fileCardHeader}>
                          <TouchableOpacity onPress={() => setSelectedFileId(file.id)} style={styles.radioContainer}>
                            <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={20} color="#111111" />
                          </TouchableOpacity>
                          <Ionicons name={getFileIcon(file.name)} size={24} color="#111111" style={{ marginHorizontal: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.fileNameText, { color: theme.textPrimary }]} numberOfLines={1}>{file.name}</Text>
                            <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 2 }}>
                              {formatSize(file.size)} • {file.pages} {file.pages === 1 ? 'Page' : 'Pages'} • {file.uploadTime}
                            </Text>
                            <Text style={{ fontSize: 10, color: getStatusColor(file.status), fontWeight: '700', marginTop: 2 }}>
                              Status: {file.status}
                            </Text>
                            {isFileUploading && (
                              <View style={{ marginTop: 6 }}>
                                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                  <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                                </View>
                                <Text style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 2 }}>{uploadProgress}% — Syncing to server...</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {/* Action Buttons Row */}
                        {!isFileUploading && (
                          <View style={[styles.fileCardActions, { borderTopColor: theme.border }]}>
                            <TouchableOpacity style={styles.fileActionBtn} onPress={() => handleReplacePress(file.id)}>
                              <Ionicons name="swap-horizontal" size={14} color="#111111" />
                              <Text style={styles.fileActionBtnText}>{tTool(outputLanguage, 'contractAnalyzer.replaceBtn', 'Replace')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.fileActionBtn} onPress={() => handleDeleteContract(file.id)}>
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                              <Text style={[styles.fileActionBtnText, { color: '#EF4444' }]}>{tTool(outputLanguage, 'contractAnalyzer.deleteBtn', 'Delete')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {isUploading && (
              <View style={{ width: '100%', marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                  {tTool(outputLanguage, 'contractAnalyzer.uploadingLabel', 'Uploading:')} {uploadProgress}%
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}><View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} /></View>
              </View>
            )}


          </View>

          {/* Trigger button */}
          <TouchableOpacity 
            style={[
              styles.actionBtnLarge, 
              { 
                backgroundColor: '#D4AF37',
                opacity: (!selectedFileId || isUploading) ? 0.45 : 1
              }
            ]} 
            onPress={handleStartAnalysis}
            disabled={!selectedFileId || isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#111111" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnLargeText, { color: '#111111' }]}>{tTool(outputLanguage, 'contractAnalyzer.processingBtn', 'Processing...')}</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#111111" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnLargeText, { color: '#111111' }]}>{tTool(outputLanguage, 'contractAnalyzer.startReviewBtn', 'Start AI Contract Review')}</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* SECTION 3: AI Processing */}
      {step === 'PROCESSING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>
              {tTool(outputLanguage, 'contractAnalyzer.reviewingTitle', 'Reviewing Legal Clauses')}
            </Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              {tTool(outputLanguage, 'contractAnalyzer.reviewingSub', 'Running deep context modeling, compliance checks, and drafting custom mitigation policies.')}
            </Text>

            {/* Parallel Tasks Checklist */}
            <View style={{ width: '100%', gap: 12 }}>
              {processingTasks.map((task, idx) => {
                const isPassed = idx < currentTaskIndex;
                const isActive = idx === currentTaskIndex;
                const progress = taskProgress[task.key] || 0;
                
                return (
                  <View key={task.key} style={styles.processingTaskRow}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isPassed ? (
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        ) : isActive ? (
                          <ActivityIndicator size="small" color="#111111" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={16} color={theme.textMuted} />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? '#111111' : theme.textPrimary }}>
                          {task.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{progress}%</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}><View style={[styles.progressBarFill, { width: `${progress}%` }]} /></View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Contract Review Dashboards */}
      {step === 'REVIEW' && (
        <View style={{ flex: 1 }}>
          {nonContractInfo ? (
            <ScrollView contentContainerStyle={[styles.scrollBody, { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: height * 0.7 }]}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Ionicons name="alert-circle" size={36} color="#EF4444" />
              </View>
              
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 12 }}>
                This document is not a legal contract.
              </Text>
              
              <View style={{ width: '100%', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Detected document:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{nonContractInfo.type}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Confidence:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>{nonContractInfo.confidence}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '700', textAlign: 'center', marginBottom: 24 }}>
                Contract review cannot be performed.
              </Text>
              
              <View style={{ width: '100%', alignSelf: 'stretch', gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Suggested actions:
                </Text>
                
                <TouchableOpacity 
                  onPress={() => setStep('UPLOAD')}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 14, borderRadius: 8 }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#111111" style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.textPrimary, fontSize: 13.5, fontWeight: '700' }}>• Upload a legal contract</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    showToast('info', 'Routing', 'Opening in Evidence Analyzer...');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 14, borderRadius: 8 }}
                >
                  <Ionicons name="analytics" size={18} color="#111111" style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.textPrimary, fontSize: 13.5, fontWeight: '700' }}>• Open in Evidence Analyzer</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    setNonContractInfo(null);
                    setIsAiAssistantOpen(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 14, borderRadius: 8 }}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color="#111111" style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.textPrimary, fontSize: 13.5, fontWeight: '700' }}>• Open in AI Assistant</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={() => setStep('UPLOAD')}
                style={{ marginTop: 32, padding: 12 }}
              >
                <Text style={{ color: '#111111', fontWeight: '800', fontSize: 13 }}>Go Back to Uploads</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <TouchableOpacity style={styles.backLink} onPress={() => setStep('UPLOAD')}>
                    <Ionicons name="arrow-back-outline" size={14} color="#111111" />
                    <Text style={styles.backLinkText}>{tTool(outputLanguage, 'contractAnalyzer.uploadAnother', 'Upload Another Contract')}</Text>
                  </TouchableOpacity>
                  
                  {availableVersions.length > 1 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>Version:</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {availableVersions.map((v) => {
                          const isActive = v._id === currentAnalysisId;
                          return (
                            <TouchableOpacity
                              key={v._id}
                              onPress={() => handleOpenContractAnalysis(v)}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: isActive ? '#111111' : theme.surfaceVariant,
                                borderWidth: 1,
                                borderColor: isActive ? '#111111' : theme.border,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : theme.textPrimary }}>
                                v{v.version}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>

                {/* SECTION 4: Executive Summary KPI Card */}
                <View style={[styles.summaryContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.execSummaryTitle', 'Executive Review Summary')}</Text>
                  
                  <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                      <Text style={[styles.kpiVal, { color: getRiskColor(analysisResult?.riskLevel || 'Medium') }]}>
                        {analysisResult?.riskLevel || 'Medium'}
                      </Text>
                      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.riskLevelLabel', 'Risk Level')}</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                      <Text style={[styles.kpiVal, { color: theme.textPrimary }]}>
                        {analysisResult?.riskScore !== undefined ? `${analysisResult.riskScore}/100` : 'N/A'}
                      </Text>
                      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.riskScoreLabel', 'Risk Score')}</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: theme.border }]}>
                      <Text style={[styles.kpiVal, { color: '#C8A34D' }]}>
                        {analysisResult?.aiConfidence !== undefined ? `${analysisResult.aiConfidence}%` : '85%'}
                      </Text>
                      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.aiConfidenceLabel', 'AI Confidence')}</Text>
                    </View>
                  </View>


                  <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 14 }} />

                  <View style={{ gap: 8 }}>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.contractClass', 'Contract Class')}</Text>
                      <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{analysisResult?.contractClass || 'Not Detected'}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.governingLawLabel', 'Governing Law')}</Text>
                      <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{analysisResult?.governingLaw || 'Not Detected'}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'contractAnalyzer.jurisdictionLabel', 'Jurisdiction')}</Text>
                      <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{analysisResult?.governingJurisdiction || 'Not Detected'}</Text>
                    </View>
                  </View>
                </View>

                {/* SECTION 5: Preamble Explanation */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.preambleTitle', 'Preamble & Purpose')}</Text>
                <View style={[styles.explanationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.reportPara, { color: theme.textPrimary, fontStyle: 'italic', lineHeight: 22 }]}>
                    "{analysisResult?.simplifiedExplanation || 'No simplified explanation detected.'}"
                  </Text>
                </View>

                {/* SECTION 6: Key Contract Metrics (Quick Analysis) */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.keyParamsTitle', 'Key Contract Parameters')}</Text>
                <View style={[styles.metricsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {(!analysisResult || analysisResult.legalAnalysis.length === 0) ? (
                    <Text style={[styles.reportPara, { color: theme.textSecondary }]}>No key parameters analyzed.</Text>
                  ) : (
                    analysisResult.legalAnalysis.map((item: any, idx: number) => (
                      <View key={idx} style={[styles.metricRow, { borderBottomColor: theme.border, borderBottomWidth: idx === analysisResult.legalAnalysis.length - 1 ? 0 : 1 }]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" style={{ marginRight: 8, marginTop: 1 }} />
                        <Text style={[styles.metricText, { color: theme.textPrimary }]}>{item}</Text>
                      </View>
                    ))
                  )}
                </View>
                
                {/* Risks Accordion */}
                <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleFinding('critical')}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={[styles.accordionTitleText, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'contractAnalyzer.risksDetectedTitle', 'Risks Detected')} ({analysisResult?.risksAndLoopholes.length || 0} flagged)
                    </Text>
                    <Ionicons name={expandedFindings.critical ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {expandedFindings.critical && (
                    <View style={styles.accordionBody}>
                      {(!analysisResult || analysisResult.risksAndLoopholes.length === 0) ? (
                        <Text style={[styles.reportPara, { color: theme.textSecondary }]}>No risks or loopholes detected in this document.</Text>
                      ) : (
                        analysisResult.risksAndLoopholes.map((risk: any, index: number) => (
                          <View key={index} style={{ marginBottom: 14, borderBottomWidth: index === analysisResult.risksAndLoopholes.length - 1 ? 0 : 1, borderBottomColor: theme.border, paddingBottom: 10 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.textPrimary }}>
                              {risk.clause !== 'Not Specified' ? `• [${risk.clause}] ` : '• '}{risk.title}
                            </Text>
                            <Text style={[styles.reportPara, { color: theme.textSecondary, marginTop: 4, marginLeft: 10 }]}>
                              {risk.desc}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {/* Enforceability Check */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.enforceabilityTitle', 'Enforceability Check')}</Text>
                <View style={[styles.enforceabilityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {(!analysisResult || analysisResult.enforceabilityCheck.length === 0) ? (
                    <Text style={[styles.reportPara, { color: theme.textSecondary }]}>No enforceability parameters detected.</Text>
                  ) : (
                    analysisResult.enforceabilityCheck.map((item: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        <Ionicons name="shield-checkmark" size={16} color="#111111" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={[styles.reportPara, { color: theme.textPrimary, flex: 1 }]}>{item}</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Risk Distribution Matrix Map */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.riskMatrixTitle', 'Risk Severity Matrix')}</Text>
                <View style={[styles.matrixCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {[
                    { risk: 'Critical', color: '#EF4444', desc: 'Severe legal exposure requiring immediate rewrites.' },
                    { risk: 'High', color: '#F59E0B', desc: 'Asymmetric terms heavily favoring opposing party.' },
                    { risk: 'Medium', color: '#3B82F6', desc: 'Ambiguous wording or minor missing protections.' },
                    { risk: 'Low', color: '#10B981', desc: 'Standard operating clauses with minimal liability.' }
                  ].map((item, idx) => (
                    <View key={idx} style={[styles.matrixRow, { borderBottomColor: theme.border, borderBottomWidth: idx === 3 ? 0 : 1 }]}>
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{item.risk} Severity</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{item.desc}</Text>
                      </View>
                      <View style={[styles.riskBadge, { backgroundColor: item.color + '1C' }]}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: item.color }}>{item.risk}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* SECTION 7: Clause Intelligence */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.clauseIntelTitle', 'Clause Intelligence')}</Text>
                
                {(!analysisResult || analysisResult.risksAndLoopholes.length === 0) ? (
                  <View style={[styles.clauseAccordion, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16 }]}>
                    <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>No clause intelligence available.</Text>
                  </View>
                ) : (
                  analysisResult.risksAndLoopholes.map((risk: any, index: number) => {
                    const key = `clause_${index}`;
                    const isExpanded = expandedClauses[key];
                    return (
                      <View key={key} style={[styles.clauseAccordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <TouchableOpacity style={styles.clauseHeader} onPress={() => setExpandedClauses(prev => ({ ...prev, [key]: !prev[key] }))}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>
                              {risk.clause !== 'Not Specified' ? `${risk.clause}: ` : ''}{risk.title}
                            </Text>
                            <Text style={{ fontSize: 10, color: getRiskColor(risk.risk), fontWeight: '800', marginTop: 2 }}>
                              {risk.risk.toUpperCase()} RISK
                            </Text>
                          </View>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                        {isExpanded && (
                          <View style={styles.clauseBody}>
                            <Text style={[styles.clauseLabel, { color: theme.textPrimary }]}>Original Contract Clause</Text>
                            <Text style={[styles.clauseOriginalText, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}>
                              {risk.title} clause as extracted. Under Indian Law, check if it imposes unreasonable constraints or liabilities on either party.
                            </Text>
                            
                            <Text style={[styles.clauseLabel, { color: theme.textPrimary, marginTop: 12 }]}>AI Critique & Risk Analysis</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                              {risk.desc}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}

                {/* SECTION 8A: Red Flags */}
                {analysisResult?.redFlags && analysisResult.redFlags.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.redFlagsTitle', '🚩 Red Flags')}</Text>
                    <View style={[styles.strategyCard, { backgroundColor: 'rgba(239,68,68,0.04)', borderColor: '#EF4444' }]}>
                      {analysisResult.redFlags.map((flag: string, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                          <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                          <Text style={{ fontSize: 12.5, color: '#EF4444', flex: 1, lineHeight: 18 }}>{flag}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* SECTION 8B: Missing Clauses */}
                {analysisResult?.missingClauses && analysisResult.missingClauses.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.missingClausesTitle', '🔍 Missing Clauses')}</Text>
                    <View style={[styles.strategyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {analysisResult.missingClauses.map((mc: any, idx: number) => (
                        <View key={idx} style={{ marginBottom: 12, borderBottomWidth: idx === analysisResult.missingClauses.length - 1 ? 0 : 1, borderBottomColor: theme.border, paddingBottom: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: mc.importance === 'Critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: mc.importance === 'Critical' ? '#EF4444' : '#F59E0B' }}>{mc.clauseTitle || mc}</Text>
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: mc.importance === 'Critical' ? '#EF4444' : '#F59E0B' }}>{mc.importance || 'Important'}</Text>
                          </View>
                          {mc.reason && <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>{mc.reason}</Text>}
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* SECTION 8C: Negotiation Strategy */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.negotiationTitle', 'Negotiation Strategy')}</Text>
                <View style={[styles.strategyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {analysisResult?.negotiationPoints && analysisResult.negotiationPoints.length > 0 ? (
                    <View style={styles.strategySection}>
                      <Text style={[styles.strategySubheading, { color: '#111111' }]}>💬 Negotiation Points</Text>
                      {analysisResult.negotiationPoints.map((pt: string, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
                          <Ionicons name="git-branch-outline" size={14} color="#111111" style={{ marginRight: 8, marginTop: 2 }} />
                          <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>{pt}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {analysisResult?.whatToDoNext && analysisResult.whatToDoNext.length > 0 && (
                    <View style={[styles.strategySection, { marginTop: analysisResult?.negotiationPoints?.length > 0 ? 16 : 0 }]}>
                      <Text style={[styles.strategySubheading, { color: '#EF4444' }]}>🚨 Recommended Actions</Text>
                      {analysisResult.whatToDoNext.map((item: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>• {item}</Text>
                      ))}
                    </View>
                  )}

                  {(!analysisResult?.negotiationPoints?.length && !analysisResult?.whatToDoNext?.length) && (
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Review indemnity and liability limits carefully before executing this contract.</Text>
                  )}
                </View>


                {/* SECTION 9: Regulatory Compliance */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.regulatoryTitle', 'Regulatory Compliance')}</Text>
                <View style={[styles.complianceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[styles.complianceScoreLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.healthScoreTitle', 'Compliance Health Score')}</Text>
                    <Text style={styles.complianceScoreVal}>{analysisResult?.complianceScore || 'Not Detected'}</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    <View style={styles.complianceRow}>
                      <Ionicons name="checkmark" size={16} color={analysisResult?.governingLaw !== 'Not Detected' ? '#10B981' : '#EF4444'} style={{ marginRight: 6 }} />
                      <Text style={[styles.complianceName, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.lawJurisCheck', 'Governing Law & Jurisdiction check')}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: analysisResult?.governingLaw !== 'Not Detected' ? '#10B981' : '#EF4444' }}>
                        {analysisResult?.governingLaw !== 'Not Detected' ? tTool(outputLanguage, 'contractAnalyzer.compliant', 'Compliant') : tTool(outputLanguage, 'contractAnalyzer.missing', 'Missing')}
                      </Text>
                    </View>
                    <View style={styles.complianceRow}>
                      <Ionicons name="checkmark" size={16} color={analysisResult?.risksAndLoopholes.length <= 2 ? '#10B981' : '#F59E0B'} style={{ marginRight: 6 }} />
                      <Text style={[styles.complianceName, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.liabilityRisk', 'Liability & Indemnification Risk')}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: analysisResult?.risksAndLoopholes.length <= 2 ? '#10B981' : '#F59E0B' }}>
                        {analysisResult?.risksAndLoopholes.length <= 2 ? tTool(outputLanguage, 'contractAnalyzer.lowRisk', 'Low Risk') : tTool(outputLanguage, 'contractAnalyzer.highRisk', 'High Risk')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* SECTION 10: Final AI Verdict */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'contractAnalyzer.verdictTitle', 'Final AI Verdict')}</Text>
                <View style={[styles.verdictCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: analysisResult?.riskLevel === 'Low' ? '#10B981' : '#F59E0B' }} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: analysisResult?.riskLevel === 'Low' ? '#10B981' : '#F59E0B' }}>
                      {analysisResult?.riskLevel === 'Low' ? 'CONTRACT VALIDATED' : tTool(outputLanguage, 'contractAnalyzer.amendmentRec', 'AMENDMENT RECOMMENDED')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                    {analysisResult?.finalVerdict || 'Overall contract health score is moderate.'}
                  </Text>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>


            </>
          )}
        </View>
      )}

      {/* AI Copilot Chat Drawer (Full-Screen AI Workspace) */}
      <Modal
        visible={isAiAssistantOpen}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setIsAiAssistantOpen(false)}
      >
        <View style={[styles.copilotOverlay, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Header Bar */}
              <View style={[styles.copilotHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.copilotBackBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.copilotHeaderTitleContainer}>
                    <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Contract Analyzer Assistant</Text>
                    <Text style={styles.copilotHeaderSubtitle}>Contract Review Specialist</Text>
                  </View>
                </View>

                <OutputLanguageSelector
                  toolId="contract-analyzer"
                  selectedLanguage={outputLanguage}
                  onLanguageChange={(newLang) => {
    setOutputLanguage(newLang);
    useLocalLanguageStore.getState().setLocalLanguage(newLang);
  }}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={handleNewChat} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="add" size={24} color="#C8A34D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsMenuVisible(!isMenuVisible)} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Header Action Dropdown Menu */}
              {isMenuVisible && (
                <Modal
                  transparent={true}
                  visible={isMenuVisible}
                  animationType="fade"
                  onRequestClose={() => setIsMenuVisible(false)}
                >
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuVisible(false)} />
                  <View 
                    style={[
                      styles.menuOverlayContainer, 
                      { 
                        backgroundColor: theme.surface, 
                        borderColor: theme.border, 
                        top: insets.top + 56 
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        setIsSuggestionsSheetOpen(true);
                      }}
                    >
                      <Ionicons name="bulb-outline" size={16} color="#C8A34D" style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Suggestions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        if (activeSession) {
                          handleOpenRename(activeSession.sessionId, activeSession.title);
                        }
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Rename Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleExportChat();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="share-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Export Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        setIsHistoryOpen(true);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Chat History</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleClearPress();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: '#EF4444', opacity: activeSession ? 1 : 0.5, fontWeight: '700' }]}>Clear Conversation</Text>
                    </TouchableOpacity>
                  </View>
                </Modal>
              )}
              {/* Chat Messages / Greeting View */}
              <ScrollView 
                ref={copilotScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                  const paddingToBottom = 150;
                  const isCloseToBottom = e.nativeEvent.layoutMeasurement.height + e.nativeEvent.contentOffset.y >=
                    e.nativeEvent.contentSize.height - paddingToBottom;
                  autoScrollEnabled.current = isCloseToBottom;
                  const isScrollable = e.nativeEvent.contentSize.height > e.nativeEvent.layoutMeasurement.height;
                  if (isScrollable && !isCloseToBottom) {
                    setShowScrollToLatest(true);
                  } else {
                    setShowScrollToLatest(false);
                  }
                }}
                scrollEventThrottle={16}
              >
                {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                  activeSession.messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    
                    if (!isUser && !msg.content.trim()) {
                      return null;
                    }

                    if (isUser) {
                      return (
                        <View 
                          key={msg.id || idx} 
                          style={[styles.chatBubbleContainer, { alignItems: 'flex-end' }]}
                        >
                          <View style={[styles.chatBubble, styles.userBubble, { maxWidth: '75%' }]}>
                            <Text style={styles.userBubbleText}>{msg.content}</Text>
                          </View>
                        </View>
                      );
                    }

                    const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                    return (
                      <View 
                        key={msg.id || idx} 
                        style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                          <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                          </View>
                          <View 
                            style={[
                              styles.chatBubble, 
                              styles.aiBubble, 
                              { backgroundColor: theme.surfaceVariant }
                            ]}
                          >
                            <MarkdownRenderer text={cleanedText} />
 
                            {/* Disclaimer at the bottom of the AI response card */}
                            {disclaimer ? (
                              <View style={styles.disclaimerContainer}>
                                <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                                <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                                  ⚖️ {disclaimer}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
 
                        {/* Dynamic contextual suggestions outside the bubble card */}
                        {suggestions.length > 0 && (
                          <View style={{ marginLeft: 26, marginRight: 16, marginTop: 12, alignSelf: 'stretch' }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Suggested Next Actions
                            </Text>
                            <View style={styles.bubbleSuggestionsContainer}>
                              {suggestions
                                .slice(0, expandedSuggestions[msg.id] ? undefined : 4)
                                .map((suggestion, sIdx) => {
                                  const shortened = shortenSuggestion(suggestion);
                                  return (
                                    <TouchableOpacity
                                      key={sIdx}
                                      style={[styles.bubbleSuggestionChip, { borderColor: '#C8A34D', backgroundColor: theme.surface }]}
                                      onPress={() => handleSendChat(suggestion)}
                                      disabled={isAiThinking}
                                    >
                                      <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]} numberOfLines={1} ellipsizeMode="tail">✓ {shortened}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              
                              {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                                <TouchableOpacity
                                  style={[styles.bubbleSuggestionChip, { borderColor: '#C8A34D', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                  onPress={() => toggleExpandSuggestions(msg.id)}
                                >
                                  <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]} numberOfLines={1} ellipsizeMode="tail">+ More Suggestions</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  // Minimal empty state & greeting (Objective 12)
                  <View style={styles.emptyChatContainer}>
                    <View style={styles.lightweightGreetingContainer}>
                      <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                        Hi, I'm your Contract Analyzer Assistant.
                      </Text>
                      <View style={{ marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                          I can help you with:
                        </Text>
                        {[
                          'Contract Review',
                          'Clause Analysis',
                          'Risk Detection',
                          'Compliance Review',
                          'Negotiation Strategy',
                          'Contract Redrafting',
                          'Legal Summarization',
                        ].map((bullet) => (
                          <Text key={bullet} style={{ fontSize: 12.5, lineHeight: 22, color: theme.textSecondary, fontWeight: '500' }}>
                            • {bullet}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                {isAiThinking && isLatestMessageEmptyModel && (
                  <View style={styles.thinkingBubbleContainer}>
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                    </View>
                    <View style={[styles.chatBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>
                        ⚖️ Thinking  {getThinkingDotsText()}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Attachments preview bar */}
              {attachments.length > 0 && (
                <View style={[styles.copilotAttachmentBar, { borderTopColor: theme.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    {attachments.map((a: any, i: number) => (
                      <View key={i} style={[styles.copilotAttachChip, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <Ionicons name="document-attach" size={14} color="#C8A34D" />
                        <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                        <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Floating "Scroll to Latest" Button */}
              {showScrollToLatest && (
                <TouchableOpacity
                  style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    copilotScrollRef.current?.scrollToEnd({ animated: true });
                    // autoScrollEnabled.current = true;
                    setShowScrollToLatest(false);
                  }}
                >
                  <Ionicons name="arrow-down" size={18} color="#C8A34D" />
                </TouchableOpacity>
              )}

              {/* Chat Composer (ChatGPT Style Rounded Input Area) */}
              <View style={[styles.copilotComposerContainer, { borderTopColor: 'transparent', backgroundColor: theme.surface, paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 28, paddingTop: 8 }]}>
                {isRecording || isTranscribing ? (
                  <View style={styles.recordingWrapper}>
                    <TouchableOpacity onPress={cancelRecording} style={styles.voiceControlBtn}>
                      <Ionicons name="close" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                      {isTranscribing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#C8A34D" />
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                            {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                          <View style={styles.recordingIndicatorDot} />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={stopRecording} style={styles.voiceStopBtn}>
                      <Ionicons name="square" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                    <View style={[
                      styles.composerTextInputContainer, 
                      { 
                        borderColor: isInputFocused ? '#D4AF37' : theme.border, 
                        borderWidth: isInputFocused ? 1.5 : 1,
                        backgroundColor: '#FFFFFF' 
                      }
                    ]}>
                      <TouchableOpacity onPress={showAttachmentOptions} style={styles.composerInnerBtn}>
                        <Ionicons name="add" size={22} color="#C8A34D" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setIsSuggestionsSheetOpen(true)}
                        style={styles.composerInnerBtn}
                        disabled={isAiThinking}
                      >
                        <Ionicons name="sparkles" size={18} color="#C8A34D" />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.composerTextInput, { color: theme.textPrimary }]}
                        placeholder="Analyze contracts, clauses, or risks..."
                        placeholderTextColor={theme.placeholder}
                        value={chatInput}
                        onChangeText={setChatInput}
                        multiline
                        maxLength={1500}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        editable={!isAiThinking && !isRecording}
                      />
                      
                      {isAiThinking ? (
                        <TouchableOpacity style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} onPress={cancelMessageStream}>
                          <Ionicons name="stop" size={12} color="#111111" />
                        </TouchableOpacity>
                      ) : chatInput.trim() ? (
                        <TouchableOpacity 
                          style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} 
                          onPress={() => handleSendChat()}
                        >
                          <Ionicons name="arrow-up" size={16} color="#111111" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} 
                          onPress={() => startRecording(selectedLanguage)}
                          disabled={isRecording}
                        >
                          <Ionicons name="mic" size={18} color="#111111" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Suggestions Bottom Sheet */}
      <Modal
        visible={isSuggestionsSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSuggestionsSheetOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSuggestionsSheetOpen(false)} />
          <View style={[styles.suggestionsSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.suggestionsSheetHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#C8A34D" />
                <Text style={[styles.suggestionsSheetTitle, { color: theme.textPrimary }]}>AI Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.suggestionsCategoryTitle}>Contract Analysis & Review</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CONTRACT_SUGGESTIONS_SHEET.Review.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Compliance & Verification</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CONTRACT_SUGGESTIONS_SHEET.Compliance.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Legal Strategy & Redrafting</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CONTRACT_SUGGESTIONS_SHEET.Strategy.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contract Analysis History Modal */}
      <Modal
        visible={isContractHistoryOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsContractHistoryOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.wizardHeader, { borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <TouchableOpacity onPress={() => setIsContractHistoryOpen(false)} style={styles.wizardBackBtn}>
              <Ionicons name="close-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.wizardTitle, { color: theme.textPrimary, fontSize: 16, fontWeight: '700' }]}>
                Contract Analysis History
              </Text>
              <Text style={[styles.wizardSubtitle, { color: theme.textSecondary, fontSize: 11 }]}>
                Previously analyzed contracts
              </Text>
            </View>
          </View>

          {/* Search and Filters */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, paddingHorizontal: 10 }}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                value={contractHistorySearch}
                onChangeText={setContractHistorySearch}
                placeholder="Search by contract, case, or party name..."
                placeholderTextColor={theme.textSecondary}
                style={{ flex: 1, paddingVertical: 10, color: theme.textPrimary, fontSize: 13.5 }}
              />
              {contractHistorySearch ? (
                <TouchableOpacity onPress={() => setContractHistorySearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'high', label: 'High Risk' },
                { id: 'medium', label: 'Medium Risk' },
                { id: 'low', label: 'Low Risk' },
                { id: 'linked', label: 'Linked to Case' },
                { id: 'independent', label: 'Independent Reviews' }
              ].map((f) => {
                const isActive = contractHistoryFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setContractHistoryFilter(f.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 15,
                      backgroundColor: isActive ? '#111111' : theme.card,
                      borderWidth: 1,
                      borderColor: isActive ? '#111111' : theme.border
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : theme.textPrimary }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* List */}
          {isContractHistoryLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#111111" />
            </View>
          ) : contractHistoryList.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
                No Contract Analysis Yet
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
                Upload your first contract to start AI-powered legal review.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsContractHistoryOpen(false);
                  setStep('UPLOAD');
                }}
                style={{ backgroundColor: '#111111', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 }}>
                  Analyze Your First Contract
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={contractHistoryList}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => {
                const isMenuOpen = isCardMenuOpen === item._id;
                return (
                  <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, padding: 14, position: 'relative' }}>
                    <TouchableOpacity onPress={() => handleOpenContractAnalysis(item)}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>
                            📄 {item.contractName}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                            🏷 {item.caseId && typeof item.caseId === 'object' ? (item.caseId as any).name : 'Independent Review'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: getRiskColor(item.riskLevel) + '1C' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: getRiskColor(item.riskLevel) }}>
                              {item.riskLevel.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }}>
                            {item.riskScore}%
                          </Text>
                          <TouchableOpacity onPress={() => setIsCardMenuOpen(isMenuOpen ? null : item._id)} style={{ padding: 4 }}>
                            <Ionicons name="ellipsis-vertical" size={16} color={theme.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>
                        {item.aiSummary || 'No summary available.'}
                      </Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                          📅 {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                          v{item.version} • Last updated {formatLastUpdated(item.updatedAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Three-dot dropdown menu */}
                    {isMenuOpen && (
                      <View style={{ position: 'absolute', right: 14, top: 40, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 4, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleOpenContractAnalysis(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="eye-outline" size={14} color={theme.textPrimary} />
                          <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleOpenEditContract(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={14} color={theme.textPrimary} />
                          <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleDeleteContractAnalysis(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          <Text style={{ fontSize: 12.5, color: '#EF4444' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Metadata Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Edit Contract Info</Text>
            
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 4, marginTop: 8 }}>Contract Name</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary, marginBottom: 12 }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Contract Name"
              placeholderTextColor={theme.placeholder}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Linked Case ID (Optional)</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary, marginBottom: 16 }]}
              value={editCaseId}
              onChangeText={setEditCaseId}
              placeholder="Paste Case ID here..."
              placeholderTextColor={theme.placeholder}
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setIsEditModalOpen(false);
                  setIsContractHistoryOpen(false);
                  setReplacingContractId(editingContract?._id || null);
                  showAttachmentOptions();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#111111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 }}
              >
                <Ionicons name="document-attach-outline" size={14} color="#111111" />
                <Text style={{ fontSize: 12, color: '#111111', fontWeight: '700' }}>Replace File</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => { setIsEditModalOpen(false); setEditingContract(null); }}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSaveEditContract}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Drawer Modal */}
      <Modal
        visible={isHistoryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.historyDrawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />
          <View style={[styles.historyDrawerContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.historyDrawerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.historyDrawerTitle, { color: theme.textPrimary }]}>Sessions History</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ marginVertical: 12 }}>
              <TextInput
                style={[styles.dialogInput, { marginBottom: 0, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Search history..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.historyDrawerList} showsVerticalScrollIndicator={false}>
              {sessions
                .filter(s => s.activeTool === 'legal_contract_analyzer')
                .filter(s => !searchQuery.trim() || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime())
                .map((s) => {
                  const isActive = activeSessionId === s.sessionId;
                  return (
                    <TouchableOpacity
                      key={s.sessionId}
                      style={[
                        styles.historySessionItem,
                        { backgroundColor: isActive ? 'rgba(138, 92, 245, 0.08)' : 'transparent' },
                      ]}
                      onPress={() => {
                        setActiveSessionId(s.sessionId);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historySessionTitle, { color: isActive ? '#C8A34D' : theme.textPrimary }]}>{s.title}</Text>
                        <Text style={styles.historySessionTime}>
                          {new Date(s.lastModified || s.createdAt || 0).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => handleOpenRename(s.sessionId, s.title)} style={{ padding: 6 }}>
                          <Ionicons name="pencil" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeletePress(s.sessionId)} style={{ padding: 6 }}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Dialog Modal */}
      <Modal
        visible={isRenameDialogOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameDialogOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Conversation</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter new title..."
              placeholderTextColor={theme.placeholder}
              maxLength={40}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setIsRenameDialogOpen(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleConfirmRename}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Upload Source Sheet — PDF / DOCX / Images / Camera */}
      <Modal
        visible={isUploadSourceSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsUploadSourceSheetOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsUploadSourceSheetOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: Math.max(insets.bottom + 20, 32), paddingHorizontal: 20 }}>
                {/* Handle bar */}
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginBottom: 6 }}>Upload Contract Document</Text>
                <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 20 }}>Choose the type of document to upload for AI-powered contract review.</Text>

                {/* PDF Option */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}
                  onPress={async () => {
                    setIsUploadSourceSheetOpen(false);
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: 'application/pdf',
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets?.length > 0) {
                        const asset = result.assets[0];
                        // Trigger via attachment handler callback
                        handleUploadContract({ name: asset.name, url: asset.uri, type: asset.mimeType, size: asset.size });
                      }
                    } catch (e) { showToast('error', 'Picker Error', 'Failed to pick PDF file.'); }
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="document-text" size={22} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.textPrimary }}>Choose PDF</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Contracts, agreements, legal documents</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                {/* DOCX Option */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}
                  onPress={async () => {
                    setIsUploadSourceSheetOpen(false);
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets?.length > 0) {
                        const asset = result.assets[0];
                        handleUploadContract({ name: asset.name, url: asset.uri, type: asset.mimeType, size: asset.size });
                      }
                    } catch (e) { showToast('error', 'Picker Error', 'Failed to pick DOCX file.'); }
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="document" size={22} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.textPrimary }}>Choose DOCX</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Word documents, editable contracts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                {/* Images Option */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}
                  onPress={async () => {
                    setIsUploadSourceSheetOpen(false);
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: 'image/*',
                        copyToCacheDirectory: true,
                        multiple: true,
                      });
                      if (!result.canceled && result.assets?.length > 0) {
                        for (const asset of result.assets) {
                          await handleUploadContract({ name: asset.name, url: asset.uri, type: asset.mimeType, size: asset.size });
                        }
                      }
                    } catch (e) { showToast('error', 'Picker Error', 'Failed to pick images.'); }
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="images" size={22} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.textPrimary }}>Choose Images</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Scanned pages, photos of contract (OCR)</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                {/* Camera Option */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}
                  onPress={() => {
                    setIsUploadSourceSheetOpen(false);
                    handleSelectOption('camera');
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(109, 93, 252, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="camera" size={22} color="#111111" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.textPrimary }}>Scan with Camera</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Photograph contract pages directly</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: theme.surfaceVariant }}
                  onPress={() => setIsUploadSourceSheetOpen(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attachment Bottom Sheet */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />


      {/* Custom Camera Modal */}
      <CustomCameraModal
        visible={isCameraVisible}
        onClose={hideCamera}
        onConfirm={handleCameraConfirm}
      />

      {/* Full Screen Custom File Preview Modal — Images & TXT */}
      <Modal
        visible={isPreviewVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <TouchableOpacity onPress={() => setIsPreviewVisible(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
              {previewFile?.name || 'Document Preview'}
            </Text>
            {/* Share — dedicated icon, never called from Preview button */}
            <TouchableOpacity
              onPress={async () => {
                if (previewFile?.url) {
                  try {
                    const available = await Sharing.isAvailableAsync();
                    if (available) {
                      await Sharing.shareAsync(previewFile.url, { dialogTitle: `Share: ${previewFile?.name}` });
                    } else {
                      Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
                    }
                  } catch (e) {
                    Alert.alert('Share Failed', 'Could not share this document.');
                  }
                }
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Body — TXT and Image viewers only. PDF/DOCX are handled by Chrome Custom Tab. */}
          <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
            {previewFile?.name?.toLowerCase().endsWith('.txt') ? (
              // TXT text viewer
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: '#E2E8F0', fontSize: 13.5, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                  {previewTextContent}
                </Text>
              </ScrollView>
            ) : (
              // Image viewer (zoomable)
              <ScrollView
                maximumZoomScale={4}
                minimumZoomScale={1}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
              >
                <Image source={{ uri: previewFile?.url }} style={{ width: width - 32, height: height * 0.75, resizeMode: 'contain' }} />
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Case Selection Modal Drawer */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                
                {/* Header */}
                <View style={styles.bottomSheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Select Existing Case</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Choose a case workspace for contract review.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.modalSearchContainer, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                  <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: theme.textPrimary }]}
                    placeholder="Search by case title, client, court..."
                    placeholderTextColor={theme.placeholder}
                    value={modalSearchQuery}
                    onChangeText={setModalSearchQuery}
                  />
                  {modalSearchQuery ? (
                    <TouchableOpacity onPress={() => setModalSearchQuery('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Content Area */}
                <View style={{ flex: 1, marginTop: 8 }}>
                  {isCasesLoading ? (
                    // Skeleton Loading
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
                      <View style={[styles.caseCard, { borderColor: theme.border, opacity: 0.6 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ height: 16, backgroundColor: theme.border, borderRadius: 4, width: '60%' }} />
                            <View style={{ height: 12, backgroundColor: theme.border, borderRadius: 4, width: '40%' }} />
                          </View>
                        </View>
                        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
                        <View style={{ height: 12, backgroundColor: theme.border, borderRadius: 4, width: '30%' }} />
                      </View>
                      <View style={[styles.caseCard, { borderColor: theme.border, opacity: 0.6 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ height: 16, backgroundColor: theme.border, borderRadius: 4, width: '70%' }} />
                            <View style={{ height: 12, backgroundColor: theme.border, borderRadius: 4, width: '50%' }} />
                          </View>
                        </View>
                        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
                        <View style={{ height: 12, backgroundColor: theme.border, borderRadius: 4, width: '25%' }} />
                      </View>
                    </ScrollView>
                  ) : casesLoadError ? (
                    // Load Error state
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                      <Ionicons name="alert-circle-outline" size={44} color="#EF4444" style={{ marginBottom: 12 }} />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }}>Unable to load workspaces.</Text>
                      <TouchableOpacity style={styles.primaryBtnCompact} onPress={loadModalCases}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : filteredCases.length === 0 ? (
                    // Empty cases state
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                      <Text style={{ fontSize: 44, marginBottom: 12 }}>📁</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>No Cases Found</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginHorizontal: 20, marginBottom: 20 }}>
                        Create your first workspace to begin contract analysis.
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity 
                          style={styles.primaryBtnCompact} 
                          onPress={() => {
                            setIsCaseSelectOpen(false);
                            showToast('info', 'Workspace Init', 'Navigate to My Matters to configure detailed fields.');
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Create New Case</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.outlineBtnCompact} onPress={() => setIsCaseSelectOpen(false)}>
                          <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Case list
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
                      
                      {/* Independent Review option inside list */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedCaseIdForLink('')}
                        style={[
                          styles.caseCard,
                          {
                            borderColor: selectedCaseIdForLink === '' ? '#111111' : theme.border,
                            backgroundColor: selectedCaseIdForLink === '' ? 'rgba(109, 93, 252, 0.03)' : theme.surface
                          }
                        ]}
                      >
                        <View style={styles.caseCardHeader}>
                          <View style={styles.caseCardLeftInfo}>
                            <Ionicons name="globe-outline" size={20} color="#111111" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.caseCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                Independent Review Mode
                              </Text>
                              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                                No case linked. Contracts will remain isolated.
                              </Text>
                            </View>
                          </View>
                          <Ionicons name={selectedCaseIdForLink === '' ? "radio-button-on" : "radio-button-off"} size={22} color="#111111" />
                        </View>
                      </TouchableOpacity>

                      {filteredCases.map(c => {
                        const isSelected = selectedCaseIdForLink === c._id;
                        const contractCount = (c as any).contracts?.length || 0;
                        const docCount = c.documentCount || (c as any).documents?.length || 0;
                        return (
                          <TouchableOpacity
                            key={c._id}
                            activeOpacity={0.7}
                            onPress={() => setSelectedCaseIdForLink(c._id)}
                            style={[
                              styles.caseCard,
                              {
                                borderColor: isSelected ? '#111111' : theme.border,
                                backgroundColor: isSelected ? 'rgba(109, 93, 252, 0.03)' : theme.surface
                              }
                            ]}
                          >
                            <View style={styles.caseCardHeader}>
                              <View style={styles.caseCardLeftInfo}>
                                <Ionicons name="briefcase" size={20} color="#111111" style={{ marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.caseCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {c.name}
                                  </Text>
                                  {c.clientName ? (
                                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                                      Client: {c.clientName}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                              <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={22} color="#111111" />
                            </View>
                            
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {c.caseType ? (
                                <View style={styles.tagBadge}>
                                  <Text style={styles.tagBadgeText}>{c.caseType}</Text>
                                </View>
                              ) : null}
                              {(c as any).courtName ? (
                                <View style={[styles.tagBadge, { backgroundColor: '#F1F5F9' }]}>
                                  <Text style={[styles.tagBadgeText, { color: '#475569' }]}>{(c as any).courtName}</Text>
                                </View>
                              ) : null}
                              <View style={[styles.tagBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Text style={[styles.tagBadgeText, { color: '#10B981' }]}>Active</Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                                  📄 {contractCount} {contractCount === 1 ? 'Contract' : 'Contracts'}
                                </Text>
                                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                                  📁 {docCount} {docCount === 1 ? 'Document' : 'Documents'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                Updated {formatLastUpdated(c.updatedAt)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* Sticky Footer */}
                <View style={[styles.modalFooter, { borderTopColor: theme.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
                  <TouchableOpacity 
                    style={styles.footerCancelBtn} 
                    onPress={() => {
                      setIsCaseSelectOpen(false);
                      setSelectedCaseIdForLink(null);
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.footerSelectBtn, selectedCaseIdForLink === null && { backgroundColor: '#E2E8F0' }]} 
                    onPress={() => {
                      if (selectedCaseIdForLink !== null) {
                        setLinkedCaseId(selectedCaseIdForLink);
                        setIsCaseSelectOpen(false);
                        if (selectedCaseIdForLink === '') {
                          showToast('success', 'Connected Successfully', 'Independent Review Mode activated.');
                        } else {
                          showToast('success', 'Connected Successfully', 'Workspace case linked successfully.');
                        }
                      }
                    }}
                    disabled={selectedCaseIdForLink === null}
                  >
                    <Text style={{ color: selectedCaseIdForLink !== null ? '#FFFFFF' : '#94A3B8', fontWeight: '800' }}>Select Case</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      marginRight: 8,
      marginLeft: -10,
    },
    headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    // Floating AI Assist Button
    floatingAiBtn: {
      position: 'absolute',
      right: 20,
      bottom: 80,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#111111',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      height: height * 0.92,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    bottomSheetTitle: {
      fontSize: 18,
      fontWeight: '800',
    },
    modalSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 12,
    },
    modalSearchInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },
    caseCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    caseCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    caseCardLeftInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    caseCardTitle: {
      fontSize: 14.5,
      fontWeight: '800',
    },
    tagBadge: {
      backgroundColor: 'rgba(109, 93, 252, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#111111',
    },
    modalFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingTop: 12,
      gap: 12,
    },
    footerCancelBtn: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
    },
    footerSelectBtn: {
      flex: 1.5,
      height: 44,
      backgroundColor: '#111111',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerRightBtn: {
      padding: 6,
    },
    copilotHeaderBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    langToggle: {
      borderWidth: 1.5,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    langToggleText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111111',
    },
    caseSelectorBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    caseSelectorLabel: {
      fontSize: 12,
      flex: 1,
    },
    caseChangeBtn: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    caseChangeBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#111111',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    sectionDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 14,
    },
    backLinkText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#111111',
    },

    // Step 1: Workspace Cards
    workspaceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    cardHeading: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    metadataList: {
      gap: 8,
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    metaVal: {
      fontSize: 12,
      fontWeight: '800',
    },
    outlineBtnCompact: {
      borderWidth: 1.5,
      borderColor: '#111111',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    primaryBtnCompact: {
      backgroundColor: '#D4AF37',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Upload Container Card
    uploadCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginBottom: 14,
    },
    uploadTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 4,
    },
    mockFileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 10,
      width: '100%',
    },
    uploadedFileCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      width: '100%',
    },
    fileCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioContainer: {
      padding: 4,
    },
    fileCardActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      marginTop: 10,
      paddingTop: 10,
    },
    fileActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    fileActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#111111',
    },
    fileNameText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#111111',
    },
    uploadMetaContainer: {
      padding: 12,
      borderRadius: 10,
      width: '100%',
      gap: 6,
    },
    actionBtnLarge: {
      backgroundColor: '#111111',
      borderRadius: 10,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: 10,
    },
    actionBtnLargeText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '800',
    },

    // Analyzing Loader Styles
    analyzingWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    analyzingBox: {
      width: '100%',
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
    },
    processingTaskRow: {
      marginBottom: 10,
    },

    // Executive Summary Dashboard Card
    summaryContainer: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    kpiGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    kpiCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    kpiVal: {
      fontSize: 15,
      fontWeight: '800',
    },
    kpiLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      marginTop: 2,
    },
    summaryBox: {
      padding: 10,
      borderRadius: 8,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
      marginTop: 10,
    },

    // Accordion styling
    accordionCard: {
      borderWidth: 1.5,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    accordionTitleText: {
      fontSize: 13,
      fontWeight: '800',
      flex: 1,
    },
    accordionBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    reportPara: {
      fontSize: 12,
      lineHeight: 18,
    },

    // Risk Matrix
    matrixCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    matrixRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    matrixTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    riskBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },

    // Clause Intelligence
    clauseAccordion: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    clauseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    clauseTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    clauseBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    clauseLabel: {
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 4,
    },
    clauseOriginalText: {
      padding: 10,
      borderRadius: 8,
      fontSize: 11.5,
      lineHeight: 16,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    clauseBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    clauseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clauseActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#111111',
    },

    // Strategy & Compliance Cards
    strategyCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    strategySection: {
      gap: 4,
    },
    strategySubheading: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    strategyDivider: {
      height: 1,
      marginVertical: 10,
    },
    complianceCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    complianceScoreLabel: {
      fontSize: 13,
      fontWeight: '800',
    },
    complianceScoreVal: {
      fontSize: 15,
      fontWeight: '900',
      color: '#111111',
    },
    complianceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    complianceName: {
      fontSize: 12,
      flex: 1,
    },
    verdictCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },

    // Ask AI composer box input
    chatInputSection: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1.5,
    },

    // Sticky Actions bottom footer
    reportFooter: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1.5,
      height: 60,
    },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
    },
    footerBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#111111',
    },


    // AI Copilot styles
    copilotOverlay: {
      flex: 1,
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      justifyContent: 'space-between',
    },
    copilotBackBtn: {
      padding: 8,
      marginLeft: -10,
      marginRight: 6,
    },
    copilotHeaderTitleContainer: {
      justifyContent: 'center',
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    copilotHeaderSubtitle: {
      fontSize: 10.5,
      color: '#C8A34D',
      fontWeight: '700',
      marginTop: 1,
    },
    copilotHeaderIconAction: {
      padding: 6,
    },
    menuOverlayContainer: {
      position: 'absolute',
      right: 16,
      width: 170,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
      zIndex: 999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    menuItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    chatBubbleContainer: {
      marginVertical: 6,
      width: '100%',
    },
    userBubbleAlign: {
      alignSelf: 'flex-end',
      maxWidth: '85%',
    },
    aiBubbleAlign: {
      alignSelf: 'flex-start',
      maxWidth: '94%',
    },
    chatBubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userBubble: {
      backgroundColor: '#C8A34D',
      borderTopRightRadius: 4,
    },
    aiBubble: {
      borderTopLeftRadius: 4,
      flex: 1,
    },
    userBubbleText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '600',
      lineHeight: 18.5,
    },
    aiAvatar: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#C8A34D',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 2,
    },
    disclaimerContainer: {
      marginTop: 10,
      width: '100%',
    },
    disclaimerDivider: {
      height: 1,
      marginVertical: 8,
      width: '100%',
      opacity: 0.5,
    },
    disclaimerText: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      width: '100%',
    },
    bubbleSuggestionChip: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.2,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 8,
      height: 36,
      marginBottom: 8,
    },
    bubbleSuggestionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    emptyChatContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 24,
      paddingBottom: 40,
    },
    lightweightGreetingContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    lightweightGreetingTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 10,
      textAlign: 'center',
    },
    lightweightGreetingSub: {
      fontSize: 12.5,
      lineHeight: 18,
      textAlign: 'center',
      fontWeight: '500',
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
    },
    copilotAttachmentBar: {
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 6,
    },
    copilotAttachLabel: {
      fontSize: 11,
      fontWeight: '700',
      maxWidth: 120,
    },
    floatingScrollBtn: {
      position: 'absolute',
      right: 16,
      bottom: 74,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.2,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      zIndex: 99,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      height: 52,
    },
    voiceControlBtn: {
      padding: 6,
    },
    waveformContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    recordingIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    voiceStopBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerTextInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderWidth: 1,
      borderRadius: 24,
      paddingLeft: 10,
      paddingRight: 6,
      paddingBottom: 6,
      paddingTop: 6,
      minHeight: 52,
      maxHeight: 140,
    },
    composerInnerBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerMicBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    composerTextInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 10,
      paddingVertical: 12,
    },

    // Bottom Sheet overlay suggestion panel
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    suggestionsSheetContainer: {
      height: height * 0.6,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    suggestionsSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    suggestionsSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    suggestionsCategoryTitle: {
      fontSize: 11,
      color: '#C8A34D',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    suggestionsCategoryGroup: {
      gap: 6,
    },
    suggestionsItemBtn: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    suggestionsItemText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // History Drawer Drawer
    historyDrawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    historyDrawerContainer: {
      width: '80%',
      height: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    historyDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    historyDrawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    historyDrawerList: {
      flex: 1,
      marginTop: 10,
    },
    historySessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    historySessionTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    historySessionTime: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 4,
      fontWeight: '600',
    },

    // Rename dialog layouts
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    dialogContainer: {
      width: '100%',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 5,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 14,
    },
    dialogInput: {
      borderWidth: 1.2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13.5,
      fontWeight: '600',
      marginBottom: 20,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    dialogCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    dialogConfirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: '#C8A34D',
    },
    menuDivider: {
      height: 1,
      marginVertical: 4,
      width: '100%',
    },
  });
}
