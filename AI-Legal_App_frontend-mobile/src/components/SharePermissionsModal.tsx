import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Pressable,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '@/providers';
import { ItemPermissions, SharedMemberPermission } from '@/types';
import { useUserStore } from '@/store/user';

interface SharePermissionsModalProps {
  visible: boolean;
  itemTitle: string;
  itemType: 'Document' | 'Evidence';
  currentVisibility?: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
  currentSharedWith?: SharedMemberPermission[];
  onClose: () => void;
  onSave: (visibility: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE', sharedWith: SharedMemberPermission[]) => Promise<void>;
}

export type PermissionPreset = 'View Only' | 'Review Only' | 'Editor' | 'Reviewer / Approver' | 'Custom Access';

const DEFAULT_PERMISSIONS: Record<PermissionPreset, ItemPermissions> = {
  'View Only': {
    view: true,
    download: false,
    comment: false,
    review: false,
    edit: false,
    approve: false,
    reject: false,
  },
  'Review Only': {
    view: true,
    download: true,
    comment: true,
    review: true,
    edit: false,
    approve: false,
    reject: false,
  },
  'Editor': {
    view: true,
    download: true,
    comment: true,
    review: true,
    edit: true,
    approve: false,
    reject: false,
  },
  'Reviewer / Approver': {
    view: true,
    download: true,
    comment: true,
    review: true,
    edit: false,
    approve: true,
    reject: true,
  },
  'Custom Access': {
    view: true,
    download: false,
    comment: false,
    review: false,
    edit: false,
    approve: false,
    reject: false,
  },
};

export const SharePermissionsModal: React.FC<SharePermissionsModalProps> = ({
  visible,
  itemTitle,
  itemType,
  currentVisibility = 'TEAM',
  currentSharedWith = [],
  onClose,
  onSave,
}) => {
  const { members } = useWorkspaceContext();

  const activeMembers = React.useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m: any) => ({
        id: m.id || m.userId || String(m._id),
        name: m.name || m.fullName || 'Team Member',
        role: `${m.role || 'Advocate'} • ${m.department || 'General Practice'}`,
      }));
    }
    return [
      { id: 'owner_1', name: useUserStore.getState().profile?.name ? (useUserStore.getState().profile?.name?.startsWith('Adv.') ? useUserStore.getState().profile?.name : `Adv. ${useUserStore.getState().profile?.name}`) : 'Adv. Advocate', role: 'Managing Partner' },
      { id: 'adv_1', name: 'Rahul Sharma', role: 'Junior Advocate' },
      { id: 'adv_2', name: 'Neha Verma', role: 'Senior Advocate' },
      { id: 'adv_3', name: 'Arjun Kumar', role: 'Associate Advocate' },
    ];
  }, [members]);

  const [visibility, setVisibility] = useState<'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE'>(currentVisibility);
  const [selectedPreset, setSelectedPreset] = useState<PermissionPreset>('Review Only');
  const [memberPermissions, setMemberPermissions] = useState<Record<string, { selected: boolean; permissions: ItemPermissions }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setVisibility(currentVisibility || 'TEAM');
    const initialMap: Record<string, { selected: boolean; permissions: ItemPermissions }> = {};

    activeMembers.forEach((m) => {
      const existing = (currentSharedWith || []).find((sw) => String(sw.userId) === String(m.id));
      if (existing) {
        initialMap[m.id] = {
          selected: true,
          permissions: { ...existing.permissions },
        };
      } else {
        initialMap[m.id] = {
          selected: (currentVisibility || 'TEAM') === 'TEAM',
          permissions: { ...DEFAULT_PERMISSIONS['Review Only'] },
        };
      }
    });

    setMemberPermissions(initialMap);
  }, [visible]);

  const handleApplyPresetToAll = (preset: PermissionPreset) => {
    setSelectedPreset(preset);
    if (preset === 'Custom Access') return;

    const updatedPermissions = { ...DEFAULT_PERMISSIONS[preset] };
    setMemberPermissions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((mId) => {
        next[mId] = {
          ...next[mId],
          permissions: { ...updatedPermissions },
        };
      });
      return next;
    });
  };

  const toggleMemberSelection = (mId: string) => {
    setMemberPermissions((prev) => ({
      ...prev,
      [mId]: {
        ...prev[mId],
        selected: !prev[mId]?.selected,
      },
    }));
  };

  const toggleMemberPermissionFlag = (mId: string, flag: keyof ItemPermissions) => {
    setMemberPermissions((prev) => {
      const current = prev[mId]?.permissions || { ...DEFAULT_PERMISSIONS['View Only'] };
      return {
        ...prev,
        [mId]: {
          ...prev[mId],
          permissions: {
            ...current,
            [flag]: !current[flag],
          },
        },
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sharedWithList: SharedMemberPermission[] = [];

      activeMembers.forEach((m) => {
        const entry = memberPermissions[m.id];
        if (entry && (visibility === 'TEAM' || entry.selected)) {
          sharedWithList.push({
            userId: m.id,
            name: m.name,
            role: m.role,
            permissions: entry.permissions,
          });
        }
      });

      await onSave(visibility, sharedWithList);
      onClose();
    } catch (e) {
      console.error('[SHARE SAVE ERROR]', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Share & Permissions</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {itemType}: {itemTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Section 1: Visibility Options */}
            <Text style={styles.sectionTitle}>SHARE WITH</Text>

            <TouchableOpacity
              style={[styles.visibilityOption, visibility === 'TEAM' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('TEAM')}
            >
              <Ionicons name="people" size={20} color={visibility === 'TEAM' ? '#D4AF37' : '#9CA3AF'} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, visibility === 'TEAM' && styles.activeText]}>Entire Team</Text>
                <Text style={styles.optionDesc}>All authorized firm case members can view & access according to permissions.</Text>
              </View>
              {visibility === 'TEAM' && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption, visibility === 'OWNER_ONLY' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('OWNER_ONLY')}
            >
              <Ionicons name="shield-checkmark" size={20} color={visibility === 'OWNER_ONLY' ? '#D4AF37' : '#9CA3AF'} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, visibility === 'OWNER_ONLY' && styles.activeText]}>Owner Only</Text>
                <Text style={styles.optionDesc}>Only you (uploader) and the Firm Managing Owner can view.</Text>
              </View>
              {visibility === 'OWNER_ONLY' && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption, visibility === 'SELECTED' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('SELECTED')}
            >
              <Ionicons name="person-add" size={20} color={visibility === 'SELECTED' ? '#D4AF37' : '#9CA3AF'} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, visibility === 'SELECTED' && styles.activeText]}>Selected Members</Text>
                <Text style={styles.optionDesc}>Select specific team advocates who receive access.</Text>
              </View>
              {visibility === 'SELECTED' && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption, visibility === 'PRIVATE' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('PRIVATE')}
            >
              <Ionicons name="lock-closed" size={20} color={visibility === 'PRIVATE' ? '#D4AF37' : '#9CA3AF'} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, visibility === 'PRIVATE' && styles.activeText]}>Private / Only Me</Text>
                <Text style={styles.optionDesc}>Confidential to uploader only.</Text>
              </View>
              {visibility === 'PRIVATE' && <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />}
            </TouchableOpacity>

            {/* Section 2: Permission Presets */}
            {visibility !== 'PRIVATE' && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>QUICK PERMISSION PRESET</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                  {(['View Only', 'Review Only', 'Editor', 'Reviewer / Approver', 'Custom Access'] as PermissionPreset[]).map(
                    (p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.presetChip, selectedPreset === p && styles.presetChipActive]}
                        onPress={() => handleApplyPresetToAll(p)}
                      >
                        <Text style={[styles.presetText, selectedPreset === p && styles.presetTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                {/* Section 3: Member Specific Configuration */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>CASE MEMBERS ACCESS</Text>
                {activeMembers.map((member) => {
                  const mData = memberPermissions[member.id] || {
                    selected: false,
                    permissions: DEFAULT_PERMISSIONS['Review Only'],
                  };

                  return (
                    <View key={member.id} style={styles.memberCard}>
                      <TouchableOpacity
                        style={styles.memberHeader}
                        onPress={() => toggleMemberSelection(member.id)}
                      >
                        <Ionicons
                          name={mData.selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={mData.selected ? '#D4AF37' : '#9CA3AF'}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberRole}>{member.role}</Text>
                        </View>
                      </TouchableOpacity>

                      {mData.selected && (
                        <View style={styles.flagsGrid}>
                          <TouchableOpacity
                            style={[styles.flagBadge, mData.permissions.view && styles.flagBadgeActive]}
                            onPress={() => toggleMemberPermissionFlag(member.id, 'view')}
                          >
                            <Text style={[styles.flagText, mData.permissions.view && styles.flagTextActive]}>View</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.flagBadge, mData.permissions.download && styles.flagBadgeActive]}
                            onPress={() => toggleMemberPermissionFlag(member.id, 'download')}
                          >
                            <Text style={[styles.flagText, mData.permissions.download && styles.flagTextActive]}>Download</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.flagBadge, mData.permissions.review && styles.flagBadgeActive]}
                            onPress={() => toggleMemberPermissionFlag(member.id, 'review')}
                          >
                            <Text style={[styles.flagText, mData.permissions.review && styles.flagTextActive]}>Review</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.flagBadge, mData.permissions.edit && styles.flagBadgeActive]}
                            onPress={() => toggleMemberPermissionFlag(member.id, 'edit')}
                          >
                            <Text style={[styles.flagText, mData.permissions.edit && styles.flagTextActive]}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.flagBadge, mData.permissions.approve && styles.flagBadgeActive]}
                            onPress={() => toggleMemberPermissionFlag(member.id, 'approve')}
                          >
                            <Text style={[styles.flagText, mData.permissions.approve && styles.flagTextActive]}>Approve/Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <Text style={styles.saveText}>Save Permissions</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  visibilityOptionActive: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#D4AF37',
  },
  optionDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipActive: {
    backgroundColor: '#D4AF37',
  },
  presetText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#111111',
  },
  memberCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  flagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
  },
  flagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3A3A3C',
    marginRight: 6,
    marginBottom: 6,
  },
  flagBadgeActive: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  flagText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  flagTextActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  cancelText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: 14,
  },
});
