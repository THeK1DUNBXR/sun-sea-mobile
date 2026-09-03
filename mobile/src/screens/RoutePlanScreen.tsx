import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Badge, Button, EmptyState } from '../components/ui';
import { tables, Customer, Visit } from '../db';
import { useQuery } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { addDays, fmtDate, fmtPlannedTime, fmtTime, todayYmd } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';
import { skipVisit } from '../data/actions';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_TONE = { PLANNED: 'muted', IN_PROGRESS: 'info', COMPLETED: 'success', SKIPPED: 'warning' } as const;
const STATUS_LABEL = { PLANNED: 'Pending', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', SKIPPED: 'Skipped' } as const;

export function openMaps(customer: Customer) {
  const q = encodeURIComponent(customer.fullAddress || customer.firmName);
  const url = Platform.select({ ios: `maps:0,0?q=${q}`, android: `geo:0,0?q=${q}`, default: `https://maps.google.com/?q=${q}` });
  Linking.openURL(url as string).catch(() => Alert.alert('Navigation', 'No maps app available on this device.'));
}

export function RoutePlanScreen() {
  const nav = useNavigation<Nav>();
  const [date, setDate] = useState(todayYmd());
  const visits = useQuery(() => tables.visits().query(Q.where('planned_date', date), Q.sortBy('sequence', Q.asc), Q.sortBy('planned_time', Q.asc)), [date]);
  const customers = useQuery(() => tables.customers().query(), []);
  const byId = new Map(customers.map((c) => [c.id, c]));

  const next = visits.find((v) => v.status === 'PLANNED' || v.status === 'IN_PROGRESS');

  const startNavigation = () => {
    const c = next ? byId.get(next.customerId) : undefined;
    if (!c) return Alert.alert('Route', 'No pending visit to navigate to.');
    openMaps(c);
  };

  return (
    <Screen
      title="Route Plan"
      scroll={false}
      padded={false}
      footer={visits.length ? <Button title="Start Navigation" icon="navigate-outline" onPress={startNavigation} disabled={!next} /> : undefined}
    >
      <View style={styles.dateBar}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setDate(todayYmd())}>
          <Text style={type.h3}>{date === todayYmd() ? `Today, ${fmtDate(date)}` : fmtDate(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {visits.length === 0 ? (
        <EmptyState icon="map-outline" title="No visits planned" hint="Visits come from the route assigned to you by the office. You can still open any customer from the Customers tab." />
      ) : (
        <View style={{ flex: 1 }}>
          {visits.map((v, idx) => (
            <VisitRow key={v.id} visit={v} customer={byId.get(v.customerId)} isLast={idx === visits.length - 1} onOpen={() => nav.navigate('CustomerDetail', { customerId: v.customerId, visitId: v.id })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function VisitRow({ visit, customer, isLast, onOpen }: { visit: Visit; customer?: Customer; isLast: boolean; onOpen: () => void }) {
  const done = visit.status === 'COMPLETED';
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.timeline}>
        <Text style={[type.tiny, { width: 62 }]}>{visit.plannedTime ? fmtPlannedTime(visit.plannedTime) : visit.checkInAt ? fmtTime(visit.checkInAt) : `#${visit.sequence}`}</Text>
        <View style={{ alignItems: 'center', width: 16 }}>
          <View style={[styles.dot, done && { backgroundColor: colors.success, borderColor: colors.success }, visit.status === 'IN_PROGRESS' && { borderColor: colors.info }]} />
          {!isLast ? <View style={styles.line} /> : null}
        </View>
      </View>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>
            {customer?.name ?? 'Customer'}
          </Text>
          <Badge text={STATUS_LABEL[visit.status]} tone={STATUS_TONE[visit.status]} />
        </View>
        <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
          {customer?.fullAddress || customer?.customerCode || ''}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={type.tiny}>{customer ? `Outstanding ₹${customer.outstanding.toLocaleString('en-IN')}` : ''}</Text>
          {visit.status === 'PLANNED' ? (
            <Pressable
              onPress={() =>
                Alert.alert('Skip visit', `Skip ${customer?.name ?? 'this customer'} for today?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Skip', style: 'destructive', onPress: () => void skipVisit(visit, 'Skipped by agent') },
                ])
              }
              hitSlop={8}
            >
              <Text style={[type.tiny, { color: colors.warning, fontWeight: '600' }]}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.faint, backgroundColor: colors.card },
  line: { width: 2, flex: 1, minHeight: 56, backgroundColor: colors.line, marginTop: 2 },
  card: { flex: 1, marginLeft: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
});
