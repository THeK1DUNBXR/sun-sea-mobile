import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme';
import { CapturedPhoto, captureFromCamera, pickFromLibrary } from '../utils/photos';

export function PhotoBox({
  label,
  hint,
  photo,
  onChange,
  name,
  allowLibrary = true,
}: {
  label: string;
  hint?: string;
  photo: CapturedPhoto | null;
  onChange: (p: CapturedPhoto | null) => void;
  name: string;
  allowLibrary?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<CapturedPhoto | null>) => {
    setBusy(true);
    try {
      const p = await fn();
      if (p) onChange(p);
    } catch (e) {
      Alert.alert('Camera', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[type.small, { fontWeight: '600', marginBottom: 6 }]}>{label}</Text>
      {photo ? (
        <View style={styles.preview}>
          <Image source={{ uri: photo.uri }} style={styles.img} resizeMode="cover" />
          <View style={styles.previewActions}>
            <Pressable onPress={() => run(() => captureFromCamera(name))} style={styles.smallBtn}>
              <Ionicons name="camera" size={16} color={colors.primary} />
              <Text style={styles.smallBtnText}>Retake</Text>
            </Pressable>
            <Pressable onPress={() => onChange(null)} style={styles.smallBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.smallBtnText, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.box}>
          <Pressable onPress={() => run(() => captureFromCamera(name))} disabled={busy} style={styles.bigBtn}>
            <Ionicons name="camera-outline" size={34} color={colors.primary} />
            <Text style={[type.small, { marginTop: 6, color: colors.primary, fontWeight: '600' }]}>{busy ? 'Opening…' : 'Take photo'}</Text>
          </Pressable>
          {allowLibrary ? (
            <Pressable onPress={() => run(() => pickFromLibrary(name))} disabled={busy} style={styles.bigBtn}>
              <Ionicons name="image-outline" size={34} color={colors.muted} />
              <Text style={[type.small, { marginTop: 6, fontWeight: '600' }]}>From gallery</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {hint ? <Text style={[type.tiny, { marginTop: 6, textAlign: 'center' }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.card, minHeight: 140 },
  bigBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  preview: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  img: { width: '100%', height: 200 },
  previewActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  smallBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
