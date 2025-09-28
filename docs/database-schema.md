# Схемы баз данных

## PostgreSQL (транзакционная база)

### Таблица `users`
- `id` (UUID, PK)
- `telegram_id` (string, unique)
- `email` (string, unique)
- `username` (string)
- `first_name`, `last_name`
- `password_hash` (nullable, если логин только через Telegram)
- `kyc_status` (enum: pending/verified/rejected)
- `responsible_gaming_settings` (JSONB)
- `two_factor_enabled` (boolean)
- `two_factor_type` (enum: totp/sms/email)
- `created_at`, `updated_at`

### Таблица `wallet_accounts`
- `id` (UUID, PK)
- `user_id` (FK → users)
- `currency` (ISO 4217 code)
- `type` (enum: main/bonus/locked)
- `balance` (decimal(18,2))
- `created_at`, `updated_at`
- Уникальный индекс по (`user_id`, `currency`, `type`)

### Таблица `transactions`
- `id` (UUID, PK)
- `wallet_account_id` (FK → wallet_accounts)
- `external_id` (string, уникальный идемпотентный ключ)
- `amount` (decimal(18,2))
- `fee` (decimal(18,2))
- `type` (enum: deposit/withdrawal/bet/win/bonus/adjustment)
- `status` (enum: pending/success/failed/cancelled)
- `metadata` (JSONB)
- `processed_at`
- `created_at`

### Таблица `games`
- `id` (UUID, PK)
- `provider_id` (FK → game_providers)
- `slug` (string, unique)
- `title` (string)
- `volatility` (enum)
- `genre` (enum)
- `config` (JSONB)
- `is_active` (boolean)
- `created_at`, `updated_at`

### Таблица `game_sessions`
- `id` (UUID, PK)
- `user_id` (FK → users)
- `game_id` (FK → games)
- `provider_session_id` (string)
- `currency`
- `bet_amount` (decimal(18,2))
- `win_amount` (decimal(18,2))
- `status` (enum: open/closed/failed)
- `opened_at`, `closed_at`

### Таблица `payments`
- `id` (UUID, PK)
- `user_id` (FK → users)
- `payment_intent_id` (string)
- `type` (enum: deposit/withdrawal)
- `amount` (decimal(18,2))
- `currency`
- `status` (enum: pending/processing/success/failed)
- `provider` (enum: stripe/paypal/...)
- `metadata` (JSONB)
- `created_at`, `updated_at`

### Таблица `reports`
- `id` (UUID, PK)
- `user_id` (FK → users)
- `name`
- `definition` (JSONB, выбранные параметры)
- `format` (enum: csv/excel/json)
- `created_at`, `updated_at`

## Redis
- `session:{id}` — данные сессии и токенов.
- `otp:{userId}` — одноразовые коды подтверждения.
- `wallet:balance:{walletId}` — кэшированное значение баланса.
- `rate-limit:{key}` — лимиты запросов.

## ClickHouse (аналитика)

### Таблица `events_transactions`
- `event_time` (DateTime64)
- `user_id` (UUID)
- `wallet_type` (LowCardinality(String))
- `transaction_type` (LowCardinality(String))
- `amount` (Decimal(18,2))
- `currency` (FixedString(3))
- `provider`
- `metadata` (JSON)

### Таблица `events_game_rounds`
- `event_time`
- `user_id`
- `game_id`
- `provider`
- `bet_amount`
- `win_amount`
- `session_id`
- `status`

### Таблица `daily_kpi`
- `date` (Date)
- `active_users`
- `gross_gaming_revenue`
- `deposits_sum`
- `withdrawals_sum`
- `conversion_rate`

## ETL Поток

1. PostgreSQL → Kafka (CDC через Debezium или события из приложения).
2. Worker (NestJS + ClickHouse client) читает топики `transactions` и `game_rounds`.
3. Записывает агрегированные данные в ClickHouse таблицы.
4. Планировщик (Airflow/Temporal) регулярно пересчитывает витрины (`daily_kpi`).

