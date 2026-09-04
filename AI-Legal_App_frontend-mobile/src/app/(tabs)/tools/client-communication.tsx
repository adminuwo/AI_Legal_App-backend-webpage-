import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { PageHeader } from '@/components/ui';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { Shadows } from '@/theme';
import { apiClient } from '@/api/client';
import { formatWhatsAppNumber, cleanMarkdown } from '@/utils/phone';
import { useUserStore } from '@/store/user';

interface CommunicationLog {
  _id?: string;
  id?: string;
  type: 'Phone Call' | 'WhatsApp' | 'Email';
  reason?: string;
  mode?: string;
  summary: string;
  recipient?: string;
  timestamp: string;
}

export default function ClientCommunicationScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { activeWorkspace, members: firmMembers } = useWorkspaceContext();

  // State
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_client-communication');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const profile = useUserStore((s) => s.profile);
  const profileName = profile?.personalizations?.advocateProfile?.fullName || profile?.name;
  const userProfileAdvocate = profileName
    ? (profileName.trim().startsWith('Adv.') ? profileName.trim() : `Adv. ${profileName.trim()}`)
    : (profile?.email ? `Adv. ${profile.email.split('@')[0].charAt(0).toUpperCase()}${profile.email.split('@')[0].slice(1)}` : 'Adv. Advocate');

  const [searchQuery, setSearchQuery] = useState('');

  // Selected Case Communication Workspace Modal
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Recipient Mode: 'entire' | 'individual'
  const [recipientMode, setRecipientMode] = useState<'entire' | 'individual'>('entire');
  const [selectedRecipientNames, setSelectedRecipientNames] = useState<string[]>([]);

  // AI Prompting
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState('Hearing Reminder');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email' | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Communication History
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);

  // 1. Fetch Cases belonging strictly to the Active Law Firm Workspace
  useEffect(() => {
    fetchFirmCases();
  }, [activeWorkspace]);

  const fetchFirmCases = async () => {
    try {
      setIsLoadingCases(true);
      const wsId = activeWorkspace?.id || (activeWorkspace as any)?._id;
      const endpoint = wsId ? `/projects?workspaceId=${wsId}` : '/projects';
      const res = await apiClient.get<any>(endpoint);
      const resData = res as any;
      const list = resData.projects || resData.data || (Array.isArray(resData) ? resData : []);
      setCases(list);
    } catch (err: any) {
      console.error('Failed to fetch cases for communication hub:', err);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // 2. Filter Cases by search query
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter((c) => {
      const name = (c.name || c.title || '').toLowerCase();
      const client = (c.clientName || c.client || '').toLowerCase();
      const advocate = (c.leadAdvocate || '').toLowerCase();
      const phone = (c.clientPhone || c.clientMobileNumber || '').toLowerCase();
      const email = (c.clientEmail || '').toLowerCase();
      return name.includes(q) || client.includes(q) || advocate.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [cases, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let callsCount = 0;
    let whatsappCount = 0;
    let emailCount = 0;
    let totalLogs = 0;

    cases.forEach((c) => {
      if (Array.isArray(c.communicationLogs)) {
        c.communicationLogs.forEach((log: any) => {
          totalLogs++;
          if (log.type === 'Phone Call' || log.type === 'Call') callsCount++;
          else if (log.type === 'WhatsApp') whatsappCount++;
          else if (log.type === 'Email') emailCount++;
        });
      }
    });

    return {
      messagesToday: whatsappCount,
      emailsSent: emailCount,
      callsMade: callsCount,
      pendingFollowups: cases.filter((c) => !c.communicationLogs || c.communicationLogs.length === 0).length,
    };
  }, [cases]);

  // Handle Open Case Communication Workspace
  const handleOpenCaseWorkspace = (c: any) => {
    setSelectedCase(c);
    setIsWorkspaceOpen(true);
    setRecipientMode('entire');
    setGeneratedDraft('');
    setGeneratedSubject('');
    setActiveChannel(null);

    // Default recipient names to case team
    const team = c.teamMembers || [];
    const memberNames = team.map((m: any) => (typeof m === 'string' ? m : m.name));
    setSelectedRecipientNames(memberNames);

    // Set logs for case
    setCommLogs(c.communicationLogs || []);
  };

  // Toggle individual recipient checkbox
  const toggleRecipient = (name: string) => {
    if (selectedRecipientNames.includes(name)) {
      setSelectedRecipientNames(selectedRecipientNames.filter((n) => n !== name));
    } else {
      setSelectedRecipientNames([...selectedRecipientNames, name]);
    }
  };

  // Helper to resolve phone number for selected recipient or case
  const getResolvedPhone = (phoneNum?: string) => {
    if (phoneNum && phoneNum.trim()) return phoneNum.trim();
    if (selectedCase) {
      if (recipientMode === 'individual' && selectedRecipientNames.length > 0) {
        const selName = selectedRecipientNames[0];
        const team = selectedCase.teamMembers || [];
        const match = team.find((m: any) => (typeof m === 'object' ? (m.name || m.fullName) : m) === selName);
        if (match && typeof match === 'object' && (match.phone || match.mobileNumber)) {
          return (match.phone || match.mobileNumber).trim();
        }
      }
      return (selectedCase.clientMobileNumber || selectedCase.clientPhone || selectedCase.clientWhatsAppNumber || '9876543210').trim();
    }
    return '9876543210';
  };

  // Helper to resolve email for selected recipient or case
  const getResolvedEmail = () => {
    if (selectedCase) {
      if (recipientMode === 'individual' && selectedRecipientNames.length > 0) {
        const selName = selectedRecipientNames[0];
        const team = selectedCase.teamMembers || [];
        const match = team.find((m: any) => (typeof m === 'object' ? (m.name || m.fullName) : m) === selName);
        if (match && typeof match === 'object' && match.email) {
          return match.email.trim();
        }
      }
      return (selectedCase.clientEmail || 'advocate@firm.com').trim();
    }
    return 'advocate@firm.com';
  };

  // DIRECT ACTION: Phone Call (Native Dialer)
  const handleDirectPhoneCall = async (phoneNum?: string) => {
    if (!selectedCase) return;
    const rawPhone = getResolvedPhone(phoneNum);
    const cleanPhone = rawPhone.replace(/[^+\d]/g, '');
    const url = `tel:${cleanPhone || '9876543210'}`;
    const targetName = recipientMode === 'individual' && selectedRecipientNames.length > 0
      ? selectedRecipientNames.join(', ')
      : (selectedCase.clientName || 'Client');

    try {
      await Linking.openURL(url);
      await logCommunication('Phone Call', `Direct Phone Call to ${targetName} (${cleanPhone})`);
      showToast('success', 'Call Initiated', `Opening native phone dialer for ${targetName}...`);
    } catch (err) {
      console.error('Call error:', err);
      showToast('error', 'Dialer Error', 'Could not open native phone dialer.');
    }
  };

  // AI DRAFT GENERATOR: WhatsApp / Email
  const handleGenerateAiDraft = async (channel: 'whatsapp' | 'email', promptText?: string) => {
    if (!selectedCase) return;

    setActiveChannel(channel);
    setIsGeneratingDraft(true);
    setIsEditingDraft(false);

    const prompt = promptText || customPrompt || selectedPresetPrompt;
    const recipientLabel = recipientMode === 'individual' && selectedRecipientNames.length > 0
      ? selectedRecipientNames.join(', ')
      : (selectedCase.clientName || 'Client');
    const caseName = selectedCase.name || selectedCase.title || 'Legal Matter';
    const court = selectedCase.courtName || selectedCase.court || 'District Court';
    const hearingDate = selectedCase.nextHearingDate || selectedCase.hearingDate || 'Upcoming Date';
    const leadAdv = selectedCase.leadAdvocate || 'Lead Advocate';

    const raw = (outputLanguage || '').toLowerCase();
    const isTelugu = raw.includes('telugu') || raw.includes('te');
    const isHindi = raw.includes('hindi') || raw.includes('hinglish') || raw.includes('hi') || raw.includes('bilingual');
    const isMarathi = raw.includes('marathi') || raw.includes('mr');
    const isGujarati = raw.includes('gujarati') || raw.includes('gu');
    const isBengali = raw.includes('bengali') || raw.includes('bn');
    const isMalayalam = raw.includes('malayalam') || raw.includes('ml');
    const isTamil = raw.includes('tamil') || raw.includes('ta');
    const isUrdu = raw.includes('urdu') || raw.includes('ur');

    setTimeout(() => {
      setIsGeneratingDraft(false);

      if (channel === 'whatsapp') {
        setGeneratedSubject('');
        if (isTelugu) {
          setGeneratedDraft(`నమస్కారం ${recipientLabel},

ఇది మీ కేస్ (${caseName}) కు సంబంధించిన అధికారిక సమాచారం.

📍 అదాలత్: ${court}
📅 తదుపరి విచారణ తేదీ: ${hearingDate}
👨‍⚖️ లీడ్ లాయర్: ${leadAdv}

గమనిక: ${prompt}

ఏవైనా ప్రశ్నలు ఉంటే దయచేసి మమ్మల్ని సంప్రదించండి.

భవదీయులు,
లా ఫర్మ్ వర్క్‌స్పేస్`);
        } else if (isHindi) {
          setGeneratedDraft(`नमस्ते ${recipientLabel},

यह आपके केस (${caseName}) के संबंध में एक आधिकारिक अपडेट है।

📍 अदालत: ${court}
📅 अगली सुनवाई की तारीख: ${hearingDate}
👨‍⚖️ मुख्य अधिवक्ता: ${leadAdv}

विवरण: ${prompt}

यदि आपके कोई प्रश्न हैं तो कृपया संपर्क करें।

सदर,
लॉ फर्म वर्कस्पेस`);
        } else if (isMarathi) {
          setGeneratedDraft(`नमस्कार ${recipientLabel},

हे तुमच्या केस (${caseName}) संदर्भातील अधिकृत अपडेट आहे.

📍 न्यायालय: ${court}
📅 पुढील सुनावणी तारीख: ${hearingDate}
👨‍⚖️ मुख्य वकील: ${leadAdv}

टीप: ${prompt}

काही प्रश्न असल्यास कृपया संपर्क साधा.

आपला,
लॉ फर्म वर्कस्पेस`);
        } else if (isGujarati) {
          setGeneratedDraft(`નમસ્તે ${recipientLabel},

આ તમારા કેસ (${caseName}) સંબંધિત સત્તાવાર અપડેટ છે.

📍 અદાલત: ${court}
📅 આગામી સુનાવણી તારીખ: ${hearingDate}
👨‍⚖️ મુખ્ય વકીલ: ${leadAdv}

નોંધ: ${prompt}

જો કોઈ પ્રશ્નો હોય તો સંપર્ક કરો.

આભાર,
લો ફર્મ વર્કસ્પેસ`);
        } else if (isBengali) {
          setGeneratedDraft(`নমস্কার ${recipientLabel},

এটি আপনার কেস (${caseName}) সংক্রান্ত একটি সরকারি আপডেট।

📍 আদালত: ${court}
📅 পরবর্তী শুনানির তারিখ: ${hearingDate}
👨‍⚖️ প্রধান আইনজীবী: ${leadAdv}

নোট: ${prompt}

কোন প্রশ্ন থাকলে যোগাযোগ করুন।

ধন্যবাদান্তে,
ল ফার্ম ওয়ার্কস্পেস`);
        } else if (isMalayalam) {
          setGeneratedDraft(`നമസ്കാരം ${recipientLabel},

ഇത് നിങ്ങളുടെ കേസ് (${caseName}) സംബന്ധിച്ച ഔദ്യോഗിക വിവരമാണ്.

📍 കോടതി: ${court}
📅 അടുത്ത വിചാരണ തീയതി: ${hearingDate}
👨‍⚖️ പ്രധാന അഭിഭാഷകൻ: ${leadAdv}

കുറിപ്പ്: ${prompt}

എന്തെങ്കിലും ചോദ്യങ്ങളുണ്ടെങ്കിൽ ബന്ധപ്പെടുക.

ആദരവോടെ,
ലോ ഫേം വർക്ക്സ്പേസ്`);
        } else if (isTamil) {
          setGeneratedDraft(`வணக்கம் ${recipientLabel},

இது உங்கள் வழக்கு (${caseName}) பற்றிய உத்தியோகபூர்வ தகவலாகும்.

📍 நீதிமன்றம்: ${court}
📅 அடுத்த விசாரணை தேதி: ${hearingDate}
👨‍⚖️ முதன்மை வழக்கறிஞர்: ${leadAdv}

குறிப்பு: ${prompt}

கேள்விகள் இருந்தால் தொடர்பு கொள்ளவும்.

இவண்,
சட்ட நிறுவனம்`);
        } else if (isUrdu) {
          setGeneratedDraft(`محترم ${recipientLabel}،

یہ آپ کے کیس (${caseName}) کے بارے میں اہم سرکاری اطلاع ہے۔

📍 عدالت: ${court}
📅 اگلی سماعت کی تاریخ: ${hearingDate}
👨‍⚖️ وکیل: ${leadAdv}

نوٹ: ${prompt}

کسی سوال کی صورت میں رابطہ کریں۔

نیازمند,
لاء فرم ورک اسپیس`);
        } else {
          setGeneratedDraft(
            `Hello ${recipientLabel},

This is an official case update regarding ${caseName}.

📍 Court: ${court}
📅 Next Hearing Date: ${hearingDate}
👨‍⚖️ Lead Advocate: ${leadAdv}

Note: ${prompt}

Please reach out if you have any questions.

Regards,
Law Firm Workspace`
          );
        }
      } else {
        if (isTelugu) {
          setGeneratedSubject(`కేస్ అప్‌డేట్: ${caseName} - విచారణ నోటీస్`);
          setGeneratedDraft(`గౌరవనీయులైన ${recipientLabel},

మీ కొనసాగుతున్న కేస్ (${caseName}) కి సంబంధించిన అధికారిక సమాచారం.

ప్రధాన వివరాలు:
• కోర్టు: ${court}
• విచారణ తేదీ: ${hearingDate}
• లీడ్ అడ్వకేట్: ${leadAdv}

సందర్భం: ${prompt}

దయచేసి విచారణ తేదీకి ముందు అవసరమైన ఆధారాలు మరియు అసలు పత్రాలను సిద్ధం చేయండి.

భవదీయులు,
${leadAdv}
లా ఫర్మ్ వర్క్‌స్పేస్`);
        } else if (isHindi) {
          setGeneratedSubject(`केस अपडेट: ${caseName} - सुनवाई नोटिस`);
          setGeneratedDraft(`प्रिय ${recipientLabel},

आपके चल रहे केस (${caseName}) के संबंध में आधिकारिक सूचना।

मुख्य विवरण:
• अदालत: ${court}
• निर्धारित सुनवाई: ${hearingDate}
• मुख्य अधिवक्ता: ${leadAdv}

संदर्भ: ${prompt}

कृपया सुनवाई की तारीख से पहले सभी आवश्यक साक्ष्य और मूल दस्तावेज तैयार रखें।

सदर,
${leadAdv}
लॉ फर्म वर्कस्पेस`);
        } else if (isUrdu) {
          setGeneratedSubject(`کیس اپ ڈیٹ: ${caseName} - سماعت کا نوٹس`);
          setGeneratedDraft(`محترم ${recipientLabel}،

آپ کے جاری کیس (${caseName}) کے بارے میں اہم اطلاع۔

اہم تفصیلات:
• عدالت: ${court}
• مقررہ سماعت: ${hearingDate}
• وکیل: ${leadAdv}

سیاق و سباق: ${prompt}

براہ کرم سماعت کی تاریخ سے پہلے تمام ضروری دستاویزات تیار رکھیں۔

نیازمند,
${leadAdv}
لاء فرم ورک اسپیس`);
        } else {
          setGeneratedSubject(`Legal Matter Update: ${caseName} - Hearing Notice`);
          setGeneratedDraft(
            `Dear ${recipientLabel},

We hope this email finds you well.

This is an official communication regarding your ongoing case: ${caseName}.

Key Details:
• Court: ${court}
• Scheduled Hearing: ${hearingDate}
• Lead Advocate: ${leadAdv}

Communication Context:
${prompt}

Kindly prepare all necessary evidence and original documents prior to the hearing date.

Sincerely,
${leadAdv}
Law Firm Workspace`
          );
        }
      }
      showToast('success', 'AI Draft Generated', `Professional ${channel.toUpperCase()} draft generated for ${recipientLabel}.`);
    }, 400);
  };
// OPEN NATIVE WHATSAPP
  const handleOpenNativeWhatsApp = async () => {
    if (!selectedCase || !generatedDraft) return;
    const rawPhone = getResolvedPhone();
    const cleanPhone = formatWhatsAppNumber(rawPhone) || '919876543210';
    const textParam = encodeURIComponent(generatedDraft);
    const url = `whatsapp://send?phone=${cleanPhone}&text=${textParam}`;

    try {
      await Linking.openURL(url);
      await logCommunication('WhatsApp', generatedDraft);
      showToast('success', 'WhatsApp Opened', 'Draft loaded in WhatsApp. Press send to deliver.');
    } catch (e) {
      const webUrl = `https://wa.me/${cleanPhone}?text=${textParam}`;
      Linking.openURL(webUrl);
      await logCommunication('WhatsApp', generatedDraft);
      showToast('success', 'WhatsApp Web Opened', 'Draft loaded in browser WhatsApp.');
    }
  };

  // OPEN NATIVE EMAIL
  const handleOpenNativeEmail = async () => {
    if (!selectedCase || !generatedDraft) return;
    const email = getResolvedEmail();
    const subject = encodeURIComponent(generatedSubject || `Case Update: ${selectedCase.name}`);
    const body = encodeURIComponent(generatedDraft);

    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(url);
      await logCommunication('Email', generatedDraft);
      showToast('success', 'Email Client Opened', 'Pre-filled email opened in native mail app.');
    } catch (e) {
      showToast('error', 'Email App Error', 'Could not open native email app.');
    }
  };

  // Log communication back to API & local state
  const logCommunication = async (type: 'Phone Call' | 'WhatsApp' | 'Email', summary: string) => {
    if (!selectedCase) return;
    const caseId = selectedCase._id || selectedCase.id;
    const logItem: CommunicationLog = {
      type,
      summary: summary.substring(0, 100),
      timestamp: new Date().toISOString(),
    };

    setCommLogs((prev) => [logItem, ...prev]);

    try {
      await apiClient.post(`/projects/${caseId}/client-connect/log`, {
        type,
        summary: summary.substring(0, 100),
      });
      fetchFirmCases();
    } catch (err) {
      console.warn('Could not persist log:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title={tTool(outputLanguage, 'comm.title', 'AI Team Communication Hub')}
        subtitle={tTool(outputLanguage, 'comm.subtitle', 'Law Firm Workspace • Multi-Channel Intelligent CRM')}
        showBack={true}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <OutputLanguageSelector
            toolId="client-communication"
            selectedLanguage={outputLanguage}
            onLanguageChange={setOutputLanguage}
            containerStyle={{ marginBottom: 12, alignSelf: 'flex-end' }}
          />
          {/* SEARCH & FILTERS */}
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={tTool(outputLanguage, 'comm.searchPlaceholder', 'Search by client, case, advocate, phone, email...')}
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* DYNAMIC COMMUNICATION STATS */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statVal, { color: '#C8A34D' }]}>{stats.messagesToday}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.messagesToday', 'Messages Today')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statVal, { color: '#3B82F6' }]}>{stats.emailsSent}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.emailsSent', 'Emails Sent')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statVal, { color: '#10B981' }]}>{stats.callsMade}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.callsMade', 'Calls Made')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statVal, { color: '#F59E0B' }]}>{stats.pendingFollowups}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.pendingFollowups', 'Pending Follow-ups')}</Text>
            </View>
          </View>

          {/* LAW FIRM CASES COMMUNICATION ROSTER */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>
            FIRM CASES COMMUNICATION ROSTER ({filteredCases.length})
          </Text>

          {isLoadingCases ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#C8A34D" />
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
                Loading firm case workspace contacts...
              </Text>
            </View>
          ) : filteredCases.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="briefcase-outline" size={36} color="#C8A34D" />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary, marginTop: 8 }]}>
                No Cases Found in Workspace
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Create a case inside your Law Firm Workspace to manage client & team communications.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredCases.map((c) => {
                const teamCount = Array.isArray(c.teamMembers) ? c.teamMembers.length + 1 : 1;
                const hasLogs = Array.isArray(c.communicationLogs) && c.communicationLogs.length > 0;
                return (
                  <View
                    key={c._id || c.id}
                    style={[styles.caseCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}
                  >
                    <View style={styles.caseCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.caseTitle, { color: theme.textPrimary }]}>{c.name || c.title}</Text>
                        <Text style={[styles.clientName, { color: '#C8A34D' }]}>
                          👤 {tTool(outputLanguage, 'comm.client', 'Client:')} {c.clientName || 'Firm Client'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: hasLogs ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: hasLogs ? '#22C55E' : '#F59E0B' }}>
                          {hasLogs ? tTool(outputLanguage, 'comm.logged', 'Logged') : tTool(outputLanguage, 'comm.followupNeeded', 'Follow-up Needed')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.caseMetaRow}>
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        👨‍⚖️ {tTool(outputLanguage, 'comm.lead', 'Lead:')} {c.leadAdvocate || 'Firm Owner'}
                      </Text>
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        📅 {c.nextHearingDate || c.hearingDate || tTool(outputLanguage, 'comm.noHearing', 'No Hearing')}
                      </Text>
                    </View>

                    <View style={styles.caseFooter}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>
                        👥 {teamCount} {tTool(outputLanguage, 'comm.teamMembers', 'Team Members')}
                      </Text>
                      <TouchableOpacity
                        style={[styles.openWorkspaceBtn, { backgroundColor: '#C8A34D' }]}
                        onPress={() => handleOpenCaseWorkspace(c)}
                      >
                        <Text style={styles.openWorkspaceBtnText}>{tTool(outputLanguage, 'comm.openWorkspace', 'Communication Workspace →')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ==========================================
          CASE COMMUNICATION WORKSPACE MODAL
      ========================================== */}
      <Modal visible={isWorkspaceOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsWorkspaceOpen(false)}>
        {selectedCase && (
          <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            {/* MODAL HEADER */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setIsWorkspaceOpen(false)}>
                <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {selectedCase.name || selectedCase.title}
                </Text>
                <Text style={[styles.headerSub, { color: '#C8A34D' }]}>
                  Client: {selectedCase.clientName || 'Firm Client'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsWorkspaceOpen(false)}>
                <Ionicons name="close-circle-outline" size={26} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* CASE INFO SUMMARY */}
              <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.courtVenue', 'Court Venue:')}</Text>
                  <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{selectedCase.courtName || selectedCase.court || 'District Court'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.nextHearing', 'Next Hearing:')}</Text>
                  <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{selectedCase.nextHearingDate || selectedCase.hearingDate || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'comm.leadAdvocate', 'Lead Advocate:')}</Text>
                  <Text style={[styles.infoValue, { color: '#C8A34D' }]}>{(selectedCase.leadAdvocate && selectedCase.leadAdvocate !== 'Adv. Aditi Lakhera' && selectedCase.leadAdvocate !== 'Aditi Lakhera') ? selectedCase.leadAdvocate : userProfileAdvocate}</Text>
                </View>
              </View>

              {/* RECIPIENT MODE SELECTOR */}
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>{tTool(outputLanguage, 'comm.recipientMode', 'RECIPIENT MODE')}</Text>

              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: recipientMode === 'entire' ? '#C8A34D' : theme.card,
                      borderColor: recipientMode === 'entire' ? '#C8A34D' : theme.border,
                    },
                  ]}
                  onPress={() => setRecipientMode('entire')}
                >
                  <Ionicons name="people" size={16} color={recipientMode === 'entire' ? '#000000' : theme.textPrimary} />
                  <Text style={[styles.modeTabText, { color: recipientMode === 'entire' ? '#000000' : theme.textPrimary }]}>
                    {tTool(outputLanguage, 'comm.entireTeam', 'Entire Case Team')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: recipientMode === 'individual' ? '#C8A34D' : theme.card,
                      borderColor: recipientMode === 'individual' ? '#C8A34D' : theme.border,
                    },
                  ]}
                  onPress={() => setRecipientMode('individual')}
                >
                  <Ionicons name="person" size={16} color={recipientMode === 'individual' ? '#000000' : theme.textPrimary} />
                  <Text style={[styles.modeTabText, { color: recipientMode === 'individual' ? '#000000' : theme.textPrimary }]}>
                    {tTool(outputLanguage, 'comm.individualMember', 'Individual Member')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* RECIPIENT SELECTION & MODE CONDITIONAL RENDERING */}
              {recipientMode === 'entire' ? (
                <View style={{ marginTop: 20, gap: 12 }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 16 }}>
                    Internal advocate team mode is active for case discussion, legal strategy, and file sharing among advocates.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#C8A34D',
                      height: 48,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginHorizontal: 10,
                    }}
                    onPress={() => {
                      const caseId = selectedCase._id || selectedCase.id;
                      setIsWorkspaceOpen(false);
                      router.push({
                        pathname: '/workspace/[id]',
                        params: { id: caseId, tab: 'case-chat' },
                      } as any);
                    }}
                  >
                    <Ionicons name="chatbubbles" size={20} color="#000000" />
                    <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 14 }}>
                      💬 Open Case Team Chat
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* RECIPIENT SELECTION LIST */}
                  <View style={[styles.recipientBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                      {tTool(outputLanguage, 'comm.selectRecipients', 'SELECT RECIPIENTS:')}
                    </Text>
                    {[(selectedCase.leadAdvocate && selectedCase.leadAdvocate !== 'Adv. Aditi Lakhera' && selectedCase.leadAdvocate !== 'Aditi Lakhera') ? selectedCase.leadAdvocate : userProfileAdvocate, ...(selectedCase.teamMembers || ['Abha', 'Rahul', 'Sneha'])].map((name: string, idx: number) => {
                      const isChecked = selectedRecipientNames.includes(name);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={styles.recipientRow}
                          onPress={() => toggleRecipient(name)}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={isChecked ? '#C8A34D' : theme.textMuted}
                          />
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* PRIMARY COMMUNICATION ACTIONS */}
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>{tTool(outputLanguage, 'comm.actionsTitle', 'COMMUNICATION ACTIONS')}</Text>

                  <View style={styles.actionButtonsRow}>
                    {/* DIRECT PHONE CALL */}
                    <TouchableOpacity
                      style={[styles.channelBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleDirectPhoneCall()}
                    >
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>{tTool(outputLanguage, 'comm.call', 'Call')}</Text>
                    </TouchableOpacity>

                    {/* WHATSAPP DRAFT */}
                    <TouchableOpacity
                      style={[styles.channelBtn, { backgroundColor: '#25D366' }]}
                      onPress={() => handleGenerateAiDraft('whatsapp')}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>{tTool(outputLanguage, 'comm.whatsapp', 'WhatsApp')}</Text>
                    </TouchableOpacity>

                    {/* EMAIL DRAFT */}
                    <TouchableOpacity
                      style={[styles.channelBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleGenerateAiDraft('email')}
                    >
                      <Ionicons name="mail" size={18} color="#FFFFFF" />
                      <Text style={styles.channelBtnText}>{tTool(outputLanguage, 'comm.email', 'Email')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* AI PROMPT PRESETS */}
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>{tTool(outputLanguage, 'comm.presetsTitle', 'AI PROMPT PRESETS')}</Text>
                  <View style={styles.presetChipsRow}>
                    {[
                      'Hearing Reminder',
                      'Request Pending Documents',
                      'Send Fee Reminder',
                      'Inform Hearing Postponed',
                      'Ask Client for Affidavit',
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: selectedPresetPrompt === preset ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                            borderColor: selectedPresetPrompt === preset ? '#C8A34D' : theme.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedPresetPrompt(preset);
                          setCustomPrompt(preset);
                          handleGenerateAiDraft(activeChannel || 'whatsapp', preset);
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: selectedPresetPrompt === preset ? '#C8A34D' : theme.textPrimary }}>
                          {tTool(outputLanguage, 'comm.preset' + preset.split(' ')[0], preset)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* CUSTOM AI PROMPT INPUT */}
                  <View style={[styles.customPromptBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                    <TextInput
                      style={[styles.customPromptInput, { color: theme.textPrimary }]}
                      placeholder={tTool(outputLanguage, 'comm.customPlaceholder', 'Or type custom legal instructions for AI...')}
                      placeholderTextColor={theme.placeholder}
                      value={customPrompt}
                      onChangeText={setCustomPrompt}
                    />
                  </View>

                  {/* AI DRAFT PREVIEW BOX */}
                  {isGeneratingDraft ? (
                    <View style={{ padding: 20, alignItems: 'center', marginTop: 12 }}>
                      <ActivityIndicator size="large" color="#C8A34D" />
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                        AI Context Engine analyzing case file...
                      </Text>
                    </View>
                  ) : generatedDraft ? (
                    <View style={[styles.draftContainer, { backgroundColor: theme.card, borderColor: '#C8A34D', marginTop: 14 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D' }}>
                          AI DRAFT PREVIEW ({activeChannel?.toUpperCase()})
                        </Text>
                        <TouchableOpacity onPress={() => setIsEditingDraft(!isEditingDraft)}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }}>
                            {isEditingDraft ? tTool(outputLanguage, 'comm.doneEditing', 'Done Editing') : tTool(outputLanguage, 'comm.editDraft', 'Edit Draft')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {generatedSubject ? (
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 }}>
                          Subject: {generatedSubject}
                        </Text>
                      ) : null}

                      {isEditingDraft ? (
                        <TextInput
                          style={[styles.draftInput, { color: theme.textPrimary, borderColor: theme.border }]}
                          multiline
                          value={generatedDraft}
                          onChangeText={setGeneratedDraft}
                        />
                      ) : (
                        <Text style={[styles.draftBody, { color: theme.textPrimary }]}>{generatedDraft}</Text>
                      )}

                      {/* LAUNCH NATIVE APP BUTTON */}
                      <TouchableOpacity
                        style={[
                          styles.launchNativeBtn,
                          { backgroundColor: activeChannel === 'whatsapp' ? '#25D366' : '#3B82F6', marginTop: 12 },
                        ]}
                        onPress={activeChannel === 'whatsapp' ? handleOpenNativeWhatsApp : handleOpenNativeEmail}
                      >
                        <Ionicons name={activeChannel === 'whatsapp' ? 'logo-whatsapp' : 'mail'} size={18} color="#FFFFFF" />
                        <Text style={styles.launchNativeBtnText}>
                          Open Native {activeChannel === 'whatsapp' ? 'WhatsApp' : 'Email App'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )}

              {/* CASE COMMUNICATION HISTORY */}
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>
                COMMUNICATION HISTORY ({commLogs.length})
              </Text>

              <View style={[styles.historyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {commLogs.length === 0 ? (
                  <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', padding: 12 }}>
                    {tTool(outputLanguage, 'comm.noHistory', 'No communication history logged for this case yet.')}
                  </Text>
                ) : (
                  commLogs.map((log, idx) => (
                    <View key={idx} style={styles.historyRow}>
                      <View style={[styles.historyIconBox, { backgroundColor: log.type.includes('Call') ? '#10B98118' : '#3B82F618' }]}>
                        <Ionicons
                          name={log.type.includes('Call') ? 'call' : log.type.includes('WhatsApp') ? 'logo-whatsapp' : 'mail'}
                          size={14}
                          color={log.type.includes('Call') ? '#10B981' : '#3B82F6'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{log.type}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={2}>
                          {log.summary}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: theme.textMuted }}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, minWidth: '47%', padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySub: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  caseCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  caseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  caseTitle: { fontSize: 14, fontWeight: '800' },
  clientName: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  caseMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  metaText: { fontSize: 11, fontWeight: '600' },
  caseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#33333333' },
  openWorkspaceBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  openWorkspaceBtnText: { fontSize: 11, fontWeight: '800', color: '#000000' },
  safeArea: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '600' },
  infoBox: { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 11, fontWeight: '600' },
  infoValue: { fontSize: 11.5, fontWeight: '700' },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  modeTabText: { fontSize: 12, fontWeight: '800' },
  recipientBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 6 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  actionButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  channelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 10, gap: 6 },
  channelBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  presetChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  presetChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  customPromptBox: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 40, justifyContent: 'center' },
  customPromptInput: { fontSize: 12, fontWeight: '600' },
  draftContainer: { padding: 12, borderRadius: 12, borderWidth: 1.5 },
  draftInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 12, minHeight: 100 },
  draftBody: { fontSize: 12, lineHeight: 18 },
  launchNativeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 10, gap: 6 },
  launchNativeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  historyBox: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIconBox: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
