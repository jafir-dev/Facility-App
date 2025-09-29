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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const media_repository_1 = require("../repositories/media.repository");
const media_1 = require("../types/media");
const upload_config_1 = require("../config/upload.config");
const file_type_validator_1 = require("../utils/file-type.validator");
const virus_scanner_service_1 = require("./virus-scanner.service");
let FileUploadService = class FileUploadService {
    constructor(mediaRepository, virusScannerService) {
        this.mediaRepository = mediaRepository;
        this.virusScannerService = virusScannerService;
        this.config = upload_config_1.defaultUploadConfig;
    }
    async uploadFile(file, ticketId, userId, context, options) {
        this.validateFile(file, options);
        const filename = this.generateSecureFilename(file.originalname);
        const filePaths = this.generateFilePaths(filename, ticketId);
        await this.ensureDirectories(filePaths);
        const virusScanResult = await this.virusScannerService.scanFile(file.buffer, filename);
        if (!virusScanResult.isClean) {
            throw new common_1.BadRequestException(`File security scan failed. Threats detected: ${virusScanResult.threatsFound.join(', ')}`);
        }
        await this.saveFile(file.buffer, filePaths.original);
        const processedPaths = await this.processFile(file, filePaths, options);
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
    async uploadMultipleFiles(files, ticketId, userId, context, options) {
        if (files.length > this.config.maxFiles) {
            throw new common_1.BadRequestException(`Maximum ${this.config.maxFiles} files allowed`);
        }
        const uploadPromises = files.map(file => this.uploadFile(file, ticketId, userId, context, options));
        return Promise.all(uploadPromises);
    }
    async deleteFile(mediaId, userId) {
        const media = await this.mediaRepository.findById(mediaId);
        if (!media) {
            throw new common_1.BadRequestException('File not found');
        }
        if (media.uploadedBy !== userId) {
            throw new common_1.UnauthorizedException('You do not have permission to delete this file');
        }
        await this.deletePhysicalFiles(media);
        await this.mediaRepository.delete(mediaId);
    }
    async deleteFilesForTicket(ticketId) {
        const mediaList = await this.mediaRepository.findByTicketId(ticketId);
        const deletePromises = mediaList.map(media => this.deletePhysicalFiles(media));
        await Promise.all(deletePromises);
        await this.mediaRepository.deleteByTicketId(ticketId);
    }
    validateFile(file, options) {
        const config = { ...this.config, ...options };
        if (file.size > config.maxFileSize) {
            throw new common_1.BadRequestException(`File size exceeds maximum limit of ${this.formatBytes(config.maxFileSize)}`);
        }
        if (config.security.checkFileType) {
            const allowedTypes = options?.allowedTypes || config.allowedTypes;
            if (!allowedTypes.includes(file.mimetype)) {
                throw new common_1.BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
            }
            if (!(0, file_type_validator_1.validateFileType)(file.buffer, file.mimetype)) {
                throw new common_1.BadRequestException(`File content does not match declared type ${file.mimetype}. Possible file type spoofing detected.`);
            }
        }
    }
    generateSecureFilename(originalName) {
        const ext = path.extname(originalName).toLowerCase();
        const name = path.basename(originalName, ext);
        const sanitizedName = name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 50);
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `${sanitizedName}-${timestamp}-${random}${ext}`;
    }
    generateFilePaths(filename, ticketId) {
        if (!this.isValidTicketId(ticketId)) {
            throw new common_1.BadRequestException('Invalid ticket ID');
        }
        const basePath = path.join(this.config.uploadPath, 'tickets', ticketId);
        return {
            original: path.join(basePath, 'original', filename),
            thumbnail: path.join(basePath, 'thumbnails', filename),
            compressed: path.join(basePath, 'compressed', filename),
        };
    }
    isValidTicketId(ticketId) {
        return /^[a-zA-Z0-9_-]+$/.test(ticketId) && !ticketId.includes('..');
    }
    async ensureDirectories(filePaths) {
        const directories = [
            path.dirname(filePaths.original),
            path.dirname(filePaths.thumbnail),
            path.dirname(filePaths.compressed),
        ];
        await Promise.all(directories.map(dir => fs.ensureDir(dir)));
    }
    async saveFile(buffer, filePath) {
        await fs.writeFile(filePath, buffer);
    }
    async processFile(file, filePaths, options) {
        const result = {};
        const generateThumbnails = options?.generateThumbnails ?? true;
        const generateCompressed = options?.generateCompressed ?? this.config.compression.enabled;
        if (file.mimetype.startsWith('image/')) {
            const sharp = require('sharp');
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
            if (generateCompressed) {
                await sharp(file.buffer)
                    .jpeg({ quality: this.config.compression.quality })
                    .toFile(filePaths.compressed);
                result.compressed = filePaths.compressed;
            }
        }
        return result;
    }
    getFileType(mimetype) {
        if (mimetype.startsWith('image/')) {
            return media_1.MediaType.IMAGE;
        }
        else if (mimetype.startsWith('video/')) {
            return media_1.MediaType.VIDEO;
        }
        throw new common_1.BadRequestException('Unsupported file type');
    }
    async deletePhysicalFiles(media) {
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
        await Promise.allSettled(filesToDelete.map(filePath => fs.remove(filePath)));
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
exports.FileUploadService = FileUploadService;
exports.FileUploadService = FileUploadService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(media_repository_1.MediaRepository)),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository,
        virus_scanner_service_1.VirusScannerService])
], FileUploadService);
//# sourceMappingURL=file-upload.service.js.map