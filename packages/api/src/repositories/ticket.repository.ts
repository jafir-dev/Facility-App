import { Client } from 'pg';
import { BaseRepository, FilterQuery, UpdateQuery } from './base.repository';
import { Ticket, TicketStatus, TicketPriority } from '@facility-app/shared-types';

export interface TicketFilter extends FilterQuery<Ticket> {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  propertyId?: string;
  tenantId?: string;
  assignedTo?: string;
  assignedBy?: string;
}

export interface TicketUpdate extends UpdateQuery<Ticket> {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  assignedBy?: string;
  completedAt?: Date;
}

export class TicketRepository extends BaseRepository<Ticket> {
  constructor(client: Client) {
    super('tickets', client);
  }

  async findByProperty(propertyId: string): Promise<Ticket[]> {
    return this.findAll({ propertyId });
  }

  async findByTenant(tenantId: string): Promise<Ticket[]> {
    return this.findAll({ tenantId });
  }

  async findByAssignedTo(assignedTo: string): Promise<Ticket[]> {
    return this.findAll({ assignedTo });
  }

  async findByStatus(status: TicketStatus | TicketStatus[]): Promise<Ticket[]> {
    return this.findAll({ status });
  }

  async findHighPriorityTickets(): Promise<Ticket[]> {
    return this.findAll({ priority: ['High', 'Emergency'] });
  }

  async findNewTickets(): Promise<Ticket[]> {
    return this.findAll({ status: 'New' });
  }

  async createWithDetails(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'> & { status: TicketStatus; priority: TicketPriority }): Promise<Ticket> {
    const query = `
      INSERT INTO tickets (id, title, description, status, priority, property_id, tenant_id, assigned_to, assigned_by, created_at, updated_at, completed_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9)
      RETURNING *
    `;

    const values = [
      ticketData.title,
      ticketData.description,
      ticketData.status,
      ticketData.priority,
      ticketData.propertyId,
      ticketData.tenantId,
      ticketData.assignedTo,
      ticketData.assignedBy,
      ticketData.completedAt
    ];

    const result = await this.client.query(query, values);
    return this.transformToCamelCase(result.rows[0]);
  }

  async updateStatus(id: string, status: TicketStatus, completedAt?: Date): Promise<Ticket | null> {
    const query = `
      UPDATE tickets
      SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.client.query(query, [status, completedAt, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }

  async assignTicket(id: string, assignedTo: string, assignedBy: string): Promise<Ticket | null> {
    const query = `
      UPDATE tickets
      SET assigned_to = $1, assigned_by = $2, status = 'Assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.client.query(query, [assignedTo, assignedBy, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToCamelCase(result.rows[0]);
  }
}