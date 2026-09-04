import React, { useState } from 'react';
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
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { Shadows } from '@/theme';

interface CreateFirmWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateFirmWorkspaceModal: React.FC<CreateFirmWorkspaceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Workspace Information
  const [workspaceName, setWorkspaceName] = useState('');
  const [clientName, setClientName] = useState('');
  const [practiceArea, setPracticeArea] = useState('Family Law');
  const [caseType, setCaseType] = useState('Litigation');
  const [priority, setPriority] = useState('High');

  // Step 2: Client Details
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [inviteClient, setInviteClient] = useState(true);

  // Step 3: Team Assignment
  const [assignedRoles, setAssignedRoles] = useState<string[]>(['Senior Advocate', 'Junior Advocate']);
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({
    'Read Only': false,
    'Edit Documents': true,
    'Upload Evidence': true,
    'Draft Creation': true,
    'Full Access': false,
  });

  // Step 4: Court & Matter Details
  const [courtName, setCourtName] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [courtHall, setCourtHall] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [nextHearing, setNextHearing] = useState('');
  const [description, setDescription] = useState('');

  // Step 5: Initial Setup (Modules)
  const [enabledModules, setEnabledModules] = useState<{ [key: string]: boolean }>({
    Drafts: true,
    'Evidence Vault': true,
    Documents: true,
    'Hearings Docket': true,
    Contracts: true,
    'Legal Research': true,
    'Tasks & Operations': true,
    'AI Firm Assistant': true,
  });

  const resetForm = () => {
    setCurrentStep(1);
    setWorkspaceName('');
    setClientName('');
    setPracticeArea('Family Law');
    setCaseType('Litigation');
    setPriority('High');
    setClientMobile('');
    setClientEmail('');
    setClientAddress('');
    setInviteClient(true);
    setCourtName('');
    setJudgeName('');
    setCourtHall('');
    setCaseNumber('');
    setNextHearing('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 1 && !workspaceName.trim()) {
      showToast('error', 'Required Field', 'Please enter a Workspace Name.');
      return;
    }
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleRole = (role: string) => {
    if (assignedRoles.includes(role)) {
      setAssignedRoles(assignedRoles.filter((r) => r !== role));
    } else {
      setAssignedRoles([...assignedRoles, role]);
    }
  };

  const togglePermission = (perm: string) => {
    setPermissions({ ...permissions, [perm]: !permissions[perm] });
  };

  const toggleModule = (mod: string) => {
    setEnabledModules({ ...enabledModules, [mod]: !enabledModules[mod] });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await CaseService.createCase({
        name: workspaceName,
        caseType: practiceArea,
        status: 'Active',
        priority: priority as any,
        clientName: clientName || 'Walk-in Client',
        courtName: courtName || 'District Court',
        description: description || `Practice Area: ${practiceArea}, Case Type: ${caseType}`,
        caseNumber: caseNumber || undefined,
        judgeName: judgeName || undefined,
      } as any);

      showToast('success', 'Firm Workspace Created Successfully', `${workspaceName} is ready for team collaboration.`);
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast('error', 'Creation Failed', err?.message || 'Unable to create firm workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    'Workspace Info',
    'Client Details',
    'Team Assignment',
    'Court Details',
    'Initial Setup',
    'Review',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Create Firm Workspace</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
              Step {currentStep} of 6 — {stepsList[currentStep - 1]}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: isDark ? '#262626' : '#E5E7EB' }]}>
          <View
            style={[
              styles.progressBar,
              { width: `${(currentStep / 6) * 100}%`, backgroundColor: '#C8A34D' },
            ]}
          />
        </View>

        {/* Step Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: Workspace Information */}
          {currentStep === 1 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Workspace Information</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Define the core title and litigation practice area for your law firm workspace.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Workspace Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Rajesh Sharma Divorce Matter"
                placeholderTextColor={theme.placeholder}
                value={workspaceName}
                onChangeText={setWorkspaceName}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Client Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Rajesh Sharma"
                placeholderTextColor={theme.placeholder}
                value={clientName}
                onChangeText={setClientName}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Practice Area</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {['Family Law', 'Corporate', 'Criminal', 'Civil', 'Arbitration', 'Property', 'Tax'].map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: practiceArea === area ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: practiceArea === area ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setPracticeArea(area)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: practiceArea === area ? '#FFFFFF' : theme.textSecondary }}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Case Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {['Litigation', 'Advisory', 'Compliance', 'Appeals', 'Arbitration'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: caseType === type ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: caseType === type ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setCaseType(type)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: caseType === type ? '#FFFFFF' : theme.textSecondary }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Priority Level</Text>
              <View style={styles.prioRow}>
                {['Low', 'Medium', 'High', 'Urgent'].map((prio) => (
                  <TouchableOpacity
                    key={prio}
                    style={[
                      styles.chip,
                      {
                        flex: 1,
                        alignItems: 'center',
                        backgroundColor: priority === prio ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                        borderColor: priority === prio ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setPriority(prio)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: priority === prio ? '#FFFFFF' : theme.textSecondary }}>
                      {prio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: Client Details */}
          {currentStep === 2 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Client Details</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Add or select client contact information for communication and portal updates.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Client Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Ramesh Chandra Agrawal"
                placeholderTextColor={theme.placeholder}
                value={clientName}
                onChangeText={setClientName}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Mobile Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={theme.placeholder}
                value={clientMobile}
                onChangeText={setClientMobile}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="client@lawfirm.com"
                keyboardType="email-address"
                placeholderTextColor={theme.placeholder}
                value={clientEmail}
                onChangeText={setClientEmail}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Residential / Office Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Flat 402, Apex Heights, Mumbai"
                placeholderTextColor={theme.placeholder}
                value={clientAddress}
                onChangeText={setClientAddress}
              />

              <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Invite Client to AI LEGAL Portal</Text>
                  <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                    Allows client to view hearing dates and progress updates safely.
                  </Text>
                </View>
                <Switch
                  value={inviteClient}
                  onValueChange={setInviteClient}
                  trackColor={{ false: '#767577', true: '#C8A34D' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}

          {/* STEP 3: Team Assignment */}
          {currentStep === 3 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Team Assignment</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Select firm members to collaborate on this workspace and configure permission levels.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Assign Member Roles</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {[
                  'Managing Partner',
                  'Senior Advocate',
                  'Junior Advocate',
                  'Associate',
                  'Paralegal',
                  'Intern',
                  'Research Associate',
                ].map((role) => {
                  const selected = assignedRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.checkRow,
                        {
                          backgroundColor: selected ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                          borderColor: selected ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => toggleRole(role)}
                    >
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selected ? '#C8A34D' : theme.textMuted}
                      />
                      <Text style={[styles.checkText, { color: selected ? '#C8A34D' : theme.textPrimary, fontWeight: selected ? '800' : '600' }]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Default Permissions</Text>
              <View style={{ gap: 8 }}>
                {['Read Only', 'Edit Documents', 'Upload Evidence', 'Draft Creation', 'Full Access'].map((perm) => {
                  const active = permissions[perm];
                  return (
                    <TouchableOpacity
                      key={perm}
                      style={[
                        styles.checkRow,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => togglePermission(perm)}
                    >
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={active ? '#C8A34D' : theme.textMuted}
                      />
                      <Text style={[styles.checkText, { color: active ? '#C8A34D' : theme.textPrimary, fontWeight: active ? '800' : '600' }]}>
                        {perm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4: Court & Matter Details */}
          {currentStep === 4 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Court & Matter Details</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Enter judicial court, judge, room, and next scheduled hearing dates.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Court Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Bombay High Court"
                placeholderTextColor={theme.placeholder}
                value={courtName}
                onChangeText={setCourtName}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Presiding Judge Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Hon. Justice D. Y. Patil"
                placeholderTextColor={theme.placeholder}
                value={judgeName}
                onChangeText={setJudgeName}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Court Hall / Room Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Court Room No. 14"
                placeholderTextColor={theme.placeholder}
                value={courtHall}
                onChangeText={setCourtHall}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Case / Petition Number (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. WP/2026/4590"
                placeholderTextColor={theme.placeholder}
                value={caseNumber}
                onChangeText={setCaseNumber}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Next Scheduled Hearing</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. 25th July 2026, 10:30 AM"
                placeholderTextColor={theme.placeholder}
                value={nextHearing}
                onChangeText={setNextHearing}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Matter Description & Brief Summary</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary, height: 75 }]}
                placeholder="Enter background notes, key dispute points, or relief sought..."
                multiline
                placeholderTextColor={theme.placeholder}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}

          {/* STEP 5: Initial Setup (Module Enablement) */}
          {currentStep === 5 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Initial Setup & Modules</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Choose which collaborative tools should be active in this workspace.
              </Text>

              <View style={{ gap: 10, marginTop: 10 }}>
                {[
                  { name: 'Drafts', icon: 'document-text-outline', desc: 'AI Pleading & Bail Draft Studio' },
                  { name: 'Evidence Vault', icon: 'shield-checkmark-outline', desc: 'Encrypted document & forensics store' },
                  { name: 'Documents', icon: 'folder-open-outline', desc: 'Case filings & client correspondence' },
                  { name: 'Hearings Docket', icon: 'calendar-outline', desc: 'Court date tracking & automated alerts' },
                  { name: 'Contracts', icon: 'briefcase-outline', desc: 'Agreement review & AI Clause analysis' },
                  { name: 'Legal Research', icon: 'search-circle-outline', desc: 'IPC & Supreme Court precedent search' },
                  { name: 'Tasks & Operations', icon: 'checkbox-outline', desc: 'Team task board & work assignments' },
                  { name: 'AI Firm Assistant', icon: 'sparkles-outline', desc: 'Dedicated firm AI intelligence context' },
                ].map((mod) => {
                  const isEnabled = enabledModules[mod.name];
                  return (
                    <TouchableOpacity
                      key={mod.name}
                      style={[
                        styles.moduleCard,
                        {
                          backgroundColor: isEnabled ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                          borderColor: isEnabled ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => toggleModule(mod.name)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons name={mod.icon as any} size={22} color={isEnabled ? '#C8A34D' : theme.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.moduleName, { color: isEnabled ? '#C8A34D' : theme.textPrimary }]}>
                            {mod.name}
                          </Text>
                          <Text style={[styles.moduleDesc, { color: theme.textSecondary }]}>{mod.desc}</Text>
                        </View>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleModule(mod.name)}
                        trackColor={{ false: '#767577', true: '#C8A34D' }}
                        thumbColor="#FFFFFF"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 6: Review & Confirm */}
          {currentStep === 6 && (
            <View style={styles.stepBox}>
              <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Review & Create Workspace</Text>
              <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                Review all configuration details before initializing your Firm Workspace.
              </Text>

              <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.sm]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Workspace Name:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{workspaceName || 'Untitled Workspace'}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Client Name:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{clientName || 'Walk-in Client'}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Practice Area:</Text>
                  <Text style={[styles.summaryVal, { color: '#C8A34D' }]}>{practiceArea} ({caseType})</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Court Details:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>
                    {courtName || 'District Court'} {courtHall ? `• ${courtHall}` : ''}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Assigned Roles:</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{assignedRoles.join(', ')}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Active Modules:</Text>
                  <Text style={[styles.summaryVal, { color: '#10B981' }]}>
                    {Object.keys(enabledModules).filter((m) => enabledModules[m]).length} Modules Connected
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Navigation Buttons */}
        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: (insets.bottom || 16) + 8 }]}>
          {currentStep > 1 ? (
            <TouchableOpacity style={[styles.navBtn, styles.backBtn, { borderColor: theme.border }]} onPress={handleBack}>
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {currentStep < 6 ? (
            <TouchableOpacity style={[styles.navBtn, { backgroundColor: '#C8A34D' }]} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Next Step →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: '#C8A34D' }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.nextBtnText}>Create Workspace</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepBox: {
    gap: 10,
  },
  stepHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chipRow: {
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  prioRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkText: {
    fontSize: 13,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: '800',
  },
  moduleDesc: {
    fontSize: 10.5,
    marginTop: 1,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
