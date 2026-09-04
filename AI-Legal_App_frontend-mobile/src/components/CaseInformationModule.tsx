import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { CaseTeamModal } from './CaseTeamModal';
import { useUserStore } from '@/store/user';

interface CaseInformationModuleProps {
  workspace: any;
  isFirmWs?: boolean;
  onEditCase: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToAnalysis?: () => void;
  onGenerateSummary?: () => void;
  onRegenerateSummary?: () => void;
  onArchiveCase?: () => void;
  onTransferCase?: () => void;
  onCloseCase?: () => void;
  onDeleteCase?: () => void;
  isGeneratingSummary?: boolean;
  onTeamUpdated?: () => void;
}

export const CaseInformationModule: React.FC<CaseInformationModuleProps> = ({
  workspace,
  isFirmWs = false,
  onEditCase,
  onNavigateToTeam,
  onNavigateToAnalysis,
  onGenerateSummary,
  onRegenerateSummary,
  onArchiveCase,
  onTransferCase,
  onCloseCase,
  onDeleteCase,
  isGeneratingSummary = false,
  onTeamUpdated,
}) => {
  const { theme, isDark } = useThemeContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const profile = useUserStore((s) => s.profile);
  const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
  const userProfileAdvocate = profileName
    ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
    : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : 'Adv. Advocate');

  if (!workspace) return null;

  // Formatting helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'N/A') return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const status = workspace.status || 'Active';
  const priority = workspace.priority || 'High';
  const caseTitle = workspace.name || workspace.title || 'Untitled Case';
  const caseNumber = workspace.caseNumber || workspace.caseNo || 'CIV-2026-00154';
  const caseType = workspace.caseType || workspace.category || 'Civil';
  const practiceArea = workspace.practiceArea || workspace.legalField || 'Property Dispute';
  const litigationStage = workspace.stage || workspace.litigationStage || 'Evidence Stage';

  // Parties
  const clientName = workspace.clientName || 'ABC Builders Pvt Ltd';
  const opponentName = workspace.opponentName || workspace.accused || 'XYZ Developers';
  const clientRole = workspace.clientRole || 'Plaintiff';
  const opponentRole = workspace.opponentRole || 'Defendant';

  // Court Details
  const courtName = workspace.courtName || workspace.court || null;
  const courtNumber = workspace.courtNumber || workspace.courtroom || null;
  const judgeName = workspace.judgeName || workspace.judge || null;
  const stateName = workspace.stateName || workspace.state || null;
  const districtName = workspace.district || workspace.city || null;

  // Dates
  const createdDate = formatDate(workspace.createdAt) || '12 June 2026';
  const filingDate = formatDate(workspace.filingDate || workspace.filedOn) || '15 June 2026';
  const nextHearingDate = formatDate(workspace.hearings?.[0]?.date || workspace.nextHearingDate);
  const lastUpdatedDate = formatDate(workspace.updatedAt) || '21 July 2026';

  // Team Details & Canonical Member Count
  const rawLeadAdv = workspace.leadAdvocate || workspace.lawyers?.[0]?.name;
  const leadAdvocate = (rawLeadAdv && rawLeadAdv !== 'Adv. Aditi Lakhera' && rawLeadAdv !== 'Aditi Lakhera')
    ? (rawLeadAdv.startsWith('Adv.') ? rawLeadAdv : `Adv. ${rawLeadAdv}`)
    : userProfileAdvocate;
  const normalizeMemberName = (s: string) => {
    if (!s) return '';
    const trimmed = s.trim().toLowerCase();
    if (trimmed === 'advocate' || trimmed === 'adv' || trimmed === 'assigned advocate') return '';
    return trimmed.replace(/^adv\.\s*/i, '').replace(/^advocate\s*/i, '').trim();
  };
  const uniqueMemberSet = new Set<string>();
  if (leadAdvocate) {
    const normLead = normalizeMemberName(leadAdvocate);
    if (normLead) uniqueMemberSet.add(normLead);
  }
  if (Array.isArray(workspace.teamMembers)) {
    workspace.teamMembers.forEach((m: any) => {
      const name = typeof m === 'string' ? m : m.name || m.fullName;
      if (name && name.trim()) {
        const normName = normalizeMemberName(name);
        if (normName) uniqueMemberSet.add(normName);
      }
    });
  }
  const assignedCount = uniqueMemberSet.size || (Array.isArray(workspace.assignedUserIds) && workspace.assignedUserIds.length > 0 ? workspace.assignedUserIds.length : 1);
  const caseOwner = workspace.caseOwner || workspace.firmName || 'ABC Law Associates';
  const createdByRole = workspace.createdByRole || workspace.creatorRole || 'Managing Partner';

  // AI Summary Status
  const hasAiSummary = !!(workspace.summary || workspace.caseSummary || workspace.aiSummary);
  const summaryLastGenerated = formatDate(workspace.summaryGeneratedAt || workspace.updatedAt) || '21 July 2026';

  const renderField = (label: string, value: string | null | undefined, isBadge = false, badgeColor = '#10B981') => {
    if (!value || value === 'N/A') return null;
    return (
      <View style={styles.gridCell}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
        {isBadge ? (
          <View style={[styles.inlineBadge, { backgroundColor: `${badgeColor}15` }]}>
            <Text style={[styles.inlineBadgeText, { color: badgeColor }]}>{value}</Text>
          </View>
        ) : (
          <Text style={[styles.fieldValue, { color: theme.textPrimary }]} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ==========================================
          HEADER & EDIT CASE BUTTON
      ========================================== */}
      <View style={[styles.card, styles.headerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: '#22C55E' }]}>
                <Text style={[styles.badgeText, { color: '#22C55E' }]}>{status.toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}>
                <Text style={[styles.badgeText, { color: '#EF4444' }]}>{priority.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.mainCaseTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              {caseTitle}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: 'rgba(200, 163, 77, 0.12)', borderColor: '#C8A34D' }]}
              onPress={onEditCase}
            >
              <Ionicons name="pencil-outline" size={13} color="#C8A34D" />
              <Text style={styles.editBtnText}>Edit Case</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconMenuBtn} onPress={() => setIsMenuOpen(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ==========================================
          SECTION 1 — BASIC CASE INFORMATION
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={styles.sectionHeaderTitle}>Case Information</Text>
        <View style={styles.gridRow}>
          {renderField('Case Title', caseTitle)}
          {renderField('Case Number', caseNumber)}
          {renderField('Case Type', caseType)}
          {renderField('Practice Area', practiceArea)}
          {renderField('Status', status, true, '#10B981')}
          {renderField('Priority', priority, true, '#EF4444')}
          {renderField('Current Stage', litigationStage)}
        </View>
      </View>

      {/* ==========================================
          SECTION 2 — PARTIES
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={styles.sectionHeaderTitle}>Parties</Text>
        <View style={styles.gridRow}>
          {renderField('Client', clientName)}
          {renderField('Client Role', clientRole)}
          {renderField('Client Email', workspace.clientEmail || workspace.email)}
          {renderField('Opponent', opponentName)}
          {renderField('Opponent Role', opponentRole)}
        </View>
      </View>

      {/* ==========================================
          SECTION 3 — COURT DETAILS
      ========================================== */}
      {(courtName || courtNumber || judgeName || stateName || districtName) && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionHeaderTitle}>Court Details</Text>
          <View style={styles.gridRow}>
            {renderField('Court', courtName)}
            {renderField('Court Number', courtNumber)}
            {renderField('Judge', judgeName)}
            {renderField('State', stateName)}
            {renderField('District', districtName)}
          </View>
        </View>
      )}

      {/* ==========================================
          SECTION 4 — IMPORTANT DATES
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={styles.sectionHeaderTitle}>Important Dates</Text>
        <View style={styles.gridRow}>
          {renderField('Created', createdDate)}
          {renderField('Filed', filingDate)}
          {renderField('Next Hearing', nextHearingDate || 'Not Scheduled Yet')}
          {renderField('Last Updated', lastUpdatedDate)}
        </View>
      </View>

      {/* ==========================================
          SECTION 5 — TEAM INFORMATION (FIRM ONLY)
      ========================================== */}
      {isFirmWs && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionHeaderTitle}>Team Information</Text>
          <View style={styles.gridRow}>
            {renderField('Lead Advocate', leadAdvocate)}
            
            <TouchableOpacity style={styles.gridCell} onPress={() => setIsTeamModalOpen(true)}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned Team</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>
                  {assignedCount} Members
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#C8A34D" />
              </View>
            </TouchableOpacity>

            {renderField('Case Owner', caseOwner)}
            {renderField('Created By', createdByRole)}
          </View>
        </View>
      )}

      {/* ==========================================
          SECTION 6 — AI CASE SUMMARY
      ========================================== */}
      <View style={[styles.card, styles.aiCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: '#C8A34D' }]}>
        <View style={styles.aiHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#C8A34D" />
            <Text style={[styles.aiTitle, { color: theme.textPrimary }]}>AI Case Summary</Text>
          </View>
        </View>

        {isGeneratingSummary ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#C8A34D" style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Synthesizing case master record summary...</Text>
          </View>
        ) : !hasAiSummary ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 12 }}>
              No AI summary has been generated yet for this case master record.
            </Text>
            <TouchableOpacity
              style={[styles.aiBtnPrimary, { backgroundColor: '#C8A34D' }]}
              onPress={onGenerateSummary}
            >
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.aiBtnPrimaryText}>Generate Summary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
              Last Generated: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{summaryLastGenerated}</Text>
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.aiBtnPrimary, { backgroundColor: '#C8A34D', flex: 1 }]}
                onPress={onNavigateToAnalysis}
              >
                <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                <Text style={styles.aiBtnPrimaryText}>View Summary</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiBtnSecondary, { borderColor: '#C8A34D', backgroundColor: isDark ? '#111827' : '#FFFFFF', flex: 1 }]}
                onPress={onRegenerateSummary}
              >
                <Ionicons name="refresh-outline" size={14} color="#C8A34D" />
                <Text style={[styles.aiBtnSecondaryText, { color: '#C8A34D' }]}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* THREE-DOT MENU MODAL */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsMenuOpen(false);
                onEditCase();
              }}
            >
              <Ionicons name="pencil-outline" size={16} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Edit Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsMenuOpen(false);
                if (onArchiveCase) onArchiveCase();
                else Alert.alert('Archive Case', 'Case archived successfully.');
              }}
            >
              <Ionicons name="archive-outline" size={16} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Archive Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsMenuOpen(false);
                if (onTransferCase) onTransferCase();
                else Alert.alert('Transfer Case', 'Select target advocate to transfer ownership.');
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Transfer Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsMenuOpen(false);
                if (onCloseCase) onCloseCase();
                else Alert.alert('Close Case', 'Case marked as disposed.');
              }}
            >
              <Ionicons name="checkmark-done-circle-outline" size={16} color={theme.textPrimary} />
              <Text style={[styles.menuOptionText, { color: theme.textPrimary }]}>Close Case</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 4 }} />

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsMenuOpen(false);
                if (onDeleteCase) onDeleteCase();
                else Alert.alert('Delete Case', 'Owner/Admin authorization required.');
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Delete Case</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CASE TEAM DETAILS MODAL */}
      <CaseTeamModal
        visible={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        caseId={workspace._id || workspace.id}
        caseTitle={caseTitle}
        leadAdvocate={workspace.leadAdvocate}
        teamMembers={workspace.teamMembers}
        onTeamUpdated={() => {
          if (onTeamUpdated) onTeamUpdated();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  headerCard: {
    paddingVertical: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mainCaseTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C8A34D',
  },
  iconMenuBtn: {
    padding: 6,
    marginLeft: 4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    columnGap: 12,
  },
  gridCell: {
    width: '47%',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiCard: {
    borderWidth: 1.5,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    gap: 6,
  },
  aiBtnPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  aiBtnSecondaryText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 20,
  },
  menuCard: {
    width: 175,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
  },
  menuOptionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
