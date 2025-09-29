import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

// Mock event interfaces
interface QuoteCreatedEvent {
  quote: {
    id: string;
    amount: number;
    validUntil: Date;
    ticket: {
      id: string;
      title: string;
      tenantId: string;
    };
  };
}

interface QuoteApprovedEvent {
  quote: {
    id: string;
    amount: number;
    ticket: {
      id: string;
      title: string;
      assignedTo: string;
    };
  };
}

interface QuoteDeclinedEvent {
  quote: {
    id: string;
    amount: number;
    declineReason: string;
    ticket: {
      id: string;
      title: string;
      assignedTo: string;
    };
  };
}

@Injectable()
export class QuoteEventListener {
  private readonly logger = new Logger(QuoteEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('quote.created')
  async handleQuoteCreated(event: QuoteCreatedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'QuoteCreated',
        title: 'New Quote Created',
        message: `A new quote has been created for your maintenance request.`,
        recipientId: event.quote.ticket.tenantId,
        data: {
          ticketId: event.quote.ticket.id,
          quote: event.quote,
          ticket: event.quote.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle quote created event:', error);
    }
  }

  @OnEvent('quote.approved')
  async handleQuoteApproved(event: QuoteApprovedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'QuoteApproved',
        title: 'Quote Approved',
        message: `Your quote has been approved by the client.`,
        recipientId: event.quote.ticket.assignedTo,
        data: {
          ticketId: event.quote.ticket.id,
          quote: event.quote,
          ticket: event.quote.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle quote approved event:', error);
    }
  }

  @OnEvent('quote.declined')
  async handleQuoteDeclined(event: QuoteDeclinedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'QuoteDeclined',
        title: 'Quote Declined',
        message: `Your quote has been declined by the client.`,
        recipientId: event.quote.ticket.assignedTo,
        data: {
          ticketId: event.quote.ticket.id,
          quote: event.quote,
          ticket: event.quote.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle quote declined event:', error);
    }
  }
}