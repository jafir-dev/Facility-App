# Story: Supervisor Dashboard & Assignment

**Story ID**: Story 2-2
**Branch**: `feature/story-2-2`
**Dependencies**: Stories 1-1, 1-2, 1-3
**Parallel-safe**: true
**Module**: Web supervisor interface
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** Supervisor, **I want** to see a list of all "New" tickets and assign a Technician, **so that** I can dispatch staff.

## Acceptance Criteria
1. A logged-in Supervisor can view a dashboard of "New" tickets
2. The Supervisor can select a ticket to view its details
3. The Supervisor can select and assign a registered Technician to the ticket
4. The ticket status changes to "Assigned" and the Technician is notified
5. Dashboard shows ticket statistics and metrics
6. Real-time updates for new tickets
7. Filtering and sorting options for tickets

## Technical Implementation Details

### Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── tickets/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   └── ui/
│   ├── lib/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── utils/
│   └── store/
└── public/
```

### Core Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.8.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7",
    "zustand": "^4.4.7",
    "date-fns": "^2.30.0",
    "recharts": "^2.8.0"
  }
}
```

### Dashboard Page

```tsx
// apps/web/src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketList } from '@/components/dashboard/ticket-list';
import { TicketStats } from '@/components/dashboard/ticket-stats';
import { useTicketStore } from '@/store/ticket-store';
import { useAuthStore } from '@/store/auth-store';
import { Ticket, TicketStatus } from '@/types/ticket';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    tickets,
    isLoading,
    error,
    fetchTickets,
    assignTicket,
  } = useTicketStore();

  const [activeTab, setActiveTab] = useState('new');

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter(ticket => {
    switch (activeTab) {
      case 'new':
        return ticket.status === TicketStatus.New;
      case 'assigned':
        return ticket.status === TicketStatus.Assigned;
      case 'inProgress':
        return ticket.status === TicketStatus.InProgress;
      case 'completed':
        return ticket.status === TicketStatus.Completed;
      default:
        return true;
    }
  });

  const handleAssignTicket = async (ticketId: string, technicianId: string) => {
    try {
      await assignTicket(ticketId, technicianId);
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className=\"flex items-center justify-center h-screen\">
        <div className=\"animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900\" />
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"flex items-center justify-center h-screen\">
        <div className=\"text-red-500\">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className=\"container mx-auto p-6 space-y-6\">
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-3xl font-bold tracking-tight\">Dashboard</h1>
          <p className=\"text-muted-foreground\">
            Welcome back, {user?.firstName}! Here's what's happening today.
          </p>
        </div>
        <Avatar className=\"h-12 w-12\">
          <AvatarImage src={user?.avatar} alt={user?.firstName} />
          <AvatarFallback>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      <TicketStats tickets={tickets} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className=\"space-y-4\">
        <TabsList>
          <TabsTrigger value=\"new\">
            New Tickets ({tickets.filter(t => t.status === TicketStatus.New).length})
          </TabsTrigger>
          <TabsTrigger value=\"assigned\">
            Assigned ({tickets.filter(t => t.status === TicketStatus.Assigned).length})
          </TabsTrigger>
          <TabsTrigger value=\"inProgress\">
            In Progress ({tickets.filter(t => t.status === TicketStatus.InProgress).length})
          </TabsTrigger>
          <TabsTrigger value=\"completed\">
            Completed ({tickets.filter(t => t.status === TicketStatus.Completed).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className=\"space-y-4\">
          <TicketList
            tickets={filteredTickets}
            onAssignTicket={handleAssignTicket}
            showAssignButton={activeTab === 'new'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Ticket List Component

```tsx
// apps/web/src/components/dashboard/ticket-list.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Clock, MapPin, User, AlertTriangle } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onAssignTicket: (ticketId: string, technicianId: string) => void;
  showAssignButton: boolean;
  technicians?: User[];
}

