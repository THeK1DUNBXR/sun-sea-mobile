import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Color system — light theme, high-contrast, large touch targets, built for
// outdoor field use in direct sunlight and in a hurry. Every value below was
// checked against its real background(s) with WCAG's relative-luminance
// contrast formula (not eyeballed): body/label text clears 4.5:1, large text
// and UI/icon strokes clear 3:1, each with a small margin so an uncalibrated
// outdoor screen doesn't land right on the line. Where a role needed
// darkening to clear its bar, lightness was reduced and hue/saturation held
// steady rather than picking an arbitrary swatch, so the "warmer/cooler"
// feel of each color survives the fix.
//
// Semantic vocabulary — one meaning per hue, used nowhere else:
//   primary (brand green)  → identity + the primary action, spent narrowly.
//   success (green)        → positive outcome: collected, verified, done.
//   info    (blue)         → live/ongoing status: GPS lock, tracking, sync.
//   warning (amber)        → needs attention soon: promise-to-pay, retrying.
//   danger  (red)          → needs attention now: overdue, rejected, failed.
//   neutral (gray)         → no state to report yet: pending, unassigned.
// Every one of these ships a soft "Tint" background for its badge/pill/card
// form, so the saturated value stays reserved for text, icons and dots —
// exactly the "concentrate color on the figure/badge, not the surface" rule
// this app follows throughout.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Turns a theme hex color into an rgba() string — used instead of a
 * hand-typed rgba(...) literal so a translucent surface (a modal scrim, a
 * pressed overlay) stays visibly derived from a real role instead of being
 * its own untracked color. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const colors = {
  // --- Surface tiers: base → recessed → raised, darkest to lightest. ------
  bg: '#F5F7F6',
  bgAlt: '#EAF1ED',
  surfaceSunk: '#F1F5F3',
  surface: '#FFFFFF',
  border: '#DCE3E0',
  /** A border with real presence — form controls and anything else where the
   * outline itself is load-bearing UI, not a decorative divider. ≥3:1
   * against `surface`. */
  borderStrong: '#799487',

  // --- Text tiers: primary reading copy → secondary → the dimmest label
  // that must still hold. All three clear 4.5:1 against every surface tier
  // above (checked against `bg`, the darkest one, not just white). ---------
  text: '#0B1F17',
  textMuted: '#5B6D65',
  textFaint: '#607069',

  // --- Brand accent: the one hue this app claims as its own. Spent on the
  // primary action and identity marks; never used to color a status. -------
  primary: '#0F6E4F',
  primaryDark: '#0A4E38',
  primaryDeep: '#062E20',
  primaryTint: '#E4F5EC',
  onPrimary: '#FFFFFF',

  // --- Semantic roles: one saturated value + one soft tint each. ----------
  /** Positive / collected / verified / done. */
  success: '#187C51',
  successTint: '#E4F5EC',
  /** Needs attention soon: promised-to-pay, retrying, review pending. */
  warning: '#956319',
  warningTint: '#FBF0DD',
  /** Needs attention now: overdue, rejected, failed. */
  danger: '#C0392B',
  dangerDark: '#A23024',
  dangerTint: '#FBE7E4',
  /** Live / ongoing / informational: GPS lock, location tracking, syncing. */
  info: '#1B6FA8',
  infoTint: '#E2F0FA',
  /** No state to report yet: pending, unassigned, awaiting action. Kept
   * genuinely gray rather than brand-tinted so it reads as "nothing to see
   * here" and doesn't spend the brand hue on an empty state. */
  neutral: '#5B6D65',
  neutralTint: '#F1F5F3',

  // Domain aliases — same values as the semantic roles above, named for the
  // specific thing they mark in this app so a call site reads as intent
  // ("this is overdue") rather than raw severity ("this is danger").
  overdue: '#C0392B',
  ptp: '#956319',

  /** Selectable-chip resting fill (Chip, Button ghost-pressed) — a brand
   * tint, distinct from the neutral/pending role above: chips are brand
   * controls, not status indicators. */
  chipBg: '#E9F2EE',

  // Priority markers — used as small filled dots / avatar rings, never as
  // left-edge stripes. Share their hex with the semantic role of matching
  // severity so a customer's priority ring and their overdue badge read as
  // the same visual language.
  priorityUrgent: '#C0392B',
  priorityHigh: '#956319',
  priorityNormal: '#0F6E4F',
  priorityLow: '#5B6D65',
};

/** Map marker fill per assignment state — status and due-date outrank
 * priority so an overdue or already-collected stop is never shown as if it
 * were merely low/normal priority. Always paired with the marker's callout
 * text (status + "Overdue"/"PTP"), never color alone. */
