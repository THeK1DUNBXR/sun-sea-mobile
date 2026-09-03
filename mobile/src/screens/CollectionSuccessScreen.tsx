import React from 'react';
import { Linking, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, KeyValue } from '../components/ui';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDateTime, money } from '../utils/format';
import { receiptText, whatsappUrl } from '../utils/receipt';
import type { ScreenProps } from '../navigation/types';
import { useSync } from '../sync/SyncContext';
import { useAuth } from '../auth/AuthContext';
import { markReceiptShared } from '../data/extras';

export function CollectionSuccessScreen({ route, navigation }: ScreenProps<'CollectionSuccess'>) {
  const { collectionId } = route.params;
  const toast = useToast();
  const { agent, bootstrap } = useAuth();
  const c = useRecord(() => tables.collections().findAndObserve(collectionId), [collectionId]);
  const customer = useRecord(() => (c ? tables.customers().findAndObserve(c.customerId) : null), [c?.customerId]);
  const { online } = useSync();

  const text = c
    ? receiptText({
        companyName: bootstrap?.company?.companyName ?? 'Sun Sea ERP',
        receiptNo: c.receiptNo,
        customerName: customer?.name ?? 'Customer',
        customerCode: customer?.customerCode,
        amount: c.amount,
        paymentMode: c.paymentMode,
        referenceNo: c.referenceNo,
        bankName: c.bankName,
        chequeDate: c.chequeDate,
        collectedAt: c.collectedAt,
        allocations: c.allocations.map((a) => ({ invoiceNo: a.invoiceNo, amount: a.amount })),
        onAccount: c.amount - c.allocations.reduce((s, a) => s + a.amount, 0),
        agentName: agent?.fullName ?? 'Field agent',
        balanceAfter: customer?.outstanding ?? null,
      })
    : '';

  const shareWhatsApp = async () => {
    if (!c) return;
    const url = whatsappUrl(customer?.mobile, text);
    if (!url) return toast.show('Customer has no mobile number — use Share instead', 'warning');
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) return toast.show('WhatsApp is not installed', 'warning');
    await Linking.openURL(url);
    await markReceiptShared(c);
  };
  const shareSheet = async () => {
    if (!c) return;
    await Share.share({ message: text, title: 'Payment receipt' });
    await markReceiptShared(c);
  };

  return (
    <Screen
      title="Collection Successful"
      right={<View />}
      footer={
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button title="Send on WhatsApp" icon="logo-whatsapp" variant="success" style={{ flex: 1 }} onPress={shareWhatsApp} />
            <Button title="Share" icon="share-social-outline" variant="outline" style={{ flex: 1 }} onPress={shareSheet} />
          </View>
          <Button title="Done" onPress={() => navigation.popToTop()} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={46} color={colors.success} />
        </View>
        <Text style={[type.h2, { marginTop: spacing.md }]}>{customer?.name ?? ''}</Text>
        {c ? (
          <View style={{ marginTop: 6 }}>
            <Badge
              text={c.status === 'PENDING' ? (online ? 'Saved · syncing to ERP' : 'Saved offline · will sync') : c.status === 'POSTED' ? `Posted · ${c.receiptNo}` : c.status === 'FAILED' ? 'Sync failed' : c.status}
              tone={c.status === 'POSTED' ? 'success' : c.status === 'FAILED' ? 'danger' : 'info'}
            />
          </View>
        ) : null}
        {c?.sharedAt ? <Text style={[type.tiny, { marginTop: 6 }]}>Receipt shared {fmtDateTime(c.sharedAt)}</Text> : null}
      </View>

      {c ? (
        <Card>
          <KeyValue label="Amount Collected" value={money(c.amount)} valueStyle={{ fontSize: 20 }} />
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
          <Divider />
          <KeyValue label="Balance outstanding" value={money(Math.max(0, customer?.outstanding ?? 0))} />
          {c.syncError ? <Text style={[type.small, { color: colors.danger, marginTop: 8 }]}>{c.syncError}</Text> : null}
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md, backgroundColor: colors.bg }}>
        <Text style={type.label}>Receipt preview</Text>
        <Text style={[type.small, { marginTop: 6, color: colors.text, fontFamily: undefined }]}>{text.replace(/\*/g, '').replace(/_/g, '')}</Text>
      </Card>
    </Screen>
  );
}
