import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { MediaRepository } from '../repositories/media.repository';
import { Media, MediaContext, MediaType, FileUploadOptions } from '../types/media';
import { UploadConfig, defaultUploadConfig } from '../config/upload.config';
import { validateFileType } from '../utils/file-type.validator';
import { VirusScannerService } from './virus-scanner.service';

@Injectable()
export class FileUploadService {
  private readonly config: UploadConfig;

  constructor(
    @InjectRepository(MediaRepository)
    private readonly mediaRepository: MediaRepository,
    private readonly virusScannerService: VirusScannerService,
  ) {
    this.config = defaultUploadConfig;
  }

  async uploadFile(
    file: Express.Multer.File,
    ticketId: string,
    userId: string,
    context: MediaContext,
    options?: Partial<FileUploadOptions>,
  ): Promise<Media> {
    // Validate file
    this.validateFile(file, options);

    // Generate secure filename
    const filename = this.generateSecureFilename(file.originalname);

    // Determine file paths
    const filePaths = this.generateFilePaths(filename, ticketId);

    // Ensure directories exist
    await this.ensureDirectories(filePaths);

    // Perform virus scan if enabled
    const virusScanResult = await this.virusScannerService.scanFile(file.buffer, filename);
    if (!virusScanResult.isClean) {
      throw new BadRequestException(
        `File security scan failed. Threats detected: ${virusScanResult.threatsFound.join(', ')}`
      );
    }

    // Save original file
    await this.saveFile(file.buffer, filePaths.original);

    // Process file (thumbnails, compression)
    const processedPaths = await this.processFile(file, filePaths, options);

    // Save metadata to database
    const media = await this.mediaRepository.createMedia({
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: this.getFileType(file.mimetype),
      context,
      ticketId,
      uploadedBy: userId,
      uploadedAt: new Date(),
      thumbnailPath: processedPaths.thumbnail,
      compressedPath: processedPaths.compressed,
    });

    return media;
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    ticketId: string,
    userId: string,
    context: MediaContext,
    options?: Partial<FileUploadOptions>,
  ): Promise<Media[]> {
    if (files.length > this.config.maxFiles) {
      throw new BadRequestException(`Maximum ${this.config.maxFiles} files allowed`);
    }

    const uploadPromises = files.map(file =>
      this.uploadFile(file, ticketId, userId, context, options)
    );

    return Promise.all(uploadPromises);
  }

  async deleteFile(mediaId: string, userId: string): Promise<void> {
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      throw new BadRequestException('File not found');
    }

    // Check if user has permission to delete this file
    if (media.uploadedBy !== userId) {
      throw new UnauthorizedException('You do not have permission to delete this file');
    }

    // Delete physical files
    await this.deletePhysicalFiles(media);

    // Mark as inactive in database
    await this.mediaRepository.delete(mediaId);
  }

  async deleteFilesForTicket(ticketId: string): Promise<void> {
    const mediaList = await this.mediaRepository.findByTicketId(ticketId);

    // Delete all physical files
    const deletePromises = mediaList.map(media => this.deletePhysicalFiles(media));
    await Promise.all(deletePromises);

    // Mark all as inactive in database
    await this.mediaRepository.deleteByTicketId(ticketId);
  }

  private validateFile(file: Express.Multer.File, options?: Partial<FileUploadOptions>): void {
    const config = { ...this.config, ...options };

    // Check file size
    if (file.size > config.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.formatBytes(config.maxFileSize)}`
      );
    }

    // Check file type
    if (config.security.checkFileType) {
      const allowedTypes = options?.allowedTypes || config.allowedTypes;
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        );
      }

      // Validate file type using magic numbers to prevent MIME type spoofing
      if (!validateFileType(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          `File content does not match declared type ${file.mimetype}. Possible file type spoofing detected.`
        );
      }
    }
  }

  private generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const name = path.basename(originalName, ext);

    // Sanitize filename
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50);

    // Add random components for uniqueness
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');

    return `${sanitizedName}-${timestamp}-${random}${ext}`;
  }

  private generateFilePaths(filename: string, ticketId: string) {
    // Validate ticketId to prevent directory traversal
    if (!this.isValidTicketId(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    const basePath = path.join(this.config.uploadPath, 'tickets', ticketId);

    return {
      original: path.join(basePath, 'original', filename),
      thumbnail: path.join(basePath, 'thumbnails', filename),
      compressed: path.join(basePath, 'compressed', filename),
    };
  }

  private isValidTicketId(ticketId: string): boolean {
    // Allow alphanumeric, hyphens, and underscores, prevent path traversal
    return /^[a-zA-Z0-9_-]+$/.test(ticketId) && !ticketId.includes('..');
  }

  private async ensureDirectories(filePaths: { original: string; thumbnail: string; compressed: string }): Promise<void> {
    const directories = [
      path.dirname(filePaths.original),
      path.dirname(filePaths.thumbnail),
      path.dirname(filePaths.compressed),
    ];

    await Promise.all(
      directories.map(dir => fs.ensureDir(dir))
    );
  }

  private async saveFile(buffer: Buffer, filePath: string): Promise<void> {
    await fs.writeFile(filePath, buffer);
  }

  private async processFile(
    file: Express.Multer.File,
    filePaths: { original: string; thumbnail: string; compressed: string },
    options?: Partial<FileUploadOptions>,
  ): Promise<{ thumbnail?: string; compressed?: string }> {
    const result: { thumbnail?: string; compressed?: string } = {};
    const generateThumbnails = options?.generateThumbnails ?? true;
    const generateCompressed = options?.generateCompressed ?? this.config.compression.enabled;

    if (file.mimetype.startsWith('image/')) {
      // Import sharp dynamically to avoid issues if not installed
      const sharp = require('sharp');

      // Generate thumbnail
      if (generateThumbnails) {
        await sharp(file.buffer)
          .resize(this.config.thumbnailSize.width, this.config.thumbnailSize.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: this.config.thumbnailSize.quality })
          .toFile(filePaths.thumbnail);

        result.thumbnail = filePaths.thumbnail;
      }

      // Generate compressed version
      if (generateCompressed) {
        await sharp(file.buffer)
          .jpeg({ quality: this.config.compression.quality })
          .toFile(filePaths.compressed);

        result.compressed = filePaths.compressed;
      }
    }

    return result;
  }

  private getFileType(mimetype: string): MediaType {
    if (mimetype.startsWith('image/')) {
      return MediaType.IMAGE;
    } else if (mimetype.startsWith('video/')) {
      return MediaType.VIDEO;
    }
    throw new BadRequestException('Unsupported file type');
  }

  private async deletePhysicalFiles(media: Media): Promise<void> {
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

    // Delete files in parallel, ignore errors if files don't exist
    await Promise.allSettled(
      filesToDelete.map(filePath => fs.remove(filePath))
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}