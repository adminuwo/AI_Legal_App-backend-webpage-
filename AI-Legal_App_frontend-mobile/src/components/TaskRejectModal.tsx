import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';

interface Props {
  visible: boolean;
  taskTitle: string;
  onClose: () => void;
  onRejectSubmit: (reason: string) => void;
}

export const TaskRejectModal: React.FC<Props> = ({
  visible,
  taskTitle,
  onClose,
  onRejectSubmit,
}) => {
  const { isDark } = useThemeContext();

  const cardBg = isDark ? '#16161E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const surfaceBg = isDark ? '#1E1E2A' : '#F9FAFB';

  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onRejectSubmit(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
        <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>Reject Task Assignment</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 14 }}>
            Please state the reason for rejecting <Text style={{ fontWeight: '700', color: textPrimary }}>"{taskTitle}"</Text>. This will be sent to the assigner.
          </Text>

          <TextInput
            style={{
              minHeight: 80,
              borderWidth: 1,
              borderColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              color: textPrimary,
              backgroundColor: surfaceBg,
              textAlignVertical: 'top',
              marginBottom: 16,
            }}
            placeholder="e.g. Currently assigned to hearing prep / conflicting schedule..."
            placeholderTextColor={textSecondary}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: surfaceBg, borderWidth: 1, borderColor, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Confirm Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
