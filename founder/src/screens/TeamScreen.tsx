import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Card, Divider, KV, Pill, Row, Screen, Section, StatTile } from '../components/ui';
import { Progress } from '../components/charts';
import { colors, spacing, type } from '../theme';
import { compact, money, pct } from '../format';
import { agents } from '../data/demo';
import { monthProgress, team } from '../data/metrics';
import type { RootStackParamList, ScreenProps } from '../navigation/types';
import { useRefresh } from '../components/useRefresh';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const syncPill = (m: number) => (m <= 30 ? <Pill text={`synced ${m} min ago`} tone="success" icon="cloud-done-outline" /> : m < 1440 ? <Pill text={`synced ${Math.round(m / 60)} h ago`} tone="warning" icon="cloud-offline-outline" /> : <Pill text="not synced today" tone="danger" icon="cloud-offline-outline" />);

export function TeamScreen() {
  const nav = useNavigation<Nav>();
  const { refreshing, refresh, updatedAt } = useRefresh();
  const sorted = [...agents].sort((a, b) => b.mtdCollected / b.target - a.mtdCollected / a.target);
  return (
    <Screen title="Field team" subtitle={`Updated ${updatedAt}`} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile label="Collected today" value={compact(team.todayCollected)} sub={`${team.active} of ${agents.length} agents in the field`} icon="cash-outline" tone="success" />
        <StatTile label="Visits today" value={`${team.visitsDone}/${team.visitsPlanned}`} sub={`${pct(team.visitsPlanned ? team.visitsDone / team.visitsPlanned : 0)} of plan`} icon="map-outline" tone="info" />
        <StatTile label="MTD vs target" value={pct(team.collected / team.target)} sub={`${pct(monthProgress)} of month elapsed`} icon="flag-outline" tone={team.collected / team.target >= monthProgress ? 'success' : 'warning'} />
        <StatTile label="Cash with agents" value={compact(team.cashInHand)} sub="not yet handed over" icon="briefcase-outline" tone={team.cashInHand > 30000 ? 'warning' : 'primary'} />
      </View>

      <Section title="Agents · ranked by target achievement">
        <Card style={{ padding: 0 }}>
          {sorted.map((a, i) => (
            <Row
              key={a.id}
              leading={<Avatar name={a.name} size={42} />}
              title={a.name}
              subtitle={`${a.area} · ${a.visitsDone}/${a.visitsPlanned} visits · ${money(a.todayCollected)} today`}
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[type.h3, { color: a.mtdCollected / a.target >= monthProgress ? colors.success : colors.warning }]}>{pct(a.mtdCollected / a.target)}</Text>
                  {a.lastSyncMinutes > 60 ? <Pill text={a.lastSyncMinutes >= 1440 ? 'No sync' : 'Sync stale'} tone={a.lastSyncMinutes >= 1440 ? 'danger' : 'warning'} /> : !a.dayStarted ? <Pill text="Not started" tone="danger" /> : null}
                </View>
              }
              onPress={() => nav.navigate('Agent', { agentId: a.id })}
              last={i === sorted.length - 1}
            />
          ))}
        </Card>
      </Section>

      <Section title="Flags">
        <Card>
          {agents.filter((a) => !a.dayStarted).map((a) => <KV key={a.id} label={`${a.name} has not started the day`} value="No attendance" tone="danger" />)}
          {team.stale.map((a) => <KV key={a.id} label={`${a.name} · ${a.pendingSync} records pending`} value={a.lastSyncMinutes >= 1440 ? 'Offline > 1 day' : `Offline ${Math.round(a.lastSyncMinutes / 60)} h`} tone="warning" />)}
          {agents.filter((a) => a.promisesBroken > 0).map((a) => <KV key={`${a.id}b`} label={`${a.name} · broken promises this month`} value={String(a.promisesBroken)} tone="warning" />)}
          <Divider />
          <Text style={type.tiny}>Attendance, sync and promise data come from the Sun Sea Field agent app.</Text>
        </Card>
      </Section>
    </Screen>
  );
}

export function AgentScreen({ route }: ScreenProps<'Agent'>) {
  const a = agents.find((x) => x.id === route.params.agentId)!;
  const STATUS = { COMPLETED: ['Completed', 'success'], IN_PROGRESS: ['In progress', 'info'], PLANNED: ['Pending', 'muted'], SKIPPED: ['Skipped', 'warning'] } as const;
  return (
    <Screen title={a.name} subtitle={a.area} back>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={a.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{a.name}</Text>
          <Text style={type.small}>{a.dayStarted ? `Day started ${a.dayStartedAt}` : 'Day not started'}</Text>
          <View style={{ marginTop: 6 }}>{syncPill(a.lastSyncMinutes)}</View>
        </View>
      </Card>

      <Section title="This month">
        <Card>
          <Text style={type.h3}>Collections {money(a.mtdCollected)}</Text>
          <Progress value={a.mtdCollected} target={a.target} />
          <Text style={[type.h3, { marginTop: spacing.md }]}>Sales booked {money(a.mtdSales)}</Text>
          <Progress value={a.mtdSales} target={a.salesTarget} color="#1F3A5F" />
          <Divider />
          <KV label="Promises to pay open" value={String(a.promisesOpen)} />
          <KV label="Promises broken" value={String(a.promisesBroken)} tone={a.promisesBroken ? 'warning' : undefined} />
          <KV label="Cash in hand (today)" value={money(a.cashInHand)} tone={a.cashInHand > 15000 ? 'warning' : undefined} />
          <KV label="Records waiting to sync" value={String(a.pendingSync)} tone={a.pendingSync ? 'warning' : undefined} />
        </Card>
      </Section>

      <Section title={`Today's route · ${a.visitsDone}/${a.visitsPlanned} done · ${money(a.todayCollected)} collected`}>
        <Card style={{ padding: 0 }}>
          {a.route.map((r, i) => (
            <Row key={i} title={r.customer} subtitle={`${r.time}${r.outcome ? ` · ${r.outcome}` : ''}`} right={<View style={{ alignItems: 'flex-end', gap: 3 }}>{r.collected ? <Text style={type.h3}>{money(r.collected)}</Text> : null}<Pill text={STATUS[r.status][0]} tone={STATUS[r.status][1]} /></View>} last={i === a.route.length - 1} />
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
