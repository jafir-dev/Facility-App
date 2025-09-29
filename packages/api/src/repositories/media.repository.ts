import { EntityRepository, Repository } from 'typeorm';
import { MediaEntity } from '../entities/media.entity';
import { Media, MediaContext, MediaType } from '../types/media';

@EntityRepository(MediaEntity)
export class MediaRepository extends Repository<MediaEntity> {
  async createMedia(mediaData: Partial<Media>): Promise<Media> {
    const media = this.create({
      ...mediaData,
      uploadedAt: new Date(),
      isActive: true,
    });

    const savedMedia = await this.save(media);
    return this.mapToMedia(savedMedia);
  }

  async findById(id: string): Promise<Media | null> {
    const media = await this.findOne({ where: { id, isActive: true } });
    return media ? this.mapToMedia(media) : null;
  }

  async findByTicketId(ticketId: string): Promise<Media[]> {
    const mediaList = await this.find({
      where: { ticketId, isActive: true },
      order: { uploadedAt: 'DESC' },
    });

    return mediaList.map(media => this.mapToMedia(media));
  }

  async findByContext(context: MediaContext): Promise<Media[]> {
    const mediaList = await this.find({
      where: { context, isActive: true },
      order: { uploadedAt: 'DESC' },
    });

    return mediaList.map(media => this.mapToMedia(media));
  }

  async delete(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  async deleteByTicketId(ticketId: string): Promise<void> {
    await this.update(
      { ticketId },
      { isActive: false }
    );
  }

  async findAll(): Promise<Media[]> {
    const mediaList = await this.find({
      where: { isActive: true },
      order: { uploadedAt: 'DESC' },
    });

    return mediaList.map(media => this.mapToMedia(media));
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<MediaType, { count: number; size: number }>;
  }> {
    const mediaList = await this.find({ where: { isActive: true } });

    const stats = {
      totalFiles: mediaList.length,
      totalSize: BigInt(0),
      byType: {
        [MediaType.IMAGE]: { count: 0, size: BigInt(0) },
        [MediaType.VIDEO]: { count: 0, size: BigInt(0) },
      } as Record<MediaType, { count: number; size: bigint }>,
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
        [MediaType.IMAGE]: {
          count: stats.byType[MediaType.IMAGE].count,
          size: Number(stats.byType[MediaType.IMAGE].size),
        },
        [MediaType.VIDEO]: {
          count: stats.byType[MediaType.VIDEO].count,
          size: Number(stats.byType[MediaType.VIDEO].size),
        },
      },
    };
  }

  private mapToMedia(entity: MediaEntity): Media {
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
}