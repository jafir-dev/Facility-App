import { useAuthStore } from '@/store/auth-store';

// Test auth store actions
describe('AuthStore Actions', () => {
  let originalStore: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Store original store reference
    originalStore = useAuthStore.getState();
  });

  afterEach(() => {
    // Restore original store state
    if (originalStore) {
      useAuthStore.setState(originalStore);
    }
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Set error state
      useAuthStore.setState({ error: 'Test error message' });

      // Clear error
      useAuthStore.getState().clearError();

      // Verify error is cleared
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', () => {
      // Set initial logged in state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' } as any,
        isAuthenticated: true,
        error: 'Some error'
      });

      // Logout
      useAuthStore.getState().logout();

      // Verify logout worked
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data when user exists', () => {
      // Set initial user
      const initialUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Supervisor' as any,
        isActive: true,
      };
      useAuthStore.setState({ user: initialUser });

      // Update user
      const updateData = { firstName: 'Jane', lastName: 'Smith' };
      useAuthStore.getState().updateUser(updateData);

      // Verify user was updated
      expect(useAuthStore.getState().user).toEqual(
        expect.objectContaining({
          id: '1',
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'Supervisor',
          isActive: true,
        })
      );
    });

    it('should not update when user does not exist', () => {
      // Ensure no user is logged in
      useAuthStore.setState({ user: null });

      // Try to update
      useAuthStore.getState().updateUser({ firstName: 'Jane' });

      // Verify user is still null
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('login', () => {
    it('should handle loading states during login', async () => {
      const { login } = useAuthStore.getState();

      // Execute login (will use mock implementation from store)
      const loginPromise = login('test@example.com', 'password');

      // Check loading state during login
      expect(useAuthStore.getState().isLoading).toBe(true);

      await loginPromise;

      // Verify loading state is reset after completion
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});

describe('AuthStore State Management', () => {
  it('should maintain correct initial state', () => {
    const state = useAuthStore.getState();

    expect(state).toEqual(
      expect.objectContaining({
        user: expect.any(Object),
        isAuthenticated: expect.any(Boolean),
        isLoading: expect.any(Boolean),
        error: expect.any(Object),
      })
    );
  });

  it('should have all required actions', () => {
    const {
      login,
      logout,
      updateUser,
      clearError
    } = useAuthStore.getState();

    expect(typeof login).toBe('function');
    expect(typeof logout).toBe('function');
    expect(typeof updateUser).toBe('function');
    expect(typeof clearError).toBe('function');
  });
});