# Online Gaming Platform Architecture

## Overview
This document outlines the proposed architecture for an online gaming platform that supports Telegram-based registration, secure wallet management, integrations with game providers and payment gateways, as well as extensive reporting and administrative tooling.

The solution is designed for modularity and scalability. Each business capability is isolated in its own bounded context with clear API contracts and event-driven integrations.

## High-Level System Diagram
```
[Client Apps]
     |
 [API Gateway / BFF]
     |
+---------------------------+
|       Core Services       |
|---------------------------|
| Auth | User | Wallet      |
| Game | Payment | Report   |
| Admin | Notification      |
+---------------------------+
     |
     |----> PostgreSQL (OLTP)
     |----> Redis (Cache & Sessions)
     |----> ClickHouse (Analytics)
     |----> Kafka/NATS (Event Bus)
     |----> External Providers (Games, Payments)

Supporting services: OpenTelemetry Collector, Prometheus, Grafana, MCP Orchestrator.
```

## Frontend Architecture
- **Framework**: Next.js (App Router) with React 18 and TypeScript.
- **Styling**: TailwindCSS, shadcn/ui component library, Radix primitives for accessibility.
- **State Management**: React Query for data fetching, Zustand or Context for lightweight client state (e.g., UI preferences).
- **Real-time updates**: WebSockets (via Socket.IO or GraphQL subscriptions) for balance changes, game session status, and administrative alerts.
- **Routing**: Public marketing pages, authentication flows, player dashboard, game launcher, report builder, admin panel.
- **Testing**: Playwright for E2E, Vitest/React Testing Library for unit/integration tests.

### Frontend Modules
| Module | Description |
| --- | --- |
| **Auth** | Telegram login widget, email confirmation, 2FA setup/verification. |
| **Dashboard** | Balance widgets, transaction feed, responsible gaming tools. |
| **Game Catalog** | Provider filters, search, favorites, launch sessions. |
| **Wallet** | Deposit/withdrawal workflows, payment status indicators. |
| **Reports** | Builder UI, saved templates, export controls. |
| **Admin** | CRUD interfaces for users/games/payments, monitoring dashboards. |

## Backend Architecture (NestJS)
- **Structure**: Monorepo organized by domain modules under `/apps/api` and shared libraries under `/libs`.
- **API Layer**: GraphQL (Apollo Server) for flexible querying and subscriptions. REST endpoints exposed where required by providers or payment webhooks.
- **Database Access**: Prisma or TypeORM for PostgreSQL; custom repositories for ClickHouse via `@clickhouse/client`.
- **Caching & Sessions**: Redis (ioredis) for session storage, rate limiting, and data caching.
- **Messaging**: Kafka or NATS for async workflows (payment notifications, game events, ETL triggers).
- **Monitoring**: OpenTelemetry instrumentation with exporters to Prometheus; structured logging (pino) aggregated in ELK or Loki.
- **Containerization**: Dockerfiles per service; Kubernetes deployment with Helm charts and MCP server orchestrating service lifecycle.

### Core Backend Modules
| Module | Responsibilities | Integrations |
| --- | --- | --- |
| **AuthModule** | Telegram OAuth callback, email verification, password/2FA management. | Redis, PostgreSQL, NotificationService. |
| **UserModule** | Profile management, KYC status, RG limits. | PostgreSQL, AdminModule. |
| **WalletModule** | Ledger management, balance projections, transaction workflows. | PostgreSQL, PaymentService, GameService. |
| **GameModule** | Game catalog, provider adapters, bet/win processing. | Provider APIs, Event Bus, WalletModule. |
| **PaymentModule** | Payment intent lifecycle, webhook handling, AML checks. | Payment Gateway API, Kafka/NATS. |
| **ReportModule** | Report templating, ClickHouse queries, exports. | ClickHouse, ETL jobs. |
| **AdminModule** | Backoffice APIs, audit logs, provider management. | All core modules, NotificationService. |

## Data Storage Strategy
- **PostgreSQL**: Source of truth for user identities, wallets, transactional ledger, KYC, configuration.
- **Redis**: Stores sessions, short-lived tokens (2FA, password reset), rate limiting counters, cached provider metadata.
- **ClickHouse**: Receives denormalized event data via ETL jobs or streaming; powers report builder and analytics dashboards.

### ETL Flow
1. Wallet and game events emitted to Kafka/NATS.
2. Streaming jobs (e.g., using Kafka Connect or custom Nest microservice) transform and load events into ClickHouse.
3. ReportModule queries ClickHouse via SQL templates parameterized by user selections.

## Integration Points
- **Telegram**: OAuth login (Bot API), linking to user profile, optional notifications via bot.
- **Email Provider**: Transactional emails (verification, 2FA backup codes).
- **Payment Gateway**: REST API for intents, webhooks for status updates, reconciliation jobs.
- **Game Providers**: Provider-specific adapters implementing a common interface (launch session, bet, settle win, balance check).
- **Notification Channels**: Telegram bot, email, optionally SMS or push notifications.

## Security Considerations
- Enforce MFA (Telegram + email confirmation + optional TOTP/SMS).
- Implement RG policies (age verification, self-exclusion, deposit limits).
- Store secrets in Vault (HashiCorp) or cloud secret manager.
- Apply OWASP ASVS controls, rate limiting, anomaly detection, fraud rules.
- GDPR compliance: data retention policies, user consent tracking, right to be forgotten.

## Deployment & DevOps
- **Local Development**: Docker Compose orchestrating PostgreSQL, Redis, ClickHouse, Kafka, MinIO (for file storage), Mailhog, Mock providers.
- **CI/CD**: GitHub Actions pipelines for linting, testing, building Docker images, deploying to staging/prod clusters via Argo CD.
- **Monitoring**: Grafana dashboards built on Prometheus metrics, Loki logs, and Tempo traces.
- **Alerting**: PagerDuty or Opsgenie integration with thresholds for payment failures, provider downtime, anomalous game activity.

## Roadmap
| Phase | Duration | Deliverables |
| --- | --- | --- |
| **Phase 1** | 1-2 months | Auth flows, wallet basics, single provider/payment integration, MVP dashboard. |
| **Phase 2** | 2-3 months | Report builder, ClickHouse analytics, admin panel. |
| **Phase 3** | 4-6 months | Infrastructure hardening, observability, fraud detection, multi-provider expansion. |

## Documentation Plan
- API schemas via Swagger/OpenAPI (REST) and GraphQL SDL.
- ER diagrams and migration runbooks.
- Developer onboarding guides, CI/CD documentation, test strategy.
- User manuals for players and administrators covering key workflows.
