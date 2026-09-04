import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, Screen, Section, Segmented, StatTile } from '../components/ui';
import { Bars, Legend, Progress } from '../components/charts';
import { colors, series, spacing, type } from '../theme';
import { compact, delta, fmtDate, fmtDateLong, money, pct } from '../format';
import { attention, bank, production } from '../data/demo';
import { kpis, last14, monthProgress, receivables, team, type Period } from '../data/metrics';
import type { RootStackParamList } from '../navigation/types';
import { useRefresh } from '../components/useRefresh';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const SEV = { critical: 'danger', serious: 'danger', warning: 'warning', info: 'info' } as const;

export function OverviewScreen() {
  const nav = useNavigation<Nav>();
  const [period, setPeriod] = useState<Period>('mtd');
  const { refreshing, refresh, updatedAt } = useRefresh();
  const k = kpis(period);
  const hot = attention.filter((a) => a.severity === 'critical' || a.severity === 'serious');
  const hour = new Date().getHours();

  return (
    <Screen
      title="Sun Sea Insights"
      subtitle={`Updated ${updatedAt}`}
      onRefresh={refresh}
      refreshing={refreshing}
      right={
        <Pressable onPress={() => nav.navigate('Settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      }
    >
      <Text style={type.small}>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</Text>
      <Text style={type.h1}>Business at a glance</Text>
      <Text style={[type.small, { marginBottom: spacing.md }]}>{fmtDateLong(new Date())}</Text>

      <Segmented value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'mtd', label: 'This month' }, { value: '30d', label: 'Last 30 days' }]} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
        <StatTile label="Invoiced sales" value={compact(k.cur.invoiced)} delta={delta(k.cur.invoiced, k.before.invoiced)} icon="trending-up-outline" tone="primary" />
        <StatTile label="Collections" value={compact(k.cur.collected)} delta={delta(k.cur.collected, k.before.collected)} icon="cash-outline" tone="success" />
        <StatTile label="Orders booked" value={`${k.cur.orders}`} sub={`${compact(k.cur.orderValue)} value`} icon="cart-outline" tone="info" />
        <StatTile label="Receivables" value={compact(receivables.total)} sub={`${compact(receivables.overdue)} overdue · DSO ${Math.round(receivables.dso)} d`} icon="time-outline" tone={receivables.overdue / receivables.total > 0.4 ? 'danger' : 'warning'} />
      </View>

      <Section title="Sales vs collections · last 14 days" right={<Legend items={[{ label: 'Invoiced', color: series[0] }, { label: 'Collected', color: series[1] }]} />}>
        <Card>
          <Text style={[type.tiny, { marginBottom: 4 }]}>Invoiced</Text>
          <Bars data={last14.map((d) => ({ label: fmtDate(d.date).slice(0, 2), value: d.invoiced }))} height={120} color={series[0]} labelEvery={2} />
          <Text style={[type.tiny, { marginTop: spacing.sm, marginBottom: 4 }]}>Collected</Text>
          <Bars data={last14.map((d) => ({ label: fmtDate(d.date).slice(0, 2), value: d.collected }))} height={120} color={series[1]} labelEvery={2} />
        </Card>
      </Section>

      <Section title="Month so far">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={type.h3}>Field collections vs target</Text>
            <Pill text={team.collected / team.target >= monthProgress ? 'On pace' : 'Behind pace'} tone={team.collected / team.target >= monthProgress ? 'success' : 'warning'} icon={team.collected / team.target >= monthProgress ? 'checkmark' : 'alert'} />
          </View>
          <Progress value={team.collected} target={team.target} />
          <Text style={[type.tiny, { marginTop: 6 }]}>{pct(monthProgress)} of the month elapsed · {team.active} of 5 agents active today</Text>
        </Card>
      </Section>

      <Section
        title={`Needs your attention (${attention.length})`}
        right={
          <Pressable onPress={() => nav.navigate('Attention')}>
            <Text style={[type.small, { color: colors.primary, fontWeight: '700' }]}>See all</Text>
          </Pressable>
        }
      >
        <Card style={{ padding: 0 }}>
          {hot.slice(0, 4).map((a, i) => (
            <Pressable key={a.id} onPress={() => nav.navigate('Attention')} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: i < Math.min(4, hot.length) - 1 ? 1 : 0, borderBottomColor: colors.line }}>
              <Ionicons name={a.severity === 'critical' ? 'alert-circle' : 'warning'} size={22} color={a.severity === 'critical' ? colors.danger : colors.warning} />
              <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                <Text style={type.h3} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  {a.detail}
                </Text>
              </View>
              <Pill text={a.since} tone={SEV[a.severity]} />
            </Pressable>
          ))}
        </Card>
      </Section>

      <Section title="Cash position">
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text style={type.small}>Bank + cash</Text>
            <Text style={[type.money, { fontSize: 20 }]}>{compact(bank.bank + bank.cash)}</Text>
            <Text style={type.tiny}>Payables due 7 d: {compact(bank.payablesDue7d)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={type.small}>Cheques in hand</Text>
            <Text style={[type.money, { fontSize: 20 }]}>{compact(bank.chequesValue)}</Text>
            <Text style={type.tiny}>{bank.chequesInHand} cheques · {compact(bank.pdcValue)} post-dated</Text>
          </Card>
        </View>
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={type.h3}>Cash with agents</Text>
            <Text style={[type.h3, { color: team.cashInHand > 30000 ? colors.warning : colors.text }]}>{money(team.cashInHand)}</Text>
          </View>
          <Text style={type.tiny}>Collected today, not yet handed over · {team.stale.length} agent{team.stale.length === 1 ? '' : 's'} not synced in the last hour</Text>
        </Card>
      </Section>

      <Section title="Plant today">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={type.h3}>Production {production.produced.toLocaleString('en-IN')} / {production.planned.toLocaleString('en-IN')} {production.uom}</Text>
            <Pill text={`${production.machinesRunning}/${production.machinesTotal} machines`} tone="info" />
          </View>
          <Progress value={production.produced} target={production.planned} color={series[0]} />
        </Card>
      </Section>
    </Screen>
  );
}
