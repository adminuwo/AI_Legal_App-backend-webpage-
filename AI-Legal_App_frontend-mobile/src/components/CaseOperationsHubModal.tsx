import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { CaseWorkspace } from '@/types';
import { Shadows } from '@/theme';
import { FirmTeamDirectoryModal } from './FirmTeamDirectoryModal';

interface CaseOperationsHubModalProps {
  visible: boolean;
  onClose: () => void;
  cases: CaseWorkspace[];
  onLaunchCreateCase: () => void;
  onLaunchAssignTeam: () => void;
  onLaunchScheduleHearing: () => void;
  onLaunchCreateTask: () => void;
  onLaunchShareDocument: () => void;
  onLaunchInviteTeam?: () => void;
}

export const CaseOperationsHubModal: React.FC<CaseOperationsHubModalProps> = ({
  visible,
  onClose,
  cases = [],
  onLaunchCreateCase,
  onLaunchAssignTeam,
  onLaunchScheduleHearing,
  onLaunchCreateTask,
  onLaunchShareDocument,
  onLaunchInviteTeam,
}) => {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { members, teamStats } = useWorkspaceContext();
  const insets = useSafeAreaInsets();

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecentCases = useMemo(() => {
    if (!searchQuery.trim()) return cases.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.clientName?.toLowerCase().includes(q) ||
        c.courtName?.toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  const handleSmartCheckAction = (actionName: string, launcher?: () => void, requireCase = false) => {
    if (!launcher) return;
    if (requireCase && cases.length === 0) {
      Alert.alert(
        'No Cases Available',
        `You must create a case before using ${actionName}. Would you like to create a new case now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Case Now',
            onPress: () => {
              onClose();
              onLaunchCreateCase();
            },
          },
        ]
      );
      return;
    }
    onClose();
    launcher();
  };

  const actionCardsList = [
    {
      id: 'create_case',
      icon: 'folder-open-outline',
      title: 'Create New Case',
      description: 'Create a new legal case, assign advocates, link clients and initialize the AI workspace.',
      badge: 'Step Wizard',
      action: () => handleSmartCheckAction('Create New Case', onLaunchCreateCase, false),
    },
    {
      id: 'invite_team',
      icon: 'person-add-outline',
      title: 'Invite Team Member',
      description: 'Invite advocates and legal staff to join your firm’s AI LEGAL workspace.',
      badge: 'Firm Roster',
      action: () => handleSmartCheckAction('Invite Team Member', onLaunchInviteTeam, false),
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Full-Page Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Case Operations</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              Choose what you'd like to do with your firm's legal cases.
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Dynamic Firm Team Members Summary Card (Clickable) */}
          <TouchableOpacity
            style={[styles.teamSummaryCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.sm]}
            onPress={() => setIsDirectoryOpen(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="people" size={22} color="#C8A34D" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>Firm Team Members</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#C8A34D' }}>View Directory →</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary }}>{teamStats?.totalMembers || members?.length || 1}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>Total Members</Text>
              </View>
              <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>{teamStats?.activeMembers || members?.length || 1}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>Active</Text>
              </View>
              <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B' }}>{teamStats?.pendingInvitations || 0}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>Pending Invites</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 5 Enterprise Action Cards */}
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Case Operations Modules</Text>

          <View style={{ gap: 12 }}>
            {actionCardsList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}
                onPress={item.action}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? '#374151' : '#FFFBEB' }]}>
                    <Ionicons name={item.icon as any} size={24} color="#C8A34D" />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#C8A34D' }}>{item.badge}</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.description}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#C8A34D" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Cases Shortcuts */}
          {cases.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Recent Active Cases</Text>
              <View style={{ gap: 10, marginTop: 8 }}>
                {filteredRecentCases.map((c) => (
                  <TouchableOpacity
                    key={c._id || c.id}
                    style={[styles.recentCaseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => {
                      onClose();
                      router.push(`/workspace/${c._id || c.id}` as any);
                    }}
                  >
                    <Ionicons name="folder-open-outline" size={20} color="#C8A34D" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentCaseName, { color: theme.textPrimary }]}>{c.name}</Text>
                      <Text style={[styles.recentCaseSub, { color: theme.textSecondary }]}>
                        {c.courtName || 'High Court'} • Client: {c.clientName || 'Private Client'}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <FirmTeamDirectoryModal
          visible={isDirectoryOpen}
          onClose={() => setIsDirectoryOpen(false)}
          onLaunchInviteTeam={onLaunchInviteTeam}
        />
      </KeyboardAvoidingView>
    </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  aiCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  actionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8A34D',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentCaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentCaseName: {
    fontSize: 13,
    fontWeight: '700',
  },
  recentCaseSub: {
    fontSize: 11,
    marginTop: 2,
  },
  teamSummaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
});
