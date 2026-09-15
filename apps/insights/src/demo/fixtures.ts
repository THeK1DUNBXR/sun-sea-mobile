// Seeded sample data for "Explore demo data" — lets a founder walk through
// every screen without a backend. Shapes must match the real API exactly
// (see src/types.ts, sourced from the ERP's own service layer) so the demo
// path exercises the same rendering code as a live session.

import { REQUIRED_PERMISSION } from '@/copy';
import type { ActivityItem, LiveAgent, MeResponse, OverviewResponse, TrendPoint, User } from '@/types';

export const demoUser: User = {
  userId: 'demo-user',
  fullName: 'Demo Founder',
  email: 'founder@demo.sunsea.in',
  username: 'demo.founder',
  roleId: null,
  status: 'active',
  lastLoginAt: new Date().toISOString(),
  mfaEnabled: false,
  avatarUrl: null,
  isSuperAdmin: false,
};

export const demoMe: MeResponse = {
  user: demoUser,
  permissions: [REQUIRED_PERMISSION],
  isSuperAdmin: false,
};

export const demoOverview: OverviewResponse = {
  sales: { today: 214500, yesterday: 189200, mtd: 3842000, lastMtd: 3512000, pctChange: 9.4 },
  collections: {
    today: 156800,
    mtd: 2984000,
    pendingVerification: { count: 6, amount: 84500 },
    cashInHand: 62300,
  },
  receiptsAllChannels: { today: 198400, mtd: 3392000 },
  receivables: {
    totalOutstanding: 5680000,
    overdue: 1420000,
    aging: { '0_30': 2340000, '31_60': 1560000, '61_90': 980000, '90_plus': 800000 },
    topDebtors: [
      { customerId: 'demo-cust-1', firmName: 'Coral Bay Traders', netBalance: 486000, overdueAmount: 210000, dueDays: 42 },
      { customerId: 'demo-cust-2', firmName: 'Harbor View Retail', netBalance: 372000, overdueAmount: 96000, dueDays: 18 },
      { customerId: 'demo-cust-3', firmName: 'Sunrise General Store', netBalance: 318500, overdueAmount: 318500, dueDays: 61 },
      { customerId: 'demo-cust-4', firmName: 'Blue Lagoon Mart', netBalance: 244000, overdueAmount: 0, dueDays: 0 },
      { customerId: 'demo-cust-5', firmName: 'Palm Grove Wholesalers', netBalance: 198000, overdueAmount: 55000, dueDays: 12 },
    ],
  },
  agents: {
    active: 5,
    total: 7,
    leaderboard: [
      { agentUserId: 'demo-agent-1', name: 'Ravi Kumar', collectedToday: 42800, collectedMtd: 612000, visitsToday: 9, pendingAssignments: 4 },
      { agentUserId: 'demo-agent-2', name: 'Sneha Patil', collectedToday: 38200, collectedMtd: 548000, visitsToday: 7, pendingAssignments: 6 },
      { agentUserId: 'demo-agent-3', name: 'Arjun Mehta', collectedToday: 29500, collectedMtd: 401000, visitsToday: 6, pendingAssignments: 8 },
      { agentUserId: 'demo-agent-4', name: 'Divya Nair', collectedToday: 24100, collectedMtd: 356000, visitsToday: 5, pendingAssignments: 3 },
      { agentUserId: 'demo-agent-5', name: 'Karthik Iyer', collectedToday: 22200, collectedMtd: 298000, visitsToday: 4, pendingAssignments: 5 },
    ],
  },
  ptp: { dueToday: 11, overdue: 4 },
  production: { planned: 4200, produced: 3860, pending: 340, achievement: 91.9 },
  generatedAt: new Date().toISOString(),
};

/** Deterministic-looking but varied daily series, newest last. A light sine
 * wave plus a per-day pseudo-random wobble reads as real business data
 * (weekday dips, no two days identical) without needing a seeded RNG. */
export function demoTrends(days: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.6 : 1;
    const wobble = 0.85 + ((i * 37) % 30) / 100;
    const sales = Math.round(180000 * weekendDip * wobble);
    const collections = Math.round(sales * (0.55 + ((i * 13) % 25) / 100));
    points.push({
      date: date.toISOString().slice(0, 10),
      sales,
      collections,
      invoicesCount: Math.max(1, Math.round(sales / 9500)),
      collectionsCount: Math.max(1, Math.round(collections / 7200)),
    });
  }
  return points;
}

