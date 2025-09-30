import { apiClient } from './client';
import { Ticket, TicketStatus } from '@/types';

export const ticketApi = {
  getTickets: async (): Promise<Ticket[]> => {
    const response = await apiClient.get<Ticket[]>('/tickets');
    return response.data;
  },

  getTicket: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  assignTicket: async (ticketId: string, technicianId: string): Promise<Ticket> => {
    const response = await apiClient.put<Ticket>(`/tickets/${ticketId}/assign`, {
      technicianId,
    });
    return response.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
    const response = await apiClient.put<Ticket>(`/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },

  createTicket: async (ticketData: Partial<Ticket>): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>('/tickets', ticketData);
    return response.data;
  },

  deleteTicket: async (ticketId: string): Promise<void> => {
    await apiClient.delete(`/tickets/${ticketId}`);
  },
};