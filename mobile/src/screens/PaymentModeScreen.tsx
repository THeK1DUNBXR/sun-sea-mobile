import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Button, Card } from '../components/ui';
import { colors, spacing, type } from '../theme';
import { money } from '../utils/format';
import { PAYMENT_MODES, type PaymentMode } from '../api/types';
import type { ScreenProps } from '../navigation/types';
import type { IconName } from '../components/ui';

const ICONS: Record<PaymentMode, IconName> = { Cash: 'cash-outline', Cheque: 'document-text-outline', UPI: 'qr-code-outline', NEFT: 'business-outline' };
const HINTS: Record<PaymentMode, string> = {
  Cash: 'Capture a photo of the receipt / bill',
  Cheque: 'Scan the cheque — details are auto-filled',
  UPI: 'Enter the UPI transaction ID',
  NEFT: 'Enter the UTR / reference number',
};

export function PaymentModeScreen({ route, navigation }: ScreenProps<'PaymentMode'>) {
  const { draft } = route.params;
  const [mode, setMode] = useState<PaymentMode>('Cash');

  const next = () => {
    if (mode === 'Cash') navigation.navigate('CashPayment', { draft });
    else if (mode === 'Cheque') navigation.navigate('ChequePayment', { draft });
    else navigation.navigate('UpiPayment', { draft, mode });
  };

  return (
    <Screen title="Payment Details" back footer={<Button title="Continue" onPress={next} />}>
      <Text style={type.small}>Total Amount</Text>
      <Text style={type.money}>{money(draft.total)}</Text>
      {draft.allocations.length ? (
        <Text style={[type.tiny, { marginTop: 4 }]}>
          {draft.allocations.length} invoice{draft.allocations.length > 1 ? 's' : ''}
          {draft.onAccount > 0 ? ` + ${money(draft.onAccount)} on account` : ''}
        </Text>
      ) : null}

      <Text style={[type.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Select Payment Mode</Text>
      <Card style={{ padding: 0 }}>
        {PAYMENT_MODES.map((m, idx) => {
          const active = m === mode;
          return (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.row, idx < PAYMENT_MODES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={[styles.radio, active && { borderColor: colors.primary }]}>{active ? <View style={styles.radioDot} /> : null}</View>
              <Ionicons name={ICONS[m]} size={20} color={active ? colors.primary : colors.muted} style={{ marginHorizontal: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[type.h3, active && { color: colors.primary }]}>{m}</Text>
                <Text style={type.tiny}>{HINTS[m]}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
