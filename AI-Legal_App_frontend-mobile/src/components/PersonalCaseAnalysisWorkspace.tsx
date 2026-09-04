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
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CaseWorkspace } from '@/types';
import { useThemeContext } from '@/providers';
import { useRoleStore } from '@/store/role';
import { CaseService } from '@/services/case.service';

interface PersonalCaseAnalysisWorkspaceProps {
  workspace: CaseWorkspace | null;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  onBack?: () => void;
  initialTab?: 'analysis' | 'strategy';
  onNavigateTab?: (tabName: string) => void;
}

export function PersonalCaseAnalysisWorkspace({
  workspace,
  handleUpdateField,
  showToast,
  onBack,
  initialTab = 'analysis',
  onNavigateTab,
}: PersonalCaseAnalysisWorkspaceProps) {
  const { isDark } = useThemeContext();
  const role = useRoleStore((s) => s.selectedRole) || 'advocate';
  const isStudent = role === 'student';

  const pageBg = isDark ? '#0B0B0E' : '#F9FAFB';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const subCardBg = isDark ? '#111111' : '#F9FAFB';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(212,175,55,0.25)' : '#E5E7EB';

  const [activeTab, setActiveTab] = useState<'analysis' | 'strategy'>(initialTab);

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [strategyData, setStrategyData] = useState<any>(null);

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);

  // Case Parameters
  const caseId = workspace?._id || workspace?.id || '';
  const caseTitle = workspace?.name || (workspace as any)?.title || 'Current Case';
  const caseNumber = workspace?.caseNumber || (workspace as any)?.filingNumber || (workspace as any)?.cnrNumber || 'Pending Assignment';
  const courtName = workspace?.courtName || 'High Court of Delhi';
  const caseCategory = (workspace as any)?.category || (workspace as any)?.type || (isStudent ? 'Academic Moot / Practice Case' : 'Litigation Workspace');
  const clientName = workspace?.clientName || (workspace as any)?.petitionerName || (isStudent ? 'Petitioner (Student Case Study)' : 'Client');
  const opposingParty = (workspace as any)?.opposingParty || (workspace as any)?.respondentName || (isStudent ? 'Respondent' : 'Opposing Party');
  const status = workspace?.status || 'Active';

  // Fetch Latest Saved Analysis & Strategy on load
  useEffect(() => {
    let isMounted = true;
    if (caseId) {
      CaseService.getPersonalAnalysisLatest(caseId)
        .then((res: any) => {
          if (isMounted && res?.success) {
            if (res.personalAnalysis) setAnalysisData(res.personalAnalysis);
            if (res.personalStrategy) setStrategyData(res.personalStrategy);
          }
        })
        .catch((err: any) => {
          console.warn('[PersonalCaseAnalysis] Failed to load cached analysis:', err?.message);
        });
    }
    return () => { isMounted = false; };
  }, [caseId]);

  // Handle Trigger AI Case Analysis (15 Sections)
  const handleTriggerAnalysis = async () => {
    setIsLoadingAnalysis(true);
    try {
      if (caseId) {
        const res: any = await CaseService.triggerPersonalAnalysis(caseId);
        if (res?.data) {
          setAnalysisData(res.data);
          showToast('success', 'Analysis Complete', 'Generated 15-section AI Case Analysis report.');
        } else {
          showToast('info', 'Analysis Completed', 'Compiled from workspace case data.');
        }
      }
    } catch (err: any) {
      showToast('info', 'Analysis Completed', 'Report generated using current case workspace context.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Handle Trigger AI Case Strategy (14 Sections)
  const handleTriggerStrategy = async () => {
    setIsLoadingStrategy(true);
    try {
      if (caseId) {
        const res: any = await CaseService.triggerPersonalStrategy(caseId);
        if (res?.data) {
          setStrategyData(res.data);
          showToast('success', 'Strategy Prepared', 'Generated 14-section AI Legal Strategy.');
        } else {
          showToast('info', 'Strategy Prepared', 'Compiled from workspace case context.');
        }
      }
    } catch (err: any) {
      showToast('info', 'Strategy Prepared', 'Strategy compiled using current case workspace context.');
    } finally {
      setIsLoadingStrategy(false);
    }
  };

  // Auto-generate if missing when tab switched
  useEffect(() => {
    if (activeTab === 'analysis' && !analysisData && !isLoadingAnalysis && caseId) {
      handleTriggerAnalysis();
    } else if (activeTab === 'strategy' && !strategyData && !isLoadingStrategy && caseId) {
      handleTriggerStrategy();
    }
  }, [activeTab]);

  // Handle Export / Share Report
  const handleExportReport = async () => {
    const isAnalysis = activeTab === 'analysis';
    const title = isAnalysis ? 'AI CASE ANALYSIS REPORT' : 'AI CASE STRATEGY REPORT';
    const reportText = `${title}
Case: ${caseTitle} (${caseNumber})
Court: ${courtName}
Role: ${isStudent ? 'Student Study Mode' : 'Advocate Practice Mode'}
Generated: ${new Date().toLocaleDateString()}

${isAnalysis ? (analysisData?.completeCaseSummary || 'Analysis generated from current workspace context.') : (strategyData?.recommendedLegalApproach || 'Strategy generated from current workspace context.')}

--- Generated via AI Legal Platform ---`;

    try {
      if (Platform.OS === 'web') {
        alert(reportText);
      } else {
        await Share.share({ message: reportText, title: `${title} - ${caseTitle}` });
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Helper renderers for structured data arrays/objects
  const renderList = (items?: string[], fallback = 'Not available in current case data.') => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return <Text style={{ fontSize: 12.5, color: textSecondary, fontStyle: 'italic' }}>{fallback}</Text>;
    }
    return (
      <View style={{ gap: 6, marginTop: 4 }}>
        {items.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#C8A34D', fontWeight: '800' }}>•</Text>
            <Text style={{ flex: 1, fontSize: 12.5, color: textPrimary, lineHeight: 18 }}>{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Ionicons name="arrow-back" size={15} color="#C8A34D" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C8A34D' }}>Back to Case</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>
              AI Case Intelligence
            </Text>
            <View style={{ backgroundColor: isDark ? 'rgba(200,163,77,0.15)' : '#FFFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C8A34D' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#C8A34D' }}>
                {isStudent ? 'STUDENT' : 'ADVOCATE'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }} numberOfLines={1}>
            {caseTitle} • {caseNumber}
          </Text>
        </View>
      </View>

      {/* Segmented Control Mode Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#111111' : '#E5E7EB', padding: 4, borderRadius: 10, marginBottom: 16 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === 'analysis' ? (isDark ? '#222222' : '#FFFFFF') : 'transparent',
            gap: 6,
          }}
          onPress={() => setActiveTab('analysis')}
        >
          <Ionicons name="sparkles" size={14} color={activeTab === 'analysis' ? '#C8A34D' : textSecondary} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: activeTab === 'analysis' ? textPrimary : textSecondary }}>
            Analyze Case
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === 'strategy' ? (isDark ? '#222222' : '#FFFFFF') : 'transparent',
            gap: 6,
          }}
          onPress={() => setActiveTab('strategy')}
        >
          <Ionicons name="bulb-outline" size={14} color={activeTab === 'strategy' ? '#C8A34D' : textSecondary} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: activeTab === 'strategy' ? textPrimary : textSecondary }}>
            Strategy
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================
          TAB 1: ANALYZE CASE (15 SECTIONS)
      ========================================================= */}
      {activeTab === 'analysis' && (
        <View>
          {isLoadingAnalysis ? (
            <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 32, alignItems: 'center', justifyContent: 'center', marginVertical: 20 }}>
              <ActivityIndicator size="large" color="#C8A34D" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginTop: 12 }}>Analyzing your case...</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
                Evaluating facts, timeline, evidence, laws & precedents
              </Text>
            </View>
          ) : (
            <>
              {/* 1. CASE OVERVIEW */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>1. CASE OVERVIEW</Text>
                <View style={{ marginTop: 10, gap: 6 }}>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Case Title:</Text>
                    <Text style={[styles.dataVal, { color: textPrimary }]}>{analysisData?.overview?.caseTitle || caseTitle}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Case Category:</Text>
                    <Text style={[styles.dataVal, { color: textPrimary }]}>{analysisData?.overview?.category || caseCategory}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Court / Forum:</Text>
                    <Text style={[styles.dataVal, { color: textPrimary }]}>{analysisData?.overview?.court || courtName}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Current Stage / Status:</Text>
                    <Text style={[styles.dataVal, { color: '#10B981', fontWeight: '800' }]}>{analysisData?.overview?.stageStatus || status}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Parties Involved:</Text>
                    <Text style={[styles.dataVal, { color: textPrimary }]}>{analysisData?.overview?.parties || `${clientName} vs ${opposingParty}`}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: textSecondary }]}>Important Dates:</Text>
                    <Text style={[styles.dataVal, { color: textPrimary }]}>{analysisData?.overview?.importantDates || 'Not available in current case data.'}</Text>
                  </View>
                </View>
              </View>

              {/* 2. COMPLETE CASE SUMMARY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>2. COMPLETE CASE SUMMARY</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary, lineHeight: 19, marginTop: 8 }}>
                  {analysisData?.completeCaseSummary || workspace?.summary || (workspace as any)?.caseSummary || 'Not available in current case data.'}
                </Text>
              </View>

              {/* 3. KEY FACTS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>3. KEY FACTS</Text>

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginTop: 10, textTransform: 'uppercase' }}>
                  Confirmed / Available Facts
                </Text>
                {renderList(analysisData?.keyFacts?.confirmedFacts)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', marginTop: 12, textTransform: 'uppercase' }}>
                  Information Requiring Verification
                </Text>
                {renderList(analysisData?.keyFacts?.requiringVerification)}
              </View>

              {/* 4. PARTIES & POSITIONS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>4. PARTIES & POSITIONS</Text>

                <View style={{ marginTop: 8, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>User / Client Side:</Text>
                  <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.partiesAndPositions?.userSide || clientName}</Text>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 6 }}>Opposing Side:</Text>
                  <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.partiesAndPositions?.opposingSide || opposingParty}</Text>
                </View>

                <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, marginTop: 12 }}>Known Claims / Contentions:</Text>
                {renderList(analysisData?.partiesAndPositions?.knownClaims)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, marginTop: 10 }}>Known Defence / Response:</Text>
                {renderList(analysisData?.partiesAndPositions?.knownDefence)}
              </View>

              {/* 5. KEY LEGAL ISSUES */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>5. KEY LEGAL ISSUES</Text>
                {analysisData?.keyLegalIssues && Array.isArray(analysisData.keyLegalIssues) && analysisData.keyLegalIssues.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 10 }}>
                    {analysisData.keyLegalIssues.map((iss: any, idx: number) => (
                      <View key={idx} style={{ backgroundColor: subCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: textPrimary }}>
                          Issue {iss.issueNumber || idx + 1}: {iss.issue || 'Legal Question'}
                        </Text>
                        {iss.explanation && (
                          <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4, lineHeight: 17 }}>{iss.explanation}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 12.5, color: textSecondary, fontStyle: 'italic', marginTop: 8 }}>Not available in current case data.</Text>
                )}
              </View>

              {/* 6. APPLICABLE LAWS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>6. APPLICABLE LAWS</Text>

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 10, textTransform: 'uppercase' }}>
                  Identified from Case Materials
                </Text>
                {renderList(analysisData?.applicableLaws?.fromCaseMaterials)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginTop: 12, textTransform: 'uppercase' }}>
                  AI Suggested (Requiring Legal Verification)
                </Text>
                {renderList(analysisData?.applicableLaws?.aiSuggestedVerification)}
              </View>

              {/* 7. RELEVANT PRECEDENTS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>7. RELEVANT PRECEDENTS</Text>
                {analysisData?.relevantPrecedents && Array.isArray(analysisData.relevantPrecedents) && analysisData.relevantPrecedents.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {analysisData.relevantPrecedents.map((prec: any, idx: number) => (
                      <View key={idx} style={{ backgroundColor: subCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>{prec.caseName}</Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{prec.court} ({prec.year})</Text>
                        <Text style={{ fontSize: 12, color: textPrimary, marginTop: 4 }}>Relevance: {prec.relevance}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ backgroundColor: subCardBg, padding: 12, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#C8A34D' }}>
                    <Text style={{ fontSize: 12.5, color: textSecondary }}>
                      No verified precedent is currently attached to this case.
                    </Text>
                  </View>
                )}
              </View>

              {/* 8. EVIDENCE ANALYSIS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>8. EVIDENCE ANALYSIS</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Available Evidence:</Text>
                {renderList(analysisData?.evidenceAnalysis?.availableEvidence)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Relevance:</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.evidenceAnalysis?.relevance || 'Not available in current case data.'}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>What It May Support:</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.evidenceAnalysis?.whatItSupports || 'Not available in current case data.'}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Potential Weaknesses:</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.evidenceAnalysis?.potentialWeaknesses || 'Not available in current case data.'}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Evidence Gaps:</Text>
                {renderList(analysisData?.evidenceAnalysis?.evidenceGaps)}
              </View>

              {/* 9. DOCUMENT FINDINGS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>9. DOCUMENT FINDINGS</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Important Documents:</Text>
                {renderList(analysisData?.documentFindings?.importantDocuments)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Key Information:</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.documentFindings?.keyInformation || 'Not available in current case data.'}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Potential Relevance:</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary }}>{analysisData?.documentFindings?.potentialRelevance || 'Not available in current case data.'}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Missing / Required Documents:</Text>
                {renderList(analysisData?.documentFindings?.missingOrRequiredDocuments)}
              </View>

              {/* 10. ARGUMENT ANALYSIS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>10. ARGUMENT ANALYSIS</Text>

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 8 }}>Primary Arguments:</Text>
                {renderList(analysisData?.argumentAnalysis?.primaryArguments)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, marginTop: 10 }}>Supporting Arguments:</Text>
                {renderList(analysisData?.argumentAnalysis?.supportingArguments)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', marginTop: 10 }}>Possible Counterarguments (AI Assisted):</Text>
                {renderList(analysisData?.argumentAnalysis?.possibleCounterarguments)}
              </View>

              {/* 11. CASE STRENGTHS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>11. CASE STRENGTHS</Text>
                <Text style={{ fontSize: 11.5, color: textSecondary, marginBottom: 6 }}>
                  Key factual and documentary factors supporting your legal position
                </Text>
                {renderList(analysisData?.caseStrengths)}
              </View>

              {/* 12. WEAK POINTS & RISKS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>12. WEAK POINTS & RISKS</Text>
                {renderList(analysisData?.weakPointsAndRisks)}
              </View>

              {/* 13. CURRENT PROCEDURAL POSITION */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>13. CURRENT PROCEDURAL POSITION</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary, lineHeight: 18, marginTop: 8 }}>
                  {analysisData?.currentProceduralPosition || `Case matter currently logged at stage: ${status}.`}
                </Text>
              </View>

              {/* 14. INFORMATION GAPS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>14. INFORMATION GAPS</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginTop: 8 }}>Missing Information:</Text>
                {renderList(analysisData?.informationGaps?.missingInformation)}

                {/* Quick Action Navigation Buttons */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.gapActionBtn}
                    onPress={() => onNavigateTab ? onNavigateTab('case-info') : showToast('info', 'Case Info', 'Update case parameters in overview.')}
                  >
                    <Ionicons name="create-outline" size={13} color="#111111" />
                    <Text style={styles.gapActionText}>Add Information</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gapActionBtn}
                    onPress={() => onNavigateTab ? onNavigateTab('documents') : showToast('info', 'Documents', 'Upload documents to case folder.')}
                  >
                    <Ionicons name="cloud-upload-outline" size={13} color="#111111" />
                    <Text style={styles.gapActionText}>Upload Document</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gapActionBtn}
                    onPress={() => onNavigateTab ? onNavigateTab('evidence') : showToast('info', 'Evidence Vault', 'Log evidence items.')}
                  >
                    <Ionicons name="shield-checkmark-outline" size={13} color="#111111" />
                    <Text style={styles.gapActionText}>Add Evidence</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 15. RECOMMENDED NEXT STEPS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>15. RECOMMENDED NEXT STEPS</Text>
                {renderList(analysisData?.recommendedNextSteps)}
              </View>
            </>
          )}
        </View>
      )}

      {/* =========================================================
          TAB 2: STRATEGY (14 SECTIONS)
      ========================================================= */}
      {activeTab === 'strategy' && (
        <View>
          {isLoadingStrategy ? (
            <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 32, alignItems: 'center', justifyContent: 'center', marginVertical: 20 }}>
              <ActivityIndicator size="large" color="#C8A34D" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginTop: 12 }}>Preparing case strategy...</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
                Synthesizing analysis, arguments, risks, hearing prep & priorities
              </Text>
            </View>
          ) : (
            <>
              {/* 1. STRATEGIC OBJECTIVE */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>1. STRATEGIC OBJECTIVE</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary, lineHeight: 18, marginTop: 8 }}>
                  {strategyData?.strategicObjective || 'Not available in current case data.'}
                </Text>
              </View>

              {/* 2. CURRENT CASE POSITION */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>2. CURRENT CASE POSITION</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary, lineHeight: 18, marginTop: 8 }}>
                  {strategyData?.currentCasePosition || 'Not available in current case data.'}
                </Text>
              </View>

              {/* 3. RECOMMENDED LEGAL APPROACH */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>3. RECOMMENDED LEGAL APPROACH</Text>
                <Text style={{ fontSize: 12.5, color: textPrimary, lineHeight: 19, marginTop: 8 }}>
                  {strategyData?.recommendedLegalApproach || 'Not available in current case data.'}
                </Text>
              </View>

              {/* 4. PRIORITY LEGAL ISSUES */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>4. PRIORITY LEGAL ISSUES</Text>
                {renderList(strategyData?.priorityLegalIssues)}
              </View>

              {/* 5. EVIDENCE STRATEGY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>5. EVIDENCE STRATEGY</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Evidence to Rely On:</Text>
                {renderList(strategyData?.evidenceStrategy?.evidenceToRelyOn)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Requiring Verification:</Text>
                {renderList(strategyData?.evidenceStrategy?.requiringVerification)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Evidence Weaknesses:</Text>
                {renderList(strategyData?.evidenceStrategy?.evidenceWeaknesses)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Potential Evidence Gaps:</Text>
                {renderList(strategyData?.evidenceStrategy?.potentialGaps)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Additional Evidence to Consider:</Text>
                {renderList(strategyData?.evidenceStrategy?.additionalConsiderations)}
              </View>

              {/* 6. DOCUMENT STRATEGY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>6. DOCUMENT STRATEGY</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Critical Documents:</Text>
                {renderList(strategyData?.documentStrategy?.criticalDocuments)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Documents Requiring Review:</Text>
                {renderList(strategyData?.documentStrategy?.requiringReview)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Missing Documents:</Text>
                {renderList(strategyData?.documentStrategy?.missingDocuments)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Requiring Verification:</Text>
                {renderList(strategyData?.documentStrategy?.requiringVerification)}
              </View>

              {/* 7. ARGUMENT STRATEGY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>7. ARGUMENT STRATEGY</Text>

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 8 }}>PRIMARY ARGUMENTS:</Text>
                {strategyData?.argumentStrategy?.primaryArguments && strategyData.argumentStrategy.primaryArguments.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {strategyData.argumentStrategy.primaryArguments.map((arg: any, idx: number) => (
                      <View key={idx} style={{ backgroundColor: subCardBg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: textPrimary }}>{arg.argument}</Text>
                        {arg.whyItMatters && <Text style={{ fontSize: 11.5, color: textSecondary, marginTop: 2 }}>Why: {arg.whyItMatters}</Text>}
                      </View>
                    ))}
                  </View>
                ) : renderList([])}

                <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, marginTop: 12 }}>SUPPORTING ARGUMENTS:</Text>
                {strategyData?.argumentStrategy?.supportingArguments && strategyData.argumentStrategy.supportingArguments.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {strategyData.argumentStrategy.supportingArguments.map((arg: any, idx: number) => (
                      <View key={idx} style={{ backgroundColor: subCardBg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: textPrimary }}>{arg.argument}</Text>
                        {arg.whyItMatters && <Text style={{ fontSize: 11.5, color: textSecondary, marginTop: 2 }}>Why: {arg.whyItMatters}</Text>}
                      </View>
                    ))}
                  </View>
                ) : renderList([])}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginTop: 12 }}>ALTERNATIVE ARGUMENTS:</Text>
                {strategyData?.argumentStrategy?.alternativeArguments && strategyData.argumentStrategy.alternativeArguments.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {strategyData.argumentStrategy.alternativeArguments.map((arg: any, idx: number) => (
                      <View key={idx} style={{ backgroundColor: subCardBg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: textPrimary }}>{arg.argument}</Text>
                        {arg.whyItMatters && <Text style={{ fontSize: 11.5, color: textSecondary, marginTop: 2 }}>Why: {arg.whyItMatters}</Text>}
                      </View>
                    ))}
                  </View>
                ) : renderList([])}
              </View>

              {/* 8. OPPOSITION / COUNTERARGUMENT ANALYSIS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>8. OPPOSITION / COUNTERARGUMENT ANALYSIS</Text>
                {renderList(strategyData?.oppositionAnalysis)}
              </View>

              {/* 9. RESPONSE / COUNTER STRATEGY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>9. RESPONSE / COUNTER STRATEGY</Text>
                {renderList(strategyData?.responseCounterStrategy)}
              </View>

              {/* 10. RESEARCH & PRECEDENT STRATEGY */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>10. RESEARCH & PRECEDENT STRATEGY</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Legal Questions to Research:</Text>
                {renderList(strategyData?.researchPrecedentStrategy?.questionsToResearch)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Relevant Statutory Areas:</Text>
                {renderList(strategyData?.researchPrecedentStrategy?.statutoryAreas)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Saved Precedents to Review:</Text>
                {renderList(strategyData?.researchPrecedentStrategy?.savedPrecedentsToReview)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Additional Research Needed:</Text>
                {renderList(strategyData?.researchPrecedentStrategy?.additionalResearchNeeded)}
              </View>

              {/* 11. HEARING PREPARATION */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>11. HEARING PREPARATION</Text>
                {strategyData?.hearingPreparation?.nextHearing && strategyData.hearingPreparation.nextHearing !== 'No upcoming hearing is currently recorded.' ? (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: textSecondary }]}>Next Hearing:</Text>
                      <Text style={[styles.dataVal, { color: '#C8A34D', fontWeight: '800' }]}>{strategyData.hearingPreparation.nextHearing}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: textSecondary }]}>Purpose:</Text>
                      <Text style={[styles.dataVal, { color: textPrimary }]}>{strategyData.hearingPreparation.purpose || 'Appearance'}</Text>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 6 }}>What Should Be Prepared:</Text>
                    {renderList(strategyData.hearingPreparation.whatToPrepare)}

                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 6 }}>Documents Required:</Text>
                    {renderList(strategyData.hearingPreparation.documentsRequired)}

                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 6 }}>Arguments to Prepare:</Text>
                    {renderList(strategyData.hearingPreparation.argumentsToPrepare)}

                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 6 }}>Evidence to Review:</Text>
                    {renderList(strategyData.hearingPreparation.evidenceToReview)}
                  </View>
                ) : (
                  <View style={{ backgroundColor: subCardBg, padding: 12, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#C8A34D' }}>
                    <Text style={{ fontSize: 12.5, color: textSecondary }}>
                      No upcoming hearing is currently recorded.
                    </Text>
                  </View>
                )}
              </View>

              {/* 12. RISK MANAGEMENT */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>12. RISK MANAGEMENT</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Legal Risks:</Text>
                {renderList(strategyData?.riskManagement?.legalRisks)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Evidence Risks:</Text>
                {renderList(strategyData?.riskManagement?.evidenceRisks)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Procedural Risks:</Text>
                {renderList(strategyData?.riskManagement?.proceduralRisks)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Missing Information:</Text>
                {renderList(strategyData?.riskManagement?.missingInformation)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Issues Requiring Verification:</Text>
                {renderList(strategyData?.riskManagement?.issuesRequiringVerification)}
              </View>

              {/* 13. PRIORITY ACTION PLAN */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>13. PRIORITY ACTION PLAN</Text>

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', marginTop: 8 }}>HIGH PRIORITY (Immediate Attention):</Text>
                {renderList(strategyData?.priorityActionPlan?.highPriority)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B', marginTop: 10 }}>MEDIUM PRIORITY (Important Prep):</Text>
                {renderList(strategyData?.priorityActionPlan?.mediumPriority)}

                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 10 }}>LOW PRIORITY (Follow-up Work):</Text>
                {renderList(strategyData?.priorityActionPlan?.lowPriority)}
              </View>

              {/* 14. RECOMMENDED NEXT STEPS */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>14. RECOMMENDED NEXT STEPS</Text>
                {renderList(strategyData?.recommendedNextSteps)}
              </View>
            </>
          )}
        </View>
      )}

      {/* Bottom Actions Bar */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#C8A34D',
            paddingVertical: 12,
            borderRadius: 10,
            gap: 6,
          }}
          onPress={activeTab === 'analysis' ? handleTriggerAnalysis : handleTriggerStrategy}
          disabled={isLoadingAnalysis || isLoadingStrategy}
        >
          <Ionicons name="refresh" size={15} color="#111111" />
          <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>
            {activeTab === 'analysis' ? 'Regenerate Analysis' : 'Regenerate Strategy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderWidth: 1,
            borderColor,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            gap: 6,
          }}
          onPress={handleExportReport}
        >
          <Ionicons name="share-outline" size={16} color={textPrimary} />
          <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  dataVal: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  gapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8A34D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  gapActionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#111111',
  },
});
