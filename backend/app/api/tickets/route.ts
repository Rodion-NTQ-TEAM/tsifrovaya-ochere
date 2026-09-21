import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createTicketSchema = z.object({
  branchId: z.string().uuid(),
  serviceId: z.string().uuid(),
  source: z.enum(["APPOINTMENT", "QR", "LIVE"]),
  scheduledAt: z.string().datetime().optional(),
  sessionId: z.string().optional(),
  clientName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createTicketSchema.safeParse(body);

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
      const service = await tx.service.findFirst({
        where: {
          id: data.serviceId,
          branchId: data.branchId,
          isActive: true,
        },
      });

      if (!service) {
        throw new Error("SERVICE_NOT_FOUND");
      }

      const queue = await tx.queue.findFirst({
        where: {
          branchId: data.branchId,
          serviceId: data.serviceId,
        },
      });

      if (!queue) {
        throw new Error("QUEUE_NOT_FOUND");
      }

      if (data.sessionId) {
        const existingTicket = await tx.ticket.findFirst({
          where: {
            sessionId: data.sessionId,
            status: {
              in: [
                "CREATED",
                "WAITING",
                "CALLED",
                "SERVING",
              ],
            },
          },
        });

        if (existingTicket) {
          throw new Error("DUPLICATE_ACTIVE_TICKET");
        }
      }

      const lastEntry = await tx.queueEntry.findFirst({
        where: {
          queueId: queue.id,
        },
        orderBy: {
          sequenceNumber: "desc",
        },
      });

      const sequenceNumber =
        (lastEntry?.sequenceNumber ?? 0) + 1;

      const number = `${queue.name}-${sequenceNumber}`;

      const ticket = await tx.ticket.create({
        data: {
          branchId: data.branchId,
          serviceId: data.serviceId,
          queueId: queue.id,
          sessionId: data.sessionId,
          source: data.source,
          number,
          status: "WAITING",
          clientName: data.clientName,
          bookedSlotTime: data.scheduledAt
            ? new Date(data.scheduledAt)
            : null,
        },
      });

      const queueEntry = await tx.queueEntry.create({
        data: {
          ticketId: ticket.id,
          queueId: queue.id,
          serviceId: data.serviceId,
          priorityLevel: 0,
          sequenceNumber,
          status: "WAITING",
          scheduledAt: data.scheduledAt
            ? new Date(data.scheduledAt)
            : null,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "TICKET_CREATED",
          newStatus: "WAITING",
          serviceId: data.serviceId,
          queueId: queue.id,
          metadata: {
            source: data.source,
          },
        },
      });

      return {
        ticket,
        queueEntry,
      };
    });

    return NextResponse.json(
      {
        ticket: result.ticket,
        queueEntry: result.queueEntry,
        sessionToken: result.ticket.sessionId ?? result.ticket.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SERVICE_NOT_FOUND") {
        return NextResponse.json(
          {
            error: "SERVICE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (error.message === "QUEUE_NOT_FOUND") {
        return NextResponse.json(
          {
            error: "QUEUE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (error.message === "DUPLICATE_ACTIVE_TICKET") {
        return NextResponse.json(
          {
            error: "DUPLICATE_ACTIVE_TICKET",
            message: "An active ticket already exists for this session",
          },
          { status: 409 }
        );
      }
    }

    console.error(error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
