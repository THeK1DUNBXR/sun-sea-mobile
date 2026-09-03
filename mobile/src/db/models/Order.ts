import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { OrderLine } from '../../api/types';

const sanitizeLines = (raw: unknown): OrderLine[] => (Array.isArray(raw) ? (raw as OrderLine[]) : []);

export default class Order extends Model {
  static table = 'orders';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('order_no') orderNo: string | null;
  @text('sales_order_id') salesOrderId: string | null;
  @text('customer_id') customerId: string;
  @text('visit_id') visitId: string | null;
  @text('order_date') orderDate: string;
  @json('items', sanitizeLines) items: OrderLine[];
  @field('total_amount') totalAmount: number;
  @text('remarks') remarks: string | null;
  @text('status') status: string; // PENDING (device) → DRAFT/CONFIRMED/… (ERP) or FAILED
  @text('sync_error') syncError: string | null;
  @field('updated_at') updatedAt: number;

  get totalQty() {
    return this.items.reduce((s, i) => s + i.quantity, 0);
  }
}
