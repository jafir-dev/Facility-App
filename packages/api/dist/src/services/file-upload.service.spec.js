"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const file_upload_service_1 = require("./file-upload.service");
const media_repository_1 = require("../repositories/media.repository");
const media_1 = require("../types/media");
const file_type_validator_1 = require("../utils/file-type.validator");
describe('FileUploadService', () => {
    let service;
    let mediaRepository;
    let fsMock;
    const mockMedia = {
        id: 'test-id',
        filename: 'test-image.jpg',
        originalName: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        type: media_1.MediaType.IMAGE,
        context: media_1.MediaContext.TICKET_PHOTO,
        ticketId: 'ticket-123',
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        thumbnailPath: '/path/to/thumbnail.jpg',
        compressedPath: '/path/to/compressed.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test image content'),
        stream: {
            on: jest.fn(),
            pipe: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            removeAllListeners: jest.fn(),
            setMaxListeners: jest.fn(),
            getMaxListeners: jest.fn(),
            listeners: jest.fn(),
            rawListeners: jest.fn(),
            eventNames: jest.fn(),
            listenerCount: jest.fn(),
            prependListener: jest.fn(),
            prependOnceListener: jest.fn(),
        },
    };
    beforeEach(async () => {
        fsMock = {
            ensureDir: jest.fn(),
            writeFile: jest.fn(),
            pathExists: jest.fn(),
            remove: jest.fn(),
            access: jest.fn(),
            readDir: jest.fn(),
            stat: jest.fn(),
        };
        const mediaRepositoryMock = {
            createMedia: jest.fn().mockResolvedValue(mockMedia),
            findById: jest.fn().mockResolvedValue(mockMedia),
            delete: jest.fn().mockResolvedValue(undefined),
            deleteByTicketId: jest.fn().mockResolvedValue(undefined),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                file_upload_service_1.FileUploadService,
                {
                    provide: media_repository_1.MediaRepository,
                    useValue: mediaRepositoryMock,
                },
            ],
        }).compile();
        service = module.get(file_upload_service_1.FileUploadService);
        mediaRepository = module.get(media_repository_1.MediaRepository);
        jest.doMock('fs-extra', () => fsMock);
        jest.doMock('sharp', () => ({
            resize: jest.fn().mockReturnThis(),
            jpeg: jest.fn().mockReturnThis(),
            webp: jest.fn().mockReturnThis(),
            png: jest.fn().mockReturnThis(),
            toFile: jest.fn().mockResolvedValue(undefined),
            metadata: jest.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' }),
        }));
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('uploadFile', () => {
        it('should successfully upload a file', async () => {
            const result = await service.uploadFile(mockFile, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO);
            expect(result).toEqual(mockMedia);
            expect(mediaRepository.createMedia).toHaveBeenCalledWith(expect.objectContaining({
                filename: expect.stringContaining('test'),
                originalName: 'test.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                type: media_1.MediaType.IMAGE,
                context: media_1.MediaContext.TICKET_PHOTO,
                ticketId: 'ticket-123',
                uploadedBy: 'user-123',
            }));
        });
        it('should throw error for file too large', async () => {
            const largeFile = { ...mockFile, size: 100 * 1024 * 1024 };
            await expect(service.uploadFile(largeFile, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO)).rejects.toThrow('File size exceeds maximum limit');
        });
        it('should throw error for invalid file type', async () => {
            const invalidFile = { ...mockFile, mimetype: 'application/x-tar' };
            await expect(service.uploadFile(invalidFile, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO)).rejects.toThrow('File type application/x-tar is not allowed');
        });
        it('should generate secure filename', async () => {
            const dangerousFile = { ...mockFile, originalname: '../../../malicious.jpg' };
            await service.uploadFile(dangerousFile, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO);
            expect(mediaRepository.createMedia).toHaveBeenCalledWith(expect.objectContaining({
                filename: expect.not.stringContaining('../'),
            }));
        });
    });
    describe('uploadMultipleFiles', () => {
        it('should upload multiple files', async () => {
            const files = [mockFile, { ...mockFile, originalname: 'test2.jpg' }];
            const result = await service.uploadMultipleFiles(files, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO);
            expect(result).toHaveLength(2);
            expect(mediaRepository.createMedia).toHaveBeenCalledTimes(2);
        });
        it('should throw error for too many files', async () => {
            const files = Array(15).fill(mockFile);
            await expect(service.uploadMultipleFiles(files, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO)).rejects.toThrow('Maximum 10 files allowed');
        });
    });
    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            await service.deleteFile('test-id', 'user-123');
            expect(mediaRepository.delete).toHaveBeenCalledWith('test-id');
            expect(fsMock.remove).toHaveBeenCalledTimes(3);
        });
        it('should throw error if file not found', async () => {
            mediaRepository.findById.mockResolvedValue(null);
            await expect(service.deleteFile('test-id', 'user-123')).rejects.toThrow('File not found');
        });
        it('should throw error if user does not have permission', async () => {
            const unauthorizedMedia = { ...mockMedia, uploadedBy: 'different-user' };
            mediaRepository.findById.mockResolvedValue(unauthorizedMedia);
            await expect(service.deleteFile('test-id', 'user-123')).rejects.toThrow('permission');
        });
    });
    describe('deleteFilesForTicket', () => {
        it('should delete all files for a ticket', async () => {
            const mediaList = [mockMedia, { ...mockMedia, id: 'test-id-2' }];
            mediaRepository.findByTicketId.mockResolvedValue(mediaList);
            await service.deleteFilesForTicket('ticket-123');
            expect(mediaRepository.deleteByTicketId).toHaveBeenCalledWith('ticket-123');
            expect(fsMock.remove).toHaveBeenCalledTimes(6);
        });
    });
    describe('file validation', () => {
        it('should validate file type correctly', () => {
            expect(() => service['validateFile'](mockFile)).not.toThrow();
        });
        it('should reject invalid file types', () => {
            const invalidFile = { ...mockFile, mimetype: 'application/x-executable' };
            expect(() => service['validateFile'](invalidFile)).toThrow('not allowed');
        });
        it('should reject files that are too large', () => {
            const largeFile = { ...mockFile, size: 100 * 1024 * 1024 };
            expect(() => service['validateFile'](largeFile)).toThrow('exceeds maximum limit');
        });
    });
    describe('filename generation', () => {
        it('should generate secure filename with timestamp and random string', () => {
            const filename = service['generateSecureFilename']('test.jpg');
            expect(filename).toMatch(/^test-\d+-[a-f0-9]+\.jpg$/);
            expect(filename).not.toContain('../');
            expect(filename).not.toContain('..');
        });
        it('should sanitize dangerous characters', () => {
            const filename = service['generateSecureFilename']('../../../malicious.exe');
            expect(filename).toMatch(/^______________-\d+-[a-f0-9]+\.exe$/);
            expect(filename).not.toContain('../');
        });
    });
    describe('ticket ID validation', () => {
        it('should accept valid ticket IDs', () => {
            expect(service['isValidTicketId']('ticket-123')).toBe(true);
            expect(service['isValidTicketId']('ticket_123')).toBe(true);
            expect(service['isValidTicketId']('TICKET123')).toBe(true);
            expect(service['isValidTicketId']('123')).toBe(true);
        });
        it('should reject invalid ticket IDs', () => {
            expect(service['isValidTicketId']('ticket/../123')).toBe(false);
            expect(service['isValidTicketId']('ticket/123')).toBe(false);
            expect(service['isValidTicketId']('ticket..123')).toBe(false);
            expect(service['isValidTicketId']('../malicious')).toBe(false);
            expect(service['isValidTicketId']('ticket@123')).toBe(false);
            expect(service['isValidTicketId']('ticket#123')).toBe(false);
        });
    });
    describe('file path generation', () => {
        it('should generate correct file paths for valid ticket ID', () => {
            const filePaths = service['generateFilePaths']('test.jpg', 'ticket-123');
            expect(filePaths.original).toContain('/tickets/ticket-123/original/test.jpg');
            expect(filePaths.thumbnail).toContain('/tickets/ticket-123/thumbnails/test.jpg');
            expect(filePaths.compressed).toContain('/tickets/ticket-123/compressed/test.jpg');
        });
        it('should throw error for invalid ticket ID', () => {
            expect(() => {
                service['generateFilePaths']('test.jpg', '../malicious');
            }).toThrow('Invalid ticket ID');
        });
    });
    describe('magic number validation', () => {
        it('should validate JPEG files correctly', () => {
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
            expect((0, file_type_validator_1.validateFileType)(jpegBuffer, 'image/jpeg')).toBe(true);
        });
        it('should validate PNG files correctly', () => {
            const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            expect((0, file_type_validator_1.validateFileType)(pngBuffer, 'image/png')).toBe(true);
        });
        it('should reject files with spoofed MIME types', () => {
            const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
            expect((0, file_type_validator_1.validateFileType)(exeBuffer, 'image/jpeg')).toBe(false);
        });
    });
});
//# sourceMappingURL=file-upload.service.spec.js.map