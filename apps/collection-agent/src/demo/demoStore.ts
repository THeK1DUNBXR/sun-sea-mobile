// Mutable in-memory backing store for demo mode — lets "Explore the demo"
// behave like a real backend for the length of the session: submitting a
// collection actually reduces the assignment's outstanding balance, adding a
// deposit actually shows up pending, and the history/summary/receipt screens
// reflect it immediately. Reset whenever demo mode is (re)entered so repeat
// demo sessions always start from the same seeded data (see enterDemo() in
// store/auth.tsx).

import { demoCollectionsSeed, demoCompany, demoDepositsSeed, demoHistorySeed, demoAssignmentsSeed, demoUser } from './fixtures';
import type {
  AgentCashDeposit,
  AgentSummary,
  Assignment,
  CollectionRecord,
  CollectionRecordSummary,
  CollectionVisit,
  CollectionVisitSummary,
  CustomerLedger,
  DepositStatus,
  HistoryEntry,
  Receipt,
} from '@/types/models';
import type {
  FetchAssignmentsParams,
  SubmitCollectionInput,
  SubmitDepositInput,
  SubmitVisitInput,
} from '@/api/agentApi';

interface DemoState {
  assignments: Assignment[];
  deposits: AgentCashDeposit[];
  collections: CollectionRecord[];
  visits: CollectionVisit[];
  history: HistoryEntry[];
  cashInHand: number;
}

let state: DemoState | null = null;
let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

/** Plain-JSON deep clone — every fixture is JSON-safe (no functions/dates as
 * objects), so this is enough to give each demo session its own copies
 * instead of mutating the shared seed arrays. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function seedState(): DemoState {
  return {
    assignments: clone(demoAssignmentsSeed),
    deposits: clone(demoDepositsSeed),
    collections: clone(demoCollectionsSeed),
    visits: [],
    history: clone(demoHistorySeed),
    cashInHand: 6500,
  };
}

function ensure(): DemoState {
  if (!state) state = seedState();
  return state;
}

/** Called from enterDemo() so every demo session starts fresh. */
export function resetDemoStore(): void {
  state = seedState();
}

const ACTIVE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'PARTIALLY_COLLECTED']);

function isSameDay(iso: string | null | undefined, reference: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.toDateString() === reference.toDateString();
}

export function getSummary(): AgentSummary {
  const s = ensure();
  const today = new Date();
  const assignedCount = s.assignments.filter((a) => ACTIVE_STATUSES.has(a.status)).length;
  const outstanding = s.assignments.reduce((sum, a) => {
    const remaining = (a.invoice.outstanding ?? 0) - (a.amountCollected ?? 0);
    return sum + Math.max(0, remaining);
  }, 0);
  const collectedTodayRecords = s.collections.filter((r) => isSameDay(r.collectedAt, today));
  const collectedToday = collectedTodayRecords.reduce((sum, r) => sum + r.amount, 0);
  const visitsToday = s.visits.filter((v) => isSameDay(v.visitedAt, today)).length;
  const pendingDeposits = s.deposits.filter((d) => d.status === 'PENDING').length;
  const ptpDueToday = s.assignments.filter((a) => isSameDay(a.promise?.promisedDate, today)).length;
  return {
    assignedCount,
    outstanding,
    collectedToday,
    collectedTodayCount: collectedTodayRecords.length,
    visitsToday,
    cashInHand: Math.max(0, s.cashInHand),
    pendingDeposits,
    ptpDueToday,
  };
}

export function getAssignments(params: FetchAssignmentsParams = {}): Assignment[] {
  const s = ensure();
  let list = s.assignments.slice();
  if (params.status) list = list.filter((a) => a.status === params.status);
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (a) =>
        (a.customer.displayName ?? a.customer.firmName ?? '').toLowerCase().includes(q) ||
        (a.invoice.invoiceNo ?? '').toLowerCase().includes(q),
    );
  }
  switch (params.sort) {
    case 'amount':
      list.sort((a, b) => (b.invoice.outstanding ?? 0) - (a.invoice.outstanding ?? 0));
      break;
    case 'priority': {
      const rank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      list.sort((a, b) => (rank[a.priority ?? 'NORMAL'] ?? 2) - (rank[b.priority ?? 'NORMAL'] ?? 2));
      break;
    }
    case 'nearby':
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      break;
    case 'due':
    default:
      list.sort((a, b) => new Date(a.targetDate ?? 0).getTime() - new Date(b.targetDate ?? 0).getTime());
  }
  return list;
}

