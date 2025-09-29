import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FileSizeMiddleware implements NestMiddleware {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length'], 10);

      if (contentLength > this.MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File size exceeds maximum limit of ${this.formatBytes(this.MAX_FILE_SIZE)}`
        );
      }
    }

    next();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}