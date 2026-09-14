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
import { Reveal } from '@/ui/Reveal';
import { Skeleton } from '@/ui/Skeleton';
import { layout, sizes, spacing, typography, usePalette, type Palette } from '@/ui/theme';
import type { ActivityItem, ActivityType } from '@/types';
import { formatDayLabel, formatMoneyCompact, formatRelativeTime } from '@/utils/format';

function iconFor(activityType: ActivityType): IconName {
  if (activityType === 'INVOICE') return 'invoice';
  if (activityType === 'COLLECTION') return 'collection';
  if (activityType === 'DEPOSIT') return 'deposit';
  return 'activity';
}

function colorFor(activityType: ActivityType, palette: Palette): string {
  if (activityType === 'INVOICE') return palette.accent;
  if (activityType === 'COLLECTION') return palette.good;
  if (activityType === 'DEPOSIT') return palette.warn;
  return palette.textFaint;
}

/** The backend feed (insightsService.getRecentActivity) has no stable id — it's
 * a merge-and-sort of four different tables. Derive a key from the fields that
 * actually distinguish a row so React doesn't misidentify rows across a
 * refetch (which would replay entrance animations and confuse a11y focus). */
function keyFor(item: ActivityItem, index: number): string {
  return `${item.type}:${item.at}:${item.title}:${index}`;
}

function groupByDay(items: ActivityItem[]): { day: string; items: ActivityItem[] }[] {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const day = formatDayLabel(item.at);
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
            message={
              activity.data
                ? `Showing last known activity. ${getErrorMessage(activity.error, 'Could not refresh.')}`
                : getErrorMessage(activity.error, 'Could not load recent activity.')
            }
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
          grouped.map((group, gi) => (
            <View key={group.day} style={styles.group}>
              <Text style={[styles.groupLabel, { color: palette.text }]}>{group.day}</Text>
              <Card style={{ padding: 0 }}>
                {group.items.map((item, i) => {
                  const tint = colorFor(item.type, palette);
                  // Groups queue in first, then rows within a group cascade quickly —
                  // capped so a long feed doesn't keep the last rows waiting.
                  const delay = Math.min(gi, 3) * 70 + Math.min(i, 6) * 35;
                  const hasAmount = typeof item.amount === 'number' && !Number.isNaN(item.amount);
                  return (
                    <Reveal key={keyFor(item, i)} delay={delay} axis="x" distance={12}>
                      <View
                        style={[
                          styles.row,
                          { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                        ]}
                        accessibilityLabel={`${item.title || item.type}${hasAmount ? `, ${formatMoneyCompact(item.amount)}` : ''}, ${formatRelativeTime(item.at)}`}
                      >
                        <View style={[styles.iconBadge, { backgroundColor: tint + '1F' }]}>
                          <Icon name={iconFor(item.type)} color={tint} size={18} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
                            {item.title || item.type}
                          </Text>
                          {item.subtitle ? (
                            <Text style={[styles.subtitle, { color: palette.textFaint }]} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {hasAmount ? (
                            <Text style={[styles.amount, { color: palette.text }]} maxFontSizeMultiplier={1.6}>
                              {formatMoneyCompact(item.amount)}
                            </Text>
                          ) : null}
                          <Text style={[styles.time, { color: palette.textFaint }]}>
                            {formatRelativeTime(item.at)}
                          </Text>
                        </View>
                      </View>
                    </Reveal>
                  );
                })}
              </Card>
            </View>
          ))
        )}

        <View style={{ height: layout.scrollEndSpacer }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  group: { marginBottom: spacing.lg },
  groupLabel: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, marginBottom: spacing.sm },
  // Same row padding and column gap as the overview/agents list rows, so the
  // icon / text / number columns land on the same grid across every screen
  // that renders a row-style list.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.rowPaddingH,
    paddingVertical: layout.rowPaddingV,
    gap: layout.rowGap,
  },
  iconBadge: {
    width: sizes.iconBadgeSm,
    height: sizes.iconBadgeSm,
    borderRadius: sizes.iconBadgeSm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  time: { fontSize: 11, marginTop: 2 },
});
