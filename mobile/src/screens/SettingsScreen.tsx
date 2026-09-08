import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { deviceSupportsLock, isAppLockEnabled, setAppLockEnabled } from '../auth/AppLock';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, IconTile, KeyValue, ListItem, Notice } from '../components/ui';
import { getServerInfo } from '../api/server';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { getApiUrl } from '../api/client';
import { APP_VERSION } from '../config';
import { colors, spacing, type } from '../theme';
import { resetDatabase } from '../db';
import { useLocationSharing } from '../location/LocationSharing';
import { relativeTime } from '../utils/format';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { agent, logout, isAuthenticated, bootstrap, isDemo } = useAuth();
  const share = useLocationSharing();
  const [url, setUrl] = useState('');
  const [lock, setLock] = useState(false);
  const [serverMode, setServerMode] = useState<string | null>(null);
  const [lockSupported, setLockSupported] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl);
    isAppLockEnabled().then(setLock);
    getServerInfo().then((i) => setServerMode(i?.mode ?? null));
    deviceSupportsLock().then(setLockSupported).catch(() => setLockSupported(false));
  }, []);


  const wipe = () =>
    Alert.alert('Clear local data', 'Deletes all downloaded data AND any unsynced collections or orders on this device. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await resetDatabase();
          Alert.alert('Done', 'Local data cleared. Run a sync to download again.');
        },
      },
    ]);

  return (
    <Screen title="Settings" back right={<Text />}>
      {isDemo ? <Notice tone="info" text="Demo mode — you are exploring sample data on this device. Sync and cheque OCR are simulated. Log out to return to the login screen." /> : null}
      {isAuthenticated && agent ? (
        <Card>
          <KeyValue label="Signed in as" value={agent.fullName} />
          <Divider />
          <KeyValue label="Email" value={agent.email ?? '—'} />
          {bootstrap?.company ? (
            <>
              <Divider />
              <KeyValue label="Company" value={bootstrap.company.companyName} />
            </>
          ) : null}
        </Card>
      ) : null}

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Security</Text>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>App lock</Text>
          <Text style={type.small}>{lockSupported ? 'Ask for fingerprint / face / device PIN when opening the app or after a minute in the background.' : 'Set up a screen lock or fingerprint on this phone to enable.'}</Text>
        </View>
        <Switch
          value={lock}
          disabled={!lockSupported}
          onValueChange={async (v) => {
            setLock(v);
            await setAppLockEnabled(v);
          }}
        />
      </Card>

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Location sharing</Text>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Share my location with the office</Text>
          <Text style={type.small}>
            {isDemo
              ? 'Demo mode — nothing is sent. On a live server your position shows on the Field Sales map in the Sun Sea web app while your day is open.'
              : share.tracking
                ? `Sharing now (every 2 min or 120 m while the day is open).${share.status?.lastSentAt ? ` Last sent ${relativeTime(share.status.lastSentAt)}.` : ''}${share.status?.queued ? ` ${share.status.queued} waiting to send.` : ''}`
                : share.enabled
                  ? 'Starts automatically when you start your day and stops when you end it. Only while the app is open.'
                  : 'Off — your position is not sent. Check-ins still record where the visit happened.'}
          </Text>
          {!isDemo && share.status?.unsupported ? <Text style={[type.small, { color: colors.warning, marginTop: 4 }]}>The server has no location module yet; positions are kept on the phone until it does.</Text> : null}
          {!isDemo && share.status?.lastError && !share.status.unsupported ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>{share.status.lastError}</Text> : null}
        </View>
        <Switch value={share.enabled} disabled={isDemo} onValueChange={(v) => void share.setEnabled(v)} />
      </Card>

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Server</Text>
      <Card style={{ padding: 0 }}>
        <ListItem
          leading={<IconTile icon="cloud-outline" tone="info" size={40} />}
          title={url && !/YOUR-SERVICE/.test(url) ? url.replace(/^https?:\/\//, '').replace(/\/api$/, '') : 'Not connected'}
          subtitle={serverMode === 'mobile' ? 'Mobile extension · full sync' : serverMode === 'direct' ? 'Direct ERP · collections post as receipt vouchers' : 'Tap to connect to the Sun Sea backend (Railway or office server)'}
          onPress={() => navigation.navigate('Server' as never)}
        />
      </Card>

      {isAuthenticated ? (
        <>
          <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Account</Text>
          <Button title={isDemo ? 'Exit demo' : 'Log out'} variant="danger" onPress={() => void logout()} />
          {!isDemo ? <Button title="Clear local data" variant="ghost" small onPress={wipe} style={{ marginTop: spacing.sm }} /> : null}
        </>
      ) : null}

      <Text style={[type.tiny, { textAlign: 'center', marginTop: spacing.xxl }]}>Sun Sea Field v{APP_VERSION}</Text>
    </Screen>
  );
}
