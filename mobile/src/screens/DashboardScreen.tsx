import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card, Stat } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../sync/SyncContext';
import { tables } from '../db';
import { useCount, useQuery } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { fmtDate, money, relativeTime, todayYmd } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const { agent } = useAuth();
  const { lastSyncAt, online, pending } = useSync();
  const today = todayYmd();
  const startOfDay = new Date(`${today}T00:00:00`).getTime();

  const planned = useCount(() => tables.visits().query(Q.where('planned_date', today), Q.where('status', Q.notEq('SKIPPED'))), [today]);
  const completed = useCount(() => tables.visits().query(Q.where('planned_date', today), Q.where('status', 'COMPLETED')), [today]);
  const todaysCollections = useQuery(() => tables.collections().query(Q.where('collected_at', Q.gte(startOfDay)), Q.where('status', Q.notEq('FAILED'))), [startOfDay]);
  const ordersToday = useCount(() => tables.orders().query(Q.where('order_date', today)), [today]);
  const collectedToday = todaysCollections.reduce((s, c) => s + c.amount, 0);

  const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { label: 'Route Plan', icon: 'map-outline', onPress: () => nav.navigate('Main', { screen: 'Route' } as never) },
    { label: 'New Order', icon: 'cart-outline', onPress: () => nav.navigate('Main', { screen: 'Customers' } as never) },
    { label: 'Collection', icon: 'cash-outline', onPress: () => nav.navigate('Main', { screen: 'Customers' } as never) },
    { label: 'Sync', icon: 'cloud-upload-outline', onPress: () => nav.navigate('Main', { screen: 'Sync' } as never) },
  ];

  return (
    <Screen
      title="Dashboard"
      right={
        <Pressable onPress={() => nav.navigate('Settings')} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      }
    >
      <Text style={type.h2}>Hello, {agent?.fullName?.split(' ')[0] ?? 'Agent'}</Text>
      <Text style={type.small}>Today, {fmtDate(new Date())}</Text>

      <View style={styles.grid}>
        <Stat label="Planned Visits" value={String(planned).padStart(2, '0')} />
        <Stat label="Visits Completed" value={String(completed).padStart(2, '0')} tone="success" />
      </View>
      <View style={styles.grid}>
        <Stat label="Collections (Today)" value={money(collectedToday)} />
        <Stat label="New Orders (Today)" value={String(ordersToday).padStart(2, '0')} />
      </View>

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Quick Actions</Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={a.icon} size={26} color={colors.primary} />
            <Text style={[type.small, { marginTop: 6, color: colors.text, fontWeight: '600' }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <Text style={type.small}>Last Sync: {relativeTime(lastSyncAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.success : colors.danger }} />
          <Text style={[type.small, { color: online ? colors.success : colors.danger, fontWeight: '600' }]}>{online ? 'Online' : 'Offline'}</Text>
          {pending.total > 0 ? <Text style={type.tiny}> · {pending.total} pending</Text> : null}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: { width: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing.lg, alignItems: 'center' },
});
