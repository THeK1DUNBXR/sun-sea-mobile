import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchAssignment, fetchCustomerLedger } from '@/api/agentApi';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDate, formatMoney, isOverdue } from '@/ui/format';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const query = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => fetchAssignment(id!),
    enabled: Boolean(id),
  });

  const assignment = query.data;
  const customer = assignment?.customer;
  const invoice = assignment?.invoice;
  const overdue = isOverdue(invoice?.dueDate);

  const ledger = useQuery({
    queryKey: ['ledger', customer?.id],
    queryFn: () => fetchCustomerLedger(customer!.id),
    enabled: ledgerOpen && Boolean(customer?.id),
  });

  const phone = customer?.phones?.[0];
  const address = customer?.addresses?.[0];

  const onCall = () => phone && Linking.openURL(`tel:${phone}`);
  const onWhatsApp = () => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, '');
    const withCountry = digits.startsWith('91') ? digits : `91${digits}`;
    Linking.openURL(`https://wa.me/${withCountry}`);
  };
  const onNavigate = () => {
    if (address?.latitude != null && address?.longitude != null) {
      Linking.openURL(`geo:${address.latitude},${address.longitude}?q=${address.latitude},${address.longitude}`);
    } else {
      const addressQuery = encodeURIComponent(
        [address?.line1, address?.line2, address?.city, address?.pincode].filter(Boolean).join(', '),
      );
      Linking.openURL(`geo:0,0?q=${addressQuery}`);
    }
  };

  if (query.isLoading || !assignment) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.invoiceNo}>{invoice?.invoiceNo}</Text>
          <Badge label={assignment.status} />
        </View>
        <Text style={styles.muted}>Due {formatDate(invoice?.dueDate)}</Text>
        <View style={styles.badgeRow}>
          {overdue && <Badge label="Overdue" tone="danger" />}
          {assignment.promise?.promisedDate && (
            <Badge label={`PTP ${formatDate(assignment.promise.promisedDate)}`} tone="warning" />
          )}
        </View>
        <View style={styles.amountRow}>
          <AmountBlock label="Grand total" value={invoice?.grandTotal} />
          <AmountBlock label="Paid" value={invoice?.paid} />
          <AmountBlock label="Outstanding" value={invoice?.outstanding} emphasize />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{customer?.displayName ?? customer?.firmName}</Text>
        {customer?.gstin ? <Text style={styles.muted}>GSTIN {customer.gstin}</Text> : null}
        {address ? (
          <Text style={styles.muted}>
            {[address.line1, address.line2, address.city, address.pincode].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        <View style={styles.contactRow}>
          <Button title="Call" onPress={onCall} variant="secondary" fullWidth={false} style={styles.contactBtn} />
          <Button title="WhatsApp" onPress={onWhatsApp} variant="secondary" fullWidth={false} style={styles.contactBtn} />
          <Button title="Navigate" onPress={onNavigate} variant="secondary" fullWidth={false} style={styles.contactBtn} />
        </View>
        <Button title="Customer ledger" onPress={() => setLedgerOpen(true)} variant="ghost" />
      </Card>

      {assignment.instructions ? (
        <Card>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.muted}>{assignment.instructions}</Text>
        </Card>
      ) : null}

      {(invoice?.items?.length ?? 0) > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Items</Text>
          {invoice!.items!.map((item, idx) => (
            <View key={item.id ?? idx} style={styles.itemRow}>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={styles.muted}>{formatMoney(item.amount)}</Text>
            </View>
          ))}
        </Card>
      )}

      {(assignment.visits?.length ?? 0) > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Previous visits</Text>
          {assignment.visits!.map((v) => (
            <View key={v.id} style={styles.itemRow}>
              <Text style={styles.itemDesc}>{v.outcome}</Text>
              <Text style={styles.muted}>{formatDate(v.visitedAt)}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.actionRow}>
        <Button title="Record Collection" onPress={() => router.push(`/(app)/collect/${assignment.id}`)} />
        <Button title="Record Visit" onPress={() => router.push(`/(app)/visit/${assignment.id}`)} variant="secondary" />
      </View>

      <Modal visible={ledgerOpen} animationType="slide" onRequestClose={() => setLedgerOpen(false)}>
        <Screen>
          <Text style={styles.sectionTitle}>Customer ledger</Text>
          {ledger.isLoading ? (
            <Text>Loading…</Text>
          ) : (
            <>
              <Text style={styles.subsectionTitle}>Outstanding invoices</Text>
              {(ledger.data?.outstandingInvoices ?? []).map((inv) => (
                <View key={inv.id} style={styles.itemRow}>
                  <Text style={styles.itemDesc}>{inv.invoiceNo}</Text>
                  <Text style={styles.muted}>{formatMoney(inv.outstanding)}</Text>
                </View>
              ))}
              <Text style={styles.subsectionTitle}>Recent receipts</Text>
              {(ledger.data?.recentReceipts ?? []).map((r) => (
                <View key={r.id} style={styles.itemRow}>
                  <Text style={styles.itemDesc}>{r.receiptNo}</Text>
                  <Text style={styles.muted}>{formatMoney(r.amount)}</Text>
                </View>
              ))}
            </>
          )}
          <Button title="Close" onPress={() => setLedgerOpen(false)} variant="secondary" />
        </Screen>
      </Modal>
    </Screen>
  );
}

function AmountBlock({ label, value, emphasize }: { label: string; value?: number; emphasize?: boolean }) {
  return (
    <View style={styles.amountBlock}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.amountValue, emphasize && styles.amountValueEmphasis]}>{formatMoney(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNo: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  amountBlock: { alignItems: 'flex-start' },
  amountValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  amountValueEmphasis: { color: colors.primaryDark, fontSize: fontSize.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subsectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  contactBtn: { flexGrow: 1 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDesc: { color: colors.text, flex: 1, marginRight: spacing.sm },
  actionRow: { gap: spacing.sm },
});
