# **Deployment Architecture**

A GitHub Actions CI/CD pipeline will automate testing and deployment. On a push to the main branch, it will build all applications. The backend and web frontends will be deployed to the Linode VPS via SSH, with the backend using a zero-downtime reload via PM2. Mobile apps will be deployed to the Google Play Store and Apple App Store.

---
