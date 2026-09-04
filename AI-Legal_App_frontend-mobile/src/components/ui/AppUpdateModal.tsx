/**
 * AI Legal Mobile - Premium Centralized App Update Modal & Mandatory Overlay
 * Theme-matched to AI LEGAL™ visual identity (Soft Gold #C8A34D, Dark Charcoal #222222, Light Gray #F5F5F5).
 */

import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAppUpdate } from '@/providers/app-update-provider';
import { useThemeContext } from '@/providers/theme-provider';
import { Shadows } from '@/theme';

export const AppUpdateModal: React.FC = () => {
  const { theme, isDark } = useThemeContext();
  const {
    installedVersion,
    latestVersion,
    minimumSupportedVersion,
    updateTitle,
    updateMessage,
    isMandatory,
    isModalVisible,
    triggerUpdateFlow,
    dismissOptionalUpdate,
  } = useAppUpdate();

  // Prevent back button bypass on Android during Mandatory Update
  useEffect(() => {
    if (!isModalVisible || !isMandatory) return;

    const onBackPress = () => {
      // Intercept back button and prevent closing modal
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isModalVisible, isMandatory]);

  if (!isModalVisible) return null;

  // --- MANDATORY UPDATE BLOCKING SCREEN ---
  if (isMandatory) {
    return (
      <Modal
        visible={isModalVisible}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Block Android hardware back button close request
        }}
      >
        <SafeAreaView style={[styles.mandatoryContainer, { backgroundColor: isDark ? '#111111' : '#F5F5F5' }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          
          <View style={styles.mandatoryContentWrapper}>
            {__DEV__ && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 20, right: 16, backgroundColor: isDark ? '#222222' : '#E5E5E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}
                onPress={dismissOptionalUpdate}
              >
                <Ionicons name="close" size={14} color={isDark ? '#A1A1AA' : '#4B5563'} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#A1A1AA' : '#4B5563' }}>Close (Dev Test)</Text>
              </TouchableOpacity>
            )}

            {/* Header Badge & Logo */}
            <View style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../../assets/icons/logo-transpernt.png.png')}
                style={{ width: 84, height: 84, resizeMode: 'contain' }}
              />
            </View>

            <View style={styles.brandTitleRow}>
              <Text style={styles.brandText}>AI LEGAL™</Text>
            </View>

            <Text style={[styles.mandatoryTitle, { color: isDark ? '#FFFFFF' : '#111111' }]}>
              {updateTitle || 'AI LEGAL™ Update Required'}
            </Text>

            <Text style={[styles.mandatoryDescription, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>
              {updateMessage || 'Your current version is no longer supported. Please update AI LEGAL™ to continue.'}
            </Text>

            {/* Version Metadata Card */}
            <View style={[styles.versionCard, { backgroundColor: isDark ? '#222222' : '#FFFFFF', borderColor: isDark ? '#333333' : '#E5E5E5' }]}>
              <View style={styles.versionRow}>
                <Text style={[styles.versionLabel, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>Installed Version</Text>
                <Text style={[styles.versionValue, { color: isDark ? '#FFFFFF' : '#111111' }]}>{installedVersion}</Text>
              </View>
              
              <View style={[styles.versionDivider, { backgroundColor: isDark ? '#333333' : '#E5E5E5' }]} />
              
              <View style={styles.versionRow}>
                <Text style={[styles.versionLabel, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>Required Version</Text>
                <Text style={[styles.versionValue, { color: '#C8A34D' }]}>{minimumSupportedVersion || latestVersion}</Text>
              </View>
            </View>

            {/* Primary Action Button — NO SKIP / NO CANCEL */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryButton, { backgroundColor: '#C8A34D' }]}
              onPress={triggerUpdateFlow}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>UPDATE NOW</Text>
            </TouchableOpacity>

            <Text style={[styles.lockFooterNote, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              Official Store Update Required
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // --- OPTIONAL UPDATE MODAL ---
  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={dismissOptionalUpdate}
    >
      <View style={styles.overlay}>
        <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: '#C8A34D' }, Shadows.modal]}>
          {/* Header Icon */}
          <View style={{ marginBottom: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={require('../../../assets/icons/logo-transpernt.png.png')}
              style={{ width: 72, height: 72, resizeMode: 'contain' }}
            />
          </View>

          <Text style={[styles.optionalTitle, { color: theme.textPrimary }]}>
            {updateTitle || '✨ AI LEGAL™ Update Available'}
          </Text>

          <Text style={[styles.optionalDescription, { color: theme.textSecondary }]}>
            {updateMessage || 'A newer version of AI LEGAL™ is available. Update now to get the latest improvements, features and bug fixes.'}
          </Text>

          {/* Version Comparison Card */}
          <View style={[styles.optionalVersionCard, { backgroundColor: isDark ? '#111111' : '#F9F9F9', borderColor: theme.border }]}>
            <View style={styles.optionalVersionItem}>
              <Text style={[styles.optVerLabel, { color: theme.textMuted }]}>Current version</Text>
              <Text style={[styles.optVerVal, { color: theme.textPrimary }]}>{installedVersion}</Text>
            </View>

            <View style={[styles.vertDivider, { backgroundColor: theme.border }]} />

            <View style={styles.optionalVersionItem}>
              <Text style={[styles.optVerLabel, { color: theme.textMuted }]}>Latest version</Text>
              <Text style={[styles.optVerVal, { color: '#C8A34D' }]}>{latestVersion}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryButton, { backgroundColor: '#C8A34D' }]}
              onPress={triggerUpdateFlow}
            >
              <Text style={styles.primaryButtonText}>Update Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.laterButton}
              onPress={dismissOptionalUpdate}
            >
              <Text style={[styles.laterButtonText, { color: theme.textSecondary }]}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Mandatory Update Overlay Styles
  mandatoryContainer: {
    flex: 1,
  },
  mandatoryContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  mandatoryIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitleRow: {
    marginBottom: 6,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mandatoryTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  mandatoryDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  versionCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  versionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  versionDivider: {
    height: 1,
    width: '100%',
    marginVertical: 10,
  },
  lockFooterNote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },

  // Optional Update Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
  },
  optionalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionalDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  optionalVersionCard: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  optionalVersionItem: {
    alignItems: 'center',
    flex: 1,
  },
  optVerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  optVerVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  vertDivider: {
    width: 1,
    height: '80%',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  laterButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
