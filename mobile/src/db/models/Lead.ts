import { Model } from '@nozbe/watermelondb';
import { field, json, text } from '@nozbe/watermelondb/decorators';
import type { AttachmentRef } from '../../api/types';

const sanitize = (raw: unknown): AttachmentRef[] => (Array.isArray(raw) ? (raw as AttachmentRef[]) : []);

export default class Lead extends Model {
  static table = 'leads';

  @text('firm_name') firmName: string;
  @text('contact_name') contactName: string | null;
  @text('mobile') mobile: string | null;
  @text('email') email: string | null;
  @text('gstin') gstin: string | null;
  @text('address_line') addressLine: string | null;
  @text('city') city: string | null;
  @text('state') state: string | null;
  @text('pincode') pincode: string | null;
  @field('latitude') latitude: number | null;
  @field('longitude') longitude: number | null;
  @text('notes') notes: string | null;
  @json('attachments', sanitize) attachments: AttachmentRef[];
  @text('status') status: 'SUBMITTED' | 'CREATED' | 'REJECTED';
  @text('customer_id') customerId: string | null;
  @text('customer_code') customerCode: string | null;
  @text('sync_error') syncError: string | null;
  @field('created_at') createdAt: number;
  @field('updated_at') updatedAt: number;
}
