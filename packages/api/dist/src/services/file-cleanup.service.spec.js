"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const file_cleanup_service_1 = require("./file-cleanup.service");
const media_repository_1 = require("../repositories/media.repository");
const media_1 = require("../types/media");
describe('FileCleanupService', () => {
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
        context: 'TICKET_PHOTO',
        ticketId: 'ticket-123',
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        thumbnailPath: '/path/to/thumbnail.jpg',
        compressedPath: '/path/to/compressed.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(async () => {
        mediaRepository = {
            findAll: jest.fn(),
            delete: jest.fn(),
            deleteByTicketId: jest.fn(),
            getStorageStats: jest.fn(),
        };
        fsMock = {
            pathExists: jest.fn(),
            remove: jest.fn(),
            readdir: jest.fn(),
            stat: jest.fn(),
            ensureDir: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                file_cleanup_service_1.FileCleanupService,
                {
                    provide: media_repository_1.MediaRepository,
                    useValue: mediaRepository,
                },
            ],
        }).compile();
        service = module.get(file_cleanup_service_1.FileCleanupService);
        jest.doMock('fs-extra', () => fsMock);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('cleanupOrphanedFiles', () => {
        it('should clean up orphaned files', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findAll.mockResolvedValue(mediaList);
            fsMock.pathExists
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);
            const result = await service.cleanupOrphanedFiles();
            expect(result.orphanedFiles).toBe(1);
            expect(result.cleanedFiles).toBe(1);
            expect(mediaRepository.delete).toHaveBeenCalledWith('test-id');
        });
        it('should handle errors during cleanup', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findAll.mockResolvedValue(mediaList);
            fsMock.pathExists.mockRejectedValue(new Error('File system error'));
            const result = await service.cleanupOrphanedFiles();
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Error checking file');
        });
    });
    describe('cleanupOldFiles', () => {
        it('should clean up old files', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            const oldMedia = { ...mockMedia, uploadedAt: oldDate };
            jest.spyOn(service, 'getOldMediaRecords').mockResolvedValue([oldMedia]);
            const result = await service.cleanupOldFiles(30);
            expect(result.cleanedFiles).toBe(1);
            expect(mediaRepository.delete).toHaveBeenCalledWith('test-id');
        });
        it('should handle errors during old file cleanup', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            const oldMedia = { ...mockMedia, uploadedAt: oldDate };
            jest.spyOn(service, 'getOldMediaRecords').mockResolvedValue([oldMedia]);
            jest.spyOn(service, 'deleteMediaFiles').mockRejectedValue(new Error('Delete failed'));
            const result = await service.cleanupOldFiles(30);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Error cleaning up');
        });
    });
    describe('deleteFilesForTicket', () => {
        it('should delete all files for a ticket', async () => {
            fsMock.pathExists.mockResolvedValue(true);
            await service.deleteFilesForTicket('ticket-123');
            expect(fsMock.remove).toHaveBeenCalledWith('/var/lib/zariya/uploads/tickets/ticket-123');
            expect(mediaRepository.deleteByTicketId).toHaveBeenCalledWith('ticket-123');
        });
        it('should handle missing ticket directory', async () => {
            fsMock.pathExists.mockResolvedValue(false);
            await service.deleteFilesForTicket('ticket-123');
            expect(fsMock.remove).not.toHaveBeenCalled();
            expect(mediaRepository.deleteByTicketId).toHaveBeenCalledWith('ticket-123');
        });
    });
    describe('cleanupTempFiles', () => {
        it('should clean up old temp files', async () => {
            fsMock.pathExists.mockResolvedValue(true);
            fsMock.readdir.mockResolvedValue(['temp1.jpg', 'temp2.jpg']);
            const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000);
            fsMock.stat
                .mockResolvedValueOnce({ mtime: oldDate })
                .mockResolvedValueOnce({ mtime: recentDate });
            const result = { cleanedFiles: 0, errors: [] };
            await service['cleanupTempFiles'](result);
            expect(result.cleanedFiles).toBe(1);
            expect(fsMock.remove).toHaveBeenCalledTimes(1);
        });
        it('should handle errors during temp file cleanup', async () => {
            fsMock.pathExists.mockResolvedValue(true);
            fsMock.readdir.mockResolvedValue(['temp1.jpg']);
            fsMock.stat.mockRejectedValue(new Error('Stat error'));
            const result = { cleanedFiles: 0, errors: [] };
            await service['cleanupTempFiles'](result);
            expect(result.errors).toHaveLength(1);
        });
    });
    describe('getStorageStats', () => {
        it('should return storage statistics', async () => {
            const dbStats = {
                totalSize: 2048,
                totalFiles: 2,
                byType: {
                    IMAGE: { count: 1, size: 1024 },
                    VIDEO: { count: 1, size: 1024 },
                },
            };
            mediaRepository.getStorageStats.mockResolvedValue(dbStats);
            jest.spyOn(service, 'scanDiskStorage').mockResolvedValue(undefined);
            const result = await service.getStorageStats();
            expect(result.totalSize).toBe(2048);
            expect(result.fileCount).toBe(2);
            expect(result.byType).toEqual(dbStats.byType);
        });
        it('should handle errors during storage stats calculation', async () => {
            mediaRepository.getStorageStats.mockRejectedValue(new Error('Database error'));
            await expect(service.getStorageStats()).rejects.toThrow('Database error');
        });
    });
    describe('validateStorage', () => {
        it('should validate storage successfully', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findAll.mockResolvedValue(mediaList);
            fsMock.pathExists.mockResolvedValue(true);
            fsMock.stat.mockResolvedValue({ size: 1024 });
            const result = await service.validateStorage();
            expect(result.validFiles).toBe(1);
            expect(result.invalidFiles).toBe(0);
            expect(result.missingFiles).toBe(0);
            expect(result.errors).toHaveLength(0);
        });
        it('should detect missing files', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findAll.mockResolvedValue(mediaList);
            fsMock.pathExists.mockResolvedValue(false);
            const result = await service.validateStorage();
            expect(result.missingFiles).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Missing file');
        });
        it('should detect size mismatches', async () => {
            const mediaList = [mockMedia];
            mediaRepository.findAll.mockResolvedValue(mediaList);
            fsMock.pathExists.mockResolvedValue(true);
            fsMock.stat.mockResolvedValue({ size: 2048 });
            const result = await service.validateStorage();
            expect(result.invalidFiles).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Size mismatch');
        });
    });
    describe('private methods', () => {
        describe('deleteMediaFiles', async () => {
            it('should delete all associated files', async () => {
                await service['deleteMediaFiles'](mockMedia);
                expect(fsMock.remove).toHaveBeenCalledTimes(3);
            });
            it('should continue deletion if some files fail', async () => {
                fsMock.remove
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('Delete failed'))
                    .mockResolvedValueOnce(undefined);
                await service['deleteMediaFiles'](mockMedia);
                expect(fsMock.remove).toHaveBeenCalledTimes(3);
            });
        });
        describe('getFilePath', () => {
            it('should return correct file path', () => {
                const filePath = service['getFilePath'](mockMedia);
                expect(filePath).toBe('/var/lib/zariya/uploads/tickets/ticket-123/original/test-image.jpg');
            });
            it('should handle missing ticket ID', () => {
                const mediaWithoutTicket = { ...mockMedia, ticketId: undefined };
                const filePath = service['getFilePath'](mediaWithoutTicket);
                expect(filePath).toBe('/var/lib/zariya/uploads/tickets/unknown/original/test-image.jpg');
            });
        });
    });
});
//# sourceMappingURL=file-cleanup.service.spec.js.map