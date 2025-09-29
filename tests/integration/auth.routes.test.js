const request = require('supertest');
const createTestApp = require('../test-app');
const jwt = require('jsonwebtoken');

// Mock the AuthService
jest.mock('../../src/services/auth.service', () => ({
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  getCurrentUser: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const mockAuthService = require('../../src/services/auth.service');

describe('Auth Routes Integration', () => {
  let app;
  let validToken;

  beforeEach(() => {
    app = createTestApp(mockAuthService);
    jest.clearAllMocks();

    // Generate a valid JWT token for testing
    validToken = jwt.sign(
      { uid: 'user-123', email: 'test@example.com', role: 'Tenant' },
      'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Tenant',
      };

      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Tenant',
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should return validation error for invalid input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        role: 'InvalidRole',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      };

      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Tenant',
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toBe('Login successful');
    });

    it('should return error for invalid credentials', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Tenant',
      };

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Tenant',
        },
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toBe('Token refreshed successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const emailData = {
        email: 'test@example.com',
      };

      const mockResponse = {
        resetLink: 'https://example.com/reset-password?token=token',
      };

      mockAuthService.requestPasswordReset.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toBe('Password reset link sent successfully');
    });
  });
});