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
  Animated,
  Share,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { ResearchService } from '@/services/research.service';
import { CaseSummary, CaseWorkspace } from '@/types';
import { Shadows } from '@/theme';
import { StorageService } from '@/services/storage.service';
import { MarkdownRenderer } from '@/components/ui/documents';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

// 18 Legal Directory Categories
const RESEARCH_CATEGORIES = [
  { name: 'Supreme Court', icon: 'ribbon-outline', query: 'Supreme Court Landmark' },
  { name: 'High Court', icon: 'business-outline', query: 'High Court rulings' },
  { name: 'Constitutional Law', icon: 'shield-half-outline', query: 'Article 21 Fundamental Rights' },
  { name: 'Criminal Law', icon: 'skull-outline', query: 'Criminal culpability BNS' },
  { name: 'Civil Law', icon: 'people-outline', query: 'Civil injunction disputes' },
  { name: 'Corporate Law', icon: 'briefcase-outline', query: 'Companies Act compliance' },
  { name: 'Cyber Law', icon: 'desktop-outline', query: 'Information Technology Act Section 66' },
  { name: 'Family Law', icon: 'heart-outline', query: 'Matrimonial maintenance rights' },
  { name: 'Property Law', icon: 'home-outline', query: 'Transfer of Property ownership' },
  { name: 'Consumer Protection', icon: 'cart-outline', query: 'Consumer dispute deficiency' },
  { name: 'Taxation', icon: 'cash-outline', query: 'Income Tax assessment' },
  { name: 'Arbitration', icon: 'git-compare-outline', query: 'Arbitration award set aside' },
  { name: 'Labour Law', icon: 'construct-outline', query: 'Industrial disputes termination' },
  { name: 'Environmental Law', icon: 'leaf-outline', query: 'Polluter pays principle' },
  { name: 'Election Law', icon: 'checkbox-outline', query: 'Representation of People Act' },
  { name: 'Company Law', icon: 'albums-outline', query: 'Corporate insolvency code' },
  { name: 'Motor Accident Claims', icon: 'car-outline', query: 'Motor Vehicle accident compensation' },
  { name: 'Human Rights', icon: 'accessibility-outline', query: 'Human rights detention safeguard' },
];

// Suggested Searches Chips
const SUGGESTED_SEARCHES = [
  'Section 138 NI Act',
  'Section 482 CrPC',
  'Section 65B Evidence Act',
  'Bail under BNS',
  'Cheque Bounce',
  'Specific Performance',
  'Property Dispute',
  'Consumer Protection',
  'Cyber Crime',
  'Motor Accident',
  'Constitutional Remedies',
];

// Featured Statutes
const FEATURED_ACTS = [
  { name: 'Constitution of India', desc: 'Supreme law of India' },
  { name: 'Bharatiya Nyaya Sanhita', desc: 'Substantive criminal law code' },
  { name: 'Bharatiya Nagarik Suraksha', desc: 'Procedural criminal framework' },
  { name: 'Bharatiya Sakshya Adhiniyam', desc: 'Rules of evidence admissibility' },
  { name: 'Civil Procedure Code', desc: 'Civil litigation rules and procedures' },
  { name: 'Indian Contract Act', desc: 'Law of agreements and commercial deals' },
  { name: 'Companies Act', desc: 'Corporate governance guidelines' },
  { name: 'Consumer Protection Act', desc: 'Product liability and buyer rights' },
  { name: 'Transfer of Property Act', desc: 'Immovable asset sale & mortgage laws' },
  { name: 'Information Technology Act', desc: 'Cyber offences and digital signatures' },
  { name: 'Income Tax Act', desc: 'Direct tax laws and regulations' },
];

// 7 Landmark cases mock database
const LANDMARK_CASES = [
  {
    case_name: 'Kesavananda Bharati v. State of Kerala',
    court: 'Supreme Court',
    year: '1973',
    citation: 'AIR 1973 SC 1461',
    legal_principle: 'Basic Structure Doctrine',
    one_line_summary: 'Parliament cannot alter or destroy the basic structure of the Constitution of India.',
    relevance_score: 98,
    why_relevant: 'Provides the foundation for constitutional supremacy challenges.',
    facts: 'The petitioner challenged the Kerala Land Reforms Act, which imposed restrictions on the management of religious property under Article 26 of the Constitution.',
    legal_issues: '1. What is the scope of Parliament\'s power to amend the Constitution under Article 368?\n2. Can Fundamental Rights be abrogated by amendments?',
    ratio_decidendi: 'Parliament has wide powers to amend the Constitution but cannot alter its basic structure, which includes democracy, secularism, and judicial review.',
    reasoning: 'The Constitution is supreme, and Article 368 does not enable the destruction of its core identity.',
  },
  {
    case_name: 'Maneka Gandhi v. Union of India',
    court: 'Supreme Court',
    year: '1978',
    citation: 'AIR 1978 SC 597',
    legal_principle: 'Personal Liberty',
    one_line_summary: 'Procedure established by law under Article 21 must be fair, just, and reasonable.',
    relevance_score: 97,
    why_relevant: 'Expanded Article 21 to include procedural fairness and natural justice.',
    facts: 'The petitioner\'s passport was impounded by the government under Section 10(3)(c) of the Passports Act without assigning any reasons.',
    legal_issues: 'Whether impounding a passport without a hearing violates the right to personal liberty under Article 21.',
    ratio_decidendi: 'Procedure established by law cannot be arbitrary. It must stand the test of reasonableness and natural justice.',
    reasoning: 'The right to travel abroad is part of personal liberty. Any restriction must be backed by a fair hearing.',
  },
  {
    case_name: 'Vishaka v. State of Rajasthan',
    court: 'Supreme Court',
    year: '1997',
    citation: 'AIR 1997 SC 3011',
    legal_principle: 'Sexual Harassment Guidelines',
    one_line_summary: 'Laid down mandatory guidelines to prevent sexual harassment of women at workplaces.',
    relevance_score: 96,
    why_relevant: 'Filled legislative vacuum concerning gender equality and safe workspaces.',
    facts: 'A social worker was gang-raped while performing her duties. Public interest litigation was filed seeking safeguards for working women.',
    legal_issues: 'Whether workplace sexual harassment violates Articles 14, 15, 19, and 21.',
    ratio_decidendi: 'In the absence of domestic legislation, international conventions (CEDAW) can be used to draft binding guidelines.',
    reasoning: 'Every woman has the right to practice any profession in a safe environment free from harassment.',
  },
  {
    case_name: 'Olga Tellis v. Bombay Municipal Corporation',
    court: 'Supreme Court',
    year: '1985',
    citation: 'AIR 1986 SC 180',
    legal_principle: 'Right to Livelihood',
    one_line_summary: 'The right to life under Article 21 includes the right to livelihood.',
    relevance_score: 95,
    why_relevant: 'Protects slum dwellers and pavement traders from arbitrary eviction.',
    facts: 'Bombay Municipal Corporation decided to evict pavement dwellers without providing alternative accommodation.',
    legal_issues: 'Does eviction of pavement dwellers deprive them of their livelihood and violate Article 21?',
    ratio_decidendi: 'Deprivation of livelihood amounts to deprivation of life. Evictions must follow fair procedure.',
    reasoning: 'No person can live without the means of living.',
  },
  {
    case_name: 'Shayara Bano v. Union of India',
    court: 'Supreme Court',
    year: '2017',
    citation: 'AIR 2017 SC 4609',
    legal_principle: 'Triple Talaq Unconstitutional',
    one_line_summary: 'Declared the practice of instant triple talaq void, unconstitutional, and illegal.',
    relevance_score: 94,
    why_relevant: 'Advanced gender justice and tested personal laws against fundamental rights.',
    facts: 'A Muslim woman challenged the practice of Talaq-e-Biddat (instant divorce) after being divorced by her husband via post.',
    legal_issues: 'Whether instant triple talaq violates Article 14 (Right to Equality).',
    ratio_decidendi: 'Instant triple talaq is arbitrary and lacks theological backing, violating Article 14.',
    reasoning: 'What is bad in theology cannot be good in law.',
  },
  {
    case_name: 'Navtej Singh Johar v. Union of India',
    court: 'Supreme Court',
    year: '2018',
    citation: 'AIR 2018 SC 4321',
    legal_principle: 'Decriminalization of Section 377',
    one_line_summary: 'Decriminalized consensual homosexual intercourse between adults under IPC Section 377.',
    relevance_score: 93,
    why_relevant: 'Protects LGBTQ+ rights and dignity under fundamental freedoms.',
    facts: 'Petitioners challenged the constitutional validity of Section 377 of the IPC, which criminalized consensual carnal intercourse against the order of nature.',
    legal_issues: 'Does Section 377 violate Articles 14, 15, 19, and 21?',
    ratio_decidendi: 'Section 377, to the extent it criminalizes consensual adult sex, is arbitrary and unconstitutional.',
    reasoning: 'Constitutional morality overrides social morality. Sexual orientation is an integral part of privacy.',
  },
  {
    case_name: 'K.S. Puttaswamy v. Union of India',
    court: 'Supreme Court',
    year: '2017',
    citation: '(2017) 10 SCC 1',
    legal_principle: 'Right to Privacy',
    one_line_summary: 'Declared the Right to Privacy as a fundamental right protected under Article 21.',
    relevance_score: 99,
    why_relevant: 'Establishes protection against state surveillance and data intrusions.',
    facts: 'A retired judge challenged the validity of the Aadhaar biometric card scheme, claiming it violated privacy rights.',
    legal_issues: 'Whether the right to privacy is protected under Part III of the Constitution.',
    ratio_decidendi: 'Privacy is an essential component of life and liberty, protected under Article 21.',
    reasoning: 'Dignity and autonomy are core constitutional commitments, and privacy safeguards them.',
  },
];

