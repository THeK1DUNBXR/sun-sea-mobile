import { Model } from '@nozbe/watermelondb';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { AttachmentRef } from '../../api/types';

const sanitize = (raw: unknown): AttachmentRef[] => (Array.isArray(raw) ? (raw as AttachmentRef[]) : []);

export const EXPENSE_CATEGORIES = ['Travel', 'Fuel', 'Food', 'Lodging', 'Phone', 'Parking', 'Other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export default class Expense extends Model {
  static table = 'expenses';

  @text('expense_number') expenseNumber: string | null;
  @text('date') date: string;
  @text('category') category: ExpenseCategory;
  @text('description') description: string;
  @field('amount') amount: number;
  @text('payment_method') paymentMethod: string;
  @text('notes') notes: string | null;
  @json('attachments', sanitize) attachments: AttachmentRef[];
  @text('status') status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  @text('review_note') reviewNote: string | null;
  @text('sync_error') syncError: string | null;
  @field('created_at') createdAt: number;
  @field('updated_at') updatedAt: number;
}
