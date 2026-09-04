import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface UsageDetail {
  used: number;
  limit: number;
  remaining: number;
}

export interface StorageDetail {
  usedBytes: number;
  usedMB: number;
  usedGB: number;
  limitGB: number;
  remainingGB: number;
  percentage: number;
}

export interface SubscriptionState {
  plan: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE' | 'SUPER_ADMIN';
  badge: string;
  cases: UsageDetail;
  storage: StorageDetail;
  features: Record<string, UsageDetail>;
  isUpgradeModalOpen: boolean;
  upgradeFeatureName: string;
  loading: boolean;
  
  fetchSubscriptionStatus: () => Promise<void>;
  recordToolUsage: (featureName: string) => Promise<void>;
  triggerUpgradeModal: (featureName: string) => void;
  closeUpgradeModal: () => void;
  resetState: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'FREE',
  badge: 'Free',
  cases: { used: 0, limit: 3, remaining: 3 },
  storage: { usedBytes: 0, usedMB: 0, usedGB: 0, limitGB: 1, remainingGB: 1, percentage: 0 },
  features: {},
  isUpgradeModalOpen: false,
  upgradeFeatureName: '',
  loading: false,

  fetchSubscriptionStatus: async () => {
    set({ loading: true });
    try {
      const response = await apiClient.get<any>('/user/subscription');
      if (response.data && response.data.success) {
        console.log('💳 [SUBSCRIPTION STORE] Refetched status -> Plan:', response.data.plan, '| Cases Limit:', response.data.cases?.limit);
        set({
          plan: response.data.plan,
          badge: response.data.badge || (response.data.plan === 'FREE' ? 'Free' : response.data.plan),
          cases: response.data.cases,
          storage: response.data.storage || { usedBytes: 0, usedMB: 0, usedGB: 0, limitGB: 1, remainingGB: 1, percentage: 0 },
          features: response.data.features || {},
        });
      }
    } catch (err) {
      console.warn('[SUBSCRIPTION STORE] Fetch status failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  recordToolUsage: async (featureName: string) => {
    try {
      const response = await apiClient.post<any>('/subscription/record-usage', { featureKey: featureName });
      if (response.data && response.data.success) {
        await get().fetchSubscriptionStatus();
      }
    } catch (err) {
      console.warn('[SUBSCRIPTION STORE] Record usage failed:', err);
    }
  },

  triggerUpgradeModal: (featureName: string) => {
    const currentPlan = get().plan;
    if (currentPlan === 'ENTERPRISE' || currentPlan === 'SUPER_ADMIN') {
      console.log('[SUBSCRIPTION STORE] Suppressing upgrade modal for Enterprise/Admin plan');
      return;
    }
    set({ isUpgradeModalOpen: true, upgradeFeatureName: featureName });
  },

  closeUpgradeModal: () => {
    set({ isUpgradeModalOpen: false, upgradeFeatureName: '' });
  },

  resetState: () => {
    set({
      plan: 'FREE',
      badge: 'Free',
      cases: { used: 0, limit: 3, remaining: 3 },
      storage: { usedBytes: 0, usedMB: 0, usedGB: 0, limitGB: 1, remainingGB: 1, percentage: 0 },
      features: {},
      isUpgradeModalOpen: false,
      upgradeFeatureName: '',
    });
  }
}));
