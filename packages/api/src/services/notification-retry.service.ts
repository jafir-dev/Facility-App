import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';
import { NotificationService } from './notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, NotificationChannel } from '@facility-app/shared-types';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
}

export interface QueuedRetry {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  attempt: number;
  nextRetryAt: Date;
  payload: any;
}

@Injectable()
export class NotificationRetryService implements OnModuleInit {
  private readonly logger = new Logger(NotificationRetryService.name);
  private readonly retryQueue: Map<string, QueuedRetry> = new Map();
  private readonly defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
  };

  constructor(
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.loadFailedDeliveriesForRetry();
  }

  async queueRetry(
    deliveryLog: NotificationDeliveryLog,
    payload: any
  ): Promise<void> {
    const config = this.getRetryConfig(deliveryLog.notificationType);

    if (deliveryLog.status !== 'Failed') {
      return;
    }

    // Count previous attempts
    const attemptCount = await this.countPreviousAttempts(
      deliveryLog.userId,
      deliveryLog.notificationType,
      deliveryLog.channel
    );

    if (attemptCount >= config.maxRetries) {
      this.logger.warn(
        `Max retries exceeded for ${deliveryLog.notificationType} notification to user ${deliveryLog.userId}`
      );
      return;
    }

    const nextRetryAt = this.calculateNextRetry(attemptCount, config);
    const retryId = `${deliveryLog.id}-${attemptCount + 1}`;

    const retry: QueuedRetry = {
      id: retryId,
      userId: deliveryLog.userId,
      notificationType: deliveryLog.notificationType as NotificationType,
      channel: deliveryLog.channel as NotificationChannel,
      attempt: attemptCount + 1,
      nextRetryAt,
      payload,
    };

    this.retryQueue.set(retryId, retry);
    this.logger.log(
      `Queued retry ${retryId} for ${deliveryLog.notificationType} notification to user ${deliveryLog.userId} at ${nextRetryAt}`
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue(): Promise<void> {
    const now = new Date();
    const readyRetries: QueuedRetry[] = [];

    // Find ready retries
    for (const [retryId, retry] of this.retryQueue.entries()) {
      if (retry.nextRetryAt <= now) {
        readyRetries.push(retry);
        this.retryQueue.delete(retryId);
      }
    }

    // Process ready retries
    for (const retry of readyRetries) {
      try {
        await this.processRetry(retry);
      } catch (error) {
        this.logger.error(`Failed to process retry ${retry.id}:`, error);
      }
    }

    if (readyRetries.length > 0) {
      this.logger.log(`Processed ${readyRetries.length} retry attempts`);
    }
  }

  private async processRetry(retry: QueuedRetry): Promise<void> {
    this.logger.log(
      `Processing retry ${retry.id} (attempt ${retry.attempt}) for ${retry.notificationType} notification`
    );

    try {
      await this.notificationService.sendNotification(retry.payload);

      await this.deliveryLogRepository.save({
        userId: retry.userId,
        notificationType: retry.notificationType,
        channel: retry.channel,
        status: 'Delivered',
        errorMessage: `Retried successfully on attempt ${retry.attempt}`,
      });

      this.logger.log(
        `Retry ${retry.id} succeeded for ${retry.notificationType} notification to user ${retry.userId}`
      );
    } catch (error) {
      await this.deliveryLogRepository.save({
        userId: retry.userId,
        notificationType: retry.notificationType,
        channel: retry.channel,
        status: 'Failed',
        errorMessage: `Retry attempt ${retry.attempt} failed: ${error.message}`,
      });

      this.logger.error(
        `Retry ${retry.id} failed for ${retry.notificationType} notification to user ${retry.userId}:`,
        error
      );

      // Queue another retry if we haven't exceeded max retries
      const config = this.getRetryConfig(retry.notificationType);
      if (retry.attempt < config.maxRetries) {
        const nextRetryAt = this.calculateNextRetry(retry.attempt, config);
        const newRetryId = `${retry.id.split('-')[0]}-${retry.attempt + 1}`;

        const newRetry: QueuedRetry = {
          ...retry,
          id: newRetryId,
          attempt: retry.attempt + 1,
          nextRetryAt,
        };

        this.retryQueue.set(newRetryId, newRetry);
        this.logger.log(
          `Queued additional retry ${newRetryId} for ${retry.notificationType} notification`
        );
      }
    }
  }

  private async loadFailedDeliveriesForRetry(): Promise<void> {
    try {
      const recentFailures = await this.deliveryLogRepository.find({
        where: {
          status: 'Failed',
          createdAt: LessThan(new Date(Date.now() - 5 * 60 * 1000)), // Last 5 minutes
        },
        order: { createdAt: 'DESC' },
        take: 100,
      });

      this.logger.log(`Found ${recentFailures.length} recent failed deliveries to consider for retry`);

      for (const failure of recentFailures) {
        // Only queue recent failures (within the last hour)
        const failureAge = Date.now() - failure.createdAt.getTime();
        if (failureAge < 60 * 60 * 1000) { // 1 hour
          // Note: We don't have the original payload here, so we'd need to store it separately
          // in a real implementation. For now, we'll just log that we found a failed delivery.
          this.logger.log(
            `Found failed delivery for user ${failure.userId}: ${failure.notificationType} via ${failure.channel}`
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to load failed deliveries for retry:', error);
    }
  }

  private async countPreviousAttempts(
    userId: string,
    notificationType: string,
    channel: string
  ): Promise<number> {
    return await this.deliveryLogRepository.count({
      where: {
        userId,
        notificationType,
        channel,
        status: 'Failed',
      },
    });
  }

  private calculateNextRetry(attempt: number, config: RetryConfig): Date {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );

    const nextRetryAt = new Date(Date.now() + delay);
    return nextRetryAt;
  }

  private getRetryConfig(notificationType: NotificationType): RetryConfig {
    // Different retry configurations for different notification types
    const configs: Record<NotificationType, Partial<RetryConfig>> = {
      OTPRequested: {
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 10000,
      },
      TicketCreated: {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 300000,
      },
      TicketAssigned: {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 300000,
      },
      // Default config for other types
    };

    return {
      ...this.defaultConfig,
      ...(configs[notificationType] || {}),
    };
  }

  getQueueStatus(): { queueSize: number; nextRetryTime?: Date } {
    let nextRetryTime: Date | undefined;

    for (const retry of this.retryQueue.values()) {
      if (!nextRetryTime || retry.nextRetryAt < nextRetryTime) {
        nextRetryTime = retry.nextRetryAt;
      }
    }

    return {
      queueSize: this.retryQueue.size,
      nextRetryTime,
    };
  }
}