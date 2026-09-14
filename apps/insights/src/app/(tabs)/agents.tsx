import { useIsFocused } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { useAgentsLive, useOverview } from '@/api/hooks';
import { InlineBar } from '@/charts/BarChart';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { SectionHeader } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { spacing, usePalette } from '@/ui/theme';
import type { LiveAgent } from '@/types';
import { formatMoneyCompact, formatRelativeTime, initials } from '@/utils/format';

let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Callout = maps.Callout;
  } catch {
    MapView = null;
  }
}

function isOnline(agent: LiveAgent): boolean {
  if (agent.online !== undefined) return agent.online;
  if (!agent.recordedAt) return false;
  return Date.now() - new Date(agent.recordedAt).getTime() < 5 * 60 * 1000;
}

export default function AgentsScreen() {
  const palette = usePalette();
  const focused = useIsFocused();
  const overview = useOverview(focused);
  const agentsLive = useAgentsLive(focused);

  const isRefreshing = overview.isRefetching || agentsLive.isRefetching;
  const onRefresh = () => {
    overview.refetch();
    agentsLive.refetch();
  };

  const leaderboard = overview.data?.agents?.leaderboard ?? [];
  const maxCollected = useMemo(
    () => Math.max(...leaderboard.map((a) => a.collectedMtd ?? 0), 1),
    [leaderboard]
  );

  const liveAgents = (agentsLive.data ?? []).filter(
    (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number'
  );
  const initialRegion = liveAgents[0]
    ? {
        latitude: liveAgents[0].latitude!,
        longitude: liveAgents[0].longitude!,
        latitudeDelta: 0.4,
        longitudeDelta: 0.4,
      }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 12, longitudeDelta: 12 };

  const firstError = overview.error ?? agentsLive.error;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
        <Text style={[styles.headline, { color: palette.text }]}>Agents</Text>

        {firstError ? (
          <ErrorBanner message={getErrorMessage(firstError, 'Could not load agents.')} onRetry={onRefresh} />
        ) : null}

        <SectionHeader title="Live map" subtitle={`${liveAgents.length} agent(s) reporting`} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
              <EmptyState title="Map unavailable on web preview" message="Open the app on a device to see the live map." />
            </View>
          ) : agentsLive.isPending ? (
            <Skeleton height={260} radius={0} />
          ) : !MapView ? (
            <View style={styles.mapFallback}>
              <EmptyState title="Map module unavailable" />
            </View>
          ) : liveAgents.length === 0 ? (
            <View style={styles.mapFallback}>
              <EmptyState title="No agents reporting location" icon="⌖" />
            </View>
          ) : (
            <MapView style={styles.map} initialRegion={initialRegion}>
              {liveAgents.map((agent) => {
                const online = isOnline(agent);
                return (
                  <Marker
                    key={agent.agentUserId}
                    coordinate={{ latitude: agent.latitude!, longitude: agent.longitude! }}
                  >
                    <View
                      style={[
                        styles.markerBubble,
                        { backgroundColor: online ? palette.good : palette.neutralDot, borderColor: palette.bgElevated },
                      ]}
                    >
                      <Text style={styles.markerText}>{initials(agent.name)}</Text>
                    </View>
                    <Callout>
                      <View style={{ minWidth: 160, padding: 4 }}>
                        <Text style={{ fontWeight: '700', marginBottom: 2 }}>{agent.name ?? 'Agent'}</Text>
                        <Text style={{ fontSize: 12 }}>
                          {online ? 'Online' : `Last seen ${formatRelativeTime(agent.recordedAt)}`}
                        </Text>
                        <Text style={{ fontSize: 12 }}>Today: {formatMoneyCompact(agent.collectedToday)}</Text>
                        {agent.currentTask?.customerName ? (
                          <Text style={{ fontSize: 12 }}>Visiting: {agent.currentTask.customerName}</Text>
                        ) : null}
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          )}
        </Card>

        <SectionHeader title="Leaderboard" subtitle="Ranked by month-to-date collections" />
        <Card style={{ padding: 0 }}>
          {overview.isPending ? (
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </View>
          ) : leaderboard.length === 0 ? (
            <EmptyState title="No agent activity yet" />
          ) : (
            leaderboard.map((agent, i) => (
              <View
                key={agent.agentUserId ?? i}
                style={[
                  styles.leaderRow,
                  { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                ]}
              >
                <Text style={[styles.rank, { color: i < 3 ? palette.accent : palette.textFaint }]}>
                  #{i + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaderName, { color: palette.text }]} numberOfLines={1}>
                    {agent.name ?? 'Unknown agent'}
                  </Text>
                  <View style={styles.leaderMetaRow}>
                    <InlineBar fraction={(agent.collectedMtd ?? 0) / maxCollected} />
                    <Text style={[styles.leaderMeta, { color: palette.textFaint }]}>
                      {agent.visitsToday ?? 0} visits · {agent.pendingAssignments ?? 0} pending
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.leaderAmount, { color: palette.text }]}>
                    {formatMoneyCompact(agent.collectedMtd)}
                  </Text>
                  <Text style={[styles.leaderSub, { color: palette.textFaint }]}>
                    {formatMoneyCompact(agent.collectedToday)} today
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  map: { width: '100%', height: 260 },
  mapFallback: { height: 200, justifyContent: 'center' },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rank: { fontSize: 14, fontWeight: '800', width: 28 },
  leaderName: { fontSize: 14.5, fontWeight: '700' },
  leaderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  leaderMeta: { fontSize: 11 },
  leaderAmount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  leaderSub: { fontSize: 11, marginTop: 2 },
});
