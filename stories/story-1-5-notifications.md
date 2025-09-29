# Story: Notification System

**Story ID**: Story 1-5
**Branch**: `feature/story-1-5`
**Dependencies**: None
**Parallel-safe**: true
**Module**: Notification service
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** user, **I want** to receive notifications for important events, **so that** I stay informed about maintenance ticket updates and actions required from me.

## Acceptance Criteria
1. Push notification integration with Firebase Cloud Messaging (FCM)
2. Email notification system with templates
3. In-app notification system
4. User notification preferences
5. Notification delivery tracking
6. Event-driven notification triggers
7. Notification retry mechanism for failures
8. Notification queue management

## Technical Implementation Details

### Notification Types and Events

```typescript
// packages/shared-types/src/notifications.ts
export type NotificationType =
  | 'TicketCreated'
  | 'TicketAssigned'
  | 'TicketStatusChanged'
  | 'TicketCompleted'
  | 'QuoteCreated'
  | 'QuoteApproved'
  | 'QuoteDeclined'
  | 'OTPRequested'
  | 'MediaUploaded'
  | 'MessageReceived';

export type NotificationChannel = 'Push' | 'Email' | 'InApp';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  recipientId: string;
  ticketId?: string;
}
```

### Notification Service Architecture

```typescript
// packages/api/src/services/notification.service.ts
export class NotificationService {
  constructor(
    private readonly fcmService: FCMService,
    private readonly emailService: EmailService,
    private readonly inAppService: InAppNotificationService,
    private readonly userRepository: UserRepository,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const user = await this.userRepository.findById(payload.recipientId);
    if (!user) return;

    // Get user notification preferences
    const preferences = await this.getUserPreferences(user.id);

    // Send through configured channels
    if (preferences.pushEnabled) {
      await this.fcmService.sendPushNotification(user.id, payload);
    }

    if (preferences.emailEnabled) {
      await this.emailService.sendEmail(user.email, payload);
    }

    // Always store in-app notification
    await this.inAppService.storeNotification(payload);
  }

  async sendBulkNotifications(payloads: NotificationPayload[]): Promise<void> {
    // Process notifications in batches
    const batchSize = 100;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      await Promise.all(batch.map(payload => this.sendNotification(payload)));
    }
  }
}
```

### Firebase Cloud Messaging (FCM) Service

```typescript
// packages/api/src/services/fcm.service.ts
export class FCMService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.fcmToken) return;

    const message: admin.messaging.Message = {
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: payload.data || {},
      token: user.fcmToken,
      android: {
        priority: 'high',
        notification: {
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            priority: 10,
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);
      await this.logDelivery(userId, payload.type, 'Push', 'Delivered');
    } catch (error) {
      await this.logDelivery(userId, payload.type, 'Push', 'Failed', error.message);

      // Remove invalid FCM tokens
      if (error.code === 'messaging/invalid-registration-token') {
        await this.userRepository.update(userId, { fcmToken: null });
      }
    }
  }

  async registerDevice(userId: string, fcmToken: string, deviceType: 'ios' | 'android'): Promise<void> {
    await this.userRepository.update(userId, { fcmToken, deviceType });
  }

  async unregisterDevice(userId: string): Promise<void> {
    await this.userRepository.update(userId, { fcmToken: null, deviceType: null });
  }
}
```

### Email Service

```typescript
// packages/api/src/services/email.service.ts
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {}

  async sendEmail(email: string, payload: NotificationPayload): Promise<void> {
    const template = await this.templateService.getTemplate(payload.type);
    const html = this.templateService.render(template, payload);

    const params: SendEmailCommandInput = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html,
          },
          Text: {
            Charset: 'UTF-8',
            Data: payload.message,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: payload.title,
        },
      },
      Source: this.configService.emailFrom,
    };

    try {
      await this.sesClient.send(new SendEmailCommand(params));
      await this.logDelivery(payload.recipientId, payload.type, 'Email', 'Delivered');
    } catch (error) {
      await this.logDelivery(payload.recipientId, payload.type, 'Email', 'Failed', error.message);
      throw error;
    }
  }
}
```

### Email Templates

