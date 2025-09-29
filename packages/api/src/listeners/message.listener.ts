import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

// Mock event interfaces
interface MessageReceivedEvent {
  message: {
    id: string;
    content: string;
    from: string;
    ticket: {
      id: string;
      title: string;
      tenantId: string;
    };
  };
}

@Injectable()
export class MessageEventListener {
  private readonly logger = new Logger(MessageEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('message.received')
  async handleMessageReceived(event: MessageReceivedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'MessageReceived',
        title: 'New Message Received',
        message: `You have received a new message regarding your maintenance ticket.`,
        recipientId: event.message.ticket.tenantId,
        data: {
          ticketId: event.message.ticket.id,
          message: event.message,
          ticket: event.message.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle message received event:', error);
    }
  }
}