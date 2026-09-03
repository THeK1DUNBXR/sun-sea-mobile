import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { OrderLine } from '../../api/types';

const sanitize = (raw: unknown): OrderLine[] => (Array.isArray(raw) ? (raw as OrderLine[]) : []);

/** ERP sales orders (read-only) — the customer's buying history. */
export default class OrderHistory extends Model {
  static table = 'order_history';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('order_no') orderNo: string;
  @text('customer_id') customerId: string;
  @text('order_date') orderDate: string;
  @text('status') status: string;
  @field('net_amount') netAmount: number;
  @json('items', sanitize) items: OrderLine[];
  @field('updated_at') updatedAt: number;
}
