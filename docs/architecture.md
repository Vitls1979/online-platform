# Онлайн-платформа азартных игр: архитектура и план разработки

## 1. Общее видение

Платформа предназначена для организации полного цикла взаимодействия игрока с игровыми провайдерами: от регистрации через Telegram и email (2FA) до проведения платежей, получения бонусов и построения отчетов. Архитектура построена по модульному принципу, что позволяет масштабировать систему, расширять интеграции и изменять бизнес-логику без переписывания всего кода.

Основные качества платформы:

- **Масштабируемость**: разбиение на отдельные сервисы и использование брокера сообщений для асинхронных операций.
- **Надежность и устойчивость**: мониторинг и централизованное логирование, продуманная система резервного копирования.
- **Безопасность**: многофакторная аутентификация, управление сессиями в Redis, соблюдение требований KYC/RG.
- **Гибкость**: модульная структура и возможность расширения через внедрение новых провайдеров, платежных шлюзов и аналитических сценариев.

## 2. Технологический стек

### 2.1 Frontend

- **Next.js (React + TypeScript)** — основа клиентского приложения.
- **Tailwind CSS** + **shadcn/ui** — дизайн-система и готовые компоненты.
- **React Query** — работа с данными и управление кэшированием API-запросов.
- **WebSocket (через GraphQL subscriptions или Socket.IO)** — онлайн-обновления баланса, состояний игр, оповещений.

### 2.2 Backend

- **NestJS (TypeScript)** — основной фреймворк для микросервисов и BFF.
- **API Gateway / BFF** — единственная точка входа для фронтенда.
- **PostgreSQL** — транзакционная база данных (пользователи, транзакции, настройки).
- **Redis** — кеш, сессии, rate limiting, временные данные.
- **ClickHouse** — аналитика, хранение исторических данных.
- **Kafka или NATS** — асинхронные события, вебхуки, интеграции.
- **OpenTelemetry + Prometheus + Grafana** — наблюдаемость, метрики, трассировки.
- **Keycloak/Custom Auth** (опционально) — централизованное управление пользователями и 2FA.

### 2.3 Интеграции

- **Платежный шлюз** (Stripe, PayPal или локальные эквайринги) — операции депозита и вывода.
- **Игровые провайдеры** (через API, SSO, callback-эндпоинты) — запуск игр, ставки, выплаты.
- **Telegram Bot API** — авторизация и уведомления.
- **Email/SMS провайдеры** — подтверждение email, 2FA, RG оповещения.

## 3. Высокоуровневая архитектура

```
Client (Next.js) -> API Gateway (NestJS) -> Модули домена -> Сервисы интеграций
                                              |                  |
                                              v                  v
                                           PostgreSQL          Провайдеры игр
                                              |
                                              v
                                           Kafka/NATS -> асинхронные задачи -> Worker-сервисы
                                              |
                                              v
                                          ClickHouse (ETL)
                                              |
                                              v
                                         Отчеты и аналитика
```

### 3.1 Модульная структура Backend

- **Auth Module**: регистрация через Telegram, email 2FA, управление JWT/refresh токенами, RG ограничения.
- **User Module**: профили, KYC статусы, лимиты, настройки уведомлений.
- **Wallet Module**: кошельки, балансы, транзакции, интеграция с платежной системой.
- **Game Module**: каталог игр, запуск сессий, прием колбеков, учет ставок/выигрышей.
- **Report Module**: генерация отчетов, фильтры, построение запросов к ClickHouse.
- **Admin Module**: CRUD по пользователям, играм, платежам, ручные операции.
- **Notification Module**: рассылки, уведомления о критичных событиях (Telegram/email/SMS).
- **Monitoring Module**: экспорт метрик, health-checkи, алерты.

Каждый модуль реализуется в виде отдельного пакета NestJS и может разворачиваться как отдельный микросервис при необходимости масштабирования.

### 3.2 Инфраструктура и деплой

- **Docker Compose** — локальная разработка: сервисы приложений, PostgreSQL, Redis, ClickHouse, Kafka, MinIO (для хранения файлов, если нужно).
- **Kubernetes** — продакшн: Helm charts, auto-scaling, rolling обновления.
- **CI/CD** — GitHub Actions/GitLab CI: линтеры, тесты, билд, деплой.
- **Secrets Management** — HashiCorp Vault или Kubernetes Secrets.

## 4. Доменная модель

### 4.1 Пользователи

- `User`: id, telegramId, email, phone, status, kycStatus, rgFlags, createdAt.
- `UserSettings`: userId, notificationPreferences, securitySettings (2FA, trustedDevices).
- `Session`: userId, refreshToken, expiresAt, deviceInfo.

### 4.2 Балансы и транзакции

- `Wallet`: userId, currency, availableBalance, bonusBalance, lockedBalance.
- `Transaction`: id, userId, type (deposit/withdrawal/bet/win/bonus), amount, currency, status, referenceId.
- `Payment`: id, userId, gateway, amount, status, metadata, kycRequired.

