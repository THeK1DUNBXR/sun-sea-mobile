import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AttentionRow, BarRow, Board, Gauge, KpiCard, Panel, PipelineTile, Sub, TileRow, mono } from '../tv/primitives';
import { inrCompact, pctColor, useTheme } from '../tv/theme';
import { agents } from '../data/demo';
import { monthProgress, team } from '../data/metrics';
import { pct } from '../format';
import type { RootStackParamList, ScreenProps } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const syncLabel = (m: number) => (m <= 30 ? `synced ${m} min ago` : m < 1440 ? `synced ${Math.round(m / 60)} h ago` : 'NOT SYNCED TODAY');

export function TeamScreen() {
  const nav = useNavigation<Nav>();
  const { T, A } = useTheme();
  const sorted = [...agents].sort((a, b) => b.mtdCollected / b.target - a.mtdCollected / a.target);
  const notStarted = agents.filter((a) => !a.dayStarted);
  const stale = team.stale;
  const teamPct = Math.round((team.collected / team.target) * 100);

  return (
    <Board
      scene="Field sales — live"
      banner={notStarted.length || stale.length ? { level: 'alert', headline: `ATTENTION — ${notStarted.length ? `${notStarted[0].name.toUpperCase()} HAS NOT STARTED THE DAY` : `${stale[0].name.toUpperCase()} NOT SYNCED FOR ${Math.round(stale[0].lastSyncMinutes / 60)} H`}`, sub: `${notStarted.length + stale.length} flags` } : { level: 'ok', headline: 'ALL AGENTS ACTIVE AND SYNCED' }}
      ticker={agents.map((a) => `${a.name.split(' ')[0].toUpperCase()} ${a.visitsDone}/${a.visitsPlanned} VISITS · ${inrCompact(a.todayCollected)}`).join('   ·   ')}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="On duty" value={`${team.active}/${agents.length}`} sub={notStarted.length ? `${notStarted.map((a) => a.name.split(' ')[0]).join(', ')} not started` : 'everyone started'} color={notStarted.length ? A.amber : A.green} />
        <KpiCard label="Collected today" numeric={team.todayCollected} format={inrCompact} sub={`${inrCompact(team.cashInHand)} cash still with agents`} color={A.green} />
        <KpiCard label="Visits today" value={`${team.visitsDone}/${team.visitsPlanned}`} sub={`${pct(team.visitsPlanned ? team.visitsDone / team.visitsPlanned : 0)} of plan`} color={A.blue} />
        <KpiCard label="MTD vs target" value={`${teamPct}%`} sub={`${pct(monthProgress)} of month elapsed`} color={team.collected / team.target >= monthProgress ? A.green : A.amber} />
      </View>

      <Panel title="AGENTS — TARGET ACHIEVEMENT" right={<Gauge pct={teamPct} color={pctColor(teamPct, A)} size={60} />}>
        <View style={{ gap: 8 }}>
          {sorted.map((a) => {
            const p = Math.round((a.mtdCollected / a.target) * 100);
            return <BarRow key={a.id} name={a.name.split(' ')[0]} pct={p} color={a.mtdCollected / a.target >= monthProgress ? A.green : p >= 40 ? A.amber : A.red} valueText={`${p}%`} status={inrCompact(a.mtdCollected)} nameWidth={64} />;
          })}
        </View>
        <Sub>Green = on pace for the month · amber = behind · red = well behind</Sub>
      </Panel>

      <Panel title="TODAY'S STATUS">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <PipelineTile count={agents.filter((a) => a.route.some((r) => r.status === 'IN_PROGRESS')).length} label="IN MEETING" color={A.blue} />
          <PipelineTile count={agents.filter((a) => a.dayStarted && !a.route.some((r) => r.status === 'IN_PROGRESS') && a.visitsDone < a.visitsPlanned).length} label="IN TRANSIT" color={A.amber} />
          <PipelineTile count={agents.filter((a) => a.visitsDone >= a.visitsPlanned && a.visitsPlanned > 0).length} label="ROUTE DONE" color={A.green} />
          <PipelineTile count={notStarted.length} label="IDLE" color={A.red} alert={notStarted.length > 0} />
        </View>
      </Panel>

      <Panel title="ROSTER">
        <View style={{ gap: 6 }}>
          {sorted.map((a) => (
            <TileRow key={a.id} title={a.name} sub={`${a.area} · ${a.visitsDone}/${a.visitsPlanned} visits · ${a.todayOrders} orders · ${syncLabel(a.lastSyncMinutes)}`} right={inrCompact(a.todayCollected)} rightColor={a.todayCollected ? T.text : T.textMute} leftColor={!a.dayStarted ? A.red : a.lastSyncMinutes > 60 ? A.amber : A.green} onPress={() => nav.navigate('Agent', { agentId: a.id })} />
          ))}
        </View>
      </Panel>

      <Panel title="FLAGS" accentBorder={notStarted.length || stale.length ? A.amber : undefined}>
        <View style={{ gap: 6 }}>
          {notStarted.map((a) => <AttentionRow key={a.id} level="CRITICAL" text={`${a.name} has not started the day — no attendance`} />)}
          {stale.map((a) => <AttentionRow key={`${a.id}s`} level={a.lastSyncMinutes >= 1440 ? 'CRITICAL' : 'HIGH'} text={`${a.name} offline ${a.lastSyncMinutes >= 1440 ? '> 1 day' : `${Math.round(a.lastSyncMinutes / 60)} h`} · ${a.pendingSync} records pending`} />)}
          {agents.filter((a) => a.cashInHand > 15000).map((a) => <AttentionRow key={`${a.id}c`} level="MEDIUM" text={`${a.name} holds ${inrCompact(a.cashInHand)} cash — handover pending`} />)}
          {agents.filter((a) => a.promisesBroken > 0).map((a) => <AttentionRow key={`${a.id}b`} level="INFO" text={`${a.name} · ${a.promisesBroken} broken promise${a.promisesBroken > 1 ? 's' : ''} this month`} />)}
        </View>
      </Panel>
    </Board>
  );
}

