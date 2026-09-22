'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TicketResponse, TicketStatus } from '../../../../types';

// Переключатель режима 
const USE_MOCKS = false; 

export default function TicketPage() {
  const { branchId, ticketId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState<string>('В очереди');
  const [eta, setEta] = useState<string>('~14 минут');
  const [activeWindow, setActiveWindow] = useState<string | null>(null);

  useEffect(() => {
    const checkStatusFromServer = async () => {
      if (USE_MOCKS) {
        // MOCK
        return;
      }

      // API
      try {
        const savedSession = localStorage.getItem('ops_active_ticket');
        if (!savedSession) return;
        
        const sessionData: TicketResponse = JSON.parse(savedSession);
        
        const res = await fetch(`http://localhost:3000/api/tickets/${ticketId}`, {
          headers: { 
            'Authorization': `${sessionData.sessionToken}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (res.ok) {
          const data: TicketResponse = await res.json();
          if (data.ticket.status === TicketStatus.CALLED) {
            setStatus('Пройдите к окну');
            setActiveWindow(data.ticket.currentWindowId || '4');
            setEta('Сейчас');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
        }
      } catch (e) {
        console.error("Ошибка авто-обновления статуса талона", e);
      }
    };

    const pollingInterval = setInterval(checkStatusFromServer, 4000);

    // Демо-таймаут для MOCK режима
    let demoTimer: NodeJS.Timeout;
    if (USE_MOCKS) {
      demoTimer = setTimeout(() => {
        setStatus('Пройдите к окну');
        setActiveWindow('4');
        setEta('Сейчас');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }, 8000);
    }

    return () => {
      clearInterval(pollingInterval);
      if (demoTimer) clearTimeout(demoTimer);
    };
  }, [branchId, ticketId]);

  const handleSwitchTimeTicket = () => {
    if (confirm('Вы действительно хотите перенести запись на другое время?')) {
      router.push(`/client/${branchId}/booking?reschedule=${ticketId}`);
    }
  };

  const handleCancelTicket = async () => {
    if (!confirm('Вы действительно хотите отменить запись и удалить талон?')) return;

    if (!USE_MOCKS) {
      // API
      try {
        const savedSession = localStorage.getItem('ops_active_ticket');
        const sessionData: TicketResponse = savedSession ? JSON.parse(savedSession) : null;
        
        await fetch(`/api/v1/branches/${branchId}/tickets/${ticketId}/cancel`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${sessionData?.sessionToken}`,
            'Content-Type': 'application/json' 
          }
        });
      } catch (e) {
        console.error("Ошибка отмены талона", e);
      }
    }

    localStorage.removeItem('ops_active_ticket');
    router.push(`/client/${branchId}/services`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
        
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Электронный билет
        </span>

        <div className="text-6xl font-black text-blue-900 my-6 tracking-wider font-mono">
          {ticketId}
        </div>

        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-extrabold mb-6 transition-all ${
          activeWindow 
            ? 'bg-green-100 text-green-800 border border-green-200 animate-bounce' 
            : 'bg-blue-50 text-blue-800 border border-blue-100'
        }`}>
          <span className={`w-2 h-2 rounded-full ${activeWindow ? 'bg-green-600' : 'bg-blue-600 animate-pulse'}`} />
          {status} {activeWindow && ` → ОКНО №${activeWindow}`}
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSwitchTimeTicket}
            className="py-3.5 bg-blue-50 hover:bg-blue-100/70 text-blue-900 font-bold text-xs rounded-xl transition-colors active:scale-[0.98]"
          >
            Перенести время
          </button>
          <button
            onClick={handleCancelTicket}
            className="py-3.5 bg-red-50 hover:bg-red-100/70 text-red-600 font-bold text-xs rounded-xl transition-colors active:scale-[0.98]"
          >
            Отменить запись
          </button>
        </div>
      </div>
    </div>
  );
}