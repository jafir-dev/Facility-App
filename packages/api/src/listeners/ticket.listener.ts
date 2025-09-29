import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

// Mock event interfaces
interface TicketCreatedEvent {
  ticket: {
    id: string;
    title: string;
    description: string;
    priority: string;
    tenantId: string;
    propertyId: string;
    propertyName: string;
  };
}

interface TicketAssignedEvent {
  ticket: {
    id: string;
    title: string;
    property: string;
    priority: string;
    assignedTo: string;
  };
}

interface TicketStatusChangedEvent {
  ticket: {
    id: string;
    title: string;
    status: string;
    updatedBy: string;
    tenantId: string;
  };
}

interface TicketCompletedEvent {
  ticket: {
    id: string;
    title: string;
    completedBy: string;
    completedAt: Date;
    tenantId: string;
  };
}

@Injectable()
export class TicketEventListener {
  private readonly logger = new Logger(TicketEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('ticket.created')
  async handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
    try {
      // Notify tenant
      await this.notificationService.sendNotification({
        type: 'TicketCreated',
        title: 'Maintenance Request Created',
        message: `Your maintenance request "${event.ticket.title}" has been submitted.`,
        recipientId: event.ticket.tenantId,
        data: {
          ticketId: event.ticket.id,
          ticket: event.ticket
        },
      });

      // Notify supervisors (mock implementation)
      const supervisors = await this.getSupervisorsForProperty(event.ticket.propertyId);
      for (const supervisor of supervisors) {
        await this.notificationService.sendNotification({
          type: 'TicketCreated',
          title: 'New Maintenance Request',
          message: `A new maintenance request has been created for ${event.ticket.propertyName}.`,
          recipientId: supervisor.id,
          data: {
            ticketId: event.ticket.id,
            ticket: event.ticket
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle ticket created event:', error);
    }
  }

  @OnEvent('ticket.assigned')
  async handleTicketAssigned(event: TicketAssignedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'TicketAssigned',
        title: 'Ticket Assigned to You',
        message: `You have been assigned a new maintenance ticket: ${event.ticket.title}.`,
        recipientId: event.ticket.assignedTo,
        data: {
          ticketId: event.ticket.id,
          ticket: event.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle ticket assigned event:', error);
    }
  }

  @OnEvent('ticket.statusChanged')
  async handleTicketStatusChanged(event: TicketStatusChangedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'TicketStatusChanged',
        title: 'Ticket Status Updated',
        message: `Your maintenance ticket status has been updated to: ${event.ticket.status}.`,
        recipientId: event.ticket.tenantId,
        data: {
          ticketId: event.ticket.id,
          ticket: event.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle ticket status changed event:', error);
    }
  }

  @OnEvent('ticket.completed')
  async handleTicketCompleted(event: TicketCompletedEvent): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        type: 'TicketCompleted',
        title: 'Maintenance Request Completed',
        message: `Your maintenance request "${event.ticket.title}" has been completed.`,
        recipientId: event.ticket.tenantId,
        data: {
          ticketId: event.ticket.id,
          ticket: event.ticket
        },
      });
    } catch (error) {
      this.logger.error('Failed to handle ticket completed event:', error);
    }
  }

  private async getSupervisorsForProperty(propertyId: string): Promise<Array<{ id: string }>> {
    // Mock implementation - in real app, fetch from database
    return [
      { id: 'supervisor-1' },
      { id: 'supervisor-2' }
    ];
  }
}