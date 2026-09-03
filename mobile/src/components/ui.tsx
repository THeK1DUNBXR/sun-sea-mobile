import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme';
import { money } from '../utils/format';

export type IconName = keyof typeof Ionicons.glyphMap;

// ─── Buttons ─────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'success' ? colors.success : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' || variant === 'success' ? '#fff' : colors.primary;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.rowCenter}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.rowBetween, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function KeyValue({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[styles.rowBetween, { paddingVertical: 6 }]}>
      <Text style={type.small}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? <Text style={[type.h3, valueStyle]}>{value}</Text> : value}
    </View>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <Card style={{ flex: 1, minHeight: 78 }}>
      <Text style={type.small}>{label}</Text>
      <Text style={[type.money, { marginTop: 4, fontSize: 20 }, tone === 'success' && { color: colors.success }, tone === 'warning' && { color: colors.warning }]}>
        {value}
      </Text>
    </Card>
  );
}

export function Money({ value, style, sign }: { value: number; style?: StyleProp<TextStyle>; sign?: boolean }) {
  const negative = value < 0;
  return (
    <Text style={[type.h3, negative && { color: colors.success }, style]}>
      {sign && value > 0 ? '+' : ''}
      {money(Math.abs(value))}
      {negative ? ' Cr' : ''}
    </Text>
  );
}

export function Badge({ text, tone = 'info' }: { text: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const map = {
    info: [colors.infoSoft, colors.info],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    muted: [colors.line, colors.muted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl }}>
      <Ionicons name={icon} size={40} color={colors.faint} />
      <Text style={[type.h3, { marginTop: spacing.md, textAlign: 'center' }]}>{title}</Text>
      {hint ? <Text style={[type.small, { marginTop: 4, textAlign: 'center' }]}>{hint}</Text> : null}
    </View>
  );
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  style,
  ...input
}: TextInputProps & { label?: string; hint?: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        {...input}
        style={[styles.input, error && { borderColor: colors.danger }, input.multiline && { minHeight: 72, textAlignVertical: 'top' }]}
      />
      {error ? <Text style={[type.tiny, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : hint ? <Text style={[type.tiny, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!checked)} hitSlop={8} style={[styles.checkbox, checked && { backgroundColor: colors.primary, borderColor: colors.primary }, disabled && { opacity: 0.4 }]}>
      {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn} hitSlop={6}>
        <Ionicons name="remove" size={16} color={colors.primary} />
      </Pressable>
      <TextInput
        keyboardType="numeric"
        value={String(value)}
        onChangeText={(t) => {
          const n = Number(t.replace(/[^\d.]/g, ''));
          onChange(Number.isFinite(n) ? n : 0);
        }}
        style={styles.stepInput}
      />
      <Pressable onPress={() => onChange(value + step)} style={styles.stepBtn} hitSlop={6}>
        <Ionicons name="add" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
  leading,
}: {
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  onPress?: () => void;
  leading?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: colors.primarySoft }]}>
      {leading}
      <View style={{ flex: 1, marginLeft: leading ? spacing.md : 0 }}>
        <Text style={type.h3} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { marginTop: 2 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </Pressable>
  );
}

export function Notice({ tone = 'info', text }: { tone?: 'info' | 'warning' | 'danger' | 'success'; text: string }) {
  const bg = { info: colors.infoSoft, warning: colors.warningSoft, danger: colors.dangerSoft, success: colors.successSoft }[tone];
  const fg = { info: colors.info, warning: colors.warning, danger: colors.danger, success: colors.success }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
      <Text style={{ color: fg, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 9, paddingHorizontal: spacing.md },
  btnText: { fontSize: 15, fontWeight: '600' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { ...type.h3, color: colors.muted, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.6 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  label: { ...type.small, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.card },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.primarySoft },
  stepInput: { width: 52, textAlign: 'center', paddingVertical: 6, fontSize: 15, color: colors.text },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
});
