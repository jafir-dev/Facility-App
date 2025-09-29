import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

// Mock event interfaces
interface OTPRequestedEvent {
  userId: string;
  otp: {
    code: string;
    expiresIn: number;
  };
}

@Injectable()
export class AuthEventListener {
  private readonly logger = new Logger(AuthEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('auth.otpRequested')
  async handleOTPRequested(event: OTPRequestedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'OTPRequested',
        title: 'Your One-Time Password',
        message: `Your OTP for facility access is: ${event.otp.code}`,
        recipientId: event.userId,
        data: {
          otp: event.otp
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle OTP requested event:', error);
    }
  }
}