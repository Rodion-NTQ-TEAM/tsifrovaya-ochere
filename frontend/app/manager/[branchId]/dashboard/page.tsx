'use client';
import { useParams } from 'next/navigation';

export default function ManagerDashboardPage() {
  const { branchId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Отделение №{branchId}</h1>
        <p className="text-gray-500 text-sm mb-6">Живой мониторинг показателей SLA в реальном времени</p>

        {/* Виджеты KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">Среднее время ожидания</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">11 мин. 45 сек.</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">Максимальное время</div>
            <div className="text-2xl font-bold text-red-600 mt-1">24 мин. 10 сек.</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">Обслужено клиентов</div>
            <div className="text-2xl font-bold text-green-600 mt-1">42 чел.</div>
          </div>
        </div>

        {/* Сетка Окон */}
        <h3 className="font-bold text-gray-700 mb-3">Состояние окон операторов:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((id) => (
            <div key={id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-blue-900">Окно №{id}</span>
                <span className={`w-2 h-2 rounded-full ${id === 3 ? 'bg-amber-500' : 'bg-green-500'}`} />
              </div>
              <p className="text-xs text-gray-500">{id === 3 ? 'Обслуживание' : 'Свободно'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
