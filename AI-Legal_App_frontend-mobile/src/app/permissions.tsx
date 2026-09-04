/**
 * AI Legal Mobile - Modern Light Theme First-Time Permission Onboarding Screen
 * 
 * Features:
 * 1. AI Legal™ Light Theme (Pure White background, Gold accents, Black typography).
 * 2. Dedicated Permission Introduction Screen (Shown immediately after login/signup).
 * 3. Step-by-Step Runtime Permissions (Camera -> Microphone -> Photos/Documents -> Notifications).
 * 4. Location Permission is EXCLUDED from onboarding (requested contextually on-demand).
 * 5. Automatic progression on grant, graceful skip on deny, and Open Settings for blocked perms.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../hooks/use-permissions';
import {
  PERMISSION_CONFIGS,
  PERMISSION_SEQUENCE,
  PermissionType,
  PermissionDetails,
  PermissionService,
} from '../services/permission.service';

const { width } = Dimensions.get('window');

export default function PermissionOnboardingScreen() {
  const router = useRouter();
  const { requestPermission, markOnboardingComplete, openSettings } = usePermissions();

  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);

  // Animation values
  const introFadeAnim = useRef(new Animated.Value(1)).current;
  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.25)).current;

  const currentType: PermissionType = PERMISSION_SEQUENCE[currentIndex];
  const currentConfig: PermissionDetails = PERMISSION_CONFIGS[currentType];
  const isLastStep = currentIndex === PERMISSION_SEQUENCE.length - 1;

  // Update progress bar whenever step changes
  useEffect(() => {
    if (!showIntro) {
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / PERMISSION_SEQUENCE.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex, showIntro]);

  const handleStartSequence = () => {
    setIsProcessing(true);
    Animated.timing(introFadeAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowIntro(false);
      cardFadeAnim.setValue(0);
      cardScaleAnim.setValue(0.95);
      
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardScaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsProcessing(false);
      });
    });
  };

  const animateToNextStep = (nextIndex: number) => {
    setIsProcessing(true);
    setIsPermanentlyDenied(false);

    // Fade out current card
    Animated.parallel([
      Animated.timing(cardFadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 0.94,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (nextIndex >= PERMISSION_SEQUENCE.length) {
        // All permissions processed -> Finish onboarding
        handleFinishOnboarding();
      } else {
        setCurrentIndex(nextIndex);
        cardScaleAnim.setValue(1.04);

        // Fade in new card
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: true,
          }),
          Animated.timing(cardScaleAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsProcessing(false);
        });
      }
    });
  };

  const handleAllow = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await requestPermission(currentType);
      
      if (res.status === 'blocked') {
        setIsPermanentlyDenied(true);
        setIsProcessing(false);
      } else {
        // Automatically continue to next permission
        setTimeout(() => {
          animateToNextStep(currentIndex + 1);
        }, 200);
      }
    } catch (e) {
      console.error('[PERMISSIONS SCREEN] Allow request error:', e);
      animateToNextStep(currentIndex + 1);
    }
  };

  const handleNotNow = () => {
    if (isProcessing) return;
    animateToNextStep(currentIndex + 1);
  };

  const handleFinishOnboarding = async () => {
    await markOnboardingComplete();
    console.log('[PERMISSIONS SCREEN] Flow completed. Navigating to main dashboard...');
    router.replace('/(tabs)/dashboard');
  };

  const progressPercent = Math.round(((currentIndex + 1) / PERMISSION_SEQUENCE.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.goldBadgeDot} />
          <Text style={styles.brandTitle}>AI LEGAL™</Text>
        </View>

        <Pressable 
          style={styles.skipButton}
          onPress={handleFinishOnboarding}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip All</Text>
          <Ionicons name="chevron-forward" size={14} color="#64748B" />
        </Pressable>
      </View>

      {/* ========================================================================= */}
      {/* PHASE 1: PERMISSION INTRODUCTION SCREEN (Light Theme)                     */}
      {/* ========================================================================= */}
      {showIntro ? (
        <Animated.View style={[styles.introContainer, { opacity: introFadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.introScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Large Emblem Illustration */}
            <View style={styles.illustrationWrapper}>
              <View style={styles.illustrationGlowRing} />
              <View style={styles.illustrationCircle}>
                <Image
                  source={require('../../assets/icons/logo_gold_emblem.png')}
                  style={styles.emblemImage}
                  contentFit="contain"
                />
              </View>

              {/* Floating Feature Badges around illustration */}
              <View style={[styles.floatBadge, { top: 10, left: 10 }]}>
                <Ionicons name="camera-outline" size={14} color="#C8A34D" />
                <Text style={styles.floatBadgeText}>Scan</Text>
              </View>

              <View style={[styles.floatBadge, { top: 10, right: 10 }]}>
                <Ionicons name="mic-outline" size={14} color="#C8A34D" />
                <Text style={styles.floatBadgeText}>Voice</Text>
              </View>

              <View style={[styles.floatBadge, { bottom: 10, left: 10 }]}>
                <Ionicons name="images-outline" size={14} color="#C8A34D" />
                <Text style={styles.floatBadgeText}>Evidence</Text>
              </View>

              <View style={[styles.floatBadge, { bottom: 10, right: 10 }]}>
                <Ionicons name="notifications-outline" size={14} color="#C8A34D" />
                <Text style={styles.floatBadgeText}>Alerts</Text>
              </View>
            </View>

            {/* Intro Headline */}
            <Text style={styles.introTagline}>PREMIUM ONBOARDING</Text>
            <Text style={styles.introTitle}>Seamless Legal Workspace Setup</Text>

            {/* Friendly Explanation Paragraph (Required Exact Text) */}
            <View style={styles.explanationCard}>
              <Text style={styles.explanationText}>
                To give you the best AI Legal™ experience, we need a few permissions. These permissions help you securely scan documents, upload evidence, use voice features, and receive important hearing reminders.
              </Text>
            </View>

            {/* Summary Highlights list */}
            <View style={styles.highlightsContainer}>
              <View style={styles.highlightRow}>
                <View style={styles.goldCheckCircle}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.highlightText}>Camera for document & evidence scanning</Text>
              </View>

              <View style={styles.highlightRow}>
                <View style={styles.goldCheckCircle}>
                  <Ionicons name="mic" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.highlightText}>Microphone for AI voice & courtroom dictation</Text>
              </View>

              <View style={styles.highlightRow}>
                <View style={styles.goldCheckCircle}>
                  <Ionicons name="document-text" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.highlightText}>Photos & Documents for uploading case files</Text>
              </View>

              <View style={styles.highlightRow}>
                <View style={styles.goldCheckCircle}>
                  <Ionicons name="notifications" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.highlightText}>Notifications for hearing reminders & case updates</Text>
              </View>
            </View>
          </ScrollView>

          {/* Intro Bottom Action Area */}
          <View style={styles.introFooter}>
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleStartSequence}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#0F172A" style={{ marginLeft: 8 }} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.introSkipBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleFinishOnboarding}
            >
              <Text style={styles.introSkipBtnText}>Not Now, Setup Later</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        /* ========================================================================= */
        /* PHASE 2: SEQUENTIAL RUNTIME PERMISSIONS (Light Theme)                      */
        /* ========================================================================= */
        <View style={styles.stepFlowContainer}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.stepCounterText}>
                Permission <Text style={{ color: '#C8A34D', fontWeight: '800' }}>{currentIndex + 1}</Text> of {PERMISSION_SEQUENCE.length}
              </Text>
              <Text style={styles.percentText}>{progressPercent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Animated Permission Card */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  opacity: cardFadeAnim,
                  transform: [{ scale: cardScaleAnim }],
                },
              ]}
            >
              {/* Card Badge */}
              <View style={styles.badgeContainer}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#C8A34D" style={{ marginRight: 6 }} />
                <Text style={styles.badgeText}>{currentConfig.badge}</Text>
              </View>

              {/* Central Emblem Icon */}
              <View style={styles.iconEmblemOuter}>
                <View style={styles.iconEmblemInner}>
                  <Ionicons name={currentConfig.iconName as any} size={42} color="#C8A34D" />
                </View>
              </View>

              {/* Title & Short Description */}
              <Text style={styles.cardTitle}>{currentConfig.title}</Text>
              <Text style={styles.cardDescription}>{currentConfig.shortDescription}</Text>

              {/* Purpose Highlights */}
              <View style={styles.purposesContainer}>
                <Text style={styles.purposeHeader}>WHY THIS IS NEEDED</Text>
                {currentConfig.purposes.map((purpose, idx) => (
                  <View key={idx} style={styles.purposeRow}>
                    <View style={styles.checkIconBox}>
                      <Ionicons name="checkmark" size={12} color="#C8A34D" />
                    </View>
                    <Text style={styles.purposeText}>{purpose}</Text>
                  </View>
                ))}
              </View>

              {/* Permanent Denial Warning Notice */}
              {isPermanentlyDenied ? (
                <View style={styles.deniedNoticeBox}>
                  <Ionicons name="alert-circle-outline" size={24} color="#D97706" style={{ marginBottom: 6 }} />
                  <Text style={styles.deniedNoticeTitle}>Permission Disabled in System Settings</Text>
                  <Text style={styles.deniedNoticeText}>
                    To use this feature, please enable {currentConfig.title} manually in your Android system settings.
                  </Text>
                  <Pressable style={styles.settingsBtn} onPress={openSettings}>
                    <Ionicons name="settings-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.settingsBtnText}>Open System Settings</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {/* Allow Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.allowButton,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleAllow}
                  disabled={isProcessing}
                >
                  <Text style={styles.allowButtonText}>
                    {isLastStep ? 'Continue & Finish' : 'Continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#0F172A" style={{ marginLeft: 6 }} />
                </Pressable>

                {/* Not Now Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.notNowButton,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleNotNow}
                  disabled={isProcessing}
                >
                  <Text style={styles.notNowButtonText}>
                    {isLastStep ? 'Not Now & Finish' : 'Not Now'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Footer Privacy Note */}
          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>Your legal data & permissions remain 100% private and secure.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure White Light Theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A34D',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 1.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },

  /* Phase 1: Intro Screen Styles */
  introContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  introScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  illustrationWrapper: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  illustrationGlowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(200, 163, 77, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 163, 77, 0.25)',
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.2)',
  },
  emblemImage: {
    width: 75,
    height: 75,
  },
  floatBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  floatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  introTagline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  explanationCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '500',
  },
  highlightsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  goldCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C8A34D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  introFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  continueButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#C8A34D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  introSkipBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introSkipBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Phase 2: Sequential Step Flow Styles */
  stepFlowContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCounterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  percentText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C8A34D',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 163, 77, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C8A34D',
    letterSpacing: 1,
  },
  iconEmblemOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(200, 163, 77, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 163, 77, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconEmblemInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  purposesContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
  },
  purposeHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  purposeText: {
    fontSize: 12.5,
    color: '#1E293B',
    flex: 1,
    fontWeight: '500',
  },
  deniedNoticeBox: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  deniedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
    textAlign: 'center',
  },
  deniedNoticeText: {
    fontSize: 11.5,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  settingsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionRow: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#C8A34D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  allowButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  notNowButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  notNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
