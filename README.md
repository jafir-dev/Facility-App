# Zariya Facility App - Monorepo

A comprehensive facility management application built with a modern monorepo architecture.

## Tech Stack

- **Backend**: NestJS (Node.js)
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Mobile**: Flutter
- **Build System**: Turbo (monorepo)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker
- **CI/CD**: GitHub Actions

## Project Structure

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
└── turbo.json
```

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Flutter SDK (for mobile development)
- PostgreSQL (optional, Docker provided)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd zariya-monorepo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

### Development

1. Start development environment:
   ```bash
   # Start all services
   npm run dev

   # Start specific service
   npm run dev -- --filter=api
   npm run dev -- --filter=web
   ```

2. Run linting:
   ```bash
   npm run lint
   ```

3. Run tests:
   ```bash
   npm run test
   ```

4. Build all applications:
   ```bash
   npm run build
   ```

### Docker Development

1. Start local development environment:
   ```bash
   docker-compose up -d
   ```

2. This will start:
   - PostgreSQL on port 5432
   - Redis on port 6379
   - API on port 3001
   - Web on port 3000

## Scripts

- `npm run build` - Build all applications
- `npm run dev` - Start development servers
- `npm run lint` - Run linting
- `npm run test` - Run tests
- `npm run clean` - Clean build artifacts
- `npm run format` - Format code with Prettier

## Environment Variables

### API
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NODE_ENV` - Environment (development/production)

### Web
- `NEXT_PUBLIC_API_URL` - API server URL

### Mobile
- `API_BASE_URL` - API server URL

## Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD
The project includes GitHub Actions workflows for:
- Automated testing on push/PR
- Docker image building and pushing
- Flutter mobile app building
- Security scanning

## Code Style

- TypeScript for all JavaScript code
- ESLint for code linting
- Prettier for code formatting
- Conventional Commits for commit messages

## Testing

- Unit tests with Jest
- Integration tests with Supertest
- E2E tests with Playwright/Cypress
- Flutter widget tests

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

UNLICENSED