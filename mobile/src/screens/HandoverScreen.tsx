import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Field, Notice } from '../components/ui';
import { Chips } from '../components/Chips';
import { PhotoBox } from '../components/PhotoBox';
import { useToast } from '../components/Toast';
import type { HandoverMode } from '../db/models/Handover';
import { spacing, type } from '../theme';
import { money } from '../utils/format';
import type { CapturedPhoto } from '../utils/photos';
import type { ScreenProps } from '../navigation/types';
import { createHandover } from '../data/extras';
import { success } from '../utils/haptics';

export function HandoverScreen({ route, navigation }: ScreenProps<'Handover'>) {
  const suggested = route.params?.suggestedAmount ?? 0;
  const toast = useToast();
  const [mode, setMode] = useState<HandoverMode>('OFFICE_CASH');
  const [amount, setAmount] = useState(suggested > 0 ? String(Math.round(suggested)) : '');
  const [ref, setRef] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return Alert.alert('Amount', 'Enter the amount handed over.');
    if (mode === 'BANK_DEPOSIT' && !ref.trim()) return Alert.alert('Reference', 'Enter the deposit slip / transaction reference.');
    setBusy(true);
    try {
      await createHandover({ amount: amt, mode, referenceNo: ref, bankName: bank, notes, photos: photo ? [{ kind: 'OTHER', photo }] : [] });
      void success();
      toast.show(`${money(amt)} ${mode === 'BANK_DEPOSIT' ? 'deposit' : 'handover'} recorded`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Cash handover" back footer={<Button title="Record handover" onPress={save} loading={busy} />}>
      {suggested > 0 ? <Notice tone="info" text={`You currently hold ${money(suggested)} in cash from collections.`} /> : null}
      <Text style={[type.label, { marginBottom: spacing.sm }]}>Handed to</Text>
      <Chips
        value={mode}
        onChange={setMode}
        scroll={false}
        options={[
          { value: 'OFFICE_CASH', label: 'Office (cash)', icon: 'business-outline' },
          { value: 'BANK_DEPOSIT', label: 'Bank deposit', icon: 'card-outline' },
        ]}
      />
      <Field label="Amount" keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} style={{ marginTop: spacing.xl }} />
      {mode === 'BANK_DEPOSIT' ? (
        <>
          <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. HDFC Bank, Anna Salai" />
          <Field label="Deposit slip / reference no." value={ref} onChangeText={setRef} autoCapitalize="characters" />
        </>
      ) : (
        <Field label="Received by (optional)" value={ref} onChangeText={setRef} placeholder="Name of the person at the office" />
      )}
      <Text style={[type.h3, { marginBottom: spacing.sm }]}>{mode === 'BANK_DEPOSIT' ? 'Deposit slip photo' : 'Acknowledgement photo (optional)'}</Text>
      <PhotoBox label="" name={`handover-${Date.now()}`} photo={photo} onChange={setPhoto} />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
