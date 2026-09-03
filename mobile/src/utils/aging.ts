import { daysBetween } from './format';

export interface AgingBuckets {
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  total: number;
}

export interface AgeableInvoice {
  invoiceDate: string;
  balance: number;
}

export function agingBuckets(invoices: AgeableInvoice[], asOf = new Date()): AgingBuckets {
  const out: AgingBuckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 };
  for (const inv of invoices) {
    if (inv.balance <= 0) continue;
    const age = daysBetween(inv.invoiceDate, asOf);
    if (age <= 30) out.b0_30 += inv.balance;
    else if (age <= 60) out.b31_60 += inv.balance;
    else if (age <= 90) out.b61_90 += inv.balance;
    else out.b90plus += inv.balance;
    out.total += inv.balance;
  }
  return out;
}
