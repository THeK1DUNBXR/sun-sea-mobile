/**
 * Builds the Insights dataset from the live Sun Sea ERP (Railway deployment).
 *
 * Sources, in priority order: the TV summary and accounts summary the web wall
 * uses, the receivable summaries (one row per customer, from the ledger), then
 * the list endpoints for invoices, orders, receipt vouchers, products, stock,
 * purchases, dispatches, expenses and the company. Feeds run three at a time
 * (see feeds.ts); a failing feed is served from its last good response and is
 * reported in `dataset.feeds` so the app can say exactly what is missing.
 *
 * Dates: the ERP stores business dates as date-only columns (midnight UTC) and
 * timestamps in UTC. Day buckets are keyed on the phone's local calendar day
 * so "today" is today in India, not in UTC.
 */
import type { Agent, Attention, Customer, Dataset, Day, Product } from './types';
import { rows, runFeeds, type FeedDef, type FeedStatus } from './feeds';

// ─── helpers ───────────────────────────────────────────────────────────────
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day of a Date. */
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Calendar day of an ERP value: date-only columns keep their printed date, timestamps convert to local time. */
export const ymd = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(v);
    if (m) return m[1];
  }
  const t = new Date(v as string);
  return isNaN(t.getTime()) ? null : localKey(t);
};
const localDaysAgo = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
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
const modeOf = (text: string): 'cash' | 'upi' | 'cheque' | 'neft' => {
  const t = text.toLowerCase();
  if (/cheque|chq/.test(t)) return 'cheque';
  if (/upi|gpay|phonepe|paytm/.test(t)) return 'upi';
  if (/neft|rtgs|imps|bank|transfer/.test(t)) return 'neft';
  return 'cash';
};
const daysSince = (d: string | null) => (d ? Math.max(0, Math.round((localDaysAgo(0).getTime() - new Date(d).getTime()) / 86400000)) : 0);
const bucketOf = (ageDays: number) => (ageDays <= 30 ? 0 : ageDays <= 60 ? 1 : ageDays <= 90 ? 2 : 3);

/** Zero dataset shown while the first live load is in flight (never demo figures under a LIVE badge). */
export function emptyDataset(): Dataset {
  const days: Day[] = Array.from({ length: 60 }, (_, i) => ({ date: localDaysAgo(59 - i), invoiced: 0, collected: 0, orders: 0, orderValue: 0, cash: 0, upi: 0, cheque: 0, neft: 0 }));
  return {
    source: 'live',
    generatedAt: 0,
    days,
    customers: [],
    agents: [],
    products: [],
    orderFunnel: [],
    production: { plansToday: 0, planned: 0, produced: 0, uom: 'units', machinesRunning: 0, machinesTotal: 0, lines: [] },
    rawMaterials: [],
    purchases: { openPOs: 0, openValue: 0, overdueDeliveries: 0, list: [] },
    dispatches: { pendingGate: 0, pendingStore: 0, todayDispatched: 0, list: [] },
    expenses: { mtd: 0, budget: 0, byCategory: [] },
    bank: { cash: 0, bank: 0, chequesInHand: 0, chequesValue: 0, pdcValue: 0, payablesDue7d: 0 },
    attention: [],
    fieldAvailable: false,
    company: null,
    feeds: [],
  };
}

