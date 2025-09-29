# **Requirements**

## **Functional Requirements**
1.  **FR1:** The system must support seven distinct user roles (Tenant, Building Owner, FMC Head, Supervisor, Technician, Procurement, Vendor) with granular Role-Based Access Control (RBAC).
2.  **FR2:** Tenants must be able to create a maintenance ticket that includes a description, photos, and video attachments.
3.  **FR3:** Supervisors must be able to view, assign, and monitor the status of all tickets within their assigned properties.
4.  **FR4:** The system must support a quoting mechanism for paid work, which requires tenant approval before proceeding.
5.  **FR5:** The system must include a procurement workflow for supervisors to request and the procurement team to manage materials for a job.
6.  **FR6:** Technicians must be able to view their assigned tickets, update their status, and upload "before and after" photos/videos.
7.  **FR7:** The system must implement an OTP (One-Time Password) flow where the tenant provides a code to the technician to verify a job's satisfactory completion.
8.  **FR8:** The system will automatically generate invoices and receipts for paid work upon verified completion.
9.  **FR9:** The system will send notifications for critical ticket events via in-app, push, and email channels.
10. **FR10:** The system must provide a ticket-specific integrated chat for real-time communication between relevant parties.

## **Non-Functional Requirements**
1.  **NFR1:** The system and all its data handling procedures must be compliant with the UAE's Personal Data Protection Law (PDPL).
2.  **NFR2:** The system must maintain an immutable audit trail, logging all significant actions performed on a ticket.
3.  **NFR3:** The mobile applications for iOS and Android must be developed using Flutter.
4.  **NFR4:** All APIs should have an average response time of under 500ms under normal load conditions.
5.  **NFR5:** The entire system infrastructure will be hosted on AWS.

---