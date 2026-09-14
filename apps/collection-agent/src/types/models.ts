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
  | 'WRONG_ADDRESS'
  | 'OTHER';

export type DepositStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// Matches the shape the real backend returns for a sales invoice line
// (agent-app.service.ts serializeRecordForAgent / getMyAssignments): the
// product name plus quantity/unitPrice/lineTotal, not a generic description.
export interface InvoiceItem {
  id?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
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

// The backend stores each CustomerAddress as { id, label, isDefault, address:
// <freeform JSON>, latitude?, longitude? } — lat/lng are hoisted to the top
// level only when they can be parsed out of the JSON blob (extractLatLng),
// while the postal fields (addressLine1/addressLine2/city/state/pincode) stay
// nested under `address` exactly as the web ERP customer form writes them.
export interface CustomerAddressDetail {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface CustomerAddress {
  id?: string;
  label?: string;
  isDefault?: boolean;
  address?: CustomerAddressDetail;
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
  // Normalized in api/agentApi.ts from the backend's proofImageUrl/signatureImageUrl.
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
  rejectionReason?: string;
  // Normalized in api/agentApi.ts from the backend's proofImageUrl.
  proofUrl?: string;
}

// Field names here match what api/agentApi.ts's fetchMySummary adapter
// produces from GET /agent/me/summary — the raw response instead uses
// assignedOutstanding / collectedTodayAmount (see agent-app.service.ts).
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

// Field names here match what api/agentApi.ts's fetchHistory adapter produces
// from GET /agent/history — the raw timeline entries use `type`/`at` and have
// no ready-made title/subtitle (see agent-app.service.ts getHistory).
export interface HistoryEntry {
  id: string;
  kind: 'collection' | 'visit' | 'deposit';
  occurredAt: string;
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string;
}

// `invoices` on the wire (agent-app.service.ts getCustomerLedger); renamed to
// outstandingInvoices by the fetchCustomerLedger adapter for a clearer name
// in the UI (every invoice returned there already has outstanding > 0... in
// practice some may be fully paid historical rows, so treat as "invoices").
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

// Matches auth.service.ts formatUserResponse exactly (POST /auth/login →
// data.user, GET /auth/me → data.user): userId/fullName, no `phone` field —
// the agent's phone isn't part of the auth payload.
export interface User {
  userId: string;
  fullName?: string;
  email?: string;
  username?: string;
  status?: string;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
}
