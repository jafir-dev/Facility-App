export declare enum MediaContext {
    TICKET_PHOTO = "TICKET_PHOTO",
    TICKET_VIDEO = "TICKET_VIDEO",
    MAINTENANCE_RECORD = "MAINTENANCE_RECORD",
    USER_AVATAR = "USER_AVATAR",
    FACILITY_IMAGE = "FACILITY_IMAGE"
}
export declare enum MediaType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO"
}
export interface Media {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    type: MediaType;
    context: MediaContext;
    ticketId?: string;
    uploadedBy: string;
    uploadedAt: Date;
    thumbnailPath?: string;
    compressedPath?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface FileUploadOptions {
    allowedTypes: string[];
    maxSize: number;
    destination: string;
    generateThumbnails?: boolean;
    generateCompressed?: boolean;
}
