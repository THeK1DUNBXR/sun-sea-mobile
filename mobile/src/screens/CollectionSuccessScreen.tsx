import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, KeyValue } from '../components/ui';
import { tables } from '../db';
import { useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDateTime, money } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { useSync } from '../sync/SyncContext';

export function CollectionSuccessScreen({ route, navigation }: ScreenProps<'CollectionSuccess'>) {
  const { collectionId } = route.params;
  const c = useRecord(() => tables.collections().findAndObserve(collectionId), [collectionId]);
  const customer = useRecord(() => (c ? tables.customers().findAndObserve(c.customerId) : null), [c?.customerId]);
  const { online } = useSync();

  return (
    <Screen title="Collection Successful" right={<View />} footer={<Button title="Done" onPress={() => navigation.popToTop()} />}>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={44} color={colors.primary} />
        </View>
        <Text style={[type.h2, { marginTop: spacing.md }]}>{customer?.name ?? ''}</Text>
        {c ? (
          <Badge
            text={c.status === 'PENDING' ? (online ? 'Saved · syncing to ERP' : 'Saved offline · will sync') : c.status === 'POSTED' ? `Posted · ${c.receiptNo}` : c.status === 'FAILED' ? 'Sync failed' : c.status}
            tone={c.status === 'POSTED' ? 'success' : c.status === 'FAILED' ? 'danger' : 'info'}
          />
        ) : null}
      </View>

      {c ? (
        <Card>
          <KeyValue label="Amount Collected" value={money(c.amount)} valueStyle={{ fontSize: 18 }} />
          <Divider />
          <KeyValue label="Payment Mode" value={c.paymentMode} />
          {c.referenceNo ? (
            <>
              <Divider />
              <KeyValue label="Reference" value={c.referenceNo} />
            </>
          ) : null}
          {c.bankName ? (
            <>
              <Divider />
              <KeyValue label="Bank" value={c.bankName} />
            </>
          ) : null}
          <Divider />
          <KeyValue label="Date & Time" value={fmtDateTime(c.collectedAt)} />
          {c.allocations.length ? (
            <>
              <Divider />
              <Text style={[type.small, { marginTop: 6, marginBottom: 2 }]}>Applied to</Text>
              {c.allocations.map((a) => (
                <KeyValue key={a.invoiceId} label={a.invoiceNo} value={money(a.amount)} />
              ))}
            </>
          ) : null}
          {c.syncError ? <Text style={[type.small, { color: colors.danger, marginTop: 8 }]}>{c.syncError}</Text> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
