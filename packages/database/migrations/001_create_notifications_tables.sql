-- Notification Types Enum
CREATE TYPE notification_type AS ENUM (
  'TicketCreated', 'TicketAssigned', 'TicketStatusChanged', 'TicketCompleted',
  'QuoteCreated', 'QuoteApproved', 'QuoteDeclined', 'OTPRequested',
  'MediaUploaded', 'MessageReceived'
);

-- Notification Channels Enum
CREATE TYPE notification_channel AS ENUM ('Push', 'Email', 'InApp');

-- Notifications Table
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "type" notification_type NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "channel" notification_channel NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "sent_at" TIMESTAMP WITH TIME ZONE,
    "read_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Preferences Table
CREATE TABLE "notification_preferences" (
    "user_id" TEXT PRIMARY KEY REFERENCES "users"("id"),
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Delivery Log Table
CREATE TABLE "notification_delivery_log" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id"),
    "notification_type" notification_type NOT NULL,
    "channel" notification_channel NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON "notifications"("user_id");
CREATE INDEX idx_notifications_type ON "notifications"("type");
CREATE INDEX idx_notifications_created_at ON "notifications"("created_at");
CREATE INDEX idx_delivery_log_user_id ON "notification_delivery_log"("user_id");

-- Update trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON "notification_preferences"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();