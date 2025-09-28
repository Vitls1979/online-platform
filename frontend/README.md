# Online Platform Frontend

Next.js 15 приложение с TypeScript, Tailwind CSS и библиотекой компонентов shadcn/ui. Проект демонстрирует базовый финансовый кабинет с авторизацией, интеграцией c BFF (Next API routes) и заглушкой для потокового обновления баланса через SSE.

## Стек

- **Next.js 15 (App Router)** и TypeScript
- **Tailwind CSS 3** с кастомной дизайн-системой и компонентами shadcn/ui
- **React Query** для работы с состоянием данных и кешем BFF
- **Server-Sent Events** для имитации обновления баланса в реальном времени
- **Vitest + Testing Library** для unit/UI-тестов

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение откроется на [http://localhost:3000](http://localhost:3000). По умолчанию происходит редирект на страницу `/login`.

### Полезные скрипты

| Команда            | Описание                                          |
|-------------------|---------------------------------------------------|
| `npm run dev`     | Запуск dev-сервера Next.js                         |
| `npm run build`   | Production-сборка                                 |
| `npm run start`   | Запуск production-сборки                          |
| `npm run lint`    | Линтинг через `next lint`                          |
| `npm run test`    | Unit/UI-тесты через Vitest                        |

## Архитектура и BFF

- **`src/app/(auth)/login`** – стартовая страница авторизации. Использует форму shadcn/ui и обращается к `POST /api/auth/login`.
- **`src/app/dashboard`** – дашборд с балансом и историей транзакций. Данные загружаются через React Query (`GET /api/balance`).
- **BFF-заглушки** находятся в `src/app/api/*`. `balance/stream` отдает события SSE каждые 5 секунд, обновляя кеш React Query.
- **Моки** в `src/data/balance.ts`. Их легко заменить реальными сервисами – достаточно обновить импорты в API-роутах.

### Реальное время

Хук `useBalanceStream` открывает SSE-соединение, которое обновляет кеш React Query при каждом событии. Компонент `RealtimeIndicator` визуально отображает статус соединения. Для адаптации под WebSocket достаточно заменить реализацию хука.

### Дизайн-система

- Основные токены цвета и радиуса задаются в `src/app/globals.css` и `tailwind.config.ts`.
- shadcn/ui компоненты лежат в `src/components/ui`. Для генерации новых компонентов используйте CLI `npx shadcn@latest add <component>` или добавляйте вручную по примеру существующих.

## Тестирование

Тесты размещены рядом с кодом. Примеры:

- `src/lib/utils.test.ts` – проверка вспомогательных функций.
- `src/components/forms/login-form.test.tsx` – UI-тест на форму авторизации с моком BFF.

Перед коммитом рекомендуется запустить:

```bash
npm run lint
npm run test
```

## Дальнейшие шаги

- Подключить реальные API вместо моков в `src/app/api/*`.
- Реализовать сохранение токена/сессии и guard для приватных страниц.
- Добавить e2e-тесты (Playwright/Cypress) и CI.