export function getAssignment(id: string): Assignment {
  const s = ensure();
  const found = s.assignments.find((a) => a.id === id);
  if (!found) throw new Error('Assignment not found in the demo.');
  return found;
}

function receiptFor(record: CollectionRecord, assignment: Assignment | undefined): Receipt {
  return {
    receiptNo: record.receiptNo,
    company: demoCompany,
    customer: assignment?.customer,
    invoice: assignment?.invoice,
    amount: record.amount,
    paymentMethod: record.paymentMethod,
    collectedAt: record.collectedAt,
    agentName: demoUser.fullName,
  };
}

export function submitCollection(input: SubmitCollectionInput): {
  isNew: boolean;
  record: CollectionRecord;
  assignment: Assignment;
  receipt: Receipt;
  droppedFiles: string[];
} {
  const s = ensure();
  const assignment = s.assignments.find((a) => a.id === input.assignmentId);
  if (!assignment) throw new Error('Assignment not found in the demo.');

  const existing = s.collections.find((r) => r.clientRef === input.clientRef);
  if (existing) {
    return { isNew: false, record: existing, assignment, receipt: receiptFor(existing, assignment), droppedFiles: [] };
  }

  const receiptNo = `DEMO-${1000 + s.collections.length}`;
  const record: CollectionRecord = {
    id: nextId('demo-rec'),
    clientRef: input.clientRef,
    assignmentId: input.assignmentId,
    amount: input.amount,
    paymentMethod: input.paymentMethod as CollectionRecord['paymentMethod'],
    referenceNumber: input.referenceNumber,
    chequeNumber: input.chequeNumber,
    chequeDate: input.chequeDate,
    bankName: input.bankName,
    payerName: input.payerName,
    notes: input.notes,
    status: 'VERIFIED',
    receiptNo,
    collectedAt: input.collectedAt,
    latitude: input.latitude,
    longitude: input.longitude,
    locationAccuracy: input.locationAccuracy,
    proofUrl: input.proofUri ?? undefined,
    signatureUrl: input.signatureUri ?? undefined,
  };
  s.collections = [record, ...s.collections];

  const outstanding = assignment.invoice.outstanding ?? 0;
  const newCollected = Math.round(((assignment.amountCollected ?? 0) + input.amount) * 100) / 100;
  assignment.amountCollected = newCollected;
  const summary: CollectionRecordSummary = {
    id: record.id,
    amount: record.amount,
    paymentMethod: record.paymentMethod,
    status: record.status,
    receiptNo: record.receiptNo,
    collectedAt: record.collectedAt,
  };
  assignment.records = [...(assignment.records ?? []), summary];
  assignment.status = newCollected >= outstanding - 0.01 ? 'COLLECTED' : 'PARTIALLY_COLLECTED';
  assignment.lastVisitAt = input.collectedAt;

  if (input.paymentMethod === 'CASH') s.cashInHand += input.amount;

  const customerLabel = assignment.customer.displayName ?? assignment.customer.firmName ?? 'Customer';
  s.history = [
    {
      id: record.id,
      kind: 'collection',
      occurredAt: input.collectedAt,
      title: customerLabel,
      subtitle: [assignment.invoice.invoiceNo, input.paymentMethod.toLowerCase()].filter(Boolean).join(' · '),
      amount: input.amount,
      status: record.status,
    },
    ...s.history,
  ];

  return { isNew: true, record, assignment, receipt: receiptFor(record, assignment), droppedFiles: [] };
}

export function getCollections(params: { fromDate?: string; toDate?: string; status?: string } = {}): CollectionRecord[] {
  const s = ensure();
  let list = s.collections.slice();
  if (params.status) list = list.filter((r) => r.status === params.status);
  if (params.fromDate) list = list.filter((r) => !r.collectedAt || r.collectedAt >= params.fromDate!);
  if (params.toDate) list = list.filter((r) => !r.collectedAt || r.collectedAt <= params.toDate!);
  return list;
}

export function getReceipt(recordId: string): Receipt {
  const s = ensure();
  const record = s.collections.find((r) => r.id === recordId);
  if (!record) throw new Error('Receipt not found in the demo.');
  const assignment = s.assignments.find((a) => a.id === record.assignmentId);
  return receiptFor(record, assignment);
}

