const jwt = require('jsonwebtoken');

const authMiddleware = (config) => {
  const JwtService = require('../services/jwt.service');
  const AuthService = require('../services/auth.service');
  const jwtService = new JwtService(config);

  // Only create auth service instance if not in test environment
  let authServiceInstance;
  if (process.env.NODE_ENV !== 'test') {
    authServiceInstance = new AuthService(config);
  }

  const authenticate = async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      // Check if token is blacklisted (only if authServiceInstance is available)
      let isBlacklisted = false;
      if (authServiceInstance) {
        isBlacklisted = await authServiceInstance.isTokenBlacklisted(token);
      }
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }

      const decoded = jwtService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const authorize = (roles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Access denied. User not authenticated.' });
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      next();
    };
  };

  const requireAuth = (req, res, next) => {
    authenticate(req, res, () => {
      authorize()(req, res, next);
    });
  };

  const requireRole = (roles) => {
    return (req, res, next) => {
      authenticate(req, res, () => {
        authorize(roles)(req, res, next);
      });
    };
  };

  return {
    authenticate,
    authorize,
    requireAuth,
    requireRole,
  };
};

module.exports = authMiddleware;