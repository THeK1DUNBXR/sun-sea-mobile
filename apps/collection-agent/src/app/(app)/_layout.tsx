import React from 'react';
import { Stack } from 'expo-router';

import { colors, fontWeight } from '@/ui/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: true,
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontSize: 17, ...fontWeight('800') },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="assignment/[id]" options={{ title: 'Assignment' }} />
      <Stack.Screen name="collect/[assignmentId]" options={{ title: 'Record Collection' }} />
      <Stack.Screen name="visit/[assignmentId]" options={{ title: 'Record Visit' }} />
      <Stack.Screen name="receipt/[recordId]" options={{ title: 'Receipt' }} />
      <Stack.Screen name="map" options={{ title: 'Map' }} />
    </Stack>
  );
}
