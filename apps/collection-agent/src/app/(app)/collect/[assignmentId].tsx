import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';

import { fetchAssignment } from '@/api/agentApi';
import { enqueue } from '@/offline/queue';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { dataUrlToFile } from '@/utils/dataUrl';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, radius } from '@/ui/theme';
import { formatMoney } from '@/ui/format';

const METHODS = ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;
type Method = (typeof METHODS)[number];

export default function CollectScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const signatureRef = React.useRef<SignatureViewRef>(null);

  const assignmentQuery = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => fetchAssignment(assignmentId!),
    enabled: Boolean(assignmentId),
  });
  const outstanding = assignmentQuery.data?.invoice?.outstanding ?? 0;

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const amountValue = Number(amount);

  const pickProof = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets?.[0]) setProofUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    setError(null);
    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (amountValue > outstanding + 0.01) {
      setError(`Amount cannot exceed the outstanding balance of ${formatMoney(outstanding)}.`);
      return;
    }
    if (method === 'CHEQUE' && !chequeNumber) {
      setError('Enter the cheque number.');
      return;
    }

    setSubmitting(true);
    try {
      await enqueue('collection', {
        clientRef: Crypto.randomUUID(),
        assignmentId,
        amount: amountValue,
        paymentMethod: method,
        referenceNumber: referenceNumber || undefined,
        chequeNumber: method === 'CHEQUE' ? chequeNumber : undefined,
        chequeDate: method === 'CHEQUE' ? chequeDate || undefined : undefined,
        bankName: method === 'CHEQUE' ? bankName || undefined : undefined,
        payerName: payerName || undefined,
        notes: notes || undefined,
        collectedAt: new Date().toISOString(),
        latitude: position?.latitude,
        longitude: position?.longitude,
        locationAccuracy: position?.accuracy ?? undefined,
        proofUri,
        signatureUri,
      });
      Alert.alert('Collection recorded', 'It will sync automatically once online.', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/assignments') },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.outstandingLabel}>Outstanding</Text>
        <Text style={styles.outstandingValue}>{formatMoney(outstanding)}</Text>
      </Card>

      <Card>
        <Input
          label="Amount received (₹)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
        />
        <Button
          title="Full outstanding"
          onPress={() => setAmount(String(outstanding))}
          variant="secondary"
          fullWidth={false}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Payment method</Text>
        <View style={styles.chipWrap}>
          {METHODS.map((m) => (
            <Chip key={m} label={m.replace('_', ' ')} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>
        <Input label="Reference number (optional)" value={referenceNumber} onChangeText={setReferenceNumber} />
        {method === 'CHEQUE' && (
          <>
            <Input label="Cheque number" value={chequeNumber} onChangeText={setChequeNumber} />
            <Input label="Cheque date (YYYY-MM-DD)" value={chequeDate} onChangeText={setChequeDate} />
            <Input label="Bank name" value={bankName} onChangeText={setBankName} />
          </>
        )}
        <Input label="Payer name (optional)" value={payerName} onChangeText={setPayerName} />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Card>
        <Text style={styles.label}>Proof photo</Text>
        <View style={styles.chipRowButtons}>
          <Button title="Camera" onPress={() => pickProof(true)} variant="secondary" fullWidth={false} style={styles.halfBtn} />
          <Button title="Gallery" onPress={() => pickProof(false)} variant="secondary" fullWidth={false} style={styles.halfBtn} />
        </View>
        {proofUri ? <Image source={{ uri: proofUri }} style={styles.preview} /> : null}
      </Card>

      <Card>
        <Text style={styles.label}>Signature (optional)</Text>
        <View style={styles.signatureBox}>
          <SignatureScreen
            ref={signatureRef}
            onOK={async (sig) => setSignatureUri(await dataUrlToFile(sig))}
            onEmpty={() => setSignatureUri(null)}
            descriptionText=""
            webStyle="body,html{background:transparent;}"
          />
        </View>
        <View style={styles.chipRowButtons}>
          <Button title="Clear" onPress={() => signatureRef.current?.clearSignature()} variant="ghost" fullWidth={false} />
          <Button title="Save signature" onPress={() => signatureRef.current?.readSignature()} variant="ghost" fullWidth={false} />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.muted}>
          {position
            ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)} (±${Math.round(position.accuracy ?? 0)}m)`
            : 'Capturing GPS…'}
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Submit collection" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  outstandingLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  outstandingValue: { color: colors.primaryDark, fontSize: fontSize.xxl, fontWeight: '800' },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chipRowButtons: { flexDirection: 'row', gap: spacing.sm },
  halfBtn: { flexGrow: 1 },
  preview: { width: 120, height: 120, borderRadius: radius.sm, marginTop: spacing.sm },
  signatureBox: { height: 180, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, fontWeight: '600' },
});
