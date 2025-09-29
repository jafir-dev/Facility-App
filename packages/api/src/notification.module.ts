import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import {
  NotificationService,
  FCMService,
  EmailService,
  EmailTemplateService,
  InAppNotificationService,
  NotificationPreferenceService,
  NotificationDeliveryService,
  NotificationRetryService,
  UserService,
  RedisCacheService
} from './services';

// Controllers
import { NotificationController, FCMController, HealthController } from './controllers';

// Middleware
import {
  AuthMiddleware,
  AuthorizationMiddleware,
  ValidationMiddleware,
  SanitizationMiddleware,
  RateLimitMiddleware,
  NotificationRateLimiters
} from './middleware';

// Entities
import {
  Notification,
  NotificationPreference,
  NotificationDeliveryLog
} from './entities';

// Repositories
import { NotificationRepository } from './repositories';

// Listeners
import {
  TicketEventListener,
  QuoteEventListener,
  AuthEventListener,
  MediaEventListener,
  MessageEventListener
} from './listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      NotificationDeliveryLog,
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    NotificationController,
    FCMController,
    HealthController,
  ],
  providers: [
    NotificationService,
    FCMService,
    EmailService,
    EmailTemplateService,
    InAppNotificationService,
    NotificationPreferenceService,
    NotificationDeliveryService,
    NotificationRetryService,
    UserService,
    RedisCacheService,
    NotificationRepository,
    TicketEventListener,
    QuoteEventListener,
    AuthEventListener,
    MediaEventListener,
    MessageEventListener,
  ],
  exports: [
    NotificationService,
    FCMService,
    EmailService,
    EmailTemplateService,
    InAppNotificationService,
    NotificationPreferenceService,
    NotificationDeliveryService,
    NotificationRetryService,
    UserService,
    RedisCacheService,
    NotificationRepository,
  ],
})
export class NotificationModule {}