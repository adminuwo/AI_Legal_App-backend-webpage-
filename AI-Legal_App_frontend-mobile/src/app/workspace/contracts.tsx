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
import { ContractService } from '@/services/contract.service';
import { CaseContract } from '@/types';

const { height } = Dimensions.get('window');

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'failed' | 'complete';
  size: number;
  uri: string;
  mime: string;
}

export default function CaseContractsScreen() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();

  const currentWsType = getGlobalActiveWorkspaceType ? getGlobalActiveWorkspaceType() : 'advocate';
  const isLawFirm = currentWsType === 'law_firm';

  const [isLoading, setIsLoading] = useState(true);
  const [caseName, setCaseName] = useState('Case Contracts');
  const [contracts, setContracts] = useState<CaseContract[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering & searching
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');

  // Modals & Sheets
  const [isContractUploadOpen, setIsContractUploadOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<CaseContract | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [deletingItem, setDeletingItem] = useState<CaseContract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Background uploading and AI analysis states
  const [uploadingTasks, setUploadingTasks] = useState<UploadTask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<string[]>([]);
  const [activeAnalysisStep, setActiveAnalysisStep] = useState(0);

  useEffect(() => {
    if (caseId) {
      loadCaseContracts();
    } else {
      setErrorMsg('Missing Case ID query context.');
      setIsLoading(false);
    }
  }, [caseId]);

  const loadCaseContracts = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await CaseService.getCaseDetails(caseId);
      const caseData: any = (res as any)?.data || ((res as any)?._id ? res : null);
      if (caseData) {
        setCaseName(caseData.name || 'Case Contracts');
        setContracts(caseData.contracts || []);
      } else {
        setErrorMsg((res as any)?.error || 'Failed to download case workspace.');
      }
    } catch (err: any) {
      console.error('[Load Case Contracts Error]', err);
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredContracts = () => {
    const list = contracts.filter((c) =>
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      const aTime = new Date(a.uploadedDate || 0).getTime();
      const bTime = new Date(b.uploadedDate || 0).getTime();
      if (sortBy === 'oldest') {
        return aTime - bTime;
      }
      return bTime - aTime; // Default 'newest'
    });
  };

  // 1. Direct File Picker Trigger
  const handleUploadContract = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/zip'
        ],
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
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        zip: 'application/zip',
      };
      const mime = asset.mimeType || extensionToMime[ext] || 'application/octet-stream';

      startBackgroundUpload(asset.uri, asset.name, mime, asset.size || 0);
    } catch (err: any) {
      console.error('[File Picker Error]', err);
      showToast('error', 'Upload Failed', err.message || 'Failed to select contract.');
    }
  };

  // 2. Direct Camera Trigger
  const handleScanContract = async () => {
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
      
      startBackgroundUpload(asset.uri, fileName, 'image/jpeg', asset.fileSize || 0);
    } catch (err: any) {
      console.error('[Camera Scan Error]', err);
      showToast('error', 'Capture Failed', err.message || 'Failed to capture scan.');
    }
  };

  // 3. Choose Photo Trigger
  const handleContractChooseGallery = async () => {
    setIsContractUploadOpen(false);
    try {
      const granted = await requestPermissionFlow('photos');
      if (!granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const fileName = asset.fileName || `Photo_Contract_${Date.now()}.jpg`;
      const mime = asset.mimeType || 'image/jpeg';
      
      startBackgroundUpload(asset.uri, fileName, mime, asset.fileSize || 0);
    } catch (err: any) {
      console.error('[Gallery Pick Error]', err);
      showToast('error', 'Selection Failed', err.message || 'Failed to select photo.');
    }
  };

  const startBackgroundUpload = async (uri: string, name: string, mime: string, size: number) => {
    const isDuplicate = contracts.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      showToast('error', 'Duplicate File', `"${name}" is already uploaded.`);
      return;
    }

    const taskId = Math.random().toString(36).substring(7);
    const newProgressTask: UploadTask = {
      id: taskId,
      name,
      progress: 0,
      status: 'uploading',
      size,
      uri,
      mime,
    };

    setUploadingTasks((prev) => [...prev, newProgressTask]);

    try {
      const res = await UploadService.uploadContract(
        caseId as string,
        uri,
        name,
        mime,
        (percent) => {
          setUploadingTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, progress: percent } : t))
          );
        }
      );

      if (res.success && res.data) {
        const doc: CaseContract = res.data;
        setUploadingTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, progress: 100, status: 'complete' } : t))
        );
        
        setContracts((prev) => [...prev, doc]);
        showToast('success', 'Upload Complete', `"${name}" added to contracts list.`);
        
        setTimeout(() => {
          setUploadingTasks((prev) => prev.filter((t) => t.id !== taskId));
        }, 3000);
      } else {
        throw new Error(res.error || 'Failed to upload contract.');
      }
    } catch (err: any) {
      console.error('[Contract Upload Error]', err);
      setUploadingTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' } : t))
      );
      showToast('error', 'Upload Failed', `Could not upload "${name}": ${err.message || 'unknown error'}`);
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renamingName.trim()) return;
    const itemId = renamingItem._id || renamingItem.id;
    if (!itemId) return;

    const originalContracts = [...contracts];
    const updatedContracts = originalContracts.map((c) =>
      c._id === itemId ? { ...c, name: renamingName.trim() } : c
    );

    setContracts(updatedContracts);
    setRenamingItem(null);

    try {
      const res = await ContractService.renameContract(caseId as string, itemId, renamingName.trim(), originalContracts);
      if (res.success) {
        showToast('success', 'Renamed', `Contract renamed to "${renamingName.trim()}"`);
      } else {
        setContracts(originalContracts);
        showToast('error', 'Rename Failed', res.error || 'Could not update contract name.');
      }
    } catch (err: any) {
      setContracts(originalContracts);
      showToast('error', 'Rename Failed', err.message || 'Error occurred while renaming.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    const itemId = deletingItem._id || deletingItem.id;
    if (!itemId) return;

    setIsDeleting(true);
    const originalContracts = [...contracts];
    const filteredContracts = originalContracts.filter((c) => c._id !== itemId);

    setContracts(filteredContracts);

    try {
      const res = await ContractService.deleteContract(caseId as string, itemId);
      if (res.success) {
        showToast('success', 'Deleted', `"${deletingItem.name}" deleted.`);
      } else {
        setContracts(originalContracts);
        showToast('error', 'Delete Failed', res.error || 'Could not delete contract.');
      }
    } catch (err: any) {
      setContracts(originalContracts);
      showToast('error', 'Delete Failed', err.message || 'Error occurred while deleting.');
    } finally {
      setIsDeleting(false);
      setDeletingItem(null);
    }
  };

  // 3. AI Contract Analysis Trigger
  const handleAnalyzeContract = async (contract: CaseContract) => {
    const itemId = contract._id || contract.id;
    if (!itemId) return;

    setIsAnalyzing(true);
    setAnalysisSteps([
      'Loading contract digital text layers...',
      'Mapping clause margins & obligations...',
      'Detecting critical risk factors & venues...',
      'Synthesizing missing clauses & remedies...',
      'Generating complete executive legal report...'
    ]);
    setActiveAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setActiveAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await ContractService.analyzeContract(caseId as string, itemId);
      clearInterval(stepInterval);
      setIsAnalyzing(false);

      if (res.success && res.data) {
        const analyzedContract: CaseContract = res.data;
        // Refresh local contract list to mark as analyzed
        setContracts((prev) =>
          prev.map((c) => (c._id === itemId ? analyzedContract : c))
        );
        showToast('success', 'Analysis Generated', 'Contract intelligence profile compiled successfully.');
        
        // Navigate to the Report screen
        router.push({
          pathname: '/workspace/contract-analysis',
          params: { caseId, contractId: itemId }
        });
      } else {
        showToast('error', 'Analysis Failed', res.error || 'Failed to compute AI report.');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      showToast('error', 'Analysis Failed', err.message || 'Could not analyze contract with AI.');
    }
  };

  const handleOpenContract = (contract: CaseContract) => {
    router.push({
      pathname: '/workspace/document-viewer',
      params: {
        url: contract.url,
        title: contract.name,
        docId: contract._id || contract.id || '',
        id: caseId || '',
      },
    });
  };

  const activeList = getFilteredContracts();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(212,175,55,0.2)' : '#ECECEC' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Contracts</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {caseName}
          </Text>
        </View>
      </View>

      {/* Main Container */}
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        
        {/* Title Description & Primary CTA Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary || (isDark ? '#8E8E93' : '#6B7280') }}>
              Manage contracts related to this case
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
            onPress={() => setIsContractUploadOpen(true)}
          >
            <Ionicons name="add" size={18} color="#111111" />
            <Text style={{ color: '#111111', fontSize: 13, fontWeight: '800' }}>Add Contract</Text>
          </TouchableOpacity>
        </View>

        {/* Uploading Queue Progress items */}
        {uploadingTasks.length > 0 && (
          <View style={styles.queueContainer}>
            <Text style={[styles.queueTitle, { color: theme.textSecondary }]}>ACTIVE UPLOAD QUEUE</Text>
            {uploadingTasks.map((task) => (
              <View key={task.id} style={[styles.queueRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(212,175,55,0.3)' : '#D4AF37' }]}>
                <Ionicons name="cloud-upload" size={18} color="#D4AF37" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.queueFileName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {task.name}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressIndicator, { width: `${task.progress}%`, backgroundColor: '#D4AF37' }]} />
                  </View>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#D4AF37', marginLeft: 8 }}>
                  {task.progress}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Filter bar */}
        <View style={styles.searchBarRow}>
          <View style={[styles.searchWrapper, { backgroundColor: isDark ? '#111111' : '#F5F5F7', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#ECECEC' }]}>
            <Ionicons name="search-outline" size={16} color={isDark ? '#8E8E93' : '#6B7280'} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 13, color: theme.textPrimary }}
              placeholder="Search contracts by name..."
              placeholderTextColor={isDark ? '#8E8E93' : '#6B7280'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: isDark ? '#111111' : '#F5F5F7', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#ECECEC' }]}
            onPress={() => {
              const options: Array<'newest' | 'oldest' | 'name-asc' | 'name-desc'> = ['newest', 'oldest', 'name-asc', 'name-desc'];
              const currentIdx = options.indexOf(sortBy);
              const nextIdx = (currentIdx + 1) % options.length;
              setSortBy(options[nextIdx]);
              showToast('info', 'Sorting Updated', `Sorted by ${options[nextIdx].replace('-', ' ')}`);
            }}
          >
            <Ionicons name="funnel-outline" size={16} color={isDark ? '#D4AF37' : '#111111'} />
          </TouchableOpacity>
        </View>

        {/* Contract List mapping */}
        {activeList.length === 0 && uploadingTasks.length === 0 ? (
          <View style={[styles.emptyContainer, { borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#ECECEC', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Ionicons name="document-text-outline" size={44} color="#D4AF37" style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>No contracts yet</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary || '#6B7280', textAlign: 'center' }}>
              Upload or scan contracts related to this case.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {activeList.map((c) => {
              const fileId = c._id || c.id;
              const ext = (c.name || '').split('.').pop()?.toLowerCase() || '';

              let iconName = 'document-outline';
              let iconColor = '#9CA3AF';
              if (ext === 'pdf') {
                iconName = 'document-text';
                iconColor = '#EF4444';
              } else if (['doc', 'docx'].includes(ext)) {
                iconName = 'document-text';
                iconColor = '#3B82F6';
              } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                iconName = 'image';
                iconColor = '#10B981';
              }

              const formattedDate = new Date(c.uploadedDate || Date.now()).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              const isAnalyzed = c.aiStatus === 'Analyzed';

              return (
                <View
                  key={fileId}
                  style={[styles.contractCard, { borderColor: theme.border || '#ECECEC', backgroundColor: theme.card || '#FFFFFF' }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
                      <Ionicons name={iconName as any} size={22} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.contractName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                        {ext.toUpperCase()} • {c.fileSize || 'N/A'} • {formattedDate}
                      </Text>
                    </View>
                  </View>

                  {/* Status row badges */}
                  <View style={styles.statusBadgesRow}>
                    <View style={[styles.statusBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#0369A1' }]}>OCR Complete</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: isAnalyzed ? '#DCFCE7' : '#F3F4F6' }]}>
                      <Text style={[styles.statusBadgeText, { color: isAnalyzed ? '#15803D' : '#4B5563' }]}>
                        {isAnalyzed ? 'AI Analyzed' : 'AI Not Analyzed'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions buttons row */}
                  <View style={[styles.cardDivider, { backgroundColor: theme.border || '#ECECEC' }]} />
                  
                  <View style={styles.actionsFooterRow}>
                    <TouchableOpacity style={styles.footerActionBtn} onPress={() => handleOpenContract(c)}>
                      <Ionicons name="eye-outline" size={15} color={theme.textPrimary} />
                      <Text style={[styles.footerActionText, { color: theme.textPrimary }]}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.footerActionBtn} onPress={() => { setRenamingItem(c); setRenamingName(c.name); }}>
                      <Ionicons name="create-outline" size={15} color={theme.textPrimary} />
                      <Text style={[styles.footerActionText, { color: theme.textPrimary }]}>Rename</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.footerActionBtn} onPress={() => setDeletingItem(c)}>
                      <Ionicons name="trash-outline" size={15} color={theme.danger || '#EF4444'} />
                      <Text style={[styles.footerActionText, { color: theme.danger || '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#D4AF37',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        gap: 4,
                      }}
                      onPress={() => isAnalyzed ? router.push({ pathname: '/workspace/contract-analysis', params: { caseId, contractId: fileId } }) : handleAnalyzeContract(c)}
                    >
                      <Ionicons name="sparkles" size={14} color="#111111" />
                      <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>
                        {isAnalyzed ? 'View Report' : 'Analyze Contract'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Contract Bottom Sheet Modal */}
      <Modal
        visible={isContractUploadOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsContractUploadOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsContractUploadOpen(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <View style={{ width: 36, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                <View style={styles.bottomSheetHeader}>
                  <View>
                    <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Add Contract</Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary || '#6B7280', marginTop: 2 }}>Choose a contract source</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsContractUploadOpen(false)}>
                    <Ionicons name="close" size={24} color={theme.textPrimary || '#4B5563'} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={() => {
                      setIsContractUploadOpen(false);
                      handleScanContract();
                    }}
                  >
                    <Ionicons name="camera-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Scan Contract</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={() => {
                      setIsContractUploadOpen(false);
                      handleUploadContract();
                    }}
                  >
                    <Ionicons name="folder-open-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Upload from Device</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadOptionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB' }]}
                    onPress={handleContractChooseGallery}
                  >
                    <Ionicons name="image-outline" size={20} color="#D4AF37" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Rename Dialog Modal */}
      {renamingItem && (
        <Modal transparent animationType="fade" visible={!!renamingItem}>
          <TouchableWithoutFeedback onPress={() => setRenamingItem(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.renameModalContent, { backgroundColor: theme.card || '#FFFFFF' }]}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Rename Contract</Text>
                  <TextInput
                    style={[styles.renameInput, { color: theme.textPrimary, borderColor: theme.border || '#E5E7EB' }]}
                    value={renamingName}
                    onChangeText={setRenamingName}
                    autoFocus
                  />
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setRenamingItem(null)}>
                      <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmRenameBtn} onPress={handleRenameSubmit}>
                      <Text style={styles.confirmRenameText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deletingItem && (
        <Modal transparent animationType="fade" visible={!!deletingItem}>
          <TouchableWithoutFeedback onPress={() => setDeletingItem(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.deleteModalContent, { backgroundColor: theme.card || '#FFFFFF' }]}>
                  <Ionicons name="alert-circle-outline" size={40} color={theme.danger || '#EF4444'} style={{ marginBottom: 12 }} />
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Delete Contract?</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                    Are you sure you want to delete "{deletingItem.name}"? This action cannot be undone.
                  </Text>
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeletingItem(null)} disabled={isDeleting}>
                      <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.confirmDeleteBtn, { backgroundColor: theme.danger || '#EF4444' }]} onPress={handleDeleteSubmit} disabled={isDeleting}>
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmDeleteText}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Full Screen AI Progress Analyzer Loading Overlay */}
      {isAnalyzing && (
        <Modal transparent animationType="slide" visible={isAnalyzing}>
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderCenterCard}>
              <ActivityIndicator size="large" color="#111111" style={{ marginBottom: 20 }} />
              <Text style={styles.loaderHeaderTitle}>AI Contract Auditing</Text>
              <Text style={styles.loaderHeaderSub}>Extracting party obligations & statutory risk limits...</Text>
              
              <View style={styles.stepsWrap}>
                {analysisSteps.map((step, idx) => {
                  const completed = idx < activeAnalysisStep;
                  const active = idx === activeAnalysisStep;
                  return (
                    <View key={idx} style={styles.stepRow}>
                      <View style={[
                        styles.stepDot,
                        completed && styles.stepDotCompleted,
                        active && styles.stepDotActive
                      ]}>
                        {completed ? (
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        ) : (
                          <View style={[styles.stepDotInner, active && styles.stepDotInnerActive]} />
                        )}
                      </View>
                      <Text style={[
                        styles.stepText,
                        completed && styles.stepTextCompleted,
                        active && styles.stepTextActive
                      ]}>
                        {step}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  uploadCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  uploadCardSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    backgroundColor: '#111111',
    gap: 6,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 6,
  },
  actionBtnTextSecondary: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  queueContainer: {
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  queueFileName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#111111',
  },
  searchBarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  contractCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractName: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  actionsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  footerActionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  analyzeActionBtn: {
    backgroundColor: '#F3EFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bottomSheetOverlay: {
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
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  renameModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  renameInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmRenameBtn: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmRenameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmDeleteBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderCenterCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  loaderHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  loaderHeaderSub: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  stepsWrap: {
    width: '100%',
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  stepDotActive: {
    borderColor: '#111111',
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  stepDotInnerActive: {
    backgroundColor: '#111111',
  },
  stepText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  stepTextCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
  },
  stepTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
});
