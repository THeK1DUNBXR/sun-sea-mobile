// Seeded sample data for "Explore the demo" — lets an agent walk through
// every screen (assignments, collections, visits, deposits, history, ledger,
// receipts) with no backend at all. Shapes match src/types/models.ts exactly
// so the demo path renders through the same UI code as a live session.

import type { AgentCashDeposit, Assignment, CollectionRecord, HistoryEntry, User } from '@/types/models';

export const demoUser: User = {
  userId: 'demo-agent',
  fullName: 'Demo Agent',
  email: 'agent@demo.sunsea.in',
  username: 'demo.agent',
  status: 'active',
  avatarUrl: null,
  isSuperAdmin: false,
};

export const demoCompany = {
  name: 'SunSea Enterprises',
  address: '14 Harbor Road, Panaji, Goa 403001',
  gstin: '30ABCDE1234F1Z5',
  phone: '+91 98220 44556',
};

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** The starting assignment list — a mix of statuses, priorities and due
 * dates so every filter/sort/empty-state on the Assignments screen has
 * something real to show. Cloned fresh into the mutable store on demo entry
 * (see demoStore.ts) so repeated demo sessions always start the same way. */
export const demoAssignmentsSeed: Assignment[] = [
  {
    id: 'demo-a1',
    status: 'PENDING',
    priority: 'URGENT',
    targetDate: isoDaysFromNow(0),
    instructions: 'Ask for the owner directly — previous visits missed him.',
    amountCollected: 0,
    lastVisitAt: null,
    invoice: { id: 'demo-inv-1', invoiceNo: 'INV-2291', invoiceDate: isoDaysFromNow(-45), dueDate: isoDaysFromNow(-15), grandTotal: 48600, paid: 0, outstanding: 48600 },
    customer: {
      id: 'demo-cust-1',
      firmName: 'Coral Bay Traders',
      displayName: 'Coral Bay Traders',
      phones: ['+91 98200 11111'],
      addresses: [{ label: 'Shop', isDefault: true, address: { addressLine1: '22 Coral Bay Road', city: 'Panaji', state: 'Goa', pincode: '403001' }, latitude: 15.4989, longitude: 73.8278 }],
      gstin: '30AAAAA0000A1Z1',
    },
    records: [],
    visits: [],
    distanceKm: 2.1,
  },
  {
    id: 'demo-a2',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    targetDate: isoDaysFromNow(0),
    instructions: 'Partial payment expected — ₹15,000 confirmed by phone.',
    amountCollected: 0,
    lastVisitAt: isoDaysFromNow(-2),
    invoice: { id: 'demo-inv-2', invoiceNo: 'INV-2304', invoiceDate: isoDaysFromNow(-30), dueDate: isoDaysFromNow(-5), grandTotal: 31200, paid: 0, outstanding: 31200 },
    customer: {
      id: 'demo-cust-2',
      firmName: 'Harbor View Retail',
      displayName: 'Harbor View Retail',
      phones: ['+91 98200 22222'],
      addresses: [{ label: 'Shop', isDefault: true, address: { addressLine1: '5 Harbor View Lane', city: 'Panaji', state: 'Goa', pincode: '403002' }, latitude: 15.4909, longitude: 73.8172 }],
    },
    lastVisit: { id: 'demo-visit-seed-1', visitedAt: isoDaysFromNow(-2), outcome: 'PROMISED_TO_PAY', notes: 'Will pay by Friday.' },
    promise: { promisedDate: isoDaysFromNow(1), promisedAmount: 15000 },
    records: [],
    visits: [{ id: 'demo-visit-seed-1', visitedAt: isoDaysFromNow(-2), outcome: 'PROMISED_TO_PAY', notes: 'Will pay by Friday.' }],
    distanceKm: 3.4,
  },
  {
    id: 'demo-a3',
    status: 'PENDING',
    priority: 'NORMAL',
    targetDate: isoDaysFromNow(1),
    instructions: '',
    amountCollected: 0,
    lastVisitAt: null,
    invoice: { id: 'demo-inv-3', invoiceNo: 'INV-2318', invoiceDate: isoDaysFromNow(-10), dueDate: isoDaysFromNow(5), grandTotal: 68400, paid: 0, outstanding: 68400 },
    customer: {
      id: 'demo-cust-3',
      firmName: 'Blue Lagoon Mart',
      displayName: 'Blue Lagoon Mart',
      phones: ['+91 98200 33333'],
      addresses: [{ label: 'Shop', isDefault: true, address: { addressLine1: '9 Lagoon Street', city: 'Margao', state: 'Goa', pincode: '403601' }, latitude: 15.2832, longitude: 73.9862 }],
    },
    records: [],
    visits: [],
    distanceKm: 14.6,
  },
  {
    id: 'demo-a4',
    status: 'PENDING',
    priority: 'NORMAL',
    targetDate: isoDaysFromNow(2),
    instructions: 'Ground floor, blue shutter.',
    amountCollected: 0,
    lastVisitAt: null,
    invoice: { id: 'demo-inv-4', invoiceNo: 'INV-2260', invoiceDate: isoDaysFromNow(-60), dueDate: isoDaysFromNow(-30), grandTotal: 55000, paid: 0, outstanding: 55000 },
    customer: {
      id: 'demo-cust-4',
      firmName: 'Palm Grove Wholesalers',
      displayName: 'Palm Grove Wholesalers',
      phones: ['+91 98200 44444'],
      addresses: [{ label: 'Warehouse', isDefault: true, address: { addressLine1: '3 Palm Grove Industrial Estate', city: 'Ponda', state: 'Goa', pincode: '403401' }, latitude: 15.4027, longitude: 74.0078 }],
    },
    records: [],
    visits: [],
    distanceKm: 21.9,
  },
  {
    id: 'demo-a5',
    status: 'UNCOLLECTED',
    priority: 'LOW',
    targetDate: isoDaysFromNow(-3),
    instructions: '',
    amountCollected: 0,
    lastVisitAt: isoDaysFromNow(-3),
    invoice: { id: 'demo-inv-5', invoiceNo: 'INV-2201', invoiceDate: isoDaysFromNow(-90), dueDate: isoDaysFromNow(-60), grandTotal: 18500, paid: 0, outstanding: 18500 },
    customer: {
      id: 'demo-cust-5',
      firmName: 'Sunrise General Store',
      displayName: 'Sunrise General Store',
      phones: ['+91 98200 55555'],
      addresses: [{ label: 'Shop', isDefault: true, address: { addressLine1: '17 Sunrise Market', city: 'Panaji', state: 'Goa', pincode: '403001' }, latitude: 15.4837, longitude: 73.8298 }],
    },
    lastVisit: { id: 'demo-visit-seed-2', visitedAt: isoDaysFromNow(-3), outcome: 'CUSTOMER_UNAVAILABLE', notes: 'Shop was closed.' },
    records: [],
    visits: [{ id: 'demo-visit-seed-2', visitedAt: isoDaysFromNow(-3), outcome: 'CUSTOMER_UNAVAILABLE', notes: 'Shop was closed.' }],
    distanceKm: 1.8,
  },
  {
    id: 'demo-a6',
    status: 'COLLECTED',
    priority: 'NORMAL',
    targetDate: isoDaysFromNow(-1),
    instructions: '',
    amountCollected: 8000,
    lastVisitAt: isoDaysFromNow(-1),
    invoice: { id: 'demo-inv-6', invoiceNo: 'INV-2188', invoiceDate: isoDaysFromNow(-20), dueDate: isoDaysFromNow(-1), grandTotal: 8000, paid: 8000, outstanding: 0 },
    customer: {
      id: 'demo-cust-6',
      firmName: 'Green Palm Bakery',
      displayName: 'Green Palm Bakery',
      phones: ['+91 98200 66666'],
      addresses: [{ label: 'Shop', isDefault: true, address: { addressLine1: '2 Green Palm Circle', city: 'Panaji', state: 'Goa', pincode: '403001' }, latitude: 15.4956, longitude: 73.8231 }],
    },
    records: [{ id: 'demo-hist-1', amount: 8000, paymentMethod: 'CASH', status: 'VERIFIED', receiptNo: 'DEMO-1000', collectedAt: isoDaysFromNow(-1) }],
    visits: [],
    distanceKm: 2.6,
  },
];

