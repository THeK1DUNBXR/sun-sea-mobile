import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

export interface Palette {
  /** Screen canvas — the largest, quietest surface. */
  bg: string;
  /** A lifted surface above the canvas (tab bar, map fallback). */
  bgElevated: string;
  /** Card / row surface, one step above canvas. */
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Signature deep indigo — interactive elements, hero emphasis, brand marks. */
  accent: string;
  accentInk: string;
  accentSoft: string;
  /** Positive deltas and collections (money coming in). */
  good: string;
  goodSoft: string;
  /** Negative deltas and hard failures. */
  bad: string;
  badSoft: string;
  /** A visible-but-quiet border for a bad-toned banner/callout. */
  badBorder: string;
  /** Caution: promise-to-pay and overdue receivables — distinct from a hard failure. */
  warn: string;
  warnSoft: string;
  warnBorder: string;
  /** Live/online/freshness state — kept apart from "good" so a green uptick and a
   * blue "still connected" dot are never confused for the same kind of news. */
  info: string;
  infoSoft: string;
  /** Awaiting-action states (e.g. pending verification) — deliberately quiet,
   * neither a caution nor a result. */
  neutral: string;
  neutralSoft: string;
  /** Map marker / status dot for an agent that's offline or hasn't reported recently. */
  neutralDot: string;
  /** Receivables aging ramp, low → critical (0–30 / 31–60 / 61–90 / 90+ days). */
  agingLow: string;
  agingMedium: string;
  agingHigh: string;
  agingCritical: string;
  /** Trend-chart series colors (sales vs collections). */
  chartSales: string;
  chartCollections: string;
  /** Live-map marker fill for an agent reporting now vs one gone stale. */
  markerOnline: string;
  markerStale: string;
  /** Rank 1–3 accents for leaderboards and top-debtor emphasis (gold/silver/bronze). */
  rankGold: string;
  rankGoldSoft: string;
  rankSilver: string;
  rankSilverSoft: string;
  rankBronze: string;
  rankBronzeSoft: string;
  overlay: string;
  shadow: string;
}

// A deliberate, disciplined signature accent (deep indigo) instead of a generic
// admin blue — reserved for interactive elements, hero emphasis and brand marks.
// Semantic green/red/amber/blue stay clearly separated in hue from it, and from
// each other, so no two roles can be mistaken for one another.
const light: Palette = {
  bg: '#F5F3EF',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E6E1D6',
  text: '#12181F',
  textMuted: '#5B6472',
  textFaint: '#647085',
  accent: '#3730A3',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(55,48,163,0.10)',
  good: '#0A5F3F',
  goodSoft: 'rgba(10,95,63,0.12)',
  bad: '#B91C1C',
  badSoft: 'rgba(185,28,28,0.12)',
  badBorder: 'rgba(185,28,28,0.3)',
  warn: '#8B3F0A',
  warnSoft: 'rgba(139,63,10,0.12)',
  warnBorder: 'rgba(139,63,10,0.3)',
  info: '#0A5B70',
  infoSoft: 'rgba(10,91,112,0.12)',
  neutral: '#4C5872',
  neutralSoft: 'rgba(76,88,114,0.12)',
  neutralDot: '#9AA3B2',
  agingLow: '#0A5F3F',
  agingMedium: '#8B3F0A',
  agingHigh: '#A63709',
  agingCritical: '#B91C1C',
  chartSales: '#3730A3',
  chartCollections: '#0A5F3F',
  markerOnline: '#0A5B70',
  markerStale: '#9AA3B2',
  rankGold: '#8A5F00',
  rankGoldSoft: 'rgba(138,95,0,0.12)',
  rankSilver: '#57687F',
  rankSilverSoft: 'rgba(87,104,127,0.12)',
  rankBronze: '#954D24',
  rankBronzeSoft: 'rgba(149,77,36,0.12)',
  overlay: 'rgba(17,24,39,0.06)',
  shadow: 'rgba(19,26,38,0.16)',
};

