# **Data Models**

(Showing core models for brevity. See PRD for full list.)

## **User**
**Purpose**: Represents an individual user, linked to Firebase Auth.

```typescript
// packages/shared-types/src/user.ts
export type UserRole = 'Tenant' | 'Supervisor' | 'Technician' | 'FMCHead' | 'Owner' | 'Procurement' | 'Vendor';
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
```

## **Property**
**Purpose**: Represents a physical property or unit.

```typescript
// packages/shared-types/src/property.ts
export interface Property {
  id: string;
  name: string;
  address: string;
  tenantId: string;
}
```

## **Ticket**
**Purpose**: Represents a single maintenance request.

```typescript
// packages/shared-types/src/ticket.ts
export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'PendingQuoteApproval' | 'Approved' | 'Completed' | 'Declined';
export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  propertyId: string;
  tenantId: string;
}
```

---
