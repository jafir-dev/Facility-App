# Story: OTP Verification & Advanced Media

**Story ID**: Story 4
**Branch**: `feature/story-4`
**Dependencies**: Story 3
**Parallel-safe**: false
**Module**: Verification and media enhancement
**Epic**: Quoting, Verification & Advanced Media

## User Stories

### Story 4.1: OTP Completion Flow
**As a** Tenant, **I want** to receive a secure OTP to provide to the technician, **so that** I can confirm the work is completed to my satisfaction.

**Acceptance Criteria:**
1. A Technician triggers a "Request OTP" action in their app
2. The system generates an OTP and sends it to the Tenant's email
3. The Technician's app has a field to enter the OTP
4. Entering the correct OTP updates the ticket status to "Completed"

### Story 4.2: Add Video to Ticket Creation
**As a** Tenant, **I want** to attach a video file when creating a ticket, **so that** I can better demonstrate the issue.

**Acceptance Criteria:**
1. The "New Ticket" form includes an option to upload a video file
2. The system supports common mobile video formats
3. The uploaded video is viewable by the Supervisor and Technician

### Story 4.3: Technician "Before & After" Media
**As a** Technician, **I want** to upload "before" and "after" media, **so that** I can provide clear documentation of the job.

**Acceptance Criteria:**
1. A Technician has options to upload "Before Work" and "After Work" media (photos/videos)
2. The media is stored and associated with the ticket for review

## Technical Implementation Details

### Database Schema Updates

```sql
-- OTP Table
CREATE TABLE "otps" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id"),
    "code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP WITH TIME ZONE,
    "created_by" TEXT NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update Media table to support video and better context handling
ALTER TABLE "media"
ADD COLUMN "video_duration" INTEGER, -- in seconds
ADD COLUMN "video_thumbnail" TEXT, -- path to thumbnail image
ADD COLUMN "compression_status" TEXT DEFAULT 'Pending' CHECK (
    "compression_status" IN ('Pending', 'Processing', 'Completed', 'Failed')
);

-- Indexes
CREATE INDEX idx_otps_ticket_id ON "otps"("ticket_id");
CREATE INDEX idx_otps_code ON "otps"("code");
CREATE INDEX idx_otps_expires_at ON "otps"("expires_at");
```

### OTP Service

