import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, Field, Notice } from '../components/ui';
import { Chips } from '../components/Chips';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { useRecord } from '../db/hooks';
import type { FollowUpReason, FollowUpType } from '../db/models/FollowUp';
import { spacing, type } from '../theme';
import { addDays, fmtDate, money, todayYmd } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { createFollowUp } from '../data/extras';
import { completeVisit } from '../data/actions';
import { success } from '../utils/haptics';

const TYPES: { value: FollowUpType; label: string; icon: 'cash-outline' | 'call-outline' | 'alert-circle-outline' | 'remove-circle-outline' }[] = [
  { value: 'PTP', label: 'Promise to pay', icon: 'cash-outline' },
  { value: 'CALLBACK', label: 'Call back', icon: 'call-outline' },
  { value: 'DISPUTE', label: 'Dispute', icon: 'alert-circle-outline' },
  { value: 'NO_ACTION', label: 'No action', icon: 'remove-circle-outline' },
];
const REASONS: { value: FollowUpReason; label: string }[] = [
  { value: 'OWNER_NOT_AVAILABLE', label: 'Owner not available' },
  { value: 'NO_FUNDS', label: 'No funds today' },
  { value: 'DISPUTE', label: 'Bill / quality dispute' },
  { value: 'ALREADY_PAID', label: 'Says already paid' },
  { value: 'CLOSED', label: 'Shop closed' },
  { value: 'OTHER', label: 'Other' },
];
type Quick = 'tomorrow' | '3d' | 'week' | 'custom';

export function FollowUpLogScreen({ route, navigation }: ScreenProps<'FollowUpLog'>) {
  const { customerId, visitId } = route.params;
  const toast = useToast();
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const visit = useRecord(() => (visitId ? tables.visits().findAndObserve(visitId) : null), [visitId]);
  const [ftype, setFtype] = useState<FollowUpType>('PTP');
  const [reason, setReason] = useState<FollowUpReason | null>('OWNER_NOT_AVAILABLE');
  const [quick, setQuick] = useState<Quick>('3d');
  const [customDate, setCustomDate] = useState(addDays(todayYmd(), 7));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (customer && !amount) setAmount(String(Math.round(customer.outstanding)));
  }, [customer, amount]);

  const date = quick === 'tomorrow' ? addDays(todayYmd(), 1) : quick === '3d' ? addDays(todayYmd(), 3) : quick === 'week' ? addDays(todayYmd(), 7) : customDate;
  const needsDate = ftype === 'PTP' || ftype === 'CALLBACK';

  const save = async () => {
    if (needsDate && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Date', 'Enter the date as YYYY-MM-DD.');
    if (ftype === 'PTP' && !(Number(amount) > 0)) return Alert.alert('Amount', 'Enter the promised amount.');
    setBusy(true);
    try {
      await createFollowUp({
        customerId,
        visitId,
        type: ftype,
        reason,
        promisedAmount: ftype === 'PTP' ? Number(amount) : null,
        promisedDate: needsDate ? date : null,
        notes,
      });
      void success();
      toast.show(ftype === 'PTP' ? `Promise logged for ${fmtDate(date)}` : ftype === 'CALLBACK' ? `Callback set for ${fmtDate(date)}` : 'Follow-up logged');
      if (visit && visit.status !== 'COMPLETED') {
        Alert.alert('Complete visit?', 'Mark this visit as completed as well?', [
          { text: 'Not yet', style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: 'Complete',
            onPress: async () => {
              await completeVisit(visit);
              navigation.goBack();
            },
          },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Log follow-up" subtitle={customer?.name} back footer={<Button title="Save follow-up" onPress={save} loading={busy} />}>
      {customer ? <Notice tone="info" text={`${customer.name} has ${money(customer.outstanding)} outstanding. Recording why nothing was collected helps the office plan the next contact.`} /> : null}

      <Text style={[type.label, { marginBottom: spacing.sm }]}>Outcome</Text>
      <Chips value={ftype} onChange={setFtype} options={TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))} scroll={false} />

      {ftype !== 'NO_ACTION' ? (
        <>
          <Text style={[type.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Reason</Text>
          <Chips value={reason} onChange={setReason} options={REASONS} scroll={false} />
        </>
      ) : null}

      {ftype === 'PTP' ? <Field label="Promised amount" keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} style={{ marginTop: spacing.xl }} /> : null}

      {needsDate ? (
        <>
          <Text style={[type.label, { marginTop: ftype === 'PTP' ? 0 : spacing.xl, marginBottom: spacing.sm }]}>{ftype === 'PTP' ? 'Promised date' : 'Call back on'}</Text>
          <Chips
            value={quick}
            onChange={setQuick}
            scroll={false}
            options={[
              { value: 'tomorrow', label: `Tomorrow · ${fmtDate(addDays(todayYmd(), 1)).slice(0, 6)}` },
              { value: '3d', label: `In 3 days · ${fmtDate(addDays(todayYmd(), 3)).slice(0, 6)}` },
              { value: 'week', label: `Next week · ${fmtDate(addDays(todayYmd(), 7)).slice(0, 6)}` },
              { value: 'custom', label: 'Pick date' },
            ]}
          />
          {quick === 'custom' ? <Field label="Date (YYYY-MM-DD)" value={customDate} onChangeText={setCustomDate} autoCapitalize="none" style={{ marginTop: spacing.md }} /> : null}
          <Card style={{ marginTop: spacing.md }}>
            <Text style={type.small}>Reminder will appear on your Follow-ups tab on</Text>
            <Text style={type.h3}>{fmtDate(date)}</Text>
          </Card>
        </>
      ) : null}

      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="e.g. Owner travelling, manager will arrange payment" multiline style={{ marginTop: spacing.xl }} />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
