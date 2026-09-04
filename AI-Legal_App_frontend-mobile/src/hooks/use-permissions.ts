/**
 * AI Legal Mobile - usePermissions Custom Hook
 * Manages device runtime permissions requests and first-time permission onboarding state.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PermissionService, 
  PermissionType, 
  PermissionResult, 
  PERMISSION_CONFIGS, 
  PermissionDetails 
} from '../services/permission.service';

export type PermissionStatusMap = Record<PermissionType, PermissionResult['status']>;

export function usePermissions() {
  const [statuses, setStatuses] = useState<PermissionStatusMap>({
    camera: 'undetermined',
    microphone: 'undetermined',
    photos: 'undetermined',
    location: 'undetermined',
    notifications: 'undetermined',
    documents: 'granted',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  // Fetch current status of all permissions & onboarding completion state on mount
  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const completed = await PermissionService.hasCompletedOnboarding();
      setIsOnboardingCompleted(completed);

      const types: PermissionType[] = ['camera', 'microphone', 'photos', 'location', 'notifications', 'documents'];
      const updatedStatuses: Partial<PermissionStatusMap> = {};

      for (const type of types) {
        const res = await PermissionService.checkPermission(type);
        updatedStatuses[type] = res.status;
      }

      setStatuses(updatedStatuses as PermissionStatusMap);
    } catch (e) {
      console.error('[USE_PERMISSIONS] Error refreshing permission statuses', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const requestPermission = async (type: PermissionType): Promise<PermissionResult> => {
    const result = await PermissionService.requestPermission(type);
    setStatuses((prev) => ({
      ...prev,
      [type]: result.status,
    }));
    return result;
  };

  const markOnboardingComplete = async () => {
    await PermissionService.markOnboardingComplete();
    setIsOnboardingCompleted(true);
  };

  const resetOnboarding = async () => {
    await PermissionService.resetOnboardingStatus();
    setIsOnboardingCompleted(false);
    await refreshPermissions();
  };

  const openSettings = () => {
    PermissionService.openAppSettings();
  };

  return {
    statuses,
    isLoading,
    isOnboardingCompleted,
    refreshPermissions,
    requestPermission,
    markOnboardingComplete,
    resetOnboarding,
    openSettings,
    configs: PERMISSION_CONFIGS,
  };
}