export const mapPin = {
  overdue: colors.overdue,
  collected: colors.success,
  promised: colors.ptp,
  default: colors.primary,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

/**
 * Semantic layout roles built on the spacing scale above. Screens should
 * reach for these instead of repeating a raw `spacing.*` value inline, so
 * the same kind of gap (a screen gutter, a gap between stacked cards, a gap
 * between stacked form fields…) reads identically everywhere it shows up.
 */
export const layout = {
  /** Horizontal edge padding for a screen's scrollable content. */
  screenGutter: spacing.lg,
  /** Internal padding for a Card (matches Card's own default). */
  cardPadding: spacing.lg,
  /** Vertical gap between stacked cards/sections on one screen. */
  sectionGap: spacing.md,
  /** Gap between stacked form fields/controls inside a card. */
  fieldGap: spacing.md,
  /** Extra room appended past a screen's own edge padding at the bottom of
   * a scroll view, so the last card clears the tab bar and home indicator
   * instead of sitting flush against them. */
  scrollEndPad: spacing.xl,
  /** Height of the sticky bottom action bar's own internal padding. */
  actionBarPadding: spacing.md,
};

/** Reused pixel dimensions that aren't spacing (avatars, badges, thumbnails)
 * but still need one definition instead of a magic number per screen. */
export const sizes = {
  avatar: 44,
  iconBadge: 40,
  stepBadge: 28,
  previewThumb: 96,
  previewLarge: 120,
  signatureHeight: 180,
  ticketNotch: 18,
  emptyStateIcon: 60,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const letterSpacing = {
  tightDisplay: -0.5,
  wideLabel: 0.6,
  wideEyebrow: 1.1,
};

// ---------------------------------------------------------------------------
// Type scale — the single source of hierarchy for every screen, card, row,
// badge, chip, input label, receipt and overlay. Each role bundles size,
// weight, line-height and tracking together so a screen picks a role, never
// a bare fontSize/fontWeight pair. Sizes hold a fixed rem-style scale (no
// fluid/clamp sizing) with a tighter ratio, per Operate-mode product UI, and
// respect the field-use floor: body text stays ≥15sp and captions ≥12sp so
// copy stays legible at arm's length in direct sunlight.
//
// System fonts only — no bundled/custom font files. iOS's SF Pro system
// font renders any fontWeight string faithfully; Android's default
// sans-serif family only ships four true static weights (regular, medium,
// bold, black), so intermediate requests are routed to the closest real
// family/weight pair instead of asking the OS to synthesize a weight it
// doesn't have.
type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

const ANDROID_FAMILY: Record<FontWeight, string> = {
  '400': 'sans-serif',
  '500': 'sans-serif-medium',
  '600': 'sans-serif-medium',
  '700': 'sans-serif',
  '800': 'sans-serif',
  '900': 'sans-serif-black',
};
const ANDROID_WEIGHT: Record<FontWeight, FontWeight> = {
  '400': '400',
  '500': '500',
  '600': '500',
  '700': '700',
  '800': '700',
  '900': '900',
};

/** Platform-aware weight: exact fontWeight on iOS, nearest real Android
 * system family + weight pair on Android. Exported for the rare case that
 * needs a weight at a size the scale doesn't name (e.g. an avatar's
 * initials, sized proportionally to the circle it sits in) — screens and
 * components should otherwise reach for a `type.<role>` below. */
export function fontWeight(w: FontWeight): { fontWeight: FontWeight; fontFamily?: string } {
  return Platform.OS === 'android'
    ? { fontFamily: ANDROID_FAMILY[w], fontWeight: ANDROID_WEIGHT[w] }
    : { fontWeight: w };
}

/** Tabular (fixed-width) figures — spread this onto any role wherever the
 * text is a money amount or a count, so digits never jitter as they change
 * and columns of numbers stay aligned. */
export const tabularNums: { fontVariant: ('tabular-nums' | 'lining-nums')[] } = { fontVariant: ['tabular-nums'] };

/** The platform's monospace system family — reserved for the receipt
 * number on the printed-ticket screen, never for general "technical" copy. */
export const monoFamily = Platform.select<string>({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export const type = {
  /** The hero outstanding/collected figure — the one number on a screen
   * meant to be read from arm's length at a glance. Pair with
   * AnimatedNumber's maxFontSizeMultiplier + adjustsFontSizeToFit so it
   * survives Dynamic Type without blowing out its card. */
  display: { fontSize: 36, lineHeight: 42, letterSpacing: -0.5, ...fontWeight('900') },
  /** Secondary emphasized numbers: KPI tiles, list-row amounts, deposit and
   * history amounts. Always pair with `tabularNums`. */
  stat: { fontSize: 24, lineHeight: 29, letterSpacing: -0.3, ...fontWeight('900') },
  /** Screen-level headings and card lead lines (e.g. "Cash deposits",
   * greeting, brand wordmark, empty-state title). */
  headline: { fontSize: 21, lineHeight: 26, letterSpacing: -0.4, ...fontWeight('800') },
  /** Card/section titles, list-row primary text (customer name, invoice
   * no.), step titles. */
  title: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, ...fontWeight('800') },
  /** Ordinary body copy: descriptions, instructions, ledger rows, error
   * copy. Field-use floor: never below 15sp. */
  body: { fontSize: 15, lineHeight: 21, letterSpacing: 0, ...fontWeight('500') },
  /** Field labels and small all-caps tags (input labels, step badges,
   * "Optional"). Not for badge/chip pill text, which keeps its own tight
   * pill-specific tracking. */
  label: { fontSize: 13, lineHeight: 16, letterSpacing: letterSpacing.wideLabel, ...fontWeight('700') },
  /** Metadata and fine print: timestamps, distances, helper text under a
   * value. Field-use floor: never below 12sp. */
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, ...fontWeight('600') },
  /** Form input text and placeholders — kept ≥16sp so focusing a field
   * never triggers iOS's automatic zoom. */
  input: { fontSize: 17, lineHeight: 22, ...fontWeight('500') },
};

// Real elevation: an offset + soft blur, never a flat/colored halo.
export const elevation = {
  card: {
    shadowColor: '#0B1F17',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  raised: {
    shadowColor: '#0B1F17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

/** Minimum touch target side, per the field-use a11y floor (≥48dp). */
export const minTouch = 48;

/** Android's native ripple feedback for a Pressable's `android_ripple` prop —
 * iOS keeps the app's scale/opacity press feedback (set elsewhere); Android
 * gets its own platform-conventional ripple instead of a ported effect.
 * Returns undefined on iOS so the prop is a no-op there. */
export function androidRipple(color: string = colors.text, opacity = 0.12): { color: string; borderless?: boolean } | undefined {
  return Platform.OS === 'android' ? { color: withAlpha(color, opacity) } : undefined;
}
