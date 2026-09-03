import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, type } from '../theme';

export function ProgressRing({
  progress,
  size = 84,
  stroke = 9,
  color = colors.primary,
  track = colors.line,
  label,
  sublabel,
  center,
}: {
  progress: number; // 0..1 (values above 1 fill the ring)
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sublabel?: string;
  center?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ alignItems: 'center', width: size + 8 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round" />
        </Svg>
        {center ?? <Text style={[type.h3, { fontSize: size >= 80 ? 17 : 14 }]}>{Math.round(progress * 100)}%</Text>}
      </View>
      {label ? <Text style={[type.small, { marginTop: 6, fontWeight: '600', color: colors.text, textAlign: 'center' }]}>{label}</Text> : null}
      {sublabel ? <Text style={[type.tiny, { textAlign: 'center' }]}>{sublabel}</Text> : null}
    </View>
  );
}
