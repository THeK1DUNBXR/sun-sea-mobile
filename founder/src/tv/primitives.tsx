import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Line, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MONO, useTheme, type TvTheme } from './theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/* ── Type helpers ─────────────────────────────────────────────────── */
export const mono = (extra?: TextStyle): TextStyle => ({ fontFamily: MONO, fontVariant: ['tabular-nums'], ...extra });
export const CAPS: TextStyle = { fontFamily: MONO, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' };

/* ── Count-up: numbers roll in like a wall display waking up ─────── */
export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = Date.now();
    const begin = from.current;
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setV(begin + (target - begin) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/* ── Scanlines (CRT texture from the design) ──────────────────────── */
export function Scanlines({ color }: { color: string }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="scan" patternUnits="userSpaceOnUse" width="4" height="28">
          <Rect x="0" y="0" width="4" height="1" fill={color} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scan)" />
    </Svg>
  );
}

/* ── LIVE dot (blinks) ────────────────────────────────────────────── */
export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(op, { toValue: 0.15, duration: 700, easing: Easing.step0, useNativeDriver: true }), Animated.timing(op, { toValue: 1, duration: 700, easing: Easing.step0, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />;
}

/* ── Ticker (scrolls right-to-left forever) ───────────────────────── */
export function Ticker({ text, color }: { text: string; color: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: Math.max(12000, w * 22), easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [w, x, text]);
  return (
    <View style={{ overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        <Text onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[mono({ fontSize: 12, color, fontWeight: '600' }), { paddingRight: 48 }]} numberOfLines={1}>
          {text}
        </Text>
        <Text style={[mono({ fontSize: 12, color, fontWeight: '600' }), { paddingRight: 48 }]} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

/* ── Board: header + banner + ticker + scanlines shell ───────────── */
export function Board({
  scene,
  children,
  banner,
  ticker,
  back,
  right,
}: {
  scene: string;
  children: React.ReactNode;
  banner?: { level: 'alert' | 'ok'; headline: string; sub?: string };
  ticker?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const th = useTheme();
  const { T, A } = th;
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <Scanlines color={T.scan} />
      {/* HEADER */}
      <View style={[s.header, { borderBottomColor: T.headerBorder }]}>
        <BackOrLogo back={back} th={th} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[mono({ fontSize: 15, fontWeight: '800', color: T.text, letterSpacing: 0.3 })]} numberOfLines={1}>
            SUNSEA ERP <Text style={{ fontWeight: '500', color: T.textDim }}>— Insights</Text>
          </Text>
          <Text style={[CAPS, { fontSize: 11, color: T.textMute, marginTop: 1 }]} numberOfLines={1}>
            {scene}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <Text style={mono({ fontSize: 12, fontWeight: '700', color: T.text })}>{dateStr}</Text>
          <Text style={mono({ fontSize: 11, color: T.textMute })}>{timeStr}</Text>
        </View>
        {right ?? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[s.badge, { backgroundColor: T.badgeBg, borderColor: T.badgeBorder }]}>
              <LiveDot color={A.red} />
              <Text style={mono({ fontSize: 10, fontWeight: '800', color: T.text, letterSpacing: 1 })}>LIVE</Text>
            </View>
            <Pressable onPress={th.toggle} hitSlop={8} style={[s.badge, { backgroundColor: T.badgeBg, borderColor: T.badgeBorder, paddingHorizontal: 8 }]}>
              <Ionicons name={th.isDark ? 'sunny-outline' : 'moon-outline'} size={14} color={T.textDim} />
            </Pressable>
          </View>
        )}
      </View>

      {/* BANNER */}
      {banner ? (
        <View style={[s.banner, { backgroundColor: banner.level === 'alert' ? A.critTint : A.okTint, borderBottomColor: T.headerBorder }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: banner.level === 'alert' ? A.red : A.green }} />
          <Text style={[mono({ fontSize: 12, fontWeight: '800', color: banner.level === 'alert' ? A.red : A.green, letterSpacing: 0.3 }), { flex: 1 }]} numberOfLines={1}>
            {banner.headline}
          </Text>
          {banner.sub ? (
            <Text style={mono({ fontSize: 10, color: T.textDim })} numberOfLines={1}>
              {banner.sub}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 28, gap: 10 }}>{children}</ScrollView>

      {/* TICKER */}
      {ticker ? (
        <View style={[s.footer, { borderTopColor: T.headerBorder, backgroundColor: T.bg }]}>
          <Ticker text={ticker} color={T.textMute} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function BackOrLogo({ back, th }: { back?: boolean; th: TvTheme }) {
  const { A, T } = th;
  // Navigation is imported lazily to keep this primitive usable outside a navigator.
  const nav = require('@react-navigation/native').useNavigation();
  if (back) {
    return (
      <Pressable onPress={() => nav.goBack()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
        <Ionicons name="chevron-back" size={24} color={T.text} />
      </Pressable>
    );
  }
  return (
    <View style={{ width: 32, height: 32, borderRadius: 2, backgroundColor: A.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
      <Text style={mono({ fontSize: 16, fontWeight: '800', color: A.accentText })}>S</Text>
    </View>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────── */
export function Panel({ title, right, accentBorder, children, style }: { title?: string; right?: React.ReactNode; accentBorder?: string; children: React.ReactNode; style?: ViewStyle }) {
  const { T } = useTheme();
  return (
    <View style={[s.panel, { backgroundColor: T.panel, borderColor: accentBorder ?? T.panelBorder, borderWidth: accentBorder ? 2 : 1 }, style]}>
      {title || right ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 8 }}>
          {title ? <Text style={[mono({ fontSize: 14, fontWeight: '800', color: T.text, letterSpacing: 0.4 }), { flex: 1 }]}>{title}</Text> : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/* ── KPI card with coloured rail ──────────────────────────────────── */
export function KpiCard({ label, value, numeric, format, sub, trend, trendColor, color, valueSize = 26, style }: { label: string; value?: string; numeric?: number; format?: (n: number) => string; sub?: string; trend?: string; trendColor?: string; color: string; valueSize?: number; style?: ViewStyle }) {
  const { T } = useTheme();
  const n = useCountUp(numeric ?? 0);
  const shown = numeric !== undefined && format ? format(n) : value ?? '';
  return (
    <View style={[s.panel, { backgroundColor: T.panel, borderColor: T.panelBorder, flex: 1, minWidth: '46%', paddingLeft: 16, overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, backgroundColor: color }} />
      <Text style={[CAPS, { fontSize: 10, color: T.textMute, letterSpacing: 0.8 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={mono({ fontSize: valueSize, fontWeight: '800', color, lineHeight: valueSize + 4, marginTop: 4 })} numberOfLines={1} adjustsFontSizeToFit>
        {shown}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
        <Text style={[mono({ fontSize: 11, color: T.textDim }), { flex: 1 }]} numberOfLines={1}>
          {sub ?? ''}
        </Text>
        {trend ? <Text style={mono({ fontSize: 12, fontWeight: '800', color: trendColor ?? T.textDim })}>{trend}</Text> : null}
      </View>
    </View>
  );
}

/* ── Circular gauge with glow ─────────────────────────────────────── */
export function Gauge({ pct, color, size = 76, label, display }: { pct: number; color: string; size?: number; label?: string; display?: string }) {
  const { T } = useTheme();
  const stroke = 9;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const anim = useCountUp(p, 1000);
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={`g${color.replace('#', '')}`} cx="50%" cy="50%" r="50%">
              <Stop offset="60%" stopColor={color} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#g${color.replace('#', '')})`} />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={T.track} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - anim)} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </Svg>
        <Text style={mono({ fontSize: size >= 90 ? 18 : 14, fontWeight: '800', color })}>{display ?? `${Math.round(pct)}%`}</Text>
      </View>
      {label ? <Text style={[CAPS, { fontSize: 10, color: T.textMute, textAlign: 'center' }]}>{label}</Text> : null}
    </View>
  );
}

/* ── Horizontal progress row ──────────────────────────────────────── */
export function BarRow({ name, pct, color, valueText, status, nameWidth = 96, barHeight = 18 }: { name: string; pct: number; color: string; valueText?: string; status?: string; nameWidth?: number; barHeight?: number }) {
  const { T } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(100, pct)), duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={[mono({ fontSize: 12, fontWeight: '700', color: T.textDim }), { width: nameWidth }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={{ flex: 1, height: barHeight, backgroundColor: T.track, borderWidth: 1, borderColor: T.panelBorder, borderRadius: 1, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
      </View>
      <Text style={[mono({ fontSize: 13, fontWeight: '800', color }), { width: 64, textAlign: 'right' }]} numberOfLines={1}>
        {valueText ?? `${Math.round(pct)}%`}
      </Text>
      {status ? (
        <Text style={[mono({ fontSize: 11, color: T.textDim }), { width: 84, textAlign: 'right' }]} numberOfLines={1}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

/* ── Zero-based bar chart on a track ──────────────────────────────── */
export function BarChart({ points, color, height = 110, showDays = true }: { points: { day: string; value: number }[]; color: string; height?: number; showDays?: boolean }) {
  const { T } = useTheme();
  const peak = Math.max(...points.map((p) => p.value), 0) * 1.15;
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 4, backgroundColor: T.track, borderRadius: 1, padding: 6 }}>
      {points.map((p, i) => (
        <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
          <View style={{ width: '62%', minHeight: 3, height: `${peak > 0 ? (p.value / peak) * 100 : 0}%`, backgroundColor: color, opacity: i === points.length - 1 ? 1 : 0.8 }} />
          {showDays ? <Text style={mono({ fontSize: 9, color: T.textMute })}>{p.day}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/* ── Trend card: label, trend, sparkline ─────────────────────────── */
export function TrendCard({ label, trend, trendColor, points, color }: { label: string; trend: string; trendColor: string; points: number[]; color: string }) {
  const { T } = useTheme();
  const [w, setW] = useState(0);
  const h = 44;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const pts = points.map((v, i) => [4 + (i / Math.max(1, points.length - 1)) * (w - 8), 4 + (1 - (v - min) / range) * (h - 8)] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = pts.length ? `${d} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z` : '';
  return (
    <View style={[s.panel, { backgroundColor: T.panel, borderColor: T.panelBorder, flex: 1 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Text style={[CAPS, { fontSize: 10, color: T.textMute }]}>{label}</Text>
        <Text style={mono({ fontSize: 13, fontWeight: '800', color: trendColor })}>{trend}</Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
        {w > 0 ? (
          <Svg width={w} height={h}>
            <Path d={area} fill={color} opacity={0.15} />
            <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
            <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={color} />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

/* ── Pipeline tile: giant number + label ─────────────────────────── */
export function PipelineTile({ count, label, color, alert }: { count: number; label: string; color: string; alert?: boolean }) {
  const { T, A } = useTheme();
  const n = useCountUp(count, 700);
  return (
    <View style={{ flex: 1, minWidth: '30%', backgroundColor: alert ? A.critTint : T.tile, borderWidth: 1, borderColor: alert ? A.red : T.panelBorder, borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 }}>
      <Text style={mono({ fontSize: 34, fontWeight: '800', color: alert ? A.red : color, lineHeight: 36 })}>{Math.round(n)}</Text>
      <Text style={[mono({ fontSize: 10, fontWeight: '700', color: alert ? A.red : T.textDim, letterSpacing: 0.4 }), { textAlign: 'center' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/* ── Attention row ────────────────────────────────────────────────── */
export function AttentionRow({ level, text, right }: { level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'; text: string; right?: string }) {
  const { T, A } = useTheme();
  const color = level === 'CRITICAL' ? A.red : level === 'HIGH' ? A.amber : A.blue;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: T.tile, borderRadius: 2, paddingVertical: 8, paddingHorizontal: 10 }}>
      <Text style={[mono({ fontSize: 10, fontWeight: '800', color, letterSpacing: 0.6 }), { width: 64, paddingTop: 2 }]}>{level}</Text>
      <Text style={[mono({ fontSize: 13, fontWeight: '600', color: T.text }), { flex: 1 }]}>{text}</Text>
      {right ? <Text style={mono({ fontSize: 12, fontWeight: '800', color: T.text })}>{right}</Text> : null}
    </View>
  );
}

/* ── Simple list row on a tile ────────────────────────────────────── */
export function TileRow({ title, sub, right, rightColor, onPress, leftColor }: { title: string; sub?: string; right?: string; rightColor?: string; onPress?: () => void; leftColor?: string }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? T.track : T.tile, borderRadius: 2, paddingVertical: 9, paddingHorizontal: 10, borderLeftWidth: leftColor ? 4 : 0, borderLeftColor: leftColor }]}>
      <View style={{ flex: 1 }}>
        <Text style={mono({ fontSize: 13, fontWeight: '700', color: T.text })} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={mono({ fontSize: 11, color: T.textDim })} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ? <Text style={mono({ fontSize: 13, fontWeight: '800', color: rightColor ?? T.text })}>{right}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={14} color={T.textMute} /> : null}
    </Pressable>
  );
}

export function Sub({ children, color }: { children: React.ReactNode; color?: string }) {
  const { T } = useTheme();
  return <Text style={mono({ fontSize: 11, color: color ?? T.textDim })}>{children}</Text>;
}

/** Chip strip for period selection etc. */
export function Pills<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { T: P, A } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: P.badgeBg, borderWidth: 1, borderColor: P.badgeBorder, borderRadius: 1, overflow: 'hidden' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: active ? A.accentBg : 'transparent' }}>
            <Text style={mono({ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: active ? A.accentText : P.textMute })}>{o.label.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 60, borderBottomWidth: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderRadius: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 40, borderBottomWidth: 1 },
  footer: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderTopWidth: 1 },
  panel: { borderRadius: 2, borderWidth: 1, padding: 14 },
});
