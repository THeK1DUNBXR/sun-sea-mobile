import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class RouteCustomer extends Model {
  static table = 'route_customers';
  static associations: Associations = {
    routes: { type: 'belongs_to', key: 'route_id' },
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('route_id') routeId: string;
  @text('customer_id') customerId: string;
  @field('sequence') sequence: number;
  @text('planned_time') plannedTime: string | null;
}
