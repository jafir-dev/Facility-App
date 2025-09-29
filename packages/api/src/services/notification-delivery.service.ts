import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';
import { NotificationType, NotificationChannel } from '@facility-app/shared-types';

export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface ChannelStats {
  channel: NotificationChannel;
  total: number;
  delivered: number;
  failed: number;
  successRate: number;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
  ) {}

  async logDelivery(
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

  async getDeliveryStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<DeliveryStats> {
    try {
      let whereClause: any = {};

      if (startDate && endDate) {
        whereClause.createdAt = Between(startDate, endDate);
      } else if (startDate) {
        whereClause.createdAt = MoreThan(startDate);
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const [total, delivered, failed] = await Promise.all([
        this.deliveryLogRepository.count({ where: whereClause }),
        this.deliveryLogRepository.count({
          where: { ...whereClause, status: 'Delivered' }
        }),
        this.deliveryLogRepository.count({
          where: { ...whereClause, status: 'Failed' }
        }),
      ]);

      const pending = total - delivered - failed;
      const successRate = total > 0 ? (delivered / total) * 100 : 0;

      return {
        total,
        delivered,
        failed,
        pending,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get delivery stats:', error);
      throw error;
    }
  }

  async getChannelStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<ChannelStats[]> {
    try {
      let whereClause: any = {};

      if (startDate && endDate) {
        whereClause.createdAt = Between(startDate, endDate);
      } else if (startDate) {
        whereClause.createdAt = MoreThan(startDate);
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const channels: NotificationChannel[] = ['Push', 'Email', 'InApp'];
      const stats: ChannelStats[] = [];

      for (const channel of channels) {
        const [total, delivered, failed] = await Promise.all([
          this.deliveryLogRepository.count({
            where: { ...whereClause, channel }
          }),
          this.deliveryLogRepository.count({
            where: { ...whereClause, channel, status: 'Delivered' }
          }),
          this.deliveryLogRepository.count({
            where: { ...whereClause, channel, status: 'Failed' }
          }),
        ]);

        const successRate = total > 0 ? (delivered / total) * 100 : 0;

        stats.push({
          channel,
          total,
          delivered,
          failed,
          successRate: Math.round(successRate * 100) / 100,
        });
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get channel stats:', error);
      throw error;
    }
  }

  async getNotificationTypeStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<Array<{ type: NotificationType; stats: DeliveryStats }>> {
    try {
      let whereClause: any = {};

      if (startDate && endDate) {
        whereClause.createdAt = Between(startDate, endDate);
      } else if (startDate) {
        whereClause.createdAt = MoreThan(startDate);
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const types: NotificationType[] = [
        'TicketCreated',
        'TicketAssigned',
        'TicketStatusChanged',
        'TicketCompleted',
        'QuoteCreated',
        'QuoteApproved',
        'QuoteDeclined',
        'OTPRequested',
        'MediaUploaded',
        'MessageReceived'
      ];

      const stats = [];

      for (const type of types) {
        const [total, delivered, failed] = await Promise.all([
          this.deliveryLogRepository.count({
            where: { ...whereClause, notificationType: type }
          }),
          this.deliveryLogRepository.count({
            where: { ...whereClause, notificationType: type, status: 'Delivered' }
          }),
          this.deliveryLogRepository.count({
            where: { ...whereClause, notificationType: type, status: 'Failed' }
          }),
        ]);

        const pending = total - delivered - failed;
        const successRate = total > 0 ? (delivered / total) * 100 : 0;

        stats.push({
          type,
          stats: {
            total,
            delivered,
            failed,
            pending,
            successRate: Math.round(successRate * 100) / 100,
          },
        });
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get notification type stats:', error);
      throw error;
    }
  }

  async getFailedDeliveries(
    limit = 50,
    offset = 0,
    notificationType?: NotificationType,
    channel?: NotificationChannel
  ): Promise<NotificationDeliveryLog[]> {
    try {
      const whereClause: any = { status: 'Failed' };

      if (notificationType) {
        whereClause.notificationType = notificationType;
      }

      if (channel) {
        whereClause.channel = channel;
      }

      return await this.deliveryLogRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error('Failed to get failed deliveries:', error);
      throw error;
    }
  }

  async cleanupOldLogs(daysOld = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.deliveryLogRepository.delete({
        createdAt: { $lt: cutoffDate }
      });

      this.logger.log(`Cleaned up ${result.affected} old delivery log entries`);
    } catch (error) {
      this.logger.error('Failed to cleanup old delivery logs:', error);
      throw error;
    }
  }
}