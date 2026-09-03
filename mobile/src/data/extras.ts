/**
 * Device writes for the v1.1 features (follow-ups, day sessions, handovers,
 * expense claims, leads). Offline-safe like actions.ts.
 */
import * as Location from 'expo-location';
import { Q } from '@nozbe/watermelondb';
import { database, tables, DaySession, FollowUp, Handover, Expense, Lead, Collection } from '../db';
import type { FollowUpReason, FollowUpType } from '../db/models/FollowUp';
import type { HandoverMode } from '../db/models/Handover';
import type { ExpenseCategory } from '../db/models/Expense';
import type { AttachmentKind } from '../api/types';
import { newId } from '../utils/ids';
import { round2, todayYmd } from '../utils/format';
import { endOfDayMs, startOfDayMs } from '../utils/period';
import type { CapturedPhoto } from '../utils/photos';

async function position(): Promise<{ latitude: number; longitude: number } | null> {
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

async function addPhotos(parentId: string, parentType: 'handover' | 'expense' | 'lead', photos: { kind: AttachmentKind; photo: CapturedPhoto }[]) {
  const now = Date.now();
  for (const { kind, photo } of photos) {
    await tables.attachments().create((a) => {
      a._raw.id = newId();
      a.collectionId = parentId;
      a.parentType = parentType;
      a.kind = kind;
      a.localUri = photo.uri;
      a.mimeType = photo.mimeType;
      a.remoteUrl = null;
      a.uploadError = null;
      a.createdAt = now;
    });
  }
}

// ─── Follow-ups / promise to pay ─────────────────────────────────────────────

export interface NewFollowUpInput {
  customerId: string;
  visitId?: string | null;
  type: FollowUpType;
  reason?: FollowUpReason | null;
  promisedAmount?: number | null;
  promisedDate?: string | null; // YYYY-MM-DD
  dueAt?: number;
  notes?: string | null;
}

export async function createFollowUp(input: NewFollowUpInput): Promise<FollowUp> {
  const now = Date.now();
  const dueAt = input.dueAt ?? (input.promisedDate ? startOfDayMs(input.promisedDate) + 10 * 3600000 : now + 86400000);
  return database.write(async () => {
    const f = await tables.followUps().create((r) => {
      r._raw.id = newId();
      r.customerId = input.customerId;
      r.visitId = input.visitId ?? null;
      r.type = input.type;
      r.reason = input.reason ?? null;
      r.promisedAmount = input.promisedAmount ? round2(input.promisedAmount) : null;
      r.promisedDate = input.promisedDate ?? null;
      r.dueAt = dueAt;
      r.notes = input.notes?.trim() || null;
      r.status = input.type === 'NO_ACTION' ? 'DONE' : 'OPEN';
      r.completedAt = input.type === 'NO_ACTION' ? now : null;
      r.createdAt = now;
      r.updatedAt = now;
    });
    if (input.visitId) {
      const v = await tables.visits().find(input.visitId).catch(() => null);
      if (v) {
        await v.update((x) => {
          if (!x.outcome) x.outcome = 'NO_ACTION';
          x.notes = input.notes?.trim() || x.notes;
          x.updatedAt = now;
        });
      }
    }
    return f;
  });
}

export async function completeFollowUp(f: FollowUp, status: 'DONE' | 'BROKEN' | 'CANCELLED' = 'DONE') {
  await database.write(async () => {
    await f.update((r) => {
      r.status = status;
      r.completedAt = Date.now();
      r.updatedAt = Date.now();
    });
  });
}

export async function rescheduleFollowUp(f: FollowUp, promisedDate: string, notes?: string | null) {
  await database.write(async () => {
    await f.update((r) => {
      r.promisedDate = promisedDate;
      r.dueAt = startOfDayMs(promisedDate) + 10 * 3600000;
      r.status = 'OPEN';
      if (notes !== undefined) r.notes = notes;
      r.updatedAt = Date.now();
    });
  });
}

/** Marks promises whose date passed without a collection as BROKEN (called on app focus). */
export async function sweepBrokenPromises() {
  const now = Date.now();
  const open = await tables.followUps().query(Q.where('status', 'OPEN'), Q.where('type', 'PTP'), Q.where('due_at', Q.lt(now - 86400000))).fetch();
  if (open.length === 0) return 0;
  await database.write(async () => {
    for (const f of open) {
      const paid = await tables
        .collections()
        .query(Q.where('customer_id', f.customerId), Q.where('collected_at', Q.gte(f.createdAt)))
        .fetchCount();
      await f.update((r) => {
        r.status = paid > 0 ? 'DONE' : 'BROKEN';
        r.completedAt = now;
        r.updatedAt = now;
      });
    }
  });
  return open.length;
}

// ─── Day sessions ────────────────────────────────────────────────────────────

export async function startDay(note?: string | null): Promise<DaySession> {
  const today = todayYmd();
  const existing = await tables.daySessions().query(Q.where('date', today)).fetch();
  if (existing[0]) return existing[0];
  const pos = await position();
  return database.write(() =>
    tables.daySessions().create((r) => {
      r._raw.id = newId();
      r.date = today;
      r.startedAt = Date.now();
      r.endedAt = null;
      r.startLat = pos?.latitude ?? null;
      r.startLng = pos?.longitude ?? null;
      r.endLat = null;
      r.endLng = null;
      r.startNote = note?.trim() || null;
      r.endNote = null;
      r.cashInHandEnd = null;
      r.status = 'OPEN';
      r.updatedAt = Date.now();
    })
  );
}

export async function endDay(session: DaySession, cashInHand: number, note?: string | null) {
  const pos = await position();
  await database.write(async () => {
    await session.update((r) => {
      r.endedAt = Date.now();
      r.endLat = pos?.latitude ?? null;
      r.endLng = pos?.longitude ?? null;
      r.endNote = note?.trim() || null;
      r.cashInHandEnd = round2(cashInHand);
      r.status = 'CLOSED';
      r.updatedAt = Date.now();
    });
  });
}

// ─── Cash handover ───────────────────────────────────────────────────────────

export interface NewHandoverInput {
  amount: number;
  mode: HandoverMode;
  referenceNo?: string | null;
  bankName?: string | null;
  notes?: string | null;
  photos: { kind: AttachmentKind; photo: CapturedPhoto }[];
}

export async function createHandover(input: NewHandoverInput): Promise<Handover> {
  const id = newId();
  const now = Date.now();
  return database.write(async () => {
    const h = await tables.handovers().create((r) => {
      r._raw.id = id;
      r.receiptNo = null;
      r.date = todayYmd();
      r.amount = round2(input.amount);
      r.mode = input.mode;
      r.referenceNo = input.referenceNo?.trim() || null;
      r.bankName = input.bankName?.trim() || null;
      r.notes = input.notes?.trim() || null;
      r.attachments = [];
      r.status = 'PENDING';
      r.syncError = null;
      r.createdAt = now;
      r.updatedAt = now;
    });
    await addPhotos(id, 'handover', input.photos);
    return h;
  });
}

/** Cash collected minus cash handed over, since the beginning of `sinceMs` (default: all time). */
export async function cashInHand(sinceMs = 0): Promise<{ collected: number; handedOver: number; inHand: number }> {
  const cols: Collection[] = await tables
    .collections()
    .query(Q.where('payment_mode', 'Cash'), Q.where('status', Q.notEq('FAILED')), Q.where('collected_at', Q.gte(sinceMs)))
    .fetch();
  const hos = await tables.handovers().query(Q.where('status', Q.notEq('REJECTED')), Q.where('created_at', Q.gte(sinceMs))).fetch();
  const collected = round2(cols.reduce((s, c) => s + c.amount, 0));
  const handedOver = round2(hos.reduce((s, h) => s + h.amount, 0));
  return { collected, handedOver, inHand: round2(collected - handedOver) };
}

export async function todaysSummary() {
  const from = startOfDayMs();
  const to = endOfDayMs();
  const cols = await tables.collections().query(Q.where('collected_at', Q.between(from, to)), Q.where('status', Q.notEq('FAILED'))).fetch();
  const byMode: Record<string, { count: number; amount: number }> = {};
  for (const c of cols) {
    byMode[c.paymentMode] = byMode[c.paymentMode] || { count: 0, amount: 0 };
    byMode[c.paymentMode].count += 1;
    byMode[c.paymentMode].amount = round2(byMode[c.paymentMode].amount + c.amount);
  }
  const visits = await tables.visits().query(Q.where('planned_date', todayYmd())).fetch();
  const orders = await tables.orders().query(Q.where('order_date', todayYmd()), Q.where('status', Q.notEq('FAILED'))).fetch();
  const followUps = await tables.followUps().query(Q.where('created_at', Q.between(from, to))).fetchCount();
  const expenses = await tables.expenses().query(Q.where('date', todayYmd())).fetch();
  return {
    collections: { count: cols.length, amount: round2(cols.reduce((s, c) => s + c.amount, 0)), byMode },
    visits: {
      planned: visits.filter((v) => v.status !== 'SKIPPED').length,
      completed: visits.filter((v) => v.status === 'COMPLETED').length,
      productive: visits.filter((v) => v.status === 'COMPLETED' && v.outcome && v.outcome !== 'NO_ACTION').length,
      skipped: visits.filter((v) => v.status === 'SKIPPED').length,
    },
    orders: { count: orders.length, amount: round2(orders.reduce((s, o) => s + o.totalAmount, 0)) },
    followUps,
    expenses: { count: expenses.length, amount: round2(expenses.reduce((s, e) => s + e.amount, 0)) },
  };
}

// ─── Expense claims ──────────────────────────────────────────────────────────

export interface NewExpenseInput {
  date?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod?: string;
  notes?: string | null;
  photos: { kind: AttachmentKind; photo: CapturedPhoto }[];
}

export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const id = newId();
  const now = Date.now();
  return database.write(async () => {
    const e = await tables.expenses().create((r) => {
      r._raw.id = id;
      r.expenseNumber = null;
      r.date = input.date || todayYmd();
      r.category = input.category;
      r.description = input.description.trim();
      r.amount = round2(input.amount);
      r.paymentMethod = input.paymentMethod || 'Cash';
      r.notes = input.notes?.trim() || null;
      r.attachments = [];
      r.status = 'SUBMITTED';
      r.reviewNote = null;
      r.syncError = null;
      r.createdAt = now;
      r.updatedAt = now;
    });
    await addPhotos(id, 'expense', input.photos);
    return e;
  });
}

