import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card, EmptyState, IconTile, ListItem, Money, Pill, Section } from '../components/ui';
import { tables } from '../db';
import { useQuery } from '../db/hooks';
import { spacing, type } from '../theme';
import { daysBetween, fmtDate, money, todayYmd } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChequesScreen() {
  const nav = useNavigation<Nav>();
  const cheques = useQuery(() => tables.collections().query(Q.where('payment_mode', 'Cheque'), Q.where('status', Q.notEq('FAILED')), Q.sortBy('cheque_date', Q.asc)), []);
  const customers = useQuery(() => tables.customers().query(), []);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const today = todayYmd();

  const postDated = cheques.filter((c) => (c.chequeDate ?? '') > today);
  const dueToday = cheques.filter((c) => c.chequeDate === today);
  const banked = cheques.filter((c) => (c.chequeDate ?? today) < today);
  const total = cheques.reduce((s, c) => s + c.amount, 0);

  const row = (c: (typeof cheques)[number]) => {
    const cust = byId.get(c.customerId);
    const days = c.chequeDate ? -daysBetween(c.chequeDate) : 0;
    return (
      <ListItem
        key={c.id}
        leading={<IconTile icon="document-text-outline" tone={days > 0 ? 'info' : days === 0 ? 'warning' : 'success'} size={40} />}
        title={`${cust?.name ?? 'Customer'} · ${money(c.amount)}`}
        subtitle={`${c.bankName ?? 'Bank'} · No. ${c.referenceNo ?? '—'} · dated ${fmtDate(c.chequeDate)}${c.receiptNo ? ` · ${c.receiptNo}` : ''}`}
        right={days > 0 ? <Pill text={`in ${days}d`} tone="info" /> : days === 0 ? <Pill text="Due today" tone="warning" /> : <Pill text="For deposit" tone="success" />}
        onPress={() => nav.navigate('CustomerDetail', { customerId: c.customerId, tab: 'activity' })}
      />
    );
  };

  return (
    <Screen title="Cheque register" back refreshable>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>Cheques in hand</Text>
          <Text style={type.money}>{cheques.length}</Text>
          <Text style={type.tiny}>{money(total)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>Post-dated</Text>
          <Text style={type.money}>{postDated.length}</Text>
          <Money value={postDated.reduce((s, c) => s + c.amount, 0)} style={type.tiny} />
        </Card>
      </View>
      {cheques.length === 0 ? <EmptyState icon="document-text-outline" title="No cheques collected" hint="Cheques you collect appear here with their dates so post-dated ones are never missed." /> : null}
      {dueToday.length ? (
        <Section title="Due today">
          <Card style={{ padding: 0 }}>{dueToday.map(row)}</Card>
        </Section>
      ) : null}
      {postDated.length ? (
        <Section title="Post-dated — do not deposit yet">
          <Card style={{ padding: 0 }}>{postDated.map(row)}</Card>
        </Section>
      ) : null}
      {banked.length ? (
        <Section title="Ready for deposit / handed over">
          <Card style={{ padding: 0 }}>{banked.map(row)}</Card>
        </Section>
      ) : null}
    </Screen>
  );
}
