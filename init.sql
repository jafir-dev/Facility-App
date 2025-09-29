-- Create database
CREATE DATABASE facility_app;

-- Connect to the database
\c facility_app;

-- Create user_role enum type
CREATE TYPE user_role AS ENUM ('Tenant', 'Supervisor', 'Technician', 'FMCHead', 'Owner', 'Procurement', 'Vendor');

-- Create users table
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO users (id, email, first_name, last_name, role) VALUES
('sample-user-1', 'tenant@example.com', 'John', 'Doe', 'Tenant'),
('sample-user-2', 'supervisor@example.com', 'Jane', 'Smith', 'Supervisor'),
('sample-user-3', 'technician@example.com', 'Mike', 'Johnson', 'Technician');