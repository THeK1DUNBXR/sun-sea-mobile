/**
 * Direct-ERP adapter: lets the app work against a plain Sun Sea ERP (such as
 * the Railway deployment) that does not have the mobile extension installed.
 *
 * It presents the same surface as `mobileApi`, built from the ERP's own
 * endpoints:
 *   pull  → /customers, /sales-invoices, /products, /companies
 *   push  → collections become RECEIPT vouchers (Cash/Bank ledger ← customer
 *           ledger) tagged with the collection id for idempotency; orders
 *           become DRAFT sales orders with the agent as source.
 * Routes, visits, follow-ups, day sessions, expenses, handovers and leads are
 * device-only in this mode (no server table exists for them).
 */
import { ApiError, http, unwrap } from './client';
import type { Bootstrap, ChequeFields, CustomerStatement, LoginResponse, PullResponse, PushResults, StoredAttachment } from './types';
import type { ApiSurface } from './surface';

// ─── helpers ────────────────────────────────────────────────────────────────
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const ms = (d: unknown): number => (d ? new Date(d as string).getTime() || 0 : 0);
export const ymd = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export const paymentsOf = (raw: unknown): { amount: number }[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as { amount: number }[];
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

/** Customer.mobile is a free-form JSON column — normalise to one string. */
export const primaryMobile = (raw: unknown): string | null => {
  if (!raw) return null;
  if (typeof raw === 'string') return raw || null;
  if (Array.isArray(raw)) {
    const first = raw.find((x) => x);
    return first ? (typeof first === 'string' ? first : primaryMobile(first)) : null;
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const k of ['primary', 'mobile', 'number', 'phone', 'value']) if (typeof o[k] === 'string' && (o[k] as string).trim()) return o[k] as string;
    const s = Object.values(o).find((v) => typeof v === 'string' && (v as string).trim());
    return (s as string) || null;
  }
  return null;
};

/** The ERP wraps lists differently per module; find the first array in the envelope. */
const firstArray = (data: unknown, preferred: string[] = []): Record<string, unknown>[] => {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of preferred) if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    for (const v of Object.values(o)) if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
};

// ─── mappers (ERP JSON → app wire rows) ─────────────────────────────────────
export function mapCustomer(c: Record<string, any>) {
  const addresses: any[] = Array.isArray(c.addresses) ? c.addresses : [];
  const addr = addresses.find((a) => a.is_default) || addresses[0] || null;
  const a = (addr?.address || {}) as Record<string, any>;
  const line = [a.addressLine1, a.addressLine2].filter(Boolean).join(', ');
  // netBalance comes from the ledger (includes receipts posted as vouchers); fall back to the column.
  const net = c.netBalance !== undefined ? num(c.netBalance) : num(c.outstandingAmount);
  return {
    id: String(c.id),
    customer_code: String(c.customerCode ?? ''),
    firm_name: String(c.firmName ?? ''),
    display_name: c.displayName ?? null,
    mobile: primaryMobile(c.mobile),
    email: c.email ?? null,
    gstin: c.gstin ?? null,
    address_line: line || null,
    city: a.city ?? null,
    state: a.state ?? addr?.state_code ?? null,
    pincode: a.pincode ?? null,
    credit_limit: num(c.creditLimit),
    credit_days: c.creditDays ?? null,
    outstanding: round2(Math.max(0, net)),
    grade_name: c.customerGrade?.name ?? null,
    type_name: c.customerType?.name ?? null,
    status: String(c.status ?? 'Active'),
    updated_at: ms(c.updatedAt) || Date.now(),
  };
}

export function mapInvoice(inv: Record<string, any>) {
  const amount = num(inv.grandTotal ?? inv.subTotal);
  const paid = round2(paymentsOf(inv.payments).reduce((s, p) => s + num(p.amount), 0));
  const balance = Math.max(0, round2(amount - paid));
  const status = balance <= 0 && amount > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
  return {
    id: String(inv.id),
    invoice_no: String(inv.invoiceNo ?? ''),
    customer_id: String(inv.customerId ?? inv.customer?.id ?? ''),
    invoice_date: ymd(inv.invoiceDate) || ymd(inv.createdAt) || '',
    due_date: ymd(inv.dueDate),
    grand_total: amount,
    paid_amount: paid,
    balance,
    status,
    updated_at: ms(inv.updatedAt) || Date.now(),
  };
}

/**
 * Receipts posted as vouchers reduce the customer's ledger balance but not the
 * invoice's own `payments`. Bring invoice balances in line with the ledger by
 * clearing the oldest invoices first (FIFO), so the app never shows more open
 * on invoices than the customer actually owes.
 */
