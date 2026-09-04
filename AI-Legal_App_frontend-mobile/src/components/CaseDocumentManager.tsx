import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Platform, Pressable,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { UploadService } from '@/services/upload.service';
import { CaseDocument, CaseWorkspace } from '@/types';
import { SharePermissionsModal } from './SharePermissionsModal';
import { CaseFilterBottomSheetModal, FilterState, DEFAULT_FILTER_STATE } from './CaseFilterBottomSheetModal';
import { CaseUploaderBottomSheetModal, UploaderMember } from './CaseUploaderBottomSheetModal';
import { CaseUploadWithSharingModal } from './CaseUploadWithSharingModal';

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'failed' | 'complete';
  uri: string;
  mime: string;
  docType: CaseDocument['type'];
}

type SortBy = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type FilterType = 'All' | CaseDocument['type'];

interface Props {
  workspace: CaseWorkspace;
  theme: Record<string, any>;
  t?: (key: string) => string;
  language?: string;
  handleUpdateField: (updates: Partial<CaseWorkspace>) => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

const DOC_TYPES: CaseDocument['type'][] = ['Notice', 'Agreement', 'Proof', 'Filing', 'Other'];
const FILTER_TABS: FilterType[] = ['All', 'Notice', 'Agreement', 'Proof', 'Filing', 'Other'];
const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'name-asc': 'A → Z',
  'name-desc': 'Z → A',
};

function getFileIcon(name: string, type?: string): { icon: string; color: string } {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { icon: 'document-text', color: '#EF4444' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'document-text', color: '#3B82F6' };
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return { icon: 'image', color: '#10B981' };
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return { icon: 'videocam', color: '#F59E0B' };
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext)) return { icon: 'volume-high', color: '#8B5CF6' };
  return { icon: 'document-outline', color: '#9CA3AF' };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

import { usePermissionFlow } from '@/providers';
import { getGlobalActiveWorkspaceType } from '@/providers/workspace.provider';

