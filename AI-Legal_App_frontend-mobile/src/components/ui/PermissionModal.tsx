/**
 * AI LEGAL™ Permission Modal
 * Consistent pre-permission explainer and blocked-state dialog
 * Compliant with Apple Guideline 5.1.1(iv) and Android runtime permission standards.
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { PermissionType, PERMISSION_CONFIGS } from '../../services/permission.service';

export interface PermissionModalProps {
  visible: boolean;
  type: PermissionType;
  mode: 'explainer' | 'blocked';
  onContinue: () => void;
  onCancel: () => void;
  onOpenSettings: () => void;
}

export function PermissionModal({
  visible,
  type,
  mode,
  onContinue,
  onCancel,
  onOpenSettings,
}: PermissionModalProps) {
  const config = PERMISSION_CONFIGS[type] || PERMISSION_CONFIGS.camera;

  const getTitle = () => {
    if (mode === 'blocked') {
      switch (type) {
        case 'camera':
          return 'Camera Access Required';
        case 'photos':
          return 'Photo Access Required';
        case 'microphone':
          return 'Microphone Access Required';
        default:
          return `${config.title} Required`;
      }
    }
    return config.title;
  };

  const getMessage = () => {
    if (mode === 'blocked') {
      switch (type) {
        case 'camera':
          return 'Camera access is currently turned off. You can enable it from your device settings to use this feature.';
        case 'photos':
          return 'Photo access is currently turned off. You can enable it from your device settings to use this feature.';
        case 'microphone':
          return 'Microphone access is currently turned off. You can enable it from your device settings to use this feature.';
        default:
          return `${config.title} is currently turned off. You can enable it from your device settings to use this feature.`;
      }
    }
    return config.shortDescription;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={mode === 'blocked' ? onCancel : onContinue}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Header Icon Emblem */}
          <View style={styles.iconCircle}>
            <Ionicons
              name={(mode === 'blocked' ? 'settings-outline' : config.iconName) as any}
              size={32}
              color="#C8A34D"
            />
          </View>

          {/* Title & Message */}
          <Text style={styles.dialogTitle}>{getTitle()}</Text>
          <Text style={styles.dialogMessage}>{getMessage()}</Text>

          {/* Action Buttons */}
          {mode === 'explainer' ? (
            <View style={styles.actionColumn}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onContinue}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#111111" style={{ marginLeft: 6 }} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onCancel}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.flexBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onOpenSettings}
              >
                <Ionicons name="settings-outline" size={15} color="#111111" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Open Settings</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200, 163, 77, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 163, 77, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionColumn: {
    width: '100%',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#C8A34D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexBtn: {
    flex: 1,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
