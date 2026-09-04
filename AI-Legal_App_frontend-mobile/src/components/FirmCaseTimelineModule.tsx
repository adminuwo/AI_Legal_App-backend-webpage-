import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { Shadows } from '@/theme';

export const FirmCaseTimelineModule: React.FC = () => {
  const { theme, isDark } = useThemeContext();

  const timelineEvents = [
    { id: '1', user: 'Adv. Rajesh Sharma', action: 'Uploaded Evidence_Report.pdf', time: 'Today, 11:30 AM', icon: 'document-text' },
    { id: '2', user: 'Adv. Priya Sharma', action: 'Scheduled Court Hearing for 28 July', time: 'Yesterday, 3:15 PM', icon: 'calendar' },
    { id: '3', user: 'Adv. Rahul Verma', action: 'Completed Written Draft Review', time: '20 Jul, 5:00 PM', icon: 'checkmark-circle' },
    { id: '4', user: 'Adv. Rajesh Sharma', action: 'Assigned Adv. Amit Kumar to Case Team', time: '18 Jul, 10:00 AM', icon: 'person-add' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
      <View style={styles.titleRow}>
        <Ionicons name="time-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Case Timeline ⭐</Text>
      </View>
      <Text style={[styles.subText, { color: theme.textSecondary }]}>
        Automated activity log of team actions, document uploads & docket updates.
      </Text>

      <View style={{ gap: 10, marginTop: 8 }}>
        {timelineEvents.map((evt, idx) => (
          <View key={evt.id} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={styles.timelineCol}>
              <View style={[styles.iconDot, { backgroundColor: 'rgba(200, 163, 77, 0.2)' }]}>
                <Ionicons name={evt.icon as any} size={12} color="#C8A34D" />
              </View>
              {idx < timelineEvents.length - 1 && <View style={[styles.line, { backgroundColor: theme.border }]} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.textPrimary }}>{evt.action}</Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                By <Text style={{ fontWeight: '700' }}>{evt.user}</Text> • {evt.time}
              </Text>
            </View>
          </View>
        ))}
      </View>
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
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subText: {
    fontSize: 10.5,
    marginBottom: 8,
  },
  timelineCol: {
    alignItems: 'center',
    width: 20,
  },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    height: 24,
    marginTop: 2,
  },
});
