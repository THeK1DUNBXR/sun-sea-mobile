import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, type } from '../theme';
import { useSync } from '../sync/SyncContext';

export function OfflineBadge() {
  const { online, syncing, demo } = useSync();
  if (demo) {
    return (
      <View style={[styles.pill, { backgroundColor: colors.infoSoft }]}>
        <View style={[styles.dot, { backgroundColor: colors.info }]} />
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.info }}>{syncing ? 'Syncing…' : 'Demo'}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: online ? colors.successSoft : colors.dangerSoft }]}>
      <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.danger }]} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: online ? colors.success : colors.danger }}>
        {syncing ? 'Syncing…' : online ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

export function Screen({
  title,
  back,
  right,
  children,
  scroll = true,
  footer,
  padded = true,
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  padded?: boolean;
}) {
  const nav = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {back ? (
          <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right ?? <OfflineBadge />}</View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[padded && styles.content, { paddingBottom: footer ? 12 : 32 }]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && styles.content]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, height: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.h2, flex: 1, textAlign: 'center', fontSize: 16 },
  right: { minWidth: 72, alignItems: 'flex-end', paddingRight: spacing.sm },
  content: { padding: spacing.lg },
  footer: { padding: spacing.lg, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
