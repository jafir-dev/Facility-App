"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultUploadConfig = void 0;
exports.defaultUploadConfig = {
    uploadPath: '/var/lib/zariya/uploads',
    maxFileSize: 50 * 1024 * 1024,
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
        virusScan: false,
        checkFileType: true,
    },
};
//# sourceMappingURL=upload.config.js.map