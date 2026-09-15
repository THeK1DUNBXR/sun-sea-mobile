import { colors } from './theme';
import type {
  AssignmentStatus,
  DepositStatus,
  CollectionRecordStatus,
  PaymentMethod,
  VisitOutcome,
} from '@/types/models';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatMoney(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '₹0';
  return inrFormatter.format(amount);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

const ones = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`;
}

function threeDigits(n: number): string {
  if (n < 100) return twoDigits(n);
  return `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ' ' + twoDigits(n % 100) : ''}`;
}

/** Amount in words using the Indian numbering system (lakh/crore) — used on receipts. */
export function amountInWords(amount: number): string {
  const rupees = Math.round(amount);
  if (rupees === 0) return 'Zero rupees only';
  let n = rupees;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const words = parts.join(' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupees only`;
}

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface StatusMeta {
  label: string;
  tone: Tone;
  color: string;
}

/** Single source of truth for how an assignment status reads everywhere
 * (list rows, filter chips, detail header) so the vocabulary never drifts
 * screen to screen. Labels say the next step or outcome in plain words
 * rather than the backend's enum spelling. */
export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, StatusMeta> = {
  PENDING: { label: 'To collect', tone: 'default', color: colors.textMuted },
  IN_PROGRESS: { label: 'In progress', tone: 'info', color: colors.info },
  PARTIALLY_COLLECTED: { label: 'Partly collected', tone: 'warning', color: colors.warning },
  COLLECTED: { label: 'Collected', tone: 'success', color: colors.success },
  UNCOLLECTED: { label: 'Not collected', tone: 'danger', color: colors.danger },
  CANCELLED: { label: 'Cancelled', tone: 'default', color: colors.textFaint },
};

export function assignmentStatusMeta(status?: AssignmentStatus | string | null): StatusMeta {
  if (status && status in ASSIGNMENT_STATUS_META) return ASSIGNMENT_STATUS_META[status as AssignmentStatus];
  return { label: status ?? 'Unknown', tone: 'default', color: colors.textMuted };
}

export const DEPOSIT_STATUS_META: Record<DepositStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'default', color: colors.textMuted },
  ACCEPTED: { label: 'Accepted', tone: 'success', color: colors.success },
  REJECTED: { label: 'Rejected', tone: 'danger', color: colors.danger },
};

export const RECORD_STATUS_META: Record<CollectionRecordStatus, StatusMeta> = {
  PENDING_VERIFICATION: { label: 'Pending review', tone: 'warning', color: colors.warning },
  VERIFIED: { label: 'Verified', tone: 'success', color: colors.success },
  REJECTED: { label: 'Rejected', tone: 'danger', color: colors.danger },
};

/** Payment method as an agent or customer would say it — kept short since it
 * also drives the payment-method chips on the collection form. UPI stays as
 * UPI (the audience's own term for it); every other value is written out in
 * plain words instead of the backend's ALL_CAPS spelling. */
export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string }> = {
  CASH: { label: 'Cash' },
  UPI: { label: 'UPI' },
  CHEQUE: { label: 'Cheque' },
  BANK_TRANSFER: { label: 'Bank transfer' },
  CARD: { label: 'Card' },
  OTHER: { label: 'Other' },
};

export function paymentMethodLabel(method?: PaymentMethod | string | null): string {
  if (method && method in PAYMENT_METHOD_META) return PAYMENT_METHOD_META[method as PaymentMethod].label;
  return method ?? '—';
}

/** Visit outcome vocabulary, shared between the visit form's outcome chips
 * and every place a past visit's outcome is read back (assignment detail,
 * history). PTP is written out as "Promise to pay" everywhere it's shown to
 * an agent; the short "PTP" tag stays only as a compact badge elsewhere. */
export const VISIT_OUTCOME_META: Record<VisitOutcome, StatusMeta> = {
  COLLECTED: { label: 'Collected', tone: 'success', color: colors.success },
  PARTIAL_COLLECTED: { label: 'Partly collected', tone: 'warning', color: colors.warning },
  CUSTOMER_UNAVAILABLE: { label: 'Customer unavailable', tone: 'default', color: colors.textMuted },
  PROMISED_TO_PAY: { label: 'Promise to pay', tone: 'warning', color: colors.warning },
  REFUSED: { label: 'Refused to pay', tone: 'danger', color: colors.danger },
  DISPUTE: { label: 'Customer disputes amount', tone: 'danger', color: colors.danger },
  WRONG_ADDRESS: { label: 'Wrong address', tone: 'default', color: colors.textMuted },
  OTHER: { label: 'Other', tone: 'default', color: colors.textMuted },
};

export function visitOutcomeLabel(outcome?: VisitOutcome | string | null): string {
  if (outcome && outcome in VISIT_OUTCOME_META) return VISIT_OUTCOME_META[outcome as VisitOutcome].label;
  return outcome ?? 'Unknown outcome';
}

/** Turns a raw SCREAMING_SNAKE_CASE or ALL_CAPS value the backend sends into
 * a readable phrase, for any status the app doesn't otherwise have a named
 * mapping for (e.g. the generic history-entry status line) — so a value the
 * app hasn't seen yet still reads as English instead of leaking a wire code. */
export function humanizeStatus(value?: string | null): string {
  if (!value) return '—';
  const words = value.toLowerCase().split(/[_\s]+/).filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** History-entry status label: tries the record/deposit vocabularies first
 * (a history row's status is one of those two shapes), then falls back to a
 * humanized version of whatever the backend sent rather than the raw code. */
export function historyStatusLabel(status?: string | null): string {
  if (!status) return '—';
  if (status in RECORD_STATUS_META) return RECORD_STATUS_META[status as CollectionRecordStatus].label;
  if (status in DEPOSIT_STATUS_META) return DEPOSIT_STATUS_META[status as DepositStatus].label;
  return humanizeStatus(status);
}

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: colors.priorityLow,
  NORMAL: colors.priorityNormal,
  HIGH: colors.priorityHigh,
  URGENT: colors.priorityUrgent,
};

/** Color for the priority marker dot — falls back to the normal brand tone
 * for any value the server sends that isn't one of the four known levels. */
export function priorityColor(priority?: string | null): string {
  if (priority && priority in PRIORITY_COLOR) return PRIORITY_COLOR[priority as Priority];
  return colors.priorityNormal;
}

/** Two-letter initials for a customer/agent avatar mark. */
export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Haversine distance in km — used for "nearby" sort fallback on-device. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
