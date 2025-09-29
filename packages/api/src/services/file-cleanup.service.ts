import { Injectable, Logger, Cron, CronExpression } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs-extra';
import * as path from 'path';
import { MediaRepository } from '../repositories/media.repository';
import { Media } from '../types/media';
import { UploadConfig, defaultUploadConfig } from '../config/upload.config';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly config: UploadConfig;

  constructor(
    @InjectRepository(MediaRepository)
    private readonly mediaRepository: MediaRepository,
  ) {
    this.config = defaultUploadConfig;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOrphanedFiles(): Promise<CleanupResult> {
    const result: CleanupResult = {
      orphanedFiles: 0,
      cleanedFiles: 0,
      errors: [],
      startTime: new Date(),
    };

    try {
      this.logger.log('Starting orphaned files cleanup...');

      // Get all media records from database
      const mediaRecords = await this.mediaRepository.findAll();

      // Check each physical file
      for (const media of mediaRecords) {
        try {
          const filePath = this.getFilePath(media);
          const fileExists = await fs.pathExists(filePath);

          if (!fileExists) {
            result.orphanedFiles++;

            // Remove database record if file doesn't exist
            await this.mediaRepository.delete(media.id);
            result.cleanedFiles++;

            this.logger.log(`Cleaned up orphaned database record: ${media.filename}`);
          }
        } catch (error) {
          result.errors.push(`Error checking file ${media.filename}: ${error.message}`);
          this.logger.error(`Error checking file ${media.filename}: ${error.message}`);
        }
      }

      // Also clean up temporary files
      await this.cleanupTempFiles(result);

      result.endTime = new Date();
      this.logger.log(`Cleanup completed. Orphaned files: ${result.orphanedFiles}, Cleaned files: ${result.cleanedFiles}`);

      return result;
    } catch (error) {
      result.endTime = new Date();
      result.errors.push(`Cleanup failed: ${error.message}`);
      this.logger.error(`Cleanup failed: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async cleanupOldFiles(olderThanDays: number = 30): Promise<CleanupResult> {
    const result: CleanupResult = {
      orphanedFiles: 0,
      cleanedFiles: 0,
      errors: [],
      startTime: new Date(),
    };

    try {
      this.logger.log(`Starting cleanup of files older than ${olderThanDays} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get media records older than specified days
      const oldMedia = await this.getOldMediaRecords(cutoffDate);

      for (const media of oldMedia) {
        try {
          await this.deleteMediaFiles(media);
          await this.mediaRepository.delete(media.id);
          result.cleanedFiles++;

          this.logger.log(`Cleaned up old file: ${media.filename}`);
        } catch (error) {
          result.errors.push(`Error cleaning up ${media.filename}: ${error.message}`);
          this.logger.error(`Error cleaning up ${media.filename}: ${error.message}`);
        }
      }

      result.endTime = new Date();
      this.logger.log(`Old files cleanup completed. Cleaned files: ${result.cleanedFiles}`);

      return result;
    } catch (error) {
      result.endTime = new Date();
      result.errors.push(`Old files cleanup failed: ${error.message}`);
      this.logger.error(`Old files cleanup failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFilesForTicket(ticketId: string): Promise<void> {
    try {
      this.logger.log(`Deleting all files for ticket: ${ticketId}`);

      const ticketDir = path.join(this.config.uploadPath, 'tickets', ticketId);

      // Delete physical files
      if (await fs.pathExists(ticketDir)) {
        await fs.remove(ticketDir);
        this.logger.log(`Deleted ticket directory: ${ticketDir}`);
      }

      // Remove from database
      await this.mediaRepository.deleteByTicketId(ticketId);

      this.logger.log(`Successfully deleted all files for ticket: ${ticketId}`);
    } catch (error) {
      this.logger.error(`Failed to delete files for ticket ${ticketId}: ${error.message}`);
      throw error;
    }
  }

  async cleanupTempFiles(result?: CleanupResult): Promise<void> {
    try {
      const tempDir = path.join(this.config.uploadPath, 'temp');

      if (!(await fs.pathExists(tempDir))) {
        return;
      }

      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
            if (result) result.cleanedFiles++;
          }
        } catch (error) {
          if (result) result.errors.push(`Error cleaning temp file ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup temp files: ${error.message}`);
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const uploadPath = this.config.uploadPath;
      const stats: StorageStats = {
        totalSize: 0,
        fileCount: 0,
        byType: { IMAGE: 0, VIDEO: 0 },
        byTicket: {},
      };

      // Calculate from database for accuracy
      const dbStats = await this.mediaRepository.getStorageStats();
      stats.totalSize = dbStats.totalSize;
      stats.fileCount = dbStats.totalFiles;
      stats.byType = dbStats.byType;

      // Also scan disk for verification
      await this.scanDiskStorage(uploadPath, stats);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get storage stats: ${error.message}`);
      throw error;
    }
  }

  async validateStorage(): Promise<ValidationResult> {
    const result: ValidationResult = {
      validFiles: 0,
      invalidFiles: 0,
      missingFiles: 0,
      errors: [],
    };

    try {
      const mediaRecords = await this.mediaRepository.findAll();

      for (const media of mediaRecords) {
        try {
          const filePath = this.getFilePath(media);
          const fileExists = await fs.pathExists(filePath);

          if (!fileExists) {
            result.missingFiles++;
            result.errors.push(`Missing file: ${media.filename}`);
          } else {
            const stats = await fs.stat(filePath);
            if (stats.size !== media.size) {
              result.invalidFiles++;
              result.errors.push(`Size mismatch: ${media.filename} (DB: ${media.size}, Disk: ${stats.size})`);
            } else {
              result.validFiles++;
            }
          }
        } catch (error) {
          result.invalidFiles++;
          result.errors.push(`Error validating ${media.filename}: ${error.message}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Storage validation failed: ${error.message}`);
      throw error;
    }
  }

  private async getOldMediaRecords(cutoffDate: Date): Promise<Media[]> {
    // This would need to be implemented in the repository
    // For now, we'll filter in memory
    const allMedia = await this.mediaRepository.findAll();
    return allMedia.filter(media => media.uploadedAt < cutoffDate);
  }

  private async deleteMediaFiles(media: Media): Promise<void> {
    const basePath = path.join(this.config.uploadPath, 'tickets', media.ticketId || 'unknown');

    const filesToDelete = [
      path.join(basePath, 'original', media.filename),
    ];

    if (media.thumbnailPath) {
      filesToDelete.push(media.thumbnailPath);
    }

    if (media.compressedPath) {
      filesToDelete.push(media.compressedPath);
    }

    // Delete files in parallel
    await Promise.allSettled(
      filesToDelete.map(filePath => fs.remove(filePath).catch(() => {}))
    );
  }

  private getFilePath(media: Media): string {
    return path.join(this.config.uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);
  }

  private async scanDiskStorage(uploadPath: string, stats: StorageStats): Promise<void> {
    try {
      const ticketsDir = path.join(uploadPath, 'tickets');

      if (!(await fs.pathExists(ticketsDir))) {
        return;
      }

      const ticketDirs = await fs.readdir(ticketsDir);

      for (const ticketId of ticketDirs) {
        const ticketPath = path.join(ticketsDir, ticketId);
        const ticketStats = await this.scanTicketDirectory(ticketPath);

        if (ticketStats.totalSize > 0) {
          stats.byTicket[ticketId] = ticketStats;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan disk storage: ${error.message}`);
    }
  }

  private async scanTicketDirectory(ticketPath: string): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const subdirs = ['original', 'thumbnails', 'compressed'];

      for (const subdir of subdirs) {
        const dirPath = path.join(ticketPath, subdir);

        if (!(await fs.pathExists(dirPath))) {
          continue;
        }

        const files = await fs.readdir(dirPath);

        for (const file of files) {
          try {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);

            if (stats.isFile()) {
              totalSize += stats.size;
              fileCount++;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan ticket directory ${ticketPath}: ${error.message}`);
    }

    return { totalSize, fileCount };
  }
}

export interface CleanupResult {
  orphanedFiles: number;
  cleanedFiles: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

export interface StorageStats {
  totalSize: number;
  fileCount: number;
  byType: Record<string, { count: number; size: number }>;
  byTicket: Record<string, { totalSize: number; fileCount: number }>;
}

export interface ValidationResult {
  validFiles: number;
  invalidFiles: number;
  missingFiles: number;
  errors: string[];
}