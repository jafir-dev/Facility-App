import { Client } from 'pg';
import { BaseRepository, FilterQuery, UpdateQuery } from './base.repository';
import { Media, MediaType, MediaContext } from '@facility-app/shared-types';

export interface MediaFilter extends FilterQuery<Media> {
  type?: MediaType | MediaType[];
  context?: MediaContext | MediaContext[];
  ticketId?: string;
  uploadedBy?: string;
}

export interface MediaUpdate extends UpdateQuery<Media> {
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
  type?: MediaType;
  context?: MediaContext;
  ticketId?: string;
  uploadedBy?: string;
}

export class MediaRepository extends BaseRepository<Media> {
  constructor(client: Client) {
    super('media', client);
  }

  async findByTicket(ticketId: string): Promise<Media[]> {
    return this.findAll({ ticketId });
  }

  async findByUploadedBy(uploadedBy: string): Promise<Media[]> {
    return this.findAll({ uploadedBy });
  }

  async findByType(type: MediaType): Promise<Media[]> {
    return this.findAll({ type });
  }

  async findByContext(context: MediaContext): Promise<Media[]> {
    return this.findAll({ context });
  }

  async findTicketImages(ticketId: string): Promise<Media[]> {
    const query = `
      SELECT * FROM media
      WHERE ticket_id = $1 AND type = 'Image'
      ORDER BY uploaded_at ASC
    `;

    const result = await this.client.query(query, [ticketId]);
    return result.rows.map(row => this.transformToCamelCase(row));
  }

  async findTicketVideos(ticketId: string): Promise<Media[]> {
    const query = `
      SELECT * FROM media
      WHERE ticket_id = $1 AND type = 'Video'
      ORDER BY uploaded_at ASC
    `;

    const result = await this.client.query(query, [ticketId]);
    return result.rows.map(row => this.transformToCamelCase(row));
  }

  async createWithDetails(mediaData: Omit<Media, 'id' | 'uploadedAt'> & { createdAt: Date; updatedAt: Date }): Promise<Media> {
    const query = `
      INSERT INTO media (id, filename, original_name, mimetype, size, type, context, ticket_id, uploaded_by, uploaded_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      mediaData.filename,
      mediaData.originalName,
      mediaData.mimetype,
      mediaData.size,
      mediaData.type,
      mediaData.context,
      mediaData.ticketId,
      mediaData.uploadedBy
    ];

    const result = await this.client.query(query, values);
    return this.transformToCamelCase(result.rows[0]);
  }

  async deleteByTicket(ticketId: string): Promise<boolean> {
    const query = `DELETE FROM media WHERE ticket_id = $1`;
    const result = await this.client.query(query, [ticketId]);
    return (result.rowCount || 0) > 0;
  }
}