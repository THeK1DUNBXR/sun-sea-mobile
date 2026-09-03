import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Card, Divider, KeyValue, Section } from '../components/ui';
import { ProgressRing } from '../components/ProgressRing';
import { tables } from '../db';
import { useQuery } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { money, todayYmd, addDays, fmtDate } from '../utils/format';
import { currentPeriod, monthProgress, monthStartMs, monthStartYmd } from '../utils/period';

export function PerformanceScreen() {
  const period = currentPeriod();
  const mStart = monthStartMs();
  const target = useQuery(() => tables.targets().query(Q.where('period', period)), [period])[0];
  const collections = useQuery(() => tables.collections().query(Q.where('collected_at', Q.gte(mStart)), Q.where('status', Q.notEq('FAILED'))), [mStart]);
  const orders = useQuery(() => tables.orders().query(Q.where('order_date', Q.gte(monthStartYmd())), Q.where('status', Q.notEq('FAILED'))), [period]);
  const visits = useQuery(() => tables.visits().query(Q.where('planned_date', Q.gte(monthStartYmd()))), [period]);
  const followUps = useQuery(() => tables.followUps().query(), []);

  const collected = collections.reduce((s, c) => s + c.amount, 0);
  const sales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const completed = visits.filter((v) => v.status === 'COMPLETED');
  const productive = completed.filter((v) => v.outcome && v.outcome !== 'NO_ACTION');
  const pace = monthProgress();

  const byMode = useMemo(() => {
    const m: Record<string, number> = {};
    collections.forEach((c) => (m[c.paymentMode] = (m[c.paymentMode] ?? 0) + c.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [collections]);

  // Last 7 days bars
  const days = useMemo(() => {
    const out: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const ymd = addDays(todayYmd(), -i);
      const [y, mo, d] = ymd.split('-').map(Number);
      const from = new Date(y, mo - 1, d).getTime();
      const to = from + 86400000 - 1;
      out.push({ day: fmtDate(ymd).slice(0, 2), amount: collections.filter((c) => c.collectedAt >= from && c.collectedAt <= to).reduce((s, c) => s + c.amount, 0) });
    }
    return out;
  }, [collections]);
  const max = Math.max(1, ...days.map((d) => d.amount));

  const ptp = followUps.filter((f) => f.type === 'PTP' && f.status !== 'OPEN');
  const kept = ptp.filter((f) => f.status === 'DONE').length;

  return (
    <Screen title="My performance" subtitle={fmtDate(new Date()).split(' ').slice(1).join(' ')} back refreshable>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <ProgressRing progress={target?.collectionTarget ? collected / target.collectionTarget : 0} color={colors.success} label="Collections" sublabel={target?.collectionTarget ? `of ${money(target.collectionTarget)}` : undefined} size={92} />
          <ProgressRing progress={target?.salesTarget ? sales / target.salesTarget : 0} color={colors.primary} label="Sales booked" sublabel={target?.salesTarget ? `of ${money(target.salesTarget)}` : undefined} size={92} />
          <ProgressRing progress={target?.visitsTarget ? completed.length / target.visitsTarget : 0} color={colors.accent} label="Visits" center={<Text style={type.h3}>{completed.length}</Text>} sublabel={target?.visitsTarget ? `of ${target.visitsTarget}` : undefined} size={92} />
        </View>
        <Divider />
        <KeyValue label="Collected this month" value={money(collected)} />
        <KeyValue label="Sales booked" value={money(sales)} />
        <KeyValue label="Month elapsed" value={`${Math.round(pace * 100)}%`} />
        {target?.collectionTarget ? <KeyValue label={collected / target.collectionTarget >= pace ? 'Ahead of pace by' : 'Behind pace by'} value={money(Math.abs(collected - target.collectionTarget * pace))} valueStyle={{ color: collected / target.collectionTarget >= pace ? colors.success : colors.danger }} /> : null}
      </Card>

      <Section title="Collections — last 7 days">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 }}>
            {days.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={type.tiny}>{d.amount ? `${Math.round(d.amount / 1000)}k` : ''}</Text>
                <View style={{ width: '60%', height: Math.max(4, Math.round((d.amount / max) * 84)), backgroundColor: i === 6 ? colors.primary : colors.primarySoft, borderRadius: radius.sm, marginTop: 4 }} />
                <Text style={[type.tiny, { marginTop: 6 }]}>{d.day}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Section title="By payment mode">
        <Card>
          {byMode.length === 0 ? <Text style={type.small}>No collections yet this month.</Text> : null}
          {byMode.map(([mode, amt]) => (
            <View key={mode} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={type.small}>{mode}</Text>
                <Text style={type.h3}>{money(amt)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 4, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${Math.round((amt / Math.max(1, collected)) * 100)}%`, backgroundColor: colors.accent }} />
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Visit productivity">
        <Card>
          <KeyValue label="Visits completed" value={String(completed.length)} />
          <KeyValue label="Productive (collection or order)" value={`${productive.length} · ${completed.length ? Math.round((productive.length / completed.length) * 100) : 0}%`} />
          <KeyValue label="Skipped" value={String(visits.filter((v) => v.status === 'SKIPPED').length)} />
          <Divider />
          <KeyValue label="Promises kept" value={ptp.length ? `${kept} of ${ptp.length} · ${Math.round((kept / ptp.length) * 100)}%` : '—'} />
        </Card>
      </Section>
    </Screen>
  );
}
