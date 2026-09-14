import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { fetchDeposits } from '@/api/agentApi';
import { enqueue } from '@/offline/queue';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDateTime, formatMoney } from '@/ui/format';
import * as Crypto from 'expo-crypto';
import type { AgentCashDeposit } from '@/types/models';

const toneForStatus: Record<AgentCashDeposit['status'], 'default' | 'success' | 'danger'> = {
  PENDING: 'default',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

export default function DepositsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['deposits'], queryFn: fetchDeposits });

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const onSubmit = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Enter a valid amount');
      return;
    }
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
      setAmount('');
      setNotes('');
      setProofUri(null);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      Alert.alert('Deposit queued', 'It will sync automatically once online.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Cash deposits</Text>
        <Button title={showForm ? 'Cancel' : 'New deposit'} onPress={() => setShowForm((v) => !v)} fullWidth={false} variant="secondary" />
      </View>

      {showForm && (
        <Card>
          <Input label="Amount (₹)" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="5000" />
          <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Handed to accountant" />
          <Button title={proofUri ? 'Proof photo added ✓' : 'Add proof photo'} onPress={pickProof} variant="secondary" />
          {proofUri ? <Image source={{ uri: proofUri }} style={styles.preview} /> : null}
          <Button title="Submit deposit" onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      {(query.data ?? []).length === 0 && !query.isLoading ? (
        <EmptyState title="No deposits yet" subtitle="Cash handed to the office will show up here." />
      ) : (
        (query.data ?? []).map((deposit) => (
          <Card key={deposit.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.amount}>{formatMoney(deposit.amount)}</Text>
              <Badge label={deposit.status} tone={toneForStatus[deposit.status]} />
            </View>
            <Text style={styles.subtitle}>{formatDateTime(deposit.depositedAt)}</Text>
            {deposit.notes ? <Text style={styles.subtitle}>{deposit.notes}</Text> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primaryDark },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  preview: { width: 96, height: 96, borderRadius: 8, marginTop: spacing.sm },
});
