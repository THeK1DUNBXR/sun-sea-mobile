import React from 'react';
import { Text, View } from 'react-native';
import { Card, KV, Pill, Row, Screen, Section, StatTile } from '../components/ui';
import { Donut, HBars, Progress } from '../components/charts';
import { colors, spacing, type } from '../theme';
import { compact } from '../format';
import { dispatches, expenses, production, products, purchases, rawMaterials } from '../data/demo';
import { useRefresh } from '../components/useRefresh';

export function OperationsScreen() {
  const { refreshing, refresh, updatedAt } = useRefresh();
  const lowFg = products.filter((p) => p.stock < p.minStock).sort((a, b) => a.stock / a.minStock - b.stock / b.minStock);
  const lowRm = rawMaterials.filter((r) => r.onHand < r.reorder);
  return (
    <Screen title="Operations" subtitle={`Updated ${updatedAt}`} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile label="Produced today" value={`${Math.round((production.produced / production.planned) * 100)}%`} sub={`${production.produced.toLocaleString('en-IN')} of ${production.planned.toLocaleString('en-IN')} ${production.uom}`} icon="construct-outline" />
        <StatTile label="Dispatched today" value={String(dispatches.todayDispatched)} sub={`${dispatches.pendingGate} waiting at gate`} icon="car-outline" tone={dispatches.pendingGate > 2 ? 'warning' : 'info'} />
        <StatTile label="Low stock items" value={String(lowFg.length + lowRm.length)} sub={`${lowFg.length} finished · ${lowRm.length} raw`} icon="cube-outline" tone={lowFg.length ? 'danger' : 'success'} />
        <StatTile label="Open purchases" value={compact(purchases.openValue)} sub={`${purchases.openPOs} POs · ${purchases.overdueDeliveries} overdue`} icon="document-text-outline" tone="accent" />
      </View>

      <Section title="Production plan · today">
        <Card>
          {production.lines.map((l, i) => (
            <View key={l.product} style={{ marginBottom: i < production.lines.length - 1 ? spacing.md : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={type.h3}>{l.product}</Text>
                <Pill text={l.status === 'COMPLETED' ? 'Done' : l.status === 'DELAYED' ? 'Delayed' : 'Running'} tone={l.status === 'COMPLETED' ? 'success' : l.status === 'DELAYED' ? 'danger' : 'info'} icon={l.status === 'COMPLETED' ? 'checkmark' : l.status === 'DELAYED' ? 'alert' : 'play'} />
              </View>
              <Progress value={l.done} target={l.target} color={l.status === 'DELAYED' ? colors.danger : '#0F766E'} />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Finished goods below minimum">
        <Card style={{ padding: 0 }}>
          {lowFg.map((p, i) => (
            <Row key={p.name} title={p.name} subtitle={`${p.stock} ${p.uom} on hand · minimum ${p.minStock} · ${p.mtdQty.toLocaleString('en-IN')} sold MTD`} right={<Pill text={p.stock === 0 ? 'Out' : `${Math.round((p.stock / p.minStock) * 100)}%`} tone={p.stock === 0 ? 'danger' : 'warning'} />} last={i === lowFg.length - 1} />
          ))}
        </Card>
      </Section>

      <Section title="Raw materials">
        <Card>
          {rawMaterials.map((r) => (
            <KV key={r.name} label={r.name} value={`${r.onHand.toLocaleString('en-IN')} ${r.uom} · reorder at ${r.reorder.toLocaleString('en-IN')}`} tone={r.onHand < r.reorder ? 'danger' : undefined} />
          ))}
        </Card>
      </Section>

      <Section title="Dispatch queue">
        <Card style={{ padding: 0 }}>
          {dispatches.list.map((d, i) => (
            <Row key={d.no} title={`${d.no} · ${d.vehicle}`} subtitle={`${d.items} order lines · waiting ${d.since}`} right={<Pill text={d.status === 'PENDING_GATE_APPROVAL' ? 'Gate approval' : 'Store receipt'} tone={d.status === 'PENDING_GATE_APPROVAL' ? 'warning' : 'info'} />} last={i === dispatches.list.length - 1} />
          ))}
        </Card>
      </Section>

      <Section title="Open purchase orders">
        <Card style={{ padding: 0 }}>
          {purchases.list.map((p, i) => (
            <Row key={p.po} title={`${p.po} · ${p.supplier}`} subtitle={`${compact(p.value)} · ${p.status.replace(/_/g, ' ').toLowerCase()}`} right={<Pill text={p.due} tone={p.due.startsWith('Overdue') ? 'danger' : 'muted'} />} last={i === purchases.list.length - 1} />
          ))}
        </Card>
      </Section>

      <Section title={`Expenses · ${compact(expenses.mtd)} of ${compact(expenses.budget)} budget`}>
        <Card>
          <Progress value={expenses.mtd} target={expenses.budget} color={expenses.mtd / expenses.budget > 0.85 ? colors.warning : '#0F766E'} />
          <View style={{ height: spacing.md }} />
          <Donut data={expenses.byCategory} center={{ value: compact(expenses.mtd), label: 'MTD' }} />
        </Card>
      </Section>

      <Section title="Top products by volume">
        <Card>
          <HBars data={[...products].sort((a, b) => b.mtdQty - a.mtdQty).slice(0, 5).map((p) => ({ label: p.name, value: p.mtdQty, sub: p.uom }))} format={(n) => n.toLocaleString('en-IN')} />
        </Card>
      </Section>
    </Screen>
  );
}
