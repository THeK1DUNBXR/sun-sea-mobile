import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BarChart, BarRow, Board, KpiCard, Panel, PipelineTile, Pills, Sub, TileRow, mono } from '../tv/primitives';
import { inrCompact, trendColor, trendText, useTheme } from '../tv/theme';
import { customers, orderFunnel, products } from '../data/demo';
import { kpis, periodRows, type Period } from '../data/metrics';
import { fmtDate } from '../format';

export function SalesScreen() {
  const { T, A } = useTheme();
  const [period, setPeriod] = useState<Period>('mtd');
  const k = kpis(period);
  const { rows } = periodRows(period);
  const trend = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
  const byCategory = Object.entries(products.reduce<Record<string, number>>((m, p) => ({ ...m, [p.category]: (m[p.category] ?? 0) + p.mtdValue }), {})).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(...byCategory.map((c) => c[1]));
  const topProducts = [...products].sort((a, b) => b.mtdValue - a.mtdValue).slice(0, 6);
  const topCustomers = [...customers].filter((c) => c.status !== 'Lead').sort((a, b) => b.mtdSales - a.mtdSales).slice(0, 6);
  const dormant = customers.filter((c) => c.status === 'Active' && c.lastOrderDays >= 30).slice(0, 5);
  const colors = [A.blue, A.amber, A.green, A.accentBg, A.red];

  return (
    <Board scene="Sales & orders" ticker={`INVOICED ${inrCompact(k.cur.invoiced)} · ORDERS ${k.cur.orders} · AVG ORDER ${inrCompact(k.cur.orders ? k.cur.orderValue / k.cur.orders : 0)} · TOP ${topProducts[0]?.name.toUpperCase()} · ${dormant.length} DORMANT CUSTOMERS`}>
      <Pills value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'mtd', label: 'MTD' }, { value: '30d', label: '30 days' }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Sales invoiced" numeric={k.cur.invoiced} format={inrCompact} sub={`${trendText(trend(k.cur.invoiced, k.before.invoiced))} vs previous`} color={A.amber} />
        <KpiCard label="Orders booked" numeric={k.cur.orders} format={(n) => String(Math.round(n))} sub={`${inrCompact(k.cur.orderValue)} value`} trend={trendText(trend(k.cur.orders, k.before.orders))} trendColor={trendColor(trend(k.cur.orders, k.before.orders), A)} color={A.blue} />
        <KpiCard label="Avg order" numeric={k.cur.orders ? k.cur.orderValue / k.cur.orders : 0} format={inrCompact} sub="per order booked" color={A.accentBg} />
        <KpiCard label="Active orders" value={String(orderFunnel.slice(0, 5).reduce((s, f) => s + f.value, 0))} sub={`${orderFunnel[1].value} awaiting approval`} color={orderFunnel[1].value ? A.amber : A.green} />
      </View>

      <Panel title="ORDER PIPELINE">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {orderFunnel.slice(0, 5).map((f, i) => (
            <PipelineTile key={f.label} count={f.value} label={f.label.toUpperCase()} color={i === 4 ? A.green : A.blue} alert={i === 1 && f.value > 0} />
          ))}
        </View>
        <Sub>Pipeline value {inrCompact(orderFunnel.slice(0, 5).reduce((s, f) => s + f.amount, 0))} · approvals happen in the ERP web app</Sub>
      </Panel>

      {rows.length > 1 ? (
        <Panel title={period === 'mtd' ? 'INVOICED PER DAY — THIS MONTH' : 'INVOICED PER DAY — 30 DAYS'}>
          <BarChart points={rows.slice(-30).map((d) => ({ day: rows.length > 14 ? (Number(fmtDate(d.date).slice(0, 2)) % 5 === 0 ? fmtDate(d.date).slice(0, 2) : '') : fmtDate(d.date).slice(0, 2), value: d.invoiced }))} color={A.amber} height={130} />
        </Panel>
      ) : null}

      <Panel title="SALES BY CATEGORY — MTD">
        <View style={{ gap: 8 }}>
          {byCategory.map(([cat, v], i) => (
            <BarRow key={cat} name={cat} pct={(v / catMax) * 100} color={colors[i % colors.length]} valueText={inrCompact(v)} />
          ))}
        </View>
      </Panel>

      <Panel title="TOP PRODUCTS — MTD">
        <View style={{ gap: 8 }}>
          {topProducts.map((p) => (
            <BarRow key={p.name} name={p.name.replace('Sun Sea ', '')} pct={(p.mtdValue / topProducts[0].mtdValue) * 100} color={A.blue} valueText={inrCompact(p.mtdValue)} status={`${p.mtdQty.toLocaleString('en-IN')} ${p.uom}`} />
          ))}
        </View>
      </Panel>

      <Panel title="TOP CUSTOMERS — MTD">
        <View style={{ gap: 6 }}>
          {topCustomers.map((c, i) => (
            <TileRow key={c.id} title={`${i + 1}. ${c.name}`} sub={`${c.city} · ${c.grade}`} right={inrCompact(c.mtdSales)} />
          ))}
        </View>
      </Panel>

      <Panel title="DORMANT CUSTOMERS" accentBorder={dormant.length ? A.amber : undefined}>
        <View style={{ gap: 6 }}>
          {dormant.map((c) => (
            <TileRow key={c.id} title={c.name} sub={`${c.city} · last order ${c.lastOrderDays} days ago`} right={`${c.lastOrderDays}d`} rightColor={A.amber} leftColor={A.amber} />
          ))}
        </View>
        <Text style={mono({ fontSize: 11, color: T.textMute, marginTop: 8 })}>Active customers with no order in 30+ days.</Text>
      </Panel>
    </Board>
  );
}
