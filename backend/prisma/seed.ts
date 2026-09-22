import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const branch = await prisma.branch.create({
        data: { name: 'Отделение 7701' },
    });

    const send = await prisma.service.create({
        data: { branchId: branch.id, name: 'Отправка', isActive: true },
    });
    const receive = await prisma.service.create({
        data: { branchId: branch.id, name: 'Получение', isActive: true },
    });
    const finance = await prisma.service.create({
        data: { branchId: branch.id, name: 'Финансы', isActive: true },
    });

    await prisma.queue.create({ data: { branchId: branch.id, serviceId: send.id, name: 'P' } });
    await prisma.queue.create({ data: { branchId: branch.id, serviceId: receive.id, name: 'V' } });
    await prisma.queue.create({ data: { branchId: branch.id, serviceId: finance.id, name: 'F' } });

    console.log('BRANCH_ID=' + branch.id);
    console.log('SERVICE_SEND_ID=' + send.id);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });