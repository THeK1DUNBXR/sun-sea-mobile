import { useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useOverview, useTrends } from '@/api/hooks';
import { getErrorMessage } from '@/api/client';
import { AgingBar } from '@/charts/AgingBar';
import { TrendChart } from '@/charts/TrendChart';
import { overview as copy } from '@/copy';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { KpiTile } from '@/ui/KpiTile';
import { PressableScale } from '@/ui/PressableScale';
import { Reveal } from '@/ui/Reveal';
import { SectionHeader } from '@/ui/Section';
import { SkeletonKpiGrid, SkeletonChart } from '@/ui/Skeleton';
import { MIN_TOUCH, layout, radius, sizes, spacing, tabularNums, typography, useReducedMotion, usePalette } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { formatMoneyCompact, formatMoneyCompactSpoken, formatPromiseCount, formatRelativeTime } from '@/utils/format';

const RANGE_OPTIONS = [7, 30, 90] as const;
// Below this *content* width (the column width after gutters and the tablet
// content cap, not the raw device width) the 6-tile KPI grid moves from 2
// columns to 3 — at 2 columns a wide screen would just stretch each tile
// instead of using the extra width. 6 divides evenly by both 2 and 3, so
// neither breakpoint ever leaves an orphan tile. Set above 3 * (KpiTile's own
// 150dp minWidth) plus 2 gaps so 3-up never violates that minimum.
const KPI_GRID_WIDE_BREAKPOINT = 480;

type TopDebtor = NonNullable<ReturnType<typeof useOverview>['data']>['receivables']['topDebtors'][number];

/** One top-debtor row, memoized so a 60s overview refetch doesn't re-render
 * every row — react-query's structural sharing keeps an unchanged debtor's
 * object reference stable across refetches, so unaffected rows skip re-render. */
const DebtorRow = React.memo(function DebtorRow({
  debtor,
  index,
  palette,
}: {
  debtor: TopDebtor;
  index: number;
  palette: ReturnType<typeof usePalette>;
}) {
  // The single largest balance gets a deliberate warning-toned badge — a
  // liability, so it borrows the aging/warn vocabulary rather than the
  // leaderboard's gold (an achievement color would send the wrong signal for
  // "owes us the most"). Every other rank stays neutral.
  const isTopDebtor = index === 0;
  return (
    <View
      style={[
        styles.debtorRow,
        { borderTopColor: palette.border, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth },
      ]}
      accessibilityLabel={`${copy.debtorRow.rankA11y(index + 1)}${isTopDebtor ? copy.debtorRow.largestBalanceA11y : ''}, ${debtor.firmName || copy.debtorRow.unknownCustomer}, ${formatMoneyCompactSpoken(debtor.netBalance)} outstanding${
        debtor.dueDays > 0 ? copy.debtorRow.overdueDaysA11y(debtor.dueDays) : ''
      }`}
    >
      <View
        style={[
          styles.debtorRank,
          isTopDebtor
            ? { backgroundColor: palette.warnSoft, borderColor: palette.warn, borderWidth: 1.5 }
            : { backgroundColor: palette.overlay },
        ]}
      >
        <Text
          style={[typography.label, { color: isTopDebtor ? palette.warn : palette.textMuted }]}
          maxFontSizeMultiplier={1.3}
        >
          {index + 1}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.titleSm, { color: palette.text }]} numberOfLines={1}>
          {debtor.firmName?.trim() || copy.debtorRow.unknownCustomer}
        </Text>
        {debtor.dueDays > 0 ? (
          <Text style={[typography.bodySm, { color: palette.warn, marginTop: 2 }]}>
            {copy.debtorRow.overdueDaysVisible(debtor.dueDays)}
          </Text>
        ) : null}
      </View>
      <Text style={[typography.mono, { color: palette.text }]} maxFontSizeMultiplier={1.5}>
        {formatMoneyCompact(debtor.netBalance)}
      </Text>
    </View>
  );
});

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return copy.greetingMorning;
  if (hour < 17) return copy.greetingAfternoon;
  return copy.greetingEvening;
}

