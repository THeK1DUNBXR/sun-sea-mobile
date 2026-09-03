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
  @field('updated_at') updatedAt: number;

  rateFor(gradeName: string | null | undefined) {
    return resolveRate(this.rate, this.gradeRates, gradeName);
  }
}
