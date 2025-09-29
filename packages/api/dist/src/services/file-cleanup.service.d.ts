import { MediaRepository } from '../repositories/media.repository';
export declare class FileCleanupService {
    private readonly mediaRepository;
    private readonly logger;
    private readonly config;
    constructor(mediaRepository: MediaRepository);
    cleanupOrphanedFiles(): Promise<CleanupResult>;
    cleanupOldFiles(olderThanDays?: number): Promise<CleanupResult>;
    deleteFilesForTicket(ticketId: string): Promise<void>;
    cleanupTempFiles(result?: CleanupResult): Promise<void>;
    getStorageStats(): Promise<StorageStats>;
    validateStorage(): Promise<ValidationResult>;
    private getOldMediaRecords;
    private deleteMediaFiles;
    private getFilePath;
    private scanDiskStorage;
    private scanTicketDirectory;
}
export interface CleanupResult {
    orphanedFiles: number;
    cleanedFiles: number;
    errors: string[];
    startTime: Date;
    endTime?: Date;
}
export interface StorageStats {
    totalSize: number;
    fileCount: number;
    byType: Record<string, {
        count: number;
        size: number;
    }>;
    byTicket: Record<string, {
        totalSize: number;
        fileCount: number;
    }>;
}
export interface ValidationResult {
    validFiles: number;
    invalidFiles: number;
    missingFiles: number;
    errors: string[];
}
