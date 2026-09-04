import React from 'react';
import { Text } from 'react-native';
import Constants from 'expo-constants';
import { Card, Divider, KV, Screen } from '../components/ui';
import { spacing, type } from '../theme';

export function SettingsScreen() {
  return (
    <Screen title="About" back>
      <Card>
        <Text style={type.h2}>Sun Sea Insights</Text>
        <Text style={type.small}>Founder's monitoring app · prototype</Text>
        <Divider />
        <KV label="Version" value={String(Constants.expoConfig?.version ?? '0.1.0')} />
        <KV label="Data" value="Demo dataset (seeded)" />
        <KV label="ERP server" value={String((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? '—')} />
      </Card>
      <Card style={{ marginTop: spacing.md }}>
        <Text style={type.h3}>What this app is for</Text>
        <Text style={[type.body, { marginTop: 6 }]}>A read-only view of the business for the founder: sales, collections, receivables, the field team, the plant and everything that needs a decision. No data is entered here — the office works in the ERP web app and agents use the Sun Sea Field app.</Text>
        <Text style={[type.body, { marginTop: 10 }]}>When connected to the ERP, every figure on these screens comes from the same tables the web dashboard uses (sales orders, invoices, vouchers, production plans, stock, purchase orders, dispatches, expenses) plus the field-app sync tables (visits, collections, follow-ups, day sessions, handovers).</Text>
      </Card>
    </Screen>
  );
}
