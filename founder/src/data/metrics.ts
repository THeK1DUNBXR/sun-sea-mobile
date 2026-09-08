import type { Dataset, Day } from './types';

export type Period = 'today' | 'mtd' | '30d';
const sum = (rows: Day[], k: keyof Day) => rows.reduce((s, d) => s + (d[k] as number), 0);

export function computeMetrics(ds: Dataset) {
  const { days, customers, agents } = ds;
  const today = days[days.length - 1] ?? ({ invoiced: 0, collected: 0, orders: 0, orderValue: 0, cash: 0, upi: 0, cheque: 0, neft: 0, date: new Date() } as Day);
  const dom = new Date().getDate();
  const mtdDays = days.slice(-dom);
  const prevMonthDays = days.slice(Math.max(0, days.length - dom - 30), Math.max(0, days.length - 30)).slice(0, dom);
  const last30 = days.slice(-30);
  const prev30 = days.slice(-60, -30);

  const periodRows = (p: Period): { rows: Day[]; prev: Day[]; label: string } => {
    if (p === 'today') return { rows: [today], prev: [days[days.length - 2] ?? today], label: 'Today' };
    if (p === 'mtd') return { rows: mtdDays, prev: prevMonthDays, label: 'This month' };
    return { rows: last30, prev: prev30, label: 'Last 30 days' };
  };

  const kpis = (p: Period) => {
    const { rows, prev } = periodRows(p);
    const cur = { invoiced: sum(rows, 'invoiced'), collected: sum(rows, 'collected'), orders: sum(rows, 'orders'), orderValue: sum(rows, 'orderValue') };
    const before = { invoiced: sum(prev, 'invoiced'), collected: sum(prev, 'collected'), orders: sum(prev, 'orders'), orderValue: sum(prev, 'orderValue') };
    const byMode = { Cash: sum(rows, 'cash'), UPI: sum(rows, 'upi'), Cheque: sum(rows, 'cheque'), NEFT: sum(rows, 'neft') };
    return { cur, before, byMode };
  };

  const active = customers.filter((c) => c.status !== 'Lead');
  const total = active.reduce((s, c) => s + c.outstanding, 0);
  const buckets = [0, 1, 2, 3].map((i) => active.reduce((s, c) => s + c.buckets[i], 0));
  const overdue = buckets[1] + buckets[2] + buckets[3];
  const avgDailySales = sum(last30, 'invoiced') / 30;
  const receivables = {
    total,
    buckets,
    overdue,
    dso: avgDailySales ? total / avgDailySales : 0,
    top: [...active].sort((a, b) => b.outstanding - a.outstanding).slice(0, 8),
    risky: active.filter((c) => c.status === 'Blocked' || c.status === 'OnHold' || c.buckets[3] > 0),
    count: active.filter((c) => c.outstanding > 0).length,
  };

  const team = {
    target: agents.reduce((s, a) => s + a.target, 0),
    collected: agents.reduce((s, a) => s + a.mtdCollected, 0),
    todayCollected: agents.reduce((s, a) => s + a.todayCollected, 0),
    visitsPlanned: agents.reduce((s, a) => s + a.visitsPlanned, 0),
    visitsDone: agents.reduce((s, a) => s + a.visitsDone, 0),
    cashInHand: agents.reduce((s, a) => s + a.cashInHand, 0),
    stale: agents.filter((a) => a.lastSyncMinutes > 60),
    active: agents.filter((a) => a.dayStarted).length,
  };

  const monthProgress = Math.min(1, dom / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
  return { kpis, periodRows, receivables, team, monthProgress, last14: days.slice(-14) };
}
export type Metrics = ReturnType<typeof computeMetrics>;
