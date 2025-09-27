# Online Gaming Platform Architecture & Delivery Plan

## 1. Product Vision & Goals

The platform delivers a regulated online gambling experience where players can register through Telegram and email, deposit or withdraw funds, launch games from multiple providers, and receive personalized insights. The architecture favors modularity so that new jurisdictions, payment options, and content providers can be introduced without reworking the entire codebase.

**Primary business and technical goals**

- **Acquisition & retention**: smooth onboarding with Telegram SSO and email-based 2FA, a responsive web app, and real-time engagement features.
- **Regulatory compliance**: auditable player lifecycle, responsible gaming tooling, and segregated wallet accounting.
- **Operational excellence**: centralized observability, infrastructure-as-code, progressive delivery with canary automation, CI/CD automation to reduce release risk, and error-budget-driven release cadences to maintain velocity.
- **Scalability & resilience**: microservice-ready backend with asynchronous messaging, horizontal scaling, clearly defined domain boundaries, automated failover playbooks, and active-active disaster recovery options.

> **Сводка на русском языке.** Платформа покрывает полный цикл работы игрока — от регистрации через Telegram и email (2FA) до проведения платежей, начисления бонусов и построения отчетов. Архитектура строится модульно, чтобы можно было масштабировать систему, подключать новых провайдеров и платежные сервисы без переписывания ядра.
>
> - **Масштабируемость**: разбиение на независимые сервисы, использование брокера сообщений для асинхронных операций.
> - **Надежность и устойчивость**: централизованный мониторинг и логирование, продуманное резервное копирование.
> - **Безопасность**: многофакторная аутентификация, управление сессиями в Redis, соблюдение KYC/RG требований.
> - **Гибкость**: модульная структура и возможность быстро внедрять новых провайдеров, платежные шлюзы и сценарии аналитики.

### 1.1 Architecture Principles

- **Modularity first**: each bounded context can scale and be deployed independently without rewriting shared contracts.
- **Security by default**: secrets management, least-privilege IAM, and encrypted transport/storage are considered table stakes rather than add-ons.
- **API-first collaboration**: REST and event schemas are versioned artifacts so providers and internal teams can iterate without regressions.
- **Ops automation**: infrastructure, data retention, and compliance evidence capture are automated through pipelines to avoid manual drift.

## 2. Target Audiences & Journeys

| Persona | Needs | Key Journeys |
| --- | --- | --- |
| Player | Quick registration, trusted payments, transparent history | Register with Telegram & email → verify identity → deposit → launch games → track transactions → request withdrawal |
| Compliance officer | Reliable records, RG controls | Review KYC status → adjust limits → audit wallet transactions |
| Operations/admin | Catalog management, manual interventions | Manage games and providers → process payouts → issue manual bonuses |
| Analyst | Detailed reporting, ad-hoc insights | Configure ClickHouse reports → schedule exports → analyze player cohorts |

## 3. System Architecture Overview

```
Client (Next.js) ──▶ API Gateway (NestJS BFF)
                         │
                         ├─▶ Domain Modules (Auth, User, Wallet, Game, Report, Admin,
                         │   Notification, Monitoring)
                         │
                         ├─▶ Integration Services ──▶ Game Providers / Payment Gateways
                         │
                         ├─▶ PostgreSQL (transactions, identities)
                         │
                         ├─▶ Redis (sessions, cache)
                         │
                         ├─▶ Kafka / NATS (events, webhooks) ──▶ Worker Services
                         │
                         └─▶ ClickHouse (analytics) ──▶ Reporting & BI
```

> **Диаграмма на русском языке.**
>
> ```
> Client (Next.js) -> API Gateway (NestJS) -> Модули домена -> Сервисы интеграций
>                                               |                  |
>                                               v                  v
>                                            PostgreSQL          Провайдеры игр
>                                               |
>                                               v
>                                            Kafka/NATS -> асинхронные задачи -> Worker-сервисы
>                                               |
>                                               v
>                                           ClickHouse (ETL) -> Отчеты и аналитика
> ```

### 3.1 Frontend

- **Next.js (React + TypeScript)** as the primary application shell.
- **Tailwind CSS** and **shadcn/ui** for the component design system.
- **React Query** for data fetching and client-side caching.
- **WebSocket / GraphQL subscriptions or Socket.IO** to surface live balance updates, gameplay status, and alerts.

