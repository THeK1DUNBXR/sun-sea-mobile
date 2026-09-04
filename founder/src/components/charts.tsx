/**
 * Small SVG charts following the dataviz rules: thin marks, 4px rounded
 * data-ends, one axis, recessive grid, direct labels only where they matter,
 * text in text tokens (never series colour), 2px surface gaps between fills.
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, series, spacing, type } from '../theme';
import { compact } from '../format';

export function Bars({ data, height = 140, color = series[0], highlightLast = true, labelEvery = 1, formatY = compact }: { data: { label: string; value: number }[]; height?: number; color?: string; highlightLast?: boolean; labelEvery?: number; formatY?: (n: number) => string }) {
  const [w, setW] = React.useState(0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const padB = 22;
  const padT = 18;
  const plotH = height - padB - padT;
  const gap = 2;
  const slot = w / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, slot - gap * 2));
  const maxIdx = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {[0.5, 1].map((f) => (
            <Line key={f} x1={0} x2={w} y1={padT + plotH * (1 - f)} y2={padT + plotH * (1 - f)} stroke={colors.line} strokeWidth={1} />
          ))}
          <Line x1={0} x2={w} y1={padT + plotH} y2={padT + plotH} stroke={colors.faint} strokeWidth={1} />
          {data.map((d, i) => {
            const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotH);
            const x = i * slot + (slot - barW) / 2;
            const y = padT + plotH - h;
            const isHi = highlightLast && i === data.length - 1;
            return (
              <React.Fragment key={i}>
                <Path d={`M${x},${y + h} V${y + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${y + h} Z`} fill={color} opacity={isHi || i === maxIdx ? 1 : 0.55} />
                {(isHi || i === maxIdx) && d.value > 0 ? (
                  <SvgText x={x + barW / 2} y={y - 5} fontSize={11} fontWeight="700" fill={colors.text} textAnchor="middle">
                    {formatY(d.value)}
                  </SvgText>
                ) : null}
                {i % labelEvery === 0 || i === data.length - 1 ? (
                  <SvgText x={x + barW / 2} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">
                    {d.label}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

export function Sparkline({ data, height = 44, color = series[0], width }: { data: number[]; height?: number; color?: string; width?: number }) {
  const [w, setW] = React.useState(width ?? 0);
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * (w - 8) + 4, 4 + (1 - (v - min) / range) * (height - 8)] as const);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <View onLayout={(e) => !width && setW(e.nativeEvent.layout.width)} style={{ height, width }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {last ? <Circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke={colors.card} strokeWidth={2} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Horizontal bars with direct labels — for ranked lists (top customers, ageing buckets). */
export function HBars({ data, color = series[0], tones, format = compact }: { data: { label: string; value: number; sub?: string }[]; color?: string; tones?: string[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[type.small, { color: colors.text, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
              {d.label}
              {d.sub ? <Text style={type.tiny}> · {d.sub}</Text> : null}
            </Text>
            <Text style={[type.small, { color: colors.text, fontWeight: '700' }]}>{format(d.value)}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: 8, width: `${Math.max(2, Math.round((d.value / max) * 100))}%`, backgroundColor: tones?.[i] ?? color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Donut with a legend (identity never by colour alone). */
export function Donut({ data, size = 132, center, format = compact }: { data: { label: string; value: number }[]; size?: number; center?: { value: string; label: string }; format?: (n: number) => string }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={series[i % series.length]} strokeWidth={14} fill="none" strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </Svg>
        {center ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={[type.h3, { fontSize: 17 }]}>{center.value}</Text>
            <Text style={type.tiny}>{center.label}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: series[i % series.length] }} />
            <Text style={[type.small, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={[type.small, { fontWeight: '700', color: colors.text }]}>{format(d.value)}</Text>
            <Text style={[type.tiny, { width: 34, textAlign: 'right' }]}>{Math.round((d.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Two-series grouped bars (e.g. target vs actual) with a legend. */
export function Progress({ value, target, color = series[1] }: { value: number; target: number; color?: string }) {
  const p = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ height: 10, width: `${Math.round(p * 100)}%`, backgroundColor: color, borderRadius: 5 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={type.tiny}>{compact(value)} achieved</Text>
        <Text style={type.tiny}>{Math.round(p * 100)}% of {compact(target)}</Text>
      </View>
    </View>
  );
}

/** Legend row for multi-series visuals. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: it.color }} />
          <Text style={type.tiny}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
