import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload, NotificationPreferences, NotificationType, NotificationChannel } from '@facility-app/shared-types';
import { FCMService } from './fcm.service';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { UserService } from './user.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly fcmService: FCMService,
    private readonly emailService: EmailService,
    private readonly inAppService: InAppNotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly userService: UserService,
    private readonly notificationRepository: NotificationRepository,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Validate required fields
      if (!payload.recipientId || !payload.type || !payload.title) {
        throw new Error('Missing required notification fields: recipientId, type, or title');
      }

      // Get user notification preferences
      const preferences = await this.preferenceService.getUserPreferences(payload.recipientId);

      // Send through enabled channels
      const promises: Promise<void>[] = [];

      if (preferences.pushEnabled) {
        promises.push(this.sendWithRetry(
          () => this.fcmService.sendPushNotification(payload.recipientId, payload),
          payload.recipientId,
          payload.type,
          'Push'
        ));
      }

      if (preferences.emailEnabled) {
        const userEmail = await this.getUserEmail(payload.recipientId);
        if (userEmail) {
          promises.push(this.sendWithRetry(
            () => this.emailService.sendEmail(userEmail, payload),
            payload.recipientId,
            payload.type,
            'Email'
          ));
        }
      }

      // Always store in-app notification
      if (preferences.inAppEnabled) {
        promises.push(this.inAppService.storeNotification(payload));
      }

      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${payload.recipientId}:`, error);
      throw error;
    }
  }

  async sendBulkNotifications(payloads: NotificationPayload[]): Promise<void> {
    if (!Array.isArray(payloads) || payloads.length === 0) {
      throw new Error('Invalid payloads: must be a non-empty array');
    }

    if (payloads.length > 1000) {
      throw new Error('Bulk notification limit exceeded: maximum 1000 notifications per request');
    }

    // Validate all payloads first
    for (const payload of payloads) {
      if (!payload.recipientId || !payload.type || !payload.title) {
        throw new Error('Missing required notification fields in one or more payloads');
      }
    }

    // Process notifications in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(payload => this.sendNotification(payload))
      );

      // Add a small delay between batches to prevent rate limiting
      if (i + batchSize < payloads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async sendWithRetry(
    sendFn: () => Promise<void>,
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    maxRetries = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sendFn();
        return;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          await this.logDelivery(userId, notificationType, channel, 'Failed', error.message);
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    return await this.userService.getUserEmail(userId);
  }

  private async logDelivery(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.deliveryLogRepository.save({
        userId,
        notificationType,
        channel,
        status,
        errorMessage,
      });
    } catch (error) {
      this.logger.error('Failed to log notification delivery:', error);
    }
  }
}