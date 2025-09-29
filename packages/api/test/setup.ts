import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'zariya_test';
process.env.UPLOAD_PATH = '/tmp/zariya/uploads/test';

// Mock external dependencies
jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  pathExists: jest.fn(),
  remove: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
    }),
  }));
  return mockSharp;
});

// Setup global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});

global.afterEach(() => {
  jest.clearAllMocks();
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};