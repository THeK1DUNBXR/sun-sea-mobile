import { useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

// Type-only import: erased at compile time, so it carries none of
// react-native-maps' native init cost — only the shapes needed to type the
// lazily `require`'d values below without resorting to `any`.
import type RNMapView from 'react-native-maps';
import type { Marker as RNMarker, Callout as RNCallout } from 'react-native-maps';

const MAX_LEADER_STAGGER = 8;
// The live map's height is a share of the viewport's *height*, not a fixed
// constant — so a small phone doesn't dedicate the same fixed 260dp as a
// tall tablet, and a landscape orientation (where height is scarce) gets a
// visibly shorter map instead of pushing the leaderboard off-screen. Shared
// by the map, its skeleton and its empty/fallback states so the card never
// changes height as it moves between those states.
function useMapHeight(): number {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const share = isLandscape ? 0.32 : 0.26;
  return Math.round(Math.min(360, Math.max(200, windowHeight * share)));
}

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

let MapView: typeof RNMapView | null = null;
let Marker: typeof RNMarker | null = null;
let Callout: typeof RNCallout | null = null;
let mapsLoadAttempted = false;

/** Defers requiring the native react-native-maps module until this screen
 * actually renders, instead of at module scope. Expo Router's tab navigator
 * imports every tab's route module up front to register the tab bar, so a
 * top-level `require` here would pay react-native-maps' native init cost on
 * every app boot even for a session that never opens the Agents tab.
 * Idempotent and synchronous, so it's safe to call unconditionally from
 * render — no extra re-render needed once it resolves. */
function ensureMapsLoaded() {
  if (mapsLoadAttempted || Platform.OS === 'web') return;
  mapsLoadAttempted = true;
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

// Memoized so a live-agents refetch that changes one agent's fix doesn't
// re-render every marker on the map — react-query's structural sharing keeps
// an unchanged agent's object reference stable across refetches, so this
// actually skips re-rendering markers whose data hasn't moved.
const AgentMarker = React.memo(function AgentMarker({ agent, markerColor, palette }: {
  agent: LiveAgent & { lastLocation: NonNullable<LiveAgent['lastLocation']> };
  markerColor: string;
  palette: ReturnType<typeof usePalette>;
}) {
  const reducedMotion = useReducedMotion();
  // Marker only needs to keep re-measuring itself while the pin is still animating.
  const settled = useSettlesAfter(400, reducedMotion);
  const { online } = agent;
  // AgentMarker only ever mounts once the caller's `!MapView` guard (below,
  // in AgentsScreen) has already confirmed react-native-maps loaded — Marker
  // and Callout are set alongside MapView in ensureMapsLoaded, so they're
  // non-null here too. The assertion just tells TS what that render guard
  // already guarantees at runtime.
  const MarkerView = Marker!;
  const CalloutView = Callout!;

  return (
    <MarkerView
      coordinate={{ latitude: agent.lastLocation.latitude, longitude: agent.lastLocation.longitude }}
      accessibilityLabel={`${agent.fullName || copy.liveMap.unnamedAgent}, ${online ? 'online' : 'offline'}`}
      tracksViewChanges={!settled}
    >
      <MarkerPin>
        <View style={[styles.markerRing, { borderColor: markerColor, backgroundColor: palette.bgElevated }]}>
          <View style={[styles.markerBubble, { backgroundColor: markerColor }]}>
            <Text style={[typography.label, { color: contrastText(markerColor) }]} maxFontSizeMultiplier={1.3}>
              {initials(agent.fullName)}
            </Text>
          </View>
        </View>
      </MarkerPin>
      <CalloutView tooltip>
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
      </CalloutView>
    </MarkerView>
  );
});

/** Guards against a bad GPS fix (missing/null, NaN, or the classic 0,0 "null
 * island" sentinel some devices report before a real lock). */
type LeaderboardEntry = NonNullable<ReturnType<typeof useOverview>['data']>['agents']['leaderboard'][number];

/** One leaderboard row, memoized so a 60s overview refetch — which usually
 * changes only a couple of agents' figures — doesn't re-render every row.
 * React-query's structural sharing keeps an unchanged `agent` entry's object
 * reference stable across refetches, so this actually skips re-rendering
 * rows whose numbers didn't move. */
const LeaderboardRow = React.memo(function LeaderboardRow({
  agent,
  index,
  isFirst,
  rankColor,
  rankSoft,
  maxCollected,
  palette,
}: {
  agent: LeaderboardEntry;
  index: number;
  isFirst: boolean;
  rankColor: string;
  rankSoft: string;
  maxCollected: number;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Reveal index={index} staggerMs={40}>
      <View
        style={[
          styles.leaderRow,
          { borderTopColor: palette.border, borderTopWidth: isFirst ? 0 : StyleSheet.hairlineWidth },
        ]}
        accessibilityLabel={`Rank ${index + 1}, ${agent.name ?? copy.leaderboard.unknownAgent}, ${formatMoneyCompactSpoken(agent.collectedMtd)} collected this month`}
      >
        <RankBadgePop index={index}>
          <View
            style={[
              styles.rankBadge,
              index < 3
                ? { backgroundColor: rankSoft, borderColor: rankColor }
                : { backgroundColor: palette.overlay, borderColor: 'transparent' },
            ]}
          >
            <Text style={[typography.label, { color: rankColor }]} maxFontSizeMultiplier={1.3}>
              {index + 1}
            </Text>
          </View>
        </RankBadgePop>
        <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}>
          <Text style={[typography.label, { color: palette.accent }]} maxFontSizeMultiplier={1.3}>
            {initials(agent.name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.titleSm, { color: palette.text }]} numberOfLines={1}>
            {agent.name ?? copy.leaderboard.unknownAgent}
          </Text>
          <View style={styles.leaderMetaRow}>
            <InlineBar fraction={(agent.collectedMtd ?? 0) / maxCollected} color={index < 3 ? rankColor : undefined} />
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
});

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
  ensureMapsLoaded();
  const palette = usePalette();
  // Rank 1-3 accents (gold/silver/bronze) — theme-aware so dark mode gets its
  // own lifted, desaturated set rather than the light values pasted in as-is.
  // Memoized so the tuple identity only changes when the palette itself does
  // (a theme flip), not on every render — it's read by every leaderboard row.
  const RANK_TIER_COLORS = useMemo(
    () => [palette.rankGold, palette.rankSilver, palette.rankBronze],
    [palette]
  );
  const RANK_TIER_SOFT = useMemo(
    () => [palette.rankGoldSoft, palette.rankSilverSoft, palette.rankBronzeSoft],
    [palette]
  );
  const focused = useIsFocused();
  const mapHeight = useMapHeight();
  const overview = useOverview(focused);
  const agentsLive = useAgentsLive(focused);

  const isRefreshing = overview.isRefetching || agentsLive.isRefetching;
  // Stable identity: onRefresh only feeds a RefreshControl prop, but keeping it
  // referentially stable avoids a needless prop diff on every render.
  const onRefresh = useCallback(() => {
    overview.refetch();
    agentsLive.refetch();
  }, [overview, agentsLive]);

  const leaderboard = overview.data?.agents?.leaderboard ?? [];
  const maxCollected = useMemo(
    () => Math.max(...leaderboard.map((a) => a.collectedMtd ?? 0), 1),
    [leaderboard]
  );

  const allLiveAgents = agentsLive.data ?? [];
  // Memoized on the query's own data reference: react-query's structural
  // sharing keeps `agentsLive.data` referentially stable when a refetch
  // returns unchanged content, so this (and the marker list built from it)
  // skips recomputing on renders triggered by anything else — theme change,
  // overview refetch, mapHeight recalculation, etc.
  const liveAgents = useMemo(() => allLiveAgents.filter(hasValidLocation), [allLiveAgents]);
  const onlineCount = useMemo(() => liveAgents.filter((a) => a.online).length, [liveAgents]);
  // A wide fallback region (roughly all of India) when no agent has reported a
  // fix yet, and a tighter one when exactly one agent anchors the map — many
  // markers still get a sane region from react-native-maps' own fit-to-markers
  // default, but a single marker needs an explicit delta or it zooms to the
  // whole world. react-native-maps only reads `initialRegion` on first mount,
  // but memoizing still avoids reallocating this object on every render.
  const initialRegion = useMemo(
    () =>
      liveAgents.length > 0
        ? {
            latitude: liveAgents[0].lastLocation.latitude,
            longitude: liveAgents[0].lastLocation.longitude,
            latitudeDelta: 0.4,
            longitudeDelta: 0.4,
          }
        : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 12, longitudeDelta: 12 },
    [liveAgents]
  );

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
      <View style={styles.content}>
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
            <View style={[styles.mapFallback, { height: mapHeight }]}>
              <EmptyState title={copy.liveMap.webFallbackTitle} message={copy.liveMap.webFallbackMessage} />
            </View>
          ) : agentsLive.isPending ? (
            <Skeleton height={mapHeight} radius={0} />
          ) : !MapView ? (
            <View style={[styles.mapFallback, { height: mapHeight }]}>
              <EmptyState title={copy.liveMap.moduleUnavailableTitle} message={copy.liveMap.moduleUnavailableMessage} />
            </View>
          ) : allLiveAgents.length === 0 ? (
            <View style={[styles.mapFallback, { height: mapHeight }]}>
              <EmptyState title={copy.liveMap.noAgentsTitle} message={copy.liveMap.noAgentsMessage} icon="agents" />
            </View>
          ) : liveAgents.length === 0 ? (
            <View style={[styles.mapFallback, { height: mapHeight }]}>
              <EmptyState
                title={copy.liveMap.noGpsFixTitle}
                message={copy.liveMap.noGpsFixMessage(allLiveAgents.length)}
                icon="agents"
              />
            </View>
          ) : (
            <MapView style={[styles.map, { height: mapHeight }]} initialRegion={initialRegion}>
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
            leaderboard.map((agent, i) => (
              <LeaderboardRow
                key={agent.agentUserId ?? i}
                agent={agent}
                index={i}
                isFirst={i === 0}
                rankColor={i < 3 ? RANK_TIER_COLORS[i] : palette.textFaint}
                rankSoft={i < 3 ? RANK_TIER_SOFT[i] : palette.overlay}
                maxCollected={maxCollected}
                palette={palette}
              />
            ))
          )}
        </Card>

        <View style={{ height: layout.scrollEndSpacer }} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  map: { width: '100%' },
  mapFallback: { justifyContent: 'center' },
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
