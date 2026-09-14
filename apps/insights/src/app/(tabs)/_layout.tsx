import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text, type ColorValue } from 'react-native';

import { useAuth } from '@/store/auth';
import { usePalette } from '@/ui/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{ title: 'Overview', tabBarIcon: ({ color }) => <TabIcon symbol="◎" color={color} /> }}
      />
      <Tabs.Screen
        name="agents"
        options={{ title: 'Agents', tabBarIcon: ({ color }) => <TabIcon symbol="◈" color={color} /> }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Activity', tabBarIcon: ({ color }) => <TabIcon symbol="≣" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon symbol="⚙" color={color} /> }}
      />
    </Tabs>
  );
}
