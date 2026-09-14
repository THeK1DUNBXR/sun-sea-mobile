import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, letterSpacing, radius, sizes } from '@/ui/theme';
import { formatDateTime, initials } from '@/ui/format';
import { useAuth } from '@/store/auth';
import { useSyncStatus } from '@/offline/useSyncStatus';
import { retryItem, removeItem, subscribeSyncNotes, dismissSyncNote, type SyncNote } from '@/offline/queue';
import { startTracking, stopTracking, getTrackingPreference } from '@/location/tracking';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const sync = useSyncStatus();
  const [tracking, setTracking] = useState(false);
  const [notes, setNotes] = useState<SyncNote[]>([]);

  useEffect(() => subscribeSyncNotes(setNotes), []);

  useFocusEffect(
    useCallback(() => {
      getTrackingPreference().then(setTracking);
    }, []),
  );

  const onToggleTracking = async (value: boolean) => {
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
  };

  return (
    <Screen>
      <Card elevation="raised" style={styles.identityRow}>
        <Avatar label={initials(user?.fullName)} color={colors.primary} size={sizes.avatar + spacing.md} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName ?? 'Agent'}</Text>
          <Text style={styles.subtitle}>{user?.email ?? user?.username ?? ''}</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.trackingLabel}>
            <Ionicons name="navigate" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Location tracking</Text>
          </View>
          <Switch
            value={tracking}
            onValueChange={onToggleTracking}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Location tracking"
          />
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Offline queue</Text>
          <Button title="Sync now" onPress={sync.flushNow} loading={sync.syncing} fullWidth={false} variant="secondary" />
        </View>
        {sync.items.length === 0 ? (
          <EmptyState icon="cloud-done-outline" tone="success" title="Nothing pending" />
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {sync.items.map((item) => (
              <View key={item.id} style={styles.queueRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueKind}>{item.kind}</Text>
                  <Text style={styles.subtitle}>{formatDateTime(item.createdAt)}</Text>
                  {item.lastError ? <Text style={styles.errorText}>{item.lastError}</Text> : null}
                </View>
                {item.needsAttention ? (
                  <Badge label="Needs attention" tone="danger" dot />
                ) : item.lastError ? (
                  <Badge label="Retrying" tone="warning" dot />
                ) : (
                  <Badge label="Pending" dot />
                )}
                {item.needsAttention || item.lastError ? (
                  <Button
                    title="Retry"
                    onPress={() => retryItem(item.id)}
                    fullWidth={false}
                    variant="ghost"
                    accessibilityLabel={`Retry ${item.kind} from ${formatDateTime(item.createdAt)}`}
                  />
                ) : null}
                <Button
                  title="Remove"
                  onPress={() =>
                    Alert.alert('Remove from sync queue?', 'This record has not synced yet and will be discarded permanently.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
                    ])
                  }
                  fullWidth={false}
                  variant="ghost"
                  accessibilityLabel={`Remove ${item.kind} from sync queue`}
                />
              </View>
            ))}
          </View>
        )}
        {notes.length > 0 && (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {notes.map((note) => (
              <View key={note.id} style={styles.noteRow}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.noteText}>{note.message}</Text>
                <Button title="Dismiss" onPress={() => dismissSyncNote(note.id)} fullWidth={false} variant="ghost" />
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button
        title="Log out"
        onPress={() =>
          Alert.alert('Log out?', 'Location sharing will stop and any unsynced items will remain queued until you log back in.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: logout },
          ])
        }
        variant="danger"
        icon={<Ionicons name="log-out-outline" size={20} color={colors.onPrimary} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xxs },
  trackingLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  queueKind: { fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningTint,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  noteText: { flex: 1, color: colors.text, fontSize: fontSize.sm },
});
