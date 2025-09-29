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
var FileCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileCleanupService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fs = require("fs-extra");
const path = require("path");
const media_repository_1 = require("../repositories/media.repository");
const upload_config_1 = require("../config/upload.config");
let FileCleanupService = FileCleanupService_1 = class FileCleanupService {
    constructor(mediaRepository) {
        this.mediaRepository = mediaRepository;
        this.logger = new common_1.Logger(FileCleanupService_1.name);
        this.config = upload_config_1.defaultUploadConfig;
    }
    async cleanupOrphanedFiles() {
        const result = {
            orphanedFiles: 0,
            cleanedFiles: 0,
            errors: [],
            startTime: new Date(),
        };
        try {
            this.logger.log('Starting orphaned files cleanup...');
            const mediaRecords = await this.mediaRepository.findAll();
            for (const media of mediaRecords) {
                try {
                    const filePath = this.getFilePath(media);
                    const fileExists = await fs.pathExists(filePath);
                    if (!fileExists) {
                        result.orphanedFiles++;
                        await this.mediaRepository.delete(media.id);
                        result.cleanedFiles++;
                        this.logger.log(`Cleaned up orphaned database record: ${media.filename}`);
                    }
                }
                catch (error) {
                    result.errors.push(`Error checking file ${media.filename}: ${error.message}`);
                    this.logger.error(`Error checking file ${media.filename}: ${error.message}`);
                }
            }
            await this.cleanupTempFiles(result);
            result.endTime = new Date();
            this.logger.log(`Cleanup completed. Orphaned files: ${result.orphanedFiles}, Cleaned files: ${result.cleanedFiles}`);
            return result;
        }
        catch (error) {
            result.endTime = new Date();
            result.errors.push(`Cleanup failed: ${error.message}`);
            this.logger.error(`Cleanup failed: ${error.message}`);
            throw error;
        }
    }
    async cleanupOldFiles(olderThanDays = 30) {
        const result = {
            orphanedFiles: 0,
            cleanedFiles: 0,
            errors: [],
            startTime: new Date(),
        };
        try {
            this.logger.log(`Starting cleanup of files older than ${olderThanDays} days...`);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const oldMedia = await this.getOldMediaRecords(cutoffDate);
            for (const media of oldMedia) {
                try {
                    await this.deleteMediaFiles(media);
                    await this.mediaRepository.delete(media.id);
                    result.cleanedFiles++;
                    this.logger.log(`Cleaned up old file: ${media.filename}`);
                }
                catch (error) {
                    result.errors.push(`Error cleaning up ${media.filename}: ${error.message}`);
                    this.logger.error(`Error cleaning up ${media.filename}: ${error.message}`);
                }
            }
            result.endTime = new Date();
            this.logger.log(`Old files cleanup completed. Cleaned files: ${result.cleanedFiles}`);
            return result;
        }
        catch (error) {
            result.endTime = new Date();
            result.errors.push(`Old files cleanup failed: ${error.message}`);
            this.logger.error(`Old files cleanup failed: ${error.message}`);
            throw error;
        }
    }
    async deleteFilesForTicket(ticketId) {
        try {
            this.logger.log(`Deleting all files for ticket: ${ticketId}`);
            const ticketDir = path.join(this.config.uploadPath, 'tickets', ticketId);
            if (await fs.pathExists(ticketDir)) {
                await fs.remove(ticketDir);
                this.logger.log(`Deleted ticket directory: ${ticketDir}`);
            }
            await this.mediaRepository.deleteByTicketId(ticketId);
            this.logger.log(`Successfully deleted all files for ticket: ${ticketId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete files for ticket ${ticketId}: ${error.message}`);
            throw error;
        }
    }
    async cleanupTempFiles(result) {
        try {
            const tempDir = path.join(this.config.uploadPath, 'temp');
            if (!(await fs.pathExists(tempDir))) {
                return;
            }
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000;
            for (const file of files) {
                try {
                    const filePath = path.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.remove(filePath);
                        if (result)
                            result.cleanedFiles++;
                    }
                }
                catch (error) {
                    if (result)
                        result.errors.push(`Error cleaning temp file ${file}: ${error.message}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to cleanup temp files: ${error.message}`);
        }
    }
    async getStorageStats() {
        try {
            const uploadPath = this.config.uploadPath;
            const stats = {
                totalSize: 0,
                fileCount: 0,
                byType: { IMAGE: 0, VIDEO: 0 },
                byTicket: {},
            };
            const dbStats = await this.mediaRepository.getStorageStats();
            stats.totalSize = dbStats.totalSize;
            stats.fileCount = dbStats.totalFiles;
            stats.byType = dbStats.byType;
            await this.scanDiskStorage(uploadPath, stats);
            return stats;
        }
        catch (error) {
            this.logger.error(`Failed to get storage stats: ${error.message}`);
            throw error;
        }
    }
    async validateStorage() {
        const result = {
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
                    }
                    else {
                        const stats = await fs.stat(filePath);
                        if (stats.size !== media.size) {
                            result.invalidFiles++;
                            result.errors.push(`Size mismatch: ${media.filename} (DB: ${media.size}, Disk: ${stats.size})`);
                        }
                        else {
                            result.validFiles++;
                        }
                    }
                }
                catch (error) {
                    result.invalidFiles++;
                    result.errors.push(`Error validating ${media.filename}: ${error.message}`);
                }
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Storage validation failed: ${error.message}`);
            throw error;
        }
    }
    async getOldMediaRecords(cutoffDate) {
        const allMedia = await this.mediaRepository.findAll();
        return allMedia.filter(media => media.uploadedAt < cutoffDate);
    }
    async deleteMediaFiles(media) {
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
        await Promise.allSettled(filesToDelete.map(filePath => fs.remove(filePath).catch(() => { })));
    }
    getFilePath(media) {
        return path.join(this.config.uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);
    }
    async scanDiskStorage(uploadPath, stats) {
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
        }
        catch (error) {
            this.logger.error(`Failed to scan disk storage: ${error.message}`);
        }
    }
    async scanTicketDirectory(ticketPath) {
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
                    }
                    catch (error) {
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to scan ticket directory ${ticketPath}: ${error.message}`);
        }
        return { totalSize, fileCount };
    }
};
exports.FileCleanupService = FileCleanupService;
__decorate([
    (0, common_1.Cron)(common_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FileCleanupService.prototype, "cleanupOrphanedFiles", null);
__decorate([
    (0, common_1.Cron)(common_1.CronExpression.EVERY_WEEKEND),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FileCleanupService.prototype, "cleanupOldFiles", null);
exports.FileCleanupService = FileCleanupService = FileCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(media_repository_1.MediaRepository)),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository])
], FileCleanupService);
//# sourceMappingURL=file-cleanup.service.js.map