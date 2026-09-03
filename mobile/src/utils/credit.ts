/**
 * Mirrors backend sales-order/creditCheckService: exposure = open invoices +
 * new order; overdue = any unpaid invoice past its due date.
 */
import { daysBetween, todayYmd } from './format';

export interface CreditInput {
  creditLimit: number;
  status: string; // Active | OnHold | Blocked | Lead | Inactive
  invoices: { balance: number; dueDate: string | null; invoiceDate: string }[];
  newOrderAmount?: number;
}

export interface CreditStatus {
  openBalance: number;
  overdueAmount: number;
  oldestOverdueDays: number;
  hasOverdue: boolean;
  exposure: number;
  withinLimit: boolean;
  exceededBy: number;
  utilisation: number; // 0..1+ (exposure / limit), 0 when no limit
  blocked: boolean;
  onHold: boolean;
  /** Human summary for the credit card header. */
  headline: 'Blocked' | 'On hold' | 'Over limit' | 'Overdue' | 'Good standing' | 'Lead';
}

export function creditStatus(input: CreditInput): CreditStatus {
  const today = todayYmd();
  let openBalance = 0;
  let overdueAmount = 0;
  let oldest = 0;
  for (const inv of input.invoices) {
    if (inv.balance <= 0) continue;
    openBalance += inv.balance;
    const due = inv.dueDate || inv.invoiceDate;
    if (due < today) {
      overdueAmount += inv.balance;
      oldest = Math.max(oldest, daysBetween(due));
    }
  }
  const exposure = openBalance + (input.newOrderAmount ?? 0);
  const limit = input.creditLimit || 0;
  const withinLimit = limit === 0 ? true : exposure <= limit;
  const blocked = input.status === 'Blocked';
  const onHold = input.status === 'OnHold' || input.status === 'Inactive';
  const headline: CreditStatus['headline'] = blocked
    ? 'Blocked'
    : onHold
      ? 'On hold'
      : input.status === 'Lead'
        ? 'Lead'
        : !withinLimit
          ? 'Over limit'
          : overdueAmount > 0
            ? 'Overdue'
            : 'Good standing';
  return {
    openBalance: Math.round(openBalance * 100) / 100,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    oldestOverdueDays: oldest,
    hasOverdue: overdueAmount > 0,
    exposure: Math.round(exposure * 100) / 100,
    withinLimit,
    exceededBy: withinLimit ? 0 : Math.round((exposure - limit) * 100) / 100,
    utilisation: limit > 0 ? exposure / limit : 0,
    blocked,
    onHold,
    headline,
  };
}
