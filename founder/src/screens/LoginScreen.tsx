import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Board, LiveDot, Panel, mono } from '../tv/primitives';
import { useTheme } from '../tv/theme';
import { useData } from '../data/DataContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { T, A } = useTheme();
  const { login, useDemo, serverHost, error } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setErr('Enter your ERP username and password.');
    setBusy(true);
    setErr(null);
    try {
      await login(email.trim(), password);
      if (nav.canGoBack()) nav.popToTop();
    } catch (e) {
      setErr((e as Error).message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const input = { fontFamily: mono().fontFamily, fontSize: 15, color: T.text, backgroundColor: T.tile, borderWidth: 1, borderColor: T.panelBorder, borderRadius: 2, paddingHorizontal: 12, minHeight: 48 } as const;

  return (
    <Board scene="Sign in" right={<View />}>
      <Panel title="SUNSEA ERP — INSIGHTS">
        <Text style={mono({ fontSize: 13, color: T.textDim, lineHeight: 19 })}>Sign in with your ERP account to see live figures from {serverHost ?? 'the Sun Sea backend'}. Read-only: nothing is entered from this app.</Text>
        <View style={{ height: 14 }} />
        <Text style={mono({ fontSize: 10, fontWeight: '800', color: T.textMute, letterSpacing: 0.8, marginBottom: 6 })}>USERNAME OR EMAIL</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} placeholder="founder" placeholderTextColor={T.textMute} style={input} />
        <View style={{ height: 10 }} />
        <Text style={mono({ fontSize: 10, fontWeight: '800', color: T.textMute, letterSpacing: 0.8, marginBottom: 6 })}>PASSWORD</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={T.textMute} style={input} onSubmitEditing={submit} />
        {err || error ? <Text style={mono({ fontSize: 12, color: A.red, marginTop: 10 })}>{err ?? error}</Text> : null}
        <Pressable onPress={submit} disabled={busy} style={{ marginTop: 16, minHeight: 50, backgroundColor: A.accentBg, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={A.accentText} /> : <Text style={mono({ fontSize: 13, fontWeight: '800', color: A.accentText, letterSpacing: 1 })}>SIGN IN</Text>}
        </Pressable>
      </Panel>

      <Pressable onPress={() => nav.navigate('Server')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: 6, minHeight: 40 }}>
        <LiveDot color={serverHost ? A.green : A.amber} />
        <Text style={mono({ fontSize: 12, fontWeight: '700', color: A.accentBg, letterSpacing: 0.4 })}>{serverHost ? `SERVER · ${serverHost.toUpperCase()}` : 'CONNECT TO SERVER'}</Text>
      </Pressable>

      <Panel title="PROTOTYPE">
        <Text style={mono({ fontSize: 12, color: T.textDim, lineHeight: 18 })}>No account yet? Explore the same screens with a seeded demo dataset. Nothing is sent anywhere.</Text>
        <Pressable onPress={() => { void useDemo(); if (nav.canGoBack()) nav.popToTop(); }} style={{ marginTop: 12, minHeight: 46, borderWidth: 1, borderColor: T.panelBorder, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={mono({ fontSize: 12, fontWeight: '800', color: T.text, letterSpacing: 1 })}>EXPLORE DEMO DATA</Text>
        </Pressable>
      </Panel>
    </Board>
  );
}
