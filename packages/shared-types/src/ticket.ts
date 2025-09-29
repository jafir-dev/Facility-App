export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'PendingQuoteApproval' | 'Approved' | 'Completed' | 'Declined';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  propertyId: string;
  tenantId: string;
  assignedTo?: string; // Technician or Vendor ID
  assignedBy?: string; // Supervisor ID
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}