export function AgentScreen({ route }: ScreenProps<'Agent'>) {
  const { T, A } = useTheme();
  const a = agents.find((x) => x.id === route.params.agentId)!;
  const p = Math.round((a.mtdCollected / a.target) * 100);
  const sp = Math.round((a.mtdSales / a.salesTarget) * 100);
  const STATUS = { COMPLETED: ['DONE', A.green], IN_PROGRESS: ['IN MEETING', A.blue], PLANNED: ['PENDING', T.textMute], SKIPPED: ['SKIPPED', A.amber] } as const;
  return (
    <Board scene={a.area} back ticker={`${a.name.toUpperCase()} · ${a.visitsDone}/${a.visitsPlanned} VISITS · ${inrCompact(a.todayCollected)} TODAY · ${inrCompact(a.mtdCollected)} MTD · ${syncLabel(a.lastSyncMinutes).toUpperCase()}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: a.dayStarted ? A.green : A.red, alignItems: 'center', justifyContent: 'center', shadowColor: a.dayStarted ? A.green : A.red, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}>
          <Text style={mono({ fontSize: 16, fontWeight: '800', color: '#0B1020' })}>{a.name.split(' ').map((w) => w[0]).join('')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mono({ fontSize: 18, fontWeight: '800', color: T.text })}>{a.name}</Text>
          <Text style={mono({ fontSize: 11, color: T.textDim })}>{a.dayStarted ? `Day started ${a.dayStartedAt}` : 'Day not started'} · {syncLabel(a.lastSyncMinutes)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Collected today" numeric={a.todayCollected} format={inrCompact} sub={`${a.cashInHand ? `${inrCompact(a.cashInHand)} cash in hand` : 'no cash in hand'}`} color={A.green} />
        <KpiCard label="MTD collections" numeric={a.mtdCollected} format={inrCompact} sub={`${p}% of ${inrCompact(a.target)}`} color={pctColor(p, A)} />
        <KpiCard label="Sales booked MTD" numeric={a.mtdSales} format={inrCompact} sub={`${sp}% of ${inrCompact(a.salesTarget)}`} color={A.blue} />
        <KpiCard label="Promises" value={`${a.promisesOpen}`} sub={`${a.promisesBroken} broken this month`} color={a.promisesBroken ? A.amber : A.blue} />
      </View>

      <Panel title="TARGETS">
        <View style={{ gap: 8 }}>
          <BarRow name="Collections" pct={p} color={pctColor(p, A)} status={inrCompact(a.target)} />
          <BarRow name="Sales" pct={sp} color={pctColor(sp, A)} status={inrCompact(a.salesTarget)} />
          <BarRow name="Visits" pct={(a.visitsDone / a.visitsPlanned) * 100} color={A.blue} valueText={`${a.visitsDone}/${a.visitsPlanned}`} status="today" />
        </View>
      </Panel>

      <Panel title="TODAY'S ROUTE">
        <View style={{ gap: 6 }}>
          {a.route.map((r, i) => (
            <TileRow key={i} title={`${r.time}  ${r.customer}`} sub={r.outcome ?? STATUS[r.status][0]} right={r.collected ? inrCompact(r.collected) : STATUS[r.status][0]} rightColor={r.collected ? A.green : STATUS[r.status][1]} leftColor={STATUS[r.status][1]} />
          ))}
        </View>
      </Panel>
      {a.pendingSync ? (
        <Panel title="SYNC" accentBorder={A.amber}>
          <AttentionRow level="HIGH" text={`${a.pendingSync} records captured offline are waiting to reach the ERP`} />
        </Panel>
      ) : null}
    </Board>
  );
}
