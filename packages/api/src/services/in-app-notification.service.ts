import { Injectable } from '@nestjs/common';
import { NotificationPayload, InAppNotification } from '@facility-app/shared-types';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class InAppNotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async storeNotification(payload: NotificationPayload): Promise<void> {
    await this.notificationRepository.create({
      userId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      channel: 'InApp',
      status: 'Delivered',
      sentAt: new Date(),
    });
  }

  async getUserNotifications(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<InAppNotification[]> {
    return await this.notificationRepository.findByUserId(userId, limit, offset);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async cleanupOldNotifications(): Promise<void> {
    await this.notificationRepository.deleteOldNotifications();
  }
}