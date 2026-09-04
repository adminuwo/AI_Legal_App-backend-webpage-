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
import { API_ENDPOINTS } from '@/constants';
import { CaseContract, CaseWorkspace } from '@/types';

type SortBy = 'newest' | 'oldest' | 'name-asc';
type FilterStatus = 'All' | 'Analyzed' | 'Not Analyzed' | 'Needs Review';

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'done' | 'failed';
}

interface EditState {
  title: string;
  category: string;
  tags: string;
  description: string;
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

const FILTER_TABS: FilterStatus[] = ['All', 'Analyzed', 'Not Analyzed', 'Needs Review'];
const SORT_LABELS: Record<SortBy, string> = { newest: 'Newest', oldest: 'Oldest', 'name-asc': 'A → Z' };

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusColor(c: CaseContract): { bg: string; text: string; label: string } {
  if (c.aiStatus === 'Analyzed') return { bg: '#D1FAE5', text: '#065F46', label: 'AI Analyzed' };
  if (c.ocrStatus === 'Pending') return { bg: '#FEF3C7', text: '#92400E', label: 'Analyzing…' };
  return { bg: '#FEE2E2', text: '#991B1B', label: 'Needs Review' };
}

function getFileIcon(fileType?: string): { name: string; color: string } {
  const t = (fileType || '').toLowerCase();
  if (t.includes('pdf')) return { name: 'document-text', color: '#EF4444' };
  if (t.includes('doc')) return { name: 'document-text', color: '#3B82F6' };
  if (t.includes('image') || t.includes('jpg') || t.includes('png')) return { name: 'image', color: '#10B981' };
  return { name: 'document-outline', color: '#9CA3AF' };
}

import { usePermissionFlow } from '@/providers';

export function ContractManagerModule({ workspace, theme, handleUpdateField, showToast }: Props) {
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
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // Upload
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  // Action Menu
  const [selectedContract, setSelectedContract] = useState<CaseContract | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Edit Details
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>({ title: '', category: '', tags: '', description: '', notes: '' });

  // Re-analyze
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  const contracts: CaseContract[] = workspace?.contracts || [];

  const filtered = useMemo(() => {
    let list = [...contracts];
    if (activeFilter !== 'All') {
      if (activeFilter === 'Analyzed') list = list.filter(c => c.aiStatus === 'Analyzed');
      else if (activeFilter === 'Not Analyzed') list = list.filter(c => c.aiStatus !== 'Analyzed');
      else if (activeFilter === 'Needs Review') list = list.filter(c => c.aiStatus !== 'Analyzed' && c.ocrStatus !== 'Pending');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime();
      if (sortBy === 'oldest') return new Date(a.uploadedDate).getTime() - new Date(b.uploadedDate).getTime();
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [contracts, activeFilter, searchQuery, sortBy]);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setUploadTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setUploadTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const startUpload = useCallback(async (uri: string, name: string, mime: string) => {
    const taskId = uid();
    setUploadTasks(prev => [...prev, { id: taskId, name, progress: 0, status: 'uploading' }]);
    setUploadSheetOpen(false);
    try {
      const response = await UploadService.uploadContract(
        workspace._id,
        uri,
        name,
        mime,
        (progress: number) => updateTask(taskId, { progress: Math.min(progress, 90) })
      );
      const uploaded = response.data;
      if (!uploaded) throw new Error('No data');
      updateTask(taskId, { status: 'analyzing', progress: 95 });

      try {
        await apiClient.post(`/projects/${workspace._id}/contracts/${uploaded._id}/analyze`);
        const updatedContract = { ...uploaded, aiStatus: 'Analyzed' as const };
        handleUpdateField({ contracts: [...(workspace.contracts || []), updatedContract] });
      } catch {
        handleUpdateField({ contracts: [...(workspace.contracts || []), uploaded] });
      }

      updateTask(taskId, { status: 'done', progress: 100 });
      showToast?.('success', 'Contract Uploaded');
      setTimeout(() => removeTask(taskId), 2500);
    } catch {
      updateTask(taskId, { status: 'failed', progress: 0 });
      showToast?.('error', 'Upload Failed');
    }
  }, [workspace._id, handleUpdateField, showToast, updateTask, removeTask]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      await startUpload(a.uri, a.name, a.mimeType || 'application/octet-stream');
    } catch { showToast?.('error', 'File picker error'); }
  }, [startUpload, showToast]);

  const handleCamera = useCallback(async () => {
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      await startUpload(a.uri, `scan_${Date.now()}.jpg`, 'image/jpeg');
    } catch { showToast?.('error', 'Camera error'); }
  }, [requestPermissionFlow, startUpload, showToast]);

  const handleView = () => {
    if (!selectedContract) return;
    setActionMenuOpen(false);
    router.push({
      pathname: '/workspace/document-viewer',
      params: {
        id: workspace._id,
        docId: selectedContract._id,
        url: selectedContract.url,
        title: selectedContract.name,
        type: selectedContract.fileType || 'application/octet-stream',
      },
    });
  };

  const handleOpenRename = () => {
    if (!selectedContract) return;
    setRenameName(selectedContract.name);
    setRenameOpen(true);
    setActionMenuOpen(false);
  };

  const handleRenameSubmit = () => {
    if (!selectedContract || !renameName.trim()) return;
    handleUpdateField({
      contracts: (workspace.contracts || []).map(c =>
        c._id === selectedContract._id ? { ...c, name: renameName.trim() } : c
      )
    });
    showToast?.('success', 'Renamed');
    setRenameOpen(false);
    setSelectedContract(null);
  };

