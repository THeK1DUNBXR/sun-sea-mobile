import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { fetchHistory } from '@/api/agentApi';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { SkeletonRow } from '@/ui/Skeleton';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, type, layout } from '@/ui/theme';
import { formatDateTime, formatMoney, historyStatusLabel } from '@/ui/format';
import { copy } from '@/copy';
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
      ) : query.isError ? (
        <View style={styles.stateArea}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="offline"
            title="Couldn't load history"
            subtitle={copy.assignments.checkConnection}
          />
          <Button title={copy.profile.retry} onPress={() => query.refetch()} variant="secondary" style={styles.stateButton} />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={query.data ?? []}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={[styles.listContent, (query.data ?? []).length === 0 && styles.listContentEmpty]}
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
            {entry.status ? <Badge label={historyStatusLabel(entry.status)} /> : null}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: layout.screenGutter, paddingBottom: layout.scrollEndPad, gap: layout.sectionGap },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  stateArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: layout.screenGutter },
  stateButton: { alignSelf: 'stretch' },
  row: { gap: spacing.xs },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kindGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kindLabel: { ...type.label, textTransform: 'uppercase' },
  time: { ...type.caption, color: colors.textMuted },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.body, color: colors.textMuted },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  amount: { ...type.stat, fontSize: 17, lineHeight: 21, color: colors.primaryDark, fontVariant: ['tabular-nums'] },
});
