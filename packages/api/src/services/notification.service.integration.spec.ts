import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { FCMService } from './fcm.service';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { UserService } from './user.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationPayload, NotificationType } from '@facility-app/shared-types';
import { RedisCacheService } from './redis-cache.service';

describe('NotificationService Integration', () => {
  let service: NotificationService;
  let fcmService: FCMService;
  let emailService: EmailService;
  let inAppService: InAppNotificationService;
  let preferenceService: NotificationPreferenceService;
  let userService: UserService;
  let notificationRepository: NotificationRepository;
  let deliveryLogRepository: Repository<NotificationDeliveryLog>;
  let preferenceRepository: Repository<NotificationPreference>;
  let redisCache: RedisCacheService;

  const mockNotificationPayload: NotificationPayload = {
    recipientId: 'test-user-id',
    type: NotificationType.TicketCreated,
    title: 'Test Notification',
    message: 'This is a test notification',
    data: {
      ticket: {
        id: 'ticket-123',
        title: 'Test Ticket',
        priority: 'high'
      }
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: FCMService,
          useValue: {
            sendPushNotification: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: InAppNotificationService,
          useValue: {
            storeNotification: jest.fn(),
            getUserNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
        {
          provide: NotificationPreferenceService,
          useValue: {
            getUserPreferences: jest.fn(),
            updatePreferences: jest.fn(),
            enableChannel: jest.fn(),
            disableChannel: jest.fn(),
            isChannelEnabled: jest.fn(),
            resetToDefaults: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserEmail: jest.fn(),
            getUserById: jest.fn(),
            getUsersByProperty: jest.fn(),
            isUserActive: jest.fn(),
            getUsersByIds: jest.fn(),
          },
        },
        {
          provide: NotificationRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationDeliveryLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            exists: jest.fn(),
            ttl: jest.fn(),
            increment: jest.fn(),
            getKeys: jest.fn(),
            flushDb: jest.fn(),
            quit: jest.fn(),
            getCachedWithFallback: jest.fn(),
            invalidatePattern: jest.fn(),
            isRedisConnected: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    fcmService = module.get<FCMService>(FCMService);
    emailService = module.get<EmailService>(EmailService);
    inAppService = module.get<InAppNotificationService>(InAppNotificationService);
    preferenceService = module.get<NotificationPreferenceService>(NotificationPreferenceService);
    userService = module.get<UserService>(UserService);
    notificationRepository = module.get<NotificationRepository>(NotificationRepository);
    deliveryLogRepository = module.get<Repository<NotificationDeliveryLog>>(getRepositoryToken(NotificationDeliveryLog));
    redisCache = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('sendNotification', () => {
    it('should send notification through all enabled channels', async () => {
      // Arrange
      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      userService.getUserEmail.mockResolvedValue('test@example.com');
      fcmService.sendPushNotification.mockResolvedValue(undefined);
      emailService.sendEmail.mockResolvedValue(undefined);
      inAppService.storeNotification.mockResolvedValue(undefined);
      deliveryLogRepository.save.mockResolvedValue({} as any);

      // Act
      await service.sendNotification(mockNotificationPayload);

      // Assert
      expect(preferenceService.getUserPreferences).toHaveBeenCalledWith('test-user-id');
      expect(userService.getUserEmail).toHaveBeenCalledWith('test-user-id');
      expect(fcmService.sendPushNotification).toHaveBeenCalledWith('test-user-id', mockNotificationPayload);
      expect(emailService.sendEmail).toHaveBeenCalledWith('test@example.com', mockNotificationPayload);
      expect(inAppService.storeNotification).toHaveBeenCalledWith(mockNotificationPayload);
    });

    it('should only send through enabled channels', async () => {
      // Arrange
      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: false,
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      inAppService.storeNotification.mockResolvedValue(undefined);

      // Act
      await service.sendNotification(mockNotificationPayload);

      // Assert
      expect(fcmService.sendPushNotification).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(inAppService.storeNotification).toHaveBeenCalledWith(mockNotificationPayload);
    });

    it('should handle missing user email gracefully', async () => {
      // Arrange
      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      userService.getUserEmail.mockResolvedValue(null);
      fcmService.sendPushNotification.mockResolvedValue(undefined);
      inAppService.storeNotification.mockResolvedValue(undefined);

      // Act
      await service.sendNotification(mockNotificationPayload);

      // Assert
      expect(fcmService.sendPushNotification).toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(inAppService.storeNotification).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidPayload = {
        ...mockNotificationPayload,
        recipientId: '',
      };

      // Act & Assert
      await expect(service.sendNotification(invalidPayload as any)).rejects.toThrow(
        'Missing required notification fields: recipientId, type, or title'
      );
    });

    it('should retry failed deliveries', async () => {
      // Arrange
      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);

      // Simulate FCM failure then success
      let attemptCount = 0;
      fcmService.sendPushNotification.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('FCM failure');
        }
        return undefined;
      });

      inAppService.storeNotification.mockResolvedValue(undefined);
      deliveryLogRepository.save.mockResolvedValue({} as any);

      // Act
      await service.sendNotification(mockNotificationPayload);

      // Assert
      expect(fcmService.sendPushNotification).toHaveBeenCalledTimes(2);
      expect(inAppService.storeNotification).toHaveBeenCalled();
    });

    it('should log delivery failures', async () => {
      // Arrange
      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      fcmService.sendPushNotification.mockRejectedValue(new Error('Persistent FCM failure'));
      inAppService.storeNotification.mockResolvedValue(undefined);

      const mockDeliveryLog = {
        userId: 'test-user-id',
        notificationType: NotificationType.TicketCreated,
        channel: 'Push',
        status: 'Failed',
        errorMessage: 'Persistent FCM failure',
      };

      deliveryLogRepository.save.mockResolvedValue(mockDeliveryLog);

      // Act & Assert
      await expect(service.sendNotification(mockNotificationPayload)).rejects.toThrow('Persistent FCM failure');
      expect(deliveryLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          notificationType: NotificationType.TicketCreated,
          channel: 'Push',
          status: 'Failed',
          errorMessage: 'Persistent FCM failure',
        })
      );
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications in batches', async () => {
      // Arrange
      const payloads = Array.from({ length: 150 }, (_, i) => ({
        ...mockNotificationPayload,
        recipientId: `user-${i}`,
      }));

      const mockPreferences = {
        userId: 'test-user-id',
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      preferenceService.getUserPreferences.mockResolvedValue(mockPreferences);
      fcmService.sendPushNotification.mockResolvedValue(undefined);
      inAppService.storeNotification.mockResolvedValue(undefined);

      // Act
      await service.sendBulkNotifications(payloads);

      // Assert
      expect(fcmService.sendPushNotification).toHaveBeenCalledTimes(150);
      expect(inAppService.storeNotification).toHaveBeenCalledTimes(150);
    });

    it('should validate payload array', async () => {
      // Act & Assert
      await expect(service.sendBulkNotifications([])).rejects.toThrow(
        'Invalid payloads: must be a non-empty array'
      );
    });

    it('should enforce bulk notification limit', async () => {
      // Arrange
      const payloads = Array.from({ length: 1001 }, (_, i) => ({
        ...mockNotificationPayload,
        recipientId: `user-${i}`,
      }));

      // Act & Assert
      await expect(service.sendBulkNotifications(payloads)).rejects.toThrow(
        'Bulk notification limit exceeded: maximum 1000 notifications per request'
      );
    });
  });

  describe('health check', () => {
    it('should perform health check successfully', async () => {
      // Arrange
      preferenceService.healthCheck.mockResolvedValue(undefined);
      fcmService.healthCheck.mockResolvedValue(undefined);
      emailService.healthCheck.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service['healthCheck']()).resolves.not.toThrow();
    });

    it('should handle health check failures', async () => {
      // Arrange
      preferenceService.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      await expect(service['healthCheck']()).rejects.toThrow('Service unavailable');
    });
  });
});