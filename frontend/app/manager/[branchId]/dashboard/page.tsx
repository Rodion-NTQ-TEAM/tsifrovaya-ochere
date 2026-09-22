'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Window, WindowStatus } from '../../../types';

// Флаг переключения режима Mock / Real API
const USE_MOCKS = true;

// Интерфейс показателей очереди для дашборда
interface BranchMetrics {
  avgWaitTimeSeconds: number;
  maxWaitTimeSeconds: number;
  totalServedClients: number;
  activeTicketsCount: number;
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = (params?.branchId as string) || 'branch-1';

  // Состояния данных
  const [metrics, setMetrics] = useState<BranchMetrics>({
    avgWaitTimeSeconds: 705, // 11 мин 45 сек
    maxWaitTimeSeconds: 1450, // 24 мин 10 сек
    totalServedClients: 42,
    activeTicketsCount: 8,
  });

  // Массив окон с типом Window
  const [windows, setWindows] = useState<Window[]>([
    {
      id: 'w-1',
      branchId: branchId,
      number: 1,
      name: 'Окно №1',
      status: WindowStatus.OPEN,
      operatorId: 'op-101',
      serviceIds: ['send', 'receive'],
      openedAt: new Date(),
      closedAt: null,
      createdAt: new Date(),
    },
    {
      id: 'w-2',
      branchId: branchId,
      number: 2,
      name: 'Окно №2',
      status: WindowStatus.OPEN,
      operatorId: 'op-102',
      serviceIds: ['send'],
      openedAt: new Date(),
      closedAt: null,
      createdAt: new Date(),
    },
    {
      id: 'w-3',
      branchId: branchId,
      number: 3,
      name: 'Окно №3',
      status: WindowStatus.PAUSED,
      operatorId: 'op-103',
      serviceIds: ['receive', 'payments'],
      openedAt: new Date(),
      closedAt: null,
      createdAt: new Date(),
    },
    {
      id: 'w-4',
      branchId: branchId,
      number: 4,
      name: 'Окно №4',
      status: WindowStatus.CLOSED,
      operatorId: null,
      serviceIds: [],
      openedAt: null,
      closedAt: new Date(),
      createdAt: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Вспомогательная функция форматирования секунд в мм:сс
  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} мин. ${secs < 10 ? '0' : ''}${secs} сек.`;
  };

  // Загрузка метрик и окон филиала
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCKS) {
        // MOCK
        await new Promise((res) => setTimeout(res, 300));
        setLastUpdated(new Date());
      } else {
        // API 
        const [metricsRes, windowsRes] = await Promise.all([
          fetch(`/api/v1/branches/${branchId}/metrics`),
          fetch(`/api/v1/branches/${branchId}/windows`),
        ]);

        if (metricsRes.ok) {
          const metricsData: BranchMetrics = await metricsRes.json();
          setMetrics(metricsData);
        }

        if (windowsRes.ok) {
          const windowsData: Window[] = await windowsRes.json();
          setWindows(windowsData);
        }

        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Ошибка при получении данных мониторинга:', e);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Шапка дашборда */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-blue-900">
              Отделение №{branchId}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Живой мониторинг показателей SLA в реальном времени
            </p>
          </div>

          {/* Блок навигации и обновить */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => router.push(`/manager/${branchId}/deviations`)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
             Отклонения
            </button>

            <button
              onClick={() => router.push(`/manager/${branchId}/management`)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
             Управление
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {/* Индикатор времени последнего обновления */}
        <div className="flex justify-end text-[11px] font-semibold text-slate-400 px-1 -mt-3">
          Время обновления данных: {lastUpdated.toLocaleTimeString()}
        </div>

        {/* Виджеты KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/30">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Среднее время ожидания</div>
            <div className="text-2xl font-black text-slate-800 mt-2">
              {formatSeconds(metrics.avgWaitTimeSeconds)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/30">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Максимальное время</div>
            <div className="text-2xl font-black text-red-600 mt-2">
              {formatSeconds(metrics.maxWaitTimeSeconds)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/30">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Обслужено клиентов</div>
            <div className="text-2xl font-black text-green-600 mt-2">
              {metrics.totalServedClients} чел.
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/30">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">В очереди сейчас</div>
            <div className="text-2xl font-black text-amber-600 mt-2">
              {metrics.activeTicketsCount} чел.
            </div>
          </div>
        </div>

        {/* Сетка Окон Операторов */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 space-y-4">
          <h3 className="font-extrabold text-base text-slate-800">Состояние окон операторов</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {windows.map((win) => {
              const isOpen = win.status === WindowStatus.CLOSED;
              const isBusy = win.status === WindowStatus.OPEN;

              return (
                <div 
                  key={win.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    isBusy ? 'bg-amber-50/30 border-amber-200' :
                    isOpen ? 'bg-green-50/20 border-green-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-sm text-blue-900">
                      {win.name || `Окно №${win.number}`}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isBusy ? 'bg-amber-500 animate-pulse' :
                      isOpen ? 'bg-green-500' : 'bg-slate-300'
                    }`} />
                  </div>

                  <p className="text-xs font-semibold text-slate-600">
                    {isBusy ? 'Обслуживание клиента' :
                     isOpen ? 'Свободно' : 'Окно закрыто'}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                    {win.operatorId ? (
                      <p className="text-[10px] font-medium text-slate-500">
                        ID оператора: <span className="font-bold text-slate-700">{win.operatorId}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] font-medium text-slate-400">Оператор не авторизован</p>
                    )}

                    {win.serviceIds && win.serviceIds.length > 0 && (
                      <p className="text-[9px] font-normal text-slate-400 truncate">
                        Услуги: {win.serviceIds.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}