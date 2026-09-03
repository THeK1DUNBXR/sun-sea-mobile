import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Button, Card, Checkbox, Divider, EmptyState, Field, KeyValue, Notice } from '../components/ui';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { fmtDate, money, round2 } from '../utils/format';
import type { CollectionDraft, ScreenProps } from '../navigation/types';

interface Line {
  selected: boolean;
  amount: string;
}

export function CollectionEntryScreen({ route, navigation }: ScreenProps<'CollectionEntry'>) {
  const { customerId, visitId } = route.params;
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const invoices = useQuery(() => tables.invoices().query(Q.where('customer_id', customerId), Q.where('balance', Q.gt(0)), Q.sortBy('invoice_date', Q.asc)), [customerId]);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [onAccount, setOnAccount] = useState('');

  // Keep the per-invoice state in step with the invoice list (new pulls etc.).
  useEffect(() => {
    setLines((prev) => {
      const next: Record<string, Line> = {};
      for (const inv of invoices) next[inv.id] = prev[inv.id] ?? { selected: false, amount: String(inv.balance) };
      return next;
    });
  }, [invoices]);

  const allSelected = invoices.length > 0 && invoices.every((i) => lines[i.id]?.selected);
  const toggleAll = () =>
    setLines((prev) => {
      const next = { ...prev };
      for (const inv of invoices) next[inv.id] = { selected: !allSelected, amount: String(inv.balance) };
      return next;
    });

  const allocations = useMemo(
    () =>
      invoices
        .filter((i) => lines[i.id]?.selected)
        .map((i) => ({ invoiceId: i.id, invoiceNo: i.invoiceNo, amount: round2(Number(lines[i.id]?.amount) || 0), balance: i.balance }))
        .filter((a) => a.amount > 0),
    [invoices, lines]
  );
  const overAllocated = allocations.filter((a) => a.amount > a.balance + 0.009);
  const onAccountAmt = round2(Number(onAccount) || 0);
  const total = round2(allocations.reduce((s, a) => s + a.amount, 0) + onAccountAmt);

  const proceed = () => {
    const draft: CollectionDraft = {
      customerId,
      visitId,
      allocations: allocations.map(({ invoiceId, invoiceNo, amount }) => ({ invoiceId, invoiceNo, amount })),
      onAccount: onAccountAmt,
      total,
    };
    navigation.navigate('PaymentMode', { draft });
  };

  return (
    <Screen
      title="Collection Entry"
      back
      footer={
        <View>
          <KeyValue label="Total Collection" value={money(total)} valueStyle={{ fontSize: 18 }} />
          <Button title="Proceed to Payment" onPress={proceed} disabled={total <= 0 || overAllocated.length > 0} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={type.small}>Customer</Text>
          <Text style={type.h3}>{customer?.name ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={type.small}>Outstanding</Text>
          <Text style={type.h3}>{money(customer?.outstanding ?? 0)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <Text style={type.h3}>Select Invoices</Text>
        {invoices.length > 0 ? (
          <Pressable onPress={toggleAll}>
            <Text style={[type.small, { color: colors.primary, fontWeight: '600' }]}>{allSelected ? 'Clear All' : 'Select All'}</Text>
          </Pressable>
        ) : null}
      </View>

      {overAllocated.length > 0 ? <Notice tone="danger" text={`Amount exceeds the balance on ${overAllocated.map((a) => a.invoiceNo).join(', ')}.`} /> : null}

      <Card style={{ padding: 0 }}>
        {invoices.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No open invoices" hint="You can still record an on-account (advance) collection below." />
        ) : (
          invoices.map((inv, idx) => {
            const line = lines[inv.id] ?? { selected: false, amount: String(inv.balance) };
            return (
              <View key={inv.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md }}>
                  <Checkbox checked={line.selected} onChange={(v) => setLines((p) => ({ ...p, [inv.id]: { ...line, selected: v } }))} />
                  <Pressable style={{ flex: 1 }} onPress={() => setLines((p) => ({ ...p, [inv.id]: { ...line, selected: !line.selected } }))}>
                    <Text style={type.h3}>{inv.invoiceNo}</Text>
                    <Text style={type.small}>
                      Due: {fmtDate(inv.dueDate || inv.invoiceDate)} · Bal {money(inv.balance)}
                    </Text>
                  </Pressable>
                  <TextInput
                    keyboardType="decimal-pad"
                    editable={line.selected}
                    value={line.amount}
                    onChangeText={(t) => setLines((p) => ({ ...p, [inv.id]: { ...line, amount: t.replace(/[^\d.]/g, '') } }))}
                    style={{
                      width: 104,
                      textAlign: 'right',
                      borderWidth: 1,
                      borderColor: line.selected ? colors.primary : colors.line,
                      borderRadius: radius.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      color: line.selected ? colors.text : colors.faint,
                      backgroundColor: line.selected ? colors.card : colors.bg,
                    }}
                  />
                </View>
                {idx < invoices.length - 1 ? <Divider /> : null}
              </View>
            );
          })
        )}
      </Card>

      <Field
        label="On-account / advance amount (optional)"
        hint="Money received that is not against a specific invoice. It is posted to the customer ledger."
        keyboardType="decimal-pad"
        value={onAccount}
        onChangeText={(t) => setOnAccount(t.replace(/[^\d.]/g, ''))}
        placeholder="0"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}
