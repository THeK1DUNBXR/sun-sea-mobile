/**
 * Visual language lifted from the ERP's Management TV Dashboard
 * (frontend/src/modules/dashboard/tv): near-black navy board with CRT
 * scanlines, monospace tabular type, sharp 2 px corners, thin panel borders,
 * a coloured rail on KPI cards, neon status accents (green / amber / red /
 * blue) and a teal brand accent. The oklch values of the web theme are
 * converted to hex here because React Native has no oklch support.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Palette {
  bg: string;
  scan: string;
  panel: string;
  panelBorder: string;
  tile: string;
  track: string;
  text: string;
  textDim: string;
  textMute: string;
  badgeBg: string;
  badgeBorder: string;
  headerBorder: string;
}
export interface Accents {
  green: string;
  amber: string;
  red: string;
  blue: string;
  accentBg: string;
  accentText: string;
  critTint: string;
  lowTint: string;
  okTint: string;
}

const DARK: Palette = {
  bg: '#0B0F17',
  scan: 'rgba(28,34,48,0.55)',
  panel: '#131A26',
  panelBorder: '#2B3648',
  tile: '#1B2434',
  track: '#222D3E',
  text: '#F2F4F8',
  textDim: '#A3ADBF',
  textMute: '#6F7B90',
  badgeBg: '#1B2434',
  badgeBorder: '#354256',
  headerBorder: '#26303F',
};
const LIGHT: Palette = {
  bg: '#F5F6F9',
  scan: 'rgba(210,214,222,0.6)',
  panel: '#FFFFFF',
  panelBorder: '#CBD1DC',
  tile: '#EEF0F5',
  track: '#DDE1EA',
  text: '#131A26',
  textDim: '#4C5567',
  textMute: '#6B7385',
  badgeBg: '#EEF0F5',
  badgeBorder: '#CBD1DC',
  headerBorder: '#D3D8E2',
};
const DARK_A: Accents = {
  green: '#3DE07A',
  amber: '#F2B83B',
  red: '#FF5A5A',
  blue: '#45B8F5',
  accentBg: '#2BC4AE',
  accentText: '#08201C',
  critTint: '#3A1418',
  lowTint: '#3B2E12',
  okTint: '#0F2A1C',
};
const LIGHT_A: Accents = {
  green: '#128A3E',
  amber: '#B8710A',
  red: '#C8322A',
  blue: '#1D6FB8',
  accentBg: '#0E8A79',
  accentText: '#FFFFFF',
  critTint: '#FBE3E1',
  lowTint: '#FBEBD0',
  okTint: '#DDF5E6',
};

export type Mode = 'dark' | 'light';
export interface TvTheme {
  T: Palette;
  A: Accents;
  isDark: boolean;
  mode: Mode;
  toggle: () => void;
}

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

const KEY = 'insights.theme';
const Ctx = createContext<TvTheme>({ T: DARK, A: DARK_A, isDark: true, mode: 'dark', toggle: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'light' || v === 'dark') && setMode(v))
      .catch(() => undefined);
  }, []);
  const toggle = useCallback(() => {
    setMode((m) => {
      const next: Mode = m === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(KEY, next).catch(() => undefined);
      return next;
    });
  }, []);
  const value = useMemo<TvTheme>(() => ({ T: mode === 'dark' ? DARK : LIGHT, A: mode === 'dark' ? DARK_A : LIGHT_A, isDark: mode === 'dark', mode, toggle }), [mode, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Threshold colouring shared by production lines and achievement gauges. */
export const pctColor = (pct: number, A: Accents) => (pct >= 85 ? A.green : pct >= 75 ? A.amber : A.red);

/** Signed trend as arrow + magnitude, e.g. "↑ 12%". */
export const trendText = (pct: number | null | undefined) => {
  if (pct == null || !isFinite(pct)) return '—';
  const r = Math.round(pct);
  if (r === 0) return '→ 0%';
  return `${r > 0 ? '↑' : '↓'} ${Math.abs(r)}%`;
};
export const trendColor = (pct: number | null | undefined, A: Accents, invert = false) => {
  if (pct == null || !isFinite(pct) || Math.round(pct) === 0) return A.blue;
  const good = invert ? pct < 0 : pct > 0;
  return good ? A.green : A.red;
};

/** Compact Indian notation, identical to the web ticker. */
export const inrCompact = (v: number | null | undefined): string => {
  const n = Number(v || 0);
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `₹${Math.round(n).toLocaleString('en-IN')}`;
  return `₹${n.toFixed(0)}`;
};
