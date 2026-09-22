'use client';
import { useRouter, useParams } from 'next/navigation';
import { MOCK_SERVICES } from '../../../../src/mocks/data';
import { CreateTicketByQrRequest, TicketResponse, TicketSource, TicketStatus } from '../../../types';

// Переключатель режима 
const USE_MOCKS = true; 

export default function QrCodeEntryPage() {
  const router = useRouter();
  const { branchId } = useParams();

const handleJoinQueueByQr = async (serviceId: string) => {
    try {
      let mockServerResponse: TicketResponse;

      if (USE_MOCKS) {
        // MOCK
        mockServerResponse = {
          ticket: {
            id: `t-uuid-${Math.random()}`,
            branchId: branchId as string,
            serviceId: serviceId,
            queueId: 'q-zone-1',
            appointmentId: null,
            sessionId: `s-uuid-${Math.random()}`,
            source: TicketSource.QR,
            number: `QR-${Math.floor(Math.random() * 89) + 10}`,
            status: TicketStatus.WAITING,
            currentWindowId: null,
            currentQueueEntryId: `qe-uuid-${Math.random()}`,
            parentTicketId: null,
            bookedSlotTime: null,
            createdAt: new Date(),
            calledAt: null,
            servingAt: null,
            completedAt: null,
            cancelledAt: null,
            updatedAt: new Date()
          },
          queueEntry: null,
          queuePosition: 3,
          expectedWaitMinutes: 12,
          sessionToken: `token-secure-uuid-${Math.random()}`
        };
      } else {
        // API
        const qrPayload: CreateTicketByQrRequest = {
          qrCode: `QR_STATIC_CODE_${branchId}`,
          serviceId: serviceId,
          sessionId: null,
        };

        const res = await fetch(`http://localhost:3000/api/tickets/qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qrPayload)
        });

        if (!res.ok) throw new Error("Ошибка вставания в очередь по QR");
        mockServerResponse = await res.json();
      }

      localStorage.setItem('ops_active_ticket', JSON.stringify(mockServerResponse));
      router.push(`/client/${branchId}/ticket/${mockServerResponse.ticket.number}`);
    } catch (e) {
      console.error("Критический сбой API при входе через QR", e);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 text-lg font-bold">QR</div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-1">Вход по QR-коду</h2>
        <p className="text-slate-400 text-xs mb-6">Вы находитесь в ОПС №{branchId}. Выберите нужную услугу, чтобы занять электронное место в очереди:</p>
        
        <div className="space-y-3">
          {MOCK_SERVICES.map((service) => (
            <button
              key={service.id}
              onClick={() => handleJoinQueueByQr(service.id)}
              className="w-full p-4 text-left bg-white border border-slate-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/10 transition-all font-bold text-slate-700 active:scale-[0.99]"
            >
              {service.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
