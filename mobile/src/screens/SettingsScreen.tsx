import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { deviceSupportsLock, isAppLockEnabled, setAppLockEnabled } from '../auth/AppLock';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, Field, KeyValue, Notice } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { getApiUrl, setApiUrl } from '../api/client';
import { APP_VERSION, DEFAULT_API_URL } from '../config';
import { spacing, type } from '../theme';
import { resetDatabase } from '../db';

export function SettingsScreen() {
  const { agent, logout, isAuthenticated, bootstrap, isDemo } = useAuth();
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [lock, setLock] = useState(false);
  const [lockSupported, setLockSupported] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl);
    isAppLockEnabled().then(setLock);
    deviceSupportsLock().then(setLockSupported).catch(() => setLockSupported(false));
  }, []);

  const save = async () => {
    await setApiUrl(url === DEFAULT_API_URL ? null : url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

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

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Server</Text>
      <Field label="API base URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" hint={`Default: ${DEFAULT_API_URL}`} />
      <Button title={saved ? 'Saved' : 'Save server URL'} variant="outline" onPress={save} />

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
