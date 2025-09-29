# Zariya Fullstack Architecture Document

## **Introduction**

This document outlines the complete fullstack architecture for Zariya, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

### **Starter Template or Existing Project**
The PRD (Story 1.1) specifies setting up a monorepo with initial scaffolding. To accelerate this, we will use a well-structured, modern starter template like the T3 Stack or a similar Turborepo starter with Next.js and NestJS. This provides pre-configured tooling, end-to-end type safety, and best practices from day one.

### **Change Log**

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| Sep 30, 2025 | 1.0 | Initial architecture draft based on PRD v1.0. | Winston (Architect) |

---
## **High Level Architecture (Revised for Secure Local Storage)**

### **Technical Summary**
The Zariya platform will be a cloud-native, full-stack application built on a self-managed Linode VPS. It will feature a Flutter mobile application and a Next.js web portal, both communicating with a Node.js backend running on the same server. The architecture will be a modular monolith, with Nginx acting as a reverse proxy and API gateway. This design gives us full control over the stack while placing the responsibility for security, scaling, and maintenance directly on us.

### **Platform and Infrastructure Choice**
* **Platform:** Linode
* **Operating System:** Ubuntu 22.04 LTS
* **Core Components on VPS:**
    * **Web Server / Reverse Proxy:** Nginx
    * **Backend API:** Node.js application (managed by PM2)
    * **Database:** PostgreSQL Server
    * **File Storage:** Secure, non-public local filesystem storage (e.g., in `/var/lib/zariya/uploads`).
* **External Services:**
    * **Authentication & Push Notifications:** Firebase
    * **Email:** Amazon SES or a similar service.

### **High Level Architecture Diagram**
```mermaid
graph TD
    subgraph "Users"
        User_Mobile[Mobile User (Flutter App)]
        User_Web[Admin User (Web Portal)]
    end

    subgraph "External Services"
        FirebaseSvc[Firebase (Auth & FCM)]
        EmailSvc[Email Service (e.g., SES)]
    end

    subgraph "Linode Cloud"
        subgraph "Ubuntu VPS"
            Nginx[Nginx (Reverse Proxy)]
            NodeApp[Node.js API (Gatekeeper)]
            Postgres[PostgreSQL Server]
            subgraph "Secure Storage (Not Publicly Served)"
                PrivateUploads[/var/lib/zariya/uploads]
            end
        end
    end

    User_Mobile -- Authenticates with --> FirebaseSvc
    User_Web -- Authenticates with --> FirebaseSvc
    User_Mobile -- API Requests w/ Token --> Nginx
    User_Web -- API Requests w/ Token --> Nginx
    Nginx --> NodeApp
    
    NodeApp -- Verifies Token --> FirebaseSvc
    NodeApp -- Sends Notifications --> FirebaseSvc
    NodeApp -- Sends Emails --> EmailSvc
    NodeApp -- Accesses Data --> Postgres
    NodeApp -- Serves Secure Files --> PrivateUploads
```

### **Secure File Access Implementation**

* **Private Storage**: All user-uploaded files will be stored in a directory outside of the public web root (e.g., /var/lib/zariya/uploads).
* **API as Gatekeeper**: A user's app will request a file via a dedicated API endpoint.
* **Authorization Check**: The Node.js API will receive the request, validate the user's Firebase token, and verify they have permission to access the file.
* **Secure Serving**: Once authorized, the API will securely serve the file to the user, using a high-performance method like Nginx's X-Accel-Redirect.

### **Tech Stack**

