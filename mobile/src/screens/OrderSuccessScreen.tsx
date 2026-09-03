import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, KeyValue } from '../components/ui';
import { tables } from '../db';
import { useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDate, money } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { useSync } from '../sync/SyncContext';

export function OrderSuccessScreen({ route, navigation }: ScreenProps<'OrderSuccess'>) {
  const { orderId } = route.params;
  const order = useRecord(() => tables.orders().findAndObserve(orderId), [orderId]);
  const customer = useRecord(() => (order ? tables.customers().findAndObserve(order.customerId) : null), [order?.customerId]);
  const { online } = useSync();

  return (
    <Screen title="Order Submitted" right={<View />} footer={<Button title="Done" onPress={() => navigation.popToTop()} />}>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cart" size={40} color={colors.primary} />
        </View>
        <Text style={[type.h2, { marginTop: spacing.md }]}>{customer?.name ?? ''}</Text>
        {order ? (
          <Badge
            text={order.status === 'PENDING' ? (online ? 'Saved · syncing to ERP' : 'Saved offline · will sync') : order.status === 'FAILED' ? 'Sync failed' : `${order.orderNo ?? ''} · ${order.status}`}
            tone={order.status === 'PENDING' ? 'info' : order.status === 'FAILED' ? 'danger' : 'success'}
          />
        ) : null}
      </View>
      {order ? (
        <Card>
          <KeyValue label="Order Date" value={fmtDate(order.orderDate)} />
          <Divider />
          <KeyValue label="Items" value={`${order.items.length} (${order.totalQty} units)`} />
          <Divider />
          <KeyValue label="Estimated Value" value={money(order.totalAmount)} />
          {order.remarks ? (
            <>
              <Divider />
              <KeyValue label="Remarks" value={order.remarks} />
            </>
          ) : null}
          {order.syncError ? <Text style={[type.small, { color: colors.danger, marginTop: 8 }]}>{order.syncError}</Text> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
