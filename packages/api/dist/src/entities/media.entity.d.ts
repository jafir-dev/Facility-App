import { MediaContext, MediaType } from '../types/media';
export declare class MediaEntity {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    type: MediaType;
    context: MediaContext;
    ticketId: string;
    uploadedBy: string;
    uploadedAt: Date;
    thumbnailPath: string;
    compressedPath: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
