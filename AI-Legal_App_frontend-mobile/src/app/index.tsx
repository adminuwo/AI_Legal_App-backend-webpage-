import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/auth';
import { StatusBar } from 'expo-status-bar';

import { PermissionService } from '@/services/permission.service';

const { width } = Dimensions.get('window');
const LOGO_SIZE = width * 0.6; // Clean, centered consolidated logo

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Animation values (from 0.96 scale to 1.00, and 0 opacity to 1)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    // Run subtle fade-in and scale-up animation in parallel over 600ms
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      if (isAuthenticated) {
        const hasCompletedPerms = await PermissionService.hasCompletedOnboarding();
        if (!hasCompletedPerms) {
          console.log('[SPLASH] Authenticated user without perms setup. Redirecting to permission onboarding...');
          router.replace('/permissions');
        } else {
          console.log('[SPLASH] Session active. Redirecting to dashboard...');
          router.replace('/(tabs)/dashboard');
        }
      } else {
        console.log('[SPLASH] Guest session detected. Redirecting to onboarding screens...');
        router.replace('/onboarding');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <Image
          source={require('../../assets/icons/new one spalsh screen.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure White
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});

