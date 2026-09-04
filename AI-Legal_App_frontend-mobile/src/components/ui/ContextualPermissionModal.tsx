/**
 * AI Legal Mobile - Contextual Permission Modal
 * Reusable modal popped when a specific feature (Camera scan, Voice mic, Location search)
 * is triggered inside the app after onboarding.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { PermissionService, PERMISSION_CONFIGS, PermissionType } from '../../services/permission.service';

interface ContextualPermissionModalProps {
  visible: boolean;
  permissionType: PermissionType;
  onClose: () => void;
  onGranted: () => void;
  onDenied?: () => void;
}

export function ContextualPermissionModal({
  visible,
  permissionType,
  onClose,
  onGranted,
  onDenied,
}: ContextualPermissionModalProps) {
  const config = PERMISSION_CONFIGS[permissionType];
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!visible || !config) return null;

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      const res = await PermissionService.requestPermission(permissionType);
      setIsProcessing(false);

      if (res.granted) {
        onGranted();
        onClose();
      } else if (res.status === 'blocked') {
        setIsPermanentlyBlocked(true);
        onDenied?.();
      } else {
        onDenied?.();
        onClose();
      }
    } catch (e) {
      console.error('[CONTEXTUAL PERMISSION MODAL] Error:', e);
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#94A3B8" />
          </Pressable>

          {/* Emblem Icon */}
          <View style={styles.iconEmblem}>
            <Ionicons name={config.iconName as any} size={36} color="#C8A34D" />
          </View>

          {/* Title & Badge */}
          <Text style={styles.badgeText}>{config.badge}</Text>
          <Text style={styles.titleText}>{config.title}</Text>
          <Text style={styles.descText}>{config.shortDescription}</Text>

          {/* Feature Bullet Points */}
          <View style={styles.purposesBox}>
            {config.purposes.map((item, idx) => (
              <View key={idx} style={styles.purposeRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#C8A34D" style={{ marginRight: 8 }} />
                <Text style={styles.purposeText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Permanently Blocked Settings Option */}
          {isPermanentlyBlocked ? (
            <View style={styles.blockedBox}>
              <Text style={styles.blockedTitle}>Permission Permanently Denied</Text>
              <Text style={styles.blockedText}>
                Please grant {permissionType} permission in your device system settings to use this feature.
              </Text>
              <Pressable
                style={styles.openSettingsBtn}
                onPress={() => PermissionService.openAppSettings()}
              >
                <Ionicons name="settings-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.openSettingsBtnText}>Open Device Settings</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.primaryBtn, isProcessing && { opacity: 0.7 }]}
              onPress={handleAllow}
              disabled={isProcessing}
            >
              <Text style={styles.primaryBtnText}>Allow Access</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#151F32',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmblem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0B0F19',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 163, 77, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C8A34D',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  purposesBox: {
    width: '100%',
    backgroundColor: '#0B0F19',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purposeText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  blockedBox: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  blockedText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 10,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  openSettingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: '#C8A34D',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
