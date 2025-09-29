# **Epic 2: Quoting, Verification & Advanced Media**
**Expanded Goal:** This epic enhances the core workflow by introducing the system for paid work, adding video support to tickets, and replacing the basic completion flow with the more secure OTP verification.

## **Story 2.1: Supervisor Quote Creation**
**As a** Supervisor, **I want** to create and add a detailed quote to a ticket, **so that** I can inform the tenant of costs.
**Acceptance Criteria:**
1. A Supervisor can initiate a "Create Quote" action on a ticket.
2. The quote form includes fields for material and labor costs.
3. Submitting the quote changes the ticket status to "Pending Quote Approval".
4. The Tenant is notified that a quote is ready.

## **Story 2.2: Tenant Quote Review and Approval**
**As a** Tenant, **I want** to review a quote and either approve or decline it, **so that** I have control over paid work.
**Acceptance Criteria:**
1. The Tenant can view the itemized quote in their app.
2. The interface provides "Approve" and "Decline" actions.
3. Approving changes the status to "Approved" and notifies the Supervisor.
4. Declining changes the status to "Declined" and notifies the Supervisor.

## **Story 2.3: Add Video to Ticket Creation**
**As a** Tenant, **I want** to attach a video file when creating a ticket, **so that** I can better demonstrate the issue.
**Acceptance Criteria:**
1. The "New Ticket" form includes an option to upload a video file.
2. The system supports common mobile video formats.
3. The uploaded video is viewable by the Supervisor and Technician.

## **Story 2.4: Technician "Before & After" Media**
**As a** Technician, **I want** to upload "before" and "after" media, **so that** I can provide clear documentation of the job.
**Acceptance Criteria:**
1. A Technician has options to upload "Before Work" and "After Work" media (photos/videos).
2. The media is stored and associated with the ticket for review.

## **Story 2.5: OTP Completion Flow**
**As a** Tenant, **I want** to receive a secure OTP to provide to the technician, **so that** I can confirm the work is completed to my satisfaction.
**Acceptance Criteria:**
1. A Technician triggers a "Request OTP" action in their app.
2. The system generates an OTP and sends it to the Tenant's email.
3. The Technician's app has a field to enter the OTP.
4. Entering the correct OTP updates the ticket status to "Completed".

---