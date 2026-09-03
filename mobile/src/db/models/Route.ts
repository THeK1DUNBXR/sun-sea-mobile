import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { text } from '@nozbe/watermelondb/decorators';

export default class Route extends Model {
  static table = 'routes';
  static associations: Associations = {
    route_customers: { type: 'has_many', foreignKey: 'route_id' },
  };

  @text('route_code') routeCode: string;
  @text('route_name') routeName: string;
}
