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
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGuestGuard } from '@/navigation/guards';
import { Button, TextInput, EmailInput, PasswordInput, Slide, Fade, AuthErrorDialog } from '@/components/ui';
import { parseAuthError, ParsedAuthError } from '@/utils/auth-error-mapper';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { AuthService } from '@/services/auth.service';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { StorageKeys } from '@/constants/app-constants';
import { useToastContext } from '@/providers';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AppConfig } from '@/config';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

const isExpoGoEnv = Constants.executionEnvironment === 'storeClient';

let GoogleSignin: any = null;
if (!isExpoGoEnv) {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (e) {
    console.warn('[LOGIN] Native Google Sign-In SDK is not loaded in this environment.');
  }
}

let AppleAuthentication: any = null;
if (!isExpoGoEnv) {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.warn('[LOGIN] Native Apple Authentication SDK is not loaded in this environment.');
  }
}

export default function LoginScreen() {
  useGuestGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const setProfile = useUserStore((s) => s.setProfile);

  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const passwordInputRef = React.useRef<any>(null);

  useEffect(() => {
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoadingText, setSocialLoadingText] = useState<string | null>(null);

  const [errorDetails, setErrorDetails] = useState<ParsedAuthError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const triggerError = (errObj: any) => {
    if (
      errObj?.isSessionExpired ||
      errObj?.message?.includes('Refresh token returned null') ||
      errObj?.message?.includes('Session expired')
    ) {
      return;
    }
    const details = parseAuthError(errObj, 'login', router, (actionType?: string) => {
      if (actionType === 'openSandboxGoogle') {
        setShowErrorDialog(false);
        setSandboxProvider('google');
        setSandboxEmail('sanskarbt2@gmail.com');
        setSandboxName('Sanskar');
        setSandboxModalVisible(true);
      }
    });
    setErrorDetails(details);
    setShowErrorDialog(true);
  };


  // Sandbox OAuth simulation state
  const [sandboxModalVisible, setSandboxModalVisible] = useState(false);
  const [sandboxProvider, setSandboxProvider] = useState<'google' | 'apple'>('google');
  const [sandboxName, setSandboxName] = useState('');
  const [sandboxEmail, setSandboxEmail] = useState('');

  // Initialize native Google Sign-In SDK conditionally and load remembered credentials
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    if (GoogleSignin) {
      try {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '743928421487-8nuhql6qpu3c3vd4tum9g5a4c0qkcgdj.apps.googleusercontent.com';
        if (webClientId) {
          GoogleSignin.configure({
            webClientId,
            iosClientId,
            offlineAccess: false,
            scopes: ['profile', 'email'],
          });
        }
      } catch (err) {
        console.warn('[LOGIN] Failed to configure Google Sign-In:', err);
      }
    }

    async function loadRememberedCredentials() {
      try {
        const isRememberMeOn = await StorageService.getSecret('ai_legal_remember_me_pref');
        if (isRememberMeOn === 'true') {
          const rememberedEmail = await StorageService.getSecret('ai_legal_remembered_email');
          await StorageService.deleteSecret('ai_legal_remembered_password');
          
          if (rememberedEmail) {
            setEmail(rememberedEmail);
            setSandboxEmail(rememberedEmail);
          }
          setRememberMe(true);
        }
      } catch (err) {
        console.warn('[LOGIN] Failed to load remembered credentials:', err);
      }
    }
    loadRememberedCredentials();
  }, []);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim() || !password.trim()) {
      triggerError('Please complete all required fields before creating your account.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerError('Please enter a valid email address.');
      return false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('[LOGIN] Requesting login API...');
      const response = await AuthService.login({ email, password });

      if (response.success && response.data) {
        const { token, refreshToken } = response.data as any;

        // Save access token securely
        await StorageService.saveSecret(StorageKeys.AuthToken, token);

        if (refreshToken) {
          await StorageService.saveSecret(StorageKeys.RefreshToken, refreshToken);
        }

        // Save/Remove Remember Me preferences securely (Never store passwords in storage)
        if (rememberMe) {
          await StorageService.saveSecret('ai_legal_remembered_email', email);
          await StorageService.deleteSecret('ai_legal_remembered_password');
          await StorageService.saveSecret('ai_legal_remember_me_pref', 'true');
        } else {
          await StorageService.deleteSecret('ai_legal_remembered_email');
          await StorageService.deleteSecret('ai_legal_remembered_password');
          await StorageService.deleteSecret('ai_legal_remember_me_pref');
        }

        // Fetch full profile from DB
        console.log('[LOGIN] Requesting full profile synchronization...');
        const profileRes = await ProfileService.getProfile();

        if (profileRes.success && profileRes.data) {
          // Cache user profile details in AsyncStorage
          await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));

          // Load into stores (will trigger auto-redirection via GuestGuard)
          setCredentials(token, '');
          setProfile(profileRes.data);

          showToast('success', 'Welcome Back!', 'You have successfully signed in.');
        } else {
          throw new Error('Could not retrieve user profile from server.');
        }
      } else {
        throw new Error(response.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      triggerError(err);
    } finally {
      setLoading(false);
    }
  };

  const processGoogleIdToken = async (idToken: string) => {
    console.log(`[GOOGLE LOGIN] Submitting verified ID token to backend...`);
    const res = await AuthService.googleLogin(idToken);

    if (res.success && res.data) {
      const { token } = res.data;
      await StorageService.saveSecret(StorageKeys.AuthToken, token);
      
      if (rememberMe) {
        await StorageService.setItem('ai_legal_remembered_email', res.data.user.email);
      }

      console.log('[GOOGLE LOGIN] Syncing user profile...');
      const profileRes = await ProfileService.getProfile();
      
      if (profileRes.success && profileRes.data) {
        await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
        setCredentials(token, '');
        setProfile(profileRes.data);
        showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
      } else {
        throw new Error('Could not retrieve user profile from server.');
      }
    } else {
      throw new Error(res.message || 'Google login failed.');
    }
  };

  const triggerSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setSocialLoadingText(`Signing in with ${provider === 'google' ? 'Google' : 'Apple'}...`);

    try {
      const isExpoGo = isExpoGoEnv;
      if (provider === 'google') {
        const isNativeGoogleAvailable = GoogleSignin && !isExpoGo;
        if (isNativeGoogleAvailable) {
          console.log('[GOOGLE LOGIN] Attempting native Google Play Services sign-in...');
          const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
          const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '743928421487-8nuhql6qpu3c3vd4tum9g5a4c0qkcgdj.apps.googleusercontent.com';
          if (webClientId) {
            GoogleSignin.configure({
              webClientId,
              iosClientId,
              offlineAccess: false,
              scopes: ['profile', 'email'],
            });
          }
          await GoogleSignin.hasPlayServices();
          try { await GoogleSignin.signOut(); } catch (signOutErr) {}
          const userInfo = await GoogleSignin.signIn();
          let idToken = userInfo.data?.idToken || userInfo.idToken;
          if (!idToken) {
            try {
              const tokens = await GoogleSignin.getTokens();
              idToken = tokens?.idToken;
            } catch (tokenErr) {
              console.warn('[GOOGLE LOGIN] getTokens fallback error:', tokenErr);
            }
          }
          if (idToken) {
            await processGoogleIdToken(idToken);
          } else {
            throw new Error('Google ID Token was not returned.');
          }
        } else {
          // Expo Go fallback
          setSandboxProvider('google');
          setSandboxEmail('aditilakhera0@gmail.com');
          setSandboxName('Aditi Lakhera');
          setSandboxModalVisible(true);
          setLoading(false);
          setSocialLoadingText(null);
        }
      } else {
        const isAppleAvailable = AppleAuthentication && !isExpoGo;
        if (isAppleAvailable && await AppleAuthentication.isAvailableAsync()) {
          console.log('[APPLE NATIVE LOGIN] Starting Apple native authentication sheet...');
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          if (!credential.identityToken) {
            throw new Error('Apple Identity Token was not returned.');
          }

          const fullName = credential.fullName;
          let displayName = undefined;
          if (fullName) {
            displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() || undefined;
          }

          console.log(`[APPLE NATIVE LOGIN] Submitting verified Identity token to backend...`);
          const res = await AuthService.appleLogin({
            identityToken: credential.identityToken,
            email: credential.email,
            name: displayName,
          });

          if (res.success && res.data) {
            const { token } = res.data;
            await StorageService.saveSecret(StorageKeys.AuthToken, token);
            
            if (rememberMe) {
              await StorageService.setItem('ai_legal_remembered_email', res.data.user.email);
            }

            console.log('[APPLE NATIVE LOGIN] Syncing profile...');
            const profileRes = await ProfileService.getProfile();
            
            if (profileRes.success && profileRes.data) {
              await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
              setCredentials(token, '');
              setProfile(profileRes.data);
              showToast('success', 'Social Login Success', `Welcome back, ${profileRes.data.name}!`);
            } else {
              throw new Error('Could not retrieve user profile from server.');
            }
          } else {
            throw new Error(res.message || 'Apple login failed.');
          }
        } else {
          // Open Interactive Sandbox Dialog
          setSandboxProvider('apple');
          setSandboxName('');
          setSandboxEmail('');
          setSandboxModalVisible(true);
          setLoading(false);
          setSocialLoadingText(null);
        }
      }
    } catch (err: any) {
      console.error('[SOCIAL LOGIN ERROR]', err);
      // Native cancellation checks
      if (err.code === 'SIGN_IN_CANCELLED' || err.code === '1001' || err.message?.includes('cancel')) {
        showToast('info', 'Cancelled', 'Social sign-in cancelled.');
      } else {
        triggerError(err);
      }
      setSocialLoadingText(null);
      setLoading(false);
    }
  };

  const handleSandboxSubmit = async () => {
    if (!sandboxEmail.trim()) {
      showToast('error', 'Required Field', 'Please enter a valid email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sandboxEmail)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSandboxModalVisible(false);
    setLoading(true);
    setSocialLoadingText(`Simulating ${sandboxProvider === 'google' ? 'Google' : 'Apple'} Sign-in...`);

    try {
      const emailVal = sandboxEmail.toLowerCase().trim();
      const nameVal = sandboxName.trim() || `${sandboxProvider === 'google' ? 'Google' : 'Apple'} User`;

      const res = await AuthService.socialLogin({
        email: emailVal,
        name: nameVal,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=random`,
        provider: sandboxProvider,
        providerId: `sandbox_${sandboxProvider}_${Date.now()}`,
      });

      if (res.success && res.data) {
        const { token } = res.data;
        await StorageService.saveSecret(StorageKeys.AuthToken, token);
        if (rememberMe) {
          await StorageService.setItem('ai_legal_remembered_email', emailVal);
        }

        const profileRes = await ProfileService.getProfile();
        if (profileRes.success && profileRes.data) {
          await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(profileRes.data));
          setCredentials(token, '');
          setProfile(profileRes.data);
          showToast('success', 'Social Login Success (Simulated)', `Welcome, ${profileRes.data.name}!`);
        } else {
          throw new Error('Could not retrieve user profile from server.');
        }
      } else {
        throw new Error(res.message || 'Sandbox login failed.');
      }
    } catch (err: any) {
      console.error('[SANDBOX AUTH ERROR]', err);
      showToast('error', 'Authentication Failed', err.message || 'Sandbox authentication failed.');
    } finally {
      setSocialLoadingText(null);
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
            <View style={[styles.header, { marginTop: -12 }]}>
              <Animated.Image 
                source={require('@/assets/icons/inapplogo.png')} 
                style={{ width: 95, height: 95, marginBottom: 0, opacity: logoOpacity }} 
                resizeMode="contain" 
              />
              <Text style={styles.title}>Welcome to AI LEGAL<Text style={{ fontSize: 16, fontWeight: '900', transform: [{ translateY: -9 }] }}>™</Text></Text>
              <Text style={styles.subtitle}>Enter credentials to access your secure workspace</Text>
            </View>

            {/* Inputs Block */}
            <View style={styles.form}>
              <EmailInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                accessibilityLabel="Email Input"
              />

              <PasswordInput
                inputRef={passwordInputRef}
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                autoComplete="password"
                accessibilityLabel="Password Input"
              />

              {/* Extra toggles row */}
              <View style={styles.optionsRow}>
                <Pressable
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Remember Me checkbox"
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: rememberMe ? '#C8A34D' : '#CBD5E1', backgroundColor: rememberMe ? '#C8A34D' : '#FFF' },
                    ]}
                  >
                    {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.optionLabel}>Remember me</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/auth/forgot-password')}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot Password link"
                >
                  <Text style={[styles.forgotPasswordText, { color: '#C8A34D' }]}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* Form submit button */}
              <Button
                title={socialLoadingText || "Log In"}
                variant="primary"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={[styles.actionBtn, { backgroundColor: '#C8A34D', height: 56, borderRadius: 16 }]}
                textStyle={{ color: '#111111', fontWeight: '700' }}
              />
            </View>

            {/* Social Oauth options */}
            <Fade duration={500} delay={200} style={styles.socialBlock}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.socialButtonsRow}>
                <Pressable 
                  style={[styles.socialBtn, loading && { opacity: 0.5 }]} 
                  onPress={() => !loading && triggerSocialAuth('google')}
                  disabled={loading}
                  accessibilityLabel="Log in with Google" 
                  accessibilityRole="button"
                >
                  <Image 
                    source={require('../../../assets/images/official_google_g_logo.png')} 
                    style={{ width: 22, height: 22 }} 
                    resizeMode="contain" 
                  />
                  <Text style={styles.socialBtnText}>Google</Text>
                </Pressable>

                {Platform.OS === 'ios' && (
                  <Pressable 
                    style={[styles.socialBtn, loading && { opacity: 0.5 }]} 
                    onPress={() => !loading && triggerSocialAuth('apple')}
                    disabled={loading}
                    accessibilityLabel="Log in with Apple" 
                    accessibilityRole="button"
                  >
                    <Ionicons name="logo-apple" size={22} color="#000000" />
                    <Text style={styles.socialBtnText}>Apple</Text>
                  </Pressable>
                )}
              </View>
            </Fade>

            {/* Account registration footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to AI LEGAL™?</Text>
              <Pressable
                onPress={() => router.push('/auth/signup')}
                accessibilityRole="link"
                accessibilityLabel="Navigate to signup"
              >
                <Text style={[styles.footerLink, { color: '#C8A34D' }]}>Create Account</Text>
              </Pressable>
            </View>
            {/* Sandbox Simulation Auth Modal */}
            <Modal
              visible={sandboxModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSandboxModalVisible(false)}
            >
              <View style={styles.sandboxOverlay}>
                <View style={styles.sandboxContainer}>
                  <View style={styles.sandboxHeader}>
                    <Text style={styles.sandboxTitle}>
                      {sandboxProvider === 'google' ? 'Google' : 'Apple'} Sign-In Simulation
                    </Text>
                    <Pressable onPress={() => setSandboxModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#64748B" />
                    </Pressable>
                  </View>

                  <Text style={styles.sandboxSubtitle}>
                    Enter your real name and email address to simulate the OAuth authentication flow inside Expo Go.
                  </Text>

                  <View style={{ gap: 14 }}>
                    <View>
                      <Text style={styles.inputLabel}>Display Name</Text>
                      <TextInput
                        style={styles.sandboxInput}
                        value={sandboxName}
                        onChangeText={setSandboxName}
                        placeholder="e.g. Aditi Sharma"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <TextInput
                        style={styles.sandboxInput}
                        value={sandboxEmail}
                        onChangeText={setSandboxEmail}
                        placeholder="e.g. aditi@uwo24.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.sandboxSubmitBtn, { backgroundColor: '#111111' }]} 
                      onPress={handleSandboxSubmit}
                    >
                      <Text style={styles.sandboxSubmitBtnText}>Proceed with Sign-In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  rememberMeContainer: {
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
  optionLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  socialBlock: {
    marginTop: 32,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  socialIcon: {
    fontSize: 18,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
    marginBottom: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalForm: {
    gap: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  modalSubmitBtn: {
    backgroundColor: '#111111',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sandboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sandboxContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  sandboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sandboxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sandboxSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sandboxInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  sandboxSubmitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  sandboxSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
