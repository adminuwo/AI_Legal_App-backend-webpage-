/**
 * Centralized Mobile App Ecosystem Configuration
 * Contains official store URLs, universal download URLs, and version fallback metadata.
 */

export const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL || "";

export const GOOGLE_PLAY_URL =
  import.meta.env.VITE_GOOGLE_PLAY_URL ||
  "https://play.google.com/store/apps/details?id=com.uwo.ailegal";

export const UNIVERSAL_DOWNLOAD_URL =
  import.meta.env.VITE_UNIVERSAL_DOWNLOAD_URL || GOOGLE_PLAY_URL;

export const MOBILE_APP_VERSION = "1.0.3";

export const isRealStoreUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('id123456789') || url.includes('123456789')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

export const CONNECTED_ECOSYSTEM_BENEFITS = [
  {
    id: "same-account",
    title: "Same AI LEGAL™ Account",
    description: "Sign in with the same credentials on Web and Mobile.",
    iconName: "UserCheck",
  },
  {
    id: "sync-workspace",
    title: "Synchronized Workspace",
    description: "Access your cases and legal workspace across supported platforms.",
    iconName: "Briefcase",
  },
  {
    id: "unified-subscription",
    title: "Unified Subscription",
    description: "Your active plan and subscription access remain synchronized.",
    iconName: "CreditCard",
  },
  {
    id: "sync-usage",
    title: "Synchronized Usage",
    description: "Feature usage and remaining limits are controlled centrally so usage on Web and Mobile stays consistent.",
    iconName: "RefreshCw",
  },
];
