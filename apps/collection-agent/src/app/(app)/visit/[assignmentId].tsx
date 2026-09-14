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
import { colors, spacing, type, radius, sizes } from '@/ui/theme';
import { VISIT_OUTCOME_META } from '@/ui/format';
import { copy } from '@/copy';
import type { VisitOutcome } from '@/types/models';

// Every outcome an agent can log on a visit except "collected"/"partly
// collected" — those are recorded through the collection form instead, not
// picked as a visit outcome. Labels come from the single shared vocabulary
// in ui/format.ts so this screen's chips always match how the outcome is
// read back on the assignment detail and history screens.
const OUTCOMES: { value: VisitOutcome; label: string }[] = (
  ['CUSTOMER_UNAVAILABLE', 'PROMISED_TO_PAY', 'REFUSED', 'DISPUTE', 'WRONG_ADDRESS', 'OTHER'] as const
).map((value) => ({ value, label: VISIT_OUTCOME_META[value].label }));

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
        setDateError(copy.visit.promisedDateRequired);
        return;
      }
      if (!DATE_ONLY.test(promisedDate) || Number.isNaN(new Date(promisedDate).getTime())) {
        setDateError(copy.visit.promisedDateFormat);
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
        <Text style={styles.label}>{copy.visit.outcomeLabel}</Text>
        <View style={styles.chipWrap}>
          {OUTCOMES.map((o) => (
            <Chip key={o.value} label={o.label} selected={outcome === o.value} onPress={() => setOutcome(o.value)} />
          ))}
        </View>
        {outcome === 'PROMISED_TO_PAY' && (
          <>
            <Input
              label={copy.visit.promisedDateLabel}
              value={promisedDate}
              onChangeText={(v) => {
                setPromisedDate(v);
                if (dateError) setDateError(null);
              }}
              error={dateError}
            />
            <Input
              label={copy.visit.promisedAmountLabel}
              keyboardType="numeric"
              value={promisedAmount}
              onChangeText={setPromisedAmount}
            />
          </>
        )}
        <Input label={copy.visit.notesLabel} value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Card>
        <Text style={styles.label}>{copy.visit.photoLabel}</Text>
        <Button
          title={photoUri ? copy.visit.photoAdded : copy.visit.addPhoto}
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
          label={position ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : copy.visit.gpsCapturing}
          accessibilityLabel={
            position
              ? `Location captured, accuracy about ${Math.round(position.accuracy ?? 0)} meters`
              : copy.visit.gpsCapturing
          }
        />
      </Card>

      <Button title={copy.visit.submit} onPress={onSubmit} loading={submitting} />

      <SuccessOverlay
        visible={submitted}
        title={copy.visit.successTitle}
        subtitle={copy.visit.successSubtitle}
        actionLabel={copy.visit.backToAssignments}
        onAction={() => router.replace('/(app)/(tabs)/assignments')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.textMuted, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  preview: { width: sizes.previewLarge, height: sizes.previewLarge, borderRadius: radius.sm, marginTop: spacing.sm },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { ...type.body, color: colors.textMuted, flex: 1 },
});
