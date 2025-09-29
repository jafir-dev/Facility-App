"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SecurityConfig = class SecurityConfig {
    constructor(configService) {
        this.configService = configService;
    }
    get uploadPath() {
        return this.configService.get('UPLOAD_PATH', '/var/lib/zariya/uploads');
    }
    get maxFileSize() {
        return this.configService.get('MAX_FILE_SIZE', 50 * 1024 * 1024);
    }
    get allowedFileTypes() {
        return this.configService.get('ALLOWED_FILE_TYPES', [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
        ]);
    }
    get jwtSecret() {
        const secret = this.configService.get('JWT_SECRET');
        if (!secret || secret === 'your-secret-key') {
            throw new Error('JWT_SECRET must be set to a secure value in production');
        }
        return secret;
    }
    get jwtExpiration() {
        return this.configService.get('JWT_EXPIRATION', '24h');
    }
    get corsOrigins() {
        const origins = this.configService.get('CORS_ORIGINS');
        if (!origins || origins.includes('*')) {
            if (process.env.NODE_ENV === 'production') {
                console.warn('WARNING: CORS is configured to allow all origins. This is not recommended for production.');
            }
            return ['*'];
        }
        return origins;
    }
    get rateLimiting() {
        return {
            windowMs: this.configService.get('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
            max: this.configService.get('RATE_LIMIT_MAX', 100),
        };
    }
    get securityHeaders() {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': this.getContentSecurityPolicy(),
        };
    }
    getContentSecurityPolicy() {
        return [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "frame-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; ');
    }
    getFileSecurity() {
        return {
            sanitizeFilename: this.configService.get('SANITIZE_FILENAME', true),
            checkFileType: this.configService.get('CHECK_FILE_TYPE', true),
            maxFileSize: this.maxFileSize,
            allowedTypes: this.allowedFileTypes,
            virusScan: this.configService.get('VIRUS_SCAN', false),
        };
    }
    getUploadSecurity() {
        return {
            requireAuth: this.configService.get('UPLOAD_REQUIRE_AUTH', true),
            rateLimit: this.configService.get('UPLOAD_RATE_LIMIT', 10),
            virusScan: this.configService.get('UPLOAD_VIRUS_SCAN', false),
            malwareScan: this.configService.get('UPLOAD_MALWARE_SCAN', false),
            contentValidation: this.configService.get('UPLOAD_CONTENT_VALIDATION', true),
        };
    }
};
exports.SecurityConfig = SecurityConfig;
exports.SecurityConfig = SecurityConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SecurityConfig);
//# sourceMappingURL=security.config.js.map