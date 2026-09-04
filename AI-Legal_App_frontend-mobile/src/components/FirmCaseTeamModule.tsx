import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { Shadows } from '@/theme';

interface FirmCaseTeamModuleProps {
  leadAdvocate?: { name: string; designation: string };
  teamMembers?: Array<{ id: string; name: string; role: string; designation: string }>;
  onAssignTeamPress?: () => void;
}

export const FirmCaseTeamModule: React.FC<FirmCaseTeamModuleProps> = ({
  leadAdvocate = { name: 'Assigned Lead Advocate', designation: 'Senior Advocate' },
  teamMembers = [
    { id: '1', name: 'Adv. Priya Sharma', role: 'Associate Advocate', designation: 'Co-Counsel' },
    { id: '2', name: 'Adv. Amit Kumar', role: 'Junior Advocate', designation: 'Legal Researcher' },
    { id: '3', name: 'Adv. Rahul Verma', role: 'Junior Advocate', designation: 'Drafting Lead' },
    { id: '4', name: 'Aman Kumar', role: 'Paralegal', designation: 'Evidence Clerk' },
  ],
  onAssignTeamPress,
}) => {
  const { theme, isDark } = useThemeContext();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
      {/* Module Title */}
      <View style={styles.titleRow}>
        <Ionicons name="people" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Case Team & Assigned Lawyers ⭐</Text>
      </View>

      {/* Lead Advocate Card */}
      <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Lead Advocate</Text>
      <View style={[styles.leadCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
        <View style={styles.avatarPill}>
          <Text style={styles.avatarText}>👨‍⚖️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leadName, { color: isDark ? '#F9FAFB' : '#92400E' }]}>{leadAdvocate.name}</Text>
          <Text style={[styles.leadDesignation, { color: theme.textSecondary }]}>{leadAdvocate.designation}</Text>
        </View>
        <View style={styles.badgePill}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#C8A34D' }}>Lead Counsel</Text>
        </View>
      </View>

      {/* Assigned Roster */}
      <Text style={[styles.subLabel, { color: theme.textSecondary, marginTop: 12 }]}>Assigned Team Members ({teamMembers.length})</Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {teamMembers.map((m) => (
          <View key={m.id} style={[styles.memberRow, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
            <View style={styles.memberAvatar}>
              <Ionicons name="person-outline" size={14} color="#C8A34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: theme.textPrimary }]}>{m.name}</Text>
              <Text style={[styles.memberRole, { color: theme.textSecondary }]}>{m.role} • {m.designation}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action Trigger */}
      <TouchableOpacity
        style={[styles.assignBtn, { backgroundColor: '#C8A34D' }]}
        onPress={onAssignTeamPress}
      >
        <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.assignBtnText}>+ Assign Team Member</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 163, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
  },
  leadName: {
    fontSize: 13,
    fontWeight: '800',
  },
  leadDesignation: {
    fontSize: 10.5,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 10,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    marginTop: 12,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
