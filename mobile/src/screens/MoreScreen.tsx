import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card, IconTile, ListItem, type IconName } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../sync/SyncContext';
import { spacing, type } from '../theme';
import { relativeTime } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MoreScreen() {
  const nav = useNavigation<Nav>();
  const { agent, isDemo } = useAuth();
  const { lastSyncAt, pending } = useSync();

  const groups: { title: string; items: { icon: IconName; tone: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; title: string; subtitle: string; screen: keyof RootStackParamList }[] }[] = [
    {
      title: 'Cash & day',
      items: [
        { icon: 'wallet-outline', tone: 'danger', title: 'Cash & day close', subtitle: 'Start / end day, cash in hand, end-of-day summary', screen: 'Day' },
        { icon: 'business-outline', tone: 'primary', title: 'Cash handover / deposit', subtitle: 'Hand cash to the office or record a bank deposit', screen: 'Handover' },
        { icon: 'document-text-outline', tone: 'info', title: 'Cheque register', subtitle: 'Cheques collected, post-dated cheques due', screen: 'Cheques' },
      ],
    },
    {
      title: 'Field work',
      items: [
        { icon: 'storefront-outline', tone: 'accent', title: 'New outlets (leads)', subtitle: 'Outlets you added, waiting for the office', screen: 'Leads' },
        { icon: 'receipt-outline', tone: 'warning', title: 'Expense claims', subtitle: 'Travel, fuel, food — with receipt photos', screen: 'Expenses' },
        { icon: 'bar-chart-outline', tone: 'success', title: 'My performance', subtitle: 'Targets, collections by mode, visit productivity', screen: 'Performance' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'cloud-upload-outline', tone: 'info', title: 'Sync status', subtitle: pending.total ? `${pending.total} pending · last sync ${relativeTime(lastSyncAt)}` : `Up to date · last sync ${relativeTime(lastSyncAt)}`, screen: 'SyncStatus' },
        { icon: 'settings-outline', tone: 'primary', title: 'Settings', subtitle: isDemo ? 'Demo mode · app lock · server' : 'App lock · server · log out', screen: 'Settings' },
      ],
    },
  ];

  return (
    <Screen title="More">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={agent?.fullName ?? 'A'} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{agent?.fullName ?? 'Agent'}</Text>
          <Text style={type.small}>{agent?.email ?? ''}</Text>
        </View>
      </Card>
      {groups.map((g) => (
        <View key={g.title} style={{ marginTop: spacing.lg }}>
          <Text style={[type.label, { marginBottom: spacing.sm }]}>{g.title}</Text>
          <Card style={{ padding: 0 }}>
            {g.items.map((it) => (
              <ListItem key={it.title} leading={<IconTile icon={it.icon} tone={it.tone} size={40} />} title={it.title} subtitle={it.subtitle} onPress={() => nav.navigate(it.screen as never)} />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
