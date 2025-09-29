import { NotificationPayload, NotificationType, NotificationChannel } from '@facility-app/shared-types';
import * as admin from 'firebase-admin';

export class FCMService {
  private readonly messaging: admin.messaging.Messaging;

  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
      });
    }
    this.messaging = admin.messaging();
  }

  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // In a real implementation, you would fetch the user's FCM token from the database
      const fcmToken = await this.getUserFCMToken(userId);
      if (!fcmToken) {
        console.warn(`No FCM token found for user ${userId}`);
        return;
      }

      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.message,
        },
        data: payload.data || {},
        token: fcmToken,
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

      await this.messaging.send(message);
      await this.logDelivery(userId, payload.type, 'Push', 'Delivered');
    } catch (error) {
      await this.logDelivery(userId, payload.type, 'Push', 'Failed', error.message);

      // Remove invalid FCM tokens
      if (error.code === 'messaging/invalid-registration-token') {
        await this.removeInvalidFCMToken(userId);
      }
      throw error;
    }
  }

  async registerDevice(userId: string, fcmToken: string, deviceType: 'ios' | 'android'): Promise<void> {
    // In a real implementation, update the user's FCM token in the database
    console.log(`Registering device for user ${userId}: ${fcmToken} (${deviceType})`);
  }

  async unregisterDevice(userId: string): Promise<void> {
    // In a real implementation, remove the user's FCM token from the database
    console.log(`Unregistering device for user ${userId}`);
  }

  private async getUserFCMToken(userId: string): Promise<string | null> {
    // Mock implementation - in real app, fetch from database
    return null;
  }

  private async removeInvalidFCMToken(userId: string): Promise<void> {
    // Mock implementation - in real app, update database
    console.log(`Removing invalid FCM token for user ${userId}`);
  }

  private async logDelivery(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    // Mock implementation - in real app, log to database
    console.log(`[${status}] ${channel} notification for user ${userId}: ${notificationType}`);
    if (errorMessage) {
      console.error(`Error: ${errorMessage}`);
    }
  }
}