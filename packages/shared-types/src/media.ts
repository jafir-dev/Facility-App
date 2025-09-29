export type MediaType = 'Image' | 'Video';
export type MediaContext = 'TicketCreation' | 'BeforeWork' | 'AfterWork' | 'Quote';

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  type: MediaType;
  context: MediaContext;
  ticketId: string;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}