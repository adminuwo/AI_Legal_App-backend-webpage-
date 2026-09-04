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
  Pressable,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, useToastContext, useWorkspaceContext } from '@/providers';
import { apiClient } from '../api/client';
import { Shadows } from '@/theme';

interface InviteTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newMember: any) => void;
}

const PROFESSIONAL_ROLES = [
  { title: 'Managing Partner', desc: 'Executive leadership, full firm oversight and policy management.' },
  { title: 'Senior Advocate', desc: 'Senior counsel leading high-stakes litigation & strategy.' },
  { title: 'Partner', desc: 'Equity/Salaried partner managing department cases & clients.' },
  { title: 'Associate Advocate', desc: 'Handles active litigation, drafting, and client representation.' },
  { title: 'Junior Advocate', desc: 'Handles drafting, court hearings, and legal research.' },
  { title: 'Legal Consultant', desc: 'Specialist providing expert legal opinions & strategy.' },
  { title: 'Research Associate', desc: 'Performs case law research, precedent analysis, and drafting support.' },
  { title: 'Paralegal', desc: 'Assists with file management, compliance, and documentation.' },
  { title: 'Evidence Clerk', desc: 'Manages document indexing, OCR tags, and physical evidence records.' },
  { title: 'Court Clerk', desc: 'Manages court filings, hearing dates, and registry follow-ups.' },
  { title: 'Legal Intern', desc: 'Trainee assisting with research, summaries, and observation.' },
  { title: 'Admin Staff', desc: 'Manages office operations, scheduling, and firm communication.' },
  { title: 'Accounts', desc: 'Handles billing, retainer invoices, and fee records.' },
  { title: 'Custom Role', desc: 'Custom defined firm role and responsibilities.' },
];

const DEPARTMENTS = [
  'Civil Litigation',
  'Criminal Litigation',
  'Corporate Law',
  'Family Law',
  'Taxation',
  'Labour Law',
  'Property Law',
  'IPR',
  'Arbitration',
  'General Practice',
  'Custom',
];

const PERMISSIONS = [
  { level: 'View Only', desc: 'Can view assigned files & dockets; cannot edit or upload.' },
  { level: 'Standard Member', desc: 'Can draft, view, and comment on assigned firm matters.' },
  { level: 'Case Editor', desc: 'Full editing rights for case briefs, evidence, and documents.' },
  { level: 'Manager', desc: 'Department-wide management, case assignment, and review permissions.' },
  { level: 'Administrator', desc: 'Full firm workspace ownership, RBAC permissions, and billing control.' },
];

const WORKSPACE_MODULES = [
  'Firm Dashboard',
  'Cases',
  'Documents',
  'Evidence',
  'Tasks',
  'Hearings',
  'Calendar',
  'Research',
  'AI Assistant',
  'Reports',
  'Billing',
  'Client CRM',
];

