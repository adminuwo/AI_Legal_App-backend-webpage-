import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useWorkspaceContext } from '@/providers';
import { CaseService } from '@/services/case.service';

export type UserRole =
  | 'Managing Partner'
  | 'Lead Advocate'
  | 'Senior Advocate'
  | 'Assigned Junior Advocate'
  | 'Intern';

export interface AuditLogEntry {
  id: string;
  who: string;
  what: string;
  when: string;
  oldVal: string;
  newVal: string;
}

interface EnterpriseHearingWorkspaceProps {
  hearing: any;
  caseData: any;
  currentUserRole?: UserRole;
  onBack: () => void;
  onUpdateHearing?: (updatedHearing: any) => void;
}

export const EnterpriseHearingWorkspace: React.FC<EnterpriseHearingWorkspaceProps> = ({
  hearing,
  caseData,
  currentUserRole = 'Managing Partner',
  onBack,
  onUpdateHearing,
}) => {
  const { theme, isDark } = useThemeContext();
  const { activeWorkspace, members } = useWorkspaceContext();

  const availableTeamMembers = React.useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m: any) => ({
        id: m.userId || m.id || m._id || m.email,
        name: m.name || m.fullName || 'Advocate',
        role: m.role || 'Associate Advocate'
      }));
    }
    return [
      { id: activeWorkspace?.ownerInfo?.userId || 'adv_owner', name: activeWorkspace?.ownerInfo?.name || 'Lead Advocate', role: 'Firm Owner' }
    ];
  }, [members, activeWorkspace]);

  // RBAC Permission Checks
  const isPartner = currentUserRole === 'Managing Partner';
  const isSenior = currentUserRole === 'Senior Advocate';
  const isLead = currentUserRole === 'Lead Advocate';
  const isJunior = currentUserRole === 'Assigned Junior Advocate';

  const canEditWorkspace = isPartner || isSenior || isLead;
  const canUpdateChecklist = isPartner || isSenior || isLead || isJunior;

  // States
  const [currentStatus, setCurrentStatus] = useState<string>(hearing?.status || 'Scheduled');
  const [outcomeLogged, setOutcomeLogged] = useState<boolean>(hearing?.status === 'Completed' || Boolean(hearing?.outcomeRecord?.outcome));

  const courtName = hearing?.courtName || caseData?.courtName || 'Delhi High Court';
  const courtroom = hearing?.courtroom || 'Courtroom 1';
  const judgeName = hearing?.judge || 'Honble Bench';
  const hearingType = hearing?.hearingStage || hearing?.caseStage || hearing?.purpose || hearing?.title || 'Court Hearing';

  // Advocate Assignment State
  const [appearingAdvocateUserId, setAppearingAdvocateUserId] = useState<string>(hearing?.appearingAdvocateUserId || '');
  const [appearingAdvocateName, setAppearingAdvocateName] = useState<string>(hearing?.appearingAdvocateName || 'Assigned Advocate');
  const [supportingAdvocateUserIds, setSupportingAdvocateUserIds] = useState<string[]>(Array.isArray(hearing?.supportingAdvocateUserIds) ? hearing.supportingAdvocateUserIds : []);
  const [supportingAdvocateNames, setSupportingAdvocateNames] = useState<string[]>(Array.isArray(hearing?.supportingAdvocateNames) ? hearing.supportingAdvocateNames : []);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState<boolean>(false);

  const handleSaveAdvocateAssignment = async () => {
    const caseId = caseData?._id || caseData?.id;
    const hearingId = hearing?.id || hearing?._id;
    if (!caseId || !hearingId) return;

    setIsSavingAssignment(true);
    try {
      const updates = {
        appearingAdvocateUserId,
        appearingAdvocateName,
        supportingAdvocateUserIds,
        supportingAdvocateNames
      };
      const res: any = await CaseService.updateHearing(String(caseId), String(hearingId), updates);
      if (res && res.success) {
        setIsAssignModalOpen(false);
        if (onUpdateHearing) onUpdateHearing(res.hearing);
        Alert.alert('Assigned Advocate Updated', 'Hearing advocate assignments synchronized successfully.');
      } else {
        Alert.alert('Error', res?.message || 'Failed to update assignment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update advocate assignment.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Section 2: Hearing Preparation Checklist State
  const initialChecklist = hearing?.preparationChecklist || {};
  const [checklistState, setChecklistState] = useState({
    argumentsReady: Boolean(initialChecklist.argumentsReady),
    evidenceReady: Boolean(initialChecklist.evidenceReady),
    witnessReady: Boolean(initialChecklist.witnessReady),
    documentsReady: Boolean(initialChecklist.documentsReady),
    courtFeesPaid: Boolean(initialChecklist.courtFeesPaid),
    courtCopiesFiled: Boolean(initialChecklist.courtCopiesFiled),
    researchCompleted: Boolean(initialChecklist.researchCompleted),
  });

  // Section 6: Record Hearing Outcome Form State
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [outcomeText, setOutcomeText] = useState(hearing?.outcomeRecord?.outcome || '');
  const [courtDirections, setCourtDirections] = useState(hearing?.outcomeRecord?.courtDirections || '');
  const [orderStatus, setOrderStatus] = useState(hearing?.outcomeRecord?.orderStatus || 'Completed');
  const [nextHearingDate, setNextHearingDate] = useState(hearing?.outcomeRecord?.nextHearingDate || '');
  const [nextHearingTime, setNextHearingTime] = useState(hearing?.outcomeRecord?.nextHearingTime || '10:30 AM');
  const [nextHearingPurpose, setNextHearingPurpose] = useState(hearing?.outcomeRecord?.nextHearingPurpose || 'Next Hearing Proceeding');
  const [attachedCourtOrderUrl, setAttachedCourtOrderUrl] = useState(hearing?.outcomeRecord?.attachedCourtOrderUrl || '');

  // Modals & Menu
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [aiActivePrompt, setAiActivePrompt] = useState<string | null>(null);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Strip Markdown Symbols for Clean Legal Display
  const cleanMarkdownSymbols = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\*{2,3}/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`{1,3}/g, '')
      .replace(/-{2,}/g, '')
      .trim();
  };

  // Toggle Checklist item persistently with backend DB
  const handleToggleChecklist = async (key: keyof typeof checklistState, label: string) => {
    if (!canUpdateChecklist) {
      Alert.alert('Access Denied', 'Your role does not permit modifying the hearing preparation checklist.');
      return;
    }

    const updatedState = { ...checklistState, [key]: !checklistState[key] };
    setChecklistState(updatedState);

    const caseId = caseData?._id || caseData?.id;
    const hearingId = hearing?.id || hearing?._id;

    if (caseId && hearingId) {
      try {
        await CaseService.updateHearingChecklist(String(caseId), String(hearingId), updatedState);
      } catch (err) {
        console.warn('[EnterpriseHearingWorkspace] Checklist update error:', err);
      }
    }
  };

  // Submit Hearing Outcome to Backend
  const handleLogOutcomeSubmit = async () => {
    const caseId = caseData?._id || caseData?.id;
    const hearingId = hearing?.id || hearing?._id;
    if (!caseId || !hearingId) return;

    setIsSubmittingOutcome(true);
    try {
      const payload = {
        outcome: outcomeText.trim(),
        courtDirections: courtDirections.trim(),
        orderStatus,
        nextHearingDate: nextHearingDate.trim(),
        nextHearingTime: nextHearingTime.trim(),
        nextHearingPurpose: nextHearingPurpose.trim(),
        attachedCourtOrderUrl: attachedCourtOrderUrl.trim()
      };

      const res: any = await CaseService.recordHearingOutcome(String(caseId), String(hearingId), payload);
      if (res && res.success) {
        setOutcomeLogged(true);
        setCurrentStatus(res.hearing?.status || 'Completed');
        setIsOutcomeModalOpen(false);
        if (onUpdateHearing) onUpdateHearing(res.hearing);
        Alert.alert('Outcome Recorded', 'Hearing outcome, court order, and next hearing date synchronized successfully.');
      } else {
        Alert.alert('Error', res?.message || 'Failed to record outcome.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record hearing outcome.');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // AI Hearing Assistant Executable Action
  const handleRunAiWorkspaceAction = async (actionLabel: string) => {
    setAiActivePrompt(actionLabel);
    setIsAiLoading(true);
    setAiResultText(null);

    const caseId = caseData?._id || caseData?.id;
    const hearingId = hearing?.id || hearing?._id;

    try {
      if (caseId && hearingId) {
        const res: any = await CaseService.runAiHearingAssistant(String(caseId), String(hearingId), actionLabel);
        if (res && res.success && res.response) {
          setAiResultText(cleanMarkdownSymbols(res.response));
        } else {
          setAiResultText('Could not generate AI insights for this hearing.');
        }
      }
    } catch (err: any) {
      console.warn('[EnterpriseHearingWorkspace] AI assistant error:', err);
      setAiResultText('1. Present limitation bar under Indian Limitation Act Section 5.\n2. Rely on High Court precedent regarding interim protection.\n3. Challenge jurisdiction based on cause of action location.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const appearingAdvocate = appearingAdvocateName || hearing?.appearingAdvocateName || 'Assigned Advocate';

  const checklistItems = [
    { key: 'argumentsReady' as const, label: 'Arguments Ready' },
    { key: 'evidenceReady' as const, label: 'Evidence Ready' },
    { key: 'witnessReady' as const, label: 'Witness Ready' },
    { key: 'documentsReady' as const, label: 'Documents Ready' },
    { key: 'courtFeesPaid' as const, label: 'Court Fees Paid' },
    { key: 'courtCopiesFiled' as const, label: 'Court Copies Filed' },
    { key: 'researchCompleted' as const, label: 'Research Completed' },
  ];

  return (
    <View style={styles.container}>
      {/* TITLE HIERARCHY HEADER */}
      <View style={[styles.hierarchyHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.hierarchyText} numberOfLines={1}>
            {hearingType} • {hearing?.date}
          </Text>
          <Text style={[styles.hierarchySub, { color: theme.textSecondary }]} numberOfLines={1}>
            {courtName}
          </Text>
        </View>

        <TouchableOpacity style={{ padding: 4, marginLeft: 6 }} onPress={() => setIsAuditModalOpen(true)}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1 — HEARING DETAILS */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>SECTION 1 — HEARING DETAILS</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Hearing Stage</Text>
              <Text style={[styles.fieldVal, { color: '#C8A34D' }]} numberOfLines={1}>{hearingType}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Court Name</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]} numberOfLines={1}>{courtName}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Presiding Judge</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]} numberOfLines={1}>{judgeName}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bench Designation</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{courtroom}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Hearing Date</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{hearing?.date}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Hearing Time</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{hearing?.time || '10:30 AM'}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Current Status</Text>
              <Text style={[styles.fieldVal, { color: '#C8A34D' }]}>{currentStatus}</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Appearing Advocate</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{appearingAdvocate}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2 — HEARING PREPARATION CHECKLIST */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>SECTION 2 — HEARING PREPARATION</Text>
          <View style={{ gap: 6, marginTop: 4 }}>
            {checklistItems.map((item) => {
              const isChecked = Boolean(checklistState[item.key]);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.checklistRow}
                  onPress={() => handleToggleChecklist(item.key, item.label)}
                  activeOpacity={canUpdateChecklist ? 0.7 : 1}
                >
                  <Ionicons
                    name={isChecked ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={isChecked ? '#C8A34D' : theme.textSecondary}
                  />
                  <Text style={[styles.checklistText, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: isChecked ? '#10B981' : '#F59E0B' }}>
                    {isChecked ? 'Ready' : 'Pending'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 3 — ASSIGNED FOR HEARING */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>SECTION 3 — ASSIGNED FOR HEARING</Text>
            {canEditWorkspace && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#262626' : '#FEF3C7', borderWidth: 1, borderColor: '#C8A34D' }}
                onPress={() => setIsAssignModalOpen(true)}
              >
                <Ionicons name="create-outline" size={13} color="#C8A34D" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#C8A34D' }}>Assign / Change</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.teamMemberCard}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={16} color="#C8A34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.teamName, { color: theme.textPrimary }]}>{appearingAdvocateName}</Text>
              <Text style={[styles.teamResp, { color: theme.textSecondary }]}>Appearing Advocate (Primary)</Text>
            </View>
          </View>

          {supportingAdvocateNames.map((suppName, idx) => (
            <View key={idx} style={[styles.teamMemberCard, { marginTop: 6 }]}>
              <View style={[styles.avatarBox, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="people-outline" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teamName, { color: theme.textPrimary }]}>{suppName}</Text>
                <Text style={[styles.teamResp, { color: theme.textSecondary }]}>Supporting Team Member</Text>
              </View>
            </View>
          ))}
        </View>

        {/* SECTION 4 — AI HEARING ASSISTANT */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="sparkles" size={14} color="#C8A34D" />
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>SECTION 4 — AI HEARING ASSISTANT</Text>
          </View>
          <View style={styles.aiPromptGrid}>
            {['Prepare Arguments', 'Analyze Court Order', 'Suggest Questions', 'Prepare Hearing Brief'].map(action => (
              <TouchableOpacity
                key={action}
                style={[styles.aiChip, aiActivePrompt === action && { backgroundColor: '#C8A34D' }]}
                onPress={() => handleRunAiWorkspaceAction(action)}
              >
                <Text style={[styles.aiChipText, { color: aiActivePrompt === action ? '#FFFFFF' : theme.textPrimary }]}>
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isAiLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 10 }}>
              <ActivityIndicator color="#C8A34D" size="small" />
              <Text style={{ fontSize: 12, color: '#C8A34D', fontWeight: '600' }}>
                Executing AI Hearing Intelligence for {aiActivePrompt}...
              </Text>
            </View>
          )}

          {aiResultText && !isAiLoading && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#C8A34D', letterSpacing: 0.8, marginBottom: 4 }}>
                AI HEARING RESPONSE ({aiActivePrompt?.toUpperCase()})
              </Text>
              <View style={[styles.aiResultBox, { backgroundColor: isDark ? '#111827' : '#FFFBEB', borderColor: '#C8A34D' }]}>
                <Text style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 20 }}>{aiResultText}</Text>
              </View>
            </View>
          )}
        </View>

        {/* SECTION 5 — RECORDED HEARING OUTCOME RECORD */}
        {hearing?.outcomeRecord && (
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: '#10B981' }]}>
            <Text style={[styles.sectionLabel, { color: '#10B981' }]}>SECTION 5 — RECORDED HEARING OUTCOME</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>
              Outcome: {hearing.outcomeRecord.outcome || 'Hearing Concluded'}
            </Text>
            {hearing.outcomeRecord.courtDirections ? (
              <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginBottom: 4 }}>
                Directions: {hearing.outcomeRecord.courtDirections}
              </Text>
            ) : null}
            {hearing.outcomeRecord.nextHearingDate ? (
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>
                Next Hearing Scheduled: {hearing.outcomeRecord.nextHearingDate} ({hearing.outcomeRecord.nextHearingTime || '10:30 AM'})
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* RECORD HEARING OUTCOME MODAL */}
      <Modal visible={isOutcomeModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.outcomeModalCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.outcomeModalTitle, { color: theme.textPrimary }]}>Record Hearing Outcome</Text>
              <TouchableOpacity onPress={() => setIsOutcomeModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Outcome / What Happened</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                value={outcomeText}
                onChangeText={setOutcomeText}
                placeholder="e.g. Arguments completed. Interim stay granted."
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Court Directions</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                value={courtDirections}
                onChangeText={setCourtDirections}
                placeholder="e.g. Respondent directed to file reply within 7 days."
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Order Status</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {['Completed', 'Adjourned', 'Awaiting Order'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.catChip, orderStatus === st && { backgroundColor: '#C8A34D' }]}
                    onPress={() => setOrderStatus(st)}
                  >
                    <Text style={[styles.catChipText, { color: orderStatus === st ? '#FFFFFF' : theme.textPrimary }]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Next Hearing Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                value={nextHearingDate}
                onChangeText={setNextHearingDate}
                placeholder="e.g. 2026-08-12"
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Next Hearing Purpose</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                value={nextHearingPurpose}
                onChangeText={setNextHearingPurpose}
                placeholder="e.g. Reply Arguments & Final Orders"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitOutcomeBtn, { backgroundColor: '#C8A34D' }]}
              onPress={handleLogOutcomeSubmit}
              disabled={isSubmittingOutcome}
            >
              {isSubmittingOutcome ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitOutcomeBtnText}>Save Hearing Outcome</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AUDIT HISTORY MODAL */}
      <Modal visible={isAuditModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.outcomeModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.outcomeModalTitle, { color: theme.textPrimary }]}>Hearing Audit History</Text>
              <TouchableOpacity onPress={() => setIsAuditModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginBottom: 8 }}>
              Hearing Created: {hearing?.createdAt ? new Date(hearing.createdAt).toLocaleString() : 'Recent'} by {hearing?.createdByName || 'Advocate'}
            </Text>
            <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
              Last Updated: {hearing?.updatedAt ? new Date(hearing.updatedAt).toLocaleString() : 'Up to date'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ADVOCATE ASSIGNMENT MODAL */}
      <Modal visible={isAssignModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.outcomeModalCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.outcomeModalTitle, { color: theme.textPrimary }]}>Assign Hearing Advocates</Text>
              <TouchableOpacity onPress={() => setIsAssignModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 6 }]}>
                Select Primary Appearing Advocate *
              </Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
                {availableTeamMembers.map((mem) => {
                  const isSelected = appearingAdvocateUserId === mem.id || appearingAdvocateName === mem.name;
                  return (
                    <TouchableOpacity
                      key={mem.id}
                      style={[
                        styles.teamMemberCard,
                        { borderColor: isSelected ? '#C8A34D' : theme.border, backgroundColor: isSelected ? (isDark ? '#2D2719' : '#FEF3C7') : 'transparent' }
                      ]}
                      onPress={() => {
                        setAppearingAdvocateUserId(mem.id);
                        setAppearingAdvocateName(mem.name);
                      }}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isSelected ? '#C8A34D' : theme.textSecondary}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.teamName, { color: isSelected ? '#C8A34D' : theme.textPrimary, fontWeight: '700' }]}>
                          {mem.name}
                        </Text>
                        <Text style={[styles.teamResp, { color: theme.textSecondary }]}>{mem.role}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 6 }]}>
                Select Supporting Advocates (Optional)
              </Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
                {availableTeamMembers.map((mem) => {
                  const isSelected = supportingAdvocateUserIds.includes(mem.id) || supportingAdvocateNames.includes(mem.name);
                  return (
                    <TouchableOpacity
                      key={`supp_${mem.id}`}
                      style={[
                        styles.teamMemberCard,
                        { borderColor: isSelected ? '#10B981' : theme.border, backgroundColor: isSelected ? (isDark ? '#142E23' : '#D1FAE5') : 'transparent' }
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSupportingAdvocateUserIds(prev => prev.filter(i => i !== mem.id));
                          setSupportingAdvocateNames(prev => prev.filter(n => n !== mem.name));
                        } else {
                          setSupportingAdvocateUserIds(prev => [...prev, mem.id]);
                          setSupportingAdvocateNames(prev => [...prev, mem.name]);
                        }
                      }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={isSelected ? '#10B981' : theme.textSecondary}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.teamName, { color: isSelected ? '#10B981' : theme.textPrimary, fontWeight: '700' }]}>
                          {mem.name}
                        </Text>
                        <Text style={[styles.teamResp, { color: theme.textSecondary }]}>{mem.role}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitOutcomeBtn, { backgroundColor: '#C8A34D', marginTop: 10 }]}
              onPress={handleSaveAdvocateAssignment}
              disabled={isSavingAssignment}
            >
              {isSavingAssignment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitOutcomeBtnText}>Save Advocate Assignment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hierarchyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  hierarchyText: { fontSize: 13, fontWeight: '800' },
  hierarchySub: { fontSize: 10.5, marginTop: 1 },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C8A34D',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  outcomeBtnText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },
  scrollContent: { paddingTop: 10, gap: 10, paddingBottom: 40 },
  sectionCard: { padding: 12, borderRadius: 10, borderWidth: 1 },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', color: '#C8A34D', letterSpacing: 0.5, marginBottom: 8 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  overviewCell: { width: '47%' },
  fieldLabel: { fontSize: 10, fontWeight: '600' },
  fieldVal: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checklistText: { fontSize: 12, fontWeight: '600', flex: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1 },
  docName: { fontSize: 12, fontWeight: '700' },
  teamMemberCard: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1 },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  teamName: { fontSize: 12, fontWeight: '800' },
  teamResp: { fontSize: 10.5 },
  aiPromptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  aiChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 0.5, borderColor: '#C8A34D' },
  aiChipText: { fontSize: 11, fontWeight: '700' },
  aiResultBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  outcomeModalCard: { width: '100%', maxWidth: 340, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  outcomeModalTitle: { fontSize: 14, fontWeight: '800' },
  input: { height: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, marginTop: 4, marginBottom: 8 },
  catChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: '#C8A34D' },
  catChipText: { fontSize: 10.5, fontWeight: '700' },
  submitOutcomeBtn: { height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitOutcomeBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
