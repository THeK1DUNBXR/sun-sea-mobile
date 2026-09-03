import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card, IconTile, Pill, Section, type IconName } from '../components/ui';
import { ProgressRing } from '../components/ProgressRing';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../sync/SyncContext';
import { tables } from '../db';
import { useCount, useQuery } from '../db/hooks';
import { colors, radius, shadow, spacing, type } from '../theme';
import { fmtDate, fmtPlannedTime, money, relativeTime, todayYmd } from '../utils/format';
import { currentPeriod, monthProgress, monthStartMs, monthStartYmd, startOfDayMs } from '../utils/period';
import type { RootStackParamList } from '../navigation/types';
import { openMaps } from './RoutePlanScreen';
import { tap } from '../utils/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const { agent } = useAuth();
  const { lastSyncAt } = useSync();
  const today = todayYmd();
  const dayStart = startOfDayMs(today);
  const mStart = monthStartMs();
  const period = currentPeriod();

  const session = useQuery(() => tables.daySessions().query(Q.where('date', today)), [today])[0];
  const visits = useQuery(() => tables.visits().query(Q.where('planned_date', today), Q.sortBy('sequence', Q.asc)), [today]);
  const todaysCollections = useQuery(() => tables.collections().query(Q.where('collected_at', Q.gte(dayStart)), Q.where('status', Q.notEq('FAILED'))), [dayStart]);
  const monthCollections = useQuery(() => tables.collections().query(Q.where('collected_at', Q.gte(mStart)), Q.where('status', Q.notEq('FAILED'))), [mStart]);
  const monthOrders = useQuery(() => tables.orders().query(Q.where('order_date', Q.gte(monthStartYmd())), Q.where('status', Q.notEq('FAILED'))), [period]);
  const ordersToday = useCount(() => tables.orders().query(Q.where('order_date', today), Q.where('status', Q.notEq('FAILED'))), [today]);
  const target = useQuery(() => tables.targets().query(Q.where('period', period)), [period])[0];
  const dueFollowUps = useQuery(() => tables.followUps().query(Q.where('status', 'OPEN'), Q.where('due_at', Q.lte(dayStart + 86400000 - 1)), Q.sortBy('due_at', Q.asc), Q.take(3)), [dayStart]);
  const customers = useQuery(() => tables.customers().query(), []);
  const byId = new Map(customers.map((c) => [c.id, c]));

  const planned = visits.filter((v) => v.status !== 'SKIPPED');
  const completed = visits.filter((v) => v.status === 'COMPLETED');
  const next = visits.find((v) => v.status === 'IN_PROGRESS') ?? visits.find((v) => v.status === 'PLANNED');
  const nextCustomer = next ? byId.get(next.customerId) : undefined;
  const collectedToday = todaysCollections.reduce((s, c) => s + c.amount, 0);
  const collectedMtd = monthCollections.reduce((s, c) => s + c.amount, 0);
  const salesMtd = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const pace = monthProgress();

  const firstName = agent?.fullName?.split(' ')[0] ?? 'Agent';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const actions: { label: string; icon: IconName; tone: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; onPress: () => void }[] = [
    { label: 'Collection', icon: 'cash-outline', tone: 'success', onPress: () => nav.navigate('Main', { screen: 'Customers' } as never) },
    { label: 'New Order', icon: 'cart-outline', tone: 'primary', onPress: () => nav.navigate('Main', { screen: 'Customers' } as never) },
    { label: 'New Outlet', icon: 'storefront-outline', tone: 'accent', onPress: () => nav.navigate('LeadNew') },
    { label: 'Expense', icon: 'receipt-outline', tone: 'warning', onPress: () => nav.navigate('ExpenseNew') },
    { label: 'Cheques', icon: 'document-text-outline', tone: 'info', onPress: () => nav.navigate('Cheques') },
    { label: 'Cash & Day', icon: 'wallet-outline', tone: 'danger', onPress: () => nav.navigate('Day') },
  ];

  return (
    <Screen
      title="Home"
      refreshable
      right={
        <Pressable onPress={() => nav.navigate('Settings')} hitSlop={8} style={{ padding: 4 }}>
          <Avatar name={agent?.fullName ?? 'A'} size={36} />
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={type.small}>{greeting},</Text>
          <Text style={type.h1}>{firstName}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>{fmtDate(new Date())}</Text>
        </View>
        <Pressable
          onPress={() => nav.navigate('Day')}
          style={[styles.dayPill, { backgroundColor: session?.status === 'OPEN' ? colors.successSoft : session?.status === 'CLOSED' ? colors.line : colors.warningSoft }]}
        >
          <Ionicons name={session?.status === 'OPEN' ? 'sunny' : session?.status === 'CLOSED' ? 'moon' : 'play'} size={16} color={session?.status === 'OPEN' ? colors.success : session?.status === 'CLOSED' ? colors.muted : colors.warning} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: session?.status === 'OPEN' ? colors.success : session?.status === 'CLOSED' ? colors.muted : colors.warning }}>
            {session?.status === 'OPEN' ? 'Day started' : session?.status === 'CLOSED' ? 'Day closed' : 'Start day'}
          </Text>
        </Pressable>
      </View>

      {/* Targets */}
      <Card style={[{ marginTop: spacing.lg }, shadow.card]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={type.label}>This month · {fmtDate(new Date()).split(' ').slice(1).join(' ')}</Text>
          <Pressable onPress={() => nav.navigate('Performance')}>
            <Text style={[type.small, { color: colors.primary, fontWeight: '700' }]}>Performance ›</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md }}>
          <ProgressRing progress={target?.collectionTarget ? collectedMtd / target.collectionTarget : 0} color={colors.success} label="Collections" sublabel={target?.collectionTarget ? `${money(collectedMtd)} of ${money(target.collectionTarget)}` : money(collectedMtd)} />
          <ProgressRing progress={target?.salesTarget ? salesMtd / target.salesTarget : 0} color={colors.primary} label="Sales" sublabel={target?.salesTarget ? `${money(salesMtd)} of ${money(target.salesTarget)}` : money(salesMtd)} />
          <ProgressRing progress={planned.length ? completed.length / planned.length : 0} color={colors.accent} label="Visits today" center={<Text style={type.h3}>{completed.length}/{planned.length}</Text>} sublabel={target?.visitsTarget ? `Target ${target.visitsTarget}/month` : undefined} />
        </View>
        {target?.collectionTarget ? (
          <Text style={[type.tiny, { marginTop: spacing.md, textAlign: 'center' }]}>
            {collectedMtd / target.collectionTarget >= pace ? 'Ahead of pace for the month' : `Behind pace — ${money(Math.max(0, target.collectionTarget * pace - collectedMtd))} to catch up`}
          </Text>
        ) : null}
      </Card>

      {/* Today */}
      <View style={styles.grid}>
        <StatTile icon="cash-outline" tone="success" label="Collected today" value={money(collectedToday)} sub={`${todaysCollections.length} receipt${todaysCollections.length === 1 ? '' : 's'}`} />
        <StatTile icon="cart-outline" tone="primary" label="Orders today" value={String(ordersToday).padStart(2, '0')} sub={`${planned.length - completed.length} visits left`} />
      </View>

      {/* Next visit */}
      {next && nextCustomer ? (
        <Card style={[{ marginTop: spacing.md }, shadow.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={type.label}>{next.status === 'IN_PROGRESS' ? 'Current visit' : 'Next visit'}</Text>
            {next.plannedTime ? <Pill text={fmtPlannedTime(next.plannedTime)} tone="info" icon="time-outline" /> : null}
          </View>
          <Pressable onPress={() => nav.navigate('CustomerDetail', { customerId: nextCustomer.id, visitId: next.id })} style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <Avatar name={nextCustomer.name} size={44} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={type.h3}>{nextCustomer.name}</Text>
              <Text style={type.small} numberOfLines={1}>
                {nextCustomer.fullAddress}
              </Text>
              <Text style={[type.small, { marginTop: 2 }]}>
                Outstanding <Text style={{ fontWeight: '700', color: colors.text }}>{money(nextCustomer.outstanding)}</Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <SmallAction icon="navigate-outline" label="Navigate" onPress={() => openMaps(nextCustomer)} />
            <SmallAction icon="cash-outline" label="Collect" onPress={() => nav.navigate('CollectionEntry', { customerId: nextCustomer.id, visitId: next.id, selectAll: true })} />
            <SmallAction icon="cart-outline" label="Order" onPress={() => nav.navigate('NewOrder', { customerId: nextCustomer.id, visitId: next.id })} />
          </View>
        </Card>
      ) : planned.length === 0 ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={type.h3}>No visits planned today</Text>
          <Text style={type.small}>Open Customers to start an unplanned visit, or check tomorrow's route.</Text>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile icon="checkmark-done" tone="success" />
          <View>
            <Text style={type.h3}>Route complete</Text>
            <Text style={type.small}>All {planned.length} visits done. Close your day when ready.</Text>
          </View>
        </Card>
      )}

      {/* Follow-ups due */}
      <Section
        title={`Follow-ups due (${dueFollowUps.length})`}
        right={
          <Pressable onPress={() => nav.navigate('Main', { screen: 'FollowUps' } as never)}>
            <Text style={[type.small, { color: colors.primary, fontWeight: '700' }]}>See all</Text>
          </Pressable>
        }
      >
        {dueFollowUps.length === 0 ? (
          <Card>
            <Text style={type.small}>Nothing due. Promises to pay and callbacks you log appear here on their day.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {dueFollowUps.map((f, i) => {
              const c = byId.get(f.customerId);
              return (
                <Pressable key={f.id} onPress={() => nav.navigate('CustomerDetail', { customerId: f.customerId, tab: 'activity' })} style={[styles.fuRow, i < dueFollowUps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                  <IconTile icon={f.type === 'PTP' ? 'cash-outline' : f.type === 'DISPUTE' ? 'alert-circle-outline' : 'call-outline'} tone={f.isOverdue ? 'danger' : 'warning'} size={38} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={type.h3}>{c?.name ?? 'Customer'}</Text>
                    <Text style={type.small}>{f.type === 'PTP' ? `Promised ${money(f.promisedAmount ?? 0)}` : f.type === 'DISPUTE' ? 'Dispute to resolve' : 'Call back'}{f.isOverdue ? ' · overdue' : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
              );
            })}
          </Card>
        )}
      </Section>

      <Section title="Quick actions">
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                void tap();
                a.onPress();
              }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <IconTile icon={a.icon} tone={a.tone} size={42} />
              <Text style={[type.small, { marginTop: 8, color: colors.text, fontWeight: '600', textAlign: 'center' }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Text style={[type.tiny, { textAlign: 'center', marginTop: spacing.xl }]}>Last sync {relativeTime(lastSyncAt)} · pull down to sync</Text>
    </Screen>
  );
}

function StatTile({ icon, tone, label, value, sub }: { icon: IconName; tone: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; label: string; value: string; sub?: string }) {
  return (
    <Card style={[{ flex: 1 }, shadow.card]}>
      <IconTile icon={icon} tone={tone} size={36} />
      <Text style={[type.small, { marginTop: spacing.sm }]}>{label}</Text>
      <Text style={[type.money, { fontSize: 22 }]}>{value}</Text>
      {sub ? <Text style={type.tiny}>{sub}</Text> : null}
    </Card>
  );
}

function SmallAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallAction, pressed && { backgroundColor: colors.primarySoft }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 40, borderRadius: radius.pill },
  grid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: { width: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing.md, alignItems: 'center', minHeight: 96 },
  smallAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primarySoft, backgroundColor: colors.card },
  fuRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, minHeight: 60 },
});
