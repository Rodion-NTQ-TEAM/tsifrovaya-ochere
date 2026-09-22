import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    ticketId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { ticketId } = await context.params;

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        queueEntry: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          error: "TICKET_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ticket,
        queueEntry: ticket.queueEntry,
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
