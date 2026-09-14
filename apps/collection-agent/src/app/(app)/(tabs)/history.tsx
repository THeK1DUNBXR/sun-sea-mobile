import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { fetchHistory } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { SkeletonRow } from '@/ui/Skeleton';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDateTime, formatMoney } from '@/ui/format';
import type { HistoryEntry } from '@/types/models';

const STAGGER_CAP = 8;

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
      {query.isLoading ? (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState icon="time-outline" title="No activity yet" subtitle="Collections, visits and deposits will show up here." />
          }
          renderItem={({ item, index }) => <HistoryRow entry={item} index={index} onPress={() => router.push(`/(app)/receipt/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}

function HistoryRow({ entry, index, onPress }: { entry: HistoryEntry; index: number; onPress: () => void }) {
  const meta = KIND_META[entry.kind];
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(Math.min(index, STAGGER_CAP) * 40).duration(280)}>
      <Pressable
        disabled={entry.kind !== 'collection'}
        onPress={() => entry.kind === 'collection' && onPress()}
        accessibilityRole={entry.kind === 'collection' ? 'button' : undefined}
      >
        <Card style={styles.row}>
          <View style={styles.rowTop}>
            <View style={styles.kindGroup}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={[styles.kindLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={styles.time}>{formatDateTime(entry.occurredAt)}</Text>
          </View>
          <Text style={styles.title}>{entry.title}</Text>
          {entry.subtitle ? <Text style={styles.subtitle}>{entry.subtitle}</Text> : null}
          <View style={styles.rowBottom}>
            {entry.amount != null && <Text style={styles.amount}>{formatMoney(entry.amount)}</Text>}
            {entry.status ? <Badge label={entry.status} /> : null}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
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
