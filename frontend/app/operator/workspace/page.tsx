'use client';
import { useEffect, useState } from 'react';

export default function OperatorWorkspacePage() {
  const [windowNum, setWindowNum] = useState<string | null>('1');
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowNum(sessionStorage.getItem('operator_window') || '1');
    }
  }, []);

  const handleNextClient = () => {
    // Демо-генерация следующего талона
    setCurrentTicket(`A-${Math.floor(Math.random() * 90) + 10}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Панель управления талоном */}
        <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-blue-900">Окно №{windowNum}</h1>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Смена открыта</span>
          </div>

          <div className="bg-blue-50 rounded-2xl p-8 text-center mb-6 border border-blue-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Текущий клиент</span>
            <div className="text-6xl font-black text-blue-900 tracking-wide">
              {currentTicket || '—'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleNextClient} className="py-3.5 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-950 transition active:scale-[0.98]">
              Вызвать следующего
            </button>
            <button onClick={() => setCurrentTicket(null)} className="py-3.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition active:scale-[0.98]">
              Завершить прием
            </button>
          </div>
        </div>

        {/* Форма добавления живой очереди */}
        <div className="w-full md:w-80 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Живая очередь (ручной ввод)</h3>
          <button onClick={() => alert('Клиент добавлен в пул живой очереди')} className="w-full py-3 border-2 border-dashed border-blue-900 text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition">
            + Добавить клиента
          </button>
        </div>
      </div>
    </div>
  );
}
