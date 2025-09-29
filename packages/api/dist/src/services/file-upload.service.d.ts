import { MediaRepository } from '../repositories/media.repository';
import { Media, MediaContext, FileUploadOptions } from '../types/media';
import { VirusScannerService } from './virus-scanner.service';
export declare class FileUploadService {
    private readonly mediaRepository;
    private readonly virusScannerService;
    private readonly config;
    constructor(mediaRepository: MediaRepository, virusScannerService: VirusScannerService);
    uploadFile(file: Express.Multer.File, ticketId: string, userId: string, context: MediaContext, options?: Partial<FileUploadOptions>): Promise<Media>;
    uploadMultipleFiles(files: Express.Multer.File[], ticketId: string, userId: string, context: MediaContext, options?: Partial<FileUploadOptions>): Promise<Media[]>;
    deleteFile(mediaId: string, userId: string): Promise<void>;
    deleteFilesForTicket(ticketId: string): Promise<void>;
    private validateFile;
    private generateSecureFilename;
    private generateFilePaths;
    private isValidTicketId;
    private ensureDirectories;
    private saveFile;
    private processFile;
    private getFileType;
    private deletePhysicalFiles;
    private formatBytes;
}
