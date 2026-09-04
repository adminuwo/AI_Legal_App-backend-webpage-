import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/store/subscription';
import { useThemeContext } from '@/providers';

interface ChatUsageAwarenessBannerProps {
  featureKey?: string;
  onLimitReachedStateChange?: (isReached: boolean) => void;
}

export const ChatUsageAwarenessBanner: React.FC<ChatUsageAwarenessBannerProps> = ({
  featureKey = 'ai_chat',
  onLimitReachedStateChange,
}) => {
  const router = useRouter();
  const { isDark } = useThemeContext();
  const subscription = useSubscriptionStore();
  const [dismissedMilestone, setDismissedMilestone] = useState<number | null>(null);

  // Fetch subscription status on mount if not loaded
  useEffect(() => {
    if (!subscription.plan || subscription.plan === 'FREE') {
      subscription.fetchSubscriptionStatus();
    }
  }, []);

  const plan = subscription.plan || 'FREE';
  const isUnlimited = plan === 'SUPER_ADMIN' || plan === 'ENTERPRISE' || plan === 'PREMIUM';

  const featureDetail = subscription.features?.[featureKey] || subscription.features?.['ai_chat'];
  const used = featureDetail?.used ?? 0;
  const limit = isUnlimited ? -1 : (featureDetail?.limit && featureDetail.limit > 0 ? featureDetail.limit : (plan === 'FREE' ? 100 : 300));

  const isFiniteLimit = limit > 0 && !isUnlimited;
  const remaining = isFiniteLimit ? Math.max(0, limit - used) : -1;
  const isLimitReached = isFiniteLimit && remaining <= 0;

  useEffect(() => {
    if (onLimitReachedStateChange) {
      onLimitReachedStateChange(isLimitReached);
    }
  }, [isLimitReached, onLimitReachedStateChange]);

  if (!isFiniteLimit || remaining < 0) {
    return null; // Premium / Unlimited users do not see chat limit banners
  }

  const usageRatio = used / limit;

  // Determine current milestone
  let milestone: 50 | 75 | 90 | 100 | null = null;
  if (used >= limit || remaining <= 0) {
    milestone = 100;
  } else if (usageRatio >= 0.9) {
    milestone = 90;
  } else if (usageRatio >= 0.75) {
    milestone = 75;
  } else if (usageRatio >= 0.5) {
    milestone = 50;
  }

  if (!milestone || (milestone < 90 && dismissedMilestone === milestone)) {
    return null;
  }

  const handleUpgradePress = () => {
    router.push('/(tabs)/profile/billing');
  };

  const percentUsed = Math.min(100, Math.round(usageRatio * 100));

  return (
    <View
      style={[
        styles.container,
        isDark ? styles.darkContainer : styles.lightContainer,
        milestone === 100 && styles.limitReachedBorder,
        milestone === 90 && styles.warningBorder,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={milestone === 100 ? 'alert-circle' : milestone === 90 ? 'warning' : 'sparkles'}
            size={18}
            color={milestone === 100 ? '#FF453A' : milestone === 90 ? '#FF9F0A' : '#C8A34D'}
          />
        </View>

        <View style={styles.textContainer}>
          {milestone === 100 ? (
            <>
              <Text style={[styles.titleText, isDark ? styles.darkText : styles.lightText]}>
                Monthly AI Chat Limit Reached
              </Text>
              <Text style={styles.subtextText}>
                Your chat allowance will reset at the start of your next usage cycle. Upgrade your plan to continue with higher usage limits.
              </Text>
            </>
          ) : milestone === 90 ? (
            <Text style={[styles.messageText, isDark ? styles.darkText : styles.lightText]}>
              You're close to your monthly AI chat limit. Only <Text style={styles.boldHighlight}>{remaining} chats</Text> remain. Upgrade for uninterrupted access.
            </Text>
          ) : milestone === 75 ? (
            <Text style={[styles.messageText, isDark ? styles.darkText : styles.lightText]}>
              You've used <Text style={styles.boldHighlight}>{percentUsed}%</Text> of your monthly AI chat allowance. Only <Text style={styles.boldHighlight}>{remaining} chats</Text> remain.
            </Text>
          ) : (
            <Text style={[styles.messageText, isDark ? styles.darkText : styles.lightText]}>
              You've used {used} of your {limit} monthly AI chats. <Text style={styles.boldHighlight}>{remaining} chats</Text> remain.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.upgradeButton, milestone === 100 && styles.primaryUpgradeButton]}
          onPress={handleUpgradePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.upgradeButtonText, milestone === 100 && styles.primaryUpgradeButtonText]}>
            Upgrade Plan
          </Text>
        </TouchableOpacity>

        {milestone < 90 && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => setDismissedMilestone(milestone)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={14} color={isDark ? '#8E8E93' : '#6E6E73'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  lightContainer: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E5EA',
  },
  darkContainer: {
    backgroundColor: '#1C1C1E',
    borderColor: '#2C2C2E',
  },
  limitReachedBorder: {
    borderColor: 'rgba(255, 69, 58, 0.4)',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
  },
  warningBorder: {
    borderColor: 'rgba(255, 159, 10, 0.4)',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtextText: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 14,
  },
  messageText: {
    fontSize: 11,
    lineHeight: 15,
  },
  lightText: {
    color: '#1C1C1E',
  },
  darkText: {
    color: '#F2F2F7',
  },
  boldHighlight: {
    fontWeight: '700',
    color: '#C8A34D',
  },
  upgradeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8A34D',
    backgroundColor: 'transparent',
    marginLeft: 4,
  },
  primaryUpgradeButton: {
    backgroundColor: '#C8A34D',
    borderColor: '#C8A34D',
  },
  upgradeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C8A34D',
  },
  primaryUpgradeButtonText: {
    color: '#000000',
  },
  dismissButton: {
    marginLeft: 6,
    padding: 2,
  },
});
