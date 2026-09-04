import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput as RNTextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  Vibration,
  Pressable,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { TextInput, TextArea } from '@/components/ui';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { formatWhatsAppNumber } from '../utils/phone';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

// Category Dropdown options
const CATEGORY_OPTIONS = [
  'Civil',
  'Criminal',
  'Consumer',
  'Employment',
  'Corporate',
  'Family',
  'Property',
  'Tax',
  'Banking',
  'Arbitration',
  'Labour',
  'Compliance',
  'Miscellaneous',
];

const STATUS_OPTIONS = ['Active', 'Closed', 'Archived'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const ROLE_OPTIONS = ['Petitioner', 'Respondent', 'Complainant', 'Defendant', 'Appellant', 'Accused'];

import { COURT_TYPES } from '../constants/courtTypes';
import { STATES } from '../constants/states';
import { DISTRICTS } from '../constants/districts';
import { getCourtsForLocation } from '../constants/courtDatabase';

interface PressableOverlayProps {
  onPress: () => void;
  children: React.ReactNode;
}

const PressableOverlay: React.FC<PressableOverlayProps> = ({ onPress, children }) => {
  return (
    <Pressable style={styles.modalOverlayPressable} onPress={onPress}>
      {children}
    </Pressable>
  );
};

interface SmartDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  leftIcon?: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  error?: string;
}

const SmartDropdown: React.FC<SmartDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  leftIcon,
  placeholder = 'Select...',
  searchable = false,
  error,
}) => {
  const { theme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.9}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            placeholder={placeholder}
            value={value}
            leftIcon={leftIcon}
            error={error}
            rightIcon={<Ionicons name="chevron-down" size={16} color={theme.textSecondary} />}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <PressableOverlay onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdownBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Select {label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <TextInput
                placeholder="Search options..."
                value={query}
                onChangeText={setQuery}
                leftIcon={<Ionicons name="search" size={16} color={theme.textSecondary} />}
                containerStyle={{ marginVertical: 0, marginBottom: 10 }}
              />
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {filtered.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <Text
                    style={{
                      color: value === opt ? theme.primary : theme.textPrimary,
                      fontWeight: value === opt ? '800' : '500',
                      fontSize: 13,
                    }}
                  >
                    {opt}
                  </Text>
                  {value === opt && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.textMuted, marginVertical: 12, fontSize: 12 }}>
                  No matches found
                </Text>
              )}
            </ScrollView>
          </View>
        </PressableOverlay>
      </Modal>
    </View>
  );
};

interface SmartDatePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  leftIcon?: React.ReactNode;
}

const SmartDatePicker: React.FC<SmartDatePickerProps> = ({
  label,
  value,
  onChange,
  leftIcon,
}) => {
  const { theme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('07');
  const [day, setDay] = useState('11');

  const handleConfirm = () => {
    const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.9}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            placeholder="YYYY-MM-DD"
            value={value}
            leftIcon={leftIcon}
            rightIcon={<Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <PressableOverlay onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdownBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }}>Select Date ({label})</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.datePartLabel}>Year</Text>
                <RNTextInput
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  style={[styles.dateInputText, { color: theme.textPrimary, borderColor: theme.border }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.datePartLabel}>Month (MM)</Text>
                <RNTextInput
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  style={[styles.dateInputText, { color: theme.textPrimary, borderColor: theme.border }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.datePartLabel}>Day (DD)</Text>
                <RNTextInput
                  value={day}
                  onChangeText={setDay}
                  keyboardType="number-pad"
                  style={[styles.dateInputText, { color: theme.textPrimary, borderColor: theme.border }]}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.dateCancel}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.dateConfirm, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PressableOverlay>
      </Modal>
    </View>
  );
};

interface NewCaseIntelligenceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newCase: CaseWorkspace) => void;
  editCaseId?: string;
  initialData?: CaseWorkspace;
}

