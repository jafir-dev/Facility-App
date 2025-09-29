import { Repository } from 'typeorm';
import { MediaEntity } from '../entities/media.entity';
import { Media, MediaContext, MediaType } from '../types/media';
export declare class MediaRepository extends Repository<MediaEntity> {
    createMedia(mediaData: Partial<Media>): Promise<Media>;
    findById(id: string): Promise<Media | null>;
    findByTicketId(ticketId: string): Promise<Media[]>;
    findByContext(context: MediaContext): Promise<Media[]>;
    delete(id: string): Promise<void>;
    deleteByTicketId(ticketId: string): Promise<void>;
    findAll(): Promise<Media[]>;
    getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        byType: Record<MediaType, {
            count: number;
            size: number;
        }>;
    }>;
    private mapToMedia;
}
