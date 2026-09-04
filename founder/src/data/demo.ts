/**
 * Deterministic demo dataset shaped like the Sun Sea ERP's own entities
 * (sales orders, invoices, receivables, vouchers, production plans, stock,
 * purchase orders, dispatches, expenses) plus the field team from the agent
 * app. Read-only — the founder monitors, the office and agents enter data.
 */
import { daysAgo } from '../format';

// Seeded PRNG so numbers are stable between launches.
let seed = 20260903;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const between = (a: number, b: number) => a + rnd() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

export interface Day {
  date: Date;
  invoiced: number;
  collected: number;
  orders: number;
  orderValue: number;
  cash: number;
  upi: number;
  cheque: number;
  neft: number;
}
export interface Customer {
  id: string;
  name: string;
  city: string;
  grade: 'Grade A' | 'Grade B';
  creditLimit: number;
  outstanding: number;
  buckets: [number, number, number, number]; // 0-30, 31-60, 61-90, 90+
  status: 'Active' | 'OnHold' | 'Blocked' | 'Lead';
  agentId: string;
  mtdSales: number;
  lastOrderDays: number;
}
export interface Agent {
  id: string;
  name: string;
  area: string;
  target: number;
  salesTarget: number;
  mtdCollected: number;
  mtdSales: number;
  todayCollected: number;
  todayOrders: number;
  visitsPlanned: number;
  visitsDone: number;
  productive: number;
  cashInHand: number;
  pendingSync: number;
  lastSyncMinutes: number;
  dayStarted: boolean;
  dayStartedAt: string;
  promisesOpen: number;
  promisesBroken: number;
  route: { customer: string; time: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED' | 'SKIPPED'; collected: number; outcome?: string }[];
}
export interface Product {
  name: string;
  category: string;
  mtdQty: number;
  mtdValue: number;
  stock: number;
  minStock: number;
  uom: string;
}
export interface Attention {
  id: string;
  kind: 'APPROVAL' | 'CREDIT' | 'HANDOVER' | 'PROMISE' | 'CHEQUE' | 'STOCK' | 'DISPATCH' | 'PURCHASE';
  title: string;
  detail: string;
  amount?: number;
  severity: 'critical' | 'serious' | 'warning' | 'info';
  since: string;
}

const CUSTOMER_NAMES = ['Sri Balaji Stores', 'Kumar Trading', 'Modern Super Market', 'Green Land Stores', 'Lakshmi Provisions', 'Annai Departmental', 'Chola Traders', 'Vel Murugan Stores', 'Amman Stores', 'Sakthi Traders', 'Bharat Provision', 'Nellai Mart', 'Kaveri Supermarket', 'Ganesh Agencies', 'Pandian Stores', 'Sri Krishna Traders', 'Meenakshi Stores', 'Arasan Provisions', 'Vasantham Mart', 'Selvam Traders', 'Ponni Stores', 'Thirumal Agencies', 'Raja Departmental', 'Deepam Stores', 'Jai Provision', 'Sundaram Traders', 'Kumaran Mart', 'Ashok Stores', 'Vijaya Provision', 'Mahalakshmi Stores', 'Nathan Traders', 'Priya Supermarket', 'Sivam Stores', 'Bala Agencies', 'Velan Mart', 'Om Sakthi Stores', 'Anand Provision', 'Saravana Traders', 'Muthu Stores', 'Ganga Supermarket'];
const CITIES = ['Chennai', 'Chennai', 'Chennai', 'Kanchipuram', 'Chengalpattu', 'Tambaram', 'Avadi', 'Tiruvallur'];

export const agents: Agent[] = [
  { id: 'a1', name: 'Arun Kumar', area: 'Chennai South', target: 350000, salesTarget: 250000, mtdCollected: 0, mtdSales: 0, todayCollected: 0, todayOrders: 0, visitsPlanned: 8, visitsDone: 5, productive: 4, cashInHand: 0, pendingSync: 0, lastSyncMinutes: 12, dayStarted: true, dayStartedAt: '08:52', promisesOpen: 3, promisesBroken: 1, route: [] },
  { id: 'a2', name: 'Priya Raman', area: 'Chennai North', target: 300000, salesTarget: 220000, mtdCollected: 0, mtdSales: 0, todayCollected: 0, todayOrders: 0, visitsPlanned: 7, visitsDone: 7, productive: 6, cashInHand: 0, pendingSync: 0, lastSyncMinutes: 4, dayStarted: true, dayStartedAt: '09:05', promisesOpen: 1, promisesBroken: 0, route: [] },
  { id: 'a3', name: 'Suresh Babu', area: 'Kanchipuram', target: 280000, salesTarget: 200000, mtdCollected: 0, mtdSales: 0, todayCollected: 0, todayOrders: 0, visitsPlanned: 6, visitsDone: 2, productive: 1, cashInHand: 0, pendingSync: 0, lastSyncMinutes: 190, dayStarted: true, dayStartedAt: '09:40', promisesOpen: 4, promisesBroken: 2, route: [] },
  { id: 'a4', name: 'Divya Lakshmi', area: 'Tambaram – Chengalpattu', target: 320000, salesTarget: 240000, mtdCollected: 0, mtdSales: 0, todayCollected: 0, todayOrders: 0, visitsPlanned: 8, visitsDone: 4, productive: 4, cashInHand: 0, pendingSync: 0, lastSyncMinutes: 25, dayStarted: true, dayStartedAt: '08:45', promisesOpen: 2, promisesBroken: 0, route: [] },
  { id: 'a5', name: 'Karthik Raj', area: 'Avadi – Tiruvallur', target: 260000, salesTarget: 180000, mtdCollected: 0, mtdSales: 0, todayCollected: 0, todayOrders: 0, visitsPlanned: 6, visitsDone: 0, productive: 0, cashInHand: 0, pendingSync: 0, lastSyncMinutes: 1440, dayStarted: false, dayStartedAt: '', promisesOpen: 2, promisesBroken: 1, route: [] },
];

// 60 days of daily figures, with a month-on-month upward drift and quieter Sundays.
export const days: Day[] = Array.from({ length: 60 }, (_, i) => {
  const date = daysAgo(59 - i);
  const dow = date.getDay();
  const weekend = dow === 0 ? 0.25 : dow === 6 ? 0.8 : 1;
  const trend = 1 + i / 250;
  const invoiced = Math.round(between(120000, 210000) * weekend * trend);
  const collected = Math.round(between(95000, 190000) * weekend * trend);
  const orders = Math.round(between(9, 22) * weekend);
  const orderValue = Math.round(orders * between(9000, 14000));
  const cashShare = between(0.28, 0.38);
  const upiShare = between(0.22, 0.32);
  const chequeShare = between(0.15, 0.25);
  const cash = Math.round(collected * cashShare);
  const upi = Math.round(collected * upiShare);
  const cheque = Math.round(collected * chequeShare);
  return { date, invoiced, collected, orders, orderValue, cash, upi, cheque, neft: collected - cash - upi - cheque };
});
// Today is partial (it is mid-afternoon).
const todayRow = days[days.length - 1];
todayRow.invoiced = Math.round(todayRow.invoiced * 0.55);
todayRow.collected = Math.round(todayRow.collected * 0.6);
todayRow.orders = Math.round(todayRow.orders * 0.6);
todayRow.orderValue = Math.round(todayRow.orderValue * 0.6);
todayRow.cash = Math.round(todayRow.collected * 0.34);
todayRow.upi = Math.round(todayRow.collected * 0.27);
todayRow.cheque = Math.round(todayRow.collected * 0.2);
todayRow.neft = todayRow.collected - todayRow.cash - todayRow.upi - todayRow.cheque;

export const customers: Customer[] = CUSTOMER_NAMES.map((name, i) => {
  const grade = rnd() < 0.4 ? 'Grade A' : 'Grade B';
  const creditLimit = Math.round(between(25000, 150000) / 5000) * 5000;
  const b0 = Math.round(between(0, 25000));
  const b1 = rnd() < 0.55 ? Math.round(between(0, 18000)) : 0;
  const b2 = rnd() < 0.3 ? Math.round(between(0, 15000)) : 0;
  const b3 = rnd() < 0.15 ? Math.round(between(5000, 30000)) : 0;
  const outstanding = b0 + b1 + b2 + b3;
  const status: Customer['status'] = b3 > 20000 ? 'Blocked' : outstanding > creditLimit ? 'OnHold' : i >= 37 ? 'Lead' : 'Active';
  return { id: `c${i + 1}`, name, city: pick(CITIES), grade, creditLimit, outstanding: status === 'Lead' ? 0 : outstanding, buckets: [b0, b1, b2, b3], status, agentId: agents[i % agents.length].id, mtdSales: Math.round(between(8000, 120000)), lastOrderDays: Math.round(between(0, 45)) };
});

// Agent figures derived from their customers + today's route.
for (const a of agents) {
  const mine = customers.filter((c) => c.agentId === a.id);
  a.mtdSales = mine.reduce((s, c) => s + c.mtdSales, 0);
  a.mtdCollected = Math.round(a.target * between(0.42, 0.78));
  const routeNames = mine.slice(0, a.visitsPlanned).map((c) => c.name);
  a.route = routeNames.map((customer, idx) => {
    const status = idx < a.visitsDone ? (idx === 1 && a.id === 'a3' ? 'SKIPPED' : 'COMPLETED') : idx === a.visitsDone && a.dayStarted ? 'IN_PROGRESS' : 'PLANNED';
    const collected = status === 'COMPLETED' && idx < a.productive ? Math.round(between(3000, 22000) / 50) * 50 : 0;
    const hh = 9 + Math.floor(idx * 0.9);
    return { customer, time: `${String(hh).padStart(2, '0')}:${idx % 2 ? '30' : '00'}`, status, collected, outcome: status === 'COMPLETED' ? (collected ? (rnd() < 0.5 ? 'Collected + ordered' : 'Collected') : 'Promise to pay') : undefined };
  });
  a.todayCollected = a.route.reduce((s, r) => s + r.collected, 0);
  a.todayOrders = a.route.filter((r) => r.outcome?.includes('ordered')).length;
  a.cashInHand = Math.round(a.todayCollected * between(0.3, 0.45) / 50) * 50;
  a.pendingSync = a.lastSyncMinutes > 60 ? Math.round(between(3, 9)) : 0;
}

export const products: Product[] = [
  { name: 'Sun Sea Rice 25kg', category: 'Rice', mtdQty: 1840, mtdValue: 1840 * 1250, stock: 140, minStock: 200, uom: 'Bag' },
  { name: 'Sun Sea Rice 10kg', category: 'Rice', mtdQty: 1120, mtdValue: 1120 * 520, stock: 60, minStock: 150, uom: 'Bag' },
  { name: 'Sun Sea Rice 5kg', category: 'Rice', mtdQty: 960, mtdValue: 960 * 270, stock: 8, minStock: 100, uom: 'Bag' },
  { name: 'Sun Sea Oil 1L', category: 'Edible Oil', mtdQty: 6400, mtdValue: 6400 * 180, stock: 900, minStock: 500, uom: 'Pouch' },
  { name: 'Sun Sea Oil 5L', category: 'Edible Oil', mtdQty: 720, mtdValue: 720 * 860, stock: 0, minStock: 120, uom: 'Can' },
  { name: 'Sun Sea Sugar 1kg', category: 'Sugar', mtdQty: 5200, mtdValue: 5200 * 45, stock: 1200, minStock: 600, uom: 'Pack' },
  { name: 'Sun Sea Sugar 5kg', category: 'Sugar', mtdQty: 860, mtdValue: 860 * 215, stock: 75, minStock: 100, uom: 'Pack' },
  { name: 'Sun Sea Atta 500g', category: 'Flour', mtdQty: 4100, mtdValue: 4100 * 32, stock: 300, minStock: 400, uom: 'Pack' },
  { name: 'Sun Sea Atta 5kg', category: 'Flour', mtdQty: 640, mtdValue: 640 * 260, stock: 22, minStock: 80, uom: 'Bag' },
  { name: 'Sun Sea Tea 250g', category: 'Beverages', mtdQty: 1500, mtdValue: 1500 * 140, stock: 180, minStock: 150, uom: 'Pack' },
];

export const orderFunnel = [
  { label: 'Draft (from field)', value: 14, amount: 186000 },
  { label: 'Pending MD approval', value: 3, amount: 74500 },
  { label: 'Confirmed', value: 21, amount: 312000 },
  { label: 'Ready / in production', value: 9, amount: 141000 },
  { label: 'Dispatched', value: 17, amount: 264000 },
  { label: 'Invoiced (MTD)', value: 162, amount: days.slice(-new Date().getDate()).reduce((s, d) => s + d.invoiced, 0) },
];

export const production = {
  plansToday: 4,
  planned: 12500,
  produced: 8160,
  uom: 'kg',
  machinesRunning: 5,
  machinesTotal: 7,
  lines: [
    { product: 'Sun Sea Rice 25kg', target: 4000, done: 3100, status: 'IN_PROGRESS' },
    { product: 'Sun Sea Oil 1L', target: 3500, done: 3500, status: 'COMPLETED' },
    { product: 'Sun Sea Atta 5kg', target: 2500, done: 1200, status: 'IN_PROGRESS' },
    { product: 'Sun Sea Sugar 1kg', target: 2500, done: 360, status: 'DELAYED' },
  ],
};

export const rawMaterials = [
  { name: 'Paddy (Ponni)', onHand: 18.4, reorder: 25, uom: 'MT' },
  { name: 'Crude sunflower oil', onHand: 6.2, reorder: 5, uom: 'KL' },
  { name: 'Raw sugar', onHand: 3.1, reorder: 8, uom: 'MT' },
  { name: 'Wheat', onHand: 12.8, reorder: 10, uom: 'MT' },
  { name: '1L pouches (film)', onHand: 42000, reorder: 60000, uom: 'pcs' },
];

export const purchases = { openPOs: 6, openValue: 1840000, overdueDeliveries: 2, list: [
  { po: 'PO-2026-118', supplier: 'Thanjavur Paddy Traders', value: 920000, due: 'Overdue 3d', status: 'PARTIAL' },
  { po: 'PO-2026-121', supplier: 'Kaleesuwari Refinery', value: 480000, due: 'Due tomorrow', status: 'APPROVED' },
  { po: 'PO-2026-123', supplier: 'EID Parry', value: 260000, due: 'Overdue 1d', status: 'APPROVED' },
  { po: 'PO-2026-124', supplier: 'Uflex Packaging', value: 180000, due: 'Due in 4d', status: 'PENDING_APPROVAL' },
] };

export const dispatches = { pendingGate: 3, pendingStore: 1, todayDispatched: 11, list: [
  { no: 'GD-2026-0412', vehicle: 'TN 22 AB 4412', items: 3, status: 'PENDING_GATE_APPROVAL', since: '35 min' },
  { no: 'GD-2026-0413', vehicle: 'TN 11 CD 0981', items: 5, status: 'PENDING_GATE_APPROVAL', since: '20 min' },
  { no: 'GD-2026-0414', vehicle: 'TN 07 EF 3321', items: 2, status: 'PENDING_GATE_APPROVAL', since: '6 min' },
  { no: 'GD-2026-0409', vehicle: 'TN 22 AB 4412', items: 4, status: 'PENDING_STORE_RECEIPT', since: '2 h' },
] };

export const expenses = { mtd: 486500, budget: 650000, byCategory: [
  { label: 'Transport & freight', value: 182000 },
  { label: 'Fuel', value: 96500 },
  { label: 'Electricity', value: 88000 },
  { label: 'Repairs & maintenance', value: 54000 },
  { label: 'Field expenses (agents)', value: 31000 },
  { label: 'Other', value: 35000 },
] };

export const bank = { cash: 412000, bank: 3860000, chequesInHand: 21, chequesValue: 386500, pdcValue: 142000, payablesDue7d: 1120000 };

export const attention: Attention[] = [
  { id: 't1', kind: 'APPROVAL', title: 'Order SO-2026-233 · Kumar Trading', detail: 'Exceeds credit limit by ₹18,400 · booked by Arun Kumar', amount: 42400, severity: 'serious', since: '1 h' },
  { id: 't2', kind: 'APPROVAL', title: 'Order SO-2026-235 · Annai Departmental', detail: 'Customer has 2 overdue invoices (48 days)', amount: 21500, severity: 'warning', since: '2 h' },
  { id: 't3', kind: 'APPROVAL', title: 'Order SO-2026-236 · Nellai Mart', detail: 'New customer (Lead) — first order needs approval', amount: 10600, severity: 'info', since: '3 h' },
  { id: 't4', kind: 'CREDIT', title: 'Chola Traders blocked', detail: '₹28,300 over 90 days · 2 broken promises this month', amount: 28300, severity: 'critical', since: '12 d' },
  { id: 't5', kind: 'HANDOVER', title: 'Cash handover · Suresh Babu', detail: '₹14,800 recorded yesterday, not yet confirmed by office', amount: 14800, severity: 'serious', since: '19 h' },
  { id: 't6', kind: 'PROMISE', title: '4 promises to pay due today', detail: '₹41,900 promised · Kumar Trading, Sakthi Traders, Ponni Stores, Jai Provision', amount: 41900, severity: 'warning', since: 'today' },
  { id: 't7', kind: 'CHEQUE', title: '3 post-dated cheques due tomorrow', detail: '₹62,000 · Canara, Indian Bank, SBI', amount: 62000, severity: 'info', since: 'tomorrow' },
  { id: 't8', kind: 'STOCK', title: 'Sun Sea Oil 5L out of stock', detail: '9 open order lines waiting · 720 sold this month', severity: 'critical', since: '2 d' },
  { id: 't9', kind: 'STOCK', title: 'Sun Sea Rice 5kg below minimum', detail: '8 bags on hand vs 100 minimum', severity: 'serious', since: '1 d' },
  { id: 't10', kind: 'DISPATCH', title: '3 dispatches waiting at gate', detail: 'Oldest 35 min · TN 22 AB 4412', severity: 'warning', since: '35 min' },
  { id: 't11', kind: 'PURCHASE', title: 'PO-2026-118 paddy delivery overdue', detail: 'Thanjavur Paddy Traders · 3 days late · ₹9.2L partial', amount: 920000, severity: 'serious', since: '3 d' },
];
