'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [windowNum, setWindowNum] = useState('1');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Сохраняем номер окна в сессию и переходим на рабочее место
    sessionStorage.setItem('operator_window', windowNum);
    router.push('/operator/workspace');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Вход в окно оператора</h2>
        <label className="block text-sm font-medium text-gray-700 mb-2">Номер вашего окна:</label>
        <input 
          type="number" 
          value={windowNum} 
          onChange={(e) => setWindowNum(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:border-blue-500 focus:outline-none"
          required 
        />
        <button type="submit" className="w-full py-3 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-950 transition">
          Открыть смену
        </button>
      </form>
    </div>
  );
}
