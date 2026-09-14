import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fetchAssignment } from '@/api/agentApi';
import { enqueue } from '@/offline/queue';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { dataUrlToFile } from '@/utils/dataUrl';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { SuccessOverlay } from '@/ui/SuccessOverlay';
import { GpsStatus } from '@/ui/GpsStatus';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, fontSize, radius, letterSpacing } from '@/ui/theme';
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
  const customerName =
    assignmentQuery.data?.customer?.displayName ?? assignmentQuery.data?.customer?.firmName ?? 'this customer';

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
  const [amountError, setAmountError] = useState<string | null>(null);
  const [chequeError, setChequeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);
  const [amountHighlight, setAmountHighlight] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const amountValue = Number(amount);
  const step1Valid = Boolean(amountValue) && amountValue > 0 && amountValue <= outstanding + 0.01;
  const step2Valid = step1Valid && (method !== 'CHEQUE' || Boolean(chequeNumber));

  const pickProof = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets?.[0]) setProofUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    setAmountError(null);
    setChequeError(null);
    let hasError = false;
    if (!amountValue || amountValue <= 0) {
      setAmountError('Enter a valid amount.');
      hasError = true;
    } else if (amountValue > outstanding + 0.01) {
      setAmountError(`Cannot exceed the outstanding balance of ${formatMoney(outstanding)}.`);
      hasError = true;
    }
    if (method === 'CHEQUE' && !chequeNumber) {
      setChequeError('Enter the cheque number.');
      hasError = true;
    }
    if (hasError) return;

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
      setSubmittedAmount(amountValue);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen avoidKeyboard>
      <Card elevation="raised" style={styles.outstandingCard}>
        <Text style={styles.outstandingLabel}>Outstanding · {customerName}</Text>
        <Text style={styles.outstandingValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(outstanding)}
        </Text>
      </Card>

      <Step number={1} title="Amount">
        <Input
          label="Amount received (₹)"
          keyboardType="numeric"
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            if (amountError) setAmountError(null);
          }}
          placeholder="0"
          error={amountError}
          highlightSignal={amountHighlight}
        />
        <Button
          title="Full outstanding"
          onPress={() => {
            setAmount(String(outstanding));
            setAmountError(null);
            setAmountHighlight((n) => n + 1);
          }}
          variant="secondary"
          fullWidth={false}
          icon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />}
        />
      </Step>

      {step1Valid && (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(260)}>
          <Step number={2} title="Payment method">
            <View style={styles.chipWrap}>
              {METHODS.map((m) => (
                <Chip key={m} label={m.replace('_', ' ')} selected={method === m} onPress={() => setMethod(m)} />
              ))}
            </View>
            <Input label="Reference number (optional)" value={referenceNumber} onChangeText={setReferenceNumber} />
            {method === 'CHEQUE' && (
              <>
                <Input
                  label="Cheque number"
                  value={chequeNumber}
                  onChangeText={(v) => {
                    setChequeNumber(v);
                    if (chequeError) setChequeError(null);
                  }}
                  error={chequeError}
                />
                <Input label="Cheque date (YYYY-MM-DD)" value={chequeDate} onChangeText={setChequeDate} />
                <Input label="Bank name" value={bankName} onChangeText={setBankName} />
              </>
            )}
            <Input label="Payer name (optional)" value={payerName} onChangeText={setPayerName} />
            <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
          </Step>
        </Animated.View>
      )}

      {step2Valid && (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(260)}>
          <Step number={3} title="Proof photo" optional>
            <View style={styles.chipRowButtons}>
              <Button
                title="Camera"
                onPress={() => pickProof(true)}
                variant="secondary"
                fullWidth={false}
                style={styles.halfBtn}
                icon={<Ionicons name="camera-outline" size={18} color={colors.primary} />}
              />
              <Button
                title="Gallery"
                onPress={() => pickProof(false)}
                variant="secondary"
                fullWidth={false}
                style={styles.halfBtn}
                icon={<Ionicons name="images-outline" size={18} color={colors.primary} />}
              />
            </View>
            {proofUri ? <Image source={{ uri: proofUri }} style={styles.preview} accessibilityLabel="Proof photo preview" /> : null}
          </Step>
        </Animated.View>
      )}

      {step2Valid && (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(260)}>
          <Step number={4} title="Signature" optional>
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
            {signatureUri ? (
              <View style={styles.confirmedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.confirmedText}>Signature saved</Text>
              </View>
            ) : null}
          </Step>
        </Animated.View>
      )}

      <Card style={styles.locationCard}>
        <GpsStatus
          locked={Boolean(position)}
          label={
            position
              ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)} (±${Math.round(position.accuracy ?? 0)}m)`
              : 'Capturing GPS…'
          }
        />
      </Card>

      <Button title="Submit collection" onPress={onSubmit} loading={submitting} />

      <SuccessOverlay
        visible={submittedAmount != null}
        title="Collection recorded"
        subtitle={`${formatMoney(submittedAmount ?? 0)} from ${customerName} — it will sync automatically once online.`}
        actionLabel="Back to assignments"
        onAction={() => router.replace('/(app)/(tabs)/assignments')}
      />
    </Screen>
  );
}

function Step({
  number,
  title,
  optional,
  children,
}: {
  number: number;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{number}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {optional ? <Text style={styles.stepOptional}>Optional</Text> : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  outstandingCard: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 4 },
  outstandingLabel: { color: colors.primaryTint, fontSize: fontSize.sm, fontWeight: '700' },
  outstandingValue: {
    color: colors.onPrimary,
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: letterSpacing.tightDisplay,
  },
  stepCard: {},
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.primaryDark, fontWeight: '900', fontSize: fontSize.sm },
  stepTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, flex: 1 },
  stepOptional: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: letterSpacing.wideLabel },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chipRowButtons: { flexDirection: 'row', gap: spacing.sm },
  halfBtn: { flexGrow: 1 },
  preview: { width: 120, height: 120, borderRadius: radius.sm, marginTop: spacing.sm },
  signatureBox: { height: 180, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  confirmedText: { color: colors.success, fontWeight: '700', fontSize: fontSize.sm },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.textMuted, flex: 1 },
});
