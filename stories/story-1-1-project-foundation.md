# Story: Project Foundation & Monorepo Setup

**Story ID**: Story 1-1
**Branch**: `feature/story-1-1`
**Dependencies**: None
**Parallel-safe**: true
**Module**: Project structure and build system
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** developer, **I want** the monorepo structure with initial app scaffolding for the backend, web portal, and mobile app, **so that** the development team has a consistent and ready-to-use foundation.

## Acceptance Criteria
1. A monorepo is initialized with Turborepo
2. A placeholder NestJS application is created in `apps/api`
3. A placeholder Next.js application is created in `apps/web`
4. A placeholder Flutter application is created in `apps/mobile`
5. Basic linting and TypeScript configurations are shared
6. Docker configuration for local development is set up
7. GitHub Actions CI/CD pipeline is configured

## Technical Implementation Details

### Monorepo Structure
```
zariya-monorepo/
├── apps/
│   ├── api/          # NestJS Backend API
│   ├── web/          # Next.js Admin Portal
│   └── mobile/       # Flutter Mobile App
├── packages/
│   ├── shared-types/ # TypeScript interfaces shared across apps
│   └── ui/           # Shared React components (if needed)
├── infrastructure/
│   ├── docker/
│   └── ci-cd/
├── docs/
├── .github/
└── turborepo.json
```

### Key Configuration Files
- `turborepo.json`: Build system configuration
- `package.json`: Root package with shared scripts
- `docker-compose.yml`: Local development environment
- `.eslintrc.js`: Shared linting rules
- `tsconfig.base.json`: Base TypeScript configuration

### Development Setup
- Initialize Turborepo monorepo
- Set up shared TypeScript configuration
- Configure ESLint and Prettier for code consistency
- Create Docker Compose for local development (PostgreSQL, Redis)
- Set up GitHub Actions for CI/CD pipeline
- Configure VS Code workspace settings

### Integration Points
- Shared TypeScript types package for consistent interfaces
- Shared linting and formatting rules
- Centralized dependency management
- Consistent build and test commands across all apps

## Success Metrics
- ✅ Monorepo builds successfully with `pnpm build`
- ✅ All applications start in development mode with `pnpm dev`
- ✅ Docker Compose spins up local environment successfully
- ✅ GitHub Actions pipeline passes on initial commit
- ✅ Linting passes across all packages
- ✅ TypeScript compilation succeeds for all apps

## Notes for Developers
- Focus on infrastructure, not business logic
- Use placeholder components and routes
- Ensure all apps can run independently
- Set up proper environment variable management
- Document development setup process in README.md