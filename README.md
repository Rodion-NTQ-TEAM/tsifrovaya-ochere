# Цифровая очередь нового поколения

MVP системы управления электронной очередью для отделений Почты России.

Команда «Искусные нейроны» — хакатон PostCode Challenge от Почтатеха, трек «Цифровая очередь нового поколения».

## О проекте

Электронная очередь заменяет бумажные талоны и физические терминалы. Работает на существующих устройствах клиентов и сотрудников, снижает зависимость от терминалов и масштабируется на всю сеть Почты России. Три канала входа: предварительная запись, QR-код в отделении, живая очередь.

## Стек

- Backend: Next.js 15 + TypeScript + Prisma
- Frontend: Next.js 16 + React 19 + Tailwind 4
- БД: PostgreSQL 16
- Локи: FOR UPDATE SKIP LOCKED
- Контейнеры: Docker Compose
- Мониторинг: Prometheus + Grafana + postgres_exporter

**Российский контур:** Postgres Pro, Angie PRO, Astra Linux, ALT Linux, Kontur UI.

## Требования к окружению

- Node.js 20+
- Docker Desktop (для Postgres)
- Git

## Запуск

### 1. Клонировать

```bash
git clone https://git.codenrock.com/codenrock/khakaton-postcode-challenge-ot-pochtatekha/iskusnye-neyrony/tsifrovaya-ochered-novogo-pokoleniya.git
cd tsifrovaya-ochered-novogo-pokoleniya
```

### 2. Поднять БД

```bash
docker compose up -d
docker compose ps
```

Ожидаемо: контейнер `queue_postgres` в статусе `healthy`.

Postgres на `localhost:5432`, БД `digital_queue`.

### 3. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

API: `http://localhost:3000`

### 4. Frontend

В новом терминале:

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Открыть: `http://localhost:3001`

## Тестовые данные

После `npx prisma db seed` создаются:

- Отделение (Branch) — 1 шт.
- Услуги (Service) — 3 шт.: Отправка, Получение, Финансы
- Очереди (Queue) — по одной на каждую услугу с префиксами P, V, F

`BRANCH_ID` и `SERVICE_SEND_ID` выводятся в консоль после seed — используются для тестовых запросов к API.

## API

| Метод | Endpoint | Что делает |
|---|---|---|
| POST | `/api/tickets` | Создание талона |
| POST | `/api/tickets/qr` | Талон по QR-коду |
| GET | `/api/tickets/[ticketId]` | Статус талона |
| POST | `/api/operator/windows/[windowId]/call-next` | Вызов следующего клиента |
| POST | `/api/operator/windows/[windowId]/finish` | Завершение обслуживания |

Полный контракт — в [openapi/openapi.yaml](openapi/openapi.yaml).

## Структура репозитория

```
backend/    — API сервера очереди (Next.js + Prisma)
  app/api/  — REST endpoints
  lib/      — Prisma client
  prisma/   — schema, migrations, seed
frontend/   — Интерфейсы
  app/client/   — Клиент: ОПС, услуга, запись, QR, талон
  app/operator/ — Оператор: окно, вызов, завершение
  app/manager/  — Админка: дашборд, правила, отклонения
src/types/  — Общие типы TypeScript
openapi/    — Контракт REST API
docs/       — Архитектура, алгоритм приоритетов, чек-лист
infra/      — prometheus.yml, schema.sql
docker-compose.yml
```

## Документация

- [Архитектура](docs/architecture.md) — компоненты, потоки данных, масштабирование
- [Алгоритм приоритетов](docs/priority-algorithm.md) — формула, aging, emergency boost, защита от дублей
- [OpenAPI](openapi/openapi.yaml) — контракт REST API
- [Чек-лист проверок](docs/check-list.md) — что проверено

## Результаты проверки

Проверено локально 22.09.2026.

### Создание талона

- `POST /api/tickets` — работает, создаёт талон и queueEntry, пишет `TICKET_CREATED`.
- `POST /api/tickets/qr` — работает, принимает `qrCode`, `serviceId`, `sessionId`, создаёт талон `source: QR`, статус `WAITING`.

### Конкурентный вызов

Два окна одновременно вызвали следующего клиента через `POST /api/operator/windows/{windowId}/call-next`:

| Окно | Талон | Статус | Время |
|---|---|---|---|
| window-1 | P-2 | CALLED | 16:21:43.060 |
| window-2 | P-3 | CALLED | 16:21:43.065 |

**Разница — 5 миллисекунд.** Один талон двум окнам не выдан. Двойного назначения нет.

### Завершение

Оба окна вернули `200 OK`:
- P-2 → COMPLETED, `currentWindowId: null`, `completedAt` заполнен.
- P-3 → COMPLETED, `currentWindowId: null`, `completedAt` заполнен.

### Итог

| Проверка | Результат |
|---|---|
| Параллельные `call-next` | ✅ Успешно |
| Разные талоны для разных окон | ✅ P-2, P-3 |
| Race condition | ✅ Отсутствует |
| Завершение `finish` | ✅ 200 OK |
| Освобождение окна | ✅ `currentWindowId: null` |
| `completedAt` проставлен | ✅ Да |
| Миграции + seed | ✅ Работают |

**Механизм защиты:** `FOR UPDATE SKIP LOCKED` в PostgreSQL гарантирует, что один талон не будет выдан двум окнам одновременно.

## Технические решения

### Защита от двойного вызова

Три уровня:

1. `FOR UPDATE SKIP LOCKED` — база блокирует строку, второй оператор её пропускает.
2. `WHERE status='WAITING'` в UPDATE — атомарная проверка.
3. UNIQUE-индекс на активный талон клиента — физически не даёт дубль.

### Алгоритм приоритетов

- **Статический `priority_level`** при постановке: APPOINTMENT (100), QR (50), LIVE (10).
- **Aging** — живая очередь поднимается со временем.
- **Emergency boost** — после 30 минут ожидания.
- **Return boost** — возврат не теряет место, но ограничен.
- Правила — в конфиге, меняются без пересборки.

### Журнал событий

Таблица `ticket_events`, append-only. UPDATE и DELETE запрещены. Хранит `old_status`, `new_status`, `metadata` (JSONB). Используется для аудита и аналитики.

### Единые типы

`src/types/` — единый источник типов для фронта и бэка. OpenAPI синхронизирован с типами.

## Известные расхождения

- Модель `Window` в Prisma-схеме не выделена — окно хранится строкой `windowId` в `QueueEntry`. Для сценария «вызов клиента свободным окном» этого достаточно.
- Модель `QrCode` в Prisma-схеме не выделена — `qrCode` передаётся клиентом и используется как префикс номера талона. Для сценария «талон по QR» этого достаточно.
- Полноценные модели `Window` и `QrCode` — в плане развития.

## Команда

| Роль | Кто |
|---|---|
| Капитан / Архитектор | Родион Петухов |
| Backend Lead | Андрей Пухов |
| Backend / Integrations | Данил Скулков |
| Frontend Lead | Максим Коновалов |
| Frontend / DevOps / QA | Иван Мельников |

## Лицензия

См. [LICENSE](LICENSE).