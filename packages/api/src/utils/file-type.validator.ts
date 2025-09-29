export interface FileTypeSignature {
  magic: number[];
  offset: number;
  mime: string;
  extension: string;
}

export const FILE_TYPE_SIGNATURES: FileTypeSignature[] = [
  // JPEG
  {
    magic: [0xFF, 0xD8, 0xFF],
    offset: 0,
    mime: 'image/jpeg',
    extension: 'jpg',
  },
  // PNG
  {
    magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    offset: 0,
    mime: 'image/png',
    extension: 'png',
  },
  // GIF
  {
    magic: [0x47, 0x49, 0x46, 0x38],
    offset: 0,
    mime: 'image/gif',
    extension: 'gif',
  },
  // WebP
  {
    magic: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    mime: 'image/webp',
    extension: 'webp',
  },
  // MP4
  {
    magic: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
    mime: 'video/mp4',
    extension: 'mp4',
  },
  // QuickTime
  {
    magic: [0x6D, 0x6F, 0x6F, 0x76],
    offset: 4,
    mime: 'video/quicktime',
    extension: 'mov',
  },
  // AVI
  {
    magic: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    mime: 'video/x-msvideo',
    extension: 'avi',
  },
];

export function validateFileType(buffer: Buffer, declaredMime: string): boolean {
  for (const signature of FILE_TYPE_SIGNATURES) {
    if (signature.mime === declaredMime) {
      // Check if the magic numbers match
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

export function detectFileType(buffer: Buffer): { mime: string; extension: string } | null {
  for (const signature of FILE_TYPE_SIGNATURES) {
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