> **Локализация (Frontend, RU).** Клиентское приложение собирается на Next.js (React + TypeScript), использует Tailwind CSS и shadcn/ui в качестве дизайн-системы. Для работы с данными применяется React Query, а живые обновления (баланс, состояние игр, оповещения) доставляются через WebSocket/GraphQL subscriptions или Socket.IO.

### 3.2 Backend & Domain Services

- **NestJS (TypeScript)** to implement an API Gateway / BFF and modular microservices.
- **Auth Module**: Telegram registration, email 2FA, JWT/refresh management, RG enforcement.
- **User Module**: profile management, KYC state, notification preferences, player limits.
- **Wallet Module**: multi-currency wallets, transaction ledger, payment gateway integration.
- **Game Module**: game catalog, launch session handling, provider callbacks, bet/settlement processing.
- **Report Module**: ClickHouse querying, report scheduling, export management (S3/MinIO).
- **Admin Module**: CRUD for users, games, payments, manual adjustments.
- **Notification Module**: outbound messaging via Telegram, email, and SMS providers.
- **Monitoring Module**: health checks, metrics export, alert thresholds.
- **Worker services** subscribe to Kafka/NATS topics for asynchronous processing (payments, ETL, notifications).

> **Локализация (Backend, RU).** Backend строится на NestJS: BFF/API Gateway обслуживает фронтенд и маршрутизирует запросы к доменным сервисам. Auth Module обрабатывает регистрацию через Telegram, email и JWT/refresh токены; User Module управляет профилями, статусами KYC и лимитами; Wallet Module ведет кошельки и интеграции с платежами; Game Module управляет каталогом, сессиями и колбэками провайдера; Report Module формирует отчеты и взаимодействует с ClickHouse; Admin Module обеспечивает административный CRUD; Notification Module отвечает за рассылки (Telegram/email/SMS); Monitoring Module экспортирует метрики и health-check'и. Рабочие сервисы подписаны на Kafka/NATS для фоновых задач.

### 3.3 Data & Storage Strategy

- **PostgreSQL** for transactional data (accounts, wallets, transactions, configurations).
- **Redis** for session storage, caching, rate limiting, and transient gameplay data.
- **ClickHouse** for high-volume analytical workloads, ETL aggregates, and long-term history.
- **Object storage (MinIO/S3)** for report exports and large attachments.
- **Backup & retention** policies applied per store; PITR for PostgreSQL, snapshotting for ClickHouse, and multi-region replication for object storage when required.

> **Локализация (Хранение данных, RU).** PostgreSQL используется для транзакционных данных (пользователи, кошельки, транзакции, настройки). Redis хранит сессии, кеш и служит для rate limiting. ClickHouse — аналитическое хранилище и источник для отчетов. Объектное хранилище (MinIO/S3) собирает выгрузки. Для каждой базы определены политики бэкапов: PITR для PostgreSQL, snapshot'ы для ClickHouse, многорегиональная репликация для объектного стора.

### 3.4 Integrations & External Systems

- **Payment gateways** (Stripe, PayPal, or local acquirers) for deposits and withdrawals.
- **Game providers** via APIs, SSO launch URLs, and callback endpoints.
- **Telegram Bot API** for authentication and high-priority notifications.
- **Email/SMS providers** for confirmations, 2FA, and responsible gaming alerts.
- **Compliance/KYC vendors** (optional) for document verification and AML screening.

> **Локализация (Интеграции, RU).** Платежные шлюзы (Stripe, PayPal или локальные эквайринги) поддерживают депозиты и выводы. Игровые провайдеры интегрируются через API, SSO и callback-эндпоинты. Telegram Bot API покрывает авторизацию и критичные уведомления. Email/SMS провайдеры используются для подтверждений и RG-оповещений. Дополнительно подключаются KYC/AML сервисы для верификации документов.

## 4. Key Data Flows

1. **Registration & Authentication**
   1. Player initiates signup via Telegram Bot; auth payload reaches the BFF.
   2. Email confirmation and TOTP for 2FA are enforced.
   3. Core identity data and KYC status persist in PostgreSQL; session state is stored in Redis.

2. **Gameplay Loop**
   1. Player browses the game catalog (sourced from the Game Module with Redis caching).
   2. API Gateway requests a launch session from the Game Service; provider responds with a launch URL or SSO token.
   3. Provider callbacks with bet outcomes publish events to Kafka/NATS.
   4. Wallet Service consumes the events, updates balances, and records transactions in PostgreSQL.
   5. ETL jobs stream aggregated data into ClickHouse for analytics.

