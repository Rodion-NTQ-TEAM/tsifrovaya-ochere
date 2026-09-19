# Архитектура системы «Цифровая очередь нового поколения»

## 1. Общая схема компонентов

```mermaid
flowchart TB
    subgraph CLIENTS["Клиенты"]
        C1["Клиентский веб<br/>(мобильный + десктоп)"]
        C2["Рабочее место оператора<br/>(ноутбук/ПК)"]
        C3["Админка отделения<br/>(руководитель)"]
    end

    subgraph GATEWAY["Nginx / Angie"]
        NG["Reverse proxy<br/>TLS, CORS, rate limit"]
    end

    subgraph BACKEND["Сервер очереди (Next.js + TypeScript)"]
        S1["Tickets Service"]
        S2["Windows Service"]
        S3["Priority Engine"]
        S4["Booking Service"]
        S5["Queue Service"]
        S6["Analytics Service"]
        S7["Events Journal"]
        S8["Notifications Service"]
    end

    subgraph STORAGE["Хранилище"]
        DB[("PostgreSQL 16<br/>FOR UPDATE SKIP LOCKED<br/>UNIQUE индексы")]
    end

    subgraph OBS["Observability"]
        LK["Loki<br/>логи"]
        PR["Prometheus<br/>метрики"]
        GR["Grafana<br/>дашборд"]
    end

    subgraph INTEGRATION["Интеграционный слой"]
        A1["Notification Adapter<br/>(demo)"]
        A2["SMS/Push Adapter<br/>(mock)"]
        A3["Почтатех Adapter<br/>(mock)"]
    end

    C1 --> NG
    C2 --> NG
    C3 --> NG
    NG --> S1
    NG --> S2
    NG --> S4
    NG --> S6
    S1 --> S3
    S2 --> S3
    S4 --> S5
    S5 --> S3
    S1 --> DB
    S2 --> DB
    S4 --> DB
    S7 --> DB
    S1 -.->|JSON логи| LK
    S2 -.->|JSON логи| LK
    S5 -.->|JSON логи| LK
    S1 -.->|метрики| PR
    PR --> GR
    LK --> GR
    S8 --> A1
    S8 --> A2
    S8 --> A3
    S8 --> S7
```

## 2. Слои приложения

```mermaid
flowchart TB
    P["Presentation Layer<br/>React + TypeScript (Next.js)"]
    G["API Gateway<br/>Nginx / Angie"]
    A["Application Layer<br/>Next.js API routes"]
    D["Domain Layer<br/>Models + бизнес-правила"]
    I["Infrastructure Layer<br/>PostgreSQL 16 + Prisma"]
    X["Integration Layer<br/>Adapters"]

    P --> G --> A --> D --> I
    A --> X
```

## 3. Модель данных (ER)

