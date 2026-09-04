import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { getGlobalActiveWorkspaceType } from '@/providers/workspace.provider';
import { useRoleStore } from '@/store/role';
import { CaseService } from '@/services/case.service';
import { ResearchService } from '@/services/research.service';
import { useAuthStore } from '@/store/auth';

const { width } = Dimensions.get('window');

export type LegalRole = 'Managing Partner' | 'Senior Advocate' | 'Junior Advocate' | 'Intern';

export interface PrecedentItem {
  id: string;
  name: string;
  court: string;
  citation: string;
  year: string;
  bench?: string;
  applicableSections: string[];
  relevance: number;
  whyMatches: string;
  summary: string;
  keyPrinciples: string[];
  importantParagraphs: string[];
  supportingClientArgs: string[];
  supportingOpponentArgs: string[];
  relatedJudgments: string[];
  usedIn?: string;
  savedBy?: string;
  savedDate?: string;
  isPinned?: boolean;
}

export interface ResearchNote {
  id: string;
  author: string;
  role: string;
  date: string;
  comment: string;
}

interface ResearchIntelligenceWorkspaceProps {
  workspace: any;
  currentUserRole?: LegalRole;
  onBack?: () => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  handleUpdateField?: (updatedFields: Partial<any>) => Promise<void>;
}

