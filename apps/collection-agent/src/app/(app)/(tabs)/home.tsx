import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fetchMySummary } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { SkeletonBlock } from '@/ui/Skeleton';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, fontSize, radius, letterSpacing, elevation } from '@/ui/theme';
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
        if (!result.started) {
          Alert.alert('Location permission required', 'Enable location access in Settings to start tracking.');
        } else if (!result.backgroundGranted) {
          Alert.alert(
            'Tracking while app is open only',
            'Background location wasn’t granted, so your route only shares while SunSea Collect is open. Choose "Allow all the time" in Settings to keep sharing when the app is in the background.',
          );
        }
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
          <Text style={styles.greeting}>Hi{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}</Text>
          <Text style={styles.nextUp}>{nextUpCopy}</Text>
        </View>
        <TrackingPill on={tracking} />
      </View>

      {summary.isError && (
        <Card style={styles.errorCard}>
          <View style={styles.trackingRow}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={[styles.cardSubtitle, { flex: 1, color: colors.danger }]}>
              Couldn't load today's numbers. Showing the last known values.
            </Text>
            <Button title="Retry" onPress={() => summary.refetch()} variant="ghost" fullWidth={false} />
          </View>
        </Card>
      )}

      <View style={styles.heroRow}>
        <Card style={styles.heroCard} elevation="raised">
          <Text style={styles.heroLabel}>Outstanding</Text>
          {summary.isLoading ? (
            <SkeletonBlock width="70%" height={28} style={{ marginTop: 4 }} />
          ) : (
            <AnimatedNumber
              value={s?.outstanding ?? 0}
              formatter={formatMoney}
              style={styles.heroValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            />
          )}
        </Card>
        <Card style={[styles.heroCard, styles.heroCardAccent]} elevation="raised">
          <Text style={[styles.heroLabel, styles.heroLabelAccent]}>Collected today</Text>
          {summary.isLoading ? (
            <SkeletonBlock width="70%" height={28} style={{ marginTop: 4, backgroundColor: colors.primaryDark }} />
          ) : (
            <AnimatedNumber
              value={s?.collectedToday ?? 0}
              formatter={formatMoney}
              style={[styles.heroValue, styles.heroValueAccent]}
              numberOfLines={1}
              adjustsFontSizeToFit
            />
          )}
        </Card>
      </View>

      <View style={styles.grid}>
        {summary.isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Kpi index={0} label="Assigned" value={assigned} icon="briefcase-outline" />
            <Kpi index={1} label="Visits today" value={s?.visitsToday ?? 0} icon="walk-outline" />
            <Kpi index={2} label="Cash in hand" value={s?.cashInHand ?? 0} icon="wallet-outline" money />
            <Kpi index={3} label="PTP due today" value={ptpDue} icon="calendar-outline" warn={ptpDue > 0} />
          </>
        )}
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
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const wasOn = useRef(on);

  useEffect(() => {
    if (on && !wasOn.current && !reduceMotion) {
      // Pulse once when tracking flips on, to confirm the state change.
      scale.value = withSequence(
        withTiming(1.12, { duration: 140, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    }
    wasOn.current = on;
  }, [on, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.pill, on ? styles.pillOn : styles.pillOff, animatedStyle]}>
      <View style={[styles.pillDot, { backgroundColor: on ? colors.success : colors.textFaint }]} />
      <Text style={[styles.pillText, { color: on ? colors.success : colors.textMuted }]}>
        {on ? 'Live' : 'Not sharing'}
      </Text>
    </Animated.View>
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
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);
  const wasSyncing = useRef(syncing);
  const hadError = useRef(Boolean(lastError));

  useEffect(() => {
    if (syncing && !wasSyncing.current && !reduceMotion) {
      pulse.value = withSequence(
        withTiming(1.03, { duration: 160, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.ease) }),
      );
    }
    wasSyncing.current = syncing;
  }, [syncing, reduceMotion, pulse]);

  useEffect(() => {
    const hasError = Boolean(lastError);
    if (hasError && !hadError.current && !reduceMotion) {
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 90 }),
        withTiming(-4, { duration: 90 }),
        withTiming(0, { duration: 60 }),
      );
    }
    hadError.current = hasError;
  }, [lastError, reduceMotion, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateX: shake.value }],
  }));

  if (pendingCount === 0 && !syncing) {
    return (
      <Animated.View
        key="ok"
        entering={reduceMotion ? undefined : FadeInUp.duration(220)}
        style={[styles.card, styles.syncOkCard]}
      >
        <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
        <Text style={styles.syncOkText}>All caught up — everything is synced</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View
      key="pending"
      entering={reduceMotion ? undefined : FadeInUp.duration(220)}
      style={[styles.card, styles.syncCard, lastError && styles.syncCardError, animatedStyle]}
    >
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
    </Animated.View>
  );
}

function Kpi({
  index,
  label,
  value,
  icon,
  warn,
  money,
}: {
  index: number;
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  warn?: boolean;
  money?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(index * 60).duration(320)}
      style={[styles.kpi, warn && styles.kpiWarn]}
    >
      <Ionicons name={icon} size={18} color={warn ? colors.warning : colors.textMuted} />
      <AnimatedNumber
        value={value}
        formatter={money ? formatMoney : (n) => String(Math.round(n))}
        style={[styles.kpiValue, warn && styles.kpiValueWarn]}
        numberOfLines={1}
        adjustsFontSizeToFit
      />
      <Text style={styles.kpiLabel}>{label}</Text>
    </Animated.View>
  );
}

function KpiSkeleton() {
  return (
    <View style={styles.kpi}>
      <SkeletonBlock width={18} height={18} radius={9} />
      <SkeletonBlock width="50%" height={20} style={{ marginTop: 4 }} />
      <SkeletonBlock width="70%" height={12} />
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

  errorCard: {
    backgroundColor: colors.dangerTint,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation.card,
  },
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
