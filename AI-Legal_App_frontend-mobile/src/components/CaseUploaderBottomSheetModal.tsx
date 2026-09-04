import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';

export interface UploaderMember {
  userId?: string;
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  role?: string;
  email?: string;
  activeTasksCount?: number;
}

interface Props {
  visible: boolean;
  selectedUploaderId?: string | null;
  members: UploaderMember[];
  ownerInfo?: { userId?: string; name?: string; role?: string };
  onClose: () => void;
  onSelectUploader: (member: UploaderMember | null) => void;
}

export const CaseUploaderBottomSheetModal: React.FC<Props> = ({
  visible,
  selectedUploaderId,
  members = [],
  ownerInfo,
  onClose,
  onSelectUploader,
}) => {
  const { isDark } = useThemeContext();

  const GOLD = '#D4AF37';
  const cardBg = isDark ? '#16161E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const surfaceBg = isDark ? '#1E1E2A' : '#F9FAFB';

  // Combine owner and members uniquely
  const allMembersList: UploaderMember[] = React.useMemo(() => {
    const list: UploaderMember[] = [];
    const map = new Map<string, boolean>();

    if (ownerInfo?.userId) {
      const ownerName = ownerInfo.name && ownerInfo.name !== 'Firm Owner' ? ownerInfo.name : 'Firm Owner';
      list.push({
        userId: ownerInfo.userId,
        name: ownerName,
        role: ownerInfo.role || 'Firm Owner',
      });
      map.set(String(ownerInfo.userId), true);
    }

    members.forEach((m) => {
      const uId = String(m.userId || m._id || m.id || '');
      if (uId && !map.has(uId)) {
        map.set(uId, true);
        const resolvedName = m.name || m.fullName;
        list.push({
          userId: uId,
          name: (resolvedName && resolvedName !== 'Advocate' && resolvedName !== 'Team Member') ? resolvedName : 'Member information unavailable',
          role: m.role || '',
        });
      }
    });

    return list;
  }, [members, ownerInfo]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '75%',
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            borderWidth: 1,
            borderColor,
          }}
        >
          {/* Handle bar */}
          <View style={{ width: 40, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>Uploaded By</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Anyone Option */}
            <TouchableOpacity
              onPress={() => {
                onSelectUploader(null);
                onClose();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: !selectedUploaderId ? 'rgba(212,175,55,0.12)' : surfaceBg,
                borderWidth: 1,
                borderColor: !selectedUploaderId ? GOLD : borderColor,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="people-outline" size={20} color={!selectedUploaderId ? GOLD : textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: !selectedUploaderId ? '800' : '600', color: !selectedUploaderId ? GOLD : textPrimary }}>
                  Anyone (All Team Members)
                </Text>
              </View>
              {!selectedUploaderId && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
            </TouchableOpacity>

            {/* List of Real Members */}
            {allMembersList.map((member) => {
              const isSelected = selectedUploaderId === String(member.userId);
              return (
                <TouchableOpacity
                  key={String(member.userId)}
                  onPress={() => {
                    onSelectUploader(member);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: isSelected ? 'rgba(212,175,55,0.12)' : surfaceBg,
                    borderWidth: 1,
                    borderColor: isSelected ? GOLD : borderColor,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isSelected ? GOLD : 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#000' : GOLD }}>
                        {(member.name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? GOLD : textPrimary }}>
                        {member.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
                        {member.role || 'Member'}
                      </Text>
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
