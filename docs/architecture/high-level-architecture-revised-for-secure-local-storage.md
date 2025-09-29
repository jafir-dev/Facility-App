# **High Level Architecture (Revised for Secure Local Storage)**

## **Technical Summary**
The Zariya platform will be a cloud-native, full-stack application built on a self-managed Linode VPS. It will feature a Flutter mobile application and a Next.js web portal, both communicating with a Node.js backend running on the same server. The architecture will be a modular monolith, with Nginx acting as a reverse proxy and API gateway. This design gives us full control over the stack while placing the responsibility for security, scaling, and maintenance directly on us.

## **Platform and Infrastructure Choice**
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

## **High Level Architecture Diagram**
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

## **Secure File Access Implementation**

* **Private Storage**: All user-uploaded files will be stored in a directory outside of the public web root (e.g., /var/lib/zariya/uploads).
* **API as Gatekeeper**: A user's app will request a file via a dedicated API endpoint.
* **Authorization Check**: The Node.js API will receive the request, validate the user's Firebase token, and verify they have permission to access the file.
* **Secure Serving**: Once authorized, the API will securely serve the file to the user, using a high-performance method like Nginx's X-Accel-Redirect.

## **Tech Stack**

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