```typescript
// packages/api/src/services/otp.service.ts
@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 15;

  constructor(
    @InjectRepository(OTP)
    private readonly otpRepository: Repository<OTP>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async generateOTP(ticketId: string, technicianId: string): Promise<OTP> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['tenant'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.assignedTo !== technicianId) {
      throw new ForbiddenException('You can only request OTP for tickets assigned to you');
    }

    if (ticket.status !== 'InProgress' && ticket.status !== 'Approved') {
      throw new BadRequestException('OTP can only be requested for tickets in progress or approved');
    }

    // Check if there's already an active OTP
    const existingOTP = await this.otpRepository.findOne({
      where: {
        ticketId,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (existingOTP) {
      return existingOTP;
    }

    // Generate new OTP
    const otp = this.otpRepository.create({
      ticketId,
      code: this.generateOTPCode(),
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
      createdBy: technicianId,
    });

    const savedOTP = await this.otpRepository.save(otp);

    // Send OTP to tenant via email
    await this.emailService.sendEmail(ticket.tenant.email, {
      type: 'OTPRequested',
      title: 'OTP for Job Completion',
      message: `Your OTP for completing the maintenance request "${ticket.title}" is: ${savedOTP.code}. This OTP will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
      recipientId: ticket.tenantId,
      data: {
        ticketId: ticket.id,
        otp: savedOTP.code,
        expiresAt: savedOTP.expiresAt.toISOString(),
      },
    });

    // Notify tenant via push notification
    await this.notificationService.sendNotification({
      type: 'OTPRequested',
      title: 'OTP Generated',
      message: `An OTP has been generated for your maintenance request. Please check your email.`,
      recipientId: ticket.tenantId,
      data: { ticketId: ticket.id },
    });

    return savedOTP;
  }

  async verifyOTP(ticketId: string, code: string, technicianId: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        ticketId,
        code,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otp.createdBy !== technicianId) {
      throw new ForbiddenException('You can only verify OTPs you generated');
    }

    // Mark OTP as used
    await this.otpRepository.update(otp.id, {
      isUsed: true,
      usedAt: new Date(),
    });

    // Update ticket status to completed
    await this.ticketRepository.update(ticketId, {
      status: 'Completed',
      completedAt: new Date(),
    });

    // Notify all parties
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['tenant', 'assignedTo'],
    });

    if (ticket) {
      // Notify tenant
      await this.notificationService.sendNotification({
        type: 'TicketCompleted',
        title: 'Job Completed',
        message: `Your maintenance request "${ticket.title}" has been marked as completed.`,
        recipientId: ticket.tenantId,
        data: { ticketId: ticket.id },
      });

      // Notify supervisor
      if (ticket.assignedBy) {
        await this.notificationService.sendNotification({
          type: 'TicketCompleted',
          title: 'Job Completed',
          message: `The maintenance request "${ticket.title}" assigned to ${ticket.assignedTo?.firstName} has been completed.`,
          recipientId: ticket.assignedBy,
          data: { ticketId: ticket.id },
        });
      }
    }

    return true;
  }

  private generateOTPCode(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  @Cron('0 */5 * * * *') // Run every 5 minutes
  async cleanupExpiredOTPs() {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
```

### Enhanced Media Service for Videos

```typescript
// packages/api/src/services/media.service.ts
@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly fileUploadService: FileUploadService,
    private readonly thumbnailService: ThumbnailService,
    private readonly videoService: VideoService,
  ) {}

  async uploadVideo(
    file: Express.Multer.File,
    ticketId: string,
    userId: string,
    context: MediaContext,
  ): Promise<Media> {
    // Validate video file
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File must be a video');
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      throw new BadRequestException('Video file too large');
    }

    // Generate unique filename
    const filename = this.generateUniqueFilename(file.originalname);

    // Save original video
    const originalPath = await this.fileUploadService.saveFile(file, filename, ticketId, 'original');

    // Get video metadata
    const metadata = await this.videoService.getVideoMetadata(originalPath);

    // Generate thumbnail
    const thumbnailPath = await this.videoService.generateThumbnail(originalPath, filename, ticketId);

    // Compress video for web streaming
    const compressedPath = await this.videoService.compressVideo(originalPath, filename, ticketId);

    // Save to database
    const media = this.mediaRepository.create({
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: 'Video',
      context,
      ticketId,
      uploadedBy: userId,
      videoDuration: metadata.duration,
      videoThumbnail: thumbnailPath,
      compressionStatus: 'Processing',
    });

    const savedMedia = await this.mediaRepository.save(media);

    // Start video compression in background
    this.videoService.compressVideoInBackground(savedMedia.id, originalPath, compressedPath);

    return savedMedia;
  }

  async getVideoStream(mediaId: string, range: string): Promise<ReadStream> {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });

    if (!media || media.type !== 'Video') {
      throw new NotFoundException('Video not found');
    }

    const videoPath = path.join(
      this.configService.uploadPath,
      'tickets',
      media.ticketId,
      'compressed',
      media.filename,
    );

    if (!fs.existsSync(videoPath)) {
      // Fallback to original if compressed version doesn't exist
      const originalPath = path.join(
        this.configService.uploadPath,
        'tickets',
        media.ticketId,
        'original',
        media.filename,
      );

      if (!fs.existsSync(originalPath)) {
        throw new NotFoundException('Video file not found');
      }

      return fs.createReadStream(originalPath);
    }

    return fs.createReadStream(videoPath);
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

### Video Service

