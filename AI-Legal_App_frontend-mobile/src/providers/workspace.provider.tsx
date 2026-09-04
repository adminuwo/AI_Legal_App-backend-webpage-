import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { WorkspaceService } from '../services/workspace.service';

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'law_firm' | 'enterprise';
  role: string;
  badge: string;
  icon: string;
  isDefault: boolean;
  casesCount?: number;
  membersCount?: number;
  ownerInfo?: { userId?: string; name?: string; role?: string };
}

export interface TeamMember {
  id: string;
  _id?: string;
  userId: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  barCouncilNo?: string;
  stateBarCouncil?: string;
  avatar: string;
  role: string;
  department: string;
  permission: string;
  modules?: string[];
  status: 'Accepted' | 'Active' | 'Pending' | 'Suspended' | 'Removed';
  isOwner: boolean;
  joinedDate?: string | Date;
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  departmentsCount: number;
  departments: string[];
}

export interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  addWorkspace: (workspace: Partial<Workspace>) => void;
  hasMultipleWorkspaces: boolean;
  isLoadingWorkspace: boolean;
  syncWorkspaces: () => Promise<void>;
  members: TeamMember[];
  teamStats: TeamStats;
  refreshTeamMembers: (targetWorkspaceId?: string) => Promise<void>;
}

const DEFAULT_PERSONAL_WORKSPACE: Workspace = {
  id: 'personal_practice',
  name: 'Personal Practice',
  type: 'personal',
  role: 'Advocate / Owner',
  badge: 'Personal',
  icon: 'person-outline',
  isDefault: true,
  casesCount: 14,
};

const STORAGE_KEY = 'AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID';
const WORKSPACES_LIST_KEY = 'AI_LEGAL_JOINED_WORKSPACES_LIST';

import { useRoleStore } from '../store/role';

