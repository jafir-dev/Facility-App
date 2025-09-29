import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { RateLimit } from '../decorators/rate-limit.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MediaRepository } from '../repositories/media.repository';
import { FileUploadService } from '../services/file-upload.service';
import { Media, MediaContext } from '../types/media';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RateLimit(5, 60) // 5 uploads per minute per user
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
    @Body('context') context: MediaContext,
    @Req() req: any,
  ): Promise<Media> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ticketId) {
      throw new BadRequestException('Ticket ID is required');
    }

    if (!context) {
      throw new BadRequestException('Context is required');
    }

    const userId = req.user.id;
    return this.fileUploadService.uploadFile(file, ticketId, userId, context);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @RateLimit(3, 60) // 3 multi-file uploads per minute per user
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('ticketId') ticketId: string,
    @Body('context') context: MediaContext,
    @Req() req: any,
  ): Promise<Media[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (!ticketId) {
      throw new BadRequestException('Ticket ID is required');
    }

    if (!context) {
      throw new BadRequestException('Context is required');
    }

    const userId = req.user.id;
    return this.fileUploadService.uploadMultipleFiles(files, ticketId, userId, context);
  }

  @Get(':id')
  async getFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaRepository.findById(id);

    if (!media) {
      throw new NotFoundException('File not found');
    }

    // Check if user has permission to access this file
    await this.validateAccess(media, req.user.id);

    const filePath = this.getFilePath(media, 'original');

    if (!(await this.fileExists(filePath))) {
      throw new NotFoundException('File not found on disk');
    }

    // Send file securely
    res.sendFile(media.filename, {
      root: path.dirname(filePath),
      headers: {
        'Content-Type': media.mimetype,
        'Content-Disposition': `inline; filename="${media.originalName}"`,
        'Cache-Control': 'public, max-age=31536000', // 1 year
      },
    });
  }

  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaRepository.findById(id);

    if (!media) {
      throw new NotFoundException('File not found');
    }

    if (media.type !== 'IMAGE') {
      throw new BadRequestException('Thumbnails are only available for images');
    }

    await this.validateAccess(media, req.user.id);

    const thumbnailPath = this.getFilePath(media, 'thumbnail');

    if (!media.thumbnailPath || !(await this.fileExists(thumbnailPath))) {
      // If thumbnail doesn't exist, return original image
      return this.getFile(id, req, res);
    }

    res.sendFile(media.filename, {
      root: path.dirname(thumbnailPath),
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  @Get(':id/compressed')
  async getCompressed(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaRepository.findById(id);

    if (!media) {
      throw new NotFoundException('File not found');
    }

    if (media.type !== 'IMAGE') {
      throw new BadRequestException('Compressed versions are only available for images');
    }

    await this.validateAccess(media, req.user.id);

    const compressedPath = this.getFilePath(media, 'compressed');

    if (!media.compressedPath || !(await this.fileExists(compressedPath))) {
      // If compressed version doesn't exist, return original image
      return this.getFile(id, req, res);
    }

    res.sendFile(media.filename, {
      root: path.dirname(compressedPath),
      headers: {
        'Content-Type': media.mimetype,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  @Get('ticket/:ticketId')
  async getFilesByTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: any,
    @Query('context') context?: MediaContext,
  ): Promise<Media[]> {
    // Check if user has access to this ticket
    // This would typically involve checking if the user is part of the ticket
    // For now, we'll allow access if the user uploaded any files for this ticket
    const userFiles = await this.mediaRepository.findByTicketId(ticketId);
    const userUploadedFile = userFiles.find(file => file.uploadedBy === req.user.id);

    if (!userUploadedFile && userFiles.length > 0) {
      throw new UnauthorizedException('You do not have access to this ticket');
    }

    if (context) {
      return this.mediaRepository.findByContext(context);
    }

    return userFiles;
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const media = await this.mediaRepository.findById(id);

    if (!media) {
      throw new NotFoundException('File not found');
    }

    await this.fileUploadService.deleteFile(id, req.user.id);
    return { message: 'File deleted successfully' };
  }

  @Get('stats/storage')
  async getStorageStats(@Req() req: any): Promise<any> {
    // Only admins can access storage stats
    if (!req.user.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    return this.mediaRepository.getStorageStats();
  }

  private async validateAccess(media: Media, userId: string): Promise<void> {
    // Allow access if user uploaded the file
    if (media.uploadedBy === userId) {
      return;
    }

    // Additional access control logic can be added here
    // For example: check if user is part of the ticket, has admin access, etc.

    throw new UnauthorizedException('You do not have permission to access this file');
  }

  private getFilePath(media: Media, type: 'original' | 'thumbnail' | 'compressed'): string {
    const uploadPath = process.env.UPLOAD_PATH || '/var/lib/zariya/uploads';

    if (type === 'thumbnail' && media.thumbnailPath) {
      return media.thumbnailPath;
    }

    if (type === 'compressed' && media.compressedPath) {
      return media.compressedPath;
    }

    // Default to original file path
    return path.join(uploadPath, 'tickets', media.ticketId || 'unknown', 'original', media.filename);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    const fs = require('fs-extra');
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}