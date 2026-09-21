'use client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { MOCK_SLOTS } from '../../../../src/mocks/data';
import { CreateAppointmentRequest, TicketResponse, TicketSource, TicketStatus } from '../../../types';

function BookingContent() {
  const router = useRouter();
  const { branchId } = useParams();
  const searchParams = useSearchParams();
  
  const serviceId = searchParams.get('service') || 'send'; 
  const rescheduleTicketId = searchParams.get('reschedule');

  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const todayString = `Сегодня, ${dateFormatter.format(today)}`;
  const tomorrowString = `Сегодня, ${dateFormatter.format(tomorrow)}`;
  const target = day === 'today' ? today : tomorrow;
  const scheduledDateStr = target.toISOString().slice(0, 10);

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setIsConfirming(true);
  };

  const handleFinalConfirm = async () => {
    try {
      // const appointmentPayload: CreateAppointmentRequest = {
      //   branchId: branchId as string,
      //   serviceId: serviceId,
      //   scheduledAt: `${scheduledDateStr}T${selectedTime}:00Z`,
      //   sessionId: null,
      //   clientName: "Иван Клиент",
      //   clientPhone: "+79991112233"
      // };

      // Мокаем финальный TicketResponse от сервера
      const targetTicketNumber = rescheduleTicketId || `P-${Math.floor(Math.random() * 89) + 10}`;
      
      const mockTicketResponse: TicketResponse = {
        ticket: {
          id: `t-uuid-${Math.random()}`,
          branchId: branchId as string,
          serviceId: serviceId,
          queueId: 'q-zone-1',
          appointmentId: `app-uuid-${Math.random()}`,
          sessionId: `s-uuid-${Math.random()}`,
          source: TicketSource.APPOINTMENT, // Строго по энуму архитектора
          number: targetTicketNumber,
          status: rescheduleTicketId ? TicketStatus.TRANSFERRED : TicketStatus.CREATED,
          currentWindowId: null,
          currentQueueEntryId: null,
          parentTicketId: null,
          bookedSlotTime: new Date(`${scheduledDateStr}T${selectedTime}:00Z`),
          createdAt: new Date(),
          calledAt: null,
          servingAt: null,
          completedAt: null,
          cancelledAt: null,
          updatedAt: new Date()
        },
        queueEntry: null,
        queuePosition: null,
        expectedWaitMinutes: 15,
        sessionToken: `secure-session-token-${Math.random()}`
      };

      // Перезаписываем / создаем чистую сессию с новым временем
      localStorage.setItem('ops_active_ticket', JSON.stringify(mockTicketResponse));

      if (rescheduleTicketId) {
        alert(`Время талона ${rescheduleTicketId} успешно изменено на ${selectedTime}!`);
      }
      
      router.push(`/client/${branchId}/ticket/${mockTicketResponse.ticket.number}`);
    } catch (e) {
      console.error("Ошибка создания предварительной записи", e);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        {!isConfirming ? (
          <>
            <h2 className="text-lg font-extrabold text-slate-800 mb-1">
              {rescheduleTicketId ? 'Перенос времени записи' : 'Выбор времени записи'}
            </h2>
            <p className="text-slate-400 text-xs mb-5">
              {rescheduleTicketId ? `Изменение талона: ${rescheduleTicketId}` : `Услуга: ${serviceId.toUpperCase()}`}
            </p>

            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setDay('today')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border ${day === 'today' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {todayString}
              </button>
              <button
                onClick={() => setDay('tomorrow')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border ${day === 'tomorrow' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {tomorrowString}
              </button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Доступные слоты:</h3>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleSelectTime(slot)}
                  className="py-3 text-center bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 rounded-xl text-sm font-bold text-slate-700 transition-all active:scale-95"
                >
                  {slot}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* экран подтверждения */
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">📅</div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Подтверждение записи</h2>
            <p className="text-slate-400 text-xs mb-6">Пожалуйста, проверьте детали вашей предварительной записи</p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 text-sm mb-6">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400">Отделение:</span>
                <span className="font-bold text-slate-700">№{branchId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400">Дата:</span>
                <span className="font-bold text-slate-700">{day === 'today' ? todayString : tomorrowString}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Выбранное время:</span>
                <span className="font-extrabold text-blue-900 text-base">{selectedTime}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleFinalConfirm}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-xl transition-colors active:scale-[0.98]"
              >
                Подтвердить предзапись
              </button>
              <button
                onClick={() => setIsConfirming(false)}
                className="w-full py-3 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors"
              >
                Назад к выбору времени
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="text-sm font-bold text-slate-500 text-center mt-10">Загрузка календаря...</div>}>
      <BookingContent />
    </Suspense>
  );
}
