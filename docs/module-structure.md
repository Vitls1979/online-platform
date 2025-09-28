# Modular Code Structure

This document describes the modular layout of the codebase to keep domains isolated while allowing shared utilities to be reused.

```
/ (monorepo root)
├── apps
│   ├── web                 # Next.js frontend
│   └── api                 # NestJS GraphQL/REST gateway
├── services
│   ├── payment-gateway     # External payment integration workers
│   ├── provider-*          # Individual game provider adapters
│   └── reporting-worker    # ETL and report generation jobs
├── libs
│   ├── common              # DTOs, utility functions, constants
│   ├── database            # Prisma/TypeORM clients, migrations
│   ├── messaging           # Kafka/NATS abstractions
│   └── observability       # OpenTelemetry setup, logging utilities
└── infra
    ├── docker              # Dockerfiles, docker-compose
    ├── k8s                 # Helm charts, manifests
    └── ci                  # CI/CD pipeline definitions
```

## Apps
- **apps/web**: Next.js project organized by feature folders (e.g., `features/auth`, `features/wallet`). Each feature exposes hooks and UI components backed by React Query services.
- **apps/api**: NestJS API gateway exposing GraphQL schema and REST endpoints for provider/payment callbacks. Each domain module (auth, user, wallet, game, report, admin) lives under `apps/api/src/modules/<module>`.

## Services
- **services/payment-gateway**: Handles asynchronous payment events, reconciliation, and AML checks using the PaymentService domain logic.
- **services/provider-***: One service per game provider implementing the `GameProviderAdapter` interface. These services communicate with the API gateway via gRPC or message bus.
- **services/reporting-worker**: Consumes domain events, performs ETL into ClickHouse, and precomputes aggregates for common reports.

## Libraries
- **libs/common**: Shared TypeScript interfaces, DTOs, error classes.
- **libs/database**: Database clients, migration scripts, repository interfaces.
- **libs/messaging**: Abstractions for producing/consuming Kafka/NATS messages.
- **libs/observability**: Configuration for logging, metrics, tracing to ensure consistency across services.

## Infrastructure
- **infra/docker**: Base images for Node.js services, ClickHouse initialization scripts.
- **infra/k8s**: Kubernetes manifests with secrets management, auto-scaling policies, service mesh configs.
- **infra/ci**: GitHub Actions/Argo workflows for building, testing, and deploying services.

## Code Generation & Templates
- Schematics or Nx generators scaffold modules with consistent folder structure, providers, DTOs, and tests.
- Shared ESLint/Prettier configs enforce code quality across the monorepo.
- Commit hooks (Husky) run lint/test suites relevant to changed files.