| Category | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| Frontend (Mobile) | Flutter | 3.x | Cross-platform framework for iOS & Android. |
| Frontend (Web) | Next.js (React) | 14.x | Framework for the admin web portal. |
| UI Library (Web) | Shadcn/UI & Tailwind | Latest | Modern, accessible component library for rapid UI development. |
| State Management | Zustand (Web), Riverpod (Mobile) | Latest | Simple, modern state management solutions. |
| Backend | NestJS (Node.js) | 10.x | Robust framework for the backend API. |
| Database | PostgreSQL | 16.x | Powerful, reliable open-source relational database. |
| Authentication | Firebase Authentication | N/A | Secure, managed service for user authentication. |
| Push Notifications | Firebase Cloud Messaging | N/A | Reliable, cross-platform push notification service. |
| Process Manager | PM2 | Latest | Ensures the Node.js API runs continuously. |
| Web Server | Nginx | 1.25.x | High-performance reverse proxy and API gateway. |
| Testing | Jest & RTL (Web), Flutter Test (Mobile) | Latest | Industry-standard testing frameworks. |
| E2E Testing | Playwright | Latest | Modern framework for reliable end-to-end testing. |
| CI/CD | GitHub Actions | N/A | Automates testing and deployment workflows. |
| Monorepo Tool | Turborepo | Latest | Manages the monorepo, optimizing build times. |
| Monitoring | Prometheus & Grafana | Latest | Powerful open-source combination for system monitoring. |

---

## **Data Models**

(Showing core models for brevity. See PRD for full list.)

### **User**
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

### **Property**
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

### **Ticket**
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

## **API Specification**

A REST API defined with the OpenAPI 3.0 standard.

```yaml
openapi: 3.0.0
info:
  title: "Zariya API"
  version: "1.0.0"
components:
  securitySchemes:
    firebaseAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - firebaseAuth: []
paths:
  /tickets:
    get:
      summary: "Get a list of tickets"
    post:
      summary: "Create a new maintenance ticket"
  /tickets/{ticketId}/assign:
    put:
      summary: "Assign a technician to a ticket"
```

---

## **Components**

### **Backend (NestJS Monolith):**
* **Authentication Component**: Validates Firebase tokens and manages RBAC.
* **Ticket Management Component**: Core business logic for the ticket lifecycle.
* **Financial Component**: Manages quotes and invoicing.
* **Notification Component**: Dispatches emails (SES) and push notifications (FCM).

### **Frontend:**
* **Mobile App (Flutter)**: Provides the mobile experience for all user roles.
* **Web Portal (Next.js)**: Provides the administrative web interface.

---

## **Database Schema**

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

## **Unified Project Structure**

```plaintext
zariya-monorepo/
├── apps/
│   ├── api/      # NestJS Backend API
│   ├── web/      # Next.js Admin Portal
│   └── mobile/   # Flutter Mobile App
├── packages/
│   ├── shared-types/
│   └── ui/       # Shared React components
├── infrastructure/
└── turborepo.json
```

---

## **Development Workflow**

Setup involves cloning the repo, running `pnpm install`, and using `docker-compose up` for local databases. Daily commands include `pnpm dev` to run all apps and `pnpm test` to run all tests.

---

## **Deployment Architecture**

A GitHub Actions CI/CD pipeline will automate testing and deployment. On a push to the main branch, it will build all applications. The backend and web frontends will be deployed to the Linode VPS via SSH, with the backend using a zero-downtime reload via PM2. Mobile apps will be deployed to the Google Play Store and Apple App Store.

---

## **Security and Performance**

### **Security**
A defense-in-depth strategy includes a Content Security Policy, rigorous API input validation, rate limiting, and secure token management via Firebase.

### **Performance**
A multi-layered approach includes frontend code splitting and client-side caching, and backend database connection pooling and Redis caching.

---

## **Testing Strategy**

The "Testing Pyramid" model will be followed, with a large base of unit tests (Jest, RTL, Flutter Test), a layer of integration tests, and a small number of end-to-end tests (Playwright).

---

## **Coding Standards**

A minimal, critical set of rules will be enforced, including: using a single source of truth for shared types, using a centralized API client, accessing environment variables only through a config service, and enforcing the repository pattern for all database access.

---

## **Error Handling Strategy**

A unified strategy will be used. The backend will use a global exception filter to catch all errors and return a standardized JSON error format. The frontend will use an API client interceptor to gracefully handle these predictable errors.

---

## **Monitoring and Observability**

The self-hosted stack will include Prometheus for scraping backend and system metrics, Grafana for creating visualization dashboards, and a dedicated service like Sentry for superior frontend and backend error tracking.

---

## **Checklist Results Report**

| Category | Status | Critical Issues |
| :--- | :--- | :--- |
| 1. Requirements Alignment | ✅ PASS | None |
| 2. Architecture Fundamentals | ✅ PASS | None |