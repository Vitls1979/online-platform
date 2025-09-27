# Онлайн-платформа азартных игр

Проект описывает архитектуру и пример реализации модульной платформы, в которой пользователи регистрируются через Telegram, управляют балансом, играют и формируют отчёты. Репозиторий содержит документацию по архитектуре, базам данных, фронтенду и бэкенду, а также пример реализации `WalletService` на NestJS.

## Структура репозитория

```
.
├── README.md
├── docs/
│   ├── architecture.md
│   ├── backend-services.md
│   ├── database-schema.md
│   ├── frontend.md
│   └── reporting.md
└── backend/
    └── nest-app/
        └── src/
            └── modules/
                └── wallet/
                    ├── dto/
                    │   └── create-transaction.dto.ts
                    ├── wallet-account.entity.ts
                    ├── wallet-event.publisher.ts
                    ├── wallet.service.ts
                    └── wallet-transaction.entity.ts
```

## Основные компоненты

- **Frontend (Next.js)**: TailwindCSS, shadcn/ui, React Query, WebSocket для обновления балансов в реальном времени.
- **API Gateway / BFF (NestJS)**: единая точка входа, GraphQL/REST, защита и агрегация данных.
- **Сервисы**: пользовательский, кошельковый, игровой, платёжный, отчётный и административный модули.
- **Инфраструктура**: PostgreSQL, Redis, ClickHouse, Kafka/NATS, Prometheus, OpenTelemetry.

## Документация

- [Архитектура](docs/architecture.md)
- [Бэкенд сервисы](docs/backend-services.md)
- [Схемы баз данных](docs/database-schema.md)
- [Frontend](docs/frontend.md)
- [Конструктор отчётов](docs/reporting.md)

## Пример WalletService

В каталоге `backend/nest-app/src/modules/wallet` находится пример реализации кошелькового сервиса на NestJS с TypeORM. Он демонстрирует:

- работу с несколькими балансами пользователя;
- идемпотентные транзакции с блокировкой записей;
- публикацию событий в Kafka для аналитики и обновления баланса на фронтенде.

## Следующие шаги

1. Реализовать остальные сервисы (Auth, Game, Payment, Reporting) по спецификации.
2. Настроить инфраструктуру (Docker Compose для локальной среды, Helm/ArgoCD для продакшена).
3. Подключить мониторинг и систему оповещений.
4. Написать тесты и CI/CD пайплайн.

