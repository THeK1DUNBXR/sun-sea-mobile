import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Badge, Button, EmptyState, Pill } from '../components/ui';
import { Segmented } from '../components/Chips';
import { Avatar } from '../components/Avatar';
import { tables, Customer, Visit, Invoice } from '../db';
import { useQuery } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { addDays, fmtDate, fmtPlannedTime, fmtTime, money, todayYmd } from '../utils/format';
import { creditStatus } from '../utils/credit';
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
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const visits = useQuery(() => tables.visits().query(Q.where('planned_date', date), Q.sortBy('sequence', Q.asc), Q.sortBy('planned_time', Q.asc)), [date]);
  const customers = useQuery(() => tables.customers().query(), []);
  const invoices = useQuery(() => tables.invoices().query(Q.where('balance', Q.gt(0))), []);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const invByCustomer = useMemo(() => {
    const m = new Map<string, Invoice[]>();
    invoices.forEach((i) => m.set(i.customerId, [...(m.get(i.customerId) ?? []), i]));
    return m;
  }, [invoices]);

  const active = visits.filter((v) => v.status !== 'SKIPPED');
  const done = active.filter((v) => v.status === 'COMPLETED');
  const shown = filter === 'pending' ? visits.filter((v) => v.status === 'PLANNED' || v.status === 'IN_PROGRESS') : visits;
  const next = visits.find((v) => v.status === 'IN_PROGRESS') ?? visits.find((v) => v.status === 'PLANNED');
  const expected = active.reduce((s, v) => s + (byId.get(v.customerId)?.outstanding ?? 0), 0);

  return (
    <Screen
      title="Route"
      subtitle={date === todayYmd() ? 'Today' : fmtDate(date)}
      refreshable
      footer={
        next ? (
          <Button
            title="Start Navigation to next stop"
            icon="navigate-outline"
            onPress={() => {
              const c = byId.get(next.customerId);
              if (c) openMaps(c);
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.dateBar}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={10} style={styles.dateBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setDate(todayYmd())} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={type.h3}>{date === todayYmd() ? `Today, ${fmtDate(date)}` : fmtDate(date)}</Text>
          <Text style={type.tiny}>
            {done.length}/{active.length} done · {money(expected)} outstanding on route
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={10} style={styles.dateBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {active.length > 0 ? (
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${Math.round((done.length / active.length) * 100)}%` }]} />
        </View>
      ) : null}

      <View style={{ marginVertical: spacing.md }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: `Pending (${active.length - done.length})` },
            { value: 'all', label: `All (${visits.length})` },
          ]}
        />
      </View>

      {shown.length === 0 ? (
        <EmptyState icon={visits.length ? 'checkmark-done-circle-outline' : 'map-outline'} title={visits.length ? 'All visits done' : 'No visits planned'} hint={visits.length ? 'Great work. Log any follow-ups and close your day from Cash & Day.' : 'Visits come from the route assigned to you by the office. You can still open any customer from the Customers tab.'} />
      ) : (
        shown.map((v, idx) => (
          <VisitRow key={v.id} visit={v} customer={byId.get(v.customerId)} openInvoices={invByCustomer.get(v.customerId) ?? []} isLast={idx === shown.length - 1} isNext={next?.id === v.id} onOpen={() => nav.navigate('CustomerDetail', { customerId: v.customerId, visitId: v.id })} />
        ))
      )}
    </Screen>
  );
}

function VisitRow({ visit, customer, openInvoices, isLast, isNext, onOpen }: { visit: Visit; customer?: Customer; openInvoices: Invoice[]; isLast: boolean; isNext: boolean; onOpen: () => void }) {
  const done = visit.status === 'COMPLETED';
  const credit = customer ? creditStatus({ creditLimit: customer.creditLimit, status: customer.status, invoices: openInvoices.map((i) => ({ balance: i.balance, dueDate: i.dueDate, invoiceDate: i.invoiceDate })) }) : null;
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={styles.timeline}>
        <Text style={[type.tiny, { width: 58, fontWeight: '600' }]}>{visit.plannedTime ? fmtPlannedTime(visit.plannedTime) : visit.checkInAt ? fmtTime(visit.checkInAt) : `#${visit.sequence}`}</Text>
        <View style={{ alignItems: 'center', width: 18 }}>
          <View style={[styles.dot, done && { backgroundColor: colors.success, borderColor: colors.success }, visit.status === 'IN_PROGRESS' && { borderColor: colors.info, backgroundColor: colors.infoSoft }, isNext && !done && { borderColor: colors.primary }]} />
          {!isLast ? <View style={styles.line} /> : null}
        </View>
      </View>
      <View style={[styles.card, isNext && !done && { borderColor: colors.primary, borderWidth: 1.5 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={customer?.name ?? 'C'} size={40} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={type.h3} numberOfLines={1}>
              {customer?.name ?? 'Customer'}
            </Text>
            <Text style={type.small} numberOfLines={1}>
              {customer?.fullAddress || customer?.customerCode || ''}
            </Text>
          </View>
          <Badge text={STATUS_LABEL[visit.status]} tone={STATUS_TONE[visit.status]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
          {customer ? <Pill text={`Due ${money(customer.outstanding)}`} tone={customer.outstanding > 0 ? 'muted' : 'success'} /> : null}
          {credit?.hasOverdue ? <Pill text={`${money(credit.overdueAmount)} overdue · ${credit.oldestOverdueDays}d`} tone="danger" icon="alert-circle" /> : null}
          {credit?.blocked ? <Pill text="Blocked" tone="danger" /> : credit?.onHold ? <Pill text="On hold" tone="warning" /> : null}
          {visit.outcome && visit.outcome !== 'NO_ACTION' ? <Pill text={visit.outcome === 'BOTH' ? 'Collected + ordered' : visit.outcome === 'COLLECTION' ? 'Collected' : 'Ordered'} tone="success" icon="checkmark" /> : null}
          {visit.status === 'PLANNED' ? (
            <Pressable
              onPress={() =>
                Alert.alert('Skip visit', `Skip ${customer?.name ?? 'this customer'} for today?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Skip', style: 'destructive', onPress: () => void skipVisit(visit, 'Skipped by agent') },
                ])
              }
              hitSlop={8}
              style={{ marginLeft: 'auto', minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={[type.small, { color: colors.warning, fontWeight: '700' }]}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing.sm },
  dateBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.success, borderRadius: 3 },
  row: { flexDirection: 'row', paddingTop: spacing.sm },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.faint, backgroundColor: colors.card },
  line: { width: 2, flex: 1, minHeight: 64, backgroundColor: colors.line, marginTop: 2 },
  card: { flex: 1, marginLeft: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
});
