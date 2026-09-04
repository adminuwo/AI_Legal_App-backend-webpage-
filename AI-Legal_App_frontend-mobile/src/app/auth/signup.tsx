/**
 * AI Legal Mobile - Premium Registration Screen
 * Standard client-side inputs, safety validations, and terms checkbox.
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
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, PasswordInput, PhoneInput, CountryPickerInput, StatePickerInput, Slide, Fade, AuthErrorDialog } from '@/components/ui';
import { Country } from '@/constants';
import { AuthService } from '@/services/auth.service';
import { useToastContext, useThemeContext } from '@/providers';
import { parseAuthError, ParsedAuthError } from '@/utils/auth-error-mapper';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';

const INDIAN_EXAMPLES = [
  { name: 'Aditi Sharma', email: 'aditi.sharma@gmail.com' },
  { name: 'Rahul Verma', email: 'rahul.verma@gmail.com' },
  { name: 'Amit Patel', email: 'amit.patel@gmail.com' },
  { name: 'Priya Singh', email: 'priya.singh@gmail.com' },
  { name: 'Vikram Malhotra', email: 'vikram.malhotra@gmail.com' }
];

export default function SignupScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();

  const logoOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const [placeholderExample] = useState(() => {
    return INDIAN_EXAMPLES[Math.floor(Math.random() * INDIAN_EXAMPLES.length)];
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>({ name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' });
  const [selectedState, setSelectedState] = useState('Gujarat');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Error States
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [loading, setLoading] = useState(false);

  const [errorDetails, setErrorDetails] = useState<ParsedAuthError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const triggerError = (errObj: any) => {
    const details = parseAuthError(errObj, 'signup', router);
    setErrorDetails(details);
    setShowErrorDialog(true);
  };

  const validate = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      triggerError('Please complete all required fields before creating your account.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerError('Please enter a valid email address.');
      return false;
    }

    // Phone number is optional per Apple App Store Guideline 5.1.1(v)
    if (localPhone.trim()) {
      const code = selectedCountry.code;
      if (code === 'IN' || code === 'US' || code === 'CA') {
        if (localPhone.length !== 10) {
          triggerError('Phone number must be exactly 10 digits if provided.');
          return false;
        }
      } else {
        if (localPhone.length < 6 || localPhone.length > 14) {
          triggerError(`Phone number for ${selectedCountry.name} must be between 6 and 14 digits.`);
          return false;
        }
      }
    }

    // Password strength check (aligned with Express backend regex requirement)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      triggerError('weak password');
      return false;
    }

    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return false;
    }

    if (!acceptTerms) {
      triggerError('You must accept the terms & conditions.');
      return false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[SIGNUP] Requesting pre-OTP signup API...');
      const response = await AuthService.signup({
        name,
        fullName: name,
        email,
        password,
        phone: localPhone,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        state: selectedCountry.code === 'IN' ? selectedState : undefined,
        jurisdiction: selectedCountry.code === 'IN' ? `${selectedState}, India` : selectedCountry.name
      });

      if (response.success || response.data) {
        showToast('info', 'Verification Code Sent', `We've sent a 6-digit OTP code to ${email}`);
        // Route to verification OTP screen
        router.push({
          pathname: '/auth/verification' as any,
          params: { email, reason: 'signup' },
        });
      } else {
        triggerError(response.message || response.error || 'Registration failed');
      }
    } catch (err: any) {
      console.warn('[SIGNUP] Error during signup request:', err);
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardView, { backgroundColor: theme.background }]}
    >
      {/* Top Header */}
      <View
        style={[
          styles.customHeader,
          {
            paddingTop: insets.top,
            height: (Platform.OS === 'ios' ? 44 : 56) + insets.top,
            backgroundColor: theme.backgroundElement || '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: theme.border || '#F1F5F9',
          },
        ]}
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/login')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text || '#0F172A'} />
        </Pressable>
        <Text style={[styles.customHeaderTitle, { color: theme.text || '#0F172A' }]}>Create Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainContainer, { paddingBottom: insets.bottom || 24 }]}>
          <Slide duration={400} from="bottom" style={styles.content}>
            {/* Header */}
            <View style={[styles.header, { marginTop: -12 }]}>
              <Animated.Image 
                source={require('@/assets/icons/logo-transpernt.png.png')} 
                style={{ width: 95, height: 95, marginBottom: 0, opacity: logoOpacity }} 
                resizeMode="contain" 
              />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Create your secure AI LEGAL™ workspace</Text>
            </View>

            {/* Registration Form */}
            <View style={styles.form}>
              <TextInput
                label="Full Name"
                placeholder={`e.g. ${placeholderExample.name}`}
                value={name}
                onChangeText={setName}
                error={nameError}
                accessibilityLabel="Full Name Input"
              />

              <TextInput
                label="Email Address"
                placeholder={`e.g. ${placeholderExample.email}`}
                value={email}
                onChangeText={setEmail}
                error={emailError}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel="Email Input"
              />

              <CountryPickerInput
                label="Country / Legal Jurisdiction"
                selectedCountry={selectedCountry}
                onSelectCountry={(country) => {
                  setSelectedCountry(country);
                  setLocalPhone('');
                }}
              />

              {selectedCountry.code === 'IN' && (
                <StatePickerInput
                  label="Select State (App Language Auto-Set)"
                  selectedState={selectedState}
                  onSelectState={(st) => setSelectedState(st.name)}
                />
              )}

              <PhoneInput
                label="Phone Number"
                placeholder="Enter remaining digits"
                leftIcon={
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8, borderRightWidth: 1, borderRightColor: theme.border || '#CBD5E1' }}>
                    <Text style={{ fontSize: 16, marginRight: 4 }}>{selectedCountry.flag}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text || '#0F172A' }}>{selectedCountry.dialCode}</Text>
                  </View>
                }
                value={localPhone}
                onChangeText={(val) => setLocalPhone(val.replace(/[^0-9]/g, ''))}
                error={phoneError}
                accessibilityLabel="Phone Number Input"
              />

              <PasswordInput
                label="Password"
                placeholder="Create a secure password"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                accessibilityLabel="Password Choice Input"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={confirmPasswordError}
                accessibilityLabel="Confirm Password Input"
              />

              {/* Checkbox for terms */}
              <View style={styles.termsBlock}>
                <View style={[styles.termsContainer, { alignItems: 'flex-start' }]}>
                  <Pressable
                    onPress={() => setAcceptTerms(!acceptTerms)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptTerms }}
                    accessibilityLabel="Accept Terms and Conditions checkbox"
                    style={[
                      styles.checkbox,
                      { borderColor: acceptTerms ? '#C8A34D' : '#CBD5E1', backgroundColor: acceptTerms ? '#C8A34D' : '#FFF', marginTop: 2 },
                    ]}
                  >
                    {acceptTerms && <Text style={styles.checkboxTick}>✓</Text>}
                  </Pressable>
                  <Text style={styles.termsLabel}>
                    By creating an account, you agree to the{' '}
                    <Text 
                      style={{ color: '#C8A34D', fontWeight: '700', textDecorationLine: 'underline' }} 
                      onPress={() => router.push('/terms')}
                    >
                      Terms of Service
                    </Text>
                    {' '}and acknowledge that you have read the{' '}
                    <Text 
                      style={{ color: '#C8A34D', fontWeight: '700', textDecorationLine: 'underline' }}
                      onPress={() => router.push('/privacy')}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>
                {termsError && <Text style={[styles.errorText, { color: '#EF4444' }]}>{termsError}</Text>}
              </View>

              {/* Submit button */}
              <Button
                title="Create Account"
                variant="primary"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#C8A34D', height: 56, borderRadius: 16 }]}
                textStyle={{ color: '#111111', fontWeight: '700' }}
              />
            </View>

            {/* Login redirect footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable
                onPress={() => router.push('/auth/login')}
                accessibilityRole="link"
                accessibilityLabel="Navigate to login"
              >
                <Text style={[styles.footerLink, { color: '#C8A34D' }]}>Log In</Text>
              </Pressable>
            </View>
          </Slide>
        </View>
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
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  backBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    height: 40,
    width: 40,
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  form: {
    gap: 12,
    width: '100%',
  },
  termsBlock: {
    marginVertical: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  termsLabel: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