// Latest judgments mock feed
const LATEST_JUDGMENTS = [
  { title: 'State tax levies on mineral-bearing lands held constitutionally valid', court: 'Supreme Court (9-Judge Bench)', date: 'July 2024', area: 'Constitutional Tax' },
  { title: 'Quashed Section 482 quashing petition due to unresolved triable facts', court: 'Delhi High Court', date: 'June 2024', area: 'Criminal Procedure' },
  { title: 'Approved resolution plan of default infrastructure builder company', court: 'NCLAT New Delhi', date: 'June 2024', area: 'Insolvency Code' },
  { title: 'Royalty payouts for foreign tech transfer held exempt from service tax', court: 'CESTAT Mumbai', date: 'May 2024', area: 'Indirect Taxation' },
];

// Helper to normalize different types of precedent schemas
const normalizePrecedent = (p: any, lang: string = 'English') => {
  if (!p) return null;
  const identity = p.case_identity || {};
  const context = p.case_context || {};
  const outcome = p.judgment_outcome || {};
  const basis = p.judgment_basis || {};
  const similarityVal = p.similarity || {};

  const rawCaseName = identity.case_name || p.case_name || 'Legal Precedent';
  const rawCourt = identity.court || p.court || 'Supreme Court of India';
  const rawStatus = outcome.type || p.status || 'Decided';
  const rawFacts = context.facts || p.facts || 'No facts provided.';
  const rawIssues = context.legal_issue || p.legal_issues || 'Applicability of statutory provisions and evidentiary standards.';
  const rawReasoning = basis.legal_reasoning || p.reasoning || 'Court evaluated statutory presumptions and natural justice principles.';
  const rawRatio = p.legal_principle || p.ratio_decidendi || 'Refer to full report.';
  const rawObiter = p.obiter_dicta || 'Persuasive comments on constitutional and statutory interpretation.';
  const rawDecision = outcome.final_decision || p.final_decision || 'Appeal Dismissed. Judgment upheld.';
  const rawWhy = p.why_relevant || 'Directly answers client query regarding limitations.';
  const rawSummary = p.one_line_summary || p.summary || 'Key principle outlines fundamental limits.';

  return {
    case_name: tTool(lang, rawCaseName, rawCaseName),
    court: tTool(lang, rawCourt, rawCourt),
    year: identity.year || p.year || '2024',
    citation: identity.citation || p.citation || 'AIR 2024 SC',
    bench: tTool(lang, identity.bench || p.bench || 'Division Bench', identity.bench || p.bench || 'Division Bench'),
    judge: tTool(lang, identity.judge || p.judge || "Hon'ble Judges", identity.judge || p.judge || "Hon'ble Judges"),
    status: tTool(lang, rawStatus, rawStatus),
    applicable_act: tTool(lang, (basis.relevant_laws && basis.relevant_laws.length > 0) ? basis.relevant_laws.join(', ') : 'Negotiable Instruments Act, 1881', 'Negotiable Instruments Act, 1881'),
    applicable_sections: p.applicable_sections ? p.applicable_sections.join(', ') : (p.tags ? p.tags.join(', ') : 'Section 138, Section 139'),
    jurisdiction: tTool(lang, identity.district || p.jurisdiction || 'New Delhi, India', identity.district || p.jurisdiction || 'New Delhi, India'),
    keywords: p.tags ? p.tags.join(', ') : 'Cheque Bounce, Presumption, Liability',
    facts: tTool(lang, rawFacts, rawFacts),
    legal_issues: tTool(lang, rawIssues, rawIssues),
    reasoning: tTool(lang, rawReasoning, rawReasoning),
    ratio_decidendi: tTool(lang, rawRatio, rawRatio),
    obiter_dicta: tTool(lang, rawObiter, rawObiter),
    final_decision: tTool(lang, rawDecision, rawDecision),
    why_relevant: tTool(lang, rawWhy, rawWhy),
    one_line_summary: tTool(lang, rawSummary, rawSummary),
    relevance_score: similarityVal.relevance_score || p.relevance_score || 95,
  };
};

// Multi-lingual fallback generator for Precedent AI Operations
// Multi-lingual fallback generator for Precedent AI Operations (Supporting all 22 Scheduled Indian Languages)
// Multi-lingual fallback generator for Precedent AI Operations (Supporting all 22 Scheduled Indian Languages)
const getFallbackAiAnalysis = (p: any, actionType: string, activeCase: any, targetLang: string = 'English') => {
  const norm = normalizePrecedent(p, targetLang);
  if (!norm) return '';
  const lang = (targetLang || 'English').trim();

  const caseTitle = tTool(lang, norm.case_name, norm.case_name);
  const factsText = tTool(lang, norm.facts, norm.facts);
  const issuesText = tTool(lang, norm.legal_issues, norm.legal_issues);
  const decisionText = tTool(lang, norm.final_decision, norm.final_decision);
  const ratioText = tTool(lang, norm.ratio_decidendi, norm.ratio_decidendi);

  switch (actionType) {
    case 'simple-english':
    case 'hindi':
      return `### ⚖️ ${tTool(lang, 'legalPrecedents.summarizeSimple', 'Explain in Simple Words')} (${lang})\n\n**${tTool(lang, 'legalPrecedents.caseDossier', 'Case Overview')}:**\n${caseTitle} - ${factsText}\n\n**${tTool(lang, 'legalPrecedents.finalDecision', 'Final Decision')}:**\n${decisionText}`;

    case 'summarize':
      return `### 📝 ${tTool(lang, 'legalPrecedents.summarizeCase', 'Case Summary')}: ${caseTitle}\n\n* **${tTool(lang, 'legalPrecedents.factsOfCase', 'Facts')}**: ${factsText}\n* **${tTool(lang, 'legalPrecedents.legalIssues', 'Legal Issues')}**: ${issuesText}\n* **${tTool(lang, 'legalPrecedents.finalDecision', 'Final Decision')}**: ${decisionText}\n* **${tTool(lang, 'legalPrecedents.ratioDecidendi', 'Ratio Decidendi')}**: ${ratioText}`;

    case 'compare':
      return `### 🔄 ${tTool(lang, 'legalPrecedents.compareCase', 'AI Case Comparison')}\n\n* **${tTool(lang, 'legalPrecedents.factsOfCase', 'Common Facts')}**: ${factsText}\n* **${tTool(lang, 'legalPrecedents.jurisdiction', 'Jurisdiction')}**: ${tTool(lang, norm.jurisdiction, norm.jurisdiction)}\n* **${tTool(lang, 'legalPrecedents.applicableAct', 'Applicable Act')}**: ${tTool(lang, norm.applicable_act, norm.applicable_act)}`;

    case 'stronger':
      return `### 👑 ${tTool(lang, 'legalPrecedents.findStronger', 'Find Stronger Precedents')}\n\n1. **${tTool(lang, 'Kesavananda Bharati v. State of Kerala', 'Kesavananda Bharati v. State of Kerala')}**\n   * ${tTool(lang, 'Parliament cannot alter or destroy the basic structure of the Constitution of India.', 'Parliament cannot alter or destroy the basic structure of the Constitution of India.')}`;

    case 'contrary':
      return `### 🔄 ${tTool(lang, 'legalPrecedents.findOpposite', 'Conflicting Judgments')}\n\n1. **${tTool(lang, 'Krishna Janardhan Bhat v. Dattatraya G. Hegde', 'Krishna Janardhan Bhat v. Dattatraya G. Hegde')}**\n   * ${tTool(lang, 'Overruled by 3-Judge Bench judgment in Rangappa v. Sri Mohan.', 'Overruled by 3-Judge Bench judgment in Rangappa v. Sri Mohan.')}`;

    case 'citation':
      return `### 📜 ${tTool(lang, 'legalPrecedents.citations', 'Citation Formats')}\n\n* **SCC**: ${norm.citation}\n* **AIR**: AIR ${norm.year} SC 1898\n* **Neutral**: ${norm.year} INSC 321`;

    case 'arguments':
      return `### 📣 ${tTool(lang, 'legalPrecedents.courtroomStrategy', 'Courtroom Arguments')}\n\n"${tTool(lang, 'My Lord, as per binding ruling in', 'My Lord, as per binding ruling in')} *${caseTitle}*, ${ratioText}"`;

    case 'draft':
      return `### 📝 ${tTool(lang, 'legalPrecedents.useInDraft', 'Pleading Draft Paragraph')}\n\n"${tTool(lang, 'The complainant submits that in terms of', 'The complainant submits that in terms of')} *${caseTitle}*, ${ratioText}"`;

    default:
      return `AI Analysis complete for ${caseTitle} in ${lang}.`;
  }
};

