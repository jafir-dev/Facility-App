import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  NotificationService,
  NotificationPreferenceService,
  InAppNotificationService,
  NotificationDeliveryService
} from '../services';
import {
  NotificationPayload,
  NotificationPreferences,
  InAppNotification
} from '@facility-app/shared-types';
import {
  AuthMiddleware,
  AuthenticatedRequest,
  AuthorizationMiddleware
} from '../middleware/auth.middleware';
import {
  ValidationMiddleware,
  NotificationIdParam,
  UserIdParam,
  UserIdBody,
  NotificationChannelParam,
  NotificationStatsQuery,
  FailedDeliveriesQuery,
  InAppNotificationsQuery,
  SanitizationMiddleware
} from '../middleware/validation.middleware';
import {
  NotificationRateLimiters,
  RateLimit
} from '../middleware/rate-limit.middleware';

@Controller('notifications')
@UseGuards(AuthMiddleware)
@UseGuards(SanitizationMiddleware)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly inAppService: InAppNotificationService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(NotificationRateLimiters.getNotificationSender())
  @UseGuards(AuthorizationMiddleware.requireRole(['admin', 'manager']))
  async sendNotification(
    @Body() payload: NotificationPayload,
    req: AuthenticatedRequest
  ): Promise<void> {
    // Add sender information to payload
    const enhancedPayload = {
      ...payload,
      senderId: req.user.id,
      senderRole: req.user.role,
      propertyId: req.user.propertyId,
      timestamp: new Date()
    };
    await this.notificationService.sendNotification(enhancedPayload);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(NotificationRateLimiters.getBulkNotificationSender())
  @UseGuards(AuthorizationMiddleware.requireRole(['admin', 'manager']))
  async sendBulkNotifications(
    @Body() payloads: NotificationPayload[],
    req: AuthenticatedRequest
  ): Promise<void> {
    // Enhance all payloads with sender information
    const enhancedPayloads = payloads.map(payload => ({
      ...payload,
      senderId: req.user.id,
      senderRole: req.user.role,
      propertyId: req.user.propertyId,
      timestamp: new Date()
    }));
    await this.notificationService.sendBulkNotifications(enhancedPayloads);
  }

  @Get('in-app')
  @UseGuards(NotificationRateLimiters.getNotificationReader())
  @UseGuards(ValidationMiddleware.validateQuery(InAppNotificationsQuery))
  async getInAppNotifications(
    @Query() query: InAppNotificationsQuery,
    req: AuthenticatedRequest
  ): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
    // Users can only access their own notifications
    const userId = req.user.role === 'admin' ? query.userId : req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      this.inAppService.getUserNotifications(userId, query.limit || 20, query.offset || 0),
      this.inAppService.getUnreadCount(userId),
    ]);

    return { notifications, unreadCount };
  }

  @Put('in-app/:id/read')
  @UseGuards(NotificationRateLimiters.getPreferenceUpdater())
  @UseGuards(ValidationMiddleware.validateParams(NotificationIdParam))
  @UseGuards(ValidationMiddleware.validateBody(UserIdBody))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async markAsRead(
    @Param() params: NotificationIdParam,
    @Body() body: UserIdBody,
    req: AuthenticatedRequest
  ): Promise<void> {
    await this.inAppService.markAsRead(params.id, body.userId);
  }

  @Put('in-app/read-all')
  @UseGuards(NotificationRateLimiters.getPreferenceUpdater())
  @UseGuards(ValidationMiddleware.validateBody(UserIdBody))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async markAllAsRead(
    @Body() body: UserIdBody,
    req: AuthenticatedRequest
  ): Promise<void> {
    await this.inAppService.markAllAsRead(body.userId);
  }

  @Get('preferences/:userId')
  @UseGuards(NotificationRateLimiters.getNotificationReader())
  @UseGuards(ValidationMiddleware.validateParams(UserIdParam))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async getPreferences(
    @Param() params: UserIdParam,
    req: AuthenticatedRequest
  ): Promise<NotificationPreferences> {
    return await this.preferenceService.getUserPreferences(params.userId);
  }

  @Put('preferences/:userId')
  @UseGuards(NotificationRateLimiters.getPreferenceUpdater())
  @UseGuards(ValidationMiddleware.validateParams(UserIdParam))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async updatePreferences(
    @Param() params: UserIdParam,
    @Body() preferences: Partial<NotificationPreferences>,
    req: AuthenticatedRequest
  ): Promise<NotificationPreferences> {
    return await this.preferenceService.updatePreferences(params.userId, preferences);
  }

  @Post('preferences/:userId/enable/:channel')
  @UseGuards(NotificationRateLimiters.getPreferenceUpdater())
  @UseGuards(ValidationMiddleware.validateParams(UserIdParam))
  @UseGuards(ValidationMiddleware.validateParams(NotificationChannelParam))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async enableChannel(
    @Param() params: UserIdParam & NotificationChannelParam,
    req: AuthenticatedRequest
  ): Promise<NotificationPreferences> {
    return await this.preferenceService.enableChannel(params.userId, params.channel);
  }

  @Post('preferences/:userId/disable/:channel')
  @UseGuards(NotificationRateLimiters.getPreferenceUpdater())
  @UseGuards(ValidationMiddleware.validateParams(UserIdParam))
  @UseGuards(ValidationMiddleware.validateParams(NotificationChannelParam))
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async disableChannel(
    @Param() params: UserIdParam & NotificationChannelParam,
    req: AuthenticatedRequest
  ): Promise<NotificationPreferences> {
    return await this.preferenceService.disableChannel(params.userId, params.channel);
  }

  @Get('stats')
  @UseGuards(NotificationRateLimiters.getNotificationReader())
  @UseGuards(ValidationMiddleware.validateQuery(NotificationStatsQuery))
  @UseGuards(AuthorizationMiddleware.requireRole(['admin', 'manager']))
  async getDeliveryStats(
    @Query() query: NotificationStatsQuery,
    req: AuthenticatedRequest
  ) {
    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate ? new Date(query.endDate) : undefined;
    const userId = query.userId || (req.user.role === 'admin' ? undefined : req.user.id);

    const [overallStats, channelStats, typeStats] = await Promise.all([
      this.deliveryService.getDeliveryStats(start, end, userId),
      this.deliveryService.getChannelStats(start, end, userId),
      this.deliveryService.getNotificationTypeStats(start, end, userId),
    ]);

    return {
      overall: overallStats,
      channels: channelStats,
      types: typeStats,
    };
  }

  @Get('failed')
  @UseGuards(NotificationRateLimiters.getNotificationReader())
  @UseGuards(ValidationMiddleware.validateQuery(FailedDeliveriesQuery))
  @UseGuards(AuthorizationMiddleware.requireRole(['admin', 'manager']))
  async getFailedDeliveries(
    @Query() query: FailedDeliveriesQuery,
    req: AuthenticatedRequest
  ) {
    return await this.deliveryService.getFailedDeliveries(
      query.limit || 50,
      query.offset || 0,
      query.type as any,
      query.channel as any
    );
  }
}