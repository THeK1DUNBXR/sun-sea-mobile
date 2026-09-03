import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { EmptyState, Field, Money, Pill } from '../components/ui';
import { Chips } from '../components/Chips';
import { Fab } from '../components/Fab';
import { Avatar } from '../components/Avatar';
import { tables, Customer } from '../db';
import { useQuery } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { todayYmd } from '../utils/format';
import { creditStatus } from '../utils/credit';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'route' | 'overdue' | 'hold' | 'leads';
type Sort = 'name' | 'outstanding';

export function CustomersScreen() {
  const nav = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const term = search.trim();
  const today = todayYmd();

  const customers = useQuery(() => tables.customers().query(Q.sortBy('firm_name', Q.asc)), []);
  const invoices = useQuery(() => tables.invoices().query(Q.where('balance', Q.gt(0))), []);
  const todaysVisits = useQuery(() => tables.visits().query(Q.where('planned_date', today), Q.where('status', Q.notEq('SKIPPED'))), [today]);

  const invByCustomer = useMemo(() => {
    const m = new Map<string, typeof invoices>();
    invoices.forEach((i) => m.set(i.customerId, [...(m.get(i.customerId) ?? []), i]));
    return m;
  }, [invoices]);
  const routeIds = useMemo(() => new Set(todaysVisits.map((v) => v.customerId)), [todaysVisits]);
  const creditById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof creditStatus>>();
    customers.forEach((c) => m.set(c.id, creditStatus({ creditLimit: c.creditLimit, status: c.status, invoices: (invByCustomer.get(c.id) ?? []).map((i) => ({ balance: i.balance, dueDate: i.dueDate, invoiceDate: i.invoiceDate })) })));
    return m;
  }, [customers, invByCustomer]);

  const list = useMemo(() => {
    const t = term.toLowerCase();
    let out = customers.filter((c) => {
      if (t && ![c.firmName, c.displayName, c.customerCode, c.city, c.mobile].some((f) => f?.toLowerCase().includes(t))) return false;
      const cr = creditById.get(c.id)!;
      if (filter === 'route') return routeIds.has(c.id);
      if (filter === 'overdue') return cr.hasOverdue;
      if (filter === 'hold') return cr.blocked || cr.onHold;
      if (filter === 'leads') return c.status === 'Lead';
      return true;
    });
    if (sort === 'outstanding') out = [...out].sort((a, b) => b.outstanding - a.outstanding);
    return out;
  }, [customers, term, filter, sort, creditById, routeIds]);

  const counts = {
    overdue: customers.filter((c) => creditById.get(c.id)?.hasOverdue).length,
    hold: customers.filter((c) => creditById.get(c.id)?.blocked || creditById.get(c.id)?.onHold).length,
    leads: customers.filter((c) => c.status === 'Lead').length,
  };

  return (
    <Screen title="Customers" scroll={false} padded={false} overlay={<Fab icon="add" label="New outlet" onPress={() => nav.navigate('LeadNew')} />}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Field placeholder="Search name, code, city or mobile" value={search} onChangeText={setSearch} autoCorrect={false} style={{ marginBottom: spacing.sm }} />
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: customers.length },
            { value: 'route', label: "Today's route", icon: 'map-outline', count: routeIds.size },
            { value: 'overdue', label: 'Overdue', icon: 'alert-circle-outline', count: counts.overdue, tone: 'danger' },
            { value: 'hold', label: 'On hold / blocked', count: counts.hold, tone: 'warning' },
            { value: 'leads', label: 'Leads', count: counts.leads },
          ]}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: 4 }}>
          <Text style={type.tiny}>{list.length} customers</Text>
          <Pressable onPress={() => setSort(sort === 'name' ? 'outstanding' : 'name')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
            <Ionicons name="swap-vertical" size={14} color={colors.primary} />
            <Text style={[type.tiny, { color: colors.primary, fontWeight: '700' }]}>Sort: {sort === 'name' ? 'Name' : 'Outstanding'}</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState icon="people-outline" title={term || filter !== 'all' ? 'No matching customers' : 'No customers yet'} hint={term || filter !== 'all' ? undefined : 'Run a sync to download the customer master.'} />}
        renderItem={({ item }: { item: Customer }) => {
          const cr = creditById.get(item.id)!;
          return (
            <Pressable onPress={() => nav.navigate('CustomerDetail', { customerId: item.id })} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, minHeight: 68, backgroundColor: pressed ? colors.primarySoft : colors.card, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <Avatar name={item.name} size={42} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={type.h3} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <Text style={type.tiny}>{[item.customerCode, item.city].filter(Boolean).join(' · ')}</Text>
                  {routeIds.has(item.id) ? <Pill text="Today" tone="info" /> : null}
                  {cr.hasOverdue ? <Pill text={`${cr.oldestOverdueDays}d overdue`} tone="danger" /> : null}
                  {cr.blocked ? <Pill text="Blocked" tone="danger" /> : cr.onHold ? <Pill text="On hold" tone="warning" /> : null}
                  {item.status === 'Lead' ? <Pill text="Lead" tone="accent" /> : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={item.outstanding} />
                <Text style={type.tiny}>outstanding</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
