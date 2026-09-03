import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Allocation, OrderLine, PaymentMode } from '../api/types';

export interface CollectionDraft {
  customerId: string;
  visitId?: string | null;
  allocations: Allocation[];
  onAccount: number;
  total: number;
}

export interface OrderDraft {
  customerId: string;
  visitId?: string | null;
  lines: OrderLine[];
  remarks?: string;
}

export type CustomerTab = 'overview' | 'invoices' | 'orders' | 'activity';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  CustomerDetail: { customerId: string; visitId?: string; tab?: CustomerTab };
  CollectionEntry: { customerId: string; visitId?: string; selectAll?: boolean };
  PaymentMode: { draft: CollectionDraft };
  CashPayment: { draft: CollectionDraft };
  ChequePayment: { draft: CollectionDraft };
  UpiPayment: { draft: CollectionDraft; mode: Extract<PaymentMode, 'UPI' | 'NEFT'> };
  CollectionSuccess: { collectionId: string };
  NewOrder: { customerId: string; visitId?: string; prefill?: OrderLine[] };
  OrderReview: { draft: OrderDraft };
  OrderSuccess: { orderId: string };
  Outstanding: { customerId: string };
  FollowUpLog: { customerId: string; visitId?: string };
  Cheques: undefined;
  Day: undefined;
  Handover: { suggestedAmount?: number };
  Expenses: undefined;
  ExpenseNew: undefined;
  Leads: undefined;
  LeadNew: undefined;
  Performance: undefined;
  SyncStatus: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Route: undefined;
  Customers: undefined;
  FollowUps: undefined;
  More: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
