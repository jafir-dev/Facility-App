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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, User, TicketStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Clock, MapPin, User as UserIcon, AlertTriangle } from 'lucide-react';

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

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.New:
        return 'bg-red-100 text-red-800';
      case TicketStatus.Assigned:
        return 'bg-blue-100 text-blue-800';
      case TicketStatus.InProgress:
        return 'bg-yellow-100 text-yellow-800';
      case TicketStatus.Completed:
        return 'bg-green-100 text-green-800';
      case TicketStatus.PendingQuoteApproval:
        return 'bg-purple-100 text-purple-800';
      case TicketStatus.Approved:
        return 'bg-indigo-100 text-indigo-800';
      case TicketStatus.Declined:
        return 'bg-gray-100 text-gray-800';
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
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No tickets found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Property {ticket.propertyId}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {ticket.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-4 w-4" />
                    Tenant {ticket.tenantId}
                  </div>
                </div>

                {showAssignButton && (
                  <Button onClick={() => handleAssignClick(ticket)}>
                    Assign Technician
                  </Button>
                )}
              </div>

              {ticket.assignedTo && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Assigned to:</span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {ticket.assignedTo?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">Technician {ticket.assignedTo}</span>
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
              Assign "{selectedTicket?.title}" to a technician
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Technician</label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
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
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
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