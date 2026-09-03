import { Model, Q } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text, lazy } from '@nozbe/watermelondb/decorators';

export default class Customer extends Model {
  static table = 'customers';
  static associations: Associations = {
    invoices: { type: 'has_many', foreignKey: 'customer_id' },
    visits: { type: 'has_many', foreignKey: 'customer_id' },
    collections: { type: 'has_many', foreignKey: 'customer_id' },
    orders: { type: 'has_many', foreignKey: 'customer_id' },
  };

  @text('customer_code') customerCode: string;
  @text('firm_name') firmName: string;
  @text('display_name') displayName: string | null;
  @text('mobile') mobile: string | null;
  @text('email') email: string | null;
  @text('gstin') gstin: string | null;
  @text('address_line') addressLine: string | null;
  @text('city') city: string | null;
  @text('state') state: string | null;
  @text('pincode') pincode: string | null;
  @field('credit_limit') creditLimit: number;
  @field('credit_days') creditDays: number | null;
  @field('outstanding') outstanding: number;
  @text('grade_name') gradeName: string | null;
  @text('type_name') typeName: string | null;
  @text('status') status: string;
  @field('updated_at') updatedAt: number;

  @lazy openInvoices = this.collections
    .get('invoices')
    .query(Q.where('customer_id', this.id), Q.where('balance', Q.gt(0)), Q.sortBy('invoice_date', Q.asc));

  get name() {
    return this.displayName || this.firmName;
  }

  get fullAddress() {
    return [this.addressLine, this.city, this.state, this.pincode].filter(Boolean).join(', ');
  }
}
