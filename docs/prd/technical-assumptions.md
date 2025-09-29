# **Technical Assumptions**

## **Repository Structure: Monorepo**
The project will be developed within a single monorepo (e.g., using Nx or Turborepo) to streamline development by simplifying code sharing between the Flutter mobile app, the React web portal, and the Node.js backend.

## **Service Architecture: Modular Monolith**
For the V1.0 launch, the backend will be built as a modular monolith. This architecture provides development velocity while enforcing strong domain boundaries, allowing for a future evolution into microservices if required.

## **Testing Requirements: Full Testing Pyramid**
A comprehensive testing strategy is required, including Unit Tests, Integration Tests, and End-to-End (E2E) Tests to ensure quality and stability.

## **Additional Technical Assumptions and Requests**
* **Mobile Frontend:** Flutter
* **Web Frontend:** React (Next.js)
* **Backend:** Node.js (NestJS)
* **Database:** PostgreSQL
* **Infrastructure:** AWS

---