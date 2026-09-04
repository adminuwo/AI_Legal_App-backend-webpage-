import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '@/store/subscription';
import { useUserStore } from '@/store/user';
import { useThemeContext } from '@/providers/theme-provider';
import { Shadows } from '@/theme';

export const UpgradeModal = () => {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { isUpgradeModalOpen, upgradeFeatureName, closeUpgradeModal } = useSubscriptionStore();
  const profile = useUserStore((s) => s.profile);

  const handleNavigateToBilling = () => {
    closeUpgradeModal();
    router.push('/(tabs)/profile/billing');
  };

  // Convert key names to human readable features
  const getFeatureLabel = (featureKey: string) => {
    const map: Record<string, string> = {
      cases: 'My Matters limit',
      draft_maker: 'Draft Maker',
      court_prep: 'Court Prep Workspace',
      legal_precedent: 'Legal Precedent Search',
      evidence_analysis: 'Evidence Analysis',
      contract_review: 'Contract Review',
      strategy_engine: 'Strategy Engine',
      case_predictor: 'Case Predictor',
      mock_courtroom: 'AI Mock Courtroom',
      client_connect: 'AI Client Connect',
    };
    return map[featureKey] || featureKey.replace(/_/g, ' ');
  };

  const subscriptionPlan = useSubscriptionStore((s) => s.plan);
  const userPlan = (profile as any)?.plan || (profile as any)?.subscriptionPlan;
  const isEnterpriseOrAdmin =
    subscriptionPlan === 'ENTERPRISE' ||
    subscriptionPlan === 'SUPER_ADMIN' ||
    userPlan === 'ENTERPRISE' ||
    userPlan === 'enterprise' ||
    profile?.role === 'SUPER_ADMIN' ||
    (profile?.role as any) === 'ENTERPRISE';

  if (!isUpgradeModalOpen || isEnterpriseOrAdmin) return null;

  return (
    <Modal
      visible={isUpgradeModalOpen}
      transparent
      animationType="fade"
      onRequestClose={closeUpgradeModal}
    >
      <TouchableWithoutFeedback onPress={closeUpgradeModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.modal]}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2E224F' : '#F3EFFF' }]}>
                <Ionicons name="lock-closed" size={32} color="#C8A34D" />
              </View>
              
              <Text style={[styles.title, { color: theme.textPrimary }]}>Usage Limit Reached</Text>
              
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                You have used all free attempts for this feature. Upgrade your subscription to continue.
              </Text>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={closeUpgradeModal}
                  style={[styles.btn, styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Maybe Later</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleNavigateToBilling}
                  style={[styles.btn, styles.upgradeBtn, { backgroundColor: '#C8A34D' }]}
                >
                  <Text style={styles.upgradeText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  upgradeBtn: {},
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
