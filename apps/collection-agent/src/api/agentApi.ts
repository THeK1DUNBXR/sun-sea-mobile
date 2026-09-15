import * as FileSystem from 'expo-file-system';

import { apiClient, unwrap } from './client';
import { isDemoMode } from '@/demo/demoMode';
import * as demoStore from '@/demo/demoStore';
import type {
  Assignment,
  AgentCashDeposit,
  AgentSummary,
  CollectionRecord,
  CollectionVisit,
  CustomerLedger,
  HistoryEntry,
  Receipt,
  User,
} from '@/types/models';

// ---------------------------------------------------------------------------
// Auth — POST /auth/login, GET /auth/me (shared with the web ERP backend)
// ---------------------------------------------------------------------------

export interface LoginResult {
  accessToken: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await apiClient.post('/auth/login', { email, password });
  const data = unwrap<any>(res);
  // The real backend (auth.controller.ts) returns a FLAT data object —
  // { accessToken, accessTokenExpiresAt, user, session } — not the nested
  // `{ tokens: { accessToken } }` shape docs/DESIGN.md describes.
  return {
    accessToken: data?.accessToken,
    user: data?.user,
  };
}

export interface MeResult {
  permissions: string[];
  isSuperAdmin: boolean;
  user?: User;
}

export async function fetchMe(): Promise<MeResult> {
  const res = await apiClient.get('/auth/me');
  const data = unwrap<any>(res);
  return {
    permissions: data?.permissions ?? [],
    isSuperAdmin: Boolean(data?.isSuperAdmin ?? data?.user?.isSuperAdmin),
    user: data?.user,
  };
}

// ---------------------------------------------------------------------------
// Agent app — /agent/*  (docs/DESIGN.md §3.2)
// ---------------------------------------------------------------------------

export async function fetchMySummary(): Promise<AgentSummary> {
  if (isDemoMode()) return demoStore.getSummary();
  const res = await apiClient.get('/agent/me/summary');
  const data = unwrap<any>(res) ?? {};
  // agent-app.service.ts getMySummary() returns assignedOutstanding /
  // collectedTodayAmount — renamed here to the shorter names the UI uses.
  return {
    assignedCount: data.assignedCount ?? 0,
    outstanding: data.assignedOutstanding ?? 0,
    collectedToday: data.collectedTodayAmount ?? 0,
    collectedTodayCount: data.collectedTodayCount ?? 0,
    visitsToday: data.visitsToday ?? 0,
    cashInHand: data.cashInHand ?? 0,
    pendingDeposits: data.pendingDeposits ?? 0,
    ptpDueToday: data.ptpDueToday ?? 0,
  };
}

export type AssignmentSort = 'due' | 'priority' | 'amount' | 'nearby';

export interface FetchAssignmentsParams {
  status?: string;
  search?: string;
  sort?: AssignmentSort;
  lat?: number;
  lng?: number;
}

export async function fetchAssignments(params: FetchAssignmentsParams = {}): Promise<Assignment[]> {
  if (isDemoMode()) return demoStore.getAssignments(params);
  const res = await apiClient.get('/agent/assignments', { params });
  const data = unwrap<any>(res);
  return (Array.isArray(data) ? data : data?.items ?? []) as Assignment[];
}

export async function fetchAssignment(id: string): Promise<Assignment> {
  if (isDemoMode()) return demoStore.getAssignment(id);
  const res = await apiClient.get(`/agent/assignments/${id}`);
  return unwrap<Assignment>(res);
}

export interface SubmitCollectionInput {
  clientRef: string;
  assignmentId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  collectedAt: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  payerName?: string;
  notes?: string;
  deviceInfo?: string;
  proofUri?: string | null;
  signatureUri?: string | null;
}

/** Whether a local file:// URI still exists on disk — a photo/signature
 * picked earlier can be gone by the time a queued item replays (OS cache
 * eviction, user clearing storage). Returns true for non-file:// schemes
 * (content://, data:) since those aren't ours to stat. */
export async function localFileExists(uri: string): Promise<boolean> {
  if (!uri.startsWith('file://') && !uri.startsWith('/')) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    // Can't tell — assume it's fine and let the upload itself fail/succeed.
    return true;
  }
}

/** Appends a picked image to the multipart form, skipping silently (rather
 * than sending a broken reference) if the file no longer exists on disk. */
