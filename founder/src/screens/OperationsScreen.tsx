import React from 'react';
import { Text, View } from 'react-native';
import { AttentionRow, BarRow, Board, Gauge, KpiCard, Panel, PipelineTile, Sub, TileRow, mono } from '../tv/primitives';
import { inrCompact, pctColor, useTheme } from '../tv/theme';
import { dispatches, expenses, production, products, purchases, rawMaterials } from '../data/demo';

export function OperationsScreen() {
  const { T, A } = useTheme();
  const lowFg = products.filter((p) => p.stock < p.minStock).sort((a, b) => a.stock / a.minStock - b.stock / b.minStock);
  const lowRm = rawMaterials.filter((r) => r.onHand < r.reorder);
  const total = products.length + rawMaterials.length;
  const critical = products.filter((p) => p.stock === 0).length + rawMaterials.filter((r) => r.onHand < r.reorder * 0.5).length;
  const low = lowFg.length + lowRm.length - critical;
  const healthy = total - low - critical;
  const ach = Math.round((production.produced / production.planned) * 100);
  const expPct = Math.round((expenses.mtd / expenses.budget) * 100);
  const catMax = Math.max(...expenses.byCategory.map((c) => c.value));

  return (
    <Board
      scene="Production, inventory & purchases"
      banner={critical ? { level: 'alert', headline: `${critical} ITEM${critical > 1 ? 'S' : ''} CRITICAL — ${products.find((p) => p.stock === 0)?.name.toUpperCase() ?? 'RAW MATERIAL'} OUT OF STOCK`, sub: `${low} more running low` } : { level: 'ok', headline: 'INVENTORY HEALTHY' }}
      ticker={`PRODUCTION ${ach}% · ${production.machinesRunning}/${production.machinesTotal} MACHINES · DISPATCHED ${dispatches.todayDispatched} · ${dispatches.pendingGate} AT GATE · OPEN POs ${inrCompact(purchases.openValue)} (${purchases.overdueDeliveries} OVERDUE) · EXPENSES ${expPct}% OF BUDGET`}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Planned" numeric={production.planned} format={(n) => Math.round(n).toLocaleString('en-IN')} sub={`${production.uom} in today's plans`} color={A.blue} />
        <KpiCard label="Produced" numeric={production.produced} format={(n) => Math.round(n).toLocaleString('en-IN')} sub={`${production.uom} so far`} color={A.amber} />
        <KpiCard label="Achievement" value={`${ach}%`} sub="vs plan" color={pctColor(ach, A)} />
        <KpiCard label="Pending" numeric={production.planned - production.produced} format={(n) => Math.round(n).toLocaleString('en-IN')} sub={`${production.uom} remaining`} color={A.red} />
      </View>

      <Panel title="PRODUCTION LINES" right={<Gauge pct={ach} color={pctColor(ach, A)} size={60} />}>
        <View style={{ gap: 8 }}>
          {production.lines.map((l) => {
            const p = Math.round((l.done / l.target) * 100);
            return <BarRow key={l.product} name={l.product.replace('Sun Sea ', '')} pct={p} color={l.status === 'DELAYED' ? A.red : pctColor(p, A)} status={l.status === 'COMPLETED' ? 'Done' : l.status === 'DELAYED' ? 'Delayed' : 'Running'} />;
          })}
        </View>
      </Panel>

      <Panel title="INVENTORY HEALTH">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Gauge pct={(healthy / total) * 100} color={A.green} size={80} label="HEALTHY" display={String(healthy)} />
          <Gauge pct={(low / total) * 100} color={A.amber} size={80} label="LOW STOCK" display={String(low)} />
          <Gauge pct={(critical / total) * 100} color={A.red} size={80} label="CRITICAL" display={String(critical)} />
        </View>
      </Panel>

      <Panel title="INVENTORY — REORDER REQUIRED" accentBorder={critical ? A.red : undefined}>
        <View style={{ gap: 6 }}>
          {lowFg.map((p) => (
            <TileRow key={p.name} title={p.name} sub={`${p.stock} ${p.uom} on hand · min ${p.minStock} · ${p.mtdQty.toLocaleString('en-IN')} sold MTD`} right={p.stock === 0 ? 'OUT' : `${Math.round((p.stock / p.minStock) * 100)}%`} rightColor={p.stock === 0 ? A.red : A.amber} leftColor={p.stock === 0 ? A.red : A.amber} />
          ))}
          {lowRm.map((r) => (
            <TileRow key={r.name} title={r.name} sub={`${r.onHand.toLocaleString('en-IN')} ${r.uom} on hand · reorder at ${r.reorder.toLocaleString('en-IN')}`} right={`${Math.round((r.onHand / r.reorder) * 100)}%`} rightColor={r.onHand < r.reorder * 0.5 ? A.red : A.amber} leftColor={r.onHand < r.reorder * 0.5 ? A.red : A.amber} />
          ))}
        </View>
      </Panel>

      <Panel title="DISPATCH QUEUE">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <PipelineTile count={dispatches.todayDispatched} label="DISPATCHED TODAY" color={A.green} />
          <PipelineTile count={dispatches.pendingGate} label="AT GATE" color={A.amber} alert={dispatches.pendingGate > 2} />
          <PipelineTile count={dispatches.pendingStore} label="STORE RECEIPT" color={A.blue} />
        </View>
        <View style={{ gap: 6 }}>
          {dispatches.list.map((d) => (
            <TileRow key={d.no} title={`${d.no} · ${d.vehicle}`} sub={`${d.items} order lines · waiting ${d.since}`} right={d.status === 'PENDING_GATE_APPROVAL' ? 'GATE' : 'STORE'} rightColor={d.status === 'PENDING_GATE_APPROVAL' ? A.amber : A.blue} />
          ))}
        </View>
      </Panel>

      <Panel title="OPEN PURCHASE ORDERS" right={<Text style={mono({ fontSize: 12, fontWeight: '800', color: T.textDim })}>{inrCompact(purchases.openValue)}</Text>}>
        <View style={{ gap: 6 }}>
          {purchases.list.map((p) => (
            <TileRow key={p.po} title={`${p.po} · ${p.supplier}`} sub={`${inrCompact(p.value)} · ${p.status.replace(/_/g, ' ').toLowerCase()}`} right={p.due.toUpperCase()} rightColor={p.due.startsWith('Overdue') ? A.red : T.textDim} leftColor={p.due.startsWith('Overdue') ? A.red : undefined} />
          ))}
        </View>
        {purchases.overdueDeliveries ? <View style={{ marginTop: 8 }}><AttentionRow level="HIGH" text={`${purchases.overdueDeliveries} supplier deliveries overdue — production inputs at risk`} /></View> : null}
      </Panel>

      <Panel title="EXPENSES — MTD" right={<Gauge pct={expPct} color={expPct > 85 ? A.amber : A.green} size={56} />}>
        <View style={{ gap: 8 }}>
          {expenses.byCategory.map((c, i) => (
            <BarRow key={c.label} name={c.label} pct={(c.value / catMax) * 100} color={[A.blue, A.amber, A.accentBg, A.green, A.red, T.textMute][i % 6]} valueText={inrCompact(c.value)} nameWidth={120} />
          ))}
        </View>
        <Sub>{inrCompact(expenses.mtd)} of {inrCompact(expenses.budget)} monthly budget</Sub>
      </Panel>
    </Board>
  );
}
