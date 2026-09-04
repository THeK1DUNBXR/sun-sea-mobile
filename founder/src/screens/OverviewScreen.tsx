import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AttentionRow, BarChart, Board, Gauge, KpiCard, Panel, PipelineTile, Pills, Sub, TrendCard, mono } from '../tv/primitives';
import { inrCompact, pctColor, trendColor, trendText, useTheme } from '../tv/theme';
import { attention, bank, orderFunnel, production } from '../data/demo';
import { kpis, last14, monthProgress, receivables, team, type Period } from '../data/metrics';
import { fmtDate, pct } from '../format';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const LEVEL = { critical: 'CRITICAL', serious: 'HIGH', warning: 'MEDIUM', info: 'INFO' } as const;

export function OverviewScreen() {
  const nav = useNavigation<Nav>();
  const { T, A } = useTheme();
  const [period, setPeriod] = useState<Period>('mtd');
  const k = kpis(period);
  const trend = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
  const hot = attention.filter((a) => a.severity === 'critical' || a.severity === 'serious');
  const ach = Math.round((production.produced / production.planned) * 100);
  const pace = team.collected / team.target >= monthProgress;

  const ticker = [
    `SALES MTD ${inrCompact(kpis('mtd').cur.invoiced)}`,
    `COLLECTED TODAY ${inrCompact(kpis('today').cur.collected)}`,
    `PRODUCTION ${ach}%`,
    `ORDERS ${orderFunnel.slice(0, 5).reduce((s, f) => s + f.value, 0)} OPEN (${orderFunnel[1].value} AWAITING APPROVAL)`,
    `RECEIVABLE ${inrCompact(receivables.total)} · OVERDUE ${inrCompact(receivables.overdue)}`,
    `CASH+BANK ${inrCompact(bank.cash + bank.bank)}`,
    `FIELD ${team.visitsDone}/${team.visitsPlanned} VISITS · ${inrCompact(team.cashInHand)} CASH WITH AGENTS`,
  ].join('   ·   ');

  return (
    <Board
      scene="Executive overview"
      banner={hot.length ? { level: 'alert', headline: `ATTENTION — ${hot[0].title.toUpperCase()}`, sub: `${attention.length} items flagged` } : { level: 'ok', headline: 'ALL SYSTEMS ON TRACK' }}
      ticker={ticker}
    >
      <Pills value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'mtd', label: 'MTD' }, { value: '30d', label: '30 days' }]} />

      {/* KPI STRIP */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Sales" numeric={k.cur.invoiced} format={inrCompact} sub={`prev ${inrCompact(k.before.invoiced)}`} trend={trendText(trend(k.cur.invoiced, k.before.invoiced))} trendColor={trendColor(trend(k.cur.invoiced, k.before.invoiced), A)} color={A.amber} />
        <KpiCard label="Collections" numeric={k.cur.collected} format={inrCompact} sub={`prev ${inrCompact(k.before.collected)}`} trend={trendText(trend(k.cur.collected, k.before.collected))} trendColor={trendColor(trend(k.cur.collected, k.before.collected), A)} color={A.green} />
        <KpiCard label="Orders" numeric={k.cur.orders} format={(n) => String(Math.round(n))} sub={`${inrCompact(k.cur.orderValue)} booked`} trend={trendText(trend(k.cur.orders, k.before.orders))} trendColor={trendColor(trend(k.cur.orders, k.before.orders), A)} color={A.blue} />
        <KpiCard label="Receivables" numeric={receivables.total} format={inrCompact} sub={`${inrCompact(receivables.overdue)} overdue · DSO ${Math.round(receivables.dso)}d`} color={receivables.overdue > 0 ? A.red : A.green} />
      </View>

      {/* PRODUCTION + FIELD */}
      <Panel title="PRODUCTION PERFORMANCE" right={<Gauge pct={ach} color={pctColor(ach, A)} size={64} />}>
        <Sub>
          Planned <Text style={{ color: T.text, fontWeight: '700' }}>{production.planned.toLocaleString('en-IN')}</Text> · Produced <Text style={{ color: T.text, fontWeight: '700' }}>{production.produced.toLocaleString('en-IN')}</Text> {production.uom} · {production.machinesRunning}/{production.machinesTotal} machines
        </Sub>
        <View style={{ gap: 8, marginTop: 10 }}>
          {production.lines.map((l) => {
            const p = Math.round((l.done / l.target) * 100);
            return <BarRowLine key={l.product} name={l.product.replace('Sun Sea ', '')} pct={p} color={pctColor(p, A)} status={l.status === 'COMPLETED' ? 'Done' : l.status === 'DELAYED' ? 'Delayed' : 'Running'} />;
          })}
        </View>
      </Panel>

      <Panel title="FIELD COLLECTIONS VS TARGET" right={<Text style={mono({ fontSize: 12, fontWeight: '800', color: pace ? A.green : A.amber })}>{pace ? 'ON PACE' : 'BEHIND PACE'}</Text>}>
        <BarRowLine name="Team" pct={Math.round((team.collected / team.target) * 100)} color={pace ? A.green : A.amber} valueText={inrCompact(team.collected)} status={`of ${inrCompact(team.target)}`} />
        <Sub>{pct(monthProgress)} of the month elapsed · {team.active} of 5 agents active · {team.visitsDone}/{team.visitsPlanned} visits done</Sub>
      </Panel>

      {/* PIPELINE */}
      <Panel title="ORDER / DISPATCH STATUS">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <PipelineTile count={orderFunnel[0].value} label="NEW (FIELD)" color={A.blue} />
          <PipelineTile count={orderFunnel[1].value} label="AWAITING APPROVAL" color={A.amber} alert={orderFunnel[1].value > 0} />
          <PipelineTile count={orderFunnel[2].value + orderFunnel[3].value} label="PROCESSING" color={A.blue} />
          <PipelineTile count={orderFunnel[4].value} label="DISPATCHED" color={A.green} />
          <PipelineTile count={production.lines.filter((l) => l.status === 'DELAYED').length} label="DELAYED" color={A.red} alert={production.lines.some((l) => l.status === 'DELAYED')} />
        </View>
      </Panel>

      {/* ATTENTION */}
      <Panel
        title="MANAGEMENT ATTENTION"
        accentBorder={hot.length ? A.red : undefined}
        right={
          <Pressable onPress={() => nav.navigate('Attention')}>
            <Text style={mono({ fontSize: 11, fontWeight: '800', color: A.accentBg, letterSpacing: 0.6 })}>ALL {attention.length} ›</Text>
          </Pressable>
        }
      >
        <View style={{ gap: 6 }}>
          {attention.slice(0, 5).map((a) => (
            <AttentionRow key={a.id} level={LEVEL[a.severity]} text={a.title} right={a.amount ? inrCompact(a.amount) : undefined} />
          ))}
        </View>
      </Panel>

      {/* TRENDS */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TrendCard label="Sales · 14d" trend={trendText(trend(last14.slice(-7).reduce((s, d) => s + d.invoiced, 0), last14.slice(0, 7).reduce((s, d) => s + d.invoiced, 0)))} trendColor={trendColor(trend(last14.slice(-7).reduce((s, d) => s + d.invoiced, 0), last14.slice(0, 7).reduce((s, d) => s + d.invoiced, 0)), A)} points={last14.map((d) => d.invoiced)} color={A.blue} />
        <TrendCard label="Collections · 14d" trend={trendText(trend(last14.slice(-7).reduce((s, d) => s + d.collected, 0), last14.slice(0, 7).reduce((s, d) => s + d.collected, 0)))} trendColor={trendColor(trend(last14.slice(-7).reduce((s, d) => s + d.collected, 0), last14.slice(0, 7).reduce((s, d) => s + d.collected, 0)), A)} points={last14.map((d) => d.collected)} color={A.green} />
      </View>

      <Panel title="INVOICED — LAST 14 DAYS">
        <BarChart points={last14.map((d) => ({ day: fmtDate(d.date).slice(0, 2), value: d.invoiced }))} color={A.amber} />
      </Panel>

      {/* CASH */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Cash + Bank" numeric={bank.cash + bank.bank} format={inrCompact} sub={`payables 7d ${inrCompact(bank.payablesDue7d)}`} color={A.blue} valueSize={22} />
        <KpiCard label="Cheques in hand" numeric={bank.chequesValue} format={inrCompact} sub={`${bank.chequesInHand} cheques · PDC ${inrCompact(bank.pdcValue)}`} color={A.amber} valueSize={22} />
        <KpiCard label="Cash with agents" numeric={team.cashInHand} format={inrCompact} sub={`${team.stale.length} agent${team.stale.length === 1 ? '' : 's'} not synced 1h+`} color={team.cashInHand > 30000 ? A.amber : A.green} valueSize={22} />
        <KpiCard label="Inventory" value={`${Math.round((1 - 5 / 15) * 100)}%`} sub="healthy · 5 items to reorder" color={A.amber} valueSize={22} />
      </View>
    </Board>
  );
}

function BarRowLine(props: { name: string; pct: number; color: string; valueText?: string; status?: string }) {
  const { BarRow } = require('../tv/primitives') as typeof import('../tv/primitives');
  return <BarRow {...props} />;
}