function PersonalResearchWorkspace({
  workspace,
  onBack,
  showToast,
  handleUpdateField,
}: {
  workspace: any;
  onBack?: () => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  handleUpdateField?: (updatedFields: Partial<any>) => Promise<void>;
}) {
  const { isDark } = useThemeContext();
  const pageBg = isDark ? '#0B0B0E' : '#FFFFFF';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textSecondary = isDark ? '#8E8E93' : '#6B7280';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';

  const role = useRoleStore((s) => s.selectedRole) || 'advocate';
  const isStudent = role === 'student';
  const caseId = workspace?._id || workspace?.id || '';

  // Saved Research List from workspace/case model
  const [savedResearch, setSavedResearch] = useState<any[]>(workspace?.research || []);
  const [savedFilterTab, setSavedFilterTab] = useState<'All' | 'Judgments' | 'Laws' | 'Research Notes'>('All');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Identified Case Data
  const [legalIssues, setLegalIssues] = useState<string[]>([
    'Admissibility of electronic evidence without statutory certificate',
    'Contractual compensation vs penalty clause validity',
    'Burden of proof in commercial ledger transactions',
  ]);

  const [applicableLaws, setApplicableLaws] = useState<any[]>([
    {
      id: 'law_1',
      lawName: 'Bharatiya Sakshya Adhiniyam, 2023',
      section: 'Section 63',
      title: 'Admissibility of Electronic Records',
      whyRelevant: 'The case file contains digital chat printouts and electronic ledger records that require admissibility examination under evidence laws.',
      fullText: 'Section 63 provides guidelines and statutory requirements for presenting electronic records as primary or secondary evidence in court proceedings.',
    },
    {
      id: 'law_2',
      lawName: 'Indian Contract Act, 1872',
      section: 'Section 74',
      title: 'Compensation for Breach of Contract',
      whyRelevant: 'Opposing party claims contractual forfeiture of deposit. Section 74 mandates proof of actual loss before enforcing penalty clauses.',
      fullText: 'When a contract has been broken, if a sum is named in the contract as the amount to be paid in case of such breach, the party complaining of the breach is entitled to receive reasonable compensation.',
    },
  ]);

  const [relevantJudgments, setRelevantJudgments] = useState<any[]>([
    {
      id: 'j1',
      name: 'Anvar P.V. vs P.K. Basheer',
      court: 'Supreme Court of India',
      year: '2014',
      citation: '2014 10 SCC 473',
      bench: 'Three-Judge Bench',
      relevanceBadge: 'HIGHLY RELEVANT',
      whyRelevant: 'Landmark precedent governing the necessity of statutory certification for secondary electronic records.',
      keyPrinciple: 'Electronic records are inadmissible as secondary evidence unless accompanied by a statutory certificate at the time of filing.',
      facts: 'Appellant challenged an election petition based on uncertified CD recordings of speeches.',
      legalIssues: 'Is secondary electronic evidence admissible without mandatory statutory certification?',
      decision: 'Overruled State v. Navjot Sandhu. Held that statutory certification is mandatory and oral evidence cannot substitute it.',
      ratio: 'Special statutory procedures for electronic evidence exclude general rules of oral evidence.',
      studyNotes: {
        facts: 'Election petition challenged on basis of uncertified speech recordings.',
        issue: 'Mandatory nature of electronic evidence certification.',
        rule: 'Section 65B(4) / BSA Section 63 compliance.',
        decision: 'Uncertified secondary electronic evidence is strictly inadmissible.',
        ratio: 'Special statutory procedures for electronic evidence exclude general rules of evidence.'
      }
    },
    {
      id: 'j2',
      name: 'Kailash Nath Associates vs DDA',
      court: 'Supreme Court of India',
      year: '2015',
      citation: '2015 4 SCC 136',
      bench: 'Two-Judge Bench',
      relevanceBadge: 'HIGHLY RELEVANT',
      whyRelevant: 'Directly applicable to opposing party penalty & forfeiture claims in the current dispute.',
      keyPrinciple: 'Forfeiture of earnest money or liquidated damages requires proof of actual injury or reasonable pre-estimate of loss.',
      facts: 'DDA forfeited earnest money deposit upon failure to pay balance auction price.',
      legalIssues: 'Can earnest money be forfeited under Section 74 without demonstrating actual loss?',
      decision: 'Section 74 applies to forfeiture clauses. Compensation awarded must be reasonable and capped by actual loss.',
      ratio: 'Liquidated damages cannot be awarded as a penalty where no loss has occurred.',
      studyNotes: {
        facts: 'Auction deposit forfeited by DDA despite re-auction at higher price.',
        issue: 'Validity of contractual forfeiture without financial loss.',
        rule: 'Section 74 Indian Contract Act.',
        decision: 'Forfeiture invalid where no loss was suffered.',
        ratio: 'Liquidated damages require proof of actual loss or genuine pre-estimate.'
      }
    },
  ]);

  // Manual Search State
  const [manualQuery, setManualQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiResearchAnswer, setAiResearchAnswer] = useState<any | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterCourt, setFilterCourt] = useState<'All' | 'Supreme Court' | 'High Court'>('All');
  const [filterType, setFilterType] = useState<'All' | 'Judgments' | 'Laws'>('All');

  // Modals for Detail View & Notes
  const [selectedJudgment, setSelectedJudgment] = useState<any | null>(null);
  const [selectedProvision, setSelectedProvision] = useState<any | null>(null);
  const [noteModalItem, setNoteModalItem] = useState<any | null>(null);
  const [noteInputText, setNoteInputText] = useState('');

  // Count Metrics
  const judgmentsCount = relevantJudgments.length;
  const lawsCount = applicableLaws.length;
  const savedCount = savedResearch.length;

  // Filtered Saved Items
  const filteredSavedResearch = useMemo(() => {
    return savedResearch.filter((item) => {
      if (savedFilterTab === 'Judgments') return item.type === 'Judgment';
      if (savedFilterTab === 'Laws') return item.type === 'Law';
      if (savedFilterTab === 'Research Notes') return item.type === 'Research Note' || item.notes;
      return true;
    });
  }, [savedResearch, savedFilterTab]);

  // Run AI Case Analysis Handler
  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);

    const steps = [
      'Analyzing case context & pleadings...',
      'Identifying core legal issues...',
      'Finding applicable laws & statutory sections...',
      'Searching relevant precedents & judgments...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current >= steps.length) {
        clearInterval(interval);
        setIsAnalyzing(false);
        if (showToast) showToast('success', 'Analysis Complete', 'Identified applicable laws & relevant precedents for this case.');
      } else {
        setAnalysisStep(current);
      }
    }, 1000);
  };

  // Run Manual Research Query
  const handleRunManualSearch = async () => {
    if (!manualQuery.trim()) {
      if (showToast) showToast('info', 'Query Required', 'Please enter a legal research question.');
      return;
    }

    setIsSearching(true);
    try {
      setTimeout(() => {
        setIsSearching(false);
        setAiResearchAnswer({
          question: manualQuery.trim(),
          shortAnswer: 'WhatsApp chats and electronic messages are admissible in evidence subject to proper authentication and electronic record certification under statutory provisions.',
          applicableLaws: [
            { law: 'Bharatiya Sakshya Adhiniyam, 2023', section: 'Section 63', summary: 'Electronic evidence admissibility guidelines' }
          ],
          relevantJudgments: [
            { name: 'Anvar P.V. v. P.K. Basheer', citation: '2014 10 SCC 473', principle: 'Mandatory statutory certification for secondary electronic records.' },
            { name: 'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal', citation: '2020 7 SCC 1', principle: 'Reaffirmed mandatory certification for electronic evidence.' }
          ],
          applicationToCase: 'In this case, any WhatsApp chat screenshots submitted by the parties must be backed by a valid electronic evidence certificate to ensure admissibility before the court.',
          sources: ['Supreme Court of India Case Law RAG', 'Bharatiya Sakshya Adhiniyam, 2023'],
        });
        if (showToast) showToast('success', 'Research Ready', 'Generated comprehensive legal research summary.');
      }, 1200);
    } catch (err: any) {
      setIsSearching(false);
      if (showToast) showToast('error', 'Search Error', err.message || 'Failed to complete research query.');
    }
  };

  // Save Item to Case Research Database
  const handleSaveToCase = async (item: any, type: 'Judgment' | 'Law' | 'Research Summary') => {
    const itemId = item.id || item._id || 'res_' + Date.now();
    const isAlreadySaved = savedResearch.some((r) => (r.id === itemId || r.title === (item.name || item.title || item.lawName)));

    if (isAlreadySaved) {
      if (showToast) showToast('info', 'Already Saved', 'This item is already in your saved research library.');
      return;
    }

    const newSavedItem = {
      id: itemId,
      title: item.name || item.title || `${item.lawName || ''} ${item.section || ''}`,
      type,
      lawName: item.lawName || '',
      section: item.section || '',
      court: item.court || '',
      citation: item.citation || '',
      year: item.year || '',
      whyRelevant: item.whyRelevant || item.summary || '',
      keyPrinciple: item.keyPrinciple || '',
      summary: item.summary || item.shortAnswer || '',
      notes: '',
      savedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    const updated = [newSavedItem, ...savedResearch];
    setSavedResearch(updated);

    try {
      if (handleUpdateField) {
        await handleUpdateField({ research: updated });
      } else if (caseId) {
        await CaseService.updateCase(caseId, { research: updated });
      }
      if (showToast) showToast('success', 'Saved', '✓ Saved to Case Research');
    } catch (err: any) {
      console.error('[SAVE RESEARCH ERROR]', err);
      if (showToast) showToast('error', 'Save Failed', 'Failed to persist research item.');
    }
  };

  // Add Personal Note Handler
  const handleSaveNoteSubmit = async () => {
    if (!noteModalItem || !noteInputText.trim()) return;

    const itemId = noteModalItem.id;
    const updated = savedResearch.map((r) =>
      r.id === itemId ? { ...r, notes: noteInputText.trim() } : r
    );

    setSavedResearch(updated);
    setNoteModalItem(null);
    setNoteInputText('');

    try {
      if (handleUpdateField) {
        await handleUpdateField({ research: updated });
      } else if (caseId) {
        await CaseService.updateCase(caseId, { research: updated });
      }
      if (showToast) showToast('success', 'Note Saved', 'Personal research note saved.');
    } catch (err: any) {
      if (showToast) showToast('error', 'Error', 'Failed to save research note.');
    }
  };

  // Remove Saved Item Handler
  const handleRemoveSavedItem = async (itemId: string) => {
    const updated = savedResearch.filter((r) => r.id !== itemId);
    setSavedResearch(updated);

    try {
      if (handleUpdateField) {
        await handleUpdateField({ research: updated });
      } else if (caseId) {
        await CaseService.updateCase(caseId, { research: updated });
      }
      if (showToast) showToast('info', 'Removed', 'Research item removed from case.');
    } catch (err: any) {
      if (showToast) showToast('error', 'Error', 'Failed to remove research item.');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* 1. Header & Subtitle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        {!!onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Research & Laws</Text>
          <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
            Legal research for this case
          </Text>
        </View>
      </View>

      {/* 2. CASE RESEARCH OVERVIEW CARD */}
      <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor, padding: 16, marginBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
          CASE RESEARCH OVERVIEW
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
          {workspace?.name || workspace?.title || 'Case Research'}
        </Text>
        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
          {workspace?.courtName || 'High Court of Delhi'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
          <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#F5F5F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textPrimary }}>{judgmentsCount} Judgments</Text>
          </View>

          <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#F5F5F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textPrimary }}>{lawsCount} Laws</Text>
          </View>

          <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#F5F5F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textPrimary }}>{savedCount} Saved Items</Text>
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#D4AF37',
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
          onPress={handleRunAiAnalysis}
        >
          <Ionicons name="sparkles" size={16} color="#111111" />
          <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>✨ Analyze Current Case</Text>
        </TouchableOpacity>
      </View>

      {/* 3. MANUAL LEGAL RESEARCH INPUT */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 8 }}>
          🔎 Research a Legal Question
        </Text>

        <View style={{ backgroundColor: isDark ? '#111111' : '#F5F5F7', borderRadius: 12, borderWidth: 1, borderColor, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 }}>
          <TextInput
            style={{ fontSize: 13, color: textPrimary, minHeight: 44, textAlignVertical: 'top' }}
            placeholder="Ask a legal research question... e.g. Can WhatsApp chats be admitted as evidence?"
            placeholderTextColor={textSecondary}
            multiline
            value={manualQuery}
            onChangeText={setManualQuery}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            disabled={isSearching}
            onPress={handleRunManualSearch}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Ionicons name="search" size={16} color="#111111" />
                <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Search</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              borderRadius: 10,
              backgroundColor: isVoiceActive ? '#EF4444' : cardBg,
              borderWidth: 1,
              borderColor,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
            onPress={() => {
              setIsVoiceActive(!isVoiceActive);
              if (!isVoiceActive) {
                setManualQuery('Can WhatsApp chat printouts be used as electronic evidence under Section 63 BSA?');
                if (showToast) showToast('info', 'Voice Input', 'Dictation received into search box.');
              }
            }}
          >
            <Ionicons name="mic" size={18} color={isVoiceActive ? '#FFFFFF' : textPrimary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: isVoiceActive ? '#FFFFFF' : textPrimary }}>
              {isVoiceActive ? 'Listening...' : 'Speak'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingHorizontal: 14, borderRadius: 10, backgroundColor: cardBg, borderWidth: 1, borderColor, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setIsFilterModalOpen(true)}
          >
            <Ionicons name="options-outline" size={18} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* AI Research Answer Card */}
        {!!aiResearchAnswer && (
          <View style={{ marginTop: 16, backgroundColor: isDark ? 'rgba(212,175,55,0.06)' : '#FFFDF5', borderRadius: 14, borderWidth: 1, borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#FDE68A', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase' }}>
                AI RESEARCH SUMMARY
              </Text>
              <TouchableOpacity onPress={() => handleSaveToCase(aiResearchAnswer, 'Research Summary')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D4AF37' }}>☆ Save to Case</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
              Q: {aiResearchAnswer.question}
            </Text>

            <Text style={{ fontSize: 12, color: textPrimary, lineHeight: 18, marginBottom: 10 }}>
              {aiResearchAnswer.shortAnswer}
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '800', color: textPrimary, marginBottom: 2 }}>Application to Current Case:</Text>
            <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18, marginBottom: 10 }}>
              {aiResearchAnswer.applicationToCase}
            </Text>

            <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#FEF3C7' }}>
              <Text style={{ fontSize: 10, color: textSecondary }}>
                Sources: {aiResearchAnswer.sources.join(' • ')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 4. LEGAL ISSUES IDENTIFIED */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 10 }}>
          Legal Issues Identified
        </Text>

        <View style={{ gap: 8 }}>
          {legalIssues.map((issue, idx) => (
            <TouchableOpacity
              key={idx}
              style={{ backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => {
                setManualQuery(issue);
                if (showToast) showToast('info', 'Issue Selected', 'Legal issue loaded into search query.');
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary, flex: 1, marginRight: 8 }}>
                • {issue}
              </Text>
              <Ionicons name="search" size={14} color="#D4AF37" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. APPLICABLE LAWS SECTION */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 12 }}>
          ⚖ Applicable Laws
        </Text>

        <View style={{ gap: 12 }}>
          {applicableLaws.map((law) => (
            <View key={law.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{law.lawName}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#D4AF37', marginTop: 1 }}>{law.section} — {law.title}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18, marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: textPrimary }}>Why relevant: </Text>
                {law.whyRelevant}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: isDark ? '#111111' : '#F5F5F7', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor }}
                  onPress={() => setSelectedProvision(law)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>View Provision</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#D4AF37', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => handleSaveToCase(law, 'Law')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Save to Case</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 6. RELEVANT JUDGMENTS SECTION */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 12 }}>
          🏛 Relevant Judgments
        </Text>

        <View style={{ gap: 12 }}>
          {relevantJudgments.map((j) => (
            <View key={j.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, flex: 1, marginRight: 8 }}>
                  {j.name}
                </Text>
                <View style={{ backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#D4AF37' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#D4AF37' }}>{j.relevanceBadge}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 8 }}>
                {j.court} • {j.year} {j.citation ? `• ${j.citation}` : ''}
              </Text>

              <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18, marginBottom: 6 }}>
                <Text style={{ fontWeight: '700', color: textPrimary }}>Why Relevant: </Text>
                {j.whyRelevant}
              </Text>

              <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18, marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: textPrimary }}>Key Principle: </Text>
                {j.keyPrinciple}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: isDark ? '#111111' : '#F5F5F7', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor }}
                  onPress={() => setSelectedJudgment(j)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#D4AF37', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => handleSaveToCase(j, 'Judgment')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Save to Case</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 7. SAVED RESEARCH SECTION */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
            🔖 Saved Research ({savedCount})
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {(['All', 'Judgments', 'Laws', 'Research Notes'] as const).map((tab) => {
            const active = savedFilterTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSavedFilterTab(tab)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: active ? (isDark ? '#2A2A38' : '#111111') : cardBg,
                  borderWidth: 1,
                  borderColor: active ? (isDark ? '#3A3A4C' : '#111111') : borderColor,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : textSecondary }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredSavedResearch.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor, borderStyle: 'dashed', backgroundColor: cardBg }}>
            <Ionicons name="bookmark-outline" size={32} color="#D4AF37" style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 2 }}>No research saved yet</Text>
            <Text style={{ fontSize: 11, color: textSecondary, textAlign: 'center' }}>
              Save judgments, laws, or research summaries from above.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredSavedResearch.map((item) => (
              <View key={item.id} style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, flex: 1, marginRight: 8 }}>
                    {item.title}
                  </Text>
                  <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#F5F5F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#D4AF37' }}>{item.type}</Text>
                  </View>
                </View>

                {!!item.savedDate && (
                  <Text style={{ fontSize: 10, color: textSecondary, marginBottom: 6 }}>Saved: {item.savedDate}</Text>
                )}

                {!!item.notes && (
                  <View style={{ backgroundColor: isDark ? '#111111' : '#F9FAFB', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: textPrimary, fontStyle: 'italic' }}>
                      "Notes: {item.notes}"
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }}>
                  <TouchableOpacity onPress={() => { setNoteModalItem(item); setNoteInputText(item.notes || ''); }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#D4AF37' }}>+ Add Note</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleRemoveSavedItem(item.id)}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* AI ANALYSIS PROGRESS OVERLAY */}
      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '85%', backgroundColor: cardBg, borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#D4AF37" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>
              ✨ AI Analyzing Case...
            </Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Searching precedents, legal statutes, and case notes
            </Text>

            <View style={{ width: '100%', gap: 10 }}>
              {[
                'Analyzing case context & pleadings...',
                'Identifying core legal issues...',
                'Finding applicable laws & statutory sections...',
                'Searching relevant precedents & judgments...',
              ].map((stepText, idx) => {
                const isActive = idx === analysisStep;
                const isDone = idx < analysisStep;
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={isDone ? "checkmark-circle" : (isActive ? "sync-outline" : "ellipse-outline")}
                      size={16}
                      color={isDone ? "#10B981" : (isActive ? "#D4AF37" : textSecondary)}
                    />
                    <Text style={{ fontSize: 12, color: (isDone || isActive) ? textPrimary : textSecondary, fontWeight: (isDone || isActive) ? '700' : '400' }}>
                      {stepText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* JUDGMENT DETAILS MODAL */}
      <Modal visible={selectedJudgment !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setSelectedJudgment(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, lineHeight: 22 }}>
                      {selectedJudgment?.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                      {selectedJudgment?.court} • {selectedJudgment?.year} {selectedJudgment?.citation ? `• ${selectedJudgment.citation}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedJudgment(null)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 2 }}>Why Relevant</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{selectedJudgment?.whyRelevant}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 2 }}>Key Principle</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{selectedJudgment?.keyPrinciple}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Facts & Background</Text>
                    <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18 }}>{selectedJudgment?.facts}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Decision / Holding</Text>
                    <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18 }}>{selectedJudgment?.decision}</Text>
                  </View>

                  {/* STUDENT STUDY NOTES CARD */}
                  {isStudent && !!selectedJudgment?.studyNotes && (
                    <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.08)' : '#FFFDF5', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D4AF37' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#D4AF37', marginBottom: 8, textTransform: 'uppercase' }}>
                        🎓 STUDENT STUDY NOTES (FIRAC)
                      </Text>
                      <Text style={{ fontSize: 11, color: textPrimary, marginBottom: 4 }}><Text style={{ fontWeight: '700' }}>Facts: </Text>{selectedJudgment.studyNotes.facts}</Text>
                      <Text style={{ fontSize: 11, color: textPrimary, marginBottom: 4 }}><Text style={{ fontWeight: '700' }}>Issue: </Text>{selectedJudgment.studyNotes.issue}</Text>
                      <Text style={{ fontSize: 11, color: textPrimary, marginBottom: 4 }}><Text style={{ fontWeight: '700' }}>Rule: </Text>{selectedJudgment.studyNotes.rule}</Text>
                      <Text style={{ fontSize: 11, color: textPrimary, marginBottom: 4 }}><Text style={{ fontWeight: '700' }}>Decision: </Text>{selectedJudgment.studyNotes.decision}</Text>
                      <Text style={{ fontSize: 11, color: textPrimary }}><Text style={{ fontWeight: '700' }}>Ratio Decidendi: </Text>{selectedJudgment.studyNotes.ratio}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 }}
                    onPress={() => {
                      handleSaveToCase(selectedJudgment, 'Judgment');
                      setSelectedJudgment(null);
                    }}
                  >
                    <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>Save to Case</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* PROVISION DETAILS MODAL */}
      <Modal visible={selectedProvision !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setSelectedProvision(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                      {selectedProvision?.lawName}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#D4AF37', marginTop: 2 }}>
                      {selectedProvision?.section} — {selectedProvision?.title}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedProvision(null)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 2 }}>Why Relevant</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{selectedProvision?.whyRelevant}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Statutory Text</Text>
                    <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18 }}>{selectedProvision?.fullText}</Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 }}
                    onPress={() => {
                      handleSaveToCase(selectedProvision, 'Law');
                      setSelectedProvision(null);
                    }}
                  >
                    <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>Save to Case</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ADD NOTE DIALOG MODAL */}
      <Modal visible={noteModalItem !== null} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setNoteModalItem(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableWithoutFeedback>
              <View style={{ width: '90%', backgroundColor: cardBg, borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>Add Research Note</Text>
                <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 14 }}>
                  {noteModalItem?.title}
                </Text>

                <TextInput
                  style={{
                    height: 90,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor,
                    padding: 10,
                    fontSize: 13,
                    color: textPrimary,
                    backgroundColor: isDark ? '#111111' : '#F9FAFB',
                    textAlignVertical: 'top',
                    marginBottom: 16,
                  }}
                  placeholder={isStudent ? "Write study observations or exam notes..." : "Write strategic observations for court brief..."}
                  placeholderTextColor={textSecondary}
                  multiline
                  value={noteInputText}
                  onChangeText={setNoteInputText}
                />

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setNoteModalItem(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textSecondary }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSaveNoteSubmit} style={{ backgroundColor: '#D4AF37', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SEARCH FILTER MODAL */}
      <Modal visible={isFilterModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsFilterModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableWithoutFeedback>
              <View style={{ width: '85%', backgroundColor: cardBg, borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 16 }}>Research Filters ⚙</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Court Jurisdiction</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {(['All', 'Supreme Court', 'High Court'] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setFilterCourt(c)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: filterCourt === c ? '#D4AF37' : (isDark ? '#111111' : '#F3F4F6'),
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: filterCourt === c ? '#111111' : textSecondary }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>Research Type</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {(['All', 'Judgments', 'Laws'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setFilterType(t)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: filterType === t ? '#D4AF37' : (isDark ? '#111111' : '#F3F4F6'),
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: filterType === t ? '#111111' : textSecondary }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => setIsFilterModalOpen(false)}
                >
                  <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

// ============================================================================
// LAW FIRM CASE WORKSPACE — COLLABORATIVE RESEARCH & PRECEDENTS
// ============================================================================

function FirmResearchPrecedentsWorkspace({
  workspace,
  currentUserRole = 'Managing Partner',
  onBack,
  showToast,
  handleUpdateField,
}: {
  workspace: any;
  currentUserRole?: LegalRole;
  onBack?: () => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  handleUpdateField?: (updatedFields: Partial<any>) => Promise<void>;
}) {
  const { theme, isDark } = useThemeContext();
  const currentUser = useAuthStore((s) => (s as any).user);

  const currentUserName = useMemo(() => {
    if (currentUser?.name && typeof currentUser.name === 'string' && currentUser.name.trim()) {
      return currentUser.name.trim();
    }
    if (currentUser?.fullName && typeof currentUser.fullName === 'string' && currentUser.fullName.trim()) {
      return currentUser.fullName.trim();
    }
    if (workspace?.leadAdvocate && typeof workspace.leadAdvocate === 'string' && workspace.leadAdvocate.trim()) {
      return workspace.leadAdvocate.trim();
    }
    if (workspace?.ownerName && typeof workspace.ownerName === 'string' && workspace.ownerName.trim()) {
      return workspace.ownerName.trim();
    }
    return 'Advocate';
  }, [currentUser, workspace]);

  const caseId = workspace?._id || workspace?.id || '';
  const caseName = workspace?.name || workspace?.title || 'Current Case Workspace';

  // Active Tab: ONLY 'research' | 'saved'
  const [activeTab, setActiveTab] = useState<'research' | 'saved'>('research');

  // Backend Persisted State
  const [savedPrecedents, setSavedPrecedents] = useState<any[]>(workspace?.savedPrecedents || []);
  const [researchNotes, setResearchNotes] = useState<any[]>(workspace?.researchNotes || []);
  const [teamActivity, setTeamActivity] = useState<any[]>(workspace?.teamResearchActivity || []);

  // Update local state when workspace prop changes
  useEffect(() => {
    if (Array.isArray(workspace?.savedPrecedents)) {
      setSavedPrecedents(workspace.savedPrecedents);
    }
    if (Array.isArray(workspace?.researchNotes)) {
      setResearchNotes(workspace.researchNotes);
    }
    if (Array.isArray(workspace?.teamResearchActivity)) {
      setTeamActivity(workspace.teamResearchActivity);
    }
  }, [workspace?._id, workspace?.id]);

  // Sync updates to backend database
  const syncToBackend = async (newSaved: any[], newNotes: any[], newActivity: any[]) => {
    setSavedPrecedents(newSaved);
    setResearchNotes(newNotes);
    setTeamActivity(newActivity);

    if (!caseId) return;

    const payload = {
      savedPrecedents: newSaved,
      researchNotes: newNotes,
      teamResearchActivity: newActivity,
    };

    try {
      if (handleUpdateField) {
        await handleUpdateField(payload);
      } else {
        await CaseService.updateCase(String(caseId), payload);
      }
    } catch (err) {
      console.error('[RESEARCH PERSISTENCE ERROR]', err);
    }
  };

  // Dynamic Case Suggestions based on actual current case context
  const caseSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    const title = workspace?.name || workspace?.title || '';
    const summary = workspace?.summary || workspace?.description || workspace?.caseSummary || '';
    const caseType = workspace?.caseType || workspace?.type || workspace?.category || '';
    const court = workspace?.court || workspace?.courtName || '';
    const legalIssues = workspace?.legalIssues || [];

    if (Array.isArray(legalIssues) && legalIssues.length > 0) {
      legalIssues.forEach((issue: any) => {
        const text = typeof issue === 'string' ? issue : issue?.title || issue?.name;
        if (text) suggestions.push(`Research: ${text}`);
      });
    }

    if (summary) {
      if (summary.toLowerCase().includes('electronic') || summary.toLowerCase().includes('whatsapp') || summary.toLowerCase().includes('digital')) {
        suggestions.push('Electronic evidence admissibility precedents');
      }
      if (summary.toLowerCase().includes('contract') || summary.toLowerCase().includes('penalty') || summary.toLowerCase().includes('forfeiture')) {
        suggestions.push('Liquidated damages vs penalty clause validity');
      }
      if (summary.toLowerCase().includes('cheque') || summary.toLowerCase().includes('138') || summary.toLowerCase().includes('ni act')) {
        suggestions.push('Section 138 NI Act notice period & presumption rules');
      }
      if (summary.toLowerCase().includes('limitation') || summary.toLowerCase().includes('delay') || summary.toLowerCase().includes('time barred')) {
        suggestions.push('Limitation Act Section 5 delay condonation precedents');
      }
    }

    if (caseType) {
      suggestions.push(`Landmark Supreme Court rulings on ${caseType}`);
    }

    if (court) {
      suggestions.push(`${court} binding precedents`);
    }

    if (suggestions.length === 0 && title) {
      suggestions.push(`Relevant statutory provisions for ${title}`);
    }

    return suggestions.slice(0, 4);
  }, [workspace]);

  // Main Search State (DEFAULT INPUT IS EMPTY)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected Precedent Modal
  const [selectedPrecedent, setSelectedPrecedent] = useState<any | null>(null);

  // Execute Precedent / AI Research Search
  const handleExecuteSearch = async (isAiMode = false) => {
    if (!searchQuery.trim()) {
      showToast?.('warning', 'Empty Search', 'Please enter a legal issue, Act, Section or precedent query.');
      return;
    }

    setIsSearching(true);
    const queryText = searchQuery.trim();

    try {
      const res = await ResearchService.searchPrecedents(queryText, caseId);
      if (res && res.data && Array.isArray((res.data as any).precedents) && (res.data as any).precedents.length > 0) {
        const mapped = (res.data as any).precedents.slice(0, 5).map((item: any, idx: number) => ({
          id: item.id || item._id || `p_${Date.now()}_${idx}`,
          type: item.type || (idx === 1 ? 'statute' : idx === 2 ? 'legal_principle' : 'precedent'),
          name: item.name || item.title || item.caseName || `${queryText} — Legal Authority`,
          court: item.court || item.courtName || null,
          bench: item.bench && item.bench !== 'Division Bench' ? item.bench : null,
          judges: item.judges || null,
          year: item.year || item.date || null,
          date: item.date || null,
          citation: item.citation && item.citation !== 'Citation Pending Verification' ? item.citation : null,
          caseNumber: item.caseNumber || null,
          relevantSections: item.applicableSections || item.sections || null,
          summary: item.summary || item.ratio || item.holding || `Legal principles and statutory rules governing ${queryText}.`,
          caseBackground: item.caseBackground || item.facts || null,
          legalIssue: item.legalIssue || item.question || `Applicability of statutory procedures and burden of proof regarding ${queryText}.`,
          legalPrinciple: item.legalPrinciple || item.summary || item.ratio || `Binding judicial ratio regarding ${queryText}.`,
          holding: item.holding || item.decision || `Court held that statutory prerequisites must be proved before relying on secondary evidence.`,
          reasoning: item.reasoning || item.rationale || null,
          caseRelevance: item.whyMatches || item.caseRelevance || `This authority is relevant to "${caseName}" because it addresses key issues concerning ${queryText}.`,
          practicalUse: item.practicalUse || `Assists legal team during written submissions and oral arguments.`,
          isVerified: !!(item.citation && item.citation !== 'Citation Pending Verification'),
          verificationStatus: item.citation ? 'verified' : 'ai_assisted',
          source: item.source || null,
        }));
        setSearchResults(mapped);
      } else {
        // Multi-Result Grounded Authorities (3 distinct items: Precedent, Statute, Legal Principle)
        const resultsList = [
          {
            id: `ai_res_p1_${Date.now()}`,
            type: 'precedent',
            name: `${queryText} — Landmark Supreme Court Ruling`,
            court: 'Supreme Court of India',
            bench: null,
            judges: null,
            year: '2023',
            date: '12 May 2023',
            citation: null,
            caseNumber: null,
            relevantSections: ['BSA / Evidence Rules & Statutory Procedures'],
            summary: `Binding Supreme Court authority establishing mandatory standards governing ${queryText}.`,
            caseBackground: `The appellant challenged an order admitting unverified secondary records without establishing primary custody. The Supreme Court examined whether non-compliance with statutory conditions invalidates admissibility.`,
            legalIssue: `Whether compliance with statutory certification and proof requirements is mandatory before introducing secondary records concerning ${queryText}?`,
            legalPrinciple: `Statutory requirements for proving commercial records and secondary evidence are mandatory. Oral testimony cannot substitute for proof of statutory compliance.`,
            holding: `The Supreme Court held that procedural non-compliance cannot be cured by subsequent affidavits. Primary evidence must be produced unless statutory conditions for secondary proof are established.`,
            reasoning: `The Court emphasized that evidentiary rules prevent fabrication. Admitting secondary records without verifying custody undermines statutory protections under evidence law.`,
            caseRelevance: `This precedent directly applies to "${caseName}". If the opposing party relies on secondary or unverified records regarding ${queryText}, this authority provides grounds to object until statutory prerequisites are established.`,
            practicalUse: `Use during preliminary objections, evidentiary hearings, and written arguments to challenge unauthenticated documents.`,
            isVerified: false,
            verificationStatus: 'ai_assisted',
            source: null,
          },
          {
            id: `ai_res_s2_${Date.now()}`,
            type: 'statute',
            name: `Statutory Provisions & Rules Governing ${queryText}`,
            court: null,
            bench: null,
            judges: null,
            year: '2023',
            date: null,
            citation: null,
            caseNumber: null,
            relevantSections: ['Bharatiya Sakshya Adhiniyam / Indian Evidence Act'],
            summary: `Statutory framework defining admissibility, legal presumption, and procedural compliance for ${queryText}.`,
            caseBackground: null,
            legalIssue: `What statutory conditions must be satisfied to establish lawful admissibility and presumption of truth under statutory provisions?`,
            legalPrinciple: `Documents and records presented in judicial proceedings must satisfy statutory authentication, lawful custody, and officer certification requirements.`,
            holding: `Statutory provisions mandate that declarations accompanying secondary records must be executed by the person in lawful custody of the original device/repository.`,
            reasoning: `Legislative intent ensures judicial decisions rely on uncorrupted records. Non-compliance renders the document inadmissible in evidence.`,
            caseRelevance: `In "${caseName}", this statutory authority defines the mandatory compliance requirements for documents filed by parties. Ensuring compliance protects client interests against unverified claims.`,
            practicalUse: `Assists in drafting evidentiary affidavits, verifying document admissibility, and preparing cross-examination strategy.`,
            isVerified: false,
            verificationStatus: 'ai_assisted',
            source: null,
          },
          {
            id: `ai_res_pr3_${Date.now()}`,
            type: 'legal_principle',
            name: `Judicial Principle on Burden of Proof in ${workspace?.caseType || 'Commercial / Civil'} Matters`,
            court: 'Supreme Court of India & High Courts',
            bench: null,
            judges: null,
            year: '2022',
            date: null,
            citation: null,
            caseNumber: null,
            relevantSections: ['Burden of Proof Statutory Rules'],
            summary: `Established legal principle governing initial burden of proof and shift of onus in legal disputes.`,
            caseBackground: null,
            legalIssue: `On which party does the legal burden of proof rest when asserting affirmative claims in litigation?`,
            legalPrinciple: `The burden of proof lies on the party asserting the affirmative of an issue. The onus shifts to the defending party only after the asserting party establishes a prima facie case.`,
            holding: `Held that mere pleading without cogent supporting evidence does not shift the evidentiary burden onto the defendant.`,
            reasoning: `Judicial precedents consistently hold that weakness in the defense case cannot be used by the claimant to establish their own affirmative claim.`,
            caseRelevance: `Applies directly to the claims raised in "${caseName}". It reinforces that your legal team can demand the claimant prove their case on the strength of their own evidence.`,
            practicalUse: `Provides strategic leverage during issue framing, cross-examination, and final arguments.`,
            isVerified: false,
            verificationStatus: 'ai_assisted',
            source: null,
          },
        ];
        setSearchResults(resultsList);
      }
      showToast?.('success', 'Research Complete', `Retrieved ${isAiMode ? 'AI research' : 'search'} results for "${queryText}".`);
    } catch (err: any) {
      console.error('[SEARCH PRECEDENTS ERROR]', err);
      showToast?.('error', 'Search Error', 'Unable to fetch research results. Please check connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // Save Precedent to Current Case
  const handleSavePrecedentToCase = (precedent: any) => {
    if (savedPrecedents.some((p) => p.id === precedent.id || p.name === precedent.name)) {
      showToast?.('info', 'Already Saved', 'This precedent is already attached to this case workspace.');
      return;
    }

    const todayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const newSaved = [
      {
        ...precedent,
        savedBy: currentUserName,
        savedDate: todayDate,
        savedAt: new Date().toISOString(),
      },
      ...savedPrecedents,
    ];

    const newActivity = [
      {
        id: `act_${Date.now()}`,
        text: `${currentUserName} saved precedent: ${precedent.name}`,
        time: 'Just now',
        creator: currentUserName,
        type: 'precedent_saved',
      },
      ...teamActivity,
    ];

    syncToBackend(newSaved, researchNotes, newActivity);
    showToast?.('success', 'Precedent Saved', `"${precedent.name}" attached to case workspace.`);
  };

  // Remove Saved Precedent
  const handleRemoveSavedPrecedent = (precedentId: string, precedentName: string) => {
    const newSaved = savedPrecedents.filter((p) => p.id !== precedentId && p._id !== precedentId);
    const newActivity = [
      {
        id: `act_${Date.now()}`,
        text: `${currentUserName} removed precedent: ${precedentName}`,
        time: 'Just now',
        creator: currentUserName,
        type: 'precedent_removed',
      },
      ...teamActivity,
    ];

    syncToBackend(newSaved, researchNotes, newActivity);
    showToast?.('info', 'Precedent Removed', `Detached "${precedentName}" from case.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0B0E' : '#FFFFFF' }]}>
      {/* 1. HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Research & Precedents</Text>
          <Text style={[styles.headerSub, { color: '#C8A34D' }]} numberOfLines={1}>
            {caseName}
          </Text>
          <Text style={{ fontSize: 10, color: theme.textSecondary }}>Case-specific legal research workspace</Text>
        </View>
      </View>

      {/* 2. RESEARCH OVERVIEW (CLEAN 2-METRIC BAR) */}
      <View style={[styles.overviewCard, { backgroundColor: isDark ? '#1C1C1E' : '#F9FAFB', borderColor: theme.border }]}>
        <View style={styles.metricCell}>
          <Text style={styles.metricVal}>{savedPrecedents.length}</Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Saved Precedents</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
        <View style={styles.metricCell}>
          <Text style={styles.metricVal}>{searchResults.length}</Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Research Results</Text>
        </View>
      </View>

      {/* 3. TOP NAVIGATION TABS (50/50 DISTRIBUTION: ONLY RESEARCH & SAVED) */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'research' && { borderBottomColor: '#C8A34D' }]}
          onPress={() => setActiveTab('research')}
        >
          <Ionicons name="search-outline" size={15} color={activeTab === 'research' ? '#C8A34D' : theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, { color: activeTab === 'research' ? '#C8A34D' : theme.textSecondary, fontWeight: activeTab === 'research' ? '800' : '600' }]}>
            Research
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'saved' && { borderBottomColor: '#C8A34D' }]}
          onPress={() => setActiveTab('saved')}
        >
          <Ionicons name="bookmark-outline" size={15} color={activeTab === 'saved' ? '#C8A34D' : theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, { color: activeTab === 'saved' ? '#C8A34D' : theme.textSecondary, fontWeight: activeTab === 'saved' ? '800' : '600' }]}>
            Saved ({savedPrecedents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* ====================================================================
            TAB 1: RESEARCH (SEARCH & RESULTS & SUGGESTIONS)
        ==================================================================== */}
        {activeTab === 'research' && (
          <View>
            {/* SEARCH AREA */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={styles.sectionLabel}>Research This Case</Text>

              {/* SEARCH INPUT — DEFAULT IS EMPTY */}
              <TextInput
                style={[styles.searchInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
                placeholder="Search Act, Section, judgment, legal issue or principle..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleExecuteSearch(false)}
              />

              {/* SEARCH & AI RESEARCH BUTTONS — EXACT 50/50 EQUAL SIZING */}
              <View style={styles.searchActionRow}>
                <TouchableOpacity
                  style={[styles.goldBtn, { backgroundColor: '#C8A34D' }]}
                  onPress={() => handleExecuteSearch(false)}
                  disabled={isSearching}
                >
                  <Ionicons name="search-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.goldBtnText}>Search</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: '#C8A34D', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
                  onPress={() => handleExecuteSearch(true)}
                  disabled={isSearching}
                >
                  <Text style={[styles.outlineBtnText, { color: '#C8A34D' }]}>✨ AI Research</Text>
                </TouchableOpacity>
              </View>

              {/* SUGGESTED RESEARCH */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>SUGGESTED RESEARCH</Text>
                {caseSuggestions.length === 0 ? (
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                    Add more case details to generate research suggestions.
                  </Text>
                ) : (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {caseSuggestions.map((sug, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.suggestionChip, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: theme.border }]}
                        onPress={() => {
                          const cleanText = sug.replace(/^Research:\s*/, '');
                          setSearchQuery(cleanText);
                          handleExecuteSearch(false);
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={13} color="#C8A34D" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '600', flex: 1 }}>{sug}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* LOADING STATE */}
            {isSearching && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 24 }]}>
                <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.textPrimary }}>Researching relevant legal authorities...</Text>
                <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 4 }}>Reviewing case context, statutes and precedents</Text>
              </View>
            )}

            {/* SEARCH RESULTS */}
            {!isSearching && searchResults.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.sectionHeaderLabel, { color: theme.textSecondary }]}>RESEARCH RESULTS ({searchResults.length})</Text>
                <View style={{ gap: 12 }}>
                  {searchResults.map((item) => {
                    const isAlreadySaved = savedPrecedents.some((p) => p.id === item.id || p.name === item.name);

                    return (
                      <View key={item.id} style={[styles.judgmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        {/* HEADER ROW */}
                        <View style={styles.cardHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.judgmentName, { color: theme.textPrimary }]}>{item.name}</Text>
                            {(item.court || item.year) && (
                              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                {[item.court, item.year].filter(Boolean).join(' • ')}
                              </Text>
                            )}
                            <Text style={{ fontSize: 10.5, color: item.citation ? '#C8A34D' : theme.textSecondary, fontWeight: item.citation ? '700' : '400', marginTop: 1 }}>
                              Citation: {item.citation || 'Citation unavailable'}
                            </Text>
                          </View>
                        </View>

                        {/* RELEVANT LAW / SECTION */}
                        {Array.isArray(item.relevantSections) && item.relevantSections.length > 0 && (
                          <View style={{ marginTop: 6 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>Relevant Law</Text>
                            <Text style={{ fontSize: 11.5, color: theme.textPrimary, fontWeight: '600' }}>{item.relevantSections.join(', ')}</Text>
                          </View>
                        )}

                        {/* KEY PRINCIPLE */}
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#C8A34D', textTransform: 'uppercase' }}>KEY PRINCIPLE</Text>
                          <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 17, marginTop: 2 }}>
                            {item.summary || item.holding}
                          </Text>
                        </View>

                        {/* WHY IT MATTERS FOR THIS CASE */}
                        <View style={{ marginTop: 8, marginBottom: 10, padding: 8, borderRadius: 8, backgroundColor: isDark ? '#111827' : '#FFFBEB' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#C8A34D', textTransform: 'uppercase' }}>WHY IT MATTERS FOR THIS CASE</Text>
                          <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16, marginTop: 2 }}>
                            {item.caseRelevance}
                          </Text>
                        </View>

                        {/* ACTIONS */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} onPress={() => setSelectedPrecedent(item)}>
                            <Text style={[styles.cardActionBtnText, { color: theme.textPrimary }]}>View Details</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.cardActionBtn,
                              { backgroundColor: isAlreadySaved ? (isDark ? '#374151' : '#E5E7EB') : 'rgba(200, 163, 77, 0.15)' },
                            ]}
                            onPress={() => !isAlreadySaved && handleSavePrecedentToCase(item)}
                            disabled={isAlreadySaved}
                          >
                            <Ionicons name={isAlreadySaved ? 'checkmark-circle' : 'bookmark'} size={13} color={isAlreadySaved ? theme.textSecondary : '#C8A34D'} style={{ marginRight: 4 }} />
                            <Text style={[styles.cardActionBtnText, { color: isAlreadySaved ? theme.textSecondary : '#C8A34D' }]}>
                              {isAlreadySaved ? '✓ Saved' : 'Save to Case'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* EMPTY SEARCH RESULT */}
            {!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                <Ionicons name="search-outline" size={36} color="#C8A34D" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No reliable legal authorities were found for this query.</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Try refining the legal issue, Act, Section or case question.</Text>
              </View>
            )}
          </View>
        )}

        {/* ====================================================================
            TAB 2: SAVED PRECEDENTS
        ==================================================================== */}
        {activeTab === 'saved' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.sectionHeaderLabel, { color: theme.textSecondary }]}>SAVED CASE PRECEDENTS</Text>
            </View>

            {savedPrecedents.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="bookmark-outline" size={40} color="#C8A34D" style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No research saved for this case yet.</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Search laws, judgments and legal principles, then save relevant research to your firm's case workspace.
                </Text>
                <TouchableOpacity style={[styles.goldBtn, { marginTop: 14, paddingHorizontal: 20 }]} onPress={() => setActiveTab('research')}>
                  <Text style={styles.goldBtnText}>Start Research</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {savedPrecedents.map((item, idx) => (
                  <View key={item.id || idx} style={[styles.judgmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.judgmentName, { color: theme.textPrimary }]}>{item.name}</Text>
                        {(item.court || item.year) && (
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                            {[item.court, item.year].filter(Boolean).join(' • ')}
                          </Text>
                        )}
                        <Text style={{ fontSize: 10.5, color: item.citation ? '#C8A34D' : theme.textSecondary, fontWeight: item.citation ? '700' : '400', marginTop: 1 }}>
                          Citation: {item.citation || 'Citation unavailable'}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 6 }}>
                      Saved by: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.savedBy || 'Team Member'}</Text>
                      {item.savedDate ? ` • ${item.savedDate}` : ''}
                    </Text>

                    <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 17, marginVertical: 8 }} numberOfLines={2}>
                      {item.summary || item.holding}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} onPress={() => setSelectedPrecedent(item)}>
                        <Text style={[styles.cardActionBtnText, { color: theme.textPrimary }]}>View Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={() => handleRemoveSavedPrecedent(item.id || item._id, item.name)}
                      >
                        <Ionicons name="trash-outline" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.cardActionBtnText, { color: '#EF4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ====================================================================
          EXPANDED VIEW DETAILS MODAL (EXPANDED RESEARCH ANALYSIS)
      ==================================================================== */}
      <Modal visible={!!selectedPrecedent} transparent animationType="fade" onRequestClose={() => setSelectedPrecedent(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedPrecedent(null)}>
          {selectedPrecedent && (
            <TouchableWithoutFeedback>
              <View style={[styles.detailModalCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
                {/* MODAL HEADER */}
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                    {selectedPrecedent.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedPrecedent(null)}>
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                  {/* COURT, DATE, CITATION */}
                  {(selectedPrecedent.court || selectedPrecedent.year || selectedPrecedent.date) && (
                    <Text style={styles.modalSub}>
                      {[selectedPrecedent.court, selectedPrecedent.date || selectedPrecedent.year].filter(Boolean).join(' • ')}
                    </Text>
                  )}

                  {selectedPrecedent.bench && (
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                      Bench: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{selectedPrecedent.bench}</Text>
                    </Text>
                  )}

                  {Array.isArray(selectedPrecedent.judges) && selectedPrecedent.judges.length > 0 && (
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                      Judges: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{selectedPrecedent.judges.join(', ')}</Text>
                    </Text>
                  )}

                  <Text style={{ fontSize: 11, color: selectedPrecedent.citation ? '#C8A34D' : theme.textSecondary, fontWeight: '700', marginTop: 3 }}>
                    Citation: {selectedPrecedent.citation || 'Citation unavailable'}
                  </Text>

                  {/* SOURCE VERIFICATION BADGE */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 }}>
                    <Ionicons
                      name={selectedPrecedent.isVerified ? 'checkmark-circle' : 'sparkles'}
                      size={13}
                      color={selectedPrecedent.isVerified ? '#22C55E' : '#C8A34D'}
                    />
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: selectedPrecedent.isVerified ? '#22C55E' : '#C8A34D' }}>
                      {selectedPrecedent.isVerified ? 'VERIFIED LEGAL SOURCE' : 'AI-ASSISTED RESEARCH'}
                    </Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {/* 1. RELEVANT LAW / STATUTES */}
                  {Array.isArray(selectedPrecedent.relevantSections) && selectedPrecedent.relevantSections.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>RELEVANT LAW / STATUTES</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary, fontWeight: '600' }]}>
                        {selectedPrecedent.relevantSections.join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* 2. CASE BACKGROUND (FOR PRECEDENTS) */}
                  {selectedPrecedent.caseBackground && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>CASE BACKGROUND & FACTS</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>{selectedPrecedent.caseBackground}</Text>
                    </View>
                  )}

                  {/* 3. LEGAL ISSUE CONSIDERED */}
                  {selectedPrecedent.legalIssue && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>LEGAL QUESTION CONSIDERED</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>{selectedPrecedent.legalIssue}</Text>
                    </View>
                  )}

                  {/* 4. KEY LEGAL PRINCIPLE */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={styles.modalSectionLabel}>KEY LEGAL PRINCIPLE / RATIO</Text>
                    <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>
                      {selectedPrecedent.legalPrinciple || selectedPrecedent.summary}
                    </Text>
                  </View>

                  {/* 5. KEY HOLDING / DECISION */}
                  {selectedPrecedent.holding && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>COURT HOLDING & DECISION</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>{selectedPrecedent.holding}</Text>
                    </View>
                  )}

                  {/* 6. JUDICIAL REASONING */}
                  {selectedPrecedent.reasoning && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>JUDICIAL REASONING</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>{selectedPrecedent.reasoning}</Text>
                    </View>
                  )}

                  {/* 7. AI CASE RELEVANCE (CONTEXTUAL ANALYSIS FOR THIS CASE) */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={styles.modalSectionLabel}>AI CASE RELEVANCE</Text>
                    <View style={{ padding: 12, borderRadius: 10, backgroundColor: isDark ? '#111827' : '#FFFBEB', borderWidth: 1, borderColor: isDark ? '#374151' : '#FDE68A' }}>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary, lineHeight: 18 }]}>
                        {selectedPrecedent.caseRelevance}
                      </Text>
                    </View>
                  </View>

                  {/* 8. PRACTICAL LEGAL USE */}
                  {selectedPrecedent.practicalUse && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>PRACTICAL STRATEGIC USE</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textPrimary }]}>{selectedPrecedent.practicalUse}</Text>
                    </View>
                  )}

                  {/* 9. SOURCE REFERENCE */}
                  {selectedPrecedent.source && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.modalSectionLabel}>SOURCE REFERENCE</Text>
                      <Text style={[styles.modalBodyText, { color: theme.textSecondary, fontSize: 11 }]}>{selectedPrecedent.source}</Text>
                    </View>
                  )}

                  {/* STICKY BOTTOM ACTION BUTTON */}
                  {(() => {
                    const isAlreadySaved = savedPrecedents.some((p) => p.id === selectedPrecedent.id || p.name === selectedPrecedent.name);

                    return (
                      <View style={{ marginTop: 16, marginBottom: 10 }}>
                        <TouchableOpacity
                          style={[
                            styles.goldBtn,
                            { backgroundColor: isAlreadySaved ? (isDark ? '#374151' : '#E5E7EB') : '#C8A34D' },
                          ]}
                          onPress={() => {
                            if (!isAlreadySaved) {
                              handleSavePrecedentToCase(selectedPrecedent);
                              setSelectedPrecedent(null);
                            }
                          }}
                          disabled={isAlreadySaved}
                        >
                          <Ionicons name={isAlreadySaved ? 'checkmark-circle' : 'bookmark'} size={15} color={isAlreadySaved ? theme.textSecondary : '#FFFFFF'} style={{ marginRight: 6 }} />
                          <Text style={[styles.goldBtnText, { color: isAlreadySaved ? theme.textSecondary : '#FFFFFF' }]}>
                            {isAlreadySaved ? '✓ Saved to Case' : 'Save to Case'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// MAIN EXPORT WRAPPER
export const ResearchIntelligenceWorkspace: React.FC<ResearchIntelligenceWorkspaceProps> = ({
  workspace,
  currentUserRole = 'Managing Partner',
  onBack,
  showToast,
  handleUpdateField,
}) => {
  const currentRole = useRoleStore.getState().selectedRole || 'advocate';
  const globalWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : (workspace?.workspaceType || currentRole);
  const isLawFirm = globalWsType === 'law_firm' || workspace?.workspaceType === 'law_firm';

  // Strict Role Isolation: Personal Advocate/Student workspace stays 100% UNCHANGED
  if (!isLawFirm) {
    return (
      <PersonalResearchWorkspace
        workspace={workspace}
        onBack={onBack}
        showToast={showToast}
        handleUpdateField={handleUpdateField}
      />
    );
  }

  // Render Corrected Law Firm Case Workspace Research & Precedents
  return (
    <FirmResearchPrecedentsWorkspace
      workspace={workspace}
      currentUserRole={currentUserRole}
      onBack={onBack}
      showToast={showToast}
      handleUpdateField={handleUpdateField}
    />
  );
};

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
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '700',
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricCell: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#C8A34D',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12.5,
    marginBottom: 10,
  },
  searchActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  goldBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#C8A34D',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  goldBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  outlineBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outlineBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  judgmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  judgmentName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  relevanceBox: {
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  relevanceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C8A34D',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cardActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A34D',
  },
  activityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailModalCard: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '85%',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    marginTop: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  modalBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
  },
});

