# **Epic 1: Foundation & Core Ticketing Workflow**
**Expanded Goal:** This epic lays the essential groundwork for the Zariya platform. By the end of this epic, we will have a functional, end-to-end workflow for the three core user roles (Tenant, Supervisor, Technician) to create, assign, and complete a basic maintenance ticket.

## **Story 1.1: Project & Repository Setup**
**As a** developer, **I want** the monorepo structure with initial app scaffolding for the backend, web portal, and mobile app, **so that** the development team has a consistent and ready-to-use foundation.
**Acceptance Criteria:**
1. A monorepo is initialized.
2. A placeholder NestJS application is created in `apps/api`.
3. A placeholder Next.js application is created in `apps/web`.
4. A placeholder Flutter application is created in `apps/mobile`.
5. Basic linting and TypeScript configurations are shared.

## **Story 1.2: User Authentication & Core Roles**
**As a** user, **I want** to sign up and log in with my email and password, **so that** I can securely access the platform.
**Acceptance Criteria:**
1. A user can create a new account with an email, password, and one of the three core roles (Tenant, Supervisor, Technician).
2. A registered user can log in to receive a secure access token (JWT).
3. All subsequent API endpoints are protected.

## **Story 1.3: Tenant Ticket Creation**
**As a** Tenant, **I want** to create a new maintenance ticket with a description and a single photo, **so that** I can report a property issue.
**Acceptance Criteria:**
1. A logged-in Tenant can access a "New Ticket" form.
2. The form allows for a text description and one photo upload.
3. A new ticket is created in the database with a "New" status.
4. The Tenant can view a list of their submitted tickets.

## **Story 1.4: Supervisor Ticket Dashboard & Assignment**
**As a** Supervisor, **I want** to see a list of all "New" tickets and assign a Technician, **so that** I can dispatch staff.
**Acceptance Criteria:**
1. A logged-in Supervisor can view a dashboard of "New" tickets.
2. The Supervisor can select a ticket to view its details.
3. The Supervisor can select and assign a registered Technician to the ticket.
4. The ticket status changes to "Assigned" and the Technician is notified.

## **Story 1.5: Technician Ticket Management & Completion**
**As a** Technician, **I want** to view my assigned tickets and mark them as complete, **so that** I can manage my workload.
**Acceptance Criteria:**
1. A logged-in Technician can see a list of tickets assigned to them.
2. The Technician can update a ticket's status to "In Progress".
3. The Technician can update the ticket's status to "Completed".
4. The Tenant and Supervisor are notified of completion.

---