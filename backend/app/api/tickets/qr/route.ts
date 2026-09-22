import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Валидация входных данных по ТЗ Родиона
const createQrTicketSchema = z.object({
  qrCode: z.string(),
  serviceId: z.string().uuid(),
  sessionId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createQrTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Находим услугу, чтобы автоматически вытащить branchId (ведь QR привязан к услуге филиала)
      const service = await tx.service.findFirst({
        where: {
          id: data.serviceId,
          isActive: true,
        },
      });

      if (!service) {
        throw new Error("SERVICE_NOT_FOUND");
      }

      const branchId = service.branchId;

      // Ищем очередь по филиалу и услуге
      const queue = await tx.queue.findFirst({
        where: {
          branchId: branchId,
          serviceId: data.serviceId,
        },
      });

      if (!queue) {
        throw new Error("QUEUE_NOT_FOUND");
      }

      // Проверка на дубликат активного талона по сессии клиента
      if (data.sessionId) {
        const existingTicket = await tx.ticket.findFirst({
          where: {
            sessionId: data.sessionId,
            status: {
              in: ["CREATED", "WAITING", "CALLED", "SERVING"],
            },
          },
        });

        if (existingTicket) {
          throw new Error("DUPLICATE_ACTIVE_TICKET");
        }
      }

      // Вычисляем порядковый номер в очереди
      const lastEntry = await tx.queueEntry.findFirst({
        where: {
          queueId: queue.id,
        },
        orderBy: {
          sequenceNumber: "desc",
        },
      });

      const sequenceNumber = (lastEntry?.sequenceNumber ?? 0) + 1;

      // Используем queue.name или qrCode (как просил Родион) для префикса номера
      const queuePrefix = queue.name || data.qrCode;
      const number = `${queuePrefix}-${sequenceNumber}`;

      // Создаем талон (Источник жестко QR, статус WAITING)
      const ticket = await tx.ticket.create({
        data: {
          branchId: branchId,
          serviceId: data.serviceId,
          queueId: queue.id,
          sessionId: data.sessionId ?? undefined,
          source: "QR", // Жестко прописано QR
          number,
          status: "WAITING", // Жестко прописано WAITING
        },
      });

      // Создаем запись в распределении потока посетителей
      const queueEntry = await tx.queueEntry.create({
        data: {
          ticketId: ticket.id,
          queueId: queue.id,
          serviceId: data.serviceId,
          priorityLevel: 0,
          sequenceNumber,
          status: "WAITING",
        },
      });

      // Пишем лог TICKET_CREATED в ticketEvent, как просил Родион
      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "TICKET_CREATED",
          newStatus: "WAITING",
          serviceId: data.serviceId,
          queueId: queue.id,
          metadata: {
            source: "QR",
            qrCode: data.qrCode,
          },
        },
      });

      return {
        ticket,
        queueEntry,
      };
    });

    // Возвращаем строго { ticket, queueEntry, sessionToken }
    return NextResponse.json(
      {
        ticket: result.ticket,
        queueEntry: result.queueEntry,
        sessionToken: data.sessionId ?? result.ticket.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SERVICE_NOT_FOUND") {
        return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });
      }
      if (error.message === "QUEUE_NOT_FOUND") {
        return NextResponse.json({ error: "QUEUE_NOT_FOUND" }, { status: 404 });
      }
      if (error.message === "DUPLICATE_ACTIVE_TICKET") {
        return NextResponse.json(
          {
            error: "DUPLICATE_ACTIVE_TICKET",
            message: "An active ticket already exists for this QR session",
          },
          { status: 409 }
        );
      }
    }

    console.error(error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
