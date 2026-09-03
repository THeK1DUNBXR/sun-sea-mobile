import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, Field, KeyValue, Notice, Pill } from '../components/ui';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { money, round2 } from '../utils/format';
import { creditStatus } from '../utils/credit';
import type { ScreenProps } from '../navigation/types';
import { createOrder } from '../data/actions';
import { useAuth } from '../auth/AuthContext';
import { success } from '../utils/haptics';

export function OrderReviewScreen({ route, navigation }: ScreenProps<'OrderReview'>) {
  const { draft } = route.params;
  const { bootstrap } = useAuth();
  const customer = useRecord(() => tables.customers().findAndObserve(draft.customerId), [draft.customerId]);
  const products = useQuery(() => tables.products().query(), []);
  const open = useQuery(() => tables.invoices().query(Q.where('customer_id', draft.customerId), Q.where('balance', Q.gt(0))), [draft.customerId]);
  const [remarks, setRemarks] = useState(draft.remarks ?? '');
  const [busy, setBusy] = useState(false);

  const priced = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return draft.lines.map((l) => {
      const p = byId.get(l.productId);
      const rate = p ? p.rateFor(customer?.gradeName ?? null) : 0;
      return { ...l, rate, amount: round2(rate * l.quantity), stock: p?.stockLevel ?? 'unknown', onHand: p?.onHandQty ?? null };
    });
  }, [draft.lines, products, customer?.gradeName]);
  const total = round2(priced.reduce((s, l) => s + l.amount, 0));
  const credit = customer ? creditStatus({ creditLimit: customer.creditLimit, status: customer.status, invoices: open.map((i) => ({ balance: i.balance, dueDate: i.dueDate, invoiceDate: i.invoiceDate })), newOrderAmount: total }) : null;
  const needsApproval = !!credit && (!credit.withinLimit || credit.hasOverdue);
  const shortStock = priced.filter((l) => l.onHand !== null && l.onHand < l.quantity);

  const submit = async () => {
    setBusy(true);
    try {
      const order = await createOrder({ customerId: draft.customerId, visitId: draft.visitId, lines: draft.lines, remarks, estimatedTotal: total });
      void success();
      navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'OrderSuccess', params: { orderId: order.id } }] });
    } catch (e) {
      Alert.alert('Could not save order', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Order Review" subtitle={customer?.name} back footer={<Button title={needsApproval ? 'Submit for approval' : 'Submit Order'} onPress={submit} loading={busy} />}>
      <Card>
        {priced.map((l, idx) => (
          <View key={l.productId}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{l.productName}</Text>
                <Text style={type.small}>
                  {l.quantity}
                  {l.uom ? ` ${l.uom}` : ''} × {money(l.rate)}
                </Text>
                {l.onHand !== null && l.onHand < l.quantity ? <Pill text={`Only ${l.onHand} in stock`} tone="warning" /> : null}
              </View>
              <Text style={type.h3}>{money(l.amount)}</Text>
            </View>
            {idx < priced.length - 1 ? <Divider /> : null}
          </View>
        ))}
        <Divider />
        <KeyValue label="Total (est., before GST)" value={money(total)} valueStyle={{ fontSize: 18 }} />
        <Text style={type.tiny}>Final pricing, discounts and GST are applied by the ERP when the order is created.</Text>
      </Card>

      {credit ? (
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={type.label}>Credit check</Text>
            <Pill text={needsApproval ? 'Needs office approval' : 'Within terms'} tone={needsApproval ? 'warning' : 'success'} />
          </View>
          <KeyValue label="Open invoices" value={money(credit.openBalance)} />
          <KeyValue label="With this order" value={money(credit.exposure)} />
          <KeyValue label="Credit limit" value={customer?.creditLimit ? money(customer.creditLimit) : 'Not set'} />
          {!credit.withinLimit ? <Text style={[type.small, { color: colors.warning, marginTop: 4 }]}>Exceeds limit by {money(credit.exceededBy)}.</Text> : null}
          {credit.hasOverdue ? <Text style={[type.small, { color: colors.warning, marginTop: 4 }]}>{money(credit.overdueAmount)} overdue ({credit.oldestOverdueDays} days). Consider collecting before booking.</Text> : null}
        </Card>
      ) : null}

      {shortStock.length ? <Notice tone="warning" text="Some quantities exceed stock on hand — the office may part-dispatch." /> : null}
      {bootstrap?.settings.orderStatusOnSubmit === 'DRAFT' || !bootstrap ? <Notice tone="info" text="Orders from the field are created as Draft Orders for the office to confirm." /> : null}

      <Field label="Order remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="e.g. Deliver before 25 May, call before delivery" multiline />
    </Screen>
  );
}