// ─── feed definitions ──────────────────────────────────────────────────────
export function liveFeeds(fieldAvailable: boolean): FeedDef[] {
  const since = localKey(localDaysAgo(59));
  const defs: FeedDef[] = [
    { name: 'tv', label: 'TV wall summary', url: '/dashboard/tv-summary' },
    { name: 'acct', label: 'Accounts summary', url: '/dashboard/accounts-summary', params: { period: 'month' } },
    { name: 'receivable', label: 'Receivable by customer', url: '/accounts/receivable' },
    { name: 'invoices', label: 'Sales invoices (60 d)', url: '/sales-invoices', params: { page: 1, pageSize: 500, fromDate: since }, arrayKeys: ['data', 'invoices'], maxPages: 4 },
    { name: 'receipts', label: 'Receipt vouchers (60 d)', url: '/vouchers', params: { type: 'RECEIPT', startDate: since, limit: 1000 }, arrayKeys: ['vouchers'] },
    { name: 'orders', label: 'Sales orders', url: '/sales-orders', params: { page: 1, pageSize: 500 }, arrayKeys: ['data', 'orders'], maxPages: 2 },
    { name: 'products', label: 'Products', url: '/products', arrayKeys: ['products', 'data'] },
    { name: 'fgStock', label: 'Finished goods stock', url: '/finished-goods-stocks', params: { page: 1, limit: 500 }, arrayKeys: ['data', 'stocks'] },
    { name: 'rmStock', label: 'Raw material stock', url: '/raw-material-stocks', params: { page: 1, limit: 200 }, arrayKeys: ['data', 'stocks'] },
    { name: 'pos', label: 'Purchase orders', url: '/purchase-orders', params: { page: 1, pageSize: 100 }, arrayKeys: ['data', 'purchaseOrders'] },
    { name: 'dispatches', label: 'Goods dispatches', url: '/goods-dispatches', params: { page: 1, limit: 100 }, arrayKeys: ['data', 'dispatches'] },
    { name: 'expenses', label: 'Expenses', url: '/expenses', params: { page: 1, limit: 500 }, arrayKeys: ['data', 'expenses'] },
    { name: 'company', label: 'Company', url: '/companies' },
    // Last on purpose: the ERP computes a ledger balance per customer inside this call, so keep the page small.
    { name: 'customers', label: 'Customer master (top 100)', url: '/customers', params: { page: 1, limit: 100 }, arrayKeys: ['customers'] },
  ];
  if (fieldAvailable) defs.push({ name: 'team', label: 'Field team (mobile extension)', url: '/mobile/admin/team', arrayKeys: ['agents'] });
  return defs;
}

