// ============================================================
// Источник талона
// ============================================================
export enum TicketSource {
    APPOINTMENT = 'APPOINTMENT', // предварительная запись
    QR = 'QR',                   // QR в отделении
    LIVE = 'LIVE',               // живая очередь через оператора
}

// ============================================================
// Статус талона
// ============================================================
export enum TicketStatus {
    CREATED = 'CREATED',         // создан, ещё не в очереди
    WAITING = 'WAITING',         // ждёт вызова
    CALLED = 'CALLED',           // вызван оператором
    SERVING = 'SERVING',         // обслуживается
    COMPLETED = 'COMPLETED',     // обслужен
    CANCELLED = 'CANCELLED',     // отменён клиентом
    NO_SHOW = 'NO_SHOW',         // не пришёл
    RETURNED = 'RETURNED',       // возвращён в очередь
    TRANSFERRED = 'TRANSFERRED', // перенаправлен
}

// ============================================================
// Статус нахождения талона в очереди (queue_entry)
// ============================================================
export enum QueueEntryStatus {
    WAITING = 'WAITING',
    CALLED = 'CALLED',
    SERVING = 'SERVING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REMOVED = 'REMOVED',
}

// ============================================================
// Статус окна
// ============================================================
export enum WindowStatus {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    PAUSED = 'PAUSED',
    CLOSING = 'CLOSING', // закрывается, но дообслуживает клиента
}

// ============================================================
// Статус предварительной записи
// ============================================================
export enum AppointmentStatus {
    BOOKED = 'BOOKED',
    CHECKED_IN = 'CHECKED_IN',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
    NO_SHOW = 'NO_SHOW',
}

// ============================================================
// Статус уведомления
// ============================================================
export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}

// ============================================================
// Тип события (append-only журнал)
// ============================================================
export enum EventType {
    TICKET_CREATED = 'TICKET_CREATED',
    TICKET_CALLED = 'TICKET_CALLED',
    TICKET_STARTED = 'TICKET_STARTED',
    TICKET_FINISHED = 'TICKET_FINISHED',
    TICKET_RETURNED = 'TICKET_RETURNED',
    TICKET_REDIRECTED = 'TICKET_REDIRECTED',
    TICKET_CANCELLED = 'TICKET_CANCELLED',
    TICKET_NO_SHOW = 'TICKET_NO_SHOW',
    TICKET_SESSION_RESTORED = 'TICKET_SESSION_RESTORED',
    WINDOW_OPENED = 'WINDOW_OPENED',
    WINDOW_CLOSED = 'WINDOW_CLOSED',
    WINDOW_CLOSED_WITH_ACTIVE = 'WINDOW_CLOSED_WITH_ACTIVE',
    WINDOW_ISSUE_REPORTED = 'WINDOW_ISSUE_REPORTED',
    SERVICE_RESTARTED = 'SERVICE_RESTARTED',
    NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
    INTEGRATION_TIMEOUT = 'INTEGRATION_TIMEOUT',
}

// ============================================================
// Роль
// ============================================================
export enum Role {
    CLIENT = 'CLIENT',
    OPERATOR = 'OPERATOR',
    MANAGER = 'MANAGER',
}

// ============================================================
// Тип проблемы (оператор фиксирует)
// ============================================================
export enum IssueType {
    TECHNICAL = 'TECHNICAL',
    OPERATIONAL = 'OPERATIONAL',
}

// ============================================================
// Поведение при закрытии окна с активным клиентом
// ============================================================
export enum ActiveClientAction {
    FINISH_CURRENT = 'finish_current',   // дообслужить
    RETURN_TO_QUEUE = 'return_to_queue', // вернуть в очередь
}

// ============================================================
// Тип уведомления
// ============================================================
export enum NotificationType {
    TICKET_CREATED = 'TICKET_CREATED',
    TICKET_CALLED = 'TICKET_CALLED',
    TICKET_FINISHED = 'TICKET_FINISHED',
    APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
    APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
}