export function submitVisit(input: SubmitVisitInput): { visit: CollectionVisit; droppedFiles: string[] } {
  const s = ensure();
  const assignment = s.assignments.find((a) => a.id === input.assignmentId);
  if (!assignment) throw new Error('Assignment not found in the demo.');

  const existing = s.visits.find((v) => v.clientRef === input.clientRef);
  if (existing) return { visit: existing, droppedFiles: [] };

  const visit: CollectionVisit = {
    id: nextId('demo-visit'),
    clientRef: input.clientRef,
    assignmentId: input.assignmentId,
    visitedAt: input.visitedAt,
    outcome: input.outcome as CollectionVisit['outcome'],
    promisedDate: input.promisedDate,
    promisedAmount: input.promisedAmount,
    notes: input.notes,
    latitude: input.latitude,
    longitude: input.longitude,
    photoUrl: input.photoUri ?? undefined,
  };
  s.visits = [visit, ...s.visits];

  const summary: CollectionVisitSummary = { id: visit.id, visitedAt: visit.visitedAt, outcome: visit.outcome, notes: visit.notes };
  assignment.visits = [...(assignment.visits ?? []), summary];
  assignment.lastVisit = summary;
  assignment.lastVisitAt = visit.visitedAt;
  if (assignment.status === 'PENDING') assignment.status = 'IN_PROGRESS';
  if (input.outcome === 'PROMISED_TO_PAY' && input.promisedDate) {
    assignment.promise = { promisedDate: input.promisedDate, promisedAmount: input.promisedAmount };
  }

  const customerLabel = assignment.customer.displayName ?? assignment.customer.firmName ?? 'Customer';
  const outcomeLabel = input.outcome.replace(/_/g, ' ').toLowerCase();
  s.history = [
    {
      id: visit.id,
      kind: 'visit',
      occurredAt: input.visitedAt,
      title: customerLabel,
      subtitle: [assignment.invoice.invoiceNo, outcomeLabel].filter(Boolean).join(' · '),
    },
    ...s.history,
  ];

  return { visit, droppedFiles: [] };
}

export function getDeposits(): AgentCashDeposit[] {
  return ensure().deposits.slice();
}

export function submitDeposit(input: SubmitDepositInput): { deposit: AgentCashDeposit; droppedFiles: string[] } {
  const s = ensure();
  const existing = s.deposits.find((d) => d.clientRef === input.clientRef);
  if (existing) return { deposit: existing, droppedFiles: [] };

  const deposit: AgentCashDeposit = {
    id: nextId('demo-dep'),
    clientRef: input.clientRef,
    amount: input.amount,
    depositedAt: input.depositedAt,
    method: input.method,
    referenceNumber: input.referenceNumber,
    notes: input.notes,
    status: 'PENDING' as DepositStatus,
    proofUrl: input.proofUri ?? undefined,
  };
  s.deposits = [deposit, ...s.deposits];
  s.cashInHand = Math.max(0, s.cashInHand - input.amount);

  s.history = [
    { id: deposit.id, kind: 'deposit', occurredAt: input.depositedAt, title: 'Cash deposit', amount: input.amount, status: deposit.status },
    ...s.history,
  ];

  return { deposit, droppedFiles: [] };
}

export function getHistory(params: { fromDate?: string; toDate?: string } = {}): HistoryEntry[] {
  const s = ensure();
  let list = s.history.slice();
  if (params.fromDate) list = list.filter((h) => h.occurredAt >= params.fromDate!);
  if (params.toDate) list = list.filter((h) => h.occurredAt <= params.toDate!);
  return list;
}

export function getCustomerLedger(customerId: string): CustomerLedger {
  const s = ensure();
  const assignment = s.assignments.find((a) => a.customer.id === customerId);
  if (!assignment) throw new Error('Customer not found in the demo.');
  const remaining = Math.max(0, (assignment.invoice.outstanding ?? 0) - (assignment.amountCollected ?? 0));
  const outstandingInvoices = remaining > 0 ? [{ ...assignment.invoice, outstanding: remaining }] : [];
  const recentReceipts = s.collections
    .filter((r) => r.assignmentId === assignment.id)
    .map((r): CollectionRecordSummary => ({ id: r.id, amount: r.amount, paymentMethod: r.paymentMethod, status: r.status, receiptNo: r.receiptNo, collectedAt: r.collectedAt }));
  return { customer: assignment.customer, outstandingInvoices, recentReceipts };
}