// Dark mode is composed, not inverted: surfaces lift in discrete steps rather
// than staying flat-black, and every hue below is deliberately desaturated-but-
// lightened (not just the light value pasted onto a dark ground) so nothing
// vibrates against the near-black canvas.
const dark: Palette = {
  bg: '#0A0D12',
  bgElevated: '#12161E',
  card: '#161A24',
  border: '#242B38',
  text: '#F3F5F9',
  textMuted: '#9BA5B4',
  textFaint: '#8891A0',
  accent: '#A5B4FC',
  accentInk: '#181A3D',
  accentSoft: 'rgba(165,180,252,0.14)',
  good: '#34D399',
  goodSoft: 'rgba(52,211,153,0.14)',
  bad: '#F87171',
  badSoft: 'rgba(248,113,113,0.14)',
  badBorder: 'rgba(248,113,113,0.35)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.14)',
  warnBorder: 'rgba(251,191,36,0.35)',
  info: '#22D3EE',
  infoSoft: 'rgba(34,211,238,0.14)',
  neutral: '#94A3B8',
  neutralSoft: 'rgba(148,163,184,0.14)',
  neutralDot: '#4A5364',
  agingLow: '#34D399',
  agingMedium: '#FBBF24',
  agingHigh: '#FB923C',
  agingCritical: '#F87171',
  chartSales: '#A5B4FC',
  chartCollections: '#34D399',
  markerOnline: '#22D3EE',
  markerStale: '#4A5364',
  rankGold: '#E8B923',
  rankGoldSoft: 'rgba(232,185,35,0.14)',
  rankSilver: '#B8C0CC',
  rankSilverSoft: 'rgba(184,192,204,0.14)',
  rankBronze: '#D98A54',
  rankBronzeSoft: 'rgba(217,138,84,0.14)',
  overlay: 'rgba(255,255,255,0.07)',
  shadow: 'rgba(0,0,0,0.6)',
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/**
 * Named layout roles, every one just a pointer into `spacing`. Screens should
 * reach for these instead of picking a raw `spacing.*` step per call site, so
 * screen gutters, card padding, section rhythm, list-row height and the
 * scroll-end spacer stay a single decision made here rather than one made
 * fresh (and inconsistently) at every screen.
 */
export const layout = {
  /** Horizontal/vertical padding at the edge of every scrollable screen. */
  screenGutter: spacing.lg,
  /** Matches Card's own default padding — kept explicit for non-Card containers. */
  cardPadding: spacing.lg,
  /** Space above a section header (see Section.tsx). */
  sectionGapTop: spacing.xl,
  /** Space below a section header's title block, before its content. */
  sectionGapBottom: spacing.md,
  /** Vertical padding inside a list row (debtor / leaderboard / activity rows). */
  rowPaddingV: spacing.md,
  /** Horizontal padding inside a list row. */
  rowPaddingH: spacing.lg,
  /** Gap between a row's rank / avatar / text / number columns. */
  rowGap: spacing.md,
  /** Gap between tiles in the KPI grid. */
  gridGap: spacing.md,
  /** Breathing room at the end of every scroll view, clear of the tab bar. */
  scrollEndSpacer: spacing.xxl,
};

/**
 * Fixed dp sizes reused across list rows, avatars and map markers so repeated
 * elements line up on the same grid from screen to screen instead of
 * drifting by a few px each time one gets rewritten.
 */
export const sizes = {
  rankBadge: 26,
  avatarSm: 32,
  avatarMd: 56,
  iconBadgeSm: 36,
  iconBadgeMd: 48,
  mapMarkerRing: 40,
  mapMarkerBubble: 30,
  chipPaddingH: 10,
  chipPaddingV: 6,
};

/**
 * Platform-aware weight ceiling. SF Pro on iOS renders true 800/900
 * instances, but the system Roboto family on Android ships only discrete
 * Regular(400)/Medium(500)/Bold(700) font files — asking the OS for 600,
 * 800 or 900 without a bundled variable font gets silently clamped (or
 * faux-bolded) in an OEM-inconsistent way. Every weight in the scale below
 * is chosen through this so iOS keeps its heavier editorial voice while
 * Android always lands on one of its three real weights.
 */
type FontWeight = '900' | '800' | '700' | '600' | '500' | '400';
function platformWeight(ios: FontWeight, android: FontWeight): FontWeight {
  return Platform.OS === 'android' ? android : ios;
}
const heavy = () => platformWeight('800', '700'); // hero/stat figures, headline
const bold = () => platformWeight('700', '700'); // titles, primary row text, labels
const mediumWeight = () => platformWeight('600', '500'); // captions, secondary meta

/** fontVariant: tabular-nums — mix into any role rendering a number so digits
 * never shift width mid count-up/refresh. Applied directly inside every
 * numeric role below; exported standalone for the few ad hoc numeric spots
 * (badge counts, rank digits) that borrow a non-numeric role's size. */
export const tabularNums: { fontVariant: TextStyle['fontVariant'] } = { fontVariant: ['tabular-nums'] };

/** Comfortable reading width for wrapped multi-line copy (empty states, error
 * banners, settings descriptions) — independent of screen width so a tablet
 * doesn't stretch a sentence into a single unreadable line. */
export const MEASURE = 320;

/**
 * The app's one explicit type scale. Every role carries size, weight,
 * line-height and letter-spacing together so hierarchy is a single decision
 * made here, not a fresh (and inconsistently legible) choice at every call
 * site. Two rules hold for every role: nothing below a 12sp caption floor,
 * and every numeric role ships tabular-nums baked in.
 */
export const typography = {
  /** Display/hero: the one dominant figure per screen (the MTD sales hero tile). */
  display: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: heavy(),
    letterSpacing: -1.1,
    ...tabularNums,
  },
  /** Stat: primary KPI-tile figures (the default grid) and other tile-bound headline numbers. */
  stat: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: heavy(),
    letterSpacing: -0.7,
    ...tabularNums,
  },
  /** Stat, compact: a KPI figure sharing its row with other content (the wide tile). */
  statCompact: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: heavy(),
    letterSpacing: -0.4,
    ...tabularNums,
  },
  /** Headline: a screen's own H1 ("Overview", "Agents", "Activity", "Settings"). */
  headline: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: heavy(),
    letterSpacing: -0.6,
  },
  /** Title: card/section headers and a list row's primary line. */
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: bold(),
    letterSpacing: -0.2,
  },
  /** Title, small: secondary titles — day-group labels, empty-state titles, badges of prominence below a section header. */
  titleSm: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: bold(),
    letterSpacing: -0.1,
  },
  /** Body: the ordinary reading size — settings rows, descriptions, empty-state and error-banner copy. */
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: mediumWeight(),
    letterSpacing: 0,
  },
  /** Body, small: a bold secondary line under a title (row meta, greeting) — small but still confident, matching the app's editorial weight. */
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: bold(),
    letterSpacing: 0,
  },
  /** Label: the app's one uppercase-micro-label convention (case + tracking live here, nowhere else). */
  label: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: heavy(),
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  /** Caption: the smallest legible role — timestamps, chart axis/legend text, footnotes. Never sized below 12sp. */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: mediumWeight(),
    letterSpacing: 0.1,
  },
  /** Mono-numeric: tabular figures inside list rows, chart legends and map callouts — a size step below `stat`. */
  mono: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: heavy(),
    letterSpacing: 0,
    ...tabularNums,
  },
  /** Mono-numeric, small: the same tabular treatment at caption size (deltas, legend values, callout amounts). */
  monoSm: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: bold(),
    letterSpacing: 0,
    ...tabularNums,
  },
  /** Control: interactive control text — primary button labels. */
  control: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: bold(),
    letterSpacing: -0.1,
  },
};

/** Elevation that reads in both themes: a real shadow in light mode, a border-led lift in dark mode. */
export function useElevation(level: 'flat' | 'card' | 'raised' = 'card'): ViewStyle {
  const dark = useIsDark();
  if (level === 'flat') return {};
  const palette = dark ? dark_ : light_;
  if (Platform.OS === 'android') {
    return { elevation: level === 'raised' ? 8 : dark ? 0 : 3 };
  }
  return {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: level === 'raised' ? 10 : 4 },
    shadowOpacity: dark ? (level === 'raised' ? 0.5 : 0.35) : level === 'raised' ? 0.16 : 0.08,
    shadowRadius: level === 'raised' ? 20 : 10,
  };
}
// internal aliases to avoid re-computing the color scheme twice above
const light_ = light;
const dark_ = dark;

/** Respect the OS "reduce motion" accessibility setting for any decorative animation. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduced(!!v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

export const MIN_TOUCH = 44;

/** Picks black or white text for legible contrast on an arbitrary fill color (e.g. a map marker). */
export function contrastText(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#12181F' : '#FFFFFF';
}
