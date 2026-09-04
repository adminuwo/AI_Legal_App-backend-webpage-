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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseContract } from '@/types';

const { width } = Dimensions.get('window');

type ActiveTab = 'overview' | 'clauses' | 'risks' | 'recommendations';

export default function ContractAnalysisScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { caseId, contractId } = useLocalSearchParams<{
    caseId: string;
    contractId: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<CaseContract | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  useEffect(() => {
    if (caseId && contractId) {
      loadContractReport();
    } else {
      setErrorMsg('Missing case or contract parameter details.');
      setIsLoading(false);
    }
  }, [caseId, contractId]);

  const loadContractReport = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await CaseService.getCaseDetails(caseId);
      if (res.success && res.data) {
        const item = (res.data.contracts || []).find(
          (c: any) => String(c._id || c.id) === contractId
        );
        if (item) {
          setContract(item);
        } else {
          setErrorMsg('Contract not found in this case folder.');
        }
      } else {
        setErrorMsg(res.error || 'Failed to fetch case details.');
      }
    } catch (err: any) {
      console.error('[Contract Analysis Load Error]', err);
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!contract || !contract.analysisReport) return;
    const report = contract.analysisReport;

    const clausesText = (report.clauses || [])
      .map((c) => `- ${c.title} (${c.risk} Risk): ${c.explanation}`)
      .join('\n');
    
    const risksText = (report.risks || [])
      .map((r) => `- ${r.title} (${r.severity} Severity): ${r.reason}`)
      .join('\n');

    const shareText = `CONTRACT AI AUDIT REPORT
Document: ${contract.name}
Risk Threshold: ${report.riskScore || 'High'}

SUMMARY:
${report.summary || 'N/A'}

PARTIES:
${(report.parties || []).join(' vs. ')}

AUDITED CLAUSES:
${clausesText}

CRITICAL RISKS:
${risksText}

AI RECOMMENDATIONS:
${(report.recommendations || []).map((rec) => `• ${rec}`).join('\n')}
`;

    try {
      await Share.share({
        message: shareText,
        title: `AI Contract Audit - ${contract.name}`,
      });
    } catch (err: any) {
      showToast('error', 'Share Failed', 'Could not open share dialogue.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border || '#ECECEC' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Audit Report</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
          <Text style={{ marginTop: 12, color: theme.textSecondary || '#6B7280', fontSize: 14 }}>
            Computing contract intelligence...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !contract || !contract.analysisReport) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border || '#ECECEC' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={54} color={theme.danger || '#EF4444'} style={{ marginBottom: 12 }} />
          <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center', marginHorizontal: 32 }}>
            {errorMsg || 'This contract has not been analyzed yet.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const report = contract.analysisReport;
  const isHighRisk = report.riskScore === 'High';
  const isLowRisk = report.riskScore === 'Low';
  
  let riskColor = '#F59E0B'; // Medium -> amber
  let riskBg = '#FEF3C7';
  if (isHighRisk) {
    riskColor = '#EF4444'; // High -> red
    riskBg = '#FEE2E2';
  } else if (isLowRisk) {
    riskColor = '#10B981'; // Low -> green
    riskBg = '#D1FAE5';
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border || '#ECECEC' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {contract.name}
          </Text>
          <Text style={{ fontSize: 10, color: theme.textSecondary }}>Contract AI Audit</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={22} color="#111111" />
        </TouchableOpacity>
      </View>

      {/* Risk Dial Card */}
      <View style={styles.riskCardSection}>
        <View style={[styles.riskCircle, { backgroundColor: riskBg }]}>
          <Ionicons name={isHighRisk ? 'warning-outline' : 'shield-checkmark-outline'} size={28} color={riskColor} />
          <Text style={[styles.riskCircleScore, { color: riskColor }]}>{report.riskScore || 'Medium'}</Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, marginTop: 1 }}>RISK SCORE</Text>
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[styles.riskLabel, { color: theme.textPrimary }]}>Threat Covenants Audited</Text>
          <Text style={[styles.riskDesc, { color: theme.textSecondary }]}>
            {isHighRisk 
              ? 'AI flagged severe liability disparities or missing dispute resolution clauses. Action recommended.'
              : isLowRisk
              ? 'Contract covenants are standard and legally balanced. Low litigation liability.'
              : 'Moderate concerns identified regarding notice periods or unilateral terms.'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border || '#ECECEC' }]}>
        {(['overview', 'clauses', 'risks', 'recommendations'] as ActiveTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && { borderBottomColor: '#111111' }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#111111' : theme.textSecondary || '#6B7280' },
                  isActive && { fontWeight: '700' }
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable Report Content */}
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View style={styles.contentSection}>
            {/* Executive Summary */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Executive Summary</Text>
              <Text style={[styles.paragraphText, { color: theme.textSecondary }]}>
                {report.summary}
              </Text>
            </View>

            {/* Parties */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Parties Involved</Text>
              <View style={styles.partiesBadgeWrap}>
                {(report.parties || []).map((party, idx) => (
                  <View key={idx} style={[styles.partyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
                    <Ionicons name="person-outline" size={12} color="#111111" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>{party}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Rights & Obligations */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rights & Obligations</Text>
              <Text style={[styles.listLabel, { color: theme.textPrimary }]}>Extracted Rights:</Text>
              {(report.rights || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.listLabel, { color: theme.textPrimary, marginTop: 12 }]}>Core Obligations:</Text>
              {(report.obligations || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="ellipse-outline" size={8} color="#111111" style={{ marginTop: 5, marginRight: 11, marginLeft: 3 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'clauses' && (
          <View style={styles.contentSection}>
            {(report.clauses || []).map((c, idx) => {
              const highRisk = c.risk === 'High' || c.risk === 'Critical';
              const lowRisk = c.risk === 'Low';
              let badgeColor = '#F59E0B';
              let badgeBg = '#FEF3C7';
              if (highRisk) {
                badgeColor = '#EF4444';
                badgeBg = '#FEE2E2';
              } else if (lowRisk) {
                badgeColor = '#10B981';
                badgeBg = '#D1FAE5';
              }

              return (
                <View
                  key={idx}
                  style={[styles.clauseBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}
                >
                  <View style={styles.clauseHeaderRow}>
                    <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>{c.title}</Text>
                    <View style={[styles.clauseBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.clauseBadgeText, { color: badgeColor }]}>{c.risk} Risk</Text>
                    </View>
                  </View>
                  <Text style={[styles.paragraphText, { color: theme.textSecondary, marginTop: 8 }]}>
                    {c.explanation}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'risks' && (
          <View style={styles.contentSection}>
            {/* Risk Warnings */}
            <Text style={[styles.subGroupHeader, { color: theme.textPrimary }]}>Primary Risk Covenants</Text>
            {(report.risks || []).map((r, idx) => (
              <View key={idx} style={[styles.riskBlock, { backgroundColor: '#FFF5F5', borderColor: '#FEB2B2' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="skull-outline" size={14} color="#C53030" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#9B2C2C' }}>{r.title}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#C53030', lineHeight: 16 }}>{r.reason}</Text>
              </View>
            ))}

            {/* Red Flags & Legal Issues */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC', marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Audited Legal Discrepancies</Text>
              
              <Text style={[styles.listLabel, { color: theme.textPrimary }]}>Red Flags Detected:</Text>
              {(report.redFlags || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="flag" size={13} color="#EF4444" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.listLabel, { color: theme.textPrimary, marginTop: 12 }]}>Missing Covenants:</Text>
              {(report.missingClauses || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="close-circle" size={14} color="#111111" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.listLabel, { color: theme.textPrimary, marginTop: 12 }]}>Legal Concerns:</Text>
              {(report.legalIssues || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="help-circle" size={14} color="#F59E0B" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'recommendations' && (
          <View style={styles.contentSection}>
            {/* AI Recommendations */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Suggested Remedy Improvements</Text>
              {(report.recommendations || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="bulb-outline" size={14} color="#111111" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Tactical Improvements */}
            <View style={[styles.infoBlock, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#ECECEC' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Drafting Compliance checks</Text>
              {(report.compliance || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="checkbox-outline" size={14} color="#10B981" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
              
              <Text style={[styles.listLabel, { color: theme.textPrimary, marginTop: 12 }]}>Specific Statutory Amendments:</Text>
              {(report.improvements || []).map((item, idx) => (
                <View key={idx} style={styles.listItemRow}>
                  <Ionicons name="pencil" size={13} color="#111111" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[styles.listItemText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  shareButton: {
    padding: 6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  riskCardSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  riskCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  riskCircleScore: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  riskLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contentSection: {
    gap: 12,
  },
  infoBlock: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraphText: {
    fontSize: 12,
    lineHeight: 18,
  },
  partiesBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  partyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  listLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  listItemText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  clauseBlock: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  clauseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clauseTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  clauseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clauseBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  subGroupHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  riskBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
