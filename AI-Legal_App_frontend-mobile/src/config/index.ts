/**
 * AI Legal Mobile - Centralized Application Configurations
 * Combines environments, feature toggles, and metadata flags.
 */

import Constants from 'expo-constants';
import { Env } from './env';
import { DefaultFeatureFlags } from '../constants/app-constants';

const getInstalledVersion = (): string => {
  return Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.1';
};

export const AppConfig = {
  appName: 'AI LEGAL™ Mobile',
  version: getInstalledVersion(),
  apiTimeoutMs: 120000,
  apiUrl: Env.API_URL,
  publicAssetsUrl: Env.PUBLIC_URL,
  isDevelopment: Env.isDev,
  isProduction: Env.isProd,

  // App capabilities toggle
  features: {
    ...DefaultFeatureFlags,
    // Environment specific overrides
    enableOfflineMode: !Env.isDev, // Enable in prod or staging
  },

  // Cache configuration settings
  offlineStorageKeyPrefix: 'ai_legal_db_v1:',
  maxCachedMessagesCount: 50,
} as const;

export type AppConfiguration = typeof AppConfig;