export default function OverviewScreen() {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const focused = useIsFocused();
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const { width: windowWidth } = useWindowDimensions();
  // The KPI grid's actual column width is the content column, not the raw
  // device width: on a tablet or wide landscape phone the content caps at
  // `layout.contentMaxWidth` and centers, so the column-count decision has to
  // key off that same capped width or a large device would flip to 3 columns
  // it doesn't actually have room for once the cap kicks in.
  const contentWidth = Math.min(windowWidth - layout.screenGutter * 2, layout.contentMaxWidth);
  const kpiColumns = contentWidth >= KPI_GRID_WIDE_BREAKPOINT ? 3 : 2;
  const kpiItemStyle = useMemo(
    () => [styles.kpiGridItem, { flexBasis: `${100 / kpiColumns}%` as const }],
    [kpiColumns]
  );

  const overview = useOverview(focused);
  const trends = useTrends(range, focused);

  const isRefreshing = overview.isRefetching || trends.isRefetching;
  // Stable identity so RefreshControl doesn't get a new function prop every render.
  const onRefresh = useCallback(() => {
    overview.refetch();
    trends.refetch();
  }, [overview, trends]);

  // A one-shot pulse on the "updated x ago" chip whenever a refresh actually lands
  // a new snapshot — skipped on first load, and skipped entirely under reduced motion.
  const chipScale = useSharedValue(1);
  const chipOpacity = useSharedValue(1);
  const lastGeneratedAt = useRef<string | null>(null);
  useEffect(() => {
    const generatedAt = overview.data?.generatedAt ?? null;
    if (!generatedAt) return;
    if (lastGeneratedAt.current !== null && lastGeneratedAt.current !== generatedAt) {
      if (reducedMotion) {
        chipOpacity.value = withSequence(
          withTiming(0.4, { duration: 120 }),
          withTiming(1, { duration: 180 })
        );
      } else {
        chipScale.value = withSequence(
          withTiming(1.08, { duration: 140, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
        );
      }
    }
    lastGeneratedAt.current = generatedAt;
  }, [overview.data?.generatedAt, reducedMotion, chipScale, chipOpacity]);
  const chipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
    opacity: chipOpacity.value,
  }));

  const data = overview.data;
  const topDebtors = data?.receivables?.topDebtors ?? [];
  const production = data?.production ?? {};
  const productionEntries = useMemo(
    () => Object.entries(production).filter(([, v]) => v !== null && v !== undefined),
    [production]
  );

  const firstError = overview.error ?? trends.error;
  // react-query keeps the last good `data` around through a failed refetch, so a
  // real error alongside data we can still show is a "stale" situation, not a
  // hard failure — tell the founder the numbers may be behind rather than
  // hiding a working dashboard behind a full-screen error.
  const isShowingStaleData = Boolean(firstError && data);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodySm, { color: palette.textMuted }]} maxFontSizeMultiplier={1.6}>
              {greeting()}{user?.fullName ? `, ${user.fullName.trim().split(/\s+/)[0]}` : ''}
            </Text>
            <Text style={[typography.headline, { color: palette.text, marginTop: 2 }]}>{copy.headline}</Text>
          </View>
          {data?.generatedAt ? (
            <Reanimated.View
              style={[styles.updatedChip, { backgroundColor: palette.overlay }, chipAnimatedStyle]}
              accessibilityLabel={copy.updatedA11y(formatRelativeTime(data.generatedAt), isShowingStaleData)}
            >
              {/* Info (not "good") — this dot reports live/fresh connectivity, not a
                  financial result, so it stays out of the green/red delta vocabulary.
                  It turns to the warning tone (paired with the banner above and the
                  "showing last known data" copy) when the snapshot may be stale. */}
              <View style={[styles.liveDot, { backgroundColor: isShowingStaleData ? palette.warn : palette.info }]} />
              <Text style={[typography.caption, { color: palette.textMuted }]}>
                {formatRelativeTime(data.generatedAt)}
              </Text>
            </Reanimated.View>
          ) : null}
        </View>

        {firstError ? (
          <ErrorBanner
            message={
              isShowingStaleData
                ? `${copy.stalePrefix(formatRelativeTime(data?.generatedAt))}${getErrorMessage(firstError, copy.refreshFailedFallback)}`
                : getErrorMessage(firstError, copy.loadFailedFallback)
            }
            onRetry={onRefresh}
            tone={isShowingStaleData ? 'stale' : 'error'}
          />
        ) : null}

        {overview.isPending ? (
          // Matches kpiWrap's own marginTop below so the loading state sits at
          // the same offset as the loaded KPI grid — no vertical jump on load.
          <View style={styles.kpiWrap}>
            <SkeletonKpiGrid />
          </View>
        ) : (
          <View style={styles.kpiWrap}>
            <Reveal index={0} staggerMs={40}>
              <KpiTile
                variant="hero"
                label={copy.kpi.salesMtdLabel}
                value={formatMoneyCompact(data?.sales?.mtd)}
                numericValue={data?.sales?.mtd}
                deltaPct={data?.sales?.pctChange ?? pctDelta(data?.sales?.mtd, data?.sales?.lastMtd)}
                deltaLabel={copy.kpi.salesMtdDelta}
              />
            </Reveal>
            <View style={styles.kpiGrid}>
              <Reveal index={1} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.salesTodayLabel}
                  value={formatMoneyCompact(data?.sales?.today)}
                  numericValue={data?.sales?.today}
                  deltaPct={pctDelta(data?.sales?.today, data?.sales?.yesterday)}
                  deltaLabel={copy.kpi.salesTodayDelta}
                />
              </Reveal>
              <Reveal index={2} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.agentCollectionsTodayLabel}
                  value={formatMoneyCompact(data?.collections?.today)}
                  numericValue={data?.collections?.today}
                />
              </Reveal>
              <Reveal index={3} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.agentCollectionsMtdLabel}
                  value={formatMoneyCompact(data?.collections?.mtd)}
                  numericValue={data?.collections?.mtd}
                />
              </Reveal>
              <Reveal index={4} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.totalOutstandingLabel}
                  value={formatMoneyCompact(data?.receivables?.totalOutstanding)}
                  numericValue={data?.receivables?.totalOutstanding}
                />
              </Reveal>
              <Reveal index={5} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.overdueReceivablesLabel}
                  value={formatMoneyCompact(data?.receivables?.overdue)}
                  numericValue={data?.receivables?.overdue}
                  invertColor
                />
              </Reveal>
              <Reveal index={6} staggerMs={40} style={kpiItemStyle}>
                <KpiTile
                  label={copy.kpi.cashInHandLabel}
                  value={formatMoneyCompact(data?.collections?.cashInHand)}
                  numericValue={data?.collections?.cashInHand}
                  caption={copy.kpi.agentsOnlineCaption(data?.agents?.active ?? 0)}
                />
              </Reveal>
            </View>
            {/* A standalone wide tile, not a 7th grid cell — it needs founder
                attention distinctly from the routine period metrics above, and
                a lone leftover tile in a 2/3-column grid would otherwise read
                as an accident rather than a deliberate callout. */}
            <Reveal index={7} staggerMs={40}>
              <KpiTile
                variant="wide"
                label={copy.kpi.pendingVerificationLabel}
                value={formatMoneyCompact(data?.collections?.pendingVerification?.amount)}
                numericValue={data?.collections?.pendingVerification?.amount}
                caption={
                  data?.collections?.pendingVerification?.count
                    ? copy.kpi.pendingVerificationCaption(data.collections.pendingVerification.count)
                    : undefined
                }
                captionColor={palette.neutral}
              />
            </Reveal>
          </View>
        )}

        <SectionHeader
          title={copy.sections.trend}
          right={
            <View
              style={[styles.rangeToggle, { backgroundColor: palette.overlay }]}
              accessibilityRole="tablist"
            >
              {RANGE_OPTIONS.map((opt) => {
                const isActive = opt === range;
                return (
                  <PressableScale
                    key={opt}
                    onPress={() => setRange(opt)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={copy.rangeA11y(opt)}
                    hitSlop={4}
                    haptic={!isActive}
                    rippleColor={isActive ? palette.accentSoft : palette.overlay}
                    style={[
                      styles.rangeOption,
                      {
                        backgroundColor: isActive ? palette.accent : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[typography.caption, { color: isActive ? palette.accentInk : palette.textMuted }]}>
                      {opt}d
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          }
        />
        <Reveal index={8} staggerMs={40}>
          <Card elevation="raised">
            {trends.isPending ? (
              <SkeletonChart height={216} />
            ) : trends.data && trends.data.length > 0 ? (
              <TrendChart data={trends.data} />
            ) : (
              <EmptyState title={copy.empty.noTrendTitle} message={copy.empty.noTrendMessage} />
            )}
          </Card>
        </Reveal>

        <SectionHeader title={copy.sections.aging} />
        <Reveal index={9} staggerMs={40}>
          <Card>
            <AgingBar aging={data?.receivables?.aging} />
          </Card>
        </Reveal>

        <SectionHeader title={copy.sections.topDebtors} subtitle={copy.sections.topDebtorsSubtitle} />
        <Reveal index={10} staggerMs={40}>
          <Card style={{ padding: 0 }}>
            {topDebtors.length === 0 ? (
              <EmptyState title={copy.empty.noDebtorsTitle} icon="check" />
            ) : (
              topDebtors.map((debtor, i) => (
                <DebtorRow key={debtor.customerId ?? i} debtor={debtor} index={i} palette={palette} />
              ))
            )}
          </Card>
        </Reveal>

        <SectionHeader title={copy.sections.promiseToPay} />
        <View style={styles.ptpRow}>
          <Reveal index={11} staggerMs={40} style={{ flex: 1 }}>
            <KpiTile
              label={copy.kpi.ptpDueTodayLabel}
              value={formatPromiseCount(data?.ptp?.dueToday)}
              numericValue={data?.ptp?.dueToday}
              format={formatPromiseCount}
              formatSpoken={formatPromiseCount}
            />
          </Reveal>
          <Reveal index={12} staggerMs={40} style={{ flex: 1 }}>
            <KpiTile
              label={copy.kpi.ptpOverdueLabel}
              value={formatPromiseCount(data?.ptp?.overdue)}
              numericValue={data?.ptp?.overdue}
              format={formatPromiseCount}
              formatSpoken={formatPromiseCount}
              invertColor
            />
          </Reveal>
        </View>

        <SectionHeader title={copy.sections.production} subtitle={copy.sections.productionSubtitle} />
        <Reveal index={13} staggerMs={40}>
          <Card>
            {productionEntries.length === 0 ? (
              <EmptyState title={copy.empty.noProductionTitle} message={copy.empty.noProductionMessage} />
            ) : (
              <View style={styles.productionGrid}>
                {productionEntries.map(([key, value]) => (
                  <View key={key} style={styles.productionItem}>
                    <Text style={[typography.label, { color: palette.textMuted }]}>
                      {humanizeKey(key)}
                    </Text>
                    <Text
                      style={[typography.statCompact, tabularNums, { color: palette.text, marginTop: 2 }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      maxFontSizeMultiplier={1.6}
                    >
                      {typeof value === 'number' ? value.toLocaleString('en-IN') : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Reveal>

        <View style={{ height: layout.scrollEndSpacer }} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function pctDelta(current?: number, previous?: number): number | null {
  if (current === undefined || previous === undefined || !previous) return null;
  return ((current - previous) / previous) * 100;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  // Caps and centers the whole screen's content on a tablet or wide landscape
  // phone instead of stretching every row edge-to-edge.
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  updatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: sizes.chipPaddingH,
    paddingVertical: sizes.chipPaddingV,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  kpiWrap: { marginTop: spacing.lg, gap: spacing.md },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.gridGap,
  },
  kpiGridItem: {
    flexGrow: 1,
    minWidth: 150,
  },
  rangeToggle: { flexDirection: 'row', gap: 2, borderRadius: radius.pill, padding: 2 },
  rangeOption: {
    paddingHorizontal: 12,
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.rowPaddingH,
    paddingVertical: layout.rowPaddingV,
    gap: layout.rowGap,
  },
  debtorRank: {
    width: sizes.rankBadge,
    height: sizes.rankBadge,
    borderRadius: sizes.rankBadge / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptpRow: { flexDirection: 'row', gap: spacing.md },
  productionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  productionItem: { minWidth: '40%' },
});
