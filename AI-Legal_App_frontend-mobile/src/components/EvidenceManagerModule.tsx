import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, Pressable, Platform, Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { UploadService } from '@/services/upload.service';
import { apiClient } from '@/api/client';
import { CaseEvidence, CaseWorkspace } from '@/types';
import { SharePermissionsModal } from './SharePermissionsModal';
import { CaseFilterBottomSheetModal, FilterState, DEFAULT_FILTER_STATE } from './CaseFilterBottomSheetModal';
import { CaseUploaderBottomSheetModal, UploaderMember } from './CaseUploaderBottomSheetModal';
import { CaseUploadWithSharingModal } from './CaseUploadWithSharingModal';

type SortBy = 'newest' | 'oldest' | 'name-asc';
type FilterType = 'All' | 'Documents' | 'Images' | 'Videos' | 'Audio';

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'failed';
}

interface EditState {
  name: string;
  description: string;
  type: string;
  tags: string;
  status: CaseEvidence['status'];
  notes: string;
}

interface Props {
  workspace: CaseWorkspace;
  theme: Record<string, any>;
  t?: (k: string) => string;
  language?: string;
  handleUpdateField: (updates: Partial<CaseWorkspace>) => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

const FILTER_TABS: FilterType[] = ['All', 'Documents', 'Images', 'Videos', 'Audio'];
const SORT_LABELS: Record<SortBy, string> = { newest: 'Newest', oldest: 'Oldest', 'name-asc': 'A → Z' };

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getVerificationBadge(status?: string): { bg: string; text: string; label: string } {
  const s = status || 'Pending';
  if (s === 'Verified') return { bg: '#D1FAE5', text: '#065F46', label: 'Verified' };
  if (s === 'Rejected') return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
  if (s === 'Disputed') return { bg: '#FEF3C7', text: '#92400E', label: 'Disputed' };
  return { bg: '#E0F2FE', text: '#0369A1', label: 'Pending' };
}

function getFileIcon(type?: string, name?: string): { name: string; color: string } {
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (t.includes('pdf') || n.endsWith('.pdf')) return { name: 'document-text', color: '#EF4444' };
  if (t.includes('doc') || n.endsWith('.docx') || n.endsWith('.doc')) return { name: 'document-text', color: '#3B82F6' };
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || n.endsWith('.jpg') || n.endsWith('.png') || n.endsWith('.jpeg')) {
    return { name: 'image', color: '#10B981' };
  }
  if (t.includes('video') || t.includes('mp4') || n.endsWith('.mp4') || n.endsWith('.mov')) return { name: 'videocam', color: '#F59E0B' };
  if (t.includes('audio') || t.includes('mp3') || n.endsWith('.mp3') || n.endsWith('.wav') || n.endsWith('.m4a')) {
    return { name: 'volume-high', color: '#8B5CF6' };
  }
  return { name: 'document-outline', color: '#9CA3AF' };
}

import { usePermissionFlow } from '@/providers';

