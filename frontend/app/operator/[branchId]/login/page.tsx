'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Window, WindowStatus } from '../../../types';

// Переключатель режима
const USE_MOCKS = true;

export default function OperatorLoginPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = (params?.branchId as string);

  const [windows, setWindows] = useState<Window[]>([]);
  const [selectedWindowNumber, setSelectedWindowNumber] = useState<number | null>(null);
  const [operatorId, setOperatorId] = useState<string>('op-101');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWindows = async () => {
      setLoading(true);
      setError(null);

      try {
        if (USE_MOCKS) {
          // MOCK
          await new Promise((res) => setTimeout(res, 400));
          
          const mockWindows: Window[] = [
            {
              id: 'win-1',
              branchId: branchId,
              number: 1,
              name: 'Окно выдачи №1',
              status: WindowStatus.CLOSING,
              operatorId: null,
              serviceIds: ['send', 'receive'],
              openedAt: null,
              closedAt: null,
              createdAt: new Date(),
            },
            {
              id: 'win-2',
              branchId: branchId,
              number: 2,
              name: 'Окно экспресс №2',
              status: WindowStatus.OPEN,
              operatorId: 'op-007',
              serviceIds: ['send'],
              openedAt: new Date(),
              closedAt: null,
              createdAt: new Date(),
            },
            {
              id: 'win-3',
              branchId: branchId,
              number: 3,
              name: null,
              status: WindowStatus.CLOSED,
              operatorId: null,
              serviceIds: ['payments', 'receive'],
              openedAt: null,
              closedAt: null,
              createdAt: new Date(),
            },
            {
              id: 'win-4',
              branchId: branchId,
              number: 4,
              name: 'Касса №4',
              status: WindowStatus.CLOSED,
              operatorId: null,
              serviceIds: ['payments'],
              openedAt: null,
              closedAt: null,
              createdAt: new Date(),
            },
          ];

          setWindows(mockWindows);

        } else {
          // API
          const res = await fetch(`/api/v1/branches/${branchId}/windows`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!res.ok) throw new Error('Не удалось загрузить список окон отделения');

          const data: Window[] = await res.json();
          setWindows(data);

        }
      } catch (err: any) {
        console.error('Ошибка загрузки окон:', err);
        setError(err.message || 'Ошибка соединения с сервером');
      } finally {
        setLoading(false);
      }
    };

    fetchWindows();
  }, [branchId]);

  // Открытие смены в выбранном окне
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWindowNumber === null) return;

    const targetWindow = windows.find((w) => w.number === selectedWindowNumber);
    if (!targetWindow) return;

    try {
      if (USE_MOCKS) {
        // MOCK
        const sessionData = {
          windowId: targetWindow.id,
          windowNumber: targetWindow.number,
          operatorId: operatorId,
          branchId: branchId,
          serviceIds: targetWindow.serviceIds,
          openedAt: new Date().toISOString(),
        };

        sessionStorage.setItem('operator_session', JSON.stringify(sessionData));
        sessionStorage.setItem('operator_window', String(targetWindow.number));

      } else {
        // API
        const payload = {
          windowId: targetWindow.id,
          operatorId: operatorId,
        };

        const res = await fetch(`/api/v1/branches/${branchId}/windows/${targetWindow.id}/open-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Окно уже занято или недоступно');
        }

        const sessionData = await res.json();
        sessionStorage.setItem('operator_session', JSON.stringify(sessionData));
        sessionStorage.setItem('operator_window', String(targetWindow.number));
      }

      router.push('/operator/${branchId}/workspace');
    } catch (err: any) {
      alert(err.message || 'Ошибка при входе в окно');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 className="text-xl font-extrabold text-blue-900 mb-1">Вход оператора</h2>
        <p className="text-xs text-slate-400 mb-6">Выберите свободное окно отделения №{branchId}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* ID или Имя оператора */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            ID Оператора:
          </label>
          <input
            type="text"
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:outline-none"
            required
          />
        </div>

        {/* Список окон */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
            Доступные окна:
          </label>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Загрузка конфигурации окон...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {windows.map((win) => {
                const isOccupied = win.status === WindowStatus.OPEN || win.operatorId !== null;
                const isSelected = selectedWindowNumber === win.number;

                return (
                  <button
                    type="button"
                    key={win.id}
                    disabled={isOccupied}
                    onClick={() => setSelectedWindowNumber(win.number)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isOccupied
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                        : isSelected
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-extrabold">Окно №{win.number}</span>
                      <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-red-500' : 'bg-green-500'}`} />
                    </div>

                    <div className="text-[11px] font-normal truncate text-slate-500">
                      {win.name ? win.name : isOccupied ? `Занято (${win.operatorId})` : 'Свободно'}
                    </div>

                    {/* Вывод списка поддерживаемых услуг */}
                    {win.serviceIds.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {win.serviceIds.map((s) => (
                          <span key={s} className="text-[9px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || selectedWindowNumber === null}
          className="w-full py-3.5 bg-blue-900 text-white font-bold text-sm rounded-xl hover:bg-blue-950 transition active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {selectedWindowNumber ? `Занять окно №${selectedWindowNumber}` : 'Выберите окно'}
        </button>
      </form>
    </div>
  );
}