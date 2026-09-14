import React, { useState } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchAssignment, fetchCustomerLedger } from '@/api/agentApi';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, letterSpacing } from '@/ui/theme';
import { assignmentStatusMeta, formatDate, formatMoney, isOverdue } from '@/ui/format';

/** Normalizes an Indian mobile number for tel:/wa.me links: strips
 * formatting, drops a leading "0" trunk prefix or "+", and adds the 91
 * country code when the number is 10 raw digits. Returns null for anything
 * that clearly isn't enough digits to be a real number. */
function normalizeIndianPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? digits : null;
}

async function openUrlSafely(url: string, unavailableMessage: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Can’t open this', unavailableMessage);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Can’t open this', unavailableMessage);
  }
}

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

  const phone = normalizeIndianPhone(customer?.phones?.[0]);
  const address = customer?.addresses?.[0];
  const addressLine = address
    ? [address.address?.addressLine1, address.address?.addressLine2, address.address?.city, address.address?.pincode]
        .filter(Boolean)
        .join(', ')
    : '';
  const hasAddress = Boolean(addressLine || (address?.latitude != null && address?.longitude != null));

  const onCall = () => phone && openUrlSafely(`tel:${phone}`, 'No phone app is available to place this call.');
  const onWhatsApp = () =>
    phone && openUrlSafely(`https://wa.me/${phone}`, 'WhatsApp isn’t installed on this device.');
  const onNavigate = () => {
    const geoQuery =
      address?.latitude != null && address?.longitude != null
        ? `${address.latitude},${address.longitude}`
        : encodeURIComponent(addressLine);
    openUrlSafely(`geo:0,0?q=${geoQuery}`, 'No maps app is available to navigate there.');
  };

  if (query.isError) {
    return (
      <Screen>
        <View style={styles.ledgerCentered}>
          <EmptyState icon="cloud-offline-outline" tone="offline" title="Couldn't load this assignment" subtitle="Check your connection and try again." />
          <Button title="Retry" onPress={() => query.refetch()} variant="secondary" style={styles.retryButton} />
        </View>
      </Screen>
    );
  }

  if (query.isLoading || !assignment) {
    return (
      <Screen>
        <View style={styles.ledgerCentered}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  const statusMeta = assignmentStatusMeta(assignment.status);

  return (
    <Screen
      footer={
        <View style={styles.actionRow}>
          <Button
            title="Record Collection"
            onPress={() => router.push(`/(app)/collect/${assignment.id}`)}
            icon={<Ionicons name="cash-outline" size={20} color={colors.onPrimary} />}
          />
          <Button
            title="Record Visit"
            onPress={() => router.push(`/(app)/visit/${assignment.id}`)}
            variant="secondary"
            icon={<Ionicons name="clipboard-outline" size={20} color={colors.primary} />}
          />
        </View>
      }
    >
      <Card elevation="raised">
        <View style={styles.rowBetween}>
          <Text style={styles.invoiceNo}>{invoice?.invoiceNo}</Text>
          <Badge label={statusMeta.label} tone={statusMeta.tone} />
        </View>
        <Text style={styles.muted}>Due {formatDate(invoice?.dueDate)}</Text>
        <View style={styles.badgeRow}>
          {overdue && <Badge label="Overdue" tone="danger" dot />}
          {assignment.promise?.promisedDate && (
            <Badge label={`PTP ${formatDate(assignment.promise.promisedDate)}`} tone="warning" dot />
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
        {addressLine ? (
          <Text style={styles.muted}>{addressLine}</Text>
        ) : (
          <Text style={styles.mutedFaint}>No address on file</Text>
        )}
        <View style={styles.contactRow}>
          <Button
            title="Call"
            onPress={onCall}
            disabled={!phone}
            variant="secondary"
            fullWidth={false}
            style={styles.contactBtn}
            accessibilityLabel={phone ? 'Call customer' : 'Call — no phone number on file'}
            icon={<Ionicons name="call-outline" size={18} color={phone ? colors.primary : colors.textFaint} />}
          />
          <Button
            title="WhatsApp"
            onPress={onWhatsApp}
            disabled={!phone}
            variant="secondary"
            fullWidth={false}
            style={styles.contactBtn}
            accessibilityLabel={phone ? 'Message customer on WhatsApp' : 'WhatsApp — no phone number on file'}
            icon={<Ionicons name="logo-whatsapp" size={18} color={phone ? colors.primary : colors.textFaint} />}
          />
          <Button
            title="Navigate"
            onPress={onNavigate}
            disabled={!hasAddress}
            variant="secondary"
            fullWidth={false}
            style={styles.contactBtn}
            accessibilityLabel={hasAddress ? 'Navigate to customer' : 'Navigate — no address on file'}
            icon={<Ionicons name="navigate-outline" size={18} color={hasAddress ? colors.primary : colors.textFaint} />}
          />
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
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.productName ?? 'Item'}
                </Text>
                {item.quantity != null && item.unitPrice != null ? (
                  <Text style={styles.itemMeta}>
                    {item.quantity} × {formatMoney(item.unitPrice)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.muted}>{formatMoney(item.lineTotal)}</Text>
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

      <Modal visible={ledgerOpen} animationType="slide" onRequestClose={() => setLedgerOpen(false)}>
        <Screen
          footer={
            <View style={styles.actionRow}>
              {ledger.isError ? <Button title="Retry" onPress={() => ledger.refetch()} variant="secondary" /> : null}
              <Button title="Close" onPress={() => setLedgerOpen(false)} variant="secondary" />
            </View>
          }
        >
          <Text style={styles.sectionTitle}>Customer ledger</Text>
          {ledger.isLoading ? (
            <View style={styles.ledgerCentered}>
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : ledger.isError ? (
            <View style={styles.ledgerCentered}>
              <EmptyState icon="cloud-offline-outline" tone="offline" title="Couldn't load the ledger" subtitle="Check your connection and try again." />
            </View>
          ) : (
            <>
              <Text style={styles.subsectionTitle}>Invoices</Text>
              {(ledger.data?.outstandingInvoices ?? []).length === 0 ? (
                <Text style={styles.mutedFaint}>No invoices for this customer.</Text>
              ) : (
                (ledger.data?.outstandingInvoices ?? []).map((inv) => (
                  <View key={inv.id} style={styles.itemRow}>
                    <Text style={styles.itemDesc}>{inv.invoiceNo}</Text>
                    <Text style={styles.muted}>{formatMoney(inv.outstanding)}</Text>
                  </View>
                ))
              )}
              <Text style={styles.subsectionTitle}>Recent receipts</Text>
              {(ledger.data?.recentReceipts ?? []).length === 0 ? (
                <Text style={styles.mutedFaint}>No receipts yet.</Text>
              ) : (
                (ledger.data?.recentReceipts ?? []).map((r) => (
                  <View key={r.id} style={styles.itemRow}>
                    <Text style={styles.itemDesc}>{r.receiptNo}</Text>
                    <Text style={styles.muted}>{formatMoney(r.amount)}</Text>
                  </View>
                ))
              )}
            </>
          )}
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
  invoiceNo: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  muted: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  mutedFaint: { color: colors.textFaint, fontSize: fontSize.sm, marginTop: spacing.xxs, fontStyle: 'italic' },
  itemMeta: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.xxs },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  amountBlock: { alignItems: 'flex-start' },
  amountValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  amountValueEmphasis: { color: colors.primaryDark, fontSize: fontSize.xxl, fontWeight: '900' },
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
  ledgerCentered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  retryButton: { alignSelf: 'stretch' },
});
