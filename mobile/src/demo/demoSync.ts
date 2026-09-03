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
