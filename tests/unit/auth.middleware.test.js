const request = require('supertest');
const express = require('express');
const authMiddleware = require('../../src/middleware/auth.middleware');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let app;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      jwtSecret: 'test-secret',
      jwtExpiration: '1h',
      refreshTokenExpiration: '7d',
    };

    app = express();
    app.use(express.json());
  });

  describe('requireAuth', () => {
    it('should allow access with valid token', async () => {
      const middleware = authMiddleware(mockConfig);
      const validToken = jwt.sign({ uid: 'user-123', email: 'test@example.com', role: 'Tenant' }, mockConfig.jwtSecret);

      app.get('/protected', middleware.requireAuth, (req, res) => {
        res.json({ success: true, user: req.user });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('uid', 'user-123');
    });

    it('should deny access without token', async () => {
      const middleware = authMiddleware(mockConfig);

      app.get('/protected', middleware.requireAuth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should deny access with invalid token', async () => {
      const middleware = authMiddleware(mockConfig);

      app.get('/protected', middleware.requireAuth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('requireRole', () => {
    it('should allow access with correct role', async () => {
      const middleware = authMiddleware(mockConfig);
      const validToken = jwt.sign({ uid: 'user-123', email: 'test@example.com', role: 'FMCHead' }, mockConfig.jwtSecret);

      app.get('/admin', middleware.requireRole(['FMCHead', 'Owner']), (req, res) => {
        res.json({ success: true, user: req.user });
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access with insufficient role', async () => {
      const middleware = authMiddleware(mockConfig);
      const validToken = jwt.sign({ uid: 'user-123', email: 'test@example.com', role: 'Tenant' }, mockConfig.jwtSecret);

      app.get('/admin', middleware.requireRole(['FMCHead', 'Owner']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });
  });
});