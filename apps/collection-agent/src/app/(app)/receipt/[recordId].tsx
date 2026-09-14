import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { fetchReceipt } from '@/api/agentApi';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, radius, letterSpacing } from '@/ui/theme';
import { amountInWords, formatDateTime, formatMoney } from '@/ui/format';
import type { Receipt } from '@/types/models';

export default function ReceiptScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const [sharing, setSharing] = useState(false);

  const query = useQuery({
    queryKey: ['receipt', recordId],
    queryFn: () => fetchReceipt(recordId!),
    enabled: Boolean(recordId),
  });
  const receipt = query.data;

  const html = buildReceiptHtml(receipt);

  const onSharePdf = async () => {
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } finally {
      setSharing(false);
    }
  };

  const onShareWhatsApp = () => {
    const text = `Receipt ${receipt?.receiptNo ?? ''} for ${formatMoney(receipt?.amount)} received from ${
      receipt?.customer?.displayName ?? receipt?.customer?.firmName ?? ''
    }. Thank you!`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  if (query.isLoading || !receipt) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading receipt…</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.ticket}>
        <Card elevation="raised" style={styles.ticketCard}>
          <View style={styles.paidStamp}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.paidStampText}>Paid</Text>
          </View>

          <Text style={styles.company}>{receipt.company?.name ?? 'SunSea'}</Text>
          {receipt.company?.address ? <Text style={styles.muted}>{receipt.company.address}</Text> : null}

          <TearLine />

          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(receipt.amount)}
          </Text>
          <Text style={styles.words}>{amountInWords(receipt.amount ?? 0)}</Text>
          <Text style={styles.receiptNo}>Receipt {receipt.receiptNo}</Text>
          <Text style={styles.muted}>{formatDateTime(receipt.collectedAt)}</Text>

          <TearLine />

          <Row label="From" value={receipt.customer?.displayName ?? receipt.customer?.firmName} />
          <Row label="Invoice" value={receipt.invoice?.invoiceNo} />
          <Row label="Method" value={receipt.paymentMethod} />
          <Row label="Collected by" value={receipt.agentName} />
        </Card>
        <View style={styles.notchLeft} />
        <View style={styles.notchRight} />
      </View>

      <View style={styles.actions}>
        <Button
          title="Share as PDF"
          onPress={onSharePdf}
          loading={sharing}
          icon={<Ionicons name="document-text-outline" size={20} color={colors.onPrimary} />}
        />
        <Button
          title="Share on WhatsApp"
          onPress={onShareWhatsApp}
          variant="secondary"
          icon={<Ionicons name="logo-whatsapp" size={20} color={colors.primary} />}
        />
      </View>
    </Screen>
  );
}

function TearLine() {
  return <View style={styles.tearLine} />;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function buildReceiptHtml(receipt?: Receipt): string {
  const r = receipt;
  if (!r) return '<html><body>No receipt</body></html>';
  return `<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
    <h2>${r.company?.name ?? 'SunSea'}</h2>
    <p>${r.company?.address ?? ''}</p>
    <hr/>
    <h3>Receipt ${r.receiptNo ?? ''}</h3>
    <p>${new Date(r.collectedAt ?? Date.now()).toLocaleString('en-IN')}</p>
    <h1>${r.amount != null ? `₹${r.amount}` : ''}</h1>
    <p>${amountInWords(r.amount ?? 0)}</p>
    <hr/>
    <p><b>From:</b> ${r.customer?.displayName ?? r.customer?.firmName ?? ''}</p>
    <p><b>Invoice:</b> ${r.invoice?.invoiceNo ?? ''}</p>
    <p><b>Method:</b> ${r.paymentMethod ?? ''}</p>
    <p><b>Collected by:</b> ${r.agentName ?? ''}</p>
  </body></html>`;
}

const NOTCH = 18;

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bgAlt },
  loading: { color: colors.textMuted, padding: spacing.lg },
  ticket: { alignItems: 'center', paddingTop: spacing.sm },
  ticketCard: { width: '100%', alignItems: 'center', paddingTop: spacing.xl, gap: 2 },
  notchLeft: {
    position: 'absolute',
    left: -NOTCH / 2,
    top: '50%',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bgAlt,
  },
  notchRight: {
    position: 'absolute',
    right: -NOTCH / 2,
    top: '50%',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bgAlt,
  },
  paidStamp: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    transform: [{ rotate: '4deg' }],
  },
  paidStampText: { color: colors.success, fontWeight: '900', fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: letterSpacing.wideLabel },
  company: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  muted: { color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  tearLine: {
    width: '100%',
    borderStyle: 'dashed',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    marginVertical: spacing.md,
  },
  amount: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: letterSpacing.tightDisplay,
  },
  words: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', marginTop: 4, marginBottom: spacing.sm, fontStyle: 'italic' },
  receiptNo: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, width: '100%' },
  rowLabel: { color: colors.textMuted, fontWeight: '600' },
  rowValue: { color: colors.text, fontWeight: '700' },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
