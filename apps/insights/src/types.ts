// Shared types for the Insights app.
//
// These mirror the ACTUAL backend response shapes read from:
//   SunSea-Erp/backend/src/modules/auth/{auth.service,auth.controller}.ts
//   SunSea-Erp/backend/src/types/auth.types.ts
//   SunSea-Erp/backend/src/modules/insights/insights.service.ts
//   SunSea-Erp/backend/src/modules/agent-tracking/agent-tracking.service.ts
// rather than docs/DESIGN.md's summary — read those files before changing a shape here.
//
// Every backend success response is wrapped by ApiResponse: { success, message, data }.
// Every error response (see error.middleware.ts) is { success: false, message, errors: [] }.

export type UserStatus = 'active' | 'suspended' | 'locked';

export interface User {
  userId: string;
  fullName: string;
  email: string;
  username: string;
  roleId: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
}

/** POST /auth/login data (auth.controller.ts login handler) — flat, no nested `tokens`. */
export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: User;
  session?: {
    deviceLabel: string;
    loginAt: string;
    expiresAt: string;
  };
}

/** GET /auth/me data (authService.getProfile / ProfileResponseDto). */
export interface MeResponse {
  user: User;
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Shape of an error response body from error.middleware.ts. */
export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: Array<{ path?: string; message: string }>;
}

export interface SalesSnapshot {
  today: number;
  yesterday: number;
  mtd: number;
  lastMtd: number;
  pctChange: number;
}

export interface CollectionsSnapshot {
  today: number;
  mtd: number;
  pendingVerification: { count: number; amount: number };
  cashInHand: number;
}

export interface ReceiptsAllChannelsSnapshot {
  today: number;
  mtd: number;
}

export interface AgingBuckets {
  '0_30': number;
  '31_60': number;
  '61_90': number;
  '90_plus': number;
}

/** One row of receivableService.getReceivableSummaries(), as re-mapped in insights.service.ts. */
export interface TopDebtor {
  customerId: string;
  firmName: string;
  netBalance: number;
  overdueAmount: number;
  dueDays: number;
}

export interface ReceivablesSnapshot {
  totalOutstanding: number;
  overdue: number;
  aging: AgingBuckets;
  topDebtors: TopDebtor[];
}

export interface LeaderboardEntry {
  agentUserId: string;
  name: string;
  collectedToday: number;
  collectedMtd: number;
  visitsToday: number;
  pendingAssignments: number;
}

export interface AgentsSnapshot {
  active: number;
  total: number;
  leaderboard: LeaderboardEntry[];
}

export interface PtpSnapshot {
  dueToday: number;
  overdue: number;
}

/** Subset of getTvSummary().production, or null when the TV dashboard call failed. */
export interface ProductionSnapshot {
  planned: number;
  produced: number;
  pending: number;
  achievement: number;
}

export interface OverviewResponse {
  sales: SalesSnapshot;
  collections: CollectionsSnapshot;
  receiptsAllChannels: ReceiptsAllChannelsSnapshot;
  receivables: ReceivablesSnapshot;
  agents: AgentsSnapshot;
  ptp: PtpSnapshot;
  production: ProductionSnapshot | null;
  generatedAt: string;
}

export interface TrendPoint {
  date: string;
  sales: number;
  collections: number;
  invoicesCount: number;
  collectionsCount: number;
}

/** One row of GET /insights/agents/live (re-exported agent-tracking.service.getLive()). */
export interface LiveAgentLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  batteryLevel: number | null;
  isMoving: boolean | null;
  recordedAt: string;
}

export interface LiveAgentTask {
  assignmentId: string;
  invoiceNo: string;
  customerName: string;
  outstanding: number;
}

export interface LiveAgent {
  agentUserId: string;
  fullName: string;
  username: string;
  phone: string | null;
  online: boolean;
  lastLocation: LiveAgentLocation | null;
  today: {
    collectedAmount: number;
    collectedCount: number;
    visits: number;
    pendingAssignments: number;
    distanceKm: number;
  };
  currentTask: LiveAgentTask | null;
}

/** GET /insights/recent-activity — a mixed feed with no stable `id`; the shape
 * differs by `type` (see insightsService.getRecentActivity). */
export type ActivityType = 'INVOICE' | 'COLLECTION' | 'DEPOSIT' | 'VISIT';

export interface ActivityItem {
  type: ActivityType;
  /** ISO datetime the event occurred at. */
  at: string;
  title: string;
  subtitle: string;
  amount?: number;
  agentName?: string | null;
  customerName?: string | null;
}
