import {
    ActiveClientAction,
    IssueType,
    QueueEntryStatus,
    TicketSource,
    TicketStatus,
} from './enums';
import {
    Appointment,
    BookedSlot,
    Branch,
    Operator,
    PriorityConfig,
    QrCode,
    Queue,
    QueueEntry,
    Service,
    Ticket,
    TicketEvent,
    Window,
} from './entities';

// ============================================================
// Общие ответы
// ============================================================
export interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
}

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'down';
    version: string;
    db: 'up' | 'down';
}

// ============================================================
// Талоны
// ============================================================
export interface CreateTicketRequest {
    branchId: string;
    serviceId: string;
    source: TicketSource;
    scheduledAt?: string;
    sessionId?: string;
    clientName?: string;
}

export interface CreateTicketByQrRequest {
    qrCode: string;
    serviceId: string;
    sessionId?: string;
}

export interface TicketResponse {
    ticket: Ticket;
    queueEntry: QueueEntry | null;
    queuePosition: number | null;
    expectedWaitMinutes: number | null;
    /** UUID для восстановления сессии на устройстве */
    sessionToken: string;
}

export interface RestoreSessionRequest {
    sessionToken: string;
}

// ============================================================
// Предварительная запись
// ============================================================
export interface CreateAppointmentRequest {
    branchId: string;
    serviceId: string;
    scheduledAt: string;
    sessionId?: string;
    clientName?: string;
    clientPhone?: string;
}

export interface SlotsQuery {
    branchId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
}

export interface SlotsResponse {
    slots: BookedSlot[];
}

// ============================================================
// Оператор — окна
// ============================================================
export interface OpenWindowRequest {
    serviceIds: string[];
}

export interface CloseWindowRequest {
    activeClientAction?: ActiveClientAction;
}

export interface WindowActionResponse {
    window: Window;
    ticket: Ticket | null;
}

// ============================================================
// Оператор — талоны
// ============================================================
export interface AddLiveTicketRequest {
    branchId: string;
    serviceId: string;
    clientName?: string;
}

export interface RedirectTicketRequest {
    targetWindowId?: string;
    targetServiceId?: string;
    targetQueueId?: string;
}

export interface ReportIssueRequest {
    branchId: string;
    windowId?: string;
    type: IssueType;
    description: string;
}

export interface CallNextResponse {
    ticket: Ticket | null;
    queueEntry: QueueEntry | null;
}

// ============================================================
// Админка
// ============================================================
export interface CreateWindowRequest {
    branchId: string;
    number: number;
    name?: string;
}

export interface CreateServiceRequest {
    branchId: string;
    code: string;
    name: string;
    description?: string;
    durationMinutes: number;
    priorityWeight?: number;
}

export interface CreateOperatorRequest {
    branchId: string;
    employeeCode: string;
    name: string;
}

export interface CreateQueueRequest {
    branchId: string;
    code: string;
    name: string;
    zone?: string;
}

// ============================================================
// Очередь в реальном времени
// ============================================================
export interface LiveQueueResponse {
    branchId: string;
    queueId: string;
    entries: QueueEntryWithTicket[];
    updatedAt: Date;
}

export interface QueueEntryWithTicket extends QueueEntry {
    ticket: Ticket;
    expectedWaitMinutes: number | null;
}

// ============================================================
// Аналитика
// ============================================================
export interface AnalyticsSummary {
    branchId: string;
    from: string;
    to: string;
    totalTickets: number;
    servedTickets: number;
    cancelledTickets: number;
    noShowTickets: number;
    avgWaitMinutes: number;
    maxWaitMinutes: number;
    avgServiceMinutes: number;
    ticketsBySource: {
        APPOINTMENT: number;
        QR: number;
        LIVE: number;
    };
}

export interface WindowLoad {
    windowId: string;
    windowNumber: number;
    servedCount: number;
    avgServiceMinutes: number;
    loadPercent: number;
}

export interface Deviation {
    ticketId: string | null;
    type: string;
    description: string;
    createdAt: Date;
}

// ============================================================
// Журнал событий
// ============================================================
export interface EventsQuery {
    ticketId?: string;
    branchId?: string;
    limit?: number;
}

export interface EventsResponse {
    events: TicketEvent[];
}