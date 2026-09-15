import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getServerHostLabel, getServerUrl, hydrateServerUrl } from '@/api/serverUrl';
import { serverScreen as serverCopy, settingsScreen as copy } from '@/copy';
import { useAuth } from '@/store/auth';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { SectionHeader } from '@/ui/Section';
import { MIN_TOUCH, layout, radius, sizes, spacing, tabularNums, typography, usePalette } from '@/ui/theme';
import { initials } from '@/utils/format';

function Row({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[typography.bodySm, { color: palette.textMuted }]}>{label}</Text>
      <Text
        style={[typography.body, numeric && tabularNums, { color: palette.text, flexShrink: 1, textAlign: 'right' }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
      >
        {value}
      </Text>
    </View>
  );
}

function ServerRow() {
  const palette = usePalette();
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState(getServerUrl());

  useFocusEffect(
    useCallback(() => {
      hydrateServerUrl().then(setServerUrl);
    }, [])
  );

  const host = getServerHostLabel(serverUrl);

  return (
    <PressableScale
      onPress={() => router.push('/server')}
      accessibilityRole="button"
      accessibilityLabel={serverCopy.settingsRowA11y(host)}
      style={styles.row}
    >
      <Text style={[typography.bodySm, { color: palette.textMuted }]}>{copy.serverLabel}</Text>
      <View style={styles.rowValue}>
        <Text
          style={[typography.body, { color: palette.accent, flexShrink: 1 }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.6}
        >
          {host}
        </Text>
        <Text style={[typography.body, { color: palette.textFaint }]}>›</Text>
      </View>
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const palette = usePalette();
  const { user, isSuperAdmin, isDemo, permissions, logout } = useAuth();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <Text style={[typography.headline, { color: palette.text, marginBottom: spacing.lg }]}>{copy.title}</Text>

        <Card style={styles.profileCard} elevation="raised">
          <View style={[styles.avatar, { backgroundColor: palette.accent }]}>
            <Text style={[typography.title, { color: palette.accentInk }]} maxFontSizeMultiplier={1.4}>
              {initials(user?.fullName ?? user?.email)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: palette.text }]} numberOfLines={1} maxFontSizeMultiplier={1.6}>
              {user?.fullName?.trim() || copy.defaultName}
            </Text>
            <Text style={[typography.bodySm, { color: palette.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            {isDemo ? (
              <View style={[styles.badge, { backgroundColor: palette.warnSoft }]}>
                <Text style={[typography.label, { color: palette.warn }]}>{copy.demoBadge}</Text>
              </View>
            ) : isSuperAdmin ? (
              <View style={[styles.badge, { backgroundColor: palette.goodSoft }]}>
                <Text style={[typography.label, { color: palette.good }]}>{copy.superAdminBadge}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {isDemo ? (
          <Card>
            <Text style={[typography.bodySm, { color: palette.textMuted }]}>{copy.demoNote}</Text>
          </Card>
        ) : (
          <>
            <SectionHeader title={copy.connectionSection} />
            <Card style={{ gap: spacing.sm }}>
              <ServerRow />
              <Row label={copy.overviewRefreshLabel} value={copy.overviewRefreshValue} />
              <Row label={copy.agentsRefreshLabel} value={copy.agentsRefreshValue} />
            </Card>

            <SectionHeader title={copy.accessSection} />
            <Card>
              {permissions.length === 0 && !isSuperAdmin ? (
                <Text style={[typography.body, { color: palette.textFaint }]}>{copy.noPermissions}</Text>
              ) : isSuperAdmin ? (
                <Text style={[typography.bodySm, { color: palette.textMuted }]}>
                  {copy.superAdminNote}
                </Text>
              ) : (
                permissions.map((perm) => (
                  <Text key={perm} style={[typography.bodySm, { color: palette.textMuted, marginBottom: 4 }]}>
                    • {perm}
                  </Text>
                ))
              )}
            </Card>
          </>
        )}

        <PressableScale
          onPress={() => logout()}
          accessibilityRole="button"
          accessibilityLabel={isDemo ? copy.exitDemo : copy.logOut}
          rippleColor={palette.badSoft}
          style={({ pressed }) => [
            styles.logoutButton,
            // iOS-only press dim; Android shows the Material ripple instead.
            { borderColor: palette.bad, opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="logout" color={palette.bad} size={18} />
          <Text style={[typography.control, { color: palette.bad }]}>{isDemo ? copy.exitDemo : copy.logOut}</Text>
        </PressableScale>

        <Text style={[typography.caption, styles.footerNote, { color: palette.textFaint }]}>
          {copy.footer}
        </Text>

        <View style={{ height: layout.scrollEndSpacer }} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: sizes.avatarMd,
    height: sizes.avatarMd,
    borderRadius: sizes.avatarMd / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: MIN_TOUCH },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: MIN_TOUCH,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  footerNote: { textAlign: 'center', marginTop: spacing.xl },
});
