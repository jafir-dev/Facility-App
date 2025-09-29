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

## Dev Agent Record

### Tasks Completed
- [x] Set up workspace structure with packages (api, shared-types, database)
- [x] Create shared notification types and interfaces
- [x] Set up database schema for notifications
- [x] Implement FCM service for push notifications
- [x] Implement email service with templates
- [x] Implement in-app notification service
- [x] Create main notification service orchestration
- [x] Implement event listeners for notification triggers
- [x] Create notification preferences system
- [x] Add notification delivery tracking and logging
- [x] Implement retry mechanism for failed notifications
- [x] Create tests for notification services

### QA Fixes Applied (2025-09-30)
**CRITICAL SECURITY IMPROVEMENTS:**
- [x] **Authentication & Authorization**: Implemented comprehensive authentication middleware with JWT token validation and role-based access control
- [x] **Input Validation**: Added robust input validation and sanitization for all notification payloads using class-validator and custom sanitization middleware
- [x] **Rate Limiting**: Implemented sophisticated rate limiting with different limits for various notification endpoints (send, bulk-send, read, preferences, FCM)
- [x] **Template Injection Protection**: Added comprehensive template variable sanitization to prevent XSS and injection attacks in email templates

**IMPLEMENTATION COMPLETION:**
- [x] **Real Database Integration**: Replaced all mock implementations with real database connections using TypeORM repositories
- [x] **User Service Integration**: Created comprehensive user service for email lookup and user management
- [x] **Enhanced Error Handling**: Added detailed validation and error handling with proper HTTP status codes

**PERFORMANCE & OPERATIONAL IMPROVEMENTS:**
- [x] **Redis Caching**: Implemented Redis caching layer for user preferences with cache invalidation strategies
- [x] **Health Checks**: Created comprehensive health check endpoints (/health, /health/liveness, /health/readiness, /health/notifications)
- [x] **Monitoring**: Added detailed metrics endpoint with system performance indicators and notification analytics
- [x] **Dependency Management**: Updated package.json with all required dependencies including NestJS, Redis, validation libraries

**TESTING ENHANCEMENTS:**
- [x] **Integration Tests**: Created comprehensive integration tests for notification service covering all channels and error scenarios
- [x] **E2E Tests**: Implemented end-to-end tests covering complete notification flows with authentication, validation, and rate limiting
- [x] **Test Coverage**: Added tests for security middleware, validation, caching, and health checks

**ENHANCED SECURITY FEATURES:**
- [x] **Role-Based Access**: Admin/Manager/User role restrictions for different endpoints
- [x] **Ownership Validation**: Users can only access their own notifications and preferences
- [x] **Property Access Control**: Property-based access restrictions for multi-tenant environment
- [x] **Data Sanitization**: Comprehensive sanitization of all user inputs to prevent XSS and injection attacks
- [x] **Error Message Sanitization**: Proper error handling without exposing sensitive information

**NEW FILES CREATED:**
- `middleware/auth.middleware.ts` - Authentication and authorization middleware
- `middleware/validation.middleware.ts` - Input validation and sanitization
- `middleware/rate-limit.middleware.ts` - Rate limiting implementation
- `services/user.service.ts` - User management service
- `services/redis-cache.service.ts` - Redis caching service
- `controllers/health.controller.ts` - Health check and monitoring endpoints
- `services/notification.service.integration.spec.ts` - Integration tests
- `e2e/notifications.e2e.spec.ts` - End-to-end tests

**ENHANCED EXISTING FILES:**
- Updated all controllers with security middleware and validation
- Enhanced notification service with real integrations and validation
- Improved email template service with sanitization
- Added caching to notification preference service
- Updated notification module with new services and dependencies

### Debug Log References
- Initial implementation completed without major issues
- QA review identified critical security gaps that have been addressed
- All mock implementations successfully replaced with real integrations
- Comprehensive testing added for all new security and performance features

### Completion Notes
- ✅ **All acceptance criteria implemented** with enterprise-grade security
- ✅ **Complete notification system** with multi-channel support and robust security
- ✅ **Event-driven architecture** with proper listeners and error handling
- ✅ **Enhanced security** with authentication, authorization, validation, and rate limiting
- ✅ **Performance optimized** with Redis caching and monitoring
- ✅ **Production ready** with comprehensive testing, health checks, and monitoring
- ✅ **QA compliance** - All critical and high-priority QA issues resolved

### Change Log
**Initial Implementation (Completed):**
- Created monorepo structure with TypeScript packages
- Implemented complete notification system architecture
- Added comprehensive error handling and retry logic
- Created database schema with proper indexing
- Implemented email template system
- Added FCM integration with device management
- Created in-app notification storage and retrieval
- Added notification preferences system
- Implemented delivery tracking and analytics
- Added retry mechanism with queue management
- Created comprehensive test coverage

