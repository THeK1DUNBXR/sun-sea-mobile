import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';

import { enqueue } from '@/offline/queue';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { assertImageSizeOk } from '@/utils/imageGuard';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { SuccessOverlay } from '@/ui/SuccessOverlay';
import { GpsStatus } from '@/ui/GpsStatus';
import { colors, spacing, fontSize, radius, sizes } from '@/ui/theme';

const OUTCOMES = [
  { value: 'CUSTOMER_UNAVAILABLE', label: 'Unavailable' },
  { value: 'PROMISED_TO_PAY', label: 'Promised to pay' },
  { value: 'REFUSED', label: 'Refused' },
  { value: 'DISPUTE', label: 'Dispute' },
  { value: 'WRONG_ADDRESS', label: 'Wrong address' },
  { value: 'OTHER', label: 'Other' },
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export default function VisitScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();

  const [outcome, setOutcome] = useState<string>('CUSTOMER_UNAVAILABLE');
  const [promisedDate, setPromisedDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentPosition().then((pos) => {
      if (!cancelled) setPosition(pos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
    if (!result.canceled && result.assets?.[0] && assertImageSizeOk(result.assets[0])) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submittingRef = React.useRef(false);

  const onSubmit = async () => {
    if (submittingRef.current) return;
    setDateError(null);
    if (outcome === 'PROMISED_TO_PAY') {
      if (!promisedDate) {
        setDateError('Enter the promised date.');
        return;
      }
      if (!DATE_ONLY.test(promisedDate) || Number.isNaN(new Date(promisedDate).getTime())) {
        setDateError('Use the format YYYY-MM-DD.');
        return;
      }
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await enqueue('visit', {
        clientRef: Crypto.randomUUID(),
        assignmentId,
        visitedAt: new Date().toISOString(),
        outcome,
        promisedDate: outcome === 'PROMISED_TO_PAY' ? promisedDate : undefined,
        promisedAmount:
          outcome === 'PROMISED_TO_PAY' && promisedAmount && !Number.isNaN(Number(promisedAmount))
            ? Math.round(Number(promisedAmount) * 100) / 100
            : undefined,
        notes: notes || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
        photoUri,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <Screen avoidKeyboard>
      <Card>
        <Text style={styles.label}>Outcome</Text>
        <View style={styles.chipWrap}>
          {OUTCOMES.map((o) => (
            <Chip key={o.value} label={o.label} selected={outcome === o.value} onPress={() => setOutcome(o.value)} />
          ))}
        </View>
        {outcome === 'PROMISED_TO_PAY' && (
          <>
            <Input
              label="Promised date (YYYY-MM-DD)"
              value={promisedDate}
              onChangeText={(v) => {
                setPromisedDate(v);
                if (dateError) setDateError(null);
              }}
              error={dateError}
            />
            <Input
              label="Promised amount (₹, optional)"
              keyboardType="numeric"
              value={promisedAmount}
              onChangeText={setPromisedAmount}
            />
          </>
        )}
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Card>
        <Text style={styles.label}>Photo (optional)</Text>
        <Button
          title={photoUri ? 'Photo added' : 'Add photo'}
          onPress={pickPhoto}
          variant="secondary"
          fullWidth={false}
          icon={<Ionicons name={photoUri ? 'checkmark-circle' : 'camera-outline'} size={18} color={colors.primary} />}
        />
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} accessibilityLabel="Visit photo preview" /> : null}
      </Card>

      <Card style={styles.locationCard}>
        <GpsStatus
          locked={Boolean(position)}
          label={position ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : 'Capturing GPS…'}
        />
      </Card>

      <Button title="Submit visit" onPress={onSubmit} loading={submitting} />

      <SuccessOverlay
        visible={submitted}
        title="Visit recorded"
        subtitle="It will sync automatically once online."
        actionLabel="Back to assignments"
        onAction={() => router.replace('/(app)/(tabs)/assignments')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  preview: { width: sizes.previewLarge, height: sizes.previewLarge, borderRadius: radius.sm, marginTop: spacing.sm },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.textMuted, flex: 1 },
});
