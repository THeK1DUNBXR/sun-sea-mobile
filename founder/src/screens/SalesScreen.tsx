import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, KV, Pill, Screen, Section, Segmented, StatTile } from '../components/ui';
import { Bars, Donut, HBars } from '../components/charts';
import { series, spacing, type } from '../theme';
import { compact, delta, fmtDate, money } from '../format';
import { customers, orderFunnel, products } from '../data/demo';
import { kpis, periodRows, type Period } from '../data/metrics';
import { useRefresh } from '../components/useRefresh';

export function SalesScreen() {
  const [period, setPeriod] = useState<Period>('mtd');
  const { refreshing, refresh, updatedAt } = useRefresh();
  const k = kpis(period);
  const { rows } = periodRows(period);
  const byCategory = Object.entries(products.reduce<Record<string, number>>((m, p) => ({ ...m, [p.category]: (m[p.category] ?? 0) + p.mtdValue }), {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const topProducts = [...products].sort((a, b) => b.mtdValue - a.mtdValue).slice(0, 6);
  const topCustomers = [...customers].filter((c) => c.status !== 'Lead').sort((a, b) => b.mtdSales - a.mtdSales).slice(0, 6);
  const avgOrder = k.cur.orders ? k.cur.orderValue / k.cur.orders : 0;

  return (
    <Screen title="Sales" subtitle={`Updated ${updatedAt}`} onRefresh={refresh} refreshing={refreshing}>
      <Segmented value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'mtd', label: 'This month' }, { value: '30d', label: 'Last 30 days' }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
        <StatTile label="Invoiced" value={compact(k.cur.invoiced)} delta={delta(k.cur.invoiced, k.before.invoiced)} icon="receipt-outline" />
        <StatTile label="Orders" value={String(k.cur.orders)} delta={delta(k.cur.orders, k.before.orders)} icon="cart-outline" tone="info" />
        <StatTile label="Avg order value" value={compact(avgOrder)} sub="orders booked" icon="pricetag-outline" tone="accent" />
        <StatTile label="Order value" value={compact(k.cur.orderValue)} delta={delta(k.cur.orderValue, k.before.orderValue)} icon="trending-up-outline" tone="success" />
      </View>

      {rows.length > 1 ? (
        <Section title="Invoiced per day">
          <Card>
            <Bars data={rows.slice(-30).map((d) => ({ label: fmtDate(d.date).slice(0, 2), value: d.invoiced }))} height={150} labelEvery={rows.length > 14 ? 5 : 2} />
          </Card>
        </Section>
      ) : null}

      <Section title="Order pipeline">
        <Card>
          {orderFunnel.map((f, i) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < orderFunnel.length - 1 ? 1 : 0, borderBottomColor: '#EEF2F7' }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: series[Math.min(i, series.length - 1)], marginRight: 10 }} />
              <Text style={[type.small, { color: '#0F172A', flex: 1 }]}>{f.label}</Text>
              <Text style={[type.h3, { width: 40, textAlign: 'right' }]}>{f.value}</Text>
              <Text style={[type.small, { width: 76, textAlign: 'right' }]}>{compact(f.amount)}</Text>
            </View>
          ))}
          <Text style={[type.tiny, { marginTop: 8 }]}>Approvals and confirmations are done in the ERP web app.</Text>
        </Card>
      </Section>

      <Section title="Sales by category · this month">
        <Card>
          <Donut data={byCategory} center={{ value: compact(byCategory.reduce((s, c) => s + c.value, 0)), label: 'MTD' }} />
        </Card>
      </Section>

      <Section title="Top products · this month">
        <Card>
          <HBars data={topProducts.map((p) => ({ label: p.name, value: p.mtdValue, sub: `${p.mtdQty.toLocaleString('en-IN')} ${p.uom}` }))} />
        </Card>
      </Section>

      <Section title="Top customers · this month">
        <Card>
          <HBars data={topCustomers.map((c) => ({ label: c.name, value: c.mtdSales, sub: c.city }))} color={series[1]} />
        </Card>
      </Section>

      <Section title="Dormant customers">
        <Card>
          {customers.filter((c) => c.status === 'Active' && c.lastOrderDays >= 30).slice(0, 5).map((c) => (
            <KV key={c.id} label={c.name} value={`${c.lastOrderDays} days since order`} tone="warning" />
          ))}
          <Text style={type.tiny}>Active customers with no order in 30+ days — worth a visit from the agent.</Text>
        </Card>
      </Section>
      <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Pill text={`Collections by mode: Cash ${money(k.byMode.Cash)} · UPI ${money(k.byMode.UPI)}`} tone="muted" />
      </View>
    </Screen>
  );
}
