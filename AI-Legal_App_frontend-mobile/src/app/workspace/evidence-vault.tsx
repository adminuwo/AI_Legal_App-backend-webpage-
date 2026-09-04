import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useToastContext, useThemeContext, usePermissionFlow } from '@/providers';
import { getGlobalActiveWorkspaceType } from '@/providers/workspace.provider';
import { CaseService } from '@/services/case.service';
import { UploadService } from '@/services/upload.service';
import { EvidenceService } from '@/services/evidence.service';
import { CaseEvidence } from '@/types';

const { height } = Dimensions.get('window');

export default function EvidenceVaultScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();

  const currentWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : 'advocate';
  const isLawFirm = currentWsType === 'law_firm';

  const [isLoading, setIsLoading] = useState(true);
  const [caseName, setCaseName] = useState('Evidence Vault');
  const [evidenceList, setEvidenceList] = useState<CaseEvidence[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Local state variables for search, picker, action sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [isEvidenceUploadOpen, setIsEvidenceUploadOpen] = useState(false);
  const [selectedEvidenceOptionsItem, setSelectedEvidenceOptionsItem] = useState<any | null>(null);
  const [isEvidenceOptionsOpen, setIsEvidenceOptionsOpen] = useState(false);

  // Analysis loader states
  const [isAnalyzingEvidence, setIsAnalyzingEvidence] = useState(false);
  const [aiAnalysisProgressStep, setAiAnalysisProgressStep] = useState(0);

  // Reusable editing/deleting modals states
  const [renamingItem, setRenamingItem] = useState<any | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [deletingItem, setDeletingItem] = useState<any | null>(null);

  const [evidenceUploadingTasks, setEvidenceUploadingTasks] = useState<Array<{
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'failed' | 'complete';
  }>>([]);

  useEffect(() => {
    if (caseId) {
      loadCaseEvidence();
    } else {
      setErrorMsg('Missing Case ID query context.');
      setIsLoading(false);
    }
  }, [caseId]);

  const loadCaseEvidence = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await CaseService.getCaseDetails(caseId);
      const caseData: any = (res as any)?.data || ((res as any)?._id ? res : null);
      if (caseData) {
        setCaseName(caseData.name || 'Evidence Vault');
        setEvidenceList(caseData.evidence || []);
      } else {
        setErrorMsg((res as any)?.error || 'Failed to download case workspace.');
      }
    } catch (err: any) {
      console.error('[Load Case Evidence Error]', err);
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredEvidence = () => {
    const list = evidenceList.filter((e) =>
      (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Sort by upload date newest first
    return [...list].sort((a, b) => {
      const aTime = new Date(a.uploadedDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.uploadedDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  };

  const startBackgroundEvidenceUpload = async (
    uri: string,
    name: string,
    mime: string,
    size: number
  ) => {
    const isDuplicate = evidenceList.some(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      showToast('error', 'Duplicate File', `"${name}" is already in the Evidence Vault.`);
      return;
    }

    const taskId = `ev_upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTask = {
      id: taskId,
      name,
      progress: 0,
      status: 'uploading' as const,
    };

    setEvidenceUploadingTasks((prev) => [newTask, ...prev]);

    (async () => {
      try {
        const fileExt = name.split('.').pop()?.toLowerCase() || '';
        const evType = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? 'Images' : (['mp4', 'mov'].includes(fileExt) ? 'Videos' : 'Document');
        
        const res = await UploadService.uploadEvidence(
          caseId as string,
          uri,
          name,
          mime,
          { type: evType },
          (progressPercent) => {
            setEvidenceUploadingTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, progress: progressPercent } : t))
            );
          }
        );

        if (res.success && res.data) {
          const newEv: CaseEvidence = res.data;
          setEvidenceUploadingTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, progress: 100, status: 'complete' } : t))
          );
          
          setEvidenceList((prev) => [...prev, newEv]);
          showToast('success', 'Upload Complete', `"${name}" added to Evidence Vault.`);
          
          setTimeout(() => {
            setEvidenceUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
          }, 3000);
        } else {
          throw new Error(res.error || 'Upload returned unsuccessful response.');
        }
      } catch (err: any) {
        console.error('[Evidence Ingest Error]', err);
        setEvidenceUploadingTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' } : t))
        );
        showToast('error', 'Upload Failed', `Could not upload "${name}": ${err.message || 'unknown error'}`);
      }
    })();
  };

  const handleEvidenceCaptureCamera = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const fileName = asset.fileName || `Scan_${Date.now()}.jpg`;
      startBackgroundEvidenceUpload(asset.uri, fileName, 'image/jpeg', asset.fileSize || 0);
    } catch (err: any) {
      console.error('[Camera Scan Error]', err);
      showToast('error', 'Capture Failed', err.message || 'Failed to capture photo.');
    }
  };

  const handleEvidenceChooseGallery = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const granted = await requestPermissionFlow('photos');
      if (!granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.95,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      for (const asset of result.assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = asset.fileName || `Gallery_${Date.now()}.${fileExt}`;
        const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        startBackgroundEvidenceUpload(asset.uri, fileName, mime, asset.fileSize || 0);
      }
    } catch (err: any) {
      console.error('[Gallery Pick Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select media.');
    }
  };

  const handleEvidenceChoosePdf = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      for (const asset of result.assets) {
        startBackgroundEvidenceUpload(asset.uri, asset.name, 'application/pdf', asset.size || 0);
      }
    } catch (err: any) {
      console.error('[PDF Picker Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select PDF.');
    }
  };

  const handleEvidenceBrowseFiles = async () => {
    setIsEvidenceUploadOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
      };

      for (const asset of result.assets) {
        const ext = asset.name.split('.').pop()?.toLowerCase() || '';
        const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';
        startBackgroundEvidenceUpload(asset.uri, asset.name, mime, asset.size || 0);
      }
    } catch (err: any) {
      console.error('[Browse Files Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select files.');
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renamingName.trim()) return;
    const itemId = renamingItem._id || renamingItem.id;
    const originalEvidence = [...evidenceList];
    const updatedEvidence = originalEvidence.map((e) =>
      e._id === itemId || e.id === itemId ? { ...e, name: renamingName.trim() } : e
    );

    setEvidenceList(updatedEvidence);
    setRenamingItem(null);

    try {
      const res = await CaseService.updateCase(caseId as string, { evidence: updatedEvidence });
      if (res.success) {
        showToast('success', 'Renamed', `Evidence renamed to "${renamingName.trim()}"`);
      } else {
        setEvidenceList(originalEvidence);
        showToast('error', 'Rename Failed', res.error || 'Server rejected renamed evidence name.');
      }
    } catch (err: any) {
      setEvidenceList(originalEvidence);
      showToast('error', 'Rename Failed', err.message || 'Network sync failure.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const itemId = deletingItem._id || deletingItem.id;
    const originalEvidence = [...evidenceList];
    const updatedEvidence = originalEvidence.filter((e) => e.id !== itemId && e._id !== itemId);

    setEvidenceList(updatedEvidence);
    setDeletingItem(null);
    showToast('info', 'Purging...', 'Purging evidence vault item.');

    try {
      const res = await EvidenceService.deleteEvidence(caseId as string, itemId);
      if (res.success) {
        showToast('success', 'Purged', `Evidence "${deletingItem.name}" deleted.`);
      } else {
        setEvidenceList(originalEvidence);
        showToast('error', 'Purge Failed', res.error || 'Failed to remove evidence from server.');
      }
    } catch (err: any) {
      setEvidenceList(originalEvidence);
      showToast('error', 'Purge Failed', err.message || 'Network sync failure.');
    }
  };

  const handleAnalyzeEvidenceWithAI = async (item: any) => {
    if (!caseId || !item) return;
    const itemId = item._id || item.id;
    setIsEvidenceOptionsOpen(false);
    setIsAnalyzingEvidence(true);
    setAiAnalysisProgressStep(0);

    const timer = setInterval(() => {
      setAiAnalysisProgressStep((prev) => {
        if (prev >= 3) {
          clearInterval(timer);
          return 3;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const res = await EvidenceService.analyzeEvidence(caseId as string, itemId);
      clearInterval(timer);

      if (res.success && res.data) {
        const updatedEvidence = evidenceList.map((e: any) =>
          String(e.id || e._id) === itemId ? res.data : e
        );
        setEvidenceList(updatedEvidence);
        setIsAnalyzingEvidence(false);
        showToast('success', 'Analysis Complete', `AI report ready for "${item.name}".`);

        router.push({
          pathname: '/workspace/evidence-analysis',
          params: { caseId: caseId, evidenceId: itemId },
        });
      } else {
        throw new Error(res.error || 'Analysis returned unsuccessful response.');
      }
    } catch (err: any) {
      clearInterval(timer);
      setIsAnalyzingEvidence(false);
      console.error('[AI Analysis Error]', err);
      showToast('error', 'Analysis Failed', err.message || 'Failed to generate AI report.');
    }
  };

  const handleViewEvidence = (item: any) => {
    setIsEvidenceOptionsOpen(false);
    router.push({
      pathname: '/workspace/document-viewer',
      params: {
        id: caseId as string,
        docId: item._id || item.id,
        title: item.name,
        url: item.url,
        type: item.type,
      },
    });
  };

  const activeEvidence = getFilteredEvidence();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Evidence Vault</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={{ marginTop: 12, color: theme.textSecondary || '#6B7280', fontSize: 14 }}>
            Loading Evidence Vault...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Evidence Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32 }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#111111' }]}
            onPress={loadCaseEvidence}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            Evidence Vault
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280' }} numberOfLines={1}>
            {caseName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Description & Primary CTA Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary || (isDark ? '#8E8E93' : '#6B7280') }}>
              Store and organize evidence for this case
            </Text>
          </View>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#D4AF37',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 14,
              gap: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => setIsEvidenceUploadOpen(true)}
          >
            <Ionicons name="add" size={18} color="#111111" />
            <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Add Evidence</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB', backgroundColor: isDark ? '#111111' : '#F5F5F7' }]}>
          <Ionicons name="search-outline" size={16} color={isDark ? '#8E8E93' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search evidence by title or notes..."
            placeholderTextColor={isDark ? '#8E8E93' : '#6B7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={isDark ? '#8E8E93' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Upload tasks */}
        {evidenceUploadingTasks.length > 0 && (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {evidenceUploadingTasks.map((task) => (
              <View
                key={task.id}
                style={[styles.uploadTaskCard, { borderColor: task.status === 'failed' ? '#EF4444' : (isDark ? 'rgba(212,175,55,0.3)' : '#D4AF37'), backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
              >
                <Ionicons
                  name={task.status === 'failed' ? "alert-circle" : (task.status === 'complete' ? "checkmark-circle" : "sync")}
                  size={20}
                  color={task.status === 'failed' ? "#EF4444" : (task.status === 'complete' ? "#10B981" : "#D4AF37")}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                    {task.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {task.status === 'complete' ? '✅ Upload Complete' : task.status === 'failed' ? 'Upload failed' : `Uploading... ${task.progress}%`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Evidence List */}
        {activeEvidence.length === 0 ? (
          <View style={[styles.emptyContainer, { borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Ionicons name="shield-checkmark-outline" size={44} color="#D4AF37" style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>No evidence added yet</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary || '#6B7280', textAlign: 'center' }}>
              Capture, scan or upload evidence for this case.
            </Text>
          </View>
        ) : (
          <View>
            {activeEvidence.map((item, index) => {
              const itemId = item._id || item.id;
              const filename = (item.name || '').toLowerCase();
              
              let iconName = 'document-outline';
              let iconColor = '#6B7280';
              if (filename.endsWith('.pdf')) {
                iconName = 'document-text';
                iconColor = '#EF4444';
              } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
                iconName = 'document-text';
                iconColor = '#3B82F6';
              } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].some(ext => filename.endsWith(ext))) {
                iconName = 'image';
                iconColor = '#10B981';
              } else if (['mp4', 'mov', 'avi', 'mkv', '3gp'].some(ext => filename.endsWith(ext))) {
                iconName = 'videocam';
                iconColor = '#D4AF37';
              } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].some(ext => filename.endsWith(ext))) {
                iconName = 'volume-high';
                iconColor = '#F59E0B';
              }

              const uploadDateStr = new Date(item.uploadedDate || item.createdAt || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              const formattedSize = item.fileSize || '1.2 MB';

              return (
                <View key={itemId}>
                  {index > 0 && (
                    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB', marginVertical: 12 }} />
                  )}
                  <TouchableOpacity
                    style={styles.evidenceItemRow}
                    onPress={() => {
                      setSelectedEvidenceOptionsItem(item);
                      setIsEvidenceOptionsOpen(true);
                    }}
                  >
                    <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : '#F5F5F7' }]}>
                      <Ionicons name={iconName} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280', marginTop: 3 }}>
                        {uploadDateStr} • {formattedSize}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#8E8E93' : '#9CA3AF'} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Upload Bottom Sheet Modal */}
      <Modal
        visible={isEvidenceUploadOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEvidenceUploadOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEvidenceUploadOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                <View style={styles.bottomSheetHeader}>
                  <View>
                    <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Add Evidence</Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280', marginTop: 2 }}>Choose an evidence source</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEvidenceUploadOpen(false)}>
                    <Ionicons name="close" size={24} color={theme.textPrimary || '#4B5563'} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={handleEvidenceCaptureCamera}
                  >
                    <Ionicons name="camera-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Capture Evidence</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={handleEvidenceCaptureCamera}
                  >
                    <Ionicons name="document-text-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Scan Evidence</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={handleEvidenceBrowseFiles}
                  >
                    <Ionicons name="folder-open-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Upload from Device</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={handleEvidenceChooseGallery}
                  >
                    <Ionicons name="image-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Choose Photo / Video</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Action Options Bottom Sheet */}
      <Modal
        visible={isEvidenceOptionsOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEvidenceOptionsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEvidenceOptionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContent, { backgroundColor: theme.card || '#FFFFFF' }]}>
                <View style={styles.bottomSheetHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {selectedEvidenceOptionsItem?.name || 'Evidence Options'}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280', marginTop: 2 }}>
                      {selectedEvidenceOptionsItem?.type || 'Document'} • {selectedEvidenceOptionsItem?.fileSize || ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEvidenceOptionsOpen(false)}>
                    <Ionicons name="close" size={24} color={theme.textPrimary || '#4B5563'} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.actionOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={() => handleViewEvidence(selectedEvidenceOptionsItem)}
                  >
                    <Ionicons name="eye-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>View Evidence</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={() => {
                      setIsEvidenceOptionsOpen(false);
                      setRenamingItem(selectedEvidenceOptionsItem);
                      setRenamingName(selectedEvidenceOptionsItem?.name || '');
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={() => {
                      setIsEvidenceOptionsOpen(false);
                      setDeletingItem(selectedEvidenceOptionsItem);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: '#111111' }]}
                    onPress={() => handleAnalyzeEvidenceWithAI(selectedEvidenceOptionsItem)}
                  >
                    <Ionicons name="analytics" size={20} color="#111111" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#111111' }}>🤖 Analyze with AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Rename Dialog Modal */}
      <Modal visible={renamingItem !== null} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: theme.card || '#FFFFFF' }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Evidence</Text>
            <TextInput
              style={[styles.dialogInput, { color: theme.textPrimary, borderColor: theme.border || '#ECECEC' }]}
              value={renamingName}
              onChangeText={setRenamingName}
              placeholder="Enter new file name"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setRenamingItem(null)} style={styles.dialogCancelBtn}>
                <Text style={{ color: '#4B5563', fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameSubmit} style={styles.dialogConfirmBtn}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Dialog Modal */}
      <Modal visible={deletingItem !== null} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: theme.card || '#FFFFFF' }]}>
            <Text style={[styles.dialogTitle, { color: '#EF4444' }]}>Delete Evidence</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary || '#4B5563', marginBottom: 20 }}>
              Are you sure you want to permanently delete this evidence item? This action is irreversible.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setDeletingItem(null)} style={styles.dialogCancelBtn}>
                <Text style={{ color: '#4B5563', fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} style={[styles.dialogConfirmBtn, { backgroundColor: '#EF4444' }]}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Analyzing Loader Overlay */}
      <Modal visible={isAnalyzingEvidence} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.card || '#FFFFFF', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
              🤖 AI Analyzing Evidence...
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary || '#6B7280', textAlign: 'center', marginBottom: 20 }}>
              Running character recognition, object mapping, and case-timeline correlation engines
            </Text>
            
            <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
              {[
                'Detecting file type and content layers...',
                'Performing OCR character extraction...',
                'Synthesizing legal issues under Evidence Acts...',
                'Compiling summary report structures...'
              ].map((stepText, stepIdx) => {
                const isActive = stepIdx === aiAnalysisProgressStep;
                const isCompleted = stepIdx < aiAnalysisProgressStep;
                
                return (
                  <View key={stepIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons 
                      name={isCompleted ? "checkmark-circle" : (isActive ? "sync-outline" : "ellipse-outline")} 
                      size={16} 
                      color={isCompleted ? "#10B981" : (isActive ? "#111111" : "#9CA3AF")} 
                    />
                    <Text style={{ 
                      fontSize: 12, 
                      color: isCompleted ? theme.textPrimary : (isActive ? "#111111" : (theme.textSecondary || '#6B7280')),
                      fontWeight: (isActive || isCompleted) ? '700' : '400',
                      flex: 1
                    }}>
                      {stepText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  evidenceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingBottom: 12,
    paddingTop: 8,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  uploadOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  actionOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dialogBox: {
    alignSelf: 'center',
    width: '85%',
    borderRadius: 12,
    padding: 20,
    marginBottom: 100, // offset from center to clear keyboard
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogConfirmBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
});
