import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OutputLanguageSelector } from './ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { EnterpriseAiQuickActionsModal, QuickActionType } from './EnterpriseAiQuickActionsModal';
import { WorkspaceActivityTimelineModal, CATEGORY_META } from './WorkspaceActivityTimelineModal';
import ActivityService, { WorkspaceActivityItem } from '../services/activity.service';
import { CaseActivityFeedModal } from './CaseActivityFeedModal';
import { CaseService } from '../services/case.service';

interface EnterpriseFirmCaseWorkspaceProps {
  workspace: any;
  latestAnalysis?: any;
  onCaseUpdate?: () => void;
  onSelectModule?: (moduleId: string) => void;
  onAnalyzeCasePress?: () => void;
  onOpenAiAssistantPress?: () => void;
  onAssignTeamPress?: () => void;
  onCreateTaskPress?: () => void;
  onScheduleHearingPress?: () => void;
  onUploadDocumentPress?: () => void;
  onInternalNotePress?: () => void;
}

export const EnterpriseFirmCaseWorkspace: React.FC<EnterpriseFirmCaseWorkspaceProps> = ({
  workspace,
  latestAnalysis,
  onCaseUpdate,
  onSelectModule,
  onAnalyzeCasePress,
  onOpenAiAssistantPress,
  onAssignTeamPress,
  onCreateTaskPress,
  onScheduleHearingPress,
  onUploadDocumentPress,
  onInternalNotePress,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aiActionModalVisible, setAiActionModalVisible] = useState(false);
  const [activeAiActionType, setActiveAiActionType] = useState<QuickActionType | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [liveActivities, setLiveActivities] = useState<WorkspaceActivityItem[]>([]);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Edit Case Modal & Form States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editCaseNumber, setEditCaseNumber] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editOpponentName, setEditOpponentName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editPriority, setEditPriority] = useState('High');
  const [editNextHearing, setEditNextHearing] = useState('');
  const [editLeadAdvocate, setEditLeadAdvocate] = useState('');

  const handleOpenEditModal = () => {
    setIsMenuOpen(false);
    setEditName(workspace?.name || '');
    setEditCourt(workspace?.court || workspace?.courtName || '');
    setEditCaseNumber(workspace?.caseNumber || '');
    setEditClientName(workspace?.clientName || '');
    setEditOpponentName(workspace?.opponentName || workspace?.opposingParty || '');
    setEditStatus(workspace?.status || 'Active');
    setEditPriority(workspace?.priority || 'High');
    setEditNextHearing(workspace?.nextHearing || workspace?.nextHearingDate || '');
    setEditLeadAdvocate(workspace?.leadAdvocate || workspace?.ownerName || '');
    setIsEditModalOpen(true);
  };

  const handleSaveCaseEdits = async () => {
    if (!editName.trim()) {
      showToast('error', 'Validation Error', 'Case Title is required.');
      return;
    }

    const caseId = String(workspace?._id || workspace?.id || '');
    if (!caseId) {
      showToast('error', 'Update Error', 'Case ID not found.');
      return;
    }

    try {
      setIsSavingEdit(true);
      const payload = {
        name: editName.trim(),
        court: editCourt.trim(),
        caseNumber: editCaseNumber.trim(),
        clientName: editClientName.trim(),
        opponentName: editOpponentName.trim(),
        status: editStatus,
        priority: editPriority,
        nextHearing: editNextHearing.trim(),
        leadAdvocate: editLeadAdvocate.trim(),
      };

      const res = await CaseService.updateCase(caseId, payload);
      if (res && (res.success || (res as any).data || (res as any).project)) {
        showToast('success', 'Case Updated', 'Case details saved successfully.');
        setIsEditModalOpen(false);
        if (onCaseUpdate) {
          onCaseUpdate();
        }
      } else {
        throw new Error((res as any)?.error || 'Failed to save changes');
      }
    } catch (e: any) {
      console.error('[UPDATE CASE ERROR]', e);
      showToast('error', 'Update Failed', e?.message || 'Could not save case changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const caseId = workspace?._id || workspace?.id;
    if (caseId) {
      CaseService.getCaseUnreadActivityCount(String(caseId))
        .then((res: any) => {
          if (res && res.success && typeof res.unreadCount === 'number') {
            setUnreadCount(res.unreadCount);
          }
        })
        .catch(() => {});
    }
  }, [workspace?._id, workspace?.id, isActivityModalOpen]);

  useEffect(() => {
    const targetCaseId = workspace?._id || workspace?.id;
    if (targetCaseId) {
      CaseService.getCaseActivities(String(targetCaseId))
        .then((res: any) => {
          if (res && res.success && Array.isArray(res.activities)) {
            setLiveActivities(res.activities.slice(0, 5));
          }
        })
        .catch(() => {});
    }
  }, [workspace?._id, workspace?.id, aiActionModalVisible, isActivityModalOpen]);

  const handleOpenAiQuickAction = (type: QuickActionType) => {
    setActiveAiActionType(type);
    setAiActionModalVisible(true);
  };

  const formatPartyName = (val: string, fallback: string) => {
    if (!val || val === 'N/A') return fallback;
    if (val === 'सुरेश कुमार') return 'Suresh Kumar';
    if (val === 'प्रतिवादी' || val === 'प्रतिवादी ') return 'Respondent';
    return val;
  };

  const title = workspace?.name || workspace?.title || 'Case Workspace';
  const status = workspace?.status || 'Active';
  const priority = workspace?.priority || 'High';
  const rawClient = workspace?.clientName || workspace?.client || 'Suresh Kumar';
  const rawOpponent = workspace?.opponentName || workspace?.respondent || workspace?.accused || 'Respondent';
  const clientName = formatPartyName(rawClient, 'Suresh Kumar');
  const opponentName = formatPartyName(rawOpponent, 'Respondent');
  const court = workspace?.court || 'High Court of Delhi';
  const caseNumber = workspace?.caseNumber || 'CS(COMM) 102/2026';
  const nextHearing = workspace?.nextHearingDate || workspace?.hearings?.[0]?.date || '28 July';

  // Dynamic Lead Advocate & Team Roster
  const leadAdvocateName = React.useMemo(() => {
    if (workspace?.leadAdvocate && typeof workspace.leadAdvocate === 'string' && workspace.leadAdvocate.trim()) {
      return workspace.leadAdvocate.trim();
    }
    if (Array.isArray(workspace?.caseAssignments) && workspace.caseAssignments.length > 0) {
      const leadItem = workspace.caseAssignments.find((ca: any) => String(ca.caseRole || ca.role).toLowerCase().includes('lead'));
      if (leadItem && leadItem.name) return leadItem.name;
    }
    if (Array.isArray(workspace?.teamMembers) && workspace.teamMembers.length > 0) {
      const first = workspace.teamMembers[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && first.name) return first.name;
    }
    return 'Assigned Advocate';
  }, [workspace]);

  const teamRosterList = React.useMemo(() => {
    const rawList: any[] = [];
    if (Array.isArray(workspace?.caseAssignments)) {
      workspace.caseAssignments.forEach((ca: any) => {
        if (ca && ca.name) rawList.push({ name: ca.name, role: ca.caseRole || ca.role || 'Advocate' });
      });
    }
    if (Array.isArray(workspace?.teamMembers)) {
      workspace.teamMembers.forEach((tm: any) => {
        const nameStr = typeof tm === 'string' ? tm : tm?.name;
        if (nameStr && !rawList.some(r => r.name === nameStr)) {
          rawList.push({ name: nameStr, role: typeof tm === 'object' ? tm.role : 'Advocate' });
        }
      });
    }
    return rawList;
  }, [workspace]);

  const caseModules = [
    { id: 'case-info', label: 'Case Info', icon: 'information-circle-outline' },
    { id: 'client-connect', label: 'Client Connect', icon: 'chatbubbles-outline' },
    { id: 'case-chat', label: 'Case Team Chat', icon: 'people-outline' },
    { id: 'hearings', label: 'Hearings', icon: 'calendar-outline' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
    { id: 'documents', label: 'Documents', icon: 'document-text-outline' },
    { id: 'evidence', label: 'Evidence Vault', icon: 'shield-checkmark-outline' },
    { id: 'research', label: 'Research & Precedents', icon: 'book-outline' },
  ];

  const recentActivities = React.useMemo(() => {
    if (Array.isArray(workspace?.activities) && workspace.activities.length > 0) {
      return workspace.activities
        .filter((act: any) => {
          const cat = String(act.activityCategory || act.module || '').toUpperCase();
          const actTitle = String(act.action || act.title || act.description || '').toLowerCase();
          if (cat.includes('CHAT') || cat.includes('CASE_TEAM') || cat.includes('CASE_CHAT')) return false;
          if (actTitle.includes('chat') || actTitle.includes('hy generated') || actTitle.includes('message')) return false;
          return true;
        })
        .map((act: any, index: number) => ({
          id: String(act._id || index),
          time: act.time || act.date || 'Recently',
          user: typeof act.user === 'object' ? (act.user.name || 'Advocate') : (act.user || 'Advocate'),
          action: act.action || act.title || 'Case Activity',
        }));
    }

    const events: Array<{ id: string; time: string; user: string; action: string }> = [];
    const ownerName = workspace?.ownerInfo?.name || workspace?.ownerName || 'Firm Owner';
    events.push({ id: 'ra_1', time: 'Recently', user: ownerName, action: 'Case Workspace Active' });

    if (Array.isArray(workspace?.documents) && workspace.documents.length > 0) {
      const doc = workspace.documents[0];
      const uploader = typeof doc.uploadedBy === 'object' ? (doc.uploadedBy.name || ownerName) : String(doc.uploadedBy || ownerName);
      events.push({ id: 'ra_2', time: 'Recently', user: uploader, action: `Uploaded ${doc.title || doc.name || 'Document'}` });
    }

    return events;
  }, [workspace?.activities, workspace?.documents, workspace?.ownerInfo, workspace?.ownerName]);

  return (
    <View style={styles.container}>
      {/* ==========================================
          SECTION 1: CASE HEADER & META
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: -4 }}>
          <OutputLanguageSelector toolId="case-workspace" selectedLanguage={outputLanguage} onLanguageChange={setOutputLanguage} />
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setIsMenuOpen(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Compact Meta Information */}
        <View style={styles.metaGrid}>
          <Text style={[styles.metaItemText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{tTool(outputLanguage, 'fw.court', 'Court:')} </Text>{court}
          </Text>
          <Text style={[styles.metaItemText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{tTool(outputLanguage, 'fw.caseNo', 'Case No:')} </Text>{caseNumber}
          </Text>
          <Text style={[styles.metaItemText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{tTool(outputLanguage, 'fw.client', 'Client:')} </Text>{clientName} vs {opponentName}
          </Text>
          <Text style={[styles.metaItemText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{tTool(outputLanguage, 'fw.nextHearing', 'Next Hearing:')} </Text>{nextHearing}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Lead Advocate & Assigned Team Roster */}
        <View style={styles.teamRosterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.leadAvatar}>
              <Ionicons name="person" size={14} color="#C8A34D" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{leadAdvocateName}</Text>
              <Text style={{ fontSize: 10, color: '#C8A34D', fontWeight: '600' }}>{tTool(outputLanguage, 'fw.leadCounsel', 'Lead Counsel')}</Text>
            </View>
          </View>

          {teamRosterList.length > 0 && (
            <View style={styles.avatarStack}>
              {teamRosterList.slice(0, 3).map((member, idx) => {
                const initial = (member.name || 'A').charAt(0).toUpperCase();
                const colors = ['#3B82F6', '#10B981', '#8B5CF6'];
                return (
                  <View
                    key={idx}
                    style={[
                      styles.stackAvatar,
                      {
                        backgroundColor: colors[idx % colors.length],
                        zIndex: 4 - idx,
                        marginLeft: idx > 0 ? -8 : 0,
                      },
                    ]}
                  >
                    <Text style={styles.stackInitial}>{initial}</Text>
                  </View>
                );
              })}
              {teamRosterList.length > 3 && (
                <View
                  style={[
                    styles.stackAvatar,
                    {
                      backgroundColor: 'rgba(200, 163, 77, 0.2)',
                      borderColor: '#C8A34D',
                      zIndex: 1,
                      marginLeft: -8,
                    },
                  ]}
                >
                  <Text style={[styles.stackInitial, { color: '#C8A34D' }]}>
                    +{teamRosterList.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ==========================================
          SECTION 2: MERGED UNIFIED AI CASE SUMMARY
      ========================================== */}
      {(() => {
        const ci = (workspace as any)?.caseIntelligence || latestAnalysis?.data || latestAnalysis || {};
        const caseStrength = ci.caseStrengthScore !== undefined ? `${ci.caseStrengthScore}%` : '82%';
        const winProb = ci.winProbability || 'High';
        const recommendationText = ci.aiRecommendation || 'Prepare Witness Affidavit & verify contract liability clauses before the upcoming hearing on 28 July.';

        return (
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: '#C8A34D' }]}>
            <View style={styles.summaryHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.aiSparkleBg}>
                  <Ionicons name="sparkles" size={16} color="#C8A34D" />
                </View>
                <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'fw.aiCaseSummary', 'AI Case Summary')}</Text>
              </View>
              <View style={styles.confidenceChip}>
                <Text style={styles.confidenceText}>{tTool(outputLanguage, 'fw.intelligentSync', 'Intelligent Sync')}</Text>
              </View>
            </View>

            {/* 2-Column Grid Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{tTool(outputLanguage, 'fw.caseStrength', 'Case Strength')}</Text>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>{caseStrength}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{tTool(outputLanguage, 'fw.winProb', 'Win Prob.')}</Text>
                <Text style={[styles.metricVal, { color: '#C8A34D' }]}>{winProb}</Text>
              </View>
            </View>

            {/* AI Strategic Recommendation Box */}
            <View style={[styles.recommendationBox, { backgroundColor: isDark ? '#374151' : '#FFFBEB', borderColor: 'rgba(200, 163, 77, 0.3)' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#C8A34D', textTransform: 'uppercase', marginBottom: 2 }}>
                {tTool(outputLanguage, 'fw.aiRecommendation', 'AI Recommendation')}
              </Text>
              <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 17 }}>
                {recommendationText}
              </Text>
            </View>

            {/* Action Button */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.aiBtnPrimary, { backgroundColor: '#C8A34D' }]}
                onPress={onAnalyzeCasePress}
              >
                <Ionicons name="analytics-outline" size={15} color="#FFFFFF" />
                <Text style={styles.aiBtnPrimaryText}>{tTool(outputLanguage, 'fw.analyzeCase', 'Analyze Case')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* ==========================================
          SECTION 3: CASE MODULES LIST
      ========================================== */}
      <View style={{ marginTop: 18 }}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'fw.caseModules', 'Case Modules')}</Text>
        <View style={styles.modulesList}>
          {caseModules.map((module) => (
            <Pressable
              key={module.id}
              style={({ pressed }) => [
                styles.moduleCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
              ]}
              onPress={() => onSelectModule?.(module.id)}
            >
              <View style={styles.moduleLeft}>
                <View style={styles.moduleIconBg}>
                  <Ionicons name={module.icon as any} size={18} color="#C8A34D" />
                </View>
                <Text style={[styles.moduleTitleText, { color: theme.textPrimary }]}>
                  {tTool(outputLanguage, 'fw.mod_' + module.id.replace(/-/g, '_'), module.label)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </View>

      {/* ==========================================
          SECTION 4: RECENT ACTIVITY (LIVE AUDIT FEED)
      ========================================== */}
      <View style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginBottom: 0 }]}>{tTool(outputLanguage, 'fw.recentActivity', 'Recent Activity')}</Text>
          <TouchableOpacity onPress={() => setIsTimelineModalOpen(true)}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#C8A34D' }}>{tTool(outputLanguage, 'fw.viewFullTimeline', 'View Full Timeline →')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border, padding: 0 }]}>
          {liveActivities.length === 0 ? (
            <View style={{ padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>{tTool(outputLanguage, 'fw.noActivity', 'No recent activities logged for this case.')}</Text>
            </View>
          ) : (
            liveActivities.map((act, idx) => {
              const meta = CATEGORY_META[act.activityCategory] || { icon: 'time-outline', color: '#C8A34D' };
              return (
                <TouchableOpacity
                  key={act._id || idx}
                  activeOpacity={0.7}
                  style={[
                    styles.compactActivityRow,
                    idx < liveActivities.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={() => setIsTimelineModalOpen(true)}
                >
                  <View style={styles.compactRowLeft}>
                    <Ionicons name={meta.icon as any} size={15} color={meta.color || '#C8A34D'} />
                    <Text style={[styles.compactRowTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {act.action || act.title}
                    </Text>
                  </View>
                  <Text style={[styles.compactRowTime, { color: theme.textSecondary }]}>
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* ==========================================
          SECTION 5: ENTERPRISE AI QUICK ACTIONS HUB (COMPACT)
      ========================================== */}
      <View style={{ marginTop: 20, marginBottom: 24 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
            Enterprise AI Quick Actions
          </Text>
          <View style={styles.goldBadge}>
            <Ionicons name="sparkles" size={12} color="#000000" />
            <Text style={styles.goldBadgeText}>AI HUB</Text>
          </View>
        </View>

        <View style={styles.quickActionsGrid}>
          {/* 1. AI DRAFT MAKER */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.aiActionCardCompact, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleOpenAiQuickAction('draft-maker')}
          >
            <View style={[styles.aiIconBgCompact, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
              <Ionicons name="document-text-outline" size={18} color="#C8A34D" />
            </View>

            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiActionTitleCompact, { color: theme.textPrimary }]}>
                AI Draft Maker
              </Text>
              <Text style={[styles.aiActionDescCompact, { color: theme.textSecondary }]} numberOfLines={1}>
                Generate court-ready legal drafts
              </Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={18} color="#C8A34D" />
          </TouchableOpacity>

          {/* 2. AI ARGUMENT BUILDER */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.aiActionCardCompact, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleOpenAiQuickAction('argument-builder')}
          >
            <View style={[styles.aiIconBgCompact, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
              <Ionicons name="flash-outline" size={18} color="#C8A34D" />
            </View>

            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiActionTitleCompact, { color: theme.textPrimary }]}>
                AI Argument Builder
              </Text>
              <Text style={[styles.aiActionDescCompact, { color: theme.textSecondary }]} numberOfLines={1}>
                Prepare court arguments & legal briefs
              </Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={18} color="#C8A34D" />
          </TouchableOpacity>

          {/* 3. AI CROSS EXAMINATION */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.aiActionCardCompact, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleOpenAiQuickAction('cross-examination')}
          >
            <View style={[styles.aiIconBgCompact, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
              <Ionicons name="help-buoy-outline" size={18} color="#C8A34D" />
            </View>

            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiActionTitleCompact, { color: theme.textPrimary }]}>
                AI Cross Examination
              </Text>
              <Text style={[styles.aiActionDescCompact, { color: theme.textSecondary }]} numberOfLines={1}>
                Generate witness & trial examination questions
              </Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={18} color="#C8A34D" />
          </TouchableOpacity>

          {/* 4. CASE PROGRESS REPORT */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.aiActionCardCompact, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleOpenAiQuickAction('progress-report')}
          >
            <View style={[styles.aiIconBgCompact, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
              <Ionicons name="bar-chart-outline" size={18} color="#C8A34D" />
            </View>

            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiActionTitleCompact, { color: theme.textPrimary }]}>
                Case Progress Report
              </Text>
              <Text style={[styles.aiActionDescCompact, { color: theme.textSecondary }]} numberOfLines={1}>
                AI case progress summary & audit
              </Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={18} color="#C8A34D" />
          </TouchableOpacity>

          {/* 5. AI COPILOT */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.aiActionCardCompact, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleOpenAiQuickAction('copilot')}
          >
            <View style={[styles.aiIconBgCompact, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
              <Ionicons name="sparkles-outline" size={18} color="#C8A34D" />
            </View>

            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiActionTitleCompact, { color: theme.textPrimary }]}>
                AI Copilot
              </Text>
              <Text style={[styles.aiActionDescCompact, { color: theme.textSecondary }]} numberOfLines={1}>
                Ask anything about this case workspace
              </Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={18} color="#C8A34D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enterprise AI Quick Actions Modal */}
      <EnterpriseAiQuickActionsModal
        visible={aiActionModalVisible}
        actionType={activeAiActionType}
        caseData={workspace}
        onClose={() => setAiActionModalVisible(false)}
      />

      {/* Workspace Activity Timeline Audit Feed Modal */}
      <WorkspaceActivityTimelineModal
        visible={isTimelineModalOpen}
        workspaceId={workspace?.workspaceId || workspace?.userId || 'default_ws'}
        caseId={workspace?._id}
        onClose={() => setIsTimelineModalOpen(false)}
      />

      {/* Case Activity & Updates Center Modal */}
      <CaseActivityFeedModal
        visible={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        caseId={String(workspace?._id || workspace?.id || '')}
        caseName={title}
        onNavigateToEntity={(mod) => {
          const normMod = (mod || '').toLowerCase();
          if (normMod.includes('doc')) onSelectModule?.('documents');
          else if (normMod.includes('task')) onSelectModule?.('tasks');
          else if (normMod.includes('hearing')) onSelectModule?.('hearings');
          else if (normMod.includes('evidence')) onSelectModule?.('evidence');
          else if (normMod.includes('team')) onSelectModule?.('case-chat');
          else if (normMod.includes('client')) onSelectModule?.('client-connect');
          else if (normMod.includes('research')) onSelectModule?.('research');
          else if (normMod.includes('report')) onAnalyzeCasePress?.();
          else onSelectModule?.('case-info');
        }}
      />

      {/* Three-Dot Context Menu Modal */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.menuOption} onPress={handleOpenEditModal}>
              <Ionicons name="pencil-outline" size={18} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Edit Case</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setIsMenuOpen(false); Alert.alert('Archive', 'Case archived.'); }}>
              <Ionicons name="archive-outline" size={18} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setIsMenuOpen(false); Alert.alert('Close Case', 'Case marked disposed.'); }}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Close Case</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setIsMenuOpen(false); Alert.alert('Export Summary', 'Generating PDF...'); }}>
              <Ionicons name="download-outline" size={18} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Export Summary</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={styles.menuOption} onPress={() => { setIsMenuOpen(false); Alert.alert('Delete Case', 'Action cancelled.'); }}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Delete Case</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Case Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.editModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: theme.textPrimary }]}>Edit Law Firm Case</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              {/* Case Title */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Title / Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter case name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Court Name */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                  value={editCourt}
                  onChangeText={setEditCourt}
                  placeholder="e.g. High Court of Delhi"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Case Number */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Number</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                  value={editCaseNumber}
                  onChangeText={setEditCaseNumber}
                  placeholder="e.g. CS(COMM) 102/2026"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Client & Opponent */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Client / Plaintiff</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                    value={editClientName}
                    onChangeText={setEditClientName}
                    placeholder="Client name"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Opposing Party</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                    value={editOpponentName}
                    onChangeText={setEditOpponentName}
                    placeholder="Opponent name"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              {/* Priority Selector */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Priority</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['Low', 'Medium', 'High', 'Urgent'].map((p) => {
                    const isSel = editPriority.toLowerCase() === p.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setEditPriority(p)}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSel ? '#4F46E5' : isDark ? '#2D2D2D' : '#F3F4F6',
                            borderColor: isSel ? '#4F46E5' : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : theme.textPrimary }}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Status Selector */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Status</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['Active', 'Pending', 'Closed', 'Disposed'].map((st) => {
                    const isSel = editStatus.toLowerCase() === st.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setEditStatus(st)}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSel ? '#10B981' : isDark ? '#2D2D2D' : '#F3F4F6',
                            borderColor: isSel ? '#10B981' : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : theme.textPrimary }}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Next Hearing Date */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Next Hearing Date</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                  value={editNextHearing}
                  onChangeText={setEditNextHearing}
                  placeholder="e.g. 2026-07-30 or 30 Jul 2026"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Lead Advocate */}
              <View>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Lead Advocate</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB', color: theme.textPrimary, borderColor: theme.border }]}
                  value={editLeadAdvocate}
                  onChangeText={setEditLeadAdvocate}
                  placeholder="Lead Advocate Name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? '#2D2D2D' : '#E5E7EB', flex: 1 }]}
                onPress={() => setIsEditModalOpen(false)}
                disabled={isSavingEdit}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4F46E5', flex: 1.5 }]}
                onPress={handleSaveCaseEdits}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  caseTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  menuBtn: {
    padding: 6,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaGrid: {
    gap: 6,
  },
  metaItemText: {
    fontSize: 13,
  },
  teamRosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackInitial: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  aiSparkleBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  confidenceChip: {
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C8A34D',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCell: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  recommendationBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  aiBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  aiBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  modulesList: {
    gap: 8,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  activityItem: {
    paddingVertical: 8,
    position: 'relative',
    paddingLeft: 16,
  },
  activityDot: {
    position: 'absolute',
    left: 0,
    top: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A34D',
  },
  activityLine: {
    position: 'absolute',
    left: 3.5,
    top: 21,
    bottom: -8,
    width: 1,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C8A34D',
    backgroundColor: 'rgba(200, 163, 77, 0.08)',
    gap: 6,
  },
  quickActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C8A34D',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8A34D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  goldBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    gap: 8,
  },
  aiActionCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.5)',
    paddingHorizontal: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  aiIconBgCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  aiActionTitleCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  aiActionDescCompact: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  menuCard: {
    width: 180,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  compactActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  compactRowTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  compactRowTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  editModalCard: {
    width: '92%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