export const demoCollectionsSeed: CollectionRecord[] = [
  {
    id: 'demo-hist-1',
    assignmentId: 'demo-a6',
    amount: 8000,
    paymentMethod: 'CASH',
    status: 'VERIFIED',
    receiptNo: 'DEMO-1000',
    collectedAt: isoDaysFromNow(-1),
  },
];

export const demoDepositsSeed: AgentCashDeposit[] = [
  {
    id: 'demo-dep-1',
    amount: 24800,
    depositedAt: isoDaysFromNow(-1),
    method: 'CASH',
    status: 'ACCEPTED',
  },
  {
    id: 'demo-dep-2',
    amount: 12500,
    depositedAt: isoDaysFromNow(0),
    method: 'CASH',
    status: 'PENDING',
  },
];

export const demoHistorySeed: HistoryEntry[] = [
  { id: 'demo-hist-1', kind: 'collection', occurredAt: isoDaysFromNow(-1), title: 'Green Palm Bakery', subtitle: 'INV-2188 · cash', amount: 8000, status: 'VERIFIED' },
  { id: 'demo-hist-2', kind: 'deposit', occurredAt: isoDaysFromNow(-1), title: 'Cash deposit', amount: 24800, status: 'ACCEPTED' },
  { id: 'demo-hist-3', kind: 'visit', occurredAt: isoDaysFromNow(-2), title: 'Harbor View Retail', subtitle: 'INV-2304 · promised to pay' },
  { id: 'demo-hist-4', kind: 'visit', occurredAt: isoDaysFromNow(-3), title: 'Sunrise General Store', subtitle: 'INV-2201 · customer unavailable' },
];
