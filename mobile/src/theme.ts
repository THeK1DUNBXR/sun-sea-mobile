/**
 * Design tokens. Sized for outdoor field use: 16 px body text, 48 dp touch
 * targets, strong contrast (navy on off-white), restrained accent colours that
 * do not wash out in sunlight.
 */
export const colors = {
  primary: '#1F3A5F',
  primaryDark: '#162B47',
  primarySoft: '#E8EEF6',
  accent: '#0F766E',
  accentSoft: '#CCFBF1',
  bg: '#F3F5F9',
  card: '#FFFFFF',
  line: '#E2E8F0',
  text: '#0F172A',
  muted: '#5B6B7F',
  faint: '#94A3B8',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  gold: '#CA8A04',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const touch = { min: 48 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 13, color: colors.muted },
  tiny: { fontSize: 12, color: colors.faint },
  money: { fontSize: 24, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
};

export const shadow = {
  card: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
};
