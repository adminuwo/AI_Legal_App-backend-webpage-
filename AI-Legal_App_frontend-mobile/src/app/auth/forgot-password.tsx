/**
 * AI Legal Mobile - Forgot Password Screen
 * Captures email address for password reset OTP dispatch.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, EmailInput, Slide, Fade, AuthErrorDialog } from '@/components/ui';
import { AuthService } from '@/services/auth.service';
import { useToastContext } from '@/providers';
import { parseAuthError, ParsedAuthError } from '@/utils/auth-error-mapper';

export default function ForgotPasswordScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const params = useLocalSearchParams<{ email?: string }>();
  
  const [email, setEmail] = useState(params.email || '');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const [errorDetails, setErrorDetails] = useState<ParsedAuthError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const triggerError = (errObj: any) => {
    const details = parseAuthError(errObj, 'forgot', router);
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  const validate = (): boolean => {
    setEmailError('');
    if (!email.trim()) {
      triggerError('Please complete all required fields before creating your account.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[FORGOT PASSWORD] Requesting forgotPassword API...');
      const response = await AuthService.forgotPassword(email);

      if (response.success) {
        showToast('success', 'OTP Sent', response.message || 'OTP Sent Successfully.');
        // Navigate to OTP verification for password reset
        router.push({
          pathname: '/auth/verification' as any,
          params: { email, reason: 'reset' },
        });
      } else {
        triggerError(response.message || 'Failed to dispatch reset code.');
      }
    } catch (err: any) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      triggerError(err);
    } finally {
      setLoading(false);
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
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                {"Enter your email and we'll send a 6-digit verification code to reset your password."}
              </Text>
            </View>

            {/* Email form */}
            <View style={styles.form}>
              <EmailInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                accessibilityLabel="Recovery Email Input"
              />

              <Button
                title="Send Verification Code"
                variant="primary"
                onPress={handleForgotPassword}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#C8A34D', height: 56, borderRadius: 16 }]}
                textStyle={{ color: '#111111', fontWeight: '700' }}
              />
            </View>

            {/* Back button */}
            <Pressable
              onPress={() => router.push('/auth/login')}
              style={styles.backBtn}
              accessibilityRole="link"
              accessibilityLabel="Navigate back to login"
            >
              <Text style={[styles.backBtnText, { color: '#C8A34D' }]}>Back to Log In</Text>
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
    lineHeight: 20,
  },
  form: {
    gap: 16,
    width: '100%',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
