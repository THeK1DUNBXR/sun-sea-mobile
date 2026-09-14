// Shared types for the Insights app. Kept intentionally loose (lots of optional
// fields) because the backend is being built concurrently against docs/DESIGN.md.

export interface User {
  id: string;
  name?: string;
  email?: string;
  isSuperAdmin?: boolean;
  role?: { name?: string } | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  tokens: { accessToken: string; refreshToken?: string };
  user: User;
}

export interface MeResponse {
  user?: User;
  permissions?: string[];
  isSuperAdmin?: boolean;
  profile?: { isSuperAdmin?: boolean } & Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SalesSnapshot {
  today?: number;
  yesterday?: number;
  mtd?: number;
  lastMtd?: number;
  pctChange?: number;
}

export interface CollectionsSnapshot {
  today?: number;
  mtd?: number;
  pendingVerification?: number;
  cashInHand?: number;
}

export interface AgingBuckets {
  '0_30'?: number;
  '31_60'?: number;
  '61_90'?: number;
  '90_plus'?: number;
}

export interface TopDebtor {
  customerId?: string;
  name?: string;
  outstanding?: number;
  dueDays?: number;
}

export interface ReceivablesSnapshot {
  totalOutstanding?: number;
  overdue?: number;
  aging?: AgingBuckets;
  topDebtors?: TopDebtor[];
}

export interface LeaderboardEntry {
  agentUserId?: string;
  name?: string;
  collectedToday?: number;
  collectedMtd?: number;
  visitsToday?: number;
  pendingAssignments?: number;
}

export interface AgentsSnapshot {
  active?: number;
  total?: number;
  leaderboard?: LeaderboardEntry[];
}

export interface PtpSnapshot {
  dueToday?: number;
  overdue?: number;
}

export interface OverviewResponse {
  sales?: SalesSnapshot;
  collections?: CollectionsSnapshot;
  receivables?: ReceivablesSnapshot;
  agents?: AgentsSnapshot;
  ptp?: PtpSnapshot;
  production?: Record<string, unknown>;
  generatedAt?: string;
}

export interface TrendPoint {
  date: string;
  sales?: number;
  collections?: number;
  invoicesCount?: number;
}

export interface LiveAgent {
  agentUserId: string;
  name?: string;
  online?: boolean;
  latitude?: number;
  longitude?: number;
  recordedAt?: string;
  collectedToday?: number;
  assignmentsPending?: number;
  currentTask?: { customerName?: string; address?: string } | null;
  batteryLevel?: number;
  speed?: number;
}

export interface ActivityItem {
  id: string;
  type: 'invoice' | 'collection' | 'deposit' | string;
  title?: string;
  subtitle?: string;
  amount?: number;
  occurredAt: string;
  [key: string]: unknown;
}
