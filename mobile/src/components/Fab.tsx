import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { tap } from '../utils/haptics';
import type { IconName } from './ui';

export function Fab({ icon, label, onPress }: { icon: IconName; label?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void tap();
        onPress();
      }}
      style={({ pressed }) => [styles.fab, label ? styles.extended : null, pressed && { opacity: 0.9 }]}
    >
      <Ionicons name={icon} size={24} color="#fff" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 20, minWidth: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  extended: { paddingHorizontal: 18, gap: 8 },
  label: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
