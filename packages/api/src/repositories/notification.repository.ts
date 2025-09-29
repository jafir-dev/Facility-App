import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { InAppNotification } from '@facility-app/shared-types';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const notification = this.repository.create(notificationData);
    return await this.repository.save(notification);
  }

  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<InAppNotification[]> {
    const notifications = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return notifications.map(this.mapToInAppNotification);
  }

  async findById(id: string): Promise<Notification | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repository.update(
      { id, userId },
      { readAt: new Date() }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.update(
      { userId, readAt: null },
      { readAt: new Date() }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.repository.count({
      where: { userId, readAt: null }
    });
  }

  async deleteOldNotifications(daysOld = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.repository.delete({
      createdAt: { $lt: cutoffDate }
    });
  }

  private mapToInAppNotification(notification: Notification): InAppNotification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: !!notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}