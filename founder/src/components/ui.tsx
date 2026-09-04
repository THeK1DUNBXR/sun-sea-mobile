import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, type } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ title, subtitle, back, right, children, onRefresh, refreshing }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const nav = useNavigation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {back ? (
          <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.hbtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.hbtn} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.h2, { fontSize: 17 }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={type.tiny}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.hbtn, { alignItems: 'flex-end' }]}>{right}</View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => <View style={[styles.card, shadow.card, style]}>{children}</View>;

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={type.label}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Pill({ text, tone = 'muted', icon }: { text: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'muted' | 'accent'; icon?: IconName }) {
  const map = { info: [colors.infoSoft, colors.info], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger], muted: [colors.line, colors.muted], accent: [colors.accentSoft, colors.accent] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill }}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/** Up/down change indicator. Status colours carry an icon so colour is never the only cue. */
export function Delta({ value, invert = false, suffix = 'vs last period' }: { value: number; invert?: boolean; suffix?: string }) {
  const good = invert ? value <= 0 : value >= 0;
  const color = Math.abs(value) < 0.005 ? colors.muted : good ? colors.success : colors.danger;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={value >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{Math.abs(Math.round(value * 100))}%</Text>
      <Text style={type.tiny}> {suffix}</Text>
    </View>
  );
}

export function StatTile({ label, value, sub, delta, invert, icon, tone = 'primary', style }: { label: string; value: string; sub?: string; delta?: number; invert?: boolean; icon: IconName; tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; style?: ViewStyle }) {
  const map = { primary: [colors.primarySoft, colors.primary], accent: [colors.accentSoft, colors.accent], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger], info: [colors.infoSoft, colors.info] } as const;
  const [bg, fg] = map[tone];
  return (
    <Card style={[{ flex: 1, minWidth: '46%' }, style ?? {}]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={type.small}>{label}</Text>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={16} color={fg} />
        </View>
      </View>
      <Text style={[type.money, { marginTop: 6 }]}>{value}</Text>
      {delta !== undefined ? <Delta value={delta} invert={invert} /> : sub ? <Text style={type.tiny}>{sub}</Text> : null}
    </Card>
  );
}

export function Row({ title, subtitle, right, onPress, leading, last }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; leading?: React.ReactNode; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }, pressed && { backgroundColor: colors.primarySoft }]}>
      {leading}
      <View style={{ flex: 1, marginLeft: leading ? spacing.md : 0 }}>
        <Text style={type.h3} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={type.small} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, o.value === value && styles.segActive]}>
          <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.muted }, o.value === value && { color: colors.primary }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const palette = ['#1F3A5F', '#0F766E', '#B45309', '#7C3AED', '#BE185D', '#0369A1'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: palette[h % palette.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.line, marginVertical: spacing.sm }} />;

export function KV({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' | 'warning' }) {
  const c = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={type.small}>{label}</Text>
      <Text style={[type.h3, { color: c }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: spacing.sm, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  hbtn: { width: 56, height: 48, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 10, paddingHorizontal: spacing.lg },
  seg: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2 },
  segActive: { backgroundColor: colors.card, elevation: 1 },
});