export const NewCaseIntelligenceModal: React.FC<NewCaseIntelligenceModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editCaseId,
  initialData,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const formScrollViewRef = useRef<ScrollView>(null);

  // Wizard active step
  const [step, setStep] = useState(1);

  // Voice AI Dictation State
  const [isAiVoiceParsing, setIsAiVoiceParsing] = useState(false);

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
        const caseTitle = d.caseTitle || (d.clientName ? `${d.clientName} vs ${d.opponentName || 'Opponent'}` : 'New Voice Intake Case');
        
        // Auto-create case immediately from voice dictation
        const payload = {
          name: caseTitle,
          clientName: d.clientName || 'Client Profile',
          opponentName: d.opponentName || 'Opposite Party',
          caseType: d.caseCategory || 'Civil',
          courtName: d.courtName || 'District Court',
          courtType: d.courtType || 'District Court',
          summary: d.summary || finalTranscriptText,
          priority: d.priority || 'Medium',
          status: 'Active',
          isLegalCase: true,
          clientRole: d.role || 'Complainant',
          clientPhone: d.clientMobile || '',
          clientEmail: d.clientEmail || '',
          stateName: d.state || '',
          district: d.district || '',
          facts: finalTranscriptText ? [{ id: `fact_${Date.now()}`, date: new Date().toLocaleDateString(), description: finalTranscriptText }] : [],
        };

        const createRes = await CaseService.createCase(payload as any);
        const resCase = (createRes as any).data || createRes;
        
        showToast('success', '✨ Voice Case Created!', 'Opening case workspace directly...');
        await AsyncStorage.removeItem('new_case_wizard_draft');
        
        if (resCase) {
          onSuccess(resCase);
          onClose();
        }
      }
    } catch (err: any) {
      showToast('error', 'Voice AI Error', err?.message || 'Failed to extract & create case');
    } finally {
      setIsAiVoiceParsing(false);
    }
  });

  // Wizard Fields State
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('Medium');
  const [caseCategory, setCaseCategory] = useState('');

  // Step 2: Parties
  const [clientRole, setClientRole] = useState('Complainant');
  const [opponentRole, setOpponentRole] = useState('Defendant');
  const [clientName, setClientName] = useState('');
  const [clientMobileNumber, setClientMobileNumber] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentPhone, setOpponentPhone] = useState('');
  const [advocate, setAdvocate] = useState('');
  const [lawFirm, setLawFirm] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [opponentAddress, setOpponentAddress] = useState('');
  const [additionalParties, setAdditionalParties] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [coPlaintiffs, setCoPlaintiffs] = useState('');
  const [residentialDetails, setResidentialDetails] = useState('');

  // Step 3: Court
  const [court, setCourt] = useState('');
  const [courtType, setCourtType] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [district, setDistrict] = useState('');

  // Step 3: Custom "Other" values
  const [customCourtType, setCustomCourtType] = useState('');
  const [customStateName, setCustomStateName] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  const [customCourt, setCustomCourt] = useState('');

  // Step 4: Dates
  const [incidentDate, setIncidentDate] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');

  // Step 5: Summary
  const [summary, setSummary] = useState('');

  // Step 6: Optional Criminal Details
  const [firNumber, setFIRNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Kept internally to prevent data loss for fields modified outside creation
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [clientWhatsAppNumber, setClientWhatsAppNumber] = useState('');
  const [opponentAdvocate, setOpponentAdvocate] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [limitationDate, setLimitationDate] = useState('');
  const [factsInput, setFactsInput] = useState('');
  const [reliefSought, setReliefSought] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [labelsInput, setLabelsInput] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<CaseWorkspace | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Load standalone clients list
  useEffect(() => {
    if (visible) {
      CaseService.listClients().then((res) => {
        if (res && res.success) {
          setClients(res.clients || []);
        }
      }).catch((err) => {
        console.warn('Failed to load standalone clients:', err);
      });
    }
  }, [visible]);

  // Load existing data if editing
  useEffect(() => {
    if (visible && initialData && editCaseId) {
      setName(initialData.name || '');
      setStatus(initialData.status || 'Active');
      setPriority(initialData.priority || 'Medium');
      setCaseCategory(initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '');
      
      setClientRole((initialData as any).clientRole || 'Complainant');
      setOpponentRole((initialData as any).opponentRole || 'Defendant');
      setClientName(initialData.clientName || '');
      setOpponentName(initialData.opponentName || '');
      setClientEmail((initialData as any).clientEmail || '');
      setClientMobileNumber((initialData as any).clientMobileNumber || (initialData as any).clientPhone || '');
      setClientWhatsAppNumber((initialData as any).clientWhatsAppNumber || '');
      setClientAddress((initialData as any).clientAddress || '');
      setOpponentEmail((initialData as any).opponentEmail || '');
      setOpponentPhone((initialData as any).opponentPhone || (initialData as any).opponentMobile || '');
      setOpponentAddress((initialData as any).opponentAddress || '');

      setAdvocate((initialData as any).advocate || (initialData as any).clientAdvocate || '');
      setOpponentAdvocate((initialData as any).opponentAdvocate || '');
      setLawFirm((initialData as any).lawFirm || '');
      setAdditionalParties((initialData as any).additionalParties || '');
      setWitnesses((initialData as any).witnesses || '');
      setCoPlaintiffs((initialData as any).coPlaintiffs || '');
      setResidentialDetails((initialData as any).residentialDetails || '');

      const rawCourtType = (initialData as any).courtType || '';
      const rawState = (initialData as any).stateName || (initialData as any).state || '';
      const rawDistrict = (initialData as any).district || '';
      const rawCourt = initialData.courtName || '';

      if (rawCourtType && !COURT_TYPES.includes(rawCourtType)) {
        setCourtType('Other');
        setCustomCourtType(rawCourtType);
      } else {
        setCourtType(rawCourtType);
        setCustomCourtType('');
      }

      if (rawState && !STATES.includes(rawState)) {
        setStateName('Other');
        setCustomStateName(rawState);
      } else {
        setStateName(rawState);
        setCustomStateName('');
      }

      const stateDistricts = DISTRICTS[rawState] || [];
      if (rawDistrict && !stateDistricts.includes(rawDistrict)) {
        setDistrict('Other');
        setCustomDistrict(rawDistrict);
      } else {
        setDistrict(rawDistrict);
        setCustomDistrict('');
      }

      const availableCourts = getCourtsForLocation(
        rawCourtType && !COURT_TYPES.includes(rawCourtType) ? 'Other' : rawCourtType,
        rawState && !STATES.includes(rawState) ? 'Other' : rawState,
        rawDistrict && !stateDistricts.includes(rawDistrict) ? 'Other' : rawDistrict
      );
      if (rawCourt && !availableCourts.includes(rawCourt)) {
        setCourt('Other');
        setCustomCourt(rawCourt);
      } else {
        setCourt(rawCourt);
        setCustomCourt('');
      }
      setCity((initialData as any).city || '');
      setCourtNumber((initialData as any).courtNumber || '');
      setJudgeName((initialData as any).judgeName || '');
      setCaseNumber((initialData as any).caseNumber || '');

      setIncidentDate((initialData as any).incidentDate || '');
      setNextHearingDate((initialData as any).nextHearingDate || (initialData as any).hearingDate || '');
      
      setFilingDate((initialData as any).filingDate || '');
      setAgreementDate((initialData as any).agreementDate || '');
      setNoticeDate((initialData as any).noticeDate || '');
      setLimitationDate((initialData as any).limitationDate || '');

      setSummary(initialData.summary || (initialData as any).caseSummary || '');
      setFactsInput(
        initialData.facts
          ? initialData.facts
              .map((f: any) => (typeof f === 'string' ? f : f.description || f.title || ''))
              .filter(Boolean)
              .join(', ')
          : ''
      );
      setReliefSought((initialData as any).reliefSought || (initialData as any).relief?.join(', ') || '');
      
      const rawNotes = (initialData as any).internalNotes || (initialData as any).notes || '';
      let notesStr = '';
      if (typeof rawNotes === 'string') {
        notesStr = rawNotes;
      } else if (Array.isArray(rawNotes)) {
        notesStr = rawNotes.map((n: any) => typeof n === 'string' ? n : n.content || n.title || '').filter(Boolean).join('\n');
      }
      setInternalNotes(notesStr);

      setPoliceStation((initialData as any).policeStation || '');
      setFIRNumber((initialData as any).firNumber || '');
      setReferenceNumber((initialData as any).referenceNumber || '');
      setTagsInput((initialData as any).tags?.join(', ') || '');
      setLabelsInput((initialData as any).labels?.join(', ') || '');
      setStep(1);
    } else if (!visible) {
      resetForm();
    }
  }, [initialData, editCaseId, visible]);

  // Restore draft if creation modal opens
  useEffect(() => {
    const restoreDraft = async () => {
      if (visible && !editCaseId) {
        try {
          const stored = await AsyncStorage.getItem('new_case_wizard_draft');
          if (stored) {
            const data = JSON.parse(stored);
            setName(data.name || '');
            setStatus(data.status || 'Active');
            setPriority(data.priority || 'Medium');
            setCaseCategory(data.caseCategory || '');
            setClientRole(data.clientRole || 'Complainant');
            setOpponentRole(data.opponentRole || 'Defendant');
            setClientName(data.clientName || '');
            setOpponentName(data.opponentName || '');
            setClientEmail(data.clientEmail || '');
            setClientMobileNumber(data.clientMobileNumber || '');
            setClientWhatsAppNumber(data.clientWhatsAppNumber || '');
            setClientAddress(data.clientAddress || '');
            setOpponentPhone(data.opponentPhone || '');
            setOpponentAddress(data.opponentAddress || '');
            setAdvocate(data.advocate || '');
            setOpponentAdvocate(data.opponentAdvocate || '');
            setLawFirm(data.lawFirm || '');
            setAdditionalParties(data.additionalParties || '');
            setWitnesses(data.witnesses || '');
            setCoPlaintiffs(data.coPlaintiffs || '');
            setResidentialDetails(data.residentialDetails || '');
            setCourt(data.court || '');
            setCourtType(data.courtType || '');
            setStateName(data.stateName || '');
            setDistrict(data.district || '');
            setCity(data.city || '');
            setCourtNumber(data.courtNumber || '');
            setJudgeName(data.judgeName || '');
            setCaseNumber(data.caseNumber || '');
            setIncidentDate(data.incidentDate || '');
            setNextHearingDate(data.nextHearingDate || '');
            setSummary(data.summary || '');
            setFIRNumber(data.firNumber || '');
            setPoliceStation(data.policeStation || '');
            setReferenceNumber(data.referenceNumber || '');
            setStep(data.step || 1);
          }
        } catch (err) {
          console.warn('Failed to restore draft:', err);
        }
      }
    };
    restoreDraft();
  }, [visible, editCaseId]);

  // Debounced auto draft saver
  useEffect(() => {
    if (!editCaseId && visible) {
      const draft = {
        name, status, priority, caseCategory, clientRole, opponentRole,
        clientName, opponentName, clientEmail, clientMobileNumber, clientWhatsAppNumber,
        clientAddress, opponentPhone, opponentAddress, advocate, opponentAdvocate,
        lawFirm, additionalParties, witnesses, coPlaintiffs, residentialDetails,
        court, courtType, stateName, district, city, courtNumber, judgeName, caseNumber, incidentDate,
        nextHearingDate, summary, firNumber, policeStation, referenceNumber, step
      };
      const timer = setTimeout(() => {
        AsyncStorage.setItem('new_case_wizard_draft', JSON.stringify(draft));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    name, status, priority, caseCategory, clientRole, opponentRole,
    clientName, opponentName, clientEmail, clientMobileNumber, clientWhatsAppNumber,
    clientAddress, opponentPhone, opponentAddress, advocate, opponentAdvocate,
    lawFirm, additionalParties, witnesses, coPlaintiffs, residentialDetails,
    court, courtType, stateName, district, city, courtNumber, judgeName, caseNumber, incidentDate,
    nextHearingDate, summary, firNumber, policeStation, referenceNumber, step,
    visible
  ]);

  // AI detected suggestion checkboxes
  const [aiGenerateChecklist, setAiGenerateChecklist] = useState({
    timeline: true,
    legalIssues: true,
    documentChecklist: true,
    strategy: true,
  });

  const resetForm = () => {
    setName('');
    setStatus('Active');
    setPriority('Medium');
    setCaseCategory('');
    setClientRole('Complainant');
    setOpponentRole('Defendant');
    setClientName('');
    setOpponentName('');
    setClientEmail('');
    setClientPhone('');
    setClientMobileNumber('');
    setClientWhatsAppNumber('');
    setClientAddress('');
    setOpponentEmail('');
    setOpponentPhone('');
    setOpponentAddress('');
    setAdvocate('');
    setOpponentAdvocate('');
    setLawFirm('');
    setAdditionalParties('');
    setWitnesses('');
    setCoPlaintiffs('');
    setResidentialDetails('');
    setCourt('');
    setCourtType('');
    setStateName('');
    setDistrict('');
    setCity('');
    setCourtNumber('');
    setJudgeName('');
    setCaseNumber('');
    setIncidentDate('');
    setNextHearingDate('');
    setFilingDate('');
    setAgreementDate('');
    setNoticeDate('');
    setLimitationDate('');
    setSummary('');
    setFactsInput('');
    setReliefSought('');
    setInternalNotes('');
    setPoliceStation('');
    setFIRNumber('');
    setReferenceNumber('');
    setTagsInput('');
    setLabelsInput('');
    setCreatedCase(null);
    setErrors({});
    setStep(1);
    setCustomCourtType('');
    setCustomStateName('');
    setCustomDistrict('');
    setCustomCourt('');
  };

  const handleClose = async () => {
    onClose();
  };

  const validateStep = (stepNumber: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!name.trim()) nextErrors.name = 'Case Title Required';
      if (!caseCategory.trim()) nextErrors.caseCategory = 'Category Required';
      if (!status.trim()) nextErrors.status = 'Status Required';
      if (!priority.trim()) nextErrors.priority = 'Priority Required';
    }

    if (stepNumber === 2) {
      if (!clientName.trim()) nextErrors.clientName = 'Client Name Required';
      if (!clientMobileNumber.trim()) {
        nextErrors.clientMobileNumber = 'Client Mobile Required';
      } else {
        const formatted = formatWhatsAppNumber(clientMobileNumber.trim());
        if (!formatted) {
          nextErrors.clientMobileNumber = 'Invalid format (10 digits)';
        }
      }
      if (!opponentName.trim()) nextErrors.opponentName = 'Opponent Name Required';
      if (opponentPhone.trim()) {
        const formatted = formatWhatsAppNumber(opponentPhone.trim());
        if (!formatted) {
          nextErrors.opponentPhone = 'Invalid format (10 digits)';
        }
      }
    }

    if (stepNumber === 3) {
      if (!courtType.trim()) {
        nextErrors.courtType = 'Court Type Required';
      } else if (courtType === 'Other' && !customCourtType.trim()) {
        nextErrors.customCourtType = 'Custom Court Type Required';
      }

      if (!stateName.trim()) {
        nextErrors.stateName = 'State / UT Required';
      } else if (stateName === 'Other' && !customStateName.trim()) {
        nextErrors.customStateName = 'Custom State / UT Required';
      }

      if (!district.trim()) {
        nextErrors.district = 'District Required';
      } else if (district === 'Other' && !customDistrict.trim()) {
        nextErrors.customDistrict = 'Custom District Required';
      }

      if (!court.trim()) {
        nextErrors.court = 'Court Name Required';
      } else if (court === 'Other' && !customCourt.trim()) {
        nextErrors.customCourt = 'Custom Court Name Required';
      }
    }

    if (stepNumber === 4) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (incidentDate.trim() && !dateRegex.test(incidentDate.trim())) {
        nextErrors.incidentDate = 'Use format YYYY-MM-DD';
      }
      if (nextHearingDate.trim() && !dateRegex.test(nextHearingDate.trim())) {
        nextErrors.nextHearingDate = 'Use format YYYY-MM-DD';
      }
    }

    if (stepNumber === 5) {
      if (!summary.trim()) nextErrors.summary = 'Case Summary Required';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('error', 'Fields Incomplete', 'Please check validation errors.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep((s) => s + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep((s) => s - 1);
    }
  };

  const handleSaveCase = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    const cleanWhatsApp = clientWhatsAppNumber.trim() ? (formatWhatsAppNumber(clientWhatsAppNumber.trim()) || clientWhatsAppNumber.trim()) : '';
    const cleanMobile = clientMobileNumber.trim() ? (formatWhatsAppNumber(clientMobileNumber.trim()) || clientMobileNumber.trim()) : '';

    try {
      let payload: Partial<CaseWorkspace> = {};
      const resolvedCourtType = courtType === 'Other' ? customCourtType : courtType;
      const resolvedStateName = stateName === 'Other' ? customStateName : stateName;
      const resolvedDistrict = district === 'Other' ? customDistrict : district;
      const resolvedCourtName = court === 'Other' ? customCourt : court;

      if (editCaseId && initialData) {
        const addIfChanged = (key: string, currentValue: any, initialValue: any) => {
          if (currentValue !== initialValue) {
            (payload as any)[key] = currentValue;
          }
        };

        addIfChanged('name', name.trim(), initialData.name || '');
        addIfChanged('status', status, initialData.status || 'Active');
        addIfChanged('priority', priority, initialData.priority || 'Medium');
        addIfChanged('caseType', caseCategory, initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '');
        addIfChanged('clientName', clientName.trim(), initialData.clientName || '');
        addIfChanged('opponentName', opponentName.trim(), initialData.opponentName || '');
        addIfChanged('summary', summary.trim(), initialData.summary || (initialData as any).caseSummary || '');
        addIfChanged('clientRole', clientRole, (initialData as any).clientRole || 'Complainant');
        addIfChanged('opponentRole', opponentRole, (initialData as any).opponentRole || 'Defendant');
        addIfChanged('clientPhone', cleanMobile, (initialData as any).clientPhone || '');
        addIfChanged('clientEmail', clientEmail.trim(), (initialData as any).clientEmail || '');
        addIfChanged('clientMobileNumber', cleanMobile, (initialData as any).clientMobileNumber || '');
        addIfChanged('clientWhatsAppNumber', cleanWhatsApp, (initialData as any).clientWhatsAppNumber || '');
        addIfChanged('clientAddress', clientAddress.trim(), (initialData as any).clientAddress || '');
        addIfChanged('opponentPhone', opponentPhone.trim(), (initialData as any).opponentPhone || '');
        addIfChanged('opponentAddress', opponentAddress.trim(), (initialData as any).opponentAddress || '');
        addIfChanged('advocate', advocate.trim(), (initialData as any).advocate || (initialData as any).clientAdvocate || '');
        addIfChanged('clientAdvocate', advocate.trim(), (initialData as any).clientAdvocate || '');
        addIfChanged('opponentAdvocate', opponentAdvocate.trim(), (initialData as any).opponentAdvocate || '');
        addIfChanged('lawFirm', lawFirm.trim(), (initialData as any).lawFirm || '');
        addIfChanged('additionalParties', additionalParties.trim(), (initialData as any).additionalParties || '');
        addIfChanged('witnesses', witnesses.trim(), (initialData as any).witnesses || '');
        addIfChanged('coPlaintiffs', coPlaintiffs.trim(), (initialData as any).coPlaintiffs || '');
        addIfChanged('residentialDetails', residentialDetails.trim(), (initialData as any).residentialDetails || '');
        addIfChanged('courtName', resolvedCourtName || 'District Court', initialData.courtName || '');
        addIfChanged('courtType', resolvedCourtType, (initialData as any).courtType || '');
        addIfChanged('stateName', resolvedStateName, (initialData as any).stateName || (initialData as any).state || '');
        addIfChanged('state', resolvedStateName, (initialData as any).state || '');
        addIfChanged('district', resolvedDistrict.trim(), (initialData as any).district || '');
        addIfChanged('city', resolvedDistrict.trim(), (initialData as any).city || '');
        addIfChanged('courtNumber', courtNumber.trim(), (initialData as any).courtNumber || '');
        addIfChanged('judgeName', judgeName.trim(), (initialData as any).judgeName || '');
        addIfChanged('caseNumber', caseNumber.trim(), (initialData as any).caseNumber || '');
        addIfChanged('incidentDate', incidentDate, (initialData as any).incidentDate || '');
        addIfChanged('nextHearingDate', nextHearingDate, (initialData as any).nextHearingDate || (initialData as any).hearingDate || '');
        addIfChanged('hearingDate', nextHearingDate, (initialData as any).hearingDate || '');
        addIfChanged('firNumber', firNumber.trim(), (initialData as any).firNumber || '');
        addIfChanged('policeStation', policeStation.trim(), (initialData as any).policeStation || '');
        addIfChanged('referenceNumber', referenceNumber.trim(), (initialData as any).referenceNumber || '');
        addIfChanged('clientId', selectedClientId || null, (initialData as any).clientId || null);
      } else {
        payload = {
          name: name.trim(),
          clientId: selectedClientId || undefined,
          clientName: clientName.trim(),
          opponentName: opponentName.trim(),
          caseType: caseCategory,
          courtName: resolvedCourtName || 'District Court',
          summary: summary.trim(),
          priority: priority as any,
          status: status as any,
          isLegalCase: true,
          clientRole,
          opponentRole,
          clientPhone: cleanMobile,
          clientEmail: clientEmail.trim(),
          clientMobileNumber: cleanMobile,
          clientWhatsAppNumber: cleanWhatsApp,
          clientAddress: clientAddress.trim(),
          opponentPhone: opponentPhone.trim(),
          opponentAddress: opponentAddress.trim(),
          advocate: advocate.trim(),
          clientAdvocate: advocate.trim(),
          opponentAdvocate: opponentAdvocate.trim(),
          lawFirm: lawFirm.trim(),
          additionalParties: additionalParties.trim(),
          witnesses: witnesses.trim(),
          coPlaintiffs: coPlaintiffs.trim(),
          residentialDetails: residentialDetails.trim(),
          courtType: resolvedCourtType,
          stateName: resolvedStateName,
          state: resolvedStateName,
          district: resolvedDistrict,
          city: resolvedDistrict,
          courtNumber: courtNumber.trim(),
          judgeName: judgeName.trim(),
          caseNumber: caseNumber.trim(),
          incidentDate,
          nextHearingDate,
          hearingDate: nextHearingDate,
          firNumber: firNumber.trim(),
          policeStation: policeStation.trim(),
          referenceNumber: referenceNumber.trim(),
          facts: summary ? [{ id: `fact_${Date.now()}`, date: new Date().toLocaleDateString(), description: summary }] : [],
          legalIssues: [],
        } as any;
      }

      let resCase: CaseWorkspace;
      if (editCaseId) {
        const res = await CaseService.updateCase(editCaseId, payload);
        resCase = (res as any).data || res;
        showToast('success', 'Case Updated', 'Changes saved successfully.');
        await AsyncStorage.removeItem('new_case_wizard_draft');
        onSuccess(resCase);
        onClose();
        return;
      } else {
        const res = await CaseService.createCase(payload as any);
        resCase = (res as any).data || res;
        showToast('success', 'Case Created', 'Professional legal workspace created.');
      }

      await AsyncStorage.removeItem('new_case_wizard_draft');
      setCreatedCase(resCase);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Save Failed', err.message || 'Server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressIndicator = () => {
    const percent = Math.round((step / 6) * 100);
    return (
      <View style={[styles.progressContainer, { borderBottomColor: theme.border }]}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <React.Fragment key={num}>
              <View
                style={[
                  styles.progressDot,
                  num <= step
                    ? { backgroundColor: '#C8A34D' }
                    : { backgroundColor: theme.border, borderWidth: 1, borderColor: theme.divider },
                ]}
              >
                {num < step && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              {num < 6 && (
                <View
                  style={[
                    styles.progressLine,
                    num < step
                      ? { backgroundColor: '#C8A34D' }
                      : { backgroundColor: theme.divider },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>{percent}% Complete</Text>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Case Basics</Text>
            
            <TextInput
              label="Case Title *"
              placeholder="e.g. Rajesh Sharma vs Amit Verma"
              value={name}
              onChangeText={setName}
              error={errors.name}
              leftIcon={<Ionicons name="document-text-outline" size={16} color="#C8A34D" />}
            />

            <SmartDropdown
              label="Case Category *"
              value={caseCategory}
              options={CATEGORY_OPTIONS}
              onChange={setCaseCategory}
              error={errors.caseCategory}
              leftIcon={<Ionicons name="folder-open-outline" size={16} color="#C8A34D" />}
            />

            <SmartDropdown
              label="Case Status *"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
              error={errors.status}
              leftIcon={<Ionicons name="flag-outline" size={16} color="#C8A34D" />}
            />

            <SmartDropdown
              label="Priority *"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
              error={errors.priority}
              leftIcon={<Ionicons name="alert-circle-outline" size={16} color="#C8A34D" />}
            />
          </View>
        );

      case 2:
        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Parties Information</Text>

            <SmartDropdown
              label="Client Role"
              value={clientRole}
              options={ROLE_OPTIONS}
              onChange={setClientRole}
              leftIcon={<Ionicons name="person-outline" size={16} color="#C8A34D" />}
            />

            {clients.length > 0 && (
              <SmartDropdown
                label="Or Link Standalone Client (Optional)"
                value={selectedClientId ? (clients.find(c => c._id === selectedClientId) ? `${clients.find(c => c._id === selectedClientId).name} | ${clients.find(c => c._id === selectedClientId).email} | ${selectedClientId}` : 'None (Type manually)') : 'None (Type manually)'}
                options={['None (Type manually)', ...clients.map(c => `${c.name} | ${c.email} | ${c._id}`)]}
                onChange={(val) => {
                  if (val === 'None (Type manually)' || !val) {
                    setSelectedClientId(null);
                  } else {
                    const parts = val.split(' | ');
                    const id = parts[parts.length - 1];
                    setSelectedClientId(id);
                    const selectedClient = clients.find(c => c._id === id);
                    if (selectedClient) {
                      setClientName(selectedClient.name);
                      setClientMobileNumber(selectedClient.mobileNumber);
                      setClientWhatsAppNumber(selectedClient.whatsAppNumber || '');
                      setClientEmail(selectedClient.email || '');
                    }
                  }
                }}
                leftIcon={<Ionicons name="link-outline" size={16} color="#C8A34D" />}
              />
            )}

            <TextInput
              label="Client Name *"
              placeholder="Enter Client Full Name"
              value={clientName}
              onChangeText={(text) => {
                setClientName(text);
                if (selectedClientId) setSelectedClientId(null); // reset selected standalone client link if typed manually
              }}
              error={errors.clientName}
              leftIcon={<Ionicons name="person-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Client Mobile *"
              placeholder="e.g. +91 98765 43210"
              value={clientMobileNumber}
              onChangeText={setClientMobileNumber}
              error={errors.clientMobileNumber}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Client Email"
              placeholder="e.g. client@example.com"
              value={clientEmail}
              onChangeText={setClientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Client Address"
              placeholder="Residential / Business Address"
              value={clientAddress}
              onChangeText={setClientAddress}
              leftIcon={<Ionicons name="location-outline" size={16} color="#C8A34D" />}
            />

            <SmartDropdown
              label="Opponent Role"
              value={opponentRole}
              options={ROLE_OPTIONS}
              onChange={setOpponentRole}
              leftIcon={<Ionicons name="people-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Opponent Name *"
              placeholder="Enter Opponent Full Name"
              value={opponentName}
              onChangeText={setOpponentName}
              error={errors.opponentName}
              leftIcon={<Ionicons name="person-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Opponent Mobile (optional)"
              placeholder="e.g. +91 98765 43210"
              value={opponentPhone}
              onChangeText={setOpponentPhone}
              error={errors.opponentPhone}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Client Advocate (optional)"
              placeholder="Lead Defense / Prosecution Counsel"
              value={advocate}
              onChangeText={setAdvocate}
              leftIcon={<Ionicons name="briefcase-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Law Firm (optional)"
              placeholder="Law Firm / Chamber name"
              value={lawFirm}
              onChangeText={setLawFirm}
              leftIcon={<Ionicons name="business-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Witnesses (optional)"
              placeholder="Witness names (separated by commas)"
              value={witnesses}
              onChangeText={setWitnesses}
              leftIcon={<Ionicons name="eye-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Co-plaintiffs (optional)"
              placeholder="Co-plaintiff names (separated by commas)"
              value={coPlaintiffs}
              onChangeText={setCoPlaintiffs}
              leftIcon={<Ionicons name="people-circle-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Residential Details (optional)"
              placeholder="State / District boundaries details"
              value={residentialDetails}
              onChangeText={setResidentialDetails}
              leftIcon={<Ionicons name="home-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Additional Parties (optional)"
              placeholder="Other stakeholders"
              value={additionalParties}
              onChangeText={setAdditionalParties}
              leftIcon={<Ionicons name="add-circle-outline" size={16} color="#C8A34D" />}
            />
          </View>
        );

      case 3:
        const resolvedStateState = stateName === 'Other' ? 'Other' : stateName;
        const districtOptions = DISTRICTS[resolvedStateState] || ['Other'];

        const resolvedTypeVal = courtType === 'Other' ? customCourtType : courtType;
        const resolvedStateVal = stateName === 'Other' ? customStateName : stateName;
        const resolvedDistrictVal = district === 'Other' ? customDistrict : district;
        const courtOptions = getCourtsForLocation(resolvedTypeVal, resolvedStateVal, resolvedDistrictVal);

        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Court Details</Text>

            {/* 1. Court Type */}
            <SmartDropdown
              label="Court Type *"
              value={courtType}
              options={COURT_TYPES}
              onChange={(val) => {
                setCourtType(val);
                if (val !== 'Other') setCustomCourtType('');
                setCourt('');
                setCustomCourt('');
              }}
              searchable
              error={errors.courtType}
              leftIcon={<Ionicons name="library-outline" size={16} color="#C8A34D" />}
            />
            {courtType === 'Other' && (
              <TextInput
                label="Enter Court Type *"
                placeholder="e.g. Special Railway Tribunal"
                value={customCourtType}
                onChangeText={setCustomCourtType}
                error={errors.customCourtType}
                leftIcon={<Ionicons name="create-outline" size={16} color="#C8A34D" />}
              />
            )}

            {/* 2. State */}
            <SmartDropdown
              label="State *"
              value={stateName}
              options={STATES}
              onChange={(val) => {
                setStateName(val);
                if (val !== 'Other') setCustomStateName('');
                setDistrict('');
                setCustomDistrict('');
                setCourt('');
                setCustomCourt('');
              }}
              searchable
              error={errors.stateName}
              leftIcon={<Ionicons name="map-outline" size={16} color="#C8A34D" />}
            />
            {stateName === 'Other' && (
              <TextInput
                label="Enter State / UT Name *"
                placeholder="e.g. Special Administrative Region"
                value={customStateName}
                onChangeText={setCustomStateName}
                error={errors.customStateName}
                leftIcon={<Ionicons name="create-outline" size={16} color="#C8A34D" />}
              />
            )}

            {/* 3. District */}
            <SmartDropdown
              label="District *"
              value={district}
              options={districtOptions}
              onChange={(val) => {
                setDistrict(val);
                if (val !== 'Other') setCustomDistrict('');
                setCourt('');
                setCustomCourt('');
              }}
              searchable
              error={errors.district}
              leftIcon={<Ionicons name="navigate-outline" size={16} color="#C8A34D" />}
            />
            {district === 'Other' && (
              <TextInput
                label="Enter District Name *"
                placeholder="e.g. Jabalpur"
                value={customDistrict}
                onChangeText={setCustomDistrict}
                error={errors.customDistrict}
                leftIcon={<Ionicons name="create-outline" size={16} color="#C8A34D" />}
              />
            )}

            {/* 4. Court Name */}
            <SmartDropdown
              label="Court Name *"
              value={court}
              options={courtOptions}
              onChange={(val) => {
                setCourt(val);
                if (val !== 'Other') setCustomCourt('');
              }}
              searchable
              error={errors.court}
              leftIcon={<Ionicons name="business-outline" size={16} color="#C8A34D" />}
            />
            {court === 'Other' && (
              <TextInput
                label="Enter Court Name *"
                placeholder="e.g. District & Sessions Court Jabalpur"
                value={customCourt}
                onChangeText={setCustomCourt}
                error={errors.customCourt}
                leftIcon={<Ionicons name="create-outline" size={16} color="#C8A34D" />}
              />
            )}

            {/* 5. Judge Name */}
            <TextInput
              label="Judge Name (optional)"
              placeholder="Hon'ble Justice / Magistrate Name"
              value={judgeName}
              onChangeText={setJudgeName}
              leftIcon={<Ionicons name="glasses-outline" size={16} color="#C8A34D" />}
            />

            {/* 6. Case Number */}
            <TextInput
              label="Case Number (optional)"
              placeholder="e.g. O.S. 145 / 2026"
              value={caseNumber}
              onChangeText={setCaseNumber}
              leftIcon={<Ionicons name="barcode-outline" size={16} color="#C8A34D" />}
            />
          </View>
        );

      case 4:
        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Important Dates</Text>

            <SmartDatePicker
              label="Incident Date"
              value={incidentDate}
              onChange={setIncidentDate}
              leftIcon={<Ionicons name="time-outline" size={16} color="#C8A34D" />}
            />

            <SmartDatePicker
              label="Next Hearing Date (optional)"
              value={nextHearingDate}
              onChange={setNextHearingDate}
              leftIcon={<Ionicons name="calendar-outline" size={16} color="#C8A34D" />}
            />
            {errors.incidentDate && <Text style={styles.errorText}>{errors.incidentDate}</Text>}
            {errors.nextHearingDate && <Text style={styles.errorText}>{errors.nextHearingDate}</Text>}
          </View>
        );

      case 5:
        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Case Summary</Text>

            <TextArea
              label="Case Description *"
              placeholder="Describe the case in simple language. Include facts, timeline, legal issues and expected relief."
              value={summary}
              onChangeText={setSummary}
              error={errors.summary}
              inputStyle={{ height: 180 }}
            />

            <View style={[styles.aiTipCard, { backgroundColor: isDark ? 'rgba(124, 92, 255, 0.08)' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5E5E5' }]}>
              <Ionicons name="sparkles-outline" size={15} color="#C8A34D" style={{ marginRight: 6 }} />
              <Text style={styles.aiTipText}>
                AI Tip: The more details you provide, the better AI Legal can assist.
              </Text>
            </View>

            {summary.trim().length > 25 && (
              <View style={[styles.aiSuggestionWizardCard, { backgroundColor: isDark ? '#221B3F' : '#F4F2FF', borderColor: isDark ? '#43377F' : '#D5C7FF' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={16} color="#C8A34D" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>✨ AI detected enough information.</Text>
                </View>
                <Text style={[styles.aiWizardText, { color: theme.textSecondary, marginBottom: 10 }]}>Select features to generate automatically:</Text>
                
                <Pressable 
                  onPress={() => setAiGenerateChecklist(prev => ({ ...prev, timeline: !prev.timeline }))}
                  style={styles.aiOptionRow}
                >
                  <Ionicons name={aiGenerateChecklist.timeline ? "checkbox" : "square-outline"} size={18} color="#C8A34D" />
                  <Text style={[styles.aiOptionText, { color: theme.textPrimary, marginLeft: 8 }]}>Generate timeline</Text>
                </Pressable>

                <Pressable 
                  onPress={() => setAiGenerateChecklist(prev => ({ ...prev, legalIssues: !prev.legalIssues }))}
                  style={styles.aiOptionRow}
                >
                  <Ionicons name={aiGenerateChecklist.legalIssues ? "checkbox" : "square-outline"} size={18} color="#C8A34D" />
                  <Text style={[styles.aiOptionText, { color: theme.textPrimary, marginLeft: 8 }]}>Generate legal issues</Text>
                </Pressable>

                <Pressable 
                  onPress={() => setAiGenerateChecklist(prev => ({ ...prev, documentChecklist: !prev.documentChecklist }))}
                  style={styles.aiOptionRow}
                >
                  <Ionicons name={aiGenerateChecklist.documentChecklist ? "checkbox" : "square-outline"} size={18} color="#C8A34D" />
                  <Text style={[styles.aiOptionText, { color: theme.textPrimary, marginLeft: 8 }]}>Generate document checklist</Text>
                </Pressable>

                <Pressable 
                  onPress={() => setAiGenerateChecklist(prev => ({ ...prev, strategy: !prev.strategy }))}
                  style={styles.aiOptionRow}
                >
                  <Ionicons name={aiGenerateChecklist.strategy ? "checkbox" : "square-outline"} size={18} color="#C8A34D" />
                  <Text style={[styles.aiOptionText, { color: theme.textPrimary, marginLeft: 8 }]}>Generate litigation strategy</Text>
                </Pressable>
              </View>
            )}
          </View>
        );

      case 6:
        return (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Optional Details</Text>

            <TextInput
              label="FIR Number (optional)"
              placeholder="e.g. FIR No. 101/2026"
              value={firNumber}
              onChangeText={setFIRNumber}
              leftIcon={<Ionicons name="lock-closed-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Police Station (optional)"
              placeholder="e.g. Saket Police Station"
              value={policeStation}
              onChangeText={setPoliceStation}
              leftIcon={<Ionicons name="business-outline" size={16} color="#C8A34D" />}
            />

            <TextInput
              label="Reference Number (optional)"
              placeholder="e.g. REF-2026-X12"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              leftIcon={<Ionicons name="bookmark-outline" size={16} color="#C8A34D" />}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent statusBarTranslucent>
      <View style={[
        styles.modalOverlay,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0),
        }
      ]}>
        
        {/* SUCCESS STATE SCREEN */}
        {createdCase ? (
          <View style={styles.successWrapper}>
            <View style={[styles.successBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
              </View>
              <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Case Created Successfully</Text>
              <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                {createdCase.name || `${createdCase.clientName} vs ${createdCase.opponentName}`}
              </Text>

              <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles.successButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    onSuccess(createdCase);
                    onClose();
                  }}
                >
                  <Text style={styles.successButtonText}>View Case Workspace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.successButtonSecondary, { borderColor: theme.border }]}
                  onPress={resetForm}
                >
                  <Text style={[styles.successButtonSecondaryText, { color: theme.textPrimary }]}>Create Another Case</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 8 }}
                  onPress={() => {
                    onSuccess(createdCase);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={[
              styles.header,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              }
            ]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                  {editCaseId ? 'Edit Case' : 'Create New Case'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  Step {step} of 6
                </Text>
              </View>

              {/* Voice AI Dictation Mic Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isRecording ? '#EF4444' : (isDark ? '#2D261A' : '#FEF8EC'),
                  borderColor: isRecording ? '#EF4444' : '#C8A34D',
                  borderWidth: 1.5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginRight: 8,
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
                <Ionicons name={isRecording ? "stop-circle" : "mic"} size={16} color={isRecording ? "#FFFFFF" : "#C8A34D"} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: isRecording ? "#FFFFFF" : "#C8A34D" }}>
                  {isRecording ? `${duration}s Stop` : "🎙️ Voice AI"}
                </Text>
              </TouchableOpacity>

              {Boolean(editCaseId) && (
                <TouchableOpacity
                  onPress={handleSaveCase}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#C8A34D',
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginRight: 4,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Voice AI Dictation Recording Overlay Modal */}
            <Modal visible={isRecording || isTranscribing || isAiVoiceParsing} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <View style={{ width: '100%', maxWidth: 350, backgroundColor: theme.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#C8A34D' }}>
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
                      ? 'Extracting Title, Category, Client, Court, Priority & Summary...'
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

            {/* Dynamic Step Progress Indicator */}
            {renderProgressIndicator()}

            {/* Scrollable Form Wizard Body */}
            <ScrollView
              ref={formScrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View pointerEvents={isSubmitting ? 'none' : 'auto'} style={isSubmitting && { opacity: 0.75 }}>
                {renderStepContent()}
              </View>
            </ScrollView>

            {/* Pinned Sticky Footer */}
            <View style={[
              styles.footer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
              }
            ]}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn, { borderColor: theme.border }, step === 1 && { opacity: 0.3 }]}
                onPress={handlePrevStep}
                disabled={step === 1}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Previous</Text>
              </TouchableOpacity>

              {step < 6 ? (
                <View style={{ flexDirection: 'row', gap: 10, flex: 1.5 }}>
                  {Boolean(editCaseId) && (
                    <TouchableOpacity
                      style={[
                        styles.footerBtn,
                        {
                          backgroundColor: isDark ? '#2D3748' : '#F3F4F6',
                          borderColor: '#C8A34D',
                          borderWidth: 1.5,
                          flex: 1,
                        },
                      ]}
                      onPress={handleSaveCase}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#C8A34D" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="save-outline" size={15} color="#C8A34D" />
                          <Text style={[styles.skipBtnText, { color: '#C8A34D', fontWeight: '700' }]}>Save</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.createBtn, { backgroundColor: theme.primary, flex: Boolean(editCaseId) ? 1.2 : 1 }]}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.createBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.skipBtn, { borderColor: theme.border }]}
                    onPress={handleSaveCase}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.createBtn, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.85 }]}
                    onPress={handleSaveCase}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={[styles.createBtnText, { color: '#FFFFFF' }]}>Saving...</Text>
                      </View>
                    ) : (
                      <Text style={styles.createBtnText}>
                        {editCaseId ? 'Update Case' : 'Create Case'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalOverlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
    color: '#C8A34D',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLine: {
    width: 24,
    height: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  dropdownBox: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datePartLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A9E',
    marginBottom: 4,
  },
  dateInputText: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
  },
  dateCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateConfirm: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 4,
  },
  aiTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  aiTipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C8A34D',
    flex: 1,
  },
  aiSuggestionWizardCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  aiWizardText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  aiOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  aiOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  successWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  successButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  successButtonSecondary: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  footerBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  createBtn: {
    borderRadius: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
