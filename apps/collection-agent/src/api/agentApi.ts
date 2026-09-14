import { apiClient, unwrap } from './client';
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
  return {
    accessToken: data?.tokens?.accessToken,
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
  const res = await apiClient.get('/agent/me/summary');
  return unwrap<AgentSummary>(res) ?? {};
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
  const res = await apiClient.get('/agent/assignments', { params });
  const data = unwrap<any>(res);
  return (Array.isArray(data) ? data : data?.items ?? []) as Assignment[];
}

export async function fetchAssignment(id: string): Promise<Assignment> {
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

function appendFile(form: FormData, field: string, uri?: string | null) {
  if (!uri) return;
  const filename = uri.split('/').pop() || `${field}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase() ?? 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  // React Native FormData file shape.
  form.append(field, { uri, name: filename, type } as unknown as Blob);
}

export async function submitCollection(input: SubmitCollectionInput): Promise<{
  record: CollectionRecord;
  assignment?: Assignment;
  receipt?: Receipt;
}> {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'proofUri' || key === 'signatureUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  appendFile(form, 'proof', input.proofUri);
  appendFile(form, 'signature', input.signatureUri);

  const res = await apiClient.post('/agent/collections', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const data = unwrap<any>(res);
  return { record: data?.record ?? data, assignment: data?.assignment, receipt: data?.receipt };
}

export async function fetchMyCollections(params: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
} = {}): Promise<CollectionRecord[]> {
  const res = await apiClient.get('/agent/collections', { params });
  const data = unwrap<any>(res);
  return (Array.isArray(data) ? data : data?.items ?? []) as CollectionRecord[];
}

export async function fetchReceipt(recordId: string): Promise<Receipt> {
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

export async function submitVisit(input: SubmitVisitInput): Promise<CollectionVisit> {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'photoUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  appendFile(form, 'photo', input.photoUri);

  const res = await apiClient.post('/agent/visits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<CollectionVisit>(res);
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
  await apiClient.post('/agent/locations', { locations });
}

export async function fetchDeposits(): Promise<AgentCashDeposit[]> {
  const res = await apiClient.get('/agent/deposits');
  const data = unwrap<any>(res);
  return (Array.isArray(data) ? data : data?.items ?? []) as AgentCashDeposit[];
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

export async function submitDeposit(input: SubmitDepositInput): Promise<AgentCashDeposit> {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === 'proofUri' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  appendFile(form, 'proof', input.proofUri);

  const res = await apiClient.post('/agent/deposits', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<AgentCashDeposit>(res);
}

export async function registerPushToken(input: {
  pushToken: string;
  platform: string;
  deviceName?: string;
  appName?: string;
}): Promise<void> {
  await apiClient.post('/agent/push-token', input);
}

export async function fetchHistory(params: { fromDate?: string; toDate?: string } = {}): Promise<HistoryEntry[]> {
  const res = await apiClient.get('/agent/history', { params });
  const data = unwrap<any>(res);
  return (Array.isArray(data) ? data : data?.items ?? []) as HistoryEntry[];
}

export async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger> {
  const res = await apiClient.get(`/agent/customers/${customerId}/ledger`);
  return unwrap<CustomerLedger>(res);
}
