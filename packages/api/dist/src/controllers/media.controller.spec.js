"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const media_controller_1 = require("./media.controller");
const file_upload_service_1 = require("../services/file-upload.service");
const media_repository_1 = require("../repositories/media.repository");
const media_1 = require("../types/media");
describe('MediaController', () => {
    let controller;
    let fileUploadService;
    let mediaRepository;
    let response;
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
    const mockUser = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
    };
    const mockRequest = {
        user: mockUser,
    };
    beforeEach(async () => {
        fileUploadService = {
            uploadFile: jest.fn(),
            uploadMultipleFiles: jest.fn(),
            deleteFile: jest.fn(),
            deleteFilesForTicket: jest.fn(),
        };
        mediaRepository = {
            findById: jest.fn(),
            findByTicketId: jest.fn(),
            findByContext: jest.fn(),
            getStorageStats: jest.fn(),
        };
        response = {
            sendFile: jest.fn(),
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [media_controller_1.MediaController],
            providers: [
                {
                    provide: file_upload_service_1.FileUploadService,
                    useValue: fileUploadService,
                },
                {
                    provide: media_repository_1.MediaRepository,
                    useValue: mediaRepository,
                },
            ],
        }).compile();
        controller = module.get(media_controller_1.MediaController);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('uploadFile', () => {
        it('should upload file successfully', async () => {
            fileUploadService.uploadFile.mockResolvedValue(mockMedia);
            const result = await controller.uploadFile(mockFile, 'ticket-123', media_1.MediaContext.TICKET_PHOTO, mockRequest);
            expect(result).toEqual(mockMedia);
            expect(fileUploadService.uploadFile).toHaveBeenCalledWith(mockFile, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO);
        });
        it('should throw error if no file provided', async () => {
            await expect(controller.uploadFile(null, 'ticket-123', media_1.MediaContext.TICKET_PHOTO, mockRequest)).rejects.toThrow('No file uploaded');
        });
        it('should throw error if ticket ID missing', async () => {
            await expect(controller.uploadFile(mockFile, null, media_1.MediaContext.TICKET_PHOTO, mockRequest)).rejects.toThrow('Ticket ID is required');
        });
        it('should throw error if context missing', async () => {
            await expect(controller.uploadFile(mockFile, 'ticket-123', null, mockRequest)).rejects.toThrow('Context is required');
        });
    });
    describe('uploadMultipleFiles', () => {
        it('should upload multiple files successfully', async () => {
            const files = [mockFile, { ...mockFile, originalname: 'test2.jpg' }];
            const mediaResults = [mockMedia, { ...mockMedia, id: 'test-id-2' }];
            fileUploadService.uploadMultipleFiles.mockResolvedValue(mediaResults);
            const result = await controller.uploadMultipleFiles(files, 'ticket-123', media_1.MediaContext.TICKET_PHOTO, mockRequest);
            expect(result).toEqual(mediaResults);
            expect(fileUploadService.uploadMultipleFiles).toHaveBeenCalledWith(files, 'ticket-123', 'user-123', media_1.MediaContext.TICKET_PHOTO);
        });
        it('should throw error if no files provided', async () => {
            await expect(controller.uploadMultipleFiles(null, 'ticket-123', media_1.MediaContext.TICKET_PHOTO, mockRequest)).rejects.toThrow('No files uploaded');
        });
    });
    describe('getFile', () => {
        it('should return file successfully', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            jest.spyOn(controller, 'fileExists').mockResolvedValue(true);
            await controller.getFile('test-id', mockRequest, response);
            expect(response.sendFile).toHaveBeenCalledWith('test-image.jpg', {
                root: expect.any(String),
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Content-Disposition': 'inline; filename="test.jpg"',
                    'Cache-Control': 'public, max-age=31536000',
                },
            });
        });
        it('should throw error if file not found', async () => {
            mediaRepository.findById.mockResolvedValue(null);
            await expect(controller.getFile('test-id', mockRequest, response)).rejects.toThrow('File not found');
        });
        it('should throw error if user lacks permission', async () => {
            const unauthorizedMedia = { ...mockMedia, uploadedBy: 'different-user' };
            mediaRepository.findById.mockResolvedValue(unauthorizedMedia);
            await expect(controller.getFile('test-id', mockRequest, response)).rejects.toThrow('permission');
        });
        it('should throw error if file not found on disk', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            jest.spyOn(controller, 'fileExists').mockResolvedValue(false);
            await expect(controller.getFile('test-id', mockRequest, response)).rejects.toThrow('File not found on disk');
        });
    });
    describe('getThumbnail', () => {
        it('should return thumbnail successfully', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            jest.spyOn(controller, 'fileExists').mockResolvedValue(true);
            await controller.getThumbnail('test-id', mockRequest, response);
            expect(response.sendFile).toHaveBeenCalledWith('test-image.jpg', {
                root: expect.any(String),
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=31536000',
                },
            });
        });
        it('should throw error for non-image files', async () => {
            const videoMedia = { ...mockMedia, type: media_1.MediaType.VIDEO };
            mediaRepository.findById.mockResolvedValue(videoMedia);
            await expect(controller.getThumbnail('test-id', mockRequest, response)).rejects.toThrow('Thumbnails are only available for images');
        });
        it('should return original image if thumbnail missing', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            jest.spyOn(controller, 'fileExists').mockResolvedValue(false);
            jest.spyOn(controller, 'getFile').mockResolvedValue(undefined);
            await controller.getThumbnail('test-id', mockRequest, response);
            expect(controller.getFile).toHaveBeenCalledWith('test-id', mockRequest, response);
        });
    });
    describe('getFilesByTicket', () => {
        it('should return files for ticket', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findByTicketId.mockResolvedValue(mediaList);
            const result = await controller.getFilesByTicket('ticket-123', mockRequest);
            expect(result).toEqual(mediaList);
        });
        it('should filter by context if provided', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findByContext.mockResolvedValue(mediaList);
            mediaRepository.findByTicketId.mockResolvedValue([mockMedia]);
            const result = await controller.getFilesByTicket('ticket-123', mockRequest, media_1.MediaContext.TICKET_PHOTO);
            expect(result).toEqual(mediaList);
            expect(mediaRepository.findByContext).toHaveBeenCalledWith(media_1.MediaContext.TICKET_PHOTO);
        });
        it('should throw error if user lacks access to ticket', async () => {
            const otherUserMedia = { ...mockMedia, uploadedBy: 'different-user' };
            mediaRepository.findByTicketId.mockResolvedValue([otherUserMedia]);
            await expect(controller.getFilesByTicket('ticket-123', mockRequest)).rejects.toThrow('You do not have access to this ticket');
        });
    });
    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            mediaRepository.findById.mockResolvedValue(mockMedia);
            const result = await controller.deleteFile('test-id', mockRequest);
            expect(result).toEqual({ message: 'File deleted successfully' });
            expect(fileUploadService.deleteFile).toHaveBeenCalledWith('test-id', 'user-123');
        });
        it('should throw error if file not found', async () => {
            mediaRepository.findById.mockResolvedValue(null);
            await expect(controller.deleteFile('test-id', mockRequest)).rejects.toThrow('File not found');
        });
    });
    describe('getStorageStats', () => {
        it('should return storage stats for admin', async () => {
            const adminUser = { ...mockUser, isAdmin: true };
            const adminRequest = { user: adminUser };
            const stats = {
                totalSize: 2048,
                totalFiles: 2,
                byType: { IMAGE: { count: 1, size: 1024 }, VIDEO: { count: 1, size: 1024 } },
            };
            mediaRepository.getStorageStats.mockResolvedValue(stats);
            const result = await controller.getStorageStats(adminRequest);
            expect(result).toEqual(stats);
        });
        it('should throw error for non-admin users', async () => {
            await expect(controller.getStorageStats(mockRequest)).rejects.toThrow('Admin access required');
        });
    });
    describe('private methods', () => {
        describe('validateAccess', () => {
            it('should allow access if user uploaded the file', async () => {
                await expect(controller.validateAccess(mockMedia, 'user-123')).resolves.toBeUndefined();
            });
            it('should throw error if user did not upload the file', async () => {
                await expect(controller.validateAccess(mockMedia, 'different-user')).rejects.toThrow('permission');
            });
        });
        describe('getFilePath', () => {
            it('should return correct file path', () => {
                const filePath = controller.getFilePath(mockMedia, 'original');
                expect(filePath).toBe('/var/lib/zariya/uploads/tickets/ticket-123/original/test-image.jpg');
            });
            it('should return thumbnail path if available', () => {
                const filePath = controller.getFilePath(mockMedia, 'thumbnail');
                expect(filePath).toBe(mockMedia.thumbnailPath);
            });
            it('should return compressed path if available', () => {
                const filePath = controller.getFilePath(mockMedia, 'compressed');
                expect(filePath).toBe(mockMedia.compressedPath);
            });
        });
    });
});
//# sourceMappingURL=media.controller.spec.js.map