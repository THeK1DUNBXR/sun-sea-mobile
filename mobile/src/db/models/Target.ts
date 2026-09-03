import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Target extends Model {
  static table = 'targets';

  @text('period') period: string; // YYYY-MM
  @field('collection_target') collectionTarget: number;
  @field('sales_target') salesTarget: number;
  @field('visits_target') visitsTarget: number;
  @field('updated_at') updatedAt: number;
}
