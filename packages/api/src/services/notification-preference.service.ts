import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationPreferences } from '@facility-app/shared-types';
import { RedisCacheService } from './redis-cache.service';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    private readonly redisCache: RedisCacheService,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const cacheKey = RedisCacheService.generateKeys.userPreferences(userId);

    return await this.redisCache.getCachedWithFallback(
      cacheKey,
      async () => {
        try {
          let preference = await this.preferenceRepository.findOne({
            where: { userId }
          });

          if (!preference) {
            // Create default preferences if none exist
            preference = await this.createDefaultPreferences(userId);
          }

          return this.mapToNotificationPreferences(preference);
        } catch (error) {
          this.logger.error(`Failed to get preferences for user ${userId}:`, error);
          // Return default preferences on error
          return this.getDefaultPreferences(userId);
        }
      },
      1800 // 30 minutes cache
    );
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      await this.preferenceRepository.update(
        { userId },
        {
          pushEnabled: preferences.pushEnabled,
          emailEnabled: preferences.emailEnabled,
          inAppEnabled: preferences.inAppEnabled,
        }
      );

      // Invalidate cache
      const cacheKey = RedisCacheService.generateKeys.userPreferences(userId);
      await this.redisCache.del(cacheKey);

      return await this.getUserPreferences(userId);
    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}:`, error);
      throw error;
    }
  }

  async enableChannel(userId: string, channel: 'push' | 'email' | 'inApp'): Promise<NotificationPreferences> {
    const updateField = `${channel}Enabled`;
    await this.preferenceRepository.update(
      { userId },
      { [updateField]: true }
    );

    // Invalidate cache
    const cacheKey = RedisCacheService.generateKeys.userPreferences(userId);
    await this.redisCache.del(cacheKey);

    return await this.getUserPreferences(userId);
  }

  async disableChannel(userId: string, channel: 'push' | 'email' | 'inApp'): Promise<NotificationPreferences> {
    const updateField = `${channel}Enabled`;
    await this.preferenceRepository.update(
      { userId },
      { [updateField]: false }
    );

    // Invalidate cache
    const cacheKey = RedisCacheService.generateKeys.userPreferences(userId);
    await this.redisCache.del(cacheKey);

    return await this.getUserPreferences(userId);
  }

  async isChannelEnabled(userId: string, channel: 'push' | 'email' | 'inApp'): Promise<boolean> {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { userId },
        select: [`${channel}Enabled` as keyof NotificationPreference]
      });

      return preference ? preference[`${channel}Enabled`] : true; // Default to enabled
    } catch (error) {
      this.logger.error(`Failed to check channel status for user ${userId}:`, error);
      return true; // Default to enabled on error
    }
  }

  async resetToDefaults(userId: string): Promise<NotificationPreferences> {
    const defaults = this.getDefaultPreferences(userId);
    await this.updatePreferences(userId, defaults);
    return await this.getUserPreferences(userId);
  }

  // Add health check method
  async healthCheck(): Promise<void> {
    try {
      // Check if we can access the database
      await this.preferenceRepository.count();

      // Check if Redis is connected
      if (this.redisCache.isRedisConnected()) {
        // Try a simple Redis operation
        await this.redisCache.get('health-check');
      }
    } catch (error) {
      throw new Error(`Notification preference service health check failed: ${error.message}`);
    }
  }

  private async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const preference = this.preferenceRepository.create({
      userId,
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
    });

    return await this.preferenceRepository.save(preference);
  }

  private mapToNotificationPreferences(preference: NotificationPreference): NotificationPreferences {
    return {
      userId: preference.userId,
      pushEnabled: preference.pushEnabled,
      emailEnabled: preference.emailEnabled,
      inAppEnabled: preference.inAppEnabled,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    const now = new Date();
    return {
      userId,
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }
}