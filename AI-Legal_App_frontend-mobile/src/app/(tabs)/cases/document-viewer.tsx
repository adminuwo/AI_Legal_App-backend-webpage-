import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Image,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuthGuard } from '@/navigation/guards';
import { useToastContext } from '@/providers';

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

  const fileUrl = params.url || '';
  const fileTitle = params.title || 'Case Document';
  const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || fileTitle.toLowerCase().endsWith('.pdf');
  const isVideoOrAudio = !!(fileUrl.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/) || fileTitle.toLowerCase().match(/\.(mp4|mov|m4v|3gp|avi|mp3|wav|m4a|aac|ogg|webm)/));

  useEffect(() => {
    if ((isPdf || isVideoOrAudio) && fileUrl) {
      // Auto-open PDF or media files in WebBrowser for a seamless native viewing experience
      WebBrowser.openBrowserAsync(fileUrl).catch(err => {
        console.warn('Failed to open document or media in browser:', err);
      });
    }
  }, [fileUrl, isPdf, isVideoOrAudio]);

  const handleOpenPdf = async () => {
    if (fileUrl) {
      await WebBrowser.openBrowserAsync(fileUrl);
    } else {
      showToast('error', 'Error', 'No document URL available.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `AI LEGAL Case Workspace - Document: ${fileTitle}\nURL: ${fileUrl}`,
        title: fileTitle,
      });
      showToast('success', 'Shared Successfully', 'Document link shared.');
    } catch (err: any) {
      showToast('error', 'Share Failed', 'Failed to share document.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
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
          onPress={handleShare}
          style={({ pressed }) => [styles.actionIconButton, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={22} color="#1F2937" />
        </Pressable>
      </View>

      {/* Viewer Content */}
      <View style={styles.viewerContainer}>
        {isPdf || isVideoOrAudio ? (
          <View style={styles.pdfContainer}>
            <Ionicons 
              name={isVideoOrAudio ? (fileUrl.toLowerCase().match(/\.(mp3|wav|m4a|aac|ogg)/) ? "musical-notes" : "videocam") : "document-text"} 
              size={72} 
              color={isVideoOrAudio ? "#3B82F6" : "#EF4444"} 
              style={{ marginBottom: 16 }} 
            />
            <Text style={styles.pdfTitle}>{fileTitle}</Text>
            <Text style={styles.pdfSub}>{isVideoOrAudio ? "Media File" : "PDF Document"}</Text>
            <Pressable
              style={[styles.openPdfBtn, { backgroundColor: isVideoOrAudio ? "#3B82F6" : "#EF4444" }]}
              onPress={handleOpenPdf}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openPdfBtnText}>{isVideoOrAudio ? "Open Media or Document" : "Open in PDF Viewer"}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            minimumZoomScale={1.0}
            maximumZoomScale={3.0}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.imageScrollContent}
          >
            {fileUrl ? (
              <Image
                source={{ uri: fileUrl }}
                style={styles.image}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
              />
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.errorText}>No document URL available.</Text>
              </View>
            )}
            {isLoading && fileUrl && (
              <ActivityIndicator size="large" color="#111111" style={styles.loader} />
            )}
          </ScrollView>
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
});
