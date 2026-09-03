import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';

export type FollowUpType = 'PTP' | 'CALLBACK' | 'DISPUTE' | 'NO_ACTION';
export type FollowUpReason = 'OWNER_NOT_AVAILABLE' | 'NO_FUNDS' | 'DISPUTE' | 'ALREADY_PAID' | 'CLOSED' | 'OTHER';
export type FollowUpStatus = 'OPEN' | 'DONE' | 'BROKEN' | 'CANCELLED';

export default class FollowUp extends Model {
  static table = 'follow_ups';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('customer_id') customerId: string;
  @text('visit_id') visitId: string | null;
  @text('type') type: FollowUpType;
  @text('reason') reason: FollowUpReason | null;
  @field('promised_amount') promisedAmount: number | null;
  @text('promised_date') promisedDate: string | null;
  @field('due_at') dueAt: number;
  @text('notes') notes: string | null;
  @text('status') status: FollowUpStatus;
  @field('completed_at') completedAt: number | null;
  @field('created_at') createdAt: number;
  @field('updated_at') updatedAt: number;

  get isOverdue() {
    return this.status === 'OPEN' && this.dueAt < Date.now();
  }
}
