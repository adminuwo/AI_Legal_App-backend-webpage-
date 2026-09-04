/**
 * AI Legal Mobile - Authentication Context Provider
 * Bootstraps sessions, loads tokens, manages biometric login configurations,
 * and schedules refresh token sync loops.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { useChatStore } from '../store/chat';
import { useCasesStore } from '../store/cases';
import { useWorkspaceStore } from '../store/workspace';
import { useNotificationStore } from '../store/notifications';
import { useSubscriptionStore } from '../store/subscription';
import { registerAuthHandlers } from '../api/client';
import { StorageService } from '../services/storage.service';
import { ProfileService } from '../services/profile.service';
import { StorageKeys } from '../constants/app-constants';

interface AuthContextType {
  isHydrated: boolean;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  enableBiometricLogin: () => Promise<boolean>;
  authenticateBiometrics: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const setProfile = useUserStore((s) => s.setProfile);

  const logout = useCallback(async () => {
    console.log('[AUTH PROVIDER] Wiping local session and secrets...');
    try {
      const rememberMePref = await StorageService.getSecret('ai_legal_remember_me_pref');
      const rememberedEmail = await StorageService.getSecret('ai_legal_remembered_email');
      
      await StorageService.clearAll();
      await StorageService.deleteSecret(StorageKeys.AuthToken);
      await StorageService.deleteSecret(StorageKeys.RefreshToken);
      await StorageService.deleteSecret('ai_legal_remembered_password');
      
      if (rememberMePref === 'true' && rememberedEmail) {
        await StorageService.saveSecret('ai_legal_remembered_email', rememberedEmail);
        await StorageService.saveSecret('ai_legal_remember_me_pref', 'true');
      } else {
        await StorageService.deleteSecret('ai_legal_remembered_email');
        await StorageService.deleteSecret('ai_legal_remember_me_pref');
      }
      
      try {
        const isExpoGo = require('expo-constants').default.appOwnership === 'expo' || 
                         require('expo-constants').default.executionEnvironment === 'storeClient';
        if (!isExpoGo) {
          let GoogleSigninInstance: any = null;
          try {
            GoogleSigninInstance = require('@react-native-google-signin/google-signin').GoogleSignin;
          } catch (e) {}
          if (GoogleSigninInstance) {
            await GoogleSigninInstance.signOut();
            await GoogleSigninInstance.revokeAccess();
          }
        }
      } catch (googleErr) {
        console.warn('[AUTH PROVIDER] Google Sign-in local signout error:', googleErr);
      }
    } catch (e) {
      console.warn('[AUTH PROVIDER] Local session wipe error:', e);
    } finally {
      clearCredentials();
      clearProfile();
      useChatStore.getState().clearChat();
      useCasesStore.getState().clearCases();
      useWorkspaceStore.getState().clearAllWorkspaces();
      useNotificationStore.getState().clearLocalState();
      useSubscriptionStore.getState().resetState();
    }
  }, [clearCredentials, clearProfile]);

  // Hydrate session from secure storage
  useEffect(() => {
    async function bootstrapSession() {
      try {
        console.log('[AUTH PROVIDER] Checking for persistent session...');
        const storedToken = await StorageService.getSecret(StorageKeys.AuthToken);
        const cachedSessionStr = await StorageService.getItem(StorageKeys.UserSession);

        if (storedToken && cachedSessionStr) {
          // Check local JWT expiration (exp claim)
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const expMs = (payload.exp || 0) * 1000;
              if (expMs > 0 && Date.now() >= expMs) {
                console.warn('[AUTH PROVIDER] Local JWT token expired, attempting refresh or logout...');
                const refreshToken = await StorageService.getSecret(StorageKeys.RefreshToken);
                if (!refreshToken) {
                  await logout();
                  return;
                }
              }
            }
          } catch (jwtParseErr) {
            console.warn('[AUTH PROVIDER] JWT payload parse warning:', jwtParseErr);
          }

          console.log('[AUTH PROVIDER] Restoring cached local session...');
          const cachedSession = JSON.parse(cachedSessionStr);
          
          setCredentials(storedToken, '');
          setProfile(cachedSession);

          // Perform background check to sync/verify with backend DB
          console.log('[AUTH PROVIDER] Background verifying session against server...');
          ProfileService.getProfile()
            .then(async (response) => {
              if (response.success && response.data) {
                console.log('[AUTH PROVIDER] Session verified successfully.');
                setProfile(response.data);
                await StorageService.setItem(StorageKeys.UserSession, JSON.stringify(response.data));
              }
            })
            .catch(async (error) => {
              console.warn('[AUTH PROVIDER] Background validation failed:', error.message || error);
              if (error.statusCode === 401 || error.message?.includes('401') || error.error?.includes('401')) {
                console.warn('[AUTH PROVIDER] Token invalid or expired, clearing session.');
                await logout();
              }
            });
        }
      } catch (err: any) {
        console.warn('[AUTH PROVIDER] Failed to hydrate authentication tokens:', err.message || err);
      } finally {
        try {
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricSupported(hardware && enrolled);
        } catch (e) {
          console.warn('[AUTH PROVIDER] Failed to detect biometric hardware:', e);
          setBiometricSupported(false);
        }
        setTimeout(() => {
          setIsHydrated(true);
        }, 500);
      }
    }

    bootstrapSession();

    // Register Axios HTTP handlers to fetch JWT tokens dynamically
    registerAuthHandlers({
      getAccessToken: async () => {
        const storeToken = useAuthStore.getState().token;
        if (storeToken) return storeToken;
        try {
          return await StorageService.getSecret(StorageKeys.AuthToken);
        } catch {
          return null;
        }
      },
      refreshAccessToken: async () => {
        try {
          const refreshToken = await StorageService.getSecret(StorageKeys.RefreshToken);
          if (!refreshToken) return null;
          
          const apiClient = (await import('../api/client')).apiClient;
          const res = await apiClient.post<{ token: string; refreshToken?: string }>('/auth/refresh', { refreshToken });
          if (res.data && res.data.token) {
            await StorageService.saveSecret(StorageKeys.AuthToken, res.data.token);
            if (res.data.refreshToken) {
              await StorageService.saveSecret(StorageKeys.RefreshToken, res.data.refreshToken);
            }
            useAuthStore.getState().setCredentials(res.data.token, '');
            return res.data.token;
          }
        } catch (err) {
          console.warn('[AUTH CLIENT] Refresh token failed:', err);
        }
        return null;
      },
      onSessionExpired: () => {
        console.warn('[AUTH CLIENT] Session expired. Redirecting to login.');
        logout();
      },
    });
  }, [logout, setCredentials, setProfile]);

  const enableBiometricLogin = async (): Promise<boolean> => {
    try {
      console.log('[BIOMETRIC] Requesting biometric authentication opt-in');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return false;
      }
      setBiometricEnabled(true);
      return true;
    } catch (err) {
      console.error('[BIOMETRIC] Failed to enable biometric login', err);
      return false;
    }
  };

  const authenticateBiometrics = async (): Promise<boolean> => {
    try {
      console.log('[BIOMETRIC] Prompting biometric verification (FaceID/TouchID)');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        console.warn('[BIOMETRIC] Hardware not available or no biometrics enrolled');
        return false;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock AI LEGAL',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      
      return result.success;
    } catch (err) {
      console.error('[BIOMETRIC] Biometric validation failed', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isHydrated,
        biometricSupported,
        biometricEnabled,
        enableBiometricLogin,
        authenticateBiometrics,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
