'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Deviation } from '../../../types';
import { INITIAL_DEVIATIONS } from '../../../../src/mocks/data';

// Флаг переключения режима Mock / Real API
const USE_MOCKS = true;

export default function ManagerDeviationsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = (params?.branchId as string) || 'branch-1';
  
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Загрузка журнала отклонений
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCKS) {
        // MOCK
        await new Promise((res) => setTimeout(res, 300));
        setDeviations(INITIAL_DEVIATIONS);
      } else {
        // API
        const res = await fetch(`/api/v1/manager/branches/${branchId}/deviations`);
        if (res.ok) {
          const data: Deviation[] = await res.json();
          const parsedData = data.map(d => ({
            ...d,
            createdAt: new Date(d.createdAt)
          }));
          setDeviations(parsedData);
        }
      }
    } catch (e) {
      console.error('Ошибка при загрузке журнала отклонений:', e);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDeviations = filterType === 'ALL' 
    ? deviations 
    : deviations.filter(d => d.type === filterType);

  const handleExportToCsv = () => {
    try {
      const headers = ['Талон', 'Тип инцидента', 'Описание сбоя', 'Дата и время'];
      
      // Массив объектов Deviation в строки таблицы
      const rows = filteredDeviations.map(d => [
        d.ticketId || 'Системный сбой',
        d.type,
        `"${d.description.replace(/"/g, '""')}"`,
        d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString()
      ]);

      // Соединяем всё в единый текст с разделителем-запятой
      const csvContent = [headers, ...rows]
        .map(e => e.join(','))
        .join('\n');

      // Виртуальный файл в памяти браузера (BOM для кириллицы в Excel)
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Скрытый клик по ссылке для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deviations_report_ops_${branchId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("Операционный отчет за смену успешно экспортирован в CSV!");
    } catch (e) {
      console.error("Критический сбой экспорта файловой системы", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Панель навигации и шапка */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <span>ОПС №{branchId}</span>
              <span>•</span>
              <span>Контур Безопасности</span>
            </div>
            <h1 className="text-xl font-black text-blue-900 mt-0.5">Журнал отклонений и инцидентов</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isLoading && (
              <span className="text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                Загрузка...
              </span>
            )}

            {/* Кнопка экспорта в CSV */}
            <button 
              onClick={handleExportToCsv}
              disabled={filteredDeviations.length === 0}
              className="px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-200 active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              Выгрузить лог в CSV
            </button>
          </div>
        </div>

        {/* Интерактивная фильтрация инцидентов */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'SLA_BREACH', 'NO_SHOW', 'WINDOW_ISSUE', 'OPERATIONAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border whitespace-nowrap ${
                filterType === type 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {type === 'ALL' ? 'Все события' : type}
            </button>
          ))}
        </div>

        {/* Таблица инцидентов */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4">Связанный талон</th>
                  <th className="p-4">Категория</th>
                  <th className="p-4">Описание инцидента</th>
                  <th className="p-4 text-right">Временная метка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredDeviations.length > 0 ? (
                  filteredDeviations.map((dev, idx) => {
                    const timeString = dev.createdAt instanceof Date 
                      ? dev.createdAt.toLocaleTimeString('ru-RU')
                      : new Date(dev.createdAt).toLocaleTimeString('ru-RU');

                    return (
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-900">
                          {dev.ticketId || (
                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-sans">
                              Критический сбой
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            dev.type === 'SLA_BREACH' ? 'bg-red-100 text-red-800' :
                            dev.type === 'NO_SHOW' ? 'bg-amber-100 text-amber-800' :
                            dev.type === 'WINDOW_ISSUE' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {dev.type}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 leading-relaxed max-w-sm">
                          {dev.description}
                        </td>
                        <td className="p-4 text-right text-slate-400 font-mono">
                          {timeString}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                      {isLoading ? 'Загрузка журнала...' : 'За смену аномалий и нарушений SLA не зафиксировано.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Дополнительные кнопки навигации */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
          <button 
            onClick={() => router.push(`/manager/${branchId}/dashboard`)}
            className="text-xs font-bold text-slate-400 hover:text-blue-900 transition-colors"
          >
            Вернуться на экран мониторинга
          </button>
          <button 
            onClick={() => router.push(`/manager/${branchId}/management`)}
            className="text-xs font-bold text-slate-400 hover:text-blue-900 transition-colors"
          >
            Перейти на экран конфигурации
          </button>
        </div>
      </div>
    </div>
  );
}