import { agents, customers, days, type Day } from './demo';

export type Period = 'today' | 'mtd' | '30d';

const today = days[days.length - 1];
const dom = new Date().getDate();
const mtdDays = days.slice(-dom);
const prevMonthDays = days.slice(-dom - 30, -30 > -days.length ? -30 : undefined).slice(0, dom);
const last30 = days.slice(-30);
const prev30 = days.slice(-60, -30);

const sum = (rows: Day[], k: keyof Day) => rows.reduce((s, d) => s + (d[k] as number), 0);

export function periodRows(p: Period): { rows: Day[]; prev: Day[]; label: string } {
  if (p === 'today') return { rows: [today], prev: [days[days.length - 2]], label: 'Today' };
  if (p === 'mtd') return { rows: mtdDays, prev: prevMonthDays, label: 'This month' };
  return { rows: last30, prev: prev30, label: 'Last 30 days' };
}

export function kpis(p: Period) {
  const { rows, prev } = periodRows(p);
  const cur = { invoiced: sum(rows, 'invoiced'), collected: sum(rows, 'collected'), orders: sum(rows, 'orders'), orderValue: sum(rows, 'orderValue') };
  const before = { invoiced: sum(prev, 'invoiced'), collected: sum(prev, 'collected'), orders: sum(prev, 'orders'), orderValue: sum(prev, 'orderValue') };
  const byMode = { Cash: sum(rows, 'cash'), UPI: sum(rows, 'upi'), Cheque: sum(rows, 'cheque'), NEFT: sum(rows, 'neft') };
  return { cur, before, byMode };
}

export const receivables = (() => {
  const active = customers.filter((c) => c.status !== 'Lead');
  const total = active.reduce((s, c) => s + c.outstanding, 0);
  const buckets = [0, 1, 2, 3].map((i) => active.reduce((s, c) => s + c.buckets[i], 0));
  const overdue = buckets[1] + buckets[2] + buckets[3];
  const avgDailySales = sum(last30, 'invoiced') / 30;
  const dso = avgDailySales ? total / avgDailySales : 0;
  const top = [...active].sort((a, b) => b.outstanding - a.outstanding).slice(0, 8);
  const risky = active.filter((c) => c.status === 'Blocked' || c.status === 'OnHold' || c.buckets[3] > 0);
  return { total, buckets, overdue, dso, top, risky, count: active.filter((c) => c.outstanding > 0).length };
})();

export const team = (() => {
  const target = agents.reduce((s, a) => s + a.target, 0);
  const collected = agents.reduce((s, a) => s + a.mtdCollected, 0);
  const todayCollected = agents.reduce((s, a) => s + a.todayCollected, 0);
  const visitsPlanned = agents.reduce((s, a) => s + a.visitsPlanned, 0);
  const visitsDone = agents.reduce((s, a) => s + a.visitsDone, 0);
  const cashInHand = agents.reduce((s, a) => s + a.cashInHand, 0);
  const stale = agents.filter((a) => a.lastSyncMinutes > 60);
  return { target, collected, todayCollected, visitsPlanned, visitsDone, cashInHand, stale, active: agents.filter((a) => a.dayStarted).length };
})();

export const monthProgress = Math.min(1, dom / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
export const last14 = days.slice(-14);
