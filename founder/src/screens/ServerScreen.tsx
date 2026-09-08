import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Board, Panel, TileRow, mono } from '../tv/primitives';
import { useTheme } from '../tv/theme';
import { getServerInfo, isRailway, normalizeServerUrl, probeServer, saveServer, type ServerInfo } from '../api/server';
import { DEFAULT_API_URL } from '../api/client';

export function ServerScreen() {
  const nav = useNavigation();
  const { T, A } = useTheme();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ServerInfo | null>(null);
  const [saved, setSaved] = useState<ServerInfo | null>(null);

  useEffect(() => {
    getServerInfo().then((i) => {
      setSaved(i);
      setUrl(i?.apiUrl ?? DEFAULT_API_URL);
    });
  }, []);

  const test = async () => {
    const n = normalizeServerUrl(url);
    if (!n) return;
    setUrl(n);
    setBusy(true);
    setResult(await probeServer(n));
    setBusy(false);
  };
  const save = async () => {
    if (!result?.reachable) return;
    await saveServer(result);
    setSaved(result);
    nav.goBack();
  };

  const input = { fontFamily: mono().fontFamily, fontSize: 13, color: T.text, backgroundColor: T.tile, borderWidth: 1, borderColor: T.panelBorder, borderRadius: 2, paddingHorizontal: 12, minHeight: 48 } as const;

  return (
    <Board scene="Connect to server" back>
      <Panel title="CURRENT">
        <TileRow title={saved?.host ?? '—'} sub={saved?.mode === 'mobile' ? 'Mobile extension installed · field team data available' : saved?.mode === 'direct' ? 'Plain ERP · field team scene needs the mobile extension' : 'Not tested yet'} right={saved?.apiUrl && isRailway(saved.apiUrl) ? 'RAILWAY' : undefined} rightColor={A.accentBg} />
      </Panel>
      <Panel title="BACKEND ADDRESS">
        <Text style={mono({ fontSize: 11, color: T.textDim, marginBottom: 8 })}>Railway → backend service → Settings → Networking → Public domain. With or without https:// and /api.</Text>
        <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="sunseaerp-production.up.railway.app" placeholderTextColor={T.textMute} style={input} />
        <Pressable onPress={test} disabled={busy} style={{ marginTop: 12, minHeight: 46, borderWidth: 1, borderColor: A.accentBg, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={A.accentBg} /> : <Text style={mono({ fontSize: 12, fontWeight: '800', color: A.accentBg, letterSpacing: 1 })}>TEST CONNECTION</Text>}
        </Pressable>
      </Panel>
      {result ? (
        <Panel title={result.reachable ? 'SERVER REACHABLE' : 'NOT REACHABLE'} accentBorder={result.reachable ? A.green : A.red}>
          <View style={{ gap: 6 }}>
            <TileRow title="Host" right={result.host} />
            {result.reachable ? <TileRow title="ERP API version" right={result.version ?? '—'} /> : null}
            {result.reachable ? <TileRow title="Environment" right={result.environment ?? '—'} /> : null}
            {result.reachable ? <TileRow title="Response time" right={`${result.latencyMs ?? '—'} ms${result.wokeFromSleep ? ' · woke' : ''}`} /> : null}
            {result.reachable ? <TileRow title="Integration" right={result.mode === 'mobile' ? 'MOBILE EXT.' : 'DIRECT ERP'} rightColor={result.mode === 'mobile' ? A.green : A.blue} /> : null}
            {result.error ? <Text style={mono({ fontSize: 12, color: result.reachable ? A.amber : A.red })}>{result.error}</Text> : null}
          </View>
          {result.reachable ? (
            <Pressable onPress={save} style={{ marginTop: 14, minHeight: 50, backgroundColor: A.accentBg, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={mono({ fontSize: 13, fontWeight: '800', color: A.accentText, letterSpacing: 1 })}>USE THIS SERVER</Text>
            </Pressable>
          ) : null}
        </Panel>
      ) : null}
    </Board>
  );
}
