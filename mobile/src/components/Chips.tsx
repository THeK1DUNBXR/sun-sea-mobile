import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { tap } from '../utils/haptics';
import type { IconName } from './ui';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  count?: number;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}

/** Horizontal, scrollable single-select chips (filters, reasons, categories). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  scroll = true,
  style,
}: {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  scroll?: boolean;
  style?: object;
}) {
  const body = options.map((o) => {
    const active = o.value === value;
    const toneColor = o.tone === 'danger' ? colors.danger : o.tone === 'warning' ? colors.warning : o.tone === 'success' ? colors.success : colors.primary;
    return (
      <Pressable
        key={o.value}
        onPress={() => {
          void tap();
          onChange(o.value);
        }}
        style={[styles.chip, active && { backgroundColor: toneColor, borderColor: toneColor }]}
      >
        {o.icon ? <Ionicons name={o.icon} size={15} color={active ? '#fff' : toneColor} style={{ marginRight: 5 }} /> : null}
        <Text style={[styles.text, active && { color: '#fff' }]}>{o.label}</Text>
        {o.count !== undefined ? (
          <View style={[styles.count, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={[styles.countText, active && { color: '#fff' }]}>{o.count}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });
  if (!scroll) return <View style={[styles.wrap, style]}>{body}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, style]} keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  );
}

/** Two-to-four way segmented control. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              void tap();
              onChange(o.value);
            }}
            style={[styles.segItem, active && styles.segActive]}
          >
            <Text style={[styles.segText, active && { color: colors.primary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  text: { fontSize: 14, fontWeight: '600', color: colors.text },
  count: { marginLeft: 6, paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  countText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  seg: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2 },
  segActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  segText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
