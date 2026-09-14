import React, { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';

import { fetchMySummary } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { colors, spacing, fontSize, radius, letterSpacing } from '@/ui/theme';
import { formatMoney } from '@/ui/format';
import { useAuth } from '@/store/auth';
import { useSyncStatus } from '@/offline/useSyncStatus';
import { startTracking, stopTracking, getTrackingPreference } from '@/location/tracking';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tracking, setTracking] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const sync = useSyncStatus();

  const summary = useQuery({
    queryKey: ['agent-summary'],
    queryFn: fetchMySummary,
    staleTime: 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      getTrackingPreference().then(setTracking);
    }, []),
  );

  const onToggleTracking = async (value: boolean) => {
    setTrackingBusy(true);
    try {
      if (value) {
        const result = await startTracking();
        setTracking(result.started);
      } else {
        await stopTracking();
        setTracking(false);
      }
    } finally {
      setTrackingBusy(false);
    }
  };

  const s = summary.data;
  const ptpDue = s?.ptpDueToday ?? 0;
  const assigned = s?.assignedCount ?? 0;

  const nextUpCopy =
    ptpDue > 0
      ? `${ptpDue} promise${ptpDue === 1 ? '' : 's'} to follow up today`
      : assigned > 0
        ? `${assigned} assignment${assigned === 1 ? '' : 's'} open right now`
        : 'Nothing assigned right now';

  return (
    <Screen refreshing={summary.isFetching} onRefresh={() => summary.refetch()}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.nextUp}>{nextUpCopy}</Text>
        </View>
        <TrackingPill on={tracking} />
      </View>

      <View style={styles.heroRow}>
        <Card style={styles.heroCard} elevation="raised">
          <Text style={styles.heroLabel}>Outstanding</Text>
          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(s?.outstanding)}
          </Text>
        </Card>
        <Card style={[styles.heroCard, styles.heroCardAccent]} elevation="raised">
          <Text style={[styles.heroLabel, styles.heroLabelAccent]}>Collected today</Text>
          <Text style={[styles.heroValue, styles.heroValueAccent]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(s?.collectedToday)}
          </Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Kpi label="Assigned" value={String(assigned)} icon="briefcase-outline" />
        <Kpi label="Visits today" value={String(s?.visitsToday ?? 0)} icon="walk-outline" />
        <Kpi label="Cash in hand" value={formatMoney(s?.cashInHand)} icon="wallet-outline" />
        <Kpi label="PTP due today" value={String(ptpDue)} icon="calendar-outline" warn={ptpDue > 0} />
      </View>

      <SyncCard pendingCount={sync.pendingCount} syncing={sync.syncing} lastError={sync.lastError} />

      <Card>
        <View style={styles.trackingRow}>
          <View style={styles.trackingIconWrap}>
            <Ionicons name="navigate" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Location tracking</Text>
            <Text style={styles.cardSubtitle}>{tracking ? 'Sharing your route with the office' : 'Off — turn on before you head out'}</Text>
          </View>
          <Switch
            value={tracking}
            onValueChange={onToggleTracking}
            disabled={trackingBusy}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Location tracking"
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title="View assignments" onPress={() => router.push('/(app)/(tabs)/assignments')} variant="secondary" />
          <Button title="New deposit" onPress={() => router.push('/(app)/(tabs)/deposits')} variant="secondary" />
          <Button title="Map" onPress={() => router.push('/(app)/map')} variant="secondary" />
        </View>
      </Card>
    </Screen>
  );
}

function TrackingPill({ on }: { on: boolean }) {
  return (
    <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
      <View style={[styles.pillDot, { backgroundColor: on ? colors.success : colors.textFaint }]} />
      <Text style={[styles.pillText, { color: on ? colors.success : colors.textMuted }]}>
        {on ? 'Live' : 'Not sharing'}
      </Text>
    </View>
  );
}

function SyncCard({
  pendingCount,
  syncing,
  lastError,
}: {
  pendingCount: number;
  syncing: boolean;
  lastError: string | null;
}) {
  if (pendingCount === 0 && !syncing) {
    return (
      <Card style={styles.syncOkCard}>
        <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
        <Text style={styles.syncOkText}>All caught up — everything is synced</Text>
      </Card>
    );
  }
  return (
    <Card style={[styles.syncCard, lastError && styles.syncCardError]}>
      <Ionicons
        name={lastError ? 'cloud-offline-outline' : 'cloud-upload-outline'}
        size={18}
        color={lastError ? colors.danger : colors.primaryDark}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.syncText, lastError && styles.syncErrorTitle]}>
          {syncing ? 'Syncing…' : `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync`}
        </Text>
        {lastError ? <Text style={styles.syncError}>{lastError}</Text> : null}
      </View>
    </Card>
  );
}

function Kpi({ label, value, icon, warn }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; warn?: boolean }) {
  return (
    <View style={[styles.kpi, warn && styles.kpiWarn]}>
      <Ionicons name={icon} size={18} color={warn ? colors.warning : colors.textMuted} />
      <Text style={[styles.kpiValue, warn && styles.kpiValueWarn]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  greeting: { fontSize: fontSize.xxl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  nextUp: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 2, fontWeight: '600' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillOn: { backgroundColor: colors.successTint, borderColor: colors.success },
  pillOff: { backgroundColor: colors.surfaceSunk, borderColor: colors.border },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: letterSpacing.wideLabel, textTransform: 'uppercase' },

  heroRow: { flexDirection: 'row', gap: spacing.md },
  heroCard: { flex: 1, gap: 4 },
  heroCardAccent: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroLabel: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: letterSpacing.wideLabel },
  heroLabelAccent: { color: colors.primaryTint },
  heroValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: letterSpacing.tightDisplay,
  },
  heroValueAccent: { color: colors.onPrimary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  kpiWarn: { backgroundColor: colors.warningTint, borderColor: colors.warning },
  kpiValue: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  kpiValueWarn: { color: colors.warning },
  kpiLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },

  syncCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryTint, borderColor: colors.primary },
  syncCardError: { backgroundColor: colors.dangerTint, borderColor: colors.danger },
  syncText: { color: colors.primaryDark, fontWeight: '700' },
  syncErrorTitle: { color: colors.danger },
  syncError: { color: colors.danger, marginTop: spacing.xs, fontSize: fontSize.sm },
  syncOkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  syncOkText: { color: colors.success, fontWeight: '700' },

  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trackingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
});
