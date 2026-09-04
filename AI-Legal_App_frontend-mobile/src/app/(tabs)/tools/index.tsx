import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { PageHeader } from '@/components/ui';
import { useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useAuthGuard } from '@/navigation/guards';
import { useSubscriptionStore } from '@/store/subscription';
import { useRoleStore } from '@/store/role';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  route: string;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    description: 'FIR, Affidavit & Agreement Architect',
    route: '/tools/draft-maker',
  },
  {
    id: 'argument-builder',
    title: 'Court Prep Workspace',
    description: 'Complete Hearing Intelligence Platform',
    route: '/tools/argument-builder',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedent',
    description: 'Searchable Case Laws & Citation Generator',
    route: '/tools/legal-precedents',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analysis',
    description: 'OCR Scanning & Authenticity Scoring',
    route: '/tools/evidence-analyst',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract Review',
    description: 'Clause Detection & Risky Term Alerts',
    route: '/tools/contract-analyzer',
  },
  {
    id: 'case-predictor',
    title: 'Case Predictor',
    description: 'Success Probability & AI Risk Analysis',
    route: '/tools/case-predictor',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    description: 'Litigation Roadmap & Tactical Suggestions',
    route: '/tools/strategy-engine',
  },
];

const STUDENT_TOOLS_LIST: ToolItem[] = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    description: 'FIR, Affidavit & Legal Drafting Practice',
    route: '/tools/draft-maker',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedent',
    description: 'Search Judgments & Statutory Case Laws',
    route: '/tools/legal-precedents',
  },
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    description: 'Moot Court Practice with AI Judge & Opposing Counsel',
    route: '/tools/mock-courtroom',
  },
  {
    id: 'quiz-practice',
    title: 'Quiz & MCQ Practice',
    description: 'Attempt Topic Quizzes, Practice MCQs & View Explanations',
    route: '/tools/quiz-practice',
  },
  {
    id: 'notes-maker',
    title: 'AI Notes Maker',
    description: 'Generate Short Notes, Detailed Notes & Exam Guides',
    route: '/tools/notes-maker',
  },
];

const FIRM_MANAGEMENT_TOOLS_LIST: ToolItem[] = [
  {
    id: 'client-communication',
    title: 'AI Team Communication',
    description: 'Firm-wide team communication assistant for Call, WhatsApp, Email & SMS notifications.',
    route: '/tools/client-communication',
  },
];

const ADVANCED_FEATURES_LIST: ToolItem[] = [
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    description: 'Practice realistic courtroom hearings with an AI Judge, opposing counsel, witness simulations, objection handling, oral arguments, courtroom scoring, performance feedback, and trial preparation in a fully interactive environment.',
    route: '/tools/mock-courtroom',
  },
  {
    id: 'client-connect',
    title: 'AI Client Connect™',
    description: 'Smart AI-powered communication system that helps lawyers professionally contact clients through WhatsApp or Phone, generate AI message drafts, send hearing reminders, request documents, follow up on payments, collect evidence, and maintain complete communication history.',
    route: '/tools/client-connect',
  },
];

type ViewMode = 'list' | 'grid' | 'compact';

