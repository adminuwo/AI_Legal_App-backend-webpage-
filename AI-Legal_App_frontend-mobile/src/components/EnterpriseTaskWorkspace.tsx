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
import { useThemeContext } from '@/providers';

export type TaskRole = 'Managing Partner' | 'Senior Advocate' | 'Junior Advocate' | 'Intern';

export interface TaskTeamMember {
  id: string;
  name: string;
  avatarIcon: string;
  taskRole: string; // e.g. 'Lead Advocate', 'Research Associate', 'Junior Advocate', 'Senior Advocate'
  responsibility: string;
  status: 'Working' | 'Completed' | 'Pending' | 'Waiting';
  designation: string;
  assignedSince: string;
  progress: number;
}

export interface TaskDocument {
  id: string;
  name: string;
  uploadedBy: string;
  uploadedTime: string;
  version: string;
  tag: string;
}

export interface DiscussionMessage {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
}

interface EnterpriseTaskWorkspaceProps {
  task: any;
  caseTitle: string;
  currentUserRole?: TaskRole;
  onBack: () => void;
  onUpdateTask?: (updatedTask: any) => void;
}

export const EnterpriseTaskWorkspace: React.FC<EnterpriseTaskWorkspaceProps> = ({
  task,
  caseTitle,
  currentUserRole = 'Managing Partner',
  onBack,
  onUpdateTask,
}) => {
  const { theme, isDark } = useThemeContext();

  // RBAC Controls
  const canDeleteTask = currentUserRole === 'Managing Partner';
  const canApproveReject = ['Managing Partner', 'Senior Advocate'].includes(currentUserRole);
  const canAssignTeam = ['Managing Partner'].includes(currentUserRole);
  const canEditDetails = ['Managing Partner', 'Senior Advocate'].includes(currentUserRole);
  const canCloseTask = ['Managing Partner', 'Senior Advocate'].includes(currentUserRole);

  // States
  const [taskTitle, setTaskTitle] = useState(task?.title || 'Prepare Final Written Arguments');
  const [taskStatus, setTaskStatus] = useState<string>(task?.status || 'In Progress');
  const [taskPriority, setTaskPriority] = useState<string>(task?.priority || 'High');
  const [completionPercentage, setCompletionPercentage] = useState(65);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TaskTeamMember | null>(null);

  // Checklist
  const [checklist, setChecklist] = useState([
    { id: '1', title: 'Add latest Supreme Court precedent', checked: true },
    { id: '2', title: 'Verify citations and volume index', checked: true },
    { id: '3', title: 'Upload PDF and e-file before 6 PM deadline', checked: false },
    { id: '4', title: 'Coordinate with Research Team for replica briefs', checked: false },
  ]);

  // Assigned Team (Derived dynamically from real task assigner and assignee)
  const [teamMembers, setTeamMembers] = useState<TaskTeamMember[]>(() => {
    const list: TaskTeamMember[] = [];
    const assignerName = typeof task?.assignedBy === 'object' ? task.assignedBy?.name : task?.assignedBy;
    const assignerRole = typeof task?.assignedBy === 'object' ? task.assignedBy?.role : 'Firm Owner';
    const assigneeName = typeof task?.assignedTo === 'object' ? task.assignedTo?.name : task?.assignedTo;
    const assigneeRole = typeof task?.assignedTo === 'object' ? task.assignedTo?.role : 'Team Member';

    if (assignerName && assignerName !== 'Advocate' && assignerName !== 'Team Member') {
      list.push({
        id: 'tm_assigner',
        name: assignerName,
        avatarIcon: '👤',
        taskRole: assignerRole || 'Firm Owner',
        responsibility: 'Task Assigner & Supervisor',
        status: 'Working',
        designation: assignerRole || 'Firm Owner',
        assignedSince: task?.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Active',
        progress: 100,
      });
    }

    if (assigneeName && assigneeName !== 'Advocate' && assigneeName !== 'Team Member' && assigneeName !== assignerName) {
      list.push({
        id: 'tm_assignee',
        name: assigneeName,
        avatarIcon: '👤',
        taskRole: assigneeRole || 'Assigned Advocate',
        responsibility: task?.description || 'Assigned Case Task',
        status: task?.status === 'Completed' ? 'Completed' : task?.status === 'Rejected' ? 'Waiting' : 'Working',
        designation: assigneeRole || 'Junior Advocate',
        assignedSince: task?.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Active',
        progress: task?.status === 'Completed' ? 100 : 50,
      });
    }

    return list;
  });

  // Real Documents (Empty if no real uploaded documents exist on task)
  const [documents, setDocuments] = useState<TaskDocument[]>(() => {
    if (Array.isArray(task?.documents) && task.documents.length > 0) {
      return task.documents;
    }
    if (task?.relatedDocument) {
      return [{
        id: 'td_real_1',
        name: typeof task.relatedDocument === 'object' ? (task.relatedDocument.name || 'Case_Document.pdf') : String(task.relatedDocument),
        uploadedBy: typeof task.assignedBy === 'object' ? (task.assignedBy?.name || 'Advocate') : 'Advocate',
        uploadedTime: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently',
        version: 'v1.0',
        tag: 'Document'
      }];
    }
    return [];
  });

  // Real Timeline Events
  const [timeline, setTimeline] = useState(() => {
    const events: Array<{ id: string; user: string; time: string; action: string }> = [];
    const assigner = typeof task?.assignedBy === 'object' ? (task.assignedBy?.name || 'Firm Owner') : (task?.assignedBy || 'Firm Owner');
    const assignee = typeof task?.assignedTo === 'object' ? (task.assignedTo?.name || 'Assignee') : (task?.assignedTo || 'Assignee');
    const timeStr = task?.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently';

    events.push({ id: 'tl_created', user: assigner, time: timeStr, action: `Created task "${task?.title || 'Legal Task'}"` });
    if (assignee && assignee !== assigner) {
      events.push({ id: 'tl_assigned', user: assigner, time: timeStr, action: `Assigned task to ${assignee}` });
    }
    if (task?.acceptedAt) {
      events.push({ id: 'tl_accepted', user: assignee, time: new Date(task.acceptedAt).toLocaleDateString(), action: 'Accepted task assignment' });
    }
    if (task?.rejectedAt) {
      events.push({ id: 'tl_rejected', user: assignee, time: new Date(task.rejectedAt).toLocaleDateString(), action: `Rejected task (Reason: ${task.rejectionReason || 'Declined'})` });
    }
    if (task?.status === 'Completed') {
      events.push({ id: 'tl_completed', user: assignee, time: 'Completed', action: 'Marked task as completed' });
    }
    return events;
  });

  // Real Discussion Comments
  const [discussion, setDiscussion] = useState<DiscussionMessage[]>(() => {
    if (Array.isArray(task?.comments) && task.comments.length > 0) {
      return task.comments;
    }
    if (Array.isArray(task?.progressUpdates) && task.progressUpdates.length > 0) {
      return task.progressUpdates.map((pu: any, idx: number) => ({
        id: `pu_${idx}`,
        author: pu.author || pu.name || 'Advocate',
        role: pu.role || 'Advocate',
        text: pu.text || pu.update || pu.message || '',
        timestamp: pu.createdAt ? new Date(pu.createdAt).toLocaleTimeString() : 'Recently'
      }));
    }
    return [];
  });
  const [messageInput, setMessageInput] = useState('');

  // Handlers
  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, checked: !item.checked };
          const checkedCount = prev.filter((i) => (i.id === id ? !i.checked : i.checked)).length;
          setCompletionPercentage(Math.round((checkedCount / prev.length) * 100));
          return updated;
        }
        return item;
      })
    );
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const newMessage: DiscussionMessage = {
      id: `dm_${Date.now()}`,
      author: currentUserRole.includes('Partner') ? 'Adv. Rajesh Sharma' : 'Adv. Rahul Verma',
      role: currentUserRole,
      text: messageInput.trim(),
      timestamp: 'Just now',
    };
    setDiscussion((prev) => [...prev, newMessage]);
    setTimeline((prev) => [
      { id: `tl_${Date.now()}`, user: newMessage.author, time: 'Just now', action: 'Posted Discussion Comment' },
      ...prev,
    ]);
    setMessageInput('');
  };

  const handleSimulateUploadDoc = () => {
    const newDoc: TaskDocument = {
      id: `td_${Date.now()}`,
      name: `Written_Arguments_v${documents.length + 1}.pdf`,
      uploadedBy: 'Adv. Rahul Verma',
      uploadedTime: 'Just now',
      version: 'v1.0',
      tag: 'Arguments',
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setTimeline((prev) => [
      { id: `tl_${Date.now()}`, user: 'Adv. Rahul Verma', time: 'Just now', action: `Uploaded ${newDoc.name}` },
      ...prev,
    ]);
    Alert.alert('Document Uploaded', `${newDoc.name} added to task repository.`);
  };

  const handleMarkComplete = () => {
    setTaskStatus('Completed');
    setCompletionPercentage(100);
    setTimeline((prev) => [
      { id: `tl_${Date.now()}`, user: 'Adv. Rajesh Sharma', time: 'Just now', action: 'Marked Task as Completed' },
      ...prev,
    ]);
    if (onUpdateTask) {
      onUpdateTask({ ...task, status: 'Completed' });
    }
    Alert.alert('Task Completed', 'Calendar, dashboard sync, and notifications updated.');
  };

  const handleUpdateProgress = () => {
    Alert.prompt('Update Progress', 'Enter new completion percentage (0 - 100):', (val) => {
      const num = parseInt(val);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        setCompletionPercentage(num);
        if (num === 100) setTaskStatus('Completed');
        Alert.alert('Progress Updated', `Completion set to ${num}%.`);
      }
    });
  };

  const getPriorityColor = (prio: string) => {
    switch (prio.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.topHeaderTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {taskTitle}
          </Text>
          <Text style={[styles.topHeaderSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {caseTitle}
          </Text>
        </View>

        {canEditDetails && (
          <TouchableOpacity style={[styles.smallOutlineBtn, { borderColor: theme.border }]} onPress={() => setIsEditModalOpen(true)}>
            <Ionicons name="pencil-outline" size={13} color={theme.textPrimary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary, marginLeft: 3 }}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ==========================================
            SECTION 1 — TASK OVERVIEW CARD
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>TASK OVERVIEW</Text>
          <Text style={[styles.taskMainTitle, { color: theme.textPrimary }]}>{taskTitle}</Text>

          <View style={styles.grid2Col}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Status</Text>
              <View style={[styles.statusPill, { backgroundColor: 'rgba(200, 163, 77, 0.12)' }]}>
                <Text style={styles.statusPillText}>{taskStatus}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Priority</Text>
              <View style={[styles.statusPill, { backgroundColor: `${getPriorityColor(taskPriority)}15` }]}>
                <Text style={[styles.statusPillText, { color: getPriorityColor(taskPriority) }]}>{taskPriority}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Due Date</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{task?.deadline || task?.dueDate || 'Not set'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned By</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{(typeof task?.assignedBy === 'object' ? (task.assignedBy?.name || task.assignedBy?.role) : task?.assignedBy) || 'Firm Owner'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Lead Assignee</Text>
              <Text style={[styles.fieldVal, { color: theme.textPrimary }]}>{(typeof task?.assignedTo === 'object' ? task.assignedTo?.name : task?.assignedTo) || 'Assignee'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Completion %</Text>
              <Text style={[styles.fieldVal, { color: '#C8A34D' }]}>{completionPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* ==========================================
            SECTION 2 — TASK DETAILS
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>TASK DETAILS</Text>

          <Text style={[styles.detailSectionHeader, { color: theme.textSecondary }]}>Objective</Text>
          <Text style={[styles.detailBody, { color: theme.textPrimary }]}>
            Prepare final written arguments on contract liability breach for Delhi High Court submission.
          </Text>

          <Text style={[styles.detailSectionHeader, { color: theme.textSecondary, marginTop: 10 }]}>Instructions & Checklist</Text>
          <View style={{ gap: 6, marginTop: 4 }}>
            {checklist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistRow}
                onPress={() => handleToggleChecklist(item.id)}
              >
                <Ionicons
                  name={item.checked ? 'checkbox' : 'square-outline'}
                  size={16}
                  color={item.checked ? '#C8A34D' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.checklistText,
                    {
                      color: theme.textPrimary,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                      opacity: item.checked ? 0.6 : 1,
                    },
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ==========================================
            SECTION 3 — ASSIGNED TEAM
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionLabel}>ASSIGNED TEAM</Text>
            {canAssignTeam && (
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => Alert.alert('+ Add Team Member', 'Choose team member to assign to this task.')}
              >
                <Ionicons name="add" size={14} color="#C8A34D" />
                <Text style={styles.addSmallBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 10, marginTop: 4 }}>
            {teamMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.teamRow,
                  { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border },
                ]}
                onPress={() => setSelectedMember(member)}
              >
                <View style={styles.avatarBox}>
                  <Text style={{ fontSize: 18 }}>{member.avatarIcon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.teamName, { color: theme.textPrimary }]}>{member.name}</Text>
                    <View style={[styles.memberStatusPill, { backgroundColor: 'rgba(200, 163, 77, 0.1)' }]}>
                      <Text style={styles.memberStatusText}>{member.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.teamRole, { color: '#C8A34D' }]}>{member.taskRole}</Text>
                  <Text style={[styles.teamResp, { color: theme.textSecondary }]}>{member.responsibility}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ==========================================
            SECTION 4 — DOCUMENTS
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionLabel}>TASK DOCUMENTS ({documents.length})</Text>
            <TouchableOpacity style={styles.addSmallBtn} onPress={handleSimulateUploadDoc}>
              <Ionicons name="cloud-upload-outline" size={13} color="#C8A34D" />
              <Text style={styles.addSmallBtnText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8, marginTop: 4 }}>
            {documents.map((doc) => (
              <View
                key={doc.id}
                style={[
                  styles.docRow,
                  { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border },
                ]}
              >
                <Ionicons name="document-text-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={[styles.docMeta, { color: theme.textSecondary }]}>
                    {doc.uploadedBy} • {doc.uploadedTime} • {doc.version}
                  </Text>
                </View>
                <View style={styles.docActions}>
                  <TouchableOpacity style={styles.docActionBtn} onPress={() => Alert.alert('View File', doc.name)}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#C8A34D' }}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ==========================================
            SECTION 5 — ACTIVITY TIMELINE
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>ACTIVITY TIMELINE</Text>
          <View style={styles.timelineList}>
            {timeline.map((item, idx) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineLeftCol}>
                  <View style={[styles.timelineDot, { backgroundColor: '#C8A34D' }]} />
                  {idx < timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineAction, { color: theme.textPrimary }]}>{item.action}</Text>
                  <Text style={[styles.timelineMeta, { color: theme.textSecondary }]}>
                    {item.user} • {item.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ==========================================
            SECTION 6 — TEAM DISCUSSION
        ========================================== */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.sectionLabel}>TEAM DISCUSSION</Text>

          <View style={styles.discussionBox}>
            {discussion.map((msg) => (
              <View key={msg.id} style={styles.msgItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.msgAuthor, { color: theme.textPrimary }]}>{msg.author}</Text>
                    <View style={styles.msgRoleBadge}>
                      <Text style={styles.msgRoleBadgeText}>{msg.role}</Text>
                    </View>
                  </View>
                  <Text style={[styles.msgTime, { color: theme.textSecondary }]}>{msg.timestamp}</Text>
                </View>
                <Text style={[styles.msgText, { color: theme.textPrimary }]}>{msg.text}</Text>
              </View>
            ))}
          </View>

          {/* Add Message Box */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[
                styles.messageInput,
                { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary },
              ]}
              placeholder="Post team update or comment..."
              placeholderTextColor={theme.textSecondary}
              value={messageInput}
              onChangeText={setMessageInput}
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#C8A34D' }]} onPress={handleSendMessage}>
              <Ionicons name="send" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={[styles.bottomStickyBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity style={[styles.stickyBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} onPress={handleSimulateUploadDoc}>
          <Ionicons name="document-attach-outline" size={15} color={theme.textPrimary} />
          <Text style={[styles.stickyBtnText, { color: theme.textPrimary }]}>Upload Doc</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.stickyBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} onPress={handleUpdateProgress}>
          <Ionicons name="trending-up-outline" size={15} color={theme.textPrimary} />
          <Text style={[styles.stickyBtnText, { color: theme.textPrimary }]}>Progress</Text>
        </TouchableOpacity>

        {canCloseTask && taskStatus !== 'Completed' && (
          <TouchableOpacity style={[styles.stickyBtn, { backgroundColor: '#C8A34D' }]} onPress={handleMarkComplete}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
            <Text style={[styles.stickyBtnText, { color: '#FFFFFF' }]}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MEMBER MINI-PROFILE MODAL */}
      <Modal visible={!!selectedMember} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMember(null)}>
          {selectedMember && (
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.profileAvatarBox}>
                  <Text style={{ fontSize: 26 }}>{selectedMember.avatarIcon}</Text>
                </View>
                <Text style={[styles.profileName, { color: theme.textPrimary }]}>{selectedMember.name}</Text>
                <Text style={[styles.profileRole, { color: '#C8A34D' }]}>{selectedMember.taskRole}</Text>
                <Text style={[styles.profileDesignation, { color: theme.textSecondary }]}>{selectedMember.designation}</Text>
              </View>

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />

              <View style={styles.profileFieldRow}>
                <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Responsibility</Text>
                <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]}>{selectedMember.responsibility}</Text>
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Current Progress</Text>
                <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]}>{selectedMember.progress}%</Text>
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={[styles.profileFieldLabel, { color: theme.textSecondary }]}>Assigned Since</Text>
                <Text style={[styles.profileFieldValue, { color: theme.textPrimary }]}>{selectedMember.assignedSince}</Text>
              </View>

              <TouchableOpacity
                style={[styles.closeProfileBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6', marginTop: 10 }]}
                onPress={() => setSelectedMember(null)}
              >
                <Text style={[styles.closeProfileBtnText, { color: theme.textPrimary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* EDIT TASK DETAILS MODAL */}
      <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditModalOpen(false)}>
          <View style={[styles.formModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Edit Task Details</Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 8 }]}>Task Title</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 8 }]}>Priority</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={taskPriority}
              onChangeText={setTaskPriority}
            />

            <TouchableOpacity
              style={[styles.goldBtn, { marginTop: 16 }]}
              onPress={() => {
                setIsEditModalOpen(false);
                Alert.alert('Task Updated', 'Basic task overview fields updated successfully.');
              }}
            >
              <Text style={styles.goldBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  topHeaderSub: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  smallOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  taskMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 10,
  },
  gridItem: {
    width: '48%',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
  },
  detailSectionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 8,
  },
  detailBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  checklistText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C8A34D',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '800',
  },
  teamRole: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 1,
  },
  teamResp: {
    fontSize: 11,
    marginTop: 2,
  },
  memberStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C8A34D',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  docName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  docMeta: {
    fontSize: 10.5,
    marginTop: 1,
  },
  docActions: {
    flexDirection: 'row',
    gap: 6,
  },
  docActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
  },
  timelineList: {
    marginTop: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeftCol: {
    width: 14,
    alignItems: 'center',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 6,
  },
  timelineAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  discussionBox: {
    maxHeight: 250,
    gap: 10,
  },
  msgItem: {
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  msgAuthor: {
    fontSize: 12,
    fontWeight: '800',
  },
  msgRoleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
  },
  msgRoleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C8A34D',
  },
  msgTime: {
    fontSize: 10,
  },
  msgText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  messageInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12.5,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
    justifyContent: 'space-between',
  },
  stickyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    gap: 4,
  },
  stickyBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
  },
  profileAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileRole: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  profileDesignation: {
    fontSize: 11.5,
    marginTop: 2,
  },
  profileFieldRow: {
    marginBottom: 8,
  },
  profileFieldLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  profileFieldValue: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  closeProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeProfileBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  formModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  formModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12.5,
    marginTop: 4,
  },
  goldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A34D',
    height: 38,
    borderRadius: 8,
    gap: 4,
  },
  goldBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
