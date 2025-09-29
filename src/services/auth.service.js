const firebaseService = require('./firebase.service');
const userModel = require('../models/user.model');
const jwtService = require('./jwt.service');
const TokenBlacklistService = require('./token-blacklist.service');
const { User, AuthResponse } = require('../shared-types/user');

class AuthService {
  constructor(config) {
    this.config = config;
    firebaseService.initialize(config);
    this.jwtService = new jwtService(config);
    this.tokenBlacklistService = new TokenBlacklistService(config);
  }

  async register(userData) {
    try {
      const existingUser = await userModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      const firebaseUser = await firebaseService.createUser(userData);

      const dbUser = await userModel.create({
        id: firebaseUser.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
        emailVerified: false,
      });

      const user = this.mapToUser(dbUser);
      const tokens = this.jwtService.generateAuthTokens(user);

      // Send email verification
      await firebaseService.sendEmailVerification(userData.email);

      return new AuthResponse(user, tokens.token, tokens.refreshToken);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Registration error:', error);
      }
      throw error;
    }
  }

  async login(credentials) {
    try {
      const firebaseUser = await firebaseService.getUserByEmail(credentials.email);
      if (!firebaseUser) {
        throw new Error('Invalid credentials');
      }

      if (firebaseUser.disabled) {
        throw new Error('Account is disabled');
      }

      const dbUser = await userModel.findById(firebaseUser.uid);
      if (!dbUser || !dbUser.is_active) {
        throw new Error('Account is inactive');
      }

      const user = this.mapToUser(dbUser);
      const tokens = this.jwtService.generateAuthTokens(user);

      return new AuthResponse(user, tokens.token, tokens.refreshToken);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Login error:', error);
      }
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const payload = this.jwtService.verifyToken(refreshToken);
      const dbUser = await userModel.findById(payload.uid);

      if (!dbUser || !dbUser.is_active) {
        throw new Error('User not found or inactive');
      }

      const user = this.mapToUser(dbUser);
      const tokens = this.jwtService.generateAuthTokens(user);

      return new AuthResponse(user, tokens.token, tokens.refreshToken);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Token refresh error:', error);
      }
      throw new Error('Invalid refresh token');
    }
  }

  async getCurrentUser(userId) {
    try {
      const dbUser = await userModel.findById(userId);
      if (!dbUser || !dbUser.is_active) {
        throw new Error('User not found or inactive');
      }

      return this.mapToUser(dbUser);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Get current user error:', error);
      }
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const dbUser = await userModel.update(userId, updates);
      return this.mapToUser(dbUser);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Update user profile error:', error);
      }
      throw error;
    }
  }

  async requestPasswordReset(email) {
    try {
      const resetLink = await firebaseService.generatePasswordResetLink(email);
      return { resetLink };
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Password reset request error:', error);
      }
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const users = await userModel.findAll();
      return users.map(user => this.mapToUser(user));
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Get all users error:', error);
      }
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const dbUser = await userModel.findById(userId);
      if (!dbUser) {
        throw new Error('User not found');
      }

      return this.mapToUser(dbUser);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Get user by ID error:', error);
      }
      throw error;
    }
  }

  async logout(token) {
    try {
      if (!token) {
        throw new Error('Token is required for logout');
      }

      // Decode token to get expiration time
      const decodedToken = this.jwtService.decodeToken(token);
      if (!decodedToken || !decodedToken.exp) {
        throw new Error('Invalid token format');
      }

      // Add token to blacklist
      const expiresAt = new Date(decodedToken.exp * 1000);
      await this.tokenBlacklistService.addToBlacklist(token, expiresAt);

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Logout error:', error);
      }
      throw error;
    }
  }

  async isTokenBlacklisted(token) {
    try {
      return await this.tokenBlacklistService.isBlacklisted(token);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error checking token blacklist:', error);
      }
      return false;
    }
  }

  async sendEmailVerification(email) {
    try {
      return await firebaseService.sendEmailVerification(email);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error sending email verification:', error);
      }
      throw error;
    }
  }

  mapToUser(dbUser) {
    return new User(
      dbUser.id,
      dbUser.email,
      dbUser.first_name,
      dbUser.last_name,
      dbUser.role,
      new Date(dbUser.created_at),
      new Date(dbUser.updated_at),
      dbUser.is_active
    );
  }
}

module.exports = AuthService;