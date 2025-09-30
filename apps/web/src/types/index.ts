// Import types from shared types package
import {
  Ticket as BaseTicket,
  User as BaseUser,
  TicketStatus,
  TicketPriority,
  UserRole
} from '../../../../packages/shared-types/src';

// Re-export the base types
export { TicketStatus, TicketPriority, UserRole };

// Additional web-specific types
export interface ExtendedTicket extends BaseTicket {
  propertyName?: string;
  tenantName?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
}

export interface ExtendedUser extends BaseUser {
  avatar?: string;
}

// Use ExtendedTicket as the default Ticket type for web app
export type Ticket = ExtendedTicket;
export type User = ExtendedUser;