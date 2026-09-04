import React from 'react';
import { Text, View } from 'react-native';
import { Avatar, Card, Pill, Row, Screen, Section, StatTile } from '../components/ui';
import { Donut, HBars } from '../components/charts';
import { colors, spacing, type } from '../theme';
import { compact, money } from '../format';
import { kpis, receivables } from '../data/metrics';
import { bank } from '../data/demo';
import { useRefresh } from '../components/useRefresh';

const BUCKETS = ['0–30 days', '31–60 days', '61–90 days', '90+ days'];
const TONES = ['#15803D', '#B45309', '#C2410C', '#B91C1C'];

export function ReceivablesScreen() {
  const { refreshing, refresh, updatedAt } = useRefresh();
  const k = kpis('mtd');
  const modes = Object.entries(k.byMode).map(([label, value]) => ({ label, value }));
  return (
    <Screen title="Receivables" subtitle={`Updated ${updatedAt}`} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile label="Total outstanding" value={compact(receivables.total)} sub={`${receivables.count} customers`} icon="wallet-outline" />
        <StatTile label="Overdue (31+ days)" value={compact(receivables.overdue)} sub={`${Math.round((receivables.overdue / receivables.total) * 100)}% of outstanding`} icon="alert-circle-outline" tone="danger" />
        <StatTile label="DSO" value={`${Math.round(receivables.dso)} d`} sub="days sales outstanding" icon="hourglass-outline" tone="warning" />
        <StatTile label="Collected MTD" value={compact(k.cur.collected)} sub={`${compact(bank.chequesValue)} in cheques`} icon="cash-outline" tone="success" />
      </View>

      <Section title="Ageing">
        <Card>
          <HBars data={receivables.buckets.map((v, i) => ({ label: BUCKETS[i], value: v }))} tones={TONES} />
          <Text style={[type.tiny, { marginTop: 10 }]}>Colour darkens with age; amounts over 60 days deserve a call from the office.</Text>
        </Card>
      </Section>

      <Section title="Collections by mode · this month">
        <Card>
          <Donut data={modes} center={{ value: compact(k.cur.collected), label: 'collected' }} />
        </Card>
      </Section>

      <Section title={`Top debtors · ${compact(receivables.top.reduce((s, c) => s + c.outstanding, 0))}`}>
        <Card style={{ padding: 0 }}>
          {receivables.top.map((c, i) => (
            <Row
              key={c.id}
              leading={<Avatar name={c.name} size={38} />}
              title={c.name}
              subtitle={`${c.city} · limit ${compact(c.creditLimit)}${c.buckets[3] ? ` · ${compact(c.buckets[3])} over 90 d` : c.buckets[2] ? ` · ${compact(c.buckets[2])} over 60 d` : ''}`}
              right={
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={type.h3}>{money(c.outstanding)}</Text>
                  {c.status === 'Blocked' ? <Pill text="Blocked" tone="danger" /> : c.status === 'OnHold' ? <Pill text="On hold" tone="warning" /> : c.outstanding > c.creditLimit ? <Pill text="Over limit" tone="warning" /> : null}
                </View>
              }
              last={i === receivables.top.length - 1}
            />
          ))}
        </Card>
      </Section>

      <Section title={`At risk (${receivables.risky.length})`}>
        <Card style={{ padding: 0 }}>
          {receivables.risky.slice(0, 6).map((c, i) => (
            <Row key={c.id} title={c.name} subtitle={`${c.status === 'Blocked' ? 'Blocked' : c.status === 'OnHold' ? 'On hold' : 'Has 90+ day dues'} · agent ${c.agentId.toUpperCase()}`} right={<Text style={[type.h3, { color: colors.danger }]}>{money(c.outstanding)}</Text>} last={i === Math.min(6, receivables.risky.length) - 1} />
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
