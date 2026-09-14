import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, {
  Easing,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fetchReceipt } from '@/api/agentApi';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, fontSize, radius, letterSpacing, sizes } from '@/ui/theme';
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
      const canShare = await Sharing.isAvailableAsync().catch(() => false);
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'This device can’t share files. The receipt is still saved on the app.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Couldn’t create the PDF', 'Something went wrong generating the receipt. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const onShareWhatsApp = async () => {
    const text = `Receipt ${receipt?.receiptNo ?? ''} for ${formatMoney(receipt?.amount)} received from ${
      receipt?.customer?.displayName ?? receipt?.customer?.firmName ?? ''
    }. Thank you!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('WhatsApp unavailable', 'WhatsApp isn’t installed on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('WhatsApp unavailable', 'WhatsApp isn’t installed on this device.');
    }
  };

  if (query.isError) {
    return (
      <Screen>
        <View style={styles.stateArea}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="offline"
            title="Couldn't load this receipt"
            subtitle="If this collection hasn't synced yet, it will be available once it does."
          />
          <Button title="Retry" onPress={() => query.refetch()} variant="secondary" style={styles.stateButton} />
        </View>
      </Screen>
    );
  }

  if (query.isLoading || !receipt) {
    return (
      <Screen>
        <View style={styles.stateArea}>
          <Text style={styles.loading}>Loading receipt…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ReceiptTicket receipt={receipt} />

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

function ReceiptTicket({ receipt }: { receipt: Receipt }) {
  const reduceMotion = useReducedMotion();
  const stampScale = useSharedValue(0);

  const stampStyle = useAnimatedStyle(() => ({ transform: [{ scale: stampScale.value }, { rotate: '4deg' }] }));

  const onTicketLayout = () => {
    // Fires once the ticket has slid in; the stamp lands right after with a
    // deliberate overshoot, like it was physically pressed down.
    stampScale.value = reduceMotion
      ? withTiming(1, { duration: 1 })
      : withDelay(
          260,
          withSequence(
            withTiming(1.35, { duration: 160, easing: Easing.out(Easing.ease) }),
            withTiming(0.92, { duration: 100 }),
            withSpring(1, { damping: 9, stiffness: 220 }),
          ),
        );
  };

  React.useEffect(onTicketLayout, [reduceMotion, stampScale]);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInUp.duration(420).easing(Easing.out(Easing.cubic))}
      style={styles.ticket}
    >
      <Card elevation="raised" style={styles.ticketCard}>
        <Animated.View style={[styles.paidStamp, stampStyle]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.paidStampText}>Paid</Text>
        </Animated.View>

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
    </Animated.View>
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

const NOTCH = sizes.ticketNotch;

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bgAlt },
  loading: { color: colors.textMuted },
  stateArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stateButton: { alignSelf: 'stretch' },
  ticket: { alignItems: 'center', paddingTop: spacing.sm },
  ticketCard: { width: '100%', alignItems: 'center', paddingTop: spacing.xl, gap: spacing.xxs },
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
    gap: spacing.xxs,
    backgroundColor: colors.successTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  paidStampText: { color: colors.success, fontWeight: '900', fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: letterSpacing.wideLabel },
  company: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  muted: { color: colors.textMuted, marginTop: spacing.xxs, textAlign: 'center' },
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
  words: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  receiptNo: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, width: '100%' },
  rowLabel: { color: colors.textMuted, fontWeight: '600' },
  rowValue: { color: colors.text, fontWeight: '700' },
  actions: { gap: spacing.sm },
});
