import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Badge, Button, Field, Notice } from '../components/ui';
import { PhotoBox } from '../components/PhotoBox';
import { spacing, type } from '../theme';
import { money, todayYmd } from '../utils/format';
import type { CapturedPhoto } from '../utils/photos';
import type { ScreenProps } from '../navigation/types';
import { finishCollection, rebalanceDraft } from './collectionFlow';
import { mobileApi } from '../api/mobileApi';
import { useSync } from '../sync/SyncContext';
import { useAuth } from '../auth/AuthContext';
import type { ChequeFields } from '../api/types';
import { demoChequeOcr } from '../demo/demoSync';

export function ChequePaymentScreen({ route, navigation }: ScreenProps<'ChequePayment'>) {
  const { draft } = route.params;
  const { online } = useSync();
  const { bootstrap, isDemo } = useAuth();
  const ocrEnabled = isDemo || (bootstrap?.settings.chequeOcrEnabled ?? true);

  const [front, setFront] = useState<CapturedPhoto | null>(null);
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [date, setDate] = useState(todayYmd());
  const [amount, setAmount] = useState(String(draft.total));
  const [drawer, setDrawer] = useState('');
  const [notes, setNotes] = useState('');
  const [ocr, setOcr] = useState<{ busy: boolean; result: ChequeFields | null; error: string | null }>({ busy: false, result: null, error: null });
  const [busy, setBusy] = useState(false);

  const runOcr = async (photo: CapturedPhoto) => {
    if (!isDemo && (!online || !ocrEnabled)) return;
    setOcr({ busy: true, result: null, error: null });
    try {
      const r = isDemo ? await demoChequeOcr(Number(amount) || draft.total) : await mobileApi.ocrCheque({ uri: photo.uri, mimeType: photo.mimeType, name: 'cheque.jpg' });
      if (r.bankName) setBankName(r.bankName);
      if (r.chequeNumber) setChequeNumber(r.chequeNumber);
      if (r.date) setDate(r.date);
      if (r.amount && r.amount > 0) setAmount(String(r.amount));
      if (r.drawerName) setDrawer(r.drawerName);
      setOcr({ busy: false, result: r, error: null });
    } catch (e) {
      setOcr({ busy: false, result: null, error: (e as Error).message });
    }
  };

  const onPhoto = (p: CapturedPhoto | null) => {
    setFront(p);
    if (p) void runOcr(p);
  };

  const received = Number(amount) || 0;
  const save = async () => {
    if (!chequeNumber.trim()) return Alert.alert('Cheque', 'Enter the cheque number.');
    if (received <= 0) return Alert.alert('Cheque', 'Enter the cheque amount.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Cheque', 'Enter the date as YYYY-MM-DD.');
    if (received > draft.total + 0.009 && draft.allocations.length > 0) {
      return Alert.alert('Amount', `Cheque amount is more than the selected invoices (${money(draft.total)}). Go back and add an on-account amount instead.`);
    }
    setBusy(true);
    try {
      await finishCollection(navigation, rebalanceDraft(draft, received), {
        paymentMode: 'Cheque',
        amount: received,
        referenceNo: chequeNumber.trim(),
        bankName,
        chequeDate: date,
        drawerName: drawer,
        notes,
        photos: front ? [{ kind: 'CHEQUE_FRONT', photo: front }] : [],
      });
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Cheque Payment" back footer={<Button title="Confirm & Continue" onPress={save} loading={busy} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={type.h3}>Upload Cheque Front</Text>
        {ocr.busy ? <Badge text="Reading cheque…" tone="info" /> : ocr.result ? <Badge text={`OCR ${ocr.result.confidence}`} tone={ocr.result.confidence === 'high' ? 'success' : 'warning'} /> : null}
      </View>
      <PhotoBox label="" name={`cheque-${Date.now()}`} photo={front} onChange={onPhoto} hint={isDemo || (online && ocrEnabled) ? 'Details below are auto-filled from the photo — please verify' : 'Offline: enter the details manually'} />
      {ocr.error ? <Notice tone="warning" text={`Auto-fill unavailable: ${ocr.error}`} /> : null}
      {ocr.result?.warnings?.length ? <Notice tone="warning" text={ocr.result.warnings.join(' · ')} /> : null}
      {ocr.result?.isPostDated ? <Notice tone="info" text="Post-dated cheque — the office will see the cheque date on the receipt." /> : null}

      <Text style={[type.h3, { marginBottom: spacing.sm }]}>Cheque Details</Text>
      <Field label="Bank Name" value={bankName} onChangeText={setBankName} placeholder="State Bank of India" />
      <Field label="Cheque Number" value={chequeNumber} onChangeText={(t) => setChequeNumber(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="123456" maxLength={10} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={todayYmd()} autoCapitalize="none" />
      <Field label="Amount" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
      <Field label="Drawer Name" value={drawer} onChangeText={setDrawer} placeholder="Account holder on the cheque" />
      <Field label="Remarks (optional)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
