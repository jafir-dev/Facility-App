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

export const defaultUploadConfig: UploadConfig = {
  uploadPath: '/var/lib/zariya/uploads',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
  ],
  maxFiles: 10,
  thumbnailSize: {
    width: 300,
    height: 300,
    quality: 80,
  },
  compression: {
    enabled: true,
    quality: 85,
  },
  security: {
    sanitizeFilename: true,
    virusScan: false, // Disabled for now, can be enabled later
    checkFileType: true,
  },
};