async function appendFile(form: FormData, field: string, uri?: string | null): Promise<boolean> {
  if (!uri) return true;
  if (!(await localFileExists(uri))) return false;
  const filename = uri.split('/').pop() || `${field}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase() ?? 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  // React Native FormData file shape.
  form.append(field, { uri, name: filename, type } as unknown as Blob);
  return true;
}

// agent-app.service.ts serializeRecordForAgent() names these proofImageUrl /
// signatureImageUrl on the wire; normalized here to the shorter names the app
// uses everywhere else.
function mapCollectionRecord(r: any): CollectionRecord {
  return {
    ...r,
    proofUrl: r?.proofImageUrl ?? r?.proofUrl,
    signatureUrl: r?.signatureImageUrl ?? r?.signatureUrl,
  };
}

export async function submitCollection(input: SubmitCollectionInput): Promise<{
  isNew: boolean;
  record: CollectionRecord;
  assignment?: Assignment;
  receipt?: Receipt;
  droppedFiles: string[];
}> {
  if (isDemoMode()) return demoStore.submitCollection(input);
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'proofUri' || key === 'signatureUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  const droppedFiles: string[] = [];
  if (!(await appendFile(form, 'proof', input.proofUri))) droppedFiles.push('proof photo');
  if (!(await appendFile(form, 'signature', input.signatureUri))) droppedFiles.push('signature');

  const res = await apiClient.post('/agent/collections', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const data = unwrap<any>(res);
  return {
    isNew: data?.isNew ?? true,
    record: mapCollectionRecord(data?.record ?? data),
    assignment: data?.assignment,
    receipt: data?.receipt,
    droppedFiles,
  };
}

export async function fetchMyCollections(params: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
} = {}): Promise<CollectionRecord[]> {
  if (isDemoMode()) return demoStore.getCollections(params);
  const res = await apiClient.get('/agent/collections', { params });
  const data = unwrap<any>(res);
  const rows = (Array.isArray(data) ? data : data?.items ?? []) as any[];
  return rows.map(mapCollectionRecord);
}

export async function fetchReceipt(recordId: string): Promise<Receipt> {
  if (isDemoMode()) return demoStore.getReceipt(recordId);
  const res = await apiClient.get(`/agent/collections/${recordId}/receipt`);
  return unwrap<Receipt>(res);
}

export interface SubmitVisitInput {
  clientRef: string;
  assignmentId: string;
  visitedAt: string;
  outcome: string;
  promisedDate?: string;
  promisedAmount?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  photoUri?: string | null;
}

export async function submitVisit(input: SubmitVisitInput): Promise<{ visit: CollectionVisit; droppedFiles: string[] }> {
  if (isDemoMode()) return demoStore.submitVisit(input);
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'photoUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  const droppedFiles: string[] = [];
  if (!(await appendFile(form, 'photo', input.photoUri))) droppedFiles.push('photo');

  const res = await apiClient.post('/agent/visits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { visit: unwrap<CollectionVisit>(res), droppedFiles };
}

export interface LocationPing {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  batteryLevel?: number | null;
  isMoving?: boolean;
  source?: string;
  recordedAt: string;
}

export async function pushLocations(locations: LocationPing[]): Promise<void> {
  if (locations.length === 0) return;
  if (isDemoMode()) return; // No backend to report to — breadcrumbs are dropped.
  await apiClient.post('/agent/locations', { locations });
}

function mapDeposit(d: any): AgentCashDeposit {
  return { ...d, proofUrl: d?.proofImageUrl ?? d?.proofUrl };
}

export async function fetchDeposits(): Promise<AgentCashDeposit[]> {
  if (isDemoMode()) return demoStore.getDeposits();
  const res = await apiClient.get('/agent/deposits');
  const data = unwrap<any>(res);
  const rows = (Array.isArray(data) ? data : data?.items ?? []) as any[];
  return rows.map(mapDeposit);
}

export interface SubmitDepositInput {
  clientRef: string;
  amount: number;
  depositedAt: string;
  method?: string;
  referenceNumber?: string;
  notes?: string;
  proofUri?: string | null;
}

export async function submitDeposit(input: SubmitDepositInput): Promise<{ deposit: AgentCashDeposit; droppedFiles: string[] }> {
  if (isDemoMode()) return demoStore.submitDeposit(input);
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'proofUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  const droppedFiles: string[] = [];
  if (!(await appendFile(form, 'proof', input.proofUri))) droppedFiles.push('proof photo');

  const res = await apiClient.post('/agent/deposits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { deposit: mapDeposit(unwrap<any>(res)), droppedFiles };
}

export async function registerPushToken(input: {
  pushToken: string;
  platform: string;
  deviceName?: string;
  appName?: string;
}): Promise<void> {
  if (isDemoMode()) return; // No backend to register with in the demo.
  await apiClient.post('/agent/push-token', input);
}

// agent-app.service.ts getHistory() returns a raw timeline of
// { type, at, id, amount?, status?, invoiceNo?, customerName?, outcome? } —
// mapped here into the {kind, occurredAt, title, subtitle} shape the History
// screen renders.
function mapHistoryEntry(raw: any): HistoryEntry {
  const kind: HistoryEntry['kind'] = raw?.type ?? 'collection';
  const customerName = raw?.customerName ?? undefined;
  let title = customerName ?? 'Activity';
  let subtitle: string | undefined = raw?.invoiceNo;
  if (kind === 'visit') {
    title = customerName ?? 'Visit';
    const outcomeLabel = typeof raw?.outcome === 'string' ? raw.outcome.replace(/_/g, ' ').toLowerCase() : undefined;
    subtitle = [raw?.invoiceNo, outcomeLabel].filter(Boolean).join(' · ') || undefined;
  } else if (kind === 'deposit') {
    title = 'Cash deposit';
    subtitle = undefined;
  }
  return {
    id: raw?.id,
    kind,
    occurredAt: raw?.at,
    title,
    subtitle,
    amount: raw?.amount,
    status: raw?.status,
  };
}

export async function fetchHistory(params: { fromDate?: string; toDate?: string } = {}): Promise<HistoryEntry[]> {
  if (isDemoMode()) return demoStore.getHistory(params);
  const res = await apiClient.get('/agent/history', { params });
  const data = unwrap<any>(res);
  const rows = (Array.isArray(data) ? data : data?.items ?? []) as any[];
  return rows.map(mapHistoryEntry);
}

export async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger> {
  if (isDemoMode()) return demoStore.getCustomerLedger(customerId);
  const res = await apiClient.get(`/agent/customers/${customerId}/ledger`);
  const data = unwrap<any>(res);
  // agent-app.service.ts getCustomerLedger() names the array `invoices`.
  return { ...data, outstandingInvoices: data?.invoices ?? data?.outstandingInvoices ?? [] };
}
