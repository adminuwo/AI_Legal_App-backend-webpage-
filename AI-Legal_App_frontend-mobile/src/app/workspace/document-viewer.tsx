import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Share,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { WebView } from 'react-native-webview';
import { useAuthGuard } from '@/navigation/guards';
import { useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';

export default function DocumentViewerScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{
    id: string;
    docId: string;
    url: string;
    title: string;
    type?: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [localUri, setLocalUri] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const fileTitle = params.title || 'Case Document';
  const cleanUrl = (resolvedUrl || params.url || '').split('?')[0] || '';
  const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';

  const isPdf = ext === 'pdf' || fileTitle.toLowerCase().endsWith('.pdf');
  const isDocx = ['doc', 'docx'].includes(ext) || !!fileTitle.toLowerCase().match(/\.(doc|docx)/);
  const isVideoOrAudio = !!(cleanUrl.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/) || fileTitle.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/));
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(ext) || !!fileTitle.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|gif)/);
  
  const isLocalUrl = (resolvedUrl || params.url || '').toLowerCase().includes('localhost') ||
    (resolvedUrl || params.url || '').toLowerCase().includes('127.0.0.1') ||
    (resolvedUrl || params.url || '').toLowerCase().includes('10.0.2.2') ||
    (resolvedUrl || params.url || '').toLowerCase().includes('192.168.') ||
    (resolvedUrl || params.url || '').toLowerCase().includes('10.') ||
    (resolvedUrl || params.url || '').toLowerCase().includes('172.');

  const getOpenableUrl = (url: string, title: string) => {
    const isDocPdf = url.split('?')[0].toLowerCase().endsWith('.pdf') || title.toLowerCase().endsWith('.pdf');
    const isDocxFile = url.split('?')[0].toLowerCase().match(/\.(doc|docx)/) || title.toLowerCase().match(/\.(doc|docx)/);
    
    if (Platform.OS === 'android' && (isDocPdf || isDocxFile)) {
      return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const resolveDocumentUrl = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let freshUrl = params.url || '';

      // 1. Fetch fresh signed URL from backend to avoid GCS token expiry
      if (params.id && params.docId) {
        try {
          const res = await CaseService.getCaseDetails(params.id);
          const details = (res as any).data || res;
          if (details) {
            const allDocs = [
              ...(details.documents || []),
              ...(details.evidence || []),
              ...(details.contracts || [])
            ];
            const found = allDocs.find(d => (d._id === params.docId || d.id === params.docId));
            if (found && found.url) {
              freshUrl = found.url;
            }
          }
        } catch (err) {
          console.warn('[DocViewer] URL refresh failed, falling back to query param:', err);
        }
      }

      if (!freshUrl) {
        throw new Error('No document URL available.');
      }

      setResolvedUrl(freshUrl);

      if (freshUrl.startsWith('data:') || freshUrl.startsWith('file:')) {
        setLocalUri(freshUrl);
        setIsLoading(false);
        return;
      }

      const parsedUrl = freshUrl.split('?')[0] || '';
      const parsedExt = parsedUrl.split('.').pop()?.toLowerCase() || '';
      const isPdfDoc = parsedExt === 'pdf' || fileTitle.toLowerCase().endsWith('.pdf');
      const isMediaDoc = !!(parsedUrl.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/) || fileTitle.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/));

      // 2. Manage caching using local file system
      const safeTitle = fileTitle.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const localPath = `${FileSystem.cacheDirectory}${params.docId}_${safeTitle}`;
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      if (fileInfo.exists) {
        setLocalUri(localPath);
        setIsLoading(false);
      } else {
        const downloadRes = await FileSystem.downloadAsync(freshUrl, localPath);
        setLocalUri(downloadRes.uri);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[DocViewer] Load failed:', err);
      setErrorMsg(err.message || 'Could not fetch or load case document.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    resolveDocumentUrl();
  }, [params.id, params.docId, params.url]);

  const openNativeBrowser = (targetUrl: string) => {
    WebBrowser.openBrowserAsync(targetUrl).catch(err => {
      console.warn('Failed to open document inside in-app browser:', err);
    });
  };

  const handleOpenPdf = async () => {
    if (!resolvedUrl) {
      showToast('error', 'Error', 'No document URL available.');
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        if (localUri) {
          await Sharing.shareAsync(localUri);
        } else {
          openNativeBrowser(resolvedUrl);
        }
      } else {
        if (localUri) {
          const cUri = await FileSystem.getContentUriAsync(localUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: cUri,
            type: 'application/pdf',
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          });
        } else {
          openNativeBrowser(getOpenableUrl(resolvedUrl, fileTitle));
        }
      }
    } catch (err: any) {
      console.warn('System reader failed, falling back to browser:', err);
      openNativeBrowser(getOpenableUrl(resolvedUrl, fileTitle));
    }
  };

  const handleOpenDocx = () => {
    if (resolvedUrl) {
      openNativeBrowser(getOpenableUrl(resolvedUrl, fileTitle));
    } else {
      showToast('error', 'Error', 'No document URL available.');
    }
  };

  const handleShareFile = async () => {
    try {
      if (localUri) {
        await Sharing.shareAsync(localUri, {
          mimeType: isPdf ? 'application/pdf' : (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg'),
          dialogTitle: fileTitle
        });
      } else {
        await Share.share({
          message: `AI LEGAL Case Document - ${fileTitle}\nURL: ${resolvedUrl || params.url}`,
          title: fileTitle,
        });
      }
    } catch (err: any) {
      showToast('error', 'Share Failed', 'Failed to share document.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={isFullScreen ? [] : ['top']}>
      {/* Header Bar */}
      {!isFullScreen && (
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {fileTitle}
          </Text>
          <Pressable
            onPress={handleShareFile}
            style={({ pressed }) => [styles.actionIconButton, pressed && styles.pressed]}
          >
            <Ionicons name="share-outline" size={22} color="#1F2937" />
          </Pressable>
        </View>
      )}

      {/* Viewer Content */}
      <View style={styles.viewerContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111111" />
            <Text style={styles.loadingText}>Fetching case document...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={56} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={[styles.errorText, { color: '#FFFFFF', marginBottom: 16, textAlign: 'center', paddingHorizontal: 40 }]}>
              {errorMsg}
            </Text>
            <Pressable
              style={{
                backgroundColor: '#111111',
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
              onPress={resolveDocumentUrl}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Retry Loading</Text>
            </Pressable>
          </View>
        ) : isPdf ? (
          <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
            {Platform.OS === 'android' && isLocalUrl ? (
              <View style={[styles.pdfContainer, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', width: '100%' }]}>
                <Ionicons name="document-text" size={72} color="#EF4444" style={{ marginBottom: 16 }} />
                <Text style={[styles.pdfTitle, { color: '#FFFFFF', marginBottom: 12 }]}>{fileTitle}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                  Inline preview is not supported for local development servers inside the emulator. Please tap below to open the document using your device's native PDF reader.
                </Text>
                <TouchableOpacity
                  style={[styles.openPdfBtn, { backgroundColor: '#6D5DFC', marginTop: 24, paddingHorizontal: 24, height: 46 }]}
                  onPress={handleOpenPdf}
                >
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.openPdfBtnText}>Open with System Reader</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <WebView
                style={{ flex: 1, width: Dimensions.get('window').width, height: '100%' }}
                source={{
                  uri: Platform.OS === 'ios'
                    ? (localUri || resolvedUrl)
                    : `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(resolvedUrl)}`
                }}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={[StyleSheet.absoluteFill, styles.loadingContainer, { backgroundColor: '#0F172A' }]}>
                    <ActivityIndicator size="large" color="#111111" />
                    <Text style={styles.loadingText}>Rendering PDF preview...</Text>
                  </View>
                )}
                renderError={() => (
                  <View style={[StyleSheet.absoluteFill, styles.errorContainer, { backgroundColor: '#0F172A' }]}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                    <Text style={{ color: '#FFFFFF', textAlign: 'center', marginBottom: 16 }}>
                      Could not load PDF Preview inline.
                    </Text>
                    <TouchableOpacity
                      style={[styles.openPdfBtn, { backgroundColor: '#EF4444' }]}
                      onPress={handleOpenPdf}
                    >
                      <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.openPdfBtnText}>Open with System Reader</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            
            {/* Native Open Overlay Button */}
            <View style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12
            }}>
              <TouchableOpacity
                onPress={handleOpenPdf}
                style={[styles.openPdfBtn, { backgroundColor: 'rgba(109, 93, 252, 0.9)', borderRadius: 24, flex: 1, height: 44 }]}
              >
                <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                <Text style={styles.openPdfBtnText}>System Reader</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleShareFile}
                style={[styles.openPdfBtn, { backgroundColor: 'rgba(59, 130, 246, 0.9)', borderRadius: 24, flex: 1, height: 44 }]}
              >
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={styles.openPdfBtnText}>Share / Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isVideoOrAudio ? (
          <View style={styles.pdfContainer}>
            <Ionicons 
              name={cleanUrl.toLowerCase().match(/\.(mp3|wav|m4a|aac|ogg)/) ? "musical-notes" : "videocam"} 
              size={72} 
              color="#3B82F6" 
              style={{ marginBottom: 16 }} 
            />
            <Text style={styles.pdfTitle}>{fileTitle}</Text>
            <Text style={styles.pdfSub}>Media File</Text>
            <Pressable
              style={[styles.openPdfBtn, { backgroundColor: "#3B82F6" }]}
              onPress={handleOpenPdf}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openPdfBtnText}>Open Media or Document</Text>
            </Pressable>
          </View>
        ) : isDocx ? (
          <View style={styles.pdfContainer}>
            <Ionicons 
              name="document-text" 
              size={72} 
              color="#3B82F6" 
              style={{ marginBottom: 16 }} 
            />
            <Text style={styles.pdfTitle}>{fileTitle}</Text>
            <Text style={styles.pdfSub}>Word Document</Text>
            <Pressable
              style={[styles.openPdfBtn, { backgroundColor: "#3B82F6" }]}
              onPress={handleOpenDocx}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openPdfBtnText}>Open in Word Viewer</Text>
            </Pressable>
          </View>
        ) : isImage ? (
          <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
            <ScrollView
              minimumZoomScale={1.0}
              maximumZoomScale={4.0}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, width: '100%', height: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <Image
                source={{ uri: localUri || resolvedUrl }}
                contentFit="contain"
                style={{
                  width: Dimensions.get('window').width,
                  height: isFullScreen 
                    ? Dimensions.get('window').height 
                    : Dimensions.get('window').height - 120,
                  backgroundColor: '#000000'
                }}
              />
            </ScrollView>

            {/* Floating Fullscreen toggle button */}
            <Pressable
              onPress={() => setIsFullScreen(!isFullScreen)}
              style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                borderRadius: 24,
                width: 48,
                height: 48,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <Ionicons 
                name={isFullScreen ? "contract-outline" : "expand-outline"} 
                size={22} 
                color="#FFFFFF" 
              />
            </Pressable>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="help-circle-outline" size={56} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={styles.errorText}>Unsupported file type</Text>
            <Text style={[styles.pdfSub, { textAlign: 'center', paddingHorizontal: 40 }]}>
              This document type cannot be previewed. Try sharing the document to view it.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  actionIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pressed: {
    backgroundColor: '#F3F4F6',
  },
  viewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  pdfContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  pdfSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 24,
  },
  openPdfBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  openPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loader: {
    position: 'absolute',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