```typescript
// packages/api/src/services/email-template.service.ts
export class EmailTemplateService {
  private readonly templates = {
    TicketCreated: `
      <h2>New Maintenance Request</h2>
      <p>A new maintenance ticket has been created for your property.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Description:</strong> {{ticket.description}}</p>
      <p><strong>Priority:</strong> {{ticket.priority}}</p>
      <p>Please log in to view details and track progress.</p>
    `,
    TicketAssigned: `
      <h2>Ticket Assigned to You</h2>
      <p>You have been assigned a new maintenance ticket.</p>
      <p><strong>Ticket:</strong> {{ticket.title}}</p>
      <p><strong>Property:</strong> {{ticket.property}}</p>
      <p><strong>Priority:</strong> {{ticket.priority}}</p>
      <p>Please review and update the status accordingly.</p>
    `,
    // Add more templates for each notification type
  };

  async getTemplate(type: NotificationType): Promise<string> {
    return this.templates[type] || this.templates.Default;
  }

  render(template: string, payload: NotificationPayload): string {
    // Simple template rendering - consider using a proper template engine
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getNestedValue(payload, path) || match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
```

### In-App Notification Service

```typescript
// packages/api/src/services/in-app-notification.service.ts
export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export class InAppNotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async storeNotification(payload: NotificationPayload): Promise<void> {
    await this.notificationRepository.create({
      userId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      isRead: false,
      createdAt: new Date(),
    });
  }

  async getUserNotifications(userId: string, limit = 20, offset = 0): Promise<InAppNotification[]> {
    return this.notificationRepository.findByUserId(userId, limit, offset);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }
}
```

### Event Listeners

```typescript
// packages/api/src/listeners/ticket.listener.ts
@EventsHandler(TicketCreatedEvent)
export class TicketCreatedHandler implements IEventHandler<TicketCreatedEvent> {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async handle(event: TicketCreatedEvent): Promise<void> {
    // Notify tenant
    await this.notificationService.sendNotification({
      type: 'TicketCreated',
      title: 'Maintenance Request Created',
      message: `Your maintenance request "${event.ticket.title}" has been submitted.`,
      recipientId: event.ticket.tenantId,
      data: { ticketId: event.ticket.id },
    });

    // Notify supervisors
    const supervisors = await this.getSupervisorsForProperty(event.ticket.propertyId);
    for (const supervisor of supervisors) {
      await this.notificationService.sendNotification({
        type: 'TicketCreated',
        title: 'New Maintenance Request',
        message: `A new maintenance request has been created for ${event.ticket.propertyName}.`,
        recipientId: supervisor.id,
        data: { ticketId: event.ticket.id },
      });
    }
  }
}
```

### Database Schema for Notifications

```sql
-- Notification Types Enum
CREATE TYPE notification_type AS ENUM (
  'TicketCreated', 'TicketAssigned', 'TicketStatusChanged', 'TicketCompleted',
  'QuoteCreated', 'QuoteApproved', 'QuoteDeclined', 'OTPRequested',
  'MediaUploaded', 'MessageReceived'
);

-- Notification Channels Enum
CREATE TYPE notification_channel AS ENUM ('Push', 'Email', 'InApp');

-- Notifications Table
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "type" notification_type NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "channel" notification_channel NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "sent_at" TIMESTAMP WITH TIME ZONE,
    "read_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Preferences Table
CREATE TABLE "notification_preferences" (
    "user_id" TEXT PRIMARY KEY REFERENCES "users"("id"),
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Delivery Log Table
CREATE TABLE "notification_delivery_log" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "notification_type" notification_type NOT NULL,
    "channel" notification_channel NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON "notifications"("user_id");
CREATE INDEX idx_notifications_type ON "notifications"("type");
CREATE INDEX idx_notifications_created_at ON "notifications"("created_at");
CREATE INDEX idx_delivery_log_user_id ON "notification_delivery_log"("user_id");
```

## Success Metrics
- ✅ Push notifications are delivered to mobile devices
- ✅ Email notifications are sent with proper templates
- ✅ In-app notifications are stored and retrieved
- ✅ User notification preferences are respected
- ✅ Failed notifications are logged and retried
- ✅ Event triggers work correctly
- ✅ Notification delivery is tracked
- ✅ Performance is maintained under load

## Notes for Developers
- Use Firebase Admin SDK for FCM integration
- Consider using a message queue (Redis/RabbitMQ) for high-volume notifications
- Implement proper error handling and retry logic
- Add rate limiting for notification endpoints
- Consider adding notification batching for high-frequency events
- Monitor notification delivery rates and failures
- Test with different device types and platforms
- Consider adding web push notifications for the web portal
- Document notification types and their triggers