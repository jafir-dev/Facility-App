"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRepository = void 0;
const typeorm_1 = require("typeorm");
const media_entity_1 = require("../entities/media.entity");
const media_1 = require("../types/media");
let MediaRepository = class MediaRepository extends typeorm_1.Repository {
    async createMedia(mediaData) {
        const media = this.create({
            ...mediaData,
            uploadedAt: new Date(),
            isActive: true,
        });
        const savedMedia = await this.save(media);
        return this.mapToMedia(savedMedia);
    }
    async findById(id) {
        const media = await this.findOne({ where: { id, isActive: true } });
        return media ? this.mapToMedia(media) : null;
    }
    async findByTicketId(ticketId) {
        const mediaList = await this.find({
            where: { ticketId, isActive: true },
            order: { uploadedAt: 'DESC' },
        });
        return mediaList.map(media => this.mapToMedia(media));
    }
    async findByContext(context) {
        const mediaList = await this.find({
            where: { context, isActive: true },
            order: { uploadedAt: 'DESC' },
        });
        return mediaList.map(media => this.mapToMedia(media));
    }
    async delete(id) {
        await this.update(id, { isActive: false });
    }
    async deleteByTicketId(ticketId) {
        await this.update({ ticketId }, { isActive: false });
    }
    async findAll() {
        const mediaList = await this.find({
            where: { isActive: true },
            order: { uploadedAt: 'DESC' },
        });
        return mediaList.map(media => this.mapToMedia(media));
    }
    async getStorageStats() {
        const mediaList = await this.find({ where: { isActive: true } });
        const stats = {
            totalFiles: mediaList.length,
            totalSize: BigInt(0),
            byType: {
                [media_1.MediaType.IMAGE]: { count: 0, size: BigInt(0) },
                [media_1.MediaType.VIDEO]: { count: 0, size: BigInt(0) },
            },
        };
        mediaList.forEach(media => {
            const size = BigInt(media.size);
            stats.totalSize += size;
            if (stats.byType[media.type]) {
                stats.byType[media.type].count++;
                stats.byType[media.type].size += size;
            }
        });
        return {
            ...stats,
            totalSize: Number(stats.totalSize),
            byType: {
                [media_1.MediaType.IMAGE]: {
                    count: stats.byType[media_1.MediaType.IMAGE].count,
                    size: Number(stats.byType[media_1.MediaType.IMAGE].size),
                },
                [media_1.MediaType.VIDEO]: {
                    count: stats.byType[media_1.MediaType.VIDEO].count,
                    size: Number(stats.byType[media_1.MediaType.VIDEO].size),
                },
            },
        };
    }
    mapToMedia(entity) {
        return {
            id: entity.id,
            filename: entity.filename,
            originalName: entity.originalName,
            mimetype: entity.mimetype,
            size: Number(entity.size),
            type: entity.type,
            context: entity.context,
            ticketId: entity.ticketId,
            uploadedBy: entity.uploadedBy,
            uploadedAt: entity.uploadedAt,
            thumbnailPath: entity.thumbnailPath,
            compressedPath: entity.compressedPath,
            isActive: entity.isActive,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
};
exports.MediaRepository = MediaRepository;
exports.MediaRepository = MediaRepository = __decorate([
    (0, typeorm_1.EntityRepository)(media_entity_1.MediaEntity)
], MediaRepository);
//# sourceMappingURL=media.repository.js.map