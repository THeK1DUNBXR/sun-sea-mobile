import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class DaySession extends Model {
  static table = 'day_sessions';

  @text('date') date: string;
  @field('started_at') startedAt: number;
  @field('ended_at') endedAt: number | null;
  @field('start_lat') startLat: number | null;
  @field('start_lng') startLng: number | null;
  @field('end_lat') endLat: number | null;
  @field('end_lng') endLng: number | null;
  @text('start_note') startNote: string | null;
  @text('end_note') endNote: string | null;
  @field('cash_in_hand_end') cashInHandEnd: number | null;
  @text('status') status: 'OPEN' | 'CLOSED';
  @field('updated_at') updatedAt: number;
}
