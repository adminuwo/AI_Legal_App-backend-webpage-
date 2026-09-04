import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseEvidence } from '@/types';

export default function EvidenceAnalysisScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { caseId, evidenceId } = useLocalSearchParams<{
    caseId: string;
    evidenceId: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [evidence, setEvidence] = useState<CaseEvidence | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (caseId && evidenceId) {
      loadAnalysisReport();
    } else {
      setErrorMsg('Missing case or evidence parameters.');
      setIsLoading(false);
    }
  }, [caseId, evidenceId]);

  const loadAnalysisReport = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await CaseService.getCaseDetails(caseId);
      if (res.success && res.data) {
        const item = (res.data.evidence || []).find(
          (e: any) => String(e.id || e._id) === evidenceId
        );
        if (item) {
          setEvidence(item);
        } else {
          setErrorMsg('Evidence not found in this case workspace.');
        }
      } else {
        setErrorMsg(res.error || 'Failed to fetch case details.');
      }
    } catch (err: any) {
      console.error('[Evidence Analysis Load Error]', err);
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!evidence || !evidence.aiAnalysis) return;
    const analysis = evidence.aiAnalysis;
    const shareText = `EVIDENCE ANALYSIS REPORT
File Name: ${evidence.name}
Type: ${evidence.type || 'Document'}

SUMMARY:
${analysis.summary || 'N/A'}

LEGAL RELEVANCE:
${analysis.relevance || analysis.caseRelevance || 'N/A'}

POSSIBLE WEAKNESSES:
${Array.isArray(analysis.possibleWeaknesses) 
  ? analysis.possibleWeaknesses.join('\n') 
  : analysis.possibleWeaknesses || 'None identified.'}

SUGGESTED NEXT STEPS:
${Array.isArray(analysis.suggestedTimelineEvents) 
  ? analysis.suggestedTimelineEvents.map(e => `- ${e}`).join('\n')
  : 'Compare with affidavit.'}`;

    try {
      await Share.share({
        message: shareText,
        title: `Analysis Report - ${evidence.name}`,
      });
    } catch (err: any) {
      showToast('error', 'Share Failed', 'Could not open share dialogue.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Report</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
          <Text style={{ marginTop: 12, color: theme.textSecondary || '#6B7280', fontSize: 14 }}>
            Loading AI Analysis...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !evidence) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Report Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32 }}>
            {errorMsg || 'Could not load analysis report.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#111111' }]}
            onPress={loadAnalysisReport}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const analysis = evidence.aiAnalysis || {};
  const hasAnalysis = !!evidence.aiAnalysis;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            Analysis Report
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280' }} numberOfLines={1}>
            {evidence.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} disabled={!hasAnalysis}>
          <Ionicons name="share-outline" size={22} color={hasAnalysis ? '#111111' : '#D1D5DB'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasAnalysis ? (
          <View style={styles.noReportCard}>
            <Ionicons name="shield-alert-outline" size={48} color="#F59E0B" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 }}>
              No Analysis Available
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
              This evidence item has not been processed by the AI pipeline yet.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Title Block */}
            <View>
              <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
                Evidence Analysis Report
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary || '#6B7280', marginTop: 4 }}>
                Type: {evidence.type || 'Document'} • Size: {evidence.fileSize || 'Unknown'}
              </Text>
            </View>

            {/* Summary */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Summary</Text>
              <Text style={[styles.sectionBodyText, { color: theme.textPrimary }]}>
                {analysis.summary || 'No summary overview provided.'}
              </Text>
            </View>

            {/* Extracted Text (OCR) */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Extracted Text</Text>
              <View style={[styles.ocrTextBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: theme.border || '#E5E7EB' }]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  <Text style={[styles.ocrText, { color: theme.textPrimary }]}>
                    {analysis.extractedText || evidence.ocrData?.text || 'No extracted characters parsed.'}
                  </Text>
                </ScrollView>
              </View>
            </View>

            {/* Key Findings */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Key Findings</Text>
              <View style={{ gap: 8 }}>
                {analysis.entities?.people && analysis.entities.people.length > 0 && (
                  <View style={styles.findingRow}>
                    <Ionicons name="people-outline" size={16} color="#111111" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>Entities Identified: </Text>
                      {analysis.entities.people.join(', ')}
                    </Text>
                  </View>
                )}
                {analysis.entities?.dates && analysis.entities.dates.length > 0 && (
                  <View style={styles.findingRow}>
                    <Ionicons name="calendar-outline" size={16} color="#111111" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>Dates Detected: </Text>
                      {analysis.entities.dates.join(', ')}
                    </Text>
                  </View>
                )}
                {analysis.entities?.amounts && analysis.entities.amounts.length > 0 && (
                  <View style={styles.findingRow}>
                    <Ionicons name="cash-outline" size={16} color="#111111" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>Amounts Detected: </Text>
                      {analysis.entities.amounts.join(', ')}
                    </Text>
                  </View>
                )}
                {analysis.applicableLaws && analysis.applicableLaws.length > 0 && (
                  <View style={styles.findingRow}>
                    <Ionicons name="book-outline" size={16} color="#111111" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>Applicable Codes: </Text>
                      {analysis.applicableLaws.join(', ')}
                    </Text>
                  </View>
                )}
                {(!analysis.entities?.people && !analysis.entities?.dates && !analysis.applicableLaws) && (
                  <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' }}>
                    No key entities or codes identified in parsing matrix.
                  </Text>
                )}
              </View>
            </View>

            {/* Legal Relevance */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Legal Relevance</Text>
              <Text style={[styles.sectionBodyText, { color: theme.textPrimary }]}>
                {analysis.relevance || analysis.caseRelevance || 'No specific legal applicability outlined.'}
              </Text>
            </View>

            {/* Possible Weaknesses */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Possible Weaknesses</Text>
              {analysis.possibleWeaknesses && analysis.possibleWeaknesses.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {(Array.isArray(analysis.possibleWeaknesses) 
                    ? analysis.possibleWeaknesses 
                    : [analysis.possibleWeaknesses]).map((weakness: string, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: 6 }}>
                        <Ionicons name="warning-outline" size={14} color="#EF4444" style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                          {weakness}
                        </Text>
                      </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' }}>
                  No structural or logical weaknesses identified.
                </Text>
              )}
            </View>

            {/* Suggested Next Steps */}
            <View style={[styles.sectionContainer, { borderColor: theme.border || '#E5E7EB', marginBottom: 20 }]}>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Suggested Next Steps</Text>
              {analysis.suggestedTimelineEvents && analysis.suggestedTimelineEvents.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {analysis.suggestedTimelineEvents.map((stepText: string, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(109, 93, 252, 0.1)', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                        <Text style={{ fontSize: 10, color: '#111111', fontWeight: '800' }}>{idx + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>
                        {stepText}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                    <Text style={{ fontSize: 13, color: theme.textPrimary }}>Attach with active case affidavit bundle.</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                    <Text style={{ fontSize: 13, color: theme.textPrimary }}>Verify signatures against counterparty leases.</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  shareButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  noReportCard: {
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionContainer: {
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ocrTextBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  ocrText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  findingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
});
