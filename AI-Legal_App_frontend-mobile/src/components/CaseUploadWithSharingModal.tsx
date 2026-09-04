import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { UploaderMember } from './CaseUploaderBottomSheetModal';

export type PermissionPreset = 'View Only' | 'Review Only' | 'Editor' | 'Reviewer / Approver' | 'Custom Access';

export interface ItemPermissions {
  view: boolean;
  download: boolean;
  comment: boolean;
  review: boolean;
  edit: boolean;
  approve: boolean;
  reject: boolean;
}

export const PRESET_PERMISSIONS: Record<PermissionPreset, ItemPermissions> = {
  'View Only': { view: true, download: true, comment: false, review: false, edit: false, approve: false, reject: false },
  'Review Only': { view: true, download: true, comment: true, review: true, edit: false, approve: false, reject: false },
  'Editor': { view: true, download: true, comment: true, review: true, edit: true, approve: false, reject: false },
  'Reviewer / Approver': { view: true, download: true, comment: true, review: true, edit: false, approve: true, reject: true },
  'Custom Access': { view: true, download: true, comment: true, review: true, edit: false, approve: false, reject: false },
};

interface MemberShareSetting {
  member: UploaderMember;
  preset: PermissionPreset;
  permissions: ItemPermissions;
}

interface Props {
  visible: boolean;
  fileName: string;
  mimeType: string;
  moduleType: 'Document' | 'Evidence';
  members: UploaderMember[];
  isFirmOwner?: boolean;
  onClose: () => void;
  onUploadSubmit: (payload: {
    name: string;
    docType: string;
    visibility: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
    sharedWith: Array<{ userId: string; name: string; role: string; permissions: ItemPermissions }>;
    defaultPermissions: ItemPermissions;
  }) => void;
}

const DOC_TYPES = ['Notice', 'Agreement', 'Proof', 'Filing', 'Other'];
const EVIDENCE_TYPES = ['Document', 'Images', 'Videos', 'Audio', 'Other'];

