import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Media, MediaType } from '../types/media';
import { UploadConfig, defaultUploadConfig } from '../config/upload.config';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly config: UploadConfig;

  constructor() {
    this.config = defaultUploadConfig;
  }

  async generateThumbnail(
    originalPath: string,
    filename: string,
    ticketId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    },
  ): Promise<string> {
    try {
      const sharp = require('sharp');

      const thumbnailDir = path.join(path.dirname(originalPath), '..', 'thumbnails');
      await fs.ensureDir(thumbnailDir);

      const thumbnailPath = path.join(thumbnailDir, filename);

      const width = options?.width || this.config.thumbnailSize.width;
      const height = options?.height || this.config.thumbnailSize.height;
      const quality = options?.quality || this.config.thumbnailSize.quality;
      const fit = options?.fit || 'inside';

      await sharp(originalPath)
        .resize(width, height, { fit, withoutEnlargement: true })
        .jpeg({ quality })
        .toFile(thumbnailPath);

      this.logger.log(`Generated thumbnail for ${filename}`);
      return thumbnailPath;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail for ${filename}: ${error.message}`);
      throw error;
    }
  }

  async generateMultipleThumbnails(
    originalPath: string,
    filename: string,
    ticketId: string,
    sizes: Array<{
      name: string;
      width: number;
      height: number;
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }>,
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const size of sizes) {
      try {
        const thumbnailPath = await this.generateThumbnail(
          originalPath,
          `${size.name}_${filename}`,
          ticketId,
          {
            width: size.width,
            height: size.height,
            quality: size.quality || this.config.thumbnailSize.quality,
            fit: size.fit || 'inside',
          }
        );

        results[size.name] = thumbnailPath;
      } catch (error) {
        this.logger.error(`Failed to generate ${size.name} thumbnail for ${filename}: ${error.message}`);
      }
    }

    return results;
  }

  async regenerateThumbnail(media: Media): Promise<string> {
    if (media.type !== MediaType.IMAGE) {
      throw new Error('Thumbnails can only be generated for images');
    }

    const uploadPath = process.env.UPLOAD_PATH || this.config.uploadPath;
    const originalPath = path.join(uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);

    if (!(await fs.pathExists(originalPath))) {
      throw new Error('Original file not found');
    }

    return this.generateThumbnail(originalPath, media.filename, media.ticketId || 'unknown');
  }

  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    },
  ): Promise<void> {
    try {
      const sharp = require('sharp');

      const width = options?.width;
      const height = options?.height;
      const quality = options?.quality || this.config.compression.quality;
      const format = options?.format || 'jpeg';

      let pipeline = sharp(inputPath);

      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
      }

      await pipeline.toFile(outputPath);
      this.logger.log(`Optimized image: ${inputPath} -> ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to optimize image ${inputPath}: ${error.message}`);
      throw error;
    }
  }

  async getImageMetadata(filePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(filePath).metadata();

      const stats = await fs.stat(filePath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async batchGenerateThumbnails(ticketId: string): Promise<void> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || this.config.uploadPath;
      const ticketDir = path.join(uploadPath, 'tickets', ticketId, 'original');

      if (!(await fs.pathExists(ticketDir))) {
        this.logger.warn(`Ticket directory not found: ${ticketDir}`);
        return;
      }

      const files = await fs.readdir(ticketDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

      this.logger.log(`Generating thumbnails for ${imageFiles.length} images in ticket ${ticketId}`);

      for (const file of imageFiles) {
        try {
          const originalPath = path.join(ticketDir, file);
          await this.generateThumbnail(originalPath, file, ticketId);
        } catch (error) {
          this.logger.error(`Failed to generate thumbnail for ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to batch generate thumbnails for ticket ${ticketId}: ${error.message}`);
      throw error;
    }
  }

  async deleteThumbnails(ticketId: string, filename?: string): Promise<void> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || this.config.uploadPath;
      const thumbnailDir = path.join(uploadPath, 'tickets', ticketId, 'thumbnails');

      if (!(await fs.pathExists(thumbnailDir))) {
        return;
      }

      if (filename) {
        // Delete specific thumbnail
        const thumbnailPath = path.join(thumbnailDir, filename);
        if (await fs.pathExists(thumbnailPath)) {
          await fs.remove(thumbnailPath);
        }
      } else {
        // Delete all thumbnails for the ticket
        await fs.remove(thumbnailDir);
      }
    } catch (error) {
      this.logger.error(`Failed to delete thumbnails: ${error.message}`);
      throw error;
    }
  }
}