### 4.3 Игры

- `Game`: id, providerId, name, category, volatility, launchUrl, currencies.
- `GameSession`: id, userId, gameId, providerSessionId, status, startedAt, endedAt.
- `Bet`: id, gameSessionId, amount, currency, outcome, winAmount.

### 4.4 Отчеты и аналитика

- `ReportTemplate`: id, userId/adminId, filters, metrics, schedule.
- `ReportJob`: id, templateId, status, generatedAt, storageLocation.
- ETL таблицы в ClickHouse: `transactions_log`, `bets_log`, `payments_log`, `user_activity`.

## 5. Потоки данных

1. **Регистрация и аутентификация**:
   1. Пользователь инициирует регистрацию через Telegram Bot → передается auth data в BFF.
   2. Пользователь подтверждает email, генерируется TOTP для 2FA.
   3. Данные пользователя и статусы KYC сохраняются в PostgreSQL, сессия — в Redis.

2. **Игровой процесс**:
   1. Пользователь выбирает игру из каталога (данные из Game Module + кеш Redis).
   2. API Gateway вызывает Game Service → интеграция с провайдером → получение launch URL/SSO токена.
   3. Ставки/выигрыши от провайдера приходят в callback → Game Service валидирует → публикует события в Kafka.
   4. Wallet Service подписывается на события и обновляет балансы, пишет транзакции в PostgreSQL.
   5. ETL процесс периодически синхронизирует данные в ClickHouse.

3. **Платежи**:
   1. Депозит: клиент → BFF → PaymentService → создается payment intent → редирект/iframe провайдера.
   2. Вебхук от платежной системы → Kafka → Wallet Service обновляет транзакцию и баланс.
   3. Вывод: проверка KYC и лимитов → создание payout запроса → статус обновляется по вебхуку.

4. **Отчеты**:
   1. Пользователь в UI собирает фильтры → запрос в Report Module.
   2. Report Module строит SQL для ClickHouse, формирует материализованный отчет, сохраняет в S3/MinIO.
   3. Уведомление пользователю с ссылкой на скачивание (CSV/Excel/JSON).

## 6. Безопасность и RG

- Telegram auth + email подтверждение + 2FA (TOTP/SMS).
- RBAC и разделение ролей (игрок, саппорт, администратор, аналитик).
- Responsible Gaming: лимиты депозитов, времени игры, самоисключение, проверка возраста.
- Логирование действий администраторов.
- Web Application Firewall (WAF), rate limiting, защита от DDoS.

## 7. Мониторинг и наблюдаемость

- **OpenTelemetry**: трассировка запросов (frontend → backend → провайдеры).
- **Prometheus + Grafana**: метрики (RPS, latency, ошибки, баланс Kafka topics).
- **ELK/EFK Stack**: централизованные логи (ElasticSearch/Fluentd/Kibana).
- **Alertmanager**: оповещения о критичных событиях (Telegram, Email).

## 8. План разработки и релизов

### Этап 1 (1–2 месяца)

- Реализация базового BFF, Auth, User, Wallet модулей.
- Интеграция с Telegram Bot и почтовым сервисом для регистрации.
- Подключение одного игрового провайдера и платежного шлюза.
- UI: личный кабинет, баланс, история транзакций, избранные игры.

### Этап 2 (2–3 месяца)

- Конструктор отчетов, ETL пайплайны, ClickHouse интеграция.
- Admin-панель: управление пользователями, провайдерами, платежами.
- Реализация RG функционала и лимитов.

### Этап 3 (4–6 месяцев)

- Контейнеризация, оркестрация в Kubernetes, auto-scaling.
- Расширение мониторинга, антифрод-сервис, дополнительная аналитика.
- Подключение новых провайдеров и валют.

## 9. Документация

- **API**: OpenAPI/Swagger для REST, GraphQL schema docs.
- **DB Schema**: схемы и миграции (Prisma/MikroORM/TypeORM).
- **Dev Onboarding**: инструкции по запуску docker-compose, запуск тестов, интеграционных сценариев.
- **CI/CD**: пайплайн, ветвление, code review.
- **Пользовательские гайды**: инструкции по регистрации, депозитам, играм, отчетам, ограничениям.

## 10. Пример CICD пайплайна (GitHub Actions)

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

## 11. Дальнейшие шаги

1. Подготовить детальные спецификации API для каждого модуля.
2. Описать контракты интеграции с игровыми провайдерами и платежными системами.
3. Настроить окружение разработки (docker-compose, seed данные).
4. Разработать дизайн-систему и UI-kit на базе shadcn/ui и Tailwind.
5. Согласовать требования по безопасности и соответствию регуляциям.

Документ служит стартовой точкой для проектирования и разработки платформы. Он может дополняться диаграммами последовательностей, ER-диаграммами и конкретными техническими спецификациями по мере проработки отдельных модулей.