export const demoLiveAgents: LiveAgent[] = [
  {
    agentUserId: 'demo-agent-1',
    fullName: 'Ravi Kumar',
    username: 'ravi.kumar',
    phone: '+91 98200 11111',
    online: true,
    lastLocation: {
      latitude: 19.076,
      longitude: 72.8777,
      accuracy: 12,
      speed: 0,
      heading: 0,
      batteryLevel: 0.72,
      isMoving: false,
      recordedAt: new Date(Date.now() - 45_000).toISOString(),
    },
    today: { collectedAmount: 42800, collectedCount: 6, visits: 9, pendingAssignments: 4, distanceKm: 18.4 },
    currentTask: {
      assignmentId: 'demo-assign-1',
      invoiceNo: 'INV-2291',
      customerName: 'Coral Bay Traders',
      outstanding: 48600,
    },
  },
  {
    agentUserId: 'demo-agent-2',
    fullName: 'Sneha Patil',
    username: 'sneha.patil',
    phone: '+91 98200 22222',
    online: true,
    lastLocation: {
      latitude: 19.0596,
      longitude: 72.8295,
      accuracy: 18,
      speed: 4.2,
      heading: 210,
      batteryLevel: 0.54,
      isMoving: true,
      recordedAt: new Date(Date.now() - 20_000).toISOString(),
    },
    today: { collectedAmount: 38200, collectedCount: 5, visits: 7, pendingAssignments: 6, distanceKm: 22.1 },
    currentTask: {
      assignmentId: 'demo-assign-2',
      invoiceNo: 'INV-2304',
      customerName: 'Harbor View Retail',
      outstanding: 31200,
    },
  },
  {
    agentUserId: 'demo-agent-3',
    fullName: 'Arjun Mehta',
    username: 'arjun.mehta',
    phone: '+91 98200 33333',
    online: false,
    lastLocation: {
      latitude: 19.1197,
      longitude: 72.9051,
      accuracy: 25,
      speed: 0,
      heading: 0,
      batteryLevel: 0.31,
      isMoving: false,
      recordedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    },
    today: { collectedAmount: 29500, collectedCount: 4, visits: 6, pendingAssignments: 8, distanceKm: 14.7 },
    currentTask: null,
  },
];

export function demoActivity(limit = 30): ActivityItem[] {
  const now = Date.now();
  const items: ActivityItem[] = [
    { type: 'COLLECTION', at: new Date(now - 6 * 60_000).toISOString(), title: 'Collection received', subtitle: 'INV-2291 · Cash', amount: 12500, agentName: 'Ravi Kumar', customerName: 'Coral Bay Traders' },
    { type: 'VISIT', at: new Date(now - 18 * 60_000).toISOString(), title: 'Visit logged', subtitle: 'Promised to pay', agentName: 'Sneha Patil', customerName: 'Harbor View Retail' },
    { type: 'INVOICE', at: new Date(now - 32 * 60_000).toISOString(), title: 'Invoice raised', subtitle: 'INV-2318', amount: 68400, customerName: 'Blue Lagoon Mart' },
    { type: 'DEPOSIT', at: new Date(now - 51 * 60_000).toISOString(), title: 'Cash deposit', subtitle: 'Accepted', amount: 42800, agentName: 'Ravi Kumar' },
    { type: 'COLLECTION', at: new Date(now - 74 * 60_000).toISOString(), title: 'Collection received', subtitle: 'INV-2304 · UPI', amount: 9800, agentName: 'Sneha Patil', customerName: 'Harbor View Retail' },
    { type: 'VISIT', at: new Date(now - 96 * 60_000).toISOString(), title: 'Visit logged', subtitle: 'Customer unavailable', agentName: 'Arjun Mehta', customerName: 'Sunrise General Store' },
    { type: 'COLLECTION', at: new Date(now - 130 * 60_000).toISOString(), title: 'Collection received', subtitle: 'INV-2260 · Cheque', amount: 55000, agentName: 'Divya Nair', customerName: 'Palm Grove Wholesalers' },
    { type: 'INVOICE', at: new Date(now - 165 * 60_000).toISOString(), title: 'Invoice raised', subtitle: 'INV-2317', amount: 31200, customerName: 'Harbor View Retail' },
  ];
  return items.slice(0, limit);
}
