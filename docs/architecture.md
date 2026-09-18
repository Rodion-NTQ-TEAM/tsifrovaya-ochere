    # Архитектура системы «Цифровая очередь нового поколения»

## 1. Общая схема компонентов

```mermaid
flowchart TB
    subgraph CLIENTS["Клиенты"]
        C1["Клиентский веб<br/>(мобильный + десктоп)"]
        C2["Рабочее место оператора<br/>(ноутбук/ПК)"]
        C3["Админка отделения<br/>(руководитель)"]
    end

    subgraph GATEWAY["API Gateway"]
        NG["Nginx<br/>TLS, CORS, rate limit"]
    end

    subgraph BACKEND["Сервер очереди (FastAPI)"]
        S1["Tickets Service"]
        S2["Windows Service"]
        S3["Priority Engine"]
        S4["Booking Service"]
        S5["Queue Service"]
        S6["Analytics Service"]
        S7["Events Journal"]
        S8["Notifications Service"]
    end

    subgraph STORAGE["Хранилища"]
        DB[("PostgreSQL<br/>основное хранилище")]
        RD[("Redis<br/>локи, кэш, pub/sub")]
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
    S1 --> RD
    S2 --> RD
    S5 --> RD
    S8 --> A1
    S8 --> A2
    S8 --> A3
    S8 --> S7
```

## 2. Слои приложения

```mermaid
flowchart TB
    P["Presentation Layer<br/>React + TypeScript"]
    G["API Gateway<br/>Nginx"]
    A["Application Layer<br/>FastAPI services"]
    D["Domain Layer<br/>Models + бизнес-правила"]
    I["Infrastructure Layer<br/>PostgreSQL, Redis"]
    X["Integration Layer<br/>Adapters"]

    P --> G --> A --> D --> I
    A --> X
```

## 3. Модель данных (ER)

```mermaid
erDiagram
    OFFICE ||--o{ SERVICE : "предоставляет"
    OFFICE ||--o{ WINDOW : "имеет"
    OFFICE ||--o{ TICKET : "создаёт"
    OFFICE ||--o{ PRIORITY_CONFIG : "настраивает"
    WINDOW ||--o{ TICKET : "обслуживает"
    WINDOW }o--o{ SERVICE : "оказывает"
    OPERATOR ||--o| WINDOW : "работает в"
    SERVICE ||--o{ TICKET : "по услуге"
    TICKET ||--o{ EVENT : "журналируется"
    TICKET ||--o| TICKET : "перенаправление"

    OFFICE {
        uuid id PK
        string name
        string address
        string timezone
    }
    SERVICE {
        uuid id PK
        uuid office_id FK
        string name
        string code
        int avg_duration
    }
    WINDOW {
        uuid id PK
        uuid office_id FK
        int number
        string status
        uuid operator_id FK
    }
    OPERATOR {
        uuid id PK
        uuid office_id FK
        string name
        string status
    }
    TICKET {
        uuid id PK
        uuid office_id FK
        uuid service_id FK
        uuid window_id FK
        string source
        string status
        float priority_score
        timestamp scheduled_at
        timestamp created_at
        timestamp called_at
        timestamp finished_at
    }
    EVENT {
        uuid id PK
        uuid ticket_id FK
        string type
        json payload
        timestamp created_at
    }
    PRIORITY_CONFIG {
        uuid id PK
        uuid office_id FK
        string source
        int weight
        int max_wait_minutes
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
    U->>API: POST /bookings
    API->>DB: проверка слота
    DB-->>API: слот свободен
    API->>Q: создать Ticket (PREBOOK)
    Q->>P: рассчитать priority_score
    P-->>Q: score
    Q->>DB: сохранить талон
    Q->>N: подтверждение клиенту
    N-->>U: push «Вы записаны»

    Note over U,N: Канал 2 — QR в отделении
    U->>API: POST /tickets/qr
    API->>Q: создать Ticket (QR)
    Q->>P: рассчитать priority_score
    Q->>DB: сохранить талон
    Q->>N: уведомление
    N-->>U: «Вы в очереди, позиция N»

    Note over U,N: Канал 3 — Живая очередь
    U->>API: (через оператора)
    API->>Q: создать Ticket (LIVE)
    Q->>P: рассчитать priority_score
    Q->>DB: сохранить талон
```

## 5. Вызов клиента оператором

```mermaid
sequenceDiagram
    participant O as Оператор
    participant API as API
    participant W as Window Service
    participant R as Redis
    participant DB as PostgreSQL
    participant N as Notifications

    O->>API: POST /windows/{id}/call-next
    API->>W: вызвать следующего
    W->>R: lock:window:{id}
    R-->>W: лок получен
    W->>DB: SELECT кандидатов (WAITING)
    DB-->>W: список талонов
    W->>W: сортировка по priority_score
    W->>R: lock:ticket:{id}
    W->>DB: UPDATE tickets SET status='CALLED' WHERE status='WAITING' RETURNING *
    alt талон успешно обновлён
        DB-->>W: обновлённый талон
        W->>DB: INSERT event TICKET_CALLED
        W->>N: уведомить клиента
        N-->>O: клиент вызван
    else талон уже вызван другим окном
        DB-->>W: 0 строк
        W->>W: взять следующего кандидата
    end
    W->>R: release locks
```

## 6. Интеграционный слой

```mermaid
flowchart LR
    NS["Notifications Service"] --> IF{"NotificationAdapter<br/>(interface)"}
    IF --> DA["DemoNotificationAdapter<br/>(MVP)"]
    IF --> RA["RealNotificationAdapter<br/>(future)"]

    DA --> L1["Лог в консоль"]
    DA --> L2["Запись в БД"]

    RA --> R1["SMS-шлюз"]
    RA --> R2["Push через МП Почты России"]
    RA --> R3["Email"]
```

Замена адаптера — через переменную окружения `NOTIFICATION_ADAPTER=demo|real`, без изменения логики очереди.

## 7. Масштабирование на 40 000 отделений

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
        RR[("Regional Redis")]
    end

    subgraph OFFICE["Отделение"]
        OS["Локальный сервер<br/>или edge-кэш"]
        BUF["Буфер при потере связи"]
    end

    CC --> RS
    CA --> RS
    CR --> RS
    RS --> RDB
    RS --> RR
    RS --> OS
    OS --> BUF
    BUF -.->|асинхронная синхронизация| RS
```

**Принципы:**
- данные изолированы по `office_id`;
- шардирование по региону;
- централизованные правила приоритетов, кэш в Redis;
- отделение работает автономно при потере связи;
- синхронизация — асинхронная, с буфером.

## 8. Технологический стек

| Слой | Технология | Российская альтернатива |
|---|---|---|
| Backend | FastAPI (Python) | Yandex Cloud, VK Cloud |
| БД | PostgreSQL | Postgres Pro |
| Кэш | Redis | Valkey / Redis Labs |
| Frontend | React + TypeScript | — |
| Gateway | Nginx | Angie |
| Контейнеры | Docker | — |
| ОС | Linux | Astra Linux, Alt Linux |