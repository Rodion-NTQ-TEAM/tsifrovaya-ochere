# Название проекта

Команда «Искусные нейроны» — хакатон PostCode Challenge от Почтатеха, трек «Цифровая очередь нового поколения».

## О проекте
2–3 предложения о задаче и решении.

## Стек
- Backend: Next.js 15 + TypeScript + Prisma
- Frontend: Next.js 16 + React 19
- БД: PostgreSQL 16
- Docker Compose

## Требования к окружению
- Node.js 20+
- Docker Desktop (для Postgres)
- Git

## Запуск

### 1. Клонировать
```bash
git clone <url>
cd <папка>
```

### 2. Поднять БД
```bash
docker compose up -d
docker compose ps
```

Ожидаемо: контейнер `queue_postgres` в статусе `healthy`.

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

После seed создаются:
- Отделение №7701
- Услуги: Отправка, Получение, Финансы
- ID для теста — смотри вывод `npx prisma db seed`

## Структура репозитория
```
backend/    — API
frontend/   — интерфейсы
src/types/  — общие типы
openapi/    — контракт API
docs/       — архитектура, алгоритм, чек-лист
infra/      — prometheus.yml, schema.sql
```

## Документация
- [Архитектура](docs/architecture.md)
- [Алгоритм приоритетов](docs/priority-algorithm.md)
- [OpenAPI](openapi/openapi.yaml)
- [Чек-лист](docs/check-list.md)

## Демонстрация
[Ссылка на видео или пошаговый сценарий]

## Презентация
[Ссылка на файл]

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