export function CaseDocumentManager({
  workspace,
  theme,
  handleUpdateField,
  showToast,
}: Props) {
  const router = useRouter();
  const { requestPermissionFlow } = usePermissionFlow();
  const isDark = theme.isDark ?? false;

  const currentWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : ((workspace as any).workspaceType || 'advocate');
  const isLawFirm = currentWsType === 'law_firm' || (workspace as any).workspaceType === 'law_firm';

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
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<CaseDocument['type']>('Other');
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editTags, setEditTags] = useState('');
  const [editType, setEditType] = useState<CaseDocument['type']>('Other');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Uploaded By Modal & State
  const [uploaderModalOpen, setUploaderModalOpen] = useState(false);
  const [selectedUploader, setSelectedUploader] = useState<UploaderMember | null>(null);

  // Compact Filter Bottom Sheet
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [advancedFilter, setAdvancedFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const teamMembersList = useMemo(() => {
    const lawyers = workspace.lawyers || [];
    const assigned = workspace.assignedMembers || [];
    const team = workspace.teamMembers || [];
    const docs = workspace.documents || [];
    const evs = workspace.evidence || [];

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
  }, [workspace.lawyers, workspace.assignedMembers, workspace.teamMembers, workspace.documents, workspace.evidence]);

  const activeFilterCount = useMemo(() => {
    let cnt = 0;
    if (advancedFilter.category && advancedFilter.category !== 'All') cnt++;
    if (advancedFilter.sharing !== 'All') cnt++;
    if (advancedFilter.access !== 'Any Access') cnt++;
    return cnt;
  }, [advancedFilter]);

  const documents = useMemo(() => workspace.documents || [], [workspace.documents]);

  const filteredDocs = useMemo(() => {
    let list = [...documents];

    // 1. Direct Uploaded By filter
    if (selectedUploader?.userId) {
      const targetUserId = String(selectedUploader.userId);
      const isTargetOwner = selectedUploader.role?.toLowerCase().includes('owner') || selectedUploader.role?.toLowerCase().includes('managing');

      list = list.filter((doc) => {
        const uId = typeof doc.uploadedBy === 'object' ? String(doc.uploadedBy?.userId || '') : '';
        const uName = typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.name : doc.uploadedBy;
        const uRole = typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.role : '';
        const isDocOwner = uRole?.toLowerCase().includes('owner') || uRole?.toLowerCase().includes('managing') || (uId && uId === String(workspace.userId));

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
      list = list.filter((doc) => doc.type === advancedFilter.category);
    }

    // 3. Sharing filter
    if (advancedFilter.sharing !== 'All') {
      list = list.filter((doc) => {
        if (advancedFilter.sharing === 'Shared with Me') {
          return doc.visibility === 'SELECTED' || doc.sharedBy !== undefined;
        }
        if (advancedFilter.sharing === 'Shared by Me') {
          return doc.sharedBy?.userId !== undefined || doc.currentUserPermissions?.canManagePermissions;
        }
        return true;
      });
    }

    // 4. Access filter
    if (advancedFilter.access !== 'Any Access') {
      list = list.filter((doc) => {
        const badge = doc.userAccessBadge || (doc.currentUserPermissions?.canEdit ? 'Editor' : doc.currentUserPermissions?.canReview ? 'Review Only' : 'View Only');
        if (advancedFilter.access === 'View Only') return badge === 'View Only';
        if (advancedFilter.access === 'Review Only') return badge === 'Review Only';
        if (advancedFilter.access === 'Editor') return badge === 'Editor';
        if (advancedFilter.access === 'Reviewer / Approver') return badge === 'Reviewer / Approver' || badge === 'Full Access';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((doc) => {
        const uName = typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.name || '' : doc.uploadedBy || '';
        return (
          doc.name.toLowerCase().includes(q) ||
          uName.toLowerCase().includes(q) ||
          (doc.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      if (sortBy === 'oldest') return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });
    return list;
  }, [documents, activeFilter, advancedFilter, searchQuery, sortBy]);

  // Staged Upload for Sharing Flow
  const [stagedFile, setStagedFile] = useState<{ uri: string; name: string; mime: string; docType: CaseDocument['type'] } | null>(null);
  const [uploadSharingModalOpen, setUploadSharingModalOpen] = useState(false);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setUploadTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const handleUpload = useCallback(async (
    uri: string,
    name: string,
    mime: string,
    type: CaseDocument['type'],
    sharingPayload?: {
      visibility: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
      sharedWith: any[];
      defaultPermissions: any;
    }
  ) => {
    const taskId = uid();
    setUploadTasks((prev) => [
      ...prev,
      { id: taskId, name, progress: 0, status: 'uploading', uri, mime, docType: type },
    ]);
    setUploadSheetOpen(false);

    try {
      const response = await UploadService.uploadCaseDocument(
        workspace._id,
        uri,
        name,
        mime,
        type,
        {
          visibility: sharingPayload?.visibility || 'TEAM',
          sharedWith: JSON.stringify(sharingPayload?.sharedWith || []),
          defaultPermissions: JSON.stringify(sharingPayload?.defaultPermissions || {}),
        },
        (progress: number) => updateTask(taskId, { progress: Math.min(progress, 99) })
      );
      const uploadedDoc = response.data;
      if (uploadedDoc) {
        updateTask(taskId, { status: 'complete', progress: 100 });
        const newDocs: CaseDocument[] = [uploadedDoc, ...documents];
        handleUpdateField({ documents: newDocs });
        showToast?.('success', 'Document Uploaded', 'Successfully uploaded document to workspace.');
        setTimeout(() => setUploadTasks((prev) => prev.filter((t) => t.id !== taskId)), 1500);
      } else {
        throw new Error('Null data');
      }
    } catch {
      updateTask(taskId, { status: 'failed', progress: 0 });
      showToast?.('error', 'Upload Failed', 'Try again.');
    }
  }, [workspace._id, documents, handleUpdateField, showToast, updateTask]);

  const pickDocument = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const mime = asset.mimeType || 'application/octet-stream';
      setUploadSheetOpen(false);

      if (isLawFirm) {
        setStagedFile({
          uri: asset.uri,
          name: asset.name,
          mime,
          docType: pendingDocType,
        });
        setUploadSharingModalOpen(true);
      } else {
        handleUpload(asset.uri, asset.name, mime, pendingDocType);
      }
    } catch {
      showToast?.('error', 'Picker Error');
    }
  }, [pendingDocType, showToast, isLawFirm, handleUpload]);

  const capturePhoto = useCallback(async () => {
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const name = `scan_${Date.now()}.jpg`;
      setUploadSheetOpen(false);

      if (isLawFirm) {
        setStagedFile({
          uri: asset.uri,
          name,
          mime: 'image/jpeg',
          docType: pendingDocType,
        });
        setUploadSharingModalOpen(true);
      } else {
        handleUpload(asset.uri, name, 'image/jpeg', pendingDocType);
      }
    } catch {
      showToast?.('error', 'Camera Error');
    }
  }, [requestPermissionFlow, pendingDocType, showToast, isLawFirm, handleUpload]);

  const choosePhoto = useCallback(async () => {
    try {
      const granted = await requestPermissionFlow('photos');
      if (!granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const name = asset.fileName || `photo_${Date.now()}.jpg`;
      const mime = asset.mimeType || 'image/jpeg';
      setUploadSheetOpen(false);

      if (isLawFirm) {
        setStagedFile({
          uri: asset.uri,
          name,
          mime,
          docType: pendingDocType,
        });
        setUploadSharingModalOpen(true);
      } else {
        handleUpload(asset.uri, name, mime, pendingDocType);
      }
    } catch {
      showToast?.('error', 'Gallery Error');
    }
  }, [requestPermissionFlow, pendingDocType, showToast, isLawFirm, handleUpload]);

  const handleOpenActionMenu = (doc: CaseDocument) => {
    setSelectedDoc(doc);
    setActionMenuOpen(true);
  };

  const handleSaveSharingPermissions = async (visibility: any, sharedWith: any) => {
    if (!selectedDoc) return;
    try {
      const updatedDocs = documents.map((d) => {
        if (d._id === selectedDoc._id) {
          return { ...d, visibility, sharedWith };
        }
        return d;
      });
      handleUpdateField({ documents: updatedDocs });
      showToast?.('success', 'Permissions Updated', 'Sharing settings saved successfully.');
    } catch {
      showToast?.('error', 'Share Error', 'Failed to update sharing settings.');
    }
  };

  const handleReviewAction = async (status: 'Approved' | 'Rejected' | 'Changes Requested') => {
    if (!selectedDoc) return;
    try {
      setIsSubmittingReview(true);
      const updatedDocs = documents.map((d) => {
        if (d._id === selectedDoc._id) {
          return { ...d, reviewStatus: status };
        }
        return d;
      });
      handleUpdateField({ documents: updatedDocs });
      setReviewModalOpen(false);
      showToast?.('success', 'Review Recorded', `Document marked as ${status}.`);
    } catch {
      showToast?.('error', 'Review Error', 'Failed to record review status.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleView = () => {
    if (!selectedDoc) return;
    setActionMenuOpen(false);
    router.push({
      pathname: '/workspace/document-viewer',
      params: {
        id: workspace._id,
        docId: selectedDoc._id,
        url: selectedDoc.url,
        title: selectedDoc.name,
        type: selectedDoc.type,
      },
    });
  };

  const handleOpenRename = () => {
    if (!selectedDoc) return;
    setRenameName(selectedDoc.name);
    setRenameOpen(true);
    setActionMenuOpen(false);
  };

  const handleRenameSubmit = () => {
    if (!selectedDoc || !renameName.trim()) return;
    const newDocs = documents.map((d) =>
      d._id === selectedDoc._id ? { ...d, name: renameName.trim() } : d
    );
    handleUpdateField({ documents: newDocs });
    setRenameOpen(false);
    showToast?.('success', 'Renamed', 'Document renamed.');
  };

  const handleOpenEdit = () => {
    if (!selectedDoc) return;
    setEditTags((selectedDoc.tags || []).join(', '));
    setEditType(selectedDoc.type);
    setEditOpen(true);
    setActionMenuOpen(false);
  };

  const handleEditSubmit = () => {
    if (!selectedDoc) return;
    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const newDocs = documents.map((d) =>
      d._id === selectedDoc._id ? { ...d, type: editType, tags } : d
    );
    handleUpdateField({ documents: newDocs });
    setEditOpen(false);
    showToast?.('success', 'Updated', 'Metadata saved.');
  };

  const handleOpenDelete = () => {
    setDeleteOpen(true);
    setActionMenuOpen(false);
  };

  const handleDeleteSubmit = () => {
    if (!selectedDoc) return;
    const newDocs = documents.filter((d) => d._id !== selectedDoc._id);
    handleUpdateField({ documents: newDocs });
    setDeleteOpen(false);
    showToast?.('success', 'Deleted', 'Document deleted.');
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
            <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Documents</Text>
            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>{documents.length} files stored</Text>
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
            placeholder="Search documents by name or tags..."
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

          {/* [Uploaded By ▾] Button - Law Firm Only */}
          {isLawFirm && (
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
          )}

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
              onPress={() => setSortDropOpen((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor, gap: 4 }}
            >
              <Ionicons name="funnel-outline" size={13} color={textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: textSecondary }}>{SORT_LABELS[sortBy]}</Text>
            </TouchableOpacity>
            {sortDropOpen && (
              <View style={{ position: 'absolute', top: 36, right: 0, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, zIndex: 99, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, minWidth: 120 }}>
                {(Object.keys(SORT_LABELS) as SortBy[]).map((key, idx, arr) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      setSortBy(key);
                      setSortDropOpen(false);
                    }}
                    style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: sortBy === key ? '800' : '500', color: sortBy === key ? GOLD : textPrimary }}>
                      {SORT_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Upload tasks */}
        {uploadTasks.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: t.status === 'failed' ? '#EF4444' : borderColor, marginBottom: 8, gap: 12 }}>
            <ActivityIndicator size="small" color={GOLD} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                {t.status === 'uploading' ? `Uploading (${t.progress}%)...` : 'Complete'}
              </Text>
            </View>
          </View>
        ))}

        {/* Files List */}
        {filteredDocs.length === 0 && uploadTasks.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor }}>
            <Ionicons name="folder-open-outline" size={32} color={GOLD} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>No documents available for your current access</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>Upload notices, agreements, evidence, filings, and letters.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredDocs.map((doc) => {
              const fileInfo = getFileIcon(doc.name, doc.type);
              const rawUName = typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.name : doc.uploadedBy;
              const rawURole = typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.role : '';
              const hasName = rawUName && rawUName !== 'undefined' && rawUName !== 'null';
              const uploaderLabel = hasName
                ? `${rawUName}${rawURole ? ` • ${rawURole}` : ''}`
                : 'Uploader information unavailable';

              const accessBadge = doc.userAccessBadge || (doc.currentUserPermissions?.canManagePermissions ? 'Full Access' : doc.currentUserPermissions?.canEdit ? 'Editor' : doc.currentUserPermissions?.canReview ? 'Review Only' : 'View Only');

              return (
                <TouchableOpacity
                  key={doc._id}
                  onPress={() => handleOpenActionMenu(doc)}
                  style={{ minHeight: 88, backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor, gap: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${fileInfo.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={fileInfo.icon} size={22} color={fileInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>
                        {doc.type} · {formatDate(doc.uploadDate)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenActionMenu(doc)} style={{ padding: 6 }}>
                      <Ionicons name="ellipsis-vertical" size={18} color={textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Uploader & Access Badges Row - Law Firm Only */}
                  {isLawFirm && (
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
                  )}

                  {/* Shared By notice if reshared */}
                  {isLawFirm && doc.sharedBy && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                      Shared by {doc.sharedBy.name} {doc.sharedBy.role ? `(${doc.sharedBy.role})` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Upload Bottom Sheet */}
      <Modal visible={uploadSheetOpen} transparent animationType="slide" onRequestClose={() => setUploadSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setUploadSheetOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, textAlign: 'center', marginBottom: 14 }}>Add Document</Text>
            
            <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Select Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setPendingDocType(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: pendingDocType === t ? GOLD : surfaceBg, borderWidth: 1, borderColor: pendingDocType === t ? GOLD : borderColor }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: pendingDocType === t ? BLACK : textSecondary }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={capturePhoto} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
              <Ionicons name="camera-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Scan Document</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocument} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
              <Ionicons name="folder-open-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Upload from Device</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={choosePhoto} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <Ionicons name="image-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Choose Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upload & Sharing Modal (LAW FIRM ONLY) */}
      {isLawFirm && stagedFile && (
        <CaseUploadWithSharingModal
          visible={uploadSharingModalOpen}
          fileName={stagedFile.name}
          mimeType={stagedFile.mime}
          moduleType="Document"
          members={teamMembersList}
          isFirmOwner={true}
          onClose={() => setUploadSharingModalOpen(false)}
          onUploadSubmit={(payload: any) => {
            setUploadSharingModalOpen(false);
            if (stagedFile) {
              handleUpload(stagedFile.uri, payload.name, stagedFile.mime, payload.docType as any, payload);
            }
          }}
        />
      )}

      {/* Action Menu */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setActionMenuOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor }}>
            {selectedDoc && (
              <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>{selectedDoc.name}</Text>
                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{selectedDoc.type} · Status: {selectedDoc.reviewStatus || 'Pending Review'}</Text>
              </View>
            )}
            {[
              { icon: 'eye-outline', label: 'View Document', color: GOLD, onPress: handleView },
              ...(isLawFirm ? [
                { icon: 'share-social-outline', label: 'Share & Permissions', color: textPrimary, onPress: () => { setActionMenuOpen(false); setShareModalOpen(true); } },
                { icon: 'checkmark-done-circle-outline', label: 'Review / Approve', color: textPrimary, onPress: () => { setActionMenuOpen(false); setReviewModalOpen(true); } },
              ] : []),
              { icon: 'pencil-outline', label: 'Rename', color: textPrimary, onPress: handleOpenRename },
              { icon: 'create-outline', label: 'Edit Details', color: textPrimary, onPress: handleOpenEdit },
              { icon: 'trash-outline', label: 'Delete', color: '#EF4444', onPress: handleOpenDelete },
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
        ownerInfo={workspace.ownerInfo || {
          userId: workspace.userId,
          name: workspace.ownerName || (workspace as any).user?.name || workspace.leadAdvocate || 'Firm Owner',
          role: 'Firm Owner',
        }}
        onClose={() => setUploaderModalOpen(false)}
        onSelectUploader={(member) => setSelectedUploader(member)}
      />

      {/* Filter Bottom Sheet Modal */}
      <CaseFilterBottomSheetModal
        visible={filterModalOpen}
        filterState={advancedFilter}
        categories={['All', 'Notice', 'Agreement', 'Pleading', 'Affidavit', 'Other']}
        onClose={() => setFilterModalOpen(false)}
        onApply={(newState) => setAdvancedFilter(newState)}
        onReset={() => setAdvancedFilter(DEFAULT_FILTER_STATE)}
        title="FILTER DOCUMENTS"
      />

      {/* Share & Permissions Modal */}
      {selectedDoc && (
        <SharePermissionsModal
          visible={shareModalOpen}
          itemTitle={selectedDoc.name}
          itemType="Document"
          currentVisibility={selectedDoc.visibility}
          currentSharedWith={selectedDoc.sharedWith}
          onClose={() => setShareModalOpen(false)}
          onSave={handleSaveSharingPermissions}
        />
      )}

      {/* Review Modal */}
      <Modal visible={reviewModalOpen} transparent animationType="fade" onRequestClose={() => setReviewModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 6, textAlign: 'center' }}>Review Document</Text>
            <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 16, textAlign: 'center' }}>{selectedDoc?.name}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => handleReviewAction('Approved')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: '#10B981', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReviewAction('Changes Requested')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: '#F5E90B', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B' }}>Request Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReviewAction('Rejected')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#EF4444', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>Reject</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setReviewModalOpen(false)} style={{ height: 44, borderRadius: 12, backgroundColor: surfaceBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 16, textAlign: 'center' }}>Rename Document</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 16, textAlign: 'center' }}>Edit Details</Text>
            
            <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>Tags (comma-separated)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 14 }}
              value={editTags}
              onChangeText={setEditTags}
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>Document Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEditType(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: editType === t ? GOLD : surfaceBg, borderWidth: 1, borderColor: editType === t ? GOLD : borderColor }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: editType === t ? BLACK : textSecondary }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditSubmit} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: BLACK }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor }}>
            <Ionicons name="trash" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>Delete Document?</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginBottom: 20 }}>This file will be permanently removed.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSubmit} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CaseDocumentManager;
