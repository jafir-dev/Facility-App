require('dotenv').config({ path: '.env.test' });

// Mock database connection
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: () => ({
    createUser: jest.fn(),
    verifyIdToken: jest.fn(),
    getUserByEmail: jest.fn(),
    generatePasswordResetLink: jest.fn(),
    updateUser: jest.fn(),
  }),
  credential: {
    cert: jest.fn(),
  },
}));

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/facility_app_test';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
  process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
});

afterAll(() => {
  // Cleanup after all tests
});