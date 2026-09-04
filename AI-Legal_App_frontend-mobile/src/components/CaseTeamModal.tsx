import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { apiClient } from '@/api/client';
import { useUserStore } from '@/store/user';

export interface CaseTeamMember {
  id: string;
  userId?: string;
  name: string;
  avatarIcon: string;
  avatar?: string;
  roleInCase: string; // e.g. 'Lead Advocate', 'Assigned Advocate', 'Senior Advocate', 'Junior Advocate', 'Legal Researcher', 'Paralegal'
  firmDesignation: string; // e.g. 'Managing Partner', 'Associate Advocate'
  department: string;
  status: 'active' | 'pending' | 'removed';
  isLead: boolean;
  isOwner: boolean;
  email?: string;
  phone?: string;
}

interface CaseTeamModalProps {
  visible: boolean;
  onClose: () => void;
  caseId?: string;
  caseTitle: string;
  leadAdvocate?: string;
  teamMembers?: string[] | any[];
  currentUserRole?: 'Owner' | 'Managing Partner' | 'Senior Advocate' | 'Junior Advocate' | string;
  onTeamUpdated?: () => void;
}

const AVAILABLE_CASE_ROLES = [
  'Lead Advocate',
  'Senior Advocate',
  'Junior Advocate',
  'Assigned Advocate',
  'Researcher',
  'Paralegal',
];

