import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: Redis;
  private readonly isConnected = false;

  constructor() {
    try {
      // Initialize Redis client
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Redis client reconnecting...');
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis client:', error);
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Failed to get value from Redis for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Failed to set value in Redis for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key} from Redis:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Failed to delete keys with pattern ${pattern} from Redis:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key} in Redis:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key} in Redis:`, error);
      return -1;
    }
  }

  async increment(key: string, increment: number = 1): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key} in Redis:`, error);
      return 0;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern} from Redis:`, error);
      return [];
    }
  }

  async flushDb(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.flushdb();
    } catch (error) {
      this.logger.error('Failed to flush Redis database:', error);
    }
  }

  async quit(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.redis.quit();
      } catch (error) {
        this.logger.error('Failed to quit Redis client:', error);
      }
    }
  }

  // Cache helper methods for common use cases
  async getCachedWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, get from fallback
    const value = await fallback();

    // Store in cache for future requests
    await this.set(key, value, ttlSeconds);

    return value;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.delPattern(pattern);
  }

  // Generate cache keys for common patterns
  static generateKeys = {
    userPreferences: (userId: string) => `user:${userId}:preferences`,
    userEmail: (userId: string) => `user:${userId}:email`,
    notificationStats: (userId?: string) => `stats:notifications${userId ? `:${userId}` : ''}`,
    fcmTokens: (userId: string) => `fcm:${userId}:tokens`,
    rateLimit: (identifier: string, endpoint: string) => `rate:${identifier}:${endpoint}`,
    health: (service: string) => `health:${service}`,
  };

  isRedisConnected(): boolean {
    return this.isConnected;
  }
}