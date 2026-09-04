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
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shadows } from '@/theme';

export default function CaseAssignmentScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [outputLanguage, setOutputLanguage] = useState('English');
  const [selectedCase, setSelectedCase] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('@ai_tool_lang_case-assignment').then((val) => {
      if (val) setOutputLanguage(val);
    }).catch(() => {});
  }, []);


  // Mock Team Workload
  const teamWorkload = [
    { name: 'Adv. Rajesh Sharma', role: 'Managing Partner', active: 14, capacity: 'High', spec: 'Corporate & Arbitration' },
    { name: 'Adv. Meera Nair', role: 'Senior Advocate', active: 10, capacity: 'Medium', spec: 'Civil & Constitutional' },
    { name: 'Adv. Rahul Verma', role: 'Junior Advocate', active: 6, capacity: 'Available', spec: 'Criminal & Bail' },
    { name: 'Priya Sharma', role: 'Associate', active: 5, capacity: 'Available', spec: 'IP & Contracts' },
  ];

  const handleGenerateAssignment = (customPrompt?: string) => {
    const input = customPrompt || promptInput || selectedCase || 'Property Dispute Case';
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setRecommendation({
        caseTitle: input,
        primaryAdvocate: 'Adv. Meera Nair (Senior Advocate)',
        leadJunior: 'Adv. Rahul Verma (Junior Advocate)',
        paralegalAssigned: 'Aman Kumar',
        conflictStatus: '✓ No Conflict Detected (Checked against 140 firm clients)',
        recommendedDeadline: 'Jul 26, 2026 (5 Days)',
        workloadBalanceScore: '94% Optimal Distribution',
        rationale: 'Adv. Meera Nair has a 92% win rate in Civil Property Writ Petitions. Adv. Rahul Verma currently has the lowest pending task queue (6 active cases) and can assist in drafting petition within 48 hours.',
      });
      showToast('success', 'AI Recommendation Ready', 'Workload & conflict analysis complete.');
    }, 1200);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title="AI Case Assignment"
        subtitle="Intelligently distribute litigation matters across your firm"
        showBack={true}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <OutputLanguageSelector
            toolId="case-assignment"
            selectedLanguage={outputLanguage}
            onLanguageChange={setOutputLanguage}
            containerStyle={{ marginBottom: 10, alignSelf: 'flex-end' }}
          />
          {/* Header Banner */}
          <View style={[styles.banner, { backgroundColor: isDark ? '#262010' : '#FFFDF5', borderColor: '#C8A34D' }]}>
            <Ionicons name="git-network-outline" size={24} color="#C8A34D" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: theme.textPrimary }]}>Workload & Conflict Balancing Engine</Text>
              <Text style={[styles.bannerSub, { color: theme.textSecondary }]}>
                Matches matter complexity, lawyer specialization, current active load & firm conflict check.
              </Text>
            </View>
          </View>

          {/* Quick Action Prompts */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Assignment Prompts</Text>
          <View style={styles.promptRow}>
            {[
              'Assign this property dispute.',
              'Recommend best advocate.',
              'Find available junior.',
            ].map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.promptChip, { backgroundColor: isDark ? '#222228' : '#F3F4F6', borderColor: theme.border }]}
                onPress={() => {
                  setPromptInput(prompt);
                  handleGenerateAssignment(prompt);
                }}
              >
                <Text style={[styles.promptText, { color: theme.textPrimary }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Form */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Matter Title or Description</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
              placeholder="e.g. High Court Writ Petition for Apex Logistics v. Customs..."
              placeholderTextColor={theme.placeholder}
              value={promptInput}
              onChangeText={setPromptInput}
            />

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => handleGenerateAssignment()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Analyze & Assign Matter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Output AI Recommendation Card */}
          {recommendation ? (
            <View style={[styles.recommendCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.sm]}>
              <View style={styles.recHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.recTitle, { color: theme.textPrimary }]}>AI Assignment Plan</Text>
                <View style={[styles.badge, { backgroundColor: '#10B98118' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>{recommendation.workloadBalanceScore}</Text>
                </View>
              </View>

              <Text style={[styles.caseName, { color: theme.textPrimary }]}>{recommendation.caseTitle}</Text>

              <View style={styles.recGrid}>
                <View style={styles.recItem}>
                  <Text style={[styles.recLabel, { color: theme.textSecondary }]}>Primary Lead Advocate</Text>
                  <Text style={[styles.recVal, { color: theme.textPrimary }]}>{recommendation.primaryAdvocate}</Text>
                </View>
                <View style={styles.recItem}>
                  <Text style={[styles.recLabel, { color: theme.textSecondary }]}>Assigned Junior Advocate</Text>
                  <Text style={[styles.recVal, { color: theme.textPrimary }]}>{recommendation.leadJunior}</Text>
                </View>
                <View style={styles.recItem}>
                  <Text style={[styles.recLabel, { color: theme.textSecondary }]}>Conflict Status</Text>
                  <Text style={[styles.recVal, { color: '#10B981' }]}>{recommendation.conflictStatus}</Text>
                </View>
                <View style={styles.recItem}>
                  <Text style={[styles.recLabel, { color: theme.textSecondary }]}>Suggested Filing Target</Text>
                  <Text style={[styles.recVal, { color: theme.textPrimary }]}>{recommendation.recommendedDeadline}</Text>
                </View>
              </View>

              <Text style={[styles.rationaleTitle, { color: theme.textPrimary }]}>AI Rationale & Capability Match:</Text>
              <Text style={[styles.rationaleText, { color: theme.textSecondary }]}>{recommendation.rationale}</Text>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  showToast('success', 'Case Assigned', 'Matter assigned to Adv. Meera Nair & Rahul Verma.');
                }}
              >
                <Text style={styles.confirmBtnText}>Confirm Case Assignment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Empty State */
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="people-outline" size={40} color="#C8A34D" style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No assignments yet.</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Use AI to intelligently distribute work among your legal team.
              </Text>
            </View>
          )}

          {/* Current Team Availability Roster */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>Live Team Workload Roster</Text>
          <View style={{ gap: 8 }}>
            {teamWorkload.map((m, idx) => (
              <View key={idx} style={[styles.rosterCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rosterName, { color: theme.textPrimary }]}>{m.name}</Text>
                  <Text style={[styles.rosterRole, { color: theme.textSecondary }]}>{m.role} • Spec: {m.spec}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: m.capacity === 'Available' ? '#10B981' : '#F59E0B' }}>
                    {m.active} Active Cases
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>{m.capacity}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800' },
  bannerSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  promptChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  promptText: { fontSize: 11, fontWeight: '600' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 12, marginBottom: 12 },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 44, borderRadius: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySub: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  recommendCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 16 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  caseName: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  recGrid: { gap: 8, marginBottom: 12 },
  recItem: { flexDirection: 'row', justifyContent: 'space-between' },
  recLabel: { fontSize: 11.5 },
  recVal: { fontSize: 11.5, fontWeight: '700' },
  rationaleTitle: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  rationaleText: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  confirmBtn: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  rosterCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  rosterName: { fontSize: 12.5, fontWeight: '800' },
  rosterRole: { fontSize: 10.5, marginTop: 2 },
});
