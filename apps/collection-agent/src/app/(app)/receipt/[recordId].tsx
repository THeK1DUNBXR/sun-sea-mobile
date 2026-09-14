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
import { colors, spacing, type, radius, sizes, monoFamily, fontWeight } from '@/ui/theme';
import { amountInWords, formatDateTime, formatMoney, paymentMethodLabel } from '@/ui/format';
import { copy } from '@/copy';
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
        Alert.alert(copy.receipt.sharingUnavailableTitle, copy.receipt.sharingUnavailableMessage);
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch {
      Alert.alert(copy.receipt.pdfFailedTitle, copy.receipt.pdfFailedMessage);
    } finally {
      setSharing(false);
    }
  };

  const onShareWhatsApp = async () => {
    const text = copy.receipt.whatsAppShareText(
      receipt?.receiptNo ?? '',
      formatMoney(receipt?.amount),
      receipt?.customer?.displayName ?? receipt?.customer?.firmName ?? '',
    );
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(copy.receipt.whatsAppUnavailableTitle, copy.receipt.whatsAppUnavailableMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(copy.receipt.whatsAppUnavailableTitle, copy.receipt.whatsAppUnavailableMessage);
    }
  };

  if (query.isError) {
    return (
      <Screen>
        <View style={styles.stateArea}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="offline"
            title={copy.receipt.loadErrorTitle}
            subtitle={copy.receipt.loadErrorSubtitle}
          />
          <Button title={copy.profile.retry} onPress={() => query.refetch()} variant="secondary" style={styles.stateButton} />
        </View>
      </Screen>
    );
  }

  if (query.isLoading || !receipt) {
    return (
      <Screen>
        <View style={styles.stateArea}>
          <Text style={styles.loading}>{copy.receipt.loading}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ReceiptTicket receipt={receipt} />

      <View style={styles.actions}>
        <Button
          title={copy.receipt.shareAsPdf}
          onPress={onSharePdf}
          loading={sharing}
          icon={<Ionicons name="document-text-outline" size={20} color={colors.onPrimary} />}
        />
        <Button
          title={copy.receipt.shareOnWhatsApp}
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
          <Text style={styles.paidStampText}>{copy.receipt.paidStamp}</Text>
        </Animated.View>

        <Text style={styles.company}>{receipt.company?.name ?? 'SunSea'}</Text>
        {receipt.company?.address ? <Text style={styles.muted}>{receipt.company.address}</Text> : null}

        <TearLine />

        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.6}>
          {formatMoney(receipt.amount)}
        </Text>
        <Text style={styles.words}>{amountInWords(receipt.amount ?? 0)}</Text>
        <Text style={styles.receiptNo}>Receipt {receipt.receiptNo}</Text>
        <Text style={styles.muted}>{formatDateTime(receipt.collectedAt)}</Text>

        <TearLine />

        <Row label={copy.receipt.receivedFrom} value={receipt.customer?.displayName ?? receipt.customer?.firmName} />
        <Row label={copy.receipt.towardsInvoice} value={receipt.invoice?.invoiceNo} />
        <Row label={copy.receipt.mode} value={receipt.paymentMethod ? paymentMethodLabel(receipt.paymentMethod) : undefined} />
        <Row label={copy.receipt.receivedBy} value={receipt.agentName} />
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
    <p><b>Received from:</b> ${r.customer?.displayName ?? r.customer?.firmName ?? ''}</p>
    <p><b>Towards invoice:</b> ${r.invoice?.invoiceNo ?? ''}</p>
    <p><b>Mode:</b> ${r.paymentMethod ? paymentMethodLabel(r.paymentMethod) : ''}</p>
    <p><b>Received by:</b> ${r.agentName ?? ''}</p>
  </body></html>`;
}

const NOTCH = sizes.ticketNotch;

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bgAlt },
  loading: { ...type.body, color: colors.textMuted },
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
  paidStampText: { ...type.label, color: colors.success, textTransform: 'uppercase' },
  company: { ...type.headline, color: colors.text },
  muted: { ...type.body, color: colors.textMuted, marginTop: spacing.xxs, textAlign: 'center' },
  tearLine: {
    width: '100%',
    borderStyle: 'dashed',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    marginVertical: spacing.md,
  },
  // The one figure on the ticket meant to be read at a glance — same hero
  // role as the outstanding/collected amounts elsewhere in the app.
  amount: {
    ...type.display,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  words: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  // The receipt number is the one place on the ticket that reads like a
  // printed stub: fixed-width numerals in the platform's monospace family,
  // not the UI sans everything else on this screen uses.
  receiptNo: {
    ...type.title,
    color: colors.text,
    fontFamily: monoFamily,
    fontVariant: ['tabular-nums'],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, width: '100%' },
  rowLabel: { ...type.body, color: colors.textMuted },
  rowValue: { ...type.body, color: colors.text, ...fontWeight('700') },
  actions: { gap: spacing.sm },
});
