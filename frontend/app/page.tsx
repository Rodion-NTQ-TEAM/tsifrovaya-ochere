'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOCK_BRANCHES } from '../src/mocks/data';
import { TicketResponse } from './types';

export default function BranchSelectionPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('ops_active_ticket');
      if (savedSession) {
        try {
          const sessionData: TicketResponse = JSON.parse(savedSession);
          // Восстановление сессии через sessionToken по архитектурному контракту
          if (sessionData?.ticket?.branchId && sessionData?.ticket?.number && sessionData?.sessionToken) {
            router.replace(`/client/${sessionData.ticket.branchId}/ticket/${sessionData.ticket.number}`);
            return;
          }
        } catch (e) {
          console.error("Ошибка десериализации сессии", e);
        }
      }
      setCheckingSession(false);
    }
  }, [router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400 font-bold text-sm">
        Проверка активных сессий Почты России...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-black text-lg">P</div>
          <span className="font-bold tracking-wider text-blue-900 text-lg uppercase">Почта России</span>
        </div>
        
        <h1 className="text-xl font-extrabold text-slate-800 text-center mb-1">Электронная очередь</h1>
        <p className="text-slate-400 text-xs text-center mb-6">Выберите отделение для обслуживания</p>
        
        <div className="space-y-3">
          {MOCK_BRANCHES.map((branch) => (
            <button
              key={branch.id}
              onClick={() => router.push(`/client/${branch.id}/services`)}
              className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/30 transition-all active:scale-[0.99] flex justify-between items-center group"
            >
              <div>
                <div className="font-bold text-slate-800 group-hover:text-blue-900 transition-colors">Отделение №{branch.id}</div>
                <div className="text-xs text-slate-400 mt-0.5">{branch.city}, {branch.address}</div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 ${branch.color}`}>
                  {branch.load}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
