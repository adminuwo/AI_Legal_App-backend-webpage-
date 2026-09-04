import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CaseWorkspace, CaseTask } from '@/types';
import { useThemeContext } from '@/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tTool } from '@/localization/toolTranslations';
import { getGlobalActiveWorkspaceType, useWorkspaceContext } from '@/providers/workspace.provider';
import { useRoleStore } from '@/store/role';
import { EnterpriseTaskWorkspace } from './EnterpriseTaskWorkspace';
import { CaseTaskAssignModal } from './CaseTaskAssignModal';
import { TaskRejectModal } from './TaskRejectModal';
import { UploaderMember } from './CaseUploaderBottomSheetModal';
import { apiClient } from '@/api/client';
import { useUserStore } from '@/store/user';

interface AiTasksWorkflowManagerProps {
  workspace: CaseWorkspace | null;
  id: string;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

const GOLD = '#D4AF37';

function PersonalTasksWorkflow({
  workspace,
  id,
  handleUpdateField,
  showToast,
  isDark,
}: {
  workspace: CaseWorkspace | null;
  id: string;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  isDark: boolean;
}) {
  const pageBg = isDark ? '#0B0B0E' : '#FFFFFF';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textSecondary = isDark ? '#8E8E93' : '#6B7280';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';

  const role = useRoleStore((s) => s.selectedRole) || 'advocate';
  const isStudent = role === 'student';

  const activeTasks = useMemo(() => workspace?.tasks || [], [workspace]);
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);

  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Today' | 'Upcoming' | 'Completed'>('All');

  // Modals & Sheets
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [deletingTask, setDeletingTask] = useState<any | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('Today');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Processing set to prevent duplicate additions
  const [processingTaskIds, setProcessingTaskIds] = useState<Set<string>>(new Set());

  // Default AI suggestions list based on role
  const defaultSuggestions = useMemo(() => {
    if (isStudent) {
      return [
        {
          id: 'ai_stu_1',
          title: 'Read the complete judgment',
          reason: 'Analyze key findings and judicial reasoning for this precedent case',
          deadline: 'Tomorrow',
          priority: 'HIGH',
        },
        {
          id: 'ai_stu_2',
          title: 'Prepare case brief',
          reason: 'Summarize facts, legal issues, party arguments, and holding ratio',
          deadline: 'In 2 days',
          priority: 'HIGH',
        },
        {
          id: 'ai_stu_3',
          title: 'Study important sections involved',
          reason: 'Review statutory provisions cited in pleadings and court orders',
          deadline: 'In 4 days',
          priority: 'MEDIUM',
        },
        {
          id: 'ai_stu_4',
          title: 'Write notes on ratio decidendi',
          reason: 'Extract binding legal principle and obiter dicta distinctions',
          deadline: 'In 3 days',
          priority: 'MEDIUM',
        },
        {
          id: 'ai_stu_5',
          title: 'Review arguments from both parties',
          reason: 'Compare petitioner and respondent submissions for comparative analysis',
          deadline: 'In 5 days',
          priority: 'MEDIUM',
        },
      ];
    }
    return [
      {
        id: 'ai_adv_1',
        title: 'Review evidence before next hearing',
        reason: 'Review electronic and physical exhibits before upcoming court date',
        deadline: 'Tomorrow',
        priority: 'HIGH',
      },
      {
        id: 'ai_adv_2',
        title: 'Prepare witness questions',
        reason: 'Cross-examination questions prep based on witness statements',
        deadline: 'In 3 days',
        priority: 'HIGH',
      },
      {
        id: 'ai_adv_3',
        title: 'Research relevant precedent',
        reason: 'Search High Court & Supreme Court rulings on key dispute points',
        deadline: 'In 5 days',
        priority: 'MEDIUM',
      },
      {
        id: 'ai_adv_4',
        title: 'Review uploaded agreement',
        reason: 'Audit commercial contract liabilities and breach notice periods',
        deadline: 'In 2 days',
        priority: 'MEDIUM',
      },
    ];
  }, [isStudent]);

  const [aiSuggestions, setAiSuggestions] = useState<any[]>(defaultSuggestions);

  const todayStr = new Date().toISOString().split('T')[0];

  // Stats Counters
  const pendingCount = useMemo(() => activeTasks.filter((t) => (t.status as string) !== 'Completed' && (t.status as string) !== 'completed').length, [activeTasks]);
  const todayCount = useMemo(() => activeTasks.filter((t) => ((t.status as string) !== 'Completed' && (t.status as string) !== 'completed') && (t.deadline === todayStr || (t as any).dueDate === todayStr || t.deadline === 'Today' || t.deadline === 'Due Today')).length, [activeTasks, todayStr]);
  const completedCount = useMemo(() => activeTasks.filter((t) => (t.status as string) === 'Completed' || (t.status as string) === 'completed').length, [activeTasks]);

  // Filter Tasks Array
  const filteredTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      const isComp = (t.status as string) === 'Completed' || (t.status as string) === 'completed';
      if (filterTab === 'Completed') return isComp;
      if (filterTab === 'Today') return !isComp && (t.deadline === todayStr || (t as any).dueDate === todayStr || t.deadline === 'Today' || t.deadline === 'Due Today');
      if (filterTab === 'Upcoming') return !isComp && (t.deadline !== todayStr && t.deadline !== 'Today' && t.deadline !== 'Due Today');
      