export default function ToolsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { t } = useTranslation();
  const subscription = useSubscriptionStore();
  const { selectedRole } = useRoleStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Refresh subscription and usage limits whenever AI Tools screen comes into focus
  useFocusEffect(
    useCallback(() => {
      subscription.fetchSubscriptionStatus();
    }, [])
  );

  // Load view mode preference from AsyncStorage on mount
  useEffect(() => {
    const loadViewModePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem('ai_tools_view_mode');
        if (stored === 'list' || stored === 'grid' || stored === 'compact') {
          setViewMode(stored);
        }
      } catch (err) {
        console.warn('Failed to load view preference:', err);
      }
    };
    loadViewModePreference();
    subscription.fetchSubscriptionStatus();
  }, []);

  const handleLaunchTool = (toolId: string, route: string) => {
    let featureKey = toolId.replace(/-/g, '_');
    if (featureKey === 'argument_builder') featureKey = 'court_prep';
    if (featureKey === 'legal_precedents') featureKey = 'legal_precedent';
    if (featureKey === 'contract_analyzer') featureKey = 'contract_review';
    if (featureKey === 'evidence_analyst') featureKey = 'evidence_analysis';

    if (subscription.plan !== 'ENTERPRISE' && subscription.plan !== 'SUPER_ADMIN') {
      const usage = subscription.features[featureKey];
      let remaining = usage ? usage.remaining : 1;
      if (!usage) {
        if (subscription.plan === 'FREE') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          remaining = isAdvanced ? 1 : 2;
        } else if (subscription.plan === 'PRO') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          remaining = isAdvanced ? 2 : 5;
        } else if (subscription.plan === 'PREMIUM') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          remaining = isAdvanced ? 5 : 15;
        }
      }
      if (remaining <= 0) {
        subscription.triggerUpgradeModal(featureKey);
        return;
      }
    }
    router.push(route as any);
  };

  const renderUsageBadge = (toolId: string, isCompact = false) => {
    let featureKey = toolId.replace(/-/g, '_');
    if (featureKey === 'argument_builder') featureKey = 'court_prep';
    if (featureKey === 'legal_precedents') featureKey = 'legal_precedent';
    if (featureKey === 'contract_analyzer') featureKey = 'contract_review';
    if (featureKey === 'evidence_analyst') featureKey = 'evidence_analysis';

    let limit = 0;
    let remaining = 0;

    if (subscription.plan === 'ENTERPRISE' || subscription.plan === 'SUPER_ADMIN') {
      limit = Infinity;
      remaining = Infinity;
    } else {
      const usage = subscription.features[featureKey];
      if (usage && usage.limit !== undefined && usage.limit !== -1) {
        limit = usage.limit;
        remaining = usage.remaining;
      } else {
        if (subscription.plan === 'FREE') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          limit = isAdvanced ? 1 : 2;
          remaining = limit;
        } else if (subscription.plan === 'PRO') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          limit = isAdvanced ? 2 : 5;
          remaining = limit;
        } else if (subscription.plan === 'PREMIUM') {
          const isAdvanced = ['mock_courtroom', 'client_connect'].includes(featureKey);
          limit = isAdvanced ? 5 : 15;
          remaining = limit;
        } else {
          limit = 2;
          remaining = 2;
        }
      }
    }

    if (limit === Infinity || remaining === Infinity || limit === -1 || remaining === -1) {
      return (
        <View
          style={[
            styles.badgeRow,
            isCompact && { top: 4, right: 4, paddingHorizontal: 4, paddingVertical: 2 },
            { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' },
          ]}
        >
          <Text style={[styles.badgeText, isCompact && { fontSize: 8 }, { color: '#10B981' }]}>
            {subscription.plan === 'ENTERPRISE' || subscription.plan === 'SUPER_ADMIN' ? 'Enterprise' : '∞ Unlimited'}
          </Text>
        </View>
      );
    }

    const isExhausted = remaining <= 0;
    return (
      <View
        style={[
          styles.badgeRow,
          isCompact && { top: 4, right: 4, paddingHorizontal: 4, paddingVertical: 2 },
          {
            backgroundColor: isExhausted
              ? isDark
                ? 'rgba(248, 113, 113, 0.15)'
                : '#FEF2F2'
              : isDark
              ? 'rgba(251, 191, 36, 0.15)'
              : '#FFFBEB',
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            isCompact && { fontSize: 8 },
            { color: isExhausted ? '#EF4444' : '#F59E0B' },
          ]}
        >
          {isExhausted ? 'Upgrade Needed' : `${remaining}/${limit} Free`}
        </Text>
      </View>
    );
  };

  // Switch between List, Grid, and Compact views dynamically with transition
  const handleToggleViewMode = async () => {
    const nextMode: ViewMode =
      viewMode === 'list' ? 'grid' : viewMode === 'grid' ? 'compact' : 'list';
    setViewMode(nextMode);
    try {
      await AsyncStorage.setItem('ai_tools_view_mode', nextMode);
    } catch (err) {
      console.warn('Failed to save view preference:', err);
    }
  };

  const getToggleIconName = () => {
    if (viewMode === 'list') return 'list-outline';
    if (viewMode === 'grid') return 'grid-outline';
    return 'apps-outline';
  };

  const renderToolIcon = (id: string, color: string, size: number) => {
    switch (id) {
      case 'draft-maker':
        return <Ionicons name="create-outline" size={size} color={color} />;
      case 'argument-builder':
      case 'mock-courtroom':
        return <FontAwesome5 name="gavel" size={size - 4} color={color} />;
      case 'legal-precedents':
        return <Ionicons name="library-outline" size={size} color={color} />;
      case 'evidence-analyst':
        return <Ionicons name="finger-print-outline" size={size} color={color} />;
      case 'contract-analyzer':
        return <Ionicons name="document-attach-outline" size={size} color={color} />;
      case 'case-predictor':
        return <Feather name="target" size={size - 2} color={color} />;
      case 'strategy-engine':
        return <FontAwesome5 name="chess-knight" size={size - 2} color={color} />;
      case 'quiz-practice':
        return <Ionicons name="clipboard-outline" size={size} color={color} />;
      case 'notes-maker':
        return <Ionicons name="journal-outline" size={size} color={color} />;
      case 'knowledge-hub':
        return <Ionicons name="book-outline" size={size} color={color} />;
      case 'client-connect':
      case 'client-communication':
        return <Ionicons name="chatbubbles-outline" size={size} color={color} />;
      case 'case-assignment':
        return <Ionicons name="git-network-outline" size={size} color={color} />;
      case 'meeting-assistant':
        return <Ionicons name="journal-outline" size={size} color={color} />;
      default:
        return <Ionicons name="cube-outline" size={size} color={color} />;
    }
  };

  // Dimensions for grid and compact views
  const { width: screenWidth } = Dimensions.get('window');
  const paddingHorizontal = 20;
  const gridGap = 12;
  const compactGap = 10;

  const gridCardWidth = (screenWidth - (paddingHorizontal * 2) - gridGap) / 2;
  const compactCardWidth = (screenWidth - (paddingHorizontal * 2) - (compactGap * 2)) / 3;

  const ViewToggleBtn = (
    <Pressable
      onPress={handleToggleViewMode}
      style={({ pressed }) => [
        styles.toggleBtn,
        pressed && { backgroundColor: theme.hover },
      ]}
      accessibilityLabel="View Mode"
      accessibilityRole="button"
    >
      <Ionicons name={getToggleIconName()} size={22} color={theme.textPrimary} />
    </Pressable>
  );

  const activeTools = selectedRole === 'student' ? STUDENT_TOOLS_LIST : TOOLS_LIST;

  const renderToolCard = (tool: ToolItem, customActionText?: string, isDirectPush = false) => (
    <Pressable
      key={tool.id}
      style={({ pressed }) => [
        viewMode === 'list'
          ? styles.toolCard
          : viewMode === 'grid'
          ? [styles.gridCard, { width: gridCardWidth }]
          : [styles.compactCard, { width: compactCardWidth }],
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && [styles.toolCardPressed, { backgroundColor: theme.hover }],
      ]}
      onPress={() => (isDirectPush ? router.push(tool.route as any) : handleLaunchTool(tool.id, tool.route))}
      accessibilityRole="button"
      accessibilityLabel={`Launch ${tool.title}`}
    >
      {viewMode === 'list' && (
        <>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: isDark ? '#222222' : '#F5F5F5',
                  borderColor: isDark ? '#333333' : '#E5E5E5',
                },
              ]}
            >
              {renderToolIcon(tool.id, '#C8A34D', 24)}
            </View>
            {renderUsageBadge(tool.id)}
          </View>

          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {tool.title}
          </Text>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            {tool.description}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.actionText, { color: '#C8A34D' }]}>
              {customActionText || t('cases.openWorkspace')}
            </Text>
            {!customActionText && <Ionicons name="arrow-forward" size={14} color="#C8A34D" />}
          </View>
        </>
      )}

      {viewMode === 'grid' && (
        <>
          <View
            style={[
              styles.gridIconWrapper,
              {
                backgroundColor: isDark ? '#222222' : '#F5F5F5',
                borderColor: isDark ? '#333333' : '#E5E5E5',
              },
            ]}
          >
            {renderToolIcon(tool.id, '#C8A34D', 22)}
          </View>

          <Text style={[styles.gridCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {tool.title}
          </Text>
          {renderUsageBadge(tool.id)}
          <Text style={[styles.gridCardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {tool.description}
          </Text>

          <View style={styles.gridCardFooter}>
            <Text style={[styles.gridActionText, { color: '#C8A34D' }]}>
              {customActionText || 'Open'}
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#C8A34D" />
          </View>
        </>
      )}

      {viewMode === 'compact' && (
        <>
          {renderUsageBadge(tool.id, true)}
          <View style={styles.compactContentWrapper}>
            <View
              style={[
                styles.compactIconWrapper,
                {
                  backgroundColor: isDark ? '#222222' : '#F5F5F5',
                  borderColor: isDark ? '#333333' : '#E5E5E5',
                },
              ]}
            >
              {renderToolIcon(tool.id, '#C8A34D', 20)}
            </View>

            <Text style={[styles.compactCardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              {tool.title}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title={t('navigation.aiTools', 'AI Tools')}
        subtitle="AI LEGAL ASSISTANT"
        showBack={true}
        rightActions={[ViewToggleBtn]}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedRole === 'law_firm' ? (
            <>
              {/* Section 1: Litigation AI Tools List */}
              <View
                style={
                  viewMode === 'list'
                    ? styles.listContainer
                    : viewMode === 'grid'
                    ? styles.gridContainer
                    : styles.compactContainer
                }
              >
                {TOOLS_LIST.map((tool) => renderToolCard(tool))}
              </View>

              {/* Section 2 Header: Firm Management AI */}
              <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

              <View style={{ marginBottom: 12, marginTop: viewMode === 'list' ? 0 : 8 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                  Firm Management AI
                </Text>
                <Text style={[styles.sectionSubHeading, { color: theme.textSecondary }]}>
                  Firm-wide client communication assistant
                </Text>
              </View>

              {/* Section 2: Firm Management AI Tools List */}
              <View
                style={
                  viewMode === 'list'
                    ? styles.listContainer
                    : viewMode === 'grid'
                    ? styles.gridContainer
                    : styles.compactContainer
                }
              >
                {FIRM_MANAGEMENT_TOOLS_LIST.map((tool) => renderToolCard(tool, 'Open Tool →', true))}
              </View>
            </>
          ) : (
            <>
              {/* Section 1: Active AI Tools (Advocate or Student) */}
              <View
                style={
                  viewMode === 'list'
                    ? styles.listContainer
                    : viewMode === 'grid'
                    ? styles.gridContainer
                    : styles.compactContainer
                }
              >
                {activeTools.map((tool) => renderToolCard(tool))}
              </View>

              {/* Section 2: Flagship Advanced Features (Advocate Mode Only) */}
              {selectedRole === 'advocate' && (
                <>
                  <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

                  <View style={{ marginBottom: 12, marginTop: viewMode === 'list' ? 0 : 8 }}>
                    <Text style={[styles.advancedSectionTitle, { color: theme.textPrimary }]}>🚀 ADVANCED FEATURES</Text>
                    <Text style={styles.advancedSectionSubtitle}>
                      Professional AI workspaces for courtroom simulation, legal research and intelligent communication.
                    </Text>
                  </View>

                  <View
                    style={
                      viewMode === 'list'
                        ? styles.listContainer
                        : viewMode === 'grid'
                        ? styles.gridContainer
                        : styles.compactContainer
                    }
                  >
                    {ADVANCED_FEATURES_LIST.map((tool) => renderToolCard(tool))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  listContainer: {
    gap: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  compactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toolCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    justifyContent: 'space-between',
    position: 'relative',
  },
  gridIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridCardDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
    height: 30,
    marginBottom: 8,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactContentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    height: 32,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionDivider: {
    height: 1,
    marginVertical: 26,
    opacity: 0.6,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionSubHeading: {
    fontSize: 12,
    marginTop: 2,
  },
  advancedSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  advancedSectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
});
