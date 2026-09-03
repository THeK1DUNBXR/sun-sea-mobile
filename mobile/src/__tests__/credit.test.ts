import { creditStatus } from '../utils/credit';
import { addDays, todayYmd } from '../utils/format';

const t = todayYmd();

describe('creditStatus', () => {
  it('flags overdue invoices and limit breaches like the ERP', () => {
    const r = creditStatus({
      creditLimit: 20000,
      status: 'Active',
      invoices: [
        { balance: 7850, dueDate: addDays(t, -5), invoiceDate: addDays(t, -35) },
        { balance: 6450, dueDate: addDays(t, 10), invoiceDate: addDays(t, -20) },
      ],
      newOrderAmount: 10000,
    });
    expect(r.openBalance).toBe(14300);
    expect(r.overdueAmount).toBe(7850);
    expect(r.oldestOverdueDays).toBe(5);
    expect(r.exposure).toBe(24300);
    expect(r.withinLimit).toBe(false);
    expect(r.exceededBy).toBe(4300);
    expect(r.headline).toBe('Over limit');
  });
  it('treats no limit as unlimited and blocked status as blocked', () => {
    expect(creditStatus({ creditLimit: 0, status: 'Active', invoices: [] }).headline).toBe('Good standing');
    expect(creditStatus({ creditLimit: 0, status: 'Blocked', invoices: [] }).blocked).toBe(true);
  });
});
