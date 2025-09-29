import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator
} from '@nestjs/terminus';
import { NotificationService } from '../services/notification.service';
import { FCMService } from '../services/fcm.service';
import { EmailService } from '../services/email.service';
import { AuthorizationMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly notificationService: NotificationService,
    private readonly fcmService: FCMService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
      () => this.checkNotificationService(),
      () => this.checkFCMService(),
      () => this.checkEmailService(),
    ]);
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkNotificationService(),
    ]);
  }

  @Get('notifications')
  @UseGuards(AuthorizationMiddleware.requireRole(['admin', 'manager']))
  async notificationHealth(): Promise<any> {
    const [
      databaseHealth,
      fcmHealth,
      emailHealth,
      recentFailures,
      queueSize
    ] = await Promise.all([
      this.db.pingCheck('database').catch(() => ({ database: { status: 'down' } })),
      this.checkFCMService().catch(() => ({ fcm: { status: 'down' } })),
      this.checkEmailService().catch(() => ({ email: { status: 'down' } })),
      this.getRecentFailures(),
      this.getQueueSize(),
    ]);

    return {
      status: this.getOverallStatus([databaseHealth, fcmHealth, emailHealth]),
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth.database,
        fcm: fcmHealth.fcm,
        email: emailHealth.email,
      },
      metrics: {
        recentFailures,
        queueSize,
      },
    };
  }

  @Get('metrics')
  @UseGuards(AuthorizationMiddleware.requireRole(['admin']))
  async metrics(): Promise<any> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      notifications24h,
      notifications7d,
      failedDeliveries24h,
      failedDeliveries7d,
      averageResponseTime,
      systemMetrics
    ] = await Promise.all([
      this.getNotificationCount(last24Hours),
      this.getNotificationCount(last7Days),
      this.getFailedDeliveryCount(last24Hours),
      this.getFailedDeliveryCount(last7Days),
      this.getAverageResponseTime(),
      this.getSystemMetrics(),
    ]);

    return {
      timestamp: now.toISOString(),
      metrics: {
        notifications: {
          last24Hours: notifications24h,
          last7Days: notifications7d,
        },
        failures: {
          last24Hours: failedDeliveries24h,
          last7Days: failedDeliveries7d,
          failureRate24h: notifications24h > 0 ? (failedDeliveries24h / notifications24h * 100).toFixed(2) + '%' : '0%',
        },
        performance: {
          averageResponseTime: averageResponseTime + 'ms',
        },
        system: systemMetrics,
      },
    };
  }

  private async checkNotificationService(): Promise<HealthIndicatorFunction> {
    try {
      // Check if we can access the notification service
      await this.notificationService['healthCheck']?.();
      return Promise.resolve({ notification: { status: 'up' } });
    } catch (error) {
      return Promise.resolve({ notification: { status: 'down', message: error.message } });
    }
  }

  private async checkFCMService(): Promise<HealthIndicatorFunction> {
    try {
      // Check FCM service connectivity
      await this.fcmService['healthCheck']?.();
      return Promise.resolve({ fcm: { status: 'up' } });
    } catch (error) {
      return Promise.resolve({ fcm: { status: 'down', message: error.message } });
    }
  }

  private async checkEmailService(): Promise<HealthIndicatorFunction> {
    try {
      // Check email service connectivity
      await this.emailService['healthCheck']?.();
      return Promise.resolve({ email: { status: 'up' } });
    } catch (error) {
      return Promise.resolve({ email: { status: 'down', message: error.message } });
    }
  }

  private getOverallStatus(healthResults: any[]): string {
    const hasDown = healthResults.some(result =>
      Object.values(result).some((service: any) => service.status === 'down')
    );
    return hasDown ? 'degraded' : 'healthy';
  }

  private async getRecentFailures(): Promise<number> {
    // This would query the notification delivery logs for recent failures
    // For now, returning a mock value
    return 0;
  }

  private async getQueueSize(): Promise<number> {
    // This would check the notification queue size
    // For now, returning a mock value
    return 0;
  }

  private async getNotificationCount(since: Date): Promise<number> {
    // This would query the notification count since the given date
    // For now, returning a mock value
    return 0;
  }

  private async getFailedDeliveryCount(since: Date): Promise<number> {
    // This would query the failed delivery count since the given date
    // For now, returning a mock value
    return 0;
  }

  private async getAverageResponseTime(): Promise<number> {
    // This would calculate the average response time
    // For now, returning a mock value
    return 150;
  }

  private async getSystemMetrics(): Promise<any> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      uptime: uptime + 's',
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      },
      cpu: process.cpuUsage(),
    };
  }
}