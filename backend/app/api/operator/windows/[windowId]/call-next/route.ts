import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    windowId: string;
  }>;
};

type QueueEntryRow = {
  id: string;
  ticketId: string;
  queueId: string;
  serviceId: string;
  priorityLevel: number;
  sequenceNumber: number;
  status: string;
  enteredAt: Date;
  scheduledAt: Date | null;
  calledAt: Date | null;
  servingAt: Date | null;
  finishedAt: Date | null;
  windowId: string | null;
  createdAt: Date;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { windowId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const entries = await tx.$queryRaw<QueueEntryRow[]>`
        SELECT
          "id",
          "ticketId",
          "queueId",
          "serviceId",
          "priorityLevel",
          "sequenceNumber",
          "status",
          "enteredAt",
          "scheduledAt",
          "calledAt",
          "servingAt",
          "finishedAt",
          "windowId",
          "createdAt"
        FROM "QueueEntry"
        WHERE "status" = 'WAITING'
        ORDER BY
          "priorityLevel" DESC,
          "sequenceNumber" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      const queueEntry = entries[0];

      if (!queueEntry) {
        return null;
      }

      const calledAt = new Date();

      const updatedQueueEntry = await tx.queueEntry.update({
        where: {
          id: queueEntry.id,
        },
        data: {
          status: "CALLED",
          calledAt,
          windowId,
        },
      });

      const ticket = await tx.ticket.update({
        where: {
          id: queueEntry.ticketId,
        },
        data: {
          status: "CALLED",
          calledAt,
          currentWindowId: windowId,
          currentQueueEntryId: queueEntry.id,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "TICKET_CALLED",
          oldStatus: "WAITING",
          newStatus: "CALLED",
          windowId,
          serviceId: ticket.serviceId,
          queueId: ticket.queueId,
        },
      });

      return {
        ticket,
        queueEntry: updatedQueueEntry,
      };
    });

    if (!result) {
      return new NextResponse(null, {
        status: 204,
      });
    }

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
