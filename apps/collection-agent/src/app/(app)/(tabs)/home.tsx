import React, { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';

import { fetchMySummary } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { colors, spacing, fontSize, radius } from '@/ui/theme';
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

  return (
    <Screen refreshing={summary.isFetching} onRefresh={() => summary.refetch()}>
      <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name}` : ''}</Text>

      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Location tracking</Text>
            <Text style={styles.cardSubtitle}>{tracking ? 'Sharing your route with the office' : 'Off'}</Text>
          </View>
          <Switch
            value={tracking}
            onValueChange={onToggleTracking}
            disabled={trackingBusy}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>

      {sync.pendingCount > 0 && (
        <Card style={styles.syncCard}>
          <Text style={styles.syncText}>
            {sync.syncing ? 'Syncing…' : `${sync.pendingCount} item(s) waiting to sync`}
          </Text>
          {sync.lastError ? <Text style={styles.syncError}>{sync.lastError}</Text> : null}
        </Card>
      )}

      <View style={styles.grid}>
        <Kpi label="Assigned" value={String(s?.assignedCount ?? 0)} />
        <Kpi label="Outstanding" value={formatMoney(s?.outstanding)} />
        <Kpi label="Collected today" value={formatMoney(s?.collectedToday)} />
        <Kpi label="Visits today" value={String(s?.visitsToday ?? 0)} />
        <Kpi label="Cash in hand" value={formatMoney(s?.cashInHand)} highlight />
        <Kpi label="PTP due today" value={String(s?.ptpDueToday ?? 0)} />
      </View>

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

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.kpi, highlight && styles.kpiHighlight]}>
      <Text style={[styles.kpiValue, highlight && styles.kpiValueHighlight]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  syncCard: { backgroundColor: colors.chipBg, borderColor: colors.primary },
  syncText: { color: colors.primaryDark, fontWeight: '600' },
  syncError: { color: colors.danger, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  kpiHighlight: { backgroundColor: colors.primary, borderColor: colors.primary },
  kpiValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  kpiValueHighlight: { color: colors.onPrimary },
  kpiLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
});
