import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CaseWorkspace, CaseHearing } from '@/types';
import { EnterpriseHearingWorkspace } from './EnterpriseHearingWorkspace';
import { CaseService } from '@/services/case.service';
import { useWorkspaceContext, useThemeContext } from '@/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tTool } from '@/localization/toolTranslations';
import { getGlobalActiveWorkspaceType } from '@/providers/workspace.provider';
import { useRoleStore } from '@/store/role';

const { width } = Dimensions.get('window');

interface CourtHearingsModuleProps {
  workspace: CaseWorkspace;
  theme: any;
  t: (key: string, options?: any) => string;
  language: string;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

function PersonalCaseHearings({
  workspace,
  handleUpdateField,
  showToast,
}: {
  workspace: CaseWorkspace;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}) {
  const { isDark } = useThemeContext();
  const [outputLanguage, setOutputLanguage] = useState('');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);
  const pageBg = isDark ? '#0B0B0E' : '#FFFFFF';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textSecondary = isDark ? '#8E8E93' : '#6B7280';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';

  const role = useRoleStore((s) => s.selectedRole) || 'advocate';
  const isStudent = role === 'student';
  const caseId = workspace?._id || workspace?.id || '';

  // Hearings list state
  const [hearings, setHearings] = useState<any[]>(workspace?.hearings || []);

