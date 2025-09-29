import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

// Mock event interfaces
interface MediaUploadedEvent {
  media: {
    id: string;
    fileType: string;
    uploadedBy: string;
    ticket: {
      id: string;
      title: string;
      tenantId: string;
    };
  };
}

@Injectable()
export class MediaEventListener {
  private readonly logger = new Logger(MediaEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('media.uploaded')
  async handleMediaUploaded(event: MediaUploadedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'MediaUploaded',
        title: 'New Media Uploaded',
        message: `New media has been uploaded to your maintenance ticket.`,
        recipientId: event.media.ticket.tenantId,
        data: {
          ticketId: event.media.ticket.id,
          media: event.media,
          ticket: event.media.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle media uploaded event:', error);
    }
  }
}