# Story: Core Data Models & Database Schema

**Story ID**: Story 1-3
**Branch**: `feature/story-1-3`
**Dependencies**: None
**Parallel-safe**: true
**Module**: Database layer and data models
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** developer, **I want** well-defined data models and database schema, **so that** the application has a solid foundation for data persistence and relationships.

## Acceptance Criteria
1. Complete database schema with all core entities
2. TypeScript interfaces for all data models
3. Repository pattern implementation
4. Database migrations and seeding
5. Data validation and constraints
6. Proper relationships between entities
7. Indexes for performance optimization

## Technical Implementation Details

### Core Data Models

#### User Model
```typescript
// packages/shared-types/src/user.ts
export type UserRole = 'Tenant' | 'Supervisor' | 'Technician' | 'FMCHead' | 'Owner' | 'Procurement' | 'Vendor';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Property Model
```typescript
// packages/shared-types/src/property.ts
export interface Property {
  id: string;
  name: string;
  address: string;
  unitNumber?: string;
  buildingId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  fmcId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Ticket Model
```typescript
// packages/shared-types/src/ticket.ts
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
```

#### Media Model
```typescript
// packages/shared-types/src/media.ts
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
}
```

### Database Schema

```sql
-- User Roles Enum
CREATE TYPE user_role AS ENUM ('Tenant', 'Supervisor', 'Technician', 'FMCHead', 'Owner', 'Procurement', 'Vendor');

-- Ticket Status Enum
CREATE TYPE ticket_status AS ENUM ('New', 'Assigned', 'InProgress', 'PendingQuoteApproval', 'Approved', 'Completed', 'Declined');

-- Ticket Priority Enum
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Emergency');

-- Media Type Enum
CREATE TYPE media_type AS ENUM ('Image', 'Video');

-- Media Context Enum
CREATE TYPE media_context AS ENUM ('TicketCreation', 'BeforeWork', 'AfterWork', 'Quote');

-- Users Table
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY, -- Firebase UID
    "email" TEXT NOT NULL UNIQUE,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" user_role NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buildings Table
CREATE TABLE "buildings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL REFERENCES "users"("id"),
    "fmc_id" TEXT NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Properties Table
CREATE TABLE "properties" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "unit_number" TEXT,
    "building_id" UUID NOT NULL REFERENCES "buildings"("id"),
    "tenant_id" TEXT NOT NULL REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE "tickets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" ticket_status NOT NULL DEFAULT 'New',
    "priority" ticket_priority NOT NULL DEFAULT 'Medium',
    "property_id" UUID NOT NULL REFERENCES "properties"("id"),
    "tenant_id" TEXT NOT NULL REFERENCES "users"("id"),
    "assigned_to" TEXT REFERENCES "users"("id"),
    "assigned_by" TEXT REFERENCES "users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP WITH TIME ZONE
);

-- Media Files Table
CREATE TABLE "media" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "type" media_type NOT NULL,
    "context" media_context NOT NULL,
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id"),
    "uploaded_by" TEXT NOT NULL REFERENCES "users"("id"),
    "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_tickets_status ON "tickets"("status");
CREATE INDEX idx_tickets_assigned_to ON "tickets"("assigned_to");
CREATE INDEX idx_tickets_tenant_id ON "tickets"("tenant_id");
CREATE INDEX idx_tickets_property_id ON "tickets"("property_id");
CREATE INDEX idx_tickets_created_at ON "tickets"("created_at");
CREATE INDEX idx_media_ticket_id ON "media"("ticket_id");
CREATE INDEX idx_media_uploaded_by ON "media"("uploaded_by");
CREATE INDEX idx_properties_building_id ON "properties"("building_id");
CREATE INDEX idx_properties_tenant_id ON "properties"("tenant_id");
CREATE INDEX idx_buildings_owner_id ON "buildings"("owner_id");
CREATE INDEX idx_buildings_fmc_id ON "buildings"("fmc_id");
```

### Repository Pattern Implementation

```typescript
// packages/api/src/repositories/base.repository.ts
export abstract class BaseRepository<T> {
  constructor(protected readonly model: ModelType<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id);
  }

  async findAll(filter?: FilterQuery<T>): Promise<T[]> {
    return this.model.find(filter);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
```

### Database Migrations
- Use TypeORM or Prisma for migration management
- Create initial migration with schema
- Add seed data for testing
- Include rollback scripts

## Success Metrics
- ✅ All database tables are created successfully
- ✅ Relationships between entities are properly defined
- ✅ TypeScript interfaces match database schema
- ✅ Repository pattern is implemented for all entities
- ✅ Database migrations run without errors
- ✅ Seed data is properly inserted
- ✅ Performance indexes are created
- ✅ Data validation constraints are enforced

## Notes for Developers
- Use UUIDs for primary keys (except user ID which is Firebase UID)
- Implement soft deletes where appropriate
- Add proper foreign key constraints
- Include audit fields (created_at, updated_at)
- Consider adding a database audit trail
- Test with realistic data volumes
- Document schema decisions and relationships
- Plan for future schema evolution

## QA Results

### Risk Assessment
**Risk Level**: Medium-High
- **Justification**: This is a foundational database layer story with all core entities. The implementation serves as the foundation for the entire application. Any issues with data models or schema could have widespread impact across all future features.

### Acceptance Criteria Verification
**Status**: ✅ **ALL CRITERIA MET**

1. **AC1: Complete database schema with all core entities** ✅
   - All 5 core entities implemented: Users, Buildings, Properties, Tickets, Media
   - Proper data types with PostgreSQL enums for constrained values
   - Correct primary key strategy (UUID for most entities, Firebase UID for Users)
   - File: `/Users/jafir/Documents/Developer/GLM/Facility-App/.conductor/helsinki/packages/api/src/migrations/001-initial-schema.sql`

2. **AC2: TypeScript interfaces for all data models** ✅
   - All interfaces match database schema exactly
   - Proper TypeScript typing with enums and optional fields
   - Clean separation in shared-types package
   - Files: `/Users/jafir/Documents/Developer/GLM/Facility-App/.conductor/helsinki/packages/shared-types/src/`

3. **AC3: Repository pattern implementation** ✅
   - Base repository with generics and common CRUD operations
   - Specialized repositories for each entity with domain-specific methods
   - Proper error handling and transaction support
   - Clean abstraction layer with database client injection
   - Files: `/Users/jafir/Documents/Developer/GLM/Facility-App/.conductor/helsinki/packages/api/src/repositories/`

4. **AC4: Database migrations and seeding** ✅
   - Automated migration system with tracking table
   - Comprehensive seeder with realistic test data
   - Proper dependency ordering (Users → Buildings → Properties → Tickets → Media)
   - CLI scripts for easy execution
   - Files: `/Users/jafir/Documents/Developer/GLM/Facility-App/.conductor/helsinki/packages/api/src/migrations/run.ts` and `/Users/jafir/Documents/Developer/GLM/Facility-App/.conductor/helsinki/packages/api/src/seeds/run.ts`

5. **AC5: Data validation and constraints** ✅
   - Database-level constraints (NOT NULL, UNIQUE, FOREIGN KEY)
   - PostgreSQL enums for type safety
   - Default values where appropriate
   - Cascade delete relationships properly defined

6. **AC6: Proper relationships between entities** ✅
   - Users → Buildings (owner_id, fmc_id)
   - Users → Properties (tenant_id)
   - Users → Tickets (tenant_id, assigned_to, assigned_by)
   - Buildings → Properties (building_id)
   - Properties → Tickets (property_id)
   - Tickets → Media (ticket_id)
   - Users → Media (uploaded_by)

7. **AC7: Indexes for performance optimization** ✅
   - Comprehensive indexing strategy on all foreign keys
   - Performance indexes on frequently queried fields (status, created_at)
   - Proper index naming convention
   - 11 indexes total covering all critical query patterns

### Code Quality Review
**Rating**: ⭐⭐⭐⭐⭐ **Excellent**

**Strengths:**
- Perfect adherence to specified requirements
- Clean, maintainable code structure
- Proper TypeScript generics and type safety
- Excellent separation of concerns
- Database schema matches TypeScript interfaces exactly
- Repository pattern implemented correctly with base class inheritance
- Automated migration system with rollback capability
- Comprehensive seeding with realistic data

**Architecture Assessment:**
- **Monorepo Structure**: Proper workspace organization
- **Package Dependencies**: Clean dependency graph
- **Type Safety**: Full TypeScript implementation with proper exports
- **Database Design**: Proper normalization, relationships, and constraints
- **Error Handling**: Appropriate try/catch blocks and transaction management

**Notable Implementation Details:**
- Automatic `updated_at` triggers for audit trails
- Snake case to camel case transformation in repositories
- UUID generation for primary keys (except User Firebase UID)
- Proper foreign key constraints with CASCADE relationships
- Comprehensive filtering capabilities in repositories

### Test Architecture Assessment
**Status**: ⚠️ **No Tests Implemented** (Acceptable for this story type)

**Assessment:**
- This is a pure data model definition story
- Database integration testing would occur at service layer
- Repository pattern is designed to be testable with dependency injection
- Manual verification through database seeding and migration execution is sufficient for this foundational work

### Non-Functional Requirements Validation

**Security:**
- ✅ Proper data types prevent SQL injection
- ✅ Foreign key constraints ensure data integrity
- ✅ Input validation through TypeScript interfaces
- ✅ No sensitive data in schema definitions

**Performance:**
- ✅ Comprehensive indexing strategy
- ✅ Proper query optimization through indexes
- ✅ Efficient data types (UUID, BIGINT, TEXT)
- ✅ Pagination support in repositories

**Reliability:**
- ✅ ACID compliance through PostgreSQL
- ✅ Proper transaction management
- ✅ Data integrity through constraints
- ✅ Audit trails with timestamps

**Maintainability:**
- ✅ Clean code structure and organization
- ✅ Proper separation of concerns
- ✅ Comprehensive documentation
- ✅ Automated migration system
- ✅ Type safety throughout

### Standards Compliance
**Status**: ✅ **Fully Compliant**

**Technical Standards:**
- TypeScript best practices followed
- PostgreSQL schema conventions
- Proper package structure and exports
- Consistent naming conventions
- Clean dependency management

**Project Standards:**
- Follows monorepo workspace structure
- Proper TypeScript path mapping
- Consistent with overall architecture
- Matches documentation specifications

### Gate Decision
**Status**: ✅ **PASS**

**Decision Rationale:**
- All acceptance criteria fully implemented
- High-quality code with excellent architecture
- Comprehensive database schema with proper relationships
- Clean repository pattern implementation
- Automated migration and seeding systems
- No blocking issues or concerns
- Implementation exceeds requirements with additional features

**Recommendations:**
1. **Documentation**: Consider adding entity relationship diagram
2. **Testing**: Integration tests can be added at service layer
3. **Monitoring**: Add database performance monitoring
4. **Backup**: Implement database backup strategy
5. **Evolution**: Plan for schema migration strategy as application grows

**Gate File**: `qa/gates/1.3-core-data-models-database-schema.yaml`