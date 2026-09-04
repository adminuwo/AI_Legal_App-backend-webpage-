import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * CaseWorkspaceState = {
 *    caseId,
 *    messages[],
 *    activeTool, // object: { id, name }
 *    uploadedDocs[],
 *    draftState,
 *    aiContext,
 *    uiState: { scrollPosition, ... },
 *    updatedAt
 * }
 */

const useCaseWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: {}, // { [caseId]: CaseWorkspaceState }
      activeCaseId: null,

      setActiveCaseId: (caseId) => set({ activeCaseId: caseId }),

      getWorkspace: (caseId) => {
        return get().workspaces[caseId] || null;
      },

      updateWorkspace: (caseId, updates) => {
        if (!caseId) return;
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [caseId]: {
              ...(state.workspaces[caseId] || {
                caseId,
                messages: [],
                activeTool: null,
                uploadedDocs: [],
                draftState: {},
                aiContext: {},
                uiState: { scrollPosition: 0 },
                updatedAt: Date.now()
              }),
              ...updates,
              updatedAt: Date.now()
            }
          }
        }));
      },

      saveMessage: (caseId, message) => {
        if (!caseId) return;
        set((state) => {
          const workspace = state.workspaces[caseId] || { messages: [] };
          return {
            workspaces: {
              ...state.workspaces,
              [caseId]: {
                ...workspace,
                messages: [...(workspace.messages || []), message],
                updatedAt: Date.now()
              }
            }
          };
        });
      },

      setMessages: (caseId, messages) => {
        if (!caseId) return;
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [caseId]: {
              ...(state.workspaces[caseId] || {}),
              messages,
              updatedAt: Date.now()
            }
          }
        }));
      },

      clearWorkspace: (caseId) => {
        set((state) => {
          const newWorkspaces = { ...state.workspaces };
          delete newWorkspaces[caseId];
          return { workspaces: newWorkspaces };
        });
      },

      restoreWorkspace: (caseId) => {
        const ws = get().workspaces[caseId];
        if (ws) {
          set({ activeCaseId: caseId });
          return ws;
        }
        return null;
      }
    }),
    {
      name: 'aisa-case-workspace-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useCaseWorkspaceStore;
