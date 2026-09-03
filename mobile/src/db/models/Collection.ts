import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { Allocation, AttachmentRef, PaymentMode } from '../../api/types';

const sanitizeArray = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);

/** Local status before the server has processed the record. */
export type CollectionStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED';

export default class Collection extends Model {
  static table = 'collections';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
    attachments: { type: 'has_many', foreignKey: 'collection_id' },
  };

  @text('receipt_no') receiptNo: string | null;
  @text('customer_id') customerId: string;
  @text('visit_id') visitId: string | null;
  @field('amount') amount: number;
  @text('payment_mode') paymentMode: PaymentMode;
  @text('reference_no') referenceNo: string | null;
  @text('bank_name') bankName: string | null;
  @text('cheque_date') chequeDate: string | null;
  @text('drawer_name') drawerName: string | null;
  @field('collected_at') collectedAt: number;
  @text('notes') notes: string | null;
  @json('allocations', sanitizeArray<Allocation>) allocations: Allocation[];
  @json('attachments', sanitizeArray<AttachmentRef>) attachments: AttachmentRef[];
  @text('status') status: CollectionStatus;
  @text('sync_error') syncError: string | null;
  @field('updated_at') updatedAt: number;

  get isSynced() {
    return this.status !== 'PENDING' && this.syncStatus === 'synced';
  }
}
