import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../sync/SyncContext';
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.line },
};

function MainTabs() {
  const { pending } = useSync();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line },
        tabBarIcon: ({ color, size }) => {
          const icon: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'grid-outline',
            Route: 'map-outline',
            Customers: 'people-outline',
            Sync: 'cloud-upload-outline',
          };
          return <Ionicons name={icon[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Route" component={RoutePlanScreen} options={{ title: 'Route Plan' }} />
      <Tabs.Screen name="Customers" component={CustomersScreen} />
      <Tabs.Screen name="Sync" component={SyncStatusScreen} options={{ tabBarBadge: pending.total > 0 ? pending.total : undefined }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
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
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
