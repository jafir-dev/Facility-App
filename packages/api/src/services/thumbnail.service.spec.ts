import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailService } from './thumbnail.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Media, MediaType } from '../types/media';

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  let fsMock: jest.Mocked<typeof fs>;
  let sharpMock: any;

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
    sharpMock = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
      metadata: jest.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' }),
    };

    fsMock = {
      ensureDir: jest.fn().mockResolvedValue(undefined),
      pathExists: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(undefined),
      readDir: jest.fn().mockResolvedValue(['test.jpg', 'test.png']),
      stat: jest.fn().mockResolvedValue({ size: 1024, isFile: () => true }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ThumbnailService],
    }).compile();

    service = module.get<ThumbnailService>(ThumbnailService);

    // Mock dependencies
    jest.doMock('sharp', () => () => sharpMock);
    jest.doMock('fs-extra', () => fsMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail successfully', async () => {
      const originalPath = '/path/to/original/test.jpg';
      const result = await service.generateThumbnail(originalPath, 'test.jpg', 'ticket-123');

      expect(result).toBe('/path/to/thumbnails/test.jpg');
      expect(fsMock.ensureDir).toHaveBeenCalled();
      expect(sharpMock.resize).toHaveBeenCalledWith(300, 300, { fit: 'inside', withoutEnlargement: true });
      expect(sharpMock.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(sharpMock.toFile).toHaveBeenCalled();
    });

    it('should generate thumbnail with custom options', async () => {
      const originalPath = '/path/to/original/test.jpg';
      await service.generateThumbnail(originalPath, 'test.jpg', 'ticket-123', {
        width: 200,
        height: 200,
        quality: 90,
        fit: 'cover',
      });

      expect(sharpMock.resize).toHaveBeenCalledWith(200, 200, { fit: 'cover', withoutEnlargement: true });
      expect(sharpMock.jpeg).toHaveBeenCalledWith({ quality: 90 });
    });

    it('should handle sharp errors gracefully', async () => {
      const originalPath = '/path/to/original/test.jpg';
      sharpMock.toFile.mockRejectedValue(new Error('Sharp error'));

      await expect(service.generateThumbnail(originalPath, 'test.jpg', 'ticket-123'))
        .rejects.toThrow('Sharp error');
    });
  });

  describe('generateMultipleThumbnails', () => {
    it('should generate multiple thumbnails', async () => {
      const originalPath = '/path/to/original/test.jpg';
      const sizes = [
        { name: 'small', width: 100, height: 100 },
        { name: 'medium', width: 300, height: 300 },
        { name: 'large', width: 600, height: 600 },
      ];

      const result = await service.generateMultipleThumbnails(
        originalPath,
        'test.jpg',
        'ticket-123',
        sizes
      );

      expect(result).toEqual({
        small: '/path/to/thumbnails/small_test.jpg',
        medium: '/path/to/thumbnails/medium_test.jpg',
        large: '/path/to/thumbnails/large_test.jpg',
      });

      expect(sharpMock.toFile).toHaveBeenCalledTimes(3);
    });

    it('should continue generating other thumbnails if one fails', async () => {
      const originalPath = '/path/to/original/test.jpg';
      const sizes = [
        { name: 'small', width: 100, height: 100 },
        { name: 'medium', width: 300, height: 300 },
      ];

      // Make the second thumbnail fail
      sharpMock.toFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed to generate medium thumbnail'));

      const result = await service.generateMultipleThumbnails(
        originalPath,
        'test.jpg',
        'ticket-123',
        sizes
      );

      expect(result).toEqual({
        small: '/path/to/thumbnails/small_test.jpg',
        // medium should be missing due to error
      });
    });
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      const inputPath = '/path/to/input.jpg';
      const outputPath = '/path/to/output.jpg';

      await service.optimizeImage(inputPath, outputPath);

      expect(sharpMock.resize).not.toHaveBeenCalled();
      expect(sharpMock.jpeg).toHaveBeenCalledWith({ quality: 85 });
      expect(sharpMock.toFile).toHaveBeenCalledWith(outputPath);
    });

    it('should optimize image with custom options', async () => {
      const inputPath = '/path/to/input.jpg';
      const outputPath = '/path/to/output.webp';

      await service.optimizeImage(inputPath, outputPath, {
        width: 800,
        height: 600,
        quality: 75,
        format: 'webp',
      });

      expect(sharpMock.resize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(sharpMock.webp).toHaveBeenCalledWith({ quality: 75 });
      expect(sharpMock.toFile).toHaveBeenCalledWith(outputPath);
    });
  });

  describe('getImageMetadata', () => {
    it('should return image metadata', async () => {
      const filePath = '/path/to/image.jpg';
      const metadata = await service.getImageMetadata(filePath);

      expect(metadata).toEqual({
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 1024,
      });

      expect(sharpMock.metadata).toHaveBeenCalled();
      expect(fsMock.stat).toHaveBeenCalledWith(filePath);
    });

    it('should handle metadata errors', async () => {
      const filePath = '/path/to/image.jpg';
      sharpMock.metadata.mockRejectedValue(new Error('Cannot read metadata'));

      await expect(service.getImageMetadata(filePath)).rejects.toThrow('Cannot read metadata');
    });
  });

  describe('batchGenerateThumbnails', () => {
    it('should generate thumbnails for all images in ticket directory', async () => {
      const ticketId = 'ticket-123';

      await service.batchGenerateThumbnails(ticketId);

      expect(fsMock.pathExists).toHaveBeenCalled();
      expect(fsMock.readDir).toHaveBeenCalled();
      expect(sharpMock.toFile).toHaveBeenCalledTimes(2); // 2 image files
    });

    it('should handle missing ticket directory', async () => {
      fsMock.pathExists.mockResolvedValue(false);
      const ticketId = 'ticket-123';

      await service.batchGenerateThumbnails(ticketId);

      expect(sharpMock.toFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteThumbnails', () => {
    it('should delete specific thumbnail', async () => {
      const ticketId = 'ticket-123';
      const filename = 'test.jpg';

      await service.deleteThumbnails(ticketId, filename);

      expect(fsMock.pathExists).toHaveBeenCalled();
      expect(fsMock.remove).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/tickets\/ticket-123\/thumbnails\/test\.jpg$/)
      );
    });

    it('should delete all thumbnails for ticket', async () => {
      const ticketId = 'ticket-123';

      await service.deleteThumbnails(ticketId);

      expect(fsMock.remove).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/tickets\/ticket-123\/thumbnails$/)
      );
    });

    it('should handle missing thumbnail directory', async () => {
      fsMock.pathExists.mockResolvedValue(false);
      const ticketId = 'ticket-123';

      await service.deleteThumbnails(ticketId);

      expect(fsMock.remove).not.toHaveBeenCalled();
    });
  });
});