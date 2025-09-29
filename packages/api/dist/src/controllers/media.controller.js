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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_decorator_1 = require("../decorators/rate-limit.decorator");
const platform_express_1 = require("@nestjs/platform-express");
const media_repository_1 = require("../repositories/media.repository");
const file_upload_service_1 = require("../services/file-upload.service");
const media_1 = require("../types/media");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let MediaController = class MediaController {
    constructor(mediaRepository, fileUploadService) {
        this.mediaRepository = mediaRepository;
        this.fileUploadService = fileUploadService;
    }
    async uploadFile(file, ticketId, context, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!ticketId) {
            throw new common_1.BadRequestException('Ticket ID is required');
        }
        if (!context) {
            throw new common_1.BadRequestException('Context is required');
        }
        const userId = req.user.id;
        return this.fileUploadService.uploadFile(file, ticketId, userId, context);
    }
    async uploadMultipleFiles(files, ticketId, context, req) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files uploaded');
        }
        if (!ticketId) {
            throw new common_1.BadRequestException('Ticket ID is required');
        }
        if (!context) {
            throw new common_1.BadRequestException('Context is required');
        }
        const userId = req.user.id;
        return this.fileUploadService.uploadMultipleFiles(files, ticketId, userId, context);
    }
    async getFile(id, req, res) {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new common_1.NotFoundException('File not found');
        }
        await this.validateAccess(media, req.user.id);
        const filePath = this.getFilePath(media, 'original');
        if (!(await this.fileExists(filePath))) {
            throw new common_1.NotFoundException('File not found on disk');
        }
        res.sendFile(media.filename, {
            root: path.dirname(filePath),
            headers: {
                'Content-Type': media.mimetype,
                'Content-Disposition': `inline; filename="${media.originalName}"`,
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    }
    async getThumbnail(id, req, res) {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new common_1.NotFoundException('File not found');
        }
        if (media.type !== 'IMAGE') {
            throw new common_1.BadRequestException('Thumbnails are only available for images');
        }
        await this.validateAccess(media, req.user.id);
        const thumbnailPath = this.getFilePath(media, 'thumbnail');
        if (!media.thumbnailPath || !(await this.fileExists(thumbnailPath))) {
            return this.getFile(id, req, res);
        }
        res.sendFile(media.filename, {
            root: path.dirname(thumbnailPath),
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    }
    async getCompressed(id, req, res) {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new common_1.NotFoundException('File not found');
        }
        if (media.type !== 'IMAGE') {
            throw new common_1.BadRequestException('Compressed versions are only available for images');
        }
        await this.validateAccess(media, req.user.id);
        const compressedPath = this.getFilePath(media, 'compressed');
        if (!media.compressedPath || !(await this.fileExists(compressedPath))) {
            return this.getFile(id, req, res);
        }
        res.sendFile(media.filename, {
            root: path.dirname(compressedPath),
            headers: {
                'Content-Type': media.mimetype,
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    }
    async getFilesByTicket(ticketId, req, context) {
        const userFiles = await this.mediaRepository.findByTicketId(ticketId);
        const userUploadedFile = userFiles.find(file => file.uploadedBy === req.user.id);
        if (!userUploadedFile && userFiles.length > 0) {
            throw new common_1.UnauthorizedException('You do not have access to this ticket');
        }
        if (context) {
            return this.mediaRepository.findByContext(context);
        }
        return userFiles;
    }
    async deleteFile(id, req) {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new common_1.NotFoundException('File not found');
        }
        await this.fileUploadService.deleteFile(id, req.user.id);
        return { message: 'File deleted successfully' };
    }
    async getStorageStats(req) {
        if (!req.user.isAdmin) {
            throw new common_1.UnauthorizedException('Admin access required');
        }
        return this.mediaRepository.getStorageStats();
    }
    async validateAccess(media, userId) {
        if (media.uploadedBy === userId) {
            return;
        }
        throw new common_1.UnauthorizedException('You do not have permission to access this file');
    }
    getFilePath(media, type) {
        const uploadPath = process.env.UPLOAD_PATH || '/var/lib/zariya/uploads';
        if (type === 'thumbnail' && media.thumbnailPath) {
            return media.thumbnailPath;
        }
        if (type === 'compressed' && media.compressedPath) {
            return media.compressedPath;
        }
        return path.join(uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);
    }
    async fileExists(filePath) {
        const fs = require('fs-extra');
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, rate_limit_decorator_1.RateLimit)(5, 60),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('ticketId')),
    __param(2, (0, common_1.Body)('context')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('upload-multiple'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10)),
    (0, rate_limit_decorator_1.RateLimit)(3, 60),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('ticketId')),
    __param(2, (0, common_1.Body)('context')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadMultipleFiles", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getFile", null);
__decorate([
    (0, common_1.Get)(':id/thumbnail'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getThumbnail", null);
__decorate([
    (0, common_1.Get)(':id/compressed'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getCompressed", null);
__decorate([
    (0, common_1.Get)('ticket/:ticketId'),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('context')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getFilesByTicket", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Get)('stats/storage'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getStorageStats", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository,
        file_upload_service_1.FileUploadService])
], MediaController);
//# sourceMappingURL=media.controller.js.map