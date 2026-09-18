# Алгоритм приоритетов очереди

## 1. Три источника талонов

```mermaid
flowchart LR
    PRE["PREBOOK<br/>Предварительная запись"] --> Q["Общая очередь"]
    QR["QR<br/>Талон в отделении"] --> Q
    LIVE["LIVE<br/>Живая очередь"] --> Q
    Q --> SORT["Сортировка по priority_score"]
    SORT --> CALL["Вызов в окно"]
```

## 2. Формула приоритета

```
priority_score = base_weight[source]
               - waiting_minutes * aging_factor
               + service_weight
               - (is_prebook_due ? prebook_bonus : 0)
```

**Меньше `priority_score` — выше в очереди.**

| Параметр | Смысл |
|---|---|
| `base_weight` | Базовый вес источника |
| `waiting_minutes` | Сколько клиент уже ждёт |
| `aging_factor` | Коэффициент старения (защита от голодания) |
| `service_weight` | Вес услуги |
| `prebook_bonus` | Бонус, если наступило время предзаписи |

## 3. Логика выбора следующего талона

```mermaid
flowchart TD
    START["Оператор нажимает<br/>«Вызвать следующего»"] --> GET["Получить окно<br/>и его услуги"]
    GET --> CAND["Найти всех WAITING<br/>по услугам окна"]
    CAND --> EMPTY{"Есть<br/>кандидаты?"}
    EMPTY -->|Нет| NONE["Вернуть пусто"]
    EMPTY -->|Да| SCORE["Рассчитать priority_score<br/>для каждого"]
    SCORE --> SORT["Отсортировать<br/>по score, потом по created_at"]
    SORT --> LOCK["Взять Redis-лок<br/>на талон"]
    LOCK --> UPDATE["UPDATE status='CALLED'<br/>WHERE status='WAITING'"]
    UPDATE --> OK{"Обновлено?"}
    OK -->|Да| LOG["Записать событие<br/>TICKET_CALLED"]
    OK -->|Нет| NEXT["Взять следующего<br/>кандидата"]
    NEXT --> LOCK
    LOG --> NOTIFY["Уведомить клиента"]
    NOTIFY --> END["Готово"]
```

## 4. Конфигурация

```mermaid
flowchart LR
    YAML["config/priority.yaml"] --> LOADER["Config Loader"]
    LOADER --> ENGINE["Priority Engine"]
    ENGINE --> SORT["Сортировка очереди"]
    DB["Версия конфига<br/>в БД"] --> AUDIT["Аудит решений"]
    ENGINE --> AUDIT
```

Все коэффициенты — в `config/priority.yaml`. Изменение правил не требует пересборки.

## 5. Поведение по источникам

```mermaid
flowchart TD
    subgraph PREBOOK["PREBOOK — Предварительная запись"]
        P1["Пришёл вовремя"] --> P1A["prebook_bonus активен<br/>высший приоритет"]
        P2["Пришёл раньше"] --> P2A["бонус меньше<br/>но выше QR"]
        P3["Опоздал в пределах grace"] --> P3A["сохраняет приоритет"]
        P4["Опоздал больше grace"] --> P4A["переходит в QR<br/>или NO_SHOW"]
    end

    subgraph QR["QR — Талон в отделении"]
        Q1["FIFO внутри QR"]
        Q2["Старение повышает<br/>приоритет при ожидании"]
    end

    subgraph LIVE["LIVE — Живая очередь"]
        L1["FIFO внутри LIVE"]
        L2["Ждёт > max_wait_minutes"] --> L2A["emergency_boost"]
        L3["Ждёт > emergency_boost_after"] --> L3A["поднимается выше QR"]
    end
```

## 6. Защита от двойного назначения

```mermaid
sequenceDiagram
    participant W1 as Окно 1
    participant W2 as Окно 2
    participant R as Redis
    participant DB as PostgreSQL

    W1->>R: lock:ticket:T1
    W2->>R: lock:ticket:T1
    R-->>W1: лок получен
    R-->>W2: отказ
    W1->>DB: UPDATE T1 SET status='CALLED' WHERE status='WAITING'
    DB-->>W1: 1 строка
    W2->>DB: UPDATE T1 SET status='CALLED' WHERE status='WAITING'
    DB-->>W2: 0 строк
    W2->>W2: взять следующего кандидата
```

**Три уровня защиты:**
1. Redis-лок на талон.
2. `WHERE status='WAITING'` в UPDATE — атомарная проверка.
3. Уникальный индекс в БД на активный талон клиента.

## 7. Закрытие окна с активным клиентом

```mermaid
flowchart TD
    CLOSE["Оператор закрывает окно"] --> ACTIVE{"Есть активный<br/>клиент?"}
    ACTIVE -->|Нет| CLOSED["Окно закрыто"]
    ACTIVE -->|Да| CHOICE{"Решение оператора"}
    CHOICE -->|Дообслужить| FINISH["Окно в статусе CLOSING<br/>клиент обслуживается"]
    FINISH --> AFTER["После завершения<br/>окно закрывается"]
    CHOICE -->|Срочно закрыть| RETURN["Талон возвращён в очередь<br/>priority_score сохранён"]
    RETURN --> EVENT["Событие TICKET_RETURNED"]
    EVENT --> NOTIFY["Уведомление клиенту"]
```

## 8. Восстановление после перезапуска

```mermaid
flowchart TD
    RESTART["Сервис перезапущен"] --> LOAD["Загрузить состояние<br/>из PostgreSQL"]
    LOAD --> WINDOWS["Восстановить окна<br/>OPEN/CLOSED"]
    WINDOWS --> STUCK["Найти зависшие<br/>CALLED/SERVING"]
    STUCK --> CHECK{"Окно было<br/>закрыто?"}
    CHECK -->|Да| RETURN["Вернуть талоны в очередь"]
    CHECK -->|Нет| KEEP["Оставить как есть"]
    RETURN --> EVENT["Событие SERVICE_RESTARTED"]
    KEEP --> EVENT
    EVENT --> READY["Сервис готов"]
```

## 9. Журналирование событий

```mermaid
flowchart LR
    T["Изменение талона"] --> E["Event Journal"]
    E --> DB[("PostgreSQL<br/>events")]
    E --> LOG["Структурированный лог"]
    E --> AN["Аналитика"]
```

Типы событий:
- `TICKET_CREATED`
- `TICKET_CALLED`
- `TICKET_STARTED`
- `TICKET_FINISHED`
- `TICKET_RETURNED`
- `TICKET_REDIRECTED`
- `TICKET_CANCELLED`
- `TICKET_NO_SHOW`
- `WINDOW_OPENED`
- `WINDOW_CLOSED`
- `WINDOW_CLOSED_WITH_ACTIVE`
- `SERVICE_RESTARTED`

## 10. Воспроизводимость

```mermaid
flowchart LR
    CONFIG["priority.yaml"] --> V["Версия конфига"]
    V --> DB[("БД")]
    TICKET["Талон"] --> SCORE["priority_score"]
    SCORE --> WHY["Объяснение:<br/>почему такой score"]
    V --> WHY
    DB --> WHY
```

Для каждого талона можно восстановить, почему он получил такой `priority_score` — на основе версии конфига и входных данных.