import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text, type ColorValue } from 'react-native';

import { useAuth } from '@/store/auth';
import { Icon, type IconName } from '@/ui/Icon';
import { typography, usePalette } from '@/ui/theme';

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} color={String(color)} size={22} strokeWidth={1.9} />;
}

// Custom label instead of the library's default `tabBarLabelStyle`-only text:
// capping the font-scale growth here keeps the tab bar's fixed-height chrome
// from clipping labels at large Dynamic Type / Android font-scale settings,
// matching the cap already applied to every other piece of fixed-size chrome
// in this app (rank badges, KPI labels, etc).
function TabLabel({ title, color }: { title: string; color: ColorValue }) {
  return (
    <Text
      style={{ fontSize: typography.caption.fontSize, fontWeight: typography.bodySm.fontWeight, color }}
      numberOfLines={1}
      maxFontSizeMultiplier={1.3}
    >
      {title}
    </Text>
  );
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
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <TabIcon name="overview" color={color} />,
          tabBarLabel: ({ color }) => <TabLabel title="Overview" color={color} />,
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: 'Agents',
          tabBarIcon: ({ color }) => <TabIcon name="agents" color={color} />,
          tabBarLabel: ({ color }) => <TabLabel title="Agents" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <TabIcon name="activity" color={color} />,
          tabBarLabel: ({ color }) => <TabLabel title="Activity" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
          tabBarLabel: ({ color }) => <TabLabel title="Settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