```mermaid
erDiagram
    BRANCH ||--o{ SERVICE : "предоставляет"
    BRANCH ||--o{ WINDOW : "имеет"
    BRANCH ||--o{ OPERATOR : "имеет"
    BRANCH ||--o{ QUEUE : "имеет"
    BRANCH ||--o{ TICKET : "создаёт"
    BRANCH ||--o{ PRIORITY_RULE : "настраивает"
    QUEUE ||--o{ QR_CODE : "имеет"
    QUEUE ||--o{ QUEUE_ENTRY : "содержит"
    WINDOW }o--o{ SERVICE : "оказывает"
    OPERATOR ||--o| WINDOW : "работает в"
    SERVICE ||--o{ TICKET : "по услуге"
    SERVICE ||--o{ BOOKED_SLOT : "выделен под"
    APPOINTMENT ||--o| TICKET : "порождает"
    TICKET ||--o{ QUEUE_ENTRY : "находится в"
    TICKET ||--o{ TICKET_EVENT : "журналируется"
    TICKET ||--o{ NOTIFICATION : "уведомляет"
    TICKET ||--o| TICKET : "перенаправление"
    QUEUE_ENTRY ||--o| WINDOW : "вызывается в"

    BRANCH {
        uuid id PK
        string code
        string name
        string address
        string timezone
        bool is_active
    }
    SERVICE {
        uuid id PK
        uuid branch_id FK
        string code
        string name
        int duration_minutes
        int priority_weight
        bool is_active
    }
    WINDOW {
        uuid id PK
        uuid branch_id FK
        int number
        string status
        uuid operator_id FK
        timestamptz opened_at
        timestamptz closed_at
    }
    OPERATOR {
        uuid id PK
        uuid branch_id FK
        string employee_code
        string name
        bool is_active
    }
    QUEUE {
        uuid id PK
        uuid branch_id FK
        string code
        string name
        string zone
        bool is_active
    }
    QR_CODE {
        uuid id PK
        uuid queue_id FK
        string code
        bool is_active
        timestamptz expires_at
    }
    APPOINTMENT {
        uuid id PK
        uuid branch_id FK
        uuid service_id FK
        uuid session_id
        timestamptz scheduled_at
        string status
        uuid ticket_id FK
    }
    TICKET {
        uuid id PK
        uuid branch_id FK
        uuid service_id FK
        uuid queue_id FK
        uuid appointment_id FK
        uuid session_id
        string source
        string number
        string status
        uuid current_window_id FK
        uuid current_queue_entry_id
        uuid parent_ticket_id FK
        timestamptz created_at
        timestamptz called_at
        timestamptz completed_at
    }
    QUEUE_ENTRY {
        uuid id PK
        uuid ticket_id FK
        uuid queue_id FK
        uuid service_id FK
        int priority_level
        bigint sequence_number
        string status
        timestamptz entered_at
        timestamptz scheduled_at
        timestamptz called_at
        timestamptz finished_at
        uuid window_id FK
    }
    TICKET_EVENT {
        bigserial id PK
        uuid ticket_id FK
        string event_type
        string old_status
        string new_status
        uuid operator_id FK
        uuid window_id FK
        jsonb metadata
        timestamptz created_at
    }
    NOTIFICATION {
        uuid id PK
        uuid ticket_id FK
        string type
        string channel
        string status
        int attempts
        timestamptz sent_at
    }
    PRIORITY_RULE {
        uuid id PK
        uuid branch_id FK
        string name
        bool is_active
        jsonb configuration
    }
    BOOKED_SLOT {
        uuid id PK
        uuid branch_id FK
        uuid service_id FK
        timestamptz slot_time
        uuid ticket_id FK
    }
```

## 4. Потоки данных по каналам входа

```mermaid
sequenceDiagram
    participant U as Клиент
    participant API as API
    participant Q as Queue Service
    participant P as Priority Engine
    participant DB as PostgreSQL
    participant N as Notifications

    Note over U,N: Канал 1 — Предварительная запись
    U->>API: POST /appointments
    API->>DB: проверка слота
    DB-->>API: слот свободен
    API->>Q: создать Ticket (APPOINTMENT)
    Q->>P: рассчитать priority_level
    P-->>Q: level
    Q->>DB: сохранить ticket + queue_entry
    Q->>N: подтверждение клиенту
    N-->>U: push «Вы записаны»

    Note over U,N: Канал 2 — QR в отделении
    U->>API: POST /tickets/qr
    API->>Q: создать Ticket (QR)
    Q->>P: рассчитать priority_level
    Q->>DB: сохранить ticket + queue_entry
    Q->>N: уведомление
    N-->>U: «Вы в очереди, позиция N»

    Note over U,N: Канал 3 — Живая очередь
    U->>API: (через оператора)
    API->>Q: создать Ticket (LIVE)
    Q->>P: рассчитать priority_level
    Q->>DB: сохранить ticket + queue_entry
```

## 5. Вызов клиента оператором — защита от двойного назначения

```mermaid
sequenceDiagram
    participant O1 as Окно 1
    participant O2 as Окно 2
    participant API as API
    participant DB as PostgreSQL

    O1->>API: POST /operator/windows/1/call-next
    O2->>API: POST /operator/windows/2/call-next

    API->>DB: BEGIN
    API->>DB: SELECT FROM queue_entries<br/>WHERE status='WAITING'<br/>ORDER BY priority_level DESC, sequence_number ASC<br/>LIMIT 1<br/>FOR UPDATE SKIP LOCKED
    DB-->>API: entry A-001 (только для Окна 1)
    API->>DB: UPDATE queue_entries SET status='CALLED'<br/>WHERE id=A-001 AND status='WAITING'
    DB-->>API: 1 row
    API->>DB: UPDATE tickets SET status='CALLED'
    API->>DB: INSERT ticket_event TICKET_CALLED
    API->>DB: COMMIT
    API-->>O1: A-001

    API->>DB: BEGIN
    API->>DB: SELECT ... FOR UPDATE SKIP LOCKED
    DB-->>API: entry A-002 (A-001 уже занят)
    API->>DB: UPDATE ... WHERE status='WAITING'
    DB-->>API: 1 row
    API->>DB: COMMIT
    API-->>O2: A-002
```

