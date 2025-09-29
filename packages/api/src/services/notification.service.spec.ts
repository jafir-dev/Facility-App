import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { FCMService } from './fcm.service';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { Repository } from 'typeorm';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';
import { NotificationPayload } from '@facility-app/shared-types';

describe('NotificationService', () => {
  let service: NotificationService;
  let fcmService: FCMService;
  let emailService: EmailService;
  let inAppService: InAppNotificationService;
  let notificationRepository: NotificationRepository;
  let deliveryLogRepository: Repository<NotificationDeliveryLog>;

  const mockPayload: NotificationPayload = {
    type: 'TicketCreated',
    title: 'Test Notification',
    message: 'This is a test notification',
    recipientId: 'user-123',
    data: { ticketId: 'ticket-456' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: FCMService,
          useValue: {
            sendPushNotification: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: InAppNotificationService,
          useValue: {
            storeNotification: jest.fn(),
          },
        },
        {
          provide: NotificationRepository,
          useValue: {},
        },
        {
          provide: Repository,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    fcmService = module.get<FCMService>(FCMService);
    emailService = module.get<EmailService>(EmailService);
    inAppService = module.get<InAppNotificationService>(InAppNotificationService);
    notificationRepository = module.get<NotificationRepository>(NotificationRepository);
    deliveryLogRepository = module.get<Repository<NotificationDeliveryLog>>(Repository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send notification through all enabled channels', async () => {
      jest.spyOn(service as any, 'getUserPreferences').mockResolvedValue({
        pushEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
      });

      jest.spyOn(service as any, 'getUserEmail').mockResolvedValue('test@example.com');

      await service.sendNotification(mockPayload);

      expect(fcmService.sendPushNotification).toHaveBeenCalledWith(
        mockPayload.recipientId,
        mockPayload
      );
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        mockPayload
      );
      expect(inAppService.storeNotification).toHaveBeenCalledWith(mockPayload);
    });

    it('should only send through enabled channels', async () => {
      jest.spyOn(service as any, 'getUserPreferences').mockResolvedValue({
        pushEnabled: false,
        emailEnabled: true,
        inAppEnabled: false,
      });

      jest.spyOn(service as any, 'getUserEmail').mockResolvedValue('test@example.com');

      await service.sendNotification(mockPayload);

      expect(fcmService.sendPushNotification).not.toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        mockPayload
      );
      expect(inAppService.storeNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications in batches', async () => {
      const payloads = Array(150).fill(mockPayload).map((p, i) => ({
        ...p,
        recipientId: `user-${i}`,
      }));

      jest.spyOn(service, 'sendNotification').mockResolvedValue(undefined);

      await service.sendBulkNotifications(payloads);

      expect(service.sendNotification).toHaveBeenCalledTimes(150);
    });
  });
});