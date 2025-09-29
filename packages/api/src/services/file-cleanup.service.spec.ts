import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileCleanupService } from './file-cleanup.service';
import { MediaRepository } from '../repositories/media.repository';
import { Media, MediaType } from '../types/media';
import * as fs from 'fs-extra';

describe('FileCleanupService', () => {
  let service: FileCleanupService;
  let mediaRepository: jest.Mocked<MediaRepository>;
  let fsMock: jest.Mocked<typeof fs>;

  const mockMedia: Media = {
    id: 'test-id',
    filename: 'test-image.jpg',
    originalName: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    type: MediaType.IMAGE,
    context: 'TICKET_PHOTO' as any,
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
    } as any;

    fsMock = {
      pathExists: jest.fn(),
      remove: jest.fn(),
      readdir: jest.fn(),
      stat: jest.fn(),
      ensureDir: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileCleanupService,
        {
          provide: MediaRepository,
          useValue: mediaRepository,
        },
      ],
    }).compile();

    service = module.get<FileCleanupService>(FileCleanupService);

    // Mock fs-extra
    jest.doMock('fs-extra', () => fsMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupOrphanedFiles', () => {
    it('should clean up orphaned files', async () => {
      const mediaList = [mockMedia];
      mediaRepository.findAll.mockResolvedValue(mediaList);

      // Mock first file as missing, second as present
      fsMock.pathExists
        .mockResolvedValueOnce(false)  // first file missing
        .mockResolvedValueOnce(true);   // thumbnail present

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
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const oldMedia = { ...mockMedia, uploadedAt: oldDate };

      // Mock the private method to return old media
      jest.spyOn(service as any, 'getOldMediaRecords').mockResolvedValue([oldMedia]);

      const result = await service.cleanupOldFiles(30);

      expect(result.cleanedFiles).toBe(1);
      expect(mediaRepository.delete).toHaveBeenCalledWith('test-id');
    });

    it('should handle errors during old file cleanup', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const oldMedia = { ...mockMedia, uploadedAt: oldDate };
      jest.spyOn(service as any, 'getOldMediaRecords').mockResolvedValue([oldMedia]);

      // Mock file deletion to fail
      jest.spyOn(service as any, 'deleteMediaFiles').mockRejectedValue(new Error('Delete failed'));

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

      // Mock file stats - one old, one recent
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      fsMock.stat
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: recentDate });

      const result: any = { cleanedFiles: 0, errors: [] };
      await service['cleanupTempFiles'](result);

      expect(result.cleanedFiles).toBe(1);
      expect(fsMock.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during temp file cleanup', async () => {
      fsMock.pathExists.mockResolvedValue(true);
      fsMock.readdir.mockResolvedValue(['temp1.jpg']);
      fsMock.stat.mockRejectedValue(new Error('Stat error'));

      const result: any = { cleanedFiles: 0, errors: [] };
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

      // Mock disk scan
      jest.spyOn(service as any, 'scanDiskStorage').mockResolvedValue(undefined);

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
      fsMock.stat.mockResolvedValue({ size: 2048 }); // Different size

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

        expect(fsMock.remove).toHaveBeenCalledTimes(3); // original, thumbnail, compressed
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