  const handleOpenEdit = () => {
    if (!selectedContract) return;
    setEditState({
      title: selectedContract.name || '',
      category: (selectedContract as any).category || '',
      tags: ((selectedContract as any).tags || []).join(', '),
      description: (selectedContract as any).description || '',
      notes: (selectedContract as any).notes || '',
    });
    setEditOpen(true);
    setActionMenuOpen(false);
  };

  const handleEditSubmit = () => {
    if (!selectedContract) return;
    const tags = editState.tags.split(',').map(t => t.trim()).filter(Boolean);
    handleUpdateField({
      contracts: (workspace.contracts || []).map(c =>
        c._id === selectedContract._id ? { ...c, name: editState.title.trim() || c.name, ...(editState as any), tags } : c
      )
    });
    showToast?.('success', 'Details Saved');
    setEditOpen(false);
    setSelectedContract(null);
  };

  const handleReanalyze = async () => {
    if (!selectedContract) return;
    setActionMenuOpen(false);
    setReanalyzing(selectedContract._id);
    try {
      const response = await apiClient.post<any>(`/projects/${workspace._id}/contracts/${selectedContract._id}/analyze`);
      if (response.data) {
        handleUpdateField({
          contracts: (workspace.contracts || []).map(c =>
            c._id === selectedContract._id ? { ...c, aiStatus: 'Analyzed' as const, analysisReport: response.data.analysis || c.analysisReport } : c
          )
        });
        showToast?.('success', 'Re-Analysis Complete');
      }
    } catch {
      showToast?.('error', 'Re-Analysis Failed');
    } finally {
      setReanalyzing(null);
      setSelectedContract(null);
    }
  };

  const handleOpenDelete = () => { setDeleteOpen(true); setActionMenuOpen(false); };

  const handleConfirmDelete = async () => {
    if (!selectedContract) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${workspace._id}/contracts/${selectedContract._id}`);
      handleUpdateField({ contracts: (workspace.contracts || []).filter(c => c._id !== selectedContract._id) });
      showToast?.('success', 'Deleted');
    } catch {
      handleUpdateField({ contracts: (workspace.contracts || []).filter(c => c._id !== selectedContract._id) });
      showToast?.('warning', 'Removed Locally');
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setSelectedContract(null);
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
            <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Contracts</Text>
            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>{contracts.length} contracts in workspace</Text>
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
            placeholder="Search contracts..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter + Sort */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {FILTER_TABS.map(f => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? GOLD : (isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F5'), marginRight: 6, borderWidth: 1, borderColor: active ? GOLD : borderColor }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? BLACK : textSecondary }}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        {filtered.length === 0 && uploadTasks.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor }}>
            <Ionicons name="document-text-outline" size={32} color={GOLD} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>No contracts uploaded yet</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', paddingHorizontal: 30 }}>Upload agreements, NDAs, leases and vendor contracts.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filtered.map(contract => {
              const { bg: statusBg, text: statusText, label: statusLabel } = getStatusColor(contract);
              const { name: iconName, color: iconColor } = getFileIcon(contract.fileType);
              const isBeingAnalyzed = reanalyzing === contract._id;

              return (
                <TouchableOpacity
                  key={contract._id}
                  onPress={() => { setSelectedContract(contract); setActionMenuOpen(true); }}
                  activeOpacity={0.8}
                  style={{ height: 75, flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor, gap: 12 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${iconColor}15`, justifyContent: 'center', alignItems: 'center' }}>
                    {isBeingAnalyzed ? <ActivityIndicator size="small" color={GOLD} /> : <Ionicons name={iconName} size={22} color={iconColor} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                      {contract.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={{ backgroundColor: statusBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: statusText }}>{statusLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: textSecondary }}>{formatDate(contract.uploadedDate)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedContract(contract); setActionMenuOpen(true); }} style={{ padding: 6 }}>
                    <Ionicons name="ellipsis-vertical" size={18} color={textSecondary} />
                  </TouchableOpacity>
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
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 14, textAlign: 'center' }}>Upload Contract</Text>
            <TouchableOpacity onPress={handleCamera} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
              <Ionicons name="camera-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Capture Scan Contract</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickFile} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <Ionicons name="folder-open-outline" size={20} color={GOLD} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>Choose From Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Action Menu */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setActionMenuOpen(false)} />
          <View style={{ backgroundColor: cardBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor }}>
            {[
              { icon: 'eye-outline', label: 'View Contract', color: GOLD, onPress: handleView },
              { icon: 'pencil-outline', label: 'Rename', color: textPrimary, onPress: handleOpenRename },
              { icon: 'create-outline', label: 'Edit Details', color: textPrimary, onPress: handleOpenEdit },
              { icon: 'refresh-outline', label: 'Run AI Analysis', color: GOLD, onPress: handleReanalyze },
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

      {/* Rename Modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 16, textAlign: 'center' }}>Rename Contract</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg, marginBottom: 20 }}
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setRenameOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7', opacity: 0.8, justifyContent: 'center', alignItems: 'center' }}>
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
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 18, textAlign: 'center' }}>Edit Contract Details</Text>
              {[
                { key: 'title', label: 'Title' },
                { key: 'category', label: 'Category' },
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

      {/* Delete Confirm */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor }}>
            <Ionicons name="trash" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>Delete Contract?</Text>
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

export default ContractManagerModule;
