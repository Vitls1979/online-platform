# Конструктор отчётов и аналитика

## Поток данных

1. **События**: приложения публикуют доменные события (`user.registered`, `wallet.transaction.completed`, `game.bet.placed`).
2. **Очередь**: Kafka/NATS хранит события с гарантией доставки.
3. **ETL worker**: сервис `worker-etl` агрегирует данные и пишет в ClickHouse.
4. **Аналитический API**: ReportingService формирует SQL запросы на ClickHouse и возвращает агрегаты.
5. **Фронтенд**: React Query вызывает API и строит визуализации.

## Настройка отчётов

Пользователь определяет:
- Диапазон дат (dateFrom/dateTo).
- Валюту и правила конвертации.
- Тип операции (депозит, ставка, выигрыш, бонус, вывод).
- Игрового провайдера и конкретные игры.
- Агрегацию (по дню/неделе/месяцу).

Определение отчёта хранится в JSONB `definition` с описанием фильтров и столбцов. ReportingService превращает описание в ClickHouse SQL через builder.

## Пример определения отчёта

```json
{
  "name": "GGR по провайдерам",
  "filters": {
    "date": { "from": "2024-01-01", "to": "2024-01-31" },
    "providers": ["pragmatic_play", "netent"],
    "currencies": ["EUR", "USD"]
  },
  "groupBy": ["provider"],
  "metrics": [
    { "name": "total_bets", "expression": "sum(bet_amount)" },
    { "name": "total_wins", "expression": "sum(win_amount)" },
    { "name": "ggr", "expression": "sum(bet_amount - win_amount)" }
  ],
  "sort": [{ "field": "ggr", "order": "desc" }],
  "format": "csv"
}
```

## Экспорт

- Генерация файлов происходит асинхронно через очередь BullMQ.
- Файлы сохраняются в S3-совместимом хранилище.
- Пользователь получает уведомление (email/Telegram) с ссылкой на скачивание.

## Доступ и безопасность

- Роли `user`, `vip`, `manager`, `admin` определяют доступ к данным.
- Сырые данные ClickHouse фильтруются на уровне SQL (Row-Level Security).
- Аудит запросов сохраняется в отдельную таблицу `report_audit` (PostgreSQL).

