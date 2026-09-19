'use client';
import { useRouter } from 'next/navigation';

const MOCK_BRANCHES = [
  { id: '7701', city: 'г. Москва', address: 'ул. Ленина, д. 10', load: 'Низкая', color: 'text-green-600' },
  { id: '1010', city: 'г. Москва', address: 'ул. Тверская, д. 7', load: 'Высокая', color: 'text-red-600' },
  { id: '4004', city: 'г. Москва', address: 'пр-т Мира, д. 45', load: 'Умеренная', color: 'text-amber-600' },
];

export default function BranchSelectionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        {/* Фирменный почтовый стиль */}
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
