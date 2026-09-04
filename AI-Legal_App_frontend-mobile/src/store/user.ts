/**
 * AI Legal Mobile - User Profile State Store
 * Manages user metadata, settings, personalizations, and credit counts.
 */

import { create } from 'zustand';
import { UserProfile, UserPersonalizations, UserSettings } from '../types';
import { useLocalLanguageStore } from '../localization/i18n';

interface UserStoreState {
  profile: UserProfile | null;
  usageStatus: any | null;
  setProfile: (profile: UserProfile) => void;
  setUsageStatus: (usageStatus: any) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updatePersonalizations: (personalizations: Partial<UserPersonalizations>) => void;
  deductCredits: (amount: number) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserStoreState>((set) => ({
  profile: null,
  usageStatus: null,

  setProfile: (profile) => {
    const userLang = profile?.personalizations?.general?.language;
    if (userLang) {
      useLocalLanguageStore.getState().setLocalLanguage(userLang);
    }
    set({ profile });
  },
  setUsageStatus: (usageStatus) => set({ usageStatus }),

  updateSettings: (settings) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          settings: { ...state.profile.settings, ...settings },
        },
      };
    }),

  updatePersonalizations: (personalizations) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          personalizations: { ...state.profile.personalizations, ...personalizations },
        },
      };
    }),

  deductCredits: (amount) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          credits: Math.max(0, state.profile.credits - amount),
        },
      };
    }),

  clearProfile: () => set({ profile: null }),
}));
