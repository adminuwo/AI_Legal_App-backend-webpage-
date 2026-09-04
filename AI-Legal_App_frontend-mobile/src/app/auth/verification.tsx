/**
 * AI Legal Mobile - OTP Verification Screen
 * Premium verification layout using OtpInput, resend timers, and clipboard integrations.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Clipboard,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, OtpInput, Slide, Fade, AuthErrorDialog } from '@/components/ui';
import { parseAuthError, ParsedAuthError } from '@/utils/auth-error-mapper';
import { AuthService } from '@/services/auth.service';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { StorageKeys } from '@/constants/app-constants';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { useToastContext } from '@/providers';

export default function VerificationScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{ email: string; reason: 'signup' | 'reset' }>();
  
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const setProfile = useUserStore((s) => s.setProfile);

  const targetEmail = params.email || 'your email';
  const reason = params.reason || 'signup';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [errorDetails, setErrorDetails] = useState<ParsedAuthError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const triggerError = (errObj: any) => {
    const details = parseAuthError(errObj, 'verification', router);
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  // Handle resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async () => {
    setError('');
    setSuccessMessage('');

    if (otp.length < 6) {
      triggerError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      if (reason === 'signup') {
        console.log('[VERIFICATION] Requesting verifyEmail API...');
        const response = await AuthService.verifyEmail({ email: targetEmail, code: otp });

        if (response.success || response.data) {
          showToast('success', 'Account Verified!', 'Your AI Legal™ account has been created successfully.');
          
          Alert.alert(
            'Account Created',
            'Your AI Legal™ account has been created successfully.',
            [
              {
                text: 'Log In Now',
                onPress: () => {
                  router.replace({
                    pathname: '/auth/login' as any,
                    params: { email: targetEmail },
                  });
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          triggerError(response.message || response.error || 'Invalid OTP code. Please try again.');
        }
      } else {
        // reason === 'reset'
        // No standalone verify reset OTP backend endpoint; we pass code to reset page
        console.log('[VERIFICATION] Verification code stored, redirecting to reset page.');
        router.push({
          pathname: `/auth/reset-password/${otp}` as any,
          params: { email: targetEmail },
        });
      }
    } catch (err: any) {
      console.error('[VERIFICATION ERROR]', err);
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      console.log('[VERIFICATION] Requesting resendCode API...');
      const res = await AuthService.resendCode(targetEmail);
      showToast('success', 'Code Resent', res.message || 'A new 6-digit OTP code has been sent.');
      setResendTimer(30);
    } catch (err: any) {
      console.error('[VERIFICATION RESEND ERROR]', err);
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
        if (cleaned.length > 0) {
          setOtp(cleaned);
        }
      }
    } catch (e) {
      console.warn('Could not read clipboard', e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView style={styles.safeArea}>
          <Slide duration={400} from="bottom" style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Fade duration={600} delay={100}>
                <Image 
                  source={require('@/assets/icons/inapplogo.png')} 
                  style={{ width: 95, height: 95, marginBottom: 16 }} 
                  resizeMode="contain" 
                />
              </Fade>
              <Text style={styles.title}>Verify Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to your email address.
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 8, marginBottom: 2 }}>
                OTP sent to:
              </Text>
              <Text style={styles.emailHighlight}>{targetEmail}</Text>
            </View>

            {/* OTP Cell Block */}
            <View style={styles.form}>
              <OtpInput
                codeLength={6}
                value={otp}
                onChangeValue={(val) => {
                  setOtp(val);
                  if (error) setError('');
                  if (successMessage) setSuccessMessage('');
                }}
                error={error}
              />

              {/* Paste helper option */}
              <Pressable
                onPress={handlePasteFromClipboard}
                style={styles.pasteBtn}
                accessibilityRole="button"
                accessibilityLabel="Paste verification code from clipboard"
              >
                <Text style={styles.pasteBtnText}>Paste from Clipboard</Text>
              </Pressable>

              {successMessage ? (
                <Fade duration={300} style={styles.successContainer}>
                  <Text style={styles.successText}>✓ {successMessage}</Text>
                </Fade>
              ) : null}

              <Button
                title="Verify Code"
                variant="primary"
                onPress={handleVerify}
                loading={loading}
                disabled={otp.length < 6 || loading}
                style={[styles.actionBtn, { backgroundColor: '#C8A34D', height: 56, borderRadius: 16 }]}
                textStyle={{ color: '#111111', fontWeight: '700' }}
              />
            </View>

            {/* Resend actions */}
            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={styles.timerText}>
                  Resend code in <Text style={styles.timerCount}>{resendTimer}s</Text>
                </Text>
              ) : (
                <View style={styles.resendRow}>
                  <Text style={styles.footerText}>{"Didn't receive the code? "}</Text>
                  <Pressable
                    onPress={handleResend}
                    accessibilityRole="button"
                    accessibilityLabel="Resend verification code"
                  >
                    <Text style={styles.resendLinkText}>Resend</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Back to login option */}
            <Pressable
              onPress={() => router.push('/auth/login')}
              style={styles.backBtn}
              accessibilityRole="link"
              accessibilityLabel="Navigate back to login"
            >
              <Text style={styles.backBtnText}>Back to Log In</Text>
            </Pressable>
          </Slide>
        </SafeAreaView>
      </ScrollView>
      <AuthErrorDialog
        visible={showErrorDialog}
        details={errorDetails}
        onClose={() => setShowErrorDialog(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  pasteBtn: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C8A34D',
  },
  successContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  successText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  timerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  timerCount: {
    color: '#111111',
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C8A34D',
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C8A34D',
  },
});
