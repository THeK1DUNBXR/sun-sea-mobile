import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { fetchAssignments } from '@/api/agentApi';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, mapPin, minTouch, type, spacing } from '@/ui/theme';
import { assignmentStatusMeta, isOverdue } from '@/ui/format';
import { copy } from '@/copy';
import type { Assignment } from '@/types/models';

const STAGGER_CAP = 10;

// Falls back to roughly the middle of India if the device's own location
// never resolves (permission denied, GPS off indoors) — better than
// blocking the whole map screen on a fix that may never arrive.
const FALLBACK_REGION = { latitude: 22.9734, longitude: 78.6569, latitudeDelta: 8, longitudeDelta: 8 };

/** Marker fill for one assignment — status/due-date outrank priority so an
 * overdue or already-collected stop never reads as merely low/normal
 * priority. Color is never the only signal: callers also render the status
 * label (and "Overdue"/"PTP") into the marker's callout text below. */
function pinColorFor(assignment: Assignment): string {
  if (isOverdue(assignment.invoice?.dueDate)) return mapPin.overdue;
  if (assignment.status === 'COLLECTED') return mapPin.collected;
  if (assignment.promise?.promisedDate) return mapPin.promised;
  return mapPin.default;
}

export default function MapScreen() {
  const router = useRouter();
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const [locating, setLocating] = useState(true);
  const assignments = useQuery({ queryKey: ['assignments', {}], queryFn: () => fetchAssignments() });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    getCurrentPosition()
      .then((pos) => {
        if (!cancelled) setPosition(pos);
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recomputed only when the fetched list itself changes, not on every
  // position/locating state update this screen re-renders for.
  const pins = useMemo(
    () =>
      (assignments.data ?? []).filter((a) => {
        const addr = a.customer?.addresses?.[0];
        return addr?.latitude != null && addr?.longitude != null;
      }),
    [assignments.data],
  );

  // Stable across re-renders (position updates, refetches) so it isn't a
  // "new" prop on every memoized AssignmentMarker on every render.
  const onMarkerPress = useCallback((id: string) => router.push(`/(app)/assignment/${id}`), [router]);

  if (locating) {
    return (
      <Screen>
        <Text style={styles.muted}>{copy.map.locating}</Text>
      </Screen>
    );
  }

  if (assignments.isError) {
    return (
      <Screen>
        <EmptyState icon="cloud-offline-outline" tone="offline" title={copy.map.loadErrorTitle} subtitle={copy.map.loadErrorSubtitle} />
        <Button title={copy.profile.retry} onPress={() => assignments.refetch()} variant="secondary" />
      </Screen>
    );
  }

  return (
    <View style={styles.flex}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.flex}
        initialRegion={
          position ? { latitude: position.latitude, longitude: position.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 } : FALLBACK_REGION
        }
        showsUserLocation={Boolean(position)}
      >
        {pins.map((a, index) => (
          <AssignmentMarker key={a.id} assignment={a} index={index} reduceMotion={reduceMotion} onPress={onMarkerPress} />
        ))}
      </MapView>
    </View>
  );
}

/** One map pin. Memoized so a sibling marker's press, or the map's own pan/
 * zoom, never re-renders every other marker. `tracksViewChanges` stays true
 * only for the brief window the entrance animation is actually running —
 * react-native-maps re-snapshots the marker's native view every frame while
 * it's true, which is the single most expensive thing a custom-view Marker
 * can do with more than a handful of pins on screen. */
const AssignmentMarker = React.memo(function AssignmentMarker({
  assignment,
  index,
  reduceMotion,
  onPress,
}: {
  assignment: Assignment;
  index: number;
  reduceMotion: boolean;
  onPress: (id: string) => void;
}) {
  const addr = assignment.customer!.addresses![0];
  const overdue = isOverdue(assignment.invoice?.dueDate);
  const statusMeta = assignmentStatusMeta(assignment.status);
  // The pin's fill carries the status at a glance, but the callout's text
  // carries the same meaning in words — color is never the only signal here.
  const flags = [statusMeta.label, overdue && 'Overdue', assignment.promise?.promisedDate && 'Promise to pay'].filter(Boolean);
  const description = [assignment.invoice?.invoiceNo, flags.join(' · ')].filter(Boolean).join(' — ');

  const [tracksViewChanges, setTracksViewChanges] = useState(!reduceMotion);
  useEffect(() => {
    if (!tracksViewChanges) return;
    // Entrance animation duration below is 260ms plus a staggered delay
    // capped at STAGGER_CAP steps; settle a little past the slowest one,
    // then freeze the marker's native snapshot for the rest of its life.
    const delay = reduceMotion ? 0 : Math.min(index, STAGGER_CAP) * 30 + 320;
    const timer = setTimeout(() => setTracksViewChanges(false), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Marker
      coordinate={{ latitude: addr.latitude!, longitude: addr.longitude! }}
      title={assignment.customer?.displayName ?? assignment.customer?.firmName}
      description={description}
      tracksViewChanges={tracksViewChanges}
      onCalloutPress={() => onPress(assignment.id)}
    >
      <Animated.View
        entering={reduceMotion ? undefined : ZoomIn.delay(Math.min(index, STAGGER_CAP) * 30).duration(260).springify().damping(12)}
        style={styles.markerDot}
      >
        <View style={styles.markerDotVisible}>
          <View style={[styles.markerDotInner, { backgroundColor: pinColorFor(assignment) }]} />
        </View>
      </Animated.View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // The tappable area is this outer view's size (react-native-maps hit-tests
  // the Marker's rendered child), so it's kept at the field-use touch-target
  // floor even though the visible pin (markerDotInner, below) stays small —
  // otherwise a cluster of nearby stops would be nearly impossible to tap
  // precisely on a phone screen.
  markerDot: {
    width: minTouch,
    height: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDotVisible: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  // Fill color set per-marker (pinColorFor) — this just supplies the shape.
  markerDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  muted: { ...type.body, color: colors.textMuted, padding: spacing.lg },
});
