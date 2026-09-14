import { useIsFocused } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { useRecentActivity } from '@/api/hooks';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Icon, type IconName } from '@/ui/Icon';
import { Skeleton } from '@/ui/Skeleton';
import { spacing, typography, usePalette, type Palette } from '@/ui/theme';
import type { ActivityItem } from '@/types';
import { formatDayLabel, formatMoneyCompact, formatRelativeTime } from '@/utils/format';

function iconFor(activityType: string): IconName {
  if (activityType === 'invoice') return 'invoice';
  if (activityType === 'collection') return 'collection';
  if (activityType === 'deposit') return 'deposit';
  return 'activity';
}

function colorFor(activityType: string, palette: Palette): string {
  if (activityType === 'invoice') return palette.accent;
  if (activityType === 'collection') return palette.good;
  if (activityType === 'deposit') return palette.warn;
  return palette.textFaint;
}

function groupByDay(items: ActivityItem[]): { day: string; items: ActivityItem[] }[] {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const day = formatDayLabel(item.occurredAt);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(item);
  }
  return Array.from(groups.entries()).map(([day, groupItems]) => ({ day, items: groupItems }));
}

export default function ActivityScreen() {
  const palette = usePalette();
  const focused = useIsFocused();
  const activity = useRecentActivity(30, focused);

  const grouped = useMemo(() => groupByDay(activity.data ?? []), [activity.data]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={activity.isRefetching}
            onRefresh={() => activity.refetch()}
            tintColor={palette.accent}
          />
        }
      >
        <Text style={[typography.headline, { color: palette.text, marginBottom: spacing.lg }]}>Activity</Text>

        {activity.error ? (
          <ErrorBanner
            message={getErrorMessage(activity.error, 'Could not load recent activity.')}
            onRetry={() => activity.refetch()}
          />
        ) : null}

        {activity.isPending ? (
          <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Card>
        ) : grouped.length === 0 ? (
          <EmptyState title="No recent activity" message="New invoices, collections and deposits will appear here." />
        ) : (
          grouped.map((group) => (
            <View key={group.day} style={styles.group}>
              <Text style={[styles.groupLabel, { color: palette.text }]}>{group.day}</Text>
              <Card style={{ padding: 0 }}>
                {group.items.map((item, i) => {
                  const tint = colorFor(item.type, palette);
                  return (
                    <View
                      key={item.id ?? i}
                      style={[
                        styles.row,
                        { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                      ]}
                      accessibilityLabel={`${item.title ?? item.type}${item.amount !== undefined ? `, ${formatMoneyCompact(item.amount)}` : ''}, ${formatRelativeTime(item.occurredAt)}`}
                    >
                      <View style={[styles.iconBadge, { backgroundColor: tint + '1F' }]}>
                        <Icon name={iconFor(item.type)} color={tint} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
                          {item.title ?? item.type}
                        </Text>
                        {item.subtitle ? (
                          <Text style={[styles.subtitle, { color: palette.textFaint }]} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {item.amount !== undefined ? (
                          <Text style={[styles.amount, { color: palette.text }]}>
                            {formatMoneyCompact(item.amount)}
                          </Text>
                        ) : null}
                        <Text style={[styles.time, { color: palette.textFaint }]}>
                          {formatRelativeTime(item.occurredAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  group: { marginBottom: spacing.lg },
  groupLabel: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  time: { fontSize: 11, marginTop: 2 },
});
