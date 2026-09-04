import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Shadows } from '@/theme';
import { CaseWorkspace } from '@/types';
import { useWorkspaceContext } from '@/providers';

interface LawFirmDashboardSectionProps {
  theme: any;
  isDark: boolean;
  cases?: CaseWorkspace[];
}

export const LawFirmDashboardSection: React.FC<LawFirmDashboardSectionProps> = ({
  theme,
  isDark,
  cases = [],
}) => {
  const router = useRouter();
  const { members: firmMembers, teamStats, activeWorkspace } = useWorkspaceContext();

  const totalActiveCases = cases.filter((c) => c.status === 'Active' || !c.status).length;
  
  const todaysHearingsCount = cases.reduce((acc, c) => {
    if (!c.hearings) return acc;
    const todayStr = new Date().toISOString().split('T')[0];
    const match = c.hearings.filter((h) => h.date && h.date.includes(todayStr));
    return acc + match.length;
  }, 0);

  const pendingDraftsCount = cases.reduce((acc, c) => acc + (c.drafts?.filter((d: any) => d.status === 'Draft' || d.status === 'In Progress').length || 0), 0);
  const pendingEvidenceCount = cases.reduce((acc, c) => acc + (c.evidence?.filter((e: any) => e.status === 'Pending' || e.status === 'Not Verified').length || 0), 0);
  const totalPendingReviews = pendingDraftsCount + pendingEvidenceCount;

  const liveTotalMembers = teamStats?.totalMembers || firmMembers?.length || 1;
  const liveActiveMembers = teamStats?.activeMembers || firmMembers?.filter((m) => m.status === 'Active' || m.status === 'Accepted').length || 1;
  const livePendingInvs = teamStats?.pendingInvitations || 0;

  const renderAiBriefText = () => {
    if (totalActiveCases === 0 && todaysHearingsCount === 0 && totalPendingReviews === 0) {
      return `Welcome to your new Law Firm Workspace.\nCreate your first case, invite team members, and start managing your firm's legal operations.`;
    }

    const bullets = [];
    bullets.push(todaysHearingsCount > 0 ? `• ${todaysHearingsCount} court hearings scheduled today.` : '• No urgent court hearings scheduled today.');
    if (totalPendingReviews > 0) {
      bullets.push(`• ${totalPendingReviews} draft & evidence items awaiting review.`);
    } else {
      bullets.push('• All draft and evidence reviews up to date.');
    }
    if (totalActiveCases > 0) {
      bullets.push(`• ${totalActiveCases} active firm cases currently in progress.`);
    }

    return bullets.join('\n');
  };

  const liveActivityList = useMemo(() => {
    const list: Array<{ name: string; action: string; time: string }> = [];
    if (cases && cases.length > 0) {
      cases.slice(0, 3).forEach((c, idx) => {
        list.push({
          name: (c as any).leadAdvocate || 'Advocate',
          action: `Active Case Docket: ${c.name || 'Matter'}`,
          time: idx === 0 ? 'Recently' : `${(idx + 1) * 20} mins ago`,
        });
      });
    } else if (firmMembers && firmMembers.length > 0) {
      firmMembers.slice(0, 3).forEach((m, idx) => {
        list.push({
          name: m.name || m.fullName,
          action: m.isOwner ? 'Workspace Owner Active' : `Joined ${activeWorkspace?.name || 'Firm Workspace'}`,
          time: idx === 0 ? 'Recently' : 'Today',
        });
      });
    }
    return list;
  }, [cases, firmMembers, activeWorkspace]);

  return (
    <View style={styles.container}>
      {/* 1. Dashboard Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Firm Overview
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Multi-advocate case pipeline & team collaboration metrics
        </Text>
      </View>

      {/* 2. Row 1: Active Cases & Today's Hearings */}
      <View style={styles.twoColumnRow}>
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
          onPress={() => router.push('/(tabs)/cases')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: '#C8A34D18' }]}>
              <Ionicons name="briefcase-outline" size={18} color="#C8A34D" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Active Firm Cases
            </Text>
          </View>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {totalActiveCases}
          </Text>
          <Text style={[styles.statSub, { color: theme.textSecondary }]}>
            {totalActiveCases} Live dockets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
          onPress={() => router.push('/(tabs)/cases')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: '#C8A34D18' }]}>
              <Ionicons name="calendar-outline" size={18} color="#C8A34D" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Today's Hearings
            </Text>
          </View>
          <Text style={[styles.statValue, { color: todaysHearingsCount > 0 ? '#EF4444' : theme.textPrimary }]}>
            {todaysHearingsCount}
          </Text>
          <Text style={[styles.statSub, { color: theme.textSecondary }]}>
            {todaysHearingsCount > 0 ? 'Court appearances today' : 'Nothing scheduled today'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Row 2: Pending Reviews & Team Members */}
      <View style={styles.twoColumnRow}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="clipboard-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Pending Reviews
            </Text>
          </View>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {totalPendingReviews}
          </Text>
          <Text style={[styles.statSub, { color: theme.textSecondary }]}>
            {totalPendingReviews > 0
              ? `${pendingDraftsCount} Drafts • ${pendingEvidenceCount} Evidence`
              : 'No pending reviews'}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="people-outline" size={18} color="#10B981" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Team Members
            </Text>
          </View>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {liveTotalMembers}
          </Text>
          <Text style={[styles.statSub, { color: theme.textSecondary }]}>
            {liveActiveMembers} Active • {livePendingInvs} Pending
          </Text>
        </View>
      </View>

      {/* 4. AI Firm Summary (Daily AI Brief) */}
      <View
        style={[
          styles.briefCard,
          { backgroundColor: isDark ? '#262010' : '#FFFDF5', borderColor: '#C8A34D' },
          Shadows.sm,
        ]}
      >
        <View style={styles.briefHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#C8A34D18' }]}>
            <Ionicons name="sparkles" size={18} color="#C8A34D" />
          </View>
          <Text style={[styles.briefTitle, { color: theme.textPrimary }]}>
            Daily AI Firm Executive Brief
          </Text>
        </View>
        <Text style={[styles.briefText, { color: theme.textSecondary }]}>
          {renderAiBriefText()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '800',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 10,
  },
  briefCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  briefTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  briefText: {
    fontSize: 12,
    lineHeight: 18,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  feedName: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedAction: {
    fontSize: 11,
  },
  feedTime: {
    fontSize: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  actionItem: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  docketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  docketLawyer: {
    fontSize: 12,
    fontWeight: '700',
  },
  docketCourt: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  perfLawyer: {
    fontSize: 12,
    fontWeight: '700',
  },
  perfSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
