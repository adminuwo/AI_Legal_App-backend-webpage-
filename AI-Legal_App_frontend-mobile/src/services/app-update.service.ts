/**
 * AI Legal Mobile - Centralized App Update Service
 * Handles native Google Play In-App Updates (Flexible & Immediate) for Android,
 * Apple App Store redirection for iOS, and backend config fetching.
 */

import { Platform, Linking } from 'react-native';
import { apiClient } from '@/api/client';
import { AppConfig } from '@/config';

export interface PlatformUpdateConfig {
  latestVersion: string;
  latestBuildNumber?: number;
  minimumSupportedVersion: string;
  updatePolicy: 'optional' | 'mandatory';
  title: string;
  message: string;
  storeUrl: string;
  enabled: boolean;
  releaseNotes?: string;
}

export interface AppUpdateConfigResponse {
  android: PlatformUpdateConfig;
  ios: PlatformUpdateConfig;
}

const DEFAULT_CONFIG: AppUpdateConfigResponse = {
  android: {
    latestVersion: AppConfig.version || '1.0.1',
    minimumSupportedVersion: '1.0.0',
    updatePolicy: 'optional',
    title: 'AI LEGAL™ Update Available',
    message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.uwo.ailegal',
    enabled: true,
    releaseNotes: 'General performance improvements and bug fixes.'
  },
  ios: {
    latestVersion: AppConfig.version || '1.0.1',
    minimumSupportedVersion: '1.0.0',
    updatePolicy: 'optional',
    title: 'AI LEGAL™ Update Available',
    message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
    storeUrl: 'https://apps.apple.com/app/ai-legal/id123456789',
    enabled: true,
    releaseNotes: 'General performance improvements and bug fixes.'
  }
};

export class AppUpdateService {
  /**
   * Fetches backend update configuration safely with fallback.
   */
  static async fetchUpdateConfig(): Promise<AppUpdateConfigResponse> {
    try {
      const response = await apiClient.get<{ success: boolean; config: AppUpdateConfigResponse }>('/app-update/config', {
        timeout: 8000,
      });

      if (response.data && response.data.success && response.data.config) {
        return response.data.config;
      }
      return DEFAULT_CONFIG;
    } catch (err: any) {
      console.warn('[AppUpdateService] Network/Backend update check failed, using safe fallback:', err?.message || err);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Initiates native Google Play In-App Update flow on Android (Flexible or Immediate).
   * Falls back gracefully to Play Store URL if native In-App Update API is unavailable.
   */
  static async startAndroidInAppUpdate(
    updateType: 'flexible' | 'immediate',
    fallbackStoreUrl: string
  ): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // Dynamically import sp-react-native-in-app-updates to prevent native crashes if build is unlinked
      const SpInAppUpdates = require('sp-react-native-in-app-updates');
      const inAppUpdates = new (SpInAppUpdates.default || SpInAppUpdates)();

      const IAUUpdateKind = SpInAppUpdates.IAUUpdateKind;
      const updateKind = updateType === 'immediate' ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

      const checkResult = await inAppUpdates.checkNeedsUpdate();

      if (checkResult && checkResult.shouldUpdate) {
        await inAppUpdates.startUpdate({
          updateType: updateKind,
        });
        return true;
      } else {
        // Fallback to store URL if checkResult indicates native in-app update is not applicable
        return await this.openStoreUrl(fallbackStoreUrl);
      }
    } catch (err: any) {
      console.warn('[AppUpdateService] Google Play In-App Update API unavailable, falling back to Play Store link:', err?.message || err);
      return await this.openStoreUrl(fallbackStoreUrl);
    }
  }

  /**
   * Safely opens the target Play Store or App Store URL using Linking.
   */
  static async openStoreUrl(targetUrl: string): Promise<boolean> {
    const defaultUrl =
      Platform.OS === 'android'
        ? 'https://play.google.com/store/apps/details?id=com.uwo.ailegal'
        : 'https://apps.apple.com/app/ai-legal/id123456789';

    const urlToOpen = (targetUrl && targetUrl.trim().startsWith('http')) ? targetUrl.trim() : defaultUrl;

    try {
      const canOpen = await Linking.canOpenURL(urlToOpen).catch(() => true);
      if (canOpen) {
        await Linking.openURL(urlToOpen);
        return true;
      } else {
        await Linking.openURL(defaultUrl);
        return true;
      }
    } catch (err: any) {
      console.warn('[AppUpdateService] Failed to open store URL:', err?.message || err);
      try {
        await Linking.openURL(defaultUrl);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
}
