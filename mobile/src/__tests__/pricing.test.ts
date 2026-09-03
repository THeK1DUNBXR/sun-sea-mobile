import { resolveRate } from '../utils/pricing';

describe('resolveRate', () => {
  const grades = JSON.stringify({ 'Grade A': 95, GRADE_B: 90, c: 0 });
  it('falls back to base rate without a grade', () => {
    expect(resolveRate(100, grades, null)).toBe(100);
  });
  it('matches grade names loosely like the ERP', () => {
    expect(resolveRate(100, grades, 'A')).toBe(95);
    expect(resolveRate(100, grades, 'grade-b')).toBe(90);
  });
  it('ignores zero / invalid grade rates', () => {
    expect(resolveRate(100, grades, 'C')).toBe(100);
    expect(resolveRate(100, 'not json', 'A')).toBe(100);
  });
});
