import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/apiService';
import { useRecoilValue } from 'recoil';
import { selectedRoleState } from '../userStore/userData';
import { initSocket, getSocket } from '../services/socketService';

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const selectedRole = useRecoilValue(selectedRoleState) || localStorage.getItem('user_selected_role') || 'advocate';
  const activeWsId = selectedRole === 'law_firm' 
    ? (localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'personal_practice') 
    : 'personal_practice';

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState({
    feature: '',
    title: 'Upgrade Your Plan',
    message: 'You have reached your plan limit for this feature.',
    used: 0,
    limit: 0,
    plan: 'FREE'
  });

  const isFetchingRef = useRef(false);

  const fetchSubscription = useCallback(async (targetWorkspace = selectedRole) => {
    const token = localStorage.getItem('token') || localStorage.getItem('user');
    if (!token) {
      setLoading(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      // Use apiService.get to include X-Workspace-Type and X-Active-Workspace-Id headers
      const res = await apiService.get(`/user/subscription?workspace=${targetWorkspace}&workspaceType=${targetWorkspace}&workspaceId=${activeWsId}`);
      const data = res?.data?.data || res?.data;
      if (data) {
        setSubscription(data);
        setError(null);
      }
    } catch (err) {
      console.warn('[SubscriptionContext] Failed to fetch subscription:', err);
      setError(err?.message || 'Failed to fetch subscription');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedRole, activeWsId]);

  // Re-fetch subscription on workspace/role change
  useEffect(() => {
    fetchSubscription(selectedRole);
  }, [selectedRole, activeWsId, fetchSubscription]);

  // Re-fetch subscription on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchSubscription(selectedRole);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedRole, fetchSubscription]);

  // Real-Time Socket.IO Listener for Cross-Platform Usage Sync (Web ↔ Mobile)
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('user');
    const userStr = localStorage.getItem('user');
    let userId = null;
    try {
      if (userStr) {
        const parsed = JSON.parse(userStr);
        userId = parsed?.id || parsed?._id;
      }
    } catch (e) {}

    if (!token) return;

    let socket = getSocket();
    if (!socket || !socket.connected) {
      socket = initSocket(token);
    }

    if (socket) {
      if (userId) socket.emit('join', userId);

      const handleUsageUpdated = (data) => {
        console.log('📡 [Web SubscriptionContext] Real-time feature_usage_updated received:', data);
        if (!data || !data.featureKey) return;
        const normKey = data.featureKey;
        const newUsed = data.usedCount;
        const newRemaining = data.remainingCount !== undefined ? data.remainingCount : data.remaining;

        // Update local storage cache
        try {
          localStorage.setItem(`AI_LEGAL_USAGE_${normKey}`, JSON.stringify({ used: newUsed, remaining: newRemaining }));
        } catch (e) {}

        // Update active subscription React state
        setSubscription((prevSub) => {
          if (!prevSub) return prevSub;
          const currentFeatures = prevSub.features || {};
          const oldFeat = currentFeatures[normKey] || {};
          return {
            ...prevSub,
            features: {
              ...currentFeatures,
              [normKey]: {
                ...oldFeat,
                used: newUsed,
                limit: data.limit || oldFeat.limit || 5,
                remaining: newRemaining
              }
            }
          };
        });
      };

      socket.on('feature_usage_updated', handleUsageUpdated);
      return () => {
        socket.off('feature_usage_updated', handleUsageUpdated);
      };
    }
  }, []);

  // Utility Methods
  const getFeatureUsage = useCallback((featureKey) => {
    const normKey = (featureKey || '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/-/g, '_')
      .trim();

    const defaultFreeLimits = {
      draft_maker: 2,
      argument_builder: 2,
      court_prep: 2,
      legal_precedent: 2,
      evidence_analysis: 2,
      contract_review: 2,
      strategy_engine: 2,
      case_predictor: 2,
      mock_courtroom: 1,
      client_connect: 1,
      notes_maker: 2,
      quiz_practice: 2,
      ai_chat: 50
    };

    const fallbackLimit = defaultFreeLimits[normKey] !== undefined ? defaultFreeLimits[normKey] : 2;

    let cachedUsage = null;
    try {
      const rawCache = localStorage.getItem(`AI_LEGAL_USAGE_${normKey}`);
      if (rawCache) cachedUsage = JSON.parse(rawCache);
    } catch (e) {}

    if (!subscription || !subscription.features) {
      const used = cachedUsage ? cachedUsage.used : 0;
      const remaining = cachedUsage ? cachedUsage.remaining : Math.max(0, fallbackLimit - used);
      return { used, limit: fallbackLimit, remaining };
    }

    const feat = subscription.features[normKey] || subscription.features[featureKey];
    if (feat) {
      const limit = feat.limit === undefined ? fallbackLimit : feat.limit;
      const used = Math.max(feat.used || 0, cachedUsage?.used || 0);
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      return {
        used,
        limit,
        remaining
      };
    }

    const used = cachedUsage ? cachedUsage.used : 0;
    const remaining = cachedUsage ? cachedUsage.remaining : Math.max(0, fallbackLimit - used);
    return { used, limit: fallbackLimit, remaining };
  }, [subscription]);

  const deductToolUsage = useCallback((featureKey) => {
    const normKey = (featureKey || '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/-/g, '_')
      .trim();

    setSubscription((prevSub) => {
      const currentSub = prevSub || {};
      const currentFeatures = currentSub.features || {};
      const currentFeat = currentFeatures[normKey] || { used: 0, limit: 2, remaining: 2 };

      const newUsed = (currentFeat.used || 0) + 1;
      const limit = currentFeat.limit !== undefined ? currentFeat.limit : 2;
      const newRemaining = limit === -1 ? -1 : Math.max(0, limit - newUsed);

      const updatedFeatures = {
        ...currentFeatures,
        [normKey]: {
          ...currentFeat,
          used: newUsed,
          remaining: newRemaining,
        }
      };

      try {
        localStorage.setItem(`AI_LEGAL_USAGE_${normKey}`, JSON.stringify({ used: newUsed, remaining: newRemaining }));
      } catch (e) {}

      return {
        ...currentSub,
        features: updatedFeatures
      };
    });

    try {
      apiService.post('/subscription/record-usage', { featureKey: normKey, workspaceType: selectedRole }).catch(() => {});
    } catch (e) {}
  }, [selectedRole]);

  const isFeatureAvailable = useCallback((featureKey) => {
    if (!subscription) return true;
    if (subscription.plan === 'SUPER_ADMIN') return true;
    const usage = getFeatureUsage(featureKey);
    if (usage.limit === -1) return true; // Unlimited
    if (usage.limit === 0) return false; // Locked
    return usage.remaining > 0;
  }, [subscription, getFeatureUsage]);

  const isFeatureLocked = useCallback((featureKey) => {
    if (!subscription) return false;
    if (subscription.plan === 'SUPER_ADMIN') return false;
    const usage = getFeatureUsage(featureKey);
    return usage.limit === 0;
  }, [subscription, getFeatureUsage]);

  const isFeatureLimitReached = useCallback((featureKey) => {
    if (!subscription) return false;
    if (subscription.plan === 'SUPER_ADMIN') return false;
    const usage = getFeatureUsage(featureKey);
    if (usage.limit === -1 || usage.limit === 0) return false;
    return usage.used >= usage.limit;
  }, [subscription, getFeatureUsage]);

  const triggerUpgradeModal = useCallback((data = {}) => {
    setUpgradeModalData(prev => ({
      ...prev,
      ...data,
      plan: subscription?.plan || 'FREE'
    }));
    setIsUpgradeModalOpen(true);
  }, [subscription]);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  const value = {
    subscription,
    plan: subscription?.plan || 'FREE',
    badge: subscription?.badge || 'Free',
    planDisplayName: subscription?.planDisplayName || 'AI Legal™ Free',
    cases: subscription?.cases || { used: 0, limit: 3, remaining: 3 },
    storage: subscription?.storage || { usedBytes: 0, usedMB: 0, usedGB: 0, limitGB: 1, remainingGB: 1, percentage: 0 },
    features: subscription?.features || {},
    loading,
    error,
    refreshSubscription: fetchSubscription,
    isFeatureAvailable,
    getFeatureUsage,
    deductToolUsage,
    isFeatureLocked,
    isFeatureLimitReached,
    isUpgradeModalOpen,
    upgradeModalData,
    triggerUpgradeModal,
    closeUpgradeModal
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
