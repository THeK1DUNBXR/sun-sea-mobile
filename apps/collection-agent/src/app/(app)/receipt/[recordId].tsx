import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { fetchReceipt } from '@/api/agentApi';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
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
        <Text>Loading receipt…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.company}>{receipt.company?.name ?? 'SunSea'}</Text>
        <Text style={styles.muted}>{receipt.company?.address}</Text>
        <View style={styles.divider} />
        <Text style={styles.receiptNo}>Receipt {receipt.receiptNo}</Text>
        <Text style={styles.muted}>{formatDateTime(receipt.collectedAt)}</Text>
        <Text style={styles.amount}>{formatMoney(receipt.amount)}</Text>
        <Text style={styles.muted}>{amountInWords(receipt.amount ?? 0)}</Text>
        <View style={styles.divider} />
        <Row label="From" value={receipt.customer?.displayName ?? receipt.customer?.firmName} />
        <Row label="Invoice" value={receipt.invoice?.invoiceNo} />
        <Row label="Method" value={receipt.paymentMethod} />
        <Row label="Collected by" value={receipt.agentName} />
      </Card>

      <Button title="Share as PDF" onPress={onSharePdf} loading={sharing} />
      <Button title="Share on WhatsApp" onPress={onShareWhatsApp} variant="secondary" />
    </Screen>
  );
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

const styles = StyleSheet.create({
  company: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  receiptNo: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  amount: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primaryDark, marginTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.textMuted },
  rowValue: { color: colors.text, fontWeight: '600' },
});
