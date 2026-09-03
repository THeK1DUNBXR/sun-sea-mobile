/**
 * Demo-mode stand-in for the real sync: pretends the ERP accepted everything
 * captured on the device, assigning receipt / order numbers locally.
 */
import { Q } from '@nozbe/watermelondb';
import { database, tables } from '../db';
import type { ChequeFields } from '../api/types';
import { todayYmd } from '../utils/format';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function demoSync() {
  await wait(1200);
  const year = new Date().getFullYear();
  const pendingCollections = await tables.collections().query(Q.where('status', 'PENDING')).fetch();
  const pendingOrders = await tables.orders().query(Q.where('status', 'PENDING')).fetch();
  const pendingAttachments = await tables.attachments().query(Q.where('remote_url', null)).fetch();
  const posted = await tables.collections().query(Q.where('status', 'POSTED')).fetchCount();
  const orders = await tables.orders().query(Q.where('status', Q.notEq('PENDING'))).fetchCount();
  const pendingHandovers = await tables.handovers().query(Q.where('receipt_no', null)).fetch();
  const pendingExpenses = await tables.expenses().query(Q.where('expense_number', null)).fetch();
  const pendingLeads = await tables.leads().query(Q.where('status', 'SUBMITTED')).fetch();
  const customersCount = await tables.customers().query().fetchCount();

  await database.write(async () => {
    let seq = 125 + posted;
    for (const c of pendingCollections) {
      seq += 1;
      await c.update((r) => {
        r.receiptNo = `MC-${year}-${String(seq).padStart(5, '0')}`;
        r.status = 'POSTED';
        r.updatedAt = Date.now();
      });
    }
    let oseq = 31 + orders;
    for (const o of pendingOrders) {
      oseq += 1;
      await o.update((r) => {
        r.orderNo = `SO-${year}-${String(oseq).padStart(3, '0')}`;
        r.salesOrderId = String(oseq);
        r.status = 'DRAFT';
        r.updatedAt = Date.now();
      });
    }
    for (const a of pendingAttachments) {
      await a.update((r) => {
        r.remoteUrl = r.localUri; // "uploaded"
      });
    }
    let hseq = 42;
    for (const h of pendingHandovers) {
      hseq += 1;
      await h.update((r) => {
        r.receiptNo = `HO-${year}-${String(hseq).padStart(5, '0')}`;
        r.updatedAt = Date.now();
      });
    }
    let eseq = 31;
    for (const e of pendingExpenses) {
      eseq += 1;
      await e.update((r) => {
        r.expenseNumber = `MEXP-${year}-${String(eseq).padStart(4, '0')}`;
        r.updatedAt = Date.now();
      });
    }
    // Leads become ERP customers with status "Lead" — they then show up in the customer list.
    let cseq = customersCount;
    for (const l of pendingLeads) {
      cseq += 1;
      const code = `CUST${String(cseq).padStart(3, '0')}`;
      const customer = await tables.customers().create((c) => {
        c._raw.id = l.id.replace(/^........-/, 'c1000000-');
        c.customerCode = code;
        c.firmName = l.firmName;
        c.displayName = null;
        c.mobile = l.mobile;
        c.email = l.email;
        c.gstin = l.gstin;
        c.addressLine = l.addressLine;
        c.city = l.city;
        c.state = l.state;
        c.pincode = l.pincode;
        c.creditLimit = 0;
        c.creditDays = null;
        c.outstanding = 0;
        c.gradeName = null;
        c.typeName = 'Retailer';
        c.status = 'Lead';
        c.updatedAt = Date.now();
      });
      await l.update((r) => {
        r.status = 'CREATED';
        r.customerId = customer.id;
        r.customerCode = code;
        r.updatedAt = Date.now();
      });
    }
  });

  return {
    collections: pendingCollections.length,
    orders: pendingOrders.length,
    attachments: pendingAttachments.length,
  };
}

/** Simulated cheque OCR result for the demo build. */
export async function demoChequeOcr(planned: number): Promise<ChequeFields> {
  await wait(1800);
  const amount = Math.round(planned) || 18750;
  const words = new Intl.NumberFormat('en-IN').format(amount);
  return {
    bankName: 'State Bank of India',
    branch: 'Anna Salai, Chennai',
    ifsc: 'SBIN0000800',
    chequeNumber: String(100000 + Math.floor(Math.random() * 899999)),
    accountNumber: null,
    date: todayYmd(),
    amount,
    amountInWords: `Rupees ${words} only`,
    drawerName: 'Sri Balaji Stores',
    payeeName: 'Sun Sea Foods Pvt Ltd',
    isPostDated: false,
    confidence: 'high',
    warnings: ['Demo mode: fields are simulated, not read from the photo'],
  };
}
