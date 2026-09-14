import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
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
      >
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const palette = usePalette();
  const { user, isSuperAdmin, permissions, logout } = useAuth();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.headline, { color: palette.text, marginBottom: spacing.lg }]}>Settings</Text>

        <Card style={styles.profileCard} elevation="raised">
          <View style={[styles.avatar, { backgroundColor: palette.accent }]}>
            <Text style={[typography.title, { color: palette.accentInk }]} maxFontSizeMultiplier={1.4}>
              {initials(user?.fullName ?? user?.email)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: palette.text }]} numberOfLines={1} maxFontSizeMultiplier={1.6}>
              {user?.fullName?.trim() || 'Founder'}
            </Text>
            <Text style={[typography.bodySm, { color: palette.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            {isSuperAdmin ? (
              <View style={[styles.badge, { backgroundColor: palette.goodSoft }]}>
                <Text style={[typography.label, { color: palette.good }]}>Super admin</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <SectionHeader title="Connection" />
        <Card style={{ gap: spacing.sm }}>
          <Row label="Server" value={API_URL} />
          <Row label="Overview refresh" value="Every 60s" />
          <Row label="Agents refresh" value="Every 30s" />
        </Card>

        <SectionHeader title="Access" />
        <Card>
          {permissions.length === 0 && !isSuperAdmin ? (
            <Text style={[typography.body, { color: palette.textFaint }]}>No permissions listed.</Text>
          ) : isSuperAdmin ? (
            <Text style={[typography.bodySm, { color: palette.textMuted }]}>
              Full access via super admin role.
            </Text>
          ) : (
            permissions.map((perm) => (
              <Text key={perm} style={[typography.bodySm, { color: palette.textMuted, marginBottom: 4 }]}>
                • {perm}
              </Text>
            ))
          )}
        </Card>

        <PressableScale
          onPress={() => logout()}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: palette.bad, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="logout" color={palette.bad} size={18} />
          <Text style={[typography.control, { color: palette.bad }]}>Log out</Text>
        </PressableScale>

        <Text style={[typography.caption, styles.footerNote, { color: palette.textFaint }]}>
          SunSea Insights · read-only founder dashboard
        </Text>

        <View style={{ height: layout.scrollEndSpacer }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: layout.screenGutter },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
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
