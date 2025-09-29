require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { createRateLimiter } = require('./middleware/rate-limit.middleware');
const auditLogger = require('./middleware/audit-logger.middleware');
const AuthService = require('./services/auth.service');
const AuthRoutes = require('./routes/auth.routes');
const UserRoutes = require('./routes/user.routes');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true,
}));

// Rate limiting
app.use(createRateLimiter());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit logging
app.use(auditLogger(config.audit));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Initialize services
const authService = new AuthService(config.auth);
const authMiddlewareInstance = authMiddleware(config.auth);

// Initialize routes
const authRoutes = new AuthRoutes(authService, authMiddlewareInstance);
const userRoutes = new UserRoutes(authService, authMiddlewareInstance);

// API routes
app.use('/api/auth', authRoutes.getRouter());
app.use('/api/users', userRoutes.getRouter());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
const PORT = config.app.port;
app.listen(PORT, () => {
  console.log(`🚀 Authentication server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

module.exports = app;