```typescript
// packages/api/src/services/video.service.ts
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
  ) {}

  async getVideoMetadata(filePath: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: videoStream.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
        });
      });
    });
  }

  async generateThumbnail(inputPath: string, filename: string, ticketId: string): Promise<string> {
    const thumbnailDir = path.join(this.configService.uploadPath, 'tickets', ticketId, 'thumbnails');
    await fs.promises.mkdir(thumbnailDir, { recursive: true });

    const thumbnailFilename = `${path.parse(filename).name}_thumb.jpg`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: thumbnailFilename,
          folder: thumbnailDir,
          size: '320x240',
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }

  async compressVideo(inputPath: string, filename: string, ticketId: string): Promise<string> {
    const compressedDir = path.join(this.configService.uploadPath, 'tickets', ticketId, 'compressed');
    await fs.promises.mkdir(compressedDir, { recursive: true });

    const compressedFilename = `${path.parse(filename).name}_compressed.mp4`;
    const compressedPath = path.join(compressedDir, compressedFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(compressedPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1280x720')
        .videoBitrate('2000k')
        .audioBitrate('128k')
        .on('end', () => resolve(compressedPath))
        .on('error', reject)
        .run();
    });
  }

  async compressVideoInBackground(mediaId: string, inputPath: string, outputPath: string): Promise<void> {
    try {
      await this.compressVideo(inputPath, path.basename(outputPath), path.basename(path.dirname(outputPath)));

      // Update media record
      await this.mediaRepository.update(mediaId, {
        compressionStatus: 'Completed',
      });

      // Calculate size difference
      const originalStats = await fs.promises.stat(inputPath);
      const compressedStats = await fs.promises.stat(outputPath);
      const sizeReduction = ((originalStats.size - compressedStats.size) / originalStats.size) * 100;

      console.log(`Video compression completed for media ${mediaId}. Size reduced: ${sizeReduction.toFixed(2)}%`);
    } catch (error) {
      console.error(`Video compression failed for media ${mediaId}:`, error);
      await this.mediaRepository.update(mediaId, {
        compressionStatus: 'Failed',
      });
    }
  }
}
```

### OTP Controller

```typescript
// packages/api/src/controllers/otp.controller.ts
@Controller('otp')
@UseGuards(FirebaseAuthGuard)
@ApiTags('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('generate/:ticketId')
  @Roles('Technician')
  async generateOTP(
    @Param('ticketId') ticketId: string,
    @Req() req: Request,
  ): Promise<OTP> {
    return this.otpService.generateOTP(ticketId, req.user.id);
  }

  @Post('verify/:ticketId')
  @Roles('Technician')
  async verifyOTP(
    @Param('ticketId') ticketId: string,
    @Body('code') code: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const success = await this.otpService.verifyOTP(ticketId, code, req.user.id);
    return { success };
  }
}
```

### Enhanced Media Controller

```typescript
// packages/api/src/controllers/media.controller.ts
@Controller('media')
@UseGuards(FirebaseAuthGuard)
@ApiTags('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
    @Body('context') context: MediaContext,
    @Req() req: Request,
  ): Promise<Media> {
    return this.mediaService.uploadVideo(file, ticketId, req.user.id, context);
  }

  @Get('video/:id')
  async getVideo(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const range = req.headers.range;
    if (!range) {
      throw new BadRequestException('Range header required');
    }

    const media = await this.mediaService.findById(id);
    if (!media || media.type !== 'Video') {
      throw new NotFoundException('Video not found');
    }

    const videoPath = path.join(
      this.configService.uploadPath,
      'tickets',
      media.ticketId,
      'compressed',
      media.filename,
    );

    const videoSize = fs.statSync(videoPath).size;
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, headers);
    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
  }

  @Get('video/:id/thumbnail')
  async getVideoThumbnail(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.mediaService.findById(id);

    if (!media || media.type !== 'Video' || !media.videoThumbnail) {
      throw new NotFoundException('Video thumbnail not found');
    }

    res.sendFile(media.videoThumbnail, {
      root: this.configService.uploadPath,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  }
}
```

### Technician OTP UI

