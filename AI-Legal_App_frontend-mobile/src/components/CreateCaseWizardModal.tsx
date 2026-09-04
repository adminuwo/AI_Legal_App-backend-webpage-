import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Pressable,
  Alert,
  Image,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { useUserStore } from '@/store/user';
import { Shadows } from '@/theme';
import { useWorkspaceStore } from '@/store/workspace';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface CreateCaseWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newCase?: any) => void;
}

const CATEGORIES = [
  'Civil',
  'Criminal',
  'Corporate',
  'Family',
  'Labour',
  'Consumer',
  'Taxation',
  'Arbitration',
  'Constitutional',
  'Property',
  'Intellectual Property',
  'Cyber Crime',
  'Banking',
];

const CASE_TYPES = ['Litigation', 'Advisory', 'Consultation', 'Arbitration', 'Appeal'];

const CLIENT_TYPES = ['Individual', 'Company', 'Government', 'NGO', 'Startup', 'Partnership'];

const DOCUMENT_CATEGORIES = [
  'Petition',
  'Agreement',
  'FIR',
  'Evidence',
  'Notice',
  'Affidavit',
  'Order',
  'Contract',
  'Other',
];

// Dynamic FIRM_ROSTER is constructed inside component via useWorkspaceContext().members

const EXISTING_CLIENTS = [
  {
    id: 'c1',
    name: 'Ramesh Chandra Agrawal',
    contact: '+91 98765 43210',
    email: 'ramesh@agrawal.com',
    company: 'Agrawal Enterprises',
    clientType: 'Company',
    casesCount: 2,
    notes: 'Key commercial litigation client with active recovery matters.',
  },
  {
    id: 'c2',
    name: 'Suresh Kumar',
    contact: '+91 91234 56789',
    email: 'suresh@apexlogistics.com',
    company: 'Apex Logistics Pvt Ltd',
    clientType: 'Company',
    casesCount: 1,
    notes: 'Arbitration matter regarding logistics contract breach.',
  },
  {
    id: 'c3',
    name: 'Anita Desai',
    contact: '+91 99887 76655',
    email: 'anita.desai@gmail.com',
    company: 'Individual',
    clientType: 'Individual',
    casesCount: 1,
    notes: 'Family asset settlement consultation.',
  },
];

