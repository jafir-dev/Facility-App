# **Epic 3: Management Roles & Financials**
**Expanded Goal:** This epic expands the platform into a comprehensive management system by onboarding all remaining user roles and building out the complete financial lifecycle and initial analytics.

## **Story 3.1: Procurement Role & Workflow**
**As a** Procurement team member, **I want** to receive and manage material requests, **so that** I can efficiently purchase materials for jobs.
**Acceptance Criteria:**
1. A "Procurement" user has a dashboard to view new material requests.
2. The user can update the status (e.g., "Acknowledged," "Ordered," "Materials Ready").
3. A "Materials Ready" status notifies the requesting Supervisor.

## **Story 3.2: Automated Invoicing and Receipts**
**As a** Supervisor, **I want** the system to automatically generate an invoice when a paid job is completed, **so that** the billing process is streamlined.
**Acceptance Criteria:**
1. When a ticket with an approved quote is "Completed", an invoice is automatically generated.
2. The invoice is a PDF with FMC branding, ticket details, and the final amount.
3. The invoice is available for download and emailed to the Tenant.
4. A receipt is available after payment is marked as received.

## **Story 3.3: FMC Head & Building Owner Dashboards**
**As an** FMC Head or Building Owner, **I want** a read-only dashboard with key statistics, **so that** I can have high-level oversight.
**Acceptance Criteria:**
1. An FMC Head can view a dashboard summarizing ticket volumes and satisfaction scores across all properties.
2. A Building Owner can view a similar dashboard for their specific property.
3. These roles can view ticket details but cannot perform actions.

## **Story 3.4: Vendor Role & Assignment**
**As a** Supervisor, **I want** to assign a ticket to a Third-Party Vendor, **so that** specialized work can be delegated.
**Acceptance Criteria:**
1. A "Vendor" role can be registered in the system.
2. Supervisors can assign a ticket to a Vendor.
3. The assigned Vendor is notified and can manage the ticket via a simplified interface.
4. Vendor status updates are visible to the Supervisor and Tenant.

---