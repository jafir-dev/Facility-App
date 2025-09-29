import { NotificationPayload, NotificationType, NotificationChannel } from '@facility-app/shared-types';
import { EmailTemplateService } from './email-template.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export class EmailService {
  private readonly sesClient: SESClient;
  private readonly templateService: EmailTemplateService;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.templateService = new EmailTemplateService();
  }

  async sendEmail(email: string, payload: NotificationPayload): Promise<void> {
    try {
      const template = await this.templateService.getTemplate(payload.type);
      const html = this.templateService.render(template, payload);

      const params = {
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
        Source: process.env.EMAIL_FROM || 'noreply@facilityapp.com',
      };

      await this.sesClient.send(new SendEmailCommand(params));
      await this.logDelivery(payload.recipientId, payload.type, 'Email', 'Delivered');
    } catch (error) {
      await this.logDelivery(payload.recipientId, payload.type, 'Email', 'Failed', error.message);
      throw error;
    }
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