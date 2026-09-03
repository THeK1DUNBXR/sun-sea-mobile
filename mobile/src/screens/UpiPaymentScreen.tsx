import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Field, Notice } from '../components/ui';
import { PhotoBox } from '../components/PhotoBox';
import { spacing, type } from '../theme';
import { money } from '../utils/format';
import type { CapturedPhoto } from '../utils/photos';
import type { ScreenProps } from '../navigation/types';
import { finishCollection, rebalanceDraft } from './collectionFlow';

export function UpiPaymentScreen({ route, navigation }: ScreenProps<'UpiPayment'>) {
  const { draft, mode } = route.params;
  const [amount, setAmount] = useState(String(draft.total));
  const [ref, setRef] = useState('');
  const [bank, setBank] = useState('');
  const [shot, setShot] = useState<CapturedPhoto | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const received = Number(amount) || 0;
  const isUpi = mode === 'UPI';

  const save = async () => {
    if (!ref.trim()) return Alert.alert(mode, isUpi ? 'Enter the UPI transaction ID.' : 'Enter the UTR / reference number.');
    if (received <= 0) return Alert.alert('Amount', 'Enter the amount received.');
    if (received > draft.total + 0.009 && draft.allocations.length > 0) {
      return Alert.alert('Amount', `Amount is more than the selected invoices (${money(draft.total)}). Go back and add an on-account amount instead.`);
    }
    setBusy(true);
    try {
      await finishCollection(navigation, rebalanceDraft(draft, received), {
        paymentMode: mode,
        amount: received,
        referenceNo: ref.trim(),
        bankName: bank || null,
        notes,
        photos: shot ? [{ kind: 'UPI_SCREENSHOT', photo: shot }] : [],
      });
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title={`${mode} Payment`} back footer={<Button title="Confirm & Continue" onPress={save} loading={busy} />}>
      <Text style={type.small}>Amount</Text>
      <Field keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} style={{ marginTop: 4 }} />
      {received < draft.total - 0.009 ? <Notice tone="warning" text={`Partial payment — ${money(draft.total - received)} remains outstanding.`} /> : null}

      <Field label={isUpi ? 'UPI Transaction ID / Reference No.' : 'UTR / Reference Number'} value={ref} onChangeText={setRef} autoCapitalize="characters" autoCorrect={false} placeholder={isUpi ? '123456789012' : 'SBIN0XXXXXXXXXX'} />
      {!isUpi ? <Field label="Remitting bank (optional)" value={bank} onChangeText={setBank} /> : null}

      <Text style={[type.h3, { marginBottom: spacing.sm }]}>Scan / Upload Screenshot</Text>
      <PhotoBox label="" name={`${mode.toLowerCase()}-${Date.now()}`} photo={shot} onChange={setShot} hint="Payment confirmation screenshot (optional)" />

      <Field label="Remarks (optional)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