**Три уровня защиты:**
1. `FOR UPDATE SKIP LOCKED` — база блокирует строку, второй оператор её пропускает.
2. `WHERE status='WAITING'` в UPDATE — атомарная проверка.
3. `UNIQUE` индекс на активный талон клиента — физически не может быть двух активных талонов.

## 6. Интеграционный слой

```mermaid
flowchart LR
    NS["Notifications Service"] --> IF{"NotificationAdapter<br/>(interface)"}
    IF --> DA["DemoNotificationAdapter<br/>(MVP)"]
    IF --> RA["RealNotificationAdapter<br/>(future)"]

    DA --> L1["Лог в stdout (Loki)"]
    DA --> L2["Запись в БД"]

    RA --> R1["SMS-шлюз"]
    RA --> R2["Push через МП Почты России"]
    RA --> R3["Email"]
```

Замена адаптера — через переменную окружения `NOTIFICATION_ADAPTER=demo|real`, без изменения логики очереди.

## 7. Observability

```mermaid
flowchart LR
    APP["Next.js API<br/>+ Queue Service"] -->|JSON логи в stdout| LK["Loki"]
    APP -->|/metrics| PR["Prometheus"]
    LK --> GR["Grafana"]
    PR --> GR
    GR --> D1["Дашборд: очередь"]
    GR --> D2["Дашборд: SLA"]
    GR --> D3["Дашборд: ошибки"]
```

**Что собираем:**
- **Loki** — структурированные JSON-логи всех сервисов;
- **Prometheus** — метрики: RPS, latency, количество талонов по статусам, среднее время ожидания;
- **Grafana** — дашборды для руководителя и для отладки.

## 8. Масштабирование на 40 000 отделений

```mermaid
flowchart TB
    subgraph CENTRAL["Центральный контур"]
        CC["Central Config<br/>правила приоритетов"]
        CA["Central Analytics<br/>сводная аналитика"]
        CR["Central Registry<br/>реестр отделений"]
    end

    subgraph REGION["Региональный шард"]
        RS["Regional Server"]
        RDB[("Regional DB<br/>PostgreSQL")]
    end

    subgraph OFFICE["Отделение"]
        OS["Локальный сервер<br/>или edge-кэш"]
        BUF["Буфер при потере связи"]
    end

    CC --> RS
    CA --> RS
    CR --> RS
    RS --> RDB
    RS --> OS
    OS --> BUF
    BUF -.->|асинхронная синхронизация| RS
```

**Принципы:**
- данные изолированы по `branch_id`;
- шардирование по региону;
- централизованные правила приоритетов;
- отделение работает автономно при потере связи;
- синхронизация — асинхронная, с буфером.

## 9. Технологический стек

| Слой | Технология | Российская альтернатива |
|---|---|---|
| Backend | Next.js + TypeScript | Совместим с Astra Linux, РЕД ОС |
| БД | PostgreSQL 16 | Postgres Pro, Tantor, ЛИНТЕР |
| ORM | Prisma | — |
| Локи | `FOR UPDATE SKIP LOCKED` | — |
| Кэш | Не используем | — |
| Redis | Не используем | — |
| Frontend | React + TypeScript | Kontur UI |
| Gateway | Nginx | Angie PRO |
| Логи | Loki | — |
| Метрики | Prometheus | — |
| Дашборд | Grafana | — |
| Контейнеры | Docker Compose | «Боцман», ALT Virtualization |
| ОС | Linux | Astra Linux, РЕД ОС, ALT Linux |

## 10. Что не используем и почему

| Компонент | Почему нет |
|---|---|
| Redis | Локи решаются через `FOR UPDATE SKIP LOCKED` в PostgreSQL |
| Микросервисы | Модульный монолит проще для MVP |
| Внешний кэш | Postgres справляется с 40 000 записей |
| RabbitMQ | Не нужен для MVP, уведомления — через демо-адаптер |