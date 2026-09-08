/**
 * Builds the Insights dataset from the live Sun Sea ERP (Railway deployment):
 * the TV summary and accounts summary the web wall already uses, plus the
 * standard list endpoints for invoices, receipts, orders, customers, products,
 * stock, purchases, dispatches and expenses. Field-team figures come from the
 * mobile extension when it is installed; otherwise that scene says so.
 */
import { http, unwrap } from '../api/client';
import type { Agent, Attention, Customer, Dataset, Day, Product } from './types';
import { daysAgo } from '../format';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const ymd = (d: unknown) => {
  const t = d ? new Date(d as string) : null;
  return t && !isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : null;
};
const firstArray = (data: unknown, preferred: string[] = []): Record<string, any>[] => {
  if (Array.isArray(data)) return data as Record<string, any>[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of preferred) if (Array.isArray(o[k])) return o[k] as Record<string, any>[];
    for (const v of Object.values(o)) if (Array.isArray(v)) return v as Record<string, any>[];
  }
  return [];
};
const paymentsOf = (raw: unknown): any[] => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};
const get = async <T = any>(url: string, params?: Record<string, unknown>): Promise<T | null> => {
  try {
    return unwrap<T>(await http.get(url, { params }));
  } catch {
    return null;
  }
};
const modeOf = (text: string): 'cash' | 'upi' | 'cheque' | 'neft' => {
  const t = text.toLowerCase();
  if (/cheque|chq/.test(t)) return 'cheque';
  if (/upi|gpay|phonepe|paytm/.test(t)) return 'upi';
  if (/neft|rtgs|imps|bank|transfer/.test(t)) return 'neft';
  return 'cash';
};
const daysSince = (d: string | null) => (d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000)) : 0);

