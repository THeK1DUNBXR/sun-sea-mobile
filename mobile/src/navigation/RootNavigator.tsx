import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { colors } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { tables } from '../db';
import { useCount } from '../db/hooks';
import type { MainTabParamList, RootStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RoutePlanScreen } from '../screens/RoutePlanScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { SyncStatusScreen } from '../screens/SyncStatusScreen';
import { CustomerDetailScreen } from '../screens/CustomerDetailScreen';
import { CollectionEntryScreen } from '../screens/CollectionEntryScreen';
import { PaymentModeScreen } from '../screens/PaymentModeScreen';
import { CashPaymentScreen } from '../screens/CashPaymentScreen';
import { ChequePaymentScreen } from '../screens/ChequePaymentScreen';
import { UpiPaymentScreen } from '../screens/UpiPaymentScreen';
import { CollectionSuccessScreen } from '../screens/CollectionSuccessScreen';
import { NewOrderScreen } from '../screens/NewOrderScreen';
import { OrderReviewScreen } from '../screens/OrderReviewScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { OutstandingScreen } from '../screens/OutstandingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FollowUpsScreen } from '../screens/FollowUpsScreen';
import { FollowUpLogScreen } from '../screens/FollowUpLogScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { ChequesScreen } from '../screens/ChequesScreen';
import { DayScreen } from '../screens/DayScreen';
import { HandoverScreen } from '../screens/HandoverScreen';
import { ExpensesScreen, ExpenseNewScreen } from '../screens/ExpensesScreen';
import { LeadsScreen, LeadNewScreen } from '../screens/LeadsScreen';
import { PerformanceScreen } from '../screens/PerformanceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.line },
};

function MainTabs() {
  const dueFollowUps = useCount(() => tables.followUps().query(Q.where('status', 'OPEN'), Q.where('due_at', Q.lte(Date.now() + 86400000))), []);
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.line, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size, focused }) => {
          const icon: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home: ['home-outline', 'home'],
            Route: ['map-outline', 'map'],
            Customers: ['people-outline', 'people'],
            FollowUps: ['alarm-outline', 'alarm'],
            More: ['grid-outline', 'grid'],
          };
          return <Ionicons name={icon[route.name][focused ? 1 : 0]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      <Tabs.Screen name="Route" component={RoutePlanScreen} options={{ title: 'Route' }} />
      <Tabs.Screen name="Customers" component={CustomersScreen} />
      <Tabs.Screen name="FollowUps" component={FollowUpsScreen} options={{ title: 'Follow-ups', tabBarBadge: dueFollowUps > 0 ? dueFollowUps : undefined, tabBarBadgeStyle: { backgroundColor: colors.warning } }} />
      <Tabs.Screen name="More" component={MoreScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="CollectionEntry" component={CollectionEntryScreen} />
            <Stack.Screen name="PaymentMode" component={PaymentModeScreen} />
            <Stack.Screen name="CashPayment" component={CashPaymentScreen} />
            <Stack.Screen name="ChequePayment" component={ChequePaymentScreen} />
            <Stack.Screen name="UpiPayment" component={UpiPaymentScreen} />
            <Stack.Screen name="CollectionSuccess" component={CollectionSuccessScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
            <Stack.Screen name="OrderReview" component={OrderReviewScreen} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Outstanding" component={OutstandingScreen} />
            <Stack.Screen name="FollowUpLog" component={FollowUpLogScreen} />
            <Stack.Screen name="Cheques" component={ChequesScreen} />
            <Stack.Screen name="Day" component={DayScreen} />
            <Stack.Screen name="Handover" component={HandoverScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="ExpenseNew" component={ExpenseNewScreen} />
            <Stack.Screen name="Leads" component={LeadsScreen} />
            <Stack.Screen name="LeadNew" component={LeadNewScreen} />
            <Stack.Screen name="Performance" component={PerformanceScreen} />
            <Stack.Screen name="SyncStatus" component={SyncStatusScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
