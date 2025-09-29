import { Media } from '../types/media';
export declare class ThumbnailService {
    private readonly logger;
    private readonly config;
    constructor();
    generateThumbnail(originalPath: string, filename: string, ticketId: string, options?: {
        width?: number;
        height?: number;
        quality?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }): Promise<string>;
    generateMultipleThumbnails(originalPath: string, filename: string, ticketId: string, sizes: Array<{
        name: string;
        width: number;
        height: number;
        quality?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }>): Promise<Record<string, string>>;
    regenerateThumbnail(media: Media): Promise<string>;
    optimizeImage(inputPath: string, outputPath: string, options?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'jpeg' | 'png' | 'webp';
    }): Promise<void>;
    getImageMetadata(filePath: string): Promise<{
        width: number;
        height: number;
        format: string;
        size: number;
    }>;
    batchGenerateThumbnails(ticketId: string): Promise<void>;
    deleteThumbnails(ticketId: string, filename?: string): Promise<void>;
}
