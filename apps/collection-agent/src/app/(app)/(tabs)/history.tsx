import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { fetchHistory } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDateTime, formatMoney } from '@/ui/format';
import type { HistoryEntry } from '@/types/models';

const KIND_META: Record<HistoryEntry['kind'], { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  collection: { label: 'Collection', icon: 'cash-outline', color: colors.success },
  visit: { label: 'Visit', icon: 'walk-outline', color: colors.info },
  deposit: { label: 'Deposit', icon: 'wallet-outline', color: colors.textMuted },
};

export default function HistoryScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['history'], queryFn: () => fetchHistory() });

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState icon="time-outline" title="No activity yet" subtitle="Collections, visits and deposits will show up here." />
          ) : null
        }
        renderItem={({ item }) => {
          const meta = KIND_META[item.kind];
          return (
            <Pressable
              disabled={item.kind !== 'collection'}
              onPress={() => item.kind === 'collection' && router.push(`/(app)/receipt/${item.id}`)}
              accessibilityRole={item.kind === 'collection' ? 'button' : undefined}
            >
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <View style={styles.kindGroup}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                    <Text style={[styles.kindLabel, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={styles.time}>{formatDateTime(item.occurredAt)}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
                <View style={styles.rowBottom}>
                  {item.amount != null && <Text style={styles.amount}>{formatMoney(item.amount)}</Text>}
                  {item.status ? <Badge label={item.status} /> : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kindGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindLabel: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  time: { fontSize: fontSize.sm, color: colors.textMuted },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  amount: { fontSize: fontSize.md, fontWeight: '900', color: colors.primaryDark, fontVariant: ['tabular-nums'] },
});
