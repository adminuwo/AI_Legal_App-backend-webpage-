import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDynamicHostIp = (): string => {
  try {
    const hostUri = Constants.expoConfig?.hostUri 
      || (Constants as any).manifest?.debuggerHost 
      || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (e) {
    // fallback
  }
  return '192.168.29.184';
};

const getApiUrl = (): string => {
  const DEFAULT_PROD_API = 'https://ai-legal-app-backend-743928421487.asia-south1.run.app/api';
  const envUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_PROD_API;
  if (!__DEV__) {
    if (envUrl && !envUrl.startsWith('https://')) {
      console.warn('[Env] Non-HTTPS API URL rejected in release build. Enforcing secure HTTPS API endpoint.');
      return DEFAULT_PROD_API;
    }
    return envUrl;
  }

  const hostIp = getDynamicHostIp();
  const expoHost = Constants.expoConfig?.hostUri 
    || (Constants as any).manifest?.debuggerHost 
    || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  // Use dynamic host IP when running in Metro/Expo or when envUrl uses a local IP address
  if (expoHost || !envUrl || envUrl.includes('192.168.') || envUrl.includes('10.') || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    return `http://${hostIp}:8080/api`;
  }
  return envUrl;
};

const getPublicUrl = (): string => {
  const envAssetsUrl = process.env.EXPO_PUBLIC_ASSETS_URL;
  if (!__DEV__ && envAssetsUrl) {
    return envAssetsUrl;
  }

  const hostIp = getDynamicHostIp();
  const expoHost = Constants.expoConfig?.hostUri 
    || (Constants as any).manifest?.debuggerHost 
    || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (expoHost || !envAssetsUrl || envAssetsUrl.includes('192.168.') || envAssetsUrl.includes('10.') || envAssetsUrl.includes('localhost') || envAssetsUrl.includes('127.0.0.1')) {
    return `http://${hostIp}:8080`;
  }
  return envAssetsUrl;
};

export const Env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  API_URL: getApiUrl(),
  PUBLIC_URL: getPublicUrl(),
};

