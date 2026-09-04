import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MONO, ThemeProvider, useTheme } from './tv/theme';
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

function MainTabs() {
  const { T, A } = useTheme();
  const urgent = attention.filter((a) => a.severity === 'critical' || a.severity === 'serious').length;
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: A.accentBg,
        tabBarInactiveTintColor: T.textMute,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '800', fontFamily: MONO, letterSpacing: 0.6, textTransform: 'uppercase' },
        tabBarStyle: { backgroundColor: T.panel, borderTopColor: T.headerBorder, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Overview: ['grid-outline', 'grid'],
            Sales: ['trending-up-outline', 'trending-up'],
            Receivables: ['wallet-outline', 'wallet'],
            Team: ['navigate-outline', 'navigate'],
            Operations: ['construct-outline', 'construct'],
          };
          return <Ionicons name={icons[route.name][focused ? 1 : 0]} size={size - 2} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Overview" component={OverviewScreen} options={{ tabBarBadge: urgent || undefined, tabBarBadgeStyle: { backgroundColor: A.red, color: '#fff', fontSize: 10, fontFamily: MONO } }} />
      <Tabs.Screen name="Sales" component={SalesScreen} />
      <Tabs.Screen name="Receivables" component={ReceivablesScreen} options={{ title: 'Receivable' }} />
      <Tabs.Screen name="Team" component={TeamScreen} options={{ title: 'Field' }} />
      <Tabs.Screen name="Operations" component={OperationsScreen} options={{ title: 'Plant' }} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { T, A, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: A.accentBg, background: T.bg, card: T.panel, text: T.text, border: T.headerBorder } };
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Agent" component={AgentScreen} />
        <Stack.Screen name="Attention" component={AttentionScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
