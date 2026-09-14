import { useIsFocused } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { getErrorMessage } from '@/api/client';
import { useAgentsLive, useOverview } from '@/api/hooks';
import { InlineBar } from '@/charts/BarChart';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Reveal } from '@/ui/Reveal';
import { SectionHeader } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { contrastText, radius, spacing, typography, useReducedMotion, usePalette } from '@/ui/theme';
import type { LiveAgent } from '@/types';
import { formatMoneyCompact, formatRelativeTime, initials } from '@/utils/format';

const MAX_LEADER_STAGGER = 8;

/** A rank badge that pops into place just after its row settles in. */
function RankBadgePop({ index, children }: { index: number; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const delay = Math.min(index, MAX_LEADER_STAGGER) * 40 + 90;
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 180 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>;
}

/** A live-map marker that scales in once, then stops asking react-native-maps to
 * re-measure it — avoiding the classic Marker jank of continual redraws. */
function MarkerPin({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withSpring(1, { damping: 13, stiffness: 170 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>;
}

/** Tracks its own settle window so the Marker can stop re-measuring once the pin has scaled in. */
function useSettlesAfter(ms: number, disabled: boolean): boolean {
  const [settled, setSettled] = useState(disabled);
  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => setSettled(true), ms);
    return () => clearTimeout(timer);
  }, [ms, disabled]);
  return settled;
}

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

function AgentMarker({ agent, markerColor, palette }: {
  agent: LiveAgent & { lastLocation: NonNullable<LiveAgent['lastLocation']> };
  markerColor: string;
  palette: ReturnType<typeof usePalette>;
}) {
  const reducedMotion = useReducedMotion();
  // Marker only needs to keep re-measuring itself while the pin is still animating.
  const settled = useSettlesAfter(400, reducedMotion);
  const { online } = agent;

  return (
    <Marker
      coordinate={{ latitude: agent.lastLocation.latitude, longitude: agent.lastLocation.longitude }}
      accessibilityLabel={`${agent.fullName || 'Agent'}, ${online ? 'online' : 'offline'}`}
      tracksViewChanges={!settled}
    >
      <MarkerPin>
        <View style={[styles.markerRing, { borderColor: markerColor, backgroundColor: palette.bgElevated }]}>
          <View style={[styles.markerBubble, { backgroundColor: markerColor }]}>
            <Text style={[styles.markerText, { color: contrastText(markerColor) }]}>{initials(agent.fullName)}</Text>
          </View>
        </View>
      </MarkerPin>
      <Callout tooltip>
        <Reanimated.View
          entering={reducedMotion ? FadeIn.duration(140) : FadeIn.duration(180).easing(Easing.out(Easing.cubic))}
          style={[styles.callout, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}
        >
          <View style={styles.calloutHeader}>
            <View style={[styles.calloutDot, { backgroundColor: online ? palette.good : palette.neutralDot }]} />
            <Text style={[styles.calloutName, { color: palette.text }]}>{agent.fullName || 'Agent'}</Text>
          </View>
          <Text style={[styles.calloutLine, { color: palette.textMuted }]}>
            {online ? 'Online now' : `Last seen ${formatRelativeTime(agent.lastLocation.recordedAt)}`}
          </Text>
          <Text style={[styles.calloutLine, { color: palette.text, fontWeight: '800' }]}>
            {formatMoneyCompact(agent.today.collectedAmount)} collected today
          </Text>
          {agent.currentTask?.customerName ? (
            <Text style={[styles.calloutLine, { color: palette.textFaint }]} numberOfLines={1}>
              Visiting {agent.currentTask.customerName}
            </Text>
          ) : null}
        </Reanimated.View>
      </Callout>
    </Marker>
  );
}

/** Guards against a bad GPS fix (missing/null, NaN, or the classic 0,0 "null
 * island" sentinel some devices report before a real lock). */
function hasValidLocation(agent: LiveAgent): agent is LiveAgent & { lastLocation: NonNullable<LiveAgent['lastLocation']> } {
  const loc = agent.lastLocation;
  if (!loc) return false;
  const { latitude, longitude } = loc;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

const RANK_COLORS = ['#B8860B', '#8A94A6', '#A45A2A']; // gold, silver, bronze — used only for rank 1-3 accents

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

  const allLiveAgents = agentsLive.data ?? [];
  const liveAgents = allLiveAgents.filter(hasValidLocation);
  const onlineCount = liveAgents.filter((a) => a.online).length;
  // A wide fallback region (roughly all of India) when no agent has reported a
  // fix yet, and a tighter one when exactly one agent anchors the map — many
  // markers still get a sane region from react-native-maps' own fit-to-markers
  // default, but a single marker needs an explicit delta or it zooms to the
  // whole world.
  const initialRegion =
    liveAgents.length > 0
      ? {
          latitude: liveAgents[0].lastLocation.latitude,
          longitude: liveAgents[0].lastLocation.longitude,
          latitudeDelta: 0.4,
          longitudeDelta: 0.4,
        }
      : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 12, longitudeDelta: 12 };

  const firstError = overview.error ?? agentsLive.error;
  const agentsMissingLocation = allLiveAgents.length - liveAgents.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
        <Text style={[typography.headline, { color: palette.text }]}>Agents</Text>

        {firstError ? (
          <ErrorBanner
            message={
              overview.data || agentsLive.data
                ? `Showing last known data. ${getErrorMessage(firstError, 'Could not refresh agents.')}`
                : getErrorMessage(firstError, 'Could not load agents.')
            }
            onRetry={onRefresh}
          />
        ) : null}

        <SectionHeader
          title="Live map"
          subtitle={
            allLiveAgents.length === 0
              ? undefined
              : `${liveAgents.length} reporting · ${onlineCount} online now${
                  agentsMissingLocation > 0 ? ` · ${agentsMissingLocation} without a location fix` : ''
                }`
          }
        />
        <Card style={{ padding: 0, overflow: 'hidden' }} elevation="raised">
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
          ) : allLiveAgents.length === 0 ? (
            <View style={styles.mapFallback}>
              <EmptyState title="No agents reporting location" icon="agents" />
            </View>
          ) : liveAgents.length === 0 ? (
            <View style={styles.mapFallback}>
              <EmptyState
                title="No valid GPS fix yet"
                message={`${allLiveAgents.length} agent${allLiveAgents.length === 1 ? '' : 's'} tracked, but none has reported a usable location.`}
                icon="agents"
              />
            </View>
          ) : (
            <MapView style={styles.map} initialRegion={initialRegion}>
              {liveAgents.map((agent) => (
                <AgentMarker
                  key={agent.agentUserId}
                  agent={agent}
                  markerColor={agent.online ? palette.good : palette.neutralDot}
                  palette={palette}
                />
              ))}
            </MapView>
          )}
        </Card>

        <SectionHeader title="Leaderboard" subtitle="Ranked by month-to-date collections" />
        <Card style={{ padding: 0 }}>
          {overview.isPending ? (
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </View>
          ) : leaderboard.length === 0 ? (
            <EmptyState title="No agent activity yet" />
          ) : (
            leaderboard.map((agent, i) => {
              const rankColor = i < 3 ? RANK_COLORS[i] : palette.textFaint;
              return (
                <Reveal key={agent.agentUserId ?? i} index={i} staggerMs={40}>
                  <View
                    style={[
                      styles.leaderRow,
                      { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                    ]}
                    accessibilityLabel={`Rank ${i + 1}, ${agent.name ?? 'Unknown agent'}, ${formatMoneyCompact(agent.collectedMtd)} collected this month`}
                  >
                    <RankBadgePop index={i}>
                      <View
                        style={[
                          styles.rankBadge,
                          i < 3
                            ? { backgroundColor: rankColor + '22', borderColor: rankColor }
                            : { backgroundColor: palette.overlay, borderColor: 'transparent' },
                        ]}
                      >
                        <Text style={[styles.rankText, { color: rankColor }]}>{i + 1}</Text>
                      </View>
                    </RankBadgePop>
                    <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}>
                      <Text style={[styles.avatarText, { color: palette.accent }]}>{initials(agent.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.leaderName, { color: palette.text }]} numberOfLines={1}>
                        {agent.name ?? 'Unknown agent'}
                      </Text>
                      <View style={styles.leaderMetaRow}>
                        <InlineBar fraction={(agent.collectedMtd ?? 0) / maxCollected} color={i < 3 ? rankColor : undefined} />
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
                </Reveal>
              );
            })
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
  map: { width: '100%', height: 260 },
  mapFallback: { height: 200, justifyContent: 'center' },
  markerRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { fontSize: 11, fontWeight: '800' },
  callout: {
    minWidth: 190,
    maxWidth: 240,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 3,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  calloutDot: { width: 8, height: 8, borderRadius: 4 },
  calloutName: { fontWeight: '800', fontSize: 13.5 },
  calloutLine: { fontSize: 12 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '800' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11.5, fontWeight: '800' },
  leaderName: { fontSize: 14.5, fontWeight: '700' },
  leaderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  leaderMeta: { fontSize: 11, fontWeight: '600' },
  leaderAmount: { fontSize: 15.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  leaderSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});
