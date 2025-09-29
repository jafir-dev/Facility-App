"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TYPE_SIGNATURES = void 0;
exports.validateFileType = validateFileType;
exports.detectFileType = detectFileType;
exports.FILE_TYPE_SIGNATURES = [
    {
        magic: [0xFF, 0xD8, 0xFF],
        offset: 0,
        mime: 'image/jpeg',
        extension: 'jpg',
    },
    {
        magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        offset: 0,
        mime: 'image/png',
        extension: 'png',
    },
    {
        magic: [0x47, 0x49, 0x46, 0x38],
        offset: 0,
        mime: 'image/gif',
        extension: 'gif',
    },
    {
        magic: [0x52, 0x49, 0x46, 0x46],
        offset: 0,
        mime: 'image/webp',
        extension: 'webp',
    },
    {
        magic: [0x66, 0x74, 0x79, 0x70],
        offset: 4,
        mime: 'video/mp4',
        extension: 'mp4',
    },
    {
        magic: [0x6D, 0x6F, 0x6F, 0x76],
        offset: 4,
        mime: 'video/quicktime',
        extension: 'mov',
    },
    {
        magic: [0x52, 0x49, 0x46, 0x46],
        offset: 0,
        mime: 'video/x-msvideo',
        extension: 'avi',
    },
];
function validateFileType(buffer, declaredMime) {
    for (const signature of exports.FILE_TYPE_SIGNATURES) {
        if (signature.mime === declaredMime) {
            const fileMagic = Array.from(buffer.slice(signature.offset, signature.offset + signature.magic.length));
            if (fileMagic.length === signature.magic.length) {
                const matches = fileMagic.every((byte, index) => byte === signature.magic[index]);
                if (matches) {
                    return true;
                }
            }
        }
    }
    return false;
}
function detectFileType(buffer) {
    for (const signature of exports.FILE_TYPE_SIGNATURES) {
        if (buffer.length >= signature.offset + signature.magic.length) {
            const fileMagic = Array.from(buffer.slice(signature.offset, signature.offset + signature.magic.length));
            if (fileMagic.every((byte, index) => byte === signature.magic[index])) {
                return {
                    mime: signature.mime,
                    extension: signature.extension,
                };
            }
        }
    }
    return null;
}
//# sourceMappingURL=file-type.validator.js.map