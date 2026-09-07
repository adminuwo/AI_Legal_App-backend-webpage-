import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { VoiceNarrationService } from '@/services/voice-narration.service';

export const AI_CONSENT_STORAGE_KEY = '@ai_legal_ai_consent_accepted_v1';

export interface AiConsentModalProps {
  forceShow?: boolean;
  onConsentAccepted?: () => void;
}

export const AiConsentModal: React.FC<AiConsentModalProps> = ({
  forceShow = false,
  onConsentAccepted,
}) => {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only target iOS platform per requirement
    if (Platform.OS !== 'ios' && !forceShow) {
      return;
    }

    const checkConsent = async () => {
      try {
        const stored = await AsyncStorage.getItem(AI_CONSENT_STORAGE_KEY);
        if (stored !== 'true' || forceShow) {
          setIsVisible(true);
          VoiceNarrationService.stop();
        }
      } catch (e) {
        // Fallback: show if reading storage fails
        setIsVisible(true);
        VoiceNarrationService.stop();
      }
    };

    checkConsent();
  }, [forceShow]);

  const handleAgreeAndContinue = async () => {
    try {
      await AsyncStorage.setItem(AI_CONSENT_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('[AiConsentModal] Failed to persist consent:', e);
    }
    setIsVisible(false);
    DeviceEventEmitter.emit('AI_CONSENT_ACCEPTED');
    if (onConsentAccepted) {
      onConsentAccepted();
    }
  };

  const handleViewPrivacyPolicy = () => {
    router.push('/privacy' as any);
  };

  // Only render on iOS
  if (Platform.OS !== 'ios' && !forceShow) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderColor: isDark ? '#27272A' : '#E4E4E7',
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={30} color="#C8A34D" />
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#111827' },
              ]}
            >
              AI Data Processing & Privacy Notice
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? '#A1A1AA' : '#6B7280' },
              ]}
            >
              How AI LEGAL™ securely handles your queries and documents:
            </Text>

            {/* Core Disclosures for Apple 5.1.1(i) & 5.1.2(i) */}
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletIconBox}>
                  <Ionicons name="document-text-outline" size={16} color="#C8A34D" />
                </View>
                <View style={styles.bulletTextCol}>
                  <Text style={[styles.bulletTitle, { color: isDark ? '#F4F4F5' : '#1F2937' }]}>
                    What Data is Sent
                  </Text>
                  <Text style={[styles.bulletBody, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                    Your legal prompts, questions, and uploaded document excerpts are processed to generate research & drafting responses.
                  </Text>
                </View>
              </View>

              <View style={styles.bulletRow}>
                <View style={styles.bulletIconBox}>
                  <Ionicons name="sparkles-outline" size={16} color="#C8A34D" />
                </View>
                <View style={styles.bulletTextCol}>
                  <Text style={[styles.bulletTitle, { color: isDark ? '#F4F4F5' : '#1F2937' }]}>
                    Third-Party AI Service Provider
                  </Text>
                  <Text style={[styles.bulletBody, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                    We utilize enterprise Google Gemini AI APIs to process analysis securely in real-time.
                  </Text>
                </View>
              </View>

              <View style={styles.bulletRow}>
                <View style={styles.bulletIconBox}>
                  <Ionicons name="lock-closed-outline" size={16} color="#C8A34D" />
                </View>
                <View style={styles.bulletTextCol}>
                  <Text style={[styles.bulletTitle, { color: isDark ? '#F4F4F5' : '#1F2937' }]}>
                    Confidentiality & No Model Training
                  </Text>
                  <Text style={[styles.bulletBody, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                    All data is encrypted in transit and at rest. Your information is never sold, shared with advertisers, or used to train public AI models.
                  </Text>
                </View>
              </View>
            </View>

            {/* Privacy Policy Link */}
            <TouchableOpacity
              onPress={handleViewPrivacyPolicy}
              style={styles.policyLinkButton}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={14} color="#C8A34D" />
              <Text style={styles.policyLinkText}>Read Full Privacy Policy</Text>
            </TouchableOpacity>

            {/* Single Action CTA Button */}
            <TouchableOpacity
              onPress={handleAgreeAndContinue}
              style={styles.agreeButton}
              activeOpacity={0.85}
            >
              <Text style={styles.agreeButtonText}>Agree & Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#111111" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    padding: 22,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  bulletList: {
    gap: 12,
    marginBottom: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 163, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  bulletTextCol: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bulletBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  policyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 16,
  },
  policyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C8A34D',
    textDecorationLine: 'underline',
  },
  agreeButton: {
    width: '100%',
    backgroundColor: '#C8A34D',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  agreeButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
  },
});
