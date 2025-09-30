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
import { Ticket, TicketStatus } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    tickets,
    technicians,
    isLoading,
    error,
    fetchTickets,
    fetchTechnicians,
    assignTicket,
  } = useTicketStore();

  const [activeTab, setActiveTab] = useState('new');

  useEffect(() => {
    fetchTickets();
    fetchTechnicians();
  }, [fetchTickets, fetchTechnicians]);

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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here's what's happening today.
          </p>
        </div>
        <Avatar className="h-12 w-12">
          <AvatarImage src={user?.avatar} alt={user?.firstName} />
          <AvatarFallback>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      <TicketStats tickets={tickets} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">
            New Tickets ({tickets.filter(t => t.status === TicketStatus.New).length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned ({tickets.filter(t => t.status === TicketStatus.Assigned).length})
          </TabsTrigger>
          <TabsTrigger value="inProgress">
            In Progress ({tickets.filter(t => t.status === TicketStatus.InProgress).length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({tickets.filter(t => t.status === TicketStatus.Completed).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <TicketList
            tickets={filteredTickets}
            onAssignTicket={handleAssignTicket}
            showAssignButton={activeTab === 'new'}
            technicians={technicians}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}