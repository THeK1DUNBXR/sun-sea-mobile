import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '@/ui/theme';

/** Renders a tab's label directly (instead of the library's default single-
 * line Text) so it wraps to a second line under Android's 1.3x font scale or
 * iOS Dynamic Type instead of being clipped/ellipsized — the tab bar's own
 * min height (below) grows to fit rather than the label losing characters. */
function TabLabel({ color, title }: { color: ColorValue; title: string }) {
  return (
    <Text
      style={{ ...type.caption, color, textAlign: 'center' }}
      numberOfLines={2}
      maxFontSizeMultiplier={1.5}
    >
      {title}
    </Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Base content height (icon + label) plus the device's own bottom inset —
  // covers the iPhone home indicator, Android's 3-button nav bar, and
  // Android's gesture-nav strip alike, instead of a bare fixed height that
  // only happened to clear one of them.
  const barHeight = 56 + Math.max(insets.bottom, spacing.sm);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          height: barHeight,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingTop: spacing.sm,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          tabBarLabel: ({ color }) => <TabLabel color={color} title="Home" />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
          tabBarLabel: ({ color }) => <TabLabel color={color} title="Assignments" />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
          tabBarLabel: ({ color }) => <TabLabel color={color} title="History" />,
        }}
      />
      <Tabs.Screen
        name="deposits"
        options={{
          title: 'Deposits',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} />,
          tabBarLabel: ({ color }) => <TabLabel color={color} title="Deposits" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          tabBarLabel: ({ color }) => <TabLabel color={color} title="Profile" />,
        }}
      />
    </Tabs>
  );
}
