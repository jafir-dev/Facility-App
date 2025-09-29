# **API Specification**

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