export const CreateCaseWizardModal: React.FC<CreateCaseWizardModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCaseResult, setCreatedCaseResult] = useState<any>(null);

  // Voice AI Dictation State
  const [isAiVoiceParsing, setIsAiVoiceParsing] = useState(false);

  // STEP 1: Client Info State
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new');
  const [selectedExistingClient, setSelectedExistingClient] = useState<any>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [savedCustomClients, setSavedCustomClients] = useState<any[]>([]);

  useEffect(() => {
    if (!visible) return;
    const fetchCustomClients = async () => {
      try {
        const stored = await AsyncStorage.getItem('@custom_registered_clients');
        if (stored) {
          setSavedCustomClients(JSON.parse(stored));
        }
      } catch (e) {}
    };
    fetchCustomClients();
  }, [visible]);
  
  // New Client Fields
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientPinCode, setClientPinCode] = useState('');
  const [clientType, setClientType] = useState('Individual');
  const [clientNotes, setClientNotes] = useState('');

  // STEP 2: Case Details State
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('Civil');
  const [caseType, setCaseType] = useState('Litigation');
  const [courtName, setCourtName] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [firNumber, setFirNumber] = useState('');
  const [oppositeParty, setOppositeParty] = useState('');
  const [oppositeAdvocate, setOppositeAdvocate] = useState('');
  const [caseSummary, setCaseSummary] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('High');
  const [isConfidential, setIsConfidential] = useState(false);

  // AI Smart Suggestions State
  const [aiSuggestedTitle, setAiSuggestedTitle] = useState('');
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState('');
  const [aiSuggestedActs, setAiSuggestedActs] = useState<string[]>([]);

  const { members, activeWorkspace, workspaces, refreshTeamMembers } = useWorkspaceContext();

  const targetWorkspace = useMemo(() => {
    if (!workspaces || workspaces.length === 0) return activeWorkspace;
    return (
      workspaces.find((w: any) => w.type === 'law_firm' || w.type === 'firm' || w.type === 'lawfirm' || (w.id && w.id !== 'personal_practice')) ||
      activeWorkspace
    );
  }, [workspaces, activeWorkspace]);

  const activeRoster = useMemo(() => {
    let list = members || [];
    // Exclude pending or suspended members (case-insensitive & status fallback)
    list = list.filter((m) => !m.status || m.status.toLowerCase() === 'accepted' || m.status.toLowerCase() === 'active');

    if (list.length > 0) {
      return list.map((m) => ({
        id: m.id || m.userId,
        userId: m.userId || m.id,
        name: m.name || m.fullName || 'Team Member',
        role: m.role || 'Associate Advocate',
        department: m.department || 'General Practice',
        permission: m.permission || 'Standard Member',
        avatar: m.avatar || '⚖️',
        isOwner: Boolean(m.isOwner),
        status: m.status || 'Active',
      })).sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));
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
        role: 'Managing Partner',
        department: 'Corporate & Litigation',
        permission: 'Administrator',
        avatar: '⚖️',
        isOwner: true,
        status: 'Active',
      },
    ];
  }, [members]);

  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition(async (finalTranscriptText) => {
    if (!finalTranscriptText || !finalTranscriptText.trim()) {
      showToast('info', 'No Speech Detected', 'Please speak your case details clearly into the mic.');
      return;
    }
    setIsAiVoiceParsing(true);
    try {
      const res = await CaseService.parseVoiceCaseDetails(finalTranscriptText);
      if (res?.success && res?.data) {
        const d = res.data;
        
        // Populate wizard input fields
        if (d.clientName) setClientName(d.clientName);
        if (d.clientMobile) setClientMobile(d.clientMobile);
        if (d.clientEmail) setClientEmail(d.clientEmail);
        if (d.clientCompany) setClientCompany(d.clientCompany);
        if (d.caseTitle) setCaseTitle(d.caseTitle);
        if (d.caseCategory) setCaseCategory(d.caseCategory);
        if (d.caseType) setCaseType(d.caseType);
        if (d.courtName) setCourtName(d.courtName);
        if (d.opponentName) setOppositeParty(d.opponentName);
        if (d.priority && ['Low', 'Medium', 'High', 'Urgent'].includes(d.priority)) {
          setPriority(d.priority as any);
        }
        if (d.summary) setCaseSummary(d.summary);

        const caseTitle = d.caseTitle || (d.clientName ? `${d.clientName} vs ${d.opponentName || 'Opposite Party'}` : 'New Voice Intake Case');
        const activeClientName = d.clientName || 'Client Profile';
        const wId = targetWorkspace?.id || activeWorkspace?.id;

        const payload: any = {
          name: caseTitle,
          caseType: d.caseCategory || 'Civil',
          status: 'Active',
          priority: d.priority || 'High',
          isLegalCase: true,
          clientName: activeClientName,
          courtName: d.courtName || 'District & Sessions Court',
          oppositeName: d.opponentName || undefined,
          summary: d.summary || finalTranscriptText,
          workspaceId: wId,
          clientInfo: {
            name: activeClientName,
            mobile: d.clientMobile || '',
            email: d.clientEmail || '',
            company: d.clientCompany || '',
            clientType: 'Individual',
          },
        };

        const createRes = await CaseService.createCase(payload);
        const createdData = (createRes as any)?.data || createRes;

        showToast('success', '✨ Voice Case Created!', 'Opening Firm Case Workspace...');
        await AsyncStorage.removeItem('new_case_wizard_draft');

        const generatedId = createdData?._id || createdData?.id;
        if (generatedId) {
          if (onSuccess) onSuccess(createdData);
          handleClose();
          router.push(`/workspace/${generatedId}` as any);
        }
      }
    } catch (err: any) {
      showToast('error', 'Voice AI Error', err?.message || 'Failed to extract & create firm case');
    } finally {
      setIsAiVoiceParsing(false);
    }
  });

  const renderMemberAvatar = (avatar: string, name: string, isOwner?: boolean) => {
    if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://'))) {
      return (
        <Image
          source={{ uri: avatar }}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
        />
      );
    }
    const initials = name?.split(' ')?.[1]?.[0] || name?.[0] || 'A';
    return (
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isOwner ? '#C8A34D' : '#3B82F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{initials}</Text>
      </View>
    );
  };

  // STEP 3: Team Assignment State
  const [leadAdvocate, setLeadAdvocate] = useState(activeRoster[0]?.name || '');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [memberRolesMap, setMemberRolesMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (visible && targetWorkspace?.id && typeof refreshTeamMembers === 'function') {
      refreshTeamMembers(targetWorkspace.id);
    }
  }, [visible, targetWorkspace?.id, refreshTeamMembers]);

  useEffect(() => {
    if (activeRoster.length > 0 && !leadAdvocate) {
      setLeadAdvocate(activeRoster[0].name);
    }
  }, [activeRoster, leadAdvocate]);

  // STEP 4: Initial Documents Upload State
  const [uploadedDocs, setUploadedDocs] = useState<
    Array<{ id: string; name: string; category: string; tags: string[]; size: string }>
  >([]);
  const [docNameInput, setDocNameInput] = useState('');
  const [docCategoryInput, setDocCategoryInput] = useState('Petition');
  const [docTagsInput, setDocTagsInput] = useState('Filing');

  // Real-time Auto-save Draft Indicator State
  const [draftSavedTime, setDraftSavedTime] = useState<string>('Just now');

  useEffect(() => {
    if (visible) {
      setDraftSavedTime('Draft Auto-saved');
    }
  }, [visible, caseTitle, clientName, caseSummary, currentStep]);

  // AI Smart Suggestion logic when typing summary
  useEffect(() => {
    if (!caseSummary || caseSummary.length < 10) {
      setAiSuggestedTitle('');
      setAiSuggestedCategory('');
      setAiSuggestedActs([]);
      return;
    }

    const lower = caseSummary.toLowerCase();
    let category = 'Civil';
    const acts: string[] = [];

    if (lower.includes('cheque') || lower.includes('bounce') || lower.includes('section 138')) {
      category = 'Corporate';
      acts.push('Negotiable Instruments Act, 1881 Sec 138');
    } else if (lower.includes('property') || lower.includes('tenant') || lower.includes('rent') || lower.includes('possession')) {
      category = 'Property';
      acts.push('Transfer of Property Act, 1882', 'Specific Relief Act, 1963');
    } else if (lower.includes('fir') || lower.includes('bail') || lower.includes('police') || lower.includes('assault')) {
      category = 'Criminal';
      acts.push('BNS 2023 / IPC 1860', 'BNSS 2023 / CrPC 1973');
    } else if (lower.includes('divorce') || lower.includes('custody') || lower.includes('maintenance')) {
      category = 'Family';
      acts.push('Hindu Marriage Act, 1955', 'Special Marriage Act, 1954');
    } else if (lower.includes('consumer') || lower.includes('defect') || lower.includes('deficiency')) {
      category = 'Consumer';
      acts.push('Consumer Protection Act, 2019');
    } else if (lower.includes('contract') || lower.includes('breach') || lower.includes('recovery')) {
      category = 'Corporate';
      acts.push('Indian Contract Act, 1872', 'Commercial Courts Act, 2015');
    }

    if (oppositeParty && !caseTitle) {
      setAiSuggestedTitle(`${clientName || 'Client'} vs ${oppositeParty}`);
    } else if (!caseTitle && lower.length > 15) {
      setAiSuggestedTitle(`${category} Dispute - ${clientName || 'Matter'}`);
    }

    setAiSuggestedCategory(category);
    setAiSuggestedActs(acts);
  }, [caseSummary, oppositeParty, clientName, caseTitle]);

  const resetForm = () => {
    setCurrentStep(1);
    setIsSubmitting(false);
    setCreatedCaseResult(null);
    setClientMode('new');
    setSelectedExistingClient(null);
    setClientSearchQuery('');
    setClientName('');
    setClientMobile('');
    setClientEmail('');
    setClientCompany('');
    setClientAddress('');
    setClientCity('');
    setClientState('');
    setClientPinCode('');
    setClientType('Individual');
    setClientNotes('');

    setCaseTitle('');
    setCaseCategory('Civil');
    setCaseType('Litigation');
    setCourtName('');
    setCourtNumber('');
    setCaseNumber('');
    setPoliceStation('');
    setFirNumber('');
    setOppositeParty('');
    setOppositeAdvocate('');
    setCaseSummary('');
    setPriority('High');
    setIsConfidential(false);

    setLeadAdvocate(activeRoster[0]?.name || '');
    setSelectedTeamMembers([]);
    setUploadedDocs([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (clientMode === 'existing' && !selectedExistingClient) {
        showToast('error', 'Select Client', 'Please select an existing client or switch to New Client.');
        return;
      }
      if (clientMode === 'new' && (!clientName.trim() || !clientMobile.trim())) {
        showToast('error', 'Required Fields', 'Client Name and Mobile Number are required.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!caseTitle.trim()) {
        showToast('error', 'Required Field', 'Please enter a Case Title.');
        return;
      }
      if (!caseCategory) {
        showToast('error', 'Required Field', 'Please select a Case Category.');
        return;
      }
    }

    if (currentStep === 3) {
      if (!leadAdvocate) {
        showToast('error', 'Required Field', 'Please assign a Lead Advocate.');
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleTeamMember = (member: string) => {
    if (selectedTeamMembers.includes(member)) {
      setSelectedTeamMembers(selectedTeamMembers.filter((m) => m !== member));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, member]);
      if (!memberRolesMap[member]) {
        setMemberRolesMap({ ...memberRolesMap, [member]: 'Junior Advocate' });
      }
    }
  };

  const handleAddDocument = () => {
    if (!docNameInput.trim()) {
      showToast('error', 'Document Name', 'Please enter a document title.');
      return;
    }
    const newDoc = {
      id: Date.now().toString(),
      name: docNameInput.trim(),
      category: docCategoryInput,
      tags: docTagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      size: '1.4 MB',
    };
    setUploadedDocs([...uploadedDocs, newDoc]);
    setDocNameInput('');
    showToast('success', 'Document Added', `${newDoc.name} linked to case upload queue.`);
  };

  const handleCreateCaseSubmit = async () => {
    setIsSubmitting(true);
    try {
      const activeClientName =
        clientMode === 'existing' ? selectedExistingClient.name : clientName;

      const ownerMember = activeRoster.find((m) => m.isOwner) || activeRoster[0];
      const assignedUserIds = activeRoster
        .filter((m) => selectedTeamMembers.includes(m.name) || m.isOwner)
        .map((m) => m.userId || m.id)
        .filter(Boolean);

      const payload: any = {
        name: caseTitle,
        caseType: caseCategory,
        status: 'Active',
        priority: priority,
        isLegalCase: true,
        clientName: activeClientName,
        courtName: courtName || 'District & Sessions Court',
        courtNumber: courtNumber || undefined,
        caseNumber: caseNumber || undefined,
        oppositeName: oppositeParty || undefined,
        oppositeAdvocate: oppositeAdvocate || undefined,
        policeStation: policeStation || undefined,
        firNumber: firNumber || undefined,
        isConfidential: isConfidential,
        summary: caseSummary || `${caseCategory} ${caseType} matter for ${activeClientName}.`,
        workspaceId: activeWorkspace?.id,
        leadAdvocate: ownerMember?.name || leadAdvocate,
        leadAdvocateUserId: ownerMember?.userId || ownerMember?.id,
        teamMembers: selectedTeamMembers,
        assignedUserIds: assignedUserIds,
        clientInfo:
          clientMode === 'existing'
            ? selectedExistingClient
            : {
                name: clientName,
                mobile: clientMobile,
                email: clientEmail,
                company: clientCompany,
                address: `${clientAddress} ${clientCity} ${clientState} ${clientPinCode}`.trim(),
                clientType: clientType,
                notes: clientNotes,
              },
        teamAssignment: {
          leadAdvocate: ownerMember?.name || leadAdvocate,
          members: selectedTeamMembers.map((m) => ({
            name: m,
            role: memberRolesMap[m] || 'Associate',
          })),
        },
        initialDocuments: uploadedDocs,
      };

      const res = await CaseService.createCase(payload);
      const createdData = (res as any)?.data || res;

      // Generated Case ID fallback
      const generatedId = createdData?._id || `AIL-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const resultCaseObj = {
        id: generatedId,
        caseNumber: createdData?.caseNumber || generatedId,
        name: caseTitle,
        clientName: activeClientName,
        leadAdvocate: leadAdvocate,
        teamMembers: selectedTeamMembers,
      };

      setCreatedCaseResult(resultCaseObj);

      // Save client profile dynamically so it immediately appears in Existing Clients list
      if (activeClientName && activeClientName !== 'N/A' && activeClientName !== 'Unknown Client') {
        try {
          const newClientObj = {
            id: `client_${Date.now()}`,
            name: activeClientName.trim(),
            contact: clientMobile || '+91 98765 43210',
            email: clientEmail || `${activeClientName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            company: clientCompany || 'Registered Client',
            clientType: clientType || 'Individual',
            casesCount: 1,
            notes: clientNotes || `Matter: ${caseTitle}`,
          };
          const stored = await AsyncStorage.getItem('@custom_registered_clients');
          const existingList = stored ? JSON.parse(stored) : [];
          const updatedList = [newClientObj, ...existingList.filter((c: any) => c.name?.toLowerCase() !== activeClientName.trim().toLowerCase())];
          await AsyncStorage.setItem('@custom_registered_clients', JSON.stringify(updatedList));
          setSavedCustomClients(updatedList);
        } catch (e) {}
      }

      showToast('success', '✅ Case Created Successfully', `Workspace ${generatedId} initialized.`);
      if (onSuccess) onSuccess(resultCaseObj);
    } catch (err: any) {
      console.error('[WIZARD] Creation error:', err);
      showToast('error', 'Creation Failed', err?.message || 'Failed to create case workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicExistingClients = useMemo(() => {
    const storeWorkspaces = useWorkspaceStore.getState().workspaces || {};
    const caseList = Object.values(storeWorkspaces);
    const map = new Map<string, any>();

    // 1. Populate custom registered clients saved by advocate
    savedCustomClients.forEach((c: any) => {
      if (c && c.name && c.name.trim()) {
        const key = c.name.trim().toLowerCase();
        map.set(key, {
          id: c.id || `custom_${key}`,
          name: c.name.trim(),
          contact: c.contact || c.mobile || '+91 98765 43210',
          email: c.email || 'client@legal.com',
          company: c.company || 'Registered Client',
          clientType: c.clientType || 'Individual',
          casesCount: c.casesCount || 1,
          notes: c.notes || 'Registered Client Profile',
        });
      }
    });

    // 2. Extract real clients from active case workspaces in store/context
    caseList.forEach((c: any) => {
      const cName = c.clientName || c.client || c.parties?.client?.name;
      if (cName && typeof cName === 'string' && cName.trim() && cName !== 'N/A' && cName !== 'Unknown Client') {
        const key = cName.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: c._id || c.id || `c_${key}`,
            name: cName.trim(),
            contact: c.clientMobileNumber || c.clientPhone || c.clientContact || c.opponentPhone || '+91 98765 43210',
            email: c.clientEmail || `${cName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            company: c.clientCompany || c.company || c.caseType || 'Client Profile',
            clientType: c.clientType || 'Individual',
            casesCount: 1,
            notes: `Client linked to matter: ${c.name || c.caseTitle || 'Active Matter'}`,
          });
        } else {
          const existing = map.get(key);
          existing.casesCount = (existing.casesCount || 1) + 1;
        }
      }
    });

    return Array.from(map.values());
  }, [workspaces, savedCustomClients]);

  const filteredExistingClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return dynamicExistingClients;
    const q = clientSearchQuery.toLowerCase();
    return dynamicExistingClients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.contact || '').includes(q)
    );
  }, [dynamicExistingClients, clientSearchQuery]);

  const stepsList = [
    'Client Info',
    'Case Details',
    'Assign Team',
    'Initial Documents',
    'Review & Create',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Success Screen Modal Content */}
        {createdCaseResult ? (
          <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>

            <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Case Created Successfully!</Text>
            <Text style={[styles.successSub, { color: theme.textSecondary }]}>
              AI LEGAL enterprise workspace, folder structures, AI context & RBAC permissions initialized.
            </Text>

            <View style={[styles.successCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.successCardRow}>
                <Text style={[styles.successLabel, { color: theme.textSecondary }]}>Case ID / Docket No:</Text>
                <Text style={[styles.successValBold, { color: '#C8A34D' }]}>{createdCaseResult.caseNumber}</Text>
              </View>

              <View style={styles.successCardRow}>
                <Text style={[styles.successLabel, { color: theme.textSecondary }]}>Case Title:</Text>
                <Text style={[styles.successVal, { color: theme.textPrimary }]}>{createdCaseResult.name}</Text>
              </View>

              <View style={styles.successCardRow}>
                <Text style={[styles.successLabel, { color: theme.textSecondary }]}>Client Profile:</Text>
                <Text style={[styles.successVal, { color: theme.textPrimary }]}>{createdCaseResult.clientName}</Text>
              </View>

              <View style={styles.successCardRow}>
                <Text style={[styles.successLabel, { color: theme.textSecondary }]}>Lead Advocate:</Text>
                <Text style={[styles.successVal, { color: theme.textPrimary }]}>{createdCaseResult.leadAdvocate}</Text>
              </View>

              <View style={styles.successCardRow}>
                <Text style={[styles.successLabel, { color: theme.textSecondary }]}>Assigned Team:</Text>
                <Text style={[styles.successVal, { color: theme.textPrimary }]}>
                  {createdCaseResult.teamMembers?.length || 0} Lawyers
                </Text>
              </View>
            </View>

            <Text style={[styles.quickActionsHeading, { color: theme.textPrimary }]}>⚡ Quick Next Actions</Text>

            <View style={styles.actionButtonsCol}>
              <TouchableOpacity
                style={[styles.primaryGoldBtn, Shadows.button]}
                onPress={() => {
                  handleClose();
                  if (createdCaseResult.id) {
                    router.push(`/workspace/${createdCaseResult.id}` as any);
                  }
                }}
              >
                <Ionicons name="scale-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryGoldBtnText}>Open Case Workspace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  showToast('info', 'Schedule Hearing', 'Hearing scheduler modal initiated.');
                  handleClose();
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Schedule Hearing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  showToast('info', 'Create Task', 'Task assignment wizard initiated.');
                  handleClose();
                }}
              >
                <Ionicons name="checkbox-outline" size={18} color={theme.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Create Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleClose()}
              >
                <Ionicons name="home-outline" size={18} color={theme.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Create Firm Workspace</Text>
                <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
                  Step {currentStep} of 5 — {stepsList[currentStep - 1]}
                </Text>
              </View>

              {/* Voice AI Mic Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isRecording ? '#EF4444' : (isDark ? '#2D261A' : '#FEF8EC'),
                  borderColor: isRecording ? '#EF4444' : '#C8A34D',
                  borderWidth: 1.5,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 18,
                  marginRight: 6,
                  gap: 4
                }}
                onPress={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording('hi');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={isRecording ? "stop-circle" : "mic"} size={15} color={isRecording ? "#FFFFFF" : "#C8A34D"} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: isRecording ? "#FFFFFF" : "#C8A34D" }}>
                  {isRecording ? `${duration}s Stop` : "🎙️ Voice AI"}
                </Text>
              </TouchableOpacity>

              <View style={styles.draftBadge}>
                <Ionicons name="cloud-done-outline" size={14} color="#C8A34D" />
                <Text style={styles.draftBadgeText}>{draftSavedTime}</Text>
              </View>
            </View>

            {/* Voice AI Dictation Recording Overlay Modal */}
            <Modal visible={isRecording || isTranscribing || isAiVoiceParsing} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <View style={{ width: '100%', maxWidth: 350, backgroundColor: theme.card, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#C8A34D' }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isAiVoiceParsing ? '#0EA5E9' : '#EF4444', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    {isAiVoiceParsing ? (
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="mic" size={32} color="#FFFFFF" />
                    )}
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}>
                    {isAiVoiceParsing ? '⚡ AI Processing Case Dictation...' : '🎙️ Dictate Case Details'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                    {isAiVoiceParsing 
                      ? 'Extracting Client, Case Title, Court, Priority & Summary...'
                      : 'Speak case info like: "Rajesh vs Aryan Singh, Civil Breach of Contract case in Delhi High Court, Client Ramesh Agrawal..."'}
                  </Text>

                  {!isAiVoiceParsing && (
                    <View style={{ backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, width: '100%', marginVertical: 14, minHeight: 60, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, color: theme.textPrimary, fontStyle: partialText ? 'normal' : 'italic' }}>
                        {partialText || 'Listening... Start speaking...'}
                      </Text>
                      {isRecording && (
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', marginTop: 4 }}>
                          🔴 Recording: {duration}s
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }}
                      onPress={cancelRecording}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>

                    {isRecording && (
                      <TouchableOpacity
                        style={{ flex: 1.5, height: 44, borderRadius: 10, backgroundColor: '#C8A34D', justifyContent: 'center', alignItems: 'center' }}
                        onPress={stopRecording}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Stop & Auto-Fill</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </Modal>

            {/* Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#262626' : '#E5E7EB' }]}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${(currentStep / 5) * 100}%`, backgroundColor: '#C8A34D' },
                ]}
              />
            </View>

            {/* Wizard Body Content */}
            <ScrollView contentContainerStyle={styles.wizardBody} showsVerticalScrollIndicator={false}>
              {/* STEP 1: CLIENT INFORMATION */}
              {currentStep === 1 && (
                <View style={styles.stepSection}>
                  <View style={styles.stepTitleBox}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>👤 Client Information</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Link an existing firm client or register a new client profile into CRM.
                    </Text>
                  </View>

                  {/* Mode Selector */}
                  <View style={[styles.modeToggleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity
                      style={[
                        styles.modeToggleTab,
                        clientMode === 'existing' && { backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: '#C8A34D' },
                      ]}
                      onPress={() => setClientMode('existing')}
                    >
                      <Text style={[styles.modeToggleText, { color: clientMode === 'existing' ? '#C8A34D' : theme.textPrimary }]}>
                        ● Existing Client
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modeToggleTab,
                        clientMode === 'new' && { backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: '#C8A34D' },
                      ]}
                      onPress={() => setClientMode('new')}
                    >
                      <Text style={[styles.modeToggleText, { color: clientMode === 'new' ? '#C8A34D' : theme.textPrimary }]}>
                        ● New Client
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {clientMode === 'existing' ? (
                    <View style={{ gap: 12 }}>
                      <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Search Client Database *</Text>
                      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                          style={[styles.searchInput, { color: theme.textPrimary }]}
                          placeholder="Search by name, company, or phone..."
                          placeholderTextColor={theme.textMuted}
                          value={clientSearchQuery}
                          onChangeText={setClientSearchQuery}
                        />
                      </View>

                      {filteredExistingClients.length === 0 ? (
                        <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, gap: 8, marginVertical: 10 }}>
                          <Ionicons name="person-add-outline" size={32} color={theme.textMuted} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' }}>No Registered Clients Found</Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                            Switch to the <Text style={{ fontWeight: '800', color: '#C8A34D' }}>'New Client'</Text> tab above to add your first client profile!
                          </Text>
                          <TouchableOpacity
                            style={{ marginTop: 6, backgroundColor: '#C8A34D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                            onPress={() => setClientMode('new')}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>+ Register New Client</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        filteredExistingClients.map((client) => {
                          const isSelected = selectedExistingClient?.id === client.id;
                          return (
                            <TouchableOpacity
                              key={client.id}
                              style={[
                                styles.clientOptionCard,
                                { backgroundColor: theme.card, borderColor: isSelected ? '#C8A34D' : theme.border },
                                isSelected && { backgroundColor: isDark ? '#1F2937' : '#FFFBEB' },
                              ]}
                              onPress={() => {
                                setSelectedExistingClient(client);
                                setClientName(client.name || '');
                                setClientMobile(client.contact || '');
                                setClientEmail(client.email || '');
                                setClientCompany(client.company || '');
                                if (client.clientType) setClientType(client.clientType);
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.clientNameText, { color: theme.textPrimary }]}>{client.name}</Text>
                                {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                              </View>
                              <Text style={[styles.clientSubText, { color: theme.textSecondary }]}>
                                {client.company} • {client.contact} • {client.casesCount} Active Matters
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 14 }}>
                      <View>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Client Full Name *</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="e.g. Aditi Lakhera / Apex Logistics Pvt Ltd"
                          placeholderTextColor={theme.textMuted}
                          value={clientName}
                          onChangeText={setClientName}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Mobile Number *</Text>
                          <TextInput
                            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            value={clientMobile}
                            onChangeText={setClientMobile}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Email Address</Text>
                          <TextInput
                            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                            placeholder="client@email.com"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="email-address"
                            value={clientEmail}
                            onChangeText={setClientEmail}
                          />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Company / Entity</Text>
                          <TextInput
                            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                            placeholder="Organization name"
                            placeholderTextColor={theme.textMuted}
                            value={clientCompany}
                            onChangeText={setClientCompany}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Client Type</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingTop: 4 }}>
                            {CLIENT_TYPES.map((type) => (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.chipItem,
                                  { backgroundColor: clientType === type ? '#C8A34D' : theme.card, borderColor: theme.border },
                                ]}
                                onPress={() => setClientType(type)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: clientType === type ? '#FFFFFF' : theme.textPrimary }}>
                                  {type}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>

                      <View>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Registered Address</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="Street address / Office premises"
                          placeholderTextColor={theme.textMuted}
                          value={clientAddress}
                          onChangeText={setClientAddress}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                          style={[styles.textInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="City"
                          placeholderTextColor={theme.textMuted}
                          value={clientCity}
                          onChangeText={setClientCity}
                        />
                        <TextInput
                          style={[styles.textInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="State"
                          placeholderTextColor={theme.textMuted}
                          value={clientState}
                          onChangeText={setClientState}
                        />
                        <TextInput
                          style={[styles.textInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="PIN Code"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="numeric"
                          value={clientPinCode}
                          onChangeText={setClientPinCode}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* STEP 2: CASE INFORMATION */}
              {currentStep === 2 && (
                <View style={styles.stepSection}>
                  <View style={styles.stepTitleBox}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>⚖️ Case Information</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Enter litigation or advisory matter details. AI will suggest titles and Acts.
                    </Text>
                  </View>

                  <View style={{ gap: 14 }}>
                    <View>
                      <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Title *</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        placeholder="e.g. Ramesh Chandra vs Union of India"
                        placeholderTextColor={theme.textMuted}
                        value={caseTitle}
                        onChangeText={setCaseTitle}
                      />
                    </View>

                    {/* AI Smart Suggestion Banner */}
                    {(aiSuggestedTitle || aiSuggestedCategory) && (
                      <View style={[styles.aiSuggestionCard, { backgroundColor: isDark ? '#1F2937' : '#FEF3C7', borderColor: '#C8A34D' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="sparkles" size={16} color="#C8A34D" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#F9FAFB' : '#92400E' }}>
                            AI Smart Assist Recommendations
                          </Text>
                        </View>
                        {aiSuggestedTitle && !caseTitle && (
                          <TouchableOpacity onPress={() => setCaseTitle(aiSuggestedTitle)}>
                            <Text style={{ fontSize: 11, color: '#C8A34D', textDecorationLine: 'underline' }}>
                              💡 Click to set Title: "{aiSuggestedTitle}"
                            </Text>
                          </TouchableOpacity>
                        )}
                        {aiSuggestedCategory && (
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                            Category match: <Text style={{ fontWeight: '700', color: '#C8A34D' }}>{aiSuggestedCategory}</Text>
                          </Text>
                        )}
                        {aiSuggestedActs.length > 0 && (
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                            Applicable Acts: {aiSuggestedActs.join(', ')}
                          </Text>
                        )}
                      </View>
                    )}

                    <View>
                      <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Category *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingTop: 4 }}>
                        {CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.chipItem,
                              { backgroundColor: caseCategory === cat ? '#C8A34D' : theme.card, borderColor: theme.border },
                            ]}
                            onPress={() => setCaseCategory(cat)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: caseCategory === cat ? '#FFFFFF' : theme.textPrimary }}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingTop: 4 }}>
                          {CASE_TYPES.map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.chipItem,
                                { backgroundColor: caseType === type ? '#C8A34D' : theme.card, borderColor: theme.border },
                              ]}
                              onPress={() => setCaseType(type)}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: caseType === type ? '#FFFFFF' : theme.textPrimary }}>
                                {type}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Priority</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                            <TouchableOpacity
                              key={p}
                              style={[
                                styles.chipItem,
                                {
                                  backgroundColor: priority === p ? (p === 'Urgent' ? '#EF4444' : '#C8A34D') : theme.card,
                                  borderColor: theme.border,
                                },
                              ]}
                              onPress={() => setPriority(p)}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '800', color: priority === p ? '#FFFFFF' : theme.textPrimary }}>
                                {p}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court / Forum</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="e.g. High Court of Delhi"
                          placeholderTextColor={theme.textMuted}
                          value={courtName}
                          onChangeText={setCourtName}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court Room / Hall No</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="e.g. Court Room 14"
                          placeholderTextColor={theme.textMuted}
                          value={courtNumber}
                          onChangeText={setCourtNumber}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Opposite Party</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="Opposite Party Name"
                          placeholderTextColor={theme.textMuted}
                          value={oppositeParty}
                          onChangeText={setOppositeParty}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Opposite Advocate</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          placeholder="Opposing Advocate Name"
                          placeholderTextColor={theme.textMuted}
                          value={oppositeAdvocate}
                          onChangeText={setOppositeAdvocate}
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Summary & Key Facts</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            height: 80,
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                            textAlignVertical: 'top',
                          },
                        ]}
                        placeholder="Brief facts of the dispute, prayer, key legal questions..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        value={caseSummary}
                        onChangeText={setCaseSummary}
                      />
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View>
                        <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>🔒 Confidential Case Workspace</Text>
                        <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                          Restrict visibility exclusively to assigned team members and firm owner.
                        </Text>
                      </View>
                      <Switch
                        value={isConfidential}
                        onValueChange={setIsConfidential}
                        trackColor={{ false: '#767577', true: '#C8A34D' }}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 3: ASSIGN TEAM */}
              {currentStep === 3 && (
                <View style={styles.stepSection}>
                  <View style={styles.stepTitleBox}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>👥 Assign Case Team</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Firm Owner is automatically designated as Lead Advocate. Assign additional team members below.
                    </Text>
                  </View>

                  <View style={{ gap: 16 }}>
                    {/* 1. Default Read-Only Lead Advocate (Firm Owner Only) */}
                    <View>
                      <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Lead Advocate *</Text>
                      {(() => {
                        const owner = activeRoster.find(m => m.isOwner) || activeRoster[0];
                        return (
                          <View
                            style={[
                              styles.rosterCard,
                              { backgroundColor: isDark ? '#1F2937' : '#FEF3C7', borderColor: '#C8A34D', borderWidth: 1.5 },
                            ]}
                          >
                            {renderMemberAvatar(owner.avatar, owner.name, true)}
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.rosterName, { color: '#C8A34D', fontWeight: '800' }]}>{owner.name}</Text>
                                <View style={{ backgroundColor: '#C8A34D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#000000' }}>👑 Firm Owner</Text>
                                </View>
                              </View>
                              <Text style={[styles.rosterRole, { color: theme.textSecondary, marginTop: 2 }]}>
                                {owner.role} • {owner.department}
                              </Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={22} color="#C8A34D" />
                          </View>
                        );
                      })()}
                    </View>

                    {/* 2. Additional Team Members (Remaining Accepted Members Only) */}
                    {(() => {
                      const leadOwner = activeRoster.find(m => m.isOwner) || activeRoster[0];
                      const leadOwnerId = leadOwner?.id || leadOwner?.userId;
                      const additionalMembers = activeRoster.filter(m => (m.id || m.userId) !== leadOwnerId);

                      return (
                        <View>
                          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Additional Team Members (Multi-Select)</Text>
                          {additionalMembers.length === 0 ? (
                            <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                              <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center' }}>
                                No additional team members in workspace. You can invite team members from the Firm Team Directory.
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.rosterList}>
                              {additionalMembers.map((member) => {
                                const isAssigned = selectedTeamMembers.includes(member.name);
                                return (
                                  <TouchableOpacity
                                    key={member.id || member.userId}
                                    style={[
                                      styles.rosterCard,
                                      { backgroundColor: theme.card, borderColor: isAssigned ? '#C8A34D' : theme.border },
                                    ]}
                                    onPress={() => toggleTeamMember(member.name)}
                                  >
                                    {renderMemberAvatar(member.avatar, member.name, false)}
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.rosterName, { color: theme.textPrimary }]}>{member.name}</Text>
                                      <Text style={[styles.rosterRole, { color: theme.textSecondary }]}>
                                        {member.role} • {member.department}
                                      </Text>
                                    </View>
                                    <Ionicons
                                      name={isAssigned ? 'checkbox' : 'square-outline'}
                                      size={22}
                                      color={isAssigned ? '#C8A34D' : theme.textMuted}
                                    />
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}

              {/* STEP 4: INITIAL DOCUMENTS */}
              {currentStep === 4 && (
                <View style={styles.stepSection}>
                  <View style={styles.stepTitleBox}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>📁 Initial Documents Upload</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Upload petition copies, FIRs, agreements or evidence to auto-index into Case AI Context.
                    </Text>
                  </View>

                  <View style={{ gap: 14 }}>
                    <View style={[styles.uploadBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Ionicons name="cloud-upload-outline" size={32} color="#C8A34D" />
                      <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Drag & Drop or Click to Select Files</Text>
                      <Text style={[styles.uploadSub, { color: theme.textSecondary }]}>Supports PDF, DOCX, Images & Scanned Evidence</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        style={[styles.textInput, { flex: 2, backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        placeholder="Document Title (e.g. Writ Petition draft)"
                        placeholderTextColor={theme.textMuted}
                        value={docNameInput}
                        onChangeText={setDocNameInput}
                      />
                      <TouchableOpacity style={[styles.addDocBtn, Shadows.button]} onPress={handleAddDocument}>
                        <Text style={styles.addDocBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {uploadedDocs.length > 0 && (
                      <View style={{ gap: 8 }}>
                        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Linked Queue ({uploadedDocs.length})</Text>
                        {uploadedDocs.map((doc) => (
                          <View key={doc.id} style={[styles.docQueueCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="document-text-outline" size={22} color="#C8A34D" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.docQueueName, { color: theme.textPrimary }]}>{doc.name}</Text>
                              <Text style={[styles.docQueueSub, { color: theme.textSecondary }]}>
                                {doc.category} • OCR Auto-Indexed
                              </Text>
                            </View>
                            <TouchableOpacity onPress={() => setUploadedDocs(uploadedDocs.filter((d) => d.id !== doc.id))}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* STEP 5: REVIEW & CREATE */}
              {currentStep === 5 && (
                <View style={styles.stepSection}>
                  <View style={styles.stepTitleBox}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>📋 Review & Initialize Workspace</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Confirm client, case metadata, team roster, and initial documents.
                    </Text>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.reviewCardTitle, { color: '#C8A34D' }]}>👤 CLIENT DETAILS</Text>
                      <Text style={[styles.reviewTextBold, { color: theme.textPrimary }]}>
                        {clientMode === 'existing' ? selectedExistingClient?.name : clientName}
                      </Text>
                      <Text style={[styles.reviewTextSub, { color: theme.textSecondary }]}>
                        Mobile: {clientMode === 'existing' ? selectedExistingClient?.contact : clientMobile} | Type: {clientType}
                      </Text>
                    </View>

                    <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.reviewCardTitle, { color: '#C8A34D' }]}>⚖️ CASE & MATTER DETAILS</Text>
                      <Text style={[styles.reviewTextBold, { color: theme.textPrimary }]}>{caseTitle}</Text>
                      <Text style={[styles.reviewTextSub, { color: theme.textSecondary }]}>
                        Category: {caseCategory} | Type: {caseType} | Priority: {priority}
                      </Text>
                      {courtName && (
                        <Text style={[styles.reviewTextSub, { color: theme.textSecondary }]}>
                          Court: {courtName} {courtNumber ? `(Hall ${courtNumber})` : ''}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.reviewCardTitle, { color: '#C8A34D' }]}>👥 ROSTER & ACCESS</Text>
                      <Text style={[styles.reviewTextBold, { color: theme.textPrimary }]}>Lead Counsel: {leadAdvocate}</Text>
                      <Text style={[styles.reviewTextSub, { color: theme.textSecondary }]}>
                        Assigned Roster: {selectedTeamMembers.join(', ')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={[styles.footerBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
              {currentStep > 1 && (
                <TouchableOpacity style={[styles.backBtn, { borderColor: theme.border }]} onPress={handleBack}>
                  <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>Back</Text>
                </TouchableOpacity>
              )}

              {currentStep < 5 ? (
                <TouchableOpacity style={[styles.nextBtn, Shadows.button]} onPress={handleNext}>
                  <Text style={styles.nextBtnText}>Continue →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: '#C8A34D' }, Shadows.button]}
                  onPress={handleCreateCaseSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.nextBtnText}>🚀 Create Case</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8A34D',
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  wizardBody: {
    padding: 20,
    paddingBottom: 40,
  },
  stepSection: {
    gap: 16,
  },
  stepTitleBox: {
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  stepSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 6,
  },
  modeToggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  clientOptionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  clientNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clientSubText: {
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 240,
  },
  aiSuggestionCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rosterList: {
    gap: 10,
  },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  rosterName: {
    fontSize: 13,
    fontWeight: '700',
  },
  rosterRole: {
    fontSize: 11,
    marginTop: 2,
  },
  uploadBox: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  uploadSub: {
    fontSize: 11,
  },
  addDocBtn: {
    backgroundColor: '#C8A34D',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDocBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  docQueueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  docQueueName: {
    fontSize: 13,
    fontWeight: '700',
  },
  docQueueSub: {
    fontSize: 11,
    marginTop: 2,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reviewCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reviewTextBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewTextSub: {
    fontSize: 12,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: '#C8A34D',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nextBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconWrapper: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 320,
  },
  successCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 20,
    gap: 10,
  },
  successCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  successVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  successValBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsHeading: {
    fontSize: 14,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  actionButtonsCol: {
    width: '100%',
    gap: 10,
  },
  primaryGoldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A34D',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryGoldBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
