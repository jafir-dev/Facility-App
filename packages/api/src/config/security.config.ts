import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfig {
  constructor(private readonly configService: ConfigService) {}

  get uploadPath(): string {
    return this.configService.get<string>('UPLOAD_PATH', '/var/lib/zariya/uploads');
  }

  get maxFileSize(): number {
    return this.configService.get<number>('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
  }

  get allowedFileTypes(): string[] {
    return this.configService.get<string[]>('ALLOWED_FILE_TYPES', [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ]);
  }

  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret || secret === 'your-secret-key') {
      throw new Error('JWT_SECRET must be set to a secure value in production');
    }
    return secret;
  }

  get jwtExpiration(): string {
    return this.configService.get<string>('JWT_EXPIRATION', '24h');
  }

  get corsOrigins(): string[] {
    const origins = this.configService.get<string[]>('CORS_ORIGINS');
    if (!origins || origins.includes('*')) {
      // In production, this should be restricted to specific domains
      if (process.env.NODE_ENV === 'production') {
        console.warn('WARNING: CORS is configured to allow all origins. This is not recommended for production.');
      }
      return ['*'];
    }
    return origins;
  }

  get rateLimiting(): {
    windowMs: number;
    max: number;
  } {
    return {
      windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      max: this.configService.get<number>('RATE_LIMIT_MAX', 100), // limit each IP to 100 requests per windowMs
    };
  }

  get securityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this.getContentSecurityPolicy(),
    };
  }

  private getContentSecurityPolicy(): string {
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

  getFileSecurity(): {
    sanitizeFilename: boolean;
    checkFileType: boolean;
    maxFileSize: number;
    allowedTypes: string[];
    virusScan: boolean;
  } {
    return {
      sanitizeFilename: this.configService.get<boolean>('SANITIZE_FILENAME', true),
      checkFileType: this.configService.get<boolean>('CHECK_FILE_TYPE', true),
      maxFileSize: this.maxFileSize,
      allowedTypes: this.allowedFileTypes,
      virusScan: this.configService.get<boolean>('VIRUS_SCAN', false),
    };
  }

  getUploadSecurity(): {
    requireAuth: boolean;
    rateLimit: number;
    virusScan: boolean;
    malwareScan: boolean;
    contentValidation: boolean;
  } {
    return {
      requireAuth: this.configService.get<boolean>('UPLOAD_REQUIRE_AUTH', true),
      rateLimit: this.configService.get<number>('UPLOAD_RATE_LIMIT', 10),
      virusScan: this.configService.get<boolean>('UPLOAD_VIRUS_SCAN', false),
      malwareScan: this.configService.get<boolean>('UPLOAD_MALWARE_SCAN', false),
      contentValidation: this.configService.get<boolean>('UPLOAD_CONTENT_VALIDATION', true),
    };
  }
}