export const InviteTeamMemberModal: React.FC<InviteTeamMemberModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { activeWorkspace, workspaces, refreshTeamMembers } = useWorkspaceContext();
  const insets = useSafeAreaInsets();

  const targetWorkspace = useMemo(() => {
    if (activeWorkspace && activeWorkspace.id !== 'personal_practice') {
      return activeWorkspace;
    }
    const firmWs = Array.isArray(workspaces) ? workspaces.find((w) => w.id !== 'personal_practice' || w.type === 'law_firm') : null;
    return firmWs || activeWorkspace;
  }, [activeWorkspace, workspaces]);

  // Section 1: Member Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [barCouncilNo, setBarCouncilNo] = useState('');
  const [stateBarCouncil, setStateBarCouncil] = useState('Delhi Bar Council');

  // Section 2: Role
  const [selectedRole, setSelectedRole] = useState('Junior Advocate');
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);

  // Section 3: Department
  const [selectedDept, setSelectedDept] = useState('Civil Litigation');
  const [isDeptPickerOpen, setIsDeptPickerOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');

  // Section 4: Permission
  const [selectedPermission, setSelectedPermission] = useState('Standard Member');
  const [isPermissionPickerOpen, setIsPermissionPickerOpen] = useState(false);

  // Section 5: Workspace Modules Access (Accordion)
  const [isModulesExpanded, setIsModulesExpanded] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'Firm Dashboard',
    'Cases',
    'Documents',
    'Evidence',
    'Tasks',
    'Hearings',
    'Research',
    'AI Assistant',
  ]);

  // Section 7: Personal Message
  const [personalMessage, setPersonalMessage] = useState('Welcome to our law firm! Please join our AI LEGAL workspace to collaborate on cases.');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Departments
  const filteredDepts = useMemo(() => {
    if (!deptSearchQuery.trim()) return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => d.toLowerCase().includes(deptSearchQuery.toLowerCase()));
  }, [deptSearchQuery]);

  const selectedRoleObj = useMemo(() => {
    return PROFESSIONAL_ROLES.find((r) => r.title === selectedRole) || PROFESSIONAL_ROLES[4];
  }, [selectedRole]);

  const selectedPermissionObj = useMemo(() => {
    return PERMISSIONS.find((p) => p.level === selectedPermission) || PERMISSIONS[1];
  }, [selectedPermission]);

  const toggleModule = (mod: string) => {
    if (selectedModules.includes(mod)) {
      setSelectedModules(selectedModules.filter((m) => m !== mod));
    } else {
      setSelectedModules([...selectedModules, mod]);
    }
  };


  const handleSendInvitation = async () => {
    if (!fullName.trim()) {
      showToast('error', 'Required Field', 'Please enter Full Name.');
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      showToast('error', 'Contact Required', 'Please provide either Email Address or Mobile Number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/workspaces/${targetWorkspace.id}/invitations`, {
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        role: selectedRole,
        department: selectedDept,
        permission: selectedPermission,
        modules: selectedModules,
        personalMessage,
        barCouncilNo: barCouncilNo.trim(),
        stateBarCouncil
      });

      setIsSubmitting(false);

      if (res.data && res.data.success) {
        showToast('success', '✅ Invitation Sent Successfully', 'The invitation has been delivered automatically.');
        refreshTeamMembers(targetWorkspace.id);
        if (onSuccess) onSuccess(res.data.invitation);
        onClose();
      } else {
        showToast('error', 'Failed to send invitation', res.data.error || 'Something went wrong.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      showToast('error', 'Failed to send invitation', err.message || 'Network error.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top || 16 }]}
      >
        {/* Full-Page Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Invite Team Member</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              Invite advocates and legal staff to join your firm's AI LEGAL workspace.
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* SECTION 1: MEMBER INFORMATION */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-add-outline" size={18} color="#C8A34D" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>1. Member Information</Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. Adv. Amit Kumar"
              placeholderTextColor={theme.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="advocate@firm.com"
                  keyboardType="email-address"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mobile Number *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.textMuted}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Bar Council No. (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="D/1234/2020"
                  placeholderTextColor={theme.textMuted}
                  value={barCouncilNo}
                  onChangeText={setBarCouncilNo}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>State Bar Council</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Delhi Bar Council"
                  placeholderTextColor={theme.textMuted}
                  value={stateBarCouncil}
                  onChangeText={setStateBarCouncil}
                />
              </View>
            </View>
          </View>

          {/* SECTION 2 & 3: ROLE & DEPARTMENT (DROPDOWNS) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="briefcase-outline" size={18} color="#C8A34D" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>2. Role & Department</Text>
            </View>

            {/* Professional Role Dropdown */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Professional Role *</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}
              onPress={() => setIsRolePickerOpen(true)}
            >
              <Text style={[styles.dropdownValue, { color: theme.textPrimary }]}>{selectedRole}</Text>
              <Ionicons name="chevron-down" size={18} color="#C8A34D" />
            </TouchableOpacity>
            <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>{selectedRoleObj.desc}</Text>

            {/* Department Dropdown */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Department *</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}
              onPress={() => setIsDeptPickerOpen(true)}
            >
              <Text style={[styles.dropdownValue, { color: theme.textPrimary }]}>{selectedDept}</Text>
              <Ionicons name="chevron-down" size={18} color="#C8A34D" />
            </TouchableOpacity>
          </View>

          {/* SECTION 4: PERMISSION LEVEL (SINGLE SELECT DROPDOWN) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#C8A34D" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>3. Default Permission Level</Text>
            </View>

            <TouchableOpacity
              style={[styles.dropdownTrigger, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}
              onPress={() => setIsPermissionPickerOpen(true)}
            >
              <Text style={[styles.dropdownValue, { color: theme.textPrimary }]}>{selectedPermission}</Text>
              <Ionicons name="chevron-down" size={18} color="#C8A34D" />
            </TouchableOpacity>

            <View style={[styles.descBanner, { backgroundColor: isDark ? '#2D234D' : '#FEF8EC', borderColor: '#C8A34D' }]}>
              <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '800', color: '#C8A34D' }}>{selectedPermissionObj.level}:</Text> {selectedPermissionObj.desc}
              </Text>
            </View>
          </View>

          {/* SECTION 5: WORKSPACE MODULES (EXPANDABLE ACCORDION) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => setIsModulesExpanded(!isModulesExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="grid-outline" size={18} color="#C8A34D" />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>4. Workspace Module Access</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.pillBadge, { backgroundColor: 'rgba(200, 163, 77, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#C8A34D' }}>
                    {selectedModules.length} Modules Selected
                  </Text>
                </View>
                <Ionicons name={isModulesExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#C8A34D" />
              </View>
            </TouchableOpacity>

            {isModulesExpanded && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {WORKSPACE_MODULES.map((mod) => {
                  const active = selectedModules.includes(mod);
                  return (
                    <TouchableOpacity
                      key={mod}
                      style={[
                        styles.modChip,
                        {
                          backgroundColor: active ? (isDark ? '#2D234D' : '#FEF8EC') : (isDark ? '#222228' : '#F3F4F6'),
                          borderColor: active ? '#C8A34D' : theme.border,
                        },
                      ]}
                      onPress={() => toggleModule(mod)}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={15}
                        color={active ? '#C8A34D' : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#C8A34D' : theme.textSecondary }}>
                        {mod}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* SECTION 6: INVITATION DELIVERY (INFORMATIONAL CARD) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="paper-plane-outline" size={18} color="#C8A34D" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>5. Invitation Delivery</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: isDark ? '#222228' : '#F3F4F6', borderColor: theme.border }]}>
              <Text style={[styles.infoCardTitle, { color: theme.textPrimary }]}>AI LEGAL Smart Delivery</Text>
              <Text style={[styles.infoCardText, { color: theme.textSecondary }]}>
                • Existing AI LEGAL users receive an instant in-app notification and email.{"\n"}
                • New users receive an email invitation with download and account setup instructions.{"\n"}
                • WhatsApp invitations are sent automatically if your firm has enabled WhatsApp integration.
              </Text>
            </View>
          </View>

          {/* SECTION 7: PERSONAL MESSAGE */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={18} color="#C8A34D" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>6. Personal Welcome Message</Text>
            </View>

            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary },
              ]}
              multiline
              numberOfLines={2}
              placeholder="Enter personal welcome note..."
              placeholderTextColor={theme.textMuted}
              value={personalMessage}
              onChangeText={setPersonalMessage}
            />
          </View>

          {/* SUMMARY PREVIEW CARD */}
          <View style={[styles.previewCard, { backgroundColor: isDark ? '#1F2937' : '#FEF8EC', borderColor: '#C8A34D' }]}>
            <Text style={[styles.previewTitle, { color: isDark ? '#F9FAFB' : '#92400E' }]}>📋 Invitation Summary Preview</Text>
            <View style={{ gap: 3, marginTop: 6 }}>
              <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '700' }}>Invitee:</Text> {fullName || 'Full Name'} ({email || mobile || 'Contact'})
              </Text>
              <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '700' }}>Role & Dept:</Text> {selectedRole} • {selectedDept}
              </Text>
              <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '700' }}>Permission:</Text> {selectedPermission} ({selectedModules.length} Modules)
              </Text>
              <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '700' }}>Delivery:</Text> Automatic (Smart Router)
              </Text>
            </View>
          </View>

          {/* PRIMARY ACTION BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#C8A34D', opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleSendInvitation}
            disabled={isSubmitting}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* BOTTOM SHEET 1: SEARCHABLE DEPARTMENT PICKER */}
      <Modal visible={isDeptPickerOpen} transparent animationType="slide" onRequestClose={() => setIsDeptPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsDeptPickerOpen(false)}>
          <Pressable style={[styles.sheetContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Department</Text>
              <TouchableOpacity onPress={() => setIsDeptPickerOpen(false)}>
                <Ionicons name="close-circle" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.sheetSearchBar, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={16} color="#C8A34D" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search Department..."
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={deptSearchQuery}
                onChangeText={setDeptSearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {filteredDepts.map((dept) => {
                const active = selectedDept === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.sheetRowItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedDept(dept);
                      setIsDeptPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.sheetRowText, { color: active ? '#C8A34D' : theme.textPrimary, fontWeight: active ? '800' : '500' }]}>
                      {dept}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* BOTTOM SHEET 2: PROFESSIONAL ROLE PICKER */}
      <Modal visible={isRolePickerOpen} transparent animationType="slide" onRequestClose={() => setIsRolePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsRolePickerOpen(false)}>
          <Pressable style={[styles.sheetContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Professional Role</Text>
              <TouchableOpacity onPress={() => setIsRolePickerOpen(false)}>
                <Ionicons name="close-circle" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {PROFESSIONAL_ROLES.map((r) => {
                const active = selectedRole === r.title;
                return (
                  <TouchableOpacity
                    key={r.title}
                    style={[styles.sheetRowItem, { borderBottomColor: theme.border, flexDirection: 'column', alignItems: 'flex-start' }]}
                    onPress={() => {
                      setSelectedRole(r.title);
                      setIsRolePickerOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Text style={[styles.sheetRowText, { color: active ? '#C8A34D' : theme.textPrimary, fontWeight: active ? '800' : '600' }]}>
                        {r.title}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{r.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* BOTTOM SHEET 3: PERMISSION LEVEL PICKER */}
      <Modal visible={isPermissionPickerOpen} transparent animationType="slide" onRequestClose={() => setIsPermissionPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsPermissionPickerOpen(false)}>
          <Pressable style={[styles.sheetContainer, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Default Permission Level</Text>
              <TouchableOpacity onPress={() => setIsPermissionPickerOpen(false)}>
                <Ionicons name="close-circle" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {PERMISSIONS.map((p) => {
                const active = selectedPermission === p.level;
                return (
                  <TouchableOpacity
                    key={p.level}
                    style={[styles.sheetRowItem, { borderBottomColor: theme.border, flexDirection: 'column', alignItems: 'flex-start' }]}
                    onPress={() => {
                      setSelectedPermission(p.level);
                      setIsPermissionPickerOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Text style={[styles.sheetRowText, { color: active ? '#C8A34D' : theme.textPrimary, fontWeight: active ? '800' : '600' }]}>
                        {p.level}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>


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
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dropdownValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 10.5,
    marginTop: 4,
  },
  descBanner: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: {
    height: 55,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12.5,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  previewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 30,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  sheetRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetRowText: {
    fontSize: 13,
  },
  infoCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
