import {
  PrismaClient,
  TicketSource,
  TicketStatus,
  QueueEntryStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Очищаем данные в правильном порядке из-за foreign keys
  await prisma.ticketEvent.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.branch.deleteMany();

  // Branch
  const branch = await prisma.branch.create({
    data: {
      name: "Тестовый филиал",
    },
  });

  // Services
  const servicePassport = await prisma.service.create({
    data: {
      branchId: branch.id,
      name: "Паспортный стол",
      isActive: true,
    },
  });

  const serviceConsultation = await prisma.service.create({
    data: {
      branchId: branch.id,
      name: "Консультация",
      isActive: true,
    },
  });

  // Queues
  const queuePassport = await prisma.queue.create({
    data: {
      branchId: branch.id,
      serviceId: servicePassport.id,
      name: "Очередь паспортного стола",
    },
  });

  const queueConsultation = await prisma.queue.create({
    data: {
      branchId: branch.id,
      serviceId: serviceConsultation.id,
      name: "Очередь консультации",
    },
  });

  // Ticket 1
  const ticket1 = await prisma.ticket.create({
    data: {
      branchId: branch.id,
      serviceId: servicePassport.id,
      queueId: queuePassport.id,
      source: TicketSource.LIVE,
      number: "A001",
      status: TicketStatus.WAITING,
      clientName: "Иван Иванов",
    },
  });

  await prisma.queueEntry.create({
    data: {
      ticketId: ticket1.id,
      queueId: queuePassport.id,
      serviceId: servicePassport.id,
      priorityLevel: 0,
      sequenceNumber: 1,
      status: QueueEntryStatus.WAITING,
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket1.id,
      eventType: "TICKET_CREATED",
      newStatus: TicketStatus.WAITING,
      serviceId: servicePassport.id,
      queueId: queuePassport.id,
    },
  });

  // Ticket 2
  const ticket2 = await prisma.ticket.create({
    data: {
      branchId: branch.id,
      serviceId: servicePassport.id,
      queueId: queuePassport.id,
      source: TicketSource.LIVE,
      number: "A002",
      status: TicketStatus.WAITING,
      clientName: "Петр Петров",
    },
  });

  await prisma.queueEntry.create({
    data: {
      ticketId: ticket2.id,
      queueId: queuePassport.id,
      serviceId: servicePassport.id,
      priorityLevel: 0,
      sequenceNumber: 2,
      status: QueueEntryStatus.WAITING,
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket2.id,
      eventType: "TICKET_CREATED",
      newStatus: TicketStatus.WAITING,
      serviceId: servicePassport.id,
      queueId: queuePassport.id,
    },
  });

  console.log("Seed completed.");
  console.log(`Branch: ${branch.id}`);
  console.log(`Service 1: ${servicePassport.id}`);
  console.log(`Service 2: ${serviceConsultation.id}`);
  console.log(`Queue 1: ${queuePassport.id}`);
  console.log(`Queue 2: ${queueConsultation.id}`);
  console.log(`Ticket 1: ${ticket1.id}`);
  console.log(`Ticket 2: ${ticket2.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
