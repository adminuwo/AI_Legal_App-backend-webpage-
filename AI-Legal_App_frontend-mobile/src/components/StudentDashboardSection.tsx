import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Shadows } from '@/theme';
import { useUserStore } from '@/store/user';
import { useSubscriptionStore } from '@/store/subscription';
import { useCasesStore } from '@/store/cases';

interface StudentDashboardSectionProps {
  theme: any;
  isDark: boolean;
}

export const StudentDashboardSection: React.FC<StudentDashboardSectionProps> = ({
  theme,
  isDark,
}) => {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const subCases = useSubscriptionStore((s) => s.cases);
  const subFeatures = useSubscriptionStore((s) => s.features);
  const cases = useCasesStore((s) => s.cases);

  // Dynamic user metrics calculation
  const totalCasesUsed = subCases?.used ?? cases.length ?? 0;
  const totalCasesLimit = subCases?.limit ?? 3;

  const draftUsed = subFeatures?.draft_maker?.used ?? 0;
  const draftLimit = subFeatures?.draft_maker?.limit ?? 2;

  const researchUsed = subFeatures?.legal_precedent?.used ?? 0;
  const researchLimit = subFeatures?.legal_precedent?.limit ?? 2;

  const totalUsed = draftUsed + researchUsed;
  const totalLimit = draftLimit + researchLimit;
  const progressPercent = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;

  // Streak calculation based on profile created date or default
  const createdDate = profile?.createdAt ? new Date(profile.createdAt) : new Date();
  const daysActive = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <View style={styles.container}>
      {/* 1. Dashboard Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Today's Learning
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Your daily AI study hub & exam prep progress
        </Text>
      </View>

      {/* 2. Card Row 1: Study Progress & Study Streak (Equal Width, Responsive) */}
      <View style={styles.twoColumnRow}>
        {/* Study Progress Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: '#C8A34D18' }]}>
              <Ionicons name="bar-chart-outline" size={16} color="#C8A34D" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              Study Progress
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Completed:
            </Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {`${totalUsed} / ${totalLimit}`}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
              Matters:
            </Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {`${totalCasesUsed} / ${totalCasesLimit}`}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={[styles.progressHint, { color: theme.textMuted }]}>
            {`Usage Goal: ${progressPercent}%`}
          </Text>
        </View>

        {/* Study Streak Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            Shadows.sm,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18 }}>🔥</Text>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              Study Streak
            </Text>
          </View>
          <Text style={[styles.streakNumber, { color: '#F59E0B' }]}>
            {`${daysActive} Days`}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            {`Active Member`}
          </Text>
          <View
            style={[
              styles.streakMotivationBadge,
              { backgroundColor: isDark ? '#374151' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.motivationText,
                { color: isDark ? '#F3F4F6' : '#92400E' },
              ]}
              numberOfLines={1}
            >
              Great momentum!
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Continue Learning Card */}
      <View
        style={[
          styles.continueCard,
          { backgroundColor: isDark ? '#262010' : '#FFFDF5', borderColor: '#C8A34D' },
          Shadows.sm,
        ]}
      >
        <View style={styles.continueHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.continueBadge, { color: '#C8A34D' }]}>
              CONTINUE LEARNING
            </Text>
            <Text style={[styles.continueTitle, { color: theme.textPrimary }]}>
              Bharatiya Nyaya Sanhita (BNS) 2023
            </Text>
            <Text style={[styles.continueSub, { color: theme.textSecondary }]}>
              Key differences from IPC & Crimes Against Body • 48% Completed
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '48%', backgroundColor: '#C8A34D' }]} />
        </View>
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={() => router.push('/tools/notes-maker' as any)}
        >
          <Text style={styles.resumeBtnText}>Resume Study →</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Quick Learning Actions (Only AI Notes Workspace & Quiz Practice) */}
      <Text style={[styles.sectionTitleSmall, { color: theme.textPrimary }]}>
        Quick Learning Actions
      </Text>
      <View style={styles.actionsGrid}>
        {[
          {
            title: 'AI Notes Workspace',
            icon: 'document-text-outline',
            route: '/tools/notes-maker',
            color: '#C8A34D',
          },
          {
            title: 'Quiz Practice',
            icon: 'hardware-chip-outline',
            route: '/tools/quiz-practice',
            color: '#10B981',
          },
        ].map((act, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.actionItem,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => router.push(act.route as any)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${act.color}18` }]}>
              <Ionicons name={act.icon as any} size={20} color={act.color} />
            </View>
            <Text style={[styles.actionText, { color: theme.textPrimary }]} numberOfLines={1}>
              {act.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 5. Today's Challenge */}
      <Text style={[styles.sectionTitleSmall, { color: theme.textPrimary, marginTop: 18 }]}>
        Today's Challenge
      </Text>
      <View style={{ gap: 10, marginTop: 6 }}>
        {[
          {
            tag: 'DAILY QUIZ',
            title: '5 Questions on Constitutional Law & Fundamental Rights',
            route: '/tools/quiz-practice',
            icon: 'checkmark-circle-outline',
            color: '#10B981',
          },
          {
            tag: 'BARE ACT SUMMARY',
            title: 'Section 302 IPC vs Section 103 BNS Murder Rulings',
            route: '/tools/knowledge-hub',
            icon: 'document-text-outline',
            color: '#C8A34D',
          },
          {
            tag: 'LANDMARK JUDGMENT',
            title: 'Kesavananda Bharati v. State of Kerala (Basic Structure Ratio)',
            route: '/tools/legal-precedents',
            icon: 'ribbon-outline',
            color: '#3B82F6',
          },
        ].map((ch, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.challengeCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => router.push(ch.route as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: `${ch.color}18` }]}>
              <Ionicons name={ch.icon as any} size={18} color={ch.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeTag, { color: ch.color }]}>{ch.tag}</Text>
              <Text style={[styles.challengeTitle, { color: theme.textPrimary }]}>
                {ch.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* 6. Learning Analytics (Responsive 2-Row Grid) */}
      <Text style={[styles.sectionTitleSmall, { color: theme.textPrimary, marginTop: 18 }]}>
        Learning Analytics
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <View style={styles.twoColumnRow}>
          <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Tool Usage Progress</Text>
            <Text style={[styles.analyticsValue, { color: '#10B981' }]}>{`${progressPercent}%`}</Text>
            <Text style={[styles.analyticsSub, { color: theme.textMuted }]}>Plan Quota Active</Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Active Matters</Text>
            <Text style={[styles.analyticsValue, { color: '#F59E0B' }]}>{`${totalCasesUsed} Saved`}</Text>
            <Text style={[styles.analyticsSub, { color: theme.textMuted }]}>{`Limit: ${totalCasesLimit}`}</Text>
          </View>
        </View>
        <View style={styles.twoColumnRow}>
          <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Precedent Research</Text>
            <Text style={[styles.analyticsValue, { color: '#3B82F6', fontSize: 15 }]} numberOfLines={1}>{`${researchUsed} / ${researchLimit} Used`}</Text>
            <Text style={[styles.analyticsSub, { color: theme.textMuted }]}>AI Legal Research</Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Hours Studied</Text>
            <Text style={[styles.analyticsValue, { color: '#C8A34D' }]}>{`${(totalUsed * 1.5 + (daysActive * 0.5)).toFixed(1)} hrs`}</Text>
            <Text style={[styles.analyticsSub, { color: theme.textMuted }]}>Calculated Activity</Text>
          </View>
        </View>
      </View>

      {/* 7. AI Recommended Topics */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border, marginTop: 16, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
          AI Recommended Topics Today
        </Text>
        {[
          '• Article 21 (Personal Liberty & Landmark Rulings)',
          '• BNS Theft & Extortion Section Changes',
          '• Indian Contract Act 1872 Void Agreements',
          '• Basic Structure Doctrine Ratios',
        ].map((rec, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => router.push('/tools/notes-maker' as any)}
            style={{ paddingVertical: 6 }}
          >
            <Text style={[styles.recText, { color: theme.textSecondary }]}>{rec}</Text>
          </TouchableOpacity>
        ))}
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
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressHint: {
    fontSize: 10,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  streakMotivationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  motivationText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  continueCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  continueHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  continueBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  continueTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginTop: 2,
  },
  continueSub: {
    fontSize: 11,
    marginTop: 2,
  },
  resumeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#C8A34D',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  actionItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  challengeTag: {
    fontSize: 9,
    fontWeight: '800',
  },
  challengeTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  analyticsCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  analyticsLabel: {
    fontSize: 11,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  analyticsSub: {
    fontSize: 10,
    marginTop: 2,
  },
  recText: {
    fontSize: 12,
  },
});