  // Sync state if workspace prop updates
  useEffect(() => {
    if (workspace?.hearings) {
      setHearings(workspace.hearings);
    }
  }, [workspace?.hearings]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<any | null>(null);
  const [prepModalHearing, setPrepModalHearing] = useState<any | null>(null);
  const [outcomeModalHearing, setOutcomeModalHearing] = useState<any | null>(null);
  const [detailModalHearing, setDetailModalHearing] = useState<any | null>(null);

  // Form State for Add / Edit Hearing
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCourt, setFormCourt] = useState(workspace?.courtName || 'High Court of Delhi');
  const [formCourtRoom, setFormCourtRoom] = useState('');
  const [formPurpose, setFormPurpose] = useState('Final Arguments');
  const [formJudge, setFormJudge] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReminder, setFormReminder] = useState('1 Day Before');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Outcome Form State
  const [outcomeText, setOutcomeText] = useState('');
  const [outcomeOrder, setOutcomeOrder] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Prep Checklist & Notes State
  const [newPrepItem, setNewPrepItem] = useState('');

  // Calendar State (Current Case Only)
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // Purposes List
  const purposeOptions = [
    'Final Arguments',
    'Arguments',
    'Evidence',
    'Cross Examination',
    'Examination-in-Chief',
    'Orders',
    'Filing',
    'Admission',
    'Preliminary Hearing',
    'Other',
  ];

  // Default Checklist based on Role
  const defaultChecklistItems = useMemo(() => {
    if (isStudent) {
      return [
        { title: 'Review facts of the case', checked: false },
        { title: 'Understand issues before the court', checked: false },
        { title: 'Review applicable law & statutes', checked: false },
        { title: 'Read relevant precedent judgments', checked: false },
        { title: 'Note arguments from petitioner and respondent', checked: false },
      ];
    }
    return [
      { title: 'Review case documents & pleadings', checked: false },
      { title: 'Review evidence & exhibit numbers', checked: false },
      { title: 'Review saved precedent rulings', checked: false },
      { title: 'Prepare argument notes', checked: false },
      { title: 'Check recent court orders', checked: false },
    ];
  }, [isStudent]);

  // AI Suggestions
  const aiPrepSuggestions = useMemo(() => {
    if (isStudent) {
      return [
        'Note legal issues for study summary',
        'Extract ratio decidendi from cited precedents',
        'Compare party submissions for moot prep',
      ];
    }
    return [
      'Review latest court order',
      'Prepare arguments on electronic evidence admissibility',
      'Verify pending document submissions',
    ];
  }, [isStudent]);

  // Next Hearing (First upcoming hearing date >= today or non-completed)
  const nextHearing = useMemo(() => {
    const upcoming = hearings.filter((h) => (h.status as string) !== 'Completed' && (h.status as string) !== 'completed');
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
  }, [hearings]);

  // Preparation progress stats
  const prepProgress = useMemo(() => {
    if (!nextHearing) return { total: 0, completed: 0 };
    const items: any[] = Array.isArray(nextHearing.checklist) ? nextHearing.checklist : defaultChecklistItems;
    const completed = items.filter((i: any) => i.checked || i.completed).length;
    return { total: items.length, completed };
  }, [nextHearing, defaultChecklistItems]);

  // Hearing History (Sorted newest to oldest)
  const historyHearings = useMemo(() => {
    return [...hearings].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [hearings]);

  // Map dates with hearings for Calendar dot indicators
  const hearingDatesMap = useMemo(() => {
    const map: Record<string, number> = {};
    hearings.forEach((h) => {
      if (h.date) {
        const dStr = h.date.substring(0, 10);
        map[dStr] = (map[dStr] || 0) + 1;
      }
    });
    return map;
  }, [hearings]);

  // Hearings on selected calendar date
  const hearingsOnSelectedDate = useMemo(() => {
    return hearings.filter((h) => (h.date || '').substring(0, 10) === selectedCalendarDate);
  }, [hearings, selectedCalendarDate]);

  // Open Add Hearing Modal
  const handleOpenAddModal = (hearingToEdit?: CaseHearing) => {
    if (hearingToEdit) {
      setEditingHearing(hearingToEdit);
      setFormDate(hearingToEdit.date || todayStr);
      setFormTime((hearingToEdit as any).time || '10:30 AM');
      setFormCourt(hearingToEdit.courtName || workspace?.courtName || 'High Court of Delhi');
      setFormCourtRoom((hearingToEdit as any).courtroom || (hearingToEdit as any).courtRoom || '');
      setFormPurpose((hearingToEdit as any).stage || hearingToEdit.purpose || 'Final Arguments');
      setFormJudge(hearingToEdit.judge || '');
      setFormNotes(hearingToEdit.notes || '');
      setFormReminder((hearingToEdit as any).reminder || '1 Day Before');
    } else {
      setEditingHearing(null);
      setFormDate(todayStr);
      setFormTime('10:30 AM');
      setFormCourt(workspace?.courtName || 'High Court of Delhi');
      setFormCourtRoom('');
      setFormPurpose('Final Arguments');
      setFormJudge('');
      setFormNotes('');
      setFormReminder('1 Day Before');
    }
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit Hearing
  const handleSaveHearingSubmit = async () => {
    if (!formDate.trim()) {
      showToast('warning', 'Date Required', 'Please enter a hearing date.');
      return;
    }

    setIsSubmitting(true);
    const newHearing: CaseHearing = {
      _id: editingHearing ? (editingHearing._id || editingHearing.id) : ('hrg_' + Date.now().toString()),
      id: editingHearing ? (editingHearing.id || editingHearing._id) : ('hrg_' + Date.now().toString()),
      stage: formPurpose,
      purpose: formPurpose,
      courtName: formCourt.trim(),
      courtroom: formCourtRoom.trim(),
      judge: formJudge.trim(),
      date: formDate.trim(),
      time: formTime.trim(),
      status: editingHearing ? editingHearing.status : ('Upcoming' as any),
      notes: formNotes.trim(),
      reminder: formReminder,
      checklist: editingHearing?.checklist || defaultChecklistItems,
      createdAt: editingHearing ? editingHearing.createdAt : new Date().toISOString(),
    } as any;

    let updated: CaseHearing[];
    if (editingHearing) {
      const targetId = editingHearing._id || editingHearing.id;
      updated = hearings.map((h) => ((h._id === targetId || h.id === targetId) ? newHearing : h));
    } else {
      updated = [newHearing, ...hearings];
    }

    try {
      await handleUpdateField({ hearings: updated });
      setHearings(updated);
      setIsAddModalOpen(false);
      setEditingHearing(null);
      showToast('success', editingHearing ? 'Hearing Updated' : 'Hearing Scheduled', editingHearing ? 'Hearing updated successfully.' : 'New hearing added to case schedule.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to save hearing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Checklist Item
  const handleToggleChecklistItem = async (itemIdx: number) => {
    if (!nextHearing) return;
    const targetId = nextHearing._id || nextHearing.id;
    const currentList: any[] = Array.isArray(nextHearing.checklist) ? nextHearing.checklist : defaultChecklistItems;

    const updatedChecklist = currentList.map((item: any, idx: number) =>
      idx === itemIdx ? { ...item, checked: !item.checked } : item
    );

    const updatedHearings = hearings.map((h) =>
      (h._id === targetId || h.id === targetId) ? { ...h, checklist: updatedChecklist } : h
    );

    setHearings(updatedHearings);
    try {
      await handleUpdateField({ hearings: updatedHearings });
    } catch (err: any) {
      console.error('Failed to update prep checklist:', err);
    }
  };

  // Add Item to Prep Checklist
  const handleAddPrepItem = async () => {
    if (!newPrepItem.trim() || !nextHearing) return;
    const targetId = nextHearing._id || nextHearing.id;
    const currentList: any[] = Array.isArray(nextHearing.checklist) ? nextHearing.checklist : defaultChecklistItems;

    const updatedChecklist = [...currentList, { title: newPrepItem.trim(), checked: false }];
    const updatedHearings = hearings.map((h) =>
      (h._id === targetId || h.id === targetId) ? { ...h, checklist: updatedChecklist } : h
    );

    setHearings(updatedHearings);
    setNewPrepItem('');
    try {
      await handleUpdateField({ hearings: updatedHearings });
      showToast('success', 'Item Added', 'Added to preparation checklist.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to add item.');
    }
  };

  // Add AI Suggestion to Prep Checklist
  const handleAddAiSuggestionToChecklist = async (sugText: string) => {
    if (!nextHearing) return;
    const targetId = nextHearing._id || nextHearing.id;
    const currentList: any[] = Array.isArray(nextHearing.checklist) ? nextHearing.checklist : defaultChecklistItems;

    if (currentList.some((i: any) => i.title === sugText)) {
      showToast('info', 'Already Added', 'This suggestion is already in your checklist.');
      return;
    }

    const updatedChecklist = [...currentList, { title: sugText, checked: false }];
    const updatedHearings = hearings.map((h) =>
      (h._id === targetId || h.id === targetId) ? { ...h, checklist: updatedChecklist } : h
    );

    setHearings(updatedHearings);
    try {
      await handleUpdateField({ hearings: updatedHearings });
      showToast('success', 'Suggestion Added', 'Added suggestion to preparation checklist.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to add suggestion.');
    }
  };

  // Save Outcome Handler
  const handleSaveOutcomeSubmit = async () => {
    if (!outcomeModalHearing) return;
    const targetId = outcomeModalHearing._id || outcomeModalHearing.id;

    const updatedTarget: CaseHearing = {
      ...outcomeModalHearing,
      status: 'Completed' as any,
      outcome: outcomeText.trim(),
      orderDirection: outcomeOrder.trim(),
      notes: outcomeNotes.trim() ? outcomeNotes.trim() : outcomeModalHearing.notes,
      nextHearingDate: nextHearingDate.trim() || undefined,
    } as any;

    let updatedHearings = hearings.map((h) =>
      (h._id === targetId || h.id === targetId) ? updatedTarget : h
    );

    // If next hearing date is provided, create new upcoming hearing automatically!
    if (nextHearingDate.trim()) {
      const autoNextHearing: CaseHearing = {
        _id: 'hrg_' + Date.now().toString(),
        id: 'hrg_' + Date.now().toString(),
        stage: 'Next Hearing',
        purpose: 'Next Hearing',
        courtName: outcomeModalHearing.courtName || workspace?.courtName || 'High Court of Delhi',
        date: nextHearingDate.trim(),
        status: 'Upcoming' as any,
        notes: `Scheduled from previous hearing on ${outcomeModalHearing.date}`,
        createdAt: new Date().toISOString(),
      } as any;
      updatedHearings = [autoNextHearing, ...updatedHearings];
    }

    try {
      await handleUpdateField({ hearings: updatedHearings });
      setHearings(updatedHearings);
      setOutcomeModalHearing(null);
      setOutcomeText('');
      setOutcomeOrder('');
      setNextHearingDate('');
      setOutcomeNotes('');
      showToast('success', 'Outcome Saved', nextHearingDate.trim() ? '✓ Outcome saved & next hearing scheduled.' : '✓ Hearing outcome recorded.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to save hearing outcome.');
    }
  };

  // Calendar Helper Days Array
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const days: ({ dayNum: number; dateStr: string } | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, dateStr: `${calYear}-${mStr}-${dStr}` });
    }
    return days;
  }, [calMonth, calYear]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* 1. Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Hearings</Text>
            <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : '#FFFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#D4AF37' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D4AF37' }}>
                {workspace?.name || 'Case Hearing Tracker'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
            Track and prepare for case hearings
          </Text>
        </View>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#D4AF37',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            gap: 4,
          }}
          onPress={() => handleOpenAddModal()}
        >
          <Ionicons name="add" size={16} color="#111111" />
          <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>Add Hearing</Text>
        </TouchableOpacity>
      </View>

      {/* 2. NEXT HEARING — PRIMARY CARD */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          NEXT HEARING
        </Text>

        {nextHearing ? (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(212,175,55,0.3)' : '#D4AF37', padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>
                  {nextHearing.date}
                </Text>
                {!!(nextHearing as any).time && (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#D4AF37', marginTop: 2 }}>
                    {(nextHearing as any).time}
                  </Text>
                )}
              </View>

              <View style={{ backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#D4AF37' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37' }}>
                  {nextHearing.stage || nextHearing.purpose || 'Upcoming'}
                </Text>
              </View>
            </View>

            <View style={{ gap: 4, marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                {nextHearing.courtName || workspace?.courtName || 'High Court of Delhi'}
              </Text>

              {!!((nextHearing as any).courtroom || (nextHearing as any).courtRoom) && (
                <Text style={{ fontSize: 12, color: textSecondary }}>
                  Court Room: {(nextHearing as any).courtroom || (nextHearing as any).courtRoom}
                </Text>
              )}

              {!!nextHearing.judge && (
                <Text style={{ fontSize: 12, color: textSecondary }}>
                  Bench: {nextHearing.judge}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#D4AF37', paddingVertical: 9, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                onPress={() => setPrepModalHearing(nextHearing)}
              >
                <Ionicons name="sparkles" size={14} color="#111111" />
                <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Prepare</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: isDark ? '#111111' : '#F5F5F7', paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor }}
                onPress={() => handleOpenAddModal(nextHearing)}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingHorizontal: 12, backgroundColor: isDark ? '#111111' : '#F5F5F7', paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor }}
                onPress={() => setOutcomeModalHearing(nextHearing)}
              >
                <Ionicons name="checkmark-done" size={16} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor, borderStyle: 'dashed', backgroundColor: cardBg }}>
            <Ionicons name="calendar-outline" size={36} color="#D4AF37" style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 2 }}>Upcoming Hearing</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 14 }}>
              No upcoming hearing scheduled for this case.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#D4AF37', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
              onPress={() => handleOpenAddModal()}
            >
              <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>+ Add Hearing</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. ✨ PREPARATION SECTION */}
      {nextHearing && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
              ✨ PREPARATION
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D4AF37' }}>
              {prepProgress.completed} of {prepProgress.total} completed
            </Text>
          </View>

          <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 14 }}>
            <View style={{ gap: 8, marginBottom: 12 }}>
              {(Array.isArray(nextHearing.checklist) ? nextHearing.checklist : defaultChecklistItems).slice(0, 3).map((item: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => handleToggleChecklistItem(idx)}
                >
                  <Text style={{ fontSize: 13, color: item.checked ? textSecondary : textPrimary, textDecorationLine: item.checked ? 'line-through' : 'none', flex: 1, marginRight: 8 }}>
                    {item.title}
                  </Text>
                  <Ionicons
                    name={item.checked ? "checkbox" : "square-outline"}
                    size={20}
                    color={item.checked ? "#10B981" : textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: isDark ? '#111111' : '#F5F5F7', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor }}
              onPress={() => setPrepModalHearing(nextHearing)}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>Open Full Preparation Sheet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. HEARING HISTORY */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 12 }}>
          Hearing History
        </Text>

        {historyHearings.length === 0 ? (
          <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor, backgroundColor: cardBg, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: textSecondary }}>No previous hearings recorded.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {historyHearings.map((h) => {
              const hId = h._id || h.id;
              const isComp = (h.status as string) === 'Completed' || (h.status as string) === 'completed';
              return (
                <TouchableOpacity
                  key={hId}
                  style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, padding: 12 }}
                  onPress={() => setDetailModalHearing(h)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isComp ? '#10B981' : '#D4AF37' }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                        {h.date}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: isComp ? '#D1FAE5' : 'rgba(212,175,55,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: isComp ? '#059669' : '#D4AF37' }}>
                        {isComp ? 'Completed' : 'Upcoming'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 2 }}>
                    {h.stage || h.purpose || 'Hearing'}
                  </Text>
                  <Text style={{ fontSize: 11, color: textSecondary }}>
                    {h.courtName || workspace?.courtName || 'High Court of Delhi'}
                  </Text>

                  {!!h.outcome && (
                    <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }}>
                      <Text style={{ fontSize: 11, color: textSecondary, fontStyle: 'italic' }}>
                        Outcome: {h.outcome}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 5. HEARING CALENDAR (Current Case Only) */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, marginBottom: 12 }}>
          Hearing Calendar
        </Text>

        <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor, padding: 14 }}>
          {/* Month Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => {
                if (calMonth === 0) {
                  setCalMonth(11);
                  setCalYear(calYear - 1);
                } else {
                  setCalMonth(calMonth - 1);
                }
              }}
              style={{ padding: 4 }}
            >
              <Ionicons name="chevron-back" size={20} color={textPrimary} />
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>
              {monthNames[calMonth]} {calYear}
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (calMonth === 11) {
                  setCalMonth(0);
                  setCalYear(calYear + 1);
                } else {
                  setCalMonth(calMonth + 1);
                }
              }}
              style={{ padding: 4 }}
            >
              <Ionicons name="chevron-forward" size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
              <Text key={i} style={{ fontSize: 11, fontWeight: '700', color: textSecondary, width: 32, textAlign: 'center' }}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((cDay, idx) => {
              if (!cDay) {
                return <View key={idx} style={{ width: (width - 60) / 7, height: 36 }} />;
              }

              const isSelected = cDay.dateStr === selectedCalendarDate;
              const hasHearings = Boolean(hearingDatesMap[cDay.dateStr]);

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedCalendarDate(cDay.dateStr)}
                  style={{
                    width: (width - 60) / 7,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#D4AF37' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#111111' : textPrimary }}>
                    {cDay.dayNum}
                  </Text>
                  {hasHearings && !isSelected && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#D4AF37', position: 'absolute', bottom: 3 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hearings on Selected Date */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>
              Hearings on {selectedCalendarDate}:
            </Text>

            {hearingsOnSelectedDate.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: textSecondary }}>No hearing scheduled.</Text>
                <TouchableOpacity onPress={() => handleOpenAddModal()}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#D4AF37' }}>+ Add Hearing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {hearingsOnSelectedDate.map((h) => (
                  <TouchableOpacity
                    key={h._id || h.id}
                    style={{ backgroundColor: isDark ? '#111111' : '#F9FAFB', padding: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => setDetailModalHearing(h)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>
                      {h.stage || h.purpose || 'Hearing'}
                    </Text>
                    <Text style={{ fontSize: 11, color: textSecondary }}>
                      {h.courtName || workspace?.courtName || 'Court'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ADD / EDIT HEARING MODAL */}
      <Modal visible={isAddModalOpen} transparent animationType="slide" onRequestClose={() => setIsAddModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsAddModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                    {editingHearing ? 'Edit Hearing' : 'Add Hearing'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Hearing Date *</Text>
                    <TextInput
                      style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                      placeholder="YYYY-MM-DD e.g. 2026-07-28"
                      placeholderTextColor={textSecondary}
                      value={formDate}
                      onChangeText={setFormDate}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Time (optional)</Text>
                      <TextInput
                        style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                        placeholder="10:30 AM"
                        placeholderTextColor={textSecondary}
                        value={formTime}
                        onChangeText={setFormTime}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Court Room</Text>
                      <TextInput
                        style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                        placeholder="Court Room 12"
                        placeholderTextColor={textSecondary}
                        value={formCourtRoom}
                        onChangeText={setFormCourtRoom}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Court Name</Text>
                    <TextInput
                      style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                      placeholder="High Court of Delhi"
                      placeholderTextColor={textSecondary}
                      value={formCourt}
                      onChangeText={setFormCourt}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Hearing Purpose / Stage</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {purposeOptions.map((opt) => {
                        const active = formPurpose === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => setFormPurpose(opt)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: active ? '#D4AF37' : (isDark ? '#111111' : '#F3F4F6'),
                              borderWidth: 1,
                              borderColor: active ? '#D4AF37' : borderColor,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#111111' : textSecondary }}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Judge / Bench (optional)</Text>
                    <TextInput
                      style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                      placeholder="Justice Sharma"
                      placeholderTextColor={textSecondary}
                      value={formJudge}
                      onChangeText={setFormJudge}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Personal Preparation Note (optional)</Text>
                    <TextInput
                      style={{ height: 60, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB', textAlignVertical: 'top' }}
                      placeholder="Add preparation notes or points to remember..."
                      placeholderTextColor={textSecondary}
                      multiline
                      value={formNotes}
                      onChangeText={setFormNotes}
                    />
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10, opacity: isSubmitting ? 0.7 : 1 }}
                    disabled={isSubmitting}
                    onPress={handleSaveHearingSubmit}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#111111" />
                    ) : (
                      <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>
                        {editingHearing ? 'Save Changes' : 'Save Hearing'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* FULL HEARING PREPARATION MODAL */}
      <Modal visible={prepModalHearing !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setPrepModalHearing(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 10 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                      Hearing Preparation
                    </Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      Purpose: {prepModalHearing?.stage || prepModalHearing?.purpose} • Date: {prepModalHearing?.date}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPrepModalHearing(null)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                  {/* Preparation Checklist */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 8 }}>
                      {isStudent ? 'STUDY CHECKLIST' : 'PREPARATION CHECKLIST'}
                    </Text>

                    <View style={{ gap: 8, marginBottom: 10 }}>
                      {(Array.isArray(prepModalHearing?.checklist) ? prepModalHearing.checklist : defaultChecklistItems).map((item: any, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#111111' : '#F9FAFB', padding: 10, borderRadius: 8 }}
                          onPress={() => handleToggleChecklistItem(idx)}
                        >
                          <Text style={{ fontSize: 13, color: item.checked ? textSecondary : textPrimary, textDecorationLine: item.checked ? 'line-through' : 'none', flex: 1, marginRight: 8 }}>
                            {item.title}
                          </Text>
                          <Ionicons
                            name={item.checked ? "checkbox" : "square-outline"}
                            size={20}
                            color={item.checked ? "#10B981" : textSecondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Add Item Row */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={{ flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor, paddingHorizontal: 10, fontSize: 12, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                        placeholder={isStudent ? "+ Add Study Point..." : "+ Add My Preparation Item..."}
                        placeholderTextColor={textSecondary}
                        value={newPrepItem}
                        onChangeText={setNewPrepItem}
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: '#D4AF37', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' }}
                        onPress={handleAddPrepItem}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* ✨ AI SUGGESTED PREPARATION */}
                  <View style={{ backgroundColor: isDark ? 'rgba(212,175,55,0.06)' : '#FFFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#FDE68A' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#D4AF37', marginBottom: 8, textTransform: 'uppercase' }}>
                      ✨ AI SUGGESTED PREPARATION
                    </Text>
                    <View style={{ gap: 6 }}>
                      {aiPrepSuggestions.map((sug, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: textPrimary, flex: 1, marginRight: 8 }}>• {sug}</Text>
                          <TouchableOpacity onPress={() => handleAddAiSuggestionToChecklist(sug)}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D4AF37' }}>+ Add</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 }}
                    onPress={() => setPrepModalHearing(null)}
                  >
                    <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>Save Preparation</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* RECORD HEARING OUTCOME MODAL */}
      <Modal visible={outcomeModalHearing !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setOutcomeModalHearing(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 10 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                      Record Hearing Outcome
                    </Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      {outcomeModalHearing?.stage} • {outcomeModalHearing?.date}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setOutcomeModalHearing(null)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>What happened in court?</Text>
                    <TextInput
                      style={{ height: 60, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB', textAlignVertical: 'top' }}
                      placeholder="e.g. Witness examination completed. Respondent requested time to file reply."
                      placeholderTextColor={textSecondary}
                      multiline
                      value={outcomeText}
                      onChangeText={setOutcomeText}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Order / Direction</Text>
                    <TextInput
                      style={{ height: 50, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB', textAlignVertical: 'top' }}
                      placeholder="e.g. Court directed petitioner to submit additional evidence by next date."
                      placeholderTextColor={textSecondary}
                      multiline
                      value={outcomeOrder}
                      onChangeText={setOutcomeOrder}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Next Hearing Date (optional)</Text>
                    <TextInput
                      style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB' }}
                      placeholder="YYYY-MM-DD e.g. 2026-08-15"
                      placeholderTextColor={textSecondary}
                      value={nextHearingDate}
                      onChangeText={setNextHearingDate}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>Additional Notes</Text>
                    <TextInput
                      style={{ height: 50, borderRadius: 10, borderWidth: 1, borderColor, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: textPrimary, backgroundColor: isDark ? '#111111' : '#F9FAFB', textAlignVertical: 'top' }}
                      placeholder="Strategic observations or notes..."
                      placeholderTextColor={textSecondary}
                      multiline
                      value={outcomeNotes}
                      onChangeText={setOutcomeNotes}
                    />
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 }}
                    onPress={handleSaveOutcomeSubmit}
                  >
                    <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>Save Hearing Update</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* DETAIL VIEW MODAL */}
      <Modal visible={detailModalHearing !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setDetailModalHearing(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, paddingBottom: 10 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                      {detailModalHearing?.stage || detailModalHearing?.purpose}
                    </Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      {detailModalHearing?.courtName || workspace?.courtName || 'Court'} • {detailModalHearing?.date}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalHearing(null)}>
                    <Ionicons name="close" size={24} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                  {!!detailModalHearing?.outcome && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 2 }}>Court Outcome</Text>
                      <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{detailModalHearing.outcome}</Text>
                    </View>
                  )}

                  {!!detailModalHearing?.orderDirection && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 2 }}>Order / Direction</Text>
                      <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{detailModalHearing.orderDirection}</Text>
                    </View>
                  )}

                  {!!detailModalHearing?.notes && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Notes</Text>
                      <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 18 }}>{detailModalHearing.notes}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={{ backgroundColor: isDark ? '#111111' : '#F5F5F7', borderWidth: 1, borderColor, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 10 }}
                    onPress={() => setDetailModalHearing(null)}
                  >
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

export function CourtHearingsModule({
  workspace,
  theme,
  t,
  language,
  handleUpdateField,
  showToast,
}: CourtHearingsModuleProps) {
  const { activeWorkspace, members } = useWorkspaceContext();

  const currentRole = useRoleStore.getState().selectedRole || 'advocate';
  const globalWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : (workspace?.workspaceType || currentRole);
  const isLawFirm = globalWsType === 'law_firm' || workspace?.workspaceType === 'law_firm';

  if (!isLawFirm) {
    return (
      <PersonalCaseHearings
        workspace={workspace}
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
    );
  }

  // Active Workspace Hearing View (Detail View)
  const [outputLanguage, setOutputLanguage] = useState(language || 'English');
  const [activeWorkspaceHearing, setActiveWorkspaceHearing] = useState<any | null>(null);

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  // Loading & Data State
  const [hearingsList, setHearingsList] = useState<CaseHearing[]>([]);
  const [isLoadingHearings, setIsLoadingHearings] = useState(false);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Calendar State
  const [todayStr] = useState(() => new Date().toISOString().substring(0, 10));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());

  // Indian Litigation Hearing Stages
  const hearingStagesList = [
    'First Hearing',
    'Admission Hearing',
    'Preliminary Hearing',
    'Notice / Summons',
    'Pleadings',
    'Interim Application',
    'Interim Relief',
    'Bail Hearing',
    'Charge Hearing',
    'Evidence',
    'Examination-in-Chief',
    'Cross Examination',
    'Re-Examination',
    'Arguments',
    'Final Arguments',
    'Judgment',
    'Sentencing',
    'Compliance Hearing',
    'Execution Hearing',
    'Review Hearing',
    'Appeal Hearing',
    'Miscellaneous Hearing',
    'Other'
  ];

  // Form State for Schedule Hearing Wizard (No hardcoded default fake values)
  const [formStage, setFormStage] = useState('');
  const [formCustomStage, setFormCustomStage] = useState('');
  const [formCourtName, setFormCourtName] = useState(workspace?.courtName || '');
  const [formCourtroom, setFormCourtroom] = useState('');
  const [formJudge, setFormJudge] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAppearingAdvocateId, setFormAppearingAdvocateId] = useState('');
  const [formAppearingAdvocateName, setFormAppearingAdvocateName] = useState('');
  const [formSupportingAdvocateIds, setFormSupportingAdvocateIds] = useState<string[]>([]);
  const [formSupportingAdvocateNames, setFormSupportingAdvocateNames] = useState<string[]>([]);
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);

  const targetCaseId = workspace?._id || workspace?.id;
  const targetWsId = workspace?.workspaceId || (activeWorkspace as any)?._id || (activeWorkspace as any)?.id || 'personal_practice';

  // 1. Fetch hearings strictly scoped to workspaceId + caseId
  const fetchHearings = useCallback(async () => {
    if (!targetCaseId) return;
    setIsLoadingHearings(true);
    try {
      const res: any = await CaseService.getWorkspaceHearings(String(targetWsId), false);
      if (res && res.success && Array.isArray(res.hearings)) {
        const caseHearings = res.hearings.filter((h: any) => String(h.caseId || h.projectId || '') === String(targetCaseId));
        const seen = new Set<string>();
        const unique = caseHearings.filter((h: any) => {
          const key = `${h.title || h.purpose}_${h.date}_${h.time}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setHearingsList(unique);
      } else if (Array.isArray(workspace?.hearings)) {
        const seen = new Set<string>();
        const unique = workspace.hearings.filter((h: any) => {
          const key = `${h.title || h.purpose}_${h.date}_${h.time}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setHearingsList(unique);
      }
    } catch (err) {
      console.warn('[CourtHearingsModule] Error fetching case hearings:', err);
      if (Array.isArray(workspace?.hearings)) {
        setHearingsList(workspace.hearings);
      }
    } finally {
      setIsLoadingHearings(false);
    }
  }, [targetCaseId, targetWsId, workspace?.hearings]);

  useEffect(() => {
    fetchHearings();
  }, [fetchHearings]);

  // Dynamic Operations Overview Counts derived 100% from real records
  const operationsCounts = useMemo(() => {
    const today = hearingsList.filter(h => h.date === todayStr).length;
    const pendingPrep = hearingsList.filter(h => (h.preparationStatus === 'Pending' || (h as any).prep === 'Pending') && h.status !== 'Completed' && h.status !== 'Cancelled').length;
    const awaitingOrders = hearingsList.filter(h => h.status === 'Orders Reserved' || (h.status as any) === 'Awaiting Order').length;
    const completed = hearingsList.filter(h => h.status === 'Completed').length;
    return { today, pendingPrep, awaitingOrders, completed };
  }, [hearingsList, todayStr]);

  // Available Advocates from current firm/case team roster
  const availableAdvocates = useMemo(() => {
    if (members && members.length > 0) {
      return members.map(m => ({
        id: m.userId || m.id || m._id || m.email,
        name: m.name || m.fullName || 'Advocate',
        role: m.role || 'Associate Advocate'
      }));
    }
    return [
      { id: activeWorkspace?.ownerInfo?.userId || 'adv_owner', name: activeWorkspace?.ownerInfo?.name || 'Lead Advocate', role: 'Firm Owner' }
    ];
  }, [members, activeWorkspace]);

  // Calendar Calculation Logic
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const calendarDaysData = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    return { firstDayIndex, totalDays };
  }, [currentMonth, currentYear]);

  const hearingDatesSet = useMemo(() => {
    const set = new Set<string>();
    hearingsList.forEach(h => {
      if (h.date) set.add(h.date.trim());
    });
    return set;
  }, [hearingsList]);

  // Schedule Hearing Form Submission
  const handleScheduleSubmit = async () => {
    if (!targetCaseId) return;

    const finalStage = formStage === 'Other' ? formCustomStage.trim() : formStage.trim();
    if (!finalStage) {
      showToast('error', 'Stage Required', 'Please select or enter a hearing stage.');
      return;
    }
    if (!formDate.trim()) {
      showToast('error', 'Date Required', 'Please select/enter hearing date (YYYY-MM-DD).');
      return;
    }
    if (!formAppearingAdvocateId) {
      showToast('error', 'Advocate Required', 'Please select an appearing advocate from your team.');
      return;
    }

    setIsFormSubmitting(true);
    try {
      const payload = {
        title: finalStage,
        caseStage: finalStage,
        purpose: finalStage,
        hearingStage: finalStage,
        courtName: formCourtName.trim() || 'Court',
        courtroom: formCourtroom.trim() || 'Courtroom 1',
        judge: formJudge.trim() || 'Presiding Judge',
        date: formDate.trim(),
        time: formTime.trim() || '10:30 AM',
        notes: formNotes.trim(),
        appearingAdvocateUserId: formAppearingAdvocateId,
        appearingAdvocateName: formAppearingAdvocateName,
        supportingAdvocateUserIds: formSupportingAdvocateIds,
        supportingAdvocateNames: formSupportingAdvocateNames,
        status: 'Scheduled',
        priority: 'High'
      };

      const res: any = await CaseService.addHearing(String(targetCaseId), payload);
      if (res && res.success) {
        showToast('success', 'Hearing Scheduled', `Hearing (${finalStage}) scheduled for ${formDate}`);
        setIsScheduleModalOpen(false);
        // Reset form
        setFormStage('');
        setFormCustomStage('');
        setFormCourtroom('');
        setFormJudge('');
        setFormDate('');
        setFormTime('');
        setFormNotes('');
        setFormAppearingAdvocateId('');
        setFormAppearingAdvocateName('');
        setFormSupportingAdvocateIds([]);
        setFormSupportingAdvocateNames([]);
        fetchHearings();
      } else {
        showToast('error', 'Schedule Failed', res?.message || 'Could not schedule hearing.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to schedule hearing.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredHearings = useMemo(() => {
    return hearingsList.filter(h => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          h.title?.toLowerCase().includes(q) ||
          h.courtName?.toLowerCase().includes(q) ||
          h.judge?.toLowerCase().includes(q) ||
          h.purpose?.toLowerCase().includes(q) ||
          h.appearingAdvocateName?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedFilter === 'Today') return h.date === todayStr;
      if (selectedFilter === 'Tomorrow') {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        return h.date === tom.toISOString().substring(0, 10);
      }
      if (selectedFilter === 'This Week') {
        const now = new Date();
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() + 7);
        return (h.date || '') >= todayStr && (h.date || '') <= weekEnd.toISOString().substring(0, 10);
      }
      if (selectedFilter === 'Upcoming') return (h.date || '') >= todayStr && h.status !== 'Completed';

      return true;
    });
  }, [hearingsList, searchQuery, selectedFilter, todayStr]);

  const selectedDateHearings = useMemo(() => {
    return hearingsList.filter(h => h.date === selectedDate);
  }, [hearingsList, selectedDate]);

  const todayHearings = useMemo(() => {
    return hearingsList.filter(h => h.date === todayStr);
  }, [hearingsList, todayStr]);

  // Return Detail Workspace View if a hearing is selected
  if (activeWorkspaceHearing) {
    return (
      <EnterpriseHearingWorkspace
        hearing={activeWorkspaceHearing}
        caseData={workspace}
        onBack={() => {
          setActiveWorkspaceHearing(null);
          fetchHearings();
        }}
        onUpdateHearing={(updated) => {
          setActiveWorkspaceHearing(updated);
          fetchHearings();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER WITH SCHEDULE CTA */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage || language || 'English', 'hearings.commandCenter', 'Court Docket Command Center')}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {workspace?.name || 'Active Case Workspace'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.scheduleBtn, { borderColor: '#C8A34D' }]}
          onPress={() => setIsScheduleModalOpen(true)}
        >
          <Ionicons name="calendar-outline" size={13} color="#C8A34D" />
          <Text style={styles.scheduleBtnText}>{tTool(outputLanguage || language || 'English', 'hearings.scheduleBtn', 'Schedule Hearing')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* OPERATIONS REPORT OVERVIEW */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}>
          <Text style={styles.summaryTitle}>{tTool(outputLanguage || language || 'English', 'hearings.opsReport', 'OPERATIONS REPORT')}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryVal}>{operationsCounts.today}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.todayHearings', "Today's Hearings")}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{operationsCounts.pendingPrep}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.pendingPrep', 'Pending Prep')}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryVal, { color: '#EF4444' }]}>{operationsCounts.awaitingOrders}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.awaitingOrders', 'Awaiting Orders')}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryVal, { color: '#10B981' }]}>{operationsCounts.completed}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.completed', 'Completed')}</Text>
            </View>
          </View>
        </View>

        {/* TODAY'S COURT DOCKET */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage || language || 'English', 'hearings.todayDocket', "TODAY'S COURT DOCKET")}</Text>
        </View>
        {todayHearings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} style={{ marginBottom: 4 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.noHearingsToday', 'No hearings scheduled for today.')} ({todayStr}).</Text>
          </View>
        ) : (
          todayHearings.map(h => (
            <TouchableOpacity
              key={h.id || h._id}
              style={[styles.hearingCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}
              onPress={() => setActiveWorkspaceHearing(h)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>{h.date} • {h.time}</Text>
                  <View style={[styles.statusChip, { backgroundColor: h.status === 'Completed' ? '#10B98120' : '#C8A34D20' }]}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: h.status === 'Completed' ? '#10B981' : '#C8A34D' }}>{h.status || 'Scheduled'}</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{h.title || h.purpose}</Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  {h.courtName} • {h.judge || 'Bench'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        {/* UPCOMING HEARINGS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage || language || 'English', 'hearings.upcomingHearings', 'UPCOMING HEARINGS')}</Text>
        </View>
        {filteredHearings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{tTool(outputLanguage || language || 'English', 'hearings.noUpcoming', 'No upcoming hearings match your filter.')}</Text>
          </View>
        ) : (
          filteredHearings.map(h => (
            <TouchableOpacity
              key={h.id || h._id}
              style={[styles.hearingCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setActiveWorkspaceHearing(h)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>{h.date} • {h.time}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{h.title || h.purpose}</Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  {h.courtName} • {h.judge || 'Bench'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        {/* SEARCH & FILTERS */}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>FILTER & SEARCH DOCKET</Text>
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={tTool(outputLanguage || language || 'English', 'hearings.searchPlaceholder', 'Search by court, judge, or advocate...')}
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
            {['All', 'Today', 'Tomorrow', 'This Week', 'Upcoming'].map(f => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  selectedFilter === f && { backgroundColor: '#C8A34D' }
                ]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text style={[styles.filterChipText, { color: selectedFilter === f ? '#FFFFFF' : theme.textPrimary }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FULLY FUNCTIONAL COMPACT DOCKET CALENDAR */}
        <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: theme.textPrimary }]}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Text key={d} style={[styles.weekdayText, { color: theme.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: calendarDaysData.firstDayIndex }).map((_, i) => (
              <View key={`empty_${i}`} style={styles.calendarDayCell} />
            ))}
            {Array.from({ length: calendarDaysData.totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isTodayDate = dateStr === todayStr;
              const hasHearing = hearingDatesSet.has(dateStr);

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.calendarDayCell,
                    isSelected && { backgroundColor: '#C8A34D' },
                    isTodayDate && !isSelected && { borderColor: '#C8A34D', borderWidth: 1 }
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[
                    styles.calendarDayText,
                    { color: isSelected ? '#FFFFFF' : theme.textPrimary },
                    isTodayDate && !isSelected && { color: '#C8A34D', fontWeight: '800' }
                  ]}>
                    {dayNum}
                  </Text>
                  {hasHearing && (
                    <View style={[styles.indicatorDot, { backgroundColor: isSelected ? '#FFFFFF' : '#C8A34D' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SELECTED DATE HEARINGS */}
        <View style={{ marginTop: 12, marginBottom: 40 }}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            HEARINGS ON {selectedDate}
          </Text>
          {selectedDateHearings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No hearings scheduled for {selectedDate}.
              </Text>
            </View>
          ) : (
            selectedDateHearings.map(h => (
              <TouchableOpacity
                key={h.id || h._id}
                style={[styles.hearingCard, { backgroundColor: theme.card, borderColor: '#C8A34D' }]}
                onPress={() => setActiveWorkspaceHearing(h)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D', marginBottom: 2 }}>
                    {h.time} • {h.hearingStage || h.purpose || 'Court Proceeding'}
                  </Text>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{h.courtName}</Text>
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                    Judge: {h.judge || 'Bench'} | Appearing: {h.appearingAdvocateName || 'Assigned Advocate'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* SCHEDULE HEARING MODAL WIZARD */}
      <Modal visible={isScheduleModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Schedule Court Hearing</Text>
              <TouchableOpacity onPress={() => setIsScheduleModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hearing Purpose / Stage *</Text>
              <TouchableOpacity
                style={[styles.modalInput, { borderColor: theme.border, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setIsStagePickerOpen(true)}
              >
                <Text style={{ fontSize: 13, color: formStage ? theme.textPrimary : theme.textSecondary }}>
                  {formStage || 'Select Hearing Stage'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {formStage === 'Other' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Specify Hearing Stage *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    value={formCustomStage}
                    onChangeText={setFormCustomStage}
                    placeholder="Enter custom hearing stage"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              )}

              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 10 }]}>Court Name</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                value={formCourtName}
                onChangeText={setFormCourtName}
                placeholder="Select / Enter Court (e.g. Delhi High Court)"
                placeholderTextColor={theme.textSecondary}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Courtroom / Bench</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    value={formCourtroom}
                    onChangeText={setFormCourtroom}
                    placeholder="Enter Bench / Court No."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Presiding Judge</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    value={formJudge}
                    onChangeText={setFormJudge}
                    placeholder="Enter Presiding Judge"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="Select Date"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Time</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    value={formTime}
                    onChangeText={setFormTime}
                    placeholder="Select Time (10:30 AM)"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 10 }]}>Appearing Advocate (Primary) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {availableAdvocates.map(adv => {
                  const isSelected = formAppearingAdvocateId === adv.id;
                  return (
                    <TouchableOpacity
                      key={adv.id}
                      style={[
                        styles.advChip,
                        isSelected && { backgroundColor: '#C8A34D' }
                      ]}
                      onPress={() => {
                        setFormAppearingAdvocateId(adv.id);
                        setFormAppearingAdvocateName(adv.name);
                      }}
                    >
                      <Text style={[styles.advChipText, { color: isSelected ? '#FFFFFF' : theme.textPrimary }]}>
                        {adv.name} ({adv.role})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Supporting Team (Optional Multiple)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                {availableAdvocates.map(adv => {
                  const isSelected = formSupportingAdvocateIds.includes(adv.id);
                  return (
                    <TouchableOpacity
                      key={`supp_${adv.id}`}
                      style={[
                        styles.advChip,
                        isSelected && { backgroundColor: '#10B981' }
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setFormSupportingAdvocateIds(prev => prev.filter(i => i !== adv.id));
                          setFormSupportingAdvocateNames(prev => prev.filter(n => n !== adv.name));
                        } else {
                          setFormSupportingAdvocateIds(prev => [...prev, adv.id]);
                          setFormSupportingAdvocateNames(prev => [...prev, adv.name]);
                        }
                      }}
                    >
                      <Text style={[styles.advChipText, { color: isSelected ? '#FFFFFF' : theme.textPrimary }]}>
                        {isSelected ? '✓ ' : ''}{adv.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes / Special Instructions</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary, height: 60 }]}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#C8A34D' }]}
              onPress={handleScheduleSubmit}
              disabled={isFormSubmitting}
            >
              {isFormSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Confirm & Schedule Hearing</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STAGE PICKER MODAL */}
      <Modal visible={isStagePickerOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, maxHeight: 480 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Hearing Stage</Text>
              <TouchableOpacity onPress={() => setIsStagePickerOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {hearingStagesList.map(stage => {
                const isSelected = formStage === stage;
                return (
                  <TouchableOpacity
                    key={stage}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected ? (theme.isDark ? '#374151' : '#FEF3C7') : 'transparent'
                    }}
                    onPress={() => {
                      setFormStage(stage);
                      setIsStagePickerOpen(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '400', color: isSelected ? '#C8A34D' : theme.textPrimary }}>
                      {stage}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#C8A34D" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scheduleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
  },
  scrollContainer: {
    paddingTop: 12,
    gap: 12,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryCell: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C8A34D',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hearingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  emptyCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8A34D',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  calendarCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    width: (width - 60) / 7,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: (width - 60) / 7,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 2,
    position: 'relative',
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  advChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8A34D',
  },
  advChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
