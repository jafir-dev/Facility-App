import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../src/notification.module';
import { Notification } from '../src/entities/notification.entity';
import { NotificationPreference } from '../src/entities/notification-preference.entity';
import { NotificationDeliveryLog } from '../src/entities/notification-delivery-log.entity';

describe('NotificationController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'facility_app_test',
          entities: [Notification, NotificationPreference, NotificationDeliveryLog],
          synchronize: true,
        }),
        NotificationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get authentication token (mock implementation)
    authToken = 'Bearer mock-valid-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /notifications/send', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/notifications/send')
        .send({
          recipientId: 'test-user-id',
          type: 'TicketCreated',
          title: 'Test Notification',
          message: 'Test message',
        })
        .expect(401);
    });

    it('should send notification with valid payload', () => {
      const notificationPayload = {
        recipientId: 'test-user-id',
        type: 'TicketCreated',
        title: 'Test Notification',
        message: 'Test message',
        data: {
          ticket: {
            id: 'ticket-123',
            title: 'Test Ticket',
            priority: 'high',
          },
        },
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', authToken)
        .send(notificationPayload)
        .expect(202);
    });

    it('should validate required fields', () => {
      const invalidPayload = {
        recipientId: '',
        type: 'TicketCreated',
        title: 'Test Notification',
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', authToken)
        .send(invalidPayload)
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      const notificationPayload = {
        recipientId: 'test-user-id',
        type: 'TicketCreated',
        title: 'Test Notification',
        message: 'Test message',
      };

      // Send multiple requests quickly to trigger rate limiting
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/notifications/send')
          .set('Authorization', authToken)
          .send(notificationPayload)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(response => response.status === 429);

      expect(rateLimitedResponse).toBeDefined();
    });
  });

  describe('POST /notifications/send-bulk', () => {
    it('should send bulk notifications', () => {
      const bulkPayloads = Array(5).fill(null).map((_, i) => ({
        recipientId: `user-${i}`,
        type: 'TicketCreated',
        title: `Test Notification ${i}`,
        message: `Test message ${i}`,
      }));

      return request(app.getHttpServer())
        .post('/notifications/send-bulk')
        .set('Authorization', authToken)
        .send(bulkPayloads)
        .expect(202);
    });

    it('should validate bulk payload limits', () => {
      const tooManyPayloads = Array(1001).fill(null).map((_, i) => ({
        recipientId: `user-${i}`,
        type: 'TicketCreated',
        title: `Test Notification ${i}`,
        message: `Test message ${i}`,
      }));

      return request(app.getHttpServer())
        .post('/notifications/send-bulk')
        .set('Authorization', authToken)
        .send(tooManyPayloads)
        .expect(400);
    });
  });

  describe('GET /notifications/in-app', () => {
    it('should get user notifications', () => {
      return request(app.getHttpServer())
        .get('/notifications/in-app?userId=test-user-id&limit=10&offset=0')
        .set('Authorization', authToken)
        .expect(200);
    });

    it('should validate query parameters', () => {
      return request(app.getHttpServer())
        .get('/notifications/in-app') // Missing required userId
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('PUT /notifications/in-app/:id/read', () => {
    it('should mark notification as read', () => {
      return request(app.getHttpServer())
        .put('/notifications/in-app/test-notification-id/read')
        .set('Authorization', authToken)
        .send({ userId: 'test-user-id' })
        .expect(200);
    });
  });

  describe('Notification Preferences', () => {
    const userId = 'test-user-id';

    it('should get user preferences', () => {
      return request(app.getHttpServer())
        .get(`/notifications/preferences/${userId}`)
        .set('Authorization', authToken)
        .expect(200);
    });

    it('should update user preferences', () => {
      const preferences = {
        pushEnabled: false,
        emailEnabled: true,
        inAppEnabled: true,
      };

      return request(app.getHttpServer())
        .put(`/notifications/preferences/${userId}`)
        .set('Authorization', authToken)
        .send(preferences)
        .expect(200);
    });

    it('should enable notification channel', () => {
      return request(app.getHttpServer())
        .post(`/notifications/preferences/${userId}/enable/push`)
        .set('Authorization', authToken)
        .expect(200);
    });

    it('should disable notification channel', () => {
      return request(app.getHttpServer())
        .post(`/notifications/preferences/${userId}/disable/email`)
        .set('Authorization', authToken)
        .expect(200);
    });
  });

  describe('FCM Device Management', () => {
    it('should register FCM device', () => {
      const deviceRequest = {
        userId: 'test-user-id',
        fcmToken: 'test-fcm-token',
        deviceType: 'ios',
      };

      return request(app.getHttpServer())
        .post('/fcm/register')
        .set('Authorization', authToken)
        .send(deviceRequest)
        .expect(200);
    });

    it('should unregister FCM device', () => {
      return request(app.getHttpServer())
        .post('/fcm/unregister')
        .set('Authorization', authToken)
        .send({ userId: 'test-user-id' })
        .expect(200);
    });
  });

  describe('Health Checks', () => {
    it('should pass basic health check', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });

    it('should pass liveness check', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200);
    });

    it('should pass readiness check', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200);
    });

    it('should require authentication for notification health', () => {
      return request(app.getHttpServer())
        .get('/health/notifications')
        .expect(401);
    });

    it('should get notification health with authentication', () => {
      return request(app.getHttpServer())
        .get('/health/notifications')
        .set('Authorization', authToken)
        .expect(200);
    });

    it('should require admin role for metrics', () => {
      return request(app.getHttpServer())
        .get('/health/metrics')
        .set('Authorization', authToken)
        .expect(403); // Forbidden for non-admin
    });
  });

  describe('Notification Stats', () => {
    it('should get delivery statistics', () => {
      return request(app.getHttpServer())
        .get('/notifications/stats')
        .set('Authorization', authToken)
        .expect(200);
    });

    it('should get failed deliveries', () => {
      return request(app.getHttpServer())
        .get('/notifications/failed')
        .set('Authorization', authToken)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', () => {
      return request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle invalid notification type', () => {
      const invalidPayload = {
        recipientId: 'test-user-id',
        type: 'InvalidType',
        title: 'Test Notification',
        message: 'Test message',
      };

      return request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', authToken)
        .send(invalidPayload)
        .expect(400);
    });
  });
});