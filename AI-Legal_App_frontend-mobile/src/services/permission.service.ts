/**
 * AI Legal Mobile - Permission Service
 * Centralized service for requesting, inspecting, and managing native device permissions
 * compliant with Android 13+ runtime permissions, Expo Go SDK 54, and iOS guidelines.
 */

import { Platform, Linking } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StorageService } from './storage.service';
import { ProfileService } from './profile.service';
import { useUserStore } from '@/store/user';

const isExpoGoMode = 
  Constants.appOwnership === 'expo' || 
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).expoVersion !== undefined;

export type PermissionType = 
  | 'camera' 
  | 'microphone' 
  | 'photos' 
  | 'location' 
  | 'notifications' 
  | 'documents';

export const PERMISSION_SEQUENCE: PermissionType[] = [
  'camera',
  'microphone',
  'photos',
  'notifications',
];

export interface PermissionDetails {
  id: PermissionType;
  title: string;
  badge: string;
  iconName: string;
  shortDescription: string;
  purposes: string[];
  mandatory?: boolean;
}

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'blocked';
}

export const PERMISSION_CONFIGS: Record<PermissionType, PermissionDetails> = {
  camera: {
    id: 'camera',
    title: 'Camera Access',
    badge: 'DOCUMENT & EVIDENCE SCANNING',
    iconName: 'camera-outline',
    shortDescription: 'AI LEGAL™ uses camera access to capture documents, evidence, and images for analysis.',
    purposes: [
      'Scan legal documents with high precision',
      'Capture court & case evidence photos',
      'Upload case-related media to AI Vault'
    ]
  },
  microphone: {
    id: 'microphone',
    title: 'Microphone Access',
    badge: 'AI VOICE & MOCK COURTROOM',
    iconName: 'mic-outline',
    shortDescription: 'AI LEGAL™ uses microphone access for voice input and AI voice-based features.',
    purposes: [
      'Voice input & hands-free commands',
      'Interactive AI Voice Assistant mode',
      'AI Mock Courtroom trial simulations',
      'Real-time legal speech-to-text dictation'
    ]
  },
  photos: {
    id: 'photos',
    title: 'Photo Access',
    badge: 'MEDIA & DOCUMENT UPLOADS',
    iconName: 'images-outline',
    shortDescription: 'AI LEGAL™ uses photo access to select documents and images for analysis.',
    purposes: [
      'Upload existing case documents & evidence',
      'Select images for AI legal analysis',
      'Import PDF files & court record attachments'
    ]
  },
  location: {
    id: 'location',
    title: 'Location Services',
    badge: 'NEARBY COURTS & NAVIGATION',
    iconName: 'location-outline',
    shortDescription: 'Used to locate nearby courts, get hearing directions, and verify jurisdiction requirements.',
    purposes: [
      'Find nearby court locations & jurisdiction info',
      'Get real-time directions for scheduled hearings',
      'Auto-detect local court rule presets'
    ]
  },
  notifications: {
    id: 'notifications',
    title: 'Push Notifications',
    badge: 'HEARING REMINDERS & ALERTS',
    iconName: 'notifications-outline',
    shortDescription: 'Stay updated on crucial court dates, case task updates, and AI legal research completions.',
    purposes: [
      'Timely hearing date & court reminders',
      'Real-time case status & team updates',
      'Task assignments & client invitations',
      'AI document analysis completion alerts'
    ]
  },
  documents: {
    id: 'documents',
    title: 'File System Access',
    badge: 'LEGAL FILE & PDF IMPORTS',
    iconName: 'document-text-outline',
    shortDescription: 'Required for browsing and importing PDF, DOCX, and legal record files into workspace cases.',
    purposes: [
      'Import legal PDF & DOCX contracts',
      'Attach court transcripts & filings',
      'Export & save AI legal summary reports'
    ]
  }
};

const ONBOARDING_COMPLETED_KEY = '@has_completed_permission_onboarding';

export class PermissionService {
  /**
   * Check if the user has completed the first-time permission onboarding flow.
   */
  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const localVal = await StorageService.getItem(ONBOARDING_COMPLETED_KEY);
      if (localVal === 'true') return true;