export function reconcileInvoiceBalances<T extends { invoice_date: string; balance: number; paid_amount: number; grand_total: number; status: string }>(invoices: T[], ledgerOutstanding: number): T[] {
  const sorted = [...invoices].sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
  let excess = round2(sorted.reduce((s, i) => s + i.balance, 0) - Math.max(0, ledgerOutstanding));
  if (excess <= 0.009) return invoices;
  for (const inv of sorted) {
    if (excess <= 0.009) break;
    const cut = Math.min(inv.balance, excess);
    inv.balance = round2(inv.balance - cut);
    inv.paid_amount = round2(inv.paid_amount + cut);
    inv.status = inv.balance <= 0 ? 'PAID' : 'PARTIAL';
    excess = round2(excess - cut);
  }
  return invoices;
}

export function mapProduct(p: Record<string, any>) {
  const images: any[] = Array.isArray(p.images) ? p.images : [];
  const img = images.find((i) => i.isPrimary) || images[0];
  const stocks: any[] = Array.isArray(p.finishedGoodsStocks) ? p.finishedGoodsStocks : [];
  return {
    id: String(p.id),
    product_code: String(p.productCode ?? ''),
    product_name: String(p.productName ?? ''),
    uom: p.uom?.uomName ?? p.uom?.uomCode ?? null,
    rate: num(p.rate),
    grade_rates: JSON.stringify(p.gradeRates ?? {}),
    category: p.category?.name ?? null,
    is_active: p.isActive !== false,
    image_url: img?.imageUrl ?? null,
    on_hand_qty: stocks.length ? round2(stocks.reduce((s, x) => s + num(x.onHandQty), 0)) : null,
    min_qty: Math.max(0, num(p.minimumQty)),
    updated_at: ms(p.updatedAt) || Date.now(),
  };
}

// ─── paging over the ERP ─────────────────────────────────────────────────────
async function allCustomers() {
  const out: Record<string, any>[] = [];
  for (let page = 1; page <= 50; page++) {
    const data = unwrap<any>(await http.get('/customers', { params: { page, limit: 200 } }));
    const rows = firstArray(data, ['customers', 'data', 'items']);
    out.push(...rows);
    const totalPages = num(data?.totalPages ?? data?.pagination?.totalPages);
    if (!rows.length || (totalPages && page >= totalPages) || rows.length < 200) break;
  }
  return out;
}

async function allInvoices() {
  const out: Record<string, any>[] = [];
  for (let page = 1; page <= 100; page++) {
    const data = unwrap<any>(await http.get('/sales-invoices', { params: { page, pageSize: 200 } }));
    const rows = firstArray(data, ['invoices', 'data', 'items']);
    out.push(...rows);
    const total = num(data?.total ?? data?.pagination?.total ?? data?.pagination?.totalItems);
    if (!rows.length || rows.length < 200 || (total && out.length >= total)) break;
  }
  return out;
}

// ─── ledgers for receipt posting ─────────────────────────────────────────────
interface Ledger {
  id: number;
  code?: string;
  name?: string;
  group?: string;
  customerId?: string | null;
}
const ledgerCache = new Map<string, Ledger>();

async function customerLedger(customerId: string, customerCode: string, firmName: string): Promise<Ledger> {
  const cached = ledgerCache.get(customerId);
  if (cached) return cached;
  for (const search of [customerCode, firmName]) {
    if (!search) continue;
    const res = await http.get('/accounts/ledgers', { params: { search, limit: 50 } });
    const rows = firstArray(res.data?.data ?? res.data, ['ledgers']) as unknown as Ledger[];
    const hit = rows.find((l) => String(l.customerId ?? '') === customerId);
    if (hit) {
      ledgerCache.set(customerId, hit);
      return hit;
    }
  }
  throw new ApiError(422, `No receivable ledger found for ${firmName}. Open the customer once in the ERP to create it.`);
}

async function moneyLedger(mode: string): Promise<Ledger> {
  const key = `__money_${mode}`;
  const cached = ledgerCache.get(key);
  if (cached) return cached;
  const data = unwrap<any>(await http.get('/accounts/bank-accounts'));
  const accounts = firstArray(data, ['accounts']) as unknown as Ledger[];
  const isCash = (l: Ledger) => /cash/i.test(`${l.group ?? ''} ${l.name ?? ''} ${l.code ?? ''}`) && !/petty/i.test(l.name ?? '');
  const isBank = (l: Ledger) => /bank/i.test(`${l.group ?? ''} ${l.name ?? ''} ${l.code ?? ''}`);
  const pick = mode === 'Cash' ? accounts.find((l) => l.code === 'CASH-001') || accounts.find(isCash) : accounts.find((l) => l.code === 'BANK-001') || accounts.find(isBank);
  const chosen = pick || accounts[0];
  if (!chosen) throw new ApiError(422, 'No Cash/Bank ledger exists in the ERP yet.');
  ledgerCache.set(key, chosen);
  return chosen;
}

