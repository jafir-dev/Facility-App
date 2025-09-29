import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class FileSizeMiddleware implements NestMiddleware {
    private readonly MAX_FILE_SIZE;
    use(req: Request, res: Response, next: NextFunction): void;
    private formatBytes;
}
