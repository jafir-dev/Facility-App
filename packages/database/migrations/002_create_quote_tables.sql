-- Quote System Migration
-- Creates tables for the quoting and approval system

-- Create quote_status type
CREATE TYPE quote_status AS ENUM ('Pending', 'Approved', 'Declined');

-- Create quote_item_type type
CREATE TYPE quote_item_type AS ENUM ('Material', 'Labor');

-- Quotes Table
CREATE TABLE IF NOT EXISTS "quotes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
    "created_by" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "material_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "labor_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "status" quote_status NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quote Items Table for detailed breakdown
CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "type" quote_item_type NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_ticket_id ON "quotes"("ticket_id");
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON "quotes"("created_by");
CREATE INDEX IF NOT EXISTS idx_quotes_status ON "quotes"("status");
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON "quotes"("created_at");
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON "quote_items"("quote_id");
CREATE INDEX IF NOT EXISTS idx_quote_items_type ON "quote_items"("type");

-- Update trigger for quotes table
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quotes_updated_at();

-- Add check constraints for data integrity
ALTER TABLE "quotes"
ADD CONSTRAINT chk_quotes_material_cost CHECK (material_cost >= 0),
ADD CONSTRAINT chk_quotes_labor_cost CHECK (labor_cost >= 0),
ADD CONSTRAINT chk_quotes_total_cost CHECK (total_cost >= 0);

ALTER TABLE "quote_items"
ADD CONSTRAINT chk_quote_items_quantity CHECK (quantity > 0),
ADD CONSTRAINT chk_quote_items_unit_price CHECK (unit_price >= 0),
ADD CONSTRAINT chk_quote_items_total_price CHECK (total_price >= 0);

-- Insert migration record
INSERT INTO schema_migrations (version, name)
VALUES ('002_create_quote_tables', 'Create quote system tables')
ON CONFLICT (version) DO NOTHING;