// ─── loader ────────────────────────────────────────────────────────────────
export async function loadLiveDataset(fieldAvailable: boolean, onProgress?: (done: number, total: number) => void): Promise<Dataset> {
  const defs = liveFeeds(fieldAvailable);
  const results = await runFeeds(defs, 3, onProgress);
  const feeds: FeedStatus[] = defs.map((d) => results.get(d.name)!.status);
  const data = (name: string) => results.get(name)?.data ?? null;
  const list = (name: string, keys?: string[]) => rows(data(name), keys ?? defs.find((d) => d.name === name)?.arrayKeys);

  const tv: any = data('tv');
  const acct: any = data('acct');
  const receivableRaw = list('receivable');
  const invoices = list('invoices').filter((i) => String(i.status ?? '').toUpperCase() !== 'CANCELLED');
  const receiptsRaw = list('receipts');
  const orders = list('orders');
  const productsRaw = list('products');
  const fg = list('fgStock');
  const rm = list('rmStock');
  const posRaw = list('pos');
  const dispatchesRaw = list('dispatches');
  const expensesRaw = list('expenses');
  const customersRaw = list('customers');
  const companyRaw: any = data('company');

  const todayKey = localKey(localDaysAgo(0));
  const mtdStart = localKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // ── 60 days of daily figures, keyed on the local calendar day ────────────
  const dayMap = new Map<string, Day>();
  for (let i = 59; i >= 0; i--) {
    const date = localDaysAgo(i);
    dayMap.set(localKey(date), { date, invoiced: 0, collected: 0, orders: 0, orderValue: 0, cash: 0, upi: 0, cheque: 0, neft: 0 });
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
    const amount = items.reduce((s, it) => s + num(it.debitAmount), 0) || num(v.amount) || num(v.totalAmount);
    const mode = modeOf(`${v.narration ?? ''} ${items.map((it) => `${it.narration ?? ''} ${it.debitLedger?.name ?? it.ledger?.name ?? ''}`).join(' ')}`);
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

  // ── customers: receivable summaries are the master (every customer, ledger balance) ──
  const invByCustomer = new Map<string, any[]>();
  invoices.forEach((i) => invByCustomer.set(String(i.customerId), [...(invByCustomer.get(String(i.customerId)) ?? []), i]));
  const master = new Map<string, any>(customersRaw.map((c) => [String(c.id), c]));
  const seen = new Set<string>();
  const customers: Customer[] = [];
  const pushCustomer = (id: string, r: any | null, c: any | null) => {
    if (seen.has(id)) return;
    seen.add(id);
    const outstanding = Math.max(0, num(r?.netBalance ?? c?.netBalance ?? c?.outstandingAmount));
    const buckets: [number, number, number, number] = [0, 0, 0, 0];
    let explained = 0;
    for (const inv of invByCustomer.get(id) ?? []) {
      const bal = Math.max(0, num(inv.grandTotal) - paymentsOf(inv.payments).reduce((s, p) => s + num(p.amount), 0));
      if (bal <= 0) continue;
      const take = Math.min(bal, Math.max(0, outstanding - explained));
      buckets[bucketOf(daysSince(ymd(inv.dueDate) ?? ymd(inv.invoiceDate)))] += take;
      explained += take;
    }
    // Whatever the 60-day invoices do not explain: use the ledger's own overdue figure and age, else current.
    const rest = Math.max(0, outstanding - explained);
    const overdue = Math.min(rest, Math.max(0, num(r?.overdueAmount)));
    if (overdue > 0) buckets[bucketOf(Math.max(31, num(r?.dueDays)))] += overdue;
    buckets[0] += rest - overdue;
    const mine = invByCustomer.get(id) ?? [];
    const mtdSales = mine.filter((i) => (ymd(i.invoiceDate) ?? '') >= mtdStart).reduce((s, i) => s + num(i.grandTotal), 0);
    const lastInv = mine.map((i) => ymd(i.invoiceDate) ?? '').sort().pop() ?? null;
    const status = (c?.status as Customer['status']) || 'Active';
    customers.push({
      id,
      name: c?.displayName || c?.firmName || r?.firmName || `Customer ${id.slice(0, 6)}`,
      city: c?.addresses?.[0]?.address?.city ?? c?.city ?? '—',
      grade: c?.customerGrade?.name === 'Grade A' ? 'Grade A' : 'Grade B',
      creditLimit: num(c?.creditLimit),
      outstanding,
      buckets,
      status: ['Active', 'OnHold', 'Blocked', 'Lead'].includes(status) ? status : 'Active',
      agentId: '',
      mtdSales,
      lastOrderDays: lastInv ? daysSince(lastInv) : 999,
    });
  };
  for (const r of receivableRaw) pushCustomer(String(r.customerId), r, master.get(String(r.customerId)) ?? null);
  for (const c of customersRaw) pushCustomer(String(c.id), null, c);

  // ── products with MTD sales and stock ────────────────────────────────────
  const soldQty = new Map<string, number>();
  const soldVal = new Map<string, number>();
  for (const inv of invoices) {
    if ((ymd(inv.invoiceDate) ?? '') < mtdStart) continue;
    for (const it of Array.isArray(inv.items) ? inv.items : []) {
      const pid = String(it.productId ?? it.product?.id ?? '');
      soldQty.set(pid, (soldQty.get(pid) ?? 0) + num(it.quantity ?? it.qty));
      soldVal.set(pid, (soldVal.get(pid) ?? 0) + num(it.total ?? it.lineTotal ?? it.taxableAmount ?? num(it.quantity) * num(it.unitPrice ?? it.rate)));
    }
  }
  const stockByProduct = new Map<string, number>();
  for (const s of fg) {
    const pid = String(s.productItemId ?? s.product?.id ?? '');
    stockByProduct.set(pid, (stockByProduct.get(pid) ?? 0) + num(s.onHandQty));
  }
  const products: Product[] = productsRaw.map((p) => {
    const pid = String(p.id);
    const stocks: any[] = Array.isArray(p.finishedGoodsStocks) ? p.finishedGoodsStocks : [];
    return {
      name: p.productName ?? p.name ?? 'Product',
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
    const rs = orders.filter((o) => statuses.includes(String(o.status)));
    return { label, value: rs.length, amount: rs.reduce((s, o) => s + num(o.netAmount), 0) };
  };
  const mtdInvoices = invoices.filter((i) => (ymd(i.invoiceDate) ?? '') >= mtdStart);
  const orderFunnel = [
    stage(['DRAFT'], 'Draft (from field)'),
    stage(['PENDING_CUSTOMER_APPROVAL', 'QUOTATION_IN_PROGRESS'], 'Pending approval'),
    stage(['CONFIRMED', 'CUSTOMER_APPROVED', 'QUOTATION_COMPLETED'], 'Confirmed'),
    stage(['IN_PRODUCTION', 'READY_FOR_DISPATCH', 'PLANNED'], 'Ready / in production'),
    stage(['DISPATCHED', 'PARTIALLY_DISPATCHED'], 'Dispatched'),
    { label: 'Invoiced (MTD)', value: mtdInvoices.length, amount: mtdInvoices.reduce((s, i) => s + num(i.grandTotal), 0) },
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

  const rawMaterials = rm
    .map((s) => ({ name: s.rawMaterial?.materialName ?? s.materialName ?? s.rawMaterial?.name ?? '', onHand: num(s.onHandQty), reorder: num(s.rawMaterial?.reorderLevel ?? s.reorderLevel ?? s.rawMaterial?.minimumStock), uom: s.rawMaterial?.baseUom ?? s.baseUom ?? '' }))
    .filter((r) => r.name)
    .sort((a, b) => a.onHand / Math.max(1, a.reorder) - b.onHand / Math.max(1, b.reorder))
    .slice(0, 12);

  const openPOs = posRaw.filter((p) => !['COMPLETED', 'CLOSED', 'CANCELLED', 'RECEIVED'].includes(String(p.status).toUpperCase()));
  const purchases: Dataset['purchases'] = {
    openPOs: openPOs.length,
    openValue: openPOs.reduce((s, p) => s + num(p.netAmount ?? p.grandTotal ?? p.totalAmount), 0),
    overdueDeliveries: openPOs.filter((p) => p.expectedDeliveryDate && (ymd(p.expectedDeliveryDate) ?? '') < todayKey).length,
    list: openPOs.slice(0, 8).map((p) => {
      const due = ymd(p.expectedDeliveryDate ?? p.deliveryDate);
      const late = due ? daysSince(due) : 0;
      return {
        po: p.poNumber ?? p.poNo ?? '',
        supplier: p.supplier?.supplierName ?? p.supplier?.displayName ?? p.supplier?.legalName ?? 'Supplier',
        value: num(p.netAmount ?? p.grandTotal ?? p.totalAmount),
        due: due ? (due < todayKey ? `Overdue ${late}d` : `Due ${due.slice(5)}`) : 'No date',
        status: String(p.status),
      };
    }),
  };

  const pendingGate = dispatchesRaw.filter((d) => String(d.status) === 'PENDING_GATE_APPROVAL');
  const pendingStore = dispatchesRaw.filter((d) => /STORE/.test(String(d.status)));
  const dispatches: Dataset['dispatches'] = {
    pendingGate: pendingGate.length,
    pendingStore: pendingStore.length,
    todayDispatched: dispatchesRaw.filter((d) => ymd(d.dispatchDate) === todayKey && !/PENDING/.test(String(d.status))).length,
    list: [...pendingGate, ...pendingStore].slice(0, 8).map((d) => ({ no: d.dispatchNumber ?? d.dispatchNo ?? '', vehicle: d.vehicleNumber ?? '', items: Array.isArray(d.items) ? d.items.length : num(d._count?.items), status: String(d.status), since: `${Math.max(0, Math.round((Date.now() - new Date(d.createdAt).getTime()) / 60000))} min` })),
  };

  const expMtd = expensesRaw.filter((e) => (ymd(e.date ?? e.expenseDate) ?? '') >= mtdStart);
  const byCat = new Map<string, number>();
  expMtd.forEach((e) => {
    const cat = e.expenseCategory || e.category?.name || e.category || 'Other';
    byCat.set(cat, (byCat.get(cat) ?? 0) + num(e.amount));
  });
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
  customers
    .filter((c) => c.status === 'Blocked' || c.buckets[3] > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 4)
    .forEach((c) => attention.push({ id: `cr${c.id}`, kind: 'CREDIT', title: `${c.name} ${c.status === 'Blocked' ? 'blocked' : 'has dues over 90 days'}`, detail: `Outstanding ${Math.round(c.outstanding).toLocaleString('en-IN')}`, amount: c.outstanding, severity: c.status === 'Blocked' ? 'critical' : 'serious', since: '90 d+' }));
  const failed = feeds.filter((f) => !f.ok);
  if (failed.length) attention.push({ id: 'feeds', kind: 'APPROVAL', title: `${failed.length} data feed${failed.length > 1 ? 's' : ''} did not load`, detail: failed.map((f) => `${f.label}: ${f.error}`).join(' · '), severity: 'info', since: 'now' });
  const rank = { critical: 0, serious: 1, warning: 2, info: 3 };
  attention.sort((a, b) => rank[a.severity] - rank[b.severity]);

  // ── field team (mobile extension only) ───────────────────────────────────
  const agents: Agent[] = list('team').map((a) => ({
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

  const comp = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
  return { source: 'live', generatedAt: Date.now(), days, customers, agents, products, orderFunnel, production, rawMaterials, purchases, dispatches, expenses, bank, attention, fieldAvailable, company: comp?.companyName ?? comp?.name ?? null, feeds };
}
