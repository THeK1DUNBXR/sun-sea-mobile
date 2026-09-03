import { receiptText, whatsappUrl } from '../utils/receipt';

describe('receipt', () => {
  it('renders a WhatsApp-friendly receipt', () => {
    const txt = receiptText({
      companyName: 'Sun Sea Foods',
      receiptNo: 'MC-2026-00126',
      customerName: 'Sri Balaji Stores',
      amount: 18750,
      paymentMode: 'Cheque',
      referenceNo: '123456',
      bankName: 'SBI',
      chequeDate: '2026-05-20',
      collectedAt: Date.now(),
      allocations: [{ invoiceNo: 'INV-10045', amount: 7850 }],
      onAccount: 0,
      agentName: 'Arun',
      balanceAfter: 0,
    });
    expect(txt).toContain('MC-2026-00126');
    expect(txt).toContain('INV-10045');
    expect(txt).toContain('Subject to realisation');
  });
  it('builds wa.me links for Indian numbers', () => {
    expect(whatsappUrl('98400 12345', 'hi')).toBe('https://wa.me/919840012345?text=hi');
    expect(whatsappUrl(null, 'hi')).toBeNull();
    expect(whatsappUrl('12345', 'hi')).toBeNull();
  });
});
