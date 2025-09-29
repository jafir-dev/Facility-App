require('dotenv').config();

const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiration: process.env.JWT_EXPIRATION || '1h',
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/facility_app',
  },
  firebase: {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  audit: {
    enabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
    logLevel: process.env.AUDIT_LOG_LEVEL || 'INFO',
    logDirectory: process.env.AUDIT_LOG_DIRECTORY || 'logs/audit',
  },
};

module.exports = config;