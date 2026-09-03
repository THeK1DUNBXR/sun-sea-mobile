import { Model } from '@nozbe/watermelondb';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { AttachmentRef } from '../../api/types';

const sanitize = (raw: unknown): AttachmentRef[] => (Array.isArray(raw) ? (raw as AttachmentRef[]) : []);

export type HandoverMode = 'OFFICE_CASH' | 'BANK_DEPOSIT';

export default class Handover extends Model {
  static table = 'handovers';

  @text('receipt_no') receiptNo: string | null;
  @text('date') date: string;
  @field('amount') amount: number;
  @text('mode') mode: HandoverMode;
  @text('reference_no') referenceNo: string | null;
  @text('bank_name') bankName: string | null;
  @text('notes') notes: string | null;
  @json('attachments', sanitize) attachments: AttachmentRef[];
  @text('status') status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  @text('sync_error') syncError: string | null;
  @field('created_at') createdAt: number;
  @field('updated_at') updatedAt: number;
}