**QA Fixes Applied (2025-09-30):**
- Implemented comprehensive security middleware and validation
- Added rate limiting and request throttling
- Replaced all mock implementations with real integrations
- Added Redis caching for performance optimization
- Implemented health check and monitoring endpoints
- Created integration and end-to-end test coverage
- Enhanced template security and sanitization
- Added user service and improved database integration
- Updated dependencies and module configuration

### File List
#### packages/shared-types/src/
- `notifications.ts` - Notification types and interfaces
- `index.ts` - Package exports

#### packages/database/migrations/
- `001_create_notifications_tables.sql` - Database schema

#### packages/api/src/
- `services/notification.service.ts` - Main notification service
- `services/fcm.service.ts` - Firebase Cloud Messaging service
- `services/email.service.ts` - Email notification service
- `services/email-template.service.ts` - Email template service
- `services/in-app-notification.service.ts` - In-app notification service
- `services/notification-preference.service.ts` - User preferences service
- `services/notification-delivery.service.ts` - Delivery tracking service
- `services/notification-retry.service.ts` - Retry mechanism service
- `entities/notification.entity.ts` - Notification entity
- `entities/notification-preference.entity.ts` - Preference entity
- `entities/notification-delivery-log.entity.ts` - Delivery log entity
- `repositories/notification.repository.ts` - Notification repository
- `controllers/notification.controller.ts` - Main notification controller
- `controllers/fcm.controller.ts` - FCM device management controller
- `listeners/ticket.listener.ts` - Ticket event listeners
- `listeners/quote.listener.ts` - Quote event listeners
- `listeners/auth.listener.ts` - Auth event listeners
- `listeners/media.listener.ts` - Media event listeners
- `listeners/message.listener.ts` - Message event listeners
- `notification.module.ts` - Notification module
- `services/notification.service.spec.ts` - Unit tests
- `jest.config.js` - Jest configuration

#### Root files
- `package.json` - Workspace configuration
- `tsconfig.json` - TypeScript configuration

### Status
**Status**: Ready for Review

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

## QA Results

### Review Summary
**Review Date**: 2025-09-30
**Reviewer**: Claude QA Agent
**Decision**: CONDITIONAL APPROVAL

### Acceptance Criteria Status
✅ **All 8 acceptance criteria met** - The implementation fully satisfies all functional requirements for the notification system.

### Quality Assessment
- **Code Quality**: 8.5/10 - Clean architecture with good separation of concerns
- **Test Coverage**: 6.0/10 - Basic unit tests present, missing integration/E2E tests
- **Security**: 4.0/10 - Critical gaps in authentication, authorization, and input validation
- **Performance**: 7.0/10 - Good characteristics, missing caching optimization
- **Documentation**: 5.0/10 - Well-documented code, missing operational docs

### Key Findings
#### Strengths
- Well-architected with clean separation of concerns
- Comprehensive multi-channel notification system
- Robust error handling and retry mechanisms
- Proper event-driven architecture
- Strong TypeScript typing throughout
- Comprehensive email template system
- Effective bulk processing and queue management

#### Areas for Improvement
- **Security**: Missing authentication, authorization, input validation, and rate limiting
- **Implementation**: Several services use mock implementations instead of real integrations
- **Testing**: Missing integration and end-to-end tests
- **Operations**: No monitoring, health checks, or operational documentation
- **Performance**: Could benefit from caching layer for user preferences

### Conditions for Approval
1. **Immediate Requirements**
   - Complete all mock implementations with real database integrations
   - Implement authentication and authorization middleware
   - Add input validation for all notification payloads
   - Sanitize template variables to prevent injection attacks
   - Add rate limiting to notification endpoints

2. **Short-term Requirements**
   - Implement comprehensive testing (integration and E2E)
   - Add health check and monitoring endpoints
   - Create API documentation
   - Add Redis caching for performance optimization

3. **Documentation Requirements**
   - Create operational documentation
   - Add deployment guides
   - Document security procedures
   - Create troubleshooting guides

### Risk Assessment
- **Security Risk**: HIGH - Critical security controls missing
- **Operational Risk**: MEDIUM - Missing monitoring and documentation
- **Technical Risk**: LOW - Well-architected solution
- **Performance Risk**: LOW - Good performance characteristics

### Next Steps
1. Address critical security issues immediately
2. Complete real integrations for mock implementations
3. Add comprehensive testing coverage
4. Implement monitoring and operational infrastructure
5. Create deployment and operational documentation

### Files Reviewed
- 25 files across shared-types, API services, entities, repositories, controllers, listeners, tests, and database
- ~2000 lines of code analyzed
- Comprehensive assessment of architecture, security, performance, and operational readiness

### Detailed Assessment
For complete details, see:
- [QA Assessment](../qa/story-1-5-notifications-assessment.md)
- [Gate Decision](../qa/gates/foundation.story-1-5-notifications-2025-09-30.yaml)