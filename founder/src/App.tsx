import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';
import type { RootStackParamList, TabParamList } from './navigation/types';
import { OverviewScreen } from './screens/OverviewScreen';
import { SalesScreen } from './screens/SalesScreen';
import { ReceivablesScreen } from './screens/ReceivablesScreen';
import { AgentScreen, TeamScreen } from './screens/TeamScreen';
import { OperationsScreen } from './screens/OperationsScreen';
import { AttentionScreen } from './screens/AttentionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { attention } from './data/demo';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.line } };

function MainTabs() {
  const urgent = attention.filter((a) => a.severity === 'critical' || a.severity === 'serious').length;
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.line, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Overview: ['home-outline', 'home'],
            Sales: ['trending-up-outline', 'trending-up'],
            Receivables: ['wallet-outline', 'wallet'],
            Team: ['people-outline', 'people'],
            Operations: ['construct-outline', 'construct'],
          };
          return <Ionicons name={icons[route.name][focused ? 1 : 0]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Overview" component={OverviewScreen} options={{ tabBarBadge: urgent || undefined, tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 } }} />
      <Tabs.Screen name="Sales" component={SalesScreen} />
      <Tabs.Screen name="Receivables" component={ReceivablesScreen} />
      <Tabs.Screen name="Team" component={TeamScreen} />
      <Tabs.Screen name="Operations" component={OperationsScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Agent" component={AgentScreen} />
            <Stack.Screen name="Attention" component={AttentionScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
