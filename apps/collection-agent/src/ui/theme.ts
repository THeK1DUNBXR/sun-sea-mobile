// Light theme, high-contrast, large touch targets — designed for outdoor
// field use. One brand hue (SunSea green) carries identity; green / amber /
// red carry meaning (collected / promised / overdue) and nothing else.
export const colors = {
  bg: '#F5F7F6',
  bgAlt: '#EAF1ED',
  surface: '#FFFFFF',
  surfaceSunk: '#F1F5F3',
  border: '#DCE3E0',
  borderStrong: '#B9C7C0',
  text: '#0B1F17',
  textMuted: '#5B6D65',
  textFaint: '#8A9A93',

  primary: '#0F6E4F',
  primaryDark: '#0A4E38',
  primaryDeep: '#062E20',
  primaryTint: '#E4F5EC',
  onPrimary: '#FFFFFF',

  success: '#1B8A5A',
  successTint: '#E4F5EC',
  warning: '#B7791F',
  warningTint: '#FBF0DD',
  danger: '#C0392B',
  dangerTint: '#FBE7E4',
  info: '#1B6FA8',
  infoTint: '#E2F0FA',

  overdue: '#C0392B',
  ptp: '#B7791F',
  chipBg: '#E9F2EE',

  // Priority markers — used as small filled dots / avatar rings, never as
  // left-edge stripes.
  priorityUrgent: '#C0392B',
  priorityHigh: '#B7791F',
  priorityNormal: '#0F6E4F',
  priorityLow: '#5B6D65',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// A decisive, slightly tighter-than-default scale so real copy and big
// money figures both read from arm's length without fluid sizing.
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  display: 40,
};

export const letterSpacing = {
  tightDisplay: -0.5,
  wideLabel: 0.6,
  wideEyebrow: 1.1,
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