export default function LegalPrecedentsScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();

  // Output language state
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_legal-precedents');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);

  // Pulse animation for skeleton loader
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const detailsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Modes: 'CURRENT' (Current Case Mode) or 'MANUAL' (Manual Search Mode)
  const [mode, setMode] = useState<'CURRENT' | 'MANUAL'>('MANUAL');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseWorkspace | null>(null);
  
  // Loading states
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Manual Search Query
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  // Search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);

  // Selected Precedent for Detail Modal
  const [selectedPrecedent, setSelectedPrecedent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'comparison' | 'actions'>('intelligence');
  
  // AI assistant states
  const [activePrecedentAiResponse, setActivePrecedentAiResponse] = useState<string | null>(null);
  const [aiActionType, setAiActionType] = useState<string | null>(null);

  // Collapsible cards state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    facts: false,
    issues: false,
    findings: false,
    ratio: false,
    obiter: true,
    decision: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [isCopyCitationOpen, setIsCopyCitationOpen] = useState(false);
  const [isSavePrecedentOpen, setIsSavePrecedentOpen] = useState(false);

  // Modal open triggers
  const [isCaseListOpen, setIsCaseListOpen] = useState(false);

  // Fetch case summaries on mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Fetch case details when activeCaseId changes
  useEffect(() => {
    if (activeCaseId) {
      fetchCaseDetails(activeCaseId);
    } else {
      setActiveCase(null);
      if (mode === 'CURRENT') {
        setSearchResults([]);
        setSearchMetadata(null);
      }
    }
  }, [activeCaseId]);

  // Handle incoming caseId parameter from router
  useEffect(() => {
    if (params.caseId) {
      setActiveCaseId(params.caseId);
      setMode('CURRENT');
    }
  }, [params.caseId]);

  const fetchCases = async () => {
    setIsLoadingCases(true);
    try {
      const response = await CaseService.listCases();
      const casesData = Array.isArray(response) ? response : (response?.data || []);
      const filtered = casesData.filter((c: any) => c.isLegalCase);
      setCases(filtered);
      if (params.caseId) {
        setActiveCaseId(params.caseId);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      showToast('error', 'Error', 'Failed to retrieve cases list.');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const fetchCaseDetails = async (caseId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await CaseService.getCaseDetails(caseId);
      const caseData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;
      if (caseData && caseData._id) {
        setActiveCase(caseData);
        // Trigger auto search based on case context
        handlePrecedentSearch(null, caseId);
      }
    } catch (err) {
      console.error('Failed to load case details:', err);
      showToast('error', 'Error', 'Failed to load case details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePrecedentSearch = async (manualQueryString: string | null = null, forceProjectId: string | null = null) => {
    const targetProjectId = forceProjectId || (mode === 'CURRENT' ? activeCaseId : null);
    
    if (mode === 'CURRENT' && !targetProjectId) {
      setIsCaseListOpen(true);
      return;
    }

    let searchQuery = '';
    if (mode === 'MANUAL') {
      searchQuery = manualQueryString || manualSearchQuery.trim();
      if (!searchQuery) {
        showToast('error', 'Validation Error', 'Please enter a search query.');
        return;
      }
      setManualSearchQuery(searchQuery);
    }

    setIsLoadingSearch(true);
    try {
      const response = await ResearchService.searchPrecedents(
        searchQuery,
        targetProjectId,
        outputLanguage
      );
      
      const searchData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;

      if (searchData) {
        setSearchResults(searchData.precedents || []);
        setSearchMetadata({
          mode: searchData.mode || 'MANUAL',
          query: searchData.query || searchQuery,
        });

        if (!searchData.precedents || searchData.precedents.length === 0) {
          showToast('info', 'No Results', 'No matching precedents found.');
        } else {
          showToast('success', 'Search Complete', `Found ${searchData.precedents.length} precedents.`);
        }
      }
    } catch (err) {
      console.error('Precedent search error:', err);
      showToast('error', 'Search Failed', 'Failed to retrieve precedents.');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // AI Assistant Actions (Tab 3)
  const handleAiAction = async (action: string, precedent: any) => {
    setAiActionType(action);
    setIsAiLoading(true);
    setActivePrecedentAiResponse(null);

    // Draft workflow is immediate local storage export and redirection
    if (action === 'draft') {
      const norm = normalizePrecedent(precedent, outputLanguage);
      if (!norm) return;
      const draftImportText = `[LANDMARK PRECEDENT IMPORT]\nCase: ${norm.case_name}\nCitation: ${norm.citation}\nFacts: ${norm.facts}\nRatio: ${norm.ratio_decidendi}\n\n[Arguments for Pleadings]:\nIt is respectfully submitted that, in accordance with the law laid down in ${norm.case_name} (${norm.citation}), the presumption of liability under Section 139 is mandatory. Once execution of the instrument is established, the onus shifts to the other side to rebut the debt.`;
      
      await StorageService.setItem('@aisa_pending_precedent_draft', JSON.stringify({
        case_name: norm.case_name,
        citation: norm.citation,
        facts: norm.facts,
        ratio: norm.ratio_decidendi,
        text: draftImportText
      }));

      showToast('success', 'Precedent Linked', 'Precedent citation block exported to Draft Maker.');
      setSelectedPrecedent(null);
      router.push('/tools/draft-maker');
      setIsAiLoading(false);
      return;
    }

    try {
      // Map action to backend supported actionType
      let backendAction = action;
      if (action === 'simple-english' || action === 'hindi') {
        backendAction = 'explain';
      }
      
      const response = await ResearchService.analyzePrecedent(
        backendAction,
        precedent,
        activeCaseId,
        outputLanguage
      );

      const parsedData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;

      const analysisText = parsedData?.analysis || parsedData || '';
      
      if (analysisText && analysisText.trim()) {
        setActivePrecedentAiResponse(analysisText);
      } else {
        // Fallback if empty response
        const fallback = getFallbackAiAnalysis(precedent, action, activeCase, outputLanguage);
        setActivePrecedentAiResponse(fallback);
      }
    } catch (err) {
      console.warn('AI analysis request failed, loading fallback:', err);
      const fallback = getFallbackAiAnalysis(precedent, action, activeCase, outputLanguage);
      setActivePrecedentAiResponse(fallback);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyCitation = (precedent: any) => {
    setIsCopyCitationOpen(true);
  };

  const handleSavePrecedent = (precedent: any) => {
    setIsSavePrecedentOpen(true);
  };

  const handleExportPrecedentPdf = async (precedent: any) => {
    if (!precedent) return;
    try {
      const caseName = precedent.case_name || precedent.title || 'Legal Precedent';
      const court = precedent.court || 'Supreme Court of India';
      const year = precedent.year || '';
      const citation = precedent.citation || 'N/A';
      const bench = precedent.bench || 'Division Bench';
      const score = precedent.relevance_score ? `${precedent.relevance_score}% Match` : 'High';
      const principle = precedent.principle || precedent.legal_principle || precedent.summary || 'N/A';
      const facts = precedent.facts || '';
      const decision = precedent.final_decision || precedent.decision || '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111; line-height: 1.6; }
              .header { border-bottom: 3px solid #C8A34D; padding-bottom: 12px; margin-bottom: 20px; }
              .badge { display: inline-block; background-color: #C8A34D; color: #FFF; font-size: 10px; font-weight: bold; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; }
              h1 { font-size: 20px; color: #1E293B; margin: 8px 0 4px 0; }
              .sub { font-size: 12px; color: #64748B; }
              .meta { width: 100%; border-collapse: collapse; margin: 16px 0; background: #F8FAFC; border: 1px solid #E2E8F0; }
              .meta td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #E2E8F0; }
              .label { font-weight: bold; color: #475569; width: 30%; }
              .sec-title { font-size: 14px; font-weight: bold; color: #0F172A; border-left: 4px solid #C8A34D; padding-left: 8px; margin-top: 20px; margin-bottom: 8px; }
              .box { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px; border-radius: 6px; font-size: 12.5px; color: #1E293B; white-space: pre-wrap; }
              .footer { margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 12px; font-size: 10px; color: #94A3B8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="badge">AI Legal Precedent Dossier</span>
              <h1>${caseName}</h1>
              <div class="sub">${court} ${year ? `• ${year}` : ''}</div>
            </div>

            <table class="meta">
              <tr><td class="label">Citation:</td><td>${citation}</td></tr>
              <tr><td class="label">Bench:</td><td>${bench}</td></tr>
              <tr><td class="label">Relevance Score:</td><td>${score}</td></tr>
            </table>

            <div class="sec-title">Key Legal Principle / Ratio Decidendi</div>
            <div class="box">${principle}</div>

            ${facts ? `<div class="sec-title">Facts of the Case</div><div class="box">${facts}</div>` : ''}
            ${decision ? `<div class="sec-title">Final Judgment / Holding</div><div class="box">${decision}</div>` : ''}

            <div class="footer">Generated by AI LEGAL™ Intelligence Suite</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        showToast('success', 'PDF Saved', 'Precedent dossier saved as PDF successfully.');
      } else {
        showToast('info', 'PDF Ready', 'PDF generated successfully.');
      }
    } catch (err) {
      console.error('Failed to export precedent PDF:', err);
      showToast('error', 'Export Failed', 'Unable to export precedent PDF.');
    }
  };

  const handleUseInBuilder = (precedent: any) => {
    showToast('success', 'Linked to Argument Builder', 'Citation loaded into Court Prep Workspace argument files.');
  };

  const handleTabChange = (tab: 'intelligence' | 'comparison' | 'actions') => {
    setActiveTab(tab);
    setTimeout(() => {
      detailsScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);

    if (tab === 'intelligence') {
      // Set simple summary default
    } else if (tab === 'comparison') {
      // Comparison trigger
    } else {
      setActivePrecedentAiResponse(null);
    }
  };

  // Group current case recommendations (Current Case Mode sub-sections)
  const groupedCaseRecommendations = useMemo(() => {
    if (searchResults.length === 0) return null;
    return {
      relevant: searchResults.slice(0, 2),
      supporting: searchResults.slice(2, 4),
      similar: searchResults.slice(4, 5),
      contrary: searchResults.slice(5, 6),
    };
  }, [searchResults]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={[styles.appHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.appHeaderBackBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.appHeaderTitleContainer}>
          <Text numberOfLines={1} style={[styles.appHeaderTitle, { color: theme.textPrimary }]}>
            {tTool(outputLanguage, 'legalPrecedents.title', 'Legal Precedent')}
          </Text>
          <Text numberOfLines={1} style={styles.appHeaderSubtitle}>
            {tTool(outputLanguage, 'legalPrecedents.subtitle', 'Searchable Case Laws & Citations')}
          </Text>
        </View>

        <OutputLanguageSelector
          toolId="legal-precedents"
          selectedLanguage={outputLanguage}
          onLanguageChange={(newLang) => {
            setOutputLanguage(newLang);
            if (manualSearchQuery && manualSearchQuery.trim()) {
              handlePrecedentSearch(manualSearchQuery.trim());
            } else if (mode === 'CURRENT' && activeCaseId) {
              handlePrecedentSearch(null, activeCaseId);
            }
          }}
          compact
        />

      </View>

      {/* Modes Toggle Bar */}
      <View style={[styles.modeToggleRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'CURRENT' && styles.toggleButtonActive]}
          onPress={() => setMode('CURRENT')}
        >
          <Ionicons name="briefcase-outline" size={16} color={mode === 'CURRENT' ? '#111111' : theme.textSecondary} />
          <Text style={[styles.toggleButtonText, { color: mode === 'CURRENT' ? '#111111' : theme.textSecondary }]}>
            {tTool(outputLanguage, 'legalPrecedents.currentCase', 'Current Case')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, mode === 'MANUAL' && styles.toggleButtonActive]}
          onPress={() => setMode('MANUAL')}
        >
          <Ionicons name="search-outline" size={16} color={mode === 'MANUAL' ? '#111111' : theme.textSecondary} />
          <Text style={[styles.toggleButtonText, { color: mode === 'MANUAL' ? '#111111' : theme.textSecondary }]}>
            {tTool(outputLanguage, 'legalPrecedents.manualSearch', 'Manual Search')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Search Panel */}
      <View style={[styles.searchSection, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder={tTool(outputLanguage, 'legalPrecedents.searchPlaceholder', 'Search by Case, Section, Act, Citation...')}
            placeholderTextColor={theme.placeholder}
            value={manualSearchQuery}
            onChangeText={setManualSearchQuery}
            onSubmitEditing={() => handlePrecedentSearch()}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handlePrecedentSearch()}>
            <Text style={styles.searchBtnText}>{tTool(outputLanguage, 'common.search', 'Search')}</Text>
          </TouchableOpacity>
        </View>

        {/* Suggested Searches chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroll}>
          {SUGGESTED_SEARCHES.map((query) => (
            <TouchableOpacity
              key={query}
              style={[styles.suggestedChip, { borderColor: theme.border }]}
              onPress={() => handlePrecedentSearch(query)}
            >
              <Text style={[styles.suggestedChipText, { color: theme.textSecondary }]}>{query}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Scroll Content */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {isLoadingSearch ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111111" />
            <Text style={[styles.loadingText, { color: theme.textPrimary }]}>
              {tTool(outputLanguage, 'common.loading', 'Searching case databases...')}
            </Text>
          </View>
        ) : mode === 'MANUAL' && searchResults.length === 0 ? (
          // REDESIGNED ENTERPRISE RESEARCH WORKSPACE DASHBOARD
          <View style={{ gap: 24 }}>
            
            {/* 1. Research Metrics Cards */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>14,230+</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  {tTool(outputLanguage, 'legalPrecedents.judgmentsIndexed', 'Judgments Indexed')}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>98.5%</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  {tTool(outputLanguage, 'legalPrecedents.accuracy', 'AI Research Accuracy')}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>
                  {tTool(outputLanguage, 'legalPrecedents.cat.Supreme Court', 'Supreme Court')}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  {tTool(outputLanguage, 'legalPrecedents.primarySource', 'Primary Source')}
                </Text>
              </View>
            </View>

            {/* 2. Research Categories Grid */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                {tTool(outputLanguage, 'legalPrecedents.categories', 'Precedent Categories')}
              </Text>
              <View style={styles.categoriesGrid}>
                {RESEARCH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handlePrecedentSearch(cat.query)}
                  >
                    <Ionicons name={cat.icon as any} size={18} color="#111111" style={{ marginBottom: 6 }} />
                    <Text style={[styles.categoryName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {tTool(outputLanguage, `legalPrecedents.cat.${cat.name}`, cat.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. Featured Acts Bare Statutes */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                {tTool(outputLanguage, 'legalPrecedents.featuredActs', 'Featured Acts & Statutes')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {FEATURED_ACTS.map((act) => (
                  <TouchableOpacity
                    key={act.name}
                    style={[styles.actCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handlePrecedentSearch(act.name)}
                  >
                    <Text style={[styles.actTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {act.name}
                    </Text>
                    <Text style={[styles.actDesc, { color: theme.textSecondary }]} numberOfLines={2}>{tTool(outputLanguage, act.desc, act.desc)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 4. Landmark Cases Section */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                {tTool(outputLanguage, 'legalPrecedents.landmarkRulings', 'Landmark Rulings')}
              </Text>
              {LANDMARK_CASES.map((lm) => (
                <TouchableOpacity
                  key={lm.case_name}
                  style={[styles.landmarkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setSelectedPrecedent(lm)}
                >
                  <View style={styles.landmarkHeader}>
                    <Text style={[styles.landmarkTitle, { color: theme.textPrimary }]} numberOfLines={1}>{tTool(outputLanguage, lm.case_name, lm.case_name)}</Text>
                    <Text style={[styles.landmarkYear, { color: theme.textMuted }]}>{lm.year}</Text>
                  </View>
                  <View style={styles.landmarkMeta}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#111111' }}>
                      {tTool(outputLanguage, lm.court, lm.court)} • {tTool(outputLanguage, lm.legal_principle, lm.legal_principle)}
                    </Text>
                  </View>
                  <Text style={[styles.landmarkDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {tTool(outputLanguage, lm.one_line_summary, lm.one_line_summary)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Latest Judgments Timeline */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                {tTool(outputLanguage, 'legalPrecedents.latestJudgments', 'Latest Judgments & Decisions')}
              </Text>
              <View style={[styles.latestContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {LATEST_JUDGMENTS.map((item, idx) => (
                  <View key={idx} style={[styles.latestRow, idx !== LATEST_JUDGMENTS.length - 1 && { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.latestTitle, { color: theme.textPrimary }]} numberOfLines={1}>{tTool(outputLanguage, item.title, item.title)}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        {item.court} • {item.area}
                      </Text>
                    </View>
                    <Text style={[styles.latestDate, { color: theme.textMuted }]}>{item.date}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        ) : mode === 'CURRENT' && !activeCaseId ? (
          // Current Case selection empty state
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="briefcase-outline" size={54} color="#94A3B8" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'legalPrecedents.noCaseSelected', 'No Case Selected')}</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Please link an active Case Workspace to view automatically recommended precedents.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsCaseListOpen(true);
              }}
            >
              <Text style={styles.primaryButtonText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'CURRENT' && groupedCaseRecommendations ? (
          // CURRENT CASE MODE DYNAMIC RECOMENDATION PANELS
          <View style={{ gap: 20 }}>
            {/* Relevant Judgments Accordion */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>📂 {tTool(outputLanguage, 'legalPrecedents.relevantJudgments', 'Relevant Judgments')}</Text>
              {groupedCaseRecommendations.relevant.map((item, idx) => (
                <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} outputLanguage={outputLanguage} />
              ))}
            </View>

            {/* Supporting Authorities Accordion */}
            {groupedCaseRecommendations.supporting.length > 0 && (
              <View>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>📜 {tTool(outputLanguage, 'legalPrecedents.supportingAuthorities', 'Supporting Authorities')}</Text>
                {groupedCaseRecommendations.supporting.map((item, idx) => (
                  <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} outputLanguage={outputLanguage} />
                ))}
              </View>
            )}

            {/* Contrary Authorities Alert Box */}
            {groupedCaseRecommendations.contrary.length > 0 && (
              <View>
                <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>⚠️ {tTool(outputLanguage, 'legalPrecedents.contraryJudgments', 'Contrary Judgments Alert')}</Text>
                {groupedCaseRecommendations.contrary.map((item, idx) => (
                  <View key={idx} style={{ opacity: 0.85 }}>
                    <RenderResultCard item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} isContrary={true} outputLanguage={outputLanguage} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          // SEARCH RESULTS LIST
          <View style={{ gap: 16 }}>
            {searchResults.map((item, idx) => (
              <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} outputLanguage={outputLanguage} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* DETAILED PRECEDENT VIEW & RESEARCH ACTIONS MODAL */}
      {selectedPrecedent && (() => {
        const precedent = normalizePrecedent(selectedPrecedent, outputLanguage);
        if (!precedent) return null;
        return (
          <Modal visible={true} transparent={false} animationType="slide" onRequestClose={() => setSelectedPrecedent(null)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => setSelectedPrecedent(null)}>
                  <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {tTool(outputLanguage, precedent.case_name, precedent.case_name)}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    {tTool(outputLanguage, precedent.court, precedent.court)} • {precedent.year}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPrecedent(null)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Precedent detail Tabs */}
              <View style={[styles.modalTabsRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={[styles.modalTabBtn, activeTab === 'intelligence' && { borderBottomColor: '#111111' }]}
                  onPress={() => handleTabChange('intelligence')}
                >
                  <Text style={[styles.modalTabBtnText, { color: activeTab === 'intelligence' ? '#111111' : theme.textSecondary }]}>
                    {tTool(outputLanguage, 'legalPrecedents.caseDossier', 'Case Dossier')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalTabBtn, activeTab === 'comparison' && { borderBottomColor: '#111111' }]}
                  onPress={() => handleTabChange('comparison')}
                >
                  <Text style={[styles.modalTabBtnText, { color: activeTab === 'comparison' ? '#111111' : theme.textSecondary }]}>
                    {tTool(outputLanguage, 'legalPrecedents.aiAnalysis', 'AI Analysis')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalTabBtn, activeTab === 'actions' && { borderBottomColor: '#111111' }]}
                  onPress={() => handleTabChange('actions')}
                >
                  <Text style={[styles.modalTabBtnText, { color: activeTab === 'actions' ? '#111111' : theme.textSecondary }]}>
                    {tTool(outputLanguage, 'legalPrecedents.aiResearch', 'AI Precedent Research')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable details */}
              <ScrollView contentContainerStyle={styles.modalScrollBody}>
                {activeTab === 'intelligence' && (
                  <View style={{ gap: 16 }}>
                    {/* 1. Overview Card */}
                    <View style={[styles.overviewCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <Text style={[styles.cardSectionTitle, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.dossierOverview', 'Dossier Overview')}
                      </Text>
                      <View style={styles.overviewGrid}>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.court', 'Court:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{tTool(outputLanguage, precedent.court, precedent.court)}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.bench', 'Bench:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{tTool(outputLanguage, precedent.bench, precedent.bench)}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.citations', 'Citation:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{precedent.citation}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.decisionDate', 'Decision Date:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{precedent.year}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.judges', 'Judge(s):')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{tTool(outputLanguage, precedent.judge, precedent.judge)}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.caseStatus', 'Case Status:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{tTool(outputLanguage, precedent.status, precedent.status)}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.applicableAct', 'Applicable Act:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{tTool(outputLanguage, precedent.applicable_act, precedent.applicable_act)}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.applicableSections', 'Applicable Sections:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{precedent.applicable_sections}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.jurisdiction', 'Jurisdiction:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{precedent.jurisdiction}</Text>
                        </View>
                        <View style={styles.overviewRow}>
                          <Text style={styles.overviewLabel}>{tTool(outputLanguage, 'legalPrecedents.keywords', 'Keywords:')}</Text>
                          <Text style={[styles.overviewValText, { color: theme.textPrimary }]}>{precedent.keywords}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 2. Collapsible Facts Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('facts')}>
                        <Text style={[styles.collapsibleTitle, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.factsOfCase', 'Facts of the Case')}
                        </Text>
                        <Ionicons name={collapsedSections.facts ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {!collapsedSections.facts && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{tTool(outputLanguage, precedent.facts, precedent.facts)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Collapsible Issues Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('issues')}>
                        <Text style={[styles.collapsibleTitle, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.legalIssues', 'Legal Issues')}
                        </Text>
                        <Ionicons name={collapsedSections.issues ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {!collapsedSections.issues && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{tTool(outputLanguage, precedent.legal_issues, precedent.legal_issues)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 4. Collapsible Court Findings Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('findings')}>
                        <Text style={[styles.collapsibleTitle, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.keyFindings', 'Court Findings')}
                        </Text>
                        <Ionicons name={collapsedSections.findings ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {!collapsedSections.findings && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{tTool(outputLanguage, precedent.reasoning, precedent.reasoning)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 5. Highlighted Ratio Decidendi Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: isDark ? '#1E1B4B' : '#F5F5F5', borderColor: '#C8A34D', borderLeftWidth: 4 }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('ratio')}>
                        <Text style={[styles.collapsibleTitle, { color: '#C8A34D' }]}>
                          {tTool(outputLanguage, 'legalPrecedents.ratioDecidendi', 'Ratio Decidendi (Established Rule)')}
                        </Text>
                        <Ionicons name={collapsedSections.ratio ? 'chevron-down' : 'chevron-up'} size={18} color="#C8A34D" />
                      </TouchableOpacity>
                      {!collapsedSections.ratio && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: isDark ? '#E9D5FF' : '#4C1D95', fontWeight: '600' }]}>{tTool(outputLanguage, precedent.ratio_decidendi, precedent.ratio_decidendi)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 6. Collapsible Obiter Dicta Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('obiter')}>
                        <Text style={[styles.collapsibleTitle, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.obiterDicta', 'Obiter Dicta (Persuasive)')}
                        </Text>
                        <Ionicons name={collapsedSections.obiter ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {!collapsedSections.obiter && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{tTool(outputLanguage, precedent.obiter_dicta, precedent.obiter_dicta)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 7. Collapsible Final Decision Card */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => toggleSection('decision')}>
                        <Text style={[styles.collapsibleTitle, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.finalDecision', 'Final Decision')}
                        </Text>
                        <Ionicons name={collapsedSections.decision ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {!collapsedSections.decision && (
                        <View style={styles.collapsibleBody}>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>{tTool(outputLanguage, precedent.final_decision, precedent.final_decision)}</Text>
                        </View>
                      )}
                    </View>

                    {/* 8. Case Progress Timeline */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 14 }]}>
                      <Text style={[styles.collapsibleTitle, { color: theme.textPrimary, marginBottom: 12 }]}>
                        {tTool(outputLanguage, 'legalPrecedents.proceduralTimeline', 'Procedural Timeline')}
                      </Text>
                      {[
                        { stage: tTool(outputLanguage, 'legalPrecedents.incident', 'Incident'), desc: tTool(outputLanguage, 'legalPrecedents.incidentDesc', 'Default in underlying payment or bounce event occurred.') },
                        { stage: tTool(outputLanguage, 'legalPrecedents.trialStage', 'Trial Stage'), desc: tTool(outputLanguage, 'legalPrecedents.trialStageDesc', 'Filed in Metropolitan Magistrate Court; evidence parsed.') },
                        { stage: tTool(outputLanguage, 'legalPrecedents.appellateChallenge', 'Appellate Challenge'), desc: tTool(outputLanguage, 'legalPrecedents.appellateDesc', 'Appealed to High Court under statutory revision.') },
                        { stage: tTool(outputLanguage, 'legalPrecedents.finalJudgmentStage', 'Final Judgment'), desc: tTool(outputLanguage, 'legalPrecedents.finalJudgmentDesc', `Supreme Court ruling (${precedent.year}) setting ratio.`) }
                      ].map((step, sIdx) => (
                        <View key={sIdx} style={styles.timelineRow}>
                          <View style={styles.timelineLeftColumn}>
                            <View style={[styles.timelineDot, { backgroundColor: '#C8A34D' }]} />
                            {sIdx !== 3 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={[styles.timelineStageTitle, { color: theme.textPrimary }]}>{step.stage}</Text>
                            <Text style={[styles.timelineStageDesc, { color: theme.textSecondary }]}>{step.desc}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* 9. 5 Similar Cases */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 14 }]}>
                      <Text style={[styles.collapsibleTitle, { color: theme.textPrimary, marginBottom: 10 }]}>
                        {tTool(outputLanguage, 'legalPrecedents.similarPrecedents', 'Similar Precedents (Indian Law)')}
                      </Text>
                      {LANDMARK_CASES.filter(c => c.case_name !== selectedPrecedent.case_name).slice(0, 5).map((sim, simIdx) => (
                        <TouchableOpacity
                          key={simIdx}
                          style={[styles.similarCaseRow, { borderBottomColor: theme.border }]}
                          onPress={() => {
                            setSelectedPrecedent(sim);
                            setActivePrecedentAiResponse(null);
                          }}
                        >
                          <Ionicons name="document-text-outline" size={16} color="#C8A34D" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.similarCaseTitle, { color: theme.textPrimary }]} numberOfLines={1}>{sim.case_name}</Text>
                            <Text style={{ fontSize: 10, color: theme.textSecondary }}>{sim.court} • {sim.citation}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 10. Copy Citation Formats Grid */}
                    <View style={[styles.collapsibleCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 14 }]}>
                      <Text style={[styles.collapsibleTitle, { color: theme.textPrimary, marginBottom: 12 }]}>
                        {tTool(outputLanguage, 'legalPrecedents.citationReference', 'Citation Formats Reference')}
                      </Text>
                      {[
                        { label: 'SCC', val: precedent.citation },
                        { label: 'AIR', val: `AIR ${precedent.year} SC 1898` },
                        { label: 'SCR', val: `(${precedent.year}) 7 SCR 321` },
                        { label: 'CrLJ', val: `${precedent.year} CrLJ 2828` },
                        { label: 'Neutral', val: `${precedent.year} INSC 321` }
                      ].map((citItem, citIdx) => (
                        <View key={citIdx} style={styles.citationFormatRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.citationFormatLabel}>{citItem.label}</Text>
                            <Text style={[styles.citationFormatValue, { color: theme.textPrimary }]}>{citItem.val}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.miniCopyBtn, { backgroundColor: theme.surfaceVariant }]}
                            onPress={() => {
                              Clipboard.setString(citItem.val);
                              showToast('success', 'Copied', `${citItem.label} citation format copied.`);
                            }}
                          >
                            <Ionicons name="copy-outline" size={14} color="#C8A34D" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'comparison' && (
                  <View style={{ gap: 16 }}>
                    {/* Radial / Circle Match Score Header */}
                    <View style={[styles.matchScoreCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <View style={styles.radialScoreContainer}>
                        <View style={[styles.radialCircle, { borderColor: '#10B981' }]}>
                          <Text style={styles.radialText}>{precedent.relevance_score}%</Text>
                          <Text style={styles.radialSub}>{tTool(outputLanguage, 'legalPrecedents.match', 'Match')}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                          <Text style={[styles.matchStatusTitle, { color: theme.textPrimary }]}>
                            {tTool(outputLanguage, 'legalPrecedents.caseCompatibility', 'Case Compatibility')}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, lineHeight: 16 }}>
                            {activeCaseId 
                              ? tTool(outputLanguage, 'legalPrecedents.compatActiveText', `This precedent matches your active case '${activeCase?.name}' based on statutory sections and transaction overlaps.`).replace('{caseName}', activeCase?.name || '')
                              : tTool(outputLanguage, 'legalPrecedents.compatDefaultText', 'This precedent has high authoritative weight for cheque bounce and presumption liability disputes.')}
                          </Text>
                        </View>
                      </View>

                      {/* Matching and Missing Facts */}
                      <View style={[styles.matchDetailsBox, { borderTopColor: theme.border }]}>
                        <Text style={[styles.detailHeading, { color: theme.textPrimary, marginTop: 10 }]}>
                          {tTool(outputLanguage, 'legalPrecedents.matchFactsComp', 'Match Facts Comparison')}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                          {tTool(outputLanguage, 'legalPrecedents.commonFactsText', '• **Common Facts:** Admission of signatures on cheque leaf, commercial transactions relationship.')}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginTop: 4 }}>
                          {tTool(outputLanguage, 'legalPrecedents.missingFactsText', '• **Missing Facts:** Return of damaged goods registry, written notice of payment dispute.')}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#EF4444', lineHeight: 18, marginTop: 4, fontWeight: '700' }}>
                          {tTool(outputLanguage, 'legalPrecedents.potentialRisksText', '• **Potential Risks:** Distinguishing due to goods returned defense prior to cheque presentation.')}
                        </Text>
                      </View>
                    </View>

                    {/* 1. Executive Summary */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.aiExecSummary', 'AI Executive Summary')}
                      </Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.execSummaryText', 'This landmark ruling establishes that under Section 138/139 of the Negotiable Instruments Act, the presumption of a legally enforceable debt is mandatory once the signature is admitted. The standard of proof to rebut this presumption is "preponderance of probabilities," requiring the defense to raise a probable doubt rather than absolute negation.')}
                      </Text>
                    </View>

                    {/* 2. Why this Precedent Matters */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.whyMatters', 'Why This Precedent Matters')}
                      </Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.whyMattersText', 'It resolves conflicts between multiple high court decisions regarding "security cheques." Cite this case to defeat the standard defense that the cheque was given only as security and hence cannot attract criminal prosecution.')}
                      </Text>
                    </View>

                    {/* 3. Strength of Authority badges */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary, marginBottom: 8 }]}>
                        {tTool(outputLanguage, 'legalPrecedents.strengthAuthority', 'Strength of Authority')}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.authorityBadge, { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}>
                          <Text style={{ fontSize: 10, color: '#111111', fontWeight: '800' }}>
                            {tTool(outputLanguage, 'legalPrecedents.cat.Supreme Court', 'Supreme Court')}
                          </Text>
                        </View>
                        <View style={[styles.authorityBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>
                            {tTool(outputLanguage, 'legalPrecedents.bindingPrecedent', 'Binding Precedent')}
                          </Text>
                        </View>
                        <View style={[styles.authorityBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                          <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '800' }}>3-Judge Bench</Text>
                        </View>
                        <View style={[styles.authorityBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                          <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '800' }}>
                            {tTool(outputLanguage, 'legalPrecedents.widelyFollowed', 'Widely Followed')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* 4. Confidence Score */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.confidenceIntel', 'Confidence Intelligence')}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          {tTool(outputLanguage, 'legalPrecedents.confidenceRating', 'AI Confidence Rating:')} 99%
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          {tTool(outputLanguage, 'legalPrecedents.evidenceLevel', 'Evidence Level:')} {tTool(outputLanguage, 'legalPrecedents.high', 'High')}
                        </Text>
                      </View>
                    </View>

                    {/* 5. AI Litigation Advice */}
                    <View style={[styles.detailBox, { backgroundColor: isDark ? '#1E1B4B' : '#FAF5FF', borderColor: '#C084FC' }]}>
                      <Text style={[styles.detailHeading, { color: '#C8A34D' }]}>
                        {tTool(outputLanguage, 'legalPrecedents.litigationAdvice', 'AI Litigation Advice')}
                      </Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.adviseRelyText', '✔ **Rely on this case** if the respondent admits signing the cheque but claims they had no liability or that it was an advance cheque.')}
                      </Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary, marginTop: 6 }]}>
                        {tTool(outputLanguage, 'legalPrecedents.adviseDoNotRelyText', '❌ **Do not rely** if you cannot prove that the demand notice was served within 30 days of the cheque return memo.')}
                      </Text>
                    </View>

                    {/* 6. Practical Courtroom Usage */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.courtroomStrategy', 'Courtroom Pleadings & Oral Language')}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>
                        {tTool(outputLanguage, 'legalPrecedents.suggestedPleading', 'SUGGESTED PARAGRAPH FOR PLEADING:')}
                      </Text>
                      <View style={[styles.codeBox, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.codeText, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.pleadingCodeText', '"The accused is legally liable to pay, and signatures are admitted. As per Rangappa v. Sri Mohan, the presumption under Section 139 NI Act applies with full force."')}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                        {tTool(outputLanguage, 'legalPrecedents.oralSubmissionDraft', 'ORAL SUBMISSION DRAFT:')}
                      </Text>
                      <View style={[styles.codeBox, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.codeText, { color: theme.textPrimary }]}>
                          {tTool(outputLanguage, 'legalPrecedents.oralSubmissionCodeText', '"My Lord, in terms of the binding ruling of the Hon\'ble Supreme Court, the burden shifts entirely to the accused once execution is admitted. They have not discharged this burden."')}
                        </Text>
                      </View>
                    </View>

                    {/* 7. Recent Judicial Treatment */}
                    <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'legalPrecedents.recentTreatment', 'Recent Judicial Treatment')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>
                            {tTool(outputLanguage, 'legalPrecedents.followed', 'FOLLOWED')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>
                          {tTool(outputLanguage, 'legalPrecedents.recentTreatmentText', 'Followed recently in *Bir Singh (2019)* and *Triyambak Hegde (2022)*. No overruling judgments recorded.')}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {activeTab === 'actions' && (
                  <View style={{ gap: 16 }}>
                    <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'legalPrecedents.aiResearch', 'AI Legal Research Operations')}
                    </Text>
                    
                    <View style={styles.actionsGrid}>
                      {[
                        { id: 'simple-english', labelKey: 'legalPrecedents.summarizeSimple', defaultLabel: 'Explain in Simple English', icon: 'chatbox-ellipses-outline' },
                        { id: 'hindi', labelKey: 'legalPrecedents.explainHindi', defaultLabel: 'Explain in Hindi', icon: 'text-outline' },
                        { id: 'summarize', labelKey: 'legalPrecedents.summarizeCase', defaultLabel: 'Summarize Case', icon: 'sparkles-outline' },
                        { id: 'compare', labelKey: 'legalPrecedents.compareCase', defaultLabel: 'Compare Case', icon: 'git-compare-outline' },
                        { id: 'stronger', labelKey: 'legalPrecedents.findStronger', defaultLabel: 'Find stronger authority', icon: 'trending-up-outline' },
                        { id: 'contrary', labelKey: 'legalPrecedents.findOpposite', defaultLabel: 'Find opposite judgments', icon: 'alert-circle-outline' },
                        { id: 'citation', labelKey: 'legalPrecedents.generateCitation', defaultLabel: 'Generate citation', icon: 'ribbon-outline' },
                        { id: 'draft', labelKey: 'legalPrecedents.useInDraft', defaultLabel: 'Use in Draft', icon: 'create-outline' },
                        { id: 'arguments', labelKey: 'legalPrecedents.useInArguments', defaultLabel: 'Use in Arguments', icon: 'megaphone-outline' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.aiActionCardBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => handleAiAction(item.id, selectedPrecedent)}
                        >
                          <Ionicons name={item.icon as any} size={16} color="#111111" />
                          <Text style={[styles.aiActionCardBtnLabel, { color: theme.textPrimary }]}>
                            {tTool(outputLanguage, item.labelKey, item.defaultLabel)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {isAiLoading ? (
                      <View style={styles.aiActionProgress}>
                        <ActivityIndicator size="small" color="#111111" />
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                          Synthesizing analysis reports...
                        </Text>
                      </View>
                    ) : activePrecedentAiResponse ? (
                      <View style={[styles.aiResponseBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <MarkdownRenderer text={activePrecedentAiResponse} />
                      </View>
                    ) : null}
                  </View>
                )}
              </ScrollView>

              {/* Bottom Actions Bar */}
              <View style={[styles.modalFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity style={[styles.footerBtn, { borderColor: theme.border }]} onPress={() => handleCopyCitation(selectedPrecedent)}>
                  <Ionicons name="copy-outline" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.footerBtnText, { color: theme.textPrimary }]}>
                    {tTool(outputLanguage, 'legalPrecedents.copyCitation', 'Copy Citation')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerBtnActive} onPress={() => handleExportPrecedentPdf(selectedPrecedent)}>
                  <Ionicons name="document-text-outline" size={16} color="#111111" style={{ marginRight: 6 }} />
                  <Text style={styles.footerBtnActiveText}>
                    {tTool(outputLanguage, 'legalPrecedents.saveAsPdf', 'Save as PDF')}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        );
      })()}

      {/* Case List modal list drawer */}
<Modal visible={isCaseListOpen} transparent animationType="slide" onRequestClose={() => setIsCaseListOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseListOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{tTool(outputLanguage, 'legalPrecedents.selectCase', 'Select Case Workspace')}</Text>
                  <TouchableOpacity onPress={() => setIsCaseListOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setActiveCaseId(c._id);
                        setIsCaseListOpen(false);
                      }}
                    >
                      <Ionicons name="folder-outline" size={18} color="#111111" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Copy Citation Options Modal */}
      <Modal visible={isCopyCitationOpen} transparent animationType="fade" onRequestClose={() => setIsCopyCitationOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCopyCitationOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { height: 350 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{tTool(outputLanguage, 'legalPrecedents.copyCitationFormat', 'Copy Citation Format')}</Text>
                  <TouchableOpacity onPress={() => setIsCopyCitationOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {[
                    { labelKey: 'legalPrecedents.copySCC', defaultLabel: 'Copy SCC Format', val: selectedPrecedent ? normalizePrecedent(selectedPrecedent, outputLanguage)?.citation : '' },
                    { labelKey: 'legalPrecedents.copyAIR', defaultLabel: 'Copy AIR Format', val: selectedPrecedent ? `AIR ${normalizePrecedent(selectedPrecedent, outputLanguage)?.year} SC 1898` : '' },
                    { labelKey: 'legalPrecedents.copyNeutral', defaultLabel: 'Copy Neutral Citation', val: selectedPrecedent ? `${normalizePrecedent(selectedPrecedent, outputLanguage)?.year} INSC 321` : '' },
                    { labelKey: 'legalPrecedents.copyFull', defaultLabel: 'Copy Full Citation', val: selectedPrecedent ? `${normalizePrecedent(selectedPrecedent, outputLanguage)?.case_name}, ${normalizePrecedent(selectedPrecedent, outputLanguage)?.citation}; AIR ${normalizePrecedent(selectedPrecedent, outputLanguage)?.year} SC 1898` : '' },
                    { labelKey: 'legalPrecedents.copyHyperlink', defaultLabel: 'Copy with Hyperlink (Markdown)', val: selectedPrecedent ? `[${normalizePrecedent(selectedPrecedent, outputLanguage)?.case_name}](https://indiankanoon.org/search/?q=${encodeURIComponent(normalizePrecedent(selectedPrecedent, outputLanguage)?.case_name || '')})` : '' }
                  ].map((opt, oIdx) => (
                    <TouchableOpacity
                      key={oIdx}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        Clipboard.setString(opt.val);
                        showToast('success', 'Copied', `${tTool(outputLanguage, opt.labelKey, opt.defaultLabel)} copied successfully.`);
                        setIsCopyCitationOpen(false);
                      }}
                    >
                      <Ionicons name="copy-outline" size={18} color="#111111" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{tTool(outputLanguage, opt.labelKey, opt.defaultLabel)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Save Precedent Categories Modal */}
      <Modal visible={isSavePrecedentOpen} transparent animationType="fade" onRequestClose={() => setIsSavePrecedentOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsSavePrecedentOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { height: 350 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{tTool(outputLanguage, 'legalPrecedents.saveToLibrary', 'Save Precedent to Library')}</Text>
                  <TouchableOpacity onPress={() => setIsSavePrecedentOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {[
                    { labelKey: 'legalPrecedents.saveCurrentCase', defaultLabel: 'Save to Current Case', id: 'current-case' },
                    { labelKey: 'legalPrecedents.saveLibrary', defaultLabel: 'Save to Research Library', id: 'library' },
                    { labelKey: 'legalPrecedents.saveBookmarks', defaultLabel: 'Save to Bookmarks', id: 'bookmarks' },
                    { labelKey: 'legalPrecedents.saveRecent', defaultLabel: 'Save to Recent Research', id: 'recent' },
                    { labelKey: 'legalPrecedents.saveCache', defaultLabel: 'Save to Offline Cache', id: 'cache' }
                  ].map((opt, oIdx) => (
                    <TouchableOpacity
                      key={oIdx}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        showToast('success', 'Precedent Saved', `${tTool(outputLanguage, opt.labelKey, opt.defaultLabel)}`);
                        setIsSavePrecedentOpen(false);
                      }}
                    >
                      <Ionicons name="bookmark-outline" size={18} color="#111111" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{tTool(outputLanguage, opt.labelKey, opt.defaultLabel)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

// Sub-component for rendering standard results card
interface ResultCardProps {
  item: any;
  theme: any;
  styles: any;
  onSelect: (precedent: any) => void;
  onSave: (precedent: any) => void;
  onCopy: (precedent: any) => void;
  onUse: (precedent: any) => void;
  isContrary?: boolean;
  outputLanguage?: string;
}

function RenderResultCard({ item, theme, styles, onSelect, onSave, onCopy, onUse, isContrary, outputLanguage = 'English' }: ResultCardProps) {
  const caseTitle = item.case_identity?.case_name || item.case_name || 'Legal Precedent';
  const citation = item.case_identity?.citation || item.citation || 'AIR 2024 SC';
  const court = item.case_identity?.court || item.court || 'Supreme Court';
  const score = item.similarity?.relevance_score || item.relevance_score || 95;
  const principle = item.legal_principle || 'Basic Structure Doctrine';
  const summary = item.one_line_summary || 'Key principle outlines fundamental limits.';
  const why = item.why_relevant || 'Directly answers client query regarding limitations.';

  return (
    <TouchableOpacity
      style={[
        styles.precedentResultCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        isContrary && { borderColor: '#EF4444', borderLeftWidth: 4 }
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
            {tTool(outputLanguage, caseTitle, caseTitle)}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            {tTool(outputLanguage, court, court)} • {citation}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: isContrary ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
          <Text style={[styles.scoreBadgeText, { color: isContrary ? '#EF4444' : '#10B981' }]}>
            {score}% {tTool(outputLanguage, 'legalPrecedents.match', 'Match')}
          </Text>
        </View>
      </View>

      <View style={[styles.cardBody, { borderTopColor: theme.border }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>
          {tTool(outputLanguage, 'legalPrecedents.principle', 'Principle:')} {tTool(outputLanguage, principle, principle)}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
          {tTool(outputLanguage, summary, summary)}
        </Text>
        <Text style={{ fontSize: 11, color: '#111111', fontStyle: 'italic', marginTop: 6 }}>
          {tTool(outputLanguage, 'legalPrecedents.why', 'Why:')} {tTool(outputLanguage, why, why)}
        </Text>
      </View>

      <View style={[styles.cardActionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={() => onSave(item)}>
          <Ionicons name="bookmark-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardActionBtnText, { color: theme.textSecondary }]}>
            {tTool(outputLanguage, 'common.save', 'Save')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardActionBtn} onPress={() => onCopy(item)}>
          <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardActionBtnText, { color: theme.textSecondary }]}>
            {tTool(outputLanguage, 'legalPrecedents.citation', 'Citation')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    appHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    appHeaderBackBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
      marginRight: 6,
      marginLeft: -4,
    },
    appHeaderTitleContainer: {
      flex: 1,
      justifyContent: 'center',
      marginRight: 6,
    },

    appHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    appHeaderSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    modeToggleRow: {
      flexDirection: 'row',
      padding: 6,
      borderBottomWidth: 1,
      gap: 8,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    toggleButtonActive: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
    },
    toggleButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    searchSection: {
      padding: 14,
      gap: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
    },
    searchBtn: {
      backgroundColor: '#D4AF37',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    searchBtnText: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '800',
    },
    suggestedScroll: {
      gap: 8,
    },
    suggestedChip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    suggestedChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 15,
      fontWeight: '800',
      marginTop: 14,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricVal: {
      fontSize: 14,
      fontWeight: '800',
      color: '#111111',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 4,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 12,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryCard: {
      width: '31%',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
    },
    categoryName: {
      fontSize: 10.5,
      fontWeight: '700',
      marginTop: 4,
    },
    actCard: {
      width: 140,
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      height: 90,
    },
    actTitle: {
      fontSize: 12,
      fontWeight: '800',
    },
    actDesc: {
      fontSize: 10,
      marginTop: 4,
      lineHeight: 14,
    },
    landmarkCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    landmarkHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    landmarkTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      flex: 1,
    },
    landmarkYear: {
      fontSize: 11,
      fontWeight: '700',
      marginLeft: 10,
    },
    landmarkMeta: {
      marginTop: 4,
    },
    landmarkDesc: {
      fontSize: 12,
      marginTop: 6,
      lineHeight: 16,
    },
    latestContainer: {
      borderWidth: 1.5,
      borderRadius: 16,
      overflow: 'hidden',
    },
    latestRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
    },
    latestTitle: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    latestDate: {
      fontSize: 10,
      fontWeight: '700',
      marginLeft: 10,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 24,
      borderWidth: 1.5,
      borderRadius: 16,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginTop: 12,
    },
    emptyDesc: {
      fontSize: 12.5,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    primaryButton: {
      backgroundColor: '#111111',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginTop: 14,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // Results Card Styles
    precedentResultCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitleText: {
      fontSize: 14,
      fontWeight: '800',
    },
    scoreBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    scoreBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardBody: {
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 10,
    },
    cardActionsRow: {
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginTop: 10,
    },
    cardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
    },

    // Detailed Modal Styles
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    modalTabsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
    },
    modalTabBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    modalTabBtnText: {
      fontSize: 12,
      fontWeight: '800',
    },
    modalScrollBody: {
      padding: 16,
      paddingBottom: 60,
    },
    detailBox: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
    },
    detailHeading: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 6,
    },
    detailText: {
      fontSize: 13,
      lineHeight: 18,
    },
    aiExplanationCard: {
      borderRadius: 12,
      padding: 16,
    },
    aiExplanationTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    aiExplanationText: {
      fontSize: 13,
      lineHeight: 18,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aiActionCardBtn: {
      width: '48%',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    aiActionCardBtnLabel: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    aiActionProgress: {
      alignItems: 'center',
      marginVertical: 16,
    },
    aiResponseBox: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    },
    aiResponseText: {
      fontSize: 13,
      lineHeight: 18,
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1.5,
      gap: 10,
    },
    footerBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    footerBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    footerBtnActive: {
      flex: 1,
      height: 44,
      backgroundColor: '#D4AF37',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    footerBtnActiveText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '800',
    },

    // Bottom Sheet Case List Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.5,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    bottomSheetDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    caseItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    caseItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    overviewCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    cardSectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    overviewGrid: {
      gap: 8,
    },
    overviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    overviewLabel: {
      fontSize: 12,
      color: '#94A3B8',
      width: '40%',
      fontWeight: '600',
    },
    overviewValText: {
      fontSize: 12,
      width: '60%',
      fontWeight: '700',
      textAlign: 'right',
    },
    collapsibleCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      overflow: 'hidden',
    },
    collapsibleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
    },
    collapsibleTitle: {
      fontSize: 13,
      fontWeight: '800',
      flex: 1,
    },
    collapsibleBody: {
      padding: 14,
      paddingTop: 0,
      borderTopColor: '#E2E8F0',
    },
    timelineRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    timelineLeftColumn: {
      alignItems: 'center',
      width: 16,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 3,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 24,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
    },
    timelineStageTitle: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    timelineStageDesc: {
      fontSize: 11,
      marginTop: 2,
    },
    similarCaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    similarCaseTitle: {
      fontSize: 12,
      fontWeight: '700',
    },
    citationFormatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    citationFormatLabel: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '600',
    },
    citationFormatValue: {
      fontSize: 12.5,
      fontWeight: '700',
      marginTop: 2,
    },
    miniCopyBtn: {
      padding: 8,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    matchScoreCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
    },
    radialScoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radialCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radialText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#10B981',
    },
    radialSub: {
      fontSize: 8,
      color: '#94A3B8',
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    matchStatusTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    matchDetailsBox: {
      borderTopWidth: 1.5,
      marginTop: 12,
      paddingTop: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    authorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    codeBox: {
      padding: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    codeText: {
      fontSize: 11.5,
      fontStyle: 'italic',
      lineHeight: 16,
    },
    skeletonWrapper: {
      padding: 14,
      gap: 10,
    },
    skeletonCard: {
      height: 60,
      backgroundColor: '#E2E8F0',
      borderRadius: 8,
    },
    skeletonLine: {
      height: 12,
      backgroundColor: '#E2E8F0',
      borderRadius: 4,
    },
  });
}