export function EvidenceManagerModule({ workspace, theme, handleUpdateField, showToast }: Props) {
  const router = useRouter();
  const { requestPermissionFlow } = usePermissionFlow();
  const isDark = theme.isDark ?? false;

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const surfaceBg = isDark ? '#111111' : '#F5F5F7';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';
  const textPrimary = theme.textPrimary || (isDark ? '#FFFFFF' : '#0A0A0A');
  const textSecondary = theme.textSecondary || (isDark ? '#8E8E93' : '#6B7280');

  const GOLD = '#D4AF37';
  const BLACK = '#111111';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // Upload
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  // Action Menu
  const [selectedEvidence, setSelectedEvidence] = useState<CaseEvidence | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Sharing & Review
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Uploaded By Modal & State
  const [uploaderModalOpen, setUploaderModalOpen] = useState(false);
  const [selectedUploader, setSelectedUploader] = useState<UploaderMember | null>(null);

  // Compact Filter Bottom Sheet
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [advancedFilter, setAdvancedFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const teamMembersList = useMemo(() => {
    const lawyers = workspace?.lawyers || [];
    const assigned = workspace?.assignedMembers || [];
    const team = workspace?.teamMembers || [];
    const docs = workspace?.documents || [];
    const evs = workspace?.evidence || [];

    const map = new Map<string, UploaderMember>();

    lawyers.forEach((l: any) => {
      const id = l.userId || l.id || l._id || l.name;
      if (id && !map.has(String(id))) {
        map.set(String(id), {
          userId: l.userId || l.id || l._id,
          name: l.name || l.fullName,
          role: l.role || l.designation || 'Advocate',
        });
      }
    });

    [...assigned, ...team].forEach((m: any) => {
      const id = m.userId || m._id || m.id || m.name;
      if (id && !map.has(String(id))) {
        map.set(String(id), {
          userId: m.userId || m._id || m.id,
          name: m.name || m.fullName,
          role: m.role || m.designation || 'Team Member',
        });
      }
    });

    [...docs, ...evs].forEach((item: any) => {
      if (typeof item.uploadedBy === 'object' && item.uploadedBy?.name) {
        const uId = item.uploadedBy.userId || item.uploadedBy.name;
        if (uId && !map.has(String(uId))) {
          map.set(String(uId), {
            userId: item.uploadedBy.userId,
            name: item.uploadedBy.name,
            role: item.uploadedBy.role || 'Advocate',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [workspace?.lawyers, workspace?.assignedMembers, workspace?.teamMembers, workspace?.documents, workspace?.evidence]);

  const activeFilterCount = useMemo(() => {
    let cnt = 0;
    if (advancedFilter.category && advancedFilter.category !== 'All') cnt++;
    if (advancedFilter.sharing !== 'All') cnt++;
    if (advancedFilter.access !== 'Any Access') cnt++;
    return cnt;
  }, [advancedFilter]);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Edit Details
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>({ name: '', description: '', type: '', tags: '', status: 'Pending', notes: '' });

  const evidenceList: CaseEvidence[] = workspace?.evidence || [];

  const filtered = useMemo(() => {
    let list = [...evidenceList];

    // 1. Direct Uploaded By filter
    if (selectedUploader?.userId) {
      const targetUserId = String(selectedUploader.userId);
      const isTargetOwner = selectedUploader.role?.toLowerCase().includes('owner') || selectedUploader.role?.toLowerCase().includes('managing');

      list = list.filter((e) => {
        const uId = typeof e.uploadedBy === 'object' ? String(e.uploadedBy?.userId || '') : '';
        const uName = typeof e.uploadedBy === 'object' ? e.uploadedBy?.name : e.uploadedBy;
        const uRole = typeof e.uploadedBy === 'object' ? e.uploadedBy?.role : '';
        const isDocOwner = uRole?.toLowerCase().includes('owner') || uRole?.toLowerCase().includes('managing') || (uId && uId === String(workspace?.userId));

        if (uId && uId === targetUserId) return true;
        if (isTargetOwner && isDocOwner) return true;
        if (selectedUploader.name && uName) {
          return uName.toLowerCase().includes(selectedUploader.name.toLowerCase());
        }
        return false;
      });
    }

    // 2. Category filter
    if (advancedFilter.category && advancedFilter.category !== 'All') {
      list = list.filter(e => {
        const type = (e.type || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        const cat = advancedFilter.category.toLowerCase();

        if (cat === 'documents') {
          return type.includes('pdf') || type.includes('doc') || name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc');
        }
        if (cat === 'images') {
          return type.includes('image') || type.includes('jpg') || type.includes('png') || name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg');
        }
        if (cat === 'videos') {
          return type.includes('video') || type.includes('mp4') || name.endsWith('.mp4') || name.endsWith('.mov');
        }
        if (cat === 'audio') {
          return type.includes('audio') || type.includes('mp3') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a');
        }
        return type.includes(cat) || name.includes(cat);
      });
    }

    // 3. Sharing filter
    if (advancedFilter.sharing !== 'All') {
      list = list.filter((e) => {
        if (advancedFilter.sharing === 'Shared with Me') {
          return e.visibility === 'SELECTED' || e.sharedBy !== undefined;
        }
        if (advancedFilter.sharing === 'Shared by Me') {
          return e.sharedBy?.userId !== undefined || e.currentUserPermissions?.canManagePermissions;
        }
        return true;
      });
    }

    // 4. Access filter
    if (advancedFilter.access !== 'Any Access') {
      list = list.filter((e) => {
        const badge = e.userAccessBadge || (e.currentUserPermissions?.canEdit ? 'Editor' : e.currentUserPermissions?.canReview ? 'Review Only' : 'View Only');
        if (advancedFilter.access === 'View Only') return badge === 'View Only';
        if (advancedFilter.access === 'Review Only') return badge === 'Review Only';
        if (advancedFilter.access === 'Editor') return badge === 'Editor';
        if (advancedFilter.access === 'Reviewer / Approver') return badge === 'Reviewer / Approver' || badge === 'Full Access';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => {
        const uName = typeof e.uploadedBy === 'object' ? e.uploadedBy?.name || '' : e.uploadedBy || '';
        const matchesName = e.name.toLowerCase().includes(q);
        const matchesUploader = uName.toLowerCase().includes(q);
        const matchesType = (e.type || '').toLowerCase().includes(q);
        const matchesTags = (e.tags || []).some(t => t.toLowerCase().includes(q));
        const matchesDate = formatDate(e.uploadedDate).toLowerCase().includes(q);
        return matchesName || matchesUploader || matchesType || matchesTags || matchesDate;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadedDate || b.createdAt || '').getTime() - new Date(a.uploadedDate || a.createdAt || '').getTime();
      if (sortBy === 'oldest') return new Date(a.uploadedDate || a.createdAt || '').getTime() - new Date(b.uploadedDate || b.createdAt || '').getTime();
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [evidenceList, activeFilter, advancedFilter, searchQuery, sortBy]);

  // Staged Upload for Sharing Flow
  const [stagedFile, setStagedFile] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [uploadSharingModalOpen, setUploadSharingModalOpen] = useState(false);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setUploadTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setUploadTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const startUpload = useCallback(async (
    uri: string,
    name: string,
    mime: string,
    sharingPayload?: {
      docType: string;
      visibility: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
      sharedWith: any[];
      defaultPermissions: any;
    }
  ) => {
    const taskId = uid();
    setUploadTasks(prev => [...prev, { id: taskId, name, progress: 0, status: 'uploading' }]);
    setUploadSheetOpen(false);
    try {
      const response = await UploadService.uploadEvidence(
        workspace._id,
        uri,
        name,
        mime,
        {
          description: 'Evidence Vault Record',
          type: sharingPayload?.docType || (mime.startsWith('image/') ? 'Images' : mime.startsWith('video/') ? 'Videos' : mime.startsWith('audio/') ? 'Audio' : 'Document'),
          visibility: sharingPayload?.visibility || 'TEAM',
          sharedWith: JSON.stringify(sharingPayload?.sharedWith || []),
          defaultPermissions: JSON.stringify(sharingPayload?.defaultPermissions || {}),
        },
        (progress: number) => updateTask(taskId, { progress: Math.min(progress, 99) })
      );
      const uploaded = response.data;
      if (!uploaded) throw new Error('No data returned');

      updateTask(taskId, { status: 'done', progress: 100 });
      handleUpdateField({ evidence: [uploaded, ...(workspace.evidence || [])] });
      showToast?.('success', 'Evidence Uploaded', 'Successfully added to vault.');
      setTimeout(() => removeTask(taskId), 2000);
    } catch {
      updateTask(taskId, { status: 'failed', progress: 0 });
      showToast?.('error', 'Upload Failed', 'Please try again.');
    }
  }, [workspace, handleUpdateField, showToast, updateTask, removeTask]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      setStagedFile({ uri: a.uri, name: a.name, mime: a.mimeType || 'application/octet-stream' });
      setUploadSheetOpen(false);
      setUploadSharingModalOpen(true);
    } catch { showToast?.('error', 'File picker error'); }
  }, [showToast]);

  const handleCamera = useCallback(async () => {
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      setStagedFile({ uri: a.uri, name: `scan_${Date.now()}.jpg`, mime: 'image/jpeg' });
      setUploadSheetOpen(false);
      setUploadSharingModalOpen(true);
    } catch { showToast?.('error', 'Camera error'); }
  }, [requestPermissionFlow, showToast]);

  const handleView = () => {
    if (!selectedEvidence) return;
    setActionMenuOpen(false);
    router.push({
      pathname: '/workspace/document-viewer',
      params: {
        id: workspace._id,
        docId: selectedEvidence._id,
        url: selectedEvidence.url,
        title: selectedEvidence.name,
        type: selectedEvidence.type || 'application/octet-stream',
      },
    });
  };

  const handleOpenRename = () => {
    if (!selectedEvidence) return;
    setRenameName(selectedEvidence.name);
    setRenameOpen(true);
    setActionMenuOpen(false);
  };

  const handleRenameSubmit = async () => {
    if (!selectedEvidence || !renameName.trim()) return;
    try {
      const updated = { ...selectedEvidence, name: renameName.trim() };
      await apiClient.put(`/projects/${workspace._id}/evidence/${selectedEvidence._id}`, { name: renameName.trim() });
      handleUpdateField({
        evidence: (workspace.evidence || []).map(e => e._id === selectedEvidence._id ? updated : e)
      });
      showToast?.('success', 'Renamed', 'Evidence title updated.');
    } catch {
      showToast?.('error', 'Update Failed');
    } finally {
      setRenameOpen(false);
      setSelectedEvidence(null);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedEvidence) return;
    setEditState({
      name: selectedEvidence.name || '',
      description: selectedEvidence.description || '',
      type: selectedEvidence.type || 'Document',
      tags: (selectedEvidence.tags || []).join(', '),
      status: selectedEvidence.status || 'Pending',
      notes: selectedEvidence.notes || '',
    });
    setEditOpen(true);
    setActionMenuOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!selectedEvidence) return;
    const tags = editState.tags.split(',').map(t => t.trim()).filter(Boolean);
    const updatePayload = {
      name: editState.name.trim() || selectedEvidence.name,
      description: editState.description,
      type: editState.type,
      status: editState.status,
      notes: editState.notes,
      tags,
    };
    try {
      await apiClient.put(`/projects/${workspace._id}/evidence/${selectedEvidence._id}`, updatePayload);
      handleUpdateField({
        evidence: (workspace.evidence || []).map(e =>
          e._id === selectedEvidence._id ? { ...e, ...updatePayload } : e
        )
      });
      showToast?.('success', 'Details Updated');
    } catch {
      showToast?.('error', 'Update Failed');
    } finally {
      setEditOpen(false);
      setSelectedEvidence(null);
    }
  };

  const handleMarkVerified = async () => {
    if (!selectedEvidence) return;
    setActionMenuOpen(false);
    try {
      await apiClient.put(`/projects/${workspace._id}/evidence/${selectedEvidence._id}`, { status: 'Verified' });
      handleUpdateField({
        evidence: (workspace.evidence || []).map(e =>
          e._id === selectedEvidence._id ? { ...e, status: 'Verified' as const } : e
        )
      });
      showToast?.('success', 'Marked Verified');
    } catch {
      showToast?.('error', 'Action Failed');
    } finally {
      setSelectedEvidence(null);
    }
  };

  const handleOpenDelete = () => { setDeleteOpen(true); setActionMenuOpen(false); };

  const handleConfirmDelete = async () => {
    if (!selectedEvidence) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${workspace._id}/evidence/${selectedEvidence._id}`);
      handleUpdateField({ evidence: (workspace.evidence || []).filter(e => e._id !== selectedEvidence._id) });
      showToast?.('success', 'Evidence Deleted');
    } catch {
      handleUpdateField({ evidence: (workspace.evidence || []).filter(e => e._id !== selectedEvidence._id) });
      showToast?.('warning', 'Removed Locally');
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setSelectedEvidence(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0F' : '#F8F8FC' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Evidence</Text>
            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
              {evidenceList.length} exhibit{evidenceList.length !== 1 ? 's' : ''} in the vault
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setUploadSheetOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
          >
            <Ionicons name="add" size={16} color={BLACK} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLACK }}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: surfaceBg, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor, marginBottom: 12 }}>
          <Ionicons name="search-outline" size={16} color={textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: textPrimary }}
            placeholder="Search name, type, tags, date..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* FINAL MAIN DASHBOARD ROW: [All] [Uploaded By ▾] [Filter ▾] [Newest ▾] */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6, flexWrap: 'nowrap' }}>
          {/* [All] Button */}
          <TouchableOpacity
            onPress={() => {
              setSelectedUploader(null);
              setAdvancedFilter(DEFAULT_FILTER_STATE);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: (!selectedUploader && activeFilterCount === 0) ? GOLD : (isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5'),
              borderWidth: 1,
              borderColor: (!selectedUploader && activeFilterCount === 0) ? GOLD : borderColor,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: (!selectedUploader && activeFilterCount === 0) ? BLACK : textSecondary }}>
              All
            </Text>
          </TouchableOpacity>

          {/* [Uploaded By ▾] Button */}
          <TouchableOpacity
            onPress={() => setUploaderModalOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectedUploader ? 'rgba(212,175,55,0.18)' : (isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5'),
              borderRadius: 20,
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: selectedUploader ? GOLD : borderColor,
              gap: 4,
            }}
          >
            <Ionicons name="person-outline" size={13} color={selectedUploader ? GOLD : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: selectedUploader ? GOLD : textSecondary }}>
              {selectedUploader ? `${selectedUploader.name?.split(' ')[0]} ▾` : 'Uploaded By ▾'}
            </Text>
          </TouchableOpacity>

          {/* [Filter ▾] Button */}
          <TouchableOpacity
            onPress={() => setFilterModalOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeFilterCount > 0 ? 'rgba(212,175,55,0.18)' : (isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5'),
              borderRadius: 20,
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? GOLD : borderColor,
              gap: 4,
            }}
          >
            <Ionicons name="options-outline" size={13} color={activeFilterCount > 0 ? GOLD : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: activeFilterCount > 0 ? GOLD : textSecondary }}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount}) ▾` : ' ▾'}
            </Text>
          </TouchableOpacity>

          {/* Sort Dropdown */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() => setSortOpen(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor, gap: 4 }}
            >
              <Ionicons name="funnel-outline" size={13} color={textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: textSecondary }}>{SORT_LABELS[sortBy]}</Text>
            </TouchableOpacity>
            {sortOpen && (
              <View style={{ position: 'absolute', top: 36, right: 0, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, zIndex: 99, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, minWidth: 120 }}>
                {(Object.keys(SORT_LABELS) as SortBy[]).map((key, i, arr) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { setSortBy(key); setSortOpen(false); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: sortBy === key ? '800' : '500', color: sortBy === key ? GOLD : textPrimary }}>{SORT_LABELS[key]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* List */}
        {filtered.length === 0 && uploadTasks.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor }}>
            <Ionicons name="folder-open-outline" size={32} color={GOLD} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>No evidence available for your current access</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', paddingHorizontal: 30 }}>Upload photographs, videos, call logs, files, and transcripts.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map(evidence => {
              const { bg: statusBg, text: statusText, label: statusLabel } = getVerificationBadge(evidence.status);
              const { name: iconName, color: iconColor } = getFileIcon(evidence.type, evidence.name);
              const rawUName = typeof evidence.uploadedBy === 'object' ? evidence.uploadedBy?.name : evidence.uploadedBy;
              const rawURole = typeof evidence.uploadedBy === 'object' ? evidence.uploadedBy?.role : '';
              const hasName = rawUName && rawUName !== 'undefined' && rawUName !== 'null';
              const uploaderLabel = hasName
                ? `${rawUName}${rawURole ? ` • ${rawURole}` : ''}`
                : 'Uploader information unavailable';

              const accessBadge = evidence.userAccessBadge || (evidence.currentUserPermissions?.canManagePermissions ? 'Full Access' : evidence.currentUserPermissions?.canEdit ? 'Editor' : evidence.currentUserPermissions?.canReview ? 'Review Only' : 'View Only');

              return (
                <TouchableOpacity
                  key={evidence._id}
                  onPress={() => { setSelectedEvidence(evidence); setActionMenuOpen(true); }}
                  activeOpacity={0.8}
                  style={{ minHeight: 90, backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor, gap: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${iconColor}15`, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={iconName} size={22} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                        {evidence.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={{ backgroundColor: statusBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: statusText }}>{statusLabel}</Text>
                        </View>
                        {evidence.exhibitNumber && (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: GOLD }}>{evidence.exhibitNumber}</Text>
                        )}
                        <Text style={{ fontSize: 11, color: textSecondary }}>{formatDate(evidence.uploadedDate || evidence.createdAt)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedEvidence(evidence); setActionMenuOpen(true); }} style={{ padding: 6 }}>
                      <Ionicons name="ellipsis-vertical" size={18} color={textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Uploader & Access Badges Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                      <Ionicons name="person-circle-outline" size={14} color={GOLD} />
                      <Text style={{ fontSize: 11, color: textSecondary }}>
                        Uploaded by: <Text style={{ fontWeight: '700', color: textPrimary }}>{uploaderLabel}</Text>
                      </Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(212,175,55,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: GOLD }}>
                        Your Access: {accessBadge}
                      </Text>
                    </View>
                  </View>

                  {/* Shared By notice if reshared */}
                  {evidence.sharedBy && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                      Shared by {evidence.sharedBy.name} {evidence.sharedBy.role ? `(${evidence.sharedBy.role})` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Upload Sheet */}
      <Modal visible={uploadSheetOpen} transparent animationType="slide" onRequestClose={() => setUploadSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setUploadSheetOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 22 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 14, textAlign: 'center' }}>Upload Evidence</Text>
            <TouchableOpacity onPress={handleCamera} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
              <Ionicons name="camera-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Capture Scan Document</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickFile} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <Ionicons name="folder-open-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Choose From Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upload & Sharing Modal */}
      {stagedFile && (
        <CaseUploadWithSharingModal
          visible={uploadSharingModalOpen}
          fileName={stagedFile.name}
          mimeType={stagedFile.mime}
          moduleType="Evidence"
          members={teamMembersList}
          isFirmOwner={true}
          onClose={() => setUploadSharingModalOpen(false)}
          onUploadSubmit={(payload) => {
            if (stagedFile) {
              startUpload(stagedFile.uri, payload.name, stagedFile.mime, payload);
            }
          }}
        />
      )}

      {/* Action Menu */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setActionMenuOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor }}>
            {selectedEvidence && (
              <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>{selectedEvidence.name}</Text>
                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>Type: {selectedEvidence.type} · Status: {selectedEvidence.status || 'Pending'}</Text>
              </View>
            )}
            {[
              { icon: 'eye-outline', label: 'View & Analyze', color: GOLD, onPress: handleView },
              { icon: 'share-social-outline', label: 'Share & Permissions', color: textPrimary, onPress: () => { setActionMenuOpen(false); setShareModalOpen(true); } },
              { icon: 'checkmark-done-circle-outline', label: 'Review Exhibit', color: textPrimary, onPress: () => { setActionMenuOpen(false); setReviewModalOpen(true); } },
              { icon: 'pencil-outline', label: 'Rename', color: textPrimary, onPress: handleOpenRename },
              { icon: 'create-outline', label: 'Edit Details', color: textPrimary, onPress: handleOpenEdit },
              { icon: 'checkmark-circle-outline', label: 'Mark Verified', color: '#10B981', onPress: handleMarkVerified },
              { icon: 'trash-outline', label: 'Delete Exhibit', color: '#EF4444', onPress: handleOpenDelete },
            ].map((action, idx, arr) => (
              <TouchableOpacity
                key={action.label}
                onPress={action.onPress}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: borderColor }}
              >
                <Ionicons name={action.icon} size={20} color={action.color} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: action.color }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Uploaded By Bottom Sheet Modal */}
      <CaseUploaderBottomSheetModal
        visible={uploaderModalOpen}
        selectedUploaderId={selectedUploader?.userId}
        members={teamMembersList}
        ownerInfo={workspace?.ownerInfo || {
          userId: workspace?.userId,
          name: workspace?.ownerName || (workspace as any)?.user?.name || workspace?.leadAdvocate || 'Firm Owner',
          role: 'Firm Owner',
        }}
        onClose={() => setUploaderModalOpen(false)}
        onSelectUploader={(member) => setSelectedUploader(member)}
      />

      {/* Filter Bottom Sheet Modal */}
      <CaseFilterBottomSheetModal
        visible={filterModalOpen}
        filterState={advancedFilter}
        categories={['All', 'Documents', 'Images', 'Videos', 'Audio']}
        onClose={() => setFilterModalOpen(false)}
        onApply={(newState) => setAdvancedFilter(newState)}
        onReset={() => setAdvancedFilter(DEFAULT_FILTER_STATE)}
        title="FILTER EVIDENCE VAULT"
      />

      {/* Share & Permissions Modal */}
      {selectedEvidence && (
        <SharePermissionsModal
          visible={shareModalOpen}
          itemTitle={selectedEvidence.name}
          itemType="Evidence"
          currentVisibility={selectedEvidence.visibility}
          currentSharedWith={selectedEvidence.sharedWith}
          onClose={() => setShareModalOpen(false)}
          onSave={async (visibility, sharedWith) => {
            try {
              await apiClient.post(`/projects/${workspace._id}/evidence/${selectedEvidence._id}/share`, { visibility, sharedWith });
              handleUpdateField({
                evidence: (workspace.evidence || []).map(e =>
                  e._id === selectedEvidence._id ? { ...e, visibility, sharedWith } : e
                )
              });
              showToast?.('success', 'Permissions Updated');
            } catch {
              showToast?.('error', 'Update Failed');
            }
          }}
        />
      )}

      {/* Rename Modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 16, textAlign: 'center' }}>Rename Evidence</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 20 }}
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setRenameOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameSubmit} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: BLACK }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor, marginVertical: 40 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 18, textAlign: 'center' }}>Edit Details</Text>
              {[
                { key: 'name', label: 'Title' },
                { key: 'type', label: 'Type' },
                { key: 'tags', label: 'Tags' },
                { key: 'description', label: 'Description' },
                { key: 'notes', label: 'Notes' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 5 }}>{f.label}</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg }}
                    value={(editState as any)[f.key]}
                    onChangeText={v => setEditState(prev => ({ ...prev, [f.key]: v }))}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity onPress={() => setEditOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEditSubmit} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: BLACK }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor }}>
            <Ionicons name="trash" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>Delete Evidence?</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 20 }}>This file will be permanently removed.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default EvidenceManagerModule;
