import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  LayoutAnimation,
  Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OutputLanguageSelector } from './ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { Shadows } from '@/theme';
import { CaseWorkspace } from '@/types';
import { useToastContext, useWorkspaceContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseOperationsHubModal } from './CaseOperationsHubModal';
import { InviteTeamMemberModal } from './InviteTeamMemberModal';
import { ShareUploadDocumentModal } from './ShareUploadDocumentModal';
import { useUserStore } from '@/store/user';

interface FirmWorkspaceSectionProps {
  theme: any;
  isDark: boolean;
  cases: CaseWorkspace[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenNewCaseModal: () => void;
}

// Sub-modules within Firm Workspace
type WorkspaceModule =
  | 'active_cases'
  | 'review_queue'
  | 'team_workspace'
  | 'client_crm'
  | 'hearings'
  | 'tasks'
  | 'activity_timeline';

export const FirmWorkspaceSection: React.FC<FirmWorkspaceSectionProps> = ({
  theme,
  isDark,
  cases,
  onOpenNewCaseModal,
  onRefresh,
}) => {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { activeWorkspace, members, teamStats, refreshTeamMembers } = useWorkspaceContext();
  const profile = useUserStore((s) => s.profile);
  const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
  const userProfileAdvocate = profileName
    ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
    : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : 'Adv. Advocate');

