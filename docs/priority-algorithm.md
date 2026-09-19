# Алгоритм приоритетов очереди

## 1. Три источника талонов

```mermaid
flowchart LR
    AP["APPOINTMENT<br/>Предварительная запись"] --> Q["Общая очередь"]
    QR["QR<br/>Талон в отделении"] --> Q
    LIVE["LIVE<br/>Живая очередь"] --> Q
    Q --> SORT["Сортировка по priority_level<br/>+ sequence_number"]
    SORT --> CALL["Вызов в окно"]
```

## 2. Уровни приоритета

**Статический `priority_level`** — вычисляется при постановке талона в очередь:

| Источник | Базовый level | Условие |
|---|---|---|
| `APPOINTMENT` | 100 | Если наступило время слота (± grace period) |
| `QR` | 50 | FIFO внутри уровня |
| `LIVE` | 10 | FIFO внутри уровня |
| `RETURNED` | +20 к базовому | При возврате в очередь, но не выше APPOINTMENT |
| `EMERGENCY` | +40 к LIVE | Если ждёт больше `emergencyBoostAfter` минут |

**Порядок внутри уровня — по `sequence_number` (FIFO).**

## 3. Логика выбора следующего талона

```mermaid
flowchart TD
    START["Оператор нажимает<br/>«Вызвать следующего»"] --> GET["Получить окно<br/>и его услуги"]
    GET --> TX["BEGIN TRANSACTION"]
    TX --> SELECT["SELECT queue_entry<br/>WHERE status='WAITING'<br/>AND service_id IN (услуги окна)<br/>ORDER BY priority_level DESC, sequence_number ASC<br/>LIMIT 1<br/>FOR UPDATE SKIP LOCKED"]
    SELECT --> EMPTY{"Есть<br/>строка?"}
    EMPTY -->|Нет| ROLLBACK["ROLLBACK<br/>Вернуть 404"]
    EMPTY -->|Да| UPDATE1["UPDATE queue_entry<br/>SET status='CALLED'"]
    UPDATE1 --> UPDATE2["UPDATE ticket<br/>SET status='CALLED', window_id"]
    UPDATE2 --> INSERT["INSERT ticket_event<br/>TICKET_CALLED"]
    INSERT --> COMMIT["COMMIT"]
    COMMIT --> NOTIFY["Уведомить клиента"]
    NOTIFY --> END["Готово"]
```

## 4. Защита от двойного вызова

**Три уровня, все на уровне PostgreSQL:**

```mermaid
flowchart TD
    W1["Окно 1<br/>call-next"] --> LOCK["FOR UPDATE SKIP LOCKED"]
    W2["Окно 2<br/>call-next"] --> LOCK
    LOCK -->|строка заблокирована| D1["Окно 1 получает талон"]
    LOCK -->|строка пропущена| D2["Окно 2 получает следующий"]
```

| Уровень | Что делает | Где |
|---|---|---|
| 1 | `FOR UPDATE SKIP LOCKED` | Блокирует строку при выборе |
| 2 | `WHERE status='WAITING'` в UPDATE | Отклоняет повторное обновление |
| 3 | `UNIQUE INDEX` на активный талон | Физически не даёт дубль |

```sql
-- Уровень 3
CREATE UNIQUE INDEX ux_active_ticket_per_session
ON tickets (session_id)
WHERE status IN ('WAITING', 'CALLED', 'SERVING');
```

## 5. Конфигурация

Все коэффициенты — в `priority_rules.configuration` (JSONB) и в `config/priority.yaml` для демо.

```yaml
priority:
  sources:
    APPOINTMENT:
      base_weight: 100
      grace_minutes: 10
    QR:
      base_weight: 50
    LIVE:
      base_weight: 10
      max_wait_minutes: 60

  aging:
    enabled: true
    factor: 5
    cap: 40

  return:
    enabled: true
    boost: 20
    max_boost: 20

  live_queue:
    max_wait_minutes: 60
    emergency_boost_after: 30
    emergency_boost: 40

  window:
    close_with_active_client: "finish_current"
```

**Изменение правил не требует пересборки** — читается при следующем запросе.

## 6. Поведение по источникам

