import { todayYmd } from './format';

export const currentPeriod = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const monthStartMs = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
export const monthStartYmd = (d = new Date()) => todayYmd(new Date(d.getFullYear(), d.getMonth(), 1));
export const startOfDayMs = (ymd = todayYmd()) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
export const endOfDayMs = (ymd = todayYmd()) => startOfDayMs(ymd) + 86400000 - 1;

/** Fraction of the working month elapsed (for pace comparisons). */
export const monthProgress = (d = new Date()) => {
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.min(1, d.getDate() / days);
};
