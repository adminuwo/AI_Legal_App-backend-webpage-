import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { PageHeader } from '@/components/ui';
import { Shadows } from '@/theme';

import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MeetingAssistantScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [outputLanguage, setOutputLanguage] = useState('English');
  const [notesInput, setNotesInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<any>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('@ai_tool_lang_meeting-assistant').then((val) => {
      if (val) setOutputLanguage(val);
    }).catch(() => {});
  }, []);


  const handleSummarize = (customAction?: string) => {
    const rawNotes = notesInput || 'Partner strategy meeting regarding High Court Writ & Senior Counsel fees...';
    setIsSummarizing(true);

    setTimeout(() => {
      setIsSummarizing(false);
      setMeetingSummary({
        topic: customAction ? `${customAction} - Firm Strategy Session` : 'Litigation & Partner Strategy Session',
        date: 'Jul 20, 2026',
        attendees: 'Adv. Rajesh Sharma, Adv. Meera Nair, Adv. Rahul Verma',
        keyDecisions: [
          'File urgent stay application in High Court by Thursday.',
          'Approved hiring expert forensic accountant for Apex Logistics audit.',
        ],
        actionItems: [
          { task: 'Prepare Writ Petition draft', assignedTo: 'Adv. Rahul Verma', due: 'Tomorrow 5 PM' },
          { task: 'Collect VAT invoice proofs', assignedTo: 'Priya Sharma (Associate)', due: 'Jul 22' },
          { task: 'Coordinate with Senior Advocate Mr. Sethi', assignedTo: 'Adv. Rajesh Sharma', due: 'Jul 23' },
        ],
        nextMeeting: 'Friday, Jul 24, 2026 at 04:00 PM',
      });
      showToast('success', 'MOM Generated', 'Meeting Minutes & Action Items extracted.');
    }, 1100);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title="AI Meeting Assistant"
        subtitle="Automate internal meeting minutes (MOM), action items & task assignment"
        showBack={true}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <OutputLanguageSelector
            toolId="meeting-assistant"
            selectedLanguage={outputLanguage}
            onLanguageChange={setOutputLanguage}
            containerStyle={{ marginBottom: 10, alignSelf: 'flex-end' }}
          />
          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>
          <View style={styles.chipRow}>
            {['Summarize Meeting', 'Generate MOM', 'Assign Tasks', 'Create Follow-ups'].map((act, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionChip, { backgroundColor: isDark ? '#222228' : '#F3F4F6', borderColor: theme.border }]}
                onPress={() => handleSummarize(act)}
              >
                <Text style={[styles.actionChipText, { color: theme.textPrimary }]}>{act}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transcript or Notes Input Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Paste Meeting Discussion Notes / Audio Transcript</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
              placeholder="Paste raw discussion notes, key points spoken in meeting..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={4}
              value={notesInput}
              onChangeText={setNotesInput}
            />

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => handleSummarize()}
              disabled={isSummarizing}
            >
              {isSummarizing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Generate MOM & Assign Tasks</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Generated Result */}
          {meetingSummary ? (
            <View style={[styles.outputCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.sm]}>
              <View style={styles.outputHeader}>
                <Ionicons name="journal-outline" size={18} color="#C8A34D" />
                <Text style={[styles.outputTitle, { color: theme.textPrimary }]}>Minutes of Meeting (MOM)</Text>
              </View>

              <Text style={[styles.topicTitle, { color: theme.textPrimary }]}>{meetingSummary.topic}</Text>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                📅 Date: {meetingSummary.date} • Attendees: {meetingSummary.attendees}
              </Text>

              {/* Key Decisions */}
              <Text style={[styles.subHead, { color: theme.textPrimary }]}>🎯 Key Decisions Made:</Text>
              {meetingSummary.keyDecisions.map((dec: string, idx: number) => (
                <Text key={idx} style={[styles.bullet, { color: theme.textSecondary }]}>
                  • {dec}
                </Text>
              ))}

              {/* Action Items */}
              <Text style={[styles.subHead, { color: theme.textPrimary, marginTop: 12 }]}>✅ Action Items & Assigned Lawyers:</Text>
              <View style={{ gap: 6, marginTop: 4 }}>
                {meetingSummary.actionItems.map((item: any, idx: number) => (
                  <View key={idx} style={[styles.taskItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskName, { color: theme.textPrimary }]}>{item.task}</Text>
                      <Text style={[styles.taskAssigned, { color: theme.textSecondary }]}>Assigned: {item.assignedTo}</Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B' }}>Due: {item.due}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#10B981' }]}
                onPress={() => showToast('success', 'Saved to Firm Workspace', 'MOM saved to activity log.')}
              >
                <Text style={styles.saveBtnText}>Save MOM to Firm Workspace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Empty State */
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="journal-outline" size={40} color="#C8A34D" style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No meetings yet.</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                AI will summarize and organize every discussion.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  actionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  actionChipText: { fontSize: 11, fontWeight: '700' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  textArea: { height: 90, borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 12, textAlignVertical: 'top', marginBottom: 12 },
  actionBtn: { height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySub: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  outputCard: { padding: 14, borderRadius: 14, borderWidth: 1.5 },
  outputHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  outputTitle: { fontSize: 14, fontWeight: '800' },
  topicTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  metaText: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  subHead: { fontSize: 12, fontWeight: '800' },
  bullet: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1 },
  taskName: { fontSize: 11.5, fontWeight: '700' },
  taskAssigned: { fontSize: 10, marginTop: 1 },
  saveBtn: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