3. **Payments**
   1. Deposit: frontend → BFF → Payment Service → payment intent creation → redirect/iframe to gateway.
   2. Gateway webhook → Kafka/NATS → Wallet Service finalizes the transaction and adjusts wallet balances.
   3. Withdrawal: KYC and RG checks → payout request creation → webhook-driven status updates.

4. **Reporting & Analytics**
   1. Analyst configures filters in the UI → Report Module generates ClickHouse SQL.
   2. Reports are materialized, stored in object storage, and shared via secure download links.
   3. Notifications inform stakeholders about report availability (Telegram/email).

> **Локализация (Потоки данных, RU).**
> 1. Регистрация и аутентификация: пользователь стартует регистрацию через Telegram Bot, подтверждает email и проходит 2FA; данные и статусы KYC сохраняются в PostgreSQL, сессии — в Redis.
> 2. Игровой процесс: пользователь выбирает игру (каталог + кеш Redis), BFF запрашивает launch session у Game Service, провайдер отправляет URL/SSO, исходы ставок публикуются в Kafka, Wallet Service обновляет баланс и транзакции, ETL синхронизирует ClickHouse.
> 3. Платежи: депозит через BFF → Payment Service → провайдер; вебхуки обновляют статусы в Kafka и кошельке; выводы проходят проверки KYC/RG и отслеживаются по вебхукам.
> 4. Отчеты: пользователь задает фильтры → Report Module генерирует SQL → отчет сохраняется в S3/MinIO → отправляется уведомление.

## 5. Domain Model Highlights

### 5.1 Users & Sessions

- `User`: id, telegramId, email, phone, status, kycStatus, rgFlags, createdAt.
- `UserSettings`: userId, notificationPreferences, securitySettings (2FA, trustedDevices).
- `Session`: userId, refreshToken, expiresAt, deviceInfo.

### 5.2 Wallets & Transactions

- `Wallet`: userId, currency, availableBalance, bonusBalance, lockedBalance.
- `Transaction`: id, userId, type (deposit/withdrawal/bet/win/bonus), amount, currency, status, referenceId.
- `Payment`: id, userId, gateway, amount, status, metadata, kycRequired.

### 5.3 Games & Bets

- `Game`: id, providerId, name, category, volatility, launchUrl, currencies.
- `GameSession`: id, userId, gameId, providerSessionId, status, startedAt, endedAt.
- `Bet`: id, gameSessionId, amount, currency, outcome, winAmount.

### 5.4 Reporting

- `ReportTemplate`: id, userId/adminId, filters, metrics, schedule.
- `ReportJob`: id, templateId, status, generatedAt, storageLocation.
- ClickHouse tables: `transactions_log`, `bets_log`, `payments_log`, `user_activity`.

> **Локализация (Доменная модель, RU).**
> - Пользователи: `User`, `UserSettings`, `Session`.
> - Балансы и транзакции: `Wallet`, `Transaction`, `Payment`.
> - Игры: `Game`, `GameSession`, `Bet`.
> - Отчеты: `ReportTemplate`, `ReportJob`, а также ClickHouse-таблицы `transactions_log`, `bets_log`, `payments_log`, `user_activity`.

## 6. Security, Compliance & Responsible Gaming

- Multi-factor authentication (Telegram auth + email verification + TOTP/SMS).
- RBAC with clear separation between players, support, admins, and analysts.
- Responsible Gaming controls: deposit/time limits, self-exclusion, age verification, RG alerts.
- Administrative action logging and immutable audit trails.
- Session management with Redis, JWT rotation, and device fingerprinting.
- WAF, rate limiting, bot detection, and DDoS mitigation at the edge.
- Data encryption at rest (PostgreSQL, ClickHouse) and in transit (TLS everywhere).

> **Локализация (Безопасность и RG, RU).** Telegram-авторизация + email-подтверждение + TOTP/SMS формируют MFA. Используется ролевая модель (игрок, саппорт, админ, аналитик). Реализуются ограничения по RG: лимиты депозитов/времени, самоисключение, проверка возраста. Все действия логируются, применяются WAF, rate limiting и защита от DDoS.

## 7. Observability & Operations

- **OpenTelemetry** to propagate traces from the frontend through backend services and to external providers.
- **Prometheus + Grafana** dashboards for request throughput, latency, error budgets, Kafka topic lag, and resource consumption.
- **ELK/EFK** stack for centralized structured logging and correlation with player actions.
- **Alertmanager** (Telegram/email channels) for operational and compliance alerts.
- Runbooks and SLOs maintained per service, with synthetic checks for critical journeys.