```mermaid
flowchart TD
    subgraph APPOINTMENT["APPOINTMENT — Предварительная запись"]
        A1["Пришёл вовремя"] --> A1A["priority_level = 100"]
        A2["Пришёл раньше"] --> A2A["priority_level = 80"]
        A3["Опоздал в пределах grace"] --> A3A["priority_level = 100"]
        A4["Опоздал больше grace"] --> A4A["priority_level = 50<br/>как QR"]
    end

    subgraph QR["QR — Талон в отделении"]
        Q1["priority_level = 50"]
        Q2["FIFO по sequence_number"]
    end

    subgraph LIVE["LIVE — Живая очередь"]
        L1["priority_level = 10"]
        L2["Ждёт > 30 мин"] --> L2A["priority_level += 40"]
    end
```

## 7. Закрытие окна с активным клиентом

```mermaid
flowchart TD
    CLOSE["Оператор закрывает окно"] --> ACTIVE{"Есть активный<br/>клиент?"}
    ACTIVE -->|Нет| CLOSED["Окно закрыто"]
    ACTIVE -->|Да| CHOICE{"Решение оператора"}
    CHOICE -->|finish_current| FINISH["Окно в статусе CLOSING<br/>клиент обслуживается"]
    FINISH --> AFTER["После завершения<br/>окно закрывается"]
    CHOICE -->|return_to_queue| RETURN["Создать новый queue_entry<br/>priority_level + return_boost"]
    RETURN --> EVENT["Событие TICKET_RETURNED"]
    EVENT --> NOTIFY["Уведомление клиенту"]
```

**По умолчанию:** `finish_current` — дообслужить и потом закрыть.

## 8. Восстановление после перезапуска

```mermaid
flowchart TD
    RESTART["Сервис перезапущен"] --> LOAD["Загрузить состояние<br/>из PostgreSQL"]
    LOAD --> TICKETS["Восстановить tickets"]
    TICKETS --> ENTRIES["Восстановить queue_entries<br/>status IN (WAITING, CALLED, SERVING)"]
    ENTRIES --> WINDOWS["Восстановить окна<br/>OPEN/CLOSED"]
    WINDOWS --> STUCK["Найти зависшие<br/>CALLED/SERVING"]
    STUCK --> CHECK{"Окно было<br/>закрыто?"}
    CHECK -->|Да| RETURN["Создать новый queue_entry<br/>status=WAITING"]
    CHECK -->|Нет| KEEP["Оставить как есть"]
    RETURN --> EVENT["Событие SERVICE_RESTARTED"]
    KEEP --> EVENT
    EVENT --> READY["Сервис готов"]
```

**Источник истины — только PostgreSQL.** Redis не используется.

## 9. Журналирование событий

Все изменения — в `ticket_events` (append-only, `BIGSERIAL id`):

| Событие | Когда пишется |
|---|---|
| `TICKET_CREATED` | Создание талона |
| `TICKET_CALLED` | Оператор вызвал |
| `TICKET_STARTED` | Начало обслуживания |
| `TICKET_FINISHED` | Завершение |
| `TICKET_RETURNED` | Возврат в очередь |
| `TICKET_REDIRECTED` | Перенаправление |
| `TICKET_CANCELLED` | Отмена клиентом |
| `TICKET_NO_SHOW` | Клиент не пришёл |
| `WINDOW_OPENED` | Окно открыто |
| `WINDOW_CLOSED` | Окно закрыто |
| `WINDOW_CLOSED_WITH_ACTIVE` | Закрытие с активным клиентом |
| `SERVICE_RESTARTED` | Перезапуск сервиса |
| `NOTIFICATION_FAILED` | Ошибка уведомления |
| `INTEGRATION_TIMEOUT` | Таймаут внешнего сервиса |

**UPDATE и DELETE на `ticket_events` запрещены на уровне прав БД.**

## 10. Воспроизводимость

Для каждого талона можно восстановить:
- какой был `priority_level` при постановке;
- когда и кем был вызван;
- какие были переходы статусов;
- почему вернулся в очередь.

Всё это — по `ticket_events` + `queue_entries` + текущему `tickets`.