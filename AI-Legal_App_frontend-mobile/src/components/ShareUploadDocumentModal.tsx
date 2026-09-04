import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { CaseWorkspace } from '@/types';
import { Shadows } from '@/theme';
import { useUserStore } from '@/store/user';

interface ShareUploadDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  cases: CaseWorkspace[];
  onSuccess?: (uploadedDoc: any) => void;
}

const CATEGORIES = [
  'Evidence',
  'Court Order',
  'Petition',
  'Affidavit',
  'Notice',
  'Agreement',
  'Contract',
  'Legal Research',
  'Medical Record',
  'Police Report',
  'Invoice',
  'Other',
];

const CONFIDENTIALITY_LEVELS = [
  'Public Within Case',
  'Restricted Team Access',
  'Lead Advocate Only',
  'Private Draft',
];

// Dynamic MOCK_TEAM is replaced by activeTeam from useWorkspaceContext().members

export const ShareUploadDocumentModal: React.FC<ShareUploadDocumentModalProps> = ({
  visible,
  onClose,
  cases = [],
  onSuccess,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { members } = useWorkspaceContext();

  const activeTeam = useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m) => ({
        id: m.id || m.userId,
        name: m.name || m.fullName || 'Team Member',
        role: `${m.role || 'Advocate'} • ${m.department || 'General Practice'}`,
      }));
    }
    return [
      { id: 'owner', name: useUserStore.getState().profile?.name ? (useUserStore.getState().profile?.name?.startsWith('Adv.') ? useUserStore.getState().profile?.name : `Adv. ${useUserStore.getState().profile?.name}`) : 'Adv. Advocate', role: 'Managing Partner' }
    ];
  }, [members]);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');

  // Step 1: Case Selection
  const [selectedCase, setSelectedCase] = useState<CaseWorkspace | null>(null);

  // Step 2: Upload Files Queue
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ id: string; name: string; size: string; type: string }>
  >([
    { id: '1', name: 'Bail_Application_Draft_v1.pdf', size: '2.4 MB', type: 'PDF' },
  ]);
  const [newDocTitleInput, setNewDocTitleInput] = useState('');

  // Step 3: Document Metadata
  const [docTitle, setDocTitle] = useState('Bail Application Draft');
  const [category, setCategory] = useState('Evidence');
  const [description, setDescription] = useState('Pre-trial evidence summary and affidavit annexures.');
  const [version, setVersion] = useState('v1.0');
  const [tags, setTags] = useState('Evidence, Bail, HighCourt');
  const [confidentiality, setConfidentiality] = useState('Public Within Case');

  // Step 4: Visibility & Sharing
  const [visibility, setVisibility] = useState<'entire' | 'selected' | 'lead' | 'private'>('entire');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    'Adv. Rajesh Sharma',
    'Adv. Priya Sharma',
    'Adv. Amit Kumar',
  ]);

  // Step 5: Notification Settings
  const [notificationChannels, setNotificationChannels] = useState<string[]>([
    'In-App Notification',
    'Email',
    'WhatsApp',
  ]);

  // Step 6: Sender Note
  const [senderNote, setSenderNote] = useState('Please review this evidence document before tomorrow\'s court hearing.');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCases = useMemo(() => {
    if (!caseSearchQuery.trim()) return cases;
    const q = caseSearchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.clientName?.toLowerCase().includes(q) ||
        c.courtName?.toLowerCase().includes(q)
    );
  }, [cases, caseSearchQuery]);

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCase(null);
    setUploadQueue([{ id: '1', name: 'Bail_Application_Draft_v1.pdf', size: '2.4 MB', type: 'PDF' }]);
    setDocTitle('Bail Application Draft');
    setCategory('Evidence');
    setDescription('Pre-trial evidence summary and affidavit annexures.');
    setVisibility('entire');
    setSenderNote('Please review this evidence document before tomorrow\'s court hearing.');
  };

  const handleNext = () => {
    let targetCase = selectedCase;
    if (currentStep === 1) {
      if (!targetCase && filteredCases.length > 0) {
        targetCase = filteredCases[0];
        setSelectedCase(targetCase);
      }
      if (!targetCase) {
        showToast('error', 'Select Case', 'Please select a case to proceed with document sharing.');
        return;
      }
    }
    if (currentStep === 2 && uploadQueue.length === 0) {
      showToast('error', 'Add Document', 'Please add at least one document to the upload queue.');
      return;
    }
    if (currentStep === 3 && !docTitle.trim()) {
      showToast('error', 'Required Field', 'Please enter a Document Title.');
      return;
    }
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onClose();
    }
  };

  const handleAddDemoFile = (typeLabel: string) => {
    const fileName = `${newDocTitleInput.trim() || 'Document'}_${Date.now().toString().slice(-4)}.${typeLabel.toLowerCase()}`;
    const newFile = {
      id: Date.now().toString(),
      name: fileName,
      size: '1.8 MB',
      type: typeLabel,
    };
    setUploadQueue([...uploadQueue, newFile]);
    if (!docTitle) setDocTitle(fileName.split('.')[0]);
    setNewDocTitleInput('');
    showToast('success', 'File Added', `${fileName} added to upload queue.`);
  };

  const toggleRecipient = (name: string) => {
    if (selectedRecipients.includes(name)) {
      setSelectedRecipients(selectedRecipients.filter((n) => n !== name));
    } else {
      setSelectedRecipients([...selectedRecipients, name]);
    }
  };

  const toggleNotificationChannel = (channel: string) => {
    if (notificationChannels.includes(channel)) {
      setNotificationChannels(notificationChannels.filter((c) => c !== channel));
    } else {
      setNotificationChannels([...notificationChannels, channel]);
    }
  };

  const handleUploadSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const docResult = {
        id: `DOC-${Date.now().toString().slice(-6)}`,
        name: docTitle || 'Case_Document.pdf',
        category: category,
        caseName: selectedCase?.name || 'Litigation Workspace',
        sharedWith: visibility === 'entire' ? 'Entire Case Team' : `${selectedRecipients.length} Members`,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      showToast('success', '✅ Document Uploaded & Shared', `${docResult.name} saved to ${docResult.caseName}.`);
      if (onSuccess) onSuccess(docResult);
      resetForm();
      onClose();
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Full-Page Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Share / Upload Document</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {selectedCase ? `Selected: ${selectedCase.name}` : 'Step ' + currentStep + ' of 7 — Case-centric file collaboration.'}
            </Text>
          </View>
          <View style={[styles.stepPill, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#C8A34D' }}>Step {currentStep}/7</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* STEP 1: SELECT CASE */}
          {currentStep === 1 && (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>📁 Step 1 — Select Target Case</Text>
                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                  Choose the active litigation workspace where you want to upload and share documents.
                </Text>
              </View>

              <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search active firm cases..."
                  placeholderTextColor={theme.textMuted}
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  value={caseSearchQuery}
                  onChangeText={setCaseSearchQuery}
                />
              </View>

              {filteredCases.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="folder-open-outline" size={36} color="#C8A34D" />
                  <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No Cases Found</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Create a case workspace first to start sharing files.</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {filteredCases.map((c) => {
                    const isSelected =
                      selectedCase === c ||
                      (selectedCase?._id && c._id && selectedCase._id === c._id) ||
                      (selectedCase?.id && c.id && selectedCase.id === c.id);
                    return (
                      <TouchableOpacity
                        key={c._id || c.id}
                        style={[
                          styles.caseCard,
                          {
                            backgroundColor: isSelected ? (isDark ? '#2D234D' : '#FEF8EC') : theme.card,
                            borderColor: isSelected ? '#C8A34D' : theme.border,
                          },
                          Shadows.sm,
                        ]}
                        onPress={() => setSelectedCase(c)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.caseTitle, { color: isSelected ? '#C8A34D' : theme.textPrimary }]}>{c.name}</Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                        </View>
                        <Text style={[styles.caseMeta, { color: theme.textSecondary }]}>
                          Client: {c.clientName || 'Private Client'} • {c.courtName || 'District Court'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                          <Text style={{ fontSize: 10.5, color: theme.textMuted }}>👨‍⚖️ Lead: Adv. Rajesh Sharma</Text>
                          <Text style={{ fontSize: 10.5, color: theme.textMuted }}>📁 Docs: {c.documents?.length || 12}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* STEP 2: UPLOAD DOCUMENT */}
          {currentStep === 2 && (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>📄 Step 2 — Upload Document Files</Text>
                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                  Select or scan files to add to the upload queue for <Text style={{ fontWeight: '800' }}>{selectedCase?.name}</Text>.
                </Text>
              </View>

              <View style={[styles.uploadBox, { backgroundColor: isDark ? '#222228' : '#FFFBEB', borderColor: '#C8A34D' }]}>
                <Ionicons name="cloud-upload-outline" size={36} color="#C8A34D" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginTop: 6 }}>
                  Import or Drag Legal Files
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                  Supports PDF, DOCX, XLSX, PPT, JPG, PNG, ZIP (Max 50MB)
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                  {['PDF', 'DOCX', 'Image', 'Scan'].map((fmt) => (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.fmtBtn, { backgroundColor: '#C8A34D' }]}
                      onPress={() => handleAddDemoFile(fmt)}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add {fmt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Upload Queue List */}
              {uploadQueue.length > 0 && (
                <View>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Queue Files ({uploadQueue.length})</Text>
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {uploadQueue.map((item) => (
                      <View key={item.id} style={[styles.queueCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="document-text-outline" size={20} color="#C8A34D" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fileName, { color: theme.textPrimary }]}>{item.name}</Text>
                          <Text style={[styles.fileMeta, { color: theme.textSecondary }]}>{item.size} • {item.type}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setUploadQueue(uploadQueue.filter((f) => f.id !== item.id))}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* STEP 3: DOCUMENT DETAILS */}
          {currentStep === 3 && (
            <View style={{ gap: 12 }}>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>🏷️ Step 3 — Document Details & Tags</Text>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Document Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                value={docTitle}
                onChangeText={setDocTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confidentiality Level</Text>
              <View style={{ gap: 6 }}>
                {CONFIDENTIALITY_LEVELS.map((lvl) => {
                  const active = confidentiality === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.radioItem,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F9FAFB'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => setConfidentiality(lvl)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '500', color: active ? '#C8A34D' : theme.textPrimary }}>
                        {lvl}
                      </Text>
                      {active && <Ionicons name="radio-button-on" size={16} color="#C8A34D" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4: VISIBILITY & SHARING */}
          {currentStep === 4 && (
            <View style={{ gap: 12 }}>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>🔒 Step 4 — Visibility & Access Sharing</Text>

              {[
                { id: 'entire', title: 'Entire Case Team', desc: 'Everyone assigned to this case workspace receives access.' },
                { id: 'selected', title: 'Selected Members Only', desc: 'Specify team members with access rights.' },
                { id: 'lead', title: 'Lead Advocate Only', desc: 'Restricted exclusively to senior lead counsel.' },
                { id: 'private', title: 'Private Draft', desc: 'Visible only to you as the uploader.' },
              ].map((opt) => {
                const active = visibility === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.visCard,
                      {
                        backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F9FAFB'),
                        borderColor: active ? '#C8A34D' : theme.border,
                      },
                    ]}
                    onPress={() => setVisibility(opt.id as any)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.visTitle, { color: active ? '#C8A34D' : theme.textPrimary }]}>{opt.title}</Text>
                      {active && <Ionicons name="checkmark-circle" size={18} color="#C8A34D" />}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3 }}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Selected Members Checkbox Roster */}
              {visibility === 'selected' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Select Case Members</Text>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {activeTeam.map((m: any) => {
                      const checked = selectedRecipients.includes(m.name);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.rosterRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                          onPress={() => toggleRecipient(m.name)}
                        >
                          <Ionicons
                            name={checked ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={checked ? '#C8A34D' : theme.textMuted}
                            style={{ marginRight: 8 }}
                          />
                          <View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>{m.name}</Text>
                            <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>{m.role}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* STEP 5 & 6: NOTIFICATIONS & NOTE */}
          {currentStep === 5 && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>🔔 Step 5 — Notification Delivery</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['In-App Notification', 'Email', 'WhatsApp', 'SMS'].map((ch) => {
                  const active = notificationChannels.includes(ch);
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? '#C8A34D' : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => toggleNotificationChannel(ch)}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={14}
                        color={active ? '#FFFFFF' : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 11.5, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {currentStep === 6 && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>💬 Step 6 — Personal Note for Team</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary },
                ]}
                multiline
                numberOfLines={4}
                value={senderNote}
                onChangeText={setSenderNote}
              />
            </View>
          )}

          {/* STEP 7: PREVIEW BEFORE UPLOAD */}
          {currentStep === 7 && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>📋 Step 7 — Preview & Confirm Upload</Text>

              <View style={[styles.previewCard, { backgroundColor: isDark ? '#1F2937' : '#FEF8EC', borderColor: '#C8A34D' }]}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F9FAFB' : '#92400E' }}>
                  Execution Confirmation Summary
                </Text>
                <View style={{ gap: 4, marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    <Text style={{ fontWeight: '700' }}>Target Case:</Text> {selectedCase?.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    <Text style={{ fontWeight: '700' }}>Document Title:</Text> {docTitle} ({category})
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    <Text style={{ fontWeight: '700' }}>Queue Files:</Text> {uploadQueue.length} File(s)
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    <Text style={{ fontWeight: '700' }}>Visibility:</Text> {visibility.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    <Text style={{ fontWeight: '700' }}>Notifications:</Text> {notificationChannels.join(', ')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* STEP NAVIGATION BUTTONS */}
          <View style={styles.btnRow}>
            {currentStep > 1 && (
              <TouchableOpacity style={[styles.navBtn, { borderColor: theme.border }]} onPress={handleBack}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 7 ? (
              <TouchableOpacity style={[styles.navBtn, { backgroundColor: '#C8A34D', flex: 1 }]} onPress={handleNext}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Next Step →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: '#C8A34D', flex: 1, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={handleUploadSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>Upload & Share</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  stepPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  stepSub: {
    fontSize: 11.5,
    marginTop: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  caseCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  caseTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  caseMeta: {
    fontSize: 11.5,
    marginTop: 4,
  },
  emptyBox: {
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  uploadBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  fmtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '700',
  },
  fileMeta: {
    fontSize: 10.5,
  },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  visCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  visTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: {
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  previewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  navBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
