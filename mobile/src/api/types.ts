/** Wire types shared with backend-extension/src/modules/mobile/mobile.types.ts */

export type PaymentMode = 'Cash' | 'Cheque' | 'UPI' | 'NEFT';
export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'Cheque', 'UPI', 'NEFT'];

export type AttachmentKind = 'CASH_RECEIPT' | 'CHEQUE_FRONT' | 'CHEQUE_BACK' | 'UPI_SCREENSHOT' | 'OTHER';

export interface Allocation {
  invoiceId: string;
  invoiceNo: string;
  amount: number;
}

export interface AttachmentRef {
  kind: AttachmentKind;
  url: string;
  fileId?: string | null;
  localId?: string | null;
}

export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  uom?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt?: string;
  user: {
    userId: string;
    fullName: string;
    email: string;
    username: string;
    roleId: string | null;
    isSuperAdmin?: boolean;
  };
}

export interface Bootstrap {
  agent: {
    userId: string;
    fullName: string;
    email?: string | null;
    employeeId: string | null;
    isSuperAdmin: boolean;
    permissions: string[];
  };
  company: { id: string; companyName: string; shortName?: string | null; logoUrl?: string | null; currencyCode: string } | null;
  settings: {
    orderStatusOnSubmit: string;
    paymentModes: PaymentMode[];
    chequeOcrEnabled: boolean;
    attachmentStorage: 'imagekit' | 's3';
    maxAttachmentBytes: number;
  };
  serverTime: number;
}

export interface TableChanges<T = Record<string, unknown>> {
  created: T[];
  updated: T[];
  deleted: string[];
}

export interface PullResponse {
  changes: Record<string, TableChanges>;
  timestamp: number;
  full: boolean;
}

export interface PushResults {
  visits: { ok: number; failed: { id: string; error: string }[] };
  collections: { id: string; status: 'POSTED' | 'FAILED' | 'SKIPPED'; receiptNo?: string; error?: string }[];
  orders: { id: string; status: 'CREATED' | 'FAILED' | 'SKIPPED'; orderNo?: string; error?: string }[];
}

export interface StoredAttachment {
  url: string;
  fileId?: string;
  driver: 'imagekit' | 's3';
  kind: string;
  collectionId: string;
}

export interface ChequeFields {
  bankName: string | null;
  branch: string | null;
  ifsc: string | null;
  chequeNumber: string | null;
  accountNumber: string | null;
  date: string | null;
  amount: number | null;
  amountInWords: string | null;
  drawerName: string | null;
  payeeName: string | null;
  isPostDated: boolean | null;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface CustomerStatement {
  customer: { id: string; customerCode: string; firmName: string; openingBalance: number };
  summary: { openingBalance: number; totalBilled: number; totalPaid: number; totalReturned: number; closingBalance: number };
  invoices: { id: string; invoiceNo: string; date: string; dueDate?: string; amount: number; paidAmount: number; balance: number; status: string }[];
  collectionHistory: { id: string; voucherNo: string; date: string; amount: number; paymentMode?: string; referenceNo?: string; narration?: string }[];
}
