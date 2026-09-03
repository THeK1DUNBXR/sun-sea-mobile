import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, IconTile, Pill } from '../components/ui';
import { Segmented } from '../components/Chips';
import { Sheet } from '../components/Sheet';
import { Chips } from '../components/Chips';
import { useToast } from '../components/Toast';
import { tables, FollowUp } from '../db';
import { useQuery } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { addDays, fmtDate, money, todayYmd } from '../utils/format';
import { endOfDayMs } from '../utils/period';
import { completeFollowUp, rescheduleFollowUp } from '../data/extras';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type View_ = 'due' | 'upcoming' | 'closed';

export function FollowUpsScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const [view, setView] = useState<View_>('due');
  const [resched, setResched] = useState<FollowUp | null>(null);
  const [pick, setPick] = useState<'1' | '3' | '7'>('3');
  const all = useQuery(() => tables.followUps().query(Q.sortBy('due_at', Q.asc)), []);
  const customers = useQuery(() => tables.customers().query(), []);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const eod = endOfDayMs();

  const due = all.filter((f) => f.status === 'OPEN' && f.dueAt <= eod);
  const upcoming = all.filter((f) => f.status === 'OPEN' && f.dueAt > eod);
  const closed = all.filter((f) => f.status !== 'OPEN').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const list = view === 'due' ? due : view === 'upcoming' ? upcoming : closed;
  const promisedDue = due.filter((f) => f.type === 'PTP').reduce((s, f) => s + (f.promisedAmount ?? 0), 0);

  return (
    <Screen title="Follow-ups" subtitle={due.length ? `${due.length} due · ${money(promisedDue)} promised` : undefined} refreshable>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'due', label: `Due (${due.length})` },
          { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { value: 'closed', label: 'History' },
        ]}
      />
      <View style={{ height: spacing.md }} />
      {list.length === 0 ? (
        <EmptyState icon="alarm-outline" title={view === 'due' ? 'Nothing due today' : view === 'upcoming' ? 'No upcoming follow-ups' : 'No history yet'} hint="Promises to pay and callbacks logged at a visit show up here on their day." />
      ) : (
        list.map((f) => {
          const c = byId.get(f.customerId);
          const overdue = f.isOverdue;
          return (
            <Card key={f.id} style={{ marginBottom: spacing.sm }}>
              <Pressable onPress={() => nav.navigate('CustomerDetail', { customerId: f.customerId, tab: 'activity' })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconTile icon={f.type === 'PTP' ? 'cash-outline' : f.type === 'DISPUTE' ? 'alert-circle-outline' : f.type === 'CALLBACK' ? 'call-outline' : 'remove-circle-outline'} tone={f.status === 'BROKEN' ? 'danger' : f.status === 'DONE' ? 'success' : overdue ? 'danger' : 'warning'} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={type.h3}>{c?.name ?? 'Customer'}</Text>
                  <Text style={type.small}>
                    {f.type === 'PTP' ? `Promised ${money(f.promisedAmount ?? 0)} · ${fmtDate(f.promisedDate)}` : f.type === 'DISPUTE' ? 'Dispute' : f.type === 'CALLBACK' ? `Call back · ${fmtDate(f.dueAt)}` : 'No action'}
                  </Text>
                  {f.notes ? (
                    <Text style={type.tiny} numberOfLines={2}>
                      {f.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {f.status !== 'OPEN' ? <Pill text={f.status === 'BROKEN' ? 'Broken' : f.status === 'DONE' ? 'Done' : 'Cancelled'} tone={f.status === 'BROKEN' ? 'danger' : f.status === 'DONE' ? 'success' : 'muted'} /> : overdue ? <Pill text="Overdue" tone="danger" /> : <Pill text={fmtDate(f.dueAt) === fmtDate(new Date()) ? 'Today' : fmtDate(f.dueAt).slice(0, 6)} tone="warning" />}
                  {c?.outstanding ? <Text style={type.tiny}>Due {money(c.outstanding)}</Text> : null}
                </View>
              </Pressable>
              {f.status === 'OPEN' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  {c?.mobile ? <Button small variant="outline" icon="call-outline" title="Call" onPress={() => Linking.openURL(`tel:${c.mobile}`)} /> : null}
                  {f.type === 'PTP' ? <Button small variant="success" icon="cash-outline" title="Collect" onPress={() => nav.navigate('CollectionEntry', { customerId: f.customerId, selectAll: true })} /> : null}
                  <Button small variant="outline" icon="calendar-outline" title="Reschedule" onPress={() => setResched(f)} />
                  <Pressable
                    onPress={() =>
                      Alert.alert('Close follow-up', 'Mark as done?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Done', onPress: () => void completeFollowUp(f).then(() => toast.show('Follow-up closed')) },
                      ])
                    }
                    style={{ marginLeft: 'auto', minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 }}
                  >
                    <Text style={[type.small, { color: colors.primary, fontWeight: '700' }]}>Done</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Sheet visible={!!resched} onClose={() => setResched(null)} title="Reschedule follow-up">
        <Chips
          value={pick}
          onChange={setPick}
          scroll={false}
          options={[
            { value: '1', label: `Tomorrow · ${fmtDate(addDays(todayYmd(), 1)).slice(0, 6)}` },
            { value: '3', label: `In 3 days · ${fmtDate(addDays(todayYmd(), 3)).slice(0, 6)}` },
            { value: '7', label: `Next week · ${fmtDate(addDays(todayYmd(), 7)).slice(0, 6)}` },
          ]}
        />
        <View style={{ height: spacing.lg }} />
        <Button
          title="Save new date"
          onPress={async () => {
            if (!resched) return;
            await rescheduleFollowUp(resched, addDays(todayYmd(), Number(pick)));
            setResched(null);
            toast.show('Follow-up rescheduled');
          }}
        />
        <View style={{ height: 8, borderRadius: radius.sm }} />
      </Sheet>
    </Screen>
  );
}
