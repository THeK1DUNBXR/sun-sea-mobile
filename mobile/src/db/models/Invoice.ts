import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Invoice extends Model {
  static table = 'invoices';
  static associations: Associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  };

  @text('invoice_no') invoiceNo: string;
  @text('customer_id') customerId: string;
  @text('invoice_date') invoiceDate: string;
  @text('due_date') dueDate: string | null;
  @field('grand_total') grandTotal: number;
  @field('paid_amount') paidAmount: number;
  @field('balance') balance: number;
  @text('status') status: string;
  @field('updated_at') updatedAt: number;
}