      return true;
    });
  }, [activeTasks, taskSearchQuery, filterTab, todayStr]);

  // Handlers
  const handleAddAiSuggestionToTasks = async (item: any) => {
    const sugId = item.id || item._id;
    if (processingTaskIds.has(sugId)) return;
    setProcessingTaskIds((prev) => new Set(prev).add(sugId));

    const newTask: CaseTask = {
      _id: 'task_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      id: 'task_' + Date.now().toString(),
      title: item.title,
      description: item.reason || item.description || '',
      priority: item.priority || 'High',
      deadline: item.deadline || 'Due Tomorrow',
      status: 'In Progress' as any,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTask, ...(workspace?.tasks || [])];

    try {
      await handleUpdateField({ tasks: updated });
      setAiSuggestions((prev) => prev.filter((s) => (s.id || s._id) !== sugId));
      showToast('success', 'Task Added', 'Task added to My Tasks');
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Failed to add task.');
    } finally {
      setProcessingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(sugId);
        return next;
      });
    }
  };

  const handleCreateTaskSubmit = async () => {
    if (!newTitle.trim()) {
      showToast('warning', 'Title Required', 'Please enter a task title.');
      return;
    }

    setIsSubmitting(true);
    const newTask: CaseTask = {
      _id: editingTask ? (editingTask._id || editingTask.id) : ('task_' + Date.now().toString()),
      id: editingTask ? (editingTask.id || editingTask._id) : ('task_' + Date.now().toString()),
      title: newTitle.trim(),
      description: newDescription.trim(),
      priority: newPriority,
      deadline: newDueDate || 'Today',
      status: editingTask ? editingTask.status : ('In Progress' as any),
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
    };

    let updated: CaseTask[];
    if (editingTask) {
      const targetId = editingTask._id || editingTask.id;
      updated = (workspace?.tasks || []).map((t: any) =>
        (t._id === targetId || t.id === targetId) ? newTask : t
      );
    } else {
      updated = [newTask, ...(workspace?.tasks || [])];
    }

    try {
      await handleUpdateField({ tasks: updated });
      setIsCreateModalOpen(false);
      setEditingTask(null);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('Today');
      setNewPriority('Medium');
      showToast('success', editingTask ? 'Task Updated' : 'Task Created', editingTask ? 'Task updated successfully' : 'Task created successfully');
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: CaseTask) => {
    const isComp = (task.status as string) === 'Completed' || (task.status as string) === 'completed';
    const nextStatus = isComp ? ('In Progress' as any) : ('Completed' as any);
    const targetId = task._id || task.id;

    const updated = (workspace?.tasks || []).map((t: any) =>
      (t._id === targetId || t.id === targetId) ? { ...t, status: nextStatus } : t
    );

    try {
      await handleUpdateField({ tasks: updated });
      showToast('success', nextStatus === 'Completed' ? 'Task Completed' : 'Task Restored', 
        nextStatus === 'Completed' ? '✓ Task marked complete' : 'Task restored to pending'
      );
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update task status.');
    }
  };

  const handleDeleteTaskSubmit = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask._id || deletingTask.id;
    const updated = (workspace?.tasks || []).filter((t: any) => t._id !== targetId && t.id !== targetId);

    try {
      await handleUpdateField({ tasks: updated });
      setDeletingTask(null);
      showToast('info', 'Deleted', 'Task deleted.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to delete task.');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* 1. Header & Subtitle */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Tasks</Text>
        <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
          Plan and track work for this case
        </Text>
      </View>

      {/* 2. Compact Counters Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1, backgroundColor: cardBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>{pendingCount}</Text>
          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2, fontWeight: '600' }}>Pending</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: cardBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#D4AF37' }}>{todayCount}</Text>
          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2, fontWeight: '600' }}>Today</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: cardBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>{completedCount}</Text>
          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2, fontWeight: '600' }}>Completed</Text>
        </View>
      </View>

      {/* 3. Search Bar */}
      <View
        style={{
          height: 42,
          backgroundColor: isDark ? '#111111' : '#F5F5F7',
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Ionicons name="search-outline" size={16} color={textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 13, color: textPrimary }}
          placeholder={tTool(outputLanguage, 'tasks.searchPlaceholder', 'Search tasks...')}
          placeholderTextColor={textSecondary}
          value={taskSearchQuery}
          onChangeText={setTaskSearchQuery}
        />
        {!!taskSearchQuery && (
          <TouchableOpacity onPress={() => setTaskSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Filter Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {(['All', 'Today', 'Upcoming', 'Completed'] as const).map((tab) => {
          const active = filterTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilterTab(tab)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: active ? (isDark ? '#2A2A38' : '#111111') : cardBg,
                borderWidth: 1,
                borderColor: active ? (isDark ? '#3A3A4C' : '#111111') : borderColor,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : textSecondary }}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. ✨ AI SUGGESTED TASKS SECTION */}
      {aiSuggestions.length > 0 && filterTab !== 'Completed' && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
              ✨ AI Suggested Tasks
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {aiSuggestions.map((item) => {
              const sugId = item.id || item._id;
              const isProcessing = processingTaskIds.has(sugId);
              return (
                <View
                  key={sugId}
                  style={{
                    backgroundColor: isDark ? 'rgba(212,175,55,0.06)' : '#FFFDF5',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#FDE68A',
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, flex: 1, marginRight: 8 }}>
                      {item.title}
                    </Text>
                    <View style={{ backgroundColor: item.priority === 'HIGH' ? '#FEE2E2' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: item.priority === 'HIGH' ? '#DC2626' : '#D97706' }}>
                        {item.priority}
                      </Text>
                    </View>
                  </View>

                  {!!item.reason && (
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                      {item.reason}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#FEF3C7' }}>
                    <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                      Due: {item.deadline}
                    </Text>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#D4AF37',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        gap: 4,
                        opacity: isProcessing ? 0.6 : 1,
                      }}
                      disabled={isProcessing}
                      onPress={() => handleAddAiSuggestionToTasks(item)}
                    >
                      <Ionicons name="add" size={14} color="#111111" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>
                        {isProcessing ? 'Adding...' : '+ Add to My Tasks'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 6. MY TASKS SECTION */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>My Tasks</Text>
        
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#D4AF37',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 10,
            gap: 4,
          }}
          onPress={() => {
            setEditingTask(null);
            setNewTitle('');
            setNewDescription('');
            setNewDueDate('Today');
            setNewPriority('Medium');
            setIsCreateModalOpen(true);
          }}
        >
          <Ionicons name="add" size={16} color="#111111" />
          <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>Create Task</Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1, borderColor, borderStyle: 'dashed', backgroundColor: cardBg }}>
          <Ionicons name="checkbox-outline" size={40} color="#D4AF37" style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>No tasks yet</Text>
          <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 16 }}>
            Create a task or add one from AI suggestions.
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#D4AF37',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 10,
              gap: 6,
            }}
            onPress={() => {
              setEditingTask(null);
              setNewTitle('');
              setNewDescription('');
              setNewDueDate('Today');
              setNewPriority('Medium');
              setIsCreateModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#111111" />
            <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Create Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filteredTasks.map((t) => {
            const taskId = t._id || t.id;
            const isComp = (t.status as string) === 'Completed' || (t.status as string) === 'completed';
            return (
              <View
                key={taskId}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleToggleComplete(t)}
                    style={{ paddingTop: 2 }}
                  >
                    <Ionicons
                      name={isComp ? "checkbox" : "square-outline"}
                      size={22}
                      color={isComp ? "#10B981" : textSecondary}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isComp ? textSecondary : textPrimary,
                        textDecorationLine: isComp ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </Text>

                    {!!t.description && (
                      <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                        {t.description}
                      </Text>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                        Due: {t.deadline || (t as any).dueDate || 'Today'}
                      </Text>

                      <View
                        style={{
                          backgroundColor: (t.priority || '').toUpperCase() === 'HIGH' ? '#FEE2E2' : '#F3F4F6',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: (t.priority || '').toUpperCase() === 'HIGH' ? '#DC2626' : '#4B5563' }}>
                          {(t.priority || 'MEDIUM').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Options Menu Buttons */}
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTask(t);
                      setNewTitle(t.title);
                      setNewDescription(t.description || '');
                      setNewDueDate(t.deadline || 'Today');
                      setNewPriority((t.priority as any) || 'Medium');
                      setIsCreateModalOpen(true);
                    }}
                    style={{ padding: 4, marginRight: 2 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDeletingTask(t)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* CREATE / EDIT TASK BOTTOM SHEET MODAL */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsCreateModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, lineHeight: 22 }}>
                    {editingTask ? 'Edit Task' : 'Create Task'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                      Task Title *
                    </Text>
                    <TextInput
                      style={{
                        height: 42,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor,
                        paddingHorizontal: 12,
                        fontSize: 13,
                        color: textPrimary,
                        backgroundColor: isDark ? '#111111' : '#F9FAFB',
                      }}
                      placeholder="e.g. Prepare case brief"
                      placeholderTextColor={textSecondary}
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                      Description / Notes
                    </Text>
                    <TextInput
                      style={{
                        height: 70,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: textPrimary,
                        backgroundColor: isDark ? '#111111' : '#F9FAFB',
                        textAlignVertical: 'top',
                      }}
                      placeholder="Add notes or specific points to review..."
                      placeholderTextColor={textSecondary}
                      multiline
                      value={newDescription}
                      onChangeText={setNewDescription}
                    />
                  </View>

                  {/* Priority Options */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                      Priority
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {(['Low', 'Medium', 'High'] as const).map((p) => {
                        const active = newPriority === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            onPress={() => setNewPriority(p)}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 8,
                              alignItems: 'center',
                              backgroundColor: active ? '#D4AF37' : (isDark ? '#111111' : '#F3F4F6'),
                              borderWidth: 1,
                              borderColor: active ? '#D4AF37' : borderColor,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#111111' : textSecondary }}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Due Date Options */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                      Due Date
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['Today', 'Tomorrow', 'In 3 days', 'Next Week'] as const).map((d) => {
                        const active = newDueDate === d;
                        return (
                          <TouchableOpacity
                            key={d}
                            onPress={() => setNewDueDate(d)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: active ? (isDark ? '#2A2A38' : '#111111') : (isDark ? '#111111' : '#F3F4F6'),
                              borderWidth: 1,
                              borderColor: active ? (isDark ? '#3A3A4C' : '#111111') : borderColor,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : textSecondary }}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#D4AF37',
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginTop: 10,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                    disabled={isSubmitting}
                    onPress={handleCreateTaskSubmit}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#111111" />
                    ) : (
                      <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>
                        {editingTask ? 'Save Changes' : 'Create Task'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      <Modal visible={deletingTask !== null} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDeletingTask(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableWithoutFeedback>
              <View style={{ width: '100%', maxWidth: 320, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={40} color="#EF4444" style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>Delete Task?</Text>
                <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 20 }}>
                  Are you sure you want to delete "{deletingTask?.title}"?
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setDeletingTask(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textSecondary }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleDeleteTaskSubmit} style={{ backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

export default function AiTasksWorkflowManager({
  workspace,
  id,
  handleUpdateField,
  showToast,
}: AiTasksWorkflowManagerProps) {
  const { isDark } = useThemeContext();
  const { profile } = useUserStore();
  const { members: workspaceMembers } = useWorkspaceContext();
  const currentUserId = String(profile?._id || profile?.id || '');

  // Theme Tokens
  const pageBg = isDark ? '#0B0B0E' : '#FAFAFA';
  const cardBg = isDark ? '#14141C' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : '#EBF0F5';
  const surfaceBg = isDark ? '#1A1A26' : '#F8FAFC';

  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);

  // Active Workspace Task (Detailed View)
  const [activeWorkspaceTask, setActiveWorkspaceTask] = useState<any | null>(null);

  // Modals & Sheets State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [stagedAiTask, setStagedAiTask] = useState<any | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [stagedRejectTask, setStagedRejectTask] = useState<CaseTask | null>(null);
  const [processingTaskIds, setProcessingTaskIds] = useState<Set<string>>(new Set());

  // Secondary Bottom Sheets
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [aiActionsSheetOpen, setAiActionsSheetOpen] = useState(false);
  const [aiSuggestionsModalOpen, setAiSuggestionsModalOpen] = useState(false);
  const [hearingChecklistModalOpen, setHearingChecklistModalOpen] = useState(false);
  const [todayPlanModalOpen, setTodayPlanModalOpen] = useState(false);

  // Success Confirmation Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [assignedTaskDetails, setAssignedTaskDetails] = useState<{
    title: string;
    assigneeName: string;
    assigneeRole: string;
    priority: string;
    deadline: string;
  } | null>(null);

  // Team Workload Supervision State
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [memberFilterModalOpen, setMemberFilterModalOpen] = useState(false);
  const [stagedMemberDetails, setStagedMemberDetails] = useState<UploaderMember | null>(null);
  const [memberTasksSheetOpen, setMemberTasksSheetOpen] = useState(false);

  // Filters State
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [mainFilterTab, setMainFilterTab] = useState<'All' | 'My Tasks' | 'Assigned' | 'Team'>('All');
  const [advancedFilter, setAdvancedFilter] = useState<string>('All');

  // Tasks Data
  const activeTasks = useMemo(() => workspace?.tasks || [], [workspace]);
  const [isGeneratingAiTasks, setIsGeneratingAiTasks] = useState(false);
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<any[]>([]);

  // Pre-populate AI suggestions if empty on mount
  useEffect(() => {
    if (aiSuggestedTasks.length === 0) {
      setAiSuggestedTasks([
        {
          id: 'ai_s1_' + Date.now().toString(),
          title: 'Prepare Section 65B Electronic Evidence Certificate',
          priority: 'Critical',
          reason: 'Electronic evidence detected in uploaded chat screenshots and ledgers',
          deadline: 'Due Tomorrow',
          status: 'AI Suggested',
          checklist: [
            { title: 'Draft Electronic Record Certificate', checked: false },
            { title: 'Attest with Notary Stamp', checked: false },
            { title: 'File with Registry', checked: false }
          ]
        },
        {
          id: 'ai_s2_' + Date.now().toString(),
          title: 'Submit Replication Pleadings',
          priority: 'High',
          reason: 'Opposing party filed Written Statement response',
          deadline: 'Due in 14 days',
          status: 'AI Suggested',
          checklist: [
            { title: 'Draft reply to parawise denials', checked: false },
            { title: 'Obtain client execution signature', checked: false }
          ]
        }
      ]);
    }
  }, []);

  // Real Team Members List for Task Assignment
  const teamMembersList = useMemo(() => {
    const lawyers = workspace?.lawyers || [];
    const assigned = workspace?.assignedMembers || [];
    const team = workspace?.teamMembers || [];
    const docs = workspace?.documents || [];
    const evs = workspace?.evidence || [];
    const ownerInfo = workspace?.ownerInfo;

    const map = new Map<string, UploaderMember>();

    if (ownerInfo?.userId) {
      const ownerName = ownerInfo.name && ownerInfo.name !== 'Firm Owner' ? ownerInfo.name : 'Firm Owner';
      map.set(String(ownerInfo.userId), {
        userId: String(ownerInfo.userId),
        name: ownerName,
        role: ownerInfo.role || 'Firm Owner',
      });
    } else if (workspace?.userId) {
      map.set(String(workspace.userId), {
        userId: String(workspace.userId),
        name: workspace.ownerName || workspace.leadAdvocate || 'Firm Owner',
        role: 'Firm Owner',
      });
    }

    lawyers.forEach((l: any) => {
      const uId = l.userId?._id || l.userId || l._id || l.id;
      if (uId && !map.has(String(uId))) {
        map.set(String(uId), {
          userId: String(l.userId?._id || l.userId || l.id || l._id),
          name: (l.name && l.name !== 'Advocate') ? l.name : (l.fullName || 'Team Member'),
          role: l.role || l.designation || 'Advocate',
        });
      }
    });

    [...team, ...assigned].forEach((m: any) => {
      const uId = typeof m === 'object' ? String(m?.userId?._id || m?.userId || m?.id || m?._id || '') : String(m || '');
      const mName = typeof m === 'object' ? (m?.name && m.name !== 'Advocate' && m.name !== 'Team Member' ? m.name : (m?.fullName || 'Team Member')) : 'Team Member';
      const mRole = typeof m === 'object' ? (m?.role || m?.designation || 'Team Member') : 'Team Member';

      if (uId) {
        const existing = map.get(uId);
        if (!existing || (existing.name === 'Team Member' && mName !== 'Team Member')) {
          map.set(uId, {
            userId: uId,
            name: mName !== 'Team Member' ? mName : (existing?.name || 'Team Member'),
            role: mRole !== 'Team Member' ? mRole : (existing?.role || 'Team Member'),
          });
        }
      }
    });

    if (workspaceMembers && workspaceMembers.length > 0) {
      workspaceMembers.forEach((m) => {
        const uId = String(m.userId || m.id || m._id || m.email || '');
        if (uId && !map.has(uId)) {
          map.set(uId, {
            userId: uId,
            name: m.name && m.name !== 'Advocate' && m.name !== 'Team Member' ? m.name : (m.fullName || 'Team Member'),
            role: m.role || 'Advocate',
          });
        }
      });
    }

    [...docs, ...evs].forEach((item: any) => {
      if (typeof item.uploadedBy === 'object' && item.uploadedBy?.name) {
        const uId = item.uploadedBy.userId || item.uploadedBy.name;
        if (uId && !map.has(String(uId))) {
          map.set(String(uId), {
            userId: String(item.uploadedBy.userId || item.uploadedBy.name),
            name: item.uploadedBy.name,
            role: item.uploadedBy.role || 'Advocate',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [workspace?.lawyers, workspace?.assignedMembers, workspace?.teamMembers, workspace?.documents, workspace?.evidence, workspace?.ownerInfo, workspace?.userId, workspace?.ownerName, workspace?.leadAdvocate, workspaceMembers]);

  // Helper Date Metrics
  const todayStr = new Date().toISOString().split('T')[0];

  // Team Workload Computation
  const teamMembersWorkload = useMemo(() => {
    const map = new Map<string, {
      member: UploaderMember;
      tasks: CaseTask[];
      activeCount: number;
      pendingCount: number;
      todayCount: number;
      overdueCount: number;
      completedCount: number;
      workloadLabel: 'Light' | 'Normal' | 'High';
    }>();

    teamMembersList.forEach((m) => {
      map.set(String(m.userId), {
        member: m,
        tasks: [],
        activeCount: 0,
        pendingCount: 0,
        todayCount: 0,
        overdueCount: 0,
        completedCount: 0,
        workloadLabel: 'Light',
      });
    });

    activeTasks.forEach((t) => {
      const toId = typeof t.assignedTo === 'object' ? String(t.assignedTo?.userId || '') : String(t.assignedTo || '');
      const toName = typeof t.assignedTo === 'object' ? String(t.assignedTo?.name || '').trim().toLowerCase() : '';

      let key = Array.from(map.keys()).find((k) => k === toId);
      if (!key && toName) {
        key = Array.from(map.keys()).find((k) => map.get(k)?.member.name?.trim().toLowerCase() === toName);
      }

      if (key) {
        const item = map.get(key)!;
        item.tasks.push(t);

        const isCompleted = t.status === 'Completed' || t.status === 'Closed';
        const isRejected = t.status === 'Rejected';
        const isPendingAcc = t.status === 'Pending Acceptance' || t.status === 'Awaiting Acceptance';
        const isOverdue = !isCompleted && !isRejected && Boolean(t.deadline && t.deadline < todayStr);
        const isToday = !isCompleted && !isRejected && t.deadline === todayStr;

        if (isCompleted) {
          item.completedCount++;
        } else if (!isRejected) {
          item.activeCount++;
          if (isPendingAcc) item.pendingCount++;
          if (isToday) item.todayCount++;
          if (isOverdue) item.overdueCount++;
        }
      }
    });

    map.forEach((entry) => {
      entry.member.activeTasksCount = entry.activeCount;
      if (entry.activeCount >= 6) entry.workloadLabel = 'High';
      else if (entry.activeCount >= 3) entry.workloadLabel = 'Normal';
      else entry.workloadLabel = 'Light';
    });

    let list = Array.from(map.values());
    if (selectedMemberId !== 'ALL') {
      list = list.filter((item) => String(item.member.userId) === selectedMemberId);
    }

    return list;
  }, [activeTasks, teamMembersList, selectedMemberId, todayStr]);

  // Filter Tasks Array based on Main Tab & Search & Advanced Filter
  const filteredTasks = useMemo(() => {
    const currentNameLower = String(profile?.name || '').trim().toLowerCase();
    const currentNameFirst = currentNameLower.split(' ')[0];

    return activeTasks.filter((t) => {
      const toId = typeof t.assignedTo === 'object' ? String(t.assignedTo?.userId || '') : String(t.assignedTo || '');
      const toName = typeof t.assignedTo === 'object' ? String(t.assignedTo?.name || '').trim().toLowerCase() : String(t.assignedTo || '').trim().toLowerCase();
      const byId = typeof t.assignedBy === 'object' ? String(t.assignedBy?.userId || '') : String(t.assignedBy || '');
      const byName = typeof t.assignedBy === 'object' ? String(t.assignedBy?.name || '').trim().toLowerCase() : String(t.assignedBy || '').trim().toLowerCase();

      const isAssignedToMe = Boolean(
        (toId && (toId === currentUserId || toId === profile?._id || toId === profile?.id)) ||
        (toName && currentNameFirst && currentNameFirst.length >= 2 && (toName.includes(currentNameFirst) || currentNameFirst.includes(toName))) ||
        (toId && teamMembersList.some((m) => String(m.userId) === toId && m.name?.toLowerCase().includes(currentNameFirst))) ||
        (!toId && toName && (toName === 'team member' || toName === 'advocate'))
      );

      const isAssignedByMe = Boolean(
        (byId && (byId === currentUserId || byId === profile?._id || byId === profile?.id)) ||
        (byName && currentNameFirst && currentNameFirst.length >= 2 && (byName.includes(currentNameFirst) || currentNameFirst.includes(byName)))
      );

      const isSelfCreated = isAssignedByMe && (!toId || isAssignedToMe);

      // Main Tab Filter
      if (mainFilterTab === 'My Tasks') {
        if (!isAssignedToMe && !isSelfCreated) return false;
        // Rejected tasks are excluded from assignee's active list
        if (t.status === 'Rejected') return false;
      } else if (mainFilterTab === 'Assigned') {
        if (!isAssignedByMe || (isAssignedToMe && !toId)) return false;
      }

      // Search Filter
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      // Advanced Filter Sheet
      switch (advancedFilter) {
        case 'Pending':
          return t.status === 'Pending' || t.status === 'Pending Acceptance' || t.status === 'Awaiting Acceptance' || t.status === 'In Progress';
        case 'Today':
          return t.deadline === todayStr;
        case 'Overdue':
          return t.status !== 'Completed' && Boolean(t.deadline && t.deadline < todayStr);
        case 'Completed':
          return t.status === 'Completed';
        default:
          return true;
      }
    });
  }, [activeTasks, mainFilterTab, taskSearchQuery, advancedFilter, currentUserId, profile?.name, teamMembersList, todayStr]);

  // Count Statistics
  const pendingTasksCount = activeTasks.filter((t) => t.status === 'Pending' || t.status === 'Pending Acceptance' || t.status === 'Awaiting Acceptance' || t.status === 'In Progress').length;
  const todayTasksCount = activeTasks.filter((t) => t.deadline === todayStr && t.status !== 'Completed').length;
  const overdueTasksCount = activeTasks.filter((t) => t.status !== 'Completed' && Boolean(t.deadline && t.deadline < todayStr)).length;

  // Pending Acceptance Tasks assigned specifically to current authenticated user
  const pendingAcceptanceTasks = useMemo(() => {
    const currentNameLower = String(profile?.name || profile?.fullName || '').trim().toLowerCase();
    const currentNameFirst = currentNameLower.split(' ')[0];

    return activeTasks.filter((t) => {
      const tId = t._id || (t as any).id;
      if (tId && processingTaskIds.has(tId)) return false;

      const isPending = t.status === 'Pending Acceptance' || t.status === 'Awaiting Acceptance';
      if (!isPending) return false;

      const toId = typeof t.assignedTo === 'object' ? String((t.assignedTo as any)?.userId || (t.assignedTo as any)?._id || '') : String(t.assignedTo || '');
      const toName = typeof t.assignedTo === 'object' ? String(t.assignedTo?.name || '').trim().toLowerCase() : String(t.assignedTo || '').trim().toLowerCase();

      const isAssignedToMe = Boolean(
        (toId && (toId === currentUserId || toId === profile?._id || toId === profile?.id)) ||
        (toName && currentNameFirst && currentNameFirst.length >= 2 && (toName.includes(currentNameFirst) || currentNameFirst.includes(toName))) ||
        (toId && teamMembersList.some((m) => (String(m.userId) === toId || String(m.name).toLowerCase() === toName) && (m.name?.toLowerCase().includes(currentNameFirst) || currentNameLower.includes(m.name?.toLowerCase() || ''))))
      );

      return isAssignedToMe;
    });
  }, [activeTasks, currentUserId, profile?._id, profile?.id, profile?.name, profile?.fullName, teamMembersList, processingTaskIds]);

  // Accept Task Handler
  const handleAcceptTask = async (task: CaseTask) => {
    const targetId = task._id || (task as any).id;
    if (!targetId || processingTaskIds.has(targetId)) return;

    // Optimistically dismiss card immediately from screen
    setProcessingTaskIds((prev) => new Set(prev).add(targetId));

    try {
      if (id) {
        await apiClient.put(`/projects/${id}/tasks/${targetId}/accept`);
      }
      const updatedTasks = activeTasks.map((t) => {
        const tId = t._id || (t as any).id;
        if (tId === targetId) {
          return { ...t, status: 'Accepted' as any, acceptedAt: new Date().toISOString() };
        }
        return t;
      });
      if (workspace) {
        (workspace as any).tasks = updatedTasks;
      }
      try {
        await handleUpdateField({ tasks: updatedTasks });
      } catch {
        // Suppress project PUT error for non-owner team members
      }
      showToast('success', 'Task Accepted', `You accepted "${task.title}".`);
    } catch (err: any) {
      console.error('[ACCEPT TASK ERROR]', err);
      setProcessingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      showToast('error', 'Error', err?.response?.data?.error || 'Failed to accept task.');
    }
  };

  // Reject Task Handler
  const handleRejectTaskSubmit = async (reason: string) => {
    const targetId = stagedRejectTask?._id || (stagedRejectTask as any)?.id;
    if (!targetId || processingTaskIds.has(targetId)) return;

    setProcessingTaskIds((prev) => new Set(prev).add(targetId));
    setRejectModalOpen(false);
    setStagedRejectTask(null);

    try {
      if (id) {
        await apiClient.put(`/projects/${id}/tasks/${targetId}/reject`, { reason });
      }
      const updatedTasks = activeTasks.map((t) => {
        const tId = t._id || (t as any).id;
        if (tId === targetId) {
          return { ...t, status: 'Rejected' as any, rejectionReason: reason, rejectedAt: new Date().toISOString() };
        }
        return t;
      });
      if (workspace) {
        (workspace as any).tasks = updatedTasks;
      }
      try {
        await handleUpdateField({ tasks: updatedTasks });
      } catch {
        // Suppress project PUT error for non-owner team members
      }
      showToast('info', 'Task Rejected', 'Task rejected and assigner notified.');
    } catch (err: any) {
      console.error('[REJECT TASK ERROR]', err);
      setProcessingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      showToast('error', 'Error', err?.response?.data?.error || 'Failed to reject task.');
    }
  };

  // Assign / Create Task Submit Handler
  const handleAssignTaskSubmit = async (payload: {
    title: string;
    description: string;
    assignedToUserId: string;
    priority: string;
    deadline: string;
    taskType: string;
    source: 'AI' | 'MANUAL';
  }) => {
    try {
      let targetMember = teamMembersList.find((m) => String(m.userId) === payload.assignedToUserId) || teamMembersList[0];
      let assignedTaskObj: CaseTask | null = null;

      if (id) {
        const res = await apiClient.post(`/projects/${id}/tasks`, {
          title: payload.title,
          description: payload.description,
          assignedToUserId: payload.assignedToUserId,
          priority: payload.priority,
          deadline: payload.deadline,
          taskType: payload.taskType,
          source: payload.source,
        });
        if (res.data?.data) {
          assignedTaskObj = res.data.data;
          const updatedTasks = [assignedTaskObj!, ...activeTasks];
          if (workspace) (workspace as any).tasks = updatedTasks;
          try {
            await handleUpdateField({ tasks: updatedTasks });
          } catch {
            // Suppress project PUT error for non-owner team members
          }
        }
      }

      if (!assignedTaskObj) {
        // Local fallback sync
        const assignerName = profile?.name && profile.name !== 'Advocate' ? profile.name : 'Firm Owner';
        const assignerRole = profile?.role || 'Firm Owner';

        assignedTaskObj = {
          _id: 'task_' + Date.now().toString(),
          title: payload.title,
          description: payload.description,
          status: 'Pending Acceptance' as any,
          priority: payload.priority as any,
          deadline: payload.deadline || '3 Aug 2026',
          source: payload.source as any,
          assignedBy: { userId: currentUserId, name: assignerName, role: assignerRole } as any,
          assignedTo: { userId: targetMember?.userId, name: targetMember?.name, role: targetMember?.role } as any,
          createdAt: new Date().toISOString(),
        };

        const updatedTasks = [assignedTaskObj, ...activeTasks];
        await handleUpdateField({ tasks: updatedTasks });
      }

      // Mark AI suggestion item as assigned if applicable
      if (payload.source === 'AI' || stagedAiTask) {
        setAiSuggestedTasks((prev) =>
          prev.map((item) => (item.title === payload.title ? { ...item, isAssigned: true } : item))
        );
      }

      // Trigger Success Confirmation Modal
      const targetName = targetMember?.name || (typeof assignedTaskObj.assignedTo === 'object' ? assignedTaskObj.assignedTo?.name : 'Advocate');
      const targetRole = targetMember?.role || (typeof assignedTaskObj.assignedTo === 'object' ? assignedTaskObj.assignedTo?.role : 'Team Member');

      setAssignedTaskDetails({
        title: payload.title,
        assigneeName: targetName || 'Advocate',
        assigneeRole: targetRole || 'Team Member',
        priority: payload.priority || 'Medium',
        deadline: payload.deadline || '3 Aug 2026',
      });
      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error('[ASSIGN SUBMIT ERROR]', err);
      showToast('error', 'Assignment Error', err?.response?.data?.error || 'Failed to assign task.');
    }
  };

  // Toggle Task Status (Checkbox)
  const handleToggleTaskStatus = async (task: CaseTask) => {
    if (!task._id) return;
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updatedTasks = activeTasks.map((t) => (t._id === task._id ? { ...t, status: newStatus as any } : t));
    await handleUpdateField({ tasks: updatedTasks });
    showToast('success', newStatus === 'Completed' ? 'Task Completed' : 'Task Reopened', `"${task.title}" updated.`);
  };

  // Dismiss AI Suggestion
  const handleDismissSuggestedTask = (taskId: string) => {
    setAiSuggestedTasks(aiSuggestedTasks.filter((t) => (t.id || t._id) !== taskId));
    showToast('info', 'Dismissed', 'Suggested task removed.');
  };

  // AI Task Generation Action
  const handleAiAutoGenerate = async () => {
    setIsGeneratingAiTasks(true);
    showToast('info', 'AI Assistant', 'Analyzing case stage and materials...');
    setTimeout(async () => {
      setIsGeneratingAiTasks(false);
      const generated: CaseTask[] = [
        {
          _id: 'task_ai_g1_' + Date.now().toString(),
          title: 'Collect Bills and Proof of Transaction',
          description: 'Gather retail invoices and banking logs for case file',
          status: 'Pending Acceptance' as any,
          priority: 'High',
          deadline: todayStr,
          source: 'AI',
        },
        {
          _id: 'task_ai_g2_' + Date.now().toString(),
          title: 'Draft Formal Legal Demand Notice',
          description: 'Formulate notice setting out breach details and 15-day cure period',
          status: 'Pending Acceptance' as any,
          priority: 'High',
          source: 'AI',
        },
      ];
      await handleUpdateField({ tasks: [...generated, ...activeTasks] });
      setAiActionsSheetOpen(false);
      showToast('success', 'AI Generation Complete', 'Added 2 intelligent legal tasks.');
    }, 1200);
  };

  const currentRole = useRoleStore.getState().selectedRole || 'advocate';
  const currentWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : (workspace?.workspaceType || currentRole);
  const isLawFirm = currentWsType === 'law_firm' || workspace?.workspaceType === 'law_firm';

  if (!isLawFirm) {
    return (
      <PersonalTasksWorkflow
        workspace={workspace}
        id={id}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
        isDark={isDark}
      />
    );
  }

  const isListEmpty = filteredTasks.length === 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      {/* 1. TOP HEADER & COMPACT STATS ROW */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Tasks</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: textSecondary }}>
            <Text style={{ fontWeight: '800', color: textPrimary }}>{pendingTasksCount}</Text> {tTool(outputLanguage, 'tasks.pending', 'Pending')}
          </Text>
          <Text style={{ fontSize: 12, color: textSecondary }}>•</Text>
          <Text style={{ fontSize: 13, color: textSecondary }}>
            <Text style={{ fontWeight: '800', color: textPrimary }}>{todayTasksCount}</Text> {tTool(outputLanguage, 'tasks.today', 'Today')}
          </Text>
          <Text style={{ fontSize: 12, color: textSecondary }}>•</Text>
          <Text style={{ fontSize: 13, color: overdueTasksCount > 0 ? '#EF4444' : textSecondary }}>
            <Text style={{ fontWeight: '800', color: overdueTasksCount > 0 ? '#EF4444' : textPrimary }}>{overdueTasksCount}</Text> {tTool(outputLanguage, 'tasks.overdue', 'Overdue')}
          </Text>
        </View>
      </View>

      {/* 2. SEARCH & MAIN FILTER ROW */}
      <View style={{ marginBottom: 14 }}>
        <View
          style={{
            height: 42,
            backgroundColor: cardBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Ionicons name="search" size={16} color={textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontSize: 13, color: textPrimary }}
            placeholder="Search tasks..."
            placeholderTextColor={textSecondary}
            value={taskSearchQuery}
            onChangeText={setTaskSearchQuery}
          />
          {!!taskSearchQuery && (
            <TouchableOpacity onPress={() => setTaskSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Compact Main Filters */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {(['All', 'My Tasks', 'Assigned', 'Team'] as const).map((tab) => {
            const active = mainFilterTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setMainFilterTab(tab)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: active ? (isDark ? '#2A2A38' : '#111827') : cardBg,
                  borderWidth: 1,
                  borderColor: active ? (isDark ? '#3A3A4C' : '#111827') : borderColor,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : textSecondary }}>{tTool(outputLanguage, 'tasks.tab' + tab.replace(/[^a-zA-Z]/g, ''), tab)}</Text>
              </TouchableOpacity>
            );
          })}

          {mainFilterTab === 'Team' && (
            <TouchableOpacity
              onPress={() => setMemberFilterModalOpen(true)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: selectedMemberId !== 'ALL' ? 'rgba(212,175,55,0.15)' : cardBg,
                borderWidth: 1,
                borderColor: selectedMemberId !== 'ALL' ? GOLD : borderColor,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: selectedMemberId !== 'ALL' ? GOLD : textSecondary }}>
                {selectedMemberId !== 'ALL' ? (teamMembersList.find((m) => String(m.userId) === selectedMemberId)?.name || 'Member') : 'All Members'} ▾
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setFilterSheetOpen(true)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
              backgroundColor: advancedFilter !== 'All' ? 'rgba(212,175,55,0.15)' : cardBg,
              borderWidth: 1,
              borderColor: advancedFilter !== 'All' ? GOLD : borderColor,
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: advancedFilter !== 'All' ? GOLD : textSecondary }}>
              {advancedFilter !== 'All' ? advancedFilter : 'Filter'} ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. ASSIGNED TO ME — HIGHEST PRIORITY SECTION */}
      {pendingAcceptanceTasks.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Assigned to You
            </Text>
            <View style={{ backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000' }}>{pendingAcceptanceTasks.length}</Text>
            </View>
          </View>

          {pendingAcceptanceTasks.map((t) => {
            const assignerName = typeof t.assignedBy === 'object' ? t.assignedBy?.name : t.assignedBy;
            const assignerRole = typeof t.assignedBy === 'object' ? t.assignedBy?.role : '';

            return (
              <View
                key={t._id}
                style={{
                  backgroundColor: isDark ? 'rgba(212,175,55,0.08)' : '#FFFDF5',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: GOLD,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>{t.title}</Text>
                {!!t.description && <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>{t.description}</Text>}

                <Text style={{ fontSize: 11, color: GOLD, fontWeight: '700', marginBottom: 4 }}>
                  Assigned by: {assignerName || 'Firm Owner'} {assignerRole ? `• ${assignerRole}` : ''}
                </Text>

                <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 12 }}>
                  {t.deadline ? `Due ${t.deadline}` : 'Due Today'} • {t.priority || 'High'} Priority
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => {
                      setStagedRejectTask(t);
                      setRejectModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      borderWidth: 1,
                      borderColor: '#EF4444',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => handleAcceptTask(t)}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: GOLD,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000' }}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}


      {/* 5. AI SUGGESTED TASKS (Max 2 compact items on main dashboard) */}
      {aiSuggestedTasks.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>✨ {tTool(outputLanguage, 'tasks.aiSuggestions', 'AI Suggestions')}</Text>
            <TouchableOpacity onPress={() => setAiSuggestionsModalOpen(true)}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          {aiSuggestedTasks.slice(0, 2).map((sTask, sIdx) => (
            <View key={sTask.id || `sugg_${sIdx}`} style={{ backgroundColor: cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, flex: 1, marginRight: 8 }} numberOfLines={1}>
                  {sTask.title}
                </Text>
                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444' }}>{sTask.priority}</Text>
                </View>
              </View>

              {!!sTask.reason && (
                <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 8 }} numberOfLines={1}>
                  Reason: {sTask.reason}
                </Text>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: textSecondary }}>Due {sTask.deadline || 'Tomorrow'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setStagedAiTask(sTask);
                    setAssignModalOpen(true);
                  }}
                  style={{ backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="add" size={12} color="#000000" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#000000' }}>Assign Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 6. TASKS LIST / TEAM WORKLOAD SECTION */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>
            {mainFilterTab === 'Assigned' ? tTool(outputLanguage, 'tasks.assignedTasksTitle', 'Assigned Tasks') : mainFilterTab === 'Team' ? tTool(outputLanguage, 'tasks.teamWorkloadTitle', 'Team Workload Dashboard') : mainFilterTab === 'My Tasks' ? tTool(outputLanguage, 'tasks.myTasksTitle', 'My Tasks') : tTool(outputLanguage, 'tasks.allCaseTasks', 'All Case Tasks')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setStagedAiTask(null);
              setAssignModalOpen(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="add" size={16} color={GOLD} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: GOLD }}>Create</Text>
          </TouchableOpacity>
        </View>

        {mainFilterTab === 'Team' ? (
          /* TEAM TAB WORKLOAD DASHBOARD */
          <View style={{ gap: 12 }}>
            {/* AI Workload Insight */}
            <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="sparkles" size={14} color={GOLD} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>✨ AI Workload Insight</Text>
              </View>
              <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18 }}>
                {teamMembersWorkload[0]?.member.name || 'Team member'} currently has {teamMembersWorkload[0]?.activeCount || 0} active tasks ({teamMembersWorkload[0]?.pendingCount || 0} pending acceptance). Review workload status before delegating new tasks.
              </Text>
            </View>

            {teamMembersWorkload.length === 0 ? (
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 10 }}>No team workload data available</Text>
                <TouchableOpacity
                  onPress={() => {
                    setStagedAiTask(null);
                    setAssignModalOpen(true);
                  }}
                  style={{ backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000' }}>+ Assign Task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              teamMembersWorkload.map((group) => {
                const badgeBg = group.workloadLabel === 'High' ? 'rgba(239,68,68,0.15)' : group.workloadLabel === 'Normal' ? 'rgba(212,175,55,0.15)' : 'rgba(16,185,129,0.15)';
                const badgeTxtColor = group.workloadLabel === 'High' ? '#EF4444' : group.workloadLabel === 'Normal' ? GOLD : '#10B981';

                return (
                  <View key={String(group.member.userId || group.member.name)} style={{ backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor }}>
                    {/* Member Details & Workload Badge */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>{group.member.name}</Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>{group.member.role || 'Team Member'}</Text>
                      </View>
                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: badgeTxtColor }}>Workload: {group.workloadLabel}</Text>
                      </View>
                    </View>

                    {/* Member Stats Summary */}
                    <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 10 }}>
                      <Text style={{ fontWeight: '800', color: textPrimary }}>{group.activeCount}</Text> Active • <Text style={{ fontWeight: '800', color: GOLD }}>{group.pendingCount}</Text> Pending • <Text style={{ fontWeight: '800', color: group.overdueCount > 0 ? '#EF4444' : textSecondary }}>{group.overdueCount}</Text> Overdue
                    </Text>

                    {/* Member Tasks Preview (Max 3) */}
                    {group.tasks.length === 0 ? (
                      <Text style={{ fontSize: 12, color: textSecondary, fontStyle: 'italic', paddingVertical: 4 }}>No active tasks assigned to this member</Text>
                    ) : (
                      group.tasks.slice(0, 3).map((t, tIdx) => {
                        const assigner = typeof t.assignedBy === 'object' ? t.assignedBy?.name : t.assignedBy;
                        return (
                          <TouchableOpacity
                            key={t._id || `m_task_${tIdx}`}
                            onPress={() => setActiveWorkspaceTask(t)}
                            style={{ backgroundColor: surfaceBg, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }} numberOfLines={1}>{t.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, color: textSecondary }}>{t.priority}</Text>
                              <Text style={{ fontSize: 10, color: textSecondary }}>•</Text>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: t.status === 'Accepted' ? '#10B981' : t.status === 'Rejected' ? '#EF4444' : GOLD }}>
                                {t.status === 'Pending Acceptance' ? 'Awaiting Acceptance' : t.status}
                              </Text>
                              {!!assigner && (
                                <Text style={{ fontSize: 10, color: textSecondary, marginLeft: 'auto' }}>Assigned by {assigner}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        setStagedMemberDetails(group.member);
                        setMemberTasksSheetOpen(true);
                      }}
                      style={{ marginTop: 6, alignSelf: 'flex-end' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD }}>View All Tasks ({group.tasks.length}) →</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : isListEmpty ? (
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 10 }}>{tTool(outputLanguage, 'tasks.noActiveTasks', 'No active tasks in this view')}</Text>
            <TouchableOpacity
              onPress={() => {
                setStagedAiTask(null);
                setAssignModalOpen(true);
              }}
              style={{ backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000' }}>+ Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map((t, index) => {
            const isCompleted = t.status === 'Completed';
            const assignerName = typeof t.assignedBy === 'object' ? t.assignedBy?.name : t.assignedBy;
            const assignerRole = typeof t.assignedBy === 'object' ? t.assignedBy?.role : '';
            const assigneeName = typeof t.assignedTo === 'object' ? t.assignedTo?.name : t.assignedTo;
            const assigneeRole = typeof t.assignedTo === 'object' ? t.assignedTo?.role : '';

            return (
              <TouchableOpacity
                key={t._id || `task_${index}`}
                onPress={() => setActiveWorkspaceTask(t)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: t.status === 'Rejected' ? 'rgba(239,68,68,0.4)' : borderColor,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => handleToggleTaskStatus(t)}>
                    <Ionicons name={isCompleted ? 'checkbox' : 'square-outline'} size={20} color={isCompleted ? '#10B981' : textSecondary} />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isCompleted ? textSecondary : textPrimary, textDecorationLine: isCompleted ? 'line-through' : 'none' }} numberOfLines={1}>
                      {t.title}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: textSecondary }}>{t.deadline || '3 Aug 2026'}</Text>
                      <Text style={{ fontSize: 10, color: textSecondary }}>•</Text>
                      <Text style={{ fontSize: 11, color: textSecondary }}>{t.priority}</Text>
                      <Text style={{ fontSize: 10, color: textSecondary }}>•</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.status === 'Accepted' ? '#10B981' : t.status === 'Rejected' ? '#EF4444' : GOLD }}>
                        {t.status === 'Pending Acceptance' ? 'Awaiting Acceptance' : t.status || 'To Do'}
                      </Text>
                    </View>

                    {/* Display Real Assigner / Assignee */}
                    {mainFilterTab === 'Assigned' || (typeof t.assignedBy === 'object' && t.assignedBy?.userId === currentUserId && typeof t.assignedTo === 'object' && t.assignedTo?.userId !== currentUserId) ? (
                      <Text style={{ fontSize: 11, color: GOLD, fontWeight: '700', marginTop: 3 }}>
                        Assigned to: {assigneeName || 'Team Member'} {assigneeRole ? `• ${assigneeRole}` : ''}
                      </Text>
                    ) : (
                      !!assignerName && (
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>
                          Assigned by: {assignerName} {assignerRole ? `• ${assignerRole}` : ''}
                        </Text>
                      )
                    )}

                    {/* Rejection indicator */}
                    {t.status === 'Rejected' && (
                      <View style={{ marginTop: 4, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#EF4444' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                          Rejected by {assigneeName || 'Assignee'}
                        </Text>
                        {!!t.rejectionReason && (
                          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
                            Reason: {t.rejectionReason}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 7. HEARING INTEGRATION — COMPACT CARD */}
      <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Ionicons name="scale-outline" size={16} color={GOLD} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>Next Hearing</Text>
        </View>

        <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 2 }}>
          {workspace?.name || 'Active Litigation Workspace'} • Tomorrow
        </Text>
        <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 8 }}>
          2 preparation tasks pending
        </Text>

        <TouchableOpacity onPress={() => setHearingChecklistModalOpen(true)}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD }}>View Checklist →</Text>
        </TouchableOpacity>
      </View>

      {/* 8. TODAY'S PLAN — COLLAPSE */}
      <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>Today's Plan</Text>
          <TouchableOpacity onPress={() => setTodayPlanModalOpen(true)}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>View &gt;</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 2 }}>
          4 tasks scheduled • 1 high priority
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>
          Next: 9:00 AM — Review Evidence Documents
        </Text>
      </View>

      {/* MODAL 1: Case Task Assign Modal */}
      <CaseTaskAssignModal
        visible={assignModalOpen}
        initialTitle={stagedAiTask?.title || ''}
        initialDescription={stagedAiTask?.description || stagedAiTask?.reason || ''}
        initialPriority={stagedAiTask?.priority || 'Medium'}
        initialCategory={stagedAiTask?.category || 'Task'}
        isAiSuggested={!!stagedAiTask}
        members={teamMembersList}
        onClose={() => {
          setAssignModalOpen(false);
          setStagedAiTask(null);
        }}
        onAssignSubmit={handleAssignTaskSubmit}
      />

      {/* MODAL 2: Task Reject Modal */}
      <TaskRejectModal
        visible={rejectModalOpen}
        taskTitle={stagedRejectTask?.title || ''}
        onClose={() => {
          setRejectModalOpen(false);
          setStagedRejectTask(null);
        }}
        onRejectSubmit={handleRejectTaskSubmit}
      />

      {/* MODAL 3: Advanced Filter Sheet */}
      <Modal visible={filterSheetOpen} transparent animationType="slide" onRequestClose={() => setFilterSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFilterSheetOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setFilterSheetOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {['All', 'Pending', 'Today', 'Overdue', 'Completed'].map((f) => {
                const active = advancedFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => {
                      setAdvancedFilter(f);
                      setFilterSheetOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: active ? 'rgba(212,175,55,0.18)' : surfaceBg,
                      borderWidth: 1,
                      borderColor: active ? GOLD : borderColor,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: AI Actions Sheet */}
      <Modal visible={aiActionsSheetOpen} transparent animationType="slide" onRequestClose={() => setAiActionsSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAiActionsSheetOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>✨ AI Assistant Tools</Text>
              <TouchableOpacity onPress={() => setAiActionsSheetOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleAiAutoGenerate}
              style={{ height: 46, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', marginBottom: 10, flexDirection: 'row', gap: 6 }}
            >
              <Ionicons name="sparkles" size={16} color="#000000" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#000000' }}>Auto-Generate Legal Checklist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAiActionsSheetOpen(false);
                showToast('info', 'Weekly Report', 'Generating weekly litigation task summary...');
              }}
              style={{ height: 44, borderRadius: 12, backgroundColor: surfaceBg, borderWidth: 1, borderColor, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Generate Weekly Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Hearing Checklist Full Modal */}
      <Modal visible={hearingChecklistModalOpen} transparent animationType="slide" onRequestClose={() => setHearingChecklistModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setHearingChecklistModalOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>⚖ Hearing Preparation Checklist</Text>
              <TouchableOpacity onPress={() => setHearingChecklistModalOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 12 }}>
              Court Hearing scheduled for tomorrow. Verified recommended checklist items:
            </Text>

            <View style={{ gap: 10, marginBottom: 16 }}>
              {['Section 65B Electronic Records Attestation Certificate', 'Primary Defendant WhatsApp chat logs ledger indexing', 'Court Pleadings binder replication drafts'].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: surfaceBg }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={GOLD} />
                  <Text style={{ fontSize: 13, color: textPrimary, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => setHearingChecklistModalOpen(false)} style={{ height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Today's Plan Timeline Full Modal */}
      <Modal visible={todayPlanModalOpen} transparent animationType="slide" onRequestClose={() => setTodayPlanModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setTodayPlanModalOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>📅 Today's Plan Schedule</Text>
              <TouchableOpacity onPress={() => setTodayPlanModalOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {[
                { time: '9:00 AM', title: 'Review Evidence Documents', sub: 'Upload WhatsApp logs to Vault' },
                { time: '10:30 AM', title: 'Draft Legal Notice / Complaint', sub: 'Drafting assistance' },
                { time: '12:30 PM', title: 'Research Case Precedents', sub: 'Section 65B requirements' },
                { time: '3:00 PM', title: 'Client Meeting', sub: 'Confirm statement details signature' },
              ].map((p, pIdx) => (
                <View key={pIdx} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: GOLD, width: 65 }}>{p.time}</Text>
                  <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: GOLD }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{p.title}</Text>
                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{p.sub}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={() => setTodayPlanModalOpen(false)} style={{ height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000' }}>Close Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 7: AI Suggestions Full Modal */}
      <Modal visible={aiSuggestionsModalOpen} transparent animationType="slide" onRequestClose={() => setAiSuggestionsModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAiSuggestionsModalOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>✨ All AI Task Suggestions</Text>
              <TouchableOpacity onPress={() => setAiSuggestionsModalOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {aiSuggestedTasks.map((sTask, sIdx) => (
                <View key={sTask.id || `sugg_modal_${sIdx}`} style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor, marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>{sTask.title}</Text>
                  {!!sTask.reason && <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>Reason: {sTask.reason}</Text>}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: textSecondary }}>Due {sTask.deadline || 'Tomorrow'} • {sTask.priority}</Text>
                    <TouchableOpacity
                      disabled={sTask.isAssigned}
                      onPress={() => {
                        setAiSuggestionsModalOpen(false);
                        setStagedAiTask(sTask);
                        setAssignModalOpen(true);
                      }}
                      style={{ backgroundColor: sTask.isAssigned ? surfaceBg : GOLD, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: sTask.isAssigned ? 1 : 0, borderColor }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: sTask.isAssigned ? textSecondary : '#000000' }}>
                        {sTask.isAssigned ? '✓ Assigned' : '+ Assign Task'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 8: Success Confirmation Modal */}
      <Modal visible={successModalOpen} transparent animationType="fade" onRequestClose={() => setSuccessModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <View style={{ width: '90%', backgroundColor: cardBg, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: GOLD, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={36} color={GOLD} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, textAlign: 'center' }}>Task Assigned Successfully</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: GOLD, marginTop: 4, textAlign: 'center' }}>
              "{assignedTaskDetails?.title}"
            </Text>

            <View style={{ width: '100%', backgroundColor: surfaceBg, borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor }}>
              <Text style={{ fontSize: 11, color: textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>Assigned to:</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginTop: 2 }}>
                {assignedTaskDetails?.assigneeName} • {assignedTaskDetails?.assigneeRole}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: borderColor }}>
                <Text style={{ fontSize: 12, color: textSecondary }}>
                  Priority: <Text style={{ fontWeight: '800', color: textPrimary }}>{assignedTaskDetails?.priority}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: textSecondary }}>
                  Due: <Text style={{ fontWeight: '800', color: textPrimary }}>{assignedTaskDetails?.deadline}</Text>
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
              <TouchableOpacity
                onPress={() => {
                  setSuccessModalOpen(false);
                  setMainFilterTab('Assigned');
                }}
                style={{ flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: GOLD, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD }}>View Assigned Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSuccessModalOpen(false)}
                style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 9: Member Filter Dropdown Modal */}
      <Modal visible={memberFilterModalOpen} transparent animationType="slide" onRequestClose={() => setMemberFilterModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setMemberFilterModalOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>Filter Workload by Member</Text>
              <TouchableOpacity onPress={() => setMemberFilterModalOpen(false)}><Ionicons name="close" size={20} color={textSecondary} /></TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedMemberId('ALL');
                setMemberFilterModalOpen(false);
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: selectedMemberId === 'ALL' ? 'rgba(212,175,55,0.15)' : surfaceBg,
                borderWidth: 1,
                borderColor: selectedMemberId === 'ALL' ? GOLD : borderColor,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: selectedMemberId === 'ALL' ? GOLD : textPrimary }}>All Team Members</Text>
              <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>Show complete team workload overview</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {teamMembersList.map((m) => {
                const uId = String(m.userId);
                const isSelected = selectedMemberId === uId;
                const activeCount = m.activeTasksCount || 0;

                return (
                  <TouchableOpacity
                    key={uId}
                    onPress={() => {
                      setSelectedMemberId(uId);
                      setMemberFilterModalOpen(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? 'rgba(212,175,55,0.15)' : surfaceBg,
                      borderWidth: 1,
                      borderColor: isSelected ? GOLD : borderColor,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? GOLD : textPrimary }}>{m.name}</Text>
                      <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>{m.role || 'Team Member'}</Text>
                    </View>
                    <View style={{ backgroundColor: activeCount > 0 ? GOLD : borderColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: activeCount > 0 ? '#000000' : textSecondary }}>{activeCount} active</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 10: Member Complete Workload Tasks Sheet */}
      <Modal visible={memberTasksSheetOpen} transparent animationType="slide" onRequestClose={() => setMemberTasksSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setMemberTasksSheetOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>{stagedMemberDetails?.name || 'Member Tasks'}</Text>
                <Text style={{ fontSize: 12, color: textSecondary }}>{stagedMemberDetails?.role || 'Team Member'}</Text>
              </View>
              <TouchableOpacity onPress={() => setMemberTasksSheetOpen(false)}><Ionicons name="close" size={22} color={textSecondary} /></TouchableOpacity>
            </View>

            {/* Member Tasks List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 14 }}>
              {(() => {
                const targetUId = String(stagedMemberDetails?.userId || '');
                const targetNameLower = String(stagedMemberDetails?.name || '').trim().toLowerCase();

                const mTasks = activeTasks.filter((t) => {
                  const toId = typeof t.assignedTo === 'object' ? String(t.assignedTo?.userId || '') : String(t.assignedTo || '');
                  const toName = typeof t.assignedTo === 'object' ? String(t.assignedTo?.name || '').trim().toLowerCase() : '';
                  return (toId && toId === targetUId) || (toName && targetNameLower && toName === targetNameLower);
                });

                if (mTasks.length === 0) {
                  return (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: textSecondary }}>No tasks currently assigned to this member</Text>
                    </View>
                  );
                }

                return mTasks.map((t, idx) => {
                  const isCompleted = t.status === 'Completed';
                  const assigner = typeof t.assignedBy === 'object' ? t.assignedBy?.name : t.assignedBy;

                  return (
                    <TouchableOpacity
                      key={t._id || `m_sheet_${idx}`}
                      onPress={() => {
                        setMemberTasksSheetOpen(false);
                        setActiveWorkspaceTask(t);
                      }}
                      style={{ backgroundColor: surfaceBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor, marginBottom: 8 }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{t.title}</Text>
                      <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }} numberOfLines={2}>{t.description || 'No detailed instructions provided.'}</Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: borderColor }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isCompleted ? '#10B981' : GOLD }}>
                          {t.status === 'Pending Acceptance' ? 'Awaiting Acceptance' : t.status}
                        </Text>
                        {!!assigner && <Text style={{ fontSize: 11, color: textSecondary }}>Assigned by: {assigner}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity onPress={() => setMemberTasksSheetOpen(false)} style={{ height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000' }}>Close Workload Sheet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
