export interface FileTypeSignature {
    magic: number[];
    offset: number;
    mime: string;
    extension: string;
}
export declare const FILE_TYPE_SIGNATURES: FileTypeSignature[];
export declare function validateFileType(buffer: Buffer, declaredMime: string): boolean;
export declare function detectFileType(buffer: Buffer): {
    mime: string;
    extension: string;
} | null;