export const CaseTeamModal: React.FC<CaseTeamModalProps> = ({
  visible,
  onClose,
  caseId,
  caseTitle,
  leadAdvocate,
  teamMembers,
  currentUserRole = 'Managing Partner',
  onTeamUpdated,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { members: firmMembers, activeWorkspace, refreshTeamMembers } = useWorkspaceContext();

  const [selectedMember, setSelectedMember] = useState<CaseTeamMember | null>(null);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [selectedTeamMemberNames, setSelectedTeamMemberNames] = useState<string[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Role Change state
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [pendingNewRole, setPendingNewRole] = useState<string | null>(null);
  const [isConfirmingRoleChange, setIsConfirmingRoleChange] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Remove Member state
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removedMemberKeys, setRemovedMemberKeys] = useState<string[]>([]);

  // RBAC Permission checks
  const canManageTeam =
    currentUserRole === 'Owner' ||
    currentUserRole === 'Managing Partner' ||
    currentUserRole === 'Senior Advocate' ||
    currentUserRole === 'Lead Advocate';

  // 1. Build Dynamic & Deduplicated Case Team Roster from case assignments & firm members
  const dynamicTeamList = useMemo<CaseTeamMember[]>(() => {
    const roster: CaseTeamMember[] = [];
    const seenKeys = new Set<string>();
    const firmRoster = firmMembers || [];

    const profile = useUserStore.getState().profile;
    const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
    const userProfileAdv = profileName
      ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
      : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : 'Adv. Advocate');

    const leadName = (leadAdvocate && leadAdvocate !== 'Adv. Aditi Lakhera' && leadAdvocate !== 'Aditi Lakhera')
      ? (leadAdvocate.startsWith('Adv.') ? leadAdvocate : `Adv. ${leadAdvocate}`)
      : (firmRoster.find((m) => m.isOwner)?.name || userProfileAdv);
    const leadFirmMatch = firmRoster.find((m) => m.name === leadName || m.fullName === leadName);

    // 1. Lead Advocate
    const leadKey = leadFirmMatch?.userId || leadFirmMatch?.id || leadName.toLowerCase();
    seenKeys.add(leadKey);
    roster.push({
      id: leadFirmMatch?.id || 'lead_owner',
      userId: leadFirmMatch?.userId || leadFirmMatch?.id || 'lead_user_id',
      name: leadName,
      avatarIcon: '⚖️',
      avatar: leadFirmMatch?.avatar,
      roleInCase: 'Lead Advocate',
      firmDesignation: leadFirmMatch?.role || 'Managing Partner',
      department: leadFirmMatch?.department || 'Corporate & Litigation',
      status: 'active',
      isLead: true,
      isOwner: Boolean(leadFirmMatch?.isOwner),
      email: leadFirmMatch?.email || 'aditi@uwo24.com',
      phone: leadFirmMatch?.phone || '+91 98765 43210',
    });

    // 2. Parse assigned members without duplicates
    let assignedList: any[] = [];
    if (Array.isArray(teamMembers)) {
      assignedList = teamMembers;
    }

    assignedList.forEach((item, idx) => {
      const name = typeof item === 'string' ? item : item.name || item.fullName;
      const roleInCase = typeof item === 'object' && item.caseRole ? item.caseRole : null;
      if (!name || name === leadName) return;

      const match = firmRoster.find((m) => m.name === name || m.fullName === name || m.userId === item.userId || m.id === item.id);
      const key = match?.userId || match?.id || name.toLowerCase();

      if (!seenKeys.has(key)) {
        seenKeys.add(key);

        let derivedRole = roleInCase;
        if (!derivedRole) {
          if (match?.role?.includes('Research')) derivedRole = 'Researcher';
          else if (match?.role?.includes('Paralegal')) derivedRole = 'Paralegal';
          else if (match?.role?.includes('Junior')) derivedRole = 'Junior Advocate';
          else if (match?.role?.includes('Senior')) derivedRole = 'Senior Advocate';
          else derivedRole = 'Assigned Advocate';
        }

        roster.push({
          id: match?.id || match?.userId || (typeof item === 'object' && (item.id || item.userId) ? (item.id || item.userId) : name),
          userId: match?.userId || match?.id || (typeof item === 'object' ? item.userId : undefined),
          name: name,
          avatarIcon: '👤',
          avatar: match?.avatar,
          roleInCase: derivedRole,
          firmDesignation: match?.role || 'Associate Advocate',
          department: match?.department || 'Civil & Criminal Practice',
          status: match?.status === 'Suspended' ? 'removed' : 'active',
          isLead: derivedRole === 'Lead Advocate',
          isOwner: Boolean(match?.isOwner),
          email: match?.email || `${name.toLowerCase().replace(/\s+/g, '.')}@uwo24.com`,
          phone: match?.phone || '+91 99085 69895',
        });
      }
    });

    return roster.filter(
      (m) =>
        !removedMemberKeys.includes(m.id) &&
        !removedMemberKeys.includes(m.name) &&
        !removedMemberKeys.includes(m.userId || '')
    );
  }, [firmMembers, leadAdvocate, teamMembers, removedMemberKeys]);

  // Role Normalization Helper & Dynamic Summary Counts
  const roleCounts = useMemo(() => {
    let lead = 0;
    let advocates = 0;
    let research = 0;
    let paralegal = 0;

    dynamicTeamList.forEach((m) => {
      const r = m.roleInCase.toLowerCase();
      if (m.isLead || r === 'lead advocate') {
        lead++;
      } else if (r.includes('research')) {
        research++;
      } else if (r.includes('paralegal') || r.includes('intern') || r.includes('assistant')) {
        paralegal++;
      } else {
        advocates++;
      }
    });

    return { lead, advocates, research, paralegal };
  }, [dynamicTeamList]);

  // Lead Advocate Safety Check
  const checkLeadAdvocateProtection = (targetMember: CaseTeamMember, actionType: 'change' | 'remove', newRole?: string) => {
    const isTargetLead = targetMember.isLead || targetMember.roleInCase === 'Lead Advocate';
    if (!isTargetLead) return true;

    if (actionType === 'change' && newRole === 'Lead Advocate') return true;

    const otherLeads = dynamicTeamList.filter(
      (m) => m.id !== targetMember.id && m.name !== targetMember.name && (m.isLead || m.roleInCase === 'Lead Advocate')
    );

    if (otherLeads.length === 0) {
      showToast('error', 'Lead Advocate Required', 'This case must have a Lead Advocate. Assign another Lead Advocate before changing or removing this member.');
      return false;
    }
    return true;
  };

  // Change Role Handlers
  const handleInitiateRoleChange = (role: string) => {
    if (!selectedMember) return;
    if (!checkLeadAdvocateProtection(selectedMember, 'change', role)) return;

    setPendingNewRole(role);
    setIsRolePickerOpen(false);
    setIsConfirmingRoleChange(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedMember || !pendingNewRole || !caseId) return;

    try {
      setIsUpdatingRole(true);
      const res = await apiClient.put(`/projects/${caseId}/members/${selectedMember.userId || selectedMember.id}/role`, {
        newRole: pendingNewRole,
        memberName: selectedMember.name,
      });

      setIsUpdatingRole(false);
      setIsConfirmingRoleChange(false);
      setSelectedMember(null);
      setPendingNewRole(null);

      showToast('success', 'Role Updated', `Changed ${selectedMember.name}'s case role to ${pendingNewRole}.`);
      if (onTeamUpdated) onTeamUpdated();
    } catch (err: any) {
      setIsUpdatingRole(false);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to update member case role.';
      showToast('error', 'Update Error', errMsg);
    }
  };

  // Remove Member Handlers
  const handleInitiateRemoveMember = () => {
    if (!selectedMember) return;
    if (!checkLeadAdvocateProtection(selectedMember, 'remove')) return;

    setIsConfirmingRemove(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!selectedMember || !caseId) return;

    const targetId = selectedMember.id;
    const targetName = selectedMember.name;
    const targetUserId = selectedMember.userId;

    // Immediately hide member from state for instant UI responsiveness
    setRemovedMemberKeys((prev) => [...prev, targetId, targetName, targetUserId || ''].filter(Boolean));

    try {
      setIsRemovingMember(true);

      const targetParam = targetUserId || (targetId && targetId !== targetName ? targetId : '') || encodeURIComponent(targetName);
      await apiClient.delete(`/projects/${caseId}/members/${targetParam}`, {
        params: { memberName: targetName },
      });

      setIsRemovingMember(false);
      setIsConfirmingRemove(false);
      setSelectedMember(null);

      showToast('success', 'Member Removed', `Removed ${targetName} from this case.`);
      if (activeWorkspace?.id && typeof refreshTeamMembers === 'function') {
        refreshTeamMembers(activeWorkspace.id);
      }
      if (onTeamUpdated) onTeamUpdated();
    } catch (err: any) {
      setIsRemovingMember(false);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to remove member from case.';
      showToast('error', 'Removal Error', errMsg);
    }
  };

  const handleOpenEditTeam = () => {
    const currentAssignedNames = dynamicTeamList.filter((m) => !m.isLead).map((m) => m.name);
    setSelectedTeamMemberNames(currentAssignedNames);
    setIsEditTeamModalOpen(true);
  };

  const handleToggleMemberSelection = (name: string) => {
    if (selectedTeamMemberNames.includes(name)) {
      setSelectedTeamMemberNames(selectedTeamMemberNames.filter((n) => n !== name));
    } else {
      setSelectedTeamMemberNames([...selectedTeamMemberNames, name]);
    }
  };

  const handleSaveTeamEdit = async () => {
    if (!caseId) {
      setIsEditTeamModalOpen(false);
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const firmRoster = firmMembers || [];
      const assignedUserIds = firmRoster
        .filter((m) => selectedTeamMemberNames.includes(m.name) || m.isOwner)
        .map((m) => m.userId || m.id)
        .filter(Boolean);

      await apiClient.put(`/projects/${caseId}`, {
        teamMembers: selectedTeamMemberNames,
        assignedUserIds: assignedUserIds,
      });

      setIsSubmittingEdit(false);
      setIsEditTeamModalOpen(false);
      showToast('success', 'Case Team Updated', 'Case assignments have been saved.');

      if (activeWorkspace?.id && typeof refreshTeamMembers === 'function') {
        refreshTeamMembers(activeWorkspace.id);
      }
      if (onTeamUpdated) onTeamUpdated();
    } catch (err: any) {
      setIsSubmittingEdit(false);
      showToast('error', 'Update Failed', err?.message || 'Could not update case team.');
    }
  };

  const renderMemberAvatar = (m: CaseTeamMember) => {
    if (m.avatar && (m.avatar.startsWith('http://') || m.avatar.startsWith('https://'))) {
      return <Image source={{ uri: m.avatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />;
    }
    const initials = m.name?.split(' ')?.[1]?.[0] || m.name?.[0] || 'A';
    return (
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: m.isLead ? '#C8A34D' : '#3B82F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{initials}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Case Team</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {caseTitle}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* DYNAMIC TEAM SUMMARY CARD */}
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
            <Text style={styles.summaryTitle}>CASE TEAM SUMMARY</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{roleCounts.lead}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Lead Advocate</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{roleCounts.advocates}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Advocates</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{roleCounts.research}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Research</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{roleCounts.paralegal}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Paralegal</Text>
              </View>
            </View>
            <View style={[styles.summaryFooter, { borderTopColor: theme.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>Assigned to this Case</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>{dynamicTeamList.length} Members</Text>
            </View>
          </View>

          {/* DYNAMIC ASSIGNED MEMBERS LIST */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            ASSIGNED MEMBERS ({dynamicTeamList.length})
          </Text>

          <View style={{ gap: 10 }}>
            {dynamicTeamList.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  { backgroundColor: theme.card, borderColor: member.isLead ? '#C8A34D' : theme.border },
                ]}
                onPress={() => setSelectedMember(member)}
              >
                {renderMemberAvatar(member)}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.memberName, { color: theme.textPrimary }]}>{member.name}</Text>
                      {member.isLead && (
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#C8A34D' }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#B45309' }}>👑 Lead</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: '#22C55E' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={[styles.statusText, { color: '#22C55E' }]}>Active</Text>
                    </View>
                  </View>
                  <Text style={[styles.memberRole, { color: '#C8A34D' }]}>{member.roleInCase}</Text>
                  <Text style={[styles.memberDesignation, { color: theme.textSecondary }]}>
                    {member.firmDesignation} • {member.department}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* BOTTOM ACTIONS */}
        {canManageTeam && (
          <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: '#C8A34D' }]} onPress={handleOpenEditTeam}>
              <Ionicons name="person-add" size={16} color="#000000" />
              <Text style={styles.primaryActionBtnText}>Edit Case Team</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* UPGRADED CASE MEMBER DETAILS MODAL */}
        <Modal visible={Boolean(selectedMember) && !isRolePickerOpen && !isConfirmingRoleChange && !isConfirmingRemove} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMember(null)}>
            {selectedMember && (
              <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onStartShouldSetResponder={() => true}>
                <View style={styles.profileHeader}>
                  {renderMemberAvatar(selectedMember)}
                  <Text style={[styles.profileName, { color: theme.textPrimary, marginTop: 8 }]}>{selectedMember.name}</Text>
                  <Text style={[styles.profileRole, { color: '#C8A34D' }]}>{selectedMember.roleInCase}</Text>
                  <Text style={[styles.profileDesignation, { color: theme.textSecondary }]}>
                    {selectedMember.firmDesignation} • {selectedMember.department}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />

                <View style={styles.profileFieldRow}>
                  <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Email</Text>
                  <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]}>{selectedMember.email || 'N/A'}</Text>
                </View>

                <View style={styles.profileFieldRow}>
                  <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Mobile</Text>
                  <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]}>{selectedMember.phone || 'N/A'}</Text>
                </View>

                {/* CASE ACCESS SECTION */}
                <View style={[styles.caseAccessBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}>
                  <Text style={styles.accessBoxHeader}>CASE ACCESS</Text>
                  <View style={styles.profileFieldRow}>
                    <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Assigned to</Text>
                    <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]} numberOfLines={1}>{caseTitle}</Text>
                  </View>
                  <View style={styles.profileFieldRow}>
                    <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Access Status</Text>
                    <Text style={[styles.profileFieldValue, { color: '#10B981' }]}>Active Case Member</Text>
                  </View>
                </View>

                {/* MANAGEMENT ACTIONS (FOR AUTHORIZED MANAGERS) */}
                {canManageTeam && (
                  <View style={{ gap: 8, marginTop: 14 }}>
                    <TouchableOpacity
                      style={[styles.manageBtn, { backgroundColor: 'transparent', borderColor: '#C8A34D' }]}
                      onPress={() => setIsRolePickerOpen(true)}
                    >
                      <Ionicons name="create-outline" size={15} color="#C8A34D" />
                      <Text style={[styles.manageBtnText, { color: '#C8A34D' }]}>Change Role</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.manageBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}
                      onPress={handleInitiateRemoveMember}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      <Text style={[styles.manageBtnText, { color: '#EF4444' }]}>Remove from Case</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={[styles.closeProfileBtn, { backgroundColor: '#C8A34D', marginTop: 12 }]} onPress={() => setSelectedMember(null)}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </Modal>

        {/* ROLE PICKER SUB-MODAL */}
        <Modal visible={isRolePickerOpen} transparent animationType="fade" onRequestClose={() => setIsRolePickerOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsRolePickerOpen(false)}>
            <View style={[styles.editModalCard, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
              <Text style={[styles.headerTitle, { color: theme.textPrimary, marginBottom: 4 }]}>Select Case Role</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                Change {selectedMember?.name}'s assigned role for this case only.
              </Text>

              {AVAILABLE_CASE_ROLES.map((r) => {
                const isCurrent = selectedMember?.roleInCase === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOptionRow,
                      {
                        backgroundColor: isCurrent ? (isDark ? '#374151' : '#FEF8EC') : theme.card,
                        borderColor: isCurrent ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => handleInitiateRoleChange(r)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isCurrent ? '#C8A34D' : theme.textPrimary }}>{r}</Text>
                    {isCurrent && <Ionicons name="checkmark-circle" size={18} color="#C8A34D" />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={[styles.closeProfileBtn, { backgroundColor: '#374151', marginTop: 12 }]} onPress={() => setIsRolePickerOpen(false)}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ROLE CHANGE CONFIRMATION MODAL */}
        <Modal visible={isConfirmingRoleChange} transparent animationType="fade" onRequestClose={() => setIsConfirmingRoleChange(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsConfirmingRoleChange(false)}>
            <View style={[styles.editModalCard, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={styles.iconCircleWarning}>
                  <Ionicons name="swap-horizontal" size={24} color="#C8A34D" />
                </View>
                <Text style={[styles.headerTitle, { color: theme.textPrimary, marginTop: 8 }]}>Confirm Role Change</Text>
              </View>

              <Text style={{ fontSize: 13, color: theme.textPrimary, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                Change <Text style={{ fontWeight: '800' }}>{selectedMember?.name}</Text>'s case role from{' '}
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>{selectedMember?.roleInCase}</Text> to{' '}
                <Text style={{ color: '#10B981', fontWeight: '800' }}>{pendingNewRole}</Text>?
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setIsConfirmingRoleChange(false)}
                  disabled={isUpdatingRole}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                  onPress={handleConfirmRoleChange}
                  disabled={isUpdatingRole}
                >
                  {isUpdatingRole ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* REMOVE MEMBER CONFIRMATION MODAL */}
        <Modal visible={isConfirmingRemove} transparent animationType="fade" onRequestClose={() => setIsConfirmingRemove(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsConfirmingRemove(false)}>
            <View style={[styles.editModalCard, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.iconCircleWarning, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}>
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </View>
                <Text style={[styles.headerTitle, { color: theme.textPrimary, marginTop: 8 }]}>Remove from Case</Text>
              </View>

              <Text style={{ fontSize: 13, color: theme.textPrimary, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                Remove <Text style={{ fontWeight: '800' }}>{selectedMember?.name}</Text> from this case?{'\n'}
                <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                  {selectedMember?.name} will lose access to this case but will remain a member of the Law Firm.
                </Text>
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setIsConfirmingRemove(false)}
                  disabled={isRemovingMember}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                  onPress={handleConfirmRemoveMember}
                  disabled={isRemovingMember}
                >
                  {isRemovingMember ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* EDIT CASE TEAM SUB-MODAL */}
        <Modal visible={isEditTeamModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditTeamModalOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditTeamModalOpen(false)}>
            <TouchableOpacity style={[styles.editModalCard, { backgroundColor: theme.surface }]} activeOpacity={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Case Team</Text>
                <TouchableOpacity onPress={() => setIsEditTeamModalOpen(false)}>
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                Select active members from <Text style={{ fontWeight: '800' }}>{activeWorkspace?.name || 'Law Firm Workspace'}</Text> to assign to this case.
              </Text>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {(() => {
                  const leadMember = firmMembers.find(m => m.isOwner) || firmMembers[0];
                  const leadId = leadMember?.id || leadMember?.userId;
                  return firmMembers
                    .filter((m) => (m.id || m.userId) !== leadId && m.status !== 'Suspended')
                    .map((m) => {
                      const isSelected = selectedTeamMemberNames.includes(m.name);
                      return (
                        <TouchableOpacity
                          key={m.id || m.userId}
                          style={[
                            styles.editMemberRow,
                            {
                              backgroundColor: isSelected ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                              borderColor: isSelected ? '#C8A34D' : theme.border,
                            },
                          ]}
                          onPress={() => handleToggleMemberSelection(m.name)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, flex: 1 }}>
                            {m.name} <Text style={{ fontSize: 11, color: theme.textSecondary }}>({m.role})</Text>
                          </Text>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? '#C8A34D' : theme.textMuted}
                          />
                        </TouchableOpacity>
                      );
                    });
                })()}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#C8A34D', marginTop: 16 }]}
                onPress={handleSaveTeamEdit}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={[styles.primaryActionBtnText, { color: '#000000' }]}>Save Case Team</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C8A34D',
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  memberDesignation: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  editMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  profileHeader: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileRole: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  profileDesignation: {
    fontSize: 12,
    marginTop: 2,
  },
  profileFieldRow: {
    marginBottom: 8,
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileFieldValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  caseAccessBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  accessBoxHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  manageBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  closeProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  roleOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconCircleWarning: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    borderWidth: 1,
    borderColor: '#C8A34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CaseTeamModal;
