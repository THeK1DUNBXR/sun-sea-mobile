const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const money = (n: number | null | undefined) => inr.format(Math.round((n ?? 0) * 100) / 100);
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const todayYmd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (ymd: string, days: number) => {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + days);
  return todayYmd(d);
};

export const fromYmd = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (v: string | number | Date | null | undefined) => {
  if (!v) return '—';
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fromYmd(v) : new Date(v);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtDateTime = (v: number | Date | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${fmtDate(d)}, ${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
};

export const fmtTime = (v: number | Date | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
};

/** "09:30" → "09:30 AM" */
export const fmtPlannedTime = (hhmm: string | null | undefined) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const daysBetween = (fromYmdStr: string, to = new Date()) => {
  const from = fromYmd(fromYmdStr);
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
};

export const relativeTime = (ms: number | null | undefined) => {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h ago`;
  return fmtDateTime(ms);
};
