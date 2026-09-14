import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { assertImageSizeOk } from '@/utils/imageGuard';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

import { fetchDeposits } from '@/api/agentApi';
import { enqueue } from '@/offline/queue';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { SkeletonRow } from '@/ui/Skeleton';
import { SuccessOverlay } from '@/ui/SuccessOverlay';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, fontSize, letterSpacing } from '@/ui/theme';
import { DEPOSIT_STATUS_META, formatDateTime, formatMoney } from '@/ui/format';
import * as Crypto from 'expo-crypto';
import type { AgentCashDeposit } from '@/types/models';

const STAGGER_CAP = 8;

export default function DepositsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['deposits'], queryFn: fetchDeposits });

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);

  const pickProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0] && assertImageSizeOk(result.assets[0])) {
      setProofUri(result.assets[0].uri);
    }
  };

  const submittingRef = React.useRef(false);

  const onSubmit = async () => {
    if (submittingRef.current) return;
    const numericAmount = Math.round(Number(amount) * 100) / 100;
    if (!numericAmount || numericAmount < 0.01) {
      setAmountError('Enter a valid amount.');
      return;
    }
    setAmountError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await enqueue('deposit', {
        clientRef: Crypto.randomUUID(),
        amount: numericAmount,
        depositedAt: new Date().toISOString(),
        method: 'CASH',
        notes: notes || undefined,
        proofUri,
      });
      setSubmittedAmount(numericAmount);
      setAmount('');
      setNotes('');
      setProofUri(null);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()} avoidKeyboard>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Cash deposits</Text>
        <Button
          title={showForm ? 'Cancel' : 'New deposit'}
          onPress={() => setShowForm((v) => !v)}
          fullWidth={false}
          variant="secondary"
          icon={<Ionicons name={showForm ? 'close' : 'add'} size={18} color={colors.primary} />}
        />
      </View>

      {showForm && (
        <Animated.View entering={FadeInDown.duration(220)}>
        <Card elevation="raised">
          <Input
            label="Amount (₹)"
            keyboardType="numeric"
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              if (amountError) setAmountError(null);
            }}
            placeholder="5000"
            error={amountError}
          />
          <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Handed to accountant" />
          <Button
            title={proofUri ? 'Proof photo added' : 'Add proof photo'}
            onPress={pickProof}
            variant="secondary"
            icon={<Ionicons name={proofUri ? 'checkmark-circle' : 'camera-outline'} size={18} color={colors.primary} />}
          />
          {proofUri ? <Image source={{ uri: proofUri }} style={styles.preview} accessibilityLabel="Deposit proof preview" /> : null}
          <Button title="Submit deposit" onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
        </Card>
        </Animated.View>
      )}

      {query.isLoading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : query.isError ? (
        <View style={{ gap: spacing.sm }}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="offline"
            title="Couldn't load deposits"
            subtitle="Check your connection and try again."
          />
          <Button title="Retry" onPress={() => query.refetch()} variant="secondary" />
        </View>
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No deposits yet"
          subtitle="Cash handed to the office will show up here."
        />
      ) : (
        (query.data ?? []).map((deposit, index) => <DepositRow key={deposit.id} deposit={deposit} index={index} />)
      )}

      <SuccessOverlay
        visible={submittedAmount != null}
        title="Deposit queued"
        subtitle={`${formatMoney(submittedAmount ?? 0)} will sync automatically once online.`}
        actionLabel="Done"
        onAction={() => setSubmittedAmount(null)}
      />
    </Screen>
  );
}

function DepositRow({ deposit, index }: { deposit: AgentCashDeposit; index: number }) {
  const meta = DEPOSIT_STATUS_META[deposit.status];
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(Math.min(index, STAGGER_CAP) * 40).duration(280)}
      layout={reduceMotion ? undefined : Layout.springify().damping(18)}
    >
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.amount} numberOfLines={1}>
            {formatMoney(deposit.amount)}
          </Text>
          <Badge label={meta.label} tone={meta.tone} dot />
        </View>
        <Text style={styles.subtitle}>{formatDateTime(deposit.depositedAt)}</Text>
        {deposit.notes ? <Text style={styles.subtitle}>{deposit.notes}</Text> : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text, letterSpacing: letterSpacing.tightDisplay },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  preview: { width: 96, height: 96, borderRadius: 8, marginTop: spacing.sm },
});
