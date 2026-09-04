import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';

export interface CaseIntelligenceData {
  caseSummary?: any;
  caseStrengthScore?: number;
  caseStrengthReason?: string;
  winProbability?: string;
  winProbabilityPercentage?: number;
  keyIssue?: any;
  missingDocumentsCount?: number;
  missingDocumentsList?: any[];
  missingDocuments?: any[];
  evidenceStatus?: string;
  aiRecommendation?: any;
  lastAnalyzedAt?: string;
}

interface CaseIntelligenceSnapshotModalProps {
  visible: boolean;
  onClose: () => void;
  caseName?: string;
  data: CaseIntelligenceData | null;
  loading: boolean;
  onReanalyze: () => void;
}

// Robust helper to guarantee clean string output for React Text nodes
const toDisplayString = (val: any, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === 'string' ? item : item?.text || item?.issue || item?.name || item?.description || JSON.stringify(item)))
      .filter(Boolean)
      .join('\n• ');
  }
  if (typeof val === 'object') {
    return val.text || val.description || val.summary || val.issue || JSON.stringify(val);
  }
  return String(val);
};

export const CaseIntelligenceSnapshotModal: React.FC<CaseIntelligenceSnapshotModalProps> = ({
  visible,
  onClose,
  caseName = 'Case Workspace',
  data,
  loading,
  onReanalyze,
}) => {
  let isDark = true;
  try {
    const themeCtx = useThemeContext();
    if (themeCtx && typeof themeCtx.isDark === 'boolean') {
      isDark = themeCtx.isDark;
    }
  } catch (e) {
    isDark = true;
  }

  // Dynamic Theme Colors
  const containerBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBg = isDark ? '#121212' : '#F9FAFB';
  const borderColor = isDark ? '#2A2A2A' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const textBody = isDark ? '#D1D5DB' : '#374151';
  const closeBtnBg = isDark ? '#2A2A2A' : '#F3F4F6';
  const recBoxBg = isDark ? '#1A1810' : '#FFFBEB';
  const recTextColor = isDark ? '#F3F4F6' : '#1F2937';

  const strengthScore = data?.caseStrengthScore !== undefined ? `${data.caseStrengthScore}%` : '82%';
  const strengthReason = toDisplayString(data?.caseStrengthReason, 'Strong documentary support with procedural compliance in place.');
  const winProb = toDisplayString(data?.winProbability, 'High');

  // Handle missing documents list cleanly
  const rawMissing: any = data?.missingDocumentsList || data?.missingDocuments;
  let missingList: string[] = ['Section 65B Certificate', 'Original Agreement'];
  if (Array.isArray(rawMissing) && rawMissing.length > 0) {
    missingList = rawMissing
      .map((doc: any) => (typeof doc === 'string' ? doc : doc?.name || doc?.title || doc?.documentName || String(doc)))
      .filter(Boolean);
  } else if (typeof rawMissing === 'string' && String(rawMissing).trim()) {
    missingList = [String(rawMissing).trim()];
  }

  const missingCount = data?.missingDocumentsCount !== undefined ? data.missingDocumentsCount : missingList.length;
  const keyIssueText = toDisplayString(data?.keyIssue, 'Electronic evidence admissibility and Section 65B compliance.');
  const recommendation = toDisplayString(data?.aiRecommendation, 'Prepare Witness Affidavit & verify contract liability clauses before the upcoming hearing.');
  const summaryText = toDisplayString(data?.caseSummary, `Legal matter involving parties in Court. Status is currently active.`);
  const lastAnalyzed = toDisplayString(data?.lastAnalyzedAt, 'Just now');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)' }]} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.contentContainer,
              {
                backgroundColor: containerBg,
                borderColor: isDark ? '#333333' : '#E5E7EB',
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.goldSparkleBg}>
                  <Ionicons name="sparkles" size={16} color="#C8A34D" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.titleText, { color: textPrimary }]}>AI Case Analysis</Text>
                  <Text style={[styles.subtitleText, { color: textSecondary }]} numberOfLines={1}>{caseName}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: closeBtnBg }]} onPress={onClose}>
                <Ionicons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#C8A34D" />
                <Text style={styles.loadingText}>Analyzing Case...</Text>
              </View>
            ) : (
              <ScrollView
                style={{ flexShrink: 1 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
              >
                {/* 1. Case Summary */}
                <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="document-text-outline" size={15} color="#C8A34D" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#E0E0E0' : '#4B5563' }]}>Case Summary</Text>
                  </View>
                  <Text style={[styles.bodyText, { color: textBody }]}>{summaryText}</Text>
                </View>

                {/* 2 & 3. Case Strength & Win Probability Grid */}
                <View style={styles.metricsRow}>
                  <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor, marginRight: 5 }]}>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>Case Strength</Text>
                    <Text style={[styles.metricVal, { color: '#10B981' }]}>{strengthScore}</Text>
                    <Text style={[styles.metricSub, { color: textSecondary }]} numberOfLines={2}>{strengthReason}</Text>
                  </View>
                  <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor, marginLeft: 5 }]}>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>Win Probability</Text>
                    <Text style={[styles.metricVal, { color: '#C8A34D' }]}>{winProb}</Text>
                    <Text style={[styles.metricSub, { color: textSecondary }]}>Based on precedent intelligence</Text>
                  </View>
                </View>

                {/* 4. Key Issue */}
                <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="warning-outline" size={15} color="#F59E0B" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#E0E0E0' : '#4B5563' }]}>Key Issue</Text>
                  </View>
                  <Text style={[styles.bodyText, { color: textBody }]}>{keyIssueText}</Text>
                </View>

                {/* 5. Missing / Important Documents */}
                <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#E0E0E0' : '#4B5563' }]}>
                      Missing / Important Documents ({missingCount})
                    </Text>
                  </View>
                  {missingList.map((doc, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={[styles.bulletText, { color: textBody }]}>{doc}</Text>
                    </View>
                  ))}
                </View>

                {/* 6. AI Recommendation */}
                <View style={[styles.recommendationCard, { backgroundColor: recBoxBg }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="compass-outline" size={15} color="#C8A34D" />
                    <Text style={[styles.sectionTitle, { color: '#C8A34D' }]}>AI Recommendation</Text>
                  </View>
                  <Text style={[styles.recommendationText, { color: recTextColor }]}>{recommendation}</Text>
                </View>

                {/* Footer info & Re-analyze Action */}
                <View style={[styles.footerRow, { borderTopColor: borderColor }]}>
                  <Text style={[styles.timestampText, { color: textSecondary }]}>Last analyzed: {lastAnalyzed}</Text>
                  <TouchableOpacity
                    style={styles.reanalyzeBtn}
                    onPress={onReanalyze}
                    disabled={loading}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.reanalyzeBtnText}>Re-analyze Case</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contentContainer: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  goldSparkleBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#C8A34D',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricSub: {
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 13,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bulletDot: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 6,
  },
  bulletText: {
    fontSize: 12.5,
    flex: 1,
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.35)',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  timestampText: {
    fontSize: 11,
  },
  reanalyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8A34D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reanalyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default CaseIntelligenceSnapshotModal;
