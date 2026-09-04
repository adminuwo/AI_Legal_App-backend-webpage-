import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Linking,
  TextInput as RNTextInput,
  Clipboard,
  Share,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { formatWhatsAppNumber, cleanMarkdown } from '../utils/phone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tTool } from '@/localization/toolTranslations';
import { useLocalLanguageStore } from '@/localization/i18n';

import { useUserStore } from '@/store/user';

interface ClientConnectModuleProps {
  outputLanguage?: string;
  caseData: CaseWorkspace;
  onUpdate?: () => void;
  onDelete?: () => void;
  userRole?: string; // 'Firm Owner' | 'Managing Partner' | 'Lead Advocate' | 'Junior Advocate' | 'Intern'
  onOpenTeamChat?: () => void;
}

export const COMMUNICATION_PURPOSES = [
  'Hearing Reminder',
  'Fee Reminder',
  'Pending Documents',
  'Case Update',
  'Court Order',
  'Meeting Request',
  'Draft Ready',
  'Evidence Required',
  'General Update',
  'Custom',
];

export const COMMUNICATION_STYLES = [
  'Professional',
  'Formal',
  'Friendly',
  'Urgent',
  'Short',
  'Detailed',
];

export const ClientConnectModule: React.FC<ClientConnectModuleProps> = ({
  caseData,
  onUpdate,
  userRole = 'Lead Advocate',
  onOpenTeamChat,
  outputLanguage = 'English',
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const globalLang = useLocalLanguageStore((s) => s.localLanguage);
  const activeLang = globalLang || outputLanguage || 'English';
  const [currentOutputLang, setCurrentOutputLang] = useState(outputLanguage || 'English');

  const profile = useUserStore((s) => s.profile);
  const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
  const formattedProfileName = profileName
    ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
    : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : null);

  const rawCaseLead = (caseData as any)?.leadAdvocate;
  const leadAdvocate = (rawCaseLead && rawCaseLead !== 'Adv. Aditi Lakhera' && rawCaseLead !== 'Aditi Lakhera')
    ? (rawCaseLead.trim().startsWith('Adv.') ? rawCaseLead.trim() : `Adv. ${rawCaseLead.trim()}`)
    : (formattedProfileName || 'Adv. Advocate');

  const clientName = caseData.clientName || 'Suresh Kumar';
  const phone = (caseData as any).clientMobileNumber || (caseData as any).clientPhone || (caseData as any).clientId?.mobileNumber || '9876543210';
  const whatsapp = (caseData as any).clientWhatsAppNumber || (caseData as any).clientPhone || (caseData as any).clientId?.whatsAppNumber || phone;
  const email = (caseData as any).clientEmail || (caseData as any).email || (caseData as any).clientId?.email || 'Not Provided';
  const language = (caseData as any).courtroomLanguage || 'English';

  const isIntern = (userRole || '').toLowerCase().includes('intern');
  const isJunior = (userRole || '').toLowerCase().includes('junior');

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);

  // Channel Timeline Modal State
  const [activeChannelTimeline, setActiveChannelTimeline] = useState<'WhatsApp' | 'Email' | 'Call' | null>(null);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Sent' | 'Delivered' | 'Failed'>('All');

  // Selected Log Record Modal State
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // AI Builder Modal State
  const [builderVisible, setBuilderVisible] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'WhatsApp' | 'Email'>('WhatsApp');
  const [isManualMode, setIsManualMode] = useState(false);
  const [step, setStep] = useState<'builder' | 'preview'>('builder');

  // Builder Form Fields
  const [selectedPurpose, setSelectedPurpose] = useState<string>('Hearing Reminder');
  const [purposeSearch, setPurposeSearch] = useState('');
  const [advocateInstructions, setAdvocateInstructions] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Professional');

  // Draft Preview & Editing State
  const [aiDraftSubject, setAiDraftSubject] = useState('');
  const [aiDraftBody, setAiDraftBody] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync logs on mount and when caseData changes
  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved && (!outputLanguage || outputLanguage === 'English')) {
          setCurrentOutputLang(saved);
        }
      } catch (e) {}
    };
    loadLang();
    if (caseData && (caseData as any).communicationLogs) {
      const sorted = [...(caseData as any).communicationLogs].sort(
        (a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
      );
      setLogs(sorted);
    }
  }, [caseData]);

  const refreshLogs = async () => {
    try {
      const res = await CaseService.getCaseDetails(caseData._id);
      const updatedCase = (res as any).data || res;
      if (updatedCase && (updatedCase as any).communicationLogs) {
        const sorted = [...(updatedCase as any).communicationLogs].sort(
          (a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
        );
        setLogs(sorted);
      }
      if (onUpdate) onUpdate();
    } catch (e) {
      console.warn('Failed to refresh communication logs:', e);
    }
  };

  // 1. DIRECT CALL HANDLER (No AI, Immediate tel: launch)
  const handleDirectCall = async () => {
    if (isIntern) {
      showToast('error', 'Permission Restricted', 'Interns do not have direct call permission.');
      return;
    }
    if (!phone) {
      showToast('error', 'Missing Phone', 'No mobile number configured for this client.');
      return;
    }
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    const url = `tel:${cleanPhone}`;

    try {
      await Linking.openURL(url);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'Phone Call',
        recipientPhone: phone,
        status: 'Dialed',
        mode: 'Native Dialer',
        reason: 'Direct Phone Call',
      });
      showToast('success', 'Phone Dialer Opened', `Calling ${clientName}...`);
      refreshLogs();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to Call', 'Error opening phone dialer.');
    }
  };

  // OPEN BUILDER MODAL
  const handleOpenBuilder = (channel: 'WhatsApp' | 'Email') => {
    if (isIntern) {
      showToast('error', 'Permission Restricted', 'Interns have read-only access to client connect.');
      return;
    }
    setActiveChannel(channel);
    setIsManualMode(false);
    setStep('builder');
    setSelectedPurpose('Hearing Reminder');
    setAdvocateInstructions('');
    setSelectedStyle('Professional');
    setAiDraftSubject('');
    setAiDraftBody('');
    setIsEditingDraft(false);
    setBuilderVisible(true);
  };

  // OPEN MANUAL MODE
  const handleOpenManualMode = () => {
    setIsManualMode(true);
    setStep('preview');
    setIsEditingDraft(true);
    setAiDraftSubject(activeChannel === 'Email' ? `Case Update: ${caseData.name}` : '');
    setAiDraftBody(`Dear ${clientName},\n\n[Write your manual message here]\n\nRegards,\nAdv. ${leadAdvocate}\nLaw Firm Workspace`);
  };

  // GENERATE AI DRAFT
  const handleGenerateAIDraft = async () => {
    try {
      setIsLoading(true);
      const res = await CaseService.generateClientConnectDraft(caseData._id, {
        channel: activeChannel,
        reasons: [selectedPurpose],
        description: advocateInstructions,
        style: selectedStyle,
        languagePreference: outputLanguage || language || 'English',
      });

      if (res.success && res.draft) {
        setAiDraftBody(cleanMarkdown(res.draft));
        setAiDraftSubject(res.subject || `Case Update: ${caseData.name}`);
        setStep('preview');
        setIsEditingDraft(false);
      } else {
        throw new Error('No draft generated');
      }
    } catch (e: any) {
      showToast('error', 'Draft Failed', e?.message || 'Could not generate AI draft.');
    } finally {
      setIsLoading(false);
    }
  };

  // APPROVE & SEND WHATSAPP
  const handleApproveAndSendWhatsApp = async () => {
    if (!whatsapp) {
      showToast('error', 'Missing WhatsApp Number', 'No WhatsApp number available for client.');
      return;
    }
    const cleanPhone = formatWhatsAppNumber(whatsapp);
    const textParam = encodeURIComponent(aiDraftBody);
    const nativeUrl = `whatsapp://send?phone=${cleanPhone}&text=${textParam}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${textParam}`;

    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }

      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedPurpose,
        mode: isManualMode ? 'Manual Message' : 'AI Draft Approved',
        body: aiDraftBody,
        recipientPhone: whatsapp,
        status: 'Sent via WhatsApp',
      });

      showToast('success', 'WhatsApp Launched', 'Message ready to send.');
      setBuilderVisible(false);
      refreshLogs();
    } catch (e) {
      showToast('error', 'Launch Failed', 'Could not open WhatsApp.');
    }
  };

  // APPROVE & SEND EMAIL
  const handleApproveAndSendEmail = async () => {
    if (!email) {
      showToast('error', 'Missing Email', 'No email address configured for client.');
      return;
    }
    const subjectParam = encodeURIComponent(aiDraftSubject || `Case Update: ${caseData.name}`);
    const bodyParam = encodeURIComponent(aiDraftBody);
    const mailtoUrl = `mailto:${email}?subject=${subjectParam}&body=${bodyParam}`;

    try {
      await Linking.openURL(mailtoUrl);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'Email',
        reason: selectedPurpose,
        mode: isManualMode ? 'Manual Message' : 'AI Draft Approved',
        subject: aiDraftSubject,
        body: aiDraftBody,
        recipientEmail: email,
        status: 'Sent via Email',
      });

      showToast('success', 'Email Client Opened', 'Email draft loaded into mail app.');
      setBuilderVisible(false);
      refreshLogs();
    } catch (e) {
      showToast('error', 'Launch Failed', 'Could not open mail app.');
    }
  };

  // OPEN DEDICATED CHANNEL TIMELINE
  const handleOpenChannelTimeline = (channel: 'WhatsApp' | 'Email' | 'Call') => {
    setActiveChannelTimeline(channel);
    setChannelSearchQuery('');
    setStatusFilter('All');
  };

  // CHANNEL SPECIFIC LOGS COMPUTATION
  const waLogs = logs.filter((l) => l.type === 'WhatsApp');
  const emailLogs = logs.filter((l) => l.type === 'Email');
  const callLogs = logs.filter((l) => l.type === 'Phone Call' || l.type === 'Call');

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const waLastTime = waLogs.length > 0 ? getRelativeTime(waLogs[0].timestamp || waLogs[0].createdAt) : 'Never';
  const emailLastTime = emailLogs.length > 0 ? getRelativeTime(emailLogs[0].timestamp || emailLogs[0].createdAt) : 'Never';
  const callLastTime = callLogs.length > 0 ? getRelativeTime(callLogs[0].timestamp || callLogs[0].createdAt) : 'Never';

  // FILTERED MODAL LOGS
  const currentChannelLogs = activeChannelTimeline === 'WhatsApp'
    ? waLogs
    : activeChannelTimeline === 'Email'
    ? emailLogs
    : callLogs;

  const filteredChannelLogs = currentChannelLogs.filter((log) => {
    const matchesSearch = channelSearchQuery.trim() === '' ||
      (log.reason && log.reason.toLowerCase().includes(channelSearchQuery.toLowerCase())) ||
      (log.senderName && log.senderName.toLowerCase().includes(channelSearchQuery.toLowerCase())) ||
      (log.summary && log.summary.toLowerCase().includes(channelSearchQuery.toLowerCase())) ||
      (log.body && log.body.toLowerCase().includes(channelSearchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' ||
      (statusFilter === 'Sent' && (log.status?.includes('Sent') || log.status?.includes('Completed'))) ||
      (statusFilter === 'Delivered' && log.status?.includes('Delivered')) ||
      (statusFilter === 'Failed' && log.status?.includes('Failed'));

    return matchesSearch && matchesStatus;
  });

  const filteredPurposes = COMMUNICATION_PURPOSES.filter((p) =>
    p.toLowerCase().includes(purposeSearch.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30, gap: 16 }}>
      {/* ==========================================
          1. CLIENT INFORMATION CARD (PURE INFO ONLY)
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.clientCardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{clientName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clientTitleName, { color: theme.textPrimary }]}>{clientName}</Text>
            <Text style={[styles.clientSubtitleRole, { color: theme.textSecondary }]}>{tTool(activeLang, 'clientConnect.contactRecord', 'Client Contact Record')}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(activeLang, 'clientConnect.mobile', 'Mobile:')}</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(activeLang, 'clientConnect.email', 'Email:')}</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="globe-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(activeLang, 'clientConnect.language', 'Language:')}</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{language}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(activeLang, 'clientConnect.leadAdvocate', 'Lead Advocate:')}</Text>
            <Text style={[styles.infoValue, { color: '#C8A34D' }]}>{leadAdvocate}</Text>
          </View>
        </View>
      </View>

      {/* ==========================================
          2. COMMUNICATION ACTIONS (CALL, WHATSAPP, EMAIL)
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(activeLang, 'clientConnect.commActions', 'Communication Actions')}</Text>

        <View style={styles.actionsRow}>
          {/* CALL BUTTON */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            activeOpacity={0.8}
            onPress={handleDirectCall}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>{tTool(activeLang, 'clientConnect.call', 'Call')}</Text>
          </TouchableOpacity>

          {/* WHATSAPP BUTTON */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
            activeOpacity={0.8}
            onPress={() => handleOpenBuilder('WhatsApp')}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>{tTool(activeLang, 'clientConnect.whatsapp', 'WhatsApp')}</Text>
          </TouchableOpacity>

          {/* EMAIL BUTTON */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
            activeOpacity={0.8}
            onPress={() => handleOpenBuilder('Email')}
          >
            <Ionicons name="mail" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>{tTool(activeLang, 'clientConnect.actionEmail', 'Email')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==========================================
          3. THREE DEDICATED CHANNEL CARDS
      ========================================== */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(activeLang, 'clientConnect.commTimeline', 'Communication Timeline')}</Text>

        <View style={{ gap: 10 }}>
          {/* CARD 1: WHATSAPP TIMELINE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.channelCrmCard, { backgroundColor: isDark ? '#1F1F1F' : '#F9FAFB', borderColor: isDark ? '#2D2D2D' : '#E5E7EB' }]}
            onPress={() => handleOpenChannelTimeline('WhatsApp')}
          >
            <View style={styles.channelCrmLeft}>
              <View style={[styles.channelIconAvatar, { backgroundColor: isDark ? '#1B2E23' : '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelCardTitle, { color: theme.textPrimary }]}>💬 {tTool(activeLang, 'clientConnect.whatsappTimeline', 'WhatsApp Timeline')}</Text>
                <Text style={[styles.channelCardMeta, { color: theme.textSecondary }]}>
                  {waLogs.length} Messages • Last: {waLastTime}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* CARD 2: EMAIL TIMELINE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.channelCrmCard, { backgroundColor: isDark ? '#1F1F1F' : '#F9FAFB', borderColor: isDark ? '#2D2D2D' : '#E5E7EB' }]}
            onPress={() => handleOpenChannelTimeline('Email')}
          >
            <View style={styles.channelCrmLeft}>
              <View style={[styles.channelIconAvatar, { backgroundColor: isDark ? '#1C2838' : '#EFF6FF' }]}>
                <Ionicons name="mail" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelCardTitle, { color: theme.textPrimary }]}>📧 Email Timeline</Text>
                <Text style={[styles.channelCardMeta, { color: theme.textSecondary }]}>
                  {emailLogs.length} Emails • Last: {emailLastTime}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* CARD 3: CALL HISTORY TIMELINE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.channelCrmCard, { backgroundColor: isDark ? '#1F1F1F' : '#F9FAFB', borderColor: isDark ? '#2D2D2D' : '#E5E7EB' }]}
            onPress={() => handleOpenChannelTimeline('Call')}
          >
            <View style={styles.channelCrmLeft}>
              <View style={[styles.channelIconAvatar, { backgroundColor: isDark ? '#172E26' : '#ECFDF5' }]}>
                <Ionicons name="call" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelCardTitle, { color: theme.textPrimary }]}>📞 Call History Timeline</Text>
                <Text style={[styles.channelCardMeta, { color: theme.textSecondary }]}>
                  {callLogs.length} Calls • Last: {callLastTime}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ==========================================
          DEDICATED CHANNEL TIMELINE MODAL
      ========================================== */}
      <Modal visible={!!activeChannelTimeline} transparent animationType="slide" onRequestClose={() => setActiveChannelTimeline(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.channelModalCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF' }]}>
            {activeChannelTimeline && (
              <View style={{ flex: 1 }}>
                {/* HEADER */}
                <View style={styles.channelModalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={activeChannelTimeline === 'WhatsApp' ? 'logo-whatsapp' : activeChannelTimeline === 'Email' ? 'mail' : 'call'}
                      size={22}
                      color={activeChannelTimeline === 'WhatsApp' ? '#25D366' : activeChannelTimeline === 'Email' ? '#3B82F6' : '#10B981'}
                    />
                    <Text style={[styles.channelModalTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      {activeChannelTimeline} History ({currentChannelLogs.length})
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveChannelTimeline(null)}>
                    <Ionicons name="close-circle-outline" size={26} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>

                {/* INDEPENDENT CHANNEL SEARCH BAR */}
                <View style={[styles.channelSearchBox, { backgroundColor: isDark ? '#242424' : '#F3F4F6' }]}>
                  <Ionicons name="search" size={16} color="#9CA3AF" />
                  <RNTextInput
                    style={[styles.channelSearchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                    placeholder={`Search ${activeChannelTimeline} history...`}
                    placeholderTextColor="#9CA3AF"
                    value={channelSearchQuery}
                    onChangeText={setChannelSearchQuery}
                  />
                  {channelSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setChannelSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* STATUS FILTER CHIPS */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, height: 38, marginBottom: 8 }}
                  contentContainerStyle={{ gap: 6, alignItems: 'center' }}
                >
                  {(['All', 'Sent', 'Delivered', 'Failed'] as const).map((sf) => (
                    <TouchableOpacity
                      key={sf}
                      style={[
                        styles.statusChip,
                        statusFilter === sf && styles.statusChipActive,
                        { backgroundColor: statusFilter === sf ? '#C8A34D' : isDark ? '#242424' : '#F3F4F6' },
                      ]}
                      onPress={() => setStatusFilter(sf)}
                    >
                      <Text style={[styles.statusChipText, { color: statusFilter === sf ? '#000000' : isDark ? '#E5E7EB' : '#374151' }]}>
                        {sf}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* CHANNEL LOGS LIST */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
                  {filteredChannelLogs.length === 0 ? (
                    <View style={styles.emptyChannelBox}>
                      <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                      <Text style={[styles.emptyChannelText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        No {activeChannelTimeline} records match your search filter.
                      </Text>
                    </View>
                  ) : (
                    filteredChannelLogs.map((log, idx) => (
                      <TouchableOpacity
                        key={log._id || idx}
                        activeOpacity={0.7}
                        style={[styles.channelLogCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF', borderColor: isDark ? '#2D2D2D' : '#E5E7EB' }]}
                        onPress={() => setSelectedRecord(log)}
                      >
                        <View style={styles.logCardHeader}>
                          <Text style={[styles.logReasonTitle, { color: isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={1}>
                            {log.reason ? `Purpose: ${log.reason}` : log.summary || `${log.type} Log`}
                          </Text>
                          <Text style={[styles.logTimeMeta, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>

                        <Text style={[styles.logSenderText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          Sent by <Text style={{ fontWeight: 'bold', color: isDark ? '#E5E7EB' : '#1F2937' }}>{log.senderName || 'Advocate'}</Text>
                        </Text>

                        <View style={styles.logCardFooter}>
                          <Text style={[styles.logStatusBadgeCompact, { color: '#059669', backgroundColor: isDark ? '#1F241E' : '#ECFDF5' }]}>
                            [{log.status || 'Completed'}]
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* COMMUNICATION RECORD DETAIL MODAL */}
      <Modal visible={!!selectedRecord} transparent animationType="slide" onRequestClose={() => setSelectedRecord(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.recordModalCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
            {selectedRecord && (
              <ScrollView contentContainerStyle={{ gap: 14 }}>
                <View style={styles.recordHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="information-circle" size={22} color="#C8A34D" />
                    <Text style={[styles.recordTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      {tTool(activeLang, 'clientConnect.commRecordTitle', 'Communication Record')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRecord(null)}>
                    <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.recordDetailGrid, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Channel:</Text>
                    <Text style={[styles.recordValue, { color: '#3B82F6' }]}>{selectedRecord.type}</Text>
                  </View>

                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Advocate:</Text>
                    <Text style={[styles.recordValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      {selectedRecord.senderName || 'Advocate'}
                    </Text>
                  </View>

                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Client:</Text>
                    <Text style={[styles.recordValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>{clientName}</Text>
                  </View>

                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Purpose:</Text>
                    <Text style={[styles.recordValue, { color: '#C8A34D' }]}>
                      {selectedRecord.reason || 'Case Update'}
                    </Text>
                  </View>

                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Timestamp:</Text>
                    <Text style={[styles.recordValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      {new Date(selectedRecord.timestamp || selectedRecord.createdAt || Date.now()).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Status:</Text>
                    <Text style={[styles.recordValue, { color: '#059669', fontWeight: 'bold' }]}>
                      {selectedRecord.status || 'Sent'}
                    </Text>
                  </View>
                </View>

                {selectedRecord.body !== '' && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      Message Content:
                    </Text>
                    <View style={[styles.recordBodyBox, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                      <Text style={[styles.recordBodyText, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                        {selectedRecord.body}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.recordCloseBtn, { backgroundColor: '#C8A34D' }]}
                  onPress={() => setSelectedRecord(null)}
                >
                  <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 13 }}>{tTool(activeLang, 'clientConnect.closeRecord', 'Close Record')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ==========================================
          AI COMMUNICATION BUILDER MODAL
      ========================================== */}
      <Modal visible={builderVisible} transparent animationType="slide" onRequestClose={() => setBuilderVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.builderModalCard, { backgroundColor: isDark ? '#191919' : '#FFFFFF' }]}>
            {/* BUILDER HEADER */}
            <View style={styles.builderHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={activeChannel === 'WhatsApp' ? 'logo-whatsapp' : 'mail'} size={22} color={activeChannel === 'WhatsApp' ? '#25D366' : '#3B82F6'} />
                <Text style={[styles.builderTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  {activeChannel === 'WhatsApp' ? tTool(activeLang, 'clientConnect.builderWhatsapp', 'AI WhatsApp Builder') : tTool(activeLang, 'clientConnect.builderEmail', 'AI Email Builder')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBuilderVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {step === 'builder' ? (
              <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                {/* STEP 1: PURPOSE SELECTOR */}
                <View style={styles.stepBlock}>
                  <Text style={[styles.stepLabelText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    {tTool(activeLang, 'clientConnect.step1Title', 'Step 1: Choose Communication Purpose')}
                  </Text>
                  <RNTextInput
                    style={[styles.searchInputBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6', color: isDark ? '#FFFFFF' : '#111827' }]}
                    placeholder={tTool(activeLang, 'clientConnect.searchPurposePlaceholder', 'Search purpose...')}
                    placeholderTextColor="#9CA3AF"
                    value={purposeSearch}
                    onChangeText={setPurposeSearch}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6 }}>
                    {filteredPurposes.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.purposeChip,
                          selectedPurpose === p && styles.purposeChipActive,
                          { backgroundColor: selectedPurpose === p ? '#C8A34D' : isDark ? '#262626' : '#F3F4F6' },
                        ]}
                        onPress={() => setSelectedPurpose(p)}
                      >
                        <Text
                          style={[
                            styles.purposeChipText,
                            { color: selectedPurpose === p ? '#000000' : isDark ? '#E5E7EB' : '#374151' },
                          ]}
                        >
                          {tTool(activeLang, 'purpose.' + p, p)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* STEP 2: ADVOCATE INSTRUCTIONS */}
                <View style={styles.stepBlock}>
                  <Text style={[styles.stepLabelText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    {tTool(activeLang, 'clientConnect.step2Title', 'Step 2: Optional Advocate Instructions')}
                  </Text>
                  <RNTextInput
                    style={[styles.multilineInput, { backgroundColor: isDark ? '#262626' : '#F9FAFB', color: isDark ? '#FFFFFF' : '#111827' }]}
                    placeholder={tTool(activeLang, 'clientConnect.instructionsPlaceholder', 'e.g. Mention next hearing on 28 July. Tell client to carry Aadhaar and signed affidavit...')}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    value={advocateInstructions}
                    onChangeText={setAdvocateInstructions}
                  />
                </View>

                {/* STEP 3: COMMUNICATION STYLE */}
                <View style={styles.stepBlock}>
                  <Text style={[styles.stepLabelText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    {tTool(activeLang, 'clientConnect.step3Title', 'Step 3: Communication Style & Tone')}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {COMMUNICATION_STYLES.map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.styleChip,
                          selectedStyle === st && styles.styleChipActive,
                          { backgroundColor: selectedStyle === st ? '#3B82F6' : isDark ? '#262626' : '#F3F4F6' },
                        ]}
                        onPress={() => setSelectedStyle(st)}
                      >
                        <Text
                          style={[
                            styles.styleChipText,
                            { color: selectedStyle === st ? '#FFFFFF' : isDark ? '#E5E7EB' : '#374151' },
                          ]}
                        >
                          {tTool(activeLang, 'style.' + st, st)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* STEP 4: ACTION BUTTONS */}
                <View style={{ gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.generateBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleGenerateAIDraft}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#000000" />
                        <Text style={styles.generateBtnText}>{tTool(activeLang, 'clientConnect.generateAiDraftBtn', 'Generate AI Draft')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.manualBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                    onPress={handleOpenManualMode}
                  >
                    <Ionicons name="create-outline" size={18} color={isDark ? '#E5E7EB' : '#374151'} />
                    <Text style={[styles.manualBtnText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                      {tTool(activeLang, 'clientConnect.writeManuallyBtn', 'Write Manually')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* STEP: DRAFT PREVIEW & EDITING */
              <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                {activeChannel === 'Email' && (
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.previewLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{tTool(activeLang, 'clientConnect.subjectLine', 'Subject Line:')}</Text>
                    {isEditingDraft ? (
                      <RNTextInput
                        style={[styles.subjectInput, { backgroundColor: isDark ? '#262626' : '#F3F4F6', color: isDark ? '#FFFFFF' : '#111827' }]}
                        value={aiDraftSubject}
                        onChangeText={setAiDraftSubject}
                      />
                    ) : (
                      <Text style={[styles.subjectDisplay, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {aiDraftSubject}
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.previewLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      {tTool(activeLang, 'clientConnect.messageBody', 'Message Body (With Dynamic Signature):')}
                    </Text>
                    <TouchableOpacity onPress={() => setIsEditingDraft(!isEditingDraft)}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#C8A34D' }}>
                        {isEditingDraft ? tTool(activeLang, 'clientConnect.doneEditing', 'Done Editing') : '✏️ ' + tTool(activeLang, 'clientConnect.editText', 'Edit Text')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isEditingDraft ? (
                    <RNTextInput
                      style={[styles.previewBodyInput, { backgroundColor: isDark ? '#262626' : '#F9FAFB', color: isDark ? '#FFFFFF' : '#111827' }]}
                      multiline
                      numberOfLines={10}
                      value={aiDraftBody}
                      onChangeText={setAiDraftBody}
                    />
                  ) : (
                    <View style={[styles.previewBodyBox, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                      <Text style={[styles.previewBodyText, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                        {aiDraftBody}
                      </Text>
                    </View>
                  )}
                </View>

                {/* PREVIEW TOOLBAR BUTTONS */}
                <View style={styles.previewToolbarRow}>
                  <TouchableOpacity
                    style={[styles.toolbarBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                    onPress={() => {
                      Clipboard.setString(aiDraftBody);
                      showToast('success', 'Copied', 'Message copied to clipboard.');
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                    <Text style={[styles.toolbarBtnText, { color: isDark ? '#E5E7EB' : '#374151' }]}>{tTool(activeLang, 'clientConnect.copyBtn', 'Copy')}</Text>
                  </TouchableOpacity>

                  {!isManualMode && (
                    <TouchableOpacity
                      style={[styles.toolbarBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                      onPress={handleGenerateAIDraft}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#C8A34D" />
                      <Text style={[styles.toolbarBtnText, { color: '#C8A34D' }]}>{tTool(activeLang, 'clientConnect.regenerateBtn', 'Regenerate')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.toolbarBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                    onPress={() => setStep('builder')}
                  >
                    <Ionicons name="arrow-back-outline" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                    <Text style={[styles.toolbarBtnText, { color: isDark ? '#E5E7EB' : '#374151' }]}>{tTool(currentOutputLang, 'clientConnect.backBtn', 'Back')}</Text>
                  </TouchableOpacity>
                </View>

                {/* APPROVE & SEND BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.approveSendBtn,
                    { backgroundColor: activeChannel === 'WhatsApp' ? '#25D366' : '#3B82F6' },
                  ]}
                  onPress={activeChannel === 'WhatsApp' ? handleApproveAndSendWhatsApp : handleApproveAndSendEmail}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.approveSendBtnText}>
                    Approve & Open {activeChannel}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C8A34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  clientTitleName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  clientSubtitleRole: {
    fontSize: 11,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 90,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // THREE DEDICATED CHANNEL CARDS STYLES
  channelCrmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  channelCrmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  channelIconAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCardTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  channelCardMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  // CHANNEL MODAL STYLES
  channelModalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    height: '88%',
  },
  channelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  channelModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  channelSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  channelSearchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  statusChip: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 0,
  },
  statusChipActive: {
    backgroundColor: '#C8A34D',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyChannelBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyChannelText: {
    fontSize: 12,
  },
  channelLogCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logReasonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 8,
  },
  logTimeMeta: {
    fontSize: 11,
  },
  logSenderText: {
    fontSize: 11,
  },
  logCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  logStatusBadgeCompact: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // RECORD MODAL STYLES
  recordModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '85%',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  recordDetailGrid: {
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordBodyBox: {
    padding: 12,
    borderRadius: 10,
  },
  recordBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  recordCloseBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  // BUILDER MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  builderModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  builderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  builderTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  stepBlock: {
    gap: 6,
  },
  stepLabelText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  searchInputBox: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  purposeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  purposeChipActive: {
    backgroundColor: '#C8A34D',
  },
  purposeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  multilineInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    textAlignVertical: 'top',
    height: 70,
  },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  styleChipActive: {
    backgroundColor: '#3B82F6',
  },
  styleChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  generateBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  generateBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  manualBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manualBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subjectInput: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  subjectDisplay: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  previewBodyInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    textAlignVertical: 'top',
    height: 160,
  },
  previewBodyBox: {
    borderRadius: 10,
    padding: 12,
  },
  previewBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  previewToolbarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  approveSendBtn: {
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  approveSendBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
