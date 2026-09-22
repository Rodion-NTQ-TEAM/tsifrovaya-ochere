import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    // Получаем ticketId из параметров URL-адреса
    const { ticketId } = params;

    if (!ticketId) {
      return NextResponse.json(
        { error: "MISSING_TICKET_ID" },
        { status: 400 }
      );
    }

    // Ищем талон в базе данных
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
    });

    // Если талон не найден, возвращаем 404 ошибку
    if (!ticket) {
      return NextResponse.json(
        { error: "TICKET_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Ищем связанную запись движения в очереди
    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        ticketId: ticket.id,
      },
    });

    // Возвращаем строго талон + queueEntry, как просил Родион
    return NextResponse.json(
      {
        ticket,
        queueEntry: queueEntry || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