> **Локализация (Мониторинг, RU).** OpenTelemetry обеспечивает трассировку запросов. Prometheus + Grafana собирают метрики (RPS, латентность, ошибки, лаг Kafka). Центральное логирование строится на ELK/EFK. Alertmanager доставляет уведомления (Telegram/email).

## 8. Delivery Roadmap

### Phase 0 – Foundations (Weeks 0–2)
- Establish monorepo structure, CI/CD skeleton, and local Docker Compose environment.
- Implement Auth + User modules with Telegram and email flows.
- Stand up PostgreSQL, Redis, and observability baseline.

### Phase 1 – Core Experience (Weeks 3–8)
- Deliver Wallet module with string-safe currency handling and payment gateway integration.
- Launch catalog UI with real-time balance updates and a first game provider integration.
- Provide transaction history, bonus balance display, and responsible gaming settings.

### Phase 2 – Analytics & Operations (Weeks 9–16)
- Build ETL pipelines to ClickHouse and the Report module with scheduling.
- Release admin console for provider/payment management and manual adjustments.
- Expand RG tooling, add AML screening hooks, and enable multi-currency support.

### Phase 3 – Production Hardening (Weeks 17–24)
- Containerize services, introduce Kubernetes deployments, auto-scaling, and blue/green releases.
- Extend monitoring coverage, integrate antifraud scoring, and onboard additional providers.
- Implement disaster recovery drills and cross-region replication where applicable.

> **Локализация (План разработки, RU).**
> - Этап 1 (1–2 месяца): развернуть BFF, Auth, User, Wallet; интегрировать Telegram и почтовый сервис; подключить одного игрового провайдера и платежный шлюз; реализовать личный кабинет с балансом и историей операций.
> - Этап 2 (2–3 месяца): собрать конструктор отчетов, ETL и интеграцию с ClickHouse; выпустить админ-панель для управления пользователями/провайдерами/платежами; внедрить RG-функциональность.
> - Этап 3 (4–6 месяцев): расширить масштабирование (Kubernetes, auto-scaling), усилить мониторинг и antifraud, проводить DR-дриллы и подключать дополнительных провайдеров.

## 9. Documentation Plan

- **API documentation**: OpenAPI/Swagger for REST endpoints and GraphQL schema references.
- **Database schema**: ER diagrams, migration history, and governance for PostgreSQL and ClickHouse.
- **Developer onboarding**: setup scripts, Docker Compose instructions, test execution guidelines.
- **Runbooks & ops guides**: incident response, deployment playbooks, SLO reporting.
- **Compliance & RG manuals**: KYC checklists, RG policy enforcement, audit evidence collection.
- **User-facing guides**: registration, deposits/withdrawals, gameplay tips, report consumption.

## 10. CI/CD Reference Pipeline (GitHub Actions)

```yaml
name: ci
on:
  push:
    branches: [ main ]
  pull_request: {}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        ports: [5432:5432]
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install --legacy-peer-deps
      - run: npm run lint
      - run: npm run test
```

## 11. Deployment Environments

- **Local & CI**: Docker Compose for PostgreSQL, Redis, ClickHouse, and mock provider services to mirror production contracts.
- **Staging**: Managed PostgreSQL/Redis instances with feature-flag toggles, seeded wallets, and anonymized production telemetry for load validation.
- **Production**: Multi-AZ Kubernetes clusters with blue/green rollouts, automated database migrations, and read replicas for analytics workloads.
- **Disaster recovery**: Warm standby region with asynchronous replication and quarterly failover drills coordinated with payment providers.

## 12. Quality & Release Governance

- **Automated testing**: Contract tests for provider integrations, end-to-end Cypress flows for player journeys, and load tests that validate session concurrency.
- **Change management**: Trunk-based development with short-lived feature branches, progressive delivery through canary stages, and rollback playbooks per service.
- **Security reviews**: Scheduled threat-model updates, dependency scanning, and quarterly tabletop exercises for regulatory incidents.
- **Stakeholder communication**: Release notes distributed to compliance, operations, and VIP support teams with links to updated runbooks and KPIs.

## 13. Open Questions & Next Steps

- Prioritize which additional payment gateways to onboard for launch geography coverage.
- Finalize provider certification requirements and mapping of jurisdictional compliance documents.
- Define SLAs for external integrations (KYC, payment gateways) and document contingency flows.
- Confirm analytics retention policy alignment between ClickHouse and long-term cold storage.
