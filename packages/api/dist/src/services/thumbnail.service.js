"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ThumbnailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThumbnailService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs-extra");
const path = require("path");
const media_1 = require("../types/media");
const upload_config_1 = require("../config/upload.config");
let ThumbnailService = ThumbnailService_1 = class ThumbnailService {
    constructor() {
        this.logger = new common_1.Logger(ThumbnailService_1.name);
        this.config = upload_config_1.defaultUploadConfig;
    }
    async generateThumbnail(originalPath, filename, ticketId, options) {
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
        }
        catch (error) {
            this.logger.error(`Failed to generate thumbnail for ${filename}: ${error.message}`);
            throw error;
        }
    }
    async generateMultipleThumbnails(originalPath, filename, ticketId, sizes) {
        const results = {};
        for (const size of sizes) {
            try {
                const thumbnailPath = await this.generateThumbnail(originalPath, `${size.name}_${filename}`, ticketId, {
                    width: size.width,
                    height: size.height,
                    quality: size.quality || this.config.thumbnailSize.quality,
                    fit: size.fit || 'inside',
                });
                results[size.name] = thumbnailPath;
            }
            catch (error) {
                this.logger.error(`Failed to generate ${size.name} thumbnail for ${filename}: ${error.message}`);
            }
        }
        return results;
    }
    async regenerateThumbnail(media) {
        if (media.type !== media_1.MediaType.IMAGE) {
            throw new Error('Thumbnails can only be generated for images');
        }
        const uploadPath = process.env.UPLOAD_PATH || this.config.uploadPath;
        const originalPath = path.join(uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);
        if (!(await fs.pathExists(originalPath))) {
            throw new Error('Original file not found');
        }
        return this.generateThumbnail(originalPath, media.filename, media.ticketId || 'unknown');
    }
    async optimizeImage(inputPath, outputPath, options) {
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
        }
        catch (error) {
            this.logger.error(`Failed to optimize image ${inputPath}: ${error.message}`);
            throw error;
        }
    }
    async getImageMetadata(filePath) {
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
        }
        catch (error) {
            this.logger.error(`Failed to get metadata for ${filePath}: ${error.message}`);
            throw error;
        }
    }
    async batchGenerateThumbnails(ticketId) {
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
                }
                catch (error) {
                    this.logger.error(`Failed to generate thumbnail for ${file}: ${error.message}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to batch generate thumbnails for ticket ${ticketId}: ${error.message}`);
            throw error;
        }
    }
    async deleteThumbnails(ticketId, filename) {
        try {
            const uploadPath = process.env.UPLOAD_PATH || this.config.uploadPath;
            const thumbnailDir = path.join(uploadPath, 'tickets', ticketId, 'thumbnails');
            if (!(await fs.pathExists(thumbnailDir))) {
                return;
            }
            if (filename) {
                const thumbnailPath = path.join(thumbnailDir, filename);
                if (await fs.pathExists(thumbnailPath)) {
                    await fs.remove(thumbnailPath);
                }
            }
            else {
                await fs.remove(thumbnailDir);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete thumbnails: ${error.message}`);
            throw error;
        }
    }
};
exports.ThumbnailService = ThumbnailService;
exports.ThumbnailService = ThumbnailService = ThumbnailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ThumbnailService);
//# sourceMappingURL=thumbnail.service.js.map