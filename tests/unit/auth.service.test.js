const AuthService = require('../../src/services/auth.service');
const firebaseService = require('../../src/services/firebase.service');
const userModel = require('../../src/models/user.model');
const JwtService = require('../../src/services/jwt.service');

jest.mock('../../src/services/firebase.service');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/jwt.service');

const mockJwtService = {
  generateAuthTokens: jest.fn(),
  verifyToken: jest.fn(),
};

JwtService.mockImplementation(() => mockJwtService);

describe('AuthService', () => {
  let authService;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      jwtSecret: 'test-secret',
      jwtExpiration: '1h',
      refreshTokenExpiration: '7d',
      firebaseProjectId: 'test-project',
    };

    authService = new AuthService(mockConfig);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Tenant',
      };

      const mockFirebaseUser = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
      };

      const mockDbUser = {
        id: 'firebase-uid-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'Tenant',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      userModel.findByEmail.mockResolvedValue(null);
      firebaseService.createUser.mockResolvedValue(mockFirebaseUser);
      userModel.create.mockResolvedValue(mockDbUser);
      mockJwtService.generateAuthTokens.mockReturnValue({
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.register(mockUserData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(userModel.findByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(firebaseService.createUser).toHaveBeenCalledWith(mockUserData);
      expect(userModel.create).toHaveBeenCalledWith({
        id: mockFirebaseUser.uid,
        email: mockUserData.email,
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName,
        role: mockUserData.role,
        isActive: true,
        emailVerified: false,
      });
    });

    it('should throw error if user already exists', async () => {
      const mockUserData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Tenant',
      };

      userModel.findByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(authService.register(mockUserData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockFirebaseUser = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        disabled: false,
      };

      const mockDbUser = {
        id: 'firebase-uid-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'Tenant',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      firebaseService.getUserByEmail.mockResolvedValue(mockFirebaseUser);
      userModel.findById.mockResolvedValue(mockDbUser);
      mockJwtService.generateAuthTokens.mockReturnValue({
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login(mockCredentials);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid credentials', async () => {
      const mockCredentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      firebaseService.getUserByEmail.mockResolvedValue(null);

      await expect(authService.login(mockCredentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for disabled account', async () => {
      const mockCredentials = {
        email: 'disabled@example.com',
        password: 'password123',
      };

      const mockFirebaseUser = {
        uid: 'firebase-uid-123',
        email: 'disabled@example.com',
        disabled: true,
      };

      firebaseService.getUserByEmail.mockResolvedValue(mockFirebaseUser);

      await expect(authService.login(mockCredentials)).rejects.toThrow('Account is disabled');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockPayload = {
        uid: 'user-123',
        email: 'test@example.com',
        role: 'Tenant',
      };

      const mockDbUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'Tenant',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockJwtService.verifyToken.mockReturnValue(mockPayload);
      userModel.findById.mockResolvedValue(mockDbUser);
      mockJwtService.generateAuthTokens.mockReturnValue({
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.verifyToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwtService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user successfully', async () => {
      const mockDbUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'Tenant',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      userModel.findById.mockResolvedValue(mockDbUser);

      const result = await authService.getCurrentUser('user-123');

      expect(result).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw error if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(authService.getCurrentUser('nonexistent-id')).rejects.toThrow('User not found or inactive');
    });
  });
});