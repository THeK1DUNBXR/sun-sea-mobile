import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Board, Panel, TileRow, mono } from '../tv/primitives';
import { useTheme } from '../tv/theme';

export function SettingsScreen() {
  const th = useTheme();
  const { T, A } = th;
  return (
    <Board scene="About" back>
      <Panel title="SUN SEA INSIGHTS">
        <View style={{ gap: 6 }}>
          <TileRow title="Version" right={String(Constants.expoConfig?.version ?? '0.2.0')} />
          <TileRow title="Data" right="DEMO (SEEDED)" rightColor={A.amber} />
          <TileRow title="ERP server" right={String((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? '—')} />
          <Pressable onPress={th.toggle}>
            <TileRow title="Display theme" right={th.isDark ? 'DARK · TAP FOR LIGHT' : 'LIGHT · TAP FOR DARK'} rightColor={A.accentBg} />
          </Pressable>
        </View>
      </Panel>
      <Panel title="WHAT THIS APP IS FOR">
        <Text style={mono({ fontSize: 13, color: T.text, lineHeight: 20 })}>A read-only view of the business for the founder, styled like the management TV dashboard in the ERP: sales, collections, receivables, the field team, the plant and everything that needs a decision. No data is entered here — the office works in the ERP web app and agents use the Sun Sea Field app.</Text>
        <Text style={mono({ fontSize: 13, color: T.textDim, lineHeight: 20, marginTop: 10 })}>When connected, the figures come from the same tables as the web TV dashboard (sales orders, invoices, vouchers, production plans, stock, purchase orders, dispatches, expenses) plus the field-app sync tables.</Text>
      </Panel>
    </Board>
  );
}
