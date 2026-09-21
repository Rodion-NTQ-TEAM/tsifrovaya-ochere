'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OPERATOR_SERVICES } from '../../../../src/mocks/data';
import { 
  WindowStatus, 
  TicketSource, 
  TicketStatus, 
  IssueType,
  ActiveClientAction,
  CallNextResponse,
  ReportIssueRequest,
  OpenWindowRequest,
  CloseWindowRequest
} from '../../../types';

export default function OperatorWorkspacePage() {
  const [windowNumber, setWindowNumber] = useState<number>(1);
  const [windowStatus, setWindowStatus] = useState<WindowStatus>(WindowStatus.CLOSED);
  const [selectedServices, setSelectedServices] = useState<string[]>(['send', 'receive']);
  const { branchId } = useParams();
  
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);

  // Считываем номер окна из сессии при инициализации экрана
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWindow = sessionStorage.getItem('operator_window');
      if (savedWindow) setWindowNumber(parseInt(savedWindow, 10));
    }
  }, []);

  // Открытие смены окна (POST /api/v1/operator/window/open)
  const handleOpenWindow = async () => {
    try {
      const openRequest: OpenWindowRequest = {
        serviceIds: selectedServices
      };
      // await fetch(`/api/v1/operator/window/open`, { method: 'POST', body: JSON.stringify(openRequest) });
      setWindowStatus(WindowStatus.OPEN);
    } catch (e) {
      console.error("Ошибка открытия окна обслуживания", e);
    }
  };

  // Закрытие смены окна (POST /api/v1/operator/window/close)
  const handleCloseWindow = async () => {
    try {
      const closeRequest: CloseWindowRequest = {
        activeClientAction: currentTicket ? ActiveClientAction.RETURN_TO_QUEUE : undefined
      };
      // await fetch(`/api/v1/operator/window/close`, { method: 'POST', body: JSON.stringify(closeRequest) });
      setWindowStatus(WindowStatus.CLOSED);
      setCurrentTicket(null);
    } catch (e) {
      console.error("Ошибка закрытия окна обслуживания", e);
    }
  };

  // Вызов следующего клиента (POST /api/v1/operator/ticket/next)
  const handleCallNext = async () => {
    try {
      if (windowStatus !== WindowStatus.OPEN) {
        alert("Сначала откройте окно для обслуживания!");
        return;
      }

      // Симулируем ответ CallNextResponse от бэкенда
      const sources = [TicketSource.APPOINTMENT, TicketSource.QR, TicketSource.LIVE];
      const randomSource = sources[Math.floor(Math.random() * sources.length)];
      const prefix = randomSource === TicketSource.APPOINTMENT ? 'P' : randomSource === TicketSource.QR ? 'QR' : 'L';
      
      const mockCallNextResponse: CallNextResponse = {
        ticket: {
          id: `t-uuid-${Math.random()}`,
          branchId: "7701",
          serviceId: selectedServices[0] || 'send',
          queueId: 'q-zone-main',
          appointmentId: randomSource === TicketSource.APPOINTMENT ? 'app-123' : null,
          sessionId: `session-client-uuid-${Math.random()}`,
          source: randomSource,
          number: `${prefix}-${Math.floor(Math.random() * 89) + 10}`,
          status: TicketStatus.CALLED,
          currentWindowId: `w-uuid-${windowNumber}`,
          currentQueueEntryId: `qe-uuid-${Math.random()}`,
          parentTicketId: null,
          bookedSlotTime: null,
          createdAt: new Date(),
          calledAt: new Date(),
          servingAt: null,
          completedAt: null,
          cancelledAt: null,
          updatedAt: new Date()
        },
        queueEntry: null
      };

      setCurrentTicket(mockCallNextResponse.ticket);
    } catch (e) {
      console.error("Ошибка вызова следующего талона", e);
    }
  };

  // Завершение обслуживания (POST /api/v1/operator/ticket/finish)
  const handleFinishServing = async () => {
    if (!currentTicket) return;
    // await fetch(`/api/v1/operator/ticket/finish`, { method: 'POST' });
    setCurrentTicket(null);
    alert("Обслуживание клиента успешно завершено.");
  };

  // Возврат клиента в общую очередь (POST /api/v1/operator/ticket/return)
  const handleReturnToQueue = async () => {
    if (!currentTicket) return;
    if (confirm("Вы уверены, что хотите вернуть клиента обратно в пул очереди?")) {
      // await fetch(`/api/v1/operator/ticket/return`, { method: 'POST' });
      setCurrentTicket(null);
      alert("Клиент возвращен в очередь со статусом RETURNED.");
    }
  };

  // Перенаправление в другое окно (POST /api/v1/operator/ticket/redirect)
  const handleRedirectTicket = async () => {
    if (!currentTicket) return;
    const targetWindow = prompt("Введите номер окна оператора для перенаправления:");
    if (targetWindow) {
      // по контракту RedirectTicketRequest
      setCurrentTicket(null);
      alert(`Талон успешно перенаправлен в окно №${targetWindow}.`);
    }
  };

  // Фиксация проблемы/Инцидента (POST /api/v1/operator/issue/report)
  const handleReportIssue = async (type: IssueType) => {
    try {
      const issuePayload: ReportIssueRequest = {
        branchId: "7701",
        windowId: `w-uuid-${windowNumber}`,
        type: type,
        description: type === IssueType.TECHNICAL ? "Сбой периферийного оборудования" : "Операционный конфликт"
      };
      // await fetch(`/api/v1/operator/issue/report`, { method: 'POST', body: JSON.stringify(issuePayload) });
      alert(`Инцидент [${type}] зафиксирован в Журнале отклонений.`);
    } catch (e) {
      console.error("Ошибка фиксации инцидента", e);
    }
  };

  // Переключатель галочек услуг
  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Шапка управления окном */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-blue-900">Окно обслуживания №{windowNumber}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Филиал ОПС №{branchId} • Контур ПочтаТех</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${windowStatus === WindowStatus.OPEN ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {windowStatus === WindowStatus.OPEN ? 'Смена открыта' : 'Смена закрыта'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Левая колонка: Управление текущим талоном */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col justify-between min-h-[400px]">
            {windowStatus === WindowStatus.CLOSED ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="font-extrabold text-slate-700">Окно заблокировано</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Выберите оказываемые услуги в правой панели и откройте смену окна для начала работы</p>
              </div>
            ) : currentTicket ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center relative overflow-hidden">
                  <div className="absolute top-3 left-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      currentTicket.source === TicketSource.APPOINTMENT ? 'bg-indigo-100 text-indigo-800' :
                      currentTicket.source === TicketSource.QR ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Источник: {currentTicket.source}
                    </span>
                  </div>

                  <div className="text-6xl font-black text-blue-900 tracking-wider font-mono mt-4">
                    {currentTicket.number}
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Статус: В ОКНЕ НА ОБСЛУЖИВАНИИ</p>
                </div>

                {/* Сетка бизнес-действий оператора */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleFinishServing}
                    className="py-3.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-green-200 active:scale-[0.98]"
                  >
                    Завершить прием
                  </button>
                  <button 
                    onClick={handleCallNext}
                    className="py-3.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-200 active:scale-[0.98]"
                  >
                    Вызвать следующего
                  </button>
                  <button 
                    onClick={handleReturnToQueue}
                    className="py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Вернуть в очередь
                  </button>
                  <button 
                    onClick={handleRedirectTicket}
                    className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Перенаправить талон
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
                <div className="text-4xl mb-3 animate-pulse">📢</div>
                <h3 className="font-extrabold text-slate-700">Окно свободно</h3>
                <p className="text-xs text-slate-400 mb-6">В очереди есть клиенты. Нажмите кнопку ниже, чтобы пригласить следующего талона к вашему окну</p>
                <button 
                  onClick={handleCallNext}
                  className="px-8 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-200"
                >
                  Вызвать следующего клиента
                </button>
              </div>
            )}
          </div>

          {/* Правая колонка: Настройка услуг и Фиксация инцидентов (SOS) */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-200/60">
              <h3 className="font-extrabold text-sm text-slate-800 mb-3">Конфигурация Окна</h3>
              
              <div className="space-y-2 mb-4">
                {OPERATOR_SERVICES.map(srv => (
                  <label 
                    key={srv.id} 
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                      selectedServices.includes(srv.id) ? 'border-blue-600 bg-blue-50/40 text-blue-900' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedServices.includes(srv.id)} 
                      onChange={() => toggleService(srv.id)}
                      disabled={windowStatus === WindowStatus.OPEN}
                      className="rounded text-blue-700 focus:ring-blue-500 w-4 h-4 disabled:opacity-50"
                    />
                    <div>
                      <div>{srv.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Код: {srv.code}</div>
                    </div>
                  </label>
                ))}
              </div>

              {windowStatus === WindowStatus.CLOSED ? (
                <button 
                  onClick={handleOpenWindow}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-100"
                >
                  Открыть смену окна
                </button>
              ) : (
                <button 
                  onClick={handleCloseWindow}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Закрыть смену окна
                </button>
              )}
            </div>

            {/* Фиксация проблем (Кнопки SOS) */}
            <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-200/60 space-y-2">
              <h3 className="font-extrabold text-sm text-slate-800 mb-1">Инциденты и Сбои</h3>
              <p className="text-[11px] text-slate-400 leading-normal pb-2">При возникновении непредвиденной ситуации зафиксируйте ошибку для логов:</p>
              
              <button 
                onClick={() => handleReportIssue(IssueType.TECHNICAL)}
                className="w-full py-2.5 border border-red-200 bg-red-50/30 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-xl transition-all"
              >
                Технический сбой (Железо / Сеть)
              </button>
              <button 
                onClick={() => handleReportIssue(IssueType.OPERATIONAL)}
                className="w-full py-2.5 border border-amber-200 bg-amber-50/20 text-amber-700 hover:bg-amber-50 text-[11px] font-bold rounded-xl transition-all"
              >
                Операционная проблема (Конфликт)
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
