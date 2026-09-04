import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, Pressable, Platform, Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CaseWorkspace, CaseLawyer } from '@/types';

interface Props {
  workspace: CaseWorkspace;
  theme: Record<string, any>;
  t?: (k: string) => string;
  language?: string;
  handleUpdateField: (updates: Partial<CaseWorkspace>) => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

const ROLES = [
  'Plaintiff / Petitioner',
  'Defendant / Respondent',
  'Witness',
  'Counsel / Advocate',
  'Expert Witness',
  'Other',
] as const;

type RoleType = typeof ROLES[number];

export function PartiesManagerModule({ workspace, theme, handleUpdateField, showToast }: Props) {
  const isDark = theme.isDark ?? false;
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const bg = isDark ? '#0A0A0F' : '#F8F8FC';
  const surfaceBg = isDark ? '#111111' : '#F5F5F7';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';
  const textPrimary = theme.textPrimary || (isDark ? '#FFFFFF' : '#0A0A0A');
  const textSecondary = theme.textSecondary || (isDark ? '#8E8E93' : '#6B7280');
  
  // Gold + Black Design System
  const GOLD = '#D4AF37';
  const BLACK = '#111111';

  const [modalOpen, setModalOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('Plaintiff / Petitioner');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Selected person for details/action
  const [activePerson, setActivePerson] = useState<CaseLawyer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const peopleList: CaseLawyer[] = workspace?.lawyers || [];

  // ── Group People by Category ──
  const groups = useMemo(() => {
    const partiesList: CaseLawyer[] = [];
    const witnessesList: CaseLawyer[] = [];
    const counselList: CaseLawyer[] = [];

    const baselineClient = workspace.clientName;
    const baselineOpponent = workspace.opponentName || workspace.accused;

    peopleList.forEach(p => {
      const r = p.role;
      if (r === 'Plaintiff / Petitioner' || r === 'Defendant / Respondent') {
        partiesList.push(p);
      } else if (r === 'Witness' || r === 'Expert Witness' || r === 'Other') {
        witnessesList.push(p);
      } else if (r === 'Counsel / Advocate') {
        counselList.push(p);
      }
    });

    return {
      baselineClient,
      baselineOpponent,
      parties: partiesList,
      witnesses: witnessesList,
      counsel: counselList,
    };
  }, [peopleList, workspace.clientName, workspace.opponentName, workspace.accused]);

  // ── Save New Person ──
  const handleSave = () => {
    if (!name.trim()) {
      showToast?.('error', 'Validation Error', 'Name is required.');
      return;
    }

    const newPerson: CaseLawyer = {
      name: name.trim(),
      role: selectedRole,
      contact: contact.trim() || 'N/A',
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    handleUpdateField({
      lawyers: [...peopleList, newPerson]
    });

    showToast?.('success', 'Person Added', `${newPerson.name} added successfully.`);
    
    // Reset Form
    setName('');
    setSelectedRole('Plaintiff / Petitioner');
    setContact('');
    setEmail('');
    setNotes('');
    setModalOpen(false);
  };

  // ── Delete Person ──
  const handleConfirmDelete = () => {
    if (!activePerson) return;
    const updated = peopleList.filter(p => p !== activePerson);
    handleUpdateField({ lawyers: updated });
    showToast?.('success', 'Person Removed');
    setActionMenuOpen(false);
    setDetailModalOpen(false);
    setActivePerson(null);
  };

  const getRoleIcon = (role: string) => {
    if (role.includes('Plaintiff') || role.includes('Petitioner')) return 'shield-checkmark';
    if (role.includes('Defendant') || role.includes('Respondent')) return 'alert-circle';
    if (role.includes('Witness')) return 'eye';
    return 'business';
  };

  const getRoleColor = (role: string) => {
    if (role.includes('Plaintiff') || role.includes('Petitioner')) return '#10B981';
    if (role.includes('Defendant') || role.includes('Respondent')) return '#EF4444';
    if (role.includes('Witness')) return '#F59E0B';
    return GOLD;
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Parties & Counsel</Text>
            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>Litigants, witnesses, and legal counsel</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
          >
            <Ionicons name="add" size={16} color={BLACK} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLACK }}>Add Person</Text>
          </TouchableOpacity>
        </View>

        {/* ── 1. Litigation Parties Section ── */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Litigation Parties</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
          {/* Baseline Client */}
          {groups.baselineClient && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="person" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>Lessor / Client</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginTop: 1 }}>{groups.baselineClient}</Text>
              </View>
            </View>
          )}

