import { ConfigService } from '@nestjs/config';
export declare class SecurityConfig {
    private readonly configService;
    constructor(configService: ConfigService);
    get uploadPath(): string;
    get maxFileSize(): number;
    get allowedFileTypes(): string[];
    get jwtSecret(): string;
    get jwtExpiration(): string;
    get corsOrigins(): string[];
    get rateLimiting(): {
        windowMs: number;
        max: number;
    };
    get securityHeaders(): Record<string, string>;
    private getContentSecurityPolicy;
    getFileSecurity(): {
        sanitizeFilename: boolean;
        checkFileType: boolean;
        maxFileSize: number;
        allowedTypes: string[];
        virusScan: boolean;
    };
    getUploadSecurity(): {
        requireAuth: boolean;
        rateLimit: number;
        virusScan: boolean;
        malwareScan: boolean;
        contentValidation: boolean;
    };
}
