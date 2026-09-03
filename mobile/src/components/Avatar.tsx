import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme';

const PALETTE = ['#1F3A5F', '#0F766E', '#B45309', '#7C3AED', '#BE185D', '#0369A1', '#4D7C0F'];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = PALETTE[hash % PALETTE.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.card, fontWeight: '700', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}
