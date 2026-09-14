import { useIsFocused } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { useRecentActivity } from '@/api/hooks';
import { activityScreen as copy } from '@/copy';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Icon, type IconName } from '@/ui/Icon';
import { Reveal } from '@/ui/Reveal';
import { Skeleton } from '@/ui/Skeleton';
import { layout, sizes, spacing, typography, usePalette, type Palette } from '@/ui/theme';

import type { ActivityItem, ActivityType } from '@/types';
import { formatDayLabel, formatMoneyCompact, formatMoneyCompactSpoken, formatRelativeTime } from '@/utils/format';

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

/** The icon badge's tinted background for each activity type — a matching soft
 * fill for the row's own tint color instead of a computed opacity suffix. */
function softFor(activityType: ActivityType, palette: Palette): string {
  if (activityType === 'INVOICE') return palette.accentSoft;
  if (activityType === 'COLLECTION') return palette.goodSoft;
  if (activityType === 'DEPOSIT') return palette.warnSoft;
  return palette.overlay;
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
        <Text style={[typography.headline, { color: palette.text, marginBottom: spacing.lg }]}>{copy.title}</Text>

        {activity.error ? (
          <ErrorBanner
            message={
              activity.data
                ? `${copy.stalePrefix}${getErrorMessage(activity.error, copy.refreshFailedFallback)}`
                : getErrorMessage(activity.error, copy.loadFailedFallback)
            }
            onRetry={() => activity.refetch()}
            tone={activity.data ? 'stale' : 'error'}
          />
        ) : null}

        {activity.isPending ? (
          <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Card>
        ) : grouped.length === 0 ? (
          <EmptyState title={copy.emptyTitle} message={copy.emptyMessage} />
        ) : (
          grouped.map((group, gi) => (
            <View key={group.day} style={styles.group}>
              <Text style={[typography.titleSm, { color: palette.text, marginBottom: spacing.sm }]}>{group.day}</Text>
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
                        accessibilityLabel={`${item.title || item.type}${hasAmount ? `, ${formatMoneyCompactSpoken(item.amount)}` : ''}, ${formatRelativeTime(item.at)}`}
                      >
                        <View style={[styles.iconBadge, { backgroundColor: softFor(item.type, palette) }]}>
                          <Icon name={iconFor(item.type)} color={tint} size={18} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.titleSm, { color: palette.text }]} numberOfLines={1}>
                            {item.title || item.type}
                          </Text>
                          {item.subtitle ? (
                            <Text style={[typography.caption, { color: palette.textFaint, marginTop: 2 }]} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {hasAmount ? (
                            <Text style={[typography.mono, { color: palette.text }]} maxFontSizeMultiplier={1.6}>
                              {formatMoneyCompact(item.amount)}
                            </Text>
                          ) : null}
                          <Text style={[typography.caption, { color: palette.textFaint, marginTop: 2 }]}>
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
});
