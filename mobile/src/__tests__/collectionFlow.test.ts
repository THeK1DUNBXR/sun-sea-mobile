import { rebalanceDraft } from '../utils/collectionMath';

const draft = {
  customerId: 'c1',
  allocations: [
    { invoiceId: 'i1', invoiceNo: 'INV-1', amount: 7850 },
    { invoiceId: 'i2', invoiceNo: 'INV-2', amount: 6450 },
  ],
  onAccount: 0,
  total: 14300,
};

describe('rebalanceDraft', () => {
  it('keeps allocations when the received amount matches', () => {
    expect(rebalanceDraft(draft, 14300)).toEqual(draft);
  });
  it('trims from the last invoice on a partial payment', () => {
    const r = rebalanceDraft(draft, 10000);
    expect(r.allocations).toEqual([
      { invoiceId: 'i1', invoiceNo: 'INV-1', amount: 7850 },
      { invoiceId: 'i2', invoiceNo: 'INV-2', amount: 2150 },
    ]);
    expect(r.total).toBe(10000);
  });
  it('drops fully unpaid lines', () => {
    const r = rebalanceDraft(draft, 5000);
    expect(r.allocations).toEqual([{ invoiceId: 'i1', invoiceNo: 'INV-1', amount: 5000 }]);
  });
  it('treats pure on-account drafts as on-account', () => {
    const r = rebalanceDraft({ ...draft, allocations: [], onAccount: 500, total: 500 }, 700);
    expect(r.onAccount).toBe(700);
    expect(r.total).toBe(700);
  });
});
