// Shared domain types mirrored from docs/DESIGN.md §3.2 (agent app API).
// The backend is developed concurrently against the same contract, so every
// field here is optional-safe on the consuming side (see src/api/agentApi.ts).

export type AssignmentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PARTIALLY_COLLECTED'
  | 'COLLECTED'
  | 'UNCOLLECTED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export type CollectionRecordStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

export type VisitOutcome =
  | 'COLLECTED'
  | 'PARTIAL_COLLECTED'
  | 'CUSTOMER_UNAVAILABLE'
  | 'PROMISED_TO_PAY'
  | 'REFUSED'
  | 'DISPUTE'
  | 'OTHER';

export type DepositStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface InvoiceItem {
  id?: string;
  description?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNo?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  grandTotal?: number;
  paid?: number;
  outstanding?: number;
  items?: InvoiceItem[];
}

export interface CustomerAddress {
  id?: string;
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Customer {
  id: string;
  firmName?: string;
  displayName?: string;
  phones?: string[];
  addresses?: CustomerAddress[];
  gstin?: string;
}

export interface Promise {
  promisedDate?: string;
  promisedAmount?: number;
}

export interface CollectionVisitSummary {
  id: string;
  visitedAt?: string;
  outcome?: VisitOutcome;
  notes?: string;
}

export interface CollectionRecordSummary {
  id: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  status?: CollectionRecordStatus;
  receiptNo?: string;
  collectedAt?: string;
}

export interface Assignment {
  id: string;
  status: AssignmentStatus;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  targetDate?: string | null;
  instructions?: string;
  amountCollected?: number;
  lastVisitAt?: string | null;
  invoice: Invoice;
  customer: Customer;
  lastVisit?: CollectionVisitSummary | null;
  promise?: Promise | null;
  records?: CollectionRecordSummary[];
  visits?: CollectionVisitSummary[];
  distanceKm?: number;
}

export interface CollectionRecord {
  id: string;
  clientRef?: string;
  assignmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  payerName?: string;
  notes?: string;
  status: CollectionRecordStatus;
  receiptNo?: string;
  collectedAt?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  proofUrl?: string;
  signatureUrl?: string;
}

export interface CollectionVisit {
  id: string;
  clientRef?: string;
  assignmentId: string;
  visitedAt: string;
  outcome: VisitOutcome;
  promisedDate?: string;
  promisedAmount?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
}

export interface AgentCashDeposit {
  id: string;
  clientRef?: string;
  amount: number;
  depositedAt: string;
  method?: string;
  referenceNumber?: string;
  notes?: string;
  status: DepositStatus;
  proofUrl?: string;
}

export interface AgentSummary {
  assignedCount?: number;
  outstanding?: number;
  collectedToday?: number;
  collectedTodayCount?: number;
  visitsToday?: number;
  cashInHand?: number;
  pendingDeposits?: number;
  ptpDueToday?: number;
}

export interface HistoryEntry {
  id: string;
  kind: 'collection' | 'visit' | 'deposit';
  occurredAt: string;
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string;
}

export interface CustomerLedger {
  customer: Customer;
  outstandingInvoices?: Invoice[];
  recentReceipts?: CollectionRecordSummary[];
}

export interface Receipt {
  receiptNo?: string;
  company?: { name?: string; address?: string; gstin?: string; phone?: string };
  customer?: Customer;
  invoice?: Invoice;
  amount?: number;
  amountInWords?: string;
  paymentMethod?: PaymentMethod;
  collectedAt?: string;
  agentName?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  isSuperAdmin?: boolean;
}
