'use client';
import { useRouter, useParams } from 'next/navigation';
import { MOCK_SERVICES } from '../../../../src/mocks/data';

export default function ServicesPage() {
  const router = useRouter();
  const { branchId } = useParams(); // Считываем [branchId] из пути браузера

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Выберите услугу</h2>
            <p className="text-slate-400 text-xs">Обслуживание в отделении №{branchId}</p>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1 bg-slate-100 rounded-full"
          >
            Сменить ОПС
          </button>
        </div>

        <div className="space-y-3">
          {MOCK_SERVICES.map((service) => (
            <button
              key={service.id}
              onClick={() => router.push(`/client/${branchId}/booking?service=${service.id}`)}
              className="w-full p-4 text-left bg-white border border-slate-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/30 transition-all active:scale-[0.99]"
            >
              <div className="font-bold text-slate-800">{service.title}</div>
              <div className="text-xs text-slate-400 mt-1">{service.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}