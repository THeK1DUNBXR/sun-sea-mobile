import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
import { useAuth } from '@/store/auth';
import { Card } from '@/ui/Card';
import { SectionHeader } from '@/ui/Section';
import { radius, spacing, usePalette } from '@/ui/theme';
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
        <Text style={[styles.headline, { color: palette.text }]}>Settings</Text>

        <Card style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: palette.accent }]}>
            <Text style={styles.avatarText}>{initials(user?.name ?? user?.email)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
              {user?.name ?? 'Founder'}
            </Text>
            <Text style={[styles.profileEmail, { color: palette.textMuted }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            {isSuperAdmin ? (
              <Text style={[styles.badge, { color: palette.good }]}>Super admin</Text>
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
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              Full access via super admin role.
            </Text>
          ) : (
            permissions.map((perm) => (
              <Text key={perm} style={{ color: palette.textMuted, fontSize: 13, marginBottom: 4 }}>
                • {perm}
              </Text>
            ))
          )}
        </Card>

        <Pressable
          onPress={() => logout()}
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: palette.bad, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.logoutText, { color: palette.bad }]}>Log out</Text>
        </Pressable>

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
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  profileName: { fontSize: 17, fontWeight: '800' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 13, flexShrink: 1, textAlign: 'right' },
  logoutButton: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  footerNote: { textAlign: 'center', fontSize: 11, marginTop: spacing.xl },
});
