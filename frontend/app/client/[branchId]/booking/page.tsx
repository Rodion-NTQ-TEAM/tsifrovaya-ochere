'use client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const MOCK_SLOTS = ['09:15', '09:45', '10:15', '10:45', '11:15', '11:45', '13:00', '13:30', '14:15', '15:45'];

export default function BookingPage() {
  const router = useRouter();
  const { branchId } = useParams();
  const searchParams = useSearchParams();
  const service = searchParams.get('service'); // Получаем выбранную услугу из query-параметра

  const [day, setDay] = useState<'today' | 'tomorrow'>('today');

  const handleBook = () => {
    // ХАКАТОН-ЛАЙФХАК: Для MVP генерируем случайный номер талона.
    // Первые буквы зависят от выбранной услуги (ТЗ требует ведение логов и типов)
    const prefix = service === 'send' ? 'P' : service === 'receive' ? 'V' : service === 'finance' ? 'F' : 'A';
    const num = Math.floor(Math.random() * 89) + 10; 
    const mockTicketId = `${prefix}-${num}`;

    // Редирект на экран готового талона
    router.push(`/client/${branchId}/ticket/${mockTicketId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">Выбор времени записи</h2>
        <p className="text-slate-400 text-xs mb-5">Услуга: <span className="font-semibold text-blue-900">{service?.toUpperCase()}</span></p>

        {/* Переключатель дат */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setDay('today')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border ${day === 'today' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            Сегодня, 19 сент.
          </button>
          <button
            onClick={() => setDay('tomorrow')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border ${day === 'tomorrow' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            Завтра, 20 сент.
          </button>
        </div>

        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Доступные слоты:</h3>
        
        {/* Сетка слотов */}
        <div className="grid grid-cols-3 gap-2">
          {MOCK_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={handleBook}
              className="py-3 text-center bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 rounded-xl text-sm font-bold text-slate-700 transition-all active:scale-95"
            >
              {slot}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
