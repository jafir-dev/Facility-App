# **Database Schema**

```sql
CREATE TYPE user_role AS ENUM ('Tenant', 'Supervisor', 'Technician', ...);
CREATE TYPE ticket_status AS ENUM ('New', 'Assigned', 'InProgress', ...);

CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY, -- Firebase UID
    "email" TEXT NOT NULL UNIQUE,
    "role" user_role NOT NULL
);

CREATE TABLE "properties" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tenant_id" TEXT REFERENCES "users"("id")
);

CREATE TABLE "tickets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "status" ticket_status NOT NULL DEFAULT 'New',
    "property_id" UUID NOT NULL REFERENCES "properties"("id"),
    "tenant_id" TEXT NOT NULL REFERENCES "users"("id")
);
```

---
