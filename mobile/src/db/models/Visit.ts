import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';

export type VisitStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type VisitOutcome = 'COLLECTION' | 'ORDER' | 'BOTH' | 'NO_ACTION';

export default class Visit extends Model {
  static table = 'visits';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('customer_id') customerId: string;
  @text('route_id') routeId: string | null;
  @text('planned_date') plannedDate: string;
  @text('planned_time') plannedTime: string | null;
  @field('sequence') sequence: number;
  @text('status') status: VisitStatus;
  @text('outcome') outcome: VisitOutcome | null;
  @field('check_in_at') checkInAt: number | null;
  @field('check_out_at') checkOutAt: number | null;
  @field('latitude') latitude: number | null;
  @field('longitude') longitude: number | null;
  @text('notes') notes: string | null;
  @field('updated_at') updatedAt: number;
}