// ─── the adapter ─────────────────────────────────────────────────────────────
type Row = Record<string, any>;

let agentName = 'Field agent';

export const erpDirect: ApiSurface = {
  mode: 'direct',
  capabilities: { attachments: false, chequeOcr: false, routes: false, statement: true },

  login: async (email, password) => {
    const res = unwrap<LoginResponse>(await http.post('/auth/login', { email, password }));
    agentName = res.user?.fullName || agentName;
    return res;
  },

  logout: async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      /* offline logout is fine */
    }
  },

  bootstrap: async () => {
    const [me, company] = await Promise.all([
      http.get('/auth/me').then((r) => unwrap<any>(r)).catch(() => null),
      http.get('/companies').then((r) => unwrap<any>(r)).catch(() => null),
    ]);
    const comp = Array.isArray(company) ? company[0] : company;
    if (me?.fullName) agentName = me.fullName;
    const boot: Bootstrap = {
      agent: {
        userId: String(me?.userId ?? me?.id ?? 'me'),
        fullName: me?.fullName ?? agentName,
        email: me?.email ?? null,
        employeeId: me?.employeeId ? String(me.employeeId) : null,
        isSuperAdmin: !!me?.isSuperAdmin,
        permissions: Array.isArray(me?.permissions) ? me.permissions : [],
      },
      company: comp ? { id: String(comp.id), companyName: comp.companyName ?? 'Sun Sea', shortName: comp.shortName ?? null, logoUrl: comp.logoUrl ?? null, currencyCode: comp.currencyCode ?? 'INR' } : null,
      settings: { orderStatusOnSubmit: 'DRAFT', paymentModes: ['Cash', 'Cheque', 'UPI', 'NEFT'], chequeOcrEnabled: false, attachmentStorage: 's3', maxAttachmentBytes: 5 * 1024 * 1024 },
      serverTime: Date.now(),
    };
    return boot;
  },

  pull: async (_lastPulledAt, _full): Promise<PullResponse> => {
    // The ERP has no "changed since" filters, so every pull is a full snapshot
    // of the three masters. Volumes are small (hundreds of rows).
    const [customers, invoices, products] = await Promise.all([allCustomers(), allInvoices(), http.get('/products').then((r) => firstArray(unwrap<any>(r), ['products']))]);
    const custRows = customers.map(mapCustomer);
    const invRows = invoices.filter((i) => String(i.status ?? '').toUpperCase() !== 'CANCELLED').map(mapInvoice);
    const byCustomer = new Map<string, ReturnType<typeof mapInvoice>[]>();
    invRows.forEach((i) => byCustomer.set(i.customer_id, [...(byCustomer.get(i.customer_id) ?? []), i]));
    custRows.forEach((c) => reconcileInvoiceBalances(byCustomer.get(c.id) ?? [], c.outstanding));
    const empty = { created: [], updated: [], deleted: [] };
    return {
      changes: {
        customers: { created: [], updated: custRows, deleted: [] },
        invoices: { created: [], updated: invRows, deleted: [] },
        products: { created: [], updated: products.map(mapProduct), deleted: [] },
        routes: empty,
        route_customers: empty,
        visits: empty,
        collections: empty,
        orders: empty,
      },
      timestamp: Date.now(),
      full: false,
    };
  },

  push: async ({ changes }) => {
    const ch = changes as Record<string, { created: Row[]; updated: Row[] }>;
    const results: PushResults = { visits: { ok: 0, failed: [] }, collections: [], orders: [] };
    const customers = new Map<string, Row>();

    const collections = [...(ch.collections?.created ?? []), ...(ch.collections?.updated ?? [])].filter((c) => c.status === 'PENDING');
    for (const c of collections) {
      try {
        const cust = customers.get(c.customer_id) ?? unwrap<Row>(await http.get(`/customers/${c.customer_id}`));
        customers.set(c.customer_id, cust);
        // Already posted? The collection id is stamped on the voucher.
        const existing = firstArray(unwrap<any>(await http.get('/vouchers', { params: { type: 'RECEIPT', search: c.id, limit: 5 } })), ['vouchers']);
        const dup = existing.find((v) => String(v.refDocId ?? '') === c.id || String(v.narration ?? '').includes(c.id));
        if (dup) {
          results.collections.push({ id: c.id, status: 'POSTED', receiptNo: String(dup.voucherNo ?? '') });
          continue;
        }
        const [debit, credit] = await Promise.all([moneyLedger(c.payment_mode), customerLedger(c.customer_id, cust.customerCode, cust.firmName)]);
        const allocations: { invoiceNo?: string; amount: number }[] = Array.isArray(c.allocations) ? c.allocations : JSON.parse(c.allocations || '[]');
        const against = allocations.length ? ` against ${allocations.map((a) => a.invoiceNo).filter(Boolean).join(', ')}` : ' on account';
        const ref = [c.payment_mode, c.reference_no, c.bank_name, c.cheque_date ? `cheque dt ${c.cheque_date}` : null].filter(Boolean).join(' · ');
        const voucher = unwrap<Row>(
          await http.post('/vouchers', {
            type: 'RECEIPT',
            date: ymd(c.collected_at) ?? ymd(Date.now()),
            narration: `Field collection by ${agentName}${against} · ${ref} · mobile:${c.id}`.slice(0, 500),
            refDocType: 'MOBILE_COLLECTION',
            refDocId: c.id,
            items: [{ debitLedgerId: debit.id, creditLedgerId: credit.id, debitAmount: num(c.amount), creditAmount: num(c.amount), narration: `Received via ${c.payment_mode}`.slice(0, 255) }],
          })
        );
        results.collections.push({ id: c.id, status: 'POSTED', receiptNo: String(voucher.voucherNo ?? voucher.id ?? '') });
      } catch (e) {
        const err = e as ApiError;
        // A unique-constraint violation on (refDocType, refDocId) means it was posted on an earlier attempt.
        if (/unique|already exists|duplicate/i.test(err.message)) results.collections.push({ id: c.id, status: 'POSTED' });
        else results.collections.push({ id: c.id, status: 'FAILED', error: err.message || 'Could not post receipt' });
      }
    }

    const orders = [...(ch.orders?.created ?? []), ...(ch.orders?.updated ?? [])].filter((o) => o.status === 'PENDING');
    for (const o of orders) {
      try {
        const next = unwrap<any>(await http.get('/sales-orders/next-code'));
        const orderNo: string = typeof next === 'string' ? next : next?.nextCode ?? next?.orderNo;
        const items: { productId: string; quantity: number }[] = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
        const created = unwrap<Row>(
          await http.post('/sales-orders', {
            orderNo,
            orderDate: o.order_date,
            customerId: o.customer_id,
            orderSource: 'SALES_PERSON',
            salesPersonName: agentName,
            status: 'DRAFT',
            narration: [o.remarks, `mobile:${o.id}`].filter(Boolean).join(' · ').slice(0, 1000),
            items: items.map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
          })
        );
        results.orders.push({ id: o.id, status: 'CREATED', orderNo: String(created.orderNo ?? orderNo) });
      } catch (e) {
        results.orders.push({ id: o.id, status: 'FAILED', error: (e as ApiError).message || 'Could not create order' });
      }
    }

    results.visits.ok = (ch.visits?.created?.length ?? 0) + (ch.visits?.updated?.length ?? 0);
    return results;
  },

  uploadAttachment: async (): Promise<StoredAttachment> => {
    throw new ApiError(501, 'Photo upload needs the mobile extension on the server; photos stay on the device.');
  },

  ocrCheque: async (): Promise<ChequeFields> => {
    throw new ApiError(501, 'Cheque OCR needs the mobile extension on the server.');
  },

  customerStatement: async (customerId): Promise<CustomerStatement> => {
    const d = unwrap<any>(await http.get(`/accounts/receivable/${customerId}`));
    return {
      customer: { id: String(d.customer?.id ?? customerId), customerCode: d.customer?.customerCode ?? '', firmName: d.customer?.firmName ?? '', openingBalance: num(d.customer?.openingBalance ?? d.summary?.openingBalance) },
      summary: {
        openingBalance: num(d.summary?.openingBalance),
        totalBilled: num(d.summary?.totalBilled),
        totalPaid: num(d.summary?.totalPaid),
        totalReturned: num(d.summary?.totalReturned),
        closingBalance: num(d.summary?.closingBalance ?? d.summary?.netBalance),
      },
      invoices: (d.invoices ?? []).map((i: Row) => ({ id: String(i.id), invoiceNo: i.invoiceNo, date: i.date, dueDate: i.dueDate, amount: num(i.amount), paidAmount: num(i.paidAmount), balance: num(i.balance), status: i.status })),
      collectionHistory: (d.collectionHistory ?? []).map((h: Row) => ({ id: String(h.id ?? h.voucherId ?? h.voucherNo), voucherNo: h.voucherNo, date: h.date, amount: num(h.amount), paymentMode: h.paymentMode, referenceNo: h.referenceNo, narration: h.narration })),
    };
  },
};
