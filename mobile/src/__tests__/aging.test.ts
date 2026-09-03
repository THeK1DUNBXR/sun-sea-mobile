import { agingBuckets } from '../utils/aging';
import { addDays, todayYmd } from '../utils/format';

describe('agingBuckets', () => {
  it('buckets balances by invoice age', () => {
    const t = todayYmd();
    const r = agingBuckets([
      { invoiceDate: addDays(t, -5), balance: 100 },
      { invoiceDate: addDays(t, -45), balance: 200 },
      { invoiceDate: addDays(t, -75), balance: 300 },
      { invoiceDate: addDays(t, -120), balance: 400 },
      { invoiceDate: addDays(t, -1), balance: 0 },
    ]);
    expect(r).toEqual({ b0_30: 100, b31_60: 200, b61_90: 300, b90plus: 400, total: 1000 });
  });
});
