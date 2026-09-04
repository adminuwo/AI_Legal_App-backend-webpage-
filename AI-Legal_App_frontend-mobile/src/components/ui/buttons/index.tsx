/**
 * AI Legal Mobile - Button System
 * Highly customizable touch controls with robust variants, sizes, and accessibility bindings.
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  StyleProp,
  Animated,
  View,
} from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Typography, Opacity } from '@/theme';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outlined' 
  | 'ghost' 
  | 'text'
  | 'danger' 
  | 'success' 
  | 'warning';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  onPress: () => void;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  isFAB?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  isFAB = false,
}) => {
  const { theme } = useThemeContext();
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.timing(buttonOpacity, {
      toValue: 0.75,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: '#C8A34D',
            elevation: 0,
            shadowOpacity: 0,
          },
          text: { color: '#C8A34D', fontWeight: '700' },
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: theme.border,
          },
          text: { color: theme.textSecondary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: theme.primary },
        };
      case 'text':
        return {
          container: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, paddingHorizontal: Spacing[4] },
          text: { color: theme.primary, fontWeight: '500' },
        };
      case 'danger':
        return {
          container: { backgroundColor: theme.danger },
          text: { color: '#FFFFFF' },
        };
      case 'success':
        return {
          container: { backgroundColor: theme.success },
          text: { color: '#FFFFFF' },
        };
      case 'warning':
        return {
          container: { backgroundColor: theme.warning },
          text: { color: '#FFFFFF' },
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: '#C8A34D',
            elevation: 0,
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
          },
          text: { color: '#111111', fontWeight: '700' },
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    if (isFAB) {
      return {
        width: 56,
        height: 56,
        borderRadius: Radius.full,
        paddingHorizontal: 0,
        paddingVertical: 0,
        justifyContent: 'center',
        alignItems: 'center',
      };
    }

    switch (size) {
      case 'xs':
        return {
          height: 28,
          paddingHorizontal: Spacing[8],
          borderRadius: Radius.sm,
        };
      case 'sm':
        return {
          height: 36,
          paddingHorizontal: Spacing[12],
          borderRadius: Radius.sm,
        };
      case 'lg':
        return {
          height: 56,
          paddingHorizontal: Spacing[24],
          borderRadius: Radius.lg,
        };
      case 'xl':
        return {
          height: 64,
          paddingHorizontal: Spacing[32],
          borderRadius: Radius.xl,
        };
      case 'md':
      default:
        return {
          height: 48, // Touch target minimum size limit
          paddingHorizontal: Spacing[16],
          borderRadius: Radius.md,
        };
    }
  };

  const getTextSize = (): number => {
    switch (size) {
      case 'xs':
        return 11;
      case 'sm':
        return 13;
      case 'lg':
        return 16;
      case 'xl':
        return 18;
      case 'md':
      default:
        return 15;
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={{
        opacity: disabled ? Opacity.disabled : buttonOpacity,
        alignSelf: fullWidth || isFAB ? undefined : 'center',
        width: isFAB ? undefined : '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: loading }}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        hitSlop={size === 'xs' || size === 'sm' ? { top: 12, bottom: 12, left: 12, right: 12 } : undefined}
        style={({ pressed }) => [
          styles.base,
          variantStyles.container,
          sizeStyles,
          fullWidth && !isFAB ? styles.fullWidth : (isFAB ? {} : { width: '100%' }),
          pressed && variant === 'secondary' ? { backgroundColor: '#F5F5F5' } : {},
          style || {},
        ]}
        android_ripple={{ color: variant === 'outlined' || variant === 'ghost' || variant === 'text' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)' }}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={variantStyles.text.color || theme.primary} size="small" style={{ marginRight: 8 }} />
            {title && (
              <Text
                style={[
                  styles.text,
                  { fontSize: getTextSize() },
                  variantStyles.text,
                  textStyle || {},
                ]}
              >
                Loading...
              </Text>
            )}
          </View>
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {title && (
              <Text
                style={[
                  styles.text,
                  { fontSize: getTextSize() },
                  variantStyles.text,
                  icon && iconPosition === 'left' ? { marginLeft: Spacing[8] } : {},
                  icon && iconPosition === 'right' ? { marginRight: Spacing[8] } : {},
                  textStyle || {},
                ]}
              >
                {title}
              </Text>
            )}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  text: {
    fontFamily: Typography.button.fontFamily,
    fontWeight: Typography.button.fontWeight as any,
    letterSpacing: Typography.button.letterSpacing,
  },
});
