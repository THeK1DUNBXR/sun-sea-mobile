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

export function CashPaymentScreen({ route, navigation }: ScreenProps<'CashPayment'>) {
  const { draft } = route.params;
  const [amount, setAmount] = useState(String(draft.total));
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const received = Number(amount) || 0;

  const save = async () => {
    if (received <= 0) return Alert.alert('Amount', 'Enter the amount received.');
    if (received > draft.total + 0.009 && draft.allocations.length > 0) {
      return Alert.alert('Amount', `Received amount is more than the selected invoices (${money(draft.total)}). Go back and add an on-account amount instead.`);
    }
    setBusy(true);
    try {
      await finishCollection(navigation, rebalanceDraft(draft, received), {
        paymentMode: 'Cash',
        amount: received,
        notes,
        photos: photo ? [{ kind: 'CASH_RECEIPT', photo }] : [],
      });
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Cash Payment" back footer={<Button title="Save & Continue" onPress={save} loading={busy} />}>
      <Text style={type.small}>Amount Received</Text>
      <Field keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} style={{ marginTop: 4 }} />
      {received < draft.total - 0.009 ? <Notice tone="warning" text={`Partial payment — ${money(draft.total - received)} of the selected invoices will remain outstanding.`} /> : null}

      <Text style={[type.h3, { marginBottom: spacing.sm }]}>Cash Receipt Photo</Text>
      <PhotoBox label="" name={`cash-${Date.now()}`} photo={photo} onChange={setPhoto} hint="Capture clear cash receipt / bill" />

      <Field label="Remarks (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. Part payment, balance next week" multiline />
    </Screen>
  );
}
