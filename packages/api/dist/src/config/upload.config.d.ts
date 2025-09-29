export interface UploadConfig {
    uploadPath: string;
    maxFileSize: number;
    allowedTypes: string[];
    maxFiles: number;
    thumbnailSize: {
        width: number;
        height: number;
        quality: number;
    };
    compression: {
        enabled: boolean;
        quality: number;
    };
    security: {
        sanitizeFilename: boolean;
        virusScan: boolean;
        checkFileType: boolean;
    };
}
export declare const defaultUploadConfig: UploadConfig;