  const activeTeamMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m, idx) => ({
        name: m.name || m.fullName || 'Team Member',
        role: m.role || 'Associate Advocate',
        department: m.department || 'General Practice',
        email: m.email || '',
        phone: m.phone || '',
        activeCases: 0,
        hearingsToday: 0,
        tasksPending: 0,
        avatarBg: m.isOwner ? '#C8A34D' : ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'][idx % 4],
        isOwner: Boolean(m.isOwner),
        status: m.status
      }));
    }
    return [
      {
        name: userProfileAdvocate,
        role: 'Managing Partner',
        department: 'Corporate & Management',
        email: profile?.email || 'lawyer@firm.com',
        phone: '+91 98765 43210',
        activeCases: 0,
        hearingsToday: 0,
        tasksPending: 0,
        avatarBg: '#C8A34D',
        isOwner: true,
        status: 'Accepted'
      }
    ];
  }, [members]);

  // Search & Filter State
  const [outputLanguage, setOutputLanguage] = useState('English');

  React.useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_firm-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState('All');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('active_cases');
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReviewQueueExpanded, setIsReviewQueueExpanded] = useState(false);

  // Enterprise Quick Action Form Modals State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAssignTeamModalOpen, setIsAssignTeamModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isScheduleHearingModalOpen, setIsScheduleHearingModalOpen] = useState(false);
  const [isInviteTeamOpen, setIsInviteTeamOpen] = useState(false);
  const [isShareDocOpen, setIsShareDocOpen] = useState(false);

  // Client Invitation System States
  const [isClientInviteConfirmOpen, setIsClientInviteConfirmOpen] = useState(false);
  const [isReviewInviteModalOpen, setIsReviewInviteModalOpen] = useState(false);
  const [pendingInviteClient, setPendingInviteClient] = useState<any>(null);
  const [activePreviewClient, setActivePreviewClient] = useState<any>(null);

  // Extended Add Client Form Fields State
  const [clientFullName, setClientFullName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientOrg, setClientOrg] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [assignedAdvocateVal, setAssignedAdvocateVal] = useState('Adv. Rajesh Sharma (Senior Advocate)');
  const [selectedClientTags, setSelectedClientTags] = useState<string[]>(['Civil']);
  const [clientPriorityVal, setClientPriorityVal] = useState('Medium');
  const [sendInviteCheckbox, setSendInviteCheckbox] = useState(true);

  // Client CRM Master Data
  const [clientList, setClientList] = useState([
    {
      id: '1',
      name: 'Ramesh Chandra Agrawal',
      contact: '+91 98765 43210',
      email: 'ramesh@agrawal.com',
      org: 'Agrawal Enterprises',
      casesCount: 2,
      pendingPayment: '₹45,000',
      status: 'Connected',
      advocate: 'Adv. Rajesh Sharma',
      tags: ['Civil', 'Corporate'],
      priority: 'High',
    },
    {
      id: '2',
      name: 'Suresh Kumar (Director)',
      contact: '+91 91234 56789',
      email: 'suresh@apexlogistics.com',
      org: 'Apex Logistics Pvt Ltd',
      casesCount: 1,
      pendingPayment: '₹1,20,000',
      status: 'Invitation Pending',
      advocate: 'Adv. Priya Sharma',
      tags: ['Arbitration'],
      priority: 'Medium',
    },
    {
      id: '3',
      name: 'Anita Desai',
      contact: '+91 99887 76655',
      email: 'anita.desai@gmail.com',
      org: 'Individual',
      casesCount: 1,
      pendingPayment: '₹0',
      status: 'Connected',
      advocate: 'Adv. Rajesh Sharma',
      tags: ['Family'],
      priority: 'Low',
    },
  ]);

  // 2. Enterprise Team Assignment System State
  const [selectedWorkspaceForTeam, setSelectedWorkspaceForTeam] = useState('Rajesh Sharma vs Amit Verma');
  const [teamLeaderVal, setTeamLeaderVal] = useState('Adv. Rajesh Sharma (Senior Advocate)');
  const [primaryAdvocateVal, setPrimaryAdvocateVal] = useState('Adv. Priya Sharma (Associate)');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>(['Adv. Amit Kumar', 'Adv. Sneha Gupta']);
  const [memberRolesMap, setMemberRolesMap] = useState<{ [key: string]: string }>({
    'Adv. Amit Kumar': 'Junior Advocate',
    'Adv. Sneha Gupta': 'Research Associate',
  });
  const [teamResponsibilities, setTeamResponsibilities] = useState<string[]>([
    'Drafting',
    'Legal Research',
    'Evidence Review',
  ]);
  const [teamPermissionsMap, setTeamPermissionsMap] = useState<{ [key: string]: boolean }>({
    'View Case': true,
    'Edit Case': true,
    'Upload Documents': true,
    'Generate Drafts': true,
    'Review Evidence': true,
    'Schedule Hearings': true,
    'Access AI Tools': true,
    'Client Messaging': false,
    'Assign Tasks': false,
    'Manage Team': false,
  });
  const [teamAccessLevel, setTeamAccessLevel] = useState<'Full Access' | 'Limited Access' | 'Read Only'>('Full Access');
  const [assignmentNotesVal, setAssignmentNotesVal] = useState('');
  const [assignmentValidUntil, setAssignmentValidUntil] = useState('30th August 2026');
  const [notifyChannels, setNotifyChannels] = useState<{ [key: string]: boolean }>({
    'AI LEGAL Notification': true,
    Email: false,
    WhatsApp: false,
  });

  // 3. Enterprise Task System State
  const [taskTitleVal, setTaskTitleVal] = useState('');
  const [taskWorkspaceVal, setTaskWorkspaceVal] = useState('Rajesh Sharma vs Amit Verma');
  const [taskClientVal, setTaskClientVal] = useState('Ramesh Chandra Agrawal');
  const [selectedTaskAssignees, setSelectedTaskAssignees] = useState<string[]>(['Adv. Amit Kumar']);
  const [taskReviewerVal, setTaskReviewerVal] = useState('Adv. Rajesh Sharma (Senior Advocate)');
  const [taskCategoryVal, setTaskCategoryVal] = useState('Drafting');
  const [taskPriorityVal, setTaskPriorityVal] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('High');
  const [taskDueDateVal, setTaskDueDateVal] = useState('Tomorrow, 5:00 PM');
  const [taskEstDurationVal, setTaskEstDurationVal] = useState('2 Hours');
  const [taskDescVal, setTaskDescVal] = useState('');
  const [taskChecklistItems, setTaskChecklistItems] = useState([
    { id: '1', title: 'Review FIR and Copy of Chargesheet', completed: true },
    { id: '2', title: 'Research Section 438 CrPC & SC Precedents', completed: false },
    { id: '3', title: 'Draft Anticipatory Bail Grounds', completed: false },
    { id: '4', title: 'Senior Advocate Review & Sign-off', completed: false },
  ]);
  const [taskDependencyVal, setTaskDependencyVal] = useState('None');
  const [taskVisibilityVal, setTaskVisibilityVal] = useState('Team Only');

  // Master Enterprise Tasks List
  const [tasks, setTasks] = useState([
    {
      id: 't1',
      title: 'Prepare Anticipatory Bail Draft Petition',
      workspace: 'State of MH v. Kapoor',
      client: 'Sunil Kapoor',
      assignedTo: ['Adv. Rahul Verma'],
      reviewer: 'Adv. Rajesh Sharma',
      category: 'Drafting',
      status: 'In Progress',
      dueDate: 'Tomorrow, 5 PM',
      priority: 'High',
      checklist: [
        { id: 'c1', title: 'Review FIR Copy', completed: true },
        { id: 'c2', title: 'Draft Grounds for Bail', completed: true },
        { id: 'c3', title: 'Submit for Senior Review', completed: false },
      ],
    },
    {
      id: 't2',
      title: 'Collect Bank Statement Evidence & Audit Log',
      workspace: 'Apex Logistics Customs Case',
      client: 'Apex Logistics Pvt Ltd',
      assignedTo: ['Priya Sharma'],
      reviewer: 'Adv. Rajesh Sharma',
      category: 'Evidence Review',
      status: 'Waiting for Review',
      dueDate: 'Today, 8 PM',
      priority: 'Urgent',
      checklist: [
        { id: 'c1', title: 'Download Bank PDF Statements', completed: true },
        { id: 'c2', title: 'Attach Forensic Audit Summary', completed: true },
      ],
    },
    {
      id: 't3',
      title: 'File Vakalatnama in High Court Courtroom 4',
      workspace: 'FinTech Corp Arbitration',
      client: 'FinTech Innovations Corp',
      assignedTo: ['Aman Kumar'],
      reviewer: 'Adv. Meera Nair',
      category: 'Court Filing',
      status: 'To Do',
      dueDate: 'Jul 22',
      priority: 'Medium',
      checklist: [
        { id: 'c1', title: 'Print Vakalatnama Form', completed: false },
        { id: 'c2', title: 'Obtain Client Signature', completed: false },
      ],
    },
  ]);

  // 4. Enterprise Court Hearing System State
  const [hearingWorkspaceVal, setHearingWorkspaceVal] = useState('State of MH v. Kapoor');
  const [hearingClientVal, setHearingClientVal] = useState('Sunil Kapoor');
  const [hearingTypeVal, setHearingTypeVal] = useState('Bail Hearing');
  const [hearingCourtNameVal, setHearingCourtNameVal] = useState('Delhi High Court - Court 4');
  const [hearingJudgeNameVal, setHearingJudgeNameVal] = useState("Hon'ble Justice A.K. Sharma");
  const [hearingDateVal, setHearingDateVal] = useState('Jul 25, 2026');
  const [hearingTimeVal, setHearingTimeVal] = useState('10:30 AM');
  const [hearingModeVal, setHearingModeVal] = useState<'Physical' | 'Virtual' | 'Hybrid'>('Physical');
  const [assignedHearingAdvocateVal, setAssignedHearingAdvocateVal] = useState('Adv. Rajesh Sharma');
  const [additionalHearingTeam, setAdditionalHearingTeam] = useState<string[]>(['Adv. Priya Sharma', 'Aman Kumar']);
  const [clientAttendanceVal, setClientAttendanceVal] = useState('Client Required');
  const [hearingPurposeVal, setHearingPurposeVal] = useState('Arguments on anticipatory bail application under Section 438 CrPC.');
  const [requiredHearingDocs, setRequiredHearingDocs] = useState<string[]>(['FIR Copy', 'Charge Sheet', 'Evidence Bundle', 'Written Arguments']);
  const [linkedEvidenceList, setLinkedEvidenceList] = useState<string[]>(['CCTV Footage', 'Call Recording', 'Medical Audit Report']);
  const [hearingChecklistItems, setHearingChecklistItems] = useState([
    { id: '1', title: 'Review FIR and Witness Statements', completed: true },
    { id: '2', title: 'Print Draft Petition & Supreme Court Precedents', completed: true },
    { id: '3', title: 'Verify Forensic Evidence Bundle Originals', completed: false },
    { id: '4', title: 'Confirm Client Attendance & Arrive 30 Mins Early', completed: false },
  ]);

  // Post-Hearing Workflow State
  const [isPostHearingModalOpen, setIsPostHearingModalOpen] = useState(false);
  const [activePostHearingItem, setActivePostHearingItem] = useState<any>(null);
  const [postHearingOutcomeVal, setPostHearingOutcomeVal] = useState('Arguments Heard');
  const [postHearingJudgeRemarksVal, setPostHearingJudgeRemarksVal] = useState('');
  const [postHearingNotesVal, setPostHearingNotesVal] = useState('');
  const [nextHearingDateVal, setNextHearingDateVal] = useState('18th August 2026');

  // Master Enterprise Hearings List
  const [hearingsList, setHearingsList] = useState([
    {
      id: 'h1',
      case: 'State of MH v. Kapoor',
      client: 'Sunil Kapoor',
      court: 'Delhi High Court - Court 4',
      judge: "Hon'ble Justice A.K. Sharma",
      lawyer: 'Adv. Rajesh Sharma',
      type: 'Bail Hearing',
      time: '10:30 AM',
      date: 'Today',
      prep: 'Arguments Ready (AI Prepared)',
      status: 'Upcoming',
      mode: 'Physical',
      checklist: [
        { id: 'c1', title: 'Review FIR Copy', completed: true },
        { id: 'c2', title: 'Verify Evidence Bundle', completed: true },
      ],
    },
    {
      id: 'h2',
      case: 'Apex Logistics v. Customs',
      client: 'Apex Logistics Pvt Ltd',
      court: 'Patiala House District Court',
      judge: "Hon'ble Judge M.K. Verma",
      lawyer: 'Adv. Priya Sharma',
      type: 'Evidence',
      time: '02:00 PM',
      date: 'Tomorrow',
      prep: 'Evidence Submitted',
      status: 'Scheduled',
      mode: 'Physical',
      checklist: [
        { id: 'c1', title: 'Download Customs Audit PDF', completed: true },
        { id: 'c2', title: 'Obtain Signatures', completed: false },
      ],
    },
  ]);

  const [myHearingsOnly, setMyHearingsOnly] = useState(false);
  const [hearingCounts, setHearingCounts] = useState({ today: 0, upcoming: 0, pendingPrep: 0, completed: 0 });

  const fetchWorkspaceHearings = React.useCallback(async () => {
    try {
      const activeWsId = (activeWorkspace as any)?._id || (activeWorkspace as any)?.id;
      const res: any = await CaseService.getWorkspaceHearings(activeWsId, myHearingsOnly);
      if (res && res.success && Array.isArray(res.hearings)) {
        setHearingsList(res.hearings.map((h: any) => ({
          id: h.id || h._id,
          _id: h._id || h.id,
          caseId: h.caseId,
          case: h.caseName || h.case || 'Case Workspace',
          client: h.clientName || 'Firm Client',
          court: h.courtName || h.court || 'High Court',
          judge: h.judge || "Hon'ble Bench",
          lawyer: h.appearingAdvocateName || h.lawyer || 'Assigned Advocate',
          appearingAdvocateUserId: h.appearingAdvocateUserId,
          type: h.title || h.purpose || 'Court Hearing',
          time: h.time || '10:30 AM',
          date: h.date || 'Scheduled Date',
          prep: h.preparationStatus === 'Prepared' ? 'AI Prepared' : 'Preparation Pending',
          status: h.status || 'Scheduled',
          mode: h.mode || 'Physical',
          checklist: h.checklist || [],
        })));
        if (res.counts) setHearingCounts(res.counts);
      }
    } catch (err) {
      console.warn('[FirmWorkspaceSection] Failed to fetch workspace hearings:', err);
    }
  }, [activeWorkspace, myHearingsOnly]);

  React.useEffect(() => {
    if (activeModule === 'hearings') {
      fetchWorkspaceHearings();
    }
  }, [activeModule, (activeWorkspace as any)?._id, (activeWorkspace as any)?.id, myHearingsOnly, fetchWorkspaceHearings]);

  const toggleReviewQueue = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsReviewQueueExpanded(!isReviewQueueExpanded);
  };

  // Review Queue Action state feedback
  const [reviewedIds, setReviewedIds] = useState<{ [key: string]: 'approved' | 'rejected' }>({});

  // Mock Review Items for Demonstration
  const [reviewItems] = useState([
    { id: '1', title: 'Bail Application Draft', submittedBy: 'Adv. Rahul Verma (Junior)', caseName: 'State of Maharashtra v. Kapoor', time: '10 mins ago', type: 'Draft' },
    { id: '2', title: 'Forensic Audit Report Evidence', submittedBy: 'Priya Sharma (Associate)', caseName: 'Apex Logistics v. Custom Dept', time: '25 mins ago', type: 'Evidence' },
    { id: '3', title: 'Section 420 IPC Precedents Research', submittedBy: 'Aman Kumar (Paralegal)', caseName: 'FinTech Corp Arbitration', time: '1 hour ago', type: 'Research' },
  ]);

  // Dynamic Team Members Data is derived from activeTeamMembers memo

  // Mock Activity Feed
  const activityLogs = [
    { time: '10:45 AM', log: 'Adv. Rahul Verma uploaded Bail Application Draft for State v. Kapoor' },
    { time: '10:12 AM', log: 'Senior Partner Adv. Rajesh Sharma approved Writ Petition for Apex Logistics' },
    { time: '09:30 AM', log: 'Priya Sharma scheduled court hearing for Jul 25 in Patiala House Court' },
    { time: 'Yesterday', log: 'Client Apex Logistics paid retainer invoice ₹1,50,000' },
  ];

  const handleReviewAction = (id: string, action: 'approved' | 'rejected') => {
    setReviewedIds(prev => ({ ...prev, [id]: action }));
  };

  const handleDeleteCase = (c: CaseWorkspace) => {
    const caseId = c._id || c.id;
    if (!caseId) return;

    Alert.alert(
      'Delete Case Workspace',
      `Are you sure you want to delete "${c.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CaseService.deleteCase(caseId);
              showToast('success', 'Case Deleted', `${c.name} removed successfully.`);
              if (onRefresh) onRefresh();
            } catch (err: any) {
              showToast('error', 'Delete Failed', err?.message || 'Failed to delete case workspace.');
            }
          },
        },
      ]
    );
  };

  // Filtered active cases
  const filteredCases = cases.filter(c => {
    if (!c || !c.name) return false;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.clientName && c.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.courtName && c.courtName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterChip === 'All') return true;
    if (filterChip === 'Active') return c.status === 'Active' || !c.status;
    if (filterChip === 'Review Queue') return (c as any).hasPendingReview;
    if (filterChip === 'Hearings') return c.hearings && c.hearings.length > 0;
    if (filterChip === 'Completed' || filterChip === 'Closed') return c.status === 'Closed' || (c.status as any) === 'Completed';
    return true;
  });

  const getDynamicCreateAction = () => {
    switch (activeModule) {
      case 'active_cases':
        return { label: '+ New Case', action: onOpenNewCaseModal };
      case 'hearings':
        return { label: '+ Schedule Hearing', action: () => setIsScheduleHearingModalOpen(true) };
      case 'tasks':
        return { label: '+ Create Task', action: () => setIsCreateTaskModalOpen(true) };
      case 'team_workspace':
        return { label: '+ Assign Team', action: () => setIsAssignTeamModalOpen(true) };
      case 'client_crm':
        return { label: '+ Add Client', action: () => setIsAddClientModalOpen(true) };
      default:
        return { label: '+ Create', action: () => setIsFabMenuOpen(true) };
    }
  };

  const dynamicAction = getDynamicCreateAction();

  return (
    <View style={styles.container}>
      {/* 1. Header Block */}
      <View style={styles.headerBlock}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {tTool(outputLanguage, 'fw.title', 'Firm Workspace')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {tTool(outputLanguage, 'fw.subtitle', 'Manage cases, team, reviews & client work from one place.')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newCaseBtn, { backgroundColor: '#C8A34D' }]}
          onPress={() => setIsHubOpen(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newCaseBtnText}>{tTool(outputLanguage, 'fw.createBtn', '+ Create')}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Global Search Bar & 3-Dot Category Menu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={[styles.searchBar, { flex: 1, marginBottom: 0, backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
          <TextInput
            placeholder={tTool(outputLanguage, 'fw.searchPlaceholder', 'Search cases, clients, lawyers or tasks...')}
            placeholderTextColor={theme.placeholder}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.threeDotsBtn,
            { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }
          ]}
          onPress={() => setIsCategoryModalOpen(true)}
          accessibilityLabel="Open workspace overview categories"
          accessibilityRole="button"
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 7. MODULE CONTENT RENDERING */}

      {/* MODULE A: Firm Cases List */}
      {activeModule === 'active_cases' && (
        <View style={styles.moduleSection}>
          {filteredCases.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="folder-open" size={36} color="#C8A34D" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                No Firm Cases Yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Create your first litigation workspace and start collaborating with your legal team.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredCases.map((c, idx) => (
                <TouchableOpacity
                  key={c._id || c.id || `firm-case-${idx}`}
                  style={[styles.caseCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}
                  onPress={() => router.push(`/workspace/${c._id || c.id}` as any)}
                >
                  <View style={styles.caseCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.caseName, { color: theme.textPrimary }]}>{c.name}</Text>
                      <Text style={[styles.caseSub, { color: theme.textSecondary }]}>
                        {c.courtName || 'High Court'} • Client: {c.clientName || 'Private Client'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: '#C8A34D18' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#C8A34D' }}>{c.status || 'Active'}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ padding: 4 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(c);
                        }}
                        accessibilityLabel="Delete Case"
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.caseMetaRow}>
                    <Text style={[styles.caseMetaText, { color: theme.textMuted }]}>
                      👨‍⚖️ Lead: {((c as any).leadAdvocate && (c as any).leadAdvocate !== 'Adv. Aditi Lakhera' && (c as any).leadAdvocate !== 'Aditi Lakhera') ? (c as any).leadAdvocate : userProfileAdvocate}
                    </Text>
                    <Text style={[styles.caseMetaText, { color: theme.textMuted }]}>
                      📅 Next: {(c as any).nextHearingDate || (c.hearings && c.hearings[0]?.date) || 'Jul 28, 2026'}
                    </Text>
                  </View>

                  <View style={[styles.caseCardFooter, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity
                      style={[styles.caseActionBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                      onPress={() => router.push(`/workspace/${c._id || c.id}` as any)}
                    >
                      <Text style={[styles.caseActionBtnText, { color: theme.textPrimary }]}>Open Workspace →</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* MODULE B: ⭐ Senior Review Queue */}
      {activeModule === 'review_queue' && (
        <View style={styles.moduleSection}>
          <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>
            Senior Review & Approval Queue
          </Text>
          <Text style={[styles.moduleSub, { color: theme.textSecondary }]}>
            Review drafts, evidence, and research submitted by junior advocates before court submission.
          </Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            {reviewItems.map((item) => {
              const status = reviewedIds[item.id];
              return (
                <View
                  key={item.id}
                  style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewTag, { backgroundColor: item.type === 'Draft' ? '#8B5CF618' : '#F59E0B18' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: item.type === 'Draft' ? '#8B5CF6' : '#F59E0B' }}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.reviewTime, { color: theme.textMuted }]}>{item.time}</Text>
                  </View>

                  <Text style={[styles.reviewItemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.reviewItemSub, { color: theme.textSecondary }]}>
                    Submitted by: <Text style={{ fontWeight: '700' }}>{item.submittedBy}</Text>
                  </Text>
                  <Text style={[styles.reviewItemCase, { color: theme.textMuted }]}>Case: {item.caseName}</Text>

                  {status ? (
                    <View style={[styles.statusBanner, { backgroundColor: status === 'approved' ? '#10B98118' : '#EF444418' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: status === 'approved' ? '#10B981' : '#EF4444' }}>
                        {status === 'approved' ? '✓ APPROVED FOR COURT FILING' : '✗ REVISION REQUESTED FROM JUNIOR'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.reviewBtnRow}>
                      <TouchableOpacity
                        style={[styles.reviewActionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleReviewAction(item.id, 'approved')}
                      >
                        <Text style={styles.reviewActionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewActionBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleReviewAction(item.id, 'rejected')}
                      >
                        <Text style={styles.reviewActionBtnText}>Request Changes</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* MODULE C: Team Workspace */}
      {activeModule === 'team_workspace' && (
        <View style={styles.moduleSection}>
          <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>
            Firm Team Roster & Hierarchy ({activeTeamMembers.length})
          </Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {activeTeamMembers.map((tm, idx) => (
              <View
                key={idx}
                style={[styles.teamCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.avatarBox, { backgroundColor: tm.avatarBg }]}>
                  <Text style={styles.avatarText}>{tm.name.split(' ')[1]?.[0] || tm.name[0] || 'A'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.teamName, { color: theme.textPrimary }]}>
                    {tm.name} {tm.isOwner ? '👑' : ''}
                  </Text>
                  <Text style={[styles.teamRole, { color: theme.textSecondary }]}>{tm.role} • {tm.department}</Text>
                  <Text style={[styles.teamMeta, { color: theme.textMuted }]}>
                    Status: {tm.status || 'Accepted'}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.contactMiniBtn, { borderColor: theme.border }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#C8A34D" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* MODULE D: Client CRM */}
      {activeModule === 'client_crm' && (
        <View style={styles.moduleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>Client CRM & Retainers</Text>
            <TouchableOpacity
              style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => setIsAddClientModalOpen(true)}
            >
              <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>+ Add Client</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {clientList.map((client) => {
              const isConnected = client.status === 'Connected';
              const isPending = client.status === 'Invitation Pending';
              const isDeclined = client.status === 'Declined';

              const statusBg = isConnected
                ? '#10B98118'
                : isPending
                ? '#F59E0B18'
                : isDeclined
                ? '#EF444418'
                : '#9CA3AF18';

              const statusColor = isConnected
                ? '#10B981'
                : isPending
                ? '#F59E0B'
                : isDeclined
                ? '#EF4444'
                : '#9CA3AF';

              const statusIcon = isConnected
                ? 'checkmark-circle'
                : isPending
                ? 'time-outline'
                : isDeclined
                ? 'close-circle'
                : 'remove-circle-outline';

              return (
                <View key={client.id} style={[styles.clientCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.clientName, { color: theme.textPrimary }]}>{client.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                          <Ionicons name={statusIcon as any} size={10} color={statusColor} style={{ marginRight: 2 }} />
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: statusColor }}>{client.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={[styles.clientSub, { color: theme.textSecondary, marginTop: 2 }]}>
                        Assigned: <Text style={{ fontWeight: '700' }}>{client.advocate}</Text>
                      </Text>
                      <Text style={[styles.clientContact, { color: theme.textMuted }]}>{client.contact} • {client.email}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981' }}>{client.pendingPayment}</Text>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>Outstanding Dues</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {client.tags?.map((t) => (
                      <View key={t} style={[styles.tagChip, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#C8A34D' }}>#{t}</Text>
                      </View>
                    ))}
                    <View style={[styles.tagChip, { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: theme.border }]}>
                      <Text style={{ fontSize: 9.5, fontWeight: '600', color: theme.textSecondary }}>Priority: {client.priority}</Text>
                    </View>
                  </View>

                  <View style={[styles.clientActionRow, { borderTopColor: theme.border, marginTop: 10, paddingTop: 8 }]}>
                    {!isConnected ? (
                      <TouchableOpacity
                        style={[styles.clientActionBtn, { backgroundColor: '#C8A34D' }]}
                        onPress={() => {
                          setPendingInviteClient(client);
                          setIsClientInviteConfirmOpen(true);
                        }}
                      >
                        <Ionicons name="paper-plane-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                          {isPending ? 'Resend Invite' : 'Send Invite'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>Client Portal Connected</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.clientActionBtn, styles.clientPreviewBtn, { borderColor: theme.border }]}
                      onPress={() => {
                        setActivePreviewClient(client);
                        setIsReviewInviteModalOpen(true);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>Client Portal Preview</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* MODULE E: Enterprise Court Hearings Docket */}
      {activeModule === 'hearings' && (
        <View style={styles.moduleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>Court Hearings Docket</Text>
            <TouchableOpacity
              style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => setIsScheduleHearingModalOpen(true)}
            >
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>+ Schedule Hearing</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips: All Firm Hearings vs My Hearings */}
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: !myHearingsOnly ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                borderColor: !myHearingsOnly ? '#C8A34D' : theme.border,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
              }}
              onPress={() => setMyHearingsOnly(false)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: !myHearingsOnly ? '#FFFFFF' : theme.textSecondary }}>
                All Firm Hearings ({hearingsList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: myHearingsOnly ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                borderColor: myHearingsOnly ? '#C8A34D' : theme.border,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
              onPress={() => setMyHearingsOnly(true)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: myHearingsOnly ? '#FFFFFF' : theme.textSecondary }}>
                My Hearings
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {hearingsList.map((h) => {
              const isCompleted = h.status === 'Completed';

              return (
                <View key={h.id} style={[styles.hearingCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#10B98118' : '#C8A34D18' }]}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isCompleted ? '#10B981' : '#C8A34D' }}>
                            {h.status.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.tagChip, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#C8A34D' }}>{h.type}</Text>
                        </View>
                      </View>
                      <Text style={[styles.hearingCase, { color: theme.textPrimary, marginTop: 4 }]}>{h.case}</Text>
                      <Text style={[styles.hearingCourt, { color: theme.textSecondary, marginTop: 2 }]}>
                        {h.court} • Judge: {h.judge || "Hon'ble Bench"}
                      </Text>
                      <Text style={[styles.hearingLawyer, { color: theme.textMuted }]}>
                        Advocate: <Text style={{ fontWeight: '700' }}>{h.lawyer}</Text> • Time: {h.time} ({h.date})
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: '#10B98118' }]}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981' }}>{h.prep}</Text>
                    </View>
                  </View>

                  <View style={[styles.clientActionRow, { borderTopColor: theme.border, marginTop: 10, paddingTop: 8 }]}>
                    <TouchableOpacity
                      style={[styles.clientActionBtn, styles.clientPreviewBtn, { borderColor: theme.border }]}
                      onPress={() => {
                        showToast('info', 'AI Hearing Copilot', `Opened courtroom preparation brief for ${h.case}.`);
                      }}
                    >
                      <Ionicons name="sparkles" size={12} color="#C8A34D" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#C8A34D' }}>✨ Hearing Copilot</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.clientActionBtn, { backgroundColor: isCompleted ? '#10B981' : '#C8A34D' }]}
                      onPress={() => {
                        setActivePostHearingItem(h);
                        setIsPostHearingModalOpen(true);
                      }}
                    >
                      <Ionicons name="scale-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {isCompleted ? 'Outcome Recorded ✓' : 'Complete Hearing'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* MODULE F: Enterprise Legal Task Management */}
      {activeModule === 'tasks' && (
        <View style={styles.moduleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>Firm Legal Task Management</Text>
            <TouchableOpacity
              style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => setIsCreateTaskModalOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>+ Create Task</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {tasks.map((t) => {
              const prioColor =
                t.priority === 'Urgent' ? '#EF4444' : t.priority === 'High' ? '#F97316' : t.priority === 'Medium' ? '#C8A34D' : '#6B7280';

              const completedCount = t.checklist ? t.checklist.filter((c) => c.completed).length : 0;
              const totalCount = t.checklist ? t.checklist.length : 0;
              const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

              return (
                <View key={t.id} style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={[styles.statusBadge, { backgroundColor: `${prioColor}18` }]}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: prioColor }}>{t.priority.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.tagChip, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#C8A34D' }}>{t.category || 'Drafting'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.taskTitle, { color: theme.textPrimary, marginTop: 4 }]}>{t.title}</Text>
                      <Text style={[styles.taskSub, { color: theme.textSecondary, marginTop: 2 }]}>
                        Case: <Text style={{ fontWeight: '700' }}>{t.workspace || 'General Matter'}</Text> • Client: {t.client || 'Firm Client'}
                      </Text>
                      <Text style={[styles.taskSub, { color: theme.textMuted }]}>
                        Assigned: <Text style={{ fontWeight: '700' }}>{Array.isArray(t.assignedTo) ? t.assignedTo.join(', ') : t.assignedTo}</Text> • Reviewer: {t.reviewer || 'Adv. Rajesh Sharma'}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: t.status === 'Completed' ? '#10B98118' : '#F59E0B18' }]}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: t.status === 'Completed' ? '#10B981' : '#F59E0B' }}>
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Checklist Progress Bar */}
                  {totalCount > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                          Workflow Checklist ({completedCount}/{totalCount} done)
                        </Text>
                        <Text style={{ fontSize: 10, color: '#C8A34D', fontWeight: '800' }}>{Math.round(progressPct)}%</Text>
                      </View>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? '#374151' : '#E5E7EB', overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: '#C8A34D' }} />
                      </View>
                    </View>
                  )}

                  <View style={[styles.clientActionRow, { borderTopColor: theme.border, marginTop: 10, paddingTop: 8 }]}>
                    <Text style={{ fontSize: 10.5, color: theme.textMuted }}>Due: {t.dueDate}</Text>
                    <TouchableOpacity
                      style={[styles.clientActionBtn, { backgroundColor: t.status === 'Completed' ? '#10B981' : '#C8A34D' }]}
                      onPress={() => {
                        setTasks(tasks.map((item) => (item.id === t.id ? { ...item, status: item.status === 'Completed' ? 'In Progress' : 'Completed' } : item)));
                        showToast('info', 'Task Updated', `Task status set to ${t.status === 'Completed' ? 'In Progress' : 'Completed'}.`);
                      }}
                    >
                      <Ionicons name={t.status === 'Completed' ? 'checkmark-done-circle' : 'time-outline'} size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {t.status === 'Completed' ? 'Completed ✓' : 'Mark Completed'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* MODULE G: Activity Timeline */}
      {activeModule === 'activity_timeline' && (
        <View style={styles.moduleSection}>
          <Text style={[styles.moduleTitle, { color: theme.textPrimary }]}>Firm Operations Activity Log</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {activityLogs.map((log, idx) => (
              <View key={idx} style={[styles.activityRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.feedDot, { backgroundColor: '#C8A34D' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityText, { color: theme.textPrimary }]}>{log.log}</Text>
                  <Text style={[styles.activityTime, { color: theme.textMuted }]}>{log.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 6. 3-Dot Category Menu Bottom Sheet Modal */}
      <Modal visible={isCategoryModalOpen} transparent animationType="slide" onRequestClose={() => setIsCategoryModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCategoryModalOpen(false)}>
          <Pressable style={[styles.categorySheetContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.categorySheetHeader}>
              <Text style={[styles.categorySheetTitle, { color: theme.textPrimary }]}>Case Categories</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 4, marginTop: 12 }}>
              {[
                { id: 'active_cases', label: 'Active Cases', icon: 'folder-open-outline', count: cases.length || 12, chip: 'Cases' },
                { id: 'review_queue', label: 'Pending Reviews', icon: 'star-outline', count: 5, chip: 'Review Queue' },
                { id: 'hearings', label: 'Today\'s Hearings', icon: 'calendar-outline', count: 2, chip: 'Hearings' },
                { id: 'team_workspace', label: 'Team Members', icon: 'people-outline', count: 8, chip: 'All' },
                { id: 'client_crm', label: 'Client CRM', icon: 'briefcase-outline', count: 3, chip: 'All' },
                { id: 'tasks', label: 'Firm Tasks', icon: 'checkbox-outline', count: 3, chip: 'Tasks' },
                { id: 'activity_timeline', label: 'Activity Log', icon: 'time-outline', count: 4, chip: 'All' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryRowItem,
                    {
                      backgroundColor: activeModule === item.id ? (isDark ? '#2D234D' : '#FEF8EC') : 'transparent',
                      borderColor: activeModule === item.id ? '#C8A34D' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setActiveModule(item.id as WorkspaceModule);
                    setFilterChip(item.chip);
                    setIsCategoryModalOpen(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={activeModule === item.id ? '#C8A34D' : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryRowText,
                        {
                          color: activeModule === item.id ? '#C8A34D' : theme.textPrimary,
                          fontWeight: activeModule === item.id ? '800' : '600',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: activeModule === item.id ? '#C8A34D' : (isDark ? '#374151' : '#F3F4F6') }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: activeModule === item.id ? '#FFFFFF' : theme.textSecondary }}>
                      {item.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FULL-SCREEN CASE OPERATIONS HUB MODAL */}
      <CaseOperationsHubModal
        visible={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        cases={cases}
        onLaunchCreateCase={() => {
          setIsHubOpen(false);
          onOpenNewCaseModal();
        }}
        onLaunchAssignTeam={() => {
          setIsHubOpen(false);
          setIsAssignTeamModalOpen(true);
        }}
        onLaunchScheduleHearing={() => {
          setIsHubOpen(false);
          setIsScheduleHearingModalOpen(true);
        }}
        onLaunchCreateTask={() => {
          setIsHubOpen(false);
          setIsCreateTaskModalOpen(true);
        }}
        onLaunchShareDocument={() => {
          setIsHubOpen(false);
          setIsShareDocOpen(true);
        }}
        onLaunchInviteTeam={() => {
          setIsHubOpen(false);
          setIsInviteTeamOpen(true);
        }}
      />

      {/* FULL-SCREEN INVITE TEAM MEMBER MODAL */}
      <InviteTeamMemberModal
        visible={isInviteTeamOpen}
        onClose={() => setIsInviteTeamOpen(false)}
        onSuccess={(newMember) => {
          setIsInviteTeamOpen(false);
        }}
      />

      {/* FULL-SCREEN SHARE / UPLOAD DOCUMENT MODAL */}
      <ShareUploadDocumentModal
        visible={isShareDocOpen}
        onClose={() => setIsShareDocOpen(false)}
        cases={cases}
        onSuccess={() => {
          setIsShareDocOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* 7. Quick Action Bottom Sheet Menu */}
      <Modal visible={isFabMenuOpen} transparent animationType="fade" onRequestClose={() => setIsFabMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsFabMenuOpen(false)}>
          <Pressable style={[styles.fabMenuContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <Text style={[styles.fabMenuTitle, { color: theme.textPrimary }]}>Case Operations Hub</Text>
            <Text style={[styles.quickActionSub, { color: theme.textSecondary, marginBottom: 14 }]}>Access central legal case operations hub.</Text>
            {[
              { label: '🚀 Open Case Operations Hub', action: () => { setIsFabMenuOpen(false); setIsHubOpen(true); } },
              { label: '📂 Create New Case', action: () => { setIsFabMenuOpen(false); setIsHubOpen(true); } },
              { label: '👤 Invite Team Member', action: () => { setIsFabMenuOpen(false); setIsHubOpen(true); } },
            ].map((item, idx) => (
              <TouchableOpacity
                key={`fab-${idx}`}
                style={[styles.fabMenuItem, { borderBottomColor: theme.border }]}
                onPress={item.action}
              >
                <Text style={[styles.fabMenuItemText, { color: theme.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORM MODAL 1: Add Client Modal */}
      <Modal visible={isAddClientModalOpen} transparent animationType="slide" onRequestClose={() => setIsAddClientModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAddClientModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>👤 Add New Client</Text>
              <TouchableOpacity onPress={() => setIsAddClientModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Ramesh Chandra Agrawal"
                placeholderTextColor={theme.placeholder}
                value={clientFullName}
                onChangeText={setClientFullName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mobile Number *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={theme.placeholder}
                value={clientMobile}
                onChangeText={setClientMobile}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="client@company.com"
                keyboardType="email-address"
                placeholderTextColor={theme.placeholder}
                value={clientEmail}
                onChangeText={setClientEmail}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Organization / Company</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Agrawal Enterprises Pvt Ltd"
                placeholderTextColor={theme.placeholder}
                value={clientOrg}
                onChangeText={setClientOrg}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Assign Primary Advocate</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {[
                  'Adv. Rajesh Sharma (Senior Advocate)',
                  'Adv. Priya Sharma (Associate)',
                  'Adv. Amit Kumar (Junior Advocate)',
                ].map((adv) => (
                  <TouchableOpacity
                    key={adv}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: assignedAdvocateVal === adv ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: assignedAdvocateVal === adv ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setAssignedAdvocateVal(adv)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: assignedAdvocateVal === adv ? '#FFFFFF' : theme.textSecondary }}>
                      {adv.split(' ')[1]} ({adv.includes('Senior') ? 'Senior' : adv.includes('Associate') ? 'Associate' : 'Junior'})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 8 }}>
                The selected advocate will become the primary point of contact for this client.
              </Text>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Client Categorization Tags</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {['Civil', 'Criminal', 'Family', 'Corporate', 'Property', 'Tax', 'Arbitration'].map((tag) => {
                  const active = selectedClientTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => {
                        if (active) setSelectedClientTags(selectedClientTags.filter((t) => t !== tag));
                        else setSelectedClientTags([...selectedClientTags, tag]);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? '#C8A34D' : theme.textSecondary }}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Priority Level</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {['Low', 'Medium', 'High'].map((prio) => (
                  <TouchableOpacity
                    key={prio}
                    style={[
                      styles.roleChip,
                      {
                        flex: 1,
                        alignItems: 'center',
                        backgroundColor: clientPriorityVal === prio ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: clientPriorityVal === prio ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setClientPriorityVal(prio)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: clientPriorityVal === prio ? '#FFFFFF' : theme.textSecondary }}>
                      {prio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Client Access Checkbox */}
              <TouchableOpacity
                style={[styles.switchRow, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}
                onPress={() => setSendInviteCheckbox(!sendInviteCheckbox)}
              >
                <Ionicons
                  name={sendInviteCheckbox ? 'checkbox' : 'square-outline'}
                  size={20}
                  color="#C8A34D"
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Send AI LEGAL Invitation after saving</Text>
                  <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                    Client will receive a secure invitation to join your law firm's AI LEGAL workspace.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsAddClientModalOpen(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#C8A34D' }]}
                onPress={() => {
                  if (!clientFullName || !clientMobile) {
                    showToast('error', 'Required Fields', 'Please enter Full Name and Mobile Number.');
                    return;
                  }
                  setIsAddClientModalOpen(false);

                  const newClient = {
                    id: String(Date.now()),
                    name: clientFullName,
                    contact: clientMobile,
                    email: clientEmail || 'client@firm.com',
                    org: clientOrg || 'Individual',
                    casesCount: 1,
                    pendingPayment: '₹0',
                    status: sendInviteCheckbox ? 'Invitation Pending' : 'Inactive',
                    advocate: assignedAdvocateVal.split(' ')[1] ? `Adv. ${assignedAdvocateVal.split(' ')[1]}` : 'Adv. Rajesh Sharma',
                    tags: selectedClientTags.length > 0 ? selectedClientTags : ['Civil'],
                    priority: clientPriorityVal,
                  };

                  setClientList([newClient, ...clientList]);

                  if (sendInviteCheckbox) {
                    setPendingInviteClient(newClient);
                    setIsClientInviteConfirmOpen(true);
                  } else {
                    showToast('success', 'Client Saved Successfully', 'Client added to Firm CRM. Status: Invitation Not Sent.');
                  }

                  setClientFullName('');
                  setClientMobile('');
                  setClientEmail('');
                  setClientOrg('');
                  setActiveModule('client_crm');
                }}
              >
                <Text style={styles.submitBtnText}>Save Client</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CONFIRMATION DIALOG MODAL: Send AI LEGAL Invitation Dialog */}
      <Modal visible={isClientInviteConfirmOpen} transparent animationType="fade" onRequestClose={() => setIsClientInviteConfirmOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsClientInviteConfirmOpen(false)}>
          <Pressable style={[styles.confirmDialogContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="paper-plane" size={28} color="#C8A34D" />
            </View>
            <Text style={[styles.confirmDialogTitle, { color: theme.textPrimary }]}>Client Added Successfully</Text>
            <Text style={[styles.confirmDialogSub, { color: theme.textSecondary }]}>
              {pendingInviteClient?.name} has been added to your Firm CRM. Would you like to send the secure AI LEGAL invitation now via Push / WhatsApp / Email?
            </Text>

            <View style={{ gap: 10, width: '100%', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#C8A34D', height: 44 }]}
                onPress={() => {
                  setIsClientInviteConfirmOpen(false);
                  showToast('success', 'Invitation Delivered', `Secure invite sent to ${pendingInviteClient?.name} (+91 ${pendingInviteClient?.contact || '9876543210'}). Status: Invitation Pending.`);
                }}
              >
                <Text style={styles.submitBtnText}>Send Invitation Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border, height: 44 }]}
                onPress={() => {
                  setIsClientInviteConfirmOpen(false);
                  showToast('info', 'Invitation Pending', `${pendingInviteClient?.name} saved in CRM. You can invite later from client actions.`);
                }}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Invite Later</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CLIENT PORTAL PREVIEW / ONBOARDING REVIEW SCREEN MODAL */}
      <Modal visible={isReviewInviteModalOpen} transparent animationType="slide" onRequestClose={() => setIsReviewInviteModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsReviewInviteModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface, maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>AI LEGAL Client Portal Onboarding</Text>
              <TouchableOpacity onPress={() => setIsReviewInviteModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
              <View style={[styles.inviteBrandCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                <Ionicons name="briefcase" size={32} color="#C8A34D" />
                <Text style={[styles.inviteBrandTitle, { color: theme.textPrimary }]}>ABC Law Associates</Text>
                <Text style={[styles.inviteBrandSub, { color: theme.textSecondary }]}>
                  High Court Chambers, Fort, Mumbai • Reg. Law Firm
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
                  Workspace Invitation Details
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Invited Client:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{activePreviewClient?.name || 'Ramesh Chandra Agrawal'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Managing Partner:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>Adv. Rajesh Sharma</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Assigned Advocate:</Text>
                  <Text style={[styles.summaryVal, { color: '#C8A34D' }]}>{activePreviewClient?.advocate || 'Adv. Priya Sharma'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Practice Areas:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>Civil, Litigation, Corporate</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Status:</Text>
                  <Text style={[styles.summaryVal, { color: activePreviewClient?.status === 'Connected' ? '#10B981' : '#F59E0B' }]}>
                    {activePreviewClient?.status || 'Invitation Pending'}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 11.5, color: theme.textSecondary, lineHeight: 17, textAlign: 'center' }}>
                By accepting this invitation, you connect your personal AI LEGAL Client Portal to ABC Law Associates. You will gain secure access to your case timelines, documents, and court hearing updates.
              </Text>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: '#EF4444' }]}
                onPress={() => {
                  if (activePreviewClient) {
                    setClientList(clientList.map((c) => (c.id === activePreviewClient.id ? { ...c, status: 'Declined' } : c)));
                  }
                  setIsReviewInviteModalOpen(false);
                  showToast('info', 'Invitation Declined', 'Client portal status set to Declined.');
                }}
              >
                <Text style={[styles.cancelBtnText, { color: '#EF4444' }]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  if (activePreviewClient) {
                    setClientList(clientList.map((c) => (c.id === activePreviewClient.id ? { ...c, status: 'Connected' } : c)));
                  }
                  setIsReviewInviteModalOpen(false);
                  showToast('success', 'Client Connected!', 'Client Portal successfully activated and linked to Law Firm.');
                }}
              >
                <Text style={styles.submitBtnText}>Accept Invitation ✓</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORM MODAL 2: Enterprise Assign Team Modal */}
      <Modal visible={isAssignTeamModalOpen} transparent animationType="slide" onRequestClose={() => setIsAssignTeamModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAssignTeamModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface, maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <View>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>👥 Assign Team</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Create a legal team for a workspace or assign members to a case.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAssignTeamModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {/* Section 1: Select Workspace / Case */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Workspace / Case *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {['Rajesh Sharma vs Amit Verma', 'State of MH v. Kapoor', 'FinTech Corp Arbitration', 'Apex Logistics Customs Case'].map((cs) => (
                  <TouchableOpacity
                    key={cs}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: selectedWorkspaceForTeam === cs ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: selectedWorkspaceForTeam === cs ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedWorkspaceForTeam(cs)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: selectedWorkspaceForTeam === cs ? '#FFFFFF' : theme.textSecondary }}>
                      📁 {cs}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AI Recommended Team Banner */}
              <View style={[styles.aiTeamCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="sparkles" size={16} color="#C8A34D" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D' }}>AI Recommended Team for this Case</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginBottom: 8 }}>
                  Based on Family Law specialization, past win rate, and workload availability:
                </Text>
                <View style={{ gap: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: theme.textPrimary }}>✓ Adv. Priya Sharma (Associate — Family Specialist)</Text>
                  <Text style={{ fontSize: 11, color: theme.textPrimary }}>✓ Adv. Sneha Gupta (Research Expert)</Text>
                  <Text style={{ fontSize: 11, color: theme.textPrimary }}>✓ Adv. Amit Kumar (Drafting Specialist)</Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D', alignSelf: 'flex-start' }]}
                  onPress={() => {
                    setSelectedTeamMembers(['Adv. Priya Sharma', 'Adv. Sneha Gupta', 'Adv. Amit Kumar']);
                    showToast('info', 'AI Recommendation Applied', 'Selected optimal team members.');
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>Apply AI Team Recommendation</Text>
                </TouchableOpacity>
              </View>

              {/* Section 2: Team Leader */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Team Leader (Managing / Senior Advocate) *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={teamLeaderVal}
                onChangeText={setTeamLeaderVal}
              />

              {/* Section 3: Primary Advocate */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Primary Advocate (Daily Case Contact) *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={primaryAdvocateVal}
                onChangeText={setPrimaryAdvocateVal}
              />

              {/* Section 4 & 5: Add Team Members & Roles */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Team Members & Assign Roles</Text>
              <View style={{ gap: 6 }}>
                {[
                  { name: 'Adv. Amit Kumar', defaultRole: 'Junior Advocate' },
                  { name: 'Adv. Sneha Gupta', defaultRole: 'Research Associate' },
                  { name: 'Adv. Rohit Jain', defaultRole: 'Associate Advocate' },
                  { name: 'Adv. Neha Patel', defaultRole: 'Paralegal' },
                  { name: 'Aman Kumar (Intern)', defaultRole: 'Legal Intern' },
                ].map((m) => {
                  const isSelected = selectedTeamMembers.includes(m.name);
                  const role = memberRolesMap[m.name] || m.defaultRole;

                  return (
                    <TouchableOpacity
                      key={m.name}
                      style={[
                        styles.checkRow,
                        {
                          backgroundColor: isSelected ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                          borderColor: isSelected ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedTeamMembers(selectedTeamMembers.filter((name) => name !== m.name));
                        } else {
                          setSelectedTeamMembers([...selectedTeamMembers, m.name]);
                          setMemberRolesMap({ ...memberRolesMap, [m.name]: m.defaultRole });
                        }
                      }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? '#C8A34D' : theme.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#C8A34D' : theme.textPrimary }}>
                          {m.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textMuted }}>Assigned Role: {role}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 6: Responsibilities */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Core Team Responsibilities</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Drafting',
                  'Legal Research',
                  'Evidence Review',
                  'Documentation',
                  'Filing',
                  'Client Communication',
                  'Hearing Preparation',
                  'Court Appearance',
                ].map((resp) => {
                  const active = teamResponsibilities.includes(resp);
                  return (
                    <TouchableOpacity
                      key={resp}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => {
                        if (active) setTeamResponsibilities(teamResponsibilities.filter((r) => r !== resp));
                        else setTeamResponsibilities([...teamResponsibilities, resp]);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? '#C8A34D' : theme.textSecondary }}>
                        ✓ {resp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 7: Permissions */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Configurable Member Permissions</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'View Case',
                  'Edit Case',
                  'Upload Documents',
                  'Generate Drafts',
                  'Review Evidence',
                  'Schedule Hearings',
                  'Access AI Tools',
                  'Client Messaging',
                  'Assign Tasks',
                  'Manage Team',
                ].map((perm) => {
                  const active = teamPermissionsMap[perm];
                  return (
                    <TouchableOpacity
                      key={perm}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => setTeamPermissionsMap({ ...teamPermissionsMap, [perm]: !active })}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: active ? '800' : '600', color: active ? '#C8A34D' : theme.textSecondary }}>
                        {active ? '☑' : '☐'} {perm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 8: Access Level */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Access Level</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['Full Access', 'Limited Access', 'Read Only'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.roleChip,
                      {
                        flex: 1,
                        alignItems: 'center',
                        backgroundColor: teamAccessLevel === lvl ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: teamAccessLevel === lvl ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setTeamAccessLevel(lvl)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: teamAccessLevel === lvl ? '#FFFFFF' : theme.textSecondary }}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section 9: Assignment Notes */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Assignment Instructions & Scope Notes</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                placeholder="Handle evidence collection, prepare cross-examination draft..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={assignmentNotesVal}
                onChangeText={setAssignmentNotesVal}
              />

              {/* Section 10: Valid Until */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Assignment Valid Until</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={assignmentValidUntil}
                onChangeText={setAssignmentValidUntil}
              />

              {/* Section 11: Team Notifications */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Team Dispatch Channels</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['AI LEGAL Notification', 'Email', 'WhatsApp'].map((ch) => {
                  const active = notifyChannels[ch];
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.tagChip,
                        {
                          flex: 1,
                          alignItems: 'center',
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => setNotifyChannels({ ...notifyChannels, [ch]: !active })}
                    >
                      <Text style={{ fontSize: 10, fontWeight: active ? '800' : '600', color: active ? '#C8A34D' : theme.textSecondary }}>
                        {active ? '☑' : '☐'} {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsAssignTeamModalOpen(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#C8A34D' }]}
                onPress={() => {
                  setIsAssignTeamModalOpen(false);
                  showToast('success', 'Team Assigned Successfully', `${selectedTeamMembers.length + 2} members assigned to ${selectedWorkspaceForTeam}.`);
                  setActiveModule('team_workspace');
                }}
              >
                <Text style={styles.submitBtnText}>Assign Team</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORM MODAL 3: Enterprise Create Legal Task Modal */}
      <Modal visible={isCreateTaskModalOpen} transparent animationType="slide" onRequestClose={() => setIsCreateTaskModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCreateTaskModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface, maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <View>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>✅ Create Legal Task</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Assign legal work to your team and track progress from one place.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateTaskModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {/* Section 1: Task Title */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Task Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Prepare Bail Application, Research SC Judgments..."
                placeholderTextColor={theme.placeholder}
                value={taskTitleVal}
                onChangeText={setTaskTitleVal}
              />

              {/* Section 2 & 3: Linked Workspace / Case & Client */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Workspace / Case *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {['Rajesh Sharma vs Amit Verma', 'State of MH v. Kapoor', 'FinTech Corp Arbitration', 'Apex Logistics Customs Case'].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: taskWorkspaceVal === w ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: taskWorkspaceVal === w ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setTaskWorkspaceVal(w);
                      if (w.includes('Rajesh')) setTaskClientVal('Ramesh Chandra Agrawal');
                      else if (w.includes('Kapoor')) setTaskClientVal('Sunil Kapoor');
                      else setTaskClientVal('Apex Logistics Pvt Ltd');
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: taskWorkspaceVal === w ? '#FFFFFF' : theme.textSecondary }}>
                      📁 {w}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>
                Auto-linked Client: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{taskClientVal}</Text>
              </Text>

              {/* Section 4 & 5: Assign Team Members & Reviewer */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Assign Team Members</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['Adv. Amit Kumar', 'Adv. Priya Sharma', 'Adv. Sneha Gupta', 'Adv. Rohit Jain', 'Aman Kumar (Intern)'].map((name) => {
                  const active = selectedTaskAssignees.includes(name);
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => {
                        if (active) setSelectedTaskAssignees(selectedTaskAssignees.filter((n) => n !== name));
                        else setSelectedTaskAssignees([...selectedTaskAssignees, name]);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? '#C8A34D' : theme.textSecondary }}>
                        {active ? '☑' : '☐'} {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Reviewer (Senior Advocate)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={taskReviewerVal}
                onChangeText={setTaskReviewerVal}
              />

              {/* Section 6: Category */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Task Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {[
                  'Drafting',
                  'Legal Research',
                  'Evidence Review',
                  'Documentation',
                  'Court Hearing',
                  'Client Meeting',
                  'Court Filing',
                  'Contract Review',
                  'Follow-up',
                  'Billing',
                  'Internal',
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: taskCategoryVal === cat ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: taskCategoryVal === cat ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setTaskCategoryVal(cat)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: taskCategoryVal === cat ? '#FFFFFF' : theme.textSecondary }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section 7: Priority with Badges */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Priority Level</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { name: 'Urgent', color: '#EF4444' },
                  { name: 'High', color: '#F97316' },
                  { name: 'Medium', color: '#C8A34D' },
                  { name: 'Low', color: '#6B7280' },
                ].map((prio) => {
                  const active = taskPriorityVal === prio.name;
                  return (
                    <TouchableOpacity
                      key={prio.name}
                      style={[
                        styles.roleChip,
                        {
                          flex: 1,
                          alignItems: 'center',
                          backgroundColor: active ? prio.color : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? prio.color : theme.border,
                        },
                      ]}
                      onPress={() => setTaskPriorityVal(prio.name as any)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : theme.textSecondary }}>
                        {prio.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section 8 & 9: Due Date, Time & Estimated Duration */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Due Date & Time *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={taskDueDateVal}
                    onChangeText={setTaskDueDateVal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Est. Duration</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={taskEstDurationVal}
                    onChangeText={setTaskEstDurationVal}
                  />
                </View>
              </View>

              {/* Section 10: Description */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Task Scope & Instructions</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                placeholder="Prepare anticipatory bail application. Include latest Supreme Court precedents..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={taskDescVal}
                onChangeText={setTaskDescVal}
              />

              {/* Section 12: ✨ AI Task Assistant */}
              <View style={[styles.aiTeamCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="sparkles" size={16} color="#C8A34D" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D' }}>AI Legal Task Assistant</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={() => {
                      setTaskChecklistItems([
                        { id: '1', title: 'Review FIR Copy & IPC Sections', completed: true },
                        { id: '2', title: 'Search Supreme Court Precedents on Section 438', completed: false },
                        { id: '3', title: 'Draft Grounds of Bail Petition', completed: false },
                        { id: '4', title: 'Attach Affidavits & Annexures', completed: false },
                        { id: '5', title: 'Submit for Senior Partner Sign-off', completed: false },
                      ]);
                      showToast('success', 'AI Checklist Generated', 'Auto-created 5 legal workflow steps.');
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>✨ Generate AI Checklist</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                  AI Assistant will analyze FIR details, auto-suggest relevant Supreme Court precedents, and build required drafting steps.
                </Text>
              </View>

              {/* Section 13: Checklist */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Legal Workflow Checklist</Text>
              <View style={{ gap: 6 }}>
                {taskChecklistItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checkRow,
                      {
                        backgroundColor: item.completed ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                        borderColor: item.completed ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setTaskChecklistItems(
                        taskChecklistItems.map((chk) => (chk.id === item.id ? { ...chk, completed: !chk.completed } : chk))
                      );
                    }}
                  >
                    <Ionicons
                      name={item.completed ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={item.completed ? '#C8A34D' : theme.textMuted}
                    />
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: item.completed ? '700' : '500',
                        color: item.completed ? '#C8A34D' : theme.textPrimary,
                        textDecorationLine: item.completed ? 'line-through' : 'none',
                        flex: 1,
                      }}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsCreateTaskModalOpen(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#C8A34D' }]}
                onPress={() => {
                  if (!taskTitleVal) {
                    showToast('error', 'Required Field', 'Please enter Task Title.');
                    return;
                  }
                  setIsCreateTaskModalOpen(false);

                  const newTask = {
                    id: `t-${Date.now()}`,
                    title: taskTitleVal,
                    workspace: taskWorkspaceVal,
                    client: taskClientVal,
                    assignedTo: selectedTaskAssignees,
                    reviewer: taskReviewerVal,
                    category: taskCategoryVal,
                    status: 'In Progress',
                    dueDate: taskDueDateVal,
                    priority: taskPriorityVal,
                    checklist: taskChecklistItems,
                  };

                  setTasks([newTask, ...tasks]);
                  showToast('success', 'Legal Task Created', `${taskTitleVal} assigned to ${selectedTaskAssignees.join(', ')}.`);
                  setTaskTitleVal('');
                  setTaskDescVal('');
                  setActiveModule('tasks');
                }}
              >
                <Text style={styles.submitBtnText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORM MODAL 4: Enterprise Schedule Court Hearing Modal */}
      <Modal visible={isScheduleHearingModalOpen} transparent animationType="slide" onRequestClose={() => setIsScheduleHearingModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsScheduleHearingModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface, maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <View>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>📅 Schedule Court Hearing</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Plan court appearances, notify your legal team, prepare with AI, and track hearing outcomes.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsScheduleHearingModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {/* Section 1: Select Workspace / Case */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Firm Workspace / Case *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {['State of MH v. Kapoor', 'Apex Logistics v. Customs', 'FinTech Corp Arbitration', 'Rajesh Sharma vs Amit Verma'].map((cs) => (
                  <TouchableOpacity
                    key={cs}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: hearingWorkspaceVal === cs ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: hearingWorkspaceVal === cs ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setHearingWorkspaceVal(cs);
                      if (cs.includes('Kapoor')) setHearingClientVal('Sunil Kapoor');
                      else if (cs.includes('Apex')) setHearingClientVal('Apex Logistics Pvt Ltd');
                      else setHearingClientVal('Ramesh Chandra Agrawal');
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: hearingWorkspaceVal === cs ? '#FFFFFF' : theme.textSecondary }}>
                      📁 {cs}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>
                Connected Client: <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{hearingClientVal}</Text>
              </Text>

              {/* Section 2: Hearing Type */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hearing Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {[
                  'First Hearing',
                  'Evidence',
                  'Cross Examination',
                  'Arguments',
                  'Final Arguments',
                  'Order',
                  'Judgment',
                  'Bail Hearing',
                  'Mentioning',
                  'Interim Relief',
                  'Mediation',
                  'Arbitration',
                  'Settlement Discussion',
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: hearingTypeVal === type ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: hearingTypeVal === type ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setHearingTypeVal(type)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: hearingTypeVal === type ? '#FFFFFF' : theme.textSecondary }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section 3: Court Details */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Court Name & Judge Details *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Delhi High Court - Court 4"
                value={hearingCourtNameVal}
                onChangeText={setHearingCourtNameVal}
              />
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, marginTop: 6 }]}
                placeholder="Presiding Judge e.g. Hon'ble Justice A.K. Sharma"
                value={hearingJudgeNameVal}
                onChangeText={setHearingJudgeNameVal}
              />

              {/* Section 4 & 5: Hearing Date, Time & Mode */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={hearingDateVal}
                    onChangeText={setHearingDateVal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Time *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                    value={hearingTimeVal}
                    onChangeText={setHearingTimeVal}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hearing Mode</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['Physical', 'Virtual', 'Hybrid'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.roleChip,
                      {
                        flex: 1,
                        alignItems: 'center',
                        backgroundColor: hearingModeVal === mode ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: hearingModeVal === mode ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setHearingModeVal(mode)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: hearingModeVal === mode ? '#FFFFFF' : theme.textSecondary }}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section 6 & 7: Assigned Advocate & Team */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Primary Advocate in Court</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={assignedHearingAdvocateVal}
                onChangeText={setAssignedHearingAdvocateVal}
              />

              {/* Section 8 & 9: Client Attendance & Purpose */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Client Attendance</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Client Required', 'Client Optional', 'Not Required'].map((att) => (
                  <TouchableOpacity
                    key={att}
                    style={[
                      styles.roleChip,
                      {
                        flex: 1,
                        alignItems: 'center',
                        backgroundColor: clientAttendanceVal === att ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: clientAttendanceVal === att ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setClientAttendanceVal(att)}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: clientAttendanceVal === att ? '#FFFFFF' : theme.textSecondary }}>
                      {att}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Purpose of Hearing & Scope</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                placeholder="Arguments on anticipatory bail application under Section 438 CrPC..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={hearingPurposeVal}
                onChangeText={setHearingPurposeVal}
              />

              {/* Section 12: ✨ AI Hearing Preparation */}
              <View style={[styles.aiTeamCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="sparkles" size={16} color="#C8A34D" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D' }}>AI Hearing Preparation & Brief</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallAddClientBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={() => {
                      setHearingChecklistItems([
                        { id: '1', title: 'AI Brief Generated: Supreme Court Section 438 Precedents Ready', completed: true },
                        { id: '2', title: 'Cross-Examination Questions Auto-Generated for Witness', completed: true },
                        { id: '3', title: 'Verify Forensic Audit Evidence Bundle Originals', completed: false },
                        { id: '4', title: 'Arrive in Court Room 4 by 10:00 AM', completed: false },
                      ]);
                      showToast('success', 'AI Hearing Brief Prepared', 'Generated arguments & judge brief.');
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>✨ Prepare Hearing</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                  AI Copilot will auto-compile judge brief, applicable IPC sections, counter arguments, and courtroom strategy checklist.
                </Text>
              </View>

              {/* Section 13: Hearing Checklist */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Courtroom Readiness Checklist</Text>
              <View style={{ gap: 6 }}>
                {hearingChecklistItems.map((chk) => (
                  <TouchableOpacity
                    key={chk.id}
                    style={[
                      styles.checkRow,
                      {
                        backgroundColor: chk.completed ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                        borderColor: chk.completed ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setHearingChecklistItems(
                        hearingChecklistItems.map((item) => (item.id === chk.id ? { ...item, completed: !item.completed } : item))
                      );
                    }}
                  >
                    <Ionicons
                      name={chk.completed ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={chk.completed ? '#C8A34D' : theme.textMuted}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: chk.completed ? '700' : '500',
                        color: chk.completed ? '#C8A34D' : theme.textPrimary,
                        flex: 1,
                      }}
                    >
                      {chk.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsScheduleHearingModalOpen(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#C8A34D' }]}
                onPress={() => {
                  setIsScheduleHearingModalOpen(false);

                  const newHearing = {
                    id: `h-${Date.now()}`,
                    case: hearingWorkspaceVal,
                    client: hearingClientVal,
                    court: hearingCourtNameVal,
                    judge: hearingJudgeNameVal,
                    lawyer: assignedHearingAdvocateVal,
                    type: hearingTypeVal,
                    time: hearingTimeVal,
                    date: hearingDateVal,
                    prep: 'AI Prepared Brief Ready',
                    status: 'Upcoming',
                    mode: hearingModeVal,
                    checklist: hearingChecklistItems,
                  };

                  setHearingsList([newHearing, ...hearingsList]);
                  showToast('success', 'Court Hearing Scheduled', `${hearingTypeVal} for ${hearingWorkspaceVal} set for ${hearingTimeVal}.`);
                  setActiveModule('hearings');
                }}
              >
                <Text style={styles.submitBtnText}>Schedule Hearing</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORM MODAL 5: Post-Hearing Outcome Update Modal */}
      <Modal visible={isPostHearingModalOpen} transparent animationType="slide" onRequestClose={() => setIsPostHearingModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsPostHearingModalOpen(false)}>
          <Pressable style={[styles.formModalContainer, { backgroundColor: theme.surface, maxHeight: '92%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.formModalHeader}>
              <View>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>⚖️ Post-Hearing Outcome Update</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Record courtroom outcome, judge remarks, upload court order, and schedule next hearing.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsPostHearingModalOpen(false)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>
                  {activePostHearingItem?.case || 'State of MH v. Kapoor'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {activePostHearingItem?.court || 'Delhi High Court - Court 4'} • {activePostHearingItem?.lawyer || 'Adv. Rajesh Sharma'}
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hearing Outcome *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  'Arguments Heard',
                  'Evidence Recorded',
                  'Witness Examined',
                  'Order Passed',
                  'Adjourned',
                  'Judgment Reserved',
                  'Disposed',
                ].map((outc) => (
                  <TouchableOpacity
                    key={outc}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: postHearingOutcomeVal === outc ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: postHearingOutcomeVal === outc ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setPostHearingOutcomeVal(outc)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: postHearingOutcomeVal === outc ? '#FFFFFF' : theme.textSecondary }}>
                      {outc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Judge Remarks & Courtroom Observations</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                placeholder="Judge requested additional bank audit statements..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={postHearingJudgeRemarksVal}
                onChangeText={setPostHearingJudgeRemarksVal}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Advocate Hearing Notes & Strategy</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                placeholder="Opposing counsel sought adjournment. Next arguments set..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={postHearingNotesVal}
                onChangeText={setPostHearingNotesVal}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Next Hearing Date (If Applicable)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={nextHearingDateVal}
                onChangeText={setNextHearingDateVal}
              />

              {/* ✨ AI Hearing Summary Button */}
              <TouchableOpacity
                style={[styles.aiTeamCard, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}
                onPress={() => {
                  showToast('success', 'AI Hearing Summary Generated', 'Summarized judge observations & auto-created follow-up task.');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={16} color="#C8A34D" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D' }}>✨ Generate AI Hearing Summary & Follow-up Tasks</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setIsPostHearingModalOpen(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  if (activePostHearingItem) {
                    setHearingsList(
                      hearingsList.map((h) =>
                        h.id === activePostHearingItem.id ? { ...h, status: 'Completed', prep: `Completed (${postHearingOutcomeVal})` } : h
                      )
                    );
                  }
                  setIsPostHearingModalOpen(false);
                  showToast('success', 'Hearing Completed', `Outcome recorded: ${postHearingOutcomeVal}. Next date: ${nextHearingDateVal}.`);
                }}
              >
                <Text style={styles.submitBtnText}>Save & Complete ✓</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  newCaseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  chipRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  reviewBannerCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  reviewBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  reviewCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewBannerSummary: {
    fontSize: 12,
    lineHeight: 18,
  },
  reviewBannerBody: {
    gap: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  reviewBannerBullet: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  reviewNowBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reviewNowBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  moduleTabContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  moduleTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  moduleTabText: {
    fontSize: 11.5,
  },
  moduleSection: {
    marginTop: 4,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  moduleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C8A34D18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  caseCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  caseName: {
    fontSize: 14,
    fontWeight: '800',
  },
  caseSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  caseMetaText: {
    fontSize: 10.5,
  },
  caseCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  caseActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewTime: {
    fontSize: 10,
  },
  reviewItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  reviewItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  reviewItemCase: {
    fontSize: 10.5,
    marginTop: 2,
  },
  statusBanner: {
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  reviewBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  reviewActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  teamName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  teamRole: {
    fontSize: 11,
  },
  teamMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  contactMiniBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  clientName: {
    fontSize: 13,
    fontWeight: '800',
  },
  clientSub: {
    fontSize: 11,
    marginTop: 2,
  },
  clientContact: {
    fontSize: 10,
    marginTop: 2,
  },
  hearingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  hearingCase: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  hearingCourt: {
    fontSize: 11,
    marginTop: 2,
  },
  hearingLawyer: {
    fontSize: 10,
    marginTop: 2,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  taskTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  taskSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  feedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityText: {
    fontSize: 11.5,
  },
  activityTime: {
    fontSize: 9.5,
    marginTop: 2,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C8A34D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  fabMenuContainer: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fabMenuTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  fabMenuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fabMenuItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  threeDotsBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  categorySheetContainer: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  categorySheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categorySheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  categoryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryRowText: {
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  quickActionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  formModalContainer: {
    padding: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12.5,
    marginBottom: 6,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  smallAddClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  clientActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  clientActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clientPreviewBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmDialogContainer: {
    width: '88%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF8EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmDialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmDialogSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  inviteBrandCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  inviteBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  inviteBrandSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  aiTeamCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
});
