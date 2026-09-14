import React, { useEffect, useState } from 'react';
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
import { colors, fontSize, spacing } from '@/ui/theme';

const STAGGER_CAP = 10;

// Falls back to roughly the middle of India if the device's own location
// never resolves (permission denied, GPS off indoors) — better than
// blocking the whole map screen on a fix that may never arrive.
const FALLBACK_REGION = { latitude: 22.9734, longitude: 78.6569, latitudeDelta: 8, longitudeDelta: 8 };

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

  const pins = (assignments.data ?? []).filter((a) => {
    const addr = a.customer?.addresses?.[0];
    return addr?.latitude != null && addr?.longitude != null;
  });

  if (locating) {
    return (
      <Screen>
        <Text style={styles.muted}>Locating you…</Text>
      </Screen>
    );
  }

  if (assignments.isError) {
    return (
      <Screen>
        <EmptyState icon="cloud-offline-outline" tone="offline" title="Couldn't load assignments" subtitle="The map needs your assignment list to plot pins." />
        <Button title="Retry" onPress={() => assignments.refetch()} variant="secondary" />
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
        {pins.map((a, index) => {
          const addr = a.customer!.addresses![0];
          return (
            <Marker
              key={a.id}
              coordinate={{ latitude: addr.latitude!, longitude: addr.longitude! }}
              title={a.customer?.displayName ?? a.customer?.firmName}
              description={a.invoice?.invoiceNo}
              onCalloutPress={() => router.push(`/(app)/assignment/${a.id}`)}
            >
              <Animated.View
                entering={
                  reduceMotion ? undefined : ZoomIn.delay(Math.min(index, STAGGER_CAP) * 30).duration(260).springify().damping(12)
                }
                style={styles.markerDot}
              >
                <View style={styles.markerDotInner} />
              </Animated.View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  markerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1F17',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  muted: { color: colors.textMuted, padding: spacing.lg, fontSize: fontSize.md },
});
