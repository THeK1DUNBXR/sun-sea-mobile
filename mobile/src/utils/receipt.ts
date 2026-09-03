import { fmtDate, fmtDateTime, money } from './format';

export interface ReceiptInput {
  companyName: string;
  receiptNo: string | null;
  customerName: string;
  customerCode?: string | null;
  amount: number;
  paymentMode: string;
  referenceNo?: string | null;
  bankName?: string | null;
  chequeDate?: string | null;
  collectedAt: number;
  allocations: { invoiceNo: string; amount: number }[];
  onAccount?: number;
  agentName: string;
  balanceAfter?: number | null;
}

/** Plain-text receipt suitable for WhatsApp / SMS. */
export function receiptText(r: ReceiptInput): string {
  const lines: string[] = [];
  lines.push(`*${r.companyName}*`);
  lines.push('Payment Receipt');
  lines.push(r.receiptNo ? `Receipt No: ${r.receiptNo}` : 'Receipt No: (pending sync)');
  lines.push(`Date: ${fmtDateTime(r.collectedAt)}`);
  lines.push('');
  lines.push(`Received from: ${r.customerName}${r.customerCode ? ` (${r.customerCode})` : ''}`);
  lines.push(`Amount: *${money(r.amount)}*`);
  lines.push(`Mode: ${r.paymentMode}${r.referenceNo ? ` · Ref ${r.referenceNo}` : ''}${r.bankName ? ` · ${r.bankName}` : ''}${r.chequeDate ? ` · Cheque dt ${fmtDate(r.chequeDate)}` : ''}`);
  if (r.allocations.length) {
    lines.push('');
    lines.push('Against invoices:');
    for (const a of r.allocations) lines.push(`  • ${a.invoiceNo}: ${money(a.amount)}`);
  }
  if (r.onAccount && r.onAccount > 0) lines.push(`  • On account: ${money(r.onAccount)}`);
  if (r.balanceAfter !== undefined && r.balanceAfter !== null) {
    lines.push('');
    lines.push(`Balance outstanding: ${money(Math.max(0, r.balanceAfter))}`);
  }
  lines.push('');
  lines.push(`Collected by: ${r.agentName}`);
  lines.push('Thank you for your payment.');
  if (r.paymentMode === 'Cheque') lines.push('_Subject to realisation of cheque._');
  return lines.join('\n');
}

/** WhatsApp deep link for an Indian mobile number. */
export function whatsappUrl(mobile: string | null | undefined, text: string): string | null {
  if (!mobile) return null;
  let digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
