import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, Field, KeyValue, Notice } from '../components/ui';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { spacing, type } from '../theme';
import { money, round2 } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { createOrder } from '../data/actions';
import { useAuth } from '../auth/AuthContext';

export function OrderReviewScreen({ route, navigation }: ScreenProps<'OrderReview'>) {
  const { draft } = route.params;
  const { bootstrap } = useAuth();
  const customer = useRecord(() => tables.customers().findAndObserve(draft.customerId), [draft.customerId]);
  const products = useQuery(() => tables.products().query(), []);
  const [remarks, setRemarks] = useState(draft.remarks ?? '');
  const [busy, setBusy] = useState(false);

  const priced = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return draft.lines.map((l) => {
      const p = byId.get(l.productId);
      const rate = p ? p.rateFor(customer?.gradeName ?? null) : 0;
      return { ...l, rate, amount: round2(rate * l.quantity) };
    });
  }, [draft.lines, products, customer?.gradeName]);
  const total = round2(priced.reduce((s, l) => s + l.amount, 0));
  const creditWarning = customer && customer.creditLimit > 0 && customer.outstanding + total > customer.creditLimit;

  const submit = async () => {
    setBusy(true);
    try {
      const order = await createOrder({ customerId: draft.customerId, visitId: draft.visitId, lines: draft.lines, remarks, estimatedTotal: total });
      navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'OrderSuccess', params: { orderId: order.id } }] });
    } catch (e) {
      Alert.alert('Could not save order', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Order Review" back footer={<Button title="Submit Order" onPress={submit} loading={busy} />}>
      <Text style={type.small}>Customer</Text>
      <Text style={type.h3}>{customer?.name ?? '—'}</Text>

      <Card style={{ marginTop: spacing.lg }}>
        {priced.map((l, idx) => (
          <View key={l.productId}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{l.productName}</Text>
                <Text style={type.small}>
                  {l.quantity}
                  {l.uom ? ` ${l.uom}` : ''} × {money(l.rate)}
                </Text>
              </View>
              <Text style={type.h3}>{money(l.amount)}</Text>
            </View>
            {idx < priced.length - 1 ? <Divider /> : null}
          </View>
        ))}
        <Divider />
        <KeyValue label="Total Amount (est.)" value={money(total)} valueStyle={{ fontSize: 18 }} />
        <Text style={type.tiny}>Final pricing, discounts and GST are applied by the ERP when the order is created.</Text>
      </Card>

      {creditWarning ? <Notice tone="warning" text={`This order takes the customer past the credit limit of ${money(customer!.creditLimit)} (outstanding ${money(customer!.outstanding)}). The office may hold it.`} /> : null}
      {bootstrap?.settings.orderStatusOnSubmit === 'DRAFT' ? <Notice tone="info" text="Orders from the field are created as Draft Orders for the office to confirm." /> : null}

      <Field label="Order Remarks (Optional)" value={remarks} onChangeText={setRemarks} placeholder="e.g. Deliver before 25 May" multiline style={{ marginTop: spacing.md }} />
    </Screen>
  );
}
