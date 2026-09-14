import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';

import { enqueue } from '@/offline/queue';
import { getCurrentPosition, type CurrentPosition } from '@/location/tracking';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, radius } from '@/ui/theme';

const OUTCOMES = [
  { value: 'CUSTOMER_UNAVAILABLE', label: 'Unavailable' },
  { value: 'PROMISED_TO_PAY', label: 'Promised to pay' },
  { value: 'REFUSED', label: 'Refused' },
  { value: 'DISPUTE', label: 'Dispute' },
  { value: 'OTHER', label: 'Other' },
] as const;

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPosition().then(setPosition);
  }, []);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
    if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    setError(null);
    if (outcome === 'PROMISED_TO_PAY' && !promisedDate) {
      setError('Enter the promised date.');
      return;
    }
    setSubmitting(true);
    try {
      await enqueue('visit', {
        clientRef: Crypto.randomUUID(),
        assignmentId,
        visitedAt: new Date().toISOString(),
        outcome,
        promisedDate: outcome === 'PROMISED_TO_PAY' ? promisedDate : undefined,
        promisedAmount: outcome === 'PROMISED_TO_PAY' && promisedAmount ? Number(promisedAmount) : undefined,
        notes: notes || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
        photoUri,
      });
      Alert.alert('Visit recorded', 'It will sync automatically once online.', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/assignments') },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.label}>Outcome</Text>
        <View style={styles.chipWrap}>
          {OUTCOMES.map((o) => (
            <Chip key={o.value} label={o.label} selected={outcome === o.value} onPress={() => setOutcome(o.value)} />
          ))}
        </View>
        {outcome === 'PROMISED_TO_PAY' && (
          <>
            <Input label="Promised date (YYYY-MM-DD)" value={promisedDate} onChangeText={setPromisedDate} />
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
        <Button title={photoUri ? 'Photo added ✓' : 'Add photo'} onPress={pickPhoto} variant="secondary" fullWidth={false} />
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
      </Card>

      <Card>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.muted}>
          {position ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : 'Capturing GPS…'}
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Submit visit" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  preview: { width: 120, height: 120, borderRadius: radius.sm, marginTop: spacing.sm },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, fontWeight: '600' },
});
