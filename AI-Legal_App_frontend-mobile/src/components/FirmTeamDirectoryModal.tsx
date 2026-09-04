import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, useToastContext, useWorkspaceContext, TeamMember } from '@/providers';
import { Shadows } from '@/theme';
import { apiClient } from '@/api/client';
import { useUserStore } from '@/store/user';

interface FirmTeamDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
  onLaunchInviteTeam?: () => void;
}

const FILTER_CHIPS = [
  'All Members',
  'Active',
  'Pending Invitations',
  'Suspended',
  'Senior Advocates',
  'Junior Advocates',
  'Researchers',
  'Interns',
];

export const FirmTeamDirectoryModal: React.FC<FirmTeamDirectoryModalProps> = ({
  visible,
  onClose,
  onLaunchInviteTeam,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const { members, teamStats, activeWorkspace, workspaces, refreshTeamMembers } = useWorkspaceContext();

  const targetWorkspace = useMemo(() => {
    if (activeWorkspace && activeWorkspace.id !== 'personal_practice') {
      return activeWorkspace;
    }
    const firmWs = Array.isArray(workspaces) ? workspaces.find((w) => w.id !== 'personal_practice' || w.type === 'law_firm') : null;
    return firmWs || activeWorkspace;
  }, [activeWorkspace, workspaces]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Members');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Selected Member Modal States
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<TeamMember | null>(null);
  const [selectedMemberForActions, setSelectedMemberForActions] = useState<TeamMember | null>(null);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<TeamMember | null>(null);
  const [selectedMemberForRemove, setSelectedMemberForRemove] = useState<TeamMember | null>(null);

  // Edit Form State
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editPermission, setEditPermission] = useState('Standard Member');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reassignment State for Removal
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>('');
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  // Fetch live pending invitations on mount or visibility
  useEffect(() => {
    if (visible && targetWorkspace?.id) {
      if (typeof refreshTeamMembers === 'function') {
        refreshTeamMembers(targetWorkspace.id);
      }
      fetchPendingInvitations();
    }
  }, [visible, targetWorkspace?.id, refreshTeamMembers]);

  const fetchPendingInvitations = async () => {
    if (!targetWorkspace?.id) return;
    try {
      setIsLoadingPending(true);
      const res = await apiClient.get(`/workspaces/${targetWorkspace.id}/invitations/pending`);
      if (res.data && res.data.success && Array.isArray(res.data.invitations)) {
        setPendingInvitations(res.data.invitations);
      }
    } catch (err) {
      console.warn('[FirmTeamDirectory] Failed to fetch pending invitations:', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const activeRoster = useMemo(() => {
    if (members && members.length > 0) {
      return members;
    }
    const profile = useUserStore.getState().profile;
    const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
    const userProfileAdv = profileName
      ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
      : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : 'Adv. Advocate');

    return [
      {
        id: 'owner_default',
        userId: 'owner_default',
        name: userProfileAdv,
        fullName: userProfileAdv,
        email: profile?.email || 'lawyer@firm.com',
        phone: '+91 98765 43210',
        avatar: '⚖️',
        role: 'Managing Partner',
        department: 'Corporate & Litigation',
        permission: 'Administrator',
        status: 'Accepted' as const,
        isOwner: true,
        joinedDate: new Date(),
      },
    ];
  }, [members]);

  // Filtered Members Roster
  const filteredMembers = useMemo(() => {
    let list = activeRoster;

    // Category Filter
    if (activeFilter === 'Active') {
      list = list.filter((m) => m.status === 'Accepted' || m.status === 'Active');
    } else if (activeFilter === 'Suspended') {
      list = list.filter((m) => m.status === 'Suspended');
    } else if (activeFilter === 'Senior Advocates') {
      list = list.filter((m) => m.role?.toLowerCase().includes('senior') || m.role?.toLowerCase().includes('partner'));
    } else if (activeFilter === 'Junior Advocates') {
      list = list.filter((m) => m.role?.toLowerCase().includes('junior') || m.role?.toLowerCase().includes('associate'));
    } else if (activeFilter === 'Researchers') {
      list = list.filter((m) => m.role?.toLowerCase().includes('research') || m.department?.toLowerCase().includes('research'));
    } else if (activeFilter === 'Interns') {
      list = list.filter((m) => m.role?.toLowerCase().includes('intern') || m.role?.toLowerCase().includes('clerk'));
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
    }

    // Always sort Firm Owner to top
    return list.slice().sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));
  }, [activeRoster, activeFilter, searchQuery]);

  const filteredPending = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return pendingInvitations.filter(
        (i) =>
          i.fullName?.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          i.role?.toLowerCase().includes(q)
      );
    }
    return pendingInvitations;
  }, [pendingInvitations, searchQuery]);

  const handleOpenEditModal = (member: TeamMember) => {
    setSelectedMemberForEdit(member);
    setEditRole(member.role || 'Associate Advocate');
    setEditDept(member.department || 'General Practice');
    setEditPermission(member.permission || 'Standard Member');
  };

  const handleSaveEditRole = async () => {
    if (!selectedMemberForEdit || !activeWorkspace?.id) return;
    try {
      setIsSubmittingEdit(true);
      await apiClient.put(`/workspaces/${activeWorkspace.id}/members/${selectedMemberForEdit.id}/role`, {
        role: editRole,
        department: editDept,
        permission: editPermission,
      });
      setIsSubmittingEdit(false);
      showToast('success', 'Role & Permissions Updated', `${selectedMemberForEdit.name}'s role has been updated.`);
      setSelectedMemberForEdit(null);
      if (typeof refreshTeamMembers === 'function') refreshTeamMembers(activeWorkspace.id);
    } catch (err: any) {
      setIsSubmittingEdit(false);
      showToast('error', 'Update Failed', err.message || 'Could not update member.');
    }
  };

  const handleToggleSuspend = (member: TeamMember) => {
    if (member.isOwner) {
      Alert.alert('Action Restricted', 'The Firm Owner cannot be suspended.');
      return;
    }

    const isSuspended = member.status === 'Suspended';
    const actionText = isSuspended ? 'Reactivate' : 'Suspend';

    Alert.alert(
      `${actionText} Member`,
      `Are you sure you want to ${actionText.toLowerCase()} ${member.name}? ${
        isSuspended
          ? 'They will regain access to this Law Firm Workspace.'
          : 'They will temporarily lose access to firm cases and documents. Personal Practice remains unaffected.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (activeWorkspace?.id) {
                await apiClient.put(`/workspaces/${activeWorkspace.id}/members/${member.id}/status`, {
                  status: isSuspended ? 'Active' : 'Suspended',
                });
                showToast('info', `Member ${actionText}d`, `${member.name} has been ${actionText.toLowerCase()}d.`);
                if (typeof refreshTeamMembers === 'function') refreshTeamMembers(activeWorkspace.id);
              }
            } catch (err: any) {
              showToast('error', 'Status Update Failed', err.message || 'Action failed.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmRemoveMember = async () => {
    if (!selectedMemberForRemove || !activeWorkspace?.id) return;
    try {
      setIsSubmittingRemove(true);
      await apiClient.post(`/workspaces/${activeWorkspace.id}/members/${selectedMemberForRemove.id}/remove`, {
        transferToUserId: transferTargetUserId || undefined,
      });
      setIsSubmittingRemove(false);
      showToast('success', 'Member Removed', `${selectedMemberForRemove.name} was removed from firm.`);
      setSelectedMemberForRemove(null);
      setTransferTargetUserId('');
      if (typeof refreshTeamMembers === 'function') refreshTeamMembers(activeWorkspace.id);
    } catch (err: any) {
      setIsSubmittingRemove(false);
      showToast('error', 'Removal Failed', err.message || 'Failed to remove member.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Full-Page Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Firm Team Directory</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {targetWorkspace?.name || 'Law Firm Workspace'}  •  Live Team & RBAC Roster
            </Text>
          </View>
          {onLaunchInviteTeam && (
            <TouchableOpacity
              style={[styles.inviteSmallBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => {
                onClose();
                onLaunchInviteTeam();
              }}
            >
              <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
              <Text style={styles.inviteSmallBtnText}>+ Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Live Statistics Banner */}
          <View style={[styles.statsBanner, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.sm]}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: theme.textPrimary }]}>{teamStats?.totalMembers || members?.length || 1}</Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>Total Members</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#10B981' }]}>{teamStats?.activeMembers || members?.length || 1}</Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>Active</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#F59E0B' }]}>{pendingInvitations.length}</Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>Pending Invites</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#3B82F6' }]}>{teamStats?.departmentsCount || 1}</Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>Departments</Text>
              </View>
            </View>
          </View>

          {/* Search Input Box */}
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search member by name, role or department..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips Scroll View */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeFilter === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                        borderColor: isActive ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setActiveFilter(chip)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? '#C8A34D' : theme.textSecondary }}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* SECTION 1: Active Firm Members */}
          {activeFilter !== 'Pending Invitations' && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                  Active Members ({filteredMembers.length})
                </Text>
                <TouchableOpacity onPress={() => { if (typeof refreshTeamMembers === 'function') refreshTeamMembers(activeWorkspace?.id); }}>
                  <Ionicons name="refresh-outline" size={18} color="#C8A34D" />
                </TouchableOpacity>
              </View>

              {filteredMembers.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
                    No members match your filter criteria.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {filteredMembers.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberCard, { backgroundColor: theme.card, borderColor: m.isOwner ? '#C8A34D' : theme.border }, Shadows.sm]}
                      onPress={() => setSelectedMemberForProfile(m)}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: m.isOwner ? '#C8A34D' : '#3B82F6' }]}>
                        <Text style={styles.avatarInitials}>
                          {m.name.split(' ')[1]?.[0] || m.name[0] || 'A'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.memberNameText, { color: theme.textPrimary }]}>{m.name}</Text>
                          {m.isOwner && (
                            <View style={styles.ownerBadge}>
                              <Text style={styles.ownerBadgeText}>👑 Firm Owner</Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.memberRoleText, { color: theme.textSecondary }]}>
                          {m.role} • {m.department}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          {m.status === 'Suspended' ? (
                            <View style={[styles.statusPill, { backgroundColor: '#EF444418' }]}>
                              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                              <Text style={[styles.statusPillText, { color: '#EF4444' }]}>Suspended</Text>
                            </View>
                          ) : (
                            <View style={styles.statusPill}>
                              <View style={styles.statusDot} />
                              <Text style={styles.statusPillText}>Active</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 11, color: theme.textMuted }}>{m.permission}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.moreActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedMemberForActions(m);
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* SECTION 2: Pending Invitations */}
          {(activeFilter === 'All Members' || activeFilter === 'Pending Invitations') && (
            <View style={{ marginBottom: 30 }}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                Pending Invitations ({filteredPending.length})
              </Text>

              {filteredPending.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
                    No pending invitations.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 8 }}>
                  {filteredPending.map((inv) => (
                    <View
                      key={inv._id || inv.id}
                      style={[styles.pendingCard, { backgroundColor: theme.card, borderColor: '#F59E0B' }]}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.avatarInitials}>
                          {inv.fullName?.[0] || 'I'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.memberNameText, { color: theme.textPrimary }]}>{inv.fullName}</Text>
                        <Text style={[styles.memberRoleText, { color: theme.textSecondary }]}>
                          {inv.role} • {inv.department || 'General Practice'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                          {inv.email || inv.mobile}
                        </Text>
                      </View>

                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>Awaiting Acceptance</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* MODAL A: Member Profile Details Modal */}
        <Modal
          visible={Boolean(selectedMemberForProfile)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedMemberForProfile(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMemberForProfile(null)}
          >
            <TouchableOpacity style={[styles.profileCardModal, { backgroundColor: theme.surface }]} activeOpacity={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.profileModalTitle, { color: theme.textPrimary }]}>Member Profile</Text>
                <TouchableOpacity onPress={() => setSelectedMemberForProfile(null)}>
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedMemberForProfile && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <View style={[styles.largeAvatar, { backgroundColor: selectedMemberForProfile.isOwner ? '#C8A34D' : '#3B82F6' }]}>
                      <Text style={styles.largeAvatarText}>
                        {selectedMemberForProfile.name.split(' ')[1]?.[0] || selectedMemberForProfile.name[0] || 'A'}
                      </Text>
                    </View>
                    <Text style={[styles.profileName, { color: theme.textPrimary }]}>{selectedMemberForProfile.name}</Text>
                    <Text style={[styles.profileRole, { color: theme.textSecondary }]}>{selectedMemberForProfile.role}</Text>
                    {selectedMemberForProfile.isOwner && (
                      <View style={[styles.ownerBadge, { marginTop: 6 }]}>
                        <Text style={styles.ownerBadgeText}>👑 Firm Owner & Managing Partner</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.infoGrid, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Department</Text>
                      <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{selectedMemberForProfile.department}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Permission Level</Text>
                      <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{selectedMemberForProfile.permission}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
                      <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{selectedMemberForProfile.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Mobile</Text>
                      <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{selectedMemberForProfile.phone || 'N/A'}</Text>
                    </View>
                    {selectedMemberForProfile.barCouncilNo ? (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Bar Council No.</Text>
                        <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{selectedMemberForProfile.barCouncilNo}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Status</Text>
                      <Text style={[styles.infoVal, { color: '#10B981', fontWeight: '800' }]}>Active Member</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.closeProfileBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={() => setSelectedMemberForProfile(null)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Done</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* MODAL B: Quick Actions Sheet Modal */}
        <Modal
          visible={Boolean(selectedMemberForActions)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedMemberForActions(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMemberForActions(null)}
          >
            <View style={[styles.actionsSheet, { backgroundColor: theme.surface }]}>
              <View style={styles.dragHandle} />
              <Text style={[styles.actionSheetTitle, { color: theme.textPrimary }]}>
                {selectedMemberForActions?.name}
              </Text>
              <Text style={[styles.actionSheetSub, { color: theme.textSecondary }]}>
                {selectedMemberForActions?.role} • {selectedMemberForActions?.department}
              </Text>

              <View style={{ gap: 8, marginTop: 14 }}>
                <TouchableOpacity
                  style={[styles.actionRowBtn, { borderColor: theme.border }]}
                  onPress={() => {
                    const m = selectedMemberForActions;
                    setSelectedMemberForActions(null);
                    setSelectedMemberForProfile(m);
                  }}
                >
                  <Ionicons name="person-outline" size={18} color="#C8A34D" />
                  <Text style={[styles.actionRowText, { color: theme.textPrimary }]}>View Full Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionRowBtn, { borderColor: theme.border }]}
                  onPress={() => {
                    const m = selectedMemberForActions;
                    setSelectedMemberForActions(null);
                    if (m) handleOpenEditModal(m);
                  }}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color="#3B82F6" />
                  <Text style={[styles.actionRowText, { color: theme.textPrimary }]}>Edit Role & Permissions</Text>
                </TouchableOpacity>

                {!selectedMemberForActions?.isOwner && (
                  <TouchableOpacity
                    style={[styles.actionRowBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      const m = selectedMemberForActions;
                      setSelectedMemberForActions(null);
                      if (m) handleToggleSuspend(m);
                    }}
                  >
                    <Ionicons
                      name={selectedMemberForActions?.status === 'Suspended' ? 'play-circle-outline' : 'pause-circle-outline'}
                      size={18}
                      color="#F59E0B"
                    />
                    <Text style={[styles.actionRowText, { color: theme.textPrimary }]}>
                      {selectedMemberForActions?.status === 'Suspended' ? 'Reactivate Member' : 'Suspend Member'}
                    </Text>
                  </TouchableOpacity>
                )}

                {!selectedMemberForActions?.isOwner && (
                  <TouchableOpacity
                    style={[styles.actionRowBtn, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                    onPress={() => {
                      const m = selectedMemberForActions;
                      setSelectedMemberForActions(null);
                      if (m) setSelectedMemberForRemove(m);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.actionRowText, { color: '#EF4444' }]}>Remove from Firm</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL C: Edit Role & Permissions Modal */}
        <Modal
          visible={Boolean(selectedMemberForEdit)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedMemberForEdit(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMemberForEdit(null)}
          >
            <TouchableOpacity style={[styles.profileCardModal, { backgroundColor: theme.surface }]} activeOpacity={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.profileModalTitle, { color: theme.textPrimary }]}>Edit Role & Permissions</Text>
                <TouchableOpacity onPress={() => setSelectedMemberForEdit(null)}>
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedMemberForEdit && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Professional Role</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={editRole}
                    onChangeText={setEditRole}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 10 }]}>Department</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={editDept}
                    onChangeText={setEditDept}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 10 }]}>Permission Level</Text>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {['View Only', 'Standard Member', 'Case Editor', 'Manager', 'Administrator'].map((perm) => (
                      <TouchableOpacity
                        key={perm}
                        style={[
                          styles.permOption,
                          {
                            backgroundColor: editPermission === perm ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                            borderColor: editPermission === perm ? '#C8A34D' : theme.border,
                          },
                        ]}
                        onPress={() => setEditPermission(perm)}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: editPermission === perm ? '800' : '600', color: editPermission === perm ? '#C8A34D' : theme.textPrimary }}>
                          {perm}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#C8A34D', marginTop: 16 }]}
                    onPress={handleSaveEditRole}
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* MODAL D: Remove Member & Work Reassignment Modal */}
        <Modal
          visible={Boolean(selectedMemberForRemove)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedMemberForRemove(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMemberForRemove(null)}
          >
            <TouchableOpacity style={[styles.profileCardModal, { backgroundColor: theme.surface }]} activeOpacity={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.profileModalTitle, { color: '#EF4444' }]}>⚠️ Remove Member</Text>
                <TouchableOpacity onPress={() => setSelectedMemberForRemove(null)}>
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedMemberForRemove && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18, marginBottom: 12 }}>
                    Remove <Text style={{ fontWeight: '800' }}>{selectedMemberForRemove.name}</Text> from {activeWorkspace?.name || 'the firm'}? They will lose access to firm cases and dockets. Their Personal Practice remains unaffected.
                  </Text>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Reassign Active Work To Another Member (Optional)</Text>
                  <View style={{ gap: 6, marginTop: 6, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={[
                        styles.permOption,
                        {
                          backgroundColor: !transferTargetUserId ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                          borderColor: !transferTargetUserId ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => setTransferTargetUserId('')}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Keep Work Unassigned</Text>
                    </TouchableOpacity>

                    {activeRoster.filter(m => m.id !== selectedMemberForRemove.id).map((other) => (
                      <TouchableOpacity
                        key={other.id}
                        style={[
                          styles.permOption,
                          {
                            backgroundColor: transferTargetUserId === other.userId ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                            borderColor: transferTargetUserId === other.userId ? '#C8A34D' : theme.border,
                          },
                        ]}
                        onPress={() => setTransferTargetUserId(other.userId)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>
                          Transfer to {other.name} ({other.role})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.saveBtn, { flex: 1, backgroundColor: theme.border }]}
                      onPress={() => setSelectedMemberForRemove(null)}
                    >
                      <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveBtn, { flex: 1, backgroundColor: '#EF4444' }]}
                      onPress={handleConfirmRemoveMember}
                      disabled={isSubmittingRemove}
                    >
                      {isSubmittingRemove ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Confirm Removal</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11.5, marginTop: 2 },
  inviteSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteSmallBtnText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  scrollContent: { padding: 16 },
  statsBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBox: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statSub: { fontSize: 10.5, marginTop: 2 },
  statDivider: { width: 1, height: 26 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeading: { fontSize: 15, fontWeight: '800' },
  emptyBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  memberNameText: { fontSize: 14, fontWeight: '800' },
  memberRoleText: { fontSize: 11.5, marginTop: 2 },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8A34D',
  },
  ownerBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#B45309' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98118',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  moreActionBtn: { padding: 8 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  pendingPill: {
    backgroundColor: '#F59E0B18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingPillText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCardModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  profileModalTitle: { fontSize: 17, fontWeight: '800' },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  profileName: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  profileRole: { fontSize: 13, marginTop: 2 },
  infoGrid: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoVal: { fontSize: 12.5, fontWeight: '700' },
  closeProfileBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    position: 'absolute',
    bottom: 0,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetTitle: { fontSize: 16, fontWeight: '800' },
  actionSheetSub: { fontSize: 12, marginTop: 2 },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionRowText: { fontSize: 13, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  formInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  permOption: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveBtn: {
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
