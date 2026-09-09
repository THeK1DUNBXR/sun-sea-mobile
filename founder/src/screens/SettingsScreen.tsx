import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Board, Panel, TileRow, mono } from '../tv/primitives';
import { useTheme } from '../tv/theme';
import { useData } from '../data/DataContext';
import type { RootStackParamList } from '../navigation/types';
import { relative } from '../format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const th = useTheme();
  const { T, A } = th;
  const { source, authenticated, user, serverHost, lastUpdated, nextRefreshAt, loading, error, feeds, refresh, logout, useDemo } = useData();
  return (
    <Board scene="Settings" back>
      <Panel title="DATA SOURCE" accentBorder={source === 'demo' ? A.amber : undefined}>
        <View style={{ gap: 6 }}>
          <TileRow title={source === 'live' ? 'Live · Sun Sea ERP' : 'Demo dataset (seeded)'} sub={source === 'live' ? `${serverHost ?? ''} · ${lastUpdated ? `updated ${relative(new Date(lastUpdated))}` : 'not loaded yet'}${error ? ` · ${error}` : ''}` : 'Illustrative figures. Sign in to see the real business.'} right={source === 'live' ? (loading ? 'LOADING' : 'LIVE') : 'DEMO'} rightColor={source === 'live' ? A.green : A.amber} />
          {source === 'live' ? <TileRow title="Refresh now" sub="Pull the latest figures from the ERP" onPress={() => void refresh()} /> : null}
          {source === 'live' ? <TileRow title="Signed in as" right={user?.fullName ?? ''} /> : null}
          {source === 'live' ? (
            <TileRow title="Switch to demo data" sub="Keeps you signed in; live figures are one tap away" onPress={() => void useDemo()} />
          ) : (
            <TileRow title={authenticated ? 'Back to live data' : 'Sign in for live data'} sub={authenticated ? `Signed in as ${user?.fullName ?? ''}` : 'Use your ERP account'} onPress={() => nav.navigate('Login')} />
          )}
          <TileRow title="Server" sub={serverHost ?? 'Not connected'} right={serverHost ? 'CHANGE' : 'CONNECT'} rightColor={A.accentBg} onPress={() => nav.navigate('Server')} />
          {authenticated ? (
            <TileRow
              title="Sign out"
              rightColor={A.red}
              right="SIGN OUT"
              onPress={() =>
                Alert.alert('Sign out', 'Cached live figures are removed from this phone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
                ])
              }
            />
          ) : null}
        </View>
      </Panel>
      {source === 'live' ? (
        <Panel title="DATA FEEDS" accentBorder={feeds.some((f) => !f.ok) ? A.amber : undefined}>
          <Text style={mono({ fontSize: 12, color: T.textDim, lineHeight: 18, marginBottom: 8 })}>
            {`Figures re-pull every minute while the app is open, when you return to it, and when you pull down on any scene.${nextRefreshAt && !loading ? ` Next in ${Math.max(0, Math.round((nextRefreshAt - Date.now()) / 1000))} s.` : ''} A feed that fails keeps its last good figures and is listed here with the server's reason.`}
          </Text>
          <View style={{ gap: 6 }}>
            {feeds.length === 0 ? <TileRow title={loading ? 'Loading…' : 'No load yet'} sub="Pull down on any scene or tap Refresh now." /> : null}
            {feeds.map((f) => (
              <TileRow
                key={f.name}
                title={f.label}
                sub={f.ok ? `${f.count} rows · ${f.ms} ms` : `${f.error ?? 'Failed'}${f.stale && f.at ? ` · showing figures from ${relative(new Date(f.at))}` : ''}`}
                right={f.ok ? 'OK' : f.stale ? 'STALE' : 'FAILED'}
                rightColor={f.ok ? A.green : f.stale ? A.amber : A.red}
                leftColor={f.ok ? undefined : f.stale ? A.amber : A.red}
              />
            ))}
          </View>
        </Panel>
      ) : null}
      <Panel title="SUN SEA INSIGHTS">
        <View style={{ gap: 6 }}>
          <TileRow title="Version" right={String(Constants.expoConfig?.version ?? '0.5.0')} />
          <Pressable onPress={th.toggle}>
            <TileRow title="Display theme" right={th.isDark ? 'DARK · TAP FOR LIGHT' : 'LIGHT · TAP FOR DARK'} rightColor={A.accentBg} />
          </Pressable>
        </View>
      </Panel>
      <Panel title="WHAT THIS APP IS FOR">
        <Text style={mono({ fontSize: 13, color: T.text, lineHeight: 20 })}>A read-only view of the business for the founder, styled like the management TV dashboard in the ERP: sales, collections, receivables, the field team, the plant and everything that needs a decision. No data is entered here.</Text>
        <Text style={mono({ fontSize: 13, color: T.textDim, lineHeight: 20, marginTop: 10 })}>Live mode reads the same TV summary and accounts summary the web wall uses, plus invoices, receipts, orders, customers, stock, purchases, dispatches and expenses. The field-team scene fills in once the mobile extension is installed on the server.</Text>
      </Panel>
    </Board>
  );
}