export const CaseUploadWithSharingModal: React.FC<Props> = ({
  visible,
  fileName,
  mimeType,
  moduleType = 'Document',
  members = [],
  isFirmOwner = false,
  onClose,
  onUploadSubmit,
}) => {
  const { isDark } = useThemeContext();

  const GOLD = '#D4AF37';
  const cardBg = isDark ? '#16161E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const surfaceBg = isDark ? '#1E1E2A' : '#F9FAFB';

  const [displayName, setDisplayName] = useState(fileName);
  const [docType, setDocType] = useState<string>(moduleType === 'Document' ? 'Other' : 'Document');
  const [visibility, setVisibility] = useState<'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE'>('TEAM');

  // Team Access Preset (when TEAM selected)
  const [teamPreset, setTeamPreset] = useState<PermissionPreset>('View Only');
  const [teamPermissions, setTeamPermissions] = useState<ItemPermissions>(PRESET_PERMISSIONS['View Only']);

  // Selected Members Map (when SELECTED chosen)
  const [selectedMembersMap, setSelectedMembersMap] = useState<Record<string, MemberShareSetting>>({});
  const [memberPresetDropOpen, setMemberPresetDropOpen] = useState<string | null>(null);

  const categoriesList = moduleType === 'Document' ? DOC_TYPES : EVIDENCE_TYPES;

  const toggleSelectMember = (m: UploaderMember) => {
    const uId = String(m.userId || m._id || m.id || m.name);
    setSelectedMembersMap((prev) => {
      const next = { ...prev };
      if (next[uId]) {
        delete next[uId];
      } else {
        next[uId] = {
          member: m,
          preset: 'View Only',
          permissions: { ...PRESET_PERMISSIONS['View Only'] },
        };
      }
      return next;
    });
  };

  const setMemberPreset = (uId: string, preset: PermissionPreset) => {
    setSelectedMembersMap((prev) => {
      if (!prev[uId]) return prev;
      return {
        ...prev,
        [uId]: {
          ...prev[uId],
          preset,
          permissions: { ...PRESET_PERMISSIONS[preset] },
        },
      };
    });
    setMemberPresetDropOpen(null);
  };

  const handleApplyUpload = () => {
    const sharedWithArray: Array<{ userId: string; name: string; role: string; permissions: ItemPermissions }> = [];

    if (visibility === 'SELECTED') {
      Object.values(selectedMembersMap).forEach((item) => {
        const uId = String(item.member.userId || item.member._id || item.member.id || '');
        if (uId) {
          sharedWithArray.push({
            userId: uId,
            name: item.member.name || 'Advocate',
            role: item.member.role || 'Member',
            permissions: item.permissions,
          });
        }
      });
    }

    onUploadSubmit({
      name: displayName || fileName,
      docType,
      visibility,
      sharedWith: sharedWithArray,
      defaultPermissions: teamPermissions,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '90%',
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            borderWidth: 1,
            borderColor,
          }}
        >
          {/* Handle Bar */}
          <View style={{ width: 40, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>Upload {moduleType} & Share</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {/* STEP 1: FILE DETAILS */}
            <View style={{ backgroundColor: surfaceBg, padding: 14, borderRadius: 14, borderWidth: 1, borderColor, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                File Name
              </Text>
              <TextInput
                style={{ height: 42, borderWidth: 1, borderColor, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: textPrimary, backgroundColor: cardBg, marginBottom: 12 }}
                value={displayName}
                onChangeText={setDisplayName}
              />

              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
                Category / Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {categoriesList.map((t) => {
                  const active = docType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setDocType(t)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: active ? 'rgba(212,175,55,0.18)' : cardBg,
                        borderWidth: 1,
                        borderColor: active ? GOLD : borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* STEP 2: SHARE WITH */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, textTransform: 'uppercase', marginBottom: 10 }}>
                Share With
              </Text>

              <View style={{ gap: 8 }}>
                {/* 1. Entire Team */}
                <TouchableOpacity
                  onPress={() => setVisibility('TEAM')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: visibility === 'TEAM' ? 'rgba(212,175,55,0.12)' : surfaceBg,
                    borderWidth: 1,
                    borderColor: visibility === 'TEAM' ? GOLD : borderColor,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="people-outline" size={20} color={visibility === 'TEAM' ? GOLD : textSecondary} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: visibility === 'TEAM' ? '800' : '600', color: visibility === 'TEAM' ? GOLD : textPrimary }}>
                        Entire Team
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>Visible to all authorized case members</Text>
                    </View>
                  </View>
                  <Ionicons name={visibility === 'TEAM' ? 'radio-button-on' : 'radio-button-off'} size={20} color={visibility === 'TEAM' ? GOLD : textSecondary} />
                </TouchableOpacity>

                {/* 2. Firm Owner Only (If not Owner) */}
                {!isFirmOwner && (
                  <TouchableOpacity
                    onPress={() => setVisibility('OWNER_ONLY')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: visibility === 'OWNER_ONLY' ? 'rgba(212,175,55,0.12)' : surfaceBg,
                      borderWidth: 1,
                      borderColor: visibility === 'OWNER_ONLY' ? GOLD : borderColor,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={visibility === 'OWNER_ONLY' ? GOLD : textSecondary} />
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: visibility === 'OWNER_ONLY' ? '800' : '600', color: visibility === 'OWNER_ONLY' ? GOLD : textPrimary }}>
                          Firm Owner Only
                        </Text>
                        <Text style={{ fontSize: 11, color: textSecondary }}>Visible strictly to you & Firm Owner</Text>
                      </View>
                    </View>
                    <Ionicons name={visibility === 'OWNER_ONLY' ? 'radio-button-on' : 'radio-button-off'} size={20} color={visibility === 'OWNER_ONLY' ? GOLD : textSecondary} />
                  </TouchableOpacity>
                )}

                {/* 3. Selected Members */}
                <TouchableOpacity
                  onPress={() => setVisibility('SELECTED')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: visibility === 'SELECTED' ? 'rgba(212,175,55,0.12)' : surfaceBg,
                    borderWidth: 1,
                    borderColor: visibility === 'SELECTED' ? GOLD : borderColor,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="person-add-outline" size={20} color={visibility === 'SELECTED' ? GOLD : textSecondary} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: visibility === 'SELECTED' ? '800' : '600', color: visibility === 'SELECTED' ? GOLD : textPrimary }}>
                        Selected Members
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>Choose specific advocates & set custom permissions</Text>
                    </View>
                  </View>
                  <Ionicons name={visibility === 'SELECTED' ? 'radio-button-on' : 'radio-button-off'} size={20} color={visibility === 'SELECTED' ? GOLD : textSecondary} />
                </TouchableOpacity>

                {/* 4. Private / Only Me */}
                <TouchableOpacity
                  onPress={() => setVisibility('PRIVATE')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: visibility === 'PRIVATE' ? 'rgba(212,175,55,0.12)' : surfaceBg,
                    borderWidth: 1,
                    borderColor: visibility === 'PRIVATE' ? GOLD : borderColor,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="lock-closed-outline" size={20} color={visibility === 'PRIVATE' ? GOLD : textSecondary} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: visibility === 'PRIVATE' ? '800' : '600', color: visibility === 'PRIVATE' ? GOLD : textPrimary }}>
                        Private / Only Me
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>Only you can access this file</Text>
                    </View>
                  </View>
                  <Ionicons name={visibility === 'PRIVATE' ? 'radio-button-on' : 'radio-button-off'} size={20} color={visibility === 'PRIVATE' ? GOLD : textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 3: ACCESS CONFIGURATION */}

            {/* IF TEAM SELECTED: TEAM PRESET */}
            {visibility === 'TEAM' && (
              <View style={{ backgroundColor: surfaceBg, padding: 14, borderRadius: 14, borderWidth: 1, borderColor, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 10 }}>
                  Team Access Preset
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['View Only', 'Review Only', 'Editor', 'Reviewer / Approver'] as PermissionPreset[]).map((p) => {
                    const active = teamPreset === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => {
                          setTeamPreset(p);
                          setTeamPermissions(PRESET_PERMISSIONS[p]);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 16,
                          backgroundColor: active ? 'rgba(212,175,55,0.18)' : cardBg,
                          borderWidth: 1,
                          borderColor: active ? GOLD : borderColor,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* IF SELECTED MEMBERS CHOSEN: MEMBER LIST & PER-MEMBER PERMISSIONS */}
            {visibility === 'SELECTED' && (
              <View style={{ backgroundColor: surfaceBg, padding: 14, borderRadius: 14, borderWidth: 1, borderColor, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 10 }}>
                  Select Team Members & Assign Access
                </Text>

                {members.length === 0 ? (
                  <Text style={{ fontSize: 13, color: textSecondary, paddingVertical: 10 }}>No other team members found in case.</Text>
                ) : (
                  members.map((m) => {
                    const uId = String(m.userId || m._id || m.id || m.name);
                    const isSelected = !!selectedMembersMap[uId];
                    const shareInfo = selectedMembersMap[uId];
                    const displayName = (m.name && m.name !== 'Advocate' && m.name !== 'Team Member') ? m.name : 'Member information unavailable';
                    const displayRole = m.role || '';

                    return (
                      <View key={uId} style={{ backgroundColor: cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isSelected ? GOLD : borderColor, marginBottom: 10 }}>
                        <TouchableOpacity onPress={() => toggleSelectMember(m)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? GOLD : textSecondary} />
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? GOLD : textPrimary }}>{displayName}</Text>
                              {!!displayRole && <Text style={{ fontSize: 11, color: textSecondary }}>{displayRole}</Text>}
                            </View>
                          </View>
                          {isSelected && (
                            <TouchableOpacity
                              onPress={() => setMemberPresetDropOpen(memberPresetDropOpen === uId ? null : uId)}
                              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: GOLD }}>{shareInfo?.preset || 'View Only'}</Text>
                              <Ionicons name="chevron-down" size={12} color={GOLD} />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>

                        {/* Preset dropdown menu for this selected member */}
                        {isSelected && memberPresetDropOpen === uId && (
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderColor, gap: 6 }}>
                            {(['View Only', 'Review Only', 'Editor', 'Reviewer / Approver'] as PermissionPreset[]).map((p) => (
                              <TouchableOpacity
                                key={p}
                                onPress={() => setMemberPreset(uId, p)}
                                style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: shareInfo?.preset === p ? 'rgba(212,175,55,0.2)' : surfaceBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: shareInfo?.preset === p ? '800' : '500', color: shareInfo?.preset === p ? GOLD : textPrimary }}>{p}</Text>
                                {shareInfo?.preset === p && <Ionicons name="checkmark" size={14} color={GOLD} />}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: borderColor }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: surfaceBg, borderWidth: 1, borderColor, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApplyUpload}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#000000' }}>Upload & Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
