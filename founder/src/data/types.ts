import type { Agent, Attention, Customer, Day, Product } from './demo';

export type { Agent, Attention, Customer, Day, Product };

export interface Dataset {
  source: 'demo' | 'live';
  generatedAt: number;
  days: Day[];
  customers: Customer[];
  agents: Agent[];
  products: Product[];
  orderFunnel: { label: string; value: number; amount: number }[];
  production: { plansToday: number; planned: number; produced: number; uom: string; machinesRunning: number; machinesTotal: number; lines: { product: string; target: number; done: number; status: string }[] };
  rawMaterials: { name: string; onHand: number; reorder: number; uom: string }[];
  purchases: { openPOs: number; openValue: number; overdueDeliveries: number; list: { po: string; supplier: string; value: number; due: string; status: string }[] };
  dispatches: { pendingGate: number; pendingStore: number; todayDispatched: number; list: { no: string; vehicle: string; items: number; status: string; since: string }[] };
  expenses: { mtd: number; budget: number; byCategory: { label: string; value: number }[] };
  bank: { cash: number; bank: number; chequesInHand: number; chequesValue: number; pdcValue: number; payablesDue7d: number };
  attention: Attention[];
  /** Field team figures need the mobile extension; false when the ERP does not have it. */
  fieldAvailable: boolean;
  company?: string | null;
}
