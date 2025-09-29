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

-- Add updatedAt trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updatedAt triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON "buildings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON "properties" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON "tickets" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();