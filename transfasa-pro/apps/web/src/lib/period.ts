import { todayISO } from '@transfasa/domain';

export type PeriodKey = 'thisMonth' | 'lastMonth' | 'year' | 'all' | 'custom';
export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function periodFor(key: Exclude<PeriodKey, 'custom'>, today = todayISO()): Period {
  const [y, m] = today.split('-').map(Number) as [number, number];
  switch (key) {
    case 'thisMonth':
      return { key, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` };
    case 'lastMonth': {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return { key, from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${lastDay(py, pm)}` };
    }
    case 'year':
      return { key, from: `${y}-01-01`, to: `${y}-12-31` };
    case 'all':
      return { key, from: '2000-01-01', to: `${y + 1}-12-31` };
  }
}