export function TicketList({ tickets, onAssignTicket, showAssignButton, technicians = [] }: TicketListProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const handleAssignClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedTechnician('');
    setIsAssignDialogOpen(true);
  };

  const handleAssignConfirm = async () => {
    if (selectedTicket && selectedTechnician) {
      await onAssignTicket(selectedTicket.id, selectedTechnician);
      setIsAssignDialogOpen(false);
      setSelectedTicket(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-red-100 text-red-800';
      case 'Assigned':
        return 'bg-blue-100 text-blue-800';
      case 'InProgress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Emergency':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className=\"flex items-center justify-center h-32\">
          <p className=\"text-muted-foreground\">No tickets found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className=\"space-y-4\">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className=\"hover:shadow-md transition-shadow\">
          <CardHeader className=\"pb-3\">
            <div className=\"flex items-center justify-between\">
              <div className=\"space-y-1\">
                <CardTitle className=\"text-lg\">{ticket.title}</CardTitle>
                <CardDescription className=\"flex items-center gap-2\">
                  <MapPin className=\"h-4 w-4\" />
                  {ticket.propertyName}
                </CardDescription>
              </div>
              <div className=\"flex items-center gap-2\">
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-3\">
              <p className=\"text-sm text-muted-foreground line-clamp-2\">
                {ticket.description}
              </p>

              <div className=\"flex items-center justify-between\">
                <div className=\"flex items-center gap-4 text-sm text-muted-foreground\">
                  <div className=\"flex items-center gap-1\">
                    <Clock className=\"h-4 w-4\" />
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </div>
                  <div className=\"flex items-center gap-1\">
                    <User className=\"h-4 w-4\" />
                    {ticket.tenantName}
                  </div>
                </div>

                {showAssignButton && (
                  <Button onClick={() => handleAssignClick(ticket)}>
                    Assign Technician
                  </Button>
                )}
              </div>

              {ticket.assignedTo && (
                <div className=\"flex items-center gap-2 pt-2 border-t\">
                  <span className=\"text-sm text-muted-foreground\">Assigned to:</span>
                  <Avatar className=\"h-6 w-6\">
                    <AvatarImage src={ticket.assignedToAvatar} />
                    <AvatarFallback className=\"text-xs\">
                      {ticket.assignedToName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className=\"text-sm font-medium\">{ticket.assignedToName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Assign \"{selectedTicket?.title}\" to a technician
            </DialogDescription>
          </DialogHeader>

          <div className=\"space-y-4\">
            <div>
              <label className=\"text-sm font-medium\">Select Technician</label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder=\"Choose a technician\" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      <div className=\"flex items-center gap-2\">
                        <Avatar className=\"h-6 w-6\">
                          <AvatarImage src={technician.avatar} />
                          <AvatarFallback className=\"text-xs\">
                            {technician.firstName?.[0]}{technician.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {technician.firstName} {technician.lastName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant=\"outline\" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignConfirm} disabled={!selectedTechnician}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Ticket Store

```ts
// apps/web/src/store/ticket-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Ticket, TicketStatus, User } from '@/types';
import { ticketApi } from '@/lib/api/ticket-api';
import { userApi } from '@/lib/api/user-api';

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
            const tickets = await ticketApi.getTickets();
            set({ tickets, isLoading: false });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        fetchTechnicians: async () => {
          try {
            const technicians = await userApi.getTechnicians();
            set({ technicians });
          } catch (error) {
            set({ error: error.message });
          }
        },

        assignTicket: async (ticketId: string, technicianId: string) => {
          const { tickets } = get();
          try {
            const updatedTicket = await ticketApi.assignTicket(ticketId, technicianId);
            set({
              tickets: tickets.map(ticket =>
                ticket.id === ticketId ? updatedTicket : ticket
              ),
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },

        updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
          const { tickets } = get();
          try {
            const updatedTicket = await ticketApi.updateTicketStatus(ticketId, status);
            set({
              tickets: tickets.map(ticket =>
                ticket.id === ticketId ? updatedTicket : ticket
              ),
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
      }),
      {
        name: 'ticket-storage',
        partialize: (state) => ({ tickets: state.tickets }),
      }
    )
  )
);
```

### API Service

```ts
// apps/web/src/lib/api/ticket-api.ts
import { api } from './client';
import { Ticket, TicketStatus } from '@/types';

export const ticketApi = {
  getTickets: async (): Promise<Ticket[]> => {
    const response = await api.get('/tickets');
    return response.data;
  },

  getTicket: async (id: string): Promise<Ticket> => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  assignTicket: async (ticketId: string, technicianId: string): Promise<Ticket> => {
    const response = await api.put(`/tickets/${ticketId}/assign`, {
      technicianId,
    });
    return response.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
    const response = await api.put(`/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },

  createTicket: async (ticketData: Partial<Ticket>): Promise<Ticket> => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },
};
```

### Types

```ts
// apps/web/src/types/ticket.ts
export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'PendingQuoteApproval' | 'Approved' | 'Completed' | 'Declined';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  assignedBy?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  mediaUrls: string[];
}
```

## Success Metrics
- ✅ Supervisor can view dashboard with ticket statistics
- ✅ New tickets are displayed in a clear, filterable list
- ✅ Ticket assignment dialog works correctly
- ✅ Real-time updates for new tickets
- ✅ Technician selection and assignment works
- ✅ Status changes are reflected immediately
- ✅ Responsive design works on all screen sizes
- ✅ Loading states and error handling are implemented

## Notes for Developers
- Use Tailwind CSS for styling
- Implement proper TypeScript types
- Add loading states for all async operations
- Include proper accessibility features
- Test on different browsers and screen sizes
- Implement proper error boundaries
- Add unit tests for components and hooks
- Consider adding ticket search functionality
- Implement proper pagination for large ticket lists
- Add keyboard navigation support
- Include proper logging for debugging