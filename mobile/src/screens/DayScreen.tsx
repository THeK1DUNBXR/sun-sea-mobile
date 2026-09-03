import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, Field, IconTile, KeyValue, Notice, Pill, Section } from '../components/ui';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { useQuery } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDateTime, fmtTime, money, todayYmd } from '../utils/format';
import { cashInHand, endDay, startDay, todaysSummary } from '../data/extras';
import type { RootStackParamList } from '../navigation/types';
import { success } from '../utils/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Summary = Awaited<ReturnType<typeof todaysSummary>>;

export function DayScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const today = todayYmd();
  const session = useQuery(() => tables.daySessions().query(Q.where('date', today)), [today])[0];
  const collections = useQuery(() => tables.collections().query(), []);
  const handovers = useQuery(() => tables.handovers().query(Q.where('date', today)), [today]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cash, setCash] = useState<{ collected: number; handedOver: number; inHand: number } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void todaysSummary().then(setSummary);
    void cashInHand().then(setCash);
  }, [collections, handovers, session?.status]);

  const onStart = async () => {
    setBusy(true);
    try {
      await startDay(note);
      void success();
      toast.show('Day started — attendance recorded');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  const onEnd = () => {
    if (!session) return;
    const pendingVisits = (summary?.visits.planned ?? 0) - (summary?.visits.completed ?? 0) - (summary?.visits.skipped ?? 0);
    const msg = [
      pendingVisits > 0 ? `${pendingVisits} planned visit${pendingVisits > 1 ? 's are' : ' is'} still pending.` : null,
      cash && cash.inHand > 0 ? `You still hold ${money(cash.inHand)} in cash. Record a handover if you have deposited it.` : null,
      'End the day now?',
    ]
      .filter(Boolean)
      .join('\n\n');
    Alert.alert('End day', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End day',
        style: 'destructive',
        onPress: async () => {
          await endDay(session, cash?.inHand ?? 0, note);
          void success();
          toast.show('Day closed. Summary saved.');
        },
      },
    ]);
  };

  return (
    <Screen title="Cash & day" back refreshable>
      {/* Day state */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile icon={session?.status === 'OPEN' ? 'sunny' : session?.status === 'CLOSED' ? 'moon' : 'play'} tone={session?.status === 'OPEN' ? 'success' : session?.status === 'CLOSED' ? 'primary' : 'warning'} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{session?.status === 'OPEN' ? 'Day in progress' : session?.status === 'CLOSED' ? 'Day closed' : 'Day not started'}</Text>
          <Text style={type.small}>
            {session ? `Started ${fmtTime(session.startedAt)}${session.endedAt ? ` · ended ${fmtTime(session.endedAt)}` : ''}` : 'Starting your day marks attendance and timestamps your route.'}
          </Text>
        </View>
      </Card>

      {!session ? (
        <>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Starting from Tambaram depot" style={{ marginTop: spacing.lg }} />
          <Button title="Start day" icon="play" variant="success" onPress={onStart} loading={busy} />
        </>
      ) : null}

      {/* Cash in hand */}
      <Section title="Cash in hand">
        <Card>
          <Text style={[type.money, { color: (cash?.inHand ?? 0) > 0 ? colors.text : colors.success }]}>{money(cash?.inHand ?? 0)}</Text>
          <Text style={type.tiny}>Cash collected {money(cash?.collected ?? 0)} − handed over {money(cash?.handedOver ?? 0)}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button small icon="business-outline" title="Record handover / deposit" onPress={() => nav.navigate('Handover', { suggestedAmount: cash?.inHand ?? 0 })} disabled={(cash?.inHand ?? 0) <= 0} />
            <Button small variant="outline" icon="document-text-outline" title="Cheques" onPress={() => nav.navigate('Cheques')} />
          </View>
        </Card>
        {handovers.length ? (
          <Card style={{ marginTop: spacing.sm, padding: 0 }}>
            {handovers.map((h, i) => (
              <View key={h.id} style={{ padding: spacing.md, borderBottomWidth: i < handovers.length - 1 ? 1 : 0, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{money(h.amount)} · {h.mode === 'BANK_DEPOSIT' ? 'Bank deposit' : 'Handed to office'}</Text>
                  <Text style={type.tiny}>{h.receiptNo ?? 'Pending number'}{h.referenceNo ? ` · Ref ${h.referenceNo}` : ''} · {fmtDateTime(h.createdAt)}</Text>
                </View>
                <Pill text={h.status === 'CONFIRMED' ? 'Confirmed' : h.status === 'REJECTED' ? 'Rejected' : 'Awaiting office'} tone={h.status === 'CONFIRMED' ? 'success' : h.status === 'REJECTED' ? 'danger' : 'warning'} />
              </View>
            ))}
          </Card>
        ) : null}
      </Section>

      {/* EOD summary */}
      <Section title="Today's summary">
        <Card>
          <KeyValue label="Collections" value={`${summary?.collections.count ?? 0} · ${money(summary?.collections.amount ?? 0)}`} />
          {summary
            ? Object.entries(summary.collections.byMode).map(([mode, v]) => (
                <View key={mode} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: spacing.md, paddingVertical: 3 }}>
                  <Text style={type.tiny}>{mode} × {v.count}</Text>
                  <Text style={type.tiny}>{money(v.amount)}</Text>
                </View>
              ))
            : null}
          <Divider />
          <KeyValue label="Visits" value={`${summary?.visits.completed ?? 0} of ${summary?.visits.planned ?? 0} done`} />
          <Text style={[type.tiny, { paddingLeft: spacing.md }]}>
            {summary?.visits.productive ?? 0} productive · {summary?.visits.skipped ?? 0} skipped
          </Text>
          <Divider />
          <KeyValue label="Orders" value={`${summary?.orders.count ?? 0} · ${money(summary?.orders.amount ?? 0)}`} />
          <Divider />
          <KeyValue label="Follow-ups logged" value={String(summary?.followUps ?? 0)} />
          <Divider />
          <KeyValue label="Expenses" value={`${summary?.expenses.count ?? 0} · ${money(summary?.expenses.amount ?? 0)}`} />
        </Card>
      </Section>

      {session?.status === 'OPEN' ? (
        <>
          <Field label="End-of-day note (optional)" value={note} onChangeText={setNote} placeholder="Anything the office should know" multiline style={{ marginTop: spacing.lg }} />
          <Button title="End day" icon="moon" variant="danger" onPress={onEnd} />
        </>
      ) : null}
      {session?.status === 'CLOSED' ? <Notice tone="success" text={`Day closed at ${fmtTime(session.endedAt)} with ${money(session.cashInHandEnd ?? 0)} cash in hand.${session.endNote ? ` Note: ${session.endNote}` : ''}`} /> : null}
    </Screen>
  );
}
