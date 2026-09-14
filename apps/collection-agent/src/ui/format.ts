import { colors } from './theme';
import type { AssignmentStatus, DepositStatus, CollectionRecordStatus } from '@/types/models';

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
 * (list rows, detail header) so the vocabulary never drifts screen to screen. */
export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'default', color: colors.textMuted },
  IN_PROGRESS: { label: 'In progress', tone: 'info', color: colors.info },
  PARTIALLY_COLLECTED: { label: 'Partially collected', tone: 'warning', color: colors.warning },
  COLLECTED: { label: 'Collected', tone: 'success', color: colors.success },
  UNCOLLECTED: { label: 'Uncollected', tone: 'danger', color: colors.danger },
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
