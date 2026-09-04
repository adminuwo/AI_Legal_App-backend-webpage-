/**
 * AI Legal Mobile - Centralized App Update Provider
 * Manages version detection, backend configuration synchronization,
 * optional vs. mandatory update state, session cooldowns, and AppState triggers.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AppConfig } from '@/config';
import { compareVersions, isMandatoryUpdate, isUpdateAvailable } from '@/utils/version';
import { AppUpdateService, PlatformUpdateConfig } from '@/services/app-update.service';

export type UpdateState = 'idle' | 'checking' | 'upToDate' | 'optionalUpdate' | 'mandatoryUpdate' | 'updating' | 'error';

export interface AppUpdateContextValue {
  updateState: UpdateState;
  installedVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  updateTitle: string;
  updateMessage: string;
  storeUrl: string;
  releaseNotes?: string;
  isMandatory: boolean;
  isOptional: boolean;
  isModalVisible: boolean;
  checkForUpdates: (isManualCheck?: boolean) => Promise<void>;
  triggerUpdateFlow: () => Promise<void>;
  dismissOptionalUpdate: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export const AppUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const installedVersion = AppConfig.version || '1.0.1';

  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [latestVersion, setLatestVersion] = useState<string>(installedVersion);
  const [minimumSupportedVersion, setMinimumSupportedVersion] = useState<string>('1.0.0');
  const [updateTitle, setUpdateTitle] = useState<string>('AI LEGAL™ Update Available');
  const [updateMessage, setUpdateMessage] = useState<string>('A new version of AI LEGAL™ is available with improvements and bug fixes.');
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string | undefined>('');
  
  const [isMandatory, setIsMandatory] = useState<boolean>(false);
  const [isOptional, setIsOptional] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // Track session level optional update dismissal
  const optionalDismissedRef = useRef<boolean>(false);
  const lastTargetLatestRef = useRef<string>('');
  // Track ongoing update check to prevent concurrent loops
  const isCheckingRef = useRef<boolean>(false);
  // Track if user was routed to Store to re-check on app foreground
  const openedStoreRef = useRef<boolean>(false);

  const checkForUpdates = useCallback(async (isManualCheck = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setUpdateState('checking');

    try {
      const configRes = await AppUpdateService.fetchUpdateConfig();
      const platformConfig: PlatformUpdateConfig =
        Platform.OS === 'ios' ? configRes.ios : configRes.android;

      if (!platformConfig || !platformConfig.enabled) {
        setUpdateState('upToDate');
        setIsMandatory(false);
        setIsOptional(false);
        setIsModalVisible(false);
        isCheckingRef.current = false;
        return;
      }

      const targetLatest = platformConfig.latestVersion || installedVersion;
      const targetMin = platformConfig.minimumSupportedVersion || '1.0.0';
      const targetStoreUrl = platformConfig.storeUrl || '';
      const targetTitle = platformConfig.title || 'AI LEGAL™ Update Available';
      const targetMsg = platformConfig.message || 'A new version of AI LEGAL™ is available with improvements and bug fixes.';
      const policy = platformConfig.updatePolicy || 'optional';

      setLatestVersion(targetLatest);
      setMinimumSupportedVersion(targetMin);
      setStoreUrl(targetStoreUrl);
      setUpdateTitle(targetTitle);
      setUpdateMessage(targetMsg);
      setReleaseNotes(platformConfig.releaseNotes);

      // Reset session dismissal if a new version target is detected
      if (lastTargetLatestRef.current !== targetLatest) {
        optionalDismissedRef.current = false;
        lastTargetLatestRef.current = targetLatest;
      }

      const hasNewerVersion = isUpdateAvailable(installedVersion, targetLatest);
      const requiresMandatory = hasNewerVersion && (isMandatoryUpdate(installedVersion, targetMin) || policy === 'mandatory');

      if (requiresMandatory) {
        setUpdateState('mandatoryUpdate');
        setIsMandatory(true);
        setIsOptional(false);
        setIsModalVisible(true);
      } else if (hasNewerVersion) {
        setUpdateState('optionalUpdate');
        setIsMandatory(false);
        setIsOptional(true);

        // Show modal if user has not dismissed optional update for this version or if manual check
        if (!optionalDismissedRef.current || isManualCheck) {
          setIsModalVisible(true);
        }
      } else {
        setUpdateState('upToDate');
        setIsMandatory(false);
        setIsOptional(false);
        setIsModalVisible(false);
      }
    } catch (err: any) {
      console.warn('[AppUpdateProvider] Failed checking updates, ensuring app stability:', err?.message || err);
      setUpdateState('error');
      if (!isMandatory) {
        setIsModalVisible(false);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [installedVersion, isMandatory]);

  const triggerUpdateFlow = useCallback(async () => {
    setUpdateState('updating');
    openedStoreRef.current = true;

    if (!isMandatory) {
      optionalDismissedRef.current = true;
      setIsModalVisible(false);
    }

    if (Platform.OS === 'android') {
      const updateType = isMandatory ? 'immediate' : 'flexible';
      await AppUpdateService.startAndroidInAppUpdate(updateType, storeUrl);
    } else {
      await AppUpdateService.openStoreUrl(storeUrl);
    }
  }, [isMandatory, storeUrl]);

  const dismissOptionalUpdate = useCallback(() => {
    optionalDismissedRef.current = true;
    setIsModalVisible(false);
  }, []);

  // Initial check on boot
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // Listen to AppState transitions (active foregrounding & return from store)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextStatus: AppStateStatus) => {
      if (nextStatus === 'active') {
        openedStoreRef.current = false;
        checkForUpdates(true);
      }
    });

    return () => subscription.remove();
  }, [checkForUpdates]);

  const value: AppUpdateContextValue = {
    updateState,
    installedVersion,
    latestVersion,
    minimumSupportedVersion,
    updateTitle,
    updateMessage,
    storeUrl,
    releaseNotes,
    isMandatory,
    isOptional,
    isModalVisible,
    checkForUpdates,
    triggerUpdateFlow,
    dismissOptionalUpdate,
  };

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
};

export const useAppUpdate = (): AppUpdateContextValue => {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within an AppUpdateProvider');
  }
  return context;
};
