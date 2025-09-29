const express = require('express');
const router = express.Router();

class UserRoutes {
  constructor(authService, authMiddleware) {
    this.authService = authService;
    this.authMiddleware = authMiddleware;
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Get all users (admin only)
    router.get(
      '/',
      this.authMiddleware.requireRole(['FMCHead', 'Owner']),
      this.getAllUsers.bind(this)
    );

    // Get user by ID (admin only)
    router.get(
      '/:id',
      this.authMiddleware.requireRole(['FMCHead', 'Owner']),
      this.getUserById.bind(this)
    );
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await this.authService.getAllUsers();
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await this.authService.getUserById(req.params.id);
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

  getRouter() {
    return router;
  }
}

module.exports = UserRoutes;