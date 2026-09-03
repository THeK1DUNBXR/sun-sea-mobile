import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { resolveRate } from '../../utils/pricing';

export default class Product extends Model {
  static table = 'products';

  @text('product_code') productCode: string;
  @text('product_name') productName: string;
  @text('uom') uom: string | null;
  @field('rate') rate: number;
  @text('grade_rates') gradeRates: string;
  @text('category') category: string | null;
  @field('is_active') isActive: boolean;
  @text('image_url') imageUrl: string | null;
  @field('on_hand_qty') onHandQty: number | null;
  @field('min_qty') minQty: number;
  @field('updated_at') updatedAt: number;

  /** 'in' | 'low' | 'out' | 'unknown' — for the stock badge in the catalogue. */
  get stockLevel(): 'in' | 'low' | 'out' | 'unknown' {
    if (this.onHandQty === null || this.onHandQty === undefined) return 'unknown';
    if (this.onHandQty <= 0) return 'out';
    if (this.onHandQty <= Math.max(10, this.minQty * 5)) return 'low';
    return 'in';
  }

  rateFor(gradeName: string | null | undefined) {
    return resolveRate(this.rate, this.gradeRates, gradeName);
  }
}
