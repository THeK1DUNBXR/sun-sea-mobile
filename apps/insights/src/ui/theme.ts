import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, type ViewStyle } from 'react-native';

export interface Palette {
  bg: string;
  bgElevated: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  good: string;
  goodSoft: string;
  bad: string;
  badSoft: string;
  warn: string;
  warnSoft: string;
  neutralDot: string;
  overlay: string;
  shadow: string;
}

// A deliberate, disciplined signature accent (deep indigo) instead of a generic
// admin blue — reserved for interactive elements, hero emphasis and brand marks.
// Semantic green/red/amber stay clearly separated in hue from it.
const light: Palette = {
  bg: '#F5F3EF',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E6E1D6',
  text: '#12181F',
  textMuted: '#5B6472',
  textFaint: '#8A93A1',
  accent: '#3730A3',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(55,48,163,0.10)',
  good: '#0F7A52',
  goodSoft: 'rgba(15,122,82,0.12)',
  bad: '#B91C1C',
  badSoft: 'rgba(185,28,28,0.12)',
  warn: '#B45309',
  warnSoft: 'rgba(180,83,9,0.12)',
  neutralDot: '#9AA3B2',
  overlay: 'rgba(17,24,39,0.06)',
  shadow: 'rgba(19,26,38,0.16)',
};

const dark: Palette = {
  bg: '#0A0D12',
  bgElevated: '#12161E',
  card: '#161A24',
  border: '#242B38',
  text: '#F3F5F9',
  textMuted: '#9BA5B4',
  textFaint: '#6C7686',
  accent: '#A5B4FC',
  accentInk: '#181A3D',
  accentSoft: 'rgba(165,180,252,0.14)',
  good: '#34D399',
  goodSoft: 'rgba(52,211,153,0.14)',
  bad: '#F87171',
  badSoft: 'rgba(248,113,113,0.14)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.14)',
  neutralDot: '#4A5364',
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

/** Type scale: a decisive editorial hierarchy with tight tracking on large sizes. */
export const typography = {
  label: { fontSize: 12.5, fontWeight: '700' as const, letterSpacing: 0.3 },
  body: { fontSize: 14.5, fontWeight: '600' as const, letterSpacing: -0.1 },
  headline: { fontSize: 27, fontWeight: '800' as const, letterSpacing: -0.7 },
  hero: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -1.1 },
  statLg: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.7 },
  stat: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.4 },
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
