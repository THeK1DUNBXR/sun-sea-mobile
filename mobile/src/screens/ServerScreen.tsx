import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, Field, IconTile, KeyValue, Notice, Pill } from '../components/ui';
import { Chips } from '../components/Chips';
import { useToast } from '../components/Toast';
import { colors, spacing, type } from '../theme';
import { DEFAULT_API_URL } from '../config';
import { getApiUrl } from '../api/client';
import { getServerInfo, hostOf, isRailway, normalizeServerUrl, probeServer, saveServer, type ServerInfo } from '../api/server';
import { invalidateApiMode } from '../api';
import { relativeTime } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

type Preset = 'railway' | 'lan' | 'custom';

export function ServerScreen() {
  const nav = useNavigation();
  const toast = useToast();
  const { isAuthenticated, isDemo } = useAuth();
  const [url, setUrl] = useState('');
  const [preset, setPreset] = useState<Preset>('railway');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ServerInfo | null>(null);
  const [saved, setSaved] = useState<ServerInfo | null>(null);

  useEffect(() => {
    getServerInfo().then((info) => {
      setSaved(info);
      setUrl(info?.apiUrl && !/YOUR-SERVICE/.test(info.apiUrl) ? info.apiUrl : '');
      if (info?.apiUrl && /^http:\/\/(192\.168|10\.|172\.)/.test(info.apiUrl)) setPreset('lan');
    });
  }, []);

  const test = async () => {
    const normalized = normalizeServerUrl(url);
    if (!normalized) return Alert.alert('Server address', 'Paste the Railway domain of the Sun Sea backend, e.g. sunsea-backend-production.up.railway.app');
    setUrl(normalized);
    setBusy(true);
    setResult(null);
    const info = await probeServer(normalized);
    setResult(info);
    setBusy(false);
  };

  const save = async () => {
    if (!result?.reachable) return;
    await saveServer(result);
    invalidateApiMode();
    setSaved(result);
    toast.show(`Connected to ${result.host}`);
    if (isAuthenticated && !isDemo) {
      Alert.alert('Server changed', 'You are logged in to a different server. Log out and sign in again to use this one.', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } else {
      nav.goBack();
    }
  };

  const modeCopy = (m: ServerInfo['mode']) =>
    m === 'mobile'
      ? 'Mobile extension installed — routes, visits, receipts with photos and cheque OCR all sync.'
      : 'Plain ERP — the app reads customers, invoices and products and posts collections as receipt vouchers and orders as draft sales orders. Routes, follow-ups and photos stay on this phone.';

  return (
    <Screen title="Connect to server" back right={<View />} footer={<Button title={result?.reachable ? `Use ${result.host}` : 'Test connection first'} onPress={save} disabled={!result?.reachable} />}>
      {saved?.apiUrl && !/YOUR-SERVICE/.test(saved.apiUrl) ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile icon={saved.reachable ? 'cloud-done-outline' : 'cloud-outline'} tone={saved.reachable ? 'success' : 'primary'} />
          <View style={{ flex: 1 }}>
            <Text style={type.small}>Current server</Text>
            <Text style={type.h3}>{saved.host}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {saved.mode ? <Pill text={saved.mode === 'mobile' ? 'Mobile extension' : 'Direct ERP'} tone={saved.mode === 'mobile' ? 'success' : 'info'} /> : null}
              {isRailway(saved.apiUrl) ? <Pill text="Railway" tone="accent" icon="train-outline" /> : null}
              {saved.checkedAt ? <Text style={type.tiny}>checked {relativeTime(saved.checkedAt)}</Text> : null}
            </View>
          </View>
        </Card>
      ) : (
        <Notice tone="info" text="Not connected yet. Paste the address of the Sun Sea backend to link this phone to the ERP." />
      )}

      <Text style={[type.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Where is the backend hosted?</Text>
      <Chips
        value={preset}
        onChange={(p) => {
          setPreset(p);
          if (p === 'lan' && !url) setUrl('http://192.168.1.10:5000');
        }}
        scroll={false}
        options={[
          { value: 'railway', label: 'Railway', icon: 'train-outline' },
          { value: 'lan', label: 'Office network', icon: 'wifi-outline' },
          { value: 'custom', label: 'Other', icon: 'globe-outline' },
        ]}
      />

      <Field
        label={preset === 'railway' ? 'Railway public domain' : 'Server address'}
        value={url}
        onChangeText={setUrl}
        placeholder={preset === 'railway' ? 'sunsea-backend-production.up.railway.app' : preset === 'lan' ? 'http://192.168.1.10:5000' : 'https://erp.example.com'}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint={preset === 'railway' ? 'Railway → your backend service → Settings → Networking → Public domain. With or without https:// and /api.' : 'The app adds /api if you leave it out.'}
        style={{ marginTop: spacing.lg }}
      />
      <Button title="Test connection" icon="pulse-outline" variant="outline" onPress={test} loading={busy} />

      {result ? (
        <Card style={{ marginTop: spacing.lg, borderColor: result.reachable ? colors.success : colors.danger, borderWidth: 1.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name={result.reachable ? 'checkmark-circle' : 'close-circle'} size={28} color={result.reachable ? colors.success : colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{result.reachable ? 'Server reachable' : 'Could not reach the server'}</Text>
              <Text style={type.small}>{result.host}</Text>
            </View>
          </View>
          {result.error ? <Text style={[type.small, { color: result.reachable ? colors.warning : colors.danger, marginTop: spacing.sm }]}>{result.error}</Text> : null}
          {result.reachable ? (
            <>
              <Divider />
              <KeyValue label="ERP API version" value={result.version ?? '—'} />
              <KeyValue label="Environment" value={result.environment ?? '—'} />
              <KeyValue label="Response time" value={result.latencyMs ? `${result.latencyMs} ms${result.wokeFromSleep ? ' (woke from sleep)' : ''}` : '—'} />
              <KeyValue label="Integration" value={result.mode === 'mobile' ? 'Mobile extension' : 'Direct ERP'} />
              <Text style={[type.small, { marginTop: spacing.sm }]}>{modeCopy(result.mode)}</Text>
              {result.wokeFromSleep ? <Notice tone="info" text="This Railway service sleeps when idle. The first sync of the day can take a few seconds while it wakes; the app retries automatically." /> : null}
            </>
          ) : (
            <Text style={[type.small, { marginTop: spacing.sm }]}>Check the domain in Railway, that the service is deployed and listening on the PORT Railway assigns, and that the phone has internet.</Text>
          )}
        </Card>
      ) : null}

      <Text style={[type.tiny, { marginTop: spacing.xl }]}>Build default: {DEFAULT_API_URL}</Text>
      <Text style={type.tiny}>Current: {saved?.apiUrl ?? '—'} {saved?.apiUrl ? `(${hostOf(saved.apiUrl)})` : ''}</Text>
      <HiddenGetter />
    </Screen>
  );
}

/** Keeps the module's getApiUrl import live for tooling; no UI. */
function HiddenGetter() {
  useEffect(() => {
    void getApiUrl();
  }, []);
  return null;
}
