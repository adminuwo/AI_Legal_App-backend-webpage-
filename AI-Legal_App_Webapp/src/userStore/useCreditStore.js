import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiService } from '../services/apiService';

/**
 * Global Credit Store
 * Manages current credits, transaction history, and syncing with backend.
 */
const useCreditStore = create(
  persist(
    (set, get) => ({
      currentCredits: 0,
      recentTransactions: [],
      isLoading: false,

      setCredits: (credits) => set({ currentCredits: credits }),

      // Sync credits from backend to global state
      syncCredits: async () => {
        try {
          const response = await apiService.getUserCredits();
          if (response.success) {
            set({ currentCredits: response.credits });
            
            // Update local user data as well
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.email) {
              user.credits = response.credits;
              localStorage.setItem('user', JSON.stringify(user));
            }
          }
          return response;
        } catch (error) {
          console.error("[CreditStore] Sync failed:", error);
          return { success: false };
        }
      },

      // Fetch transaction history
      fetchHistory: async () => {
        try {
          const response = await apiService.getCreditHistory();
          if (response.success) {
            set({ recentTransactions: response.logs || [] });
          }
          return response;
        } catch (error) {
          console.error("[CreditStore] Fetch history failed:", error);
          return { success: false };
        }
      },

      // Atomic deduction logic
      deductCredits: async (toolName, amount = 50, category = "AI Legal") => {
        try {
          set({ isLoading: true });
          const response = await apiService.deductCredits({
            amount,
            tool: toolName,
            category,
            description: `Used tool: ${toolName}`
          });

          if (response.success) {
            set((state) => ({
              currentCredits: response.credits,
              recentTransactions: [response.log, ...state.recentTransactions].slice(0, 50)
            }));

            // Sync with local storage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.email) {
              user.credits = response.credits;
              localStorage.setItem('user', JSON.stringify(user));
            }
            
            // Dispatch event for UI components not using this store
            window.dispatchEvent(new CustomEvent('credits_updated', { detail: response.credits }));
            
            return { success: true, credits: response.credits };
          }
          return response;
        } catch (error) {
          console.error("[CreditStore] Deduction failed:", error);
          const errorData = error.response?.data || {};
          return { 
            success: false, 
            code: errorData.code || 'ERROR',
            message: errorData.message || "Failed to deduct credits" 
          };
        } finally {
          set({ isLoading: false });
        }
      },

      addCredits: (amount) => set((state) => ({ currentCredits: state.currentCredits + amount })),

      // Add a single transaction to history manually (optional)
      addTransaction: (transaction) => set((state) => ({
        recentTransactions: [transaction, ...state.recentTransactions].slice(0, 50)
      }))
    }),
    {
      name: 'aisa-credits-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist credits and history
      partialize: (state) => ({ 
        currentCredits: state.currentCredits, 
        recentTransactions: state.recentTransactions 
      }),
    }
  )
);

export default useCreditStore;
