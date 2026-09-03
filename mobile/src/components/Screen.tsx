import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, type } from '../theme';
import { useSync } from '../sync/SyncContext';

/** Online / Offline / Demo / Syncing pill. Tapping it opens the Sync screen. */
export function OfflineBadge() {
  const { online, syncing, demo, pending } = useSync();
  const nav = useNavigation();
  const [bg, fg, text] = demo
    ? [colors.infoSoft, colors.info, syncing ? 'Syncing…' : 'Demo']
    : online
      ? [colors.successSoft, colors.success, syncing ? 'Syncing…' : pending.total > 0 ? `${pending.total} pending` : 'Online']
      : [colors.dangerSoft, colors.danger, pending.total > 0 ? `Offline · ${pending.total}` : 'Offline'];
  return (
    <Pressable onPress={() => nav.navigate('SyncStatus' as never)} hitSlop={8} style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{text}</Text>
    </Pressable>
  );
}

export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  scroll = true,
  footer,
  padded = true,
  refreshable = false,
  overlay,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  padded?: boolean;
  /** Pull-to-refresh triggers a sync. */
  refreshable?: boolean;
  /** Rendered above the body (e.g. a FAB). */
  overlay?: React.ReactNode;
}) {
  const nav = useNavigation();
  const { sync, syncing } = useSync();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  }, [sync]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {back ? (
          <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={type.tiny} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right ?? <OfflineBadge />}</View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[padded && styles.content, { paddingBottom: footer ? 12 : 40 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshable ? <RefreshControl refreshing={refreshing || syncing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && styles.content]}>{children}</View>
        )}
        {overlay}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.h2, fontSize: 17, textAlign: 'center' },
  right: { minWidth: 84, alignItems: 'flex-end', paddingRight: spacing.sm },
  content: { padding: spacing.lg },
  footer: { padding: spacing.lg, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 6, minHeight: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
