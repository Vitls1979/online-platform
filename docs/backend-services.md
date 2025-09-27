# Backend (NestJS) модули и сервисы

## Общая структура репозитория

```
backend/
├── nest-app/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   ├── modules/
│   │   │   ├── user/
│   │   │   ├── wallet/
│   │   │   ├── game/
│   │   │   ├── payment/
│   │   │   ├── report/
│   │   │   └── admin/
│   │   └── infra/
│   ├── test/
│   └── package.json
├── worker-etl/
│   └── src/
└── gateway/
    └── src/
```

## Технологии и библиотеки

- **NestJS**: основной фреймворк.
- **TypeORM**: работа с PostgreSQL.
- **@nestjs/redis**: управление сессиями в Redis.
- **@nestjs/microservices**: интеграция с Kafka/NATS.
- **Passport + JWT**: аутентификация и авторизация.
- **class-validator / class-transformer**: валидация DTO.
- **BullMQ**: очереди фоновых задач (например, email, отчёты).

## Сервисы

### AuthService
- Telegram OAuth (через TelegramLoginStrategy).
- Email подтверждение и генерация одноразовых кодов.
- Управление JWT (access/refresh) и ротация токенов.
- Поддержка TOTP (Google Authenticator) и SMS 2FA.

### UserService
- CRUD профиля.
- Управление KYC статусами, Responsible Gaming настройками.
- Хранение согласий и предпочтений уведомлений.

### WalletService
- Создание кошельков при регистрации.
- Проведение транзакций через шаблоны команд (CommandHandler).
- Поддержка идемпотентности и блокировок на уровне БД.
- Публикация событий `wallet.transaction.completed` в Kafka.

### GameService
- Каталог и управление провайдерами.
- Лаунч игровых сессий, генерация SSO токенов.
- Обработка провайдерских вебхуков (ставки, выигрыши).

### PaymentService
- Создание и обновление платежных intent'ов.
- Верификация вебхуков и защита от повторов.
- Работа с лимитами Responsible Gaming и проверками KYC.

### ReportingService
- Построение запросов к ClickHouse.
- Планирование и кеширование отчётов.
- Экспорт в разные форматы через worker-очереди.

### AdminService
- Управление сущностями (пользователи, игры, провайдеры, платежи).
- Дашборды с KPI и событиями безопасности.

## Мониторинг и Observability

- `@nestjs/terminus` для health-check.
- `@opentelemetry/api` + `nestjs-otel` для трассировки.
- Метрики (Prometheus) через `@willsoto/nestjs-prometheus`.
- Логирование в JSON (Pino) и отправка в Loki/ELK.

## Тестирование

- Unit тесты: Jest + testing module builder.
- Интеграционные тесты: запуск PostgreSQL/Redis через Testcontainers.
- Контрактные тесты: Pact для взаимодействия с провайдерами.

