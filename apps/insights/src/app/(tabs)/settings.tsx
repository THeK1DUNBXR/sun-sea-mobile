import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
import { useAuth } from '@/store/auth';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { SectionHeader } from '@/ui/Section';
import { MIN_TOUCH, radius, spacing, typography, usePalette } from '@/ui/theme';
import { initials } from '@/utils/format';

function Row({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.text }]} numberOfLines={1}>
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
            <Text style={[styles.avatarText, { color: palette.accentInk }]} maxFontSizeMultiplier={1.4}>
              {initials(user?.fullName ?? user?.email)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1} maxFontSizeMultiplier={1.6}>
              {user?.fullName?.trim() || 'Founder'}
            </Text>
            <Text style={[styles.profileEmail, { color: palette.textMuted }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            {isSuperAdmin ? (
              <View style={[styles.badge, { backgroundColor: palette.goodSoft }]}>
                <Text style={[styles.badgeText, { color: palette.good }]}>Super admin</Text>
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
            <Text style={{ color: palette.textFaint, fontSize: 13 }}>No permissions listed.</Text>
          ) : isSuperAdmin ? (
            <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '600' }}>
              Full access via super admin role.
            </Text>
          ) : (
            permissions.map((perm) => (
              <Text key={perm} style={{ color: palette.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
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
          <Text style={[styles.logoutText, { color: palette.bad }]}>Log out</Text>
        </PressableScale>

        <Text style={[styles.footerNote, { color: palette.textFaint }]}>
          SunSea Insights · read-only founder dashboard
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  profileName: { fontSize: 17.5, fontWeight: '800', letterSpacing: -0.2 },
  profileEmail: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: 13, fontWeight: '700' },
  rowValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    minHeight: MIN_TOUCH,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  logoutText: { fontSize: 15.5, fontWeight: '800' },
  footerNote: { textAlign: 'center', fontSize: 11, fontWeight: '600', marginTop: spacing.xl },
});
