import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RateLimitRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface RateLimitData {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware {
  private readonly store = new Map<string, RateLimitData>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly windowMs: number = 60000, // 1 minute
    private readonly maxRequests: number = 100,
    private readonly skipSuccessfulRequests: boolean = false
  ) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  use(req: RateLimitRequest, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let data = this.store.get(key);

    if (!data || data.resetTime < windowStart) {
      data = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.store.set(key, data);
    }

    data.count++;

    const remainingRequests = Math.max(0, this.maxRequests - data.count);
    const resetTime = Math.ceil((data.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remainingRequests.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (data.count > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: resetTime
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Skip successful requests from counting if configured
    if (this.skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        if (res.statusCode < 400) {
          data.count--;
        }
        originalEnd.call(res, chunk, encoding);
      };
    }

    next();
  }

  private getKey(req: RateLimitRequest): string {
    // Use user ID if authenticated, otherwise use IP address
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
    return `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, data] of this.store.entries()) {
      if (data.resetTime < windowStart) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters for different endpoints
export class NotificationRateLimiters {
  // Strict rate limiting for sending notifications
  static getNotificationSender() {
    return new RateLimitMiddleware(
      60000, // 1 minute window
      10,    // 10 notifications per minute
      false  // Count all requests
    );
  }

  // Moderate rate limiting for bulk notifications
  static getBulkNotificationSender() {
    return new RateLimitMiddleware(
      300000, // 5 minute window
      3,      // 3 bulk sends per 5 minutes
      false   // Count all requests
    );
  }

  // Lenient rate limiting for reading notifications
  static getNotificationReader() {
    return new RateLimitMiddleware(
      60000, // 1 minute window
      200,   // 200 reads per minute
      true   // Don't count successful reads
    );
  }

  // Moderate rate limiting for preference updates
  static getPreferenceUpdater() {
    return new RateLimitMiddleware(
      60000, // 1 minute window
      20,    // 20 preference updates per minute
      false  // Count all requests
    );
  }

  // Strict rate limiting for FCM device registration
  static getFCMDeviceManager() {
    return new RateLimitMiddleware(
      3600000, // 1 hour window
      5,       // 5 device operations per hour
      false    // Count all requests
    );
  }
}

// Custom rate limit decorator for NestJS
import { applyDecorators } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';

export function RateLimit(windowMs?: number, maxRequests?: number) {
  return applyDecorators(
    UseGuards(new RateLimitMiddleware(windowMs, maxRequests))
  );
}