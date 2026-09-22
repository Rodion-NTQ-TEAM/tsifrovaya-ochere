import { Deviation, WindowStatus } from '../../app/types';

export const MOCK_BRANCHES = [
  { id: '7701', city: 'г. Москва', address: 'ул. Ленина, д. 10', load: 'Низкая', color: 'text-green-600' },
  { id: '1010', city: 'г. Москва', address: 'ул. Тверская, д. 7', load: 'Высокая', color: 'text-red-600' },
];

export const MOCK_SERVICES = [
  { id: 'send', title: 'Отправка посылок и писем', desc: 'Прием отправлений, продажа упаковки' },
  { id: 'receive', title: 'Получение посылок и писем', desc: 'Выдача по EMS, штрихкодам и извещениям' },
  { id: 'finance', title: 'Финансовые услуги', desc: 'Пенсии, переводы, оплата ЖКХ, Почта Банк' },
  { id: 'other', title: 'Прочие услуги', desc: 'Подписка, покупка товаров, заявления' },
];

export const MOCK_SLOTS = ['09:15', '09:45', '10:15', '10:45', '11:15', '11:45', '13:00', '13:30', '14:15', '15:45'];

export const OPERATOR_SERVICES = [
  { id: 'send', code: 'SEND_POST', name: 'Отправка посылок и писем' },
  { id: 'receive', code: 'RCV_POST', name: 'Получение посылок и писем' },
  { id: 'finance', code: 'FIN_OPS', name: 'Финансовые услуги и пенсии' },
  { id: 'another', code: 'ANOTHER', name: 'Подписки, покупки, заявления' },
];

export const INITIAL_DEVIATIONS: Deviation[] = [
  { ticketId: 'P-12', type: 'SLA_BREACH', description: 'Время ожидания в очереди превысило лимит (24 мин)', createdAt: new Date('2026-09-20T10:15:00Z') },
  { ticketId: 'V-45', type: 'NO_SHOW', description: 'Клиент не явился к окну №2 после 3 повторных вызовов', createdAt: new Date('2026-09-20T10:42:00Z') },
  { ticketId: null, type: 'WINDOW_ISSUE', description: 'Окно №3 зафиксировало технический сбой (периферия)', createdAt: new Date('2026-09-20T11:05:00Z') },
];

export const INITIAL_WINDOWS = [
  { id: 'w-1', number: 1, name: 'Окно 1', status: WindowStatus.OPEN, serviceIds: ['send', 'receive'] },
  { id: 'w-2', number: 2, name: 'Окно 2', status: WindowStatus.OPEN, serviceIds: ['send'] },
  { id: 'w-3', number: 3, name: 'Окно 3', status: WindowStatus.PAUSED, serviceIds: ['finance'] },
  { id: 'w-3', number: 4, name: 'Окно 4', status: WindowStatus.PAUSED, serviceIds: ['another'] },
];