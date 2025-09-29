const express = require('express');
const router = express.Router();
const { validate, authValidation } = require('../middleware/validation.middleware');
const { authRateLimiters } = require('../middleware/rate-limit.middleware');

class AuthRoutes {
  constructor(authService, authMiddleware) {
    this.authService = authService;
    this.authMiddleware = authMiddleware;
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Register
    router.post(
      '/register',
      authRateLimiters.register,
      validate(authValidation.register),
      this.register.bind(this)
    );

    // Login
    router.post(
      '/login',
      authRateLimiters.login,
      validate(authValidation.login),
      this.login.bind(this)
    );

    // Refresh token
    router.post(
      '/refresh',
      validate(authValidation.refreshToken),
      this.refreshToken.bind(this)
    );

    // Get current user
    router.get(
      '/me',
      this.authMiddleware.requireAuth,
      this.getCurrentUser.bind(this)
    );

    // Update profile
    router.put(
      '/me',
      this.authMiddleware.requireAuth,
      validate(authValidation.updateProfile),
      this.updateProfile.bind(this)
    );

    // Password reset request
    router.post(
      '/forgot-password',
      authRateLimiters.passwordReset,
      validate(authValidation.passwordReset),
      this.forgotPassword.bind(this)
    );

    // Logout
    router.post(
      '/logout',
      this.authMiddleware.requireAuth,
      this.logout.bind(this)
    );

    // Resend email verification
    router.post(
      '/resend-verification',
      this.authMiddleware.requireAuth,
      this.resendEmailVerification.bind(this)
    );
  }

  async register(req, res, next) {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.authService.login(req.body);
      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await this.authService.refreshToken(req.body.refreshToken);
      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await this.authService.getCurrentUser(req.user.uid);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await this.authService.updateUserProfile(req.user.uid, req.body);
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await this.authService.requestPasswordReset(req.body.email);
      res.json({
        success: true,
        data: result,
        message: 'Password reset link sent successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const result = await this.authService.logout(token);

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async resendEmailVerification(req, res, next) {
    try {
      const user = await this.authService.getCurrentUser(req.user.uid);
      const result = await this.authService.sendEmailVerification(user.email);

      res.json({
        success: true,
        message: 'Email verification resent successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  getRouter() {
    return router;
  }
}

module.exports = AuthRoutes;