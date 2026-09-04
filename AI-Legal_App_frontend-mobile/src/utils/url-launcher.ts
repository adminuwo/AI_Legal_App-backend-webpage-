/**
 * AI Legal Mobile - Centralized URL Launcher Utility
 * Validates external URLs before opening to prevent phishing and unauthorized scheme redirection.
 */

import { Alert, Linking } from 'react-native';

/**
 * Validates and safely opens an external URL with user confirmation.
 */
export const openExternalUrl = async (url: string): Promise<boolean> => {
  if (!url || typeof url !== 'string') {
    Alert.alert('Invalid Link', 'The provided URL is empty or invalid.');
    return false;
  }

  const trimmedUrl = url.trim();

  // Allow mailto links directly
  if (trimmedUrl.startsWith('mailto:')) {
    try {
      await Linking.openURL(trimmedUrl);
      return true;
    } catch {
      Alert.alert('Error', 'Could not open mail client.');
      return false;
    }
  }

  // Reject dangerous schemes
  if (
    trimmedUrl.startsWith('javascript:') ||
    trimmedUrl.startsWith('file:') ||
    trimmedUrl.startsWith('data:')
  ) {
    Alert.alert('Blocked Link', 'Unsafe link scheme blocked for your security.');
    return false;
  }

  // Only permit HTTPS web links
  if (!trimmedUrl.startsWith('https://')) {
    Alert.alert('Insecure Link', 'Only secure HTTPS links can be opened.');
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const host = parsedUrl.hostname;

    return new Promise((resolve) => {
      Alert.alert(
        'External Link',
        `You are leaving AI Legal to visit:\n\n${host}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Open Link',
            onPress: async () => {
              try {
                await Linking.openURL(trimmedUrl);
                resolve(true);
              } catch (err) {
                Alert.alert('Error', 'Failed to open link in browser.');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (err) {
    Alert.alert('Invalid URL', 'The link format could not be parsed.');
    return false;
  }
};
