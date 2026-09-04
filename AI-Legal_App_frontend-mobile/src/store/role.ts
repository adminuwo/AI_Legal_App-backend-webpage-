import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setGlobalActiveWorkspaceType } from '../providers/workspace.provider';
import { useSubscriptionStore } from './subscription';

export type UserRole = 'advocate' | 'student' | 'law_firm';

export interface RoleInfo {
  id: UserRole;
  label: string;
  icon: string;
  badge?: string;
  description: string;
}

export const ROLES: RoleInfo[] = [
  {
    id: 'advocate',
    label: 'Advocate',
    icon: '👨‍⚖️',
    description: 'Complete litigation workspace with all legal tools',
  },
  {
    id: 'student',
    label: 'Student',
    icon: '🎓',
    description: 'Learning-focused workspace & tutor',
  },
  {
    id: 'law_firm',
    label: 'Law Firm',
    icon: '🏛️',
    badge: 'Soon',
    description: 'Enterprise & multi-lawyer firm workspace',
  },
];

const ROLE_STORAGE_KEY = 'user_selected_role';

interface RoleState {
  selectedRole: UserRole;
  setRole: (role: UserRole) => Promise<void>;
  loadRole: () => Promise<void>;
}

export const useRoleStore = create<RoleState>((set) => ({
  selectedRole: 'advocate',
  setRole: async (role: UserRole) => {
    set({ selectedRole: role });
    setGlobalActiveWorkspaceType(role);
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch (err) {
      console.warn('[RoleStore] Failed to persist role:', err);
    }
    // Refetch subscription & feature limits for the newly selected workspace/role
    useSubscriptionStore.getState().fetchSubscriptionStatus();
  },
  loadRole: async () => {
    try {
      const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
      if (stored === 'advocate' || stored === 'student' || stored === 'law_firm') {
        set({ selectedRole: stored as UserRole });
        setGlobalActiveWorkspaceType(stored);
        useSubscriptionStore.getState().fetchSubscriptionStatus();
      }
    } catch (err) {
      console.warn('[RoleStore] Failed to load role:', err);
    }
  },
}));

// Auto-initialize role on import
useRoleStore.getState().loadRole();
