import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    windowId: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { windowId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const queueEntry = await tx.queueEntry.findFirst({
        where: {
          windowId,
          status: "CALLED",
        },
        orderBy: {
          calledAt: "asc",
        },
      });

      if (!queueEntry) {
        return null;
      }

      const completedAt = new Date();

      const ticket = await tx.ticket.update({
        where: {
          id: queueEntry.ticketId,
        },
        data: {
          status: "COMPLETED",
          completedAt,
          currentWindowId: null,
          currentQueueEntryId: queueEntry.id,
        },
      });

      const updatedQueueEntry = await tx.queueEntry.update({
        where: {
          id: queueEntry.id,
        },
        data: {
          status: "COMPLETED",
          finishedAt: completedAt,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "TICKET_FINISHED",
          oldStatus: "CALLED",
          newStatus: "COMPLETED",
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
      return NextResponse.json(
        {
          error: "NO_ACTIVE_TICKET",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        window: {
          id: windowId,
        },
        ticket: result.ticket,
      },
      { status: 200 }
    );
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