      const profile = useUserStore.getState().profile;
      if (profile?.personalizations?.general?.permissionsOnboardingCompleted) {
        await StorageService.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        return true;
      }
      return false;
    } catch (e) {
      console.error('[PERMISSION SERVICE] Error checking onboarding status', e);
      return false;
    }
  }

  /**
   * Mark first-time permission onboarding as complete locally and on backend.
   */
  static async markOnboardingComplete(): Promise<void> {
    try {
      await StorageService.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('[PERMISSION SERVICE] Marked permission onboarding as complete locally.');

      const profile = useUserStore.getState().profile;
      if (profile) {
        const updatedGeneral = {
          ...(profile.personalizations?.general || {}),
          permissionsOnboardingCompleted: true,
        };
        const updatedPersonalizations = {
          ...(profile.personalizations || {}),
          general: updatedGeneral,
        };

        useUserStore.getState().setProfile({
          ...profile,
          personalizations: updatedPersonalizations as any,
        });

        ProfileService.updateProfile({
          personalizations: updatedPersonalizations as any,
        }).catch((err) => {
          console.warn('[PERMISSION SERVICE] Failed backend sync for permission onboarding:', err);
        });
      }
    } catch (e) {
      console.error('[PERMISSION SERVICE] Error completing onboarding', e);
    }
  }

  /**
   * Reset onboarding status (for testing/debug).
   */
  static async resetOnboardingStatus(): Promise<void> {
    try {
      await StorageService.removeItem(ONBOARDING_COMPLETED_KEY);
    } catch (e) {
      console.error('[PERMISSION SERVICE] Error resetting onboarding status', e);
    }
  }

  /**
   * Request permission for a specific category native dialog.
   */
  static async requestPermission(type: PermissionType): Promise<PermissionResult> {
    if (Platform.OS === 'web') {
      return { granted: true, canAskAgain: true, status: 'granted' };
    }

    try {
      switch (type) {
        case 'camera': {
          const res = await Camera.requestCameraPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'microphone': {
          const res = await Audio.requestPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'photos': {
          const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'location': {
          try {
            const res = await Location.requestForegroundPermissionsAsync();
            return {
              granted: res.granted,
              canAskAgain: res.canAskAgain,
              status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
            };
          } catch (err) {
            console.warn('[PERMISSION SERVICE] Location request fallback:', err);
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
        }
        case 'notifications': {
          if (isExpoGoMode) {
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
          try {
            const Notifications = require('expo-notifications');
            const res = await Notifications.requestPermissionsAsync();
            return {
              granted: res.granted,
              canAskAgain: res.canAskAgain,
              status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
            };
          } catch (err) {
            // Expo Go SDK 53/54 compatibility guard for push notifications
            console.warn('[PERMISSION SERVICE] Notifications request fallback (Expo Go mode):', err);
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
        }
        case 'documents': {
          return { granted: true, canAskAgain: true, status: 'granted' };
        }
        default:
          return { granted: false, canAskAgain: true, status: 'denied' };
      }
    } catch (error) {
      console.warn(`[PERMISSION SERVICE] Error requesting ${type}:`, error);
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Check current status of a specific permission.
   */
  static async checkPermission(type: PermissionType): Promise<PermissionResult> {
    if (Platform.OS === 'web') {
      return { granted: true, canAskAgain: true, status: 'granted' };
    }

    try {
      switch (type) {
        case 'camera': {
          const res = await Camera.getCameraPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'microphone': {
          const res = await Audio.getPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'photos': {
          const res = await ImagePicker.getMediaLibraryPermissionsAsync();
          return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
          };
        }
        case 'location': {
          try {
            const res = await Location.getForegroundPermissionsAsync();
            return {
              granted: res.granted,
              canAskAgain: res.canAskAgain,
              status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
            };
          } catch (err) {
            console.warn('[PERMISSION SERVICE] Location check fallback:', err);
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
        }
        case 'notifications': {
          if (isExpoGoMode) {
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
          try {
            const Notifications = require('expo-notifications');
            const res = await Notifications.getPermissionsAsync();
            return {
              granted: res.granted,
              canAskAgain: res.canAskAgain,
              status: res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
            };
          } catch (err) {
            console.warn('[PERMISSION SERVICE] Notifications check fallback (Expo Go mode):', err);
            return { granted: true, canAskAgain: true, status: 'granted' };
          }
        }
        case 'documents': {
          return { granted: true, canAskAgain: true, status: 'granted' };
        }
        default:
          return { granted: false, canAskAgain: true, status: 'denied' };
      }
    } catch (error) {
      console.warn(`[PERMISSION SERVICE] Error checking ${type}:`, error);
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Launch OS system settings screen for application permissions.
   */
  static openAppSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings().catch(() => {
        Linking.openURL('package:com.uwo.ailegal');
      });
    }
  }
}
