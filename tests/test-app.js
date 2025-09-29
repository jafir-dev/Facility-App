const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createRateLimiter } = require('../src/middleware/rate-limit.middleware');
const AuthRoutes = require('../src/routes/auth.routes');
const UserRoutes = require('../src/routes/user.routes');
const authMiddleware = require('../src/middleware/auth.middleware');

const createTestApp = (mockAuthService) => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: '*',
    credentials: true,
  }));

  // Rate limiting
  app.use(createRateLimiter());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Mock config for middleware
  const mockConfig = {
    jwtSecret: 'test-secret',
    jwtExpiration: '1h',
    refreshTokenExpiration: '7d',
    firebaseProjectId: 'test-project',
  };

  const authMiddlewareInstance = authMiddleware(mockConfig);

  // Initialize routes with mock service
  const authRoutes = new AuthRoutes(mockAuthService, authMiddlewareInstance);
  const userRoutes = new UserRoutes(mockAuthService, authMiddlewareInstance);

  // API routes
  app.use('/api/auth', authRoutes.getRouter());
  app.use('/api/users', userRoutes.getRouter());

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
};

module.exports = createTestApp;