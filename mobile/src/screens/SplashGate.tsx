import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors, type } from '../theme';

export function SplashGate() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
      <Text style={[type.h1, { color: '#fff' }]}>SUN SEA ERP</Text>
      <Text style={{ color: '#CBD5E1', marginTop: 4 }}>Field Collections</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
    </View>
  );
}
