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
import { agentsScreen as copy } from '@/copy';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Reveal } from '@/ui/Reveal';
import { SectionHeader } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { contrastText, layout, radius, sizes, spacing, typography, useReducedMotion, usePalette } from '@/ui/theme';

import type { LiveAgent } from '@/types';
import { formatMoneyCompact, formatMoneyCompactSpoken, formatRelativeTime, initials } from '@/utils/format';

const MAX_LEADER_STAGGER = 8;
// Shared by the live map, its skeleton and its empty/fallback states so the
// card never changes height as it moves between those states — and sized as
// roughly one leaderboard row per ~40dp, giving the map a clear but not
// screen-dominating share of the fold above the leaderboard.
const MAP_HEIGHT = 260;

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
      accessibilityLabel={`${agent.fullName || copy.liveMap.unnamedAgent}, ${online ? 'online' : 'offline'}`}
      tracksViewChanges={!settled}
    >
      <MarkerPin>
        <View style={[styles.markerRing, { borderColor: markerColor, backgroundColor: palette.bgElevated }]}>
          <View style={[styles.markerBubble, { backgroundColor: markerColor }]}>
            <Text style={[typography.label, { color: contrastText(markerColor) }]}>{initials(agent.fullName)}</Text>
          </View>
        </View>
      </MarkerPin>
      <Callout tooltip>
        <Reanimated.View
          entering={reducedMotion ? FadeIn.duration(140) : FadeIn.duration(180).easing(Easing.out(Easing.cubic))}
          style={[styles.callout, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}
        >
          <View style={styles.calloutHeader}>
            <View style={[styles.calloutDot, { backgroundColor: online ? palette.markerOnline : palette.markerStale }]} />
            <Text style={[typography.bodySm, { color: palette.text }]}>{agent.fullName || copy.liveMap.unnamedAgent}</Text>
          </View>
          <Text style={[typography.caption, { color: palette.textMuted }]}>
            {online ? copy.liveMap.agentOnlineNow : copy.liveMap.agentLastSeen(formatRelativeTime(agent.lastLocation.recordedAt))}
          </Text>
          <Text style={[typography.monoSm, { color: palette.text }]}>
            {copy.liveMap.agentCollectedToday(formatMoneyCompact(agent.today.collectedAmount))}
          </Text>
          {agent.currentTask?.customerName ? (
            <Text style={[typography.caption, { color: palette.textFaint }]} numberOfLines={1}>
              {copy.liveMap.agentVisiting(agent.currentTask.customerName)}
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

export default function AgentsScreen() {
  const palette = usePalette();
  // Rank 1-3 accents (gold/silver/bronze) — theme-aware so dark mode gets its
  // own lifted, desaturated set rather than the light values pasted in as-is.
  const RANK_TIER_COLORS = [palette.rankGold, palette.rankSilver, palette.rankBronze];
  const RANK_TIER_SOFT = [palette.rankGoldSoft, palette.rankSilverSoft, palette.rankBronzeSoft];
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
        <Text style={[typography.headline, { color: palette.text }]}>{copy.title}</Text>

        {firstError ? (
          <ErrorBanner
            message={
              overview.data || agentsLive.data
                ? `${copy.stalePrefix(formatRelativeTime(overview.data?.generatedAt))}${getErrorMessage(firstError, copy.refreshFailedFallback)}`
                : getErrorMessage(firstError, copy.loadFailedFallback)
            }
            onRetry={onRefresh}
            tone={overview.data || agentsLive.data ? 'stale' : 'error'}
          />
        ) : null}

        <SectionHeader
          title={copy.liveMap.title}
          subtitle={
            allLiveAgents.length === 0
              ? undefined
              : copy.liveMap.subtitle(liveAgents.length, onlineCount, agentsMissingLocation)
          }
        />
        <Card style={{ padding: 0, overflow: 'hidden' }} elevation="raised">
          {Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
              <EmptyState title={copy.liveMap.webFallbackTitle} message={copy.liveMap.webFallbackMessage} />
            </View>
          ) : agentsLive.isPending ? (
            <Skeleton height={MAP_HEIGHT} radius={0} />
          ) : !MapView ? (
            <View style={styles.mapFallback}>
              <EmptyState title={copy.liveMap.moduleUnavailableTitle} message={copy.liveMap.moduleUnavailableMessage} />
            </View>
          ) : allLiveAgents.length === 0 ? (
            <View style={styles.mapFallback}>
              <EmptyState title={copy.liveMap.noAgentsTitle} message={copy.liveMap.noAgentsMessage} icon="agents" />
            </View>
          ) : liveAgents.length === 0 ? (
            <View style={styles.mapFallback}>
              <EmptyState
                title={copy.liveMap.noGpsFixTitle}
                message={copy.liveMap.noGpsFixMessage(allLiveAgents.length)}
                icon="agents"
              />
            </View>
          ) : (
            <MapView style={styles.map} initialRegion={initialRegion}>
              {liveAgents.map((agent) => (
                <AgentMarker
                  key={agent.agentUserId}
                  agent={agent}
                  markerColor={agent.online ? palette.markerOnline : palette.markerStale}
                  palette={palette}
                />
              ))}
            </MapView>
          )}
        </Card>

        <SectionHeader title={copy.leaderboard.title} subtitle={copy.leaderboard.subtitle} />
        <Card style={{ padding: 0 }}>
          {overview.isPending ? (
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </View>
          ) : leaderboard.length === 0 ? (
            <EmptyState title={copy.leaderboard.emptyTitle} message={copy.leaderboard.emptyMessage} />
          ) : (
            leaderboard.map((agent, i) => {
              const rankColor = i < 3 ? RANK_TIER_COLORS[i] : palette.textFaint;
              const rankSoft = i < 3 ? RANK_TIER_SOFT[i] : palette.overlay;
              return (
                <Reveal key={agent.agentUserId ?? i} index={i} staggerMs={40}>
                  <View
                    style={[
                      styles.leaderRow,
                      { borderTopColor: palette.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                    ]}
                    accessibilityLabel={`Rank ${i + 1}, ${agent.name ?? copy.leaderboard.unknownAgent}, ${formatMoneyCompactSpoken(agent.collectedMtd)} collected this month`}
                  >
                    <RankBadgePop index={i}>
                      <View
                        style={[
                          styles.rankBadge,
                          i < 3
                            ? { backgroundColor: rankSoft, borderColor: rankColor }
                            : { backgroundColor: palette.overlay, borderColor: 'transparent' },
                        ]}
                      >
                        <Text style={[typography.label, { color: rankColor }]}>{i + 1}</Text>
                      </View>
                    </RankBadgePop>
                    <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}>
                      <Text style={[typography.label, { color: palette.accent }]}>{initials(agent.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.titleSm, { color: palette.text }]} numberOfLines={1}>
                        {agent.name ?? copy.leaderboard.unknownAgent}
                      </Text>
                      <View style={styles.leaderMetaRow}>
                        <InlineBar fraction={(agent.collectedMtd ?? 0) / maxCollected} color={i < 3 ? rankColor : undefined} />
                        <Text style={[typography.caption, { color: palette.textFaint }]}>
                          {copy.leaderboard.visitsAndPending(agent.visitsToday ?? 0, agent.pendingAssignments ?? 0)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.mono, { color: palette.text }]}>
                        {formatMoneyCompact(agent.collectedMtd)}
                      </Text>
                      <Text style={[typography.caption, { color: palette.textFaint, marginTop: 2 }]}>
                        {copy.leaderboard.collectedTodayCaption(formatMoneyCompact(agent.collectedToday))}
                      </Text>
                    </View>
                  </View>
                </Reveal>
              );
            })
          )}
        </Card>

        <View style={{ height: layout.scrollEndSpacer }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  map: { width: '100%', height: MAP_HEIGHT },
  mapFallback: { height: MAP_HEIGHT, justifyContent: 'center' },
  markerRing: {
    width: sizes.mapMarkerRing,
    height: sizes.mapMarkerRing,
    borderRadius: sizes.mapMarkerRing / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    width: sizes.mapMarkerBubble,
    height: sizes.mapMarkerBubble,
    borderRadius: sizes.mapMarkerBubble / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Same rank-column width, row padding and column gap as the overview
  // screen's debtor rows, so "rank / avatar / text / number" reads as one
  // grid discipline across both list-style screens, not a per-row guess.
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.rowPaddingH,
    paddingVertical: layout.rowPaddingV,
    gap: layout.rowGap,
  },
  rankBadge: {
    width: sizes.rankBadge,
    height: sizes.rankBadge,
    borderRadius: sizes.rankBadge / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: sizes.avatarSm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
});
