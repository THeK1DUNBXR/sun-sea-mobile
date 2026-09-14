import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDateTime } from '@/ui/format';
import { useAuth } from '@/store/auth';
import { useSyncStatus } from '@/offline/useSyncStatus';
import { retryItem, removeItem } from '@/offline/queue';
import { startTracking, stopTracking, getTrackingPreference } from '@/location/tracking';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const sync = useSyncStatus();
  const [tracking, setTracking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getTrackingPreference().then(setTracking);
    }, []),
  );

  const onToggleTracking = async (value: boolean) => {
    if (value) {
      const result = await startTracking();
      setTracking(result.started);
      if (!result.started) Alert.alert('Location permission required', 'Enable location access to start tracking.');
    } else {
      await stopTracking();
      setTracking(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.name}>{user?.name ?? 'Agent'}</Text>
        <Text style={styles.subtitle}>{user?.email ?? user?.phone ?? ''}</Text>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Location tracking</Text>
          <Switch value={tracking} onValueChange={onToggleTracking} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Offline queue</Text>
          <Button title="Sync now" onPress={sync.flushNow} loading={sync.syncing} fullWidth={false} variant="secondary" />
        </View>
        {sync.items.length === 0 ? (
          <EmptyState title="Nothing pending" />
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {sync.items.map((item) => (
              <View key={item.id} style={styles.queueRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueKind}>{item.kind}</Text>
                  <Text style={styles.subtitle}>{formatDateTime(item.createdAt)}</Text>
                  {item.lastError ? <Text style={styles.errorText}>{item.lastError}</Text> : null}
                </View>
                {item.lastError ? <Badge label="Failed" tone="danger" /> : <Badge label="Pending" />}
                {item.lastError ? (
                  <Button title="Retry" onPress={() => retryItem(item.id)} fullWidth={false} variant="ghost" />
                ) : null}
                <Button title="Remove" onPress={() => removeItem(item.id)} fullWidth={false} variant="ghost" />
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button title="Log out" onPress={logout} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  queueKind: { fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
});
