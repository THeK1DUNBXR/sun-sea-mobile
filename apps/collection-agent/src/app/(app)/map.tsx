import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { fetchAssignments } from '@/api/agentApi';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { Screen } from '@/ui/Screen';
import { colors, fontSize, spacing } from '@/ui/theme';

export default function MapScreen() {
  const router = useRouter();
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const assignments = useQuery({ queryKey: ['assignments', {}], queryFn: () => fetchAssignments() });

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const pins = (assignments.data ?? []).filter((a) => {
    const addr = a.customer?.addresses?.[0];
    return addr?.latitude != null && addr?.longitude != null;
  });

  if (!position) {
    return (
      <Screen>
        <Text style={styles.muted}>Locating you…</Text>
      </Screen>
    );
  }

  return (
    <View style={styles.flex}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.flex}
        initialRegion={{
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {pins.map((a) => {
          const addr = a.customer!.addresses![0];
          return (
            <Marker
              key={a.id}
              coordinate={{ latitude: addr.latitude!, longitude: addr.longitude! }}
              title={a.customer?.displayName ?? a.customer?.firmName}
              description={a.invoice?.invoiceNo}
              onCalloutPress={() => router.push(`/(app)/assignment/${a.id}`)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { color: colors.textMuted, padding: spacing.lg, fontSize: fontSize.md },
});
