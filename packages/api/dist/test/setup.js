"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv = require("dotenv");
dotenv.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'zariya_test';
process.env.UPLOAD_PATH = '/tmp/zariya/uploads/test';
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
global.beforeEach(() => {
    jest.clearAllMocks();
});
global.afterEach(() => {
    jest.clearAllMocks();
});
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
//# sourceMappingURL=setup.js.map