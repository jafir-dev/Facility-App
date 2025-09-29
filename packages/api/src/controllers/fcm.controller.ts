import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { FCMService } from '../services/fcm.service';
import { AuthMiddleware, AuthenticatedRequest, AuthorizationMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware, SanitizationMiddleware } from '../middleware/validation.middleware';
import { NotificationRateLimiters } from '../middleware/rate-limit.middleware';

interface RegisterDeviceRequest {
  userId: string;
  fcmToken: string;
  deviceType: 'ios' | 'android';
}

@Controller('fcm')
@UseGuards(AuthMiddleware)
@UseGuards(SanitizationMiddleware)
export class FCMController {
  constructor(private readonly fcmService: FCMService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @UseGuards(NotificationRateLimiters.getFCMDeviceManager())
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async registerDevice(
    @Body() request: RegisterDeviceRequest,
    req: AuthenticatedRequest
  ): Promise<void> {
    // Users can only register devices for themselves
    const userId = req.user.role === 'admin' ? request.userId : req.user.id;

    await this.fcmService.registerDevice(
      userId,
      request.fcmToken,
      request.deviceType
    );
  }

  @Post('unregister')
  @HttpCode(HttpStatus.OK)
  @UseGuards(NotificationRateLimiters.getFCMDeviceManager())
  @UseGuards(AuthorizationMiddleware.requireOwnership)
  async unregisterDevice(
    @Body('userId') userId: string,
    req: AuthenticatedRequest
  ): Promise<void> {
    // Users can only unregister their own devices
    const targetUserId = req.user.role === 'admin' ? userId : req.user.id;
    await this.fcmService.unregisterDevice(targetUserId);
  }
}