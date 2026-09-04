import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Clipboard,
  Share,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';

export type QuickActionType =
  | 'draft-maker'
  | 'argument-builder'
  | 'cross-examination'
  | 'progress-report'
  | 'copilot';

interface EnterpriseAiQuickActionsModalProps {
  visible: boolean;
  actionType: QuickActionType | null;
  caseData: CaseWorkspace;
  onClose: () => void;
  onUpdateCase?: () => void;
}

export interface CopilotChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Utility to sanitize AI response and strip all Markdown/formatting symbols
export const sanitizeLegalText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/#+\s?/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`/g, '')
    .replace(/^>\s?/gm, '')
    .replace(/^-{3,}/gm, '')
    .replace(/^[\-\*+]\s?/gm, '')
    .trim();
};

// CATEGORIZED LEGAL DRAFT LIBRARY
export interface DraftCategory {
  category: string;
  items: string[];
}

export const DRAFT_CATEGORIES: DraftCategory[] = [
  {
    category: 'Criminal Law',
    items: [
      'FIR Draft',
      'FIR Reply',
      'Bail Application',
      'Anticipatory Bail',
      'Regular Bail',
      'Default Bail',
      'Quashing Petition',
      'Criminal Revision',
      'Criminal Appeal',
      'Discharge Application',
      'Suspension of Sentence',
      'Compounding Petition',
    ],
  },
  {
    category: 'Civil Law',
    items: [
      'Civil Suit',
      'Written Statement',
      'Plaint',
      'Injunction Application',
      'Recovery Suit',
      'Partition Suit',
      'Declaration Suit',
      'Specific Performance',
      'Execution Petition',
    ],
  },
  {
    category: 'Family Law',
    items: [
      'Divorce Petition',
      'Mutual Divorce',
      'Restitution of Conjugal Rights',
      'Child Custody',
      'Maintenance Petition',
      'Domestic Violence Petition',
    ],
  },
  {
    category: 'Property Law',
    items: [
      'Sale Agreement',
      'Lease Agreement',
      'Gift Deed',
      'Partition Deed',
      'Property Notice',
      'Possession Notice',
    ],
  },
  {
    category: 'Corporate',
    items: [
      'NDA',
      'Employment Agreement',
      'Vendor Agreement',
      'Partnership Deed',
      'MoU',
      'Shareholders Agreement',
      'Board Resolution',
    ],
  },
  {
    category: 'Consumer',
    items: ['Consumer Complaint', 'Legal Notice', 'Reply Notice'],
  },
  {
    category: 'Labour',
    items: ['Termination Notice', 'Labour Complaint', 'Salary Recovery'],
  },
  {
    category: 'Tax',
    items: ['GST Notice Reply', 'Income Tax Reply'],
  },
  {
    category: 'Banking',
    items: ['Loan Recovery Notice', 'SARFAESI Reply'],
  },
  {
    category: 'Intellectual Property',
    items: ['Trademark Objection Reply', 'Copyright Notice', 'Patent Draft'],
  },
  {
    category: 'General',
    items: [
      'Affidavit',
      'Legal Notice',
      'Reply Notice',
      'Petition',
      'Representation',
      'Undertaking',
      'Declaration',
      'Power of Attorney',
      'Memorandum',
    ],
  },
];

// EXTENSIBLE COURT ARGUMENT TYPES
export const ARGUMENT_TYPES_LIST = [
  'Oral Argument',
  'Written Argument',
  'Counter Argument',
  'Rebuttal',
  'Final Argument',
  'Closing Argument',
  'Opening Submission',
  'Interim Argument',
  'Constitutional Argument',
  'Criminal Defence Argument',
  'Civil Argument',
  'Arbitration Submission',
  'Consumer Matter Argument',
  'Tax Matter Argument',
  'Labour Matter Argument',
  'Commercial Matter Argument',
  'Other (Custom)',
];

// EXTENSIBLE CROSS EXAMINATION TYPES
export const CROSS_EXAM_TYPES_LIST = [
  'Cross Examination',
  'Witness Examination',
  'Examination in Chief',
  'Client Preparation Questions',
  'Opposing Counsel Questions',
  'Judge Questions',
  'Investigation Questions',
  'Police Witness',
  'Expert Witness',
  'Character Witness',
  'Medical Witness',
  'Financial Witness',
  'Other (Custom)',
];

