import { useIsFocused } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOverview, useTrends } from '@/api/hooks';
import { getErrorMessage } from '@/api/client';
import { AgingBar } from '@/charts/AgingBar';
import { TrendChart } from '@/charts/TrendChart';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { KpiTile } from '@/ui/KpiTile';
import { SectionHeader } from '@/ui/Section';
import { SkeletonKpiGrid, Skeleton } from '@/ui/Skeleton';
import { spacing, usePalette } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { formatMoneyCompact, formatRelativeTime } from '@/utils/format';

const RANGE_OPTIONS = [7, 30, 90] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewScreen() {
  const palette = usePalette();
  const { user } = useAuth();
  const focused = useIsFocused();
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(30);

  const overview = useOverview(focused);
  const trends = useTrends(range, focused);

  const isRefreshing = overview.isRefetching || trends.isRefetching;
  const onRefresh = () => {
    overview.refetch();
    trends.refetch();
  };

  const data = overview.data;
  const topDebtors = data?.receivables?.topDebtors ?? [];
  const production = data?.production ?? {};
  const productionEntries = useMemo(
    () => Object.entries(production).filter(([, v]) => v !== null && v !== undefined),
    [production]
  );

  const firstError = overview.error ?? trends.error;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
        <View>
          <Text style={[styles.greeting, { color: palette.textMuted }]}>
            {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </Text>
          <Text style={[styles.headline, { color: palette.text }]}>Business overview</Text>
          {data?.generatedAt ? (
            <Text style={[styles.generatedAt, { color: palette.textFaint }]}>
              Updated {formatRelativeTime(data.generatedAt)}
            </Text>
          ) : null}
        </View>

        {firstError ? (
          <ErrorBanner message={getErrorMessage(firstError, 'Could not load insights.')} onRetry={onRefresh} />
        ) : null}

        {overview.isPending ? (
          <SkeletonKpiGrid />
        ) : (
          <View style={styles.kpiGrid}>
            <KpiTile
              label="Sales today"
              value={formatMoneyCompact(data?.sales?.today)}
              deltaPct={pctDelta(data?.sales?.today, data?.sales?.yesterday)}
              deltaLabel="vs yesterday"
            />
            <KpiTile
              label="Sales MTD"
              value={formatMoneyCompact(data?.sales?.mtd)}
              deltaPct={data?.sales?.pctChange ?? pctDelta(data?.sales?.mtd, data?.sales?.lastMtd)}
              deltaLabel="vs last MTD"
            />
            <KpiTile label="Collections today" value={formatMoneyCompact(data?.collections?.today)} />
            <KpiTile label="Collections MTD" value={formatMoneyCompact(data?.collections?.mtd)} />
            <KpiTile
              label="Total outstanding"
              value={formatMoneyCompact(data?.receivables?.totalOutstanding)}
            />
            <KpiTile
              label="Overdue"
              value={formatMoneyCompact(data?.receivables?.overdue)}
              invertColor
            />
            <KpiTile
              label="Cash in hand"
              value={formatMoneyCompact(data?.collections?.cashInHand)}
              caption={`${data?.agents?.active ?? 0} agents active`}
            />
            <KpiTile
              label="Pending verification"
              value={formatMoneyCompact(data?.collections?.pendingVerification)}
            />
          </View>
        )}

        <SectionHeader
          title="Sales vs collections"
          right={
            <View style={styles.rangeToggle}>
              {RANGE_OPTIONS.map((opt) => {
                const isActive = opt === range;
                return (
                  <Text
                    key={opt}
                    onPress={() => setRange(opt)}
                    style={[
                      styles.rangeOption,
                      {
                        color: isActive ? '#fff' : palette.textMuted,
                        backgroundColor: isActive ? palette.accent : 'transparent',
                      },
                    ]}
                  >
                    {opt}d
                  </Text>
                );
              })}
            </View>
          }
        />
        <Card>
          {trends.isPending ? (
            <Skeleton height={200} />
          ) : trends.data && trends.data.length > 0 ? (
            <TrendChart data={trends.data} />
          ) : (
            <EmptyState title="No trend data yet" message="Sales and collection history will appear here." />
          )}
        </Card>

        <SectionHeader title="Receivables aging" />
        <Card>
          <AgingBar aging={data?.receivables?.aging} />
        </Card>

        <SectionHeader title="Top debtors" subtitle="Highest outstanding balances" />
        <Card style={{ padding: 0 }}>
          {topDebtors.length === 0 ? (
            <EmptyState title="No outstanding debtors" icon="✓" />
          ) : (
            topDebtors.map((debtor, i) => (
              <View
                key={debtor.customerId ?? i}
                style={[
                  styles.debtorRow,
                  { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.debtorName, { color: palette.text }]} numberOfLines={1}>
                    {debtor.name ?? 'Unknown customer'}
                  </Text>
                  {debtor.dueDays !== undefined ? (
                    <Text style={[styles.debtorMeta, { color: palette.textFaint }]}>
                      {debtor.dueDays}d overdue
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.debtorAmount, { color: palette.text }]}>
                  {formatMoneyCompact(debtor.outstanding)}
                </Text>
              </View>
            ))
          )}
        </Card>

        <SectionHeader title="Promise to pay" />
        <View style={styles.ptpRow}>
          <KpiTile label="Due today" value={formatMoneyCompact(data?.ptp?.dueToday)} />
          <KpiTile label="Overdue" value={formatMoneyCompact(data?.ptp?.overdue)} invertColor />
        </View>

        <SectionHeader title="Production pulse" subtitle="Live factory snapshot" />
        <Card>
          {productionEntries.length === 0 ? (
            <EmptyState title="No production data" message="Factory metrics will show up here once available." />
          ) : (
            <View style={styles.productionGrid}>
              {productionEntries.map(([key, value]) => (
                <View key={key} style={styles.productionItem}>
                  <Text style={[styles.productionLabel, { color: palette.textMuted }]}>
                    {humanizeKey(key)}
                  </Text>
                  <Text style={[styles.productionValue, { color: palette.text }]}>
                    {typeof value === 'number' ? value.toLocaleString('en-IN') : String(value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <View style={{ height: spacing.xxl }} />
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
  scroll: { padding: spacing.lg },
  greeting: { fontSize: 14, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  generatedAt: { fontSize: 12, marginTop: 4 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  rangeToggle: { flexDirection: 'row', gap: 4 },
  rangeOption: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  debtorName: { fontSize: 14.5, fontWeight: '700' },
  debtorMeta: { fontSize: 12, marginTop: 2 },
  debtorAmount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ptpRow: { flexDirection: 'row', gap: spacing.md },
  productionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  productionItem: { minWidth: '40%' },
  productionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  productionValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
});
