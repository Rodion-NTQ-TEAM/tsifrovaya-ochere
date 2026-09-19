'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TicketPage() {
  const { branchId, ticketId } = useParams();
  const router = useRouter();

  // Состояния талона согласно ТЗ
  const [status, setStatus] = useState('В очереди');
  const [eta, setEta] = useState('~14 минут');
  const [activeWindow, setActiveWindow] = useState<string | null>(null);

  useEffect(() => {
    // 💾 ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ТЗ: Сохраняем сессию локально
    const ticketData = { branchId, ticketId, date: new Date().toLocaleDateString() };
    localStorage.setItem('ops_active_ticket', JSON.stringify(ticketData));

    // ДЕМО-ЭФФЕКТ ДЛЯ ХАКАTOНА: Симулируем звонок с сервера (Вызов оператором) через 8 секунд
    const demoTimer = setTimeout(() => {
      setStatus('Пройдите к окну');
      setActiveWindow('4');
      setEta('Сейчас');
      
      // Включаем вибрацию на телефоне (Web Vibration API), если поддерживается
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }, 8000);

    return () => clearTimeout(demoTimer);
  }, [branchId, ticketId]);

  const handleCancelTicket = () => {
    if (confirm('Вы действительно хотите отменить запись и удалить талон?')) {
      localStorage.removeItem('ops_active_ticket'); // очищаем сессию
      router.push(`/client/${branchId}/services`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
        
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Электронный билет
        </span>

        {/* Крупный номер талона */}
        <div className="text-6xl font-black text-blue-900 my-6 tracking-wider font-mono">
          {ticketId}
        </div>

        {/* Динамический статус-бар */}
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-extrabold mb-6 transition-all ${
          activeWindow 
            ? 'bg-green-100 text-green-800 border border-green-200 animate-bounce' 
            : 'bg-blue-50 text-blue-800 border border-blue-100'
        }`}>
          <span className={`w-2 h-2 rounded-full ${activeWindow ? 'bg-green-600' : 'bg-blue-600 animate-pulse'}`} />
          {status} {activeWindow && ` → ОКНО №${activeWindow}`}
        </div>

        {/* Информационная сетка */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-left text-xs mb-6">
          <div>
            <div className="text-slate-400 font-medium mb-0.5">Ожидание:</div>
            <div className="font-bold text-slate-700 text-sm">{eta}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium mb-0.5">Ваше ОПС:</div>
            <div className="font-bold text-slate-700 text-sm">№{branchId}</div>
          </div>
        </div>

        {/* Контроль отмены по ТЗ */}
        <button
          onClick={handleCancelTicket}
          className="w-full py-3.5 bg-red-50 hover:bg-red-100/70 text-red-600 font-bold text-xs rounded-xl transition-colors active:scale-[0.98]"
        >
          Отменить запись
        </button>
      </div>
    </div>
  );
}