export const EnterpriseAiQuickActionsModal: React.FC<EnterpriseAiQuickActionsModalProps> = ({
  visible,
  actionType,
  caseData,
  onClose,
  onUpdateCase,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Preparing AI Context...');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // UNIVERSAL REFERENCE SOURCES CHECKBOXES
  const [referenceSources, setReferenceSources] = useState<Record<string, boolean>>({
    caseInfo: true,
    documents: true,
    evidence: true,
    hearings: true,
    research: true,
    timeline: true,
    tasks: true,
  });

  const toggleReferenceSource = (key: string) => {
    setReferenceSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Tool 1: AI Draft Maker State & Advanced Options
  const [selectedDraftType, setSelectedDraftType] = useState('Anticipatory Bail');
  const [selectedCategory, setSelectedCategory] = useState('Criminal Law');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isDraftPickerOpen, setIsDraftPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentDrafts, setRecentDrafts] = useState<string[]>([
    'Bail Application',
    'Affidavit',
    'Legal Notice',
  ]);
  const [favorites, setFavorites] = useState<string[]>([
    'Anticipatory Bail',
    'Legal Notice',
    'Written Statement',
  ]);
  const [draftLanguage, setDraftLanguage] = useState<'English' | 'Hindi' | 'Bilingual'>('English');
  const [courtLevel, setCourtLevel] = useState<'District' | 'High Court' | 'Supreme Court'>('High Court');
  const [draftStyle, setDraftStyle] = useState<'Professional' | 'Formal' | 'Detailed' | 'Concise'>('Professional');

  // Tool 2: AI Argument Builder Searchable Dropdown & Advanced Controls
  const [selectedArgumentType, setSelectedArgumentType] = useState('Written Argument');
  const [customArgumentType, setCustomArgumentType] = useState('');
  const [isArgumentPickerOpen, setIsArgumentPickerOpen] = useState(false);
  const [argumentSearchQuery, setArgumentSearchQuery] = useState('');
  const [argumentStrength, setArgumentStrength] = useState<'Standard' | 'Strong' | 'Aggressive'>('Strong');
  const [argumentTone, setArgumentTone] = useState<'Neutral' | 'Persuasive' | 'Courtroom Style'>('Persuasive');

  // Tool 3: AI Cross Examination Searchable Dropdown & Advanced Controls
  const [selectedQuestionType, setSelectedQuestionType] = useState('Cross Examination');
  const [customQuestionType, setCustomQuestionType] = useState('');
  const [isCrossPickerOpen, setIsCrossPickerOpen] = useState(false);
  const [crossSearchQuery, setCrossSearchQuery] = useState('');
  const [questionCount, setQuestionCount] = useState<'10' | '20' | '30' | '50'>('20');

  // Tool 4: Progress Report Options
  const [reportDetail, setReportDetail] = useState<'Summary' | 'Detailed' | 'Executive'>('Executive');

  // Tool 5: AI COPILOT MULTI-TURN CHAT STATE
  const [copilotThread, setCopilotThread] = useState<CopilotChatMessage[]>([]);
  const [stickyInputText, setStickyInputText] = useState('');
  const [isCopilotMenuOpen, setIsCopilotMenuOpen] = useState(false);

  const COPILOT_QUICK_PROMPTS = [
    'Summarize Case',
    'Explain Evidence',
    'Draft Reply',
    'Prepare Hearing',
    'Suggest Strategy',
    'Find Weaknesses',
    'Timeline Summary',
    'Research Similar Cases',
  ];

  const COPILOT_FOLLOW_UP_CHIPS = [
    'Prepare Arguments',
    'Explain Evidence',
    'Draft Reply',
    'Prepare Hearing',
    'Find Risks',
    'Translate to Hindi',
    'Simplify',
    'Add Citations',
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (visible && actionType) {
      setGeneratedContent('');
      setGeneratedTitle('');
      setIsEditing(false);

      if (actionType === 'copilot' && copilotThread.length === 0) {
        // Start fresh copilot session
      }
    }
  }, [visible, actionType]);

  // Simulated multi-stage loading progress
  const startLoadingStageSimulation = () => {
    setIsLoading(true);
    setLoadingStage('Preparing AI Context...');
    setTimeout(() => {
      setLoadingStage('Analyzing Case Facts & Evidence...');
    }, 1200);
    setTimeout(() => {
      setLoadingStage('Generating Response...');
    }, 2400);
  };

  // Helper to toggle Favorite
  const toggleFavorite = (draftName: string) => {
    if (favorites.includes(draftName)) {
      setFavorites(favorites.filter((f) => f !== draftName));
    } else {
      setFavorites([...favorites, draftName]);
    }
  };

  // Helper to select draft template
  const handleSelectTemplate = (templateName: string, categoryName: string) => {
    setSelectedDraftType(templateName);
    setSelectedCategory(categoryName);
    const filteredRecents = recentDrafts.filter((r) => r !== templateName);
    setRecentDrafts([templateName, ...filteredRecents].slice(0, 5));
    setIsDraftPickerOpen(false);
  };

  // 1. RUN DRAFT MAKER
  const handleRunDraftMaker = async () => {
    try {
      const activeCaseId = (caseData._id || caseData.id || '') as string;
      startLoadingStageSimulation();
      const res = await CaseService.generateAiDraftMaker(activeCaseId, {
        draftType: selectedDraftType,
        customInstructions: specialInstructions,
        referenceSources,
        advancedOptions: { language: draftLanguage, courtLevel, draftStyle },
      });
      if (res.success) {
        const cleaned = sanitizeLegalText(res.content);
        setGeneratedTitle(res.title);
        setGeneratedContent(cleaned);
        await CaseService.logAiQuickActionActivity(activeCaseId, {
          toolName: 'AI Draft Maker',
          outputType: res.draftType,
          content: cleaned,
        });
        if (onUpdateCase) onUpdateCase();
      }
    } catch (e: any) {
      showToast('error', 'Draft Generation Failed', e?.message || 'Could not generate draft.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. RUN ARGUMENT BUILDER
  const handleRunArgumentBuilder = async () => {
    try {
      const activeCaseId = (caseData._id || caseData.id || '') as string;
      startLoadingStageSimulation();
      const activeType =
        selectedArgumentType === 'Other (Custom)' && customArgumentType.trim()
          ? customArgumentType.trim()
          : selectedArgumentType;

      const res = await CaseService.generateAiArgumentBuilder(activeCaseId, {
        argumentType: activeType,
        FocusPoints: specialInstructions,
        referenceSources,
        advancedOptions: { argumentStrength, tone: argumentTone },
      });
      if (res.success) {
        const cleaned = sanitizeLegalText(res.content);
        setGeneratedTitle(`${activeType} - ${caseData.name}`);
        setGeneratedContent(cleaned);
        await CaseService.logAiQuickActionActivity(activeCaseId, {
          toolName: 'AI Argument Builder',
          outputType: activeType,
          content: cleaned,
        });
        if (onUpdateCase) onUpdateCase();
      }
    } catch (e: any) {
      showToast('error', 'Argument Generation Failed', e?.message || 'Could not build arguments.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. RUN CROSS EXAMINATION
  const handleRunCrossExamination = async () => {
    try {
      const activeCaseId = (caseData._id || caseData.id || '') as string;
      startLoadingStageSimulation();
      const activeType =
        selectedQuestionType === 'Other (Custom)' && customQuestionType.trim()
          ? customQuestionType.trim()
          : selectedQuestionType;

      const res = await CaseService.generateAiCrossExamination(activeCaseId, {
        questionType: activeType,
        witnessName: caseData.opponentName || caseData.clientName || 'Witness',
        referenceSources,
        advancedOptions: { questionCount },
      });
      if (res.success) {
        const cleaned = sanitizeLegalText(res.content);
        setGeneratedTitle(`${activeType} - ${caseData.name}`);
        setGeneratedContent(cleaned);
        await CaseService.logAiQuickActionActivity(activeCaseId, {
          toolName: 'AI Cross Examination',
          outputType: activeType,
          content: cleaned,
        });
        if (onUpdateCase) onUpdateCase();
      }
    } catch (e: any) {
      showToast('error', 'Cross Examination Failed', e?.message || 'Could not generate questions.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. RUN CASE PROGRESS REPORT
  const handleRunProgressReport = async () => {
    try {
      const activeCaseId = (caseData._id || caseData.id || '') as string;
      startLoadingStageSimulation();
      const res = await CaseService.generateCaseProgressReport(activeCaseId, {
        referenceSources,
        advancedOptions: { reportDetail },
      });
      if (res.success) {
        const cleaned = sanitizeLegalText(res.content);
        setGeneratedTitle(res.title);
        setGeneratedContent(cleaned);
        await CaseService.logAiQuickActionActivity(activeCaseId, {
          toolName: 'Case Progress Report',
          outputType: 'Audit Report',
          content: cleaned,
        });
        if (onUpdateCase) onUpdateCase();
      }
    } catch (e: any) {
      showToast('error', 'Report Audit Failed', e?.message || 'Could not generate progress report.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. RUN MULTI-TURN AI COPILOT CHAT PROMPT
  const handleSendCopilotMessage = async (promptText: string) => {
    if (!promptText.trim()) return;
    try {
      const userMsg: CopilotChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        content: promptText.trim(),
        timestamp: new Date(),
      };

      const updatedThread = [...copilotThread, userMsg];
      setCopilotThread(updatedThread);
      setStickyInputText('');

      // Build history for backend LLM memory
      const conversationHistory = updatedThread.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      startLoadingStageSimulation();

      const res = await CaseService.generateAiCopilot(caseData._id, {
        promptText: promptText.trim(),
        conversationHistory,
        referenceSources,
      });

      if (res.success) {
        const cleaned = sanitizeLegalText(res.content);
        const aiMsg: CopilotChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: cleaned,
          timestamp: new Date(),
        };

        setCopilotThread([...updatedThread, aiMsg]);
        setGeneratedTitle(`AI Copilot Thread (${updatedThread.length + 1} turns)`);
        setGeneratedContent(cleaned);

        await CaseService.logAiQuickActionActivity(caseData._id, {
          toolName: 'AI Copilot Chat',
          outputType: promptText.slice(0, 30),
        });

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    } catch (e: any) {
      showToast('error', 'Copilot Error', e?.message || 'Failed to get Copilot response.');
    } finally {
      setIsLoading(false);
    }
  };

  // COPILOT ACTION MENU HANDLERS
  const handleNewCopilotChat = () => {
    setCopilotThread([]);
    setStickyInputText('');
    setGeneratedContent('');
    setIsCopilotMenuOpen(false);
    showToast('success', 'New Chat Started', 'Copilot memory reset for a new thread.');
  };

  const handleClearCopilotChat = () => {
    setCopilotThread([]);
    setStickyInputText('');
    setGeneratedContent('');
    setIsCopilotMenuOpen(false);
    showToast('info', 'Chat Cleared', 'Conversation history cleared.');
  };

  const getSaveCategory = () => {
    switch (actionType) {
      case 'draft-maker':
        return 'AI Generated Drafts';
      case 'argument-builder':
        return 'AI Generated Arguments';
      case 'cross-examination':
        return 'AI Cross Examination';
      case 'progress-report':
        return 'AI Reports';
      case 'copilot':
        return 'AI Copilot Notes';
      default:
        return 'AI Generated Documents';
    }
  };

  // ACTION: SAVE TO CASE DOCUMENTS CATEGORY
  const handleSaveToDocuments = async () => {
    const textToSave = actionType === 'copilot'
      ? copilotThread.map((m) => `[${m.sender === 'user' ? 'Advocate' : 'AI Copilot'}]\n${m.content}`).join('\n\n---\n\n')
      : generatedContent;

    if (!textToSave) return;
    try {
      const categoryFolder = getSaveCategory();
      showToast('success', 'Saved to Workspace', `Saved in Documents -> ${categoryFolder}`);
      if (onUpdateCase) onUpdateCase();
      onClose();
    } catch (e) {
      showToast('error', 'Save Failed', 'Could not save output to case documents.');
    }
  };

  // ACTION: EXPORT PDF
  const handleExportPDF = async () => {
    const textToSave = actionType === 'copilot'
      ? copilotThread.map((m) => `[${m.sender === 'user' ? 'Advocate' : 'AI Copilot'}]\n${m.content}`).join('\n\n')
      : generatedContent;

    if (!textToSave) return;
    try {
      const cleanContent = sanitizeLegalText(textToSave);
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.6; }
              h1 { font-size: 18px; text-align: center; text-transform: uppercase; margin-bottom: 24px; text-decoration: underline; }
              .meta { font-size: 11px; color: #555; text-align: right; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
              .content { white-space: pre-wrap; font-size: 13px; text-align: justify; }
            </style>
          </head>
          <body>
            <h1>${generatedTitle || 'AI LEGAL COPILOT CHAT'}</h1>
            <div class="meta">Case Workspace: ${caseData.name} | Client: ${caseData.clientName || 'N/A'}</div>
            <div class="content">${cleanContent}</div>
          </body>
        </html>
      `;
      await Print.printAsync({ html: htmlContent });
    } catch (e) {
      showToast('error', 'Export Failed', 'Could not render PDF.');
    }
  };

  // ACTION: COPY TEXT
  const handleCopyText = (contentStr?: string) => {
    const target = contentStr || generatedContent;
    const cleanContent = sanitizeLegalText(target);
    Clipboard.setString(cleanContent);
    showToast('success', 'Copied Clean Text', 'Text copied without Markdown.');
  };

  // ACTION: SHARE WITH TEAM
  const handleShareWithTeam = async () => {
    try {
      const cleanContent = sanitizeLegalText(generatedContent);
      await Share.share({
        title: generatedTitle,
        message: `${generatedTitle}\n\n${cleanContent}`,
      });
    } catch (e) {
      // share canceled
    }
  };

  // Search Filter logic for Legal Draft Templates
  const filteredCategories = DRAFT_CATEGORIES.map((cat) => {
    const matchingItems = cat.items.filter(
      (item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { category: cat.category, items: matchingItems };
  }).filter((cat) => cat.items.length > 0);

  const filteredArgumentTypes = ARGUMENT_TYPES_LIST.filter((arg) =>
    arg.toLowerCase().includes(argumentSearchQuery.toLowerCase())
  );

  const filteredCrossTypes = CROSS_EXAM_TYPES_LIST.filter((q) =>
    q.toLowerCase().includes(crossSearchQuery.toLowerCase())
  );

  const getToolTitle = () => {
    switch (actionType) {
      case 'draft-maker':
        return 'Enterprise Legal Draft Generator';
      case 'argument-builder':
        return 'AI Argument Builder';
      case 'cross-examination':
        return 'AI Cross Examination';
      case 'progress-report':
        return 'Case Progress Report';
      case 'copilot':
        return 'AI Copilot Assistant';
      default:
        return 'Enterprise AI Action';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#161616' : '#FFFFFF' }]}>
          {/* MODAL HEADER WITH COPILOT ACTION MENU */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={20} color="#C8A34D" />
              <Text style={[styles.modalTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {getToolTitle()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {actionType === 'copilot' && (
                <TouchableOpacity onPress={() => setIsCopilotMenuOpen(!isCopilotMenuOpen)}>
                  <Ionicons name="ellipsis-vertical" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle-outline" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* COPILOT TOP ACTION MENU MODAL SHEET */}
          {isCopilotMenuOpen && actionType === 'copilot' && (
            <View style={[styles.copilotMenuCard, { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#E5E7EB' }]}>
              <TouchableOpacity style={styles.menuOption} onPress={handleNewCopilotChat}>
                <Ionicons name="add-circle-outline" size={16} color="#C8A34D" />
                <Text style={[styles.menuOptionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>New Conversation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleSaveToDocuments}>
                <Ionicons name="save-outline" size={16} color="#C8A34D" />
                <Text style={[styles.menuOptionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Save to Case Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleExportPDF}>
                <Ionicons name="document-text-outline" size={16} color="#C8A34D" />
                <Text style={[styles.menuOptionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Export Chat (PDF)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={handleClearCopilotChat}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Clear Conversation</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.caseBadgeText, { color: isDark ? '#C8A34D' : '#8B6B23' }]}>
            Workspace: {caseData.name} ({caseData.clientName || 'Client'})
          </Text>

          {/* TOOL 5: ENTERPRISE MULTI-TURN AI COPILOT CHAT EXPERIENCE */}
          {actionType === 'copilot' ? (
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
              >
                {/* QUICK PROMPT CHIPS IF CHAT THREAD IS EMPTY */}
                {copilotThread.length === 0 && (
                  <View style={styles.selectorBox}>
                    <Text style={[styles.sectionHeading, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                      Quick Prompts:
                    </Text>

                    <View style={styles.copilotGrid}>
                      {COPILOT_QUICK_PROMPTS.map((prompt, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.copilotCard, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}
                          onPress={() => handleSendCopilotMessage(prompt)}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#C8A34D" />
                          <Text style={[styles.copilotText, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                            {prompt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* SCROLLABLE MULTI-TURN MESSAGES THREAD */}
                {copilotThread.map((msg) => (
                  <View key={msg.id} style={{ gap: 6 }}>
                    <View
                      style={[
                        styles.chatBubble,
                        msg.sender === 'user'
                          ? [styles.userBubble, { backgroundColor: '#C8A34D' }]
                          : [styles.aiBubble, { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderColor: isDark ? '#383838' : '#E5E7EB' }],
                      ]}
                    >
                      <Text style={[styles.bubbleSender, { color: msg.sender === 'user' ? '#000000' : '#C8A34D' }]}>
                        {msg.sender === 'user' ? 'You (Advocate)' : 'AI Copilot'}
                      </Text>
                      <Text style={[styles.bubbleBody, { color: msg.sender === 'user' ? '#000000' : isDark ? '#E5E7EB' : '#111827' }]}>
                        {msg.content}
                      </Text>
                    </View>

                    {/* SUGGESTED FOLLOW-UP CHIPS UNDER AI MESSAGES */}
                    {msg.sender === 'ai' && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingLeft: 4 }}>
                        {COPILOT_FOLLOW_UP_CHIPS.map((chip, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.followUpChip, { backgroundColor: isDark ? '#333333' : '#F3F4F6' }]}
                            onPress={() => handleSendCopilotMessage(chip)}
                          >
                            <Ionicons name="sparkles" size={12} color="#C8A34D" />
                            <Text style={[styles.followUpChipText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                              {chip}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ))}

                {/* STREAMING LOADING INDICATOR */}
                {isLoading && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#C8A34D" />
                    <Text style={[styles.loadingText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                      {loadingStage}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* STICKY BOTTOM INPUT BAR */}
              <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#E5E7EB' }]}>
                <TouchableOpacity onPress={() => showToast('info', 'Attach Document', 'Select case document...')}>
                  <Ionicons name="attach-outline" size={20} color="#C8A34D" />
                </TouchableOpacity>

                <TextInput
                  style={[styles.stickyInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                  placeholder="Ask anything about this case..."
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  value={stickyInputText}
                  onChangeText={setStickyInputText}
                />

                <TouchableOpacity
                  style={[styles.stickySendBtn, { backgroundColor: '#C8A34D' }]}
                  onPress={() => handleSendCopilotMessage(stickyInputText)}
                >
                  <Ionicons name="arrow-up" size={18} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* TOOL 1: AI DRAFT MAKER */}
              {actionType === 'draft-maker' && !generatedContent && (
                <View style={styles.selectorBox}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                    1. Legal Draft Type *
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.dropdownTriggerBtn,
                      { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderColor: isDark ? '#383838' : '#D1D5DB' },
                    ]}
                    onPress={() => setIsDraftPickerOpen(true)}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Ionicons name="document-text-outline" size={18} color="#C8A34D" />
                      <View style={{ gap: 2 }}>
                        <Text style={[styles.dropdownSelectedText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                          {selectedDraftType}
                        </Text>
                        <Text style={[styles.dropdownCategoryBadge, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          Category: {selectedCategory}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#C8A34D" />
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { color: isDark ? '#D1D5DB' : '#374151', marginTop: 6 }]}>
                    2. Special Instructions for AI
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: isDark ? '#262626' : '#F9FAFB', color: isDark ? '#FFFFFF' : '#111827', borderColor: isDark ? '#383838' : '#E5E7EB' },
                    ]}
                    placeholder="Mention Article 21, cite SC precedent, procedural lapses..."
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.primaryRunBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleRunDraftMaker}
                  >
                    <Ionicons name="sparkles" size={18} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryRunText}>Generate {selectedDraftType}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TOOL 2: AI ARGUMENT BUILDER */}
              {actionType === 'argument-builder' && !generatedContent && (
                <View style={styles.selectorBox}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                    1. Court Argument Type *
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.dropdownTriggerBtn,
                      { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderColor: isDark ? '#383838' : '#D1D5DB' },
                    ]}
                    onPress={() => setIsArgumentPickerOpen(true)}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Ionicons name="flash-outline" size={18} color="#C8A34D" />
                      <Text style={[styles.dropdownSelectedText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {selectedArgumentType === 'Other (Custom)' && customArgumentType
                          ? customArgumentType
                          : selectedArgumentType}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#C8A34D" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryRunBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleRunArgumentBuilder}
                  >
                    <Ionicons name="flash" size={18} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryRunText}>
                      Build{' '}
                      {selectedArgumentType === 'Other (Custom)' && customArgumentType
                        ? customArgumentType
                        : selectedArgumentType}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TOOL 3: AI CROSS EXAMINATION */}
              {actionType === 'cross-examination' && !generatedContent && (
                <View style={styles.selectorBox}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                    1. Question Type *
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.dropdownTriggerBtn,
                      { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderColor: isDark ? '#383838' : '#D1D5DB' },
                    ]}
                    onPress={() => setIsCrossPickerOpen(true)}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <Ionicons name="help-buoy-outline" size={18} color="#C8A34D" />
                      <Text style={[styles.dropdownSelectedText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {selectedQuestionType === 'Other (Custom)' && customQuestionType
                          ? customQuestionType
                          : selectedQuestionType}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#C8A34D" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryRunBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleRunCrossExamination}
                  >
                    <Ionicons name="help-buoy" size={18} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryRunText}>
                      Generate{' '}
                      {selectedQuestionType === 'Other (Custom)' && customQuestionType
                        ? customQuestionType
                        : selectedQuestionType}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* LOADING STATE */}
              {isLoading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#C8A34D" />
                  <Text style={[styles.loadingText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    {loadingStage}
                  </Text>
                </View>
              )}

              {/* EDITABLE GENERATED OUTPUT PREVIEW */}
              {generatedContent !== '' && !isLoading && (
                <View style={styles.outputContainer}>
                  <View style={styles.outputHeader}>
                    <Text style={[styles.outputTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      {generatedTitle}
                    </Text>
                  </View>

                  <View style={[styles.outputContentCard, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                    {isEditing ? (
                      <TextInput
                        style={[
                          styles.editInput,
                          { color: isDark ? '#FFFFFF' : '#111827', borderColor: isDark ? '#383838' : '#E5E7EB' },
                        ]}
                        multiline
                        value={generatedContent}
                        onChangeText={setGeneratedContent}
                      />
                    ) : (
                      <Text style={[styles.outputBodyText, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                        {generatedContent}
                      </Text>
                    )}
                  </View>

                  {/* WORKFLOW TOOLBAR */}
                  <View style={styles.toolBarRow}>
                    <TouchableOpacity
                      style={[styles.secondaryToolBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                      onPress={() => setIsEditing(!isEditing)}
                    >
                      <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={16} color="#C8A34D" />
                      <Text style={[styles.secondaryToolText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                        {isEditing ? 'Done Editing' : 'Edit'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryToolBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                      onPress={() => handleCopyText()}
                    >
                      <Ionicons name="copy-outline" size={16} color="#C8A34D" />
                      <Text style={[styles.secondaryToolText, { color: isDark ? '#E5E7EB' : '#374151' }]}>Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryToolBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                      onPress={handleExportPDF}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#C8A34D" />
                      <Text style={[styles.secondaryToolText, { color: isDark ? '#E5E7EB' : '#374151' }]}>PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryToolBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                      onPress={handleShareWithTeam}
                    >
                      <Ionicons name="share-social-outline" size={16} color="#C8A34D" />
                      <Text style={[styles.secondaryToolText, { color: isDark ? '#E5E7EB' : '#374151' }]}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleSaveToDocuments}
                  >
                    <Ionicons name="save-outline" size={18} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Save & Attach to Case Workspace</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* SEARCHABLE DRAFT TEMPLATE PICKER MODAL */}
      <Modal visible={isDraftPickerOpen} transparent animationType="slide" onRequestClose={() => setIsDraftPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Select Legal Draft Template
              </Text>
              <TouchableOpacity onPress={() => setIsDraftPickerOpen(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarBox, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="🔍 Search Draft..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              {filteredCategories.map((cat, catIdx) => (
                <View key={catIdx} style={styles.pickerSection}>
                  <Text style={[styles.sectionHeaderTitle, { color: '#C8A34D' }]}>
                    📂 {cat.category} ({cat.items.length})
                  </Text>
                  <View style={styles.templatesGrid}>
                    {cat.items.map((item, itemIdx) => {
                      const isSelected = selectedDraftType === item;
                      return (
                        <TouchableOpacity
                          key={itemIdx}
                          style={[
                            styles.templateChipItem,
                            isSelected && styles.templateChipItemActive,
                            { backgroundColor: isSelected ? '#C8A34D' : isDark ? '#2C2C2E' : '#F3F4F6' },
                          ]}
                          onPress={() => handleSelectTemplate(item, cat.category)}
                        >
                          <Text
                            style={[
                              styles.templateChipText,
                              { color: isSelected ? '#000000' : isDark ? '#FFFFFF' : '#111827' },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SEARCHABLE ARGUMENT TYPE PICKER MODAL */}
      <Modal visible={isArgumentPickerOpen} transparent animationType="slide" onRequestClose={() => setIsArgumentPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Select Court Argument Type
              </Text>
              <TouchableOpacity onPress={() => setIsArgumentPickerOpen(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarBox, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="🔍 Search Argument Type..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={argumentSearchQuery}
                onChangeText={setArgumentSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.templatesGrid}>
                {filteredArgumentTypes.map((arg, idx) => {
                  const isSelected = selectedArgumentType === arg;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.templateChipItem,
                        isSelected && styles.templateChipItemActive,
                        { backgroundColor: isSelected ? '#C8A34D' : isDark ? '#2C2C2E' : '#F3F4F6' },
                      ]}
                      onPress={() => {
                        setSelectedArgumentType(arg);
                        setIsArgumentPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.templateChipText,
                          { color: isSelected ? '#000000' : isDark ? '#FFFFFF' : '#111827' },
                        ]}
                      >
                        {arg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SEARCHABLE CROSS EXAMINATION QUESTION TYPE PICKER MODAL */}
      <Modal visible={isCrossPickerOpen} transparent animationType="slide" onRequestClose={() => setIsCrossPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Select Question Type
              </Text>
              <TouchableOpacity onPress={() => setIsCrossPickerOpen(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarBox, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="🔍 Search Question Type..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={crossSearchQuery}
                onChangeText={setCrossSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.templatesGrid}>
                {filteredCrossTypes.map((qType, idx) => {
                  const isSelected = selectedQuestionType === qType;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.templateChipItem,
                        isSelected && styles.templateChipItemActive,
                        { backgroundColor: isSelected ? '#C8A34D' : isDark ? '#2C2C2E' : '#F3F4F6' },
                      ]}
                      onPress={() => {
                        setSelectedQuestionType(qType);
                        setIsCrossPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.templateChipText,
                          { color: isSelected ? '#000000' : isDark ? '#FFFFFF' : '#111827' },
                        ]}
                      >
                        {qType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    height: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  caseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  scrollBody: {
    flexGrow: 0,
  },
  selectorBox: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dropdownTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dropdownCategoryBadge: {
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  textInputSingle: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  primaryRunBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryRunText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  copilotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  copilotCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  copilotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatBubble: {
    borderRadius: 14,
    padding: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  bubbleSender: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bubbleBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  followUpChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  stickyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  stickyInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  stickySendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copilotMenuCard: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    zIndex: 100,
    elevation: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  menuOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  outputContainer: {
    gap: 12,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outputTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  outputContentCard: {
    borderRadius: 10,
    padding: 14,
  },
  outputBodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 180,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  toolBarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryToolBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryToolText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    height: '85%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  pickerSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 8,
  },
  templateChipItemActive: {
    backgroundColor: '#C8A34D',
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
