'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_WINDOWS } from '../../../../src/mocks/data';
import { 
  PriorityConfig, 
  ActiveClientAction, 
  WindowStatus,
  PriorityRule,
  Window
} from '../../../types';

// Флаг переключения режима Mock / Real API
const USE_MOCKS = true;

// Дефолтная конфигурация алгоритма
const DEFAULT_CONFIG: PriorityConfig = {
  sources: {
    APPOINTMENT: {
      baseWeight: 1.5,
      bonus: 0.5,
      graceMinutes: 15
    },
    QR: {
      baseWeight: 1.0
    },
    LIVE: {
      baseWeight: 1.0,
      maxWaitMinutes: 20
    }
  },
  aging: {
    enabled: true,
    factor: 0.1,
    cap: 3.0
  },
  return: {
    enabled: true,
    boost: 0.5,
    maxBoost: 1.5
  },
  liveQueue: {
    maxWaitMinutes: 20,
    emergencyBoostAfter: 15,
    emergencyBoost: 2.0
  },
  window: {
    closeWithActiveClient: ActiveClientAction.RETURN_TO_QUEUE
  }
};

export default function ManagerManagementPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = (params?.branchId as string);
  
  const [windows, setWindows] = useState<Window[]>(INITIAL_WINDOWS as Window[]);
  const [config, setConfig] = useState<PriorityConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);
  const [isSavingWindows, setIsSavingWindows] = useState<boolean>(false);

  // Загрузка начальных настроек и конфигурации окон
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCKS) {
        // MOCK
        await new Promise((res) => setTimeout(res, 300));
        setWindows(INITIAL_WINDOWS as Window[]);
        setConfig(DEFAULT_CONFIG);
      } else {
        // API
        const [rulesRes, windowsRes] = await Promise.all([
          fetch(`/api/v1/manager/branches/${branchId}/queue/rules`),
          fetch(`/api/v1/manager/branches/${branchId}/windows`),
        ]);

        if (rulesRes.ok) {
          const rulesData: PriorityRule = await rulesRes.json();
          if (rulesData?.configuration) {
            setConfig(rulesData.configuration);
          }
        }

        if (windowsRes.ok) {
          const windowsData: Window[] = await windowsRes.json();
          setWindows(windowsData);
        }
      }
    } catch (e) {
      console.error('Ошибка при загрузке конфигурации:', e);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Изменение коэффициентов (APPOINTMENT / QR / LIVE)
  const handleSourceWeightChange = (source: 'APPOINTMENT' | 'QR' | 'LIVE', key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [source]: {
          ...prev.sources[source],
          [key]: value
        }
      }
    }));
  };

  // Изменение параметров старения талонов
  const handleAgingChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      aging: {
        ...prev.aging,
        [key]: value
      }
    }));
  };

  // Динамическое перераспределение услуг между окнами
  const handleToggleWindowService = (windowId: string, serviceCode: string) => {
    setWindows(prev => prev.map(win => {
      if (win.id === windowId) {
        const hasService = win.serviceIds.includes(serviceCode);
        const newServices = hasService 
          ? win.serviceIds.filter(id => id !== serviceCode)
          : [...win.serviceIds, serviceCode];
        return { ...win, serviceIds: newServices };
      }
      return win;
    }));
  };

  // Отправка обновленных правил приоритета на сервер
  const handleSavePriorityRules = async () => {
    setIsSavingRules(true);
    try {
      const payload: Partial<PriorityRule> = {
        branchId: branchId,
        name: "Основное правило ОПС",
        isActive: true,
        configuration: config
      };

      if (USE_MOCKS) {
        await new Promise((res) => setTimeout(res, 500));
        console.log('[MOCK] Сохранена конфигурация приоритетов:', payload);
      } else {
        await fetch(`/api/v1/manager/branches/${branchId}/queue/rules`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
        });
      }

      alert("Параметры алгоритма успешно обновлены! Пересчет приоритетов в пуле FIFO запущен.");
    } catch (e) {
      console.error("Ошибка сохранения конфигурации приоритетов", e);
      alert("Произошла ошибка при сохранении правил.");
    } finally {
      setIsSavingRules(false);
    }
  };

  // Сохранение новой конфигурации окон
  const handleSaveWindowsConfig = async () => {
    setIsSavingWindows(true);
    try {
      if (USE_MOCKS) {
        await new Promise((res) => setTimeout(res, 500));
        console.log('[MOCK] Сохранена конфигурация окон:', windows);
      } else {
        await fetch(`/api/v1/manager/branches/${branchId}/windows/config`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(windows) 
        });
      }

      alert("Конфигурация услуг для окон успешно обновлена. Операторы уведомлены.");
    } catch (e) {
      console.error("Ошибка сохранения конфигурации окон", e);
      alert("Произошла ошибка при сохранении конфигурации окон.");
    } finally {
      setIsSavingWindows(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Шапка дашборда */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-blue-900">Управление отделением ОПС №{branchId}</h1>
            <p className="text-xs text-slate-400 mt-1">Панель настройки бизнес-правил, весов приоритетов и конфигурации окон операторов</p>
          </div>
          
          {isLoading && (
            <span className="text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              Синхронизация...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Левая интерактивная панель */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-800">1. Коэффициенты приоритетов источников</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full">Алгоритм FIFO</span>
              </div>

              {/* Сетка инпутов настройки весов источников */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Предзапись</div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Базовый вес:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.sources.APPOINTMENT.baseWeight}
                      onChange={(e) => handleSourceWeightChange('APPOINTMENT', 'baseWeight', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Бонус (вовремя):</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.sources.APPOINTMENT.bonus}
                      onChange={(e) => handleSourceWeightChange('APPOINTMENT', 'bonus', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wide">QR-вход</div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Базовый вес:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.sources.QR.baseWeight}
                      onChange={(e) => handleSourceWeightChange('QR', 'baseWeight', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">Живая очередь</div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Базовый вес:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.sources.LIVE.baseWeight}
                      onChange={(e) => handleSourceWeightChange('LIVE', 'baseWeight', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">SLA лимит (мин):</label>
                    <input 
                      type="number" 
                      value={config.sources.LIVE.maxWaitMinutes}
                      onChange={(e) => handleSourceWeightChange('LIVE', 'maxWaitMinutes', parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Настройка параметров старения талонов */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">2. Динамическое старение талонов (Предотвращение зависания)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.aging.enabled}
                      onChange={(e) => handleAgingChange('enabled', e.target.checked)}
                      className="rounded text-blue-700 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700">Включить автоматический инкремент веса</span>
                  </label>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Фактор роста (в минуту):</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={config.aging.factor}
                      onChange={(e) => handleAgingChange('factor', parseFloat(e.target.value) || 0)}
                      disabled={!config.aging.enabled}
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-600 bg-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSavePriorityRules}
                disabled={isSavingRules}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50 active:scale-[0.99]"
              >
                {isSavingRules ? 'Сохранение...' : 'Сохранить и применить конфигурацию алгоритма'}
              </button>
            </div>
          </div>

          {/* Правая колонка конфигурации окон операторов */}
          <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-200/60 h-fit space-y-4">
            <h2 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">3. Оперативное управление окнами</h2>
            <p className="text-[11px] text-slate-400 leading-normal">При скоплении очередей вы можете моментально подключить или отключить услуги у окон операторов:</p>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {windows.map(win => (
                <div key={win.id} className="p-3 border border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-slate-700">{win.name || `Окно №${win.number}`}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${win.status === WindowStatus.OPEN ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {win.status === WindowStatus.OPEN ? 'Активно' : 'Пауза'}
                    </span>
                  </div>
                  
                  {/* Чекбоксы переключения услуг для конкретного окна */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={win.serviceIds.includes('send')}
                        onChange={() => handleToggleWindowService(win.id, 'send')}
                        className="rounded text-blue-700 w-3.5 h-3.5"
                      />
                      <span>Отправка посылок</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={win.serviceIds.includes('receive')}
                        onChange={() => handleToggleWindowService(win.id, 'receive')}
                        className="rounded text-blue-700 w-3.5 h-3.5"
                      />
                      <span>Получение посылок</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={win.serviceIds.includes('finance')}
                        onChange={() => handleToggleWindowService(win.id, 'finance')}
                        className="rounded text-blue-700 w-3.5 h-3.5"
                      />
                      <span>Финансовые услуги / Пенсии</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={win.serviceIds.includes('another')}
                        onChange={() => handleToggleWindowService(win.id, 'another')}
                        className="rounded text-blue-700 w-3.5 h-3.5"
                      />
                      <span>Другое</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSaveWindowsConfig}
              disabled={isSavingWindows}
              className="w-full py-3 border-2 border-blue-900 text-blue-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 active:scale-[0.99]"
            >
              {isSavingWindows ? 'Применение...' : 'Применить конфигурацию окон'}
            </button>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-center">
              <button 
                onClick={() => router.push(`/manager/${branchId}/dashboard`)}
                className="text-xs font-bold text-slate-400 hover:text-blue-900 transition-colors py-1"
              >
                Экран живого мониторинга
              </button>

              <button 
                onClick={() => router.push(`/manager/${branchId}/deviations`)}
                className="text-xs font-bold text-slate-400 hover:text-blue-900 transition-colors py-1"
              >
                Отклонения и логи
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}