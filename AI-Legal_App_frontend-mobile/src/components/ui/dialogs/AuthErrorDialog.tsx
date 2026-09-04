import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableWithoutFeedback, 
  StyleProp, 
  ViewStyle, 
  Platform 
} from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { Button } from '../buttons';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { ParsedAuthError } from '@/utils/auth-error-mapper';

export interface AuthErrorDialogProps {
  visible: boolean;
  details: ParsedAuthError | null;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AuthErrorDialog: React.FC<AuthErrorDialogProps> = ({
  visible,
  details,
  onClose,
  style,
}) => {
  const { theme } = useThemeContext();

  if (!visible || !details) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay || 'rgba(11, 15, 25, 0.6)' }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[
              styles.dialogBox, 
              { 
                backgroundColor: theme.card || '#FFFFFF', 
                borderColor: theme.border || '#E2E8F0' 
              }, 
              Shadows.modal, 
              style
            ]}>
              {/* Corner Close Button */}
              <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.textSecondary || '#64748B'} />
                </View>
              </TouchableWithoutFeedback>

              {/* Icon Container */}
              <View style={styles.iconCircle}>
                <Ionicons name={details.icon as any} size={32} color="#EF4444" />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: theme.textPrimary || '#0F172A' }]}>
                {details.title}
              </Text>
              
              {/* Description */}
              <Text style={[styles.desc, { color: theme.textSecondary || '#475569' }]}>
                {details.description}
              </Text>

              {/* Actions Footer */}
              <View style={[styles.actionRow, details.secondaryLabel ? styles.actionRowCol : {}]}>
                {details.secondaryLabel && details.secondaryAction && (
                  <Button
                    title={details.secondaryLabel}
                    variant="outlined"
                    onPress={() => {
                      onClose();
                      details.secondaryAction?.();
                    }}
                    style={styles.secondaryBtn}
                  />
                )}
                <Button
                  title={details.primaryLabel || 'OK'}
                  variant="primary"
                  onPress={() => {
                    onClose();
                    details.primaryAction();
                  }}
                  style={details.secondaryLabel ? styles.primaryBtnCol : styles.primaryBtn}
                />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[24],
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: Radius.xl || 24,
    padding: Spacing[24],
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing[12],
    right: Spacing[12],
    padding: Spacing[8],
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[16],
    marginTop: Spacing[8],
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing[8],
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing[24],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing[12],
  },
  actionRowCol: {
    flexDirection: 'column',
    gap: Spacing[8],
  },
  primaryBtn: {
    flex: 1,
  },
  secondaryBtn: {
    width: '100%',
  },
  primaryBtnCol: {
    width: '100%',
  },
});