export async function loadLiveDataset(fieldAvailable: boolean): Promise<Dataset> {
  const since = daysAgo(59).toISOString().slice(0, 10);
  const [tv, acct, receivable, invoicesRes, ordersRes, customersRes, products, pos, dispatchesRes, expensesRes, receipts, fgStock, rmStock, company] = await Promise.all([
    get<any>('/dashboard/tv-summary'),
    get<any>('/dashboard/accounts-summary', { period: 'month' }),
    get<any>('/accounts/receivable'),
    get<any>('/sales-invoices', { page: 1, pageSize: 500, fromDate: since }),
    get<any>('/sales-orders', { page: 1, pageSize: 500 }),
    get<any>('/customers', { page: 1, limit: 200 }),
    get<any>('/products'),
    get<any>('/purchase-orders', { page: 1, pageSize: 100 }),
    get<any>('/goods-dispatches', { page: 1, limit: 100 }),
    get<any>('/expenses', { page: 1, limit: 500 }),
    get<any>('/vouchers', { type: 'RECEIPT', startDate: since, limit: 1000 }),
    get<any>('/finished-goods-stocks', { page: 1, limit: 500 }),
    get<any>('/raw-material-stocks'),
    get<any>('/companies'),
  ]);

  const invoices = firstArray(invoicesRes, ['invoices', 'data']).filter((i) => String(i.status ?? '').toUpperCase() !== 'CANCELLED');
  const orders = firstArray(ordersRes, ['orders', 'salesOrders', 'data']);
  const customersRaw = firstArray(customersRes, ['customers']);
  const productsRaw = firstArray(products, ['products']);
  const posRaw = firstArray(pos, ['purchaseOrders', 'orders', 'data']);
  const dispatchesRaw = firstArray(dispatchesRes, ['data', 'dispatches']);
  const expensesRaw = firstArray(expensesRes, ['expenses', 'data']);
  const receiptsRaw = firstArray(receipts, ['vouchers']);
  const receivableRaw = firstArray(receivable, ['summaries', 'data']);
  const fg = firstArray(fgStock, ['data', 'stocks']);
  const rm = firstArray(rmStock, ['data', 'stocks']);

  // ── 60 days of daily figures ──────────────────────────────────────────────
  const dayMap = new Map<string, Day>();
  for (let i = 59; i >= 0; i--) {
    const date = daysAgo(i);
    dayMap.set(date.toISOString().slice(0, 10), { date, invoiced: 0, collected: 0, orders: 0, orderValue: 0, cash: 0, upi: 0, cheque: 0, neft: 0 });
  }
  for (const inv of invoices) {
    const d = dayMap.get(ymd(inv.invoiceDate) ?? '');
    if (d) d.invoiced += num(inv.grandTotal ?? inv.subTotal);
  }
  for (const o of orders) {
    const d = dayMap.get(ymd(o.orderDate) ?? '');
    if (d) {
      d.orders += 1;
      d.orderValue += num(o.netAmount ?? o.subtotal);
    }
  }
  let chequesInHand = 0;
  let chequesValue = 0;
  for (const v of receiptsRaw) {
    const d = dayMap.get(ymd(v.date) ?? '');
    const items: any[] = Array.isArray(v.items) ? v.items : [];
    const amount = items.reduce((s, it) => s + num(it.debitAmount), 0) || num(v.amount);
    const mode = modeOf(`${v.narration ?? ''} ${items.map((it) => it.narration ?? '').join(' ')}`);
    if (mode === 'cheque') {
      chequesInHand += 1;
      chequesValue += amount;
    }
    if (d) {
      d.collected += amount;
      d[mode] += amount;
    }
  }
  const days = Array.from(dayMap.values());

  // ── customers with ageing from the receivable summaries ──────────────────
  const recvByCustomer = new Map<string, any>(receivableRaw.map((r) => [String(r.customerId), r]));
  const invByCustomer = new Map<string, any[]>();
  invoices.forEach((i) => invByCustomer.set(String(i.customerId), [...(invByCustomer.get(String(i.customerId)) ?? []), i]));
  const mtdStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const customers: Customer[] = customersRaw.map((c, idx) => {
    const r = recvByCustomer.get(String(c.id));
    const outstanding = Math.max(0, num(r?.netBalance ?? c.netBalance ?? c.outstandingAmount));
    // Bucket open invoice balances by age; anything unexplained by invoices sits in the current bucket.
    const buckets: [number, number, number, number] = [0, 0, 0, 0];
    let explained = 0;
    for (const inv of invByCustomer.get(String(c.id)) ?? []) {
      const bal = Math.max(0, num(inv.grandTotal) - paymentsOf(inv.payments).reduce((s, p) => s + num(p.amount), 0));
      if (bal <= 0) continue;
      const age = daysSince(ymd(inv.dueDate) ?? ymd(inv.invoiceDate));
      const b = age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3;
      const take = Math.min(bal, Math.max(0, outstanding - explained));
      buckets[b] += take;
      explained += take;
    }
    buckets[0] += Math.max(0, outstanding - explained);
    const mine = invByCustomer.get(String(c.id)) ?? [];
    const mtdSales = mine.filter((i) => (ymd(i.invoiceDate) ?? '') >= mtdStart).reduce((s, i) => s + num(i.grandTotal), 0);
    const lastInv = mine.map((i) => ymd(i.invoiceDate) ?? '').sort().pop() ?? null;
    const status = (c.status as Customer['status']) || 'Active';
    return {
      id: String(c.id),
      name: c.displayName || c.firmName || `Customer ${idx + 1}`,
      city: c.addresses?.[0]?.address?.city ?? '—',
      grade: c.customerGrade?.name === 'Grade A' ? 'Grade A' : 'Grade B',
      creditLimit: num(c.creditLimit),
      outstanding,
      buckets,
      status: ['Active', 'OnHold', 'Blocked', 'Lead'].includes(status) ? status : 'Active',
      agentId: '',
      mtdSales,
      lastOrderDays: lastInv ? daysSince(lastInv) : 999,
    };
  });

  // ── products with MTD sales and stock ────────────────────────────────────
  const soldQty = new Map<string, number>();
  const soldVal = new Map<string, number>();
  for (const inv of invoices) {
    if ((ymd(inv.invoiceDate) ?? '') < mtdStart) continue;
    for (const it of Array.isArray(inv.items) ? inv.items : []) {
      const pid = String(it.productId ?? it.product?.id ?? '');
      soldQty.set(pid, (soldQty.get(pid) ?? 0) + num(it.quantity ?? it.qty));
      soldVal.set(pid, (soldVal.get(pid) ?? 0) + num(it.total ?? it.lineTotal ?? num(it.quantity) * num(it.unitPrice ?? it.rate)));
    }
  }
  const stockByProduct = new Map<string, number>();
  for (const s of fg) {
    const pid = String(s.productItemId ?? s.product?.id ?? '');
    stockByProduct.set(pid, (stockByProduct.get(pid) ?? 0) + num(s.onHandQty));
  }
  const productsOut: Product[] = productsRaw.map((p) => {
    const pid = String(p.id);
    const stocks: any[] = Array.isArray(p.finishedGoodsStocks) ? p.finishedGoodsStocks : [];
    return {
      name: p.productName,
      category: p.category?.name ?? 'Other',
      mtdQty: soldQty.get(pid) ?? 0,
      mtdValue: soldVal.get(pid) ?? 0,
      stock: stockByProduct.get(pid) ?? stocks.reduce((s, x) => s + num(x.onHandQty), 0),
      minStock: num(p.minimumQty) * 10 || 50,
      uom: p.uom?.uomName ?? 'Unit',
    };
  });

  // ── pipeline ─────────────────────────────────────────────────────────────
  const stage = (statuses: string[], label: string) => {
    const rows = orders.filter((o) => statuses.includes(String(o.status)));
    return { label, value: rows.length, amount: rows.reduce((s, o) => s + num(o.netAmount), 0) };
  };
  const orderFunnel = [
    stage(['DRAFT'], 'Draft (from field)'),
    stage(['PENDING_CUSTOMER_APPROVAL', 'QUOTATION_IN_PROGRESS'], 'Pending approval'),
    stage(['CONFIRMED', 'CUSTOMER_APPROVED', 'QUOTATION_COMPLETED'], 'Confirmed'),
    stage(['IN_PRODUCTION', 'READY_FOR_DISPATCH', 'PLANNED'], 'Ready / in production'),
    stage(['DISPATCHED', 'PARTIALLY_DISPATCHED'], 'Dispatched'),
    { label: 'Invoiced (MTD)', value: invoices.filter((i) => (ymd(i.invoiceDate) ?? '') >= mtdStart).length, amount: invoices.filter((i) => (ymd(i.invoiceDate) ?? '') >= mtdStart).reduce((s, i) => s + num(i.grandTotal), 0) },
  ];

  // ── production (TV summary) ──────────────────────────────────────────────
  const prod = tv?.production ?? {};
  const lines = (prod.lines ?? []) as { name: string; pct: number; status: string }[];
  const production: Dataset['production'] = {
    plansToday: lines.length,
    planned: num(prod.planned),
    produced: num(prod.produced),
    uom: 'units',
    machinesRunning: lines.filter((l) => l.pct > 0 && l.pct < 100).length,
    machinesTotal: lines.length,
    lines: lines.map((l) => ({ product: l.name, target: 100, done: Math.min(100, num(l.pct)), status: num(l.pct) >= 100 ? 'COMPLETED' : num(l.pct) < 75 ? 'DELAYED' : 'IN_PROGRESS' })),
  };

  const rawMaterials = rm.map((s) => ({ name: s.rawMaterial?.materialName ?? s.materialName ?? 'Material', onHand: num(s.onHandQty), reorder: num(s.rawMaterial?.reorderLevel ?? s.reorderLevel ?? s.rawMaterial?.minimumStock), uom: s.rawMaterial?.baseUom ?? s.baseUom ?? '' })).filter((r) => r.name).slice(0, 12);

  const openPOs = posRaw.filter((p) => !['COMPLETED', 'CLOSED', 'CANCELLED', 'RECEIVED'].includes(String(p.status).toUpperCase()));
  const purchases: Dataset['purchases'] = {
    openPOs: openPOs.length,
    openValue: openPOs.reduce((s, p) => s + num(p.netAmount ?? p.grandTotal), 0),
    overdueDeliveries: openPOs.filter((p) => p.expectedDeliveryDate && new Date(p.expectedDeliveryDate) < new Date()).length,
    list: openPOs.slice(0, 8).map((p) => {
      const due = ymd(p.expectedDeliveryDate ?? p.deliveryDate);
      const late = due ? daysSince(due) : 0;
      return { po: p.poNumber, supplier: p.supplier?.displayName ?? p.supplier?.legalName ?? 'Supplier', value: num(p.netAmount ?? p.grandTotal), due: due ? (new Date(due) < new Date() ? `Overdue ${late}d` : `Due ${due.slice(5)}`) : 'No date', status: String(p.status) };
    }),
  };

  const todayYmd = new Date().toISOString().slice(0, 10);
  const pendingGate = dispatchesRaw.filter((d) => String(d.status) === 'PENDING_GATE_APPROVAL');
  const pendingStore = dispatchesRaw.filter((d) => /STORE/.test(String(d.status)));
  const dispatches: Dataset['dispatches'] = {
    pendingGate: pendingGate.length,
    pendingStore: pendingStore.length,
    todayDispatched: dispatchesRaw.filter((d) => ymd(d.dispatchDate) === todayYmd && !/PENDING/.test(String(d.status))).length,
    list: [...pendingGate, ...pendingStore].slice(0, 8).map((d) => ({ no: d.dispatchNumber, vehicle: d.vehicleNumber ?? '', items: Array.isArray(d.items) ? d.items.length : num(d._count?.items), status: String(d.status), since: `${Math.round((Date.now() - new Date(d.createdAt).getTime()) / 60000)} min` })),
  };

  const expMtd = expensesRaw.filter((e) => (ymd(e.date) ?? '') >= mtdStart);
  const byCat = new Map<string, number>();
  expMtd.forEach((e) => byCat.set(e.expenseCategory || 'Other', (byCat.get(e.expenseCategory || 'Other') ?? 0) + num(e.amount)));
  const expenses: Dataset['expenses'] = { mtd: expMtd.reduce((s, e) => s + num(e.amount), 0), budget: 0, byCategory: [...byCat.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6) };

  const bank: Dataset['bank'] = { cash: num(acct?.totalCashInHand), bank: num(acct?.totalBankBalance), chequesInHand, chequesValue, pdcValue: 0, payablesDue7d: num(acct?.totalPayable) };

  // ── attention: TV alerts + accounts alerts + derived ─────────────────────
  const sev = (lvl: string): Attention['severity'] => (/CRITICAL|danger/i.test(lvl) ? 'critical' : /HIGH|warn/i.test(lvl) ? 'serious' : /MEDIUM/i.test(lvl) ? 'warning' : 'info');
  const attention: Attention[] = [];
  (tv?.alerts ?? []).forEach((a: any, i: number) => attention.push({ id: `tv${i}`, kind: /stock|material|inventory/i.test(a.text) ? 'STOCK' : /dispatch/i.test(a.text) ? 'DISPATCH' : /receiv|overdue|payment/i.test(a.text) ? 'CREDIT' : 'APPROVAL', title: a.text, detail: 'From the ERP wall display', severity: sev(a.level), since: 'now' }));
  (acct?.alerts ?? []).forEach((a: any, i: number) => attention.push({ id: `ac${i}`, kind: 'CREDIT', title: a.message, detail: (a.details ?? []).map((d: any) => `${d.name} ${d.amount}`).join(' · ') || 'Accounts', severity: sev(a.level), since: 'now' }));
  orders.filter((o) => String(o.status) === 'PENDING_CUSTOMER_APPROVAL').slice(0, 5).forEach((o) => attention.push({ id: `so${o.id}`, kind: 'APPROVAL', title: `Order ${o.orderNo} · ${o.customer?.displayName ?? o.customer?.firmName ?? ''}`, detail: 'Awaiting approval', amount: num(o.netAmount), severity: 'warning', since: `${daysSince(ymd(o.orderDate))} d` }));
  purchases.list.filter((p) => p.due.startsWith('Overdue')).forEach((p) => attention.push({ id: `po${p.po}`, kind: 'PURCHASE', title: `${p.po} delivery overdue`, detail: `${p.supplier} · ${p.due}`, amount: p.value, severity: 'serious', since: p.due.replace('Overdue ', '') }));
  if (pendingGate.length) attention.push({ id: 'gate', kind: 'DISPATCH', title: `${pendingGate.length} dispatch${pendingGate.length > 1 ? 'es' : ''} waiting at gate`, detail: pendingGate.map((d) => d.vehicleNumber).filter(Boolean).join(', '), severity: 'warning', since: dispatches.list[0]?.since ?? 'now' });
  customers.filter((c) => c.status === 'Blocked' || c.buckets[3] > 0).slice(0, 4).forEach((c) => attention.push({ id: `cr${c.id}`, kind: 'CREDIT', title: `${c.name} ${c.status === 'Blocked' ? 'blocked' : 'has dues over 90 days'}`, detail: `Outstanding ${Math.round(c.outstanding).toLocaleString('en-IN')}`, amount: c.outstanding, severity: c.status === 'Blocked' ? 'critical' : 'serious', since: '90 d+' }));
  const rank = { critical: 0, serious: 1, warning: 2, info: 3 };
  attention.sort((a, b) => rank[a.severity] - rank[b.severity]);

  // ── field team (mobile extension only) ───────────────────────────────────
  let agents: Agent[] = [];
  if (fieldAvailable) {
    const team = await get<any>('/mobile/admin/team');
    agents = firstArray(team, ['agents']).map((a) => ({
      id: String(a.userId ?? a.id),
      name: a.fullName ?? a.name ?? 'Agent',
      area: a.area ?? a.routeName ?? '',
      target: num(a.target),
      salesTarget: num(a.salesTarget),
      mtdCollected: num(a.mtdCollected),
      mtdSales: num(a.mtdSales),
      todayCollected: num(a.todayCollected),
      todayOrders: num(a.todayOrders),
      visitsPlanned: num(a.visitsPlanned),
      visitsDone: num(a.visitsDone),
      productive: num(a.productive),
      cashInHand: num(a.cashInHand),
      pendingSync: num(a.pendingSync),
      lastSyncMinutes: num(a.lastSyncMinutes ?? 9999),
      dayStarted: !!a.dayStarted,
      dayStartedAt: a.dayStartedAt ?? '',
      promisesOpen: num(a.promisesOpen),
      promisesBroken: num(a.promisesBroken),
      route: Array.isArray(a.route) ? a.route : [],
    }));
  }

  const comp = Array.isArray(company) ? company[0] : company;
  return { source: 'live', generatedAt: Date.now(), days, customers, agents, products: productsOut, orderFunnel, production, rawMaterials, purchases, dispatches, expenses, bank, attention, fieldAvailable, company: comp?.companyName ?? null };
}
