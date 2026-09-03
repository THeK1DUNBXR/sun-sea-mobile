/**
 * Mirrors backend sales-order.service#computeLineTotals so the estimated
 * order value shown on the device matches what the ERP will compute.
 */
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function resolveRate(rate: number, gradeRatesJson: string | null | undefined, gradeName: string | null | undefined): number {
  if (!gradeName || !gradeRatesJson) return rate;
  let gradeRates: Record<string, unknown> | null = null;
  try {
    gradeRates = JSON.parse(gradeRatesJson);
  } catch {
    return rate;
  }
  if (!gradeRates || typeof gradeRates !== 'object') return rate;
  const g = clean(gradeName);
  for (const [k, v] of Object.entries(gradeRates)) {
    const kc = clean(k);
    if (kc === g || kc.endsWith(g) || g.endsWith(kc)) {
      const n = Number(v);
      if (v != null && !isNaN(n) && n > 0) return n;
    }
  }
  return rate;
}
