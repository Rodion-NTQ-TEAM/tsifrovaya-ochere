import {
    ActiveClientAction,
    AppointmentStatus,
    EventType,
    NotificationStatus,
    NotificationType,
    QueueEntryStatus,
    TicketSource,
    TicketStatus,
    WindowStatus,
} from './enums';

// ============================================================
// Branch — отделение
// ============================================================
export interface Branch {
    id: string;
    code: string;
    name: string;
    address: string;
    timezone: string;
    isActive: boolean;
    createdAt: Date;
}

// ============================================================
// Service — услуга
// ============================================================
export interface Service {
    id: string;
    branchId: string;
    code: string;
    name: string;
    description?: string;
    /** Длительность в минутах, кратна 15 */
    durationMinutes: number;
    /** Вес услуги в алгоритме приоритета */
    priorityWeight: number;
    isActive: boolean;
    createdAt: Date;
}

// ============================================================
// Window — окно обслуживания
// ============================================================
export interface Window {
    id: string;
    branchId: string;
    number: number;
    name?: string;
    status: WindowStatus;
    operatorId: string | null;
    /** Услуги, которые умеет оказывать окно */
    serviceIds: string[];
    openedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
}

// ============================================================
// Operator — оператор
// ============================================================
export interface Operator {
    id: string;
    branchId: string;
    employeeCode: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
}

// ============================================================
// Queue — очередь / зона
// ============================================================
export interface Queue {
    id: string;
    branchId: string;
    code: string;
    name: string;
    zone?: string;
    isActive: boolean;
    createdAt: Date;
}

// ============================================================
// QrCode — QR-код
// ============================================================
export interface QrCode {
    id: string;
    queueId: string;
    code: string;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
}

// ============================================================
// Appointment — предварительная запись
// ============================================================
export interface Appointment {
    id: string;
    branchId: string;
    serviceId: string;
    /** UUID сессии клиента */
    sessionId: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    ticketId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// Ticket — талон
// ВАЖНО: priorityScore НЕ хранится, вычисляется в момент запроса
// ============================================================
export interface Ticket {
    id: string;
    branchId: string;
    serviceId: string;
    queueId: string | null;
    appointmentId: string | null;
    /** UUID сессии клиента для восстановления */
    sessionId: string;
    source: TicketSource;
    /** Человекочитаемый номер: A-001 */
    number: string;
    status: TicketStatus;
    currentWindowId: string | null;
    /** Ссылка на активную queue_entry */
    currentQueueEntryId: string | null;
    /** Родительский талон при перенаправлении */
    parentTicketId: string | null;
    bookedSlotTime: Date | null;
    createdAt: Date;
    calledAt: Date | null;
    servingAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    updatedAt: Date;
}

// ============================================================
// QueueEntry — нахождение талона в очереди
// (один талон может иметь несколько queue_entry: возврат, перенаправление)
// ============================================================
export interface QueueEntry {
    id: string;
    ticketId: string;
    queueId: string;
    serviceId: string;
    /** Уровень приоритета (вычисляется при постановке) */
    priorityLevel: number;
    /** Порядковый номер внутри уровня — для FIFO */
    sequenceNumber: number;
    status: QueueEntryStatus;
    enteredAt: Date;
    scheduledAt: Date | null;
    calledAt: Date | null;
    servingAt: Date | null;
    finishedAt: Date | null;
    windowId: string | null;
    createdAt: Date;
}

// ============================================================
// TicketEvent — append-only журнал
// ============================================================
export interface TicketEvent {
    id: number; // BIGSERIAL
    ticketId: string;
    eventType: EventType;
    oldStatus: TicketStatus | null;
    newStatus: TicketStatus | null;
    operatorId: string | null;
    windowId: string | null;
    serviceId: string | null;
    queueId: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

// ============================================================
// Notification — уведомление
// ============================================================
export interface Notification {
    id: string;
    ticketId: string;
    type: NotificationType;
    channel: string;
    status: NotificationStatus;
    attempts: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// PriorityRule — конфигурация правил приоритета
// ============================================================
export interface PriorityConfig {
    sources: {
        APPOINTMENT: {
            baseWeight: number;
            bonus: number;
            graceMinutes: number;
        };
        QR: {
            baseWeight: number;
        };
        LIVE: {
            baseWeight: number;
            maxWaitMinutes: number;
        };
    };
    aging: {
        enabled: boolean;
        factor: number;
        cap: number;
    };
    return: {
        enabled: boolean;
        boost: number;
        maxBoost: number;
    };
    liveQueue: {
        maxWaitMinutes: number;
        emergencyBoostAfter: number;
        emergencyBoost: number;
    };
    window: {
        closeWithActiveClient: ActiveClientAction;
    };
}

export interface PriorityRule {
    id: string;
    branchId: string;
    name: string;
    isActive: boolean;
    configuration: PriorityConfig;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// TicketSequence — счётчик номеров талонов
// ============================================================
export interface TicketSequence {
    branchId: string;
    ticketDate: string; // YYYY-MM-DD
    prefix: string;
    lastNumber: number;
}

// ============================================================
// BookingSlot — занятый слот предзаписи
// Храним ТОЛЬКО занятые слоты, свободные вычисляются
// ============================================================
export interface BookedSlot {
    id: string;
    branchId: string;
    serviceId: string;
    slotTime: Date;
    ticketId: string | null;
}

// ============================================================
// DeviceSession — сессия клиента на устройстве
// ============================================================
export interface DeviceSession {
    sessionId: string;
    ticketId: string | null;
    createdAt: Date;
    expiresAt: Date;
}