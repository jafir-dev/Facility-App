# Story: File Storage & Media Handling

**Story ID**: Story 1-4
**Branch**: `feature/story-1-4`
**Dependencies**: None
**Parallel-safe**: true
**Module**: File storage service
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** developer, **I want** a secure file storage system for handling media uploads, **so that** users can upload and access photos and videos for maintenance tickets.

## Acceptance Criteria
1. Secure file upload endpoint with authentication
2. File type validation (images and videos only)
3. File size limits and validation
4. Secure storage outside public web root
5. Authorized file access via API endpoints
6. File metadata storage in database
7. Thumbnail generation for images
8. File cleanup and management utilities

## Technical Implementation Details

### Storage Architecture
```
/var/lib/zariya/uploads/
├── tickets/
│   ├── {ticket_id}/
│   │   ├── original/
│   │   ├── thumbnails/
│   │   └── compressed/
└── temp/
```

### File Upload Service

```typescript
// packages/api/src/services/file-upload.service.ts
export interface FileUploadOptions {
  allowedTypes: string[];
  maxSize: number;
  destination: string;
  generateThumbnails?: boolean;
}

export class FileUploadService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    ticketId: string,
    userId: string,
    context: MediaContext,
  ): Promise<Media> {
    // Validate file type and size
    this.validateFile(file);

    // Generate unique filename
    const filename = this.generateUniqueFilename(file.originalname);

    // Determine file path
    const filePath = path.join(this.configService.uploadPath, 'tickets', ticketId, 'original', filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Generate thumbnails for images
    if (file.mimetype.startsWith('image/')) {
      await this.generateThumbnail(filePath, filename, ticketId);
    }

    // Save metadata to database
    const media = await this.mediaRepository.create({
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: file.mimetype.startsWith('image/') ? 'Image' : 'Video',
      context,
      ticketId,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    return media;
  }

  private validateFile(file: Express.Multer.File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File too large');
    }
  }

  private generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name}-${timestamp}-${random}${ext}`;
  }
}
```

### File Access Controller

```typescript
// packages/api/src/controllers/media.controller.ts
@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
    @Body('context') context: MediaContext,
    @Req() req: Request,
  ): Promise<Media> {
    const userId = req.user.id;
    return this.fileUploadService.uploadFile(file, ticketId, userId, context);
  }

  @Get(':id')
  async getFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaService.findById(id);

    // Check if user has permission to access this file
    await this.mediaService.validateAccess(media, req.user.id);

    const filePath = path.join(this.configService.uploadPath, 'tickets', media.ticketId, 'original', media.filename);

    // Send file securely
    res.sendFile(filePath, {
      root: this.configService.uploadPath,
      headers: {
        'Content-Type': media.mimetype,
        'Content-Disposition': `inline; filename="${media.originalName}"`,
      },
    });
  }

  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaService.findById(id);

    if (media.type !== 'Image') {
      throw new BadRequestException('Thumbnails are only available for images');
    }

    await this.mediaService.validateAccess(media, req.user.id);

    const thumbnailPath = path.join(this.configService.uploadPath, 'tickets', media.ticketId, 'thumbnails', media.filename);

    res.sendFile(thumbnailPath, {
      root: this.configService.uploadPath,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  }
}
```

### Thumbnail Generation Service

```typescript
// packages/api/src/services/thumbnail.service.ts
export class ThumbnailService {
  async generateThumbnail(originalPath: string, filename: string, ticketId: string): Promise<void> {
    const thumbnailDir = path.join(path.dirname(originalPath), '..', 'thumbnails');
    await fs.mkdir(thumbnailDir, { recursive: true });

    const thumbnailPath = path.join(thumbnailDir, filename);

    await sharp(originalPath)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
  }
}
```

### File Cleanup Service

```typescript
// packages/api/src/services/file-cleanup.service.ts
export class FileCleanupService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 2 * * *') // Run daily at 2 AM
  async cleanupOrphanedFiles(): Promise<void> {
    // Find files in database that don't exist on disk
    const mediaFiles = await this.mediaRepository.findAll();

    for (const media of mediaFiles) {
      const filePath = path.join(this.configService.uploadPath, 'tickets', media.ticketId, 'original', media.filename);

      if (!(await fs.pathExists(filePath))) {
        // Remove database record if file doesn't exist
        await this.mediaRepository.delete(media.id);
      }
    }
  }

  async deleteFilesForTicket(ticketId: string): Promise<void> {
    const ticketDir = path.join(this.configService.uploadPath, 'tickets', ticketId);

    if (await fs.pathExists(ticketDir)) {
      await fs.remove(ticketDir);
    }

    // Remove from database
    await this.mediaRepository.deleteByTicketId(ticketId);
  }
}
```

### Security Configuration
- Store files outside public web root (`/var/lib/zariya/uploads`)
- Use API endpoints with authentication for file access
- Implement file type validation
- Set file size limits
- Use secure file naming to prevent directory traversal
- Implement proper file permissions
- Add rate limiting for upload endpoints

## Success Metrics
- ✅ Files are securely uploaded and stored
- ✅ Only authenticated users can upload files
- ✅ File type and size validation works correctly
- ✅ Thumbnails are generated for images
- ✅ Files are accessible only through authorized API endpoints
- ✅ File metadata is properly stored in database
- ✅ Cleanup processes work correctly
- ✅ Storage usage is optimized

## Notes for Developers
- Use Sharp for image processing and thumbnail generation
- Implement proper error handling for file operations
- Consider adding virus scanning for uploaded files
- Monitor storage usage and implement quotas
- Add logging for file operations
- Consider implementing CDN for large-scale deployments
- Test with various file types and sizes
- Document file storage architecture and security measures