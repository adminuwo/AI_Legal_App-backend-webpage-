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
import { CaseService } from '@/services/case.service';
import { UploadService } from '@/services/upload.service';
import { CaseDocument, CaseWorkspace } from '@/types';
import { CaseDocumentManager } from '@/components/CaseDocumentManager';
import { useTranslation } from '@/localization';

const { height } = Dimensions.get('window');

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'failed' | 'complete';
  size: number;
  uri: string;
  mime: string;
  docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other';
}

export default function CaseDocumentsScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const { t } = useTranslation();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [caseName, setCaseName] = useState('Case Documents');
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [workspace, setWorkspace] = useState<CaseWorkspace | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateField = async (updatedFields: Partial<CaseWorkspace>) => {
    if (updatedFields.documents) {
      setDocuments(updatedFields.documents);
      if (workspace) {
        setWorkspace({ ...workspace, documents: updatedFields.documents });
      }
      try {
        await CaseService.updateCase(caseId as string, { documents: updatedFields.documents });
      } catch (err) {
        console.error('[Sync Error]', err);
      }
    }
  };

  // Local state variables for lists and upload queue
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSortBy, setDocSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [uploadBottomSheetOpen, setUploadBottomSheetOpen] = useState(false);
  const [moreMenuOpenItem, setMoreMenuOpenItem] = useState<any | null>(null);
  
  // Reusable editing/deleting modals states
  const [renamingItem, setRenamingItem] = useState<any | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  
  const [uploadingTasks, setUploadingTasks] = useState<UploadTask[]>([]);

  useEffect(() => {
    if (caseId) {
      loadCaseDocuments();
    } else {
      setErrorMsg('Missing Case ID query context.');
      setIsLoading(false);
    }
  }, [caseId]);

  const loadCaseDocuments = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await CaseService.getCaseDetails(caseId);
      const caseData: any = (res as any)?.data || ((res as any)?._id ? res : null);
      if (caseData) {
        setCaseName(caseData.name || 'Case Documents');
        setDocuments(caseData.documents || []);
        setWorkspace(caseData);
      } else {
        setErrorMsg((res as any)?.error || 'Failed to download case workspace.');
      }
    } catch (err: any) {
      console.error('[Load Case Documents Error]', err);
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredDocs = () => {
    const list = documents.filter((d) =>
      (d.name || '').toLowerCase().includes(docSearchQuery.toLowerCase())
    );

    return [...list].sort((a, b) => {
      if (docSortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (docSortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      const aTime = new Date(a.uploadDate || 0).getTime();
      const bTime = new Date(b.uploadDate || 0).getTime();
      if (docSortBy === 'oldest') {
        return aTime - bTime;
      }
      return bTime - aTime; // Default 'newest'
    });
  };

  const startBackgroundUpload = async (
    uri: string,
    name: string,
    mime: string,
    size: number,
    docType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other'
  ) => {
    const isDuplicate = documents.some(
      (d) => d.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      showToast('error', 'Duplicate File', `"${name}" has already been uploaded.`);
      return;
    }

    const taskId = `doc_upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTask: UploadTask = {
      id: taskId,
      name,
      progress: 0,
      status: 'uploading',
      size,
      uri,
      mime,
      docType,
    };

    setUploadingTasks((prev) => [newTask, ...prev]);

    (async () => {
      try {
        const res = await UploadService.uploadCaseDocument(
          caseId as string,
          uri,
          name,
          mime,
          docType,
          (percent) => {
            setUploadingTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, progress: percent } : t))
            );
          }
        );

        if (res.success && res.data) {
          const newDoc: CaseDocument = res.data;
          setUploadingTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, progress: 100, status: 'complete' } : t))
          );
          
          setDocuments((prev) => [...prev, newDoc]);
          showToast('success', 'Upload Complete', `"${name}" added to documents.`);
          
          setTimeout(() => {
            setUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
          }, 3000);
        } else {
          throw new Error(res.error || 'Failed to upload document.');
        }
      } catch (err: any) {
        console.error('[Document Upload Error]', err);
        setUploadingTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' } : t))
        );
        showToast('error', 'Upload Failed', `Could not upload "${name}": ${err.message || 'unknown error'}`);
      }
    })();
  };

  const handleScanDocument = async () => {
    setUploadBottomSheetOpen(false);
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const fileName = `Scanned_Doc_${Date.now()}.jpg`;
      startBackgroundUpload(asset.uri, fileName, 'image/jpeg', asset.fileSize || 0, 'Proof');
    } catch (err: any) {
      console.error('[Scanner Error]', err);
      showToast('error', 'Scan Failed', err.message || 'Failed to initialize scanner.');
    }
  };

  const handleChooseFromDevice = async () => {
    setUploadBottomSheetOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      
      const ext = asset.name.split('.').pop()?.toLowerCase() || '';
      const extensionToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
      };
      const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';
      const docType = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'Proof' : 'Other';

      startBackgroundUpload(asset.uri, asset.name, mime, asset.size || 0, docType);
    } catch (err: any) {
      console.error('[File Picker Error]', err);
      showToast('error', 'Upload Failed', err.message || 'Failed to select document.');
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renamingName.trim()) return;
    const itemId = renamingItem._id || renamingItem.id;
    const originalDocs = [...documents];
    const updatedDocs = originalDocs.map((d) =>
      d._id === itemId ? { ...d, name: renamingName.trim() } : d
    );

    setDocuments(updatedDocs);
    setRenamingItem(null);

    try {
      const res = await CaseService.updateCase(caseId as string, { documents: updatedDocs });
      if (res.success) {
        showToast('success', 'Renamed', `File renamed to "${renamingName.trim()}"`);
      } else {
        setDocuments(originalDocs);
        showToast('error', 'Rename Failed', res.error || 'Server rejected renamed filename.');
      }
    } catch (err: any) {
      setDocuments(originalDocs);
      showToast('error', 'Rename Failed', err.message || 'Network sync failure.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const itemId = deletingItem._id || deletingItem.id;
    const originalDocs = [...documents];
    const updatedDocs = originalDocs.filter((d) => d._id !== itemId);

    setDocuments(updatedDocs);
    setDeletingItem(null);
    showToast('info', 'Deleting...', 'Deleting case document permanently.');

    try {
      const res = await CaseService.deleteDocument(caseId as string, itemId);
      if (res.success) {
        showToast('success', 'Deleted', `"${deletingItem.name}" deleted permanently.`);
      } else {
        setDocuments(originalDocs);
        showToast('error', 'Delete Failed', res.error || 'Failed to remove document.');
      }
    } catch (err: any) {
      setDocuments(originalDocs);
      showToast('error', 'Delete Failed', err.message || 'Network sync failure.');
    }
  };

  const activeList = getFilteredDocs();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Case Documents</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={{ marginTop: 12, color: theme.textSecondary || '#6B7280', fontSize: 14 }}>
            Loading Case Documents...
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
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Documents Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32 }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#111111' }]}
            onPress={loadCaseDocuments}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={{ marginTop: 12, color: theme.textSecondary || '#6B7280' }}>Loading case workspace...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FFFFFF' }]} edges={['top']}>
      {/* Back Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary || '#1F2937'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary || '#1F2937' }} numberOfLines={1}>
            {workspace.name}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280' }} numberOfLines={1}>
            Case Roster Files
          </Text>
        </View>
      </View>

      <CaseDocumentManager
        workspace={workspace}
        theme={theme}
        t={t}
        language="English"
        handleUpdateField={handleUpdateField}
        showToast={showToast}
      />
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
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
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
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    gap: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 64,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 68,
    borderWidth: 1,
    gap: 12,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#111111',
  },
  cancelTaskBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
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
