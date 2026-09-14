import { useColorScheme } from 'react-native';

export interface Palette {
  bg: string;
  bgElevated: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  good: string;
  bad: string;
  warn: string;
  neutralDot: string;
  overlay: string;
}

const light: Palette = {
  bg: '#F4F6F9',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E3E7EE',
  text: '#0F1720',
  textMuted: '#5B6472',
  textFaint: '#8A93A1',
  accent: '#2F6FED',
  good: '#12875B',
  bad: '#D0402A',
  warn: '#B8760B',
  neutralDot: '#9AA3B2',
  overlay: 'rgba(15,23,32,0.06)',
};

const dark: Palette = {
  bg: '#0B0E14',
  bgElevated: '#11151D',
  card: '#161B25',
  border: '#232A38',
  text: '#EDF1F7',
  textMuted: '#9AA5B4',
  textFaint: '#6B7484',
  accent: '#5B9CFF',
  good: '#3ED692',
  bad: '#FF6B57',
  warn: '#F2B84B',
  neutralDot: '#4A5364',
  overlay: 'rgba(255,255,255,0.06)',
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
