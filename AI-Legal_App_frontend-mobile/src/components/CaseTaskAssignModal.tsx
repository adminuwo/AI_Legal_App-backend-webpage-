import React, { useState } from 'react';
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

interface Props {
  visible: boolean;
  initialTitle?: string;
  initialDescription?: string;
  initialPriority?: string;
  initialCategory?: string;
  isAiSuggested?: boolean;
  members: UploaderMember[];
  onClose: () => void;
  onAssignSubmit: (payload: {
    title: string;
    description: string;
    assignedToUserId: string;
    priority: string;
    deadline: string;
    taskType: string;
    source: 'AI' | 'MANUAL';
  }) => void;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TASK_TYPES = ['Task', 'Pleading', 'Hearing Prep', 'Evidence Verification', 'Document Review', 'Client Followup', 'Research'];

export const CaseTaskAssignModal: React.FC<Props> = ({
  visible,
  initialTitle = '',
  initialDescription = '',
  initialPriority = 'Medium',
  initialCategory = 'Task',
  isAiSuggested = false,
  members = [],
  onClose,
  onAssignSubmit,
}) => {
  const { isDark } = useThemeContext();

  const GOLD = '#D4AF37';
  const cardBg = isDark ? '#16161E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const surfaceBg = isDark ? '#1E1E2A' : '#F9FAFB';

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState(initialPriority || 'Medium');
  const [taskType, setTaskType] = useState(initialCategory || 'Task');
  const [deadline, setDeadline] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<UploaderMember | null>(members[0] || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial state when modal opens
  React.useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setPriority(initialPriority || 'Medium');
      setTaskType(initialCategory || 'Task');
      setSelectedAssignee(members[0] || null);
      setIsSubmitting(false);
    }
  }, [visible, initialTitle, initialDescription, initialPriority, initialCategory, members]);

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAssignSubmit({
        title: title.trim(),
        description: description.trim(),
        assignedToUserId: selectedAssignee?.userId ? String(selectedAssignee.userId) : '',
        priority,
        deadline,
        taskType,
        source: isAiSuggested ? 'AI' : 'MANUAL',
      });
      onClose();
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Handle bar */}
          <View style={{ width: 40, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isAiSuggested && <Ionicons name="sparkles" size={18} color={GOLD} />}
              <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                {isAiSuggested ? 'Assign AI Suggested Task' : 'Create & Assign Task'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Title */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                Task Title *
              </Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg }}
                placeholder="Enter task title..."
                placeholderTextColor={textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description / Instructions */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                Instructions / Description
              </Text>
              <TextInput
                style={{ minHeight: 70, borderWidth: 1, borderColor, borderRadius: 12, padding: 12, fontSize: 13, color: textPrimary, backgroundColor: surfaceBg, textAlignVertical: 'top' }}
                placeholder="Add specific instructions for the assigned advocate..."
                placeholderTextColor={textSecondary}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Assign To (Real Case Members) */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
                Assign To Advocate
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                {members.map((m) => {
                  const uId = String(m.userId || m._id || m.id || m.name);
                  const isSelected = selectedAssignee && String(selectedAssignee.userId || selectedAssignee._id || selectedAssignee.id || selectedAssignee.name) === uId;
                  const name = (m.name && m.name !== 'Advocate' && m.name !== 'Team Member') ? m.name : (m.fullName || 'Team Member');
                  const role = m.role || '';

                  return (
                    <TouchableOpacity
                      key={uId}
                      onPress={() => setSelectedAssignee(m)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 14,
                        backgroundColor: isSelected ? 'rgba(212,175,55,0.18)' : surfaceBg,
                        borderWidth: 1,
                        borderColor: isSelected ? GOLD : borderColor,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? GOLD : textPrimary }}>
                        {name} {m.activeTasksCount !== undefined ? `(${m.activeTasksCount} active)` : ''}
                      </Text>
                      {!!role && <Text style={{ fontSize: 10, color: textSecondary, marginTop: 2 }}>{role}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Priority Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
                Priority
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRIORITIES.map((p) => {
                  const active = priority.toLowerCase() === p.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: active ? 'rgba(212,175,55,0.18)' : surfaceBg,
                        borderWidth: 1,
                        borderColor: active ? GOLD : borderColor,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Deadline / Due Date */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                Due Date / Deadline (Optional)
              </Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: surfaceBg }}
                placeholder="e.g. 28 July 2026 or 2026-07-28"
                placeholderTextColor={textSecondary}
                value={deadline}
                onChangeText={setDeadline}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: surfaceBg, borderWidth: 1, borderColor, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: isSubmitting ? 'rgba(212,175,55,0.5)' : GOLD, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#000000' }}>
                {isSubmitting ? 'Assigning...' : 'Assign Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
