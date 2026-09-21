-- Создание типов (ENUM)
CREATE TYPE appointment_status AS ENUM ('BOOKED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE ticket_source AS ENUM ('APPOINTMENT', 'QR', 'LIVE');
CREATE TYPE ticket_status AS ENUM ('CREATED', 'WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RETURNED', 'TRANSFERRED');
CREATE TYPE queue_entry_status AS ENUM ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'REMOVED');
CREATE TYPE window_status AS ENUM ('CLOSED', 'OPEN', 'PAUSED', 'CLOSING');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- 1. Отделения (добавлено поле timezone)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Услуги (убран average_duration_seconds, добавлены branch_id, duration_minutes, priority_weight, уникальность по branch_id и code)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    priority_weight INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, code)
);

-- 3. Окна обслуживания (is_open заменен на status window_status, убраны текущие id оператора и талона)
CREATE TABLE windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name VARCHAR(100),
    status window_status NOT NULL DEFAULT 'CLOSED',
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, number)
);

-- 4. Связь окон и услуг
CREATE TABLE window_services (
    window_id UUID NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (window_id, service_id)
);

-- 5. Очереди / зоны
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    zone VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, code)
);

-- 6. Связь очередей и услуг
CREATE TABLE queue_services (
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (queue_id, service_id)
);

-- 7. QR-коды
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    code VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 8. Операторы
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    employee_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, employee_code)
);

-- 9. Предварительные записи
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'BOOKED',
    ticket_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Главная таблица талонов (добавлены parent_ticket_id и booked_slot_time)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES queues(id),
    session_id UUID NOT NULL,
    source ticket_source NOT NULL,
    number VARCHAR(20) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'CREATED',
    appointment_id UUID REFERENCES appointments(id),
    current_window_id UUID REFERENCES windows(id),
    current_queue_entry_id UUID,
    parent_ticket_id UUID REFERENCES tickets(id),
    booked_slot_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    serving_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, number)
);

-- 11. История нахождения в очереди (queue_entries)
CREATE TABLE queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    priority_level INTEGER NOT NULL DEFAULT 0,
    sequence_number BIGINT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    status queue_entry_status NOT NULL DEFAULT 'WAITING',
    called_at TIMESTAMPTZ,
    serving_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    window_id UUID REFERENCES windows(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Аудит и история изменений (ticket_events)
CREATE TABLE ticket_events (
    id BIGSERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_status ticket_status,
    new_status ticket_status,
    operator_id UUID REFERENCES operators(id),
    window_id UUID REFERENCES windows(id),
    service_id UUID REFERENCES services(id),
    queue_id UUID REFERENCES queues(id),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Генерация номеров талонов по дням
CREATE TABLE ticket_sequences (
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    ticket_date DATE NOT NULL,
    prefix VARCHAR(5) NOT NULL DEFAULT 'A',
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (branch_id, ticket_date, prefix)
);

-- 14. Правила приоритетов (JSONB конфиги)
CREATE TABLE priority_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    configuration JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Уведомления
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status notification_status NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Новые таблицы: booked_slots и device_sessions
CREATE TABLE booked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    session_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    device_name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для оптимизации и защиты от дублей
CREATE INDEX idx_queue_entries_next ON queue_entries (queue_id, service_id, status, priority_level DESC, sequence_number ASC);
CREATE INDEX idx_tickets_active ON tickets(branch_id, status) WHERE status IN ('WAITING', 'CALLED', 'SERVING');
CREATE INDEX idx_ticket_events_ticket ON ticket_events(ticket_id, created_at);

-- Уникальный индекс: один активный талон на сессию
CREATE UNIQUE INDEX ux_active_ticket_per_session
ON tickets(session_id)
WHERE status IN ('WAITING', 'CALLED', 'SERVING');

CREATE UNIQUE INDEX ux_active_ticket_window ON tickets(current_window_id) WHERE status IN ('CALLED', 'SERVING');
CREATE UNIQUE INDEX ux_ticket_active_queue_entry ON queue_entries(ticket_id) WHERE status IN ('WAITING', 'CALLED', 'SERVING');