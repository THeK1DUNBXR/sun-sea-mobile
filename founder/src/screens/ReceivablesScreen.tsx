import React from 'react';
import { Text, View } from 'react-native';
import { BarRow, Board, Gauge, KpiCard, Panel, Sub, TileRow, mono } from '../tv/primitives';
import { inrCompact, useTheme } from '../tv/theme';
import { kpis, receivables } from '../data/metrics';
import { bank } from '../data/demo';

const BUCKETS = ['0–30 d', '31–60 d', '61–90 d', '90+ d'];

export function ReceivablesScreen() {
  const { T, A } = useTheme();
  const k = kpis('mtd');
  const modes = Object.entries(k.byMode).sort((a, b) => b[1] - a[1]);
  const modeMax = Math.max(...modes.map((m) => m[1]));
  const bucketColors = [A.green, A.amber, '#F08A3B', A.red];
  const overduePct = Math.round((receivables.overdue / receivables.total) * 100);
  const currentPct = 100 - overduePct;

  return (
    <Board
      scene="Receivables & collections"
      banner={receivables.buckets[3] > 0 ? { level: 'alert', headline: `${inrCompact(receivables.buckets[3])} OUTSTANDING OVER 90 DAYS`, sub: `${receivables.risky.length} customers at risk` } : { level: 'ok', headline: 'NO RECEIVABLES OVER 90 DAYS' }}
      ticker={`RECEIVABLE ${inrCompact(receivables.total)} · OVERDUE ${inrCompact(receivables.overdue)} (${overduePct}%) · DSO ${Math.round(receivables.dso)} DAYS · COLLECTED MTD ${inrCompact(k.cur.collected)} · CHEQUES ${bank.chequesInHand} / ${inrCompact(bank.chequesValue)} · PDC ${inrCompact(bank.pdcValue)}`}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Receivable" numeric={receivables.total} format={inrCompact} sub={`${receivables.count} customers`} color={A.blue} />
        <KpiCard label="Overdue (31+ d)" numeric={receivables.overdue} format={inrCompact} sub={`${overduePct}% of receivable`} color={A.red} />
        <KpiCard label="DSO" numeric={receivables.dso} format={(n) => `${Math.round(n)} d`} sub="days sales outstanding" color={receivables.dso > 45 ? A.amber : A.green} />
        <KpiCard label="Collected MTD" numeric={k.cur.collected} format={inrCompact} sub={`${inrCompact(bank.chequesValue)} in cheques`} color={A.green} />
      </View>

      <Panel title="RECEIVABLES AGING">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Gauge pct={currentPct} color={currentPct >= 70 ? A.green : currentPct >= 55 ? A.amber : A.red} size={88} label="CURRENT" />
          <View style={{ flex: 1, gap: 8 }}>
            {receivables.buckets.map((v, i) => (
              <BarRow key={i} name={BUCKETS[i]} pct={(v / receivables.total) * 100} color={bucketColors[i]} valueText={inrCompact(v)} nameWidth={58} />
            ))}
          </View>
        </View>
        <Sub>Colour darkens with age. Anything past 60 days needs a call from the office.</Sub>
      </Panel>

      <Panel title="COLLECTIONS BY MODE — MTD">
        <View style={{ gap: 8 }}>
          {modes.map(([m, v], i) => (
            <BarRow key={m} name={m} pct={(v / modeMax) * 100} color={[A.green, A.blue, A.amber, A.accentBg][i % 4]} valueText={inrCompact(v)} status={`${Math.round((v / k.cur.collected) * 100)}%`} nameWidth={64} />
          ))}
        </View>
      </Panel>

      <Panel title="TOP DEBTORS" right={<Text style={mono({ fontSize: 12, fontWeight: '800', color: T.textDim })}>{inrCompact(receivables.top.reduce((s, c) => s + c.outstanding, 0))}</Text>}>
        <View style={{ gap: 6 }}>
          {receivables.top.map((c, i) => (
            <TileRow
              key={c.id}
              title={`${i + 1}. ${c.name}`}
              sub={`${c.city} · limit ${inrCompact(c.creditLimit)}${c.status === 'Blocked' ? ' · BLOCKED' : c.status === 'OnHold' ? ' · ON HOLD' : c.outstanding > c.creditLimit ? ' · OVER LIMIT' : ''}${c.buckets[3] ? ` · ${inrCompact(c.buckets[3])} over 90 d` : ''}`}
              right={inrCompact(c.outstanding)}
              rightColor={c.status === 'Blocked' || c.buckets[3] ? A.red : c.status === 'OnHold' || c.outstanding > c.creditLimit ? A.amber : T.text}
              leftColor={c.status === 'Blocked' || c.buckets[3] ? A.red : c.status === 'OnHold' ? A.amber : undefined}
            />
          ))}
        </View>
      </Panel>

      <Panel title={`AT RISK (${receivables.risky.length})`} accentBorder={receivables.risky.length ? A.red : undefined}>
        <View style={{ gap: 6 }}>
          {receivables.risky.slice(0, 8).map((c) => (
            <TileRow key={c.id} title={c.name} sub={c.status === 'Blocked' ? 'Blocked in ERP · collections only' : c.status === 'OnHold' ? 'On hold · over credit limit' : 'Has dues over 90 days'} right={inrCompact(c.outstanding)} rightColor={A.red} leftColor={A.red} />
          ))}
        </View>
      </Panel>
    </Board>
  );
}