          {/* Baseline Opponent */}
          {groups.baselineOpponent && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: groups.parties.length > 0 ? 1 : 0, borderBottomColor: borderColor }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="person" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>Lessee / Opponent</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginTop: 1 }}>{groups.baselineOpponent}</Text>
              </View>
            </View>
          )}

          {/* Additional Parties */}
          {groups.parties.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => { setActivePerson(p); setActionMenuOpen(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < groups.parties.length - 1 ? 1 : 0, borderBottomColor: borderColor }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: p.role === 'Plaintiff / Petitioner' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name={getRoleIcon(p.role)} size={16} color={getRoleColor(p.role)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>{p.role}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginTop: 1 }}>{p.name}</Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={16} color={textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 2. Witnesses Section (Hidden if empty) ── */}
        {groups.witnesses.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Witnesses</Text>
            <View style={{ backgroundColor: cardBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
              {groups.witnesses.map((w, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => { setActivePerson(w); setActionMenuOpen(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < groups.witnesses.length - 1 ? 1 : 0, borderBottomColor: borderColor }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="eye" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{w.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginTop: 2 }}>{w.role} · Contact: {w.contact || 'N/A'}</Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={16} color={textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── 3. Counsel Section (Hidden if empty) ── */}
        {groups.counsel.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Counsel</Text>
            <View style={{ backgroundColor: cardBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
              {groups.counsel.map((c, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => { setActivePerson(c); setActionMenuOpen(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < groups.counsel.length - 1 ? 1 : 0, borderBottomColor: borderColor }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(212,175,55,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="business" size={16} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{c.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginTop: 2 }}>{c.role} · Contact: {c.contact || 'N/A'}</Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={16} color={textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─────────────── Add Person Modal ─────────────── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => { setModalOpen(false); setRoleDropdownOpen(false); }} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24, maxHeight: '90%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 22 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, marginBottom: 18, textAlign: 'center' }}>Add Person to Case</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Full Name</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 14 }}
                placeholder="Enter full name"
                placeholderTextColor={textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Role</Text>
              <TouchableOpacity
                onPress={() => setRoleDropdownOpen(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, backgroundColor: surfaceBg, marginBottom: roleDropdownOpen ? 4 : 14 }}
              >
                <Text style={{ fontSize: 14, color: textPrimary, flex: 1 }}>{selectedRole}</Text>
                <Ionicons name={roleDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={textSecondary} />
              </TouchableOpacity>

              {roleDropdownOpen && (
                <View style={{ borderWidth: 1, borderColor, borderRadius: 12, backgroundColor: cardBg, marginBottom: 14, overflow: 'hidden' }}>
                  {ROLES.map(role => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => { setSelectedRole(role); setRoleDropdownOpen(false); }}
                      style={{ paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: selectedRole === role ? surfaceBg : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: selectedRole === role ? '700' : '500', color: selectedRole === role ? GOLD : textPrimary }}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Contact Number (Optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 14 }}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor={textSecondary}
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
              />

              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Email Address (Optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 14 }}
                placeholder="e.g. advocate@ai-legal.in"
                placeholderTextColor={textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Notes (Optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, minHeight: 70, marginBottom: 14 }}
                placeholder="Internal advocate notes or reminders"
                placeholderTextColor={textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: BLACK }}>Save Person</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────── Action Menu Modal ─────────────── */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setActionMenuOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor }}>
            {activePerson && (
              <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }} numberOfLines={1}>{activePerson.name}</Text>
                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Role: {activePerson.role}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setActionMenuOpen(false); setDetailModalOpen(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}
            >
              <Ionicons name="eye-outline" size={20} color={textPrimary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: textPrimary }}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setActionMenuOpen(false);
                Alert.alert('Edit Details', 'Please edit details by adding the person again or contact workspace manager.');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}
            >
              <Ionicons name="pencil-outline" size={20} color={textPrimary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: textPrimary }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Person?',
                  'This person will be permanently removed.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: handleConfirmDelete }
                  ]
                );
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────── Person Detail View Modal ─────────────── */}
      <Modal visible={detailModalOpen} transparent animationType="fade" onRequestClose={() => setDetailModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            {activePerson && (
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary, marginBottom: 4, textAlign: 'center' }}>{activePerson.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD, textAlign: 'center', marginBottom: 16 }}>{activePerson.role}</Text>

                <View style={{ borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 14, gap: 10, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, width: 80 }}>Contact</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, flex: 1 }}>{activePerson.contact || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, width: 80 }}>Email</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, flex: 1 }}>{activePerson.email || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, width: 80 }}>Notes</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, flex: 1, lineHeight: 18 }}>{activePerson.notes || 'N/A'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalOpen(false);
                      Alert.alert('Remove Person?', 'Confirm deletion.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: handleConfirmDelete }
                      ]);
                    }}
                    style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setDetailModalOpen(false); setActivePerson(null); }} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default PartiesManagerModule;
