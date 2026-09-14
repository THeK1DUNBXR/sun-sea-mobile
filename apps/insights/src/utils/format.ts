import { overview as overviewCopy } from '@/copy';

/** Compact Indian-numbering currency formatter: e.g. 482000 -> "₹4.82L", 11500000 -> "₹1.15Cr" */
export function formatMoneyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Same magnitude as formatMoneyCompact, spelled out for screen readers —
 * "L"/"Cr" read naturally as letters, not units, so VoiceOver/TalkBack get the
 * word instead. Only for accessibility labels; visible text keeps the compact
 * glyph form. */
export function formatMoneyCompactSpoken(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'not available';
  const sign = value < 0 ? 'minus ' : '';
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} crore`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)} lakh`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)} thousand`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Plain visit count with a unit word (e.g. "3 promises") — for figures that
 * are counts, not currency amounts (the overview screen's promise-to-pay
 * tiles). Doubles as the accessible/spoken form since it's already plain
 * words, unlike the compact money glyphs above. */
export function formatPromiseCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return overviewCopy.kpi.ptpCount(Math.round(value));
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  // A server/device clock can drift a few seconds apart, or the server's
  // `generatedAt` can be stamped a beat before the response lands. Never let
  // that read as "in the future" — floor at "just now" instead.
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  // Spelled-out "min"/"hr" (not "m"/"h") so this can't be misread as meters or
  // months on a business dashboard where both come up elsewhere.
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Parses a `YYYY-MM-DD` calendar-date string (the shape /insights/trends sends)
 * as a *local* midnight, not a UTC one. Handing that string straight to `new
 * Date()` treats it as UTC per the ISO 8601 spec, then every subsequent
 * `toLocaleDateString`/`getDate()` call quietly reinterprets it in the
 * device's timezone — behind UTC (most of the Americas), that shifts the
 * displayed day back by one. There is no time-of-day here to get wrong, only
 * a calendar date, so parse the components directly instead of round-tripping
 * through UTC. */
function parseDateOnly(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatShortDate(dateOnly: string): string {
  const date = parseDateOnly(dateOnly);
  if (!date) return dateOnly;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