let globalActiveWorkspaceId = 'personal_practice';
let globalActiveWorkspaceType = 'personal';
export const getGlobalActiveWorkspaceId = () => globalActiveWorkspaceId;
export const getGlobalActiveWorkspaceType = () => {
  try {
    const role = useRoleStore.getState()?.selectedRole;
    if (role) return role;
  } catch (e) {}
  return globalActiveWorkspaceType || 'advocate';
};
export const setGlobalActiveWorkspaceType = (type: string) => {
  globalActiveWorkspaceType = type;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    DEFAULT_PERSONAL_WORKSPACE,
  ]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(DEFAULT_PERSONAL_WORKSPACE);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalMembers: 1,
    activeMembers: 1,
    pendingInvitations: 0,
    departmentsCount: 1,
    departments: ['General Practice'],
  });

  const refreshTeamMembers = useCallback(async (targetWorkspaceId?: string) => {
    const wsId = targetWorkspaceId || globalActiveWorkspaceId;
    if (!wsId) return;
    try {
      const res = await WorkspaceService.getWorkspaceMembers(wsId);
      if (res.success && Array.isArray(res.members)) {
        setMembers(res.members);
        if (res.stats) {
          setTeamStats(res.stats);
        }
      }
    } catch (err) {
      console.warn('[WorkspaceProvider] Failed to fetch team members:', err);
    }
  }, []);

  useEffect(() => {
    refreshTeamMembers(activeWorkspace.id);
  }, [activeWorkspace.id, refreshTeamMembers]);

  useEffect(() => {
    loadSavedWorkspaceState().then(() => {
      syncWorkspaces();
    });
  }, []);

  const syncWorkspaces = async () => {
    try {
      const res = await apiClient.get('/workspaces');
      if (res.data && res.data.success && Array.isArray(res.data.workspaces)) {
        const loadedList = res.data.workspaces.map((w: any) => {
          if (w.type === 'personal') {
            return { ...w, id: 'personal_practice' };
          }
          return { ...w, id: w.id || w._id };
        });
        setWorkspaces(loadedList);
        await AsyncStorage.setItem(WORKSPACES_LIST_KEY, JSON.stringify(loadedList));

        // Re-evaluate active workspace matching the new list or saved active workspace ID
        const savedActiveId = await AsyncStorage.getItem(STORAGE_KEY);
        const activeId = globalActiveWorkspaceId !== 'personal_practice' ? globalActiveWorkspaceId : (savedActiveId || 'personal_practice');
        const matched = loadedList.find((w: any) => w.id === activeId || w._id === activeId);
        const personalWs = loadedList.find((w: any) => w.id === 'personal_practice' || w.type === 'personal') || DEFAULT_PERSONAL_WORKSPACE;
        if (matched) {
          setActiveWorkspace(matched);
          globalActiveWorkspaceId = matched.id;
          globalActiveWorkspaceType = matched.type || 'personal';
        } else {
          setActiveWorkspace(personalWs);
          globalActiveWorkspaceId = personalWs.id;
          globalActiveWorkspaceType = personalWs.type || 'personal';
        }
      }
    } catch (err) {
      console.warn('[WorkspaceProvider] Failed to sync workspaces with backend:', err);
    }
  };

  const loadSavedWorkspaceState = async () => {
    try {
      setIsLoadingWorkspace(true);
      const savedListJson = await AsyncStorage.getItem(WORKSPACES_LIST_KEY);
      let loadedList = [DEFAULT_PERSONAL_WORKSPACE];
      
      if (savedListJson) {
        const parsed = JSON.parse(savedListJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedList = parsed;
        }
      }
      setWorkspaces(loadedList);

      const savedActiveId = await AsyncStorage.getItem(STORAGE_KEY);
      const savedRole = await AsyncStorage.getItem('user_selected_role');

      let workspaceToActive = loadedList[0]; // Default to personal workspace
      
      if (savedActiveId) {
        const matched = loadedList.find((w: Workspace) => w.id === savedActiveId);
        if (matched) {
          workspaceToActive = matched;
        }
      }

      // Reconcile role and workspace if mismatched
      if (savedRole) {
        if ((savedRole === 'advocate' || savedRole === 'student') && workspaceToActive.type !== 'personal') {
          // If the role is advocate or student, workspace must be personal
          workspaceToActive = loadedList.find((w: Workspace) => w.type === 'personal') || loadedList[0];
        } else if (savedRole === 'law_firm' && workspaceToActive.type === 'personal') {
          // If the role is law_firm, workspace must be a firm workspace
          workspaceToActive = loadedList.find((w: Workspace) => w.type !== 'personal') || loadedList[1] || loadedList[0];
        }
      } else {
        // If there's no saved role, we check the workspace type and set the default role accordingly
        const roleToSet = workspaceToActive.type === 'personal' ? 'advocate' : 'law_firm';
        await AsyncStorage.setItem('user_selected_role', roleToSet);
      }

      setActiveWorkspace(workspaceToActive);
      globalActiveWorkspaceId = workspaceToActive.id;
      globalActiveWorkspaceType = workspaceToActive.type || 'personal';
    } catch (e) {
      console.error('Failed to load workspace storage:', e);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) return;

    setActiveWorkspace(target);
    globalActiveWorkspaceId = target.id;
    globalActiveWorkspaceType = target.type || 'personal';
    try {
      await AsyncStorage.setItem(STORAGE_KEY, workspaceId);
      const roleToSet = target.type === 'personal' ? 'advocate' : 'law_firm';
      await AsyncStorage.setItem('user_selected_role', roleToSet);
      import('../store/subscription').then(({ useSubscriptionStore }) => {
        useSubscriptionStore.getState().fetchSubscriptionStatus();
      });
    } catch (e) {
      console.error('Failed to persist workspace ID:', e);
    }
  };

  const addWorkspace = async (newWsData: Partial<Workspace>) => {
    const newWs: Workspace = {
      id: newWsData.id || `ws_${Date.now()}`,
      name: newWsData.name || 'New Law Firm Workspace',
      type: newWsData.type || 'law_firm',
      role: newWsData.role || 'Member Advocate',
      badge: newWsData.badge || 'Law Firm',
      icon: newWsData.icon || 'business-outline',
      isDefault: false,
      casesCount: 0,
      membersCount: 1,
    };

    const updatedList = [...workspaces, newWs];
    setWorkspaces(updatedList);
    setActiveWorkspace(newWs);
    globalActiveWorkspaceId = newWs.id;

    try {
      await AsyncStorage.setItem(WORKSPACES_LIST_KEY, JSON.stringify(updatedList));
      await AsyncStorage.setItem(STORAGE_KEY, newWs.id);
    } catch (e) {
      console.error('Failed to save new workspace:', e);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        switchWorkspace,
        addWorkspace,
        hasMultipleWorkspaces: workspaces.length > 1,
        isLoadingWorkspace,
        syncWorkspaces,
        members,
        teamStats,
        refreshTeamMembers,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};