// ─── Leads (new outlets) ─────────────────────────────────────────────────────

export interface NewLeadInput {
  firmName: string;
  contactName?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  photos: { kind: AttachmentKind; photo: CapturedPhoto }[];
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const id = newId();
  const now = Date.now();
  return database.write(async () => {
    const l = await tables.leads().create((r) => {
      r._raw.id = id;
      r.firmName = input.firmName.trim();
      r.contactName = input.contactName?.trim() || null;
      r.mobile = input.mobile?.trim() || null;
      r.email = input.email?.trim() || null;
      r.gstin = input.gstin?.trim().toUpperCase() || null;
      r.addressLine = input.addressLine?.trim() || null;
      r.city = input.city?.trim() || null;
      r.state = input.state?.trim() || null;
      r.pincode = input.pincode?.trim() || null;
      r.latitude = input.latitude ?? null;
      r.longitude = input.longitude ?? null;
      r.notes = input.notes?.trim() || null;
      r.attachments = [];
      r.status = 'SUBMITTED';
      r.customerId = null;
      r.customerCode = null;
      r.syncError = null;
      r.createdAt = now;
      r.updatedAt = now;
    });
    await addPhotos(id, 'lead', input.photos);
    return l;
  });
}

export { position as currentPosition };

export async function markReceiptShared(c: Collection) {
  await database.write(async () => {
    await c.update((r) => {
      r.sharedAt = Date.now();
    });
  });
}
