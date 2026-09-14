import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/store/auth';
import { Icon, type IconName } from '@/ui/Icon';
import { usePalette } from '@/ui/theme';

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} color={String(color)} size={22} strokeWidth={1.9} />;
}

export default function TabsLayout() {
  const { isAuthenticated, isHydrating } = useAuth();
  const palette = usePalette();

  if (!isHydrating && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textFaint,
        tabBarStyle: {
          backgroundColor: palette.bgElevated,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{ title: 'Overview', tabBarIcon: ({ color }) => <TabIcon name="overview" color={color} /> }}
      />
      <Tabs.Screen
        name="agents"
        options={{ title: 'Agents', tabBarIcon: ({ color }) => <TabIcon name="agents" color={color} /> }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Activity', tabBarIcon: ({ color }) => <TabIcon name="activity" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }}
      />
    </Tabs>
  );
}
