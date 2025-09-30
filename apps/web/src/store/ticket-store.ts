import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Ticket, User } from '@/types';

// Define TicketStatus locally to avoid import issues
export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'PendingQuoteApproval' | 'Approved' | 'Completed' | 'Declined';

interface TicketState {
  tickets: Ticket[];
  technicians: User[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTickets: () => Promise<void>;
  fetchTechnicians: () => Promise<void>;
  assignTicket: (ticketId: string, technicianId: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clearError: () => void;
}

export const useTicketStore = create<TicketState>()(
  devtools(
    persist(
      (set, get) => ({
        tickets: [],
        technicians: [],
        isLoading: false,
        error: null,

        fetchTickets: async () => {
          set({ isLoading: true, error: null });

          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock tickets data
            const mockTickets: Ticket[] = [
              {
                id: '1',
                title: 'Broken AC in Apartment 3B',
                description: 'Air conditioning unit not cooling, tenant reports warm air',
                status: TicketStatus.New,
                priority: 'High',
                propertyId: 'prop-1',
                tenantId: 'tenant-1',
                createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                updatedAt: new Date(Date.now() - 1000 * 60 * 30),
              },
              {
                id: '2',
                title: 'Leaking faucet in bathroom',
                description: 'Bathroom sink faucet has been dripping for 2 days',
                status: TicketStatus.New,
                priority: 'Medium',
                propertyId: 'prop-2',
                tenantId: 'tenant-2',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
              },
              {
                id: '3',
                title: 'Elevator maintenance needed',
                description: 'Elevator making unusual noises, needs inspection',
                status: TicketStatus.Assigned,
                priority: 'Emergency',
                propertyId: 'prop-3',
                tenantId: 'tenant-3',
                assignedTo: 'tech-1',
                assignedBy: 'supervisor-1',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
              },
              {
                id: '4',
                title: 'Broken window in lobby',
                description: 'Window cracked, needs immediate replacement',
                status: TicketStatus.InProgress,
                priority: 'High',
                propertyId: 'prop-1',
                tenantId: 'tenant-4',
                assignedTo: 'tech-2',
                assignedBy: 'supervisor-1',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
              },
              {
                id: '5',
                title: 'Paint peeling in hallway',
                description: 'Paint peeling on walls near elevator, needs repainting',
                status: TicketStatus.Completed,
                priority: 'Low',
                propertyId: 'prop-2',
                tenantId: 'tenant-5',
                assignedTo: 'tech-3',
                assignedBy: 'supervisor-1',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
              },
            ];

            set({ tickets: mockTickets, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch tickets',
              isLoading: false
            });
          }
        },

        fetchTechnicians: async () => {
          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mock technicians data
            const mockTechnicians: User[] = [
              {
                id: 'tech-1',
                email: 'technician1@example.com',
                firstName: 'Mike',
                lastName: 'Johnson',
                role: 'Technician',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'tech-2',
                email: 'technician2@example.com',
                firstName: 'Sarah',
                lastName: 'Williams',
                role: 'Technician',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'tech-3',
                email: 'technician3@example.com',
                firstName: 'David',
                lastName: 'Brown',
                role: 'Technician',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];

            set({ technicians: mockTechnicians });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch technicians'
            });
          }
        },

        assignTicket: async (ticketId: string, technicianId: string) => {
          const { tickets } = get();

          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 500));

            const updatedTickets = tickets.map(ticket =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    assignedTo: technicianId,
                    status: 'Assigned' as TicketStatus,
                    updatedAt: new Date(),
                  }
                : ticket
            );

            set({ tickets: updatedTickets, error: null });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to assign ticket'
            });
            throw error;
          }
        },

        updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
          const { tickets } = get();

          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 500));

            const updatedTickets = tickets.map(ticket =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    status,
                    updatedAt: new Date(),
                    ...(status === TicketStatus.Completed ? { completedAt: new Date() } : {}),
                  }
                : ticket
            );

            set({ tickets: updatedTickets, error: null });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update ticket status'
            });
            throw error;
          }
        },

        addTicket: async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
          const { tickets } = get();

          try {
            // Mock API call - replace with actual API integration
            await new Promise(resolve => setTimeout(resolve, 500));

            const newTicket: Ticket = {
              ...ticketData,
              id: `ticket-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            set({ tickets: [newTicket, ...tickets], error: null });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add ticket'
            });
            throw error;
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'ticket-storage',
        partialize: (state) => ({ tickets: state.tickets }),
      }
    )
  )
);