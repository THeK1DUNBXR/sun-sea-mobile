/**
 * All writes the agent can make on the device. Every function is offline-safe:
 * it only touches WatermelonDB; the sync engine carries the change to the ERP.
 */
import * as Location from 'expo-location';
import type { Allocation, AttachmentKind, OrderLine, PaymentMode } from '../api/types';
import { database, tables, Collection, Order, Visit } from '../db';
import { newId } from '../utils/ids';
import { round2, todayYmd } from '../utils/format';
import type { CapturedPhoto } from '../utils/photos';

export interface NewCollectionInput {
  customerId: string;
  visitId?: string | null;
  amount: number;
  paymentMode: PaymentMode;
  referenceNo?: string | null;
  bankName?: string | null;
  chequeDate?: string | null;
  drawerName?: string | null;
  notes?: string | null;
  allocations: Allocation[];
  photos: { kind: AttachmentKind; photo: CapturedPhoto }[];
}

export async function createCollection(input: NewCollectionInput): Promise<Collection> {
  const id = newId();
  const now = Date.now();
  return database.write(async () => {
    const record = await tables.collections().create((c) => {
      c._raw.id = id;
      c.customerId = input.customerId;
      c.visitId = input.visitId ?? null;
      c.amount = round2(input.amount);
      c.paymentMode = input.paymentMode;
      c.referenceNo = input.referenceNo?.trim() || null;
      c.bankName = input.bankName?.trim() || null;
      c.chequeDate = input.chequeDate || null;
      c.drawerName = input.drawerName?.trim() || null;
      c.collectedAt = now;
      c.notes = input.notes?.trim() || null;
      c.allocations = input.allocations.map((a) => ({ ...a, amount: round2(a.amount) }));
      c.attachments = [];
      c.receiptNo = null;
      c.status = 'PENDING';
      c.syncError = null;
      c.updatedAt = now;
    });

    for (const { kind, photo } of input.photos) {
      await tables.attachments().create((a) => {
        a._raw.id = newId();
        a.collectionId = id;
        a.kind = kind;
        a.localUri = photo.uri;
        a.mimeType = photo.mimeType;
        a.remoteUrl = null;
        a.uploadError = null;
        a.createdAt = now;
      });
    }

    // Optimistic local balances — the next pull replaces them with the ERP's figures.
    for (const alloc of input.allocations) {
      const inv = await tables.invoices().find(alloc.invoiceId).catch(() => null);
      if (!inv) continue;
      await inv.update((i) => {
        i.paidAmount = round2(i.paidAmount + alloc.amount);
        i.balance = Math.max(0, round2(i.balance - alloc.amount));
        i.status = i.balance <= 0 ? 'PAID' : 'PARTIAL';
      });
    }
    const customer = await tables.customers().find(input.customerId).catch(() => null);
    if (customer) {
      await customer.update((c) => {
        c.outstanding = round2(c.outstanding - input.amount);
      });
    }

    if (input.visitId) {
      const visit = await tables.visits().find(input.visitId).catch(() => null);
      if (visit) {
        await visit.update((v) => {
          v.outcome = v.outcome === 'ORDER' || v.outcome === 'BOTH' ? 'BOTH' : 'COLLECTION';
          v.updatedAt = now;
        });
      }
    }
    return record;
  });
}

export interface NewOrderInput {
  customerId: string;
  visitId?: string | null;
  lines: OrderLine[];
  remarks?: string | null;
  estimatedTotal: number;
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  const id = newId();
  const now = Date.now();
  return database.write(async () => {
    const record = await tables.orders().create((o) => {
      o._raw.id = id;
      o.customerId = input.customerId;
      o.visitId = input.visitId ?? null;
      o.orderDate = todayYmd();
      o.items = input.lines.filter((l) => l.quantity > 0);
      o.totalAmount = round2(input.estimatedTotal);
      o.remarks = input.remarks?.trim() || null;
      o.orderNo = null;
      o.salesOrderId = null;
      o.status = 'PENDING';
      o.syncError = null;
      o.updatedAt = now;
    });
    if (input.visitId) {
      const visit = await tables.visits().find(input.visitId).catch(() => null);
      if (visit) {
        await visit.update((v) => {
          v.outcome = v.outcome === 'COLLECTION' || v.outcome === 'BOTH' ? 'BOTH' : 'ORDER';
          v.updatedAt = now;
        });
      }
    }
    return record;
  });
}

async function currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const granted = perm.granted || (await Location.requestForegroundPermissionsAsync()).granted;
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function startVisit(visit: Visit) {
  const pos = await currentPosition();
  await database.write(async () => {
    await visit.update((v) => {
      v.status = 'IN_PROGRESS';
      v.checkInAt = v.checkInAt ?? Date.now();
      if (pos) {
        v.latitude = pos.latitude;
        v.longitude = pos.longitude;
      }
      v.updatedAt = Date.now();
    });
  });
}

export async function completeVisit(visit: Visit, notes?: string | null) {
  await database.write(async () => {
    await visit.update((v) => {
      v.status = 'COMPLETED';
      v.checkOutAt = Date.now();
      if (!v.outcome) v.outcome = 'NO_ACTION';
      if (notes !== undefined) v.notes = notes;
      v.updatedAt = Date.now();
    });
  });
}

export async function skipVisit(visit: Visit, reason?: string | null) {
  await database.write(async () => {
    await visit.update((v) => {
      v.status = 'SKIPPED';
      if (reason) v.notes = reason;
      v.updatedAt = Date.now();
    });
  });
}

export async function addAdHocVisit(customerId: string, plannedDate = todayYmd()): Promise<Visit> {
  const existing = await tables.visits().query().fetch();
  const sameDay = existing.filter((v) => v.plannedDate === plannedDate);
  const dup = sameDay.find((v) => v.customerId === customerId && v.status !== 'SKIPPED');
  if (dup) return dup;
  const seq = sameDay.reduce((m, v) => Math.max(m, v.sequence), 0) + 1;
  return database.write(() =>
    tables.visits().create((v) => {
      v._raw.id = newId();
      v.customerId = customerId;
      v.routeId = null;
      v.plannedDate = plannedDate;
      v.plannedTime = null;
      v.sequence = seq;
      v.status = 'PLANNED';
      v.outcome = null;
      v.checkInAt = null;
      v.checkOutAt = null;
      v.latitude = null;
      v.longitude = null;
      v.notes = null;
      v.updatedAt = Date.now();
    })
  );
}
