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

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  CustomerDetail: { customerId: string; visitId?: string };
  CollectionEntry: { customerId: string; visitId?: string };
  PaymentMode: { draft: CollectionDraft };
  CashPayment: { draft: CollectionDraft };
  ChequePayment: { draft: CollectionDraft };
  UpiPayment: { draft: CollectionDraft; mode: Extract<PaymentMode, 'UPI' | 'NEFT'> };
  CollectionSuccess: { collectionId: string };
  NewOrder: { customerId: string; visitId?: string };
  OrderReview: { draft: OrderDraft };
  OrderSuccess: { orderId: string };
  Outstanding: { customerId: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Route: undefined;
  Customers: undefined;
  Sync: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
