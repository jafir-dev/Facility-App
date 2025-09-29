import { Response } from 'express';
import { MediaRepository } from '../repositories/media.repository';
import { FileUploadService } from '../services/file-upload.service';
import { Media, MediaContext } from '../types/media';
export declare class MediaController {
    private readonly mediaRepository;
    private readonly fileUploadService;
    constructor(mediaRepository: MediaRepository, fileUploadService: FileUploadService);
    uploadFile(file: Express.Multer.File, ticketId: string, context: MediaContext, req: any): Promise<Media>;
    uploadMultipleFiles(files: Express.Multer.File[], ticketId: string, context: MediaContext, req: any): Promise<Media[]>;
    getFile(id: string, req: any, res: Response): Promise<void>;
    getThumbnail(id: string, req: any, res: Response): Promise<void>;
    getCompressed(id: string, req: any, res: Response): Promise<void>;
    getFilesByTicket(ticketId: string, req: any, context?: MediaContext): Promise<Media[]>;
    deleteFile(id: string, req: any): Promise<{
        message: string;
    }>;
    getStorageStats(req: any): Promise<any>;
    private validateAccess;
    private getFilePath;
    private fileExists;
}