```dart
// apps/mobile/lib/features/otp/presentation/otp-verification-page.dart
class OTPVerificationPage extends ConsumerStatefulWidget {
  final String ticketId;

  const OTPVerificationPage({super.key, required this.ticketId});

  @override
  ConsumerState<OTPVerificationPage> createState() => _OTPVerificationPageState();
}

class _OTPVerificationPageState extends ConsumerState<OTPVerificationPage> {
  final TextEditingController _otpController = TextEditingController();
  bool _isLoading = false;
  bool _otpGenerated = false;
  DateTime? _otpExpiry;

  Future<void> _generateOTP() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final otp = await ref.read(otpRepositoryProvider).generateOTP(widget.ticketId);

      setState(() {
        _otpGenerated = true;
        _otpExpiry = otp.expiresAt;
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('OTP generated and sent to tenant via email'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _verifyOTP() async {
    if (_otpController.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a 6-digit OTP'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final success = await ref.read(otpRepositoryProvider).verifyOTP(
        widget.ticketId,
        _otpController.text,
      );

      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('OTP verified successfully! Ticket marked as completed.'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OTP Verification'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.verified_user,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 24),
            const Text(
              'Job Completion Verification',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            const Text(
              'Generate an OTP and have the tenant provide it to verify job completion.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            if (!_otpGenerated)
              ElevatedButton(
                onPressed: _isLoading ? null : _generateOTP,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Generate OTP',
                        style: TextStyle(fontSize: 16),
                      ),
              )
            else
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green),
                    ),
                    child: Column(
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green),
                            SizedBox(width: 8),
                            Text(
                              'OTP Generated Successfully',
                              style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        if (_otpExpiry != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Expires in: ${_formatExpiry(_otpExpiry!)}',
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      labelText: 'Enter OTP',
                      border: OutlineInputBorder(),
                      hintText: '6-digit code',
                    ),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24,
                      letterSpacing: 8,
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _verifyOTP,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Verify OTP',
                            style: TextStyle(fontSize: 16),
                          ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: _generateOTP,
                    child: const Text('Generate New OTP'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  String _formatExpiry(DateTime expiry) {
    final now = DateTime.now();
    final difference = expiry.difference(now);

    if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minutes';
    } else {
      return '${difference.inSeconds} seconds';
    }
  }
}
```

### Enhanced Video Support in Tenant App

```dart
// apps/mobile/lib/features/tickets/presentation/video_player_widget.dart
class VideoPlayerWidget extends StatelessWidget {
  final String videoUrl;
  final String? thumbnailUrl;

  const VideoPlayerWidget({
    super.key,
    required this.videoUrl,
    this.thumbnailUrl,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        children: [
          if (thumbnailUrl != null)
            CachedNetworkImage(
              imageUrl: thumbnailUrl!,
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
            )
          else
            Container(
              color: Colors.grey[300],
              child: const Icon(
                Icons.videocam,
                size: 64,
                color: Colors.grey,
              ),
            ),
          Center(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.play_arrow,
                  color: Colors.white,
                  size: 48,
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => VideoFullScreenPage(
                        videoUrl: videoUrl,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class VideoFullScreenPage extends StatefulWidget {
  final String videoUrl;

  const VideoFullScreenPage({super.key, required this.videoUrl});

  @override
  State<VideoFullScreenPage> createState() => _VideoFullScreenPageState();
}

class _VideoFullScreenPageState extends State<VideoFullScreenPage> {
  late VideoPlayerController _controller;
  late Future<void> _initializeVideoPlayerFuture;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    _initializeVideoPlayerFuture = _controller.initialize();
    _controller.setLooping(true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Video'),
      ),
      body: FutureBuilder(
        future: _initializeVideoPlayerFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.done) {
            return Center(
              child: AspectRatio(
                aspectRatio: _controller.value.aspectRatio,
                child: VideoPlayer(_controller),
              ),
            );
          } else {
            return const Center(child: CircularProgressIndicator());
          }
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          setState(() {
            if (_controller.value.isPlaying) {
              _controller.pause();
            } else {
              _controller.play();
            }
          });
        },
        child: Icon(
          _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
        ),
      ),
    );
  }
}
```

## Success Metrics
- ✅ OTP generation works correctly with proper expiration
- ✅ OTP verification updates ticket status to completed
- ✅ Video upload and playback works for all supported formats
- ✅ Video thumbnails are generated and displayed
- ✅ Video compression reduces file sizes while maintaining quality
- ✅ Before/after media upload works for technicians
- ✅ Email notifications are sent with OTP codes
- ✅ All media is properly organized and accessible

## Notes for Developers
- Implement proper video format validation and size limits
- Add support for video streaming with adaptive bitrate
- Consider adding video transcoding for different devices
- Implement proper error handling for video processing failures
- Add support for video editing features (trimming, cropping)
- Consider adding video analytics (view count, engagement)
- Implement proper CDN integration for video delivery
- Add support for live video streaming for real-time consultations
- Consider adding video watermarks for branding
- Implement proper backup and redundancy for video storage
- Add support for video captions and accessibility features
- Consider adding AI-powered video analysis for damage assessment