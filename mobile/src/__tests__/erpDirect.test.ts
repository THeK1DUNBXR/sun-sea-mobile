import { mapCustomer, mapInvoice, mapProduct, primaryMobile, reconcileInvoiceBalances } from '../api/erpDirect';

describe('direct ERP mappers', () => {
  it('maps a customer row from /customers, preferring the ledger balance', () => {
    const c = mapCustomer({
      id: 'c1',
      customerCode: 'CUST001',
      firmName: 'Sri Balaji Stores',
      mobile: { primary: '9840012345' },
      addresses: [{ is_default: true, address: { addressLine1: '123, Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' } }],
      creditLimit: '50000.00',
      creditDays: 30,
      outstandingAmount: '99999',
      netBalance: 18750,
      customerGrade: { name: 'Grade A' },
      status: 'Active',
      updatedAt: '2026-09-01T10:00:00Z',
    });
    expect(c.outstanding).toBe(18750);
    expect(c.mobile).toBe('9840012345');
    expect(c.address_line).toBe('123, Anna Salai');
    expect(c.grade_name).toBe('Grade A');
    expect(c.credit_limit).toBe(50000);
  });
  it('reads mobile from strings, arrays and objects', () => {
    expect(primaryMobile('98400')).toBe('98400');
    expect(primaryMobile(['98400', '91234'])).toBe('98400');
    expect(primaryMobile({ number: '91234' })).toBe('91234');
    expect(primaryMobile(null)).toBeNull();
  });
  it('maps invoices with payments JSON and derives status', () => {
    const i = mapInvoice({ id: 'i1', invoiceNo: 'INV-10045', customerId: 'c1', invoiceDate: '2026-08-10', dueDate: '2026-09-09', grandTotal: '7850', payments: JSON.stringify([{ amount: 2000 }]) });
    expect(i.paid_amount).toBe(2000);
    expect(i.balance).toBe(5850);
    expect(i.status).toBe('PARTIAL');
  });
  it('clears oldest invoices first when the ledger says less is owed', () => {
    const rows = [
      mapInvoice({ id: 'a', invoiceNo: 'A', customerId: 'c', invoiceDate: '2026-07-01', grandTotal: 1000, payments: [] }),
      mapInvoice({ id: 'b', invoiceNo: 'B', customerId: 'c', invoiceDate: '2026-08-01', grandTotal: 2000, payments: [] }),
    ];
    reconcileInvoiceBalances(rows, 1500);
    expect(rows[0].balance).toBe(0);
    expect(rows[0].status).toBe('PAID');
    expect(rows[1].balance).toBe(1500);
    expect(rows[1].status).toBe('PARTIAL');
  });
  it('maps products with stock, image and minimum qty', () => {
    const p = mapProduct({ id: 41, productCode: 'SSR-25', productName: 'Sun Sea Rice 25kg', uom: { uomName: 'Bag' }, rate: '1250', gradeRates: { 'Grade A': 1200 }, minimumQty: '2', category: { name: 'Rice' }, images: [{ imageUrl: 'https://x/y.jpg', isPrimary: true }], finishedGoodsStocks: [{ onHandQty: '100' }, { onHandQty: '40' }], isActive: true });
    expect(p.id).toBe('41');
    expect(p.on_hand_qty).toBe(140);
    expect(p.min_qty).toBe(2);
    expect(p.image_url).toBe('https://x/y.jpg');
    expect(JSON.parse(p.grade_rates)['Grade A']).toBe(1200);
  });
});
