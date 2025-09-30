import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });

          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock user data - in real app, this would come from API
            const mockUser: User = {
              id: '1',
              email,
              firstName: 'John',
              lastName: 'Supervisor',
              role: 'Supervisor' as UserRole,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Login failed',
            });
          }
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        },

        updateUser: (userData: Partial<User>) => {
          const { user } = get();
          if (user) {
            set({
              user: { ...user, ...userData },
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);